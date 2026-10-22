"use client"

// Cobalt Toile Landing — a whole landing-page template drawn as a cobalt
// copperplate engraving on cream paper. Under a night sky with two moons, a
// carved arch frames the headline, flanked by statues on pedestals and a
// garden of hatched foliage. Below it: a client marquee, an about section
// with a seal that turns as you scroll and stats that count up, practice
// areas as die-cut bookmarks (typewriter, paddle steamer, monogram, tower),
// a ledger of services, a "latest press" list, a toile band where temples
// meet satellites, a contact band and a footer with a chinoiserie landscape.
//
// It is interactive throughout: pointer parallax and an etch-in intro on the
// hero, moons you can click through their phases, bookmarks that work as
// tabs, an accordion ledger, filterable press with an engraved preview that
// follows the cursor, hotspots on the toile, a newsletter that seals itself
// with wax, a drifting boat and a palette switcher.
//
// Every illustration is SVG drawn in this file from seeded hatching and
// foliage. Nothing loads: no fonts, images or stylesheets.
import * as React from "react"

/* ------------------------------------------------------------------ types */

export type ToileLink = { label: string; href: string }
export type ToileStat = { value: number; suffix?: string; label: string }
export type BookmarkArt = "typewriter" | "steamer" | "monogram" | "tower"
export type ToileSolution = {
  title: string
  kicker?: string
  /** Printed on the bookmark itself. */
  quote: string
  body: string
  points?: string[]
  art?: BookmarkArt
  /** "paper" is a cream bookmark with ink lines, "ink" the reverse. */
  tone?: "paper" | "ink"
  action?: ToileLink
}
export type ToileService = { title: string; summary: string; details?: string; deliverables?: string[]; duration?: string }
export type ToilePress = { title: string; source: string; date: string; category?: string; href?: string }
export type ToileNote = { title: string; body: string }
export type ToileSocial = { kind: "x" | "instagram" | "linkedin" | "facebook"; href: string; label?: string }
export type ToileColumn = { title: string; links: ToileLink[] }
export type ToilePalette = "cobalt" | "indigo" | "delft" | "oxblood"

export type ToileHero = {
  /** Line breaks split the headline. */
  title?: string
  subtitle?: string
  action?: ToileLink
  /** Small engraved labels in the top corners of the plate. */
  est?: string
  edition?: string
}
export type ToileAbout = {
  kicker?: string
  /** Wrap words in *asterisks* to set them in italic ink. */
  statement?: string
  body?: string
  stats?: ToileStat[]
  /** Text running around the seal. */
  seal?: string
}
export type ToileSectionCopy = { kicker?: string; title?: string; intro?: string }
export type ToileContactBand = { title?: string; body?: string; action?: ToileLink; secondary?: ToileLink }
export type ToileContact = { email?: string; phone?: string; location?: string }
export type ToileNewsletter = { title?: string; body?: string; placeholder?: string; success?: string }

export type CobaltToileLandingProps = {
  brand?: string
  /** Letter cut into the monogram bookmark. Defaults to the brand's first letter. */
  monogram?: string
  /** Replaces the engraved mark beside the brand name. */
  logo?: React.ReactNode
  nav?: ToileLink[]
  cta?: ToileLink
  hero?: ToileHero
  clients?: string[]
  clientsLabel?: string
  about?: ToileAbout
  solutionsCopy?: ToileSectionCopy
  solutions?: ToileSolution[]
  servicesCopy?: ToileSectionCopy
  services?: ToileService[]
  pressCopy?: ToileSectionCopy
  press?: ToilePress[]
  /** Captions for the four hotspots on the toile: temple, justice, satellite, pylon. */
  notes?: ToileNote[]
  contactBand?: ToileContactBand
  contact?: ToileContact
  tagline?: string
  columns?: ToileColumn[]
  newsletter?: ToileNewsletter
  socials?: ToileSocial[]
  legal?: ToileLink[]
  copyright?: string
  palette?: ToilePalette
  /** Overrides the palette's ink colour. */
  ink?: string
  /** Overrides the palette's paper colour. */
  paper?: string
  /** "auto" follows a `.dark` class on an ancestor. */
  theme?: "auto" | "light" | "dark"
  /** Shows the "printed in" swatches in the footer. */
  paletteSwitcher?: boolean
  intro?: boolean
  onSubscribe?: (email: string) => unknown
  /** Minimum height of the page. A definite length, so it survives any host layout. */
  height?: string
  className?: string
}

/* ------------------------------------------------------------------ logic */

// #region logic
const PALETTES = {
  cobalt: { label: "Cobalt", ink: "#2238c4", paper: "#f7f4ec" },
  indigo: { label: "Indigo", ink: "#2e2b72", paper: "#efe9de" },
  delft: { label: "Delft", ink: "#1b4d9e", paper: "#f3f4f5" },
  oxblood: { label: "Oxblood", ink: "#7a1d2b", paper: "#f4ede2" },
}
const PALETTE_KEYS = ["cobalt", "indigo", "delft", "oxblood"]
const MOON_STEPS = [0.42, 0.86, 1.34, 2.3]
const MOON_NAMES = ["waxing crescent", "first quarter", "waxing gibbous", "full moon"]

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

type LeafShape = { o: string; s: string }

// A leaf from (x, y) pointing along angle a. `o` is the outline, `s` the
// shaded lower half, whose stroke doubles as the midrib.
function leafPath(x: number, y: number, a: number, L: number, W: number): LeafShape {
  const dx = Math.cos(a)
  const dy = Math.sin(a)
  const P = (u: number, v: number) => r1(x + dx * u * L - dy * v * W) + " " + r1(y + dy * u * L + dx * v * W)
  return {
    o: "M" + P(0, 0) + "C" + P(0.3, 1) + " " + P(0.72, 1) + " " + P(1, 0) + "C" + P(0.72, -1) + " " + P(0.3, -1) + " " + P(0, 0) + "Z",
    s: "M" + P(0, 0) + "L" + P(1, 0) + "C" + P(0.72, -1) + " " + P(0.3, -1) + " " + P(0, 0) + "Z",
  }
}

// Leaves scattered through an ellipse, pointing outward. The outermost are
// drawn first so the cluster reads as rounded.
function leafCluster(seed: number, cx: number, cy: number, rx: number, ry: number, n: number, size: number): LeafShape[] {
  const rnd = mulberry32(seed)
  const pts = []
  for (let i = 0; i < n; i++) {
    const th = rnd() * Math.PI * 2
    const r = Math.sqrt(rnd())
    const L = size * (0.72 + rnd() * 0.56)
    pts.push({ r, x: cx + Math.cos(th) * r * rx, y: cy + Math.sin(th) * r * ry, a: th + (rnd() - 0.5) * 1.8 + 0.25, L })
  }
  pts.sort((p, q) => q.r - p.r)
  return pts.map((p) => leafPath(p.x, p.y, p.a, p.L, p.L * 0.36))
}

function rosette(x: number, y: number, R: number, petals: number, rot: number): LeafShape[] {
  const out = []
  for (let k = 0; k < petals; k++) out.push(leafPath(x, y, rot + (k * Math.PI * 2) / petals, R, R * 0.58))
  return out
}

type Star = { x: number; y: number; r: number; sparkle: boolean }

function scatterStars(seed: number, n: number, x0: number, y0: number, w: number, h: number): Star[] {
  const rnd = mulberry32(seed)
  const out = []
  for (let i = 0; i < n; i++) {
    const big = rnd()
    out.push({ x: Math.round((x0 + rnd() * w) * 10) / 10, y: Math.round((y0 + rnd() * rnd() * h) * 10) / 10, r: 0.5 + big * big * 1.4, sparkle: big > 0.93 })
  }
  return out
}

function sparklePath(x: number, y: number, s: number): string {
  const c = r1(x) + " " + r1(y)
  return "M" + r1(x) + " " + r1(y - s) + "Q" + c + " " + r1(x + s) + " " + r1(y) + "Q" + c + " " + r1(x) + " " + r1(y + s) + "Q" + c + " " + r1(x - s) + " " + r1(y) + "Q" + c + " " + r1(x) + " " + r1(y - s) + "Z"
}

function toRoman(n: number): string {
  const map = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]] as [number, string][]
  let out = ""
  let v = Math.max(0, Math.floor(n))
  for (const [k, s] of map) {
    while (v >= k) {
      out += s
      v -= k
    }
  }
  return out
}

type Emph = { text: string; em: boolean }

// "plain *italic* plain" → segments. An unmatched asterisk stays literal.
function parseEmphasis(s: string): Emph[] {
  const out = [] as Emph[]
  const re = /\*([^*]+)\*/g
  let last = 0
  let m = re.exec(s)
  while (m) {
    if (m.index > last) out.push({ text: s.slice(last, m.index), em: false })
    out.push({ text: m[1], em: true })
    last = m.index + m[0].length
    m = re.exec(s)
  }
  if (last < s.length) out.push({ text: s.slice(last), em: false })
  return out
}

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim())
}

function easeOutCubic(t: number): number {
  const k = clamp(t, 0, 1)
  return 1 - Math.pow(1 - k, 3)
}

function formatCount(n: number): string {
  return Math.round(n).toLocaleString("en-US")
}

function categoriesOf(items: ToilePress[]): string[] {
  const out = [] as string[]
  for (const p of items) if (p.category && !out.includes(p.category)) out.push(p.category)
  return out
}

function filterPress(items: ToilePress[], cat: string | null): ToilePress[] {
  return cat ? items.filter((p) => p.category === cat) : items
}

// A one-word source becomes a monogram tile; longer ones a two-line wordmark.
function wordmark(source: string): { mono: string; top: string; bottom: string } {
  let words = source.trim().split(/\s+/).filter(Boolean)
  if (words.length > 2 && /^the$/i.test(words[0])) words = words.slice(1)
  if (words.length < 2) return { mono: (words[0] || "?").charAt(0).toUpperCase(), top: "", bottom: "" }
  return { mono: "", top: words[0].toUpperCase(), bottom: words.slice(1).join(" ").toUpperCase() }
}

function paletteColors(name: string, ink?: string, paper?: string): { ink: string; paper: string } {
  const p = (PALETTES as { [k: string]: { ink: string; paper: string } })[name] || PALETTES.cobalt
  return { ink: ink || p.ink, paper: paper || p.paper }
}

// Roving focus for tab lists. Returns null for keys it does not handle.
function nextTab(i: number, key: string, n: number): number | null {
  if (n <= 0) return null
  if (key === "ArrowRight" || key === "ArrowDown") return (i + 1) % n
  if (key === "ArrowLeft" || key === "ArrowUp") return (i - 1 + n) % n
  if (key === "Home") return 0
  if (key === "End") return n - 1
  return null
}
// #endregion logic

/* --------------------------------------------------------------- defaults */

const DEFAULT_NAV: ToileLink[] = [
  { label: "About", href: "#about" },
  { label: "Solutions", href: "#solutions" },
  { label: "Services", href: "#services" },
  { label: "Insights", href: "#insights" },
]

const DEFAULT_HERO = {
  title: "Timeless Thinking\nBuilt for Tomorrow",
  subtitle: "We partner with forward-thinking organisations to solve complex challenges and build lasting impact.",
  action: { label: "Explore solutions", href: "#solutions" },
  est: "Est. MCMXII",
  edition: "Vol. I — Nº 01",
}

const DEFAULT_CLIENTS = ["The Halden Trust", "Corvina Bank", "Museo Aurelio", "Northwind Rail", "Atlas Mutual", "Verity Labs", "Ostra Foods", "Kestrel Grid"]

const DEFAULT_ABOUT = {
  kicker: "About the house",
  statement: "We bring the patience of the old masters to the *problems of the new century* — and leave every organisation sturdier than we found it.",
  body: "Founded as a counting-house advisory in 1912, we now work with public institutions, family companies and founders on strategy, systems and the long work of change. Our teams stay small, our advice stays plain and our commitments run long.",
  stats: [
    { value: 112, label: "Years of practice" },
    { value: 640, suffix: "+", label: "Engagements delivered" },
    { value: 28, label: "Countries advised" },
  ] as ToileStat[],
  seal: "Timeless thinking · Built for tomorrow · ",
}

const DEFAULT_SOLUTIONS_COPY = {
  kicker: "Solutions",
  title: "Four practices, *one long view*",
  intro: "Pull a bookmark from the shelf. Each is a practice we have kept for decades and sharpened for this one.",
}

const DEFAULT_SOLUTIONS: ToileSolution[] = [
  {
    kicker: "Strategy",
    title: "Strategy & Narrative",
    quote: "The plan that survives is the one people can retell without you.",
    body: "We help leadership teams decide what matters, write it down plainly and carry it through an organisation — from the boardroom to the shop floor.",
    points: ["Long-range strategy", "Board & investor narrative", "Operating principles"],
    art: "typewriter",
    tone: "paper",
  },
  {
    kicker: "Growth",
    title: "Markets & Expansion",
    quote: "New waters reward the patient navigator, not the fastest boat.",
    body: "Entering a new region, segment or category with the homework done: demand, partners, regulation and the order to do things in.",
    points: ["Market entry", "Partnership design", "Pricing & positioning"],
    art: "steamer",
    tone: "ink",
  },
  {
    kicker: "Identity",
    title: "Brand & Reputation",
    quote: "A name is a promise made in advance. We help you keep it.",
    body: "Naming, voice and the quiet systems behind a reputation: how you speak, what you will not do and how both survive a crisis.",
    points: ["Naming & architecture", "Voice & editorial", "Reputation risk"],
    art: "monogram",
    tone: "paper",
  },
  {
    kicker: "Systems",
    title: "Infrastructure & Operations",
    quote: "Build the foundations first. Every storey after is cheaper.",
    body: "Operating models, data and the unglamorous plumbing that lets an organisation grow without cracking at the seams.",
    points: ["Operating model", "Data & platforms", "Process redesign"],
    art: "tower",
    tone: "ink",
  },
]

const DEFAULT_SERVICES_COPY = {
  kicker: "Services",
  title: "A ledger of *what we do*",
  intro: "Engagements are fixed in scope and led by a partner from first meeting to final report.",
}

const DEFAULT_SERVICES: ToileService[] = [
  {
    title: "Strategic Advisory",
    summary: "Board-level counsel for decisions that outlast a quarter.",
    details: "A standing partnership with your leadership team: we sit in on the hard meetings, pressure-test the options and write the memo everyone else will quote.",
    deliverables: ["Decision memos", "Scenario models", "Board sessions"],
    duration: "Ongoing",
  },
  {
    title: "Organisational Design",
    summary: "Structures that let good people do their best work.",
    details: "We map how work actually flows, then redraw teams, roles and rituals around it — with the people who will live inside the new shape.",
    deliverables: ["Operating model", "Role charters", "Transition plan"],
    duration: "10–14 weeks",
  },
  {
    title: "Digital Transformation",
    summary: "Modern systems, adopted rather than installed.",
    details: "From platform choice to the last training session. We measure success by what people still use a year after we leave.",
    deliverables: ["Platform roadmap", "Vendor selection", "Adoption programme"],
    duration: "4–9 months",
  },
  {
    title: "Research & Foresight",
    summary: "Evidence first, then a view of the decade ahead.",
    details: "Primary research, expert panels and scenario work that turn uncertainty into a short list of bets worth making.",
    deliverables: ["Field research", "Scenario atlas", "Signals briefing"],
    duration: "6–8 weeks",
  },
  {
    title: "Capital & Partnerships",
    summary: "The right money and the right allies, on the right terms.",
    details: "Preparing for investment, joint ventures and acquisitions, and staying in the room through diligence and integration.",
    deliverables: ["Investment case", "Partner shortlist", "Integration plan"],
    duration: "8–16 weeks",
  },
]

const DEFAULT_PRESS_COPY = { kicker: "Insights", title: "Latest Press", intro: "" }

const DEFAULT_PRESS: ToilePress[] = [
  { title: "A framework for century-scale planning, explained", source: "Strategy Digest", date: "November 14, 2026", category: "Feature" },
  { title: "How three family firms rebuilt themselves for the next generation", source: "The Ledger Review", date: "November 13, 2026", category: "Interview" },
  { title: "One size does not fit all, and it is time big business stopped pretending", source: "Rostrum", date: "November 12, 2026", category: "Opinion" },
  { title: "Northwind Rail opens its first carbon-neutral depot", source: "Local Gazette", date: "October 24, 2026", category: "News" },
  { title: "Why the oldest institutions are quietly the most inventive", source: "Meridian Weekly", date: "October 16, 2026", category: "Feature" },
  { title: "Named advisory house of the year for the second time", source: "Consult Quarterly", date: "September 30, 2026", category: "News" },
  { title: "On patience as a competitive advantage", source: "Almanac", date: "September 2, 2026", category: "Opinion" },
]

const DEFAULT_NOTES: ToileNote[] = [
  { title: "Institutions", body: "Museums, universities and civic bodies have trusted us with their next century since 1912." },
  { title: "Governance", body: "Boards that balance the scales: clear duties, honest risk registers and decisions on the record." },
  { title: "Foresight", body: "Signals from orbit to the high street, gathered into scenarios you can plan against." },
  { title: "Infrastructure", body: "Power, rail and data networks: the long-lived assets that need long-lived advice." },
]

const DEFAULT_CONTACT_BAND = {
  title: "Let us build something *lasting*.",
  body: "Tell us about the challenge. A partner — never a salesperson — replies within two working days.",
  action: { label: "Book a conversation", href: "mailto:hello@example.com" },
  secondary: { label: "Read the Almanac", href: "#insights" },
}

const DEFAULT_CONTACT = { email: "hello@example.com", phone: "+44 20 0000 0000", location: "London · Lisbon · Bengaluru" }

const DEFAULT_COLUMNS: ToileColumn[] = [
  { title: "The house", links: [{ label: "Our story", href: "#about" }, { label: "Leadership", href: "#" }, { label: "Careers", href: "#" }, { label: "Press", href: "#insights" }] },
  { title: "Practice", links: [{ label: "Strategy", href: "#solutions" }, { label: "Organisation", href: "#services" }, { label: "Transformation", href: "#services" }, { label: "Foresight", href: "#services" }] },
  { title: "Help", links: [{ label: "FAQs", href: "#" }, { label: "Offices", href: "#" }, { label: "Accessibility", href: "#" }, { label: "Contact us", href: "#contact" }] },
]

const DEFAULT_NEWSLETTER = {
  title: "The Almanac",
  body: "A quarterly letter on long-term thinking. Four issues a year, no noise, ever.",
  placeholder: "Enter your email",
  success: "Sealed. The next Almanac will find you.",
}

const DEFAULT_SOCIALS: ToileSocial[] = [
  { kind: "facebook", href: "#" },
  { kind: "x", href: "#" },
  { kind: "instagram", href: "#" },
  { kind: "linkedin", href: "#" },
]

const DEFAULT_LEGAL: ToileLink[] = [
  { label: "Privacy Policy", href: "#" },
  { label: "Terms of Service", href: "#" },
  { label: "Cookie Policy", href: "#" },
]

const ARTS: BookmarkArt[] = ["typewriter", "steamer", "monogram", "tower"]

/* -------------------------------------------------------------------- css */

