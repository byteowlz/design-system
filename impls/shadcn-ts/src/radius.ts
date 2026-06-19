/**
 * R1 radius — concentric nesting, single dial. See spec/radius.md.
 *
 * The dial is ONE value (a CSS length, e.g. "0.5rem" or "0"). Increasing it
 * rounds the whole UI; `0` makes everything sharp (oqto's identity). Each
 * standard container computes its children's radius as max(0, radius - inset),
 * so nested boxes share arc centers.
 *
 * Emission: sets `--radius` (the dial) plus the categorical `--radius-sm/md/
 * lg/xl` derived from it (shadcn convention). Components that nest call
 * `childRadius()` or consume the categorical vars.
 *
 * @see ../../spec/radius.md
 */

/** A CSS length string, e.g. "0.5rem" or "0px". */
export type Radius = string;

/**
 * Compute a child's radius given the parent's dial value and the inset (padding
 * / border-box gap) between them. Returns a CSS expression using `max()` so it
 * clamps at 0 — guaranteeing `dial=0 -> everything sharp` with no special-casing.
 *
 *   childRadius("0.5rem", "4px") -> "max(0px, calc(0.5rem - 4px))"
 */
export function childRadius(parentRadius: Radius, inset: Radius): Radius {
	return `max(0px, calc(${parentRadius} - ${inset}))`;
}

/** Categorical tiers derived from the dial (shadcn convention). */
export interface RadiusScale {
	/** The dial value itself. */
	radius: Radius;
	sm: Radius;
	md: Radius;
	lg: Radius;
	xl: Radius;
}

/**
 * Build the categorical radius scale from a single dial value.
 * Tiers nest inward: xl (largest) down to sm (smallest), each `calc`-ing off
 * the dial so the concentric rule holds across the scale.
 */
export function radiusScale(dial: Radius): RadiusScale {
	return {
		radius: dial,
		sm: childRadius(dial, "4px"),
		md: childRadius(dial, "2px"),
		lg: dial,
		xl: childRadius(dial, "-2px"),
	};
}

/** The CSS variable names this module manages. */
export const RADIUS_VARS = ["--radius", "--radius-sm", "--radius-md", "--radius-lg", "--radius-xl"] as const;

/**
 * Resolve the radius scale to CSS variable assignments for a given dial.
 * Returns the vars to write; caller applies them to a root element.
 */
export function radiusVars(dial: Radius): Record<string, string> {
	const s = radiusScale(dial);
	return {
		"--radius": s.radius,
		"--radius-sm": s.sm,
		"--radius-md": s.md,
		"--radius-lg": s.lg,
		"--radius-xl": s.xl,
	};
}
