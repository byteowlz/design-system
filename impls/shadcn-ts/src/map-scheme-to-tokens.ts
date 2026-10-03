/**
 * Two-tier slot -> token mapping.
 *
 * Tier 1 — abstract roles (portable): the 15 closed roles, each bound to a
 * slot, emitted as bare CSS vars (`--primary`, `--background`, ...).
 * Tier 2 — shadcn concrete surface (framework vocabulary, non-portable): the
 * `*-foreground` pairs that encode "text readable on this surface" plus the
 * status tokens shadcn lacks, bound to the same slots.
 *
 * A scheme's `overrides` win over both tiers (for per-tool vocabulary like
 * oqto's terminal/code/chart tokens).
 *
 * @see ../../spec/roles.md
 */

import { type AbstractRole, ROLE_FOR_SLOT, roleBindings } from "./roles.js";
import type { Base24SlotKey, NormalizedScheme, SemanticTokenMap } from "./types.js";

/** Where an emitted var takes its colour: a closed role, or a fixed slot. */
type Source = Base24SlotKey | { role: AbstractRole };
const role = (r: AbstractRole): Source => ({ role: r });

/**
 * shadcn concrete surface: paired names. Each emitted shadcn var either mirrors
 * a closed role (and follows that role when a scheme re-binds it, see
 * spec/roles.md "Per-scheme role binding") or reads a fixed slot. The paired
 * `-foreground` text colours read slots (tunable via overrides) unless they
 * are the default text on a surface, which is the `foreground` role.
 *
 * With the default bindings every role source resolves to the slot this table
 * held before role binding existed, so schemes without `roles` emit exactly
 * what they always did (pinned by spec/fixtures/schemes/).
 */
const SHADCN_SURFACE: Record<string, Source> = {
	// Core surfaces (mirror abstract roles; shadcn consumes these names).
	"--background": role("background"),
	"--foreground": role("foreground"),
	"--card": role("surface"),
	"--card-foreground": role("foreground"),
	"--popover": role("surface"),
	"--popover-foreground": role("foreground"),
	"--secondary": role("secondary"),
	"--secondary-foreground": "base06",
	"--muted": role("muted"),
	"--muted-foreground": role("muted-foreground"),
	"--accent": role("accent"),
	"--accent-foreground": "base06",
	"--destructive": role("danger"),
	"--destructive-foreground": "base06",
	"--border": role("border"),
	"--input": role("input"),
	"--ring": role("ring"),
	// Primary + statuses (shadcn lacks success/warning/info; we add them).
	"--primary": role("primary"),
	"--primary-foreground": "base00",
	"--success": role("success"),
	"--success-foreground": "base00",
	"--warning": role("warning"),
	"--warning-foreground": "base00",
	"--info": role("info"),
	"--info-foreground": "base00",
	// Sidebar sits on the recessed surface.
	"--sidebar": role("surface-sunken"),
	"--sidebar-foreground": "base06",
	"--sidebar-primary": role("primary"),
	"--sidebar-primary-foreground": "base11",
	"--sidebar-accent": role("background"),
	"--sidebar-accent-foreground": "base06",
	"--sidebar-border": role("border"),
	"--sidebar-ring": role("ring"),
	// Charts: rainbow default so arbitrary community schemes look coherent;
	// a tool's own scheme pins these via overrides (oqto's are monochrome).
	"--chart-1": "base0D",
	"--chart-2": "base0B",
	"--chart-3": "base0E",
	"--chart-4": "base09",
	"--chart-5": "base0C",
};

/** Map abstract roles to bare (non-shadcn) CSS var names. */
function roleVarName(role: keyof typeof ROLE_FOR_SLOT): string {
	// Roles map 1:1 onto shadcn's core names; this keeps the portable layer
	// and the shadcn surface aligned for the shared core set.
	return `--${role}`;
}

/** The 24 raw slot CSS var names (--base00..--base17), for debugging/showcases/direct slot access. */
export const SLOT_VARS = [
	"base00","base01","base02","base03","base04","base05","base06","base07",
	"base08","base09","base0A","base0B","base0C","base0D","base0E","base0F",
	"base10","base11","base12","base13","base14","base15","base16","base17",
] as const as readonly string[];

/**
 * Resolve a normalized scheme into the full set of emitted CSS variables.
 * Emits, in order: raw slots (--baseNN), abstract roles, shadcn surface; then
 * per-scheme overrides win last.
 */
export function mapSchemeToTokens(scheme: NormalizedScheme): SemanticTokenMap {
	const tokens: SemanticTokenMap = {};

	// Raw slots: always emit so showcases/debugging/components can read --baseNN directly.
	for (const slot of SLOT_VARS) {
		const v = scheme.slots[slot as Base24SlotKey];
		if (v) tokens[`--${slot}`] = v;
	}

	// Tier 1: abstract roles (portable), through the scheme's role binding.
	const bindings = roleBindings(scheme);
	for (const [role, slot] of Object.entries(bindings)) {
		tokens[roleVarName(role as AbstractRole)] = scheme.slots[slot];
	}

	// Tier 2: shadcn concrete surface (non-portable framework vocabulary).
	for (const [cssVar, source] of Object.entries(SHADCN_SURFACE)) {
		const slot = typeof source === "string" ? source : bindings[source.role];
		tokens[cssVar] = scheme.slots[slot];
	}

	// Per-scheme overrides win.
	if (scheme.overrides) {
		for (const [cssVar, value] of Object.entries(scheme.overrides)) {
			if (value !== undefined) tokens[cssVar] = value;
		}
	}

	return tokens;
}

/** Every CSS variable this engine controls (slots + semantic), for clearing/inspection. */
export const MANAGED_SEMANTIC_VARS: readonly string[] = [
	...SLOT_VARS.map((s) => `--${s}`),
	...new Set([
		...Object.keys(SHADCN_SURFACE),
		...Object.values(ROLE_FOR_SLOT).map((s) => `--${s}`),
	]),
];
