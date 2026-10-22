"use client"

import GridLoupeShader from "@/components/ui/grid-loupe-shader"

// The built-in still life is painted at runtime: no image files, no requests.
export default function Demo() {
  return (
    <GridLoupeShader>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "clamp(20px,4vw,48px)",
          color: "#fff",
          fontFamily: "ui-serif, Georgia, 'Times New Roman', serif",
          textShadow: "0 1px 12px rgba(0,0,0,.45)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, letterSpacing: ".14em", textTransform: "uppercase", fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
          <span>Study No. 07</span>
          <span>Ranunculus asiaticus</span>
        </div>
        <div>
          <div style={{ fontSize: "clamp(44px,8vw,112px)", lineHeight: 0.92, fontStyle: "italic", letterSpacing: "-.02em" }}>
            Look closer.
          </div>
          <div style={{ marginTop: 14, fontSize: 13, letterSpacing: ".14em", textTransform: "uppercase", fontFamily: "ui-sans-serif, system-ui, sans-serif", opacity: 0.8 }}>
            Move fast to widen the loupe
          </div>
        </div>
      </div>
    </GridLoupeShader>
  )
}
