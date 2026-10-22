"use client"

// Plumb Payroll Template — a complete construction-payroll landing page in one
// file, laid out on a drafting grid: hairline rails down the page, dashed guide
// lines running out past them, every block boxed in by its own rules.
//
// The centre of it is the product tour. Four tabs, each a coloured panel cut by
// diagonal lines and speckled strips, holding a live mock of the product: a
// payrun you can resolve and approve, prevailing-wage rates you can switch by
// job, fully-burdened labor cost by job, and compliance filings you can submit.
// Around it: customers, numbers that count up, a platform bento (a clock-in
// phone, an ERP sync, multi-state taxes, pay options), testimonials, a savings
// calculator, questions, a demo form and a footer.
//
// Everything is drawn here: the panels, the marks, the logos and the phone are
// SVG and CSS, the type is the system stack; nothing loads at runtime.
import * as React from "react"

export type PlbLink = { label: string; href?: string }

/** "#showcase", "#customers", "#platform", "#stories", "#calculator", "#faq" and "#demo" scroll within the page. */
export type PlbNav = { links?: PlbLink[]; login?: PlbLink; cta?: PlbLink }

export type PlbTabKind = "run" | "rates" | "costs" | "compliance"

export type PlbTab = {
  /** Which live mock the panel holds. */
  kind: PlbTabKind
  label: string
  /** The caption under the panel. "\n" breaks the line. */
  title: string
  text: string
}

/** Amounts an alert moves when it is resolved, keyed by a figure's label. */
export type PlbDelta = { [label: string]: number }

export type PlbFigure = { label: string; value: number | string }

export type PlbAlert = { id: string; title: string; text: string; fixed: string; delta?: PlbDelta }

export type PlbPayrun = {
  period: string
  meta: PlbFigure[]
  alerts: PlbAlert[]
  stats: PlbFigure[]
  left: PlbFigure[]
  right: PlbFigure[]
}

export type PlbRateJob = {
  name: string
  kind: string
  /** [base, fringe] per classification, in the order of `classes`. */
  rates: [number, number][]
}

export type PlbRates = { classes: string[]; jobs: PlbRateJob[] }

export type PlbCostJob = { name: string; code: string; wages: number; taxes: number; fringe: number; comp: number; budget: number }

export type PlbFiling = { name: string; agency: string; scope: string }

export type PlbQuote = { quote: string; name: string; role: string; company: string; metric?: { before: string; after: string; label: string } }

export type PlbFaq = { q: string; a: string }

export type PlbStat = { value: number; label: string; prefix?: string; suffix?: string; decimals?: number }

export type PlbDemoRequest = { email: string; crew: string }

export type PlbApproval = { period: string; gross: number; net: number }

export type PlbPaletteName = "forest" | "harbor" | "clay"

export type PlbPalette = {
  page: string
  ink: string
  muted: string
  /** Solid hairlines: the rails and every box. */
  rule: string
  /** The dashed guides that run out past the rails. */
  guide: string
  /** The active tab and the stat tiles. */
  soft: string
  /** The approve button and other primary actions. */
  accent: string
  accentInk: string
  warn: string
  warnInk: string
  good: string
  /** One [panel, line] pair per tab; the tour cycles through them. */
  panels: [string, string][]
}

export interface PlumbPayrollTemplateProps {
  /** Wordmark in the nav and footer. */
  brand?: string
  /** Replaces the drawn plumb bob beside the wordmark. */
  logo?: React.ReactNode
  nav?: PlbNav | null
  hero?: { title?: string; text?: string; link?: PlbLink } | null
  /** The product tour. Each tab's `kind` picks its live mock. */
  tabs?: PlbTab[]
  payrun?: PlbPayrun
  rates?: PlbRates
  costs?: PlbCostJob[]
  filings?: PlbFiling[]
  customers?: { title?: string; names?: { name: string; trade: string }[] } | null
  stats?: PlbStat[] | null
  platform?: { title?: string; text?: string } | null
  stories?: { title?: string; quotes?: PlbQuote[] } | null
  calculator?: { title?: string; text?: string } | null
  faq?: { title?: string; items?: PlbFaq[] } | null
  cta?: { title?: string; text?: string; button?: string } | null
  footer?: { columns?: { title: string; links: PlbLink[] }[]; note?: string } | null
  palette?: PlbPaletteName | PlbPaletteInput
  /** Milliseconds each tab holds before the tour moves on, or `false`. Stops for good once a tab is picked. */
  autoplay?: number | false
  /** Called when the payrun is approved. Return (or resolve to) `false`, or throw, to show an error. */
  onApprove?: (run: PlbApproval) => unknown
  /** Called with the demo form. Return (or resolve to) `false`, or throw, to show an error. */
  onBookDemo?: (data: PlbDemoRequest) => unknown
  /** Minimum height of the page. A definite length, so it survives any host layout. */
  height?: string
  className?: string
}

// #region content
const PALETTES = {
  forest: {
    page: "#ffffff",
    ink: "#22111a",
    muted: "#676163",
    rule: "#e6e3df",
    guide: "#d9d5d0",
    soft: "#f5f4f0",
    accent: "#6a11cb",
    accentInk: "#ffffff",
    warn: "#f9edc4",
    warnInk: "#5c3d05",
    good: "#0b7a45",
    panels: [
      ["#00703f", "#25a55c"],
      ["#1d4a8c", "#4580d4"],
      ["#8e3d16", "#cd6d36"],
      ["#3f2b7a", "#7559c8"],
    ] as [string, string][],
  },
  harbor: {
    page: "#ffffff",
    ink: "#0f1a24",
    muted: "#5f6a73",
    rule: "#e1e6ea",
    guide: "#d2d9df",
    soft: "#f1f4f6",
    accent: "#e2512a",
    accentInk: "#ffffff",
    warn: "#fdebd3",
    warnInk: "#6a3608",
    good: "#0b7a6a",
    panels: [
      ["#0d4f6e", "#2f8fb8"],
      ["#0f6a63", "#33a698"],
      ["#24386e", "#5b78c4"],
      ["#3d4a57", "#7a8c9d"],
    ] as [string, string][],
  },
  clay: {
    page: "#fffdf9",
    ink: "#2a1a12",
    muted: "#74675e",
    rule: "#ebe3da",
    guide: "#dfd4c8",
    soft: "#f7f1ea",
    accent: "#1f5f4a",
    accentInk: "#ffffff",
    warn: "#fbe7c8",
    warnInk: "#663e08",
    good: "#2f7a3c",
    panels: [
      ["#a2491f", "#d9773f"],
      ["#6b4a2b", "#a87c4f"],
      ["#4f5d2f", "#88994f"],
      ["#7a2f3a", "#b95a66"],
    ] as [string, string][],
  },
}

const DEFAULT_TABS: PlbTab[] = [
  {
    kind: "run",
    label: "Run in minutes",
    title: "Run payroll in minutes,\nnot hours.",
    text: "Save hours every week as Plumb calculates gross pay, job costs and overtime for your entire crew.",
  },
  {
    kind: "rates",
    label: "Pay rates",
    title: "Every rate, on every job,\nalready right.",
    text: "Prevailing wage, union scale and company rates apply themselves by job, classification and fringe.",
  },
  {
    kind: "costs",
    label: "Labor costs",
    title: "Know what each job\nreally costs.",
    text: "Taxes, fringes and workers' comp land on the job the moment payroll runs, not at month end.",
  },
  {
    kind: "compliance",
    label: "Compliance",
    title: "Certified payroll,\nfiled for you.",
    text: "WH-347s, state portals and multi-state tax filings go out on time, in the format each agency wants.",
  },
]

const DEFAULT_PAYRUN: PlbPayrun = {
  period: "Mar 30 - Apr 5",
  meta: [
    { label: "Pay schedule", value: "Weekly" },
    { label: "Deadline", value: "5pm PT" },
    { label: "Bank account", value: "#6863" },
    { label: "Payday", value: "Apr 10" },
  ],
  alerts: [
    {
      id: "benefits",
      title: "Potential over deduction of benefits.",
      text: "Check benefits figures.",
      fixed: "Benefit deductions recalculated for 6 employees.",
      delta: { "Net pay": 312.4, "Direct deposits": 312.4 },
    },
    {
      id: "duplicates",
      title: "Duplicate timesheets.",
      text: "Remove or edit duplicates.",
      fixed: "2 duplicate timesheets removed (32 hrs).",
      delta: {
        "Gross pay": -1284,
        "Net pay": -1027.2,
        "Employee gross earnings": -1284,
        "Direct deposits": -1027.2,
        "Employee taxes": -256.8,
        "Company taxes": -98.23,
      },
    },
  ],
  stats: [
    { label: "Gross pay", value: 228680.46 },
    { label: "Net pay", value: 182988.38 },
    { label: "Debit date", value: "Apr 8" },
    { label: "Paper checks", value: 529 },
  ],
  left: [
    { label: "Employee gross earnings", value: 191870.36 },
    { label: "Employee reimbursements", value: 218.78 },
    { label: "Contractor gross earnings", value: 0 },
    { label: "Fringe contributions", value: 36591.32 },
  ],
  right: [
    { label: "Direct deposits", value: 134720.99 },
    { label: "Employee taxes", value: 31304.1 },
    { label: "Company taxes", value: 14820.77 },
    { label: "Union dues", value: 2210.45 },
  ],
}

const DEFAULT_RATES: PlbRates = {
  classes: ["Electrician · Journeyman", "Electrician · Apprentice 3", "Laborer · Group 1", "Operating Engineer", "Carpenter"],
  jobs: [
    {
      name: "Riverside Medical Center",
      kind: "Prevailing wage · Alameda County, CA",
      rates: [[68.5, 41.27], [41.1, 26.84], [42.65, 31.92], [61.08, 38.46], [55.2, 35.73]],
    },
    {
      name: "Harbor Line Transit Depot",
      kind: "Union scale · Local 595",
      rates: [[71.25, 43.1], [42.75, 27.4], [44.1, 32.55], [63.4, 39.02], [57.85, 36.4]],
    },
    {
      name: "Elm Street Apartments",
      kind: "Private · Company rates",
      rates: [[52, 14.5], [31.2, 9.8], [28.5, 8.6], [48.75, 13.4], [42, 12.1]],
    },
  ],
}

const DEFAULT_COSTS: PlbCostJob[] = [
  { name: "Riverside Medical Center", code: "24-118", wages: 84210, taxes: 9180, fringe: 22740, comp: 6320, budget: 128000 },
  { name: "Harbor Line Transit Depot", code: "24-131", wages: 61480, taxes: 6710, fringe: 18890, comp: 4930, budget: 88000 },
  { name: "Elm Street Apartments", code: "25-007", wages: 38920, taxes: 4250, fringe: 5840, comp: 3110, budget: 56000 },
  { name: "Northpoint Data Hall", code: "25-012", wages: 27460, taxes: 3010, fringe: 7920, comp: 2180, budget: 47000 },
]

const DEFAULT_FILINGS: PlbFiling[] = [
  { name: "Certified payroll · WH-347", agency: "U.S. Department of Labor", scope: "Riverside Medical Center" },
  { name: "eCPR upload", agency: "California DIR", scope: "3 public works jobs" },
  { name: "Prevailing wage report", agency: "Washington L&I", scope: "Harbor Line Transit Depot" },
  { name: "Quarterly federal return · 941", agency: "IRS", scope: "Q1 · all employees" },
  { name: "State unemployment (SUI)", agency: "8 states", scope: "Q1 wage detail" },
  { name: "Local income taxes", agency: "14 localities", scope: "Apr 5 payrun" },
]

const DEFAULT_CUSTOMERS = [
  { name: "Halberd Electric", trade: "Electrical" },
  { name: "Northgate Builders", trade: "General contractor" },
  { name: "Corbel & Sons", trade: "Masonry" },
  { name: "Ridgeway Mechanical", trade: "HVAC & plumbing" },
  { name: "Keystone Concrete", trade: "Concrete" },
  { name: "Mesa Steelworks", trade: "Structural steel" },
]

const DEFAULT_STATS: PlbStat[] = [
  { value: 4.2, prefix: "$", suffix: "B", decimals: 1, label: "Construction payroll run every year" },
  { value: 3, suffix: " min", label: "Median time to approve a payrun" },
  { value: 50, label: "States filed, plus every locality in them" },
  { value: 99.9, suffix: "%", decimals: 1, label: "Paydays landed on time, ever" },
]

const DEFAULT_QUOTES: PlbQuote[] = [
  {
    quote:
      "We used to lose two days a week to payroll across four states and three union agreements. Now our controller approves it before her second coffee.",
    name: "Marisol Vega",
    role: "Controller",
    company: "Northgate Builders",
    metric: { before: "2 days", after: "3 hrs", label: "weekly payroll" },
  },
  {
    quote:
      "Certified payroll was the job nobody wanted. Plumb files the WH-347s and the state portals for us, and we haven't had a single rejection this year.",
    name: "Dev Anand",
    role: "Payroll Manager",
    company: "Halberd Electric",
    metric: { before: "41", after: "0", label: "rejected reports" },
  },
  {
    quote:
      "For the first time I can see fully-burdened labor cost by job while the job is still running, not three weeks after we've lost money on it.",
    name: "Tom Okafor",
    role: "CFO",
    company: "Mesa Steelworks",
    metric: { before: "21 days", after: "Live", label: "job cost visibility" },
  },
]

const DEFAULT_FAQ: PlbFaq[] = [
  { q: "How long does it take to switch?", a: "Most contractors run their first payroll on Plumb within two weeks. We import employees, year-to-date totals, rates and union agreements for you, then run a parallel payroll to check every number." },
  { q: "Does it handle prevailing wage and union rates?", a: "Yes. Rates live on the job and the classification, so a journeyman who moves from a private job to a public one mid-week is paid both rates correctly, fringes included." },
  { q: "Which ERPs and accounting systems do you integrate with?", a: "Plumb syncs job costs, cost codes and GL entries with the common construction ERPs and accounting packages, and exports a clean file for anything else." },
  { q: "Can my crews clock in from the field?", a: "Crews clock in from the mobile app or a shared kiosk, pick the job and cost code, and geofencing confirms they're on site. Foremen can approve the day's hours from their phone." },
  { q: "What does it cost?", a: "Pricing is per employee per month, with certified payroll and multi-state filing included. There's no setup fee, and you can cancel any time." },
]

const PANEL_LAYOUTS: { a: number[]; b: number[]; bands: [number, number][] }[] = [
  { a: [262, 474, 653, 838, 1074], b: [-668], bands: [[838, 1074], [700, 800]] },
  { a: [120, 360, 590, 900, 1130], b: [-520, -760], bands: [[360, 590], [900, 1130]] },
  { a: [200, 430, 760, 980], b: [-610], bands: [[200, 300], [760, 980]] },
  { a: [300, 520, 700, 1010, 1220], b: [-700, -420], bands: [[520, 700], [1010, 1220]] },
]
// #endregion content

