"use client"

import CobaltToileLanding from "@/components/ui/cobalt-toile-landing"

// The same template printed in indigo for an architecture studio: your own
// brand, copy, practices, press and palette — the whole page is props.
export default function DemoIndigo() {
  return (
    <CobaltToileLanding
      brand="Atheneum Studio"
      palette="indigo"
      paletteSwitcher={false}
      cta={{ label: "Start a project", href: "#contact" }}
      hero={{
        title: "Old Stones,\nNew Rooms",
        subtitle: "An architecture practice restoring historic buildings for the people who will use them next.",
        action: { label: "See our practice", href: "#solutions" },
        est: "Est. MCMLXXX",
        edition: "Lisbon · Porto",
      }}
      clientsLabel="Restored for"
      clients={["Museu do Azulejo", "Casa Pessoa", "Lisbon Opera", "Porto Library", "Quinta da Vila", "Sintra Trust"]}
      about={{
        kicker: "The studio",
        statement: "We treat every building as a *conversation across centuries* — listening first, then adding only what the next one needs.",
        body: "Twelve architects, two conservators and a stonemason, working from a former printworks above the Tagus.",
        stats: [
          { value: 46, label: "Years in practice" },
          { value: 210, label: "Buildings restored" },
          { value: 9, label: "Heritage awards" },
        ],
        seal: "Atheneum · Restoration · Architecture · ",
      }}
      solutionsCopy={{ kicker: "Practice", title: "Four ways *in*", intro: "Pick a bookmark to read how we approach each kind of commission." }}
      solutions={[
        { kicker: "Survey", title: "Survey & Archive", quote: "Measure twice. Then read the archive.", body: "Laser survey, archive research and material testing before a single line is drawn.", points: ["3D survey", "Archive research", "Material analysis"], art: "typewriter", tone: "ink" },
        { kicker: "Restore", title: "Conservation", quote: "Repair what is there before inventing what is not.", body: "Stone, timber, tile and plaster, conserved by specialists we have worked with for decades.", points: ["Stone & tile", "Timber frames", "Lime plasters"], art: "steamer", tone: "paper" },
        { kicker: "Adapt", title: "Adaptive Reuse", quote: "A good building outlives its first purpose.", body: "Warehouses into libraries, palaces into schools — new uses that keep the old character.", points: ["Feasibility", "Planning consent", "Interior design"], art: "monogram", tone: "ink" },
        { kicker: "Build", title: "New Work", quote: "New rooms should sit quietly beside old ones.", body: "Extensions and new buildings in historic settings, designed to age alongside their neighbours.", points: ["Extensions", "Infill", "Landscape"], art: "tower", tone: "paper" },
      ]}
      press={[
        { title: "The printworks that became a library", source: "Architectural Review", date: "March 2, 2026", category: "Feature" },
        { title: "Atheneum wins the Europa Nostra award", source: "Público", date: "January 18, 2026", category: "News" },
        { title: "How to restore azulejos without losing their story", source: "Wallpaper", date: "November 9, 2025", category: "Interview" },
        { title: "In praise of slow architecture", source: "Dezeen Weekly", date: "October 1, 2025", category: "Opinion" },
      ]}
      contactBand={{ title: "Bring us an *old building*.", body: "Tell us where it is and what you hope it becomes. We reply within a week, usually after a visit.", action: { label: "Write to the studio", href: "mailto:studio@example.com" }, secondary: { label: "Read the press", href: "#insights" } }}
      contact={{ email: "studio@example.com", phone: "+351 21 000 0000", location: "Rua da Imprensa, Lisbon" }}
      tagline="An architecture and conservation studio for buildings with a past and a future."
      newsletter={{ title: "Field Notes", body: "Twice a year: what we found in the walls.", placeholder: "Your email" }}
    />
  )
}
