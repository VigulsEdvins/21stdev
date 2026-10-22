"use client"

// Blossom Dusk Template — a complete landing page for an integrations product,
// opening under cherry boughs against a periwinkle dusk sky.
//
// The boughs are grown and painted here, on canvas, from a seed: tapered
// branches, five-petal notched blossoms tilted in space, buds, leaves and
// stamens, in three depths of focus. They sway, rustle when the pointer moves
// through them, shed petals when you click the sky, and lift away as you
// scroll. Below the hero: an integrations hub drawn from the brand mark's own
// spokes, a busywork board you can automate, numbers, case studies, pricing,
// questions, and a closing band under the boughs again.
//
// Nothing loads at runtime: the art is canvas and SVG, the type is the system
// stack, so it renders inside the 21st capture sandbox.
import * as React from "react"

export type BdtLink = { label: string; href?: string; text?: string }

/** A nav item is a link, or a menu of links when it has `items`. */
export type BdtNavItem = { label: string; href?: string; items?: BdtLink[] }

export type BdtNav = { items?: BdtNavItem[]; login?: BdtLink; cta?: BdtLink }

export type BdtIcon = "record" | "lab" | "heart" | "pill" | "receipt" | "shield" | "video" | "calendar"

export type BdtIntegration = {
  name: string
  /** Who it talks to, under the name. */
  vendors: string
  icon: BdtIcon
  /** Event lines for the live log. "#" becomes a record number. */
  events: string[]
  connected?: boolean
}

export type BdtTask = { title: string; team: string; hours: number }

export type BdtStat = { value: number; label: string; prefix?: string; suffix?: string; decimals?: number }

export type BdtQuote = { quote: string; name: string; role: string; org: string; metric: { value: string; label: string } }

export type BdtTier = {
  name: string
  text: string
  /** Monthly price with `included` connections; `null` is "Talk to us". */
  base: number | null
  included: number
  perConnection: number
  features: string[]
  featured?: boolean
  button?: string
}

export type BdtFaq = { q: string; a: string }

export type BdtPaletteName = "dusk" | "dawn" | "night"

export type BdtPalette = {
  /** Hero sky, top to bottom. */
  sky: [string, string, string]
  /** The warm light behind the boughs. */
  glow: string
  heroInk: string
  /** The second half of the headline, and quiet hero text. */
  heroMuted: string
  /** The dark sections: the hub and pricing. */
  night: string
  nightSoft: string
  nightInk: string
  /** The light sections: busywork, stories, questions. */
  paper: string
  paperSoft: string
  paperInk: string
  paperMuted: string
  rule: string
  accent: string
  /** Petals: tip, body, throat. */
  petal: [string, string, string]
  /** Flower eye, anthers, stamens. */
  eye: string
  anther: string
  stamen: string
  bark: string
  rim: string
  leaf: [string, string]
}

export interface BlossomDuskTemplateProps {
  /** Wordmark in the nav and footer. */
  brand?: string
  /** Replaces the drawn mark beside the wordmark. */
  logo?: React.ReactNode
  nav?: BdtNav | null
  hero?: { title?: string; accent?: string; text?: string; primary?: BdtLink; secondary?: BdtLink } | null
  /** A photo for the hero sky in place of the painted boughs. */
  image?: string
  /** Seed for the painted boughs. Every seed grows a different canopy. */
  seed?: number
  /** Logos under the hero. `null` hides the strip. */
  logos?: string[] | null
  /** The label before the logos. */
  logosTitle?: string
  hub?: { eyebrow?: string; title?: string; text?: string; integrations?: BdtIntegration[] } | null
  busywork?: { eyebrow?: string; title?: string; text?: string; tasks?: BdtTask[] } | null
  stats?: BdtStat[] | null
  stories?: { eyebrow?: string; title?: string; quotes?: BdtQuote[] } | null
  pricing?: { eyebrow?: string; title?: string; text?: string; tiers?: BdtTier[] } | null
  faq?: { title?: string; items?: BdtFaq[] } | null
  cta?: { title?: string; text?: string; button?: string; placeholder?: string } | null
  footer?: { tagline?: string; columns?: { title: string; links: BdtLink[] }[]; note?: string; legal?: string } | null
  palette?: BdtPaletteName | BdtPaletteInput
  /** A video for "Watch demo". Without it the modal plays a drawn walkthrough. */
  demoVideo?: string
  /** Called with the email from the closing form. Return (or resolve to) `false`, or throw, to show an error. */
  onGetStarted?: (email: string) => unknown
  /** Minimum height of the hero. A definite length, so it survives any host layout. */
  height?: string
  className?: string
}

// #region content
const PALETTES = {
  dusk: {
    sky: ["#7f9cd8", "#5d7ec4", "#4a69ae"],
    glow: "#f6b9a8",
    heroInk: "#ffffff",
    heroMuted: "#c9d6f2",
    night: "#1a2547",
    nightSoft: "#253262",
    nightInk: "#eef2fc",
    paper: "#f6f3f0",
    paperSoft: "#ece6e2",
    paperInk: "#1c2340",
    paperMuted: "#5f6580",
    rule: "#ddd6d1",
    accent: "#ef8aa2",
    petal: ["#ffd7de", "#f6a0b2", "#dd5a7b"],
    eye: "#9b1d48",
    anther: "#f3b54d",
    stamen: "#ffe6ec",
    bark: "#2f1e25",
    rim: "#9a7d8c",
    leaf: ["#6d8d58", "#2e4a30"],
  },
  dawn: {
    sky: ["#f5c7b2", "#e9a495", "#d48283"],
    glow: "#fff1d6",
    heroInk: "#3a1828",
    heroMuted: "#7d4655",
    night: "#3a1d2c",
    nightSoft: "#4e2a3b",
    nightInk: "#fbefee",
    paper: "#fbf5f0",
    paperSoft: "#f2e7df",
    paperInk: "#3a1828",
    paperMuted: "#7a5f66",
    rule: "#ead9d0",
    accent: "#c4466a",
    petal: ["#fff8f6", "#fbd9df", "#ec9cb0"],
    eye: "#b0365c",
    anther: "#e7a13c",
    stamen: "#fffaf8",
    bark: "#3b2228",
    rim: "#c79a9c",
    leaf: ["#8aa95c", "#486b34"],
  },
  night: {
    sky: ["#2a3768", "#1c2650", "#121a3a"],
    glow: "#7d6bc4",
    heroInk: "#ffffff",
    heroMuted: "#a9b4dc",
    night: "#0e1430",
    nightSoft: "#1a2350",
    nightInk: "#eef1fb",
    paper: "#f3f2f7",
    paperSoft: "#e6e4ef",
    paperInk: "#141a36",
    paperMuted: "#5c6181",
    rule: "#d9d7e4",
    accent: "#f5a9c0",
    petal: ["#fde9ef", "#f2bccb", "#d97795"],
    eye: "#8a2149",
    anther: "#f0c56a",
    stamen: "#fff2f6",
    bark: "#140f1c",
    rim: "#5c5a82",
    leaf: ["#4f7a5a", "#1f3d2c"],
  },
}

const DEFAULT_INTEGRATIONS: BdtIntegration[] = [
  { name: "Records", vendors: "Epic · Cerner · athena", icon: "record", connected: true, events: ["Chart # updated", "Encounter # signed", "Allergies reconciled on #", "Problem list merged for #"] },
  { name: "Labs", vendors: "Quest · Labcorp", icon: "lab", connected: true, events: ["Lipid panel # filed", "A1c result # attached", "CBC # flagged for review", "Culture # resulted"] },
  { name: "Wearables", vendors: "Apple Health · Oura", icon: "heart", connected: true, events: ["Resting HR synced for #", "Sleep summary # in", "BP reading # charted", "Step trend # updated"] },
  { name: "Pharmacy", vendors: "Surescripts", icon: "pill", connected: false, events: ["Refill # approved", "eRx # delivered", "Fill status # confirmed", "Formulary checked on #"] },
  { name: "Billing", vendors: "Stripe · Candid", icon: "receipt", connected: true, events: ["Claim # submitted", "Remit # matched", "Copay # collected", "Denial # routed"] },
  { name: "Insurance", vendors: "Availity · Change", icon: "shield", connected: true, events: ["Eligibility # verified", "Prior auth # approved", "Benefits # refreshed", "Auth # renewed"] },
  { name: "Telehealth", vendors: "Zoom · Doxy.me", icon: "video", connected: false, events: ["Visit # started", "Visit # notes drafted", "Room # opened", "Recording # archived"] },
  { name: "Scheduling", vendors: "Zocdoc · Calendly", icon: "calendar", connected: true, events: ["Booking # confirmed", "Reminder # sent", "Slot # rebooked", "Waitlist # filled"] },
]

const DEFAULT_TASKS: BdtTask[] = [
  { title: "Re-key lab results into the chart", team: "Clinicians", hours: 3.5 },
  { title: "Chase prior authorizations by fax", team: "Front desk", hours: 4 },
  { title: "Reconcile claims against remits", team: "Billing", hours: 5 },
  { title: "Copy wearable vitals into visit notes", team: "Clinicians", hours: 2 },
  { title: "Send appointment reminders by hand", team: "Front desk", hours: 2.5 },
  { title: "Pull the weekly ops report together", team: "Operations", hours: 1.5 },
]

const DEFAULT_STATS: BdtStat[] = [
  { value: 2400, suffix: "+", label: "Clinics running on it" },
  { value: 38, suffix: "M", label: "Records synced each month" },
  { value: 99.99, suffix: "%", decimals: 2, label: "Uptime over the last year" },
  { value: 11, suffix: " hrs", label: "Back per clinician, every week" },
]

const DEFAULT_QUOTES: BdtQuote[] = [
  {
    quote: "We had six tabs open for every patient. Now the chart is just right, and the front desk goes home on time.",
    name: "Maya Okafor",
    role: "COO",
    org: "Juniper Family Health",
    metric: { value: "−71%", label: "time on prior auths" },
  },
  {
    quote: "Wearable data used to be a screenshot in a message. It lands in the note now, trended, before the visit starts.",
    name: "Dr. Arun Pillai",
    role: "Medical director",
    org: "Northfield Cardiology",
    metric: { value: "14 min", label: "saved per visit" },
  },
  {
    quote: "Remits match themselves. Our billing team went from reconciling to actually following up on denials.",
    name: "Lena Brandt",
    role: "Revenue cycle lead",
    org: "Cedar & Pine Clinics",
    metric: { value: "3.2×", label: "faster close" },
  },
]

const DEFAULT_TIERS: BdtTier[] = [
  {
    name: "Starter",
    text: "For a single clinic getting its stack talking.",
    base: 49,
    included: 3,
    perConnection: 12,
    features: ["3 connections included", "Daily sync", "Shared inbox for exceptions", "Email support"],
    button: "Start free",
  },
  {
    name: "Growth",
    text: "For practices automating the handoffs between teams.",
    base: 189,
    included: 10,
    perConnection: 9,
    features: ["10 connections included", "Real-time sync", "Automations and approvals", "Audit log and SSO", "Chat support"],
    featured: true,
    button: "Start 14-day trial",
  },
  {
    name: "Health system",
    text: "For networks with their own data team.",
    base: null,
    included: 0,
    perConnection: 0,
    features: ["Unlimited connections", "Dedicated tenancy", "BAA and custom DPA", "Named engineer"],
    button: "Talk to us",
  },
]

const DEFAULT_FAQ: BdtFaq[] = [
  { q: "Is it HIPAA compliant?", a: "Yes. We sign a BAA on every paid plan, encrypt data in transit and at rest, and keep a full audit trail of every record that moves." },
  { q: "How long does setup take?", a: "Most clinics connect their first three systems in an afternoon. Records systems that need an interface engine take a week or two, and we do that work with you." },
  { q: "What happens when a sync fails?", a: "It lands in a shared exceptions inbox with the reason and a one-click retry. Nothing is dropped silently, and nothing is retried twice by accident." },
  { q: "Can we leave?", a: "Any time. Export every mapping and automation as JSON, and your data never lived anywhere but your own systems." },
]

const DEFAULT_LOGOS = ["Juniper Health", "NORTHFIELD", "Cedar & Pine", "lumen care", "Harbor Pediatrics", "OAKWELL"]
// #endregion content

// #region logic
function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

function easeOutCubic(t: number): number {
  const k = 1 - clamp(t, 0, 1)
  return 1 - k * k * k
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

/** Canopy space: every bough is grown in a 1000 × 720 box anchored at its top-left. */
const BOUGH_W = 1000
const BOUGH_H = 720

type BdtPt = [number, number]
type BdtBranch = { pts: BdtPt[]; w0: number; w1: number; depth: number }
/** kind 0 flower, 1 bud, 2 leaf. `face` turns the flower in its plane, `tilt` foreshortens it. */
type BdtBloom = { kind: number; x: number; y: number; r: number; face: number; tilt: number; spin: number; tone: number; ax: number; ay: number }
type BdtBough = { branches: BdtBranch[]; blooms: BdtBloom[] }

/**
 * Grows one bough from the top-left corner of canopy space: a main limb
 * reaching across and drooping, side limbs hanging off it, and clusters of
 * blossoms toward every tip. Deterministic for a seed.
 */
function growBough(seed: number, opts: { reach?: number; droop?: number; density?: number; depth?: number; width?: number } = {}): BdtBough {
  const rng = mulberry32(seed)
  const reach = opts.reach ?? 1
  const droop = opts.droop ?? 1
  const density = opts.density ?? 1
  const maxDepth = opts.depth ?? 3
  const branches: BdtBranch[] = []
  const blooms: BdtBloom[] = []

  const cluster = (x: number, y: number, size: number) => {
    if (x > BOUGH_W - 70 || y > BOUGH_H - 60) return
    const n = Math.max(1, Math.round((1.5 + rng() * 3.2) * size * density))
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2
      const d = Math.sqrt(rng()) * 40 * size
      blooms.push({
        kind: 0,
        x: x + Math.cos(a) * d,
        y: y + Math.sin(a) * d * 0.8 + 8,
        r: (19 + rng() * 13) * (0.78 + size * 0.24),
        face: rng() * Math.PI * 2,
        tilt: 0.42 + rng() * 0.58,
        spin: rng() * Math.PI * 2,
        tone: rng(),
        ax: x,
        ay: y,
      })
    }
    const buds = Math.floor(rng() * 3 * density)
    for (let i = 0; i < buds; i++) {
      const a = Math.PI * (0.15 + rng() * 0.7)
      const d = 22 + rng() * 22
      blooms.push({ kind: 1, x: x + Math.cos(a) * d * (rng() < 0.5 ? -1 : 1), y: y + Math.sin(a) * d, r: 5 + rng() * 3, face: a, tilt: 1, spin: 0, tone: rng(), ax: x, ay: y })
    }
    if (rng() < 0.3) {
      const a = rng() * Math.PI * 2
      blooms.push({ kind: 2, x: x + Math.cos(a) * 18, y: y + Math.sin(a) * 18, r: 20 + rng() * 14, face: a, tilt: 0.5 + rng() * 0.5, spin: 0, tone: rng(), ax: x, ay: y })
    }
  }

  const grow = (x: number, y: number, ang: number, len: number, w: number, depth: number) => {
    const n = Math.max(4, Math.round(len / 24))
    const step = len / n
    const pts: BdtPt[] = [[x, y]]
    const angs: number[] = [ang]
    let a = ang
    for (let i = 1; i <= n; i++) {
      a += (rng() - 0.5) * 0.34 + (Math.PI / 2 - a) * 0.018 * droop * (depth + 0.6)
      const nx = x + Math.cos(a) * step
      const ny = y + Math.sin(a) * step
      // stay inside the box, so nothing is ever cut off at a canvas edge
      if (nx > BOUGH_W - 90 || ny > BOUGH_H - 80) break
      x = nx
      y = ny
      pts.push([x, y])
      angs.push(a)
    }
    if (pts.length < 3) return
    const m = pts.length - 1
    const w1 = Math.max(Math.min(1.4, w * 0.8), w * (depth === 0 ? 0.3 : 0.36))
    branches.push({ pts, w0: w, w1, depth })
    if (depth < maxDepth) {
      const kids = depth === 0 ? 5 : depth === 1 ? 3 : 2
      for (let k = 0; k < kids; k++) {
        const t = 0.16 + ((k + rng() * 0.8) / kids) * 0.76
        const i = Math.min(m - 1, Math.floor(t * m))
        const side = (k + depth) % 2 === 0 ? 1 : -1
        // most limbs hang; the rest reach up and out of frame
        const turn = side > 0 ? 0.6 + rng() * 0.6 : -(0.3 + rng() * 0.4)
        const wAt = w + (w1 - w) * t
        grow(pts[i][0], pts[i][1], angs[i] + turn, len * (0.4 + rng() * 0.26) * (1 - t * 0.3), wAt * 0.62, depth + 1)
      }
    }
    if (depth >= 1) {
      for (let i = Math.floor(m * 0.45); i < m; i += 3) if (rng() < 0.42) cluster(pts[i][0], pts[i][1], 0.55 + (i / m) * 0.4)
    }
    cluster(x, y, depth === 0 ? 0.8 : 1.05)
  }

  grow(-40, 92, 0.02, 760 * reach, opts.width ?? 30, 0)
  // flowers furthest from the viewer first: smaller tilt reads as further away
  blooms.sort((p, q) => p.r * p.tilt - q.r * q.tilt)
  return { branches, blooms }
}

/** One sakura petal pointing up from the origin: rounded, with the notch at the tip. */
function petalPath(len: number, width: number): string {
  const w = width / 2
  const f = (n: number) => +n.toFixed(2)
  return (
    "M0 0C" + f(-w * 1.15) + " " + f(-len * 0.22) + " " + f(-w * 1.1) + " " + f(-len * 0.86) + " " + f(-w * 0.34) + " " + f(-len) +
    "Q" + f(-w * 0.1) + " " + f(-len * 0.99) + " 0 " + f(-len * 0.87) +
    "Q" + f(w * 0.1) + " " + f(-len * 0.99) + " " + f(w * 0.34) + " " + f(-len) +
    "C" + f(w * 1.1) + " " + f(-len * 0.86) + " " + f(w * 1.15) + " " + f(-len * 0.22) + " 0 0Z"
  )
}

