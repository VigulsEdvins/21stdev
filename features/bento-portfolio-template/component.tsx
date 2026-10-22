"use client"

// Bento Portfolio Template — a whole personal site as a soft, warm-gray bento.
// A portrait and a one-line headline (with a muted "previously" tail), a voice
// note that actually talks (your transcript, read by the browser's own speech
// engine, with a waveform that fills as it goes), an availability pill, then a
// grid of small living cards: an experience timeline, a now-playing record, the
// book on your nightstand, a hand-generated street map of your city, a photo
// carousel, a stepped "how I work" card, selected work with detail sheets, kind
// words, numbers, a toolbox, writing, links and a contact card.
//
// Everything is drawn in this file: portrait, album art, book covers, the map
// and the photos are SVG, the type is the system stack, nothing loads at
// runtime. Pass your own content through props; every section hides itself
// when you leave it empty.
import * as React from "react"

export type BentoRole = {
  company: string
  /** Shown under the company, e.g. "2022" or "2022 – 2024". */
  year: string
  role?: string
  href?: string
}

export type BentoTrack = {
  title: string
  artist: string
  /** Seconds. */
  duration?: number
  /** An audio URL. Without one, playback is simulated (silent). */
  src?: string
  /** An image URL or your own node. Without one, a cover is drawn. */
  art?: string | React.ReactNode
  /** Background of the drawn cover. */
  color?: string
}

export type BentoBook = {
  title: string
  author: string
  /** 0–1, drawn as a reading bar. */
  progress?: number
  /** Cover colour of the drawn book. */
  color?: string
}

export type BentoMoment = {
  caption: string
  emoji?: string
  /** An image URL or your own node. Without one, `scene` is drawn. */
  image?: string | React.ReactNode
  scene?: "football" | "mountains" | "coffee"
}

export type BentoStep = { title: string; description: string }

export type BentoProject = {
  title: string
  client?: string
  year?: string
  description?: string
  tags?: string[]
  href?: string
  /** An image URL or your own node. Without one, a cover is drawn. */
  cover?: string | React.ReactNode
  /** 0–360. Tints the drawn cover; derived from the title when omitted. */
  hue?: number
  /** Which mock the drawn cover shows. */
  kind?: "web" | "app" | "brand"
}

export type BentoTestimonial = { quote: string; name: string; role?: string }
export type BentoStat = { value: number; suffix?: string; label: string }
export type BentoPost = { title: string; date: string; href?: string; minutes?: number }
export type BentoLink = { label: string; href: string; handle?: string }

export type BentoVoiceNote = {
  /** What the note says. Read aloud by the browser and shown as captions. */
  transcript: string
  /** A recorded audio URL. Takes over from the speech engine when given. */
  src?: string
  /** Seconds. Estimated from the transcript when omitted. */
  duration?: number
  /** Set false to keep a transcript-only note silent. */
  speak?: boolean
}

export type BentoAvailability = {
  label: string
  status?: "available" | "busy" | "away"
  /** Tooltip, e.g. "Booking from November". */
  note?: string
}

export type BentoMapLabel = { text: string; x: number; y: number }

export type BentoLocation = {
  city: string
  /** Small labels on the map, in 0–300 map units (150,150 is the pin). */
  labels?: BentoMapLabel[]
  /** IANA zone, for the local-time chip. */
  timeZone?: string
}

export interface BentoPortfolioTemplateProps {
  name?: string
  role?: string
  company?: string
  companyHref?: string
  /** The muted tail of the headline. "Apple" reads "Previously at Apple." */
  previously?: string
  bio?: React.ReactNode
  /** An image URL, your own node, or nothing for the drawn portrait. */
  avatar?: string | React.ReactNode
  /** Short handle shown in the nav, e.g. "johndoe". */
  handle?: string
  email?: string
  /** "Book a call" link in the contact card. */
  bookingHref?: string
  voiceNote?: BentoVoiceNote | null
  availability?: BentoAvailability | null
  experience?: BentoRole[]
  tracks?: BentoTrack[]
  books?: BentoBook[]
  location?: BentoLocation | null
  moments?: BentoMoment[]
  steps?: BentoStep[]
  projects?: BentoProject[]
  testimonials?: BentoTestimonial[]
  stats?: BentoStat[]
  tools?: string[]
  posts?: BentoPost[]
  socials?: BentoLink[]
  /** The play button, links on hover, focus rings, the contact button. */
  accent?: string
  defaultTheme?: "system" | "light" | "dark"
  onThemeChange?: (theme: "light" | "dark") => void
  /** Minimum height of the page. A definite length, so it survives any host layout. */
  height?: string
  className?: string
}

// #region rand
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
// #endregion rand

// #region wave
/** Bar heights (0.1–1) that read like speech: mostly quiet ticks, a few loud syllable clusters. */
function waveform(seed: string, count: number): number[] {
  const rnd = mulberry32(hashString(seed || "voice"))
  const bursts: { at: number; width: number; peak: number }[] = []
  const n = 3 + Math.floor(rnd() * 3)
  for (let i = 0; i < n; i++) bursts.push({ at: rnd(), width: 0.02 + rnd() * 0.05, peak: 0.55 + rnd() * 0.45 })
  const out: number[] = []
  for (let i = 0; i < count; i++) {
    const x = count > 1 ? i / (count - 1) : 0
    let v = 0.1 + rnd() * 0.14
    for (const b of bursts) {
      const d = (x - b.at) / b.width
      v += b.peak * Math.exp(-d * d) * (0.55 + rnd() * 0.45)
    }
    out.push(Math.round(Math.min(1, Math.max(0.1, v)) * 1000) / 1000)
  }
  return out
}
// #endregion wave

// #region text
/** 32 → "0:32", 125 → "2:05". */
function formatClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0")
}

/** 34 → "00:34". */
function formatTrack(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0")
}

/** Rough speaking time at ~2.6 words a second, never under 3s. */
function estimateSeconds(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(3, Math.round(words / 2.6))
}

/** Sentences with their absolute start offsets. Short engines cut long utterances, so speech goes one at a time. */
function splitSentences(text: string): { text: string; start: number }[] {
  const out: { text: string; start: number }[] = []
  const re = /[^.!?]+[.!?]*\s*/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const raw = m[0]
    const lead = raw.length - raw.trimStart().length
    const body = raw.trim()
    if (body) out.push({ text: body, start: m.index + lead })
  }
  return out
}

/** Moves an index back to the start of the word it lands in. */
function snapToWord(text: string, index: number): number {
  let i = Math.max(0, Math.min(text.length, Math.floor(index)))
  while (i > 0 && /\S/.test(text[i - 1])) i--
  return i
}

/** The sentence playing at a 0–1 progress. */
function captionAt(text: string, progress: number): string {
  const parts = splitSentences(text)
  if (!parts.length) return ""
  const at = Math.min(text.length - 1, Math.max(0, progress * text.length))
  let current = parts[0]
  for (const p of parts) if (p.start <= at) current = p
  return current.text
}

/** Words on a book cover: the first two that are not filler, upper-cased. */
function coverWords(title: string): string[] {
  const skip = new Set(["the", "a", "an", "of", "and", "in", "on", "to", "for"])
  const words = title.split(/\s+/).filter((w) => w && !skip.has(w.toLowerCase()))
  return (words.length ? words : [title]).slice(0, 2).map((w) => w.toUpperCase())
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase()
}
// #endregion text

// #region map
type MapData = { minor: string; major: string; highways: string[]; river: string; parks: string[] }

/** A plausible street map: a rotated, broken grid, a few arterials, curving highways, a river and parks. */
function buildMap(seed: string): MapData {
  const rnd = mulberry32(hashString(seed || "city"))
  const f = (n: number) => Math.round(n * 10) / 10
  const angle = ((rnd() * 18 - 9) * Math.PI) / 180
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const rot = (x: number, y: number): [number, number] => [150 + (x - 150) * cos - (y - 150) * sin, 150 + (x - 150) * sin + (y - 150) * cos]
  const lo = -140
  const hi = 440
  let minor = ""
  let major = ""
  for (const across of [false, true]) {
    let t = lo
    while (t < hi) {
      t += 10 + rnd() * 10
      const isMajor = rnd() < 0.13
      let s = lo
      while (s < hi) {
        const e = Math.min(hi, s + 40 + rnd() * 140)
        if (isMajor || rnd() > 0.16) {
          const [x1, y1] = across ? rot(t, s) : rot(s, t)
          const [x2, y2] = across ? rot(t, e) : rot(e, t)
          const seg = "M" + f(x1) + " " + f(y1) + "L" + f(x2) + " " + f(y2)
          if (isMajor) major += seg
          else minor += seg
        }
        s = e + (rnd() < 0.35 ? 6 + rnd() * 16 : 0)
      }
    }
  }
  const highways: string[] = []
  for (let i = 0; i < 2; i++) {
    const y0 = 40 + rnd() * 220
    const y1 = 40 + rnd() * 220
    highways.push(
      "M" + lo + " " + f(y0) +
      "C" + f(60 + rnd() * 60) + " " + f(rnd() * 300) + " " + f(180 + rnd() * 60) + " " + f(rnd() * 300) + " " + hi + " " + f(y1),
    )
  }
  const x0 = 30 + rnd() * 240
  const river =
    "M" + f(x0) + " " + lo +
    "C" + f(x0 + 90 - rnd() * 180) + " " + f(60 + rnd() * 40) + " " + f(x0 + 90 - rnd() * 180) + " " + f(200 + rnd() * 40) + " " + f(30 + rnd() * 240) + " " + hi
  const parks: string[] = []
  for (let i = 0; i < 4; i++) {
    const px = -40 + rnd() * 360
    const py = -40 + rnd() * 360
    const w = 18 + rnd() * 34
    const h = 14 + rnd() * 28
    const pts = [rot(px, py), rot(px + w, py), rot(px + w, py + h), rot(px, py + h)]
    parks.push("M" + pts.map((p) => f(p[0]) + " " + f(p[1])).join("L") + "Z")
  }
  return { minor, major, highways, river, parks }
}
// #endregion map

// #region content
const DEFAULT_BIO = "I am a seasoned product designer with 5 years of experience specializing in crafting creative tools solutions and empowering creatives."

const DEFAULT_VOICE: BentoVoiceNote = {
  transcript:
    "Hey, I'm John. Thanks for stopping by. I design creative tools, the kind people open every morning and forget they are using. Right now I'm at Northwind, working on the editor. If you're building something for makers, I would love to hear about it. Say hello, any time.",
}

const DEFAULT_EXPERIENCE: BentoRole[] = [
  { company: "Freelance", year: "2018", role: "Brand & web design" },
  { company: "Fieldwork Agency", year: "2019", role: "Junior designer" },
  { company: "Producer's Club & CRT", year: "2020", role: "Product designer" },
  { company: "Producer's Club & CRT", year: "2021", role: "Senior product designer" },
  { company: "Lumen Labs", year: "2022", role: "Design lead, creative tools", href: "#" },
  { company: "Northwind", year: "2023 – Now", role: "Product designer, editor" },
]

const DEFAULT_TRACKS: BentoTrack[] = [
  { title: "Paper Sun Theme", artist: "Mira, The Weaver", duration: 214, color: "#f2a9bf" },
  { title: "Night Bus Home", artist: "Low Static", duration: 187, color: "#2f3e74" },
  { title: "Glasshouse", artist: "Ana Ilse", duration: 241, color: "#efe6d2" },
]

const DEFAULT_BOOKS: BentoBook[] = [
  { title: "The Intelligent Investor", author: "Benjamin Graham", progress: 0.42, color: "#b5352b" },
  { title: "Thinking in Systems", author: "Donella H. Meadows", progress: 0.78, color: "#23525f" },
  { title: "The Design of Everyday Things", author: "Don Norman", progress: 1, color: "#e1b23a" },
]

const DEFAULT_LOCATION: BentoLocation = {
  city: "Los Angeles",
  timeZone: "America/Los_Angeles",
  labels: [
    { text: "CENTRAL LA", x: 8, y: 98 },
    { text: "ECHO PARK", x: 196, y: 52 },
    { text: "KOREATOWN", x: 34, y: 206 },
    { text: "Vernon", x: 168, y: 278 },
  ],
}

const DEFAULT_MOMENTS: BentoMoment[] = [
  { caption: "I love teaching football", emoji: "⚽", scene: "football" },
  { caption: "Sunrise hikes, most Sundays", emoji: "⛰️", scene: "mountains" },
  { caption: "Pour-over before pixels", emoji: "☕", scene: "coffee" },
]

const DEFAULT_STEPS: BentoStep[] = [
  { title: "Discovery Call", description: "We will make a 30 minutes free consultation so that I can get to learn about your specific needs and come up with a plan." },
  { title: "Proposal & Scope", description: "A short written plan: goals, deliverables, timeline and a fixed price. No surprises later, and you can say no to any part of it." },
  { title: "Design Sprints", description: "Weekly sprints with a live link you can poke at. We review together every Friday and steer as we learn." },
  { title: "Handoff & Support", description: "Clean files, a component library your engineers will actually use, and a month of support after launch." },
]

const DEFAULT_PROJECTS: BentoProject[] = [
  { title: "Canvas 2.0", client: "Northwind", year: "2025", kind: "web", hue: 24, tags: ["Editor", "Design system"], description: "A rebuilt visual editor for 2M makers: a calmer canvas, a command bar, and a properties panel that finally fits on a laptop." },
  { title: "Pocket Studio", client: "Lumen Labs", year: "2023", kind: "app", hue: 262, tags: ["iOS", "Creative tools"], description: "Photo and video editing that fits in one thumb. Shipped to the App Store front page in its first week." },
  { title: "Fieldwork Identity", client: "Fieldwork Agency", year: "2021", kind: "brand", hue: 150, tags: ["Brand", "Type"], description: "A flexible identity built around one shape and one typeface, used everywhere from signage to slide decks." },
  { title: "Producer's Club", client: "CRT", year: "2020", kind: "web", hue: 340, tags: ["Community", "Web"], description: "A membership site and booking flow for a studio collective of 400 producers and engineers." },
]

const DEFAULT_TESTIMONIALS: BentoTestimonial[] = [
  { quote: "John has a rare instinct for the one detail that makes a tool feel obvious. Our editor is calmer because of him.", name: "Priya Raman", role: "VP Product, Northwind" },
  { quote: "He prototypes faster than most people write specs, and he brings engineers along instead of handing things over.", name: "Marcus Lee", role: "Staff Engineer, Lumen Labs" },
  { quote: "Clear, kind and quick. We shipped a whole identity in five weeks without a single all-hands panic.", name: "Ines Duarte", role: "Founder, Fieldwork" },
]

const DEFAULT_STATS: BentoStat[] = [
  { value: 5, suffix: "+", label: "Years designing tools" },
  { value: 40, suffix: "+", label: "Products shipped" },
  { value: 2, suffix: "M", label: "People using my work" },
]

const DEFAULT_TOOLS = ["Figma", "Framer", "Webflow", "Rive", "Principle", "Origami", "Notion", "Linear", "React", "Tailwind", "Blender", "Spline"]

const DEFAULT_POSTS: BentoPost[] = [
  { title: "Designing for the blank canvas", date: "Sep 2026", minutes: 6, href: "#" },
  { title: "Your tool is a room, not a menu", date: "Jun 2026", minutes: 4, href: "#" },
  { title: "Notes from teaching kids football", date: "Feb 2026", minutes: 3, href: "#" },
]

const DEFAULT_SOCIALS: BentoLink[] = [
  { label: "LinkedIn", href: "https://linkedin.com", handle: "in/johndoe" },
  { label: "Dribbble", href: "https://dribbble.com", handle: "@johndoe" },
  { label: "X", href: "https://x.com", handle: "@johndoe" },
  { label: "GitHub", href: "https://github.com", handle: "johndoe" },
]
// #endregion content

