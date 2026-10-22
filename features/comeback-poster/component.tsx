"use client"

import * as React from "react"

/**
 * Comeback Poster — a full-bleed hero built like a printed gig poster: a paper
 * masthead with a swash title and a grid of theme words, sitting over an oil-
 * painted field of red poppies where a hooded figure in a white robe stands
 * with its empty face turned toward you.
 *
 * Everything is drawn here. The field is painted on two canvases (the poppies
 * behind the figure, then the ones in front of it): a hazy backdrop of hills,
 * a few thousand brush marks, and a few hundred live poppies on springs. The
 * figure, the star, the barcodes, the emblems and the contour lines are SVG.
 *
 * It answers you:
 *  - the poppies sway on their own and part around the pointer;
 *  - click or tap the field and a clutch of new poppies blooms there;
 *  - hover a theme word and the title decodes into it, click to keep it, and a
 *    gust runs across the field;
 *  - the masthead's contour lines swell around the pointer like a lens;
 *  - the figure's hood turns to follow you, and its red drips run on hover;
 *  - the dots in the bottom corners pause the wind and send a gust.
 *
 * One file. React is the only import. Fonts arrive by an injected <link>,
 * never a CSS import, and the poster still reads on the fallback stacks.
 * Reduced motion holds the field still and sets words without the decode.
 */

export type ComebackPalette = {
  /** The masthead. */
  paper: string
  /** Title, words, rules, the big star. */
  ink: string
  /** Every poppy and every drip. */
  poppy: string
  /** The ground under the poppies. */
  field: string
  /** Sky, hills and the mist on the horizon. */
  haze: string
  /** The figure's robe. */
  robe: string
  /** Type set over the painting: dates, notes, outlines. */
  mark: string
}

export type ComebackPosterProps = {
  /** The big word. First and last letters are set in the swash script. */
  title?: string
  /** Theme words under the title. 12 fill the grid the way the poster does. */
  keywords?: string[]
  /** Fired when a theme word is kept (or let go, with null). */
  onKeywordSelect?: (word: string | null) => void
  /** Left-hand date, any of `25.02.25`, `25/02/25`, `25 02 25`. */
  from?: string
  /** Right-hand date. */
  to?: string
  /** Fine print at the top of the masthead. */
  topNote?: string
  /** Fine print along the foot of the painting. */
  footNote?: string
  /** Small caption above the left barcode. */
  edition?: string
  /** Hex colours. Partial: anything missing keeps its default. */
  palette?: Partial<ComebackPalette>
  /** Live poppies in the field. The backdrop paints thousands more. */
  poppies?: number
  /** Changes the field, the drips and the barcodes. */
  seed?: number
  /** Show the hooded figure. */
  figure?: boolean
  /** Pointer and click interactions on the painting. */
  interactive?: boolean
  /** Stylesheet for the three faces below. `null` loads nothing. */
  fontHref?: string | null
  /** The title's caps. */
  displayFont?: string
  /** The title's first and last letters. */
  scriptFont?: string
  /** Theme words, dates and fine print. */
  labelFont?: string
  /** Root height. Must be a definite length. */
  height?: string
  className?: string
}

const DEFAULT_PALETTE: ComebackPalette = {
  paper: "#eae8e2",
  ink: "#3a2b27",
  poppy: "#d9301d",
  field: "#2b3226",
  haze: "#b4b4ad",
  robe: "#e2e1dc",
  mark: "#f5f2ec",
}

const KEYWORDS = [
  "Reunion", "Resume", "Passion", "Explore", "Focus", "Growth",
  "Hobby", "Return", "Triumph", "Wisdom",
  "Revival", "Legacy",
]

const TOP_NOTE =
  "Notes from a long winter: the studio lights stayed off, the brushes dried, the sketchbook kept its last page blank. " +
  "This is the first sheet off the press since. Printed on a field of poppies, for everyone who left something and came back for it."

const FOOT_NOTE =
  "After a long break from the work, I am returning to the field, slower and stranger and more certain than before. " +
  "Every return is a quiet one at first: one poppy, then a clutch of them, then the whole hill turns red. " +
  "This poster is for the ones you announce, and the ones you only make to yourself."

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,400..700&family=Pinyon+Script&family=Syncopate:wght@400;700&display=swap"

const DISPLAY = '"Bodoni Moda", "Bodoni 72", Didot, "Playfair Display", Georgia, serif'
const SCRIPT = '"Pinyon Script", "Snell Roundhand", "Apple Chancery", "Edwardian Script ITC", cursive'
const LABEL = 'Syncopate, Michroma, Eurostile, "Helvetica Neue", Arial, sans-serif'

// #region logic
type RGB = [number, number, number]

