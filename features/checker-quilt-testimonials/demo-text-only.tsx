import CheckerQuiltTestimonials from "@/components/ui/checker-quilt-testimonials"

// No photos: the plates carry a figure from each story instead (a logo URL works too).
export default function CheckerQuiltTextOnlyDemo() {
  return (
    <div className="w-full">
      <CheckerQuiltTestimonials
        preset="mint"
        heading="Finance teams that closed the month early."
        cta={{ label: "See pricing", href: "#pricing" }}
        autoplay={0}
        testimonials={[
          {
            quote: "Month-end used to take us nine working days. We closed September in four, and nobody stayed past six.",
            name: "Amara Okafor",
            context: "Controller, Fieldnote Coffee",
            stat: { value: "9 → 4", label: "working days to close the month" },
          },
          {
            quote: "The receipt matching alone pays for it. Our auditors asked which firm we had hired.",
            name: "Jonas Weber",
            context: "CFO, Brightline Studio",
            stat: { value: "2,140", label: "receipts matched in the first week" },
          },
          {
            quote: "I approve spend from my phone between site visits. The team stopped chasing me on Slack.",
            name: "Lucía Herrera",
            context: "Founder, Herrera Build",
            stat: { value: "38 s", label: "median time to approve a purchase" },
          },
          {
            quote: "Setup took an afternoon. It read our old spreadsheets better than we did.",
            name: "Sam Patel",
            context: "Operations lead, Northpaw Vets",
            stat: { value: "1 afternoon", label: "from sign-up to first report" },
          },
        ]}
      />
    </div>
  )
}
