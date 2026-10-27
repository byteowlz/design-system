package design

import (
	"encoding/json"
	"fmt"
	"io"
	"strings"

	"github.com/pelletier/go-toml/v2"
)

// omarchyMap is the machine-readable adapter map (spec/omarchy-map.json),
// copied verbatim to data/omarchy.json. Canonical/Fallback are slot -> ordered
// source keys; a slot binds the first present candidate. LegacyAnsi is the
// partial ANSI overlay for pre-canonical themes.
type omarchyMap struct {
	Version    int                 `json:"version"`
	Canonical  map[string]string   `json:"canonical"`
	Fallback   map[string][]string `json:"fallback"`
	LegacyAnsi map[string]string   `json:"legacyAnsi"`
	Metadata   struct {
		Accent string `json:"accent"`
		Mode   struct {
			Keys       []string `json:"keys"`
			MarkerFile string   `json:"markerFile"`
			Default    string   `json:"default"`
			Allowed    []string `json:"allowed"`
		} `json:"mode"`
	} `json:"metadata"`
	RequiredSlots []string `json:"requiredSlots"`
}

// OmarchyDiagnostics reports what a translation actually did. Per
// spec/omarchy.md every fallback and every dropped field is declared, never
// silent, so a consumer can surface provenance.
type OmarchyDiagnostics struct {
	// Fallbacks maps a slot to the non-preferred source key that supplied it.
	Fallbacks map[string]string `json:"fallbacks,omitempty"`
	// Accent and Mode are semantic metadata with no base24 slot.
	Accent string `json:"accent,omitempty"`
	Mode   string `json:"mode,omitempty"`
	// Legacy is set when only an ANSI color0..color15 palette was available.
	// The result is then a partial overlay, not a complete palette.
	Legacy bool `json:"legacy,omitempty"`
	// Unfilled lists slots left at the house scheme (legacy overlay only).
	Unfilled []string `json:"unfilled,omitempty"`
}

// OmarchyImport is a translated palette plus its provenance diagnostics.
type OmarchyImport struct {
	Scheme      Scheme
	Diagnostics OmarchyDiagnostics
}

var slotOrder = []string{
	"base00", "base01", "base02", "base03", "base04", "base05", "base06", "base07",
	"base08", "base09", "base0A", "base0B", "base0C", "base0D", "base0E", "base0F",
	"base10", "base11", "base12", "base13", "base14", "base15", "base16", "base17",
}

func loadOmarchyMap() (omarchyMap, error) {
	raw, err := data.ReadFile("data/omarchy.json")
	if err != nil {
		return omarchyMap{}, err
	}
	var m omarchyMap
	if err := json.Unmarshal(raw, &m); err != nil {
		return omarchyMap{}, err
	}
	if len(m.Canonical) != len(slotOrder) || len(m.Fallback) != len(slotOrder) {
		return omarchyMap{}, fmt.Errorf("omarchy map is not total over base24 slots")
	}
	return m, nil
}

// Omarchy consumes bounded flat string TOML data; no file paths, scripts or I/O
// beyond Reader.
func Omarchy(reader io.Reader) (Scheme, error) {
	imported, err := OmarchyImportData(reader)
	return imported.Scheme, err
}

// OmarchyImportData is Omarchy with provenance diagnostics. Absent keys resolve
// through declared fallbacks and are reported, never fatal.
func OmarchyImportData(reader io.Reader) (OmarchyImport, error) {
	raw, err := io.ReadAll(io.LimitReader(reader, 65537))
	if err != nil {
		return OmarchyImport{}, fmt.Errorf("Omarchy data cannot be read")
	}
	if len(raw) > 65536 {
		return OmarchyImport{}, fmt.Errorf("Omarchy data exceeds 64 KiB")
	}
	var colors map[string]string
	if err := toml.Unmarshal(raw, &colors); err != nil {
		return OmarchyImport{}, fmt.Errorf("expected flat TOML string data")
	}
	return OmarchyColors(colors)
}

