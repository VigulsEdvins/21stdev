"use client"

// Lilac Meadow Landing — a complete landing-page template for a yield-bearing
// stablecoin, after a soft "money grows" art direction: chrome coins half
// buried in a meadow of tiny lilac flowers under a pale lavender sky.
//
// Sections: a sticky nav, a painted hero, a "what is it" statement, three
// feature cards (a coneflower growing beside a coin, a dollar-peg chart, an
// autopilot switch), a backers strip, tabbed use cases illustrated in lavender
// clay (a temple, code blocks, a growing coin stack), a yield calculator with
// a live chart, an FAQ, a join-the-beta band and a footer.
//
// It is interactive throughout: pointer parallax and a grow-in intro on the
// hero, coins that flip when clicked, a coneflower that sways, use-case tabs
// that auto-advance and are reachable from the nav, a calculator that redraws
// as you drag, an accordion FAQ and a waitlist form that validates itself.
//
// Every picture is drawn in this file. The meadows are painted on <canvas>
// from a seeded PRNG (thousands of florets, shaded by mound and depth); the
// coins, flower and clay pieces are SVG. Nothing loads: no fonts, images or
// stylesheets, so it renders inside a sandboxed capture.
import * as React from "react"

/* ------------------------------------------------------------------ types */

export type MeadowLink = { label: string; href: string }
export type MeadowHero = {
  /** Line breaks split the headline. */
  title?: string
  subtitle?: string
  action?: MeadowLink
  /** A photo to use instead of the painted meadow. */
  image?: string
  imageAlt?: string
}
export type MeadowIntro = { title?: string; body?: string; action?: MeadowLink }
export type MeadowFeatureVisual = "flower" | "peg" | "autopilot"
export type MeadowFeature = {
  /** Line breaks are kept. */
  title: string
  body: string
  /** "flower" is the light card with the coneflower; the others are dark. */
  visual?: MeadowFeatureVisual
}
export type MeadowBackerGlyph = "ring" | "bars" | "wave" | "leaf" | "hex" | "spark" | "arch"
export type MeadowBacker = { name: string; glyph?: MeadowBackerGlyph; href?: string }
export type MeadowUseCaseArt = "temple" | "blocks" | "vault"
export type MeadowUseCase = {
  /** Also an in-page link: a nav item with href "#<id>" opens this tab. */
  id: string
  title: string
  body: string
  action?: MeadowLink
  art?: MeadowUseCaseArt
}
export type MeadowSectionCopy = { kicker?: string; title?: string; body?: string }
export type MeadowCalculator = {
  kicker?: string
  title?: string
  body?: string
  /** Annual percentage yield of the token, e.g. 5.12. */
  apy?: number
  /** What it is compared with, e.g. 0.45 for a savings account. */
  benchmarkApy?: number
  benchmarkLabel?: string
  defaultDeposit?: number
  disclaimer?: string
}
export type MeadowFaq = { q: string; a: string }
export type MeadowJoin = { title?: string; body?: string; placeholder?: string; action?: string; success?: string }
export type MeadowColumn = { title: string; links: MeadowLink[] }
export type MeadowSocial = { kind: "x" | "discord" | "github" | "telegram"; href: string; label?: string }
export type MeadowPaletteName = "lilac" | "rose" | "cornflower"

export type LilacMeadowLandingProps = {
  brand?: string
  /** The token's long name, used in headings ("What is USD Florin?"). */
  tokenName?: string
  /** The ticker, used in the calculator. */
  ticker?: string
  /** Replaces the four-point sparkle beside the brand. */
  logo?: React.ReactNode
  nav?: MeadowLink[]
  cta?: MeadowLink
  hero?: MeadowHero
  intro?: MeadowIntro
  features?: MeadowFeature[]
  backersLabel?: string
  backers?: MeadowBacker[]
  useCasesCopy?: MeadowSectionCopy
  useCases?: MeadowUseCase[]
  calculator?: MeadowCalculator
  faqCopy?: MeadowSectionCopy
  faqs?: MeadowFaq[]
  join?: MeadowJoin
  /** Called with the address when the join form is sent. Awaited; a throw shows an error. */
  onJoin?: (email: string) => unknown
  tagline?: string
  columns?: MeadowColumn[]
  socials?: MeadowSocial[]
  legal?: MeadowLink[]
  copyright?: string
  palette?: MeadowPaletteName
  /** "auto" follows a `.dark` class on an ancestor. */
  theme?: "auto" | "light" | "dark"
  /** The grow-in on load. */
  animateIn?: boolean
  /** Minimum height of the page. A definite length, so it survives any host layout. */
  height?: string
  className?: string
}

/* ------------------------------------------------------------------ logic */

// #region logic
type MeadowMound = [number, number, number]
type MeadowLayer = {
  /** Ridge line with no mound, as a fraction of the height from the top. */
  base: number
  /** [centre x, half width] as fractions of the width, height as a fraction of the height. */
  mounds: MeadowMound[]
  /** Floret radius range in px at 1200px wide. */
  size: [number, number]
  /** How many times over the visible band is covered by florets. */
  density: number
  /** Depth below the ridge (px at 1200px) that gets florets; the rest is shade. */
  band: number
  /** 0..1, how far colours fade toward the sky. */
  haze: number
  straws: number
  /** Ridge noise, as a fraction of the height. */
  wobble: number
  /** Draw five-petal florets with a shadow instead of dots. */
  petals?: boolean
}
type MeadowColors = { flowers: string[]; sky: string; straw: string[] }
type MeadowFloret = { t: 0; x: number; y: number; r: number; c: string; h: string; k: string; p: boolean; a: number }
type MeadowStraw = { t: 1; x: number; y: number; x2: number; y2: number; cx: number; cy: number; w: number; c: string; head: boolean }
type MeadowItem = MeadowFloret | MeadowStraw
type MeadowPaint = { W: number; H: number; ridge: number[][]; top: number; fill: string[]; items: MeadowItem[] }

const PALETTES = {
  lilac: {
    label: "Lilac",
    flowers: ["#1c1540", "#34287a", "#5f4fb8", "#9a8cec", "#d6cfff", "#f8f6ff"],
    nightFlowers: ["#07061a", "#191443", "#352b86", "#6a5bcc", "#b2a6f6", "#ebe7ff"],
    sky: ["#b5b4e5", "#d9d8f3", "#f2f1fb"],
    nightSky: ["#0e0c24", "#211c4a", "#3c3379"],
    metal: ["#ffffff", "#e3e0fb", "#a8a2da", "#6c65ab", "#c9c4f0", "#f3f1ff", "#8d87c6"],
    deep: "#25203d",
    wash: "#d8d6f3",
    wash2: "#efeefa",
    accent: "#5f4fb8",
  },
  rose: {
    label: "Rose",
    flowers: ["#3a0d22", "#6d1c45", "#ad4278", "#e38bb3", "#f8d0e1", "#fff6fa"],
    nightFlowers: ["#14050d", "#3a0f28", "#74275a", "#b65690", "#eba3c6", "#ffe6f1"],
    sky: ["#e6c0d1", "#f3dde7", "#fbf3f6"],
    nightSky: ["#1c0a16", "#391530", "#62284f"],
    metal: ["#ffffff", "#f8e2ec", "#dba5bd", "#a2607f", "#efc6d8", "#fff3f8", "#c48aa5"],
    deep: "#3a1b2d",
    wash: "#f3d8e4",
    wash2: "#faf0f4",
    accent: "#ad4278",
  },
  cornflower: {
    label: "Cornflower",
    flowers: ["#0a1838", "#1b3680", "#3762c4", "#7ca2ee", "#c9d9ff", "#f5f8ff"],
    nightFlowers: ["#030918", "#0f2150", "#21479c", "#4f7fdc", "#9ec0fb", "#e3edff"],
    sky: ["#b3c5ea", "#d7e2f5", "#f1f5fc"],
    nightSky: ["#08102a", "#152452", "#25407f"],
    metal: ["#ffffff", "#e1e9fb", "#a2b6dd", "#5f78ac", "#c3d3f1", "#f2f6ff", "#869bc9"],
    deep: "#17223f",
    wash: "#d5dff5",
    wash2: "#eef2fb",
    accent: "#3762c4",
  },
}
type MeadowPalette = (typeof PALETTES)["lilac"]

const STRAW = ["#dccb9f", "#9c8657"]
const NIGHT_STRAW = ["#6f6650", "#3b3528"]

function clamp(v: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, v))
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hexToRgb(hex: string): number[] {
  let h = hex.trim().replace(/^#/, "")
  if (h.length === 3) h = h.split("").map((c) => c + c).join("")
  const n = parseInt(h, 16)
  if (h.length !== 6 || Number.isNaN(n)) return [0, 0, 0]
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgbToHex(rgb: number[]): string {
  return "#" + rgb.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("")
}

/** Linear blend of two hex colours; t = 0 is a, t = 1 is b. */
function mix(a: string, b: string, t: number): string {
  const x = hexToRgb(a)
  const y = hexToRgb(b)
  const k = clamp(t, 0, 1)
  return rgbToHex([x[0] + (y[0] - x[0]) * k, x[1] + (y[1] - x[1]) * k, x[2] + (y[2] - x[2]) * k])
}

/** Samples evenly spaced colour stops at t in [0, 1]. */
function ramp(stops: string[], t: number): string {
  if (!stops.length) return "#000000"
  if (stops.length === 1) return stops[0]
  const f = clamp(t, 0, 1) * (stops.length - 1)
  const i = Math.min(stops.length - 2, Math.floor(f))
  return mix(stops[i], stops[i + 1], f - i)
}

/** y of the meadow's top edge at x, in px from the top. */
function ridgeAt(x: number, W: number, H: number, L: MeadowLayer, phase: number, s: number): number {
  const base = L.base * H
  let top = base
  for (const m of L.mounds) {
    const u = (x - m[0] * W) / Math.max(1, m[1] * W)
    if (u <= -1 || u >= 1) continue
    top = Math.min(top, base - m[2] * H * Math.pow(1 - u * u, 0.7))
  }
  const q = x / s
  const n = Math.sin(q * 0.031 + phase) * 0.5 + Math.sin(q * 0.077 + phase * 2.3) * 0.3 + Math.sin(q * 0.19 + phase * 4.1) * 0.2
  return top + n * L.wobble * H
}

/** Every floret and straw of one meadow layer, sorted back to front. Deterministic per seed. */
function buildMeadow(L: MeadowLayer, W: number, H: number, seed: number, colors: MeadowColors): MeadowPaint {
  const rnd = mulberry32(seed)
  const s = clamp(W / 1200, 0.6, 1.4)
  const phase = rnd() * 100
  const ridge = (x: number) => ridgeAt(x, W, H, L, phase, s)
  const haze = (c: string, d: number) => (L.haze > 0 ? mix(c, colors.sky, L.haze * (1 - d * 0.35)) : c)
  const LEVELS = 48
  const shades: string[] = []
  const lights: string[] = []
  const darks: string[] = []
  for (let i = 0; i < LEVELS; i++) {
    const c = ramp(colors.flowers, i / (LEVELS - 1))
    shades.push(c)
    lights.push(mix(c, "#ffffff", 0.3))
    darks.push(mix(c, colors.flowers[0], 0.35))
  }

  const ridgePts: number[][] = []
  let top = H
  for (let x = -12; x <= W + 12; x += 6) {
    const y = ridge(x)
    ridgePts.push([x, y])
    top = Math.min(top, y)
  }

  const r0 = L.size[0] * s
  const r1 = L.size[1] * s
  const rm = (r0 + r1) / 2
  const band = L.band * s
  let area = 0
  for (const p of ridgePts) area += Math.max(0, Math.min(band, H - p[1]) + r1 * 1.4) * 6
  const n = Math.min(42000, Math.round((L.density * area) / (Math.PI * rm * rm)))
  const items: MeadowItem[] = []
  // Bushes: overlapping domes lit from the upper left. A floret takes the
  // tallest dome it sits on, so tops glow and the gaps between them fall dark.
  const grow = L.petals ? 1.5 : 1
  const cr0 = 24 * s * grow
  const cr1 = 62 * s * grow
  const clumps: number[][] = []
  const kc = Math.min(900, Math.round((area / (Math.PI * Math.pow((cr0 + cr1) / 2, 2))) * 2.4))
  for (let i = 0; i < kc; i++) {
    const x = rnd() * (W + 60) - 30
    const rg = ridge(x)
    clumps.push([x, rg + rnd() * (Math.max(0, Math.min(band, H - rg)) + 10 * s), cr0 + (cr1 - cr0) * rnd()])
  }
  let guard = n * 8
  let count = 0
  while (count < n && guard-- > 0) {
    const x = rnd() * (W + 24) - 12
    const rg = ridge(x)
    const depth = Math.max(0, Math.min(band, H - rg))
    const y = rg - r1 * 1.4 + rnd() * (depth + r1 * 1.4)
    const d = clamp((y - rg) / Math.max(40 * s, Math.min(H - rg, band) * 0.95), 0, 1)
    const r = (r0 + (r1 - r0) * Math.pow(rnd(), 1.7)) * (1 + d * (L.petals ? 0.45 : 0.2))
    if (y < rg - r * (0.3 + rnd() * 0.9)) continue
    const slope = (ridge(x - 8 * s) - ridge(x + 8 * s)) / (16 * s)
    let dome = 0
    let lit = 0
    for (const c of clumps) {
      const dx = x - c[0]
      const dy = y - c[1]
      if (dx > c[2] || dx < -c[2] || dy > c[2] || dy < -c[2]) continue
      const q = (dx * dx + dy * dy) / (c[2] * c[2])
      if (q >= 1) continue
      const hh = Math.sqrt(1 - q)
      if (hh > dome) {
        dome = hh
        lit = clamp((-0.55 * dx - 0.83 * dy) / c[2], -1, 1)
      }
    }
    const lum = dome * (0.45 + (lit * 0.5 + 0.5) * 0.55)
    const glow = Math.exp(-Math.max(0, y - rg) / (22 * s))
    let b = 0.22 + lum * 0.72 + glow * 0.2 - d * 0.16 + clamp(slope, -1, 1) * 0.12 + (rnd() - 0.5) * 0.2
    if (lum > 0.55 && rnd() < 0.035) b += 0.22
    const i = Math.round(clamp(b, 0, 1) * (LEVELS - 1))
    items.push({ t: 0, x, y, r, c: haze(shades[i], d), h: haze(lights[i], d), k: haze(darks[i], d), p: !!L.petals && r > 2.2, a: rnd() * Math.PI })
    count++
  }

  for (let i = 0; i < L.straws; i++) {
    const x = rnd() * W
    if (ridge(x) > H - 6 * s) continue
    const y = ridge(x) + (3 + rnd() * 16) * s
    const len = (14 + rnd() * 38) * s * (L.petals ? 1.3 : 1)
    const lean = (rnd() - 0.5) * 0.9
    const x2 = x + Math.sin(lean) * len
    const y2 = y - Math.cos(lean) * len
    const bow = (rnd() - 0.5) * len * 0.35
    items.push({
      t: 1, x, y, x2, y2,
      cx: (x + x2) / 2 + bow,
      cy: (y + y2) / 2,
      w: (0.5 + rnd() * 0.9) * s * (L.petals ? 1.3 : 1),
      c: haze(mix(colors.straw[0], colors.straw[1], rnd()), 0),
      head: rnd() < 0.4,
    })
  }

  items.sort((p, q) => p.y - q.y)
  return {
    W, H, ridge: ridgePts, top,
    fill: [haze(ramp(colors.flowers, 0.32), 0), haze(ramp(colors.flowers, 0.1), 1)],
    items,
  }
}

/** Compound (monthly) or simple growth of a deposit after `months`. */
function projectBalance(deposit: number, apy: number, months: number, compound: boolean): number {
  const r = apy / 100
  if (!compound) return deposit * (1 + (r * months) / 12)
  return deposit * Math.pow(1 + r / 12, months)
}

/** `points` evenly spaced balances from today to `months` out. */
function growthSeries(deposit: number, apy: number, months: number, compound: boolean, points: number): number[] {
  const out: number[] = []
  const k = Math.max(2, points)
  for (let i = 0; i < k; i++) out.push(projectBalance(deposit, apy, (months * i) / (k - 1), compound))
  return out
}

const MIN_DEPOSIT = 100
const MAX_DEPOSIT = 1000000

/** Slider position 0..1 to a deposit on a log scale, rounded to a friendly step. */
function sliderToAmount(t: number): number {
  const raw = Math.pow(10, Math.log10(MIN_DEPOSIT) + clamp(t, 0, 1) * (Math.log10(MAX_DEPOSIT) - Math.log10(MIN_DEPOSIT)))
  const step = Math.pow(10, Math.floor(Math.log10(raw))) / 20
  return clamp(Math.round(raw / step) * step, MIN_DEPOSIT, MAX_DEPOSIT)
}

function amountToSlider(amount: number): number {
  const a = clamp(amount, MIN_DEPOSIT, MAX_DEPOSIT)
  return (Math.log10(a) - Math.log10(MIN_DEPOSIT)) / (Math.log10(MAX_DEPOSIT) - Math.log10(MIN_DEPOSIT))
}

function formatUSD(v: number): string {
  const cents = Math.abs(v) < 10000
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 })
}

