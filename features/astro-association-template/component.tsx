"use client"

// Astro Association Template — a complete landing page for an astronomy club,
// set like a Swiss space poster: a giant wordmark filled with confetti
// bubbles, a compass-ring logo whose arrow follows the pointer, a bubble band
// with the mark knocked out of it, crossing ribbons over oversized type,
// projects, observation nights with a live moon-phase widget, membership with
// a personalised member card, and a bubble-band footer — all inside a
// periwinkle frame.
//
// The bubbles are a seeded canvas field: they drift, scatter from the pointer
// and pop when clicked. Four palettes ship (cobalt, aurora, nebula, solar),
// switchable from the nav, or pass your own.
//
// Every picture is drawn in this file (canvas + SVG). Nothing loads at runtime.
import * as React from "react"

/* ------------------------------------------------------------------ types */

export type AstroNavLink = { label: string; /** A section key ("mission") or any href. */ target: string }
export type AstroPalette = {
  name: string
  /** Type, buttons, rules. */
  accent: string
  /** The page frame. */
  frame: string
  /** Bubble colours. The first is the ground the others sit on. */
  colors: string[]
}
export type AstroPaletteName = "cobalt" | "aurora" | "nebula" | "solar"
export type AstroHero = {
  /** The bubble-filled wordmark. Short words read best. */
  wordmark: string
  issue: string
  /** `\n` breaks the line; the last line gets the sliced echo. */
  title: string
  blurb: string
  credit: string
  primaryCta: string
  secondaryCta: string
  /** Under the wordmark. Empty hides it. */
  hint: string
}
export type AstroStat = { value: string; label: string }
export type AstroMission = {
  /** White type on the bubble band. `\n` breaks the line. */
  bandTitle: string
  kicker: string
  /** Three small labels spread across a hairline. */
  meta: string[]
  title: string
  body: string
  stats: AstroStat[]
}
export type AstroProject = {
  code: string
  title: string
  summary: string
  detail: string
  status: "open" | "ongoing" | "archived"
  /** 0–1. Omit to hide the bar. */
  progress?: number
  /** Caption for the bar, e.g. "7,412 of 10,000 readings". */
  goal?: string
  cta?: string
}
export type AstroProjects = {
  /** Oversized type behind the ribbons. `\n` breaks the line. */
  title: string
  issue: string
  /** Text that runs along the dark ribbons. */
  ribbonText: string
  body: string
  heading: string
}
export type AstroNight = {
  /** ISO date, "2026-11-14". */
  date: string
  time: string
  title: string
  place: string
  /** Filter chip: "Star party", "Talk", ... */
  kind: string
  /** What to look at. */
  target: string
  seats?: number
  going?: number
}
export type AstroTier = { name: string; price: string; period?: string; blurb: string; perks: string[]; featured?: boolean }
export type AstroJoin = {
  tag: string
  title: string
  body: string
  namePlaceholder: string
  emailPlaceholder: string
  button: string
  /** `{name}` is replaced with the member's first name. */
  success: string
}
export type AstroFooter = { bandTitle: string; tagline: string; credit: string; links: { label: string; href: string }[] }
export type AstroMember = { name: string; email: string; tier: string; number: string }

export type AstroAssociationTemplateProps = {
  /** Shown in the nav and on the member card. */
  brand?: string
  nav?: AstroNavLink[]
  navCta?: string
  hero?: Partial<AstroHero>
  mission?: Partial<AstroMission>
  projects?: AstroProject[]
  projectsCopy?: Partial<AstroProjects>
  nightsTag?: string
  nightsTitle?: string
  nights?: AstroNight[]
  tiers?: AstroTier[]
  join?: Partial<AstroJoin>
  footer?: Partial<AstroFooter>
  /** A preset name or your own palette. */
  palette?: AstroPaletteName | AstroPalette
  /** Swatches in the nav that let visitors re-colour the page. */
  paletteSwitcher?: boolean
  onPaletteChange?: (palette: AstroPalette) => void
  /** Starting arrangement of every bubble field. Any integer. */
  seed?: number
  onPop?: (total: number) => void
  onNavCta?: () => void
  onContribute?: (project: AstroProject) => void
  onRsvp?: (night: AstroNight, going: boolean) => void
  /** A rejected promise shows an error. */
  onJoin?: (member: AstroMember) => void | Promise<unknown>
  /** The day the sky widget opens on. Defaults to today. */
  skyDate?: string | Date
  fonts?: { display?: string; body?: string; mono?: string }
  defaultTheme?: "system" | "light" | "dark"
  onThemeChange?: (theme: "light" | "dark") => void
  maxWidth?: string
  height?: string
  className?: string
}

type Theme = "light" | "dark"
type Status = "idle" | "loading" | "error" | "done"

/* ------------------------------------------------------------------ logic */

// #region logic
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

function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim())
}

function easeOutCubic(t: number): number {
  const c = clamp(t, 0, 1)
  return 1 - Math.pow(1 - c, 3)
}

// "ASTRO.\nASSOCiATION" → lines. A literal backslash-n counts too, since
// that's what "\n" becomes in a JSX attribute.
function lines(s: string): string[] {
  return s.split(/\n|\\n/).filter((l) => l.length > 0)
}

type Bubble = { x: number; y: number; r: number; c: number; ph: number; amp: number; sp: number }

// A seeded confetti of circles covering a w × h field (and a little past its
// edges, so nothing reads as cut). Sizes lean small; the big ones go first so
// the small ones layer on top.
function buildBubbles(seed: number, w: number, h: number, nColors: number, density = 1, scale = 1): Bubble[] {
  const rnd = mulberry32(seed)
  const unit = Math.max(6, Math.min(w, h) * 0.12 * scale)
  const n = Math.round(clamp(((w * h) / (unit * unit * 1.25)) * density, 12, 1400))
  const out: Bubble[] = []
  for (let i = 0; i < n; i++) {
    const r = unit * (0.22 + 1.3 * Math.pow(rnd(), 2.3))
    out.push({
      x: rnd() * (w + r) - r / 2,
      y: rnd() * (h + r) - r / 2,
      r,
      c: 1 + Math.floor(rnd() * Math.max(1, nColors - 1)),
      ph: rnd() * Math.PI * 2,
      amp: 1 + rnd() * 3.5,
      sp: 0.25 + rnd() * 0.6,
    })
  }
  return out.sort((a, b) => b.r - a.r)
}

// The same confetti as a CSS background, for small surfaces that don't need a
// live canvas: hard-edged radial gradients over the ground colour.
function bubbleCss(seed: number, colors: string[], n = 34, maxR = 46): string {
  const rnd = mulberry32(seed)
  const layers: string[] = []
  for (let i = 0; i < n; i++) {
    const r = Math.round(6 + (maxR - 6) * Math.pow(rnd(), 1.8))
    const x = Math.round(rnd() * 100)
    const y = Math.round(rnd() * 100)
    const c = colors[1 + Math.floor(rnd() * Math.max(1, colors.length - 1))] ?? colors[0]
    layers.push("radial-gradient(circle at " + x + "% " + y + "%, " + c + " 0 " + r + "px, transparent " + (r + 0.6) + "px)")
  }
  return layers.reverse().join(", ") + ", " + (colors[0] ?? "#2b3bff")
}

const SYNODIC = 29.530588853
// A known new moon: 2000-01-06 18:14 UTC.
const NEW_MOON_REF = Date.UTC(2000, 0, 6, 18, 14)

function moonPhase(at: Date | number): { age: number; fraction: number; illumination: number; name: string; waxing: boolean; daysToFull: number; daysToNew: number } {
  const ms = typeof at === "number" ? at : at.getTime()
  const days = (ms - NEW_MOON_REF) / 86400000
  const age = ((days % SYNODIC) + SYNODIC) % SYNODIC
  const fraction = age / SYNODIC
  const illumination = (1 - Math.cos(2 * Math.PI * fraction)) / 2
  return {
    age,
    fraction,
    illumination,
    name: phaseName(fraction),
    waxing: fraction < 0.5,
    daysToFull: (((0.5 - fraction) % 1) + 1) % 1 * SYNODIC,
    daysToNew: ((1 - fraction) % 1) * SYNODIC,
  }
}

function phaseName(f: number): string {
  if (f < 0.0339 || f > 0.9661) return "New Moon"
  if (f < 0.216) return "Waxing Crescent"
  if (f < 0.284) return "First Quarter"
  if (f < 0.466) return "Waxing Gibbous"
  if (f < 0.534) return "Full Moon"
  if (f < 0.716) return "Waning Gibbous"
  if (f < 0.784) return "Last Quarter"
  return "Waning Crescent"
}

// The lit part of a moon of radius r centred on 0,0, as an SVG path:
// the bright limb as a half circle, closed by the terminator's half ellipse.
function moonPath(fraction: number, r: number): string {
  const f = ((fraction % 1) + 1) % 1
  const waxing = f < 0.5
  const c = Math.cos(2 * Math.PI * f)
  const rx = Math.abs(c) * r
  const limb = waxing ? 1 : 0
  const term = waxing ? (c > 0 ? 0 : 1) : c < 0 ? 0 : 1
  const R = r.toFixed(2)
  return "M0,-" + R + "A" + R + "," + R + " 0 0 " + limb + " 0," + R + "A" + rx.toFixed(2) + "," + R + " 0 0 " + term + " 0,-" + R + "Z"
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]

// "2026-11-14" → its parts, read as a calendar date (no timezone drift).
function parseDay(iso: string): { day: string; mon: string; dow: string; ms: number } | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  const ms = Date.UTC(+m[1], +m[2] - 1, +m[3], 21)
  const d = new Date(ms)
  if (d.getUTCMonth() !== +m[2] - 1) return null
  return { day: String(d.getUTCDate()).padStart(2, "0"), mon: MONTHS[d.getUTCMonth()], dow: WEEKDAYS[d.getUTCDay()], ms }
}

function isoDay(d: Date): string {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0")
}

function memberNumber(name: string, email: string): string {
  return "#" + String(100 + (hashStr(name.trim().toLowerCase() + "|" + email.trim().toLowerCase()) % 9900)).padStart(4, "0")
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? ""
}

// "1,840+" → { prefix: "", value: 1840, decimals: 0, suffix: "+" }
function splitStat(s: string): { prefix: string; value: number; decimals: number; suffix: string } | null {
  const m = s.match(/^(\D*?)(\d[\d,]*(?:\.\d+)?)(.*)$/)
  if (!m) return null
  const num = m[2].replace(/,/g, "")
  const dot = num.indexOf(".")
  return { prefix: m[1], value: parseFloat(num), decimals: dot < 0 ? 0 : num.length - dot - 1, suffix: m[3] }
}

function formatStat(s: string, t: number): string {
  const p = splitStat(s)
  if (!p) return s
  const v = p.value * easeOutCubic(t)
  const grouped = p.value >= 1000 && p.decimals === 0
  const body = grouped ? Math.round(v).toLocaleString("en-US") : v.toFixed(p.decimals)
  return p.prefix + body + p.suffix
}

// Keeps a followed angle continuous, so a CSS transition never spins the long way.
function unwrapAngle(prev: number, next: number): number {
  let d = (next - prev) % 360
  if (d > 180) d -= 360
  if (d < -180) d += 360
  return prev + d
}
// #endregion logic

/* ---------------------------------------------------------------- palettes */

const PALETTES: Record<AstroPaletteName, AstroPalette> = {
  cobalt: {
    name: "Cobalt",
    accent: "#2233ff",
    frame: "#8d9cff",
    colors: ["#2f47ff", "#1a2cff", "#3d63ff", "#1e88ff", "#27b4f5", "#12d0ff", "#1fe3c0", "#41ef96", "#7f93ff", "#b5c3ff", "#dfe6ff", "#0f1fc4", "#5a46ff"],
  },
  aurora: {
    name: "Aurora",
    accent: "#00876a",
    frame: "#86dcc2",
    colors: ["#00a884", "#007a63", "#00c49a", "#25e0a7", "#7ef5c4", "#00b3c7", "#1f8fff", "#a8f0d8", "#d9fff1", "#00594a", "#5be37f", "#c6f86a"],
  },
  nebula: {
    name: "Nebula",
    accent: "#6a22ff",
    frame: "#c3a8ff",
    colors: ["#6f3cff", "#4b1fd6", "#8f5bff", "#c04dff", "#ff4fd2", "#ff8ad9", "#3d6bff", "#b8a4ff", "#ead9ff", "#2a118f", "#ff6f91", "#7cd3ff"],
  },
  solar: {
    name: "Solar",
    accent: "#e23d00",
    frame: "#ffb48c",
    colors: ["#ff5a1f", "#e23d00", "#ff7a00", "#ffa400", "#ffd23f", "#ff3d6e", "#ff8f6b", "#ffe08a", "#fff1cc", "#b52a00", "#ff5fa2", "#ffc2a1"],
  },
}
const PALETTE_ORDER: AstroPaletteName[] = ["cobalt", "aurora", "nebula", "solar"]
const SECTION_KEYS = ["home", "mission", "projects", "nights", "join"]

