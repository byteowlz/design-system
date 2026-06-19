# Spec: Roles

The semantic layer tools consume. A role is an *intent* bound to a slot (e.g. `primary` → `base0B`, `success` → `base0B`, `danger` → `base08`). Roles are the portable surface: a scheme that fills the slots reskins every compliant tool identically at the role layer.

## The abstract role set — CLOSED

This set is fixed by the standard. Tools consume the subset they need; they cannot add portable roles. Anything beyond this set is per-tool or per-framework **vocabulary** (non-portable).

| role | intent | typical slot binding |
|------|--------|----------------------|
| `background` | app background | `base00` |
| `foreground` | default text | `base05` |
| `primary` | brand / primary action | `base0B` |
| `secondary` | secondary action / surface | `base02` |
| `muted` | muted surface | `base02` |
| `accent` | accent surface | `base02` |
| `success` | positive status | `base0B` |
| `warning` | cautionary status | `base0A` |
| `danger` | destructive / error | `base08` |
| `info` | informational status | `base0D` |
| `border` | borders, dividers | `base01` |
| `ring` | focus ring | `base0B` |
| `card` | card surface | `base01` |
| `popover` | popover surface | `base01` |
| `input` | input surface | `base01` |

Note multiple roles may bind the same slot (e.g. `primary` and `success` both → `base0B` in oqto's green-branded scheme). That is correct: hue and role are separate indirections. A scheme that swaps the green slot changes both; a tool that re-points `success` → a different slot decouples them.

## Per-tool / per-framework vocabulary (NON-portable)

Extensions drawing from the same slots. Examples:

- **Framework (shadcn):** the `*-foreground` pairs — `card`/`card-foreground`, `popover`/`popover-foreground`, `primary`/`primary-foreground`, etc. — encode "text readable on this surface." Defined in `impls/shadcn-ts/`, not here.
- **Tool (oqto):** `terminal-bg`, `terminal-fg`, `code-bg`, `code-fg`, `chart-1..5`, `panel`. oqto-local, never portable.

Vocabulary is structured and intentional (it has a contract), not ad-hoc.

## Alpha is derived, not slotted

`bg-primary/20`, scrims, hovers, and translucent fills are computed from the role's resolved color at the implementation layer. They are never extra slots and never extra roles. This keeps the chromatic base at 24 and makes alpha behave consistently across schemes.
