"use client"

// Editorial Folio Template — a whole portfolio laid out as a printed folio:
// grey paper sheets with a fine grain, a high-contrast Didone display face set
// big enough to fall off the page, typewriter mono for everything else, thin
// rules, "fig." captions with hand-drawn arrows and ✦ bullets. The sheets sit
// on a soft wash of the accent colour, like prints laid out on a desk.
//
// Six sheets: Cover, About, Postcards (work), Socials, Experience, Lets Connect.
// Press G (or the grid button) for the contact sheet, every sheet at once as
// scaled-down prints, and pick one to jump to it. ←/→ or J/K step through
// sheets. Postcards open into a viewer that flips them over to read the back.
// Phones take likes (double-click the post), the analytics card counts up and
// its trend line reads out on hover, roles switch the framed piece, and the
// last sheet writes you a postcard by email.
//
// Every picture is drawn in this file as SVG. Nothing loads at runtime.
import * as React from "react"

/* ------------------------------------------------------------------ types */

export type FolioSection = "cover" | "about" | "postcards" | "socials" | "experience" | "connect"
export type ArtMotif = "bubble" | "night" | "bloom" | "grid" | "portrait" | "newyear" | "mailer"
export type FolioLink = { label: string; href: string }
export type FolioTool = string | { name: string; mark?: string; round?: boolean }

export type FolioWork = {
  /** Caption number, e.g. "2.0" → "fig. 2.0". */
  fig?: string
  title: string
  client?: string
  year?: string
  description: string
  points?: string[]
  /** Drawn artwork for the postcard front. Ignored when `image` is set. */
  motif?: ArtMotif
  /** Up to three colours for the drawn artwork. */
  palette?: string[]
  /** Words printed on the drawn artwork. */
  artText?: string
  /** An image URL (3:2 works best) in place of the drawn artwork. */
  image?: string
  href?: string
}

export type FolioPost = {
  fig?: string
  title: string
  description: string
  handle?: string
  caption?: string
  likes?: number
  motif?: ArtMotif
  palette?: string[]
  artText?: string
  /** A square image URL in place of the drawn artwork. */
  image?: string
}

export type FolioAnalytics = {
  fig?: string
  title: string
  description: string
  cardTitle?: string
  period?: string
  stats: { label: string; value: number; suffix?: string }[]
  trend?: number[]
}

export type FolioRole = {
  company: string
  title?: string
  period?: string
  points: string[]
  fig?: string
  motif?: ArtMotif
  palette?: string[]
  /** For the "mailer" motif, "|" splits the two lines. */
  artText?: string
  image?: string
}

export type EditorialFolioTemplateProps = {
  name?: string
  /** One line under the name on the cover, e.g. "Marketing + Design". */
  role?: string
  year?: string
  location?: string
  email?: string
  phone?: string
  /** The giant cover word. */
  coverWord?: string
  /** Where the cover word breaks into its two staggered halves. */
  coverSplit?: number
  /** Index of the letter set in italic on the cover (null for none). */
  coverItalic?: number | null
  /** A line or two in your own voice, set in italic on the About sheet. */
  bio?: string
  /** An image URL, or any node, in place of the drawn portrait. */
  portrait?: string | React.ReactNode
  /** The first link is the one shown on the About sheet. */
  links?: FolioLink[]
  background?: string[]
  tools?: FolioTool[]
  /** Rows of skills; each row prints as "a | b | c". */
  skills?: string[][]
  works?: FolioWork[]
  posts?: FolioPost[]
  analytics?: FolioAnalytics | null
  roles?: FolioRole[]
  connectNote?: string
  /** Which sheets to show, in order. */
  sections?: FolioSection[]
  /** Rename any sheet. "Lets Connect" breaks onto two lines at its first space. */
  titles?: { [K in FolioSection]?: string }
  /** The wash behind the collages and the desk the sheets lie on. */
  accent?: string
  fonts?: { display?: string; mono?: string }
  defaultTheme?: "system" | "light" | "dark"
  onThemeChange?: (theme: "light" | "dark") => void
  /** Open on the contact sheet instead of the cover. */
  startInOverview?: boolean
  height?: string
  className?: string
}

type Theme = "light" | "dark"
type Titles = { [K in FolioSection]: string }

/* ------------------------------------------------------------------ logic */

// #region logic
const ALL_SECTIONS: FolioSection[] = ["cover", "about", "postcards", "socials", "experience", "connect"]

function clamp(v: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, v))
}

function pad2(n: number): string {
  return (n < 10 ? "0" : "") + n
}

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
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

function normalizeSections(list: string[] | undefined): FolioSection[] {
  const out: FolioSection[] = []
  for (const s of list ?? ALL_SECTIONS) {
    if ((ALL_SECTIONS as string[]).includes(s) && !(out as string[]).includes(s)) out.push(s as FolioSection)
  }
  return out.length ? out : ALL_SECTIONS.slice()
}

/** Splits the cover word into its two staggered halves. */
function splitWord(word: string, at?: number): [string, string] {
  const w = word.trim()
  if (w.length < 2) return [w, ""]
  const i = clamp(Math.round(at ?? w.length * 0.45), 1, w.length - 1)
  return [w.slice(0, i), w.slice(i)]
}

const TOOL_MARKS: { [k: string]: string } = {
  photoshop: "Ps",
  illustrator: "Ai",
  indesign: "Id",
  "after effects": "Ae",
  premiere: "Pr",
  lightroom: "Lr",
  figma: "Fg",
  canva: "Ca",
  "capcut": "Cc",
}

function toolMark(tool: FolioTool): { name: string; mark: string; round: boolean } {
  const name = typeof tool === "string" ? tool : tool.name
  const low = name.toLowerCase()
  let mark = typeof tool === "string" ? "" : tool.mark ?? ""
  if (!mark) for (const k of Object.keys(TOOL_MARKS)) if (low.includes(k)) mark = TOOL_MARKS[k]
  if (!mark) {
    const letters = name.replace(/[^A-Za-z0-9]/g, "")
    mark = letters.slice(0, 1).toUpperCase() + letters.slice(1, 2).toLowerCase()
  }
  const round = typeof tool === "string" ? low.includes("canva") : tool.round ?? low.includes("canva")
  return { name, mark, round }
}

/** 864 → "864", 27600 → "27.6k", 1234 → "1.23k", 2400000 → "2.4M". */
function formatCompact(n: number): string {
  const v = Math.round(n)
  if (Math.abs(v) < 1000) return String(v)
  if (Math.abs(v) < 1e6) return parseFloat((v / 1000).toFixed(Math.abs(v) < 10000 ? 2 : 1)) + "k"
  return parseFloat((v / 1e6).toFixed(Math.abs(v) < 1e7 ? 2 : 1)) + "M"
}

function easeOutCubic(t: number): number {
  const p = clamp(t, 0, 1)
  return 1 - Math.pow(1 - p, 3)
}

const fx = (v: number) => String(Math.round(v * 10) / 10)

/** A rectangle with torn, hand-cut edges. */
function roughRectPath(w: number, h: number, amp: number, step: number, seed: number): string {
  const r = mulberry32(seed)
  const pts: string[] = []
  const edge = (x0: number, y0: number, x1: number, y1: number) => {
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step))
    for (let i = 0; i < n; i++) {
      const t = i / n
      pts.push(fx(x0 + (x1 - x0) * t + (r() * 2 - 1) * amp) + " " + fx(y0 + (y1 - y0) * t + (r() * 2 - 1) * amp))
    }
  }
  edge(0, 0, w, 0)
  edge(w, 0, w, h)
  edge(w, h, 0, h)
  edge(0, h, 0, 0)
  return "M" + pts.join("L") + "Z"
}

function trendPath(values: number[], w: number, h: number, pad: number): { d: string; pts: { x: number; y: number }[] } {
  if (values.length < 2) return { d: "", pts: [] }
  const min = Math.min(...values)
  const span = Math.max(...values) - min || 1
  const pts = values.map((v, i) => ({
    x: pad + ((w - pad * 2) * i) / (values.length - 1),
    y: pad + (h - pad * 2) * (1 - (v - min) / span),
  }))
  return { d: pts.map((p, i) => (i ? "L" : "M") + fx(p.x) + " " + fx(p.y)).join(""), pts }
}

function nearestIndex(x: number, w: number, pad: number, n: number): number {
  if (n < 2) return 0
  return clamp(Math.round(((x - pad) / (w - pad * 2)) * (n - 1)), 0, n - 1)
}

function mailtoHref(email: string, subject: string, body: string): string {
  const q: string[] = []
  if (subject) q.push("subject=" + encodeURIComponent(subject))
  if (body) q.push("body=" + encodeURIComponent(body))
  return "mailto:" + email + (q.length ? "?" + q.join("&") : "")
}
// #endregion logic

/* ------------------------------------------------------------------ defaults */

const DEFAULT_TITLES: Titles = {
  cover: "Portfolio",
  about: "About",
  postcards: "Postcards",
  socials: "Socials",
  experience: "Experience",
  connect: "Lets Connect",
}

const DEFAULT_WORKS: FolioWork[] = [
  {
    fig: "2.0",
    title: "velvet fern beauty",
    client: "Velvet Fern Beauty",
    year: "2025",
    motif: "bubble",
    artText: "tis the season",
    description: "Designed a holiday postcard for Velvet Fern Beauty to promote its winter collection.",
    points: ["The design pairs soft bubble elements with the brand's lilac palette, carrying the campaign's copy and product names."],
  },
  {
    fig: "3.0",
    title: "Lantern Integrated Communications",
    client: "Lantern IC",
    year: "2025",
    motif: "night",
    artText: "season's greetings",
    description: "Designed an integrated holiday mail piece for Lantern to send to its loyal customers.",
    points: ["Branded ornament elements were tiled across a midnight grid to reinforce brand recognition, and the mailer shipped during the 2025 season."],
  },
]

const DEFAULT_POSTS: FolioPost[] = [
  {
    fig: "4.0",
    title: "Rosalind Vane concert post",
    handle: "rosalind.vane",
    motif: "portrait",
    artText: "Rosalind Vane",
    description: "Designed a promotional social post announcing Rosalind Vane's performance at the Old Mill Theatre.",
    caption: "One night only. Old Mill Theatre, Oct 24. Tickets in bio.",
    likes: 1284,
  },
  {
    fig: "5.0",
    title: "Lantern IC Instagram",
    handle: "lantern.ic",
    motif: "newyear",
    artText: "Happy New Year",
    description: "Worked with the team to develop social posts for Lantern across platforms, supporting brand awareness.",
    caption: "Cheers to a brighter year ahead ✦",
    likes: 642,
  },
]

const DEFAULT_ANALYTICS: FolioAnalytics = {
  fig: "6.0",
  title: "Pinterest analytics",
  description: "Managed a personal Pinterest account, publishing original design work and reaching thousands of daily impressions.",
  cardTitle: "Overall performance",
  period: "Last 30 days",
  stats: [
    { label: "Impressions", value: 27600 },
    { label: "Engagements", value: 864 },
    { label: "Saves", value: 683 },
  ],
  trend: [12, 18, 15, 22, 30, 26, 34, 41, 38, 47, 52, 49, 61, 58, 66],
}

const DEFAULT_ROLES: FolioRole[] = [
  {
    company: "Lantern Integrated Communications",
    title: "Marketing Intern",
    period: "2025",
    fig: "1.0",
    motif: "mailer",
    artText: "Your mail|Changed",
    points: [
      "Designed and led an in-house direct mail campaign to support advertising objectives.",
      "The mail piece was designed and distributed to increase awareness of our services.",
      "The project received positive feedback and is being adapted for digital advertising formats.",
    ],
  },
  {
    company: "Campus Radio 88.1",
    title: "Social Media Lead",
    period: "2023 – 2024",
    fig: "1.1",
    motif: "grid",
    artText: "On Air",
    points: [
      "Rebuilt the station's visual identity across Instagram and TikTok.",
      "Grew weekly reach threefold with a recurring show-poster series.",
      "Trained four volunteers on a shared template system.",
    ],
  },
]

const DEFAULT_LINKS: FolioLink[] = [
  { label: "LinkedIn", href: "https://linkedin.com" },
  { label: "Instagram", href: "https://instagram.com" },
  { label: "Pinterest", href: "https://pinterest.com" },
]

const PALETTES: { [k: string]: string[] } = {
  bubble: ["#f6d6e6", "#b9c4f4", "#fdf7ee"],
  night: ["#163640", "#efe2c4", "#7db3a6"],
  bloom: ["#f2e3cf", "#d9583b", "#2d3a2e"],
  grid: ["#ece6da", "#161616", "#e2512f"],
  portrait: ["#e9e4dc", "#141414", "#9aa0b4"],
  newyear: ["#13213f", "#f4ecd8", "#d9b56a"],
  mailer: ["#1c2b45", "#3fa66b", "#f2d43d"],
}

const SHORT: { [K in FolioSection]: string } = {
  cover: "cover",
  about: "about",
  postcards: "pc",
  socials: "so",
  experience: "ex",
  connect: "cn",
}

/* ------------------------------------------------------------------ styles */