// OmarchyColors translates a flat Omarchy palette into base24 slots on top of
// the house scheme matching its mode. Every absent key is resolved by the
// ordered fallback chain in the pinned map; only a palette with no usable
// background or foreground is rejected.
func OmarchyColors(colors map[string]string) (OmarchyImport, error) {
	m, err := loadOmarchyMap()
	if err != nil {
		return OmarchyImport{}, err
	}
	mode, err := omarchyMode(m, colors)
	if err != nil {
		return OmarchyImport{}, err
	}
	base, err := Builtin("oqto-" + mode)
	if err != nil {
		return OmarchyImport{}, err
	}

	// The canonical path wins whenever any canonical key is present.
	canonical := false
	for _, key := range m.Canonical {
		if _, ok := colors[key]; ok {
			canonical = true
			break
		}
	}

	slots := map[string]string{}
	out := OmarchyImport{Diagnostics: OmarchyDiagnostics{Mode: mode, Legacy: !canonical}}
	if canonical {
		out.Diagnostics.Fallbacks = map[string]string{}
		for _, slot := range slotOrder {
			for _, candidate := range m.Fallback[slot] {
				value, ok := colors[candidate]
				if !ok {
					continue
				}
				if err := validateOmarchyColor(candidate, value); err != nil {
					return OmarchyImport{}, err
				}
				slots[slot] = value
				if candidate != m.Canonical[slot] {
					out.Diagnostics.Fallbacks[slot] = candidate
				}
				break
			}
		}
	} else {
		// Partial ANSI overlay: unmatched slots keep the house values.
		for _, slot := range slotOrder {
			key, ok := m.LegacyAnsi[slot]
			if !ok {
				continue
			}
			value, ok := colors[key]
			if !ok {
				continue
			}
			if err := validateOmarchyColor(key, value); err != nil {
				return OmarchyImport{}, err
			}
			slots[slot] = value
		}
		for _, slot := range slotOrder {
			if _, ok := slots[slot]; !ok {
				out.Diagnostics.Unfilled = append(out.Diagnostics.Unfilled, slot)
			}
		}
	}

	for _, slot := range m.RequiredSlots {
		if _, ok := slots[slot]; !ok {
			return OmarchyImport{}, fmt.Errorf("Omarchy palette has no usable %s", m.Canonical[slot])
		}
	}
	if len(slots) == 0 {
		return OmarchyImport{}, fmt.Errorf("Omarchy palette has no usable color keys")
	}
	for slot, value := range slots {
		base.Slots[slot] = value
	}
	if accent, ok := colors[m.Metadata.Accent]; ok {
		if err := validateOmarchyColor(m.Metadata.Accent, accent); err != nil {
			return OmarchyImport{}, err
		}
		out.Diagnostics.Accent = accent
	}
	base.ID = "omarchy-data"
	base.Name = "Omarchy data"
	base.Mode = mode
	base.Overrides = nil
	out.Scheme = base
	return out, nil
}

func omarchyMode(m omarchyMap, colors map[string]string) (string, error) {
	mode := ""
	for _, key := range m.Metadata.Mode.Keys {
		if value, ok := colors[key]; ok {
			mode = value
			break
		}
	}
	if mode == "" {
		mode = m.Metadata.Mode.Default
	}
	for _, allowed := range m.Metadata.Mode.Allowed {
		if mode == allowed {
			return mode, nil
		}
	}
	return "", fmt.Errorf("invalid Omarchy mode")
}

// validateOmarchyColor requires a bare six-digit hex value. Anything else -
// short hex, named colors, functions, URLs - is rejected before use, so no
// theme can smuggle executable or renderer syntax through a palette.
func validateOmarchyColor(key, value string) error {
	if len(value) != 7 || !strings.HasPrefix(value, "#") {
		return fmt.Errorf("Omarchy palette key %s requires six-digit hex", key)
	}
	if _, err := parseColor(value); err != nil {
		return err
	}
	return nil
}
