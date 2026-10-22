"use client"

// Stencil Labs Template — a whole studio / incubator site on one hairline
// grid: cool grey paper, monospace everything, orange chamfered buttons, and
// display type set in a stencil face that is drawn in this file.
//
// Top to bottom: a sticky nav, a stencil hero beside a live clay object, the
// team (dot-matrix portraits whose bios slide up), an FAQ accordion with
// plus-to-cross toggles, a news carousel whose covers are clay renders made on
// the fly, a subscribe row, link columns, and a giant wordmark whose letters
// thin out under the pointer.
//
// The clay objects are signed-distance scenes raymarched in WebGL2. Drag one
// to spin it. Nothing loads at runtime: no images, no fonts, no fetches.
import * as React from "react"

/* ------------------------------------------------------------------ types */

export type ClayShape = "jack" | "rings" | "bot" | "stack" | "orbs"
export type LabsLink = { label: string; href: string }
export type LabsStat = { value: number; prefix?: string; suffix?: string; label: string }
export type LabsHero = {
  /** Each entry is one line of stencil type. */
  lines: string[]
  eyebrow: string
  description: string
  cta: LabsLink
  secondary: LabsLink
  stats: LabsStat[]
  shape: ClayShape
}
export type LabsMember = {
  name: string
  role: string
  bio: string
  /** A photo URL. Without one the card draws a dot-matrix portrait. */
  image?: string
  href?: string
}
export type LabsFaq = { question: string; answer: string }
export type LabsPost = {
  title: string
  author: string
  category: string
  date: string
  href?: string
  /** A cover image URL. Without one the card renders a clay cover. */
  image?: string
  /** Which clay object the generated cover shows. */
  cover?: ClayShape
  /** Short stencil label printed on the generated cover. */
  kicker?: string
}
export type LabsColumn = { title: string; links: LabsLink[] }

export type StencilLabsTemplateProps = {
  /** Two-line lockup in the nav and subscribe row: small name over a stencil word. */
  brand?: { name: string; word: string }
  /** The giant footer word. One column per letter. */
  wordmark?: string
  /** `#team`, `#faq`, `#news` and `#subscribe` scroll inside the template. */
  nav?: LabsLink[]
  navCta?: LabsLink
  hero?: Partial<LabsHero>
  teamTitle?: string
  teamIntro?: string
  team?: LabsMember[]
  faqTitle?: string
  faqIntro?: { title: string; subtitle: string }
  faq?: LabsFaq[]
  /** Which question starts open. `-1` starts closed. */
  faqDefaultOpen?: number
  /** Let several questions stay open at once. */
  faqMultiple?: boolean
  faqShape?: ClayShape
  newsTitle?: string
  blog?: LabsLink
  news?: LabsPost[]
  /** Advance the carousel every few seconds until someone touches it. */
  newsAutoplay?: boolean
  subscribe?: { title: string; placeholder: string; note: string; cta: string }
  /** Called with the email. A rejected promise shows an error. */
  onSubscribe?: (email: string) => void | Promise<unknown>
  columns?: LabsColumn[]
  socials?: LabsLink[]
  copyright?: string
  rights?: string
  /** Buttons, plus marks, corner squares and one part of every clay object. */
  accent?: string
  /** Page colour in the light theme. */
  paper?: string
  /** CSS font-family list for all text. Defaults to a monospace stack. */
  font?: string
  defaultTheme?: "system" | "light" | "dark"
  onThemeChange?: (theme: "light" | "dark") => void
  maxWidth?: string
  height?: string
  className?: string
}

type Theme = "light" | "dark"
type Status = "idle" | "loading" | "error" | "done"
type Pt = [number, number]
type Stroke = { pts: Pt[]; closed: boolean }

/* ------------------------------------------------------------------ logic */

// #region logic
function clamp(v: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, v))
}

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim())
}

function easeOutCubic(t: number): number {
  const c = clamp(t, 0, 1)
  return 1 - Math.pow(1 - c, 3)
}

function countValue(target: number, t: number): number {
  return Math.round(target * easeOutCubic(t))
}

function pad2(n: number): string {
  return (n < 10 ? "0" : "") + n
}

function initials(name: string): string {
  const w = name.trim().split(/\s+/).filter(Boolean)
  if (!w.length) return ""
  return (w[0][0] + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase()
}

// "#f60" / "#ff6a13" → [r, g, b] in 0..1. Anything else falls back.
function hexToRgb(hex: string, fallback: [number, number, number] = [1, 0.42, 0.1]): [number, number, number] {
  const m = hex.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (!m) return fallback
  let h = m[1]
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  const n = parseInt(h, 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

function carouselMax(count: number, perView: number): number {
  return Math.max(0, count - Math.max(1, perView))
}

// Steps the carousel, wrapping at both ends.
function stepIndex(index: number, dir: number, count: number, perView: number): number {
  const max = carouselMax(count, perView)
  if (max === 0) return 0
  const next = index + dir
  if (next > max) return 0
  if (next < 0) return max
  return next
}

function toggleOpen(open: number[], i: number, multiple: boolean): number[] {
  if (open.includes(i)) return open.filter((x) => x !== i)
  return multiple ? [...open, i].sort((a, b) => a - b) : [i]
}

// The stencil face. Each glyph is polylines on a 4 × 6 grid ("x,y x,y|…"),
// y down, baseline at 6. Chamfers are 45° so only true corners get cut.
const GLYPHS: Record<string, string> = {
  A: "0,6 0,1.5 1.5,0 2.5,0 4,1.5 4,6|0,3.6 4,3.6",
  B: "0,0 3,0 4,1 4,2 3,3|0,3 3,3 4,4 4,5 3,6 0,6 0,0",
  C: "4,0 1,0 0,1 0,5 1,6 4,6",
  D: "0,0 0,6 3,6 4,5 4,1 3,0 0,0",
  E: "4,0 0,0 0,6 4,6|0,3 3,3",
  F: "4,0 0,0 0,6|0,3 3,3",
  G: "4,0 1,0 0,1 0,5 1,6 4,6 4,3 2,3",
  H: "0,0 0,6|4,0 4,6|0,3 4,3",
  I: "0.5,0 3.5,0|2,0 2,6|0.5,6 3.5,6",
  J: "1,0 4,0 4,5 3,6 1,6 0,5",
  K: "0,0 0,6|0,3 1.5,3 4,0|1.5,3 4,6",
  L: "0,0 0,6 4,6",
  M: "0,6 0,1 1,0 3,0 4,1 4,6|2,0 2,3.6",
  N: "0,6 0,0 4,6 4,0",
  O: "1,0 3,0 4,1 4,5 3,6 1,6 0,5 0,1 1,0",
  P: "0,6 0,0 3,0 4,1 4,2 3,3 0,3",
  Q: "1,0 3,0 4,1 4,5 3,6 1,6 0,5 0,1 1,0|2.6,4.6 4,6",
  R: "0,6 0,0 3,0 4,1 4,2 3,3 0,3|2,3 4,6",
  S: "4,0 1,0 0,1 0,2 1,3 3,3 4,4 4,5 3,6 0,6",
  T: "0,0 4,0|2,0 2,6",
  U: "0,0 0,5 1,6 3,6 4,5 4,0",
  V: "0,0 0,3.5 2,6 4,3.5 4,0",
  W: "0,0 0,5 1,6 3,6 4,5 4,0|2,6 2,2.4",
  X: "0,0 4,6|4,0 0,6",
  Y: "0,0 2,3 4,0|2,3 2,6",
  Z: "0,0 4,0 0,6 4,6",
  "0": "1,0 3,0 4,1 4,5 3,6 1,6 0,5 0,1 1,0",
  "1": "0.5,1.5 2,0 2,6|0.5,6 3.5,6",
  "2": "0,1 1,0 3,0 4,1 4,2 0,6 4,6",
  "3": "0,0 4,0 2,2.6 3,2.6 4,3.6 4,5 3,6 0,6",
  "4": "3,6 3,0 0,4 4,4",
  "5": "4,0 0,0 0,2.6 3,2.6 4,3.6 4,5 3,6 0,6",
  "6": "3.5,0 1,0 0,1 0,5 1,6 3,6 4,5 4,3.6 3,2.6 0,2.6",
  "7": "0,0 4,0 1.5,6",
  "8": "1,0 3,0 4,1 4,2 3,3 1,3 0,2 0,1 1,0|1,3 3,3 4,4 4,5 3,6 1,6 0,5 0,4 1,3",
  "9": "0.5,6 3,6 4,5 4,1 3,0 1,0 0,1 0,2.4 1,3.4 4,3.4",
  ".": "1.6,5.4 2.4,5.4",
  ",": "2,5.2 1.4,6.6",
  "-": "0.6,3.2 3.4,3.2",
  "/": "0.4,6 3.6,0",
  ":": "1.6,1.8 2.4,1.8|1.6,5.4 2.4,5.4",
  "!": "2,0 2,3.8|1.6,5.4 2.4,5.4",
  "?": "0,1 1,0 3,0 4,1 4,2 2,3.6 2,4.2|1.6,5.4 2.4,5.4",
  "'": "2,0 2,1.8",
  "&": "4,6 0.6,2.4 0.6,1 1.6,0 2.6,0 3.4,1 3.4,1.8 0,4.2 0,5 1,6 2.4,6 4,3.4",
  "+": "2,1.4 2,4.6|0.4,3 3.6,3",
  "#": "1.3,0.5 1.3,5.5|2.7,0.5 2.7,5.5|0,2 4,2|0,4 4,4",
}
const NARROW: Record<string, number> = { I: 4, ".": 2.4, ",": 2.4, ":": 2.4, "!": 2.4, "'": 2.4, "1": 4 }

function parseGlyph(s: string): Pt[][] {
  return s.split("|").map((pl) => pl.trim().split(/\s+/).map((p) => p.split(",").map(Number) as Pt))
}

// Lays text out on one line. Unknown characters set as a space.
function layoutText(text: string, tracking = 1.25, space = 2.6): { lines: Pt[][]; width: number } {
  const lines: Pt[][] = []
  let x = 0
  let first = true
  for (const raw of text.toUpperCase()) {
    const g = GLYPHS[raw]
    if (!first) x += tracking
    first = false
    if (!g) {
      x += space
      continue
    }
    const w = NARROW[raw] ?? 4
    const shift = w < 4 ? -(4 - w) / 2 : 0
    for (const pl of parseGlyph(g)) lines.push(pl.map(([px, py]) => [px + x + shift, py] as Pt))
    x += w
  }
  return { lines, width: Math.max(0, x) }
}

function distToSeg(p: Pt, a: Pt, b: Pt): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const l2 = dx * dx + dy * dy
  const t = l2 ? clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2, 0, 1) : 0
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
}

function unit(a: Pt, b: Pt): Pt {
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
  return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]
}

const same = (a: Pt, b: Pt) => Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6

