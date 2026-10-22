import React from "react"
import DitherSweepNavbar from "@/components/ui/dither-sweep-navbar"

/** Nothing but the bar, centred, with room below for the panels to open into. */
export default function DitherSweepNavbarDemo() {
  return (
    <div
      className="grid w-full"
      style={{ minHeight: "100svh", alignContent: "center", background: "#f5f5ed" }}
    >
      <DitherSweepNavbar sticky={false} />
    </div>
  )
}
