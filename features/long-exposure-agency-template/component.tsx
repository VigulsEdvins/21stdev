"use client"

// Long Exposure Agency Template — a whole automation-agency site in one file:
// a full-screen pale page, a quiet serif, ink buttons, and every picture a long-exposure
// blur of some landscape that was never photographed.
//
// Three pages behind one nav, switched in place: home (hero over a live prism,
// a client marquee, counting stats, a tabbed services panel, a 45-day process,
// selected work, kind words, insights, FAQ), the case-study grid with *Load
// more*, and a case-study page with a back and next button. A booking dialog
// picks a weekday and a time and validates the form.
//
// The pictures are drawn in WebGL2: one shared offscreen context paints every
// card, banner and the hero into its own 2D canvas. Hover a card and its
// landscape starts drifting; the hero prism follows the pointer and spins up
// when clicked. Nothing loads at runtime: no images, no fonts, no fetches.
import * as React from "react"

/* ------------------------------------------------------------------ types */

export type FieldPreset = "ember" | "moss" | "copper" | "redline" | "glacier" | "dusk" | "noir" | "sand"
/** A preset name, or five hex colours: sky, far, mid, glow, shadow. */
export type LxField = FieldPreset | { colors: [string, string, string, string, string]; seed?: number; angle?: number }
export type LxLink = { label: string; href?: string }
export type LxStat = { value: number; prefix?: string; suffix?: string; decimals?: number; label: string }
export type LxSection = { label: string; lead: string; body?: string }
export type LxQuote = { text: string; name: string; role: string }
export type LxCase = {
  /** Stable id. `#case:<id>` links straight to the case page. */
  id: string
  name: string
  industry: string
  /** One line under the title on the case page. */
  tagline: string
  /** The card text on the grid. */
  summary: string
  field?: LxField
  /** Which drawn logo mark (0–5). Defaults to one picked from the name. */
  mark?: number
  /** Set the client's name in the serif instead of bold sans. */
  serif?: boolean
  sections?: LxSection[]
  results?: LxStat[]
  quote?: LxQuote
  stack?: string[]
}
export type LxService = { title: string; description: string; points: string[]; flow: string[]; field?: LxField; metric?: string }
export type LxStep = { title: string; days: [number, number]; description: string; deliverables: string[] }
export type LxInsight = { title: string; category: string; read: string; href?: string; field?: LxField }
export type LxFaq = { question: string; answer: string }
export type LxColumn = { title: string; links: LxLink[] }
export type LxBooking = { name: string; email: string; company: string; message: string; date: string; time: string }

export type LongExposureAgencyTemplateProps = {
  /** Word beside the dotted mark in the nav and footer. */
  brand?: string
  /** In-template hrefs: `#cases`, `#case:<id>`, `#home`, `#book`, `#404`, or a home section (`#services`, `#process`, `#about`, `#work`, `#insights`, `#faq`). */
  nav?: LxLink[]
  navCta?: LxLink
  hero?: {
    title?: string
    subtitle?: string
    primary?: LxLink
    secondary?: LxLink
    /** The outlined word floating over the prism. Defaults to `brand`. */
    word?: string
    badge?: { title: string; text: string }
    trust?: string
  }
  clientsTitle?: string
  /** Names for the marquee. Each gets a drawn mark. */
  clients?: string[]
  stats?: LxStat[]
  services?: { kicker?: string; title?: string; items?: LxService[] }
  process?: { kicker?: string; title?: string; steps?: LxStep[] }
  cases?: LxCase[]
  casesPage?: { title?: string; subtitle?: string; pageSize?: number }
  testimonials?: LxQuote[]
  insights?: { kicker?: string; title?: string; items?: LxInsight[] }
  faq?: { kicker?: string; title?: string; items?: LxFaq[] }
  cta?: { title?: string; subtitle?: string; action?: LxLink; note?: string; field?: LxField }
  footer?: { tagline?: string; columns?: LxColumn[]; socials?: { kind: "x" | "instagram" | "meta" | "linkedin"; href?: string }[]; copyright?: string; credit?: { label: string; name: string; href?: string } }
  /** Called when the booking form is sent. Resolve `false` or throw to show an error. Without it the send is simulated. */
  onBook?: (booking: LxBooking) => void | boolean | Promise<unknown>
  /** Which page opens first. */
  initialPage?: "home" | "cases" | { case: string }
  /** CSS font-family for headings. */
  serif?: string
  /** CSS font-family for everything else. */
  sans?: string
  /** Button and ink colour in the light theme. */
  ink?: string
  defaultTheme?: "system" | "light" | "dark"
  /** Width of the content column. The page itself always fills the screen. */
  maxWidth?: string
  height?: string
  className?: string
}

type Theme = "light" | "dark"
type Page = { name: "home" } | { name: "cases" } | { name: "case"; id: string } | { name: "404" }
type Target =
  | { kind: "none" }
  | { kind: "external" }
  | { kind: "book" }
  | { kind: "page"; page: Page; section?: string }
type RGB = [number, number, number]

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

function countValue(target: number, t: number, decimals = 0): number {
  const f = Math.pow(10, decimals)
  return Math.round(target * easeOutCubic(t) * f) / f
}

function formatStat(n: number, decimals = 0): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function hexToRgb(hex: string, fallback: RGB = [0.5, 0.5, 0.5]): RGB {
  const m = hex.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (!m) return fallback
  let h = m[1]
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  const n = parseInt(h, 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

// sky, far, mid, glow, shadow — the five stops every landscape is drawn from
const FIELDS: Record<FieldPreset, { colors: [string, string, string, string, string]; angle: number }> = {
  ember: { colors: ["#2a1519", "#7a3036", "#c23a2a", "#ff6a2c", "#070505"], angle: 0.12 },
  moss: { colors: ["#d8dac8", "#9fa47c", "#56602c", "#e4e2b4", "#151a0a"], angle: -0.35 },
  copper: { colors: ["#3e4d6c", "#9a5530", "#c87038", "#ffb070", "#2b0f06"], angle: 0.5 },
  redline: { colors: ["#f1efeb", "#c9c3c0", "#c51f26", "#ff6a4a", "#141b33"], angle: -0.08 },
  glacier: { colors: ["#e3ebef", "#9fb6c6", "#4d6c88", "#d6ecfa", "#0f1a28"], angle: 0.22 },
  dusk: { colors: ["#2c2442", "#5c3b6e", "#b0567a", "#ff9a6a", "#0d0814"], angle: 0.18 },
  noir: { colors: ["#1d2126", "#2e3843", "#55687a", "#ff8a4a", "#060708"], angle: 0.0 },
  sand: { colors: ["#efe6d8", "#d6b48a", "#b0703e", "#fff0d0", "#2a160a"], angle: -0.2 },
}
const PRESETS = Object.keys(FIELDS) as FieldPreset[]

function resolveField(field: LxField | undefined, salt: string): { colors: string[]; seed: number; angle: number } {
  const h = hashStr(salt)
  const seed = ((h % 1000) / 1000) * 9 + 0.5
  if (!field) field = PRESETS[h % PRESETS.length]
  if (typeof field === "string") {
    const p = FIELDS[field] ?? FIELDS.ember
    return { colors: p.colors, seed, angle: p.angle }
  }
  return { colors: field.colors, seed: field.seed ?? seed, angle: field.angle ?? 0 }
}

const SECTIONS = ["services", "process", "about", "clients", "stats", "work", "testimonials", "insights", "faq", "contact"]

function parseTarget(href: string | undefined, caseIds: string[]): Target {
  if (!href || href === "#") return { kind: "none" }
  if (!href.startsWith("#")) return { kind: "external" }
  const key = href.slice(1).toLowerCase()
  if (key === "book" || key === "book-a-call") return { kind: "book" }
  if (key === "home" || key === "top") return { kind: "page", page: { name: "home" } }
  if (key === "cases" || key === "case-studies") return { kind: "page", page: { name: "cases" } }
  if (key.startsWith("case:")) {
    const id = href.slice(6)
    return caseIds.includes(id) ? { kind: "page", page: { name: "case", id } } : { kind: "page", page: { name: "404" } }
  }
  if (SECTIONS.includes(key)) return { kind: "page", page: { name: "home" }, section: key }
  return { kind: "page", page: { name: "404" } }
}

function nextIndex(i: number, dir: number, n: number): number {
  if (n <= 0) return 0
  return (((i + dir) % n) + n) % n
}

// The next n weekdays, starting tomorrow.
function nextWeekdays(from: Date, n: number): Date[] {
  const out: Date[] = []
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  while (out.length < n) {
    d.setDate(d.getDate() + 1)
    const wd = d.getDay()
    if (wd !== 0 && wd !== 6) out.push(new Date(d))
  }
  return out
}

function dayKey(d: Date): string {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0")
}

// A believable calendar: about a quarter of the slots are already taken.
function slotTaken(day: string, time: string): boolean {
  return hashStr(day + "@" + time) % 4 === 0
}

function stepAt(days: [number, number][], day: number): number {
  for (let i = 0; i < days.length; i++) if (day >= days[i][0] && day <= days[i][1]) return i
  return days.length - 1
}
// #endregion logic

/* ------------------------------------------------------------------ defaults */

const DEFAULT_CASES: LxCase[] = [
  {
    id: "corvane",
    name: "Corvane",
    industry: "E-commerce",
    tagline: "A direct-to-consumer brand selling premium outdoor and adventure equipment.",
    summary: "How Corvane cut fulfilment time in half — and saved 52 hours a month without a single new hire.",
    field: "ember",
    mark: 0,
    sections: [
      {
        label: "Overview",
        lead: "Corvane is a mid-sized e-commerce brand processing over 3,000 orders every month. Strong growth had turned their operations team into the bottleneck — most of their week went on manual tasks that only existed because their systems didn't talk to each other.",
        body: "Headcount was increasing but margins weren't moving. They came to us not knowing exactly what needed fixing, only that hiring more people into a broken process wasn't the answer.",
      },
      {
        label: "Challenges",
        lead: "Every new order triggered a chain of manual steps across four disconnected tools. A single order needed up to 11 touchpoints before it was fully processed — and an error at any one of them cascaded downstream.",
        body: "Response times were slow, mistakes were frequent, and the team was burning out on work that added zero strategic value. None of it was complicated. It was just relentless, repetitive, and entirely avoidable.",
      },
      {
        label: "What we built",
        lead: "One order pipeline from checkout to doorstep. Shopify, the warehouse system, the carrier and the help desk now share a single record, and the only steps left for people are the ones that need judgement.",
        body: "An AI agent reads every incoming support email, matches it to the order, drafts the reply and flags anything unusual. Exceptions land in one Slack channel with the fix already suggested.",
      },
    ],
    results: [
      { value: 52, label: "Hours saved every month" },
      { value: 48, suffix: "%", label: "Faster fulfilment" },
      { value: 2, label: "Touchpoints per order, down from 11" },
    ],
    quote: { text: "We stopped hiring for the chaos. The team finally works on the business instead of inside it.", name: "Maya Lindqvist", role: "COO, Corvane" },
    stack: ["Shopify", "ShipBob", "Gorgias", "Slack", "Airtable"],
  },
  {
    id: "synthwell",
    name: "Synthwell",
    industry: "Marketing Agency",
    tagline: "A 40-person performance agency running paid media for consumer brands.",
    summary: "How Synthwell turned a four-day reporting scramble into a dashboard that writes itself every Monday at 7am.",
    field: "moss",
    mark: 1,
    sections: [
      {
        label: "Overview",
        lead: "Synthwell manages paid media for 60 clients across five ad platforms. Every Monday, account managers exported spreadsheets, pasted them into slides, and wrote commentary by hand.",
        body: "Reporting ate the first half of every week. Clients got their numbers on Thursday, by which point the numbers were already stale.",
      },
      {
        label: "Challenges",
        lead: "Five platforms, five definitions of a conversion, and a single analyst who knew how the master spreadsheet worked. When she went on holiday, reporting simply stopped.",
        body: "The agency had tried two dashboard tools before. Both died because nobody trusted the numbers they showed.",
      },
      {
        label: "What we built",
        lead: "A nightly pipeline that pulls every platform into one warehouse with one definition of each metric, and a reporting agent that writes the first draft of each client's commentary.",
        body: "Account managers now edit instead of assemble. Every figure links back to its source row, so the numbers finally get trusted.",
      },
    ],
    results: [
      { value: 31, label: "Hours back each week" },
      { value: 7, prefix: "Mon ", suffix: "am", label: "Reports out, not Thursday" },
      { value: 100, suffix: "%", label: "Clients on live dashboards" },
    ],
    quote: { text: "Monday used to be spreadsheet day. Now it's strategy day.", name: "Theo Marchetti", role: "Founder, Synthwell" },
    stack: ["Google Ads", "Meta Ads", "BigQuery", "Looker Studio", "Notion"],
  },
  {
    id: "neuvra",
    name: "Neuvra",
    industry: "B2B Consulting",
    tagline: "A boutique operations consultancy advising mid-market manufacturers.",
    summary: "How Neuvra's consultants got back two days a week by letting an AI agent draft every proposal.",
    field: "copper",
    mark: 2,
    serif: true,
    sections: [
      {
        label: "Overview",
        lead: "Neuvra wins work on the strength of its proposals: detailed, tailored, and slow to write. Partners spent evenings rebuilding the same documents from old ones.",
        body: "The firm wanted more pitches out of the door without lowering the bar that won them clients in the first place.",
      },
      {
        label: "Challenges",
        lead: "Fifteen years of proposals lived across shared drives in nine different templates. The best answers to common questions existed — nobody could find them in time.",
        body: "Every proposal started from a blank page and a vague memory of a similar one.",
      },
      {
        label: "What we built",
        lead: "A proposal agent trained on the firm's own archive. Give it a discovery call transcript and it drafts scope, approach and pricing in Neuvra's voice, citing the past work it borrowed from.",
        body: "Partners review, edit and send. The agent learns from every edit they make.",
      },
    ],
    results: [
      { value: 2, label: "Days back per consultant, per week" },
      { value: 3, suffix: "×", label: "Proposals sent each month" },
      { value: 41, suffix: "%", label: "Higher win rate" },
    ],
    quote: { text: "It writes like us on a good day. We just make it better.", name: "Arjun Mehta", role: "Managing Partner, Neuvra" },
    stack: ["HubSpot", "Google Drive", "Gong", "OpenAI", "DocuSign"],
  },
  {
    id: "kintsu",
    name: "Kintsu",
    industry: "SaaS",
    tagline: "Scheduling software for 9,000 clinics across Europe.",
    summary: "How Kintsu answered 68% of support tickets automatically while customer satisfaction went up, not down.",
    field: "redline",
    mark: 3,
    sections: [
      {
        label: "Overview",
        lead: "Kintsu's support queue doubled in a year. Most tickets asked the same twenty questions, and every one of them waited behind the hard ones.",
        body: "They needed faster answers without hiding real problems behind a chatbot wall.",
      },
      {
        label: "Challenges",
        lead: "Answers depended on each clinic's plan, region and settings — information spread across the billing system, the product database and the help centre.",
        body: "A generic bot would have been confidently wrong. Customers in healthcare don't forgive that.",
      },
      {
        label: "What we built",
        lead: "A support agent that looks up the clinic's actual account before answering, resolves what it can, and hands everything else to a person with a summary and a suggested fix.",
        body: "It never guesses about billing or patient data. Those go straight to the team, tagged and prioritised.",
      },
    ],
    results: [
      { value: 68, suffix: "%", label: "Tickets resolved automatically" },
      { value: 4.8, decimals: 1, label: "CSAT, up from 4.3" },
      { value: 90, suffix: "s", label: "Median first response" },
    ],
    quote: { text: "Our support team went from firefighting to fixing the product.", name: "Lena Okafor", role: "Head of Support, Kintsu" },
    stack: ["Intercom", "Stripe", "Postgres", "Linear", "Slack"],
  },
  {
    id: "halyard",
    name: "Halyard",
    industry: "Logistics",
    tagline: "A regional freight forwarder moving 1,200 shipments a week.",
    summary: "How Halyard replaced 14 spreadsheets with one live dispatch board — and stopped losing shipments.",
    field: "glacier",
    mark: 4,
    serif: true,
    sections: [
      {
        label: "Overview",
        lead: "Halyard's dispatchers ran the business from fourteen spreadsheets, three inboxes and a whiteboard. It worked, until a key dispatcher left.",
        body: "Shipments started slipping through the gaps between files nobody fully owned.",
      },
      {
        label: "Challenges",
        lead: "Carrier updates arrived as emails, PDFs and phone calls. Every status change had to be typed in by hand — usually twice.",
        body: "Customers called to ask where their freight was, and the honest answer was often 'let me check'.",
      },
      {
        label: "What we built",
        lead: "A dispatch board fed by an agent that reads every carrier email and PDF, updates the shipment, and messages the customer when anything changes.",
        body: "Dispatchers see exceptions first. Everything on schedule stays out of their way.",
      },
    ],
    results: [
      { value: 14, label: "Spreadsheets retired" },
      { value: 0, label: "Lost shipments since launch" },
      { value: 37, suffix: "%", label: "Fewer 'where is it' calls" },
    ],
    quote: { text: "For the first time, everyone looks at the same picture.", name: "Rui Fernandes", role: "Operations Director, Halyard" },
    stack: ["Gmail", "Retool", "Postgres", "Twilio", "Make"],
  },
  {
    id: "quorra",
    name: "Quorra",
    industry: "Fintech",
    tagline: "A payments platform for independent marketplaces.",
    summary: "How Quorra reconciles 40,000 transactions a night with zero manual matching.",
    field: "dusk",
    mark: 5,
    sections: [
      {
        label: "Overview",
        lead: "Quorra settles payouts for 300 marketplaces. Finance reconciled bank files against the ledger every morning, by hand, before anyone could get paid.",
        body: "As volume grew, the morning stretched into the afternoon.",
      },
      {
        label: "Challenges",
        lead: "Three banks, three file formats, and references that rarely matched cleanly. The edge cases were the whole job.",
        body: "An error meant a merchant paid twice or not at all. Neither was acceptable.",
      },
      {
        label: "What we built",
        lead: "A matching engine that clears the obvious pairs, scores the fuzzy ones, and asks a person only when confidence drops below the threshold finance chose.",
        body: "Every decision is logged with its reason, which turned the yearly audit into an afternoon.",
      },
    ],
    results: [
      { value: 40, suffix: "k", label: "Transactions matched nightly" },
      { value: 99.7, decimals: 1, suffix: "%", label: "Auto-match rate" },
      { value: 6, suffix: "h", label: "Saved every single morning" },
    ],
    quote: { text: "Finance closes the day before breakfast now.", name: "Sofia Brandt", role: "CFO, Quorra" },
    stack: ["Stripe", "Xero", "Snowflake", "dbt", "Slack"],
  },
]

const DEFAULT_SERVICES: LxService[] = [
  {
    title: "Workflow automation",
    description: "Order-to-cash, onboarding, approvals. We map the busywork and hand it to software that never skips a step.",
    points: ["Built on the tools you already pay for", "Every run logged and retryable", "A person pinged only when judgement is needed"],
    flow: ["Checkout", "Warehouse", "Carrier", "Inbox"],
    field: "ember",
    metric: "11 → 2 touchpoints per order",
  },
  {
    title: "AI agents",
    description: "Agents that read the inbox, draft the reply, update the CRM — and ask before doing anything risky.",
    points: ["Grounded in your own data, not guesses", "Clear hand-off rules you control", "Weekly review of every decision"],
    flow: ["Email", "Agent", "CRM", "Review"],
    field: "dusk",
    metric: "68% of tickets resolved",
  },
  {
    title: "System integrations",
    description: "Your store talks to your ledger. Your CRM talks to Slack. Every tool finally shares one source of truth.",
    points: ["Two-way sync, not nightly exports", "Conflicts caught before they spread", "Documented so your team can own it"],
    flow: ["Store", "Ledger", "CRM", "Slack"],
    field: "glacier",
    metric: "14 spreadsheets retired",
  },
  {
    title: "Reporting & insight",
    description: "Live dashboards fed by the same pipelines, so Monday's numbers are ready before Monday is.",
    points: ["One definition of every metric", "Commentary drafted for you", "Alerts when a number drifts"],
    flow: ["Ads", "Warehouse", "Model", "Dashboard"],
    field: "moss",
    metric: "4 days → 0 on reporting",
  },
]

const DEFAULT_STEPS: LxStep[] = [
  { title: "Discovery call", days: [1, 1], description: "Thirty minutes on where the hours go. You leave with three automations worth doing, whether you hire us or not.", deliverables: ["Time-leak map", "Top three opportunities"] },
  { title: "Audit & blueprint", days: [2, 10], description: "We shadow the work, measure every step and design the system on paper before a line of it is built.", deliverables: ["Process audit", "Blueprint & ROI model", "Fixed quote"] },
  { title: "Build & test", days: [11, 35], description: "Weekly demos on real data. Nothing goes live until your team has tried to break it.", deliverables: ["Working automations", "Edge-case test suite", "Weekly demos"] },
  { title: "Launch & hand-off", days: [36, 45], description: "We switch it on, watch it closely, and train your team to run it without us.", deliverables: ["Go-live support", "Runbook & training", "30-day check-in"] },
]

const DEFAULT_TESTIMONIALS: LxQuote[] = [
  { text: "They found 50 hours a month we didn't know we were losing, then gave them back to us in six weeks.", name: "Maya Lindqvist", role: "COO, Corvane" },
  { text: "The first agency that asked to watch us work before telling us what to buy.", name: "Arjun Mehta", role: "Managing Partner, Neuvra" },
  { text: "Calm, precise and fast. The automation just works, and when it can't, it tells us why.", name: "Sofia Brandt", role: "CFO, Quorra" },
]

const DEFAULT_INSIGHTS: LxInsight[] = [
  { title: "The 11-touchpoint order: finding the work hiding in your process", category: "Operations", read: "6 min read", field: "copper" },
  { title: "When an AI agent should ask a human — and how to decide", category: "AI agents", read: "8 min read", field: "dusk" },
  { title: "Automate the boring 80% first. The clever 20% can wait.", category: "Strategy", read: "4 min read", field: "sand" },
]

const DEFAULT_FAQ: LxFaq[] = [
  { question: "How do I know what's worth automating?", answer: "That's what the free call is for. We look for work that is frequent, rule-based and painful — and tell you honestly when something isn't worth automating yet." },
  { question: "Do we have to change the tools we use?", answer: "Almost never. We build on top of what your team already knows and only suggest a new tool when it pays for itself inside the first quarter." },
  { question: "What does a project cost?", answer: "Most projects land between a few and a few dozen thousand, fixed price, agreed after the audit. You'll see the ROI model before you commit." },
  { question: "What happens when something breaks?", answer: "Every automation logs each run, retries what it safely can and pings a named person for the rest. Optional care plans cover monitoring and changes." },
  { question: "Is our data safe with AI agents?", answer: "Agents only see the data a task needs, run in your accounts where possible, and never train public models on your information." },
]

const DEFAULT_CLIENTS = ["Hexaline", "Corvane", "Neuvra", "Quorra", "Kintsu", "Synthwell", "Halyard", "Pallium"]

const DEFAULT_STATS: LxStat[] = [
  { value: 170, suffix: "+", label: "Hours saved for clients every single month" },
  { value: 14, label: "Days to your first measurable ROI" },
  { value: 63, suffix: "%", label: "Average reduction in manual work" },
  { value: 120, suffix: "+", label: "Businesses running smarter than before" },
]

const DEFAULT_NAV: LxLink[] = [
  { label: "Case studies", href: "#cases" },
  { label: "Services", href: "#services" },
  { label: "About", href: "#about" },
  { label: "Insights", href: "#insights" },
]

const SERIF = '"Newsreader","Source Serif 4","Iowan Old Style","Charter","Bitstream Charter","Times New Roman",Times,serif'
const SANS = '"Figtree","Inter","Geist",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif'

/* ------------------------------------------------------------------ webgl */

const VERT = `#version 300 es
void main(){vec2 p=vec2(gl_VertexID==1?3.0:-1.0,gl_VertexID==2?3.0:-1.0);gl_Position=vec4(p,0.0,1.0);}`

// mode 0: a motion-blurred aerial landscape, ridges stacked back to front,
// lit along their crests and brushed sideways. mode 1: glass blades fanned
// around a point, dispersing light into warm and cool fringes.
const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uSeed;
uniform float uMode;
uniform float uAngle;
uniform vec2 uPtr;
uniform vec3 uC[5];
out vec4 outColor;

float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=0.5,s=0.0;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<5;i++){s+=a*vn(p);p=m*p;a*=0.5;}return s;}

