"use client"

import AnimatorTitlePreloader from "@/components/ui/animator-title-preloader"

// On the light table: animation paper, a cobalt sweater and blue-pencil roughs.
export default function DemoPaper() {
  return (
    <AnimatorTitlePreloader
      loop
      preset="paper"
      kicker="A Motion"
      title="Sketchbook"
      connector="by"
      name="Leo Marchetti"
      meta="Pencil tests · 2026"
      scene="Sc. 02 — Light table"
      seed={23}
    />
  )
}
