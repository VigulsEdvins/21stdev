"use client"

import * as React from "react"
import SlatCountPreloader from "@/components/ui/slat-count-preloader"

// The real use: the slats guard a page, then the poster splits into blinds and
// slides off it. Underneath is a small photo carousel of Unsplash stock photos,
// served straight from Unsplash's image CDN (free to use under the Unsplash License).
// The images start loading while the gate is still counting, so they are
// usually ready by the time the blinds open.

const UNSPLASH = (id: string) => "https://images.unsplash.com/photo-" + id + "?q=80&w=600&auto=format&fit=crop"

const SLIDES = [
  { src: UNSPLASH("1774565784366-72db806a40f9"), title: "cable car station" },
  { src: UNSPLASH("1776031312164-f22c0edbdfb9"), title: "light-colored house" },
  { src: UNSPLASH("1777763517503-05d74f2e0008"), title: "cherry blossoms" },
  { src: UNSPLASH("1774651458632-17df84bad45e"), title: "bottles of drinks" },
  { src: UNSPLASH("1778360508753-dcb2afbeadc2"), title: "tree-lined road" },
  { src: UNSPLASH("1777221895589-2f81579e0dca"), title: "train window view" },
  { src: UNSPLASH("1777763517666-b9fd2c9b6a0c"), title: "sunlight streams" },
  { src: UNSPLASH("1777221895551-844a3c1243b3"), title: "seagulls" },
  { src: UNSPLASH("1777221895297-9878eb5e53f5"), title: "pink flowers" },
  { src: UNSPLASH("1777908724790-2ec0d06d8ff7"), title: "paddleboarding" },
]

const CAROUSEL_CSS = `
.scd-title { animation: scd-in 700ms cubic-bezier(0.34, 1.4, 0.64, 1) both; }
@keyframes scd-in { from { opacity: 0; transform: scale(0.5); filter: blur(2px); } to { opacity: 1; transform: scale(1); filter: blur(0); } }
@media (prefers-reduced-motion: reduce) { .scd-title { animation: none; } .scd-slide, .scd-track { transition: none !important; } }
`

function Chevron({ flip }: { flip?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={flip ? "M9 18l6-6-6-6" : "M15 18l-6-6 6-6"} />
    </svg>
  )
}

function Carousel() {
  const [active, setActive] = React.useState(2)
  const n = SLIDES.length
  const go = (i: number) => setActive(Math.max(0, Math.min(n - 1, i)))

  return (
    <div
      className="select-none text-foreground"
      tabIndex={0}
      aria-roledescription="carousel"
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(active - 1)
        if (e.key === "ArrowRight") go(active + 1)
      }}
    >
      <style>{CAROUSEL_CSS}</style>
      <div className="relative" style={{ width: "clamp(120px, 20vw, 240px)" }}>
        <div
          className="scd-track flex w-fit"
          style={{ transform: "translateX(" + (-active * 100) / n + "%)", transition: "transform 800ms cubic-bezier(0.22, 1.15, 0.36, 1)" }}
        >
          {SLIDES.map((s, i) => {
            const on = i === active
            return (
              <div
                key={s.title}
                className="scd-slide flex flex-col items-center bg-muted-foreground/15"
                style={{
                  width: "clamp(120px, 20vw, 240px)",
                  transform: "translateY(" + (on ? 0 : active > i ? -100 : 100) + "%) scale(" + (on ? 1 : 0.8) + ")",
                  transition: "transform 600ms ease-in-out",
                }}
              >
                <img
                  src={s.src}
                  alt={s.title}
                  width={240}
                  height={320}
                  draggable={false}
                  onClick={() => go(i)}
                  onError={(e) => {
                    // A dead link keeps its frame instead of collapsing the strip.
                    e.currentTarget.style.visibility = "hidden"
                  }}
                  className="block cursor-pointer object-cover"
                  style={{ width: "100%", height: "auto", aspectRatio: "3 / 4", maxWidth: "none" }}
                />
              </div>
            )
          })}
        </div>
        <div className="pointer-events-none absolute bottom-0 left-full top-0 ml-3 flex items-center whitespace-nowrap text-xl font-medium" aria-live="polite">
          <span key={active} className="scd-title inline-block origin-left">
            {SLIDES[active].title}
          </span>
        </div>
      </div>

      <div className="absolute bottom-4 left-0 right-0 mx-auto flex w-fit items-center justify-center gap-4 rounded-full border border-border bg-background/60 px-2 text-muted-foreground shadow-sm backdrop-blur-sm">
        <button type="button" onClick={() => go(active - 1)} className="cursor-pointer p-2 hover:text-foreground" aria-label="Previous photo">
          <Chevron />
        </button>
        <div className="flex w-[180px] items-center justify-center gap-2">
          {SLIDES.map((s, i) => (
            <button
              key={s.title}
              type="button"
              aria-label={"Show " + s.title}
              onClick={() => go(i)}
              className={"h-2 cursor-pointer rounded-full bg-current transition-[width,opacity] duration-300 " + (i === active ? "w-7 opacity-100" : "w-2 opacity-30")}
            />
          ))}
        </div>
        <button type="button" onClick={() => go(active + 1)} className="cursor-pointer p-2 hover:text-foreground" aria-label="Next photo">
          <Chevron flip />
        </button>
      </div>
    </div>
  )
}

export default function DemoGate() {
  const [run, setRun] = React.useState(0)

  return (
    <SlatCountPreloader key={run} label="Slat / Count — Field Notes" caption="Ten postcards from the slow train. Developing now.">
      <main className="relative flex min-h-full flex-col items-center justify-center overflow-hidden bg-background px-6 pb-24 pt-16 text-foreground">
        <p className="absolute left-6 top-6 z-10 text-xs uppercase tracking-[0.3em] text-muted-foreground">Field Notes · Vol. 07</p>
        <button
          type="button"
          onClick={() => setRun((n) => n + 1)}
          className="absolute right-6 top-5 z-10 rounded-full border border-border bg-background px-4 py-1.5 text-xs uppercase tracking-[0.2em] hover:bg-primary hover:text-background"
        >
          Replay loader
        </button>
        <div style={{ marginRight: "clamp(120px, 20vw, 240px)" }}>
          <Carousel />
        </div>
      </main>
    </SlatCountPreloader>
  )
}