/* ---------------------------------------------------------------- defaults */

const D_NAV: AstroNavLink[] = [
  { label: "Mission", target: "mission" },
  { label: "Projects", target: "projects" },
  { label: "Nights", target: "nights" },
  { label: "Join", target: "join" },
]

const D_HERO: AstroHero = {
  wordmark: "Astro",
  issue: "#102",
  title: "ASTRO.\nASSOCiATION",
  blurb:
    "Interplanetary exploration can be carried out by many means, from spacecraft and telescopes to a folding chair in a dark field. We do the last part together, every clear night.",
  credit: "Astro Association · Project designed by its members",
  primaryCta: "Join the association",
  secondaryCta: "Tonight's sky",
  hint: "Click the bubbles. They pop.",
}

const D_MISSION: AstroMission = {
  bandTitle: "ASTRO.\nASSOCiATION",
  kicker: "ASTRO. ASSOCIATION PROJECT",
  meta: ["Astro. Association project", "#102 daily design", "Designed by members"],
  title: "A club for people who keep looking up.",
  body:
    "We are amateurs in the old sense of the word: we do it for love. Members share telescopes, drive each other to dark sites, log what they see and turn it into open data that real observatories use. No experience needed — just curiosity and a warm coat.",
  stats: [
    { value: "1,840+", label: "Members" },
    { value: "312", label: "Nights logged" },
    { value: "48,600", label: "Objects catalogued" },
    { value: "27", label: "Countries" },
  ],
}

const D_PROJECTS: AstroProject[] = [
  {
    code: "#099",
    title: "Dark-Sky Census",
    summary: "Members measure how bright the night is above their own street.",
    detail:
      "A pocket meter, a free app and ten minutes after midnight. Every reading lands on a public map that city planners and lighting engineers use to argue for darker streets.",
    status: "ongoing",
    progress: 0.74,
    goal: "7,412 of 10,000 readings",
    cta: "Log a reading",
  },
  {
    code: "#100",
    title: "Lunar Sketchbook",
    summary: "One crater a night, drawn by hand at the eyepiece.",
    detail:
      "Two hundred and twelve pencil drawings of the terminator, bound into a printed atlas. The book is sold out; the scans are free to download from the archive.",
    status: "archived",
    progress: 1,
    goal: "212 drawings published",
    cta: "Browse the atlas",
  },
  {
    code: "#101",
    title: "Meteor Radio Watch",
    summary: "Listening for meteors through the clouds with home-built receivers.",
    detail:
      "Fourteen stations count forward-scatter echoes from a distant broadcast transmitter, day and night, rain or shine. Build kits are lent out from the club library.",
    status: "ongoing",
    progress: 0.42,
    goal: "6 of 14 stations online this month",
    cta: "Borrow a kit",
  },
  {
    code: "#102",
    title: "All Can Be Found",
    summary: "The daily design project: one object, one poster, every day.",
    detail:
      "Pitch a planet, a nebula or a lost probe. Each day a member designs its poster, and every poster ships with the coordinates to find the real thing in the sky.",
    status: "open",
    progress: 0.1,
    goal: "Open call — 102 posters so far",
    cta: "Pitch an object",
  },
]

const D_PROJECTS_COPY: AstroProjects = {
  title: "ASTRO\nASSOCiATION",
  issue: "102",
  ribbonText: "astro. association",
  heading: "Projects, numbered like issues.",
  body:
    "Interplanetary exploration projects can be carried out using a variety of means and equipment. They require a large amount of patient observation, and they require international cooperation and joint efforts.",
}

function inDays(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return isoDay(d)
}

const D_NIGHTS: AstroNight[] = [
  { date: inDays(4), time: "20:30", title: "Saturn & the autumn sky", place: "Hilltop field, north gate", kind: "Star party", target: "Saturn's rings", seats: 40, going: 27 },
  { date: inDays(9), time: "19:00", title: "How to read a star chart", place: "Library annex, room 2", kind: "Workshop", target: "Planisphere basics", seats: 18, going: 15 },
  { date: inDays(16), time: "21:00", title: "Deep-sky marathon", place: "Dark site, 40 min drive", kind: "Star party", target: "Andromeda galaxy", seats: 24, going: 9 },
  { date: inDays(23), time: "19:30", title: "What the probes found", place: "Town hall auditorium", kind: "Talk", target: "Outer-planet missions", seats: 120, going: 64 },
  { date: inDays(30), time: "22:00", title: "Meteor shower watch", place: "Hilltop field, north gate", kind: "Star party", target: "Peak hour radiant", seats: 60, going: 31 },
]

const D_TIERS: AstroTier[] = [
  { name: "Stargazer", price: "Free", blurb: "For the curious.", perks: ["Monthly sky notes", "Public star parties", "Members' forum"] },
  {
    name: "Observer",
    price: "€6",
    period: "/mo",
    blurb: "For regulars at the eyepiece.",
    perks: ["Everything in Stargazer", "Telescope lending library", "Dark-site trips", "Project #102 access"],
    featured: true,
  },
  { name: "Patron", price: "€18", period: "/mo", blurb: "Keeps the domes open.", perks: ["Everything in Observer", "Your name on the dome wall", "Astrophoto workshops", "Two guest passes"] },
]

const D_JOIN: AstroJoin = {
  tag: "Membership",
  title: "Get your card. Find everything.",
  body: "Pick a tier, type your name and watch your card print. You can change tiers any time.",
  namePlaceholder: "Your name",
  emailPlaceholder: "you@domain.com",
  button: "Print my card",
  success: "Welcome aboard, {name}. Your card is in your inbox.",
}

const D_FOOTER: AstroFooter = {
  bandTitle: "ASTRO.\nASSOCiATION",
  tagline: "ALL WE CAN FOUND.  ALL CAN BE FOUND.",
  credit: "AASS. PROJECT · DESIGNED BY ITS MEMBERS",
  links: [
    { label: "Newsletter", href: "#" },
    { label: "Archive", href: "#" },
    { label: "Press kit", href: "#" },
    { label: "Contact", href: "#" },
  ],
}

const FONT_DISPLAY = '"Poppins","Montserrat","Gilroy","Avenir Next","Century Gothic","Futura",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif'
const FONT_MONO = '"JetBrains Mono","IBM Plex Mono",ui-monospace,"SF Mono",Menlo,Consolas,monospace'

/* -------------------------------------------------------------------- css */

