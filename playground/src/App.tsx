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

// Abstract roles -> the CSS var the engine emits for each (portable surface).
const ROLES = [
  "primary","secondary","muted","accent","success","warning","danger","info",
  "background","foreground","border","ring","card","popover","input",
] as const;

// shadcn concrete surface pairs (framework vocabulary, non-portable).
const SHADCN_PAIRS = [
  "card","popover","primary","secondary","muted","accent","destructive",
] as const;

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
            const v = scheme.slots[k];
            const derived = scheme.system === "base16" && !v;
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
        <h2>Abstract roles (portable · closed set of 15)</h2>
        <div className="grid cols-5">
          {ROLES.map((r) => (
            <div className="swatch" key={r}>
              <div className="chip" style={{ background: `var(--${r})` }} />
              <div className="meta">
                <span>{r}</span>
                <span className="var">--{r}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>shadcn concrete surface (framework vocabulary · non-portable)</h2>
        <div className="grid cols-5">
          {SHADCN_PAIRS.flatMap((name) => [name, `${name}-foreground`]).map((v) => (
            <div className="swatch" key={v}>
              <div className="chip" style={{ background: `var(--${v})` }}>
                <span style={{ color: `var(--${v})`, filter: "invert(1) hue-rotate(180deg)" }} />
              </div>
              <div className="meta"><span>--{v}</span></div>
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
