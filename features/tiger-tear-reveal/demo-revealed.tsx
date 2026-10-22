"use client"

import TigerTearReveal from "@/components/ui/tiger-tear-reveal"

// Fully torn, no scroll needed: move the pointer and the eyes follow it.
export default function DemoRevealed() {
  return (
    <div className="w-full">
      <TigerTearReveal progress={1} />
    </div>
  )
}