function formatMonths(m: number): string {
  if (m <= 0) return "Today"
  if (m % 12 === 0) return m / 12 + (m === 12 ? " year" : " years")
  return m + (m === 1 ? " month" : " months")
}

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())
}

/** Roving focus for tab lists: the index a key moves to, or null. */
function nextIndex(i: number, key: string, n: number): number | null {
  if (n <= 0) return null
  if (key === "ArrowRight" || key === "ArrowDown") return (i + 1) % n
  if (key === "ArrowLeft" || key === "ArrowUp") return (i - 1 + n) % n
  if (key === "Home") return 0
  if (key === "End") return n - 1
  return null
}

function resolvePalette(name: string | undefined): MeadowPalette {
  return name && Object.prototype.hasOwnProperty.call(PALETTES, name) ? PALETTES[name as MeadowPaletteName] : PALETTES.lilac
}

/** "#business" → "business" when a use case has that id. */
function useCaseFromHref(href: string, ids: string[]): string | null {
  if (!href.startsWith("#")) return null
  const id = href.slice(1)
  return ids.indexOf(id) > -1 ? id : null
}
// #endregion logic

/* ------------------------------------------------------------------ scenes */

const HERO_LAYERS: MeadowLayer[] = [
  { base: 0.71, mounds: [[0.06, 0.16, 0.1], [0.3, 0.18, 0.065], [0.55, 0.2, 0.05], [0.78, 0.17, 0.09], [0.98, 0.14, 0.13]], size: [1.3, 2.5], density: 1.15, band: 70, haze: 0.42, straws: 14, wobble: 0.012 },
  { base: 0.81, mounds: [[0.0, 0.2, 0.17], [0.2, 0.16, 0.13], [0.44, 0.15, 0.08], [0.64, 0.17, 0.12], [0.92, 0.2, 0.17]], size: [1.9, 3.5], density: 1.2, band: 130, haze: 0.16, straws: 30, wobble: 0.016 },
  { base: 0.95, mounds: [[0.1, 0.15, 0.1], [0.31, 0.15, 0.24], [0.52, 0.12, 0.08], [0.7, 0.13, 0.13], [0.87, 0.15, 0.28]], size: [2.2, 4.6], density: 1.35, band: 999, haze: 0, straws: 40, wobble: 0.02, petals: true },
]
const CTA_LAYERS: MeadowLayer[] = [
  { base: 0.72, mounds: [[0.12, 0.2, 0.08], [0.45, 0.2, 0.05], [0.8, 0.22, 0.1]], size: [1.3, 2.5], density: 1.1, band: 70, haze: 0.42, straws: 10, wobble: 0.012 },
  { base: 0.84, mounds: [[0.05, 0.18, 0.14], [0.3, 0.18, 0.09], [0.6, 0.15, 0.08], [0.9, 0.2, 0.15]], size: [1.9, 3.5], density: 1.2, band: 130, haze: 0.16, straws: 24, wobble: 0.016 },
  { base: 0.97, mounds: [[0.16, 0.16, 0.14], [0.42, 0.14, 0.07], [0.74, 0.14, 0.2], [0.98, 0.14, 0.12]], size: [2.6, 5.2], density: 1.25, band: 999, haze: 0, straws: 30, wobble: 0.02, petals: true },
]
const CARD_LAYER: MeadowLayer = { base: 1.08, mounds: [[0.7, 0.2, 0.78], [0.94, 0.16, 0.66], [0.5, 0.1, 0.36]], size: [2.2, 4.4], density: 1.25, band: 999, haze: 0, straws: 16, wobble: 0.03, petals: true }
const ART_LAYER: MeadowLayer = { base: 0.62, mounds: [[0.08, 0.2, 0.36], [0.36, 0.2, 0.12], [0.66, 0.2, 0.2], [0.95, 0.2, 0.42]], size: [2.2, 4.2], density: 1.25, band: 999, haze: 0, straws: 22, wobble: 0.03, petals: true }

function paintMeadow(ctx: CanvasRenderingContext2D, m: MeadowPaint) {
  const g = ctx.createLinearGradient(0, m.top, 0, m.H)
  g.addColorStop(0, m.fill[0])
  g.addColorStop(1, m.fill[1])
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(m.ridge[0][0], m.H + 2)
  for (const p of m.ridge) ctx.lineTo(p[0], p[1] + 3)
  ctx.lineTo(m.ridge[m.ridge.length - 1][0], m.H + 2)
  ctx.closePath()
  ctx.fill()
  ctx.lineCap = "round"
  const TAU = Math.PI * 2
  for (const it of m.items) {
    if (it.t === 1) {
      ctx.strokeStyle = it.c
      ctx.lineWidth = it.w
      ctx.beginPath()
      ctx.moveTo(it.x, it.y)
      ctx.quadraticCurveTo(it.cx, it.cy, it.x2, it.y2)
      ctx.stroke()
      if (it.head) {
        ctx.fillStyle = it.c
        ctx.beginPath()
        ctx.ellipse(it.x2, it.y2, it.w * 1.3, it.w * 3.4, Math.atan2(it.y2 - it.cy, it.x2 - it.cx) + Math.PI / 2, 0, TAU)
        ctx.fill()
      }
      continue
    }
    const { x, y, r } = it
    if (it.p) {
      ctx.fillStyle = it.k
      ctx.beginPath()
      ctx.arc(x + r * 0.15, y + r * 0.35, r * 0.95, 0, TAU)
      ctx.fill()
      ctx.fillStyle = it.c
      ctx.beginPath()
      for (let j = 0; j < 5; j++) {
        const a = it.a + (j * TAU) / 5
        const px = x + Math.cos(a) * r * 0.52
        const py = y + Math.sin(a) * r * 0.46
        ctx.moveTo(px + r * 0.47, py)
        ctx.arc(px, py, r * 0.47, 0, TAU)
      }
      ctx.fill()
      ctx.fillStyle = it.h
      ctx.beginPath()
      ctx.arc(x - r * 0.1, y - r * 0.12, r * 0.24, 0, TAU)
      ctx.fill()
    } else {
      ctx.fillStyle = it.c
      ctx.beginPath()
      ctx.arc(x, y, r, 0, TAU)
      ctx.fill()
      if (r > 1.6) {
        ctx.fillStyle = it.h
        ctx.beginPath()
        ctx.arc(x - r * 0.3, y - r * 0.35, r * 0.34, 0, TAU)
        ctx.fill()
      }
    }
  }
}

