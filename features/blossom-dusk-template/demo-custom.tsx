"use client"

import BlossomDuskTemplate from "@/components/ui/blossom-dusk-template"

// Everything is a prop. The same page for a different company on the dawn
// palette: its own canopy seed, copy, integrations, busywork and pricing, and
// a real handler for the closing form.
export default function DemoCustom() {
  return (
    <BlossomDuskTemplate
      brand="tendril"
      palette="dawn"
      seed={23}
      hero={{
        title: "Every tool, one root.",
        accent: "Let the work grow itself.",
        text: "Tendril links the apps your studio already lives in, so briefs, files and invoices find their own way to the right person.",
        primary: { label: "Start growing", href: "#start" },
        secondary: { label: "See it run", href: "#demo" },
      }}
      logosTitle="Rooted in studios like"
      logos={["Fernhouse", "OAK & IRIS", "Studio Mallow", "pale fire", "Northbloom"]}
      hub={{
        eyebrow: "Connections",
        title: "One root, eight branches.",
        text: "Each app is a branch on the same root. Pick one to watch what it sends, or prune it without touching the rest.",
        integrations: [
          { name: "Docs", vendors: "Notion · Google Docs", icon: "record", events: ["Brief # published", "Doc # shared", "Outline # approved"] },
          { name: "Assets", vendors: "Figma · Drive", icon: "lab", events: ["Frame # exported", "Asset # tagged", "Folder # synced"] },
          { name: "Health", vendors: "Status · Uptime", icon: "heart", events: ["Check # passed", "Ping # healthy", "Monitor # green"] },
          { name: "Supplies", vendors: "Shopify", icon: "pill", connected: false, events: ["Order # placed", "Stock # updated", "Return # opened"] },
          { name: "Invoices", vendors: "Stripe · Xero", icon: "receipt", events: ["Invoice # sent", "Payment # cleared", "Receipt # filed"] },
          { name: "Contracts", vendors: "DocuSign", icon: "shield", events: ["Contract # signed", "NDA # countersigned", "Renewal # flagged"] },
          { name: "Calls", vendors: "Zoom · Meet", icon: "video", events: ["Call # recorded", "Notes # drafted", "Room # opened"] },
          { name: "Calendar", vendors: "Google · Cal.com", icon: "calendar", events: ["Review # booked", "Slot # moved", "Kickoff # confirmed"] },
        ],
      }}
      busywork={{
        title: "Prune the busywork.",
        text: "Every studio has a list like this. Tick off what Tendril should take over and watch the week come back.",
        tasks: [
          { title: "Chase signatures on contracts", team: "Producers", hours: 3 },
          { title: "Rename and file exported assets", team: "Designers", hours: 4.5 },
          { title: "Copy hours into invoices", team: "Finance", hours: 3.5 },
          { title: "Post call notes to the brief", team: "Producers", hours: 2 },
        ],
      }}
      stats={[
        { value: 860, suffix: "+", label: "Studios on Tendril" },
        { value: 4.2, suffix: "M", decimals: 1, label: "Files routed each month" },
        { value: 9, suffix: " hrs", label: "Back per person, every week" },
      ]}
      pricing={{
        title: "Grow by the branch.",
        text: "Pay for the apps you connect, never for seats. Slide to your studio.",
        tiers: [
          { name: "Seedling", text: "For a small studio.", base: 24, included: 3, perConnection: 6, features: ["3 connections", "Daily sync", "Email support"], button: "Plant it" },
          { name: "Grove", text: "For teams that ship every week.", base: 96, included: 8, perConnection: 5, features: ["8 connections", "Real-time sync", "Automations", "Priority support"], featured: true, button: "Start a trial" },
        ],
      }}
      stories={{
        title: "Studios that got their Fridays back.",
        quotes: [
          { quote: "Exports name and file themselves now. Nobody on the team has dragged a PNG into a folder in months.", name: "Ines Varga", role: "Design lead", org: "Fernhouse", metric: { value: "6 hrs", label: "back per designer, weekly" } },
          { quote: "Invoices go out the day a project closes, with the hours already on them.", name: "Tom Adeyemi", role: "Studio manager", org: "Oak & Iris", metric: { value: "2×", label: "faster to get paid" } },
        ],
      }}
      faq={{
        title: "Good questions.",
        items: [
          { q: "Do I need a developer?", a: "No. Every connection is a sign-in and a few toggles." },
          { q: "Can I try it on one project first?", a: "Yes. Scope Tendril to a single client folder and widen it when you're ready." },
        ],
      }}
      cta={{ title: "Let your studio grow itself.", text: "Connect three apps free. No card, no call.", button: "Start free", placeholder: "you@studio.com" }}
      footer={{ tagline: "Every tool, one root.", note: "© 2026 Tendril Studio Co.", legal: "SOC 2 Type II · GDPR ready" }}
      onGetStarted={async (email) => {
        console.log("signup", email)
        await new Promise((r) => setTimeout(r, 700))
      }}
    />
  )
}
