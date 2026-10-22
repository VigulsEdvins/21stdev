"use client"

import DappledCanopy from "@/components/ui/dappled-canopy"

export default function Demo() {
  // w-full matters: 21st centres every demo in a flex wrapper, and a flex item
  // left at width:auto shrinks to its contents — which for a canvas is 0px.
  return (
    <div className="w-full">
      <DappledCanopy />
    </div>
  )
}
