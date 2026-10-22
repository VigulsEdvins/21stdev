"use client"

import CoquetteDesktopPortfolio from "@/components/ui/coquette-desktop-portfolio"

// Opens straight onto the About Me window, with a blush wallpaper.
export default function DemoAbout() {
  return <CoquetteDesktopPortfolio openOnLoad="about" wallpaper="blush" />
}
