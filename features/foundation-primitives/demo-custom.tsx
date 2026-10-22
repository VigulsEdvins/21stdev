"use client"

import * as React from "react"
import FoundationPrimitives, { type FoundationItem } from "@/components/ui/foundation-primitives"

// Your own primitives: other shapes and palettes, with the selection lifted out.
const ITEMS: FoundationItem[] = [
  { label: "Radius", shape: "cube", colors: ["#14b8a6", "#b8f3e8"], tile: "disc" },
  { label: "Elevation", shape: "torus", colors: ["#f43f5e", "#fecdd3"], tile: "square" },
  { label: "Motion", shape: "pill", colors: ["#eab308", "#fef08a"], tile: "square" },
  { label: "Color", shape: "sphere", colors: ["#6366f1", "#c7d2fe"], tile: "none" },
]

export default function DemoCustom() {
  const [picked, setPicked] = React.useState<number | null>(1)
  return (
    <div className="w-full">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-8 sm:py-16">
        <FoundationPrimitives items={ITEMS} selected={picked} onSelect={setPicked} glow={0.8} shadow={0.7} />
      </div>
    </div>
  )
}
