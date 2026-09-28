/**
 * Look schema check (spec/look.schema.json, spec/look.md, ADR-0004).
 *
 * Zero-dependency: a small validator for exactly the JSON Schema keywords the Look
 * schema uses, plus the semantic rules JSON Schema cannot express:
 *   - an elevation referencing the ramp requires identity.shadows
 *   - the control radius tier (md = dial * 0.75) must stay below half the control
 *     height on every surface, so compact controls never become pills by accident
 *
 * Every fixture in spec/fixtures/look/valid must pass; every fixture in
 * spec/fixtures/look/invalid must fail, at the path recorded in invalid/EXPECTED.json.
 * Every fixture in spec/fixtures/look/lint-fail must be ACCEPTED by the schema (the
 * contract expresses it) and REJECTED by the house-Look lint (house taste).
 *
 * Usage: bun scripts/check-look.ts            (fixtures)
 *        bun scripts/check-look.ts a.json ... (validate given Look files)
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { expand, lintHouseLook, variants } from "./house-look-lint.ts";

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
type Schema = { [k: string]: any };

const root = resolve(import.meta.dir, "..");
const schema: Schema = JSON.parse(readFileSync(join(root, "spec/look.schema.json"), "utf8"));

/** Size tiers, following the toolkit size names (md = the toolkit default). */
export const TIERS = ["xs", "sm", "md", "lg"] as const;
type Tier = (typeof TIERS)[number];
type Px = { height: number; padding_x: number; gap: number };
const px = (height: number, padding_x: number, gap: number): Px => ({ height, padding_x, gap });

/** Named density tables (spec/look.md): every tier on both surfaces. Provisional; they are authoring presets, not baselines. */
export const DENSITY: Record<string, Record<"web" | "desktop", Record<Tier, Px>>> = {
	compact: {
		web: { xs: px(20, 6, 4), sm: px(24, 8, 4), md: px(28, 10, 6), lg: px(32, 12, 6) },
		desktop: { xs: px(18, 4, 4), sm: px(20, 6, 4), md: px(24, 8, 4), lg: px(28, 10, 6) },
	},
	regular: {
		web: { xs: px(26, 8, 4), sm: px(30, 12, 6), md: px(34, 14, 7), lg: px(38, 16, 8) },
		desktop: { xs: px(20, 6, 4), sm: px(24, 8, 4), md: px(28, 12, 6), lg: px(32, 14, 6) },
	},
	comfortable: {
		web: { xs: px(32, 12, 6), sm: px(36, 14, 7), md: px(40, 18, 8), lg: px(44, 20, 8) },
		desktop: { xs: px(24, 8, 4), sm: px(28, 10, 6), md: px(32, 14, 6), lg: px(36, 16, 8) },
	},
};

function typeOf(v: Json): string {
	if (v === null) return "null";
	if (Array.isArray(v)) return "array";
	if (typeof v === "number") return Number.isInteger(v) ? "integer" : "number";
	return typeof v;
}

function resolveRef(ref: string): Schema {
	if (!ref.startsWith("#/")) throw new Error(`unsupported $ref ${ref}`);
	return ref.slice(2).split("/").reduce((s: any, k) => s[k], schema);
}

/** Returns a list of "path: message" errors (empty = valid). */
function validate(v: Json, s: Schema, path: string): string[] {
	if (s.$ref) return validate(v, resolveRef(s.$ref), path);
	const errs: string[] = [];
	const at = path || "(root)";
	if (s.allOf) for (const sub of s.allOf) errs.push(...validate(v, sub, path));
	if (s.oneOf) {
		const passing = s.oneOf.filter((sub: Schema) => validate(v, sub, path).length === 0).length;
		if (passing !== 1) errs.push(`${at}: must match exactly one allowed form (matched ${passing})`);
	}
	if ("const" in s && v !== s.const) errs.push(`${at}: must be ${JSON.stringify(s.const)}`);
	if (s.enum && !s.enum.includes(v)) errs.push(`${at}: ${JSON.stringify(v)} is not one of ${s.enum.join(" | ")}`);
	if (s.type) {
		const t = typeOf(v);
		const ok = s.type === t || (s.type === "number" && t === "integer");
		if (!ok) return [...errs, `${at}: expected ${s.type}, got ${t}`];
	}
	if (typeof v === "number") {
		if (s.minimum !== undefined && v < s.minimum) errs.push(`${at}: ${v} < minimum ${s.minimum}`);
		if (s.maximum !== undefined && v > s.maximum) errs.push(`${at}: ${v} > maximum ${s.maximum}`);
		if (s.multipleOf !== undefined && !Number.isInteger(v / s.multipleOf))
			errs.push(`${at}: ${v} is not a multiple of ${s.multipleOf} (integers or exact binary fractions only)`);
	}
	if (typeof v === "string") {
		if (s.minLength !== undefined && v.length < s.minLength) errs.push(`${at}: shorter than ${s.minLength}`);
		if (s.pattern && !new RegExp(s.pattern).test(v)) errs.push(`${at}: does not match ${s.pattern}`);
	}
	if (Array.isArray(v)) {
		if (s.minItems !== undefined && v.length < s.minItems) errs.push(`${at}: fewer than ${s.minItems} items`);
		if (s.maxItems !== undefined && v.length > s.maxItems) errs.push(`${at}: more than ${s.maxItems} items`);
		if (s.items) v.forEach((item, i) => errs.push(...validate(item, s.items, `${path}[${i}]`)));
	}
	if (typeOf(v) === "object") {
		const o = v as { [k: string]: Json };
		for (const k of s.required ?? []) if (!(k in o)) errs.push(`${at}: missing ${k}`);
		for (const [k, val] of Object.entries(o)) {
			const sub = s.properties?.[k];
			const p = path ? `${path}.${k}` : k;
			if (sub) errs.push(...validate(val, sub, p));
			else if (s.additionalProperties === false) errs.push(`${at}: unknown property ${k}`);
		}
	}
	return errs;
}

