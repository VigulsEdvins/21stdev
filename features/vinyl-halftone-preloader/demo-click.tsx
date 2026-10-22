"use client"

import * as React from "react"
import VinylHalftonePreloader from "@/components/ui/vinyl-halftone-preloader"

// Your own copy and colours, and a gate that waits for a press: the last stage
// turns into a button at 100. Handy when the page behind starts audio.
export default function DemoClick() {
  const [take, setTake] = React.useState(0)
  return (
    <VinylHalftonePreloader
      key={take}
      enter="click"
      preset="cobalt"
      title="Mira Okafor"
      subtitle="motion & interaction"
      loadingWord="Warming"
      readyWord="Live"
      credits={["Studio Reel", "Take " + String(take + 1).padStart(2, "0")]}
      ringText="Side B  ·  45 RPM  ·  Motion Reel  ·  Lagos — Berlin  ·  "
      stages={["Rewind", "Cue up", "Drop", "Enter"]}
      bpm={96}
      durationMs={3600}
    >
      <section
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeContent: "center",
          justifyItems: "center",
          gap: 22,
          background: "#05081f",
          color: "#f2f5ff",
          fontFamily: 'Archivo, "Helvetica Neue", Arial, sans-serif',
          textAlign: "center",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: 'Anton, Impact, "Arial Narrow Bold", sans-serif',
            fontWeight: 400,
            fontSize: "clamp(48px, 11vw, 170px)",
            lineHeight: 0.86,
            textTransform: "uppercase",
            transform: "skewX(-7deg)",
            textShadow: "0.03em 0.03em 0 #1f2fc4, 0.06em 0.06em 0 #5370ff",
          }}
        >
          Mira Okafor
        </h1>
        <button
          type="button"
          onClick={() => setTake((t) => t + 1)}
          style={{
            font: "800 12px/1 Archivo, Arial, sans-serif",
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            color: "#05081f",
            background: "#5370ff",
            border: 0,
            borderRadius: 999,
            padding: "14px 22px",
            cursor: "pointer",
          }}
        >
          Drop the needle again
        </button>
      </section>
    </VinylHalftonePreloader>
  )
}