const AA_CSS = `
.aa-root{--aa-accent:#2233ff;--aa-frame:#8d9cff;--aa-paper:#ffffff;--aa-ink:#0b0c16;--aa-soft:#2b2e45;--aa-muted:#6b7090;--aa-card:#f5f6ff;--aa-moon:#e6e9ff;--aa-blue:var(--aa-accent);--aa-line:color-mix(in srgb,var(--aa-accent) 16%,transparent);--aa-line-strong:color-mix(in srgb,var(--aa-accent) 34%,transparent);--aa-display:"Poppins",sans-serif;--aa-body:var(--aa-display);--aa-mono:ui-monospace,monospace;position:relative;width:100%;box-sizing:border-box;background:var(--aa-paper);color:var(--aa-ink);font-family:var(--aa-body);font-size:15px;line-height:1.5;-webkit-font-smoothing:antialiased;border:clamp(6px,1.1vw,12px) solid var(--aa-frame);transition:background-color .45s ease,color .45s ease,border-color .45s ease;overflow:clip}
.aa-root[data-theme="dark"]{--aa-paper:#060821;--aa-ink:#f2f4ff;--aa-soft:#c8cdf2;--aa-muted:#8a90bd;--aa-card:#0c1033;--aa-moon:#1a1f4d;--aa-blue:color-mix(in srgb,var(--aa-accent) 52%,#ffffff);--aa-line:color-mix(in srgb,var(--aa-blue) 18%,transparent);--aa-line-strong:color-mix(in srgb,var(--aa-blue) 36%,transparent);border-color:color-mix(in srgb,var(--aa-frame) 45%,#060821)}
.aa-root :where(*){box-sizing:border-box}
.aa-root ::selection{background:var(--aa-blue);color:var(--aa-paper)}
.aa-root :focus-visible{outline:2px solid var(--aa-blue);outline-offset:3px}
.aa-root :where(button){font:inherit;color:inherit;background:none;border:0;padding:0;margin:0;cursor:pointer;text-align:inherit;letter-spacing:inherit}
.aa-root :where(a){color:inherit;text-decoration:none}
.aa-root :where(svg){display:block;max-width:none;flex:none}
.aa-root :where(canvas){display:block;max-width:none}
.aa-root :where(h1,h2,h3,h4,p,ul,ol,li,dl,dd,figure){margin:0;padding:0;font-size:inherit;font-weight:inherit;list-style:none}
.aa-root :where(input){font:inherit;color:inherit;margin:0}
.aa-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.aa-shell{width:100%;container-type:inline-size;position:relative}
.aa-in{width:100%;max-width:var(--aa-max,1240px);margin:0 auto;padding:0 clamp(16px,4cqi,48px)}

/* type */
.aa-disp{font-family:var(--aa-display);font-weight:800;letter-spacing:-.02em;line-height:.86;text-transform:none}
.aa-mono{font-family:var(--aa-mono);font-size:11px;letter-spacing:.06em;text-transform:uppercase}
.aa-label{font-family:var(--aa-display);font-weight:800;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:var(--aa-blue)}
.aa-echo{display:inline-block;white-space:nowrap}
.aa-title{display:flex;flex-direction:column;font-family:var(--aa-display);font-weight:800;letter-spacing:-.01em;line-height:.9;text-transform:none}
.aa-title>span:last-child{padding-bottom:.42em}

/* nav */
.aa-nav{position:sticky;top:0;z-index:40;background:color-mix(in srgb,var(--aa-paper) 84%,transparent);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid var(--aa-line);transition:background-color .45s,border-color .45s}
.aa-nav .aa-in{display:flex;align-items:center;gap:14px;height:62px}
.aa-brand{display:inline-flex;align-items:center;gap:10px;font-family:var(--aa-display);font-weight:800;font-size:17px;letter-spacing:-.01em;white-space:nowrap}
.aa-issue{display:none;padding:3px 7px;border:1.5px solid currentColor;border-radius:999px;font-family:var(--aa-display);font-weight:800;font-size:11px;color:var(--aa-blue)}
.aa-links{display:none;align-items:center;gap:2px;margin:0 auto}
.aa-link{position:relative;padding:8px 12px;font-family:var(--aa-display);font-weight:700;font-size:13px;letter-spacing:.02em;text-transform:uppercase;color:var(--aa-soft);transition:color .2s}
.aa-link::after{content:"";position:absolute;left:12px;right:12px;bottom:3px;height:2px;border-radius:2px;background:var(--aa-blue);transform:scaleX(0);transform-origin:left;transition:transform .35s cubic-bezier(.2,.8,.2,1)}
.aa-link:hover,.aa-link[aria-current="true"]{color:var(--aa-blue)}
.aa-link[aria-current="true"]::after,.aa-link:hover::after{transform:scaleX(1)}
.aa-nav-end{display:flex;align-items:center;gap:8px;margin-left:auto}
.aa-swatches{display:none;align-items:center;gap:5px;padding:4px;border:1px solid var(--aa-line);border-radius:999px}
.aa-sw{position:relative;width:18px;height:18px;border-radius:999px;transition:transform .25s cubic-bezier(.2,.8,.2,1)}
.aa-sw:hover{transform:scale(1.15)}
.aa-sw[aria-checked="true"]{box-shadow:0 0 0 2px var(--aa-paper),0 0 0 3.5px var(--aa-ink)}
.aa-icon{display:inline-grid;place-items:center;width:36px;height:36px;border-radius:999px;color:var(--aa-soft);border:1px solid var(--aa-line);transition:color .2s,border-color .2s,transform .3s}
.aa-icon:hover{color:var(--aa-blue);border-color:var(--aa-blue)}
.aa-menu-btn{display:inline-grid}
.aa-mobile{position:absolute;left:0;right:0;top:100%;display:grid;gap:2px;padding:10px clamp(16px,4cqi,48px) 16px;background:var(--aa-paper);border-bottom:1px solid var(--aa-line);animation:aa-drop .3s cubic-bezier(.2,.8,.2,1) both}
.aa-mobile .aa-link{padding:12px 0;font-size:16px}
.aa-mobile .aa-link::after{left:0;right:auto;width:28px}
.aa-mobile .aa-swatches{display:inline-flex;justify-self:start;margin-top:8px}
@container (min-width:860px){.aa-links{display:flex}.aa-menu-btn{display:none}.aa-mobile{display:none}.aa-nav-end{margin-left:0}.aa-issue{display:inline-block}.aa-nav-end .aa-swatches{display:inline-flex}}

/* buttons */
.aa-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:9px;padding:13px 20px;border-radius:999px;font-family:var(--aa-display);font-weight:800;font-size:13px;letter-spacing:.03em;text-transform:uppercase;line-height:1;white-space:nowrap;transition:background-color .2s,color .2s,box-shadow .25s,transform .25s cubic-bezier(.2,.8,.2,1)}
.aa-btn-solid{background:var(--aa-blue);color:var(--aa-paper);box-shadow:0 10px 24px -14px var(--aa-blue)}
.aa-btn-solid:hover{transform:translateY(-2px);box-shadow:0 16px 30px -14px var(--aa-blue)}
.aa-btn-line{color:var(--aa-blue);box-shadow:inset 0 0 0 2px var(--aa-blue)}
.aa-btn-line:hover{background:var(--aa-blue);color:var(--aa-paper)}
.aa-btn-ink{background:var(--aa-ink);color:var(--aa-paper)}
.aa-btn-ink:hover{transform:translateY(-2px)}
.aa-btn:active{transform:scale(.97)}
.aa-btn[disabled]{opacity:.55;cursor:default;transform:none}
.aa-btn .aa-arr{transition:transform .25s cubic-bezier(.2,.8,.2,1)}
.aa-btn:hover .aa-arr{transform:translateX(3px)}
.aa-nav .aa-btn{padding:11px 16px;font-size:12px}

/* bubbles */
.aa-bub{position:absolute;inset:0}
.aa-bub canvas{position:absolute;left:0;top:0;width:100%;height:100%}

/* hero */
.aa-hero{position:relative;display:flex;flex-direction:column;justify-content:center;min-height:calc(var(--aa-h,100svh) - 74px);padding:clamp(14px,2.4cqi,30px) 0 clamp(24px,4cqi,48px);scroll-margin-top:62px;overflow:hidden}
.aa-orbits{position:absolute;inset:0;pointer-events:none;color:var(--aa-line-strong)}
.aa-orbits svg{position:absolute}
.aa-orbit-spin{transform-box:view-box;transform-origin:50% 50%;animation:aa-spin 60s linear infinite}
.aa-orbit-spin-r{animation-duration:90s;animation-direction:reverse}
.aa-wm{position:relative;height:clamp(200px,40cqi,520px);margin:0 calc(-1 * clamp(4px,1cqi,14px));cursor:crosshair;touch-action:pan-y}
.aa-hero-mark{position:absolute;right:clamp(16px,4cqi,56px);top:clamp(4px,1.4cqi,20px);display:flex;flex-direction:column;align-items:flex-end;gap:clamp(6px,1cqi,12px);pointer-events:none;z-index:2}
.aa-hero-mark .aa-logo{pointer-events:auto;color:var(--aa-ink);width:clamp(64px,13cqi,170px);height:auto}
.aa-hero-title{font-size:clamp(22px,4.6cqi,60px);color:var(--aa-ink);text-align:left}
.aa-hero-title>span{background:var(--aa-paper);padding:0 .08em;box-decoration-break:clone;-webkit-box-decoration-break:clone}
.aa-hero-row{position:relative;display:grid;gap:clamp(18px,3cqi,32px);align-items:end;margin-top:clamp(-56px,-4cqi,-8px);z-index:3}
.aa-issue-big{font-family:var(--aa-display);font-weight:800;font-size:clamp(52px,11cqi,150px);line-height:.8;letter-spacing:-.04em;color:var(--aa-ink);background:var(--aa-paper);justify-self:start;padding:.06em .1em 0 0}
.aa-hero-copy{display:flex;flex-direction:column;gap:16px;max-width:520px}
.aa-hero-copy p{font-size:clamp(14px,1.35cqi,16px);color:var(--aa-soft);line-height:1.6}
.aa-ctas{display:flex;flex-wrap:wrap;gap:10px}
.aa-credit{display:flex;align-items:center;gap:12px;padding-top:10px;border-top:1.5px solid var(--aa-ink);font-family:var(--aa-display);font-weight:800;font-size:10.5px;letter-spacing:.04em;text-transform:uppercase}
.aa-hint{display:inline-flex;align-items:center;gap:8px;color:var(--aa-muted)}
.aa-hint b{color:var(--aa-blue);font-weight:700}
.aa-pop-dot{width:7px;height:7px;border-radius:99px;background:var(--aa-blue);animation:aa-blink 1.6s ease-in-out infinite}
@container (min-width:760px){.aa-hero-row{grid-template-columns:auto 1fr;column-gap:clamp(24px,5cqi,80px)}.aa-hero-copy{justify-self:end}}

/* asterisk */
.aa-ast{display:inline-grid;place-items:center;color:var(--aa-blue);transition:transform .8s cubic-bezier(.2,.8,.2,1)}
.aa-ast:hover{transform:rotate(60deg) scale(1.15)}

/* logo */
.aa-logo{overflow:visible}
.aa-logo-arrow{transform-box:view-box;transform-origin:50px 50px;transition:transform .6s cubic-bezier(.2,.8,.2,1)}
.aa-logo-spin{transform-box:view-box;transform-origin:50px 50px;transition:transform .9s cubic-bezier(.2,.8,.2,1)}
.aa-brand:hover .aa-logo-spin{transform:rotate(-360deg)}

/* band */
.aa-band{position:relative;height:clamp(190px,30cqi,360px);color:#ffffff;overflow:hidden}
.aa-band-title{position:absolute;left:clamp(16px,3cqi,40px);top:50%;transform:translateY(-58%);font-size:clamp(22px,4.6cqi,58px);z-index:1;pointer-events:none;text-shadow:0 2px 18px rgba(0,0,0,.12)}
.aa-band .aa-ast{position:absolute;left:clamp(16px,3cqi,40px);bottom:clamp(14px,2.6cqi,30px);color:#ffffff;z-index:1}
.aa-band-tag{position:absolute;right:clamp(16px,3cqi,40px);top:clamp(14px,2.4cqi,26px);display:flex;align-items:center;gap:10px;z-index:1;font-family:var(--aa-display);font-weight:800;font-size:clamp(13px,1.8cqi,22px);letter-spacing:-.01em}
.aa-band-tag .aa-logo{width:clamp(28px,4cqi,52px);height:auto;color:#ffffff}

/* sections */
.aa-sec{position:relative;scroll-margin-top:62px}
.aa-pad{padding:clamp(48px,8cqi,104px) 0}
.aa-reveal{opacity:0;transform:translateY(22px);transition:opacity .9s cubic-bezier(.2,.7,.2,1),transform .9s cubic-bezier(.2,.7,.2,1)}
.aa-reveal[data-in="true"]{opacity:1;transform:none}
.aa-kicker{display:flex;flex-direction:column;align-items:center;gap:14px;padding:clamp(18px,3cqi,30px) 0 clamp(26px,4cqi,44px)}
.aa-kicker .aa-label{font-size:clamp(12px,1.3cqi,15px)}
.aa-meta{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px 20px;padding:10px 0;border-top:1px solid var(--aa-line-strong)}
.aa-meta span{font-size:10px}
.aa-h2{font-family:var(--aa-display);font-weight:800;font-size:clamp(30px,5cqi,62px);line-height:.98;letter-spacing:-.03em}
.aa-lede{font-size:clamp(15px,1.5cqi,17px);color:var(--aa-soft);line-height:1.65;max-width:56ch}
.aa-mission{display:grid;gap:clamp(28px,5cqi,64px);padding-top:clamp(32px,5cqi,64px)}
.aa-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0;border-top:1.5px solid var(--aa-ink)}
.aa-stat{padding:18px 4px 18px 0;border-bottom:1px solid var(--aa-line-strong)}
.aa-stat dt{font-family:var(--aa-display);font-weight:800;font-size:clamp(32px,4.6cqi,56px);line-height:1;letter-spacing:-.03em;color:var(--aa-blue);font-variant-numeric:tabular-nums}
.aa-stat dd{margin-top:6px}
@container (min-width:860px){.aa-mission{grid-template-columns:1.1fr 1fr;align-items:start}}

/* ribbons */
.aa-stage{position:relative;height:clamp(420px,70cqi,780px);overflow:hidden;margin-top:clamp(20px,3cqi,40px);--mx:0;--my:0}
.aa-stage-type{position:absolute;left:clamp(4px,1cqi,16px);top:12%;font-size:clamp(40px,12.6cqi,180px);color:var(--aa-blue);line-height:.84;letter-spacing:-.03em;pointer-events:none}
.aa-stage-type sup{position:relative;top:-.95em;margin-left:.06em;font-size:.42em;color:var(--aa-ink);vertical-align:baseline}
.aa-rib{position:absolute;left:var(--x);top:var(--y);width:var(--w);height:clamp(48px,8cqi,104px);transform:translate(-50%,-50%) translate(calc(var(--mx) * var(--k) * 1px),calc(var(--my) * var(--k) * 1px)) rotate(var(--r));transition:transform .7s cubic-bezier(.2,.8,.2,1),box-shadow .4s;overflow:hidden;box-shadow:0 18px 40px -26px rgba(5,10,60,.6)}
.aa-rib:hover{box-shadow:0 26px 60px -24px rgba(5,10,60,.7);z-index:4}
.aa-rib-ink{background:var(--aa-ink);color:var(--aa-paper);display:flex;align-items:center}
.aa-marq{display:flex;width:max-content;animation:aa-marq var(--d,26s) linear infinite}
.aa-rib:hover .aa-marq{animation-play-state:paused}
.aa-marq-r{animation-direction:reverse}
.aa-marq-item{display:inline-flex;align-items:center;gap:clamp(10px,1.6cqi,22px);padding-right:clamp(16px,2.6cqi,36px);font-family:var(--aa-display);font-weight:800;font-size:clamp(17px,3cqi,40px);letter-spacing:-.01em;white-space:nowrap}
.aa-marq-item .aa-logo{width:clamp(30px,5.4cqi,74px);height:auto;color:var(--aa-paper)}
.aa-stage-foot{position:absolute;left:clamp(16px,3cqi,40px);right:clamp(16px,3cqi,40px);bottom:clamp(16px,3cqi,36px);display:grid;gap:16px;align-items:end;z-index:5;pointer-events:none}
.aa-stage-foot>*{pointer-events:auto}
.aa-stage-body{max-width:44ch;font-family:var(--aa-display);font-weight:700;font-size:clamp(11px,1.15cqi,13px);line-height:1.55;color:var(--aa-blue);background:color-mix(in srgb,var(--aa-paper) 88%,transparent);padding:8px 10px;justify-self:end}
.aa-stage-sign{display:flex;align-items:center;justify-content:space-between;gap:14px}
.aa-stage-sign b{font-family:var(--aa-display);font-weight:800;font-size:clamp(24px,3.4cqi,44px);letter-spacing:-.02em;background:var(--aa-paper);padding:0 .1em}
.aa-stage-sign .aa-logo{width:clamp(34px,4.4cqi,56px);height:auto;color:var(--aa-ink)}

/* projects */
.aa-proj-head{display:flex;flex-wrap:wrap;align-items:end;justify-content:space-between;gap:16px;margin-bottom:clamp(22px,3.4cqi,40px)}
.aa-proj-grid{display:grid;gap:14px}
@container (min-width:760px){.aa-proj-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.aa-stage-foot{grid-template-columns:1fr auto}}
.aa-card{position:relative;display:flex;flex-direction:column;border:1.5px solid var(--aa-line-strong);border-radius:22px;background:var(--aa-paper);overflow:hidden;transition:border-color .3s,transform .4s cubic-bezier(.2,.8,.2,1),box-shadow .4s}
.aa-card:hover{border-color:var(--aa-blue);transform:translateY(-3px);box-shadow:0 24px 50px -32px var(--aa-blue)}
.aa-card-top{position:relative;height:clamp(118px,15cqi,168px);overflow:hidden;--px:50%;--py:50%}
.aa-card-fill{position:absolute;inset:0;clip-path:circle(0% at var(--px) var(--py));transition:clip-path .8s cubic-bezier(.2,.8,.2,1)}
.aa-card:hover .aa-card-fill,.aa-card[data-open="true"] .aa-card-fill{clip-path:circle(150% at var(--px) var(--py))}
.aa-card-code{position:absolute;left:18px;bottom:6px;font-family:var(--aa-display);font-weight:800;font-size:clamp(54px,8cqi,96px);line-height:.9;letter-spacing:-.04em;color:var(--aa-blue);transition:color .5s}
.aa-card:hover .aa-card-code,.aa-card[data-open="true"] .aa-card-code{color:#ffffff}
.aa-card-top .aa-logo{position:absolute;right:16px;top:14px;width:44px;height:auto;color:var(--aa-blue);transition:color .5s}
.aa-card:hover .aa-card-top .aa-logo,.aa-card[data-open="true"] .aa-card-top .aa-logo{color:#ffffff}
.aa-card-body{display:flex;flex-direction:column;gap:10px;padding:18px 20px 20px}
.aa-chip{display:inline-flex;align-items:center;gap:6px;align-self:flex-start;padding:4px 10px;border-radius:999px;font-family:var(--aa-display);font-weight:800;font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;border:1.5px solid currentColor;color:var(--aa-blue)}
.aa-chip i{width:6px;height:6px;border-radius:9px;background:currentColor}
.aa-chip[data-s="ongoing"] i{animation:aa-blink 1.6s ease-in-out infinite}
.aa-chip[data-s="archived"]{color:var(--aa-muted)}
.aa-card h3{font-family:var(--aa-display);font-weight:800;font-size:clamp(20px,2.3cqi,26px);line-height:1.1;letter-spacing:-.02em}
.aa-card p{color:var(--aa-soft);font-size:14.5px}
.aa-bar{height:8px;border-radius:9px;background:var(--aa-line);overflow:hidden}
.aa-bar i{display:block;height:100%;border-radius:9px;background:var(--aa-blue);transform-origin:left;transition:transform 1.4s cubic-bezier(.2,.8,.2,1)}
.aa-more{display:grid;grid-template-rows:0fr;transition:grid-template-rows .5s cubic-bezier(.2,.8,.2,1)}
.aa-card[data-open="true"] .aa-more{grid-template-rows:1fr}
.aa-more>div{overflow:hidden}
.aa-more-in{display:flex;flex-direction:column;gap:14px;padding-top:6px}
.aa-card-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:4px}
.aa-toggle{display:inline-flex;align-items:center;gap:8px;font-family:var(--aa-display);font-weight:800;font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:var(--aa-blue)}
.aa-toggle svg{transition:transform .4s cubic-bezier(.2,.8,.2,1)}
.aa-toggle[aria-expanded="true"] svg{transform:rotate(45deg)}

/* nights */
.aa-nights{display:grid;gap:clamp(18px,3cqi,28px);margin-top:clamp(24px,4cqi,44px)}
@container (min-width:900px){.aa-nights{grid-template-columns:minmax(300px,.8fr) 1.4fr;align-items:start}}
.aa-sky{position:relative;display:flex;flex-direction:column;align-items:center;gap:16px;padding:24px 22px 22px;border-radius:26px;background:var(--aa-card);border:1.5px solid var(--aa-line);overflow:hidden}
.aa-sky-moon{position:relative;width:min(220px,62cqi);height:auto}
.aa-sky-moon .aa-orbit-spin{animation-duration:40s}
.aa-sky h3{font-family:var(--aa-display);font-weight:800;font-size:26px;letter-spacing:-.02em;line-height:1}
.aa-sky-row{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%}
.aa-sky-facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));width:100%;border-top:1px solid var(--aa-line-strong)}
.aa-sky-facts div{padding:12px 4px 0;text-align:center}
.aa-sky-facts b{display:block;font-family:var(--aa-display);font-weight:800;font-size:20px;color:var(--aa-blue);font-variant-numeric:tabular-nums}
.aa-step{display:inline-grid;place-items:center;width:36px;height:36px;border-radius:999px;border:1.5px solid var(--aa-line-strong);color:var(--aa-blue);transition:background-color .2s,color .2s,border-color .2s}
.aa-step:hover{background:var(--aa-blue);color:var(--aa-paper);border-color:var(--aa-blue)}
.aa-today{font-family:var(--aa-display);font-weight:800;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--aa-muted)}
.aa-today[data-on="true"]{color:var(--aa-blue);text-decoration:underline;text-underline-offset:3px}
.aa-filters{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
.aa-filter{padding:8px 14px;border-radius:999px;border:1.5px solid var(--aa-line-strong);font-family:var(--aa-display);font-weight:800;font-size:11.5px;letter-spacing:.04em;text-transform:uppercase;color:var(--aa-soft);transition:background-color .2s,color .2s,border-color .2s}
.aa-filter:hover{border-color:var(--aa-blue);color:var(--aa-blue)}
.aa-filter[aria-pressed="true"]{background:var(--aa-blue);border-color:var(--aa-blue);color:var(--aa-paper)}
.aa-events{display:flex;flex-direction:column;border-top:1.5px solid var(--aa-ink)}
.aa-event{display:grid;grid-template-columns:auto 1fr;gap:6px 16px;align-items:center;padding:16px 0;border-bottom:1px solid var(--aa-line-strong);animation:aa-rise .5s cubic-bezier(.2,.8,.2,1) both}
.aa-date{display:flex;flex-direction:column;align-items:center;justify-content:center;width:64px;height:68px;border-radius:16px;background:var(--aa-blue);color:var(--aa-paper);font-family:var(--aa-display);font-weight:800;line-height:1}
.aa-date b{font-size:26px;letter-spacing:-.03em}
.aa-date span{font-size:10px;letter-spacing:.08em;margin-top:4px}
.aa-event h3{font-family:var(--aa-display);font-weight:800;font-size:18px;line-height:1.15;letter-spacing:-.01em}
.aa-event-meta{display:flex;flex-wrap:wrap;align-items:center;gap:4px 12px;margin-top:4px;color:var(--aa-muted);font-size:13px}
.aa-event-meta svg{color:var(--aa-blue)}
.aa-event-act{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:12px}
.aa-going{font-size:12.5px;color:var(--aa-muted);font-variant-numeric:tabular-nums}
.aa-rsvp{min-width:118px;padding:10px 16px;font-size:11.5px}
.aa-rsvp[aria-pressed="true"]{background:var(--aa-blue);color:var(--aa-paper)}
.aa-empty{padding:28px 0;color:var(--aa-muted)}
@container (min-width:620px){.aa-event{grid-template-columns:auto 1fr auto}.aa-event-act{grid-column:auto;flex-direction:column;align-items:flex-end}}

/* join */
.aa-join{display:grid;gap:clamp(28px,5cqi,64px);margin-top:clamp(24px,4cqi,44px)}
@container (min-width:900px){.aa-join{grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);align-items:center}}
.aa-tiers{display:grid;gap:10px}
@container (min-width:620px){.aa-tiers{grid-template-columns:repeat(3,minmax(0,1fr))}}
.aa-tier{position:relative;display:flex;flex-direction:column;gap:8px;padding:16px;border-radius:18px;border:1.5px solid var(--aa-line-strong);background:var(--aa-paper);transition:border-color .25s,background-color .25s,transform .3s cubic-bezier(.2,.8,.2,1)}
.aa-tier:hover{border-color:var(--aa-blue);transform:translateY(-2px)}
.aa-tier[aria-checked="true"]{border-color:var(--aa-blue);background:color-mix(in srgb,var(--aa-blue) 8%,var(--aa-paper));box-shadow:inset 0 0 0 1px var(--aa-blue)}
.aa-tier-name{display:flex;align-items:center;justify-content:space-between;font-family:var(--aa-display);font-weight:800;font-size:15px;text-transform:uppercase;letter-spacing:.02em}
.aa-radio{width:18px;height:18px;border-radius:99px;border:2px solid var(--aa-line-strong);display:grid;place-items:center}
.aa-tier[aria-checked="true"] .aa-radio{border-color:var(--aa-blue)}
.aa-tier[aria-checked="true"] .aa-radio::after{content:"";width:8px;height:8px;border-radius:9px;background:var(--aa-blue)}
.aa-price{font-family:var(--aa-display);font-weight:800;font-size:28px;letter-spacing:-.03em;color:var(--aa-blue);line-height:1}
.aa-price small{font-size:13px;color:var(--aa-muted);letter-spacing:0}
.aa-tier ul{display:flex;flex-direction:column;gap:4px;font-size:13px;color:var(--aa-soft)}
.aa-tier li{display:flex;gap:7px;align-items:flex-start}
.aa-tier li svg{margin-top:4px;color:var(--aa-blue)}
.aa-badge{position:absolute;top:-10px;right:14px;padding:3px 9px;border-radius:99px;background:var(--aa-ink);color:var(--aa-paper);font-family:var(--aa-display);font-weight:800;font-size:9.5px;letter-spacing:.06em;text-transform:uppercase}
.aa-form{display:grid;gap:10px;margin-top:18px}
@container (min-width:620px){.aa-form{grid-template-columns:1fr 1fr auto}}
.aa-field{height:50px;padding:0 18px;border-radius:999px;border:1.5px solid var(--aa-line-strong);background:var(--aa-paper);outline:none;transition:border-color .2s,box-shadow .2s}
.aa-field::placeholder{color:var(--aa-muted)}
.aa-field:focus{border-color:var(--aa-blue);box-shadow:0 0 0 4px var(--aa-line)}
.aa-field[aria-invalid="true"]{border-color:#e5484d}
.aa-msg{min-height:22px;margin-top:10px;font-size:13.5px;color:var(--aa-muted)}
.aa-msg[data-s="error"]{color:#e5484d}
.aa-msg[data-s="done"]{color:var(--aa-blue);font-weight:700}
.aa-spin{width:14px;height:14px;border-radius:99px;border:2px solid currentColor;border-right-color:transparent;animation:aa-spin .7s linear infinite}
.aa-card-wrap{perspective:1100px;display:flex;flex-direction:column;align-items:center;gap:14px}
.aa-member{position:relative;width:min(100%,460px);aspect-ratio:1.586;border-radius:24px;overflow:hidden;color:#ffffff;transform:rotateX(var(--ry,0deg)) rotateY(var(--rx,0deg));transform-style:preserve-3d;transition:transform .5s cubic-bezier(.2,.8,.2,1),box-shadow .5s;box-shadow:0 34px 70px -34px rgba(8,14,80,.7);cursor:grab}
.aa-member-bg{position:absolute;inset:0;transition:opacity .5s}
.aa-member-rib{position:absolute;left:-12%;top:38%;width:130%;height:19%;background:var(--aa-ink);color:var(--aa-paper);transform:rotate(-14deg);display:flex;align-items:center;overflow:hidden}
.aa-member-rib .aa-marq-item{font-size:clamp(13px,2.4cqi,19px)}
.aa-member-rib .aa-logo{width:22px}
.aa-member-in{position:absolute;inset:0;background:linear-gradient(to top,rgba(4,6,40,.38),transparent 42%);display:flex;flex-direction:column;justify-content:space-between;padding:clamp(14px,2.4cqi,22px)}
.aa-member-top{display:flex;align-items:flex-start;justify-content:space-between}
.aa-member-top .aa-title{font-size:clamp(15px,2.2cqi,22px)}
.aa-member-top .aa-logo{width:clamp(34px,5cqi,52px);height:auto;color:#ffffff}
.aa-member-bottom{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;font-family:var(--aa-display);font-weight:800;text-transform:uppercase}
.aa-member-name{font-size:clamp(17px,2.8cqi,26px);line-height:1;letter-spacing:-.01em;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-shadow:0 2px 14px rgba(0,0,0,.18)}
.aa-member-bottom small{display:block;font-size:10px;letter-spacing:.08em;opacity:.85;margin-bottom:4px}
.aa-member-no{text-align:right;font-size:clamp(14px,2cqi,18px)}
.aa-member-shine{position:absolute;inset:0;background:linear-gradient(115deg,transparent 30%,rgba(255,255,255,.28) 46%,transparent 60%);background-size:250% 100%;background-position:var(--sx,100%) 0;mix-blend-mode:soft-light;pointer-events:none;transition:background-position .5s}
.aa-printed{animation:aa-print .9s cubic-bezier(.2,.8,.2,1)}

/* footer */
.aa-foot-band{position:relative;height:clamp(120px,16cqi,200px);color:#ffffff;overflow:hidden;margin-top:clamp(40px,7cqi,90px)}
.aa-foot-band .aa-title{position:absolute;left:clamp(16px,3cqi,40px);top:50%;transform:translateY(-58%);font-size:clamp(18px,3.8cqi,48px);z-index:1;pointer-events:none}
.aa-foot-band .aa-band-tag{top:auto;bottom:clamp(14px,2.4cqi,26px)}
.aa-foot{display:flex;flex-direction:column;align-items:center;gap:14px;padding:clamp(18px,3cqi,30px) 0 clamp(24px,4cqi,40px);text-align:center}
.aa-tagline{font-family:var(--aa-display);font-weight:800;font-size:clamp(15px,2.2cqi,26px);letter-spacing:.01em;color:var(--aa-blue);white-space:pre-wrap}
.aa-foot-links{display:flex;flex-wrap:wrap;justify-content:center;gap:4px 18px}
.aa-foot-links a{font-family:var(--aa-display);font-weight:700;font-size:12.5px;letter-spacing:.03em;text-transform:uppercase;color:var(--aa-soft);transition:color .2s}
.aa-foot-links a:hover{color:var(--aa-blue)}
.aa-foot-end{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px 16px;color:var(--aa-muted)}

@keyframes aa-spin{to{transform:rotate(360deg)}}
@keyframes aa-marq{to{transform:translateX(-50%)}}
@keyframes aa-blink{0%,100%{opacity:1}50%{opacity:.25}}
@keyframes aa-drop{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
@keyframes aa-rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes aa-print{0%{transform:translateY(16px) scale(.96);filter:brightness(1.6)}100%{transform:none;filter:none}}

@media (prefers-reduced-motion:reduce){
.aa-root,.aa-root :where(*){scroll-behavior:auto}
.aa-reveal{opacity:1;transform:none;transition:none}
.aa-marq,.aa-orbit-spin,.aa-pop-dot,.aa-chip i,.aa-event,.aa-printed,.aa-mobile{animation:none}
.aa-logo-arrow,.aa-logo-spin,.aa-rib,.aa-card,.aa-card-fill,.aa-member,.aa-ast,.aa-bar i,.aa-more{transition:none}
}
`

