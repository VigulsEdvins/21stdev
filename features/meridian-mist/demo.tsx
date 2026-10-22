"use client"

import MeridianMist from "@/components/ui/meridian-mist"

export default function Demo() {
  return (
    // w-full matters: 21st centres demos in a flex wrapper, and a flex item
    // left at width:auto shrinks the mist to 0px wide.
    <div className="relative w-full">
      <MeridianMist />
    </div>
  )
}
