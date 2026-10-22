"use client"

import MaroonFintechLanding from "@/components/ui/maroon-fintech-landing"

// Everything is a prop. A different brand on the forest palette, its own
// headline, cards, wallets and stats, and a real handler for the demo form.
export default function DemoCustom() {
  return (
    <MaroonFintechLanding
      brand="ledgerly."
      palette="forest"
      backer={{ prefix: "Trusted by", name: "4,000 finance teams", mark: "✓" }}
      title={"Close the books\n*in a single* afternoon"}
      subtitle="Reconcile, report and forecast from one calm workspace."
      primaryAction={{ label: "Start free trial", href: "#contact" }}
      info={{
        label: "/why/",
        text: "Ledgerly matches every transaction to its receipt, *flags what doesn't add up and drafts your month-end report before you ask.*",
      }}
      statCards={[
        {
          title: "Cash Out",
          periods: [
            {
              label: "Month",
              range: "Sep 01, 2026 - Sep 30, 2026",
              amount: 48210.4,
              change: -4.2,
              categories: [
                { label: "Payroll", value: 31200 },
                { label: "Software", value: 6810.4 },
                { label: "Travel", value: 4200 },
                { label: "Office", value: 6000 },
              ],
            },
            {
              label: "Week",
              range: "Sep 24, 2026 - Sep 30, 2026",
              amount: 9020,
              change: 2.1,
              categories: [
                { label: "Software", value: 2820 },
                { label: "Travel", value: 1200 },
                { label: "Office", value: 5000 },
              ],
            },
          ],
        },
        {
          title: "Cash In",
          periods: [
            {
              label: "Month",
              range: "Sep 01, 2026 - Sep 30, 2026",
              amount: 126400,
              change: 11.8,
              categories: [
                { label: "Subscriptions", value: 98400 },
                { label: "Services", value: 21000 },
                { label: "Interest", value: 7000 },
              ],
            },
          ],
        },
      ]}
      about={{
        kicker: "Why Ledgerly",
        statement:
          "Ledgerly {mark} gives controllers their evenings back: automatic reconciliation, live cash positions and reports your board will actually read.",
        stats: [
          { value: 4000, suffix: "+", label: "Finance teams" },
          { value: 3.5, decimals: 1, suffix: "×", label: "Faster month-end close" },
          { value: 12, prefix: "$", suffix: "B", label: "Reconciled every month" },
        ],
      }}
      features={{ kicker: "Inside the app", title: "Every *account,*\n*one* ledger", subtitle: "Wallets and spending side by side, in the currency you think in." }}
      wallet={{
        title: "Every currency, one balance",
        description: "Click a wallet to see the whole company in its currency.",
        growth: "+5.1% · This quarter",
        wallets: [
          { code: "USD", symbol: "$", balance: 912400, perUsd: 1 },
          { code: "EUR", symbol: "€ ", balance: 228900, perUsd: 0.92 },
          { code: "GBP", symbol: "£", balance: 84120, perUsd: 0.79 },
          { code: "JPY", symbol: "¥", balance: 9820000, perUsd: 151 },
        ],
      }}
      spending={{ title: "Spend heatmap", description: "Week by week, so the spikes explain themselves.", budget: 120000, seed: 21 }}
      cta={{ title: "Your next close, *already half done.*", subtitle: "Free for 30 days. No card, no sales call.", action: { label: "Start free trial", href: "#" } }}
      onRequestDemo={async (data) => {
        console.log("demo requested", data)
        await new Promise((r) => setTimeout(r, 700))
      }}
    />
  )
}
