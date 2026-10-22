"use client"

import * as React from "react"
import TitleSequencePreloader from "@/components/ui/title-sequence-preloader"

// The default reel over a page: it plays while the page loads, lifts off, and
// the clouds part on whatever is underneath. Replay remounts it.
export default function Demo() {
  const [take, setTake] = React.useState(1)
  return (
    // w-full: 21st centres demos in a flex wrapper that would shrink this to 0px.
    <div className="w-full">
      <TitleSequencePreloader key={take}>
        <main className="flex min-h-[100svh] w-full flex-col items-center justify-center gap-6 bg-background px-6 text-center text-foreground">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Take {String(take).padStart(2, "0")} · cleared</p>
          <h1 className="max-w-2xl text-balance text-5xl font-semibold tracking-tight sm:text-6xl">Welcome aboard.</h1>
          <p className="max-w-md text-balance text-muted-foreground">
            Everything behind the titles loaded while they rolled. Your page goes here.
          </p>
          <button
            type="button"
            onClick={() => setTake((t) => t + 1)}
            className="rounded-full border border-border px-5 py-2 text-sm transition-colors hover:bg-foreground hover:text-background"
          >
            Roll the titles again
          </button>
        </main>
      </TitleSequencePreloader>
    </div>
  )
}
