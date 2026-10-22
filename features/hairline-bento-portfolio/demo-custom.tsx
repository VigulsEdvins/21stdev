"use client"

import HairlineBentoPortfolio from "@/components/ui/hairline-bento-portfolio"

// Someone else's page: a product designer in Lisbon, booked up, orange dot,
// cooler paper, and a waitlist that hands its entries to your own backend.
export default function DemoCustom() {
  return (
    <HairlineBentoPortfolio
      name="Ari Okafor"
      role="Product Designer · Writer"
      location="Lisbon"
      timeZone="Europe/Lisbon"
      available={false}
      badges={["Booked until March", "Lisbon / Remote"]}
      ringText="Shipping interfaces for small, careful teams"
      email="ari@example.com"
      accent="#f97316"
      paper="#e4e6df"
      findMe={{ label: "Writing", title: "Substack", description: "Essays on interface craft, every other Sunday.", cta: "Read the latest", href: "https://substack.com" }}
      connect={{ label: "Read.cv", title: "The long version", description: "Roles, side projects and the odd talk." }}
      about={{
        headline: ["9 years in product.", "4 teams built from zero."],
        body: "I design the parts of software people touch every day — onboarding, settings, the empty states nobody plans for. Before that: type design, a bakery, and a very long bike trip.",
      }}
      product={{ label: "Kit", title: "Empty State Kit", description: "48 Figma frames for the screens before the data arrives.", cta: "Get the kit" }}
      art={{ label: "Photography", title: "Film Diary", description: "Half-frame rolls from wherever I am.", cta: "@ari.halfframe" }}
      offer={{
        label: "Opening soon",
        title: "Design\nreviews",
        description: "Async Loom reviews of your flows within 48 hours. Two slots a week.",
        tags: ["Onboarding", "Pricing pages", "Design systems"],
        cta: "Save me a slot",
        footnote: "Reviews — 2 per week",
        spots: { left: 0, total: 2 },
      }}
      newsletter={{ label: "Letters", title: "Notes from the margin", description: "One letter a month: what I shipped, what I scrapped, and why." }}
      onJoinWaitlist={({ email, topics }) => console.log("waitlist", email, topics)}
      onSubscribe={(email) => console.log("subscribe", email)}
    />
  )
}