const EFO_CSS = `
.efo-root{width:100%;--efo-accent:#8ea4ec;--efo-paper:#e6e5e1;--efo-paper-hi:#efeeea;--efo-paper-lo:#d8d6d1;--efo-card:#f5f4f0;--efo-ink:#141312;--efo-soft:#3c3a36;--efo-muted:#77736c;--efo-line:rgba(20,19,18,.6);--efo-hair:rgba(20,19,18,.14);--efo-shadow:rgba(24,28,72,.42);--efo-bg:radial-gradient(110% 70% at 12% 0%,color-mix(in oklab,var(--efo-accent) 40%,#f6f5ff) 0%,transparent 62%),radial-gradient(90% 70% at 100% 100%,color-mix(in oklab,var(--efo-accent) 80%,#4a4f8e) 0%,transparent 72%),color-mix(in oklab,var(--efo-accent) 55%,#c8cae0);--efo-serif:"Bodoni Moda","Didot","Bodoni 72","Bodoni MT","Playfair Display","Libre Bodoni","Big Caslon",Georgia,"Times New Roman",serif;--efo-mono:"Courier Prime","IBM Plex Mono","SF Mono",ui-monospace,Menlo,Consolas,"Liberation Mono","Courier New",monospace;position:relative;isolation:isolate;overflow-x:clip;color:var(--efo-ink);background:var(--efo-bg);font-family:var(--efo-mono);line-height:1.45;-webkit-font-smoothing:antialiased;padding-bottom:64px;transition:color .4s ease}
.efo-root[data-theme="dark"]{--efo-paper:#1d1d1c;--efo-paper-hi:#252524;--efo-paper-lo:#161615;--efo-card:#272725;--efo-ink:#ece8df;--efo-soft:#cdc8bd;--efo-muted:#938e84;--efo-line:rgba(236,232,223,.5);--efo-hair:rgba(236,232,223,.13);--efo-shadow:rgba(0,0,0,.7);--efo-bg:radial-gradient(110% 70% at 12% 0%,color-mix(in oklab,var(--efo-accent) 26%,#15162a) 0%,transparent 62%),radial-gradient(90% 70% at 100% 100%,color-mix(in oklab,var(--efo-accent) 20%,#0b0c15) 0%,transparent 72%),#10111a}
.efo-root ::selection{background:var(--efo-accent);color:#111}
.efo-root :focus-visible{outline:2px solid var(--efo-ink);outline-offset:3px}
.efo-root :where(button){font:inherit;color:inherit;background:none;border:0;padding:0;margin:0;cursor:pointer;text-align:inherit;letter-spacing:inherit}
.efo-root :where(a){color:inherit;text-decoration:none}
.efo-root :where(svg){display:block;max-width:none;flex:none}
.efo-root :where(img){display:block;max-width:none}
.efo-root :where(h1,h2,h3,p,ul,ol,dl,dd,figure,blockquote){margin:0;padding:0;font-size:inherit;font-weight:inherit}
.efo-root :where(ul,ol){list-style:none}
.efo-root :where(textarea,input){font:inherit;color:inherit}
.efo-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.efo-h{font-family:var(--efo-serif);font-weight:400;letter-spacing:-.035em;line-height:.86}
.efo-rule{display:block;height:1px;background:var(--efo-line)}
.efo-star{width:.9em;height:.9em;margin-top:.22em;fill:currentColor}
.efo-fig{font-family:var(--efo-serif);font-style:italic;letter-spacing:0}

.efo-barwrap{position:sticky;top:0;z-index:30;container-type:inline-size;padding:12px 16px 4px}
.efo-bar{max-width:1240px;margin:0 auto;display:flex;align-items:center;gap:12px;height:44px;padding:0 6px 0 18px;border-radius:999px;background:color-mix(in oklab,var(--efo-paper) 74%,transparent);backdrop-filter:blur(14px) saturate(1.2);-webkit-backdrop-filter:blur(14px) saturate(1.2);border:1px solid var(--efo-hair);box-shadow:0 10px 30px -20px var(--efo-shadow);font-size:11.5px;letter-spacing:.02em}
.efo-brand{display:flex;align-items:baseline;gap:8px;white-space:nowrap;min-width:0}
.efo-brand b{font-family:var(--efo-serif);font-style:italic;font-weight:400;font-size:18px;letter-spacing:-.01em}
.efo-brand i{font-style:normal;color:var(--efo-muted)}
.efo-idx{display:none;flex:1;justify-content:center;gap:2px}
.efo-idx button{padding:6px 10px;border-radius:999px;color:var(--efo-muted);white-space:nowrap;transition:color .2s,background-color .2s}
.efo-idx button:hover{color:var(--efo-ink)}
.efo-idx button[aria-current="true"]{color:var(--efo-ink);background:var(--efo-hair)}
.efo-idx em{font-style:normal;opacity:.55;margin-right:5px}
.efo-step{flex:1;display:flex;justify-content:center;align-items:center;gap:4px;white-space:nowrap;min-width:0}
.efo-step span{overflow:hidden;text-overflow:ellipsis}
.efo-tools{display:flex;gap:2px;margin-left:auto}
.efo-tbtn{height:32px;min-width:32px;padding:0 10px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;gap:7px;white-space:nowrap;transition:background-color .2s}
.efo-tbtn:hover{background:var(--efo-hair)}
.efo-tbtn:disabled{opacity:.35;cursor:default}
.efo-tbtn:disabled:hover{background:none}
.efo-kbd{border:1px solid var(--efo-line);border-radius:4px;padding:0 4px;font-size:10px;line-height:14px;opacity:.7;font-family:inherit}
.efo-moon{width:15px;height:15px;transition:transform .6s cubic-bezier(.3,1.4,.5,1)}
.efo-root[data-theme="dark"] .efo-moon{transform:rotate(180deg)}
@container (min-width:880px){.efo-idx{display:flex}.efo-step{display:none}}
@container (max-width:560px){.efo-tlabel,.efo-brand i,.efo-bar .efo-kbd{display:none}.efo-bar{padding-left:14px;gap:6px}}

.efo-main{display:flex;flex-direction:column;gap:28px;padding:12px 16px 0}
.efo-sheet{container-type:inline-size;width:100%;max-width:1240px;margin:0 auto;scroll-margin-top:76px}
.efo-page{--efo-t:clamp(11.5px,1cqw,14px);position:relative;overflow:hidden;font-size:var(--efo-t);color:var(--efo-ink);background:radial-gradient(120% 90% at 46% 38%,var(--efo-paper-hi) 0%,var(--efo-paper) 52%,var(--efo-paper-lo) 100%);box-shadow:0 1px 0 rgba(255,255,255,.35) inset,0 34px 60px -34px var(--efo-shadow),0 8px 18px -10px var(--efo-shadow);padding:24px 20px 44px;transition:background-color .4s}
.efo-grain{position:absolute;inset:0;z-index:5;pointer-events:none;opacity:.55;mix-blend-mode:multiply;background-size:180px 180px}
.efo-root[data-theme="dark"] .efo-grain{mix-blend-mode:screen;opacity:.14}
.efo-folio{position:absolute;right:16px;bottom:12px;z-index:6;font-size:.78em;letter-spacing:.12em;color:var(--efo-muted)}
.efo-rise{opacity:0;transform:translateY(16px);transition:opacity .8s cubic-bezier(.2,.7,.2,1),transform .9s cubic-bezier(.2,.7,.2,1);transition-delay:calc(var(--d,0) * 90ms)}
.efo-sheet[data-in] .efo-rise{opacity:1;transform:none}
.efo-arrow{width:4.4em;height:1.5em;overflow:visible;color:var(--efo-ink)}
.efo-arrow path{fill:none;stroke:currentColor;stroke-width:1.2;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1;stroke-dashoffset:1;transition:stroke-dashoffset 1s cubic-bezier(.6,0,.2,1) .5s}
.efo-arrow path + path{transition-delay:1.35s;transition-duration:.35s}
.efo-sheet[data-in] .efo-arrow path{stroke-dashoffset:0}
.efo-sech{display:flex;align-items:flex-end;gap:14px}
.efo-sech h2{font-size:max(34px,4.6cqw)}
.efo-sech .efo-rule{flex:1;margin-bottom:.35em}
.efo-wash{position:absolute;inset:0;z-index:0;pointer-events:none}
.efo-art{display:block;width:100%;height:auto}
.efo-photo{display:block;width:100%;height:auto;object-fit:cover}

.efo-cover .efo-page{aspect-ratio:3/4;padding:0}
.efo-cwrap{position:absolute;inset:0}
.efo-vr{position:absolute;top:0;bottom:0;left:3%;width:1px;background:var(--efo-line)}
.efo-hr{position:absolute;left:0;width:40%;top:63%;height:1px;background:var(--efo-line)}
.efo-word{position:absolute;inset:0;font-family:var(--efo-serif);font-weight:400;font-size:31cqw;line-height:.8;letter-spacing:-.05em;white-space:nowrap}
.efo-wa,.efo-wb{position:absolute;display:block;transition:transform 1s cubic-bezier(.2,.7,.2,1)}
.efo-wa{left:5%;top:38%;transform:translate3d(calc(var(--px,0) * -16px),calc(var(--py,0) * -9px),0)}
.efo-wb{left:30%;top:12%;transform:translate3d(calc(var(--px,0) * 20px),calc(var(--py,0) * 11px),0)}
.efo-l{display:inline-block;transition:transform .4s cubic-bezier(.3,1.5,.5,1)}
.efo-l:hover{font-style:italic;transform:translateY(-.035em)}
.efo-l[data-it]{font-style:italic}
.efo-cmeta{position:absolute;left:9%;top:67%;line-height:1.6}
.efo-contents{position:absolute;left:9%;right:7%;bottom:6%;display:flex;flex-wrap:wrap;gap:6px 16px;font-size:.92em}
.efo-contents button{color:var(--efo-soft);border-bottom:1px solid transparent;transition:color .2s,border-color .2s}
.efo-contents button:hover{color:var(--efo-ink);border-color:var(--efo-ink)}
.efo-contents em{font-style:normal;opacity:.55;margin-right:6px}
.efo-chint{display:none;position:absolute;right:3.6%;bottom:6%;color:var(--efo-muted);font-size:.9em}
.efo-ctag{position:absolute;right:6%;top:58%;font-size:1.05em}

.efo-about .efo-page{display:grid;gap:22px}
.efo-vt{font-size:19cqw}
.efo-me{display:flex;gap:16px;align-items:flex-end}
.efo-portrait{width:40%;max-width:190px;flex:none;filter:drop-shadow(0 10px 14px rgba(0,0,0,.18))}
.efo-info{display:grid;gap:3px;line-height:1.5}
.efo-info div{display:flex;gap:.5em;flex-wrap:wrap}
.efo-bio{font-family:var(--efo-serif);font-style:italic;font-size:max(20px,2.3cqw);line-height:1.12;letter-spacing:-.015em;max-width:15em}
.efo-bio .efo-fig{font-size:1.3em;line-height:0;vertical-align:-.15em;color:var(--efo-muted)}
.efo-ul{text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1px}
.efo-ul:hover{text-decoration-style:wavy}
.efo-acol{display:grid;gap:28px;align-content:space-between}
.efo-bh{display:flex;align-items:flex-end;gap:14px;margin-bottom:4px}
.efo-bh h3{font-family:var(--efo-serif);font-style:italic;font-size:max(30px,3.7cqw);letter-spacing:-.03em;line-height:1}
.efo-bh .efo-rule{flex:1;margin-bottom:.45em}
.efo-row{position:relative;padding:.62em 0;border-bottom:1px solid var(--efo-line);transition:padding .4s cubic-bezier(.2,.8,.2,1)}
.efo-row::before{content:"";position:absolute;left:0;top:50%;width:.85em;height:1px;background:var(--efo-ink);transform:scaleX(0);transform-origin:left;transition:transform .4s cubic-bezier(.2,.8,.2,1)}
.efo-row:hover{padding-left:1.5em}
.efo-row:hover::before{transform:scaleX(1)}
.efo-row:first-of-type{border-top:1px solid var(--efo-line)}
.efo-bar-sep{opacity:.45;margin:0 .45em}
.efo-toolrow{display:flex;gap:9px;align-items:center;padding:.75em 0;border-bottom:1px solid var(--efo-line)}
.efo-tool{position:relative;width:2.7em;height:2.7em;display:grid;place-items:center;background:var(--efo-ink);color:var(--efo-paper);border-radius:.5em;font-weight:700;font-size:.92em;cursor:default;transition:transform .35s cubic-bezier(.3,1.5,.5,1)}
.efo-tool[data-round]{border-radius:50%}
.efo-tool:hover,.efo-tool:focus-visible{transform:translateY(-3px) rotate(-5deg)}
.efo-tip{position:absolute;bottom:calc(100% + 7px);left:50%;transform:translate(-50%,4px);opacity:0;white-space:nowrap;background:var(--efo-ink);color:var(--efo-paper);padding:3px 8px;font-size:.82em;font-weight:400;pointer-events:none;transition:opacity .2s,transform .2s}
.efo-tool:hover .efo-tip,.efo-tool:focus-visible .efo-tip{opacity:1;transform:translate(-50%,0)}

.efo-pc .efo-page{display:grid;gap:26px}
.efo-collage{position:relative;aspect-ratio:6/5;width:100%}
.efo-card{position:absolute;left:var(--x);top:var(--y);width:var(--w);transform:rotate(var(--r));background:#fbfaf6;padding:1.3%;box-shadow:0 16px 26px -14px rgba(10,12,40,.55),0 2px 5px rgba(10,12,40,.2);cursor:zoom-in;transition:transform .6s cubic-bezier(.2,.8,.2,1),box-shadow .5s}
.efo-card:hover,.efo-card[data-hl]{transform:rotate(0deg) translateY(-3%) scale(1.04);z-index:4;box-shadow:0 30px 40px -18px rgba(10,12,40,.6),0 4px 8px rgba(10,12,40,.2)}
.efo-tape{position:absolute;left:50%;top:-7%;width:26%;height:13%;z-index:2;transform:translateX(-50%) rotate(-5deg);background:rgba(238,229,200,.78);clip-path:polygon(0 12%,5% 0,10% 10%,16% 2%,22% 9%,30% 0,40% 8%,50% 1%,60% 9%,70% 0,80% 8%,88% 1%,95% 9%,100% 3%,100% 90%,94% 100%,86% 92%,78% 100%,68% 91%,58% 100%,48% 92%,38% 100%,28% 92%,18% 100%,9% 91%,0 98%)}
.efo-cfig{position:absolute;right:2%;bottom:-1.7em;font-size:1.02em;color:var(--efo-ink);white-space:nowrap}
.efo-wcol{display:grid;align-content:center;gap:4px}
.efo-work{display:grid;grid-template-columns:auto 1fr;gap:.35em .8em;width:100%;padding:1.05em .2em;border-bottom:1px solid var(--efo-hair);text-align:left;transition:background-color .3s,padding .4s cubic-bezier(.2,.8,.2,1)}
.efo-work:last-child{border-bottom:0}
.efo-work:hover,.efo-work[data-hl]{background:color-mix(in oklab,var(--efo-accent) 16%,transparent);padding-left:.8em}
.efo-work b{display:block;font-weight:700}
.efo-wd{display:block;color:var(--efo-soft);margin-top:.35em}
.efo-open{display:inline-block;margin-left:.6em;font-weight:400;opacity:0;transform:translateX(-4px);transition:opacity .25s,transform .25s}
.efo-work:hover .efo-open,.efo-work:focus-visible .efo-open,.efo-work[data-hl] .efo-open{opacity:.7;transform:none}

.efo-so .efo-page{display:grid;gap:26px}
.efo-posts{display:grid;gap:18px;align-content:center}
.efo-pentry{display:grid;gap:.45em;padding:.3em .3em .3em .4em;margin-left:-.4em;transition:background-color .3s}
.efo-pentry[data-hl]{background:color-mix(in oklab,var(--efo-accent) 16%,transparent)}
.efo-figline{display:flex;align-items:center;gap:.5em;font-weight:700}
.efo-pentry > span:last-child{color:var(--efo-soft)}
.efo-phones{display:flex;justify-content:center;gap:5%;align-items:flex-start}
.efo-phone{width:46%;max-width:230px;background:#0c0c0c;border-radius:12% / 6.2%;padding:3.4% 3.4% 5%;box-shadow:0 26px 40px -22px rgba(0,0,0,.65),0 0 0 1px rgba(255,255,255,.06) inset;transition:transform .6s cubic-bezier(.2,.8,.2,1)}
.efo-phone + .efo-phone{margin-top:13%}
.efo-phone[data-hl]{transform:translateY(-8px) rotate(-1.2deg)}
.efo-screen{background:#fff;color:#121212;border-radius:9% / 4.6%;overflow:hidden;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;font-size:max(8.5px,.74cqw);line-height:1.3}
.efo-ighead{display:flex;align-items:center;gap:.5em;padding:1.6em .8em .6em}
.efo-av{width:1.9em;height:1.9em;flex:none;border-radius:50%;background:conic-gradient(#f9b234,#e1306c,#833ab4,#f9b234);padding:2px}
.efo-av span{display:block;width:100%;aspect-ratio:1;border-radius:50%;background:var(--efo-accent);border:1.5px solid #fff}
.efo-handle{font-weight:600}
.efo-follow{margin-left:auto;background:#0a66f2;color:#fff;border-radius:.45em;padding:.25em .8em;font-weight:600;transition:background-color .2s}
.efo-follow[aria-pressed="true"]{background:#efefef;color:#121212}
.efo-postart{position:relative;overflow:hidden;cursor:pointer;user-select:none;-webkit-user-select:none}
.efo-burst{position:absolute;left:50%;top:50%;width:34%;color:#fff;filter:drop-shadow(0 4px 12px rgba(0,0,0,.35));pointer-events:none;animation:efo-burst .95s cubic-bezier(.2,.9,.3,1.2) forwards}
.efo-burst svg{width:100%;height:auto;fill:currentColor}
@keyframes efo-burst{0%{transform:translate(-50%,-50%) scale(0);opacity:0}15%{transform:translate(-50%,-50%) scale(1.15);opacity:1}30%{transform:translate(-50%,-50%) scale(.95)}70%{transform:translate(-50%,-50%) scale(1);opacity:1}100%{transform:translate(-50%,-70%) scale(.9);opacity:0}}
.efo-igact{display:flex;align-items:center;gap:.9em;padding:.7em .8em .3em}
.efo-igact svg{width:1.75em;height:1.75em;fill:none;stroke:#121212;stroke-width:1.8;stroke-linejoin:round;stroke-linecap:round}
.efo-like{display:block;transition:transform .3s cubic-bezier(.3,1.8,.5,1)}
.efo-like:active{transform:scale(.8)}
.efo-like[aria-pressed="true"] svg{fill:#ed4956;stroke:#ed4956;animation:efo-pop .45s cubic-bezier(.3,1.8,.5,1)}
@keyframes efo-pop{0%{transform:scale(.6)}60%{transform:scale(1.25)}100%{transform:scale(1)}}
.efo-iglikes{padding:0 .8em;font-weight:600;font-variant-numeric:tabular-nums}
.efo-igcap{padding:.2em .8em 1.4em;color:#262626;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.efo-stat{display:grid;gap:14px;align-content:center}
.efo-down{transform:rotate(90deg);margin:-.2em 0 -.2em 1em;width:3.4em}
.efo-scard{background:#fff;color:#151515;border:1px solid rgba(0,0,0,.12);padding:1em 1em .8em;box-shadow:0 18px 30px -20px rgba(10,12,40,.45);font-size:.92em;transition:transform .5s cubic-bezier(.2,.8,.2,1)}
.efo-scard:hover{transform:rotate(-1deg) translateY(-3px)}
.efo-sct{display:flex;justify-content:space-between;gap:8px;font-weight:700}
.efo-sct span{font-weight:400;color:#777}
.efo-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:.9em 0 .5em}
.efo-stats b{display:block;font-family:var(--efo-serif);font-weight:400;font-size:1.9em;line-height:1;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.efo-stats span{font-size:.82em;color:#666}
.efo-spark{width:100%;height:auto;cursor:crosshair;touch-action:none}
.efo-spark .efo-line{fill:none;stroke:#151515;stroke-width:1.4;stroke-linejoin:round;stroke-dasharray:1;stroke-dashoffset:1;transition:stroke-dashoffset 1.6s cubic-bezier(.5,0,.2,1) .4s}
.efo-sheet[data-in] .efo-spark .efo-line{stroke-dashoffset:0}
.efo-sfoot{font-size:.85em;color:#666;min-height:1.4em;font-variant-numeric:tabular-nums}

.efo-ex .efo-page{display:grid;gap:26px}
.efo-tabs{display:flex;flex-wrap:wrap;gap:4px 18px;margin:14px 0 4px}
.efo-tab{padding:.3em 0;color:var(--efo-muted);border-bottom:1px solid transparent;transition:color .2s,border-color .2s}
.efo-tab:hover{color:var(--efo-ink)}
.efo-tab[aria-selected="true"]{color:var(--efo-ink);border-color:var(--efo-ink)}
.efo-tab em{font-style:normal;opacity:.55;margin-right:6px}
.efo-rmeta{color:var(--efo-muted);margin-top:12px}
.efo-bul{display:grid;gap:1em;margin-top:14px}
.efo-bul li{display:grid;grid-template-columns:auto 1fr;gap:.8em}
.efo-bul li:first-child{font-weight:700}
.efo-exart{position:relative}
.efo-figtag{display:flex;align-items:center;gap:.4em;margin-bottom:8px}
.efo-framewrap{position:relative;aspect-ratio:1.08}
.efo-frame{position:absolute;left:11%;top:7%;width:78%;transform:rotate(-1.6deg);border:2px solid var(--efo-ink);outline:1px solid var(--efo-ink);outline-offset:5px;padding:2.4%;background:var(--efo-card);box-shadow:0 26px 40px -24px rgba(10,12,40,.6);transition:transform .6s cubic-bezier(.2,.8,.2,1)}
.efo-frame:hover{transform:rotate(0deg) scale(1.02)}
.efo-swap{animation:efo-swap .7s cubic-bezier(.2,.8,.2,1)}
@keyframes efo-swap{from{opacity:0;translate:0 12px}to{opacity:1;translate:0 0}}

.efo-cn .efo-page{display:grid;gap:26px;padding-bottom:0}
.efo-lets{font-size:22cqw;line-height:.8}
.efo-lets span{display:block}
.efo-lets span + span{margin:-.02em 0 0 .32em}
.efo-contact{display:grid;gap:14px;align-content:start}
.efo-ctop{display:grid;gap:4px;border-top:1px solid var(--efo-line);padding-top:.6em}
.efo-ctop > span:first-child{font-weight:700}
.efo-mail{justify-self:start;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px}
.efo-mail:hover{text-decoration-style:solid}
.efo-note{color:var(--efo-soft);max-width:32em}
.efo-compose{display:grid;grid-template-columns:1fr auto;gap:10px 14px;border:1px solid var(--efo-line);background:var(--efo-card);padding:12px 14px;box-shadow:0 14px 24px -18px rgba(10,12,40,.45)}
.efo-compose textarea{grid-column:1;width:100%;min-height:6.4em;resize:none;border:0;outline:none;background:transparent;line-height:1.6em;background-image:repeating-linear-gradient(transparent 0,transparent calc(1.6em - 1px),var(--efo-hair) calc(1.6em - 1px),var(--efo-hair) 1.6em);background-attachment:local;padding:0}
.efo-compose textarea::placeholder{color:var(--efo-muted)}
.efo-stamp{grid-column:2;grid-row:1;width:3.6em;align-self:start}
.efo-cfoot{grid-column:1 / -1;display:flex;align-items:center;justify-content:space-between;gap:10px;border-top:1px solid var(--efo-hair);padding-top:8px;color:var(--efo-muted);font-size:.9em}
.efo-send{color:var(--efo-ink);font-weight:700;padding:.3em .8em;border:1px solid var(--efo-ink);border-radius:999px;transition:background-color .2s,color .2s}
.efo-send:hover{background:var(--efo-ink);color:var(--efo-paper)}
.efo-links{display:flex;flex-wrap:wrap;gap:4px 16px}
.efo-band{position:relative;grid-column:1 / -1;margin:8px -20px 0;padding:0 20px;display:flex;justify-content:flex-end}
.efo-band::after{content:"";position:absolute;left:0;right:0;bottom:0;height:.26em;font-size:max(42px,9.4cqw);background:var(--efo-ink)}
.efo-name{position:relative;font-family:var(--efo-serif);font-style:italic;font-size:max(42px,9.4cqw);line-height:.84;letter-spacing:-.05em;white-space:nowrap;padding-bottom:.14em}
.efo-name span{display:inline-block;transition:transform .5s cubic-bezier(.3,1.6,.5,1)}
.efo-name span:hover{transform:translateY(-.12em) rotate(-4deg)}
.efo-cn .efo-folio{color:var(--efo-paper)}

@container (min-width:720px){
.efo-sheet .efo-page{aspect-ratio:16/10;padding:3cqw 3.6cqw}
.efo-cover .efo-page{aspect-ratio:16/10;padding:0}
.efo-folio{right:1.6cqw;bottom:1.2cqw}
.efo-word{font-size:21cqw}
.efo-wa{left:4%;top:27%}
.efo-wb{left:54.5%;top:1.5%}
.efo-hr{top:59%;width:31%}
.efo-cmeta{left:67%;top:41%}
.efo-contents{left:6%;right:auto;bottom:6.5%;max-width:58%}
.efo-chint{display:block}
.efo-ctag{right:auto;left:33%;top:61%}
.efo-about .efo-page{grid-template-columns:8.5cqw 33cqw 1fr;grid-template-rows:auto 1fr;gap:0 3cqw;padding:3cqw 4cqw 3.6cqw 2.4cqw}
.efo-bio{grid-column:2;grid-row:1;margin-top:5cqw}
.efo-vt{grid-row:1 / span 2;writing-mode:vertical-rl;font-size:10.5cqw;align-self:start;margin-top:-.6cqw}
.efo-me{grid-column:2;grid-row:2;align-self:end}
.efo-portrait{width:13.5cqw}
.efo-acol{grid-column:3;grid-row:1 / span 2;align-self:stretch}
.efo-pc .efo-page{grid-template-columns:54% 1fr;gap:0 3.4cqw;align-items:center}
.efo-pc .efo-sech{margin-bottom:.6cqw}
.efo-so .efo-page{grid-template-columns:26% 1fr 25%;grid-template-rows:auto 1fr;gap:1.2cqw 2.6cqw}
.efo-so .efo-sech{grid-column:1 / span 2}
.efo-posts{grid-column:1;grid-row:2}
.efo-phones{grid-column:2;grid-row:2;align-self:start}
.efo-phone{width:15.5cqw}
.efo-stat{grid-column:3;grid-row:1 / span 2}
.efo-ex .efo-page{grid-template-columns:1fr 45%;gap:0 4.4cqw;align-items:center}
.efo-cn .efo-page{grid-template-columns:1fr 37%;grid-template-rows:1fr auto;gap:0 4cqw;padding:3cqw 3.6cqw 0}
.efo-lets{font-size:11cqw;align-self:center}
.efo-contact{align-self:center}
.efo-band{margin:0 -3.6cqw;padding:0 3.6cqw}
.efo-name,.efo-band::after{font-size:9.4cqw}
}

.efo-ov{position:fixed;inset:0;z-index:60;overflow:auto;overscroll-behavior:contain;background:var(--efo-bg);animation:efo-fade .35s ease}
.efo-ovhead{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:12px;max-width:1240px;margin:0 auto;padding:16px 20px;font-size:12px}
.efo-ovhead p{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
.efo-ovhead .efo-h{font-size:30px;font-style:italic}
.efo-ovhead .efo-tbtn{background:color-mix(in oklab,var(--efo-paper) 74%,transparent);border:1px solid var(--efo-hair)}
.efo-ovgrid{display:grid;grid-template-columns:1fr;gap:26px;max-width:1240px;margin:0 auto;padding:6px 20px 56px}
@media (min-width:700px){.efo-ovgrid{grid-template-columns:1fr 1fr;gap:30px 28px}}
.efo-tile{animation:efo-tilein .7s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(var(--d,0) * 70ms)}
.efo-tframe{position:relative;aspect-ratio:16/10;overflow:hidden;box-shadow:0 26px 40px -26px var(--efo-shadow);transition:transform .5s cubic-bezier(.2,.8,.2,1)}
.efo-tile:hover .efo-tframe,.efo-tile:focus-within .efo-tframe{transform:translateY(-6px) rotate(-.5deg)}
.efo-tinner{position:absolute;left:0;top:0;width:1200px;transform-origin:0 0;pointer-events:none}
.efo-tinner .efo-sheet{max-width:none}
.efo-tcover{position:absolute;inset:0;z-index:3;cursor:zoom-in}
.efo-tcover:focus-visible{outline-offset:-3px}
.efo-tcover[aria-current="true"]{box-shadow:inset 0 0 0 2px var(--efo-ink)}
.efo-tcap{display:flex;gap:12px;align-items:baseline;margin-top:10px;font-size:12px;color:var(--efo-soft)}
.efo-tcap .efo-h{font-size:20px;color:var(--efo-ink)}
@keyframes efo-tilein{from{opacity:0;transform:translateY(18px) scale(.97)}to{opacity:1;transform:none}}
@keyframes efo-fade{from{opacity:0}to{opacity:1}}

.efo-lb{position:fixed;inset:0;z-index:70;overflow:auto;display:grid;place-items:center;padding:20px;background:rgba(10,10,22,.66);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);animation:efo-fade .3s ease;color:#f3f1ec}
.efo-lbin{width:min(760px,100%);display:grid;gap:14px}
.efo-lbtop{display:flex;align-items:center;gap:14px;font-size:12px}
.efo-lbtop .efo-fig{font-size:20px}
.efo-lbtop button{margin-left:auto}
.efo-flip{display:block;width:100%;perspective:1800px;cursor:pointer;animation:efo-tilein .5s cubic-bezier(.2,.8,.2,1)}
.efo-flipi{position:relative;display:block;aspect-ratio:3/2;transform-style:preserve-3d;transition:transform .9s cubic-bezier(.3,.9,.2,1)}
.efo-flip[data-flipped] .efo-flipi{transform:rotateY(180deg)}
.efo-face{position:absolute;inset:0;display:block;backface-visibility:hidden;-webkit-backface-visibility:hidden;background:#fbfaf6;padding:2%;box-shadow:0 34px 60px -24px rgba(0,0,0,.7)}
.efo-face .efo-art,.efo-face .efo-photo{width:100%;height:auto}
.efo-back{transform:rotateY(180deg);display:grid;grid-template-columns:1.15fr 1fr;gap:5%;padding:6% 5.5%;color:#1b1a18;font-family:var(--efo-mono);font-size:clamp(10px,1.7vw,13.5px);line-height:1.6;text-align:left}
.efo-bmsg{display:grid;align-content:start;gap:.8em;padding-right:6%;border-right:1px solid rgba(0,0,0,.28);overflow:hidden}
.efo-bmsg b{font-family:var(--efo-serif);font-style:italic;font-weight:400;font-size:1.6em;line-height:1}
.efo-bside{display:grid;grid-template-rows:auto 1fr;gap:6%}
.efo-btop{display:flex;justify-content:space-between;align-items:flex-start}
.efo-bstamp{width:34%;border:2px dashed rgba(0,0,0,.35);padding:3px;background:#fff}
.efo-bstamp .efo-art{width:100%;height:auto}
.efo-pm{width:42%;color:rgba(30,30,60,.55)}
.efo-addr{display:grid;align-content:end;gap:0}
.efo-addr span{display:block;border-bottom:1px solid rgba(0,0,0,.35);padding:.5em 0 .15em;min-height:2em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.efo-lbcap{display:grid;gap:4px;font-size:12.5px;line-height:1.55;color:rgba(243,241,236,.82)}
.efo-lbcap h3{font-family:var(--efo-serif);font-size:30px;line-height:1;letter-spacing:-.02em;color:#fff}
.efo-lbbar{display:flex;flex-wrap:wrap;gap:8px;font-size:12px}
.efo-lbbtn{height:34px;padding:0 14px;border:1px solid rgba(255,255,255,.3);border-radius:999px;display:inline-flex;align-items:center;gap:8px;transition:background-color .2s,border-color .2s}
.efo-lbbtn:hover{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.6)}
.efo-lb :focus-visible{outline-color:#fff}

.efo-toast{position:fixed;left:50%;bottom:26px;z-index:80;transform:translate(-50%,16px);opacity:0;pointer-events:none;background:var(--efo-ink);color:var(--efo-paper);padding:9px 16px;border-radius:999px;font-size:12px;transition:opacity .3s,transform .3s}
.efo-toast[data-on]{opacity:1;transform:translate(-50%,0)}

@media (prefers-reduced-motion:reduce){
.efo-root *,.efo-root *::before,.efo-root *::after{animation-duration:.001ms !important;animation-delay:0s !important;transition-duration:.001ms !important;transition-delay:0s !important}
.efo-rise{opacity:1;transform:none}
.efo-wa,.efo-wb{transform:none}
}
`

