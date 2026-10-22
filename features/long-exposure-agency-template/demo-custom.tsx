"use client"

import LongExposureAgencyTemplate from "@/components/ui/long-exposure-agency-template"

// Someone else's studio: a data-engineering shop with its own name, copy,
// ink colour, three clients painted in palettes of their own, and a real
// booking handler.
export default function DemoCustom() {
  return (
    <LongExposureAgencyTemplate
      brand="Tidewell"
      ink="#1d2b3a"
      defaultTheme="light"
      nav={[
        { label: "Work", href: "#cases" },
        { label: "Services", href: "#services" },
        { label: "Process", href: "#process" },
        { label: "FAQ", href: "#faq" },
      ]}
      navCta={{ label: "Talk to us", href: "#book" }}
      hero={{
        title: "Your data, finally\nworking for you.",
        subtitle: "Pipelines, dashboards and quiet little agents that keep the numbers right while your team sleeps.",
        primary: { label: "Talk to us", href: "#book" },
        secondary: { label: "See our work", href: "#cases" },
        word: "Tide",
        badge: { title: "Live in 30 days", text: "Fixed scope. Fixed price." },
        trust: "Rated 5/5 by 40 data teams",
      }}
      clientsTitle="Data teams that sleep better"
      clients={["Brightloom", "Meridian", "Saltmarsh", "Kestrel", "Ovenbird", "Larkspur"]}
      stats={[
        { value: 2.4, decimals: 1, suffix: "B", label: "Rows moved every night" },
        { value: 30, label: "Days from kickoff to live" },
        { value: 99.9, decimals: 1, suffix: "%", label: "Pipeline uptime" },
        { value: 40, suffix: "+", label: "Teams on our dashboards" },
      ]}
      cases={[
        {
          id: "brightloom",
          name: "Brightloom",
          industry: "Retail",
          tagline: "Forty stores, one inventory truth.",
          summary: "How Brightloom stopped over-ordering by reconciling every till, every night.",
          field: "sand",
          mark: 1,
          sections: [
            { label: "Overview", lead: "Brightloom's buyers ordered from three reports that never agreed.", body: "We rebuilt the numbers from the till up." },
            { label: "What we built", lead: "A nightly reconciliation that flags every stock mismatch before the buyers start work." },
          ],
          results: [
            { value: 18, suffix: "%", label: "Less overstock" },
            { value: 6, suffix: "h", label: "Saved weekly per buyer" },
            { value: 40, label: "Stores on one model" },
          ],
          quote: { text: "We argue about strategy now, not about whose spreadsheet is right.", name: "Iris Calder", role: "Head of Buying, Brightloom" },
          stack: ["Shopify POS", "BigQuery", "dbt", "Looker"],
        },
        {
          id: "meridian",
          name: "Meridian",
          industry: "Healthcare",
          tagline: "Clinic scheduling across 12 sites.",
          summary: "How Meridian filled 1,900 cancelled appointments a month with an agent that rebooks the waitlist.",
          field: "glacier",
          mark: 4,
          serif: true,
          results: [
            { value: 1900, label: "Slots refilled monthly" },
            { value: 11, suffix: "%", label: "More patients seen" },
            { value: 0, label: "Extra front-desk hires" },
          ],
        },
        {
          id: "saltmarsh",
          name: "Saltmarsh",
          industry: "Hospitality",
          tagline: "Boutique hotels on the coast.",
          summary: "How Saltmarsh priced every room, every night, from one weather-aware model.",
          field: { colors: ["#cfe0dc", "#6f9a95", "#2f5d63", "#f5e7c8", "#0b1c20"], angle: -0.25 },
          mark: 5,
        },
      ]}
      casesPage={{ title: "Work we're proud of.", subtitle: "Three teams, three problems, one approach: get the numbers right first.", pageSize: 2 }}
      testimonials={[{ text: "They made our data boring — the highest compliment there is.", name: "Iris Calder", role: "Head of Buying, Brightloom" }]}
      insights={{ items: [] }}
      cta={{ title: "Let's make your numbers boring.", subtitle: "Thirty minutes. Bring your messiest report.", action: { label: "Talk to us", href: "#book" }, note: "We reply within a day.", field: "dusk" }}
      footer={{
        tagline: "Data engineering\nfor teams that ship.",
        socials: [{ kind: "linkedin" }, { kind: "x" }],
        credit: { label: "Site by", name: "Tidewell Studio" },
      }}
      onBook={async (booking) => {
        console.log("book", booking)
        await new Promise((r) => setTimeout(r, 700))
        return true
      }}
    />
  )
}
