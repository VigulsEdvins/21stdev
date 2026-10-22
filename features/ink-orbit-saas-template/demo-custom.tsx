"use client"

import InkOrbitSaasTemplate from "@/components/ui/ink-orbit-saas-template"

// Someone else's product on the same template: a support-ops tool, its own
// sculpture seed, copy, plans and testimonials, and handlers wired to a backend.
export default function DemoCustom() {
  return (
    <InkOrbitSaasTemplate
      brand="Tessellate"
      navCta="Book a call"
      sculptureSeed={4211}
      hero={{
        titleTop: "Resolve Tickets With",
        titleAccent: ["Quiet Precision", "Fewer Escalations"],
        description: "Tessellate reads every ticket, drafts the reply, routes the hard ones and writes the weekly report — so your support team works the queue, not the tools.",
        primaryCta: "Try it free",
        secondaryCta: "See it work",
      }}
      features={{
        tag: "Platform",
        title: "One *queue*,\nzero busywork",
        integrations: { title: "Plugs into your desk", description: "Inbox, chat, CRM and docs connect in minutes, no engineers needed.", tools: ["Tables", "Files", "Docs", "Search"] },
        insights: { title: "Volume forecasts", description: "See next week’s ticket spike before it lands and staff for it.", values: [40, 38, 45, 43, 50, 47, 55, 61, 58, 66], forecastFrom: 7 },
      }}
      testimonialsTag="Customers"
      testimonialsTitle="Support teams *sleep*\nbetter."
      testimonials={[
        { quote: "First-response time dropped from four hours to nine minutes.", name: "Hana O.", role: "Support Lead" },
        { quote: "The weekly report writes itself. I just forward it.", name: "Tomás G.", role: "Head of CX" },
        { quote: "Routing finally understands what a ticket is about.", name: "Ife A.", role: "Ops Manager", rating: 4 },
        { quote: "We covered a launch week without hiring temps.", name: "Jun P.", role: "COO" },
      ]}
      logos={["Brightdesk", "Kinfolk", "Meridian", "Parcel", "Tandem"]}
      pricing={{
        title: "Priced per *seat*,\nnot per ticket",
        subtitle: "Every plan includes unlimited tickets and a 30-day trial.",
        yearlyDiscount: 0.15,
        currency: "€",
        plans: [
          { name: "Team", description: "For a single support queue.", price: 29, features: ["Up to 10 seats", "AI drafts", "Smart routing"], cta: "Start trial" },
          { name: "Scale", description: "For multi-team support orgs.", price: 59, featured: true, badge: "Recommended", features: ["Unlimited seats", "Forecasting", "Weekly reports", "SLA tracking"], cta: "Start trial" },
          { name: "Custom", description: "Regulated industries and on-prem.", price: null, features: ["Data residency", "SAML SSO", "Dedicated CSM"], cta: "Contact us" },
        ],
      }}
      about={{
        title: "Made by former\n*support agents.*",
        body: "We spent years answering the same twelve questions. Tessellate is the colleague we wished we’d had.",
        stats: [
          { value: "2,300+", label: "Support teams" },
          { value: "91M", label: "Tickets triaged" },
          { value: "9min", label: "Median first response" },
          { value: "4.8/5", label: "G2 rating" },
        ],
      }}
      cta={{ title: "Clear the *queue.*", description: "Thirty days free. Bring your whole team.", button: "Start free" }}
      onReforge={(seed) => console.log("reforged", seed)}
      onSelectPlan={(plan, billing) => console.log("plan", plan, billing)}
      onSubscribe={(email) => new Promise((r) => setTimeout(() => r(console.log("subscribe", email)), 700))}
    />
  )
}