function MeadowCanvas({ layer, seed, colors, className, style }: { layer: MeadowLayer; seed: number; colors: MeadowColors; className?: string; style?: React.CSSProperties }) {
  const ref = React.useRef(null as HTMLCanvasElement | null)
  const [drawn, setDrawn] = React.useState(false)
  const key = colors.flowers.join("") + colors.sky + colors.straw.join("")
  const latest = React.useRef(colors)
  latest.current = colors

  React.useEffect(() => {
    const cv = ref.current
    if (!cv) return
    let last = ""
    let timer = 0
    const draw = () => {
      const w = cv.clientWidth
      const h = cv.clientHeight
      if (!w || !h) return
      const sig = w + "x" + h + key
      if (sig === last) return
      last = sig
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      cv.width = Math.round(w * dpr)
      cv.height = Math.round(h * dpr)
      const ctx = cv.getContext("2d")
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      paintMeadow(ctx, buildMeadow(layer, w, h, seed, latest.current))
      setDrawn(true)
    }
    draw()
    if (typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(() => {
      window.clearTimeout(timer)
      timer = window.setTimeout(draw, last ? 140 : 0)
    })
    ro.observe(cv)
    return () => {
      ro.disconnect()
      window.clearTimeout(timer)
    }
  }, [key, layer, seed])

  return <canvas ref={ref} aria-hidden="true" className={"lml-canvas " + (className || "")} data-drawn={drawn ? "true" : "false"} style={style} />
}

/* ------------------------------------------------------------------ svg pieces */

function useSvgId() {
  return "lml" + React.useId().replace(/[^a-zA-Z0-9_-]/g, "")
}

/** A chrome coin seen at an angle: k narrows the face, side picks which edge shows its reeded rim. */
function Coin({ metal, tint, k = 0.8, side = 1, thick = 0.17, className, style }: { metal: string[]; tint: string; k?: number; side?: 1 | -1; thick?: number; className?: string; style?: React.CSSProperties }) {
  const id = useSvgId()
  const r = 50
  const rx = r * k
  const steps = 16
  const dx = side * thick * r
  const ref = (s: string) => "url(#" + id + s + ")"
  const rim: React.ReactNode[] = []
  for (let i = steps; i >= 1; i--) {
    rim.push(<ellipse key={i} cx={(dx * i) / steps} cy={0} rx={rx} ry={r} fill={ref("r")} stroke={metal[i % 2 ? 1 : 3]} strokeWidth={0.7} strokeDasharray="1.1 1.6" strokeOpacity={0.7} />)
  }
  return (
    <svg viewBox="-64 -58 128 116" className={"lml-svg " + (className || "")} style={style} aria-hidden="true">
      <defs>
        <linearGradient id={id + "f"} x1="0.1" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor={metal[0]} />
          <stop offset="0.2" stopColor={metal[1]} />
          <stop offset="0.42" stopColor={metal[2]} />
          <stop offset="0.53" stopColor={metal[3]} />
          <stop offset="0.66" stopColor={metal[4]} />
          <stop offset="0.84" stopColor={metal[5]} />
          <stop offset="1" stopColor={metal[6]} />
        </linearGradient>
        <linearGradient id={id + "i"} x1="0.9" y1="0" x2="0.15" y2="1">
          <stop offset="0" stopColor={metal[5]} />
          <stop offset="0.35" stopColor={metal[2]} />
          <stop offset="0.6" stopColor={metal[1]} />
          <stop offset="1" stopColor={metal[3]} />
        </linearGradient>
        <linearGradient id={id + "r"} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={metal[4]} />
          <stop offset="0.35" stopColor={metal[3]} />
          <stop offset="0.6" stopColor={metal[1]} />
          <stop offset="1" stopColor={metal[6]} />
        </linearGradient>
        <linearGradient id={id + "g"} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="0.5" stopColor={metal[2]} stopOpacity="0.4" />
          <stop offset="1" stopColor={metal[3]} stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id={id + "m"} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.45" stopColor={tint} stopOpacity="0" />
          <stop offset="1" stopColor={tint} stopOpacity="0.55" />
        </linearGradient>
        <radialGradient id={id + "s"} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      {rim}
      <ellipse rx={rx} ry={r} fill={ref("f")} />
      <ellipse rx={rx * 0.84} ry={r * 0.84} fill={ref("i")} opacity={0.55} />
      <ellipse rx={rx * 0.84} ry={r * 0.84} fill="none" stroke={ref("g")} strokeWidth={2.4} />
      <ellipse rx={rx} ry={r} fill={ref("m")} />
      <ellipse cx={-rx * 0.32} cy={-r * 0.42} rx={rx * 0.42} ry={r * 0.16} fill={ref("s")} transform={"rotate(-32 " + -rx * 0.32 + " " + -r * 0.42 + ")"} />
      <ellipse rx={rx - 0.4} ry={r - 0.4} fill="none" stroke="#ffffff" strokeOpacity={0.65} strokeWidth={0.8} />
    </svg>
  )
}

function Sparkle({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="-12 -12 24 24" width={size} height={size} className={"lml-svg " + (className || "")} aria-hidden="true">
      <path d="M0 -11C1.1 -3.2 3.2 -1.1 11 0C3.2 1.1 1.1 3.2 0 11C-1.1 3.2 -3.2 1.1 -11 0C-3.2 -1.1 -1.1 -3.2 0 -11Z" fill="currentColor" />
    </svg>
  )
}

function Arrow({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className="lml-svg" aria-hidden="true">
      <path d="M2.5 8h10.5M9 3.8 13.2 8 9 12.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** A coneflower: drooping petals around a spiky cone, on a gently curved stem. */
function Coneflower({ pal, className }: { pal: { petal: string[]; stem: string[]; cone: string[] }; className?: string }) {
  const id = useSvgId()
  const cx = 104
  const cy = 108
  const petals: { d: string; front: boolean; o: number }[] = []
  const N = 15
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2 + 0.2
    const ca = Math.cos(t)
    const sa = Math.sin(t)
    const bx = cx + ca * 20
    const by = cy + sa * 7
    const len = 52 + (i % 3) * 5
    const tx = bx + ca * len * 0.92
    const ty = by + 34 + sa * 12 + Math.abs(ca) * 6
    const nx = -(ty - by)
    const ny = tx - bx
    const nl = Math.hypot(nx, ny) || 1
    const w = 7.5
    const ox = (nx / nl) * w
    const oy = (ny / nl) * w
    const mx = (bx + tx) / 2 - ca * 2
    const my = (by + ty) / 2 - 10
    const d =
      "M" + (bx - ox * 0.35).toFixed(1) + " " + (by - oy * 0.35).toFixed(1) +
      "Q" + (mx - ox).toFixed(1) + " " + (my - oy).toFixed(1) + " " + (tx - ox * 0.3).toFixed(1) + " " + (ty - oy * 0.3).toFixed(1) +
      "L" + tx.toFixed(1) + " " + (ty + 2).toFixed(1) +
      "L" + (tx + ox * 0.3).toFixed(1) + " " + (ty + oy * 0.3).toFixed(1) +
      "Q" + (mx + ox).toFixed(1) + " " + (my + oy).toFixed(1) + " " + (bx + ox * 0.35).toFixed(1) + " " + (by + oy * 0.35).toFixed(1) + "Z"
    petals.push({ d, front: sa > -0.15, o: 0.82 + ((i * 7) % 5) * 0.045 })
  }
  const seeds: React.ReactNode[] = []
  for (let i = 0; i < 70; i++) {
    const a = i * 2.39996
    const rr = Math.sqrt(i / 70)
    const x = cx + Math.cos(a) * rr * 22
    const y = cy - 6 + Math.sin(a) * rr * 13 - (1 - rr) * 6
    seeds.push(<path key={i} d={"M" + (x - 1.6).toFixed(1) + " " + (y + 1).toFixed(1) + "L" + x.toFixed(1) + " " + (y - 2.6).toFixed(1) + "L" + (x + 1.6).toFixed(1) + " " + (y + 1).toFixed(1) + "Z"} fill={i % 4 ? pal.cone[0] : pal.cone[1]} opacity={0.6 + rr * 0.4} />)
  }
  return (
    <svg viewBox="0 0 210 380" className={"lml-svg " + (className || "")} aria-hidden="true">
      <defs>
        <linearGradient id={id + "p"} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={pal.petal[0]} />
          <stop offset="0.55" stopColor={pal.petal[1]} />
          <stop offset="1" stopColor={pal.petal[2]} />
        </linearGradient>
        <linearGradient id={id + "b"} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={pal.petal[0]} />
          <stop offset="1" stopColor={pal.petal[1]} />
        </linearGradient>
        <linearGradient id={id + "s"} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={pal.stem[0]} />
          <stop offset="1" stopColor={pal.stem[1]} />
        </linearGradient>
        <radialGradient id={id + "c"} cx="0.42" cy="0.32" r="0.7">
          <stop offset="0" stopColor={pal.cone[0]} />
          <stop offset="0.55" stopColor={pal.cone[1]} />
          <stop offset="1" stopColor={pal.cone[2]} />
        </radialGradient>
      </defs>
      <path d="M100 380C98 300 112 230 106 120" fill="none" stroke={"url(#" + id + "s)"} strokeWidth="5" strokeLinecap="round" />
      <path d="M103 268C82 252 62 254 50 262C68 270 86 272 103 268Z" fill={"url(#" + id + "s)"} opacity="0.9" />
      {petals.filter((p) => !p.front).map((p, i) => <path key={"b" + i} d={p.d} fill={"url(#" + id + "b)"} opacity={p.o * 0.85} />)}
      <ellipse cx={cx} cy={cy - 2} rx={24} ry={17} fill={"url(#" + id + "c)"} />
      {seeds}
      {petals.filter((p) => p.front).map((p, i) => <path key={"f" + i} d={p.d} fill={"url(#" + id + "p)"} opacity={p.o} />)}
    </svg>
  )
}

/** Lavender-clay greek temple. */
function TempleArt({ c }: { c: string[] }) {
  const id = useSvgId()
  const cols = [96, 148, 212, 264]
  return (
    <svg viewBox="0 0 360 270" className="lml-svg lml-art" aria-hidden="true">
      <defs>
        <linearGradient id={id + "col"} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={c[2]} />
          <stop offset="0.12" stopColor={c[0]} />
          <stop offset="0.24" stopColor={c[1]} />
          <stop offset="0.36" stopColor={c[0]} />
          <stop offset="0.5" stopColor={c[1]} />
          <stop offset="0.62" stopColor={c[0]} />
          <stop offset="0.76" stopColor={c[1]} />
          <stop offset="0.88" stopColor={c[2]} />
          <stop offset="1" stopColor={c[3]} />
        </linearGradient>
        <linearGradient id={id + "v"} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c[0]} />
          <stop offset="1" stopColor={c[1]} />
        </linearGradient>
        <linearGradient id={id + "side"} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={c[1]} />
          <stop offset="1" stopColor={c[2]} />
        </linearGradient>
        <radialGradient id={id + "sh"} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={c[3]} stopOpacity="0.45" />
          <stop offset="1" stopColor={c[3]} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="190" cy="250" rx="170" ry="22" fill={"url(#" + id + "sh)"} />
      {/* steps */}
      <path d="M36 236H318L336 224H54Z" fill={c[0]} />
      <path d="M36 236H318V254H36Z" fill={"url(#" + id + "v)"} />
      <path d="M318 236L336 224V242L318 254Z" fill={"url(#" + id + "side)"} />
      <path d="M52 220H302L318 210H68Z" fill={c[0]} />
      <path d="M52 220H302V236H52Z" fill={"url(#" + id + "v)"} />
      <path d="M302 220L318 210V224L302 236Z" fill={"url(#" + id + "side)"} />
      <path d="M66 205H290L304 196H80Z" fill={c[0]} />
      <path d="M66 205H290V220H66Z" fill={"url(#" + id + "v)"} />
      <path d="M290 205L304 196V210L290 220Z" fill={"url(#" + id + "side)"} />
      {/* back wall in shade */}
      <path d="M84 100H290V196H84Z" fill={c[2]} opacity="0.55" />
      {/* columns */}
      {cols.map((x) => (
        <g key={x}>
          <rect x={x - 12} y={104} width={24} height={92} fill={"url(#" + id + "col)"} />
          <rect x={x - 16} y={188} width={32} height={8} rx={1.5} fill={c[0]} />
          <rect x={x - 16} y={193} width={32} height={3} fill={c[2]} opacity="0.6" />
          <rect x={x - 17} y={98} width={34} height={7} rx={2} fill={c[0]} />
          <rect x={x - 14} y={104} width={28} height={3} fill={c[2]} opacity="0.55" />
        </g>
      ))}
      {/* entablature */}
      <path d="M60 80H300L316 70H76Z" fill={c[0]} />
      <path d="M60 80H300V98H60Z" fill={"url(#" + id + "v)"} />
      <path d="M300 80L316 70V88L300 98Z" fill={"url(#" + id + "side)"} />
      <path d="M60 92H300" stroke={c[2]} strokeWidth="1.2" opacity="0.6" />
      {/* pediment */}
      <path d="M58 74L180 22L302 74Z" fill={c[0]} />
      <path d="M78 70L180 32L282 70Z" fill={c[1]} />
      <path d="M302 74L318 66V70L302 78Z" fill={"url(#" + id + "side)"} />
      <path d="M58 74L180 22L302 74" fill="none" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="1.4" />
    </svg>
  )
}

/** Stacked clay blocks with a code glyph. */
function BlocksArt({ c, accent }: { c: string[]; accent: string }) {
  const cube = (x: number, y: number, s: number, key: string, glyph?: boolean) => {
    const h = s * 0.5
    return (
      <g key={key}>
        <path d={"M" + x + " " + y + "l" + s + " " + -h + "l" + s + " " + h + "l" + -s + " " + h + "Z"} fill={c[0]} />
        <path d={"M" + x + " " + y + "l" + s + " " + h + "v" + s * 1.05 + "l" + -s + " " + -h + "Z"} fill={c[1]} />
        <path d={"M" + (x + s) + " " + (y + h) + "l" + s + " " + -h + "v" + s * 1.05 + "l" + -s + " " + h + "Z"} fill={c[2]} />
        {glyph ? (
          <g transform={"matrix(1 0.5 0 1 " + (x + s * 0.18) + " " + (y + s * 0.78) + ")"}>
            <text x={0} y={0} fontSize={s * 0.42} fontFamily="ui-monospace,SFMono-Regular,Menlo,monospace" fontWeight="700" fill={accent} opacity="0.85">{"</>"}</text>
          </g>
        ) : null}
      </g>
    )
  }
  return (
    <svg viewBox="0 0 360 270" className="lml-svg lml-art" aria-hidden="true">
      <ellipse cx="185" cy="246" rx="150" ry="20" fill={c[3]} opacity="0.25" />
      {cube(90, 112, 90, "a", true)}
      {cube(272, 150, 56, "b")}
      {cube(136, 66, 44, "c")}
      <g className="lml-floaty">{cube(286, 52, 24, "d")}</g>
      <g className="lml-floaty lml-floaty--b">{cube(40, 64, 20, "e")}</g>
      <g className="lml-floaty lml-floaty--c">
 <rect x="22" y="128" width="58" height="26" rx="13" fill={c[0]} />
        <text x="51" y="146" textAnchor="middle" fontSize="13" fontFamily="ui-monospace,SFMono-Regular,Menlo,monospace" fontWeight="700" fill={accent}>{"{ }"}</text>
      </g>
    </svg>
  )
}

/** A stack of coins with a sprout growing out of the top. */
function VaultArt({ metal, leaf }: { metal: string[]; leaf: string[] }) {
  const id = useSvgId()
  const coin = (x: number, y: number, key: string) => (
    <g key={key}>
      <path d={"M" + (x - 46) + " " + y + "v10a46 13 0 0 0 92 0v-10Z"} fill={"url(#" + id + "e)"} />
      <path d={"M" + (x - 46) + " " + y + "v10a46 13 0 0 0 92 0v-10Z"} fill="none" stroke={metal[3]} strokeOpacity="0.5" strokeWidth="0.8" strokeDasharray="1 1.8" />
      <ellipse cx={x} cy={y} rx={46} ry={13} fill={"url(#" + id + "t)"} />
      <ellipse cx={x} cy={y} rx={38} ry={10} fill="none" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="1" />
    </g>
  )
  const stackA: React.ReactNode[] = []
  for (let i = 0; i < 7; i++) stackA.push(coin(150, 226 - i * 12, "a" + i))
  const stackB: React.ReactNode[] = []
  for (let i = 0; i < 4; i++) stackB.push(coin(250, 232 - i * 12, "b" + i))
  return (
    <svg viewBox="0 0 360 270" className="lml-svg lml-art" aria-hidden="true">
      <defs>
        <linearGradient id={id + "e"} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={metal[3]} />
          <stop offset="0.3" stopColor={metal[1]} />
          <stop offset="0.55" stopColor={metal[0]} />
          <stop offset="0.8" stopColor={metal[2]} />
          <stop offset="1" stopColor={metal[3]} />
        </linearGradient>
        <linearGradient id={id + "t"} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={metal[0]} />
          <stop offset="0.45" stopColor={metal[1]} />
          <stop offset="0.7" stopColor={metal[2]} />
          <stop offset="1" stopColor={metal[5]} />
        </linearGradient>
        <linearGradient id={id + "l"} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={leaf[0]} />
          <stop offset="1" stopColor={leaf[1]} />
        </linearGradient>
      </defs>
      <ellipse cx="195" cy="246" rx="140" ry="18" fill={metal[3]} opacity="0.22" />
      {stackA}
      {stackB}
      <g className="lml-sprout">
        <path d="M150 154C150 130 148 112 152 92" fill="none" stroke={leaf[1]} strokeWidth="3.4" strokeLinecap="round" />
        <path d="M151 120C128 118 112 102 110 84C132 86 148 100 151 120Z" fill={"url(#" + id + "l)"} />
        <path d="M152 104C170 96 186 78 188 58C166 62 152 80 152 104Z" fill={"url(#" + id + "l)"} />
        <path d="M151 119C138 110 126 99 117 89M152 103C162 92 172 80 182 66" fill="none" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="1" />
      </g>
      <g className="lml-twinkle" fill={metal[0]}>
        <path d="M232 150l2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" />
        <path d="M92 168l1.5 4.5 4.5 1.5-4.5 1.5-1.5 4.5-1.5-4.5-4.5-1.5 4.5-1.5Z" />
      </g>
    </svg>
  )
}

function BackerGlyph({ g }: { g: MeadowBackerGlyph }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" className="lml-svg" aria-hidden="true">
      {g === "ring" ? <><circle cx="10" cy="10" r="7" {...p} /><circle cx="10" cy="10" r="2.6" fill="currentColor" /></> : null}
      {g === "bars" ? <><path d="M4 16V7M8 16V4M12 16V9M16 16V6" {...p} /></> : null}
      {g === "wave" ? <path d="M2 11c2.5-4 5-4 7.5 0s5 4 8.5-1" {...p} /> : null}
      {g === "leaf" ? <><path d="M4 16C4 8 9 4 16 4c0 7-4 12-12 12Z" {...p} /><path d="M4 16 11 9" {...p} /></> : null}
      {g === "hex" ? <path d="M10 2.5 16.5 6.2v7.6L10 17.5 3.5 13.8V6.2Z" {...p} /> : null}
      {g === "spark" ? <path d="M10 2c.6 4.6 2.4 6.4 8 8-5.6 1.6-7.4 3.4-8 8-.6-4.6-2.4-6.4-8-8 5.6-1.6 7.4-3.4 8-8Z" fill="currentColor" /> : null}
      {g === "arch" ? <><path d="M4 17V10a6 6 0 0 1 12 0v7" {...p} /><path d="M8 17v-6a2 2 0 0 1 4 0v6" {...p} /></> : null}
    </svg>
  )
}

function SocialIcon({ kind }: { kind: MeadowSocial["kind"] }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" className="lml-svg" aria-hidden="true" fill="currentColor">
      {kind === "x" ? <path d="M17.8 3h3.1l-6.8 7.7 8 10.3h-6.3l-4.9-6.4L5.3 21H2.2l7.3-8.3L1.8 3h6.4l4.4 5.9Zm-1.1 16.2h1.7L7.4 4.7H5.6Z" /> : null}
      {kind === "discord" ? <path d="M19.6 5.3A17 17 0 0 0 15.4 4l-.5 1a15.6 15.6 0 0 0-5.8 0L8.6 4a17 17 0 0 0-4.2 1.3C1.7 9.3 1 13.2 1.3 17a17 17 0 0 0 5.2 2.6l1.1-1.7c-.6-.2-1.2-.5-1.7-.9l.4-.3a12.2 12.2 0 0 0 11.4 0l.4.3c-.5.4-1.1.7-1.7.9l1.1 1.7a17 17 0 0 0 5.2-2.6c.4-4.4-.7-8.3-3.1-11.7ZM8.7 14.7c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1Zm6.6 0c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1Z" /> : null}
      {kind === "github" ? <path d="M12 1.5a10.5 10.5 0 0 0-3.3 20.5c.5.1.7-.2.7-.5v-1.8c-2.9.6-3.5-1.4-3.5-1.4-.5-1.2-1.2-1.5-1.2-1.5-.9-.6.1-.6.1-.6 1 .1 1.6 1.1 1.6 1.1.9 1.6 2.5 1.1 3.1.9.1-.7.4-1.1.7-1.4-2.3-.3-4.8-1.2-4.8-5.2 0-1.1.4-2.1 1.1-2.8-.1-.3-.5-1.4.1-2.8 0 0 .9-.3 2.9 1.1a10 10 0 0 1 5.2 0c2-1.4 2.9-1.1 2.9-1.1.6 1.4.2 2.5.1 2.8.7.7 1.1 1.7 1.1 2.8 0 4-2.5 4.9-4.8 5.2.4.3.7 1 .7 1.9v2.9c0 .3.2.6.7.5A10.5 10.5 0 0 0 12 1.5Z" /> : null}
      {kind === "telegram" ? <path d="M21.4 3.6 2.9 10.8c-1.3.5-1.2 1.2-.2 1.5l4.7 1.5 1.8 5.6c.2.6.4.8.9.8.4 0 .6-.2.9-.5l2.3-2.2 4.7 3.5c.9.5 1.5.2 1.7-.8l3.1-14.6c.3-1.3-.5-1.9-1.4-1.5ZM9.7 14.1l8.3-7.6-6.9 8.6-.3 3.1Z" /> : null}
    </svg>
  )
}

/* ------------------------------------------------------------------ defaults */

