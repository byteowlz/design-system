# A scheme may re-bind closed roles to other slots

A scheme file may carry an optional `roles` map, closed role -> slot, that replaces the default binding (spec/roles.md) for the listed roles only. Roles stay closed (16), slots stay closed (24, ADR-0002), and a binding names a slot, never a raw colour. Schemes without `roles` emit exactly what they emitted before; `spec/fixtures/schemes/*.tokens.json` pins that byte for byte.

## Context

The default bindings make several roles share a slot: `surface`, `border` and `input` all read `base01`; `muted`, `accent` and `secondary` all read `base02`. For dark schemes and the incumbent `oqto-light` that is harmless, because a one-step lighter (or darker) surface also works as a quiet divider.

The Chalk light direction (design-studio `docs/proposals/oqto-light`, user-selected 2026-10-02) needs them apart:

- a white raised surface (`#FFFFFF`) and a strong meaningful boundary (`#7A857E`) cannot both be `base01`; making `base01` grey turns cards and popovers grey and recreates the washed-out hierarchy the proposal fixes;
- a neutral hover (`muted`, `#EDF0EE`) and a green-tinted selection (`accent`, `#DEEAE3`) cannot both be `base02`.

The proposal also observed that per-scheme `overrides` alone are not a cross-surface fix: the native gpui adapter ignored them except for charts, and an override is a raw colour per emitted variable (a private palette per host).

## Decision

- `spec/schema.json` gains `roles`: keys are the 16 closed role names, values are slot keys.
- Implementations resolve a role through the scheme's binding first, then the default (`roleBindings()` in shadcn-ts; `Scheme::role_slot` in the gpui-rs candidate in oqto-desktop's `oqto-design`).
- Framework vocabulary that mirrors a role (shadcn `--card`, `--popover`, `--border`, `--input`, `--sidebar`, ...) follows the role's effective binding, so web and native stay in step from one scheme field.
- Text-on-fill pairs stay framework vocabulary. An authored scheme pins them with the existing `overrides` (e.g. `--primary-foreground`). Native adapters honour the shadcn `*-foreground` override names for their own paired tokens, so one scheme field sets on-primary on every surface.

## Considered options

- **New roles (`panel`, `hover`, `selection`, `on-primary`)**: grows the closed set for one scheme's needs; every scheme and adapter would have to fill them.
- **Raw-colour overrides per host**: works today on web, not native; colours would drift from the slots and from each other. This is what the proposal warned against.
- **Change the default bindings** (e.g. `border -> base03`): would change `oqto-light`, `oqto-dark` and every community scheme.
- **Per-scheme slot re-binding (chosen)**: no new roles, no new slots, no change for existing schemes, and it is still portable: any tinted-theming scheme can be paired with a binding.

## Consequences

- `oqto-chalk` is the first scheme to use it: `border` and `input -> base03`, `muted -> base10`, plus `*-foreground` overrides of `#FFFFFF` for filled actions and statuses.
- The `input` role's intent is clarified as the input *boundary* (what shadcn's `border-input` and gpui's `input.border` already draw). An input's fill is the surface it sits on; no implementation emitted `input` as a fill.
- A re-bound role changes every token that mirrors it. Adding a new mirror to an adapter now means choosing role or slot explicitly; the snapshots catch accidental changes for existing schemes.
- Community schemes are unaffected. A loader may later attach a binding to an imported scheme, behind the same schema validation.
