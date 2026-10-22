"use client"

import * as React from "react"

/*
 * Postmark CTA: the closing call to action of a landing page, the last block
 * before the footer. A heavy two-line headline, one primary button and a
 * quiet secondary link sit in the middle of a halftone field, and a loose
 * collection of postage stamps is scattered around them.
 *
 * The stamps are the personality. Each one is printed in two inks: a line
 * engraving drawn on a canvas (horizontal lines that swell in the shadows and
 * bend round the form, cross-hatched in the deepest darks) over a flat second
 * ink, with a hair of misregistration. Sixteen engraved subjects ship (travel,
 * produce, studio still lifes), or pass a photo and it is printed as a
 * two-ink duotone on the same paper. Perforations are real geometry, so the
 * teeth stay even at any size.
 *
 * The signature: every stamp can be picked up. It lifts, tilts with the speed
 * of the drag, keeps its momentum when thrown, rubber-bands at the edges of the
 * section and settles on a spring. Hovering the button hovers a postmark over
 * the offer stamp; pressing it brings the postmark down (a circular date die
 * and wavy cancellation bars, inked with a skip texture) while the click goes
 * straight through. Nothing waits on the animation.
 *
 * Three presets (voyage, pantry, atelier), each with its own stamps, inks and
 * copy, and a designed dark version of each. Every word, stamp, image, colour
 * and the postmark text are props.
 */

export type StampArt =
  | "peaks"
  | "lighthouse"
  | "dunes"
  | "sail"
  | "balloon"
  | "bridge"
  | "lemon"
  | "pear"
  | "cherries"
  | "tomato"
  | "olives"
  | "sphere"
  | "cone"
  | "cube"
  | "arch"
  | "ring"

export type StampShape = "portrait" | "landscape" | "round"

export type StampFrame = "classic" | "oval" | "bare"

export type PostmarkStamp = {
  /** Built-in engraved subject. Also the fallback when `image` fails to load. */
  art?: StampArt
  /** A photo, printed as a two-ink duotone. Any URL. */
  image?: string
  /** Top line, set in small capitals, e.g. "PORTUGAL". On a round stamp it runs round the top. */
  label?: string
  /** The denomination, e.g. "0.85" or "from €49". */
  value?: string
  /** Bottom strip, e.g. "Cabo da Roca". On a round stamp it runs round the bottom. */
  caption?: string
  shape?: StampShape
  /**
   * The stamp's layout. "classic": label and value over the art, caption strip under it
   * (a landscape classic carries the value down the side). "oval": the art in an oval
   * vignette on a sunburst. "bare": the art full bleed, the value in a corner.
   */
  frame?: StampFrame
  /** Line ink. Defaults to the preset's. */
  ink?: string
  /** Second ink, under the engraving and on the caption strip. */
  tint?: string
  /** Resting angle in degrees. */
  rotate?: number
  /** Centre on wide screens, in % of the section. Defaults to the built-in layout. */
  x?: number
  y?: number
  /** Size relative to the others (0.7 to 1.3). */
  scale?: number
  /** Printed already cancelled, with the slogan cancel (`postmark.slogan`). */
  cancelled?: boolean
}

export type PostmarkPreset = "voyage" | "pantry" | "atelier"

export type PostmarkPalette = {
  /** Section background. */
  ground: string
  /** Halftone dots at the top and at the bottom of the field. */
  dotsTop: string
  dotsBottom: string
  /** Headline and body text. */
  ink: string
  /** Description and note. */
  muted: string
  /** Button fill and focus ring. */
  accent: string
  /** Text on the button. */
  onAccent: string
  /** The *starred* words of the headline. */
  highlight: string
}

export type PostmarkCtaProps = {
  /** Wrap words in *stars* to set them in the highlight colour. "\n" forces a line break. */
  headline?: string
  description?: React.ReactNode
  ctaLabel?: string
  ctaHref?: string
  /** Runs on click, alongside navigation when there is an href. */
  onCtaClick?: (e: PostmarkClickEvent) => void
  /** Called when the postmark lands (on every press). */
  onPosted?: () => void
  /**
   * With `ctaHref`: wait this many ms before following the link, so the postmark is seen.
   * 0 (the default) never delays navigation; around 280 lets the slam finish.
   */
  postDelay?: number
  secondaryLabel?: string
  secondaryHref?: string
  onSecondaryClick?: (e: PostmarkClickEvent) => void
  /** One quiet line under the buttons. null hides it. */
  note?: React.ReactNode | null
  /** Up to seven stamps. The first four are the ones a phone shows; the third sits by the button and takes the postmark. */
  stamps?: PostmarkStamp[]
  /** Which stamp the button's postmark lands on. */
  postOn?: number
  /** The postmark's ring text and date (defaults to today), and the slogan cancel on pre-cancelled stamps ("\n" splits its two lines). */
  postmark?: { top?: string; bottom?: string; date?: string; slogan?: string }
  preset?: PostmarkPreset
  /** Override the preset's light colours. */
  palette?: PostmarkPaletteInput
  /** Override the preset's dark colours. */
  darkPalette?: PostmarkPaletteInput
  /** "auto" follows a `.dark` class on any ancestor (shadcn / Tailwind convention). */
  theme?: "auto" | "light" | "dark"
  /** Pick the stamps up and throw them. */
  draggable?: boolean
  /** Stamps drift a little at rest and lean away from the pointer. Off under reduced motion. */
  ambient?: boolean
  /** Minimum height on wide screens (phones size to their content). Any definite CSS length. */
  height?: number | string
  /** Font stacks. The headline wants a heavy face. */
  displayFont?: string
  textFont?: string
  id?: string
  className?: string
  style?: React.CSSProperties
}

// #region logic
const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x)
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

/**
 * The paper outline of a perforated stamp in its own units: a w x h rectangle
 * with a half-hole bitten out at every perforation, holes at the corners too.
 * The hole count along each side is fixed by the pitch, so the teeth stay even
 * whatever size the stamp is drawn at.
 */
export function perforatedPath(w: number, h: number, pitch: number, holeRatio = 0.56) {
  const nx = Math.max(2, Math.round(w / pitch))
  const ny = Math.max(2, Math.round(h / pitch))
  const px = w / nx
  const py = h / ny
  const r = (Math.min(px, py) * holeRatio) / 2
  const f = (n: number) => +n.toFixed(3)
  const arc = (x: number, y: number) => "A" + f(r) + " " + f(r) + " 0 0 0 " + f(x) + " " + f(y)
  let d = "M" + f(r) + " 0"
  for (let i = 1; i < nx; i++) d += "L" + f(i * px - r) + " 0" + arc(i * px + r, 0)
  d += "L" + f(w - r) + " 0" + arc(w, r)
  for (let j = 1; j < ny; j++) d += "L" + f(w) + " " + f(j * py - r) + arc(w, j * py + r)
  d += "L" + f(w) + " " + f(h - r) + arc(w - r, h)
  for (let i = nx - 1; i > 0; i--) d += "L" + f(i * px + r) + " " + f(h) + arc(i * px - r, h)
  d += "L" + f(r) + " " + f(h) + arc(0, h - r)
  for (let j = ny - 1; j > 0; j--) d += "L0 " + f(j * py + r) + arc(0, j * py - r)
  d += "L0 " + f(r) + arc(r, 0) + "Z"
  return { d, nx, ny, r }
}

/** "Ready to *go*\nsomewhere?" -> lines of runs, starred runs highlighted. */
export function parseHeadline(text: string) {
  return text.split("\n").map((line) => {
    const runs: { text: string; hi: boolean }[] = []
    line.split("*").forEach((part, i) => {
      if (part) runs.push({ text: part, hi: i % 2 === 1 })
    })
    return runs
  })
}

/** Semi-implicit Euler step of a spring with Apple's response/damping-ratio parameters. */
export function springStep(x: number, v: number, target: number, dt: number, response: number, damping: number) {
  const k = (2 * Math.PI / response) ** 2
  const c = (4 * Math.PI * damping) / response
  v += (-k * (x - target) - c * v) * dt
  x += v * dt
  return [x, v]
}

/** Where a throw would come to rest (UIScrollView-style exponential decay). */
export const project = (v: number, rate = 0.992) => ((v / 1000) * rate) / (1 - rate)

/** Soft resistance past an edge: the further out, the less it follows. */
export const rubber = (over: number, dim: number, c = 0.55) => (over * dim * c) / (dim + c * Math.abs(over))

/** Keep a value inside [lo, hi], rubber-banding the overshoot. */
export function band(x: number, lo: number, hi: number, dim: number) {
  if (x < lo) return lo + rubber(x - lo, dim)
  if (x > hi) return hi + rubber(x - hi, dim)
  return x
}

/** Halftone dot radius as a fraction of the pitch: big at the bottom, quieter at the top, clear behind the copy. */
export function dotSize(x: number, y: number, c: number[] = [0.5, 0.48, 0.34, 0.3]) {
  const base = 0.12 + 0.6 * smooth(0.42, 1.04, y) + 0.32 * smooth(0.36, -0.08, y)
  const wave = 0.06 * Math.sin(x * 9.1 + y * 4.3) + 0.05 * Math.sin(x * 3.7 - y * 7.9 + 1.3)
  const dx = (x - c[0]) / c[2]
  const dy = (y - c[1]) / c[3]
  const clear = smooth(0.55, 1.25, Math.sqrt(dx * dx + dy * dy))
  return clamp01((base + wave) * (0.25 + 0.75 * clear))
}

// ---- engraved art: each subject maps (u, v) in 0..1 to [lightness, second ink, line bend (in heights)]
export type Sample = [number, number, number]
export type Scene = (u: number, v: number) => Sample

// light from the upper left, a little in front
const LX = -0.55
const LY = -0.62
const LZ = 0.56

function lambert(nx: number, ny: number, nz: number) {
  const d = nx * LX + ny * LY + nz * LZ
  // a touch of bounced light on the shadow side keeps the turn readable
  return clamp01(0.06 + 0.9 * Math.max(0, d) + 0.12 * Math.max(0, nx * 0.6 + ny * 0.3) * (1 - nz))
}

/** Shade an ellipsoid; returns -1 outside. */
function ellipsoid(u: number, v: number, cx: number, cy: number, rx: number, ry: number) {
  const dx = (u - cx) / rx
  const dy = (v - cy) / ry
  const d2 = dx * dx + dy * dy
  if (d2 > 1) return -1
  const nz = Math.sqrt(1 - d2)
  return lambert(dx, dy, nz)
}
function nzOf(u: number, v: number, cx: number, cy: number, rx: number, ry: number) {
  const dx = (u - cx) / rx
  const dy = (v - cy) / ry
  return Math.sqrt(Math.max(0, 1 - dx * dx - dy * dy))
}
const circle = (u: number, v: number, cx: number, cy: number, r: number) => Math.hypot(u - cx, v - cy) < r
function segDist(u: number, v: number, ax: number, ay: number, bx: number, by: number) {
  const ux = bx - ax
  const uy = by - ay
  const t = clamp01(((u - ax) * ux + (v - ay) * uy) / (ux * ux + uy * uy))
  return Math.hypot(u - ax - ux * t, v - ay - uy * t)
}
function polyDist(u: number, v: number, pts: number[]) {
  let m = 1e9
  for (let i = 0; i + 3 < pts.length; i += 2) m = Math.min(m, segDist(u, v, pts[i], pts[i + 1], pts[i + 2], pts[i + 3]))
  return m
}
function quad(ax: number, ay: number, cx: number, cy: number, bx: number, by: number, n = 18) {
  const out: number[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const s = 1 - t
    out.push(s * s * ax + 2 * s * t * cx + t * t * bx, s * s * ay + 2 * s * t * cy + t * t * by)
  }
  return out
}
function ridge(u: number, pts: number[]) {
  for (let i = 0; i + 3 < pts.length; i += 2) {
    const x0 = pts[i]
    const x1 = pts[i + 2]
    if (u <= x1) {
      const t = (u - x0) / (x1 - x0)
      return [pts[i + 1] + (pts[i + 3] - pts[i + 1]) * t, pts[i + 3] - pts[i + 1]]
    }
  }
  return [pts[pts.length - 1], 0]
}
/** A leaf: a lens along a→b, half-width w. Returns [lightness] or -1. */
function leaf(u: number, v: number, ax: number, ay: number, bx: number, by: number, w: number) {
  const lx = bx - ax
  const ly = by - ay
  const len = Math.hypot(lx, ly)
  const t = ((u - ax) * lx + (v - ay) * ly) / (len * len)
  if (t < 0 || t > 1) return -1
  const side = ((u - ax) * -ly + (v - ay) * lx) / len
  const half = w * Math.sin(Math.PI * t) ** 0.8
  if (Math.abs(side) > half) return -1
  if (Math.abs(side) < 0.006) return 0.12
  return side > 0 ? 0.3 : 0.62
}
const sky = (v: number) => 0.97 - 0.13 * (1 - v)
const waves = (u: number, v: number, k: number) => 0.0045 * Math.sin(u * 23 + v * 9) * k

