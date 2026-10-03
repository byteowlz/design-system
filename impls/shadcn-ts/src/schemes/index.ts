/**
 * House schemes shipped with the package.
 *
 * Ownership note: oqto-dark/oqto-light are oqto's identity and will move to
 * oqto at cutover; they ship here for now so the standalone workbench and
 * playground have something to render. oqto-chalk is an explicit alternative
 * light scheme (separate canvas / panel / raised surfaces through per-scheme
 * role binding); it is not the default light scheme. ember and nord-base16
 * demonstrate a full base24 scheme and a base16-derived scheme respectively. The 500+
 * community tinted schemes are NOT vendored — load via fromTintedYaml().
 */

import type { Scheme, ThemeMode } from "../types.js";
import emberJson from "./ember.json" with { type: "json" };
import nordBase16Json from "./nord-base16.json" with { type: "json" };
import oqtoChalkJson from "./oqto-chalk.json" with { type: "json" };
import oqtoDarkJson from "./oqto-dark.json" with { type: "json" };
import oqtoLightJson from "./oqto-light.json" with { type: "json" };

export const oqtoDark = oqtoDarkJson as Scheme;
export const oqtoLight = oqtoLightJson as Scheme;
/** Explicit alternative light scheme (Chalk direction); not the default. */
export const oqtoChalk = oqtoChalkJson as Scheme;
export const ember = emberJson as Scheme;
export const nordBase16 = nordBase16Json as Scheme;

/** All house schemes, keyed by id. */
export const builtInSchemes: Readonly<Record<string, Scheme>> = {
	[oqtoDark.id]: oqtoDark,
	[oqtoLight.id]: oqtoLight,
	[oqtoChalk.id]: oqtoChalk,
	[ember.id]: ember,
	[nordBase16.id]: nordBase16,
};

/** Ordered list for pickers. */
export const builtInSchemeList: ReadonlyArray<Scheme> = [
	oqtoDark,
	oqtoLight,
	oqtoChalk,
	ember,
	nordBase16,
];

/** Canonical default for a mode (oqto's, until oqto owns these). */
export function defaultSchemeForMode(mode: ThemeMode): Scheme {
	return mode === "dark" ? oqtoDark : oqtoLight;
}
