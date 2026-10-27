# Spec: external palette source adapters (Omarchy first)

An **external palette source** is another theme ecosystem whose palettes we read
as inert data. This spec defines how one is translated into base24 slots, and is
the contract every adapter in `impls/` and every tool that reads `colors.toml`
must follow.

Omarchy is the first adapter because it is the one we run. The pattern is
general: adapters, not special cases, and never a second palette system.

Governing decision: `oqto/docs/adr/0040-oqto-customizations-lua-configurable-ui.md`
section "External theme ecosystems are data sources; Omarchy is the first
compatibility fixture" (proposed 2026-08-19). This spec does not supersede that
ADR; it makes its mapping total, testable, and shared by more than one consumer.

## Scope and hard rules

- **Data only.** A source palette is parsed as data. No script, Lua, template,
  CSS, installer, or renderer config is read or executed.
- **Read only.** Adapters never modify the source ecosystem's files, nor user
  state owned by that ecosystem.
- **Bounded.** Reads are size-limited and reject malformed input before use.
- **No second palette system.** A translated palette is base24 slots plus
  provenance. Nothing above the slot layer may be invented here; roles stay
  `spec/roles.md`.
- **Lossy translation is declared, never silent.** Anything that cannot be
  represented is reported as a diagnostic.

## The mapping

Canonical key names, not file order. See `omarchy-map.json` for the
machine-readable form; this section explains it.

| slots | Omarchy keys |
|---|---|
| `base00`-`base07` | `background`, `lighter_background`, `selection`, `muted`, `dark_foreground`, `foreground`, `light_foreground`, `bright_foreground` |
| `base08`-`base0F` | `red`, `orange`, `yellow`, `green`, `cyan`, `blue`, `magenta`, `brown` |
| `base10`-`base17` | `dark_background`, `darker_background`, `bright_red`, `bright_yellow`, `bright_green`, `bright_cyan`, `bright_blue`, `bright_magenta` |

Not slots, and never guessed into one:

- `accent` - carries no base24 slot. Preserved as explicit metadata
  (`--omarchy-accent` / provenance field), because a slot binding would have to
  know which accent the theme author meant.
- `mode` - preserved as metadata and as the scheme `variant`, never inferred
  from slot lightness.
- `cursor`, `selection_foreground`, `selection_background` - **derived, not
  read.** Omarchy defines no cursor palette key; cursors use
  `bright_foreground`. Selection is derived as
  `selection_background = selection` (i.e. `base02`) and
  `selection_foreground = bright_foreground` (i.e. `base07`). These are outputs
  of a template, not inputs of a palette.

## Ordering: map by key name, never by position

Omarchy writes its chromatic keys in the file order

```
red, yellow, orange, green, cyan, blue, magenta, brown
```

base24 slot order is

```
base08=red, base09=orange, base0A=yellow, base0B=green,
base0C=cyan, base0D=blue, base0E=magenta, base0F=brown
```

**Positions 2 and 3 are swapped.** A converter that zips the eight chromatic
values in file order onto `base08`-`base0F` silently swaps **orange and yellow
in every theme** - the two most similar hues, so visual inspection is unlikely
to catch it.

Verified against real data (Omarchy Nord vs tinted base16 Nord):

```
omarchy: red=#bf616a  yellow=#ebcb8b  orange=#d5967a
base16:  base08=BF616A  base09=D08770  base0A=EBCB8B
```

The brights (`bright_red`..`bright_magenta` -> `base12`..`base17`) *do* line up
positionally, which is exactly what makes a positional zip look correct.

Order is not a contract in any source ecosystem. Notable exceptions found in
Omarchy 4.0.0-alpha first-party themes: `white`, `solitude` and `last-horizon`
omit `orange` and `brown` entirely, and `hackerman`, `solitude`, `last-horizon`
interleave `hyprland_active_border` / `active_border_color` /
`active_tab_background` among the palette keys.

## Absent keys: declared fallbacks

A palette is not required to be complete. Before this spec, an absent key was a
hard error, which meant **3 of 23 first-party Omarchy themes failed to import**.
Every slot now has an ordered fallback chain (in `omarchy-map.json` under
`fallback`), applied in the source key namespace, and every substitution is
reported.

Terminal-ramp exemplars:

| slot | first choice | then |
|---|---|---|
| `base01` | `lighter_background` | `selection`, `muted`, `background` |
| `base03` | `muted` | `dark_foreground`, `light_foreground`, `foreground` |
| `base06` | `light_foreground` | `foreground`, `bright_foreground` |
| `base07` | `bright_foreground` | `light_foreground`, `foreground` |

Chromatic exemplars:

| slot | first choice | then |
|---|---|---|
| `base09` | `orange` | `red`, `yellow`, `foreground` |
| `base0D` | `blue` | `bright_blue`, `accent`, `cyan`, `foreground` |
| `base0F` | `brown` | `red`, `foreground` |

Ramp and brights exemplars:

| slot | first choice | then |
|---|---|---|
| `base10` | `dark_background` | `background` |
| `base11` | `darker_background` | `dark_background`, `background` |
| `base12`-`base17` | `bright_<name>` | `<name>` (the matching normal accent), `foreground` |

