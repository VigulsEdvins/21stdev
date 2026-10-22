"use client"

import DesignProcessTemplate from "@/components/ui/design-process-template"

// Someone else's case study: a studio's rebrand for a coffee roaster, told in
// three phases, with a warm accent, a pen in the headline and a booking link.
export default function DemoCustom() {
  return (
    <DesignProcessTemplate
      eyebrow="Case study — Northbound Roasters"
      headline="Rebranding a roaster meant tasting a lot of coffee {icon} and throwing away more sketches than we kept."
      icon="pen"
      iconHref="https://cal.com"
      iconLabel="Book a call"
      intro="Twelve weeks, three people, one very patient client. Here is where the time went."
      roles={["Creative lead", "Designer", "Strategist"]}
      accent="#e4572e"
      allocationLabel="Twelve weeks, split"
      phases={[
        {
          name: "Listen",
          percent: 20,
          tags: ["Interviews", "Café visits", "Audit"],
          description: "We spent a fortnight behind the counter, talking to baristas and regulars about what the old brand got wrong.",
          roles: ["Strategist", "Creative lead"],
          glyph: "search",
        },
        {
          name: "Sketch",
          percent: 35,
          tags: ["Wordmark", "Packaging", "Interviews", "Colour"],
          description: "Two hundred thumbnails, nine routes, three presented. The one that won was drawn on a napkin.",
          roles: ["Designer", "Creative lead"],
          glyph: "spark",
        },
        {
          name: "Ship",
          percent: 45,
          tags: ["Guidelines", "Packaging", "Signage", "Website"],
          description: "Bags, cups, a storefront and a site, plus a forty-page guide so the next designer doesn't have to guess.",
          glyph: "layers",
        },
      ]}
      onRoleChange={(role) => console.log("role", role)}
      onTagSelect={(tag) => console.log("tag", tag)}
    />
  )
}