const PEAK_BACK = [0, 0.5, 0.13, 0.33, 0.25, 0.42, 0.42, 0.17, 0.55, 0.32, 0.66, 0.26, 0.8, 0.4, 0.91, 0.31, 1, 0.42]
const PEAK_FRONT = [0, 0.66, 0.17, 0.5, 0.33, 0.62, 0.5, 0.52, 0.67, 0.66, 0.83, 0.54, 1, 0.64]
/**
 * Mountain faces: each summit owns the strip between the valley lines either
 * side of it, and is lit on the near side of a crease that runs down from the
 * summit. Creases and valley lines lean the same way, so the range reads as
 * faceted rock with gullies, never as vertical bands.
 */
const LEAN = 0.3
function facet(u: number, v: number, pts: number[], lit: number, shade: number) {
  const valleyX = (i: number) => pts[i] + (v - pts[i + 1]) * LEAN
  for (let i = 2; i + 3 < pts.length; i += 2) {
    const y = pts[i + 1]
    if (!(y < pts[i - 1] && y < pts[i + 3])) continue
    // the valleys either side of this summit (or the ends of the range)
    let l = i - 2
    while (l > 0 && !(pts[l + 1] > pts[l - 1] && pts[l + 1] > pts[l + 3])) l -= 2
    let r = i + 2
    while (r + 3 < pts.length && !(pts[r + 1] > pts[r - 1] && pts[r + 1] > pts[r + 3])) r += 2
    const lx = l <= 0 ? -1 : valleyX(l)
    const rx = r + 3 >= pts.length ? 2 : valleyX(r)
    if (u >= lx && u < rx) {
      const crease = pts[i] + (v - y) * LEAN + 0.006 * Math.sin(v * 48)
      return [u < crease ? lit : shade, v - y]
    }
  }
  return [shade, 1]
}
const CHERRY_A = quad(0.37, 0.55, 0.42, 0.3, 0.6, 0.15)
const CHERRY_B = quad(0.63, 0.59, 0.66, 0.36, 0.6, 0.15)
const OLIVE_BRANCH = quad(0.1, 0.78, 0.45, 0.62, 0.9, 0.24)