// #region logic
function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - clamp(t, 0, 1), 3)
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

function cents(n: number): number {
  return Math.round(n * 100) / 100
}

function formatMoney(n: number, decimals = 2): string {
  const neg = n < 0
  const fixed = Math.abs(n).toFixed(decimals)
  const [whole, frac] = fixed.split(".")
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  return (neg ? "-$" : "$") + grouped + (frac ? "." + frac : "")
}

function formatStat(s: PlbStat, v: number): string {
  const d = s.decimals ?? 0
  const body = v.toFixed(d).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  return (s.prefix ?? "") + body + (s.suffix ?? "")
}

/** Figures with every resolved alert's deltas applied, rounded to cents. */
function applyDeltas(figures: PlbFigure[], alerts: PlbAlert[], resolved: string[]): PlbFigure[] {
  return figures.map((f) => {
    if (typeof f.value !== "number") return f
    let v = f.value
    for (const a of alerts) if (resolved.includes(a.id) && a.delta && typeof a.delta[f.label] === "number") v += a.delta[f.label]
    return { label: f.label, value: cents(v) }
  })
}

function figureValue(figures: PlbFigure[], label: string): number {
  const f = figures.find((x) => x.label === label)
  return f && typeof f.value === "number" ? f.value : 0
}

function rateRow(base: number, fringe: number): { base: number; fringe: number; ot: number; total: number } {
  return { base, fringe, ot: cents(base * 1.5 + fringe), total: cents(base + fringe) }
}

const FRINGE_PARTS = ["Health & welfare", "Pension", "Vacation", "Training"]
const FRINGE_SHARE = [0.42, 0.33, 0.17, 0.08]

/** The fringe split into its funds, in cents, always summing back to the fringe. */
function fringeSplit(fringe: number): { label: string; value: number }[] {
  const total = Math.round(fringe * 100)
  const parts = FRINGE_SHARE.map((s) => Math.floor(total * s))
  parts[0] += total - parts.reduce((a, b) => a + b, 0)
  return parts.map((p, i) => ({ label: FRINGE_PARTS[i], value: p / 100 }))
}

const PERIODS = [
  { label: "Week", mult: 1 },
  { label: "Month", mult: 4.33 },
  { label: "Year to date", mult: 14 },
]

function costOf(job: PlbCostJob, burdened: boolean, mult: number) {
  const wages = job.wages * mult
  const burden = burdened ? (job.taxes + job.fringe + job.comp) * mult : 0
  const total = wages + burden
  const budget = job.budget * mult
  return { wages, taxes: burdened ? job.taxes * mult : 0, fringe: burdened ? job.fringe * mult : 0, comp: burdened ? job.comp * mult : 0, total, budget, over: total > budget }
}

/** Burden as a share of wages across every job. */
function burdenRate(jobs: PlbCostJob[]): number {
  const w = jobs.reduce((a, j) => a + j.wages, 0)
  const b = jobs.reduce((a, j) => a + j.taxes + j.fringe + j.comp, 0)
  return w > 0 ? b / w : 0
}

/** A rough, stated-as-such estimate of what moving payroll saves in a year. */
function roiEstimate(i: { crew: number; hours: number; states: number; rate: number }): { hours: number; dollars: number; filings: number } {
  const crew = Math.max(0, i.crew)
  const weekly = Math.max(0, i.hours) * 0.8
  const filings = Math.max(1, Math.round(i.states)) * 4 * 3
  const hours = Math.round(weekly * 52 + filings * 1.5)
  const corrections = crew * 0.04 * 52 * 0.75 * 45
  return { hours, dollars: Math.round(hours * Math.max(0, i.rate) + corrections), filings }
}

/** Integer shares of 100 by the largest-remainder method. */
function percentages(values: number[]): number[] {
  const sum = values.reduce((a, b) => a + b, 0)
  if (sum <= 0) return values.map(() => 0)
  const raw = values.map((v) => (v / sum) * 100)
  const out = raw.map(Math.floor)
  const order = raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1])
  for (let k = 0; k < 100 - out.reduce((a, b) => a + b, 0); k++) out[order[k][1]] += 1
  return out
}

function clockText(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0")
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

// The panel art lives in a 1316 x 660 box. Family A rises to the right, B falls.
const PANEL_W = 1316
const PANEL_H = 660
const SLOPE = 0.55

function lineA(c: number): string {
  return "M-60 " + (c + SLOPE * 60).toFixed(1) + "L" + (PANEL_W + 60) + " " + (c - SLOPE * (PANEL_W + 60)).toFixed(1)
}

function lineB(c: number): string {
  return "M-60 " + (c - SLOPE * 60).toFixed(1) + "L" + (PANEL_W + 60) + " " + (c + SLOPE * (PANEL_W + 60)).toFixed(1)
}

function bandPath(c1: number, c2: number): string {
  const x0 = -60
  const x1 = PANEL_W + 60
  const y = (c: number, x: number) => (c - SLOPE * x).toFixed(1)
  return "M" + x0 + " " + y(c1, x0) + "L" + x1 + " " + y(c1, x1) + "L" + x1 + " " + y(c2, x1) + "L" + x0 + " " + y(c2, x0) + "Z"
}

/** A tile of short, randomly turned flecks, the same for the same seed. */
function speckleTile(seed: number, size = 72, n = 34): string {
  const r = mulberry32(seed)
  let d = ""
  for (let k = 0; k < n; k++) {
    const x = r() * size
    const y = r() * size
    const a = r() * Math.PI
    const l = 1 + r() * 1.9
    const dx = Math.cos(a) * l
    const dy = Math.sin(a) * l
    d += "M" + (x - dx).toFixed(1) + " " + (y - dy).toFixed(1) + "l" + (dx * 2).toFixed(1) + " " + (dy * 2).toFixed(1)
  }
  return d
}

function resolvePalette(p: PlbPaletteName | PlbPaletteInput | undefined): PlbPalette {
  if (typeof p === "string") return PALETTES[p] ?? PALETTES.forest
  return { ...PALETTES.forest, ...(p ?? {}) }
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

function useInView(ref: { current: Element | null }, once = true): boolean {
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
      { threshold: 0.18 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [ref, once])
  return seen
}

/** Eases from wherever it is to `target` whenever `target` changes and `run` is on. */
function useTween(target: number, run: boolean, reduced: boolean, from: number): number {
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
      const k = clamp((t - t0) / 760, 0, 1)
      const x = a + (target - a) * easeOutCubic(k)
      cur.current = x
      setV(x)
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, run, reduced])
  return v
}

function Money({ value, run, reduced, from = 0.72 }: { value: number; run: boolean; reduced: boolean; from?: number }) {
  const v = useTween(value, run, reduced, value * from)
  return <>{formatMoney(v)}</>
}

/* ------------------------------- drawn marks ------------------------------- */

function PlumbMark({ size = 22 }: { size?: number }) {
  return (
    <svg className="plb-svg" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 1.5v5.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="7.6" r="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 9.6c3.2 0 5.6 2.2 5.6 5 0 1.9-1.4 3.4-3 4.9L12 22.4l-2.6-2.9c-1.6-1.5-3-3-3-4.9 0-2.8 2.4-5 5.6-5z" fill="currentColor" />
      <path d="M9.4 14.2h5.2" stroke="var(--plb-page)" strokeWidth="1.2" strokeLinecap="round" opacity=".55" />
    </svg>
  )
}

