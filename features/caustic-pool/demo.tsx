"use client"

import CausticPool from "@/components/ui/caustic-pool"

export default function Demo() {
  return (
    // w-full is not decoration: 21st centres every demo inside a
    // `flex justify-center items-center` wrapper, and a flex item left at
    // width:auto shrinks to fit its contents. The pool asks for 100% of this
    // div, this div asks its contents how wide they are — and the whole thing
    // resolves to 0px wide. Same trap as h-full, one axis over.
    <div className="relative w-full">
      <CausticPool preset="deep-ocean" resolution={512} touch="draw" />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.34em] text-white/45">
          stir the water
        </p>
      </div>
    </div>
  )
}
