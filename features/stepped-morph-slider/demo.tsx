"use client"

import SteppedMorphSlider from "@/components/ui/stepped-morph-slider"

export default function Demo() {
  // Colours come from the page's tokens so the slider follows the theme.
  return (
    <div className="w-full">
      <SteppedMorphSlider
        background="var(--bg, #f6f5f2)"
        ink="var(--text, #121212)"
        muted="color-mix(in srgb, var(--text, #121212) 50%, transparent)"
        accent="var(--accent, #121212)"
      />
    </div>
  )
}
