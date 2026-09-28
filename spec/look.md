# Spec: Look — Identity and semantic recipes above schemes (v1: control)

A Look is a versioned, curated package:

- a pinned **dark/light scheme pair**,
- **Identity**: fonts, the radius dial, an elevation ramp,
- **semantic component recipes**: closed enums and small integers describing structure.

Colour stays in schemes (slots → roles). The Look describes *structure*. Everything a surface renders today must be expressible and tweakable. House-style taste (no ring focus, a border OR a shadow) is a separate lint over an explicit list of house Looks, not a schema rule. Decision record: [ADR-0004](../docs/adr/0004-look-identity-recipes.md). Machine contract: [`look.schema.json`](look.schema.json).

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
  - `alpha` is a percentage of the colour;
  - `color` is one of the 16 roles, or an absolute neutral `black | white | transparent`. The neutrals exist so existing shadows can be pinned verbatim; they are not portable roles.

  The ramp is required when any elevation references it.

## The control recipe

`recipes.control` describes buttons, with variants `primary | secondary | ghost | danger` (required) and `outline` (optional); text-style controls use `ghost`.

### Elevation: a border and a shadow, independently

A variant's `elevation` is a preset or an explicit `{ border, shadow }`:

- **`border`**: `{ width: 0 }`, or `{ width: 1, color: { role, alpha } }`. Alpha 0 is a transparent, layout-only border. The plain `border` role binds the same slot as `surface`, so a visible hairline usually names another role with an alpha.
- **`shadow`**: one of
  - `"none"`;
  - `{ ramp: "sm" | "md" | "lg" }`, a step of the Look's ramp;
  - `{ dark: [layers], light: [layers] }`, explicit per-mode layers for pinning an existing surface verbatim.

The two parts are independent, so **compound values are valid**. For example, a 1 px border plus a soft shadow is valid; today's default look uses one on its outline button.

Presets are shorthand with a fixed expansion:

| preset | border | shadow | derived hover |
|--------|--------|--------|---------------|
| `flat` | 0 | none | surface tint |
| `hairline` | 1, `{ foreground, 10 }` | none | surface tint |
| `raised-sm` | 0 | ramp `sm` | ramp `md` and a 1 px lift |
| `raised-md` | 0 | ramp `md` | ramp `lg` and a 1 px lift |

Hover is derived as shown unless the variant pins `hover` (same shape as `elevation`).

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
| `ring` | width, offset, alpha?, border_to_ring? | a ring around the control, optionally recolouring its border |
| `outline` | width, alpha? | one stroke at offset 0, no gap |
| `tint` | amount (1–100) | the surface shifts toward the `ring` role; hairline controls move their hairline to `ring`. No added stroke. |
| `indicator` | width, offset, alpha? | a radius-aware bar in the `ring` role, set off from the control by `offset` |
| `native` | none | the platform's default focus indicator (for example a browser `outline: auto`), pinned where a surface uses it today |

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

> **Placeholder, tracked separately.** The default Look fixture is not part of this specification change. Its values must be pinned from recorded web computed-style and native baselines for every control variant × size × state, so that today's look is reproduced exactly.
>
> It is an ordinary Look, with no compatibility mode and no legacy flag. Its values are expected to be compound: ring focus on shared buttons, native focus where a surface uses it, a border plus a shadow on the outline button, and per-surface pinned density. Until then there is no default Look fixture, and the density tables above are provisional.

## House-Look lint (taste, not contract)

The house styles avoid two things: a visible border together with a visible shadow on one control, and ring focus. `scripts/house-look-lint.ts` enforces both over an **explicit** list of house Looks:

```sh
bun run lint:house-look                                # the listed house Looks
bun scripts/house-look-lint.ts some.look.json …        # any Looks you choose
```

The schema never knows which Looks are "house". A Look that fails the lint is still a valid Look.

## Fixtures and checks

`spec/fixtures/look/valid/` holds Looks that must be accepted. The curated Lumen and Moss control recipes are exported by the authoring tool with generic font families.

`spec/fixtures/look/invalid/` holds Looks the schema must reject, each at the path listed in `invalid/EXPECTED.json`:
- focus `none`;
- an unknown enum value;
- an inexact number;
- a pill-shaped radius;
- a ramp reference without a ramp.

`spec/fixtures/look/lint-fail/` holds Looks the schema must **accept** and the house lint must **reject**:
- a border plus a ramp shadow;
- an outline-style border plus explicit shadow layers;
- ring focus.

```sh
bun run check:look                      # all fixtures
bun scripts/check-look.ts my.look.json  # validate specific Looks
```
