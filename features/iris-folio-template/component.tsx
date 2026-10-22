"use client"

// Iris Folio Template — a complete graphic-design portfolio drawn like a
// gouache cover: a swash "PORTFOLIO" wordmark in sky blue over a band of
// sunrise sky where heart-shaped leaves spill past the edges, an art-nouveau
// vine frames a white iris, petals drift and sparkles glint. Below the cover
// the same hand carries a filterable works grid with a project viewer, an
// about section with an arched portrait, an accordion of disciplines, a
// timeline vine you can grow year by year, and a contact sign-off.
//
// It is interactive throughout: the wordmark writes itself in, every letter
// lifts on hover, the cover parts in parallax under the pointer, the iris
// blooms when clicked, a click anywhere on the sky scatters petals, leaves
// rustle, the grid filters by discipline, the viewer pages with arrow keys,
// the timeline grows to the year you pick and the email copies itself.
//
// Every illustration is SVG drawn in this file. The wordmark is built from
// glyph outlines of Bodoni Moda Italic (Owen Earl) and Pinyon Script (Nicole
// Fally), both SIL Open Font License 1.1, so no font ever loads.
import * as React from "react"

/* ------------------------------------------------------------------ types */

export type IrisLink = { label: string; href: string }
export type IrisMotif = "iris" | "leaves" | "petals" | "vine" | "moon"
export type IrisSky = "day" | "dawn" | "dusk" | "night"
export type IrisProject = {
  title: string
  year: string | number
  /** Used for the filter chips. */
  discipline: string
  client?: string
  role?: string
  summary: string
  body?: string
  tools?: string[]
  /** Which drawn cover to use when there is no `cover` image. */
  motif?: IrisMotif
  sky?: IrisSky
  /** Your own image. Replaces the drawn cover. */
  cover?: string
  href?: string
}
export type IrisService = { title: string; line: string; body?: string; deliverables?: string[] }
export type IrisMilestone = { title: string; place?: string; note?: string }
export type IrisYear = { year: string | number; headline?: string; items: IrisMilestone[] }
export type IrisStat = { value: number; suffix?: string; label: string }
export type IrisFact = { label: string; value: string }
export type IrisPalette = "morning" | "dusk" | "sakura" | "lagoon"

export type IrisHero = {
  /** Drawn in the swash lettering. Type any lowercase to set the case yourself. */
  title?: string
  from?: string | number
  to?: string | number
  /** Line under the cover, e.g. "Graphic Design". */
  discipline?: string
  /** The small list under it. */
  tags?: string[]
  /** Your name in your own script, bottom left. */
  localName?: string
  /** "Portfolio" in your own script, bottom right. */
  localTitle?: string
}
export type IrisAbout = {
  title?: string
  /** Wrap words in *asterisks* to set them in italic ink. */
  statement?: string
  body?: string
  /** Your own image, shown in the arched frame. */
  portrait?: string
  facts?: IrisFact[]
  stats?: IrisStat[]
  cv?: IrisLink
}
export type IrisSectionCopy = { title?: string; kicker?: string; intro?: string }
export type IrisContact = {
  title?: string
  line?: string
  email?: string
  availability?: string
  socials?: IrisLink[]
}

export type IrisFolioTemplateProps = {
  /** Your name. Used in the nav, footer and copyright. */
  name?: string
  /** The pill in the corner, e.g. "©IRIS". */
  mark?: string
  nav?: IrisLink[]
  hero?: IrisHero
  worksCopy?: IrisSectionCopy
  projects?: IrisProject[]
  about?: IrisAbout
  servicesCopy?: IrisSectionCopy
  services?: IrisService[]
  timelineCopy?: IrisSectionCopy
  timeline?: IrisYear[]
  contact?: IrisContact
  palette?: IrisPalette
  /** Overrides the palette's ink (lettering) colour. */
  ink?: string
  /** Overrides the paper colour. */
  paper?: string
  /** Shows the palette swatches in the footer. */
  paletteSwitcher?: boolean
  /** "auto" follows a `.dark` class on an ancestor. */
  theme?: "auto" | "light" | "dark"
  /** The wordmark writes itself in on load. */
  intro?: boolean
  onProjectOpen?: (project: IrisProject) => void
  /** Minimum height of the cover. A definite length, so it survives any host layout. */
  height?: string
  className?: string
}

/* ------------------------------------------------------------------ logic */

// #region logic
type Pt = [number, number]
type Glyph = [number, number, number, number, number, string]
type GlyphTable = { [ch: string]: Glyph }
type LetterKind = "script" | "roman" | "small" | "space" | "other"

const PALETTES = {
  morning: { label: "Morning", ink: "#3b78e6", paper: "#f3f2ed", skyTop: "#3d7fe4", skyMid: "#5b97ec", skyLow: "#9cc4f4", glow: "#f9b98e", blush: "#f2a2bd", leaf: "#4f9d80", petal: "#ffffff" },
  dusk: { label: "Dusk", ink: "#5b4fd0", paper: "#f2f0f2", skyTop: "#4f4fc9", skyMid: "#7d74dc", skyLow: "#c4b5ef", glow: "#ffb48a", blush: "#ff8db0", leaf: "#3f8f7f", petal: "#fffaf6" },
  sakura: { label: "Sakura", ink: "#d2457a", paper: "#f6f1ee", skyTop: "#ef8fb0", skyMid: "#f5b5c9", skyLow: "#fde0e3", glow: "#ffd391", blush: "#ffffff", leaf: "#5aa07c", petal: "#ffffff" },
  lagoon: { label: "Lagoon", ink: "#0f7f86", paper: "#eff3f0", skyTop: "#1f9fb2", skyMid: "#4fbfc6", skyLow: "#a8e3dc", glow: "#ffe08a", blush: "#ffb99a", leaf: "#3c8f6a", petal: "#ffffff" },
}
const PALETTE_KEYS = ["morning", "dusk", "sakura", "lagoon"]
const VOWELS = "AEIOU"

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

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function r1(n: number): string {
  return String(Math.round(n * 10) / 10)
}

// Catmull-Rom through the points, `seg` samples per span.
function catmull(pts: Pt[], seg: number): Pt[] {
  const out: Pt[] = []
  if (pts.length < 2) return pts.slice()
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    for (let k = 0; k < seg; k++) {
      const t = k / seg
      const t2 = t * t
      const t3 = t2 * t
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - a - 3 * c + d) * t3)
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])])
    }
  }
  out.push(pts[pts.length - 1])
  return out
}

// Points on a spiral whose radius runs r0 → r1 while it turns `turns` times
// (negative turns run anticlockwise on screen).
function spiral(cx: number, cy: number, r0: number, r1: number, a0: number, turns: number, n: number): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const a = a0 + t * turns * Math.PI * 2
    const r = r0 + (r1 - r0) * t
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
  }
  return out
}

// A filled brush stroke along a polyline: width w0 at the start easing to w1
// at the end, with a short taper in so it never starts blunt.
function ribbon(pts: Pt[], w0: number, w1: number): string {
  const n = pts.length
  if (n < 2) return ""
  const L: string[] = []
  const R: string[] = []
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)]
    const b = pts[Math.min(n - 1, i + 1)]
    let tx = b[0] - a[0]
    let ty = b[1] - a[1]
    const m = Math.hypot(tx, ty) || 1
    tx /= m
    ty /= m
    const t = i / (n - 1)
    const w = ((w0 + (w1 - w0) * Math.pow(t, 0.85)) * Math.min(1, 0.45 + t * 9)) / 2
    const p = pts[i]
    L.push(r1(p[0] - ty * w) + " " + r1(p[1] + tx * w))
    R.push(r1(p[0] + ty * w) + " " + r1(p[1] - tx * w))
  }
  return "M" + L.join("L") + "L" + R.reverse().join("L") + "Z"
}

function polyline(pts: Pt[]): string {
  return "M" + pts.map((p) => r1(p[0]) + " " + r1(p[1])).join("L")
}

type LeafShape = { a: string; b: string; veins: string; rib: string }

// A heart-shaped leaf, notch at (0, 0), tip at (0, -L). `a` is the left half,
// `b` the right, so each can take its own light.
function heartLeaf(L: number, W: number): LeafShape {
  const w = W / 2
  const half = (s: number) => {
    const Q = (x: number, y: number) => r1(s * x * w) + " " + r1(-y * L)
    return "M0 0C" + Q(0.22, -0.17) + " " + Q(0.66, -0.21) + " " + Q(0.9, -0.03) + "C" + Q(1.1, 0.14) + " " + Q(1.02, 0.44) + " " + Q(0.76, 0.62) + "C" + Q(0.5, 0.8) + " " + Q(0.18, 0.92) + " 0 " + r1(-L) + "Z"
  }
  let veins = ""
  for (const s of [-1, 1]) {
    for (const k of [0.14, 0.32, 0.5, 0.68]) {
      veins += "M0 " + r1(-k * L) + "Q" + r1(s * 0.42 * w) + " " + r1(-(k + 0.07) * L) + " " + r1(s * (0.86 - k * 0.5) * w) + " " + r1(-(k + 0.2) * L)
    }
    veins += "M0 0Q" + r1(s * 0.4 * w) + " " + r1(0.06 * L) + " " + r1(s * 0.78 * w) + " " + r1(0.06 * L)
  }
  return { a: half(-1), b: half(1), veins, rib: "M0 0Q" + r1(0.05 * w) + " " + r1(-0.5 * L) + " 0 " + r1(-0.96 * L) }
}

// A loose petal from (0, 0) along +x: outline and a shaded inner fold.
function petalShape(L: number, W: number, bend: number): { o: string; s: string } {
  const P = (x: number, y: number) => r1(x * L) + " " + r1(y * W + bend * x * x * W)
  return {
    o: "M0 0C" + P(0.2, -1) + " " + P(0.72, -1.1) + " " + P(1, -0.2) + "C" + P(0.86, 0.5) + " " + P(0.42, 0.62) + " 0 0Z",
    s: "M0 0C" + P(0.34, -0.12) + " " + P(0.7, -0.3) + " " + P(1, -0.2) + "C" + P(0.86, 0.5) + " " + P(0.42, 0.62) + " 0 0Z",
  }
}

// A crescent moon of radius r, horns facing `dir` (1 = right).
function crescent(cx: number, cy: number, r: number, dir: number): string {
  const sw = dir > 0 ? 0 : 1
  return "M" + r1(cx) + " " + r1(cy - r) + "A" + r + " " + r + " 0 1 " + sw + " " + r1(cx) + " " + r1(cy + r) + "A" + r1(r * 0.5) + " " + r + " 0 1 " + (1 - sw) + " " + r1(cx) + " " + r1(cy - r) + "Z"
}

function sparklePath(x: number, y: number, s: number): string {
  const q = s * 0.12
  return "M" + r1(x) + " " + r1(y - s) + "Q" + r1(x + q) + " " + r1(y - q) + " " + r1(x + s) + " " + r1(y) + "Q" + r1(x + q) + " " + r1(y + q) + " " + r1(x) + " " + r1(y + s) + "Q" + r1(x - q) + " " + r1(y + q) + " " + r1(x - s) + " " + r1(y) + "Q" + r1(x - q) + " " + r1(y - q) + " " + r1(x) + " " + r1(y - s) + "Z"
}

// How each character of a wordmark is set. All-caps input gets the house
// rhythm: the first letter of each word in script, every other vowel dropped
// to a raised lowercase, and one consonant mid-word in script. Input with any
// lowercase is taken as typed: lowercase stays small, capitals roman, and the
// first letter of each word still swashes.
function letterKinds(text: string): LetterKind[] {
  const asTyped = /[a-z]/.test(text)
  const out: LetterKind[] = []
  let vowel = 0
  const words = text.split(/(\s+)/)
  for (const word of words) {
    if (/^\s+$/.test(word)) {
      for (let i = 0; i < word.length; i++) out.push("space")
      continue
    }
    const letters = []
    for (let i = 0; i < word.length; i++) if (/[A-Za-z]/.test(word[i])) letters.push(i)
    const mid = letters.length >= 6 ? letters[Math.floor(letters.length / 2)] : -1
    for (let i = 0; i < word.length; i++) {
      const ch = word[i]
      if (!/[A-Za-z]/.test(ch)) {
        out.push("other")
        continue
      }
      const up = ch.toUpperCase()
      if (i === letters[0]) out.push("script")
      else if (asTyped) out.push(ch === up ? "roman" : "small")
      else if (VOWELS.includes(up)) out.push(vowel++ % 2 === 0 ? "small" : "roman")
      else if (i === mid || (mid > -1 && i === mid + 1 && VOWELS.includes(word[mid].toUpperCase()))) out.push("script")
      else out.push("roman")
    }
  }
  return out
}

type PlacedGlyph = { ch: string; kind: LetterKind; d: string; x: number; y: number; s: number; w: number; box: number[] }
type WordLayout = { glyphs: PlacedGlyph[]; x0: number; x1: number; y0: number; y1: number }

const KIND_SCALE = { script: 1.24, roman: 1, small: 1.08, space: 1, other: 1 }
const KIND_RISE = { script: 34, roman: 0, small: -150, space: 0, other: 0 }

// Places each glyph on a shared baseline in a 1000-unit em and returns the
// ink bounds, so the SVG viewBox hugs the word.
function layoutWord(text: string): WordLayout {
  const kinds = letterKinds(text)
  const glyphs: PlacedGlyph[] = []
  let x = 0
  let x0 = Infinity
  let x1 = -Infinity
  let y0 = Infinity
  let y1 = -Infinity
  for (let i = 0; i < text.length; i++) {
    const kind = kinds[i]
    const raw = text[i]
    if (kind === "space") {
      x += 300
      continue
    }
    const key = kind === "small" ? raw.toLowerCase() : kind === "other" ? raw : raw.toUpperCase()
    const g = kind === "script" ? SCRIPT[key] || ROMAN[key] : ROMAN[key]
    const s = KIND_SCALE[kind]
    const y = KIND_RISE[kind]
    if (!g) {
      x += 420
      continue
    }
    const adv = (kind === "script" ? (g[0] + g[2]) / 2 - 30 : g[0]) * s
    const box = [x + g[1] * s, y + g[3] * s, x + g[2] * s, y + g[4] * s]
    glyphs.push({ ch: raw, kind, d: g[5], x, y, s, w: adv, box })
    x0 = Math.min(x0, box[0])
    y0 = Math.min(y0, box[1])
    x1 = Math.max(x1, box[2])
    y1 = Math.max(y1, box[3])
    x += adv + (kind === "small" ? 10 : 24)
  }
  if (!glyphs.length) return { glyphs, x0: 0, x1: 1, y0: -1, y1: 0 }
  return { glyphs, x0, x1, y0, y1 }
}

type Emph = { text: string; em: boolean }

function parseEmphasis(s: string): Emph[] {
  const out: Emph[] = []
  const re = /\*([^*]+)\*/g
  let last = 0
  let m
  while ((m = re.exec(s))) {
    if (m.index > last) out.push({ text: s.slice(last, m.index), em: false })
    out.push({ text: m[1], em: true })
    last = m.index + m[0].length
  }
  if (last < s.length) out.push({ text: s.slice(last), em: false })
  return out
}

function disciplinesOf(items: IrisProject[]): string[] {
  const out: string[] = []
  for (const p of items) if (p.discipline && !out.includes(p.discipline)) out.push(p.discipline)
  return out
}

function filterProjects(items: IrisProject[], d: string | null): IrisProject[] {
  return d ? items.filter((p) => p.discipline === d) : items
}

// Column spans on a 12-column grid: wide-narrow, three across, narrow-wide.
const SPANS = [7, 5, 4, 4, 4, 5, 7]

function spanFor(i: number, total: number): number {
  if (total === 1) return 12
  const s = SPANS[i % SPANS.length]
  // a lone card on the last row takes the whole row
  const start = i - (i % SPANS.length)
  const rowIndex = i % SPANS.length
  if (i === total - 1) {
    if ((rowIndex === 0 || rowIndex === 2 || rowIndex === 5) && start + rowIndex === i) return 12
    if (rowIndex === 3) return 8
  }
  return s
}

function pad2(n: number): string {
  return n < 10 ? "0" + n : String(n)
}

function nextIndex(i: number, key: string, n: number): number | null {
  if (n <= 0) return null
  if (key === "ArrowRight" || key === "ArrowDown") return (i + 1) % n
  if (key === "ArrowLeft" || key === "ArrowUp") return (i - 1 + n) % n
  if (key === "Home") return 0
  if (key === "End") return n - 1
  return null
}

function easeOutCubic(t: number): number {
  const c = clamp(t, 0, 1)
  return 1 - Math.pow(1 - c, 3)
}

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim())
}

function paletteVars(name: string, ink?: string, paper?: string): { [k: string]: string } {
  const p = PALETTES[(PALETTE_KEYS.includes(name) ? name : "morning") as IrisPalette]
  return {
    "--ifo-pi": ink || p.ink,
    "--ifo-pp": paper || p.paper,
    "--ifo-p-top": p.skyTop,
    "--ifo-p-mid": p.skyMid,
    "--ifo-p-low": p.skyLow,
    "--ifo-p-glow": p.glow,
    "--ifo-p-blush": p.blush,
    "--ifo-p-leaf": p.leaf,
    "--ifo-p-petal": p.petal,
  }
}
// #endregion logic

/* ----------------------------------------------------------------- glyphs */

