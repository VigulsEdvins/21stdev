"use client"

import * as React from "react"
import TitleSequencePreloader from "@/components/ui/title-sequence-preloader"

const CREW = [
  { name: "Mira Castellanos", role: "Vocals" },
  { name: "Tobias Rehn", role: "Guitar" },
  { name: "Aiko Mori", role: "Synths" },
  { name: "Joaquim Sá", role: "Bass" },
  { name: "Renée Fontaine", role: "Drums" },
  { name: "Idris Bello", role: "Lights" },
  { name: "Sunniva Aas", role: "Front of house" },
  { name: "Paulo Reis", role: "Stage" },
]

// Your own crew, date and inks, paced by a real loader instead of the timer.
export default function DemoCustom() {
  const [progress, setProgress] = React.useState(0)
  const [run, setRun] = React.useState(0)

  React.useEffect(() => {
    // Stand-in for real asset loading: requests settling at uneven intervals.
    let p = 0
    setProgress(0)
    const id = setInterval(() => {
      p = Math.min(100, p + Math.random() * 6.5)
      setProgress(p)
      if (p >= 100) clearInterval(id)
    }, 240)
    return () => clearInterval(id)
  }, [run])

  return (
    <div className="w-full">
      <TitleSequencePreloader
        key={run}
        progress={progress}
        credits={CREW}
        title="NIGHT SHIFT"
        location="LISBON"
        date="14.11.2026"
        shots={["moon", "target", "eclipse", "tunnel", "constellation", "monolith"]}
        shotMs={2100}
        accent="#ffb86b"
        hot="#ff5a36"
        marker="#ffe9a8"
        plate="#5c1d12"
        tint="#f7e8d4"
        shade="#0a0604"
        skipLabel="Skip intro"
      >
        <main className="flex min-h-[100svh] w-full flex-col items-center justify-center gap-5 bg-[#0d0806] px-6 text-center text-[#f7e8d4]">
          <p className="text-xs uppercase tracking-[0.34em] text-[#ffb86b]">Live · 14.11.2026 · Lisbon</p>
          <h1 className="text-balance text-5xl font-semibold tracking-tight sm:text-7xl">Night Shift</h1>
          <p className="max-w-md text-balance text-[#f7e8d4]/60">Doors at eight. The set list loaded behind the titles.</p>
          <button
            type="button"
            onClick={() => setRun((r) => r + 1)}
            className="rounded-full border border-[#f7e8d4]/30 px-5 py-2 text-sm transition-colors hover:bg-[#f7e8d4] hover:text-[#0d0806]"
          >
            Replay
          </button>
        </main>
      </TitleSequencePreloader>
    </div>
  )
}
