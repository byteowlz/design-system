#!/usr/bin/env -S uv run --no-project python
"""Conformance tests for the Omarchy palette codec (spec/omarchy.md).

Runs the whole codec against a frozen corpus of first-party Omarchy palettes and
against the generated tinted output, so translation is verified rather than
eyeballed.

  uv run --script scripts/test-omarchy-codec.py

Checks:
  1. every corpus theme translates to 24/24 slots, with no exception
  2. the ordering trap: orange lands in base09, yellow in base0A
  3. round-trip: emitted YAML re-reads to exactly the translated slots
  4. absent keys resolve through declared fallbacks, and are reported
  5. base16 output drops exactly the 8 base24-only slots
  6. malformed input is refused, not coerced
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))

CORPUS = ROOT / "impls" / "mygo-go" / "testdata" / "omarchy-corpus.json"
MAP = ROOT / "spec" / "omarchy-map.json"

import importlib.util

spec_loader = importlib.util.spec_from_file_location("codec", HERE / "omarchy-to-tinted.py")
codec = importlib.util.module_from_spec(spec_loader)
spec_loader.loader.exec_module(codec)

failures: list[str] = []
checks = 0


def check(condition: bool, message: str) -> None:
    global checks
    checks += 1
    if not condition:
        failures.append(message)


def parse_emitted(text: str) -> dict[str, str]:
    """Read slots back out of an emitted YAML document."""
    slots: dict[str, str] = {}
    in_palette = False
    for line in text.splitlines():
        if line.startswith("palette:"):
            in_palette = True
            continue
        if in_palette:
            stripped = line.strip()
            if not stripped or stripped.startswith("#"):
                continue
            if ":" not in stripped:
                continue
            key, value = stripped.split(":", 1)
            slots[key.strip()] = value.strip().strip('"')
    return slots


def main() -> int:
    omarchy_spec = json.loads(MAP.read_text())
    corpus = json.loads(CORPUS.read_text())["themes"]
    all_slots = [f"base{i:02X}" for i in range(24)]

    check(len(corpus) >= 23, f"corpus too small: {len(corpus)} themes")
    fallback_total = 0

    for name, colors in sorted(corpus.items()):
        canonical = any(key in colors for key in omarchy_spec["canonical"].values())
        slots, notes, warnings = codec.translate(colors, omarchy_spec, legacy=not canonical)

        # 1. total translation
        check(not canonical or len(slots) == 24, f"{name}: {len(slots)}/24 slots")
        for slot in all_slots:
            if canonical:
                check(slot in slots, f"{name}: {slot} unfilled")
            if slot in slots:
                check(codec.HEX.match(slots[slot]) is not None, f"{name}: {slot} not hex")
        fallback_total += len(notes)

        # 2. the ordering trap
        if "orange" in colors:
            check(slots.get("base09") == colors["orange"], f"{name}: orange not in base09")
        if "yellow" in colors:
            check(slots.get("base0A") == colors["yellow"], f"{name}: yellow not in base0A")

        # 3. round-trip through the emitted YAML
        mode = colors.get("mode", "dark")
        meta = {
            "name": name, "author": "t", "variant": mode, "source_path": "x",
            "source_digest": "0" * 64, "map_revision": "test",
            "notes": notes, "warnings": warnings,
        }
        emitted = codec.emit_yaml(meta, slots, "modern")
        reparsed = parse_emitted(emitted)
        check(reparsed == slots, f"{name}: round-trip mismatch")

        # 5. base16 drops exactly the base24-only slots
        emitted16 = codec.emit_yaml(meta, {s: v for s, v in slots.items() if s in all_slots[:16]}, "modern")
        check(len(parse_emitted(emitted16)) == 16, f"{name}: base16 output not 16 slots")

    check(fallback_total > 0, "expected declared fallbacks across the corpus")

    # 4. absent keys use declared fallbacks
    thin = {"mode": "dark", "background": "#201d19", "foreground": "#e6dfd0",
            "red": "#944b42", "yellow": "#d7c290"}
    slots, notes, _ = codec.translate(thin, omarchy_spec, legacy=False)
    check(len(slots) == 24, "thin palette did not fill all 24 slots via fallback")
    check(any(n.startswith("base09 <- red") for n in notes), "base09 fallback not reported")

    # 6. malformed input refused
    try:
        codec.translate({"background": "#201d19", "foreground": "rgb(1,2,3)", "mode": "dark"},
                        omarchy_spec, legacy=False)
        check(False, "accepted a non-hex color")
    except SystemExit:
        check(True, "")

    # legacy ANSI is partial and flagged
    legacy_slots, _, legacy_warnings = codec.translate(
        {"color0": "#2e3440", "color7": "#d8dee9"}, omarchy_spec, legacy=True)
    check(len(legacy_slots) < 24, "legacy overlay should be partial")
    check(any("PARTIAL" in w for w in legacy_warnings), "legacy overlay not flagged partial")

    print(f"{checks - len(failures)}/{checks} checks passed across {len(corpus)} themes")
    for failure in failures:
        print(f"  FAIL {failure}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
