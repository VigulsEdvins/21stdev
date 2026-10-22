"use client"

import KilnWordmarkFooter from "@/components/ui/kiln-wordmark-footer"

// Same component, re-inked and re-worded: a textile mill in cobalt and bone,
// with a wordmark that uses ascenders.
export default function Demo() {
  return (
    <div className="w-full bg-[#ece6da] px-[4vw] py-[8vw]">
      <KilnWordmarkFooter
        brand="Tessuto"
        motto={["Woven slow", "since 1931"]}
        address={["Via dei Telai, 4", "↳ 22100 Como", "Lombardy — Italy"]}
        navigation={[
          [{ label: "Home" }, { label: "Fabrics" }, { label: "Archive" }],
          [{ label: "Mill" }, { label: "Bespoke" }, { label: "Samples" }],
          [{ label: "Journal" }, { label: "Stockists" }, { label: "Contact" }],
        ]}
        socials={[[{ label: "Instagram" }, { label: "Pinterest" }], [{ label: "Vimeo" }]]}
        year={2026}
        registry="Jacquard, dobby and plain weave — 212 looms"
        surface="#2a49d6"
        deep="#1a2f9e"
        ink="#efe9dc"
        paper="#1a2f9e"
        weight={0.85}
        defaultTile={3}
      />
    </div>
  )
}
