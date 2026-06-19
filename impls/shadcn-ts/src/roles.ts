/**
 * The closed ABSTRACT ROLE LAYER — the portable surface.
 *
 * A role is a semantic intent bound to a slot. This set is CLOSED (see
 * spec/roles.md): tools consume the subset they need and cannot add portable
 * roles. Per-tool / per-framework vocabulary lives in the concrete surface
 * (shadcn pairs) or in tool-local extensions, both non-portable.
 *
 * Multiple roles may bind the same slot (e.g. `primary` and `success` both
 * -> base0B). Hue and role are separate indirections: swapping a slot reskins
 * every role bound to it; re-pointing one role decouples it.
 *
 * @see ../../spec/roles.md
 */

import type { Base24SlotKey } from "./types.js";

/** The 15 abstract roles. Closed set — do not extend in consumer code. */
export type AbstractRole =
	| "background"
	| "foreground"
	| "primary"
	| "secondary"
	| "muted"
	| "accent"
	| "success"
	| "warning"
	| "danger"
	| "info"
	| "border"
	| "ring"
	| "card"
	| "popover"
	| "input";

/**
 * Default role -> slot binding. A scheme's slots fill the palette; roles pick
 * from it. Tools may override individual bindings (re-pointing `success` to a
 * different slot) without touching the slot values.
 */
export const ROLE_FOR_SLOT: Readonly<Record<AbstractRole, Base24SlotKey>> = {
	background: "base00",
	foreground: "base05",
	primary: "base0B",
	secondary: "base02",
	muted: "base02",
	accent: "base02",
	success: "base0B",
	warning: "base0A",
	danger: "base08",
	info: "base0D",
	border: "base01",
	ring: "base0B",
	card: "base01",
	popover: "base01",
	input: "base01",
};

/** The full closed set, for validation / iteration. */
export const ABSTRACT_ROLES = Object.keys(ROLE_FOR_SLOT) as AbstractRole[];
