"use client"

import QuietPortfolioTemplate from "@/components/ui/quiet-portfolio-template"

// Everything is a prop. A different person, dark by default, a cooler accent,
// and a monogram in place of the drawn portrait.
export default function DemoCustom() {
  return (
    <QuietPortfolioTemplate
      name="Maya"
      fullName="Maya Okafor"
      tagline="I design calm software for loud problems."
      location="Lisbon"
      email="maya@example.com"
      status="Booking for November"
      accent="#3b82f6"
      defaultTheme="dark"
      timeZone="Europe/Lisbon"
      avatar={
        <svg width={56} height={56} viewBox="0 0 56 56" role="img" aria-label="Maya Okafor">
          <rect width="56" height="56" fill="#1e3a8a" />
          <circle cx="44" cy="12" r="18" fill="#3b82f6" />
          <text x="28" y="35" textAnchor="middle" fontSize="20" fontWeight="600" fill="#fff" fontFamily="ui-sans-serif,system-ui,sans-serif">
            MO
          </text>
        </svg>
      }
      currentRole={{ title: "Design Engineer", company: "Tern", period: "2023 – Present", location: "Remote" }}
      previousRoles={[
        { title: "Product Designer", company: "Harbor", period: "2020 – 2023", location: "Lisbon" },
        { title: "UI Designer", company: "Freelance", period: "2018 – 2020", location: "Lagos" },
      ]}
      about={
        <>
          <p>I sit between design and engineering and translate in both directions.</p>
          <p>Most of my work is making dense tools feel light: fewer modes, better defaults, and motion that explains instead of decorates.</p>
        </>
      }
      projects={[
        { name: "Tidepool", description: "A design-token pipeline that ships to four platforms from one file.", year: "2026", tags: ["Tokens", "CLI"], hue: 210 },
        { name: "Quiet Hours", description: "Notification batching for teams across time zones.", year: "2025", tags: ["Product"], hue: 170 },
        { name: "Grain", description: "A tiny film-grain shader for the web.", year: "2024", tags: ["WebGL"], href: "https://github.com" },
      ]}
      essays={[
        {
          slug: "defaults-are-design",
          title: "Defaults are the design",
          date: "2026-06-03",
          summary: "Ninety percent of people never open settings.",
          body: [
            "Ninety percent of people never open the settings page. Whatever you ship as the default is the product.",
            "## So choose",
            "- Pick the option you would pick for a friend.",
            "- Make the other options findable, not loud.",
            "> A good default is an opinion with an exit.",
          ],
        },
        {
          slug: "motion-should-explain",
          title: "Motion should explain",
          date: "2025-10-18",
          body: ["If an animation cannot answer the question 'where did that come from?', it is decoration. Decoration is fine, but it should be cheap."],
        },
      ]}
      socials={[
        { label: "GitHub", href: "https://github.com" },
        { label: "Dribbble", href: "https://dribbble.com" },
      ]}
    />
  )
}