const CTL_CSS = `
@property --ctl-r{syntax:"<percentage>";inherits:false;initial-value:0%}
.ctl-root{--ctl-paper:var(--ctl-pb);--ctl-ink:var(--ctl-ib);--ctl-deep:var(--ctl-ib);--ctl-ondeep:var(--ctl-pb);--ctl-text:color-mix(in oklab,var(--ctl-ib) 42%,#0b0b14);--ctl-soft:color-mix(in oklab,var(--ctl-text) 74%,var(--ctl-pb));--ctl-line:color-mix(in oklab,var(--ctl-ib) 24%,var(--ctl-pb));--ctl-wash:color-mix(in oklab,var(--ctl-ib) 6%,var(--ctl-pb));--ctl-night:color-mix(in oklab,var(--ctl-ib) 15%,#05060b);--ctl-onnight:color-mix(in oklab,var(--ctl-pb) 94%,var(--ctl-ib));--ctl-serif:"Iowan Old Style","Baskerville","Libre Baskerville","Palatino Linotype",Palatino,"Book Antiqua",Georgia,"Times New Roman",serif;--ctl-sans:ui-sans-serif,system-ui,-apple-system,"Segoe UI","Helvetica Neue",Arial,sans-serif;position:relative;isolation:isolate;overflow-x:clip;background:var(--ctl-paper);color:var(--ctl-text);font-family:var(--ctl-sans);line-height:1.5;-webkit-font-smoothing:antialiased;transition:background-color .6s ease,color .6s ease}
.ctl-root[data-theme="dark"],.dark .ctl-root[data-theme="auto"]{--ctl-paper:color-mix(in oklab,var(--ctl-ib) 14%,#07080e);--ctl-ink:color-mix(in oklab,var(--ctl-ib) 38%,var(--ctl-pb));--ctl-deep:color-mix(in oklab,var(--ctl-ib) 66%,#05060b);--ctl-ondeep:color-mix(in oklab,var(--ctl-pb) 92%,var(--ctl-ib));--ctl-text:color-mix(in oklab,var(--ctl-pb) 90%,var(--ctl-ib));--ctl-line:color-mix(in oklab,var(--ctl-ib) 34%,#1a1b26);--ctl-wash:color-mix(in oklab,var(--ctl-ib) 22%,#08090f);--ctl-night:color-mix(in oklab,var(--ctl-ib) 10%,#030407)}
.ctl-root :where(h1,h2,h3,h4,p,ul,ol,li,figure,blockquote,dl,dd){margin:0;padding:0}
.ctl-root :where(ul,ol){list-style:none}
.ctl-root :where(a){color:inherit;text-decoration:none}
.ctl-root :where(button,input){font:inherit;color:inherit;background:none;border:0;margin:0;padding:0;border-radius:0}
.ctl-root :where(button){cursor:pointer;text-align:inherit}
.ctl-root :where(a,button,input,[tabindex]):focus-visible{outline:2px solid var(--ctl-ink);outline-offset:3px}
.ctl-svg{display:block;max-width:none;overflow:visible}
.ctl-si{stroke:var(--ctl-ink)}.ctl-sp{stroke:var(--ctl-ondeep)}
.ctl-bi{fill:var(--ctl-paper)}.ctl-bp{fill:var(--ctl-deep)}
.ctl-fi{fill:var(--ctl-ink)}.ctl-fp{fill:var(--ctl-ondeep)}
.ctl-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.ctl-wrap{width:100%;max-width:1320px;margin:0 auto;padding:0 clamp(16px,4vw,44px);box-sizing:border-box}
.ctl-kicker{display:inline-flex;align-items:center;gap:12px;font:600 11px/1.2 var(--ctl-sans);letter-spacing:.24em;text-transform:uppercase;color:var(--ctl-ink)}
.ctl-kicker::before{content:"";width:30px;height:1px;background:currentColor}
.ctl-h2{font-family:var(--ctl-serif);font-weight:400;font-size:clamp(36px,5.4vw,70px);line-height:1;letter-spacing:-.018em;color:var(--ctl-text);text-wrap:balance}
.ctl-h2 em,.ctl-statement em,.ctl-ctat em{font-style:italic;color:var(--ctl-ink)}
.ctl-lede{font-size:16px;line-height:1.6;color:var(--ctl-soft);max-width:34em;text-wrap:pretty}
.ctl-sec{position:relative;padding:clamp(76px,10vw,144px) 0;scroll-margin-top:64px}
.ctl-pre{opacity:0;transform:translateY(26px)}
.ctl-rv{transition:opacity 1s cubic-bezier(.2,.7,.2,1),transform 1s cubic-bezier(.2,.7,.2,1)}

.ctl-nav{position:sticky;top:0;z-index:40;background:color-mix(in oklab,var(--ctl-paper) 95%,transparent);-webkit-backdrop-filter:blur(12px) saturate(1.2);backdrop-filter:blur(12px) saturate(1.2);border-bottom:1px solid transparent;transition:border-color .35s,background-color .35s}
.ctl-nav[data-scrolled="true"]{border-color:var(--ctl-line)}
.ctl-navin{display:flex;align-items:center;gap:30px;height:64px}
.ctl-brand{display:inline-flex;align-items:center;gap:10px;color:var(--ctl-ink);font-family:var(--ctl-serif);font-size:19px;letter-spacing:.005em;white-space:nowrap}
.ctl-brand svg{transition:transform .6s cubic-bezier(.3,1.5,.5,1)}
.ctl-brand:hover svg{transform:rotate(-8deg) scale(1.08)}
.ctl-links{display:flex;gap:30px;margin-left:10px}
.ctl-link{position:relative;padding:8px 0;font:600 11.5px/1 var(--ctl-sans);letter-spacing:.18em;text-transform:uppercase;color:var(--ctl-text);transition:color .2s}
.ctl-link::after{content:"";position:absolute;left:0;right:0;bottom:2px;height:1px;background:var(--ctl-ink);transform:scaleX(0);transform-origin:right;transition:transform .4s cubic-bezier(.2,.7,.2,1)}
.ctl-link:hover,.ctl-link[aria-current="true"]{color:var(--ctl-ink)}
.ctl-link:hover::after,.ctl-link[aria-current="true"]::after{transform:scaleX(1);transform-origin:left}
.ctl-navcta{margin-left:auto}
.ctl-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:10px;height:42px;padding:0 20px;background:var(--ctl-deep);color:var(--ctl-ondeep);font:600 12.5px/1 var(--ctl-sans);letter-spacing:.05em;border-radius:2px;overflow:hidden;white-space:nowrap;transition:transform .25s ease,box-shadow .3s ease}
.ctl-btn::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(-45deg,transparent 0 3px,color-mix(in oklab,var(--ctl-ondeep) 22%,transparent) 3px 4px);transform:translateX(-101%);transition:transform .55s cubic-bezier(.2,.7,.2,1)}
.ctl-btn:hover{transform:translateY(-1px);box-shadow:0 10px 24px -14px var(--ctl-deep)}
.ctl-btn:hover::before{transform:none}
.ctl-btn>*{position:relative}
.ctl-btn svg{transition:transform .35s cubic-bezier(.2,.7,.2,1)}
.ctl-btn:hover svg{transform:translateX(3px)}
.ctl-btn-paper{background:var(--ctl-ondeep);color:var(--ctl-deep)}
.ctl-btn-paper::before{background:repeating-linear-gradient(-45deg,transparent 0 3px,color-mix(in oklab,var(--ctl-deep) 14%,transparent) 3px 4px)}
.ctl-btn-ghost{background:transparent;color:inherit;box-shadow:inset 0 0 0 1px currentColor}
.ctl-burger{display:none;width:42px;height:42px;margin-left:auto;align-items:center;justify-content:center;color:var(--ctl-ink);box-shadow:inset 0 0 0 1px var(--ctl-line);border-radius:2px}
.ctl-menu{position:absolute;left:0;right:0;top:100%;background:var(--ctl-paper);border-bottom:1px solid var(--ctl-line);padding:12px 0 24px;box-shadow:0 24px 40px -28px rgba(0,0,0,.4);animation:ctl-drop .35s cubic-bezier(.2,.7,.2,1) both}
.ctl-menu a{display:flex;align-items:baseline;gap:14px;padding:12px 0;border-top:1px solid var(--ctl-line);font-family:var(--ctl-serif);font-size:28px;color:var(--ctl-text)}
.ctl-menu a small{font:italic 14px var(--ctl-serif);color:var(--ctl-ink)}
@keyframes ctl-drop{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
@media (max-width:860px){.ctl-links,.ctl-navcta{display:none}.ctl-burger{display:inline-flex}}

.ctl-hero{padding:6px clamp(8px,1.6vw,20px) 0}
.ctl-stage{--ctl-sh:clamp(560px,52vw,880px);position:relative;height:var(--ctl-sh);max-width:1640px;margin:0 auto;overflow:hidden;background:var(--ctl-deep);color:var(--ctl-ondeep);touch-action:pan-y}
.ctl-cover{position:absolute;left:50%;top:0;height:100%;width:calc(var(--ctl-sh) * 1.6667);transform:translateX(-50%);container-type:inline-size}
.ctl-layer{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;will-change:transform}
.ctl-copy{position:absolute;left:34.4%;width:31.2%;top:22.5%;bottom:33%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(8px,1.25cqw,20px);text-align:center;color:var(--ctl-ink);will-change:transform}
.ctl-h1{font-family:var(--ctl-serif);font-weight:400;font-size:clamp(25px,3.2cqw,60px);line-height:1.05;letter-spacing:-.012em;color:var(--ctl-text)}
.ctl-h1 span{display:block}
.ctl-sub{font-size:clamp(12px,1.06cqw,17px);line-height:1.5;color:var(--ctl-soft);max-width:25em;text-wrap:balance}
.ctl-copy .ctl-btn{height:clamp(34px,2.9cqw,46px);padding:0 clamp(14px,1.5cqw,22px);font-size:clamp(11px,.95cqw,13px)}
.ctl-frame{position:absolute;inset:12px;z-index:4;border:1px solid color-mix(in oklab,var(--ctl-ondeep) 42%,transparent);pointer-events:none}
.ctl-frame::after{content:"";position:absolute;inset:5px;border:1px solid color-mix(in oklab,var(--ctl-ondeep) 18%,transparent)}
.ctl-corner{position:absolute;z-index:5;padding:3px 8px;background:var(--ctl-deep);font:600 9.5px/1 var(--ctl-sans);letter-spacing:.26em;text-transform:uppercase;color:color-mix(in oklab,var(--ctl-ondeep) 82%,transparent);pointer-events:none}
.ctl-cue{position:absolute;z-index:5;left:50%;bottom:26px;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:8px;font:600 9.5px/1 var(--ctl-sans);letter-spacing:.26em;text-transform:uppercase;color:var(--ctl-ondeep)}
.ctl-cue i{width:1px;height:30px;background:linear-gradient(currentColor,transparent);animation:ctl-cue 2.2s ease-in-out infinite;transform-origin:top}
@keyframes ctl-cue{0%{transform:scaleY(0)}50%{transform:scaleY(1)}100%{transform:scaleY(1);opacity:0}}
.ctl-tw0{animation:ctl-tw 3.4s ease-in-out infinite}
.ctl-tw1{animation:ctl-tw 4.6s ease-in-out -1.7s infinite}
.ctl-tw2{animation:ctl-tw 5.8s ease-in-out -3.1s infinite}
@keyframes ctl-tw{0%,100%{opacity:1}50%{opacity:.25}}
.ctl-moon{pointer-events:auto;cursor:pointer;outline:none}
.ctl-moon .ctl-moonring{opacity:0;transition:opacity .25s}
.ctl-moon:hover .ctl-moonring,.ctl-moon:focus-visible .ctl-moonring{opacity:1}
.ctl-shade{transition:transform 1.1s cubic-bezier(.5,0,.2,1)}
.ctl-shoot{position:absolute;z-index:1;left:12%;top:9%;width:130px;height:1.5px;background:linear-gradient(90deg,transparent,var(--ctl-ondeep));transform:rotate(18deg);opacity:0;pointer-events:none;animation:ctl-shoot 13s linear 4s infinite}
@keyframes ctl-shoot{0%,86%{opacity:0;translate:0 0}88%{opacity:1}95%{opacity:0;translate:260px 84px}100%{opacity:0;translate:260px 84px}}
.ctl-veil{position:absolute;inset:0;z-index:6;pointer-events:none;background:radial-gradient(circle at 50% 58%,transparent var(--ctl-r),color-mix(in oklab,var(--ctl-ondeep) 70%,transparent) calc(var(--ctl-r) + .6%),var(--ctl-deep) calc(var(--ctl-r) + 7%));opacity:0}
.ctl-intro .ctl-veil{animation:ctl-etch 2.3s cubic-bezier(.65,.05,.25,1) .1s both}
@keyframes ctl-etch{0%{--ctl-r:0%;opacity:1}88%{opacity:1}100%{--ctl-r:110%;opacity:0}}
.ctl-intro .ctl-settle{animation:ctl-settle 2.4s cubic-bezier(.2,.7,.2,1) both}
@keyframes ctl-settle{from{scale:1.07}to{scale:1}}
.ctl-intro .ctl-rise{animation:ctl-rise 1.1s cubic-bezier(.2,.7,.2,1) both}
@keyframes ctl-rise{from{opacity:0;translate:0 16px}to{opacity:1;translate:0 0}}

.ctl-ticker{display:flex;align-items:center;gap:28px;padding:22px 0;border-bottom:1px solid var(--ctl-line)}
.ctl-ticklabel{flex:none;font:600 10.5px/1.3 var(--ctl-sans);letter-spacing:.22em;text-transform:uppercase;color:var(--ctl-soft);max-width:11em}
.ctl-tickview{flex:1;min-width:0;overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}
.ctl-track{display:flex;width:max-content;animation:ctl-marquee 46s linear infinite}
.ctl-ticker:hover .ctl-track{animation-play-state:paused}
.ctl-tick{display:flex;align-items:center;gap:28px;padding-right:28px;font:italic 400 clamp(19px,2vw,25px)/1 var(--ctl-serif);color:var(--ctl-ink);white-space:nowrap}
.ctl-tick svg{flex:none}
@keyframes ctl-marquee{to{transform:translateX(-50%)}}
.ctl-still .ctl-track{animation:none;flex-wrap:wrap;width:auto;row-gap:12px}

.ctl-about{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(0,1fr);gap:clamp(36px,6vw,100px);align-items:start}
.ctl-statement{margin-top:28px;font-family:var(--ctl-serif);font-weight:400;font-size:clamp(27px,3.4vw,46px);line-height:1.17;letter-spacing:-.01em;color:var(--ctl-text);text-wrap:pretty}
.ctl-aside{display:flex;flex-direction:column;gap:28px;padding-top:8px}
.ctl-seal{width:clamp(150px,15vw,196px);height:auto;color:var(--ctl-ink);will-change:transform}
.ctl-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));margin-top:clamp(48px,7vw,88px);border-top:1px solid var(--ctl-line)}
.ctl-stat{padding:24px 20px 0 0;border-right:1px solid var(--ctl-line);margin-right:20px}
.ctl-stat:last-child{border-right:0}
.ctl-statv{display:block;font-family:var(--ctl-serif);font-size:clamp(44px,6vw,86px);line-height:1;letter-spacing:-.03em;color:var(--ctl-ink);font-variant-numeric:tabular-nums}
.ctl-statl{display:block;margin-top:10px;font:600 10.5px/1.3 var(--ctl-sans);letter-spacing:.2em;text-transform:uppercase;color:var(--ctl-soft)}
@media (max-width:860px){.ctl-about{grid-template-columns:1fr}.ctl-aside{flex-direction:row;align-items:center}.ctl-stat{padding-right:10px;margin-right:10px}}

.ctl-sol{background:var(--ctl-night);color:var(--ctl-onnight)}
.ctl-sol .ctl-kicker{color:var(--ctl-onnight)}
.ctl-sol .ctl-h2{color:var(--ctl-onnight)}
.ctl-sol .ctl-h2 em{color:color-mix(in oklab,var(--ctl-ib) 45%,var(--ctl-pb))}
.ctl-sol .ctl-lede{color:color-mix(in oklab,var(--ctl-onnight) 70%,transparent)}
.ctl-solgrid{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:clamp(32px,5vw,80px);align-items:center;margin-top:clamp(40px,6vw,72px)}
.ctl-marks{display:flex;align-items:flex-start;gap:clamp(12px,2.2vw,30px);padding:44px 4px 12px}
.ctl-markcol{display:flex;flex-direction:column;align-items:center;gap:18px;flex:none}
.ctl-mark{--y:0px;--r:0deg;position:relative;width:clamp(120px,12.6vw,186px);aspect-ratio:200/600;flex:none;container-type:inline-size;transform:translateY(var(--y)) rotate(var(--r));filter:drop-shadow(0 22px 26px rgba(0,0,0,.5)) brightness(.8) saturate(.85);transition:transform .6s cubic-bezier(.2,.8,.2,1),filter .5s ease}
.ctl-mark:hover{transform:translateY(calc(var(--y) - 14px)) rotate(calc(var(--r) * -.4));filter:drop-shadow(0 30px 30px rgba(0,0,0,.55)) brightness(.95)}
.ctl-mark[aria-selected="true"]{transform:translateY(calc(var(--y) - 32px)) rotate(0deg);filter:drop-shadow(0 36px 34px rgba(0,0,0,.6))}
.ctl-mark:focus-visible{outline-color:var(--ctl-onnight);outline-offset:6px}
.ctl-mark>svg{width:100%;height:auto}
.ctl-quote{position:absolute;display:flex;align-items:center;font-family:var(--ctl-serif);font-style:italic;line-height:1.3;overflow:hidden;pointer-events:none;text-wrap:balance}
.ctl-quote[data-v="true"]{writing-mode:vertical-rl;transform:rotate(180deg);justify-content:center;text-align:center}
.ctl-marklabel{font:600 10px/1 var(--ctl-sans);letter-spacing:.22em;text-transform:uppercase;color:color-mix(in oklab,var(--ctl-onnight) 45%,transparent);transition:color .3s}
.ctl-marklabel[data-on="true"]{color:var(--ctl-onnight)}
.ctl-panel{max-width:460px}
.ctl-panelin{animation:ctl-panel .6s cubic-bezier(.2,.7,.2,1) both}
@keyframes ctl-panel{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.ctl-panelnum{font:italic 400 20px/1 var(--ctl-serif);color:color-mix(in oklab,var(--ctl-ib) 45%,var(--ctl-pb))}
.ctl-panel h3{margin:14px 0 16px;font-family:var(--ctl-serif);font-weight:400;font-size:clamp(30px,3.4vw,46px);line-height:1.04;letter-spacing:-.01em}
.ctl-panel p{font-size:15.5px;line-height:1.65;color:color-mix(in oklab,var(--ctl-onnight) 74%,transparent)}
.ctl-points{margin:26px 0 30px}
.ctl-points li{display:flex;align-items:center;gap:14px;padding:13px 0;border-top:1px solid color-mix(in oklab,var(--ctl-onnight) 16%,transparent);font-family:var(--ctl-serif);font-size:18px}
.ctl-points li:last-child{border-bottom:1px solid color-mix(in oklab,var(--ctl-onnight) 16%,transparent)}
@media (max-width:1060px){.ctl-solgrid{grid-template-columns:1fr}.ctl-panel{max-width:none;order:2}.ctl-marks{order:1;overflow-x:auto;scroll-snap-type:x mandatory;margin:0 calc(-1 * clamp(16px,4vw,44px));padding:56px clamp(16px,4vw,44px) 18px;scrollbar-width:none}.ctl-marks::-webkit-scrollbar{display:none}.ctl-markcol{scroll-snap-align:center}.ctl-mark{width:150px}}

.ctl-sechead{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:28px 60px;align-items:end;margin-bottom:clamp(36px,5vw,64px)}
.ctl-sechead .ctl-h2{margin-top:22px}
@media (max-width:860px){.ctl-sechead{grid-template-columns:1fr}}
.ctl-ledger{border-bottom:1px solid var(--ctl-line)}
.ctl-row{border-top:1px solid var(--ctl-line);transition:background-color .4s}
.ctl-row[data-open="true"]{background:var(--ctl-wash)}
.ctl-rowbtn{display:grid;grid-template-columns:76px minmax(0,1.1fr) minmax(0,1fr) auto;gap:24px;align-items:center;width:100%;padding:26px 12px;box-sizing:border-box}
.ctl-num{font:italic 400 22px/1 var(--ctl-serif);color:var(--ctl-ink)}
.ctl-rowt{display:block;font-family:var(--ctl-serif);font-size:clamp(23px,2.7vw,36px);line-height:1.08;color:var(--ctl-text);transition:color .25s,transform .45s cubic-bezier(.2,.7,.2,1)}
.ctl-rowbtn:hover .ctl-rowt{color:var(--ctl-ink);transform:translateX(8px)}
.ctl-rows{font-size:14.5px;line-height:1.5;color:var(--ctl-soft)}
.ctl-plus{display:grid;place-items:center;width:42px;height:42px;border-radius:50%;box-shadow:inset 0 0 0 1px var(--ctl-line);color:var(--ctl-ink);transition:transform .5s cubic-bezier(.3,1.4,.5,1),background-color .3s,color .3s}
.ctl-row[data-open="true"] .ctl-plus{transform:rotate(45deg);background:var(--ctl-deep);color:var(--ctl-ondeep);box-shadow:none}
.ctl-fold{display:grid;grid-template-rows:0fr;transition:grid-template-rows .6s cubic-bezier(.2,.7,.2,1)}
.ctl-row[data-open="true"] .ctl-fold{grid-template-rows:1fr}
.ctl-fold>div{min-height:0;overflow:hidden}
.ctl-foldin{display:grid;grid-template-columns:76px minmax(0,1.1fr) minmax(0,1fr) 42px;gap:24px;padding:0 12px 34px;box-sizing:border-box}
.ctl-foldin p{font-size:15.5px;line-height:1.65;color:var(--ctl-text);max-width:32em}
.ctl-dl{display:flex;flex-wrap:wrap;gap:8px;align-content:flex-start}
.ctl-dl li{padding:7px 12px;border:1px solid var(--ctl-line);border-radius:999px;font-size:12.5px;color:var(--ctl-ink);background:var(--ctl-paper)}
.ctl-dur{margin-top:16px;font:600 10.5px/1 var(--ctl-sans);letter-spacing:.2em;text-transform:uppercase;color:var(--ctl-soft)}
@media (max-width:760px){.ctl-rowbtn{grid-template-columns:40px minmax(0,1fr) auto;gap:14px;padding:22px 4px}.ctl-rowbtn .ctl-rows{display:none}.ctl-foldin{grid-template-columns:1fr;padding:0 4px 28px 58px;gap:18px}.ctl-foldin>.ctl-gap{display:none}}

.ctl-presshead{display:flex;align-items:flex-end;justify-content:space-between;gap:24px 40px;flex-wrap:wrap;margin-bottom:clamp(30px,4vw,48px)}
.ctl-pressh{display:flex;align-items:flex-start;gap:12px;margin-top:20px;font-family:var(--ctl-serif);font-weight:400;font-size:clamp(42px,7vw,96px);line-height:.92;letter-spacing:-.025em;text-transform:uppercase;color:var(--ctl-text)}
.ctl-pressh svg{margin-top:.12em;width:.42em;height:.42em;color:var(--ctl-text)}
.ctl-chips{display:flex;flex-wrap:wrap;gap:8px}
.ctl-chip{height:34px;padding:0 15px;border-radius:999px;box-shadow:inset 0 0 0 1px var(--ctl-line);font-size:12.5px;color:var(--ctl-text);transition:background-color .25s,color .25s,box-shadow .25s}
.ctl-chip:hover{box-shadow:inset 0 0 0 1px var(--ctl-ink);color:var(--ctl-ink)}
.ctl-chip[aria-pressed="true"]{background:var(--ctl-deep);color:var(--ctl-ondeep);box-shadow:none}
.ctl-chip sup{margin-left:4px;font-size:9.5px;opacity:.7}
.ctl-press{border-bottom:1px solid var(--ctl-line)}
.ctl-pr{position:relative;display:grid;grid-template-columns:150px minmax(0,1fr) 40px;gap:28px;align-items:start;padding:24px 0 22px;border-top:1px solid var(--ctl-line);animation:ctl-panel .55s cubic-bezier(.2,.7,.2,1) both}
.ctl-pr::before{content:"";position:absolute;left:0;right:0;top:-1px;height:1px;background:var(--ctl-ink);transform:scaleX(0);transform-origin:left;transition:transform .6s cubic-bezier(.2,.7,.2,1)}
.ctl-pr:hover::before,.ctl-pr:focus-visible::before{transform:none}
.ctl-pr:focus-visible{outline-offset:-2px}
.ctl-prt{display:block;max-width:28em;font-family:var(--ctl-serif);font-size:clamp(21px,2.5vw,33px);line-height:1.12;letter-spacing:-.008em;color:var(--ctl-text);transition:color .25s}
.ctl-pr:hover .ctl-prt{color:var(--ctl-ink)}
.ctl-prm{display:flex;align-items:center;gap:12px;margin-top:12px;font-size:11.5px;color:var(--ctl-ink)}
.ctl-prm i{display:block;width:52px;height:1px;background:currentColor;transition:width .5s cubic-bezier(.2,.7,.2,1)}
.ctl-pr:hover .ctl-prm i{width:84px}
.ctl-prarrow{justify-self:end;color:var(--ctl-text);transition:transform .5s cubic-bezier(.3,1.4,.5,1),color .25s}
.ctl-pr:hover .ctl-prarrow{transform:rotate(45deg);color:var(--ctl-ink)}
.ctl-wm{display:inline-flex;flex-direction:column;padding-top:6px;color:var(--ctl-text)}
.ctl-wm b{font:italic 800 17px/1 var(--ctl-serif);letter-spacing:-.02em}
.ctl-wm small{margin-top:3px;font:700 6.5px/1 var(--ctl-sans);letter-spacing:.32em}
.ctl-mono{display:grid;place-items:center;width:30px;height:30px;margin-top:4px;border-radius:7px;background:var(--ctl-text);color:var(--ctl-paper);font:italic 700 18px/1 var(--ctl-serif)}
.ctl-more{display:flex;justify-content:center;margin-top:30px}
.ctl-preview{position:fixed;left:0;top:0;z-index:60;width:236px;pointer-events:none;background:var(--ctl-paper);border:1px solid var(--ctl-ink);box-shadow:0 26px 50px -24px rgba(0,0,0,.45);opacity:0;scale:.9;transition:opacity .25s ease,scale .35s cubic-bezier(.2,.7,.2,1)}
.ctl-preview[data-on="true"]{opacity:1;scale:1}
.ctl-preview figcaption{display:flex;justify-content:space-between;gap:8px;padding:8px 10px;border-top:1px solid var(--ctl-ink);font:600 9px/1.2 var(--ctl-sans);letter-spacing:.16em;text-transform:uppercase;color:var(--ctl-ink)}
@media (max-width:720px){.ctl-pr{grid-template-columns:minmax(0,1fr) 28px;gap:12px 16px}.ctl-prlogo{grid-column:1/-1}}

.ctl-toile{--ctl-th:clamp(300px,40vw,620px);position:relative;height:var(--ctl-th);overflow:hidden;margin-top:clamp(20px,4vw,48px)}
.ctl-tcover{position:absolute;left:50%;bottom:0;width:max(100%,calc(var(--ctl-th) * 2.5));aspect-ratio:1400/560;transform:translateX(-50%)}
.ctl-hotwrap{position:absolute;z-index:3;will-change:transform}
.ctl-hot{position:relative;display:grid;place-items:center;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;background:var(--ctl-paper);color:var(--ctl-ink);box-shadow:inset 0 0 0 1px var(--ctl-ink),0 4px 12px -6px rgba(0,0,0,.4);font:italic 600 12px/1 var(--ctl-serif);transition:background-color .25s,color .25s,transform .3s}
.ctl-hot::before{content:"";position:absolute;inset:-6px;border-radius:50%;border:1px solid var(--ctl-ink);animation:ctl-ping 2.6s ease-out infinite}
.ctl-hot:hover,.ctl-hot[aria-expanded="true"]{background:var(--ctl-deep);color:var(--ctl-ondeep);transform:scale(1.08)}
@keyframes ctl-ping{0%{opacity:.8;transform:scale(.7)}80%,100%{opacity:0;transform:scale(1.6)}}
.ctl-pop{position:absolute;bottom:26px;left:0;width:248px;padding:14px 16px 16px;box-sizing:border-box;background:var(--ctl-paper);border:1px solid var(--ctl-ink);box-shadow:0 24px 40px -22px rgba(0,0,0,.45);text-align:left;animation:ctl-panel .35s cubic-bezier(.2,.7,.2,1) both}
.ctl-pop[data-side="mid"]{translate:-50% 0}
.ctl-pop[data-side="end"]{translate:-100% 0}
.ctl-pop b{display:block;margin-bottom:6px;font:400 21px/1.1 var(--ctl-serif);color:var(--ctl-ink)}
.ctl-pop p{font-size:13.5px;line-height:1.5;color:var(--ctl-text)}
.ctl-legend{display:none}
@media (max-width:700px){.ctl-hotwrap{display:none}.ctl-legend{display:grid;gap:14px;padding:26px 0 8px}.ctl-legend li{display:grid;grid-template-columns:30px 1fr;gap:12px;font-size:13.5px;line-height:1.45;color:var(--ctl-onnight)}.ctl-legend b{display:block;font:400 18px/1.2 var(--ctl-serif)}.ctl-legend span:first-child{font:italic 16px var(--ctl-serif);opacity:.7}}
.ctl-flap{transform-box:fill-box;transform-origin:center;animation:ctl-flap .9s ease-in-out infinite alternate}
@keyframes ctl-flap{to{transform:scaleY(.45)}}
.ctl-bob{animation:ctl-bob 4s ease-in-out infinite alternate}
@keyframes ctl-bob{to{translate:0 -9px}}
.ctl-orbit{transform-box:fill-box;transform-origin:center;animation:ctl-orbit 9s ease-in-out infinite alternate}
@keyframes ctl-orbit{from{rotate:-4deg}to{rotate:5deg}}

.ctl-cta{position:relative;margin-top:-1px;padding:clamp(40px,6vw,84px) 0 clamp(72px,9vw,128px);background:var(--ctl-deep);color:var(--ctl-ondeep);overflow:hidden}
.ctl-ctagrid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:36px 60px;align-items:end}
.ctl-cta .ctl-kicker{color:var(--ctl-ondeep)}
.ctl-ctat{margin-top:22px;font-family:var(--ctl-serif);font-weight:400;font-size:clamp(42px,7.4vw,108px);line-height:.96;letter-spacing:-.025em;text-wrap:balance}
.ctl-cta .ctl-ctat em{color:inherit}
.ctl-cta p{font-size:16px;line-height:1.6;color:color-mix(in oklab,var(--ctl-ondeep) 78%,transparent);max-width:30em}
.ctl-ctabtns{display:flex;flex-wrap:wrap;gap:12px;margin-top:26px}
.ctl-ctastars{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:.7}
@media (max-width:860px){.ctl-ctagrid{grid-template-columns:1fr}}

.ctl-foot{position:relative;padding-top:clamp(60px,8vw,100px)}
.ctl-fgrid{display:grid;grid-template-columns:minmax(0,1.35fr) repeat(3,minmax(0,.75fr)) minmax(0,1.45fr);gap:clamp(28px,4vw,52px)}
.ctl-fbrand .ctl-brand{font-size:26px}
.ctl-fbrand p{margin:20px 0 22px;font-size:14.5px;line-height:1.6;color:var(--ctl-soft);max-width:22em}
.ctl-contact li{display:flex;align-items:center;gap:12px;padding:6px 0;font-size:14px;color:var(--ctl-text)}
.ctl-contact svg{color:var(--ctl-ink);flex:none}
.ctl-contact a:hover{color:var(--ctl-ink)}
.ctl-fh{margin:8px 0 22px;font:600 12.5px/1 var(--ctl-sans);letter-spacing:.08em;text-transform:uppercase;color:var(--ctl-ink)}
.ctl-flist li{padding:6px 0}
.ctl-flist a{position:relative;font-size:14.5px;color:var(--ctl-soft);transition:color .2s}
.ctl-flist a::after{content:"";position:absolute;left:0;right:0;bottom:-2px;height:1px;background:var(--ctl-ink);transform:scaleX(0);transform-origin:right;transition:transform .35s}
.ctl-flist a:hover{color:var(--ctl-ink)}
.ctl-flist a:hover::after{transform:scaleX(1);transform-origin:left}
.ctl-newsp{margin-bottom:20px;font-size:14.5px;line-height:1.6;color:var(--ctl-soft)}
.ctl-news{display:flex;height:50px;box-shadow:inset 0 0 0 1px var(--ctl-line);background:var(--ctl-paper);transition:box-shadow .25s}
.ctl-news:focus-within{box-shadow:inset 0 0 0 1px var(--ctl-ink)}
.ctl-news[data-err="true"]{box-shadow:inset 0 0 0 1px #b4322a;animation:ctl-shake .4s}
.ctl-news input{flex:1;min-width:0;padding:0 16px;font-size:14px;color:var(--ctl-text);outline:none}
.ctl-news input::placeholder{color:var(--ctl-soft);opacity:.8}
.ctl-news button{display:grid;place-items:center;width:52px;flex:none;background:var(--ctl-deep);color:var(--ctl-ondeep);transition:width .3s}
.ctl-news button:hover{width:60px}
@keyframes ctl-shake{25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
.ctl-newsmsg{min-height:20px;margin-top:10px;font-size:12.5px;color:#b4322a}
.ctl-sealed{display:flex;align-items:center;gap:14px;padding:6px 0;font:italic 18px/1.3 var(--ctl-serif);color:var(--ctl-ink)}
.ctl-sealed svg{flex:none;animation:ctl-stamp .7s cubic-bezier(.3,1.6,.5,1) both}
@keyframes ctl-stamp{from{opacity:0;transform:scale(1.8) rotate(-30deg)}to{opacity:1;transform:none}}
.ctl-land{--ctl-lh:clamp(210px,27vw,420px);position:relative;height:var(--ctl-lh);overflow:hidden;margin-top:clamp(24px,4vw,44px)}
.ctl-lcover{position:absolute;left:50%;bottom:0;width:max(100%,calc(var(--ctl-lh) * 3.6842));aspect-ratio:1400/380;transform:translateX(-50%)}
.ctl-fbar{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:18px 28px;padding:20px 0 30px;border-top:1px solid var(--ctl-line);font-size:13px;color:var(--ctl-soft)}
.ctl-socials{display:flex;gap:6px}
.ctl-socials a{display:grid;place-items:center;width:36px;height:36px;border-radius:50%;color:var(--ctl-soft);transition:color .2s,background-color .2s}
.ctl-socials a:hover{color:var(--ctl-ondeep);background:var(--ctl-deep)}
.ctl-legal{display:flex;flex-wrap:wrap;gap:6px 22px}
.ctl-legal a:hover,.ctl-top:hover{color:var(--ctl-ink)}
.ctl-swatches{display:flex;align-items:center;gap:10px;font:600 10px/1 var(--ctl-sans);letter-spacing:.2em;text-transform:uppercase}
.ctl-swatch{width:22px;height:22px;border-radius:50%;box-shadow:inset 0 0 0 4px var(--ctl-paper),0 0 0 1px var(--ctl-line);transition:box-shadow .25s,transform .25s}
.ctl-swatch:hover{transform:scale(1.12)}
.ctl-swatch[aria-checked="true"]{box-shadow:inset 0 0 0 3px var(--ctl-paper),0 0 0 1.5px var(--ctl-ink)}
.ctl-top{display:inline-flex;align-items:center;gap:8px;transition:color .2s}
.ctl-top svg{transform:rotate(-90deg)}
@media (max-width:1060px){.ctl-fgrid{grid-template-columns:repeat(3,minmax(0,1fr))}.ctl-fbrand,.ctl-fnews{grid-column:1/-1}}
@media (max-width:560px){.ctl-fgrid{grid-template-columns:repeat(2,minmax(0,1fr))}.ctl-fbar{justify-content:flex-start}}
@media (prefers-reduced-motion:reduce){.ctl-track,.ctl-tw0,.ctl-tw1,.ctl-tw2,.ctl-shoot,.ctl-veil,.ctl-settle,.ctl-rise,.ctl-cue i,.ctl-hot::before,.ctl-flap,.ctl-bob,.ctl-orbit,.ctl-pr,.ctl-panelin,.ctl-pop,.ctl-menu,.ctl-sealed svg{animation:none!important}.ctl-rv,.ctl-mark,.ctl-fold,.ctl-shade,.ctl-btn,.ctl-btn::before,.ctl-rowt,.ctl-plus{transition:none!important}.ctl-pre{opacity:1;transform:none}}
`

