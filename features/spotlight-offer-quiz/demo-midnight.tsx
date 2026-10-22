import SpotlightOfferQuiz from "@/components/ui/spotlight-offer-quiz"

export default function SpotlightOfferQuizMidnightDemo() {
  return (
    <SpotlightOfferQuiz
      variant="section"
      preset="midnight"
      collectEmail={false}
      kicker="Your first bag gets"
      offer="Free shipping"
      question="What are you after this month? We'll start you on the right bag."
      optionsLabel="What are you after?"
      code="SHIPFREE"
      brand="Kettle & Crow"
      options={[
        { label: "Something dark and heavy", tag: "dark and heavy", pick: "Night Shift", note: "Brazil and Ethiopia. Dark chocolate, cherry, a thick crema.", href: "#night-shift" },
        { label: "Bright and fruity", tag: "bright and fruity", pick: "Kiboko Highlands", note: "Washed Kenyan. Blackcurrant, cane sugar, a clean finish.", href: "#kiboko" },
        { label: "Decaf that tastes like coffee", tag: "real decaf", pick: "Late Train", note: "Sugarcane-processed Colombian. Caramel and orange, no jitters.", href: "#late-train" },
      ]}
    />
  )
}