/* ---------------------------------------------------------------- helpers */

const useIsoLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect

function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false)
  React.useEffect(() => {
    if (typeof matchMedia !== "function") return
    const mq = matchMedia("(prefers-reduced-motion: reduce)")
    const on = () => setReduced(mq.matches)
    on()
    mq.addEventListener?.("change", on)
    return () => mq.removeEventListener?.("change", on)
  }, [])
  return reduced
}

// true once the element has been on screen
function useInView(threshold = 0.2) {
  const ref = React.useRef(null as HTMLElement | null)
  const [inView, setInView] = React.useState(false)
  React.useEffect(() => {
    const el = ref.current
    if (!el || inView) return
    if (typeof IntersectionObserver !== "function") {
      setInView(true)
      return
    }
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          setInView(true)
          io.disconnect()
        }
      },
      { threshold },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [inView, threshold])
  return [ref, inView] as const
}

/* ------------------------------------------------------------------- logo */

// The mark, in a 100-unit box: a ring, a "( U )" inside it, and an arrow
// that leaves the ring at the north-east like a compass needle. A paper-coloured
// slash runs through the ring under the arrow, so the needle reads as cut in.
const LOGO = {
  ring: "M14 50a36 36 0 1 0 72 0a36 36 0 1 0-72 0",
  left: "M34.4 34.4A22 22 0 0 0 34.4 65.6",
  right: "M65.6 34.4A22 22 0 0 1 65.6 65.6",
  u: "M43.5 41V53a6.5 6.5 0 0 0 13 0V41",
  bar: "M50 41V50",
  // pointing east; rotated -45° by default
  slash: "M8 50H86",
  arrow: "M86 50H98",
  head: "M85 38L98 50L85 62",
}

