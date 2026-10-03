/**
 * House scheme check (spec/schema.json, spec/roles.md).
 *
 * Zero-dependency. For every house scheme in impls/shadcn-ts/src/schemes:
 *   - the file satisfies spec/schema.json (the keywords it uses, read from the schema
 *     itself so the two cannot drift);
 *   - its emitted token map (normalizeScheme -> mapSchemeToTokens) equals the pinned
 *     snapshot in spec/fixtures/schemes/<id>.tokens.json, byte for byte.
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
	}
	console.log(`\n${failed ? `${failed} check(s) failed` : "all scheme checks passed"}`);
	return failed ? 1 : 0;
}

if (import.meta.main) process.exit(main());
