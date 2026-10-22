import React from "react"
import DitherSweepNavbar from "@/components/ui/dither-sweep-navbar"

/** The same bar, recoloured and rescaled, with no CTA. */
export default function DitherSweepNavbarStrictDemo() {
  return (
    <div
      className="grid w-full"
      style={{ minHeight: "100svh", alignContent: "center", background: "#101014" }}
    >
      <DitherSweepNavbar
        sticky={false}
        brand="Blackline"
        ink="#f2f2ec"
        paper="#101014"
        rule="#3a3a42"
        accent="#7cf6c8"
        scale={1.1}
        durationMs={700}
        cta={null}
        items={[
          { label: "Work", href: "#work" },
          { label: "Studio", children: [{ label: "Team", href: "#team" }, { label: "Process", href: "#process" }] },
          { label: "Journal", href: "#journal" },
        ]}
      />
    </div>
  )
}