function LogoMark({ size = 40, follow = false, reduced = false, gap = "var(--aa-paper)", className = "", title }: { size?: number; follow?: boolean; reduced?: boolean; gap?: string; className?: string; title?: string }) {
  const svg = React.useRef(null as SVGSVGElement | null)
  const arrow = React.useRef(null as SVGGElement | null)
  React.useEffect(() => {
    if (!follow) return
    let raf = 0
    let deg = -45
    let px = 0
    let py = 0
    const apply = () => {
      raf = 0
      const el = svg.current
      const g = arrow.current
      if (!el || !g) return
      const r = el.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      if (Math.hypot(px - cx, py - cy) < r.width * 0.3) return
      deg = unwrapAngle(deg, (Math.atan2(py - cy, px - cx) * 180) / Math.PI)
      g.style.transform = "rotate(" + deg.toFixed(1) + "deg)"
    }
    const move = (e: PointerEvent) => {
      px = e.clientX
      py = e.clientY
      if (!raf) raf = requestAnimationFrame(apply)
    }
    addEventListener("pointermove", move, { passive: true })
    return () => {
      removeEventListener("pointermove", move)
      cancelAnimationFrame(raf)
    }
  }, [follow])
  return (
    <svg
      ref={svg}
      className={"aa-logo " + className}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <g className="aa-logo-spin">
        <path d={LOGO.ring} strokeWidth="9" />
        <path d={LOGO.left} strokeWidth="6.5" />
        <path d={LOGO.right} strokeWidth="6.5" />
        <path d={LOGO.u} strokeWidth="6.5" />
        <path d={LOGO.bar} strokeWidth="5" />
      </g>
      <g ref={arrow} className="aa-logo-arrow" style={{ transform: "rotate(-45deg)", transition: reduced ? "none" : undefined }}>
        <path d={LOGO.slash} strokeWidth="5" stroke={gap} strokeLinecap="butt" style={{ transform: "translate(0,8px)" }} />
        <path d={LOGO.arrow} strokeWidth="8" />
        <path d={LOGO.head} strokeWidth="7" strokeLinejoin="round" />
      </g>
    </svg>
  )
}

function Asterisk({ size = 22, className = "", style }: { size?: number; className?: string; style?: React.CSSProperties }) {
  const [turn, setTurn] = React.useState(0)
  return (
    <button
      type="button"
      className={"aa-ast " + className}
      style={{ ...style, transform: turn ? "rotate(" + turn * 120 + "deg)" : undefined }}
      onClick={() => setTurn((t) => t + 1)}
      aria-label="Spin"
      tabIndex={-1}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" aria-hidden="true">
        <path d="M12 2.5v19M3.8 7.25l16.4 9.5M3.8 16.75l16.4-9.5" />
      </svg>
    </button>
  )
}

// the last line of a title, kept on one line
function Echo({ text }: { text: string }) {
  return <span className="aa-echo">{text}</span>
}

function Title({ text, className = "", as = "div" }: { text: string; className?: string; as?: "div" | "h1" | "h2" }) {
  const ls = lines(text)
  const Tag = as
  return (
    <Tag className={"aa-title " + className}>
      {ls.map((l, i) => (
        <span key={i}>{i === ls.length - 1 ? <Echo text={l} /> : l}</span>
      ))}
    </Tag>
  )
}

function Arrow({ size = 14 }: { size?: number }) {
  return (
    <svg className="aa-arr" width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  )
}

function Plus() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M8 2.5v11M2.5 8h11" />
    </svg>
  )
}

function Check() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 6.5l2.6 2.5L10 3.5" />
    </svg>
  )
}

function Pin() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M8 14.5s5-4.6 5-8.5a5 5 0 1 0-10 0c0 3.9 5 8.5 5 8.5z" />
      <circle cx="8" cy="6" r="1.7" />
    </svg>
  )
}

function Scope() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M2 11l9-6 1.5 2.5-9 6zM11 5l2-1.5 1.5 2.5-2 1.5M6 12l-1.5 3M7.5 11l1.5 3.5" />
    </svg>
  )
}

function ThemeIcon({ dark }: { dark: boolean }) {
  return dark ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8L6 18M18 6l1.8-1.8" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a8.5 8.5 0 1 0 11.1 11.1z" />
    </svg>
  )
}

/* ---------------------------------------------------------------- bubbles */

type BubbleMask =
  | { kind: "text"; text: string; font: string; /** fraction of the width the word spans */ fit: number; x: number; baseline: number }
  | { kind: "logo"; cx: number; cy: number; /** logo box, as a fraction of the field's height */ size: number; bar?: boolean }
  | null

type Spark = { x: number; y: number; vx: number; vy: number; r: number; c: number; life: number }

// A seeded, living confetti field on canvas. Bubbles drift, scatter from the
// pointer and pop on click. A mask either keeps only what's inside a word, or
// knocks the logo out of the field so the page shows through.
function Bubbles({
  seed,
  colors,
  density = 1,
  scale = 1,
  mask = null,
  reduced,
  interactive = true,
  onPop,
}: {
  seed: number
  colors: string[]
  density?: number
  scale?: number
  mask?: BubbleMask
  reduced: boolean
  interactive?: boolean
  onPop?: () => void
}) {
  const ref = React.useRef(null as HTMLCanvasElement | null)
  const live = React.useRef({ colors, mask, onPop })
  live.current = { colors, mask, onPop }
  const redraw = React.useRef(() => {})
  const maskKey = mask ? JSON.stringify(mask) : ""

  React.useEffect(() => {
    const cv = ref.current
    const ctx = cv?.getContext("2d")
    if (!cv || !ctx) return
    const host = (cv.parentElement?.parentElement ?? cv.parentElement) as HTMLElement
    const rand = mulberry32(seed ^ 0x5bd1e995)
    let w = 0
    let h = 0
    let dpr = 1
    let list: (Bubble & { ox: number; oy: number; s: number })[] = []
    let sparks: Spark[] = []
    let raf = 0
    let running = false
    let visible = true
    let knock = null as HTMLCanvasElement | null
    const ptr = { x: -1e4, y: -1e4, on: false, dx: 0, dy: 0, down: false }

    const buildKnock = () => {
      const m = live.current.mask
      knock = null
      if (!m || m.kind !== "logo" || typeof Path2D !== "function" || !w || !h) return
      const off = document.createElement("canvas")
      off.width = Math.round(w * dpr)
      off.height = Math.round(h * dpr)
      const o = off.getContext("2d")
      if (!o) return
      const s = (h * m.size) / 100
      o.setTransform(dpr, 0, 0, dpr, 0, 0)
      o.translate(m.cx * w - s * 50, m.cy * h - s * 50)
      o.scale(s, s)
      o.lineCap = "round"
      o.strokeStyle = "#000"
      o.lineWidth = 9
      o.stroke(new Path2D(LOGO.ring))
      o.lineWidth = 6.5
      o.stroke(new Path2D(LOGO.left))
      o.stroke(new Path2D(LOGO.right))
      o.stroke(new Path2D(LOGO.u))
      o.lineWidth = 5
      o.stroke(new Path2D(LOGO.bar))
      o.translate(50, 50)
      o.rotate(-Math.PI / 4)
      o.translate(-50, -50)
      // the slash gives bubbles back
      o.globalCompositeOperation = "destination-out"
      o.lineCap = "butt"
      o.lineWidth = 5
      o.translate(0, 8)
      o.stroke(new Path2D(LOGO.slash))
      o.translate(0, -8)
      o.globalCompositeOperation = "source-over"
      o.lineCap = "round"
      o.lineWidth = 8
      o.stroke(new Path2D(LOGO.arrow))
      o.lineJoin = "round"
      o.lineWidth = 7
      o.stroke(new Path2D(LOGO.head))
      if (m.bar) {
        o.setTransform(dpr, 0, 0, dpr, 0, 0)
        o.fillRect(w * 0.72, h * 0.74, w * 0.3, h * 0.1)
      }
      knock = off
    }

    let textSize = 0
    let textFor = ""
    const draw = (t: number) => {
      const { colors: cols, mask: m } = live.current
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.globalCompositeOperation = "source-over"
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = cols[0] ?? "#2233ff"
      ctx.fillRect(0, 0, w, h)
      const ts = t / 1000
      const R = Math.max(70, Math.min(h, w) * 0.34)
      for (const b of list) {
        let tx = 0
        let ty = 0
        if (ptr.on) {
          const dx = b.x + b.ox - ptr.x
          const dy = b.y + b.oy - ptr.y
          const d = Math.hypot(dx, dy) || 1
          const reach = R + b.r
          if (d < reach) {
            const f = 1 - d / reach
            const push = f * f * R * 0.6
            tx = (dx / d) * push + ptr.dx * f * 0.6
            ty = (dy / d) * push + ptr.dy * f * 0.6
          }
        }
        if (reduced) {
          b.ox = tx
          b.oy = ty
          b.s = 1
        } else {
          b.ox += (tx - b.ox) * 0.09
          b.oy += (ty - b.oy) * 0.09
          b.s += (1 - b.s) * 0.07
        }
        const wx = reduced ? 0 : Math.sin(ts * b.sp + b.ph) * b.amp
        const wy = reduced ? 0 : Math.cos(ts * b.sp * 0.8 + b.ph) * b.amp
        ctx.fillStyle = cols[b.c % cols.length]
        ctx.beginPath()
        ctx.arc(b.x + b.ox + wx, b.y + b.oy + wy, Math.max(0.1, b.r * b.s), 0, Math.PI * 2)
        ctx.fill()
      }
      ptr.dx *= 0.85
      ptr.dy *= 0.85
      if (sparks.length) {
        for (const s of sparks) {
          s.x += s.vx
          s.y += s.vy
          s.vx *= 0.94
          s.vy = s.vy * 0.94 - 0.05
          s.life -= 0.022
          if (s.life <= 0) continue
          ctx.fillStyle = cols[s.c % cols.length]
          ctx.beginPath()
          ctx.arc(s.x, s.y, s.r * s.life, 0, Math.PI * 2)
          ctx.fill()
        }
        sparks = sparks.filter((s) => s.life > 0)
      }
      if (m && m.kind === "text") {
        const key = m.font + "|" + m.text + "|" + w + "|" + h + "|" + m.fit
        if (key !== textFor) {
          ctx.font = "800 100px " + m.font
          const mw = ctx.measureText(m.text).width || 1
          textSize = Math.min((100 * w * m.fit) / mw, h * 1.32)
          textFor = key
        }
        ctx.globalCompositeOperation = "destination-in"
        ctx.fillStyle = "#000"
        ctx.font = "800 " + textSize.toFixed(1) + "px " + m.font
        ctx.textBaseline = "alphabetic"
        ctx.fillText(m.text, w * m.x, h * m.baseline)
      } else if (knock) {
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.globalCompositeOperation = "destination-out"
        ctx.drawImage(knock, 0, 0)
      }
    }

    const loop = (t: number) => {
      draw(t)
      raf = requestAnimationFrame(loop)
    }
    const start = () => {
      if (running || reduced || !visible || !w) return
      running = true
      raf = requestAnimationFrame(loop)
    }
    const stop = () => {
      running = false
      cancelAnimationFrame(raf)
    }
    redraw.current = () => {
      buildKnock()
      if (!running) draw(performance.now())
    }

    const resize = () => {
      // layout size, not the transformed box: a rotated ribbon must not stretch its bubbles
      if (!cv.clientWidth || !cv.clientHeight) return
      w = cv.clientWidth
      h = cv.clientHeight
      dpr = Math.min(2, devicePixelRatio || 1)
      cv.width = Math.round(w * dpr)
      cv.height = Math.round(h * dpr)
      list = buildBubbles(seed, w, h, live.current.colors.length, density, scale).map((b) => ({ ...b, ox: 0, oy: 0, s: 1 }))
      textFor = ""
      buildKnock()
      draw(performance.now())
      start()
    }

    const local = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect()
      return [e.clientX - r.left, e.clientY - r.top] as const
    }
    const onMove = (e: PointerEvent) => {
      const [x, y] = local(e)
      if (ptr.on) {
        ptr.dx = clamp(x - ptr.x, -40, 40)
        ptr.dy = clamp(y - ptr.y, -40, 40)
      }
      ptr.x = x
      ptr.y = y
      ptr.on = x >= -40 && y >= -40 && x <= w + 40 && y <= h + 40
      if (!running) draw(performance.now())
    }
    const onLeave = () => {
      ptr.on = false
      if (!running) draw(performance.now())
    }
    let downAt = [0, 0]
    const onDown = (e: PointerEvent) => {
      downAt = [e.clientX, e.clientY]
    }
    const onUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return
      if ((e.target as HTMLElement | null)?.closest?.("a,button,input,label,select,textarea")) return
      const [x, y] = local(e)
      if (x < 0 || y < 0 || x > w || y > h) return
      // only what you can see pops: the pixel under the pointer must be painted
      const px = ctx.getImageData(Math.round(x * dpr), Math.round(y * dpr), 1, 1).data
      if (px[3] < 10) return
      for (let i = list.length - 1; i >= 0; i--) {
        const b = list[i]
        if (Math.hypot(b.x + b.ox - x, b.y + b.oy - y) > b.r * b.s + 2) continue
        const n = live.current.colors.length
        const old = b.c
        b.c = 1 + ((b.c + Math.floor(rand() * (n - 2))) % Math.max(1, n - 1))
        b.s = reduced ? 1 : 0
        if (!reduced) {
          for (let k = 0; k < 9; k++) {
            const a = (k / 9) * Math.PI * 2 + rand() * 0.5
            const sp = 2 + rand() * 4
            sparks.push({ x: b.x + b.ox, y: b.y + b.oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: b.r * (0.18 + rand() * 0.22), c: old, life: 1 })
          }
        }
        live.current.onPop?.()
        if (!running) draw(performance.now())
        break
      }
    }

    resize()
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null
    ro?.observe(cv)
    const io =
      typeof IntersectionObserver === "function"
        ? new IntersectionObserver((es) => {
            visible = es.some((e) => e.isIntersecting)
            if (visible) start()
            else stop()
          })
        : null
    io?.observe(cv)
    const vis = () => (document.hidden ? stop() : start())
    document.addEventListener("visibilitychange", vis)
    if (interactive) {
      host.addEventListener("pointermove", onMove, { passive: true })
      host.addEventListener("pointerleave", onLeave)
      host.addEventListener("pointerdown", onDown)
      host.addEventListener("pointerup", onUp)
    }
    // a webfont the host loads later changes the word's width
    const fonts = (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts
    let alive = true
    fonts?.ready?.then(() => {
      if (!alive) return
      textFor = ""
      if (!running) draw(performance.now())
    })
    return () => {
      alive = false
      stop()
      ro?.disconnect()
      io?.disconnect()
      document.removeEventListener("visibilitychange", vis)
      host.removeEventListener("pointermove", onMove)
      host.removeEventListener("pointerleave", onLeave)
      host.removeEventListener("pointerdown", onDown)
      host.removeEventListener("pointerup", onUp)
    }
  }, [seed, density, scale, reduced, interactive])

  // palette swaps and mask changes repaint without reshuffling
  React.useEffect(() => {
    redraw.current()
  }, [colors, maskKey])

  return (
    <div className="aa-bub" aria-hidden="true">
      <canvas ref={ref} />
    </div>
  )
}

