"use client"

import * as React from "react"
import GridLoupeShader from "@/components/ui/grid-loupe-shader"

// The photographs from the original pen, plus the live settings.
const PHOTOS = [
  { label: "Flowers", src: "https://images.unsplash.com/photo-1777059269563-51fdb397358c?q=80&w=2000" },
  { label: "Snowy mountain", src: "https://images.unsplash.com/photo-1648723906701-260f1be9bd68?q=80&w=2000" },
  { label: "Prism", src: "https://images.unsplash.com/photo-1597589827317-4c6d6e0a90bd?q=80&w=2000" },
  { label: "Northern lights", src: "https://images.unsplash.com/photo-1680666032153-46856cdcb21f?q=80&w=2000" },
  { label: "Portrait", src: "https://images.unsplash.com/photo-1665174286799-5c51dcc9748a?q=80&w=2000" },
]
const DOTS = ["#ffffff", "#111111", "#ff5a36", "#ffd25e"]

const chip = (on: boolean): React.CSSProperties => ({
  padding: "6px 12px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,.35)",
  background: on ? "#fff" : "rgba(0,0,0,.35)",
  color: on ? "#111" : "#fff",
  font: "500 12px ui-sans-serif, system-ui, sans-serif",
  cursor: "pointer",
  backdropFilter: "blur(8px)",
})

export default function DemoPhotos() {
  const [photo, setPhoto] = React.useState(0)
  const [cell, setCell] = React.useState(85)
  const [dots, setDots] = React.useState(true)
  const [fade, setFade] = React.useState(false)
  const [dotColor, setDotColor] = React.useState(DOTS[0])

  return (
    <GridLoupeShader src={PHOTOS[photo].src} alt={PHOTOS[photo].label} cellSize={cell} dots={dots} fade={fade} dotColor={dotColor}>
      <div style={{ position: "absolute", left: 16, right: 16, bottom: 16, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        {PHOTOS.map((p, i) => (
          <button key={p.label} type="button" style={chip(i === photo)} onClick={() => setPhoto(i)}>
            {p.label}
          </button>
        ))}
        <label style={{ ...chip(false), display: "flex", gap: 8, alignItems: "center" }}>
          Cell {cell}
          <input type="range" min={25} max={250} value={cell} onChange={(e) => setCell(+e.target.value)} />
        </label>
        <button type="button" style={chip(dots)} onClick={() => setDots(!dots)}>Dots</button>
        <button type="button" style={chip(fade)} onClick={() => setFade(!fade)}>Fade</button>
        {DOTS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={"Dot colour " + c}
            onClick={() => setDotColor(c)}
            style={{ width: 22, height: 22, borderRadius: 999, background: c, cursor: "pointer", border: c === dotColor ? "2px solid #fff" : "1px solid rgba(255,255,255,.4)", boxShadow: c === dotColor ? "0 0 0 2px #111" : "none" }}
          />
        ))}
      </div>
    </GridLoupeShader>
  )
}