export const SCENES: { [k: string]: Scene } = {
  peaks(u, v) {
    let l = sky(v)
    let t = 0
    if (circle(u, v, 0.76, 0.2, 0.12)) {
      l = 1
      t = 1
    }
    // rock strata: faint diagonal banding that the line widths pick up
    const strata = 0.07 * Math.sin((u * 1.4 + v) * 52)
    const [b] = ridge(u, PEAK_BACK)
    if (v > b) {
      const [fl, below] = facet(u, v, PEAK_BACK, 0.7, 0.4)
      l = fl - (v - b) * 0.25 + strata
      if (below < 0.085 + 0.025 * Math.sin(u * 47)) l = fl > 0.55 ? 0.995 : 0.8
      if (v - b < 0.009) l = 0.16
      t = 0
    }
    const [f] = ridge(u, PEAK_FRONT)
    if (v > f) {
      const [fl] = facet(u, v, PEAK_FRONT, 0.54, 0.27)
      l = fl - (v - f) * 0.2 + strata
      if (v - f < 0.01) l = 0.12
    }
    if (v > 0.8) return [0.74 + 0.08 * Math.sin(u * 30), 0.5, waves(u, v, 1)]
    return [l, t, 0]
  },
  lighthouse(u, v) {
    let l = sky(v)
    let t = 0.18 + 0.3 * v
    let b = 0
    // a far headland on the horizon, then the sea
    if (v > 0.6 - 0.05 * Math.exp(-(((u - 0.16) / 0.13) ** 2)) && v < 0.62) {
      l = 0.42
      t = 0.2
    }
    if (v >= 0.62) {
      l = 0.6 + 0.08 * Math.sin(u * 30)
      t = 0.85
      b = waves(u, v, 1)
    }
    // the cliff: a mass on the right that widens as it falls into the sea
    const edge = 0.56 - 0.12 * (v - 0.44) + 0.02 * Math.sin(v * 40)
    if (v > 0.44 && u > edge) {
      t = 0
      b = 0
      l = 0.64 - 0.34 * smooth(0, 0.2, u - edge) + 0.08 * Math.sin((v * 2 - u) * 48)
      if (v < 0.48) l = 0.74
      if (u - edge < 0.008 || v - 0.44 < 0.007) l = 0.14
    } else if (v > 0.62 && u > edge - 0.05) {
      // surf at the foot of the cliff
      l = 0.96
      t = 0.2
    }
    // keeper's house
    if (u > 0.82 && u < 0.95 && v > 0.37 && v <= 0.44) {
      l = u < 0.88 ? 0.9 : 0.55
      t = 0
    }
    if (v > 0.32 && v <= 0.37 && Math.abs(u - 0.885) < 0.075 - (0.37 - v) * 1.2) {
      l = 0.22
      t = 0
    }
    // tower, gallery, lantern, roof
    const hw = 0.034 + 0.02 * ((v - 0.2) / 0.24)
    if (v > 0.2 && v <= 0.44 && Math.abs(u - 0.74) < hw) {
      const stripe = Math.floor((v - 0.2) / 0.06) % 2 === 1
      l = u < 0.74 ? (stripe ? 0.72 : 0.95) : stripe ? 0.34 : 0.55
      t = stripe ? 1 : 0
    }
    if (v > 0.19 && v <= 0.21 && Math.abs(u - 0.74) < 0.056) {
      l = 0.16
      t = 0
    }
    if (v > 0.145 && v <= 0.19 && Math.abs(u - 0.74) < 0.03) {
      l = 1
      t = 1
    }
    if (v > 0.1 && v <= 0.145 && Math.abs(u - 0.74) < (v - 0.1) * 1.1) {
      l = 0.12
      t = 0
    }
    return [l, t, b]
  },
  dunes(u, v) {
    let l = sky(v)
    let t = 0
    let b = 0
    if (circle(u, v, 0.5, 0.3, 0.2) && !(v > 0.3 && Math.sin(v * 95) > 0.35)) {
      l = 1
      t = 1
    }
    // rows of dunes, each lit along its crest and darkening into the trough behind the next
    const layers: [number, number, number, number, number][] = [
      [0.48, 0.045, 5.2, 0.4, 0.9],
      [0.6, 0.06, 4.1, 2.1, 0.82],
      [0.75, 0.055, 6.3, 1.0, 0.74],
      [0.88, 0.04, 3.3, 2.8, 0.66],
    ]
    // one continuous bend field, so the lines flow from dune to dune without breaking
    let bw = 0
    let bs = 0
    for (const [base, amp, fr, ph] of layers) {
      const w = Math.exp(-(((v - base - 0.05) / 0.07) ** 2))
      bs += amp * Math.sin(u * fr + ph) * 0.75 * w
      bw += w
    }
    if (v > 0.38) b = (bs / (bw || 1)) * smooth(0.38, 0.46, v)
    layers.forEach(([base, amp, fr, ph, lit], i) => {
      const d = base + amp * Math.sin(u * fr + ph)
      if (v <= d) return
      l = clamp01(lit - (v - d) * 2.2 + 0.04 * Math.sin(u * 70 + v * 30))
      t = i % 2 ? 0.35 : 0.7
      if (v - d < 0.006) l = 0.15
    })
    return [l, t, b]
  },
  sail(u, v) {
    let l = sky(v)
    let t = 0
    if (circle(u, v, 0.24, 0.24, 0.09) && !circle(u, v, 0.28, 0.21, 0.08)) {
      l = 1
      t = 1
    }
    if (v > 0.6 - 0.05 * Math.exp(-(((u - 0.82) / 0.1) ** 2)) && v < 0.6) l = 0.38
    let b = 0
    if (v >= 0.6) {
      l = 0.66 + 0.14 * Math.sin(u * 44 + v * 66)
      t = 0.28
      b = waves(u, v, 1)
      if (v < 0.8 && Math.abs(u - 0.47) < 0.13 && Math.sin(v * 120 + u * 20) > 0.2) l = 0.42
    }
    if (v > 0.655 && v < 0.715 && Math.abs(u - 0.47) < 0.21 - (v - 0.655) * 1.6) {
      l = v < 0.672 ? 0.6 : 0.14
      t = v < 0.672 ? 1 : 0
    }
    if (Math.abs(u - 0.47) < 0.007 && v > 0.17 && v <= 0.655) l = 0.1
    if (u > 0.477 && v < 0.64 && v > 0.19 && (u - 0.477) / 0.21 < (v - 0.19) / 0.45) {
      l = 0.97 - 0.42 * ((u - 0.477) / 0.21)
      t = 0
    }
    if (u < 0.463 && v < 0.62 && v > 0.24 && (0.463 - u) / 0.16 < (v - 0.24) / 0.38) {
      l = 0.78 - 0.3 * ((0.463 - u) / 0.16)
      t = 1
    }
    return [l, t, b]
  },
  balloon(u, v) {
    let l = 0.86 + 0.12 * v
    let t = 0
    let b = 0
    const clouds = [0.16, 0.84, 0.13, 0.32, 0.79, 0.15, 0.47, 0.87, 0.11, 0.68, 0.83, 0.14, 0.86, 0.88, 0.12]
    for (let i = 0; i < clouds.length; i += 3) {
      const s = ellipsoid(u, v, clouds[i], clouds[i + 1], clouds[i + 2], clouds[i + 2] * 0.8)
      if (s >= 0) l = 0.62 + 0.38 * s
    }
    // the envelope: a sphere that tapers to the burner
    const cy = 0.38
    const k = v > cy ? 1 - 0.58 * ((v - cy) / 0.31) ** 1.5 : 1
    const rx = 0.27 * Math.max(0.05, k)
    const dx = (u - 0.5) / rx
    const dy = (v - cy) / 0.31
    if (dx * dx + dy * dy <= 1 && v < 0.69) {
      const nz = Math.sqrt(Math.max(0, 1 - dx * dx - dy * dy))
      l = lambert(dx, dy * 0.7, nz)
      const gore = Math.floor((Math.asin(clamp(dx, -1, 1)) / Math.PI + 0.5) * 7)
      t = gore % 2
      b = 0.035 * nz
    }
    if (v > 0.69 && v < 0.79) {
      const d = Math.min(segDist(u, v, 0.45, 0.69, 0.465, 0.79), segDist(u, v, 0.55, 0.69, 0.535, 0.79))
      if (d < 0.005) l = 0.18
    }
    if (v >= 0.79 && v < 0.86 && Math.abs(u - 0.5) < 0.045) {
      l = u < 0.5 ? 0.5 : 0.2
      t = 0
    }
    return [l, t, b]
  },
  bridge(u, v) {
    let l = sky(v)
    let t = 0
    let b = 0
    if (circle(u, v, 0.3, 0.38, 0.15)) {
      l = 1
      t = 1
    }
    if (v > 0.6 - 0.12 * Math.exp(-(((u - 1) / 0.2) ** 2))) l = 0.42
    if (v > 0.7) {
      l = 0.66 + 0.12 * Math.sin(u * 40 + v * 70)
      t = 0.3
      b = waves(u, v, 1)
    }
    // cables
    const main = u >= 0.27 && u <= 0.77 ? 0.14 + 0.42 * (1 - ((u - 0.52) / 0.25) ** 2) : u < 0.27 ? 0.14 + (0.27 - u) * 1.6 : 0.14 + (u - 0.77) * 1.6
    if (Math.abs(v - main) < 0.007 && v < 0.6) l = 0.1
    if (v > main && v < 0.6 && Math.abs(((u * 34) % 1) - 0.5) < 0.09) l = Math.min(l, 0.4)
    // deck
    if (v > 0.6 && v < 0.64) {
      l = v < 0.615 ? 0.2 : 0.45
      t = v < 0.615 ? 0.6 : 0
    }
    // towers: two legs and cross beams, in the second ink
    for (const c of [0.27, 0.77]) {
      const leg = Math.abs(u - (c - 0.024)) < 0.011 || Math.abs(u - (c + 0.024)) < 0.011
      const beam = Math.abs(u - c) < 0.035 && [0.17, 0.4].some((y) => Math.abs(v - y) < 0.012)
      if (v > 0.12 && v < 0.74 && (leg || beam)) {
        l = u < c ? 0.48 : 0.2
        t = 1
      }
    }
    return [l, t, b]
  },
  lemon(u, v) {
    let l = 0.97
    let t = 0
    let b = 0
    if (v > 0.77) l = 0.84
    const sh = ((u - 0.55) / 0.33) ** 2 + ((v - 0.8) / 0.055) ** 2
    if (sh < 1) l = 0.3 + 0.5 * sh
    const c = Math.cos(-0.38)
    const s = Math.sin(-0.38)
    const a = (u - 0.47) * c - (v - 0.55) * s
    const e = (u - 0.47) * s + (v - 0.55) * c
    const rx = 0.32
    const ry = 0.215 * (1 - 0.42 * (a / rx) ** 4)
    const dx = a / rx
    const dy = e / ry
    if (dx * dx + dy * dy <= 1) {
      const nz = Math.sqrt(1 - dx * dx - dy * dy)
      const nx = dx * c + dy * s
      const ny = -dx * s + dy * c
      l = lambert(nx, ny, nz)
      if (l > 0.9) l = 1
      t = 1
      b = 0.035 * nz
    }
    if (segDist(u, v, 0.61, 0.42, 0.665, 0.365) < 0.009) {
      l = 0.14
      t = 0
    }
    const lf = leaf(u, v, 0.66, 0.37, 0.86, 0.2, 0.06)
    if (lf >= 0) {
      l = lf
      t = 0
    }
    return [l, t, b]
  },
  pear(u, v) {
    let l = 0.97
    let t = 0
    let b = 0
    if (v > 0.8) l = 0.84
    const sh = ((u - 0.58) / 0.3) ** 2 + ((v - 0.86) / 0.05) ** 2
    if (sh < 1) l = 0.3 + 0.5 * sh
    // smooth union of a big and a small circle, shaded as a soft blob
    const d1 = Math.hypot(u - 0.5, v - 0.64) - 0.23
    const d2 = Math.hypot(u - 0.47, v - 0.38) - 0.12
    const k = 0.12
    const hh = clamp01(0.5 + (0.5 * (d2 - d1)) / k)
    const d = d2 * (1 - hh) + d1 * hh - k * hh * (1 - hh)
    if (d < 0) {
      const eps = 0.004
      const sdf = (x: number, y: number) => {
        const a1 = Math.hypot(x - 0.5, y - 0.64) - 0.23
        const a2 = Math.hypot(x - 0.47, y - 0.38) - 0.12
        const h2 = clamp01(0.5 + (0.5 * (a2 - a1)) / k)
        return a2 * (1 - h2) + a1 * h2 - k * h2 * (1 - h2)
      }
      const gx = (sdf(u + eps, v) - sdf(u - eps, v)) / (2 * eps)
      const gy = (sdf(u, v + eps) - sdf(u, v - eps)) / (2 * eps)
      const depth = clamp01(-d / 0.2)
      const nz = Math.sqrt(1 - (1 - depth) ** 2)
      const sxy = Math.sqrt(Math.max(0, 1 - nz * nz))
      const gl = Math.hypot(gx, gy) || 1
      l = Math.max(0.2, lambert((gx / gl) * sxy, (gy / gl) * sxy, nz))
      t = 1
      b = 0.03 * nz
    }
    if (segDist(u, v, 0.47, 0.27, 0.51, 0.15) < 0.011) l = 0.14
    const lf = leaf(u, v, 0.5, 0.2, 0.7, 0.13, 0.05)
    if (lf >= 0) {
      l = lf
      t = 0
    }
    return [l, t, b]
  },
  cherries(u, v) {
    let l = 0.97
    let t = 0
    let b = 0
    if (v > 0.84) l = 0.84
    for (const [cx, cy] of [
      [0.36, 0.69],
      [0.63, 0.73],
    ]) {
      const sh = ((u - cx - 0.06) / 0.17) ** 2 + ((v - cy - 0.14) / 0.04) ** 2
      if (sh < 1) l = Math.min(l, 0.3 + 0.5 * sh)
    }
    if (polyDist(u, v, CHERRY_A) < 0.009 || polyDist(u, v, CHERRY_B) < 0.009) l = 0.15
    for (const [cx, cy] of [
      [0.36, 0.69],
      [0.63, 0.73],
    ]) {
      const s = ellipsoid(u, v, cx, cy, 0.15, 0.14)
      if (s >= 0) {
        l = s > 0.9 ? 1 : s * 0.92
        t = 1
        b = 0.03 * nzOf(u, v, cx, cy, 0.15, 0.14)
      }
    }
    const lf = leaf(u, v, 0.6, 0.15, 0.84, 0.1, 0.055)
    if (lf >= 0) {
      l = lf
      t = 0
    }
    return [l, t, b]
  },
  tomato(u, v) {
    let l = 0.97
    let t = 0
    let b = 0
    if (v > 0.8) l = 0.84
    const sh = ((u - 0.56) / 0.34) ** 2 + ((v - 0.84) / 0.05) ** 2
    if (sh < 1) l = 0.3 + 0.5 * sh
    const s = ellipsoid(u, v, 0.5, 0.58, 0.32, 0.26)
    if (s >= 0) {
      const th = Math.atan2(v - 0.58, u - 0.5)
      const ribs = 0.88 + 0.12 * Math.cos(th * 6) * smooth(0.1, 0.0, Math.abs(th + Math.PI / 2) / 6)
      l = clamp01(s * ribs)
      if (l > 0.9) l = 1
      t = 1
      b = 0.035 * nzOf(u, v, 0.5, 0.58, 0.32, 0.26)
      const st = Math.atan2(v - 0.36, u - 0.5)
      const r = Math.hypot(u - 0.5, (v - 0.36) * 1.6)
      if (r < 0.03 + 0.08 * Math.max(0, Math.cos(st * 5)) ** 3) {
        l = 0.22
        t = 0
      }
    }
    if (segDist(u, v, 0.5, 0.36, 0.53, 0.25) < 0.012) l = 0.15
    return [l, t, b]
  },
  olives(u, v) {
    let l = 0.97
    let t = 0
    let b = 0
    if (polyDist(u, v, OLIVE_BRANCH) < 0.009) l = 0.2
    const leaves = [0.2, 0.71, 0.08, 0.5, 0.3, 0.69, 0.38, 0.92, 0.48, 0.58, 0.68, 0.7, 0.64, 0.45, 0.82, 0.62, 0.8, 0.31, 0.96, 0.44]
    for (let i = 0; i < leaves.length; i += 4) {
      const lf = leaf(u, v, leaves[i], leaves[i + 1], leaves[i + 2], leaves[i + 3], 0.045)
      if (lf >= 0) l = lf
    }
    for (const [cx, cy, rx, ry] of [
      [0.33, 0.79, 0.075, 0.1],
      [0.53, 0.72, 0.08, 0.105],
      [0.72, 0.55, 0.07, 0.095],
    ]) {
      const s = ellipsoid(u, v, cx, cy, rx, ry)
      if (s >= 0) {
        l = s > 0.9 ? 1 : s * 0.9
        t = 1
        b = 0.02 * nzOf(u, v, cx, cy, rx, ry)
      }
    }
    return [l, t, b]
  },
  sphere(u, v) {
    let l = 0.96
    let t = 0
    let b = 0
    if (circle(u, v, 0.5, 0.42, 0.37)) t = 0.95
    if (v > 0.74) {
      l = 0.78
      t = 0
    }
    const sh = ((u - 0.64) / 0.3) ** 2 + ((v - 0.78) / 0.055) ** 2
    if (sh < 1) l = 0.25 + 0.5 * sh
    const s = ellipsoid(u, v, 0.48, 0.5, 0.26, 0.26)
    if (s >= 0) {
      l = s > 0.92 ? 1 : s
      t = 0
      b = 0.04 * nzOf(u, v, 0.48, 0.5, 0.26, 0.26)
    }
    return [l, t, b]
  },
  cone(u, v) {
    let l = 0.96
    let t = 0
    let b = 0
    if (v > 0.74) {
      l = 0.8
      t = 0.6
    }
    const sh = ((u - 0.66) / 0.28) ** 2 + ((v - 0.74) / 0.05) ** 2
    if (sh < 1 && v > 0.7) l = 0.25 + 0.5 * sh
    const apex = 0.15
    const base = 0.72
    const half = (0.25 * (v - apex)) / (base - apex)
    const inBase = ((u - 0.5) / 0.25) ** 2 + ((v - base) / 0.06) ** 2 < 1 && v >= base
    if ((v >= apex && v < base && Math.abs(u - 0.5) < half) || inBase) {
      const s = clamp((u - 0.5) / Math.max(half, 0.25 * (inBase ? 1 : 0)), -1, 1)
      l = lambert(s * 0.92, -0.38, Math.sqrt(Math.max(0, 1 - s * s * 0.85)))
      t = 0
      b = 0.05 * (1 - s * s) * clamp01((v - apex) / (base - apex))
    }
    return [l, t, b]
  },
  cube(u, v) {
    let l = 0.96
    let t = 0
    let b = 0
    const inPoly = (pts: number[]) => {
      let inside = false
      for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
        const xi = pts[i]
        const yi = pts[i + 1]
        const xj = pts[j]
        const yj = pts[j + 1]
        if (yi > v !== yj > v && u < ((xj - xi) * (v - yi)) / (yj - yi) + xi) inside = !inside
      }
      return inside
    }
    if (inPoly([0.5, 0.8, 0.75, 0.665, 0.97, 0.79, 0.72, 0.925])) l = 0.4
    if (inPoly([0.5, 0.2, 0.75, 0.335, 0.5, 0.47, 0.25, 0.335])) {
      l = 0.94
      t = 1
    } else if (inPoly([0.25, 0.335, 0.5, 0.47, 0.5, 0.8, 0.25, 0.665])) {
      l = 0.6
    } else if (inPoly([0.5, 0.47, 0.75, 0.335, 0.75, 0.665, 0.5, 0.8])) {
      l = 0.24
    }
    return [l, t, b]
  },
  arch(u, v) {
    let l = 0.5 - 0.08 * v
    let t = 0
    const inOpening = (u > 0.3 && u < 0.7 && v > 0.36 && v < 0.84) || (v <= 0.36 && Math.hypot(u - 0.5, v - 0.36) < 0.2)
    if (Math.abs(((v * 15) % 1) - 0.5) > 0.45) l -= 0.18
    if (inOpening) {
      l = sky(v)
      if (circle(u, v, 0.5, 0.66, 0.14)) {
        l = 1
        t = 1
      }
      if (v > 0.74) {
        l = 0.68
        t = 0.35
      }
      if (u < 0.33 && v > 0.36) l = 0.84
    }
    if (v > 0.84) l = Math.floor((v - 0.84) / 0.04) % 2 ? 0.66 : 0.3
    return [l, t, 0]
  },
  ring(u, v) {
    let l = 0.96
    let t = 0
    let b = 0
    const r = Math.hypot(u - 0.5, v - 0.5)
    const s = (r - 0.27) / 0.12
    if (Math.abs(s) < 1) {
      const dx = (u - 0.5) / (r || 1)
      const dy = (v - 0.5) / (r || 1)
      const nz = Math.sqrt(1 - s * s)
      l = lambert(dx * s, dy * s, nz)
      if (l > 0.9) l = 1
      t = 1
      b = 0.03 * nz
    }
    return [l, t, b]
  },
}

