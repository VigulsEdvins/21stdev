"use client"

import DappledCanopy, { type CanopyPreset } from "@/components/ui/dappled-canopy"

const PRESETS: CanopyPreset[] = ["apricot", "golden-hour", "sage-morning", "noon-plaster", "lilac-dusk", "moonlit"]

export default function DemoPresets() {
  return (
    <div className="grid w-full grid-cols-1 gap-3 bg-background p-3 sm:grid-cols-2 lg:grid-cols-3">
      {PRESETS.map((preset) => (
        <div key={preset} className="relative w-full overflow-hidden rounded-2xl">
          <DappledCanopy preset={preset} height="clamp(15rem, 44svh, 26rem)" />
          <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/25 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-white/85 backdrop-blur-sm">
            {preset}
          </span>
        </div>
      ))}
    </div>
  )
}
