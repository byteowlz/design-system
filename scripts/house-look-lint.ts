/**
 * House-Look lint: the byteowlz house styles' taste, kept OUT of the schema.
 *
 * The Look schema expresses everything a surface renders today (compound border +
 * shadow, ring focus, native focus). House Looks additionally follow two taste rules:
 *   - elevation once: a control shows a visible border OR a visible shadow, never both
 *     (a 1px border under a soft shadow reads as a doubled edge);
 *   - no ring focus.
 * The lint only applies to the Looks it is given explicitly; the schema never knows
 * which Looks are "house".
 *
 * Usage: bun scripts/house-look-lint.ts <house.look.json> ...
 */
import { readFileSync } from "node:fs";

type Border = { width: 0 } | { width: 1; color: { role: string; alpha: number } };
type Layer = { alpha: number; color: string };
type Shadow = "none" | { ramp: string } | { dark: Layer[]; light: Layer[] };
type Elevation = string | { border: Border; shadow: Shadow };

/** Preset expansion (spec/look.md). */
export const PRESETS: Record<string, { border: Border; shadow: Shadow }> = {
	flat: { border: { width: 0 }, shadow: "none" },
	hairline: { border: { width: 1, color: { role: "foreground", alpha: 10 } }, shadow: "none" },
	"raised-sm": { border: { width: 0 }, shadow: { ramp: "sm" } },
	"raised-md": { border: { width: 0 }, shadow: { ramp: "md" } },
};

export function expand(e: Elevation): { border: Border; shadow: Shadow } {
	return typeof e === "string" ? PRESETS[e] : e;
}

const visibleBorder = (b: Border) => b.width === 1 && b.color.alpha > 0;
const visibleShadow = (s: Shadow) =>
	s !== "none" &&
	("ramp" in s || [...s.dark, ...s.light].some((l) => l.alpha > 0 && l.color !== "transparent"));

/** A variant or focus may be split per surface (`{ web, desktop }`); yields each part with its path. */
export function surfaces(v: any, path: string): [string, any][] {
	return v && typeof v === "object" && "web" in v && "desktop" in v
		? [[`${path}.web`, v.web], [`${path}.desktop`, v.desktop]]
		: [[path, v]];
}

/** Every concrete variant of a control, with its schema path. */
export function variants(control: any): [string, any][] {
	return Object.entries<any>(control.variants).flatMap(([name, v]) => surfaces(v, `recipes.control.variants.${name}`));
}

/** Returns lint errors for one Look (empty = passes the house rules). */
export function lintHouseLook(look: any): string[] {
	const errs: string[] = [];
	const control = look.recipes.control;
	for (const [path, variant] of variants(control)) {
		for (const state of ["elevation", "hover"] as const) {
			if (!variant[state]) continue;
			const { border, shadow } = expand(variant[state]);
			if (visibleBorder(border) && visibleShadow(shadow))
				errs.push(`${path}.${state}: visible border and shadow together (house rule: elevation once)`);
		}
		if (variant.focus?.kind === "ring") errs.push(`${path}.focus: ring focus (house rule: no ring focus)`);
	}
	for (const [path, focus] of surfaces(control.focus, "recipes.control.focus"))
		if (focus.kind === "ring") errs.push(`${path}: ring focus (house rule: no ring focus)`);
	return errs;
}

if (import.meta.main) {
	const files = process.argv.slice(2);
	if (!files.length) {
		console.error("usage: bun scripts/house-look-lint.ts <house.look.json> ...");
		process.exit(2);
	}
	let failed = 0;
	for (const f of files) {
		const errs = lintHouseLook(JSON.parse(readFileSync(f, "utf8")));
		if (errs.length) failed++;
		console.log(`${errs.length ? "FAIL" : "PASS"}  ${f}${errs.length ? `\n      ${errs.join("\n      ")}` : ""}`);
	}
	console.log(failed ? `\n${failed} house Look(s) break the house rules` : "\nall house Looks pass");
	process.exit(failed ? 1 : 0);
}
