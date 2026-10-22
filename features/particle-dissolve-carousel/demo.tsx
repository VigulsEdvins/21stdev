"use client"

import * as React from "react"
import ParticleDissolveCarousel, { type ParticleDissolveItem } from "@/components/ui/particle-dissolve-carousel"

// Five places, painted here at runtime so the demo ships no image files and
// makes no network requests. Each is built from colour that reads well as
// dust: hard ridges, bright points, saturated fields.
const W = 1920
const H = 1200

type Ctx = CanvasRenderingContext2D

/** Seeded, so every visit paints the same five pictures. */
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const vgrad = (c: Ctx, y0: number, y1: number, stops: [number, string][]) => {
  const g = c.createLinearGradient(0, y0, 0, y1)
  for (const [o, col] of stops) g.addColorStop(o, col)
  return g
}

const glow = (c: Ctx, x: number, y: number, r: number, inner: string, outer: string) => {
  const g = c.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, inner)
  g.addColorStop(1, outer)
  c.fillStyle = g
  c.fillRect(x - r, y - r, r * 2, r * 2)
}

/** A smooth 1-D noise: a few sines at unrelated rates. */
const wave = (x: number, s: number) =>
  Math.sin(x * 0.0021 + s) * 0.5 + Math.sin(x * 0.0057 + s * 1.7) * 0.3 + Math.sin(x * 0.013 + s * 2.3) * 0.2

function dunes(c: Ctx) {
  c.fillStyle = vgrad(c, 0, H * 0.62, [
    [0, "#24164A"],
    [0.38, "#8A3A78"],
    [0.68, "#E8676A"],
    [0.88, "#FFA25A"],
    [1, "#FFD89A"],
  ])
  c.fillRect(0, 0, W, H)
  glow(c, W * 0.7, H * 0.5, 520, "rgba(255,226,170,0.75)", "rgba(255,170,110,0)")
  c.fillStyle = "#FFF4D8"
  c.beginPath()
  c.arc(W * 0.7, H * 0.5, 78, 0, Math.PI * 2)
  c.fill()
  // Dunes, far to near: each a sunlit windward face with a knife-edge crest
  // and a shadowed lee face falling away from the sun.
  const rand = rng(3)
  const rows = [
    { y: 0.6, k: 0.55, lit: "#F3A07C", litLow: "#E0806A", shade: "#B4566E" },
    { y: 0.68, k: 0.75, lit: "#F5935E", litLow: "#E2704C", shade: "#A3424F" },
    { y: 0.78, k: 1, lit: "#F28145", litLow: "#D9602F", shade: "#8C2E3A" },
    { y: 0.9, k: 1.35, lit: "#EC6E2F", litLow: "#C84B22", shade: "#71202E" },
    { y: 1.04, k: 1.8, lit: "#E35F24", litLow: "#B23C1A", shade: "#5C1726" },
  ]
  for (const R of rows) {
    const base = H * R.y
    let x = -200 - rand() * 300 * R.k
    while (x < W + 200) {
      const w = (420 + rand() * 380) * R.k
      const h = (80 + rand() * 90) * R.k
      const cx = x + w * (0.55 + rand() * 0.15)
      const cy = base - h
      const lf = x
      const rf = x + w
      c.fillStyle = vgrad(c, cy, base + 60 * R.k, [
        [0, R.lit],
        [1, R.litLow],
      ])
      c.beginPath()
      c.moveTo(lf, base)
      c.bezierCurveTo(lf + w * 0.3, base - h * 0.15, cx - w * 0.18, cy + h * 0.02, cx, cy)
      c.bezierCurveTo(cx + w * 0.08, cy + h * 0.3, rf - w * 0.12, base, rf, base)
      c.lineTo(rf, H)
      c.lineTo(lf, H)
      c.closePath()
      c.fill()
      c.fillStyle = vgrad(c, cy, base, [
        [0, R.shade],
        [1, R.litLow],
      ])
      c.beginPath()
      c.moveTo(cx, cy)
      c.bezierCurveTo(cx + w * 0.08, cy + h * 0.3, rf - w * 0.12, base, rf, base)
      c.lineTo(cx + (rf - cx) * 0.35, base + 6)
      c.bezierCurveTo(cx + (rf - cx) * 0.12, base - h * 0.35, cx + 2, cy + h * 0.25, cx, cy)
      c.fill()
      x += w * (0.55 + rand() * 0.3)
    }
  }
  // Two dead camelthorn trees on the near crest.
  c.strokeStyle = "#2A0E16"
  c.lineCap = "round"
  const tree = (x: number, y: number, s: number) => {
    const branch = (bx: number, by: number, len: number, ang: number, depth: number) => {
      const ex = bx + Math.cos(ang) * len
      const ey = by + Math.sin(ang) * len
      c.lineWidth = Math.max(1, depth * 1.6 * s)
      c.beginPath()
      c.moveTo(bx, by)
      c.lineTo(ex, ey)
      c.stroke()
      if (depth > 0) {
        branch(ex, ey, len * 0.72, ang - 0.45, depth - 1)
        branch(ex, ey, len * 0.68, ang + 0.38, depth - 1)
      }
    }
    branch(x, y, 46 * s, -Math.PI / 2 - 0.08, 5)
  }
  tree(W * 0.22, H * 0.93, 1.1)
  tree(W * 0.31, H * 0.95, 0.7)
}