/* -------------------------------------------------------- art primitives */

type Tone = "i" | "p"

const ArtCtx = React.createContext({ uid: "", reduced: false })

function usePat() {
  const { uid } = React.useContext(ArtCtx)
  return (name: string, t: Tone) => "url(#" + uid + "-" + name + t + ")"
}

const flip = (t: Tone): Tone => (t === "i" ? "p" : "i")
const LINE = { fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const }

function Defs({ uid }: { uid: string }) {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
      <defs>
        {(["i", "p"] as Tone[]).map((t) => {
          const cls = "ctl-s" + t
          return (
            <React.Fragment key={t}>
              <pattern id={uid + "-h1" + t} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)">
                <line x1="2" y1="0" x2="2" y2="4" className={cls} strokeWidth="0.6" />
              </pattern>
              <pattern id={uid + "-h2" + t} width="2.5" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)">
                <line x1="1.25" y1="0" x2="1.25" y2="4" className={cls} strokeWidth="0.75" />
              </pattern>
              <pattern id={uid + "-x" + t} width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <path d="M1.5 0V3M0 1.5H3" className={cls} strokeWidth="0.6" />
              </pattern>
              <pattern id={uid + "-hz" + t} width="8" height="3.2" patternUnits="userSpaceOnUse">
                <line x1="0" y1="1.6" x2="8" y2="1.6" className={cls} strokeWidth="0.55" />
              </pattern>
              <pattern id={uid + "-v" + t} width="3.2" height="8" patternUnits="userSpaceOnUse">
                <line x1="1.6" y1="0" x2="1.6" y2="8" className={cls} strokeWidth="0.6" />
              </pattern>
              <pattern id={uid + "-d" + t} width="3.4" height="3.4" patternUnits="userSpaceOnUse">
                <circle cx="0.85" cy="0.85" r="0.5" className={"ctl-f" + t} />
                <circle cx="2.55" cy="2.55" r="0.5" className={"ctl-f" + t} />
              </pattern>
            </React.Fragment>
          )
        })}
      </defs>
    </svg>
  )
}

function Leaves({ leaves, t }: { leaves: LeafShape[]; t: Tone }) {
  const pat = usePat()
  const shade = pat("h2", t)
  return (
    <>
      {leaves.map((l, i) => (
        <React.Fragment key={i}>
          <path className={"ctl-b" + t} d={l.o} />
          <path fill={shade} d={l.s} />
        </React.Fragment>
      ))}
    </>
  )
}

function Bloom({ x, y, R, t, petals = 7, rot = 0 }: { x: number; y: number; R: number; t: Tone; petals?: number; rot?: number }) {
  const pat = usePat()
  const outer = React.useMemo(() => rosette(x, y, R, petals, rot), [x, y, R, petals, rot])
  const inner = React.useMemo(() => rosette(x, y, R * 0.62, petals, rot + Math.PI / petals), [x, y, R, petals, rot])
  return (
    <g>
      <Leaves leaves={outer} t={t} />
      <Leaves leaves={inner} t={t} />
      <circle cx={x} cy={y} r={R * 0.26} className={"ctl-b" + t} />
      <circle cx={x} cy={y} r={R * 0.26} fill={pat("d", t)} />
    </g>
  )
}

function Fruit({ x, y, r, t }: { x: number; y: number; r: number; t: Tone }) {
  const pat = usePat()
  return (
    <g>
      <circle cx={x} cy={y} r={r} className={"ctl-b" + t} />
      <path d={"M" + r1(x + r * 0.2) + " " + r1(y - r) + "A" + r + " " + r + " 0 0 1 " + r1(x + r * 0.2) + " " + r1(y + r) + "A" + r * 0.8 + " " + r + " 0 0 0 " + r1(x + r * 0.2) + " " + r1(y - r) + "Z"} fill={pat("h2", t)} stroke="none" />
      <path d={"M" + r1(x - r * 0.3) + " " + r1(y - r * 0.9) + "L" + r1(x) + " " + r1(y - r * 1.35) + "L" + r1(x + r * 0.3) + " " + r1(y - r * 0.9)} />
      <circle cx={x - r * 0.35} cy={y - r * 0.3} r={r * 0.16} strokeWidth="0.6" />
    </g>
  )
}

type BushSpec = [number, number, number, number, number, number, number]

function Bush({ spec, t }: { spec: BushSpec; t: Tone }) {
  const leaves = React.useMemo(() => leafCluster(spec[0], spec[1], spec[2], spec[3], spec[4], spec[5], spec[6]), [spec])
  return <Leaves leaves={leaves} t={t} />
}

function mirrorSpec(s: BushSpec, w: number, seed: number): BushSpec {
  return [s[0] + seed, w - s[1], s[2], s[3], s[4], s[5], s[6]]
}

/* ---- classical figures (local box 120 × 280, feet on y = 272) */

const ST = {
  armBack: "M73 50 C81 56 85 74 84 96 C83 110 81 120 83 130 C80 134 75 133 74 127 C73 112 74 94 71 72 Z",
  body: "M45 47 C52 43 66 43 75 48 C79 62 78 80 76 94 C81 112 86 132 87 152 C89 192 93 232 99 266 C86 273 60 275 35 270 C34 248 36 226 39 204 C36 196 37 186 41 178 C40 150 40 116 44 94 C41 78 40 62 45 47 Z",
  mantle: "M41 104 C56 114 75 122 87 142 C89 150 87 158 82 162 C68 146 54 136 40 130 Z",
  mantleShade: "M40 124 C54 130 68 140 84 156 L82 162 C68 146 54 136 40 130 Z",
  tail: "M82 130 C88 150 92 190 94 236 C90 238 86 236 85 232 C84 196 82 160 80 138 Z",
  neck: "M54 34 C54 38 54 42 53 46 L65 46 C64 42 64 38 64 34 Z",
  hair: "M49 22 C48 11 57 7 64 9 C71 11 73 19 70 26 C67 20 61 17 53 20 C51 22 50 24 49 26 Z",
  upper: "M46 50 C40 60 35 76 35 90 C38 95 44 94 45 90 C46 78 49 64 52 54 Z",
  fore: "M36 90 C38 74 44 56 50 40 C52 36 57 37 56 42 C52 58 47 76 44 92 C42 96 37 95 36 90 Z",
  feet: "M44 272 C43 266 52 264 57 268 L57 273 L44 273 Z M78 272 C80 266 89 266 91 270 L91 273 L78 273 Z",
  shadeR: "M70 44 C80 80 82 150 88 272 L124 272 L124 40 Z",
  shadeHem: "M30 254 C60 262 86 260 104 250 L104 282 L30 282 Z",
  face: "M62 13 C70 17 71 30 64 37 L61 37 C66 30 66 19 60 13 Z",
  raise: "M70 50 C76 40 84 24 92 6 C94 1 100 2 99 8 C93 24 85 42 78 56 Z",
  hang: "M46 50 C40 62 38 80 38 100 C38 106 44 106 45 100 C46 84 48 66 52 54 Z",
  sword: "M39.5 104 L43 104.6 L33 214 L30 213 Z",
  blind: "M49 21 C55 23.5 63 23.5 69.5 20.5 L69.5 25 C63 28 55 28 49 25.5 Z",
}