vec3 body(float d,float n){
  d=clamp(d+(n-0.5)*0.35,0.0,1.0);
  return d<0.5?mix(uC[1],uC[2],d*2.0):mix(uC[2],uC[4],(d-0.5)*2.0);
}

vec3 land(vec2 p){
  float s=uSeed;
  float t=uTime*0.05;
  vec2 w=vec2(fbm(p*vec2(0.6,1.4)+s+t),fbm(p*vec2(0.6,1.4)+s*1.7+3.1-t));
  vec2 q=p+(w-0.5)*vec2(0.9,0.35)+uPtr*vec2(0.05,0.03);
  q.x+=uTime*0.025;
  vec3 col=mix(uC[0],uC[1],smoothstep(0.75,-0.5,q.y));
  for(int i=0;i<5;i++){
    float fi=float(i);
    float base=0.42-fi*0.23;
    float y=base+0.15*sin(q.x*(1.1+fi*0.35)+s*(1.3+fi)+fi*1.7)+0.22*(fbm(vec2(q.x*0.8+fi*7.0+s,fi))-0.5);
    float soft=0.04+0.09*vn(vec2(q.x*0.7+fi*3.0,s+fi));
    float below=q.y-y;
    float m=smoothstep(soft,-soft,below);
    float crest=exp(-pow(below/(soft*1.4+0.015),2.0));
    float depth=(fi+0.6)/5.0;
    vec3 b=body(depth,vn(q*vec2(0.5,3.0)+fi*4.0));
    b=mix(b,uC[4],smoothstep(0.0,0.45,-below)*0.65);
    col=mix(col,b,m);
    float hot=smoothstep(0.3,0.9,vn(vec2(q.x*0.9+s*2.0+fi*5.0,fi*2.3)));
    col+=uC[3]*crest*hot*(0.7-0.1*fi)*smoothstep(-soft*2.0,0.0,soft-below);
  }
  float st=fbm(vec2(q.x*0.25,q.y*14.0)+s*3.0);
  col*=0.86+0.28*st;
  return col;
}

vec3 prism(vec2 p){
  float t=uTime*0.1;
  vec2 c=vec2(0.1,-0.02)+uPtr*vec2(0.06,0.04);
  vec2 ld=normalize(vec2(0.55,0.8)+uPtr*0.9);
  vec3 bg=mix(vec3(0.028,0.03,0.034),vec3(0.12,0.125,0.13),smoothstep(-0.7,0.7,p.y*0.8-p.x*0.35));
  vec3 acc=vec3(0.0);
  for(int i=0;i<7;i++){
    float fi=float(i);
    float a=fi*0.897+t*(0.6+0.13*fi)+0.25*sin(t*1.3+fi*2.0)+uSeed;
    vec2 d=vec2(cos(a),sin(a));
    vec2 n=vec2(-d.y,d.x);
    vec2 rel=p-c-d*(0.16+0.06*sin(fi*2.3+t*1.7));
    float u=dot(rel,d);
    float L=0.3+0.14*fract(sin(fi*12.9)*43758.5);
    float W=0.05+0.045*fract(sin(fi*7.3)*1531.7);
    float v=dot(rel,n)+0.9*sin(fi*1.7+0.6)*u*u;
    float lit=0.2+0.8*pow(dot(d,ld)*0.5+0.5,3.0);
    vec3 e=vec3(0.0);
    for(int k=0;k<3;k++){
      float vk=v+(float(k)-1.0)*0.007*(1.0+abs(u)*5.0);
      float ek=length(vec2(u/L,vk/W));
      float rim=exp(-pow((ek-1.0)*4.0,2.0));
      float core=smoothstep(1.05,0.15,ek);
      float caus=pow(0.5+0.5*sin(u*22.0-vk*40.0+fi*1.9+t*4.0),6.0);
      float glow=exp(-max(ek-1.0,0.0)*2.0)*0.06;
      e[k]=rim*0.8+core*(0.16+caus*0.8)+glow;
    }
    acc+=e*lit;
  }
  float ang=atan(p.y-c.y,p.x-c.x);
  vec3 tint=mix(vec3(1.0,0.5,0.24),vec3(0.7,0.82,1.0),smoothstep(-0.6,1.0,sin(ang*2.0+t*2.0)));
  vec3 col=1.0-exp(-acc*mix(vec3(1.0),tint,0.5)*1.55);
  return bg+col*(1.0-bg);
}

