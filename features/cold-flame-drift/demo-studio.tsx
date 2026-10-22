"use client"

import * as React from "react"
import ColdFlameDrift, { PALETTES, type FlamePalette } from "@/components/ui/cold-flame-drift"

const mono = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace"
const names = Object.keys(PALETTES) as FlamePalette[]

type Knob = { key: "scale" | "angle" | "speed" | "turbulence" | "thickness" | "forks" | "dashes" | "grain"; label: string; min: number; max: number; step: number }
const KNOBS: Knob[] = [
  { key: "scale", label: "Scale", min: 50, max: 240, step: 1 },
  { key: "angle", label: "Angle", min: -90, max: 90, step: 1 },
  { key: "speed", label: "Speed", min: 0, max: 4, step: 0.05 },
  { key: "turbulence", label: "Current", min: 0, max: 2.5, step: 0.05 },
  { key: "thickness", label: "Body", min: 0.4, max: 1.8, step: 0.02 },
  { key: "forks", label: "Forks", min: 0, max: 1, step: 0.01 },
  { key: "dashes", label: "Dashes", min: 0, max: 1, step: 0.01 },
  { key: "grain", label: "Grain", min: 0, max: 1, step: 0.01 },
]

// Every prop live: pick a palette, drag the knobs, reshuffle the layout.
export default function DemoStudio() {
  const [palette, setPalette] = React.useState("ember" as FlamePalette)
  const [seed, setSeed] = React.useState(71)
  const [v, setV] = React.useState({ scale: 50, angle: 42, speed: 4, turbulence: 0, thickness: 1.04, forks: 0.5, dashes: 0.32, grain: 0.54 })
  const [open, setOpen] = React.useState(true)
  const ink = PALETTES[palette]

  return (
    <ColdFlameDrift palette={palette} seed={seed} {...v}>
      <div
        data-interactive
        style={{
          position: "absolute",
          right: "clamp(12px, 3vw, 28px)",
          bottom: "clamp(12px, 3vw, 28px)",
          width: "min(300px, calc(100% - 24px))",
          padding: 16,
          borderRadius: 14,
          background: "rgba(6,8,12,.72)",
          border: "1px solid rgba(255,255,255,.1)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          color: "#e8eef4",
          fontFamily: mono,
          fontSize: 11,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          boxShadow: "0 20px 60px rgba(0,0,0,.5)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: ink.light, boxShadow: "0 0 12px " + ink.light }} />
            Flame studio
          </span>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            style={{ background: "none", border: 0, color: "inherit", font: "inherit", letterSpacing: "inherit", cursor: "pointer", opacity: 0.7 }}
          >
            {open ? "Hide" : "Show"}
          </button>
        </div>

        {open ? (
          <>
            <div role="radiogroup" aria-label="Palette" style={{ display: "flex", gap: 8, margin: "14px 0 6px" }}>
              {names.map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={palette === n}
                  aria-label={n}
                  title={n}
                  onClick={() => setPalette(n)}
                  style={{
                    flex: 1,
                    height: 26,
                    borderRadius: 8,
                    cursor: "pointer",
                    border: palette === n ? "1.5px solid #fff" : "1px solid rgba(255,255,255,.18)",
                    background: "linear-gradient(135deg," + PALETTES[n].dark + " 0 45%," + PALETTES[n].light + " 45% 100%)",
                  }}
                />
              ))}
            </div>
            <div style={{ opacity: 0.55, marginBottom: 10 }}>{palette}</div>

            {KNOBS.map((k) => (
              <label key={k.key} style={{ display: "grid", gridTemplateColumns: "64px 1fr 36px", alignItems: "center", gap: 8, margin: "7px 0" }}>
                <span style={{ opacity: 0.7 }}>{k.label}</span>
                <input
                  type="range"
                  min={k.min}
                  max={k.max}
                  step={k.step}
                  value={v[k.key]}
                  onChange={(e) => setV((s) => ({ ...s, [k.key]: Number(e.target.value) }))}
                  style={{ width: "100%", accentColor: ink.light }}
                />
                <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {k.step < 1 ? v[k.key].toFixed(2) : v[k.key]}
                </span>
              </label>
            ))}

            <button
              type="button"
              onClick={() => setSeed((s) => (s + 1 + Math.floor(Math.random() * 97)) % 1000)}
              style={{
                width: "100%",
                marginTop: 12,
                padding: "10px 0",
                borderRadius: 9,
                border: 0,
                cursor: "pointer",
                background: ink.light,
                color: ink.background,
                font: "inherit",
                fontWeight: 600,
                letterSpacing: "inherit",
              }}
            >
              Reshuffle flames · seed {seed}
            </button>
          </>
        ) : null}
      </div>
    </ColdFlameDrift>
  )
}
