"use client"

import RakedSandGarden from "@/components/ui/raked-sand-garden"

export default function Demo() {
  // w-full matters: 21st centres demos in a flex wrapper, and a flex item
  // left at width:auto shrinks the canvas to 0px wide.
  return (
    <div className="w-full">
      <RakedSandGarden>
        <p className="absolute bottom-5 left-5 rounded-full bg-stone-900/80 px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.24em] text-stone-100 dark:bg-stone-100/85 dark:text-stone-900">
          Drag to rake
        </p>
      </RakedSandGarden>
    </div>
  )
}
