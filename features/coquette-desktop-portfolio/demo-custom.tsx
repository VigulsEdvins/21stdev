"use client"

import CoquetteDesktopPortfolio from "@/components/ui/coquette-desktop-portfolio"

// Your own name, colours, folders and copy — the whole template is props.
export default function DemoCustom() {
  return (
    <CoquetteDesktopPortfolio
      name="Mira Sol"
      eyebrow="hello, this is my"
      headline="studio"
      accent="#c9d8f2"
      deep="#1f3a68"
      wallpaper="dots"
      email="mira@example.com"
      openOnLoad="apps"
      about={{
        title: "hi, I'm mira",
        paragraphs: [
          "I design and build small, careful products — mobile apps, dashboards and the odd weird website.",
          "Currently freelancing from Lisbon and always up for something new.",
        ],
      }}
      folders={[
        {
          id: "apps",
          label: "apps",
          title: "Mobile Apps",
          style: "blush",
          x: 18,
          y: 60,
          projects: [
            { name: "Tide", year: "2026", role: "Product design", tags: ["iOS", "Design"], description: "A surf forecast that reads like a postcard." },
            { name: "Pantry", year: "2025", role: "Design + build", tags: ["React Native"], description: "Groceries that remember what you ran out of." },
          ],
        },
        {
          id: "dashboards",
          label: "dashboards",
          style: "noir",
          x: 80,
          y: 16,
          projects: [{ name: "Signal", year: "2025", tags: ["React", "Design"], description: "Analytics for people who hate analytics." }],
        },
        {
          id: "experiments",
          label: "experiments",
          style: "bows",
          x: 82,
          y: 60,
          projects: [{ name: "Paper Garden", year: "2024", tags: ["WebGL"], url: "https://example.com", description: "Grow a folded-paper garden in your browser." }],
        },
      ]}
      skills={["Figma", "SwiftUI", "React Native", "TypeScript", "WebGL"]}
      now={["Designing a type-first weather app", "Learning Rive", "Swimming twice a week"]}
      song={{ title: "blue hour", artist: "music box · made in code" }}
    />
  )
}
