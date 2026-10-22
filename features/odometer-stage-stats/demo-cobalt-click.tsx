import OdometerStageStats from "@/components/ui/odometer-stage-stats"

const stats = [
  {
    value: "$2.4B",
    label: "invoiced through Tallyline in 2025",
    word: "Invoiced",
    story:
      "Across 31 currencies, from freelance retainers to freight forwarders billing in six figures. Every invoice carries its own payment link.",
    source: "Platform data, Jan to Dec 2025",
  },
  {
    value: "61%",
    label: "of invoices paid before the due date",
    word: "On time",
    story:
      "The reminder goes out when the client opens the invoice, not on a fixed schedule. Paying early stopped being something people forget.",
    source: "Invoices due in Q4 2025",
  },
  {
    value: "3",
    label: "days to close the month, down from nine",
    word: "Close",
    story:
      "Payments match themselves to invoices as they land, so month end is a review of exceptions instead of a week of spreadsheets.",
    source: "Median of 412 finance teams surveyed",
  },
  {
    value: "12K",
    label: "finance teams run their receivables here",
    word: "Teams",
  },
]

export default function OdometerStageStatsCobaltDemo() {
  return (
    <div className="w-full">
      <OdometerStageStats
        mode="click"
        preset="cobalt"
        height="min(760px, 100svh)"
        title="Tallyline in numbers"
        stats={stats}
        cta={{ label: "Start free trial", href: "#signup" }}
      />
    </div>
  )
}
