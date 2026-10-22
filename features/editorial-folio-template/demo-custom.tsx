"use client"

import EditorialFolioTemplate from "@/components/ui/editorial-folio-template"

// Everything is a prop: another person, a terracotta wash, dark paper, renamed
// and reordered sheets, different artwork motifs and a monogram for a portrait.
export default function DemoCustom() {
  return (
    <EditorialFolioTemplate
      name="Theo Marchetti"
      role="Art Direction + Print"
      year="2027"
      location="Turin, IT"
      email="theo@example.com"
      phone="+39 011 555 0199"
      coverWord="Selected"
      bio="Paper first, pixels second. I like jobs that end at a press check."
      coverItalic={2}
      accent="#e0937a"
      defaultTheme="dark"
      sections={["cover", "about", "experience", "postcards", "connect"]}
      titles={{ postcards: "Prints", experience: "Studios", connect: "Say Ciao" }}
      portrait={
        <svg viewBox="0 0 120 132" width={120} height={132} role="img" aria-label="Theo Marchetti" style={{ display: "block", width: "100%", height: "auto" }}>
          <rect width="120" height="132" fill="#e0937a" />
          <circle cx="92" cy="26" r="40" fill="#f3d2c4" />
          <text x="60" y="84" textAnchor="middle" fontSize="44" fontStyle="italic" fill="#1d1d1c" fontFamily="Georgia,serif">
            TM
          </text>
        </svg>
      }
      links={[
        { label: "Are.na", href: "https://are.na" },
        { label: "Instagram", href: "https://instagram.com" },
      ]}
      background={["Politecnico di Torino", "M.A. Communication Design", "Studio Fiume, Junior Art Director"]}
      tools={["InDesign", "Figma", { name: "Risograph", mark: "Ri", round: true }]}
      skills={[
        ["Editorial", "Type Systems", "Print Production"],
        ["Patient", "Detail-minded", "Loud about margins"],
      ]}
      works={[
        {
          fig: "3.0",
          title: "Mercato Fiori",
          client: "Mercato Fiori",
          year: "2026",
          motif: "bloom",
          palette: ["#f3e6d3", "#c8452d", "#24301f"],
          artText: "fiori freschi",
          description: "A riso-printed poster series for a Saturday flower market.",
          points: ["Two spot colours, one stencil, four hundred prints."],
        },
        {
          fig: "3.1",
          title: "Radio Lingotto",
          client: "Radio Lingotto",
          year: "2025",
          motif: "grid",
          palette: ["#efe8dc", "#141414", "#3b6fd9"],
          artText: "Frequenze",
          description: "Identity and schedule posters for a community radio station.",
          href: "https://example.com",
        },
        {
          fig: "3.2",
          title: "Notte Bianca",
          client: "Comune di Torino",
          year: "2025",
          motif: "night",
          palette: ["#1d1a33", "#f0e2c8", "#e0937a"],
          artText: "notte bianca",
          description: "Wayfinding postcards for a city-wide night of open museums.",
        },
      ]}
      roles={[
        {
          company: "Studio Fiume",
          title: "Junior Art Director",
          period: "2025 – now",
          fig: "2.0",
          motif: "mailer",
          palette: ["#24301f", "#c8452d", "#f3d2c4"],
          artText: "Print is|Back",
          points: ["Art-directed a quarterly print magazine from flatplan to press check.", "Built the studio's grid and type system in InDesign and Figma."],
        },
        {
          company: "Freelance",
          period: "2022 – 2025",
          fig: "2.1",
          motif: "bloom",
          artText: "small jobs",
          points: ["Menus, labels and posters for twenty small businesses around Turin."],
        },
      ]}
      connectNote="Portfolio PDFs, print samples and references on request. I answer every letter."
    />
  )
}