const rng = (seed: number) => {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

/** #rgb or #rrggbb. Anything else falls back, so the art never goes black. */
const hexRGB = (c: string, fallback: RGB): RGB => {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((c || "").trim())
  if (!m) return fallback
  const h = m[1].length === 3 ? m[1].replace(/./g, (x) => x + x) : m[1]
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
const mix = (a: RGB, b: RGB, t: number): RGB => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
]
const rgba = (c: RGB, a = 1) => "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"

/** The field's ground runs a little past the bottom edge, so the nearest heads overhang it. */
const FAR_BOTTOM = 1.08

/** Field depth, 0 at the horizon to 1 at the viewer's feet, to screen y and scale. */
const project = (z: number, horizon: number, H: number) => {
  const k = Math.pow(clamp01(z), 1.7)
  return { y: horizon + (H * FAR_BOTTOM - horizon) * k, s: 0.1 + 1.15 * Math.pow(clamp01(z), 1.35) }
}
/** The inverse: which depth a click at screen y lands on. */
const depthAt = (y: number, horizon: number, H: number) =>
  Math.pow(clamp01((y - horizon) / (H * FAR_BOTTOM - horizon)), 1 / 1.7)

/** Sprite variants: 0–5 open flowers, 6–7 nodding buds. */
const VARIANTS = 8

type Plant = { u: number; z: number; phase: number; variant: number; len: number; tilt: number }

/** Where the live poppies grow. Deterministic per seed, sorted far to near. */
const scatter = (seed: number, count: number) => {
  const r = rng(seed)
  const n = Math.max(0, Math.min(600, Math.round(count) || 0))
  const out: Plant[] = []
  for (let i = 0; i < n; i++) {
    out.push({
      u: -0.04 + r() * 1.08,
      z: 0.16 + 0.84 * Math.pow(r(), 0.75),
      phase: r() * Math.PI * 2,
      variant: r() < 0.14 ? 6 + Math.floor(r() * 2) : Math.floor(r() * 6),
      len: 1.4 + r() * 1.2,
      tilt: (r() - 0.5) * 0.5,
    })
  }
  return out.sort((a, b) => a.z - b.z)
}

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

/**
 * One frame of the title decode, p from 0 to 1. Letters settle left to right;
 * until then they flicker through random caps. Spaces never flicker.
 */
const scrambleAt = (from: string, to: string, p: number, rand: () => number) => {
  if (p >= 1) return to
  let s = ""
  const n = to.length
  for (let i = 0; i < n; i++) {
    const c = to[i]
    const settle = 0.25 + 0.75 * ((i + 1) / n)
    if (c === " " || p >= settle) s += c
    else if (p < 0.1 && i < from.length) s += from[i]
    else s += GLYPHS[Math.floor(rand() * GLYPHS.length)]
  }
  return s
}

const splitDate = (d: string) => d.split(/[.\/\-\s]+/).filter(Boolean)

/** The word grid: 6 / 4 / rest like the print, or rows of 4 on a narrow poster. */
const chunkRows = (words: string[], narrow: boolean) => {
  const rows: string[][] = []
  if (narrow) {
    for (let i = 0; i < words.length; i += 4) rows.push(words.slice(i, i + 4))
  } else {
    rows.push(words.slice(0, 6))
    if (words.length > 6) rows.push(words.slice(6, 10))
    if (words.length > 10) rows.push(words.slice(10))
  }
  return rows.filter((r) => r.length > 0)
}

/**
 * One contour line of the masthead. A slow double sine, pushed apart around
 * the pointer (px, py) by `amp` so the lines swell like a lens.
 */
const wavePath = (i: number, W: number, gap: number, px: number, py: number, amp: number) => {
  const base = (i + 0.5) * gap
  const steps = Math.max(8, Math.min(120, Math.round(W / 14)))
  const sigma = 70
  let d = ""
  for (let k = 0; k <= steps; k++) {
    const x = (k / steps) * W
    let y = base + 2.4 * Math.sin(x * 0.011 + i * 0.37) + 1.6 * Math.sin(x * 0.027 - i * 0.21)
    if (amp > 0) {
      const dx = x - px
      const dy = base - py
      y += dy * 0.55 * amp * Math.exp(-(dx * dx + dy * dy) / (sigma * sigma))
    }
    d += (k ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1)
  }
  return d
}

const easeOutBack = (t: number) => {
  const c = 1.6
  const x = clamp01(t) - 1
  return 1 + (c + 1) * x * x * x + c * x * x
}
// #endregion

// ---- painting -------------------------------------------------------------------

const makeCanvas = (w: number, h: number) => {
  const c = document.createElement("canvas")
  c.width = Math.max(1, Math.round(w))
  c.height = Math.max(1, Math.round(h))
  return c
}

/** One poppy head, painted once and stamped many times. */
const paintPoppy = (S: number, red: RGB, rand: () => number, bud: boolean) => {
  const cv = makeCanvas(S, S)
  const g = cv.getContext("2d")
  if (!g) return cv
  const c = S / 2
  const R = S * 0.36
  const dark = mix(red, [38, 4, 4], 0.62)
  const deep = mix(red, [24, 0, 0], 0.32)
  const light = mix(red, [255, 196, 160], 0.34)
  g.translate(c, c)

  if (bud) {
    // a nodding bud: hairy green sepals splitting over a crumpled red slit
    g.rotate(0.5 + rand() * 0.9)
    g.beginPath()
    g.ellipse(0, R * 0.1, R * 0.3, R * 0.46, 0, 0, Math.PI * 2)
    const gr = g.createLinearGradient(-R * 0.3, 0, R * 0.3, 0)
    gr.addColorStop(0, "rgb(122,134,96)")
    gr.addColorStop(1, "rgb(52,62,40)")
    g.fillStyle = gr
    g.fill()
    g.beginPath()
    g.moveTo(-R * 0.05, -R * 0.34)
    g.quadraticCurveTo(R * 0.12, R * 0.1, -R * 0.02, R * 0.52)
    g.lineWidth = R * 0.07
    g.strokeStyle = rgba(mix(red, [40, 0, 0], 0.25), 0.8)
    g.stroke()
    g.strokeStyle = "rgba(220,230,200,0.35)"
    g.lineWidth = S * 0.004
    for (let k = 0; k < 26; k++) {
      const a = rand() * Math.PI * 2
      const x = Math.cos(a) * R * 0.3
      const y = R * 0.1 + Math.sin(a) * R * 0.46
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x * 1.18, y * 1.1)
      g.stroke()
    }
    return cv
  }

  g.scale(1, 0.56 + rand() * 0.3)
  const base = rand() * Math.PI * 2
  const petals = [0, 1, 2, 3].map((k) => base + (k * Math.PI) / 2 + (rand() - 0.5) * 0.5)
  // back petals (upper half of the cup) first, the two facing us last
  petals.sort((a, b) => Math.sin(a) - Math.sin(b))
  for (const a of petals) {
    const front = Math.sin(a) > 0
    const ox = Math.cos(a) * R * 0.38
    const oy = Math.sin(a) * R * 0.38
    const pr = R * (0.6 + rand() * 0.12)
    const w1 = rand() * 6
    const w2 = rand() * 6
    g.beginPath()
    for (let i = 0; i <= 56; i++) {
      const t = (i / 56) * Math.PI * 2
      const rr = pr * (1 + 0.07 * Math.sin(5 * t + w1) + 0.04 * Math.sin(11 * t + w2))
      const x = ox + Math.cos(t) * rr
      const y = oy + Math.sin(t) * rr
      if (i) g.lineTo(x, y)
      else g.moveTo(x, y)
    }
    g.closePath()
    const grd = g.createRadialGradient(0, 0, R * 0.05, ox * 0.5, oy * 0.5, pr * 1.55)
    grd.addColorStop(0, rgba(dark))
    grd.addColorStop(0.35, rgba(front ? red : deep))
    grd.addColorStop(1, rgba(front ? light : red))
    g.fillStyle = grd
    g.fill()
    g.strokeStyle = rgba(dark, 0.4)
    g.lineWidth = S * 0.007
    g.stroke()
    // brush streaks, clipped to the petal
    g.save()
    g.clip()
    for (let k = 0; k < 9; k++) {
      const ang = a + (rand() - 0.5) * 1.5
      const r0 = R * 0.12
      const r1 = R * (0.7 + rand() * 0.5)
      g.beginPath()
      g.moveTo(ox * 0.3 + Math.cos(ang) * r0, oy * 0.3 + Math.sin(ang) * r0)
      g.quadraticCurveTo(
        ox + Math.cos(ang + 0.3) * r1 * 0.5,
        oy + Math.sin(ang + 0.3) * r1 * 0.5,
        ox + Math.cos(ang) * r1,
        oy + Math.sin(ang) * r1,
      )
      g.strokeStyle = rgba(rand() < 0.55 ? light : deep, 0.18 + rand() * 0.2)
      g.lineWidth = S * (0.008 + rand() * 0.022)
      g.stroke()
    }
    g.restore()
  }
  // the black blotch, a ring of stamens, the seed pod
  g.beginPath()
  g.ellipse(0, 0, R * 0.27, R * 0.25, 0, 0, Math.PI * 2)
  g.fillStyle = "rgba(16,9,9,0.92)"
  g.fill()
  g.fillStyle = "rgba(34,24,22,0.95)"
  for (let k = 0; k < 26; k++) {
    const t = (k / 26) * Math.PI * 2 + rand() * 0.2
    const rr = R * (0.2 + rand() * 0.11)
    g.beginPath()
    g.arc(Math.cos(t) * rr, Math.sin(t) * rr, S * 0.009, 0, Math.PI * 2)
    g.fill()
  }
  g.beginPath()
  g.ellipse(0, -R * 0.03, R * 0.13, R * 0.11, 0, 0, Math.PI * 2)
  g.fillStyle = "rgb(88,104,66)"
  g.fill()
  g.beginPath()
  g.ellipse(-R * 0.03, -R * 0.07, R * 0.05, R * 0.035, 0, 0, Math.PI * 2)
  g.fillStyle = "rgba(170,186,140,0.7)"
  g.fill()
  return cv
}

/** Sky, hills, mist and a few thousand brush marks. Painted once per size. */
const paintBackdrop = (
  g: CanvasRenderingContext2D,
  W: number,
  H: number,
  horizon: number,
  pal: { poppy: RGB; field: RGB; haze: RGB },
  seed: number,
  R: number,
) => {
  const r = rng(seed * 7 + 3)
  const { poppy, field, haze } = pal
  const white: RGB = [255, 255, 255]

  const sky = g.createLinearGradient(0, 0, 0, horizon)
  sky.addColorStop(0, rgba(mix(haze, [86, 90, 84], 0.35)))
  sky.addColorStop(1, rgba(mix(haze, white, 0.25)))
  g.fillStyle = sky
  g.fillRect(0, 0, W, horizon + 2)

  // three bands of hills, hazier with distance
  for (let b = 0; b < 3; b++) {
    const top = horizon - H * (0.075 - b * 0.024)
    const col = mix(haze, field, 0.18 + b * 0.24)
    const f1 = 1.2 + r() * 2
    const f2 = 4 + r() * 4
    const p1 = r() * 6
    const p2 = r() * 6
    g.beginPath()
    g.moveTo(0, H)
    for (let k = 0; k <= 90; k++) {
      const x = (k / 90) * W
      const t = x / W
      const y = top + H * 0.018 * (Math.sin(t * f1 * Math.PI + p1) * 0.6 + Math.sin(t * f2 * Math.PI + p2) * 0.4)
      g.lineTo(x, y)
    }
    g.lineTo(W, H)
    g.closePath()
    g.fillStyle = rgba(col)
    g.fill()
    g.lineCap = "round"
    for (let k = 0; k < W / 3; k++) {
      const x = r() * W
      const y = top + r() * (horizon - top + H * 0.02)
      const l = 4 + r() * 12
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x + l, y - l * 0.25)
      g.strokeStyle = rgba(r() < 0.5 ? mix(col, white, 0.3) : mix(col, [0, 0, 0], 0.25), 0.18)
      g.lineWidth = 1 + r() * 2
      g.stroke()
    }
  }

  const fg = g.createLinearGradient(0, horizon, 0, H)
  fg.addColorStop(0, rgba(mix(field, haze, 0.4)))
  fg.addColorStop(0.35, rgba(field))
  fg.addColorStop(1, rgba(mix(field, [0, 0, 0], 0.45)))
  g.fillStyle = fg
  g.fillRect(0, horizon, W, H - horizon)

  // the carpet: foliage strokes and far poppies, far to near
  const n = Math.min(16000, Math.round((W * H) / 80))
  const zs: number[] = []
  for (let i = 0; i < n; i++) zs.push(Math.pow(r(), 1.5))
  zs.sort((a, b) => a - b)
  const greens: RGB[] = [
    mix(field, white, 0.08),
    mix(field, [120, 132, 110], 0.5),
    mix(field, [0, 0, 0], 0.3),
    mix(field, haze, 0.45),
  ]
  for (const z of zs) {
    const { y, s } = project(z, horizon, H)
    const x = r() * W
    const redShare = 0.55 - 0.3 * z
    if (r() < redShare) {
      const rad = R * s * (0.22 + r() * 0.34)
      const tone = r()
      const col = tone < 0.3 ? mix(poppy, [40, 0, 0], 0.4) : tone > 0.8 ? mix(poppy, [255, 190, 160], 0.3) : poppy
      g.beginPath()
      g.ellipse(x, y - rad, rad, rad * 0.58, (r() - 0.5) * 0.6, 0, Math.PI * 2)
      g.fillStyle = rgba(col, 0.75 + r() * 0.25)
      g.fill()
    } else {
      const l = R * s * (0.7 + r() * 1.6)
      const lean = (r() - 0.5) * 1.2
      g.beginPath()
      g.moveTo(x, y)
      g.quadraticCurveTo(x + lean * l * 0.3, y - l * 0.6, x + lean * l, y - l)
      g.strokeStyle = rgba(greens[Math.floor(r() * greens.length)], 0.55 + r() * 0.35)
      g.lineWidth = Math.max(0.6, R * s * (0.1 + r() * 0.18))
      g.stroke()
    }
  }

  const mist = g.createLinearGradient(0, horizon - H * 0.05, 0, horizon + H * 0.09)
  mist.addColorStop(0, rgba(haze, 0))
  mist.addColorStop(0.45, rgba(mix(haze, white, 0.2), 0.5))
  mist.addColorStop(1, rgba(haze, 0))
  g.fillStyle = mist
  g.fillRect(0, horizon - H * 0.05, W, H * 0.14)

  // canvas tooth
  const specks = Math.min(30000, Math.round((W * H) / 50))
  for (let i = 0; i < specks; i++) {
    g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"
    g.fillRect(r() * W, r() * H, 1 + r(), 1 + r())
  }
}