// Cuts the stencil bridges. A polyline breaks at every corner sharper than
// ~70°: the outgoing stroke keeps the corner, the incoming one stops `gap`
// short of it. An end that lands on another stroke's body (the bar of an E,
// the leg of an R) is pulled back the same way; where two strokes meet end to
// end, the earlier one keeps the corner. Closed loops with no sharp corner
// stay whole. Units are glyph units; `sw` is the stroke width.
function stencilize(lines: Pt[][], sw: number, gap: number): Stroke[] {
  const half = sw / 2
  const sharp = (a: Pt, b: Pt, c: Pt) => {
    const u = unit(a, b)
    const v = unit(b, c)
    return u[0] * v[0] + u[1] * v[1] < 0.34
  }
  // "cut": pull this end back; "own": reach over the joint; "": a free end
  const meet = (p: Pt, li: number): "cut" | "own" | "" => {
    let res = "" as "cut" | "own" | ""
    lines.forEach((other, oi) => {
      if (oi === li || res === "cut" || other.length < 2) return
      if (same(p, other[0]) || same(p, other[other.length - 1])) {
        if (!res) res = oi < li ? "cut" : "own"
        return
      }
      for (let i = 0; i < other.length - 1; i++) if (distToSeg(p, other[i], other[i + 1]) < 1e-3) res = "cut"
    })
    return res
  }
  const out: Stroke[] = []
  lines.forEach((pl, li) => {
    if (pl.length < 2) return
    let pts = pl
    let head = meet(pl[0], li)
    let tail = meet(pl[pl.length - 1], li)
    if (pl.length > 2 && same(pl[0], pl[pl.length - 1])) {
      const ring = pl.slice(0, -1)
      const n = ring.length
      const k = ring.findIndex((p, i) => sharp(ring[(i - 1 + n) % n], p, ring[(i + 1) % n]))
      if (k < 0) {
        out.push({ pts: ring, closed: true })
        return
      }
      // open the loop at its first sharp corner, which then cuts like any other
      pts = [...ring.slice(k), ...ring.slice(0, k), ring[k]]
      head = "own"
      tail = "cut"
    }
    const pieces: { pts: Pt[]; head: string; tail: string }[] = []
    let cur: Pt[] = [pts[0]]
    let h = head as string
    for (let i = 1; i < pts.length; i++) {
      cur.push(pts[i])
      if (i < pts.length - 1 && sharp(pts[i - 1], pts[i], pts[i + 1])) {
        pieces.push({ pts: cur, head: h, tail: "cut" })
        cur = [pts[i]]
        h = "own"
      }
    }
    pieces.push({ pts: cur, head: h, tail })
    for (const pc of pieces) {
      const p = pc.pts.map((q) => [q[0], q[1]] as Pt)
      const n = p.length
      const d0 = unit(p[0], p[1])
      const d1 = unit(p[n - 2], p[n - 1])
      const back = pc.head === "own" ? -half : pc.head === "cut" ? half + gap : 0
      const fwd = pc.tail === "own" ? -half : pc.tail === "cut" ? half + gap : 0
      p[0] = [p[0][0] + d0[0] * back, p[0][1] + d0[1] * back]
      p[n - 1] = [p[n - 1][0] - d1[0] * fwd, p[n - 1][1] - d1[1] * fwd]
      out.push({ pts: p, closed: false })
    }
  })
  return out
}

function strokePath(s: Stroke): string {
  const r = (v: number) => Math.round(v * 1000) / 1000
  return s.pts.map((p, i) => (i ? "L" : "M") + r(p[0]) + " " + r(p[1])).join("") + (s.closed ? "Z" : "")
}

// Dot-matrix portrait: a head-and-shoulders field, lit from the upper left.
// Returns dot radii (0..1) row by row; the same name always draws the same bust.
function portraitDots(seed: string, cols: number, rows: number): number[] {
  let h = 2166136261
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  const rnd = (k: number) => (((h >>> (k * 3)) & 1023) / 1023 - 0.5) * 2
  const hx = 0.5 + rnd(0) * 0.05
  const hy = 0.37 + rnd(1) * 0.02
  const hr = 0.185 + rnd(2) * 0.015
  const sw = 0.44 + rnd(3) * 0.05
  const out: number[] = []
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const u = (i + 0.5) / cols
      const v = (j + 0.5) / rows
      const head = 1 - Math.hypot((u - hx) / hr, (v - hy) / (hr * 1.22))
      const neck = Math.abs(u - (hx + 0.5) / 2) < 0.1 && v > hy && v < 0.7 ? 0.6 : -1
      const body = 1 - Math.hypot((u - 0.5) / sw, (v - 0.95) / 0.28)
      const inside = Math.max(head * 4, neck, body * 3)
      const light = 0.42 + 0.58 * clamp(1 - (u - 0.2) * 0.9 - (v - 0.25) * 0.35, 0, 1)
      const bg = 0.06 + 0.08 * (1 - v)
      out.push(Math.round((inside > 0 ? clamp(inside, 0, 1) * light + (1 - clamp(inside, 0, 1)) * bg : bg) * 100) / 100)
    }
  }
  return out
}
// #endregion logic

/* --------------------------------------------------------------- defaults */

const D_HERO: LabsHero = {
  lines: ["Build what", "comes next"],
  eyebrow: "Incubator · Accelerator · Est. 2021",
  description:
    "Capital, engineering hours and a network that picks up the phone — for early teams shipping open infrastructure.",
  cta: { label: "Apply now", href: "#subscribe" },
  secondary: { label: "Read the thesis", href: "#faq" },
  stats: [
    { value: 64, suffix: "+", label: "Teams backed" },
    { value: 120, prefix: "$", suffix: "M", label: "Follow-on raised" },
    { value: 18, label: "Countries" },
  ],
  shape: "rings",
}

const D_TEAM: LabsMember[] = [
  { name: "Ines Okoro", role: "Managing Partner", bio: "Two exits in payments infrastructure. Runs the investment committee and still reviews every first call." },
  { name: "Theo Brandt", role: "Head of Engineering", bio: "Ex-protocol lead. Pairs with every resident team on architecture, audits and the first production deploy." },
  { name: "Mara Lindqvist", role: "Venture Lead", bio: "Sources the pipeline and reads every deck. Previously in growth at two developer-tool startups." },
  { name: "Kenji Sato", role: "Platform & Community", bio: "Runs office hours, the founder network and demo day. Knows who to call for almost anything." },
]

const D_FAQ: LabsFaq[] = [
  { question: "What is the incubation program?", answer: "A twelve-week residency for pre-seed teams. You get a technical partner, weekly reviews with founders who have shipped, and a standing budget for audits and infrastructure." },
  { question: "What is the acceleration program?", answer: "For teams with a live product. We put capital, go-to-market support and introductions to follow-on investors behind your next six months." },
  { question: "Which verticals are you investing in?", answer: "Developer infrastructure, payments, data availability, privacy tooling and the consumer apps that sit on top of them." },
  { question: "What is your investment thesis?", answer: "Open infrastructure compounds. We back small, technical teams building primitives other builders depend on — and we stay hands-on long after the cheque." },
  { question: "In which stages are you investing?", answer: "Our investments focus on the pre-launch stages, where we offer extensive resources and guidance to help startups achieve a successful launch and sustainable growth." },
  { question: "Who should apply for the acceleration and incubation programs?", answer: "Founding teams of two to six with a working prototype or a sharp technical insight. Solo founders are welcome if they are already building." },
  { question: "How do you differentiate from other investment firms?", answer: "Engineers on staff, not just partners. Every resident team gets weekly code review, security support and a direct line to the people who wrote the specs." },
]

const D_NEWS: LabsPost[] = [
  { title: "Field notes: shipping a protocol with three engineers", author: "Lena Park", category: "Weekly", date: "September 22, 2026", cover: "bot", kicker: "Field notes" },
  { title: "Announcing Nullpoint Labs: backing the builders of next year", author: "Ines Okoro", category: "Announcements", date: "August 30, 2026", cover: "stack", kicker: "Backing tomorrow" },
  { title: "What we learned reading 400 decks this summer", author: "Mara Lindqvist", category: "Research", date: "August 12, 2026", cover: "orbs", kicker: "Research" },
  { title: "Open office hours are back, every Thursday", author: "Kenji Sato", category: "Community", date: "July 28, 2026", cover: "jack", kicker: "Office hours" },
]

const D_COLUMNS: LabsColumn[] = [
  { title: "Ecosystem", links: [{ label: "Portfolio", href: "#" }, { label: "Residency", href: "#" }, { label: "Grants", href: "#" }] },
  { title: "Quick links", links: [{ label: "Home", href: "#" }, { label: "Apply now", href: "#subscribe" }, { label: "Careers", href: "#" }] },
  { title: "Legal", links: [{ label: "Privacy Policy", href: "#" }, { label: "Cookie Policy", href: "#" }, { label: "Terms of Service", href: "#" }] },
]

const D_SOCIALS: LabsLink[] = [
  { label: "Telegram", href: "#" },
  { label: "X / Twitter", href: "#" },
  { label: "LinkedIn", href: "#" },
  { label: "Medium", href: "#" },
]

const D_NAV: LabsLink[] = [
  { label: "Team", href: "#team" },
  { label: "FAQ", href: "#faq" },
  { label: "News", href: "#news" },
  { label: "Contact", href: "#subscribe" },
]

const D_SUB = { title: "Subscribe to be in touch*", placeholder: "Your e-mail", note: "*Only valuable resources", cta: "Subscribe" }

/* ------------------------------------------------------------------ styles */

