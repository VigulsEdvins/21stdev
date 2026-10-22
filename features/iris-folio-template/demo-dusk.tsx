"use client"

import IrisFolioTemplate from "@/components/ui/iris-folio-template"

// The same template for a different person: a Kyoto illustrator's archive in
// the dusk palette. Name, lettering, local script, work and timeline are all props.
export default function DemoDusk() {
  return (
    <IrisFolioTemplate
      name="Aoi Mori"
      mark="©AOI"
      palette="dusk"
      paletteSwitcher={false}
      hero={{ title: "ARCHIVE", from: 2019, to: 2025, discipline: "Illustration", tags: ["Picture books", "Editorial", "Packaging"], localName: "森 葵", localTitle: "作品集" }}
      worksCopy={{ title: "Plates", kicker: "Selected plates", intro: "Picture books, editorial and the odd tea tin, painted in gouache in a small room above a flower shop." }}
      projects={[
        { title: "The Moon Gardener", year: 2025, discipline: "Picture books", client: "Kaisei-sha", role: "Story & pictures", summary: "A girl who waters the moon so it keeps growing.", motif: "moon", sky: "night", tools: ["Gouache"] },
        { title: "Kyoto Seasons", year: 2024, discipline: "Editorial", client: "Kyoto Journal", role: "Covers, 4 issues", summary: "Four covers, one plant per season.", motif: "leaves", sky: "dawn" },
        { title: "Hanami Tea", year: 2023, discipline: "Packaging", client: "Ippodo", role: "Tin illustration", summary: "Spring tins that scatter petals when you open them.", motif: "petals", sky: "day" },
        { title: "Iris Night", year: 2021, discipline: "Editorial", client: "Brutus", role: "Feature spread", summary: "A night walk through the iris garden at Heian Shrine.", motif: "iris", sky: "dusk" },
      ]}
      about={{
        title: "About",
        statement: "I paint *small worlds* for picture books and the people who read them twice.",
        body: "Kyoto-born, trained in Nihonga, now painting in gouache. I answer every letter.",
        facts: [
          { label: "Based in", value: "Kyoto, JP" },
          { label: "Languages", value: "日本語 · English" },
          { label: "Agent", value: "Little Leaf Agency" },
        ],
        stats: [
          { value: 6, label: "Years" },
          { value: 9, label: "Picture books" },
        ],
      }}
      timeline={[
        { year: 2019, headline: "Seed", items: [{ title: "Graduated in Nihonga", place: "Kyoto City University of Arts" }] },
        { year: 2021, headline: "Sprout", items: [{ title: "First editorial commission", place: "Brutus" }, { title: "Moved into the flower-shop studio" }] },
        { year: 2023, headline: "Leaf", items: [{ title: "Hanami Tea tins", place: "Ippodo" }] },
        { year: 2025, headline: "Bloom", items: [{ title: "The Moon Gardener", note: "Debut picture book" }, { title: "Solo show", place: "Gallery Hana" }] },
      ]}
      contact={{ title: "Write to me", line: "Commissions, picture-book ideas and fan mail all welcome.", email: "aoi@example.com", availability: "Taking commissions from April", socials: [{ label: "Instagram", href: "#" }, { label: "note", href: "#" }] }}
    />
  )
}