const DEFAULT_HERO = {
  title: "Where Money Grows",
  subtitle: "A programmable, utility-driven stable token designed for native value accrual and seamless integration into DeFi.",
  action: { label: "Try it now", href: "#calculator" },
}

const DEFAULT_FEATURES: MeadowFeature[] = [
  { title: "Capital that grows", body: "Earn passive income as your stablecoins are deployed into high-performing DeFi protocols.", visual: "flower" },
  { title: "Always liquid,\nalways stable", body: "Stay fully dollar-pegged with instant access to your funds — no lockups or delays.", visual: "peg" },
  { title: "100%\nhands-free", body: "No need to manage strategies manually. It works in the background for you.", visual: "autopilot" },
]

const DEFAULT_BACKERS: MeadowBacker[] = [
  { name: "Halcyon Labs", glyph: "ring" },
  { name: "KESTREL", glyph: "bars" },
  { name: "Meridian", glyph: "wave" },
  { name: "Aster & Vale", glyph: "leaf" },
  { name: "NorthHex", glyph: "hex" },
  { name: "OPALINE", glyph: "spark" },
  { name: "Tessel", glyph: "arch" },
]

const DEFAULT_USE_CASES: MeadowUseCase[] = [
  {
    id: "business",
    title: "Business",
    body: "Boost user engagement by offering a secure, fiat-backed stablecoin with high yields, allowing your customers to earn effortlessly on your platform.",
    action: { label: "Learn more", href: "#calculator" },
    art: "temple",
  },
  {
    id: "developers",
    title: "Developers",
    body: "Drop a yield-bearing dollar into any app with a few lines of code. A composable token, audited contracts and SDKs for every major chain.",
    action: { label: "Read the docs", href: "#faq" },
    art: "blocks",
  },
  {
    id: "treasury",
    title: "Treasury",
    body: "Put idle reserves to work without leaving the dollar. Same-day redemptions, on-chain proof of reserves and reporting your auditors will like.",
    action: { label: "Talk to us", href: "#join" },
    art: "vault",
  },
]

const DEFAULT_FAQS: MeadowFaq[] = [
  { q: "Where does the yield come from?", a: "Reserves are allocated across short-dated treasuries and over-collateralised lending markets. Net returns flow back to holders automatically — the number of tokens in your wallet grows, the price stays at one dollar." },
  { q: "Is it always worth one dollar?", a: "Every token is backed one-to-one by dollar-denominated reserves held with regulated custodians, and can be redeemed for a dollar at any time. Reserves are attested monthly and visible on-chain." },
  { q: "Can I withdraw at any time?", a: "Yes. There are no lockups, cliffs or exit fees. Swap on-chain instantly, or redeem to a bank account in one business day." },
  { q: "Which chains are supported?", a: "Ethereum, Base, Arbitrum and Solana at launch, with native bridging between them. More networks follow as the beta grows." },
  { q: "What does it cost?", a: "Holding is free. A small performance fee is taken from yield before it is distributed; the APY you see is already net of it." },
]

const DEFAULT_COLUMNS: MeadowColumn[] = [
  { title: "Product", links: [{ label: "How it works", href: "#product" }, { label: "Use cases", href: "#use-cases" }, { label: "Calculator", href: "#calculator" }, { label: "FAQ", href: "#faq" }] },
  { title: "Developers", links: [{ label: "Documentation", href: "#developers" }, { label: "SDKs", href: "#developers" }, { label: "Audits", href: "#faq" }, { label: "Status", href: "#join" }] },
  { title: "Company", links: [{ label: "About", href: "#product" }, { label: "Careers", href: "#join" }, { label: "Press kit", href: "#join" }, { label: "Contact", href: "#join" }] },
]

const DEFAULT_SOCIALS: MeadowSocial[] = [
  { kind: "x", href: "#", label: "X" },
  { kind: "discord", href: "#", label: "Discord" },
  { kind: "telegram", href: "#", label: "Telegram" },
  { kind: "github", href: "#", label: "GitHub" },
]

const DEFAULT_LEGAL: MeadowLink[] = [
  { label: "Privacy", href: "#" },
  { label: "Terms", href: "#" },
  { label: "Disclosures", href: "#" },
]

const DURATIONS = [
  { m: 6, label: "6M" },
  { m: 12, label: "1Y" },
  { m: 36, label: "3Y" },
  { m: 60, label: "5Y" },
]
const CHART_POINTS = 61

/* ------------------------------------------------------------------ css */

