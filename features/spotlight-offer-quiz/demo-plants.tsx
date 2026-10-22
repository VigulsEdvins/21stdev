import SpotlightOfferQuiz from "@/components/ui/spotlight-offer-quiz"

const U = (id: string) => "https://images.unsplash.com/photo-" + id + "?q=80&w=1600&auto=format&fit=crop"

export default function SpotlightOfferQuizPlantsDemo() {
  return (
    <SpotlightOfferQuiz
      variant="section"
      preset="chalk"
      darkPreset="graphite"
      grade="natural"
      height="100svh"
      kicker="Your first plant,"
      offer="£10 off"
      question="Where is it going to live? We'll match a plant that will actually like it there."
      optionsLabel="Where will your plant live?"
      image={U("1485955900006-10f4d324d411")}
      imageAlt="A potted plant against a pale wall"
      brand="Understory"
      code="NEWLEAF10"
      submitLabel={(o) => "Send my " + (o.pick || "plant") + " code"}
      finePrint="Valid on your first order over £30. We email twice a month, tops."
      options={[
        { label: "A bright windowsill", tag: "a bright windowsill", pick: "Fiddle-leaf fig", note: "Big glossy leaves that want morning sun and a steady spot.", image: U("1463936575829-25148e1db1b8"), href: "#fiddle-leaf-fig" },
        { label: "A shady corner", tag: "a shady corner", pick: "ZZ plant", note: "Happy in low light and fine if you forget it for a fortnight.", image: U("1501004318641-b39e6451bec6"), href: "#zz-plant" },
        { label: "The bathroom shelf", tag: "the bathroom", pick: "Boston fern", note: "Loves the steam. Give it a bright window and it will spill over.", image: U("1459411552884-841db9b3cc2a"), href: "#boston-fern" },
        { label: "My desk at work", tag: "your desk", pick: "Snake plant", note: "Upright, tidy and unbothered by office air conditioning.", image: U("1512428813834-c702c7702b78"), href: "#snake-plant" },
      ]}
    />
  )
}
