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

## Scope

- **In:** screen-rendered UIs (web / Electron now; iced / gpui later).
- **Out:** TUI / terminal. tinted/tinty + base16-shell already own that domain.

## Layout

```
design-system/
├── spec/            # THE standard — target-agnostic (slots, roles, radius, base16 policy, schema)
├── impls/
│   ├── shadcn-ts/   # NOW: the published package. shadcn surface + engine + applyScheme + derive-base16
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