// Glyph outlines in a 1000-unit em, y down, baseline at 0:
// [advance, xMin, xMax, yMin, yMax, path]. ROMAN is Bodoni Moda Italic at
// 400 / opsz 96, SCRIPT is Pinyon Script capitals. Both SIL OFL 1.1.
// #region glyphs
const ROMAN: GlyphTable = {
  "A": [724, -45, 655, -765, 0, "M47 0 488 -765H490L585 0H480L415 -634L49 0ZM-45 0V-2H175V0ZM365 0V-2H655V0ZM189 -244V-246H515V-244Z"],
  "B": [625, -45, 630, -750, 0, "M-45 0V-2H46L220 -748H130V-750H410Q531 -750 580 -715Q630 -680 630 -605Q630 -564 610 -526Q590 -488 554 -459Q519 -429 472 -410Q425 -391 371 -386Q436 -384 481 -367Q527 -350 551 -319Q575 -288 575 -240Q575 -184 551 -140Q527 -95 484 -64Q442 -32 385 -16Q329 0 265 0ZM140 -2H265Q310 -2 347 -24Q384 -46 410 -82Q436 -120 451 -166Q465 -212 465 -260Q465 -304 450 -332Q434 -359 407 -372Q379 -384 341 -384H199L200 -386H335Q364 -386 397 -401Q430 -416 461 -444Q492 -474 511 -516Q530 -559 530 -615Q530 -650 518 -680Q506 -710 480 -729Q453 -748 410 -748H314Z"],
  "C": [662, 55, 728, -760, 10, "M310 10Q234 10 176 -22Q119 -54 87 -114Q55 -174 55 -255Q55 -358 90 -449Q124 -540 185 -610Q246 -680 324 -720Q402 -760 490 -760Q549 -760 595 -736Q642 -712 665 -664Q689 -616 680 -545H678Q685 -596 674 -636Q662 -675 638 -702Q613 -728 578 -742Q542 -756 500 -756Q446 -756 401 -731Q356 -706 318 -662Q281 -618 252 -562Q224 -506 204 -444Q185 -380 175 -317Q165 -253 165 -195Q165 -144 182 -98Q199 -52 234 -23Q268 6 320 6Q387 6 445 -22Q503 -50 546 -98Q588 -146 608 -205H610Q590 -144 546 -95Q503 -46 442 -18Q382 10 310 10ZM553 0 520 -70Q540 -90 558 -111Q578 -133 597 -174L608 -205H610L555 0ZM678 -545 681 -565Q682 -600 677 -628Q671 -658 655 -680L726 -750H728L680 -545Z"],
  "D": [694, -35, 695, -750, 0, "M-35 0V-2H250Q304 -2 349 -26Q394 -50 432 -93Q469 -135 498 -189Q526 -243 546 -303Q565 -362 575 -422Q585 -482 585 -535Q585 -570 576 -607Q568 -644 549 -676Q530 -708 498 -728Q466 -748 420 -748H125V-750H420Q502 -750 564 -720Q626 -690 660 -634Q695 -576 695 -495Q695 -392 660 -303Q625 -213 564 -145Q502 -77 422 -38Q341 0 250 0ZM55 0 225 -750H320L150 0Z"],
  "E": [574, -45, 649, -750, 0, "M40 0 214 -750H309L135 0ZM-45 0V-2H300Q368 -2 416 -31Q462 -60 492 -111Q520 -162 535 -225H537L485 0ZM368 -278Q376 -312 366 -336Q356 -360 334 -374Q312 -387 283 -387H212V-389H283Q312 -389 340 -401Q368 -413 388 -436Q410 -460 417 -493H419L370 -278ZM599 -545Q612 -598 604 -645Q596 -691 564 -720Q532 -748 474 -748H124V-750H649L601 -545Z"],
  "F": [554, -45, 639, -750, 0, "M40 0 214 -750H309L135 0ZM-45 0V-2H235V0ZM375 -268Q382 -302 372 -325Q362 -348 335 -360Q308 -372 264 -372H209V-374H264Q307 -374 340 -385Q374 -396 395 -418Q416 -440 423 -473H425L377 -268ZM589 -545Q602 -598 594 -645Q586 -691 554 -720Q522 -748 464 -748H124V-750H639L591 -545Z"],
  "G": [728, 55, 728, -760, 10, "M310 10Q234 10 176 -22Q119 -54 87 -114Q55 -174 55 -255Q55 -337 78 -412Q100 -487 141 -550Q182 -614 236 -661Q291 -708 356 -734Q420 -760 490 -760Q549 -760 595 -736Q642 -712 665 -664Q689 -616 680 -545H678Q684 -598 673 -637Q661 -676 636 -703Q610 -730 576 -743Q540 -756 500 -756Q436 -756 383 -720Q330 -685 290 -626Q249 -566 221 -492Q194 -419 179 -342Q165 -264 165 -195Q165 -144 177 -98Q190 -51 219 -22Q249 8 301 8Q348 8 383 -9Q418 -26 442 -50Q467 -74 482 -96Q496 -117 502 -125L544 -285H648L617 -165Q600 -142 573 -112Q546 -82 508 -54Q470 -26 420 -8Q371 10 310 10ZM455 -284V-286H725V-284ZM678 -545 681 -568Q682 -596 677 -626Q671 -654 655 -680L726 -750H728L680 -545Z"],
  "H": [720, -40, 815, -750, 0, "M207 -369V-371H567V-369ZM395 -748H310L140 -2H230V0H-40V-2H46L214 -748H125V-750H395ZM815 -750V-748H730L560 -2H650V0H380V-2H466L634 -748H545V-750Z"],
  "I": [350, -40, 445, -750, 0, "M70 0 240 -750H335L165 0ZM-40 0V-2H280V0ZM125 -748V-750H445V-748Z"],
  "J": [428, -32, 524, -750, 30, "M89 30Q50 30 24 14Q-4 -2 -18 -28Q-32 -52 -32 -78Q-32 -98 -24 -113Q-16 -128 -3 -135Q10 -142 25 -142Q38 -142 50 -136Q64 -130 72 -118Q82 -104 82 -84Q82 -65 74 -53Q66 -40 53 -35Q40 -29 25 -29Q12 -29 0 -35Q-14 -41 -22 -52Q-31 -62 -31 -78H-30Q-30 -59 -22 -40Q-14 -22 1 -6Q16 10 38 19Q60 28 89 28Q120 28 138 2Q157 -26 170 -75Q184 -124 200 -190L330 -750H424L294 -170Q279 -144 259 -110Q239 -76 214 -44Q188 -12 157 10Q126 30 89 30ZM200 -748V-750H524V-748Z"],
  "K": [672, -40, 732, -750, 0, "M141 -217 633 -750H636L144 -217ZM-40 0V-2H230V0ZM297 0V-2H607V0ZM45 0 215 -750H310L140 0ZM415 0 292 -380 364 -456 519 0ZM125 -748V-750H395V-748ZM492 -748V-750H732V-748Z"],
  "L": [562, -45, 532, -750, 0, "M40 0 214 -750H309L135 0ZM-45 0V-2H295Q374 -2 420 -31Q466 -60 491 -111Q516 -162 530 -225H532L480 0ZM124 -748V-750H399V-748Z"],
  "M": [834, -25, 905, -750, 10, "M321 10 203 -750H299L400 -130L749 -750H751L323 10ZM-25 0V-2H127V0ZM46 0 202 -748H125V-750H205L48 0ZM520 0V-2H765V0ZM590 0 750 -750H905V-748H841L685 0Z"],
  "N": [714, -35, 810, -750, 10, "M540 10 225 -750H340L578 -157L713 -750H715L542 10ZM-35 0V-2H187V0ZM59 0 225 -748H125V-750H228L61 0ZM593 -748V-750H810V-748Z"],
  "O": [714, 55, 715, -760, 10, "M300 10Q186 10 120 -62Q55 -133 55 -255Q55 -337 78 -412Q100 -487 140 -550Q180 -614 232 -661Q284 -708 345 -734Q406 -760 470 -760Q542 -760 597 -728Q652 -696 684 -636Q715 -576 715 -495Q715 -392 682 -301Q649 -210 591 -140Q534 -70 458 -30Q384 10 300 10ZM300 8Q348 8 390 -17Q432 -42 465 -86Q499 -130 525 -186Q552 -243 569 -306Q587 -370 596 -433Q605 -497 605 -555Q605 -586 598 -621Q592 -656 576 -687Q561 -718 535 -738Q509 -758 470 -758Q424 -758 384 -733Q343 -708 309 -664Q275 -620 248 -564Q222 -507 203 -444Q184 -380 175 -317Q165 -253 165 -195Q165 -144 177 -98Q189 -51 218 -22Q248 8 300 8Z"],
  "P": [604, -40, 635, -750, 0, "M174 -339 174 -341H310Q361 -341 401 -364Q441 -388 468 -425Q496 -462 510 -506Q525 -549 525 -590Q525 -612 520 -639Q516 -666 504 -691Q491 -716 468 -732Q446 -748 410 -748H310L136 -2H235V0H-40V-2H40L214 -748H125V-750H410Q476 -750 526 -732Q577 -715 606 -678Q635 -640 635 -580Q635 -505 596 -451Q556 -397 484 -368Q410 -339 310 -339Z"],
  "Q": [714, 55, 715, -760, 250, "M300 10Q186 10 120 -62Q55 -133 55 -255Q55 -337 78 -412Q100 -487 140 -550Q180 -614 232 -661Q284 -708 345 -734Q406 -760 470 -760Q542 -760 597 -728Q652 -696 684 -636Q715 -576 715 -495Q715 -392 682 -301Q649 -210 591 -140Q534 -70 458 -30Q384 10 300 10ZM425 250Q328 250 281 224Q234 197 227 142Q220 86 245 0Q272 9 302 9Q333 9 360 0Q342 68 337 116Q333 163 342 192Q352 222 372 235Q394 248 425 248ZM300 8Q348 8 390 -17Q432 -42 465 -86Q499 -130 525 -186Q552 -243 569 -306Q587 -370 596 -433Q605 -497 605 -555Q605 -586 598 -621Q592 -656 576 -687Q561 -718 535 -738Q509 -758 470 -758Q424 -758 384 -733Q343 -708 309 -664Q275 -620 248 -564Q222 -507 203 -444Q184 -380 175 -317Q165 -253 165 -195Q165 -144 177 -98Q189 -51 218 -22Q248 8 300 8Z"],
  "R": [714, -40, 675, -750, 5, "M60 0 235 -750H330L155 0ZM-40 0V-2H265V0ZM560 5Q516 5 493 -12Q470 -28 460 -56Q450 -84 450 -118Q448 -152 450 -190Q452 -226 450 -261Q448 -296 437 -323Q426 -351 401 -368Q376 -384 330 -384H215V-386H350Q424 -386 466 -365Q508 -344 528 -310Q548 -276 553 -235Q558 -194 557 -154Q556 -113 556 -79Q555 -44 564 -24Q572 -3 599 -3Q615 -3 626 -6Q638 -10 649 -14L650 -12Q623 -2 605 2Q587 5 560 5ZM215 -384V-386H360Q401 -386 434 -400Q466 -413 491 -436Q516 -460 532 -488Q548 -518 557 -549Q565 -580 565 -610Q565 -628 562 -652Q559 -676 548 -698Q538 -720 517 -734Q496 -748 460 -748H125V-750H460Q526 -750 574 -736Q622 -721 648 -688Q675 -655 675 -600Q675 -530 638 -482Q602 -434 531 -409Q460 -384 360 -384Z"],
  "S": [556, -20, 591, -760, 15, "M233 15Q174 15 136 -1Q96 -16 74 -45Q50 -74 40 -112Q30 -150 28 -195H30Q32 -150 42 -112Q52 -74 75 -46Q98 -18 137 -2Q176 13 233 13Q286 13 329 -8Q372 -30 398 -68Q423 -106 423 -155Q423 -201 406 -232Q390 -264 363 -286Q336 -308 303 -326Q270 -343 238 -361Q206 -378 178 -401Q151 -424 134 -456Q118 -488 118 -535Q118 -592 142 -634Q166 -676 202 -704Q240 -732 280 -746Q321 -760 355 -760Q419 -760 462 -736Q504 -712 525 -666Q546 -620 546 -555H544Q544 -620 523 -665Q502 -710 460 -734Q418 -758 355 -758Q317 -758 281 -740Q245 -723 222 -691Q198 -659 198 -615Q198 -573 214 -546Q231 -518 258 -498Q286 -479 318 -462Q350 -446 383 -428Q416 -409 443 -382Q470 -356 486 -317Q503 -278 503 -220Q503 -168 481 -124Q459 -81 421 -50Q383 -19 334 -2Q286 15 233 15ZM-20 10 28 -195H30L32 -153Q36 -126 43 -105Q50 -84 59 -68L-18 10ZM544 -555 545 -579Q542 -604 536 -631Q530 -658 513 -687L589 -760H591L546 -555Z"],
  "T": [622, 75, 722, -750, 0, "M203 0 377 -750H472L298 0ZM93 0V-2H408V0ZM75 -525 127 -750H722L670 -525H668Q682 -588 680 -639Q678 -690 652 -719Q626 -748 567 -748H272Q228 -748 196 -731Q164 -714 142 -684Q119 -654 104 -613Q88 -572 77 -525Z"],
  "U": [684, 90, 779, -750, 15, "M309 15Q228 15 174 -12Q120 -39 100 -94Q80 -148 99 -230L219 -750H314L194 -240Q183 -193 182 -148Q180 -104 193 -67Q205 -31 234 -10Q264 12 314 12Q391 12 441 -17Q490 -46 520 -100Q550 -154 568 -230L688 -750H690L570 -230Q552 -152 521 -97Q490 -42 439 -14Q388 15 309 15ZM124 -748V-750H409V-748ZM584 -748V-750H779V-748Z"],
  "V": [720, 120, 820, -750, 15, "M285 15 190 -750H295L359 -115L724 -750H726L287 15ZM120 -748V-750H410V-748ZM600 -748V-750H820V-748Z"],
  "W": [962, 120, 1063, -750, 10, "M529 10 473 -750H568L612 -137L962 -750H964L531 10ZM268 10 212 -750H307L351 -137L511 -417H513L270 10ZM120 -748V-750H825V-748ZM552 -417 742 -750H744L554 -417ZM873 -748V-750H1063V-748Z"],
  "X": [724, -50, 785, -750, 0, "M476 0 225 -750H336L591 0ZM-50 0V-2H190V0ZM61 0 388 -417H391L64 0ZM380 0V-2H660V0ZM155 -748V-750H435V-748ZM386 -377 673 -748H676L389 -377ZM565 -748V-750H785V-748Z"],
  "Y": [724, 120, 825, -750, 0, "M255 0 340 -377 190 -750H300L433 -374L734 -748H736L434 -371L350 0ZM165 0V-2H450V0ZM120 -748V-750H410V-748ZM615 -748V-750H825V-748Z"],
  "Z": [548, -50, 614, -750, 0, "M-50 0V-2L494 -748H314Q246 -748 203 -728Q161 -708 137 -671Q114 -634 101 -580H99L139 -750H614V-748L70 -2H280Q348 -2 391 -23Q434 -44 458 -85Q482 -127 497 -190H499L455 0Z"],
  "a": [544, 30, 524, -470, 10, "M156 10Q90 10 60 -33Q30 -76 30 -152Q30 -210 51 -266Q72 -322 108 -368Q143 -414 186 -442Q230 -470 274 -470Q310 -470 327 -449Q344 -428 350 -394Q355 -360 355 -324Q355 -291 349 -254Q342 -216 330 -178Q318 -141 301 -107Q284 -74 262 -47Q240 -20 213 -5Q187 10 156 10ZM174 1Q204 1 231 -20Q258 -40 280 -75Q302 -110 319 -153Q335 -196 344 -240Q353 -284 353 -324Q353 -363 347 -395Q342 -427 326 -446Q311 -465 283 -465Q257 -465 232 -442Q206 -418 184 -380Q161 -342 144 -296Q126 -250 116 -203Q106 -156 106 -118Q106 -56 125 -28Q144 1 174 1ZM374 10Q339 10 322 -9Q306 -28 306 -58Q306 -66 306 -73Q307 -80 308 -85L320 -148L342 -222L355 -302L393 -460H478L363 -30Q361 -22 361 -14Q361 -6 366 0Q370 6 382 6Q410 6 434 -10Q458 -26 480 -62Q501 -97 522 -154L524 -153Q502 -96 480 -60Q458 -24 433 -7Q408 10 374 10Z"],
  "b": [490, 30, 452, -750, 10, "M176 10Q135 10 106 -9Q78 -28 59 -58Q40 -88 30 -120L199 -748H115V-750H278L102 -94Q102 -46 115 -19Q128 8 172 8Q207 8 238 -14Q268 -36 293 -74Q318 -110 336 -156Q354 -201 364 -248Q374 -296 374 -337Q374 -392 356 -428Q338 -464 304 -464Q272 -464 246 -444Q220 -424 200 -390Q180 -356 165 -314Q150 -273 138 -230H136Q150 -285 168 -329Q186 -374 207 -405Q228 -436 254 -452Q281 -469 313 -469Q374 -469 414 -419Q452 -368 452 -288Q452 -229 430 -176Q408 -122 370 -80Q332 -38 282 -14Q232 10 176 10Z"],
  "c": [438, 30, 428, -470, 10, "M178 10Q106 10 68 -34Q30 -79 30 -150Q30 -208 52 -265Q73 -322 110 -368Q148 -414 196 -442Q244 -470 296 -470Q338 -470 367 -454Q396 -438 412 -416Q428 -394 428 -375Q428 -348 413 -333Q398 -318 376 -318Q358 -318 342 -330Q326 -342 326 -368Q326 -388 340 -403Q354 -418 374 -418Q388 -418 400 -414Q412 -411 419 -402Q426 -392 426 -375H426Q426 -395 410 -416Q396 -437 368 -452Q340 -467 303 -467Q269 -467 239 -443Q208 -418 184 -378Q160 -337 142 -289Q124 -241 114 -193Q104 -145 104 -106Q104 -58 124 -26Q143 6 185 6Q230 6 267 -12Q304 -31 334 -62Q363 -93 383 -130L384 -130Q365 -92 335 -60Q305 -28 266 -9Q226 10 178 10Z"],
  "d": [544, 30, 555, -750, 10, "M374 10Q339 10 322 -9Q306 -28 306 -58Q306 -62 306 -70Q306 -77 308 -85L320 -148L344 -232L352 -292L474 -748H387V-750H555L363 -30Q361 -22 361 -14Q361 -6 366 0Q370 6 382 6Q410 6 434 -10Q458 -26 480 -62Q501 -97 522 -154L524 -153Q502 -96 480 -60Q459 -24 433 -7Q408 10 374 10ZM157 10Q90 10 60 -33Q30 -76 30 -152Q30 -210 51 -266Q72 -322 108 -368Q143 -414 186 -442Q230 -470 274 -470Q308 -470 326 -450Q344 -429 349 -396Q355 -362 355 -324Q355 -291 349 -254Q342 -216 330 -178Q318 -141 301 -107Q284 -74 262 -47Q240 -20 214 -5Q188 10 157 10ZM174 1Q204 1 231 -20Q258 -40 280 -75Q302 -110 319 -153Q335 -196 344 -240Q353 -284 353 -324Q353 -363 347 -395Q342 -427 326 -446Q311 -465 283 -465Q257 -465 232 -442Q206 -418 184 -380Q161 -342 144 -295Q126 -249 116 -202Q106 -156 106 -118Q106 -57 124 -28Q143 1 174 1Z"],
  "e": [456, 28, 422, -470, 10, "M176 10Q128 10 94 -10Q62 -30 44 -66Q28 -102 28 -150Q28 -208 48 -264Q70 -321 108 -368Q146 -414 197 -442Q248 -470 308 -470Q362 -470 392 -443Q422 -416 422 -377Q422 -336 394 -305Q366 -274 319 -253Q272 -232 216 -220Q160 -208 102 -204V-206Q148 -208 186 -217Q224 -225 254 -240Q284 -254 305 -276Q326 -298 336 -328Q348 -358 348 -398Q348 -424 338 -446Q328 -468 301 -468Q272 -468 247 -451Q221 -434 199 -405Q176 -375 158 -338Q140 -301 128 -260Q115 -219 108 -179Q102 -138 102 -102Q102 -40 125 -16Q148 6 183 6Q228 6 265 -12Q302 -30 331 -61Q360 -92 380 -130L382 -129Q362 -91 332 -60Q302 -28 263 -9Q224 10 176 10Z"],
  "f": [336, -205, 496, -760, 260, "M-92 260Q-132 260 -157 244Q-182 228 -194 205Q-205 182 -205 161Q-205 134 -190 119Q-176 104 -153 104Q-134 104 -118 116Q-102 127 -102 154Q-102 170 -109 181Q-116 192 -129 198Q-141 204 -156 204Q-167 204 -178 200Q-189 196 -196 186Q-204 177 -204 161H-203Q-203 182 -192 204Q-180 227 -156 242Q-132 258 -92 258Q-66 258 -46 241Q-26 224 -11 194Q4 164 16 124Q28 85 38 40L167 -512Q178 -558 194 -602Q212 -646 237 -682Q262 -718 298 -739Q334 -760 382 -760Q423 -760 448 -744Q473 -728 484 -705Q496 -682 496 -661Q496 -634 482 -619Q468 -604 444 -604Q426 -604 409 -616Q392 -628 392 -654Q392 -668 399 -680Q406 -692 417 -698Q429 -704 444 -704Q452 -704 462 -702Q470 -699 478 -694Q486 -688 490 -680Q495 -672 495 -661H494Q494 -681 483 -704Q472 -726 448 -742Q423 -758 382 -758Q356 -758 336 -741Q317 -724 302 -694Q288 -664 276 -624Q264 -585 254 -540L124 12Q114 58 96 102Q80 146 54 182Q28 218 -7 239Q-43 260 -92 260ZM52 -458V-460H372V-458Z"],
  "g": [585, -45, 570, -470, 260, "M150 260Q76 260 33 242Q-10 225 -27 196Q-45 168 -45 136Q-45 105 -27 79Q-9 53 18 34Q45 14 72 3Q100 -8 119 -8H122Q94 -8 72 11Q50 30 37 63Q24 96 24 137Q24 192 52 224Q78 258 141 258Q210 258 266 241Q322 225 361 198Q400 170 422 135Q442 100 442 62Q442 33 421 21Q400 9 362 9Q353 9 332 9Q310 9 283 9Q256 9 230 9Q203 9 183 9Q163 9 156 9Q112 9 80 -3Q48 -15 30 -36Q13 -58 13 -86Q13 -110 26 -130Q38 -150 62 -164Q84 -178 116 -186Q148 -194 185 -194V-193Q134 -193 110 -170Q87 -146 87 -120Q87 -97 103 -84Q118 -72 142 -67Q165 -62 187 -62Q204 -62 230 -62Q255 -62 280 -63Q304 -63 318 -63Q374 -63 412 -41Q450 -19 450 42Q450 96 424 138Q397 178 353 206Q308 233 256 246Q202 260 150 260ZM259 -160Q218 -160 186 -176Q154 -193 136 -224Q118 -254 118 -296Q118 -344 144 -384Q171 -423 215 -446Q258 -470 309 -470Q350 -470 382 -452Q414 -434 432 -403Q450 -371 450 -328Q450 -281 424 -243Q397 -204 354 -182Q310 -160 259 -160ZM244 -163Q264 -163 285 -178Q306 -193 324 -218Q343 -243 357 -273Q372 -303 380 -333Q388 -364 388 -388Q388 -422 372 -444Q357 -466 324 -466Q304 -466 283 -451Q262 -436 244 -411Q225 -386 211 -357Q196 -327 188 -297Q180 -266 180 -242Q180 -208 196 -186Q211 -163 244 -163ZM506 -465Q532 -465 551 -448Q570 -432 570 -400Q570 -379 557 -364Q544 -350 524 -350Q506 -350 491 -361Q476 -373 476 -394Q476 -418 490 -430Q504 -442 522 -442Q538 -442 550 -434Q562 -428 567 -414Q563 -438 546 -450Q529 -463 506 -463Q483 -463 464 -452Q445 -440 428 -416Q410 -392 391 -354L390 -354Q416 -410 442 -438Q469 -465 506 -465Z"],
  "h": [553, 15, 533, -750, 10, "M15 0 216 -748H132V-750H298L98 0ZM378 10Q342 10 321 -6Q300 -22 300 -51Q300 -59 302 -69Q304 -80 308 -92L370 -308Q384 -352 388 -386Q394 -420 385 -439Q377 -458 349 -458Q322 -458 292 -430Q261 -403 231 -356Q200 -310 175 -252Q149 -194 132 -133H132Q141 -171 158 -216Q176 -262 199 -306Q222 -351 250 -388Q278 -425 310 -447Q340 -470 373 -470Q416 -470 438 -449Q460 -428 464 -394Q467 -360 456 -320L373 -32Q372 -28 371 -23Q370 -18 370 -14Q370 6 391 6Q434 6 467 -32Q500 -68 532 -154L533 -153Q512 -96 490 -60Q468 -24 441 -7Q414 10 378 10Z"],
  "i": [284, 34, 294, -755, 10, "M111 10Q72 10 53 -7Q34 -24 34 -53Q34 -60 35 -69Q36 -77 38 -85L146 -458H68V-460H224L103 -31Q102 -27 102 -23Q101 -18 101 -15Q101 -6 105 0Q110 6 120 6Q150 6 174 -10Q198 -26 219 -61Q240 -96 262 -154L264 -153Q242 -96 221 -60Q199 -24 173 -7Q147 10 111 10ZM234 -634Q217 -634 204 -643Q190 -651 182 -665Q174 -678 174 -695Q174 -712 182 -725Q190 -739 204 -747Q217 -755 234 -755Q250 -755 264 -747Q278 -739 286 -725Q294 -712 294 -695Q294 -678 286 -665Q278 -651 264 -643Q250 -634 234 -634Z"],
  "j": [250, -212, 280, -760, 260, "M-114 260Q-138 260 -160 252Q-183 244 -198 228Q-212 212 -212 188Q-212 170 -205 158Q-198 146 -186 140Q-174 134 -160 134Q-138 134 -123 147Q-108 160 -108 183Q-108 202 -121 217Q-134 232 -158 232Q-180 232 -196 220Q-212 207 -212 188H-210Q-210 211 -196 226Q-182 242 -160 250Q-138 258 -114 258Q-80 258 -56 229Q-32 200 -15 150Q2 102 16 44L140 -458H68V-460H222L100 12Q88 58 69 103Q50 148 22 183Q-5 218 -39 239Q-73 260 -114 260ZM220 -640Q196 -640 178 -658Q160 -676 160 -700Q160 -725 178 -742Q196 -760 220 -760Q246 -760 263 -742Q280 -725 280 -700Q280 -676 263 -658Q246 -640 220 -640Z"],
  "k": [492, 15, 496, -750, 10, "M15 0 216 -748H126V-750H298L92 0ZM318 10Q284 10 267 -8Q250 -26 250 -63Q250 -67 251 -74Q252 -80 252 -85L264 -140Q268 -162 275 -187Q282 -212 284 -235Q285 -258 276 -272Q266 -287 238 -287Q202 -287 184 -270Q165 -252 157 -230Q148 -207 144 -190H142Q152 -236 170 -257Q186 -278 206 -284Q226 -289 246 -289Q272 -289 291 -281Q311 -273 323 -254Q336 -236 339 -203Q342 -170 336 -121L318 -24Q318 -22 318 -20Q318 -17 318 -16Q318 4 338 4Q366 4 394 -15Q422 -34 448 -71Q474 -108 495 -164L496 -162Q464 -80 420 -35Q376 10 318 10ZM202 -242Q190 -242 180 -244Q171 -247 166 -250L167 -252Q172 -249 180 -246Q188 -244 202 -244Q227 -244 243 -260Q259 -276 271 -302Q284 -328 296 -360Q318 -412 344 -441Q371 -470 410 -470Q432 -470 448 -459Q464 -448 473 -429Q482 -410 482 -384Q482 -359 465 -344Q449 -329 430 -329Q412 -329 396 -342Q380 -354 380 -379Q380 -400 395 -413Q410 -426 431 -426Q444 -426 455 -420Q466 -415 474 -406Q480 -396 480 -384H480Q480 -408 471 -428Q462 -446 447 -457Q432 -468 410 -468Q372 -468 345 -438Q318 -408 298 -359Q285 -325 272 -298Q259 -272 243 -257Q226 -242 202 -242Z"],
  "l": [288, 25, 288, -750, 10, "M106 10Q66 10 46 -8Q25 -25 25 -53Q25 -63 26 -71Q28 -78 30 -85L208 -748H110V-750H288L94 -30Q94 -26 93 -22Q92 -17 92 -14Q92 6 113 6Q142 6 166 -10Q190 -26 211 -62Q232 -97 254 -154L255 -153Q234 -96 212 -60Q190 -24 164 -7Q139 10 106 10Z"],
  "m": [816, 25, 786, -470, 10, "M630 10Q590 10 574 -8Q556 -26 556 -54Q556 -65 559 -75Q561 -84 563 -92L626 -308Q647 -380 648 -422Q650 -464 622 -464Q586 -464 552 -434Q518 -404 490 -356Q461 -307 439 -249Q416 -190 402 -133H400Q414 -190 437 -249Q459 -308 488 -358Q518 -408 554 -439Q589 -470 630 -470Q674 -470 696 -449Q716 -428 719 -394Q721 -360 709 -320L626 -32Q624 -28 624 -22Q623 -17 623 -12Q623 -4 628 1Q634 6 643 6Q672 6 696 -10Q720 -26 741 -61Q763 -96 784 -154L786 -153Q764 -96 742 -60Q720 -24 694 -7Q667 10 630 10ZM25 0 134 -458H65V-460H215L105 0ZM290 0 365 -308Q383 -382 386 -422Q388 -464 362 -464Q325 -464 290 -434Q256 -404 226 -356Q197 -307 174 -249Q151 -190 136 -133H135Q150 -190 172 -249Q195 -308 225 -358Q256 -408 292 -439Q330 -470 372 -470Q413 -470 433 -449Q452 -428 455 -394Q458 -360 448 -320L370 0Z"],
  "n": [574, 22, 537, -470, 10, "M382 10Q342 10 323 -6Q303 -21 303 -53Q303 -64 305 -72Q307 -80 309 -87L374 -308Q386 -347 392 -381Q398 -416 390 -437Q383 -458 354 -458Q328 -458 296 -430Q265 -401 234 -353Q202 -306 177 -248Q151 -190 136 -133H136Q144 -170 161 -215Q178 -260 202 -304Q226 -349 254 -386Q282 -424 314 -447Q344 -470 376 -470Q420 -470 442 -449Q464 -428 467 -394Q470 -360 459 -320L377 -32Q376 -27 375 -22Q374 -18 374 -14Q374 -6 378 0Q382 6 393 6Q438 6 471 -32Q504 -68 536 -154L537 -153Q516 -96 494 -60Q472 -24 445 -7Q418 10 382 10ZM22 0 132 -458H60V-460H215L105 0Z"],
  "o": [482, 30, 446, -470, 10, "M178 10Q103 10 66 -36Q30 -82 30 -150Q30 -215 52 -273Q74 -331 111 -375Q148 -420 197 -445Q245 -470 298 -470Q374 -470 410 -424Q446 -378 446 -310Q446 -244 425 -186Q403 -128 366 -84Q328 -40 280 -15Q232 10 178 10ZM168 8Q196 8 222 -11Q248 -30 272 -62Q296 -94 316 -134Q336 -174 351 -219Q366 -264 374 -307Q382 -350 382 -388Q382 -424 364 -446Q346 -468 308 -468Q281 -468 254 -449Q228 -430 204 -398Q180 -366 160 -326Q140 -285 125 -240Q110 -196 102 -153Q94 -110 94 -72Q94 -36 112 -14Q130 8 168 8Z"],
  "p": [550, -100, 490, -470, 250, "M-24 250 166 -458H94V-460H232L192 -289L174 -213L168 -172L56 250ZM-100 250V248H140V250ZM237 5Q263 5 288 -18Q314 -42 336 -80Q359 -118 376 -165Q394 -212 404 -260Q414 -307 414 -348Q414 -401 396 -431Q379 -461 346 -461Q316 -461 290 -440Q262 -420 240 -385Q218 -350 202 -307Q186 -264 176 -220Q168 -176 168 -136Q168 -78 182 -36Q196 5 237 5ZM247 10Q212 10 194 -11Q176 -32 171 -66Q166 -100 166 -136Q166 -170 172 -207Q178 -244 190 -282Q202 -319 219 -353Q236 -386 258 -413Q280 -440 307 -455Q334 -470 364 -470Q430 -470 460 -427Q490 -384 490 -308Q490 -250 470 -194Q448 -138 413 -92Q378 -46 334 -18Q292 10 247 10Z"],
  "q": [498, 25, 476, -470, 250, "M204 250 308 -136Q318 -156 328 -189Q338 -223 342 -248L347 -279L392 -450L476 -470L282 250ZM124 250V248H369V250ZM152 10Q84 10 55 -33Q25 -76 25 -152Q25 -210 46 -266Q67 -322 102 -368Q138 -414 181 -442Q224 -470 268 -470Q304 -470 321 -450Q338 -429 344 -396Q350 -362 350 -324Q350 -291 344 -254Q338 -216 326 -178Q314 -141 296 -107Q279 -74 257 -47Q234 -20 208 -5Q182 10 152 10ZM169 1Q198 1 226 -20Q252 -40 275 -74Q297 -109 314 -152Q330 -194 339 -239Q348 -284 348 -324Q348 -363 342 -395Q336 -427 321 -446Q306 -465 278 -465Q252 -465 226 -441Q201 -418 178 -378Q156 -340 138 -292Q121 -246 111 -198Q101 -152 101 -112Q101 -59 119 -29Q138 1 169 1Z"],
  "r": [444, 20, 395, -470, 0, "M20 0 134 -458H56V-460H209L99 0ZM138 -173Q146 -209 158 -250Q170 -290 186 -329Q202 -368 222 -400Q242 -432 267 -450Q292 -470 322 -470Q356 -470 376 -451Q395 -432 395 -406Q395 -382 382 -365Q368 -348 344 -348Q319 -348 304 -364Q289 -380 289 -404Q289 -424 303 -437Q317 -450 343 -450Q364 -450 379 -438Q394 -426 394 -406H393Q393 -431 375 -449Q356 -468 322 -468Q292 -468 268 -448Q243 -430 223 -398Q204 -366 188 -328Q172 -289 160 -249Q148 -208 140 -173Z"],
  "s": [407, 15, 382, -469, 10, "M180 10Q138 10 101 -3Q63 -16 39 -42Q15 -68 15 -105Q15 -127 28 -143Q42 -160 65 -160Q86 -160 98 -145Q112 -131 112 -109Q112 -86 97 -74Q82 -62 64 -62Q50 -62 40 -66Q28 -71 22 -80Q16 -90 16 -105H17Q17 -68 40 -43Q64 -18 102 -5Q139 8 180 8Q208 8 239 -1Q270 -10 291 -30Q313 -50 313 -83Q313 -111 296 -132Q279 -154 252 -172Q225 -190 194 -207Q164 -224 137 -244Q110 -263 93 -287Q76 -310 76 -342Q76 -379 98 -408Q119 -436 157 -453Q195 -469 244 -469Q288 -469 319 -456Q350 -442 366 -422Q382 -401 382 -380Q382 -353 368 -341Q354 -328 337 -328Q318 -328 304 -340Q290 -352 290 -376Q290 -396 303 -410Q316 -424 337 -424Q358 -424 370 -411Q381 -399 381 -380H380Q380 -400 364 -420Q348 -440 318 -454Q288 -467 244 -467Q218 -467 191 -460Q163 -452 144 -435Q124 -418 124 -388Q124 -364 141 -344Q158 -326 184 -309Q211 -293 241 -277Q270 -260 297 -240Q324 -220 340 -194Q357 -168 357 -132Q357 -88 331 -56Q305 -24 264 -7Q224 10 180 10Z"],
  "t": [321, 48, 321, -560, 10, "M136 10Q105 10 86 0Q66 -10 57 -25Q48 -41 48 -58Q48 -66 50 -80Q52 -95 56 -110L178 -560H258L115 -37Q113 -32 112 -25Q110 -18 110 -11Q110 7 141 7Q168 7 192 -4Q216 -16 238 -37Q259 -59 278 -91Q296 -122 312 -164L314 -163Q292 -108 266 -69Q240 -30 208 -10Q176 10 136 10ZM51 -458V-460H321V-458Z"],
  "u": [566, 31, 526, -460, 10, "M124 10Q76 10 54 -11Q33 -32 31 -66Q29 -100 38 -141L110 -458H40V-460H195L123 -152Q114 -113 108 -78Q102 -44 110 -22Q117 -1 147 -1Q172 -1 204 -30Q236 -58 267 -106Q298 -154 324 -212Q350 -270 364 -327H366Q358 -290 340 -245Q322 -200 299 -155Q275 -110 246 -73Q218 -36 187 -13Q156 10 124 10ZM380 10Q341 10 321 -10Q301 -30 301 -52Q301 -58 302 -68Q304 -77 306 -85L396 -460H480L366 -31Q366 -26 365 -22Q364 -17 364 -13Q364 6 383 6Q412 6 437 -10Q461 -26 482 -62Q504 -97 525 -154L526 -153Q505 -96 483 -60Q461 -24 436 -7Q411 10 380 10Z"],
  "v": [502, 15, 456, -470, 10, "M203 10Q155 10 128 -7Q102 -24 94 -56Q87 -88 98 -131L169 -430Q170 -434 171 -439Q172 -444 172 -448Q172 -456 166 -460Q162 -464 152 -464Q130 -464 112 -454Q94 -444 77 -425Q60 -406 46 -378Q31 -349 16 -312L15 -312Q30 -350 44 -379Q60 -408 77 -428Q94 -448 116 -459Q138 -470 164 -470Q200 -470 220 -450Q242 -431 242 -402Q242 -392 240 -382Q238 -374 237 -368L179 -118Q170 -79 167 -52Q164 -24 174 -10Q183 5 210 5Q244 5 279 -20Q314 -44 345 -86Q376 -128 401 -178Q426 -228 440 -281Q454 -334 454 -379Q454 -409 446 -428Q438 -448 422 -458Q408 -467 388 -467V-468Q404 -468 418 -461Q432 -454 440 -442Q448 -430 448 -412Q448 -388 430 -372Q412 -355 388 -355Q362 -355 348 -370Q332 -386 332 -412Q332 -435 348 -452Q364 -469 388 -469Q408 -469 423 -459Q438 -450 448 -430Q456 -410 456 -379Q456 -334 442 -280Q428 -228 403 -176Q378 -125 345 -83Q313 -40 276 -15Q240 10 203 10Z"],
  "w": [712, 12, 680, -470, 10, "M428 10Q395 10 370 0Q344 -10 330 -32Q314 -54 312 -92Q310 -128 324 -182L390 -460H470L401 -166Q394 -134 386 -104Q380 -73 379 -48Q379 -23 391 -8Q403 6 434 6Q486 6 526 -24Q566 -54 595 -101Q624 -148 642 -203Q660 -257 669 -306Q678 -356 678 -389Q678 -419 661 -443Q644 -467 620 -467V-468Q638 -468 649 -458Q660 -449 666 -436Q672 -424 672 -412Q672 -386 657 -370Q642 -355 618 -355Q592 -355 576 -370Q560 -385 560 -410Q560 -434 576 -452Q593 -469 620 -469Q646 -469 662 -444Q680 -420 680 -389Q680 -356 671 -306Q662 -256 644 -201Q626 -146 597 -98Q568 -50 526 -20Q484 10 428 10ZM168 10Q120 10 95 -11Q70 -32 66 -66Q62 -101 75 -141L174 -432Q176 -436 177 -442Q178 -447 178 -450Q178 -467 159 -467Q122 -467 96 -448Q70 -428 51 -392Q32 -356 13 -306L12 -307Q30 -357 50 -394Q70 -430 97 -450Q124 -470 167 -470Q206 -470 226 -455Q245 -440 245 -414Q245 -404 244 -391Q242 -378 238 -368L150 -112Q130 -54 138 -24Q146 5 176 5Q214 5 240 -19Q267 -42 286 -84Q306 -124 320 -177Q336 -230 350 -287H352Q340 -241 328 -198Q316 -154 302 -116Q288 -78 270 -50Q252 -22 226 -6Q202 10 168 10Z"],
  "x": [506, -40, 522, -470, 10, "M341 10Q306 10 286 -14Q266 -37 255 -73Q246 -105 231 -154Q216 -202 200 -256Q184 -309 169 -356Q154 -402 144 -429Q141 -437 137 -447Q132 -458 118 -458Q104 -458 88 -446Q72 -436 56 -411Q40 -386 25 -346L23 -346Q48 -414 79 -442Q110 -470 156 -470Q191 -470 209 -446Q226 -422 238 -386Q248 -353 262 -307Q276 -261 291 -210Q307 -160 322 -112Q338 -65 351 -29Q354 -21 361 -13Q368 -5 381 -5Q392 -5 408 -16Q424 -28 441 -51Q457 -74 469 -110L471 -109Q446 -42 413 -16Q380 10 341 10ZM36 10Q9 10 -8 -2Q-24 -14 -32 -32Q-40 -50 -40 -66Q-40 -93 -26 -110Q-10 -126 18 -126Q48 -126 60 -107Q73 -88 73 -69Q73 -56 67 -44Q62 -32 50 -24Q38 -16 18 -16Q8 -16 -6 -23Q-19 -30 -29 -41Q-40 -52 -40 -66H-38Q-38 -38 -19 -15Q0 8 36 8Q58 8 76 -3Q94 -14 107 -28Q120 -42 128 -51Q140 -68 154 -89Q166 -110 184 -142Q202 -173 230 -220H232Q210 -184 188 -144Q166 -104 143 -68Q120 -34 93 -12Q67 10 36 10ZM252 -240H250Q272 -276 294 -316Q316 -356 339 -392Q362 -426 388 -448Q414 -470 446 -470Q472 -470 489 -458Q506 -446 514 -428Q522 -410 522 -394Q522 -367 507 -350Q492 -334 464 -334Q434 -334 421 -353Q408 -372 408 -391Q408 -410 422 -427Q434 -444 464 -444Q474 -444 487 -437Q500 -430 511 -419Q521 -408 521 -394H520Q520 -422 500 -445Q481 -468 446 -468Q424 -468 406 -457Q388 -446 374 -432Q361 -418 354 -409Q342 -392 328 -371Q316 -350 298 -319Q280 -288 252 -240Z"],
  "y": [498, -68, 532, -470, 260, "M41 260Q8 260 -17 246Q-42 232 -55 208Q-68 184 -68 151Q-68 134 -60 119Q-53 104 -39 94Q-26 85 -6 85Q6 85 19 90Q32 96 41 108Q50 120 50 138Q50 163 34 178Q18 194 -1 194Q-14 194 -30 189Q-45 184 -56 175Q-67 166 -67 151H-66Q-66 183 -53 207Q-40 231 -15 244Q9 258 41 258Q80 258 125 231Q170 204 218 157Q265 111 310 53Q356 -4 395 -66Q435 -128 466 -186Q496 -244 513 -291Q530 -338 530 -366Q530 -386 524 -410Q517 -434 500 -450Q484 -468 454 -468V-468Q472 -468 486 -460Q500 -452 508 -440Q516 -427 516 -413Q516 -396 508 -384Q500 -370 486 -363Q472 -356 454 -356Q424 -356 408 -373Q392 -390 392 -413Q392 -436 409 -453Q426 -470 454 -470Q484 -470 501 -452Q518 -435 526 -411Q532 -386 532 -366Q532 -338 515 -291Q498 -244 468 -185Q437 -127 397 -65Q358 -4 312 54Q266 112 219 159Q172 206 126 233Q80 260 41 260ZM312 52Q294 20 276 -23Q258 -66 242 -114Q225 -162 210 -212Q194 -260 182 -304Q169 -348 159 -382Q148 -416 142 -434Q138 -442 131 -449Q124 -456 107 -456Q90 -456 66 -435Q42 -414 16 -346L15 -346Q32 -392 50 -418Q69 -446 93 -458Q116 -470 148 -470Q190 -470 210 -446Q230 -422 240 -386Q251 -352 263 -306Q276 -259 291 -209Q307 -158 326 -110Q346 -63 370 -27Q362 -16 356 -6Q349 3 342 12Q336 20 328 30Q321 40 312 52Z"],
  "z": [401, -53, 391, -470, 10, "M-53 9 389 -469 391 -468 -51 10ZM-51 10 -52 9Q-5 -33 32 -56Q70 -78 101 -86Q132 -95 158 -95Q178 -95 193 -88Q208 -82 222 -74Q236 -65 252 -58Q268 -52 288 -52Q314 -52 330 -73Q346 -94 354 -119Q362 -145 362 -160H363Q360 -145 352 -135Q344 -126 333 -121Q322 -116 310 -116Q298 -116 286 -122Q274 -128 265 -140Q257 -151 257 -166Q257 -192 274 -205Q291 -217 310 -217Q325 -217 337 -211Q350 -206 357 -193Q364 -180 364 -160Q364 -142 354 -113Q344 -84 326 -56Q308 -28 284 -9Q258 10 228 10Q204 10 187 2Q170 -5 154 -14Q138 -24 120 -32Q102 -39 77 -39Q41 -39 7 -26Q-27 -14 -51 10ZM18 -290 60 -470Q86 -454 114 -446Q142 -438 169 -434Q196 -430 219 -430Q237 -430 261 -432Q285 -434 310 -438Q335 -442 356 -450Q377 -458 389 -470L391 -468Q369 -446 342 -425Q314 -404 284 -389Q254 -373 224 -364Q195 -354 168 -354Q136 -354 100 -368Q65 -380 46 -398L20 -290Z"],
  "0": [620, 71, 643, -760, 10, "M272 10Q208 10 163 -21Q118 -52 94 -104Q71 -154 71 -214Q71 -300 91 -381Q111 -462 146 -531Q182 -600 229 -651Q276 -702 330 -731Q384 -760 442 -760Q506 -760 551 -729Q596 -698 620 -646Q643 -596 643 -536Q643 -450 623 -369Q603 -288 568 -219Q532 -150 485 -99Q438 -48 384 -19Q330 10 272 10ZM272 8Q306 8 338 -14Q369 -35 396 -72Q424 -110 447 -158Q470 -206 488 -260Q506 -314 519 -369Q532 -424 538 -474Q545 -525 545 -566Q545 -598 541 -632Q537 -666 526 -694Q516 -723 495 -740Q474 -758 442 -758Q408 -758 376 -736Q345 -715 318 -678Q290 -640 267 -592Q244 -544 226 -490Q208 -436 195 -381Q182 -326 176 -276Q169 -225 169 -184Q169 -152 173 -118Q177 -84 188 -56Q198 -27 219 -10Q240 8 272 8Z"],
  "1": [434, -40, 335, -750, 0, "M70 0 239 -748H122V-750H335L165 0ZM-40 0V-2H275V0Z"],
  "2": [550, -11, 567, -760, 0, "M-11 0 3 -65 294 -294Q328 -322 359 -355Q390 -388 415 -426Q439 -464 453 -506Q467 -548 467 -590Q467 -631 456 -668Q444 -705 417 -728Q390 -752 345 -752Q302 -752 262 -733Q223 -714 192 -682Q162 -650 144 -610Q126 -570 126 -527H124Q124 -542 134 -554Q143 -567 158 -574Q172 -582 189 -582Q211 -582 229 -567Q248 -552 248 -526Q248 -496 230 -479Q212 -462 185 -462Q159 -462 141 -479Q124 -496 124 -527Q124 -571 142 -612Q160 -654 193 -687Q226 -720 273 -740Q319 -760 375 -760Q436 -760 478 -739Q522 -718 544 -682Q567 -646 567 -600Q567 -570 553 -541Q538 -512 516 -484Q493 -457 467 -433Q440 -408 416 -389Q390 -369 373 -355L38 -90H461L477 -165H479L444 0Z"],
  "3": [520, 5, 531, -759, 10, "M206 10Q135 10 91 -12Q47 -33 26 -67Q5 -100 5 -136Q5 -168 22 -184Q39 -200 65 -200Q88 -200 103 -186Q118 -172 118 -145Q118 -129 110 -117Q102 -106 90 -99Q77 -92 62 -92Q48 -92 35 -98Q22 -104 14 -114Q6 -124 6 -136H7Q7 -90 34 -58Q60 -26 101 -10Q142 6 186 6Q236 6 273 -14Q310 -34 333 -66Q357 -99 368 -139Q380 -179 380 -220Q380 -248 375 -280Q370 -312 353 -341Q336 -370 304 -388Q272 -406 218 -406V-408Q299 -408 350 -394Q402 -380 430 -355Q459 -330 470 -296Q481 -261 481 -220Q481 -173 458 -132Q436 -90 396 -58Q358 -26 308 -8Q259 10 206 10ZM218 -406V-408Q278 -408 318 -431Q359 -454 384 -490Q408 -526 419 -564Q430 -602 430 -631Q430 -668 419 -695Q408 -722 382 -737Q356 -752 311 -752Q284 -752 255 -740Q226 -728 202 -709Q177 -689 162 -664Q146 -638 146 -610H146Q146 -625 154 -636Q164 -646 177 -651Q190 -656 202 -656Q218 -656 230 -650Q243 -644 251 -633Q259 -621 259 -604Q259 -584 250 -571Q241 -559 228 -554Q215 -548 202 -548Q188 -548 174 -555Q161 -562 153 -576Q144 -590 144 -610Q144 -637 160 -664Q176 -690 203 -712Q230 -733 266 -746Q301 -759 341 -759Q383 -759 418 -752Q452 -745 478 -729Q503 -712 517 -685Q531 -658 531 -616Q531 -578 514 -542Q498 -505 461 -474Q424 -443 364 -425Q304 -406 218 -406Z"],
  "4": [594, 35, 585, -750, 0, "M330 0 485 -736 39 -216H585V-214H35L495 -750H585L425 0ZM245 0V-2H510V0Z"],
  "5": [500, 0, 560, -804, 10, "M67 -377 197 -750H546L558 -804H560L530 -660H168L69 -377ZM181 10Q130 10 89 -10Q48 -30 24 -61Q0 -93 0 -129Q0 -150 8 -163Q16 -177 28 -184Q42 -191 56 -191Q69 -191 82 -185Q96 -180 105 -167Q114 -155 114 -135Q114 -118 108 -105Q100 -93 88 -86Q76 -80 62 -80Q46 -80 33 -87Q19 -94 10 -105Q1 -116 1 -129H2Q2 -101 16 -76Q30 -52 55 -33Q80 -14 110 -4Q140 7 171 7Q210 7 240 -12Q272 -30 295 -61Q318 -92 334 -130Q350 -168 357 -207Q365 -246 365 -280Q365 -328 354 -370Q343 -412 320 -439Q297 -466 260 -466Q220 -466 184 -455Q147 -444 118 -424Q88 -404 70 -377H68Q86 -406 116 -426Q147 -447 187 -458Q226 -470 272 -470Q335 -470 379 -449Q424 -429 446 -387Q470 -346 470 -280Q470 -224 446 -172Q422 -120 382 -79Q342 -38 290 -14Q238 10 181 10Z"],
  "6": [560, 50, 565, -760, 10, "M244 10Q188 10 145 -14Q101 -38 76 -89Q50 -140 50 -220Q50 -284 76 -357Q102 -430 150 -502Q197 -573 262 -632Q326 -690 403 -725Q480 -760 565 -760V-758Q512 -758 460 -734Q409 -710 363 -668Q316 -626 278 -571Q239 -516 211 -455Q182 -394 167 -331Q151 -268 151 -210L150 -170Q150 -123 160 -82Q170 -42 191 -17Q212 8 247 8Q280 8 309 -12Q338 -32 362 -64Q386 -98 404 -138Q421 -178 430 -221Q440 -263 440 -300Q440 -378 422 -428Q404 -479 359 -479Q317 -479 284 -458Q250 -436 225 -402Q200 -368 183 -326Q166 -285 158 -244Q150 -203 150 -170H148Q148 -200 154 -234Q160 -269 172 -305Q185 -341 204 -374Q223 -407 249 -433Q275 -460 308 -475Q341 -490 381 -490Q412 -490 440 -480Q468 -470 491 -448Q514 -425 527 -389Q540 -352 540 -300Q540 -244 515 -189Q490 -134 448 -89Q406 -44 354 -17Q300 10 244 10Z"],
  "7": [504, 114, 605, -750, 10, "M209 10Q184 10 166 -10Q148 -30 148 -66Q148 -96 167 -135Q186 -175 216 -220Q246 -265 279 -311Q313 -356 343 -398Q366 -430 399 -476Q431 -520 466 -568Q500 -615 531 -655H133L116 -580H114L150 -750H605Q605 -750 587 -726Q568 -702 539 -662Q510 -622 474 -575Q440 -528 406 -481Q372 -434 345 -397Q312 -350 280 -307Q248 -264 226 -229Q205 -194 205 -172Q205 -152 216 -142Q227 -132 242 -122Q256 -114 267 -100Q278 -86 278 -58Q278 -30 260 -10Q242 10 209 10Z"],
  "8": [550, 30, 550, -760, 10, "M245 10Q140 10 85 -32Q30 -75 30 -150Q30 -210 58 -263Q86 -316 143 -348Q200 -381 285 -381Q391 -381 446 -343Q500 -305 500 -230Q500 -170 472 -115Q444 -60 387 -25Q330 10 245 10ZM245 8Q274 8 299 -4Q324 -17 342 -39Q361 -62 374 -91Q387 -120 394 -153Q400 -186 400 -220Q400 -267 388 -303Q376 -338 350 -359Q324 -379 285 -379Q256 -379 231 -367Q206 -355 188 -335Q169 -314 156 -286Q143 -258 136 -226Q130 -194 130 -160Q130 -113 142 -75Q154 -37 180 -15Q206 8 245 8ZM305 -379Q244 -379 203 -399Q162 -419 141 -452Q120 -485 120 -525Q120 -570 138 -612Q156 -654 190 -688Q222 -721 267 -740Q312 -760 365 -760Q426 -760 467 -736Q508 -711 529 -673Q550 -635 550 -595Q550 -550 532 -511Q514 -472 481 -442Q448 -412 403 -396Q358 -379 305 -379ZM305 -381Q331 -381 354 -392Q377 -402 394 -422Q412 -441 425 -467Q437 -494 444 -525Q450 -556 450 -590Q450 -627 443 -666Q436 -705 418 -732Q400 -758 365 -758Q339 -758 316 -746Q294 -733 276 -711Q258 -688 246 -659Q233 -630 226 -597Q220 -564 220 -530Q220 -493 227 -459Q234 -424 252 -403Q270 -381 305 -381Z"],
  "9": [560, -5, 510, -760, 10, "M-5 10V8Q48 8 100 -16Q151 -40 197 -82Q244 -124 282 -179Q321 -234 349 -295Q378 -356 393 -419Q409 -482 409 -540L410 -580Q410 -627 400 -668Q390 -708 369 -733Q348 -758 313 -758Q280 -758 251 -738Q222 -718 198 -686Q174 -652 156 -612Q139 -572 130 -529Q120 -487 120 -450Q120 -372 138 -322Q157 -271 201 -271Q243 -271 276 -292Q310 -314 335 -348Q360 -382 377 -424Q394 -465 402 -506Q410 -547 410 -580H412Q412 -551 406 -516Q400 -481 388 -445Q375 -409 356 -376Q337 -343 311 -317Q285 -290 252 -275Q220 -260 179 -260Q148 -260 120 -270Q92 -280 69 -302Q46 -325 33 -361Q20 -398 20 -450Q20 -506 45 -562Q70 -616 112 -661Q154 -706 206 -733Q260 -760 316 -760Q372 -760 416 -736Q460 -712 485 -661Q510 -610 510 -530Q510 -466 484 -393Q458 -320 410 -248Q363 -177 298 -118Q234 -60 157 -25Q80 10 -5 10Z"],
  "&": [796, 20, 786, -760, 10, "M550 10Q496 10 463 -15Q430 -40 411 -91L264 -470Q251 -501 245 -529Q238 -557 238 -583Q238 -633 268 -673Q298 -713 350 -736Q402 -760 469 -760Q502 -760 531 -752Q561 -744 584 -728Q608 -712 621 -689Q634 -666 634 -636Q634 -598 613 -568Q591 -538 555 -515Q518 -492 475 -473Q431 -454 387 -436L386 -438Q434 -458 468 -490Q502 -522 522 -558Q541 -594 541 -628Q541 -659 536 -689Q531 -718 516 -738Q500 -758 469 -758Q427 -758 399 -736Q371 -715 357 -683Q343 -652 343 -620Q343 -594 352 -558Q362 -522 382 -470L537 -66Q542 -51 550 -37Q558 -22 570 -13Q582 -4 602 -4Q629 -4 657 -24Q686 -44 696 -72L699 -70Q685 -38 647 -14Q610 10 550 10ZM240 10Q168 10 119 -11Q70 -32 45 -70Q20 -108 20 -160Q20 -217 43 -254Q66 -291 104 -316Q144 -340 193 -359Q242 -378 296 -400L297 -398Q248 -376 211 -342Q173 -308 152 -265Q130 -222 130 -170Q130 -146 136 -116Q142 -86 156 -59Q170 -32 195 -14Q220 3 259 3Q335 3 410 -22Q486 -47 553 -88Q620 -130 672 -179Q724 -228 754 -279Q784 -329 784 -371H785Q785 -358 775 -349Q765 -340 749 -335Q734 -330 716 -330Q696 -330 681 -338Q666 -346 657 -360Q648 -374 648 -392Q648 -408 656 -420Q664 -433 678 -441Q692 -449 710 -449Q734 -449 751 -439Q768 -429 777 -412Q786 -394 786 -371Q786 -329 756 -278Q726 -228 673 -177Q620 -126 550 -84Q481 -42 402 -16Q322 10 240 10Z"],
  "'": [200, 140, 244, -760, -488, "M143 -488Q152 -522 155 -546Q158 -570 156 -590Q154 -610 149 -632Q145 -653 141 -681Q140 -686 140 -690Q140 -694 140 -699Q140 -728 157 -744Q174 -760 195 -760Q217 -760 230 -746Q244 -731 244 -709Q244 -704 243 -700Q242 -694 241 -689Q234 -661 222 -640Q211 -618 197 -598Q184 -577 170 -551Q156 -526 145 -488Z"],
  ".": [200, 10, 130, -110, 10, "M70 10Q54 10 40 2Q26 -6 18 -20Q10 -34 10 -50Q10 -66 18 -80Q26 -94 40 -102Q54 -110 70 -110Q87 -110 100 -102Q114 -94 122 -80Q130 -66 130 -50Q130 -34 122 -20Q114 -6 100 2Q87 10 70 10Z"],
  ",": [214, -37, 144, -108, 156, "M-37 156V154Q-3 154 31 136Q65 118 92 88Q119 58 133 21Q146 -16 140 -54H141Q141 -36 132 -21Q123 -6 108 2Q92 10 72 10Q40 10 25 -6Q10 -23 10 -46Q10 -62 19 -77Q28 -91 43 -100Q58 -108 77 -108Q96 -108 112 -100Q127 -92 136 -74Q144 -58 144 -31Q144 2 128 36Q113 69 87 96Q62 124 29 140Q-3 156 -37 156Z"],
  "-": [360, 83, 323, -276, -274, "M83 -274V-276H323V-274Z"],
  "!": [318, 70, 330, -758, 10, "M168 -208Q177 -253 184 -300Q191 -348 196 -395Q200 -443 204 -489Q207 -535 208 -578Q210 -621 210 -659Q210 -687 216 -710Q222 -732 236 -745Q250 -758 274 -758Q300 -758 317 -739Q334 -720 328 -689Q322 -657 308 -613Q294 -568 276 -517Q257 -466 237 -412Q218 -358 200 -305Q182 -253 170 -208ZM129 10Q112 10 99 2Q86 -6 78 -19Q70 -32 70 -49Q70 -66 78 -79Q86 -92 99 -100Q112 -108 129 -108Q146 -108 159 -100Q172 -92 180 -79Q188 -66 188 -49Q188 -32 180 -19Q172 -6 159 2Q146 10 129 10Z"],
  "?": [550, 159, 595, -760, 10, "M256 -209 285 -344Q338 -360 386 -395Q434 -430 464 -481Q494 -531 494 -590Q494 -632 487 -670Q480 -708 456 -733Q430 -758 376 -758Q334 -758 296 -743Q260 -728 232 -704Q204 -680 188 -650Q172 -620 172 -591H171Q171 -606 179 -617Q187 -628 200 -634Q213 -640 227 -640Q242 -640 255 -633Q268 -627 276 -615Q284 -602 284 -585Q284 -565 275 -553Q266 -540 253 -535Q240 -530 227 -530Q212 -530 199 -536Q186 -543 178 -557Q170 -570 170 -591Q170 -622 186 -652Q202 -682 231 -706Q260 -730 297 -745Q334 -760 376 -760Q427 -760 468 -749Q508 -738 536 -716Q565 -694 580 -663Q595 -632 595 -590Q595 -548 577 -512Q558 -475 527 -445Q496 -416 456 -394Q416 -372 372 -358Q328 -346 286 -343L258 -209ZM220 10Q203 10 189 2Q176 -6 167 -20Q159 -34 159 -50Q159 -66 167 -80Q176 -94 189 -102Q203 -110 220 -110Q236 -110 250 -102Q263 -94 271 -80Q279 -66 279 -50Q279 -34 271 -20Q263 -6 250 2Q236 10 220 10Z"],
}
const SCRIPT: GlyphTable = {
  "A": [795, 0, 1034, -686, 2, "M104 2Q52 2 26 -18Q0 -39 0 -69Q0 -91 15 -100Q31 -109 46 -109Q54 -109 62 -104Q70 -99 70 -87Q70 -78 62 -70Q54 -63 43 -63Q37 -63 31 -64Q24 -64 20 -68V-64Q20 -41 40 -26Q60 -11 107 -11Q140 -11 174 -25Q208 -39 246 -64Q264 -78 281 -92Q299 -106 318 -122Q248 -148 207 -195Q167 -242 165 -294Q163 -328 179 -358Q195 -387 228 -406Q261 -424 308 -424Q374 -424 424 -385Q475 -347 501 -290L515 -303Q605 -393 671 -454Q738 -515 786 -554Q833 -593 868 -616Q903 -639 930 -653Q966 -672 990 -679Q1013 -686 1025 -686Q1034 -686 1034 -681Q1034 -679 1024 -675Q1017 -673 1003 -659Q990 -645 963 -611Q937 -577 891 -516Q846 -455 775 -361Q705 -266 602 -130Q690 -157 757 -214Q824 -271 853 -346Q858 -361 860 -361Q862 -361 865 -357Q868 -353 868 -347Q865 -305 844 -273Q823 -241 794 -212Q755 -174 701 -148Q646 -123 586 -110L502 0Q487 0 471 -1Q456 -2 446 -2Q438 -2 431 -1Q424 0 417 0Q436 -23 454 -45Q472 -67 490 -89Q494 -95 495 -98Q487 -98 480 -97Q472 -97 464 -97Q429 -97 396 -102Q364 -107 335 -116Q301 -86 275 -67Q249 -47 229 -36Q198 -16 167 -7Q136 2 104 2ZM522 -129Q660 -298 754 -408Q848 -518 905 -580Q962 -642 989 -667Q974 -661 957 -653Q940 -646 917 -632Q877 -608 825 -566Q773 -523 703 -459Q633 -396 540 -305L508 -274Q518 -250 523 -224Q528 -198 528 -172Q528 -150 522 -129ZM330 -131Q364 -160 403 -196Q441 -232 490 -279Q465 -337 417 -374Q369 -410 309 -410Q278 -410 252 -394Q226 -377 210 -351Q195 -325 195 -295Q195 -244 229 -200Q262 -155 330 -131ZM467 -111Q485 -111 501 -112Q507 -127 510 -143Q513 -159 513 -169Q513 -218 497 -263Q452 -220 415 -186Q377 -152 347 -126Q400 -111 467 -111Z"],
  "B": [797, 0, 1006, -703, 1, "M104 1Q61 1 30 -20Q0 -41 0 -69Q0 -92 15 -101Q30 -110 45 -110Q54 -110 62 -105Q70 -100 70 -88Q70 -79 62 -71Q54 -64 42 -64Q36 -64 30 -65Q24 -65 19 -69V-66Q19 -42 43 -27Q67 -12 107 -12Q132 -12 156 -19Q179 -26 208 -46Q238 -66 279 -105Q320 -144 378 -206Q437 -269 520 -360Q613 -467 696 -534Q779 -601 845 -636Q818 -664 770 -678Q722 -692 659 -692Q625 -692 586 -685Q547 -678 513 -666Q455 -644 398 -607Q342 -570 296 -526Q251 -482 224 -438Q197 -395 197 -360Q197 -331 217 -317Q236 -304 264 -304Q306 -304 356 -328Q407 -353 454 -396Q501 -438 535 -495Q569 -551 578 -615Q580 -625 581 -628Q582 -631 585 -631Q590 -631 590 -620Q590 -549 561 -490Q531 -430 482 -386Q433 -342 375 -317Q316 -293 259 -293Q230 -293 206 -309Q183 -326 183 -362Q183 -409 209 -458Q236 -506 283 -550Q330 -594 391 -629Q453 -663 523 -683Q593 -703 665 -703Q797 -703 868 -648Q907 -667 938 -675Q968 -684 990 -684Q1006 -684 1006 -679Q1006 -676 991 -674Q976 -671 947 -664Q919 -657 881 -637Q927 -594 927 -529Q927 -485 900 -444Q873 -402 829 -368Q785 -333 733 -312Q772 -278 772 -214Q772 -173 749 -134Q726 -96 687 -65Q647 -35 598 -17Q549 1 496 1Q449 1 432 -17Q415 -35 415 -53Q415 -79 437 -109Q459 -139 496 -167Q532 -194 577 -211Q622 -229 668 -229Q678 -229 678 -223Q678 -216 663 -216Q625 -216 584 -200Q543 -185 509 -160Q474 -135 453 -106Q431 -78 431 -53Q431 -38 445 -25Q458 -13 498 -13Q533 -13 571 -33Q610 -53 644 -88Q677 -124 698 -171Q720 -218 720 -273Q720 -292 712 -304Q688 -296 664 -292Q640 -287 616 -287Q594 -287 582 -294Q570 -302 570 -310Q570 -321 595 -331Q619 -341 650 -341Q684 -341 710 -328Q751 -348 789 -382Q827 -416 852 -462Q876 -508 876 -563Q876 -597 855 -624Q845 -617 833 -609Q822 -602 810 -593Q769 -562 729 -525Q690 -487 647 -437Q604 -387 553 -318Q461 -195 375 -122Q289 -48 211 -16Q184 -5 157 -2Q131 1 104 1ZM617 -303Q652 -303 695 -321Q679 -330 651 -330Q628 -330 612 -324Q595 -319 595 -313Q595 -310 601 -306Q607 -303 617 -303Z"],
  "C": [628, 146, 838, -716, 128, "M298 128Q290 128 275 91Q260 55 258 0Q213 -7 184 -37Q154 -68 154 -123Q154 -182 182 -246Q210 -310 258 -371Q202 -383 174 -418Q146 -453 146 -498Q146 -535 174 -573Q201 -611 249 -644Q296 -676 357 -696Q418 -716 485 -716Q501 -716 513 -714Q524 -712 524 -708Q524 -704 518 -704Q513 -704 504 -705Q495 -706 482 -706Q434 -706 379 -688Q324 -669 276 -637Q228 -605 198 -564Q167 -523 167 -478Q167 -447 193 -420Q219 -393 267 -382Q316 -443 380 -498Q444 -553 515 -594Q586 -636 656 -660Q727 -684 789 -684Q810 -684 824 -676Q838 -668 838 -648Q838 -615 807 -577Q775 -540 723 -503Q670 -467 604 -437Q539 -407 470 -387Q400 -368 337 -365Q272 -293 229 -224Q187 -155 187 -104Q187 -65 206 -43Q225 -21 258 -14Q258 -81 282 -143Q307 -205 349 -253Q390 -302 442 -330Q493 -358 547 -358Q588 -358 610 -339Q632 -320 632 -290Q632 -248 605 -198Q578 -147 530 -102Q482 -57 418 -28Q354 1 281 1Q275 1 272 0Q273 27 279 63Q285 99 301 119Q303 122 303 123Q303 125 303 125Q303 128 298 128ZM350 -378Q403 -384 467 -405Q531 -427 594 -458Q658 -488 710 -523Q763 -558 794 -590Q826 -623 826 -646Q826 -661 816 -667Q805 -672 788 -672Q752 -672 699 -648Q646 -624 586 -582Q525 -541 464 -488Q403 -436 350 -378ZM286 -12Q326 -12 368 -33Q410 -55 449 -89Q488 -124 519 -163Q550 -203 569 -241Q587 -279 587 -307Q587 -345 542 -345Q500 -345 454 -319Q407 -293 365 -248Q324 -203 298 -142Q272 -82 272 -13V-12Q275 -12 279 -12Q283 -12 286 -12Z"],
  "D": [792, 0, 985, -676, 3, "M88 3Q41 3 20 -8Q0 -20 0 -33Q0 -47 26 -61Q52 -75 101 -75Q126 -75 156 -69Q185 -63 236 -48Q237 -48 239 -48Q240 -47 242 -46Q293 -74 356 -136Q419 -197 512 -310Q554 -360 594 -408Q634 -456 688 -506Q720 -537 760 -563Q726 -616 667 -640Q607 -664 531 -664Q473 -664 418 -645Q364 -625 317 -594Q270 -562 234 -522Q198 -483 178 -444Q159 -404 159 -370Q159 -334 183 -313Q207 -292 251 -292Q282 -292 321 -308Q361 -324 402 -353Q444 -381 480 -417Q516 -453 539 -493Q562 -533 564 -573Q566 -584 570 -584Q576 -584 576 -574Q576 -521 549 -469Q522 -416 476 -373Q430 -330 371 -304Q313 -278 250 -278Q220 -278 193 -291Q165 -304 148 -327Q130 -350 130 -381Q130 -436 161 -488Q192 -541 247 -583Q301 -625 374 -651Q446 -676 528 -676Q613 -676 676 -649Q740 -623 778 -575Q826 -605 879 -626Q932 -647 978 -649Q985 -649 985 -645Q985 -642 983 -640Q980 -639 969 -637Q925 -632 881 -609Q837 -587 795 -551Q831 -491 831 -410Q831 -320 797 -245Q762 -170 703 -115Q644 -60 569 -29Q494 1 413 1Q376 1 342 -5Q309 -11 263 -24Q184 3 88 3ZM415 -14Q487 -14 555 -43Q624 -72 679 -125Q734 -178 767 -250Q800 -323 800 -408Q800 -482 776 -534Q720 -482 668 -407Q612 -326 556 -253Q499 -179 434 -122Q368 -65 286 -33Q311 -25 342 -19Q372 -14 415 -14ZM96 -13Q129 -13 159 -17Q189 -22 220 -36Q188 -44 158 -49Q129 -54 97 -54Q56 -54 35 -48Q14 -42 14 -33Q14 -13 96 -13Z"],
  "E": [485, 0, 739, -684, 139, "M188 139Q186 139 183 138Q180 137 176 132Q167 122 160 101Q154 80 151 56Q147 32 146 14V0Q80 -8 41 -43Q1 -78 0 -128Q0 -175 21 -218Q43 -261 83 -295Q124 -329 177 -348Q231 -367 294 -367H297Q284 -385 278 -409Q202 -425 153 -461Q105 -497 84 -543Q82 -547 82 -551Q81 -554 81 -556Q81 -562 85 -562Q90 -562 95 -550Q139 -450 275 -422Q275 -425 275 -433Q274 -490 301 -536Q328 -583 372 -616Q416 -649 469 -667Q521 -684 572 -684Q651 -684 695 -656Q739 -628 739 -578Q739 -540 712 -507Q685 -474 638 -449Q591 -425 529 -411Q468 -397 399 -397Q354 -397 319 -402Q323 -384 335 -365Q383 -360 407 -346Q432 -332 433 -317Q433 -301 407 -301Q386 -301 359 -314Q333 -327 311 -350Q263 -344 217 -321Q170 -298 133 -263Q95 -229 73 -189Q51 -150 51 -112Q52 -73 77 -47Q101 -21 147 -13Q151 -57 170 -99Q189 -141 219 -174Q249 -207 285 -227Q322 -247 362 -247Q393 -247 416 -227Q438 -207 438 -179Q438 -128 404 -87Q369 -46 310 -23Q251 1 179 1Q174 1 170 1Q166 0 161 0Q161 4 161 8Q161 11 161 15Q161 33 164 56Q167 79 174 98Q180 118 188 127Q193 133 193 135Q193 139 188 139ZM390 -411Q445 -411 503 -424Q561 -436 611 -460Q660 -483 691 -517Q721 -550 721 -592Q721 -625 686 -649Q651 -672 590 -672Q540 -672 491 -647Q442 -623 403 -584Q364 -545 340 -502Q317 -459 317 -422V-415Q334 -413 352 -412Q371 -411 390 -411ZM415 -312Q422 -312 422 -318Q422 -327 400 -338Q378 -349 346 -351Q361 -333 379 -323Q398 -312 415 -312ZM182 -11Q220 -11 261 -29Q302 -47 337 -76Q373 -104 394 -136Q416 -167 416 -192Q416 -212 401 -223Q386 -234 363 -234Q323 -234 279 -207Q234 -179 201 -129Q168 -79 162 -12Q167 -11 172 -11Q177 -11 182 -11Z"],
  "F": [612, 0, 1092, -769, 0, "M332 -397Q294 -397 272 -415Q250 -432 250 -464Q250 -505 282 -547Q314 -588 373 -622Q431 -656 510 -675Q553 -685 598 -688Q642 -690 687 -690Q739 -690 793 -682Q848 -673 898 -673Q968 -673 1011 -698Q1055 -722 1077 -760Q1081 -766 1083 -767Q1086 -769 1088 -769Q1092 -769 1092 -765Q1092 -763 1092 -761Q1091 -759 1088 -755Q1052 -698 990 -664Q929 -630 837 -630Q770 -630 701 -641Q633 -653 566 -653Q511 -653 457 -636Q403 -620 359 -593Q316 -566 290 -534Q264 -501 264 -469Q264 -445 277 -431Q289 -416 316 -416Q350 -416 386 -434Q423 -451 455 -479Q486 -506 507 -536Q528 -566 531 -591Q534 -601 536 -601Q541 -601 541 -591Q541 -554 522 -520Q503 -485 472 -458Q441 -430 404 -414Q368 -397 332 -397ZM113 0Q85 0 59 -9Q33 -19 17 -35Q0 -51 0 -71Q0 -92 15 -102Q30 -111 45 -111Q54 -111 62 -106Q70 -101 70 -89Q70 -80 62 -72Q54 -64 42 -64Q36 -64 30 -65Q24 -66 20 -69V-67Q20 -43 48 -28Q77 -13 117 -13Q150 -13 186 -24Q221 -35 262 -66Q303 -97 350 -155Q397 -213 453 -307Q453 -307 455 -311Q337 -284 272 -246Q207 -208 185 -170Q180 -160 176 -160Q172 -160 172 -164Q172 -168 176 -172Q188 -202 229 -232Q269 -263 330 -289Q391 -315 465 -330Q466 -330 467 -331Q527 -423 592 -482Q658 -540 715 -568Q772 -595 806 -595Q817 -595 817 -591Q817 -589 813 -588Q809 -587 796 -583Q739 -566 672 -505Q605 -443 544 -349Q574 -357 602 -365Q629 -373 647 -379Q651 -382 656 -386Q660 -391 664 -398Q669 -398 685 -397Q701 -396 716 -395Q732 -393 738 -391Q715 -381 690 -359Q666 -338 644 -310Q623 -282 610 -250Q606 -243 602 -243Q596 -243 596 -250Q596 -252 600 -264Q611 -293 621 -314Q630 -335 643 -354Q623 -347 593 -340Q562 -333 530 -327L528 -323Q452 -199 385 -128Q318 -58 253 -29Q187 0 113 0Z"],
  "G": [527, 0, 731, -703, 1, "M118 1Q70 1 35 -19Q0 -40 0 -69Q0 -91 15 -101Q30 -110 45 -110Q54 -110 62 -105Q70 -100 70 -87Q70 -78 62 -71Q54 -63 42 -63Q36 -63 30 -64Q24 -65 20 -68V-65Q20 -42 47 -27Q75 -11 122 -11Q162 -11 203 -31Q244 -51 292 -98Q340 -145 400 -226Q421 -253 454 -292Q487 -330 514 -359Q435 -303 381 -281Q327 -258 288 -258Q255 -258 235 -270Q216 -281 216 -315Q216 -326 218 -341Q200 -339 182 -339Q151 -339 125 -346Q98 -353 81 -363Q67 -370 67 -373Q67 -378 73 -378Q74 -378 79 -375Q104 -362 128 -355Q152 -349 189 -349Q204 -349 220 -351Q231 -398 266 -447Q300 -497 350 -542Q399 -588 456 -625Q513 -661 569 -682Q625 -703 672 -703Q704 -703 717 -693Q731 -682 731 -661Q731 -623 692 -578Q654 -532 585 -485Q517 -438 426 -396Q389 -380 350 -367Q311 -355 271 -348Q256 -317 256 -297Q256 -288 264 -279Q272 -271 295 -271Q339 -271 405 -305Q472 -339 581 -424Q607 -444 628 -457Q648 -469 656 -469Q660 -469 664 -468Q667 -466 667 -464Q667 -459 659 -456Q641 -447 620 -427Q599 -406 570 -367Q542 -329 502 -268Q330 1 118 1ZM278 -361Q313 -369 351 -384Q389 -399 432 -421Q495 -454 547 -490Q600 -527 638 -561Q677 -596 698 -623Q719 -651 719 -666Q719 -679 709 -686Q698 -692 681 -692Q645 -692 600 -670Q555 -648 507 -611Q459 -575 415 -531Q371 -487 335 -442Q299 -398 278 -361Z"],
  "H": [853, 0, 1183, -688, 1, "M93 1Q54 1 27 -18Q0 -38 0 -64Q0 -87 15 -96Q30 -105 45 -105Q54 -105 62 -100Q70 -95 70 -83Q70 -74 62 -66Q53 -59 42 -59Q36 -59 30 -60Q24 -61 19 -63V-61Q19 -40 40 -26Q61 -12 97 -12Q117 -12 136 -18Q155 -23 175 -33Q201 -45 230 -70Q260 -94 301 -138Q342 -183 400 -255Q370 -247 348 -239Q294 -221 243 -192Q192 -163 165 -122Q163 -118 160 -118Q156 -118 157 -122Q158 -123 158 -125Q158 -126 161 -131Q168 -148 188 -165Q208 -182 232 -197Q256 -212 275 -222Q297 -233 330 -245Q363 -257 412 -271Q472 -353 524 -412Q576 -471 606 -502Q557 -472 524 -461Q491 -449 467 -449Q442 -449 426 -461Q410 -474 410 -498Q410 -522 423 -546Q437 -570 477 -601Q496 -616 501 -623Q506 -629 506 -634Q506 -648 490 -658Q475 -667 442 -667Q406 -667 369 -654Q333 -640 304 -614Q297 -607 292 -607Q287 -607 287 -612Q287 -614 289 -617Q292 -620 295 -624Q323 -648 362 -663Q401 -677 442 -677Q482 -677 505 -662Q527 -647 527 -622Q527 -594 512 -568Q497 -542 452 -513Q437 -503 432 -498Q428 -493 428 -486Q428 -479 438 -471Q448 -462 474 -462Q504 -462 551 -485Q598 -508 644 -549Q689 -589 719 -614Q749 -639 769 -654Q790 -668 808 -677Q814 -680 819 -682Q823 -684 825 -684Q832 -684 832 -681Q832 -680 822 -673Q818 -671 811 -667Q803 -662 786 -649Q737 -609 680 -537Q623 -464 550 -362Q537 -344 523 -327Q509 -310 497 -294Q536 -304 583 -316Q629 -327 686 -341Q691 -348 698 -355Q704 -363 710 -371Q765 -435 827 -492Q889 -549 949 -594Q1009 -638 1059 -663Q1109 -688 1139 -688Q1161 -688 1172 -678Q1183 -668 1183 -654Q1183 -629 1153 -591Q1124 -553 1068 -510Q1012 -466 934 -424Q856 -382 759 -351Q708 -288 667 -229Q625 -170 600 -125Q576 -79 576 -56Q576 -32 585 -22Q594 -11 617 -11Q653 -11 692 -39Q731 -67 766 -117Q800 -167 820 -234Q824 -249 832 -249Q835 -249 837 -235Q839 -214 828 -184Q816 -153 794 -121Q772 -89 743 -62Q714 -34 681 -16Q647 1 613 1Q582 1 566 -19Q550 -40 550 -62Q550 -108 576 -172Q602 -235 673 -326Q629 -313 580 -302Q531 -290 483 -277Q407 -186 345 -126Q283 -67 225 -34Q192 -15 157 -7Q123 1 93 1ZM774 -368Q856 -399 928 -441Q999 -483 1052 -526Q1106 -570 1136 -606Q1166 -642 1166 -662Q1166 -678 1143 -678Q1114 -678 1072 -652Q1030 -626 979 -582Q929 -538 876 -482Q823 -426 774 -368Z"],
  "I": [651, 0, 993, -680, 1, "M111 1Q60 1 32 -20Q3 -41 0 -69Q-1 -92 12 -103Q26 -113 42 -115Q50 -116 58 -111Q67 -107 68 -95Q69 -85 62 -78Q55 -70 43 -68Q30 -66 21 -71V-68Q21 -44 45 -28Q69 -12 110 -12Q147 -12 185 -27Q223 -42 266 -78Q309 -114 361 -177Q333 -190 315 -218Q296 -247 296 -297Q296 -352 324 -407Q352 -462 402 -511Q452 -560 520 -598Q588 -636 670 -658Q751 -680 840 -680Q851 -680 862 -679Q872 -678 882 -676Q894 -676 904 -674Q915 -673 925 -673Q938 -673 950 -675Q962 -676 975 -676Q993 -676 993 -669Q993 -661 977 -660Q958 -659 944 -659Q930 -660 917 -660Q903 -656 893 -653Q882 -649 871 -645Q796 -611 718 -533Q639 -455 552 -329Q493 -244 429 -178H433Q484 -178 541 -204Q598 -229 648 -274Q697 -319 728 -378Q759 -438 759 -506Q759 -517 761 -519Q763 -521 765 -521Q771 -521 771 -497Q771 -426 740 -366Q708 -306 658 -260Q607 -215 546 -190Q486 -165 427 -165H416Q337 -88 257 -43Q176 1 111 1ZM370 -188Q388 -209 407 -235Q426 -260 447 -289Q541 -417 622 -496Q703 -574 771 -614Q838 -653 892 -663Q880 -665 865 -666Q851 -667 841 -667Q791 -667 733 -650Q675 -632 616 -602Q558 -572 504 -534Q451 -495 409 -452Q368 -409 344 -366Q319 -323 319 -285Q319 -242 333 -219Q347 -197 370 -188Z"],
  "J": [596, -255, 945, -684, 362, "M-210 362Q-234 362 -245 347Q-255 332 -255 317Q-255 275 -220 228Q-186 180 -123 133Q-61 85 23 45Q107 4 206 -22Q233 -58 260 -95Q287 -132 313 -169Q284 -186 264 -215Q245 -244 245 -284Q245 -346 274 -405Q303 -464 355 -515Q407 -565 476 -604Q545 -642 624 -663Q704 -684 787 -684Q812 -684 834 -681Q857 -677 877 -677Q889 -677 901 -679Q914 -681 927 -681Q945 -681 945 -674Q945 -667 929 -665Q914 -664 900 -664Q892 -664 884 -664Q875 -664 869 -664Q785 -644 690 -556Q596 -469 499 -321Q469 -279 440 -241Q412 -202 385 -166Q425 -166 470 -188Q516 -209 558 -245Q601 -281 636 -326Q670 -371 691 -417Q711 -464 711 -505Q711 -521 717 -521Q721 -521 721 -514Q722 -507 722 -498Q722 -450 703 -401Q683 -352 649 -308Q615 -263 571 -228Q527 -193 478 -173Q429 -153 379 -153H375Q353 -124 332 -97Q311 -70 291 -45Q327 -55 350 -61Q373 -66 391 -72Q410 -77 430 -84Q451 -92 482 -104Q493 -108 497 -111Q500 -113 502 -113Q502 -113 505 -112Q507 -111 507 -109Q506 -106 503 -103Q500 -100 490 -96Q468 -86 450 -79Q432 -72 410 -64Q388 -57 356 -47Q324 -38 274 -24Q185 87 114 161Q42 236 -16 280Q-73 324 -121 343Q-168 362 -210 362ZM322 -182 381 -266Q473 -396 560 -481Q646 -565 720 -611Q793 -656 844 -667Q832 -669 817 -670Q803 -671 793 -671Q743 -671 685 -654Q627 -637 569 -606Q510 -576 457 -537Q404 -498 362 -453Q320 -409 296 -363Q271 -318 271 -276Q271 -242 286 -219Q300 -195 322 -182ZM-209 350Q-157 350 -93 303Q-29 256 42 176Q114 97 189 0Q136 18 77 49Q18 79 -39 116Q-95 153 -140 191Q-186 229 -213 263Q-240 296 -240 320Q-240 333 -231 341Q-223 350 -209 350Z"],
  "K": [843, 0, 1274, -706, 7, "M97 1Q51 1 26 -18Q0 -38 0 -64Q0 -87 15 -96Q30 -105 45 -105Q53 -105 62 -100Q70 -95 70 -83Q70 -74 62 -66Q53 -59 42 -59Q36 -59 30 -60Q24 -61 19 -63V-61Q19 -40 40 -26Q61 -12 97 -12Q134 -12 181 -36Q229 -60 288 -117Q348 -174 421 -273Q462 -329 532 -398Q603 -468 685 -544Q639 -514 599 -497Q558 -480 519 -480Q498 -480 484 -490Q470 -500 470 -520Q470 -566 543 -619Q566 -635 566 -645Q566 -661 552 -668Q537 -675 513 -675Q467 -675 427 -656Q387 -637 356 -607Q325 -577 305 -544Q286 -511 279 -482Q275 -470 272 -470Q267 -470 267 -479Q267 -483 268 -486Q273 -507 291 -541Q309 -575 339 -609Q370 -643 414 -666Q458 -689 516 -689Q550 -689 572 -675Q594 -661 594 -640Q594 -615 577 -588Q561 -561 521 -537Q508 -528 500 -523Q492 -518 492 -509Q492 -503 500 -498Q507 -494 519 -494Q573 -494 632 -525Q691 -557 757 -613Q805 -651 834 -671Q864 -691 881 -698Q897 -706 905 -706Q912 -706 912 -702Q912 -698 907 -696Q891 -692 864 -675Q836 -658 793 -617Q750 -577 688 -505Q626 -433 541 -318Q414 -150 298 -74Q183 1 97 1ZM594 7Q528 7 528 -44Q528 -64 539 -93Q550 -122 581 -163Q612 -205 672 -264Q691 -282 699 -302Q707 -323 707 -334Q707 -339 705 -344Q676 -334 650 -334Q626 -333 611 -341Q596 -350 596 -359Q596 -367 609 -374Q622 -381 646 -382Q666 -382 683 -378Q700 -373 711 -362Q741 -376 773 -406Q805 -435 845 -480Q911 -553 977 -599Q1042 -645 1098 -667Q1154 -689 1190 -689Q1238 -689 1258 -671Q1278 -653 1273 -625Q1269 -603 1255 -590Q1240 -577 1225 -577Q1210 -577 1205 -586Q1199 -595 1201 -605Q1202 -615 1212 -623Q1222 -631 1234 -631Q1248 -631 1255 -624L1257 -632Q1260 -645 1246 -662Q1232 -678 1190 -678Q1169 -678 1143 -666Q1118 -654 1080 -624Q1042 -594 982 -538Q912 -469 846 -420Q781 -371 721 -349Q730 -333 730 -312Q730 -284 720 -253Q711 -222 683 -183Q655 -144 599 -94Q571 -69 562 -55Q554 -42 554 -33Q554 -20 564 -13Q574 -7 601 -7Q624 -7 655 -23Q687 -40 720 -70Q752 -101 779 -144Q806 -187 819 -239Q823 -254 826 -254Q832 -254 832 -236Q832 -208 817 -175Q802 -143 776 -110Q750 -78 719 -52Q688 -25 656 -9Q623 7 594 7ZM657 -348Q678 -349 697 -356Q688 -364 675 -368Q661 -372 647 -371Q636 -371 628 -366Q620 -362 620 -359Q620 -355 629 -351Q637 -347 657 -348Z"],
  "L": [750, 0, 1025, -684, 12, "M508 12Q475 12 433 5Q392 -2 350 -13Q309 -23 276 -33Q200 1 107 1Q52 1 26 -12Q0 -24 0 -39Q0 -62 30 -75Q61 -89 109 -89Q146 -89 184 -80Q223 -71 269 -55Q307 -79 347 -123Q388 -167 439 -237Q338 -241 276 -281Q215 -322 215 -386Q215 -428 242 -468Q269 -507 313 -533Q356 -559 407 -559Q415 -559 416 -557Q417 -555 417 -553Q417 -551 416 -550Q414 -548 402 -547Q352 -542 318 -519Q285 -495 268 -462Q251 -430 251 -397Q251 -322 305 -287Q359 -252 449 -251Q465 -273 481 -297Q498 -321 516 -348Q597 -469 668 -543Q739 -617 807 -651Q874 -684 944 -684Q980 -684 1002 -668Q1025 -652 1025 -625Q1025 -584 993 -536Q962 -488 908 -441Q855 -394 788 -352Q721 -311 650 -281Q579 -252 512 -242Q459 -171 407 -122Q354 -73 299 -43Q341 -28 393 -20Q445 -12 511 -12Q566 -12 599 -22Q632 -33 649 -45Q666 -57 671 -62Q678 -69 681 -64Q682 -61 679 -55Q677 -50 673 -46Q633 -11 592 1Q550 12 508 12ZM524 -258Q588 -269 655 -298Q721 -327 781 -367Q842 -407 889 -452Q937 -498 965 -543Q992 -588 992 -628Q992 -645 978 -659Q963 -673 941 -673Q862 -673 786 -610Q709 -546 638 -430Q608 -381 580 -338Q551 -295 524 -258ZM101 -11Q143 -11 178 -17Q213 -23 247 -42Q214 -51 178 -57Q143 -64 113 -64Q14 -64 14 -40Q14 -32 37 -21Q60 -11 101 -11Z"],
  "M": [935, 0, 1243, -726, 1, "M727 1Q697 1 682 -12Q667 -26 667 -45Q667 -60 680 -90Q693 -121 733 -182Q780 -251 838 -323Q897 -394 958 -460Q1020 -527 1076 -585Q1133 -644 1177 -687Q1155 -671 1128 -649Q1102 -626 1062 -591Q1023 -556 966 -502Q909 -448 827 -370Q786 -331 708 -250Q630 -169 525 -47Q500 -17 490 -10Q481 -3 476 -3Q472 -3 469 -8Q465 -13 465 -24Q465 -65 493 -132Q521 -198 573 -282Q625 -367 697 -461Q768 -555 854 -652Q826 -627 754 -552Q681 -477 553 -335Q441 -213 353 -138Q264 -63 195 -29Q137 0 92 0Q46 0 23 -17Q0 -35 0 -62Q0 -84 15 -95Q30 -106 45 -106Q53 -106 62 -101Q70 -96 70 -84Q70 -75 62 -67Q54 -60 42 -60Q36 -60 30 -61Q24 -62 19 -65Q19 -63 19 -62Q19 -60 19 -59Q19 -38 37 -25Q56 -13 91 -13Q127 -13 175 -34Q222 -56 286 -106Q350 -156 437 -241Q524 -326 640 -452Q737 -558 799 -617Q861 -677 893 -701Q924 -725 929 -725Q932 -725 937 -723Q942 -722 942 -720Q942 -717 935 -710Q930 -706 923 -700Q916 -693 905 -683Q893 -669 866 -633Q840 -596 806 -544Q771 -492 733 -431Q694 -371 656 -309Q618 -248 584 -192Q551 -137 527 -95Q502 -53 492 -32Q545 -93 589 -142Q632 -191 672 -234Q711 -276 753 -319Q795 -361 845 -409Q895 -458 958 -518Q1042 -596 1099 -642Q1155 -688 1189 -707Q1223 -726 1238 -726Q1243 -726 1243 -722Q1243 -719 1230 -710Q1217 -701 1203 -688Q1154 -646 1098 -580Q1042 -514 982 -435Q923 -356 866 -275Q808 -194 757 -122Q734 -88 723 -71Q712 -54 709 -46Q707 -39 707 -33Q707 -12 735 -12Q749 -12 773 -19Q797 -26 824 -40Q850 -53 870 -72Q872 -71 872 -66Q872 -59 870 -55Q849 -37 821 -25Q794 -12 769 -6Q743 1 727 1Z"],
  "N": [724, 0, 1385, -730, 9, "M466 9Q459 9 459 2Q459 -1 463 -4Q465 -6 468 -8Q470 -10 472 -13Q484 -28 494 -49Q504 -70 515 -104Q526 -138 541 -189Q567 -276 615 -382Q664 -489 723 -590Q686 -544 655 -505Q624 -466 592 -429Q561 -391 525 -349Q488 -308 440 -255Q326 -130 243 -65Q159 1 98 1Q48 1 24 -19Q0 -38 0 -65Q0 -87 15 -96Q30 -106 45 -106Q54 -106 62 -101Q70 -95 70 -83Q70 -74 62 -67Q54 -59 43 -59Q37 -59 31 -60Q24 -61 20 -64V-61Q20 -40 38 -26Q57 -12 97 -12Q127 -12 174 -37Q221 -62 288 -122Q354 -181 445 -282Q598 -455 679 -556Q760 -656 768 -668Q776 -679 780 -679Q784 -679 784 -674Q784 -671 782 -668L775 -655Q763 -635 756 -616Q750 -597 744 -577Q736 -551 729 -524Q722 -497 711 -462Q701 -427 683 -378Q663 -324 643 -282Q623 -240 598 -195Q573 -150 537 -87Q560 -115 598 -161Q637 -207 684 -262Q732 -318 783 -375Q834 -432 883 -481Q969 -571 1039 -626Q1108 -680 1167 -705Q1226 -730 1281 -730Q1332 -730 1358 -708Q1385 -685 1385 -644Q1386 -613 1364 -576Q1342 -540 1303 -505Q1265 -470 1213 -445Q1195 -437 1186 -437Q1181 -437 1181 -440Q1181 -444 1189 -448Q1229 -463 1267 -493Q1305 -523 1330 -560Q1354 -598 1354 -635Q1354 -674 1334 -695Q1313 -716 1275 -716Q1221 -716 1156 -685Q1092 -654 1012 -585Q932 -517 830 -405Q749 -316 683 -239Q617 -162 569 -104Q521 -45 493 -14Q480 1 475 5Q469 9 466 9ZM248 -398Q210 -398 177 -413Q144 -427 124 -457Q104 -487 104 -533Q104 -579 131 -615Q159 -652 209 -674Q258 -695 323 -695Q359 -695 391 -690Q422 -685 460 -669Q485 -659 507 -649Q529 -638 557 -625Q574 -619 591 -614Q609 -610 625 -610Q643 -610 662 -617Q682 -625 695 -636Q704 -644 707 -644Q710 -644 710 -640Q710 -636 704 -629Q690 -616 669 -606Q648 -596 627 -591Q605 -585 590 -585Q560 -585 520 -596Q480 -607 450 -625Q412 -647 385 -658Q359 -669 339 -673Q319 -676 299 -676Q250 -676 209 -657Q168 -638 144 -605Q119 -572 119 -530Q119 -478 154 -444Q188 -410 246 -410Q280 -410 312 -424Q344 -438 365 -465Q387 -491 387 -528Q387 -547 374 -562Q370 -558 365 -554Q361 -551 354 -551Q345 -551 338 -557Q331 -563 331 -573Q331 -582 337 -588Q343 -595 354 -595Q373 -595 387 -577Q402 -560 402 -530Q402 -490 379 -461Q357 -431 322 -415Q287 -398 248 -398Z"],
  "O": [548, 19, 733, -684, 1, "M156 1Q100 1 59 -35Q19 -72 19 -147Q19 -220 53 -296Q87 -372 146 -441Q205 -510 280 -565Q354 -620 437 -652Q520 -684 601 -684Q669 -684 701 -655Q733 -626 733 -581Q733 -563 726 -538Q719 -513 711 -501Q702 -490 698 -490Q694 -490 694 -495Q694 -497 699 -503Q706 -511 712 -535Q719 -559 719 -580Q719 -620 690 -645Q661 -670 595 -670Q542 -670 482 -644Q422 -617 361 -571Q300 -525 245 -468Q190 -410 147 -348Q104 -285 79 -225Q54 -166 54 -116Q54 -70 81 -41Q108 -11 162 -11Q215 -11 274 -38Q334 -65 391 -112Q449 -158 495 -215Q542 -272 570 -334Q598 -395 598 -452Q598 -494 576 -514Q554 -534 515 -534Q469 -534 419 -506Q369 -479 326 -431Q283 -384 256 -323Q229 -261 229 -193Q229 -174 234 -149Q238 -125 251 -105Q252 -104 254 -101Q255 -98 251 -96Q248 -95 240 -105Q231 -117 223 -143Q214 -170 214 -199Q214 -269 241 -332Q267 -395 311 -443Q355 -492 410 -520Q464 -547 520 -547Q559 -547 591 -521Q622 -496 622 -439Q622 -383 595 -323Q569 -262 522 -204Q476 -147 417 -101Q357 -54 290 -27Q223 1 156 1Z"],
  "P": [629, 0, 862, -687, 1, "M104 1Q50 1 25 -19Q0 -38 0 -66Q0 -87 15 -97Q31 -106 46 -106Q53 -106 62 -101Q70 -96 70 -84Q70 -75 62 -67Q54 -60 42 -60Q36 -60 30 -61Q24 -62 20 -64V-62Q20 -41 41 -27Q62 -13 97 -13Q128 -13 157 -23Q186 -34 220 -64Q254 -95 302 -153Q349 -211 417 -306Q390 -324 390 -349Q390 -371 409 -385Q428 -399 449 -399Q458 -399 460 -396Q461 -394 461 -394Q461 -391 456 -390Q433 -387 421 -373Q410 -358 410 -339Q410 -328 426 -317L433 -327Q486 -398 533 -453Q581 -507 628 -550Q675 -592 728 -628L748 -641Q720 -658 676 -667Q633 -676 573 -676Q480 -676 397 -649Q313 -623 250 -580Q187 -538 151 -487Q116 -437 117 -388Q119 -348 141 -333Q163 -317 184 -317Q219 -317 254 -338Q290 -360 323 -394Q355 -427 381 -465Q407 -502 423 -536Q438 -569 441 -589Q442 -606 448 -606Q453 -606 453 -591Q454 -548 436 -499Q418 -449 383 -405Q347 -360 296 -332Q246 -304 182 -304Q155 -304 129 -326Q103 -349 102 -385Q101 -433 127 -478Q153 -522 200 -560Q247 -598 308 -626Q369 -655 437 -671Q504 -687 572 -687Q633 -687 681 -677Q729 -668 764 -651Q794 -668 818 -676Q841 -684 853 -684Q862 -684 862 -679Q862 -676 860 -674Q858 -672 850 -671Q817 -665 782 -642Q821 -618 841 -585Q860 -553 860 -515Q860 -469 834 -427Q808 -384 763 -351Q718 -317 661 -297Q605 -277 545 -277Q506 -277 474 -284Q394 -177 327 -115Q261 -52 205 -26Q150 1 104 1ZM543 -290Q582 -290 627 -306Q672 -323 712 -355Q751 -387 777 -435Q802 -483 802 -546Q802 -598 764 -629Q711 -591 652 -521Q594 -452 528 -360Q517 -343 505 -327Q494 -312 483 -296Q513 -290 543 -290Z"],
  "Q": [702, 0, 869, -684, 142, "M715 142Q671 142 624 133Q577 125 522 99Q466 74 395 25Q369 8 344 -1Q320 -10 299 -19Q226 0 152 0Q70 0 35 -17Q0 -33 0 -51Q0 -66 30 -80Q60 -94 104 -94Q151 -94 211 -83Q271 -71 328 -51Q348 -60 368 -70Q388 -81 408 -92Q454 -119 503 -159Q551 -199 596 -247Q640 -295 675 -347Q710 -399 730 -451Q751 -502 751 -547Q751 -605 717 -639Q684 -672 612 -672Q575 -672 537 -659Q500 -646 465 -625Q421 -599 378 -559Q335 -518 300 -473Q265 -428 244 -387Q223 -346 223 -320Q223 -293 240 -269Q257 -244 307 -244Q336 -244 372 -263Q408 -283 444 -315Q481 -348 513 -389Q546 -429 569 -472Q591 -515 599 -554Q601 -564 602 -566Q603 -569 604 -569Q607 -569 609 -566Q612 -564 612 -554Q612 -498 584 -441Q557 -384 511 -337Q466 -290 412 -261Q357 -233 304 -233Q251 -233 223 -264Q195 -295 195 -343Q195 -405 246 -482Q298 -559 405 -625Q451 -653 510 -669Q568 -684 617 -684Q660 -684 697 -668Q733 -652 755 -617Q777 -582 777 -524Q777 -444 744 -370Q711 -296 654 -231Q596 -167 521 -117Q446 -68 362 -38Q372 -35 381 -31Q390 -28 398 -23Q488 34 552 66Q616 97 661 110Q706 122 737 122Q768 122 795 114Q822 105 838 93L856 78Q861 75 863 75Q869 75 869 81Q869 85 849 101Q829 116 801 125Q759 142 715 142ZM150 -13Q183 -13 214 -17Q244 -22 272 -31Q206 -60 168 -70Q129 -81 98 -81Q64 -81 48 -73Q32 -65 32 -55Q32 -34 65 -23Q99 -13 150 -13Z"],
  "R": [857, 20, 914, -684, 1, "M123 1Q70 1 45 -19Q20 -38 20 -66Q20 -87 35 -97Q50 -106 65 -106Q73 -106 81 -101Q89 -96 89 -84Q89 -75 81 -67Q73 -60 62 -60Q56 -60 50 -61Q44 -62 39 -65V-62Q39 -41 60 -27Q81 -13 117 -13Q149 -13 178 -24Q208 -35 242 -67Q277 -98 326 -158Q375 -218 446 -316Q524 -426 603 -496Q682 -565 764 -620Q769 -623 774 -626Q778 -628 783 -631Q753 -651 709 -661Q664 -670 609 -670Q524 -670 448 -643Q372 -616 313 -572Q255 -529 223 -479Q190 -429 192 -383Q193 -356 205 -341Q218 -325 235 -318Q252 -312 268 -312Q303 -312 339 -333Q375 -355 407 -389Q439 -423 465 -461Q491 -500 507 -533Q523 -567 525 -587Q527 -604 533 -604Q538 -604 538 -588Q539 -545 521 -495Q503 -445 468 -400Q432 -355 381 -327Q331 -299 267 -299Q235 -299 206 -321Q176 -343 175 -380Q174 -429 199 -474Q225 -519 270 -557Q314 -595 372 -624Q429 -652 492 -668Q555 -684 616 -684Q729 -684 798 -639Q836 -658 863 -667Q891 -676 904 -676Q914 -676 914 -671Q914 -665 900 -663Q863 -655 816 -626Q873 -581 875 -509Q877 -468 853 -427Q829 -387 783 -355Q737 -322 675 -304Q689 -289 690 -266Q691 -244 685 -221Q679 -199 657 -170Q636 -140 592 -96Q575 -82 569 -70Q563 -58 564 -48Q564 -34 575 -23Q585 -13 615 -13Q654 -13 697 -42Q740 -70 777 -121Q814 -171 835 -234Q839 -249 842 -249Q851 -249 851 -235Q852 -192 828 -151Q805 -109 768 -75Q730 -41 689 -20Q648 1 613 1Q573 1 552 -16Q530 -33 529 -59Q528 -95 541 -124Q554 -153 574 -177Q594 -201 614 -221Q640 -243 647 -257Q654 -271 654 -285Q654 -292 651 -297Q639 -294 627 -293Q616 -292 606 -292Q585 -292 575 -298Q564 -303 563 -311Q563 -316 573 -322Q582 -328 601 -328Q617 -328 632 -325Q647 -322 660 -315Q693 -330 725 -356Q756 -383 781 -417Q805 -451 819 -485Q833 -520 832 -550Q831 -589 801 -617Q743 -577 679 -509Q615 -440 553 -350Q458 -217 381 -140Q303 -63 239 -31Q176 1 123 1ZM604 -303Q621 -303 640 -309Q626 -316 601 -316Q581 -316 581 -312Q581 -310 587 -306Q593 -303 604 -303Z"],
  "S": [514, 0, 887, -684, 1, "M112 1Q59 1 30 -19Q0 -38 0 -66Q0 -87 15 -97Q30 -106 45 -106Q54 -106 62 -101Q70 -96 70 -84Q70 -75 62 -67Q53 -60 42 -60Q27 -60 20 -64V-62Q20 -41 44 -26Q69 -11 104 -11Q157 -11 199 -37Q241 -63 276 -106Q312 -149 344 -201Q376 -253 408 -306L417 -322Q340 -325 280 -345Q219 -366 185 -401Q151 -436 154 -482Q156 -526 185 -563Q214 -600 262 -627Q310 -654 371 -669Q432 -684 499 -684Q535 -684 562 -677Q589 -670 589 -664Q589 -662 583 -662Q580 -662 576 -662Q573 -663 569 -664Q554 -667 537 -670Q521 -673 498 -673Q441 -673 387 -658Q333 -644 288 -618Q243 -591 216 -555Q189 -518 187 -473Q185 -444 210 -413Q235 -381 289 -359Q342 -337 425 -334Q542 -518 640 -601Q737 -684 825 -684Q854 -684 872 -668Q889 -653 887 -624Q885 -586 854 -539Q823 -492 770 -447Q717 -402 647 -369Q578 -336 499 -326Q457 -262 414 -203Q371 -144 324 -98Q278 -52 225 -26Q173 1 112 1ZM508 -339Q578 -351 641 -383Q704 -415 753 -458Q802 -500 830 -544Q859 -589 861 -625Q863 -652 851 -662Q838 -672 825 -672Q764 -670 696 -599Q628 -527 542 -393Q534 -379 525 -366Q516 -353 508 -339Z"],
  "T": [550, 0, 1131, -745, 1, "M390 -378Q353 -378 332 -399Q311 -420 311 -454Q311 -487 338 -525Q366 -563 414 -598Q462 -632 524 -653Q548 -661 579 -666Q610 -671 643 -673Q676 -676 703 -676Q740 -676 778 -671Q815 -667 838 -662Q865 -657 896 -654Q927 -652 941 -652Q977 -652 1012 -664Q1047 -676 1075 -696Q1103 -715 1117 -737Q1120 -743 1122 -744Q1125 -745 1126 -745Q1131 -745 1131 -740Q1131 -733 1115 -713Q1091 -684 1049 -661Q1007 -639 956 -625Q904 -612 849 -612Q825 -612 795 -616Q765 -620 718 -629Q678 -637 645 -641Q611 -644 588 -644Q544 -644 498 -626Q452 -608 412 -579Q373 -550 349 -516Q324 -482 324 -451Q324 -428 339 -411Q354 -394 385 -394Q413 -394 447 -416Q480 -438 512 -471Q544 -504 566 -538Q589 -572 595 -596Q597 -605 598 -607Q599 -608 601 -608Q606 -608 606 -596Q606 -556 586 -517Q565 -478 533 -447Q500 -416 463 -397Q425 -378 390 -378ZM126 1Q93 1 64 -9Q36 -19 18 -37Q0 -55 0 -81Q0 -103 15 -112Q31 -122 46 -122Q54 -122 62 -116Q70 -111 70 -99Q70 -90 62 -82Q54 -75 43 -75Q37 -75 31 -76Q24 -77 20 -80V-77Q20 -44 52 -28Q83 -13 130 -13Q204 -13 284 -67Q364 -121 434 -230Q455 -264 482 -299Q510 -334 542 -373Q599 -437 649 -483Q699 -530 734 -555Q769 -580 779 -580Q786 -580 786 -575Q786 -570 776 -564Q750 -547 732 -532Q713 -518 696 -497Q678 -476 655 -443Q632 -409 597 -354Q512 -223 431 -145Q350 -67 274 -33Q197 1 126 1Z"],
  "U": [504, 0, 769, -684, 1, "M59 1Q36 1 24 -10Q12 -22 11 -40Q9 -91 65 -177Q122 -263 259 -395Q327 -459 363 -500Q399 -540 412 -565Q426 -591 425 -609Q423 -642 398 -656Q372 -669 327 -669Q270 -669 214 -647Q158 -625 113 -590Q67 -555 40 -516Q13 -477 15 -444Q16 -420 30 -408Q43 -395 64 -395Q93 -395 131 -417Q169 -439 209 -476Q249 -512 281 -553Q314 -595 331 -634Q337 -648 340 -648Q344 -648 344 -640Q345 -632 340 -613Q336 -594 326 -573Q299 -515 258 -472Q216 -428 169 -404Q122 -380 77 -380Q41 -380 21 -396Q1 -412 0 -439Q-1 -478 28 -520Q56 -563 105 -600Q155 -637 216 -661Q276 -684 339 -684Q383 -684 411 -666Q438 -647 440 -612Q441 -590 431 -559Q422 -528 395 -484Q369 -440 320 -380Q271 -320 192 -238Q138 -183 105 -148Q73 -112 56 -91Q39 -69 33 -56Q27 -44 28 -35Q29 -11 60 -11Q90 -11 143 -37Q196 -62 261 -115Q325 -167 389 -247Q403 -265 434 -301Q464 -338 506 -387Q548 -437 597 -494Q646 -551 698 -610H769Q765 -605 746 -583Q727 -560 698 -526Q669 -492 635 -453Q602 -415 569 -377Q537 -339 510 -309Q482 -279 467 -263Q399 -191 362 -136Q325 -82 326 -44Q327 -26 339 -19Q350 -12 366 -12Q386 -12 412 -23Q438 -34 463 -52Q488 -70 506 -88Q508 -87 509 -80Q509 -75 507 -71Q490 -56 466 -39Q441 -22 414 -11Q387 1 363 1Q341 1 324 -11Q308 -23 307 -47Q305 -80 316 -107Q327 -135 340 -157Q234 -67 164 -33Q94 1 59 1Z"],
  "V": [502, 0, 890, -749, 21, "M6 21Q0 21 0 16Q0 12 8 9Q10 7 15 5Q20 3 24 0Q60 -24 108 -95Q157 -165 225 -275Q271 -351 320 -418Q369 -484 409 -528Q364 -497 324 -478Q284 -460 253 -460Q231 -460 215 -472Q198 -483 197 -505Q197 -524 208 -543Q219 -562 243 -587Q258 -603 276 -624Q294 -645 293 -659Q292 -677 275 -684Q257 -691 235 -691Q196 -691 164 -676Q131 -661 105 -640Q97 -632 93 -632Q88 -632 88 -638Q87 -645 100 -653Q125 -674 162 -688Q200 -701 236 -701Q275 -701 300 -687Q325 -673 327 -646Q328 -625 312 -596Q295 -566 271 -542Q249 -519 240 -508Q230 -497 231 -490Q231 -473 255 -473Q275 -473 308 -484Q340 -496 389 -529Q438 -561 505 -624Q512 -630 523 -639Q534 -648 545 -655Q555 -663 561 -663Q567 -663 567 -658Q567 -654 563 -652Q560 -650 554 -646Q550 -644 542 -637Q534 -631 521 -619Q506 -605 496 -587Q485 -569 471 -542Q457 -516 435 -476Q413 -437 375 -379Q320 -295 276 -238Q232 -181 191 -137Q150 -94 104 -50Q161 -88 234 -141Q307 -193 386 -254Q465 -314 542 -377Q620 -439 685 -497Q685 -501 685 -510Q685 -553 700 -596Q715 -638 740 -673Q766 -708 795 -728Q825 -749 853 -749Q868 -749 879 -740Q890 -730 890 -709Q890 -668 844 -608Q798 -549 711 -473Q722 -440 744 -424Q766 -408 786 -408Q795 -408 802 -411Q810 -414 812 -414Q819 -414 819 -410Q819 -406 810 -401Q801 -397 785 -397Q754 -397 731 -414Q707 -432 695 -459Q586 -366 422 -250Q258 -134 45 3Q29 13 19 17Q9 21 6 21ZM704 -514Q778 -582 825 -635Q873 -688 873 -715Q873 -726 865 -731Q858 -737 853 -737Q828 -737 802 -719Q775 -701 753 -670Q731 -640 718 -601Q704 -562 704 -520Z"],
  "W": [841, 0, 1466, -706, 21, "M167 21Q155 21 155 14Q155 10 159 7Q164 5 177 1Q193 -1 209 -11Q225 -21 249 -49Q273 -77 312 -134Q339 -173 363 -207Q387 -241 413 -276Q440 -312 474 -354Q520 -411 571 -465Q622 -519 689 -584Q702 -596 722 -616Q742 -635 760 -654Q779 -672 787 -680Q797 -689 808 -695Q818 -701 824 -701Q833 -701 833 -697Q833 -693 828 -691Q824 -689 819 -685Q814 -682 806 -677Q797 -671 785 -657Q770 -643 756 -626Q742 -610 721 -583Q701 -557 667 -511Q634 -465 581 -392Q519 -305 463 -240Q407 -176 353 -124Q298 -71 239 -21Q268 -37 297 -56Q327 -75 365 -106Q404 -137 458 -187Q513 -237 592 -314Q721 -442 806 -516Q890 -591 937 -627Q984 -663 1000 -675Q1028 -694 1038 -700Q1049 -706 1052 -706Q1059 -706 1059 -699Q1059 -696 1054 -692Q1049 -689 1031 -680Q1012 -671 989 -649Q966 -626 949 -600Q919 -553 882 -488Q844 -422 803 -355Q763 -288 723 -234Q709 -215 678 -176Q648 -137 614 -93Q656 -137 688 -169Q719 -202 748 -231Q777 -261 810 -293Q843 -325 887 -366Q931 -408 992 -466Q1105 -573 1195 -631Q1286 -688 1360 -688Q1409 -688 1438 -671Q1466 -654 1466 -621Q1466 -578 1429 -552Q1393 -525 1343 -525Q1325 -525 1304 -532Q1284 -538 1270 -548Q1256 -558 1256 -569Q1256 -585 1269 -585Q1275 -585 1278 -582Q1280 -579 1282 -568Q1284 -557 1295 -549Q1307 -542 1320 -539Q1333 -535 1342 -535Q1362 -535 1385 -545Q1407 -554 1424 -573Q1440 -592 1440 -620Q1440 -651 1413 -662Q1387 -673 1354 -673Q1324 -673 1288 -661Q1251 -649 1205 -620Q1158 -591 1095 -540Q1033 -488 951 -409Q917 -376 883 -344Q850 -312 812 -275Q774 -238 729 -191Q683 -145 624 -83Q571 -28 529 -3Q487 21 475 21Q465 21 465 13Q465 7 479 2Q498 -3 510 -11Q522 -18 535 -33Q547 -48 564 -76Q582 -105 609 -154Q630 -191 656 -234Q682 -276 709 -317Q736 -358 758 -389Q768 -402 789 -428Q810 -455 835 -487Q861 -519 887 -550Q912 -581 931 -604Q904 -583 872 -559Q840 -534 809 -505Q772 -470 725 -423Q678 -375 613 -312Q548 -249 458 -167Q396 -111 337 -68Q277 -24 232 -4Q214 3 195 12Q176 21 167 21ZM7 -430Q0 -430 0 -438Q0 -448 11 -478Q23 -507 55 -542Q108 -598 171 -623Q234 -648 290 -648Q327 -648 367 -640Q406 -631 442 -619Q489 -602 515 -595Q542 -588 573 -588Q600 -588 642 -603Q684 -617 721 -648Q735 -660 737 -660Q742 -660 742 -657Q742 -653 734 -646Q680 -597 630 -578Q580 -560 530 -560Q490 -560 455 -568Q419 -575 371 -591Q339 -602 316 -606Q293 -610 264 -610Q226 -610 185 -597Q144 -585 108 -562Q73 -540 48 -510Q36 -495 27 -476Q17 -458 17 -443Q17 -437 13 -433Q10 -430 7 -430Z"],
  "X": [851, 0, 1139, -701, 1, "M110 1Q65 1 33 -21Q0 -42 0 -81Q1 -103 17 -112Q32 -122 47 -122Q55 -122 63 -116Q71 -111 71 -99Q71 -90 62 -82Q54 -75 43 -75Q37 -75 31 -75Q25 -76 20 -80V-77Q20 -44 47 -28Q74 -13 113 -13Q151 -13 205 -38Q259 -62 320 -107Q380 -151 437 -210Q495 -269 539 -337Q562 -381 584 -432Q607 -482 622 -528Q638 -573 638 -600Q639 -645 616 -667Q593 -688 549 -688Q510 -688 468 -670Q427 -651 388 -621Q350 -591 320 -555Q289 -520 271 -484Q253 -449 252 -421Q250 -377 296 -377Q337 -377 385 -410Q433 -443 479 -503Q524 -563 557 -644Q560 -652 564 -652Q566 -652 568 -649Q571 -646 571 -636Q572 -608 555 -573Q539 -537 511 -501Q483 -465 447 -434Q411 -403 371 -384Q332 -365 293 -365Q267 -365 251 -379Q236 -393 237 -421Q238 -452 257 -489Q277 -527 309 -564Q342 -601 382 -632Q423 -664 466 -682Q509 -701 548 -701Q586 -701 615 -689Q644 -677 660 -646Q676 -615 674 -560Q673 -517 659 -469Q646 -421 628 -383Q764 -535 881 -615Q998 -695 1087 -695Q1110 -695 1125 -684Q1139 -673 1139 -655Q1138 -640 1130 -633Q1122 -625 1112 -625Q1102 -625 1096 -634Q1091 -643 1091 -652Q1091 -668 1105 -677Q1102 -678 1097 -679Q1093 -680 1089 -680Q1029 -680 964 -647Q898 -615 830 -559Q761 -503 691 -432Q666 -404 648 -384Q630 -364 608 -333Q582 -290 561 -242Q540 -194 527 -153Q514 -112 513 -87Q512 -56 523 -39Q533 -22 550 -17Q566 -11 584 -11Q618 -11 661 -30Q705 -49 745 -83Q786 -118 812 -164Q839 -211 841 -266Q842 -308 825 -327Q809 -347 783 -347Q761 -347 741 -333Q721 -320 709 -298Q697 -276 696 -251Q696 -239 700 -228Q704 -216 714 -208Q723 -202 719 -194Q717 -190 712 -190Q708 -190 704 -191Q693 -196 684 -210Q675 -224 676 -250Q676 -280 692 -305Q708 -330 733 -344Q758 -359 786 -359Q819 -359 839 -336Q860 -312 859 -271Q857 -219 831 -170Q804 -121 761 -83Q719 -44 671 -22Q623 1 580 1Q522 1 491 -25Q460 -52 461 -104Q462 -143 476 -187Q490 -230 510 -268Q439 -180 364 -120Q288 -61 221 -30Q155 1 110 1Z"],
  "Y": [630, 15, 913, -701, 112, "M146 112Q91 112 53 90Q15 67 15 27Q15 6 29 -7Q43 -19 59 -19Q66 -19 74 -14Q83 -8 83 4Q83 13 75 21Q66 28 55 28Q50 28 45 27Q40 27 36 25Q34 30 34 35Q34 62 67 81Q100 100 149 100Q218 100 310 29Q403 -42 499 -181Q535 -235 574 -291Q614 -347 648 -392Q568 -309 512 -265Q456 -221 418 -204Q381 -188 360 -188Q333 -188 321 -204Q309 -221 309 -239Q309 -270 330 -312Q351 -355 386 -402Q421 -449 464 -493Q516 -544 541 -571Q565 -598 573 -612Q580 -625 580 -634Q580 -687 484 -687Q439 -687 391 -670Q343 -654 299 -626Q255 -598 220 -565Q185 -532 164 -499Q144 -465 144 -437Q144 -396 188 -396Q219 -396 253 -417Q288 -438 321 -470Q354 -502 382 -537Q410 -571 428 -598Q446 -626 449 -637Q453 -644 454 -644Q458 -644 459 -635Q462 -608 445 -573Q427 -539 396 -504Q366 -470 329 -440Q292 -411 254 -393Q217 -375 187 -375Q158 -375 144 -391Q129 -407 129 -433Q129 -465 150 -502Q171 -539 208 -574Q244 -609 290 -638Q336 -667 386 -684Q436 -701 484 -701Q534 -701 569 -684Q605 -667 605 -628Q605 -603 593 -572Q582 -542 550 -501Q518 -460 458 -405Q398 -347 364 -304Q329 -261 329 -234Q329 -220 337 -209Q345 -199 362 -199Q378 -199 407 -212Q436 -226 482 -260Q527 -294 593 -356Q658 -418 746 -517Q799 -576 842 -602Q885 -628 905 -628Q913 -628 913 -623Q913 -619 905 -617L891 -612Q831 -588 766 -507Q701 -426 626 -286Q560 -161 477 -72Q394 18 308 65Q222 112 146 112Z"],
  "Z": [779, 20, 875, -688, 23, "M531 23Q467 23 406 0Q345 -22 285 -44Q243 -21 204 -10Q164 1 126 1Q73 1 46 -13Q19 -26 20 -44Q21 -64 52 -80Q84 -96 145 -96Q177 -96 211 -90Q245 -84 278 -76Q320 -112 367 -168Q415 -225 472 -302Q540 -396 614 -478Q689 -560 793 -634Q767 -622 736 -614Q704 -606 672 -606Q632 -606 602 -613Q572 -620 544 -629Q517 -638 484 -644Q452 -649 407 -648Q377 -647 346 -632Q316 -617 291 -592Q265 -567 249 -536Q233 -506 232 -474Q231 -452 246 -433Q260 -415 285 -415Q317 -415 346 -435Q375 -456 397 -487Q420 -517 435 -548Q449 -578 451 -598Q451 -605 456 -605Q458 -605 461 -599Q465 -592 465 -583Q468 -548 454 -515Q440 -482 414 -457Q388 -432 356 -417Q324 -403 291 -403Q266 -403 250 -415Q233 -426 226 -443Q219 -460 219 -475Q221 -513 240 -550Q260 -587 295 -618Q329 -648 374 -666Q419 -684 471 -684Q518 -684 553 -677Q587 -669 616 -660Q645 -650 675 -643Q704 -635 741 -635Q772 -635 801 -648Q831 -662 849 -678Q855 -685 860 -686Q865 -688 868 -688Q875 -688 875 -683Q875 -678 866 -671Q855 -666 850 -662Q845 -658 834 -652Q816 -640 790 -613Q763 -585 731 -548Q699 -511 666 -468Q634 -425 605 -382Q528 -265 457 -187Q386 -109 319 -65Q366 -51 411 -39Q456 -27 495 -24Q561 -19 613 -30Q666 -41 697 -69Q728 -97 728 -143Q728 -166 714 -186Q700 -206 670 -212Q669 -202 661 -194Q652 -187 642 -184Q631 -183 621 -186Q611 -190 608 -199Q605 -210 614 -218Q623 -226 630 -228Q638 -230 645 -230Q687 -230 715 -206Q742 -181 742 -143Q742 -91 714 -54Q686 -17 638 3Q590 23 531 23ZM128 -11Q191 -11 252 -56Q222 -66 191 -73Q161 -80 131 -80Q109 -80 87 -76Q65 -72 50 -64Q35 -57 35 -44Q34 -33 55 -22Q77 -11 128 -11Z"],
}
// #endregion glyphs

