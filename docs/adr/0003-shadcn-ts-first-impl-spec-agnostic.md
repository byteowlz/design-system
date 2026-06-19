# `shadcn-ts` is the first framework implementation; the spec is framework-agnostic

The first (and currently only) framework implementation targets shadcn/ui on TypeScript. The spec itself is framework-agnostic and lives in `spec/`; `impls/shadcn-ts/` is one implementation of it, structured so peers (`mantine-ts`, `iced-rs`, `gpui-rs`) can be added without touching the spec.

## Context

The standard must be reusable across tools, but tools use different UI frameworks. Hard-coding the standard to one framework's vocabulary would make it that framework's theming system, not a standard. Yet shipping *no* implementation makes it vaporware.

## Decision

Two-layer closed sets:

- **`spec/` — abstract roles** (closed, portable): `primary`/`secondary`/`muted`/`accent`/`success`/`warning`/`danger`/`info`/`background`/`foreground`/`border`/`ring`/`card`/`popover`/`input`. Framework-agnostic.
- **`impls/shadcn-ts/` — concrete shadcn surface** (closed within shadcn, non-portable): the `*-foreground` pairs (`card`/`card-foreground`, `primary`/`primary-foreground`, …) that encode "text readable on this surface," plus status tokens shadcn lacks.

The first shipped implementation is `shadcn-ts` because the first consumer (oqto) is a shadcn/ui + Tailwind v4 app, and shadcn is the de facto React UI standard — targeting it gives the standard real consumers on day one.

## Unification with tool vocabulary

shadcn's paired names are **framework vocabulary** exactly the way a tool's `terminal-bg`/`code-bg` tokens are **tool vocabulary**. Both are non-portable extensions on the abstract role layer, both draw from the same 24 slots. The model has two kinds of extension (framework-level, tool-level), not one — and both stay out of the portable surface.

## Consequences

- A future non-shadcn tool (Radix raw, Mantine, custom) consumes the abstract roles and writes a thin translation to its own token names, or gets its own `impls/<framework>-ts/`.
- `iced-rs`/`gpui-rs` (native Rust UIs, later) are separate implementations against `spec/`, not consumers of the TS role layer — they implement the abstract roles natively.
- The published npm package today is the `shadcn-ts` build; when a second impl exists it ships as a separate package (e.g. `@byteowlz/design-system-mantine`) or the package gains subpath exports.
