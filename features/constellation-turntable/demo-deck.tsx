"use client"

import ConstellationTurntable, { type ConstellationTrack } from "@/components/ui/constellation-turntable"

// The whole deck, pressed on oxblood vinyl with a winter sky.
const tracks: ConstellationTrack[] = [
  { title: "Orion", duration: 236, angle: -140, root: 98 },
  { title: "Cassiopeia", duration: 198, angle: -40, root: 130.81 },
  { title: "Lyra", duration: 174, angle: 12, root: 110 },
  { title: "Cygnus", duration: 252, angle: 160, root: 87.31 },
  { title: "Andromeda", duration: 210, angle: -95, root: 146.83 },
]

export default function DemoDeck() {
  return (
    <ConstellationTurntable
      framing="full"
      tracks={tracks}
      title="Side B"
      subtitle="Winter Sky"
      defaultRpm={45}
      seed={21}
      density={1.2}
      palette={{
        background: "#140d10",
        vinyl: "#6b1d2a",
        deadWax: "#2a0f16",
        groove: "#a13a4a",
        label: "#f3e9dc",
        labelInk: "#6b1d2a",
        planet: "#f2c46d",
        accent: "#ffcf6e",
        armShade: "#e2c9b8",
        screw: "#c0563f",
      }}
    />
  )
}
