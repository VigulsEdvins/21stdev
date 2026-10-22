"use client"

import PolaroidZineHero from "@/components/ui/polaroid-zine-hero"

/** One page: the carousel controls take themselves off. */
export default function DemoSingle() {
  return (
    <PolaroidZineHero
      slides={[
        {
          script: "Make the thing",
          tail: ["nobody asked you for,", "then show it"],
          note: ["Studio notes", "no. 07"],
          body: [
            "A brief is a fence. Useful, until it is the",
            "only place you ever draw. The work that",
            "changes what you are hired for is almost",
            "never the work you were hired to do.",
            "So make the odd one. Put it out badly.",
            "The next brief comes from that.",
          ],
        },
      ]}
      issue="ISSUE 07"
      handle="@STUDIO.NOTES"
    />
  )
}
