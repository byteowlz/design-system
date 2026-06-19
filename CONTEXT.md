# design-system

The reusable, tool-agnostic *mechanism + contract* for dialing a screen-rendered UI's appearance, shared across byteowlz tools. This file defines the canonical language of the standard — terms only, no implementation.

## Language

**Mechanism**:
The shared machinery every tool reuses: the color engine, the role layer, the radius rule. Identical everywhere. Contrasted with *look*, which is per-tool.
_Avoid_: design system (overloaded — people mean the look), theme (that is a *value*, not the machinery)

**Look**:
A tool's concrete appearance — its colors, fonts, spacing values. Per-tool and intentionally different across tools. The mechanism is shared; looks are not.
_Avoid_: brand (that is identity, broader than appearance)

**Scheme**:
A concrete palette of color values occupying the 24 base24 slots (or 16 base16). Defines a look's colors. The *format* is standardized; the *values* are per-tool or community.
_Avoid_: palette (that is the slot set, not a filled instance), theme (ambiguous)

**House scheme**:
A scheme shipped with this repo as a reference/consumer default (e.g. `oqto-dark`, `oqto-light`). Distinct from the 500+ community tinted-theming schemes, which this repo does not vendor.
_Avoid_: default scheme (ambiguous — any tool's default is its own choice)

**Slot**:
One of 24 (base24) or 16 (base16) chromatic positions (`base00`–`base0F` / `–base17`). The chromatic base of any scheme.
_Avoid_: color (that is a value in a slot), variable (that is the CSS emission)

**Role**:
A semantic intent bound to a slot — e.g. `primary`, `success`, `border`. Roles are the portable surface tools consume. The abstract role set is closed.
_Avoid_: token (that is the concrete emitted name, e.g. a CSS var), semantic (too generic)

**Vocabulary**:
Per-tool or per-framework token names that draw from the same slots but are non-portable (e.g. shadcn's `--card-foreground` pairs; a tool's `--terminal-bg`). Extensions on the role layer, never part of the portable surface.
_Avoid_: custom tokens (implies ad-hoc; vocabulary is structured and intentional)

**Dial**:
A single tunable parameter whose mechanism is standardized and whose value is per-tool. Radius is a dial; the active scheme is a dial.
_Avoid_: setting (too generic), option

**Identity**:
Per-tool non-color values (fonts, the radius dial's value, spacing) plugged into the shared mechanism. Part of a tool's look.

**Twin**:
A base24 scheme with the same name as a base16 scheme (e.g. both `nord` and `dracula` exist in both). Twins get base24-preferred loading; 43 of 320 base16 schemes have one.
