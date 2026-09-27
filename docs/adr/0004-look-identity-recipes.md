# A Look is a versioned layer of Identity and semantic recipes above schemes

A **Look** pins a dark/light scheme pair and adds Identity (fonts, radius dial, an elevation ramp) and **semantic component recipes**: closed enums and small integers that describe structure (elevation, density, focus). It lets a curated look change *structure* on every surface, not only colour, without touching the scheme contract. The first and only recipe in v1 is `control` (buttons).

## Context

Schemes are colour-only: 24 closed slots (ADR-0002) bound to 16 closed roles. Structure has lived outside the standard:

- Per-tool CSS hard-codes borders, heights and padding.
- The native Identity carries only fonts, sizes, the radius dial and a single shadow on/off flag.
- `spec/effects.md` already allows a new *shared mechanism* "symmetric with radius", as long as it adds no portable colour roles.

Curated looks now need to differ in structure on both the web and the native surface:

- elevation: flat, bordered or raised;
- density;
- the focus treatment.

The same values must render identically on both surfaces, and today's look must stay unchanged.

Two failure modes shaped the design:

- A border drawn under a wide soft shadow (the "ghost card") must be impossible to express.
- CSS strings cannot be consumed by a native renderer. Numbers computed in several languages drift unless they are exact.

## Decision

- **Layering.** The scheme contract is unchanged; no slots and no roles are added. A Look is `{ id, name, version, schemes: { dark, light }, identity, recipes }`. It pins exactly one dark and one light scheme. In v1, colour-only schemes combine only with the default Look, which keeps the test matrix small.
- **Recipes are closed enums and small integers, never raw CSS.** Each surface maps them to its own styles: CSS on the web, typed values natively.
- **Elevation has exactly one mechanism per element:** `flat | hairline | raised(sm|md)`.
  - Border width is derived from the kind (hairline = 1, otherwise 0), so a border plus a shadow on one element cannot be represented.
  - Hover is derived, not a free value: raised lifts one ramp step; flat and hairline tint.
  - The hairline colour is a role plus an integer alpha. The plain border role binds the same slot as the surface role, so it would be invisible on cards.
- **Shadows are structured layers** `{ x, y, blur, spread, alpha, color: role, inset? }` in a per-mode ramp `sm | md | lg`. Native surfaces build their shadows from the same data.
- **Density** is a named per-surface table (`compact | regular | comfortable`: integer height, horizontal padding, gap), or pinned px per surface when no table fits.
- **Focus** is `ring | outline | tint | indicator`, with width and offset where meaningful.
  - There is no `none`; keyboard focus must stay visible.
  - Every value must give at least a 3:1 focused-versus-unfocused difference against each adjacent surface, in both modes.
  - `ring` stays expressible, but the house Looks do not use it.
- **Numbers are integers or exact binary fractions** (quarter px). This avoids parity drift between languages and float widths.
- **Out of v1:**
  - Web-only effects such as backdrop blur and glass are not part of the cross-surface contract.
  - Indicators (active-tab underline, thinking bar) become a later, radius-aware recipe of their own.
- **One recipe at a time.** `control` must be implemented on both surfaces before a second recipe starts.
- **Fail closed.** An invalid or unsupported Look value, including a font a surface cannot load, falls back to the default Look.

The contract lives here: `spec/look.md`, `spec/look.schema.json`, and fixtures checked by `bun run check:look`. Authoring tools emit Look files and propose changes to this repository. They never keep a divergent copy.

## Why recipes and not more roles or tokens

Roles describe *colour intent* and are portable across ecosystems; structure is not colour. Adding `--shadow-*` or density tokens to the role layer would break ADR-0002's closure and the portability it buys. A recipe is the structural counterpart of the radius dial: a shared mechanism with per-Look values.

## Consequences

- `spec/effects.md` is amended: effects stay Identity (per Look). The *mechanism* for elevation, density and focus is now shared and specified in `spec/look.md`.
- The default Look fixture is pinned from recorded web and native baselines (computed styles and resolved values), not from the specification's tables. Its numbers must reproduce today's look exactly.
- Implementations gain a pure mapping, recipe to styles, with tests asserting that the default Look yields exactly today's values. The difference proof asserts structural deltas for curated Looks on both surfaces, not colour alone.
- New recipes, new enum values or new Look fields require a spec change and a schema version bump. They are never per-surface extensions.
