/**
 * House scheme check (spec/schema.json, spec/roles.md).
 *
 * Zero-dependency. For every house scheme in impls/shadcn-ts/src/schemes:
 *   - the file satisfies spec/schema.json (the keywords it uses, read from the schema
 *     itself so the two cannot drift);
 *   - its emitted token map (normalizeScheme -> mapSchemeToTokens) equals the pinned
 *     snapshot in spec/fixtures/schemes/<id>.tokens.json, byte for byte;
 *   - when spec/fixtures/schemes/<id>.targets.json exists (an authored scheme with
 *     design targets), every target role and vocabulary value is emitted exactly, and
 *     the listed WCAG contrast pairs hold (opaque sRGB luminance), and the surface
 *     layers stay separable (`separation`: a lighter layer against the canvas it
 *     sits on, as a WCAG ratio; a near-1:1 pair makes the layers invisible). A
 *     targets file must carry a layering gate: `separation` pairs, or for a scheme
 *     that deliberately uses one surface, a `dividers` block (with its reason) that
 *     gates the hairlines carrying the layering instead.
 *
 * Snapshots are the no-change guard for mapping work: a mapping change that alters an
 * existing house scheme's output fails here. Write a snapshot only for a NEW scheme
 * (`--write <id>`); never regenerate an existing one to make a check pass.
 *
 * Usage: bun scripts/check-schemes.ts             (check)
 *        bun scripts/check-schemes.ts --write ID  (pin a new scheme's snapshot)
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { normalizeScheme } from "../impls/shadcn-ts/src/derive-base16.ts";
import { mapSchemeToTokens } from "../impls/shadcn-ts/src/map-scheme-to-tokens.ts";
import type { Scheme } from "../impls/shadcn-ts/src/types.ts";

const root = resolve(import.meta.dir, "..");
const schemesDir = join(root, "impls/shadcn-ts/src/schemes");
const snapshotDir = join(root, "spec/fixtures/schemes");
const schema = JSON.parse(readFileSync(join(root, "spec/schema.json"), "utf8"));

/** Required slot keys per system, read from the schema's allOf if/then blocks. */
function requiredSlots(system: string): string[] {
	for (const branch of schema.allOf ?? []) {
		if (branch.if?.properties?.system?.const === system) return branch.then.properties.slots.required;
	}
	return [];
}

export function checkSchemeFile(s: Record<string, unknown>): string[] {
	const errs: string[] = [];
	const props = schema.properties;
	for (const k of schema.required) if (!(k in s)) errs.push(`missing ${k}`);
	for (const k of Object.keys(s)) if (!(k in props)) errs.push(`unknown property ${k}`);
	if (typeof s.id !== "string" || !new RegExp(props.id.pattern).test(s.id)) errs.push(`id: does not match ${props.id.pattern}`);
	if (!props.mode.enum.includes(s.mode)) errs.push(`mode: ${String(s.mode)} is not one of ${props.mode.enum.join(" | ")}`);
	if (!props.system.enum.includes(s.system)) errs.push(`system: ${String(s.system)} is not one of ${props.system.enum.join(" | ")}`);
	const slots = (s.slots ?? {}) as Record<string, unknown>;
	const base24 = requiredSlots("base24");
	for (const k of requiredSlots(String(s.system))) if (typeof slots[k] !== "string") errs.push(`slots: missing ${k}`);
	for (const k of Object.keys(slots)) if (!base24.includes(k)) errs.push(`slots: unknown slot ${k}`);
	if (props.roles && s.roles !== undefined) {
		const roles = s.roles as Record<string, unknown>;
		const roleNames: string[] = props.roles.propertyNames.enum;
		const slotNames: string[] = props.roles.additionalProperties.enum;
		for (const [role, slot] of Object.entries(roles)) {
			if (!roleNames.includes(role)) errs.push(`roles: ${role} is not a closed role`);
			if (!slotNames.includes(String(slot))) errs.push(`roles.${role}: ${String(slot)} is not a slot`);
		}
	}
	return errs;
}

function houseSchemes(): Scheme[] {
	return readdirSync(schemesDir)
		.filter((f) => f.endsWith(".json"))
		.sort()
		.map((f) => JSON.parse(readFileSync(join(schemesDir, f), "utf8")) as Scheme);
}

export function tokensJson(scheme: Scheme): string {
	return `${JSON.stringify(mapSchemeToTokens(normalizeScheme(scheme)), null, "\t")}\n`;
}

/** WCAG relative luminance of an opaque #rrggbb colour. */
function luminance(hex: string): number {
	const c = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255);
	const [r, g, b] = c.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)) as [number, number, number];
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
	const [x, y] = [luminance(a), luminance(b)];
	return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

