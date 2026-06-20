import { useEffect, useMemo, useState } from "react";
import {
  applyScheme,
  builtInSchemeList,
  type Scheme,
} from "@byteowlz/design-system";

const SLOT_KEYS = [
  "base00","base01","base02","base03","base04","base05","base06","base07",
  "base08","base09","base0A","base0B","base0C","base0D","base0E","base0F",
  "base10","base11","base12","base13","base14","base15","base16","base17",
] as const;

// Complete shadcn concrete surface (every var the engine emits), each with the
// slot it maps to — so duplicates (e.g. card & popover both -> base01) are shown
// as intentional, and nothing (success/warning/info/border/...) is missing.
const SHADCN_SURFACE: ReadonlyArray<{ name: string; slot: string }> = [
  { name: "background", slot: "base00" },
  { name: "foreground", slot: "base05" },
  { name: "card", slot: "base01" },
  { name: "card-foreground", slot: "base05" },
  { name: "popover", slot: "base01" },
  { name: "popover-foreground", slot: "base05" },
  { name: "primary", slot: "base0B" },
  { name: "primary-foreground", slot: "base00" },
  { name: "secondary", slot: "base02" },
  { name: "secondary-foreground", slot: "base06" },
  { name: "muted", slot: "base02" },
  { name: "muted-foreground", slot: "base04" },
  { name: "accent", slot: "base02" },
  { name: "accent-foreground", slot: "base06" },
  { name: "destructive", slot: "base08" },
  { name: "destructive-foreground", slot: "base06" },
  { name: "success", slot: "base0B" },
  { name: "success-foreground", slot: "base00" },
  { name: "warning", slot: "base0A" },
  { name: "warning-foreground", slot: "base00" },
  { name: "info", slot: "base0D" },
  { name: "info-foreground", slot: "base00" },
  { name: "border", slot: "base01" },
  { name: "input", slot: "base01" },
  { name: "ring", slot: "base0B" },
  { name: "sidebar", slot: "base11" },
  { name: "sidebar-foreground", slot: "base06" },
  { name: "chart-1", slot: "base0D" },
  { name: "chart-2", slot: "base0B" },
  { name: "chart-3", slot: "base0E" },
  { name: "chart-4", slot: "base09" },
  { name: "chart-5", slot: "base0C" },
];

// Abstract roles grouped by ramp (F1: 2 foreground levels, 3 surface depths).
const ROLE_GROUPS: ReadonlyArray<{ title: string; roles: ReadonlyArray<string> }> = [
  {
    title: "Foreground ramp (2 levels)",
    roles: ["foreground", "muted-foreground"],
  },
  {
    title: "Surface depth (3 levels)",
    roles: ["background", "surface", "surface-sunken"],
  },
  {
    title: "Action & status",
    roles: ["primary", "secondary", "muted", "accent", "success", "warning", "danger", "info"],
  },
  {
    title: "Structure",
    roles: ["border", "ring", "input"],
  },
];

export default function App() {
  const [schemeId, setSchemeId] = useState(builtInSchemeList[0]?.id ?? "");
  const [radius, setRadius] = useState(0); // px, the R1 dial
  const scheme: Scheme | undefined = useMemo(
    () => builtInSchemeList.find((s) => s.id === schemeId),
    [schemeId],
  );

  // Apply scheme + radius dial whenever either changes (live, no reload).
  useEffect(() => {
    if (!scheme) return;
    applyScheme(scheme, { radius: `${radius}px` });
  }, [scheme, radius]);

  if (!scheme) return null;
  const radiusLabel = `${radius}px${radius === 0 ? " (sharp)" : ""}`;

  return (
    <div className="app">
      <header>
        <h1>@byteowlz/design-system</h1>
        <p>
          base24 slots · closed abstract role layer · shadcn concrete surface ·
          R1 concentric radius · base16 derivation
        </p>
      </header>

      <div className="controls">
        <label>
          Scheme
          <select value={schemeId} onChange={(e) => setSchemeId(e.target.value)}>
            {builtInSchemeList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.system}/{s.mode})
              </option>
            ))}
          </select>
        </label>
        <label className="dial">
          Radius dial (proportional scale)
          <input
            type="range"
            min={0}
            max={48}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
          />
          <b>{radiusLabel}</b>
        </label>
        <span className="badge">system: {scheme.system}</span>
        <span className="badge">mode: {scheme.mode}</span>
        {scheme.system === "base16" && (
          <span className="badge">base10–17 derived</span>
        )}
      </div>

      <section>
        <h2>24 slots (base24 palette)</h2>
        <div className="grid cols-8">
          {SLOT_KEYS.map((k) => {
            const isBase24Only = k.startsWith("base1") && k !== "base0F" && k >= "base10";
            const derived = scheme.system === "base16" && isBase24Only;
            return (
              <div className="swatch" key={k}>
                <div className="chip" style={{ background: `var(--${k})` }} />
                <div className="meta">
                  <span>{k}</span>
                  <span className="var">{derived ? "derived" : ""}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2>Abstract roles (portable · closed set of 16 · F1 minimal ramps)</h2>
        {ROLE_GROUPS.map((group) => (
          <div key={group.title} style={{ marginBottom: "1rem" }}>
            <h3 style={{ fontSize: ".7rem", color: "var(--muted-foreground)", margin: "0 0 .4rem", textTransform: "uppercase", letterSpacing: ".06em" }}>
              {group.title}
            </h3>
            <div className="grid cols-5">
              {group.roles.map((r) => (
                <div className="swatch" key={r}>
                  <div className="chip" style={{ background: `var(--${r})` }} />
                  <div className="meta">
                    <span>{r}</span>
                    <span className="var">--{r}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section>
        <h2>shadcn concrete surface (framework vocabulary · non-portable · complete)</h2>
        <p style={{ color: "var(--muted-foreground)", fontSize: ".75rem", margin: "0 0 .75rem" }}>
          Each var shows the slot it maps to. Tokens that share a slot render the
          same color on purpose (e.g. <code>card</code>/<code>popover</code> both = base01).
        </p>
        <div className="grid cols-5">
          {SHADCN_SURFACE.map(({ name, slot }) => (
            <div className="swatch" key={name}>
              <div className="chip" style={{ background: `var(--${name})` }} />
              <div className="meta">
                <span>--{name}</span>
                <span className="var">{slot}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Radius — proportional nesting (all tiers round when dial &gt; 0)</h2>
        <div className="concentric">
          <code>outer · var(--radius-xl)</code>
          <div className="layer lg">
            <code>layer 1 · var(--radius-lg)</code>
            <div className="layer md">
              <code>layer 2 · var(--radius-md)</code>
              <div className="layer sm">
                <code>innermost · var(--radius-sm)</code>
              </div>
            </div>
          </div>
        </div>
        <p style={{ color: "var(--muted-foreground)", fontSize: ".8rem", marginTop: ".75rem" }}>
          Move the slider — every tier scales proportionally, so the innermost
          rounds too. At 0px everything is dead sharp. (Exact shared-arc
          concentricity is available via <code>childRadius()</code> for components
          that want it.)
        </p>
      </section>
    </div>
  );
}
