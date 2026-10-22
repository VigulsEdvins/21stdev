"use client"

import * as React from "react"

/*
 * Pigment Experience Ledger — an "Experience" section for a portfolio or an
 * about page. Every employer is a huge right-aligned wordmark with its years
 * in italics on the left; a row opens in place to show the role, place,
 * industry, a link and a short story.
 *
 * Point at a row and a wash of pigment blooms behind it where the pointer came
 * in, then drifts after it with a little lag. Its edges are ragged and darker,
 * like watercolour settling into paper, and the open row keeps its wash.
 * The pigment is painted on a small canvas per row (no WebGL, no images), so
 * it costs the same on a software renderer as on a GPU.
 *
 * The wash is drawn from the work history: a longer tenure paints a longer
 * stroke, and a role that ended years ago has drier, paler, grainier pigment
 * than the one you hold now.
 *
 * Click, Enter or Space opens a row; one row is open at a time. Colours come
 * from the theme tokens; the pigment has four presets or your own three
 * colours.
 */

export type PigmentPalette = "ember" | "tide" | "moss" | "mono"

export type LedgerItem = {
  /** The wordmark. Keep it to a word or two. */
  company: string
  role: string
  /** Shown in italics inside brackets, e.g. "2022-now". */
  years: string
  /** A footnote marker after the wordmark, e.g. "*". Explain it in `footnote`. */
  mark?: string
  location?: string
  industry?: string
  link?: { label: string; href: string }
  /** One or two short paragraphs. */
  summary?: string[]
  tags?: string[]
  /** This row's own pigment as [core, body, edge]. Overrides the section's. */
  colors?: [string, string, string]
  /** A small mark shown before the role, e.g. an <img> or <svg> logo. */
  logo?: React.ReactNode
}

export type PigmentExperienceLedgerProps = {
  items?: LedgerItem[]
  heading?: string
  intro?: string
  /** Small print under the list, e.g. what the `mark` means. */
  footnote?: string
  /** One call to action under the list. `null` hides it. */
  cta?: { label: string; href: string } | null
  /** Pigment preset. */
  palette?: PigmentPalette
  /** Your own pigment: [core, body, edge]. Overrides `palette`. */
  colors?: [string, string, string]
  /** Peak pigment opacity, 0 to 1. */
  strength?: number
  /** Row open at first (uncontrolled). `null` starts closed. */
  defaultOpen?: number | null
  /** Controlled open row. Pair with `onToggle`. */
  open?: number | null
  onToggle?: (index: number | null) => void
  /** Field labels in the open row. */
  labels?: { position?: string; location?: string; industry?: string; link?: string; tags?: string }
  /** Set the wordmarks in capitals. */
  uppercase?: boolean
  /** Paint tenure and age into the wash: longer roles, longer strokes; older roles, drier pigment. */
  ageing?: boolean
  /** Opacity of the dried pigment left behind closed rows, 0 to 1. 0 leaves them bare. */
  residue?: number
  /** Level of the section heading; rows use the next level down. */
  headingLevel?: 2 | 3 | 4
  /** Any CSS length. The section grows past it when rows open. */
  minHeight?: number | string
  background?: string
  ink?: string
  /** Font stack for the wordmarks and heading. Body copy inherits the page font. */
  fontFamily?: string
  className?: string
  style?: React.CSSProperties
}

