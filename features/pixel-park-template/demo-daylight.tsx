"use client"

import PixelParkTemplate from "@/components/ui/pixel-park-template"

// The same park re-planted and re-written for another studio: daytime, a new
// seed for the trees and flowers, and its own copy throughout.
export default function Demo() {
  return (
    <PixelParkTemplate
      brand="Fieldnote Labs of Brooklyn"
      city="Brooklyn"
      cityCode="BKLYN"
      scene="day"
      seed={21}
      cta={{ label: "Join the beta", href: "#updates" }}
      mission={{
        title: "We make research assistants that read everything, so you don't have to.",
        founded: "June 2024",
        founders: [{ name: "Noor Haddad" }, { name: "Sam Okafor" }],
        tail: "after one too many weekends lost to PDFs.",
        backedBy: "Backed by Ferry Street Ventures",
      }}
      manifesto={{
        kicker: "Knowledge work is mostly finding things. Very little of it is thinking about them.",
        title: "We'd like to flip that ratio, starting with your reading list.",
      }}
      letter={{
        paragraphs: [
          "Every researcher we know has a folder called \"to read\" that only ever grows. We built Fieldnote to empty it: it reads the papers, keeps the notes, and tells you which three actually matter this week.",
          "We think the best tools disappear into the afternoon. You should notice the time you got back, not the software that gave it to you.",
        ],
        signers: ["Noor", "Sam"],
        stampValue: "50¢",
      }}
      details={[
        { label: "Studio", value: "214 Kent Avenue\nBrooklyn, NY 11249" },
        { label: "Press", value: "Download press kit", href: "#", kind: "download" },
        { label: "Say hello", value: "hi@fieldnote.example", href: "mailto:hi@fieldnote.example", kind: "email" },
      ]}
      closing={{ title: "Tools that read, so people can think", action: { label: "come build them with us", href: "#careers" } }}
      careers={{ title: "Read less, think more, in Brooklyn.", action: { label: "Open roles", href: "#contact" } }}
      credit="Fieldnote Labs"
    />
  )
}