/* --------------------------------------------------------------- defaults */

const DEFAULT_NAV: IrisLink[] = [
  { label: "Works", href: "#works" },
  { label: "About", href: "#about" },
  { label: "Practice", href: "#practice" },
  { label: "Timeline", href: "#timeline" },
  { label: "Contact", href: "#contact" },
]

const DEFAULT_HERO = {
  title: "PORTFOLIO",
  from: 2022,
  to: 2024,
  discipline: "Graphic Design",
  tags: ["Graphic", "Visual", "Branding", "Illustration"],
  localName: "林若溪",
  localTitle: "作品集",
}

const DEFAULT_PROJECTS: IrisProject[] = [
  {
    title: "Moonlit Tea House",
    year: 2024,
    discipline: "Branding",
    client: "Yue Lan Tea, Hangzhou",
    role: "Identity, packaging, signage",
    summary: "A night-blooming identity for a tea house that only opens after dusk.",
    body: "The mark is a crescent folded from a single tea leaf. Tins are printed in two inks, cobalt and pearl, so the shelf reads like a sky at the blue hour. The sign is lit from behind and casts the leaf onto the street.",
    tools: ["Illustrator", "Gouache", "Risograph"],
    motif: "moon",
    sky: "dusk",
  },
  {
    title: "Garden of Small Hours",
    year: 2024,
    discipline: "Illustration",
    client: "Linden Press",
    role: "Cover series, 6 titles",
    summary: "Six covers for a poetry series, each a garden at a different hour.",
    body: "Painted in gouache, then separated into four spot colours for the press. The irises bloom wider as the series moves from dawn to midnight, and the spines line up into one continuous vine.",
    tools: ["Gouache", "Procreate", "InDesign"],
    motif: "iris",
    sky: "dawn",
  },
  {
    title: "Petal Post",
    year: 2023,
    discipline: "Graphic",
    client: "City Post Office",
    role: "Stamp series",
    summary: "A spring stamp series where every sheet is one falling flower.",
    body: "Twelve stamps, perforated so that tearing one off leaves a petal-shaped gap. Collected together they rebuild the blossom.",
    tools: ["Illustrator", "Intaglio"],
    motif: "petals",
    sky: "day",
  },
  {
    title: "Tidal Bloom",
    year: 2023,
    discipline: "Visual",
    client: "Harbour Lights Festival",
    role: "Campaign, motion, wayfinding",
    summary: "Posters and motion for a waterfront festival of light.",
    body: "A looping vine grows across every poster in the campaign; on the screens it keeps growing, and at the harbour it is projected onto the sea wall at full tide.",
    tools: ["After Effects", "Illustrator", "Blender"],
    motif: "vine",
    sky: "night",
  },
  {
    title: "Verdant Type Specimen",
    year: 2022,
    discipline: "Graphic",
    client: "Self-initiated",
    role: "Editorial design",
    summary: "A specimen book where every glyph grows a leaf.",
    body: "An editorial study in contrast: a hairline Didone set against painted foliage, bound in green cloth with a die-cut window.",
    tools: ["InDesign", "Glyphs"],
    motif: "leaves",
    sky: "day",
  },
  {
    title: "Lantern Café",
    year: 2022,
    discipline: "Branding",
    client: "Lantern Café, Taipei",
    role: "Identity, menus, cups",
    summary: "A neighbourhood café whose cups glow like paper lanterns.",
    body: "Translucent cup sleeves printed with a vine pattern that lines up when two cups touch, so every table becomes a small garden.",
    tools: ["Illustrator", "Photoshop"],
    motif: "leaves",
    sky: "dawn",
  },
  {
    title: "Night Iris",
    year: 2023,
    discipline: "Illustration",
    client: "Moth Records",
    role: "Album art, vinyl",
    summary: "Album art for a dream-pop record pressed on violet vinyl.",
    body: "The iris on the sleeve is printed in glow ink and only appears in the dark. The inner sleeve carries the lyrics as pressed flowers.",
    tools: ["Gouache", "Photoshop"],
    motif: "iris",
    sky: "night",
  },
  {
    title: "Herbarium Calendar",
    year: 2024,
    discipline: "Visual",
    client: "Botanic Garden Shop",
    role: "Calendar, prints",
    summary: "Twelve months of the garden, one painted plate at a time.",
    body: "Each month is a single plant painted from life in the glasshouse, with a sowing guide on the back and a perforated postcard.",
    tools: ["Watercolour", "InDesign"],
    motif: "petals",
    sky: "dusk",
  },
]

