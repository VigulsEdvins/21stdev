"use client"

import TileScrollbar from "@/components/ui/tile-scrollbar"

// No [data-section] anywhere on this page, so there are no dots, no jump
// targets and no caption label — the tray falls back to plain progress.
const LOG: [string, string][] = [
  ["04:10", "Left the car park in the dark. Wind off the land, sea flat, tide still dropping."],
  ["04:35", "Top of the beach. Orange lichen on the dry rocks, black crust below it. Nothing moving."],
  ["04:50", "First barnacles. Closed. Two periwinkles in a crack, sealed shut, about the size of a lentil."],
  ["05:05", "Channel wrack here is crisp underfoot. Snaps rather than bends."],
  ["05:20", "Light enough to stop using the torch. Bladderwrack from this point down."],
  ["05:40", "Beadlet anemone on damp rock, closed, dark red. Left it alone."],
  ["05:55", "Sat at the big pool for ten minutes. Three prawns and a goby appeared once I stopped moving."],
  ["06:15", "Limpet scars everywhere on the flat slab. Counted eleven in one square metre."],
  ["06:30", "Low water. Kelp exposed at the far edge for the first time this month."],
  ["06:45", "Shore crab under the second stone, green, about 40mm. Claws up immediately."],
  ["07:00", "Common starfish in a gap under weed. Four full arms and one regrowing."],
  ["07:20", "Turned six stones, put all six back the same way up. Brittlestars under two of them."],
  ["07:40", "Tide turning. Channel behind the outcrop filling faster than expected."],
  ["07:55", "Back on dry sand. Everything returned to the pool it came from."],
  ["08:10", "Water already over the slab. Nothing left to show I was there."],
  ["08:30", "Home. Next low water tomorrow, fifty minutes later."],
]

export default function Demo() {
  return (
    <div className="bg-background text-foreground">
      <main
        id="shore-log"
        className="mx-auto max-w-[38rem] px-6 pt-[14vh] pb-[40vh] md:mr-[200px] md:ml-[max(1.5rem,5vw)] xl:mx-auto"
      >
        <h1 className="mb-2 text-4xl font-medium tracking-tight">Shore log</h1>
        <p className="mb-[16vh] text-muted-foreground">
          One spring tide, start to finish. No headings to jump between — the tray is pure
          position.
        </p>

        {LOG.map(([time, note]) => (
          <div key={time} className="flex gap-6 border-t border-border py-6">
            <span className="w-16 shrink-0 pt-1 font-mono text-sm tabular-nums text-muted-foreground">
              {time}
            </span>
            <p className="font-serif text-[1.125rem] leading-[1.6]">{note}</p>
          </div>
        ))}
      </main>

      <TileScrollbar
        controls="shore-log"
        label="Log position"
        sections=""
        columns={3}
        rows={10}
        compactColumns={10}
        compactBreakpoint={768}
        tileSize={24}
        hint={null}
        idleMs={2400}
      />
    </div>
  )
}
