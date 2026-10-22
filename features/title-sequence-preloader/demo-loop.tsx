"use client"

import TitleSequencePreloader from "@/components/ui/title-sequence-preloader"

// The reel on its own, forever: every shot, the lift-off, and round again.
export default function DemoLoop() {
  return (
    <div className="w-full">
      <TitleSequencePreloader loop />
    </div>
  )
}