const ST_FOLDS = (() => {
  const out = [
    "M49 58 C56 64 66 64 73 57",
    "M48 68 C57 76 68 76 75 67",
    "M47 80 C57 88 69 87 76 80",
    "M58 48 C59 62 61 76 62 94",
    "M42 182 C47 196 50 210 48 228",
    "M44 112 C58 120 72 128 84 146",
    "M43 121 C56 129 68 139 80 154",
    "M84 140 C87 170 89 200 90 232",
  ]
  for (let k = 0; k < 9; k++) {
    const xs = 44 + k * 5.2
    const xe = 38 + k * 7.4
    out.push("M" + xs + " 164 C" + r1(xs + (k % 2 ? 3 : -2)) + " 200 " + r1(xe - (k % 2 ? 4 : -2)) + " 232 " + r1(xe) + " 268")
  }
  return out
})()

function Statue({ t, variant = "muse" }: { t: Tone; variant?: "muse" | "justice" }) {
  const pat = usePat()
  const { uid } = React.useContext(ArtCtx)
  const b = "ctl-b" + t
  const clip = uid + "-st" + variant + t
  return (
    <g className={"ctl-s" + t} {...LINE} strokeWidth="0.9">
      <clipPath id={clip}>
        <path d={ST.body} />
      </clipPath>
      {variant === "muse" && <path className={b} d={ST.armBack} />}
      {variant === "muse" && <path d="M78 60 C81 76 81 92 79 108" strokeWidth="0.6" />}
      <path className={b} d={ST.body} />
      <g clipPath={"url(#" + clip + ")"} stroke="none">
        <path d={ST.shadeR} fill={pat("h2", t)} />
        <path d={ST.shadeHem} fill={pat("h1", t)} />
      </g>
      <path className={b} d={ST.mantle} />
      <path d={ST.mantleShade} fill={pat("h2", t)} stroke="none" />
      <path className={b} d={ST.tail} />
      <path d="M86 150 C89 180 91 205 92 232 L94 236 C92 200 90 170 84 140 Z" fill={pat("h2", t)} stroke="none" />
      <g strokeWidth="0.65">
        {ST_FOLDS.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      <path className={b} d={ST.feet} />
      <path className={b} d={ST.neck} />
      <ellipse className={b} cx="59" cy="24" rx="10" ry="12.5" />
      <path d={ST.face} fill={pat("h2", t)} stroke="none" />
      <path className={b} d={ST.hair} />
      <path d="M52 15 C57 12 64 12 69 16 M51 19 C57 15 64 15 70 20" strokeWidth="0.55" />
      <circle className={b} cx="70" cy="15" r="5.5" />
      <path d="M67 12 C70 14 72 16 72 19" strokeWidth="0.55" />
      {variant === "muse" ? (
        <>
          <path className={b} d={ST.upper} />
          <path d="M44 56 C42 66 40 76 40 88" fill="none" strokeWidth="0.55" />
          <path className={b} d={ST.fore} />
          <path d="M48 48 C46 60 43 74 41 88" strokeWidth="0.55" />
          <circle className={b} cx="53" cy="38" r="4.2" />
        </>
      ) : (
        <>
          <path className={"ctl-f" + t} d={ST.blind} stroke="none" />
          <path className={b} d={ST.hang} />
          <path className={b} d={ST.sword} />
          <path d="M33 101 L50 107.5 M41.5 103 L43 93" strokeWidth="1.6" />
          <circle className={b} cx="43.2" cy="91.5" r="2.4" />
          <path className={b} d={ST.raise} />
          <circle className={b} cx="96.5" cy="3.5" r="4" />
          <path d="M78 -1 L115 7 M78 -1 L70 30 M78 -1 L86 30 M115 7 L107 38 M115 7 L123 38 M96.5 1 L96.5 -8" strokeWidth="0.7" />
          <path className={b} d="M66 30 H90 Q78 42 66 30 Z" />
          <path className={b} d="M103 38 H127 Q115 50 103 38 Z" />
        </>
      )}
    </g>
  )
}

function Pedestal({ t }: { t: Tone }) {
  const pat = usePat()
  const b = "ctl-b" + t
  return (
    <g className={"ctl-s" + t} {...LINE} strokeWidth="0.9">
      <path className={b} d="M16 15 H104 V80 H16 Z" />
      <path d="M90 15 H104 V80 H90 Z" fill={pat("h2", t)} />
      <rect x="24" y="23" width="62" height="49" />
      <circle cx="55" cy="47.5" r="13" />
      <circle cx="55" cy="47.5" r="9" strokeDasharray="1.6 2.2" />
      <path className={b} d="M4 0 H116 V9 H4 Z" />
      <path d="M10 9 H110 V15 H10 Z" fill={pat("hz", t)} />
      <path className={b} d="M10 80 H110 V87 H10 Z" />
      <path className={b} d="M4 87 H116 V96 H4 Z" />
      <path d="M4 92 H116" strokeWidth="0.5" />
    </g>
  )
}

function Temple({ x, base, w, t }: { x: number; base: number; w: number; t: Tone }) {
  const pat = usePat()
  const b = "ctl-b" + t
  const colH = w * 0.36
  const top = base - 12 - colH
  const n = 6
  const cw = w * 0.052
  const archH = w * 0.042
  const friezeH = w * 0.036
  const fTop = top - 2.5 - archH - friezeH
  const cTop = fTop - 3
  const cols = []
  for (let k = 0; k < n; k++) cols.push(x - w / 2 + 14 + (k * (w - 28)) / (n - 1))
  const glyphs = []
  for (let g = x - w / 2 + 10; g < x + w / 2 - 8; g += w / 14) glyphs.push(g)
  return (
    <g className={"ctl-s" + t} {...LINE} strokeWidth="0.8">
      <rect x={x - w / 2 + 14} y={top} width={w - 28} height={colH} fill={pat("x", t)} />
      {cols.map((cx, k) => (
        <g key={k}>
          <rect className={b} x={cx - cw / 2} y={top} width={cw} height={colH} />
          <rect x={cx} y={top} width={cw / 2} height={colH} fill={pat("h2", t)} stroke="none" />
          <line x1={cx - cw / 4} y1={top + 2} x2={cx - cw / 4} y2={top + colH - 2} strokeWidth="0.45" />
          <rect className={b} x={cx - cw * 0.8} y={top - 2.5} width={cw * 1.6} height="2.5" />
        </g>
      ))}
      <rect className={b} x={x - w / 2 + 6} y={top - 2.5 - archH} width={w - 12} height={archH} />
      <rect className={b} x={x - w / 2 + 5} y={fTop} width={w - 10} height={friezeH} />
      {glyphs.map((g, k) => (
        <path key={k} d={"M" + r1(g) + " " + r1(fTop + 1) + "V" + r1(fTop + friezeH - 1) + "M" + r1(g + 2) + " " + r1(fTop + 1) + "V" + r1(fTop + friezeH - 1)} strokeWidth="0.5" />
      ))}
      <rect className={b} x={x - w / 2 + 2} y={cTop} width={w - 4} height="3" />
      <path className={b} d={"M" + r1(x - w / 2 + 2) + " " + r1(cTop) + "L" + r1(x) + " " + r1(cTop - w * 0.15) + "L" + r1(x + w / 2 - 2) + " " + r1(cTop) + "Z"} />
      <path d={"M" + r1(x - w / 2 + 14) + " " + r1(cTop - 2) + "L" + r1(x) + " " + r1(cTop - w * 0.15 + 5) + "L" + r1(x + w / 2 - 14) + " " + r1(cTop - 2) + "Z"} fill={pat("h1", t)} strokeWidth="0.5" />
      <rect className={b} x={x - w / 2 + 8} y={base - 12} width={w - 16} height="4" />
      <rect className={b} x={x - w / 2 + 4} y={base - 8} width={w - 8} height="4" />
      <rect className={b} x={x - w / 2} y={base - 4} width={w} height="4" />
    </g>
  )
}

function Colonnade({ x1, x2, base, h, t }: { x1: number; x2: number; base: number; h: number; t: Tone }) {
  const pat = usePat()
  const b = "ctl-b" + t
  const cols = []
  for (let x = x1 + 4; x <= x2 - 4; x += 11) cols.push(x)
  return (
    <g className={"ctl-s" + t} {...LINE} strokeWidth="0.7">
      <rect className={b} x={x1} y={base - h} width={x2 - x1} height={h} />
      <rect x={x1 + 2} y={base - h + 6} width={x2 - x1 - 4} height={h - 8} fill={pat("x", t)} stroke="none" />
      {cols.map((x, k) => (
        <rect key={k} className={b} x={x - 1.6} y={base - h + 6} width="3.2" height={h - 8} />
      ))}
      <rect className={b} x={x1 - 3} y={base - h - 4} width={x2 - x1 + 6} height="6" />
      <rect className={b} x={x1 - 2} y={base - 3} width={x2 - x1 + 4} height="3" />
    </g>
  )
}

function Cypress({ x, base, h, t }: { x: number; base: number; h: number; t: Tone }) {
  const pat = usePat()
  return (
    <path
      className={"ctl-s" + t}
      d={"M" + x + " " + base + "C" + (x - 7) + " " + (base - h * 0.2) + " " + (x - 6) + " " + (base - h * 0.6) + " " + x + " " + (base - h) + "C" + (x + 6) + " " + (base - h * 0.6) + " " + (x + 7) + " " + (base - h * 0.2) + " " + x + " " + base + "Z"}
      fill={pat("h2", t)}
      strokeWidth="0.7"
    />
  )
}

function Birds({ list, t }: { list: [number, number, number][]; t: Tone }) {
  return (
    <g className={"ctl-s" + t} {...LINE} strokeWidth="1">
      {list.map(([x, y, s], i) => (
        <path key={i} className="ctl-flap" style={{ animationDelay: -i * 0.37 + "s" }} d={"M" + x + " " + y + "q" + 6 * s + " " + -5 * s + " " + 11 * s + " 0q" + 5 * s + " " + -5 * s + " " + 11 * s + " 0"} />
      ))}
    </g>
  )
}

/* -------------------------------------------------------------- the hero */

const AX = 600
const AY = 342
const pol = (r: number, deg: number) => [AX + r * Math.cos((deg * Math.PI) / 180), AY + r * Math.sin((deg * Math.PI) / 180)]
const P2 = (p: number[]) => r1(p[0]) + " " + r1(p[1])

const HERO_BACK: BushSpec[] = [
  [16, -60, 380, 120, 300, 230, 22],
  [11, 205, 330, 150, 140, 300, 21],
  [12, 82, 205, 100, 104, 170, 19],
  [13, 318, 232, 74, 120, 140, 18],
  [14, 72, 470, 116, 130, 190, 22],
  [15, 326, 480, 64, 124, 120, 19],
]
const HERO_FRONT: BushSpec[] = [
  [33, -70, 640, 110, 90, 110, 24],
  [31, 40, 652, 128, 84, 150, 24],
  [32, 292, 676, 86, 48, 70, 19],
]

function HeroSky() {
  const pat = usePat()
  const stars = React.useMemo(() => scatterStars(7, 280, -300, 0, 1800, 520), [])
  return (
    <svg className="ctl-svg ctl-layer" viewBox="0 0 1200 720" preserveAspectRatio="none" aria-hidden="true">
      <rect x="-400" y="0" width="2000" height="720" fill={pat("hz", "p")} opacity="0.13" />
      {[0, 1, 2].map((g) => (
        <g key={g} className={"ctl-fp ctl-tw" + g}>
          {stars.map((s, i) =>
            i % 3 !== g ? null : s.sparkle ? <path key={i} d={sparklePath(s.x, s.y, s.r * 3.4)} /> : <circle key={i} cx={s.x} cy={s.y} r={r1(s.r)} />
          )}
        </g>
      ))}
    </svg>
  )
}

function Moon({ x, y, r, side, phase, onCycle }: { x: number; y: number; r: number; side: number; phase: number; onCycle: () => void }) {
  const pat = usePat()
  const { uid } = React.useContext(ArtCtx)
  const id = uid + "-moon" + (side > 0 ? "l" : "r")
  const d = MOON_STEPS[phase] * r * side
  return (
    <g
      className="ctl-moon"
      role="button"
      tabIndex={0}
      aria-label={"Moon, " + MOON_NAMES[phase] + ". Press to change its phase"}
      onClick={onCycle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onCycle()
        }
      }}
    >
      <circle cx={x} cy={y} r={r * 2.2} fill="transparent" />
      <g className="ctl-sp" fill="none">
        <circle cx={x} cy={y} r={r * 1.38} strokeWidth="0.6" opacity="0.4" />
        <circle cx={x} cy={y} r={r * 1.7} strokeWidth="0.8" strokeDasharray="0.5 4.5" opacity="0.55" />
        <circle cx={x} cy={y} r={r * 2.05} strokeWidth="0.5" opacity="0.18" />
        <circle className="ctl-moonring" cx={x} cy={y} r={r * 1.38} strokeWidth="1.4" />
      </g>
      <clipPath id={id}>
        <circle cx={x} cy={y} r={r} />
      </clipPath>
      <circle cx={x} cy={y} r={r} className="ctl-fp" />
      <g clipPath={"url(#" + id + ")"}>
        <g className="ctl-si" fill="none" strokeWidth="0.7" opacity="0.55">
          <circle cx={x - r * 0.38} cy={y - r * 0.2} r={r * 0.17} />
          <circle cx={x - r * 0.1} cy={y + r * 0.42} r={r * 0.11} />
          <circle cx={x + r * 0.32} cy={y - r * 0.38} r={r * 0.09} />
          <circle cx={x + r * 0.3} cy={y + r * 0.18} r={r * 0.14} />
        </g>
        <circle cx={x} cy={y} r={r} fill={pat("d", "i")} opacity="0.35" />
        <g className="ctl-shade" style={{ transform: "translateX(" + r1(d) + "px)" }}>
          <circle cx={x} cy={y} r={r * 1.03} className="ctl-bp" />
          <circle cx={x} cy={y} r={r * 1.03} fill={pat("h1", "p")} opacity="0.35" />
        </g>
      </g>
      <circle cx={x} cy={y} r={r} className="ctl-sp" fill="none" strokeWidth="0.8" />
    </g>
  )
}

const HeroBack = React.memo(function HeroBack() {
  const backR = React.useMemo(() => HERO_BACK.map((s) => mirrorSpec(s, 1200, 40)), [])
  const blooms = React.useMemo(() => {
    const rnd = mulberry32(99)
    const out = [] as { x: number; y: number; R: number; fruit: boolean }[]
    for (const s of HERO_BACK) {
      for (let k = 0; k < 4; k++) {
        const th = rnd() * Math.PI * 2
        const rr = Math.sqrt(rnd()) * 0.8
        const x = s[1] + Math.cos(th) * rr * s[3]
        const y = s[2] + Math.sin(th) * rr * s[4]
        const R = 8 + rnd() * 6
        const fruit = rnd() > 0.6
        out.push({ x, y, R, fruit }, { x: 1200 - x + (rnd() - 0.5) * 30, y: y + (rnd() - 0.5) * 30, R, fruit: !fruit })
      }
    }
    return out
  }, [])
  return (
    <svg className="ctl-svg ctl-layer" viewBox="0 0 1200 720" preserveAspectRatio="none" aria-hidden="true">
      <g className="ctl-sp" {...LINE} strokeWidth="2">
        <path d="M-60 700 C-54 600 -70 500 -44 280 M1260 700 C1254 600 1270 500 1244 280 M70 700 C76 600 60 500 86 300 M300 700 C306 600 330 420 318 260 M1130 700 C1124 600 1140 500 1114 300 M900 700 C894 600 870 420 882 260" />
      </g>
      <g className="ctl-sp" {...LINE} strokeWidth="0.75">
        {HERO_BACK.map((s, i) => (
          <Bush key={"l" + i} spec={s} t="p" />
        ))}
        {backR.map((s, i) => (
          <Bush key={"r" + i} spec={s} t="p" />
        ))}
        {blooms.map((b, i) => (b.fruit ? <Fruit key={i} x={b.x} y={b.y} r={b.R * 0.75} t="p" /> : <Bloom key={i} x={b.x} y={b.y} R={b.R} t="p" rot={i} />))}
      </g>
    </svg>
  )
})

const HeroArch = React.memo(function HeroArch() {
  const pat = usePat()
  const { uid } = React.useContext(ArtCtx)
  const clip = uid + "-view"
  const view = "M410 660 V342 A190 190 0 0 1 790 342 V660 Z"
  const garland = React.useMemo(() => {
    const rnd = mulberry32(5)
    const leaves = [] as LeafShape[]
    for (let deg = 184; deg <= 356; deg += 3.1) {
      if (deg > 263 && deg < 277) continue
      const a = (deg * Math.PI) / 180
      const r = 256 + (rnd() - 0.5) * 9
      const x = AX + Math.cos(a) * r
      const y = AY + Math.sin(a) * r
      for (let j = 0; j < 2; j++) {
        const L = 13 + rnd() * 9
        leaves.push(leafPath(x, y, a + (rnd() - 0.5) * 2.6, L, L * 0.36))
      }
    }
    return leaves
  }, [])
  const vous = []
  for (let k = 1; k < 24; k++) if (k !== 12) vous.push(180 + k * 7.5)
  const flutes = []
  for (let k = 1; k < 7; k++) flutes.push(354 + (52 * k) / 7)
  const pave = []
  for (let x = 410; x <= 790; x += 38) pave.push(x)
  const rays = []
  for (let k = 0; k <= 28; k++) rays.push(196 + k * 5.3)
  const pillar = (
    <g>
      <path className="ctl-bi" d="M354 366 H406 V628 H354 Z" />
      <path d="M394 366 H406 V628 H394 Z" fill={pat("h2", "i")} />
      {flutes.map((x, k) => (
        <line key={k} x1={r1(x)} y1="372" x2={r1(x)} y2="622" strokeWidth="0.55" />
      ))}
      <path className="ctl-bi" d="M342 342 H418 V356 H342 Z" />
      <path d="M342 349 H418" strokeWidth="0.5" />
      <path className="ctl-bi" d="M348 356 H412 V366 H348 Z" />
      <circle className="ctl-bi" cx="346" cy="361" r="6.5" />
      <circle cx="346" cy="361" r="2.6" />
      <circle className="ctl-bi" cx="414" cy="361" r="6.5" />
      <circle cx="414" cy="361" r="2.6" />
      <path className="ctl-bi" d="M346 628 H414 V642 H346 Z" />
      <path className="ctl-bi" d="M338 642 H422 V660 H338 Z" />
      <path d="M338 651 H422" strokeWidth="0.5" />
    </g>
  )
  return (
    <svg className="ctl-svg ctl-layer" viewBox="0 0 1200 720" preserveAspectRatio="none" aria-hidden="true">
      <clipPath id={clip}>
        <path d={view} />
      </clipPath>
      <path className="ctl-bi" d={view} />
      <g clipPath={"url(#" + clip + ")"} className="ctl-si" {...LINE}>
        <rect x="400" y="140" width="400" height="520" fill={pat("hz", "i")} opacity="0.2" stroke="none" />
        <g strokeWidth="0.5" opacity="0.18">
          {rays.map((deg, k) => {
            const a = (deg * Math.PI) / 180
            return <line key={k} x1="600" y1="560" x2={r1(600 + Math.cos(a) * 520)} y2={r1(560 + Math.sin(a) * 520)} />
          })}
        </g>
        <path d="M410 600 C460 584 520 590 560 586 C620 580 680 588 720 584 C750 582 770 590 790 588 V600 H410 Z" fill={pat("hz", "i")} strokeWidth="0.6" opacity="0.7" />
        <Colonnade x1={418} x2={514} base={600} h={36} t="i" />
        <Colonnade x1={686} x2={782} base={600} h={36} t="i" />
        <Cypress x={534} base={600} h={52} t="i" />
        <Cypress x={666} base={600} h={52} t="i" />
        <Cypress x={548} base={600} h={36} t="i" />
        <Cypress x={652} base={600} h={36} t="i" />
        <Temple x={600} base={600} w={150} t="i" />
        <path d="M410 600 H790" strokeWidth="0.8" />
        <g strokeWidth="0.55" opacity="0.7">
          {pave.map((x, k) => (
            <line key={k} x1={x} y1="660" x2={r1(600 + (x - 600) * 0.16)} y2="600" />
          ))}
          <path d="M410 610 H790 M410 624 H790 M410 642 H790" />
        </g>
        <Birds list={[[470, 210, 0.7], [492, 198, 0.55], [700, 232, 0.6]]} t="i" />
      </g>
      <g className="ctl-si" {...LINE} strokeWidth="0.9">
        <path className="ctl-bi" d="M410 342 A190 190 0 0 1 790 342 L850 342 A250 250 0 0 0 350 342 Z" />
        <path d="M410 342 A190 190 0 0 1 790 342 L801 342 A201 201 0 0 0 399 342 Z" fill={pat("h2", "i")} strokeWidth="0.6" />
        <path d="M600 92 A250 250 0 0 1 850 342 L842 342 A242 242 0 0 0 600 100 Z" fill={pat("h1", "i")} strokeWidth="0.5" />
        <path d="M364 342 A236 236 0 0 1 836 342 M358 342 A242 242 0 0 1 842 342" strokeWidth="0.6" />
        {vous.map((deg, k) => (
          <path key={k} d={"M" + P2(pol(201, deg)) + "L" + P2(pol(236, deg))} strokeWidth="0.7" />
        ))}
        {pillar}
        <g transform="translate(1200 0) scale(-1 1)">{pillar}</g>
        <path className="ctl-bi" d="M-400 660 H1600 V672 H-400 Z" />
        <rect x="-400" y="672" width="2000" height="60" className="ctl-bp" stroke="none" />
        <rect x="-400" y="672" width="2000" height="60" fill={pat("hz", "p")} opacity="0.5" stroke="none" />
      </g>
      <g className="ctl-sp" {...LINE} strokeWidth="0.75">
        <Leaves leaves={garland} t="p" />
        {[200, 226, 314, 340].map((deg, k) => {
          const p = pol(257, deg)
          return <Bloom key={k} x={p[0]} y={p[1]} R={11 + (k % 2) * 2} t="p" rot={k} />
        })}
      </g>
      <g className="ctl-si" {...LINE} strokeWidth="0.9">
        <path className="ctl-bi" d={"M" + P2(pol(184, 265.4)) + "L" + P2(pol(266, 264.2)) + "L" + P2(pol(266, 275.8)) + "L" + P2(pol(184, 274.6)) + "Z"} />
        <path d={"M" + P2(pol(194, 266.6)) + "L" + P2(pol(256, 265.8)) + "L" + P2(pol(256, 274.2)) + "L" + P2(pol(194, 273.4)) + "Z"} strokeWidth="0.5" />
        <path d="M605 86 L610 86 L612 152 L606 156 Z" fill={pat("h2", "i")} stroke="none" />
        <path className="ctl-bi" d="M587 76 H613 L609 70 C625 62 629 46 619 38 H581 C571 46 575 62 591 70 Z" />
        <path d="M603 70 C615 62 618 50 612 40 L619 38 C629 46 625 62 609 70 Z" fill={pat("h2", "i")} strokeWidth="0.5" />
        <path className="ctl-bi" d="M573 32 H627 V38 H573 Z" />
        <path d="M581 38 C570 36 566 46 574 50 M619 38 C630 36 634 46 626 50" />
        <path d="M584 54 H616" strokeDasharray="1.5 2" strokeWidth="0.6" />
      </g>
      <g className="ctl-sp" {...LINE} strokeWidth="0.75">
        <Bush spec={[71, 600, 20, 46, 14, 34, 14]} t="p" />
        <Bloom x={600} y={16} R={13} t="p" />
        <Bloom x={576} y={26} R={9} t="p" rot={1} />
        <Bloom x={624} y={26} R={9} t="p" rot={2} />
      </g>
    </svg>
  )
})

