"use client"

import HoarfrostPane from "@/components/ui/hoarfrost-pane"

export default function Demo() {
  // w-full matters: 21st centres demos in a flex wrapper, and a flex item
  // left at width:auto shrinks the canvas to 0px wide.
  return (
    <div className="w-full">
      <HoarfrostPane>
        <div className="flex h-full flex-col items-center justify-center px-6 text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-white/55">Night of 14 January</p>
          <h1 className="mt-4 text-5xl font-light tracking-tight text-white/90 [text-shadow:0_1px_24px_rgba(8,14,28,0.6)] sm:text-7xl">
            First frost
          </h1>
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/60">
            Draw a finger across the glass. It freezes over again behind you.
          </p>
        </div>
      </HoarfrostPane>
    </div>
  )
}
