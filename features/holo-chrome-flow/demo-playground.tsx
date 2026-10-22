"use client"

import * as React from "react"
import HoloChromeFlow, {
  HOLO_CHROME_PRESETS,
  type HoloChromeColors,
  type HoloChromePreset,
} from "@/components/ui/holo-chrome-flow"

/**
 * Boxed instead of full-bleed, with every knob and colour exposed. Each change
 * goes straight into the shader's uniforms — the GL context is never rebuilt.
 */
const NAMES = Object.keys(HOLO_CHROME_PRESETS) as HoloChromePreset[]

const KNOBS = [
  { key: "speed", min: 0, max: 3, step: 0.05 },
  { key: "flow", min: 0.3, max: 1.8, step: 0.05 },
  { key: "scale", min: 0.4, max: 2.5, step: 0.05 },
  { key: "stretch", min: 1, max: 4, step: 0.05 },
  { key: "angle", min: -90, max: 90, step: 1 },
  { key: "iridescence", min: 0, max: 1.5, step: 0.05 },
  { key: "ridges", min: 0, max: 3, step: 0.05 },
  { key: "veins", min: 0, max: 1, step: 0.05 },
  { key: "sparkle", min: 0, max: 3, step: 0.05 },
  { key: "tilt", min: 0, max: 2.5, step: 0.05 },
  { key: "smear", min: 0, max: 3, step: 0.05 },
  { key: "grain", min: 0, max: 2, step: 0.05 },
] as const

type Knob = (typeof KNOBS)[number]["key"]

const DEFAULTS: Record<Knob, number> = {
  speed: 1,
  flow: 1,
  scale: 1,
  stretch: 2.2,
  angle: 35,
  iridescence: 1,
  ridges: 1,
  veins: 0.5,
  sparkle: 1,
  tilt: 1,
  smear: 1,
  grain: 0.6,
}

const SWATCHES: (keyof HoloChromeColors)[] = ["base", "shine", "vein", "filmA", "filmB", "filmC"]

export default function PlaygroundDemo() {
  const [preset, setPreset] = React.useState<HoloChromePreset>("opal")
  const [values, setValues] = React.useState(DEFAULTS)
  const [colors, setColors] = React.useState<Partial<HoloChromeColors>>({})
  const [seed, setSeed] = React.useState(0)

  const palette = { ...HOLO_CHROME_PRESETS[preset], ...colors }

  return (
    <div className="min-h-screen w-full bg-background px-6 py-14 text-foreground">
      <div className="mx-auto w-full max-w-4xl">
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.28em] text-muted-foreground">
          Holo Chrome Flow
        </p>
        <h2 className="mb-6 text-3xl font-semibold tracking-tight">Pour your own metal</h2>

        <div className="mb-5 flex flex-wrap gap-2">
          {NAMES.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setPreset(name)
                setColors({})
              }}
              className={
                "flex items-center gap-2 rounded-full border px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors " +
                (name === preset
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground")
              }
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{
                  background:
                    "conic-gradient(" +
                    HOLO_CHROME_PRESETS[name].filmA + ", " +
                    HOLO_CHROME_PRESETS[name].filmB + ", " +
                    HOLO_CHROME_PRESETS[name].filmC + ", " +
                    HOLO_CHROME_PRESETS[name].filmA + ")",
                }}
              />
              {name}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border border-border">
          <HoloChromeFlow preset={preset} colors={colors} seed={seed} height="480px" {...values} />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          {SWATCHES.map((key) => (
            <label
              key={key}
              className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
            >
              <input
                type="color"
                value={palette[key]}
                onChange={(e) => setColors((c) => ({ ...c, [key]: e.target.value }))}
                className="h-7 w-7 cursor-pointer rounded-full border border-border bg-transparent p-0"
              />
              {key}
            </label>
          ))}
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
              <span className="w-10 text-right tabular-nums">
                {step >= 1 ? values[key].toFixed(0) : values[key].toFixed(2)}
              </span>
            </label>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            move to tilt the foil · drag to smear · click to drop mercury
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSeed((s) => (s + 1) % 97)}
              className="rounded-full border border-border px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
            >
              new pour
            </button>
            <button
              type="button"
              onClick={() => {
                setValues(DEFAULTS)
                setColors({})
                setSeed(0)
              }}
              className="rounded-full border border-border px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
            >
              reset
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