/* ------------------------------------------------------------------- moon */

function Moon({ fraction, colors, uid, size = 220, spin = true }: { fraction: number; colors: string[]; uid: string; size?: number; spin?: boolean }) {
  const dots = React.useMemo(() => buildBubbles(31, 100, 100, colors.length, 1.4, 1.1), [colors.length])
  const id = uid + "-moon"
  return (
    <svg className="aa-sky-moon" width={size} height={size} viewBox="-70 -70 140 140" aria-hidden="true">
      <defs>
        <clipPath id={id}>
          <path d={moonPath(fraction, 50)} />
        </clipPath>
      </defs>
      <g className={spin ? "aa-orbit-spin" : undefined}>
        <circle r="64" fill="none" stroke="var(--aa-line-strong)" strokeWidth="1" strokeDasharray="1 5" strokeLinecap="round" />
        <circle cx="64" r="3.5" fill="var(--aa-blue)" />
      </g>
      <circle r="50" fill="var(--aa-moon)" />
      <g clipPath={"url(#" + id + ")"}>
        <rect x="-50" y="-50" width="100" height="100" fill={colors[0]} />
        {dots.map((b, i) => (
          <circle key={i} cx={b.x - 50} cy={b.y - 50} r={b.r} fill={colors[b.c % colors.length]} />
        ))}
      </g>
      <circle r="50" fill="none" stroke="var(--aa-line-strong)" strokeWidth="1" />
    </svg>
  )
}

function MiniMoon({ fraction }: { fraction: number }) {
  return (
    <svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
      <circle r="6" fill="var(--aa-moon)" stroke="var(--aa-line-strong)" strokeWidth=".8" />
      <path d={moonPath(fraction, 6)} fill="currentColor" />
    </svg>
  )
}

/* ------------------------------------------------------------------ stats */