const LML_CSS = `
.lml-root{--lml-bg:#f3f3f6;--lml-card:#ffffff;--lml-text:#16141f;--lml-soft:#5c5969;--lml-faint:#8f8c9c;--lml-line:rgba(22,20,31,.09);--lml-deep:var(--lml-p-deep);--lml-ondeep:#f4f2ff;--lml-ondeep-soft:rgba(244,242,255,.64);--lml-wash:var(--lml-p-wash);--lml-wash2:var(--lml-p-wash2);--lml-accent:var(--lml-p-accent);--lml-btn:var(--lml-p-deep);--lml-onbtn:#ffffff;--lml-sky0:var(--lml-p-sky0);--lml-sky1:var(--lml-p-sky1);--lml-sky2:var(--lml-p-sky2);--lml-herotext:#1b1830;--lml-glow:rgba(255,255,255,.92);--lml-sans:"Plus Jakarta Sans","Manrope","Inter","SF Pro Display",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;position:relative;isolation:isolate;overflow-x:clip;background:var(--lml-bg);color:var(--lml-text);font-family:var(--lml-sans);line-height:1.5;-webkit-font-smoothing:antialiased;transition:background-color .5s ease,color .5s ease}
.lml-root[data-theme="dark"],.dark .lml-root[data-theme="auto"]{--lml-bg:#0d0c14;--lml-card:#16141f;--lml-text:#efedf7;--lml-soft:#aaa7b9;--lml-faint:#7c798b;--lml-line:rgba(255,255,255,.09);--lml-deep:color-mix(in oklab,var(--lml-p-deep) 80%,#ffffff 6%);--lml-wash:color-mix(in oklab,var(--lml-p-accent) 16%,#14121e);--lml-wash2:color-mix(in oklab,var(--lml-p-accent) 8%,#100e18);--lml-btn:color-mix(in oklab,var(--lml-p-wash2) 92%,var(--lml-p-accent));--lml-onbtn:var(--lml-p-deep);--lml-sky0:var(--lml-p-nsky0);--lml-sky1:var(--lml-p-nsky1);--lml-sky2:var(--lml-p-nsky2);--lml-herotext:#f3f1ff;--lml-glow:color-mix(in oklab,var(--lml-p-accent) 45%,transparent)}
.lml-root :where(h1,h2,h3,h4,p,ul,ol,li,figure,dl,dd){margin:0;padding:0}
.lml-root :where(ul,ol){list-style:none}
.lml-root :where(a){color:inherit;text-decoration:none}
.lml-root :where(button,input){font:inherit;color:inherit;background:none;border:0;margin:0;padding:0;border-radius:0}
.lml-root :where(button){cursor:pointer;text-align:inherit}
.lml-root :where(a,button,input,[tabindex]):focus-visible{outline:2px solid var(--lml-accent);outline-offset:3px;border-radius:8px}
.lml-svg{display:block;max-width:none;overflow:visible}
.lml-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.lml-wrap{width:100%;max-width:1240px;margin:0 auto;padding:0 clamp(16px,3.4vw,40px);box-sizing:border-box}
.lml-sec{position:relative;scroll-margin-top:84px}
.lml-kicker{font-size:12.5px;font-weight:500;color:var(--lml-soft);letter-spacing:.01em}
.lml-h2{font-weight:400;font-size:clamp(34px,4.6vw,56px);line-height:1.04;letter-spacing:-.035em;color:var(--lml-text);text-wrap:balance}
.lml-lede{font-size:14.5px;line-height:1.55;color:var(--lml-soft);max-width:30em;text-wrap:pretty}
.lml-pre{opacity:0;transform:translateY(22px)}
.lml-rv{transition:opacity .9s cubic-bezier(.2,.7,.2,1),transform .9s cubic-bezier(.2,.7,.2,1)}

.lml-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:8px;height:38px;padding:0 20px;border-radius:999px;background:var(--lml-btn);color:var(--lml-onbtn);font-size:13px;font-weight:500;letter-spacing:-.005em;white-space:nowrap;overflow:hidden;transition:transform .25s ease,box-shadow .3s ease}
.lml-btn::after{content:"";position:absolute;inset:0;border-radius:inherit;background:linear-gradient(110deg,transparent 30%,rgba(255,255,255,.28) 50%,transparent 70%);transform:translateX(-110%);transition:transform .7s cubic-bezier(.2,.7,.2,1)}
.lml-btn:hover{transform:translateY(-1px);box-shadow:0 12px 26px -14px var(--lml-btn)}
.lml-btn:hover::after{transform:translateX(110%)}
.lml-btn:active{transform:translateY(0) scale(.98)}
.lml-btn--lg{height:46px;padding:0 26px;font-size:14px}

/* nav */
.lml-nav{position:sticky;top:0;z-index:40;padding:10px 0;transition:background-color .35s,box-shadow .35s,-webkit-backdrop-filter .35s,backdrop-filter .35s}
.lml-nav[data-scrolled="true"]{background:color-mix(in oklab,var(--lml-bg) 80%,transparent);-webkit-backdrop-filter:blur(14px) saturate(1.3);backdrop-filter:blur(14px) saturate(1.3);box-shadow:0 1px 0 var(--lml-line)}
.lml-navin{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;height:48px}
.lml-brand{display:inline-flex;align-items:center;gap:9px;font-size:15px;font-weight:600;letter-spacing:-.02em;color:var(--lml-text);justify-self:start}
.lml-brand .lml-svg{color:var(--lml-text);transition:transform .7s cubic-bezier(.3,1.6,.5,1)}
.lml-brand:hover .lml-svg{transform:rotate(90deg) scale(1.1)}
.lml-links{display:flex;gap:6px}
.lml-link{position:relative;padding:8px 12px;border-radius:999px;font-size:13px;color:var(--lml-text);opacity:.82;transition:opacity .2s,background-color .25s}
.lml-link:hover{opacity:1;background:color-mix(in oklab,var(--lml-text) 6%,transparent)}
.lml-link[aria-current="true"]{opacity:1}
.lml-link[aria-current="true"]::after{content:"";position:absolute;left:50%;bottom:2px;width:4px;height:4px;margin-left:-2px;border-radius:50%;background:var(--lml-accent)}
.lml-navend{justify-self:end;display:flex;align-items:center;gap:8px}
.lml-menu{display:none;width:38px;height:38px;border-radius:999px;align-items:center;justify-content:center;background:color-mix(in oklab,var(--lml-text) 6%,transparent)}
.lml-menu span{display:block;width:16px;height:1.6px;background:currentColor;border-radius:2px;transition:transform .3s}
.lml-menu span+span{margin-top:4px}
.lml-menu[aria-expanded="true"] span:first-child{transform:translateY(2.8px) rotate(45deg)}
.lml-menu[aria-expanded="true"] span:last-child{transform:translateY(-2.8px) rotate(-45deg)}
.lml-drawer{display:none}
@media (max-width:860px){
  .lml-navin{grid-template-columns:1fr auto}
  .lml-links{display:none}
  .lml-menu{display:inline-flex;flex-direction:column}
  .lml-navend .lml-btn{height:36px;padding:0 14px;font-size:12.5px}
  .lml-drawer{display:grid;gap:2px;overflow:hidden;max-height:0;opacity:0;transition:max-height .45s cubic-bezier(.2,.7,.2,1),opacity .3s,padding .3s;padding:0 4px}
  .lml-drawer[data-open="true"]{max-height:360px;opacity:1;padding:10px 4px 14px}
  .lml-drawer a{padding:12px 10px;border-radius:12px;font-size:15px}
  .lml-drawer a:hover{background:color-mix(in oklab,var(--lml-text) 6%,transparent)}
}

/* hero */
.lml-hero{padding-top:6px}
.lml-stage{--lml-px:0;--lml-py:0;position:relative;height:clamp(500px,48vw,680px);border-radius:clamp(18px,2vw,26px);overflow:hidden;background:radial-gradient(56% 46% at 50% 40%,var(--lml-glow),transparent 72%),linear-gradient(180deg,var(--lml-sky0) 0%,var(--lml-sky1) 40%,var(--lml-sky2) 70%,var(--lml-sky2) 100%);isolation:isolate}
.lml-canvas{position:absolute;display:block;max-width:none;pointer-events:none;opacity:0;transition:opacity 1.1s ease}
.lml-canvas[data-drawn="true"]{opacity:1}
.lml-layer{left:-40px;right:-40px;top:0;bottom:-30px;width:calc(100% + 80px);height:calc(100% + 30px)}
.lml-l0{transform:translate3d(calc(var(--lml-px) * -8px),calc(var(--lml-py) * -4px),0)}
.lml-l1{transform:translate3d(calc(var(--lml-px) * -16px),calc(var(--lml-py) * -8px),0)}
.lml-l2{transform:translate3d(calc(var(--lml-px) * -30px),calc(var(--lml-py) * -12px),0)}
.lml-coins{position:absolute;inset:0;transform:translate3d(calc(var(--lml-px) * -22px),calc(var(--lml-py) * -10px),0)}
.lml-heroimg{position:absolute;inset:0;width:100%;height:100%;max-width:none;object-fit:cover}
.lml-coin{position:absolute;display:block;transform:translate(-50%,-50%);width:clamp(96px,16.5vw,236px);aspect-ratio:128/116;-webkit-tap-highlight-color:transparent}
.lml-coin .lml-coinbody{position:absolute;inset:0;animation:lml-bob 7s ease-in-out infinite;transform-style:preserve-3d}
.lml-coin .lml-svg{width:100%;height:100%;transition:transform .5s cubic-bezier(.3,1.4,.5,1);filter:drop-shadow(0 18px 18px rgba(30,20,70,.22))}
.lml-coin:hover .lml-svg{transform:rotate(-5deg) scale(1.03)}
.lml-coin[data-spin="true"] .lml-svg{animation:lml-flip 1.1s cubic-bezier(.3,.9,.3,1)}
.lml-coin--a{left:31%;top:69%}
.lml-coin--a .lml-coinbody{transform:rotate(-14deg)}
.lml-coin--b{left:85%;top:59%}
.lml-coin--b .lml-coinbody{animation-delay:-3s}
.lml-coin--b .lml-svg{transform:rotate(12deg)}
.lml-coin--b:hover .lml-svg{transform:rotate(6deg) scale(1.03)}
.lml-coinpop{position:absolute;left:50%;top:6%;transform:translate(-50%,0);padding:5px 10px;border-radius:999px;background:var(--lml-card);color:var(--lml-text);font-size:12px;font-weight:600;white-space:nowrap;box-shadow:0 10px 24px -12px rgba(20,10,60,.4);pointer-events:none;animation:lml-pop 1.6s cubic-bezier(.2,.7,.2,1) forwards}
.lml-pollen{position:absolute;inset:0;pointer-events:none;z-index:3}
.lml-pollen i{position:absolute;bottom:18%;width:4px;height:4px;border-radius:50%;background:#ffffff;box-shadow:0 0 8px 2px rgba(255,255,255,.7);opacity:0;animation:lml-rise linear infinite}
.lml-root[data-theme="dark"] .lml-pollen i,.dark .lml-root[data-theme="auto"] .lml-pollen i{background:#fff6c8;box-shadow:0 0 10px 3px rgba(255,236,150,.55)}
.lml-herocopy{position:absolute;left:0;right:0;top:clamp(36px,7%,64px);z-index:4;display:flex;flex-direction:column;align-items:center;text-align:center;padding:0 20px;color:var(--lml-herotext);pointer-events:none}
.lml-herocopy > *{pointer-events:auto}
.lml-herocopy .lml-sparkle{margin-bottom:clamp(10px,1.6vw,18px);transition:transform .8s cubic-bezier(.3,1.6,.5,1)}
.lml-herocopy .lml-sparkle:hover{transform:rotate(180deg) scale(1.15)}
.lml-h1{font-weight:400;font-size:clamp(38px,5.6vw,72px);line-height:1;letter-spacing:-.045em;text-wrap:balance}
.lml-herosub{margin-top:clamp(12px,1.4vw,18px);max-width:25em;font-size:clamp(13.5px,1.15vw,15.5px);line-height:1.45;opacity:.82;text-wrap:balance}
.lml-herocopy .lml-btn{margin-top:clamp(18px,2vw,26px)}
.lml-root[data-theme="dark"] .lml-herocopy .lml-btn,.dark .lml-root[data-theme="auto"] .lml-herocopy .lml-btn{background:#f3f1ff;color:#16132a}
@media (max-width:640px){
  .lml-coin--a{left:22%;top:72%}
  .lml-coin--b{left:82%;top:66%}
}

/* intro */
.lml-root[data-intro="play"] .lml-l0,.lml-root[data-intro="play"] .lml-l1,.lml-root[data-intro="play"] .lml-l2,.lml-root[data-intro="play"] .lml-coins{animation:lml-grow 1.6s cubic-bezier(.16,.84,.3,1) both}
.lml-root[data-intro="play"] .lml-l1{animation-delay:.12s}
.lml-root[data-intro="play"] .lml-coins{animation-delay:.3s;animation-duration:1.9s}
.lml-root[data-intro="play"] .lml-l2{animation-delay:.22s}
.lml-root[data-intro="play"] .lml-herocopy > *{animation:lml-up 1.1s cubic-bezier(.2,.7,.2,1) both}
.lml-root[data-intro="play"] .lml-herocopy > :nth-child(2){animation-delay:.1s}
.lml-root[data-intro="play"] .lml-herocopy > :nth-child(3){animation-delay:.2s}
.lml-root[data-intro="play"] .lml-herocopy > :nth-child(4){animation-delay:.3s}

/* what is */
.lml-what{padding:clamp(64px,8vw,104px) 0 clamp(28px,3vw,40px)}
.lml-whatgrid{display:grid;grid-template-columns:1.25fr 1fr;gap:28px 48px;align-items:start}
.lml-whatgrid .lml-btn{margin-top:22px}
.lml-statement{font-size:clamp(18px,1.75vw,23px);line-height:1.3;letter-spacing:-.02em;color:var(--lml-text);max-width:19em;padding-top:8px;text-wrap:pretty}
.lml-statement em{font-style:normal;color:var(--lml-accent)}

/* features */
.lml-feats{display:grid;grid-template-columns:2.15fr 1fr 1fr;gap:12px;padding-bottom:clamp(40px,5vw,64px)}
.lml-feat{position:relative;min-height:clamp(220px,19vw,262px);border-radius:20px;padding:22px 22px 20px;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;isolation:isolate;transition:transform .45s cubic-bezier(.2,.7,.2,1),box-shadow .45s}
.lml-feat:hover{transform:translateY(-4px)}
.lml-feat h3{position:relative;z-index:2;font-size:clamp(17px,1.5vw,20px);font-weight:400;line-height:1.22;letter-spacing:-.02em;white-space:pre-line}
.lml-feat p{position:relative;z-index:2;font-size:12.5px;line-height:1.45;max-width:24em}
.lml-feat--bloom{background:linear-gradient(160deg,var(--lml-wash2) 0%,var(--lml-wash) 100%);color:var(--lml-text)}
.lml-feat--bloom p{color:var(--lml-soft);max-width:19em}
.lml-feat--bloom:hover{box-shadow:0 30px 50px -36px var(--lml-accent)}
.lml-feat--deep{background:var(--lml-deep);color:var(--lml-ondeep)}
.lml-feat--deep p{color:var(--lml-ondeep-soft)}
.lml-feat--deep:hover{box-shadow:0 30px 50px -30px var(--lml-deep)}
.lml-root[data-theme="dark"] .lml-feat--deep,.dark .lml-root[data-theme="auto"] .lml-feat--deep{box-shadow:inset 0 0 0 1px rgba(255,255,255,.07)}
.lml-cardmeadow{left:-10px;right:-10px;bottom:-6px;width:calc(100% + 20px);height:46%;z-index:1}
.lml-flower{position:absolute;right:16%;bottom:8%;height:92%;width:auto;aspect-ratio:210/380;z-index:0;transform-origin:50% 100%;animation:lml-sway 6s ease-in-out infinite}
.lml-feat--bloom:hover .lml-flower{animation-duration:2.4s}
.lml-cardcoin{position:absolute;right:31%;bottom:9%;width:clamp(78px,9vw,116px);aspect-ratio:128/116;z-index:0;transform:rotate(-10deg)}
.lml-cardcoin .lml-svg{width:100%;height:100%}
.lml-viz{position:absolute;right:20px;top:46%;transform:translateY(-50%);z-index:1;opacity:.55;transition:opacity .4s}
.lml-feat:hover .lml-viz{opacity:1}
.lml-peg{width:120px;height:62px}
.lml-peg .lml-pegline{stroke-dasharray:240;stroke-dashoffset:0;animation:lml-draw 2.2s .4s cubic-bezier(.2,.7,.2,1) both}
.lml-feat:hover .lml-peg .lml-pegline{animation:lml-redraw 1.4s cubic-bezier(.2,.7,.2,1) both}
.lml-pegdot{animation:lml-pulse 2s ease-in-out infinite}
.lml-auto{display:flex;flex-direction:column;align-items:flex-end;gap:10px}
.lml-switch{position:relative;width:46px;height:26px;border-radius:999px;background:rgba(255,255,255,.16);transition:background-color .35s}
.lml-switch::after{content:"";position:absolute;left:3px;top:3px;width:20px;height:20px;border-radius:50%;background:#ffffff;transition:transform .45s cubic-bezier(.3,1.5,.5,1)}
.lml-switch[aria-checked="true"]{background:var(--lml-accent)}
.lml-switch[aria-checked="true"]::after{transform:translateX(20px)}
.lml-orbit{width:64px;height:64px;animation:lml-spin 9s linear infinite}
.lml-orbit[data-on="false"]{animation-play-state:paused;opacity:.4}
.lml-autolabel{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--lml-ondeep-soft)}
@media (max-width:980px){.lml-feats{grid-template-columns:1fr 1fr}.lml-feat--bloom{grid-column:1 / -1}}
@media (max-width:560px){
  .lml-feats{grid-template-columns:1fr}
  .lml-whatgrid{grid-template-columns:1fr}
  .lml-feat--bloom{min-height:330px}
  .lml-feat--bloom p{max-width:14em}
  .lml-flower{right:6%;height:74%}
  .lml-cardcoin{right:30%;bottom:6%}
  .lml-cardmeadow{height:40%}
}

/* backers */
.lml-backers{display:grid;grid-template-columns:200px 1fr;gap:20px 40px;align-items:center;padding-top:8px;padding-bottom:clamp(64px,8vw,104px)}
.lml-backers p{font-size:11px;line-height:1.45;color:var(--lml-faint);max-width:16em}
.lml-logos{display:flex;flex-wrap:wrap;justify-content:space-between;gap:18px 26px}
.lml-logo{display:inline-flex;align-items:center;gap:7px;color:var(--lml-faint);font-size:13.5px;white-space:nowrap;opacity:.9;transition:color .3s,opacity .3s,transform .3s}
.lml-logo:hover{color:var(--lml-text);opacity:1;transform:translateY(-1px)}
.lml-logo:nth-child(2n){font-weight:700;letter-spacing:.08em;font-size:12px}
.lml-logo:nth-child(3n){font-style:italic;font-weight:500;letter-spacing:-.02em}
.lml-logo:nth-child(4n){font-weight:300;letter-spacing:.02em}
@media (max-width:760px){.lml-backers{grid-template-columns:1fr}.lml-logos{justify-content:flex-start}}

/* use cases */
.lml-uc{display:grid;grid-template-columns:1fr 1fr;gap:32px clamp(32px,5vw,72px);padding-bottom:clamp(72px,9vw,120px)}
.lml-uchead .lml-h2{margin:8px 0 14px}
.lml-tabs{display:flex;flex-direction:column;margin-top:clamp(28px,4vw,48px);border-top:1px solid var(--lml-line)}
.lml-tab{position:relative;display:grid;grid-template-columns:34px 1fr auto;align-items:center;gap:8px;padding:16px 4px;border-bottom:1px solid var(--lml-line);color:var(--lml-faint);transition:color .3s,padding .4s cubic-bezier(.2,.7,.2,1)}
.lml-tab:hover{color:var(--lml-text)}
.lml-tab[aria-selected="true"]{color:var(--lml-text);padding-left:10px}
.lml-tabn{font-size:11px;font-variant-numeric:tabular-nums}
.lml-tabt{font-size:clamp(18px,1.6vw,22px);letter-spacing:-.025em}
.lml-tab .lml-svg{opacity:0;transform:translateX(-6px);transition:opacity .3s,transform .3s}
.lml-tab[aria-selected="true"] .lml-svg,.lml-tab:hover .lml-svg{opacity:1;transform:none}
.lml-tabbar{position:absolute;left:0;bottom:-1px;height:1.5px;width:100%;background:var(--lml-accent);transform-origin:left;transform:scaleX(0)}
.lml-tab[aria-selected="true"] .lml-tabbar{animation:lml-bar 8s linear forwards}
.lml-uc[data-paused="true"] .lml-tabbar{animation-play-state:paused}
.lml-cards{display:grid}
.lml-card{grid-area:1 / 1;position:relative;display:flex;flex-direction:column;min-height:clamp(420px,36vw,500px);border-radius:22px;background:var(--lml-card);overflow:hidden;opacity:0;transform:translateY(14px) scale(.985);visibility:hidden;transition:opacity .55s cubic-bezier(.2,.7,.2,1),transform .55s cubic-bezier(.2,.7,.2,1),visibility 0s .55s}
.lml-card[data-on="true"]{opacity:1;transform:none;visibility:visible;transition-delay:0s}
.lml-cardtext{padding:22px 22px 0;position:relative;z-index:2}
.lml-card h3{font-size:clamp(20px,1.8vw,24px);font-weight:400;letter-spacing:-.025em}
.lml-card p{margin-top:12px;font-size:13px;line-height:1.5;color:var(--lml-soft);max-width:27em}
.lml-more{display:inline-flex;align-items:center;gap:10px;margin-top:16px;font-size:12px;color:var(--lml-text)}
.lml-more span{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:color-mix(in oklab,var(--lml-text) 6%,transparent);transition:transform .35s cubic-bezier(.3,1.5,.5,1),background-color .3s}
.lml-more:hover span{transform:translateX(3px);background:var(--lml-wash)}
.lml-artbox{position:relative;flex:1;min-height:250px;margin-top:8px;background:linear-gradient(180deg,transparent 0%,var(--lml-wash2) 55%,var(--lml-wash) 100%)}
.lml-art{position:absolute;left:50%;bottom:16%;width:min(86%,400px);height:auto;transform:translateX(-50%);z-index:0}
.lml-card[data-on="true"] .lml-art{animation:lml-rise-in 1s cubic-bezier(.2,.7,.2,1) both}
.lml-artmeadow{left:-10px;right:-10px;bottom:-4px;width:calc(100% + 20px);height:40%;z-index:1}
.lml-floaty{animation:lml-float 5s ease-in-out infinite}
.lml-floaty--b{animation-delay:-2s;animation-duration:6s}
.lml-floaty--c{animation-delay:-1s;animation-duration:7s}
.lml-sprout{transform-origin:150px 154px;animation:lml-sway 5s ease-in-out infinite}
.lml-twinkle{animation:lml-pulse 2.4s ease-in-out infinite}
@media (max-width:860px){.lml-uc{grid-template-columns:1fr}}

/* calculator */
.lml-calc{padding-bottom:clamp(72px,9vw,120px)}
.lml-calcbox{position:relative;display:grid;grid-template-columns:minmax(0,.92fr) minmax(0,1.08fr);gap:clamp(24px,4vw,56px);padding:clamp(22px,3.4vw,44px);border-radius:26px;background:var(--lml-deep);color:var(--lml-ondeep);overflow:hidden;isolation:isolate}
.lml-calcbox::before{content:"";position:absolute;right:-12%;top:-30%;width:60%;aspect-ratio:1;border-radius:50%;background:radial-gradient(closest-side,color-mix(in oklab,var(--lml-p-accent) 55%,transparent),transparent);opacity:.5;z-index:-1}
.lml-calcbox .lml-kicker{color:var(--lml-ondeep-soft)}
.lml-calcbox .lml-h2{color:var(--lml-ondeep);font-size:clamp(30px,3.6vw,46px);margin:8px 0 12px}
.lml-calcbox .lml-lede{color:var(--lml-ondeep-soft)}
.lml-field{margin-top:26px}
.lml-fieldhead{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
.lml-fieldhead label,.lml-fieldlabel{display:block;font-size:12px;color:var(--lml-ondeep-soft)}
.lml-amount{font-size:clamp(26px,3vw,36px);letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.lml-range{-webkit-appearance:none;appearance:none;width:100%;height:28px;margin-top:6px;background:transparent;cursor:pointer;--lml-fill:50%}
.lml-range::-webkit-slider-runnable-track{height:4px;border-radius:4px;background:linear-gradient(90deg,var(--lml-p-wash) 0,var(--lml-p-wash) var(--lml-fill),rgba(255,255,255,.16) var(--lml-fill))}
.lml-range::-moz-range-track{height:4px;border-radius:4px;background:linear-gradient(90deg,var(--lml-p-wash) 0,var(--lml-p-wash) var(--lml-fill),rgba(255,255,255,.16) var(--lml-fill))}
.lml-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:22px;height:22px;margin-top:-9px;border-radius:50%;background:#ffffff;box-shadow:0 0 0 6px color-mix(in oklab,var(--lml-p-wash) 30%,transparent),0 4px 10px rgba(0,0,0,.3);transition:box-shadow .25s}
.lml-range::-moz-range-thumb{width:22px;height:22px;border:0;border-radius:50%;background:#ffffff;box-shadow:0 0 0 6px color-mix(in oklab,var(--lml-p-wash) 30%,transparent),0 4px 10px rgba(0,0,0,.3)}
.lml-range:hover::-webkit-slider-thumb{box-shadow:0 0 0 9px color-mix(in oklab,var(--lml-p-wash) 34%,transparent),0 4px 10px rgba(0,0,0,.3)}
.lml-range:focus-visible{outline:none}
.lml-range:focus-visible::-webkit-slider-thumb{box-shadow:0 0 0 3px var(--lml-deep),0 0 0 5px #ffffff}
.lml-ticks{display:flex;justify-content:space-between;font-size:10.5px;color:var(--lml-ondeep-soft)}
.lml-seg{display:inline-flex;padding:4px;margin-top:10px;border-radius:999px;background:rgba(255,255,255,.08)}
.lml-seg button{height:32px;min-width:48px;padding:0 14px;border-radius:999px;font-size:12.5px;color:var(--lml-ondeep-soft);transition:background-color .3s,color .3s}
.lml-seg button:hover{color:var(--lml-ondeep)}
.lml-seg button[aria-pressed="true"]{background:#ffffff;color:var(--lml-p-deep)}
.lml-row{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.lml-toggle{display:inline-flex;align-items:center;gap:10px;font-size:12.5px;color:var(--lml-ondeep-soft)}
.lml-results{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:28px}
.lml-result{padding:14px 16px;border-radius:16px;background:rgba(255,255,255,.06)}
.lml-result dt{font-size:11.5px;color:var(--lml-ondeep-soft)}
.lml-result dd{margin-top:4px;font-size:clamp(18px,1.9vw,24px);letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.lml-result--hi dd{color:var(--lml-p-wash)}
.lml-compare{margin-top:14px;font-size:12.5px;color:var(--lml-ondeep-soft)}
.lml-compare b{color:var(--lml-ondeep);font-weight:600}
.lml-chartbox{position:relative;display:flex;flex-direction:column;min-height:320px;padding:18px 18px 12px;border-radius:20px;background:rgba(255,255,255,.04);box-shadow:inset 0 0 0 1px rgba(255,255,255,.07)}
.lml-legend{display:flex;gap:16px;flex-wrap:wrap;font-size:11.5px;color:var(--lml-ondeep-soft)}
.lml-legend span{display:inline-flex;align-items:center;gap:7px}
.lml-legend i{display:inline-block;width:14px;height:3px;border-radius:2px;background:var(--lml-p-wash)}
.lml-legend i.lml-dash{background:repeating-linear-gradient(90deg,rgba(255,255,255,.55) 0 4px,transparent 4px 7px)}
.lml-chart{position:relative;flex:1;min-height:240px;margin-top:10px;touch-action:pan-y;cursor:crosshair}
.lml-chart .lml-svg{position:absolute;inset:0;width:100%;height:100%}
.lml-tip{position:absolute;top:0;transform:translateX(-50%);padding:8px 10px;border-radius:12px;background:#ffffff;color:var(--lml-p-deep);font-size:11.5px;line-height:1.35;white-space:nowrap;pointer-events:none;box-shadow:0 12px 26px -12px rgba(0,0,0,.5)}
.lml-tip b{display:block;font-size:13px;font-variant-numeric:tabular-nums}
.lml-ylab{position:absolute;left:6px;transform:translateY(-130%);font-size:10.5px;font-variant-numeric:tabular-nums;color:var(--lml-ondeep-soft);pointer-events:none}
.lml-ylab--lo{left:auto;right:6px;transform:translateY(40%)}
.lml-xaxis{display:flex;justify-content:space-between;margin-top:8px;font-size:10.5px;color:var(--lml-ondeep-soft)}
.lml-disc{margin-top:18px;font-size:10.5px;color:var(--lml-ondeep-soft);opacity:.8}
@media (max-width:900px){.lml-calcbox{grid-template-columns:1fr}}

/* faq */
.lml-faq{display:grid;grid-template-columns:1fr 1.35fr;gap:32px clamp(32px,6vw,96px);padding-bottom:clamp(72px,9vw,120px)}
.lml-faqhead .lml-h2{margin:8px 0 14px}
.lml-qa{border-top:1px solid var(--lml-line)}
.lml-qa:last-child{border-bottom:1px solid var(--lml-line)}
.lml-q{display:flex;width:100%;align-items:center;justify-content:space-between;gap:20px;padding:20px 2px;font-size:clamp(15px,1.3vw,17px);letter-spacing:-.015em;color:var(--lml-text)}
.lml-plus{position:relative;flex:none;width:30px;height:30px;border-radius:50%;background:color-mix(in oklab,var(--lml-text) 6%,transparent);transition:background-color .3s,transform .45s cubic-bezier(.3,1.4,.5,1)}
.lml-plus::before,.lml-plus::after{content:"";position:absolute;left:50%;top:50%;width:11px;height:1.5px;margin:-.75px 0 0 -5.5px;background:currentColor;border-radius:2px;transition:transform .35s}
.lml-plus::after{transform:rotate(90deg)}
.lml-q[aria-expanded="true"] .lml-plus{transform:rotate(180deg);background:var(--lml-wash)}
.lml-q[aria-expanded="true"] .lml-plus::after{transform:rotate(0deg)}
.lml-a{display:grid;grid-template-rows:0fr;transition:grid-template-rows .45s cubic-bezier(.2,.7,.2,1)}
.lml-a[data-open="true"]{grid-template-rows:1fr}
.lml-a > div{overflow:hidden}
.lml-a p{padding:0 48px 20px 2px;font-size:13.5px;line-height:1.6;color:var(--lml-soft)}
@media (max-width:860px){.lml-faq{grid-template-columns:1fr}}

/* join */
.lml-join{padding-bottom:clamp(40px,5vw,64px)}
.lml-joinbox{position:relative;height:clamp(460px,42vw,560px);border-radius:26px;overflow:hidden;isolation:isolate;background:radial-gradient(56% 50% at 50% 34%,var(--lml-glow),transparent 72%),linear-gradient(180deg,var(--lml-sky0) 0%,var(--lml-sky1) 44%,var(--lml-sky2) 76%)}
.lml-joinbox .lml-coin{width:clamp(80px,11vw,150px)}
.lml-joinbox .lml-coin--a{left:14%;top:78%}
.lml-joinbox .lml-coin--b{left:77%;top:75%}
.lml-joincopy{position:absolute;left:0;right:0;top:clamp(36px,8%,64px);z-index:4;display:flex;flex-direction:column;align-items:center;text-align:center;padding:0 20px;color:var(--lml-herotext)}
.lml-joincopy .lml-h2{color:inherit}
.lml-joincopy p{margin-top:12px;max-width:32em;font-size:14.5px;line-height:1.5;opacity:.8}
.lml-form{display:flex;gap:6px;width:min(100%,430px);margin-top:24px;padding:6px;border-radius:999px;background:color-mix(in oklab,var(--lml-card) 82%,transparent);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);box-shadow:0 18px 40px -26px rgba(20,10,60,.5),inset 0 0 0 1px var(--lml-line)}
.lml-form input{flex:1;min-width:0;padding:0 16px;font-size:14px;color:var(--lml-text)}
.lml-form input::placeholder{color:var(--lml-faint)}
.lml-form input:focus-visible{outline:none}
.lml-form:focus-within{box-shadow:0 18px 40px -26px rgba(20,10,60,.5),inset 0 0 0 1.5px var(--lml-accent)}
.lml-form[data-state="error"]{animation:lml-shake .45s}
.lml-formnote{min-height:20px;margin-top:10px;font-size:12px;opacity:.85}
.lml-formnote[data-state="error"]{color:#c0365a;opacity:1}
.lml-done{display:inline-flex;align-items:center;gap:10px;margin-top:24px;padding:12px 20px;border-radius:999px;background:var(--lml-card);color:var(--lml-text);font-size:14px;box-shadow:0 18px 40px -26px rgba(20,10,60,.5);animation:lml-up .7s cubic-bezier(.2,.7,.2,1) both}
.lml-done .lml-svg{color:var(--lml-accent)}
.lml-root[data-theme="dark"] .lml-formnote[data-state="error"],.dark .lml-root[data-theme="auto"] .lml-formnote[data-state="error"]{color:#ff8fb0}

/* footer */
.lml-foot{padding:clamp(40px,5vw,64px) 0 28px}
.lml-footgrid{display:grid;grid-template-columns:1.4fr repeat(3,minmax(0,1fr));gap:32px}
.lml-foot .lml-brand{font-size:17px}
.lml-tagline{margin-top:14px;max-width:22em;font-size:13px;line-height:1.55;color:var(--lml-soft)}
.lml-socials{display:flex;gap:8px;margin-top:18px}
.lml-socials a{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;background:var(--lml-card);color:var(--lml-soft);box-shadow:inset 0 0 0 1px var(--lml-line);transition:color .25s,transform .3s cubic-bezier(.3,1.5,.5,1)}
.lml-socials a:hover{color:var(--lml-text);transform:translateY(-2px)}
.lml-col h4{font-size:12px;font-weight:500;color:var(--lml-faint)}
.lml-col ul{display:grid;gap:9px;margin-top:14px}
.lml-col a{font-size:13.5px;color:var(--lml-text);opacity:.85;transition:opacity .2s}
.lml-col a:hover{opacity:1;text-decoration:underline;text-underline-offset:3px}
.lml-word{position:relative;margin-top:clamp(36px,5vw,56px);font-size:clamp(72px,17vw,232px);font-weight:500;line-height:.82;letter-spacing:-.06em;text-align:center;color:transparent;background:linear-gradient(180deg,var(--lml-wash) 0%,transparent 92%);-webkit-background-clip:text;background-clip:text;user-select:none;white-space:nowrap}
.lml-bar{display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;padding-top:18px;border-top:1px solid var(--lml-line);font-size:12px;color:var(--lml-faint)}
.lml-bar nav{display:flex;gap:18px}
.lml-bar a:hover{color:var(--lml-text)}
@media (max-width:860px){.lml-footgrid{grid-template-columns:1fr 1fr}.lml-footgrid > :first-child{grid-column:1 / -1}}

@keyframes lml-bob{0%,100%{translate:0 0}50%{translate:0 -7px}}
@keyframes lml-flip{0%{transform:rotateY(0) scale(1)}40%{transform:rotateY(400deg) scale(1.12) translateY(-16px)}100%{transform:rotateY(720deg) scale(1)}}
@keyframes lml-pop{0%{opacity:0;transform:translate(-50%,10px) scale(.9)}20%{opacity:1;transform:translate(-50%,-6px) scale(1)}75%{opacity:1}100%{opacity:0;transform:translate(-50%,-34px)}}
@keyframes lml-rise{0%{opacity:0;transform:translate(0,0)}15%{opacity:.9}85%{opacity:.5}100%{opacity:0;transform:translate(26px,-260px)}}
@keyframes lml-grow{from{opacity:0;transform:translate3d(0,60px,0)}}
@keyframes lml-up{from{opacity:0;transform:translateY(18px)}}
@keyframes lml-sway{0%,100%{transform:rotate(-1.6deg)}50%{transform:rotate(1.8deg)}}
@keyframes lml-draw{from{stroke-dashoffset:240}}
@keyframes lml-redraw{from{stroke-dashoffset:240}}
@keyframes lml-pulse{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes lml-spin{to{transform:rotate(360deg)}}
@keyframes lml-bar{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes lml-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes lml-rise-in{from{opacity:0;transform:translate(-50%,24px)}}
@keyframes lml-shake{0%,100%{transform:none}20%{transform:translateX(-8px)}40%{transform:translateX(7px)}60%{transform:translateX(-5px)}80%{transform:translateX(3px)}}
@media (prefers-reduced-motion:reduce){
  .lml-root *,.lml-root *::before,.lml-root *::after{animation:none !important;transition:none !important}
  .lml-pollen{display:none}
}
`