function HookArrow() {
  return (
    <svg className="plb-svg plb-hook" width="16" height="14" viewBox="0 0 16 14" aria-hidden="true">
      <path d="M2 1.5v5.5a2 2 0 0 0 2 2h9.2M10 5.6l3.4 3.4L10 12.4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function AlertDot() {
  return (
    <svg className="plb-svg" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="9" cy="9" r="8.2" fill="currentColor" />
      <path d="M9 4.6v5.2" stroke="var(--plb-warn)" strokeWidth="1.9" strokeLinecap="round" />
      <circle cx="9" cy="12.9" r="1.15" fill="var(--plb-warn)" />
    </svg>
  )
}

function Check({ size = 14 }: { size?: number }) {
  return (
    <svg className="plb-svg" width={size} height={size} viewBox="0 0 14 14" aria-hidden="true">
      <path d="M2.6 7.4l2.8 2.8 6-6.2" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Chevron({ open }: { open?: boolean }) {
  return (
    <svg className="plb-svg plb-chev" data-open={open ? "" : undefined} width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path d="M3 5.2l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Spinner() {
  return <span className="plb-spin" aria-hidden="true" />
}

const LOGO_SHAPES = [
  "M3 19L12 4l9 15z",
  "M4 5h16v3h-6v8h6v3H4v-3h6V8H4z",
  "M4 20V11a8 8 0 0 1 16 0v9h-4v-9a4 4 0 0 0-8 0v9z",
  "M12 3l8 4.6v9.2L12 21l-8-4.6V7.6z",
  "M4 4h7v7H4zM13 13h7v7h-7zM13 4h7v7h-7z",
  "M3 15l9-9 9 9-3 3-6-6-6 6z",
]

function CustomerLogo({ name, i }: { name: string; i: number }) {
  return (
    <span className="plb-logo" data-i={i % LOGO_SHAPES.length}>
      <svg className="plb-svg" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
        <path d={LOGO_SHAPES[i % LOGO_SHAPES.length]} fill="currentColor" />
      </svg>
      <span>{name}</span>
    </span>
  )
}

/** The panel's art: diagonal rules and speckled strips, drifting with the pointer. */
function PanelArt({ uid, layout, seed }: { uid: string; layout: number; seed: number }) {
  const L = PANEL_LAYOUTS[layout % PANEL_LAYOUTS.length]
  const pat = uid + "-spk" + layout
  return (
    <svg className="plb-svg plb-art" viewBox={"0 0 " + PANEL_W + " " + PANEL_H} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <pattern id={pat} width="72" height="72" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">
          <path d={speckleTile(seed + layout * 101)} stroke="var(--plb-pline)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </pattern>
      </defs>
      <g className="plb-art-drift">
        {L.bands.map(([a, b], k) => (
          <path key={"b" + k} d={bandPath(a, b)} fill={"url(#" + pat + ")"} opacity=".9" />
        ))}
        {L.a.map((c, k) => (
          <path key={"a" + k} d={lineA(c)} stroke="var(--plb-pline)" strokeWidth="3.2" fill="none" />
        ))}
        {L.b.map((c, k) => (
          <path key={"x" + k} d={lineB(c)} stroke="var(--plb-pline)" strokeWidth="3.2" fill="none" />
        ))}
      </g>
    </svg>
  )
}

/* ------------------------------ the live mocks ----------------------------- */

type MockProps = { active: boolean; reduced: boolean }

function PayrunMock({ run, active, reduced, onApprove }: MockProps & { run: PlbPayrun; onApprove?: (r: PlbApproval) => unknown }) {
  const [resolved, setResolved] = React.useState([] as string[])
  const [pulse, setPulse] = React.useState(0)
  const [state, setState] = React.useState("idle" as "idle" | "blocked" | "sending" | "done" | "error")
  const alive = React.useRef(true)
  React.useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const stats = applyDeltas(run.stats, run.alerts, resolved)
  const left = applyDeltas(run.left, run.alerts, resolved)
  const right = applyDeltas(run.right, run.alerts, resolved)
  const open = run.alerts.filter((a) => !resolved.includes(a.id))

  const approve = async () => {
    if (state === "sending" || state === "done") return
    if (open.length) {
      setState("blocked")
      setPulse((p) => p + 1)
      return
    }
    setState("sending")
    let ok = true
    try {
      const payload = { period: run.period, gross: figureValue(stats, "Gross pay"), net: figureValue(stats, "Net pay") }
      const res = onApprove ? await onApprove(payload) : await new Promise((r) => setTimeout(r, 1100))
      if (res === false) ok = false
    } catch {
      ok = false
    }
    if (alive.current) setState(ok ? "done" : "error")
  }

  const label =
    state === "sending" ? "Approving…" : state === "done" ? "Approved" : state === "blocked" ? "Resolve " + open.length + " first" : state === "error" ? "Try again" : "Approve payroll"

  return (
    <div className="plb-mock plb-run">
      <div className="plb-run-head">
        <div>
          <h3 className="plb-mock-title">Approve payroll for {run.period}</h3>
          <dl className="plb-meta">
            {run.meta.map((m) => (
              <div key={m.label}>
                <dt>{m.label}</dt>
                <dd>{m.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <button
          type="button"
          className="plb-btn plb-btn--accent plb-approve"
          data-state={state}
          onClick={approve}
          aria-live="polite"
          disabled={state === "sending" || state === "done"}
        >
          {state === "sending" ? <Spinner /> : state === "done" ? <Check /> : null}
          {label}
        </button>
      </div>

      {state === "done" ? (
        <div className="plb-banner plb-banner--good" role="status">
          <Check />
          <span>
            <b>Payroll approved.</b> {formatMoney(figureValue(stats, "Net pay"))} debits on {String(stats.find((s) => s.label === "Debit date")?.value ?? "")}.
          </span>
          <button type="button" className="plb-banner-act" onClick={() => setState("idle")}>
            Undo
          </button>
        </div>
      ) : null}
      {state === "error" ? (
        <div className="plb-banner plb-banner--bad" role="alert">
          <span>
            <b>Couldn't approve.</b> Nothing was sent. Try again in a moment.
          </span>
        </div>
      ) : null}

      <ul className="plb-alerts" key={pulse} data-pulse={pulse ? "" : undefined}>
        {run.alerts.map((a) => {
          const done = resolved.includes(a.id)
          return (
            <li key={a.id} className="plb-alert" data-done={done ? "" : undefined}>
              <span className="plb-alert-ico">{done ? <Check size={15} /> : <AlertDot />}</span>
              <span className="plb-alert-txt">
                {done ? (
                  <>
                    <b>Resolved.</b> {a.fixed}
                  </>
                ) : (
                  <>
                    <b>{a.title}</b> {a.text}
                  </>
                )}
              </span>
              <button
                type="button"
                className="plb-alert-act"
                onClick={() => {
                  setResolved((r) => (done ? r.filter((x) => x !== a.id) : [...r, a.id]))
                  if (state === "blocked" || state === "error") setState("idle")
                }}
              >
                {done ? "Undo" : "Resolve"}
              </button>
            </li>
          )
        })}
      </ul>

      <div className="plb-stats">
        {stats.map((s) => (
          <div key={s.label} className="plb-stat">
            <span>{s.label}</span>
            <b>{typeof s.value === "number" ? <Money value={s.value} run={active} reduced={reduced} /> : s.value}</b>
          </div>
        ))}
      </div>

      <div className="plb-lines">
        {[left, right].map((col, c) => (
          <dl key={c}>
            {col.map((f) => (
              <div key={f.label} className="plb-line">
                <dt>{f.label}</dt>
                <dd>{typeof f.value === "number" ? <Money value={f.value} run={active} reduced={reduced} from={0.9} /> : f.value}</dd>
              </div>
            ))}
          </dl>
        ))}
      </div>
    </div>
  )
}

function RatesMock({ rates, active, reduced }: MockProps & { rates: PlbRates }) {
  const [job, setJob] = React.useState(0)
  const [row, setRow] = React.useState(0)
  const j = rates.jobs[job] ?? rates.jobs[0]
  const sel = j.rates[row] ?? j.rates[0]
  const split = fringeSplit(sel[1])
  return (
    <div className="plb-mock plb-rates">
      <div className="plb-run-head">
        <div>
          <h3 className="plb-mock-title">Pay rates by job</h3>
          <p className="plb-mock-sub">{j.kind}</p>
        </div>
        <span className="plb-chip plb-chip--good">
          <Check size={12} /> Applied to 214 timesheets
        </span>
      </div>
      <div className="plb-seg" role="radiogroup" aria-label="Job">
        {rates.jobs.map((x, i) => (
          <button key={x.name} type="button" role="radio" aria-checked={i === job} className="plb-seg-btn" onClick={() => setJob(i)}>
            {x.name}
          </button>
        ))}
      </div>
      <div className="plb-table" role="table" aria-label={"Rates on " + j.name}>
        <div className="plb-tr plb-th" role="row">
          <span role="columnheader">Classification</span>
          <span role="columnheader">Base</span>
          <span role="columnheader">Fringe</span>
          <span role="columnheader">Overtime</span>
          <span role="columnheader">Package</span>
        </div>
        {rates.classes.map((cls, i) => {
          const r = rateRow(...(j.rates[i] ?? [0, 0]))
          return (
            <button
              key={cls}
              type="button"
              role="row"
              className="plb-tr"
              aria-pressed={i === row}
              onClick={() => setRow(i)}
            >
              <span role="cell">{cls}</span>
              <span role="cell"><Money value={r.base} run={active} reduced={reduced} from={0.94} /></span>
              <span role="cell"><Money value={r.fringe} run={active} reduced={reduced} from={0.94} /></span>
              <span role="cell"><Money value={r.ot} run={active} reduced={reduced} from={0.94} /></span>
              <span role="cell"><b><Money value={r.total} run={active} reduced={reduced} from={0.94} /></b></span>
            </button>
          )
        })}
      </div>
      <div className="plb-fringe" aria-live="polite">
        <span className="plb-fringe-k">{rates.classes[row]} · fringe {formatMoney(sel[1])}/hr</span>
        <div className="plb-fringe-bar">
          {split.map((p, i) => (
            <span key={p.label} style={{ flexGrow: p.value || 0.001 }} data-i={i} title={p.label + " " + formatMoney(p.value)} />
          ))}
        </div>
        <ul className="plb-fringe-legend">
          {split.map((p, i) => (
            <li key={p.label} data-i={i}>
              <i />
              {p.label} <b>{formatMoney(p.value)}</b>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function CostsMock({ jobs, active, reduced }: MockProps & { jobs: PlbCostJob[] }) {
  const [burdened, setBurdened] = React.useState(true)
  const [period, setPeriod] = React.useState(0)
  const [hover, setHover] = React.useState(-1)
  const mult = PERIODS[period].mult
  const rows = jobs.map((j) => ({ job: j, c: costOf(j, burdened, mult) }))
  const max = Math.max(1, ...rows.map((r) => Math.max(r.c.total, r.c.budget)))
  const total = rows.reduce((a, r) => a + r.c.total, 0)
  const over = rows.filter((r) => r.c.over).length
  return (
    <div className="plb-mock plb-costs">
      <div className="plb-run-head">
        <div>
          <h3 className="plb-mock-title">Labor cost by job</h3>
          <p className="plb-mock-sub">Updated with every payrun · burden rate {(burdenRate(jobs) * 100).toFixed(1)}%</p>
        </div>
        <label className="plb-switch">
          <input type="checkbox" checked={burdened} onChange={(e) => setBurdened(e.target.checked)} />
          <span className="plb-switch-track" aria-hidden="true" />
          Fully burdened
        </label>
      </div>
      <div className="plb-seg plb-seg--sm" role="radiogroup" aria-label="Period">
        {PERIODS.map((p, i) => (
          <button key={p.label} type="button" role="radio" aria-checked={i === period} className="plb-seg-btn" onClick={() => setPeriod(i)}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="plb-stats plb-stats--3">
        <div className="plb-stat">
          <span>Total labor cost</span>
          <b><Money value={total} run={active} reduced={reduced} from={0.8} /></b>
        </div>
        <div className="plb-stat">
          <span>Jobs tracked</span>
          <b>{jobs.length}</b>
        </div>
        <div className="plb-stat" data-tone={over ? "bad" : "good"}>
          <span>Over budget</span>
          <b>{over ? over + (over === 1 ? " job" : " jobs") : "None"}</b>
        </div>
      </div>
      <ul className="plb-bars">
        {rows.map((r, i) => {
          const segs = [
            { k: "wages", v: r.c.wages, l: "Wages" },
            { k: "taxes", v: r.c.taxes, l: "Taxes" },
            { k: "fringe", v: r.c.fringe, l: "Fringe" },
            { k: "comp", v: r.c.comp, l: "Workers' comp" },
          ]
          return (
            <li key={r.job.code} className="plb-bar" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(-1)} onFocus={() => setHover(i)} onBlur={() => setHover(-1)} tabIndex={0} data-over={r.c.over ? "" : undefined}>
              <div className="plb-bar-k">
                <span>
                  <em>{r.job.code}</em> {r.job.name}
                </span>
                <b>{formatMoney(r.c.total, 0)}</b>
              </div>
              <div className="plb-bar-track">
                {segs.map((s) => (
                  <span key={s.k} data-k={s.k} style={{ width: (s.v / max) * 100 + "%" }} />
                ))}
                <i className="plb-bar-budget" style={{ left: (r.c.budget / max) * 100 + "%" }} title={"Budget " + formatMoney(r.c.budget, 0)} />
              </div>
              {hover === i ? (
                <div className="plb-tip" role="tooltip">
                  {segs.filter((s) => s.v > 0).map((s) => (
                    <span key={s.k} data-k={s.k}>
                      <i />
                      {s.l} <b>{formatMoney(s.v, 0)}</b>
                    </span>
                  ))}
                  <span>
                    Budget <b>{formatMoney(r.c.budget, 0)}</b>
                  </span>
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function ComplianceMock({ filings, reduced }: MockProps & { filings: PlbFiling[] }) {
  const [filed, setFiled] = React.useState(0)
  const [running, setRunning] = React.useState(false)
  React.useEffect(() => {
    if (!running) return
    if (filed >= filings.length) {
      setRunning(false)
      return
    }
    const t = setTimeout(() => setFiled((f) => f + 1), reduced ? 120 : 650)
    return () => clearTimeout(t)
  }, [running, filed, filings.length, reduced])
  const all = filed >= filings.length
  return (
    <div className="plb-mock plb-comp">
      <div className="plb-run-head">
        <div>
          <h3 className="plb-mock-title">Filings for week ending Apr 5</h3>
          <p className="plb-mock-sub">
            {filed} of {filings.length} filed · next deadline Apr 12
          </p>
        </div>
        <button
          type="button"
          className="plb-btn plb-btn--accent"
          disabled={running}
          onClick={() => {
            if (all) setFiled(0)
            else setRunning(true)
          }}
        >
          {running ? <Spinner /> : null}
          {running ? "Filing…" : all ? "Reset" : "File all"}
        </button>
      </div>
      <div className="plb-progress" role="progressbar" aria-valuemin={0} aria-valuemax={filings.length} aria-valuenow={filed} aria-label="Filed">
        <span style={{ width: (filed / Math.max(1, filings.length)) * 100 + "%" }} />
      </div>
      <ul className="plb-filings">
        {filings.map((f, i) => {
          const st = i < filed ? "filed" : running && i === filed ? "filing" : "ready"
          return (
            <li key={f.name} className="plb-filing" data-st={st}>
              <span className="plb-filing-ico">{st === "filed" ? <Check size={13} /> : st === "filing" ? <Spinner /> : <span className="plb-doc" />}</span>
              <span className="plb-filing-k">
                <b>{f.name}</b>
                <span>
                  {f.agency} · {f.scope}
                </span>
              </span>
              <span className="plb-chip" data-st={st}>
                {st === "filed" ? "Filed" : st === "filing" ? "Submitting" : "Ready"}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/* ------------------------------ platform bento ----------------------------- */

const COST_CODES = ["Framing", "Electrical rough-in", "Concrete"]

function ClockPhone({ reduced }: { reduced: boolean }) {
  const [since, setSince] = React.useState(null as number | null)
  const [now, setNow] = React.useState(0)
  const [code, setCode] = React.useState(0)
  const [log, setLog] = React.useState([
    { code: "Framing", span: "6:00 – 10:30 AM", hrs: "4.50" },
  ])
  React.useEffect(() => {
    if (since === null) return
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [since])
  const elapsed = since === null ? 0 : (now - since) / 1000
  const toggle = () => {
    if (since === null) {
      setSince(Date.now())
      setNow(Date.now())
    } else {
      const secs = Math.max(1, Math.round((Date.now() - since) / 1000))
      setLog((l) => [{ code: COST_CODES[code], span: "Just now · " + clockText(secs), hrs: (secs / 3600).toFixed(2) }, ...l].slice(0, 3))
      setSince(null)
    }
  }
  return (
    <div className="plb-phone" data-reduced={reduced ? "" : undefined}>
      <div className="plb-phone-notch" />
      <div className="plb-phone-top">
        <span>Luis Ortega</span>
        <span className="plb-geo">
          <i /> On site
        </span>
      </div>
      <p className="plb-phone-job">Riverside Medical Center</p>
      <div className="plb-phone-clock" aria-live="off">{clockText(elapsed)}</div>
      <div className="plb-phone-codes" role="radiogroup" aria-label="Cost code">
        {COST_CODES.map((c, i) => (
          <button key={c} type="button" role="radio" aria-checked={i === code} onClick={() => setCode(i)} disabled={since !== null}>
            {c}
          </button>
        ))}
      </div>
      <button type="button" className="plb-phone-btn" data-on={since !== null ? "" : undefined} onClick={toggle}>
        {since === null ? "Clock in" : "Clock out"}
      </button>
      <ul className="plb-phone-log">
        {log.map((l, i) => (
          <li key={i + l.span}>
            <span>
              <b>{l.code}</b>
              {l.span}
            </span>
            <em>{l.hrs}h</em>
          </li>
        ))}
      </ul>
    </div>
  )
}

const SYNC_NODES = [
  { label: "General ledger", x: 40, y: 34 },
  { label: "Project management", x: 220, y: 22 },
  { label: "Estimating", x: 268, y: 128 },
  { label: "HR & benefits", x: 192, y: 214 },
  { label: "Equipment", x: 30, y: 196 },
]

function SyncOrbit({ uid }: { uid: string }) {
  const [state, setState] = React.useState("idle" as "idle" | "syncing" | "done")
  const [hot, setHot] = React.useState(-1)
  React.useEffect(() => {
    if (state !== "syncing") return
    const t = setTimeout(() => setState("done"), 1700)
    return () => clearTimeout(t)
  }, [state])
  const cx = 150
  const cy = 122
  return (
    <div className="plb-sync" data-state={state}>
      <div className="plb-sync-map">
      <svg className="plb-svg plb-sync-svg" viewBox="0 0 300 244" width="300" height="244" aria-hidden="true">
        <defs>
          <radialGradient id={uid + "-glow"}>
            <stop offset="0" stopColor="var(--plb-p0)" stopOpacity=".22" />
            <stop offset="1" stopColor="var(--plb-p0)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cy} r="78" fill={"url(#" + uid + "-glow)"} />
        {SYNC_NODES.map((n, i) => (
          <path
            key={n.label}
            className="plb-sync-link"
            data-hot={hot === i ? "" : undefined}
            d={"M" + cx + " " + cy + "Q" + (cx + n.x) / 2 + " " + (cy + n.y) / 2 + " " + n.x + " " + n.y}
            style={{ animationDelay: i * -0.27 + "s" }}
          />
        ))}
        <circle cx={cx} cy={cy} r="24" fill="var(--plb-ink)" />
        <g transform={"translate(" + (cx - 11) + " " + (cy - 12) + ")"} color="var(--plb-page)">
          <path d="M11 1.5v4.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="11" cy="7" r="1.3" fill="none" stroke="currentColor" strokeWidth="1.3" />
          <path d="M11 8.8c2.9 0 5 2 5 4.5 0 1.7-1.3 3-2.7 4.4L11 20.3l-2.3-2.6C7.3 16.3 6 15 6 13.3c0-2.5 2.1-4.5 5-4.5z" fill="currentColor" />
        </g>
      </svg>
      {SYNC_NODES.map((n, i) => (
        <span
          key={n.label}
          className="plb-sync-node"
          style={{ left: (n.x / 300) * 100 + "%", top: (n.y / 244) * 100 + "%" }}
          onMouseEnter={() => setHot(i)}
          onMouseLeave={() => setHot(-1)}
        >
          {n.label}
        </span>
      ))}
      </div>
      <div className="plb-sync-foot">
        <span aria-live="polite">{state === "syncing" ? "Syncing 1,284 records…" : state === "done" ? "Synced just now · 1,284 records" : "Last synced 2 hours ago"}</span>
        <button type="button" className="plb-btn plb-btn--ghost plb-btn--sm" disabled={state === "syncing"} onClick={() => setState("syncing")}>
          {state === "syncing" ? <Spinner /> : null}
          Sync now
        </button>
      </div>
    </div>
  )
}

const MULTI_STATE = [
  { name: "Dana Ramos", wage: 48.5, states: [{ code: "WA", hours: 22, rate: 0 }, { code: "OR", hours: 14, rate: 0.0875 }, { code: "ID", hours: 6, rate: 0.058 }] },
  { name: "Jae Park", wage: 41, states: [{ code: "NY", hours: 28, rate: 0.0685 }, { code: "NJ", hours: 12, rate: 0.0553 }] },
  { name: "Ana Lima", wage: 55.25, states: [{ code: "CA", hours: 30, rate: 0.093 }, { code: "NV", hours: 10, rate: 0 }, { code: "AZ", hours: 4, rate: 0.025 }] },
]

function MultiState() {
  const [who, setWho] = React.useState(0)
  const p = MULTI_STATE[who]
  const pct = percentages(p.states.map((s) => s.hours))
  return (
    <div className="plb-ms">
      <div className="plb-seg plb-seg--sm" role="radiogroup" aria-label="Employee">
        {MULTI_STATE.map((x, i) => (
          <button key={x.name} type="button" role="radio" aria-checked={i === who} className="plb-seg-btn" onClick={() => setWho(i)}>
            {x.name.split(" ")[0]}
          </button>
        ))}
      </div>
      <p className="plb-ms-k">
        {p.name} worked in <b>{p.states.length} states</b> this week
      </p>
      <div className="plb-ms-bar">
        {p.states.map((s, i) => (
          <span key={s.code} data-i={i} style={{ flexGrow: s.hours }}>
            {s.code} {pct[i]}%
          </span>
        ))}
      </div>
      <ul className="plb-ms-list">
        {p.states.map((s, i) => (
          <li key={s.code}>
            <i data-i={i} />
            <span>
              {s.code} · {s.hours} hrs
            </span>
            <b>{s.rate ? formatMoney(s.hours * p.wage * s.rate) : "No income tax"}</b>
          </li>
        ))}
      </ul>
    </div>
  )
}

const PAY_OPTIONS = [
  { label: "Deposit", when: "Arrives Thu, Apr 10 by 9 AM", note: "Split across up to 3 accounts" },
  { label: "Paycard", when: "Available on payday at 6 AM", note: "No fees at 40,000+ ATMs" },
  { label: "Check", when: "Printed, signed and shipped to the job", note: "Delivered to the foreman Wed" },
]

function PayOptions() {
  const [i, setI] = React.useState(0)
  const o = PAY_OPTIONS[i]
  return (
    <div className="plb-pay">
      <div className="plb-seg plb-seg--sm" role="radiogroup" aria-label="Pay method">
        {PAY_OPTIONS.map((x, k) => (
          <button key={x.label} type="button" role="radio" aria-checked={k === i} className="plb-seg-btn" onClick={() => setI(k)}>
            {x.label}
          </button>
        ))}
      </div>
      <div className="plb-stub" key={i}>
        <div className="plb-stub-row">
          <span>Pay stub · Apr 10</span>
          <span className="plb-chip plb-chip--good">{o.label}</span>
        </div>
        <b className="plb-stub-net">{formatMoney(1842.36)}</b>
        <span className="plb-stub-k">Net pay · 46.5 hrs incl. 6.5 OT</span>
        <div className="plb-stub-row plb-stub-when">
          <span>{o.when}</span>
          <span>{o.note}</span>
        </div>
      </div>
    </div>
  )
}

/* ---------------------------------- page ---------------------------------- */

function Avatar({ name, i }: { name: string; i: number }) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .slice(0, 2)
    .join("")
  return (
    <span className="plb-avatar" style={{ background: "var(--plb-p" + (i % 4) + ")" }} aria-hidden="true">
      {initials}
    </span>
  )
}

const CREW_SIZES = ["1–49", "50–199", "200–999", "1,000+"]

export default function PlumbPayrollTemplate({
  brand = "Plumb",
  logo,
  nav,
  hero,
  tabs: tabsIn = DEFAULT_TABS,
  payrun = DEFAULT_PAYRUN,
  rates = DEFAULT_RATES,
  costs = DEFAULT_COSTS,
  filings = DEFAULT_FILINGS,
  customers,
  stats,
  platform,
  stories,
  calculator,
  faq,
  cta,
  footer,
  palette = "forest",
  autoplay = 7000,
  onApprove,
  onBookDemo,
  height = "100svh",
  className,
}: PlumbPayrollTemplateProps) {
  const tabs = tabsIn.length ? tabsIn : DEFAULT_TABS
  const uid = "plb" + React.useId().replace(/[^a-zA-Z0-9]/g, "")
  const reduced = useReducedMotion()
  const pal = resolvePalette(palette)
  const rootRef = React.useRef(null as HTMLDivElement | null)
  const tourRef = React.useRef(null as HTMLElement | null)
  const statsRef = React.useRef(null as HTMLElement | null)
  const emailRef = React.useRef(null as HTMLInputElement | null)
  const tourSeen = useInView(tourRef, false)
  const statsSeen = useInView(statsRef)

  const navCfg = nav === null ? null : {
    links: nav?.links ?? [
      { label: "Product", href: "#showcase" },
      { label: "Customers", href: "#customers" },
      { label: "Platform", href: "#platform" },
      { label: "Savings", href: "#calculator" },
      { label: "FAQ", href: "#faq" },
    ],
    login: nav?.login ?? { label: "Log in", href: "#" },
    cta: nav?.cta ?? { label: "Book a demo", href: "#demo" },
  }
  const heroCfg = hero === null ? null : {
    title: hero?.title ?? "Blazing-fast\nconstruction payroll.",
    text:
      hero?.text ??
      brand + "'s construction payroll automates certified reporting, handles multi-state taxes, syncs with your ERP, and tracks fully-burdened labor cost by job as it happens.",
    link: hero?.link ?? { label: "Find out more", href: "#showcase" },
  }

  /* ---- tabs ---- */
  const [tab, setTab] = React.useState(0)
  const [auto, setAuto] = React.useState(autoplay !== false)
  const [hold, setHold] = React.useState(false)
  const tabRefs = React.useRef([] as (HTMLButtonElement | null)[])
  const pick = (i: number, focus = false) => {
    setTab(i)
    setAuto(false)
    if (focus) tabRefs.current[i]?.focus()
  }
  const running = auto && !reduced && autoplay !== false && tourSeen && !hold
  const cur = tabs[tab] ?? tabs[0]
  const [panelBg, panelLine] = pal.panels[tab % pal.panels.length] ?? pal.panels[0]

  /* ---- pointer drift on the panel ---- */
  const panelRef = React.useRef(null as HTMLDivElement | null)
  const onPanelMove = (e: React.PointerEvent) => {
    if (reduced || e.pointerType !== "mouse") return
    const el = panelRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty("--plb-dx", (((e.clientX - r.left) / r.width - 0.5) * 18).toFixed(2) + "px")
    el.style.setProperty("--plb-dy", (((e.clientY - r.top) / r.height - 0.5) * 12).toFixed(2) + "px")
  }
  const onPanelLeave = () => {
    panelRef.current?.style.setProperty("--plb-dx", "0px")
    panelRef.current?.style.setProperty("--plb-dy", "0px")
  }

  /* ---- nav ---- */
  const [solid, setSolid] = React.useState(false)
  const [menu, setMenu] = React.useState(false)
  React.useEffect(() => {
    const on = () => setSolid(window.scrollY > 8)
    on()
    window.addEventListener("scroll", on, { passive: true })
    return () => window.removeEventListener("scroll", on)
  }, [])

  const go = (href: string | undefined, e?: React.MouseEvent) => {
    if (!href || !href.startsWith("#")) return
    const key = href.slice(1)
    const el = rootRef.current?.querySelector('[data-sec="' + key + '"]') as HTMLElement | null
    if (!el && key) return
    e?.preventDefault()
    setMenu(false)
    if (!el) return
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" })
    if (key === "demo") setTimeout(() => emailRef.current?.focus({ preventScroll: true }), reduced ? 0 : 520)
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

  /* ---- stories ---- */
  const quotes = stories === null ? [] : stories?.quotes ?? DEFAULT_QUOTES
  const [q, setQ] = React.useState(0)
  const quote = quotes[q % Math.max(1, quotes.length)]

  /* ---- calculator ---- */
  const [crew, setCrew] = React.useState(180)
  const [hours, setHours] = React.useState(16)
  const [states, setStates] = React.useState(4)
  const [rate, setRate] = React.useState(48)
  const roi = roiEstimate({ crew, hours, states, rate })
  const roiDollars = useTween(roi.dollars, true, reduced, roi.dollars)
  const roiHours = useTween(roi.hours, true, reduced, roi.hours)

  /* ---- faq ---- */
  const [openQ, setOpenQ] = React.useState(0 as number | null)

  /* ---- demo form ---- */
  const [email, setEmail] = React.useState("")
  const [crewSize, setCrewSize] = React.useState(CREW_SIZES[1])
  const [formState, setFormState] = React.useState("idle" as "idle" | "invalid" | "sending" | "sent" | "error")
  const alive = React.useRef(true)
  React.useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  const submitDemo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formState === "sending") return
    if (!isEmail(email)) {
      setFormState("invalid")
      emailRef.current?.focus()
      return
    }
    setFormState("sending")
    let ok = true
    try {
      const res = onBookDemo ? await onBookDemo({ email: email.trim(), crew: crewSize }) : await new Promise((r) => setTimeout(r, 900))
      if (res === false) ok = false
    } catch {
      ok = false
    }
    if (alive.current) setFormState(ok ? "sent" : "error")
  }

  const custCfg = customers === null ? null : { title: customers?.title ?? "Trusted by 1,200+ specialty and general contractors", names: customers?.names ?? DEFAULT_CUSTOMERS }
  const statList = stats === null ? null : stats ?? DEFAULT_STATS
  const platCfg = platform === null ? null : { title: platform?.title ?? "Everything payroll touches,\non one platform.", text: platform?.text ?? "Time from the field, rates from the job, costs into the ERP and money to the crew, without a spreadsheet in between." }
  const storyTitle = stories?.title ?? "Contractors who stopped\ndreading payday."
  const calcCfg = calculator === null ? null : { title: calculator?.title ?? "What is slow payroll\ncosting you?", text: calculator?.text ?? "Move the sliders to your crew. It's an estimate built from hours you'd stop spending and corrections you'd stop running." }
  const faqCfg = faq === null ? null : { title: faq?.title ?? "Questions, answered.", items: faq?.items ?? DEFAULT_FAQ }
  const ctaCfg = cta === null ? null : { title: cta?.title ?? "Run your next payroll\nin minutes.", text: cta?.text ?? "See it on your own jobs, rates and crews. A payroll specialist will walk you through it in 30 minutes.", button: cta?.button ?? "Book a demo" }
  const footCfg = footer === null ? null : {
    columns: footer?.columns ?? [
      { title: "Product", links: [{ label: "Payroll", href: "#showcase" }, { label: "Time tracking", href: "#platform" }, { label: "Job costing", href: "#showcase" }, { label: "Compliance", href: "#showcase" }] },
      { title: "Trades", links: [{ label: "Electrical" }, { label: "Mechanical" }, { label: "Concrete" }, { label: "General contractors" }] },
      { title: "Company", links: [{ label: "Customers", href: "#customers" }, { label: "Careers" }, { label: "Security" }, { label: "Contact", href: "#demo" }] },
      { title: "Resources", links: [{ label: "Savings calculator", href: "#calculator" }, { label: "Certified payroll guide" }, { label: "Help center" }, { label: "FAQ", href: "#faq" }] },
    ],
    note: footer?.note ?? "© 2026 " + brand + " Labs, Inc. Payroll services provided by licensed partners.",
  }

  const vars = {
    "--plb-page": pal.page,
    "--plb-ink": pal.ink,
    "--plb-muted": pal.muted,
    "--plb-rule": pal.rule,
    "--plb-guide": pal.guide,
    "--plb-soft": pal.soft,
    "--plb-accent": pal.accent,
    "--plb-accent-ink": pal.accentInk,
    "--plb-warn": pal.warn,
    "--plb-warn-ink": pal.warnInk,
    "--plb-good": pal.good,
    "--plb-p0": (pal.panels[0] ?? PALETTES.forest.panels[0])[0],
    "--plb-p1": (pal.panels[1] ?? pal.panels[0])[0],
    "--plb-p2": (pal.panels[2] ?? pal.panels[0])[0],
    "--plb-p3": (pal.panels[3] ?? pal.panels[0])[0],
    "--plb-autoplay": (typeof autoplay === "number" ? autoplay : 7000) + "ms",
    "--plb-h": height,
  } as React.CSSProperties

  const lines = (s: string) =>
    s.split("\n").map((l, i, a) => (
      <React.Fragment key={i}>
        {l}
        {i < a.length - 1 ? <br /> : null}
      </React.Fragment>
    ))

  const brandMark = (
    <span className="plb-brand">
      {logo ?? <PlumbMark />}
      <span>{brand}</span>
    </span>
  )

  return (
    <div ref={rootRef} className={"plb-root" + (className ? " " + className : "")} style={vars}>
      <style>{PLB_CSS}</style>

      {/* ---------------------------------- nav --------------------------------- */}
      {navCfg ? (
        <header className="plb-nav" data-solid={solid ? "" : undefined} data-menu={menu ? "" : undefined}>
          <div className="plb-frame plb-nav-in">
            <a href="#" className="plb-brand-link" aria-label={brand + " home"} onClick={(e) => { e.preventDefault(); rootRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" }) }}>
              {brandMark}
            </a>
            <nav className="plb-nav-links" aria-label="Main">
              {navCfg.links.map((l) => (
                <a key={l.label} href={l.href ?? "#"} onClick={(e) => go(l.href, e)}>
                  {l.label}
                </a>
              ))}
            </nav>
            <div className="plb-nav-end">
              <a className="plb-nav-login" href={navCfg.login.href ?? "#"} onClick={(e) => go(navCfg.login.href, e)}>
                {navCfg.login.label}
              </a>
              <a className="plb-btn plb-btn--ink plb-btn--sm" href={navCfg.cta.href ?? "#demo"} onClick={(e) => go(navCfg.cta.href, e)}>
                {navCfg.cta.label}
              </a>
              <button type="button" className="plb-burger" aria-expanded={menu} aria-label="Menu" onClick={() => setMenu((m) => !m)}>
                <span />
                <span />
              </button>
            </div>
          </div>
          {menu ? (
            <nav className="plb-sheet" aria-label="Main">
              {navCfg.links.map((l) => (
                <a key={l.label} href={l.href ?? "#"} onClick={(e) => go(l.href, e)}>
                  {l.label}
                </a>
              ))}
              <a href={navCfg.login.href ?? "#"} onClick={(e) => go(navCfg.login.href, e)}>
                {navCfg.login.label}
              </a>
            </nav>
          ) : null}
        </header>
      ) : null}

      {/* ---------------------------------- hero -------------------------------- */}
      {heroCfg ? (
        <section className="plb-band plb-hero">
          <div className="plb-frame">
            <div className="plb-col plb-split" data-reveal="">
              <h1 className="plb-h1">{lines(heroCfg.title)}</h1>
              <div className="plb-hero-side">
                <p className="plb-lede">{heroCfg.text}</p>
                <a className="plb-more" href={heroCfg.link.href ?? "#"} onClick={(e) => go(heroCfg.link.href, e)}>
                  <HookArrow />
                  {heroCfg.link.label}
                </a>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* --------------------------------- tour --------------------------------- */}
      <section
        ref={tourRef}
        className="plb-band plb-tour"
        data-sec="showcase"
        onPointerEnter={(e) => { if (e.pointerType === "mouse") setHold(true) }}
        onPointerLeave={() => setHold(false)}
        onFocus={() => setHold(true)}
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHold(false) }}
      >
        <div className="plb-frame">
          <div className="plb-row plb-guide">
            <div className="plb-col plb-box">
              <div className="plb-tabs" role="tablist" aria-label="Product tour">
                {tabs.map((t, i) => (
                  <button
                    key={t.label}
                    ref={(el) => { tabRefs.current[i] = el }}
                    type="button"
                    role="tab"
                    id={uid + "-tab" + i}
                    aria-selected={i === tab}
                    aria-controls={uid + "-panel"}
                    tabIndex={i === tab ? 0 : -1}
                    className="plb-tab"
                    onClick={() => pick(i)}
                    onKeyDown={(e) => {
                      const n = nextIndex(i, e.key, tabs.length)
                      if (n !== i) {
                        e.preventDefault()
                        pick(n, true)
                      }
                    }}
                  >
                    {t.label}
                    {i === tab && auto && autoplay !== false && !reduced ? (
                      <span
                        key={tab}
                        className="plb-tab-prog"
                        data-run={running ? "" : undefined}
                        onAnimationEnd={() => setTab((x) => (x + 1) % tabs.length)}
                      />
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="plb-row plb-guide">
            <div className="plb-col plb-box plb-gap" />
          </div>
          <div className="plb-row plb-guide">
            <div
              ref={panelRef}
              className="plb-col plb-panel"
              id={uid + "-panel"}
              role="tabpanel"
              aria-labelledby={uid + "-tab" + tab}
              style={{ "--plb-panel": panelBg, "--plb-pline": panelLine } as React.CSSProperties}
              onPointerMove={onPanelMove}
              onPointerLeave={onPanelLeave}
            >
              <PanelArt key={tab} uid={uid} layout={tab} seed={7} />
              <div className="plb-card" key={"c" + tab}>
                {cur.kind === "run" ? (
                  <PayrunMock run={payrun} active={tourSeen} reduced={reduced} onApprove={onApprove} />
                ) : cur.kind === "rates" ? (
                  <RatesMock rates={rates} active={tourSeen} reduced={reduced} />
                ) : cur.kind === "costs" ? (
                  <CostsMock jobs={costs} active={tourSeen} reduced={reduced} />
                ) : (
                  <ComplianceMock filings={filings} active={tourSeen} reduced={reduced} />
                )}
              </div>
            </div>
          </div>
          <div className="plb-row plb-guide">
            <div className="plb-col plb-box plb-caption" key={"t" + tab} aria-live="polite">
              <h2 className="plb-h3">{lines(cur.title)}</h2>
              <p>{cur.text}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------- customers ------------------------------ */}
      {custCfg ? (
        <section className="plb-band" data-sec="customers">
          <div className="plb-frame">
            <div className="plb-col plb-sec" data-reveal="">
              <p className="plb-eyebrow">{custCfg.title}</p>
              <ul className="plb-logos">
                {custCfg.names.map((c, i) => (
                  <li key={c.name}>
                    <CustomerLogo name={c.name} i={i} />
                    <span className="plb-logo-trade">{c.trade}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      {statList ? (
        <section ref={statsRef} className="plb-band">
          <div className="plb-frame">
            <div className="plb-col">
              <dl className="plb-numbers">
                {statList.map((s, i) => (
                  <StatCell key={s.label} s={s} run={statsSeen} reduced={reduced} i={i} />
                ))}
              </dl>
            </div>
          </div>
        </section>
      ) : null}

      {/* ------------------------------- platform ------------------------------- */}
      {platCfg ? (
        <section className="plb-band" data-sec="platform">
          <div className="plb-frame">
            <div className="plb-col plb-sec">
              <div className="plb-split plb-split--sec" data-reveal="">
                <h2 className="plb-h2">{lines(platCfg.title)}</h2>
                <p className="plb-lede">{platCfg.text}</p>
              </div>
              <div className="plb-bento">
                <article className="plb-tile plb-tile--wide" data-reveal="">
                  <div className="plb-tile-copy">
                    <span className="plb-tile-k">Time tracking</span>
                    <h3>Clock in from the field, cost-coded to the job.</h3>
                    <p>Crews pick the job and cost code, geofencing confirms they're on site, and the hours land in payroll without a paper timesheet. Try it: clock in, wait a few seconds, clock out.</p>
                  </div>
                  <div className="plb-tile-art plb-tile-art--phone" style={{ "--plb-panel": "var(--plb-p0)" } as React.CSSProperties}>
                    <ClockPhone reduced={reduced} />
                  </div>
                </article>
                <article className="plb-tile" data-reveal="">
                  <div className="plb-tile-copy">
                    <span className="plb-tile-k">Integrations</span>
                    <h3>Job costs straight into your ERP.</h3>
                  </div>
                  <SyncOrbit uid={uid} />
                </article>
                <article className="plb-tile" data-reveal="">
                  <div className="plb-tile-copy">
                    <span className="plb-tile-k">Multi-state taxes</span>
                    <h3>Crews cross state lines. Withholding follows.</h3>
                  </div>
                  <MultiState />
                </article>
                <article className="plb-tile plb-tile--wide plb-tile--rev" data-reveal="">
                  <div className="plb-tile-copy">
                    <span className="plb-tile-k">Pay options</span>
                    <h3>Pay every crew member the way they want to be paid.</h3>
                    <p>Direct deposit, paycards for the unbanked and paper checks printed and shipped to the job, all from the same payrun.</p>
                  </div>
                  <div className="plb-tile-art" style={{ "--plb-panel": "var(--plb-p3)" } as React.CSSProperties}>
                    <PayOptions />
                  </div>
                </article>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* -------------------------------- stories ------------------------------- */}
      {quotes.length && quote ? (
        <section className="plb-band" data-sec="stories">
          <div className="plb-frame">
            <div className="plb-col plb-sec">
              <div className="plb-split plb-split--sec" data-reveal="">
                <h2 className="plb-h2">{lines(storyTitle)}</h2>
                <div className="plb-story-nav">
                  <button type="button" className="plb-round" aria-label="Previous story" onClick={() => setQ((x) => (x - 1 + quotes.length) % quotes.length)}>
                    <svg className="plb-svg" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                  <span className="plb-story-count">
                    {String(q + 1).padStart(2, "0")} / {String(quotes.length).padStart(2, "0")}
                  </span>
                  <button type="button" className="plb-round" aria-label="Next story" onClick={() => setQ((x) => (x + 1) % quotes.length)}>
                    <svg className="plb-svg" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                </div>
              </div>
              <figure className="plb-story" key={q} aria-live="polite" data-reveal="">
                <div className="plb-story-art" style={{ "--plb-panel": "var(--plb-p" + (q % 4) + ")", "--plb-pline": "color-mix(in srgb, var(--plb-p" + (q % 4) + ") 55%, #ffffff)" } as React.CSSProperties}>
                  <PanelArt uid={uid + "s"} layout={q + 1} seed={19} />
                  {quote.metric ? (
                    <div className="plb-metric">
                      <span className="plb-metric-k">{quote.metric.label}</span>
                      <span className="plb-metric-v">
                        <s>{quote.metric.before}</s>
                        <svg className="plb-svg" width="22" height="14" viewBox="0 0 22 14" aria-hidden="true"><path d="M1 7h18M14 2l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        <b>{quote.metric.after}</b>
                      </span>
                    </div>
                  ) : null}
                </div>
                <div className="plb-story-copy">
                  <blockquote>“{quote.quote}”</blockquote>
                  <figcaption>
                    <Avatar name={quote.name} i={q} />
                    <span>
                      <b>{quote.name}</b>
                      {quote.role}, {quote.company}
                    </span>
                  </figcaption>
                </div>
              </figure>
            </div>
          </div>
        </section>
      ) : null}

      {/* ------------------------------ calculator ------------------------------ */}
      {calcCfg ? (
        <section className="plb-band" data-sec="calculator">
          <div className="plb-frame">
            <div className="plb-col plb-sec">
              <div className="plb-split plb-split--sec" data-reveal="">
                <h2 className="plb-h2">{lines(calcCfg.title)}</h2>
                <p className="plb-lede">{calcCfg.text}</p>
              </div>
              <div className="plb-calc" data-reveal="">
                <div className="plb-calc-in">
                  {[
                    { k: "Field employees", v: crew, set: setCrew, min: 10, max: 1500, step: 10, fmt: (n: number) => n.toLocaleString("en-US") },
                    { k: "Hours on payroll each week", v: hours, set: setHours, min: 2, max: 60, step: 1, fmt: (n: number) => n + " hrs" },
                    { k: "States you work in", v: states, set: setStates, min: 1, max: 20, step: 1, fmt: (n: number) => String(n) },
                    { k: "Loaded cost of an office hour", v: rate, set: setRate, min: 25, max: 120, step: 1, fmt: (n: number) => "$" + n },
                  ].map((f) => (
                    <label key={f.k} className="plb-range">
                      <span className="plb-range-k">
                        {f.k}
                        <b>{f.fmt(f.v)}</b>
                      </span>
                      <input
                        type="range"
                        min={f.min}
                        max={f.max}
                        step={f.step}
                        value={f.v}
                        onChange={(e) => f.set(Number(e.target.value))}
                        style={{ "--plb-fill": ((f.v - f.min) / (f.max - f.min)) * 100 + "%" } as React.CSSProperties}
                      />
                    </label>
                  ))}
                </div>
                <div className="plb-calc-out" style={{ "--plb-panel": "var(--plb-p0)", "--plb-pline": "color-mix(in srgb, var(--plb-p0) 60%, #ffffff)" } as React.CSSProperties}>
                  <PanelArt uid={uid + "c"} layout={2} seed={31} />
                  <div className="plb-calc-card">
                    <span className="plb-calc-k">Estimated savings per year</span>
                    <b className="plb-calc-v">{formatMoney(roiDollars, 0)}</b>
                    <div className="plb-calc-row">
                      <span>
                        <b>{Math.round(roiHours).toLocaleString("en-US")}</b> office hours back
                      </span>
                      <span>
                        <b>{roi.filings}</b> filings handled
                      </span>
                    </div>
                    <a className="plb-btn plb-btn--accent plb-btn--wide" href="#demo" onClick={(e) => go("#demo", e)}>
                      Get a real quote
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* ---------------------------------- faq --------------------------------- */}
      {faqCfg ? (
        <section className="plb-band" data-sec="faq">
          <div className="plb-frame">
            <div className="plb-col plb-sec plb-faq-wrap">
              <h2 className="plb-h2" data-reveal="">{faqCfg.title}</h2>
              <ul className="plb-faq" data-reveal="">
                {faqCfg.items.map((f, i) => {
                  const open = openQ === i
                  return (
                    <li key={f.q} data-open={open ? "" : undefined}>
                      <button type="button" aria-expanded={open} aria-controls={uid + "-faq" + i} onClick={() => setOpenQ(open ? null : i)}>
                        <span>{f.q}</span>
                        <span className="plb-plus" aria-hidden="true" />
                      </button>
                      <div className="plb-faq-a" id={uid + "-faq" + i} role="region" hidden={!open}>
                        <p>{f.a}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      {/* ---------------------------------- cta --------------------------------- */}
      {ctaCfg ? (
        <section className="plb-band" data-sec="demo">
          <div className="plb-frame">
            <div className="plb-col plb-cta" style={{ "--plb-panel": "var(--plb-p0)", "--plb-pline": (pal.panels[0] ?? PALETTES.forest.panels[0])[1] } as React.CSSProperties}>
              <PanelArt uid={uid + "d"} layout={3} seed={53} />
              <div className="plb-cta-in" data-reveal="">
                <h2 className="plb-h2">{lines(ctaCfg.title)}</h2>
                <p>{ctaCfg.text}</p>
              </div>
              <form className="plb-form" onSubmit={submitDemo} noValidate data-reveal="">
                {formState === "sent" ? (
                  <div className="plb-sent" role="status">
                    <span className="plb-sent-ico">
                      <Check size={18} />
                    </span>
                    <b>You're on the calendar.</b>
                    <span>We'll write to {email.trim()} within one business day to find a time.</span>
                    <button type="button" className="plb-banner-act" onClick={() => { setFormState("idle"); setEmail("") }}>
                      Book another
                    </button>
                  </div>
                ) : (
                  <>
                    <label className="plb-field">
                      <span>Work email</span>
                      <input
                        ref={emailRef}
                        type="email"
                        autoComplete="email"
                        placeholder="you@company.com"
                        value={email}
                        aria-invalid={formState === "invalid"}
                        aria-describedby={uid + "-err"}
                        onChange={(e) => {
                          setEmail(e.target.value)
                          if (formState === "invalid" || formState === "error") setFormState("idle")
                        }}
                      />
                    </label>
                    <div className="plb-field">
                      <span id={uid + "-crew"}>Crew size</span>
                      <div className="plb-crew" role="radiogroup" aria-labelledby={uid + "-crew"}>
                        {CREW_SIZES.map((c) => (
                          <button key={c} type="button" role="radio" aria-checked={c === crewSize} onClick={() => setCrewSize(c)}>
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button type="submit" className="plb-btn plb-btn--accent plb-btn--wide" disabled={formState === "sending"}>
                      {formState === "sending" ? <Spinner /> : null}
                      {formState === "sending" ? "Booking…" : ctaCfg.button}
                    </button>
                    <p className="plb-err" id={uid + "-err"} aria-live="polite">
                      {formState === "invalid" ? "Enter a work email so we can reach you." : formState === "error" ? "That didn't go through. Try again in a moment." : ""}
                    </p>
                  </>
                )}
              </form>
            </div>
          </div>
        </section>
      ) : null}

      {/* -------------------------------- footer -------------------------------- */}
      {footCfg ? (
        <footer className="plb-band plb-foot">
          <div className="plb-frame">
            <div className="plb-col plb-foot-in">
              <div className="plb-foot-brand">
                {brandMark}
                <p>Payroll built for the people who build.</p>
              </div>
              {footCfg.columns.map((c) => (
                <div key={c.title} className="plb-foot-col">
                  <span>{c.title}</span>
                  <ul>
                    {c.links.map((l) => (
                      <li key={l.label}>
                        <a href={l.href ?? "#"} onClick={(e) => (l.href ? go(l.href, e) : e.preventDefault())}>
                          {l.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="plb-col plb-foot-note">
              <span>{footCfg.note}</span>
              <span>Privacy · Terms · Licenses</span>
            </div>
          </div>
          <div className="plb-hatch" aria-hidden="true">
            <div className="plb-frame" />
          </div>
        </footer>
      ) : null}
    </div>
  )
}

function StatCell({ s, run, reduced, i }: { s: PlbStat; run: boolean; reduced: boolean; i: number }) {
  const v = useTween(s.value, run, reduced, 0)
  return (
    <div className="plb-number" style={{ transitionDelay: i * 80 + "ms" }}>
      <dt>{s.label}</dt>
      <dd>{formatStat(s, v)}</dd>
    </div>
  )
}

/* ----------------------------------- css ----------------------------------- */

const PLB_CSS = `
.plb-root{position:relative;min-height:var(--plb-h);background:var(--plb-page);color:var(--plb-ink);overflow-x:clip;font-family:"Inter Tight","Inter","Geist","Helvetica Neue",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;line-height:1.45;letter-spacing:-.005em;font-feature-settings:"ss01","cv11"}
.plb-root :where(button){font:inherit;color:inherit;background:none;border:0;padding:0;margin:0;cursor:pointer;text-align:inherit}
.plb-root :where(a){color:inherit;text-decoration:none}
.plb-root :where(p,h1,h2,h3,ul,ol,dl,dd,figure,blockquote){margin:0;padding:0}
.plb-root :where(ul,ol){list-style:none}
.plb-root :where(input){font:inherit;color:inherit}
.plb-root :where(button,a,input,[tabindex]):focus-visible{outline:2px solid var(--plb-accent);outline-offset:2px;border-radius:4px}
.plb-svg{display:block;max-width:none;flex:none}

/* ---- the drafting grid ---- */
.plb-frame{position:relative;width:calc(100% - 2 * clamp(0px, 5vw, 206px));max-width:1588px;margin:0 auto;border-left:1px solid var(--plb-rule);border-right:1px solid var(--plb-rule);box-sizing:border-box;display:flow-root}
.plb-col{position:relative;width:calc(100% - 2 * clamp(16px, 8.5%, 135px));max-width:1318px;margin:0 auto;box-sizing:border-box}
.plb-band{position:relative}
.plb-row{position:relative}
.plb-guide::before{content:"";position:absolute;left:-100vw;right:-100vw;top:0;border-top:1px dashed var(--plb-guide);pointer-events:none}
.plb-guide:last-child::after{content:"";position:absolute;left:-100vw;right:-100vw;bottom:0;border-bottom:1px dashed var(--plb-guide);pointer-events:none}
.plb-box{background:var(--plb-page);border:1px solid var(--plb-rule);border-bottom:0;z-index:1}
.plb-sec{padding:clamp(72px,9vw,128px) 0}
.plb-band:not(.plb-hero):not(.plb-tour) > .plb-frame::before{content:"";position:absolute;left:-100vw;right:-100vw;top:0;border-top:1px dashed var(--plb-guide);pointer-events:none}

/* ---- buttons ---- */
.plb-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:46px;padding:0 20px;border-radius:3px;font-size:16px;font-weight:500;letter-spacing:-.01em;white-space:nowrap;transition:transform .2s cubic-bezier(.2,.8,.2,1),background-color .2s,box-shadow .2s,color .2s,opacity .2s}
.plb-btn:active:not([disabled]){transform:scale(.97)}
.plb-btn[disabled]{cursor:default}
.plb-btn--sm{height:36px;padding:0 14px;font-size:14px}
.plb-btn--wide{width:100%}
.plb-btn--accent{background:var(--plb-accent);color:var(--plb-accent-ink)}
.plb-btn--accent:hover:not([disabled]){background:color-mix(in srgb,var(--plb-accent) 86%,#000);box-shadow:0 8px 22px -10px var(--plb-accent)}
.plb-btn--ink{background:var(--plb-ink);color:var(--plb-page)}
.plb-btn--ink:hover{background:color-mix(in srgb,var(--plb-ink) 84%,var(--plb-accent))}
.plb-btn--ghost{border:1px solid var(--plb-rule);background:var(--plb-page)}
.plb-btn--ghost:hover:not([disabled]){border-color:var(--plb-ink)}
.plb-spin{width:14px;height:14px;border-radius:50%;border:2px solid currentColor;border-right-color:transparent;animation:plb-spin .7s linear infinite;flex:none}
@keyframes plb-spin{to{transform:rotate(360deg)}}

/* ---- nav ---- */
.plb-nav{position:sticky;top:0;z-index:50;background:color-mix(in srgb,var(--plb-page) 0%,transparent);transition:background-color .3s,box-shadow .3s}
.plb-nav[data-solid],.plb-nav[data-menu]{background:color-mix(in srgb,var(--plb-page) 88%,transparent);-webkit-backdrop-filter:blur(12px) saturate(1.3);backdrop-filter:blur(12px) saturate(1.3);box-shadow:0 1px 0 var(--plb-rule)}
.plb-nav-in{display:flex;align-items:center;justify-content:space-between;gap:24px;height:72px;padding:0 clamp(16px,2.4vw,32px)}
.plb-brand{display:inline-flex;align-items:center;gap:8px;font-size:21px;font-weight:600;letter-spacing:-.04em;line-height:1}
.plb-brand-link{display:inline-flex;border-radius:4px}
.plb-nav-links{display:flex;gap:clamp(18px,2.6vw,36px);font-size:15px;color:var(--plb-muted)}
.plb-nav-links a,.plb-nav-login{position:relative;transition:color .2s}
.plb-nav-links a:hover,.plb-nav-login:hover{color:var(--plb-ink)}
.plb-nav-links a::after{content:"";position:absolute;left:0;right:0;bottom:-6px;height:1px;background:currentColor;transform:scaleX(0);transform-origin:left;transition:transform .3s cubic-bezier(.2,.8,.2,1)}
.plb-nav-links a:hover::after{transform:scaleX(1)}
.plb-nav-end{display:flex;align-items:center;gap:18px}
.plb-nav-login{font-size:15px;color:var(--plb-muted)}
.plb-burger{display:none;width:40px;height:40px;border-radius:4px;align-items:center;justify-content:center;flex-direction:column;gap:6px}
.plb-burger span{display:block;width:18px;height:1.5px;background:currentColor;transition:transform .25s}
.plb-burger[aria-expanded="true"] span:first-child{transform:translateY(3.75px) rotate(45deg)}
.plb-burger[aria-expanded="true"] span:last-child{transform:translateY(-3.75px) rotate(-45deg)}
.plb-sheet{display:none}

/* ---- hero ---- */
.plb-hero .plb-split{padding:clamp(72px,11vw,150px) 0 clamp(72px,9vw,112px)}
.plb-split{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:clamp(32px,5vw,110px);align-items:start}
.plb-split--sec{margin-bottom:clamp(40px,5vw,64px);align-items:end}
.plb-h1{font-size:clamp(40px,4.3vw,78px);line-height:1.02;font-weight:500;letter-spacing:-.045em}
.plb-h2{font-size:clamp(30px,3.1vw,52px);line-height:1.06;font-weight:500;letter-spacing:-.04em}
.plb-h3{font-size:clamp(22px,2vw,28px);line-height:1.2;font-weight:500;letter-spacing:-.025em}
.plb-lede{font-size:clamp(17px,1.35vw,21px);line-height:1.6;color:var(--plb-muted);max-width:34em}
.plb-hero-side{display:flex;flex-direction:column;gap:30px;padding-top:6px}
.plb-more{display:inline-flex;align-items:center;gap:10px;align-self:flex-start;font-size:clamp(16px,1.2vw,19px);font-weight:500;border-radius:3px}
.plb-hook{transition:transform .3s cubic-bezier(.2,.8,.2,1)}
.plb-more:hover .plb-hook{transform:translateX(4px)}
.plb-eyebrow{font-size:15px;color:var(--plb-muted);margin-bottom:28px}

/* ---- reveal ---- */
.plb-root [data-reveal]{opacity:0;transform:translateY(18px);transition:opacity .8s cubic-bezier(.2,.8,.2,1),transform .8s cubic-bezier(.2,.8,.2,1)}
.plb-root [data-reveal][data-in]{opacity:1;transform:none}

/* ---- tour ---- */
.plb-tabs{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);padding:8px;gap:0}
.plb-tab{position:relative;display:flex;align-items:center;justify-content:center;height:66px;border-radius:2px;font-size:clamp(15px,1.3vw,20px);font-weight:500;letter-spacing:-.015em;color:var(--plb-ink);transition:background-color .25s,color .25s;overflow:hidden;white-space:nowrap;padding:0 14px}
.plb-tab:hover{background:color-mix(in srgb,var(--plb-soft) 60%,transparent)}
.plb-tab[aria-selected="true"]{background:var(--plb-soft)}
.plb-tab-prog{position:absolute;left:0;bottom:0;height:2px;width:100%;background:var(--plb-ink);transform:scaleX(0);transform-origin:left;animation:plb-prog var(--plb-autoplay) linear forwards;animation-play-state:paused;opacity:.75}
.plb-tab-prog[data-run]{animation-play-state:running}
@keyframes plb-prog{to{transform:scaleX(1)}}
.plb-gap{height:52px;border-top-color:var(--plb-rule)}
.plb-panel{height:clamp(480px,50vw,660px);background:var(--plb-panel);overflow:hidden;z-index:1;transition:background-color .6s cubic-bezier(.2,.8,.2,1);isolation:isolate}
.plb-art{position:absolute;inset:-14px;width:calc(100% + 28px);height:calc(100% + 28px);max-width:none;animation:plb-fade .7s cubic-bezier(.2,.8,.2,1)}
.plb-art-drift{transform:translate(var(--plb-dx,0px),var(--plb-dy,0px));transition:transform .5s cubic-bezier(.2,.8,.2,1)}
@keyframes plb-fade{from{opacity:0}}
.plb-card{position:absolute;left:12.5%;right:12.5%;top:13.6%;bottom:0;background:var(--plb-page);border-radius:7px 7px 0 0;box-shadow:0 30px 60px -30px rgba(0,0,0,.45),0 0 0 1px rgba(0,0,0,.04);overflow:hidden;animation:plb-rise .7s cubic-bezier(.2,.8,.2,1)}
@keyframes plb-rise{from{opacity:0;transform:translateY(26px)}}
.plb-caption{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid var(--plb-rule);padding:0}
.plb-caption > *{padding:clamp(28px,3.2vw,48px) clamp(20px,3.2vw,43px);animation:plb-up .6s cubic-bezier(.2,.8,.2,1) both}
.plb-caption p{border-left:1px solid var(--plb-rule);font-size:clamp(16px,1.3vw,20px);line-height:1.6;color:var(--plb-muted);animation-delay:.06s}
@keyframes plb-up{from{opacity:0;transform:translateY(10px)}}

/* ---- mocks ---- */
.plb-mock{padding:clamp(18px,2.6vw,32px);font-size:15px;color:var(--plb-ink)}
.plb-run-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:24px}
.plb-mock-title{font-size:clamp(18px,1.6vw,22px);font-weight:500;letter-spacing:-.02em;line-height:1.2}
.plb-mock-sub{margin-top:6px;font-size:13.5px;color:var(--plb-muted)}
.plb-meta{display:flex;flex-wrap:wrap;gap:6px 26px;margin-top:14px}
.plb-meta dt{font-size:12.5px;color:var(--plb-muted)}
.plb-meta dd{font-size:13px;margin-top:2px}
.plb-approve{flex:none;height:46px;border-radius:3px;font-size:15px;min-width:158px}
.plb-approve[data-state="blocked"]{animation:plb-shake .4s}
.plb-approve[data-state="done"]{background:var(--plb-good);opacity:1}
@keyframes plb-shake{20%,60%{transform:translateX(-4px)}40%,80%{transform:translateX(4px)}}
.plb-alerts{display:flex;flex-direction:column;gap:11px}
.plb-alerts[data-pulse] .plb-alert:not([data-done]){animation:plb-flash .9s}
@keyframes plb-flash{30%{box-shadow:0 0 0 3px color-mix(in srgb,var(--plb-warn-ink) 40%,transparent)}}
.plb-alert{display:flex;align-items:center;gap:14px;min-height:42px;padding:0 16px 0 18px;border-radius:4px;background:var(--plb-warn);color:var(--plb-warn-ink);font-size:14px;transition:background-color .35s,color .35s}
.plb-alert b{font-weight:600}
.plb-alert-txt{flex:1;min-width:0;padding:10px 0;color:color-mix(in srgb,var(--plb-warn-ink) 85%,transparent)}
.plb-alert-ico{display:inline-flex;color:color-mix(in srgb,var(--plb-warn-ink) 92%,#000)}
.plb-alert-act{font-weight:500;font-size:14px;padding:6px 8px;margin-right:-8px;border-radius:3px;transition:background-color .2s}
.plb-alert-act:hover{background:color-mix(in srgb,var(--plb-warn-ink) 10%,transparent)}
.plb-alert[data-done]{background:color-mix(in srgb,var(--plb-good) 10%,var(--plb-page));color:var(--plb-good)}
.plb-alert[data-done] .plb-alert-txt{color:color-mix(in srgb,var(--plb-good) 80%,var(--plb-ink))}
.plb-alert[data-done] .plb-alert-ico{width:18px;height:18px;border-radius:50%;background:var(--plb-good);color:#fff;justify-content:center;align-items:center}
.plb-alert[data-done] .plb-alert-act:hover{background:color-mix(in srgb,var(--plb-good) 12%,transparent)}
.plb-banner{display:flex;align-items:center;gap:12px;padding:12px 16px;margin:-6px 0 14px;border-radius:4px;font-size:14px;animation:plb-up .4s cubic-bezier(.2,.8,.2,1)}
.plb-banner span{flex:1}
.plb-banner--good{background:var(--plb-good);color:#fff}
.plb-banner--bad{background:#fbe3e1;color:#8a1c12}
.plb-banner-act{font-weight:500;text-decoration:underline;text-underline-offset:3px}
.plb-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin:34px 0 46px}
.plb-stats--3{grid-template-columns:repeat(3,minmax(0,1fr));margin:20px 0 26px}
.plb-stat{display:flex;flex-direction:column;gap:12px;padding:18px 16px 15px;background:color-mix(in srgb,var(--plb-soft) 65%,var(--plb-page));border-radius:4px;min-width:0}
.plb-stat span{font-size:13px;color:var(--plb-muted)}
.plb-stat b{font-size:clamp(17px,1.42vw,24px);font-weight:500;letter-spacing:-.01em;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.plb-stat[data-tone="bad"] b{color:#b4341f}
.plb-stat[data-tone="good"] b{color:var(--plb-good)}
.plb-lines{display:grid;grid-template-columns:1fr 1fr;gap:0 clamp(24px,5vw,54px)}
.plb-line{display:flex;justify-content:space-between;gap:16px;padding:15px 0;border-bottom:1px solid var(--plb-rule);font-size:15px}
.plb-line dd{font-variant-numeric:tabular-nums}
.plb-chip{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 10px;border-radius:999px;font-size:12.5px;font-weight:500;white-space:nowrap;background:var(--plb-soft);color:var(--plb-muted)}
.plb-chip--good,.plb-chip[data-st="filed"]{background:color-mix(in srgb,var(--plb-good) 12%,var(--plb-page));color:var(--plb-good)}
.plb-chip[data-st="filing"]{background:color-mix(in srgb,var(--plb-accent) 12%,var(--plb-page));color:var(--plb-accent)}
.plb-seg{display:flex;gap:4px;padding:4px;border-radius:5px;background:var(--plb-soft);overflow-x:auto;scrollbar-width:none}
.plb-seg::-webkit-scrollbar{display:none}
.plb-seg-btn{flex:1 0 auto;height:34px;padding:0 14px;border-radius:3px;font-size:13.5px;color:var(--plb-muted);white-space:nowrap;transition:background-color .2s,color .2s,box-shadow .2s}
.plb-seg-btn:hover{color:var(--plb-ink)}
.plb-seg-btn[aria-checked="true"]{background:var(--plb-page);color:var(--plb-ink);box-shadow:0 1px 2px rgba(0,0,0,.08),0 0 0 1px var(--plb-rule)}
.plb-seg--sm .plb-seg-btn{height:30px;font-size:13px;padding:0 11px}
.plb-table{margin-top:18px;font-size:14px}
.plb-tr{display:grid;grid-template-columns:minmax(0,2.1fr) repeat(4,minmax(0,1fr));gap:12px;align-items:center;width:100%;padding:12px 10px;border-bottom:1px solid var(--plb-rule);font-variant-numeric:tabular-nums;transition:background-color .2s}
.plb-tr > span:not(:first-child){text-align:right}
.plb-tr > span:first-child{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.plb-th{font-size:12.5px;color:var(--plb-muted);padding-top:4px}
.plb-tr[aria-pressed]:hover{background:color-mix(in srgb,var(--plb-soft) 70%,transparent)}
.plb-tr[aria-pressed="true"]{background:var(--plb-soft);box-shadow:inset 2px 0 0 var(--plb-panel)}
.plb-fringe{margin-top:20px}
.plb-fringe-k{font-size:13px;color:var(--plb-muted)}
.plb-fringe-bar{display:flex;gap:3px;height:10px;margin:10px 0 12px}
.plb-fringe-bar span{border-radius:2px;transition:flex-grow .6s cubic-bezier(.2,.8,.2,1)}
.plb-fringe-bar [data-i="0"],.plb-fringe-legend [data-i="0"] i{background:var(--plb-panel)}
.plb-fringe-bar [data-i="1"],.plb-fringe-legend [data-i="1"] i{background:color-mix(in srgb,var(--plb-panel) 65%,#fff)}
.plb-fringe-bar [data-i="2"],.plb-fringe-legend [data-i="2"] i{background:color-mix(in srgb,var(--plb-panel) 38%,#fff)}
.plb-fringe-bar [data-i="3"],.plb-fringe-legend [data-i="3"] i{background:color-mix(in srgb,var(--plb-panel) 20%,#fff)}
.plb-fringe-legend{display:flex;flex-wrap:wrap;gap:6px 20px;font-size:13px;color:var(--plb-muted)}
.plb-fringe-legend li{display:inline-flex;align-items:center;gap:7px}
.plb-fringe-legend i{width:8px;height:8px;border-radius:2px}
.plb-fringe-legend b{color:var(--plb-ink);font-weight:500;font-variant-numeric:tabular-nums}
.plb-switch{display:inline-flex;align-items:center;gap:10px;font-size:14px;cursor:pointer;flex:none;user-select:none}
.plb-switch input{position:absolute;opacity:0;width:1px;height:1px}
.plb-switch-track{position:relative;width:38px;height:22px;border-radius:999px;background:var(--plb-rule);transition:background-color .25s}
.plb-switch-track::after{content:"";position:absolute;left:3px;top:3px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .25s cubic-bezier(.2,.8,.2,1)}
.plb-switch input:checked + .plb-switch-track{background:var(--plb-panel)}
.plb-switch input:checked + .plb-switch-track::after{transform:translateX(16px)}
.plb-switch input:focus-visible + .plb-switch-track{outline:2px solid var(--plb-accent);outline-offset:2px}
.plb-bars{display:flex;flex-direction:column;gap:16px}
.plb-bar{position:relative;outline:none;border-radius:3px}
.plb-bar:focus-visible{outline:2px solid var(--plb-accent);outline-offset:4px}
.plb-bar-k{display:flex;justify-content:space-between;gap:12px;font-size:14px;margin-bottom:8px}
.plb-bar-k span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.plb-bar-k em{font-style:normal;color:var(--plb-muted);margin-right:6px;font-variant-numeric:tabular-nums}
.plb-bar-k b{font-weight:500;font-variant-numeric:tabular-nums}
.plb-bar[data-over] .plb-bar-k b{color:#b4341f}
.plb-bar-track{position:relative;display:flex;height:14px;background:var(--plb-soft);border-radius:2px}
.plb-bar-track span{height:100%;transition:width .7s cubic-bezier(.2,.8,.2,1)}
.plb-bar-track [data-k="wages"],.plb-tip [data-k="wages"] i{background:var(--plb-panel)}
.plb-bar-track [data-k="taxes"],.plb-tip [data-k="taxes"] i{background:color-mix(in srgb,var(--plb-panel) 68%,#fff)}
.plb-bar-track [data-k="fringe"],.plb-tip [data-k="fringe"] i{background:color-mix(in srgb,var(--plb-panel) 44%,#fff)}
.plb-bar-track [data-k="comp"],.plb-tip [data-k="comp"] i{background:color-mix(in srgb,var(--plb-panel) 26%,#fff)}
.plb-bar-track span:first-child{border-radius:2px 0 0 2px}
.plb-bar-budget{position:absolute;top:-4px;bottom:-4px;width:2px;margin-left:-1px;background:var(--plb-ink);border-radius:1px;transition:left .7s cubic-bezier(.2,.8,.2,1)}
.plb-tip{position:absolute;right:0;bottom:calc(100% + 6px);z-index:3;display:flex;flex-wrap:wrap;gap:4px 14px;max-width:420px;padding:10px 12px;border-radius:4px;background:var(--plb-ink);color:var(--plb-page);font-size:12.5px;box-shadow:0 10px 24px -10px rgba(0,0,0,.5);animation:plb-up .2s ease-out}
.plb-tip span{display:inline-flex;align-items:center;gap:6px}
.plb-tip i{width:8px;height:8px;border-radius:2px}
.plb-tip b{font-weight:500;font-variant-numeric:tabular-nums}
.plb-progress{height:4px;border-radius:2px;background:var(--plb-soft);overflow:hidden;margin:-8px 0 18px}
.plb-progress span{display:block;height:100%;background:var(--plb-good);transition:width .5s cubic-bezier(.2,.8,.2,1)}
.plb-filings{display:flex;flex-direction:column}
.plb-filing{display:flex;align-items:center;gap:14px;padding:13px 4px;border-bottom:1px solid var(--plb-rule);transition:background-color .3s}
.plb-filing[data-st="filing"]{background:color-mix(in srgb,var(--plb-accent) 5%,transparent)}
.plb-filing-ico{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:var(--plb-soft);color:var(--plb-muted);flex:none}
.plb-filing[data-st="filed"] .plb-filing-ico{background:var(--plb-good);color:#fff;animation:plb-pop .35s cubic-bezier(.2,1.6,.4,1)}
.plb-filing[data-st="filing"] .plb-filing-ico{color:var(--plb-accent)}
@keyframes plb-pop{from{transform:scale(.4)}}
.plb-doc{width:10px;height:12px;border:1.5px solid currentColor;border-radius:1.5px}
.plb-filing-k{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.plb-filing-k b{font-weight:500;font-size:14.5px}
.plb-filing-k span{font-size:13px;color:var(--plb-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

/* ---- customers & numbers ---- */
.plb-logos{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));border:1px solid var(--plb-rule);border-right:0}
.plb-logos li{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:140px;padding:16px 10px;border-right:1px solid var(--plb-rule);text-align:center;transition:background-color .3s}
.plb-logos li:hover{background:var(--plb-soft)}
.plb-logo{display:inline-flex;flex-direction:column;align-items:center;gap:10px;white-space:nowrap;font-size:clamp(14px,1.2vw,17px);font-weight:600;letter-spacing:-.03em;color:color-mix(in srgb,var(--plb-ink) 72%,var(--plb-page));transition:color .3s}
.plb-logo svg{color:color-mix(in srgb,var(--plb-muted) 70%,var(--plb-page));transition:color .3s,transform .4s cubic-bezier(.2,.8,.2,1)}
.plb-logos li:hover .plb-logo{color:var(--plb-ink)}
.plb-logos li:hover .plb-logo svg{color:var(--plb-p0);transform:rotate(-8deg) scale(1.08)}
.plb-logo[data-i="1"]{font-weight:700;letter-spacing:.02em;text-transform:uppercase;font-size:clamp(11px,.95vw,13.5px)}
.plb-logo[data-i="2"]{font-family:ui-serif,Georgia,"Times New Roman",serif;font-weight:500;letter-spacing:-.01em;font-style:italic}
.plb-logo[data-i="4"]{font-weight:800;letter-spacing:-.05em}
.plb-logo-trade{font-size:12px;color:var(--plb-muted);opacity:0;transform:translateY(-4px);transition:opacity .3s,transform .3s}
.plb-logos li:hover .plb-logo-trade{opacity:1;transform:none}
.plb-numbers{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-left:1px solid var(--plb-rule);border-right:1px solid var(--plb-rule)}
.plb-number{display:flex;flex-direction:column-reverse;justify-content:flex-end;gap:14px;padding:clamp(28px,3.4vw,48px) clamp(18px,2.4vw,32px);border-right:1px solid var(--plb-rule)}
.plb-number:last-child{border-right:0}
.plb-number dd{font-size:clamp(36px,4vw,60px);font-weight:500;letter-spacing:-.045em;line-height:1;font-variant-numeric:tabular-nums}
.plb-number dt{font-size:15px;color:var(--plb-muted);max-width:16em}

/* ---- bento ---- */
.plb-bento{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border:1px solid var(--plb-rule);border-right:0;border-bottom:0}
.plb-tile{display:flex;flex-direction:column;gap:24px;padding:clamp(22px,2.8vw,40px);border-right:1px solid var(--plb-rule);border-bottom:1px solid var(--plb-rule);min-width:0}
.plb-tile--wide{grid-column:span 2;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);align-items:stretch}
.plb-tile--rev .plb-tile-copy{order:2}
.plb-tile-copy{display:flex;flex-direction:column;gap:12px}
.plb-tile-k{font-size:13px;color:var(--plb-muted);display:inline-flex;align-items:center;gap:8px}
.plb-tile-k::before{content:"";width:7px;height:7px;background:var(--plb-p0);border-radius:1px}
.plb-tile h3{font-size:clamp(20px,1.7vw,25px);line-height:1.2;font-weight:500;letter-spacing:-.025em}
.plb-tile p{font-size:15.5px;line-height:1.6;color:var(--plb-muted)}
.plb-tile-art{position:relative;display:flex;align-items:center;justify-content:center;min-height:360px;background:var(--plb-panel);border-radius:3px;overflow:hidden;padding:24px}
.plb-tile-art::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(-28.8deg,transparent 0 46px,color-mix(in srgb,var(--plb-panel) 55%,#fff) 46px 48.5px);opacity:.55}
.plb-phone{position:relative;width:236px;padding:16px 16px 14px;border-radius:30px;background:var(--plb-page);box-shadow:0 0 0 7px var(--plb-ink),0 30px 60px -20px rgba(0,0,0,.5);font-size:13px}
.plb-phone-notch{width:64px;height:6px;border-radius:999px;background:var(--plb-ink);margin:0 auto 14px;opacity:.9}
.plb-phone-top{display:flex;justify-content:space-between;align-items:center;font-weight:500}
.plb-geo{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;color:var(--plb-good);font-weight:500}
.plb-geo i{width:7px;height:7px;border-radius:50%;background:var(--plb-good);box-shadow:0 0 0 3px color-mix(in srgb,var(--plb-good) 22%,transparent)}
.plb-phone-job{font-size:12px;color:var(--plb-muted);margin-top:2px}
.plb-phone-clock{margin:16px 0 12px;font-size:36px;font-weight:500;letter-spacing:-.03em;text-align:center;font-variant-numeric:tabular-nums}
.plb-phone-codes{display:flex;flex-wrap:wrap;gap:5px;justify-content:center}
.plb-phone-codes button{height:26px;padding:0 9px;border-radius:999px;border:1px solid var(--plb-rule);font-size:11.5px;color:var(--plb-muted);transition:background-color .2s,color .2s,border-color .2s}
.plb-phone-codes button[aria-checked="true"]{background:var(--plb-ink);border-color:var(--plb-ink);color:var(--plb-page)}
.plb-phone-codes button[disabled]{cursor:default}
.plb-phone-codes button[disabled]:not([aria-checked="true"]){opacity:.45}
.plb-phone-btn{display:flex;align-items:center;justify-content:center;width:100%;height:44px;margin-top:14px;border-radius:12px;background:var(--plb-good);color:#fff;font-weight:600;font-size:14.5px;transition:background-color .25s,transform .15s}
.plb-phone-btn:active{transform:scale(.97)}
.plb-phone-btn[data-on]{background:#b4341f}
.plb-phone-log{margin-top:12px;display:flex;flex-direction:column}
.plb-phone-log li{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 2px;border-top:1px solid var(--plb-rule);font-size:11.5px;color:var(--plb-muted);animation:plb-up .35s ease-out}
.plb-phone-log span{display:flex;flex-direction:column;min-width:0}
.plb-phone-log b{color:var(--plb-ink);font-weight:500;font-size:12px}
.plb-phone-log em{font-style:normal;font-weight:500;color:var(--plb-ink);font-variant-numeric:tabular-nums}
.plb-sync{position:relative;flex:1;display:flex;flex-direction:column;justify-content:flex-end;gap:14px}
.plb-sync-map{position:relative;width:100%;max-width:340px;margin:0 auto;aspect-ratio:300/244}
.plb-sync-svg{width:100%;height:100%;max-width:none}
.plb-sync-link{fill:none;stroke:var(--plb-guide);stroke-width:1.5;stroke-dasharray:4 5;transition:stroke .25s}
.plb-sync-link[data-hot]{stroke:var(--plb-p0)}
.plb-sync[data-state="syncing"] .plb-sync-link{stroke:var(--plb-p0);animation:plb-flow .6s linear infinite}
@keyframes plb-flow{to{stroke-dashoffset:-18}}
.plb-sync-node{position:absolute;transform:translate(-50%,-50%);padding:5px 9px;border-radius:999px;background:var(--plb-page);border:1px solid var(--plb-rule);font-size:11.5px;white-space:nowrap;box-shadow:0 2px 6px -3px rgba(0,0,0,.2);transition:border-color .25s,transform .25s;cursor:default}
.plb-sync-node:hover{border-color:var(--plb-p0);transform:translate(-50%,-50%) scale(1.05)}
.plb-sync[data-state="done"] .plb-sync-node{border-color:color-mix(in srgb,var(--plb-good) 45%,var(--plb-rule))}
.plb-sync-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:13px;color:var(--plb-muted)}
.plb-ms{display:flex;flex-direction:column;gap:14px;flex:1;justify-content:flex-end}
.plb-ms-k{font-size:14px;color:var(--plb-muted)}
.plb-ms-k b{color:var(--plb-ink);font-weight:500}
.plb-ms-bar{display:flex;gap:3px;height:38px}
.plb-ms-bar span{display:flex;align-items:center;padding:0 10px;border-radius:3px;color:#fff;font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;min-width:0;transition:flex-grow .6s cubic-bezier(.2,.8,.2,1)}
.plb-ms [data-i="0"]{background:var(--plb-p0)}
.plb-ms [data-i="1"]{background:var(--plb-p1)}
.plb-ms [data-i="2"]{background:var(--plb-p2)}
.plb-ms-list li{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--plb-rule);font-size:14px}
.plb-ms-list li span{flex:1;color:var(--plb-muted)}
.plb-ms-list i{width:8px;height:8px;border-radius:2px}
.plb-ms-list b{font-weight:500;font-variant-numeric:tabular-nums}
.plb-pay{position:relative;width:min(100%,360px);display:flex;flex-direction:column;gap:14px}
.plb-pay .plb-seg{background:color-mix(in srgb,var(--plb-page) 18%,transparent)}
.plb-pay .plb-seg-btn{padding:0 8px;color:color-mix(in srgb,#fff 82%,transparent)}
.plb-pay .plb-seg-btn[aria-checked="true"]{color:var(--plb-ink)}
.plb-stub{display:flex;flex-direction:column;gap:6px;padding:20px;border-radius:6px;background:var(--plb-page);box-shadow:0 24px 48px -24px rgba(0,0,0,.5);animation:plb-rise .5s cubic-bezier(.2,.8,.2,1)}
.plb-stub-row{white-space:nowrap;display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:13px;color:var(--plb-muted)}
.plb-stub-net{font-size:34px;font-weight:500;letter-spacing:-.035em;margin-top:8px;font-variant-numeric:tabular-nums}
.plb-stub-k{font-size:13px;color:var(--plb-muted)}
.plb-stub-when{white-space:normal;flex-direction:column;align-items:flex-start;gap:2px;margin-top:12px;padding-top:12px;border-top:1px dashed var(--plb-rule)}
.plb-stub-when span:first-child{color:var(--plb-ink);font-weight:500}

/* ---- stories ---- */
.plb-story-nav{display:flex;align-items:center;gap:14px;justify-self:end}
.plb-story-count{font-size:14px;color:var(--plb-muted);font-variant-numeric:tabular-nums}
.plb-round{display:inline-flex;align-items:center;justify-content:center;width:46px;height:46px;border-radius:50%;border:1px solid var(--plb-rule);transition:border-color .2s,background-color .2s}
.plb-round:hover{border-color:var(--plb-ink);background:var(--plb-soft)}
.plb-story{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);border:1px solid var(--plb-rule);min-height:420px}
.plb-story-art{position:relative;background:var(--plb-panel);overflow:hidden;display:flex;align-items:flex-end;padding:clamp(20px,2.6vw,36px);isolation:isolate}
.plb-story-art .plb-art{inset:0;width:100%;height:100%}
.plb-metric{position:relative;z-index:1;display:flex;flex-direction:column;gap:8px;padding:18px 22px;border-radius:5px;background:var(--plb-page);box-shadow:0 20px 40px -20px rgba(0,0,0,.45);animation:plb-rise .6s cubic-bezier(.2,.8,.2,1)}
.plb-metric-k{font-size:13px;color:var(--plb-muted)}
.plb-metric-v{display:flex;align-items:center;gap:12px;font-size:clamp(26px,2.6vw,38px);font-weight:500;letter-spacing:-.035em}
.plb-metric-v s{color:var(--plb-muted);text-decoration-thickness:2px}
.plb-metric-v svg{color:var(--plb-muted)}
.plb-story-copy{display:flex;flex-direction:column;justify-content:space-between;gap:36px;padding:clamp(28px,3.6vw,56px);animation:plb-up .6s cubic-bezier(.2,.8,.2,1)}
.plb-story-copy blockquote{font-size:clamp(21px,2vw,30px);line-height:1.35;letter-spacing:-.025em;font-weight:450}
.plb-story-copy figcaption{display:flex;align-items:center;gap:14px;font-size:14.5px;color:var(--plb-muted)}
.plb-story-copy figcaption span:last-child{display:flex;flex-direction:column}
.plb-story-copy figcaption b{color:var(--plb-ink);font-weight:500}
.plb-avatar{display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:50%;color:#fff;font-weight:600;font-size:15px;letter-spacing:.02em;flex:none;box-shadow:inset 0 0 0 3px rgba(255,255,255,.18)}

/* ---- calculator ---- */
.plb-calc{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);border:1px solid var(--plb-rule)}
.plb-calc-in{display:flex;flex-direction:column;gap:34px;padding:clamp(24px,3.4vw,52px)}
.plb-range{display:flex;flex-direction:column;gap:14px}
.plb-range-k{display:flex;justify-content:space-between;align-items:baseline;gap:12px;font-size:15.5px;color:var(--plb-muted)}
.plb-range-k b{color:var(--plb-ink);font-weight:500;font-size:20px;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.plb-range input{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:2px;margin:0;background:linear-gradient(90deg,var(--plb-ink) var(--plb-fill),var(--plb-rule) var(--plb-fill));cursor:pointer}
.plb-range input::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:var(--plb-page);border:2px solid var(--plb-ink);box-shadow:0 2px 6px rgba(0,0,0,.18);transition:transform .15s}
.plb-range input::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:var(--plb-page);border:2px solid var(--plb-ink)}
.plb-range input:active::-webkit-slider-thumb{transform:scale(1.15)}
.plb-calc-out{position:relative;display:flex;align-items:center;justify-content:center;padding:clamp(24px,3.4vw,52px);background:var(--plb-panel);overflow:hidden;isolation:isolate}
.plb-calc-out .plb-art{inset:0;width:100%;height:100%}
.plb-calc-card{position:relative;z-index:1;width:min(100%,420px);display:flex;flex-direction:column;gap:12px;padding:clamp(22px,2.6vw,34px);border-radius:6px;background:var(--plb-page);box-shadow:0 30px 60px -30px rgba(0,0,0,.5)}
.plb-calc-k{font-size:14px;color:var(--plb-muted)}
.plb-calc-v{font-size:clamp(40px,4.4vw,62px);font-weight:500;letter-spacing:-.05em;line-height:1;font-variant-numeric:tabular-nums}
.plb-calc-row{display:flex;flex-wrap:wrap;gap:6px 22px;font-size:14px;color:var(--plb-muted);padding:10px 0 14px;border-bottom:1px solid var(--plb-rule);margin-bottom:6px}
.plb-calc-row b{color:var(--plb-ink);font-weight:500;font-variant-numeric:tabular-nums}

/* ---- faq ---- */
.plb-faq-wrap{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:clamp(28px,6vw,120px);align-items:start}
.plb-faq{border-top:1px solid var(--plb-rule)}
.plb-faq li{border-bottom:1px solid var(--plb-rule)}
.plb-faq button{display:flex;justify-content:space-between;align-items:center;gap:20px;width:100%;padding:24px 0;font-size:clamp(17px,1.4vw,20px);font-weight:500;letter-spacing:-.015em;transition:color .2s}
.plb-faq button:hover{color:color-mix(in srgb,var(--plb-ink) 70%,var(--plb-accent))}
.plb-plus{position:relative;width:14px;height:14px;flex:none}
.plb-plus::before,.plb-plus::after{content:"";position:absolute;left:0;right:0;top:50%;height:1.5px;margin-top:-.75px;background:currentColor;transition:transform .3s cubic-bezier(.2,.8,.2,1)}
.plb-plus::after{transform:rotate(90deg)}
.plb-faq li[data-open] .plb-plus::after{transform:rotate(0)}
.plb-faq-a p{padding:0 40px 26px 0;font-size:16px;line-height:1.65;color:var(--plb-muted);animation:plb-up .35s ease-out}

/* ---- cta ---- */
.plb-cta{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:clamp(28px,4vw,64px);align-items:center;margin:clamp(72px,9vw,128px) auto;padding:clamp(32px,5vw,80px);background:var(--plb-panel);color:#fff;overflow:hidden;isolation:isolate}
.plb-cta .plb-art{inset:0;width:100%;height:100%}
.plb-cta-in{position:relative;z-index:1;display:flex;flex-direction:column;gap:20px}
.plb-cta-in p{font-size:clamp(16px,1.3vw,19px);line-height:1.6;color:rgba(255,255,255,.82);max-width:30em}
.plb-form{position:relative;z-index:1;display:flex;flex-direction:column;gap:16px;padding:clamp(22px,2.6vw,32px);border-radius:6px;background:var(--plb-page);color:var(--plb-ink);box-shadow:0 30px 60px -30px rgba(0,0,0,.5)}
.plb-field{display:flex;flex-direction:column;gap:8px;font-size:13.5px;color:var(--plb-muted)}
.plb-field input{height:46px;padding:0 14px;border-radius:3px;border:1px solid var(--plb-rule);background:var(--plb-page);font-size:16px;color:var(--plb-ink);outline:none;transition:border-color .2s,box-shadow .2s}
.plb-field input:focus{border-color:var(--plb-ink);box-shadow:0 0 0 3px color-mix(in srgb,var(--plb-accent) 18%,transparent)}
.plb-field input[aria-invalid="true"]{border-color:#b4341f}
.plb-crew{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
.plb-crew button{text-align:center;height:40px;border-radius:3px;border:1px solid var(--plb-rule);font-size:13.5px;color:var(--plb-ink);transition:border-color .2s,background-color .2s,color .2s}
.plb-crew button:hover{border-color:var(--plb-ink)}
.plb-crew button[aria-checked="true"]{background:var(--plb-ink);color:var(--plb-page);border-color:var(--plb-ink)}
.plb-err{min-height:18px;font-size:13px;color:#b4341f;margin-top:-6px}
.plb-sent{display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding:12px 0;font-size:15px;color:var(--plb-muted);animation:plb-up .4s ease-out}
.plb-sent b{font-size:22px;font-weight:500;letter-spacing:-.025em;color:var(--plb-ink)}
.plb-sent-ico{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:50%;background:var(--plb-good);color:#fff;margin-bottom:6px;animation:plb-pop .4s cubic-bezier(.2,1.6,.4,1)}
.plb-sent .plb-banner-act{color:var(--plb-ink);margin-top:8px}

/* ---- footer ---- */
.plb-foot-in{display:grid;grid-template-columns:minmax(0,1.6fr) repeat(4,minmax(0,1fr));gap:32px;padding:clamp(56px,6vw,88px) 0 48px}
.plb-foot-brand{display:flex;flex-direction:column;gap:14px}
.plb-foot-brand p{font-size:15px;color:var(--plb-muted);max-width:18em}
.plb-foot-col{display:flex;flex-direction:column;gap:14px;font-size:14.5px}
.plb-foot-col > span{color:var(--plb-ink);font-weight:500}
.plb-foot-col ul{display:flex;flex-direction:column;gap:10px}
.plb-foot-col a{color:var(--plb-muted);transition:color .2s}
.plb-foot-col a:hover{color:var(--plb-ink)}
.plb-foot-note{display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:24px 0 36px;border-top:1px solid var(--plb-rule);font-size:13px;color:var(--plb-muted)}
.plb-hatch{position:relative;height:clamp(48px,6vw,80px);background:repeating-linear-gradient(-45deg,transparent 0 9px,var(--plb-rule) 9px 10px);border-top:1px dashed var(--plb-guide)}
.plb-hatch .plb-frame{height:100%}

/* ---- narrow ---- */
@media (max-width:1100px){
  .plb-logos{grid-template-columns:repeat(3,minmax(0,1fr))}
  .plb-logos li{border-bottom:1px solid var(--plb-rule)}
  .plb-logos{border-bottom:0}
  .plb-numbers{grid-template-columns:repeat(2,minmax(0,1fr))}
  .plb-number:nth-child(2){border-right:0}
  .plb-number:nth-child(-n+2){border-bottom:1px solid var(--plb-rule)}
  .plb-card{left:6%;right:6%;top:9%}
  .plb-foot-in{grid-template-columns:repeat(4,minmax(0,1fr))}
  .plb-foot-brand{grid-column:1 / -1}
}
@media (max-width:900px){
  .plb-nav-links,.plb-nav-login{display:none}
  .plb-burger{display:inline-flex}
  .plb-sheet{display:flex;flex-direction:column;padding:6px clamp(16px,5vw,32px) 18px;border-top:1px solid var(--plb-rule);animation:plb-up .25s ease-out}
  .plb-sheet a{padding:13px 0;border-bottom:1px solid var(--plb-rule);font-size:17px}
  .plb-split,.plb-faq-wrap,.plb-cta,.plb-calc,.plb-story{grid-template-columns:minmax(0,1fr)}
  .plb-story-nav{justify-self:start}
  .plb-story-art{min-height:220px}
  .plb-bento{grid-template-columns:minmax(0,1fr)}
  .plb-tile--wide{grid-column:auto;grid-template-columns:minmax(0,1fr)}
  .plb-tile--rev .plb-tile-copy{order:0}
  .plb-tabs{display:flex;overflow-x:auto;scrollbar-width:none;scroll-snap-type:x mandatory}
  .plb-tabs::-webkit-scrollbar{display:none}
  .plb-tab{flex:1 0 auto;height:54px;font-size:15px;scroll-snap-align:start}
  .plb-gap{height:28px}
  .plb-panel{height:600px}
  .plb-card{left:16px;right:16px;top:24px}
  .plb-caption{grid-template-columns:minmax(0,1fr)}
  .plb-caption p{border-left:0;border-top:1px solid var(--plb-rule)}
  .plb-stats{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:22px 0 26px}
  .plb-stats--3{grid-template-columns:repeat(3,minmax(0,1fr))}
  .plb-lines{grid-template-columns:minmax(0,1fr)}
  .plb-tr{grid-template-columns:minmax(0,1.6fr) repeat(2,minmax(0,1fr))}
  .plb-tr > span:nth-child(3),.plb-tr > span:nth-child(4){display:none}
}
@media (max-width:600px){
  .plb-run-head{flex-direction:column}
  .plb-approve{width:100%}
  .plb-alert{font-size:13px;padding:0 12px}
  .plb-frame{width:calc(100% - 12px)}
  .plb-col{width:calc(100% - 28px)}
  .plb-panel{height:720px}
  .plb-card{left:10px;right:10px;top:14px}
  .plb-mock{padding:16px}
  .plb-alert{gap:10px}
  .plb-stat{padding:12px}
  .plb-stat b{font-size:15.5px}
  .plb-stats--3{grid-template-columns:minmax(0,1fr)}
  .plb-logos{grid-template-columns:repeat(2,minmax(0,1fr))}
  .plb-numbers{grid-template-columns:minmax(0,1fr)}
  .plb-number{border-right:0;border-bottom:1px solid var(--plb-rule)}
  .plb-number:last-child{border-bottom:0}
  .plb-crew{grid-template-columns:repeat(2,minmax(0,1fr))}
  .plb-foot-in{grid-template-columns:repeat(2,minmax(0,1fr))}
  .plb-nav-end .plb-btn{display:none}
}

@media (prefers-reduced-motion:reduce){
  .plb-root *,.plb-root *::before,.plb-root *::after{animation-duration:.01ms !important;animation-iteration-count:1 !important;transition-duration:.01ms !important}
  .plb-root [data-reveal]{opacity:1;transform:none}
  .plb-art-drift{transform:none}
}
`

export type PlbPaletteInput = Partial<PlbPalette>