const BPT_CSS = `
.bpt-root{--bpt-page:#efeeeb;--bpt-card:#f7f7f5;--bpt-raised:#ffffff;--bpt-ink:#1c1b1a;--bpt-soft:#5f5c58;--bpt-muted:#a29e98;--bpt-faint:#cdcac5;--bpt-line:rgba(28,27,26,.08);--bpt-line-2:rgba(28,27,26,.15);--bpt-chip:#ebeae6;--bpt-glass:rgba(239,238,235,.78);--bpt-glow:rgba(255,255,255,.75);--bpt-shadow:0 1px 0 rgba(255,255,255,.9) inset,0 1px 2px rgba(28,27,26,.04),0 12px 28px -18px rgba(28,27,26,.22);--bpt-inverse:#1c1b1a;--bpt-on-inverse:#f4f3f0;--bpt-map-bg:#ecebe8;--bpt-map-road:#fbfbfa;--bpt-map-line:#d4d2ce;--bpt-map-water:#dbe1e3;--bpt-map-park:#e2e6dc;--bpt-map-label:#9a968f;position:relative;isolation:isolate;width:100%;background:var(--bpt-page);color:var(--bpt-ink);font-family:"Inter Tight","Geist","Inter",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;-webkit-font-smoothing:antialiased;line-height:1.5;container-type:inline-size;transition:background-color .35s ease,color .35s ease}
.bpt-root[data-theme="dark"]{--bpt-page:#111110;--bpt-card:#191918;--bpt-raised:#232221;--bpt-ink:#f1efec;--bpt-soft:#b3afa9;--bpt-muted:#7a7671;--bpt-faint:#4a4844;--bpt-line:rgba(255,255,255,.07);--bpt-line-2:rgba(255,255,255,.14);--bpt-chip:#252423;--bpt-glass:rgba(17,17,16,.72);--bpt-glow:rgba(255,255,255,.05);--bpt-shadow:0 1px 0 rgba(255,255,255,.04) inset,0 1px 2px rgba(0,0,0,.4),0 14px 32px -16px rgba(0,0,0,.8);--bpt-inverse:#f1efec;--bpt-on-inverse:#161615;--bpt-map-bg:#1c1c1b;--bpt-map-road:#2c2b2a;--bpt-map-line:#343331;--bpt-map-water:#1b2326;--bpt-map-park:#1e231d;--bpt-map-label:#6f6b66}
.bpt-root ::selection{background:color-mix(in srgb,var(--bpt-accent) 28%,transparent)}
.bpt-root :focus-visible{outline:2px solid var(--bpt-accent);outline-offset:2px;border-radius:8px}
.bpt-root :where(button){font:inherit;color:inherit;background:none;border:0;padding:0;margin:0;cursor:pointer;text-align:inherit}
.bpt-root :where(a){color:inherit;text-decoration:none}
.bpt-root :where(h1,h2,h3,p,ul,ol,figure,blockquote){margin:0;padding:0}
.bpt-root :where(ul,ol){list-style:none}
.bpt-root :where(svg){display:block;max-width:none;flex:none}
.bpt-root :where(img){max-width:none;display:block}
.bpt-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.bpt-page{max-width:1160px;margin:0 auto;padding:0 32px 40px}

.bpt-nav{position:sticky;top:0;z-index:30;background:var(--bpt-glass);backdrop-filter:saturate(1.3) blur(14px);-webkit-backdrop-filter:saturate(1.3) blur(14px);border-bottom:1px solid var(--bpt-line);transition:background-color .35s}
.bpt-nav-in{max-width:1160px;margin:0 auto;padding:0 32px;height:56px;display:flex;align-items:center;gap:16px}
.bpt-handle{display:inline-flex;align-items:center;gap:8px;height:30px;padding:0 12px;border-radius:8px;background:var(--bpt-chip);font-size:13px;color:var(--bpt-soft);letter-spacing:.01em}
.bpt-handle b{font-weight:500;color:var(--bpt-ink)}
.bpt-links{margin-left:auto;display:flex;align-items:center;gap:2px}
.bpt-link{height:32px;padding:0 12px;border-radius:8px;font-size:14px;color:var(--bpt-soft);transition:color .2s,background-color .2s}
.bpt-link:hover{color:var(--bpt-ink);background:var(--bpt-chip)}
.bpt-theme{width:32px;height:32px;margin-left:6px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--bpt-soft);transition:background-color .2s,color .2s}
.bpt-theme:hover{background:var(--bpt-chip);color:var(--bpt-ink)}
.bpt-sun-rays{transform-origin:12px 12px;transition:transform .45s cubic-bezier(.3,1.4,.5,1),opacity .3s}
.bpt-sun-core{transition:r .45s cubic-bezier(.3,1.4,.5,1)}
.bpt-sun-moon{transition:cx .45s cubic-bezier(.3,1.4,.5,1),cy .45s cubic-bezier(.3,1.4,.5,1)}
.bpt-root[data-theme="dark"] .bpt-sun-rays{transform:scale(.4) rotate(45deg);opacity:0}

.bpt-hero{padding-top:76px}
.bpt-avatar{width:116px;height:116px;border-radius:12px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,.08),0 12px 24px -14px rgba(0,0,0,.35);transition:transform .6s cubic-bezier(.3,1.4,.5,1);animation:bpt-rise .8s cubic-bezier(.2,.8,.2,1) both}
.bpt-avatar:hover{transform:rotate(-4deg) scale(1.04)}
.bpt-avatar>*{width:116px;height:116px;object-fit:cover}
.bpt-h1{margin-top:34px;max-width:860px;font-size:clamp(28px,3.75cqi,42px);line-height:1.12;font-weight:500;letter-spacing:-.025em;text-wrap:balance;animation:bpt-rise .8s .06s cubic-bezier(.2,.8,.2,1) both}
.bpt-h1 .bpt-prev{color:var(--bpt-muted);transition:color .3s}
.bpt-h1 .bpt-prev:hover{color:var(--bpt-soft)}
.bpt-co{background-image:linear-gradient(currentColor,currentColor);background-size:0 1.5px;background-position:0 92%;background-repeat:no-repeat;transition:background-size .35s ease}
.bpt-co:hover{background-size:100% 1.5px}
.bpt-bio{margin-top:20px;max-width:740px;font-size:clamp(16px,1.75cqi,19.5px);line-height:1.5;color:var(--bpt-soft);letter-spacing:-.005em;animation:bpt-rise .8s .12s cubic-bezier(.2,.8,.2,1) both}
.bpt-actions{margin-top:22px;display:flex;flex-wrap:wrap;align-items:center;gap:20px;animation:bpt-rise .8s .18s cubic-bezier(.2,.8,.2,1) both}

.bpt-voice-wrap{flex:0 1 452px;min-width:260px}
.bpt-voice{position:relative;display:flex;align-items:center;gap:14px;height:52px;width:100%;padding:0 20px 0 14px;border-radius:999px;background:var(--bpt-raised);border:1px solid var(--bpt-line);box-shadow:var(--bpt-shadow)}
.bpt-play{width:30px;height:30px;border-radius:999px;display:flex;align-items:center;justify-content:center;color:var(--bpt-accent);transition:transform .2s,background-color .2s}
.bpt-play:hover{background:color-mix(in srgb,var(--bpt-accent) 12%,transparent)}
.bpt-play:active{transform:scale(.9)}
.bpt-wave{position:relative;flex:1;height:30px;cursor:pointer;touch-action:none}
.bpt-bars{position:absolute;inset:0;display:flex;align-items:center;justify-content:space-between}
.bpt-bars i{display:block;width:1.5px;border-radius:2px;background:var(--bpt-faint);transition:height .3s}
.bpt-bars-on i{background:var(--bpt-ink)}
.bpt-voice[data-playing="true"] .bpt-bars-on i{animation:bpt-throb 1.1s ease-in-out infinite alternate;animation-delay:var(--d)}
.bpt-hover-line{position:absolute;top:2px;bottom:2px;width:1.5px;border-radius:2px;background:var(--bpt-accent);opacity:0;transition:opacity .15s;pointer-events:none}
.bpt-wave:hover .bpt-hover-line{opacity:.65}
.bpt-time{font-size:13px;color:var(--bpt-muted);font-variant-numeric:tabular-nums;min-width:30px;text-align:right}
.bpt-caption{margin-top:10px;min-height:21px;font-size:14px;color:var(--bpt-muted);max-width:620px;transition:opacity .3s}
.bpt-caption span{display:inline-block;animation:bpt-rise .45s cubic-bezier(.2,.8,.2,1) both}
.bpt-avail{position:relative;display:inline-flex;align-items:center;gap:10px;height:52px;padding:0 20px 0 18px;border-radius:999px;border:1px solid var(--bpt-line-2);font-size:14.5px;color:var(--bpt-soft);transition:background-color .2s,color .2s,border-color .2s}
.bpt-avail:hover{background:var(--bpt-raised);color:var(--bpt-ink)}
.bpt-dot{position:relative;width:9px;height:9px;border-radius:999px;background:var(--bpt-status);box-shadow:0 0 0 3px color-mix(in srgb,var(--bpt-status) 22%,transparent)}
.bpt-dot::after{content:"";position:absolute;inset:0;border-radius:inherit;background:var(--bpt-status);animation:bpt-ping 2.2s cubic-bezier(0,0,.2,1) infinite}
.bpt-tip{position:absolute;left:50%;bottom:calc(100% + 10px);transform:translate(-50%,4px);white-space:nowrap;padding:6px 10px;border-radius:8px;background:var(--bpt-inverse);color:var(--bpt-on-inverse);font-size:12.5px;opacity:0;pointer-events:none;transition:opacity .2s,transform .2s}
.bpt-avail:hover .bpt-tip,.bpt-avail:focus-visible .bpt-tip{opacity:1;transform:translate(-50%,0)}

.bpt-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:16px;margin-top:64px}
.bpt-card{position:relative;min-height:236px;background:var(--bpt-card);border:1px solid var(--bpt-line);border-radius:14px;box-shadow:var(--bpt-shadow);overflow:hidden;animation:bpt-rise .8s cubic-bezier(.2,.8,.2,1) both;animation-delay:var(--d,0ms);transition:background-color .35s,border-color .35s}
.bpt-card::before{content:"";position:absolute;inset:0;z-index:0;pointer-events:none;border-radius:inherit;background:radial-gradient(260px circle at var(--mx,50%) var(--my,50%),var(--bpt-glow),transparent 70%);opacity:0;transition:opacity .35s}
.bpt-card:hover::before{opacity:1}
.bpt-c3{grid-column:span 3}.bpt-c4{grid-column:span 4}.bpt-c5{grid-column:span 5}.bpt-c6{grid-column:span 6}.bpt-c7{grid-column:span 7}.bpt-c8{grid-column:span 8}.bpt-c12{grid-column:1/-1}
.bpt-chip{position:absolute;top:12px;left:12px;z-index:3;display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px 0 8px;border-radius:999px;background:var(--bpt-chip);font-size:11.5px;font-weight:500;color:var(--bpt-soft);white-space:nowrap}
.bpt-chip-static{position:static}
.bpt-eq{display:inline-flex;align-items:flex-end;gap:1.5px;height:9px;margin-left:2px}
.bpt-eq i{width:2px;height:9px;border-radius:1px;background:var(--bpt-accent);transform-origin:bottom;animation:bpt-eq .9s ease-in-out infinite alternate}
.bpt-eq i:nth-child(2){animation-delay:-.3s}.bpt-eq i:nth-child(3){animation-delay:-.6s}
.bpt-ibtn{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--bpt-soft);transition:background-color .2s,color .2s,transform .15s}
.bpt-ibtn:hover{background:var(--bpt-chip);color:var(--bpt-ink)}
.bpt-ibtn:active{transform:scale(.9)}

.bpt-xp-list{position:absolute;inset:0;z-index:1;overflow-y:auto;padding:46px 30px 18px 14px;scrollbar-width:none;-webkit-mask-image:linear-gradient(to bottom,transparent 0,#000 54px,#000 calc(100% - 22px),transparent);mask-image:linear-gradient(to bottom,transparent 0,#000 54px,#000 calc(100% - 22px),transparent);overscroll-behavior:contain}
.bpt-xp-list::-webkit-scrollbar{display:none}
.bpt-xp{position:relative;padding:4px 0 12px 24px}
.bpt-xp::before{content:"";position:absolute;left:3px;top:0;bottom:0;width:1px;background:var(--bpt-line-2)}
.bpt-xp:first-child::before{top:12px}
.bpt-xp:last-child::before{bottom:auto;height:12px}
.bpt-xp-dot{position:absolute;left:0;top:10px;width:7px;height:7px;border-radius:999px;background:var(--bpt-ink);transition:transform .25s}
.bpt-xp[data-now="true"] .bpt-xp-dot{background:var(--bpt-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--bpt-accent) 25%,transparent)}
.bpt-xp-name{display:block;font-size:13.5px;line-height:1.35;color:var(--bpt-ink);width:fit-content}
.bpt-xp-name[href]{text-decoration:underline;text-underline-offset:3px;text-decoration-color:var(--bpt-line-2);transition:text-decoration-color .2s}
.bpt-xp-name[href]:hover{text-decoration-color:currentColor}
.bpt-xp-year{font-size:12.5px;color:var(--bpt-muted);font-variant-numeric:tabular-nums}
.bpt-xp-role{display:grid;grid-template-rows:0fr;transition:grid-template-rows .3s ease,opacity .3s;opacity:0;font-size:12px;color:var(--bpt-soft)}
.bpt-xp-role>span{overflow:hidden}
.bpt-xp:hover .bpt-xp-role{grid-template-rows:1fr;opacity:1}
.bpt-xp:hover .bpt-xp-dot{transform:scale(1.35)}
.bpt-thumb-track{position:absolute;z-index:2;right:9px;top:48px;bottom:14px;width:4px}
.bpt-thumb{position:absolute;left:0;width:4px;border-radius:4px;background:var(--bpt-line-2);transition:background-color .2s;cursor:grab;touch-action:none}
.bpt-thumb:hover,.bpt-thumb:active{background:var(--bpt-muted)}

.bpt-music{position:absolute;inset:0;z-index:1;display:flex;align-items:stretch;gap:14px;padding:46px 18px 16px 14px}
.bpt-music-art{position:relative;flex:none;width:clamp(120px,38%,172px);align-self:center;aspect-ratio:1}
.bpt-art{position:absolute;inset:0;z-index:2;border-radius:5px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,.1),0 10px 18px -10px rgba(0,0,0,.4);animation:bpt-pop .5s cubic-bezier(.2,.8,.2,1) both}
.bpt-art>*{width:100%;height:100%;object-fit:cover}
.bpt-vinyl{position:absolute;inset:4%;z-index:1;border-radius:999px;background:repeating-radial-gradient(circle at 50% 50%,#1b1b1b 0 1.5px,#262626 1.5px 3px);box-shadow:0 6px 14px -6px rgba(0,0,0,.6);transition:transform .7s cubic-bezier(.3,1.2,.5,1)}
.bpt-vinyl::after{content:"";position:absolute;inset:36%;border-radius:999px;background:var(--bpt-label,#f2a9bf);box-shadow:0 0 0 2px rgba(0,0,0,.25) inset}
.bpt-vinyl-spin{position:absolute;inset:0;border-radius:inherit;background:conic-gradient(from 0deg,rgba(255,255,255,.12),transparent 20%,rgba(255,255,255,.08) 50%,transparent 70%,rgba(255,255,255,.12));animation:bpt-spin 2.4s linear infinite;animation-play-state:paused}
.bpt-music[data-playing="true"] .bpt-vinyl{transform:translateX(26%)}
.bpt-music[data-playing="true"] .bpt-vinyl-spin{animation-play-state:running}
.bpt-music-info{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;padding-left:clamp(22px,8cqi,48px)}
.bpt-track-title{font-size:16.5px;font-weight:600;letter-spacing:.01em;text-transform:uppercase;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bpt-track-artist{margin-top:3px;font-size:13px;color:var(--bpt-soft);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bpt-seek-row{margin-top:auto;display:flex;align-items:center;gap:10px}
.bpt-seek{position:relative;flex:1;height:16px;cursor:pointer;touch-action:none}
.bpt-seek-bar{position:absolute;left:0;right:0;top:6.5px;height:3px;border-radius:3px;background:var(--bpt-chip);overflow:hidden}
.bpt-seek-fill{position:absolute;left:0;top:0;bottom:0;border-radius:3px;background:var(--bpt-ink)}
.bpt-seek-knob{position:absolute;top:3.5px;width:9px;height:9px;margin-left:-4.5px;border-radius:999px;background:var(--bpt-ink);transform:scale(0);transition:transform .2s}
.bpt-seek:hover .bpt-seek-knob,.bpt-seek:focus-visible .bpt-seek-knob{transform:scale(1)}
.bpt-seek-time{font-size:11.5px;color:var(--bpt-soft);font-variant-numeric:tabular-nums}
.bpt-controls{margin-top:12px;display:flex;align-items:center;gap:6px}
.bpt-controls .bpt-vol{margin-left:auto}
.bpt-track-swap{animation:bpt-rise .45s cubic-bezier(.2,.8,.2,1) both}

.bpt-read{position:absolute;inset:0;z-index:1;padding:52px 18px 16px 18px;display:flex;flex-direction:column}
.bpt-book-title{font-size:clamp(19px,2cqi,22px);line-height:1.22;font-weight:500;letter-spacing:-.015em;max-width:72%}
.bpt-book-author{margin-top:4px;font-size:14px;color:var(--bpt-soft);max-width:60%}
.bpt-book-progress{margin-top:auto;max-width:52%;font-size:11.5px;color:var(--bpt-muted);font-variant-numeric:tabular-nums}
.bpt-book-bar{margin-top:5px;height:3px;border-radius:3px;background:var(--bpt-chip);overflow:hidden}
.bpt-book-bar i{display:block;height:3px;border-radius:3px;background:var(--bpt-ink);transition:width .6s cubic-bezier(.2,.8,.2,1)}
.bpt-book-nav{position:absolute;z-index:4;top:10px;right:10px;display:flex;align-items:center;gap:2px;font-size:11.5px;color:var(--bpt-muted);font-variant-numeric:tabular-nums}
.bpt-book{position:absolute;z-index:2;right:-22px;bottom:-34px;width:118px;height:168px;border-radius:3px 6px 6px 3px;transform:rotate(-9deg);transform-origin:70% 100%;box-shadow:-10px 14px 22px -10px rgba(0,0,0,.45),inset 6px 0 0 rgba(0,0,0,.12),inset 7px 0 0 rgba(255,255,255,.12);transition:transform .6s cubic-bezier(.3,1.3,.5,1);overflow:hidden;animation:bpt-book-in .7s cubic-bezier(.3,1.2,.5,1) both}
.bpt-card:hover .bpt-book{transform:rotate(-3deg) translate(-8px,-14px)}
.bpt-book-frame{position:absolute;inset:9px 8px 9px 14px;border:1.5px solid rgba(255,236,200,.55);border-radius:2px}
.bpt-book-word{position:absolute;left:18px;font-family:"Oswald","Bebas Neue","Arial Narrow",Impact,ui-sans-serif,sans-serif;font-weight:700;font-size:34px;line-height:1;letter-spacing:.02em;color:rgba(255,240,214,.92);white-space:nowrap}
.bpt-book-sub{position:absolute;left:18px;right:10px;bottom:22px;font-size:7px;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,240,214,.75)}

.bpt-map{position:absolute;inset:0;z-index:1;cursor:grab;touch-action:none}
.bpt-map:active{cursor:grabbing}
.bpt-map-city{position:absolute;z-index:2;left:0;right:0;top:50%;transform:translateY(-50%);text-align:center;font-size:clamp(20px,2.2cqi,25px);font-weight:500;letter-spacing:-.01em;color:var(--bpt-map-label);pointer-events:none;text-shadow:0 0 6px var(--bpt-map-bg),0 0 12px var(--bpt-map-bg),0 0 18px var(--bpt-map-bg)}
.bpt-map-pin{position:absolute;z-index:2;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:999px;background:var(--bpt-accent);box-shadow:0 0 0 3px #fff,0 2px 8px rgba(0,0,0,.25);pointer-events:none}
.bpt-map-pin::after{content:"";position:absolute;inset:-3px;border-radius:999px;border:2px solid var(--bpt-accent);animation:bpt-ping 2.4s cubic-bezier(0,0,.2,1) infinite}
.bpt-map-time{position:absolute;z-index:3;left:12px;bottom:12px;display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px;border-radius:999px;background:var(--bpt-raised);font-size:11.5px;color:var(--bpt-soft);box-shadow:var(--bpt-shadow);font-variant-numeric:tabular-nums;opacity:0;transform:translateY(4px);transition:opacity .25s,transform .25s}
.bpt-card:hover .bpt-map-time,.bpt-card:focus-within .bpt-map-time{opacity:1;transform:none}
.bpt-recenter{position:absolute;z-index:3;right:10px;bottom:10px;background:var(--bpt-raised);box-shadow:var(--bpt-shadow);animation:bpt-pop .3s both}

.bpt-photo{position:absolute;inset:8px;z-index:1;border-radius:8px;overflow:hidden;background:#cfd8c4}
.bpt-slide{position:absolute;inset:0;opacity:0;transition:opacity .8s ease}
.bpt-slide[data-on="true"]{opacity:1}
.bpt-slide>*{width:100%;height:100%;object-fit:cover}
.bpt-slide[data-on="true"]>*{animation:bpt-kenburns 9s ease-out both}
.bpt-photo-cap{position:absolute;z-index:3;left:10px;bottom:10px;max-width:calc(100% - 20px);display:inline-flex;align-items:center;gap:7px;height:30px;padding:0 13px 0 10px;border-radius:999px;background:#fff;color:#1c1b1a;font-size:12.5px;box-shadow:0 4px 14px -6px rgba(0,0,0,.35);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bpt-photo-cap span{animation:bpt-rise .5s cubic-bezier(.2,.8,.2,1) both}
.bpt-dots{position:absolute;z-index:3;top:10px;right:10px;display:flex;gap:4px;padding:5px 6px;border-radius:999px;background:rgba(0,0,0,.22);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
.bpt-dots button{width:6px;height:6px;border-radius:999px;background:rgba(255,255,255,.5);transition:width .3s,background-color .3s}
.bpt-dots button[aria-current="true"]{width:14px;background:#fff}
.bpt-photo-nav{position:absolute;z-index:3;top:50%;width:30px;height:30px;margin-top:-15px;border-radius:999px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.88);color:#1c1b1a;opacity:0;transition:opacity .2s,transform .2s}
.bpt-photo-prev{left:10px;transform:translateX(-4px)}.bpt-photo-next{right:10px;transform:translateX(4px)}
.bpt-card:hover .bpt-photo-nav,.bpt-photo-nav:focus-visible{opacity:1;transform:none}

.bpt-steps{position:absolute;inset:0;z-index:1;display:flex;flex-direction:column;padding:14px}
.bpt-steps-num{position:absolute;right:18px;top:-6px;font-size:132px;line-height:1;font-weight:600;letter-spacing:-.05em;color:transparent;-webkit-text-stroke:1px var(--bpt-line-2);pointer-events:none;font-variant-numeric:tabular-nums}
.bpt-steps-body{margin-top:auto;padding:0 2px}
.bpt-steps-title{font-size:clamp(22px,2.6cqi,29px);font-weight:500;letter-spacing:-.02em;line-height:1.15;animation:bpt-rise .5s cubic-bezier(.2,.8,.2,1) both}
.bpt-steps-desc{margin-top:8px;max-width:560px;font-size:13.5px;line-height:1.5;color:var(--bpt-soft);min-height:40px;animation:bpt-rise .5s .05s cubic-bezier(.2,.8,.2,1) both}
.bpt-stepper{position:relative;margin-top:16px;display:flex;height:34px;border-radius:999px;background:var(--bpt-chip)}
.bpt-stepper-pill{position:absolute;top:0;bottom:0;left:0;border-radius:999px;background:var(--bpt-inverse);overflow:hidden;transition:transform .5s cubic-bezier(.3,1.25,.5,1)}
.bpt-stepper-pill i{position:absolute;left:0;bottom:0;height:2px;width:100%;background:color-mix(in srgb,var(--bpt-on-inverse) 45%,transparent);transform-origin:left;transform:scaleX(0);animation:bpt-fill var(--dur) linear both}
.bpt-stepper[data-paused="true"] .bpt-stepper-pill i{animation-play-state:paused}
.bpt-step{position:relative;z-index:1;flex:1;font-size:12px;color:var(--bpt-soft);text-align:center;border-radius:999px;transition:color .3s}
.bpt-step:hover{color:var(--bpt-ink)}
.bpt-step[aria-selected="true"]{color:var(--bpt-on-inverse)}

.bpt-head{grid-column:1/-1;display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-top:44px;padding:0 2px}
.bpt-h2{font-size:clamp(22px,2.4cqi,28px);font-weight:500;letter-spacing:-.02em;line-height:1.1}
.bpt-h2 sup{margin-left:6px;font-size:13px;font-weight:400;color:var(--bpt-muted);vertical-align:top;position:relative;top:4px}
.bpt-head p{font-size:13.5px;color:var(--bpt-muted)}

.bpt-proj{display:flex;flex-direction:column;min-height:0;padding:8px;cursor:pointer;text-align:left;transition:transform .35s cubic-bezier(.3,1.2,.5,1),border-color .35s,background-color .35s}
.bpt-proj:hover{transform:translateY(-3px)}
.bpt-proj-cover{position:relative;z-index:1;aspect-ratio:16/10;border-radius:9px;overflow:hidden}
.bpt-proj-cover>*{width:100%;height:100%;object-fit:cover;transition:transform .7s cubic-bezier(.2,.8,.2,1)}
.bpt-proj:hover .bpt-proj-cover>*{transform:scale(1.035)}
.bpt-proj-foot{position:relative;z-index:1;display:flex;align-items:flex-start;gap:12px;padding:14px 8px 8px}
.bpt-proj-title{font-size:16.5px;font-weight:500;letter-spacing:-.01em}
.bpt-proj-meta{font-size:13px;color:var(--bpt-muted)}
.bpt-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.bpt-tag{height:22px;padding:0 9px;border-radius:999px;background:var(--bpt-chip);font-size:11.5px;color:var(--bpt-soft);display:inline-flex;align-items:center}
.bpt-arrow{margin-left:auto;flex:none;width:32px;height:32px;border-radius:999px;border:1px solid var(--bpt-line-2);display:flex;align-items:center;justify-content:center;color:var(--bpt-soft);transition:transform .35s cubic-bezier(.3,1.3,.5,1),background-color .25s,color .25s,border-color .25s}
.bpt-proj:hover .bpt-arrow{transform:rotate(45deg);background:var(--bpt-inverse);border-color:var(--bpt-inverse);color:var(--bpt-on-inverse)}

.bpt-quote{position:absolute;inset:0;z-index:1;display:flex;flex-direction:column;padding:56px 22px 18px}
.bpt-quote blockquote{font-size:clamp(17px,1.9cqi,21px);line-height:1.38;letter-spacing:-.01em;text-wrap:pretty;animation:bpt-rise .55s cubic-bezier(.2,.8,.2,1) both}
.bpt-quote-mark{position:absolute;right:18px;top:8px;font-size:96px;line-height:1;font-family:Georgia,"Times New Roman",serif;color:var(--bpt-chip);pointer-events:none}
.bpt-quote-foot{margin-top:auto;padding-top:14px;display:flex;align-items:center;gap:10px}
.bpt-mono{width:34px;height:34px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:#fff;flex:none}
.bpt-quote-name{font-size:13.5px;font-weight:500;line-height:1.25}
.bpt-quote-role{font-size:12.5px;color:var(--bpt-muted)}
.bpt-quote-nav{margin-left:auto;display:flex;gap:2px}

.bpt-stats{position:absolute;inset:0;z-index:1;display:flex;flex-direction:column;justify-content:flex-end;gap:12px;padding:48px 18px 18px}
.bpt-stat{display:flex;align-items:baseline;gap:10px;border-top:1px solid var(--bpt-line);padding-top:10px}
.bpt-stat:first-child{border-top:0;padding-top:0}
.bpt-stat b{font-size:30px;font-weight:500;letter-spacing:-.03em;line-height:1;font-variant-numeric:tabular-nums;min-width:62px}
.bpt-stat span{font-size:12.5px;color:var(--bpt-soft);line-height:1.3}

.bpt-tools{position:absolute;inset:0;z-index:1;display:flex;flex-direction:column;justify-content:center;gap:10px;padding-top:30px;-webkit-mask-image:linear-gradient(to right,transparent,#000 18%,#000 82%,transparent);mask-image:linear-gradient(to right,transparent,#000 18%,#000 82%,transparent)}
.bpt-marquee{display:flex;width:max-content;gap:8px;animation:bpt-marquee var(--dur,30s) linear infinite}
.bpt-marquee[data-rev="true"]{animation-direction:reverse}
.bpt-card:hover .bpt-marquee{animation-play-state:paused}
.bpt-tool{height:34px;padding:0 14px;border-radius:999px;background:var(--bpt-raised);border:1px solid var(--bpt-line);display:inline-flex;align-items:center;gap:8px;font-size:13px;white-space:nowrap;box-shadow:0 1px 2px rgba(0,0,0,.03)}
.bpt-tool i{width:8px;height:8px;border-radius:3px;background:var(--c)}

.bpt-list{position:absolute;inset:0;z-index:1;display:flex;flex-direction:column;justify-content:flex-end;padding:48px 10px 10px}
.bpt-row{display:flex;align-items:center;gap:12px;min-height:46px;padding:0 10px;border-radius:9px;transition:background-color .2s}
.bpt-row:hover{background:var(--bpt-chip)}
.bpt-row-title{flex:1;min-width:0;font-size:14.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bpt-row-meta{font-size:12.5px;color:var(--bpt-muted);font-variant-numeric:tabular-nums;white-space:nowrap}
.bpt-row .bpt-row-go{color:var(--bpt-muted);opacity:0;transform:translate(-4px,4px);transition:opacity .2s,transform .25s}
.bpt-row:hover .bpt-row-go{opacity:1;transform:none;color:var(--bpt-accent)}

.bpt-socials{position:absolute;inset:0;z-index:1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:48px 10px 10px;align-content:end}
.bpt-social{display:flex;align-items:center;gap:10px;height:58px;padding:0 12px;border-radius:10px;background:var(--bpt-raised);border:1px solid var(--bpt-line);transition:transform .3s cubic-bezier(.3,1.3,.5,1),border-color .2s}
.bpt-social:hover{transform:translateY(-2px);border-color:var(--bpt-line-2)}
.bpt-social-ic{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:var(--bpt-chip);color:var(--bpt-ink);flex:none}
.bpt-social-txt{min-width:0;flex:1;line-height:1.25}
.bpt-social-txt b{display:block;font-size:13.5px;font-weight:500}
.bpt-social-txt span{display:block;font-size:12px;color:var(--bpt-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bpt-social .bpt-row-go{color:var(--bpt-muted);transition:transform .3s,color .2s}
.bpt-social:hover .bpt-row-go{transform:translate(2px,-2px);color:var(--bpt-accent)}

.bpt-cta{background:var(--bpt-inverse);color:var(--bpt-on-inverse);border-color:transparent;min-height:300px}
.bpt-cta-in{position:relative;z-index:1;display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:28px;padding:40px clamp(22px,4cqi,44px);min-height:300px}
.bpt-cta-rings{position:absolute;right:-90px;top:-120px;z-index:0;opacity:.16;animation:bpt-spin 60s linear infinite;pointer-events:none}
.bpt-cta h2{font-size:clamp(28px,4.2cqi,48px);font-weight:500;letter-spacing:-.03em;line-height:1.05;max-width:620px}
.bpt-cta h2 span{opacity:.5}
.bpt-cta p{margin-top:14px;max-width:460px;font-size:15px;opacity:.7}
.bpt-cta-btns{display:flex;flex-wrap:wrap;gap:10px;margin-top:26px}
.bpt-btn{display:inline-flex;align-items:center;gap:8px;height:44px;padding:0 18px;border-radius:999px;font-size:14.5px;font-weight:500;transition:transform .2s,background-color .2s,opacity .2s}
.bpt-btn:active{transform:scale(.97)}
.bpt-btn-accent{background:var(--bpt-accent);color:#fff}
.bpt-btn-accent:hover{opacity:.9}
.bpt-btn-ghost{border:1px solid color-mix(in srgb,var(--bpt-on-inverse) 28%,transparent)}
.bpt-btn-ghost:hover{background:color-mix(in srgb,var(--bpt-on-inverse) 10%,transparent)}
.bpt-cta-side{text-align:right;font-variant-numeric:tabular-nums}
.bpt-cta-clock{font-size:clamp(34px,5cqi,58px);font-weight:500;letter-spacing:-.04em;line-height:1}
.bpt-cta-side small{display:block;margin-top:8px;font-size:13px;opacity:.6}

.bpt-foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin-top:28px;padding:20px 2px 0;border-top:1px solid var(--bpt-line);font-size:13px;color:var(--bpt-muted)}
.bpt-foot button:hover{color:var(--bpt-ink)}

.bpt-overlay{position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(20,19,18,.38);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);animation:bpt-fade .25s both}
.bpt-sheet{position:relative;width:min(720px,100%);max-height:calc(100vh - 40px);overflow:auto;border-radius:18px;background:var(--bpt-card);color:var(--bpt-ink);border:1px solid var(--bpt-line);box-shadow:0 30px 80px -20px rgba(0,0,0,.45);animation:bpt-sheet .45s cubic-bezier(.2,.9,.25,1) both}
.bpt-sheet-cover{margin:10px;border-radius:12px;overflow:hidden;aspect-ratio:16/9}
.bpt-sheet-cover>*{width:100%;height:100%;object-fit:cover}
.bpt-sheet-body{padding:10px 26px 26px}
.bpt-sheet-body h3{font-size:26px;font-weight:500;letter-spacing:-.02em}
.bpt-sheet-body p{margin-top:10px;font-size:15px;color:var(--bpt-soft);line-height:1.6}
.bpt-sheet-close{position:absolute;top:18px;right:18px;z-index:2;background:rgba(255,255,255,.9);color:#1c1b1a;border-radius:999px;width:34px;height:34px}
.bpt-sheet-close:hover{background:#fff;color:#1c1b1a}
.bpt-sheet-visit{margin-top:20px;background:var(--bpt-inverse);color:var(--bpt-on-inverse)}

@container (max-width:980px){
.bpt-grid{grid-template-columns:repeat(6,minmax(0,1fr))}
.bpt-c3{grid-column:span 3}
.bpt-c4,.bpt-c5,.bpt-c6,.bpt-c7,.bpt-c8{grid-column:1/-1}
.bpt-hero{padding-top:56px}
}
@container (max-width:620px){
.bpt-page,.bpt-nav-in{padding-left:16px;padding-right:16px}
.bpt-grid{grid-template-columns:minmax(0,1fr);gap:12px;margin-top:48px}
.bpt-grid>.bpt-card{grid-column:1/-1}
.bpt-links .bpt-link{display:none}
.bpt-avatar,.bpt-avatar>*{width:92px;height:92px}
.bpt-hero{padding-top:40px}
.bpt-steps-num{font-size:96px}
.bpt-cta-side{text-align:left}
.bpt-head p{display:none}
}

@keyframes bpt-rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
@keyframes bpt-pop{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:none}}
@keyframes bpt-fade{from{opacity:0}to{opacity:1}}
@keyframes bpt-sheet{from{opacity:0;transform:translateY(24px) scale(.98)}to{opacity:1;transform:none}}
@keyframes bpt-ping{0%{transform:scale(1);opacity:.6}80%,100%{transform:scale(2.6);opacity:0}}
@keyframes bpt-spin{to{transform:rotate(360deg)}}
@keyframes bpt-eq{from{transform:scaleY(.25)}to{transform:scaleY(1)}}
@keyframes bpt-throb{from{transform:scaleY(1)}to{transform:scaleY(.72)}}
@keyframes bpt-fill{to{transform:scaleX(1)}}
@keyframes bpt-marquee{to{transform:translateX(-50%)}}
@keyframes bpt-kenburns{from{transform:scale(1.08)}to{transform:scale(1)}}
@keyframes bpt-book-in{from{opacity:0;transform:rotate(-20deg) translate(30px,40px)}to{opacity:1;transform:rotate(-9deg)}}

@media (prefers-reduced-motion:reduce){
.bpt-root *,.bpt-root *::before,.bpt-root *::after{animation:none !important;transition-duration:.01ms !important}
.bpt-tools{flex-direction:row;flex-wrap:wrap;align-content:center;padding:44px 14px 14px;-webkit-mask-image:none;mask-image:none}
.bpt-marquee{flex-wrap:wrap;width:auto}
.bpt-marquee [aria-hidden="true"]{display:none}
}
`