/* ------------------------------------------------------------------ hooks */

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

// Paper grain: a tile of soft noise and a few fibres, made once on a canvas.
function useGrain(): string {
  const [url, setUrl] = React.useState("")
  React.useEffect(() => {
    try {
      const size = 180
      const cv = document.createElement("canvas")
      cv.width = cv.height = size
      const g = cv.getContext("2d")
      if (!g) return
      const img = g.createImageData(size, size)
      const r = mulberry32(7)
      for (let i = 0; i < size * size; i++) {
        const v = 110 + Math.floor(r() * 145)
        img.data[i * 4] = v
        img.data[i * 4 + 1] = v
        img.data[i * 4 + 2] = v
        img.data[i * 4 + 3] = Math.floor(r() * 46)
      }
      g.putImageData(img, 0, 0)
      g.lineWidth = 0.6
      for (let i = 0; i < 26; i++) {
        const x = r() * size
        const y = r() * size
        const a = r() * Math.PI * 2
        const l = 6 + r() * 18
        g.strokeStyle = "rgba(60,55,50," + (0.05 + r() * 0.08).toFixed(3) + ")"
        g.beginPath()
        g.moveTo(x, y)
        g.quadraticCurveTo(x + Math.cos(a + 0.6) * l * 0.5, y + Math.sin(a + 0.6) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l)
        g.stroke()
      }
      setUrl(cv.toDataURL("image/png"))
    } catch {
      /* no canvas, no grain */
    }
  }, [])
  return url
}

