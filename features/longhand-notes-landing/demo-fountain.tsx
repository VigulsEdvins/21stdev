"use client"

import LonghandNotesLanding from "@/components/ui/longhand-notes-landing"

export default function DemoFountain() {
  return (
    <LonghandNotesLanding
      brand="penpal"
      palette="fountain"
      hero={{
        title: "Close the deal.\nThen + write.",
        cta: "Write your first card",
        note: "Thank-you notes for agents and advisors.\nFrom {price} a card, stamped.",
        letterhead: "HOLLIS REALTY",
        address: "220 ELM AVE",
        envelopes: ["Ana & Theo Lind\n12 Maple Street\nBurlington, VT", "Mr. D. Okafor\n88 Harbor View\nBurlington, VT"],
        card: "welcome",
        hand: "script",
        ink: "black",
        letters: [
          {
            greeting: "Dear Ana & Theo,",
            body: "Congratulations on the keys to Maple Street! It was a joy to help you find a home with that much light. Enjoy the first night in.",
            sign: "June Hollis",
          },
          {
            greeting: "Hi Mr. Okafor,",
            body: "Thank you for trusting me with your sale. If any neighbours ever ask about the market, I would love an introduction.",
            sign: "June",
          },
        ],
      }}
      composer={{
        greeting: "Dear Ana & Theo,",
        message: "Happy one year in the new house! I hope the garden came back as green as you hoped.",
        signoff: "Warmly, June",
        hand: "casual",
        ink: "black",
      }}
      pricing={{
        products: [
          { id: "postcard", name: "Postcard", size: "4 x 6 in", base: 2.95 },
          { id: "flat", name: "Flat card", size: "5 x 7 in", base: 3.45 },
          { id: "folded", name: "Folded card", size: "5 x 7 in, folded", base: 4.15 },
        ],
      }}
      samples={{
        title: "See the ink before you buy.",
        script: "Welcome home",
        text: "Three sample cards in your mailbox, written by the robots in your choice of hand.",
      }}
    />
  )
}
