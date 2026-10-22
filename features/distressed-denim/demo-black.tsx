"use client"

import DistressedDenim from "@/components/ui/distressed-denim"

// Washed black denim, a finer weave and a few more holes.
export default function DemoBlack() {
  return (
    <div className="w-full">
      <DistressedDenim preset="black" thread={2.4} fade={0.7} rips={9} seed={12} />
    </div>
  )
}