type Theme = "light" | "dark"

/* ---------------------------------------------------------------- icons */

type IconName =
  | "work" | "listen" | "book" | "pin" | "photo" | "how" | "quote" | "stats" | "tools" | "pen" | "globe"
  | "play" | "pause" | "prev" | "next" | "vol" | "mute" | "arrow" | "left" | "right" | "close" | "copy" | "check" | "calendar" | "up" | "target"
  | "linkedin" | "github" | "x" | "dribbble" | "instagram" | "mail"

function Icon({ name, size = 14 }: { name: IconName; size?: number }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
  let body: React.ReactNode
  switch (name) {
    case "work": body = <><rect x="3.5" y="7" width="17" height="12.5" rx="2.5" {...p} /><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3.5 12.5h17" {...p} /></>; break
    case "listen": body = <path d="M4 15v-3a8 8 0 0 1 16 0v3M4 15a2 2 0 0 1 2-2h1v6H6a2 2 0 0 1-2-2v-2Zm16 0a2 2 0 0 0-2-2h-1v6h1a2 2 0 0 0 2-2v-2Z" {...p} />; break
    case "book": body = <path d="M5 4.5h10.5A2.5 2.5 0 0 1 18 7v12.5H7.5A2.5 2.5 0 0 1 5 17V4.5Zm0 12.5a2.5 2.5 0 0 1 2.5-2.5H18" {...p} />; break
    case "pin": body = <><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" {...p} /><circle cx="12" cy="10" r="2.3" {...p} /></>; break
    case "photo": body = <><rect x="3.5" y="5" width="17" height="14" rx="2.5" {...p} /><path d="m4 16 4.5-4.5 4 4 2.5-2.5 5 5" {...p} /><circle cx="15.5" cy="9.5" r="1.4" {...p} /></>; break
    case "how": body = <path d="M5 6.5h14M5 12h9M5 17.5h5M17 15l2 2 3.5-3.5" {...p} />; break
    case "quote": body = <path d="M6 17.5c2.2-.8 3.5-2.6 3.5-5.5V7H4.5v5h5M15.5 17.5c2.2-.8 3.5-2.6 3.5-5.5V7h-5v5h5" {...p} />; break
    case "stats": body = <path d="M5 19V11M10 19V5M15 19v-6M20 19V8" {...p} />; break
    case "tools": body = <path d="M14.5 6.5a3.5 3.5 0 0 0 4.4 4.4L20 12l-8 8-3.5-3.5 8-8-1.1-1.1a3.5 3.5 0 0 0-.9-.9ZM4 20l4.5-4.5" {...p} />; break
    case "pen": body = <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4ZM13.5 6.5l4 4" {...p} />; break
    case "globe": body = <><circle cx="12" cy="12" r="8.5" {...p} /><path d="M3.5 12h17M12 3.5c2.5 2.6 3.5 5.4 3.5 8.5s-1 5.9-3.5 8.5c-2.5-2.6-3.5-5.4-3.5-8.5s1-5.9 3.5-8.5Z" {...p} /></>; break
    case "play": body = <path d="M7.5 4.8v14.4a.8.8 0 0 0 1.2.7l11.2-7.2a.8.8 0 0 0 0-1.4L8.7 4.1a.8.8 0 0 0-1.2.7Z" fill="currentColor" />; break
    case "pause": body = <><rect x="6" y="4.5" width="4" height="15" rx="1.2" fill="currentColor" /><rect x="14" y="4.5" width="4" height="15" rx="1.2" fill="currentColor" /></>; break
    case "prev": body = <path d="M19 6v12l-8.5-6L19 6Zm-9 0v12L1.5 12 10 6Z" fill="currentColor" transform="translate(1.5 0)" />; break
    case "next": body = <path d="M5 6v12l8.5-6L5 6Zm9 0v12l8.5-6L14 6Z" fill="currentColor" transform="translate(-1.5 0)" />; break
    case "vol": body = <><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4v-5Z" fill="currentColor" /><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11" {...p} /></>; break
    case "mute": body = <><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4v-5Z" fill="currentColor" /><path d="m16 9.5 5 5m0-5-5 5" {...p} /></>; break
    case "arrow": body = <path d="M7 17 17 7M8.5 7H17v8.5" {...p} />; break
    case "up": body = <path d="M12 19V5M6 11l6-6 6 6" {...p} />; break
    case "left": body = <path d="m14.5 6-6 6 6 6" {...p} />; break
    case "right": body = <path d="m9.5 6 6 6-6 6" {...p} />; break
    case "close": body = <path d="M6.5 6.5l11 11m0-11-11 11" {...p} />; break
    case "copy": body = <><rect x="8.5" y="8.5" width="11" height="11" rx="2.5" {...p} /><path d="M15.5 8.5V6A1.5 1.5 0 0 0 14 4.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" {...p} /></>; break
    case "check": body = <path d="m5 12.5 4.5 4.5L19 7.5" {...p} />; break
    case "calendar": body = <><rect x="4" y="5.5" width="16" height="14.5" rx="2.5" {...p} /><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" {...p} /></>; break
    case "target": body = <><circle cx="12" cy="12" r="7.5" {...p} /><circle cx="12" cy="12" r="2.5" fill="currentColor" /></>; break
    case "linkedin": body = <><rect x="3.5" y="3.5" width="17" height="17" rx="3.5" {...p} /><path d="M8 10.5V16M8 7.8v.01M11.5 16v-5.5M11.5 13c0-1.6 1-2.6 2.4-2.6 1.4 0 2.1.9 2.1 2.6V16" {...p} /></>; break
    case "github": body = <path d="M9 19c-4 1.3-4-2-5.5-2.5M14.5 21v-3.2c0-.9.1-1.3-.4-1.8 2.4-.3 4.9-1.2 4.9-5.3 0-1.1-.4-2.1-1.1-2.9.1-.3.5-1.5-.1-3 0 0-.9-.3-3 1.1a10.2 10.2 0 0 0-5.4 0C7.3 4.5 6.4 4.8 6.4 4.8c-.6 1.5-.2 2.7-.1 3-.7.8-1.1 1.8-1.1 2.9 0 4.1 2.5 5 4.9 5.3-.5.5-.5 1-.4 1.8V21" {...p} />; break
    case "x": body = <path d="M4.5 4.5 19.5 19.5M19.5 4.5l-6.2 6.9M10.7 13.2l-6.2 6.3M4.5 4.5h4.2l10.8 15h-4.2Z" {...p} />; break
    case "dribbble": body = <><circle cx="12" cy="12" r="8.5" {...p} /><path d="M6.5 5.5c4.6 4.7 7 9.2 8.3 14.3M3.6 10.5c5.3.3 10.6-1.2 14.4-4.4M8.7 19.8c1.7-4.3 6.3-6.6 11.7-5.4" {...p} /></>; break
    case "instagram": body = <><rect x="4" y="4" width="16" height="16" rx="4.5" {...p} /><circle cx="12" cy="12" r="3.6" {...p} /><path d="M16.8 7.2v.01" {...p} /></>; break
    case "mail": body = <><rect x="3.5" y="5.5" width="17" height="13" rx="2.5" {...p} /><path d="m4.5 7 7.5 6 7.5-6" {...p} /></>; break
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {body}
    </svg>
  )
}