function aurora(c: Ctx) {
  const rand = rng(7)
  c.fillStyle = vgrad(c, 0, H * 0.62, [
    [0, "#020514"],
    [0.6, "#071C33"],
    [1, "#0E3247"],
  ])
  c.fillRect(0, 0, W, H)
  for (let i = 0; i < 1100; i++) {
    const r = rand()
    c.fillStyle = "rgba(255,255,255," + (0.25 + r * 0.75).toFixed(2) + ")"
    c.fillRect(rand() * W, rand() * H * 0.6, r > 0.96 ? 2.6 : 1.4, r > 0.96 ? 2.6 : 1.4)
  }
  // Curtains of light: thin vertical strokes, added on top of each other.
  c.globalCompositeOperation = "lighter"
  const curtain = (seed: number, y0: number, hue: [string, string], reach: number) => {
    for (let x = -40; x < W + 40; x += 2) {
      const base = y0 + wave(x, seed) * 110 + Math.sin(x * 0.03 + seed) * 8
      const h = reach * (0.55 + 0.45 * (0.5 + 0.5 * wave(x * 1.7, seed + 3)))
      const g = c.createLinearGradient(0, base - h, 0, base)
      g.addColorStop(0, "rgba(0,0,0,0)")
      g.addColorStop(0.55, hue[1])
      g.addColorStop(0.92, hue[0])
      g.addColorStop(1, "rgba(0,0,0,0)")
      c.fillStyle = g
      c.fillRect(x, base - h, 2, h)
    }
  }
  curtain(1.3, H * 0.36, ["rgba(70,255,170,0.22)", "rgba(150,70,255,0.07)"], 380)
  curtain(4.1, H * 0.3, ["rgba(90,255,200,0.16)", "rgba(255,70,190,0.06)"], 300)
  curtain(8.7, H * 0.42, ["rgba(40,230,140,0.14)", "rgba(80,120,255,0.05)"], 240)
  c.globalCompositeOperation = "source-over"
  // Mountains with snow on their shoulders.
  const ridge = (x: number, s: number, base: number, amp: number) =>
    base -
    amp * Math.pow(Math.abs(Math.sin(x * 0.0024 + s)), 0.7) -
    Math.abs(wave(x * 2.4, s)) * amp * 0.35 -
    Math.abs(wave(x * 9, s + 1)) * amp * 0.08
  const range = (s: number, base: number, amp: number, rock: string, snow: string) => {
    c.beginPath()
    c.moveTo(0, H)
    for (let x = 0; x <= W; x += 4) c.lineTo(x, ridge(x, s, base, amp))
    c.lineTo(W, H)
    c.closePath()
    c.fillStyle = rock
    c.fill()
    c.save()
    c.clip()
    c.fillStyle = vgrad(c, base - amp * 1.3, base - amp * 0.6, [
      [0, snow],
      [1, "rgba(0,0,0,0)"],
    ])
    c.fillRect(0, 0, W, base)
    c.restore()
  }
  range(0.4, H * 0.66, 300, "#0B1A2A", "rgba(190,230,255,0.75)")
  range(2.2, H * 0.68, 180, "#06101C", "rgba(160,210,240,0.5)")
  // Still water: the sky again, upside down and darker, broken by ripples.
  const sea = H * 0.68
  c.save()
  c.translate(0, sea * 2)
  c.scale(1, -1)
  c.globalAlpha = 0.55
  c.drawImage(c.canvas, 0, 0, c.canvas.width, sea * (c.canvas.height / H), 0, 0, W, sea)
  c.restore()
  c.fillStyle = "rgba(2,10,22,0.45)"
  c.fillRect(0, sea, W, H - sea)
  for (let i = 0; i < 260; i++) {
    const y = sea + Math.pow(rand(), 1.6) * (H - sea)
    c.fillStyle = "rgba(150,255,210," + (0.03 + rand() * 0.07).toFixed(3) + ")"
    c.fillRect(rand() * W, y, 40 + rand() * 220, 1.5)
  }
}

