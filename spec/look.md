# Spec: Look — Identity and semantic recipes above schemes (v1: control)

A Look is a versioned, curated package:

- a pinned **dark/light scheme pair**,
- **Identity**: fonts, the radius dial, an elevation ramp,
- **semantic component recipes**: closed enums and small integers describing structure.

Colour stays in schemes (slots → roles). The Look describes *structure*. Decision record: [ADR-0004](../docs/adr/0004-look-identity-recipes.md). Machine contract: [`look.schema.json`](look.schema.json).

## Shape

```json
{ "id": "…", "name": "…", "version": 1,
  "schemes": { "dark": "<scheme id>", "light": "<scheme id>" },
  "identity": { "fonts": {…}, "radius": 10, "shadows": { "dark": {…}, "light": {…} } },
  "recipes": { "control": {…} } }
```

- **schemes**: exactly one dark and one light scheme id. In v1, colour-only schemes combine only with the default Look.
- **identity.fonts**: `sans` and `mono` (required) and `display` (optional). Each is `{ stack, native }`:
  - `stack` is the web fallback stack, ending in a generic family.
  - `native` is the single family name a native surface requests.
  - A surface that cannot load a font falls back to the default Look.
- **identity.radius**: the radius dial in px ([radius.md](radius.md)).
- **identity.shadows**: the elevation ramp per mode, with steps `sm | md | lg`. Each step is 1–4 structured layers `{ x, y, blur, spread, alpha, color, inset? }`:
  - all values are integers;
  - `alpha` is a percentage of the role colour;
  - `color` is one of the 16 roles.

  The ramp is required when any recipe uses `raised`.

## The control recipe

`recipes.control` describes buttons, with variants `primary | secondary | ghost | danger`; text-style controls use `ghost`.

### Elevation: one mechanism per element

Each variant has exactly one elevation mechanism:

| kind | border width | shadow | hover (derived) |
|------|--------------|--------|-----------------|
| `flat` | 0 | none | surface tint |
| `hairline` | 1, colour = `{ role, alpha }` | none | surface tint |
| `raised` (`sm` / `md`) | 0 | ramp step `sm` / `md` | one ramp step up (`md` / `lg`) and a 1 px lift |

A border and a shadow on the same element cannot be expressed. The hairline colour is a role plus an integer alpha. The plain `border` role binds the same slot as `surface`, which makes it invisible on cards.

### Density

Density is either a named table or pinned px per surface. The named tables hold integer px:

| name | web h / pad-x / gap | desktop h / pad-x / gap |
|------|---------------------|-------------------------|
| `compact` | 28 / 10 / 6 | 24 / 8 / 4 |
| `regular` | 34 / 14 / 7 | 28 / 12 / 6 |
| `comfortable` | 40 / 18 / 8 | 32 / 14 / 6 |

The table values are **provisional** until the web and native baselines are recorded. A Look may pin `{ web: {height, padding_x, gap}, desktop: {…} }` instead; the default Look will.

**Radius versus height:** the control radius tier `md = dial × 0.75` must satisfy `2 × md < height` on every surface, so compact controls never become pills by accident.

### Focus

Keyboard focus must stay visible, so there is no `none`.

| kind | parameters | meaning |
|------|------------|---------|
| `ring` | width, offset | gap plus ring. Expressible, but not used by house Looks. |
| `outline` | width | one stroke at offset 0, no gap |
| `tint` | amount (1–100) | the surface shifts toward the `ring` role; hairline controls move their hairline to `ring`. No added stroke. |
| `indicator` | width, offset | a radius-aware bar in the `ring` role, set off from the control by `offset` |

**Visibility rule:** every value must give at least a 3:1 focused-versus-unfocused difference against each adjacent surface (background, card, sidebar), in both modes, measured on the pinned schemes. The schema cannot evaluate colours, so authoring tools and implementations verify this rule against the resolved schemes.

- An `indicator` in the ring colour is invisible on a control *filled* with the ring colour. It must therefore be set off from the control (`offset`), or sit on the adjacent surface.
- `tint` rarely reaches 3:1 on filled controls without destroying them; measure before choosing it.

## Numbers

All lengths are integers or exact binary fractions (multiples of 0.25 px). Alphas are integer percentages. Surfaces implement Looks in different languages and float widths, and inexact decimals drift across them.

## Out of scope for v1

- **Web-only effects** (backdrop blur, glass). They are not part of the cross-surface contract; a web surface may add them as an enhancement with an opaque fallback.
- **Indicators** (active-tab underline, thinking bar). These come later as a separate, radius-aware recipe.
- **Any second recipe** (card, input, list), until `control` is implemented on both surfaces.

## The default (Oqto) Look

> **Placeholder, tracked separately.** The default Look fixture is not part of this specification change. Its values must be pinned from recorded web computed-style and native baselines for every control variant × size × state, so that today's look is reproduced exactly. Until then there is no default Look fixture, and the density tables above are provisional.

## Fixtures and checks

`spec/fixtures/look/valid/` holds Looks that must be accepted. The curated Lumen and Moss control recipes are exported by the authoring tool with generic font families.

`spec/fixtures/look/invalid/` holds Looks that must be rejected, each at the path listed in `invalid/EXPECTED.json`:
- focus `none`;
- a border plus a shadow, and a hairline plus a shadow level;
- an unknown enum value;
- an inexact number;
- a pill-shaped radius;
- raised elevation without a ramp.

```sh
bun run check:look                      # all fixtures
bun scripts/check-look.ts my.look.json  # validate specific Looks
```