function socialIcon(label: string): IconName {
  const l = label.toLowerCase()
  if (l.includes("linkedin")) return "linkedin"
  if (l.includes("github")) return "github"
  if (l === "x" || l.includes("twitter")) return "x"
  if (l.includes("dribbble")) return "dribbble"
  if (l.includes("instagram")) return "instagram"
  if (l.includes("mail")) return "mail"
  return "globe"
}

/* ---------------------------------------------------------------- media helpers */

function Media({ src, alt, w, h }: { src: string | React.ReactNode; alt: string; w: number; h: number }) {
  if (typeof src === "string") {
    return <img src={src} alt={alt} width={w} height={h} style={{ maxWidth: "none" }} draggable={false} />
  }
  return <>{src}</>
}

/* ---------------------------------------------------------------- art (all SVG) */

function Portrait({ uid, title }: { uid: string; title: string }) {
  const bg = uid + "-pbg"
  const rim = uid + "-prim"
  return (
    <svg width={116} height={116} viewBox="0 0 120 120" role="img" aria-label={title}>
      <defs>
        <radialGradient id={bg} cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor="#f2652a" />
          <stop offset="0.6" stopColor="#d9461b" />
          <stop offset="1" stopColor="#a8300f" />
        </radialGradient>
        <linearGradient id={rim} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3a2418" />
          <stop offset="0.55" stopColor="#140d0a" />
          <stop offset="1" stopColor="#0b0807" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" fill={"url(#" + bg + ")"} />
      {/* shoulders */}
      <path d="M8 120c3-20 18-29 34-33l11-4h16l11 4c17 4 31 13 33 33Z" fill="#0d0a09" />
      {/* neck */}
      <path d="M50 70c0 8-1 13-4 17 8 5 22 5 30 0-3-4-4-9-4-17Z" fill="#170f0c" />
      {/* head, turned three-quarters to the right */}
      <path
        d="M41 44c0-17 10-28 24-28 13 0 22 9 23 22 .4 5 0 9 1.5 12.5 1.2 2.6 3.4 4.3 2.4 6.3-.8 1.6-3 1.5-3.4 3.2-.4 1.9.8 3.9-.6 5.4-1.2 1.2-2.7.4-3.2 1.9-.6 2 .4 5.3-2.3 6.9-3.5 2-9.7.5-13.6-.8C56 71.9 48 66 44 58c-2-4-3-9-3-14Z"
        fill={"url(#" + rim + ")"}
      />
      {/* ear and a hint of light along the brow and cheek */}
      <ellipse cx="52" cy="50" rx="4" ry="6.5" fill="#1d1410" />
      <path d="M71 33c6 1 11 5 13 11" stroke="#5a3a2a" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity=".7" />
      <path d="M86.5 52c1.6 3 3.5 4.4 4.2 5.4" stroke="#7a4b33" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity=".6" />
      <path d="M40 120c6-14 16-21 30-24" stroke="#2a1c15" strokeWidth="1.2" fill="none" opacity=".6" />
    </svg>
  )
}

function AlbumArt({ uid, track, index }: { uid: string; track: BentoTrack; index: number }) {
  const style = index % 3
  const bg = track.color || ["#f2a9bf", "#2f3e74", "#efe6d2"][style]
  const word = (track.title.split(/\s+/)[0] || "").toUpperCase()
  const gid = uid + "-al" + index
  if (style === 1) {
    return (
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" role="img" aria-label={track.title + " cover"}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={bg} />
            <stop offset="1" stopColor="#e9746a" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" fill={"url(#" + gid + ")"} />
        <circle cx="50" cy="56" r="22" fill="#ffd27a" />
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x="0" y={60 + i * 5.5} width="100" height={1.6 + i * 0.5} fill={bg} opacity=".9" />
        ))}
        <rect x="0" y="86" width="100" height="14" fill="#1d2448" />
        <text x="8" y="14" fontSize="6.5" fontWeight="700" letterSpacing="1.2" fill="#ffe7c2" fontFamily="ui-sans-serif,system-ui,sans-serif">{word}</text>
      </svg>
    )
  }
  if (style === 2) {
    const cols = ["#e4572e", "#29335c", "#f3a712", "#669bbc", "#1c1b1a"]
    return (
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" role="img" aria-label={track.title + " cover"}>
        <rect width="100" height="100" fill={bg} />
        {Array.from({ length: 16 }, (_, i) => {
          const x = (i % 4) * 20 + 12
          const y = Math.floor(i / 4) * 17 + 10
          const c = cols[(i * 7 + index) % cols.length]
          return i % 3 === 0 ? <circle key={i} cx={x + 7} cy={y + 7} r="7" fill={c} /> : <rect key={i} x={x} y={y} width="14" height="14" fill={c} opacity={i % 2 ? 1 : 0.85} />
        })}
        <text x="50" y="94" textAnchor="middle" fontSize="5.5" fontWeight="700" letterSpacing="2" fill="#1c1b1a" fontFamily="ui-sans-serif,system-ui,sans-serif">{word}</text>
      </svg>
    )
  }
  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" role="img" aria-label={track.title + " cover"}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4a4a4a" />
          <stop offset="0.5" stopColor="#1a1a1a" />
          <stop offset="1" stopColor="#050505" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={bg} />
      {/* a black-and-white bust on a plinth */}
      <path d="M26 74c2-9 8-13 15-15l4-2h10l4 2c7 2 13 6 15 15Z" fill="#111" />
      <path d="M44 48c0 5-1 7-2 9 4 3 12 3 16 0-1-2-2-4-2-9Z" fill="#2a2a2a" />
      <path d="M38 33c0-10 6-16 12-16s12 6 12 16c0 8-4 16-12 16s-12-8-12-16Z" fill={"url(#" + gid + ")"} />
      <path d="M44 31c2-1.2 4-1.2 5 0M52 31c1-1.2 3-1.2 5 0" stroke="#d9d9d9" strokeWidth=".8" fill="none" strokeLinecap="round" />
      <path d="M47 41c2 1 4 1 6 0" stroke="#bbb" strokeWidth=".7" fill="none" strokeLinecap="round" />
      <rect x="22" y="74" width="56" height="4" fill="#f4f1ec" />
      <text x="50" y="86" textAnchor="middle" fontSize="7.5" fontStyle="italic" fontWeight="800" letterSpacing="-.3" fill="#111" fontFamily="Georgia,'Times New Roman',serif">{word}</text>
      <text x="50" y="92" textAnchor="middle" fontSize="1.9" letterSpacing=".6" fill="#3a3a3a" fontFamily="ui-monospace,monospace">ALL SONGS WRITTEN, PRODUCED AND ARRANGED</text>
    </svg>
  )
}

