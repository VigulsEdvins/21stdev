"use client"

import * as React from "react"
import StardustStagePreloader from "@/components/ui/stardust-stage-preloader"

// The real use: the preloader guards a page, and the camera pushes through
// the arch onto it at the end.
export default function DemoGate() {
  const [run, setRun] = React.useState(0)

  return (
    <StardustStagePreloader key={run} word="Lumen" caption="An evening of new work">
      <main className="flex min-h-full flex-col items-center justify-center gap-6 bg-background px-6 py-16 text-center text-foreground">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Lumen · Opening night</p>
        <h1 className="text-5xl font-semibold tracking-tight sm:text-7xl">The house is open.</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          The curtain has risen. Whatever you pass as children sits here, mounted the whole time underneath.
        </p>
        <button
          type="button"
          onClick={() => setRun((n) => n + 1)}
          className="rounded-full border border-border px-5 py-2 text-sm hover:bg-primary hover:text-primary-foreground"
        >
          Replay the loader
        </button>
      </main>
    </StardustStagePreloader>
  )
}
