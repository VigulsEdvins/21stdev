"use client"

import * as React from "react"
import MeridianMist, { MIST_PRESETS } from "@/components/ui/meridian-mist"

const PRESETS = Object.keys(MIST_PRESETS)

export default function DemoStudio() {
  const [preset, setPreset] = React.useState("glacier")

  return (
    <div className="relative w-full">
      <MeridianMist preset={preset}>
        <header className="flex items-center justify-between px-6 pt-6 font-mono text-[11px] uppercase tracking-[0.2em] text-white/80 sm:px-10">
          <span>Meridian / Studio</span>
          <span className="hidden sm:inline">Grid 02 — Light study</span>
        </header>

        <div className="mt-auto px-6 pb-8 sm:px-10 sm:pb-12">
          <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-white/70">
            Brand systems for quiet companies
          </p>
          <h1 className="max-w-3xl text-5xl font-light leading-[0.95] tracking-tight text-white sm:text-7xl">
            Drawn on the grid.
            <br />
            Softened by light.
          </h1>

          <div className="pointer-events-auto mt-8 flex flex-wrap gap-2">
            {PRESETS.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setPreset(name)}
                aria-pressed={preset === name}
                className={
                  "rounded-full border px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] backdrop-blur-sm transition-colors " +
                  (preset === name
                    ? "border-white bg-white text-slate-900"
                    : "border-white/40 bg-white/5 text-white hover:bg-white/15")
                }
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </MeridianMist>
    </div>
  )
}