// #region logic
export const PALETTES = {
  ember: ["#f2266f", "#ff7417", "#ffcf33"],
  tide: ["#08706c", "#17b09c", "#c3ee8a"],
  moss: ["#4b6b17", "#93bb27", "#ece07a"],
  mono: ["#1b2027", "#535c68", "#c5cbd3"],
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

export function smoothstep(a: number, b: number, x: number): number {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

export function hexToRgb(hex: string): number[] {
  let h = hex.replace("#", "").trim()
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  const v = parseInt(h.slice(0, 6), 16)
  if (Number.isNaN(v)) return [0, 0, 0]
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}

/** Pigment colour at t: 0 is the thin edge, 1 the dense core. */
export function rampAt(edge: number[], body: number[], core: number[], t: number): number[] {
  const u = clamp(t, 0, 1)
  const a = u < 0.5 ? edge : body
  const b = u < 0.5 ? body : core
  const k = u < 0.5 ? u * 2 : (u - 0.5) * 2
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]
}

/** Opening the open row closes it; anything else opens that row. */
export function nextOpen(current: number | null, index: number): number | null {
  return current === index ? null : index
}

/** Font size that fits `textWidth` (measured at `base`) into `avail`, never below `min`. */
export function fitFont(base: number, textWidth: number, avail: number, min = 18): number {
  if (!(textWidth > 0) || textWidth <= avail) return base
  return Math.max(min, Math.floor(((base * avail) / textWidth) * 100) / 100)
}

/** Relative luminance of an sRGB colour, 0 to 1. */
export function luminance(r: number, g: number, b: number): number {
  const f = (c: number) => {
    const s = c / 255
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

/** Deterministic 0..1 hash of an integer lattice point. */
export function hash2(x: number, y: number, seed: number): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 2246822519)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

/** Smooth value noise, 0..1, stable for a given seed whatever the canvas size. */
export function valueNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const a = hash2(ix, iy, seed)
  const b = hash2(ix + 1, iy, seed)
  const c = hash2(ix, iy + 1, seed)
  const d = hash2(ix + 1, iy + 1, seed)
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy
}
/** The years a role spans, from "2019-2022", "2022-now" or "2021". */
export function tenureOf(years: string, now: number): { start: number; end: number; length: number } | null {
  const m = years.match(/(\d{4})\D+(\d{4}|now|present|current|today)/i)
  if (m) {
    const start = Number(m[1])
    const end = /^\d{4}$/.test(m[2]) ? Number(m[2]) : now
    return { start, end, length: Math.max(0.5, end - start) }
  }
  const one = years.match(/\d{4}/)
  if (!one) return null
  const y = Number(one[0])
  return { start: y, end: y, length: 0.5 }
}

/** How far a stroke reaches, as a share of its wordmark's width: longer tenure, longer stroke. */
export function reachOf(length: number): number {
  return clamp(0.34 + length * 0.07, 0.38, 0.7)
}

/** How dry a row's pigment looks: 0 for a current role, up to 0.6 for one that ended a decade or more ago. */
export function drynessOf(end: number, now: number): number {
  return clamp((now - end) / 12, 0, 0.6)
}
// #endregion logic

/* ------------------------------------------------------------- pigment */

type Blob = { ox: number; oy: number; r: number; w: number; ph: number; sp: number }

type Smear = {
  canvas: HTMLCanvasElement | null
  ctx: CanvasRenderingContext2D | null
  img: ImageData | null
  noise: Float32Array
  hue: Float32Array
  grain: Float32Array
  bw: number
  bh: number
  cssW: number
  cssH: number
  headH: number
  homeX: number
  homeY: number
  bleedX: number
  nameW: number
  reach: number
  dry: number
  dim: number
  dimTarget: number
  nameTop: number
  nameH: number
  lastActive: number
  low: Float32Array
  ramp: number[][]
  level: number
  target: number
  cx: number
  cy: number
  tx: number
  ty: number
  pointer: boolean
  blobs: Blob[]
  seed: number
  painted: boolean
}

// The canvas reaches past its row by this much above and below, so the wash
// fades out on its own instead of being cut by the row box.
const BLEED = 64
// ...and up to this much to each side, so a wordmark set flush right never
// cuts it. On a phone the page gutter is narrower, so the side bleed shrinks
// to the room the section actually has.
const BLEED_X = 40
const MAX_BUFFER_W = 600

// Seven pigment masses strung along a horizontal band, each with its own
// size, weight and slow drift.
function makeBlobs(seed: number): Blob[] {
  const r = (i: number) => hash2(i, 7, seed)
  const out: Blob[] = []
  for (let i = 0; i < 7; i++) {
    out.push({
      ox: -1 + (2 * i) / 6 + (r(i) - 0.5) * 0.22,
      oy: (r(i + 20) - 0.5) * 0.9,
      r: 0.72 + r(i + 40) * 0.36 - Math.abs(i - 3) * 0.05,
      w: 0.8 + r(i + 60) * 0.45 + (i === 3 ? 0.25 : 0),
      ph: r(i + 80) * 6.28,
      sp: 0.18 + r(i + 100) * 0.34,
    })
  }
  return out
}

function newSmear(seed: number): Smear {
  return {
    canvas: null,
    ctx: null,
    img: null,
    noise: new Float32Array(0),
    hue: new Float32Array(0),
    grain: new Float32Array(0),
    bw: 0,
    bh: 0,
    cssW: 0,
    cssH: 0,
    headH: 0,
    homeX: 0,
    homeY: 0,
    bleedX: BLEED_X,
    nameW: 0,
    reach: 0.5,
    dry: 0,
    dim: 1,
    dimTarget: 1,
    nameTop: 0,
    nameH: 0,
    lastActive: 0,
    low: new Float32Array(0),
    ramp: [],
    level: 0,
    target: 0,
    cx: 0,
    cy: 0,
    tx: 0,
    ty: 0,
    pointer: false,
    blobs: makeBlobs(seed),
    seed,
    painted: false,
  }
}

/** Where the wash rests when nothing points at it: centred on the wordmark. */
function homeOf(s: Smear): [number, number] {
  return [s.homeX ? s.bleedX + s.homeX : s.cssW * 0.6, BLEED + (s.homeY || s.headH * 0.5)]
}

// Size the pigment buffer to the row (plus its bleed). Noise is hashed from
// buffer coordinates, so the paper texture stays put while a row opens.
function sizeSmear(s: Smear, w: number, h: number, headH: number) {
  s.cssW = w + s.bleedX * 2
  s.cssH = h + BLEED * 2
  s.headH = headH || h
  if (!s.canvas) return
  const scale = clamp(s.cssW / MAX_BUFFER_W, 1.5, 3)
  const bw = Math.max(8, Math.round(s.cssW / scale))
  const bh = Math.max(8, Math.round((s.cssH / s.cssW) * bw))
  s.canvas.style.left = -s.bleedX + "px"
  s.canvas.style.width = "calc(100% + " + s.bleedX * 2 + "px)"
  if (bw === s.bw && bh === s.bh && s.img) return
  s.bw = bw
  s.bh = bh
  s.canvas.width = bw
  s.canvas.height = bh
  s.ctx = s.canvas.getContext("2d")
  s.img = s.ctx ? s.ctx.createImageData(bw, bh) : null
  const n = bw * bh
  s.noise = new Float32Array(n)
  s.hue = new Float32Array(n)
  s.low = new Float32Array(n)
  s.grain = new Float32Array(n)
  const u = scale / 3 // keep the texture the same size in css px at any buffer scale
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const i = y * bw + x
      const X = x * u
      const Y = y * u
      s.noise[i] = 0.55 * valueNoise(X / 11, Y / 8, s.seed) + 0.3 * valueNoise(X / 4, Y / 4, s.seed + 11) + 0.15 * valueNoise(X / 1.6, Y / 1.6, s.seed + 17)
      // Rotated, isotropic lattice: an axis-stretched one shows as scanlines.
      s.hue[i] = valueNoise((0.8 * X + 0.6 * Y) / 20, (0.8 * Y - 0.6 * X) / 20, s.seed + 31)
      s.low[i] = valueNoise(X / 40, Y / 40, s.seed + 41)
      s.grain[i] = hash2(x, y, s.seed + 23)
    }
  }
  s.painted = false
}

