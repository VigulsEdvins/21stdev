"use client"

import SlatCountPreloader from "@/components/ui/slat-count-preloader"

// Your own frames, colours and type: a countdown in vermilion on black that
// lands on a word, with slimmer, quicker slats.
export default function DemoCountdown() {
  return (
    <SlatCountPreloader
      loop
      preset="ink"
      sequence={["5", "4", "3", "2", "1", "GO!"]}
      digits={3}
      pad={false}
      slatRatio={2.4}
      speed={440}
      stepMs={900}
      label="Night Edition — Run 05"
      caption="Doors open in five. Sequence frames take numbers and A–Z."
    />
  )
}
