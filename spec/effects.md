# Spec: Effects & motion (not portable)

Effects — shadows, blur, gradients, noise, motion — are an **Identity** concern (per-tool), never portable roles. This file exists to prevent two recurring mistakes:

1. Thinking the standard *forbids* effects (it doesn't — any tool may use them freely).
2. Trying to add `--shadow-*` (or similar) to the closed role layer (don't — effects aren't semantic intent).

## What the standard governs

The standard's portable surface is **color** (slots → roles) and **shape** (the radius dial). Effects are neither. They are CSS properties applied by a tool's components, reading color/shape values from the emitted vars.

This works today, unchanged, against the standard's emitted variables:

```css
.card {
  /* reads primary + border from the standard's emitted vars */
  box-shadow: 0 4px 12px color-mix(in srgb, var(--primary) 20%, transparent);
  border: 1px solid var(--border);
}
```

## Layer placement

| Layer | Contents | Effects? | Portable? |
|-------|----------|----------|-----------|
| Slots | 24 chromatic base | no | (format) yes |
| Roles | semantic intent (closed) | **no** | yes |
| Identity | per-tool non-color values (fonts, radius dial, spacing, **effects**) | **yes — here** | no |
| Vocabulary | per-tool/framework token names | shadow var names, if any | no |

Effects belong to **Identity** — exactly like the radius dial. The radius *mechanism* (proportional scale, sharp-at-0) is shared; the radius *value* (0 for oqto, 8px elsewhere) is per-tool. Shadows follow the same pattern.

## Implications

1. **No cost to non-shadow tools.** Tools that don't want effects (oqto, most apps) define, import, and emit nothing for shadows. The standard never forces effects on anyone.
2. **Effects are never scheme-driven portably.** A scheme cannot reskin "the shadow" the way it reskins `--primary`. Per-tool effects may read scheme colors; they are not reskinned by schemes. If a tool wants scheme-conditional effects (e.g. a "neumorphic" scheme), that's a per-tool `overrides` extension, never a portable role.
3. **The door is symmetric with radius.** If a future tool wants a shadow dial, the pattern is proven (radius): add an `effects` module to the impl that defaults to off and scales a ramp. That is a *new shared mechanism* (like radius), not a new portable role. oqto would set it to off and notice nothing.

## What the standard will never ship

A "complete design system" in the shadcn/Tailwind sense. It ships the portable contract (color + radius mechanism); each tool brings its own effects/motion/spacing decisions. That is the cost of "mechanism not look." If effects ever become portable enough to standardize (e.g. every byteowlz tool agrees on a 3-level elevation ramp), that promotion is an ADR-worthy decision, not a default.
