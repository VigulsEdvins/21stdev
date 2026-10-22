"use client"

import StickerHelloPortfolio from "@/components/ui/sticker-hello-portfolio"

// Someone else's site: a motion designer in Lisbon with their own puns, a
// warmer paper, a tangerine accent, two projects and no sticker sheet.
export default function Demo() {
  return (
    <StickerHelloPortfolio
      greeting="Olá, I’m"
      name="Rio."
      fullName="Rio Castanho"
      stickers={[
        { lines: ["Like the city", "Not the movie", "OK, a bit like the movie"], shape: "circle", color: "#9ee6c3", x: 54, y: 4, rotate: -12, size: 0.6 },
        { lines: ["Moves things", "Frame by frame"], shape: "pill", color: "#ffb38a", x: 88, y: 94, rotate: 8, size: 0.78 },
      ]}
      bio="I’m a motion designer in Lisbon who makes logos wiggle, charts dance and onboarding feel less like homework. Currently freelancing with"
      studio={{ label: "Estúdio Onda", href: "#" }}
      ctaLabel="See it move"
      colors={{ paper: "#f3ece2", accent: "#ff7a3d" }}
      email="rio@example.com"
      location="Lisbon"
      timeZone="Europe/Lisbon"
      play={false}
      projects={[
        {
          title: "Pocket Money",
          client: "Tandem",
          disciplines: ["Motion,", "Product UI"],
          description: "Micro-interactions and a launch film for a bill-splitting app that wanted money to feel friendly.",
          art: "phone",
          year: "2026",
          role: "Motion lead",
          results: [
            { value: "38s", label: "launch film" },
            { value: "120", label: "micro-interactions shipped" },
            { value: "+22%", label: "onboarding completion" },
          ],
        },
        {
          title: "Night Moves",
          client: "Night Owls Jazz Fest",
          disciplines: ["Animated posters,", "Social"],
          description: "Every poster in the series, animated for screens in the garage stairwells and on Instagram.",
          art: "posters",
          year: "2025",
          role: "Animation",
        },
      ]}
      about={{
        intro: "Motion designer. Former drummer. Will animate your logo for pastéis de nata.",
        heading: "Hello again, from Lisbon.",
        paragraphs: ["Ten years of making still things move, for studios, start-ups and one very patient orchestra."],
        services: ["Motion identity", "Launch films", "UI animation", "Lottie & Rive"],
        clients: ["Tandem", "Night Owls", "Onda", "Museu do Fado"],
        recognition: ["Motion Awards, 2025", "Vimeo Staff Pick, 2023"],
        resume: null,
      }}
      footer={{ heading: "Let’s make it move.", highlight: "move", note: "Animated in Lisbon." }}
      onProjectOpen={(p) => console.log("opened", p.title)}
    />
  )
}
