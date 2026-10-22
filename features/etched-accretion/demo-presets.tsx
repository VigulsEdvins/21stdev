"use client"

import * as React from "react"
import EtchedAccretion, { type AccretionPreset } from "@/components/ui/etched-accretion"

const PRESETS: AccretionPreset[] = ["crimson", "ember", "glacier", "ash", "orchid"]

export default function DemoPresets() {
  const [preset, setPreset] = React.useState<AccretionPreset>("crimson")
  const [grain, setGrain] = React.useState(1)
  const [crimson, setCrimson] = React.useState(0.62)
  const params = React.useMemo(() => ({ grain, crimson }), [grain, crimson])

  return (
    <div className="relative w-full">
      <EtchedAccretion preset={preset} params={params} height="100svh">
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-center gap-4 p-6">
          <div className="flex gap-1 rounded-full border border-white/15 bg-black/50 p-1 backdrop-blur">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPreset(p)}
                className={
                  "rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors motion-reduce:transition-none " +
                  (preset === p ? "bg-white text-black" : "text-white/60 hover:text-white")
                }
              >
                {p}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 rounded-full border border-white/15 bg-black/50 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/60 backdrop-blur">
            grain
            <input type="range" min={0} max={2} step={0.05} value={grain}
              onChange={(e) => setGrain(Number(e.target.value))} className="w-24 accent-white" />
          </label>
          <label className="flex items-center gap-2 rounded-full border border-white/15 bg-black/50 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/60 backdrop-blur">
            bands
            <input type="range" min={0} max={1} step={0.01} value={crimson}
              onChange={(e) => setCrimson(Number(e.target.value))} className="w-24 accent-white" />
          </label>
        </div>
      </EtchedAccretion>
    </div>
  )
}
