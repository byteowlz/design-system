# base24 is the chromatic base; no expansion beyond 24 slots

The standard's color base is base24 (24 slots: 16 base16 + 8 darker-backgrounds and brights). The slot set never expands — no base32, no `base18+`.

## Context

24 slots is enough for the screen-UI role surface (measured: oqto's ~45 semantic tokens map onto 16 of the 24 slots, with healthy reuse). The temptation when a tool needs "more" (extra hues, a brand color, a scrim) is to add slots. We don't.

## Decision

The chromatic base is fixed at 24 (base24) / 16 (base16). Anything beyond is handled above the slot layer:

- **More hues / brand colors outside the palette** → per-tool **vocabulary** drawing from existing slots, or a role re-binding.
- **Alpha / translucency** (`bg-primary/20`, scrims, hovers) → *derived* from the resolved slot color at the implementation layer, never a slot.

## Why 24, not more

The whole point of choosing base24 was ecosystem portability — the tinted-theming project ships 185 base24 + 320 base16 community schemes; a user's nvim/terminal theme becomes their UI theme. Adding a 25th slot vaporizes that overnight. base24 is the chromatic base; the design *system* is the indirection (roles, derived alpha) layered on top.

## Why 24, not fewer (base16)

base24's extra 8 slots (`base10`–`base17`) carry structural contrast (darkest backgrounds for sidebars/terminals) and bright variants that base16 lacks. A base16-only scheme is supported via derivation (see `spec/base16-policy.md`), but base24 is first-class because real tools depend on those slots for structural surfaces.

## Consequences

- `spec/schema.json` caps the slot set; validators reject schemes with unknown slots.
- Tools that genuinely need more than 24 chromatic positions are expressing a per-tool need and must use the vocabulary extension, not pressure the standard.