/* ------------------------------------------------------------------ hooks */

const useIsoLayoutEffect = typeof window === "undefined" ? React.useEffect : React.useLayoutEffect

function useReducedMotion() {
  const [reduced, setReduced] = React.useState(false)
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const on = () => setReduced(mq.matches)
    on()
    mq.addEventListener?.("change", on)
    return () => mq.removeEventListener?.("change", on)
  }, [])
  return reduced
}

/** Whether the page is dark: forced by `theme`, or a `.dark` class on an ancestor. */
function useDark(root: { current: HTMLElement | null }, theme: string) {
  const [dark, setDark] = React.useState(theme === "dark")
  React.useEffect(() => {
    if (theme !== "auto") {
      setDark(theme === "dark")
      return
    }
    const check = () => setDark(!!root.current?.parentElement?.closest(".dark"))
    check()
    if (typeof MutationObserver === "undefined") return
    const mo = new MutationObserver(check)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"], subtree: true })
    return () => mo.disconnect()
  }, [theme, root])
  return dark
}

/* ------------------------------------------------------------------ parts */

function HeroCoin({ variant, metal, tint, apy, reduced }: { variant: "a" | "b"; metal: string[]; tint: string; apy: number; reduced: boolean }) {
  const [spin, setSpin] = React.useState(0)
  const flip = () => setSpin((n) => n + 1)
  return (
    <button
      type="button"
      className={"lml-coin lml-coin--" + variant}
      data-spin={spin > 0 && !reduced ? "true" : "false"}
      aria-label={"Flip the coin — earning " + apy.toFixed(2) + "% APY"}
      onClick={flip}
      onAnimationEnd={(e) => {
        if ((e.target as HTMLElement).tagName.toLowerCase() === "svg") setSpin(0)
      }}
    >
      <span className="lml-coinbody">
        <Coin key={spin} metal={metal} tint={tint} k={variant === "a" ? 0.82 : 0.66} side={variant === "a" ? 1 : -1} thick={variant === "a" ? 0.14 : 0.2} />
      </span>
      {spin > 0 ? <span key={"p" + spin} className="lml-coinpop">{"+" + apy.toFixed(2) + "% APY"}</span> : null}
    </button>
  )
}

function Pollen({ seed, count }: { seed: number; count: number }) {
  const dots = React.useMemo(() => {
    const rnd = mulberry32(seed)
    const out: React.CSSProperties[] = []
    for (let i = 0; i < count; i++) {
      const size = 2 + rnd() * 3
      out.push({ left: (4 + rnd() * 92).toFixed(1) + "%", bottom: (10 + rnd() * 26).toFixed(1) + "%", width: size, height: size, animationDuration: (8 + rnd() * 8).toFixed(1) + "s", animationDelay: (-rnd() * 14).toFixed(1) + "s" })
    }
    return out
  }, [seed, count])
  return (
    <div className="lml-pollen" aria-hidden="true">
      {dots.map((s, i) => <i key={i} style={s} />)}
    </div>
  )
}

function PegViz() {
  const pts: string[] = []
  for (let i = 0; i <= 24; i++) {
    const y = 30 + Math.sin(i * 1.7) * (i < 5 ? 3 : 1.2) * Math.cos(i * 0.6)
    pts.push((i * 5).toFixed(1) + " " + y.toFixed(1))
  }
  return (
    <svg viewBox="0 -2 120 64" className="lml-svg lml-peg" aria-hidden="true">
      <path d="M0 30H120" stroke="rgba(255,255,255,.28)" strokeDasharray="2 3" />
      <text x="0" y="16" fontSize="9" fill="rgba(255,255,255,.6)">$1.00</text>
      <path className="lml-pegline" d={"M" + pts.join("L")} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle className="lml-pegdot" cx="120" cy="30" r="3" fill="currentColor" />
    </svg>
  )
}

function AutoViz() {
  const [on, setOn] = React.useState(true)
  return (
    <div className="lml-auto">
      <button type="button" role="switch" aria-checked={on} aria-label="Auto-compound" className="lml-switch" onClick={() => setOn((v) => !v)} />
      <span className="lml-autolabel">{on ? "Auto · on" : "Auto · off"}</span>
      <svg viewBox="-32 -32 64 64" className="lml-svg lml-orbit" data-on={on ? "true" : "false"} aria-hidden="true">
        <circle r="24" fill="none" stroke="rgba(255,255,255,.22)" strokeDasharray="2 4" />
        <circle r="13" fill="none" stroke="rgba(255,255,255,.14)" />
        <circle cx="24" cy="0" r="3.4" fill="currentColor" />
        <circle cx="-12" cy="20.8" r="2.4" fill="currentColor" opacity=".7" />
        <circle cx="0" cy="-13" r="2" fill="currentColor" opacity=".55" />
      </svg>
    </div>
  )
}