function Kid({ x, y, s = 1, shirt, flip, phase }: { x: number; y: number; s?: number; shirt: string; flip?: boolean; phase: number }) {
  const legA = phase ? -22 : 18
  const legB = phase ? 26 : -16
  return (
    <g transform={"translate(" + x + " " + y + ") scale(" + (flip ? -s : s) + " " + s + ")"}>
      <ellipse cx="0" cy="44" rx="11" ry="2.4" fill="#2c4a1e" opacity=".35" />
      <g transform={"rotate(" + legA + " -3 22)"}>
        <path d="M-3 22v17" stroke="#9a6446" strokeWidth="4.2" strokeLinecap="round" />
        <path d="M-3 36v4" stroke="#f5f5f5" strokeWidth="4.6" strokeLinecap="round" />
        <path d="M-5 41h5" stroke="#1d1d1d" strokeWidth="3.2" strokeLinecap="round" />
      </g>
      <g transform={"rotate(" + legB + " 3 22)"}>
        <path d="M3 22v17" stroke="#a46c4d" strokeWidth="4.2" strokeLinecap="round" />
        <path d="M3 36v4" stroke="#f5f5f5" strokeWidth="4.6" strokeLinecap="round" />
        <path d="M1 41h5" stroke="#1d1d1d" strokeWidth="3.2" strokeLinecap="round" />
      </g>
      <rect x="-7.5" y="17" width="15" height="9" rx="2.5" fill="#22305a" />
      <path d="M-7 3h14l1.5 15h-17Z" fill={shirt} />
      <path d="M-7 5-12 15M7 5l6 9" stroke="#a46c4d" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M-7 4-10.5 10M7 4l4 6" stroke={shirt} strokeWidth="4.2" strokeLinecap="round" />
      <circle cx="0" cy="-3" r="5.6" fill="#a46c4d" />
      <path d="M-5.6-4.2a5.6 5.6 0 0 1 11.2-.6c-2-1.6-6-2-11.2.6Z" fill="#2a1a12" />
    </g>
  )
}

function Scene({ uid, kind, label }: { uid: string; kind: "football" | "mountains" | "coffee"; label: string }) {
  const id = (s: string) => uid + "-" + kind + "-" + s
  if (kind === "mountains") {
    return (
      <svg width="100%" height="100%" viewBox="0 0 240 220" preserveAspectRatio="xMidYMid slice" role="img" aria-label={label}>
        <defs>
          <linearGradient id={id("sky")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f3b98f" />
            <stop offset="0.55" stopColor="#f6dcc2" />
            <stop offset="1" stopColor="#efe5da" />
          </linearGradient>
        </defs>
        <rect width="240" height="220" fill={"url(#" + id("sky") + ")"} />
        <circle cx="160" cy="92" r="22" fill="#fff4dd" opacity=".95" />
        <path d="M0 120 34 86l22 18 30-40 30 32 22-18 40 40 26-22 36 34v90H0Z" fill="#b5a9b6" />
        <path d="M0 146 40 112l28 24 40-44 34 36 28-20 30 30 40-22v104H0Z" fill="#7d7590" />
        <path d="M0 176 52 140l34 22 46-36 40 34 30-18 38 30v48H0Z" fill="#4a4660" />
        <path d="M0 200c40-14 90-22 130-16s80 4 110-6v42H0Z" fill="#2e2b3d" />
        <g transform="translate(128 130)">
          <circle cx="0" cy="-12" r="3.2" fill="#2e2b3d" />
          <path d="M-3-8h6l2 10h-3l-1 9h-2l-1-9h-3Z" fill="#2e2b3d" />
          <path d="M3-7 8 4" stroke="#2e2b3d" strokeWidth="1.4" />
        </g>
        {[0, 1, 2].map((i) => (
          <path key={i} d={"M" + (40 + i * 18) + " " + (40 + i * 6) + "q3-3 6 0q3-3 6 0"} stroke="#6b5a5a" strokeWidth="1.1" fill="none" strokeLinecap="round" />
        ))}
      </svg>
    )
  }
  if (kind === "coffee") {
    return (
      <svg width="100%" height="100%" viewBox="0 0 240 220" preserveAspectRatio="xMidYMid slice" role="img" aria-label={label}>
        <rect width="240" height="220" fill="#c99f73" />
        {Array.from({ length: 9 }, (_, i) => (
          <path key={i} d={"M-10 " + (i * 26 + 8) + "C60 " + (i * 26 + 2) + " 160 " + (i * 26 + 18) + " 250 " + (i * 26 + 6)} stroke="#b58a5f" strokeWidth="1.2" fill="none" opacity=".7" />
        ))}
        <g transform="rotate(-8 150 110)">
          <rect x="112" y="40" width="112" height="146" rx="4" fill="#000" opacity=".12" transform="translate(4 6)" />
          <rect x="112" y="40" width="112" height="146" rx="4" fill="#fbfaf6" />
          {Array.from({ length: 11 }, (_, i) => (
            <path key={i} d={"M124 " + (64 + i * 11) + "H212"} stroke="#d9d4cb" strokeWidth="1" />
          ))}
          <path d="M126 70c10-6 22 6 34-2s20-4 28 2" stroke="#2f4fa8" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <rect x="128" y="96" width="40" height="28" rx="3" fill="none" stroke="#e4572e" strokeWidth="1.4" />
          <path d="M176 104h28M176 112h20" stroke="#2f4fa8" strokeWidth="1.4" strokeLinecap="round" />
          <rect x="112" y="40" width="7" height="146" fill="#e9e5dc" />
        </g>
        <g transform="rotate(32 70 180)">
          <rect x="30" y="176" width="86" height="6" rx="1.5" fill="#f3c54a" />
          <path d="M116 176l10 3-10 3Z" fill="#e7c9a0" />
          <rect x="24" y="176" width="7" height="6" fill="#e58aa0" />
        </g>
        <circle cx="70" cy="86" r="44" fill="#000" opacity=".14" transform="translate(4 6)" />
        <circle cx="70" cy="86" r="44" fill="#f6f4ef" />
        <circle cx="70" cy="86" r="30" fill="#ffffff" stroke="#e7e2d8" strokeWidth="2" />
        <path d="M100 82h12a7 7 0 0 1 0 14h-10" stroke="#f6f4ef" strokeWidth="6" fill="none" strokeLinecap="round" />
        <circle cx="70" cy="86" r="24" fill="#6a3f22" />
        <path d="M70 100c-9-6-14-11-14-16a6 6 0 0 1 11-3h6a6 6 0 0 1 11 3c0 5-5 10-14 16Z" fill="#f3e3cb" />
        <path d="M70 98c-4-3-7-6-7-9" stroke="#c9a37c" strokeWidth="1" fill="none" />
        <g fill="#5f8a4a">
          <ellipse cx="16" cy="200" rx="20" ry="8" transform="rotate(-30 16 200)" />
          <ellipse cx="34" cy="214" rx="18" ry="7" transform="rotate(10 34 214)" fill="#4c7a3b" />
          <ellipse cx="6" cy="176" rx="16" ry="6" transform="rotate(-70 6 176)" fill="#6d9a56" />
        </g>
      </svg>
    )
  }
  return (
    <svg width="100%" height="100%" viewBox="0 0 240 220" preserveAspectRatio="xMidYMid slice" role="img" aria-label={label}>
      <defs>
        <linearGradient id={id("sky")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dfe8ec" />
          <stop offset="1" stopColor="#eef1ea" />
        </linearGradient>
        <linearGradient id={id("grass")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4f7a36" />
          <stop offset="1" stopColor="#36602a" />
        </linearGradient>
      </defs>
      <rect width="240" height="220" fill={"url(#" + id("sky") + ")"} />
      <path d="M0 48c30-10 60-6 90-12s70 2 100-6 40 4 50 2v60H0Z" fill="#7d9566" />
      <path d="M0 64c40-8 70 0 110-6s80-4 130-8v40H0Z" fill="#5d7d48" />
      {[14, 30, 52, 76, 150, 176, 204, 226].map((x, i) => (
        <ellipse key={x} cx={x} cy={60 - (i % 3) * 6} rx={4 + (i % 2) * 2} ry={22 + (i % 3) * 8} fill={i % 2 ? "#2f4a24" : "#3b5a2c"} />
      ))}
      <circle cx="104" cy="58" r="16" fill="#46683a" />
      <circle cx="124" cy="62" r="13" fill="#3e5f32" />
      <rect x="0" y="80" width="240" height="14" fill="#9aa08c" />
      {Array.from({ length: 30 }, (_, i) => (
        <path key={i} d={"M" + i * 8 + " 80v14"} stroke="#7f8573" strokeWidth=".8" />
      ))}
      <rect x="0" y="94" width="240" height="126" fill={"url(#" + id("grass") + ")"} />
      {[0, 1, 2, 3, 4].map((i) => (
        <path key={i} d={"M" + (i * 60 - 20) + " 94l" + (i * 18 - 30) + " 126h30l" + (30 - i * 18) + "-126Z"} fill="#ffffff" opacity=".05" />
      ))}
      <path d="M-10 132 250 118" stroke="#e9efe2" strokeWidth="1.6" opacity=".8" />
      <path d="M20 94 4 220" stroke="#e9efe2" strokeWidth="1.4" opacity=".7" />
      <g stroke="#f2f2f2" strokeWidth="2.2" fill="none" strokeLinecap="round">
        <path d="M30 104v-30h44v30" />
      </g>
      <path d="M31 75h42v28H31Z" fill="none" stroke="#ffffff" strokeWidth=".5" strokeDasharray="1.5 1.5" opacity=".6" />
      <g>
        <Kid x={92} y={146} s={1.15} shirt="#e2423e" phase={0} />
        <Kid x={148} y={140} s={1.2} shirt="#d6332f" flip phase={1} />
      </g>
      <circle cx="120" cy="190" r="5" fill="#f7f7f2" stroke="#2a2a2a" strokeWidth=".8" />
      <path d="M118 188l2 1 2-1M119 192h2" stroke="#2a2a2a" strokeWidth=".8" fill="none" />
    </svg>
  )
}

function ProjectCover({ uid, project, index }: { uid: string; project: BentoProject; index: number }) {
  const hue = project.hue ?? hashString(project.title) % 360
  const kind = project.kind ?? "web"
  const gid = uid + "-pc" + index
  const a = "hsl(" + hue + " 72% 86%)"
  const b = "hsl(" + ((hue + 34) % 360) + " 70% 74%)"
  const deep = "hsl(" + hue + " 55% 38%)"
  const mid = "hsl(" + hue + " 70% 62%)"
  return (
    <svg width="100%" height="100%" viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" role="img" aria-label={project.title + " cover"}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
      </defs>
      <rect width="400" height="250" fill={"url(#" + gid + ")"} />
      <circle cx="340" cy="30" r="90" fill="#fff" opacity=".18" />
      {kind === "web" && (
        <g>
          <rect x="54" y="44" width="292" height="230" rx="10" fill="#000" opacity=".08" transform="translate(0 6)" />
          <rect x="54" y="44" width="292" height="230" rx="10" fill="#ffffff" />
          <rect x="54" y="44" width="292" height="24" rx="10" fill="#f3f2ef" />
          <rect x="54" y="58" width="292" height="10" fill="#f3f2ef" />
          {[0, 1, 2].map((i) => <circle key={i} cx={68 + i * 10} cy="56" r="3" fill={["#ff6159", "#ffbd2e", "#28c941"][i]} />)}
          <rect x="140" y="51" width="120" height="10" rx="5" fill="#e6e4df" />
          <rect x="74" y="86" width="40" height="6" rx="3" fill={deep} />
          <rect x="250" y="86" width="76" height="6" rx="3" fill="#e6e4df" />
          <rect x="74" y="108" width="150" height="14" rx="3" fill="#1c1b1a" />
          <rect x="74" y="128" width="110" height="14" rx="3" fill="#1c1b1a" />
          <rect x="74" y="152" width="130" height="5" rx="2.5" fill="#d5d2cc" />
          <rect x="74" y="162" width="100" height="5" rx="2.5" fill="#d5d2cc" />
          <rect x="74" y="180" width="58" height="18" rx="9" fill={deep} />
          <rect x="240" y="104" width="86" height="96" rx="8" fill={mid} />
          <circle cx="283" cy="140" r="18" fill="#fff" opacity=".7" />
          <rect x="74" y="214" width="78" height="44" rx="6" fill="#f3f2ef" />
          <rect x="160" y="214" width="78" height="44" rx="6" fill="#f3f2ef" />
          <rect x="246" y="214" width="80" height="44" rx="6" fill="#f3f2ef" />
        </g>
      )}
      {kind === "app" && (
        <g>
          {[0, 1].map((p) => {
            const x = p ? 212 : 108
            const y = p ? 56 : 34
            return (
              <g key={p}>
                <rect x={x} y={y} width="88" height="186" rx="18" fill="#000" opacity=".12" transform="translate(0 6)" />
                <rect x={x} y={y} width="88" height="186" rx="18" fill="#1c1b1a" />
                <rect x={x + 5} y={y + 5} width="78" height="176" rx="14" fill={p ? "#fbfaf7" : deep} />
                <rect x={x + 32} y={y + 10} width="24" height="6" rx="3" fill="#1c1b1a" />
                {p === 0 ? (
                  <>
                    <circle cx={x + 44} cy={y + 70} r="26" fill={mid} />
                    <circle cx={x + 44} cy={y + 70} r="14" fill={a} />
                    <rect x={x + 16} y={y + 112} width="56" height="7" rx="3.5" fill="#fff" opacity=".9" />
                    <rect x={x + 22} y={y + 124} width="44" height="5" rx="2.5" fill="#fff" opacity=".5" />
                    {[0, 1, 2, 3].map((i) => <circle key={i} cx={x + 20 + i * 16} cy={y + 156} r="5" fill="#fff" opacity={i === 1 ? 1 : 0.4} />)}
                  </>
                ) : (
                  <>
                    <rect x={x + 12} y={y + 26} width="64" height="44" rx="8" fill={mid} />
                    {[0, 1, 2, 3].map((i) => (
                      <g key={i}>
                        <rect x={x + 12} y={y + 80 + i * 22} width="16" height="16" rx="5" fill={i % 2 ? b : a} />
                        <rect x={x + 34} y={y + 83 + i * 22} width="38" height="4" rx="2" fill="#1c1b1a" opacity=".8" />
                        <rect x={x + 34} y={y + 90 + i * 22} width="26" height="3" rx="1.5" fill="#bbb" />
                      </g>
                    ))}
                  </>
                )}
              </g>
            )
          })}
        </g>
      )}
      {kind === "brand" && (
        <g>
          <circle cx="132" cy="122" r="58" fill={deep} />
          <path d={"M132 64a58 58 0 0 1 0 116Z"} fill={mid} />
          <circle cx="132" cy="122" r="18" fill={a} />
          <rect x="214" y="94" width="120" height="16" rx="3" fill="#1c1b1a" />
          <rect x="214" y="118" width="84" height="16" rx="3" fill="#1c1b1a" />
          <rect x="214" y="146" width="96" height="5" rx="2.5" fill="#1c1b1a" opacity=".35" />
          {[0, 1, 2, 3].map((i) => <rect key={i} x={214 + i * 30} y="170" width="24" height="24" rx="5" fill={[deep, mid, a, "#1c1b1a"][i]} stroke="#fff" strokeOpacity=".6" />)}
        </g>
      )}
    </svg>
  )
}

/* ---------------------------------------------------------------- hooks */

function useInterval(cb: () => void, ms: number | null) {
  const ref = React.useRef(cb)
  ref.current = cb
  React.useEffect(() => {
    if (ms == null) return
    const t = setInterval(() => ref.current(), ms)
    return () => clearInterval(t)
  }, [ms])
}

function useNow(timeZone?: string) {
  const [label, setLabel] = React.useState("")
  const fmt = React.useCallback(() => {
    try {
      return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone }).format(new Date())
    } catch {
      return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date())
    }
  }, [timeZone])
  React.useEffect(() => setLabel(fmt()), [fmt])
  useInterval(() => setLabel(fmt()), 20000)
  return label
}

