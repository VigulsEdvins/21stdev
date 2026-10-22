"use client"

import * as React from "react"
import ContributionSkyline from "@/components/ui/contribution-skyline"

const PALETTES = ["github", "halloween", "ocean", "ember", "grape", "mono"] as const

export default function DemoPalettes() {
  const [palette, setPalette] = React.useState<(typeof PALETTES)[number]>("ocean")
  const [view, setView] = React.useState<"2d" | "3d">("2d")
  const [picked, setPicked] = React.useState<string | null>(null)

  return (
    <div className="w-full bg-background px-4 py-10 text-foreground sm:px-8">
      <div className="mx-auto flex w-full max-w-[980px] flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          {PALETTES.map((p) => (
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
          <button
            type="button"
            onClick={() => setView((v) => (v === "2d" ? "3d" : "2d"))}
            className="cursor-pointer rounded-full border border-border px-3 py-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            Switch to {view === "2d" ? "3D" : "2D"}
          </button>
        </div>

        <ContributionSkyline
          palette={palette}
          view={view}
          onViewChange={setView}
          weekStart={1}
          seed={21}
          heightScale={1.15}
          unit="commit"
          footer={picked ?? "Click a day to pick it"}
          onCellClick={(d) => setPicked(d.count + (d.count === 1 ? " commit" : " commits") + " on " + d.date)}
        />
      </div>
    </div>
  )
}
