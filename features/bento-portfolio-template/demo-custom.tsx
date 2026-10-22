"use client"

import BentoPortfolioTemplate from "@/components/ui/bento-portfolio-template"

// Everything is a prop. A different person and city, dark by default, a cooler
// accent, a monogram instead of the drawn portrait, and fewer sections: leave a
// list empty (or pass null) and its card disappears.
export default function DemoCustom() {
  return (
    <BentoPortfolioTemplate
      name="Aiko Tanaka"
      role="Design Engineer"
      company="Kumo"
      previously="Mercari"
      handle="aiko.dev"
      email="aiko@example.com"
      accent="#4f7cff"
      defaultTheme="dark"
      bio="I build interfaces in code first: motion systems, design tokens and the small interactions that make a product feel considered."
      avatar={
        <svg width={116} height={116} viewBox="0 0 116 116" role="img" aria-label="Aiko Tanaka">
          <rect width="116" height="116" fill="#1f2b5c" />
          <circle cx="92" cy="22" r="44" fill="#4f7cff" />
          <text x="58" y="70" textAnchor="middle" fontSize="38" fontWeight="600" fill="#fff" fontFamily="ui-sans-serif,system-ui,sans-serif">
            AT
          </text>
        </svg>
      }
      voiceNote={{
        transcript:
          "Hi, I'm Aiko. I write the code behind interfaces that feel calm. If your team needs someone who speaks both design and engineering, let's talk.",
      }}
      availability={{ label: "Booked until January", status: "busy", note: "Waitlist open for Q1" }}
      experience={[
        { company: "Freelance", year: "2017", role: "Web developer" },
        { company: "Mercari", year: "2019", role: "Frontend engineer" },
        { company: "Mercari", year: "2021", role: "Design engineer" },
        { company: "Kumo", year: "2023 – Now", role: "Design engineer, platform" },
      ]}
      tracks={[
        { title: "Blue Hour", artist: "Saya Lin", duration: 198, color: "#2f3e74" },
        { title: "Static Bloom", artist: "Okra", duration: 176, color: "#efe6d2" },
      ]}
      books={[{ title: "A Pattern Language", author: "Christopher Alexander", progress: 0.3, color: "#2d4a3e" }]}
      location={{
        city: "Tokyo",
        timeZone: "Asia/Tokyo",
        labels: [
          { text: "SHIBUYA", x: 26, y: 210 },
          { text: "SHINJUKU", x: 18, y: 70 },
          { text: "Minato", x: 196, y: 250 },
        ],
      }}
      moments={[
        { caption: "Coffee and a sketchbook", emoji: "☕", scene: "coffee" },
        { caption: "Weekend trail runs", emoji: "⛰️", scene: "mountains" },
      ]}
      steps={[
        { title: "Audit", description: "I read your codebase and your Figma side by side and write down where they disagree." },
        { title: "Tokens", description: "One source of truth for colour, type, space and motion, shipped to every platform you support." },
        { title: "Components", description: "Accessible, documented components your team can extend without asking me." },
      ]}
      projects={[
        { title: "Kumo Motion", client: "Kumo", year: "2025", kind: "web", hue: 228, tags: ["Motion", "Tokens"], description: "A motion system with five curves and three durations, used across web and native." },
        { title: "Shelf", client: "Side project", year: "2024", kind: "app", hue: 190, tags: ["iOS", "SwiftUI"], description: "A reading tracker that only asks one question a day.", href: "https://example.com" },
      ]}
      testimonials={[]}
      stats={[
        { value: 8, label: "Years shipping UI" },
        { value: 120, suffix: "+", label: "Components in production" },
      ]}
      tools={["React", "TypeScript", "SwiftUI", "Figma", "Rive", "Storybook", "Vite", "Framer Motion"]}
      posts={[]}
      socials={[
        { label: "GitHub", href: "https://github.com", handle: "aiko" },
        { label: "X", href: "https://x.com", handle: "@aiko_dev" },
      ]}
    />
  )
}
