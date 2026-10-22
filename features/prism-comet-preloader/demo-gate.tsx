"use client"

import * as React from "react"
import PrismCometPreloader from "@/components/ui/prism-comet-preloader"

// The real use: the preloader guards a page, and the camera pushes through
// the star-shaped portal onto it at the end.
export default function DemoGate() {
  const [run, setRun] = React.useState(0)

  return (
    <PrismCometPreloader key={run} word="Halcyon" caption="Studio reel · 2026">
      <main className="flex min-h-full flex-col items-center justify-center gap-6 bg-background px-6 py-16 text-center text-foreground">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Halcyon · Motion studio</p>
        <h1 className="text-5xl font-semibold tracking-tight sm:text-7xl">You came through the star.</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Whatever you pass as children sits here, mounted the whole time underneath, and shows through the portal as the
          camera pushes in.
        </p>
        <button
          type="button"
          onClick={() => setRun((n) => n + 1)}
          className="rounded-full border border-border px-5 py-2 text-sm hover:bg-primary hover:text-primary-foreground"
        >
          Replay the loader
        </button>
      </main>
    </PrismCometPreloader>
  )
}
