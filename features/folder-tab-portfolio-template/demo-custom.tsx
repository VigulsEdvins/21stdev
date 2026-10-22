"use client"

import FolderTabPortfolioTemplate from "@/components/ui/folder-tab-portfolio-template"

// Everything is a prop. A different designer, no second script, a cooler
// palette, dark by default, and fewer folders.
export default function DemoCustom() {
  return (
    <FolderTabPortfolioTemplate
      name="Noor Haddad"
      localName=""
      handle="@noor.prints"
      years="2024–2026"
      role="Brand & motion designer"
      disciplines={["Brand design", "Motion", "Packaging"]}
      word="Showreel"
      tag="#NOOR"
      subtitle={["Brand ", "work"]}
      notes={["Think", "Make", "Review"]}
      blurb="I build identities that move: logos with a sense of timing, packaging that opens like a story, and motion systems teams can actually reuse."
      greeting="Hello, I'm"
      defaultTheme="dark"
      timeZone="Asia/Dubai"
      email="noor@example.com"
      colors={{ blue: "#5b5bf0", green: "#14b8a6", orange: "#f43f5e", yellow: "#fde68a" }}
      categories={[
        { id: "brand", label: "Identity", tone: "blue", kind: "brand" },
        { id: "pack", label: "Packaging", tone: "orange", kind: "render" },
        { id: "motion", label: "Motion", tone: "green", kind: "poster" },
      ]}
      projects={[
        { title: "Saffron Lane identity", category: "brand", year: "2026", summary: "A spice-market brand built on a single rotating petal.", tools: ["Illustrator"], mark: "SAFF" },
        { title: "Dune Cola can", category: "pack", year: "2025", summary: "A limited can that changes colour with temperature.", client: "Dune", mark: "DUNE" },
        { title: "Metro wayfinding titles", category: "motion", year: "2025", summary: "Twelve-second loops for every line of a new metro.", href: "https://example.com", mark: "M1" },
        { title: "Kiln ceramics boxes", category: "pack", year: "2024", summary: "Recycled-pulp boxes that double as a display stand.", mark: "KILN" },
      ]}
      highlights={[
        { label: "Brand designer", tone: "blue", lines: ["12 identities shipped", "Systems over one-offs"] },
        { label: "Motion", tone: "green", lines: ["After Effects & Rive", "Logo animation kits"] },
        { label: "Teacher", tone: "orange", lines: ["Weekend type workshops"] },
      ]}
      timeline={[
        { from: "2021", to: "2023", title: "Designer", place: "Studio Qamar" },
        { from: "2023", to: "Now", title: "Independent", place: "Dubai" },
      ]}
      chapters={[
        { title: "Who I am", points: ["Background", "Skills"], target: "about" },
        { title: "Selected work", points: ["Identity", "Packaging", "Motion"], target: "work" },
        { title: "Get in touch", target: "contact" },
      ]}
      steps={[
        { title: "Listen", body: "A one-hour call and a page of notes you can correct.", outputs: ["Brief"] },
        { title: "Sketch", body: "Thirty rough marks, three refined, one chosen together.", outputs: ["Moodboard", "Marks"] },
        { title: "Move", body: "The mark learns to move before it learns to sit still.", outputs: ["Motion kit"] },
      ]}
      words={[{ quote: "Noor gave our brand a heartbeat.", name: "Omar Said", role: "Founder, Saffron Lane", tone: "blue" }]}
      contacts={[
        { label: "Instagram", value: "@noor.prints", href: "https://instagram.com" },
        { label: "Vimeo", value: "vimeo.com/noor", href: "https://vimeo.com" },
      ]}
    />
  )
}
