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

Controls come in **size tiers** named after the toolkit sizes:
- `xs`, `sm` and `md`, where `md` is the toolkit default (shadcn `default`, gpui `medium`);
- `lg`.

A call site keeps choosing its size; the Look decides what each tier measures.

Density is either a named table or pinned px per surface and tier. The named tables define every tier on both surfaces. They hold integer px as height / padding-x / gap:

| name | surface | xs | sm | md | lg |
|------|---------|----|----|----|----|
| `compact` | web | 20 / 6 / 4 | 24 / 8 / 4 | 28 / 10 / 6 | 32 / 12 / 6 |
| | desktop | 18 / 4 / 4 | 20 / 6 / 4 | 24 / 8 / 4 | 28 / 10 / 6 |
| `regular` | web | 26 / 8 / 4 | 30 / 12 / 6 | 34 / 14 / 7 | 38 / 16 / 8 |
| | desktop | 20 / 6 / 4 | 24 / 8 / 4 | 28 / 12 / 6 | 32 / 14 / 6 |
| `comfortable` | web | 32 / 12 / 6 | 36 / 14 / 7 | 40 / 18 / 8 | 44 / 20 / 8 |
| | desktop | 24 / 8 / 4 | 28 / 10 / 6 | 32 / 14 / 6 | 36 / 16 / 8 |

The tables are **authoring presets**, not baselines. A Look may instead pin `{ web: { md: {height, padding_x, gap}, sm: {…} }, desktop: {…} }`. `md` is required on each surface, and a surface pins only the tiers it uses. The default Look pins, because today's Oqto measures differently on each surface:
- web `sm` 32 / 12 and `md` 36 / 16;
- desktop `xs` 20 / 4, `sm` 24 / 8 and `md` 32 / 10.

**Radius versus height:** the control radius tier `md = dial × 0.75` must satisfy `2 × md < height` for every tier on every surface. The smallest tier decides. This keeps compact controls from becoming pills by accident.

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

`spec/fixtures/look/valid/oqto.look.json` pins today's Oqto buttons on both surfaces. It is an ordinary Look, with no compatibility mode and no legacy flag. It passes the schema and deliberately fails the house lint: it uses ring focus, and the Web outline button has a border plus a shadow. It is not a house Look.

**Surface and mode splits.** Oqto renders differently per surface today, so the recipe allows three kinds of split:
- A variant may be split into `{ web, desktop }`.
- A variant may override the control `focus`.
- Focus `alpha` and `border_to_ring` may differ per mode (`{ dark, light }`).

Examples from the fixture:
- The Web danger button's ring uses the `danger` role at 40% (dark) and 20% (light); Desktop uses the ring role at 50% for every variant.
- The Web outline button keeps its border colour on focus in dark mode only, because `dark:border-input` wins.
- The Web outline button has a border and a shadow; Desktop's bordered button (gpui's default variant) has only the border.

**Provenance.**
- Web: Chromium 147 computed styles, oqto `feat/look-control-recipe` at `8c9b6a5c`. That is 160 samples across 16 controls, 5 states and dark/light (issue `oqto-a8hg`).
- Web gap: `components/ui/button.tsx` at the same commit (`gap-2`, sm `gap-1.5`); its SHA-256 matches the baseline's recorded hash.
- Desktop: heights and square icon-only buttons are measured by a headless render in oqto-desktop (`control_look.rs`, `trx-v4j9.17`). Padding, gap, border and focus are read from gpui-component 0.6.1 source, guarded by a version pin.
- Desktop native screenshots are still pending.

**Known gaps (recorded, not approximated):**
- The Web light outline shadow is a zero-alpha layer whose raw colour is `rgb(181 209 236)`. It is pinned as `transparent` at alpha 0, which is visually identical. The computed styles also carry Tailwind's four zero-valued composition layers. A Web implementation must keep the existing declarations for the Oqto Look so that computed styles stay byte-identical.
- The Web shared button narrows its padding when it contains an icon (`has-[>svg]`: md 12, sm 10). Icon-plus-label buttons were not measured, and `densityPx` has no field for this yet.
- Web draws the ring as a box-shadow with outline none. Desktop draws it as a 3 px bordered child outside the control's border. Both are the same `ring` (width 3, offset 0).
- Per-state colours are not part of the control recipe. Examples: ghost hover white/10, disabled opacity 0.5, the dark danger fill at 60%. They stay in each surface's scheme-to-vocabulary mapping.
- The Workbench sidebar icon button (`.wb-icon-button`, native `outline: auto`) is a Workbench control, not the shared button, and is out of scope for `control`.
- Fonts in `identity` come from the design studio export and are not baselined here.

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