/** Monthly price for a tier at a connection count, 20% off when billed yearly. `null` for custom tiers. */
function priceFor(t: BdtTier, connections: number, yearly: boolean): number | null {
  if (t.base == null) return null
  const extra = Math.max(0, Math.round(connections) - t.included) * t.perConnection
  return Math.round((t.base + extra) * (yearly ? 0.8 : 1))
}

function hoursBack(tasks: BdtTask[], done: boolean[]): number {
  let h = 0
  tasks.forEach((t, i) => {
    if (done[i]) h += t.hours
  })
  return Math.round(h * 10) / 10
}

/** Hours per team, split into what's still manual and what's automated, in first-seen team order. */
function teamSplit(tasks: BdtTask[], done: boolean[]): { team: string; manual: number; auto: number }[] {
  const out: { team: string; manual: number; auto: number }[] = []
  tasks.forEach((t, i) => {
    let row = out.find((r) => r.team === t.team)
    if (!row) out.push((row = { team: t.team, manual: 0, auto: 0 }))
    if (done[i]) row.auto += t.hours
    else row.manual += t.hours
  })
  return out
}

function formatStat(s: BdtStat, v: number): string {
  const d = s.decimals ?? 0
  const n = v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })
  return (s.prefix ?? "") + n + (s.suffix ?? "")
}

/** An event line with "#" swapped for a record number that's stable for (line, n). */
function eventText(template: string, n: number): string {
  const id = 1000 + ((n * 7919 + template.length * 131) % 9000)
  return template.replace("#", "#" + id)
}

function clockText(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0")
}

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim())
}

function nextIndex(i: number, key: string, n: number): number {
  if (key === "ArrowRight" || key === "ArrowDown") return (i + 1) % n
  if (key === "ArrowLeft" || key === "ArrowUp") return (i - 1 + n) % n
  if (key === "Home") return 0
  if (key === "End") return n - 1
  return i
}

/** Where spoke `i` of 8 points, clockwise from twelve o'clock. */
function spoke(i: number, r: number, cx = 0, cy = 0): BdtPt {
  const a = -Math.PI / 2 + (i * Math.PI) / 4
  return [+(cx + Math.cos(a) * r).toFixed(2), +(cy + Math.sin(a) * r).toFixed(2)]
}

/** Hex blend, `t` of the way from `a` to `b`. */
function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const k = clamp(t, 0, 1)
  const ch = (sh: number) => Math.round(((pa >> sh) & 255) * (1 - k) + ((pb >> sh) & 255) * k)
  return "#" + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)
}

function resolvePalette(p: BdtPaletteName | BdtPaletteInput | undefined): BdtPalette {
  if (typeof p === "string") return (PALETTES[p] ?? PALETTES.dusk) as BdtPalette
  return { ...(PALETTES.dusk as BdtPalette), ...(p ?? {}) }
}
// #endregion logic

/* -------------------------------------------------------------------------- */

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

function useInView(ref: { current: Element | null }, once = true, threshold = 0.18): boolean {
  const [seen, setSeen] = React.useState(false)
  React.useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === "undefined") {
      setSeen(true)
      return
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true)
          if (once) io.disconnect()
        } else if (!once) setSeen(false)
      },
      { threshold },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [ref, once, threshold])
  return seen
}

/** Eases from wherever it is to `target` whenever `target` changes and `run` is on. */
function useTween(target: number, run: boolean, reduced: boolean, from: number, ms = 900): number {
  const [v, setV] = React.useState(from)
  const cur = React.useRef(from)
  React.useEffect(() => {
    if (!run) return
    if (reduced) {
      cur.current = target
      setV(target)
      return
    }
    const a = cur.current
    const t0 = performance.now()
    let raf = 0
    const step = (t: number) => {
      const k = clamp((t - t0) / ms, 0, 1)
      const x = a + (target - a) * easeOutCubic(k)
      cur.current = x
      setV(x)
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, run, reduced, ms])
  return v
}

/* ------------------------------ the painter ------------------------------- */

type BdtShapes = { petal: Path2D; flowers: Path2D[]; edges: Path2D[][]; veins: Path2D[] }
let shapesCache: BdtShapes | null = null

/** Unit flowers (petal length 1), built once: three slightly different five-petal heads. */
function shapes(): BdtShapes {
  if (shapesCache) return shapesCache
  const petal = new Path2D(petalPath(1, 0.82))
  const vein = new Path2D("M0 -0.14L0 -0.7M0 -0.16L-0.16 -0.62M0 -0.16L0.16 -0.62")
  const rng = mulberry32(17)
  const flowers: Path2D[] = []
  const edges: Path2D[][] = []
  const veins: Path2D[] = []
  for (let v = 0; v < 3; v++) {
    const f = new Path2D()
    const vs = new Path2D()
    const es: Path2D[] = []
    for (let k = 0; k < 5; k++) {
      const m = new DOMMatrix().rotate(k * 72 + (rng() - 0.5) * 14).scale(0.92 + rng() * 0.16)
      f.addPath(petal, m)
      vs.addPath(vein, m)
      const e = new Path2D()
      e.addPath(petal, m)
      es.push(e)
    }
    flowers.push(f)
    edges.push(es)
    veins.push(vs)
  }
  shapesCache = { petal, flowers, edges, veins }
  return shapesCache
}

type BdtPaintOpts = { mirror: boolean; haze: number; dpr: number; light?: number }

function sizeCanvas(cv: HTMLCanvasElement, dpr: number): CanvasRenderingContext2D | null {
  const w = cv.clientWidth
  const h = cv.clientHeight
  if (!w || !h) return null
  cv.width = Math.round(w * dpr)
  cv.height = Math.round(h * dpr)
  return cv.getContext("2d")
}

function paintBough(cv: HTMLCanvasElement, bough: BdtBough, pal: BdtPalette, o: BdtPaintOpts) {
  const ctx = sizeCanvas(cv, o.dpr)
  if (!ctx) return
  const s = cv.width / BOUGH_W
  ctx.setTransform(o.mirror ? -s : s, 0, 0, s, o.mirror ? cv.width : 0, 0)
  const hz = (c: string) => mix(c, pal.sky[1], o.haze)
  const { flowers, edges, veins } = shapes()

  /* limbs: a tapered body, then rim light along the edge facing the sky */
  for (const b of bough.branches) {
    const pts = b.pts
    const n = pts.length
    const L: BdtPt[] = []
    const R: BdtPt[] = []
    for (let i = 0; i < n; i++) {
      const p = pts[Math.max(0, i - 1)]
      const q = pts[Math.min(n - 1, i + 1)]
      let tx = q[0] - p[0]
      let ty = q[1] - p[1]
      const len = Math.hypot(tx, ty) || 1
      tx /= len
      ty /= len
      const w = (b.w0 + (b.w1 - b.w0) * (i / (n - 1))) / 2
      L.push([pts[i][0] - ty * w, pts[i][1] + tx * w])
      R.push([pts[i][0] + ty * w, pts[i][1] - tx * w])
    }
    const path = new Path2D()
    path.moveTo(L[0][0], L[0][1])
    for (let i = 1; i < n; i++) {
      const m = [(L[i - 1][0] + L[i][0]) / 2, (L[i - 1][1] + L[i][1]) / 2]
      path.quadraticCurveTo(L[i - 1][0], L[i - 1][1], m[0], m[1])
    }
    path.lineTo(L[n - 1][0], L[n - 1][1])
    path.lineTo(R[n - 1][0], R[n - 1][1])
    for (let i = n - 2; i >= 0; i--) {
      const m = [(R[i + 1][0] + R[i][0]) / 2, (R[i + 1][1] + R[i][1]) / 2]
      path.quadraticCurveTo(R[i + 1][0], R[i + 1][1], m[0], m[1])
    }
    path.lineTo(R[0][0], R[0][1])
    path.closePath()
    // a round end, so a limb never stops on a blunt cut
    path.moveTo(pts[n - 1][0] + b.w1 / 2, pts[n - 1][1])
    path.arc(pts[n - 1][0], pts[n - 1][1], b.w1 / 2, 0, Math.PI * 2)
    ctx.fillStyle = hz(pal.bark)
    ctx.fill(path)
    // rim: whichever edge sits higher on screen catches the sky
    const up = L[Math.floor(n / 2)][1] < R[Math.floor(n / 2)][1] ? L : R
    ctx.beginPath()
    ctx.moveTo(up[0][0], up[0][1])
    for (let i = 1; i < n; i++) ctx.lineTo(up[i][0], up[i][1])
    ctx.strokeStyle = hz(pal.rim)
    ctx.globalAlpha = 0.55
    ctx.lineWidth = Math.max(0.8, b.w0 * 0.12)
    ctx.lineCap = "round"
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  /* stalks from the limb to each bloom */
  ctx.strokeStyle = hz(mix(pal.bark, pal.leaf[1], 0.25))
  ctx.lineCap = "round"
  for (const f of bough.blooms) {
    if (f.kind === 2) continue
    ctx.lineWidth = f.kind === 1 ? 1.1 : 1.5
    ctx.beginPath()
    ctx.moveTo(f.ax, f.ay)
    ctx.quadraticCurveTo((f.ax + f.x) / 2, Math.max(f.ay, f.y) + 4, f.x, f.y)
    ctx.stroke()
  }

  const [tip, body, throat] = pal.petal
  for (const f of bough.blooms) {
    ctx.save()
    ctx.translate(f.x, f.y)
    if (f.kind === 2) {
      /* leaf */
      ctx.rotate(f.face)
      ctx.scale(f.r, f.r * 0.36 * (0.6 + f.tilt * 0.4))
      const g = ctx.createLinearGradient(0, -1, 0, 1)
      g.addColorStop(0, hz(pal.leaf[0]))
      g.addColorStop(1, hz(pal.leaf[1]))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.bezierCurveTo(0.6, -1.1, 1.5, -0.8, 2, 0)
      ctx.bezierCurveTo(1.5, 0.8, 0.6, 1.1, 0, 0)
      ctx.fill()
      ctx.strokeStyle = hz(mix(pal.leaf[0], "#ffffff", 0.25))
      ctx.globalAlpha = 0.5
      ctx.lineWidth = 0.06
      ctx.beginPath()
      ctx.moveTo(0.1, 0)
      ctx.lineTo(1.85, 0)
      ctx.stroke()
    } else if (f.kind === 1) {
      /* bud, hanging off its stalk */
      ctx.rotate(Math.atan2(f.y - f.ay, f.x - f.ax))
      const g = ctx.createRadialGradient(f.r * 0.6, -f.r * 0.3, 0, 0, 0, f.r * 1.5)
      g.addColorStop(0, hz(mix(body, "#ffffff", 0.15)))
      g.addColorStop(1, hz(throat))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.ellipse(f.r * 0.5, 0, f.r * 1.15, f.r * 0.82, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = hz(mix(pal.bark, pal.eye, 0.45))
      ctx.beginPath()
      ctx.ellipse(-f.r * 0.45, 0, f.r * 0.42, f.r * 0.62, 0, 0, Math.PI * 2)
      ctx.fill()
    } else {
      /* flower: tilted in space, five notched petals, an eye and stamens */
      const v = Math.floor(f.tone * 3) % 3
      const back = f.tilt < 0.56 && f.tone > 0.72
      const lift = (o.light ?? 0) + (f.tone - 0.5) * 0.16
      ctx.rotate(f.face)
      ctx.scale(f.r, f.r * f.tilt)
      ctx.rotate(f.spin)
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
      g.addColorStop(0, hz(back ? mix(throat, pal.bark, 0.2) : throat))
      g.addColorStop(0.3, hz(mix(throat, body, 0.7)))
      g.addColorStop(0.66, hz(mix(body, tip, 0.35 + lift)))
      g.addColorStop(1, hz(mix(tip, "#ffffff", clamp(lift, 0, 0.4))))
      ctx.fillStyle = g
      ctx.fill(flowers[v])
      // a cool shadow on the side away from the light
      const sh = ctx.createLinearGradient(-0.9, -0.9, 0.9, 0.9)
      sh.addColorStop(0, "rgba(255,255,255,0.22)")
      sh.addColorStop(0.5, "rgba(255,255,255,0)")
      sh.addColorStop(1, back ? "rgba(70,30,60,0.32)" : "rgba(80,40,90,0.2)")
      ctx.fillStyle = sh
      ctx.fill(flowers[v])
      ctx.strokeStyle = hz(mix(body, throat, 0.55))
      ctx.globalAlpha = 0.5
      ctx.lineWidth = 0.035
      for (const e of edges[v]) ctx.stroke(e)
      ctx.globalAlpha = 0.18
      ctx.strokeStyle = hz(throat)
      ctx.lineWidth = 0.025
      ctx.stroke(veins[v])
      ctx.globalAlpha = 1
      if (back) {
        ctx.fillStyle = hz(mix(pal.eye, pal.bark, 0.35))
        for (let k = 0; k < 5; k++) {
          ctx.rotate((Math.PI * 2) / 5)
          ctx.beginPath()
          ctx.moveTo(-0.09, 0)
          ctx.lineTo(0, -0.42)
          ctx.lineTo(0.09, 0)
          ctx.fill()
        }
      } else {
        const eg = ctx.createRadialGradient(0, 0, 0, 0, 0, 0.2)
        eg.addColorStop(0, hz(pal.eye))
        eg.addColorStop(1, hz(mix(pal.eye, throat, 0.6)))
        ctx.fillStyle = eg
        ctx.beginPath()
        ctx.arc(0, 0, 0.17, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = hz(pal.stamen)
        ctx.lineWidth = 0.022
        ctx.fillStyle = hz(pal.anther)
        for (let k = 0; k < 13; k++) {
          const a = k * 0.483 + f.spin
          const r = 0.3 + ((k * 37) % 11) / 55
          const x = Math.cos(a) * r
          const y = Math.sin(a) * r
          ctx.beginPath()
          ctx.moveTo(Math.cos(a) * 0.08, Math.sin(a) * 0.08)
          ctx.lineTo(x, y)
          ctx.stroke()
          ctx.beginPath()
          ctx.arc(x, y, 0.038, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
    ctx.restore()
  }
}

/** A loose petal, pre-rendered once per tint; the falling petals are stamps of these. */
function petalSprite(pal: BdtPalette, tone: number): HTMLCanvasElement {
  const c = document.createElement("canvas")
  c.width = c.height = 48
  const ctx = c.getContext("2d")
  if (!ctx) return c
  ctx.translate(24, 40)
  ctx.scale(34, 34)
  const g = ctx.createRadialGradient(0, 0, 0, 0, -0.4, 1)
  g.addColorStop(0, pal.petal[2])
  g.addColorStop(0.35, mix(pal.petal[1], pal.petal[2], 0.3 - tone * 0.3))
  g.addColorStop(1, mix(pal.petal[0], "#ffffff", tone * 0.4))
  ctx.fillStyle = g
  ctx.fill(shapes().petal)
  return c
}

/* ------------------------------- the canopy ------------------------------- */

type BdtCanopyProps = {
  pal: BdtPalette
  seed: number
  reduced: boolean
  host: { current: HTMLElement | null }
  /** "hero" lifts the boughs away as you scroll past; "cta" lowers them in as you arrive. */
  variant: "hero" | "cta"
  boughs: boolean
}

type BdtPetal = { x: number; y: number; vx: number; vy: number; z: number; rot: number; spin: number; flip: number; flipV: number; ph: number; f: number; sprite: number }

function Canopy({ pal, seed, reduced, host, variant, boughs }: BdtCanopyProps) {
  const refs = React.useRef([] as (HTMLCanvasElement | null)[])
  const petalsRef = React.useRef(null as HTMLCanvasElement | null)
  const lift = variant === "hero"

  /* paint the boughs whenever their boxes change size */
  React.useEffect(() => {
    if (!boughs) return
    const front = [growBough(seed, { droop: 1.25 }), growBough(seed * 7 + 3, { reach: 0.9, droop: 1.45 })]
    const back = [growBough(seed * 13 + 5, { reach: 0.7, droop: 1.1, density: 0.75, depth: 2, width: 18 }), growBough(seed * 31 + 9, { reach: 0.75, droop: 1.3, density: 0.75, depth: 2, width: 18 })]
    const near = [bokehBough(seed * 3 + 1), bokehBough(seed * 5 + 2)]
    let t = 0
    const paint = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      for (let side = 0; side < 2; side++) {
        const mirror = side === 1
        const [b, f, k] = [refs.current[side * 3], refs.current[side * 3 + 1], refs.current[side * 3 + 2]]
        if (b) paintBough(b, back[side], pal, { mirror, haze: 0.42, dpr: Math.min(1, dpr) })
        if (f) paintBough(f, front[side], pal, { mirror, haze: 0, dpr, light: 0.08 })
        if (k) paintBough(k, near[side], pal, { mirror, haze: 0.05, dpr: 0.5, light: 0.12 })
      }
    }
    paint()
    const el = host.current
    if (!el || typeof ResizeObserver === "undefined") return
    let w = el.clientWidth
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === w) return
      w = el.clientWidth
      clearTimeout(t)
      t = window.setTimeout(paint, 140)
    })
    ro.observe(el)
    return () => {
      ro.disconnect()
      clearTimeout(t)
    }
  }, [boughs, seed, pal, host])

  /* the loop: petals, sway, pointer wind, scroll lift */
  React.useEffect(() => {
    const el = host.current
    const cv = petalsRef.current
    if (!el || !cv) return
    const layers = refs.current
    const sprites = [0, 0.35, 0.7, 1].map((t) => petalSprite(pal, t))
    if (reduced) {
      // still life: the boughs at rest and a few petals caught mid-fall
      el.style.setProperty("--bdt-p", "0")
      for (const l of layers) if (l) l.style.transform = ""
      const d = Math.min(1.5, window.devicePixelRatio || 1)
      const c = sizeCanvas(cv, d)
      if (!c) return
      const r = mulberry32(seed * 101 + 7)
      for (let i = 0; i < 16; i++) {
        c.setTransform(1, 0, 0, 1, r() * cv.width, (0.1 + r() * 0.85) * cv.height)
        c.rotate(r() * 6.3)
        const z = (0.55 + r() * 0.8) * d * 0.62
        c.scale(z * (0.4 + r() * 0.6), z)
        c.globalAlpha = 0.85
        c.drawImage(sprites[i % sprites.length], -24, -40, 48, 48)
      }
      return
    }
    let W = 0
    let H = 0
    let dpr = 1
    let ctx = null as CanvasRenderingContext2D | null
    const resize = () => {
      dpr = Math.min(1.5, window.devicePixelRatio || 1)
      W = el.clientWidth
      H = el.clientHeight
      ctx = sizeCanvas(cv, dpr)
    }
    resize()
    const rng = mulberry32(seed * 101 + 7)
    const target = () => Math.round(clamp((W * H) / 26000, 14, 54))
    const spawn = (p: BdtPetal | null, x: number, y: number): BdtPetal => {
      const z = 0.55 + rng() * 0.85
      const q = p ?? ({} as BdtPetal)
      q.x = x
      q.y = y
      q.vx = 10 + rng() * 20
      q.vy = 20 + rng() * 20
      q.z = z
      q.rot = rng() * Math.PI * 2
      q.spin = (rng() - 0.5) * 2.4
      q.flip = rng() * Math.PI * 2
      q.flipV = 1.5 + rng() * 3
      q.ph = rng() * 10
      q.f = 0.6 + rng() * 1.1
      q.sprite = Math.floor(rng() * sprites.length)
      return q
    }
    // somewhere under the boughs, upstream of the wind
    const source = (): [number, number] => {
      const left = rng() < 0.55
      const x = left ? rng() * W * 0.55 - W * 0.05 : W * 0.45 + rng() * W * 0.55
      return [x, lift ? rng() * H * 0.45 - 20 : rng() * H * 0.3 - 20]
    }
    const petals: BdtPetal[] = []
    for (let i = 0; i < target(); i++) petals.push(spawn(null, rng() * W, rng() * H))

    const sway = [
      { th: 0, om: 0, ph: 0.3 },
      { th: 0, om: 0, ph: 2.1 },
    ]
    const ptr = { x: -1e4, y: -1e4, vx: 0, vy: 0, t: 0 }
    const smooth = { mx: 0, my: 0 }
    let gust = 0
    let visible = true
    let raf = 0
    let last = performance.now()
    let time = 0

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      const x = e.clientX - r.left
      const y = e.clientY - r.top
      const now = performance.now()
      const dt = Math.max(8, now - ptr.t) / 1000
      if (ptr.t && now - ptr.t < 120) {
        ptr.vx = clamp((x - ptr.x) / dt, -2400, 2400)
        ptr.vy = clamp((y - ptr.y) / dt, -2400, 2400)
      }
      ptr.x = x
      ptr.y = y
      ptr.t = now
    }
    const onLeave = () => {
      ptr.x = ptr.y = -1e4
      ptr.vx = ptr.vy = 0
    }
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement
      if (t.closest("a,button,input,textarea,select,label,[role=dialog]")) return
      const r = el.getBoundingClientRect()
      const x = e.clientX - r.left
      const y = e.clientY - r.top
      const side = x < W / 2 ? 0 : 1
      sway[side].om += side === 0 ? 9 : -9
      gust = 60
      // knock petals loose from the bough on that side, and push the ones near the click
      for (let i = 0; i < 14; i++) {
        const sx = side === 0 ? rng() * W * 0.45 : W * 0.55 + rng() * W * 0.45
        const p = spawn(null, sx, rng() * H * 0.4)
        p.vy = 30 + rng() * 60
        p.vx = (side === 0 ? 40 : -10) + rng() * 60
        petals.push(p)
      }
      for (const p of petals) {
        const dx = p.x - x
        const dy = p.y - y
        const d = Math.hypot(dx, dy)
        if (d < 260) {
          const k = (1 - d / 260) * 420
          p.vx += (dx / (d || 1)) * k
          p.vy += (dy / (d || 1)) * k
          p.spin += (rng() - 0.5) * 6
        }
      }
    }
    el.addEventListener("pointermove", onMove)
    el.addEventListener("pointerleave", onLeave)
    el.addEventListener("pointerdown", onDown)

    const frame = (now: number) => {
      raf = 0
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      time += dt
      if (!ctx) resize()
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight || 1
      const p = lift ? clamp(-r.top / Math.max(1, r.height), 0, 1) : clamp(1 - r.top / vh, 0, 1)
      el.style.setProperty("--bdt-p", p.toFixed(4))

      /* pointer, smoothed, for the parallax */
      const inside = ptr.x > -1e3
      const tx = inside ? clamp(ptr.x / W - 0.5, -0.5, 0.5) * 2 : 0
      const ty = inside ? clamp(ptr.y / H - 0.5, -0.5, 0.5) * 2 : 0
      smooth.mx += (tx - smooth.mx) * Math.min(1, dt * 3)
      smooth.my += (ty - smooth.my) * Math.min(1, dt * 3)
      el.style.setProperty("--bdt-mx", smooth.mx.toFixed(4))
      el.style.setProperty("--bdt-my", smooth.my.toFixed(4))

      /* wind */
      gust *= Math.pow(0.25, dt)
      const wind = 16 + Math.sin(time * 0.23) * 12 + Math.sin(time * 0.71 + 1) * 6 + gust

      /* boughs: a damped spring toward a slow breeze, kicked by the pointer passing through */
      for (let s = 0; s < 2; s++) {
        const sw = sway[s]
        const inBough = inside && ptr.y < H * 0.62 && (s === 0 ? ptr.x < W * 0.58 : ptr.x > W * 0.42)
        if (inBough) sw.om += (s === 0 ? ptr.vx : -ptr.vx) * 0.0016 + ptr.vy * 0.0008
        const goal = Math.sin(time * 0.52 + sw.ph) * 0.45 + Math.sin(time * 1.3 + sw.ph * 2) * 0.12 + (wind - 16) * 0.012 * (s === 0 ? 1 : -1)
        sw.om += (-7 * (sw.th - goal) - 2.4 * sw.om) * dt
        sw.th = clamp(sw.th + sw.om * dt, -4, 4)
        const out = s === 0 ? -1 : 1
        const depth = [0.55, 1, 1.5]
        for (let k = 0; k < 3; k++) {
          const l = layers[s * 3 + k]
          if (!l) continue
          const d = depth[k]
          const px = smooth.mx * 14 * d + (lift ? out * p * 90 * d : 0)
          const py = smooth.my * 8 * d + (lift ? -p * 170 * d : -(1 - p) * 60 * d)
          l.style.transform = "translate3d(" + px.toFixed(2) + "px," + py.toFixed(2) + "px,0) rotate(" + (sw.th * (0.7 + d * 0.3) * (s === 0 ? 1 : -1)).toFixed(3) + "deg)"
        }
      }
      ptr.vx *= Math.pow(0.02, dt)
      ptr.vy *= Math.pow(0.02, dt)

      /* petals */
      const want = target()
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.clearRect(0, 0, cv.width, cv.height)
      }
      for (let i = petals.length - 1; i >= 0; i--) {
        const q = petals[i]
        const tvx = wind * q.z + Math.sin(time * q.f + q.ph) * 26 * q.z
        const tvy = (26 + 22 * q.z) * (0.75 + 0.25 * Math.cos(q.flip))
        q.vx += (tvx - q.vx) * Math.min(1, dt * 1.2)
        q.vy += (tvy - q.vy) * Math.min(1, dt * 1.2)
        if (inside) {
          const dx = q.x - ptr.x
          const dy = q.y - ptr.y
          const d2 = dx * dx + dy * dy
          if (d2 < 140 * 140) {
            const k = (1 - Math.sqrt(d2) / 140) * dt * 3.2
            q.vx += ptr.vx * k
            q.vy += ptr.vy * k
            q.spin += (ptr.vx > 0 ? 1 : -1) * k * 2
          }
        }
        q.spin *= Math.pow(0.6, dt)
        q.x += q.vx * dt
        q.y += q.vy * dt
        q.rot += (q.spin + 0.4) * dt
        q.flip += q.flipV * dt
        if (q.y > H + 30 || q.x > W + 40 || q.x < -60 || q.y < -200) {
          if (petals.length > want) petals.splice(i, 1)
          else {
            const [sx, sy] = source()
            spawn(q, sx, sy)
          }
          continue
        }
        if (!ctx) continue
        const c = Math.cos(q.flip)
        const sc = q.z * dpr * 0.62
        ctx.setTransform(1, 0, 0, 1, q.x * dpr, q.y * dpr)
        ctx.rotate(q.rot)
        ctx.scale(sc * (0.25 + 0.75 * Math.abs(c)), sc)
        ctx.globalAlpha = clamp(0.5 + q.z * 0.4, 0, 1)
        ctx.drawImage(sprites[q.sprite], -24, -40, 48, 48)
      }
      if (visible) raf = requestAnimationFrame(frame)
    }

    const start = () => {
      if (!raf && visible && !document.hidden) {
        last = performance.now()
        raf = requestAnimationFrame(frame)
      }
    }
    const stop = () => {
      cancelAnimationFrame(raf)
      raf = 0
    }
    const io =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(([e]) => {
            visible = e.isIntersecting
            if (visible) start()
            else stop()
          })
    io?.observe(el)
    const onVis = () => (document.hidden ? stop() : start())
    document.addEventListener("visibilitychange", onVis)
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize)
    ro?.observe(el)
    start()
    return () => {
      stop()
      io?.disconnect()
      ro?.disconnect()
      document.removeEventListener("visibilitychange", onVis)
      el.removeEventListener("pointermove", onMove)
      el.removeEventListener("pointerleave", onLeave)
      el.removeEventListener("pointerdown", onDown)
    }
  }, [reduced, pal, seed, host, lift])

  return (
    <div className={"bdt-canopy bdt-canopy-" + variant} aria-hidden="true">
      {boughs &&
        [0, 1].map((side) => (
          <div key={side} className={"bdt-bough bdt-bough-" + (side === 0 ? "l" : "r")}>
            {["back", "front", "near"].map((k, i) => (
              <canvas key={k} ref={(n) => { refs.current[side * 3 + i] = n }} className={"bdt-layer bdt-layer-" + k} />
            ))}
          </div>
        ))}
      <canvas ref={petalsRef} className="bdt-petals" />
    </div>
  )
}