function paintSmear(s: Smear, time: number, ramp: number[][], strength: number, dark: boolean, faint = false) {
  const ctx = s.ctx
  const img = s.img
  if (!ctx || !img || ramp.length < 3) return
  const data = img.data
  data.fill(0)
  const level = s.level
  if (level > 0.002) {
    const bw = s.bw
    const bh = s.bh
    const sc = s.cssW / bw
    const grow = 1 - Math.pow(1 - clamp(level, 0, 1), 3)
    const narrow = s.cssW < 560
    // The masses spread across the wordmark and always overlap, so the wash
    // stays one body of pigment instead of splitting into islands.
    const span = clamp((s.nameW || s.cssW * 0.3) * s.reach, 60, 320) * (0.5 + 0.5 * grow)
    const R = clamp(s.headH * (narrow ? 0.95 : 1.12), 70, 200) * (0.55 + 0.45 * grow)
    const dry = s.dry
    // Age fades and greys pigment on paper. On a dark surface that reads as
    // mud, so there age only shows as heavier granulation.
    const fade = smoothstep(0, 0.35, level) * strength * (1 - dry * (dark ? 0.08 : 0.45))
    const tooth = 0.76 + dry * 0.6 // older pigment granulates more
    const [edge, body, core] = ramp
    const n = s.blobs.length
    const bx = new Float32Array(n)
    const by = new Float32Array(n)
    const br = new Float32Array(n)
    let x0 = bw
    let x1 = 0
    let y0 = bh
    let y1 = 0
    const SQ = 1.65 // vertical squash: the wash runs along the row
    for (let k = 0; k < n; k++) {
      const b = s.blobs[k]
      const px = s.cx + b.ox * span + Math.sin(time * b.sp + b.ph) * R * 0.12
      const py = s.cy + b.oy * R * 0.4 + Math.cos(time * b.sp * 0.8 + b.ph) * R * 0.06
      const rr = (b.r * R) / sc
      bx[k] = px / sc
      by[k] = py / sc
      br[k] = rr * rr
      x0 = Math.min(x0, bx[k] - rr)
      x1 = Math.max(x1, bx[k] + rr)
      y0 = Math.min(y0, by[k] - rr / SQ)
      y1 = Math.max(y1, by[k] + rr / SQ)
    }
    const xs = Math.max(0, Math.floor(x0))
    const xe = Math.min(bw - 1, Math.ceil(x1))
    const ys = Math.max(0, Math.floor(y0))
    const ye = Math.min(bh - 1, Math.ceil(y1))
    // Contain the wash to its row's header band. The envelope thins the field
    // itself, so the boundary gets the same ragged paper edge as the rest.
    // The band hugs the wordmark, so the role and the years on a phone sit on
    // plain surface and small text never lands on pigment.
    const bandTop = s.nameH ? s.nameTop - s.nameH * 0.3 : 0
    const bandBottom = s.nameH ? s.nameTop + s.nameH * 1.02 : s.headH - 6
    const top = (BLEED + Math.max(0, bandTop)) / sc
    const bottom = (BLEED + bandBottom) / sc
    const feather = Math.min(36, (bandBottom - bandTop) * 0.4) / sc
    const side = Math.max(s.bleedX - 4, 28) / sc
    for (let y = ys; y <= ye; y++) {
      const env = smoothstep(top, top + feather, y) * (1 - smoothstep(bottom - feather, bottom, y))
      if (env <= 0) continue
      for (let x = xs; x <= xe; x++) {
        let f = 0
        for (let k = 0; k < n; k++) {
          const dx = x - bx[k]
          const dy = (y - by[k]) * SQ
          const d2 = dx * dx + dy * dy
          if (d2 < br[k]) {
            const q = 1 - d2 / br[k]
            f += q * q * s.blobs[k].w
          }
        }
        f *= env * smoothstep(0, side, x) * (1 - smoothstep(bw - 1 - side, bw - 1, x))
        if (f < 0.04) continue
        const i = y * bw + x
        // Paper tooth breaks the edge up; a second, slower noise streaks the hue.
        // A slower noise varies how thick the edge is, so it never reads as an outline.
        const fe = f * (1 - tooth / 2 + tooth * s.noise[i]) + (s.low[i] - 0.5) * 0.24
        // On a dark surface a soft fringe of warm colour at low alpha reads as
        // brown, so the edge is kept crisp there.
        const wash = dark ? smoothstep(0.2, 0.34, fe) : smoothstep(0.2, 0.6, fe)
        // Pigment collects at the drying edge: a denser, warmer tide line. It moves
        // toward the body colour rather than toward grey, which would read as dirt.
        const rim = smoothstep(0.2, 0.3, fe) * (1 - smoothstep(0.3, 0.5, fe))
        const depth = clamp(smoothstep(0.3, 1.55, fe) + (s.hue[i] - 0.5) * 0.6 + rim * (0.55 + dry * 0.4), 0, 1)
        // Warm edge colours at low opacity read as brown on a dark surface, so a
        // faint wash there is painted from the core colour.
        const c = rampAt(edge, body, core, dark && faint ? 0.7 + depth * 0.3 : depth)
        if (dry > 0 && !dark) {
          const grey = c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11
          for (let q = 0; q < 3; q++) c[q] += (grey - c[q]) * dry * 0.15
        }
        const g = s.grain[i]
        // Dried pigment shows as a crisper, darker tide line.
        const shade = 1 - rim * (0.07 + dry * 0.2) + (g - 0.5) * 0.05
        const a = (wash * (0.86 + 0.14 * depth) + rim * 0.1) * (0.9 + 0.1 * g * (1 + dry)) * fade
        const j = i * 4
        data[j] = c[0] * shade
        data[j + 1] = c[1] * shade
        data[j + 2] = c[2] * shade
        data[j + 3] = a > 1 ? 255 : a * 255
      }
    }
  }
  ctx.putImageData(img, 0, 0)
  s.painted = level > 0.002
}