const SL_CSS = `
.sl-root{--sl-accent:#ff6a1a;--sl-paper:var(--sl-paper-light,#e3e3e0);--sl-cell:#f4f4f2;--sl-ink:#111110;--sl-soft:#474744;--sl-muted:#7c7c77;--sl-line:rgba(17,17,16,.2);--sl-faint:rgba(17,17,16,.06);--sl-on-accent:#111110;--sl-cover:#e6e6e3;--sl-err:#c2410c;--sl-font:"JetBrains Mono","IBM Plex Mono","Roboto Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;position:relative;width:100%;box-sizing:border-box;background:var(--sl-paper);color:var(--sl-ink);font-family:var(--sl-font);font-size:13px;line-height:1.55;letter-spacing:-.01em;padding:0 clamp(14px,4vw,48px);-webkit-font-smoothing:antialiased;transition:background-color .45s ease,color .45s ease}
.sl-root[data-theme="dark"]{--sl-paper:#121211;--sl-cell:#1c1c1b;--sl-ink:#ecebe6;--sl-soft:#bdbcb6;--sl-muted:#8a8984;--sl-line:rgba(236,235,230,.14);--sl-faint:rgba(236,235,230,.05);--sl-cover:#232322;--sl-err:#fb923c}
.sl-root :where(*){box-sizing:border-box}
.sl-root ::selection{background:var(--sl-accent);color:var(--sl-on-accent)}
.sl-root :focus-visible{outline:2px solid var(--sl-accent);outline-offset:2px}
.sl-root :where(button){font:inherit;color:inherit;background:none;border:0;padding:0;margin:0;cursor:pointer;text-align:inherit;letter-spacing:inherit}
.sl-root :where(a){color:inherit;text-decoration:none}
.sl-root :where(svg,canvas,img){display:block;max-width:none}
.sl-root :where(h1,h2,h3,p,ul,li,figure,dl,dd,dt){margin:0;padding:0;font-size:inherit;font-weight:inherit;list-style:none}
.sl-root :where(input){font:inherit;color:inherit;margin:0;border-radius:0}
.sl-root [data-sl]{scroll-margin-top:61px}
.sl-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}

.sl-frame{position:relative;max-width:var(--sl-max,1180px);margin:0 auto;border-left:1px solid var(--sl-line);border-right:1px solid var(--sl-line);container-type:inline-size}
.sl-row{position:relative;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-auto-flow:row dense;gap:1px;background:var(--sl-line);border-bottom:1px solid var(--sl-line);transition:background-color .45s}
.sl-c{position:relative;min-width:0;background:var(--sl-paper);padding:18px 20px;transition:background-color .45s}
.sl-fill{background:var(--sl-cell)}
.sl-s2{grid-column:span 2}.sl-s3{grid-column:span 3}.sl-s4{grid-column:span 4}
.sl-spacer .sl-c{height:clamp(22px,4cqw,40px);padding:0}
@container (max-width:759px){.sl-row{grid-template-columns:repeat(2,minmax(0,1fr))}.sl-s3,.sl-s4{grid-column:span 2}.sl-spacer .sl-c:nth-child(n+3){display:none}.sl-m2{grid-column:span 2}}

.sl-label{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--sl-muted)}
.sl-sq{display:inline-block;width:6px;height:6px;background:currentColor;margin-right:8px;vertical-align:.12em}

.sl-brk{--b:var(--sl-muted);background:linear-gradient(var(--b),var(--b)) top left/9px 1px no-repeat,linear-gradient(var(--b),var(--b)) top left/1px 9px no-repeat,linear-gradient(var(--b),var(--b)) top right/9px 1px no-repeat,linear-gradient(var(--b),var(--b)) top right/1px 9px no-repeat,linear-gradient(var(--b),var(--b)) bottom left/9px 1px no-repeat,linear-gradient(var(--b),var(--b)) bottom left/1px 9px no-repeat,linear-gradient(var(--b),var(--b)) bottom right/9px 1px no-repeat,linear-gradient(var(--b),var(--b)) bottom right/1px 9px no-repeat}
.sl-brk-a{--b:var(--sl-accent)}

.sl-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:10px;height:34px;padding:0 16px;background:var(--sl-accent);color:var(--sl-on-accent);font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;white-space:nowrap;clip-path:polygon(7px 0,100% 0,100% calc(100% - 7px),calc(100% - 7px) 100%,0 100%,0 7px);transition:transform .25s cubic-bezier(.2,.8,.2,1),filter .2s}
.sl-btn:hover{transform:translateY(-2px);filter:brightness(1.06)}
.sl-btn:active{transform:none}
.sl-btn[disabled]{cursor:progress;filter:saturate(.6)}
.sl-ghost{display:inline-flex;align-items:center;gap:10px;height:34px;padding:0 14px;border:1px solid var(--sl-ink);font-size:11px;letter-spacing:.1em;text-transform:uppercase;white-space:nowrap;transition:background-color .2s,color .2s}
.sl-ghost:hover{background:var(--sl-ink);color:var(--sl-paper)}
.sl-arr{display:inline-block;transition:transform .25s cubic-bezier(.2,.8,.2,1)}
.sl-btn:hover .sl-arr,.sl-ghost:hover .sl-arr,.sl-blog:hover .sl-arr{transform:translateX(3px)}

.sl-stencil{display:block;fill:none;stroke:currentColor}
.sl-stencil path{stroke-linecap:butt;stroke-linejoin:miter}

/* nav */
.sl-nav{position:sticky;top:0;z-index:5}
.sl-nav .sl-c{display:flex;align-items:center;min-height:60px;padding-top:10px;padding-bottom:10px;background:color-mix(in oklab,var(--sl-paper) 88%,transparent);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
.sl-brand{display:flex;align-items:center;gap:10px}
.sl-brand-mark{width:26px;height:26px;color:var(--sl-ink)}
.sl-brand-name{font-size:8.5px;line-height:1;letter-spacing:.02em;margin-bottom:3px}
.sl-links{display:flex;gap:clamp(14px,2.6cqw,30px);justify-content:center}
.sl-link{position:relative;font-size:11px;letter-spacing:.1em;text-transform:uppercase;padding:4px 0}
.sl-link::after{content:"";position:absolute;left:0;right:0;bottom:0;height:1px;background:var(--sl-accent);transform:scaleX(0);transform-origin:right;transition:transform .3s cubic-bezier(.2,.8,.2,1)}
.sl-link:hover::after{transform:scaleX(1);transform-origin:left}
.sl-act{justify-content:flex-end;gap:10px}
.sl-icon{display:grid;place-items:center;width:34px;height:34px;border:1px solid var(--sl-line);transition:border-color .2s,background-color .2s}
.sl-icon:hover{border-color:var(--sl-ink)}
.sl-menu-btn{display:none}
.sl-nav .sl-drawer{display:none}
@container (max-width:759px){.sl-links-c{display:none !important}.sl-menu-btn{display:grid}.sl-nav-cta{display:none}.sl-nav .sl-drawer[data-open="true"]{display:grid;grid-column:span 2;gap:0;padding:6px 20px 14px}.sl-drawer a{padding:10px 0;border-bottom:1px solid var(--sl-line);font-size:12px;letter-spacing:.1em;text-transform:uppercase}}

/* hero */
.sl-hero-type{display:flex;flex-direction:column;justify-content:center;gap:clamp(10px,1.6cqw,18px);padding:clamp(26px,5cqw,64px) clamp(20px,3.5cqw,44px);min-height:clamp(220px,34cqw,400px)}
.sl-hero-type svg{height:auto;color:var(--sl-ink)}
.sl-clay{position:relative;min-height:220px;padding:0;overflow:hidden;cursor:grab;touch-action:pan-y}
.sl-clay[data-drag="true"]{cursor:grabbing}
.sl-clay-in{position:absolute;inset:14px}
.sl-clay-gl{position:absolute;inset:0}
.sl-clay canvas{position:absolute;inset:0;width:100%;height:100%;max-width:none}
.sl-clay-hint{position:absolute;left:14px;bottom:10px;font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--sl-muted);pointer-events:none;transition:opacity .4s}
.sl-clay:hover .sl-clay-hint{opacity:0}
.sl-fallback{position:absolute;inset:0;display:grid;place-items:center;color:var(--sl-muted)}
.sl-hero-desc{display:flex;flex-direction:column;gap:16px;justify-content:space-between;padding:24px clamp(20px,3cqw,32px)}
.sl-hero-desc p{max-width:52ch;color:var(--sl-soft);font-size:13.5px}
.sl-ctas{display:flex;flex-wrap:wrap;gap:10px}
.sl-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));padding:0}
.sl-stat{display:flex;flex-direction:column;justify-content:space-between;gap:24px;padding:24px 20px;border-left:1px solid var(--sl-line)}
.sl-stat:first-child{border-left:0}
.sl-stat-v{font-size:clamp(26px,3.6cqw,40px);line-height:1;letter-spacing:-.04em;font-variant-numeric:tabular-nums}
.sl-stat-v i{font-style:normal;color:var(--sl-accent)}

/* section heads */
.sl-head{display:flex;align-items:center;padding:clamp(20px,3cqw,30px) clamp(20px,3cqw,48px);min-height:clamp(84px,11cqw,124px)}
.sl-head svg{width:auto;height:clamp(28px,4.4cqw,48px);color:var(--sl-ink)}
.sl-intro{display:flex;flex-direction:column;justify-content:center;gap:6px;padding-left:clamp(20px,6cqw,90px)}
.sl-intro h3{font-size:14px;letter-spacing:.01em}
.sl-intro p{font-size:11px;color:var(--sl-muted);max-width:46ch}
.sl-bracket-cell{padding:12px}
.sl-bracket-cell>.sl-brk{position:absolute;inset:12px}
.sl-jack{min-height:96px}
.sl-jack .sl-clay-in{inset:12px}
.sl-mark{position:absolute;z-index:2;width:22px;height:22px;display:grid;place-items:center;background:var(--sl-paper);border:1px solid var(--sl-line);color:var(--sl-muted);transition:color .2s,border-color .2s,transform .3s}
.sl-mark:hover{color:var(--sl-ink);border-color:var(--sl-ink)}
.sl-mark-l{left:-34px;top:-12px}
.sl-mark-r{right:9px;top:9px}
@container (max-width:900px){.sl-mark-l{display:none}}

/* team */
.sl-team-c{display:flex;flex-direction:column;gap:14px;padding:16px}
.sl-portrait{position:relative;aspect-ratio:4/5;overflow:hidden;background:var(--sl-cell);border:1px solid var(--sl-line)}
.sl-portrait svg,.sl-portrait img{position:absolute;inset:0;width:100%;height:100%;max-width:none;object-fit:cover}
.sl-portrait img{filter:grayscale(1) contrast(1.05);transition:filter .5s,transform .8s cubic-bezier(.2,.7,.2,1)}
.sl-team-c:hover .sl-portrait img{filter:grayscale(0);transform:scale(1.03)}
.sl-dots circle{fill:var(--sl-ink);transition:fill .5s}
.sl-team-c:hover .sl-dots circle{fill:var(--sl-accent)}
.sl-ini{position:absolute;left:10px;top:10px;padding:3px 6px;background:var(--sl-paper);font-size:10px;letter-spacing:.1em;border:1px solid var(--sl-line)}
.sl-bio{position:absolute;inset:auto 0 0 0;padding:16px;background:var(--sl-ink);color:var(--sl-paper);font-size:12px;line-height:1.55;transform:translateY(101%);transition:transform .5s cubic-bezier(.2,.8,.2,1)}
.sl-bio[data-open="true"]{transform:none}
.sl-bio a{display:inline-block;margin-top:10px;color:var(--sl-accent);font-size:10.5px;letter-spacing:.1em;text-transform:uppercase}
.sl-member h3{font-size:13.5px}
.sl-member p{font-size:11px;color:var(--sl-muted);letter-spacing:.04em}
.sl-biobtn{display:flex;align-items:center;justify-content:center;gap:6px;height:38px;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;transition:background-color .2s}
.sl-biobtn:hover{background:var(--sl-faint)}
.sl-biobtn b{font-weight:400;color:var(--sl-accent);font-size:14px;line-height:1;display:inline-block;transition:transform .4s cubic-bezier(.2,.8,.2,1)}
.sl-biobtn[aria-expanded="true"] b{transform:rotate(45deg)}
.sl-count{display:flex;flex-direction:column;justify-content:space-between;align-items:flex-end;text-align:right}
.sl-count strong{font-size:clamp(30px,4.4cqw,48px);font-weight:400;line-height:1;letter-spacing:-.05em}

/* faq */
.sl-q{display:flex;align-items:center;gap:20px;width:100%;padding:12px clamp(20px,2.6cqw,22px) 12px clamp(20px,2.6cqw,22px);min-height:clamp(52px,6cqw,62px);font-size:12.5px;transition:background-color .25s}
.sl-q:hover{background:var(--sl-faint)}
.sl-q>span:nth-child(2){flex:1}
.sl-qn{flex:none;width:24px;color:var(--sl-muted);font-size:10.5px}
.sl-tog{flex:none;display:grid;place-items:center;width:28px;height:28px;background:var(--sl-accent);color:var(--sl-on-accent);clip-path:polygon(5px 0,100% 0,100% calc(100% - 5px),calc(100% - 5px) 100%,0 100%,0 5px);transition:transform .25s}
.sl-q:hover .sl-tog{transform:scale(1.08)}
.sl-tog svg{transition:transform .45s cubic-bezier(.2,.8,.2,1)}
.sl-q[aria-expanded="true"] .sl-tog svg{transform:rotate(135deg)}
.sl-a{display:grid;grid-template-rows:0fr;transition:grid-template-rows .45s cubic-bezier(.2,.8,.2,1)}
.sl-a[data-open="true"]{grid-template-rows:1fr}
.sl-a>div{overflow:hidden}
.sl-a p{padding:0 clamp(20px,2.6cqw,22px) 22px clamp(64px,6cqw,66px);max-width:96ch;color:var(--sl-muted);font-size:12px;line-height:1.7;opacity:0;transform:translateY(-6px);transition:opacity .35s,transform .45s cubic-bezier(.2,.8,.2,1)}
.sl-a[data-open="true"] p{opacity:1;transform:none;transition-delay:.08s}
.sl-faq .sl-c{padding:0}

/* news */
.sl-blog-wrap{display:flex;align-items:center;justify-content:center}
.sl-blog{display:inline-flex;flex-direction:column;align-items:flex-start;gap:0}
.sl-blog span:first-child{padding:6px 10px;background:var(--sl-cell);border:1px solid var(--sl-line);font-size:10.5px}
.sl-blog span:last-child{display:grid;place-items:center;width:22px;height:22px;background:var(--sl-ink);color:var(--sl-paper)}
.sl-news-c{padding:0}
.sl-vp{overflow:hidden}
.sl-track{display:flex;transition:transform .7s cubic-bezier(.2,.8,.2,1);touch-action:pan-y}
.sl-card{flex:none;width:calc(100% / var(--per,2));padding:clamp(24px,5cqw,60px) clamp(20px,6cqw,62px) clamp(28px,4.4cqw,52px);border-right:1px solid var(--sl-line);transition:opacity .5s}
.sl-card[aria-hidden="true"]{opacity:.35}
.sl-cover{position:relative;display:block;aspect-ratio:16/9;overflow:hidden;background:var(--sl-cover);border:1px solid var(--sl-line);transition:border-color .3s}
.sl-cover img{position:absolute;inset:0;width:100%;height:100%;max-width:none;object-fit:cover;transition:transform .9s cubic-bezier(.2,.7,.2,1),opacity .6s;opacity:0}
.sl-cover img[data-ready="true"]{opacity:1}
.sl-card:hover .sl-cover img{transform:scale(1.045)}
.sl-card:hover .sl-cover{border-color:var(--sl-ink)}
.sl-chrome{position:absolute;left:10px;top:10px;display:flex;align-items:center;gap:0;font-size:8.5px;background:var(--sl-paper);border:1px solid var(--sl-line);z-index:1}
.sl-chrome>*{display:flex;align-items:center;height:20px;padding:0 7px;border-left:1px solid var(--sl-line)}
.sl-chrome>*:first-child{border-left:0}
.sl-kicker{position:absolute;left:12px;bottom:12px;z-index:1;color:var(--sl-ink)}
.sl-kicker svg{height:clamp(12px,1.7cqw,18px);width:auto}
.sl-card h3{margin-top:18px;font-size:clamp(13px,1.35cqw,15px);line-height:1.4;min-height:2.8em}
.sl-card h3 a{background:linear-gradient(currentColor,currentColor) 0 100%/0 1px no-repeat;transition:background-size .45s cubic-bezier(.2,.8,.2,1)}
.sl-card:hover h3 a{background-size:100% 1px}
.sl-by{display:flex;align-items:center;gap:8px;margin-top:clamp(18px,3cqw,36px);font-size:10.5px;color:var(--sl-muted)}
.sl-by b{font-weight:400;color:var(--sl-ink)}
.sl-av{display:grid;place-items:center;width:18px;height:18px;background:var(--sl-ink);color:var(--sl-paper);font-size:7.5px;letter-spacing:.02em}
.sl-meta{display:flex;justify-content:space-between;gap:12px;margin-top:10px;padding:10px 0 8px;border-top:1px solid var(--sl-line);border-bottom:1px solid var(--sl-line);font-size:10.5px}
.sl-pager{position:absolute;left:-28px;top:50%;z-index:3;display:flex;flex-direction:column;transform:translateY(-50%);background:var(--sl-paper);border:1px solid var(--sl-line)}
.sl-pager button{display:grid;place-items:center;width:40px;height:40px;transition:background-color .2s,color .2s}
.sl-pager button+button{border-top:1px solid var(--sl-line)}
.sl-pager button:hover{background:var(--sl-ink);color:var(--sl-paper)}
.sl-progress{position:absolute;right:16px;bottom:12px;display:flex;align-items:center;gap:10px;font-size:10px;color:var(--sl-muted);font-variant-numeric:tabular-nums}
.sl-progress i{display:block;width:clamp(60px,10cqw,120px);height:1px;background:var(--sl-line);position:relative;overflow:hidden}
.sl-progress i::after{content:"";position:absolute;inset:0;background:var(--sl-accent);transform-origin:left;transform:scaleX(var(--p,0));transition:transform .7s cubic-bezier(.2,.8,.2,1)}
.sl-auto[data-on="true"] svg{animation:sl-spin 3s linear infinite}
@container (max-width:900px){.sl-pager{left:16px;top:auto;bottom:10px;flex-direction:row;transform:none}.sl-pager button+button{border-top:0;border-left:1px solid var(--sl-line)}.sl-card{padding-bottom:76px}.sl-progress{bottom:24px}}

/* subscribe */
.sl-sub{display:flex;flex-direction:column;justify-content:center;gap:16px;padding:22px clamp(20px,1.6cqw,20px)}
.sl-sub h3{font-size:12.5px}
.sl-field{display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--sl-soft);padding:4px 0 8px;transition:border-color .2s}
.sl-field:focus-within{border-color:var(--sl-accent)}
.sl-field input{flex:1;min-width:0;background:none;border:0;outline:0;font-size:12px;padding:2px 0}
.sl-field input::placeholder{color:var(--sl-muted)}
.sl-msg{min-height:1.4em;font-size:10.5px;color:var(--sl-muted)}
.sl-msg[data-tone="error"]{color:var(--sl-err)}
.sl-msg[data-tone="done"]{color:var(--sl-ink)}
.sl-sub-side{display:flex;flex-direction:column;justify-content:space-between;align-items:flex-end;gap:18px;padding:22px 20px}
.sl-sub-side .sl-label{font-size:8.5px}
.sl-spin{width:12px;height:12px;border:1.5px solid currentColor;border-right-color:transparent;border-radius:50%;animation:sl-spin .7s linear infinite}

/* footer */
.sl-col{display:flex;flex-direction:column;gap:14px;padding:30px 20px 34px}
.sl-col ul{display:flex;flex-direction:column;gap:9px}
.sl-col a{font-size:11px;transition:color .2s}
.sl-col a:hover{color:var(--sl-accent)}
.sl-soc{align-items:flex-end;text-align:right}
.sl-soc a{display:inline-flex;align-items:center;gap:6px;font-size:10px;letter-spacing:.12em;text-transform:uppercase}
.sl-soc a svg{transition:transform .25s cubic-bezier(.2,.8,.2,1)}
.sl-soc a:hover svg{transform:translate(2px,-2px)}
.sl-legal .sl-c{display:flex;align-items:center;min-height:62px;font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--sl-soft)}
.sl-top{display:inline-flex;align-items:center;gap:8px;margin-left:auto;font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;transition:color .2s}
.sl-top:hover{color:var(--sl-accent)}

/* wordmark */
.sl-word{grid-template-columns:repeat(var(--n,4),minmax(0,1fr)) !important;margin-bottom:clamp(20px,4cqw,40px)}
.sl-word .sl-c{display:grid;place-items:center;padding:clamp(10px,2.4cqw,26px) clamp(6px,1.6cqw,18px);cursor:default}
.sl-word svg{width:100%;height:auto;max-height:clamp(90px,24cqw,260px);color:var(--sl-ink)}
.sl-word path{stroke-linejoin:round;stroke-linecap:square;transition:stroke-width .55s cubic-bezier(.2,.8,.2,1),stroke .4s}
.sl-word .sl-c:hover path{stroke-width:var(--thin);stroke:var(--sl-accent)}
.sl-corner{position:absolute;width:7px;height:7px;background:var(--sl-accent);z-index:2;pointer-events:none}

.sl-rise{animation:sl-rise .9s cubic-bezier(.2,.7,.2,1) both;animation-delay:calc(var(--i,0) * 80ms)}
@keyframes sl-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes sl-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.sl-rise,.sl-spin,.sl-auto[data-on="true"] svg{animation:none}.sl-root *{transition-duration:.01ms !important}}
`

