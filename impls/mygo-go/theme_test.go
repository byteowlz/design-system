package design

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"math"
	"os"
	"reflect"
	"regexp"
	"strings"
	"testing"

	"github.com/egoist/mygo/ui"
)

func TestCanonicalStudioParity(t *testing.T) {
	raw, err := os.ReadFile("testdata/parity.json")
	if err != nil {
		t.Fatal(err)
	}
	var fixtures map[string]struct{ Slots, Roles map[string]string }
	if err := json.Unmarshal(raw, &fixtures); err != nil {
		t.Fatal(err)
	}
	for id, expected := range fixtures {
		t.Run(id, func(t *testing.T) {
			scheme, err := Builtin(id)
			if err != nil {
				t.Fatal(err)
			}
			resolved, err := Resolve(scheme, 8)
			if err != nil {
				t.Fatal(err)
			}
			if !reflect.DeepEqual(resolved.Slots, expected.Slots) {
				t.Fatalf("slot parity: %+v expected %+v", resolved.Slots, expected.Slots)
			}
			if len(resolved.Roles) != 16 {
				t.Fatal("roles not closed")
			}
			for role, value := range expected.Roles {
				if got := resolved.Roles[Role(role)]; got != ui.Hex(value) {
					t.Fatalf("%s: %+v != %s", role, got, value)
				}
			}
			r := resolved.Roles
			theme := resolved.Theme
			if theme.Background != r[Background] || theme.Surface != r[Surface] || theme.Text != r[Foreground] ||
				theme.TextMuted != r[MutedForeground] || theme.Accent != r[Primary] || theme.AccentText != r[Background] ||
				theme.Focus != r[Ring] || theme.Selection != r[Accent] || theme.Inverse != r[SurfaceSunken] ||
				theme.Danger != r[Danger] || theme.Success != r[Success] || theme.Warning != r[Warning] ||
				theme.Border != r[Border] || theme.Scrollbar != r[MutedForeground] ||
				theme.SurfaceHover != r[Accent] || theme.SurfacePressed != r[Secondary] ||
				theme.AccentHover != r[Primary] || theme.AccentPressed != r[Primary] ||
				theme.InverseText != r[Foreground] {
				t.Fatal("native vocabulary role parity")
			}
			if theme.Radius != resolved.Radius.SM {
				t.Fatal("control radius is not SM")
			}
		})
	}
}

func TestRadiusAndBase16Alias(t *testing.T) {
	for _, dial := range []float32{0, 4, 8, 32, math.MaxFloat32 / 2} {
		got, err := Radius(dial)
		if err != nil {
			t.Fatal(err)
		}
		if got != (RadiusScale{dial * 0.5, dial * 0.75, dial, dial * 1.25}) {
			t.Fatal(got)
		}
	}
	for _, dial := range []float32{-1, float32(math.NaN()), float32(math.Inf(1)), math.MaxFloat32} {
		if _, err := Radius(dial); err == nil {
			t.Fatal("accepted invalid radius")
		}
	}
	scheme, _ := Builtin("nord")
	scheme.PureBase16 = true
	resolved, err := Resolve(scheme, 0)
	if err != nil {
		t.Fatal(err)
	}
	if resolved.Slots["base10"] != resolved.Slots["base00"] || resolved.Slots["base12"] != resolved.Slots["base08"] {
		t.Fatal("pure Base16 alias mismatch")
	}
	delete(scheme.Slots, "base05")
	if _, err := Resolve(scheme, 0); err == nil {
		t.Fatal("missing slot accepted")
	}
}

func TestOmarchyOrderingTrap(t *testing.T) {
	// Omarchy writes red,yellow,orange; base24 is base08=red,base09=orange,
	// base0A=yellow. A positional converter swaps orange and yellow.
	imported, err := OmarchyColors(map[string]string{
		"mode": "dark", "background": "#2e3440", "foreground": "#d8dee9",
		"red": "#bf616a", "yellow": "#ebcb8b", "orange": "#d5967a",
	})
	if err != nil {
		t.Fatal(err)
	}
	if got := imported.Scheme.Slots["base09"]; got != "#d5967a" {
		t.Fatalf("base09 must be orange, got %s", got)
	}
	if got := imported.Scheme.Slots["base0A"]; got != "#ebcb8b" {
		t.Fatalf("base0A must be yellow, got %s", got)
	}
}

