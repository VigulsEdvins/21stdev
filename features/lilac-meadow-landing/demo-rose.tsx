"use client"

import LilacMeadowLanding from "@/components/ui/lilac-meadow-landing"

// The same template re-planted in rose, with its own brand and copy.
export default function DemoRose() {
  return (
    <LilacMeadowLanding
      brand="Petalpay"
      tokenName="Rose Dollar"
      ticker="RUSD"
      palette="rose"
      hero={{
        title: "Savings in\nFull Bloom",
        subtitle: "A dollar that quietly earns while you sleep. Spend it like cash, hold it like a garden.",
        action: { label: "See it grow", href: "#calculator" },
      }}
      calculator={{ apy: 4.6, title: "Let it blossom", defaultDeposit: 2500 }}
      join={{ title: "Sow the first seed", action: "Get early access" }}
      onJoin={() => new Promise((r) => setTimeout(r, 900))}
    />
  )
}