const HeroFigures = React.memo(function HeroFigures() {
  const left = (
    <g>
      <g transform="translate(144.8 571.7) scale(0.92)">
        <Pedestal t="i" />
      </g>
      <g transform="translate(134 272.5) scale(1.1)">
        <Statue t="i" />
      </g>
    </g>
  )
  return (
    <svg className="ctl-svg ctl-layer" viewBox="0 0 1200 720" preserveAspectRatio="none" aria-hidden="true">
      {left}
      <g transform="translate(1200 0) scale(-1 1)">{left}</g>
    </svg>
  )
})

const HeroFront = React.memo(function HeroFront() {
  const right = React.useMemo(() => HERO_FRONT.map((s) => mirrorSpec(s, 1200, 50)), [])
  return (
    <svg className="ctl-svg ctl-layer" viewBox="0 0 1200 720" preserveAspectRatio="none" aria-hidden="true">
      <g className="ctl-sp" {...LINE} strokeWidth="0.8">
        {HERO_FRONT.map((s, i) => (
          <Bush key={"l" + i} spec={s} t="p" />
        ))}
        {right.map((s, i) => (
          <Bush key={"r" + i} spec={s} t="p" />
        ))}
        <Bloom x={64} y={604} R={23} t="p" petals={8} />
        <Bloom x={150} y={648} R={17} t="p" rot={0.5} />
        <Bloom x={286} y={650} R={14} t="p" rot={1} />
        <Fruit x={22} y={560} r={10} t="p" />
        <Bloom x={1136} y={604} R={23} t="p" petals={8} rot={0.3} />
        <Bloom x={1050} y={648} R={17} t="p" rot={0.8} />
        <Bloom x={914} y={650} R={14} t="p" rot={1.4} />
        <Fruit x={1178} y={560} r={10} t="p" />
      </g>
    </svg>
  )
})

function shift(d: number) {
  return { transform: "translate3d(calc(var(--mx, 0) * " + r1(-d * 18) + "px), calc(var(--my, 0) * " + r1(-d * 10) + "px), 0)" }
}

/* ----------------------------------------------------------- bookmark art */

type MarkLayout = { x: number; y: number; w: number; h: number; v: boolean; size: number; color: "line" | "bg"; align?: "left" | "right" | "center" }

const MARK_LAYOUT: { [k: string]: MarkLayout } = {
  typewriter: { x: 44, y: 200, w: 112, h: 360, v: true, size: 7.6, color: "line" },
  steamer: { x: 22, y: 56, w: 156, h: 220, v: false, size: 8.6, color: "line", align: "left" },
  monogram: { x: 108, y: 238, w: 82, h: 150, v: false, size: 6.6, color: "line", align: "left" },
  tower: { x: 104, y: 496, w: 86, h: 92, v: false, size: 6.2, color: "bg", align: "right" },
}

const CARD = "M12 0 H188 Q200 0 200 12 V588 Q200 600 188 600 H12 Q0 600 0 588 V12 Q0 0 12 0 Z"
const HOLE = " M94 26 A6 6 0 1 0 106 26 A6 6 0 1 0 94 26 Z"

function TypewriterArt({ t, label }: { t: Tone; label: string }) {
  const pat = usePat()
  const b = "ctl-b" + t
  const bars = []
  for (let k = 0; k <= 16; k++) bars.push(186 + k * 10.5)
  const rows = [
    { y: 134, n: 10, x0: 41 },
    { y: 145, n: 9, x0: 47 },
    { y: 157, n: 9, x0: 41 },
  ]
  return (
    <>
      <path className={b} d="M62 4 H138 V34 H189 A11 11 0 0 1 189 56 H178 L186 148 Q190 150 190 154 V170 Q190 176 184 176 H164 V582 Q164 592 154 592 H46 Q36 592 36 582 V176 H16 Q10 176 10 170 V154 Q10 150 14 148 L22 56 H11 A11 11 0 0 1 11 34 H62 Z" />
      <g className={"ctl-s" + t} {...LINE} strokeWidth="1">
        <path d="M66 34 V8 H134 V34" strokeWidth="0.7" />
        <path d="M74 28 H126 M80 33 H120" strokeWidth="0.5" />
        <rect x="16" y="37.5" width="168" height="15" rx="7.5" />
        <path d="M22 45 H178" strokeWidth="0.5" />
        <circle cx="11" cy="45" r="6.5" />
        <circle cx="11" cy="45" r="2.4" />
        <circle cx="189" cy="45" r="6.5" />
        <circle cx="189" cy="45" r="2.4" />
        <path d="M24 58 L34 58 L40 108 L28 108 Z M176 58 L166 58 L160 108 L172 108 Z" fill={pat("h2", t)} strokeWidth="0.6" />
        <path d="M58 106 A42 42 0 0 1 142 106" />
        <path d="M70 106 A30 30 0 0 1 130 106" strokeWidth="0.7" />
        {bars.map((deg, k) => {
          const a = (deg * Math.PI) / 180
          return <line key={k} x1={r1(100 + Math.cos(a) * 12)} y1={r1(106 + Math.sin(a) * 12)} x2={r1(100 + Math.cos(a) * 40)} y2={r1(106 + Math.sin(a) * 40)} strokeWidth="0.7" />
        })}
        <path d="M86 70 H114 V80 H86 Z" className={b} />
        <path className={b} d="M36 110 H164 L170 128 H30 Z" />
        <path d="M40 116 H160" strokeWidth="0.5" />
        <path d="M30 128 H170 L176 148 H24 Z" fill={pat("h1", t)} strokeWidth="0.6" />
        {rows.map((row) => {
          const keys = []
          for (let k = 0; k < row.n; k++) keys.push(row.x0 + k * 13)
          return keys.map((x, k) => (
            <g key={row.y + "-" + k}>
              <circle className={b} cx={x} cy={row.y} r="4.4" />
              <circle cx={x} cy={row.y} r="1.6" strokeWidth="0.5" />
            </g>
          ))
        })}
        <rect className={b} x="62" y="165" width="76" height="6" rx="3" />
        <path d="M100 548 L106 556 L100 564 L94 556 Z M64 556 H88 M112 556 H136" strokeWidth="0.7" />
      </g>
      <text x="100" y="22" textAnchor="middle" className={"ctl-f" + t} style={{ font: "italic 9px " + "var(--ctl-serif)" }}>
        {label}
      </text>
    </>
  )
}

function SteamerArt({ t }: { t: Tone }) {
  const pat = usePat()
  const { uid } = React.useContext(ArtCtx)
  const b = "ctl-b" + t
  const clip = uid + "-stm" + t
  const wins = []
  for (let x = 36; x < 166; x += 9) wins.push(x)
  return (
    <>
      <path className={b} d={CARD + HOLE} fillRule="evenodd" />
      <clipPath id={clip}>
        <path d={CARD} />
      </clipPath>
      <g clipPath={"url(#" + clip + ")"} className={"ctl-s" + t} {...LINE} strokeWidth="0.9">
        <rect x="0" y="300" width="200" height="150" fill={pat("hz", t)} opacity="0.35" stroke="none" />
        <path d="M0 300 H200" strokeWidth="0.6" />
        {[[6, 352, 22, 98], [28, 336, 18, 114], [46, 362, 26, 88], [148, 340, 20, 110], [168, 358, 26, 92]].map((r, k) => (
          <g key={k}>
            <rect className={b} x={r[0]} y={r[1]} width={r[2]} height={r[3]} />
            <rect x={r[0] + 3} y={r[1] + 5} width={r[2] - 6} height={r[3] - 10} fill={pat("v", t)} stroke="none" />
          </g>
        ))}
        <rect x="0" y="448" width="200" height="160" fill={pat("hz", t)} stroke="none" />
        <path d="M0 448 H200" />
        <path className={b} d="M128 356 a6 6 0 1 1 -1 0 M138 345 a8 8 0 1 1 -1 0 M154 336 a9 9 0 1 1 -1 0" fill={pat("h1", t)} />
        <path className={b} d="M120 364 H131 V406 H120 Z" />
        <path d="M120 372 H131 M120 376 H131" strokeWidth="0.6" />
        <path className={b} d="M50 406 H150 V424 H50 Z" />
        <path className={b} d="M86 392 H110 V406 H86 Z" />
        <path className={b} d="M28 424 H172 V448 H28 Z" />
        {wins.map((x, k) => (
          <rect key={k} x={x} y="430" width="5" height="7" strokeWidth="0.55" />
        ))}
        {wins.slice(2, 13).map((x, k) => (
          <rect key={k} x={x + 18} y="410" width="4" height="6" strokeWidth="0.5" />
        ))}
        <path className={b} d="M16 448 L184 448 L170 472 L32 472 Z" />
        <path d="M24 458 H178" strokeWidth="0.55" />
        <path d="M118 448 A23 23 0 0 1 164 448 Z" className={b} />
        <path d="M141 448 V425 M141 448 L125 432 M141 448 L157 432" strokeWidth="0.55" />
        <path d="M30 424 V378 M30 380 L48 386 L30 392" />
        <path d="M30 380 L125 366 M170 424 L131 366" strokeWidth="0.45" />
        <path d="M40 486 q8 -3 16 0 t16 0 M110 492 q8 -3 16 0 t16 0 M60 512 q8 -3 16 0 t16 0 M130 530 q8 -3 16 0 t16 0 M20 548 q8 -3 16 0 t16 0" strokeWidth="0.7" />
        <path d="M60 476 V482 M80 476 V486 M100 476 V480 M120 476 V485 M140 476 V481" strokeWidth="0.5" />
      </g>
      <path className={"ctl-s" + t} d="M24 290 H176" strokeWidth="0.6" />
    </>
  )
}

function MonogramArt({ t, letter }: { t: Tone; letter: string }) {
  const pat = usePat()
  const b = "ctl-b" + t
  const card = "M12 70 H188 Q200 70 200 82 V588 Q200 600 188 600 H12 Q0 600 0 588 V82 Q0 70 12 70 Z"
  const sea = "M0 318 C30 312 56 330 52 364 C48 400 86 420 116 438 C146 456 140 512 168 552 C178 570 200 576 200 590 V600 H0 Z"
  const masts = [
    { x: 40, top: 236 },
    { x: 60, top: 226 },
    { x: 80, top: 242 },
  ]
  return (
    <>
      <path className={b} d={card} />
      <path className={"ctl-f" + t} d={sea} />
      <path d={sea} fill={pat("hz", flip(t))} opacity="0.55" />
      <g className={"ctl-s" + flip(t)} {...LINE} strokeWidth="0.8">
        <path d="M12 400 q8 -4 16 0 t16 0 M30 450 q8 -4 16 0 t16 0 M70 480 q8 -4 16 0 t16 0 M20 520 q8 -4 16 0 t16 0 M90 540 q8 -4 16 0 t16 0 M40 570 q8 -4 16 0 t16 0" />
        <circle cx="50" cy="508" r="14" strokeWidth="0.6" />
        <path d="M50 490 V526 M32 508 H68 M38 496 L62 520 M62 496 L38 520" strokeWidth="0.45" />
      </g>
      <g className={"ctl-s" + t} {...LINE} strokeWidth="0.85">
        {masts.map((m, k) => (
          <g key={k}>
            <line x1={m.x} y1={m.top} x2={m.x} y2="330" />
            {[0, 1, 2].map((j) => {
              const y1 = m.top + 8 + j * 26
              const y2 = y1 + 20
              const w = 13 + j * 2
              return (
                <g key={j}>
                  <path className={b} d={"M" + (m.x - w) + " " + y1 + "Q" + m.x + " " + (y1 - 3) + " " + (m.x + w) + " " + y1 + "L" + (m.x + w - 2) + " " + y2 + "Q" + m.x + " " + (y2 + 4) + " " + (m.x - w + 2) + " " + y2 + "Z"} />
                  <path d={"M" + m.x + " " + y1 + "L" + (m.x + w) + " " + y1 + "L" + (m.x + w - 2) + " " + y2 + "L" + m.x + " " + y2 + "Z"} fill={pat("h1", t)} stroke="none" />
                </g>
              )
            })}
            <path d={"M" + m.x + " " + m.top + "l9 3 -9 3"} />
          </g>
        ))}
        <path d="M12 318 L28 300 M86 310 L106 320" strokeWidth="0.5" />
        <path className={b} d="M14 318 L104 318 L92 336 L26 336 Z" />
        <path d="M14 318 L104 318 L92 336 L26 336 Z" fill={pat("h2", t)} />
        <path d="M30 324 H94" strokeWidth="0.5" />
      </g>
      <text x="100" y="206" textAnchor="middle" className={"ctl-f" + t} stroke={t === "i" ? "var(--ctl-paper)" : "var(--ctl-deep)"} strokeWidth="7" paintOrder="stroke" strokeLinejoin="round" style={{ font: "italic 400 210px var(--ctl-serif)" }}>
        {letter}
      </text>
    </>
  )
}

function TowerArt({ t }: { t: Tone }) {
  const pat = usePat()
  const { uid } = React.useContext(ArtCtx)
  const b = "ctl-b" + t
  const clip = uid + "-twr" + t
  const rows = []
  for (let y = 126; y < 506; y += 15) rows.push(y)
  return (
    <>
      <path className={b} d={CARD + HOLE} fillRule="evenodd" />
      <clipPath id={clip}>
        <path d={CARD} />
      </clipPath>
      <g clipPath={"url(#" + clip + ")"} className={"ctl-s" + t} {...LINE} strokeWidth="0.85">
        <path className={b} d="M26 112 L100 82 V524 H26 Z" />
        <path d="M100 82 L178 112 V524 H100 Z" fill={pat("h1", t)} />
        <path className={b} d="M100 82 L178 112 V524 H100 Z" fillOpacity="0" />
        <path className={b} d="M60 96 L100 56 L140 96" />
        <path d="M100 56 V30 M100 32 L116 36 L100 40" />
        {rows.map((y, k) => (
          <g key={k}>
            {[34, 50, 66, 82].map((x) => (
              <rect key={x} x={x} y={y} width="9" height="9" strokeWidth="0.55" fill={pat("x", t)} />
            ))}
            {[108, 124, 140, 156].map((x) => (
              <rect key={x} className={b} x={x} y={y + 2} width="9" height="9" strokeWidth="0.55" />
            ))}
          </g>
        ))}
        <path d="M22 150 L100 122 L182 150 M22 300 L100 290 L182 300 M22 450 L100 448 L182 452" strokeWidth="1.2" />
        <path d="M0 524 H200 M0 540 H200" />
        <path d="M14 524 V470 M10 470 H18 M14 466 v-3" />
        <g>
          <circle cx="36" cy="538" r="2.2" className={b} />
          <path d="M36 541 V553 M33 553 L36 547 L39 553" strokeWidth="0.7" />
          <circle cx="50" cy="542" r="2.2" className={b} />
          <path d="M50 545 V557 M47 557 L50 551 L53 557" strokeWidth="0.7" />
        </g>
        <path d="M0 560 L200 560" strokeWidth="0.5" />
        <path className={"ctl-f" + t} d="M200 330 V600 H38 Z" stroke="none" />
      </g>
    </>
  )
}

/* --------------------------------------------------------- small vignettes */

function Vignette({ kind }: { kind: number }) {
  const pat = usePat()
  return (
    <svg className="ctl-svg" viewBox="0 0 240 150" width="100%" aria-hidden="true">
      <rect width="240" height="150" className={kind === 1 ? "ctl-bp" : "ctl-bi"} />
      {kind === 0 && (
        <g className="ctl-si" {...LINE}>
          <rect width="240" height="150" fill={pat("hz", "i")} opacity="0.3" stroke="none" />
          <path d="M0 122 C60 112 120 118 240 110 V150 H0 Z" className="ctl-bi" strokeWidth="0.6" />
          <Temple x={120} base={124} w={130} t="i" />
          <Cypress x={36} base={122} h={46} t="i" />
          <Cypress x={204} base={120} h={52} t="i" />
        </g>
      )}
      {kind === 1 && (
        <g>
          {scatterStars(3, 40, 0, 0, 240, 150).map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} className="ctl-fp" />
          ))}
          <circle cx="160" cy="62" r="26" className="ctl-fp" />
          <circle cx="172" cy="56" r="26" className="ctl-bp" />
          <g className="ctl-si" {...LINE} strokeWidth="0.9">
            <path className="ctl-bi" d="M56 150 V90 A44 44 0 0 1 144 90 V150 H130 V92 A30 30 0 0 0 70 92 V150 Z" />
            <path d="M130 92 A30 30 0 0 0 70 92 V150 M56 150 V90" fill={pat("h2", "i")} />
          </g>
        </g>
      )}
      {kind === 2 && (
        <g className="ctl-si" {...LINE}>
          <rect width="240" height="150" fill={pat("d", "i")} opacity="0.25" stroke="none" />
          <g transform="translate(120 140) scale(1.25)">
            <Vase t="i" kind={0} />
          </g>
          <Bloom x={36} y={126} R={16} t="i" />
          <Bloom x={204} y={124} R={14} t="i" rot={1} />
        </g>
      )}
      {kind === 3 && (
        <g className="ctl-si" {...LINE}>
          <rect y="96" width="240" height="54" fill={pat("hz", "i")} stroke="none" />
          <g transform="translate(120 98) scale(1.6)">
            <Boat t="i" />
          </g>
          <Birds list={[[40, 30, 0.8], [62, 22, 0.6], [170, 40, 0.7]]} t="i" />
        </g>
      )}
    </svg>
  )
}

/* ----------------------------------------------------------- toile pieces */

function Satellite({ t }: { t: Tone }) {
  const pat = usePat()
  const b = "ctl-b" + t
  const panel = (sx: number) => {
    const x0 = sx > 0 ? 24 : -96
    const lines = []
    for (let x = x0 + 9; x < x0 + 72; x += 9) lines.push(x)
    return (
      <g>
        <path d={"M" + (sx > 0 ? 18 : -18) + " 0 H" + (sx > 0 ? 24 : -24)} />
        <rect className={b} x={x0} y="-15" width="72" height="30" />
        <rect x={x0} y="-15" width="72" height="30" fill={pat("x", t)} opacity="0.5" />
        {lines.map((x) => (
          <line key={x} x1={x} y1="-15" x2={x} y2="15" strokeWidth="0.6" />
        ))}
        <line x1={x0} y1="0" x2={x0 + 72} y2="0" strokeWidth="0.6" />
      </g>
    )
  }
  return (
    <g className={"ctl-s" + t} {...LINE} strokeWidth="0.9">
      {panel(-1)}
      {panel(1)}
      <rect className={b} x="-18" y="-15" width="36" height="30" />
      <rect x="0" y="-15" width="18" height="30" fill={pat("h2", t)} />
      <path d="M-18 -5 H18 M-18 5 H18" strokeWidth="0.5" />
      <path d="M0 -15 V-26" />
      <path className={b} d="M-15 -26 Q0 -40 15 -26 Z" />
      <path d="M0 -29 L0 -38" />
      <path d="M0 15 V30 M-6 30 H6" />
    </g>
  )
}

