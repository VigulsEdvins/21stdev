"use client"

import EarthLimbLanding from "@/components/ui/earth-limb-landing"

// The same page for a maritime imaging company: the dawn view riding a radar
// satellite along the terminator, a coral accent, dark pages, its own fleet of twelve,
// port cities, use cases, spacecraft and footer.
export default function DemoDawn() {
  return (
    <EarthLimbLanding
      brand="Tern"
      tagline="Ocean imaging"
      preset="dawn"
      accent="#ff7a5c"
      theme="dark"
      kicker="Maritime imaging"
      headline="Every ship and every coastline, every morning."
      lede="Six radar satellites at dawn and dusk, six optical ones at 10:30. Port calls, anchorage queues and spills, mapped through cloud and darkness."
      cta={{ label: "Book a demo", href: "#tasking" }}
      secondaryCta={{ label: "See port coverage", href: "#archive" }}
      imagesPerDay={6200}
      planes={[
        { id: "dawn", name: "Dawn-dusk", ltan: 6, sensor: "radar", altitude: 560 },
        { id: "am", name: "Morning", ltan: 22.5, sensor: "optical", altitude: 510 },
      ]}
      fleet={[
        ...[0, 1, 2, 3, 4, 5].map((i) => ({ id: "TR-0" + (i + 1), plane: "dawn", phase: i * 60 + 20 })),
        ...[0, 1, 2, 3, 4, 5].map((i) => ({ id: "TO-0" + (i + 1), plane: "am", phase: i * 60 })),
      ]}
      rhythm={[
        { label: "Radar passes", value: "06:00 and 18:00" },
        { label: "Optical pass", value: "10:30 local" },
        { label: "Port report", value: "By 13:00" },
      ]}
      spacecraft={{
        name: "Tern O-3",
        title: "One telescope, one job: ships",
        body: "A 96 kg satellite that turns to each port on its track, takes a 12 km strip and downlinks before the next harbour comes up.",
        specs: [
          { label: "Ground resolution", value: "40 cm" },
          { label: "Swath", value: "12 km" },
          { label: "Orbit", value: "510 km, sun-synchronous" },
          { label: "Ports per pass", value: "Up to 30" },
          { label: "Downlink", value: "2.4 Gbit/s, X-band" },
          { label: "Design life", value: "5 years" },
        ],
        parts: ["Telescope, 40 cm aperture", "Star trackers", "Solar wings, 360 W", "X-band antenna", "Radiator"],
        primary: { label: "Fleet specifications", href: "#fleet" },
        secondary: { label: "Download datasheet", href: "#fleet" },
      }}
      swath={{ kind: "coast", caption: "Barrier beach, 34.2°N 77.8°W, 40 cm" }}
      footer={{
        band: { kind: "coast", caption: "51.95°N 4.05°E" },
        columns: [
          { title: "Product", links: [{ label: "Port reports" }, { label: "Spill alerts" }, { label: "Archive" }, { label: "Pricing" }] },
          { title: "Coverage", links: [{ label: "Europe" }, { label: "Asia" }, { label: "Americas" }, { label: "Africa" }] },
          { title: "Developers", links: [{ label: "API reference" }, { label: "AIS matching" }, { label: "Status" }] },
          { title: "Company", links: [{ label: "About" }, { label: "Careers" }, { label: "Contact" }] },
        ],
        newsletter: { title: "Port of the week", body: "One harbour, one picture, what changed. Every Monday." },
        note: "Tern Maritime. Rotterdam and Singapore.",
        legal: [{ label: "Privacy" }, { label: "Terms" }, { label: "Imagery licence" }],
      }}
      archiveStat={{ value: "41,800", sub: "Port scenes in the archive" }}
      statement="Ships keep schedules and so do we. The same harbour at the same hour, every day, means a missing hull or a new slick stands out at a glance."
      card={{
        kicker: "Spill response",
        title: "Oil on the water",
        body: "When a slick is reported we task the next two passes at no cost and share the outlines with the coast guard.",
        link: { label: "How spill tasking works" },
        kind: "harbor",
      }}
      cities={[
        { name: "Rotterdam", lat: 51.92, lon: 4.48, tz: "Europe/Amsterdam" },
        { name: "Singapore", lat: 1.26, lon: 103.84, tz: "Asia/Singapore" },
        { name: "Los Angeles", lat: 33.74, lon: -118.27, tz: "America/Los_Angeles" },
        { name: "Santos", lat: -23.96, lon: -46.3, tz: "America/Sao_Paulo" },
        { name: "Durban", lat: -29.87, lon: 31.03, tz: "Africa/Johannesburg" },
        { name: "Busan", lat: 35.1, lon: 129.04, tz: "Asia/Seoul" },
      ]}
      uses={[
        {
          id: "ports",
          label: "Ports",
          line: "Berth occupancy for 900 container terminals",
          title: "See which berths are full before the line-up says so.",
          body: "Every terminal, every morning. Hulls are measured, matched to AIS and counted against the published schedule.",
          facts: [
            { label: "Terminals", value: "900+" },
            { label: "Revisit", value: "Daily" },
            { label: "Smallest hull", value: "12 m" },
          ],
          kind: "harbor",
          mode: "radar",
          before: "Optical",
          after: "Radar",
          place: "Container port anchorage",
          date: "14 Oct, 10:22 local",
          cta: { label: "Port coverage", href: "#archive" },
        },
        {
          id: "coast",
          label: "Coastlines",
          line: "Shoreline change after every storm",
          title: "Measure the beach the morning after.",
          body: "Before and after pictures of every coastal asset you insure, with the waterline traced for you.",
          facts: [
            { label: "Resolution", value: "30 cm" },
            { label: "Delivery", value: "Under 3 hours" },
            { label: "Export", value: "GeoJSON" },
          ],
          kind: "coast",
          mode: "change",
          before: "June",
          after: "October",
          place: "Barrier beach after the storm",
          date: "02 Jun and 06 Oct",
        },
        {
          id: "salt",
          label: "Industry",
          line: "Salt, dredging and land reclamation",
          title: "Watch the work that happens at the waterline.",
          body: "Dredging plumes, new quays and evaporation ponds, tracked month by month for operators and their lenders.",
          facts: [
            { label: "Cadence", value: "Monthly" },
            { label: "Bands", value: "8" },
            { label: "Archive", value: "Since 2021" },
          ],
          kind: "flood",
          mode: "radar",
          before: "Optical",
          after: "Radar",
          place: "River mouth",
          date: "09 Oct, 10:40 local",
        },
      ]}
      archive={[
        { category: "Ports", title: "Anchorage queue before the strike was called off", date: "13 Oct 2026", kind: "harbor" },
        { category: "Industry", title: "Salt ponds at the end of the dry season", date: "07 Oct 2026", kind: "ponds" },
        { category: "Coastlines", title: "Dunes moving toward the coast road", date: "30 Sep 2026", kind: "dunes" },
        { category: "Agriculture", title: "Irrigated fields behind the export terminal", date: "22 Sep 2026", kind: "fields" },
      ]}
      seed={23}
    />
  )
}
