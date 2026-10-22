"use client"

import VinylHalftonePreloader from "@/components/ui/vinyl-halftone-preloader"

// The showcase: loads, lifts off a stand-in page, then plays again.
export default function Demo() {
  return (
    <VinylHalftonePreloader loop>
      <section
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeContent: "center",
          justifyItems: "center",
          gap: 18,
          background: "#1d070b",
          color: "#f2687c",
          fontFamily: 'Archivo, "Helvetica Neue", Arial, sans-serif',
          textAlign: "center",
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.32em", textTransform: "uppercase", opacity: 0.7 }}>
          Now playing — Side A
        </span>
        <h1
          style={{
            margin: 0,
            fontFamily: 'Anton, Impact, "Arial Narrow Bold", sans-serif',
            fontWeight: 400,
            fontSize: "clamp(56px, 13vw, 200px)",
            lineHeight: 0.86,
            textTransform: "uppercase",
            color: "#fff6c4",
            transform: "skewX(-7deg)",
            textShadow: "0.03em 0.03em 0 #d63250, 0.06em 0.06em 0 #f2687c",
          }}
        >
          Kedhareswer
        </h1>
        <span style={{ fontSize: 15, fontWeight: 600, opacity: 0.85 }}>Selected works, 2019 — 2026</span>
      </section>
    </VinylHalftonePreloader>
  )
}