function Drone({ t }: { t: Tone }) {
  const b = "ctl-b" + t
  return (
    <g className={"ctl-s" + t} {...LINE} strokeWidth="0.9">
      <path d="M-12 0 L-34 -4 M12 0 L34 -4" strokeWidth="1.6" />
      <path d="M-34 -4 V-8 M34 -4 V-8" />
      <ellipse className={b} cx="-34" cy="-9" rx="17" ry="2.6" />
      <ellipse className={b} cx="34" cy="-9" rx="17" ry="2.6" />
      <rect className={b} x="-13" y="-6" width="26" height="12" rx="4" />
      <circle className={b} cx="0" cy="9" r="4" />
      <path d="M-9 6 L-14 15 M9 6 L14 15 M-17 15 H-11 M11 15 H17" />
    </g>
  )
}

function Pylon({ x, base, h, t }: { x: number; base: number; h: number; t: Tone }) {
  const levels = [0, 0.32, 0.6, 0.8, 1]
  const half = (f: number) => 30 - 23 * f
  const y = (f: number) => base - h * f
  const parts = [] as string[]
  parts.push("M" + (x - 30) + " " + base + "L" + (x - 7) + " " + y(1) + "M" + (x + 30) + " " + base + "L" + (x + 7) + " " + y(1))
  for (let i = 0; i < levels.length - 1; i++) {
    const a = levels[i]
    const c = levels[i + 1]
    parts.push("M" + r1(x - half(a)) + " " + r1(y(a)) + "L" + r1(x + half(c)) + " " + r1(y(c)) + "M" + r1(x + half(a)) + " " + r1(y(a)) + "L" + r1(x - half(c)) + " " + r1(y(c)))
    parts.push("M" + r1(x - half(c)) + " " + r1(y(c)) + "H" + r1(x + half(c)))
  }
  for (const f of [0.6, 0.8]) {
    const arm = 46 - f * 12
    parts.push("M" + r1(x - half(f) - arm) + " " + r1(y(f)) + "H" + r1(x + half(f) + arm) + "M" + r1(x - half(f) - arm) + " " + r1(y(f)) + "L" + r1(x - half(f)) + " " + r1(y(f) - 9) + "M" + r1(x + half(f) + arm) + " " + r1(y(f)) + "L" + r1(x + half(f)) + " " + r1(y(f) - 9))
    parts.push("M" + r1(x - half(f) - arm + 2) + " " + r1(y(f)) + "v9M" + r1(x + half(f) + arm - 2) + " " + r1(y(f)) + "v9")
  }
  parts.push("M" + (x - 7) + " " + y(1) + "L" + x + " " + (y(1) - 16) + "L" + (x + 7) + " " + y(1))
  return <path className={"ctl-s" + t} {...LINE} strokeWidth="0.85" d={parts.join("")} />
}

function pylonTips(x: number, base: number, h: number): number[][] {
  const out = []
  for (const f of [0.6, 0.8]) {
    const half = 30 - 23 * f
    const arm = 46 - f * 12
    const yy = base - h * f + 9
    out.push([x - half - arm + 2, yy], [x + half + arm - 2, yy])
  }
  return out
}

/* --------------------------------------------------------- landscape pieces */

function Vase({ t, kind }: { t: Tone; kind: number }) {
  const pat = usePat()
  const { uid } = React.useContext(ArtCtx)
  const b = "ctl-b" + t
  const clip = uid + "-vase" + kind + t
  const body =
    kind === 0
      ? "M-26 0 C-34 -6 -40 -30 -36 -52 C-33 -66 -22 -72 -14 -74 L14 -74 C22 -72 33 -66 36 -52 C40 -30 34 -6 26 0 Z"
      : "M-16 0 C-14 -6 -30 -18 -30 -44 C-30 -62 -14 -72 -10 -84 C-8 -90 -12 -96 -14 -100 L14 -100 C12 -96 8 -90 10 -84 C14 -72 30 -62 30 -44 C30 -18 14 -6 16 0 Z"
  return (
    <g className={"ctl-s" + t} {...LINE} strokeWidth="0.9">
      <clipPath id={clip}>
        <path d={body} />
      </clipPath>
      <path className={b} d={body} />
      <g clipPath={"url(#" + clip + ")"}>
        <path d="M14 -110 C34 -80 36 -30 20 4 L50 4 L50 -110 Z" fill={pat("h2", t)} stroke="none" />
        {kind === 0 ? (
          <>
            <path d="M-40 -62 H40 M-40 -58 H40 M-40 -12 H40 M-40 -8 H40" strokeWidth="0.6" />
            <path d="M-40 -62 H40 V-58 H-40 Z M-40 -12 H40 V-8 H-40 Z" fill={pat("x", t)} stroke="none" />
          </>
        ) : (
          <path d="M-30 -74 H30 M-30 -70 H30 M-30 -14 H30" strokeWidth="0.6" />
        )}
      </g>
      <Bloom x={0} y={kind === 0 ? -36 : -44} R={kind === 0 ? 13 : 11} t={t} />
      <path d={kind === 0 ? "M-22 -36 C-26 -46 -18 -52 -12 -48 M22 -36 C26 -46 18 -52 12 -48 M-20 -26 C-14 -18 -6 -20 -4 -24 M20 -26 C14 -18 6 -20 4 -24" : "M-20 -44 C-22 -56 -14 -60 -8 -56 M20 -44 C22 -56 14 -60 8 -56 M-16 -30 C-10 -24 -4 -26 -2 -30 M16 -30 C10 -24 4 -26 2 -30"} strokeWidth="0.7" />
      {kind === 0 ? (
        <>
          <path className={b} d="M-14 -74 H14 V-80 H-14 Z" />
          <path className={b} d="M-17 -80 C-16 -94 16 -94 17 -80 Z" />
          <path d="M-12 -84 H12" strokeWidth="0.5" strokeDasharray="1.4 1.8" />
          <circle className={b} cx="0" cy="-95" r="4" />
        </>
      ) : (
        <path className={b} d="M-17 -100 H17 V-105 H-17 Z" />
      )}
    </g>
  )
}

function Boat({ t }: { t: Tone }) {
  const pat = usePat()
  const b = "ctl-b" + t
  return (
    <g className={"ctl-s" + t} {...LINE} strokeWidth="0.9">
      <path d="M-40 6 q6 -2 12 0 t12 0 M10 7 q6 -2 12 0 t12 0" strokeWidth="0.6" />
      <path d="M4 10 L30 -44" strokeWidth="1.1" />
      <path className={b} d="M-18 -1 C-18 -11 -4 -11 -4 -1 Z" />
      <path className={b} d="M-17 -10 L-11 -16 L-5 -10 Z" />
      <path className={b} d="M13 -2 L13 -21 C14 -24 19 -24 20 -21 L20 -2 Z" />
      <path d="M16 -17 L24 -28 M17 -12 L8 -20" />
      <path className={b} d="M9 -25 L16.5 -32 L24 -25 Z" />
      <path className={b} d="M-36 -2 C-22 9 22 9 36 -2 C24 2 -24 2 -36 -2 Z" />
      <path d="M-34 -1 C-20 7 20 7 34 -1 L30 4 C18 8 -18 8 -30 4 Z" fill={pat("h2", t)} stroke="none" />
    </g>
  )
}

function Pavilion({ x, base, t }: { x: number; base: number; t: Tone }) {
  const pat = usePat()
  const b = "ctl-b" + t
  const X = (dx: number) => r1(x + dx)
  const Y = (dy: number) => r1(base + dy)
  const T = (dx: number, dy: number) => X(dx) + " " + Y(dy)
  const box = (x0: number, y0: number, x1: number, y1: number) => "M" + T(x0, y0) + "H" + X(x1) + "V" + Y(y1) + "H" + X(x0) + "Z"
  const roof = (w: number, h: number, y0: number, lift: number) =>
    "M" + T(-w, y0) + "C" + T(-w * 0.6, y0 - 4) + " " + T(-w * 0.4, y0 - h * 0.55) + " " + T(-w * 0.29, y0 - h) + "L" + T(w * 0.29, y0 - h) + "C" + T(w * 0.4, y0 - h * 0.55) + " " + T(w * 0.6, y0 - 4) + " " + T(w, y0) + "C" + T(w * 0.85, y0 + lift) + " " + T(-w * 0.85, y0 + lift) + " " + T(-w, y0) + "Z"
  return (
    <g className={"ctl-s" + t} {...LINE} strokeWidth="0.9">
      <path className={b} d={"M" + T(-100, 0) + "L" + T(100, 0) + "L" + T(86, 12) + "L" + T(-86, 12) + "Z"} />
      <path d={"M" + T(-100, 0) + "L" + T(100, 0) + "L" + T(86, 12) + "L" + T(-86, 12) + "Z"} fill={pat("d", t)} stroke="none" />
      <path d={"M" + T(-24, 12) + "V" + Y(30) + "M" + T(24, 12) + "V" + Y(30) + "M" + T(-24, 18) + "H" + X(24) + "M" + T(-24, 24) + "H" + X(24)} strokeWidth="0.6" />
      <rect x={x - 66} y={base - 54} width="132" height="54" fill={pat("x", t)} stroke="none" />
      {[-68, -34, 34, 68].map((dx) => (
        <g key={dx}>
          <rect className={b} x={x + dx - 3.5} y={base - 54} width="7" height="54" />
          <rect x={x + dx} y={base - 54} width="3.5" height="54" fill={pat("h2", t)} stroke="none" />
        </g>
      ))}
      <path className={b} d={box(-74, -14, 74, -8)} />
      <path d={[-60, -40, -20, 0, 20, 40, 60].map((dx) => "M" + T(dx, -14) + "V" + Y(-8)).join("")} strokeWidth="0.5" />
      <path className={b} d={roof(104, 28, -52, 5)} />
      <path d={"M" + T(-60, -50) + "H" + X(60) + "L" + T(84, -50) + "C" + T(70, -46) + " " + T(-70, -46) + " " + T(-84, -50) + "Z"} fill={pat("h2", t)} stroke="none" />
      <path d={"M" + T(-94, -52) + "C" + T(-60, -55) + " " + T(-42, -64) + " " + T(-32, -76) + "M" + T(94, -52) + "C" + T(60, -55) + " " + T(42, -64) + " " + T(32, -76)} strokeWidth="0.55" />
      <path className={b} d={box(-24, -94, 24, -80)} />
      <path d={box(-18, -92, 18, -82)} fill={pat("x", t)} strokeWidth="0.5" />
      <path className={b} d={roof(52, 26, -92, 4)} />
      <path d={"M" + T(-44, -92) + "C" + T(-24, -95) + " " + T(-14, -104) + " " + T(-9, -114) + "M" + T(44, -92) + "C" + T(24, -95) + " " + T(14, -104) + " " + T(9, -114)} strokeWidth="0.5" />
      <circle className={b} cx={x} cy={base - 122} r="3.5" />
      <path d={"M" + T(0, -125.5) + "V" + Y(-138)} />
    </g>
  )
}

function House({ x0, x1, base, t }: { x0: number; x1: number; base: number; t: Tone }) {
  const pat = usePat()
  const b = "ctl-b" + t
  const w = x1 - x0
  const roof = "M" + (x0 - 16) + " " + (base - 46) + "C" + (x0 + 8) + " " + (base - 50) + " " + (x0 + 18) + " " + (base - 62) + " " + (x0 + 30) + " " + (base - 76) + "L" + (x1 - 30) + " " + (base - 76) + "C" + (x1 - 18) + " " + (base - 62) + " " + (x1 - 8) + " " + (base - 50) + " " + (x1 + 16) + " " + (base - 46) + "C" + (x1 - 4) + " " + (base - 42) + " " + (x0 + 4) + " " + (base - 42) + " " + (x0 - 16) + " " + (base - 46) + "Z"
  return (
    <g className={"ctl-s" + t} {...LINE} strokeWidth="0.9">
      <rect className={b} x={x0} y={base - 46} width={w} height="46" />
      <rect x={x1 - 22} y={base - 46} width="22" height="46" fill={pat("h2", t)} />
      <rect className={b} x={x0 + w * 0.42} y={base - 30} width="16" height="30" />
      <rect x={x0 + 12} y={base - 34} width="22" height="18" fill={pat("x", t)} />
      <rect x={x1 - 54} y={base - 34} width="22" height="18" fill={pat("x", t)} />
      <path className={b} d={roof} />
      <path d={roof} fill={pat("v", t)} strokeWidth="0.6" />
      <path d={"M" + (x0 + 26) + " " + (base - 78) + "H" + (x1 - 26)} strokeWidth="2.2" />
      <path d={"M" + (x0 + 26) + " " + (base - 78) + "q-6 -4 -10 -10 M" + (x1 - 26) + " " + (base - 78) + "q6 -4 10 -10"} />
    </g>
  )
}

/* ------------------------------------------------------------------ icons */

function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, className: "ctl-svg" }
  switch (name) {
    case "arrow":
      return (
        <svg {...p}>
          <path d="M4 12h16M14 6l6 6-6 6" />
        </svg>
      )
    case "ne":
      return (
        <svg {...p} strokeWidth={1.3}>
          <path d="M6 18 18 6M8 6h10v10" />
        </svg>
      )
    case "plus":
      return (
        <svg {...p}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      )
    case "menu":
      return (
        <svg {...p}>
          <path d="M4 8h16M4 16h16" />
        </svg>
      )
    case "close":
      return (
        <svg {...p}>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      )
    case "mail":
      return (
        <svg {...p} fill="currentColor" stroke="none">
          <path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm9 7.2L4.4 7H19.6L12 12.2Z" fillRule="evenodd" />
        </svg>
      )
    case "phone":
      return (
        <svg {...p} fill="currentColor" stroke="none">
          <path d="M6.6 10.8a15.2 15.2 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1L6.6 10.8Z" />
        </svg>
      )
    case "pin":
      return (
        <svg {...p} fill="currentColor" stroke="none">
          <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
        </svg>
      )
    case "x":
      return (
        <svg {...p}>
          <path d="M4 4l16 16M20 4 4 20" strokeWidth={1.4} />
        </svg>
      )
    case "instagram":
      return (
        <svg {...p}>
          <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.3" cy="6.7" r=".6" fill="currentColor" />
        </svg>
      )
    case "linkedin":
      return (
        <svg {...p}>
          <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" />
          <path d="M8 10.5V16M8 7.6v.1M11.6 16v-5.5M11.6 13c0-1.6 1-2.6 2.3-2.6s2.1.9 2.1 2.6V16" />
        </svg>
      )
    case "facebook":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M13.2 20.4V12.6h2.3l.3-2.6h-2.6V8.6c0-.8.3-1.3 1.3-1.3h1.4V5.1" />
          <path d="M10.6 12.6h2.6" />
        </svg>
      )
    default:
      return null
  }
}

function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg className="ctl-svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M2 2.5h2.4v19H2z" />
      <path d="M5.8 2.8h16l-3.6 4.6H5.8z" />
      <path d="M5.8 9.7h16l-3.6 4.6H5.8z" />
      <path d="M5.8 16.6h16l-3.6 4.6H5.8z" />
    </svg>
  )
}

function Emphasis({ text }: { text: string }) {
  return (
    <>
      {parseEmphasis(text).map((s, i) => (s.em ? <em key={i}>{s.text}</em> : <React.Fragment key={i}>{s.text}</React.Fragment>))}
    </>
  )
}

/* ------------------------------------------------------------- sections */

type Go = (href: string, e?: React.MouseEvent) => void

const useIsoLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect

function Hero({ copy, intro, reduced, go, mark }: { copy: typeof DEFAULT_HERO; intro: boolean; reduced: boolean; go: Go; mark: React.ReactNode }) {
  const stage = React.useRef(null as HTMLDivElement | null)
  const [phases, setPhases] = React.useState([0, 0])
  const lines = copy.title.split("\n")

  React.useEffect(() => {
    const el = stage.current
    if (!el || reduced || !window.matchMedia("(pointer: fine)").matches) return
    let tx = 0
    let ty = 0
    let x = 0
    let y = 0
    let raf = 0
    const tick = () => {
      x += (tx - x) * 0.07
      y += (ty - y) * 0.07
      el.style.setProperty("--mx", x.toFixed(4))
      el.style.setProperty("--my", y.toFixed(4))
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.0008 ? requestAnimationFrame(tick) : 0
    }
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick)
    }
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      tx = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1)
      ty = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1)
      kick()
    }
    const leave = () => {
      tx = 0
      ty = 0
      kick()
    }
    el.addEventListener("pointermove", move)
    el.addEventListener("pointerleave", leave)
    return () => {
      el.removeEventListener("pointermove", move)
      el.removeEventListener("pointerleave", leave)
      cancelAnimationFrame(raf)
      el.style.removeProperty("--mx")
      el.style.removeProperty("--my")
    }
  }, [reduced])

  const cycle = (k: number) => setPhases((p) => p.map((v, i) => (i === k ? (v + 1) % MOON_STEPS.length : v)))
  const delay = (s: number) => ({ animationDelay: s + "s" })

  return (
    <section className="ctl-hero" aria-label="Introduction">
      <div ref={stage} className={"ctl-stage" + (intro && !reduced ? " ctl-intro" : "")}>
        <div className="ctl-cover">
          <HeroSky />
          <svg className="ctl-svg ctl-layer" viewBox="0 0 1200 720" preserveAspectRatio="none" style={shift(0.25)}>
            <Moon x={262} y={128} r={30} side={1} phase={phases[0]} onCycle={() => cycle(0)} />
            <Moon x={938} y={128} r={30} side={-1} phase={phases[1]} onCycle={() => cycle(1)} />
          </svg>
          <div className="ctl-layer ctl-settle" style={{ ...shift(0.45), ...delay(0) }}>
            <HeroBack />
          </div>
          <div className="ctl-layer ctl-settle" style={{ ...shift(0.7), ...delay(0.05) }}>
            <HeroArch />
          </div>
          <div className="ctl-layer ctl-settle" style={{ ...shift(1.05), ...delay(0.1) }}>
            <HeroFigures />
          </div>
          <div className="ctl-layer ctl-settle" style={{ ...shift(1.5), ...delay(0.15) }}>
            <HeroFront />
          </div>
          <div className="ctl-copy" style={shift(0.7)}>
            <span className="ctl-rise" style={delay(1.1)}>
              {mark}
            </span>
            <h1 className="ctl-h1">
              {lines.map((l, i) => (
                <span key={i} className="ctl-rise" style={delay(1.25 + i * 0.12)}>
                  {l}
                </span>
              ))}
            </h1>
            {copy.subtitle && (
              <p className="ctl-sub ctl-rise" style={delay(1.55)}>
                {copy.subtitle}
              </p>
            )}
            {copy.action && (
              <a className="ctl-btn ctl-rise" style={delay(1.7)} href={copy.action.href} onClick={(e) => go(copy.action.href, e)}>
                <span>{copy.action.label}</span>
              </a>
            )}
          </div>
        </div>
        <div className="ctl-shoot" aria-hidden="true" />
        <div className="ctl-frame" aria-hidden="true" />
        {copy.est && (
          <span className="ctl-corner" style={{ left: 30, top: 30 }}>
            {copy.est}
          </span>
        )}
        {copy.edition && (
          <span className="ctl-corner" style={{ right: 30, top: 30 }}>
            {copy.edition}
          </span>
        )}
        <div className="ctl-veil" aria-hidden="true" />
      </div>
    </section>
  )
}

function Ticker({ clients, label, reduced }: { clients: string[]; label: string; reduced: boolean }) {
  if (!clients.length) return null
  const star = (
    <svg className="ctl-svg" width="12" height="12" viewBox="-6 -6 12 12" aria-hidden="true">
      <path d={sparklePath(0, 0, 6)} fill="currentColor" />
    </svg>
  )
  const run = (k: number) => (
    <div className="ctl-tick" key={k} aria-hidden={k > 0 ? true : undefined}>
      {clients.map((c, i) => (
        <React.Fragment key={i}>
          <span>{c}</span>
          {star}
        </React.Fragment>
      ))}
    </div>
  )
  return (
    <div className={"ctl-wrap" + (reduced ? " ctl-still" : "")}>
      <div className="ctl-ticker">
        <span className="ctl-ticklabel">{label}</span>
        <div className="ctl-tickview">
          <div className="ctl-track">{reduced ? run(0) : [run(0), run(1)]}</div>
        </div>
      </div>
    </div>
  )
}

