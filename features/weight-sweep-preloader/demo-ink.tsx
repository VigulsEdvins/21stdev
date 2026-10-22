"use client"

import WeightSweepPreloader from "@/components/ui/weight-sweep-preloader"

// The same specimen on a dark sheet, a narrower sweep and your own lines.
export default function DemoInk() {
  return (
    <WeightSweepPreloader
      loop
      preset="ink"
      weights={[200, 900]}
      label="Halden — Index 2026"
      caption="Preparing the archive"
      message="Welcome in."
      durationMs={4200}
    />
  )
}
