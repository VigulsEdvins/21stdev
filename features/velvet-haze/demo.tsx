"use client"

import VelvetHaze from "@/components/ui/velvet-haze"

export default function Demo() {
  return (
    // w-full matters: 21st centres demos in a flex wrapper, and a flex item
    // left at width:auto shrinks the haze to 0px wide.
    <div className="relative w-full">
      <VelvetHaze />
    </div>
  )
}