const DEFAULT_ABOUT = {
  title: "About",
  statement: "I'm Ruoxi, a graphic designer and illustrator who paints *quiet gardens* for loud brands — identities, books and posters that feel *picked by hand*.",
  body: "Trained in visual communication in Hangzhou, now working from a studio full of plants in Shanghai. I paint every illustration first in gouache, then build the system around it, so the brand keeps a little of the brush.",
  facts: [
    { label: "Based in", value: "Shanghai, CN" },
    { label: "Languages", value: "中文 · English" },
    { label: "Currently", value: "Freelance, booking spring" },
  ],
  stats: [
    { value: 3, label: "Years practising" },
    { value: 48, label: "Projects shipped" },
    { value: 21, suffix: "+", label: "Happy clients" },
  ],
  cv: { label: "Download CV", href: "#" },
}

const DEFAULT_SERVICES: IrisService[] = [
  {
    title: "Graphic",
    line: "Posters, books, editorial and print.",
    body: "Layouts that leave room to breathe. I care about paper, ink and the order you read things in, and I always proof on press.",
    deliverables: ["Posters", "Book covers", "Editorial", "Packaging"],
  },
  {
    title: "Visual",
    line: "Campaigns, motion and social.",
    body: "Campaign worlds that hold together from a billboard down to a story frame, with motion that grows rather than slides.",
    deliverables: ["Key visuals", "Motion", "Social kits", "Wayfinding"],
  },
  {
    title: "Branding",
    line: "Identities with a little of the brush left in.",
    body: "Marks, colour and type built around one painted idea, then turned into a system your team can use without me.",
    deliverables: ["Logo & mark", "Guidelines", "Stationery", "Signage"],
  },
  {
    title: "Illustration",
    line: "Gouache gardens, painted then digitised.",
    body: "Botanical and atmospheric illustration for books, labels and walls, painted at full size and scanned at 1200 dpi.",
    deliverables: ["Editorial", "Labels", "Murals", "Patterns"],
  },
]

