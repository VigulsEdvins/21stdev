"use client"

import * as React from "react"
import AnodizedInk, { ANODIZED_INK_PRESETS, type AnodizedInkPreset } from "@/components/ui/anodized-ink"

/**
 * Boxed instead of full-bleed, with every knob exposed. Each change goes
 * straight into the shader's uniforms — the GL context is never rebuilt.
 */
const NAMES = Object.keys(ANODIZED_INK_PRESETS) as AnodizedInkPreset[]

const KNOBS = [
  { key: "speed", min: 0, max: 3, step: 0.05 },
  { key: "turbulence", min: 0.2, max: 2, step: 0.05 },
  { key: "scale", min: 0.4, max: 3, step: 0.05 },
  { key: "sheen", min: 0, max: 2.5, step: 0.05 },
  { key: "swirl", min: 0, max: 3, step: 0.05 },
  { key: "glow", min: 0, max: 3, step: 0.05 },
  { key: "grain", min: 0, max: 3, step: 0.05 },
  { key: "vignette", min: 0, max: 1, step: 0.05 },
] as const

type Knob = (typeof KNOBS)[number]["key"]

const DEFAULTS: Record<Knob, number> = {
  speed: 1,
  turbulence: 1,
  scale: 1,
  sheen: 1,
  swirl: 1,
  glow: 1,
  grain: 1,
  vignette: 0.6,
}

export default function PlaygroundDemo() {
  const [preset, setPreset] = React.useState<AnodizedInkPreset>("crimson")
  const [values, setValues] = React.useState(DEFAULTS)

  return (
    <div className="min-h-screen w-full bg-background px-6 py-14 text-foreground">
      <div className="mx-auto w-full max-w-4xl">
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.28em] text-muted-foreground">
          Anodized Ink
        </p>
        <h2 className="mb-6 text-3xl font-semibold tracking-tight">Tune the suspension</h2>

        <div className="mb-5 flex flex-wrap gap-2">
          {NAMES.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setPreset(name)}
              className={
                "flex items-center gap-2 rounded-full border px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors " +
                (name === preset
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground")
              }
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: ANODIZED_INK_PRESETS[name].ink }}
              />
              {name}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border border-border">
          <AnodizedInk preset={preset} height="460px" {...values} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          {KNOBS.map(({ key, min, max, step }) => (
            <label key={key} className="flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.18em]">
              <span className="w-24 text-muted-foreground">{key}</span>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={values[key]}
                onChange={(e) => setValues((v) => ({ ...v, [key]: Number(e.target.value) }))}
                className="flex-1 accent-current"
              />
              <span className="w-10 text-right tabular-nums">{values[key].toFixed(2)}</span>
            </label>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between gap-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            move to stir · click to drop ink
          </p>
          <button
            type="button"
            onClick={() => setValues(DEFAULTS)}
            className="rounded-full border border-border px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
          >
            reset
          </button>
        </div>
      </div>
    </div>
  )
}