/**
 * Lay out the engraving of one scene in a w x h box: one filled ribbon per
 * line (top edge out, bottom edge back), its width swelling with the dark,
 * plus a diagonal hatch over the deepest shadows.
 */
export function engraveLines(scene: Scene, w: number, h: number, pitch: number) {
  const lines: number[][] = []
  const step = 0.75
  const n = Math.ceil(h / pitch)
  const maxW = pitch * 0.94
  const width = (l: number) => (l >= 0.975 ? 0 : Math.max(0.28, maxW * (1 - l) ** 0.82))
  for (let j = 0; j < n; j++) {
    const y0 = (j + 0.5) * pitch
    const top: number[] = []
    const bot: number[] = []
    for (let x = 0; x <= w + 0.01; x += step) {
      const u = x / w
      const bend = scene(u, y0 / h)[2] * h
      const y = y0 + bend
      const at = scene(u, clamp01(y / h))
      // a line bent out of its own region would draw a stray: drop that stretch
      const lw = Math.abs(at[2] * h - bend) > pitch * 0.7 ? 0 : width(at[0])
      top.push(x, y - lw / 2)
      bot.push(x, y + lw / 2)
    }
    const ring = top
    for (let i = bot.length - 2; i >= 0; i -= 2) ring.push(bot[i], bot[i + 1])
    lines.push(ring)
  }
  // hatch at 45° across the darks only
  const hp = pitch * 1.25
  for (let c = -h; c < w; c += hp) {
    let seg: number[] = []
    const flush = () => {
      if (seg.length > 4) lines.push(seg)
      seg = []
    }
    let top: number[] = []
    let bot: number[] = []
    for (let s = 0; s <= h; s += step) {
      const x = c + s
      const y = s
      if (x < 0 || x > w) continue
      const l = scene(x / w, y / h)[0]
      const lw = l < 0.32 ? ((0.32 - l) / 0.32) * pitch * 0.55 : 0
      if (lw > 0.15) {
        top.push(x + lw / 2, y - lw / 2)
        bot.push(x - lw / 2, y + lw / 2)
      } else if (top.length) {
        seg = top
        for (let i = bot.length - 2; i >= 0; i -= 2) seg.push(bot[i], bot[i + 1])
        flush()
        top = []
        bot = []
      }
    }
    if (top.length) {
      seg = top
      for (let i = bot.length - 2; i >= 0; i -= 2) seg.push(bot[i], bot[i + 1])
      flush()
    }
  }
  return lines
}

