"use client"

import StardustStagePreloader from "@/components/ui/stardust-stage-preloader"

// Your own words and ink: an old-print sepia, sparser dots, no rain.
export default function DemoSepia() {
  return (
    <StardustStagePreloader
      loop
      word="Selene"
      caption="A moon in three movements"
      acts={["Tuning the telescope", "Finding the moon", "Dimming the house lights"]}
      palette={{ stage: "#120d08", ink: "#f1dfc0", dim: "#9a8467" }}
      density={0.8}
      rain={false}
      durationMs={4200}
    />
  )
}
