"use client"

import * as React from "react"
import PigmentExperienceLedger from "@/components/ui/pigment-experience-ledger"

// An infrastructure engineer's history on a dark surface in the tide preset.
// Bramble is painted in its own colours (hover it), each role carries a small
// mark, and the labels and call to action are custom.

const mark = (children: React.ReactNode) => (
  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    {children}
  </svg>
)
export default function DemoTide() {
  return (
    <div className="dark w-full">
      <PigmentExperienceLedger
        palette="tide"
        heading="Where I've worked"
        intro="Infrastructure engineer. I build the quiet systems that keep transit and health apps online."
        footnote="* Acquired by a larger retailer in 2020"
        cta={{ label: "View résumé", href: "#resume" }}
        labels={{ link: "Write-up", tags: "Stack" }}
        defaultOpen={0}
        items={[
          {
            company: "Osprey Transit",
            role: "Staff engineer",
            years: "2023-now",
            location: "Seattle",
            industry: "Public transport",
            logo: mark(<path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 3.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z" fillRule="evenodd" />),
            link: { label: "How the arrival feed works", href: "#osprey" },
            summary: [
              "I run the platform team behind real-time arrivals for three city bus networks.",
              "We moved the arrival feed off a single server onto a setup that keeps running when a data centre goes dark.",
            ],
            tags: ["Go", "Kafka", "On-call"],
          },
          {
            company: "Glasswing",
            role: "Senior engineer",
            years: "2020-2023",
            location: "Remote",
            industry: "Clinic scheduling",
            logo: mark(<path d="M2 3h9v9H2zM9 8h9v9H9z" opacity=".85" />),
            link: { label: "Migration notes", href: "#glasswing" },
            summary: [
              "Led the move from one shared database to one per clinic group, without a single missed appointment.",
              "Wrote the runbooks the support team still uses for the Monday morning rush.",
            ],
            tags: ["Postgres", "Terraform"],
          },
          {
            company: "Bramble",
            mark: "*",
            role: "Backend engineer",
            years: "2018-2020",
            location: "Portland",
            industry: "Retail",
            logo: mark(<path d="M10 2 18.5 17h-17z" />),
            colors: ["#9f1d2c", "#d9472b", "#f08a4b"],
            summary: ["Built stock sync between forty shops and the web store, and the alerts that said when it drifted."],
            tags: ["Python", "Queues"],
          },
          {
            company: "Fieldnote",
            role: "Engineer",
            years: "2016-2018",
            location: "Portland",
            industry: "Survey tools",
            logo: mark(<path d="M2 5h16v3H2zM2 12h10v3H2z" />),
            summary: ["First job out of school: offline sync for a field survey app used by park rangers."],
          },
        ]}
      />
    </div>
  )
}
