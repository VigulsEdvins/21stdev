"use client"

import * as React from "react"
import EngravedTicket from "@/components/ui/engraved-ticket"

export default function DemoCustom() {
  const [breaths, setBreaths] = React.useState(0)
  return (
    <div className="flex w-full flex-col items-center gap-10 bg-[#0b0a0a] px-4 py-16 sm:px-10">
      {/* Box breathing on cobalt stock. */}
      <EngravedTicket
        word="Exhale"
        variant="paper"
        accent="#2346d8"
        ground="#e9e6dc"
        tagline={"Side A\nTrack 04"}
        quote={"“Four in, four out”"}
        body="Box breathing: four seconds in, four held, four out, four held. Used by divers, surgeons and anyone else who has to keep their hands steady while everything else is not."
        rhythm={[4, 4, 4, 4]}
        phases={["In", "Hold", "Out", "Hold"]}
        seed={21}
        splats={7}
        onBreath={setBreaths}
      />
      {/* An acid-green ornament plate, no auto-rhythm: it waits to be held. */}
      <EngravedTicket
        word="Stay"
        variant="crimson"
        accent="#b8f23a"
        ground="#0a0d08"
        dot={2}
        breathe={false}
        seed={3}
        code="STAY-0003"
        quote={"“Hold the line”"}
      />
      <p className="text-center text-xs uppercase tracking-[0.3em] text-neutral-500">
        Breaths completed on the first ticket: {breaths}
      </p>
    </div>
  )
}