// The surface colour under the section, read through a 1px canvas so any CSS
// colour syntax (oklch, color-mix, named) resolves to sRGB.
function surfaceIsDark(el: HTMLElement | null): boolean {
  if (typeof document === "undefined") return false
  const probe = document.createElement("canvas")
  probe.width = probe.height = 1
  const g = probe.getContext("2d", { willReadFrequently: true })
  let node: HTMLElement | null = el
  while (node && g) {
    const bg = getComputedStyle(node).backgroundColor
    g.clearRect(0, 0, 1, 1)
    g.fillStyle = "#000"
    g.fillStyle = bg
    g.fillRect(0, 0, 1, 1)
    const d = g.getImageData(0, 0, 1, 1).data
    if (d[3] > 200) return luminance(d[0], d[1], d[2]) < 0.35
    node = node.parentElement
  }
  return typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches
}

/* ---------------------------------------------------------------- styles */

const PEL_CSS = [
  ".pel-root{position:relative;width:100%;overflow-x:clip;container-type:inline-size;background:var(--pel-bg);color:var(--pel-ink);padding:clamp(3rem,7cqi,6.5rem) clamp(1.25rem,5cqi,5rem);box-sizing:border-box;isolation:isolate;-webkit-font-smoothing:antialiased;--pel-ease:cubic-bezier(.23,1,.32,1);--pel-pad:clamp(.5rem,1.1cqi,.9rem)}",
  ".pel-root *,.pel-root *::before,.pel-root *::after{box-sizing:border-box}",
  ".pel-wrap{max-width:84rem;margin:0 auto}",
  ".pel-head{position:relative;z-index:1;margin:0 0 clamp(1.75rem,4cqi,3.25rem)}",
  ".pel-title{margin:0;font-family:var(--pel-display);font-size:clamp(2.1rem,4.6cqi,4rem);font-weight:500;letter-spacing:-.04em;line-height:1}",
  ".pel-intro{margin:.9rem 0 0;max-width:40ch;font-size:1rem;line-height:1.5;color:var(--pel-muted)}",
  ".pel-list{list-style:none;margin:0;padding:0;border-top:1px solid var(--pel-line)}",
  ".pel-row{position:relative;border-bottom:1px solid var(--pel-line)}",
  ".pel-ink{position:absolute;left:-40px;top:-64px;width:calc(100% + 80px);height:calc(100% + 128px);max-width:none;display:block;z-index:0;pointer-events:none}",
  ".pel-h{margin:0;font:inherit;position:relative;z-index:1}",
  ".pel-trigger{-webkit-appearance:none;appearance:none;background:none;border:0;border-radius:2px;margin:0;padding:clamp(1.1rem,2.3cqi,1.85rem) var(--pel-pad);width:100%;color:inherit;font:inherit;text-align:inherit;cursor:pointer;display:grid;grid-template-columns:minmax(8.5rem,15rem) minmax(0,1fr);align-items:center;column-gap:1.5rem;-webkit-tap-highlight-color:transparent}",
  ".pel-trigger:focus-visible{outline:2px solid var(--pel-ink);outline-offset:-2px;border-radius:4px}",
  ".pel-when{display:flex;align-items:center;gap:.85rem;font-style:italic;font-size:clamp(.92rem,1.25cqi,1.06rem);letter-spacing:-.01em;color:var(--pel-muted);font-variant-numeric:tabular-nums;transition:color .2s ease,transform .3s var(--pel-ease)}",
  ".pel-x{position:relative;display:block;width:.78rem;height:.78rem;flex:none;font-style:normal;transition:transform .34s var(--pel-ease)}",
  ".pel-x::before,.pel-x::after{content:'';position:absolute;left:0;top:50%;width:100%;height:1.5px;margin-top:-.75px;background:currentColor;border-radius:1px}",
  ".pel-x::after{transform:rotate(90deg)}",
  ".pel-row[data-open='true'] .pel-x{transform:rotate(45deg)}",
  ".pel-namecell{display:flex;flex-direction:column;align-items:flex-end;min-width:0;text-align:right}",
  ".pel-name{display:inline-block;white-space:nowrap;font-family:var(--pel-display);font-size:clamp(2.25rem,7.4cqi,6.4rem);font-weight:600;letter-spacing:-.045em;line-height:.9;text-transform:var(--pel-case);padding:0 .02em .04em 0;transform-origin:100% 60%;transition:transform .32s var(--pel-ease)}",
  ".pel-mark{font-weight:400;font-size:.6em;vertical-align:.62em;margin-left:.05em;letter-spacing:0}",
  ".pel-role{display:inline-flex;align-items:center;gap:.55rem;margin-top:.6rem;font-size:.72rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--pel-muted);transition:color .3s ease}",
  ".pel-trigger:active .pel-name{transform:translateX(-.06em) scale(.985);transition-duration:.12s}",
  "@media (hover:hover) and (pointer:fine){.pel-trigger:hover .pel-name{transform:translateX(-.06em)}.pel-trigger:hover .pel-when{transform:translateX(.4rem);color:var(--pel-ink)}.pel-row[data-open='false'] .pel-trigger:hover .pel-x{transform:rotate(90deg)}}",
  ".pel-logo{display:inline-flex;align-items:center;height:1.1rem;flex:none}",
  ".pel-logo svg,.pel-logo img{height:100%;width:auto;max-width:none;display:block}",
  ".pel-row[data-lit='true'] .pel-when,.pel-row[data-lit='true'] .pel-role,.pel-row[data-lit='true'] .pel-label{color:var(--pel-ink)}",
  ".pel-panel{display:grid;grid-template-rows:0fr;position:relative;z-index:1;transition:grid-template-rows .2s var(--pel-ease)}",
  ".pel-row[data-open='true'] .pel-panel{grid-template-rows:1fr;transition-duration:.32s}",
  ".pel-clip{overflow:hidden;min-height:0}",
  ".pel-body{display:grid;grid-template-columns:minmax(8.5rem,15rem) minmax(0,.85fr) minmax(0,1.3fr);column-gap:1.5rem;row-gap:1.25rem;padding:.15rem var(--pel-pad) clamp(1.6rem,3.2cqi,2.6rem);opacity:0;transform:translateY(-6px);transition:opacity .14s ease,transform .22s var(--pel-ease)}",
  ".pel-row[data-open='true'] .pel-body{opacity:1;transform:none;transition:opacity .28s ease .06s,transform .32s var(--pel-ease) .03s}",
  ".pel-meta{grid-column:2;margin:0;display:grid;grid-template-columns:auto minmax(0,1fr);column-gap:1.75rem;row-gap:.6rem;align-content:start;font-size:.875rem;line-height:1.4}",
  ".pel-label{color:var(--pel-muted);transition:color .3s ease}",
  ".pel-meta dd{margin:0;font-weight:600;min-width:0;overflow-wrap:anywhere}",
  ".pel-meta a{color:inherit;text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:3px;border-radius:2px}",
  ".pel-meta a:hover{text-decoration-thickness:2px}",
  ".pel-meta a:focus-visible{outline:2px solid var(--pel-ink);outline-offset:2px}",
  ".pel-copy{grid-column:3;font-size:1rem;line-height:1.55;max-width:56ch}",
  ".pel-copy p{margin:0 0 .8em}",
  ".pel-copy p:last-of-type{margin-bottom:0}",
  ".pel-tags{list-style:none;margin:1.1rem 0 0;padding:0;display:flex;flex-wrap:wrap;gap:.4rem}",
  ".pel-tags li{font-size:.75rem;line-height:1;padding:.4rem .7rem;border:1px solid currentColor;border-radius:999px}",
  ".pel-foot{position:relative;z-index:1;display:flex;justify-content:space-between;align-items:center;gap:1rem 2rem;flex-wrap:wrap;margin-top:1.4rem;font-size:.875rem;color:var(--pel-muted)}",
  ".pel-note{margin:0}",
  ".pel-cta{position:relative;display:inline-flex;align-items:center;gap:.65rem;margin-left:auto;padding:.55rem 0;color:var(--pel-ink);font-family:var(--pel-display);font-size:1.06rem;font-weight:600;letter-spacing:-.01em;text-decoration:none;border-radius:2px}",
  ".pel-cta::after{content:'';position:absolute;left:0;right:0;bottom:.3rem;height:1px;background:currentColor;transform-origin:50% 100%;transition:transform .3s var(--pel-ease)}",
  ".pel-cta svg{width:1rem;height:1rem;flex:none;transition:transform .45s var(--pel-ease)}",
  ".pel-cta:hover::after,.pel-cta:focus-visible::after{transform:scaleY(2)}",
  ".pel-cta:hover svg,.pel-cta:focus-visible svg{transform:translateY(3px)}",
  ".pel-cta:active svg{transform:translateY(5px)}",
  ".pel-cta:focus-visible{outline:2px solid var(--pel-ink);outline-offset:4px}",
  ".pel-head,.pel-row,.pel-foot{transition:opacity .7s ease calc(var(--i,0) * 45ms),transform .85s var(--pel-ease) calc(var(--i,0) * 45ms)}",
  ".pel-root[data-enter='pending'] .pel-head,.pel-root[data-enter='pending'] .pel-row,.pel-root[data-enter='pending'] .pel-foot{opacity:0;transform:translateY(16px)}",
  "@container (max-width:640px){.pel-trigger{grid-template-columns:minmax(0,1fr);row-gap:.7rem}.pel-when{justify-content:space-between}.pel-namecell{align-items:flex-start;text-align:left}.pel-name{font-size:clamp(2rem,12.5cqi,3.4rem)}.pel-body{grid-template-columns:minmax(0,1fr)}.pel-meta,.pel-copy{grid-column:1}.pel-foot{flex-direction:column;align-items:flex-start}.pel-cta{margin-left:0}}",
  "@media (prefers-reduced-motion:reduce){.pel-root *,.pel-head,.pel-row,.pel-foot{transition-duration:.01ms !important;transition-delay:0s !important}}",
].join("\n")

