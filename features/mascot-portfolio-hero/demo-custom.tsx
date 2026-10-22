"use client"

import MascotPortfolioHero from "@/components/ui/mascot-portfolio-hero"

export default function DemoCustom() {
  return (
    <MascotPortfolioHero
      year="2027"
      initials="KN"
      badge="Say hello"
      line3="Studio"
      word="Case"
      bracketed="S"
      verticalTag="Motion"
      seekingLabel="Available*"
      seeking="Product / 3D"
      href="#contact"
      services={["Product design", "Motion", "3D characters", "Design systems"]}
      greetings={["Hey! Over here.", "Want to see the case studies?", "Beanie stays on. Always."]}
      accent="#f2b33d"
      paper="#efe9df"
      skin="#e9b48f"
      beanie="#2f3d8f"
      shirt="#1f2a5c"
      tag="#f2b33d"
    />
  )
}