// ---- small marks ------------------------------------------------------------------

/** The concave four-point star. viewBox 0 0 200 120. */
const STAR_D = "M100 0 Q105 55 200 60 Q105 65 100 120 Q95 65 0 60 Q95 55 100 0 Z"
/** The small sparkle in the title. viewBox 0 0 20 20. */
const SPARK_D = "M10 0 Q11 9 20 10 Q11 11 10 20 Q9 11 0 10 Q9 9 10 0 Z"

const Arrow = ({ dir, color, size }: { dir: "nw" | "se" | "sw"; color: string; size: string }) => {
  const rot = dir === "nw" ? 0 : dir === "se" ? 180 : 270
  return (
    <svg aria-hidden viewBox="0 0 16 16" style={{ width: size, height: size, transform: "rotate(" + rot + "deg)" }}>
      <path d="M3 3 L13 13 M3 3 H10 M3 3 V10" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="square" />
    </svg>
  )
}

const Emblem = ({ color, size }: { color: string; size: string }) => (
  <svg aria-hidden viewBox="0 0 100 100" className="cbp-emblem" style={{ width: size, height: size }}>
    <circle cx="50" cy="50" r="46" fill="none" stroke={color} strokeWidth="2.4" />
    <circle cx="50" cy="50" r="31" fill="none" stroke={color} strokeWidth="1.2" />
    <g className="cbp-spin">
      {[0, 120, 240].map((a) => (
        <path
          key={a}
          transform={"rotate(" + a + " 50 50)"}
          d="M50 50 C50 38 58 29 68 32 C76 35 75 46 67 47 C61 48 59 42 63 40"
          fill="none"
          stroke={color}
          strokeWidth="3.2"
          strokeLinecap="round"
        />
      ))}
      <circle cx="50" cy="50" r="3" fill={color} />
    </g>
  </svg>
)

const Barcode = ({ id, color, seed, flip, width }: { id: string; color: string; seed: number; flip: boolean; width: string }) => {
  const bars = React.useMemo(() => {
    const r = rng(seed)
    const out: { x: number; w: number }[] = []
    let x = 3
    while (x < 40) {
      const w = 0.6 + r() * 2.2
      out.push({ x, w })
      x += w + 0.8 + r() * 1.8
    }
    return out
  }, [seed])
  const tri = "M1 1 H99 L1 79 Z"
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 80"
      style={{ width, height: "auto", transform: flip ? "scaleX(-1)" : undefined, overflow: "visible" }}
    >
      <defs>
        <clipPath id={id}>
          <path d={tri} />
        </clipPath>
      </defs>
      <path d={tri} fill="none" stroke={color} strokeWidth="1.1" />
      <path d="M8 8 H86 L8 70 Z" fill="none" stroke={color} strokeWidth="0.5" opacity="0.6" />
      <g clipPath={"url(#" + id + ")"}>
        {bars.map((b, i) => (
          <rect key={i} x={b.x} y={30 + (i % 3) * 2} width={b.w} height={50} fill={color} />
        ))}
      </g>
    </svg>
  )
}

const Venn = ({ color, width }: { color: string; width: string }) => (
  <svg aria-hidden viewBox="0 0 120 44" className="cbp-venn" style={{ width, height: "auto", overflow: "visible" }}>
    <circle className="cbp-v1" cx="38" cy="22" r="20" fill="none" stroke={color} strokeWidth="1.2" />
    <circle cx="60" cy="22" r="20" fill="none" stroke={color} strokeWidth="1.2" />
    <circle className="cbp-v3" cx="82" cy="22" r="20" fill="none" stroke={color} strokeWidth="1.2" />
  </svg>
)

// ---- the figure -------------------------------------------------------------------

type FigureRefs = {
  head: { current: SVGGElement | null }
  face: { current: SVGGElement | null }
}

