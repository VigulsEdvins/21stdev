"use client"

import TypeRemixPreloader from "@/components/ui/type-remix-preloader"

// Your own word, byline and services, four of the seven takes in your order,
// and a recoloured finale.
export default function DemoShowreel() {
  return (
    <TypeRemixPreloader
      loop
      word="SHOWREEL"
      name="Tomas Ferreira"
      discipline="Motion Direction"
      year="2026"
      period="Reel — Vol. 04"
      handle="tomasferreira.tv"
      roles={["Title Design", "3D", "Animation", "Art Direction"]}
      kicker="Now playing"
      tagline="Selected Motion Work"
      motto="press play"
      takes={["vector", "bubble", "stretch", "cutout"]}
      themes={{
        stretch: { bg: "#ff5a36" },
        cutout: { bg: "#14110f", accent: "#ffe9c7" },
      }}
      durationMs={5200}
    />
  )
}