function reef(c: Ctx) {
  const rand = rng(21)
  c.fillStyle = vgrad(c, 0, H, [
    [0, "#5ED8F0"],
    [0.3, "#1690C4"],
    [0.7, "#0A4D86"],
    [1, "#04193A"],
  ])
  c.fillRect(0, 0, W, H)
  // Light shafts from the surface.
  c.globalCompositeOperation = "lighter"
  for (let i = 0; i < 9; i++) {
    const x = W * (0.1 + i * 0.1) + rand() * 80
    const spread = 60 + rand() * 120
    c.fillStyle = vgrad(c, 0, H * 0.9, [
      [0, "rgba(220,255,255,0.16)"],
      [1, "rgba(220,255,255,0)"],
    ])
    c.beginPath()
    c.moveTo(x - 20, 0)
    c.lineTo(x + 30, 0)
    c.lineTo(x + spread + 200, H * 0.9)
    c.lineTo(x + spread - 60, H * 0.9)
    c.closePath()
    c.fill()
  }
  c.globalCompositeOperation = "source-over"
  // A school of fish, wheeling.
  for (let i = 0; i < 140; i++) {
    const t = i / 140
    const x = W * 0.58 + Math.cos(t * 9) * (180 + t * 160) + rand() * 40
    const y = H * 0.34 + Math.sin(t * 9) * (70 + t * 50) + rand() * 30
    c.fillStyle = rand() > 0.5 ? "#FFC24B" : "#FF8A3D"
    c.beginPath()
    c.ellipse(x, y, 9, 4, 0.25, 0, Math.PI * 2)
    c.fill()
    c.beginPath()
    c.moveTo(x - 8, y)
    c.lineTo(x - 15, y - 5)
    c.lineTo(x - 15, y + 5)
    c.fill()
  }
  // Coral: branching stems and sea fans along the floor.
  const colors = ["#FF5E6C", "#FF9F45", "#FF4FA3", "#B65CFF", "#FFD25E", "#FF7A59"]
  c.lineCap = "round"
  const branch = (x: number, y: number, len: number, ang: number, w: number, depth: number, col: string) => {
    const ex = x + Math.cos(ang) * len
    const ey = y + Math.sin(ang) * len
    c.strokeStyle = col
    c.lineWidth = w
    c.beginPath()
    c.moveTo(x, y)
    c.quadraticCurveTo(x + Math.cos(ang + 0.4) * len * 0.5, y + Math.sin(ang + 0.4) * len * 0.5, ex, ey)
    c.stroke()
    if (depth > 0) {
      branch(ex, ey, len * 0.78, ang - 0.3 - rand() * 0.3, w * 0.72, depth - 1, col)
      branch(ex, ey, len * 0.74, ang + 0.3 + rand() * 0.3, w * 0.72, depth - 1, col)
    } else {
      c.fillStyle = "#FFF1D6"
      c.beginPath()
      c.arc(ex, ey, w * 0.9, 0, Math.PI * 2)
      c.fill()
    }
  }
  c.fillStyle = vgrad(c, H * 0.82, H, [
    [0, "#0B2C4E"],
    [1, "#030F22"],
  ])
  c.beginPath()
  c.moveTo(0, H)
  for (let x = 0; x <= W; x += 8) c.lineTo(x, H * 0.86 + wave(x, 5) * 40)
  c.lineTo(W, H)
  c.fill()
  for (let i = 0; i < 26; i++) {
    const x = (i / 26) * W + rand() * 60
    const y = H * 0.88 + wave(x, 5) * 40
    const col = colors[Math.floor(rand() * colors.length)]
    if (rand() > 0.6) {
      // A sea fan: a fine-meshed disc.
      c.strokeStyle = col
      c.lineWidth = 2
      const r = 70 + rand() * 70
      for (let k = 0; k < 26; k++) {
        const a = Math.PI + (k / 25) * Math.PI
        c.beginPath()
        c.moveTo(x, y)
        c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 1.1)
        c.stroke()
      }
    } else {
      branch(x, y, 50 + rand() * 50, -Math.PI / 2 + (rand() - 0.5) * 0.5, 13, 4, col)
    }
  }
  c.strokeStyle = "rgba(230,255,255,0.55)"
  c.lineWidth = 1.5
  for (let i = 0; i < 70; i++) {
    c.beginPath()
    c.arc(W * 0.18 + rand() * 120, H * (0.15 + rand() * 0.7), 2 + rand() * 7, 0, Math.PI * 2)
    c.stroke()
  }
}