func TestOmarchyCorpusImportsTotally(t *testing.T) {
	// Every first-party theme at the pinned revision must import with all 24
	// slots filled and fallbacks declared, never an exception.
	raw, err := os.ReadFile("testdata/omarchy-corpus.json")
	if err != nil {
		t.Fatal(err)
	}
	var corpus struct {
		Themes map[string]map[string]string `json:"themes"`
	}
	if err := json.Unmarshal(raw, &corpus); err != nil {
		t.Fatal(err)
	}
	if len(corpus.Themes) < 23 {
		t.Fatalf("corpus too small: %d themes", len(corpus.Themes))
	}
	totalFallbacks := 0
	for name, colors := range corpus.Themes {
		imported, err := OmarchyColors(colors)
		if err != nil {
			t.Fatalf("%s: %v", name, err)
		}
		if len(imported.Scheme.Slots) != 24 {
			t.Fatalf("%s: %d/24 slots", name, len(imported.Scheme.Slots))
		}
		for _, slot := range slotOrder {
			value, ok := imported.Scheme.Slots[slot]
			if !ok {
				t.Fatalf("%s: slot %s unfilled", name, slot)
			}
			if err := validateOmarchyColor(slot, value); err != nil {
				t.Fatalf("%s: %v", name, err)
			}
		}
		if imported.Diagnostics.Legacy {
			t.Fatalf("%s: canonical theme treated as legacy ANSI", name)
		}
		// Ordering trap, asserted per theme that ships both keys.
		if orange, ok := colors["orange"]; ok {
			if imported.Scheme.Slots["base09"] != orange {
				t.Fatalf("%s: orange not in base09", name)
			}
		}
		if yellow, ok := colors["yellow"]; ok {
			if imported.Scheme.Slots["base0A"] != yellow {
				t.Fatalf("%s: yellow not in base0A", name)
			}
		}
		totalFallbacks += len(imported.Diagnostics.Fallbacks)
		if mo, ok := colors["mode"]; ok && imported.Diagnostics.Mode != mo {
			t.Fatalf("%s: mode %s != %s", name, imported.Diagnostics.Mode, mo)
		}
	}
	if totalFallbacks == 0 {
		t.Fatal("expected declared fallbacks across the corpus")
	}
}

func TestOmarchyAbsentKeysUseDeclaredFallback(t *testing.T) {
	// white, solitude and last-horizon omit orange and brown; before the
	// fallback table these were a hard error.
	imported, err := OmarchyColors(map[string]string{
		"mode": "dark", "background": "#201d19", "foreground": "#e6dfd0",
		"red": "#944b42", "yellow": "#d7c290",
	})
	if err != nil {
		t.Fatal(err)
	}
	if got := imported.Diagnostics.Fallbacks["base09"]; got != "red" {
		t.Fatalf("base09 should fall back to red, got %q", got)
	}
	if got := imported.Diagnostics.Fallbacks["base0F"]; got != "red" {
		t.Fatalf("base0F should fall back to red, got %q", got)
	}
}

func TestOmarchyLegacyAnsiIsPartialOverlay(t *testing.T) {
	imported, err := OmarchyColors(map[string]string{
		"color0": "#2e3440", "color7": "#d8dee9", "color4": "#81a1c1",
	})
	if err != nil {
		t.Fatal(err)
	}
	if !imported.Diagnostics.Legacy {
		t.Fatal("ANSI-only palette not flagged legacy")
	}
	if len(imported.Diagnostics.Unfilled) == 0 {
		t.Fatal("legacy overlay must declare unfilled slots")
	}
	// Unfilled slots keep the house scheme rather than being invented.
	base, _ := Builtin("oqto-dark")
	if imported.Scheme.Slots["base01"] != base.Slots["base01"] {
		t.Fatal("legacy overlay invented an unfilled slot")
	}
	if imported.Scheme.Slots["base00"] != "#2e3440" {
		t.Fatal("legacy color0 did not fill base00")
	}
}

