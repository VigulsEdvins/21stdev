"use client"

import TornPostcardPortfolio from "@/components/ui/torn-postcard-portfolio"

// Your own name, copy, work and colours — the whole template is props.
export default function DemoCustom() {
  return (
    <TornPostcardPortfolio
      name="Mira Sol"
      role="Photographer & art director"
      location="Tromsø, Norway"
      since="2016"
      headline={["Where does the light", "go in winter?"]}
      intro="Editorial and travel photography from the far north, mostly before breakfast."
      email="mira@example.com"
      labels={["Hello", "Letter", "Prints", "Journey", "Post"]}
      workTitle="Prints — polar notes"
      routeTitle="The long way north"
      contactTitle="Send a letter north"
      palette={{ navy: "#2a3c4f", deep: "#16222e", fog: "#d9d3c7", accent: "#9a4f2e", tape: "#d6b3a8" }}
      about={{
        title: "Greetings",
        subtitle: "Notes from a cabin with a very slow kettle",
        text: "Most of my work happens in the blue hour, when the snow turns the colour of ink. I shoot for magazines, hotels and the odd stubborn reindeer herder, and I print everything on paper before I believe it.",
        facts: [
          { label: "Based in", value: "Tromsø, Norway" },
          { label: "Shooting", value: "Editorial, travel, interiors" },
          { label: "Clients", value: "Kinfolk, Hurtigruten, Arket" },
          { label: "Booking", value: "From January" },
        ],
        skills: ["Medium format", "Film", "Lightroom", "Art direction"],
      }}
      projects={[
        { name: "Blue Hour", year: "2026", role: "Series", scene: "night", note: "forty minutes of blue", tags: ["Editorial"], description: "A month of photographs taken only in the forty minutes after sunset." },
        { name: "Swan Lake", year: "2025", role: "Commission", scene: "lake", note: "the lake that never freezes", tags: ["Travel"], description: "Whooper swans on a spring-fed lake, for a nature magazine's winter issue." },
        { name: "Copper Valley", year: "2024", role: "Book", scene: "river", note: "larch in October", tags: ["Print", "Book"], description: "A photobook about the week the larches turn, printed in two colours.", url: "https://example.com" },
      ]}
      route={[
        { year: "2016", title: "First camera", place: "Bergen", text: "A borrowed Pentax and a lot of fog." },
        { year: "2019", title: "Staff photographer", place: "Oslo", text: "Three years of weddings, food and the occasional royal." },
        { year: "2023", title: "Moved north", place: "Tromsø", text: "Traded the city for the polar night and never looked back." },
      ]}
      links={[
        { label: "Instagram", url: "https://instagram.com" },
        { label: "Behance", url: "https://behance.net" },
      ]}
    />
  )
}