function poppies(c: Ctx) {
  const rand = rng(33)
  c.fillStyle = vgrad(c, 0, H * 0.5, [
    [0, "#3E8EDC"],
    [1, "#CDE7F7"],
  ])
  c.fillRect(0, 0, W, H)
  for (let i = 0; i < 14; i++) {
    const x = rand() * W
    const y = H * (0.08 + rand() * 0.26)
    for (let k = 0; k < 6; k++) glow(c, x + (rand() - 0.5) * 220, y + (rand() - 0.5) * 50, 60 + rand() * 70, "rgba(255,255,255,0.55)", "rgba(255,255,255,0)")
  }
  const hill = (base: number, amp: number, s: number, top: string, bottom: string) => {
    c.fillStyle = vgrad(c, base - amp, H, [
      [0, top],
      [1, bottom],
    ])
    c.beginPath()
    c.moveTo(0, H)
    for (let x = 0; x <= W; x += 6) c.lineTo(x, base - amp * (0.5 + 0.5 * wave(x * 0.6, s)))
    c.lineTo(W, H)
    c.fill()
  }
  hill(H * 0.52, 90, 1, "#86A9B8", "#8FB1A0")
  hill(H * 0.57, 80, 4, "#6E9A6A", "#5C8A4E")
  // A line of cypresses along the far ridge.
  for (let i = 0; i < 9; i++) {
    const x = W * 0.12 + i * 34 + rand() * 10
    const y = H * 0.52 - 30 * (0.5 + 0.5 * wave(x * 0.6, 4))
    const h = 70 + rand() * 50
    c.fillStyle = "#2C4A2A"
    c.beginPath()
    c.ellipse(x, y - h / 2, 9, h / 2, 0, 0, Math.PI * 2)
    c.fill()
  }
  hill(H * 0.66, 50, 7, "#7DAA4C", "#3F6E2A")
  // Poppies, in perspective: small and dense far off, big and loose up close.
  for (let i = 0; i < 2600; i++) {
    const t = Math.pow(rand(), 1.8)
    const y = H * 0.62 + t * H * 0.42
    const x = rand() * W
    const s = 1.5 + t * 22
    const pick = rand()
    c.fillStyle = pick > 0.94 ? "#F4F0FF" : pick > 0.88 ? "#9C6BE0" : pick > 0.4 ? "#E8261E" : "#FF4A2E"
    c.beginPath()
    c.ellipse(x, y, s, s * 0.7, 0, 0, Math.PI * 2)
    c.fill()
    if (s > 9) {
      c.fillStyle = "#1A0A0A"
      c.beginPath()
      c.arc(x, y - s * 0.05, s * 0.22, 0, Math.PI * 2)
      c.fill()
    }
  }
}

