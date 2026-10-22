"use client"

import HitchCargoLanding from "@/components/ui/hitch-cargo-landing"

// The same page as a different company: Kerbside leases cargo bikes to
// delivery fleets. The preset swaps the brand, the safety-yellow paint, the
// parts list and every line of copy. On top of it this demo adds a part of
// its own (a parcel cage, drawn here in the plate's 1000 x 600 space), builds
// that use it, a re-priced box, and a quote request that waits on a promise.
const cage = (
  <g>
    <rect x={112} y={270} width={286} height={6} rx={3} fill="#000" opacity={0.45} />
    <rect x={108} y={128} width={294} height={146} rx={6} fill="#ffffff" fillOpacity={0.04} />
    <path
      d="M132 132V270M156 132V270M180 132V270M204 132V270M228 132V270M252 132V270M276 132V270M300 132V270M324 132V270M348 132V270M372 132V270M108 156H402M108 180H402M108 204H402M108 228H402M108 252H402"
      stroke="#9aa0a6"
      strokeWidth={1.4}
      fill="none"
    />
    <rect x={108} y={128} width={294} height={146} rx={6} stroke="#d5d8db" strokeWidth={6} fill="none" />
    <path d="M108 128H402" stroke="#ffffff" strokeOpacity={0.4} strokeWidth={2} />
    <rect x={238} y={186} width={34} height={26} rx={4} fill="#2a2d31" />
    <circle cx={255} cy={199} r={5} fill="#ffd21f" />
    <rect x={118} y={238} width={110} height={30} rx={3} fill="#6d737a" />
    <rect x={236} y={226} width={86} height={42} rx={3} fill="#585e65" />
    <path d="M118 250H228M236 244H322" stroke="#8a9097" strokeWidth={3} />
  </g>
)

export default function DemoFleet() {
  return (
    <HitchCargoLanding
      preset="fleet"
      parts={[
        { id: "box", price: 590 },
        {
          id: "cage",
          name: "Parcel cage",
          code: "KS-37",
          mount: "rear",
          price: 470,
          weight: 7.4,
          range: -6,
          note: "A lockable mesh cage for parcels and returns.",
          art: cage,
          anchor: [380, 128],
          tag: [380, 60],
        },
      ]}
      builds={[
        { id: "parcel", caption: "Parcel round", tail: "the last mile.", modules: ["cage", "battery"] },
        { id: "grocer", caption: "Grocery drop", tail: "the early round.", modules: ["box", "basket"] },
        { id: "site", caption: "Site service", tail: "the site visit.", modules: ["toolbox", "panniers"] },
        { id: "bulk", caption: "Bulk load", tail: "the bulk drop.", modules: ["flatbed", "battery"] },
      ]}
      onReserve={(r) => new Promise((done) => setTimeout(() => done(console.log("quote requested", r)), 900))}
    />
  )
}