type Targets = {
	roles: Record<string, string>;
	vocabulary: Record<string, string>;
	contrast: {
		surfaces: string[];
		text: { roles: string[]; minimum: number };
		boundary: { roles: string[]; minimum: number };
		pairs: { ink: string; on: string; minimum: number }[];
		/** Inks checked against a named subset of surfaces (e.g. status hues). */
		groups?: { inks: string[]; on: string[]; minimum: number }[];
	};
	separation?: { layer: string; on: string; minimum: number }[];
	/**
	 * Per-scheme exemption from `separation` for a deliberately single-surface
	 * scheme: its layering is drawn by dividers, so the divider inks are gated
	 * against every surface they separate. The reason is required.
	 */
	dividers?: { reason: string; inks: string[]; on: string[]; minimum: number };
};

/** Every [ink, surface, minimum] contrast pair a targets file names. */
function contrastPairs(c: Targets["contrast"]): [string, string, number][] {
	const groups = [
		{ inks: c.text.roles, on: c.surfaces, minimum: c.text.minimum },
		{ inks: c.boundary.roles, on: c.surfaces, minimum: c.boundary.minimum },
		...c.pairs.map((p) => ({ inks: [p.ink], on: [p.on], minimum: p.minimum })),
		...(c.groups ?? []),
	];
	return groups.flatMap((g) => g.inks.flatMap((ink) => g.on.map((on): [string, string, number] => [ink, on, g.minimum])));
}

/** Exact target emission and contrast for an authored scheme; returns [ok, message] rows. */
export function checkTargets(tokens: Record<string, string>, t: Targets): [boolean, string][] {
	const rows: [boolean, string][] = [];
	const color = (name: string) => (tokens[name.startsWith("--") ? name : `--${name}`] ?? "").toLowerCase();
	for (const [role, want] of Object.entries({ ...t.roles, ...t.vocabulary })) {
		const got = color(role);
		rows.push([got === want.toLowerCase(), `${role} = ${want} (emitted ${got || "nothing"})`]);
	}
	for (const [ink, on, minimum] of contrastPairs(t.contrast)) {
		const ratio = contrast(color(ink), color(on));
		rows.push([ratio >= minimum, `${ink} on ${on}: ${ratio.toFixed(2)}:1 >= ${minimum}:1`]);
	}
	for (const s of t.separation ?? []) {
		const ratio = contrast(color(s.layer), color(s.on));
		rows.push([ratio >= s.minimum, `separation ${s.layer} / ${s.on}: ${ratio.toFixed(3)}:1 >= ${s.minimum}:1`]);
	}
	rows.push(...checkDividers(t, color));
	return rows;
}

/** The layering gate: `separation` pairs, or a reasoned `dividers` exemption. */
function checkDividers(t: Targets, color: (name: string) => string): [boolean, string][] {
	const d = t.dividers;
	if (!d) return t.separation?.length ? [] : [[false, "layering: neither separation pairs nor a dividers exemption"]];
	const rows: [boolean, string][] = [[d.reason.trim().length > 0, "layering by dividers: exemption states its reason"]];
	for (const ink of d.inks) {
		for (const on of d.on) {
			const ratio = contrast(color(ink), color(on));
			rows.push([ratio >= d.minimum, `divider ${ink} on ${on}: ${ratio.toFixed(3)}:1 >= ${d.minimum}:1`]);
		}
	}
	return rows;
}

function main(): number {
	const args = process.argv.slice(2);
	if (args[0] === "--write") {
		const id = args[1];
		const scheme = houseSchemes().find((s) => s.id === id);
		if (!scheme) {
			console.error(`no house scheme with id ${id}`);
			return 1;
		}
		const path = join(snapshotDir, `${id}.tokens.json`);
		if (existsSync(path)) {
			console.error(`${path} exists; existing snapshots are never regenerated`);
			return 1;
		}
		writeFileSync(path, tokensJson(scheme));
		console.log(`pinned ${path}`);
		return 0;
	}
	let failed = 0;
	const report = (ok: boolean, msg: string) => {
		if (!ok) failed++;
		console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`);
	};
	for (const scheme of houseSchemes()) {
		const errs = checkSchemeFile(scheme as unknown as Record<string, unknown>);
		report(errs.length === 0, `${scheme.id} satisfies spec/schema.json${errs.length ? `\n      ${errs.join("\n      ")}` : ""}`);
		const path = join(snapshotDir, `${scheme.id}.tokens.json`);
		if (!existsSync(path)) {
			report(false, `${scheme.id} has no pinned snapshot (bun scripts/check-schemes.ts --write ${scheme.id})`);
			continue;
		}
		const same = readFileSync(path, "utf8") === tokensJson(scheme);
		report(same, `${scheme.id} token output equals spec/fixtures/schemes/${scheme.id}.tokens.json`);
		const targetsPath = join(snapshotDir, `${scheme.id}.targets.json`);
		if (existsSync(targetsPath)) {
			const targets: Targets = JSON.parse(readFileSync(targetsPath, "utf8"));
			const tokens = mapSchemeToTokens(normalizeScheme(scheme));
			for (const [ok, msg] of checkTargets(tokens, targets)) report(ok, `${scheme.id} target ${msg}`);
		}
	}
	console.log(`\n${failed ? `${failed} check(s) failed` : "all scheme checks passed"}`);
	return failed ? 1 : 0;
}

if (import.meta.main) process.exit(main());
