"use client"

import * as React from "react"
import AnimatorTitlePreloader from "@/components/ui/animator-title-preloader"

// The real use: the title card guards the portfolio, then irises open onto it.
export default function DemoGate() {
  const [run, setRun] = React.useState(0)

  return (
    <AnimatorTitlePreloader key={run} durationMs={5200}>
      <main className="flex min-h-full flex-col items-center justify-center gap-6 bg-background px-6 py-16 text-center text-foreground">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Animation · Illustration · Motion</p>
        <h1 className="text-5xl font-semibold tracking-tight sm:text-7xl">Hello, I draw things that move.</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          The iris opened onto your page. Whatever you pass as children sits here, mounted the whole time underneath.
        </p>
        <button
          type="button"
          onClick={() => setRun((n) => n + 1)}
          className="rounded-full border border-border px-5 py-2 text-sm hover:bg-primary hover:text-primary-foreground"
        >
          Replay the title card
        </button>
      </main>
    </AnimatorTitlePreloader>
  )
}
