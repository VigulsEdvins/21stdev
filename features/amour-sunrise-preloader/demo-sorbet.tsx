"use client"

import AmourSunrisePreloader from "@/components/ui/amour-sunrise-preloader"

// Your own word and colours: a tomato sun on butter paper, with a finer pen.
export default function DemoSorbet() {
  return (
    <AmourSunrisePreloader
      loop
      word="Ciao!"
      caption="fresh out of the oven"
      weight={0.85}
      fan={1.3}
      palette={{ paper: "#fbefc9", ink: "#d2361f", sun: "#ff7a3d", core: "#c42a12", glow: "#fff4d6" }}
    />
  )
}