function Counter({ value, suffix, reduced }: { value: number; suffix?: string; reduced: boolean }) {
  const ref = React.useRef(null as HTMLSpanElement | null)
  const [shown, setShown] = React.useState(value)
  useIsoLayoutEffect(() => {
    const el = ref.current
    if (!el || reduced || typeof IntersectionObserver === "undefined") {
      setShown(value)
      return
    }
    setShown(0)
    let raf = 0
    const io = new IntersectionObserver(
      (es) => {
        if (!es[0] || !es[0].isIntersecting) return
        io.disconnect()
        const t0 = performance.now()
        const step = (now: number) => {
          const k = clamp((now - t0) / 1700, 0, 1)
          setShown(value * easeOutCubic(k))
          if (k < 1) raf = requestAnimationFrame(step)
        }
        raf = requestAnimationFrame(step)
      },
      { rootMargin: "0px 0px -8% 0px" }
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [value, reduced])
  return (
    <span ref={ref} className="ctl-statv">
      <span aria-hidden="true">
        {formatCount(shown)}
        {suffix}
      </span>
      <span className="ctl-sr">
        {formatCount(value)}
        {suffix}
      </span>
    </span>
  )
}

function Seal({ text, reduced }: { text: string; reduced: boolean }) {
  const { uid } = React.useContext(ArtCtx)
  const ref = React.useRef(null as SVGSVGElement | null)
  React.useEffect(() => {
    const el = ref.current
    if (!el || reduced) return
    let raf = 0
    const on = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        el.style.transform = "rotate(" + (window.scrollY * 0.07).toFixed(2) + "deg)"
      })
    }
    on()
    window.addEventListener("scroll", on, { passive: true })
    return () => {
      window.removeEventListener("scroll", on)
      cancelAnimationFrame(raf)
    }
  }, [reduced])
  const id = uid + "-seal"
  const ring = text.repeat(Math.max(1, Math.round(56 / Math.max(1, text.length))))
  return (
    <svg ref={ref} className="ctl-svg ctl-seal" viewBox="0 0 200 200" aria-hidden="true">
      <path id={id} d="M100 100 m-78 0 a78 78 0 1 1 156 0 a78 78 0 1 1 -156 0" fill="none" />
      <circle cx="100" cy="100" r="96" fill="none" stroke="currentColor" strokeWidth="0.8" />
      <circle cx="100" cy="100" r="92" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 3" />
      <circle cx="100" cy="100" r="62" fill="none" stroke="currentColor" strokeWidth="0.8" />
      <text fill="currentColor" style={{ font: "600 11.5px var(--ctl-sans)", letterSpacing: "0.2em", textTransform: "uppercase" }}>
        <textPath href={"#" + id} textLength="482" lengthAdjust="spacing">
          {ring}
        </textPath>
      </text>
      <g transform="translate(100 100)">
        <path d={sparklePath(0, 0, 30)} fill="currentColor" />
        <circle r="44" fill="none" stroke="currentColor" strokeWidth="0.5" />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => (
          <path key={k} d={sparklePath(Math.cos((k * Math.PI) / 4) * 50, Math.sin((k * Math.PI) / 4) * 50, 3)} fill="currentColor" />
        ))}
      </g>
    </svg>
  )
}

