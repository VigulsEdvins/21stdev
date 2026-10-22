"use client"

import * as React from "react"
import DitherCumulus, { CUMULUS_PRESETS } from "@/components/ui/dither-cumulus"

/**
 * The same sky in six weathers, boxed rather than full-bleed — the shape you
 * want behind a card or a section. Cell size, dither matrix, coverage and wind
 * are live, so this is also the customisation surface in miniature.
 */
const NAMES = Object.keys(CUMULUS_PRESETS) as (keyof typeof CUMULUS_PRESETS)[]
const DITHERS = [0, 2, 4, 8]

export default function PresetsDemo() {
  const [active, setActive] = React.useState<keyof typeof CUMULUS_PRESETS>("nocturne")
  const [pixel, setPixel] = React.useState(3)
  const [dither, setDither] = React.useState(4)
  const [coverage, setCoverage] = React.useState<number | null>(null)
  const [seed, setSeed] = React.useState<number | null>(null)

  const params = React.useMemo(() => {
    const p: Record<string, number> = { pixel, dither }
    if (coverage !== null) p.coverage = coverage
    if (seed !== null) p.seed = seed
    return p
  }, [pixel, dither, coverage, seed])

  return (
    <div className="min-h-screen w-full bg-background px-6 py-14 text-foreground">
      <div className="mx-auto w-full max-w-3xl">
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.28em] text-muted-foreground">Dither Cumulus</p>
        <h2 className="mb-6 text-3xl font-semibold tracking-tight">Six weathers</h2>

        <div className="mb-4 flex flex-wrap gap-2">
          {NAMES.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setActive(name)
                setCoverage(null)
                setSeed(null)
              }}
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

        <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <label className="flex items-center gap-3">
            cell {pixel}px
            <input type="range" min={1} max={8} value={pixel} onChange={(e) => setPixel(Number(e.target.value))} className="w-24" />
          </label>
          <label className="flex items-center gap-3">
            cover
            <input
              type="range"
              min={0.2}
              max={0.9}
              step={0.01}
              value={coverage ?? 0.4}
              onChange={(e) => setCoverage(Number(e.target.value))}
              className="w-24"
            />
          </label>
          <span className="flex items-center gap-1">
            bayer
            {DITHERS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDither(d)}
                className={
                  "ml-1 rounded border px-2 py-0.5 " +
                  (d === dither ? "border-foreground text-foreground" : "border-border hover:text-foreground")
                }
              >
                {d === 0 ? "off" : d + "×" + d}
              </button>
            ))}
          </span>
          <button
            type="button"
            onClick={() => setSeed((s) => ((s ?? 7) * 7 + 13) % 997)}
            className="rounded-full border border-border px-4 py-1.5 hover:text-foreground"
          >
            new sky
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border">
          <DitherCumulus preset={active} params={params} height="460px" />
        </div>

        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          hover to move the light · drag to scrub · click for a gust
        </p>
      </div>
    </div>
  )
}