/* -------------------------------------------------------------- defaults */

const DEFAULT_ITEMS: LedgerItem[] = [
  {
    company: "Halden",
    role: "Design director",
    years: "2022-now",
    location: "Copenhagen, hybrid",
    industry: "Climate software",
    link: { label: "Read the case study", href: "#halden" },
    summary: [
      "I lead a design team of nine building the forecasting tools grid operators use to plan around wind and solar output.",
      "We replaced forty one-off dashboards with a shared component library, so a new forecast view now ships in days instead of weeks.",
    ],
    tags: ["Design systems", "Data visualisation", "Hiring"],
  },
  {
    company: "Palisade",
    role: "Principal product designer",
    years: "2019-2022",
    location: "Remote",
    industry: "Payroll",
    link: { label: "Read the case study", href: "#palisade" },
    summary: [
      "Owned the payroll run for small businesses, from inviting the first employee to filing the year-end tax forms.",
      "Shipped a review screen that shows every change before money moves. It became the most visited page in the product.",
    ],
    tags: ["Fintech", "Research", "Prototyping"],
  },
  {
    company: "Verso",
    mark: "*",
    role: "Senior designer",
    years: "2018-2019",
    location: "Lisbon",
    industry: "Publishing",
    summary: [
      "A year-long contract redesigning the reading app shared by a group of independent magazines.",
      "Built offline reading and a type system that lets each title keep its own voice inside one app.",
    ],
    tags: ["iOS", "Typography"],
  },
  {
    company: "Kiteworks",
    role: "Product designer",
    years: "2016-2018",
    location: "Berlin",
    industry: "Mobility",
    summary: [
      "Designed the driver app for an electric van rental service running in four German cities.",
      "Rode along with drivers every other week and turned what we learned into the booking flow they still use.",
    ],
    tags: ["Android", "Field research"],
  },
  {
    company: "Oktave",
    role: "Interaction designer",
    years: "2014-2016",
    location: "London",
    industry: "Music software",
    summary: [
      "My first design job: the interface for a hardware sampler and the desktop app that ships with it.",
      "Learned to design for knobs, tiny screens and people performing live.",
    ],
  },
]

