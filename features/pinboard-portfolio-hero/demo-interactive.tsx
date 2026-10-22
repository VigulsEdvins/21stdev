"use client"

import PinboardPortfolioHero from "@/components/ui/pinboard-portfolio-hero"

/** The board, handled: drag the paper and the pins, drag the wall to pan,
 *  Ctrl/Cmd + wheel to zoom, double-click to put it back. */
export default function DemoInteractive() {
  return <PinboardPortfolioHero interactive />
}