Two rules make this principled rather than convenient:

1. **Accents fall back toward hue-similar or role-equivalent keys, then
   `foreground`.** `orange` prefers `red`/`yellow`; `blue` prefers `accent`
   before `cyan`.
2. **Brights fall back to their own normal accent**, matching the base16 policy
   in `spec/base16-policy.md`. `base12` <- `bright_red`, else `red`.

Every slot except `base00` and `base05` terminates at `foreground`, so any
palette declaring a background and a foreground fills all 24 slots. That
property is asserted by `scripts/test-omarchy-codec.py`.

The only slots with no fallback are `base00` (`background`) and `base05`
(`foreground`). A palette missing either is rejected as not a palette.

**Accepted consequence.** A theme without the darker ramp (`white`,
`solitude`, `last-horizon`, and every light theme) flattens `base10`/`base11`
onto `background`. This is the same honest flattening `spec/base16-policy.md`
accepts for base16-only schemes, for the same reason: the source palette is
smaller, and inventing darker steps would fabricate curation the author did not
make.

**Mode.** `mode` is read from `mode`, else `theme_type`, else the presence of a
`light.mode` marker file, else `dark`. Value must be `dark` or `light`; anything
else is rejected.

## Legacy ANSI palettes

A theme predating canonical keys may expose only `color0`..`color15` (or ship
an `alacritty.toml` that Omarchy itself converts at staging time). That is a
**separate, versioned resolver** (`legacyAnsi` in `omarchy-map.json`):

- It fills only the slots it can and leaves the rest at the consumer's house
  values. It is a partial overlay, and must be labelled as one in output.
- **ANSI numbering must never be relabelled as base16 or base24.** `color0` is
  not `base00`; ANSI `color8` is the *bright* black, which base16 does not have
  as a slot. The legacy table encodes the widely-deployed convention, nothing
  more.
- Legacy resolution runs only when the canonical path yields nothing.

## Same-name collisions: provenance, not merging

Palettes from different ecosystems **must not be merged or averaged**, and a
same-name match must not be assumed equal. Measured on Omarchy 4.0.0-alpha
first-party themes versus tinted base24 schemes of the same name:

| theme | differing slots |
|---|---|
| kanagawa | 5 / 24 |
| nord | 6 / 24 |
| everforest | 7 / 24 |
| catppuccin-latte | 14 / 24 |
| rose-pine | 16 / 24 |

No same-name pair is equal. Divergence clusters in the neutral ramp
(`base01`, `base03`, `base04`, `base06`, `base07`) and in `base09`/`base0F`
(`orange`/`brown`), which differ in nearly every pair because base16 authors
treat those two as spare slots.

Three distinct causes, which must be reported differently:

1. **Same name, different curation** (nord, kanagawa, everforest) - independent
   hand-tuning, typically 5-7 slots. Modal case. Not an error.
2. **Same name, contradictory intent** - irreconcilable. Rose-pine: the Omarchy
   canonical theme is the **light** variant (`mode = "light"`,
   `background = #faf4ed`); the tinted scheme is dark (`#191724`).
   Catppuccin-latte: the base16 author places pink/lavender in `base06`/`base07`,
   Omarchy real near-white foregrounds.
3. **Structural asymmetry** - Omarchy has a darker ramp and six brights; base16
   has neither (8 absent slots).

Policy:

- A scheme's identity is `(source, name, variant, content digest)`, **never**
  `name` alone. `Nord (omarchy)` and `Nord (tinted)` are different schemes that
  share a name.
- Aliasing one to the other requires human verification of equality. **Today
  that alias table is correctly empty.**
- A consumer that surfaces an omarchy palette and a tinted palette with the same
  name must show provenance and let the user pick per surface.

## Provenance record

An imported palette carries: source ecosystem, source repo and pinned revision,
source file path, name/author/license, source format version, content digest,
original palette, translated slots, every applied fallback, and every dropped
field. Provenance survives export. A translated palette without a provenance
record is a bug.

## Verification

- Every first-party Omarchy theme imports with all 24 slots filled and no
  unhandled absent key, at the pinned revision below.
- `orange` lands in `base09` and `yellow` in `base0A` for every theme that ships
  both (the ordering trap).
- Round-trip through the emitted tinted form preserves all 24 slots exactly.
- Malformed, oversized, non-string, and executable-looking input is rejected
  before use.
- Absent keys produce declared fallbacks, never exceptions.

## Pinned reference

Description follows observed behaviour, not a schema: Omarchy publishes no
machine-readable `colors.toml` schema. "Canonical" here means the key set every
first-party theme ships (18 of 23 identical; 5 add Hyprland border keys).

| | |
|---|---|
| Omarchy repo | `https://github.com/basecamp/omarchy` |
| Revision observed | `18ecf39440174ae6a5a7e097434d1d4375292375` |
| Version | `4.0.0.alpha` |
| First-party themes | 23 |
| Ordering/documented in | `docs/theming.md`, `manual/en/43-making-your-own-theme.md` |
| Governing contract | Oqto ADR-0040, blob `b5e60876217559ae4b88be89762798e82572aff0` |