/* ------------------------------------------------------------------ component */

export default function LilacMeadowLanding({
  brand = "Florin",
  tokenName = "USD Florin",
  ticker = "USDF",
  logo,
  nav,
  cta = { label: "Launch BETA", href: "#join" },
  hero,
  intro,
  features = DEFAULT_FEATURES,
  backersLabel = "Backed by the best companies and visionary angels.",
  backers = DEFAULT_BACKERS,
  useCasesCopy,
  useCases = DEFAULT_USE_CASES,
  calculator,
  faqCopy,
  faqs = DEFAULT_FAQS,
  join,
  onJoin,
  tagline,
  columns = DEFAULT_COLUMNS,
  socials = DEFAULT_SOCIALS,
  legal = DEFAULT_LEGAL,
  copyright,
  palette = "lilac",
  theme = "auto",
  animateIn = true,
  height = "100svh",
  className = "",
}: LilacMeadowLandingProps) {
  const root = React.useRef(null as HTMLDivElement | null)
  const stage = React.useRef(null as HTMLDivElement | null)
  const emailRef = React.useRef(null as HTMLInputElement | null)
  const reduced = useReducedMotion()
  const dark = useDark(root, theme)
  const pal = resolvePalette(palette)

  const heroCopy = { ...DEFAULT_HERO, ...hero }
  const introCopy = {
    title: "What is " + tokenName + "?",
    body: tokenName + " is a yield-bearing stablecoin that helps your capital grow while staying pegged to the U.S. dollar.",
    action: { label: "Explore now", href: "#features" },
    ...intro,
  }
  const ucCopy = { kicker: tokenName + " in Action", title: "Use cases", body: tokenName + " offers a variety of use cases for developers, businesses and treasuries seeking secure and profitable stablecoin integrations.", ...useCasesCopy }
  const calc = {
    kicker: "Yield calculator",
    title: "Watch your dollars bloom",
    body: "Drag to see how a deposit grows at today's rate, next to an average savings account.",
    apy: 5.12,
    benchmarkApy: 0.45,
    benchmarkLabel: "Savings account",
    defaultDeposit: 10000,
    disclaimer: "Illustrative only. Rates are variable and not guaranteed. Not financial advice.",
    ...calculator,
  }
  const faqHead = { kicker: "FAQ", title: "Questions, answered", body: "Everything you need to know before planting your first dollar. Still curious? We're one message away.", ...faqCopy }
  const joinCopy = { title: "Plant your first dollar", body: "Join the beta and be among the first to earn with " + tokenName + ".", placeholder: "you@company.com", action: "Join the beta", success: "You're on the list — we'll be in touch soon.", ...join }
  const navItems = nav ?? [
    { label: tokenName, href: "#product" },
    { label: "Business", href: "#business" },
    { label: "Treasury", href: "#treasury" },
    { label: "Developers", href: "#developers" },
    { label: "Join us", href: "#join" },
  ]
  const ucIds = useCases.map((u) => u.id)
  const mark = logo ?? <Sparkle size={18} />

  const flowers = dark ? pal.nightFlowers : pal.flowers
  const skyEdge = dark ? pal.nightSky[2] : pal.sky[2]
  const meadowColors = { flowers, sky: skyEdge, straw: dark ? NIGHT_STRAW : STRAW }
  const cardColors = { flowers, sky: dark ? "#1b1828" : pal.wash, straw: dark ? NIGHT_STRAW : STRAW }
  const metal = dark ? pal.metal.map((c) => mix(c, pal.nightSky[1], 0.38)) : pal.metal
  const tint = flowers[2]
  const clay = dark
    ? [mix(pal.wash2, pal.nightSky[1], 0.25), mix(pal.wash, pal.nightSky[1], 0.4), mix(pal.flowers[3], pal.nightSky[1], 0.45), mix(pal.flowers[2], "#000000", 0.35)]
    : ["#ffffff", mix(pal.wash2, pal.wash, 0.6), mix(pal.wash, pal.flowers[3], 0.45), mix(pal.flowers[3], pal.flowers[2], 0.5)]
  const flowerPal = {
    petal: [mix(pal.flowers[2], pal.flowers[1], 0.35), pal.flowers[3], mix(pal.flowers[4], pal.flowers[3], 0.3)],
    stem: dark ? ["#4f5d33", "#2b3419"] : ["#7d8f49", "#46562a"],
    cone: ["#f2b45c", "#a8521f", "#4c2311"],
  }
  const leaf = dark ? ["#6f8a45", "#3a4a22"] : ["#a7c46a", "#5c7a32"]

  const [scrolled, setScrolled] = React.useState(false)
  const [active, setActive] = React.useState(null as string | null)
  const [menu, setMenu] = React.useState(false)
  const [tab, setTab] = React.useState(0)
  const [ucPaused, setUcPaused] = React.useState(false)
  const [faqOpen, setFaqOpen] = React.useState(0 as number | null)
  const [introPlay, setIntroPlay] = React.useState(false)

  // calculator
  const [deposit, setDeposit] = React.useState(calc.defaultDeposit)
  const [months, setMonths] = React.useState(12)
  const [compound, setCompound] = React.useState(true)
  const [hover, setHover] = React.useState(null as number | null)
  const target = React.useMemo(
    () => ({ tok: growthSeries(deposit, calc.apy, months, compound, CHART_POINTS), ben: growthSeries(deposit, calc.benchmarkApy, months, compound, CHART_POINTS) }),
    [deposit, months, compound, calc.apy, calc.benchmarkApy]
  )
  const [series, setSeries] = React.useState(target)
  const seriesRef = React.useRef(series)
  seriesRef.current = series

  // join
  const [email, setEmail] = React.useState("")
  const [joinState, setJoinState] = React.useState("idle" as "idle" | "error" | "sending" | "done")
  const [joinNote, setJoinNote] = React.useState("")

  useIsoLayoutEffect(() => {
    if (animateIn && !reduced) setIntroPlay(true)
  }, [animateIn, reduced])

  React.useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8)
    on()
    window.addEventListener("scroll", on, { passive: true })
    return () => window.removeEventListener("scroll", on)
  }, [])

  // Which section is under the middle of the viewport.
  React.useEffect(() => {
    const el = root.current
    if (!el || typeof IntersectionObserver === "undefined") return
    const secs = Array.from(el.querySelectorAll("[data-sec]"))
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) if (e.isIntersecting) setActive((e.target as HTMLElement).dataset.sec ?? null)
      },
      { rootMargin: "-45% 0px -50% 0px" }
    )
    secs.forEach((s) => io.observe(s))
    return () => io.disconnect()
  }, [])

  // Reveal on scroll. Only what starts below the fold is hidden, and only once
  // JS runs, so server-rendered and captured pages are never blank.
  useIsoLayoutEffect(() => {
    const el = root.current
    if (!el || reduced || typeof IntersectionObserver === "undefined") return
    const items = Array.from(el.querySelectorAll("[data-rv]")) as HTMLElement[]
    const below = items.filter((n) => n.getBoundingClientRect().top > window.innerHeight * 0.92)
    below.forEach((n) => n.classList.add("lml-pre"))
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          if (!e.isIntersecting) continue
          const n = e.target as HTMLElement
          n.classList.add("lml-rv")
          n.classList.remove("lml-pre")
          io.unobserve(n)
        }
      },
      { rootMargin: "0px 0px -8% 0px" }
    )
    below.forEach((n) => io.observe(n))
    return () => io.disconnect()
  }, [reduced])

  // Tween the chart toward its new shape.
  React.useEffect(() => {
    if (reduced) {
      setSeries(target)
      return
    }
    const from = seriesRef.current
    const t0 = performance.now()
    let raf = 0
    const step = (now: number) => {
      const k = clamp((now - t0) / 520, 0, 1)
      const e = 1 - Math.pow(1 - k, 3)
      setSeries({
        tok: target.tok.map((v, i) => (from.tok[i] ?? v) + (v - (from.tok[i] ?? v)) * e),
        ben: target.ben.map((v, i) => (from.ben[i] ?? v) + (v - (from.ben[i] ?? v)) * e),
      })
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, reduced])

  const onHeroMove = (e: React.PointerEvent) => {
    if (reduced || e.pointerType === "touch") return
    const el = stage.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty("--lml-px", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3))
    el.style.setProperty("--lml-py", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3))
  }
  const onHeroLeave = () => {
    const el = stage.current
    if (!el) return
    el.style.setProperty("--lml-px", "0")
    el.style.setProperty("--lml-py", "0")
  }

  const scrollToSec = (sec: string) => {
    const el = root.current?.querySelector('[data-sec="' + sec + '"]')
    if (el) el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" })
  }

  /** In-page links scroll instead of jumping; "#<use case id>" opens that tab. */
  const onLink = (e: React.MouseEvent, href: string) => {
    setMenu(false)
    if (!href.startsWith("#") || href.length < 2) return
    const uc = useCaseFromHref(href, ucIds)
    const sec = uc ? "use-cases" : href.slice(1)
    if (!root.current?.querySelector('[data-sec="' + sec + '"]')) return
    e.preventDefault()
    if (uc) {
      setTab(ucIds.indexOf(uc))
      setUcPaused(true)
    }
    scrollToSec(sec)
    if (sec === "join") window.setTimeout(() => emailRef.current?.focus({ preventScroll: true }), reduced ? 0 : 700)
  }

  const isCurrent = (href: string) => {
    const uc = useCaseFromHref(href, ucIds)
    if (uc) return active === "use-cases" && ucIds[tab] === uc
    return active !== null && href === "#" + active
  }

  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    const n = nextIndex(i, e.key, useCases.length)
    if (n === null) return
    e.preventDefault()
    setTab(n)
    setUcPaused(true)
    const btn = root.current?.querySelector('[data-tab="' + n + '"]') as HTMLElement | null
    btn?.focus()
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEmail(email)) {
      setJoinState("error")
      setJoinNote("That doesn't look like an email address.")
      return
    }
    setJoinState("sending")
    setJoinNote("")
    try {
      if (onJoin) await onJoin(email.trim())
      setJoinState("done")
    } catch {
      setJoinState("error")
      setJoinNote("Something went wrong. Please try again.")
    }
  }

  // chart geometry
  const CW = 600
  const CH = 260
  const lo = deposit * 0.995
  const hi = Math.max(series.tok[series.tok.length - 1], series.ben[series.ben.length - 1], deposit * 1.002)
  const sx = (i: number) => (i / (CHART_POINTS - 1)) * CW
  const sy = (v: number) => CH - 14 - ((v - lo) / Math.max(1e-6, hi - lo)) * (CH - 44)
  const linePath = (arr: number[]) => arr.map((v, i) => (i ? "L" : "M") + sx(i).toFixed(1) + " " + sy(v).toFixed(1)).join("")
  const tokPath = linePath(series.tok)
  const benPath = linePath(series.ben)
  const areaPath = tokPath + "L" + CW + " " + CH + "L0 " + CH + "Z"
  const finalTok = target.tok[target.tok.length - 1]
  const finalBen = target.ben[target.ben.length - 1]
  const earnedTok = finalTok - deposit
  const earnedBen = finalBen - deposit
  const times = earnedBen > 0 ? earnedTok / earnedBen : 0
  const onChartMove = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setHover(Math.round(clamp((e.clientX - r.left) / r.width, 0, 1) * (CHART_POINTS - 1)))
  }
  const chartId = "lmlchart" + React.useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const fill = (amountToSlider(deposit) * 100).toFixed(1) + "%"

  const palVars = {
    "--lml-p-deep": pal.deep,
    "--lml-p-wash": pal.wash,
    "--lml-p-wash2": pal.wash2,
    "--lml-p-accent": pal.accent,
    "--lml-p-sky0": pal.sky[0],
    "--lml-p-sky1": pal.sky[1],
    "--lml-p-sky2": pal.sky[2],
    "--lml-p-nsky0": pal.nightSky[0],
    "--lml-p-nsky1": pal.nightSky[1],
    "--lml-p-nsky2": pal.nightSky[2],
    minHeight: height,
  } as React.CSSProperties

  const art = (u: MeadowUseCase) => {
    const kind = u.art ?? "temple"
    if (kind === "blocks") return <BlocksArt c={clay} accent={pal.accent} />
    if (kind === "vault") return <VaultArt metal={metal} leaf={leaf} />
    return <TempleArt c={clay} />
  }

  return (
    <div
      ref={root}
      className={"lml-root " + className}
      data-theme={theme}
      data-intro={introPlay ? "play" : "off"}
      style={palVars}
    >
      <style>{LML_CSS}</style>

      {/* ---------------------------------------------------------------- nav */}
      <header className="lml-nav" data-scrolled={scrolled || menu ? "true" : "false"}>
        <div className="lml-wrap">
          <div className="lml-navin">
            <a href="#product" className="lml-brand" onClick={(e) => { e.preventDefault(); setMenu(false); window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" }) }}>
              {mark}
              <span>{brand}</span>
            </a>
            <nav className="lml-links" aria-label="Primary">
              {navItems.map((l) => (
                <a key={l.label + l.href} href={l.href} className="lml-link" aria-current={isCurrent(l.href) ? "true" : undefined} onClick={(e) => onLink(e, l.href)}>
                  {l.label}
                </a>
              ))}
            </nav>
            <div className="lml-navend">
              <a href={cta.href} className="lml-btn" onClick={(e) => onLink(e, cta.href)}>{cta.label}</a>
              <button type="button" className="lml-menu" aria-expanded={menu} aria-label={menu ? "Close menu" : "Open menu"} onClick={() => setMenu((v) => !v)}>
                <span />
                <span />
              </button>
            </div>
          </div>
          <nav className="lml-drawer" data-open={menu ? "true" : "false"} aria-label="Mobile" aria-hidden={!menu}>
            {navItems.map((l) => (
              <a key={l.label + l.href} href={l.href} tabIndex={menu ? 0 : -1} onClick={(e) => onLink(e, l.href)}>{l.label}</a>
            ))}
          </nav>
        </div>
      </header>

      {/* ---------------------------------------------------------------- hero */}
      <section className="lml-hero lml-sec" data-sec="top" aria-label="Introduction">
        <div className="lml-wrap">
          <div ref={stage} className="lml-stage" onPointerMove={onHeroMove} onPointerLeave={onHeroLeave}>
            {heroCopy.image ? (
              <img className="lml-heroimg" src={heroCopy.image} alt={heroCopy.imageAlt ?? ""} style={{ maxWidth: "none" }} />
            ) : (
              <>
                <MeadowCanvas className="lml-layer lml-l0" layer={HERO_LAYERS[0]} seed={11} colors={meadowColors} />
                <MeadowCanvas className="lml-layer lml-l1" layer={HERO_LAYERS[1]} seed={23} colors={meadowColors} />
                <div className="lml-coins">
                  <HeroCoin variant="a" metal={metal} tint={tint} apy={calc.apy} reduced={reduced} />
                  <HeroCoin variant="b" metal={metal} tint={tint} apy={calc.apy} reduced={reduced} />
                </div>
                <MeadowCanvas className="lml-layer lml-l2" layer={HERO_LAYERS[2]} seed={37} colors={meadowColors} />
                {reduced ? null : <Pollen seed={5} count={16} />}
              </>
            )}
            <div className="lml-herocopy">
              <Sparkle size={26} className="lml-sparkle" />
              <h1 className="lml-h1">
                {heroCopy.title.split("\n").map((line, i) => (
                  <React.Fragment key={i}>
                    {i ? <br /> : null}
                    {line}
                  </React.Fragment>
                ))}
              </h1>
              <p className="lml-herosub">{heroCopy.subtitle}</p>
              <a href={heroCopy.action.href} className="lml-btn" onClick={(e) => onLink(e, heroCopy.action.href)}>{heroCopy.action.label}</a>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- what is */}
      <section className="lml-sec lml-what" data-sec="product" aria-labelledby="lml-what-h">
        <div className="lml-wrap lml-whatgrid" data-rv>
          <div>
            <h2 id="lml-what-h" className="lml-h2">{introCopy.title}</h2>
            <a href={introCopy.action.href} className="lml-btn" onClick={(e) => onLink(e, introCopy.action.href)}>{introCopy.action.label}</a>
          </div>
          <p className="lml-statement">{introCopy.body}</p>
        </div>
      </section>

      {/* ---------------------------------------------------------------- features */}
      <section className="lml-sec" data-sec="features" aria-label="Features">
        <div className="lml-wrap lml-feats">
          {features.map((f, i) => {
            const v = f.visual ?? (i === 0 ? "flower" : i === 1 ? "peg" : "autopilot")
            if (v === "flower") {
              return (
                <article key={f.title + i} className="lml-feat lml-feat--bloom" data-rv>
                  <h3>{f.title}</h3>
                  <Coneflower pal={flowerPal} className="lml-flower" />
                  <div className="lml-cardcoin">
                    <Coin metal={metal} tint={tint} k={0.7} side={-1} thick={0.2} />
                  </div>
                  <MeadowCanvas className="lml-cardmeadow" layer={CARD_LAYER} seed={41 + i} colors={cardColors} />
                  <p>{f.body}</p>
                </article>
              )
            }
            return (
              <article key={f.title + i} className="lml-feat lml-feat--deep" data-rv>
                <h3>{f.title}</h3>
                <div className="lml-viz" style={{ color: pal.wash }}>{v === "peg" ? <PegViz /> : <AutoViz />}</div>
                <p>{f.body}</p>
              </article>
            )
          })}
        </div>
      </section>

      {/* ---------------------------------------------------------------- backers */}
      {backers.length ? (
        <section className="lml-sec" data-sec="backers" aria-label="Backers">
          <div className="lml-wrap lml-backers" data-rv>
            <p>{backersLabel}</p>
            <ul className="lml-logos">
              {backers.map((b) => (
                <li key={b.name}>
                  {b.href ? (
                    <a href={b.href} className="lml-logo"><BackerGlyph g={b.glyph ?? "ring"} />{b.name}</a>
                  ) : (
                    <span className="lml-logo"><BackerGlyph g={b.glyph ?? "ring"} />{b.name}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------------------- use cases */}
      <section className="lml-sec" data-sec="use-cases" aria-labelledby="lml-uc-h">
        <div
          className="lml-wrap lml-uc"
          data-paused={ucPaused ? "true" : "false"}
          onPointerEnter={() => setUcPaused(true)}
          onPointerLeave={() => setUcPaused(false)}
        >
          <div className="lml-uchead" data-rv>
            <p className="lml-kicker">{ucCopy.kicker}</p>
            <h2 id="lml-uc-h" className="lml-h2">{ucCopy.title}</h2>
            <p className="lml-lede">{ucCopy.body}</p>
            <div className="lml-tabs" role="tablist" aria-label={ucCopy.title}>
              {useCases.map((u, i) => (
                <button
                  key={u.id}
                  type="button"
                  role="tab"
                  data-tab={i}
                  id={"lml-tab-" + u.id}
                  aria-selected={tab === i}
                  aria-controls={"lml-panel-" + u.id}
                  tabIndex={tab === i ? 0 : -1}
                  className="lml-tab"
                  onClick={() => setTab(i)}
                  onKeyDown={(e) => onTabKey(e, i)}
                >
                  <span className="lml-tabn">{String(i + 1).padStart(2, "0")}</span>
                  <span className="lml-tabt">{u.title}</span>
                  <Arrow />
                  <span
                    className="lml-tabbar"
                    onAnimationEnd={() => {
                      if (tab === i) setTab((i + 1) % useCases.length)
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
          <div className="lml-cards" data-rv>
            {useCases.map((u, i) => (
              <article key={u.id} id={"lml-panel-" + u.id} role="tabpanel" aria-labelledby={"lml-tab-" + u.id} aria-hidden={tab !== i} className="lml-card" data-on={tab === i ? "true" : "false"}>
                <div className="lml-cardtext">
                  <h3>{u.title}</h3>
                  <p>{u.body}</p>
                  {u.action ? (
                    <a href={u.action.href} className="lml-more" tabIndex={tab === i ? 0 : -1} onClick={(e) => onLink(e, u.action ? u.action.href : "")}>
                      <span><Arrow size={12} /></span>
                      {u.action.label}
                    </a>
                  ) : null}
                </div>
                <div className="lml-artbox">
                  {art(u)}
                  <MeadowCanvas className="lml-artmeadow" layer={ART_LAYER} seed={61 + i} colors={{ ...cardColors, sky: dark ? "#1b1828" : pal.wash }} />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- calculator */}
      <section className="lml-sec lml-calc" data-sec="calculator" aria-labelledby="lml-calc-h">
        <div className="lml-wrap">
          <div className="lml-calcbox" data-rv>
            <div>
              <p className="lml-kicker">{calc.kicker}</p>
              <h2 id="lml-calc-h" className="lml-h2">{calc.title}</h2>
              <p className="lml-lede">{calc.body}</p>

              <div className="lml-field">
                <div className="lml-fieldhead">
                  <label htmlFor={chartId + "-amt"}>Deposit</label>
                  <output className="lml-amount" htmlFor={chartId + "-amt"}>{formatUSD(deposit)}</output>
                </div>
                <input
                  id={chartId + "-amt"}
                  type="range"
                  className="lml-range"
                  min={0}
                  max={1000}
                  step={1}
                  value={Math.round(amountToSlider(deposit) * 1000)}
                  aria-valuetext={formatUSD(deposit)}
                  style={{ "--lml-fill": fill } as React.CSSProperties}
                  onChange={(e) => setDeposit(sliderToAmount(Number(e.target.value) / 1000))}
                />
                <div className="lml-ticks" aria-hidden="true">
                  <span>$100</span>
                  <span>$10K</span>
                  <span>$1M</span>
                </div>
              </div>

              <div className="lml-field lml-row">
                <div>
                  <span className="lml-fieldlabel">Time in the meadow</span>
                  <div className="lml-seg" role="group" aria-label="Duration">
                    {DURATIONS.map((d) => (
                      <button key={d.m} type="button" aria-pressed={months === d.m} onClick={() => setMonths(d.m)}>{d.label}</button>
                    ))}
                  </div>
                </div>
                <span className="lml-toggle">
                  <button type="button" role="switch" aria-checked={compound} aria-label="Auto-compound monthly" className="lml-switch" onClick={() => setCompound((v) => !v)} />
                  Auto-compound
                </span>
              </div>

              <dl className="lml-results">
                <div className="lml-result lml-result--hi">
                  <dt>{"Balance in " + formatMonths(months)}</dt>
                  <dd>{formatUSD(finalTok)}</dd>
                </div>
                <div className="lml-result">
                  <dt>{"Yield earned at " + calc.apy.toFixed(2) + "% APY"}</dt>
                  <dd>{"+" + formatUSD(earnedTok)}</dd>
                </div>
              </dl>
              <p className="lml-compare" aria-live="polite">
                {times > 0 ? (
                  <>That's <b>{times.toFixed(1) + "×"}</b>{" what a " + calc.benchmarkLabel.toLowerCase() + " would earn (" + formatUSD(earnedBen) + ")."}</>
                ) : null}
              </p>
            </div>

            <div className="lml-chartbox">
              <div className="lml-legend">
                <span><i />{ticker + " · " + calc.apy.toFixed(2) + "%"}</span>
                <span><i className="lml-dash" />{calc.benchmarkLabel + " · " + calc.benchmarkApy.toFixed(2) + "%"}</span>
              </div>
              <div className="lml-chart" onPointerMove={onChartMove} onPointerDown={onChartMove} onPointerLeave={() => setHover(null)}>
                <svg viewBox={"0 0 " + CW + " " + CH} preserveAspectRatio="none" className="lml-svg" role="img" aria-label={"Growth of " + formatUSD(deposit) + " over " + formatMonths(months)}>
                  <defs>
                    <linearGradient id={chartId + "a"} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor={pal.wash} stopOpacity="0.42" />
                      <stop offset="1" stopColor={pal.wash} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {[0.25, 0.5, 0.75].map((g) => <path key={g} d={"M0 " + CH * g + "H" + CW} stroke="rgba(255,255,255,.07)" vectorEffect="non-scaling-stroke" />)}
                  <path d={areaPath} fill={"url(#" + chartId + "a)"} />
                  <path d={benPath} fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
                  <path d={tokPath} fill="none" stroke={pal.wash} strokeWidth="2.4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                  {hover !== null ? <path d={"M" + sx(hover) + " 0V" + CH} stroke="rgba(255,255,255,.3)" vectorEffect="non-scaling-stroke" /> : null}
                </svg>
                <span className="lml-ylab" style={{ top: (sy(hi) / CH) * 100 + "%" }}>{formatUSD(hi)}</span>
                <span className="lml-ylab lml-ylab--lo" style={{ top: (sy(deposit) / CH) * 100 + "%" }}>{formatUSD(deposit)}</span>
                {hover !== null ? (
                  <>
                    <span className="lml-dot" style={{ position: "absolute", left: (hover / (CHART_POINTS - 1)) * 100 + "%", top: (sy(series.tok[hover]) / CH) * 100 + "%", width: 10, height: 10, margin: "-5px 0 0 -5px", borderRadius: "50%", background: "#ffffff", boxShadow: "0 0 0 4px " + pal.accent }} />
                    <div className="lml-tip" style={{ left: clamp((hover / (CHART_POINTS - 1)) * 100, 12, 88) + "%" }}>
                      {formatMonths(Math.round((months * hover) / (CHART_POINTS - 1)))}
                      <b>{formatUSD(series.tok[hover])}</b>
                      {calc.benchmarkLabel + " " + formatUSD(series.ben[hover])}
                    </div>
                  </>
                ) : null}
              </div>
              <div className="lml-xaxis" aria-hidden="true">
                <span>Today</span>
                <span>{formatMonths(months / 2)}</span>
                <span>{formatMonths(months)}</span>
              </div>
            </div>
          </div>
          <p className="lml-disc" style={{ color: "var(--lml-faint)" }}>{calc.disclaimer}</p>
        </div>
      </section>

      {/* ---------------------------------------------------------------- faq */}
      {faqs.length ? (
        <section className="lml-sec" data-sec="faq" aria-labelledby="lml-faq-h">
          <div className="lml-wrap lml-faq">
            <div className="lml-faqhead" data-rv>
              <p className="lml-kicker">{faqHead.kicker}</p>
              <h2 id="lml-faq-h" className="lml-h2">{faqHead.title}</h2>
              <p className="lml-lede">{faqHead.body}</p>
            </div>
            <div data-rv>
              {faqs.map((f, i) => {
                const open = faqOpen === i
                return (
                  <div key={f.q} className="lml-qa">
                    <h3>
                      <button type="button" className="lml-q" aria-expanded={open} aria-controls={chartId + "-qa" + i} onClick={() => setFaqOpen(open ? null : i)}>
                        {f.q}
                        <span className="lml-plus" aria-hidden="true" />
                      </button>
                    </h3>
                    <div id={chartId + "-qa" + i} className="lml-a" data-open={open ? "true" : "false"} role="region" aria-hidden={!open}>
                      <div><p>{f.a}</p></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------------------- join */}
      <section className="lml-sec lml-join" data-sec="join" aria-labelledby="lml-join-h">
        <div className="lml-wrap">
          <div className="lml-joinbox" data-rv>
            <MeadowCanvas className="lml-layer" layer={CTA_LAYERS[0]} seed={71} colors={meadowColors} />
            <MeadowCanvas className="lml-layer" layer={CTA_LAYERS[1]} seed={83} colors={meadowColors} />
            <div className="lml-coins" style={{ transform: "none" }}>
              <HeroCoin variant="a" metal={metal} tint={tint} apy={calc.apy} reduced={reduced} />
              <HeroCoin variant="b" metal={metal} tint={tint} apy={calc.apy} reduced={reduced} />
            </div>
            <MeadowCanvas className="lml-layer" layer={CTA_LAYERS[2]} seed={97} colors={meadowColors} />
            <div className="lml-joincopy">
              <h2 id="lml-join-h" className="lml-h2">{joinCopy.title}</h2>
              <p>{joinCopy.body}</p>
              {joinState === "done" ? (
                <div className="lml-done" role="status">
                  <Sparkle size={16} />
                  {joinCopy.success}
                </div>
              ) : (
                <>
                  <form className="lml-form" data-state={joinState} noValidate onSubmit={submit} onAnimationEnd={() => joinState === "error" && setJoinState("idle")}>
                    <label htmlFor={chartId + "-email"} className="lml-sr">Email address</label>
                    <input
                      ref={emailRef}
                      id={chartId + "-email"}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder={joinCopy.placeholder}
                      value={email}
                      aria-invalid={joinNote ? true : undefined}
                      aria-describedby={chartId + "-note"}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        if (joinNote) setJoinNote("")
                      }}
                    />
                    <button type="submit" className="lml-btn lml-btn--lg" disabled={joinState === "sending"}>
                      {joinState === "sending" ? "Planting…" : joinCopy.action}
                    </button>
                  </form>
                  <p id={chartId + "-note"} className="lml-formnote" data-state={joinNote ? "error" : "idle"} aria-live="polite">{joinNote}</p>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- footer */}
      <footer className="lml-foot">
        <div className="lml-wrap">
          <div className="lml-footgrid">
            <div>
              <span className="lml-brand">{mark}<span>{brand}</span></span>
              <p className="lml-tagline">{tagline ?? tokenName + " — a yield-bearing dollar for people, platforms and treasuries. Grown, not printed."}</p>
              <div className="lml-socials">
                {socials.map((s) => (
                  <a key={s.kind + s.href} href={s.href} aria-label={s.label ?? s.kind} target={s.href.startsWith("http") ? "_blank" : undefined} rel={s.href.startsWith("http") ? "noreferrer" : undefined}>
                    <SocialIcon kind={s.kind} />
                  </a>
                ))}
              </div>
            </div>
            {columns.map((c) => (
              <div key={c.title} className="lml-col">
                <h4>{c.title}</h4>
                <ul>
                  {c.links.map((l) => (
                    <li key={l.label}><a href={l.href} onClick={(e) => onLink(e, l.href)}>{l.label}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="lml-word" aria-hidden="true">{brand}</div>
          <div className="lml-bar">
            <span>{copyright ?? "© " + new Date().getFullYear() + " " + brand + ". All rights reserved."}</span>
            <nav aria-label="Legal">
              {legal.map((l) => <a key={l.label} href={l.href}>{l.label}</a>)}
            </nav>
          </div>
        </div>
      </footer>
    </div>
  )
}