function About({ copy, reduced, id }: { copy: typeof DEFAULT_ABOUT; reduced: boolean; id: string }) {
  return (
    <section className="ctl-sec" data-sec="about" id={id} aria-labelledby={id + "-h"}>
      <div className="ctl-wrap">
        <div className="ctl-about">
          <div data-rv="">
            <span className="ctl-kicker" id={id + "-h"}>
              {copy.kicker}
            </span>
            <p className="ctl-statement">
              <Emphasis text={copy.statement} />
            </p>
          </div>
          <div className="ctl-aside" data-rv="">
            <Seal text={copy.seal} reduced={reduced} />
            <p className="ctl-lede">{copy.body}</p>
          </div>
        </div>
        {copy.stats.length > 0 && (
          <dl className="ctl-stats" data-rv="">
            {copy.stats.map((s, i) => (
              <div className="ctl-stat" key={i}>
                <dd>
                  <Counter value={s.value} suffix={s.suffix} reduced={reduced} />
                </dd>
                <dt className="ctl-statl">{s.label}</dt>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  )
}

function BookmarkArtFor({ art, t, brand, letter }: { art: BookmarkArt; t: Tone; brand: string; letter: string }) {
  if (art === "typewriter") return <TypewriterArt t={t} label={brand} />
  if (art === "steamer") return <SteamerArt t={t} />
  if (art === "monogram") return <MonogramArt t={t} letter={letter} />
  return <TowerArt t={t} />
}

function Solutions({ copy, items, brand, letter, id, go }: { copy: typeof DEFAULT_SOLUTIONS_COPY; items: ToileSolution[]; brand: string; letter: string; id: string; go: Go }) {
  const [sel, setSel] = React.useState(0)
  const tabs = React.useRef([] as (HTMLButtonElement | null)[])
  const cur = items[Math.min(sel, items.length - 1)]
  const offsets = [
    [0, -2.2],
    [44, 1.6],
    [-6, -1],
    [30, 2.4],
  ]
  if (!cur) return null
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const n = nextTab(i, e.key, items.length)
    if (n === null) return
    e.preventDefault()
    setSel(n)
    tabs.current[n]?.focus()
  }
  return (
    <section className="ctl-sec ctl-sol" data-sec="solutions" id={id} aria-labelledby={id + "-h"}>
      <div className="ctl-wrap">
        <div className="ctl-sechead" data-rv="">
          <div>
            <span className="ctl-kicker">{copy.kicker}</span>
            <h2 className="ctl-h2" id={id + "-h"}>
              <Emphasis text={copy.title} />
            </h2>
          </div>
          <p className="ctl-lede">{copy.intro}</p>
        </div>
        <div className="ctl-solgrid">
          <div className="ctl-panel" role="tabpanel" id={id + "-panel"} aria-labelledby={id + "-tab" + sel}>
            <div className="ctl-panelin" key={sel}>
              <span className="ctl-panelnum">
                {toRoman(sel + 1)}. {cur.kicker}
              </span>
              <h3>{cur.title}</h3>
              <p>{cur.body}</p>
              {cur.points && cur.points.length > 0 && (
                <ul className="ctl-points">
                  {cur.points.map((p, i) => (
                    <li key={i}>
                      <svg className="ctl-svg" width="10" height="10" viewBox="-5 -5 10 10" aria-hidden="true">
                        <path d={sparklePath(0, 0, 5)} fill="currentColor" />
                      </svg>
                      {p}
                    </li>
                  ))}
                </ul>
              )}
              <a className="ctl-btn ctl-btn-paper" href={cur.action?.href ?? "#contact"} onClick={(e) => go(cur.action?.href ?? "#contact", e)}>
                <span>{cur.action?.label ?? "Discuss this practice"}</span>
                <Icon name="arrow" />
              </a>
            </div>
          </div>
          <div className="ctl-marks" role="tablist" aria-label={copy.kicker + " bookmarks"}>
            {items.map((s, i) => {
              const art = s.art ?? ARTS[i % ARTS.length]
              const t: Tone = (s.tone ?? (i % 2 ? "ink" : "paper")) === "ink" ? "p" : "i"
              const lay = MARK_LAYOUT[art]
              const off = offsets[i % offsets.length]
              const color = (lay.color === "line") === (t === "i") ? "var(--ctl-ink)" : "var(--ctl-ondeep)"
              const textColor = t === "p" && lay.color === "line" ? "var(--ctl-ondeep)" : t === "i" && lay.color === "bg" ? "var(--ctl-ondeep)" : color
              return (
                <div className="ctl-markcol" key={i}>
                  <button
                    ref={(el) => {
                      tabs.current[i] = el
                    }}
                    type="button"
                    role="tab"
                    id={id + "-tab" + i}
                    aria-selected={sel === i}
                    aria-controls={id + "-panel"}
                    tabIndex={sel === i ? 0 : -1}
                    className="ctl-mark"
                    style={{ ["--y" as string]: off[0] + "px", ["--r" as string]: off[1] + "deg" } as React.CSSProperties}
                    onClick={() => setSel(i)}
                    onKeyDown={(e) => onKey(e, i)}
                  >
                    <svg className="ctl-svg" viewBox="0 0 200 600" aria-hidden="true">
                      <BookmarkArtFor art={art} t={t} brand={brand} letter={letter} />
                    </svg>
                    <span
                      className="ctl-quote"
                      data-v={lay.v}
                      aria-hidden="true"
                      style={{ left: (lay.x / 2) + "%", top: (lay.y / 6) + "%", width: (lay.w / 2) + "%", height: (lay.h / 6) + "%", fontSize: lay.size + "cqw", color: textColor, textAlign: lay.align ?? "center", justifyContent: lay.align === "right" ? "flex-end" : lay.align === "left" ? "flex-start" : "center" }}
                    >
                      «{s.quote}»
                    </span>
                    <span className="ctl-sr">{s.title}</span>
                  </button>
                  <span className="ctl-marklabel" data-on={sel === i} aria-hidden="true">
                    {toRoman(i + 1)} · {s.kicker ?? s.title}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

function Services({ copy, items, id }: { copy: typeof DEFAULT_SERVICES_COPY; items: ToileService[]; id: string }) {
  const [open, setOpen] = React.useState(0 as number | null)
  return (
    <section className="ctl-sec" data-sec="services" id={id} aria-labelledby={id + "-h"}>
      <div className="ctl-wrap">
        <div className="ctl-sechead" data-rv="">
          <div>
            <span className="ctl-kicker">{copy.kicker}</span>
            <h2 className="ctl-h2" id={id + "-h"}>
              <Emphasis text={copy.title} />
            </h2>
          </div>
          <p className="ctl-lede">{copy.intro}</p>
        </div>
        <ul className="ctl-ledger" data-rv="">
          {items.map((s, i) => {
            const on = open === i
            return (
              <li key={i} className="ctl-row" data-open={on}>
                <h3>
                  <button type="button" className="ctl-rowbtn" aria-expanded={on} aria-controls={id + "-row" + i} onClick={() => setOpen(on ? null : i)}>
                    <span className="ctl-num">{toRoman(i + 1)}.</span>
                    <span className="ctl-rowt">{s.title}</span>
                    <span className="ctl-rows">{s.summary}</span>
                    <span className="ctl-plus" aria-hidden="true">
                      <Icon name="plus" />
                    </span>
                  </button>
                </h3>
                <div className="ctl-fold" id={id + "-row" + i} role="region" aria-label={s.title}>
                  <div>
                    <div className="ctl-foldin">
                      <span className="ctl-gap" />
                      <div>
                        <p>{s.details ?? s.summary}</p>
                        {s.duration && <div className="ctl-dur">Typical length · {s.duration}</div>}
                      </div>
                      {s.deliverables && s.deliverables.length > 0 ? (
                        <ul className="ctl-dl" aria-label="Deliverables">
                          {s.deliverables.map((d, k) => (
                            <li key={k}>{d}</li>
                          ))}
                        </ul>
                      ) : (
                        <span />
                      )}
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

function Insights({ copy, items, id, reduced }: { copy: typeof DEFAULT_PRESS_COPY; items: ToilePress[]; id: string; reduced: boolean }) {
  const [cat, setCat] = React.useState(null as string | null)
  const [all, setAll] = React.useState(false)
  const [hov, setHov] = React.useState(null as number | null)
  const prev = React.useRef(null as HTMLElement | null)
  const cats = categoriesOf(items)
  const list = filterPress(items, cat)
  const shown = all ? list : list.slice(0, 5)
  const fine = React.useRef(false)
  React.useEffect(() => {
    fine.current = window.matchMedia("(pointer: fine)").matches && !reduced
  }, [reduced])
  const place = (e: React.PointerEvent) => {
    const el = prev.current
    if (!el || !fine.current) return
    const x = Math.min(e.clientX + 24, window.innerWidth - 250)
    el.style.transform = "translate3d(" + x + "px," + (e.clientY - 80) + "px,0)"
  }
  const cur = hov === null ? null : shown[hov]
  return (
    <section className="ctl-sec" data-sec="insights" id={id} aria-labelledby={id + "-h"} style={{ paddingBottom: 0 }}>
      <div className="ctl-wrap">
        <div className="ctl-presshead" data-rv="">
          <div>
            <span className="ctl-kicker">{copy.kicker}</span>
            <h2 className="ctl-pressh" id={id + "-h"}>
              {copy.title}
              <Icon name="ne" />
            </h2>
          </div>
          {cats.length > 1 && (
            <div className="ctl-chips" role="group" aria-label="Filter press">
              <button type="button" className="ctl-chip" aria-pressed={cat === null} onClick={() => setCat(null)}>
                All<sup>{items.length}</sup>
              </button>
              {cats.map((c) => (
                <button key={c} type="button" className="ctl-chip" aria-pressed={cat === c} onClick={() => setCat(cat === c ? null : c)}>
                  {c}
                  <sup>{items.filter((p) => p.category === c).length}</sup>
                </button>
              ))}
            </div>
          )}
        </div>
        <ul className="ctl-press" onPointerMove={place} onPointerLeave={() => setHov(null)} data-rv="">
          {shown.map((p, i) => {
            const wm = wordmark(p.source)
            const inner = (
              <>
                <span className="ctl-prlogo" aria-hidden="true">
                  {wm.mono ? (
                    <span className="ctl-mono">{wm.mono}</span>
                  ) : (
                    <span className="ctl-wm">
                      <b>{wm.top}</b>
                      <small>{wm.bottom}</small>
                    </span>
                  )}
                </span>
                <span>
                  <span className="ctl-prt">{p.title}</span>
                  <span className="ctl-prm">
                    <span>{p.source}</span>
                    <i aria-hidden="true" />
                    <span>{p.date}</span>
                  </span>
                </span>
                <span className="ctl-prarrow" aria-hidden="true">
                  <Icon name="ne" size={26} />
                </span>
              </>
            )
            return (
              <li key={(cat ?? "all") + p.title}>
                <a
                  className="ctl-pr"
                  style={{ animationDelay: i * 0.05 + "s" }}
                  href={p.href ?? "#"}
                  target={p.href && /^https?:/.test(p.href) ? "_blank" : undefined}
                  rel={p.href && /^https?:/.test(p.href) ? "noreferrer" : undefined}
                  onClick={(e) => {
                    if (!p.href) e.preventDefault()
                  }}
                  onPointerEnter={(e) => {
                    place(e)
                    setHov(i)
                  }}
                  onFocus={() => setHov(null)}
                >
                  {inner}
                </a>
              </li>
            )
          })}
        </ul>
        {list.length > 5 && (
          <div className="ctl-more">
            <button type="button" className="ctl-btn ctl-btn-ghost" onClick={() => setAll((v) => !v)} aria-expanded={all}>
              <span>{all ? "Show fewer" : "Show all " + list.length}</span>
            </button>
          </div>
        )}
      </div>
      <figure ref={prev} className="ctl-preview" data-on={cur !== null && fine.current} aria-hidden="true">
        <Vignette kind={cur ? hashString(cur.title) % 4 : 0} />
        <figcaption>
          <span>{cur?.source ?? ""}</span>
          <span>{cur?.category ?? ""}</span>
        </figcaption>
      </figure>
    </section>
  )
}

const TOILE_HOTS = [
  { x: 21.4, y: 52, d: 0.4 },
  { x: 46.4, y: 52, d: 1 },
  { x: 54.6, y: 24, d: -1.6 },
  { x: 82.4, y: 44, d: 0.4 },
]

function Toile({ notes, reduced, id }: { notes: ToileNote[]; reduced: boolean; id: string }) {
  const pat = usePat()
  const cover = React.useRef(null as HTMLDivElement | null)
  const [open, setOpen] = React.useState(null as number | null)
  const tipsA = pylonTips(1150, 438, 232)
  const tipsB = pylonTips(1330, 428, 196)
  const wires = [] as string[]
  tipsA.forEach((a, k) => {
    const b = tipsB[k]
    wires.push("M" + r1(a[0]) + " " + r1(a[1]) + "Q" + r1((a[0] + b[0]) / 2) + " " + r1(Math.max(a[1], b[1]) + 24) + " " + r1(b[0]) + " " + r1(b[1]))
    wires.push("M" + r1(a[0]) + " " + r1(a[1]) + "Q" + r1(a[0] - 50) + " " + r1(a[1] + 18) + " " + r1(a[0] - 96) + " " + r1(a[1] + 12))
    wires.push("M" + r1(b[0]) + " " + r1(b[1]) + "Q" + r1(b[0] + 50) + " " + r1(b[1] + 20) + " " + r1(b[0] + 110) + " " + r1(b[1] + 12))
  })

  React.useEffect(() => {
    const el = cover.current
    if (!el || reduced) return
    let raf = 0
    const on = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const r = el.getBoundingClientRect()
        const p = clamp((r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight, -1, 1)
        el.style.setProperty("--tp", p.toFixed(4))
      })
    }
    on()
    window.addEventListener("scroll", on, { passive: true })
    window.addEventListener("resize", on)
    return () => {
      window.removeEventListener("scroll", on)
      window.removeEventListener("resize", on)
      cancelAnimationFrame(raf)
    }
  }, [reduced])

  React.useEffect(() => {
    if (open === null) return
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null)
    }
    const down = (e: PointerEvent) => {
      const el = cover.current
      if (el && !el.contains(e.target as Node)) setOpen(null)
    }
    window.addEventListener("keydown", key)
    window.addEventListener("pointerdown", down)
    return () => {
      window.removeEventListener("keydown", key)
      window.removeEventListener("pointerdown", down)
    }
  }, [open])

  const move = (px: number) => ({ transform: "translate3d(calc(var(--tp, 0) * " + px + "px), 0, 0)" })
  const back: BushSpec[] = [
    [81, 70, 350, 110, 140, 230, 22],
    [82, 470, 424, 64, 46, 84, 16],
    [83, 1046, 372, 84, 96, 160, 19],
    [84, 820, 452, 60, 30, 64, 15],
  ]
  return (
    <div className="ctl-toile" aria-label="Engraved band: a temple, Justice, a satellite and power lines" role="img">
      <div ref={cover} className="ctl-tcover">
        <svg className="ctl-svg ctl-layer" viewBox="0 0 1400 560" preserveAspectRatio="none" aria-hidden="true" style={move(-10)}>
          <g className="ctl-si" {...LINE}>
            <Birds list={[[980, 110, 1], [1012, 92, 0.8], [1040, 120, 0.7], [340, 90, 0.8], [366, 104, 0.6]]} t="i" />
            <path d="M-20 466 C120 450 260 438 400 446 C520 453 600 468 700 464 C820 458 900 438 1040 430 C1180 422 1290 426 1420 418 V560 H-20 Z" className="ctl-bi" strokeWidth="0.9" />
            <path d="M-20 466 C120 450 260 438 400 446 C520 453 600 468 700 464 C820 458 900 438 1040 430 C1180 422 1290 426 1420 418 V500 H-20 Z" fill={pat("d", "i")} stroke="none" opacity="0.6" />
            <g strokeWidth="0.75">
              <path d={wires.join("")} />
            </g>
            <Pylon x={1150} base={438} h={232} t="i" />
            <Pylon x={1330} base={428} h={196} t="i" />
            <Temple x={300} base={452} w={250} t="i" />
            <path d="M150 452 H450" strokeWidth="0.8" />
          </g>
        </svg>
        <svg className="ctl-svg ctl-layer" viewBox="0 0 1400 560" preserveAspectRatio="none" aria-hidden="true" style={move(-26)}>
          <g className="ctl-si" {...LINE} strokeWidth="0.8">
            <path d="M70 520 C74 440 66 400 74 330 M66 400 L40 360 M72 380 L100 340" strokeWidth="2" />
            {back.map((s, i) => (
              <Bush key={i} spec={s} t="i" />
            ))}
            <Bloom x={40} y={300} R={14} t="i" />
            <Bloom x={120} y={410} R={12} t="i" rot={1} />
            <Bloom x={1050} y={330} R={12} t="i" rot={2} />
            <Fruit x={96} y={300} r={8} t="i" />
            <Fruit x={1010} y={400} r={7} t="i" />
            <g transform="translate(560 413) scale(0.6)">
              <Pedestal t="i" />
            </g>
            <g transform="translate(542 157) scale(0.94)">
              <Statue t="i" variant="justice" />
            </g>
            <g transform="translate(930 404) scale(0.56)">
              <Pedestal t="i" />
            </g>
            <g transform="translate(1032 162) scale(-0.88 0.88)">
              <Statue t="i" />
            </g>
          </g>
        </svg>
        <svg className="ctl-svg ctl-layer" viewBox="0 0 1400 560" preserveAspectRatio="none" aria-hidden="true" style={move(60)}>
          <g transform="translate(764 136) rotate(-16)">
            <g className="ctl-orbit">
              <Satellite t="i" />
            </g>
          </g>
          <g transform="translate(196 120)">
            <g className="ctl-bob">
              <Drone t="i" />
            </g>
          </g>
        </svg>
        <svg className="ctl-svg ctl-layer" viewBox="0 0 1400 560" preserveAspectRatio="none" aria-hidden="true">
          <path className="ctl-bp" d="M-20 570 V506 C80 498 170 516 290 512 C420 507 520 482 640 494 C760 506 860 486 980 470 C1100 454 1220 456 1420 438 V570 Z" />
          <path className="ctl-sp" {...LINE} strokeWidth="0.6" opacity="0.6" d="M60 530 q10 -4 20 0 t20 0 M360 524 q10 -4 20 0 t20 0 M700 516 q10 -4 20 0 t20 0 M1040 500 q10 -4 20 0 t20 0 M1260 486 q10 -4 20 0 t20 0" />
        </svg>
        {TOILE_HOTS.map((h, i) => {
          const n = notes[i]
          if (!n) return null
          const side = h.x < 30 ? "start" : h.x > 70 ? "end" : "mid"
          return (
            <div key={i} className="ctl-hotwrap" style={{ left: h.x + "%", top: h.y + "%", ...move(h.d * 26) }}>
              <button type="button" className="ctl-hot" aria-expanded={open === i} aria-controls={id + "-note" + i} aria-label={n.title} onClick={() => setOpen(open === i ? null : i)}>
                {toRoman(i + 1)}
              </button>
              {open === i && (
                <div className="ctl-pop" id={id + "-note" + i} data-side={side} role="note">
                  <b>{n.title}</b>
                  <p>{n.body}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CtaBand({ copy, notes, id, go }: { copy: typeof DEFAULT_CONTACT_BAND; notes: ToileNote[]; id: string; go: Go }) {
  const stars = React.useMemo(() => scatterStars(21, 70, 0, 0, 1400, 600), [])
  return (
    <section className="ctl-cta" data-sec="contact" id={id} aria-labelledby={id + "-h"}>
      <svg className="ctl-svg ctl-ctastars" viewBox="0 0 1400 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {stars.map((s, i) => (s.sparkle ? <path key={i} className="ctl-fp" d={sparklePath(s.x, s.y, s.r * 3)} /> : <circle key={i} className="ctl-fp" cx={s.x} cy={s.y} r={s.r * 0.8} opacity="0.6" />))}
      </svg>
      <div className="ctl-wrap" style={{ position: "relative" }}>
        <ol className="ctl-legend">
          {notes.map((n, i) => (
            <li key={i}>
              <span>{toRoman(i + 1)}.</span>
              <span>
                <b>{n.title}</b>
                {n.body}
              </span>
            </li>
          ))}
        </ol>
        <div className="ctl-ctagrid" data-rv="">
          <div>
            <span className="ctl-kicker">Contact</span>
            <h2 className="ctl-ctat" id={id + "-h"}>
              <Emphasis text={copy.title} />
            </h2>
          </div>
          <div>
            <p>{copy.body}</p>
            <div className="ctl-ctabtns">
              {copy.action && (
                <a className="ctl-btn ctl-btn-paper" href={copy.action.href} onClick={(e) => go(copy.action.href, e)}>
                  <span>{copy.action.label}</span>
                  <Icon name="arrow" />
                </a>
              )}
              {copy.secondary && (
                <a className="ctl-btn ctl-btn-ghost" href={copy.secondary.href} onClick={(e) => go(copy.secondary.href, e)}>
                  <span>{copy.secondary.label}</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

const Landscape = React.memo(function Landscape({ reduced }: { reduced: boolean }) {
  const pat = usePat()
  const river = "M688 236 C640 244 648 254 700 262 C782 274 860 284 838 302 C816 320 700 324 600 336 C520 346 472 362 444 384 L904 384 C904 366 944 346 984 332 C1044 312 1024 288 944 274 C862 260 762 252 732 236 Z"
  const motion = "M672 368 C770 344 870 330 912 304 C940 286 870 270 786 258"
  return (
    <svg className="ctl-svg" viewBox="0 0 1400 380" width="100%" aria-hidden="true">
      <g className="ctl-si" {...LINE}>
        <path d="M0 214 C80 160 140 180 200 140 C250 110 300 160 360 150 C430 138 470 100 540 120 C600 138 640 170 700 180 C760 160 820 120 900 130 C980 140 1020 100 1100 110 C1180 120 1240 160 1300 150 C1350 142 1380 160 1400 160 V270 H0 Z" fill={pat("hz", "i")} strokeWidth="0.6" opacity="0.5" />
        <path d="M0 246 C90 222 180 236 270 226 C360 216 430 236 520 238 C620 240 660 230 720 236 C800 244 880 226 980 224 C1080 222 1160 240 1250 232 C1330 226 1370 236 1400 236 V384 H0 Z" className="ctl-bi" strokeWidth="0.8" />
        <path d={river} className="ctl-bi" strokeWidth="0.9" />
        <path d={river} fill={pat("hz", "i")} stroke="none" opacity="0.8" />
        <path d="M640 300 q8 -3 16 0 t16 0 M760 290 q8 -3 16 0 t16 0 M560 350 q8 -3 16 0 t16 0 M820 340 q8 -3 16 0 t16 0 M700 362 q8 -3 16 0 t16 0 M900 316 q8 -3 16 0 t16 0" strokeWidth="0.8" />
        <Birds list={[[880, 70, 1], [906, 56, 0.8], [934, 78, 0.7], [1180, 60, 0.7], [1204, 50, 0.6]]} t="i" />
        <g strokeWidth="0.8">
          <path d="M318 300 C322 240 312 210 320 170 M318 230 L296 200 M320 210 L344 184" strokeWidth="1.8" />
          <Bush spec={[61, 316, 150, 96, 74, 200, 18]} t="i" />
          <Bush spec={[62, 1046, 168, 80, 64, 160, 17]} t="i" />
          <path d="M1046 236 C1050 210 1042 196 1048 168" strokeWidth="1.8" />
          <Bloom x={282} y={130} R={10} t="i" />
          <Bloom x={350} y={170} R={9} t="i" rot={1} />
          <Bloom x={1020} y={150} R={9} t="i" rot={2} />
        </g>
        <g strokeWidth="0.9">
          <path className="ctl-bi" d="M168 234 H372 V242 H168 Z" />
          <path d="M168 234 H372 V242 H168 Z" fill={pat("v", "i")} />
          <path className="ctl-bi" d="M176 242 H364 V306 H176 Z" fillRule="evenodd" />
          <circle cx="270" cy="274" r="25" className="ctl-bi" />
          <circle cx="270" cy="274" r="25" fill={pat("hz", "i")} />
          <circle cx="270" cy="274" r="29" />
          <path d="M340 242 H364 V306 H340 Z" fill={pat("h2", "i")} />
        </g>
        <Pavilion x={540} base={262} t="i" />
        <House x0={1180} x1={1330} base={306} t="i" />
        <g transform="translate(96 352) scale(1.05)">
          <Vase t="i" kind={0} />
        </g>
        <g transform="translate(1110 344) scale(0.95)">
          <Vase t="i" kind={1} />
        </g>
        <g>
          {reduced ? (
            <g transform="translate(780 330) scale(0.9)">
              <Boat t="i" />
            </g>
          ) : (
            <g>
              <g transform="scale(0.9)" style={{ transformBox: "fill-box" }}>
                <Boat t="i" />
              </g>
              <animateMotion dur="46s" repeatCount="indefinite" path={motion} keyPoints="0;1;0" keyTimes="0;0.5;1" calcMode="linear" />
            </g>
          )}
        </g>
        <g strokeWidth="0.8">
          <Bush spec={[63, 1340, 360, 90, 40, 100, 20]} t="i" />
          <Bush spec={[64, 30, 372, 70, 30, 64, 18]} t="i" />
          <Bloom x={1300} y={346} R={20} t="i" petals={8} />
          <Bloom x={1366} y={334} R={16} t="i" rot={1} />
          <Bloom x={1236} y={364} R={14} t="i" rot={2} />
          <Bloom x={26} y={350} R={17} t="i" rot={0.4} />
        </g>
        <path d="M0 378 H1400" strokeWidth="0.6" />
      </g>
    </svg>
  )
})

function Footer({
  brand,
  mark,
  tagline,
  contact,
  columns,
  news,
  socials,
  legal,
  copyright,
  pal,
  setPal,
  switcher,
  onSubscribe,
  reduced,
  go,
  top,
}: {
  brand: string
  mark: React.ReactNode
  tagline: string
  contact: typeof DEFAULT_CONTACT
  columns: ToileColumn[]
  news: typeof DEFAULT_NEWSLETTER
  socials: ToileSocial[]
  legal: ToileLink[]
  copyright: string
  pal: string
  setPal: (p: string) => void
  switcher: boolean
  onSubscribe?: (email: string) => unknown
  reduced: boolean
  go: Go
  top: () => void
}) {
  const [email, setEmail] = React.useState("")
  const [state, setState] = React.useState("idle")
  const [msg, setMsg] = React.useState("")
  const fid = React.useId()
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEmail(email)) {
      setState("error")
      setMsg("That address does not look quite right.")
      return
    }
    setState("busy")
    setMsg("")
    try {
      await onSubscribe?.(email.trim())
      setState("done")
    } catch {
      setState("error")
      setMsg("Something went wrong. Please try again.")
    }
  }
  return (
    <footer className="ctl-foot">
      <div className="ctl-wrap">
        <div className="ctl-fgrid">
          <div className="ctl-fbrand">
            <a className="ctl-brand" href="#top" onClick={(e) => go("#top", e)}>
              {mark}
              <span>{brand}</span>
            </a>
            <p>{tagline}</p>
            <ul className="ctl-contact">
              {contact.email && (
                <li>
                  <Icon name="mail" />
                  <a href={"mailto:" + contact.email}>{contact.email}</a>
                </li>
              )}
              {contact.phone && (
                <li>
                  <Icon name="phone" />
                  <a href={"tel:" + contact.phone.replace(/[^+\d]/g, "")}>{contact.phone}</a>
                </li>
              )}
              {contact.location && (
                <li>
                  <Icon name="pin" />
                  <span>{contact.location}</span>
                </li>
              )}
            </ul>
          </div>
          {columns.map((c, i) => (
            <nav key={i} aria-label={c.title}>
              <h3 className="ctl-fh">{c.title}</h3>
              <ul className="ctl-flist">
                {c.links.map((l, k) => (
                  <li key={k}>
                    <a href={l.href} onClick={(e) => go(l.href, e)}>
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          <div className="ctl-fnews">
            <h3 className="ctl-fh">{news.title}</h3>
            <p className="ctl-newsp">{news.body}</p>
            {state === "done" ? (
              <div className="ctl-sealed" role="status">
                <svg width="46" height="46" viewBox="-23 -23 46 46" aria-hidden="true">
                  <path d="M0 -21 C6 -22 9 -17 14 -16 C19 -14 18 -8 21 -4 C23 1 19 5 19 10 C18 16 12 16 8 19 C4 22 -1 20 -6 21 C-12 21 -14 16 -18 12 C-22 8 -20 3 -21 -2 C-22 -8 -17 -11 -14 -15 C-10 -19 -6 -21 0 -21 Z" fill="var(--ctl-deep)" />
                  <circle r="13" fill="none" stroke="var(--ctl-ondeep)" strokeWidth="0.8" strokeDasharray="1 2" />
                  <path d={sparklePath(0, 0, 9)} fill="var(--ctl-ondeep)" />
                </svg>
                <span>{news.success}</span>
              </div>
            ) : (
              <form onSubmit={submit} noValidate>
                <label htmlFor={fid} className="ctl-sr">
                  Email address
                </label>
                <div className="ctl-news" data-err={state === "error"}>
                  <input
                    id={fid}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder={news.placeholder}
                    value={email}
                    aria-invalid={state === "error"}
                    aria-describedby={fid + "-m"}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (state === "error") setState("idle")
                    }}
                  />
                  <button type="submit" aria-label="Subscribe" disabled={state === "busy"}>
                    <Icon name="arrow" size={20} />
                  </button>
                </div>
                <div className="ctl-newsmsg" id={fid + "-m"} aria-live="polite">
                  {state === "error" ? msg : ""}
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
      <div className="ctl-land">
        <div className="ctl-lcover">
          <Landscape reduced={reduced} />
        </div>
      </div>
      <div className="ctl-wrap">
        <div className="ctl-fbar">
          <div className="ctl-socials">
            {socials.map((s, i) => (
              <a key={i} href={s.href} aria-label={s.label ?? s.kind} target={/^https?:/.test(s.href) ? "_blank" : undefined} rel={/^https?:/.test(s.href) ? "noreferrer" : undefined}>
                <Icon name={s.kind} size={18} />
              </a>
            ))}
          </div>
          {switcher && (
            <div className="ctl-swatches" role="radiogroup" aria-label="Printed in">
              <span>Printed in</span>
              {PALETTE_KEYS.map((k) => {
                const p = (PALETTES as { [k: string]: { label: string; ink: string } })[k]
                return <button key={k} type="button" role="radio" aria-checked={pal === k} aria-label={p.label} title={p.label} className="ctl-swatch" style={{ background: p.ink }} onClick={() => setPal(k)} />
              })}
            </div>
          )}
          <div className="ctl-legal">
            {legal.map((l, i) => (
              <a key={i} href={l.href} onClick={(e) => go(l.href, e)}>
                {l.label}
              </a>
            ))}
            <button type="button" className="ctl-top" onClick={top}>
              <Icon name="arrow" size={14} />
              Top
            </button>
          </div>
        </div>
        <p style={{ paddingBottom: 28, fontSize: 12, color: "var(--ctl-soft)" }}>{copyright}</p>
      </div>
    </footer>
  )
}

/* ------------------------------------------------------------- component */

export default function CobaltToileLanding({
  brand = "Hesper & Co.",
  monogram,
  logo,
  nav = DEFAULT_NAV,
  cta = { label: "Get started", href: "#contact" },
  hero,
  clients = DEFAULT_CLIENTS,
  clientsLabel = "Trusted by institutions since 1912",
  about,
  solutionsCopy,
  solutions = DEFAULT_SOLUTIONS,
  servicesCopy,
  services = DEFAULT_SERVICES,
  pressCopy,
  press = DEFAULT_PRESS,
  notes = DEFAULT_NOTES,
  contactBand,
  contact,
  tagline = "Designing durable strategies that inspire, engage and leave a lasting mark.",
  columns = DEFAULT_COLUMNS,
  newsletter,
  socials = DEFAULT_SOCIALS,
  legal = DEFAULT_LEGAL,
  copyright,
  palette = "cobalt",
  ink,
  paper,
  theme = "auto",
  paletteSwitcher = true,
  intro = true,
  onSubscribe,
  height = "100svh",
  className = "",
}: CobaltToileLandingProps) {
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const root = React.useRef(null as HTMLDivElement | null)
  const [reduced, setReduced] = React.useState(false)
  const [picked, setPicked] = React.useState(null as string | null)
  const [scrolled, setScrolled] = React.useState(false)
  const [active, setActive] = React.useState(null as string | null)
  const [menu, setMenu] = React.useState(false)

  const heroCopy = { ...DEFAULT_HERO, ...hero }
  const aboutCopy = { ...DEFAULT_ABOUT, ...about }
  const solCopy = { ...DEFAULT_SOLUTIONS_COPY, ...solutionsCopy }
  const svcCopy = { ...DEFAULT_SERVICES_COPY, ...servicesCopy }
  const prCopy = { ...DEFAULT_PRESS_COPY, ...pressCopy }
  const band = { ...DEFAULT_CONTACT_BAND, ...contactBand }
  const where = { ...DEFAULT_CONTACT, ...contact }
  const news = { ...DEFAULT_NEWSLETTER, ...newsletter }
  const colors = picked ? paletteColors(picked) : paletteColors(palette, ink, paper)
  const letter = (monogram || brand.trim().charAt(0) || "H").charAt(0)
  const mark = logo ?? <LogoMark />
  const sid = (k: string) => uid + "-" + k

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const on = () => setReduced(mq.matches)
    on()
    mq.addEventListener?.("change", on)
    return () => mq.removeEventListener?.("change", on)
  }, [])

  React.useEffect(() => {
    let raf = 0
    const on = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const el = root.current
        setScrolled(!!el && el.getBoundingClientRect().top < -8)
      })
    }
    on()
    window.addEventListener("scroll", on, { passive: true })
    return () => {
      window.removeEventListener("scroll", on)
      cancelAnimationFrame(raf)
    }
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
  // JS is running, so server-rendered and captured pages are never blank.
  useIsoLayoutEffect(() => {
    const el = root.current
    if (!el || reduced || typeof IntersectionObserver === "undefined") return
    const items = Array.from(el.querySelectorAll("[data-rv]")) as HTMLElement[]
    const below = items.filter((n) => n.getBoundingClientRect().top > window.innerHeight * 0.92)
    below.forEach((n) => n.classList.add("ctl-pre"))
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          if (!e.isIntersecting) continue
          const n = e.target as HTMLElement
          n.classList.add("ctl-rv")
          n.classList.remove("ctl-pre")
          io.unobserve(n)
        }
      },
      { rootMargin: "0px 0px -6% 0px" }
    )
    below.forEach((n) => io.observe(n))
    return () => {
      io.disconnect()
      below.forEach((n) => n.classList.remove("ctl-pre"))
    }
  }, [reduced])

  React.useEffect(() => {
    if (!menu) return
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(false)
    }
    window.addEventListener("keydown", key)
    return () => window.removeEventListener("keydown", key)
  }, [menu])

  const top = () => root.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" })
  const go: Go = (href, e) => {
    if (!href.startsWith("#")) return
    const key = href.slice(1)
    if (key === "" || key === "top") {
      e?.preventDefault()
      setMenu(false)
      top()
      return
    }
    const target = root.current?.querySelector('[data-sec="' + key + '"]')
    if (!target) return
    e?.preventDefault()
    setMenu(false)
    target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" })
  }

  const year = new Date().getFullYear()
  const style = { ["--ctl-ib" as string]: colors.ink, ["--ctl-pb" as string]: colors.paper, minHeight: height } as React.CSSProperties

  return (
    <div ref={root} className={"ctl-root " + className} data-theme={theme} style={style}>
      <style>{CTL_CSS}</style>
      <Defs uid={uid} />
      <ArtCtx.Provider value={{ uid, reduced }}>
        <header className="ctl-nav" data-scrolled={scrolled}>
          <div className="ctl-wrap ctl-navin">
            <a className="ctl-brand" href="#top" onClick={(e) => go("#top", e)} aria-label={brand + ", back to top"}>
              {mark}
              <span>{brand}</span>
            </a>
            <nav className="ctl-links" aria-label="Main">
              {nav.map((l, i) => (
                <a key={i} className="ctl-link" href={l.href} aria-current={active !== null && l.href === "#" + active ? "true" : undefined} onClick={(e) => go(l.href, e)}>
                  {l.label}
                </a>
              ))}
            </nav>
            {cta && (
              <a className="ctl-btn ctl-navcta" href={cta.href} onClick={(e) => go(cta.href, e)}>
                <span>{cta.label}</span>
              </a>
            )}
            <button type="button" className="ctl-burger" aria-expanded={menu} aria-controls={sid("menu")} aria-label={menu ? "Close menu" : "Open menu"} onClick={() => setMenu((m) => !m)}>
              <Icon name={menu ? "close" : "menu"} size={20} />
            </button>
          </div>
          {menu && (
            <div className="ctl-menu" id={sid("menu")}>
              <nav className="ctl-wrap" aria-label="Mobile">
                {nav.map((l, i) => (
                  <a key={i} href={l.href} onClick={(e) => go(l.href, e)}>
                    <small>{toRoman(i + 1)}.</small>
                    {l.label}
                  </a>
                ))}
                {cta && (
                  <a href={cta.href} onClick={(e) => go(cta.href, e)}>
                    <small>→</small>
                    {cta.label}
                  </a>
                )}
              </nav>
            </div>
          )}
        </header>
        <main>
          <Hero copy={heroCopy} intro={intro} reduced={reduced} go={go} mark={<span style={{ color: "var(--ctl-ink)", display: "inline-flex" }}>{logo ?? <LogoMark size={30} />}</span>} />
          <Ticker clients={clients} label={clientsLabel} reduced={reduced} />
          <About copy={aboutCopy} reduced={reduced} id={sid("about")} />
          <Solutions copy={solCopy} items={solutions} brand={brand} letter={letter} id={sid("solutions")} go={go} />
          <Services copy={svcCopy} items={services} id={sid("services")} />
          <Insights copy={prCopy} items={press} id={sid("insights")} reduced={reduced} />
          <Toile notes={notes} reduced={reduced} id={sid("toile")} />
          <CtaBand copy={band} notes={notes} id={sid("contact")} go={go} />
        </main>
        <Footer
          brand={brand}
          mark={mark}
          tagline={tagline}
          contact={where}
          columns={columns}
          news={news}
          socials={socials}
          legal={legal}
          copyright={copyright ?? "© " + year + " " + brand + " All rights reserved."}
          pal={picked ?? palette}
          setPal={setPicked}
          switcher={paletteSwitcher}
          onSubscribe={onSubscribe}
          reduced={reduced}
          go={go}
          top={top}
        />
      </ArtCtx.Provider>
    </div>
  )
}
