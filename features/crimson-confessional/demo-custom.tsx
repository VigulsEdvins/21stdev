"use client"

import CrimsonConfessional, { type Chapter } from "@/components/ui/crimson-confessional"

// Any number of chapters, any motif, in any order. Three beats, told faster.
const CHAPTERS: Chapter[] = [
  { word: "OFFER", line: "It was free. That was the tell.", motif: "beam" },
  { word: "TERMS", line: "You accepted on page nine.", motif: "flood", censor: true },
  { word: "SOLD", line: "Not the product. Never the product.", motif: "void" },
]

export default function Demo() {
  return (
    <div className="w-full">
      <CrimsonConfessional
        chapters={CHAPTERS}
        chapterScroll={1}
        crimson="#ff2d2d"
        oxblood="#2a0510"
        grain={0.22}
      />
    </div>
  )
}