const DEFAULT_TIMELINE: IrisYear[] = [
  {
    year: 2022,
    headline: "First leaves",
    items: [
      { title: "Graduated, Visual Communication", place: "China Academy of Art", note: "Thesis: painted type in public space" },
      { title: "Junior designer", place: "Studio Meadow, Hangzhou" },
      { title: "Verdant Type Specimen", note: "Self-published, 300 copies" },
    ],
  },
  {
    year: 2023,
    headline: "In bloom",
    items: [
      { title: "Went independent", place: "Shanghai" },
      { title: "Tidal Bloom festival campaign", note: "Shortlisted, Tokyo TDC" },
      { title: "Night Iris album art", place: "Moth Records" },
    ],
  },
  {
    year: 2024,
    headline: "A full garden",
    items: [
      { title: "Moonlit Tea House identity", note: "Gold, Pentawards packaging" },
      { title: "Garden of Small Hours", place: "Linden Press", note: "Six covers" },
      { title: "Solo show: Small Hours", place: "Gallery Weiyi, Shanghai" },
    ],
  },
]

const DEFAULT_CONTACT = {
  title: "Say Hello",
  line: "Have a garden that needs painting? Tell me about it.",
  email: "hello@example.com",
  availability: "Booking commissions for spring",
  socials: [
    { label: "Behance", href: "#" },
    { label: "Dribbble", href: "#" },
    { label: "Instagram", href: "#" },
    { label: "Xiaohongshu", href: "#" },
  ],
}

const MOTIFS: IrisMotif[] = ["iris", "leaves", "petals", "vine", "moon"]

/* -------------------------------------------------------------------- css */

