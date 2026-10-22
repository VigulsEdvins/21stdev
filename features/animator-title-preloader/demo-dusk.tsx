"use client"

import AnimatorTitlePreloader from "@/components/ui/animator-title-preloader"

// Night shift: teal sweaters, warm hands, a yellow-pencil rough on midnight.
export default function DemoDusk() {
  return (
    <AnimatorTitlePreloader
      loop
      preset="dusk"
      kicker="Selected Works"
      title="Showreel"
      connector="by"
      name="Mira Okafor"
      meta="Stop motion · 2D · 2026"
      scene="Sc. 04 — Night shift"
      frames={240}
      seed={4}
    />
  )
}
