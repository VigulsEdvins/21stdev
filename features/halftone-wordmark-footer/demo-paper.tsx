"use client"

import HalftoneWordmarkFooter from "@/components/ui/halftone-wordmark-footer"

// Printed on paper: another word, your own columns, a finer screen.
export default function DemoPaper() {
  return (
    <div className="w-full">
      <HalftoneWordmarkFooter
        preset="paper"
        wordmark="tessera"
        label="Tessera Type Foundry"
        meta="©2026 · Basel"
        dotGap={5}
        columns={[
          { title: "Fonts", links: [{ label: "Catalogue" }, { label: "Trials" }, { label: "Licensing" }] },
          { title: "Foundry", links: [{ label: "Journal" }, { label: "Custom" }, { label: "About" }] },
          { title: "Follow", links: [{ label: "Are.na" }, { label: "Instagram" }, { label: "Newsletter" }] },
        ]}
      />
    </div>
  )
}
