"use client"

import ColdFlameDrift from "@/components/ui/cold-flame-drift"

const sans = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
const mono = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace"

// The shader paints everything: no images, no fonts, no requests.
export default function Demo() {
  return (
    <ColdFlameDrift>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "clamp(20px, 4vw, 52px)",
          color: "#eaf6ff",
          fontFamily: sans,
          textShadow: "0 2px 24px rgba(0,0,0,.65)",
          background: "linear-gradient(to top, rgba(2,4,6,.7), rgba(2,4,6,0) 42%), linear-gradient(to bottom, rgba(2,4,6,.5), rgba(2,4,6,0) 18%)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, fontFamily: mono, fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase" }}>
          <span>Cold Flame / Drift</span>
          <span style={{ opacity: 0.7 }}>Riso study N° 042</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
          <h1
            style={{
              margin: 0,
              fontFamily: "ui-serif, Georgia, 'Times New Roman', serif",
              fontStyle: "italic",
              fontWeight: 400,
              fontSize: "clamp(56px, 11vw, 168px)",
              lineHeight: 0.86,
              letterSpacing: "-.035em",
            }}
          >
            Burn
            <br />
            cold.
          </h1>
          <p style={{ margin: 0, maxWidth: 260, fontFamily: mono, fontSize: 12, lineHeight: 1.7, letterSpacing: ".12em", textTransform: "uppercase", opacity: 0.8 }}>
            Move to stoke the flames.
            <br />
            Click to flare.
          </p>
        </div>
      </div>
    </ColdFlameDrift>
  )
}
