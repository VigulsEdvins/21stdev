"use client"

import * as React from "react"
import AmourSunrisePreloader from "@/components/ui/amour-sunrise-preloader"

// The real use: the preloader guards a page, and the sun swallows the screen on the way out.
export default function DemoGate() {
  const [run, setRun] = React.useState(0)

  return (
    <AmourSunrisePreloader key={run} word="Bonjour" caption="the kettle is on">
      <main className="flex min-h-full flex-col items-center justify-center gap-6 bg-background px-6 py-16 text-center text-foreground">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Studio Amour · Spring</p>
        <h1 className="text-5xl font-semibold tracking-tight sm:text-7xl">Bonjour, you.</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          The sun has set on the loader. Whatever you pass as children sits here, mounted the whole time underneath.
        </p>
        <button
          type="button"
          onClick={() => setRun((n) => n + 1)}
          className="rounded-full border border-border px-5 py-2 text-sm hover:bg-primary hover:text-primary-foreground"
        >
          Replay the loader
        </button>
      </main>
    </AmourSunrisePreloader>
  )
}
