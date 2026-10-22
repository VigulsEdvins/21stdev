"use client"

import DistressedDenim from "@/components/ui/distressed-denim"

export default function Demo() {
  // w-full matters: 21st centres demos in a flex wrapper, and a flex item
  // left at width:auto shrinks the canvas to 0px wide.
  return (
    <div className="w-full">
      <DistressedDenim rips={7} />
    </div>
  )
}
