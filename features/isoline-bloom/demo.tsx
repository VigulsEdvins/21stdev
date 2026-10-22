"use client"

import IsolineBloom from "@/components/ui/isoline-bloom"

export default function Demo() {
  return (
    // w-full matters: 21st centres demos in a flex wrapper, and a flex item
    // left at width:auto shrinks the canvas to 0px wide.
    <div className="relative w-full">
      <IsolineBloom />
    </div>
  )
}
