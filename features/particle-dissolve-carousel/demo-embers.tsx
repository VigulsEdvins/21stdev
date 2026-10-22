"use client"

import * as React from "react"
import ParticleDissolveCarousel, { type ParticleDissolveItem } from "@/components/ui/particle-dissolve-carousel"

// The same carousel, turned up: every grain burns, the wave breaks out from a
// point, the dust is thick and the flow field curls harder. Four colour-field
// canvases painted at runtime, so nothing is fetched.
const W = 1800
const H = 1200

type Field = { ground: string; blocks: { y: number; h: number; color: string }[]; title: string; caption: string; eyebrow: string }

const FIELDS: Field[] = [
  {
    eyebrow: "Study 01 · Kiln",
    title: "Kiln",
    caption: "Heat held in a brick room long after the fire is out.",
    ground: "#5A1A12",
    blocks: [
      { y: 0.1, h: 0.42, color: "#E2542A" },
      { y: 0.6, h: 0.3, color: "#F2A03A" },
    ],
  },
  {
    eyebrow: "Study 02 · Tide",
    title: "Tide",
    caption: "Deep water over a band of light, the moment before it turns.",
    ground: "#0D1E3A",
    blocks: [
      { y: 0.08, h: 0.54, color: "#1F5FA8" },
      { y: 0.7, h: 0.2, color: "#7FD3E6" },
    ],
  },
  {
    eyebrow: "Study 03 · Ochre",
    title: "Ochre",
    caption: "Earth pigment, ground by hand, the oldest yellow there is.",
    ground: "#3A2410",
    blocks: [
      { y: 0.1, h: 0.25, color: "#C9772B" },
      { y: 0.42, h: 0.48, color: "#F0C04A" },
    ],
  },
  {
    eyebrow: "Study 04 · Cinder",
    title: "Cinder",
    caption: "What is left glowing when everything else has gone to ash.",
    ground: "#141012",
    blocks: [
      { y: 0.12, h: 0.36, color: "#3B2E36" },
      { y: 0.56, h: 0.32, color: "#C2362E" },
    ],
  },
]

function paintFields(): ParticleDissolveItem[] {
  const canvas = document.createElement("canvas")
  canvas.width = W
  canvas.height = H
  const c = canvas.getContext("2d")
  if (!c) return []
  return FIELDS.map((f) => {
    c.filter = "none"
    c.fillStyle = f.ground
    c.fillRect(0, 0, W, H)
    // Soft-edged blocks of colour, as if brushed in thin layers.
    for (const b of f.blocks) {
      for (let pass = 0; pass < 3; pass++) {
        c.filter = "blur(" + (28 - pass * 10) + "px)"
        c.globalAlpha = 0.55 + pass * 0.15
        c.fillStyle = b.color
        const inset = pass * 14
        c.fillRect(W * 0.1 + inset, H * b.y + inset, W * 0.8 - inset * 2, H * b.h - inset * 2)
      }
    }
    c.filter = "none"
    c.globalAlpha = 1
    // A whisper of canvas grain.
    const img = c.getImageData(0, 0, W, H)
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 14
      img.data[i] += n
      img.data[i + 1] += n
      img.data[i + 2] += n
    }
    c.putImageData(img, 0, 0)
    return {
      src: canvas.toDataURL("image/jpeg", 0.92),
      title: f.title,
      caption: f.caption,
      eyebrow: f.eyebrow,
      alt: f.title + ": soft blocks of colour on a " + f.title.toLowerCase() + " ground",
    }
  })
}

export default function DemoEmbers() {
  const [items, setItems] = React.useState<ParticleDissolveItem[]>([])
  React.useEffect(() => setItems(paintFields()), [])
  return (
    <ParticleDissolveCarousel
      items={items}
      pattern="radial"
      duration={3200}
      glow={1}
      dust={0.8}
      scatter={1.5}
      turbulence={1.6}
      backdrop="#140805"
      autoplay={6000}
    />
  )
}