function useCountUp(target: number, run: boolean, instant: boolean): number {
  const [v, setV] = React.useState(instant ? target : 0)
  React.useEffect(() => {
    if (instant) {
      setV(target)
      return
    }
    if (!run) return
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = (t - t0) / 1500
      setV(target * easeOutCubic(p))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, run, instant])
  return v
}

/* ------------------------------------------------------------------ context */

type Ctx = {
  uid: string
  name: string
  first: string
  role: string
  year: string
  location: string
  email: string
  phone: string
  bio: string
  portrait: string | React.ReactNode
  links: FolioLink[]
  background: string[]
  tools: FolioTool[]
  skills: string[][]
  works: FolioWork[]
  posts: FolioPost[]
  analytics: FolioAnalytics | null
  roles: FolioRole[]
  note: string
  order: FolioSection[]
  titles: Titles
  coverWord: string
  coverSplit?: number
  coverItalic: number | null | undefined
  grain: string
  reduced: boolean
  seen: boolean[]
  hl: string | null
  setHl: (v: string | null) => void
  liked: boolean[]
  toggleLike: (i: number, on?: boolean) => void
  roleIx: number
  setRoleIx: (i: number) => void
  go: (i: number) => void
  openCard: (i: number) => void
  copy: (text: string, what: string) => void
  sheetEls: { current: (HTMLElement | null)[] }
}

const dv = (n: number) => ({ "--d": n }) as React.CSSProperties

/* ------------------------------------------------------------------ main */