export function hexToRgb(hex: string) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
export function mix(a: string, b: string, t: number) {
  const x = hexToRgb(a)
  const y = hexToRgb(b)
  if (!x || !y) return t < 0.5 ? a : b
  return "rgb(" + x.map((c, i) => Math.round(c + (y[i] - c) * t)).join(",") + ")"
}
function lum(hex: string) {
  const c = hexToRgb(hex)
  if (!c) return NaN
  const f = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2])
}
/** WCAG contrast ratio of two #rrggbb colours (NaN for anything else). */
export function contrast(a: string, b: string) {
  const x = lum(a)
  const y = lum(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

/** "15 OCT 2026" */
export function postmarkDate(d: Date) {
  const m = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][d.getMonth()]
  return String(d.getDate()).padStart(2, "0") + " " + m + " " + d.getFullYear()
}

type Box = { left: number; top: number; right: number; bottom: number }
/**
 * The smallest move that takes box b clear of every box in avoid (by margin m)
 * while staying inside the frame (give or take `slack`, a fraction of its own
 * size). Returns [dx, dy, 1 if it ended clear else 0].
 */
export function clearOf(b: Box, avoid: Box[], frame: Box, m: number, slack = 0) {
  let dx = 0
  let dy = 0
  for (let pass = 0; pass < 3; pass++) {
    let moved = false
    for (const r of avoid) {
      const L = b.left + dx
      const T = b.top + dy
      const R = b.right + dx
      const B = b.bottom + dy
      if (R <= r.left - m || L >= r.right + m || B <= r.top - m || T >= r.bottom + m) continue
      const w = R - L
      const h = B - T
      const options = [
        [0, r.bottom + m - T],
        [0, r.top - m - B],
        [r.left - m - R, 0],
        [r.right + m - L, 0],
      ].filter(
        ([x, y]) =>
          L + x >= frame.left - w * slack && R + x <= frame.right + w * slack && T + y >= frame.top - h * slack && B + y <= frame.bottom + h * slack,
      )
      if (!options.length) continue
      options.sort((p, q) => Math.hypot(p[0], p[1]) - Math.hypot(q[0], q[1]))
      dx += options[0][0]
      dy += options[0][1]
      moved = true
    }
    if (!moved) break
  }
  const L = b.left + dx
  const T = b.top + dy
  const clear = avoid.every((r) => b.right + dx <= r.left - m + 0.5 || L >= r.right + m - 0.5 || b.bottom + dy <= r.top - m + 0.5 || T >= r.bottom + m - 0.5)
  return [dx, dy, clear ? 1 : 0]
}

/** Wide-screen centres (% of the section) and phone placements for up to seven stamps. */
export const SLOTS = [
  { x: 17, y: 27, r: -8, d: 1.2, c: { x: "23%", y: "92px" } },
  { x: 40, y: 16, r: 5, d: 0.7, c: { x: "73%", y: "84px" } },
  { x: 70, y: 80, r: -6, d: 1.3, c: { x: "71%", y: "calc(100% - 96px)" } },
  { x: 14, y: 69, r: -9, d: 0.9, c: { x: "27%", y: "calc(100% - 92px)" } },
  { x: 83, y: 25, r: 7, d: 1.0, c: null },
  { x: 86, y: 64, r: 4, d: 1.1, c: null },
  { x: 33, y: 86, r: 6, d: 0.8, c: null },
]
// #endregion

type Ink = { ink: string; tint: string }
type PresetDef = {
  light: PostmarkPalette
  dark: PostmarkPalette
  copy: {
    headline: string
    description: string
    ctaLabel: string
    secondaryLabel: string
    note: string
    postmark: { top: string; bottom: string; slogan: string }
  }
  stamps: PostmarkStamp[]
  postOn: number
}

const PAPER = "#fbf7ee"

const PRESETS: { [k: string]: PresetDef } = {
  voyage: {
    light: { ground: "#e9eef5", dotsTop: "#a9bdd8", dotsBottom: "#f1ab8f", ink: "#172b4a", muted: "#45556e", accent: "#c4421a", onAccent: "#ffffff", highlight: "#c4421a" },
    dark: { ground: "#0d1729", dotsTop: "#25436f", dotsBottom: "#7a3524", ink: "#f4efe6", muted: "#aab5c7", accent: "#ff7043", onAccent: "#0d1729", highlight: "#ff8a5c" },
    copy: {
      headline: "Your passport is\n*getting bored.*",
      description: "Flights, stays and trains in one booking, and a real person on call if anything moves.",
      ctaLabel: "Plan a trip",
      secondaryLabel: "Browse 1,200 places",
      note: "Free to plan. You only pay when you book.",
      postmark: { top: "BON VOYAGE", bottom: "POSTED TODAY", slogan: "PAR AVION" },
    },
    stamps: [
      { art: "balloon", shape: "round", label: "CAPPADOCIA", caption: "TÜRKIYE", ink: "#1d3a62", tint: "#ef7d3b", scale: 0.92 },
      { art: "peaks", label: "DOLOMITI", value: "3.20", caption: "Alto Adige", ink: "#1d3a62", tint: "#f2a541", cancelled: true },
      { art: "sail", label: "HELLAS", value: "from €49", caption: "Aegean ferries", ink: "#1d3a62", tint: "#ef7d3b", scale: 1.16 },
      { art: "dunes", label: "MAROC", value: "12", caption: "Erg Chebbi", ink: "#b2402a", tint: "#f2a541", shape: "landscape" },
      { art: "lighthouse", label: "PORTUGAL", value: "0.85", caption: "Cabo da Roca", ink: "#b2402a", tint: "#7fa6d8", frame: "oval" },
      { art: "bridge", label: "LISBOA", value: "1.50", caption: "Ponte 25 de Abril", ink: "#1d3a62", tint: "#d9522e", frame: "bare" },
    ],
    postOn: 2,
  },
  pantry: {
    light: { ground: "#eceee2", dotsTop: "#bccb9e", dotsBottom: "#efbf7d", ink: "#183522", muted: "#4a5a4c", accent: "#b33a17", onAccent: "#ffffff", highlight: "#b33a17" },
    dark: { ground: "#0e1b12", dotsTop: "#2b4a2e", dotsBottom: "#6e4a1c", ink: "#f2efe3", muted: "#a9b6a6", accent: "#f59e42", onAccent: "#0e1b12", highlight: "#f7b267" },
    copy: {
      headline: "Dinner, *sorted*\nby Tuesday.",
      description: "Seasonal produce from forty small farms, packed with recipes for five weeknight dinners.",
      ctaLabel: "Build my first box",
      secondaryLabel: "See this week’s menu",
      note: "Skip a week or cancel any time, in two taps.",
      postmark: { top: "FARM TO DOOR", bottom: "PACKED TODAY", slogan: "KEEP COOL" },
    },
    stamps: [
      { art: "olives", shape: "round", label: "OLIO NUOVO", caption: "PUGLIA", ink: "#24472f", tint: "#9bb04a", scale: 0.92 },
      { art: "lemon", label: "AMALFI", value: "2.40", caption: "Sfusato lemons", ink: "#24472f", tint: "#f2c230", shape: "landscape", cancelled: true },
      { art: "tomato", label: "WEEK ONE", value: "half price", caption: "Heirloom tomato", ink: "#24472f", tint: "#e2553f", scale: 1.16 },
      { art: "pear", label: "ANJOU", value: "1.10", caption: "Winter pears", ink: "#7e2a1d", tint: "#d8b13c", frame: "oval" },
      { art: "cherries", label: "KENT", value: "0.90", caption: "Early cherries", ink: "#7e2a1d", tint: "#e2553f", frame: "bare" },
    ],
    postOn: 2,
  },
  atelier: {
    light: { ground: "#eceef6", dotsTop: "#b9c1df", dotsBottom: "#f6b9a0", ink: "#1b1e42", muted: "#4d5172", accent: "#1b1e42", onAccent: "#ffffff", highlight: "#d4471f" },
    dark: { ground: "#111228", dotsTop: "#2b3066", dotsBottom: "#6a2b2f", ink: "#f1efe8", muted: "#a9abc7", accent: "#ff6b3d", onAccent: "#111228", highlight: "#ff8a5c" },
    copy: {
      headline: "Got something\n*worth making?*",
      description: "A four-person studio for identities, type and the websites they live on. Booking work from January.",
      ctaLabel: "Start a project",
      secondaryLabel: "See the work",
      note: "We reply within two working days.",
      postmark: { top: "STUDIO MAIL", bottom: "RECEIVED", slogan: "BY HAND" },
    },
    stamps: [
      { art: "ring", shape: "round", label: "FORM STUDY", caption: "NO. 04", ink: "#21254f", tint: "#ff6b3d", scale: 0.9 },
      { art: "sphere", label: "SPHERE", value: "I", caption: "Light study", ink: "#21254f", tint: "#ff6b3d", shape: "landscape", cancelled: true },
      { art: "cube", label: "INTAKE", value: "Q1 2027", caption: "Two slots open", ink: "#21254f", tint: "#f6c445", scale: 1.16 },
      { art: "arch", label: "ARCH", value: "IV", caption: "Light study", ink: "#5c1f3c", tint: "#ff8a5c", frame: "bare" },
      { art: "cone", label: "CONE", value: "II", caption: "Light study", ink: "#5c1f3c", tint: "#9fb3ff", frame: "oval" },
    ],
    postOn: 2,
  },
}

const DISPLAY_FONT =
  '"Inter Display", "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
const TEXT_FONT = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

const CSS = `
.pm, .pm *, .pm *::before, .pm *::after { box-sizing: border-box; }
.pm {
  --g: var(--pl-ground); --k: var(--pl-ink); --mu: var(--pl-muted); --a: var(--pl-accent); --oa: var(--pl-onAccent); --hl: var(--pl-highlight);
  --dA: var(--pl-dotsTop); --dB: var(--pl-dotsBottom);
  --pm-out: cubic-bezier(0.22, 1, 0.36, 1);
  --pm-paper: #fbf7ee;
  position: relative; width: 100%; overflow: hidden; isolation: isolate;
  background: var(--g); color: var(--k); font-family: var(--pm-text);
  container: pm / inline-size;
  -webkit-font-smoothing: antialiased;
}
:where(.dark) .pm[data-theme="auto"], .pm[data-theme="dark"] {
  --g: var(--pd-ground); --k: var(--pd-ink); --mu: var(--pd-muted); --a: var(--pd-accent); --oa: var(--pd-onAccent); --hl: var(--pd-highlight);
  --dA: var(--pd-dotsTop); --dB: var(--pd-dotsBottom);
}
.pm ::selection { background: var(--a); color: var(--oa); }
.pm-in { position: relative; min-height: var(--pm-h); display: grid; place-items: center; padding: clamp(110px, 11cqw, 170px) 16px; }
.pm-dots { position: absolute; inset: 0; width: 100%; height: 100%; max-width: none; pointer-events: none; z-index: 0; }

.pm-copy { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; text-align: center; max-width: 880px; pointer-events: none; }
.pm-h {
  margin: 0; font-family: var(--pm-display); font-weight: 900; text-transform: uppercase;
  font-size: clamp(38px, 6.3cqw, 96px); line-height: 0.93; letter-spacing: -0.035em; word-spacing: 0.06em; color: var(--k);
  text-wrap: balance;
}
.pm-line { display: block; }
.pm-hi { color: var(--hl); }
.pm-p { margin: clamp(18px, 2cqw, 26px) 0 0; max-width: 34em; font-size: clamp(16px, 1.3cqw, 19px); line-height: 1.5; color: var(--mu); text-wrap: pretty; }
.pm-actions { margin-top: clamp(26px, 2.6cqw, 36px); display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 14px 26px; }
.pm-cta, .pm-link { pointer-events: auto; }
.pm-cta {
  position: relative; display: inline-flex; align-items: center; gap: 12px; height: 56px; padding: 0 12px 0 28px;
  border: 0; border-radius: 999px; background: var(--a); color: var(--oa); cursor: pointer;
  font: 700 17px/1 var(--pm-text); letter-spacing: -0.01em; text-decoration: none;
  box-shadow: 0 1px 0 rgba(255,255,255,0.25) inset, 0 10px 24px -12px var(--a);
  transition: transform 160ms var(--pm-out), box-shadow 240ms var(--pm-out);
  -webkit-tap-highlight-color: transparent;
}
.pm-cta { overflow: hidden; isolation: isolate; }
.pm-cta::before {
  content: ""; position: absolute; inset: 0; z-index: -1; border-radius: inherit;
  background: color-mix(in srgb, var(--a) 78%, var(--k));
  transform: scaleX(0); transform-origin: left; transition: transform 260ms var(--pm-out);
}
.pm-cta:hover, .pm-cta:focus-visible { transform: translateY(-2px); box-shadow: 0 1px 0 rgba(255,255,255,0.25) inset, 0 18px 32px -12px var(--a); }
.pm-cta:hover::before, .pm-cta:focus-visible::before { transform: scaleX(1); }
.pm-cta:active { transform: translateY(0) scale(0.97); transition-duration: 100ms; }
.pm-cta:focus-visible, .pm-link:focus-visible { outline: 3px solid var(--a); outline-offset: 4px; }
.pm-arrow { position: relative; width: 34px; height: 34px; border-radius: 999px; background: var(--oa); color: var(--a); overflow: hidden; flex: none; }
.pm-arrow svg { position: absolute; left: 9px; top: 9px; width: 16px; height: 16px; max-width: none; transition: transform 260ms var(--pm-out); }
.pm-arrow svg + svg { transform: translateX(-30px); }
.pm-cta:hover .pm-arrow svg, .pm-cta:focus-visible .pm-arrow svg { transform: translateX(30px); }
.pm-cta:hover .pm-arrow svg + svg, .pm-cta:focus-visible .pm-arrow svg + svg { transform: translateX(0); }
.pm-link {
  position: relative; color: var(--k); font: 600 16px/1.2 var(--pm-text); text-decoration: none; padding: 14px 2px; cursor: pointer;
  background: none; border: 0;
}
.pm-link::after {
  content: ""; position: absolute; left: 2px; right: 2px; bottom: 9px; height: 2px; background: currentColor;
  transform: scaleX(0.28); transform-origin: left; transition: transform 250ms var(--pm-out);
}
.pm-link:hover::after, .pm-link:focus-visible::after { transform: scaleX(1); }
.pm-note { margin: 18px 0 0; font-size: 14px; line-height: 1.4; color: var(--mu); }

/* stamps */
.pm-slot {
  position: absolute; left: var(--x); top: var(--y); width: calc(var(--w) * var(--s)); z-index: 1;
  translate: calc(-50% + var(--nx, 0px)) calc(-50% + var(--ny, 0px));
}
.pm-slot[data-up="true"] { z-index: 5; }
.pm-drag { touch-action: pan-y; cursor: grab; will-change: transform; user-select: none; -webkit-user-select: none; }
.pm[data-drag="false"] .pm-drag { cursor: default; }
.pm-drag:active { cursor: grabbing; }
.pm-par { transform: translate3d(calc(var(--px, 0) * var(--d) * -12px), calc(var(--py, 0) * var(--d) * -9px), 0); transition: transform 1100ms var(--pm-out); }
.pm-float { animation: pm-float var(--fd) ease-in-out var(--fdel) infinite alternate; }
.pm[data-ambient="false"] .pm-float { animation: none; }
.pm-stamp { position: relative; rotate: var(--r); transition: transform 240ms var(--pm-out); container-type: inline-size; }
.pm-drag:hover .pm-stamp { transform: translateY(-3px) scale(1.015); }
.pm-slot[data-up="true"] .pm-stamp { transform: scale(1.07); }
.pm-paper { display: block; width: 100%; height: auto; max-width: none; overflow: visible;
  filter: drop-shadow(0 1px 1px rgba(25, 30, 45, 0.22)) drop-shadow(0 8px 12px rgba(25, 30, 45, 0.16));
  transition: filter 240ms var(--pm-out);
}
.pm-slot[data-up="true"] .pm-paper { filter: drop-shadow(0 2px 2px rgba(25, 30, 45, 0.18)) drop-shadow(0 26px 28px rgba(25, 30, 45, 0.3)); }
:where(.dark) .pm[data-theme="auto"] .pm-paper, .pm[data-theme="dark"] .pm-paper { filter: drop-shadow(0 1px 1px rgba(0,0,0,0.5)) drop-shadow(0 10px 16px rgba(0,0,0,0.45)); }
.pm-face { position: absolute; inset: 7.4cqw; display: flex; flex-direction: column; color: var(--si); border: max(1px, 0.7cqw) solid var(--si); padding: 3.4cqw; gap: 3cqw; }
.pm-top { display: flex; align-items: baseline; justify-content: space-between; gap: 3cqw; line-height: 1; }
.pm-label { font: 800 6.6cqw/1 var(--pm-text); letter-spacing: 0.09em; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pm-value { font: 900 11cqw/0.9 var(--pm-display); letter-spacing: -0.03em; font-variant-numeric: tabular-nums; white-space: nowrap; }
.pm-top[data-long="true"] { flex-direction: column; align-items: flex-start; gap: 1.6cqw; }
.pm-top[data-long="true"] .pm-value { font-size: 9.6cqw; letter-spacing: -0.02em; }
.pm-art { position: relative; flex: 1; min-height: 0; overflow: hidden; background: var(--pm-paper); isolation: isolate; }
.pm-art canvas, .pm-art img { position: absolute; inset: 0; width: 100%; height: 100%; max-width: none; display: block; }
.pm-art img { object-fit: cover; filter: grayscale(1) contrast(1.12) brightness(1.04); }
.pm-duo { position: absolute; inset: 0; }
.pm-duo-ink { background: var(--si); mix-blend-mode: lighten; }
.pm-duo-paper { background: var(--pm-paper); mix-blend-mode: darken; }
.pm-duo-lines { background: repeating-linear-gradient(0deg, transparent 0 1.5px, rgba(251, 247, 238, 0.55) 1.5px 2.4px); }
.pm-cap { background: var(--st); color: var(--si); font: 800 6.6cqw/1 var(--pm-text); letter-spacing: 0.06em; text-transform: uppercase; text-align: center; padding: 2.6cqw 2cqw; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pm-cap[data-long="true"] { font-size: 5.4cqw; padding: 3.2cqw 2cqw; }
.pm-top[data-center="true"] { justify-content: center; }
.pm-art[data-frame="oval"] { background: repeating-conic-gradient(from 0deg at 50% 50%, var(--st) 0deg 2.6deg, var(--pm-paper) 2.6deg 9deg); }
.pm-oval { position: absolute; inset: 5% 9%; border-radius: 50%; overflow: hidden; background: var(--pm-paper); border: max(1px, 0.7cqw) solid var(--si); isolation: isolate; }
.pm-foot { display: flex; align-items: baseline; justify-content: space-between; gap: 3cqw; line-height: 1; }
.pm-strip { display: flex; flex-direction: column; gap: 1.6cqw; line-height: 1; min-width: 0; }
.pm-strip .pm-foot-cap { text-align: left; font-weight: 600; letter-spacing: 0.02em; text-transform: none; font-size: 6.2cqw; }
.pm-foot-cap { font: 700 5.8cqw/1.1 var(--pm-text); letter-spacing: 0.04em; text-transform: uppercase; text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.pm-face[data-frame="bare"] { border: 0; padding: 0; gap: 2.6cqw; }
.pm-chip { position: absolute; left: 0; top: 0; background: var(--pm-paper); color: var(--si); font: 900 11cqw/0.9 var(--pm-display); letter-spacing: -0.03em; padding: 0 2.4cqw 2.4cqw 0; }
.pm-face[data-frame="classic"][data-shape="landscape"] { display: grid; grid-template-columns: 1fr auto; grid-template-rows: 1fr auto; }
.pm-face[data-shape="landscape"] .pm-art { grid-column: 1; grid-row: 1; }
.pm-face[data-shape="landscape"] .pm-cap { grid-column: 1; grid-row: 2; font-size: 4.4cqw; padding: 1.8cqw; }
.pm-face[data-shape="landscape"] ~ .pm-old { top: 30%; left: 14%; width: 56%; }
.pm-side { grid-column: 2; grid-row: 1 / 3; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding-left: 0.5cqw; }
.pm-side .pm-value { font-size: 9cqw; }
.pm-vert { writing-mode: vertical-rl; transform: rotate(180deg); font-size: 5.4cqw; }
.pm-slogan { font: 900 27px/1 var(--pm-text); letter-spacing: 0.12em; fill: currentColor; }
.pm-slogan-2 { font-size: 16px; font-weight: 800; letter-spacing: 0.16em; }
.pm-round .pm-face { inset: 0; border: 0; padding: 0; }
.pm-round .pm-art { position: absolute; inset: 17%; border-radius: 50%; border: max(1px, 0.7cqw) solid var(--si); }
.pm-ring-text { font: 800 7.4px/1 var(--pm-text); letter-spacing: 0.16em; fill: var(--si); text-transform: uppercase; }

/* postmarks */
.pm-mark { position: absolute; pointer-events: none; color: var(--pk); mix-blend-mode: multiply; opacity: 0.9; }
.pm-mark svg { display: block; width: 100%; height: auto; max-width: none; overflow: visible; }
.pm-mark text { font: 800 9px/1 var(--pm-text); letter-spacing: 0.12em; fill: currentColor; }
.pm-mark .pm-date { font-size: 11px; letter-spacing: 0.04em; }
.pm-old { left: 18%; top: 48%; width: 64%; rotate: -10deg; opacity: 0.86; color: #a63521; }
.pm-live { left: 24%; top: 42%; width: 86%; rotate: -9deg; opacity: 1; }
.pm-ghost { opacity: 0; transform: translateY(-14px) scale(1.12); transition: opacity 200ms var(--pm-out), transform 260ms var(--pm-out); }
.pm[data-armed="true"] .pm-ghost { opacity: 0.62; transform: translateY(-8px) scale(1.06); }
.pm-slam { animation: pm-slam 260ms cubic-bezier(0.3, 0, 0.2, 1) both; }
.pm-slam .pm-bar { stroke-dasharray: 160; animation: pm-bars 300ms var(--pm-out) 70ms both; }

@keyframes pm-float {
  from { transform: translate3d(0, 0, 0) rotate(0deg); }
  to { transform: translate3d(1.5px, -5px, 0) rotate(0.9deg); }
}
@keyframes pm-slam {
  0% { opacity: 0; transform: translateY(-16px) scale(1.3); }
  55% { opacity: 0.95; transform: scale(0.96); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes pm-bars { from { stroke-dashoffset: 160; } to { stroke-dashoffset: 0; } }

@container pm (max-width: 719px) {
  .pm-in { min-height: 0; padding: 206px 16px 214px; }
  .pm-slot { left: var(--cx); top: var(--cy); width: calc(min(31cqw, 124px) * var(--s)); }
  .pm-slot[data-c="off"] { display: none; }
  .pm-p { font-size: 16px; }
  .pm-actions { flex-direction: column; gap: 10px; }
  .pm-cta { height: 54px; }
}

@media (prefers-reduced-motion: reduce) {
  .pm-float { animation: none; }
  .pm-par { transform: none; transition: none; }
  .pm-stamp, .pm-paper, .pm-arrow svg, .pm-link::after, .pm-ghost { transition-duration: 1ms; }
  .pm-slam, .pm-slam .pm-bar { animation: pm-fade 1ms both; }
  @keyframes pm-fade { from { opacity: 0; } to { opacity: 1; } }
}
`

/** The boxes a resting stamp must stay clear of: the lines of copy and the buttons. */
function copyBoxes(copy: HTMLElement) {
  const avoid: Box[] = []
  const range = document.createRange()
  copy.querySelectorAll(".pm-h, .pm-p, .pm-note").forEach((el) => {
    range.selectNodeContents(el)
    for (const r of Array.from(range.getClientRects())) if (r.width > 1) avoid.push(r)
  })
  copy.querySelectorAll(".pm-cta, .pm-link").forEach((el) => avoid.push(el.getBoundingClientRect()))
  return avoid
}

type Body = {
  x: number
  y: number
  r: number
  vx: number
  vy: number
  vr: number
  tx: number
  ty: number
  drag: boolean
  gx: number
  gy: number
  lo: number[]
  last: number[]
}

function Arrow() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 8h11M8.5 3.5 13 8l-4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** The cancellation: a circular date die and wavy bars, inked with a skip texture. */
function Postmark(props: { top: string; bottom: string; date: string; bars?: number; filter: string; uid: string }) {
  const { top, bottom, date, bars = 5, filter, uid } = props
  const id = uid + "-ring"
  const lines = []
  for (let i = 0; i < bars; i++) {
    const y = 50 + (i - (bars - 1) / 2) * 12.5
    let d = "M98 " + y
    for (let x = 98; x < 238; x += 12) d += " q6 " + (i % 2 ? -4.5 : 4.5) + " 12 0"
    lines.push(<path key={i} className="pm-bar" d={d} fill="none" stroke="currentColor" strokeWidth="4.6" strokeLinecap="round" />)
  }
  return (
    <svg viewBox="0 0 240 100" aria-hidden="true">
      <g filter={"url(#" + filter + ")"}>
        <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="4.4" />
        <circle cx="50" cy="50" r="27" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <path id={id + "t"} d="M14.5 50 a35.5 35.5 0 0 1 71 0" fill="none" />
        <path id={id + "b"} d="M14.5 50 a35.5 35.5 0 0 0 71 0" fill="none" />
        <text dominantBaseline="central">
          <textPath href={"#" + id + "t"} startOffset="50%" textAnchor="middle">
            {top}
          </textPath>
        </text>
        <text dominantBaseline="central">
          <textPath href={"#" + id + "b"} startOffset="50%" textAnchor="middle">
            {bottom}
          </textPath>
        </text>
        <line x1="27" y1="50" x2="73" y2="50" stroke="currentColor" strokeWidth="1.6" />
        <text className="pm-date" x="50" y="46" textAnchor="middle" suppressHydrationWarning>
          {date.split(" ").slice(0, 2).join(" ")}
        </text>
        <text className="pm-date" x="50" y="62" textAnchor="middle" suppressHydrationWarning>
          {date.split(" ").slice(2).join(" ")}
        </text>
        {lines}
      </g>
    </svg>
  )
}

/** A straight-line slogan cancel, the kind a sorting office runs over a stamp: a ruled box and two lines. */
function Slogan(props: { text: string; filter: string }) {
  const [a, b = ""] = props.text.split("\n")
  return (
    <svg viewBox={"0 0 200 " + (b ? 72 : 52)} aria-hidden="true">
      <g filter={"url(#" + props.filter + ")"}>
        <rect x="3" y="3" width="194" height={b ? 66 : 46} rx="3" fill="none" stroke="currentColor" strokeWidth="4" />
        <text className="pm-slogan" x="100" y={b ? 33 : 35.5} textAnchor="middle">
          {a}
        </text>
        {b ? (
          <text className="pm-slogan pm-slogan-2" x="100" y="57" textAnchor="middle">
            {b}
          </text>
        ) : null}
      </g>
    </svg>
  )
}

/** Draws one engraved subject into its canvas at the size it is shown. */
function Engraving(props: { art: StampArt; ink: string; tint: string }) {
  const { art, ink, tint } = props
  const ref = React.useRef(null as HTMLCanvasElement | null)
  React.useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const scene = SCENES[art] ?? SCENES.peaks
    let lastW = 0
    let lastH = 0
    const draw = () => {
      const w = cv.clientWidth
      const h = cv.clientHeight
      if (w < 4 || h < 4 || (Math.abs(w - lastW) < 1 && Math.abs(h - lastH) < 1)) return
      lastW = w
      lastH = h
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      cv.width = Math.round(w * dpr)
      cv.height = Math.round(h * dpr)
      const ctx = cv.getContext("2d")
      if (!ctx) return
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      // scenes are drawn on a square and cropped to the box, so any stamp shape keeps their proportions
      const sq = Math.max(w, h)
      const ox = (sq - w) / 2
      const oy = (sq - h) * 0.62
      const at: Scene = (u, v) => {
        const r = scene((u * w + ox) / sq, (v * h + oy) / sq)
        return [r[0], r[1], (r[2] * sq) / h]
      }
      // one pass per device pixel: the second-ink plate, solid ink and contour edges
      const W = cv.width
      const H = cv.height
      const L = new Float32Array(W * H)
      const tintImg = ctx.createImageData(W, H)
      const inkImg = ctx.createImageData(W, H)
      const trgb = hexToRgb(tint) ?? [239, 125, 59]
      const irgb = hexToRgb(ink) ?? [29, 58, 98]
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const r = at((x + 0.5) / W, (y + 0.5) / H)
          const i = y * W + x
          L[i] = r[0]
          const o = i * 4
          tintImg.data[o] = trgb[0]
          tintImg.data[o + 1] = trgb[1]
          tintImg.data[o + 2] = trgb[2]
          tintImg.data[o + 3] = Math.round(r[1] * 232)
        }
      const k = dpr > 1.4 ? 2 : 1
      for (let y = 0; y < H - k; y++)
        for (let x = 0; x < W - k; x++) {
          const i = y * W + x
          const l = L[i]
          const edge = clamp01((Math.abs(l - L[i + k]) + Math.abs(l - L[i + k * W])) * 2.6 - 0.42)
          const solid = smooth(0.17, 0.08, l)
          const a = Math.max(edge, solid)
          if (a <= 0) continue
          const o = i * 4
          inkImg.data[o] = irgb[0]
          inkImg.data[o + 1] = irgb[1]
          inkImg.data[o + 2] = irgb[2]
          inkImg.data[o + 3] = Math.round(a * 255)
        }
      const plate = (img: ImageData, dx: number, dy: number) => {
        const c = document.createElement("canvas")
        c.width = W
        c.height = H
        c.getContext("2d")?.putImageData(img, 0, 0)
        ctx.drawImage(c, dx, dy)
      }
      ctx.fillStyle = PAPER
      ctx.fillRect(0, 0, W, H)
      plate(tintImg, Math.round(0.4 * dpr), Math.round(0.3 * dpr))
      ctx.globalCompositeOperation = "multiply"
      plate(inkImg, 0, 0)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const pitch = Math.max(1.9, Math.min(2.7, w / 56))
      ctx.fillStyle = ink
      ctx.beginPath()
      for (const ring of engraveLines(at, w, h, pitch)) {
        ctx.moveTo(ring[0], ring[1])
        for (let i = 2; i < ring.length; i += 2) ctx.lineTo(ring[i], ring[i + 1])
        ctx.closePath()
      }
      ctx.fill()
      ctx.globalCompositeOperation = "source-over"
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(cv)
    return () => ro.disconnect()
  }, [art, ink, tint])
  return <canvas ref={ref} aria-hidden="true" />
}

