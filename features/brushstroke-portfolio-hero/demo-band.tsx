"use client"

import BrushstrokePortfolioHero from "@/components/ui/brushstroke-portfolio-hero"

/** `fit="cover"` crops the sheet left and right to fill a short hero band. */
export default function DemoBand() {
  return <BrushstrokePortfolioHero fit="cover" height="26rem" minHeight="260px" />
}
