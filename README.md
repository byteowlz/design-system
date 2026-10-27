# design-system

A reusable, tool-agnostic **mechanism** for dialing a screen-rendered UI's appearance. Shared across byteowlz tools. Every tool wears its own colors and identity; the *machinery* (base24 color engine, closed role layer, concentric radius) is identical everywhere.

> The reusable thing is the **mechanism**, not a **look**.

## Quick start (playground)

```bash
bun install        # from repo root (workspaces)
bun run dev        # playground at http://localhost:5174
```

The playground shows every color (24 slots + 15 abstract roles + shadcn pairs), a live theme switch across house schemes (including a base16-derived scheme), and a radius slider demonstrating the R1 concentric rule.

## What this is

- **A published npm package** — `@byteowlz/design-system` (the `impls/shadcn-ts/` build). Consumed like any normal dep: `bun add @byteowlz/design-system`.
- **A target-agnostic spec** — `spec/`. The contract (slots, roles, radius, base16 policy) is independent of rendering target. Future framework impls (`mantine-ts`, `iced-rs`, `gpui-rs`) implement the same spec.

## MyGo native Go adapter

[`impls/mygo-go`](impls/mygo-go/) is the canonical native `ui.View` adapter for
MyGo v0.3.2: Base24 slots, all 16 closed roles, Base16 widening, R1 radius and
bounded data-only Omarchy input. It uses pinned Studio source schemes and
sRGB parity fixtures, not a modified toolkit default palette. Run `just check`
in that Go module. Source pins, license and native vocabulary exceptions are
recorded in its README and PROVENANCE.md; app composition is not implied.

## Omarchy palette bridge

Omarchy is the first **external palette source** adapter, and the one we run. The
contract is `spec/omarchy.md` (mapping in `spec/omarchy-map.json`), carrying the
governing decision from Oqto ADR-0040 / `oqto-nq3b`: external theme ecosystems
are data sources, inert and unexploited.

- **In either direction.** `impls/mygo-go` translates Omarchy `colors.toml` to
  base24 slots; `scripts/omarchy-to-tinted.py` emits tinted-theming scheme YAML
  so `tinty` can apply an Omarchy palette to the terminal/TUI stack.
- **By key name, never by file position.** Omarchy writes `red, yellow, orange`
  but base24 is `base09=orange, base0A=yellow`; a positional converter silently
  swaps orange and yellow in every theme.
- **Total over the corpus.** All 23 first-party Omarchy themes at the pinned
  revision translate to 24/24 slots, with 6 declared fallback substitutions.
  Absent keys resolve through an ordered chain and are reported; they are never
  a hard error.
- **Same-name palettes are not merged.** No Omarchy/tinted same-name pair is
  equal (5-16 of 24 slots differ). Identity is
  `(source, name, variant, digest)`, never `name` alone.

```bash
uv run --script scripts/test-omarchy-codec.py          # 1223 conformance checks
scripts/omarchy-to-tinted.py ~/.config/omarchy/themes/nord --out-dir /tmp/schemes
```

## Scope

- **In:** screen-rendered UIs (web / Electron now; iced / gpui later), plus
  data-only *adapters* for external palette ecosystems. An adapter translates
  palettes into slots; it never adopts another ecosystem's renderer, templates
  or style vocabulary.
- **Out:** TUI / terminal *rendering*. tinted/tinty + base16-shell own that
  domain, and this repo feeds them rather than replacing them.

## Layout

```
design-system/
├── spec/            # THE standard — target-agnostic (slots, roles, radius, base16 policy, schema)
│   ├── omarchy.md          # external palette source adapter contract
│   └── omarchy-map.json    # single-source slot mapping every adapter reads
├── scripts/         # omarchy-to-tinted (colors.toml → tinted YAML) + codec conformance tests
├── impls/
│   ├── shadcn-ts/   # NOW: the published package. shadcn surface + engine + applyScheme + derive-base16
│   ├── mygo-go/     # NOW: native ui.View adapter + Omarchy colors.toml input
│   ├── mantine-ts/  # later
│   ├── iced-rs/     # later
│   └── gpui-rs/     # later
├── playground/      # showcase app (excluded from npm tarball): swatches + theme switch + radius slider
├── docs/adr/        # standard-specific decisions
└── CONTEXT.md       # ubiquitous language for the standard
```

## Status

shadcn-ts impl built, typechecks, and smoke-tested: base16 derivation, token mapping (39 vars), R1 radius, base24 passthrough all verified. Next: publish to npm (gated), then oqto cutover.

Decisions are recorded in `docs/adr/`; the contract is in `spec/`; consumer migration (oqto) is tracked in oqto as `oqto-trdk`.