const IFO_CSS = `
.ifo-root{--ifo-paper:var(--ifo-pp);--ifo-ink:var(--ifo-pi);--ifo-text:color-mix(in oklab,var(--ifo-pi) 26%,#14161f);--ifo-soft:color-mix(in oklab,var(--ifo-text) 66%,var(--ifo-pp));--ifo-line:color-mix(in oklab,var(--ifo-pi) 22%,var(--ifo-pp));--ifo-wash:color-mix(in oklab,var(--ifo-pi) 7%,var(--ifo-pp));--ifo-sky-top:var(--ifo-p-top);--ifo-sky-mid:var(--ifo-p-mid);--ifo-sky-low:var(--ifo-p-low);--ifo-glow:var(--ifo-p-glow);--ifo-blush:var(--ifo-p-blush);--ifo-leaf:var(--ifo-p-leaf);--ifo-leaf-hi:color-mix(in oklab,var(--ifo-p-leaf) 45%,#e9fff4);--ifo-leaf-lo:color-mix(in oklab,var(--ifo-p-leaf) 70%,#0b2b26);--ifo-petal:var(--ifo-p-petal);--ifo-petal-lo:color-mix(in oklab,var(--ifo-p-petal) 78%,var(--ifo-p-mid));--ifo-vein:color-mix(in oklab,#7b6fd0 70%,var(--ifo-pi));--ifo-gold:#ffcf3f;--ifo-gold-lo:#ef9a1a;--ifo-night:0;--ifo-serif:"Bodoni Moda","Didot","Bodoni 72","Bodoni MT","Playfair Display","Iowan Old Style",Georgia,"Times New Roman",serif;--ifo-sans:ui-sans-serif,system-ui,-apple-system,"Segoe UI","Helvetica Neue",Arial,sans-serif;--ifo-cjk:"Songti SC","STSong","Noto Serif SC","Noto Serif CJK SC","Source Han Serif SC","SimSun","Hiragino Mincho ProN","Yu Mincho",serif;position:relative;isolation:isolate;overflow-x:clip;background:var(--ifo-paper);color:var(--ifo-text);font-family:var(--ifo-sans);line-height:1.5;-webkit-font-smoothing:antialiased;transition:background-color .6s ease,color .6s ease}
.ifo-root[data-theme="dark"],.dark .ifo-root[data-theme="auto"]{--ifo-paper:color-mix(in oklab,var(--ifo-pi) 16%,#070912);--ifo-ink:color-mix(in oklab,var(--ifo-pi) 55%,#eef3ff);--ifo-text:color-mix(in oklab,var(--ifo-pp) 88%,var(--ifo-pi));--ifo-soft:color-mix(in oklab,var(--ifo-text) 62%,var(--ifo-paper));--ifo-line:color-mix(in oklab,var(--ifo-pi) 30%,#1a1d2c);--ifo-wash:color-mix(in oklab,var(--ifo-pi) 14%,#0a0c16);--ifo-sky-top:color-mix(in oklab,var(--ifo-p-top) 45%,#060a24);--ifo-sky-mid:color-mix(in oklab,var(--ifo-p-mid) 50%,#141a4a);--ifo-sky-low:color-mix(in oklab,var(--ifo-p-low) 42%,#2a2f6a);--ifo-glow:color-mix(in oklab,var(--ifo-p-glow) 55%,#3a2a6a);--ifo-blush:color-mix(in oklab,var(--ifo-p-blush) 50%,#2a1f5a);--ifo-leaf:color-mix(in oklab,var(--ifo-p-leaf) 72%,#0a1a2a);--ifo-leaf-hi:color-mix(in oklab,var(--ifo-p-leaf) 60%,#bff5df);--ifo-leaf-lo:color-mix(in oklab,var(--ifo-p-leaf) 50%,#04120f);--ifo-petal:color-mix(in oklab,var(--ifo-p-petal) 90%,#c9d4ff);--ifo-petal-lo:color-mix(in oklab,var(--ifo-p-petal) 55%,#5a64a8);--ifo-night:1}
.ifo-root :where(h1,h2,h3,h4,p,ul,ol,li,figure,dl,dd,dt){margin:0;padding:0}
.ifo-root :where(ul,ol){list-style:none}
.ifo-root :where(a){color:inherit;text-decoration:none}
.ifo-root :where(button){font:inherit;color:inherit;background:none;border:0;margin:0;padding:0;border-radius:0;cursor:pointer;text-align:inherit}
.ifo-root :where(a,button,[tabindex]):focus-visible{outline:2px solid var(--ifo-ink);outline-offset:3px;border-radius:4px}
.ifo-svg{display:block;max-width:none;overflow:visible}
.ifo-img{display:block;max-width:none;width:100%;height:100%;object-fit:cover}
.ifo-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.ifo-wrap{width:100%;max-width:1360px;margin:0 auto;padding:0 clamp(16px,4vw,48px);box-sizing:border-box}
.ifo-it{font-family:var(--ifo-serif);font-style:italic}
.ifo-kicker{display:inline-flex;align-items:center;gap:10px;font:italic 400 clamp(15px,1.4vw,18px)/1.2 var(--ifo-serif);color:var(--ifo-ink)}
.ifo-kicker svg{flex:none}
.ifo-sec{position:relative;padding:clamp(72px,10vw,140px) 0;scroll-margin-top:56px}
.ifo-sechead{display:flex;align-items:flex-end;justify-content:space-between;gap:20px 40px;flex-wrap:wrap;margin-bottom:clamp(28px,4vw,56px)}
.ifo-sectitle{display:block;color:var(--ifo-ink);height:clamp(64px,9vw,128px);width:auto}
.ifo-lede{font-size:16px;line-height:1.65;color:var(--ifo-soft);max-width:30em;text-wrap:pretty}
.ifo-pre{opacity:0;transform:translateY(24px)}
.ifo-rv{transition:opacity 1s cubic-bezier(.2,.7,.2,1),transform 1s cubic-bezier(.2,.7,.2,1)}

.ifo-nav{position:sticky;top:0;z-index:40;transition:background-color .35s,box-shadow .35s}
.ifo-nav[data-scrolled="true"]{background:color-mix(in oklab,var(--ifo-paper) 88%,transparent);-webkit-backdrop-filter:blur(14px) saturate(1.2);backdrop-filter:blur(14px) saturate(1.2);box-shadow:0 1px 0 var(--ifo-line)}
.ifo-navin{display:flex;align-items:center;gap:24px;height:58px}
.ifo-who{font:italic 400 16px/1 var(--ifo-serif);color:var(--ifo-ink);white-space:nowrap}
.ifo-links{display:flex;gap:6px;margin:0 auto}
.ifo-link{position:relative;padding:8px 12px;font:italic 400 15.5px/1 var(--ifo-serif);color:var(--ifo-text);border-radius:99px;transition:color .25s,background-color .25s}
.ifo-link:hover{color:var(--ifo-ink);background:var(--ifo-wash)}
.ifo-link[aria-current="true"]{color:var(--ifo-ink)}
.ifo-link[aria-current="true"]::after{content:"";position:absolute;left:50%;bottom:0;width:4px;height:4px;margin-left:-2px;border-radius:50%;background:var(--ifo-ink)}
.ifo-pill{display:inline-flex;align-items:center;justify-content:center;min-width:72px;height:30px;padding:0 14px;border:1.2px solid var(--ifo-ink);border-radius:50%;color:var(--ifo-ink);font:400 13px/1 var(--ifo-serif);letter-spacing:.06em;white-space:nowrap;transition:background-color .3s,color .3s,transform .4s cubic-bezier(.3,1.5,.5,1)}
.ifo-pill:hover{background:var(--ifo-ink);color:var(--ifo-paper);transform:rotate(-6deg)}
.ifo-burger{display:none;align-items:center;gap:8px;height:34px;padding:0 14px;border-radius:99px;box-shadow:inset 0 0 0 1px var(--ifo-line);font:italic 400 15px/1 var(--ifo-serif);color:var(--ifo-ink)}
.ifo-menu{position:absolute;left:0;right:0;top:100%;background:var(--ifo-paper);border-bottom:1px solid var(--ifo-line);padding:6px 0 18px;box-shadow:0 24px 40px -28px rgba(0,0,0,.35);animation:ifo-drop .35s cubic-bezier(.2,.7,.2,1) both}
.ifo-menu a{display:flex;justify-content:space-between;align-items:baseline;padding:12px 0;border-top:1px solid var(--ifo-line);font:italic 400 28px/1.1 var(--ifo-serif);color:var(--ifo-ink)}
.ifo-menu a small{font:400 11px var(--ifo-sans);letter-spacing:.2em;color:var(--ifo-soft)}
@keyframes ifo-drop{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
@media (max-width:820px){.ifo-links{display:none}.ifo-burger{display:inline-flex;margin-left:auto}.ifo-who{display:none}}

.ifo-hero{--ifo-px:0;--ifo-py:0;position:relative;min-height:calc(var(--ifo-h) - 58px);display:flex;flex-direction:column;justify-content:center;padding:4px 0 clamp(18px,3vh,32px);box-sizing:border-box}
.ifo-heroin{width:min(100%,max(600px,calc((var(--ifo-h) - 200px) * 1.75)));margin:0 auto;padding:0 clamp(12px,2.6vw,36px);box-sizing:border-box}
.ifo-years{display:flex;justify-content:center;align-items:center;gap:.5em;margin:0 auto;font:italic 400 clamp(15px,1.7vw,24px)/1 var(--ifo-serif);color:var(--ifo-ink);letter-spacing:.02em}
.ifo-years a{display:inline-flex;align-items:center;gap:.45em}
.ifo-years svg{width:2.2em;height:.6em;transition:transform .5s cubic-bezier(.3,1.4,.5,1)}
.ifo-years a:hover svg{transform:translateX(.25em) scaleX(1.18)}
.ifo-mark{position:relative;z-index:3;display:block;width:94%;margin:clamp(2px,.8vw,10px) auto 0;color:var(--ifo-ink);pointer-events:none}
.ifo-g{pointer-events:auto;transform-box:fill-box;transform-origin:50% 90%;transition:transform .55s cubic-bezier(.3,1.5,.45,1),filter .3s}
.ifo-g:hover{transform:translateY(-5%) rotate(-4deg) scale(1.04)}
.ifo-g:nth-child(even):hover{transform:translateY(-6%) rotate(4deg) scale(1.04)}
.ifo-gp{fill:currentColor;stroke:currentColor;stroke-width:0}
.ifo-intro .ifo-gp{animation:ifo-write 1.9s cubic-bezier(.55,.1,.3,1) both;animation-delay:var(--ifo-d)}
@keyframes ifo-write{0%{fill-opacity:0;stroke-width:5;stroke-dasharray:1;stroke-dashoffset:1}62%{fill-opacity:0;stroke-width:5;stroke-dasharray:1;stroke-dashoffset:0}100%{fill-opacity:1;stroke-width:0;stroke-dasharray:1;stroke-dashoffset:0}}
.ifo-intro .ifo-rise{animation:ifo-rise 1.2s cubic-bezier(.2,.7,.2,1) both;animation-delay:var(--ifo-d,0s)}
@keyframes ifo-rise{from{opacity:0;translate:0 18px}to{opacity:1;translate:0 0}}
.ifo-intro .ifo-open{animation:ifo-open 1.6s cubic-bezier(.65,.05,.25,1) .5s both}
@keyframes ifo-open{from{clip-path:inset(0 50% 0 50%)}to{clip-path:inset(0 0 0 0)}}
.ifo-intro .ifo-grow{animation:ifo-grow 1.4s cubic-bezier(.3,1.3,.5,1) both;animation-delay:var(--ifo-d,1s)}
@keyframes ifo-grow{from{scale:.2;opacity:0}to{scale:1;opacity:1}}

.ifo-band{position:relative;z-index:2;margin-top:-4.6%;aspect-ratio:1600/660}
.ifo-band>svg{position:absolute;inset:0;width:100%;height:100%}
.ifo-band [data-tap]{cursor:crosshair}
.ifo-ly{transition:transform .9s cubic-bezier(.2,.7,.2,1)}
.ifo-ly1{transform:translate(calc(var(--ifo-px) * -8px),calc(var(--ifo-py) * -5px))}
.ifo-ly2{transform:translate(calc(var(--ifo-px) * 10px),calc(var(--ifo-py) * 6px))}
.ifo-ly3{transform:translate(calc(var(--ifo-px) * 22px),calc(var(--ifo-py) * 12px))}
.ifo-ly4{transform:translate(calc(var(--ifo-px) * 38px),calc(var(--ifo-py) * 20px))}
.ifo-lyg{transform:translate(calc(var(--ifo-px) * 90px),calc(var(--ifo-py) * 20px))}
.ifo-sway{transform-box:view-box;transform-origin:0 0;animation:ifo-sway 7s ease-in-out infinite;animation-delay:var(--ifo-d,0s)}
.ifo-leafhit{pointer-events:visiblePainted}
.ifo-leafhit:hover .ifo-sway{animation:ifo-rustle .9s ease-in-out}
@keyframes ifo-sway{0%,100%{rotate:0deg}50%{rotate:2.2deg}}
@keyframes ifo-rustle{0%{rotate:0deg}20%{rotate:-6deg}45%{rotate:4.5deg}70%{rotate:-2deg}100%{rotate:0deg}}
.ifo-float{transform-box:fill-box;transform-origin:center;animation:ifo-float 9s ease-in-out infinite;animation-delay:var(--ifo-d,0s)}
@keyframes ifo-float{0%,100%{translate:0 0;rotate:0deg}25%{translate:6px -10px;rotate:8deg}50%{translate:14px -2px;rotate:-4deg}75%{translate:4px 8px;rotate:6deg}}
.ifo-tw{transform-box:fill-box;transform-origin:center;animation:ifo-tw 3.6s ease-in-out infinite;animation-delay:var(--ifo-d,0s)}
@keyframes ifo-tw{0%,100%{opacity:1;scale:1}50%{opacity:.35;scale:.6}}
.ifo-star{opacity:var(--ifo-night);transition:opacity .8s}
.ifo-fall{transform-box:fill-box;transform-origin:center;animation:ifo-fall 3.4s cubic-bezier(.3,.1,.5,1) forwards}
@keyframes ifo-fall{0%{opacity:0;translate:0 0;rotate:0deg}12%{opacity:1}100%{opacity:0;translate:var(--ifo-dx) 230px;rotate:var(--ifo-rot)}}
.ifo-iris{cursor:pointer;outline:none}
.ifo-iris .ifo-std{transform-box:view-box;transform-origin:0 0;transition:rotate 1.1s cubic-bezier(.3,1.5,.4,1),scale 1.1s cubic-bezier(.3,1.5,.4,1)}
.ifo-iris:hover .ifo-head,.ifo-iris:focus-visible .ifo-head{scale:1.04}
.ifo-head{transform-box:view-box;transform-origin:0 0;transition:scale .6s cubic-bezier(.3,1.5,.4,1)}
.ifo-iris[data-open="true"] .ifo-stdl{rotate:-9deg}
.ifo-iris[data-open="true"] .ifo-stdr{rotate:9deg}
.ifo-iris[data-open="true"] .ifo-stdc{scale:1.06}
.ifo-iris[data-open="true"] .ifo-fl{rotate:-7deg}
.ifo-iris[data-open="true"] .ifo-fr{rotate:7deg}
.ifo-ring{fill:none;stroke:var(--ifo-petal);stroke-width:1.5;stroke-dasharray:3 7;opacity:0;transition:opacity .3s}
.ifo-iris:focus-visible .ifo-ring{opacity:.9}
.ifo-burst{transform-box:fill-box;transform-origin:center;animation:ifo-burst 1.2s cubic-bezier(.2,.7,.2,1) forwards}
@keyframes ifo-burst{0%{opacity:0;translate:0 0;scale:.2}20%{opacity:1}100%{opacity:0;translate:var(--ifo-dx) var(--ifo-dy);scale:1}}
.ifo-drop{animation:ifo-glint 4s ease-in-out infinite;animation-delay:var(--ifo-d,0s)}
@keyframes ifo-glint{0%,100%{opacity:.95}50%{opacity:.5}}

.ifo-foot{position:relative;z-index:3;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:16px;margin-top:clamp(4px,1vw,14px);color:var(--ifo-ink)}
.ifo-cjk{font:400 clamp(26px,3.4vw,50px)/1 var(--ifo-cjk);letter-spacing:.14em;white-space:nowrap}
.ifo-cjk:last-child{justify-self:end;letter-spacing:.12em}
.ifo-disc{text-align:center}
.ifo-disc b{display:block;font:400 clamp(15px,1.6vw,22px)/1 var(--ifo-serif);letter-spacing:.24em;text-transform:uppercase}
.ifo-disc span{display:flex;justify-content:center;flex-wrap:wrap;gap:0 .45em;margin-top:8px;font:400 clamp(9px,.8vw,11.5px)/1.3 var(--ifo-sans);letter-spacing:.06em;color:color-mix(in oklab,var(--ifo-ink) 72%,var(--ifo-paper))}
@media (max-width:640px){.ifo-foot{grid-template-columns:1fr 1fr}.ifo-disc{grid-column:1/-1;grid-row:1}.ifo-band{aspect-ratio:4/5;margin-top:-18%}.ifo-mark{width:100%}}

.ifo-chips{display:flex;flex-wrap:wrap;gap:8px}
.ifo-chip{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 16px;border-radius:99px;box-shadow:inset 0 0 0 1px var(--ifo-line);font:italic 400 16px/1 var(--ifo-serif);color:var(--ifo-text);transition:background-color .25s,color .25s,box-shadow .25s}
.ifo-chip sup{font:600 10px var(--ifo-sans);color:var(--ifo-soft)}
.ifo-chip:hover{box-shadow:inset 0 0 0 1px var(--ifo-ink);color:var(--ifo-ink)}
.ifo-chip[aria-pressed="true"]{background:var(--ifo-ink);color:var(--ifo-paper);box-shadow:none}
.ifo-chip[aria-pressed="true"] sup{color:inherit;opacity:.75}
.ifo-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:clamp(16px,2.4vw,32px)}
.ifo-card{grid-column:span var(--ifo-span);display:flex;flex-direction:column;gap:14px;text-align:left;animation:ifo-in .6s cubic-bezier(.2,.7,.2,1) both;animation-delay:var(--ifo-d,0s)}
@keyframes ifo-in{from{opacity:0;translate:0 14px}to{opacity:1;translate:0 0}}
.ifo-art{position:relative;overflow:hidden;aspect-ratio:16/10;background:var(--ifo-sky-mid);border-radius:2px}
.ifo-art>svg{position:absolute;inset:0;width:100%;height:100%;transition:transform 1.1s cubic-bezier(.2,.7,.2,1)}
.ifo-card:hover .ifo-art>svg,.ifo-card:focus-visible .ifo-art>svg{transform:scale(1.045)}
.ifo-card:hover .ifo-sway{animation:ifo-rustle 1s ease-in-out}
.ifo-art .ifo-img{transition:transform 1.1s cubic-bezier(.2,.7,.2,1)}
.ifo-card:hover .ifo-art .ifo-img{transform:scale(1.045)}
.ifo-view{position:absolute;right:14px;bottom:14px;display:inline-flex;align-items:center;gap:8px;height:32px;padding:0 14px;border-radius:99px;background:color-mix(in oklab,var(--ifo-paper) 92%,transparent);color:var(--ifo-ink);font:italic 400 14px/1 var(--ifo-serif);opacity:0;translate:0 8px;transition:opacity .35s,translate .35s}
.ifo-card:hover .ifo-view,.ifo-card:focus-visible .ifo-view{opacity:1;translate:0 0}
.ifo-meta{display:flex;align-items:baseline;gap:14px}
.ifo-num{font:400 12px/1 var(--ifo-sans);letter-spacing:.08em;color:var(--ifo-soft)}
.ifo-ct{flex:1;font:italic 400 clamp(20px,1.9vw,27px)/1.15 var(--ifo-serif);color:var(--ifo-text);transition:color .25s}
.ifo-card:hover .ifo-ct{color:var(--ifo-ink)}
.ifo-tag{font:400 11px/1 var(--ifo-sans);letter-spacing:.14em;text-transform:uppercase;color:var(--ifo-ink);white-space:nowrap}
.ifo-sum{margin-top:-6px;font-size:14.5px;line-height:1.55;color:var(--ifo-soft);max-width:36em}
@media (max-width:900px){.ifo-card{grid-column:span 6}}
@media (max-width:600px){.ifo-card{grid-column:span 12}}

.ifo-dlg{position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;padding:clamp(10px,3vw,40px);background:color-mix(in oklab,var(--ifo-paper) 55%,rgba(10,14,40,.55));-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);animation:ifo-fade .3s ease both}
@keyframes ifo-fade{from{opacity:0}to{opacity:1}}
.ifo-sheet{position:relative;display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);width:min(1180px,100%);max-height:100%;overflow:auto;background:var(--ifo-paper);border-radius:4px;box-shadow:0 40px 90px -30px rgba(8,12,40,.55);animation:ifo-sheet .5s cubic-bezier(.2,.8,.2,1) both}
@keyframes ifo-sheet{from{opacity:0;translate:0 24px;scale:.98}to{opacity:1;translate:0 0;scale:1}}
.ifo-sheet .ifo-art{aspect-ratio:auto;min-height:320px;border-radius:0}
.ifo-sheetbody{display:flex;flex-direction:column;gap:18px;padding:clamp(22px,3vw,40px)}
.ifo-sheet h3{font:italic 400 clamp(30px,3.4vw,46px)/1.05 var(--ifo-serif);color:var(--ifo-ink)}
.ifo-sheet p{font-size:15.5px;line-height:1.65;color:var(--ifo-soft)}
.ifo-dl{display:grid;grid-template-columns:auto 1fr;gap:8px 18px;padding:16px 0;border-top:1px solid var(--ifo-line);border-bottom:1px solid var(--ifo-line);font-size:14px}
.ifo-dl dt{font:400 11px/1.6 var(--ifo-sans);letter-spacing:.14em;text-transform:uppercase;color:var(--ifo-soft)}
.ifo-dl dd{color:var(--ifo-text)}
.ifo-tools{display:flex;flex-wrap:wrap;gap:6px}
.ifo-tools li{padding:5px 11px;border-radius:99px;background:var(--ifo-wash);font:italic 400 14px/1 var(--ifo-serif);color:var(--ifo-ink)}
.ifo-sheetnav{display:flex;align-items:center;gap:8px;margin-top:auto;padding-top:8px}
.ifo-round{display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:50%;box-shadow:inset 0 0 0 1px var(--ifo-line);color:var(--ifo-ink);transition:background-color .25s,color .25s,box-shadow .25s}
.ifo-round:hover{background:var(--ifo-ink);color:var(--ifo-paper);box-shadow:none}
.ifo-close{position:absolute;top:12px;right:12px;z-index:2;background:var(--ifo-paper)}
.ifo-count{margin-left:auto;font:400 12px var(--ifo-sans);letter-spacing:.1em;color:var(--ifo-soft)}
@media (max-width:820px){.ifo-sheet{grid-template-columns:1fr}.ifo-sheet .ifo-art{min-height:0;aspect-ratio:16/10}}

.ifo-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:10px;height:46px;padding:0 22px;border-radius:99px;background:var(--ifo-ink);color:var(--ifo-paper);font:italic 400 17px/1 var(--ifo-serif);white-space:nowrap;overflow:hidden;transition:transform .3s ease,box-shadow .3s ease}
.ifo-btn:hover{transform:translateY(-2px);box-shadow:0 14px 28px -16px var(--ifo-ink)}
.ifo-btn svg{transition:transform .35s cubic-bezier(.2,.7,.2,1)}
.ifo-btn:hover svg{transform:translateX(3px) rotate(-12deg)}
.ifo-ghost{background:transparent;color:var(--ifo-ink);box-shadow:inset 0 0 0 1.2px var(--ifo-ink)}

.ifo-about{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);gap:clamp(36px,6vw,96px);align-items:center}
.ifo-arch{position:relative;aspect-ratio:4/5;max-width:460px;width:100%;justify-self:center}
.ifo-archin{position:absolute;inset:0;overflow:hidden;border-radius:999px 999px 6px 6px;background:var(--ifo-sky-mid)}
.ifo-archin>svg{position:absolute;inset:0;width:100%;height:100%}
.ifo-archline{position:absolute;inset:-12px;border:1px solid var(--ifo-ink);border-radius:999px 999px 10px 10px;opacity:.5;pointer-events:none}
.ifo-archleaf{position:absolute;pointer-events:none}
.ifo-statement{margin-top:22px;font-family:var(--ifo-serif);font-weight:400;font-size:clamp(25px,3vw,40px);line-height:1.22;letter-spacing:-.005em;color:var(--ifo-text);text-wrap:pretty}
.ifo-statement em{font-style:italic;color:var(--ifo-ink)}
.ifo-body{margin-top:20px;font-size:16px;line-height:1.7;color:var(--ifo-soft);max-width:36em}
.ifo-facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin-top:30px;padding-top:22px;border-top:1px solid var(--ifo-line)}
.ifo-facts dt{font:400 11px/1.4 var(--ifo-sans);letter-spacing:.14em;text-transform:uppercase;color:var(--ifo-soft)}
.ifo-facts dd{margin-top:6px;font:italic 400 17px/1.3 var(--ifo-serif);color:var(--ifo-text)}
.ifo-stats{display:flex;flex-wrap:wrap;gap:20px clamp(24px,4vw,56px);margin-top:30px}
.ifo-stat b{display:block;font:italic 400 clamp(44px,5vw,68px)/1 var(--ifo-serif);color:var(--ifo-ink);font-variant-numeric:lining-nums}
.ifo-stat span{display:block;margin-top:6px;font:400 12px/1.3 var(--ifo-sans);letter-spacing:.1em;text-transform:uppercase;color:var(--ifo-soft)}
.ifo-aboutcta{display:flex;gap:12px;flex-wrap:wrap;margin-top:32px}
@media (max-width:860px){.ifo-about{grid-template-columns:1fr}.ifo-arch{max-width:360px}.ifo-facts{grid-template-columns:1fr 1fr}}

.ifo-svc{border-top:1px solid var(--ifo-line)}
.ifo-svcrow{border-bottom:1px solid var(--ifo-line)}
.ifo-svcbtn{display:grid;grid-template-columns:60px minmax(0,1fr) minmax(0,1fr) 44px;align-items:center;gap:20px;width:100%;padding:clamp(18px,2.4vw,28px) 0}
.ifo-svcn{font:400 12px/1 var(--ifo-sans);letter-spacing:.1em;color:var(--ifo-soft)}
.ifo-svct{display:flex;align-items:center;gap:14px;font:italic 400 clamp(32px,4.4vw,62px)/1 var(--ifo-serif);color:var(--ifo-text);transition:color .3s,transform .5s cubic-bezier(.2,.7,.2,1)}
.ifo-svct svg{opacity:0;scale:.3;transition:opacity .35s,scale .5s cubic-bezier(.3,1.5,.5,1)}
.ifo-svcbtn:hover .ifo-svct,.ifo-svcbtn[aria-expanded="true"] .ifo-svct{color:var(--ifo-ink);transform:translateX(8px)}
.ifo-svcbtn:hover .ifo-svct svg,.ifo-svcbtn[aria-expanded="true"] .ifo-svct svg{opacity:1;scale:1}
.ifo-svcl{font:400 15px/1.5 var(--ifo-sans);color:var(--ifo-soft)}
.ifo-plus{justify-self:end;display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:50%;box-shadow:inset 0 0 0 1px var(--ifo-line);color:var(--ifo-ink);transition:transform .45s cubic-bezier(.3,1.4,.5,1),background-color .25s,color .25s}
.ifo-svcbtn[aria-expanded="true"] .ifo-plus{transform:rotate(45deg);background:var(--ifo-ink);color:var(--ifo-paper)}
.ifo-svcpanel{display:grid;grid-template-rows:0fr;transition:grid-template-rows .55s cubic-bezier(.2,.7,.2,1)}
.ifo-svcpanel[data-open="true"]{grid-template-rows:1fr}
.ifo-svcpanel>div{overflow:hidden}
.ifo-svcin{display:grid;grid-template-columns:60px minmax(0,1fr) minmax(0,1fr) 44px;gap:20px;padding:0 0 clamp(22px,3vw,34px)}
.ifo-svcin p{grid-column:2;font-size:16px;line-height:1.65;color:var(--ifo-soft);max-width:30em}
.ifo-svcin ul{grid-column:3;display:flex;flex-wrap:wrap;align-content:flex-start;gap:8px}
.ifo-svcin li{padding:7px 14px;border-radius:99px;box-shadow:inset 0 0 0 1px var(--ifo-line);font:italic 400 15px/1 var(--ifo-serif);color:var(--ifo-ink)}
@media (max-width:760px){.ifo-svcbtn{grid-template-columns:36px minmax(0,1fr) 44px}.ifo-svcl{display:none}.ifo-svcin{grid-template-columns:36px minmax(0,1fr)}.ifo-svcin p,.ifo-svcin ul{grid-column:2}}

.ifo-tl{position:relative}
.ifo-vine{display:block;width:100%;height:auto;color:var(--ifo-leaf)}
.ifo-vgrow{transition:stroke-dashoffset 1.2s cubic-bezier(.4,.1,.2,1)}
.ifo-bud{transform-box:fill-box;transform-origin:50% 100%;transition:scale .8s cubic-bezier(.3,1.6,.5,1),opacity .4s}
.ifo-years2{display:grid;grid-template-columns:repeat(var(--ifo-n),minmax(0,1fr));margin-top:-8px}
.ifo-yr{display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 4px;color:var(--ifo-soft);transition:color .3s}
.ifo-yr b{font:italic 400 clamp(28px,4vw,52px)/1 var(--ifo-serif);transition:transform .5s cubic-bezier(.3,1.5,.5,1)}
.ifo-yr span{font:400 11px/1.2 var(--ifo-sans);letter-spacing:.14em;text-transform:uppercase}
.ifo-yr:hover{color:var(--ifo-text)}
.ifo-yr[aria-selected="true"]{color:var(--ifo-ink)}
.ifo-yr[aria-selected="true"] b{transform:translateY(-4px) scale(1.08)}
.ifo-tlpanel{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-top:clamp(20px,3vw,36px)}
.ifo-ms{position:relative;padding:22px 22px 24px;border-radius:4px;background:var(--ifo-wash);animation:ifo-in .55s cubic-bezier(.2,.7,.2,1) both;animation-delay:var(--ifo-d,0s)}
.ifo-ms h4{font:italic 400 22px/1.2 var(--ifo-serif);color:var(--ifo-text)}
.ifo-ms p{margin-top:8px;font-size:14px;line-height:1.5;color:var(--ifo-soft)}
.ifo-ms small{display:block;margin-top:10px;font:400 11px/1.3 var(--ifo-sans);letter-spacing:.12em;text-transform:uppercase;color:var(--ifo-ink)}

.ifo-contact{position:relative;text-align:center;padding-bottom:0}
.ifo-hello{display:block;margin:18px auto 0;width:min(100%,880px);height:auto;color:var(--ifo-ink)}
.ifo-cline{margin:18px auto 0;font-size:17px;line-height:1.6;color:var(--ifo-soft);max-width:30em}
.ifo-mail{display:inline-flex;align-items:center;gap:14px;margin-top:30px;padding:16px 28px;border-radius:99px;box-shadow:inset 0 0 0 1.2px var(--ifo-ink);font:italic 400 clamp(20px,2.6vw,32px)/1 var(--ifo-serif);color:var(--ifo-ink);transition:background-color .3s,color .3s}
.ifo-mail:hover{background:var(--ifo-ink);color:var(--ifo-paper)}
.ifo-mail small{font:400 11px/1 var(--ifo-sans);letter-spacing:.14em;text-transform:uppercase;opacity:.7}
.ifo-avail{display:inline-flex;align-items:center;gap:10px;margin-top:22px;font:400 13px/1 var(--ifo-sans);letter-spacing:.04em;color:var(--ifo-soft)}
.ifo-avail i{width:8px;height:8px;border-radius:50%;background:#3fbf7f;box-shadow:0 0 0 0 rgba(63,191,127,.6);animation:ifo-ping 2s ease-out infinite}
@keyframes ifo-ping{to{box-shadow:0 0 0 9px rgba(63,191,127,0)}}
.ifo-socials{display:flex;justify-content:center;flex-wrap:wrap;gap:8px;margin-top:30px}
.ifo-social{display:inline-flex;align-items:center;gap:6px;height:38px;padding:0 16px;border-radius:99px;background:var(--ifo-wash);font:italic 400 16px/1 var(--ifo-serif);color:var(--ifo-ink);transition:background-color .25s,color .25s}
.ifo-social:hover{background:var(--ifo-ink);color:var(--ifo-paper)}
.ifo-social svg{transition:transform .35s cubic-bezier(.3,1.5,.5,1)}
.ifo-social:hover svg{transform:translate(2px,-2px)}
.ifo-strip{position:relative;margin-top:clamp(40px,6vw,72px);height:clamp(90px,12vw,150px)}
.ifo-strip>svg{position:absolute;inset:0;width:100%;height:100%}
.ifo-bottom{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;padding:22px 0 26px;border-top:1px solid var(--ifo-line);font:400 12.5px/1.4 var(--ifo-sans);color:var(--ifo-soft)}
.ifo-bottom .ifo-cjk{font-size:20px;color:var(--ifo-ink)}
.ifo-swatches{display:flex;align-items:center;gap:8px}
.ifo-swatch{width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,var(--ifo-s1) 0 50%,var(--ifo-s2) 50% 100%);box-shadow:0 0 0 1px var(--ifo-line);transition:transform .3s cubic-bezier(.3,1.5,.5,1),box-shadow .3s}
.ifo-swatch:hover{transform:scale(1.15)}
.ifo-swatch[aria-pressed="true"]{box-shadow:0 0 0 2px var(--ifo-paper),0 0 0 3.5px var(--ifo-ink)}
.ifo-top{display:inline-flex;align-items:center;gap:8px;font:italic 400 15px/1 var(--ifo-serif);color:var(--ifo-ink)}
.ifo-top svg{transition:transform .35s cubic-bezier(.3,1.5,.5,1)}
.ifo-top:hover svg{transform:translateY(-3px)}
.ifo-live{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}

@media (prefers-reduced-motion:reduce){.ifo-gp,.ifo-rise,.ifo-open,.ifo-grow,.ifo-sway,.ifo-float,.ifo-tw,.ifo-fall,.ifo-burst,.ifo-drop,.ifo-card,.ifo-ms,.ifo-dlg,.ifo-sheet,.ifo-menu,.ifo-avail i{animation:none!important}.ifo-rv,.ifo-ly,.ifo-g,.ifo-std,.ifo-head,.ifo-vgrow,.ifo-bud,.ifo-svcpanel,.ifo-svct,.ifo-art>svg,.ifo-art .ifo-img{transition:none!important}.ifo-pre{opacity:1;transform:none}.ifo-leafhit:hover .ifo-sway,.ifo-card:hover .ifo-sway{animation:none!important}}
`