function StampArtBox(props: { stamp: PostmarkStamp; ink: string; tint: string; fallback: StampArt }) {
  const { stamp, ink, tint, fallback } = props
  const [failed, setFailed] = React.useState(false)
  if (stamp.image && !failed) {
    return (
      <>
        <img src={stamp.image} alt="" loading="lazy" decoding="async" draggable={false} onError={() => setFailed(true)} />
        <span className="pm-duo pm-duo-ink" />
        <span className="pm-duo pm-duo-paper" />
        <span className="pm-duo pm-duo-lines" />
      </>
    )
  }
  return <Engraving art={stamp.art ?? fallback} ink={ink} tint={tint} />
}

const FALLBACK_ART: StampArt[] = ["peaks", "lighthouse", "dunes", "sail", "bridge", "balloon", "sphere"]

const Stamp = React.memo(function Stamp(props: {
  stamp: PostmarkStamp
  index: number
  inks: Ink
  uid: string
  filter: string
  postmark: { top: string; bottom: string; date: string; slogan: string }
  live: number
  isTarget: boolean
}) {
  const { stamp, index, inks, uid, filter, postmark, live, isTarget } = props
  const shape = stamp.shape ?? "portrait"
  const round = shape === "round"
  const vw = 100
  const vh = round ? 100 : shape === "landscape" ? 84 : 122
  const perf = round ? null : perforatedPath(vw, vh, 6.4)
  const ringId = uid + "-r" + index
  const longValue = (stamp.value ?? "").length > 4
  const frame = round ? "classic" : stamp.frame ?? "classic"
  const side = frame === "classic" && shape === "landscape"
  const art = <StampArtBox stamp={stamp} ink={inks.ink} tint={inks.tint} fallback={FALLBACK_ART[index % FALLBACK_ART.length]} />
  return (
    <div className={"pm-stamp" + (round ? " pm-round" : "")}>
      <svg className="pm-paper" viewBox={"0 0 " + vw + " " + vh} aria-hidden="true">
        {round ? (
          <>
            <circle cx="50" cy="50" r="50" style={{ fill: "var(--pm-paper)" }} />
            <circle cx="50" cy="50" r="46.5" fill="none" style={{ stroke: "var(--si)" }} strokeWidth="0.8" />
            <path id={ringId + "t"} d="M10 50 a40 40 0 0 1 80 0" fill="none" />
            <path id={ringId + "b"} d="M10 50 a40 40 0 0 0 80 0" fill="none" />
            <text className="pm-ring-text" dominantBaseline="central">
              <textPath href={"#" + ringId + "t"} startOffset="50%" textAnchor="middle">
                {stamp.label ?? ""}
              </textPath>
            </text>
            <text className="pm-ring-text" dominantBaseline="central">
              <textPath href={"#" + ringId + "b"} startOffset="50%" textAnchor="middle">
                {stamp.caption ?? ""}
              </textPath>
            </text>
          </>
        ) : (
          <path d={perf!.d} style={{ fill: "var(--pm-paper)" }} />
        )}
      </svg>
      <div className="pm-face" data-frame={frame} data-shape={shape}>
        {frame === "classic" && !round && !side && (stamp.label || stamp.value) ? (
          <div className="pm-top" data-long={longValue ? "true" : undefined}>
            <span className="pm-label">{stamp.label}</span>
            {stamp.value ? <span className="pm-value">{stamp.value}</span> : null}
          </div>
        ) : null}
        {frame === "oval" && stamp.label ? (
          <div className="pm-top" data-center="true">
            <span className="pm-label">{stamp.label}</span>
          </div>
        ) : null}
        <div className="pm-art" data-frame={frame}>
          {frame === "oval" ? (
            <div className="pm-oval">{art}</div>
          ) : (
            art
          )}
          {frame === "bare" && stamp.value ? <span className="pm-chip">{stamp.value}</span> : null}
        </div>
        {side ? (
          <div className="pm-side">
            {stamp.value ? <span className="pm-value">{stamp.value}</span> : null}
            <span className="pm-label pm-vert">{stamp.label}</span>
          </div>
        ) : null}
        {frame === "classic" && !round && stamp.caption ? (
          <div className="pm-cap" data-long={stamp.caption.length > 14 ? "true" : undefined}>
            {stamp.caption}
          </div>
        ) : null}
        {frame === "oval" ? (
          <div className="pm-foot">
            {stamp.value ? <span className="pm-value">{stamp.value}</span> : <span />}
            {stamp.caption ? <span className="pm-foot-cap">{stamp.caption}</span> : null}
          </div>
        ) : null}
        {frame === "bare" ? (
          <div className="pm-strip">
            {stamp.label ? <span className="pm-label">{stamp.label}</span> : <span />}
            {stamp.caption ? <span className="pm-foot-cap">{stamp.caption}</span> : null}
          </div>
        ) : null}
      </div>
      {stamp.cancelled && postmark.slogan ? (
        <div className="pm-mark pm-old">
          <Slogan text={postmark.slogan} filter={filter} />
        </div>
      ) : null}
      {isTarget ? (
        <div className="pm-mark pm-live pm-ghost">
          <Postmark top={postmark.top} bottom={postmark.bottom} date={postmark.date} filter={filter} uid={ringId + "g"} />
        </div>
      ) : null}
      {isTarget && live > 0 ? (
        <div key={live} className="pm-mark pm-live pm-slam">
          <Postmark top={postmark.top} bottom={postmark.bottom} date={postmark.date} filter={filter} uid={ringId + "l" + live} />
        </div>
      ) : null}
    </div>
  )
})

