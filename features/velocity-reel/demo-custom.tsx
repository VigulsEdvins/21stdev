"use client"

import VelocityReel, { type ReelChapter } from "@/components/ui/velocity-reel"

// A shorter cut in a different grade: electric blue for the fast things, warm
// back-light, and a custom mark for the last frame instead of the star.
const chapters: ReelChapter[] = [
  { scene: "portrait", kicker: "Driver 07", title: "BREATHE", line: "Lights out in ninety seconds." },
  { scene: "car", kicker: "Lap one", title: "LAUNCH", line: "Zero to everything.", cut: "flash" },
  { scene: "formula", kicker: "Sector three", title: "COMMIT", line: "Brake later than you believe." },
  { scene: "burst", kicker: "Final lap", title: "OVERDRIVE", cut: "flash" },
  { scene: "emblem", kicker: "Season 2026", title: "PIT WALL", line: "See you on the grid." },
]

// A chevron, drawn in the component's 200×200 emblem box.
const CHEVRON = "M20 40 L110 40 L180 100 L110 160 L20 160 L90 100 Z"

export default function DemoCustom() {
  return (
    <div className="w-full">
      <VelocityReel
        chapters={chapters}
        accent="#2f7bff"
        rim="#ffd2a6"
        emblem={CHEVRON}
        chapterScroll={1.2}
        reelSeconds={30}
      />
    </div>
  )
}
