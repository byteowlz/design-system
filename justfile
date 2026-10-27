set shell := ["bash", "-eu", "-o", "pipefail", "-c"]

default:
    @just --list

# Typecheck every workspace package.
# NOTE: the root `bun run typecheck` script is currently broken upstream of this
# change (`--elide-lines` is not a bun flag: 'Invalid elide-lines: tsc'). Tracked
# separately; verify the impl directly until it is fixed.
typecheck:
    cd impls/shadcn-ts && bunx tsc --noEmit

# Conformance tests for the external palette source codec (spec/omarchy.md).
omarchy-test:
    uv run --script scripts/test-omarchy-codec.py

# Translate an Omarchy theme into tinted-theming scheme YAML.
#   just omarchy-to-tinted ~/.config/omarchy/themes/nord /tmp/schemes
omarchy-to-tinted THEME OUT_DIR:
    scripts/omarchy-to-tinted.py "{{THEME}}" --out-dir "{{OUT_DIR}}"

# The native Go adapter's own gate (format, vet, race tests, build).
mygo-check:
    cd impls/mygo-go && just check

# Everything.
check: typecheck omarchy-test mygo-check

# Also run the (currently broken) workspace-wide script, for visibility.
check-workspace-typecheck:
    bun run typecheck
