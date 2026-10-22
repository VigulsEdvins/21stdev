"use client"

import InkOrbitPricing from "@/components/ui/ink-orbit-pricing"

// A support-desk product priced per seat, in euros, opening on yearly billing.
export default function DemoCustom() {
  return (
    <div className="w-full">
      <InkOrbitPricing
        theme="light"
        title={"Priced per *seat*,\nnot per ticket"}
        subtitle="Every plan includes unlimited tickets and a 30-day trial."
        yearlyDiscount={0.15}
        currency="€"
        defaultBilling="yearly"
        plans={[
          { name: "Team", description: "For a single support queue.", price: 29, features: ["Up to 10 seats", "AI drafts", "Smart routing"], cta: "Start trial" },
          { name: "Scale", description: "For multi-team support orgs.", price: 59, featured: true, badge: "Recommended", features: ["Unlimited seats", "Forecasting", "Weekly reports", "SLA tracking"], cta: "Start trial" },
          { name: "Custom", description: "Regulated industries and on-prem.", price: null, features: ["Data residency", "SAML SSO", "Dedicated CSM"], cta: "Contact us" },
        ]}
        onSelectPlan={(plan, billing) => console.log("plan", plan, billing)}
      />
    </div>
  )
}