export default function EditorialFolioTemplate({
  name = "Juniper Hale",
  role = "Marketing + Design",
  year = "2026",
  location = "Asheville, NC",
  email = "juniper@example.com",
  phone = "(828) 555-0142",
  coverWord = "Portfolio",
  coverSplit,
  coverItalic,
  bio = "I make brands feel like a letter from a friend: small, specific and worth keeping.",
  portrait,
  links = DEFAULT_LINKS,
  background = ["Bluebell State University", "B.A. Digital & Mass Communications", "Lantern Integrated Communications, Marketing Intern"],
  tools = ["Canva", "Photoshop", "Illustrator"],
  skills = [
    ["Social Content", "Digital Advertising", "Brand Strategy"],
    ["Audience-focused", "Strategic", "Trend Conscious"],
  ],
  works = DEFAULT_WORKS,
  posts = DEFAULT_POSTS,
  analytics = DEFAULT_ANALYTICS,
  roles = DEFAULT_ROLES,
  connectNote = "For additional work experience, mock ups, or questions please contact the email listed.",
  sections,
  titles,
  accent = "#8ea4ec",
  fonts,
  defaultTheme = "system",
  onThemeChange,
  startInOverview = false,
  height = "100svh",
  className = "",
}: EditorialFolioTemplateProps) {
  const uid = "efo" + React.useId().replace(/[^a-zA-Z0-9]/g, "")
  const rootRef = React.useRef(null as HTMLDivElement | null)
  const gridBtn = React.useRef(null as HTMLButtonElement | null)
  const sheetEls = React.useRef([] as (HTMLElement | null)[])
  const reduced = useReducedMotion()
  const grain = useGrain()

  const [theme, setTheme] = React.useState((defaultTheme === "dark" ? "dark" : "light") as Theme)
  const [themeTouched, setThemeTouched] = React.useState(false)
  const [active, setActive] = React.useState(0)
  const [seen, setSeen] = React.useState([] as boolean[])
  const [overview, setOverview] = React.useState(startInOverview)
  const [card, setCard] = React.useState(null as number | null)
  const [hl, setHl] = React.useState(null as string | null)
  const [liked, setLiked] = React.useState([] as boolean[])
  const [roleIx, setRoleIx] = React.useState(0)
  const [toast, setToast] = React.useState("")
  const toastTimer = React.useRef(0)

  const order = normalizeSections(sections).filter((s) =>
    s === "postcards" ? works.length > 0 : s === "socials" ? posts.length > 0 || !!analytics : s === "experience" ? roles.length > 0 : true,
  )
  const orderKey = order.join(",")
  const allTitles: Titles = { ...DEFAULT_TITLES, ...(titles ?? {}) }

  // "system" follows the host: its .dark class first (shadcn), then the OS.
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

  // which sheets have been seen (they animate in once) and which one is current
  React.useEffect(() => {
    const els = sheetEls.current.slice(0, order.length)
    if (typeof IntersectionObserver !== "function") {
      setSeen(order.map(() => true))
      return
    }
    const idx = (e: IntersectionObserverEntry) => Number((e.target as HTMLElement).dataset.i)
    const seenIo = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          const i = idx(e)
          setSeen((s) => {
            if (s[i]) return s
            const n = s.slice()
            n[i] = true
            return n
          })
        }
      },
      { threshold: 0.16 },
    )
    const activeIo = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(idx(e))
      },
      { rootMargin: "-42% 0px -56% 0px" },
    )
    for (const el of els) {
      if (!el) continue
      seenIo.observe(el)
      activeIo.observe(el)
    }
    return () => {
      seenIo.disconnect()
      activeIo.disconnect()
    }
  }, [orderKey])

  const go = React.useCallback(
    (i: number) => {
      const j = clamp(i, 0, order.length - 1)
      setOverview(false)
      setActive(j)
      requestAnimationFrame(() =>
        requestAnimationFrame(() => sheetEls.current[j]?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" })),
      )
    },
    [order.length, reduced],
  )

  const copy = React.useCallback((text: string, what: string) => {
    const done = () => {
      setToast(what + " copied")
      window.clearTimeout(toastTimer.current)
      toastTimer.current = window.setTimeout(() => setToast(""), 1800)
    }
    const fallback = () => {
      try {
        const ta = document.createElement("textarea")
        ta.value = text
        ta.style.position = "fixed"
        ta.style.opacity = "0"
        document.body.appendChild(ta)
        ta.select()
        document.execCommand("copy")
        ta.remove()
      } catch {
        /* nothing to do */
      }
      done()
    }
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done, fallback)
    else fallback()
  }, [])
  React.useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const toggleLike = React.useCallback((i: number, on?: boolean) => {
    setLiked((l) => {
      const n = l.slice()
      n[i] = on ?? !n[i]
      return n
    })
  }, [])

  // the page under an overlay stays put
  const locked = overview || card !== null
  React.useEffect(() => {
    if (!locked) return
    const el = document.documentElement
    const prev = el.style.overflow
    el.style.overflow = "hidden"
    return () => {
      el.style.overflow = prev
    }
  }, [locked])

  // keys: G contact sheet, ←/→ or J/K between sheets
  const live = React.useRef({ active, overview, card, go })
  live.current = { active, overview, card, go }
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      const s = live.current
      if (s.card !== null) return
      const root = rootRef.current
      if (!root) return
      const r = root.getBoundingClientRect()
      if (r.bottom < 0 || r.top > innerHeight) return
      const k = e.key.toLowerCase()
      if (k === "g") {
        e.preventDefault()
        setOverview((o) => !o)
        return
      }
      if (s.overview) return
      if (e.key === "ArrowRight" || k === "j") {
        e.preventDefault()
        s.go(s.active + 1)
      } else if (e.key === "ArrowLeft" || k === "k") {
        e.preventDefault()
        s.go(s.active - 1)
      }
    }
    addEventListener("keydown", onKey)
    return () => removeEventListener("keydown", onKey)
  }, [])

  const closeOverview = () => {
    setOverview(false)
    gridBtn.current?.focus({ preventScroll: true })
  }

  const c: Ctx = {
    uid,
    name,
    first: name.trim().split(/\s+/)[0] ?? name,
    role,
    year,
    location,
    email,
    phone,
    bio,
    portrait,
    links,
    background,
    tools,
    skills,
    works,
    posts,
    analytics,
    roles,
    note: connectNote,
    order,
    titles: allTitles,
    coverWord,
    coverSplit,
    coverItalic,
    grain,
    reduced,
    seen,
    hl,
    setHl,
    liked,
    toggleLike,
    roleIx: clamp(roleIx, 0, Math.max(0, roles.length - 1)),
    setRoleIx,
    go,
    openCard: setCard,
    copy,
    sheetEls,
  }

  const style = {
    minHeight: height,
    "--efo-accent": accent,
    ...(fonts?.display ? { "--efo-serif": fonts.display } : null),
    ...(fonts?.mono ? { "--efo-mono": fonts.mono } : null),
  } as React.CSSProperties

  const n = order.length
  const cur = clamp(active, 0, n - 1)

  return (
    <div ref={rootRef} className={"efo-root " + className} data-theme={theme} style={style}>
      <style>{EFO_CSS}</style>

      <div className="efo-barwrap">
        <header className="efo-bar">
          <p className="efo-brand">
            <b>{name}</b>
            <i>{allTitles.cover} ’{year.slice(-2)}</i>
          </p>
          <nav className="efo-idx" aria-label="Sheets">
            {order.map((id, i) => (
              <button key={id} type="button" aria-current={i === cur ? "true" : undefined} onClick={() => go(i)}>
                <em>{pad2(i + 1)}</em>
                {allTitles[id]}
              </button>
            ))}
          </nav>
          <div className="efo-step">
            <button type="button" className="efo-tbtn" aria-label="Previous sheet" disabled={cur === 0} onClick={() => go(cur - 1)}>
              ←
            </button>
            <span aria-live="polite">
              {pad2(cur + 1)} / {pad2(n)} · {allTitles[order[cur]]}
            </span>
            <button type="button" className="efo-tbtn" aria-label="Next sheet" disabled={cur === n - 1} onClick={() => go(cur + 1)}>
              →
            </button>
          </div>
          <div className="efo-tools">
            <button ref={gridBtn} type="button" className="efo-tbtn" aria-label="Contact sheet: every sheet at once" aria-expanded={overview} onClick={() => setOverview((o) => !o)}>
              <GridIcon />
              <span className="efo-tlabel">Contact sheet</span>
              <kbd className="efo-kbd">G</kbd>
            </button>
            <button type="button" className="efo-tbtn" aria-label={theme === "dark" ? "Switch to light paper" : "Switch to dark paper"} onClick={toggleTheme}>
              <svg className="efo-moon" viewBox="0 0 16 16" aria-hidden="true">
                <circle cx="8" cy="8" r="6.3" fill="none" stroke="currentColor" strokeWidth="1.2" />
                <path d="M8 1.7a6.3 6.3 0 0 1 0 12.6z" fill="currentColor" />
              </svg>
            </button>
          </div>
        </header>
      </div>

      <main className="efo-main">
        {order.map((id, i) => (
          <SheetFrame key={id} c={c} id={id} i={i} still={false} />
        ))}
      </main>

      {overview ? <ContactSheet c={c} active={cur} onClose={closeOverview} onPick={go} /> : null}
      {card !== null && works[card] ? (
        <CardViewer c={c} index={card} onClose={() => setCard(null)} onNav={(d) => setCard((i) => (i === null ? i : (i + d + works.length) % works.length))} />
      ) : null}

      <div className="efo-toast" data-on={toast ? "" : undefined} role="status" aria-live="polite">
        {toast}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ sheets */

function SheetFrame({ c, id, i, still }: { c: Ctx; id: FolioSection; i: number; still: boolean }) {
  const k = c.uid + (still ? "t" : "s") + i
  const props = { c, k, i, still }
  return (
    <section
      ref={still ? undefined : (el) => void (c.sheetEls.current[i] = el)}
      id={still ? undefined : c.uid + "-" + id}
      data-i={i}
      data-in={still || c.seen[i] ? "" : undefined}
      className={"efo-sheet efo-" + SHORT[id]}
      aria-label={still ? undefined : pad2(i + 1) + " " + c.titles[id]}
    >
      <div className="efo-page">
        {id === "cover" ? <Cover {...props} /> : null}
        {id === "about" ? <About {...props} /> : null}
        {id === "postcards" ? <Postcards {...props} /> : null}
        {id === "socials" ? <Socials {...props} /> : null}
        {id === "experience" ? <Experience {...props} /> : null}
        {id === "connect" ? <Connect {...props} /> : null}
        {c.grain ? <span className="efo-grain" aria-hidden="true" style={{ backgroundImage: "url(" + c.grain + ")" }} /> : null}
        <span className="efo-folio" aria-hidden="true">
          {pad2(i + 1)} / {pad2(c.order.length)}
        </span>
      </div>
    </section>
  )
}

type SheetProps = { c: Ctx; k: string; i: number; still: boolean }

function Cover({ c, still }: SheetProps) {
  const [a, b] = splitWord(c.coverWord, c.coverSplit)
  const italic = c.coverItalic === undefined ? a.length - 1 : c.coverItalic
  const letters = (s: string, off: number) =>
    s.split("").map((ch, j) => (
      <span key={j} className="efo-l" data-it={off + j === italic ? "" : undefined}>
        {ch}
      </span>
    ))
  const move = (e: React.PointerEvent) => {
    if (still || c.reduced || e.pointerType !== "mouse") return
    const el = e.currentTarget as HTMLElement
    const r = el.getBoundingClientRect()
    el.style.setProperty("--px", ((e.clientX - r.left) / r.width - 0.5).toFixed(3))
    el.style.setProperty("--py", ((e.clientY - r.top) / r.height - 0.5).toFixed(3))
  }
  const leave = (e: React.PointerEvent) => {
    const el = e.currentTarget as HTMLElement
    el.style.setProperty("--px", "0")
    el.style.setProperty("--py", "0")
  }
  return (
    <div className="efo-cwrap" onPointerMove={move} onPointerLeave={leave}>
      <span className="efo-vr" aria-hidden="true" />
      <span className="efo-hr" aria-hidden="true" />
      <h1 className="efo-word" aria-label={c.coverWord + ", " + c.name}>
        <span className="efo-wa" aria-hidden="true">
          {letters(a, 0)}
        </span>
        <span className="efo-wb" aria-hidden="true">
          {letters(b, a.length)}
        </span>
      </h1>
      <p className="efo-cmeta efo-rise" style={dv(3)}>
        {c.name}
        <br />
        {c.role}
        <br />
        {c.year}
      </p>
      <span className="efo-ctag efo-fig efo-rise" style={dv(4)} aria-hidden="true">
        fig 1.0
      </span>
      <nav className="efo-contents efo-rise" style={dv(5)} aria-label="Contents">
        {c.order.slice(1).map((id, j) => (
          <button key={id} type="button" onClick={() => c.go(j + 1)}>
            <em>{pad2(j + 2)}</em>
            {c.titles[id]}
          </button>
        ))}
      </nav>
      <p className="efo-chint efo-rise" style={dv(6)}>
        press <kbd className="efo-kbd">G</kbd> for the contact sheet
      </p>
    </div>
  )
}

function About({ c, k }: SheetProps) {
  const link = c.links[0]
  const portrait =
    typeof c.portrait === "string" ? (
      <img src={c.portrait} alt={c.name} width={240} height={264} className="efo-photo" style={{ maxWidth: "none", aspectRatio: "10 / 11" }} />
    ) : c.portrait ? (
      c.portrait
    ) : (
      <PortraitArt id={k + "p"} />
    )
  return (
    <>
      <h2 className="efo-vt efo-h">{c.titles.about}</h2>
      {c.bio ? (
        <p className="efo-bio efo-rise" style={dv(1)}>
          <span className="efo-fig">“</span>
          {c.bio}
          <span className="efo-fig">”</span>
        </p>
      ) : null}
      <div className="efo-me efo-rise" style={dv(2)}>
        <div className="efo-portrait">{portrait}</div>
        <dl className="efo-info">
          <div>
            <dt>Name:</dt>
            <dd>{c.name}</dd>
          </div>
          {c.location ? (
            <div>
              <dt>Based:</dt>
              <dd>{c.location}</dd>
            </div>
          ) : null}
          <div>
            <dt>Contact:</dt>
            <dd>
              <button type="button" className="efo-ul" onClick={() => c.copy(c.email, "Email")} title="Copy email">
                {c.email}
              </button>
            </dd>
          </div>
          {link ? (
            <div>
              <dt>{link.label}:</dt>
              <dd>
                <a className="efo-ul" href={link.href} target="_blank" rel="noreferrer">
                  Click here
                </a>
              </dd>
            </div>
          ) : null}
        </dl>
      </div>
      <div className="efo-acol">
        {c.background.length ? (
          <div className="efo-rise" style={dv(1)}>
            <div className="efo-bh">
              <span className="efo-rule" />
              <h3>Background</h3>
            </div>
            {c.background.map((b, j) => (
              <p key={j} className="efo-row">
                {b}
              </p>
            ))}
          </div>
        ) : null}
        <div className="efo-rise" style={dv(3)}>
          <div className="efo-bh">
            <h3>Skills</h3>
            <span className="efo-rule" />
          </div>
          {c.tools.length ? (
            <div className="efo-toolrow">
              {c.tools.map((t, j) => {
                const m = toolMark(t)
                return (
                  <span key={j} className="efo-tool" data-round={m.round ? "" : undefined} tabIndex={0} aria-label={m.name}>
                    {m.mark}
                    <span className="efo-tip" aria-hidden="true">
                      {m.name}
                    </span>
                  </span>
                )
              })}
            </div>
          ) : null}
          {c.skills.map((row, j) => (
            <p key={j} className="efo-row">
              {row.map((s, x) => (
                <React.Fragment key={x}>
                  {x ? <span className="efo-bar-sep">|</span> : null}
                  {s}
                </React.Fragment>
              ))}
            </p>
          ))}
        </div>
      </div>
    </>
  )
}

const COLLAGE = [
  { x: 5, y: 5, w: 62, r: -5 },
  { x: 33, y: 47, w: 60, r: 4 },
  { x: 62, y: 6, w: 36, r: 7 },
  { x: 3, y: 60, w: 33, r: -8 },
]

function Postcards({ c, k }: SheetProps) {
  return (
    <>
      <div className="efo-collage efo-rise" style={dv(1)}>
        <Wash id={k + "w"} seed={3} />
        {c.works.slice(0, COLLAGE.length).map((w, j) => {
          const L = COLLAGE[j]
          return (
            <button
              key={j}
              type="button"
              className="efo-card"
              data-hl={c.hl === "w" + j ? "" : undefined}
              style={{ "--x": L.x + "%", "--y": L.y + "%", "--w": L.w + "%", "--r": L.r + "deg" } as React.CSSProperties}
              onMouseEnter={() => c.setHl("w" + j)}
              onMouseLeave={() => c.setHl(null)}
              onFocus={() => c.setHl("w" + j)}
              onBlur={() => c.setHl(null)}
              onClick={() => c.openCard(j)}
              aria-label={"Open postcard: " + w.title}
            >
              <span className="efo-tape" aria-hidden="true" />
              <WorkArt w={w} id={k + "a" + j} />
              <span className="efo-cfig efo-fig" aria-hidden="true">
                fig {w.fig ?? j + 2 + ".0"}
              </span>
            </button>
          )
        })}
      </div>
      <div className="efo-wcol">
        <div className="efo-sech efo-rise" style={dv(0)}>
          <span className="efo-rule" />
          <h2 className="efo-h">{c.titles.postcards}</h2>
        </div>
        {c.works.map((w, j) => (
          <button
            key={j}
            type="button"
            className="efo-work efo-rise"
            style={dv(2 + j)}
            data-hl={c.hl === "w" + j ? "" : undefined}
            onMouseEnter={() => c.setHl("w" + j)}
            onMouseLeave={() => c.setHl(null)}
            onClick={() => c.openCard(j)}
          >
            <Star />
            <span>
              <b>
                fig. {w.fig ?? j + 2 + ".0"} : {w.title}
                <span className="efo-open" aria-hidden="true">
                  view ↗
                </span>
              </b>
              <span className="efo-wd">{w.description}</span>
            </span>
            {(w.points ?? []).map((p, x) => (
              <React.Fragment key={x}>
                <Star />
                <span className="efo-wd">{p}</span>
              </React.Fragment>
            ))}
          </button>
        ))}
      </div>
    </>
  )
}

function Socials({ c, k, i, still }: SheetProps) {
  const a = c.analytics
  return (
    <>
      <div className="efo-sech efo-rise" style={dv(0)}>
        <h2 className="efo-h">{c.titles.socials}</h2>
        <span className="efo-rule" />
      </div>
      {c.posts.length ? (
        <div className="efo-posts">
          {c.posts.slice(0, 2).map((p, j) => (
            <div
              key={j}
              className="efo-pentry efo-rise"
              style={dv(1 + j)}
              data-hl={c.hl === "p" + j ? "" : undefined}
              onMouseEnter={() => c.setHl("p" + j)}
              onMouseLeave={() => c.setHl(null)}
            >
              <span className="efo-figline">
                fig. {p.fig ?? j + 4 + ".0"} : {p.title}
                <Arrow />
              </span>
              <span>{p.description}</span>
            </div>
          ))}
        </div>
      ) : null}
      {c.posts.length ? (
        <div className="efo-phones efo-rise" style={dv(2)}>
          {c.posts.slice(0, 2).map((p, j) => (
            <Phone key={j} c={c} p={p} j={j} k={k} />
          ))}
        </div>
      ) : null}
      {a ? (
        <div className="efo-stat efo-rise" style={dv(3)}>
          <p className="efo-figline">fig. {a.fig ?? "6.0"} : {a.title}</p>
          <p style={{ color: "var(--efo-soft)" }}>{a.description}</p>
          <Arrow className="efo-down" />
          <StatCard a={a} run={!!c.seen[i]} instant={still || c.reduced} />
        </div>
      ) : null}
    </>
  )
}

function Phone({ c, p, j, k }: { c: Ctx; p: FolioPost; j: number; k: string }) {
  const liked = !!c.liked[j]
  const [burst, setBurst] = React.useState(0)
  const [follow, setFollow] = React.useState(false)
  const handle = p.handle ?? c.first.toLowerCase()
  const count = (p.likes ?? 0) + (liked ? 1 : 0)
  return (
    <figure className="efo-phone" data-hl={c.hl === "p" + j ? "" : undefined} onMouseEnter={() => c.setHl("p" + j)} onMouseLeave={() => c.setHl(null)}>
      <div className="efo-screen">
        <div className="efo-ighead">
          <span className="efo-av" aria-hidden="true">
            <span />
          </span>
          <span className="efo-handle">{handle}</span>
          <button type="button" className="efo-follow" aria-pressed={follow} onClick={() => setFollow((f) => !f)}>
            {follow ? "Following" : "Follow"}
          </button>
        </div>
        <div
          className="efo-postart"
          onDoubleClick={() => {
            c.toggleLike(j, true)
            setBurst((b) => b + 1)
          }}
          title="Double-click to like"
        >
          {p.image ? (
            <img src={p.image} alt={p.title} width={400} height={400} className="efo-photo" style={{ maxWidth: "none", aspectRatio: "1 / 1" }} />
          ) : (
            <Art motif={p.motif ?? "portrait"} w={200} h={200} palette={p.palette} text={p.artText ?? p.title} seed={p.title} id={k + "pa" + j} />
          )}
          {burst ? (
            <span key={burst} className="efo-burst" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d={HEART} />
              </svg>
            </span>
          ) : null}
        </div>
        <div className="efo-igact">
          <button type="button" className="efo-like" aria-pressed={liked} aria-label={liked ? "Unlike post" : "Like post"} onClick={() => c.toggleLike(j)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d={HEART} />
            </svg>
          </button>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20.5 11.5a8.5 8.5 0 0 1-12.4 7.6L3.5 20.5l1.4-4.4A8.5 8.5 0 1 1 20.5 11.5z" />
          </svg>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21 3 10.5 13.5M21 3l-6.5 18-4-7.5L3 9.5 21 3z" />
          </svg>
          <svg viewBox="0 0 24 24" aria-hidden="true" style={{ marginLeft: "auto" }}>
            <path d="M6 3h12v18l-6-4.5L6 21z" />
          </svg>
        </div>
        <p className="efo-iglikes">{count.toLocaleString("en")} likes</p>
        <p className="efo-igcap">
          <b>{handle}</b> {p.caption ?? p.description}
        </p>
      </div>
      <figcaption className="efo-sr">{p.title}</figcaption>
    </figure>
  )
}

const HEART = "M12 20.6s-7.6-4.6-9.5-9.3C1 7.6 3.3 4 6.9 4c2.1 0 3.6 1.2 5.1 3.1C13.5 5.2 15 4 17.1 4c3.6 0 5.9 3.6 4.4 7.3-1.9 4.7-9.5 9.3-9.5 9.3z"

function StatCard({ a, run, instant }: { a: FolioAnalytics; run: boolean; instant: boolean }) {
  const [hov, setHov] = React.useState(null as number | null)
  const W = 200
  const H = 58
  const P = 4
  const trend = a.trend ?? []
  const { d, pts } = trendPath(trend, W, H, P)
  const onMove = (e: React.PointerEvent) => {
    const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
    setHov(nearestIndex(((e.clientX - r.left) / r.width) * W, W, P, trend.length))
  }
  const hp = hov === null ? null : pts[hov]
  return (
    <div className="efo-scard">
      <p className="efo-sct">
        {a.cardTitle ?? "Overall performance"}
        <span>{a.period ?? "Last 30 days"}</span>
      </p>
      <div className="efo-stats">
        {a.stats.slice(0, 3).map((s, j) => (
          <Stat key={j} s={s} run={run} instant={instant} />
        ))}
      </div>
      {d ? (
        <svg className="efo-spark" viewBox={"0 0 " + W + " " + H} width={W} height={H} onPointerMove={onMove} onPointerLeave={() => setHov(null)} role="img" aria-label={"Trend over " + trend.length + " days"}>
          <path d={d + "L" + (W - P) + " " + H + "L" + P + " " + H + "Z"} style={{ fill: "var(--efo-accent)" }} opacity=".28" />
          <path className="efo-line" d={d} pathLength={1} />
          {hp ? (
            <>
              <line x1={hp.x} x2={hp.x} y1={0} y2={H} stroke="#151515" strokeOpacity=".25" strokeDasharray="2 2" />
              <circle cx={hp.x} cy={hp.y} r={3.2} fill="#fff" stroke="#151515" strokeWidth={1.4} />
            </>
          ) : null}
        </svg>
      ) : null}
      {d ? <p className="efo-sfoot">{hov === null ? "Hover the line for a day" : "Day " + (hov + 1) + " · " + trend[hov].toLocaleString("en")}</p> : null}
    </div>
  )
}

function Stat({ s, run, instant }: { s: { label: string; value: number; suffix?: string }; run: boolean; instant: boolean }) {
  const v = useCountUp(s.value, run, instant)
  return (
    <div>
      <b>
        {formatCompact(v)}
        {s.suffix ?? ""}
      </b>
      <span>{s.label}</span>
    </div>
  )
}

function Experience({ c, k, still }: SheetProps) {
  const r = c.roles[c.roleIx]
  if (!r) return null
  const tabKeys = (e: React.KeyboardEvent, j: number) => {
    const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0
    if (!d) return
    e.preventDefault()
    e.stopPropagation()
    const n = (j + d + c.roles.length) % c.roles.length
    c.setRoleIx(n)
    const next = (e.currentTarget.parentElement?.children[n] as HTMLElement | undefined) ?? null
    next?.focus()
  }
  return (
    <>
      <div>
        <div className="efo-sech efo-rise" style={dv(0)}>
          <h2 className="efo-h">{c.titles.experience}</h2>
          <span className="efo-rule" />
        </div>
        {c.roles.length > 1 ? (
          <div className="efo-tabs efo-rise" style={dv(1)} role="tablist" aria-label="Roles">
            {c.roles.map((x, j) => (
              <button
                key={j}
                type="button"
                role="tab"
                id={k + "tab" + j}
                aria-selected={j === c.roleIx}
                aria-controls={k + "panel"}
                tabIndex={j === c.roleIx ? 0 : -1}
                className="efo-tab"
                onClick={() => c.setRoleIx(j)}
                onKeyDown={(e) => tabKeys(e, j)}
              >
                <em>{pad2(j + 1)}</em>
                {x.company}
              </button>
            ))}
          </div>
        ) : null}
        <div className="efo-rise" style={dv(2)}>
          <div key={still ? 0 : c.roleIx} className={still ? undefined : "efo-swap"} role={c.roles.length > 1 ? "tabpanel" : undefined} id={k + "panel"} aria-labelledby={c.roles.length > 1 ? k + "tab" + c.roleIx : undefined}>
            {r.title || r.period ? <p className="efo-rmeta">{[r.title, r.period].filter(Boolean).join(" · ")}</p> : null}
            <ul className="efo-bul">
              <li>
                <Star />
                <span>{r.company}</span>
              </li>
              {r.points.map((p, j) => (
                <li key={j}>
                  <Star />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="efo-exart efo-rise" style={dv(2)}>
        <span className="efo-figtag">
          <span className="efo-fig">fig {r.fig ?? "1." + c.roleIx}</span>
          <Arrow />
        </span>
        <div className="efo-framewrap">
          <Wash id={k + "w"} seed={9} />
          <div key={still ? 0 : c.roleIx} className={"efo-frame" + (still ? "" : " efo-swap")}>
            {r.image ? (
              <img src={r.image} alt={r.company} width={480} height={480} className="efo-photo" style={{ maxWidth: "none", aspectRatio: "1 / 1" }} />
            ) : (
              <Art motif={r.motif ?? "mailer"} w={240} h={240} palette={r.palette} text={r.artText} seed={r.company} id={k + "ra"} />
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function Connect({ c, k, still }: SheetProps) {
  const [msg, setMsg] = React.useState("")
  const [subject, setSubject] = React.useState("")
  const t = c.titles.connect.trim()
  const cut = t.indexOf(" ")
  const lines = cut > 0 ? [t.slice(0, cut), t.slice(cut + 1)] : [t]
  const send = (e: React.FormEvent) => {
    e.preventDefault()
    window.location.href = mailtoHref(c.email, subject || "Hello from your portfolio", msg)
  }
  return (
    <>
      <h2 className="efo-lets efo-h" aria-label={t}>
        {lines.map((l, j) => (
          <span key={j} aria-hidden="true">
            {l}
          </span>
        ))}
      </h2>
      <div className="efo-contact efo-rise" style={dv(1)}>
        <div className="efo-ctop">
          <span>Contact</span>
          <button type="button" className="efo-mail" onClick={() => c.copy(c.email, "Email")} title="Copy email">
            {c.email}
          </button>
          {c.phone ? (
            <a className="efo-mail" href={"tel:" + c.phone.replace(/[^\d+]/g, "")}>
              {c.phone}
            </a>
          ) : null}
        </div>
        <p className="efo-note">{c.note}</p>
        <form className="efo-compose" onSubmit={send} aria-label="Write a postcard">
          <label className="efo-sr" htmlFor={k + "subj"}>
            Subject
          </label>
          <input
            id={k + "subj"}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            maxLength={80}
            tabIndex={still ? -1 : undefined}
            style={{ gridColumn: 1, border: 0, outline: "none", background: "transparent", fontWeight: 700, padding: 0 }}
          />
          <Stamp id={k + "st"} year={c.year} />
          <label className="efo-sr" htmlFor={k + "msg"}>
            Message
          </label>
          <textarea id={k + "msg"} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={"Dear " + c.first + ","} maxLength={400} rows={4} tabIndex={still ? -1 : undefined} />
          <div className="efo-cfoot">
            <span>{msg.length} / 400</span>
            <button type="submit" className="efo-send" tabIndex={still ? -1 : undefined}>
              Send postcard ↗
            </button>
          </div>
        </form>
        {c.links.length ? (
          <ul className="efo-links">
            {c.links.map((l) => (
              <li key={l.label}>
                <a className="efo-ul" href={l.href} target="_blank" rel="noreferrer">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="efo-band">
        <p className="efo-name" aria-label={c.name}>
          {c.name.split("").map((ch, j) => (
            <span key={j} aria-hidden="true">
              {ch === " " ? " " : ch}
            </span>
          ))}
        </p>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ overlays */

function ContactSheet({ c, active, onClose, onPick }: { c: Ctx; active: number; onClose: () => void; onPick: (i: number) => void }) {
  const tiles = React.useRef([] as (HTMLButtonElement | null)[])
  React.useEffect(() => {
    tiles.current[active]?.focus()
  }, [])
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault()
      onClose()
      return
    }
    const n = c.order.length
    const i = tiles.current.findIndex((t) => t === document.activeElement)
    if (i < 0) return
    const cols = innerWidth >= 700 ? 2 : 1
    const j =
      e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "ArrowDown" ? i + cols : e.key === "ArrowUp" ? i - cols : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1
    if (j >= 0 && j < n) {
      e.preventDefault()
      tiles.current[j]?.focus()
    }
  }
  return (
    <div className="efo-ov" role="dialog" aria-modal="true" aria-label="Contact sheet" onKeyDown={onKeyDown}>
      <div className="efo-ovhead">
        <p>
          <span className="efo-h">Contact sheet</span>
          <span>
            {c.order.length} sheets · pick one to open it
          </span>
        </p>
        <button type="button" className="efo-tbtn" onClick={onClose}>
          Close <kbd className="efo-kbd">Esc</kbd>
        </button>
      </div>
      <div className="efo-ovgrid">
        {c.order.map((id, i) => (
          <Tile key={id} c={c} id={id} i={i} current={i === active} onPick={onPick} btnRef={(el) => void (tiles.current[i] = el)} />
        ))}
      </div>
    </div>
  )
}

function Tile({ c, id, i, current, onPick, btnRef }: { c: Ctx; id: FolioSection; i: number; current: boolean; onPick: (i: number) => void; btnRef: (el: HTMLButtonElement | null) => void }) {
  const frame = React.useRef(null as HTMLDivElement | null)
  const [scale, setScale] = React.useState(0.45)
  useIsoLayoutEffect(() => {
    const el = frame.current
    if (!el) return
    const set = () => setScale(el.clientWidth / 1200)
    set()
    if (typeof ResizeObserver !== "function") return
    const ro = new ResizeObserver(set)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div className="efo-tile" style={dv(i)}>
      <div className="efo-tframe" ref={frame}>
        <div className="efo-tinner" style={{ transform: "scale(" + scale + ")" }} aria-hidden="true" ref={(el) => el?.setAttribute("inert", "")}>
          <SheetFrame c={c} id={id} i={i} still />
        </div>
        <button ref={btnRef} type="button" className="efo-tcover" aria-current={current ? "true" : undefined} aria-label={"Open " + pad2(i + 1) + " " + c.titles[id]} onClick={() => onPick(i)} />
      </div>
      <p className="efo-tcap">
        <span>{pad2(i + 1)}</span>
        <span className="efo-h">{c.titles[id]}</span>
        {current ? <span>· you are here</span> : null}
      </p>
    </div>
  )
}

function CardViewer({ c, index, onClose, onNav }: { c: Ctx; index: number; onClose: () => void; onNav: (d: number) => void }) {
  const w = c.works[index]
  const n = c.works.length
  const [flipped, setFlipped] = React.useState(false)
  const box = React.useRef(null as HTMLDivElement | null)
  const closeBtn = React.useRef(null as HTMLButtonElement | null)
  React.useEffect(() => setFlipped(false), [index])
  React.useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    closeBtn.current?.focus()
    return () => prev?.focus?.({ preventScroll: true })
  }, [])
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault()
      onClose()
    } else if (e.key === "ArrowRight" && n > 1) {
      e.preventDefault()
      onNav(1)
    } else if (e.key === "ArrowLeft" && n > 1) {
      e.preventDefault()
      onNav(-1)
    } else if (e.key.toLowerCase() === "f") {
      e.preventDefault()
      setFlipped((f) => !f)
    } else if (e.key === "Tab" && box.current) {
      const f = Array.from(box.current.querySelectorAll("button,a[href]")) as HTMLElement[]
      if (!f.length) return
      const first = f[0]
      const last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }
  const fig = w.fig ?? index + 2 + ".0"
  return (
    <div className="efo-lb" role="dialog" aria-modal="true" aria-label={"Postcard: " + w.title} onKeyDown={onKeyDown} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="efo-lbin" ref={box}>
        <div className="efo-lbtop">
          <span className="efo-fig">fig. {fig}</span>
          <span>
            {index + 1} / {n}
          </span>
          <button ref={closeBtn} type="button" className="efo-lbbtn" onClick={onClose}>
            Close <kbd className="efo-kbd">Esc</kbd>
          </button>
        </div>
        <button type="button" className="efo-flip" key={index} data-flipped={flipped ? "" : undefined} aria-pressed={flipped} aria-label={flipped ? "Turn to the front" : "Turn the postcard over"} onClick={() => setFlipped((f) => !f)}>
          <span className="efo-flipi">
            <span className="efo-face" aria-hidden="true">
              <WorkArt w={w} id={c.uid + "lb" + index} />
            </span>
            <span className="efo-face efo-back" aria-hidden="true">
              <span className="efo-bmsg">
                <b>Dear reader,</b>
                <span>{w.description}</span>
                {(w.points ?? []).map((p, j) => (
                  <span key={j}>{p}</span>
                ))}
                <span>— {c.first}</span>
              </span>
              <span className="efo-bside">
                <span className="efo-btop">
                  <Postmark id={c.uid + "pm" + index} text={(w.client ?? w.title) + " · " + (w.year ?? c.year)} />
                  <span className="efo-bstamp">
                    <WorkArt w={w} id={c.uid + "bs" + index} />
                  </span>
                </span>
                <span className="efo-addr">
                  <span>{w.client ?? w.title}</span>
                  <span>fig. {fig}</span>
                  <span>{w.year ?? c.year}</span>
                </span>
              </span>
            </span>
          </span>
        </button>
        <div className="efo-lbcap">
          <h3>{w.title}</h3>
          <p>{[w.client, w.year].filter(Boolean).join(" · ")}</p>
          <p>{w.description}</p>
        </div>
        <div className="efo-lbbar">
          {n > 1 ? (
            <button type="button" className="efo-lbbtn" onClick={() => onNav(-1)}>
              ← Previous
            </button>
          ) : null}
          <button type="button" className="efo-lbbtn" onClick={() => setFlipped((f) => !f)}>
            {flipped ? "Front" : "Flip it over"} <kbd className="efo-kbd">F</kbd>
          </button>
          {n > 1 ? (
            <button type="button" className="efo-lbbtn" onClick={() => onNav(1)}>
              Next →
            </button>
          ) : null}
          {w.href ? (
            <a className="efo-lbbtn" href={w.href} target="_blank" rel="noreferrer">
              Visit ↗
            </a>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ drawing */

function Star() {
  return (
    <svg className="efo-star" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 0C12.9 7.6 16.4 11.1 24 12 16.4 12.9 12.9 16.4 12 24 11.1 16.4 7.6 12.9 0 12 7.6 11.1 11.1 7.6 12 0Z" />
    </svg>
  )
}

function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg className={"efo-arrow " + className} viewBox="0 0 64 20" aria-hidden="true">
      <path pathLength={1} d="M2 11C11 4 20 15 30 10S47 4 59 10" />
      <path pathLength={1} d="M52 4.5 59.5 10 52.5 15.5" />
    </svg>
  )
}

function GridIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <rect x="1" y="1" width="5" height="5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <rect x="8" y="1" width="5" height="5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <rect x="1" y="8" width="5" height="5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <rect x="8" y="8" width="5" height="5" fill="currentColor" />
    </svg>
  )
}

// A torn sheet of watercolour in the accent colour, behind the collages.
function Wash({ id, seed }: { id: string; seed: number }) {
  return (
    <svg className="efo-wash" viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" aria-hidden="true">
      <defs>
        <filter id={id + "d"} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves={3} seed={seed} result="t" />
          <feDisplacementMap in="SourceGraphic" in2="t" scale={5} />
        </filter>
        <filter id={id + "m"} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.09 0.05" numOctaves={4} seed={seed + 4} />
          <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -1.3 .95" />
        </filter>
        <clipPath id={id + "c"}>
          <path d={roughRectPath(90, 88, 1.2, 4, seed)} transform="translate(5 6)" />
        </clipPath>
      </defs>
      <g filter={"url(#" + id + "d)"}>
        <path d={roughRectPath(90, 88, 1.2, 4, seed)} transform="translate(5 6)" style={{ fill: "var(--efo-card)" }} />
        <path d={roughRectPath(86, 84, 1.6, 5, seed + 1)} transform="translate(7 8)" style={{ fill: "var(--efo-accent)" }} opacity=".9" />
      </g>
      <g clipPath={"url(#" + id + "c)"}>
        <rect width="100" height="100" filter={"url(#" + id + "m)"} opacity=".35" />
        <path d="M10 30C30 22 52 36 92 24M8 64C34 56 60 72 94 60M14 84C40 78 62 90 90 82" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  )
}

function WorkArt({ w, id }: { w: FolioWork; id: string }) {
  if (w.image) return <img src={w.image} alt={w.title} width={600} height={400} className="efo-photo" style={{ maxWidth: "none", aspectRatio: "3 / 2" }} />
  return <Art motif={w.motif ?? "bubble"} w={300} h={200} palette={w.palette} text={w.artText} seed={w.title} id={id} />
}

function starPath(cx: number, cy: number, s: number): string {
  const q = s * 0.14
  return (
    "M" + fx(cx) + " " + fx(cy - s) +
    "Q" + fx(cx + q) + " " + fx(cy - q) + " " + fx(cx + s) + " " + fx(cy) +
    "Q" + fx(cx + q) + " " + fx(cy + q) + " " + fx(cx) + " " + fx(cy + s) +
    "Q" + fx(cx - q) + " " + fx(cy + q) + " " + fx(cx - s) + " " + fx(cy) +
    "Q" + fx(cx - q) + " " + fx(cy - q) + " " + fx(cx) + " " + fx(cy - s) + "Z"
  )
}

const SERIF = { fontFamily: "var(--efo-serif)" }
const MONO = { fontFamily: "var(--efo-mono)" }
const SANS = { fontFamily: '"Arial Narrow","Helvetica Neue",Arial,sans-serif' }

// Every artwork in the template: postcards, posts and framed pieces.
function Art({ motif, w, h, palette, text, seed, id }: { motif: ArtMotif; w: number; h: number; palette?: string[]; text?: string; seed: string; id: string }) {
  const base = PALETTES[motif] ?? PALETTES.bubble
  const p = [0, 1, 2].map((i) => palette?.[i] ?? base[i])
  const r = mulberry32(hashString(motif + "|" + seed))
  const m = Math.min(w, h)
  let body: React.ReactNode = null

  if (motif === "bubble") {
    const bubbles = Array.from({ length: 14 }, () => ({ x: r() * w, y: r() * h * 0.9, s: m * (0.05 + r() * 0.17) }))
    body = (
      <>
        <defs>
          <linearGradient id={id + "g"} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={p[0]} />
            <stop offset="1" stopColor={p[1]} />
          </linearGradient>
          <radialGradient id={id + "b"} cx=".34" cy=".3" r=".75">
            <stop offset="0" stopColor="#fff" stopOpacity=".95" />
            <stop offset=".32" stopColor="#fff" stopOpacity=".22" />
            <stop offset="1" stopColor={p[1]} stopOpacity=".55" />
          </radialGradient>
        </defs>
        <rect width={w} height={h} fill={"url(#" + id + "g)"} />
        {bubbles.map((b, i) => (
          <circle key={i} cx={b.x} cy={b.y} r={b.s} fill={"url(#" + id + "b)"} stroke="#fff" strokeOpacity=".75" strokeWidth={m * 0.006} />
        ))}
        <g transform={"rotate(-4 " + w * 0.36 + " " + h * 0.74 + ")"}>
          <rect x={w * 0.07} y={h * 0.63} width={w * 0.58} height={h * 0.18} fill={p[2]} />
          <text x={w * 0.36} y={h * 0.755} textAnchor="middle" fontSize={h * 0.1} fill="#4a4366" fontStyle="italic" letterSpacing="1" style={SERIF}>
            {text ?? "tis the season"}
          </text>
        </g>
        {[0, 1, 2, 3, 4].map((i) => (
          <path key={i} d={starPath(r() * w, r() * h * 0.6, m * (0.025 + r() * 0.03))} fill="#fff" />
        ))}
      </>
    )
  } else if (motif === "night") {
    const cols = 5
    const rows = 3
    const x0 = w * 0.05
    const y0 = h * 0.06
    const cw = (w * 0.9) / cols
    const ch = (h * 0.64) / rows
    const s = Math.min(cw, ch) * 0.26
    const cells: React.ReactNode[] = []
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cx = x0 + cw * (x + 0.5)
        const cy = y0 + ch * (y + 0.5)
        const kind = (x + y * 2) % 4
        const key = x + "-" + y
        cells.push(<rect key={"r" + key} x={x0 + cw * x} y={y0 + ch * y} width={cw} height={ch} fill="none" stroke={p[1]} strokeOpacity=".22" />)
        if (kind === 0)
          cells.push(
            <g key={key} stroke={p[1]} strokeWidth={1.4} strokeLinecap="round">
              {[0, 60, 120].map((a) => (
                <line key={a} x1={cx - s} y1={cy} x2={cx + s} y2={cy} transform={"rotate(" + a + " " + cx + " " + cy + ")"} />
              ))}
            </g>,
          )
        else if (kind === 1)
          cells.push(
            <g key={key}>
              <rect x={cx - s * 0.25} y={cy - s * 1.15} width={s * 0.5} height={s * 0.35} fill={p[1]} />
              <circle cx={cx} cy={cy} r={s * 0.8} fill={p[2]} />
              <path d={"M" + (cx - s * 0.8) + " " + cy + "Q" + cx + " " + (cy + s * 0.4) + " " + (cx + s * 0.8) + " " + cy} stroke={p[1]} fill="none" strokeWidth={1} />
            </g>,
          )
        else if (kind === 2) cells.push(<path key={key} d={starPath(cx, cy, s)} fill={p[1]} />)
        else cells.push(<path key={key} d={"M" + cx + " " + (cy - s) + "L" + (cx + s * 0.8) + " " + (cy + s * 0.8) + "L" + (cx - s * 0.8) + " " + (cy + s * 0.8) + "Z"} fill={p[2]} />)
      }
    }
    body = (
      <>
        <rect width={w} height={h} fill={p[0]} />
        {cells}
        <rect x={w * 0.05} y={h * 0.75} width={w * 0.9} height={h * 0.16} fill={p[1]} />
        <text x={w / 2} y={h * 0.855} textAnchor="middle" fontSize={h * 0.062} fill={p[0]} letterSpacing="3" fontWeight={700} style={MONO}>
          {(text ?? "season's greetings").toUpperCase()}
        </text>
      </>
    )
  } else if (motif === "bloom") {
    const flowers = Array.from({ length: 6 }, () => ({ x: w * (0.08 + r() * 0.84), y: h * (0.12 + r() * 0.5), s: m * (0.09 + r() * 0.1), a: r() * 60 }))
    body = (
      <>
        <rect width={w} height={h} fill={p[0]} />
        {flowers.map((f, i) => (
          <g key={i}>
            <path d={"M" + f.x + " " + f.y + "Q" + (f.x + f.s) + " " + (f.y + h * 0.3) + " " + f.x + " " + h} stroke={p[2]} strokeWidth={1.4} fill="none" />
            {[0, 1, 2, 3, 4, 5].map((j) => (
              <ellipse key={j} cx={f.x + f.s * 0.5} cy={f.y} rx={f.s * 0.5} ry={f.s * 0.2} fill={p[1]} opacity=".88" transform={"rotate(" + (f.a + j * 60) + " " + f.x + " " + f.y + ")"} />
            ))}
            <circle cx={f.x} cy={f.y} r={f.s * 0.18} fill={p[2]} />
          </g>
        ))}
        <text x={w * 0.06} y={h * 0.93} fontSize={h * 0.13} fill={p[2]} fontStyle="italic" style={SERIF}>
          {text ?? "in bloom"}
        </text>
      </>
    )
  } else if (motif === "grid") {
    body = (
      <>
        <rect width={w} height={h} fill={p[0]} />
        <circle cx={w * 0.66} cy={h * 0.4} r={m * 0.3} fill={p[2]} />
        {Array.from({ length: 9 }, (_, i) => (
          <line key={i} x1={0} x2={w} y1={h * (0.1 + i * 0.1)} y2={h * (0.1 + i * 0.1)} stroke={p[1]} strokeOpacity=".18" />
        ))}
        <rect x={w * 0.08} y={h * 0.1} width={w * 0.05} height={h * 0.5} fill={p[1]} />
        <text x={w * 0.08} y={h * 0.86} fontSize={h * 0.2} fill={p[1]} letterSpacing="-1" style={SERIF}>
          {text ?? "On Air"}
        </text>
        <text x={w * 0.08} y={h * 0.95} fontSize={h * 0.04} fill={p[1]} letterSpacing="2" style={MONO}>
          {"FIG. " + (1 + Math.floor(r() * 8)) + ".0 · " + seed.toUpperCase().slice(0, 22)}
        </text>
      </>
    )
  } else if (motif === "portrait") {
    const x0 = w * 0.22
    const x1 = w * 0.78
    const top = h * 0.4
    const bot = h * 0.78
    const rad = (x1 - x0) / 2
    const dots: React.ReactNode[] = []
    for (let a = 0; a <= 180; a += 9) {
      const t = (a * Math.PI) / 180
      dots.push(<circle key={"a" + a} cx={w / 2 - Math.cos(t) * (rad + 6)} cy={top - Math.sin(t) * (rad + 6)} r={1.3} fill={p[1]} />)
    }
    for (let y = top; y <= bot; y += 9) {
      dots.push(<circle key={"l" + y} cx={x0 - 6} cy={y} r={1.3} fill={p[1]} />)
      dots.push(<circle key={"r" + y} cx={x1 + 6} cy={y} r={1.3} fill={p[1]} />)
    }
    const curl = (x: number, y: number, sx: number, sy: number, key: string) => (
      <path key={key} d={"M" + x + " " + y + "c" + 10 * sx + " 0 " + 14 * sx + " " + 8 * sy + " " + 8 * sx + " " + 12 * sy + "s" + -8 * sx + " " + -2 * sy + " " + -3 * sx + " " + -6 * sy} stroke={p[1]} fill="none" strokeWidth={1} />
    )
    body = (
      <>
        <rect width={w} height={h} fill={p[0]} />
        <rect x={w * 0.05} y={h * 0.04} width={w * 0.9} height={h * 0.92} fill="none" stroke={p[1]} strokeWidth={0.8} />
        {curl(w * 0.08, h * 0.08, 1, 1, "c1")}
        {curl(w * 0.92, h * 0.08, -1, 1, "c2")}
        <path d={"M" + x0 + " " + bot + "V" + top + "A" + rad + " " + rad + " 0 0 1 " + x1 + " " + top + "V" + bot + "Z"} fill={p[2]} opacity=".55" stroke={p[1]} strokeWidth={1.2} />
        {dots}
        <path d={"M" + w * 0.33 + " " + bot + "C" + w * 0.34 + " " + h * 0.6 + " " + w * 0.66 + " " + h * 0.6 + " " + w * 0.67 + " " + bot + "Z"} fill={p[1]} />
        <path d={"M" + w * 0.41 + " " + h * 0.58 + "C" + w * 0.38 + " " + h * 0.36 + " " + w * 0.62 + " " + h * 0.36 + " " + w * 0.59 + " " + h * 0.58 + "Z"} fill={p[1]} />
        <ellipse cx={w / 2} cy={h * 0.47} rx={w * 0.065} ry={h * 0.085} fill={p[0]} opacity=".9" />
        <text x={w / 2} y={h * 0.875} textAnchor="middle" fontSize={h * 0.068} fill={p[1]} letterSpacing="2.5" style={SERIF}>
          {(text ?? "Live Tonight").toUpperCase()}
        </text>
        <text x={w / 2} y={h * 0.925} textAnchor="middle" fontSize={h * 0.032} fill={p[1]} letterSpacing="2" style={MONO}>
          ONE NIGHT ONLY · OCT 24
        </text>
      </>
    )
  } else if (motif === "newyear") {
    const words = (text ?? "Happy New Year").toUpperCase().split(/\s+/).slice(0, 4)
    const flute = (cx: number, base: number, s: number, rot: number, key: string) => (
      <g key={key} transform={"rotate(" + rot + " " + cx + " " + base + ")"} stroke={p[1]} strokeWidth={1.4} fill="none" strokeLinejoin="round">
        <path d={"M" + (cx - s * 0.12) + " " + (base - s) + "L" + (cx + s * 0.12) + " " + (base - s) + "L" + (cx + s * 0.05) + " " + (base - s * 0.5) + "L" + (cx - s * 0.05) + " " + (base - s * 0.5) + "Z"} fill={p[2]} fillOpacity=".55" />
        <path d={"M" + cx + " " + (base - s * 0.5) + "V" + base + "M" + (cx - s * 0.13) + " " + base + "H" + (cx + s * 0.13)} />
      </g>
    )
    body = (
      <>
        <rect width={w} height={h} fill={p[0]} />
        {Array.from({ length: 30 }, (_, i) => {
          const x = r() * w
          const y = r() * h
          return <rect key={i} x={x} y={y} width={2 + r() * 3} height={1.2 + r() * 2} fill={i % 3 ? p[2] : p[1]} opacity={0.5 + r() * 0.5} transform={"rotate(" + Math.floor(r() * 180) + " " + fx(x) + " " + fx(y) + ")"} />
        })}
        <g transform={"rotate(-8 " + w / 2 + " " + h / 2 + ")"}>
          {words.map((wd, i) => (
            <text key={i} x={w * 0.1} y={h * (0.3 + i * 0.17)} fontSize={h * 0.17} fontWeight={900} fill={i === words.length - 1 ? p[2] : p[1]} letterSpacing="-0.5" style={SANS}>
              {wd}
            </text>
          ))}
        </g>
        {flute(w * 0.73, h * 0.92, h * 0.38, -14, "f1")}
        {flute(w * 0.83, h * 0.92, h * 0.38, 14, "f2")}
        {[0, 1, 2].map((i) => (
          <path key={i} d={starPath(w * (0.74 + i * 0.05), h * (0.42 - i * 0.05), m * 0.02)} fill={p[2]} />
        ))}
      </>
    )
  } else {
    const [l1, l2] = (text ?? "Your mail|Changed").split("|")
    const qr: React.ReactNode[] = []
    const qs = w * 0.024
    for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) if (r() > 0.48 || (x < 2 && y < 2)) qr.push(<rect key={x + "-" + y} x={w * 0.68 + x * qs} y={h * 0.5 + y * qs} width={qs} height={qs} fill="#111" />)
    body = (
      <>
        <rect width={w} height={h} fill={p[0]} />
        <g transform={"rotate(7 " + w * 0.6 + " " + h * 0.7 + ")"}>
          <rect x={w * 0.3} y={h * 0.5} width={w * 0.62} height={h * 0.38} fill="#f4f1ea" />
          {[0, 1, 2, 3].map((i) => (
            <line key={i} x1={w * 0.36} x2={w * 0.84} y1={h * (0.62 + i * 0.06)} y2={h * (0.62 + i * 0.06)} stroke="#999" strokeWidth={1} />
          ))}
        </g>
        <g transform={"rotate(-6 " + w / 2 + " " + h / 2 + ")"}>
          <rect x={w * 0.08} y={h * 0.12} width={w * 0.78} height={h * 0.6} rx={4} fill={p[1]} />
          <text x={w * 0.13} y={h * 0.27} fontSize={h * 0.1} fontWeight={900} fill="#fff" letterSpacing="-0.5" style={SANS}>
            {(l1 ?? "").toUpperCase()}
          </text>
          <text x={w * 0.13} y={h * 0.47} fontSize={h * 0.17} fill={p[2]} fontStyle="italic" fontWeight={700} style={SERIF}>
            {l2 ?? ""}
          </text>
          <rect x={w * 0.66} y={h * 0.48} width={w * 0.17} height={w * 0.17} fill="#fff" />
          {qr}
          <g stroke="#fff" strokeWidth={1.6} fill="none" strokeLinejoin="round">
            <rect x={w * 0.13} y={h * 0.54} width={w * 0.16} height={h * 0.11} />
            <path d={"M" + w * 0.13 + " " + h * 0.54 + "L" + w * 0.21 + " " + h * 0.61 + "L" + w * 0.29 + " " + h * 0.54} />
          </g>
        </g>
        <circle cx={w * 0.84} cy={h * 0.14} r={m * 0.07} fill={p[2]} />
        <text x={w * 0.84} y={h * 0.165} textAnchor="middle" fontSize={m * 0.08} fontWeight={900} fill={p[0]} style={SANS}>
          !
        </text>
      </>
    )
  }

  return (
    <svg className="efo-art" viewBox={"0 0 " + w + " " + h} width={w} height={h} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {body}
    </svg>
  )
}

// A black-and-white portrait with a torn white edge, for the About sheet.
function PortraitArt({ id }: { id: string }) {
  const edge = roughRectPath(120, 132, 1.6, 6, 11)
  return (
    <svg className="efo-art" viewBox="-3 -3 126 138" width={126} height={138} role="img" aria-label="Portrait">
      <defs>
        <clipPath id={id + "c"}>
          <path d={edge} />
        </clipPath>
        <linearGradient id={id + "g"} x1="0" y1="0" x2=".3" y2="1">
          <stop offset="0" stopColor="#dcdad5" />
          <stop offset="1" stopColor="#9d9a94" />
        </linearGradient>
        <filter id={id + "n"} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves={2} seed={4} />
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .28 0" />
        </filter>
      </defs>
      <path d={edge} fill="#f7f6f2" stroke="#f7f6f2" strokeWidth={5} strokeLinejoin="round" />
      <g clipPath={"url(#" + id + "c)"}>
        <rect width="120" height="132" fill={"url(#" + id + "g)"} />
        <path d="M27 132C22 98 25 60 36 40 45 21 76 19 86 34c12 17 11 62 8 98z" fill="#1b1918" />
        <path d="M12 132c4-20 22-29 48-29s44 9 48 29z" fill="#262423" />
        <path d="M52 84h16v22c-5 4-11 4-16 0z" fill="#c9c3bb" />
        <ellipse cx="60" cy="64" rx="17" ry="21.5" fill="#dbd5cd" />
        <path d="M41 63c-1-21 12-29 26-27 12 2 15 12 13 26-5-11-15-16-26-12-6 2-10 7-13 13z" fill="#1b1918" />
        <path d="M51 67q3-2.2 6 0M63 67q3-2.2 6 0" stroke="#2a2725" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        <path d="M60.5 69q-1.5 6 .8 8" stroke="#8d8780" strokeWidth="1" fill="none" strokeLinecap="round" />
        <path d="M55 79.5q5 3 10 0" stroke="#6e5752" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <path d="M78 46c6 14 6 40 4 62" stroke="#3a3735" strokeWidth=".8" fill="none" opacity=".6" />
        <rect width="120" height="132" filter={"url(#" + id + "n)"} />
      </g>
    </svg>
  )
}

function Stamp({ id, year }: { id: string; year: string }) {
  return (
    <svg className="efo-stamp" viewBox="0 0 48 58" width={48} height={58} aria-hidden="true">
      <defs>
        <mask id={id + "m"}>
          <rect width="48" height="58" fill="#fff" />
          {Array.from({ length: 8 }, (_, i) => (
            <React.Fragment key={i}>
              <circle cx={3 + i * 6} cy={0} r={1.8} fill="#000" />
              <circle cx={3 + i * 6} cy={58} r={1.8} fill="#000" />
            </React.Fragment>
          ))}
          {Array.from({ length: 10 }, (_, i) => (
            <React.Fragment key={i}>
              <circle cx={0} cy={3 + i * 5.8} r={1.8} fill="#000" />
              <circle cx={48} cy={3 + i * 5.8} r={1.8} fill="#000" />
            </React.Fragment>
          ))}
        </mask>
      </defs>
      <g mask={"url(#" + id + "m)"}>
        <rect width="48" height="58" fill="#fbfaf6" />
        <rect x="4" y="4" width="40" height="50" style={{ fill: "var(--efo-accent)" }} />
        <path d={starPath(24, 24, 11)} fill="#fff" />
        <text x="24" y="49" textAnchor="middle" fontSize="7" fill="#fff" style={SERIF} fontStyle="italic">
          {year}
        </text>
      </g>
    </svg>
  )
}

function Postmark({ id, text }: { id: string; text: string }) {
  return (
    <svg className="efo-pm" viewBox="0 0 120 70" width={120} height={70} aria-hidden="true">
      <defs>
        <path id={id} d="M10 35a25 25 0 1 1 50 0 25 25 0 1 1-50 0" />
      </defs>
      <circle cx="35" cy="35" r="30" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="35" cy="35" r="19" fill="none" stroke="currentColor" strokeWidth="1" />
      <text fontSize="7.2" fill="currentColor" letterSpacing="1.2" style={MONO}>
        <textPath href={"#" + id}>{text.toUpperCase().slice(0, 34)}</textPath>
      </text>
      <path d={starPath(35, 35, 7)} fill="currentColor" />
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={"M66 " + (20 + i * 9) + "q7-5 13 0t13 0 13 0 13 0"} fill="none" stroke="currentColor" strokeWidth="1.3" />
      ))}
    </svg>
  )
}