/* ------------------------------------------------------------------ marks */

function Stencil({ text, sw = 1, gap = 0.34, tracking = 1.3, label, className, style }: { text: string; sw?: number; gap?: number; tracking?: number; label?: string; className?: string; style?: React.CSSProperties }) {
  const { strokes, width } = React.useMemo(() => {
    const l = layoutText(text, tracking)
    return { strokes: stencilize(l.lines, sw, gap), width: l.width }
  }, [text, sw, gap, tracking])
  const h = sw / 2
  return (
    <svg
      className={"sl-stencil" + (className ? " " + className : "")}
      viewBox={[-h, -h, width + sw, 6 + sw].map((v) => Math.round(v * 100) / 100).join(" ")}
      role="img"
      aria-label={label ?? text}
      style={style}
    >
      <path d={strokes.map(strokePath).join("")} strokeWidth={sw} />
    </svg>
  )
}

function Heavy({ text, sw = 1.55 }: { text: string; sw?: number }) {
  const { d, width } = React.useMemo(() => {
    const l = layoutText(text, 1.4)
    return { d: l.lines.map((pl) => strokePath({ pts: pl, closed: false })).join(""), width: l.width }
  }, [text])
  const h = sw / 2
  return (
    <svg className="sl-stencil" viewBox={[-h, -h, width + sw, 6 + sw].join(" ")} aria-hidden="true" style={{ ["--thin" as string]: String(sw * 0.42) }}>
      <path d={d} strokeWidth={sw} />
    </svg>
  )
}

function BrandMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 26 26" fill="none" aria-hidden="true">
      <path d="M5 2h16l3 3v16l-3 3H5l-3-3V5z" stroke="currentColor" strokeWidth="1.6" />
      <rect x="8" y="10" width="3.2" height="5.5" fill="currentColor" />
      <rect x="14.8" y="10" width="3.2" height="5.5" fill="var(--sl-accent)" />
    </svg>
  )
}

function Brand({ name, word }: { name: string; word: string }) {
  return (
    <span className="sl-brand">
      <BrandMark className="sl-brand-mark" />
      <span>
        <span className="sl-brand-name" style={{ display: "block" }}>{name}</span>
        <Stencil text={word} sw={1.1} gap={0.4} style={{ height: 13, width: "auto" }} />
      </span>
    </span>
  )
}

const Plus = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
    <path d="M6 0v12M0 6h12" stroke="currentColor" strokeWidth="1.5" />
  </svg>
)
const Arrow = ({ dir = 1 }: { dir?: number }) => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" style={{ transform: dir < 0 ? "scaleX(-1)" : undefined }}>
    <path d="M1 6h9M6.5 2.5 10 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" />
  </svg>
)
const ArrowNE = () => (
  <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
    <path d="M1.5 6.5 6.5 1.5M2.5 1.5h4v4" stroke="currentColor" strokeWidth="1.3" />
  </svg>
)

/* ------------------------------------------------------------------ clay */

const CLAY_VERT = `#version 300 es
void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.0-1.0,0.0,1.0);}`

const CLAY_FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;uniform float uTime;uniform vec2 uRot;uniform int uShape;uniform vec3 uAccent;uniform vec3 uBg;uniform float uFloor;uniform float uZoom;
out vec4 outColor;
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,s,-s,c);}
float sdBox(vec3 p,vec3 b,float r){vec3 q=abs(p)-b+r;return length(max(q,0.0))+min(max(q.x,max(q.y,q.z)),0.0)-r;}
float sdCyl(vec3 p,float h,float r,float rr){vec2 d=vec2(length(p.xz)-r+rr,abs(p.y)-h+rr);return min(max(d.x,d.y),0.0)+length(max(d,0.0))-rr;}
float sdTorus(vec3 p,vec2 t){vec2 q=vec2(length(p.xz)-t.x,p.y);return length(q)-t.y;}
float smin(float a,float b,float k){float h=clamp(0.5+0.5*(b-a)/k,0.0,1.0);return mix(b,a,h)-k*h*(1.0-h);}
vec2 U(vec2 a,vec2 b){return a.x<b.x?a:b;}
float tube(vec3 p){float o=sdCyl(p,1.0,0.33,0.09);return max(o,-(length(p.xz)-0.165));}
vec2 jack(vec3 p){float d=smin(smin(tube(p),tube(p.yxz),0.05),tube(p.xzy),0.05);d=smin(d,sdBox(p,vec3(0.37),0.12),0.05);return vec2(d,0.0);}
vec2 rings(vec3 p){
  vec2 r=vec2(sdTorus(p-vec3(-0.78,0.0,0.0),vec2(0.52,0.15)),0.0);
  vec3 q=p;q.yz=rot(1.5708)*q.yz;r=U(r,vec2(sdTorus(q,vec2(0.52,0.15)),1.0));
  vec3 w=p-vec3(0.78,0.0,0.0);r=U(r,vec2(sdTorus(w,vec2(0.52,0.15)),0.0));
  return r;}
vec2 bot(vec3 p){
  vec3 h=p-vec3(0.0,0.26,0.0);
  vec2 r=vec2(sdBox(h,vec3(0.78,0.6,0.56),0.26),0.0);
  r=U(r,vec2(sdBox(h-vec3(0.0,0.0,0.47),vec3(0.64,0.47,0.12),0.18),1.0));
  r=U(r,vec2(sdBox(h-vec3(0.0,0.0,0.53),vec3(0.54,0.38,0.1),0.15),2.0));
  vec3 e=h-vec3(0.0,0.02,0.64);e.x=abs(e.x)-0.2;
  r=U(r,vec2(sdBox(e,vec3(0.065,0.1,0.03),0.05),3.0));
  vec3 ear=h;ear.x=abs(ear.x)-0.8;r=U(r,vec2(sdCyl(ear.yxz,0.1,0.2,0.05),1.0));
  r=U(r,vec2(sdCyl(h-vec3(0.0,0.72,0.0),0.14,0.035,0.01),0.0));
  r=U(r,vec2(length(h-vec3(0.0,0.9,0.0))-0.085,1.0));
  r=U(r,vec2(sdCyl(p-vec3(0.0,-0.4,0.0),0.14,0.17,0.04),2.0));
  r=U(r,vec2(sdBox(p-vec3(0.0,-0.78,0.0),vec3(0.44,0.28,0.34),0.17),0.0));
  return r;}
vec2 stack(vec3 p){
  vec2 r=vec2(sdBox(p-vec3(0.0,-0.55,0.0),vec3(0.52),0.13),0.0);
  vec3 q=p-vec3(0.08,0.29,0.02);q.xz=rot(0.55)*q.xz;q.xy=rot(0.1)*q.xy;
  r=U(r,vec2(sdBox(q,vec3(0.35),0.1),1.0));
  vec3 w=p-vec3(-0.04,0.88,0.0);w.xz=rot(1.1)*w.xz;
  r=U(r,vec2(sdBox(w,vec3(0.23),0.08),0.0));
  return r;}
vec2 orbs(vec3 p){
  float d=length(p-vec3(0.0,-0.1,0.0))-0.55;
  d=smin(d,length(p-vec3(0.62,0.28,0.1))-0.36,0.1);
  d=smin(d,length(p-vec3(-0.6,0.35,-0.15))-0.32,0.1);
  d=smin(d,length(p-vec3(-0.25,-0.62,0.35))-0.3,0.1);
  d=smin(d,length(p-vec3(0.42,-0.6,-0.3))-0.26,0.1);
  vec2 r=vec2(d,0.0);
  r=U(r,vec2(length(p-vec3(0.18,0.74,0.36))-0.2,1.0));
  vec3 q=p;q.xy=rot(0.35)*q.xy;r=U(r,vec2(sdTorus(q,vec2(1.08,0.035)),2.0));
  return r;}
vec2 map(vec3 p){
  p.y-=sin(uTime*1.3)*0.035;
  p.xz=rot(uRot.x)*p.xz;p.yz=rot(uRot.y)*p.yz;
  if(uShape==0)return jack(p);
  if(uShape==1)return rings(p);
  if(uShape==2)return bot(p);
  if(uShape==3)return stack(p);
  return orbs(p);}
