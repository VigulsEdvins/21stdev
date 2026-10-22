import WireboundInquiry from "@/components/ui/wirebound-inquiry"

export default function WireboundInquiryNotebookDemo() {
  return (
    <WireboundInquiry
      layout="notebook"
      preset="olive"
      studio="Fernhall Gardens"
      coverTitle={["FERN", "HALL"]}
      email="plots@fernhall.garden"
      socials={[{ label: "Instagram", href: "https://instagram.com" }]}
      reader="Tomas"
      replyTime="three days"
      questions={[
        {
          id: "space",
          tab: "Space",
          title: "What are we planting?",
          hint: "Circle all that apply.",
          options: ["Front garden", "Back garden", "Courtyard", "Roof terrace", "Allotment"],
          multiple: true,
        },
        {
          id: "size",
          tab: "Size",
          title: "Roughly how big?",
          options: ["Under 20 m²", "20 to 60 m²", "60 m² and up"],
        },
      ]}
      detailsTitle="Who's the gardener?"
      nextSteps={["Tomas reads it.", "A site visit, if it fits.", "A planting plan."]}
      copy={{ repliesWithin: "We answer within {time}" }}
    />
  )
}