/* -------------------------------------------------------- art primitives */

const ArtCtx = React.createContext({ uid: "" })
const useUid = () => React.useContext(ArtCtx).uid
const fillUrl = (uid: string, name: string) => "url(#" + uid + "-" + name + ")"

// Shared gradients and filters, declared once per component instance.
function Defs({ uid }: { uid: string }) {
  const id = (n: string) => uid + "-" + n
  const stop = (offset: string, color: string, opacity?: number) => <stop offset={offset} style={{ stopColor: color, stopOpacity: opacity ?? 1 }} />
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute" }}>
      <defs>
        <linearGradient id={id("leafa")} x1="0" y1="0" x2="1" y2="1">
          {stop("0", "var(--ifo-leaf-hi)")}
          {stop(".55", "var(--ifo-leaf)")}
          {stop("1", "var(--ifo-leaf-lo)")}
        </linearGradient>
        <linearGradient id={id("leafb")} x1="1" y1="0" x2="0" y2="1">
          {stop("0", "var(--ifo-leaf)")}
          {stop(".6", "var(--ifo-leaf-lo)")}
          {stop("1", "color-mix(in oklab,var(--ifo-leaf-lo) 80%,#000)")}
        </linearGradient>
        <linearGradient id={id("vine")} x1="0" y1="0" x2="0" y2="1">
          {stop("0", "var(--ifo-leaf-hi)")}
          {stop(".5", "var(--ifo-leaf)")}
          {stop("1", "var(--ifo-leaf-lo)")}
        </linearGradient>
        <radialGradient id={id("petal")} cx=".3" cy=".55" r=".9">
          {stop("0", "var(--ifo-petal)")}
          {stop(".55", "var(--ifo-petal)")}
          {stop("1", "var(--ifo-petal-lo)")}
        </radialGradient>
        <radialGradient id={id("iris")} cx=".5" cy=".9" r="1">
          {stop("0", "var(--ifo-petal)")}
          {stop(".6", "var(--ifo-petal)")}
          {stop("1", "color-mix(in oklab,var(--ifo-petal-lo) 70%,#b9b0e8)")}
        </radialGradient>
        <radialGradient id={id("beard")} cx=".5" cy=".4" r=".6">
          {stop("0", "#fff6c2")}
          {stop(".45", "var(--ifo-gold)")}
          {stop("1", "var(--ifo-gold-lo)")}
        </radialGradient>
        <radialGradient id={id("drop")} cx=".35" cy=".3" r=".8">
          {stop("0", "#ffffff", 0.95)}
          {stop(".35", "var(--ifo-leaf-hi)", 0.5)}
          {stop("1", "var(--ifo-leaf-lo)", 0.55)}
        </radialGradient>
        <radialGradient id={id("spark")} cx=".5" cy=".5" r=".5">
          {stop("0", "#ffffff", 0.9)}
          {stop("1", "#ffffff", 0)}
        </radialGradient>
        <filter id={id("soft")} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="38" />
        </filter>
        <filter id={id("blur6")} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id={id("grain")} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.4 -.55" />
        </filter>
        <filter id={id("glow")} x="-10%" y="-30%" width="120%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="16" result="b" />
          <feComponentTransfer in="b" result="g">
            <feFuncA type="linear" slope=".42" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in="g" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={id("shade")} x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#0b1d3a" floodOpacity=".22" />
        </filter>
      </defs>
    </svg>
  )
}

// A sky band: graded sky, a peach glow that follows the pointer, a pale haze
// along the bottom, night stars and paper grain.
function Sky({ w, h, x = 0, y = 0, variant = "day", seed = 1, glowClass }: { w: number; h: number; x?: number; y?: number; variant?: IrisSky; seed?: number; glowClass?: string }) {
  const uid = useUid()
  const gid = uid + "-sky-" + variant + "-" + seed
  const rnd = mulberry32(seed * 31 + 7)
  const top = variant === "night" ? "color-mix(in oklab,var(--ifo-sky-top) 40%,#070b2a)" : variant === "dusk" ? "color-mix(in oklab,var(--ifo-sky-top) 70%,#4a2f8a)" : "var(--ifo-sky-top)"
  const mid = variant === "night" ? "color-mix(in oklab,var(--ifo-sky-mid) 45%,#1a1f5c)" : variant === "dusk" ? "color-mix(in oklab,var(--ifo-sky-mid) 70%,#8a5fb8)" : variant === "dawn" ? "color-mix(in oklab,var(--ifo-sky-mid) 75%,var(--ifo-blush))" : "var(--ifo-sky-mid)"
  const low = variant === "night" ? "color-mix(in oklab,var(--ifo-sky-low) 40%,#3a3f8a)" : variant === "dusk" ? "color-mix(in oklab,var(--ifo-sky-low) 60%,var(--ifo-glow))" : variant === "dawn" ? "color-mix(in oklab,var(--ifo-sky-low) 60%,var(--ifo-glow))" : "var(--ifo-sky-low)"
  const glowOp = variant === "night" ? 0.35 : variant === "dawn" ? 1 : 0.9
  const stars = []
  const nStars = variant === "night" ? 26 : 14
  for (let i = 0; i < nStars; i++) stars.push([x + rnd() * w, y + rnd() * rnd() * h * 0.8, 0.8 + rnd() * 1.8])
  return (
    <g>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: top }} />
          <stop offset=".55" style={{ stopColor: mid }} />
          <stop offset="1" style={{ stopColor: low }} />
        </linearGradient>
        <clipPath id={gid + "-c"}>
          <rect x={x} y={y} width={w} height={h} />
        </clipPath>
      </defs>
      <rect x={x} y={y} width={w} height={h} fill={"url(#" + gid + ")"} />
      <g clipPath={"url(#" + gid + "-c)"}>
        <g className={glowClass} opacity={glowOp}>
          <ellipse cx={x + w * 0.56} cy={y + h * 0.06} rx={w * 0.3} ry={h * 0.3} fill="var(--ifo-glow)" filter={fillUrl(uid, "soft")} opacity=".95" />
          <ellipse cx={x + w * 0.4} cy={y + h * 0.1} rx={w * 0.16} ry={h * 0.22} fill="var(--ifo-blush)" filter={fillUrl(uid, "soft")} opacity=".8" />
          <ellipse cx={x + w * 0.72} cy={y + h * 0.16} rx={w * 0.14} ry={h * 0.2} fill="var(--ifo-blush)" filter={fillUrl(uid, "soft")} opacity=".55" />
        </g>
        <ellipse cx={x + w * 0.5} cy={y + h * 1.02} rx={w * 0.62} ry={h * 0.22} fill="#ffffff" filter={fillUrl(uid, "soft")} opacity={variant === "night" ? 0.12 : 0.32} />
        <g className={variant === "night" ? undefined : "ifo-star"}>
          {stars.map((s, i) => (
            <circle key={i} className="ifo-tw" style={{ ["--ifo-d" as string]: -(i * 0.37) + "s" } as React.CSSProperties} cx={r1(s[0])} cy={r1(s[1])} r={r1(s[2] * (w / 1600 + 0.4))} fill="#fff" opacity=".85" />
          ))}
        </g>
        <rect x={x} y={y} width={w} height={h} filter={fillUrl(uid, "grain")} opacity=".16" style={{ mixBlendMode: "soft-light" }} />
      </g>
    </g>
  )
}

const LEAF_CACHE: { [k: string]: LeafShape } = {}
function leafOf(L: number, W: number): LeafShape {
  const k = L + ":" + W
  return LEAF_CACHE[k] || (LEAF_CACHE[k] = heartLeaf(L, W))
}

// A heart leaf on its stalk. (x, y) is where the stalk meets the leaf; `a`
// is the direction the tip points, in degrees clockwise from up.
function Leaf({ x, y, a, L, W, drops = 0, d = 0, stalk, flip }: { x: number; y: number; a: number; L: number; W?: number; drops?: number; d?: number; stalk?: Pt[]; flip?: boolean }) {
  const uid = useUid()
  const shape = leafOf(L, W ?? L * 0.82)
  const dropPts: Pt[] = [[0.18, 0.52], [-0.22, 0.34], [0.08, 0.72], [-0.12, 0.6]]
  return (
    <g className="ifo-leafhit">
      {stalk ? (
        <>
          <path d={ribbon(catmull(stalk, 10), 7, 4.5)} fill={fillUrl(uid, "vine")} />
          <path d={polyline(catmull(stalk, 10))} fill="none" stroke="var(--ifo-leaf-hi)" strokeWidth="1.2" strokeOpacity=".55" transform="translate(-1.2 -.6)" />
        </>
      ) : null}
      <g transform={"translate(" + r1(x) + " " + r1(y) + ")"}>
        <g className="ifo-sway" style={{ ["--ifo-d" as string]: -d + "s" } as React.CSSProperties}>
          <g transform={"rotate(" + r1(a) + ")" + (flip ? " scale(-1 1)" : "")}>
            <path d={shape.a} fill={fillUrl(uid, "leafa")} />
            <path d={shape.b} fill={fillUrl(uid, "leafb")} />
            <path d={shape.veins} fill="none" stroke="var(--ifo-leaf-hi)" strokeWidth="1.3" strokeOpacity=".5" strokeLinecap="round" />
            <path d={shape.rib} fill="none" stroke="var(--ifo-leaf-hi)" strokeWidth="2.2" strokeOpacity=".75" strokeLinecap="round" />
            <path d={shape.a + shape.b} fill="none" stroke="var(--ifo-leaf-lo)" strokeWidth="1" strokeOpacity=".35" />
            {dropPts.slice(0, drops).map((p, i) => {
              const s = L / 260
              return (
                <g key={i} className="ifo-drop" style={{ ["--ifo-d" as string]: -(i * 1.3 + d) + "s" } as React.CSSProperties} transform={"translate(" + r1(p[0] * (W ?? L * 0.82)) + " " + r1(-p[1] * L) + ") scale(" + r1(s) + ")"}>
                  <ellipse rx="7" ry="8" fill={fillUrl(uid, "drop")} />
                  <ellipse cx="-2.2" cy="-3" rx="2" ry="2.6" fill="#fff" />
                  <path d="M-6 3Q0 9 6 3" fill="none" stroke="var(--ifo-leaf-lo)" strokeOpacity=".45" strokeWidth="1.2" />
                </g>
              )
            })}
          </g>
        </g>
      </g>
    </g>
  )
}

function Petal({ x, y, a, L, W, bend = 0.25, d = 0, still }: { x: number; y: number; a: number; L: number; W?: number; bend?: number; d?: number; still?: boolean }) {
  const uid = useUid()
  const p = petalShape(L, W ?? L * 0.42, bend)
  return (
    <g transform={"translate(" + r1(x) + " " + r1(y) + ") rotate(" + r1(a) + ")"}>
      <g className={still ? undefined : "ifo-float"} style={{ ["--ifo-d" as string]: -d + "s" } as React.CSSProperties}>
        <path d={p.o} fill={fillUrl(uid, "petal")} />
        <path d={p.s} fill="var(--ifo-petal-lo)" opacity=".55" />
        <path d={p.o} fill="none" stroke="var(--ifo-petal-lo)" strokeWidth="1" opacity=".8" />
      </g>
    </g>
  )
}

function Sparkle({ x, y, s, d = 0, still }: { x: number; y: number; s: number; d?: number; still?: boolean }) {
  const uid = useUid()
  return (
    <g className={still ? undefined : "ifo-tw"} style={{ ["--ifo-d" as string]: -d + "s" } as React.CSSProperties}>
      <circle cx={x} cy={y} r={s * 0.9} fill={fillUrl(uid, "spark")} />
      <path d={sparklePath(x, y, s)} fill="#ffffff" />
    </g>
  )
}

// One half of the art-nouveau frame (the left; mirror it for the right):
// a long scroll rising from the base and curling over at the top, a spiral
// branching off its waist, and a few leaflets.
const ORN_MAIN = catmull(
  [
    [796, 650], [770, 612], [722, 572], [668, 520], [628, 452], [612, 372], [624, 292], [660, 228], [712, 190], [764, 182],
    ...spiral(742, 226, 44, 6, -1.1, 1.15, 12).slice(1),
  ],
  9,
)
const ORN_CURL = catmull([[636, 470], [664, 448], ...spiral(690, 402, 46, 5, 1.6, -1.35, 14).slice(1)], 9)
const ORN_FOOT = catmull([[760, 620], [716, 618], [676, 604], ...spiral(650, 572, 30, 4, -0.6, -1.1, 10).slice(1)], 9)
const ORN_TOP = catmull([[700, 196], [690, 160], [702, 128], ...spiral(726, 132, 22, 3, 3.3, 1.1, 10).slice(1)], 9)

function OrnamentHalf() {
  const uid = useUid()
  return (
    <g>
      <path d={ribbon(ORN_MAIN, 30, 5)} fill={fillUrl(uid, "vine")} />
      <path d={ribbon(ORN_CURL, 18, 4)} fill={fillUrl(uid, "vine")} />
      <path d={ribbon(ORN_FOOT, 14, 3)} fill={fillUrl(uid, "vine")} />
      <path d={ribbon(ORN_TOP, 10, 3)} fill={fillUrl(uid, "vine")} />
      <path d={polyline(ORN_MAIN)} fill="none" stroke="var(--ifo-leaf-hi)" strokeWidth="2.4" strokeOpacity=".7" strokeLinecap="round" transform="translate(-3 -2)" />
      <path d={polyline(ORN_CURL)} fill="none" stroke="var(--ifo-leaf-hi)" strokeWidth="1.6" strokeOpacity=".6" strokeLinecap="round" transform="translate(-2 -1)" />
      <path d={polyline(ORN_MAIN)} fill="none" stroke="var(--ifo-leaf-lo)" strokeWidth="1.2" strokeOpacity=".35" transform="translate(4 3)" />
      <Leaf x={700} y={598} a={-120} L={58} W={40} d={1.2} />
      <Leaf x={640} y={330} a={-60} L={44} W={30} d={2.4} />
    </g>
  )
}

// A white iris: three standards up, three falls down, a gold beard. Local box
// is about 200 × 220 around (0, 0).
function IrisFlower({ open }: { open: boolean }) {
  const uid = useUid()
  const std = "M0 6C-30 -14 -36 -70 -8 -112C-3 -119 3 -119 8 -112C36 -70 30 -14 0 6Z"
  const stdVein = "M0 0Q-2 -50 0 -100M-8 -10Q-18 -50 -10 -90M8 -10Q18 -50 10 -90"
  const fall = "M-4 6C-34 -6 -78 -2 -96 26C-106 44 -92 66 -70 58C-50 50 -38 30 -6 18Z"
  const fallVein = "M-10 12Q-44 10 -76 34M-10 14Q-40 22 -66 48"
  const low = "M-18 8C-38 46 -28 96 0 112C28 96 38 46 18 8Z"
  const lowVein = "M0 14V96M-6 16Q-18 52 -10 90M6 16Q18 52 10 90M-10 18Q-26 46 -22 74M10 18Q26 46 22 74"
  const petal = fillUrl(uid, "iris")
  const vein = { fill: "none", stroke: "var(--ifo-vein)", strokeWidth: 1, strokeOpacity: 0.38, strokeLinecap: "round" as const }
  const edge = { fill: "none", stroke: "color-mix(in oklab,var(--ifo-petal-lo) 70%,#8a84c4)", strokeWidth: 1.2, strokeOpacity: 0.55 }
  return (
    <g className="ifo-head" data-open={open}>
      <g className="ifo-std ifo-stdl" transform="rotate(-40) scale(.84)">
        <path d={std} fill={petal} />
        <path d={stdVein} {...vein} />
        <path d={std} {...edge} />
      </g>
      <g className="ifo-std ifo-stdr" transform="rotate(40) scale(.84)">
        <path d={std} fill={petal} />
        <path d={stdVein} {...vein} />
        <path d={std} {...edge} />
      </g>
      <g className="ifo-std ifo-fl">
        <path d={fall} fill={petal} />
        <path d={fallVein} {...vein} />
        <path d={fall} {...edge} />
      </g>
      <g className="ifo-std ifo-fr" transform="scale(-1 1)">
        <path d={fall} fill={petal} />
        <path d={fallVein} {...vein} />
        <path d={fall} {...edge} />
      </g>
      <g className="ifo-std ifo-stdc">
        <path d={std} fill={petal} transform="scale(1.04 1.08)" />
        <path d={stdVein} {...vein} />
        <path d={std} {...edge} transform="scale(1.04 1.08)" />
      </g>
      <g>
        <path d={low} fill={petal} />
        <path d={lowVein} {...vein} />
        <path d={low} {...edge} />
      </g>
      <g>
        <path d="M0 -4C-10 4 -12 26 -4 46C-2 50 2 50 4 46C12 26 10 4 0 -4Z" fill={fillUrl(uid, "beard")} />
        <path d="M-5 6L-9 2M-6 16L-11 13M-5 26L-10 25M5 6L9 2M6 16L11 13M5 26L10 25M0 0V-8" stroke="var(--ifo-gold-lo)" strokeWidth="2" strokeLinecap="round" />
        <circle cx="0" cy="-2" r="4" fill="#fff6c2" />
      </g>
    </g>
  )
}

type Fall = { id: number; x: number; y: number; a: number; L: number; dx: number; rot: number }

// The cover's band: sky, both leaf clusters, the frame and the iris.
function HeroBand({ bloom, onBloom, falls, onTap, onFallEnd }: { bloom: number; onBloom: () => void; falls: Fall[]; onTap: (e: React.MouseEvent) => void; onFallEnd: (id: number) => void }) {
  const uid = useUid()
  const bx = 40
  const by = 124
  const bw = 1520
  const bh = 416
  const burst = []
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.3
    burst.push([Math.cos(a) * (120 + (i % 3) * 40), Math.sin(a) * (100 + (i % 2) * 50), 8 + (i % 3) * 5])
  }
  return (
    <svg className="ifo-svg" data-tap="" onClick={onTap} viewBox="0 0 1600 660" preserveAspectRatio="xMidYMid slice" role="img" aria-label="A sky band with heart-shaped leaves, drifting petals and a white iris in a curling vine frame">
      <g className="ifo-open">
        <g>
          <Sky x={bx} y={by} w={bw} h={bh} glowClass="ifo-ly ifo-lyg" seed={3} />
        </g>
      </g>
      <g className="ifo-ly ifo-ly1" style={{ pointerEvents: "none" }}>
        <Sparkle x={1432} y={196} s={22} d={0.5} />
        <Sparkle x={1196} y={262} s={9} d={1.6} />
        <Sparkle x={330} y={190} s={8} d={2.4} />
        <Sparkle x={556} y={232} s={11} d={1.1} />
        <Sparkle x={1010} y={176} s={7} d={0.2} />
      </g>
      {/* left cluster */}
      <g className="ifo-ly ifo-ly2">
        <Leaf x={120} y={262} a={-34} L={140} W={116} d={0.4} stalk={[[54, 560], [70, 420], [102, 320], [120, 248]]} />
        <Leaf x={410} y={396} a={24} L={230} W={200} drops={2} d={1.9} stalk={[[300, 640], [330, 560], [376, 470], [410, 396]]} />
      </g>
      <g className="ifo-ly ifo-ly3">
        <path d={ribbon(catmull([[14, 660], [40, 560], [70, 470], [110, 400], [168, 344], [236, 316], ...spiral(262, 352, 34, 5, -1.5, 1.2, 10).slice(1)], 9), 12, 3)} fill={fillUrl(uid, "vine")} />
        <Leaf x={250} y={300} a={-8} L={250} W={214} drops={3} d={3.1} stalk={[[176, 340], [214, 318], [250, 300]]} />
        <Leaf x={96} y={560} a={70} L={110} W={92} d={4.4} stalk={[[40, 620], [66, 584], [96, 560]]} />
      </g>
      {/* centre frame */}
      <g className="ifo-ly ifo-ly2 ifo-grow" style={{ ["--ifo-d" as string]: "1.1s", transformOrigin: "800px 640px" } as React.CSSProperties}>
        <OrnamentHalf />
        <g transform="translate(1600 0) scale(-1 1)">
          <OrnamentHalf />
        </g>
        <path d={ribbon(catmull([[800, 660], [800, 600], [798, 540], [800, 470]], 8), 22, 10)} fill={fillUrl(uid, "vine")} />
        <Leaf x={800} y={612} a={-48} L={78} W={58} d={0.9} />
        <Leaf x={800} y={612} a={48} L={78} W={58} d={2.2} />
      </g>
      <g className="ifo-ly ifo-ly3">
        <g
          className="ifo-iris"
          data-open={bloom % 2 === 1}
          role="button"
          tabIndex={0}
          aria-label={bloom % 2 === 1 ? "Iris in full bloom. Press to close it." : "White iris. Press to make it bloom."}
          aria-pressed={bloom % 2 === 1}
          onClick={(e) => {
            e.stopPropagation()
            onBloom()
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              onBloom()
            }
          }}
        >
          <g transform="translate(800 408) scale(1.42)">
            <circle className="ifo-ring" r="132" />
            <circle r="128" fill="transparent" />
            <IrisFlower open={bloom % 2 === 1} />
          </g>
          {bloom > 0 ? (
            <g key={bloom} transform="translate(800 400)">
              {burst.map((b, i) => (
                <g key={i} className="ifo-burst" style={{ ["--ifo-dx" as string]: r1(b[0]) + "px", ["--ifo-dy" as string]: r1(b[1]) + "px", animationDelay: i * 0.03 + "s" } as React.CSSProperties}>
                  <path d={sparklePath(0, 0, b[2])} fill="#fff" />
                </g>
              ))}
            </g>
          ) : null}
        </g>
      </g>
      {/* right cluster */}
      <g className="ifo-ly ifo-ly2">
        <Leaf x={1150} y={250} a={-14} L={150} W={124} d={2.8} stalk={[[1240, 470], [1200, 380], [1166, 290], [1150, 226]]} />
        <Leaf x={1500} y={300} a={30} L={140} W={116} d={1.4} stalk={[[1590, 520], [1560, 420], [1520, 350], [1500, 300]]} />
      </g>
      <g className="ifo-ly ifo-ly3">
        <path d={ribbon(catmull([[1600, 380], [1560, 360], [1500, 372], [1440, 410], [1380, 470], [1330, 540], ...spiral(1356, 586, 40, 5, 3.6, -1.1, 10).slice(1)], 9), 12, 3)} fill={fillUrl(uid, "vine")} />
        <Leaf x={1290} y={400} a={14} L={260} W={226} drops={3} d={0.7} stalk={[[1330, 640], [1316, 540], [1296, 460], [1290, 400]]} />
        <Leaf x={1372} y={540} a={104} L={180} W={156} drops={2} d={3.6} stalk={[[1300, 620], [1330, 580], [1356, 556], [1372, 540]]} />
      </g>
      {/* petals */}
      <g className="ifo-ly ifo-ly4" style={{ pointerEvents: "none" }}>
        <Petal x={120} y={500} a={20} L={110} W={44} d={0.5} />
        <Petal x={268} y={468} a={-24} L={74} W={30} d={2.7} />
        <Petal x={1404} y={340} a={-30} L={84} W={36} d={1.8} />
        <Petal x={1410} y={486} a={-12} L={100} W={42} d={4.2} />
        <Petal x={560} y={140} a={150} L={44} W={20} d={3.3} />
        <Petal x={1022} y={560} a={200} L={52} W={22} d={5.1} />
      </g>
      <g style={{ pointerEvents: "none" }}>
        {falls.map((f) => (
          <g key={f.id} transform={"translate(" + r1(f.x) + " " + r1(f.y) + ")"}>
            <g className="ifo-fall" style={{ ["--ifo-dx" as string]: r1(f.dx) + "px", ["--ifo-rot" as string]: r1(f.rot) + "deg" } as React.CSSProperties} onAnimationEnd={() => onFallEnd(f.id)}>
              <Petal x={0} y={0} a={f.a} L={f.L} still />
            </g>
          </g>
        ))}
      </g>
    </svg>
  )
}

/* ------------------------------------------------------------- wordmark */

function Wordmark({ text, className, title, intro, glow, hover = true, delay = 0 }: { text: string; className?: string; title?: string; intro?: boolean; glow?: boolean; hover?: boolean; delay?: number }) {
  const uid = useUid()
  const lay = React.useMemo(() => layoutWord(text), [text])
  const pad = 40
  const vb = [lay.x0 - pad, lay.y0 - pad, lay.x1 - lay.x0 + pad * 2, lay.y1 - lay.y0 + pad * 2]
  return (
    <svg className={"ifo-svg " + (className || "")} viewBox={vb.map((v) => Math.round(v)).join(" ")} role="img" aria-label={title || text}>
      <g filter={glow ? fillUrl(uid, "glow") : undefined}>
        {lay.glyphs.map((g, i) => (
          <g key={i} className={hover ? "ifo-g" : undefined}>
            <rect x={g.box[0]} y={g.box[1]} width={g.box[2] - g.box[0]} height={g.box[3] - g.box[1]} fill="transparent" />
            <path className="ifo-gp" pathLength={1} d={g.d} transform={"translate(" + r1(g.x) + " " + r1(g.y) + ")" + (g.s !== 1 ? " scale(" + g.s + ")" : "")} style={intro ? ({ ["--ifo-d" as string]: delay + i * 0.13 + "s" } as React.CSSProperties) : undefined} />
          </g>
        ))}
      </g>
    </svg>
  )
}

/* ---------------------------------------------------------- project art */

function ProjectArt({ seed, motif, sky }: { seed: number; motif: IrisMotif; sky: IrisSky }) {
  const uid = useUid()
  const rnd = mulberry32(seed)
  const W = 800
  const H = 500
  const side = rnd() > 0.5
  const flipX = (x: number) => (side ? W - x : x)
  const j = (n: number) => (rnd() - 0.5) * n
  return (
    <svg className="ifo-svg" viewBox={"0 0 " + W + " " + H} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <Sky w={W} h={H} variant={sky} seed={seed % 997} />
      {motif === "iris" ? (
        <g>
          <g transform="translate(400 60) scale(.62) translate(-800 0)">
            <OrnamentHalf />
            <g transform="translate(1600 0) scale(-1 1)">
              <OrnamentHalf />
            </g>
          </g>
          <g transform={"translate(400 " + r1(318 + j(10)) + ") scale(.9)"}>
            <IrisFlower open={false} />
          </g>
          <Leaf x={flipX(90)} y={300} a={side ? 20 : -20} L={190} W={160} drops={2} d={seed % 5} stalk={[[flipX(40), 520], [flipX(70), 400], [flipX(90), 300]]} />
          <Leaf x={flipX(720)} y={420} a={side ? -150 : 150} L={170} W={140} drops={1} d={(seed % 7) + 1} />
          <Sparkle x={flipX(640)} y={90} s={16} d={1} />
        </g>
      ) : null}
      {motif === "leaves" ? (
        <g>
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const x = flipX(80 + i * 130 + j(60))
            const y = i % 2 ? 470 + j(30) : 150 + j(40)
            const a = (i % 2 ? 160 : 0) + j(70) + (side ? -1 : 1) * 10
            return <Leaf key={i} x={x} y={y} a={a} L={170 + j(60)} W={150 + j(40)} drops={i % 3} d={i * 0.9} />
          })}
          <Petal x={flipX(420)} y={270} a={-20 + j(30)} L={90} W={36} d={2} />
          <Sparkle x={flipX(560)} y={260} s={14} d={0.4} />
          <Sparkle x={flipX(300)} y={300} s={8} d={1.9} />
        </g>
      ) : null}
      {motif === "petals" ? (
        <g>
          <Leaf x={flipX(150)} y={330} a={side ? 30 : -30} L={260} W={220} drops={3} d={1} stalk={[[flipX(60), 520], [flipX(110), 420], [flipX(150), 330]]} />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <Petal key={i} x={flipX(330 + i * 62 + j(40))} y={120 + ((i * 97) % 280) + j(40)} a={j(200)} L={60 + j(40)} W={26} d={i * 1.3} />
          ))}
          <Sparkle x={flipX(700)} y={100} s={20} d={0.2} />
          <Sparkle x={flipX(520)} y={380} s={10} d={1.4} />
        </g>
      ) : null}
      {motif === "vine" ? (
        <g>
          {[0, 1, 2].map((i) => {
            const cx = 180 + i * 220 + j(40)
            const cy = 250 + j(80)
            const pts = catmull([[cx - 140, 520], [cx - 60, 420], [cx - 10, 330], ...spiral(cx + 20, cy, 60, 6, Math.PI, i % 2 ? 1.4 : -1.4, 14).slice(1)], 8)
            return (
              <g key={i}>
                <path d={ribbon(pts, 20, 4)} fill={fillUrl(uid, "vine")} />
                <Leaf x={cx - 60} y={420} a={-60 + j(30)} L={70} W={52} d={i} />
              </g>
            )
          })}
          <Sparkle x={680} y={110} s={18} d={0.8} />
          <Sparkle x={120} y={120} s={10} d={2.1} />
          <Petal x={560} y={400} a={-30} L={70} W={30} d={1.5} />
        </g>
      ) : null}
      {motif === "moon" ? (
        <g>
          <circle cx={flipX(560)} cy={170} r={130} fill="#fff4dc" opacity=".18" filter={fillUrl(uid, "blur6")} />
          <path d={crescent(flipX(560), 170, 86, side ? -1 : 1)} fill="#fff8ec" />
          <Leaf x={flipX(180)} y={360} a={side ? 18 : -18} L={250} W={210} drops={2} d={0.6} stalk={[[flipX(130), 520], [flipX(160), 440], [flipX(180), 360]]} />
          <Leaf x={flipX(700)} y={470} a={side ? -160 : 160} L={200} W={170} drops={1} d={2.3} />
          <Petal x={flipX(420)} y={330} a={-16} L={80} W={32} d={1} />
          <Sparkle x={flipX(380)} y={120} s={14} d={0.5} />
          <Sparkle x={flipX(690)} y={300} s={9} d={1.8} />
        </g>
      ) : null}
    </svg>
  )
}