function neon(c: Ctx) {
  const rand = rng(48)
  c.fillStyle = vgrad(c, 0, H, [
    [0, "#07040F"],
    [0.55, "#2A0D45"],
    [1, "#0B0618"],
  ])
  c.fillRect(0, 0, W, H)
  glow(c, W * 0.5, H * 0.62, 900, "rgba(255,60,170,0.28)", "rgba(255,60,170,0)")
  const street = H * 0.7
  const signs = ["#FF2E88", "#21E6FF", "#FFB020", "#9D5CFF", "#3DFF9B"]
  let x = -20
  while (x < W) {
    const w = 90 + rand() * 170
    const h = 260 + rand() * 520
    const top = street - h
    c.fillStyle = rand() > 0.5 ? "#140A26" : "#0E0820"
    c.fillRect(x, top, w, h)
    // Windows.
    for (let wy = top + 18; wy < street - 20; wy += 22) {
      for (let wx = x + 10; wx < x + w - 14; wx += 18) {
        const r = rand()
        if (r > 0.62) continue
        c.fillStyle = r < 0.12 ? "rgba(33,230,255,0.75)" : r < 0.22 ? "rgba(255,46,136,0.7)" : "rgba(255,196,110," + (0.25 + rand() * 0.5).toFixed(2) + ")"
        c.fillRect(wx, wy, 9, 12)
      }
    }
    // A vertical neon sign on some.
    if (rand() > 0.45) {
      const col = signs[Math.floor(rand() * signs.length)]
      const sx = x + w * (0.2 + rand() * 0.5)
      const sy = top + 30 + rand() * 120
      c.save()
      c.shadowColor = col
      c.shadowBlur = 28
      c.strokeStyle = col
      c.lineWidth = 5
      c.strokeRect(sx, sy, 34, 150 + rand() * 120)
      c.fillStyle = col
      for (let k = 0; k < 4; k++) c.fillRect(sx + 10, sy + 18 + k * 34, 14, 18)
      c.restore()
    }
    x += w + 4 + rand() * 10
  }
  // Wet street: the skyline again, upside down, smeared and darker.
  c.save()
  c.translate(0, street * 2)
  c.scale(1, -1)
  c.globalAlpha = 0.5
  c.filter = "blur(6px)"
  c.drawImage(c.canvas, 0, 0, c.canvas.width, street * (c.canvas.height / H), 0, 0, W, street)
  c.restore()
  c.fillStyle = "rgba(8,4,20,0.35)"
  c.fillRect(0, street, W, H - street)
  // Rain.
  c.strokeStyle = "rgba(200,220,255,0.22)"
  c.lineWidth = 1.2
  for (let i = 0; i < 900; i++) {
    const rx = rand() * W
    const ry = rand() * H
    const len = 14 + rand() * 30
    c.beginPath()
    c.moveTo(rx, ry)
    c.lineTo(rx - len * 0.25, ry + len)
    c.stroke()
  }
}

const PLACES: { item: Omit<ParticleDissolveItem, "src">; paint: (c: Ctx) => void }[] = [
  {
    item: { eyebrow: "Namib · 05:42", title: "Dune Hour", caption: "The wind rebuilds every ridge overnight. By noon this one will be somewhere else.", alt: "Sharp-crested orange dunes under a pink dawn sky" },
    paint: dunes,
  },
  {
    item: { eyebrow: "Lofoten · 23:10", title: "Aurora Fjord", caption: "Charged particles, a hundred kilometres up, drawn into curtains by the field.", alt: "Green and violet aurora over snowy mountains reflected in a fjord" },
    paint: aurora,
  },
  {
    item: { eyebrow: "Raja Ampat · −18 m", title: "Coral Deep", caption: "A reef is built a grain at a time, and given back to the sea the same way.", alt: "Coloured coral and a school of orange fish in blue water" },
    paint: reef,
  },
  {
    item: { eyebrow: "Val d'Orcia · May", title: "Poppy Season", caption: "Three weeks of red, then seed, then gold. The field remembers.", alt: "A field of red poppies under rolling Tuscan hills and cypresses" },
    paint: poppies,
  },
  {
    item: { eyebrow: "Shinjuku · 01:24", title: "Neon Rain", caption: "Every sign in the street, doubled in the wet tarmac and broken by the rain.", alt: "Neon-lit city buildings at night reflected on a wet street" },
    paint: neon,
  },
]

function paintPlaces(): ParticleDissolveItem[] {
  const canvas = document.createElement("canvas")
  canvas.width = W
  canvas.height = H
  const c = canvas.getContext("2d")
  if (!c) return []
  return PLACES.map(({ item, paint }) => {
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.globalAlpha = 1
    c.globalCompositeOperation = "source-over"
    c.filter = "none"
    paint(c)
    return { ...item, src: canvas.toDataURL("image/jpeg", 0.92) }
  })
}

export default function Demo() {
  const [items, setItems] = React.useState<ParticleDissolveItem[]>([])
  React.useEffect(() => setItems(paintPlaces()), [])
  return <ParticleDissolveCarousel items={items} autoplay={5200} />
}
