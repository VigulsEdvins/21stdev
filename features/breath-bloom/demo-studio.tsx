"use client"

import * as React from "react"
import BreathBloom, { BLOOM_PRESETS, type BloomPose, type BloomPreset } from "@/components/ui/breath-bloom"

/**
 * Every knob worth turning, on a boxed bloom — the shape you want behind a
 * card or a section. Pinning a shape reports it back, so you can copy the
 * numbers into your own keyframes.
 */
const NAMES = Object.keys(BLOOM_PRESETS) as BloomPreset[]
const BLENDS = ["lighten", "screen", "plus-lighter", "multiply", "difference"] as const

export default function StudioDemo() {
  const [preset, setPreset] = React.useState<BloomPreset>("ember")
  const [petals, setPetals] = React.useState(6)
  const [duration, setDuration] = React.useState(4)
  const [spin, setSpin] = React.useState(6)
  const [blend, setBlend] = React.useState<(typeof BLENDS)[number] | "preset">("preset")
  const [pin, setPin] = React.useState<BloomPose | null>(null)

  const params = React.useMemo(
    () => ({ petals, duration, spin, ...(blend === "preset" ? {} : { blend }) }),
    [petals, duration, spin, blend],
  )

  const chip = (on: boolean) =>
    "rounded-full border px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors " +
    (on ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground")

  return (
    <div className="min-h-screen w-full bg-background px-5 py-12 text-foreground">
      <div className="mx-auto w-full max-w-3xl">
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.28em] text-muted-foreground">Breath Bloom</p>
        <h2 className="mb-6 text-3xl font-semibold tracking-tight">Grow your own</h2>

        <div className="mb-4 flex flex-wrap gap-2">
          {NAMES.map((name) => (
            <button key={name} type="button" onClick={() => setPreset(name)} className={chip(name === preset)}>
              {name}
            </button>
          ))}
        </div>

        <div className="mb-5 grid grid-cols-1 gap-x-6 gap-y-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground sm:grid-cols-3">
          <label className="flex items-center justify-between gap-3">
            petals {petals}
            <input type="range" min={3} max={12} value={petals} onChange={(e) => setPetals(Number(e.target.value))} className="w-28" />
          </label>
          <label className="flex items-center justify-between gap-3">
            breath {duration}s
            <input type="range" min={2} max={8} step={0.5} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-28" />
          </label>
          <label className="flex items-center justify-between gap-3">
            spin {spin}°/s
            <input type="range" min={-30} max={30} value={spin} onChange={(e) => setSpin(Number(e.target.value))} className="w-28" />
          </label>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {(["preset", ...BLENDS] as const).map((b) => (
            <button key={b} type="button" onClick={() => setBlend(b)} className={chip(b === blend)}>
              {b}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-border p-1">
          <BreathBloom
            preset={preset}
            params={params}
            height="480px"
            onPinChange={setPin}
            className="rounded-xl [clip-path:inset(0_round_0.75rem)]"
          />
        </div>

        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          {pin
            ? "pinned → amplitude " + pin.amplitude.toFixed(2) + " · scale " + pin.scale.toFixed(2)
            : "click the bloom to pin a shape · focus it and use the arrow keys"}
        </p>
      </div>
    </div>
  )
}