function useInView<T extends Element>(ref: React.RefObject<T | null>) {
  const [seen, setSeen] = React.useState(false)
  React.useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    if (typeof IntersectionObserver !== "function") {
      setSeen(true)
      return
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setSeen(true)
        io.disconnect()
      }
    }, { threshold: 0.3 })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, seen])
  return seen
}

function prefersReducedMotion() {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches
}

/* ---------------------------------------------------------------- voice note */

type SpeechState = { token: number; started: boolean; spoke: boolean }

function VoiceNote({ note, name }: { note: BentoVoiceNote; name: string }) {
  const text = note.transcript.trim()
  const total = note.duration ?? estimateSeconds(text)
  const bars = React.useMemo(() => waveform(text + name, 54), [text, name])
  const [playing, setPlaying] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [hoverX, setHoverX] = React.useState(null as number | null)
  const audioRef = React.useRef(null as HTMLAudioElement | null)
  const waveRef = React.useRef(null as HTMLDivElement | null)
  const pos = React.useRef(0)
  const spokenTo = React.useRef(0)
  const speech = React.useRef({ token: 0, started: false, spoke: false } as SpeechState)
  const mode: "audio" | "speech" | "timer" = note.src
    ? "audio"
    : note.speak !== false && typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance === "function"
      ? "speech"
      : "timer"
  const modeRef = React.useRef(mode)
  React.useEffect(() => {
    modeRef.current = mode
  }, [mode])

  const stopSpeech = React.useCallback(() => {
    speech.current.token++
    if (speech.current.started && typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel()
    speech.current.started = false
  }, [])

  const finish = React.useCallback(() => {
    stopSpeech()
    setPlaying(false)
    pos.current = 0
    spokenTo.current = 0
    setProgress(1)
    setTimeout(() => setProgress((p) => (p >= 1 ? 0 : p)), 700)
  }, [stopSpeech])

  // Read the transcript aloud from a character offset, one sentence at a time.
  const speakFrom = React.useCallback(
    (from: number) => {
      if (mode !== "speech") return
      const synth = window.speechSynthesis
      stopSpeech()
      const token = speech.current.token
      speech.current.spoke = false
      modeRef.current = "speech"
      const start = snapToWord(text, from)
      const parts = splitSentences(text.slice(start)).map((p) => ({ text: p.text, start: p.start + start }))
      if (!parts.length) return finish()
      const voices = synth.getVoices()
      const voice = voices.find((v) => /^en/i.test(v.lang) && v.localService) || voices.find((v) => /^en/i.test(v.lang))
      parts.forEach((part, i) => {
        const u = new SpeechSynthesisUtterance(part.text)
        if (voice) u.voice = voice
        u.rate = 1.02
        u.onboundary = (e) => {
          if (speech.current.token === token) spokenTo.current = (part.start + e.charIndex) / text.length
        }
        u.onstart = () => {
          if (speech.current.token !== token) return
          speech.current.spoke = true
          spokenTo.current = part.start / text.length
        }
        if (i === parts.length - 1) u.onend = () => speech.current.token === token && finish()
        u.onerror = (e) => {
          // A cancelled queue reports "interrupted"/"canceled"; anything else means no voice, so keep time silently.
          if (speech.current.token === token && e.error !== "interrupted" && e.error !== "canceled") modeRef.current = "timer"
        }
        synth.speak(u)
      })
      speech.current.started = true
      // Some engines (no voices installed, headless, locked-down iframes) accept the
      // queue and never start. Keep the note moving silently instead of stalling.
      setTimeout(() => {
        if (speech.current.token === token && !speech.current.spoke) modeRef.current = "timer"
      }, 1500)
    },
    [mode, text, stopSpeech, finish],
  )

  // The clock: audio drives itself; speech and timer advance on rAF, speech nudged by word boundaries.
  React.useEffect(() => {
    if (!playing || mode === "audio") return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      let next = pos.current + dt / total
      if (modeRef.current === "speech") {
        next = Math.max(next, spokenTo.current)
        next = Math.min(next, spokenTo.current + 0.08, 0.995)
      }
      pos.current = next
      setProgress(next)
      if (modeRef.current === "timer" && next >= 1) return finish()
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, mode, total, finish])

  React.useEffect(() => () => stopSpeech(), [stopSpeech])

  const toggle = () => {
    if (mode === "audio") {
      const a = audioRef.current
      if (!a) return
      if (a.paused) a.play().catch(() => setPlaying(false))
      else a.pause()
      return
    }
    if (playing) {
      stopSpeech()
      setPlaying(false)
      return
    }
    spokenTo.current = pos.current
    speakFrom(pos.current * text.length)
    setPlaying(true)
  }

  const seekTo = (f: number) => {
    const v = Math.min(0.999, Math.max(0, f))
    pos.current = v
    spokenTo.current = v
    setProgress(v)
    if (mode === "audio") {
      const a = audioRef.current
      if (a && isFinite(a.duration)) a.currentTime = v * a.duration
    } else if (playing) speakFrom(v * text.length)
  }

  const fraction = (clientX: number) => {
    const r = waveRef.current?.getBoundingClientRect()
    return r ? (clientX - r.left) / r.width : 0
  }

  const remaining = mode === "audio" && audioRef.current && isFinite(audioRef.current.duration) ? audioRef.current.duration * (1 - progress) : total * (1 - progress)
  const caption = playing ? captionAt(text, progress) : ""

  return (
    <div className="bpt-voice-wrap">
      <div className="bpt-voice" data-playing={playing}>
        <button type="button" className="bpt-play" onClick={toggle} aria-label={playing ? "Pause voice note" : "Play voice note from " + name} aria-pressed={playing}>
          <Icon name={playing ? "pause" : "play"} size={18} />
        </button>
        <div
          ref={waveRef}
          className="bpt-wave"
          role="slider"
          tabIndex={0}
          aria-label="Voice note position"
          aria-valuemin={0}
          aria-valuemax={Math.round(total)}
          aria-valuenow={Math.round(progress * total)}
          aria-valuetext={formatClock(progress * total) + " of " + formatClock(total)}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            seekTo(fraction(e.clientX))
          }}
          onPointerMove={(e) => {
            const f = fraction(e.clientX)
            setHoverX(Math.min(1, Math.max(0, f)))
            if (e.buttons === 1) seekTo(f)
          }}
          onPointerLeave={() => setHoverX(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") seekTo(progress + 2 / total)
            else if (e.key === "ArrowLeft") seekTo(progress - 2 / total)
            else if (e.key === " " || e.key === "Enter") toggle()
            else return
            e.preventDefault()
          }}
        >
          <div className="bpt-bars" aria-hidden="true">
            {bars.map((h, i) => <i key={i} style={{ height: Math.round(h * 28) + "px" }} />)}
          </div>
          <div className="bpt-bars bpt-bars-on" aria-hidden="true" style={{ clipPath: "inset(0 " + (100 - progress * 100).toFixed(2) + "% 0 0)" }}>
            {bars.map((h, i) => <i key={i} style={{ height: Math.round(h * 28) + "px", ["--d" as string]: (i % 7) * -0.16 + "s" }} />)}
          </div>
          {hoverX != null && <span className="bpt-hover-line" style={{ left: hoverX * 100 + "%" }} />}
        </div>
        <span className="bpt-time">{formatClock(remaining)}</span>
        {note.src && (
          <audio
            ref={audioRef}
            src={note.src}
            preload="metadata"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onTimeUpdate={(e) => {
              const a = e.currentTarget
              if (isFinite(a.duration) && a.duration > 0) setProgress(a.currentTime / a.duration)
            }}
            onEnded={finish}
          />
        )}
      </div>
      <p className="bpt-caption" aria-live="off">
        {caption && <span key={caption}>“{caption}”</span>}
      </p>
    </div>
  )
}

/* ---------------------------------------------------------------- cards */

function Chip({ icon, children }: { icon: IconName; children: React.ReactNode }) {
  return (
    <span className="bpt-chip">
      <Icon name={icon} size={12} />
      {children}
    </span>
  )
}

function ExperienceCard({ items }: { items: BentoRole[] }) {
  const listRef = React.useRef(null as HTMLOListElement | null)
  const [thumb, setThumb] = React.useState({ top: 0, h: 0 })
  const drag = React.useRef(null as { y: number; scroll: number } | null)

  const measure = React.useCallback(() => {
    const el = listRef.current
    if (!el) return
    const track = el.clientHeight - 62
    if (el.scrollHeight <= el.clientHeight + 1 || track <= 0) return setThumb({ top: 0, h: 0 })
    const h = Math.max(24, (el.clientHeight / el.scrollHeight) * track)
    const top = (el.scrollTop / (el.scrollHeight - el.clientHeight)) * (track - h)
    setThumb({ top, h })
  }, [])

  // Newest is at the bottom, so start there, the way a chat or a log reads.
  React.useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
    measure()
    if (typeof ResizeObserver !== "function") return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [measure, items])

  return (
    <>
      <Chip icon="linkedin">Experience</Chip>
      <ol ref={listRef} className="bpt-xp-list" onScroll={measure} aria-label="Experience timeline" tabIndex={0}>
        {items.map((r, i) => {
          const now = i === items.length - 1
          return (
            <li key={r.company + r.year + i} className="bpt-xp" data-now={now}>
              <span className="bpt-xp-dot" aria-hidden="true" />
              {r.href ? (
                <a className="bpt-xp-name" href={r.href} target="_blank" rel="noreferrer">{r.company}</a>
              ) : (
                <span className="bpt-xp-name">{r.company}</span>
              )}
              <span className="bpt-xp-year">{r.year}</span>
              {r.role && (
                <span className="bpt-xp-role">
                  <span>{r.role}</span>
                </span>
              )}
            </li>
          )
        })}
      </ol>
      {thumb.h > 0 && (
        <div className="bpt-thumb-track" aria-hidden="true">
          <div
            className="bpt-thumb"
            style={{ top: thumb.top, height: thumb.h }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              drag.current = { y: e.clientY, scroll: listRef.current?.scrollTop ?? 0 }
            }}
            onPointerMove={(e) => {
              const el = listRef.current
              if (!drag.current || !el) return
              const track = el.clientHeight - 62
              const ratio = (el.scrollHeight - el.clientHeight) / Math.max(1, track - thumb.h)
              el.scrollTop = drag.current.scroll + (e.clientY - drag.current.y) * ratio
            }}
            onPointerUp={() => (drag.current = null)}
          />
        </div>
      )}
    </>
  )
}

