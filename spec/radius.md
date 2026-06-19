# Spec: Radius (R1 — concentric nesting, single dial)

Shape is governed by **one dial** and **one nesting rule**. The dial is per-tool (oqto = `0`, sharp); the rule is shared.

## The dial

A single root radius value. `radius = 0` means every element is sharp-cornered. Increasing it rounds corners across the whole UI.

## The rule (concentric nesting)

Each standard container component computes the radius it passes to its children:

```
childRadius = max(0, myRadius − inset)
```

where `inset` is the padding (or border-box gap) between the container's edge and its content slot.

Consequence: nested boxes share the same arc centers — the Apple-style concentric look. Large outer boxes naturally carry more radius; small inner ones less. "Based on size" is the *emergent feel* of this rule, not a separate calculation.

## Why not proportional-to-size (R2)

A size-proportional rule (radius scales with each element's own dimensions) would round differently-sized siblings differently and break the concentric arcs that are the explicit goal. R1 is chosen precisely to guarantee nesting.

## Scope of the guarantee

Concentricity holds for elements rendered **inside standard container components** that implement the contract — i.e. they compute and apply `childRadius` to their content slot. Raw elements opt in by consuming the radius token. The mechanism is shared; the guarantee is scoped to compliant components.

## Degradation

At `dial = 0`, every `childRadius` is `0` regardless of nesting. A tool whose identity is sharp corners (oqto) sets the dial to `0` and pays nothing — no special-casing, no opt-outs. This is the hard requirement that made R1 the choice.

## Implementation home

The rule is target-agnostic (this file). Each framework impl implements it natively:
- `impls/shadcn-ts/` — emits the radius dial as `--radius` (and the categorical `--radius-sm/md/lg/xl` derived from it); container components compute `childRadius`.
- `impls/iced-rs/`, `impls/gpui-rs/` — later, same rule.

The playground ships a radius slider so the rule is verifiable live.