/** A handful of big, close, out-of-focus blossoms hanging in from the corner. */
function bokehBough(seed: number): BdtBough {
  const rng = mulberry32(seed)
  const blooms: BdtBloom[] = []
  for (let i = 0; i < 5; i++) {
    const x = 40 + rng() * 520
    const y = -30 + rng() * 120
    blooms.push({ kind: 0, x, y, r: 48 + rng() * 40, face: rng() * 6.3, tilt: 0.5 + rng() * 0.5, spin: rng() * 6.3, tone: rng() * 0.7, ax: x, ay: y - 40 })
  }
  return { branches: [], blooms }
}

/* ------------------------------- drawn marks ------------------------------- */

const MARK_SPOKES = [0, 1, 2, 3, 5, 7]

/** Eight spokes, two of them joined through the middle: the dots, connected. */
function BrandMark({ size = 22, draw = false, className = "" }: { size?: number | string; draw?: boolean; className?: string }) {
  return (
    <svg className={"bdt-svg bdt-mark " + className} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="12.5" strokeLinecap="butt" strokeLinejoin="round">
        {MARK_SPOKES.map((i, k) => {
          const [x1, y1] = spoke(i, i === 5 ? 21 : 17, 50, 50)
          const [x2, y2] = spoke(i, 47, 50, 50)
          return <path key={i} d={"M" + x1 + " " + y1 + "L" + x2 + " " + y2} pathLength={1} className={draw ? "bdt-draw" : undefined} style={draw ? { animationDelay: 0.25 + k * 0.09 + "s" } : undefined} />
        })}
        <path d="M3 50H33Q50 50 50 67V97" pathLength={1} className={draw ? "bdt-draw" : undefined} style={draw ? { animationDelay: "0.85s" } : undefined} />
      </g>
    </svg>
  )
}

const ICONS: { [k in BdtIcon]: string } = {
  record: "M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5",
  lab: "M9 3h6M10 3v6l-5 8.5A2 2 0 0 0 6.7 20.5h10.6a2 2 0 0 0 1.7-3L14 9V3M7.6 15h8.8",
  heart: "M12 20s-7.5-4.6-7.5-10.2A4.1 4.1 0 0 1 12 7.4a4.1 4.1 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20zM7.5 12h2.2l1.3-2 2 4 1.3-2h2.2",
  pill: "M10.4 20.1l9.7-9.7a4.8 4.8 0 0 0-6.8-6.8l-9.7 9.7a4.8 4.8 0 0 0 6.8 6.8zM8.4 8.4l7.2 7.2",
  receipt: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3",
  shield: "M12 3l7 3v5c0 5-3.4 8.4-7 10-3.6-1.6-7-5-7-10V6zM9 12l2 2 4-4",
  video: "M3 7h12v10H3zM15 10.5l6-3.5v10l-6-3.5",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M8 14h3",
}