function MusicCard({ uid, tracks }: { uid: string; tracks: BentoTrack[] }) {
  const [index, setIndex] = React.useState(0)
  const track = tracks[index % tracks.length]
  const duration = track.duration ?? 200
  const [elapsed, setElapsed] = React.useState(() => Math.round((tracks[0]?.duration ?? 200) * 0.16))
  const [playing, setPlaying] = React.useState(!track.src)
  const [muted, setMuted] = React.useState(false)
  const audioRef = React.useRef(null as HTMLAudioElement | null)
  const seekRef = React.useRef(null as HTMLDivElement | null)

  const go = (dir: number) => {
    setIndex((i) => (i + dir + tracks.length) % tracks.length)
    setElapsed(0)
  }

  useInterval(() => {
    if (track.src) return
    setElapsed((e) => {
      if (e + 0.25 >= duration) {
        go(1)
        return 0
      }
      return e + 0.25
    })
  }, playing && !track.src ? 250 : null)

  React.useEffect(() => {
    const a = audioRef.current
    if (!a) return
    a.muted = muted
    if (playing) a.play().catch(() => setPlaying(false))
    else a.pause()
  }, [playing, muted, index])

  const seek = (f: number) => {
    const v = Math.min(duration - 0.5, Math.max(0, f * duration))
    setElapsed(v)
    const a = audioRef.current
    if (a) a.currentTime = v
  }
  const frac = (x: number) => {
    const r = seekRef.current?.getBoundingClientRect()
    return r ? (x - r.left) / r.width : 0
  }
  const pct = Math.min(100, (elapsed / duration) * 100)

  return (
    <>
      <span className="bpt-chip">
        <Icon name="listen" size={12} />
        What I'm listening
        {playing && (
          <span className="bpt-eq" aria-hidden="true">
            <i /><i /><i />
          </span>
        )}
      </span>
      <div className="bpt-music" data-playing={playing}>
        <div className="bpt-music-art">
          <div className="bpt-vinyl" style={{ ["--bpt-label" as string]: track.color || "#f2a9bf" }} aria-hidden="true">
            <span className="bpt-vinyl-spin" />
          </div>
          <div className="bpt-art" key={index}>
            {track.art ? <Media src={track.art} alt={track.title + " cover"} w={172} h={172} /> : <AlbumArt uid={uid} track={track} index={index} />}
          </div>
        </div>
        <div className="bpt-music-info">
          <div className="bpt-track-swap" key={index}>
            <p className="bpt-track-title">{track.title}</p>
            <p className="bpt-track-artist">{track.artist}</p>
          </div>
          <div className="bpt-seek-row">
            <div
              ref={seekRef}
              className="bpt-seek"
              role="slider"
              tabIndex={0}
              aria-label="Track position"
              aria-valuemin={0}
              aria-valuemax={Math.round(duration)}
              aria-valuenow={Math.round(elapsed)}
              aria-valuetext={formatTrack(elapsed) + " of " + formatTrack(duration)}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId)
                seek(frac(e.clientX))
              }}
              onPointerMove={(e) => e.buttons === 1 && seek(frac(e.clientX))}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") seek((elapsed + 5) / duration)
                else if (e.key === "ArrowLeft") seek((elapsed - 5) / duration)
                else return
                e.preventDefault()
              }}
            >
              <div className="bpt-seek-bar">
                <div className="bpt-seek-fill" style={{ width: pct + "%" }} />
              </div>
              <div className="bpt-seek-knob" style={{ left: pct + "%" }} />
            </div>
            <span className="bpt-seek-time">{formatTrack(elapsed)}</span>
          </div>
          <div className="bpt-controls">
            <button type="button" className="bpt-ibtn" onClick={() => go(-1)} aria-label="Previous track"><Icon name="prev" size={13} /></button>
            <button type="button" className="bpt-ibtn" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"} aria-pressed={playing}>
              <Icon name={playing ? "pause" : "play"} size={13} />
            </button>
            <button type="button" className="bpt-ibtn" onClick={() => go(1)} aria-label="Next track"><Icon name="next" size={13} /></button>
            <button type="button" className="bpt-ibtn bpt-vol" onClick={() => setMuted((m) => !m)} aria-label={muted ? "Unmute" : "Mute"} aria-pressed={muted}>
              <Icon name={muted ? "mute" : "vol"} size={14} />
            </button>
          </div>
        </div>
      </div>
      {track.src && (
        <audio
          ref={audioRef}
          src={track.src}
          preload="none"
          onTimeUpdate={(e) => setElapsed(e.currentTarget.currentTime)}
          onEnded={() => go(1)}
        />
      )}
    </>
  )
}

function ReadingCard({ books }: { books: BentoBook[] }) {
  const [i, setI] = React.useState(0)
  const book = books[i % books.length]
  const progress = Math.min(1, Math.max(0, book.progress ?? 0.5))
  const words = coverWords(book.title)
  const color = book.color || "#b5352b"
  return (
    <>
      <Chip icon="book">What I'm reading</Chip>
      {books.length > 1 && (
        <div className="bpt-book-nav">
          <button type="button" className="bpt-ibtn" onClick={() => setI((n) => (n - 1 + books.length) % books.length)} aria-label="Previous book"><Icon name="left" size={13} /></button>
          <span aria-live="polite">{(i % books.length) + 1}/{books.length}</span>
          <button type="button" className="bpt-ibtn" onClick={() => setI((n) => (n + 1) % books.length)} aria-label="Next book"><Icon name="right" size={13} /></button>
        </div>
      )}
      <div className="bpt-read" key={i}>
        <p className="bpt-book-title bpt-track-swap">{book.title}</p>
        <p className="bpt-book-author bpt-track-swap">{book.author}</p>
        <div className="bpt-book-progress">
          {progress >= 1 ? "Finished, recommend it" : Math.round(progress * 100) + "% read"}
          <div className="bpt-book-bar"><i style={{ width: progress * 100 + "%" }} /></div>
        </div>
      </div>
      <div className="bpt-book" key={"b" + i} style={{ background: "linear-gradient(100deg," + color + " 0%," + color + " 70%,rgba(0,0,0,.18) 100%)," + color }} aria-hidden="true">
        <span className="bpt-book-frame" />
        {words.map((w, n) => (
          <span key={n} className="bpt-book-word" style={{ top: 20 + n * 38 }}>{w}</span>
        ))}
        <span className="bpt-book-sub">{book.author}</span>
      </div>
    </>
  )
}

