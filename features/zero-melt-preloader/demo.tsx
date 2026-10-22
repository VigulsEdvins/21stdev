"use client"

import * as React from "react"
import ZeroMeltPreloader from "@/components/ui/zero-melt-preloader"

const settings = {
  prompt: "Draw a zero",
  hint: "Trace a full circle to melt your way in",
  tolerance: 0.6,
  brush: 0.075,
  loadMs: 900,
  reward: "+100 XP",
  baseColor: "#1d6b52",
  frostColor: "#9fd8c0",
  meltColor: "#48c257",
  glowColor: "#eafff4",
}

export default function Demo(props: Partial<typeof settings>) {
  const s = { ...settings, ...props }

  return (
    <div className="h-[100svh] min-h-[600px] w-full">
      <ZeroMeltPreloader
        prompt={s.prompt}
        hint={s.hint}
        tolerance={s.tolerance}
        brush={s.brush}
        loadMs={s.loadMs}
        reward={s.reward}
        baseColor={s.baseColor}
        frostColor={s.frostColor}
        meltColor={s.meltColor}
        glowColor={s.glowColor}
      >
        <div
          className="flex h-full w-full flex-col items-center justify-center gap-4 px-6 text-center"
          style={{
            background:
              "radial-gradient(120% 90% at 30% 15%, #1a5f4a 0%, #0d3b30 45%, #06211c 100%)",
          }}
        >
          <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-emerald-300/70">
            Unlocked
          </span>
          <h2 className="max-w-md text-balance text-4xl font-light tracking-tight text-white sm:text-5xl">
            Everything starts at zero.
          </h2>
          <p className="max-w-sm text-sm text-emerald-100/60">
            The ice is gone. Whatever you wrap renders here, untouched.
          </p>
        </div>
      </ZeroMeltPreloader>
    </div>
  )
}