/** Rules JSON Schema cannot express. */
function semantic(look: any): string[] {
	const errs: string[] = [];
	const control = look.recipes.control;
	const usesRamp = variants(control).some(([, v]) =>
		[v.elevation, v.hover].some((e) => e && (expand(e).shadow as any)?.ramp));
	if (usesRamp && !look.identity.shadows) errs.push("identity.shadows: required when an elevation references the ramp");
	const md = look.identity.radius * 0.75;
	// Every tier a surface defines must stay below the pill threshold; the smallest one decides.
	const tiers = typeof control.density === "string" ? DENSITY[control.density] : control.density;
	for (const surface of ["web", "desktop"] as const)
		for (const [tier, d] of Object.entries<Px>(tiers[surface]))
			if (md * 2 >= d.height) errs.push(`identity.radius: control radius ${md}px on a ${d.height}px ${surface} ${tier} control reads as a pill (needs radius-md * 2 < height)`);
	return errs;
}

export function checkLook(look: Json): string[] {
	const errs = validate(look, schema, "");
	return errs.length ? errs : semantic(look);
}

function main(): number {
	const files = process.argv.slice(2);
	let failed = 0;
	const report = (ok: boolean, msg: string) => {
		if (!ok) failed++;
		console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`);
	};
	if (files.length) {
		for (const f of files) {
			const errs = checkLook(JSON.parse(readFileSync(f, "utf8")));
			report(errs.length === 0, `${f}${errs.length ? `\n      ${errs.join("\n      ")}` : ""}`);
		}
		return failed ? 1 : 0;
	}
	const dir = join(root, "spec/fixtures/look");
	for (const f of readdirSync(join(dir, "valid")).filter((n) => n.endsWith(".json")).sort()) {
		const errs = checkLook(JSON.parse(readFileSync(join(dir, "valid", f), "utf8")));
		report(errs.length === 0, `valid/${f} is accepted${errs.length ? `\n      ${errs.join("\n      ")}` : ""}`);
	}
	const expected: Record<string, string> = JSON.parse(readFileSync(join(dir, "invalid/EXPECTED.json"), "utf8"));
	const invalid = readdirSync(join(dir, "invalid")).filter((n) => n.endsWith(".look.json")).sort();
	for (const f of invalid) {
		const errs = checkLook(JSON.parse(readFileSync(join(dir, "invalid", f), "utf8")));
		const want = expected[f];
		const hit = errs.find((e) => want && e.includes(want));
		report(!!want && !!hit, `invalid/${f} is rejected${hit ? ` — ${hit}` : want ? ` (no error mentioning "${want}"; got: ${errs.join("; ") || "none"})` : " (missing from EXPECTED.json)"}`);
	}
	for (const f of Object.keys(expected)) if (!invalid.includes(f)) report(false, `EXPECTED.json lists missing fixture ${f}`);
	for (const f of readdirSync(join(dir, "lint-fail")).filter((n) => n.endsWith(".look.json")).sort()) {
		const look = JSON.parse(readFileSync(join(dir, "lint-fail", f), "utf8"));
		const errs = checkLook(look);
		report(errs.length === 0, `lint-fail/${f} is accepted by the schema${errs.length ? `\n      ${errs.join("\n      ")}` : ""}`);
		const lint = lintHouseLook(look);
		report(lint.length > 0, `lint-fail/${f} is rejected by the house lint${lint.length ? ` — ${lint[0]}` : " (lint passed it)"}`);
	}
	console.log(`\n${failed ? `${failed} check(s) failed` : "all Look checks passed"}`);
	return failed ? 1 : 0;
}

if (import.meta.main) process.exit(main());
