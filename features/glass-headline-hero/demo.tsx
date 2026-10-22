"use client"

import GlassHeadlineHero from "@/components/ui/glass-headline-hero"

export default function Demo() {
  return (
    <GlassHeadlineHero
      eyebrow="Lumen 2.0 is here"
      title="Bend the light"
      description="Interfaces that feel crafted, not assembled. Lumen turns your design tokens into production UI in an afternoon."
      primaryAction={{ label: "Start for free", href: "#" }}
      secondaryAction={{ label: "Watch the film", href: "#" }}
    />
  )
}