const Figure = ({ uid, seed, robe, poppy, refs }: { uid: string; seed: number; robe: RGB; poppy: RGB; refs: FigureRefs }) => {
  const art = React.useMemo(() => {
    const r = rng(seed * 13 + 5)
    const drips = Array.from({ length: 12 }, () => ({
      x: 52 + r() * 96,
      y: 160 + r() * 240,
      l: 10 + r() * 56,
      w: 0.9 + r() * 2.6,
    }))
    const splats = Array.from({ length: 30 }, () => ({ x: 40 + r() * 120, y: 150 + r() * 330, r: 0.5 + r() * 2.2 }))
    const tangle = (hx: number, hy: number, dir: number) => {
      const lines: string[] = []
      for (let k = 0; k < 8; k++) {
        let x = hx + (r() - 0.5) * 8
        let y = hy + (r() - 0.5) * 6
        let d = "M" + x.toFixed(1) + " " + y.toFixed(1)
        const len = 6 + Math.floor(r() * 10)
        for (let s = 0; s < len; s++) {
          x += (r() - 0.5) * 9 + dir * 0.5
          y += 3 + r() * 6
          d += " L" + x.toFixed(1) + " " + y.toFixed(1)
        }
        lines.push(d)
      }
      return lines
    }
    const folds = Array.from({ length: 13 }, (_, i) => {
      const x0 = 44 + i * 9.4
      const j = (r() - 0.5) * 12
      return {
        d: "M" + x0.toFixed(1) + " 266 C" + (x0 + j).toFixed(1) + " 340 " + (x0 - j).toFixed(1) + " 430 " + (x0 + (i - 6) * 4.2).toFixed(1) + " 520",
        light: i % 2 === 0,
        w: 1 + r() * 2.6,
      }
    })
    return { drips, splats, folds, left: tangle(51, 332, -1), right: tangle(149, 332, 1) }
  }, [seed])

  const light = rgba(mix(robe, [255, 255, 255], 0.55))
  const base = rgba(robe)
  const shade = rgba(mix(robe, [96, 98, 104], 0.5))
  const deep = rgba(mix(robe, [44, 46, 50], 0.62))
  const red = rgba(poppy)
  const id = (s: string) => uid + s
  const url = (s: string) => "url(#" + uid + s + ")"

  return (
    <svg aria-hidden viewBox="0 0 200 520" className="cbp-fig block" style={{ width: "100%", height: "100%", overflow: "visible" }}>
      <defs>
        <linearGradient id={id("robe")} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={light} />
          <stop offset="0.4" stopColor={base} />
          <stop offset="1" stopColor={shade} />
        </linearGradient>
        <linearGradient id={id("fall")} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0.3" stopColor={deep} stopOpacity="0" />
          <stop offset="1" stopColor={deep} stopOpacity="0.45" />
        </linearGradient>
        <linearGradient id={id("sleeve")} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={base} />
          <stop offset="1" stopColor={shade} />
        </linearGradient>
        <radialGradient id={id("hood")} cx="0.36" cy="0.28" r="0.85">
          <stop offset="0" stopColor={light} />
          <stop offset="0.5" stopColor={base} />
          <stop offset="1" stopColor={shade} />
        </radialGradient>
        <radialGradient id={id("void")} cx="0.5" cy="0.45" r="0.6">
          <stop offset="0" stopColor="#000" />
          <stop offset="0.8" stopColor="#060505" />
          <stop offset="1" stopColor="#1c1a18" />
        </radialGradient>
        <radialGradient id={id("ground")} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#000" stopOpacity="0.45" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        {/* rough edges, then a streaky brush texture multiplied into the paint */}
        <filter id={id("rough")} x="-8%" y="-4%" width="116%" height="108%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed={seed % 97} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="4.5" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feTurbulence type="fractalNoise" baseFrequency="0.32 0.09" numOctaves="2" seed={(seed + 3) % 97} result="t" />
          <feColorMatrix in="t" type="matrix" values="0.3 0 0 0 0.74  0.3 0 0 0 0.74  0.3 0 0 0 0.74  0 0 0 0 1" result="tg" />
          <feBlend in="d" in2="tg" mode="multiply" result="m" />
          <feComposite in="m" in2="d" operator="in" />
        </filter>
      </defs>

      <ellipse cx="100" cy="512" rx="100" ry="14" fill={url("ground")} />

      <g filter={url("rough")}>
        {/* robe, flaring to the hem */}
        <path
          d="M40 146 C30 170 28 220 30 270 C32 340 30 420 20 520 L180 520 C170 420 168 340 170 270 C172 220 170 170 160 146 Z"
          fill={url("robe")}
        />
        <path
          d="M40 146 C30 170 28 220 30 270 C32 340 30 420 20 520 L180 520 C170 420 168 340 170 270 C172 220 170 170 160 146 Z"
          fill={url("fall")}
        />
        {art.folds.map((f, i) => (
          <path key={i} d={f.d} fill="none" stroke={f.light ? light : deep} strokeOpacity={f.light ? 0.6 : 0.3} strokeWidth={f.w} />
        ))}
        {/* the sash, from the right shoulder across to the left hip */}
        <path d="M150 152 C122 186 84 226 46 252 L44 268 C84 244 124 206 156 168 Z" fill={deep} fillOpacity="0.2" />
        <path d="M152 158 C124 192 86 230 46 256" fill="none" stroke={light} strokeOpacity="0.75" strokeWidth="1.6" />
        <path d="M36 262 C78 274 122 274 164 262" fill="none" stroke={shade} strokeWidth="2.4" />
        {/* sleeves and hands */}
        <path d="M40 146 C28 170 24 220 26 260 C28 290 34 310 40 324 L62 324 C60 290 62 250 66 210 C68 180 62 160 40 146 Z" fill={url("sleeve")} />
        <path d="M160 146 C172 170 176 220 174 260 C172 290 166 310 160 324 L138 324 C140 290 138 250 134 210 C132 180 138 160 160 146 Z" fill={url("sleeve")} />
        <path d="M38 190 C38 236 42 280 48 318 M162 190 C162 236 158 280 152 318" fill="none" stroke={deep} strokeOpacity="0.3" strokeWidth="1.5" />
        <path d="M34 214 C38 222 52 226 60 222 M166 214 C162 222 148 226 140 222" fill="none" stroke={deep} strokeOpacity="0.22" strokeWidth="1.2" />
        <ellipse cx="51" cy="332" rx="9" ry="12" fill="#cbc7bf" />
        <ellipse cx="149" cy="332" rx="9" ry="12" fill="#bdb9b1" />
        {/* the mantle, the hood's fabric spread over the shoulders */}
        <path
          d="M74 96 C66 112 50 122 34 136 C30 142 32 150 40 154 C70 162 130 162 160 154 C168 150 170 142 166 136 C150 122 134 112 126 96 C116 112 84 112 74 96 Z"
          fill={url("hood")}
        />
        <path d="M46 140 C76 152 124 152 154 140 M60 128 C84 138 116 138 140 128" fill="none" stroke={shade} strokeOpacity="0.8" strokeWidth="1.3" />
        {/* a poppy held up in front of the robe */}
        <path d="M100 300 C98 350 102 430 99 520" fill="none" stroke="#28301f" strokeWidth="1.6" />
        <g transform="translate(100 298)">
          <circle cx="-5" cy="-3" r="7" fill={rgba(mix(poppy, [30, 0, 0], 0.3))} />
          <circle cx="5" cy="-3" r="7" fill={rgba(mix(poppy, [30, 0, 0], 0.3))} />
          <circle cx="-5" cy="2" r="7.5" fill={red} />
          <circle cx="5" cy="2" r="7.5" fill={red} />
          <ellipse cx="0" cy="-1" rx="3" ry="2.4" fill="#140b0b" />
        </g>
      </g>

      {/* red drips — they run on hover */}
      <g>
        {art.drips.map((d, i) => (
          <g key={i} className="cbp-drip" style={{ transitionDelay: i * 40 + "ms" }}>
            <path d={"M" + d.x.toFixed(1) + " " + d.y.toFixed(1) + " v" + d.l.toFixed(1)} stroke={red} strokeWidth={d.w} strokeLinecap="round" />
            <circle cx={d.x} cy={d.y + d.l} r={d.w * 0.85} fill={red} />
          </g>
        ))}
        {art.splats.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={red} fillOpacity="0.85" />
        ))}
      </g>

      {/* the bundles of dark stems in each hand */}
      <g fill="none" stroke="#1c1a17" strokeWidth="0.9" strokeOpacity="0.9" strokeLinejoin="round">
        {art.left.concat(art.right).map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>

      {/* the hood turns, and the void inside it turns further */}
      <g ref={refs.head} style={{ transformOrigin: "100px 112px" }}>
        <g filter={url("rough")}>
          <path
            d="M100 2 C114 2 131 18 135 46 C138 72 132 92 125 106 C116 117 84 117 75 106 C68 92 62 72 65 46 C69 18 86 2 100 2 Z"
            fill={url("hood")}
          />
          <path d="M100 5 C101 20 101 30 100 36" fill="none" stroke={shade} strokeWidth="1.2" />
          <path d="M72 84 C78 102 90 110 100 110 C110 110 122 102 128 84" fill="none" stroke={shade} strokeOpacity="0.6" strokeWidth="1.4" />
        </g>
        <g ref={refs.face}>
          <ellipse cx="98" cy="60" rx="15" ry="16.5" fill={deep} fillOpacity="0.35" />
          <ellipse className="cbp-void" cx="98" cy="60" rx="12.5" ry="14" fill={url("void")} />
        </g>
      </g>
    </svg>
  )
}

// ---- styles -------------------------------------------------------------------------

const CSS =
  ".cbp-root{-webkit-tap-highlight-color:transparent}" +
  ".cbp-kw{position:relative;white-space:nowrap;line-height:1;padding:0.32em 0.4em;border-radius:2px;transition:background-color .25s ease,color .25s ease;cursor:pointer;background:transparent;border:0;color:inherit}" +
  ".cbp-kw::after{content:'';position:absolute;left:0.4em;right:0.4em;bottom:0.05em;height:1px;background:currentColor;transform:scaleX(0);transform-origin:left;transition:transform .3s ease}" +
  ".cbp-kw:hover::after,.cbp-kw:focus-visible::after{transform:scaleX(1)}" +
  ".cbp-kw:focus-visible{outline:1px dashed currentColor;outline-offset:2px}" +
  ".cbp-kw[aria-pressed=true]{background:var(--cbp-ink);color:var(--cbp-paper)}" +
  ".cbp-kw[aria-pressed=true]::after{transform:scaleX(0)}" +
  ".cbp-mark{display:inline-block;width:0.62em;height:0.62em;border:1px solid currentColor;flex:none}" +
  ".cbp-mark[data-on=true]{background:currentColor}" +
  ".cbp-title{display:flex;justify-content:center;align-items:baseline;line-height:1;white-space:nowrap}" +
  ".cbp-ch{display:inline-block;position:relative}" +
  ".cbp-spark{position:absolute;pointer-events:none;animation:cbp-twinkle 3.6s ease-in-out infinite}" +
  ".cbp-title:hover .cbp-spark{animation-duration:1.2s}" +
  ".cbp-emblem .cbp-spin{transform-origin:50px 50px;animation:cbp-turn 30s linear infinite}" +
  ".cbp-emblem:hover .cbp-spin{animation-duration:3s}" +
  ".cbp-star{animation:cbp-breathe 7s ease-in-out infinite;transform-origin:50% 50%}" +
  ".cbp-drip{transform-box:fill-box;transform-origin:50% 0;transition:transform .9s cubic-bezier(.3,.7,.2,1)}" +
  ".cbp-figwrap:hover .cbp-drip{transform:scaleY(1.7)}" +
  ".cbp-void{transform-box:fill-box;transform-origin:50% 50%;transition:transform .6s ease}" +
  ".cbp-figwrap:hover .cbp-void{transform:scale(1.12)}" +
  ".cbp-venn circle{transition:transform .5s cubic-bezier(.3,.7,.2,1)}" +
  ".cbp-venn:hover .cbp-v1{transform:translateX(-14px)}" +
  ".cbp-venn:hover .cbp-v3{transform:translateX(14px)}" +
  ".cbp-roll{display:block;overflow:hidden}" +
  ".cbp-roll>span{display:block;animation:cbp-rise .9s cubic-bezier(.2,.8,.2,1) both}" +
  ".cbp-dot{display:inline-block;width:0.8em;height:0.8em;border-radius:50%;border:1.5px solid currentColor}" +
  ".cbp-dot[data-on=true]{background:currentColor}" +
  ".cbp-btn{display:inline-flex;align-items:center;gap:0.45em;background:transparent;border:0;color:inherit;cursor:pointer;padding:0.3em}" +
  ".cbp-btn:focus-visible{outline:1px dashed currentColor;outline-offset:2px}" +
  "@keyframes cbp-twinkle{0%,100%{transform:scale(1) rotate(0deg);opacity:1}50%{transform:scale(.72) rotate(45deg);opacity:.75}}" +
  "@keyframes cbp-turn{to{transform:rotate(360deg)}}" +
  "@keyframes cbp-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.035)}}" +
  "@keyframes cbp-rise{from{transform:translateY(105%)}to{transform:none}}" +
  "@media (prefers-reduced-motion: reduce){.cbp-spark,.cbp-emblem .cbp-spin,.cbp-star,.cbp-roll>span{animation:none}.cbp-drip,.cbp-void,.cbp-venn circle{transition:none}}"

