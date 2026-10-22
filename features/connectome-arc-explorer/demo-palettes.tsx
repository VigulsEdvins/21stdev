"use client"

import * as React from "react"
import ConnectomeArcExplorer from "@/components/ui/connectome-arc-explorer"

const PALETTES = {
  classic: { input: "#ea8a2e", output: "#3b88e6", accent: "#4f9f5b" },
  aurora: { input: "#e0508a", output: "#14a89a", accent: "#7a5cf0" },
  ember: { input: "#d9482b", output: "#c99216", accent: "#a8552b" },
} as const

const JUMPS = [
  { id: "PAM08", note: "γ4 reward" },
  { id: "PPL103", note: "γ2α′1 punishment" },
  { id: "KCg", note: "γ Kenyon cells" },
  { id: "MBON01", note: "γ5β′2a output" },
]

export default function DemoPalettes() {
  const [palette, setPalette] = React.useState<keyof typeof PALETTES>("aurora")
  const [selected, setSelected] = React.useState("PAM08")
  const [clicked, setClicked] = React.useState<string | null>(null)

  return (
    <div className="w-full bg-background px-3 py-8 text-foreground sm:px-6">
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          {(Object.keys(PALETTES) as (keyof typeof PALETTES)[]).map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={palette === p}
              onClick={() => setPalette(p)}
              className={
                "cursor-pointer rounded-full border border-border px-3 py-1 capitalize transition-colors duration-300 " +
                (palette === p ? "bg-foreground text-background" : "bg-transparent text-muted-foreground hover:text-foreground")
              }
            >
              {p}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-border" />
          {JUMPS.map((j) => (
            <button
              key={j.id}
              type="button"
              aria-pressed={selected === j.id}
              onClick={() => setSelected(j.id)}
              className={
                "cursor-pointer rounded-full border border-border px-3 py-1 transition-colors duration-300 " +
                (selected === j.id ? "text-foreground" : "text-muted-foreground hover:text-foreground")
              }
            >
              {j.id} <span className="text-muted-foreground">· {j.note}</span>
            </button>
          ))}
        </div>

        <ConnectomeArcExplorer
          colors={PALETTES[palette]}
          selected={selected}
          onSelectedChange={setSelected}
          defaultExpanded={["PAM", "PPL1"]}
          onRegionClick={(r) => setClicked(r.region + " (" + (r.side === "in" ? "input" : "output") + ") of " + r.cellType)}
        />
        <p className="text-[13px] text-muted-foreground">{clicked ? "Pinned " + clicked : "Click any region to pin it."}</p>
      </div>
    </div>
  )
}
