import React from "react"
import DitherSweepNavbar from "@/components/ui/dither-sweep-navbar"

/** The pinned mode: scroll down and the bar ducks away, scroll up and it returns. */
export default function DitherSweepNavbarStickyDemo() {
  return (
    <div className="relative w-full" style={{ minHeight: "100svh", background: "#f5f5ed" }}>
      <DitherSweepNavbar />
      <div style={{ height: "220vh" }} />
    </div>
  )
}