function MapCard({ location }: { location: BentoLocation }) {
  const map = React.useMemo(() => buildMap(location.city), [location.city])
  const time = useNow(location.timeZone)
  const [pan, setPan] = React.useState({ x: 0, y: 0 })
  const ref = React.useRef(null as HTMLDivElement | null)
  const drag = React.useRef(null as { x: number; y: number; px: number; py: number; k: number } | null)
  const labels = location.labels ?? []
  const clamp = (v: number) => Math.max(-90, Math.min(90, v))
  const moved = Math.abs(pan.x) + Math.abs(pan.y) > 2
  return (
    <>
      <Chip icon="pin">Map</Chip>
      <div
        ref={ref}
        className="bpt-map"
        role="img"
        aria-label={"Map of " + location.city + ". Drag to look around."}
        onPointerDown={(e) => {
          const w = ref.current?.clientWidth || 300
          const h = ref.current?.clientHeight || 300
          e.currentTarget.setPointerCapture(e.pointerId)
          drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, k: 300 / Math.min(w, h) }
        }}
        onPointerMove={(e) => {
          const d = drag.current
          if (!d) return
          setPan({ x: clamp(d.px + (e.clientX - d.x) * d.k), y: clamp(d.py + (e.clientY - d.y) * d.k) })
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        <svg width="100%" height="100%" viewBox="0 0 300 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <rect x="-200" y="-200" width="700" height="700" fill="var(--bpt-map-bg)" />
          <g transform={"translate(" + pan.x.toFixed(1) + " " + pan.y.toFixed(1) + ")"} style={{ transition: drag.current ? "none" : "transform .6s cubic-bezier(.3,1.2,.5,1)" }}>
            {map.parks.map((d, i) => <path key={i} d={d} fill="var(--bpt-map-park)" />)}
            <path d={map.river} stroke="var(--bpt-map-water)" strokeWidth="9" fill="none" strokeLinecap="round" />
            <path d={map.minor} stroke="var(--bpt-map-line)" strokeWidth="2.3" fill="none" />
            <path d={map.minor} stroke="var(--bpt-map-road)" strokeWidth="1.2" fill="none" />
            <path d={map.major} stroke="var(--bpt-map-line)" strokeWidth="3.8" fill="none" />
            <path d={map.major} stroke="var(--bpt-map-road)" strokeWidth="2.6" fill="none" />
            {map.highways.map((d, i) => (
              <g key={i}>
                <path d={d} stroke="var(--bpt-map-line)" strokeWidth="6" fill="none" />
                <path d={d} stroke="var(--bpt-map-road)" strokeWidth="4.4" fill="none" />
              </g>
            ))}
            {labels.map((l) => (
              <text
                key={l.text}
                x={l.x}
                y={l.y}
                fontSize={l.text === l.text.toUpperCase() ? 7.5 : 9}
                letterSpacing={l.text === l.text.toUpperCase() ? 0.8 : 0}
                fill="var(--bpt-map-label)"
                stroke="var(--bpt-map-bg)"
                strokeWidth="2.5"
                paintOrder="stroke"
                fontFamily="ui-sans-serif,system-ui,sans-serif"
              >
                {l.text}
              </text>
            ))}
          </g>
        </svg>
        <span className="bpt-map-city">{location.city}</span>
        <span className="bpt-map-pin" style={{ left: "calc(50% + " + (pan.x / 300) * 100 + "%)", top: "calc(50% + " + (pan.y / 300) * 100 + "% + 22px)" }} />
      </div>
      {time && (
        <span className="bpt-map-time">
          <Icon name="target" size={11} />
          {time} local
        </span>
      )}
      {moved && (
        <button type="button" className="bpt-ibtn bpt-recenter" onClick={() => setPan({ x: 0, y: 0 })} aria-label="Recenter map">
          <Icon name="target" size={14} />
        </button>
      )}
    </>
  )
}

function PhotoCard({ uid, moments }: { uid: string; moments: BentoMoment[] }) {
  const [i, setI] = React.useState(0)
  const [hold, setHold] = React.useState(false)
  useInterval(() => setI((n) => (n + 1) % moments.length), !hold && moments.length > 1 ? 5200 : null)
  const m = moments[i % moments.length]
  return (
    <div
      className="bpt-photo"
      onPointerEnter={() => setHold(true)}
      onPointerLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={() => setHold(false)}
    >
      {moments.map((mo, n) => (
        <div key={n} className="bpt-slide" data-on={n === i % moments.length} aria-hidden={n !== i % moments.length}>
          {mo.image ? <Media src={mo.image} alt={mo.caption} w={480} h={440} /> : <Scene uid={uid} kind={mo.scene ?? "football"} label={mo.caption} />}
        </div>
      ))}
      {moments.length > 1 && (
        <>
          <div className="bpt-dots">
            {moments.map((mo, n) => (
              <button key={n} type="button" aria-label={"Show " + mo.caption} aria-current={n === i % moments.length} onClick={() => setI(n)} />
            ))}
          </div>
          <button type="button" className="bpt-photo-nav bpt-photo-prev" onClick={() => setI((n) => (n - 1 + moments.length) % moments.length)} aria-label="Previous photo"><Icon name="left" size={14} /></button>
          <button type="button" className="bpt-photo-nav bpt-photo-next" onClick={() => setI((n) => (n + 1) % moments.length)} aria-label="Next photo"><Icon name="right" size={14} /></button>
        </>
      )}
      <span className="bpt-photo-cap" aria-live="polite">
        <span key={i}>{m.emoji ? m.emoji + " " : ""}{m.caption}</span>
      </span>
    </div>
  )
}

function StepsCard({ steps }: { steps: BentoStep[] }) {
  const [i, setI] = React.useState(0)
  const [hold, setHold] = React.useState(false)
  const DUR = 6500
  useInterval(() => setI((n) => (n + 1) % steps.length), !hold && steps.length > 1 ? DUR : null)
  const tabs = React.useRef([] as (HTMLButtonElement | null)[])
  const s = steps[i % steps.length]
  const num = String((i % steps.length) + 1).padStart(2, "0")
  return (
    <>
      <Chip icon="how">How I work</Chip>
      <div className="bpt-steps" onPointerEnter={() => setHold(true)} onPointerLeave={() => setHold(false)}>
        <span className="bpt-steps-num" aria-hidden="true" key={"n" + i}>{num}</span>
        <div className="bpt-steps-body" role="tabpanel" aria-live="polite">
          <h3 className="bpt-steps-title" key={"t" + i}>{num} {s.title}</h3>
          <p className="bpt-steps-desc" key={"d" + i}>{s.description}</p>
        </div>
        <div className="bpt-stepper" role="tablist" aria-label="How I work" data-paused={hold}>
          <span className="bpt-stepper-pill" style={{ width: 100 / steps.length + "%", transform: "translateX(" + (i % steps.length) * 100 + "%)" }} aria-hidden="true">
            <i key={i} style={{ ["--dur" as string]: DUR + "ms" }} />
          </span>
          {steps.map((st, n) => (
            <button
              key={n}
              ref={(el) => {
                tabs.current[n] = el
              }}
              type="button"
              role="tab"
              className="bpt-step"
              aria-selected={n === i % steps.length}
              tabIndex={n === i % steps.length ? 0 : -1}
              title={st.title}
              onClick={() => setI(n)}
              onKeyDown={(e) => {
                const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0
                if (!d) return
                e.preventDefault()
                const next = (n + d + steps.length) % steps.length
                setI(next)
                tabs.current[next]?.focus()
              }}
            >
              Step {String(n + 1).padStart(2, "0")}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

function QuotesCard({ items }: { items: BentoTestimonial[] }) {
  const [i, setI] = React.useState(0)
  const [hold, setHold] = React.useState(false)
  useInterval(() => setI((n) => (n + 1) % items.length), !hold && items.length > 1 ? 8000 : null)
  const q = items[i % items.length]
  const hue = hashString(q.name) % 360
  return (
    <>
      <Chip icon="quote">Kind words</Chip>
      <span className="bpt-quote-mark" aria-hidden="true">“</span>
      <figure className="bpt-quote" onPointerEnter={() => setHold(true)} onPointerLeave={() => setHold(false)}>
        <blockquote key={i}>{q.quote}</blockquote>
        <figcaption className="bpt-quote-foot">
          <span className="bpt-mono" style={{ background: "hsl(" + hue + " 45% 45%)" }} aria-hidden="true">{initials(q.name)}</span>
          <span>
            <span className="bpt-quote-name" style={{ display: "block" }}>{q.name}</span>
            {q.role && <span className="bpt-quote-role">{q.role}</span>}
          </span>
          {items.length > 1 && (
            <span className="bpt-quote-nav">
              <button type="button" className="bpt-ibtn" onClick={() => setI((n) => (n - 1 + items.length) % items.length)} aria-label="Previous testimonial"><Icon name="left" size={14} /></button>
              <button type="button" className="bpt-ibtn" onClick={() => setI((n) => (n + 1) % items.length)} aria-label="Next testimonial"><Icon name="right" size={14} /></button>
            </span>
          )}
        </figcaption>
      </figure>
    </>
  )
}

function CountUp({ to, run }: { to: number; run: boolean }) {
  const [v, setV] = React.useState(0)
  React.useEffect(() => {
    if (!run) return
    if (prefersReducedMotion()) return setV(to)
    let raf = 0
    const t0 = performance.now()
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 1300)
      setV(to * (1 - Math.pow(1 - k, 3)))
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [to, run])
  return <>{Number.isInteger(to) ? Math.round(v) : v.toFixed(1)}</>
}

function StatsCard({ stats }: { stats: BentoStat[] }) {
  const ref = React.useRef(null as HTMLDivElement | null)
  const seen = useInView(ref)
  return (
    <>
      <Chip icon="stats">By the numbers</Chip>
      <div ref={ref} className="bpt-stats">
        {stats.map((s) => (
          <div key={s.label} className="bpt-stat">
            <b>
              <CountUp to={s.value} run={seen} />
              {s.suffix}
            </b>
            <span>{s.label}</span>
          </div>
        ))}
      </div>
    </>
  )
}

function ToolsCard({ tools }: { tools: string[] }) {
  const rows = [tools.filter((_, i) => i % 2 === 0), tools.filter((_, i) => i % 2 === 1)].filter((r) => r.length)
  return (
    <>
      <Chip icon="tools">Toolbox</Chip>
      <div className="bpt-tools">
        {rows.map((row, r) => (
          <div key={r} className="bpt-marquee" data-rev={r === 1} style={{ ["--dur" as string]: 22 + row.length * 3 + "s" }}>
            {[0, 1].map((copy) =>
              row.map((t) => (
                <span key={copy + t} className="bpt-tool" aria-hidden={copy === 1 ? "true" : undefined}>
                  <i style={{ ["--c" as string]: "hsl(" + (hashString(t) % 360) + " 65% 58%)" }} />
                  {t}
                </span>
              )),
            )}
          </div>
        ))}
      </div>
    </>
  )
}

/* ---------------------------------------------------------------- the template */

export default function BentoPortfolioTemplate({
  name = "John Doe",
  role = "Product Designer",
  company = "Northwind",
  companyHref,
  previously = "Lumen",
  bio = DEFAULT_BIO,
  avatar,
  handle = "johndoe",
  email = "hello@johndoe.design",
  bookingHref = "#",
  voiceNote = DEFAULT_VOICE,
  availability = { label: "Available for Work", status: "available", note: "Booking projects from November" },
  experience = DEFAULT_EXPERIENCE,
  tracks = DEFAULT_TRACKS,
  books = DEFAULT_BOOKS,
  location = DEFAULT_LOCATION,
  moments = DEFAULT_MOMENTS,
  steps = DEFAULT_STEPS,
  projects = DEFAULT_PROJECTS,
  testimonials = DEFAULT_TESTIMONIALS,
  stats = DEFAULT_STATS,
  tools = DEFAULT_TOOLS,
  posts = DEFAULT_POSTS,
  socials = DEFAULT_SOCIALS,
  accent = "#f0782a",
  defaultTheme = "system",
  onThemeChange,
  height = "100svh",
  className,
}: BentoPortfolioTemplateProps) {
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const rootRef = React.useRef(null as HTMLDivElement | null)
  const [theme, setTheme] = React.useState<Theme>(defaultTheme === "dark" ? "dark" : "light")
  const [copied, setCopied] = React.useState(false)
  const [open, setOpen] = React.useState(null as number | null)
  const closeRef = React.useRef(null as HTMLButtonElement | null)
  const lastFocus = React.useRef(null as HTMLElement | null)
  const localTime = useNow(location?.timeZone)
  const firstName = name.split(/\s+/)[0] || name

  // "system" follows the host: its .dark class first (shadcn), then the OS.
  React.useEffect(() => {
    if (defaultTheme !== "system") return
    const dark =
      document.documentElement.classList.contains("dark") ||
      (typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches)
    setTheme(dark ? "dark" : "light")
  }, [defaultTheme])

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark"
    setTheme(next)
    onThemeChange?.(next)
  }

  const copyEmail = React.useCallback(() => {
    const done = () => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }
    const fallback = () => {
      const ta = document.createElement("textarea")
      ta.value = email
      ta.style.position = "fixed"
      ta.style.opacity = "0"
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand("copy")
      } catch {
        /* nothing left to try */
      }
      ta.remove()
      done()
    }
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(email).then(done, fallback)
    else fallback()
  }, [email])

  const jump = (id: string) => rootRef.current?.querySelector("#" + uid + "-" + id)?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" })

  // Project sheet: Esc closes, focus moves in and comes back.
  React.useEffect(() => {
    if (open == null) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null)
      else if (e.key === "ArrowRight") setOpen((o) => (o == null ? o : (o + 1) % projects.length))
      else if (e.key === "ArrowLeft") setOpen((o) => (o == null ? o : (o - 1 + projects.length) % projects.length))
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, projects.length])
  React.useEffect(() => {
    if (open == null) lastFocus.current?.focus?.()
  }, [open])

  // A soft light follows the pointer across whichever card it is over.
  const onGridMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const card = (e.target as HTMLElement).closest(".bpt-card") as HTMLElement | null
    if (!card) return
    const r = card.getBoundingClientRect()
    card.style.setProperty("--mx", e.clientX - r.left + "px")
    card.style.setProperty("--my", e.clientY - r.top + "px")
  }

  const status = availability?.status ?? "available"
  const statusColor = status === "busy" ? "#e5a33b" : status === "away" ? "#a29e98" : "#35c759"
  const sheet = open != null ? projects[open] : null
  let delay = 0
  const d = () => ({ ["--d" as string]: (delay += 60) + "ms" }) as React.CSSProperties

  const rowOne = experience.length > 0 || tracks.length > 0 || books.length > 0
  const hasWork = projects.length > 0

  return (
    <div
      ref={rootRef}
      className={"bpt-root" + (className ? " " + className : "")}
      data-theme={theme}
      style={{ minHeight: height, ["--bpt-accent" as string]: accent }}
    >
      <style>{BPT_CSS}</style>

      <header className="bpt-nav">
        <nav className="bpt-nav-in" aria-label="Site">
          <span className="bpt-handle">
            <span className="bpt-dot" style={{ ["--bpt-status" as string]: statusColor, width: 7, height: 7 }} aria-hidden="true" />
            <b>{handle}</b>
          </span>
          <div className="bpt-links">
            {hasWork && <button type="button" className="bpt-link" onClick={() => jump("work")}>Work</button>}
            {posts.length > 0 && <button type="button" className="bpt-link" onClick={() => jump("writing")}>Writing</button>}
            <button type="button" className="bpt-link" onClick={() => jump("contact")}>Contact</button>
            <button type="button" className="bpt-theme" onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
              <svg width={18} height={18} viewBox="0 0 24 24" aria-hidden="true">
                <mask id={uid + "-moon"}>
                  <rect width="24" height="24" fill="#fff" />
                  <circle className="bpt-sun-moon" cx={theme === "dark" ? 17 : 30} cy={theme === "dark" ? 8 : -6} r="6.5" fill="#000" />
                </mask>
                <circle className="bpt-sun-core" cx="12" cy="12" r={theme === "dark" ? 8 : 4.5} fill="currentColor" mask={"url(#" + uid + "-moon)"} />
                <g className="bpt-sun-rays" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
                    <path key={a} d="M12 2.5v2" transform={"rotate(" + a + " 12 12)"} />
                  ))}
                </g>
              </svg>
            </button>
          </div>
        </nav>
      </header>

      <main className="bpt-page">
        <section className="bpt-hero" aria-label="Introduction">
          <div className="bpt-avatar">
            {avatar ? <Media src={avatar} alt={name} w={116} h={116} /> : <Portrait uid={uid} title={name} />}
          </div>
          <h1 className="bpt-h1">
            Hi I'm {name} — I'm a {role}
            {company && (
              <>
                {" at "}
                {companyHref ? (
                  <a className="bpt-co" href={companyHref} target="_blank" rel="noreferrer">{company}</a>
                ) : (
                  <span>{company}</span>
                )}
              </>
            )}
            .{previously && <span className="bpt-prev"> Previously at {previously}.</span>}
          </h1>
          {bio && <p className="bpt-bio">{bio}</p>}
          {(voiceNote || availability) && (
            <div className="bpt-actions">
              {voiceNote && voiceNote.transcript.trim() && <VoiceNote note={voiceNote} name={firstName} />}
              {availability && (
                <button
                  type="button"
                  className="bpt-avail"
                  style={{ ["--bpt-status" as string]: statusColor, alignSelf: "flex-start" }}
                  onClick={copyEmail}
                  aria-label={availability.label + ". Copy email address"}
                >
                  <span className="bpt-dot" aria-hidden="true" />
                  <span aria-live="polite">{copied ? "Email copied" : availability.label}</span>
                  <span className="bpt-tip" role="tooltip">{availability.note ? availability.note + " · click to copy email" : "Click to copy email"}</span>
                </button>
              )}
            </div>
          )}
        </section>

        <div className="bpt-grid" onPointerMove={onGridMove}>
          {rowOne && (
            <>
              {experience.length > 0 && (
                <article className="bpt-card bpt-c3" style={d()} aria-label="Experience">
                  <ExperienceCard items={experience} />
                </article>
              )}
              {tracks.length > 0 && (
                <article className="bpt-card bpt-c6" style={d()} aria-label="What I'm listening to">
                  <MusicCard uid={uid} tracks={tracks} />
                </article>
              )}
              {books.length > 0 && (
                <article className="bpt-card bpt-c3" style={d()} aria-label="What I'm reading">
                  <ReadingCard books={books} />
                </article>
              )}
            </>
          )}
          {location && (
            <article className="bpt-card bpt-c3" style={d()} aria-label={"Based in " + location.city}>
              <MapCard location={location} />
            </article>
          )}
          {moments.length > 0 && (
            <article className="bpt-card bpt-c3" style={d()} aria-label="Photos">
              <PhotoCard uid={uid} moments={moments} />
            </article>
          )}
          {steps.length > 0 && (
            <article className="bpt-card bpt-c6" style={d()} aria-label="How I work">
              <StepsCard steps={steps} />
            </article>
          )}

          {hasWork && (
            <>
              <div className="bpt-head" id={uid + "-work"}>
                <h2 className="bpt-h2">
                  Selected work<sup>({String(projects.length).padStart(2, "0")})</sup>
                </h2>
                <p>Open a card for the story behind it</p>
              </div>
              {projects.map((p, i) => (
                <button
                  key={p.title + i}
                  type="button"
                  className="bpt-card bpt-c6 bpt-proj"
                  style={d()}
                  onClick={(e) => {
                    lastFocus.current = e.currentTarget
                    setOpen(i)
                  }}
                  aria-haspopup="dialog"
                >
                  <span className="bpt-proj-cover">
                    {p.cover ? <Media src={p.cover} alt={p.title} w={640} h={400} /> : <ProjectCover uid={uid} project={p} index={i} />}
                  </span>
                  <span className="bpt-proj-foot">
                    <span>
                      <span className="bpt-proj-title" style={{ display: "block" }}>{p.title}</span>
                      <span className="bpt-proj-meta">{[p.client, p.year].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span className="bpt-arrow" aria-hidden="true"><Icon name="arrow" size={14} /></span>
                  </span>
                </button>
              ))}
            </>
          )}

          {(testimonials.length > 0 || stats.length > 0 || tools.length > 0) && (
            <div className="bpt-head">
              <h2 className="bpt-h2">A little more</h2>
            </div>
          )}
          {testimonials.length > 0 && (
            <article className="bpt-card bpt-c6" style={d()} aria-label="Testimonials">
              <QuotesCard items={testimonials} />
            </article>
          )}
          {stats.length > 0 && (
            <article className="bpt-card bpt-c3" style={d()} aria-label="By the numbers">
              <StatsCard stats={stats} />
            </article>
          )}
          {tools.length > 0 && (
            <article className="bpt-card bpt-c3" style={d()} aria-label="Toolbox">
              <ToolsCard tools={tools} />
            </article>
          )}
          {posts.length > 0 && (
            <article className="bpt-card bpt-c6" style={d()} aria-label="Writing" id={uid + "-writing"}>
              <Chip icon="pen">Writing</Chip>
              <ul className="bpt-list">
                {posts.map((p) => (
                  <li key={p.title}>
                    <a className="bpt-row" href={p.href || "#"} target={p.href && p.href !== "#" ? "_blank" : undefined} rel="noreferrer">
                      <span className="bpt-row-title">{p.title}</span>
                      <span className="bpt-row-meta">{p.date}{p.minutes ? " · " + p.minutes + " min" : ""}</span>
                      <span className="bpt-row-go" aria-hidden="true"><Icon name="arrow" size={14} /></span>
                    </a>
                  </li>
                ))}
              </ul>
            </article>
          )}
          {socials.length > 0 && (
            <article className="bpt-card bpt-c6" style={d()} aria-label="Elsewhere">
              <Chip icon="globe">Elsewhere</Chip>
              <ul className="bpt-socials">
                {socials.map((s) => (
                  <li key={s.label}>
                    <a className="bpt-social" href={s.href} target="_blank" rel="noreferrer">
                      <span className="bpt-social-ic"><Icon name={socialIcon(s.label)} size={16} /></span>
                      <span className="bpt-social-txt">
                        <b>{s.label}</b>
                        {s.handle && <span>{s.handle}</span>}
                      </span>
                      <span className="bpt-row-go" aria-hidden="true"><Icon name="arrow" size={14} /></span>
                    </a>
                  </li>
                ))}
              </ul>
            </article>
          )}

          <section className="bpt-card bpt-c12 bpt-cta" style={d()} id={uid + "-contact"} aria-label="Contact">
            <svg className="bpt-cta-rings" width={460} height={460} viewBox="0 0 460 460" aria-hidden="true">
              {[60, 100, 140, 180, 220].map((r, i) => (
                <circle key={r} cx="230" cy="230" r={r} fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray={i % 2 ? "2 6" : "none"} />
              ))}
              <circle cx="230" cy="10" r="5" fill="var(--bpt-accent)" />
            </svg>
            <div className="bpt-cta-in">
              <div>
                <h2>
                  Have a project in mind? <span>Let's make it feel obvious.</span>
                </h2>
                <p>Tell me what you're building. I reply to every message, usually within a day.</p>
                <div className="bpt-cta-btns">
                  <button type="button" className="bpt-btn bpt-btn-accent" onClick={copyEmail}>
                    <Icon name={copied ? "check" : "copy"} size={15} />
                    <span aria-live="polite">{copied ? "Copied to clipboard" : email}</span>
                  </button>
                  {bookingHref && (
                    <a className="bpt-btn bpt-btn-ghost" href={bookingHref} target={bookingHref !== "#" ? "_blank" : undefined} rel="noreferrer">
                      <Icon name="calendar" size={15} />
                      Book a call
                    </a>
                  )}
                </div>
              </div>
              {location && localTime && (
                <div className="bpt-cta-side">
                  <div className="bpt-cta-clock">{localTime}</div>
                  <small>in {location.city} right now</small>
                </div>
              )}
            </div>
          </section>
        </div>

        <footer className="bpt-foot">
          <span>© {new Date().getFullYear()} {name}. Made with care{location ? " in " + location.city : ""}.</span>
          <button type="button" onClick={() => rootRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" })} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            Back to top <Icon name="up" size={13} />
          </button>
        </footer>
      </main>

      {sheet && (
        <div className="bpt-overlay" onClick={(e) => e.target === e.currentTarget && setOpen(null)}>
          <div className="bpt-sheet" role="dialog" aria-modal="true" aria-labelledby={uid + "-sheet"} key={open}>
            <button ref={closeRef} type="button" className="bpt-ibtn bpt-sheet-close" onClick={() => setOpen(null)} aria-label="Close">
              <Icon name="close" size={16} />
            </button>
            <div className="bpt-sheet-cover">
              {sheet.cover ? <Media src={sheet.cover} alt={sheet.title} w={720} h={405} /> : <ProjectCover uid={uid + "s"} project={sheet} index={open ?? 0} />}
            </div>
            <div className="bpt-sheet-body">
              <p className="bpt-proj-meta">{[sheet.client, sheet.year].filter(Boolean).join(" · ")}</p>
              <h3 id={uid + "-sheet"}>{sheet.title}</h3>
              {sheet.description && <p>{sheet.description}</p>}
              {sheet.tags && sheet.tags.length > 0 && (
                <div className="bpt-tags">
                  {sheet.tags.map((t) => <span key={t} className="bpt-tag">{t}</span>)}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                {sheet.href && (
                  <a className="bpt-btn bpt-sheet-visit" href={sheet.href} target="_blank" rel="noreferrer">
                    Visit project <Icon name="arrow" size={14} />
                  </a>
                )}
                {projects.length > 1 && (
                  <span style={{ marginLeft: "auto", marginTop: 20, display: "flex", gap: 4 }}>
                    <button type="button" className="bpt-ibtn" onClick={() => setOpen((o) => (o == null ? o : (o - 1 + projects.length) % projects.length))} aria-label="Previous project"><Icon name="left" size={15} /></button>
                    <button type="button" className="bpt-ibtn" onClick={() => setOpen((o) => (o == null ? o : (o + 1) % projects.length))} aria-label="Next project"><Icon name="right" size={15} /></button>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
