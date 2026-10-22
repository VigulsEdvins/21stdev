"use client"

import BeamWordmarkFooter from "@/components/ui/beam-wordmark-footer"

// The same footer, re-branded and re-inked: a warm beam, three columns, other
// icons, and a click handler on every link.
export default function DemoEmber() {
  return (
    <div className="w-full bg-[#0b0503]">
      <BeamWordmarkFooter
        brand="Saffron"
        company="Saffron Studio"
        year={2026}
        background="#0b0503"
        ink="#f6eee6"
        muted="#9d8d80"
        accent="#ff7a2f"
        wordTop="#9a3712"
        wordFoot="#170703"
        socials={[
          { label: "GitHub", href: "#", icon: "github" },
          { label: "Dribbble", href: "#", icon: "dribbble" },
          { label: "Instagram", href: "#", icon: "instagram" },
        ]}
        credits={[
          { lead: "Roasted in ", label: "Lisbon", tail: " since 2019" },
          { lead: "Questions? ", label: "hello@saffron.studio", href: "#" },
        ]}
        columns={[
          { title: "Menu", links: [{ label: "Single origin" }, { label: "Blends" }, { label: "Subscriptions" }] },
          { title: "Visit", links: [{ label: "Locations" }, { label: "Opening hours" }, { label: "Events" }] },
        ]}
        onLinkClick={(label) => console.log("footer link:", label)}
      />
    </div>
  )
}
