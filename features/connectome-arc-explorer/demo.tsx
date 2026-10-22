"use client"

import ConnectomeArcExplorer from "@/components/ui/connectome-arc-explorer"

export default function Demo() {
  // w-full is load-bearing: 21st centres every demo in a flex wrapper, and a
  // flex item left at width:auto shrinks to its contents.
  return (
    <div className="w-full bg-background px-3 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-[1240px]">
        <ConnectomeArcExplorer defaultSelected="PAM" defaultExpanded={["PAM", "KC"]} />
      </div>
    </div>
  )
}
