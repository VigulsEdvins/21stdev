"use client"

import * as React from "react"
import TypeRemixPreloader from "@/components/ui/type-remix-preloader"

// The real use: the gate guards a portfolio page, plays its seven takes while
// the page loads, pulls back to the moodboard and bursts off the page beneath.
// "Replay intro" remounts it.

const WORK = [
  { t: "Halden Coffee", k: "Packaging", c: "#e5432f" },
  { t: "Night Ferry", k: "Motion", c: "#2d2b7d" },
  { t: "Moss & Co.", k: "Branding", c: "#d8f03c" },
]

export default function DemoGate() {
  const [key, setKey] = React.useState(0)
  return (
    <TypeRemixPreloader key={key} height="100svh">
      <main className="flex flex-col justify-between bg-background text-foreground" style={{ height: "100svh", padding: "clamp(20px, 4vw, 48px)" }}>
        <header className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <span>Ines Calder — Graphic Design</span>
          <button onClick={() => setKey((k) => k + 1)} className="rounded-full border border-border px-4 py-2 hover:bg-foreground hover:text-background transition-colors">
            Replay intro
          </button>
        </header>
        <h1 className="font-black uppercase leading-[0.85] tracking-tight" style={{ fontSize: "clamp(48px, 12vw, 180px)" }}>
          Portfolio
          <br />
          <span className="text-muted-foreground">2025 — 26</span>
        </h1>
        <ul className="grid gap-4 sm:grid-cols-3">
          {WORK.map((w) => (
            <li key={w.t} className="flex items-end justify-between rounded-xl p-5 text-sm font-semibold" style={{ background: w.c, color: w.c === "#d8f03c" ? "#111" : "#fff", minHeight: 120 }}>
              <span>{w.t}</span>
              <span className="text-xs uppercase tracking-widest opacity-70">{w.k}</span>
            </li>
          ))}
        </ul>
      </main>
    </TypeRemixPreloader>
  )
}
