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

Three constraints shaped the design:

- **Everything a surface renders today must be expressible and tweakable.** The recorded web baseline for today's look contains:
  - a button that combines a 1 px border with a visible shadow;
  - a ring focus treatment;
  - a browser-native focus outline.

  A contract that could not express them would force a visual change just to adopt it.
- **House taste is not the contract.** The house styles avoid ring focus and a border under a shadow. That is a preference for those Looks, not a property of every Look.
- **Exactness.** CSS strings cannot be consumed by a native renderer, and numbers computed in several languages drift unless they are exact.

## Decision

- **Layering.** The scheme contract is unchanged; no slots and no roles are added. A Look is `{ id, name, version, schemes: { dark, light }, identity, recipes }`. It pins exactly one dark and one light scheme. In v1, colour-only schemes combine only with the default Look, which keeps the test matrix small.
- **Recipes are closed enums and small integers, never raw CSS.** Each surface maps them to its own styles: CSS on the web, typed values natively.
- **Elevation is an independent border plus a shadow.** Either part can be used alone, and compound values (a border AND a shadow) are valid.
  - **Border:** width 0 or 1. A 1 px border carries a colour rule `{ role, alpha }`; alpha 0 is a transparent, layout-only border. The plain border role binds the same slot as the surface role, so a hairline usually names another role with an alpha.
  - **Shadow:** `none`, a step of the Look's ramp, or explicit per-mode layers, for pinning an existing surface verbatim.
  - **Presets** cover the common cases: `flat`, `hairline`, `raised-sm` and `raised-md`. They are shorthand with a fixed expansion.
  - **Hover** is derived by default (a ramp shadow lifts one step, otherwise the surface tints). It can be pinned explicitly.
- **Shadows are structured layers** `{ x, y, blur, spread, alpha, color, inset? }` in a per-mode ramp `sm | md | lg`. `color` is a role or an absolute neutral (`black | white | transparent`); the neutrals exist so existing shadows can be pinned verbatim, and they are not portable roles. Native surfaces build their shadows from the same data.
- **Density** is defined per **size tier**. The tiers `xs | sm | md | lg` follow the toolkit size names, and `md` is the toolkit default. Call sites keep choosing a tier; the Look decides what each tier measures. Density is either a named table (`compact | regular | comfortable`, integer height, horizontal padding and gap for every tier on both surfaces) or pinned px per surface and tier. Both Oqto surfaces use several sizes today, so a single height per surface cannot reproduce them.
- **Focus** is `ring | outline | tint | indicator | native`, with width, offset and alpha where meaningful. A ring may also recolour the control's border; `native` pins the platform's default indicator.
  - There is no `none`; keyboard focus must stay visible.
  - Every value must give at least a 3:1 focused-versus-unfocused difference against each adjacent surface, in both modes.
- **House taste is a lint, not the schema.** A separate house-Look lint (`bun run lint:house-look`) takes an explicit list of house Looks and enforces:
  - elevation once: no visible border together with a visible shadow;
  - no ring focus.

  The schema never knows which Looks are "house". There is no compatibility mode and no legacy flag: the default Look is an ordinary Look whose values happen to be compound. Changing its appearance is a separate, explicitly approved visual change.
- **Numbers are integers or exact binary fractions** (quarter px). This avoids parity drift between languages and float widths.
- **Out of v1:**
  - Web-only effects such as backdrop blur and glass are not part of the cross-surface contract.
  - Indicators (active-tab underline, thinking bar) become a later, radius-aware recipe of their own.
- **One recipe at a time.** `control` must be implemented on both surfaces before a second recipe starts.
- **Fail closed.** An invalid or unsupported Look value, including a font a surface cannot load, falls back to the default Look.

The contract lives here: `spec/look.md`, `spec/look.schema.json`, fixtures checked by `bun run check:look`, and the house lint `bun run lint:house-look`. Authoring tools emit Look files and propose changes to this repository. They never keep a divergent copy.

## Why recipes and not more roles or tokens

Roles describe *colour intent* and are portable across ecosystems; structure is not colour. Adding `--shadow-*` or density tokens to the role layer would break ADR-0002's closure and the portability it buys. A recipe is the structural counterpart of the radius dial: a shared mechanism with per-Look values.

## Consequences

- `spec/effects.md` is amended: effects stay Identity (per Look). The *mechanism* for elevation, density and focus is now shared and specified in `spec/look.md`.
- The default Look fixture is pinned from recorded web and native baselines (computed styles and resolved values), not from the specification's tables. Its numbers must reproduce today's look exactly, compound values included (for example, a border plus a shadow, ring focus, per-surface pinned density). It is not subject to the house lint unless it is listed there.
- Implementations gain a pure mapping, recipe to styles, with tests asserting that the default Look yields exactly today's values. The difference proof asserts structural deltas for curated Looks on both surfaces, not colour alone.
- New recipes, new enum values or new Look fields require a spec change and a schema version bump. They are never per-surface extensions.