const useIsoLayoutEffect = typeof window === "undefined" ? React.useEffect : React.useLayoutEffect

// ---- the component ------------------------------------------------------------------

type Geo = {
  W: number
  H: number
  head: number
  kwTop: number
  horizon: number
  narrow: boolean
}

type Live = {
  x: number
  y: number
  u: number
  z: number
  s: number
  stem: number
  phase: number
  variant: number
  tilt: number
  lean: number
  vel: number
  born: number
  front: boolean
  grown: boolean
  /** planted by a click, so it can be forgotten again */
  bloom: boolean
}

type Petal = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; size: number; life: number; max: number; flip: number }

export default function ComebackPoster({
  title = "Comeback",
  keywords = KEYWORDS,
  onKeywordSelect,
  from = "25.02.25",
  to = "05.03.25",
  topNote = TOP_NOTE,
  footNote = FOOT_NOTE,
  edition = "No. 01 / The return issue",
  palette,
  poppies = 220,
  seed = 7,
  figure = true,
  interactive = true,
  fontHref = FONT_HREF,
  displayFont = DISPLAY,
  scriptFont = SCRIPT,
  labelFont = LABEL,
  height = "100svh",
  className = "",
}: ComebackPosterProps) {
  const pal = { ...DEFAULT_PALETTE, ...palette }
  const uid = "cbp" + React.useId().replace(/[^a-zA-Z0-9]/g, "")

  const rootRef = React.useRef(null as HTMLElement | null)
  const headRef = React.useRef(null as HTMLElement | null)
  const kwRef = React.useRef(null as HTMLDivElement | null)
  const backRef = React.useRef(null as HTMLCanvasElement | null)
  const frontRef = React.useRef(null as HTMLCanvasElement | null)
  const wavesRef = React.useRef(null as SVGGElement | null)
  const hoodRef = React.useRef(null as SVGGElement | null)
  const faceRef = React.useRef(null as SVGGElement | null)
  const figRef = React.useRef(null as HTMLDivElement | null)

  const [geo, setGeo] = React.useState(null as Geo | null)
  const [reduced, setReduced] = React.useState(false)
  const [windOn, setWindOn] = React.useState(true)
  const [hover, setHover] = React.useState(null as string | null)
  const [kept, setKept] = React.useState(null as string | null)
  const [shown, setShown] = React.useState(title)

  // pointer, gusts and clicks reach the paint loop through refs, not renders
  const pointer = React.useRef({ x: -1e4, y: -1e4, on: false, inHead: false })
  const gust = React.useRef(0)
  const blooms = React.useRef([] as { x: number; y: number }[])
  const kick = React.useRef(() => {})

  const live = React.useRef({ windOn, reduced, interactive })
  live.current = { windOn, reduced, interactive }

  // ---- fonts -----------------------------------------------------------------
  React.useEffect(() => {
    if (!fontHref) return
    const exists = Array.from(document.querySelectorAll("link[rel=stylesheet]")).some(
      (l) => (l as HTMLLinkElement).href === fontHref,
    )
    if (exists) return
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = fontHref
    link.setAttribute("data-comeback-font", "")
    document.head.appendChild(link)
  }, [fontHref])

  // ---- reduced motion -------------------------------------------------------------
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const on = () => setReduced(mq.matches)
    on()
    mq.addEventListener("change", on)
    return () => mq.removeEventListener("change", on)
  }, [])

  // ---- measuring: the masthead decides where the horizon sits ------------------------
  useIsoLayoutEffect(() => {
    const root = rootRef.current
    const head = headRef.current
    if (!root || !head) return
    let timer = 0
    let first = true
    const measure = () => {
      const rr = root.getBoundingClientRect()
      const W = Math.round(root.clientWidth)
      const H = Math.round(root.clientHeight)
      if (W < 2 || H < 2) return
      const hh = head.offsetHeight
      const kw = kwRef.current
      const kwTop = kw ? kw.getBoundingClientRect().top - rr.top : hh * 0.6
      const next: Geo = { W, H, head: hh, kwTop, horizon: hh + H * 0.06, narrow: W < 640 }
      setGeo((g) =>
        g && g.W === next.W && g.H === next.H && g.head === next.head && Math.abs(g.kwTop - next.kwTop) < 1 && g.narrow === next.narrow
          ? g
          : next,
      )
    }
    const schedule = () => {
      if (first) {
        first = false
        measure()
        return
      }
      window.clearTimeout(timer)
      timer = window.setTimeout(measure, 90)
    }
    const ro = new ResizeObserver(schedule)
    ro.observe(root)
    ro.observe(head)
    schedule()
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => measure())
    return () => {
      ro.disconnect()
      window.clearTimeout(timer)
    }
  }, [])

  // ---- the title decode ----------------------------------------------------------
  const target = hover ?? kept ?? title
  const shownRef = React.useRef(shown)
  shownRef.current = shown
  React.useEffect(() => {
    const fromWord = shownRef.current
    if (fromWord === target) return
    if (reduced) {
      setShown(target)
      return
    }
    const r = rng(target.length * 31 + fromWord.length)
    const t0 = performance.now()
    const dur = 520 + target.length * 40
    let raf = 0
    const tick = (now: number) => {
      const p = (now - t0) / dur
      setShown(scrambleAt(fromWord, target, p, r))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, reduced])

  const choose = (w: string) => {
    const next = kept === w ? null : w
    setKept(next)
    onKeywordSelect?.(next)
    if (next && !reduced) {
      gust.current = performance.now()
      kick.current()
    }
  }

  // ---- the painting ------------------------------------------------------------------
  const pk = [pal.poppy, pal.field, pal.haze].join("|")
  React.useEffect(() => {
    const back = backRef.current
    const front = frontRef.current
    if (!geo || !back || !front) return
    const bctx = back.getContext("2d")
    const fctx = front.getContext("2d")
    if (!bctx || !fctx) return

    const { W, H, horizon } = geo
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    for (const c of [back, front]) {
      c.width = Math.round(W * dpr)
      c.height = Math.round(H * dpr)
    }
    const R = Math.min(H * 0.055, W * 0.085)
    const red = hexRGB(pal.poppy, hexRGB(DEFAULT_PALETTE.poppy, [217, 48, 29]))
    const field = hexRGB(pal.field, [43, 50, 38])
    const haze = hexRGB(pal.haze, [180, 180, 173])
    const stemCol = rgba(mix(field, [20, 26, 16], 0.5))

    // sprites
    const sr = rng(seed * 3 + 1)
    const S = Math.min(256, Math.max(96, Math.round(R * 2.9 * dpr * 1.3)))
    const sprites: HTMLCanvasElement[] = []
    for (let v = 0; v < VARIANTS; v++) sprites.push(paintPoppy(S, red, sr, v >= 6))

    // backdrop
    const backdrop = makeCanvas(W * dpr, H * dpr)
    const bd = backdrop.getContext("2d")
    if (bd) {
      bd.scale(dpr, dpr)
      paintBackdrop(bd, W, H, horizon, { poppy: red, field, haze }, seed, R)
    }

    // the figure's feet: poppies rooted below this line are painted in front of it
    const frontLine = H * 0.965 - (H * 0.965 - geo.head) * 0.08
    const place = (u: number, z: number) => {
      const { y, s } = project(z, horizon, H)
      return { x: u * W, y, s }
    }
    const plants: Live[] = scatter(seed, poppies).map((p) => {
      const { x, y, s } = place(p.u, p.z)
      return {
        x, y, s, u: p.u, z: p.z, phase: p.phase, variant: p.variant, tilt: p.tilt,
        stem: R * s * p.len, lean: 0, vel: 0, born: -1, front: y > frontLine, grown: true, bloom: false,
      }
    })
    let extra = 0
    const petals: Petal[] = []
    const pr = rng(seed * 11 + 9)

    const spawnPetal = (x: number, y: number, vx: number, vy: number, size: number) => {
      if (petals.length > 160) petals.shift()
      petals.push({
        x, y, vx, vy, size,
        rot: pr() * Math.PI * 2, vr: (pr() - 0.5) * 0.2,
        life: 0, max: 2200 + pr() * 2200, flip: pr() * Math.PI * 2,
      })
    }

    const bloomAt = (x: number, y: number, now: number) => {
      const z0 = depthAt(y, horizon, H)
      const instant = live.current.reduced
      for (let k = 0; k < 6; k++) {
        const z = clamp01(z0 + (pr() - 0.5) * 0.08)
        const s = project(z, horizon, H).s
        const u = (x + (pr() - 0.5) * R * 3.4 * s) / W
        const pos = place(u, z)
        plants.push({
          ...pos, u, z, phase: pr() * 6.28, variant: Math.floor(pr() * 6), tilt: (pr() - 0.5) * 0.4,
          stem: R * pos.s * (1.4 + pr() * 1.1), lean: 0, vel: 0,
          born: instant ? -1 : now + k * 70, front: pos.y > frontLine, grown: instant, bloom: true,
        })
        extra++
      }
      // keep the field from filling up: forget the oldest blooms past 72
      while (extra > 72) {
        const i = plants.findIndex((p) => p.bloom)
        if (i < 0) break
        plants.splice(i, 1)
        extra--
      }
      plants.sort((a, b) => a.y - b.y)
      if (!instant) {
        const s = project(z0, horizon, H).s
        for (let k = 0; k < 18; k++) {
          const a = -Math.PI / 2 + (pr() - 0.5) * 2.4
          const v = 1.2 + pr() * 2.6
          spawnPetal(x, y - R * s * 1.6, Math.cos(a) * v, Math.sin(a) * v, R * s * (0.25 + pr() * 0.2))
        }
      }
    }

    // ---- frame ---------------------------------------------------------------
    let raf = 0
    let visible = true
    let last = performance.now()
    let clock = 0
    let busyUntil = 0
    let nextAmbient = 0
    let waveAmp = 0
    const hoodState = { x: 0, y: 0, vx: 0, vy: 0 }
    const waveGroup = wavesRef.current
    const waveLines = waveGroup ? Array.from(waveGroup.querySelectorAll("path")) : []
    const waveGap = geo.head / Math.max(1, waveLines.length)

    const drawPlant = (ctx: CanvasRenderingContext2D, p: Live, grow: number) => {
      const len = p.stem * (0.25 + 0.75 * grow)
      const sn = Math.sin(p.lean)
      const hx = p.x + sn * len
      const hy = p.y - Math.cos(p.lean) * len
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      ctx.quadraticCurveTo(p.x + sn * len * 0.15, p.y - len * 0.6, hx, hy)
      ctx.strokeStyle = stemCol
      ctx.lineWidth = Math.max(0.7, p.s * R * 0.075)
      ctx.stroke()
      // buds are smaller than the flowers they will become
      const D = R * p.s * 2.8 * grow * (p.variant >= 6 ? 0.62 : 1)
      if (D < 0.5) return
      ctx.save()
      ctx.translate(hx, hy)
      ctx.rotate(p.lean * 1.3 + p.tilt)
      ctx.drawImage(sprites[p.variant], -D / 2, -D / 2, D, D)
      ctx.restore()
    }

    const frame = (now: number) => {
      raf = 0
      const L = live.current
      const dt = Math.min(50, now - last)
      last = now
      const moving = L.windOn && !L.reduced
      if (moving) clock += dt / 1000
      const P = pointer.current
      const pushOn = P.on && L.interactive && !L.reduced
      let busy = now < busyUntil

      // queued clicks
      while (blooms.current.length) {
        const b = blooms.current.shift()!
        bloomAt(b.x, b.y, now)
        busyUntil = now + 1400
        busy = true
      }

      // the gust front sweeps left to right
      let gx = -1e9
      if (gust.current) {
        const t = (now - gust.current) / 1000
        gx = t * W * 0.8 - W * 0.15
        if (t < 0.05) for (let k = 0; k < 24; k++) {
          const y = horizon + pr() * (H - horizon)
          const s = project(depthAt(y, horizon, H), horizon, H).s
          spawnPetal(-20 - pr() * W * 0.2, y - R * s, 3 + pr() * 4, -0.6 - pr(), R * s * (0.25 + pr() * 0.2))
        }
        if (gx > W * 1.25) gust.current = 0
        busy = true
      }

      bctx.setTransform(1, 0, 0, 1, 0, 0)
      bctx.drawImage(backdrop, 0, 0)
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      fctx.setTransform(1, 0, 0, 1, 0, 0)
      fctx.clearRect(0, 0, front.width, front.height)
      fctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      for (const p of plants) {
        let target = p.tilt * 0.25
        if (moving) {
          target +=
            Math.sin(clock * 1.15 + p.phase + p.x * 0.004) * (0.035 + 0.05 * p.z) +
            Math.sin(clock * 0.4 + p.x * 0.0016) * 0.06
        }
        if (gx > -1e8) {
          const d = (p.x - gx) / (W * 0.14)
          target += Math.exp(-d * d) * 0.6
        }
        if (pushOn) {
          const dx = p.x - P.x
          const dy = p.y - p.stem * 0.8 - P.y
          const rr = 60 + 120 * p.s
          const f = Math.exp(-(dx * dx + dy * dy) / (rr * rr))
          target += Math.max(-1, Math.min(1, dx / rr)) * 0.8 * f
        }
        p.vel = (p.vel + (target - p.lean) * 0.06) * 0.86
        p.lean += p.vel
        let grow = 1
        if (!p.grown) {
          const t = (now - p.born) / 900
          grow = t <= 0 ? 0 : easeOutBack(t)
          if (t >= 1) p.grown = true
        }
        drawPlant(p.front ? fctx : bctx, p, grow)
      }

      // ambient petals, now and then, off a random head
      if (moving && now > nextAmbient && plants.length) {
        nextAmbient = now + 700 + pr() * 900
        const p = plants[Math.floor(pr() * plants.length)]
        spawnPetal(p.x, p.y - p.stem, 0.6 + pr() * 0.8, -0.3 - pr() * 0.4, R * p.s * (0.22 + pr() * 0.15))
      }

      // petals fall with a little drag towards the wind
      const wind = moving ? 0.9 : 0.2
      for (let i = petals.length - 1; i >= 0; i--) {
        const q = petals[i]
        q.life += dt
        if (q.life > q.max) {
          petals.splice(i, 1)
          continue
        }
        const k = dt / 16
        q.vx += (wind - q.vx) * 0.015 * k
        q.vy += (0.35 - q.vy) * 0.02 * k
        q.x += q.vx * k
        q.y += q.vy * k
        q.rot += q.vr * k
        q.flip += 0.08 * k
        const a = 1 - q.life / q.max
        fctx.save()
        fctx.translate(q.x, q.y)
        fctx.rotate(q.rot)
        fctx.scale(1, 0.25 + 0.75 * Math.abs(Math.sin(q.flip)))
        fctx.beginPath()
        fctx.ellipse(0, 0, q.size, q.size * 0.7, 0, 0, Math.PI * 2)
        fctx.fillStyle = rgba(Math.sin(q.flip) > 0 ? red : mix(red, [40, 0, 0], 0.3), a)
        fctx.fill()
        fctx.restore()
      }
      if (petals.length) busy = true

      // the hood follows the pointer, the void follows further
      const fig = figRef.current
      if (fig && hoodRef.current && faceRef.current) {
        let tx = 0
        let ty = 0
        if (P.on && L.interactive && !L.reduced) {
          const fr = fig.getBoundingClientRect()
          const rr = rootRef.current ? rootRef.current.getBoundingClientRect() : fr
          const cx = fr.left - rr.left + fr.width / 2
          const cy = fr.top - rr.top + fr.height * 0.115
          const dx = P.x - cx
          const dy = P.y - cy
          const d = Math.hypot(dx, dy) || 1
          const m = Math.min(1, d / (W * 0.4))
          tx = (dx / d) * m
          ty = (dy / d) * m
        }
        hoodState.vx = (hoodState.vx + (tx - hoodState.x) * 0.05) * 0.82
        hoodState.vy = (hoodState.vy + (ty - hoodState.y) * 0.05) * 0.82
        hoodState.x += hoodState.vx
        hoodState.y += hoodState.vy
        hoodRef.current.style.transform = "rotate(" + (hoodState.x * 4).toFixed(2) + "deg)"
        faceRef.current.setAttribute(
          "transform",
          "translate(" + (hoodState.x * 6).toFixed(2) + " " + (hoodState.y * 4.5).toFixed(2) + ")",
        )
        if (Math.abs(hoodState.vx) + Math.abs(hoodState.vy) + Math.abs(tx - hoodState.x) + Math.abs(ty - hoodState.y) > 0.002)
          busy = true
      }

      // the masthead lines swell around the pointer
      const want = P.inHead && L.interactive && !L.reduced ? 1 : 0
      const before = waveAmp
      waveAmp += (want - waveAmp) * 0.12
      if (Math.abs(want - waveAmp) < 0.002) waveAmp = want
      if (waveAmp > 0 || before > 0) {
        for (let i = 0; i < waveLines.length; i++)
          waveLines[i].setAttribute("d", wavePath(i, W, waveGap, P.x, P.y, waveAmp))
        if (waveAmp !== want || want) busy = true
      }

      if (visible && (moving || busy)) raf = requestAnimationFrame(frame)
    }

    const start = () => {
      if (!raf && visible) {
        last = performance.now()
        raf = requestAnimationFrame(frame)
      }
    }
    kick.current = start
    // settle the field once, then keep going if the wind is up
    frame(performance.now())
    start()

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting && !document.hidden
      if (visible) start()
    })
    io.observe(back)
    const onVis = () => {
      visible = !document.hidden
      if (visible) start()
    }
    document.addEventListener("visibilitychange", onVis)

    return () => {
      cancelAnimationFrame(raf)
      raf = 0
      kick.current = () => {}
      io.disconnect()
      document.removeEventListener("visibilitychange", onVis)
    }
    // the palette is keyed by value so a fresh object each render does not repaint
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo, seed, poppies, pk])

  // wind toggles and reduced motion restart the loop
  React.useEffect(() => {
    kick.current()
  }, [windOn, reduced])

  // ---- pointer ------------------------------------------------------------------
  const local = (e: React.PointerEvent) => {
    const rr = rootRef.current!.getBoundingClientRect()
    return { x: e.clientX - rr.left, y: e.clientY - rr.top }
  }
  const onMove = (e: React.PointerEvent) => {
    if (!geo) return
    const { x, y } = local(e)
    const P = pointer.current
    P.x = x
    P.y = y
    P.on = true
    P.inHead = y < geo.head
    kick.current()
  }
  const onLeave = () => {
    pointer.current.on = false
    pointer.current.inHead = false
    kick.current()
  }
  const onDown = (e: React.PointerEvent) => {
    if (!geo || !interactive) return
    if ((e.target as HTMLElement).closest("button")) return
    const { x, y } = local(e)
    if (y < geo.horizon) return
    blooms.current.push({ x, y })
    kick.current()
  }

  // ---- layout --------------------------------------------------------------------
  const narrow = geo ? geo.narrow : false
  const rows = chunkRows(keywords, narrow)
  const fromParts = splitDate(from)
  const toParts = splitDate(to)
  const waveCount = geo ? Math.max(8, Math.round(geo.head / 7)) : 0

  let fig = null as null | { left: number; top: number; w: number; h: number }
  let star = null as null | { top: number; w: number; h: number }
  if (geo) {
    const feet = geo.H * 0.965
    let top = geo.head + geo.H * 0.012
    let h = Math.max(120, feet - top)
    let w = (h * 200) / 520
    const maxW = geo.W * (geo.narrow ? 0.52 : 0.42)
    if (w > maxW) {
      w = maxW
      h = (w * 520) / 200
      top = feet - h
    }
    fig = { left: geo.W / 2 - w / 2, top, w, h }
    const half = Math.max(18, Math.min(geo.H * 0.16, geo.W * 0.18, geo.head - geo.kwTop + 4))
    star = { top: geo.head - half, h: half * 2, w: half * 2 * (200 / 120) * 1.05 }
  }

  const ink = pal.ink
  const mark = pal.mark
  const kwSize = narrow ? "clamp(7px, 2.25cqw, 11px)" : "clamp(7px, 1.12cqw, 13px)"
  const fine = narrow ? "clamp(5.5px, 1.5cqw, 8px)" : "clamp(5.5px, 0.6cqw, 9px)"
  const gap = narrow ? "11cqw" : "8cqw"
  const word = shown || " "
  const n = word.length

  const renderRow = (row: string[], ri: number) => {
    if (!row) return null
    const half = Math.ceil(row.length / 2)
    return (
      <div
        key={ri}
        className="flex items-center justify-between"
        style={{
          fontFamily: labelFont,
          fontSize: kwSize,
          letterSpacing: "0.06em",
          paddingInline: !narrow && ri > 0 ? "6.5cqw" : 0,
          marginTop: ri ? (narrow ? "1.2cqw" : "0.35cqw") : 0,
        }}
      >
        {row.map((w, i) => (
          <React.Fragment key={w + i}>
            {i === half && <span aria-hidden style={{ width: gap, flex: "none" }} />}
            {i > 0 && i !== half && !narrow && <span aria-hidden className="cbp-mark" data-on={ri === 0} style={{ opacity: 0.8 }} />}
            <button
              type="button"
              className="cbp-kw uppercase"
              aria-pressed={kept === w}
              onPointerEnter={(e) => e.pointerType === "mouse" && setHover(w)}
              onPointerLeave={() => setHover(null)}
              onFocus={(e) => e.currentTarget.matches(":focus-visible") && setHover(w)}
              onBlur={() => setHover(null)}
              onClick={() => choose(w)}
              style={{ fontFamily: labelFont, fontSize: "1em", letterSpacing: "inherit" }}
            >
              {w}
            </button>
          </React.Fragment>
        ))}
      </div>
    )
  }

  return (
    <section
      ref={rootRef}
      aria-label={title + " poster"}
      className={"cbp-root relative w-full overflow-hidden select-none " + className}
      style={
        {
          height,
          background: pal.paper,
          color: ink,
          containerType: "size",
          touchAction: "manipulation",
          "--cbp-ink": ink,
          "--cbp-paper": pal.paper,
        } as React.CSSProperties
      }
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onPointerDown={onDown}
    >
      <style>{CSS}</style>

      {/* 1 · the field behind the figure */}
      <canvas
        ref={backRef}
        role="img"
        aria-label="An oil-painted field of red poppies under a hazy sky, with a hooded figure in a white robe standing in it."
        className="absolute left-0 top-0 block"
        style={{ width: geo ? geo.W : "100%", height: geo ? geo.H : "100%", maxWidth: "none", cursor: interactive ? "crosshair" : undefined }}
      />

      {/* 2 · the masthead */}
      <header
        ref={headRef}
        className="absolute inset-x-0 top-0 z-10 overflow-hidden"
        style={{ background: pal.paper, borderRadius: "0 0 clamp(10px, 2.4cqw, 34px) clamp(10px, 2.4cqw, 34px)" }}
      >
        {geo && (
          <svg aria-hidden className="pointer-events-none absolute left-0 top-0" width={geo.W} height={geo.head} style={{ maxWidth: "none" }}>
            <g ref={wavesRef} fill="none" stroke={ink} strokeOpacity="0.16" strokeWidth="0.7">
              {Array.from({ length: waveCount }, (_, i) => (
                <path key={i} d={wavePath(i, geo.W, geo.head / waveCount, 0, 0, 0)} />
              ))}
            </g>
          </svg>
        )}

        <div className="relative" style={{ padding: narrow ? "3cqw 3.4cqw 2.6cqw" : "1.3cqw 2cqw 1.5cqw" }}>
          <div className="flex items-start justify-between" style={{ gap: "2cqw" }}>
            <Arrow dir="nw" color={ink} size={narrow ? "3.4cqw" : "1.5cqw"} />
            {!narrow && (
              <p
                className="m-0 uppercase"
                style={{ fontFamily: labelFont, fontSize: fine, lineHeight: 1.35, letterSpacing: "0.04em", maxWidth: "58%", marginLeft: "auto", textAlign: "justify", opacity: 0.85 }}
              >
                {topNote}
              </p>
            )}
            <svg aria-hidden viewBox="0 0 30 30" style={{ width: narrow ? "5cqw" : "2.4cqw", height: narrow ? "5cqw" : "2.4cqw", flex: "none" }}>
              <rect x="1" y="1" width="28" height="28" fill="none" stroke={ink} strokeWidth="1.2" />
              {[6, 12, 18, 24, 30, 36, 42].map((o) => (
                <path key={o} d={"M" + Math.max(1, o - 28) + " " + Math.min(29, o) + " L" + Math.min(29, o) + " " + Math.max(1, o - 28)} stroke={ink} strokeWidth="1" />
              ))}
            </svg>
          </div>

          <h2
            aria-label={target}
            className="cbp-title m-0"
            style={{ fontSize: narrow ? "min(15cqw, 13cqh)" : "min(13cqw, 13.5cqh)", margin: narrow ? "1.5cqw 0 1cqw" : "-0.6cqw 0 0.4cqw", color: ink }}
          >
            {Array.from(word).map((c, i) => {
              const swash = i === 0 || (i === n - 1 && n > 1)
              const sparkAt = n > 3 && (i === 1 || i === n - 3)
              return (
                <span
                  key={i}
                  aria-hidden
                  className="cbp-ch"
                  style={
                    swash
                      ? {
                          fontFamily: scriptFont,
                          fontSize: "1.32em",
                          lineHeight: 0.8,
                          margin: i === 0 ? "0 -0.05em 0 0" : "0 0 0 -0.06em",
                          // a descender on the last swash would hang into the word grid
                          textTransform: i === 0 || /[gjpqy]/i.test(c) ? "uppercase" : "lowercase",
                          zIndex: 1,
                        }
                      : {
                          fontFamily: displayFont,
                          fontWeight: 500,
                          textTransform: "uppercase",
                          letterSpacing: "0.015em",
                          transform: "scaleX(1.12)",
                          margin: "0 0.045em",
                        }
                  }
                >
                  {c === " " ? "\u00a0" : c}
                  {sparkAt && (
                    <svg
                      aria-hidden
                      viewBox="0 0 20 20"
                      className="cbp-spark"
                      style={
                        i === 1
                          ? { width: "0.26em", height: "0.26em", left: "50%", top: "50%", marginLeft: "-0.13em", marginTop: "-0.2em" }
                          : { width: "0.3em", height: "0.3em", right: "-0.22em", top: "26%", animationDelay: "-1.6s" }
                      }
                    >
                      <path d={SPARK_D} fill={ink} />
                    </svg>
                  )}
                </span>
              )
            })}
          </h2>

          <div aria-hidden style={{ height: 1, background: ink, opacity: 0.55 }} />

          <div ref={kwRef} role="group" aria-label="Themes" className="relative" style={{ paddingTop: narrow ? "1.6cqw" : "0.5cqw" }}>
            {renderRow(rows[0], 0)}
            {rows.length > 1 && (
              <div className="relative">
                {rows.slice(1).map((row, i) => renderRow(row, i + 1))}
                {!narrow && (
                  <>
                    <div aria-hidden className="absolute left-0 top-1/2 -translate-y-1/2">
                      <Emblem color={ink} size="3.7cqw" />
                    </div>
                    <div aria-hidden className="absolute right-0 top-1/2 -translate-y-1/2">
                      <Emblem color={ink} size="3.7cqw" />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 3 · the big star, half on the paper, half on the hill */}
      {star && (
        <svg
          aria-hidden
          viewBox="0 0 200 120"
          preserveAspectRatio="none"
          className="cbp-star pointer-events-none absolute z-20"
          style={{ left: "50%", top: star.top, width: star.w, height: star.h, marginLeft: -star.w / 2, maxWidth: "none" }}
        >
          <path d={STAR_D} fill={ink} />
        </svg>
      )}

      {/* 4 · the figure */}
      {figure && fig && (
        <div
          ref={figRef}
          className="cbp-figwrap absolute z-30"
          style={{ left: fig.left, top: fig.top, width: fig.w, height: fig.h }}
        >
          <Figure
            uid={uid}
            seed={seed}
            robe={hexRGB(pal.robe, [226, 225, 220])}
            poppy={hexRGB(pal.poppy, [217, 48, 29])}
            refs={{ head: hoodRef, face: faceRef }}
          />
        </div>
      )}

      {/* 5 · the poppies in front of it */}
      <canvas
        ref={frontRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 z-40 block"
        style={{ width: geo ? geo.W : "100%", height: geo ? geo.H : "100%", maxWidth: "none" }}
      />

      {/* 6 · print marks over the painting */}
      {geo && (
        <div className="pointer-events-none absolute inset-0 z-50" style={{ color: mark, fontFamily: labelFont }}>
          <div className="absolute" style={{ left: "1.6cqw", top: geo.head + geo.H * 0.012, width: narrow ? "17cqw" : "12.5cqw" }}>
            <Barcode id={uid + "bl"} color={mark} seed={seed + 1} flip={false} width="100%" />
          </div>
          <div className="absolute" style={{ right: "1.6cqw", top: geo.head + geo.H * 0.012, width: narrow ? "17cqw" : "12.5cqw" }}>
            <Barcode id={uid + "br"} color={mark} seed={seed + 2} flip width="100%" />
          </div>
          {!narrow && (
            <p
              className="absolute m-0 uppercase"
              style={{ left: "15cqw", top: geo.head + geo.H * 0.02, fontSize: fine, letterSpacing: "0.12em", opacity: 0.85 }}
            >
              {edition}
            </p>
          )}

          {[fromParts, toParts].map((parts, side) => (
            <div
              key={side}
              className="absolute font-bold"
              style={{
                left: side ? undefined : "2.2cqw",
                right: side ? "2.2cqw" : undefined,
                top: geo.horizon + (geo.H - geo.horizon) * 0.3,
                fontSize: narrow ? "clamp(13px, 4.6cqw, 22px)" : "clamp(14px, 2.7cqw, 30px)",
                lineHeight: 1.12,
                letterSpacing: "0.04em",
                textAlign: side ? "right" : "left",
                textShadow: "0 1px 10px rgba(0,0,0,0.25)",
              }}
            >
              {parts.map((d, i) => (
                <span key={i} className="cbp-roll">
                  <span style={{ animationDelay: 200 + i * 110 + side * 160 + "ms" }}>{d}</span>
                </span>
              ))}
            </div>
          ))}

          <div className="pointer-events-auto absolute" style={{ left: "2cqw", top: geo.H * 0.79 }}>
            <Venn color={mark} width={narrow ? "20cqw" : "13cqw"} />
          </div>
          <div className="pointer-events-auto absolute" style={{ right: "2cqw", top: geo.H * 0.79 }}>
            <Venn color={mark} width={narrow ? "20cqw" : "13cqw"} />
          </div>

          {/* the foot: arrows, the two controls, the fine print */}
          <div
            className="absolute inset-x-0 flex items-end justify-between"
            style={{ bottom: "1.2cqw", paddingInline: "1.8cqw", gap: "2cqw", fontSize: narrow ? "3cqw" : "clamp(9px, 1.3cqw, 15px)" }}
          >
            <div className="pointer-events-auto flex items-center" style={{ gap: "0.5em" }}>
              <Arrow dir="se" color={mark} size="1.2em" />
              <Arrow dir="sw" color={mark} size="1.2em" />
              <button
                type="button"
                className="cbp-btn"
                aria-pressed={windOn && !reduced}
                aria-label={windOn ? "Still the wind" : "Let the wind blow"}
                title={windOn ? "Still the wind" : "Let the wind blow"}
                onClick={() => setWindOn((v) => !v)}
                disabled={reduced}
                style={{ marginLeft: "0.6em", fontSize: "1em", opacity: reduced ? 0.5 : 1 }}
              >
                <span className="cbp-dot" data-on={windOn && !reduced} />
                <span className="cbp-dot" data-on={!(windOn && !reduced)} />
              </button>
            </div>
            {!narrow && (
              <p
                className="m-0 uppercase"
                style={{ fontSize: fine, lineHeight: 1.4, letterSpacing: "0.05em", maxWidth: "62%", textAlign: "justify", opacity: 0.9 }}
              >
                {footNote}
              </p>
            )}
            <div className="pointer-events-auto flex items-center" style={{ gap: "0.5em" }}>
              <button
                type="button"
                className="cbp-btn"
                aria-label="Send a gust across the field"
                title="Send a gust across the field"
                disabled={reduced || !interactive}
                onClick={() => {
                  gust.current = performance.now()
                  kick.current()
                }}
                style={{ marginRight: "0.6em", fontSize: "1em", opacity: reduced || !interactive ? 0.5 : 1 }}
              >
                <span className="cbp-dot" />
                <span className="cbp-dot" data-on />
              </button>
              <Arrow dir="sw" color={mark} size="1.2em" />
              <Arrow dir="se" color={mark} size="1.2em" />
            </div>
          </div>
        </div>
      )}

      {/* 7 · paper grain and a soft vignette over everything */}
      <svg aria-hidden className="pointer-events-none absolute left-0 top-0 z-[60]" width="100%" height="100%" style={{ mixBlendMode: "overlay", opacity: 0.4, maxWidth: "none" }}>
        <filter id={uid + "grain"}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={"url(#" + uid + "grain)"} />
      </svg>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[60]"
        style={{ background: "radial-gradient(120% 90% at 50% 45%, transparent 60%, rgba(0,0,0,0.28) 100%)" }}
      />
    </section>
  )
}