vec3 nrm(vec3 p){vec2 e=vec2(0.0015,-0.0015);return normalize(e.xyy*map(p+e.xyy).x+e.yyx*map(p+e.yyx).x+e.yxy*map(p+e.yxy).x+e.xxx*map(p+e.xxx).x);}
float shadow(vec3 ro,vec3 rd){float res=1.0,t=0.03;for(int i=0;i<40;i++){float h=map(ro+rd*t).x;res=min(res,9.0*h/t);t+=clamp(h,0.02,0.25);if(res<0.002||t>6.0)break;}return clamp(res,0.0,1.0);}
float occl(vec3 p,vec3 n){float o=0.0,s=1.0;for(int i=0;i<5;i++){float h=0.02+0.11*float(i);o+=(h-map(p+n*h).x)*s;s*=0.75;}return clamp(1.0-1.7*o,0.0,1.0);}
void main(){
  vec2 uv=(gl_FragCoord.xy-0.5*uRes)/min(uRes.x,uRes.y);
  vec3 ro=vec3(0.0,1.1*uFloor,4.9)/uZoom;
  vec3 ta=vec3(0.0,-0.12*uFloor,0.0);
  vec3 ww=normalize(ta-ro);vec3 uu=normalize(cross(ww,vec3(0.0,1.0,0.0)));vec3 vv=cross(uu,ww);
  vec3 rd=normalize(uv.x*uu+uv.y*vv+1.9*ww);
  vec3 L=normalize(vec3(-0.55,0.85,0.62));
  vec3 bg=pow(uBg,vec3(2.2));
  vec3 col=bg;float alpha=uFloor;
  float t=0.0;float m=-1.0;
  for(int i=0;i<110;i++){vec2 h=map(ro+rd*t);if(h.x<0.0008){m=h.y;break;}t+=h.x;if(t>12.0)break;}
  float tf=uFloor>0.5?(-1.1-ro.y)/rd.y:-1.0;
  if(m>-0.5&&(tf<0.0||t<tf)){
    vec3 p=ro+rd*t;vec3 n=nrm(p);
    float oc=occl(p,n);
    float dif=clamp(dot(n,L),0.0,1.0)*shadow(p+n*0.01,L);
    float sky=0.5+0.5*n.y;
    float fre=pow(clamp(1.0+dot(n,rd),0.0,1.0),3.0);
    vec3 alb=m<0.5?vec3(0.74,0.74,0.72):m<1.5?pow(uAccent,vec3(2.2)):m<2.5?vec3(0.012):vec3(1.0);
    vec3 lin=dif*vec3(1.3,1.24,1.14)+sky*oc*vec3(0.46,0.49,0.54)+(1.0-sky)*oc*vec3(0.16,0.15,0.14);
    col=alb*lin;
    bool glossy=m>1.5&&m<2.5;
    float spe=pow(clamp(dot(reflect(rd,n),L),0.0,1.0),glossy?60.0:14.0);
    col+=spe*(0.25+dif)*(glossy?0.9:0.07);
    col+=fre*oc*(glossy?0.1:0.06);
    if(m>2.5)col=vec3(1.7,1.66,1.6);
    alpha=1.0;
  }else if(tf>0.0){
    vec3 p=ro+rd*tf;
    float sh=shadow(p+vec3(0.0,0.01,0.0),L);
    float oc=0.6+0.4*clamp(map(p).x/0.6,0.0,1.0);
    col=bg*mix(0.74,1.0,sh)*oc;
    alpha=1.0;
  }
  col=col/(1.0+0.12*col);
  col=pow(clamp(col,0.0,1.0),vec3(1.0/2.2));
  outColor=vec4(col*alpha,alpha);
}`

const SHAPE_ID: Record<ClayShape, number> = { jack: 0, rings: 1, bot: 2, stack: 3, orbs: 4 }

type ClayFrame = { shape: ClayShape; yaw: number; pitch: number; time: number; accent: string; bg: string; floor: boolean; zoom: number }
type Clay = { draw: (f: ClayFrame) => void; lose: () => void }

function createClay(canvas: HTMLCanvasElement, preserve: boolean): Clay | null {
  let gl: WebGL2RenderingContext | null = null
  try {
    gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, preserveDrawingBuffer: preserve })
  } catch {
    gl = null
  }
  if (!gl) return null
  const g = gl
  const sh = (type: number, src: string) => {
    const s = g.createShader(type)
    if (!s) return null
    g.shaderSource(s, src)
    g.compileShader(s)
    return g.getShaderParameter(s, g.COMPILE_STATUS) ? s : null
  }
  const vs = sh(g.VERTEX_SHADER, CLAY_VERT)
  const fs = sh(g.FRAGMENT_SHADER, CLAY_FRAG)
  const prog = g.createProgram()
  if (!vs || !fs || !prog) return null
  g.attachShader(prog, vs)
  g.attachShader(prog, fs)
  g.linkProgram(prog)
  if (!g.getProgramParameter(prog, g.LINK_STATUS)) return null
  const u = (n: string) => g.getUniformLocation(prog, n)
  const loc = { res: u("uRes"), time: u("uTime"), rot: u("uRot"), shape: u("uShape"), accent: u("uAccent"), bg: u("uBg"), floor: u("uFloor"), zoom: u("uZoom") }
  const vao = g.createVertexArray()
  return {
    draw(f) {
      g.viewport(0, 0, canvas.width, canvas.height)
      g.clearColor(0, 0, 0, 0)
      g.clear(g.COLOR_BUFFER_BIT)
      g.useProgram(prog)
      g.bindVertexArray(vao)
      g.uniform2f(loc.res, canvas.width, canvas.height)
      g.uniform1f(loc.time, f.time)
      g.uniform2f(loc.rot, f.yaw, f.pitch)
      g.uniform1i(loc.shape, SHAPE_ID[f.shape] ?? 0)
      g.uniform3fv(loc.accent, hexToRgb(f.accent))
      g.uniform3fv(loc.bg, hexToRgb(f.bg, [0.9, 0.9, 0.89]))
      g.uniform1f(loc.floor, f.floor ? 1 : 0)
      g.uniform1f(loc.zoom, f.zoom)
      g.drawArrays(g.TRIANGLES, 0, 3)
    },
    lose() {
      g.getExtension("WEBGL_lose_context")?.loseContext()
    },
  }
}

// One offscreen context renders every generated cover once, then the cards
// show plain images. Keyed by everything that changes the picture.
const coverCache = new Map() as Map<string, string>
let coverClay = null as { canvas: HTMLCanvasElement; clay: Clay } | null | false

function renderCover(shape: ClayShape, accent: string, bg: string, seed: number): string | null {
  const key = [shape, accent, bg, seed].join("|")
  const hit = coverCache.get(key)
  if (hit) return hit
  if (coverClay === false || typeof document === "undefined") return null
  if (!coverClay) {
    const canvas = document.createElement("canvas")
    canvas.width = 960
    canvas.height = 540
    const clay = createClay(canvas, true)
    coverClay = clay ? { canvas, clay } : false
    if (!coverClay) return null
  }
  const { canvas, clay } = coverClay
  clay.draw({ shape, yaw: 0.55 - seed * 0.37, pitch: -0.12, time: 0, accent, bg, floor: true, zoom: shape === "stack" ? 1.1 : shape === "rings" ? 1.25 : 1.32 })
  let url = ""
  try {
    url = canvas.toDataURL("image/webp", 0.9)
    if (!url.startsWith("data:image/webp")) url = canvas.toDataURL("image/png")
  } catch {
    return null
  }
  coverCache.set(key, url)
  return url
}

function useReducedMotion() {
  const [reduced, setReduced] = React.useState(false)
  React.useEffect(() => {
    if (typeof matchMedia !== "function") return
    const mq = matchMedia("(prefers-reduced-motion: reduce)")
    const read = () => setReduced(mq.matches)
    read()
    mq.addEventListener?.("change", read)
    return () => mq.removeEventListener?.("change", read)
  }, [])
  return reduced
}

function ClayObject({ shape, accent, label, className, hint, zoom = 1 }: { shape: ClayShape; accent: string; label: string; className?: string; hint?: string; zoom?: number }) {
  const wrap = React.useRef(null as HTMLDivElement | null)
  const canvasRef = React.useRef(null as HTMLDivElement | null)
  const [failed, setFailed] = React.useState(false)
  const [drag, setDrag] = React.useState(false)
  const reduced = useReducedMotion()
  const st = React.useRef({ yaw: 0.6, pitch: -0.32, vel: 0.35, tPitch: -0.32, drag: false, lastX: 0, lastT: 0, dirty: true, accent })
  st.current.accent = accent
  st.current.dirty = true

  React.useEffect(() => {
    const host = canvasRef.current
    const box = wrap.current
    if (!host || !box) return
    // a fresh canvas per run: a context lost on cleanup can't be revived on the same element
    const canvas = document.createElement("canvas")
    host.appendChild(canvas)
    const clay = createClay(canvas, false)
    if (!clay) {
      canvas.remove()
      setFailed(true)
      return
    }
    const s = st.current
    let raf = 0
    let visible = true
    let last = performance.now()
    let time = 0
    const size = () => {
      const r = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.round(r.width * dpr))
      canvas.height = Math.max(1, Math.round(r.height * dpr))
      s.dirty = true
    }
    size()
    const ro = new ResizeObserver(size)
    ro.observe(canvas)
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible) {
        last = performance.now()
        loop()
      }
    })
    io.observe(box)
    const loop = () => {
      cancelAnimationFrame(raf)
      if (!visible) return
      const now = performance.now()
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (!reduced) time += dt
      if (!s.drag) {
        // ease back to the idle spin after a flick
        const idle = reduced ? 0 : 0.35
        s.vel += (idle - s.vel) * Math.min(1, dt * 1.6)
      }
      s.yaw += s.vel * dt
      s.pitch += (s.tPitch - s.pitch) * Math.min(1, dt * 5)
      const moving = !reduced || s.drag || Math.abs(s.vel) > 0.001 || Math.abs(s.tPitch - s.pitch) > 0.001
      if (moving || s.dirty) {
        clay.draw({ shape, yaw: s.yaw, pitch: s.pitch, time, accent: s.accent, bg: "#000000", floor: false, zoom })
        s.dirty = false
      }
      raf = requestAnimationFrame(loop)
    }
    loop()
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      clay.lose()
      canvas.remove()
    }
  }, [shape, reduced, zoom])

  const onDown = (e: React.PointerEvent) => {
    const s = st.current
    s.drag = true
    s.lastX = e.clientX
    s.lastT = performance.now()
    s.vel = 0
    setDrag(true)
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  const onMove = (e: React.PointerEvent) => {
    const s = st.current
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    s.tPitch = -0.32 + ((e.clientY - r.top) / r.height - 0.5) * 0.7
    if (!s.drag) return
    const now = performance.now()
    const dx = e.clientX - s.lastX
    const dt = Math.max(1, now - s.lastT) / 1000
    s.yaw += dx * 0.012
    s.vel = clamp((dx * 0.012) / dt, -9, 9)
    s.lastX = e.clientX
    s.lastT = now
  }
  const onUp = () => {
    st.current.drag = false
    setDrag(false)
  }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault()
      st.current.vel += e.key === "ArrowLeft" ? -2.5 : 2.5
    }
  }

  return (
    <div
      ref={wrap}
      className={"sl-clay " + (className ?? "")}
      data-drag={drag}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onPointerLeave={() => (st.current.tPitch = -0.32)}
      onKeyDown={onKey}
      tabIndex={0}
      role="img"
      aria-label={label + ". Drag, or use the arrow keys, to spin it."}
    >
      <div className="sl-clay-in">
        {failed ? (
          <div className="sl-fallback" aria-hidden="true">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="22" stroke="currentColor" strokeDasharray="3 4" />
              <path d="M32 4v56M4 32h56" stroke="currentColor" strokeWidth=".8" />
            </svg>
          </div>
        ) : (
          <div ref={canvasRef} className="sl-clay-gl" />
        )}
      </div>
      {hint ? <span className="sl-clay-hint">{hint}</span> : null}
    </div>
  )
}

function Cover({ post, index, accent, bg, brand }: { post: LabsPost; index: number; accent: string; bg: string; brand: string }) {
  const [url, setUrl] = React.useState(post.image ?? "")
  const [loaded, setLoaded] = React.useState("")
  React.useEffect(() => {
    if (post.image) {
      setUrl(post.image)
      return
    }
    // let the page paint first; the render is synchronous
    const id = window.setTimeout(() => setUrl(renderCover(post.cover ?? "bot", accent, bg, index) ?? ""), 30 + index * 40)
    return () => window.clearTimeout(id)
  }, [post.image, post.cover, accent, bg, index])
  return (
    <>
      {post.image ? null : (
        <span className="sl-chrome" aria-hidden="true">
          <span>
            <Arrow />
          </span>
          <span>{brand}</span>
        </span>
      )}
      {url ? <img src={url} alt="" data-ready={loaded === url} onLoad={() => setLoaded(url)} draggable={false} /> : null}
      {!post.image && post.kicker ? (
        <span className="sl-kicker" aria-hidden="true">
          <Stencil text={post.kicker} sw={1.1} gap={0.4} />
        </span>
      ) : null}
    </>
  )
}

function Portrait({ member }: { member: LabsMember }) {
  const cols = 18
  const rows = 22
  const dots = React.useMemo(() => portraitDots(member.name, cols, rows), [member.name])
  if (member.image) return <img src={member.image} alt={member.name} loading="lazy" draggable={false} />
  return (
    <svg className="sl-dots" viewBox={"0 0 " + cols * 10 + " " + rows * 10} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {dots.map((r, i) =>
        r > 0.05 ? <circle key={i} cx={(i % cols) * 10 + 5} cy={Math.floor(i / cols) * 10 + 5} r={Math.round(r * 4.9 * 100) / 100} /> : null,
      )}
    </svg>
  )
}

/* ------------------------------------------------------------------ parts */

function useInView(ref: React.RefObject<Element | null>, once = true) {
  const [seen, setSeen] = React.useState(false)
  React.useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === "undefined") {
      setSeen(true)
      return
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setSeen(true)
        if (once) io.disconnect()
      }
    }, { threshold: 0.25 })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, once])
  return seen
}

function Stat({ stat, run, reduced }: { stat: LabsStat; run: boolean; reduced: boolean }) {
  const [t, setT] = React.useState(0)
  React.useEffect(() => {
    if (!run) return
    if (reduced) {
      setT(1)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const tick = () => {
      const k = (performance.now() - t0) / 1400
      setT(Math.min(1, k))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [run, reduced])
  return (
    <div className="sl-stat">
      <span className="sl-label">{stat.label}</span>
      <span className="sl-stat-v" aria-label={(stat.prefix ?? "") + stat.value + (stat.suffix ?? "")}>
        {stat.prefix ? <i>{stat.prefix}</i> : null}
        {countValue(stat.value, t)}
        {stat.suffix ? <i>{stat.suffix}</i> : null}
      </span>
    </div>
  )
}

function Member({ member, index }: { member: LabsMember; index: number }) {
  const [open, setOpen] = React.useState(false)
  const id = React.useId()
  return (
    <article className="sl-c sl-team-c sl-rise" style={{ ["--i" as string]: index }}>
      <div className="sl-portrait">
        <Portrait member={member} />
        <span className="sl-ini" aria-hidden="true">{initials(member.name)}</span>
        <div className="sl-bio" id={id} data-open={open} aria-hidden={!open}>
          {member.bio}
          {member.href ? (
            <>
              <br />
              <a href={member.href} tabIndex={open ? 0 : -1}>Profile ↗</a>
            </>
          ) : null}
        </div>
      </div>
      <div className="sl-member">
        <h3>{member.name}</h3>
        <p>{member.role}</p>
      </div>
      <button type="button" className="sl-biobtn sl-brk sl-brk-a" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        Bio <b aria-hidden="true">+</b>
        <span className="sl-sr">{open ? " — hide " : " — show "}{member.name}</span>
      </button>
    </article>
  )
}

/* ------------------------------------------------------------------ main */

export default function StencilLabsTemplate({
  brand = { name: "Nullpoint", word: "Labs" },
  wordmark = "LABS",
  nav = D_NAV,
  navCta = { label: "Apply", href: "#subscribe" },
  hero,
  teamTitle = "Team",
  teamIntro = "Operators, engineers and investors who have built, broken and rebuilt the stack you are working on.",
  team = D_TEAM,
  faqTitle = "FAQ",
  faqIntro = { title: "Most Common Questions", subtitle: "No worries, here you can find all the answers" },
  faq = D_FAQ,
  faqDefaultOpen = 4,
  faqMultiple = false,
  faqShape = "jack",
  newsTitle = "Latest News",
  blog = { label: "Visit our blog", href: "#" },
  news = D_NEWS,
  newsAutoplay = false,
  subscribe,
  onSubscribe,
  columns = D_COLUMNS,
  socials = D_SOCIALS,
  copyright,
  rights,
  accent = "#ff6a1a",
  paper,
  font,
  defaultTheme = "system",
  onThemeChange,
  maxWidth = "1180px",
  height = "100svh",
  className,
}: StencilLabsTemplateProps) {
  const H = { ...D_HERO, ...hero }
  const S = { ...D_SUB, ...subscribe }
  // every hero line sets at one size: the widest fills the cell
  const lineScale = React.useMemo(() => {
    const w = H.lines.map((l) => layoutText(l, 1.3).width + 1)
    const max = Math.max(1, ...w)
    return w.map((x) => Math.round((x / max) * 1000) / 10)
  }, [H.lines.join("\n")])
  const root = React.useRef(null as HTMLDivElement | null)
  const uid = React.useId().replace(/:/g, "")
  const reduced = useReducedMotion()
  const year = new Date().getFullYear()

  /* theme: "system" follows the host's .dark class first, then the OS */
  const [theme, setTheme] = React.useState((defaultTheme === "dark" ? "dark" : "light") as Theme)
  const [themeTouched, setThemeTouched] = React.useState(false)
  React.useEffect(() => {
    if (defaultTheme !== "system" || themeTouched) return
    const read = () =>
      setTheme(
        document.documentElement.classList.contains("dark") ||
          (typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches)
          ? "dark"
          : "light",
      )
    read()
    const mo = new MutationObserver(read)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    const mq = typeof matchMedia === "function" ? matchMedia("(prefers-color-scheme: dark)") : null
    mq?.addEventListener?.("change", read)
    return () => {
      mo.disconnect()
      mq?.removeEventListener?.("change", read)
    }
  }, [defaultTheme, themeTouched])
  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark"
    setThemeTouched(true)
    setTheme(next)
    onThemeChange?.(next)
  }
  const coverBg = theme === "dark" ? "#232322" : "#e6e6e3"

  /* in-page anchors scroll inside the template and leave the host URL alone */
  const go = (e: React.MouseEvent, href: string) => {
    if (!href.startsWith("#")) return
    e.preventDefault()
    setMenu(false)
    const target = href === "#top" ? root.current : root.current?.querySelector('[data-sl="' + href.slice(1) + '"]')
    target?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" })
  }
  const [menu, setMenu] = React.useState(false)

  /* hero stats count up once seen */
  const statsRef = React.useRef(null as HTMLDivElement | null)
  const statsSeen = useInView(statsRef)

  /* faq */
  const [open, setOpen] = React.useState(faqDefaultOpen >= 0 && faqDefaultOpen < faq.length ? [faqDefaultOpen] : ([] as number[]))
  const allOpen = faq.length > 0 && open.length === faq.length
  const toggleAll = () => setOpen(allOpen || (!faqMultiple && open.length) ? [] : faqMultiple ? faq.map((_, i) => i) : [0])

  /* news carousel */
  const newsRef = React.useRef(null as HTMLDivElement | null)
  const [per, setPer] = React.useState(2)
  const [idx, setIdx] = React.useState(0)
  const [auto, setAuto] = React.useState(newsAutoplay)
  const swipe = React.useRef({ x: 0, y: 0, active: false, moved: false })
  React.useEffect(() => {
    const el = newsRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setPer(e.contentRect.width < 640 ? 1 : 2))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const maxIdx = carouselMax(news.length, per)
  React.useEffect(() => setIdx((i) => Math.min(i, maxIdx)), [maxIdx])
  const step = (dir: number, user = true) => {
    if (user) setAuto(false)
    setIdx((i) => stepIndex(i, dir, news.length, per))
  }
  React.useEffect(() => {
    if (!auto || reduced || maxIdx === 0) return
    const id = window.setInterval(() => setIdx((i) => stepIndex(i, 1, news.length, per)), 4200)
    return () => window.clearInterval(id)
  }, [auto, reduced, maxIdx, news.length, per])
  const onSwipeDown = (e: React.PointerEvent) => {
    swipe.current = { x: e.clientX, y: e.clientY, active: true, moved: false }
  }
  const onSwipeUp = (e: React.PointerEvent) => {
    const s = swipe.current
    if (!s.active) return
    s.active = false
    const dx = e.clientX - s.x
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(e.clientY - s.y)) {
      s.moved = true
      step(dx < 0 ? 1 : -1)
    }
  }
  const onNewsKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") step(1)
    else if (e.key === "ArrowLeft") step(-1)
  }

  /* subscribe */
  const [email, setEmail] = React.useState("")
  const [sub, setSub] = React.useState("idle" as Status)
  const [msg, setMsg] = React.useState("")
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (sub === "loading") return
    if (!isEmail(email)) {
      setSub("error")
      setMsg("That doesn’t look like an email address.")
      return
    }
    setSub("loading")
    setMsg("Sending…")
    try {
      if (onSubscribe) await onSubscribe(email.trim())
      else await new Promise((r) => setTimeout(r, 900))
      setSub("done")
      setMsg("You’re in. Watch " + email.trim() + " for the next issue.")
      setEmail("")
    } catch {
      setSub("error")
      setMsg("Couldn’t subscribe just now. Try again in a moment.")
    }
  }

  const style = {
    minHeight: height,
    "--sl-accent": accent,
    "--sl-max": maxWidth,
    ...(paper ? { "--sl-paper-light": paper } : {}),
    ...(font ? { "--sl-font": font } : {}),
  } as React.CSSProperties

  const anchor = (l: LabsLink, cls: string, key?: React.Key) => (
    <a key={key} className={cls} href={l.href} onClick={(e) => (l.href.startsWith("#") ? go(e, l.href === "#" ? "#top" : l.href) : undefined)}>
      {l.label}
    </a>
  )
  const letters = Array.from(wordmark.toUpperCase()).filter((c) => c.trim())

  return (
    <div ref={root} className={"sl-root" + (className ? " " + className : "")} data-theme={theme} style={style}>
      <style>{SL_CSS}</style>
      <div className="sl-frame">
        {/* nav */}
        <header className="sl-row sl-nav">
          <div className="sl-c">
            <a href="#top" onClick={(e) => go(e, "#top")} aria-label={brand.name + " " + brand.word + " — top"}>
              <Brand name={brand.name} word={brand.word} />
            </a>
          </div>
          <nav className="sl-c sl-s2 sl-links-c" aria-label="Sections">
            <div className="sl-links" style={{ width: "100%" }}>
              {nav.map((l, i) => anchor(l, "sl-link", i))}
            </div>
          </nav>
          <div className="sl-c sl-act" style={{ display: "flex" }}>
            <button type="button" className="sl-icon" onClick={toggleTheme} aria-label={"Switch to " + (theme === "dark" ? "light" : "dark") + " theme"}>
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeWidth="1.2" />
                <path d="M7 1a6 6 0 0 1 0 12z" fill="currentColor" />
              </svg>
            </button>
            <button type="button" className="sl-icon sl-menu-btn" aria-expanded={menu} aria-controls={uid + "-menu"} aria-label="Menu" onClick={() => setMenu((m) => !m)}>
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d={menu ? "M2 2l10 10M12 2 2 12" : "M1 4h12M1 10h12"} stroke="currentColor" strokeWidth="1.3" />
              </svg>
            </button>
            <a className="sl-btn sl-nav-cta" href={navCta.href} onClick={(e) => go(e, navCta.href)}>
              {navCta.label} <span className="sl-arr">→</span>
            </a>
          </div>
          <div className="sl-c sl-drawer" id={uid + "-menu"} data-open={menu}>
            {[...nav, navCta].map((l, i) => anchor(l, "", i))}
          </div>
        </header>

        {/* hero */}
        <section className="sl-row" aria-label="Introduction">
          <div className="sl-c sl-s3 sl-fill sl-hero-type">
            <span className="sl-label sl-rise">
              <span className="sl-sq" style={{ color: accent }} />
              {H.eyebrow}
            </span>
            <h1 className="sl-sr">{H.lines.join(" ")}</h1>
            {H.lines.map((line, i) => (
              <Stencil key={i} text={line} className="sl-rise" style={{ ["--i" as string]: i + 1, width: lineScale[i] + "%" }} label="" />
            ))}
          </div>
          <ClayObject shape={H.shape} accent={accent} label={"A clay " + H.shape + " object"} className="sl-c" hint="Drag to spin" zoom={0.92} />
          <div className="sl-c sl-s2 sl-hero-desc">
            <p>{H.description}</p>
            <div className="sl-ctas">
              <a className="sl-btn" href={H.cta.href} onClick={(e) => go(e, H.cta.href)}>
                {H.cta.label} <span className="sl-arr">→</span>
              </a>
              <a className="sl-ghost" href={H.secondary.href} onClick={(e) => go(e, H.secondary.href)}>
                {H.secondary.label} <span className="sl-arr">→</span>
              </a>
            </div>
          </div>
          <div className="sl-c sl-s2 sl-stats" ref={statsRef}>
            {H.stats.slice(0, 3).map((s, i) => (
              <Stat key={i} stat={s} run={statsSeen} reduced={reduced} />
            ))}
          </div>
        </section>

        <Spacer />

        {/* team */}
        {team.length ? (
          <section data-sl="team" aria-labelledby={uid + "-team"}>
            <div className="sl-row">
              <div className="sl-c sl-fill sl-head">
                <h2 className="sl-sr" id={uid + "-team"}>{teamTitle}</h2>
                <Stencil text={teamTitle} label="" />
              </div>
              <div className="sl-c sl-s2 sl-intro">
                <h3>
                  <span className="sl-sq" />
                  The people you will work with
                </h3>
                <p>{teamIntro}</p>
              </div>
              <div className="sl-c sl-count">
                <span className="sl-label">People</span>
                <strong>{pad2(team.length)}</strong>
              </div>
            </div>
            <div className="sl-row">
              {team.map((m, i) => (
                <Member key={m.name + i} member={m} index={i} />
              ))}
              {team.length % 4 ? Array.from({ length: 4 - (team.length % 4) }, (_, i) => <div key={"f" + i} className="sl-c" aria-hidden="true" />) : null}
            </div>
          </section>
        ) : null}

        <Spacer />

        {/* faq */}
        {faq.length ? (
          <section data-sl="faq" aria-labelledby={uid + "-faq"}>
            <div className="sl-row">
              <button type="button" className="sl-mark sl-mark-l" onClick={toggleAll} aria-label={open.length ? "Collapse all answers" : "Expand answers"}>
                <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                  <path d={open.length ? "M1 1l8 8M9 1 1 9" : "M5 0v10M0 5h10"} stroke="currentColor" strokeWidth="1.1" />
                </svg>
              </button>
              <div className="sl-c sl-fill sl-head">
                <h2 className="sl-sr" id={uid + "-faq"}>{faqTitle}</h2>
                <Stencil text={faqTitle} label="" />
              </div>
              <div className="sl-c sl-bracket-cell">
                <span className="sl-brk" aria-hidden="true" />
                <ClayObject shape={faqShape} accent={accent} label={"A clay " + faqShape + " object"} className="sl-jack" zoom={1.35} />
              </div>
              <div className="sl-c sl-s2 sl-intro">
                <h3>
                  <span className="sl-sq" />
                  {faqIntro.title}
                </h3>
                <p>{faqIntro.subtitle}</p>
              </div>
            </div>
            <div className="sl-faq">
              {faq.map((f, i) => {
                const isOpen = open.includes(i)
                return (
                  <div className="sl-row" key={i}>
                    <div className="sl-c sl-s4">
                      <h3>
                        <button
                          type="button"
                          className="sl-q"
                          id={uid + "-q" + i}
                          aria-expanded={isOpen}
                          aria-controls={uid + "-a" + i}
                          onClick={() => setOpen((o) => toggleOpen(o, i, faqMultiple))}
                        >
                          <span className="sl-qn" aria-hidden="true">{pad2(i + 1)}</span>
                          <span>{f.question}</span>
                          <span className="sl-tog" aria-hidden="true">
                            <Plus />
                          </span>
                        </button>
                      </h3>
                      <div className="sl-a" id={uid + "-a" + i} role="region" aria-labelledby={uid + "-q" + i} data-open={isOpen}>
                        <div>
                          <p aria-hidden={!isOpen}>{f.answer}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ) : null}

        <Spacer />

        {/* news */}
        {news.length ? (
          <section data-sl="news" aria-labelledby={uid + "-news"} aria-roledescription="carousel">
            <div className="sl-row">
              <div className="sl-c sl-s2 sl-fill sl-head">
                <h2 className="sl-sr" id={uid + "-news"}>{newsTitle}</h2>
                <Stencil text={newsTitle} label="" />
              </div>
              <div className="sl-c sl-bracket-cell sl-blog-wrap">
                <span className="sl-brk" aria-hidden="true" />
                <a className="sl-blog" href={blog.href} onClick={(e) => (blog.href === "#" ? e.preventDefault() : undefined)}>
                  <span>{blog.label}</span>
                  <span>
                    <span className="sl-arr">
                      <Arrow />
                    </span>
                  </span>
                </a>
              </div>
              <div className="sl-c" style={{ minHeight: 60 }}>
                {maxIdx > 0 && !reduced ? (
                  <button type="button" className="sl-mark sl-mark-r sl-auto" data-on={auto} aria-pressed={auto} aria-label="Autoplay the news" onClick={() => setAuto((a) => !a)}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <circle cx="6" cy="6" r="4.6" stroke="currentColor" strokeDasharray={auto ? "2.2 1.6" : undefined} />
                      <circle cx="6" cy="6" r="1.6" fill="currentColor" />
                    </svg>
                  </button>
                ) : null}
              </div>
            </div>
            <div className="sl-row">
              <div className="sl-c sl-s4 sl-news-c" ref={newsRef} onKeyDown={onNewsKey}>
                <div className="sl-vp">
                  <div
                    className="sl-track"
                    style={{ transform: "translateX(" + -idx * (100 / per) + "%)", ["--per" as string]: per }}
                    onPointerDown={onSwipeDown}
                    onPointerUp={onSwipeUp}
                    onClickCapture={(e) => {
                      if (swipe.current.moved) {
                        e.preventDefault()
                        e.stopPropagation()
                        swipe.current.moved = false
                      }
                    }}
                  >
                    {news.map((p, i) => {
                      const shown = i >= idx && i < idx + per
                      const href = p.href ?? "#"
                      const click = (e: React.MouseEvent) => (href === "#" ? e.preventDefault() : undefined)
                      return (
                        <article className="sl-card" key={i} aria-hidden={!shown} aria-roledescription="slide" aria-label={i + 1 + " of " + news.length}>
                          <a className="sl-cover" href={href} onClick={click} tabIndex={-1} aria-hidden="true" draggable={false}>
                            <Cover post={p} index={i} accent={accent} bg={coverBg} brand={brand.name + " " + brand.word} />
                          </a>
                          <h3>
                            <a href={href} onClick={click} tabIndex={shown ? 0 : -1}>
                              {p.title}
                            </a>
                          </h3>
                          <div className="sl-by">
                            <span className="sl-av" aria-hidden="true">{initials(p.author)}</span>
                            <span>
                              by <b>{p.author}</b>
                            </span>
                          </div>
                          <div className="sl-meta">
                            <span>{p.category}</span>
                            <span>{p.date}</span>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </div>
                {maxIdx > 0 ? (
                  <>
                    <div className="sl-pager">
                      <button type="button" onClick={() => step(-1)} aria-label="Previous posts">
                        <Arrow dir={-1} />
                      </button>
                      <button type="button" onClick={() => step(1)} aria-label="Next posts">
                        <Arrow />
                      </button>
                    </div>
                    <div className="sl-progress" aria-live="polite">
                      <span>{pad2(idx + 1)}</span>
                      <i style={{ ["--p" as string]: (idx + 1) / (maxIdx + 1) }} />
                      <span>{pad2(maxIdx + 1)}</span>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {/* subscribe */}
        <section className="sl-row" data-sl="subscribe" aria-label="Subscribe">
          <div className="sl-c" style={{ display: "flex", alignItems: "flex-start" }}>
            <Brand name={brand.name} word={brand.word} />
          </div>
          <form className="sl-c sl-s2 sl-m2 sl-sub" onSubmit={submit} noValidate>
            <h3 id={uid + "-sub"}>{S.title}</h3>
            <label className="sl-field">
              <span className="sl-sr">Email</span>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder={S.placeholder}
                value={email}
                aria-invalid={sub === "error"}
                aria-describedby={uid + "-msg"}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (sub === "error") {
                    setSub("idle")
                    setMsg("")
                  }
                }}
              />
            </label>
            <p className="sl-msg" id={uid + "-msg"} role="status" data-tone={sub === "error" ? "error" : sub === "done" ? "done" : undefined}>
              {msg}
            </p>
            <button type="submit" className="sl-sr" tabIndex={-1}>
              {S.cta}
            </button>
          </form>
          <div className="sl-c sl-sub-side">
            <span className="sl-label">{S.note}</span>
            <button
              type="button"
              className="sl-btn"
              disabled={sub === "loading"}
              onClick={(e) => (e.currentTarget.closest(".sl-row")?.querySelector("form") as HTMLFormElement | null)?.requestSubmit()}
            >
              {sub === "loading" ? <span className="sl-spin" aria-hidden="true" /> : null}
              {sub === "done" ? "Subscribed ✓" : S.cta}
            </button>
          </div>
        </section>

        {/* link columns */}
        <footer>
          <div className="sl-row">
            {columns.slice(0, 3).map((c, i) => (
              <nav className="sl-c sl-col" key={i} aria-label={c.title}>
                <span className="sl-label">{c.title}</span>
                <ul>
                  {c.links.map((l, j) => (
                    <li key={j}>{anchor(l, "")}</li>
                  ))}
                </ul>
              </nav>
            ))}
            <nav className="sl-c sl-col sl-soc" aria-label="Social">
              <ul>
                {socials.map((l, i) => (
                  <li key={i}>
                    <a href={l.href} onClick={(e) => (l.href === "#" ? e.preventDefault() : undefined)}>
                      {l.label} <ArrowNE />
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <div className="sl-row sl-legal">
            <div className="sl-c">{copyright ?? "© " + year}</div>
            <div className="sl-c sl-s2 sl-m2">{rights ?? "All rights reserved by " + brand.name + " " + brand.word + "."}</div>
            <div className="sl-c">
              <a className="sl-top" href="#top" onClick={(e) => go(e, "#top")}>
                Back to top <span aria-hidden="true">↑</span>
              </a>
            </div>
          </div>
          {letters.length ? (
            <div className="sl-row sl-word" style={{ ["--n" as string]: letters.length }} aria-label={wordmark} role="img">
              {[0, 1, 2, 3].map((k) => (
                <span
                  key={k}
                  className="sl-corner"
                  aria-hidden="true"
                  style={{ [k % 2 ? "right" : "left"]: 6, [k < 2 ? "top" : "bottom"]: 6 } as React.CSSProperties}
                />
              ))}
              {letters.map((ch, i) => (
                <div className="sl-c" key={i}>
                  <Heavy text={ch} />
                </div>
              ))}
            </div>
          ) : null}
        </footer>
      </div>
    </div>
  )
}

function Spacer() {
  return (
    <div className="sl-row sl-spacer" aria-hidden="true">
      <div className="sl-c" />
      <div className="sl-c" />
      <div className="sl-c" />
      <div className="sl-c" />
    </div>
  )
}