export default function PostmarkCta(props: PostmarkCtaProps) {
  const {
    preset = "voyage",
    palette,
    darkPalette,
    theme = "auto",
    draggable = true,
    ambient = true,
    height = "min(100svh, 920px)",
    displayFont = DISPLAY_FONT,
    textFont = TEXT_FONT,
    ctaHref,
    onCtaClick,
    onPosted,
    postDelay = 0,
    secondaryHref,
    onSecondaryClick,
    id,
    className,
    style,
  } = props
  const def = PRESETS[preset] ?? PRESETS.voyage
  const headline = props.headline ?? def.copy.headline
  const description = props.description ?? def.copy.description
  const ctaLabel = props.ctaLabel ?? def.copy.ctaLabel
  const secondaryLabel = props.secondaryLabel ?? def.copy.secondaryLabel
  const note = props.note === undefined ? def.copy.note : props.note
  const stamps = (props.stamps ?? def.stamps).slice(0, SLOTS.length)
  const postOn = clamp(props.postOn ?? def.postOn, 0, Math.max(0, stamps.length - 1))
  const reactId = React.useId()
  const uid = "pm" + reactId.replace(/[^a-zA-Z0-9]/g, "")
  const filterId = uid + "-ink"
  const headingId = uid + "-h"

  const [today, setToday] = React.useState("")
  React.useEffect(() => setToday(postmarkDate(new Date())), [])
  const pm = {
    top: props.postmark?.top ?? def.copy.postmark.top,
    bottom: props.postmark?.bottom ?? def.copy.postmark.bottom,
    date: props.postmark?.date ?? (today || postmarkDate(new Date(2026, 9, 15))),
    slogan: props.postmark?.slogan ?? def.copy.postmark.slogan,
  }
  const pmKey = pm.top + "|" + pm.bottom + "|" + pm.date + "|" + pm.slogan
  const postmark = React.useMemo(() => pm, [pmKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const [live, setLive] = React.useState(0)
  const [armed, setArmed] = React.useState(false)
  const rootRef = React.useRef(null as HTMLElement | null)
  const canvasRef = React.useRef(null as HTMLCanvasElement | null)
  const copyRef = React.useRef(null as HTMLDivElement | null)
  const slotRefs = React.useRef([] as (HTMLDivElement | null)[])
  const dragRefs = React.useRef([] as (HTMLDivElement | null)[])

  const light = { ...def.light, ...palette }
  const dark = { ...def.dark, ...darkPalette }
  const vars: { [k: string]: string } = { "--pm-display": displayFont, "--pm-text": textFont }
  for (const k of Object.keys(light) as (keyof PostmarkPalette)[]) {
    vars["--pl-" + k] = light[k]
    vars["--pd-" + k] = dark[k]
  }
  const colourKey = JSON.stringify([light, dark, theme])

  // ---- the halftone field
  React.useEffect(() => {
    const root = rootRef.current
    const cv = canvasRef.current
    if (!root || !cv) return
    let raf = 0
    const draw = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const w = root.clientWidth
        const h = root.clientHeight
        if (!w || !h) return
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        cv.width = Math.round(w * dpr)
        cv.height = Math.round(h * dpr)
        const ctx = cv.getContext("2d")
        if (!ctx) return
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, w, h)
        const cs = getComputedStyle(root)
        const a = cs.getPropertyValue("--dA").trim()
        const b = cs.getPropertyValue("--dB").trim()
        const pitch = w < 720 ? 8 : 10
        // clear the field round the copy as it actually sits, so small text never lands on dots
        const cr = copyRef.current?.getBoundingClientRect()
        const rr = root.getBoundingClientRect()
        const clearing = cr
          ? [(cr.left + cr.width / 2 - rr.left) / w, (cr.top + cr.height / 2 - rr.top) / h, (cr.width / w) * 0.62 + 0.04, (cr.height / h) * 0.62 + 0.05]
          : undefined
        const rows = Math.ceil(h / pitch) + 1
        const cols = Math.ceil(w / pitch) + 1
        for (let j = 0; j < rows; j++) {
          const y = j * pitch
          const yn = y / h
          ctx.fillStyle = mix(a, b, smooth(0.15, 0.95, yn))
          ctx.beginPath()
          for (let i = 0; i < cols; i++) {
            const x = i * pitch + (j % 2 ? pitch / 2 : 0)
            const r = dotSize(x / w, yn, clearing) * pitch * 0.5
            if (r < 0.35) continue
            ctx.moveTo(x + r, y)
            ctx.arc(x, y, r, 0, Math.PI * 2)
          }
          ctx.fill()
        }
      })
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(root)
    const mo = new MutationObserver(draw)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme", "style"] })
    if (document.body) mo.observe(document.body, { attributes: true, attributeFilter: ["class", "data-theme"] })
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      mo.disconnect()
    }
  }, [colourKey])

  // ---- keep every stamp off the copy, whatever its length
  React.useEffect(() => {
    const root = rootRef.current
    const copy = copyRef.current
    if (!root || !copy) return
    let raf = 0
    const layout = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const avoid = copyBoxes(copy)
        const frame = root.getBoundingClientRect()
        slotRefs.current.forEach((slot) => {
          if (!slot || getComputedStyle(slot).display === "none") return
          const nx = parseFloat(slot.style.getPropertyValue("--nx")) || 0
          const ny = parseFloat(slot.style.getPropertyValue("--ny")) || 0
          // the rotated paper, not the upright slot
          const r = (slot.querySelector(".pm-paper") ?? slot).getBoundingClientRect()
          const base = { left: r.left - nx, right: r.right - nx, top: r.top - ny, bottom: r.bottom - ny }
          let [dx, dy, ok] = clearOf(base, avoid, frame, 24)
          // a cramped section: hanging a little off the edge beats sitting on the copy or a long jump across it
          // only the perforated margin may hang off, never the label band
          const [lx, ly, lok] = clearOf(base, avoid, frame, 24, 0.08)
          if (lok && (!ok || Math.hypot(lx, ly) < Math.hypot(dx, dy) * 0.6)) [dx, dy] = [lx, ly]
          else if (!ok) [dx, dy] = [lx, ly]
          slot.style.setProperty("--nx", dx.toFixed(1) + "px")
          slot.style.setProperty("--ny", dy.toFixed(1) + "px")
        })
      })
    }
    layout()
    const ro = new ResizeObserver(layout)
    ro.observe(root)
    ro.observe(copy)
    document.fonts?.ready.then(layout).catch(() => {})
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [headline, stamps.length])

  // ---- pointer parallax (mouse only) and dragging
  React.useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)")
    const bodies: Body[] = []
    let raf = 0
    let lastT = 0
    let pRaf = 0
    let z = 0

    const apply = (i: number) => {
      const b = bodies[i]
      const el = dragRefs.current[i]
      if (el) el.style.transform = "translate3d(" + b.x.toFixed(2) + "px," + b.y.toFixed(2) + "px,0) rotate(" + b.r.toFixed(2) + "deg)"
    }
    const tick = (t: number) => {
      const dt = Math.min(0.05, lastT ? (t - lastT) / 1000 : 1 / 60)
      lastT = t
      let awake = false
      const sub = Math.max(1, Math.ceil(dt / (1 / 120)))
      const h = dt / sub
      bodies.forEach((b, i) => {
        if (!b) return
        for (let s = 0; s < sub; s++) {
          if (b.drag) {
            ;[b.r, b.vr] = springStep(b.r, b.vr, clamp(b.vx * 0.012, -14, 14), h, 0.22, 0.62)
          } else {
            ;[b.x, b.vx] = springStep(b.x, b.vx, b.tx, h, 0.5, 0.86)
            ;[b.y, b.vy] = springStep(b.y, b.vy, b.ty, h, 0.5, 0.86)
            ;[b.r, b.vr] = springStep(b.r, b.vr, 0, h, 0.4, 0.5)
          }
        }
        apply(i)
        const moving = Math.abs(b.x - b.tx) + Math.abs(b.y - b.ty) + Math.abs(b.r) > 0.05 || Math.abs(b.vx) + Math.abs(b.vy) + Math.abs(b.vr) > 0.5
        if (b.drag || moving) awake = true
        else if (!b.drag) {
          b.x = b.tx
          b.y = b.ty
          b.r = 0
          apply(i)
        }
      })
      raf = awake ? requestAnimationFrame(tick) : 0
      if (!awake) lastT = 0
    }
    const wake = () => {
      if (!raf) raf = requestAnimationFrame(tick)
    }

    let active = -1
    let pid = -1
    let lastX = 0
    let lastY = 0
    let lastMoveT = 0
    const indexOf = (target: EventTarget | null) => {
      const el = (target as Element | null)?.closest?.("[data-pm-drag]")
      return el ? Number(el.getAttribute("data-pm-drag")) : -1
    }
    const onDown = (e: PointerEvent) => {
      if (root.getAttribute("data-drag") === "false" || e.button !== 0) return
      const i = indexOf(e.target)
      if (i < 0) return
      const el = dragRefs.current[i]
      const slot = slotRefs.current[i]
      if (!el || !slot) return
      const b =
        bodies[i] ??
        (bodies[i] = { x: 0, y: 0, r: 0, vx: 0, vy: 0, vr: 0, tx: 0, ty: 0, drag: false, gx: 0, gy: 0, lo: [0, 0], last: [0, 0] })
      const rr = root.getBoundingClientRect()
      const sr = el.getBoundingClientRect()
      // the slot's resting box, without the current offset
      const baseL = sr.left - b.x
      const baseT = sr.top - b.y
      const m = 6
      b.lo = [rr.left + m - baseL, rr.right - m - (baseL + sr.width), rr.top + m - baseT, rr.bottom - m - (baseT + sr.height)]
      b.gx = e.clientX - b.x
      b.gy = e.clientY - b.y
      b.drag = true
      b.vx = 0
      b.vy = 0
      active = i
      pid = e.pointerId
      lastX = e.clientX
      lastY = e.clientY
      lastMoveT = performance.now()
      try {
        el.setPointerCapture(e.pointerId)
      } catch {
        /* the pointer may already be gone */
      }
      slot.style.zIndex = String(10 + ++z)
      slot.setAttribute("data-up", "true")
      wake()
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && active < 0 && !reduce.matches && root.getAttribute("data-ambient") !== "false") {
        cancelAnimationFrame(pRaf)
        pRaf = requestAnimationFrame(() => {
          const r = root.getBoundingClientRect()
          root.style.setProperty("--px", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3))
          root.style.setProperty("--py", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3))
        })
      }
      if (active < 0 || e.pointerId !== pid) return
      const b = bodies[active]
      const now = performance.now()
      const dtm = Math.max(1, now - lastMoveT)
      const ivx = ((e.clientX - lastX) / dtm) * 1000
      const ivy = ((e.clientY - lastY) / dtm) * 1000
      b.vx = b.vx * 0.6 + ivx * 0.4
      b.vy = b.vy * 0.6 + ivy * 0.4
      lastX = e.clientX
      lastY = e.clientY
      lastMoveT = now
      const W = root.clientWidth
      const H = root.clientHeight
      b.x = band(e.clientX - b.gx, b.lo[0], b.lo[1], W * 0.25)
      b.y = band(e.clientY - b.gy, b.lo[2], b.lo[3], H * 0.25)
      b.tx = b.x
      b.ty = b.y
    }
    const onUp = (e: PointerEvent) => {
      if (active < 0 || e.pointerId !== pid) return
      const b = bodies[active]
      const slot = slotRefs.current[active]
      // a pause before letting go is a place, not a throw
      if (performance.now() - lastMoveT > 90) {
        b.vx = 0
        b.vy = 0
      }
      const rate = reduce.matches ? 0 : 0.985
      b.tx = clamp(b.x + (rate ? project(b.vx, rate) : 0), b.lo[0], b.lo[1])
      b.ty = clamp(b.y + (rate ? project(b.vy, rate) : 0), b.lo[2], b.lo[3])
      // never come to rest on the copy: slide to the nearest clear spot instead
      const copy = copyRef.current
      if (copy && slot) {
        // where the rotated paper will rest: its box now, moved by the rest of the throw
        const sr = (slot.querySelector(".pm-paper") ?? slot).getBoundingClientRect()
        const ox = b.tx - b.x
        const oy = b.ty - b.y
        const box = { left: sr.left + ox, right: sr.right + ox, top: sr.top + oy, bottom: sr.bottom + oy }
        const rr = root.getBoundingClientRect()
        const frame = { left: rr.left + 6, top: rr.top + 6, right: rr.right - 6, bottom: rr.bottom - 6 }
        const [cx, cy, ok] = clearOf(box, copyBoxes(copy), frame, 24)
        if (ok) {
          b.tx += cx
          b.ty += cy
        } else {
          // nowhere clear to land: go home
          b.tx = 0
          b.ty = 0
        }
      }
      if (reduce.matches) {
        b.vx = 0
        b.vy = 0
      }
      b.drag = false
      slot?.removeAttribute("data-up")
      if (slot) slot.style.zIndex = ""
      active = -1
      pid = -1
      wake()
    }
    const onDbl = (e: MouseEvent) => {
      const i = indexOf(e.target)
      const b = bodies[i]
      if (i < 0 || !b) return
      b.tx = 0
      b.ty = 0
      wake()
    }
    const onLeave = () => {
      root.style.setProperty("--px", "0")
      root.style.setProperty("--py", "0")
    }
    // the layout changed under the stamps: send them home
    let lastW = root.clientWidth
    const ro = new ResizeObserver(() => {
      if (Math.abs(root.clientWidth - lastW) < 2) return
      lastW = root.clientWidth
      bodies.forEach((b, i) => {
        if (!b) return
        b.x = b.y = b.tx = b.ty = b.r = b.vx = b.vy = b.vr = 0
        apply(i)
      })
    })
    ro.observe(root)
    root.addEventListener("pointerdown", onDown)
    root.addEventListener("pointermove", onMove)
    root.addEventListener("pointerup", onUp)
    root.addEventListener("pointercancel", onUp)
    root.addEventListener("pointerleave", onLeave)
    root.addEventListener("dblclick", onDbl)
    return () => {
      cancelAnimationFrame(raf)
      cancelAnimationFrame(pRaf)
      ro.disconnect()
      root.removeEventListener("pointerdown", onDown)
      root.removeEventListener("pointermove", onMove)
      root.removeEventListener("pointerup", onUp)
      root.removeEventListener("pointercancel", onUp)
      root.removeEventListener("pointerleave", onLeave)
      root.removeEventListener("dblclick", onDbl)
    }
  }, [])

  const post = () => {
    setLive((n) => n + 1)
    window.setTimeout(() => onPosted?.(), 260)
    const st = slotRefs.current[postOn]?.querySelector(".pm-stamp")
    if (st && !window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      st.animate([{ transform: "none" }, { transform: "translateY(2px) scale(0.96)", offset: 0.3 }, { transform: "none" }], {
        duration: 320,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      })
  }
  const arm = () => setArmed(true)
  const disarm = () => setArmed(false)
  const ctaContent = (
    <>
      <span>{ctaLabel}</span>
      <span className="pm-arrow" aria-hidden="true">
        <Arrow />
        <Arrow />
      </span>
    </>
  )
  const ctaEvents = {
    onPointerDown: post,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") post()
    },
    onPointerEnter: arm,
    onPointerLeave: disarm,
    onFocus: arm,
    onBlur: disarm,
    onClick: (e: React.MouseEvent<HTMLElement>) => {
      onCtaClick?.(e)
      if (!ctaHref || postDelay <= 0 || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const target = (e.currentTarget as HTMLAnchorElement).target
      if (target && target !== "_self") return
      e.preventDefault()
      window.setTimeout(() => window.location.assign(ctaHref), postDelay)
    },
  }

  const lines = parseHeadline(headline)

  return (
    <section
      ref={rootRef}
      id={id}
      className={"pm" + (className ? " " + className : "")}
      data-theme={theme}
      data-armed={armed ? "true" : "false"}
      data-drag={draggable ? "true" : "false"}
      data-ambient={ambient ? "true" : "false"}
      aria-labelledby={headingId}
      style={{ ...(vars as React.CSSProperties), ["--pm-h" as string]: typeof height === "number" ? height + "px" : height, ...style }}
    >
      <style>{CSS}</style>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
        <filter id={filterId} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="1" seed="7" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -7 5.15" result="skip" />
          <feComposite in="SourceGraphic" in2="skip" operator="in" result="inked" />
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="1" seed="3" result="w" />
          <feDisplacementMap in="inked" in2="w" scale="1" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <canvas ref={canvasRef} className="pm-dots" aria-hidden="true" />
      <div className="pm-in">
      <div aria-hidden="true">
        {stamps.map((s, i) => {
          const slot = SLOTS[i]
          const inks = { ink: s.ink ?? light.ink, tint: s.tint ?? light.highlight }
          const vars2 = {
            "--x": (s.x ?? slot.x) + "%",
            "--y": (s.y ?? slot.y) + "%",
            "--cx": slot.c ? slot.c.x : "50%",
            "--cy": slot.c ? slot.c.y : "50%",
            "--w": s.shape === "landscape" ? "clamp(136px, min(15.5cqw, 25vh), 248px)" : "clamp(106px, min(12.4cqw, 19vh), 196px)",
            "--s": String(clamp(s.scale ?? 1, 0.7, 1.3)),
            "--r": (s.rotate ?? slot.r) + "deg",
            "--d": String(slot.d),
            "--fd": 6 + ((i * 1.7) % 3) + "s",
            "--fdel": -i * 1.3 + "s",
            "--si": inks.ink,
            "--st": inks.tint,
            "--pk": light.ink,
          } as React.CSSProperties
          return (
            <div
              key={i}
              ref={(el) => {
                slotRefs.current[i] = el
              }}
              className="pm-slot"
              data-c={slot.c ? "on" : "off"}
              style={vars2}
            >
              <div
                className="pm-drag"
                data-pm-drag={i}
                ref={(el) => {
                  dragRefs.current[i] = el
                }}
              >
                <div className="pm-par">
                  <div className="pm-float">
                    <Stamp stamp={s} index={i} inks={inks} uid={uid} filter={filterId} postmark={postmark} live={i === postOn ? live : 0} isTarget={i === postOn} />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="pm-copy" ref={copyRef}>
        <h2 id={headingId} className="pm-h">
          {lines.map((runs, i) => (
            <span key={i} className="pm-line">
              {runs.map((r, j) =>
                r.hi ? (
                  <span key={j} className="pm-hi">
                    {r.text}
                  </span>
                ) : (
                  <React.Fragment key={j}>{r.text}</React.Fragment>
                ),
              )}
            </span>
          ))}
        </h2>
        {description ? <p className="pm-p">{description}</p> : null}
        <div className="pm-actions">
          {ctaHref ? (
            <a className="pm-cta" href={ctaHref} {...ctaEvents}>
              {ctaContent}
            </a>
          ) : (
            <button type="button" className="pm-cta" {...ctaEvents}>
              {ctaContent}
            </button>
          )}
          {secondaryLabel ? (
            secondaryHref ? (
              <a className="pm-link" href={secondaryHref} onClick={onSecondaryClick}>
                {secondaryLabel}
              </a>
            ) : (
              <button type="button" className="pm-link" onClick={onSecondaryClick}>
                {secondaryLabel}
              </button>
            )
          ) : null}
        </div>
        {note ? <p className="pm-note">{note}</p> : null}
      </div>
      </div>
    </section>
  )
}

// Declared after the JSX on purpose: the 21st CLI chokes on generic types above the first closing tag.
export type PostmarkPaletteInput = Partial<PostmarkPalette>
export type PostmarkClickEvent = React.MouseEvent<HTMLElement>