function Icon({ name, size = 20 }: { name: BdtIcon; size?: number }) {
  return (
    <svg className="bdt-svg" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d={ICONS[name] ?? ICONS.record} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Chevron({ open }: { open?: boolean }) {
  return (
    <svg className={"bdt-svg bdt-chev" + (open ? " bdt-chev-open" : "")} width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <path d="M2 3.8l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Check({ size = 12 }: { size?: number }) {
  return (
    <svg className="bdt-svg" width={size} height={size} viewBox="0 0 12 12" aria-hidden="true">
      <path d="M2.5 6.3l2.3 2.3 4.7-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Arrow({ dir = 1 }: { dir?: number }) {
  return (
    <svg className="bdt-svg" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" style={dir < 0 ? { transform: "scaleX(-1)" } : undefined}>
      <path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** A small sprig drawn with the same petal as the canopy, for the light sections. */
function Sprig({ className = "" }: { className?: string }) {
  const heads: [number, number, number, number][] = [
    [62, 30, 15, 0.2],
    [92, 52, 12, 1.1],
    [40, 58, 10, 2.3],
    [118, 34, 9, 0.7],
  ]
  const petal = petalPath(1, 0.82)
  return (
    <svg className={"bdt-svg bdt-sprig " + className} width="160" height="96" viewBox="0 0 160 96" aria-hidden="true">
      <path d="M2 88C40 70 70 62 100 44S146 18 158 10M70 60c-8 0-20 4-30 0M100 44c2-6 0-14-6-20" fill="none" stroke="var(--bdt-bark)" strokeWidth="2.2" strokeLinecap="round" />
      {heads.map(([x, y, r, a], i) => (
        <g key={i} transform={"translate(" + x + " " + y + ") rotate(" + (a * 57.3).toFixed(1) + ") scale(" + r + ")"}>
          {[0, 1, 2, 3, 4].map((k) => (
            <path key={k} d={petal} transform={"rotate(" + k * 72 + ")"} fill="var(--bdt-petal-b)" stroke="var(--bdt-petal-c)" strokeWidth="0.05" />
          ))}
          <circle r="0.2" fill="var(--bdt-eye)" />
        </g>
      ))}
    </svg>
  )
}

/* ----------------------------------- nav ----------------------------------- */

function NavMenu({ item, i, open, setOpen, go }: { item: BdtNavItem; i: number; open: number; setOpen: (i: number) => void; go: (href: string | undefined, e?: React.MouseEvent) => void }) {
  const isOpen = open === i
  const btn = React.useRef(null as HTMLButtonElement | null)
  const panel = React.useRef(null as HTMLDivElement | null)
  const timer = React.useRef(0)
  const id = "bdt-menu-" + React.useId().replace(/[^a-zA-Z0-9]/g, "")
  const items = item.items ?? []
  const hover = (on: boolean) => (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setOpen(on ? i : -1), on ? 70 : 180)
  }
  React.useEffect(() => () => clearTimeout(timer.current), [])
  const focusItem = (k: number) => {
    const els = panel.current?.querySelectorAll("a")
    if (els && els.length) (els[(k + els.length) % els.length] as HTMLElement).focus()
  }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(-1)
      btn.current?.focus()
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault()
      const els = Array.from(panel.current?.querySelectorAll("a") ?? [])
      const at = els.indexOf(document.activeElement as HTMLAnchorElement)
      if (!isOpen) {
        setOpen(i)
        requestAnimationFrame(() => focusItem(e.key === "ArrowDown" ? 0 : -1))
      } else focusItem(at < 0 ? (e.key === "ArrowDown" ? 0 : -1) : at + (e.key === "ArrowDown" ? 1 : -1))
    }
  }
  return (
    <li className="bdt-navli" onPointerEnter={hover(true)} onPointerLeave={hover(false)} onKeyDown={onKey}>
      <button
        ref={btn}
        type="button"
        className="bdt-navlink"
        aria-expanded={isOpen}
        aria-controls={id}
        onClick={() => setOpen(isOpen ? -1 : i)}
      >
        {item.label}
        <Chevron open={isOpen} />
      </button>
      <div ref={panel} id={id} className={"bdt-drop" + (items.some((x) => x.text) ? " bdt-drop-wide" : "")} data-open={isOpen ? "" : undefined} hidden={!isOpen}>
        {items.map((x) => (
          <a key={x.label} href={x.href ?? "#"} className="bdt-dropitem" onClick={(e) => { setOpen(-1); go(x.href, e) }}>
            <span className="bdt-dropl">{x.label}</span>
            {x.text && <span className="bdt-dropt">{x.text}</span>}
          </a>
        ))}
      </div>
    </li>
  )
}

/* ------------------------------ the demo modal ----------------------------- */

const SCENES = [
  { title: "Connect your stack", text: "Pick the systems you run. Each one is a spoke on the same wheel." },
  { title: "Automate the handoffs", text: "The re-keying, the faxing and the copying stop being anyone's job." },
  { title: "See it all in one place", text: "Every record that moved, every exception, every hour you got back." },
]
const SCENE_LEN = 6

function DemoModal({ onClose, video, reduced, brand }: { onClose: () => void; video?: string; reduced: boolean; brand: string }) {
  const [t, setT] = React.useState(0)
  const [playing, setPlaying] = React.useState(!reduced)
  const [seekN, setSeekN] = React.useState(0)
  const box = React.useRef(null as HTMLDivElement | null)
  const total = SCENES.length * SCENE_LEN
  React.useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    box.current?.focus()
    return () => prev?.focus?.()
  }, [])
  React.useEffect(() => {
    if (video || !playing) return
    let raf = 0
    let last = performance.now()
    const step = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      setT((v) => (v + dt >= total ? 0 : v + dt))
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [playing, video, total])
  const scene = Math.min(SCENES.length - 1, Math.floor(t / SCENE_LEN))
  const local = t - scene * SCENE_LEN
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose()
    else if (video) return
    else if (e.key === " " || e.key === "k") {
      e.preventDefault()
      setPlaying((p) => !p)
    } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      setT((v) => clamp(v + (e.key === "ArrowRight" ? 2 : -2), 0, total - 0.01))
      setSeekN((n) => n + 1)
    }
    else if (e.key === "Tab") {
      const els = Array.from(box.current?.querySelectorAll("button,[tabindex='0'],video") ?? []) as HTMLElement[]
      if (!els.length) return
      const i = els.indexOf(document.activeElement as HTMLElement)
      if (e.shiftKey && i <= 0) {
        e.preventDefault()
        els[els.length - 1].focus()
      } else if (!e.shiftKey && i === els.length - 1) {
        e.preventDefault()
        els[0].focus()
      }
    }
  }
  const seek = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setT(clamp((e.clientX - r.left) / r.width, 0, 0.999) * total)
    setSeekN((n) => n + 1)
  }
  // Scenes are CSS animations. A scene mounts (or remounts, on a seek) with a
  // negative delay that puts it exactly at `local`, then runs on its own clock.
  const key = scene + ":" + seekN
  const mount = React.useRef({ key: "", at: 0 })
  if (mount.current.key !== key) mount.current = { key, at: local }
  const off = { "--bdt-off": (-mount.current.at).toFixed(2) + "s" } as React.CSSProperties
  return (
    <div className="bdt-modal" role="dialog" aria-modal="true" aria-label={"Watch the " + brand + " demo"} onKeyDown={onKey} onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={box} className="bdt-player" tabIndex={-1}>
        <button type="button" className="bdt-x" onClick={onClose} aria-label="Close demo">
          <svg className="bdt-svg" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </button>
        {video ? (
          <video className="bdt-video" src={video} controls autoPlay={!reduced} playsInline width={1280} height={720} />
        ) : (
          <>
            <div className={"bdt-stage" + (playing ? "" : " bdt-paused")} style={off} key={key}>
              <div className="bdt-stage-vis">
              {scene === 0 && (
                <svg className="bdt-svg bdt-stage-svg" viewBox="0 0 640 360" aria-hidden="true">
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
                    const [x, y] = spoke(i, 130, 320, 180)
                    const [x0, y0] = spoke(i, 40, 320, 180)
                    return (
                      <g key={i} className="bdt-sc-node" style={{ animationDelay: "calc(var(--bdt-off) + " + (0.3 + i * 0.45) + "s)" }}>
                        <path d={"M" + x0 + " " + y0 + "L" + x + " " + y} pathLength={1} className="bdt-sc-line" style={{ animationDelay: "calc(var(--bdt-off) + " + (0.3 + i * 0.45) + "s)" }} />
                        <circle cx={x} cy={y} r="17" />
                      </g>
                    )
                  })}
                  <g transform="translate(290 150) scale(.6)" className="bdt-sc-mark"><BrandMark size={100} /></g>
                </svg>
              )}
              {scene === 1 && (
                <div className="bdt-sc-tasks">
                  {DEFAULT_TASKS.slice(0, 4).map((x, i) => (
                    <div key={x.title} className="bdt-sc-task" style={{ animationDelay: "calc(var(--bdt-off) + " + (0.6 + i * 1.1) + "s)" }}>
                      <span className="bdt-sc-box"><Check /></span>
                      <span className="bdt-sc-t">{x.title}</span>
                      <span className="bdt-sc-h">{x.hours} h</span>
                    </div>
                  ))}
                </div>
              )}
              {scene === 2 && (
                <svg className="bdt-svg bdt-stage-svg" viewBox="0 0 640 360" aria-hidden="true">
                  {[0, 1, 2, 3].map((i) => <path key={i} d={"M60 " + (80 + i * 60) + "H580"} className="bdt-sc-grid" />)}
                  <path d="M60 280C120 270 150 240 200 236S280 200 320 170 400 150 440 120 520 70 580 64" pathLength={1} className="bdt-sc-chart" />
                  <path d="M60 280C120 270 150 240 200 236S280 200 320 170 400 150 440 120 520 70 580 64V280H60z" className="bdt-sc-fill" />
                  {["38M records", "0 dropped", "11 hrs back"].map((k, i) => (
                    <g key={k} className="bdt-sc-chip" style={{ animationDelay: "calc(var(--bdt-off) + " + (2.2 + i * 0.7) + "s)" }}>
                      <rect x={70 + i * 170} y="300" width="150" height="34" rx="17" />
                      <text x={145 + i * 170} y="322" textAnchor="middle">{k}</text>
                    </g>
                  ))}
                </svg>
              )}
              </div>
              <div className="bdt-cap">
                <span className="bdt-cap-n">{"0" + (scene + 1)}</span>
                <span className="bdt-cap-t">{SCENES[scene].title}</span>
                <span className="bdt-cap-x">{SCENES[scene].text}</span>
              </div>
            </div>
            <div className="bdt-controls">
              <button type="button" className="bdt-play" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"}>
                <svg className="bdt-svg" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  {playing ? <path d="M4 2.5v9M10 2.5v9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /> : <path d="M4 2.2l8 4.8-8 4.8z" fill="currentColor" />}
                </svg>
              </button>
              <div
                className="bdt-scrub"
                role="slider"
                tabIndex={0}
                aria-label="Seek"
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={Math.round(t)}
                aria-valuetext={clockText(t) + " of " + clockText(total)}
                onPointerDown={(e) => {
                  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
                  seek(e)
                }}
                onPointerMove={(e) => e.buttons && seek(e)}
              >
                {SCENES.map((s, i) => (
                  <span key={s.title} className="bdt-seg">
                    <span style={{ transform: "scaleX(" + clamp((t - i * SCENE_LEN) / SCENE_LEN, 0, 1) + ")" }} />
                  </span>
                ))}
              </div>
              <span className="bdt-time">{clockText(t) + " / " + clockText(total)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ------------------------------ integrations ------------------------------ */

type BdtLog = { id: number; node: number; text: string }

function Hub({ cfg, reduced, uid }: { cfg: { eyebrow: string; title: string; text: string; integrations: BdtIntegration[] }; reduced: boolean; uid: string }) {
  const list = cfg.integrations.slice(0, 8)
  const ref = React.useRef(null as HTMLElement | null)
  const seen = useInView(ref, false, 0.05)
  const [on, setOn] = React.useState(() => list.map((x) => x.connected !== false))
  const [wired, setWired] = React.useState(() => list.map(() => 0))
  const [sel, setSel] = React.useState(0)
  const [counts, setCounts] = React.useState(() => list.map((_, i) => 1200 + ((i * 7919) % 4800)))
  const [log, setLog] = React.useState(() =>
    [2, 1, 0].map((k) => {
      const node = (k * 3 + 1) % list.length
      return { id: -k - 1, node, text: eventText(list[node].events[k % list[node].events.length], k + node) } as BdtLog
    }),
  )
  const tick = React.useRef(0)
  const nodeRefs = React.useRef([] as (HTMLButtonElement | null)[])

  React.useEffect(() => {
    if (!seen) return
    const iv = window.setInterval(() => {
      tick.current++
      const n = tick.current
      setCounts((c) => c.map((v, i) => (on[i] ? v + 1 + ((n * (i + 3)) % 4) : v)))
      const live = on.map((x, i) => (x ? i : -1)).filter((i) => i >= 0)
      if (!live.length) return
      const node = on[sel] && n % 2 === 0 ? sel : live[n % live.length]
      const ev = list[node].events
      setLog((l) => [{ id: n, node, text: eventText(ev[n % ev.length], n + node) }, ...l].slice(0, 5))
    }, 1400)
    return () => clearInterval(iv)
  }, [seen, on, sel, list])

  const toggle = (i: number, to?: boolean) => {
    setOn((o) => o.map((v, k) => (k === i ? (to ?? !v) : v)))
    setWired((w) => w.map((v, k) => (k === i ? v + 1 : v)))
  }
  const all = on.every(Boolean)
  const setAll = () => {
    const to = !all
    setOn(list.map(() => to))
    setWired((w) => w.map((v, k) => (on[k] !== to ? v + 1 : v)))
  }
  const cur = list[sel]
  const liveCount = on.filter(Boolean).length
  const rate = on.reduce((a, v, i) => a + (v ? 18 + ((i * 13) % 23) : 0), 0)

  return (
    <section ref={ref} className="bdt-sec bdt-hub" data-sec="connect">
      <div className="bdt-stars" aria-hidden="true" />
      <div className="bdt-wrap bdt-hub-grid">
        <div className="bdt-hub-copy" data-reveal>
          <p className="bdt-eyebrow">{cfg.eyebrow}</p>
          <h2 className="bdt-h2">{cfg.title}</h2>
          <p className="bdt-lede">{cfg.text}</p>
          <div className="bdt-card bdt-node-card" aria-live="polite">
            <div className="bdt-nc-head">
              <span className="bdt-nc-icon"><Icon name={cur.icon} size={22} /></span>
              <span className="bdt-nc-name">
                <strong>{cur.name}</strong>
                <span>{cur.vendors}</span>
              </span>
              <button type="button" role="switch" aria-checked={on[sel]} aria-label={(on[sel] ? "Disconnect " : "Connect ") + cur.name} className="bdt-switch" onClick={() => toggle(sel)}>
                <span />
              </button>
            </div>
            <div className="bdt-nc-stats">
              <div>
                <span className="bdt-k">Synced today</span>
                <span className="bdt-v">{counts[sel].toLocaleString("en-US")}</span>
              </div>
              <div>
                <span className="bdt-k">Status</span>
                <span className={"bdt-v bdt-status" + (on[sel] ? " bdt-live" : "")}>{on[sel] ? "Live" : "Paused"}</span>
              </div>
              <div>
                <span className="bdt-k">Latency</span>
                <span className="bdt-v">{on[sel] ? 40 + ((counts[sel] * 7) % 60) + " ms" : "—"}</span>
              </div>
            </div>
            <ol className="bdt-log" aria-label="Recent events">
              {log.length === 0 && <li className="bdt-log-empty">Waiting for the first event…</li>}
              {log.map((e) => (
                <li key={e.id} className="bdt-log-row">
                  <span className="bdt-log-dot" />
                  <span className="bdt-log-t">{e.text}</span>
                  <span className="bdt-log-s">{list[e.node].name}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="bdt-wheel-wrap" data-reveal>
          <div className="bdt-wheel" role="group" aria-label="Integrations">
            <svg className="bdt-svg bdt-wheel-svg" viewBox="0 0 640 640" aria-hidden="true">
              <defs>
                <radialGradient id={uid + "-core"}>
                  <stop offset="0" stopColor="var(--bdt-accent)" stopOpacity=".45" />
                  <stop offset="1" stopColor="var(--bdt-accent)" stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx="320" cy="320" r="228" className="bdt-ring" />
              <circle cx="320" cy="320" r="150" className="bdt-ring bdt-ring-in" />
              <circle cx="320" cy="320" r={70 + liveCount * 6} fill={"url(#" + uid + "-core)"} className="bdt-core" />
              {list.map((_, i) => {
                const [x0, y0] = spoke(i, 74, 320, 320)
                const [x1, y1] = spoke(i, 196, 320, 320)
                const d = "M" + x0 + " " + y0 + "L" + x1 + " " + y1
                return (
                  <g key={i} className={"bdt-link" + (on[i] ? " bdt-on" : "") + (sel === i ? " bdt-sel" : "")}>
                    <path d={d} className="bdt-link-base" />
                    {on[i] && <path key={wired[i]} d={d} pathLength={1} className="bdt-link-draw" />}
                    {on[i] && <path d={d} className={"bdt-link-flow" + (i % 2 ? " bdt-in" : "")} style={{ animationDuration: 1.4 + (i % 3) * 0.35 + "s" }} />}
                  </g>
                )
              })}
              <g transform="translate(266 266) scale(1.08)" className="bdt-hub-mark">
                <BrandMark size={100} />
              </g>
            </svg>
            {list.map((x, i) => {
              const p = spoke(i, 35.6, 50, 50)
              return (
                <button
                  key={x.name}
                  ref={(n) => { nodeRefs.current[i] = n }}
                  type="button"
                  className={"bdt-node" + (on[i] ? " bdt-on" : "") + (sel === i ? " bdt-sel" : "") + (i === 0 ? " bdt-node-top" : "")}
                  style={{ left: p[0] + "%", top: p[1] + "%" }}
                  aria-pressed={sel === i}
                  tabIndex={sel === i ? 0 : -1}
                  onClick={() => setSel(i)}
                  onDoubleClick={() => toggle(i)}
                  onKeyDown={(e) => {
                    const n = nextIndex(i, e.key, list.length)
                    if (n !== i) {
                      e.preventDefault()
                      setSel(n)
                      nodeRefs.current[n]?.focus()
                    }
                  }}
                >
                  <span className="bdt-node-dot"><Icon name={x.icon} /></span>
                  <span className="bdt-node-l">{x.name}</span>
                </button>
              )
            })}
          </div>
          <div className="bdt-wheel-foot">
            <span><strong>{liveCount}</strong> of {list.length} connected · <strong>{rate * 6}</strong> events/min</span>
            <button type="button" className="bdt-btn bdt-btn-glass bdt-btn-sm" onClick={setAll}>{all ? "Pause all" : "Connect all"}</button>
          </div>
          <p className="bdt-hint">Pick a spoke to inspect it. Flip its switch, or double-click it, to connect or pause.</p>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------- busywork -------------------------------- */

function Busywork({ cfg, reduced, stats }: { cfg: { eyebrow: string; title: string; text: string; tasks: BdtTask[] }; reduced: boolean; stats: BdtStat[] | null }) {
  const tasks = cfg.tasks
  const [done, setDone] = React.useState(() => tasks.map((_, i) => i === 1))
  const ref = React.useRef(null as HTMLElement | null)
  const statsRef = React.useRef(null as HTMLDivElement | null)
  const seen = useInView(ref)
  const statsSeen = useInView(statsRef)
  const hours = hoursBack(tasks, done)
  const shown = useTween(hours, seen, reduced, 0)
  const teams = teamSplit(tasks, done)
  const max = Math.max(1, ...teams.map((t) => t.manual + t.auto))
  const all = done.every(Boolean)
  return (
    <section ref={ref} className="bdt-sec bdt-paper bdt-busy" data-sec="automate">
      <div className="bdt-wrap">
        <div className="bdt-head" data-reveal>
          <p className="bdt-eyebrow">{cfg.eyebrow}</p>
          <h2 className="bdt-h2">{cfg.title}</h2>
          <p className="bdt-lede">{cfg.text}</p>
        </div>
        <div className="bdt-busy-grid">
          <ul className="bdt-tasks" data-reveal>
            {tasks.map((t, i) => (
              <li key={t.title}>
                <button
                  type="button"
                  role="switch"
                  aria-checked={done[i]}
                  className={"bdt-task" + (done[i] ? " bdt-done" : "")}
                  onClick={() => setDone((d) => d.map((v, k) => (k === i ? !v : v)))}
                >
                  <span className="bdt-tick"><Check /></span>
                  <span className="bdt-task-t">
                    <span className="bdt-strike">{t.title}</span>
                    <span className="bdt-task-team">{t.team}</span>
                  </span>
                  <span className="bdt-task-h">{done[i] ? "Automated" : t.hours + " h / wk"}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="bdt-card bdt-meter" data-reveal>
            <Sprig className="bdt-meter-sprig" />
            <span className="bdt-k">Back every week</span>
            <div className="bdt-meter-n">
              {shown.toFixed(1)}
              <span>hours</span>
            </div>
            <p className="bdt-meter-x">That's {(Math.round(((hours * 4.33) / 8) * 10) / 10).toLocaleString("en-US")} working days a month, handed back.</p>
            <div className="bdt-bars">
              {teams.map((t) => (
                <div key={t.team} className="bdt-bar">
                  <span className="bdt-bar-l">{t.team}</span>
                  <span className="bdt-bar-track">
                    <span className="bdt-bar-auto" style={{ width: (t.auto / max) * 100 + "%" }} />
                    <span className="bdt-bar-man" style={{ width: (t.manual / max) * 100 + "%" }} />
                  </span>
                  <span className="bdt-bar-v">{t.auto ? t.auto + "h saved" : t.manual + "h"}</span>
                </div>
              ))}
            </div>
            <div className="bdt-meter-acts">
              <button type="button" className="bdt-btn bdt-btn-ink" onClick={() => setDone(tasks.map(() => !all))}>
                {all ? "Reset the board" : "Automate everything"}
              </button>
              <span className="bdt-legend"><i className="bdt-sw-a" /> automated <i className="bdt-sw-m" /> manual</span>
            </div>
          </div>
        </div>
        {stats && stats.length > 0 && (
          <div ref={statsRef} className="bdt-stats" data-reveal style={{ "--bdt-n": stats.length } as React.CSSProperties}>
            {stats.map((s) => <StatCell key={s.label} s={s} run={statsSeen} reduced={reduced} />)}
          </div>
        )}
      </div>
    </section>
  )
}

function StatCell({ s, run, reduced }: { s: BdtStat; run: boolean; reduced: boolean }) {
  const v = useTween(s.value, run, reduced, 0, 1400)
  return (
    <div className="bdt-stat">
      <span className="bdt-stat-v">{formatStat(s, v)}</span>
      <span className="bdt-stat-l">{s.label}</span>
    </div>
  )
}

/* --------------------------------- stories -------------------------------- */

function Stories({ cfg }: { cfg: { eyebrow: string; title: string; quotes: BdtQuote[] } }) {
  const track = React.useRef(null as HTMLDivElement | null)
  const [at, setAt] = React.useState(0)
  const n = cfg.quotes.length
  const onScroll = () => {
    const el = track.current
    if (!el) return
    const card = el.firstElementChild as HTMLElement | null
    const w = card ? card.offsetWidth + 20 : el.clientWidth
    setAt(clamp(Math.round(el.scrollLeft / w), 0, n - 1))
  }
  const goTo = (i: number) => {
    const el = track.current
    const card = el?.children[clamp(i, 0, n - 1)] as HTMLElement | undefined
    if (el && card) el.scrollTo({ left: card.offsetLeft - el.offsetLeft - 28, behavior: "smooth" })
  }
  return (
    <section className="bdt-sec bdt-paper bdt-stories" data-sec="stories">
      <div className="bdt-wrap">
        <div className="bdt-row-head" data-reveal>
          <div>
            <p className="bdt-eyebrow">{cfg.eyebrow}</p>
            <h2 className="bdt-h2">{cfg.title}</h2>
          </div>
          <div className="bdt-arrows">
            <button type="button" className="bdt-round" onClick={() => goTo(at - 1)} disabled={at === 0} aria-label="Previous story"><Arrow dir={-1} /></button>
            <button type="button" className="bdt-round" onClick={() => goTo(at + 1)} disabled={at >= n - 1} aria-label="Next story"><Arrow /></button>
          </div>
        </div>
        <div ref={track} className="bdt-track" onScroll={onScroll} data-reveal tabIndex={0} aria-label="Customer stories">
          {cfg.quotes.map((q, i) => (
            <figure key={q.name} className={"bdt-quote" + (i === at ? " bdt-cur" : "")}>
              <div className="bdt-quote-m">
                <strong>{q.metric.value}</strong>
                <span>{q.metric.label}</span>
              </div>
              <blockquote>{"“" + q.quote + "”"}</blockquote>
              <figcaption>
                <span className="bdt-av" style={{ "--bdt-hue": (i * 47) % 360 } as React.CSSProperties}>{q.name.replace(/^Dr\.\s*/, "").split(" ").map((w) => w[0]).join("").slice(0, 2)}</span>
                <span>
                  <strong>{q.name}</strong>
                  <span>{q.role + ", " + q.org}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
        <div className="bdt-dots" aria-hidden="true">
          {cfg.quotes.map((q, i) => <span key={q.name} className={i === at ? "bdt-cur" : ""} />)}
        </div>
      </div>
    </section>
  )
}

/* --------------------------------- pricing -------------------------------- */

function Price({ value, reduced }: { value: number; reduced: boolean }) {
  const v = useTween(value, true, reduced, value, 520)
  return <>{"$" + Math.round(v).toLocaleString("en-US")}</>
}

function Pricing({ cfg, reduced, go }: { cfg: { eyebrow: string; title: string; text: string; tiers: BdtTier[] }; reduced: boolean; go: (href: string) => void }) {
  const [yearly, setYearly] = React.useState(true)
  const [conns, setConns] = React.useState(8)
  return (
    <section className="bdt-sec bdt-night bdt-pricing" data-sec="pricing">
      <div className="bdt-stars" aria-hidden="true" />
      <BrandMark className="bdt-pricing-mark" size="100%" />
      <div className="bdt-wrap">
        <div className="bdt-head bdt-head-c" data-reveal>
          <p className="bdt-eyebrow">{cfg.eyebrow}</p>
          <h2 className="bdt-h2">{cfg.title}</h2>
          <p className="bdt-lede">{cfg.text}</p>
        </div>
        <div className="bdt-price-ctl" data-reveal>
          <div className="bdt-seg2" role="radiogroup" aria-label="Billing period">
            <span className="bdt-seg2-thumb" style={{ transform: yearly ? "translateX(100%)" : "none" }} />
            <button type="button" role="radio" aria-checked={!yearly} onClick={() => setYearly(false)}>Monthly</button>
            <button type="button" role="radio" aria-checked={yearly} onClick={() => setYearly(true)}>Yearly <em>−20%</em></button>
          </div>
          <label className="bdt-range">
            <span>
              Connections <strong>{conns}</strong>
            </span>
            <input type="range" min={1} max={30} value={conns} onChange={(e) => setConns(+e.target.value)} style={{ "--bdt-fill": ((conns - 1) / 29) * 100 + "%" } as React.CSSProperties} />
          </label>
        </div>
        <div className="bdt-tiers" style={{ "--bdt-n": cfg.tiers.length } as React.CSSProperties}>
          {cfg.tiers.map((t) => {
            const p = priceFor(t, conns, yearly)
            return (
              <div key={t.name} className={"bdt-tier" + (t.featured ? " bdt-featured" : "")} data-reveal>
                {t.featured && <span className="bdt-badge">Most loved</span>}
                <h3>{t.name}</h3>
                <p className="bdt-tier-x">{t.text}</p>
                <div className="bdt-tier-p">
                  {p == null ? <span className="bdt-tier-n">Custom</span> : <span className="bdt-tier-n"><Price value={p} reduced={reduced} /></span>}
                  {p != null && <span className="bdt-tier-u">/ month{yearly ? ", billed yearly" : ""}</span>}
                </div>
                {p != null && t.base != null && conns > t.included && <p className="bdt-tier-extra">{"Includes " + (conns - t.included) + " extra connection" + (conns - t.included === 1 ? "" : "s")}</p>}
                <button type="button" className={"bdt-btn " + (t.featured ? "bdt-btn-white" : "bdt-btn-glass")} onClick={() => go("#start")}>{t.button ?? "Get started"}</button>
                <ul>
                  {t.features.map((f) => (
                    <li key={f}><Check /> {f}</li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ---------------------------------- faq ----------------------------------- */

function Faq({ cfg }: { cfg: { title: string; items: BdtFaq[] } }) {
  const [open, setOpen] = React.useState(0)
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "")
  return (
    <section className="bdt-sec bdt-paper bdt-faq" data-sec="faq">
      <div className="bdt-wrap bdt-faq-grid">
        <h2 className="bdt-h2" data-reveal>{cfg.title}</h2>
        <div className="bdt-qs" data-reveal>
          {cfg.items.map((x, i) => (
            <div key={x.q} className={"bdt-q" + (open === i ? " bdt-q-open" : "")}>
              <button type="button" aria-expanded={open === i} aria-controls={uid + "-" + i} onClick={() => setOpen(open === i ? -1 : i)}>
                {x.q}
                <span className="bdt-plus" aria-hidden="true" />
              </button>
              <div id={uid + "-" + i} className="bdt-a" role="region">
                <div><p>{x.a}</p></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */

export default function BlossomDuskTemplate({
  brand = "runcycle",
  logo,
  nav,
  hero,
  image,
  seed = 7,
  logos,
  logosTitle = "Trusted by care teams at",
  hub,
  busywork,
  stats,
  stories,
  pricing,
  faq,
  cta,
  footer,
  palette = "dusk",
  demoVideo,
  onGetStarted,
  height = "100svh",
  className,
}: BlossomDuskTemplateProps) {
  const uid = "bdt" + React.useId().replace(/[^a-zA-Z0-9]/g, "")
  const reduced = useReducedMotion()
  const pal = React.useMemo(() => resolvePalette(palette), [typeof palette === "string" ? palette : JSON.stringify(palette)])
  const Brand = brand.charAt(0).toUpperCase() + brand.slice(1)
  const rootRef = React.useRef(null as HTMLDivElement | null)
  const heroRef = React.useRef(null as HTMLElement | null)
  const ctaRef = React.useRef(null as HTMLElement | null)
  const emailRef = React.useRef(null as HTMLInputElement | null)

  const navCfg = nav === null ? null : {
    items: nav?.items ?? [
      {
        label: "Features",
        items: [
          { label: "Integrations", text: "Sync records, labs and devices", href: "#connect" },
          { label: "Automations", text: "Retire the copy-and-paste", href: "#automate" },
          { label: "Insights", text: "See every handoff, live", href: "#stories" },
          { label: "Security", text: "HIPAA, SOC 2 and a BAA", href: "#faq" },
        ],
      },
      {
        label: "Resources",
        items: [
          { label: "Blogs", href: "#" },
          { label: "Case study", href: "#stories" },
          { label: "About us", href: "#" },
          { label: "Careers", href: "#" },
        ],
      },
      {
        label: "Company",
        items: [
          { label: "Our story", href: "#" },
          { label: "Customers", href: "#stories" },
          { label: "Press", href: "#" },
          { label: "Contact", href: "#start" },
        ],
      },
      { label: "Pricing", href: "#pricing" },
    ],
    login: nav?.login ?? { label: "Sign in", href: "#" },
    cta: nav?.cta ?? { label: "Get started", href: "#start" },
  }
  const heroCfg = hero === null ? null : {
    title: hero?.title ?? "Connect the dots.",
    accent: hero?.accent ?? "Skip the busywork.",
    text: hero?.text ?? Brand + " connects your entire health stack, so your team spends less time wiring things up and more on what matters.",
    primary: hero?.primary ?? { label: "Get started today", href: "#start" },
    secondary: hero?.secondary ?? { label: "Watch demo", href: "#demo" },
  }
  const hubCfg = hub === null ? null : {
    eyebrow: hub?.eyebrow ?? "Integrations",
    title: hub?.title ?? "Every system on one wheel.",
    text: hub?.text ?? "Records, labs, devices, pharmacy and billing, each a spoke on the same hub. Pick one to watch its traffic, or pause it without touching the rest.",
    integrations: hub?.integrations?.length ? hub.integrations : DEFAULT_INTEGRATIONS,
  }
  const busyCfg = busywork === null ? null : {
    eyebrow: busywork?.eyebrow ?? "Automations",
    title: busywork?.title ?? "Skip the busywork.",
    text: busywork?.text ?? "Every clinic has a list like this. Tick off what " + Brand + " should take over and watch the week come back.",
    tasks: busywork?.tasks?.length ? busywork.tasks : DEFAULT_TASKS,
  }
  const storyCfg = stories === null ? null : {
    eyebrow: stories?.eyebrow ?? "Case studies",
    title: stories?.title ?? "Teams that got their afternoons back.",
    quotes: stories?.quotes?.length ? stories.quotes : DEFAULT_QUOTES,
  }
  const priceCfg = pricing === null ? null : {
    eyebrow: pricing?.eyebrow ?? "Pricing",
    title: pricing?.title ?? "Pay for the connections you use.",
    text: pricing?.text ?? "Every plan comes with a BAA, the exceptions inbox, and no per-seat fees. Slide to your stack.",
    tiers: pricing?.tiers?.length ? pricing.tiers : DEFAULT_TIERS,
  }
  const faqCfg = faq === null ? null : { title: faq?.title ?? "Questions, answered.", items: faq?.items?.length ? faq.items : DEFAULT_FAQ }
  const ctaCfg = cta === null ? null : {
    title: cta?.title ?? "Your stack, finally in sync.",
    text: cta?.text ?? "Connect your first three systems free. Most teams are live the same afternoon.",
    button: cta?.button ?? "Get started",
    placeholder: cta?.placeholder ?? "you@clinic.com",
  }
  const footCfg = footer === null ? null : {
    columns: footer?.columns ?? [
      { title: "Product", links: [{ label: "Integrations", href: "#connect" }, { label: "Automations", href: "#automate" }, { label: "Pricing", href: "#pricing" }, { label: "Changelog", href: "#" }] },
      { title: "Resources", links: [{ label: "Blogs", href: "#" }, { label: "Case studies", href: "#stories" }, { label: "Docs", href: "#" }, { label: "Status", href: "#" }] },
      { title: "Company", links: [{ label: "About us", href: "#" }, { label: "Careers", href: "#" }, { label: "Security", href: "#faq" }, { label: "Contact", href: "#start" }] },
    ],
    note: footer?.note ?? "© 2026 " + Brand + " Health, Inc.",
    tagline: footer?.tagline ?? "One hub for the whole health stack.",
    legal: footer?.legal ?? "HIPAA · SOC 2 Type II · BAA on every plan",
  }
  const logoList = logos === null ? null : logos?.length ? logos : DEFAULT_LOGOS
  const statList = stats === null ? null : stats?.length ? stats : DEFAULT_STATS

  /* ---- nav ---- */
  const [menu, setMenu] = React.useState(-1)
  const [sheet, setSheet] = React.useState(false)
  const [solid, setSolid] = React.useState(false)
  const [light, setLight] = React.useState(false)
  const [demo, setDemo] = React.useState(false)
  React.useEffect(() => {
    const on = () => {
      setSolid(window.scrollY > 24 || (rootRef.current?.getBoundingClientRect().top ?? 0) < -24)
      // over a light section the bar turns to paper, so it never sits grey on cream
      const papers = rootRef.current?.querySelectorAll(".bdt-paper") ?? []
      let over = false
      papers.forEach((el) => {
        const r = el.getBoundingClientRect()
        if (r.top <= 38 && r.bottom > 38) over = true
      })
      setLight(over)
    }
    on()
    window.addEventListener("scroll", on, { passive: true })
    return () => window.removeEventListener("scroll", on)
  }, [])
  React.useEffect(() => {
    if (menu < 0) return
    const close = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest(".bdt-navli")) setMenu(-1)
    }
    document.addEventListener("pointerdown", close)
    return () => document.removeEventListener("pointerdown", close)
  }, [menu])
  React.useEffect(() => {
    if (!sheet) return
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setSheet(false)
    window.addEventListener("keydown", esc)
    return () => window.removeEventListener("keydown", esc)
  }, [sheet])

  const go = (href: string | undefined, e?: React.MouseEvent) => {
    if (!href || !href.startsWith("#")) return
    const key = href.slice(1)
    if (key === "demo") {
      e?.preventDefault()
      setMenu(-1)
      setSheet(false)
      setDemo(true)
      return
    }
    const el = rootRef.current?.querySelector('[data-sec="' + key + '"]') as HTMLElement | null
    if (!el && key) return
    e?.preventDefault()
    setMenu(-1)
    setSheet(false)
    if (!el) return
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" })
    if (key === "start") setTimeout(() => emailRef.current?.focus({ preventScroll: true }), reduced ? 0 : 700)
  }

  /* ---- reveal on scroll ---- */
  React.useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const els = Array.from(root.querySelectorAll("[data-reveal]"))
    if (reduced || typeof IntersectionObserver === "undefined") {
      els.forEach((el) => el.setAttribute("data-in", ""))
      return
    }
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es)
          if (e.isIntersecting) {
            e.target.setAttribute("data-in", "")
            io.unobserve(e.target)
          }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [reduced])

  /* ---- the closing form ---- */
  const [email, setEmail] = React.useState("")
  const [formState, setFormState] = React.useState("idle")
  const [formError, setFormError] = React.useState("")
  const alive = React.useRef(true)
  React.useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEmail(email)) {
      setFormError("That email doesn't look right.")
      setFormState("invalid")
      emailRef.current?.focus()
      return
    }
    setFormError("")
    setFormState("sending")
    let ok = true
    try {
      if (onGetStarted) {
        const res = await onGetStarted(email.trim())
        if (res === false) ok = false
      } else await new Promise((r) => setTimeout(r, 900))
    } catch {
      ok = false
    }
    if (!alive.current) return
    if (ok) setFormState("sent")
    else {
      setFormState("error")
      setFormError("Something went wrong. Try again in a moment.")
    }
  }

  const words = (s: string, at: number, cls: string) =>
    s.split(" ").map((w, i) => (
      <span key={cls + i} className={"bdt-word " + cls} style={{ animationDelay: (at + i * 0.07).toFixed(2) + "s" }}>
        {w + " "}
      </span>
    ))

  const vars = {
    "--bdt-h": height,
    "--bdt-sky-a": pal.sky[0],
    "--bdt-sky-b": pal.sky[1],
    "--bdt-sky-c": pal.sky[2],
    "--bdt-glow": pal.glow,
    "--bdt-hero-ink": pal.heroInk,
    "--bdt-hero-muted": pal.heroMuted,
    "--bdt-night": pal.night,
    "--bdt-night-soft": pal.nightSoft,
    "--bdt-night-ink": pal.nightInk,
    "--bdt-paper": pal.paper,
    "--bdt-paper-soft": pal.paperSoft,
    "--bdt-ink": pal.paperInk,
    "--bdt-muted": pal.paperMuted,
    "--bdt-rule": pal.rule,
    "--bdt-accent": pal.accent,
    "--bdt-petal-a": pal.petal[0],
    "--bdt-petal-b": pal.petal[1],
    "--bdt-petal-c": pal.petal[2],
    "--bdt-eye": pal.eye,
    "--bdt-bark": pal.bark,
  } as React.CSSProperties

  return (
    <div ref={rootRef} className={"bdt-root" + (className ? " " + className : "")} style={vars}>
      <style>{BDT_CSS}</style>

      {navCfg && (
        <header className={"bdt-nav" + (solid ? " bdt-solid" : "") + (solid && light ? " bdt-light" : "")}>
          <div className="bdt-nav-in">
            <a href="#" className="bdt-logo" onClick={(e) => { e.preventDefault(); rootRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" }) }} aria-label={Brand + " home"}>
              {logo ?? <BrandMark size={20} />}
              <span>{brand}</span>
            </a>
            <nav aria-label="Main">
              <ul className="bdt-links">
                {navCfg.items.map((x, i) =>
                  x.items?.length ? (
                    <NavMenu key={x.label} item={x} i={i} open={menu} setOpen={setMenu} go={go} />
                  ) : (
                    <li key={x.label} className="bdt-navli">
                      <a className="bdt-navlink" href={x.href ?? "#"} onClick={(e) => go(x.href, e)}>{x.label}</a>
                    </li>
                  ),
                )}
              </ul>
            </nav>
            <div className="bdt-nav-r">
              <a className="bdt-signin" href={navCfg.login.href ?? "#"} onClick={(e) => go(navCfg.login.href, e)}>{navCfg.login.label}</a>
              <a className="bdt-btn bdt-btn-white bdt-btn-sm" href={navCfg.cta.href ?? "#"} onClick={(e) => go(navCfg.cta.href, e)}>{navCfg.cta.label}</a>
              <button type="button" className="bdt-burger" aria-expanded={sheet} aria-label={sheet ? "Close menu" : "Open menu"} onClick={() => setSheet(!sheet)}>
                <span /><span />
              </button>
            </div>
          </div>
          <div className="bdt-sheet" data-open={sheet ? "" : undefined} hidden={!sheet}>
            {navCfg.items.map((x) => (
              <div key={x.label} className="bdt-sheet-g">
                {x.items?.length ? (
                  <>
                    <span className="bdt-sheet-h">{x.label}</span>
                    {x.items.map((y) => <a key={y.label} href={y.href ?? "#"} onClick={(e) => go(y.href, e)}>{y.label}</a>)}
                  </>
                ) : (
                  <a className="bdt-sheet-top" href={x.href ?? "#"} onClick={(e) => go(x.href, e)}>{x.label}</a>
                )}
              </div>
            ))}
            <div className="bdt-sheet-acts">
              <a className="bdt-btn bdt-btn-glass" href={navCfg.login.href ?? "#"} onClick={(e) => go(navCfg.login.href, e)}>{navCfg.login.label}</a>
              <a className="bdt-btn bdt-btn-white" href={navCfg.cta.href ?? "#"} onClick={(e) => go(navCfg.cta.href, e)}>{navCfg.cta.label}</a>
            </div>
          </div>
        </header>
      )}

      {heroCfg && (
        <section ref={heroRef} className="bdt-hero" data-sec="top">
          <div className="bdt-sky" aria-hidden="true" />
          {image && <img className="bdt-photo" src={image} alt="" width={1920} height={1080} />}
          <BrandMark className="bdt-watermark" size="100%" draw={!reduced} />
          <Canopy pal={pal} seed={seed} reduced={reduced} host={heroRef} variant="hero" boughs={!image} />
          <div className="bdt-hero-in">
            <h1 className="bdt-h1">
              {words(heroCfg.title, 0.35, "bdt-w1")}
              <span className="bdt-h1-acc">{words(heroCfg.accent, 0.35 + heroCfg.title.split(" ").length * 0.07 + 0.08, "bdt-w2")}</span>
            </h1>
            <div className="bdt-hero-side">
              <p>{heroCfg.text}</p>
              <div className="bdt-hero-acts">
                <a className="bdt-btn bdt-btn-white" href={heroCfg.primary.href ?? "#"} onClick={(e) => go(heroCfg.primary.href, e)}>{heroCfg.primary.label}</a>
                <a className="bdt-btn bdt-btn-glass" href={heroCfg.secondary.href ?? "#"} onClick={(e) => go(heroCfg.secondary.href, e)}>
                  <span className="bdt-playdot" aria-hidden="true" />
                  {heroCfg.secondary.label}
                </a>
              </div>
            </div>
          </div>
          {logoList && (
            <div className="bdt-logos">
              <span className="bdt-logos-k">{logosTitle}</span>
              <div className="bdt-marquee">
                <div className="bdt-marquee-in">
                  {[...logoList, ...logoList].map((l, i) => <span key={i} className={"bdt-logo-" + (i % 3)} aria-hidden={i >= logoList.length ? true : undefined}>{l}</span>)}
                </div>
              </div>
            </div>
          )}
          <span className="bdt-hint-sky" aria-hidden="true">Click the sky</span>
        </section>
      )}

      {hubCfg && <Hub cfg={hubCfg} reduced={reduced} uid={uid} />}
      {busyCfg && <Busywork cfg={busyCfg} reduced={reduced} stats={statList} />}
      {storyCfg && <Stories cfg={storyCfg} />}
      {priceCfg && <Pricing cfg={priceCfg} reduced={reduced} go={(h) => go(h)} />}
      {faqCfg && <Faq cfg={faqCfg} />}

      {(ctaCfg || footCfg) && (
        <section ref={ctaRef} className="bdt-end" data-sec="start">
          <div className="bdt-sky bdt-sky-end" aria-hidden="true" />
          <Canopy pal={pal} seed={seed + 11} reduced={reduced} host={ctaRef} variant="cta" boughs />
          {ctaCfg && (
            <div className="bdt-cta" data-reveal>
              <BrandMark size={34} className="bdt-cta-mark" />
              <h2 className="bdt-h2 bdt-cta-h">{ctaCfg.title}</h2>
              <p className="bdt-lede">{ctaCfg.text}</p>
              {formState === "sent" ? (
                <div className="bdt-sent" role="status">
                  <span className="bdt-sent-i"><Check size={16} /></span>
                  <span>
                    <strong>Check your inbox.</strong> A setup link is on its way to {email.trim()}.
                  </span>
                  <button type="button" className="bdt-linkbtn" onClick={() => { setFormState("idle"); setEmail("") }}>Use another email</button>
                </div>
              ) : (
                <form className={"bdt-form" + (formState === "invalid" || formState === "error" ? " bdt-bad" : "")} onSubmit={submit} noValidate>
                  <label className="bdt-sr" htmlFor={uid + "-email"}>Work email</label>
                  <input
                    ref={emailRef}
                    id={uid + "-email"}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder={ctaCfg.placeholder}
                    value={email}
                    aria-invalid={formState === "invalid" || undefined}
                    aria-describedby={formError ? uid + "-err" : undefined}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (formState === "invalid" || formState === "error") setFormState("idle")
                    }}
                  />
                  <button type="submit" className="bdt-btn bdt-btn-white" disabled={formState === "sending"}>
                    {formState === "sending" ? <span className="bdt-spin" aria-label="Sending" /> : ctaCfg.button}
                  </button>
                </form>
              )}
              <p className="bdt-form-err" id={uid + "-err"} role="alert">{formState === "invalid" || formState === "error" ? formError : ""}</p>
            </div>
          )}
          {footCfg && (
            <footer className="bdt-foot">
              <div className="bdt-foot-top">
                <div className="bdt-foot-brand">
                  <span className="bdt-logo">
                    {logo ?? <BrandMark size={20} />}
                    <span>{brand}</span>
                  </span>
                  <p>{footCfg.tagline}</p>
                </div>
                {footCfg.columns.map((c) => (
                  <div key={c.title} className="bdt-foot-col">
                    <span>{c.title}</span>
                    {c.links.map((l) => <a key={l.label} href={l.href ?? "#"} onClick={(e) => go(l.href, e)}>{l.label}</a>)}
                  </div>
                ))}
              </div>
              <div className="bdt-word-big" aria-hidden="true">{brand}</div>
              <div className="bdt-foot-bot">
                <span>{footCfg.note}</span>
                <span>{footCfg.legal}</span>
              </div>
            </footer>
          )}
        </section>
      )}

      {demo && <DemoModal onClose={() => setDemo(false)} video={demoVideo} reduced={reduced} brand={Brand} />}
    </div>
  )
}

const BDT_FONT = '"Inter Tight", "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

const BDT_CSS = `
.bdt-root{position:relative;overflow-x:clip;background:var(--bdt-night);color:var(--bdt-ink);font-family:FONT;line-height:1.5;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;isolation:isolate;text-rendering:optimizeLegibility}
.bdt-root *,.bdt-root *::before,.bdt-root *::after{box-sizing:border-box}
.bdt-root :where(button){font:inherit;color:inherit;background:none;border:0;padding:0;margin:0;cursor:pointer;text-align:inherit}
.bdt-root :where(a){color:inherit;text-decoration:none}
.bdt-root :where(h1,h2,h3,p,ul,ol,figure,blockquote){margin:0;padding:0}
.bdt-root :where(ul,ol){list-style:none}
.bdt-root :where(a,button,input,[tabindex]):focus-visible{outline:2px solid var(--bdt-accent);outline-offset:3px}
.bdt-svg{display:block;max-width:none;flex:none;overflow:visible}
.bdt-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}

/* nav */
.bdt-nav{position:sticky;top:0;z-index:40;height:76px;margin-bottom:-76px;color:var(--bdt-hero-ink);text-shadow:0 1px 14px color-mix(in srgb,var(--bdt-sky-c) 55%,transparent);transition:color .4s}
.bdt-solid,.bdt-nav .bdt-btn,.bdt-drop{text-shadow:none}
.bdt-nav::before{content:"";position:absolute;inset:0;background:color-mix(in srgb,var(--bdt-night) 66%,transparent);-webkit-backdrop-filter:blur(18px) saturate(1.4);backdrop-filter:blur(18px) saturate(1.4);border-bottom:1px solid rgba(255,255,255,.08);opacity:0;transition:opacity .45s}
.bdt-solid{color:var(--bdt-night-ink)}
.bdt-solid::before{opacity:1}
.bdt-light{color:var(--bdt-ink)}
.bdt-light::before{background:color-mix(in srgb,var(--bdt-paper) 74%,transparent);border-bottom-color:var(--bdt-rule)}
.bdt-light .bdt-navlink:hover,.bdt-light .bdt-navlink[aria-expanded=true]{background:color-mix(in srgb,var(--bdt-ink) 8%,transparent)}
.bdt-light .bdt-btn-white{background:var(--bdt-ink);color:var(--bdt-paper);box-shadow:none}
.bdt-light .bdt-burger{background:color-mix(in srgb,var(--bdt-ink) 8%,transparent)}
.bdt-light .bdt-drop{color:var(--bdt-ink);background:color-mix(in srgb,var(--bdt-paper) 92%,transparent);border-color:var(--bdt-rule)}
.bdt-light .bdt-dropitem:hover,.bdt-light .bdt-dropitem:focus-visible{background:color-mix(in srgb,var(--bdt-ink) 7%,transparent)}
.bdt-nav-in{position:relative;height:76px;max-width:1440px;margin:0 auto;padding:0 clamp(16px,4.6vw,64px);display:flex;align-items:center;gap:24px}
.bdt-logo{display:inline-flex;align-items:center;gap:9px;font-size:22px;font-weight:600;letter-spacing:-.045em;flex:none}
.bdt-nav nav{flex:1;display:flex;justify-content:center}
.bdt-links{display:flex;gap:2px}
.bdt-navli{position:relative}
.bdt-navlink{display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 13px;border-radius:999px;font-size:14.5px;letter-spacing:-.005em;transition:background .25s}
.bdt-navlink:hover,.bdt-navlink[aria-expanded=true]{background:rgba(255,255,255,.13)}
.bdt-chev{opacity:.8;transition:transform .35s cubic-bezier(.2,.8,.2,1)}
.bdt-chev-open{transform:rotate(180deg)}
.bdt-drop{position:absolute;top:calc(100% + 12px);left:-2px;min-width:180px;padding:9px;border-radius:16px;display:grid;gap:1px;background:color-mix(in srgb,var(--bdt-sky-b) 34%,rgba(255,255,255,.08));-webkit-backdrop-filter:blur(22px) saturate(1.5);backdrop-filter:blur(22px) saturate(1.5);border:1px solid rgba(255,255,255,.34);box-shadow:0 24px 60px -24px rgba(12,20,50,.5),inset 0 1px 0 rgba(255,255,255,.22);transform-origin:16px 0;animation:bdt-pop .32s cubic-bezier(.2,.8,.2,1)}
.bdt-drop::before{content:"";position:absolute;left:0;right:0;top:-14px;height:14px}
.bdt-drop[hidden]{display:none}
.bdt-solid .bdt-drop{background:color-mix(in srgb,var(--bdt-night) 86%,transparent)}
.bdt-drop-wide{min-width:290px}
.bdt-dropitem{display:grid;gap:1px;padding:8px 11px;border-radius:10px;font-size:14.5px;transition:background .2s,transform .2s}
.bdt-dropitem:hover,.bdt-dropitem:focus-visible{background:rgba(255,255,255,.15);outline:none;transform:translateX(2px)}
.bdt-dropt{font-size:12.5px;opacity:.68}
.bdt-nav-r{display:flex;align-items:center;gap:22px;flex:none}
.bdt-signin{font-size:14.5px;opacity:.95}
.bdt-signin:hover{opacity:1;text-decoration:underline;text-underline-offset:4px}
.bdt-burger{display:none;width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.14);flex-direction:column;align-items:center;justify-content:center;gap:5px}
.bdt-burger span{display:block;width:16px;height:1.5px;background:currentColor;border-radius:2px;transition:transform .3s}
.bdt-burger[aria-expanded=true] span:first-child{transform:translateY(3.25px) rotate(45deg)}
.bdt-burger[aria-expanded=true] span:last-child{transform:translateY(-3.25px) rotate(-45deg)}
.bdt-sheet{position:absolute;top:72px;left:12px;right:12px;padding:20px;border-radius:22px;display:grid;gap:18px;color:var(--bdt-night-ink);background:color-mix(in srgb,var(--bdt-night) 90%,transparent);-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.12);max-height:calc(100svh - 96px);overflow:auto;animation:bdt-pop .3s cubic-bezier(.2,.8,.2,1)}
.bdt-sheet[hidden]{display:none}
.bdt-sheet-g{display:grid;gap:8px}
.bdt-sheet-h{font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.5}
.bdt-sheet-g a{font-size:17px}
.bdt-sheet-top{font-size:20px !important}
.bdt-sheet-acts{display:grid;grid-template-columns:1fr 1fr;gap:10px}

/* buttons */
.bdt-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;height:46px;padding:0 22px;border-radius:999px;font-size:15px;font-weight:500;letter-spacing:-.01em;white-space:nowrap;transition:transform .3s cubic-bezier(.2,.8,.2,1),background .25s,box-shadow .3s,border-color .25s}
.bdt-btn:active{transform:scale(.97)}
.bdt-btn:disabled{cursor:progress}
.bdt-btn-sm{height:38px;padding:0 17px;font-size:14px}
.bdt-btn-white{background:#fff;color:#151b34;box-shadow:0 10px 26px -12px rgba(16,24,64,.55)}
.bdt-btn-white:hover{transform:translateY(-1px);box-shadow:0 16px 32px -14px rgba(16,24,64,.6)}
.bdt-btn-glass{background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.42);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
.bdt-btn-glass:hover{background:rgba(255,255,255,.22);border-color:rgba(255,255,255,.7)}
.bdt-btn-ink{background:var(--bdt-ink);color:var(--bdt-paper)}
.bdt-btn-ink:hover{transform:translateY(-1px)}
.bdt-playdot{width:0;height:0;border-left:8px solid currentColor;border-top:5px solid transparent;border-bottom:5px solid transparent;margin-right:-2px}

/* hero */
.bdt-hero{position:relative;min-height:var(--bdt-h);overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end;color:var(--bdt-hero-ink);isolation:isolate}
.bdt-sky{position:absolute;inset:0;z-index:-3;background:radial-gradient(90% 60% at 50% 8%,color-mix(in srgb,var(--bdt-glow) 26%,transparent),transparent 62%),radial-gradient(60% 50% at 50% 100%,color-mix(in srgb,var(--bdt-sky-c) 70%,#000 6%),transparent 70%),linear-gradient(180deg,var(--bdt-sky-a) 0%,var(--bdt-sky-b) 48%,var(--bdt-sky-c) 100%)}
.bdt-photo{position:absolute;inset:0;z-index:-3;width:100%;height:100%;max-width:none;object-fit:cover}
.bdt-watermark{position:absolute;z-index:-2;left:50%;top:56%;width:clamp(240px,27vw,430px);height:clamp(240px,27vw,430px);color:var(--bdt-hero-ink);opacity:calc(.15 - var(--bdt-p,0) * .15);transform:translate(-50%,-50%) perspective(900px) rotateX(calc(var(--bdt-my,0) * -10deg)) rotateY(calc(var(--bdt-mx,0) * 14deg)) rotate(calc(var(--bdt-p,0) * 60deg)) scale(calc(1 + var(--bdt-p,0) * .35));pointer-events:none}
.bdt-draw{stroke-dasharray:1;stroke-dashoffset:1;animation:bdt-draw 1.2s cubic-bezier(.65,0,.35,1) forwards}
.bdt-canopy{position:absolute;inset:0;pointer-events:none}
.bdt-bough{position:absolute;top:-8%;width:clamp(520px,58vw,1180px);aspect-ratio:1000/720;z-index:0}
.bdt-bough-l{left:-3%}
.bdt-bough-r{right:-4%;top:-3%}
.bdt-layer{position:absolute;inset:0;width:100%;height:100%;max-width:none;will-change:transform}
.bdt-bough-l .bdt-layer{transform-origin:0 0}
.bdt-bough-r .bdt-layer{transform-origin:100% 0}
.bdt-layer-back{filter:blur(2.2px);opacity:.82;translate:7% 5%;scale:.9}
.bdt-bough-r .bdt-layer-back{translate:-9% 9%}
.bdt-layer-near{filter:blur(10px);opacity:.78;translate:4% -3%}
.bdt-bough-r .bdt-layer-near{translate:-6% -4%}
.bdt-petals{position:absolute;inset:0;z-index:3;width:100%;height:100%;max-width:none;pointer-events:none}
.bdt-hero-in{position:relative;z-index:2;width:100%;max-width:1440px;margin:0 auto;padding:44vh clamp(16px,4.6vw,64px) clamp(36px,7vh,80px);display:grid;grid-template-columns:minmax(0,1.25fr) minmax(250px,.6fr);align-items:end;gap:40px;transform:translateY(calc(var(--bdt-p,0) * -70px));opacity:calc(1 - var(--bdt-p,0) * 1.5)}
.bdt-h1{font-size:clamp(46px,6.3vw,96px);line-height:1.01;letter-spacing:-.048em;font-weight:450;max-width:7.4em}
.bdt-word{display:inline-block;white-space:pre;animation:bdt-rise 1.1s cubic-bezier(.2,.8,.2,1) both}
.bdt-h1-acc{color:var(--bdt-hero-muted)}
.bdt-hero-side{justify-self:end;max-width:22.5em;animation:bdt-rise 1.1s .95s cubic-bezier(.2,.8,.2,1) both}
.bdt-hero-side p{font-size:clamp(15px,1.15vw,16.5px);line-height:1.5;margin-bottom:26px;text-wrap:pretty}
.bdt-hero-acts{display:flex;gap:12px;flex-wrap:wrap}
.bdt-logos{position:relative;z-index:2;width:100%;max-width:1440px;margin:0 auto;padding:0 clamp(16px,4.6vw,64px) 22px;display:flex;align-items:center;gap:32px;font-size:15px;animation:bdt-fade 1.2s 1.4s both}
.bdt-logos-k{flex:none;font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.65}
.bdt-marquee{flex:1;overflow:hidden;padding-top:18px;border-top:1px solid color-mix(in srgb,var(--bdt-hero-ink) 18%,transparent);-webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}
.bdt-marquee-in{display:flex;width:max-content;animation:bdt-marquee 46s linear infinite}
.bdt-marquee-in span{padding-right:64px;opacity:.78;white-space:nowrap}
.bdt-logo-0{font-weight:700;letter-spacing:-.03em}
.bdt-logo-1{font-family:Georgia,"Times New Roman",serif;font-style:italic;font-size:16.5px}
.bdt-logo-2{font-size:12.5px;font-weight:600;letter-spacing:.22em;text-transform:uppercase}
.bdt-hint-sky{position:absolute;z-index:2;left:50%;top:calc(56% + clamp(150px,16vw,240px));transform:translateX(-50%);font-size:11px;letter-spacing:.2em;text-transform:uppercase;opacity:0;pointer-events:none;animation:bdt-hint 7s 2.6s both}

/* sections */
.bdt-sec{position:relative;padding:clamp(88px,11vw,150px) 0;overflow:hidden}
.bdt-wrap{position:relative;max-width:1240px;margin:0 auto;padding:0 clamp(16px,4.6vw,48px)}
.bdt-eyebrow{display:inline-flex;align-items:center;gap:10px;margin-bottom:18px;font-size:12.5px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--bdt-accent)}
.bdt-eyebrow::before{content:"";width:8px;height:8px;border-radius:50% 0 50% 50%;background:currentColor;transform:rotate(-45deg)}
.bdt-paper .bdt-eyebrow{color:color-mix(in srgb,var(--bdt-petal-c) 70%,var(--bdt-ink))}
.bdt-h2{font-size:clamp(36px,4.6vw,64px);line-height:1.03;letter-spacing:-.042em;font-weight:450;text-wrap:balance}
.bdt-lede{margin-top:18px;max-width:34em;font-size:clamp(16px,1.3vw,18px);line-height:1.55;opacity:.76;text-wrap:pretty}
.bdt-head{max-width:740px;margin-bottom:clamp(40px,5vw,64px)}
.bdt-head-c{margin-left:auto;margin-right:auto;text-align:center}
.bdt-head-c .bdt-lede{margin-left:auto;margin-right:auto}
.bdt-paper{background:var(--bdt-paper);color:var(--bdt-ink)}
.bdt-night{background:var(--bdt-night);color:var(--bdt-night-ink)}
.bdt-card{border-radius:22px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12)}
.bdt-k{font-size:12px;letter-spacing:.02em;opacity:.62}
.bdt-stars{position:absolute;inset:0;pointer-events:none;opacity:.5;background-image:radial-gradient(1.3px 1.3px at 12% 18%,#fff,transparent),radial-gradient(1px 1px at 33% 72%,#fff,transparent),radial-gradient(1.1px 1.1px at 58% 34%,#fff,transparent),radial-gradient(1px 1px at 81% 12%,#fff,transparent),radial-gradient(1.4px 1.4px at 91% 63%,#fff,transparent),radial-gradient(1px 1px at 47% 91%,#fff,transparent),radial-gradient(1px 1px at 6% 56%,#fff,transparent);background-size:560px 560px;animation:bdt-twinkle 7s ease-in-out infinite alternate}
.bdt-root [data-reveal]{opacity:0;transform:translateY(26px);transition:opacity 1s cubic-bezier(.2,.8,.2,1),transform 1s cubic-bezier(.2,.8,.2,1)}
.bdt-root [data-reveal][data-in]{opacity:1;transform:none}

/* hub */
.bdt-hub{color:var(--bdt-night-ink);background:radial-gradient(70% 55% at 72% 46%,var(--bdt-night-soft),transparent 72%),linear-gradient(180deg,var(--bdt-sky-c) 0%,var(--bdt-night) 26%,var(--bdt-night) 100%)}
.bdt-hub-grid{display:grid;grid-template-columns:minmax(0,.92fr) minmax(0,1.08fr);gap:clamp(36px,5vw,80px);align-items:center}
.bdt-node-card{margin-top:36px;padding:20px;-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}
.bdt-nc-head{display:flex;align-items:center;gap:14px}
.bdt-nc-icon{width:46px;height:46px;border-radius:15px;display:grid;place-items:center;flex:none;color:#fff;background:linear-gradient(135deg,var(--bdt-petal-b),var(--bdt-petal-c));box-shadow:0 10px 24px -10px var(--bdt-petal-c)}
.bdt-nc-name{flex:1;min-width:0;display:grid}
.bdt-nc-name strong{font-size:17px;font-weight:500}
.bdt-nc-name span{font-size:13px;opacity:.62}
.bdt-switch{position:relative;width:46px;height:26px;flex:none;border-radius:99px;background:rgba(255,255,255,.18);transition:background .3s}
.bdt-switch span{position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,.25);transition:transform .4s cubic-bezier(.3,1.4,.5,1)}
.bdt-switch[aria-checked=true]{background:var(--bdt-accent)}
.bdt-switch[aria-checked=true] span{transform:translateX(20px)}
.bdt-nc-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;margin:18px 0 10px;border-radius:14px;overflow:hidden;background:rgba(255,255,255,.1)}
.bdt-nc-stats div{display:grid;gap:3px;padding:12px 14px;background:color-mix(in srgb,var(--bdt-night) 90%,#fff)}
.bdt-v{font-size:17px;font-weight:500;font-variant-numeric:tabular-nums;white-space:nowrap}
.bdt-status{display:inline-flex;align-items:center;gap:7px;opacity:.65}
.bdt-status::before{content:"";width:7px;height:7px;border-radius:50%;background:currentColor}
.bdt-live{color:#8be3b0;opacity:1}
.bdt-live::before{animation:bdt-beat 1.6s ease-out infinite}
.bdt-log{display:grid;min-height:192px;align-content:start}
.bdt-log-row{display:flex;align-items:center;gap:10px;padding:9px 4px;font-size:13.5px;border-top:1px solid rgba(255,255,255,.07);animation:bdt-drop-in .55s cubic-bezier(.2,.8,.2,1) both}
.bdt-log-row:first-child{border-top:0}
.bdt-log-row:first-child .bdt-log-dot{background:var(--bdt-accent);box-shadow:0 0 0 4px color-mix(in srgb,var(--bdt-accent) 25%,transparent)}
.bdt-log-dot{width:6px;height:6px;border-radius:50%;flex:none;background:rgba(255,255,255,.35)}
.bdt-log-t{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums}
.bdt-log-s{font-size:12px;opacity:.5;flex:none}
.bdt-log-empty{font-size:13.5px;opacity:.5;padding:9px 4px}
.bdt-wheel-wrap{min-width:0}
.bdt-wheel{position:relative;width:min(100%,600px);aspect-ratio:1;margin:0 auto}
.bdt-wheel-svg{position:absolute;inset:0;width:100%;height:100%}
.bdt-ring{fill:none;stroke:rgba(255,255,255,.14);stroke-dasharray:2 7}
.bdt-ring-in{stroke:rgba(255,255,255,.06);stroke-dasharray:none}
.bdt-core{transition:r .8s cubic-bezier(.2,.8,.2,1)}
.bdt-link path{fill:none;stroke-linecap:round}
.bdt-link-base{stroke:rgba(255,255,255,.2);stroke-width:1.5;stroke-dasharray:2 7}
.bdt-link-draw{stroke:color-mix(in srgb,var(--bdt-accent) 65%,#fff);stroke-width:2;opacity:.5;stroke-dasharray:1;stroke-dashoffset:1;animation:bdt-draw .9s cubic-bezier(.65,0,.35,1) forwards;transition:opacity .4s,stroke-width .4s}
.bdt-sel .bdt-link-draw{opacity:1;stroke-width:3}
.bdt-link-flow{stroke:#fff;stroke-width:3.2;stroke-dasharray:.1 30;animation:bdt-flow 1.6s linear infinite;opacity:.85}
.bdt-link-flow.bdt-in{animation-direction:reverse}
.bdt-hub-mark{color:var(--bdt-night-ink);filter:drop-shadow(0 0 22px color-mix(in srgb,var(--bdt-accent) 70%,transparent))}
.bdt-node{position:absolute;display:flex;flex-direction:column;align-items:center;gap:8px;width:120px;transform:translate(-50%,-28px);color:var(--bdt-night-ink)}
.bdt-node-top{flex-direction:column-reverse;transform:translate(-50%,calc(-100% + 28px))}
.bdt-node-dot{width:56px;height:56px;border-radius:50%;display:grid;place-items:center;color:rgba(255,255,255,.55);background:color-mix(in srgb,var(--bdt-night) 82%,#fff);border:1px solid rgba(255,255,255,.16);transition:transform .45s cubic-bezier(.3,1.4,.5,1),box-shadow .4s,background .4s,color .3s,border-color .3s}
.bdt-node:hover .bdt-node-dot{transform:scale(1.07)}
.bdt-node.bdt-on .bdt-node-dot{color:#fff;border-color:color-mix(in srgb,var(--bdt-accent) 60%,transparent);box-shadow:0 0 0 6px color-mix(in srgb,var(--bdt-accent) 12%,transparent)}
.bdt-node.bdt-sel .bdt-node-dot{color:#fff;border-color:transparent;background:linear-gradient(135deg,var(--bdt-petal-b),var(--bdt-petal-c));transform:scale(1.12);box-shadow:0 0 0 8px color-mix(in srgb,var(--bdt-accent) 20%,transparent),0 14px 30px -8px var(--bdt-petal-c)}
.bdt-node-l{font-size:13px;opacity:.72;transition:opacity .3s}
.bdt-node.bdt-sel .bdt-node-l,.bdt-node:hover .bdt-node-l{opacity:1}
.bdt-wheel-foot{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;max-width:600px;margin:22px auto 0;font-size:14px}
.bdt-wheel-foot span{opacity:.8}
.bdt-wheel-foot strong{font-weight:600;font-variant-numeric:tabular-nums}
.bdt-hint{max-width:600px;margin:12px auto 0;font-size:12.5px;opacity:.45}

/* busywork */
.bdt-busy{z-index:1;margin-top:-36px;border-radius:36px 36px 0 0}
.bdt-busy-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:24px;align-items:start}
.bdt-tasks{display:grid;gap:10px}
.bdt-task{width:100%;display:flex;align-items:center;gap:16px;padding:18px 20px;border-radius:18px;text-align:left;background:color-mix(in srgb,var(--bdt-paper) 35%,#fff);border:1px solid var(--bdt-rule);transition:transform .35s cubic-bezier(.2,.8,.2,1),border-color .3s,box-shadow .35s,background .3s}
.bdt-task:hover{transform:translateY(-2px);border-color:color-mix(in srgb,var(--bdt-ink) 22%,transparent);box-shadow:0 14px 30px -22px rgba(28,35,64,.45)}
.bdt-task.bdt-done{background:color-mix(in srgb,var(--bdt-petal-a) 22%,var(--bdt-paper))}
.bdt-tick{width:26px;height:26px;flex:none;border-radius:50%;display:grid;place-items:center;color:transparent;border:1.5px solid color-mix(in srgb,var(--bdt-ink) 28%,transparent);transition:background .3s,border-color .3s,color .3s}
.bdt-done .bdt-tick{color:#fff;background:var(--bdt-petal-c);border-color:var(--bdt-petal-c);animation:bdt-tick .45s cubic-bezier(.3,1.5,.5,1)}
.bdt-task-t{flex:1;min-width:0;display:grid;gap:3px}
.bdt-strike{justify-self:start;font-size:16px;font-weight:500;letter-spacing:-.01em;text-decoration:line-through 1.5px;text-decoration-color:transparent;transition:color .4s,text-decoration-color .4s}
.bdt-done .bdt-strike{color:var(--bdt-muted);text-decoration-color:currentColor}
.bdt-task-team{font-size:12.5px;color:var(--bdt-muted)}
.bdt-task-h{flex:none;font-size:13px;white-space:nowrap;font-variant-numeric:tabular-nums;color:var(--bdt-muted)}
.bdt-done .bdt-task-h{color:color-mix(in srgb,var(--bdt-petal-c) 80%,var(--bdt-ink));font-weight:600}
.bdt-paper .bdt-card{background:linear-gradient(180deg,color-mix(in srgb,var(--bdt-sky-a) 16%,#fff),color-mix(in srgb,var(--bdt-paper) 30%,#fff) 60%);border-color:var(--bdt-rule)}
.bdt-meter{position:sticky;top:96px;padding:30px;overflow:hidden}
.bdt-meter-sprig{position:absolute;top:-8px;right:-14px}
.bdt-meter-n{margin:12px 0 8px;font-size:clamp(64px,7vw,104px);line-height:1;letter-spacing:-.055em;font-weight:450;font-variant-numeric:tabular-nums}
.bdt-meter-n span{margin-left:10px;font-size:18px;letter-spacing:0;color:var(--bdt-muted)}
.bdt-meter-x{max-width:22em;font-size:15px;color:var(--bdt-muted)}
.bdt-bars{display:grid;gap:13px;margin:28px 0}
.bdt-bar{display:grid;grid-template-columns:86px minmax(0,1fr) 84px;align-items:center;gap:12px;font-size:13px}
.bdt-bar-track{display:flex;height:10px;border-radius:99px;overflow:hidden;background:color-mix(in srgb,var(--bdt-ink) 6%,transparent)}
.bdt-bar-auto{background:linear-gradient(90deg,var(--bdt-petal-b),var(--bdt-petal-c));transition:width .8s cubic-bezier(.65,0,.35,1)}
.bdt-bar-man{background:color-mix(in srgb,var(--bdt-ink) 22%,transparent);transition:width .8s cubic-bezier(.65,0,.35,1)}
.bdt-bar-v{text-align:right;color:var(--bdt-muted);font-variant-numeric:tabular-nums;white-space:nowrap}
.bdt-meter-acts{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px}
.bdt-legend{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--bdt-muted)}
.bdt-legend i{display:inline-block;width:10px;height:10px;border-radius:3px}
.bdt-sw-a{background:var(--bdt-petal-c)}
.bdt-sw-m{margin-left:8px;background:color-mix(in srgb,var(--bdt-ink) 22%,transparent)}
.bdt-stats{display:grid;grid-template-columns:repeat(var(--bdt-n,4),minmax(0,1fr));margin-top:clamp(64px,8vw,112px);border-top:1px solid var(--bdt-rule)}
.bdt-stat{display:grid;gap:8px;padding:28px 24px 0 0}
.bdt-stat+.bdt-stat{padding-left:24px;border-left:1px solid var(--bdt-rule)}
.bdt-stat-v{font-size:clamp(36px,4.2vw,58px);line-height:1;letter-spacing:-.045em;font-variant-numeric:tabular-nums}
.bdt-stat-l{font-size:14px;color:var(--bdt-muted)}

/* stories */
.bdt-stories{padding-top:0}
.bdt-row-head{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:36px}
.bdt-arrows{display:flex;gap:10px;flex:none}
.bdt-round{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;border:1px solid var(--bdt-rule);transition:background .25s,color .25s,opacity .25s}
.bdt-round:hover:not(:disabled){background:var(--bdt-ink);color:var(--bdt-paper)}
.bdt-round:disabled{opacity:.35;cursor:default}
.bdt-track{display:flex;gap:20px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;scroll-padding-left:28px;padding:12px calc((100vw - 100%) / 2) 64px 28px;margin:-12px calc((100% - 100vw) / 2) -34px -28px;outline-offset:-4px}
.bdt-track::after{content:"";flex:0 0 1px}
.bdt-track::-webkit-scrollbar{display:none}
.bdt-quote{position:relative;flex:0 0 min(470px,86%);min-height:380px;scroll-snap-align:start;display:flex;flex-direction:column;gap:24px;padding:30px;border-radius:26px;overflow:hidden;background:color-mix(in srgb,var(--bdt-paper) 35%,#fff);border:1px solid var(--bdt-rule);transition:box-shadow .6s,transform .6s cubic-bezier(.2,.8,.2,1)}
.bdt-quote::before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(70% 50% at 100% 0%,color-mix(in srgb,var(--bdt-petal-b) 40%,transparent),transparent 70%),radial-gradient(60% 40% at 0% 100%,color-mix(in srgb,var(--bdt-sky-a) 22%,transparent),transparent 70%);opacity:.7;transition:opacity .6s}
.bdt-quote.bdt-cur{box-shadow:0 34px 70px -40px rgba(28,35,64,.45);transform:translateY(-4px)}
.bdt-quote.bdt-cur::before{opacity:1}
.bdt-quote>*{position:relative}
.bdt-quote-m strong{display:block;font-size:46px;line-height:1;letter-spacing:-.045em;font-weight:500}
.bdt-quote-m span{font-size:14px;color:var(--bdt-muted)}
.bdt-quote blockquote{flex:1;font-size:19px;line-height:1.45;letter-spacing:-.012em;text-wrap:pretty}
.bdt-quote figcaption{display:flex;align-items:center;gap:12px;font-size:14px}
.bdt-quote figcaption>span:last-child{display:grid}
.bdt-quote figcaption span span{font-size:13px;color:var(--bdt-muted)}
.bdt-av{width:44px;height:44px;flex:none;border-radius:50%;display:grid;place-items:center;font-size:14px;font-weight:600;color:#fff;background:linear-gradient(135deg,hsl(calc(var(--bdt-hue) + 340) 72% 74%),hsl(calc(var(--bdt-hue) + 225) 42% 46%))}
.bdt-dots{display:flex;justify-content:center;gap:6px}
.bdt-dots span{width:6px;height:6px;border-radius:99px;background:var(--bdt-rule);transition:width .45s cubic-bezier(.2,.8,.2,1),background .3s}
.bdt-dots .bdt-cur{width:24px;background:var(--bdt-ink)}

/* pricing */
.bdt-pricing{z-index:1;margin-top:-36px;border-radius:36px 36px 0 0}
.bdt-pricing-mark{position:absolute;left:50%;top:50%;width:min(980px,96vw);height:min(980px,96vw);color:#fff;opacity:.028;transform:translate(-50%,-50%) rotate(14deg);pointer-events:none}
.bdt-price-ctl{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:28px;margin-bottom:44px}
.bdt-seg2{position:relative;display:grid;grid-template-columns:1fr 1fr;padding:4px;border-radius:99px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12)}
.bdt-seg2-thumb{position:absolute;top:4px;bottom:4px;left:4px;width:calc(50% - 4px);border-radius:99px;background:#fff;transition:transform .5s cubic-bezier(.3,1.25,.5,1)}
.bdt-seg2 button{position:relative;z-index:1;height:38px;padding:0 18px;border-radius:99px;font-size:14px;white-space:nowrap;transition:color .35s}
.bdt-seg2 button[aria-checked=true]{color:var(--bdt-night)}
.bdt-seg2 em{margin-left:4px;font-size:12px;font-style:normal;color:var(--bdt-accent)}
.bdt-seg2 button[aria-checked=true] em{color:color-mix(in srgb,var(--bdt-petal-c) 80%,var(--bdt-night))}
.bdt-range{display:flex;align-items:center;gap:14px;font-size:14px}
.bdt-range strong{display:inline-block;min-width:2ch;margin-left:4px;font-variant-numeric:tabular-nums}
.bdt-range input{-webkit-appearance:none;appearance:none;width:210px;height:6px;margin:0;border-radius:99px;cursor:pointer;background:linear-gradient(90deg,var(--bdt-accent) var(--bdt-fill),rgba(255,255,255,.16) var(--bdt-fill))}
.bdt-range input::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:22px;height:22px;border-radius:50%;background:#fff;border:0;box-shadow:0 2px 10px rgba(0,0,0,.35);transition:transform .2s}
.bdt-range input::-moz-range-thumb{width:22px;height:22px;border-radius:50%;background:#fff;border:0;box-shadow:0 2px 10px rgba(0,0,0,.35)}
.bdt-range input:active::-webkit-slider-thumb{transform:scale(1.15)}
.bdt-tiers{display:grid;grid-template-columns:repeat(var(--bdt-n,3),minmax(0,1fr));gap:18px;align-items:stretch;max-width:calc(var(--bdt-n,3) * 400px);margin:0 auto}
.bdt-tier{position:relative;display:flex;flex-direction:column;gap:14px;padding:30px;border-radius:26px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1)}
.bdt-tier h3{font-size:20px;font-weight:500;letter-spacing:-.02em}
.bdt-featured{background:linear-gradient(180deg,color-mix(in srgb,var(--bdt-sky-b) 42%,transparent),rgba(255,255,255,.03) 70%);border-color:color-mix(in srgb,var(--bdt-accent) 55%,transparent);box-shadow:0 40px 90px -50px var(--bdt-accent)}
.bdt-badge{position:absolute;top:24px;right:24px;padding:5px 11px;border-radius:99px;font-size:12px;font-weight:600;color:var(--bdt-night);background:var(--bdt-accent)}
.bdt-tier-x{min-height:3em;font-size:14.5px;opacity:.7}
.bdt-tier-p{display:flex;align-items:baseline;flex-wrap:wrap;gap:8px;margin-top:6px}
.bdt-tier-n{font-size:50px;line-height:1;letter-spacing:-.045em;font-variant-numeric:tabular-nums}
.bdt-tier-u{font-size:13px;opacity:.6}
.bdt-tier-extra{margin-top:-6px;font-size:12.5px;color:var(--bdt-accent)}
.bdt-tier .bdt-btn{width:100%;margin:8px 0 6px}
.bdt-tier ul{display:grid;gap:11px;font-size:14.5px}
.bdt-tier li{display:flex;align-items:center;gap:10px;opacity:.86}
.bdt-tier li .bdt-svg{color:var(--bdt-accent)}

/* faq */
.bdt-faq{z-index:1;margin-top:-36px;border-radius:36px 36px 0 0;padding-bottom:clamp(140px,16vw,220px)}
.bdt-faq-grid{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:48px}
.bdt-q{border-bottom:1px solid var(--bdt-rule)}
.bdt-q:first-child{border-top:1px solid var(--bdt-rule)}
.bdt-q button{width:100%;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:24px 0;font-size:clamp(17px,1.5vw,20px);letter-spacing:-.012em;text-align:left}
.bdt-plus{position:relative;width:14px;height:14px;flex:none}
.bdt-plus::before,.bdt-plus::after{content:"";position:absolute;left:0;right:0;top:50%;height:1.5px;margin-top:-.75px;background:currentColor;transition:transform .4s cubic-bezier(.2,.8,.2,1)}
.bdt-plus::after{transform:rotate(90deg)}
.bdt-q-open .bdt-plus::after{transform:rotate(0)}
.bdt-a{display:grid;grid-template-rows:0fr;transition:grid-template-rows .5s cubic-bezier(.65,0,.35,1)}
.bdt-a>div{overflow:hidden;visibility:hidden;transition:visibility 0s .5s}
.bdt-q-open .bdt-a{grid-template-rows:1fr}
.bdt-q-open .bdt-a>div{visibility:visible;transition:none}
.bdt-a p{max-width:40em;padding-bottom:24px;color:var(--bdt-muted)}

/* closing band + footer */
.bdt-end{position:relative;z-index:1;margin-top:-36px;border-radius:36px 36px 0 0;overflow:hidden;isolation:isolate;padding-top:clamp(220px,26vw,340px);color:var(--bdt-hero-ink)}
.bdt-sky-end{background:radial-gradient(60% 40% at 50% 26%,color-mix(in srgb,var(--bdt-glow) 30%,transparent),transparent 70%),linear-gradient(180deg,var(--bdt-sky-a) 0%,var(--bdt-sky-b) 34%,var(--bdt-sky-c) 56%,var(--bdt-night) 92%)}
.bdt-canopy-cta .bdt-bough{width:clamp(420px,46vw,920px);top:-7%}
.bdt-canopy-cta .bdt-bough-r{top:-4%}
.bdt-cta{position:relative;z-index:2;max-width:780px;margin:0 auto;padding:0 20px;display:grid;justify-items:center;text-align:center}
.bdt-cta-mark{margin-bottom:26px;opacity:.9}
.bdt-cta-h{font-size:clamp(42px,6.2vw,88px)}
.bdt-cta .bdt-lede{opacity:.88}
.bdt-form{display:flex;gap:8px;width:min(100%,470px);margin-top:34px;padding:6px;border-radius:99px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.42);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);transition:border-color .3s,box-shadow .3s}
.bdt-form:focus-within{border-color:#fff;box-shadow:0 0 0 5px rgba(255,255,255,.14)}
.bdt-form input{flex:1;min-width:0;padding:0 16px;font:inherit;font-size:15.5px;color:inherit;background:none;border:0;outline:none}
.bdt-form input::placeholder{color:inherit;opacity:.62}
.bdt-form .bdt-btn{min-width:132px}
.bdt-bad{border-color:#ffc2cf;animation:bdt-shake .42s}
.bdt-form-err{min-height:22px;margin-top:10px;font-size:13.5px}
.bdt-sent{display:flex;align-items:center;flex-wrap:wrap;justify-content:center;gap:12px;margin-top:34px;padding:14px 20px;border-radius:22px;font-size:15px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.4);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);animation:bdt-pop .45s cubic-bezier(.2,.8,.2,1)}
.bdt-sent-i{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;color:#151b34;background:#fff}
.bdt-linkbtn{font-size:13.5px;text-decoration:underline;text-underline-offset:3px;opacity:.8}
.bdt-spin{display:inline-block;width:16px;height:16px;border-radius:50%;border:2px solid rgba(21,27,52,.22);border-top-color:#151b34;animation:bdt-spin .7s linear infinite}
.bdt-foot{position:relative;z-index:2;max-width:1440px;margin:clamp(140px,16vw,230px) auto 0;padding:0 clamp(16px,4.6vw,64px) 28px;color:var(--bdt-night-ink)}
.bdt-foot-top{display:grid;grid-template-columns:1.4fr repeat(3,minmax(0,1fr));gap:32px;padding-top:40px;border-top:1px solid rgba(255,255,255,.14)}
.bdt-foot-brand p{max-width:18em;margin-top:12px;font-size:14px;opacity:.6}
.bdt-foot-col{display:grid;align-content:start;gap:10px;font-size:14.5px}
.bdt-foot-col span{margin-bottom:4px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.5}
.bdt-foot-col a{opacity:.82;transition:opacity .2s}
.bdt-foot-col a:hover{opacity:1}
.bdt-word-big{margin:64px 0 26px;font-size:clamp(84px,21vw,330px);line-height:.8;letter-spacing:-.075em;font-weight:600;text-align:center;white-space:nowrap;color:transparent;background:linear-gradient(180deg,rgba(255,255,255,.2),rgba(255,255,255,0) 88%);-webkit-background-clip:text;background-clip:text;-webkit-user-select:none;user-select:none}
.bdt-foot-bot{display:flex;justify-content:space-between;flex-wrap:wrap;gap:16px;font-size:13px;opacity:.55}

/* demo modal */
.bdt-modal{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:20px;background:rgba(10,14,34,.62);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);animation:bdt-fade .3s both}
.bdt-player{position:relative;width:min(980px,100%);border-radius:26px;overflow:hidden;color:#fff;outline:none;background:radial-gradient(80% 60% at 50% 0%,color-mix(in srgb,var(--bdt-glow) 22%,transparent),transparent 70%),linear-gradient(180deg,var(--bdt-sky-b),var(--bdt-night));box-shadow:0 50px 120px -30px rgba(0,0,0,.65);animation:bdt-pop .5s cubic-bezier(.2,.8,.2,1) both}
.bdt-x{position:absolute;top:14px;right:14px;z-index:3;width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.14);transition:background .2s}
.bdt-x:hover{background:rgba(255,255,255,.26)}
.bdt-video{display:block;width:100%;height:auto;max-width:none;aspect-ratio:16/9;background:#000}
.bdt-stage{display:grid;grid-template-rows:minmax(0,1fr) auto;aspect-ratio:16/9;min-height:300px}
.bdt-stage-vis{position:relative;display:grid;place-items:center;min-height:0}
.bdt-stage-svg{position:absolute;inset:0;width:100%;height:100%}
.bdt-paused,.bdt-paused *{animation-play-state:paused !important}
.bdt-sc-node{animation:bdt-fade .5s both}
.bdt-sc-node circle{fill:rgba(255,255,255,.1);stroke:rgba(255,255,255,.7);stroke-width:1.5}
.bdt-sc-line{fill:none;stroke:#fff;stroke-width:2;stroke-dasharray:1;stroke-dashoffset:1;animation:bdt-draw .7s cubic-bezier(.65,0,.35,1) forwards}
.bdt-sc-mark{color:#fff}
.bdt-sc-tasks{display:grid;gap:10px;width:min(480px,82%)}
.bdt-sc-task{display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:14px;font-size:15px;background:rgba(255,255,255,.1);animation:bdt-sc-row .5s both}
.bdt-sc-box{width:22px;height:22px;flex:none;border-radius:50%;display:grid;place-items:center;color:transparent;border:1.5px solid rgba(255,255,255,.5);animation:bdt-sc-tick .35s both;animation-delay:inherit}
.bdt-sc-t{flex:1;animation:bdt-sc-strike .35s both;animation-delay:inherit}
.bdt-sc-h{font-size:13px;opacity:.7}
.bdt-sc-grid{stroke:rgba(255,255,255,.08)}
.bdt-sc-chart{fill:none;stroke:var(--bdt-petal-a);stroke-width:3;stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:1;animation:bdt-draw 2.4s cubic-bezier(.65,0,.35,1) forwards;animation-delay:calc(var(--bdt-off) + .3s)}
.bdt-sc-fill{fill:rgba(255,255,255,.07);animation:bdt-fade 1s both;animation-delay:calc(var(--bdt-off) + 1.8s)}
.bdt-sc-chip{animation:bdt-fade .5s both}
.bdt-sc-chip rect{fill:rgba(255,255,255,.14)}
.bdt-sc-chip text{fill:#fff;font-size:14px;font-family:FONT}
.bdt-cap{display:grid;gap:3px;padding:0 28px 22px;animation:bdt-rise .7s both;animation-delay:var(--bdt-off)}
.bdt-cap-n{font-size:12px;opacity:.55;font-variant-numeric:tabular-nums}
.bdt-cap-t{font-size:22px;letter-spacing:-.02em}
.bdt-cap-x{font-size:14px;opacity:.72}
.bdt-controls{display:flex;align-items:center;gap:14px;padding:14px 18px;background:rgba(0,0,0,.2)}
.bdt-play{width:38px;height:38px;flex:none;border-radius:50%;display:grid;place-items:center;color:#151b34;background:#fff}
.bdt-scrub{flex:1;display:flex;align-items:center;gap:4px;height:26px;cursor:pointer;touch-action:none;border-radius:6px}
.bdt-seg{flex:1;height:4px;border-radius:99px;overflow:hidden;background:rgba(255,255,255,.22)}
.bdt-seg span{display:block;height:4px;background:#fff;transform-origin:0 50%}
.bdt-time{font-size:13px;opacity:.8;font-variant-numeric:tabular-nums;white-space:nowrap}

@keyframes bdt-rise{from{opacity:0;transform:translateY(.45em);filter:blur(10px)}}
@keyframes bdt-fade{from{opacity:0}}
@keyframes bdt-pop{from{opacity:0;transform:translateY(-6px) scale(.97)}}
@keyframes bdt-draw{to{stroke-dashoffset:0}}
@keyframes bdt-flow{to{stroke-dashoffset:-30.1}}
@keyframes bdt-marquee{to{transform:translateX(-50%)}}
@keyframes bdt-twinkle{to{opacity:.25}}
@keyframes bdt-beat{0%{box-shadow:0 0 0 0 rgba(139,227,176,.6)}100%{box-shadow:0 0 0 8px rgba(139,227,176,0)}}
@keyframes bdt-drop-in{from{opacity:0;transform:translateY(-10px)}}
@keyframes bdt-tick{50%{transform:scale(1.22)}}
@keyframes bdt-shake{20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}
@keyframes bdt-spin{to{transform:rotate(360deg)}}
@keyframes bdt-hint{0%{opacity:0}15%,80%{opacity:.6}100%{opacity:0}}
@keyframes bdt-sc-row{from{opacity:0;transform:translateX(-10px)}}
@keyframes bdt-sc-tick{to{color:#fff;background:var(--bdt-accent);border-color:var(--bdt-accent)}}
@keyframes bdt-sc-strike{to{opacity:.55;text-decoration:line-through}}

@media (max-width:980px){
.bdt-links,.bdt-signin{display:none}
.bdt-nav nav{flex:1}
.bdt-burger{display:inline-flex}
.bdt-hub-grid,.bdt-busy-grid,.bdt-faq-grid{grid-template-columns:minmax(0,1fr)}
.bdt-meter{position:relative;top:0}
.bdt-tiers{grid-template-columns:minmax(0,1fr);max-width:500px;margin:0 auto}
}
@media (min-width:981px){
.bdt-sheet{display:none}
}
@media (max-width:860px){
.bdt-hero-in{grid-template-columns:minmax(0,1fr);gap:26px;padding-top:max(46vh,300px)}
.bdt-hero-side{justify-self:start}
.bdt-bough{width:clamp(380px,100vw,720px)}
.bdt-bough-r{top:10%}
.bdt-watermark{top:46%;width:64vw;height:64vw}
.bdt-hint-sky{display:none}
.bdt-stats{grid-template-columns:repeat(2,minmax(0,1fr))}
.bdt-stat:nth-child(3){padding-left:0;border-left:0}
.bdt-foot-top{grid-template-columns:repeat(3,minmax(0,1fr))}
.bdt-foot-brand{grid-column:1/-1}
.bdt-row-head{align-items:flex-start;flex-direction:column}
}
@media (max-width:560px){
.bdt-nav-r .bdt-btn-sm{display:none}
.bdt-logos-k{display:none}
.bdt-node{width:84px;transform:translate(-50%,-21px)}
.bdt-node-top{transform:translate(-50%,calc(-100% + 21px))}
.bdt-node-dot{width:42px;height:42px}
.bdt-node-l{font-size:11px}
.bdt-bar{grid-template-columns:72px minmax(0,1fr) 70px}
.bdt-form{flex-direction:column;border-radius:24px}
.bdt-form input{height:46px}
.bdt-stage{aspect-ratio:auto;min-height:420px}
.bdt-foot-top{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media (prefers-reduced-motion:reduce){
.bdt-root *,.bdt-root *::before,.bdt-root *::after{animation-duration:.01ms !important;animation-iteration-count:1 !important;transition-duration:.01ms !important}
.bdt-marquee-in{animation:none}
.bdt-hint-sky{display:none}
.bdt-root [data-reveal]{opacity:1;transform:none}
}
`.replace(/FONT/g, BDT_FONT)

export type BdtPaletteInput = Partial<BdtPalette>