function StatValue({ value, run, reduced }: { value: string; run: boolean; reduced: boolean }) {
  const [t, setT] = React.useState(reduced ? 1 : 0)
  React.useEffect(() => {
    if (!run) return
    if (reduced) {
      setT(1)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = clamp((now - t0) / 1600, 0, 1)
      setT(p)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [run, reduced])
  return <>{formatStat(value, t)}</>
}

/* ------------------------------------------------------------------ marquee */

function Marquee({ text, reverse, duration = 26, big }: { text: string; reverse?: boolean; duration?: number; big?: boolean }) {
  // each half must outrun the longest ribbon (190% of the stage), or its tail shows mid-loop
  const REPS = 10
  const items = Array.from({ length: REPS })
  const run = (key: string) => (
    <div key={key} style={{ display: "flex" }} aria-hidden={key === "b" ? true : undefined}>
      {items.map((_, i) => (
        <span className="aa-marq-item" key={i}>
          {text}
          <LogoMark size={big ? 64 : 36} gap="var(--aa-ink)" />
        </span>
      ))}
    </div>
  )
  return (
    <div className={"aa-marq" + (reverse ? " aa-marq-r" : "")} style={{ ["--d" as string]: (duration * REPS) / 4 + "s" } as React.CSSProperties}>
      {run("a")}
      {run("b")}
    </div>
  )
}

/* ----------------------------------------------------------------- template */

export default function AstroAssociationTemplate({
  brand = "ASTRO.",
  nav = D_NAV,
  navCta = "Join",
  hero,
  mission,
  projects = D_PROJECTS,
  projectsCopy,
  nightsTag = "Observation nights",
  nightsTitle = "Clear skies, together.",
  nights = D_NIGHTS,
  tiers = D_TIERS,
  join,
  footer,
  palette = "cobalt",
  paletteSwitcher = true,
  onPaletteChange,
  seed = 102,
  onPop,
  onNavCta,
  onContribute,
  onRsvp,
  onJoin,
  skyDate,
  fonts,
  defaultTheme = "system",
  onThemeChange,
  maxWidth = "1240px",
  height = "100svh",
  className = "",
}: AstroAssociationTemplateProps) {
  const uid = "aa" + React.useId().replace(/[^a-zA-Z0-9]/g, "")
  const reduced = useReducedMotion()
  const H = { ...D_HERO, ...hero }
  const M = { ...D_MISSION, ...mission }
  const PC = { ...D_PROJECTS_COPY, ...projectsCopy }
  const J = { ...D_JOIN, ...join }
  const F = { ...D_FOOTER, ...footer }
  const display = fonts?.display ?? FONT_DISPLAY

  /* palette */
  const initial = typeof palette === "string" ? PALETTES[palette] ?? PALETTES.cobalt : palette
  const [pal, setPal] = React.useState(initial)
  const palKey = typeof palette === "string" ? palette : palette.name + palette.colors.join("")
  React.useEffect(() => setPal(typeof palette === "string" ? PALETTES[palette] ?? PALETTES.cobalt : palette), [palKey])
  const swatches = React.useMemo(() => {
    const list = PALETTE_ORDER.map((k) => PALETTES[k])
    return typeof palette === "string" ? list : [palette, ...list]
  }, [palKey])
  const pickPalette = (p: AstroPalette) => {
    setPal(p)
    onPaletteChange?.(p)
  }
  const colors = pal.colors.length ? pal.colors : PALETTES.cobalt.colors

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

  /* sections + nav */
  const sections = React.useRef({} as Record<string, HTMLElement | null>)
  const setSection = (key: string) => (el: HTMLElement | null) => {
    sections.current[key] = el
  }
  const [active, setActive] = React.useState("")
  const [menu, setMenu] = React.useState(false)
  React.useEffect(() => {
    if (typeof IntersectionObserver !== "function") return
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) if (e.isIntersecting) setActive((e.target as HTMLElement).dataset.section ?? "")
      },
      { rootMargin: "-40% 0px -55% 0px" },
    )
    Object.values(sections.current).forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [])
  const scrollTo = (target: string) => {
    const el = sections.current[target]
    setMenu(false)
    if (!el) return false
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" })
    setActive(target)
    return true
  }
  const go = (target: string) => (e: React.MouseEvent) => {
    if (scrollTo(target)) e.preventDefault()
  }
  const navCtaClick = () => {
    if (onNavCta) onNavCta()
    else scrollTo("join")
  }

  /* hero */
  const [pops, setPops] = React.useState(0)
  const popsRef = React.useRef(0)
  const onPopRef = React.useRef(onPop)
  onPopRef.current = onPop
  const handlePop = React.useCallback(() => {
    popsRef.current += 1
    setPops(popsRef.current)
    onPopRef.current?.(popsRef.current)
  }, [])
  const [wide, setWide] = React.useState(true)
  const shellRef = React.useRef(null as HTMLDivElement | null)
  useIsoLayoutEffect(() => {
    const el = shellRef.current
    if (!el) return
    const read = () => setWide(el.clientWidth >= 640)
    read()
    if (typeof ResizeObserver !== "function") return
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const wordMask = React.useMemo(
    () => ({ kind: "text" as const, text: H.wordmark, font: display, fit: wide ? 0.9 : 1.04, x: wide ? -0.025 : -0.03, baseline: 0.8 }),
    [H.wordmark, display, wide],
  )
  const bandMask = React.useMemo(() => ({ kind: "logo" as const, cx: wide ? 0.5 : 0.66, cy: 0.5, size: 0.92, bar: wide }), [wide])
  const footMask = React.useMemo(() => ({ kind: "logo" as const, cx: 0.52, cy: 0.88, size: 1.9 }), [])

  /* ribbons follow the pointer a little */
  const stageRef = React.useRef(null as HTMLDivElement | null)
  const onStageMove = (e: React.PointerEvent) => {
    const el = stageRef.current
    if (!el || reduced) return
    const r = el.getBoundingClientRect()
    el.style.setProperty("--mx", (((e.clientX - r.left) / r.width - 0.5) * 2).toFixed(3))
    el.style.setProperty("--my", (((e.clientY - r.top) / r.height - 0.5) * 2).toFixed(3))
  }
  const onStageLeave = () => {
    stageRef.current?.style.setProperty("--mx", "0")
    stageRef.current?.style.setProperty("--my", "0")
  }

  /* projects */
  const [open, setOpen] = React.useState(-1)
  const cardFill = (i: number) => bubbleCss(seed * 31 + i * 7, colors, 30, 52)
  const aimFill = (e: React.PointerEvent) => {
    const el = e.currentTarget as HTMLElement
    const r = el.getBoundingClientRect()
    el.style.setProperty("--px", (((e.clientX - r.left) / r.width) * 100).toFixed(1) + "%")
    el.style.setProperty("--py", (((e.clientY - r.top) / r.height) * 100).toFixed(1) + "%")
  }

  /* sky */
  const baseDay = React.useMemo(() => {
    const d = skyDate ? new Date(skyDate) : new Date()
    return isNaN(d.getTime()) ? new Date() : d
  }, [skyDate instanceof Date ? skyDate.getTime() : skyDate])
  const [dayOffset, setDayOffset] = React.useState(0)
  const skyDay = new Date(baseDay.getTime() + dayOffset * 86400000)
  skyDay.setHours(22, 0, 0, 0)
  const moon = moonPhase(skyDay)
  const moonlight = moon.illumination < 0.25 ? "Dark" : moon.illumination < 0.65 ? "Fair" : "Bright"

  /* nights */
  const kinds = React.useMemo(() => ["All", ...Array.from(new Set(nights.map((n) => n.kind)))], [nights])
  const [kind, setKind] = React.useState("All")
  const [going, setGoing] = React.useState({} as Record<string, boolean>)
  const shown = nights.map((n, i) => ({ n, i })).filter(({ n }) => kind === "All" || n.kind === kind)
  const toggleRsvp = (n: AstroNight, i: number) => {
    const key = n.date + i
    const next = !going[key]
    setGoing((g) => ({ ...g, [key]: next }))
    onRsvp?.(n, next)
  }

  /* join */
  const featuredTier = Math.max(0, tiers.findIndex((t) => t.featured))
  const [tier, setTier] = React.useState(featuredTier)
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [status, setStatus] = React.useState("idle" as Status)
  const [msg, setMsg] = React.useState("")
  const [printed, setPrinted] = React.useState(0)
  const number = memberNumber(name || "guest", email)
  const chosen = tiers[tier] ?? tiers[0]
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (status === "loading") return
    if (!name.trim()) {
      setStatus("error")
      setMsg("Your card needs a name.")
      return
    }
    if (!isEmail(email)) {
      setStatus("error")
      setMsg("That email doesn't look right.")
      return
    }
    setStatus("loading")
    setMsg("Printing your card…")
    try {
      const member: AstroMember = { name: name.trim(), email: email.trim(), tier: chosen?.name ?? "", number }
      if (onJoin) await onJoin(member)
      else await new Promise((r) => setTimeout(r, 900))
      setStatus("done")
      setMsg(J.success.replace("{name}", firstName(name)))
      setPrinted((p) => p + 1)
    } catch {
      setStatus("error")
      setMsg("Something went wrong. Try again in a moment.")
    }
  }
  const cardRef = React.useRef(null as HTMLDivElement | null)
  const tilt = (e: React.PointerEvent) => {
    const el = cardRef.current
    if (!el || reduced) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    el.style.setProperty("--rx", (x * 16).toFixed(2) + "deg")
    el.style.setProperty("--ry", (-y * 12).toFixed(2) + "deg")
    el.style.setProperty("--sx", ((1 - (x + 0.5)) * 100).toFixed(1) + "%")
  }
  const untilt = () => {
    const el = cardRef.current
    if (!el) return
    el.style.setProperty("--rx", "0deg")
    el.style.setProperty("--ry", "0deg")
    el.style.setProperty("--sx", "100%")
  }

  /* reveals */
  const [missionRef, missionIn] = useInView(0.15)
  const [projRef, projIn] = useInView(0.1)
  const [nightsRef, nightsIn] = useInView(0.12)
  const [joinRef, joinIn] = useInView(0.12)

  const rootStyle = {
    minHeight: height,
    "--aa-h": height,
    "--aa-max": maxWidth,
    "--aa-accent": pal.accent,
    "--aa-frame": pal.frame,
    "--aa-display": display,
    "--aa-body": fonts?.body ?? display,
    "--aa-mono": fonts?.mono ?? FONT_MONO,
  } as React.CSSProperties

  const navLink = (l: AstroNavLink, i: number) => {
    const internal = SECTION_KEYS.includes(l.target)
    return (
      <a
        key={i}
        className="aa-link"
        href={internal ? "#" + l.target : l.target}
        aria-current={internal && active === l.target ? "true" : undefined}
        onClick={internal ? go(l.target) : undefined}
      >
        {l.label}
      </a>
    )
  }

  const swatchRow = paletteSwitcher ? (
    <div className="aa-swatches" role="radiogroup" aria-label="Bubble palette">
      {swatches.map((p, i) => (
        <button
          key={p.name + i}
          type="button"
          role="radio"
          aria-checked={p.name === pal.name && p.accent === pal.accent}
          aria-label={p.name + " palette"}
          title={p.name}
          className="aa-sw"
          style={{ background: "conic-gradient(" + [p.colors[1], p.colors[4], p.colors[6], p.colors[1]].join(",") + ")" }}
          onClick={() => pickPalette(p)}
        />
      ))}
    </div>
  ) : null

  return (
    <div className={"aa-root " + className} data-theme={theme} style={rootStyle}>
      <style>{AA_CSS}</style>
      <div className="aa-shell" ref={shellRef}>
        {/* ------------------------------------------------------------ nav */}
        <header className="aa-nav">
          <div className="aa-in">
            <a className="aa-brand" href="#home" onClick={go("home")} aria-label={brand + " home"}>
              <LogoMark size={34} follow reduced={reduced} />
              <span>{brand}</span>
            </a>
            <span className="aa-issue">{H.issue}</span>
            <nav className="aa-links" aria-label="Sections">
              {nav.map(navLink)}
            </nav>
            <div className="aa-nav-end">
              {swatchRow}
              <button type="button" className="aa-icon" onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
                <ThemeIcon dark={theme === "dark"} />
              </button>
              <button type="button" className="aa-btn aa-btn-solid" onClick={navCtaClick}>
                {navCta}
                <Arrow size={12} />
              </button>
              <button type="button" className="aa-icon aa-menu-btn" aria-expanded={menu} aria-label="Menu" onClick={() => setMenu((m) => !m)}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  {menu ? <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" /> : <path d="M2.5 5h11M2.5 11h11" />}
                </svg>
              </button>
            </div>
          </div>
          {menu && (
            <nav className="aa-mobile" aria-label="Sections">
              {nav.map(navLink)}
              {swatchRow}
            </nav>
          )}
        </header>

        {/* ----------------------------------------------------------- hero */}
        <section className="aa-hero aa-sec" ref={setSection("home")} data-section="home">
          <div className="aa-orbits" aria-hidden="true">
            <svg style={{ left: "38%", top: "-30%", width: "90cqi", height: "90cqi" }} viewBox="0 0 100 100" fill="none">
              <g className="aa-orbit-spin">
                <circle cx="50" cy="50" r="49" stroke="currentColor" strokeWidth=".15" />
                <circle cx="99" cy="50" r=".9" fill="var(--aa-blue)" />
              </g>
            </svg>
            <svg style={{ left: "-22%", top: "30%", width: "60cqi", height: "60cqi" }} viewBox="0 0 100 100" fill="none">
              <g className="aa-orbit-spin aa-orbit-spin-r">
                <circle cx="50" cy="50" r="49" stroke="currentColor" strokeWidth=".2" />
                <circle cx="50" cy="1" r="1.4" fill={colors[6]} />
                {Array.from({ length: 14 }).map((_, i) => {
                  const a = Math.PI * 0.62 + i * 0.075
                  return <circle key={i} cx={50 + Math.cos(a) * 44} cy={50 + Math.sin(a) * 44} r={0.35 + (14 - i) * 0.06} fill={colors[(i % (colors.length - 1)) + 1]} opacity={0.4 + (14 - i) / 28} />
                })}
              </g>
            </svg>
          </div>

          <h1 className="aa-sr">{lines(H.title).join(" ")}</h1>
          <div className="aa-wm">
            <Bubbles seed={seed} colors={colors} density={2} scale={0.4} mask={wordMask} reduced={reduced} onPop={handlePop} />
            <div className="aa-hero-mark">
              <LogoMark size={150} follow reduced={reduced} title={brand + " logo"} />
              {wide && <Title text={H.title} className="aa-hero-title" />}
            </div>
          </div>

          <div className="aa-in">
            <div className="aa-hero-row">
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <span className="aa-issue-big">{H.issue}</span>
                {!wide && <Title text={H.title} className="aa-hero-title" />}
                {H.hint && (
                  <span className="aa-hint aa-mono" aria-live="polite">
                    <i className="aa-pop-dot" />
                    {H.hint}
                    {pops > 0 && <b>{pops} popped</b>}
                  </span>
                )}
              </div>
              <div className="aa-hero-copy">
                <Asterisk size={20} style={{ alignSelf: "flex-start" }} />
                <p>{H.blurb}</p>
                <div className="aa-ctas">
                  <button type="button" className="aa-btn aa-btn-solid" onClick={navCtaClick}>
                    {H.primaryCta}
                    <Arrow />
                  </button>
                  <button type="button" className="aa-btn aa-btn-line" onClick={() => scrollTo("nights")}>
                    {H.secondaryCta}
                  </button>
                </div>
                <div className="aa-credit">{H.credit}</div>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------- mission */}
        <section className="aa-sec" ref={setSection("mission")} data-section="mission">
          <div className="aa-band">
            <Bubbles seed={seed + 1} colors={colors} density={2} scale={0.42} mask={bandMask} reduced={reduced} onPop={handlePop} />
            <Title text={M.bandTitle} className="aa-band-title" />
            <Asterisk size={18} />
          </div>
          <div className="aa-in">
            <div className="aa-kicker">
              <span className="aa-label">{M.kicker}</span>
              <Asterisk size={26} />
            </div>
            {M.meta.length > 0 && (
              <div className="aa-meta">
                {M.meta.map((m, i) => (
                  <span key={i} className="aa-label">
                    {m}
                  </span>
                ))}
              </div>
            )}
            <div className="aa-mission aa-reveal" ref={missionRef as React.Ref<HTMLDivElement>} data-in={missionIn}>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <h2 className="aa-h2">{M.title}</h2>
                <p className="aa-lede">{M.body}</p>
              </div>
              <dl className="aa-stats">
                {M.stats.map((s, i) => (
                  <div className="aa-stat" key={i}>
                    <dt>
                      <StatValue value={s.value} run={missionIn} reduced={reduced} />
                    </dt>
                    <dd className="aa-mono" style={{ color: "var(--aa-muted)" }}>
                      {s.label}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------- projects */}
        <section className="aa-sec aa-pad" ref={setSection("projects")} data-section="projects" style={{ paddingTop: 0 }}>
          <div className="aa-stage" ref={stageRef} onPointerMove={onStageMove} onPointerLeave={onStageLeave}>
            <div className="aa-orbits" aria-hidden="true">
              <svg style={{ left: "-12%", top: "8%", width: "64cqi", height: "64cqi" }} viewBox="0 0 100 100" fill="none">
                <circle cx="50" cy="50" r="49" stroke="currentColor" strokeWidth=".18" />
                <circle cx="50" cy="50" r="20" stroke="currentColor" strokeWidth=".18" />
              </svg>
            </div>
            <div className="aa-stage-type aa-title" aria-hidden="true">
              {lines(PC.title).map((l, i, all) => (
                <span key={i} style={{ position: "relative", display: "block" }}>
                  {i === all.length - 1 ? <Echo text={l} /> : l}
                  {i === all.length - 1 && PC.issue && <sup>{PC.issue}</sup>}
                </span>
              ))}
            </div>
            <div className="aa-rib" style={{ ["--x" as string]: "26%", ["--y" as string]: "62%", ["--w" as string]: "190%", ["--r" as string]: "-32deg", ["--k" as string]: "10" } as React.CSSProperties}>
              <Bubbles seed={seed + 2} colors={colors} density={1.8} scale={0.7} reduced={reduced} interactive={false} />
            </div>
            <div className="aa-rib aa-rib-ink" style={{ ["--x" as string]: "33%", ["--y" as string]: "56%", ["--w" as string]: "190%", ["--r" as string]: "70deg", ["--k" as string]: "-14" } as React.CSSProperties}>
              <Marquee text={lines(PC.title).slice(-1)[0] ?? ""} duration={30} big />
            </div>
            <div className="aa-rib" style={{ ["--x" as string]: "56%", ["--y" as string]: "62%", ["--w" as string]: "190%", ["--r" as string]: "16deg", ["--k" as string]: "8" } as React.CSSProperties}>
              <Bubbles seed={seed + 3} colors={colors} density={1.8} scale={0.7} reduced={reduced} interactive={false} />
            </div>
            <div className="aa-rib aa-rib-ink" style={{ ["--x" as string]: "86%", ["--y" as string]: "64%", ["--w" as string]: "190%", ["--r" as string]: "38deg", ["--k" as string]: "-18" } as React.CSSProperties}>
              <Marquee text={PC.ribbonText} reverse duration={22} />
            </div>
            <div className="aa-stage-foot">
              <div className="aa-stage-sign">
                <b>{brand}</b>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12 }}>
                <p className="aa-stage-body">{PC.body}</p>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--aa-ink)" }} className="aa-stage-sign">
                  <LogoMark size={52} follow reduced={reduced} />
                  <Asterisk size={18} style={{ color: "var(--aa-ink)" }} />
                </span>
              </div>
            </div>
          </div>

          <div className="aa-in aa-reveal" ref={projRef as React.Ref<HTMLDivElement>} data-in={projIn} style={{ marginTop: "clamp(36px,6cqi,72px)" }}>
            <div className="aa-proj-head">
              <h2 className="aa-h2" style={{ maxWidth: "16ch" }}>
                {PC.heading}
              </h2>
              <span className="aa-label">
                {projects.length} projects · {projects.filter((p) => p.status !== "archived").length} active
              </span>
            </div>
            <div className="aa-proj-grid">
              {projects.map((p, i) => {
                const isOpen = open === i
                return (
                  <article key={p.code + i} className="aa-card" data-open={isOpen}>
                    <div className="aa-card-top" onPointerMove={aimFill} onPointerEnter={aimFill}>
                      <div className="aa-card-fill" style={{ background: cardFill(i) }} />
                      <span className="aa-card-code">{p.code}</span>
                      <LogoMark size={44} />
                    </div>
                    <div className="aa-card-body">
                      <span className="aa-chip" data-s={p.status}>
                        <i />
                        {p.status === "open" ? "Open call" : p.status === "ongoing" ? "Ongoing" : "Archived"}
                      </span>
                      <h3>{p.title}</h3>
                      <p>{p.summary}</p>
                      {typeof p.progress === "number" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <div className="aa-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(clamp(p.progress, 0, 1) * 100)} aria-label={p.title + " progress"}>
                            <i style={{ transform: "scaleX(" + (projIn ? clamp(p.progress, 0, 1) : 0) + ")" }} />
                          </div>
                          {p.goal && (
                            <span className="aa-mono" style={{ color: "var(--aa-muted)" }}>
                              {p.goal}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="aa-more" id={uid + "-p" + i}>
                        <div>
                          <div className="aa-more-in">
                            <p>{p.detail}</p>
                            {p.cta && (
                              <button type="button" className="aa-btn aa-btn-ink" style={{ alignSelf: "flex-start" }} onClick={() => onContribute?.(p)} tabIndex={isOpen ? 0 : -1}>
                                {p.cta}
                                <Arrow />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="aa-card-foot">
                        <button type="button" className="aa-toggle" aria-expanded={isOpen} aria-controls={uid + "-p" + i} onClick={() => setOpen(isOpen ? -1 : i)}>
                          <Plus />
                          {isOpen ? "Close dossier" : "Open dossier"}
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------- nights */}
        <section className="aa-sec aa-pad" ref={setSection("nights")} data-section="nights" style={{ paddingTop: 0 }}>
          <div className="aa-in aa-reveal" ref={nightsRef as React.Ref<HTMLDivElement>} data-in={nightsIn}>
            <div className="aa-meta">
              <span className="aa-label">{nightsTag}</span>
              <span className="aa-label">{H.issue} daily design</span>
              <span className="aa-label">{brand} association</span>
            </div>
            <div className="aa-proj-head" style={{ marginTop: "clamp(22px,3cqi,36px)", marginBottom: 0 }}>
              <h2 className="aa-h2">{nightsTitle}</h2>
              <Asterisk size={30} />
            </div>
            <div className="aa-nights">
              <div className="aa-sky">
                <div className="aa-sky-row">
                  <span className="aa-label">Sky tonight</span>
                  <button type="button" className="aa-today" data-on={dayOffset !== 0} onClick={() => setDayOffset(0)} disabled={dayOffset === 0}>
                    {dayOffset === 0 ? "Today" : "Back to today"}
                  </button>
                </div>
                <Moon fraction={moon.fraction} colors={colors} uid={uid} spin={!reduced} />
                <div style={{ textAlign: "center" }}>
                  <h3 aria-live="polite">{moon.name}</h3>
                  <span className="aa-mono" style={{ color: "var(--aa-muted)" }}>
                    {WEEKDAYS[skyDay.getDay()]} {String(skyDay.getDate()).padStart(2, "0")} {MONTHS[skyDay.getMonth()]} {skyDay.getFullYear()}
                  </span>
                </div>
                <div className="aa-sky-row" style={{ justifyContent: "center", gap: 14 }}>
                  <button type="button" className="aa-step" aria-label="Previous night" onClick={() => setDayOffset((d) => d - 1)}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M10 3L5 8l5 5" />
                    </svg>
                  </button>
                  <input
                    type="range"
                    min={-15}
                    max={30}
                    value={dayOffset}
                    onChange={(e) => setDayOffset(+e.target.value)}
                    aria-label="Scrub nights"
                    style={{ accentColor: "var(--aa-blue)", width: "min(160px,40cqi)" }}
                  />
                  <button type="button" className="aa-step" aria-label="Next night" onClick={() => setDayOffset((d) => d + 1)}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M6 3l5 5-5 5" />
                    </svg>
                  </button>
                </div>
                <div className="aa-sky-facts">
                  <div>
                    <b>{Math.round(moon.illumination * 100)}%</b>
                    <span className="aa-mono" style={{ color: "var(--aa-muted)" }}>
                      Lit
                    </span>
                  </div>
                  <div>
                    <b>{moon.waxing ? Math.round(moon.daysToFull) : Math.round(moon.daysToNew)}d</b>
                    <span className="aa-mono" style={{ color: "var(--aa-muted)" }}>
                      {moon.waxing ? "To full" : "To new"}
                    </span>
                  </div>
                  <div>
                    <b>{moonlight}</b>
                    <span className="aa-mono" style={{ color: "var(--aa-muted)" }}>
                      Sky
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <div className="aa-filters" role="group" aria-label="Filter nights">
                  {kinds.map((k) => (
                    <button key={k} type="button" className="aa-filter" aria-pressed={kind === k} onClick={() => setKind(k)}>
                      {k}
                    </button>
                  ))}
                </div>
                <ul className="aa-events">
                  {shown.length === 0 && <li className="aa-empty">Nothing on the calendar for that yet.</li>}
                  {shown.map(({ n, i }, row) => {
                    const d = parseDay(n.date)
                    const me = !!going[n.date + i]
                    const count = (n.going ?? 0) + (me ? 1 : 0)
                    const left = typeof n.seats === "number" ? Math.max(0, n.seats - count) : null
                    const full = left === 0 && !me
                    return (
                      <li key={n.date + i + kind} className="aa-event" style={{ animationDelay: row * 60 + "ms" }}>
                        <div className="aa-date" aria-label={d ? d.dow + " " + d.day + " " + d.mon : n.date}>
                          <b>{d?.day ?? "--"}</b>
                          <span>{d ? d.mon : ""}</span>
                        </div>
                        <div>
                          <span className="aa-label" style={{ fontSize: 10 }}>
                            {n.kind} · {d?.dow} {n.time}
                          </span>
                          <h3>{n.title}</h3>
                          <div className="aa-event-meta">
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                              <Pin />
                              {n.place}
                            </span>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                              <Scope />
                              {n.target}
                            </span>
                            {d && (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--aa-blue)" }} title={moonPhase(d.ms).name}>
                                <MiniMoon fraction={moonPhase(d.ms).fraction} />
                                <span style={{ color: "var(--aa-muted)" }}>{Math.round(moonPhase(d.ms).illumination * 100)}% moon</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="aa-event-act">
                          <button type="button" className="aa-btn aa-btn-line aa-rsvp" aria-pressed={me} disabled={full} onClick={() => toggleRsvp(n, i)}>
                            {me ? (
                              <>
                                <Check /> Going
                              </>
                            ) : full ? (
                              "Full"
                            ) : (
                              "RSVP"
                            )}
                          </button>
                          <span className="aa-going">
                            {count} going{left !== null ? " · " + left + " left" : ""}
                          </span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------------- join */}
        <section className="aa-sec aa-pad" ref={setSection("join")} data-section="join" style={{ paddingTop: 0 }}>
          <div className="aa-in aa-reveal" ref={joinRef as React.Ref<HTMLDivElement>} data-in={joinIn}>
            <div className="aa-meta">
              <span className="aa-label">{J.tag}</span>
              <span className="aa-label">Member {number}</span>
              <span className="aa-label">{chosen?.name}</span>
            </div>
            <div className="aa-join">
              <div>
                <h2 className="aa-h2" style={{ marginTop: "clamp(18px,3cqi,30px)" }}>
                  {J.title}
                </h2>
                <p className="aa-lede" style={{ margin: "16px 0 22px" }}>
                  {J.body}
                </p>
                <div className="aa-tiers" role="radiogroup" aria-label="Membership tier">
                  {tiers.map((t, i) => (
                    <button
                      key={t.name + i}
                      type="button"
                      role="radio"
                      aria-checked={tier === i}
                      className="aa-tier"
                      onClick={() => setTier(i)}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                          e.preventDefault()
                          setTier((tier + 1) % tiers.length)
                        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                          e.preventDefault()
                          setTier((tier - 1 + tiers.length) % tiers.length)
                        }
                      }}
                      tabIndex={tier === i ? 0 : -1}
                    >
                      {t.featured && <span className="aa-badge">Popular</span>}
                      <span className="aa-tier-name">
                        {t.name}
                        <span className="aa-radio" />
                      </span>
                      <span className="aa-price">
                        {t.price}
                        {t.period && <small>{t.period}</small>}
                      </span>
                      <span style={{ fontSize: 13, color: "var(--aa-muted)" }}>{t.blurb}</span>
                      <ul>
                        {t.perks.map((p, k) => (
                          <li key={k}>
                            <Check />
                            {p}
                          </li>
                        ))}
                      </ul>
                    </button>
                  ))}
                </div>
                <form className="aa-form" onSubmit={submit} noValidate>
                  <label className="aa-sr" htmlFor={uid + "-name"}>
                    Name
                  </label>
                  <input
                    id={uid + "-name"}
                    className="aa-field"
                    value={name}
                    maxLength={40}
                    autoComplete="name"
                    placeholder={J.namePlaceholder}
                    aria-invalid={status === "error" && !name.trim() ? true : undefined}
                    onChange={(e) => {
                      setName(e.target.value)
                      if (status !== "loading") setStatus("idle")
                    }}
                  />
                  <label className="aa-sr" htmlFor={uid + "-email"}>
                    Email
                  </label>
                  <input
                    id={uid + "-email"}
                    className="aa-field"
                    type="email"
                    value={email}
                    autoComplete="email"
                    placeholder={J.emailPlaceholder}
                    aria-invalid={status === "error" && !!name.trim() && !isEmail(email) ? true : undefined}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (status !== "loading") setStatus("idle")
                    }}
                  />
                  <button type="submit" className="aa-btn aa-btn-solid" disabled={status === "loading"}>
                    {status === "loading" ? <span className="aa-spin" /> : null}
                    {J.button}
                  </button>
                </form>
                <p className="aa-msg" data-s={status} role="status" aria-live="polite">
                  {status === "idle" ? "" : msg}
                </p>
              </div>

              <div className="aa-card-wrap">
                <div
                  key={printed}
                  ref={cardRef}
                  className={"aa-member" + (printed ? " aa-printed" : "")}
                  onPointerMove={tilt}
                  onPointerLeave={untilt}
                  aria-label={"Member card preview for " + (name.trim() || "you")}
                  role="img"
                >
                  <div className="aa-member-bg" style={{ background: bubbleCss(hashStr(name + chosen?.name) || seed, colors, 46, 60) }} />
                  <div className="aa-member-rib">
                    <Marquee text={PC.ribbonText} duration={18} />
                  </div>
                  <div className="aa-member-in">
                    <div className="aa-member-top">
                      <Title text={H.title} />
                      <LogoMark size={52} gap="transparent" />
                    </div>
                    <div className="aa-member-bottom">
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <small>{chosen?.name} member</small>
                        <div className="aa-member-name">{name.trim() || "Your Name"}</div>
                      </div>
                      <div className="aa-member-no">
                        <small>No.</small>
                        {number}
                      </div>
                    </div>
                  </div>
                  <div className="aa-member-shine" />
                </div>
                <span className="aa-mono" style={{ color: "var(--aa-muted)" }}>
                  Drag over the card · it tilts
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------- footer */}
        <footer className="aa-sec">
          <div className="aa-foot-band">
            <Bubbles seed={seed + 4} colors={colors} density={2} scale={0.5} mask={footMask} reduced={reduced} onPop={handlePop} />
            <Title text={F.bandTitle} />
            {wide && (
              <div className="aa-band-tag">
                {PC.ribbonText}
                <LogoMark size={48} gap="transparent" />
              </div>
            )}
          </div>
          <div className="aa-in aa-foot">
            <p className="aa-tagline">{F.tagline}</p>
            <span className="aa-label" style={{ color: "var(--aa-ink)", fontSize: 9.5 }}>
              {F.credit}
            </span>
            {F.links.length > 0 && (
              <nav className="aa-foot-links" aria-label="Footer">
                {F.links.map((l, i) => (
                  <a key={i} href={l.href}>
                    {l.label}
                  </a>
                ))}
              </nav>
            )}
            <div className="aa-foot-end">
              <button type="button" className="aa-icon" onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
                <ThemeIcon dark={theme === "dark"} />
              </button>
              <a href="#home" className="aa-toggle" onClick={go("home")}>
                Back to top ↑
              </a>
              <span className="aa-mono">
                © {new Date().getFullYear()} {brand}
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
