"use client"

import * as React from "react"
import NeonKatakanaPreloader from "@/components/ui/neon-katakana-preloader"

// The real use: the preloader guards a page and opens onto it like a window.
export default function DemoGate() {
  const [run, setRun] = React.useState(0)

  return (
    <NeonKatakanaPreloader key={run}>
      <main className="flex min-h-full flex-col items-center justify-center gap-6 bg-background px-6 py-16 text-center text-foreground">
        <p className="font-mono text-xs uppercase tracking-[0.4em] text-muted-foreground">窓 · window open</p>
        <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">Signal received.</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          The window has opened. Whatever you pass as children sits here, mounted the whole time underneath.
        </p>
        <button
          type="button"
          onClick={() => setRun((n) => n + 1)}
          className="rounded-full border border-border px-5 py-2 text-sm hover:bg-primary hover:text-primary-foreground"
        >
          Replay the loader
        </button>
      </main>
    </NeonKatakanaPreloader>
  )
}