/* ------------------------------------------------------------------ icons */

const I = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
const ArrowRight = ({ s = 16 }: { s?: number }) => (
  <svg className="ifo-svg" width={s} height={s} viewBox="0 0 16 16" aria-hidden="true">
    <path d="M2 8h11M9 4l4 4-4 4" {...I} />
  </svg>
)
const ArrowLeft = ({ s = 16 }: { s?: number }) => (
  <svg className="ifo-svg" width={s} height={s} viewBox="0 0 16 16" aria-hidden="true">
    <path d="M14 8H3M7 4 3 8l4 4" {...I} />
  </svg>
)
const ArrowUpRight = ({ s = 14 }: { s?: number }) => (
  <svg className="ifo-svg" width={s} height={s} viewBox="0 0 14 14" aria-hidden="true">
    <path d="M3 11 11 3M5 3h6v6" {...I} />
  </svg>
)
const Plus = () => (
  <svg className="ifo-svg" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
    <path d="M7 1v12M1 7h12" {...I} />
  </svg>
)
const Close = () => (
  <svg className="ifo-svg" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
    <path d="M2 2l10 10M12 2 2 12" {...I} />
  </svg>
)
const Star = ({ s = 14 }: { s?: number }) => (
  <svg className="ifo-svg" width={s} height={s} viewBox="-10 -10 20 20" aria-hidden="true">
    <path d={sparklePath(0, 0, 9.5)} fill="currentColor" />
  </svg>
)
const LongArrow = () => (
  <svg className="ifo-svg" viewBox="0 0 66 14" aria-hidden="true" preserveAspectRatio="none">
    <path d="M1 7h62M55 1.5 63.5 7 55 12.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
  </svg>
)

/* ----------------------------------------------------------------- hooks */

function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false)
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const on = () => setReduced(mq.matches)
    on()
    mq.addEventListener("change", on)
    return () => mq.removeEventListener("change", on)
  }, [])
  return reduced
}

// Counts up to `value` the first time the element scrolls into view.
function CountUp({ value, reduced }: { value: number; reduced: boolean }) {
  const ref = React.useRef(null as null | HTMLElement)
  const [n, setN] = React.useState(value)
  React.useEffect(() => {
    const el = ref.current
    if (!el || reduced || typeof IntersectionObserver === "undefined") return
    let raf = 0
    let done = false
    const r = el.getBoundingClientRect()
    if (r.top < window.innerHeight) return
    setN(0)
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || done) return
      done = true
      const t0 = performance.now()
      const tick = (t: number) => {
        const k = easeOutCubic((t - t0) / 1400)
        setN(Math.round(value * k))
        if (k < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    })
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [value, reduced])
  return <b ref={ref as React.RefObject<HTMLElement>}>{n}</b>
}

/* ------------------------------------------------------------- component */

export default function IrisFolioTemplate({
  name = "Lin Ruoxi",
  mark = "©RUOXI",
  nav = DEFAULT_NAV,
  hero = {},
  worksCopy = {},
  projects = DEFAULT_PROJECTS,
  about = {},
  servicesCopy = {},
  services = DEFAULT_SERVICES,
  timelineCopy = {},
  timeline = DEFAULT_TIMELINE,
  contact = {},
  palette = "morning",
  ink,
  paper,
  paletteSwitcher = true,
  theme = "auto",
  intro = true,
  onProjectOpen,
  height = "100svh",
  className = "",
}: IrisFolioTemplateProps) {
  const uid = "ifo" + React.useId().replace(/[^a-zA-Z0-9]/g, "")
  const H = { ...DEFAULT_HERO, ...hero }
  const A = { ...DEFAULT_ABOUT, ...about }
  const C = { ...DEFAULT_CONTACT, ...contact }
  const works = { title: "Works", kicker: "Selected works", intro: "A garden of identities, books, posters and paintings. Pick a discipline, then open any piece.", ...worksCopy }
  const svcCopy = { title: "Practice", kicker: "What I do", intro: "Four ways in. Open one to see what it usually includes.", ...servicesCopy }
  const tlCopy = { title: "Timeline", kicker: "(" + H.from + " → " + H.to + ")", intro: "How the garden grew. Pick a year.", ...timelineCopy }

  const reduced = useReducedMotion()
  const [pal, setPal] = React.useState(palette)
  React.useEffect(() => setPal(palette), [palette])
  const [introOn, setIntroOn] = React.useState(intro)
  const [scrolled, setScrolled] = React.useState(false)
  const [menu, setMenu] = React.useState(false)
  const [active, setActive] = React.useState("")
  const [bloom, setBloom] = React.useState(0)
  const [falls, setFalls] = React.useState([] as Fall[])
  const [filter, setFilter] = React.useState(null as string | null)
  const [openIdx, setOpenIdx] = React.useState(null as number | null)
  const [svcOpen, setSvcOpen] = React.useState(0 as number | null)
  const [year, setYear] = React.useState(Math.max(0, timeline.length - 1))
  const [copied, setCopied] = React.useState(false)
  const [live, setLive] = React.useState("")

  const rootRef = React.useRef(null as null | HTMLDivElement)
  const heroRef = React.useRef(null as null | HTMLElement)
  const fallId = React.useRef(0)
  const lastFocus = React.useRef(null as null | HTMLElement)
  const closeRef = React.useRef(null as null | HTMLButtonElement)

  const shown = filterProjects(projects, filter)
  const cats = disciplinesOf(projects)
  const current = openIdx === null ? null : shown[openIdx] || null

  // the write-in only runs once; drop the class so hovers are not fighting it
  React.useEffect(() => {
    if (!introOn) return
    const t = window.setTimeout(() => setIntroOn(false), 4200)
    return () => window.clearTimeout(t)
  }, [introOn])

  // nav state + scroll spy
  React.useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    let io: IntersectionObserver | null = null
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) if (e.isIntersecting) setActive((e.target as HTMLElement).dataset.sec || "")
        },
        { rootMargin: "-45% 0px -50% 0px" },
      )
      root.querySelectorAll("[data-sec]").forEach((n) => io && io.observe(n))
    }
    return () => {
      window.removeEventListener("scroll", onScroll)
      if (io) io.disconnect()
    }
  }, [])

  // reveal on scroll: only what starts below the fold is hidden, and only now
  React.useEffect(() => {
    const root = rootRef.current
    if (!root || reduced || typeof IntersectionObserver === "undefined") return
    const below = Array.from(root.querySelectorAll(".ifo-rv")).filter((n) => n.getBoundingClientRect().top > window.innerHeight)
    below.forEach((n) => n.classList.add("ifo-pre"))
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) {
            e.target.classList.remove("ifo-pre")
            io.unobserve(e.target)
          }
      },
      { rootMargin: "0px 0px -10% 0px" },
    )
    below.forEach((n) => io.observe(n))
    return () => {
      io.disconnect()
      below.forEach((n) => n.classList.remove("ifo-pre"))
    }
  }, [reduced])

  // pointer parallax on the cover
  React.useEffect(() => {
    const el = heroRef.current
    if (!el || reduced || !window.matchMedia("(pointer: fine)").matches) return
    let raf = 0
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      const px = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1)
      const py = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1)
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--ifo-px", px.toFixed(3))
        el.style.setProperty("--ifo-py", py.toFixed(3))
      })
    }
    const leave = () => {
      el.style.setProperty("--ifo-px", "0")
      el.style.setProperty("--ifo-py", "0")
    }
    el.addEventListener("pointermove", move)
    el.addEventListener("pointerleave", leave)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener("pointermove", move)
      el.removeEventListener("pointerleave", leave)
    }
  }, [reduced])

  // Escape closes the menu and the viewer; arrows page the viewer
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(false)
        setOpenIdx(null)
      }
      if (openIdx !== null && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
        const n = nextIndex(openIdx, e.key, shown.length)
        if (n !== null) setOpenIdx(n)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [openIdx, shown.length])

  // viewer: lock the page behind it, focus in, focus back out
  React.useEffect(() => {
    if (openIdx === null) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    closeRef.current?.focus()
    return () => {
      document.body.style.overflow = prev
      lastFocus.current?.focus()
    }
  }, [openIdx === null])

  React.useEffect(() => {
    if (current && onProjectOpen) onProjectOpen(current)
  }, [current])

  const go = (e: React.MouseEvent, href: string) => {
    if (!href.startsWith("#")) return
    const t = rootRef.current?.querySelector('[data-sec="' + href.slice(1) + '"]')
    if (!t) return
    e.preventDefault()
    setMenu(false)
    t.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" })
  }

  const scatter = (x: number, y: number, n: number) => {
    if (reduced) return
    const rnd = mulberry32(fallId.current * 7919 + 13)
    const add: Fall[] = []
    for (let i = 0; i < n; i++) add.push({ id: ++fallId.current, x: x + (rnd() - 0.5) * 60, y: y + (rnd() - 0.5) * 40, a: rnd() * 360, L: 40 + rnd() * 40, dx: 60 + rnd() * 160, rot: (rnd() - 0.5) * 540 })
    setFalls((f) => f.concat(add).slice(-28))
  }

  const onTap = (e: React.MouseEvent) => {
    const svg = e.currentTarget as SVGSVGElement
    const m = svg?.getScreenCTM()
    if (!svg || !m) return
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
    scatter(p.x, p.y, 4)
  }

  const onBloom = () => {
    setBloom((b) => b + 1)
    setLive(bloom % 2 === 0 ? "The iris blooms." : "The iris closes.")
    if (bloom % 2 === 0) scatter(800, 380, 6)
  }

  const openProject = (i: number, e: React.MouseEvent | React.KeyboardEvent) => {
    lastFocus.current = e.currentTarget as HTMLElement
    setOpenIdx(i)
  }

  const copyEmail = async (e: React.MouseEvent) => {
    if (!C.email) return
    try {
      if (!navigator.clipboard) return
      e.preventDefault()
      await navigator.clipboard.writeText(C.email)
      setCopied(true)
      setLive("Email address copied.")
      window.setTimeout(() => setCopied(false), 2200)
    } catch {
      window.location.href = "mailto:" + C.email
    }
  }

  const onYearKey = (i: number, e: React.KeyboardEvent) => {
    const n = nextIndex(i, e.key, timeline.length)
    if (n === null) return
    e.preventDefault()
    setYear(n)
    const btn = rootRef.current?.querySelector('[data-yr="' + n + '"]') as HTMLElement | null
    btn?.focus()
  }

  const tlN = Math.max(1, timeline.length)
  const vineX = (i: number) => (tlN === 1 ? 500 : 80 + (i * 840) / (tlN - 1))
  const vinePts: Pt[] = []
  for (let i = 0; i <= 40; i++) {
    const x = 20 + i * 24
    vinePts.push([x, 60 + Math.sin(i * 0.62) * 16])
  }
  const vineD = polyline(catmull(vinePts, 4))
  const grown = tlN === 1 ? 1 : (vineX(year) - 20) / 960 + 0.02

  const yearRange = H.from + " → " + H.to
  const style = { ...paletteVars(pal, ink, paper), "--ifo-h": height } as React.CSSProperties

  return (
    <div ref={rootRef} className={"ifo-root " + (introOn && !reduced ? "ifo-intro " : "") + className} data-theme={theme} style={style}>
      <style>{IFO_CSS}</style>
      <ArtCtx.Provider value={{ uid }}>
        <Defs uid={uid} />

        <header className="ifo-nav" data-scrolled={scrolled}>
          <div className="ifo-wrap ifo-navin">
            <a href="#top" className="ifo-who" onClick={(e) => go(e, "#top")}>
              {name} — {H.discipline}
            </a>
            <nav className="ifo-links" aria-label="Sections">
              {nav.map((l) => (
                <a key={l.href} href={l.href} className="ifo-link" aria-current={active === l.href.slice(1) ? "true" : undefined} onClick={(e) => go(e, l.href)}>
                  {l.label}
                </a>
              ))}
            </nav>
            <button className="ifo-burger" aria-expanded={menu} aria-controls={uid + "-menu"} onClick={() => setMenu((m) => !m)}>
              {menu ? <Close /> : <Star s={12} />} Menu
            </button>
            <a href={"#contact"} className="ifo-pill" onClick={(e) => go(e, "#contact")} aria-label={mark + " — contact"}>
              {mark}
            </a>
          </div>
          {menu ? (
            <div className="ifo-menu" id={uid + "-menu"}>
              <div className="ifo-wrap">
                {nav.map((l, i) => (
                  <a key={l.href} href={l.href} onClick={(e) => go(e, l.href)}>
                    {l.label} <small>{pad2(i + 1)}</small>
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </header>

        <section ref={heroRef} className="ifo-hero" data-sec="top" aria-label="Cover">
          <div className="ifo-heroin">
            <p className="ifo-years ifo-rise" style={{ ["--ifo-d" as string]: ".1s" } as React.CSSProperties}>
              <a href="#timeline" onClick={(e) => go(e, "#timeline")} aria-label={"Timeline, " + H.from + " to " + H.to}>
                ({H.from} <LongArrow /> {H.to})
              </a>
            </p>
            <h1 style={{ margin: 0 }}>
              <Wordmark text={H.title} className="ifo-mark" glow intro={introOn && !reduced} delay={0.3} title={H.title + " — " + name + ", " + yearRange} />
            </h1>
            <div className="ifo-band">
              <HeroBand bloom={bloom} onBloom={onBloom} falls={falls} onTap={onTap} onFallEnd={(id) => setFalls((f) => f.filter((x) => x.id !== id))} />
            </div>
            <div className="ifo-foot ifo-rise" style={{ ["--ifo-d" as string]: "1.6s" } as React.CSSProperties}>
              <span className="ifo-cjk" lang="zh">{H.localName}</span>
              <p className="ifo-disc">
                <b>{H.discipline}</b>
                <span>
                  {H.tags.map((t, i) => (
                    <React.Fragment key={t}>
                      {i ? <i aria-hidden="true">/</i> : null}
                      {t}
                    </React.Fragment>
                  ))}
                </span>
              </p>
              <span className="ifo-cjk" lang="zh">{H.localTitle}</span>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------- works */}
        <section className="ifo-sec" id={uid + "-works"} data-sec="works" aria-labelledby={uid + "-works-h"}>
          <div className="ifo-wrap">
            <div className="ifo-sechead ifo-rv">
              <div>
                <p className="ifo-kicker">
                  <Star s={12} /> {works.kicker} ({pad2(projects.length)})
                </p>
                <h2 id={uid + "-works-h"} style={{ margin: "10px 0 0" }}>
                  <Wordmark text={works.title} className="ifo-sectitle" />
                </h2>
              </div>
              <p className="ifo-lede">{works.intro}</p>
            </div>
            <div className="ifo-chips ifo-rv" role="group" aria-label="Filter by discipline" style={{ marginBottom: "clamp(22px,3vw,36px)" }}>
              <button className="ifo-chip" aria-pressed={filter === null} onClick={() => setFilter(null)}>
                All <sup>{projects.length}</sup>
              </button>
              {cats.map((c) => (
                <button key={c} className="ifo-chip" aria-pressed={filter === c} onClick={() => setFilter(filter === c ? null : c)}>
                  {c} <sup>{projects.filter((p) => p.discipline === c).length}</sup>
                </button>
              ))}
            </div>
            <div className="ifo-grid ifo-rv" key={filter || "all"}>
              {shown.map((p, i) => {
                const seed = hashString(p.title)
                return (
                  <button
                    key={p.title + i}
                    className="ifo-card"
                    style={{ ["--ifo-span" as string]: spanFor(i, shown.length), ["--ifo-d" as string]: i * 0.06 + "s" } as React.CSSProperties}
                    onClick={(e) => openProject(i, e)}
                    aria-haspopup="dialog"
                    aria-label={p.title + ", " + p.discipline + ", " + p.year + ". Open project."}
                  >
                    <div className="ifo-art">
                      {p.cover ? <img className="ifo-img" src={p.cover} alt="" loading="lazy" /> : <ProjectArt seed={seed} motif={p.motif || MOTIFS[seed % MOTIFS.length]} sky={p.sky || "day"} />}
                      <span className="ifo-view">
                        View <ArrowUpRight />
                      </span>
                    </div>
                    <div className="ifo-meta">
                      <span className="ifo-num">({pad2(projects.indexOf(p) + 1)})</span>
                      <span className="ifo-ct">{p.title}</span>
                      <span className="ifo-tag">
                        {p.discipline} · {p.year}
                      </span>
                    </div>
                    <p className="ifo-sum">{p.summary}</p>
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------- about */}
        <section className="ifo-sec" style={{ background: "var(--ifo-wash)" }} data-sec="about" aria-labelledby={uid + "-about-h"}>
          <div className="ifo-wrap ifo-about">
            <div className="ifo-arch ifo-rv">
              <div className="ifo-archline" />
              <div className="ifo-archin">
                {A.portrait ? (
                  <img className="ifo-img" src={A.portrait} alt={name} />
                ) : (
                  <svg className="ifo-svg" viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" role="img" aria-label="A white iris against a sunrise sky">
                    <Sky w={400} h={500} variant="dawn" seed={11} />
                    <g transform="translate(200 40) scale(.5) translate(-800 0)">
                      <OrnamentHalf />
                      <g transform="translate(1600 0) scale(-1 1)">
                        <OrnamentHalf />
                      </g>
                    </g>
                    <g transform="translate(200 250) scale(.78)">
                      <IrisFlower open={bloom % 2 === 1} />
                    </g>
                    <Leaf x={40} y={420} a={20} L={150} W={128} drops={2} d={0.5} />
                    <Leaf x={370} y={470} a={-30} L={160} W={136} drops={1} d={2} />
                    <Sparkle x={320} y={90} s={14} d={0.3} />
                    <Petal x={80} y={170} a={-20} L={60} W={24} d={1} />
                  </svg>
                )}
              </div>
              <svg className="ifo-svg ifo-archleaf" viewBox="0 0 300 300" style={{ width: "46%", right: "-14%", bottom: "-8%" }} aria-hidden="true">
                <Leaf x={150} y={250} a={30} L={210} W={180} drops={2} d={1.4} />
              </svg>
            </div>
            <div className="ifo-rv">
              <p className="ifo-kicker">
                <Star s={12} /> {name}
              </p>
              <h2 id={uid + "-about-h"} style={{ margin: "10px 0 0" }}>
                <Wordmark text={A.title} className="ifo-sectitle" />
              </h2>
              <p className="ifo-statement">{parseEmphasis(A.statement).map((s, i) => (s.em ? <em key={i}>{s.text}</em> : <React.Fragment key={i}>{s.text}</React.Fragment>))}</p>
              {A.body ? <p className="ifo-body">{A.body}</p> : null}
              {A.stats && A.stats.length ? (
                <div className="ifo-stats">
                  {A.stats.map((s) => (
                    <div className="ifo-stat" key={s.label}>
                      <span style={{ display: "flex", alignItems: "baseline", margin: 0, font: "inherit", letterSpacing: 0, textTransform: "none" }}>
                        <CountUp value={s.value} reduced={reduced} />
                        {s.suffix ? <b style={{ fontSize: "0.6em" }}>{s.suffix}</b> : null}
                      </span>
                      <span>{s.label}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              {A.facts && A.facts.length ? (
                <dl className="ifo-facts">
                  {A.facts.map((f) => (
                    <div key={f.label}>
                      <dt>{f.label}</dt>
                      <dd>{f.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              <div className="ifo-aboutcta">
                <a className="ifo-btn" href="#contact" onClick={(e) => go(e, "#contact")}>
                  Work with me <ArrowRight />
                </a>
                {A.cv ? (
                  <a className="ifo-btn ifo-ghost" href={A.cv.href}>
                    {A.cv.label} <ArrowUpRight />
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------- practice */}
        <section className="ifo-sec" data-sec="practice" aria-labelledby={uid + "-svc-h"}>
          <div className="ifo-wrap">
            <div className="ifo-sechead ifo-rv">
              <div>
                <p className="ifo-kicker">
                  <Star s={12} /> {svcCopy.kicker}
                </p>
                <h2 id={uid + "-svc-h"} style={{ margin: "10px 0 0" }}>
                  <Wordmark text={svcCopy.title} className="ifo-sectitle" />
                </h2>
              </div>
              <p className="ifo-lede">{svcCopy.intro}</p>
            </div>
            <ul className="ifo-svc ifo-rv">
              {services.map((s, i) => {
                const on = svcOpen === i
                return (
                  <li key={s.title} className="ifo-svcrow">
                    <button className="ifo-svcbtn" aria-expanded={on} aria-controls={uid + "-svc-" + i} id={uid + "-svcb-" + i} onClick={() => setSvcOpen(on ? null : i)}>
                      <span className="ifo-svcn">({pad2(i + 1)})</span>
                      <span className="ifo-svct">
                        {s.title} <Star s={22} />
                      </span>
                      <span className="ifo-svcl">{s.line}</span>
                      <span className="ifo-plus">
                        <Plus />
                      </span>
                    </button>
                    <div className="ifo-svcpanel" id={uid + "-svc-" + i} role="region" aria-labelledby={uid + "-svcb-" + i} data-open={on}>
                      <div>
                        <div className="ifo-svcin" hidden={!on && reduced}>
                          <p>{s.body || s.line}</p>
                          {s.deliverables ? (
                            <ul>
                              {s.deliverables.map((d) => (
                                <li key={d}>{d}</li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>

        {/* ---------------------------------------------------- timeline */}
        {timeline.length ? (
          <section className="ifo-sec" style={{ paddingTop: 0 }} data-sec="timeline" aria-labelledby={uid + "-tl-h"}>
            <div className="ifo-wrap ifo-tl">
              <div className="ifo-sechead ifo-rv">
                <div>
                  <p className="ifo-kicker">
                    <Star s={12} /> {tlCopy.kicker}
                  </p>
                  <h2 id={uid + "-tl-h"} style={{ margin: "10px 0 0" }}>
                    <Wordmark text={tlCopy.title} className="ifo-sectitle" />
                  </h2>
                </div>
                <p className="ifo-lede">{tlCopy.intro}</p>
              </div>
              <div className="ifo-rv">
                <svg className="ifo-svg ifo-vine" viewBox="0 0 1000 120" aria-hidden="true">
                  <path d={vineD} fill="none" stroke="var(--ifo-line)" strokeWidth="3" strokeLinecap="round" />
                  <path className="ifo-vgrow" d={vineD} pathLength={1} fill="none" stroke="var(--ifo-leaf)" strokeWidth="5" strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={1 - clamp(grown, 0, 1)} />
                  {timeline.map((_, i) => {
                    const x = vineX(i)
                    const y = 60 + Math.sin(((x - 20) / 24) * 0.62) * 16
                    const on = i <= year
                    return (
                      <g key={i}>
                        <g className="ifo-bud" style={{ scale: on ? "1" : "0", opacity: on ? 1 : 0, transitionDelay: on ? i * 0.15 + 0.3 + "s" : "0s" }}>
                          <Leaf x={x - 4} y={y - 4} a={-40} L={46} W={36} d={i} />
                          <Leaf x={x + 4} y={y - 4} a={40} L={40} W={32} d={i + 1} />
                        </g>
                        <circle cx={x} cy={y} r={i === year ? 10 : 7} fill={on ? "var(--ifo-ink)" : "var(--ifo-paper)"} stroke="var(--ifo-ink)" strokeWidth="2" style={{ transition: "r .4s, fill .4s" }} />
                      </g>
                    )
                  })}
                </svg>
                <div className="ifo-years2" role="tablist" aria-label="Years" style={{ ["--ifo-n" as string]: tlN } as React.CSSProperties}>
                  {timeline.map((y, i) => (
                    <button
                      key={String(y.year)}
                      role="tab"
                      className="ifo-yr"
                      data-yr={i}
                      id={uid + "-yr-" + i}
                      aria-selected={i === year}
                      aria-controls={uid + "-yrp"}
                      tabIndex={i === year ? 0 : -1}
                      onClick={() => setYear(i)}
                      onKeyDown={(e) => onYearKey(i, e)}
                    >
                      <b>{y.year}</b>
                      {y.headline ? <span>{y.headline}</span> : null}
                    </button>
                  ))}
                </div>
                <div className="ifo-tlpanel" role="tabpanel" id={uid + "-yrp"} aria-labelledby={uid + "-yr-" + year} key={year}>
                  {(timeline[year]?.items || []).map((m, i) => (
                    <div className="ifo-ms" key={m.title} style={{ ["--ifo-d" as string]: i * 0.08 + "s" } as React.CSSProperties}>
                      <h4>{m.title}</h4>
                      {m.note ? <p>{m.note}</p> : null}
                      {m.place ? <small>{m.place}</small> : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {/* ----------------------------------------------------- contact */}
        <footer className="ifo-sec ifo-contact" style={{ background: "var(--ifo-wash)" }} data-sec="contact" aria-labelledby={uid + "-ct-h"}>
          <div className="ifo-wrap">
            <p className="ifo-kicker ifo-rv">
              <Star s={12} /> Contact
            </p>
            <h2 id={uid + "-ct-h"} className="ifo-rv" style={{ margin: 0 }}>
              <Wordmark text={C.title} className="ifo-hello" glow />
            </h2>
            <p className="ifo-cline ifo-rv">{C.line}</p>
            {C.email ? (
              <a className="ifo-mail ifo-rv" href={"mailto:" + C.email} onClick={copyEmail} aria-label={(copied ? "Copied " : "Copy ") + C.email}>
                {C.email} <small>{copied ? "Copied ✦" : "Copy"}</small>
              </a>
            ) : null}
            <div>
              {C.availability ? (
                <p className="ifo-avail">
                  <i aria-hidden="true" /> {C.availability}
                </p>
              ) : null}
            </div>
            {C.socials && C.socials.length ? (
              <ul className="ifo-socials">
                {C.socials.map((s) => (
                  <li key={s.label}>
                    <a className="ifo-social" href={s.href} target={/^https?:/.test(s.href) ? "_blank" : undefined} rel={/^https?:/.test(s.href) ? "noreferrer" : undefined}>
                      {s.label} <ArrowUpRight s={12} />
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="ifo-strip" aria-hidden="true">
            <svg className="ifo-svg" viewBox="0 0 1600 200" preserveAspectRatio="xMidYMid slice">
              <Sky x={0} y={40} w={1600} h={160} variant="dawn" seed={5} />
              <Leaf x={140} y={120} a={-30} L={150} W={126} drops={1} d={0.3} />
              <Leaf x={420} y={178} a={20} L={120} W={100} d={1.3} />
              <Leaf x={1200} y={180} a={-16} L={130} W={110} drops={1} d={2.1} />
              <Leaf x={1470} y={110} a={34} L={160} W={134} drops={2} d={3} />
              <Petal x={640} y={110} a={-20} L={60} W={24} d={1} />
              <Petal x={980} y={150} a={30} L={70} W={28} d={2.5} />
              <Sparkle x={820} y={90} s={16} d={0.5} />
              <g transform="translate(800 150) scale(.45)">
                <IrisFlower open={false} />
              </g>
            </svg>
          </div>
          <div className="ifo-wrap">
            <div className="ifo-bottom">
              <span>
                © {new Date().getFullYear()} {name} · <span className="ifo-cjk" lang="zh">{H.localName}</span>
              </span>
              {paletteSwitcher ? (
                <div className="ifo-swatches" role="group" aria-label="Palette">
                  {PALETTE_KEYS.map((k) => {
                    const p = PALETTES[k as IrisPalette]
                    return <button key={k} className="ifo-swatch" aria-pressed={pal === k} aria-label={p.label + " palette"} title={p.label} style={{ ["--ifo-s1" as string]: p.ink, ["--ifo-s2" as string]: p.glow } as React.CSSProperties} onClick={() => setPal(k as IrisPalette)} />
                  })}
                </div>
              ) : null}
              <a href="#top" className="ifo-top" onClick={(e) => go(e, "#top")}>
                Back to top{" "}
                <svg className="ifo-svg" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M7 12V2M3 6l4-4 4 4" {...I} />
                </svg>
              </a>
            </div>
          </div>
        </footer>

        {/* ------------------------------------------------------ viewer */}
        {current && openIdx !== null ? (
          <div className="ifo-dlg" onClick={() => setOpenIdx(null)}>
            <div className="ifo-sheet" role="dialog" aria-modal="true" aria-labelledby={uid + "-dlg-h"} onClick={(e) => e.stopPropagation()}>
              <button ref={closeRef} className="ifo-round ifo-close" onClick={() => setOpenIdx(null)} aria-label="Close project">
                <Close />
              </button>
              <div className="ifo-art">{current.cover ? <img className="ifo-img" src={current.cover} alt={current.title} /> : <ProjectArt seed={hashString(current.title)} motif={current.motif || MOTIFS[hashString(current.title) % MOTIFS.length]} sky={current.sky || "day"} />}</div>
              <div className="ifo-sheetbody">
                <p className="ifo-kicker">
                  <Star s={12} /> {current.discipline} · {current.year}
                </p>
                <h3 id={uid + "-dlg-h"}>{current.title}</h3>
                <p>{current.body || current.summary}</p>
                <dl className="ifo-dl">
                  {current.client ? (
                    <>
                      <dt>Client</dt>
                      <dd>{current.client}</dd>
                    </>
                  ) : null}
                  {current.role ? (
                    <>
                      <dt>Role</dt>
                      <dd>{current.role}</dd>
                    </>
                  ) : null}
                  <dt>Year</dt>
                  <dd>{current.year}</dd>
                </dl>
                {current.tools && current.tools.length ? (
                  <ul className="ifo-tools" aria-label="Tools">
                    {current.tools.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                ) : null}
                <div className="ifo-sheetnav">
                  <button className="ifo-round" aria-label="Previous project" onClick={() => setOpenIdx(nextIndex(openIdx, "ArrowLeft", shown.length))}>
                    <ArrowLeft />
                  </button>
                  <button className="ifo-round" aria-label="Next project" onClick={() => setOpenIdx(nextIndex(openIdx, "ArrowRight", shown.length))}>
                    <ArrowRight />
                  </button>
                  {current.href ? (
                    <a className="ifo-btn" href={current.href} target={/^https?:/.test(current.href) ? "_blank" : undefined} rel="noreferrer" style={{ marginLeft: 8 }}>
                      Visit <ArrowUpRight />
                    </a>
                  ) : null}
                  <span className="ifo-count">
                    {pad2(openIdx + 1)} / {pad2(shown.length)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <p className="ifo-live" aria-live="polite">
          {live}
        </p>
      </ArtCtx.Provider>
    </div>
  )
}