func TestDataOnlyOmarchy(t *testing.T) {
	base, _ := Builtin("oqto-dark")
	var m struct {
		Canonical  map[string]string   `json:"canonical"`
		Fallback   map[string][]string `json:"fallback"`
		LegacyAnsi map[string]string   `json:"legacyAnsi"`
	}
	raw, _ := data.ReadFile("data/omarchy.json")
	json.Unmarshal(raw, &m)
	resolved, _ := Resolve(base, 0)
	for _, mapping := range []map[string]string{m.Canonical, m.LegacyAnsi} {
		colors := map[string]string{}
		for slot, key := range mapping {
			colors[key] = resolved.Slots[slot]
		}
		if mapping == nil {
			t.Fatal("unreachable")
		}
		imported, err := OmarchyColors(colors)
		if err != nil {
			t.Fatal(err)
		}
		actual, err := Resolve(imported.Scheme, 0)
		if err != nil {
			t.Fatal(err)
		}
		for slot := range mapping {
			if actual.Slots[slot] != resolved.Slots[slot] {
				t.Fatal("slot mapping drift")
			}
		}
	}
	for _, text := range []string{"bad=[", "background=123", "color0='#123456'", strings.Repeat("x", 65537)} {
		if _, err := Omarchy(strings.NewReader(text)); err == nil {
			t.Fatal("accepted incomplete/malformed input")
		}
	}
	// A palette with no usable background/foreground is rejected; absent
	// non-required keys are resolved by declared fallback instead.
	for _, text := range []string{"red = \"#bf616a\"", "muted = \"#4c566a\"\nmode = \"dark\""} {
		if _, err := Omarchy(strings.NewReader(text)); err == nil {
			t.Fatal("accepted a palette with no background or foreground")
		}
	}
	if _, err := parseColor("url(https://invalid.test)"); err == nil {
		t.Fatal("accepted executable/CSS syntax")
	}
	for _, value := range []string{"oklch(NaN 0.1 20)", "#xyz", "rgba(0,0,0,2)"} {
		if _, err := parseColor(value); err == nil {
			t.Fatal("accepted invalid color")
		}
	}
}

func TestOmarchyInputTableProvenance(t *testing.T) {
	// data/omarchy.json is now a copy of spec/omarchy-map.json, which extends
	// the archived templates map with ordered fallbacks. The archived canonical
	// and legacy tables must still be a subset, so the mapping is provenanced
	// from the pinned source revision rather than retyped.
	source, err := os.ReadFile("reference/templates-omarchy.mjs.txt")
	if err != nil {
		t.Fatal(err)
	}
	m, err := loadOmarchyMap()
	if err != nil {
		t.Fatal(err)
	}
	for key, name := range map[string]string{"canonical": "CANONICAL", "legacyAnsi": "LEGACY_ANSI"} {
		block := strings.Split(strings.Split(string(source), "const "+name+" = {")[1], "};")[0]
		archived := map[string]string{}
		for _, match := range regexp.MustCompile(`(base[0-9A-F]{2}): "([^"]+)"`).FindAllStringSubmatch(block, -1) {
			archived[match[1]] = match[2]
		}
		live := m.Canonical
		if key == "legacyAnsi" {
			// The ANSI overlay is intentionally partial: it fills only the
			// slots ANSI numbering can express.
			live = m.LegacyAnsi
			if len(live) != 16 {
				t.Fatalf("legacyAnsi table should hold 16 keys, got %d", len(live))
			}
		} else if len(live) != len(slotOrder) {
			t.Fatalf("%s table is not total over base24 slots", key)
		}
		for slot, want := range archived {
			if live[slot] != want {
				t.Fatalf("%s[%s] = %q, archived %q", key, slot, live[slot], want)
			}
		}
	}
	// Every fallback chain must start with the slot's canonical key.
	for _, slot := range slotOrder {
		chain := m.Fallback[slot]
		if len(chain) == 0 || chain[0] != m.Canonical[slot] {
			t.Fatalf("fallback chain for %s does not start with its canonical key", slot)
		}
	}
}

func TestProvenanceAndRoleTable(t *testing.T) {
	raw, err := os.ReadFile("reference/hashes.json")
	if err != nil {
		t.Fatal(err)
	}
	var hashes map[string]string
	json.Unmarshal(raw, &hashes)
	for path, want := range hashes {
		bytes, err := os.ReadFile(path)
		if err != nil {
			t.Fatal(err)
		}
		sum := sha256.Sum256(bytes)
		if hex.EncodeToString(sum[:]) != want {
			t.Fatalf("source drift: %s", path)
		}
	}
	source, _ := os.ReadFile("reference/roles.ts.txt")
	block := strings.Split(strings.Split(string(source), "export const ROLE_FOR_SLOT")[1], "};")[0]
	bindings := map[Role]string{}
	for _, m := range regexp.MustCompile(`([a-z-]+|"[a-z-]+"): "(base[0-9A-F]{2})"`).FindAllStringSubmatch(block, -1) {
		bindings[Role(strings.Trim(m[1], "\""))] = m[2]
	}
	raw, _ = data.ReadFile("data/roles.json")
	var table map[Role]string
	json.Unmarshal(raw, &table)
	if len(table) != 16 || !reflect.DeepEqual(bindings, table) {
		t.Fatal("role table differs from pinned canonical engine")
	}
}
