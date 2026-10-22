"use client"

import * as React from "react"
import CausticPool, { CAUSTIC_PRESETS } from "@/components/ui/caustic-pool"

/**
 * The same water under four different skies, boxed rather than full-bleed —
 * the shape you want inside a page. Each pool runs its own simulation, so this
 * is also the honest cost check: four WebGL contexts on one screen.
 */
const NAMES = Object.keys(CAUSTIC_PRESETS) as (keyof typeof CAUSTIC_PRESETS)[]

export default function PresetsDemo() {
  const [active, setActive] = React.useState<keyof typeof CAUSTIC_PRESETS>("deep-ocean")

  return (
    <div className="min-h-screen w-full bg-background px-6 py-14 text-foreground">
      <div className="mx-auto w-full max-w-3xl">
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.28em] text-muted-foreground">
          Caustic Pool
        </p>
        <h2 className="mb-6 text-3xl font-semibold tracking-tight">Four waters</h2>

        <div className="mb-5 flex flex-wrap gap-2">
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
              {name.replace("-", " ")}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border border-border">
          <CausticPool preset={active} height="440px" resolution={256} />
        </div>

        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          drag across the water · it stirs itself when left alone
        </p>
      </div>
    </div>
  )
}