void main(){
  vec2 uv=gl_FragCoord.xy/uRes;
  vec2 p=(gl_FragCoord.xy-0.5*uRes)/uRes.y;
  vec3 col;
  if(uMode<0.5){
    float ca=cos(uAngle),sa=sin(uAngle);
    col=land(mat2(ca,-sa,sa,ca)*p);
    vec2 g=vec2(-0.25+0.5*fract(uSeed*0.37),0.05)+uPtr*0.06;
    col+=uC[3]*0.3*exp(-dot(p-g,p-g)*5.0);
    col*=mix(0.62,1.0,smoothstep(1.25,0.25,length((uv-0.5)*vec2(1.25,1.0))));
    col=clamp(col/(1.0+0.15*col),0.0,1.0);
    col=mix(col,col*col*(3.0-2.0*col),0.45);
  }else{
    col=prism(p);
    col*=mix(0.7,1.0,smoothstep(1.2,0.3,length((uv-0.5)*vec2(1.1,1.0))));
  }
  col+=(h21(gl_FragCoord.xy+fract(uTime*7.0)*91.0)-0.5)*0.04;
  outColor=vec4(clamp(col,0.0,1.0),1.0);
}`

const MAX_W = 1600
const MAX_H = 1000

type GLState = { canvas: HTMLCanvasElement; gl: WebGL2RenderingContext; loc: Record<string, WebGLUniformLocation | null> }
let glState = null as GLState | null | false

// One context for every picture on the page. Browsers cap live contexts at a
// handful, and a case grid alone has more cards than that.
function getGL(): GLState | null {
  if (glState === false || typeof document === "undefined") return null
  if (glState && !glState.gl.isContextLost()) return glState
  const canvas = document.createElement("canvas")
  canvas.width = MAX_W
  canvas.height = MAX_H
  let gl = null as WebGL2RenderingContext | null
  try {
    gl = canvas.getContext("webgl2", { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: true })
  } catch {
    gl = null
  }
  if (!gl) {
    glState = false
    return null
  }
  const g = gl
  const sh = (type: number, src: string) => {
    const s = g.createShader(type)
    if (!s) return null
    g.shaderSource(s, src)
    g.compileShader(s)
    return g.getShaderParameter(s, g.COMPILE_STATUS) ? s : null
  }
  const vs = sh(g.VERTEX_SHADER, VERT)
  const fs = sh(g.FRAGMENT_SHADER, FRAG)
  const prog = g.createProgram()
  if (!vs || !fs || !prog) {
    glState = false
    return null
  }
  g.attachShader(prog, vs)
  g.attachShader(prog, fs)
  g.linkProgram(prog)
  if (!g.getProgramParameter(prog, g.LINK_STATUS)) {
    glState = false
    return null
  }
  g.useProgram(prog)
  g.bindVertexArray(g.createVertexArray())
  const loc: Record<string, WebGLUniformLocation | null> = {}
  for (const n of ["uRes", "uTime", "uSeed", "uMode", "uAngle", "uPtr", "uC"]) loc[n] = g.getUniformLocation(prog, n)
  glState = { canvas, gl: g, loc }
  return glState
}

type PaintArgs = { mode: number; colors: number[]; seed: number; angle: number; time: number; ptr: [number, number] }

function paintField(target: HTMLCanvasElement, a: PaintArgs): boolean {
  const s = getGL()
  if (!s) return false
  const r = target.getBoundingClientRect()
  if (r.width < 2 || r.height < 2) return true
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const k = Math.min(1, MAX_W / (r.width * dpr), MAX_H / (r.height * dpr))
  const w = Math.max(1, Math.round(r.width * dpr * k))
  const h = Math.max(1, Math.round(r.height * dpr * k))
  if (target.width !== w || target.height !== h) {
    target.width = w
    target.height = h
  }
  const ctx = target.getContext("2d")
  if (!ctx) return false
  const { gl, loc, canvas } = s
  gl.viewport(0, 0, w, h)
  gl.uniform2f(loc.uRes, w, h)
  gl.uniform1f(loc.uTime, a.time)
  gl.uniform1f(loc.uSeed, a.seed)
  gl.uniform1f(loc.uMode, a.mode)
  gl.uniform1f(loc.uAngle, a.angle)
  gl.uniform2f(loc.uPtr, a.ptr[0], a.ptr[1])
  gl.uniform3fv(loc.uC, a.colors)
  gl.drawArrays(gl.TRIANGLES, 0, 3)
  // GL draws from the bottom-left; the 2D copy reads from the top-left
  ctx.drawImage(canvas, 0, MAX_H - h, w, h, 0, 0, w, h)
  return true
}

/* ------------------------------------------------------------------ hooks */

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

function useInView(ref: React.RefObject<Element | null>, margin = "0px 0px -10% 0px") {
  const [seen, setSeen] = React.useState(false)
  React.useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true)
      return
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true)
          io.disconnect()
        }
      },
      { rootMargin: margin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [ref, seen, margin])
  return seen
}

/* ------------------------------------------------------------------ pictures */

const fieldBackground = (colors: string[]) =>
  "radial-gradient(80% 90% at 40% 45%, " + colors[3] + "66, transparent 60%), linear-gradient(170deg, " + colors[0] + ", " + colors[2] + " 55%, " + colors[4] + ")"

function FieldCanvas({
  field,
  salt,
  mode = 0,
  live = false,
  track = false,
  className,
  children,
}: {
  field?: LxField
  salt: string
  mode?: number
  live?: boolean
  /** Follow the pointer over the parent, and spin up on press. */
  track?: boolean
  className?: string
  children?: React.ReactNode
}) {
  const ref = React.useRef(null as HTMLCanvasElement | null)
  const reduced = useReducedMotion()
  const [failed, setFailed] = React.useState(false)
  const f = resolveField(field, salt)
  const key = f.colors.join(",") + "|" + f.seed + "|" + f.angle
  const st = React.useRef({ ptr: [0, 0] as [number, number], tgt: [0, 0] as [number, number], time: (f.seed * 3.7) % 10, boost: 0 })

  React.useEffect(() => {
    const cv = ref.current
    const host = cv?.parentElement
    if (!cv || !host) return
    const s = st.current
    const colors = f.colors.flatMap((c) => hexToRgb(c))
    let raf = 0
    let visible = false
    let dirty = true
    let last = performance.now()
    const loop = () => {
      raf = 0
      if (!visible) return
      const now = performance.now()
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const animate = live && !reduced
      s.boost *= Math.exp(-dt * 1.8)
      if (s.boost < 0.01) s.boost = 0
      if (animate || s.boost) s.time += dt * (1 + s.boost * 7)
      const ex = s.tgt[0] - s.ptr[0]
      const ey = s.tgt[1] - s.ptr[1]
      const moving = Math.abs(ex) + Math.abs(ey) > 0.002
      if (moving) {
        const k = reduced ? 1 : Math.min(1, dt * 3.5)
        s.ptr = [s.ptr[0] + ex * k, s.ptr[1] + ey * k]
      }
      if (animate || moving || s.boost || dirty) {
        dirty = false
        if (!paintField(cv, { mode, colors, seed: f.seed, angle: f.angle, time: s.time, ptr: s.ptr })) {
          setFailed(true)
          return
        }
      }
      if (animate || moving || s.boost) raf = requestAnimationFrame(loop)
    }
    const kick = () => {
      if (!raf && visible) {
        last = performance.now()
        raf = requestAnimationFrame(loop)
      }
    }
    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting
        if (visible) kick()
      },
      { rootMargin: "120px" },
    )
    io.observe(cv)
    const ro = new ResizeObserver(() => {
      dirty = true
      kick()
    })
    ro.observe(cv)
    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect()
      s.tgt = [clamp(((e.clientX - r.left) / r.width - 0.5) * 2, -1, 1), clamp(-((e.clientY - r.top) / r.height - 0.5) * 2, -1, 1)]
      kick()
    }
    const onLeave = () => {
      s.tgt = [0, 0]
      kick()
    }
    const onDown = () => {
      if (reduced) return
      s.boost = Math.min(2.5, s.boost + 1.4)
      kick()
    }
    if (track) {
      host.addEventListener("pointermove", onMove)
      host.addEventListener("pointerleave", onLeave)
      host.addEventListener("pointerdown", onDown)
    }
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
      host.removeEventListener("pointermove", onMove)
      host.removeEventListener("pointerleave", onLeave)
      host.removeEventListener("pointerdown", onDown)
    }
    // key carries every input of f
  }, [key, mode, live, track, reduced])

  return (
    <div className={"lx-field" + (className ? " " + className : "")} style={{ background: mode === 1 ? "#0d0f11" : fieldBackground(f.colors) }}>
      {failed ? null : <canvas ref={ref} aria-hidden="true" />}
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ marks */

function DotMark({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg className={"lx-dots" + (className ? " " + className : "")} width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="2.4" r="1.5" />
      <circle cx="13.6" cy="8" r="1.5" />
      <circle cx="8" cy="13.6" r="1.5" />
      <circle cx="2.4" cy="8" r="1.5" />
      <circle className="lx-dots-c" cx="8" cy="8" r="1.1" />
    </svg>
  )
}

// Six geometric client marks, all on a 24 grid in currentColor.
function ClientMark({ variant, size = 22 }: { variant: number; size?: number }) {
  const v = ((variant % 6) + 6) % 6
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {v === 0 ? (
        <>
          <rect x="2" y="9.2" width="20" height="5.6" rx="2.8" transform="rotate(45 12 12)" />
          <rect x="2" y="9.2" width="9" height="5.6" rx="2.8" transform="rotate(-45 12 12)" />
          <rect x="13" y="9.2" width="9" height="5.6" rx="2.8" transform="rotate(-45 12 12)" />
        </>
      ) : v === 1 ? (
        <path d="M12 1.5c1.2 4.6 2.4 6.6 6 7.6l4.5 1.1v3.6L18 14.9c-3.6 1-4.8 3-6 7.6-1.2-4.6-2.4-6.6-6-7.6l-4.5-1.1v-3.6L6 9.1c3.6-1 4.8-3 6-7.6Z" />
      ) : v === 2 ? (
        <path d="M3 3h12l6 6v12H9l-6-6V3Zm6 6v6h6V9H9Z" fillRule="evenodd" />
      ) : v === 3 ? (
        <>
          <path d="M11 2a9 9 0 0 0-9 9h9V2Z" />
          <path d="M13 2a9 9 0 0 1 9 9h-9V2Z" opacity=".75" />
          <path d="M2 13a9 9 0 0 0 9 9v-9H2Z" opacity=".75" />
          <path d="M13 13h9a9 9 0 0 1-9 9v-9Z" />
        </>
      ) : v === 4 ? (
        <path d="M12 2a10 10 0 1 0 9.4 13.4h-4.6A6 6 0 1 1 12 6V2Zm2 0v8h8A10 10 0 0 0 14 2Z" />
      ) : (
        <>
          <path d="M3 8.5 12 3l9 5.5-3.2 2L12 7 6.2 10.5 3 8.5Z" />
          <path d="M3 13.5 12 8l9 5.5-3.2 2L12 12l-5.8 3.5L3 13.5Z" opacity=".8" />
          <path d="M3 18.5 12 13l9 5.5L12 24 3 18.5Z" opacity=".6" />
        </>
      )}
    </svg>
  )
}

// A seeded abstract portrait: soft backdrop, head and shoulders.
function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const h = hashStr(name)
  const hues = [18, 200, 140, 330, 40, 260]
  const hue = hues[h % hues.length]
  const skin = ["#e8c4a6", "#c99674", "#8d5a3c", "#f0d5c0", "#b07a56"][(h >> 3) % 5]
  const hair = ["#2a1d17", "#5a3b25", "#1c1c1f", "#a8774a", "#d9c29a"][(h >> 6) % 5]
  const gid = "lx-av-" + (h % 100000)
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className="lx-avatar" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={"hsl(" + hue + " 45% 72%)"} />
          <stop offset="1" stopColor={"hsl(" + ((hue + 40) % 360) + " 40% 38%)"} />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="16" fill={"url(#" + gid + ")"} />
      <path d="M5 32c1.4-6.4 5.6-9.4 11-9.4S25.6 25.6 27 32Z" fill={"hsl(" + ((hue + 180) % 360) + " 18% 22%)"} />
      <ellipse cx="16" cy="14.6" rx="5.4" ry="6.2" fill={skin} />
      <path d={(h & 1) === 0 ? "M10.4 14c-.4-5 2.4-7.6 5.8-7.6 3.6 0 6 2.6 5.4 7.4-1.2-2.6-3.2-3.8-5.8-3.8-2.4 0-4.2 1.4-5.4 4Z" : "M9.8 17c-1.6-6.6 1.6-10.6 6.2-10.6s7.6 3.6 6.4 10.6c-.6-3.8-2.6-6.2-6.4-6.2s-5.6 2.4-6.2 6.2Z"} fill={hair} />
    </svg>
  )
}

function Social({ kind }: { kind: "x" | "instagram" | "meta" | "linkedin" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {kind === "x" ? (
        <>
          <path d="M4 4l16 16" />
          <path d="M20 4L4 20" />
        </>
      ) : kind === "instagram" ? (
        <>
          <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.2" cy="6.8" r=".6" fill="currentColor" />
        </>
      ) : kind === "meta" ? (
        <path d="M3 15.2c0-4 2-7.7 4.6-7.7 3.8 0 5.6 9 9 9 1.9 0 3.4-1.6 3.4-4 0-3.4-1.6-5-3.2-5-3 0-4.9 4.9-6.4 7.5-1.3 2.1-2.4 3.1-4 3.1C4.4 18.1 3 17 3 15.2Z" />
      ) : (
        <>
          <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
          <path d="M8 10.5v6M8 7.5v.01M12 16.5v-3.5a2.5 2.5 0 0 1 5 0v3.5M12 10.5v6" />
        </>
      )}
    </svg>
  )
}

function Arrow({ dir = "right", size = 14 }: { dir?: "right" | "left" | "up" | "down"; size?: number }) {
  const rot = dir === "left" ? 180 : dir === "up" ? -90 : dir === "down" ? 90 : 0
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: "rotate(" + rot + "deg)" }} aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  )
}

/* ------------------------------------------------------------------ small parts */

function Lines({ text }: { text: string }) {
  const parts = text.split("\n")
  return (
    <>
      {parts.map((p, i) => (
        <React.Fragment key={i}>
          {p}
          {i < parts.length - 1 ? <br /> : null}
        </React.Fragment>
      ))}
    </>
  )
}

function CountUp({ stat, start }: { stat: LxStat; start: boolean }) {
  const reduced = useReducedMotion()
  const [t, setT] = React.useState(0)
  React.useEffect(() => {
    if (!start) return
    if (reduced) {
      setT(1)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const tick = () => {
      const p = (performance.now() - t0) / 1600
      setT(Math.min(1, p))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [start, reduced])
  const d = stat.decimals ?? 0
  return (
    <span className="lx-num" aria-label={(stat.prefix ?? "") + formatStat(stat.value, d) + (stat.suffix ?? "")}>
      <span aria-hidden="true">
        {stat.prefix}
        {formatStat(countValue(stat.value, t, d), d)}
        {stat.suffix}
      </span>
    </span>
  )
}

function Stats({ stats, className }: { stats: LxStat[]; className?: string }) {
  const ref = React.useRef(null as HTMLDivElement | null)
  const seen = useInView(ref)
  return (
    <div ref={ref} className={"lx-stats" + (className ? " " + className : "")}>
      {stats.map((s, i) => (
        <div key={i} className="lx-stat lx-rv">
          <CountUp stat={s} start={seen} />
          <p>{s.label}</p>
        </div>
      ))}
    </div>
  )
}

function Pill({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return <span className={"lx-pill" + (dark ? " lx-pill-dark" : "")}>{children}</span>
}

function ClientLockup({ name, mark, serif, size = 22 }: { name: string; mark?: number; serif?: boolean; size?: number }) {
  return (
    <span className={"lx-lockup" + (serif ? " lx-lockup-serif" : "")} style={{ fontSize: size }}>
      <ClientMark variant={mark ?? hashStr(name)} size={Math.round(size * 1.05)} />
      <span>{name}</span>
    </span>
  )
}

/* ------------------------------------------------------------------ booking */

const TIMES = ["09:30", "11:00", "14:00", "16:30"]

function BookDialog({ open, onClose, onBook, brand }: { open: boolean; onClose: () => void; onBook?: LongExposureAgencyTemplateProps["onBook"]; brand: string }) {
  const days = React.useMemo(() => nextWeekdays(new Date(), 5), [open])
  const [day, setDay] = React.useState(0)
  const [time, setTime] = React.useState("")
  const [form, setForm] = React.useState({ name: "", email: "", company: "", message: "" })
  const [errors, setErrors] = React.useState({} as Record<string, string>)
  const [status, setStatus] = React.useState("idle" as "idle" | "sending" | "error" | "done")
  const panel = React.useRef(null as HTMLDivElement | null)
  const firstField = React.useRef(null as HTMLInputElement | null)

  React.useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const html = document.documentElement
    const overflow = html.style.overflow
    html.style.overflow = "hidden"
    const id = window.setTimeout(() => firstField.current?.focus(), 60)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "Tab" && panel.current) {
        const els = panel.current.querySelectorAll("button:not([disabled]),input,textarea") as NodeListOf<HTMLElement>
        if (!els.length) return
        const first = els[0]
        const lastEl = els[els.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          lastEl.focus()
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener("keydown", onKey)
    return () => {
      window.clearTimeout(id)
      document.removeEventListener("keydown", onKey)
      html.style.overflow = overflow
      prev?.focus?.()
    }
  }, [open, onClose])

  React.useEffect(() => {
    if (open) return
    const id = window.setTimeout(() => {
      setStatus("idle")
      setErrors({})
      setTime("")
    }, 300)
    return () => window.clearTimeout(id)
  }, [open])

  if (!open) return null
  const dk = dayKey(days[day])
  const fmtDay = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short" })
  const fmtLong = (d: Date) => d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = "Tell us who we're talking to."
    if (!isEmail(form.email)) errs.email = "That email doesn't look right."
    if (!time) errs.time = "Pick a time that works."
    setErrors(errs)
    if (Object.keys(errs).length) return
    setStatus("sending")
    const booking: LxBooking = { name: form.name.trim(), email: form.email.trim(), company: form.company.trim(), message: form.message.trim(), date: dk, time }
    try {
      const res = onBook ? await onBook(booking) : await new Promise((r) => setTimeout(r, 900))
      setStatus(res === false ? "error" : "done")
    } catch {
      setStatus("error")
    }
  }

  return (
    <div className="lx-modal" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panel} className="lx-dialog" role="dialog" aria-modal="true" aria-labelledby="lx-book-title">
        <button type="button" className="lx-x" onClick={onClose} aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
            <path d="M2 2l10 10M12 2L2 12" />
          </svg>
        </button>
        {status === "done" ? (
          <div className="lx-done">
            <div className="lx-done-mark">
              <DotMark size={28} />
            </div>
            <h3 id="lx-book-title" className="lx-serif">You're booked.</h3>
            <p>
              {fmtLong(days[day])} at {time}. A calendar invite is on its way to <b>{form.email.trim()}</b>.
            </p>
            <button type="button" className="lx-btn" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <Pill>Free 30-minute call</Pill>
            <h3 id="lx-book-title" className="lx-serif">Let's find your hours.</h3>
            <p className="lx-dialog-sub">Talk to an automation lead at {brand}. No slides, no pitch — just where your week goes.</p>
            <div className="lx-days" role="radiogroup" aria-label="Day">
              {days.map((d, i) => (
                <button
                  key={dayKey(d)}
                  type="button"
                  role="radio"
                  aria-checked={i === day}
                  className="lx-day"
                  data-on={i === day}
                  onClick={() => {
                    setDay(i)
                    setTime("")
                  }}
                >
                  <span>{fmtDay(d)}</span>
                  <b>{d.getDate()}</b>
                </button>
              ))}
            </div>
            <div className="lx-times" role="radiogroup" aria-label="Time">
              {TIMES.map((t) => {
                const taken = slotTaken(dk, t)
                return (
                  <button key={t} type="button" role="radio" aria-checked={time === t} disabled={taken} className="lx-time" data-on={time === t} onClick={() => setTime(t)}>
                    {t}
                  </button>
                )
              })}
            </div>
            {errors.time ? <p className="lx-err">{errors.time}</p> : null}
            <div className="lx-fields">
              <label>
                <span>Name</span>
                <input ref={firstField} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-invalid={!!errors.name} placeholder="Ada Lovelace" autoComplete="name" />
                {errors.name ? <em className="lx-err">{errors.name}</em> : null}
              </label>
              <label>
                <span>Work email</span>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} aria-invalid={!!errors.email} placeholder="ada@company.com" autoComplete="email" />
                {errors.email ? <em className="lx-err">{errors.email}</em> : null}
              </label>
              <label className="lx-span2">
                <span>Company</span>
                <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Optional" autoComplete="organization" />
              </label>
              <label className="lx-span2">
                <span>What eats most of your week?</span>
                <textarea rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Copying orders between three tools…" />
              </label>
            </div>
            {status === "error" ? <p className="lx-err">Something went wrong sending that. Try again?</p> : null}
            <div className="lx-dialog-foot">
              <span>{time ? fmtLong(days[day]) + " · " + time : "No time picked yet"}</span>
              <button type="submit" className="lx-btn" disabled={status === "sending"} data-busy={status === "sending"}>
                {status === "sending" ? "Booking…" : "Book the call"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ sections */

type Go = (href: string | undefined, e?: React.MouseEvent) => void

function NavLink({ link, go, className, current }: { link: LxLink; go: Go; className?: string; current?: boolean }) {
  return (
    <a href={link.href ?? "#"} className={className} aria-current={current ? "page" : undefined} onClick={(e) => go(link.href, e)}>
      {link.label}
    </a>
  )
}

function Brand({ name, go }: { name: string; go: Go }) {
  return (
    <a href="#home" className="lx-brand" onClick={(e) => go("#home", e)} aria-label={name + " home"}>
      <DotMark size={15} />
      <span className="lx-serif">{name}</span>
    </a>
  )
}

function CaseCard({ c, go, index }: { c: LxCase; go: Go; index: number }) {
  const [hot, setHot] = React.useState(false)
  return (
    <a
      href={"#case:" + c.id}
      className="lx-case lx-rv"
      style={{ animationDelay: (index % 2) * 70 + "ms" }}
      onClick={(e) => go("#case:" + c.id, e)}
      onPointerEnter={() => setHot(true)}
      onPointerLeave={() => setHot(false)}
      onFocus={() => setHot(true)}
      onBlur={() => setHot(false)}
    >
      <FieldCanvas field={c.field} salt={c.id} live={hot} track className="lx-case-img">
        <span className="lx-case-tag">{c.industry}</span>
        <span className="lx-case-logo">
          <ClientLockup name={c.name} mark={c.mark} serif={c.serif} size={26} />
        </span>
      </FieldCanvas>
      <span className="lx-case-text">
        <span className="lx-case-sum">{c.summary}</span>
        <span className="lx-case-foot">
          <span>
            Read full case study <Arrow size={12} />
          </span>
          <DotMark size={14} />
        </span>
      </span>
    </a>
  )
}

function Hero({ hero, word, go }: { hero: NonNullable<LongExposureAgencyTemplateProps["hero"]>; word: string; go: Go }) {
  const people = ["Maya Lindqvist", "Arjun Mehta", "Sofia Brandt"]
  return (
    <section className="lx-hero">
      <h1 className="lx-h1 lx-serif lx-in">
        <Lines text={hero.title ?? ""} />
      </h1>
      <p className="lx-lede lx-in" style={{ animationDelay: "80ms" }}>
        {hero.subtitle}
      </p>
      <div className="lx-actions lx-in" style={{ animationDelay: "140ms" }}>
        {hero.primary ? (
          <a href={hero.primary.href} className="lx-btn" onClick={(e) => go(hero.primary?.href, e)}>
            {hero.primary.label}
          </a>
        ) : null}
        {hero.secondary ? (
          <a href={hero.secondary.href} className="lx-btn lx-btn-soft" onClick={(e) => go(hero.secondary?.href, e)}>
            {hero.secondary.label}
          </a>
        ) : null}
      </div>
      <FieldCanvas mode={1} salt="prism" field="noir" live track className="lx-hero-vis lx-in">
        <span className="lx-hero-word lx-serif" aria-hidden="true">
          {word}
        </span>
        {hero.badge ? (
          <span className="lx-glass lx-hero-badge">
            <DotMark size={16} />
            <span>
              <b>{hero.badge.title}</b>
              <small>{hero.badge.text}</small>
            </span>
          </span>
        ) : null}
        {hero.trust ? (
          <span className="lx-glass lx-hero-trust">
            <span className="lx-faces">
              {people.map((p) => (
                <Avatar key={p} name={p} size={26} />
              ))}
            </span>
            <span>
              <span className="lx-stars" aria-label="Rated 5 out of 5">
                ★★★★★
              </span>
              <small>{hero.trust}</small>
            </span>
            <DotMark size={16} />
          </span>
        ) : null}
        <span className="lx-hero-hint" aria-hidden="true">
          Click to spin the light
        </span>
      </FieldCanvas>
    </section>
  )
}

function Marquee({ title, clients, cases }: { title: string; clients: string[]; cases: LxCase[] }) {
  const row = clients.map((c, i) => {
    const k = cases.find((x) => x.name === c)
    return <ClientLockup key={i} name={c} mark={k ? k.mark : i} serif={k ? k.serif : i % 3 === 1} size={22} />
  })
  return (
    <section className="lx-clients" data-lx-sec="clients">
      <p className="lx-clients-title lx-rv">{title}</p>
      <div className="lx-marquee" aria-label={"Clients: " + clients.join(", ")}>
        <div className="lx-marquee-track" aria-hidden="true">
          <div className="lx-marquee-set">{row}</div>
          <div className="lx-marquee-set">{row}</div>
        </div>
      </div>
    </section>
  )
}

function Head({ kicker, title, sub, align = "center" }: { kicker?: string; title: string; sub?: string; align?: "center" | "left" }) {
  return (
    <div className={"lx-head lx-rv" + (align === "left" ? " lx-head-left" : "")}>
      {kicker ? <Pill>{kicker}</Pill> : null}
      <h2 className="lx-h2 lx-serif">
        <Lines text={title} />
      </h2>
      {sub ? <p className="lx-lede">{sub}</p> : null}
    </div>
  )
}

function Flow({ nodes, k }: { nodes: string[]; k: number }) {
  return (
    <div className="lx-flow" key={k}>
      {nodes.map((n, i) => (
        <React.Fragment key={n + i}>
          <span className="lx-node" style={{ animationDelay: i * 90 + "ms" }}>
            <i />
            {n}
          </span>
          {i < nodes.length - 1 ? (
            <span className="lx-wire" style={{ animationDelay: i * 0.45 + "s" }}>
              <b />
            </span>
          ) : null}
        </React.Fragment>
      ))}
    </div>
  )
}

function Services({ kicker, title, items }: { kicker: string; title: string; items: LxService[] }) {
  const [active, setActive] = React.useState(0)
  const tabs = React.useRef([] as (HTMLButtonElement | null)[])
  const s = items[active] ?? items[0]
  if (!s) return null
  const onKey = (e: React.KeyboardEvent) => {
    const dir = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0
    if (!dir) return
    e.preventDefault()
    const n = nextIndex(active, dir, items.length)
    setActive(n)
    tabs.current[n]?.focus()
  }
  return (
    <section className="lx-section" data-lx-sec="services">
      <Head kicker={kicker} title={title} />
      <div className="lx-svc lx-rv">
        <div className="lx-svc-tabs" role="tablist" aria-label="Services" aria-orientation="vertical" onKeyDown={onKey}>
          {items.map((it, i) => (
            <button
              key={it.title}
              ref={(el) => {
                tabs.current[i] = el
              }}
              type="button"
              role="tab"
              aria-selected={i === active}
              tabIndex={i === active ? 0 : -1}
              className="lx-svc-tab"
              onClick={() => setActive(i)}
            >
              <span className="lx-svc-n">{String(i + 1).padStart(2, "0")}</span>
              <span className="lx-svc-t">
                <b>{it.title}</b>
                <small>
                  <span>{it.description}</span>
                </small>
              </span>
              <Arrow size={13} />
            </button>
          ))}
        </div>
        <div className="lx-svc-panel" role="tabpanel" aria-label={s.title}>
          <FieldCanvas field={s.field} salt={"svc" + s.title} live track className="lx-svc-img">
            <Flow nodes={s.flow} k={active} />
            {s.metric ? <span className="lx-glass lx-svc-metric">{s.metric}</span> : null}
          </FieldCanvas>
          <ul className="lx-svc-points" key={active}>
            {s.points.map((p, i) => (
              <li key={p} style={{ animationDelay: i * 60 + "ms" }}>
                <DotMark size={12} />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

function Process({ kicker, title, steps, go }: { kicker: string; title: string; steps: LxStep[]; go: Go }) {
  const ref = React.useRef(null as HTMLDivElement | null)
  const seen = useInView(ref)
  const reduced = useReducedMotion()
  const [active, setActive] = React.useState(0)
  const [auto, setAuto] = React.useState(true)
  const total = Math.max(1, ...steps.map((s) => s.days[1]))
  React.useEffect(() => {
    if (!seen || !auto || reduced || steps.length < 2) return
    const id = window.setInterval(() => setActive((a) => nextIndex(a, 1, steps.length)), 4800)
    return () => window.clearInterval(id)
  }, [seen, auto, reduced, steps.length])
  const s = steps[active]
  if (!s) return null
  const pick = (i: number) => {
    setAuto(false)
    setActive(i)
  }
  const scrub = (e: React.PointerEvent) => {
    if (e.type === "pointermove" && !(e.buttons & 1)) return
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const day = Math.round(clamp((e.clientX - r.left) / r.width, 0, 1) * (total - 1)) + 1
    pick(stepAt(steps.map((x) => x.days), day))
  }
  return (
    <section className="lx-section" data-lx-sec="process">
      <Head kicker={kicker} title={title} />
      <div ref={ref} className="lx-proc lx-rv">
        <div className="lx-steps">
          {steps.map((st, i) => (
            <button key={st.title} type="button" className="lx-step" data-on={i === active} aria-pressed={i === active} onClick={() => pick(i)}>
              <span className="lx-step-days">{st.days[0] === st.days[1] ? "Day " + st.days[0] : "Days " + st.days[0] + "–" + st.days[1]}</span>
              <b className="lx-serif">{st.title}</b>
              <span className="lx-step-bar">
                <i data-run={i === active && auto && seen && !reduced} />
              </span>
            </button>
          ))}
        </div>
        <div className="lx-proc-panel" key={active}>
          <div className="lx-proc-copy">
            <span className="lx-proc-n lx-serif">{String(active + 1).padStart(2, "0")}</span>
            <p className="lx-proc-lead lx-serif">{s.description}</p>
            <ul>
              {s.deliverables.map((d) => (
                <li key={d}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2.5 7.5l3 3 6-7" />
                  </svg>
                  {d}
                </li>
              ))}
            </ul>
          </div>
          <div className="lx-timeline">
            <div className="lx-tl-top">
              <span>Day 1</span>
              <span>Day {total}</span>
            </div>
            <div className="lx-tl" onPointerDown={scrub} onPointerMove={scrub} role="presentation" title="Drag along the timeline">
              {steps.map((st, i) => (
                <span
                  key={st.title}
                  className="lx-tl-seg"
                  data-on={i === active}
                  data-done={i < active}
                  style={{ left: ((st.days[0] - 1) / total) * 100 + "%", width: ((st.days[1] - st.days[0] + 1) / total) * 100 + "%" }}
                />
              ))}
            </div>
            <a href="#book" className="lx-link" onClick={(e) => go("#book", e)}>
              Start with the free call <Arrow size={12} />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

function Testimonials({ items }: { items: LxQuote[] }) {
  const [i, setI] = React.useState(0)
  const q = items[i]
  if (!q) return null
  return (
    <section className="lx-section lx-quotes" data-lx-sec="testimonials">
      <div className="lx-quote lx-rv">
        <DotMark size={18} />
        <blockquote className="lx-serif" key={i}>
          “{q.text}”
        </blockquote>
        <div className="lx-quote-by">
          <Avatar name={q.name} size={36} />
          <span>
            <b>{q.name}</b>
            <small>{q.role}</small>
          </span>
        </div>
        {items.length > 1 ? (
          <div className="lx-quote-nav">
            <button type="button" className="lx-round" aria-label="Previous quote" onClick={() => setI(nextIndex(i, -1, items.length))}>
              <Arrow dir="left" size={13} />
            </button>
            <span className="lx-dots-row">
              {items.map((_, k) => (
                <button key={k} type="button" aria-label={"Quote " + (k + 1)} data-on={k === i} onClick={() => setI(k)} />
              ))}
            </span>
            <button type="button" className="lx-round" aria-label="Next quote" onClick={() => setI(nextIndex(i, 1, items.length))}>
              <Arrow size={13} />
            </button>
          </div>
        ) : null}
      </div>
    </section>
  )
}

function Insights({ kicker, title, items, go }: { kicker: string; title: string; items: LxInsight[]; go: Go }) {
  return (
    <section className="lx-section" data-lx-sec="insights">
      <Head kicker={kicker} title={title} />
      <div className="lx-ins">
        {items.map((it, i) => (
          <a key={it.title} href={it.href ?? "#"} className="lx-ins-card lx-rv" style={{ animationDelay: i * 70 + "ms" }} onClick={(e) => go(it.href, e)}>
            <FieldCanvas field={it.field} salt={"ins" + it.title} className="lx-ins-img">
              <span className="lx-case-tag">{it.category}</span>
            </FieldCanvas>
            <b className="lx-serif">{it.title}</b>
            <span className="lx-ins-meta">
              {it.read}
              <Arrow size={12} />
            </span>
          </a>
        ))}
      </div>
    </section>
  )
}

function Faq({ kicker, title, items }: { kicker: string; title: string; items: LxFaq[] }) {
  const [open, setOpen] = React.useState(0)
  const base = React.useId()
  return (
    <section className="lx-section" data-lx-sec="faq">
      <Head kicker={kicker} title={title} />
      <div className="lx-faq lx-rv">
        {items.map((f, i) => {
          const on = open === i
          return (
            <div key={f.question} className="lx-faq-item" data-on={on}>
              <h3>
                <button type="button" id={base + "q" + i} aria-expanded={on} aria-controls={base + "a" + i} onClick={() => setOpen(on ? -1 : i)}>
                  <span>{f.question}</span>
                  <i aria-hidden="true" />
                </button>
              </h3>
              <div id={base + "a" + i} role="region" aria-labelledby={base + "q" + i} className="lx-faq-a">
                <div>
                  <p>{f.answer}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function CtaBand({ cta, go }: { cta: NonNullable<LongExposureAgencyTemplateProps["cta"]>; go: Go }) {
  return (
    <section className="lx-cta-wrap" data-lx-sec="contact">
      <FieldCanvas field={cta.field ?? "noir"} salt="cta" live track className="lx-cta lx-rv">
        <div className="lx-cta-in">
          <h2 className="lx-serif">
            <Lines text={cta.title ?? ""} />
          </h2>
          {cta.subtitle ? <p>{cta.subtitle}</p> : null}
          {cta.action ? (
            <a href={cta.action.href} className="lx-btn lx-btn-light" onClick={(e) => go(cta.action?.href, e)}>
              {cta.action.label}
            </a>
          ) : null}
          {cta.note ? <small>{cta.note}</small> : null}
        </div>
      </FieldCanvas>
    </section>
  )
}

function Footer({ brand, footer, go, theme, setTheme }: { brand: string; footer: NonNullable<LongExposureAgencyTemplateProps["footer"]>; go: Go; theme: Theme; setTheme: (t: Theme) => void }) {
  return (
    <footer className="lx-footer">
      <div className="lx-foot-top">
        <div className="lx-foot-brand">
          <Brand name={brand} go={go} />
          <p>
            <Lines text={footer.tagline ?? ""} />
          </p>
          <div className="lx-socials">
            {(footer.socials ?? []).map((s) => (
              <a key={s.kind} href={s.href ?? "#"} aria-label={s.kind} onClick={(e) => go(s.href, e)}>
                <Social kind={s.kind} />
              </a>
            ))}
          </div>
        </div>
        {(footer.columns ?? []).map((col) => (
          <nav key={col.title} className="lx-foot-col" aria-label={col.title}>
            <p className="lx-serif">{col.title}</p>
            {col.links.map((l) => (
              <NavLink key={l.label} link={l} go={go} />
            ))}
          </nav>
        ))}
      </div>
      <div className="lx-foot-bottom">
        <span>{footer.copyright}</span>
        <button type="button" className="lx-theme" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={"Switch to " + (theme === "dark" ? "light" : "dark") + " theme"}>
          <i data-on={theme === "light"}>Light</i>
          <i data-on={theme === "dark"}>Dark</i>
        </button>
        {footer.credit ? (
          <span className="lx-credit">
            {footer.credit.label}
            <a href={footer.credit.href ?? "#"} onClick={(e) => go(footer.credit?.href, e)}>
              <Avatar name={footer.credit.name} size={22} />
              {footer.credit.name}
            </a>
          </span>
        ) : null}
      </div>
    </footer>
  )
}

function CasesPage({ title, subtitle, cases, pageSize, go, primary, secondary }: { title: string; subtitle: string; cases: LxCase[]; pageSize: number; go: Go; primary?: LxLink; secondary?: LxLink }) {
  const [shown, setShown] = React.useState(pageSize)
  const [filter, setFilter] = React.useState("All")
  const industries = ["All", ...Array.from(new Set(cases.map((c) => c.industry)))]
  const list = filter === "All" ? cases : cases.filter((c) => c.industry === filter)
  const visible = list.slice(0, shown)
  return (
    <>
      <section className="lx-hero lx-hero-cases">
        <h1 className="lx-h1 lx-serif lx-in">
          <Lines text={title} />
        </h1>
        <p className="lx-lede lx-in" style={{ animationDelay: "80ms" }}>
          {subtitle}
        </p>
        <div className="lx-actions lx-in" style={{ animationDelay: "140ms" }}>
          {primary ? (
            <a href={primary.href} className="lx-btn" onClick={(e) => go(primary.href, e)}>
              {primary.label}
            </a>
          ) : null}
          {secondary ? (
            <a href={secondary.href} className="lx-btn lx-btn-soft" onClick={(e) => go(secondary.href, e)}>
              {secondary.label}
            </a>
          ) : null}
        </div>
      </section>
      {industries.length > 2 ? (
        <div className="lx-filters lx-in" style={{ animationDelay: "180ms" }} role="group" aria-label="Filter by industry">
          {industries.map((ind) => (
            <button
              key={ind}
              type="button"
              aria-pressed={filter === ind}
              data-on={filter === ind}
              onClick={() => {
                setFilter(ind)
                setShown(pageSize)
              }}
            >
              {ind}
            </button>
          ))}
        </div>
      ) : null}
      <div className="lx-cases">
        {visible.map((c, i) => (
          <CaseCard key={c.id} c={c} go={go} index={i} />
        ))}
      </div>
      <div className="lx-more">
        {shown < list.length ? (
          <button type="button" className="lx-btn" onClick={() => setShown((n) => n + pageSize)}>
            Load more
          </button>
        ) : list.length > pageSize ? (
          <span className="lx-more-end">That's every story — for now.</span>
        ) : null}
      </div>
    </>
  )
}

function CaseDetail({ c, next, go }: { c: LxCase; next: LxCase; go: Go }) {
  const sections = c.sections ?? []
  return (
    <article className="lx-detail">
      <FieldCanvas field={c.field} salt={c.id} live track className="lx-banner lx-in">
        <button type="button" className="lx-chip-btn lx-banner-back" aria-label="Back to case studies" onClick={() => go("#cases")}>
          <Arrow dir="left" size={14} />
        </button>
        <span className="lx-case-tag lx-banner-tag">{c.industry}</span>
        <div className="lx-banner-copy">
          <h1 className="lx-serif">{c.name}</h1>
          <p>{c.tagline}</p>
        </div>
        <button type="button" className="lx-chip-btn lx-chip-dark lx-banner-next" aria-label={"Next case study: " + next.name} onClick={() => go("#case:" + next.id)}>
          <Arrow size={14} />
        </button>
      </FieldCanvas>
      <div className="lx-prose">
        {sections.map((s) => (
          <section key={s.label} className="lx-prose-sec lx-rv">
            <Pill>{s.label}</Pill>
            <p className="lx-prose-lead lx-serif">{s.lead}</p>
            {s.body ? <p className="lx-prose-body">{s.body}</p> : null}
          </section>
        ))}
        {c.results && c.results.length ? (
          <section className="lx-prose-sec lx-rv">
            <Pill>Results</Pill>
            <Stats stats={c.results} className="lx-stats-3" />
          </section>
        ) : null}
        {c.quote ? (
          <figure className="lx-detail-quote lx-rv">
            <blockquote className="lx-serif">“{c.quote.text}”</blockquote>
            <figcaption>
              <Avatar name={c.quote.name} size={32} />
              <span>
                <b>{c.quote.name}</b>
                <small>{c.quote.role}</small>
              </span>
            </figcaption>
          </figure>
        ) : null}
        {c.stack && c.stack.length ? (
          <section className="lx-prose-sec lx-rv">
            <Pill>Connected</Pill>
            <div className="lx-stack">
              {c.stack.map((s) => (
                <span key={s}>{s}</span>
              ))}
            </div>
          </section>
        ) : null}
      </div>
      {next.id !== c.id ? (
        <a href={"#case:" + next.id} className="lx-next lx-rv" onClick={(e) => go("#case:" + next.id, e)}>
          <span className="lx-next-copy">
            <small>Next case study</small>
            <b className="lx-serif">{next.name}</b>
            <span>{next.summary}</span>
          </span>
          <FieldCanvas field={next.field} salt={next.id} className="lx-next-img">
            <span className="lx-case-logo">
              <ClientLockup name={next.name} mark={next.mark} serif={next.serif} size={20} />
            </span>
          </FieldCanvas>
        </a>
      ) : null}
    </article>
  )
}

function NotFound({ go }: { go: Go }) {
  return (
    <section className="lx-404">
      <FieldCanvas field="glacier" salt="404" live track className="lx-404-img lx-in">
        <span className="lx-serif">404</span>
      </FieldCanvas>
      <h1 className="lx-h2 lx-serif lx-in">This page took the day off.</h1>
      <p className="lx-lede lx-in">Probably automated itself out of a job. Everything else is still here.</p>
      <div className="lx-actions lx-in">
        <a href="#home" className="lx-btn" onClick={(e) => go("#home", e)}>
          Back home
        </a>
        <a href="#cases" className="lx-btn lx-btn-soft" onClick={(e) => go("#cases", e)}>
          See case studies
        </a>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ main */

export default function LongExposureAgencyTemplate({
  brand = "Orrin",
  nav = DEFAULT_NAV,
  navCta = { label: "Book a free call", href: "#book" },
  hero: heroIn,
  clientsTitle = "Companies we have already helped with AI automation",
  clients = DEFAULT_CLIENTS,
  stats = DEFAULT_STATS,
  services: servicesIn,
  process: processIn,
  cases = DEFAULT_CASES,
  casesPage,
  testimonials = DEFAULT_TESTIMONIALS,
  insights: insightsIn,
  faq: faqIn,
  cta: ctaIn,
  footer: footerIn,
  onBook,
  initialPage = "home",
  serif = SERIF,
  sans = SANS,
  ink,
  defaultTheme = "system",
  maxWidth = "1120px",
  height = "100svh",
  className,
}: LongExposureAgencyTemplateProps) {
  const rootRef = React.useRef(null as HTMLDivElement | null)
  const reduced = useReducedMotion()
  const caseIds = cases.map((c) => c.id)
  const [page, setPage] = React.useState(
    (): Page =>
      typeof initialPage === "object"
        ? caseIds.includes(initialPage.case)
          ? { name: "case", id: initialPage.case }
          : { name: "404" }
        : initialPage === "cases"
          ? { name: "cases" }
          : { name: "home" },
  )
  const [pending, setPending] = React.useState(null as { section?: string; top: boolean } | null)
  const [booking, setBooking] = React.useState(false)
  const [menu, setMenu] = React.useState(false)
  const [theme, setThemeState] = React.useState((defaultTheme === "dark" ? "dark" : "light") as Theme)
  const [themeTouched, setThemeTouched] = React.useState(false)

  const hero = {
    title: "Automate your business.\nSave hours every day.",
    subtitle: "We design and deploy AI systems that eliminate manual work, reduce costs, and scale your operations — fast.",
    primary: { label: "Book a free call", href: "#book" },
    secondary: { label: "See how it works", href: "#process" },
    badge: { title: "Automation in 45 days", text: "Clear timeline. Measurable results." },
    trust: "Trusted by 50+ companies",
    ...heroIn,
  }
  const services = { kicker: "What we build", title: "Everything you need.\nNothing you don't.", items: DEFAULT_SERVICES, ...servicesIn }
  const process = { kicker: "How it works", title: "From first call to\nfully automated in 45 days.", steps: DEFAULT_STEPS, ...processIn }
  const insights = { kicker: "Insights", title: "Notes from the\nautomation floor.", items: DEFAULT_INSIGHTS, ...insightsIn }
  const faq = { kicker: "FAQ", title: "Questions, answered.", items: DEFAULT_FAQ, ...faqIn }
  const cta = {
    title: "Start saving time. Start scaling faster.",
    subtitle: "Let's identify where automation can make the biggest impact on your business.",
    action: { label: "Book a free call", href: "#book" },
    note: "No commitment. Just a quick conversation.",
    ...ctaIn,
  }
  const footer = {
    tagline: "Automating workflows.\nDelivering results.",
    columns: [
      { title: "Navigation", links: [{ label: "Home", href: "#home" }, { label: "About", href: "#about" }, { label: "Services", href: "#services" }, { label: "Process", href: "#process" }, { label: "404", href: "#404" }] },
      { title: "Resources", links: [{ label: "Case studies", href: "#cases" }, { label: "How it works", href: "#process" }, { label: "Insights", href: "#insights" }, { label: "FAQ", href: "#faq" }] },
      { title: "Legal", links: [{ label: "Terms of service" }, { label: "Privacy policy" }, { label: "Cookie policy" }, { label: "Cookie settings" }] },
    ],
    socials: [{ kind: "x" as const }, { kind: "instagram" as const }, { kind: "meta" as const }],
    copyright: "© " + new Date().getFullYear() + " " + brand + " Inc. All rights reserved.",
    credit: { label: "Created by", name: "Kedhareswer" },
    ...footerIn,
  }
  const pageSize = Math.max(1, casesPage?.pageSize ?? 4)

  // system theme follows the host's .dark class, then the OS
  React.useEffect(() => {
    if (defaultTheme !== "system" || themeTouched) return
    const html = document.documentElement
    const mq = typeof matchMedia === "function" ? matchMedia("(prefers-color-scheme: dark)") : null
    const read = () => setThemeState(html.classList.contains("dark") || (!html.classList.contains("light") && !!mq?.matches) ? "dark" : "light")
    read()
    const mo = new MutationObserver(read)
    mo.observe(html, { attributes: true, attributeFilter: ["class"] })
    mq?.addEventListener?.("change", read)
    return () => {
      mo.disconnect()
      mq?.removeEventListener?.("change", read)
    }
  }, [defaultTheme, themeTouched])
  const setTheme = (t: Theme) => {
    setThemeTouched(true)
    setThemeState(t)
  }

  const go: Go = (href, e) => {
    const t = parseTarget(href, caseIds)
    if (t.kind === "external") return
    e?.preventDefault()
    setMenu(false)
    if (t.kind === "none") return
    if (t.kind === "book") {
      setBooking(true)
      return
    }
    const same = JSON.stringify(t.page) === JSON.stringify(page)
    if (!same) setPage(t.page)
    setPending({ section: t.section, top: !t.section })
  }

  // after a page switch or an in-page link: land on the section, or the top
  React.useLayoutEffect(() => {
    if (!pending) return
    const root = rootRef.current
    setPending(null)
    if (!root) return
    const target = pending.section ? (root.querySelector('[data-lx-sec="' + pending.section + '"]') as HTMLElement | null) : null
    if (target) {
      const y = target.getBoundingClientRect().top + window.scrollY - 76
      window.scrollTo({ top: y, behavior: reduced ? "auto" : "smooth" })
    } else if (root.getBoundingClientRect().top < 0) {
      window.scrollTo({ top: root.getBoundingClientRect().top + window.scrollY, behavior: "auto" })
    }
  }, [pending, reduced])

  // things below the fold rise in as they arrive; things on screen never hide
  const pageKey = page.name === "case" ? "case:" + page.id : page.name
  React.useEffect(() => {
    const root = rootRef.current
    if (!root || reduced || typeof IntersectionObserver === "undefined") return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          ;(e.target as HTMLElement).dataset.rv = "1"
          io.unobserve(e.target)
        }
      },
      { rootMargin: "0px 0px -6% 0px" },
    )
    const els = root.querySelectorAll(".lx-rv")
    els.forEach((el) => {
      const h = el as HTMLElement
      // a hidden one from an earlier run (StrictMode runs effects twice) is observed again
      if (h.dataset.rv === "1") return
      if (!h.dataset.rv && h.getBoundingClientRect().top < window.innerHeight) return
      h.dataset.rv = "0"
      io.observe(h)
    })
    return () => io.disconnect()
  }, [pageKey, reduced])

  // the mobile menu closes on Escape or a click outside the nav
  React.useEffect(() => {
    if (!menu) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false)
    const onDown = (e: PointerEvent) => {
      const navEl = rootRef.current?.querySelector(".lx-nav")
      if (navEl && !navEl.contains(e.target as Node)) setMenu(false)
    }
    document.addEventListener("keydown", onKey)
    document.addEventListener("pointerdown", onDown)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("pointerdown", onDown)
    }
  }, [menu])

  const current = cases.find((c) => page.name === "case" && c.id === page.id)
  const next = current ? cases[nextIndex(cases.indexOf(current), 1, cases.length)] : undefined
  const navCurrent = (l: LxLink) => {
    const t = parseTarget(l.href, caseIds)
    return t.kind === "page" && !t.section && (t.page.name === page.name || (t.page.name === "cases" && page.name === "case"))
  }

  const vars = {
    minHeight: height,
    "--lx-max": maxWidth,
    "--lx-serif": serif,
    "--lx-sans": sans,
    ...(ink && theme === "light" ? { "--lx-btn": ink, "--lx-ink": ink } : {}),
  } as React.CSSProperties

  return (
    <div ref={rootRef} className={"lx-root" + (className ? " " + className : "")} data-theme={theme} style={vars}>
      <style>{LX_CSS}</style>
      <div className="lx-frame">
        <header className="lx-nav" data-open={menu}>
          <Brand name={brand} go={go} />
          <nav className="lx-links" aria-label="Main">
            {nav.map((l) => (
              <NavLink key={l.label} link={l} go={go} current={navCurrent(l)} />
            ))}
          </nav>
          <div className="lx-nav-end">
            <a href={navCta.href} className="lx-btn lx-btn-sm" onClick={(e) => go(navCta.href, e)}>
              {navCta.label}
            </a>
            <button type="button" className="lx-burger" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
              <i />
              <i />
            </button>
          </div>
          <nav className="lx-drawer" aria-label="Mobile">
            {nav.map((l) => (
              <NavLink key={l.label} link={l} go={go} current={navCurrent(l)} />
            ))}
            <a href={navCta.href} className="lx-btn" onClick={(e) => go(navCta.href, e)}>
              {navCta.label}
            </a>
          </nav>
        </header>

        <main className="lx-main" key={pageKey}>
          {page.name === "home" ? (
            <>
              <Hero hero={hero} word={hero.word ?? brand} go={go} />
              <Marquee title={clientsTitle} clients={clients} cases={cases} />
              <section className="lx-section lx-section-tight" data-lx-sec="about">
                <Stats stats={stats} />
              </section>
              <Services kicker={services.kicker} title={services.title} items={services.items} />
              <Process kicker={process.kicker} title={process.title} steps={process.steps} go={go} />
              {cases.length ? (
                <section className="lx-section" data-lx-sec="work">
                  <Head kicker="Selected work" title={"Real teams.\nReal hours back."} />
                  <div className="lx-cases">
                    {cases.slice(0, 2).map((c, i) => (
                      <CaseCard key={c.id} c={c} go={go} index={i} />
                    ))}
                  </div>
                  <div className="lx-more">
                    <a href="#cases" className="lx-btn lx-btn-soft" onClick={(e) => go("#cases", e)}>
                      All case studies <Arrow size={12} />
                    </a>
                  </div>
                </section>
              ) : null}
              {testimonials.length ? <Testimonials items={testimonials} /> : null}
              {insights.items.length ? <Insights kicker={insights.kicker} title={insights.title} items={insights.items} go={go} /> : null}
              {faq.items.length ? <Faq kicker={faq.kicker} title={faq.title} items={faq.items} /> : null}
            </>
          ) : page.name === "cases" ? (
            <CasesPage
              title={casesPage?.title ?? "Don't take our word for it.\nTake theirs."}
              subtitle={casesPage?.subtitle ?? "The outcomes speak for themselves. Here's exactly what we built, why we built it, and what happened next."}
              cases={cases}
              pageSize={pageSize}
              go={go}
              primary={hero.primary}
              secondary={hero.secondary}
            />
          ) : page.name === "case" && current && next ? (
            <CaseDetail c={current} next={next} go={go} />
          ) : (
            <NotFound go={go} />
          )}
          {page.name !== "404" ? <CtaBand cta={cta} go={go} /> : null}
        </main>

        <Footer brand={brand} footer={footer} go={go} theme={theme} setTheme={setTheme} />
      </div>
      <BookDialog open={booking} onClose={() => setBooking(false)} onBook={onBook} brand={brand} />
    </div>
  )
}

/* ------------------------------------------------------------------ styles */

const LX_CSS = `
.lx-root{--lx-card:#f8fafa;--lx-soft:#eff3f3;--lx-soft2:#e6ecec;--lx-ink:#111618;--lx-ink2:#2a3235;--lx-muted:#5e686c;--lx-faint:#8e979b;--lx-line:rgba(17,22,24,.08);--lx-btn:#121719;--lx-btn-ink:#ffffff;--lx-glass:rgba(24,27,30,.42);--lx-shadow:0 1px 2px rgba(17,22,24,.05),0 8px 24px -12px rgba(17,22,24,.12);position:relative;isolation:isolate;box-sizing:border-box;width:100%;background:var(--lx-card);color:var(--lx-ink);font-family:var(--lx-sans);font-size:15px;line-height:1.5;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;overflow-x:clip;transition:background-color .4s ease,color .4s ease}
.lx-root[data-theme=dark]{--lx-card:#0f1213;--lx-soft:#161a1c;--lx-soft2:#1d2225;--lx-ink:#edf1f2;--lx-ink2:#cdd4d6;--lx-muted:#98a2a6;--lx-faint:#6b7579;--lx-line:rgba(255,255,255,.08);--lx-btn:#eef2f3;--lx-btn-ink:#0e1214;--lx-glass:rgba(10,12,14,.5);--lx-shadow:0 1px 2px rgba(0,0,0,.3),0 10px 30px -12px rgba(0,0,0,.6)}
.lx-root :where(*,*::before,*::after){box-sizing:border-box}
.lx-root :where(h1,h2,h3,p,ul,figure,blockquote){margin:0;padding:0}
.lx-root :where(ul){list-style:none}
.lx-root :where(a){color:inherit;text-decoration:none}
.lx-root :where(button){font:inherit;color:inherit;background:none;border:0;padding:0;margin:0;cursor:pointer}
.lx-root :where(input,textarea){font:inherit;color:inherit}
.lx-root :where(svg,canvas){display:block;max-width:none}
.lx-root :where(a,button,input,textarea):focus-visible{outline:2px solid var(--lx-ink);outline-offset:2px}
.lx-serif{font-family:var(--lx-serif);font-weight:400}
.lx-frame{position:relative;width:100%;container-type:inline-size;container-name:lx;overflow:clip}
.lx-main{display:block;padding:0 max(clamp(16px,6.5cqw,96px),calc((100cqw - var(--lx-max)) / 2))}

/* ---------- nav ---------- */
.lx-nav{position:sticky;top:0;z-index:20;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:16px;padding:22px max(clamp(16px,6.5cqw,96px),calc((100cqw - var(--lx-max)) / 2));background:color-mix(in oklab,var(--lx-card) 82%,transparent);backdrop-filter:blur(14px) saturate(1.2);-webkit-backdrop-filter:blur(14px) saturate(1.2)}
.lx-brand{display:inline-flex;align-items:center;gap:8px;justify-self:start;font-size:24px;line-height:1;letter-spacing:-.02em}
.lx-brand .lx-dots{transition:transform .5s cubic-bezier(.2,.8,.2,1)}
.lx-brand:hover .lx-dots{transform:rotate(45deg)}
.lx-dots{fill:currentColor;flex:none}
.lx-dots circle{transition:transform .35s cubic-bezier(.2,.8,.2,1);transform-origin:8px 8px}
.lx-links{display:flex;gap:30px;font-size:14px;color:var(--lx-ink2)}
.lx-links a{position:relative;padding:4px 0;transition:color .2s}
.lx-links a::after{content:"";position:absolute;left:0;right:0;bottom:-2px;height:1px;background:currentColor;transform:scaleX(0);transform-origin:left;transition:transform .3s cubic-bezier(.2,.8,.2,1)}
.lx-links a:hover::after,.lx-links a[aria-current=page]::after{transform:scaleX(1)}
.lx-links a[aria-current=page]{color:var(--lx-ink)}
.lx-nav-end{justify-self:end;display:flex;align-items:center;gap:10px}
.lx-burger{display:none;width:40px;height:40px;border-radius:10px;background:var(--lx-soft2);position:relative}
.lx-burger i{position:absolute;left:12px;right:12px;height:1.5px;background:var(--lx-ink);border-radius:2px;transition:transform .3s ease,top .3s ease}
.lx-burger i:first-child{top:16px}
.lx-burger i:last-child{top:23px}
.lx-nav[data-open=true] .lx-burger i:first-child{top:19.5px;transform:rotate(45deg)}
.lx-nav[data-open=true] .lx-burger i:last-child{top:19.5px;transform:rotate(-45deg)}
.lx-nav .lx-drawer{display:none}

/* ---------- buttons, pills ---------- */
.lx-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:46px;padding:0 24px;border-radius:12px;background:var(--lx-btn);color:var(--lx-btn-ink);font-size:14px;font-weight:500;letter-spacing:-.005em;white-space:nowrap;box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 1px 2px rgba(0,0,0,.12);transition:transform .25s cubic-bezier(.2,.8,.2,1),opacity .2s,background-color .3s}
.lx-btn:hover{transform:translateY(-1px)}
.lx-btn:active{transform:translateY(0) scale(.98)}
.lx-btn[disabled]{opacity:.6;cursor:progress}
.lx-btn-sm{height:38px;padding:0 18px;font-size:13px;border-radius:10px}
.lx-btn-soft{background:var(--lx-soft2);color:var(--lx-ink);box-shadow:none}
.lx-btn-soft:hover{background:color-mix(in oklab,var(--lx-soft2) 80%,var(--lx-ink) 8%)}
.lx-btn-light{background:#eef1f2;color:#111618;box-shadow:0 6px 24px -8px rgba(0,0,0,.5)}
.lx-pill{display:inline-flex;align-items:center;height:28px;padding:0 12px;border-radius:8px;background:var(--lx-soft2);color:var(--lx-ink2);font-size:12px;letter-spacing:.005em}
.lx-pill-dark{background:#121719;color:#fff}
.lx-link{display:inline-flex;align-items:center;gap:6px;font-size:14px;border-bottom:1px solid var(--lx-line);padding-bottom:2px;transition:gap .25s,border-color .25s}
.lx-link:hover{gap:10px;border-color:var(--lx-ink)}
.lx-glass{position:absolute;display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:14px;background:var(--lx-glass);color:#fff;backdrop-filter:blur(16px) saturate(1.3);-webkit-backdrop-filter:blur(16px) saturate(1.3);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}
.lx-glass .lx-dots{fill:#fff}
.lx-glass b{display:block;font-size:13px;font-weight:500}
.lx-glass small{display:block;font-size:11px;opacity:.65}

/* ---------- hero ---------- */
.lx-hero{display:flex;flex-direction:column;align-items:center;text-align:center;padding-top:clamp(28px,4.5cqw,64px)}
.lx-h1{font-size:clamp(38px,5.4cqw,74px);line-height:1.04;letter-spacing:-.035em;max-width:24ch;text-wrap:balance}
.lx-lede{margin-top:20px;max-width:46ch;color:var(--lx-muted);font-size:clamp(15px,1.35cqw,17px);line-height:1.6}
.lx-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:28px}
.lx-field{position:relative;overflow:hidden;isolation:isolate}
.lx-field>canvas{position:absolute;inset:0;width:100%;height:100%;z-index:-1}
.lx-hero-vis{width:100%;margin-top:clamp(28px,4.5cqw,56px);aspect-ratio:2.09/1;min-height:300px;border-radius:clamp(18px,2.6cqw,32px);color:#fff;cursor:crosshair;touch-action:pan-y}
.lx-hero-word{position:absolute;left:50%;top:50%;transform:translate(-50%,-52%);font-size:clamp(64px,13cqw,180px);line-height:1;letter-spacing:-.04em;color:transparent;-webkit-text-stroke:1px rgba(255,255,255,.55);pointer-events:none;mix-blend-mode:screen;white-space:nowrap}
.lx-hero-badge{left:clamp(10px,1.6cqw,20px);top:clamp(10px,1.6cqw,20px);text-align:left}
.lx-hero-trust{right:clamp(10px,1.6cqw,20px);bottom:clamp(10px,1.6cqw,20px);text-align:left}
.lx-faces{display:flex}
.lx-faces svg{border-radius:50%;box-shadow:0 0 0 2px rgba(30,32,34,.9)}
.lx-faces svg+svg{margin-left:-8px}
.lx-stars{display:block;font-size:11px;letter-spacing:2px;color:#fff}
.lx-hero-hint{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.45);opacity:0;transition:opacity .4s}
.lx-hero-vis:hover .lx-hero-hint{opacity:1}

/* ---------- clients ---------- */
.lx-clients{padding-top:clamp(56px,7cqw,96px);text-align:center}
.lx-clients-title{color:var(--lx-muted);font-size:15px}
.lx-marquee{margin-top:30px;overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 14%,#000 86%,transparent);mask-image:linear-gradient(90deg,transparent,#000 14%,#000 86%,transparent)}
.lx-marquee-track{display:flex;width:max-content;animation:lx-marq 38s linear infinite}
.lx-marquee:hover .lx-marquee-track{animation-play-state:paused}
.lx-marquee-set{display:flex;align-items:center;gap:clamp(36px,5cqw,64px);padding-right:clamp(36px,5cqw,64px)}
.lx-lockup{display:inline-flex;align-items:center;gap:.36em;font-weight:700;letter-spacing:-.03em;line-height:1;white-space:nowrap}
.lx-lockup-serif{font-family:var(--lx-serif);font-weight:400;letter-spacing:-.02em}
.lx-marquee .lx-lockup{color:var(--lx-ink2);opacity:.82;transition:opacity .3s}
.lx-marquee .lx-lockup:hover{opacity:1}
@keyframes lx-marq{to{transform:translateX(-50%)}}

/* ---------- stats ---------- */
.lx-section{padding-top:clamp(72px,10cqw,140px)}
.lx-section-tight{padding-top:clamp(48px,6cqw,88px)}
.lx-stats{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}
.lx-stat{background:var(--lx-soft);border-radius:18px;padding:clamp(28px,4cqw,48px) 24px;text-align:center;transition:background-color .3s}
.lx-stat:hover{background:var(--lx-soft2)}
.lx-num{display:block;font-family:var(--lx-serif);font-size:clamp(38px,4.6cqw,58px);line-height:1;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.lx-stat p{margin-top:12px;color:var(--lx-muted);font-size:14px}
.lx-stats-3{grid-template-columns:repeat(3,1fr);margin-top:18px}
.lx-stats-3 .lx-stat{padding:24px 14px}
.lx-stats-3 .lx-num{font-size:clamp(28px,3.4cqw,40px)}
.lx-stats-3 .lx-stat p{font-size:12.5px}

/* ---------- section heads ---------- */
.lx-head{display:flex;flex-direction:column;align-items:center;text-align:center;margin-bottom:clamp(32px,4.5cqw,56px)}
.lx-head-left{align-items:flex-start;text-align:left}
.lx-h2{margin-top:18px;font-size:clamp(34px,4.6cqw,60px);line-height:1.04;letter-spacing:-.03em}
.lx-head .lx-lede{margin-top:16px}

/* ---------- services ---------- */
.lx-svc{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:6px}
.lx-svc-tabs{display:flex;flex-direction:column;gap:6px}
.lx-svc-tab{display:grid;grid-template-columns:auto 1fr auto;align-items:start;gap:16px;width:100%;padding:20px 22px;border-radius:18px;background:var(--lx-soft);text-align:left;transition:background-color .3s,color .3s}
.lx-svc-tab:hover{background:var(--lx-soft2)}
.lx-svc-tab[aria-selected=true]{background:var(--lx-btn);color:var(--lx-btn-ink)}
.lx-svc-n{font-size:12px;opacity:.55;padding-top:3px;font-variant-numeric:tabular-nums}
.lx-svc-t b{display:block;font-family:var(--lx-serif);font-weight:400;font-size:22px;letter-spacing:-.02em;line-height:1.2}
.lx-svc-t small{display:grid;grid-template-rows:0fr;opacity:0;font-size:13.5px;line-height:1.55;transition:grid-template-rows .45s cubic-bezier(.2,.8,.2,1),opacity .3s,margin .45s;overflow:hidden}
.lx-svc-t small>span{min-height:0;overflow:hidden}
.lx-svc-tab[aria-selected=true] .lx-svc-t small{grid-template-rows:1fr;opacity:.72;margin-top:8px}
.lx-svc-tab>svg{margin-top:6px;opacity:.4;transition:transform .3s,opacity .3s}
.lx-svc-tab[aria-selected=true]>svg{opacity:1;transform:rotate(-45deg)}
.lx-svc-panel{display:flex;flex-direction:column;gap:6px;min-width:0}
.lx-svc-img{flex:1;min-height:300px;border-radius:18px;color:#fff;display:flex;align-items:center;justify-content:center;padding:24px}
.lx-svc-metric{left:16px;bottom:16px;font-size:13px}
.lx-svc-points{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.lx-svc-points li{display:flex;gap:10px;align-items:flex-start;padding:16px;border-radius:14px;background:var(--lx-soft);font-size:13px;line-height:1.45;color:var(--lx-ink2);animation:lx-up .6s cubic-bezier(.2,.8,.2,1) both}
.lx-svc-points .lx-dots{margin-top:3px;opacity:.6}
.lx-flow{display:flex;align-items:center;flex-wrap:wrap;justify-content:center;gap:0;row-gap:10px}
.lx-node{display:inline-flex;align-items:center;gap:8px;height:34px;padding:0 13px;border-radius:10px;background:rgba(14,16,18,.42);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:inset 0 0 0 1px rgba(255,255,255,.14);font-size:12.5px;white-space:nowrap;animation:lx-pop .55s cubic-bezier(.2,.8,.2,1) both}
.lx-node i{width:6px;height:6px;border-radius:50%;background:#fff;box-shadow:0 0 10px #fff}
.lx-wire{position:relative;width:clamp(16px,3cqw,40px);height:1px;background:rgba(255,255,255,.4);overflow:visible}
.lx-wire b{position:absolute;top:-2px;left:0;width:5px;height:5px;border-radius:50%;background:#fff;box-shadow:0 0 8px #fff;animation:lx-run 1.8s linear infinite;animation-delay:inherit}
@keyframes lx-run{0%{left:0;opacity:0}15%{opacity:1}85%{opacity:1}100%{left:100%;opacity:0}}
@keyframes lx-pop{from{opacity:0;transform:translateY(8px) scale(.96)}to{opacity:1;transform:none}}

/* ---------- process ---------- */
.lx-proc{display:flex;flex-direction:column;gap:6px}
.lx-steps{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.lx-step{display:flex;flex-direction:column;align-items:flex-start;gap:6px;padding:18px 18px 16px;border-radius:16px;background:var(--lx-soft);text-align:left;transition:background-color .3s}
.lx-step:hover{background:var(--lx-soft2)}
.lx-step[data-on=true]{background:var(--lx-soft2)}
.lx-step-days{font-size:12px;color:var(--lx-muted)}
.lx-step b{font-size:20px;letter-spacing:-.02em;line-height:1.2}
.lx-step-bar{position:relative;display:block;width:100%;height:2px;margin-top:10px;border-radius:2px;background:var(--lx-line);overflow:hidden}
.lx-step-bar i{position:absolute;inset:0;background:var(--lx-ink);transform:scaleX(0);transform-origin:left}
.lx-step[data-on=true] .lx-step-bar i{transform:scaleX(1)}
.lx-step-bar i[data-run=true]{animation:lx-fill 4.8s linear both}
@keyframes lx-fill{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.lx-proc-panel{display:grid;grid-template-columns:1.15fr 1fr;gap:clamp(24px,4cqw,64px);padding:clamp(24px,4cqw,48px);border-radius:18px;background:var(--lx-soft);animation:lx-fade .5s ease both}
.lx-proc-n{display:block;font-size:14px;color:var(--lx-muted)}
.lx-proc-lead{margin-top:12px;font-size:clamp(20px,2.2cqw,26px);line-height:1.32;letter-spacing:-.015em}
.lx-proc-copy ul{display:flex;flex-wrap:wrap;gap:8px;margin-top:22px}
.lx-proc-copy li{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border-radius:9px;background:var(--lx-card);font-size:13px;color:var(--lx-ink2)}
.lx-timeline{display:flex;flex-direction:column;justify-content:flex-end;gap:14px}
.lx-tl-top{display:flex;justify-content:space-between;font-size:12px;color:var(--lx-muted)}
.lx-tl{position:relative;height:44px;border-radius:12px;background:var(--lx-card);cursor:ew-resize;touch-action:none;overflow:hidden}
.lx-tl-seg{position:absolute;top:6px;bottom:6px;min-width:12px;border-radius:8px;background:var(--lx-soft2);transition:background-color .35s;box-shadow:inset 0 0 0 2px var(--lx-card)}
.lx-tl-seg[data-done=true]{background:color-mix(in oklab,var(--lx-ink) 22%,var(--lx-soft2))}
.lx-tl-seg[data-on=true]{background:var(--lx-ink)}
.lx-timeline .lx-link{align-self:flex-start;margin-top:6px}

/* ---------- case cards ---------- */
.lx-cases{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
.lx-case{display:flex;flex-direction:column;gap:5px;min-width:0;border-radius:18px;outline-offset:4px}
.lx-case-img{aspect-ratio:2.5/1;min-height:150px;border-radius:18px;display:flex;align-items:center;justify-content:center;color:#fff}
.lx-case-img>canvas{transition:transform 1.2s cubic-bezier(.2,.8,.2,1)}
.lx-case:hover .lx-case-img>canvas,.lx-case:focus-visible .lx-case-img>canvas{transform:scale(1.06)}
.lx-case-tag{position:absolute;top:12px;right:12px;display:inline-flex;align-items:center;height:26px;padding:0 10px;border-radius:8px;background:rgba(14,16,18,.62);color:#fff;font-size:11.5px;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
.lx-case-logo{display:inline-flex;filter:drop-shadow(0 2px 12px rgba(0,0,0,.25));transition:transform .6s cubic-bezier(.2,.8,.2,1)}
.lx-case:hover .lx-case-logo{transform:scale(1.04)}
.lx-case-text{display:flex;flex-direction:column;justify-content:space-between;gap:28px;min-height:150px;padding:22px 24px;border-radius:18px;background:var(--lx-soft);transition:background-color .3s}
.lx-case:hover .lx-case-text{background:var(--lx-soft2)}
.lx-case-sum{font-size:14px;line-height:1.6;color:var(--lx-ink2);max-width:46ch}
.lx-case-foot{display:flex;align-items:center;justify-content:space-between;font-size:13px;color:var(--lx-ink2)}
.lx-case-foot>span{display:inline-flex;align-items:center;gap:6px}
.lx-case-foot>span svg{opacity:0;transform:translateX(-6px);transition:opacity .3s,transform .3s}
.lx-case:hover .lx-case-foot>span svg{opacity:1;transform:none}
.lx-case-foot .lx-dots{opacity:.55;transition:transform .6s cubic-bezier(.2,.8,.2,1),opacity .3s}
.lx-case:hover .lx-case-foot .lx-dots{transform:rotate(45deg);opacity:1}
.lx-case:hover .lx-dots circle:nth-child(1){transform:translateY(-1px)}
.lx-case:hover .lx-dots circle:nth-child(2){transform:translateX(1px)}
.lx-case:hover .lx-dots circle:nth-child(3){transform:translateY(1px)}
.lx-case:hover .lx-dots circle:nth-child(4){transform:translateX(-1px)}
.lx-more{display:flex;justify-content:center;margin-top:clamp(32px,4cqw,48px)}
.lx-more-end{font-size:13px;color:var(--lx-muted)}
.lx-filters{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin:clamp(28px,4cqw,44px) 0 18px}
.lx-filters button{height:32px;padding:0 14px;border-radius:9px;font-size:13px;color:var(--lx-ink2);background:var(--lx-soft);transition:background-color .25s,color .25s}
.lx-filters button:hover{background:var(--lx-soft2)}
.lx-filters button[data-on=true]{background:var(--lx-btn);color:var(--lx-btn-ink)}
.lx-hero-cases+.lx-cases{margin-top:clamp(36px,5cqw,64px)}

/* ---------- testimonials ---------- */
.lx-quote{display:flex;flex-direction:column;align-items:center;text-align:center;max-width:860px;margin:0 auto}
.lx-quote>.lx-dots{opacity:.5}
.lx-quote blockquote{margin-top:24px;font-size:clamp(26px,3.4cqw,42px);line-height:1.18;letter-spacing:-.025em;animation:lx-fade .6s ease both}
.lx-quote-by{display:flex;align-items:center;gap:12px;margin-top:28px;text-align:left}
.lx-quote-by svg,.lx-detail-quote svg,.lx-credit svg{border-radius:50%}
.lx-quote-by b,.lx-detail-quote b{display:block;font-size:14px;font-weight:500}
.lx-quote-by small,.lx-detail-quote small{display:block;font-size:13px;color:var(--lx-muted)}
.lx-quote-nav{display:flex;align-items:center;gap:14px;margin-top:28px}
.lx-round{display:grid;place-items:center;width:38px;height:38px;border-radius:50%;background:var(--lx-soft2);transition:background-color .25s,transform .25s}
.lx-round:hover{transform:scale(1.06)}
.lx-dots-row{display:flex;gap:6px}
.lx-dots-row button{width:6px;height:6px;border-radius:6px;background:var(--lx-faint);opacity:.5;transition:width .35s cubic-bezier(.2,.8,.2,1),opacity .3s}
.lx-dots-row button[data-on=true]{width:22px;opacity:1;background:var(--lx-ink)}

/* ---------- insights ---------- */
.lx-ins{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.lx-ins-card{display:flex;flex-direction:column;gap:14px;padding:6px 6px 20px;border-radius:20px;background:var(--lx-soft);transition:background-color .3s}
.lx-ins-card:hover{background:var(--lx-soft2)}
.lx-ins-img{aspect-ratio:16/10;border-radius:15px}
.lx-ins-img>canvas{transition:transform 1.2s cubic-bezier(.2,.8,.2,1)}
.lx-ins-card:hover .lx-ins-img>canvas{transform:scale(1.06)}
.lx-ins-card b{padding:0 14px;font-size:20px;line-height:1.25;letter-spacing:-.015em}
.lx-ins-meta{display:flex;justify-content:space-between;align-items:center;padding:0 14px;margin-top:auto;font-size:12.5px;color:var(--lx-muted)}
.lx-ins-meta svg{transition:transform .3s}
.lx-ins-card:hover .lx-ins-meta svg{transform:translateX(3px)}

/* ---------- faq ---------- */
.lx-faq{display:flex;flex-direction:column;gap:6px;max-width:760px;margin:0 auto}
.lx-faq-item{border-radius:16px;background:var(--lx-soft);transition:background-color .3s}
.lx-faq-item[data-on=true]{background:var(--lx-soft2)}
.lx-faq-item h3{font:inherit}
.lx-faq-item button{display:flex;align-items:center;justify-content:space-between;gap:20px;width:100%;padding:20px 22px;text-align:left;font-size:16px;font-weight:500;letter-spacing:-.01em}
.lx-faq-item button i{position:relative;flex:none;width:28px;height:28px;border-radius:8px;background:var(--lx-card);transition:transform .45s cubic-bezier(.2,.8,.2,1)}
.lx-faq-item button i::before,.lx-faq-item button i::after{content:"";position:absolute;left:9px;right:9px;top:13.25px;height:1.5px;background:var(--lx-ink);border-radius:2px}
.lx-faq-item button i::after{transform:rotate(90deg);transition:transform .45s cubic-bezier(.2,.8,.2,1)}
.lx-faq-item[data-on=true] button i{transform:rotate(180deg)}
.lx-faq-item[data-on=true] button i::after{transform:rotate(0deg)}
.lx-faq-a{display:grid;grid-template-rows:0fr;transition:grid-template-rows .45s cubic-bezier(.2,.8,.2,1)}
.lx-faq-item[data-on=true] .lx-faq-a{grid-template-rows:1fr}
.lx-faq-a>div{overflow:hidden}
.lx-faq-a p{padding:0 22px 22px;max-width:62ch;color:var(--lx-muted);font-size:14.5px;line-height:1.65}

/* ---------- cta ---------- */
.lx-cta-wrap{padding-top:clamp(80px,10cqw,140px)}
.lx-cta{border-radius:clamp(18px,2.6cqw,32px);color:#fff;min-height:clamp(300px,34cqw,420px);display:flex;align-items:center;justify-content:center;text-align:center;padding:48px 24px}
.lx-cta-in{display:flex;flex-direction:column;align-items:center}
.lx-cta h2{font-size:clamp(32px,4.4cqw,56px);line-height:1.05;letter-spacing:-.03em;max-width:26ch;text-wrap:balance;text-shadow:0 2px 24px rgba(0,0,0,.3)}
.lx-cta p{margin-top:16px;max-width:52ch;font-size:15px;opacity:.82}
.lx-cta .lx-btn{margin-top:28px}
.lx-cta small{margin-top:16px;font-size:12px;opacity:.7}

/* ---------- footer ---------- */
.lx-footer{padding:clamp(72px,9cqw,120px) max(clamp(16px,10cqw,150px),calc((100cqw - var(--lx-max)) / 2 + 48px)) 36px}
.lx-foot-top{display:grid;grid-template-columns:1.6fr repeat(3,1fr);gap:32px}
.lx-foot-brand{display:flex;flex-direction:column;align-items:flex-start}
.lx-foot-brand p{margin-top:24px;color:var(--lx-ink2);font-size:14px;line-height:1.6}
.lx-socials{display:flex;gap:18px;margin-top:auto;padding-top:48px;color:var(--lx-ink2)}
.lx-socials a{transition:transform .25s,color .25s}
.lx-socials a:hover{transform:translateY(-2px);color:var(--lx-ink)}
.lx-foot-col{display:flex;flex-direction:column;align-items:flex-start;gap:14px;font-size:14px}
.lx-foot-col p{font-size:19px;color:var(--lx-muted);letter-spacing:-.01em;margin-bottom:4px}
.lx-foot-col a{color:var(--lx-ink2);transition:color .2s,transform .25s}
.lx-foot-col a:hover{color:var(--lx-ink);transform:translateX(2px)}
.lx-foot-bottom{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px;margin-top:64px;font-size:12.5px;color:var(--lx-muted)}
.lx-credit{display:inline-flex;align-items:center;gap:8px}
.lx-credit a{display:inline-flex;align-items:center;gap:8px;color:var(--lx-ink2)}
.lx-theme{display:inline-flex;padding:3px;border-radius:9px;background:var(--lx-soft2);font-size:11.5px}
.lx-theme i{font-style:normal;padding:4px 10px;border-radius:7px;color:var(--lx-muted);transition:background-color .3s,color .3s}
.lx-theme i[data-on=true]{background:var(--lx-card);color:var(--lx-ink);box-shadow:var(--lx-shadow)}

/* ---------- case detail ---------- */
.lx-detail{padding-top:clamp(8px,1.4cqw,20px)}
.lx-banner{position:relative;aspect-ratio:2.8/1;min-height:300px;border-radius:clamp(18px,2.6cqw,32px);color:#fff}
.lx-banner-copy{position:absolute;left:clamp(20px,4.5cqw,52px);bottom:clamp(20px,4cqw,44px);right:30%;text-align:left}
.lx-banner-copy h1{font-size:clamp(44px,6.8cqw,88px);line-height:1;letter-spacing:-.035em;text-shadow:0 2px 30px rgba(0,0,0,.25)}
.lx-banner-copy p{margin-top:14px;max-width:38ch;font-size:clamp(13px,1.3cqw,15px);opacity:.9}
.lx-chip-btn{position:absolute;display:grid;place-items:center;width:40px;height:40px;border-radius:11px;background:rgba(245,247,248,.9);color:#111618;transition:transform .25s,background-color .25s;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
.lx-chip-btn:hover{transform:scale(1.07)}
.lx-chip-dark{background:rgba(14,16,18,.7);color:#fff}
.lx-banner-back{left:16px;top:16px}
.lx-banner-tag{top:16px;right:16px;height:32px;padding:0 12px;font-size:12.5px}
.lx-banner-next{right:16px;bottom:16px}
.lx-prose{max-width:620px;margin:0 auto;padding-top:clamp(40px,5cqw,64px)}
.lx-prose-sec+.lx-prose-sec,.lx-prose-sec+.lx-detail-quote,.lx-detail-quote+.lx-prose-sec{margin-top:clamp(40px,5cqw,60px)}
.lx-prose-lead{margin-top:18px;font-size:clamp(19px,1.9cqw,22px);line-height:1.42;letter-spacing:-.012em}
.lx-prose-body{margin-top:18px;color:var(--lx-muted);font-size:14.5px;line-height:1.7}
.lx-detail-quote{padding:clamp(24px,3cqw,36px);border-radius:18px;background:var(--lx-soft)}
.lx-detail-quote blockquote{font-size:clamp(22px,2.4cqw,28px);line-height:1.25;letter-spacing:-.02em}
.lx-detail-quote figcaption{display:flex;align-items:center;gap:12px;margin-top:20px}
.lx-stack{display:flex;flex-wrap:wrap;gap:6px;margin-top:18px}
.lx-stack span{display:inline-flex;align-items:center;height:34px;padding:0 14px;border-radius:10px;background:var(--lx-soft);font-size:13px;color:var(--lx-ink2)}
.lx-next{display:grid;grid-template-columns:1fr 1.1fr;gap:6px;max-width:860px;margin:clamp(56px,7cqw,96px) auto 0;padding:6px;border-radius:22px;background:var(--lx-soft);transition:background-color .3s}
.lx-next:hover{background:var(--lx-soft2)}
.lx-next-copy{display:flex;flex-direction:column;gap:8px;padding:22px}
.lx-next-copy small{font-size:12px;color:var(--lx-muted)}
.lx-next-copy b{font-size:34px;letter-spacing:-.03em;line-height:1}
.lx-next-copy span{font-size:13.5px;line-height:1.6;color:var(--lx-ink2)}
.lx-next-img{min-height:180px;border-radius:17px;display:flex;align-items:center;justify-content:center;color:#fff}
.lx-next-img>canvas{transition:transform 1.2s cubic-bezier(.2,.8,.2,1)}
.lx-next:hover .lx-next-img>canvas{transform:scale(1.06)}

/* ---------- 404 ---------- */
.lx-404{display:flex;flex-direction:column;align-items:center;text-align:center;padding:clamp(28px,4cqw,56px) 0 clamp(40px,6cqw,80px)}
.lx-404-img{width:100%;max-width:760px;aspect-ratio:2.4/1;border-radius:28px;display:grid;place-items:center;color:#fff;margin-bottom:36px}
.lx-404-img>span{font-size:clamp(90px,16cqw,200px);line-height:1;letter-spacing:-.05em;color:transparent;-webkit-text-stroke:1.2px rgba(255,255,255,.85)}

/* ---------- booking dialog ---------- */
.lx-modal{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:16px;background:rgba(8,10,11,.45);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);animation:lx-fade .3s ease both;overflow-y:auto}
.lx-dialog{position:relative;width:100%;max-width:520px;padding:28px;border-radius:24px;background:var(--lx-card);color:var(--lx-ink);box-shadow:0 30px 80px -20px rgba(0,0,0,.45);animation:lx-up .45s cubic-bezier(.2,.8,.2,1) both}
.lx-dialog h3{margin-top:16px;font-size:34px;line-height:1.05;letter-spacing:-.03em}
.lx-dialog-sub{margin-top:10px;color:var(--lx-muted);font-size:14px;line-height:1.55}
.lx-x{position:absolute;top:16px;right:16px;display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:var(--lx-soft2);transition:transform .25s}
.lx-x:hover{transform:rotate(90deg)}
.lx-days{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-top:22px}
.lx-day{display:flex;flex-direction:column;align-items:center;gap:2px;padding:10px 0;border-radius:12px;background:var(--lx-soft);font-size:11.5px;color:var(--lx-muted);transition:background-color .25s,color .25s}
.lx-day b{font-size:19px;font-weight:500;color:var(--lx-ink);font-variant-numeric:tabular-nums}
.lx-day[data-on=true]{background:var(--lx-btn);color:var(--lx-btn-ink)}
.lx-day[data-on=true] b{color:var(--lx-btn-ink)}
.lx-times{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:6px}
.lx-time{height:38px;border-radius:10px;background:var(--lx-soft);font-size:13px;font-variant-numeric:tabular-nums;transition:background-color .25s,color .25s}
.lx-time:hover:not([disabled]){background:var(--lx-soft2)}
.lx-time[data-on=true]{background:var(--lx-btn);color:var(--lx-btn-ink)}
.lx-time[disabled]{opacity:.38;text-decoration:line-through;cursor:not-allowed}
.lx-fields{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:20px}
.lx-fields label{display:flex;flex-direction:column;gap:6px;font-size:12.5px;color:var(--lx-muted)}
.lx-span2{grid-column:span 2}
.lx-fields input,.lx-fields textarea{width:100%;padding:11px 12px;border-radius:10px;border:1px solid var(--lx-line);background:var(--lx-soft);font-size:14px;outline:none;resize:vertical;transition:border-color .2s,background-color .2s}
.lx-fields input:focus,.lx-fields textarea:focus{border-color:var(--lx-ink);background:var(--lx-card)}
.lx-fields input[aria-invalid=true]{border-color:#d4452f}
.lx-err{display:block;margin-top:6px;font-style:normal;font-size:12.5px;color:#d4452f}
.lx-dialog-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:22px}
.lx-dialog-foot span{font-size:12.5px;color:var(--lx-muted)}
.lx-done{display:flex;flex-direction:column;align-items:center;text-align:center;padding:20px 0 6px}
.lx-done-mark{display:grid;place-items:center;width:64px;height:64px;border-radius:20px;background:var(--lx-soft2);animation:lx-spin 1.2s cubic-bezier(.2,.8,.2,1) both}
.lx-done p{margin:12px 0 24px;color:var(--lx-muted);font-size:14px;max-width:36ch}
.lx-done b{color:var(--lx-ink);font-weight:500}
@keyframes lx-spin{from{transform:rotate(-90deg) scale(.6);opacity:0}to{transform:none;opacity:1}}

/* ---------- motion ---------- */
@keyframes lx-up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes lx-fade{from{opacity:0}to{opacity:1}}
.lx-in{animation:lx-up .8s cubic-bezier(.2,.8,.2,1) both}
.lx-rv[data-rv="0"]{opacity:0;transform:translateY(22px)}
.lx-rv[data-rv="1"]{opacity:1;transform:none;transition:opacity .8s cubic-bezier(.2,.8,.2,1),transform .8s cubic-bezier(.2,.8,.2,1)}

/* ---------- narrow frames ---------- */
@container lx (max-width:860px){
.lx-svc{grid-template-columns:minmax(0,1fr)}
.lx-steps{grid-template-columns:repeat(2,1fr)}
.lx-proc-panel{grid-template-columns:1fr}
.lx-ins{grid-template-columns:1fr 1fr}
.lx-ins-card:nth-child(3){display:none}
.lx-foot-top{grid-template-columns:1fr 1fr 1fr}
.lx-foot-brand{grid-column:1/-1}
.lx-socials{padding-top:24px}
}
@container lx (max-width:720px){
.lx-nav{grid-template-columns:1fr auto;padding-top:16px;padding-bottom:16px}
.lx-links{display:none}
.lx-nav-end .lx-btn-sm{display:none}
.lx-burger{display:block}
.lx-nav .lx-drawer{grid-column:1/-1;display:flex;flex-direction:column;gap:4px;max-height:0;overflow:hidden;opacity:0;transition:max-height .45s cubic-bezier(.2,.8,.2,1),opacity .3s}
.lx-nav[data-open=true] .lx-drawer{max-height:420px;opacity:1}
.lx-drawer a{padding:12px 4px;font-size:22px;font-family:var(--lx-serif);border-bottom:1px solid var(--lx-line)}
.lx-drawer a[aria-current=page]{color:var(--lx-muted)}
.lx-drawer .lx-btn{margin:14px 0 6px;font-family:var(--lx-sans);font-size:14px;border:0}
.lx-cases{grid-template-columns:minmax(0,1fr)}
.lx-svc-points{grid-template-columns:1fr}
.lx-ins{grid-template-columns:1fr}
.lx-ins-card:nth-child(3){display:flex}
.lx-hero-vis{aspect-ratio:auto;height:360px}
.lx-hero-trust small{display:none}
.lx-banner{aspect-ratio:auto;height:380px}
.lx-banner-copy{right:20px}
.lx-stats-3{grid-template-columns:1fr}
.lx-next{grid-template-columns:1fr}
.lx-foot-top{grid-template-columns:1fr 1fr}
.lx-footer{padding-left:20px;padding-right:20px}
}
@container lx (max-width:440px){
.lx-stats{grid-template-columns:1fr}
.lx-steps{grid-template-columns:1fr}
.lx-fields{grid-template-columns:1fr}
.lx-span2{grid-column:auto}
.lx-wire{width:12px}
}
@media (max-width:560px){
.lx-fields{grid-template-columns:1fr}
.lx-span2{grid-column:auto}
.lx-dialog{padding:22px}
}

@media (prefers-reduced-motion:reduce){
.lx-root *,.lx-root *::before,.lx-root *::after{animation-duration:.001ms !important;animation-iteration-count:1 !important;transition-duration:.001ms !important}
.lx-marquee-track{animation:none !important}
.lx-marquee{overflow-x:auto}
.lx-rv[data-rv="0"]{opacity:1;transform:none}
}
`
