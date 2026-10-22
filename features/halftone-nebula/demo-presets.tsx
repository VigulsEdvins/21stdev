"use client"

import * as React from "react"
import HalftoneNebula, { NEBULA_PRESETS } from "@/components/ui/halftone-nebula"

/**
 * The same sky through five filters, boxed rather than full-bleed — the shape
 * you want behind a card or a section. Pixel size and seed are live, so this
 * is also the customisation surface in miniature.
 */
const NAMES = Object.keys(NEBULA_PRESETS) as (keyof typeof NEBULA_PRESETS)[]

export default function PresetsDemo() {
  const [active, setActive] = React.useState<keyof typeof NEBULA_PRESETS>("crimson")
  const [pixel, setPixel] = React.useState(6)
  const [seed, setSeed] = React.useState(11)
  const params = React.useMemo(() => ({ pixel, seed }), [pixel, seed])

  return (
    <div className="min-h-screen w-full bg-background px-6 py-14 text-foreground">
      <div className="mx-auto w-full max-w-3xl">
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.28em] text-muted-foreground">
          Halftone Nebula
        </p>
        <h2 className="mb-6 text-3xl font-semibold tracking-tight">Five skies</h2>

        <div className="mb-4 flex flex-wrap gap-2">
          {NAMES.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setActive(name)}
              className={
                "rounded-full border px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors " +
                (name === active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground")
              }
            >
              {name}
            </button>
          ))}
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-6 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <label className="flex items-center gap-3">
            pixel {pixel}px
            <input
              type="range"
              min={3}
              max={12}
              value={pixel}
              onChange={(e) => setPixel(Number(e.target.value))}
              className="w-28"
            />
          </label>
          <button
            type="button"
            onClick={() => setSeed((s) => (s * 7 + 13) % 997)}
            className="rounded-full border border-border px-4 py-1.5 hover:text-foreground"
          >
            reshuffle stars
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border">
          <HalftoneNebula preset={active} params={params} height="460px" />
        </div>

        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          move to light the gas · click to hang a star
        </p>
      </div>
    </div>
  )
}