const DISPLAY_STACK = '"Neue Haas Grotesk Display Pro", "Helvetica Neue", "Inter Display", Helvetica, Arial, system-ui, sans-serif'

/* ------------------------------------------------------------- component */

export default function PigmentExperienceLedger({
  items = DEFAULT_ITEMS,
  heading = "Experience",
  intro = "Twelve years designing tools people use at work, most recently for energy and finance teams.",
  footnote = "* Contract role",
  cta = { label: "Download CV", href: "#cv" },
  palette = "ember",
  colors,
  strength = 0.82,
  defaultOpen = 0,
  open,
  onToggle,
  labels,
  uppercase = true,
  ageing = true,
  residue = 0.2,
  headingLevel = 2,
  minHeight = "100svh",
  background,
  ink,
  fontFamily,
  className,
  style,
}: PigmentExperienceLedgerProps) {
  const uid = React.useId().replace(/:/g, "")
  const controlled = open !== undefined
  const [inner, setInner] = React.useState((defaultOpen ?? null) as number | null)
  const openIndex = controlled ? (open ?? null) : inner
  const [hovered, setHovered] = React.useState(null as number | null)
  const [focused, setFocused] = React.useState(null as number | null)
  const [enter, setEnter] = React.useState("pending" as "pending" | "done")

  const rootRef = React.useRef(null as HTMLElement | null)
  const smears = React.useRef([] as Smear[])
  const rowEls = React.useRef([] as (HTMLLIElement | null)[])
  const nameEls = React.useRef([] as (HTMLSpanElement | null)[])
  const loop = React.useRef({ raf: 0, last: 0, frame: 0, clock: 0, visible: true, reduced: false, dark: false })

  const L = {
    position: labels?.position ?? "Position",
    location: labels?.location ?? "Location",
    industry: labels?.industry ?? "Industry",
    link: labels?.link ?? "Website",
    tags: labels?.tags ?? "Skills",
  }

  const ensureSmear = (i: number): Smear => {
    if (!smears.current[i]) smears.current[i] = newSmear(i * 7919 + 101)
    return smears.current[i]
  }

  const kick = React.useCallback(() => {
    const st = loop.current
    if (st.raf || typeof window === "undefined") return
    const tick = (now: number) => {
      st.raf = 0
      const dt = st.last ? Math.min(0.05, (now - st.last) / 1000) : 0.016
      st.last = now
      st.frame++
      let alive = false
      let moving = false
      let breathing = false
      for (const s of smears.current) {
        if (!s || !s.ctx) continue
        const prevLevel = s.level
        const prevX = s.cx
        const prevY = s.cy
        if (st.reduced) {
          if (s.dim !== s.dimTarget) s.painted = false
          s.dim = s.dimTarget
          s.level = s.target
          s.cx = s.tx
          s.cy = s.ty
        } else {
          const tau = s.target > s.level ? 0.3 : 0.2
          s.level += (s.target - s.level) * (1 - Math.exp(-dt / tau))
          if (Math.abs(s.target - s.level) < 0.002) s.level = s.target
          const prevDim = s.dim
          s.dim += (s.dimTarget - s.dim) * (1 - Math.exp(-dt / 0.2))
          if (Math.abs(s.dimTarget - s.dim) < 0.002) s.dim = s.dimTarget
          if (s.dim !== prevDim) s.painted = false
          const k = 1 - Math.exp(-dt / 0.26)
          s.cx += (s.tx - s.cx) * k
          s.cy += (s.ty - s.cy) * k
        }
        const changed = Math.abs(s.level - prevLevel) > 1e-4 || Math.abs(s.cx - prevX) > 0.05 || Math.abs(s.cy - prevY) > 0.05
        if (changed) moving = true
        const active = s.level > 0.002 || s.target > 0
        // A settled wash keeps breathing for a few seconds after the last
        // pointer or focus activity, then holds its frame and the loop sleeps.
        const breathes = active && !st.reduced && now - s.lastActive < 3000
        if (breathes) breathing = true
        if (active) alive = true
        if (active || s.painted) {
          if (changed || !s.painted || (breathes && st.frame % 2 === 0) || !active)
            paintSmear(s, st.clock, s.ramp, (st.dark ? Math.min(1, strength * 1.1) : strength) * s.dim, st.dark, s.dim < 0.6)
        }
      }
      if (breathing) st.clock += dt
      const keepGoing = st.visible && alive && (moving || breathing)
      if (keepGoing) st.raf = requestAnimationFrame(tick)
      else st.last = 0
    }
    st.raf = requestAnimationFrame(tick)
  }, [strength, residue])

  // Pigment colours follow the preset, each row's own colours and the surface.
  // On a dark page the palest stop leans toward the body colour (pale yellow
  // turns olive on black) and keeps its saturation.
  const itemsKey = items.map((it) => it.company).join("|")
  const rampKey =
    (colors ? colors.join(",") : palette) +
    "|" +
    (background ?? "") +
    "|" +
    (ageing ? "age" : "") +
    "|" +
    items.map((it) => it.years + (it.colors ? it.colors.join(",") : "")).join(";")
  React.useEffect(() => {
    const st = loop.current
    st.reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches
    const update = () => {
      st.dark = surfaceIsDark(rootRef.current)
      const now = new Date().getFullYear()
      const section = colors ?? PALETTES[palette] ?? PALETTES.ember
      items.forEach((it, i) => {
        const base = (it.colors ?? section).map(hexToRgb)
        const s = ensureSmear(i)
        s.ramp = st.dark ? [base[2].map((v, j) => v * 0.65 + base[1][j] * 0.35), base[1], base[0]] : [base[2], base[1], base[0]]
        const span = ageing ? tenureOf(it.years, now) : null
        s.reach = span ? reachOf(span.length) : 0.5
        s.dry = span ? drynessOf(span.end, now) : 0
        s.painted = false
      })
      kick()
    }
    update()
    // Theme switches usually toggle a class on <html>; repaint when they do.
    const mo = new MutationObserver(update)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style", "data-theme"] })
    return () => mo.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rampKey, kick])

  // Targets: the hovered, focused and open rows hold pigment.
  React.useEffect(() => {
    items.forEach((_, i) => {
      const s = ensureSmear(i)
      const pointed = i === hovered || i === focused
      const elsewhere = (hovered !== null && hovered !== i) || (focused !== null && focused !== i)
      // One focal point: the open row's wash steps back while another row is
      // pointed at. Closed rows keep a faint dried residue whose length and
      // dryness show the history at rest; pointing at one rewets it.
      const open = i === openIndex
      const rest = Math.min(0.5, residue * (0.55 + s.dry * 0.75))
      const next = pointed || open ? 1 : residue > 0 ? 0.75 : 0
      const dim = pointed ? 1 : open ? (elsewhere ? 0.22 : 1) : rest
      if (next !== s.target || dim !== s.dimTarget) s.lastActive = performance.now()
      s.target = next
      s.dimTarget = dim
      if (!s.pointer) [s.tx, s.ty] = homeOf(s)
    })
    kick()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openIndex, hovered, focused, items.length, residue, rampKey, kick])

  // Row sizes feed the pigment buffers; the root width refits the wordmarks.
  // Keyed on the names, so a parent passing an inline array doesn't refit every render.
  React.useEffect(() => {
    const root = rootRef.current
    if (!root || typeof ResizeObserver === "undefined") return
    const fit = () => {
      nameEls.current.forEach((el) => {
        if (!el || !el.parentElement) return
        el.style.fontSize = ""
        const base = parseFloat(getComputedStyle(el).fontSize) || 64
        const size = fitFont(base, el.scrollWidth, el.parentElement.clientWidth)
        if (size !== base) el.style.fontSize = size + "px"
      })
    }
    const sizeRow = (i: number) => {
      const li = rowEls.current[i]
      if (!li) return
      const s = ensureSmear(i)
      const head = li.querySelector(".pel-trigger") as HTMLElement | null
      const first = !s.cssW
      s.bleedX = clamp(Math.floor(li.getBoundingClientRect().left - root.getBoundingClientRect().left) - 4, 0, BLEED_X)
      sizeSmear(s, li.clientWidth, li.offsetHeight, head ? head.offsetHeight : li.offsetHeight)
      const nm = nameEls.current[i]
      if (nm) {
        const lr = li.getBoundingClientRect()
        const nr = nm.getBoundingClientRect()
        s.homeX = nr.left - lr.left + nr.width / 2
        s.nameTop = nr.top - lr.top
        s.nameH = nr.height
        s.homeY = s.nameTop + nr.height * 0.5
        s.nameW = nr.width
      }
      if (first || !s.pointer) {
        ;[s.tx, s.ty] = homeOf(s)
        if (first) {
          s.cx = s.tx
          s.cy = s.ty
        }
      }
    }
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        if (e.target === root) {
          fit()
          rowEls.current.forEach((_, i) => sizeRow(i))
        } else {
          const i = rowEls.current.indexOf(e.target as HTMLLIElement)
          if (i > -1) sizeRow(i)
        }
      }
      kick()
    })
    ro.observe(root)
    rowEls.current.forEach((li) => li && ro.observe(li))
    fit()
    rowEls.current.forEach((_, i) => sizeRow(i))
    if (typeof document !== "undefined" && document.fonts) document.fonts.ready.then(fit).catch(() => {})
    kick()
    return () => ro.disconnect()
  }, [itemsKey, kick])

  // Pause the pigment off screen and in background tabs; play the entrance once.
  React.useEffect(() => {
    const root = rootRef.current
    const st = loop.current
    const reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches
    if (!root || typeof IntersectionObserver === "undefined" || reduced) {
      setEnter("done")
      return
    }
    const io = new IntersectionObserver(
      ([e]) => {
        st.visible = e.isIntersecting
        if (e.isIntersecting) {
          setEnter("done")
          kick()
        }
      },
      { threshold: 0.05 },
    )
    io.observe(root)
    const vis = () => {
      st.visible = document.visibilityState === "visible"
      if (st.visible) kick()
    }
    document.addEventListener("visibilitychange", vis)
    return () => {
      io.disconnect()
      document.removeEventListener("visibilitychange", vis)
    }
  }, [kick])

  React.useEffect(() => {
    const st = loop.current
    return () => {
      if (st.raf) cancelAnimationFrame(st.raf)
      st.raf = 0
    }
  }, [])

  const toggle = (i: number) => {
    // A click hands the wash back to its wordmark.
    const s = ensureSmear(i)
    s.pointer = false
    ;[s.tx, s.ty] = homeOf(s)
    const next = nextOpen(openIndex, i)
    if (!controlled) setInner(next)
    onToggle?.(next)
  }

  const onMove = (i: number, e: React.PointerEvent) => {
    if (e.pointerType === "touch") return
    const li = rowEls.current[i]
    if (!li) return
    const s = ensureSmear(i)
    const r = li.getBoundingClientRect()
    // The wash leans toward the pointer rather than jumping onto it.
    const hx = homeOf(s)[0]
    const w = s.nameW || s.cssW * 0.3
    // Lean toward the pointer, but stay on the wordmark.
    s.tx = clamp(hx + (e.clientX - r.left + s.bleedX - hx) * 0.35, hx - w * 0.18, hx + w * 0.12)
    s.lastActive = performance.now()
    const y0 = s.nameH ? s.nameTop + s.nameH * 0.3 : s.headH * 0.35
    const y1 = s.nameH ? s.nameTop + s.nameH * 0.7 : s.headH * 0.7
    s.ty = BLEED + clamp(e.clientY - r.top, y0, y1)
    // A fresh bloom starts where the pointer came in.
    if (s.level < 0.05) {
      s.cx = s.tx
      s.cy = s.ty
    }
    s.pointer = true
    kick()
  }

  const onLeave = (i: number) => {
    const s = ensureSmear(i)
    s.pointer = false
    ;[s.tx, s.ty] = homeOf(s)
    setHovered((h) => (h === i ? null : h))
  }

  const rootStyle = {
    "--pel-bg": background ?? "var(--color-background, #ffffff)",
    "--pel-ink": ink ?? "var(--color-foreground, #111111)",
    "--pel-muted": ink ? "color-mix(in oklab, " + ink + " 62%, transparent)" : "var(--color-muted-foreground, #6b6b6b)",
    "--pel-line": ink ? "color-mix(in oklab, " + ink + " 16%, transparent)" : "var(--color-border, #e5e5e5)",
    "--pel-display": fontFamily ?? DISPLAY_STACK,
    "--pel-case": uppercase ? "uppercase" : "none",
    minHeight: typeof minHeight === "number" ? minHeight + "px" : minHeight,
    ...style,
  } as React.CSSProperties

  const headingId = uid + "-h"
  const Title = ("h" + headingLevel) as "h2"
  const RowHeading = ("h" + (headingLevel + 1)) as "h3"

  return (
    <section
      ref={(el) => {
        rootRef.current = el
      }}
      className={"pel-root" + (className ? " " + className : "")}
      style={rootStyle}
      aria-labelledby={heading ? headingId : undefined}
      data-enter={enter}
    >
      <style>{PEL_CSS}</style>
      <div className="pel-wrap">
        {(heading || intro) && (
          <header className="pel-head">
            {heading && (
              <Title id={headingId} className="pel-title">
                {heading}
              </Title>
            )}
            {intro && <p className="pel-intro">{intro}</p>}
          </header>
        )}

        <ol className="pel-list">
          {items.map((it, i) => {
            const isOpen = openIndex === i
            const lit = isOpen || hovered === i || focused === i
            const btnId = uid + "-b" + i
            const panelId = uid + "-p" + i
            return (
              <li
                key={it.company + i}
                ref={(el) => {
                  rowEls.current[i] = el
                }}
                className="pel-row"
                data-open={isOpen ? "true" : "false"}
                data-lit={lit ? "true" : "false"}
                style={{ "--i": i + 1 } as React.CSSProperties}
                onPointerEnter={(e) => {
                  if (e.pointerType !== "touch") setHovered(i)
                  onMove(i, e)
                }}
                onPointerMove={(e) => onMove(i, e)}
                onPointerLeave={() => onLeave(i)}
              >
                <canvas
                  className="pel-ink"
                  aria-hidden="true"
                  ref={(el) => {
                    const s = ensureSmear(i)
                    if (el && s.canvas !== el) {
                      s.canvas = el
                      s.ctx = null
                      s.img = null
                      s.bw = 0
                      s.bh = 0
                      if (s.cssW) sizeSmear(s, s.cssW, s.cssH, s.headH)
                    }
                  }}
                />
                <RowHeading className="pel-h">
                  <button
                    type="button"
                    id={btnId}
                    className="pel-trigger"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggle(i)}
                    onFocus={(e) => {
                      if (e.currentTarget.matches(":focus-visible")) {
                        ensureSmear(i).lastActive = performance.now()
                        setFocused(i)
                      }
                    }}
                    onBlur={() => setFocused((f) => (f === i ? null : f))}
                  >
                    <span className="pel-when">
                      <span>({it.years})</span>
                      <span className="pel-x" aria-hidden="true" />
                    </span>
                    <span className="pel-namecell">
                      <span
                        className="pel-name"
                        ref={(el) => {
                          nameEls.current[i] = el
                        }}
                      >
                        {it.company}
                        {it.mark && (
                          <span className="pel-mark" aria-hidden="true">
                            {it.mark}
                          </span>
                        )}
                      </span>
                      <span className="pel-role">
                        {it.logo && (
                          <span className="pel-logo" aria-hidden="true">
                            {it.logo}
                          </span>
                        )}
                        {it.role}
                      </span>
                    </span>
                  </button>
                </RowHeading>
                <div
                  id={panelId}
                  className="pel-panel"
                  role="region"
                  aria-labelledby={btnId}
                  aria-hidden={!isOpen}
                >
                  <div className="pel-clip">
                    <div className="pel-body">
                      <dl className="pel-meta">
                        <dt className="pel-label">{L.position}</dt>
                        <dd>{it.role}</dd>
                        {it.location && (
                          <>
                            <dt className="pel-label">{L.location}</dt>
                            <dd>{it.location}</dd>
                          </>
                        )}
                        {it.industry && (
                          <>
                            <dt className="pel-label">{L.industry}</dt>
                            <dd>{it.industry}</dd>
                          </>
                        )}
                        {it.link && (
                          <>
                            <dt className="pel-label">{L.link}</dt>
                            <dd>
                              <a href={it.link.href} tabIndex={isOpen ? undefined : -1}>
                                {it.link.label}
                              </a>
                            </dd>
                          </>
                        )}
                      </dl>
                      {!!(it.summary?.length || it.tags?.length) && (
                        <div className="pel-copy">
                          {it.summary?.map((p, k) => <p key={k}>{p}</p>)}
                          {it.tags && it.tags.length > 0 && (
                            <ul className="pel-tags" aria-label={L.tags}>
                              {it.tags.map((t) => (
                                <li key={t}>{t}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>

        {(footnote || cta) && (
          <footer className="pel-foot" style={{ "--i": items.length + 1 } as React.CSSProperties}>
            {footnote && <p className="pel-note">{footnote}</p>}
            {cta && (
              <a className="pel-cta" href={cta.href}>
                {cta.label}
                <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M8 2v11M3.5 8.5 8 13l4.5-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            )}
          </footer>
        )}
      </div>
    </section>
  )
}
