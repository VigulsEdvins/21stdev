"use client"

// Sticker Hello Portfolio — a whole designer portfolio with a sense of humour.
// A huge condensed-serif "Hi, I'm Juniper." wears two sticker puns that you
// can peel off and drag around, and clicking one swaps it for its next joke.
// A hand-drawn loop points at the bio, and "The good stuff" scrolls to the work.
//
// Work is a stack of case-study rows: a ruled row of client / disciplines /
// blurb over a full-bleed artwork that drifts with the scroll. Click an
// artwork to open the case study (overview, role, detail crops, results) with
// Esc / ← / → to close or flip through. Play is a sticker sheet you can
// decorate: drag, add from the tray, shuffle, peel. About has an illustrated
// portrait that blinks, and the footer copies your email and keeps your time.
//
// Every artwork, sticker and mark is SVG drawn in this file. Nothing loads at
// runtime unless you pass your own image URLs.
import * as React from "react"

/* ------------------------------------------------------------------ types */

export type HelloStickerShape = "burst" | "oval" | "circle" | "pill"

export type HelloSticker = {
  /** Clicking the sticker cycles through these lines. */
  lines: string[]
  shape?: HelloStickerShape
  color?: string
  ink?: string
  /** Centre of the sticker, in % of the headline box. */
  x?: number
  y?: number
  rotate?: number
  /** Width as a fraction of the headline's font size. */
  size?: number
}

export type HelloArt = "mural" | "phone" | "packaging" | "posters"

export type HelloProject = {
  title: string
  client: string
  disciplines: string[]
  description: string
  /** One of the built-in artworks. Ignored when `image` is set. */
  art?: HelloArt
  /** Your own cover image. It's cropped to fill the band. */
  image?: string
  imageAlt?: string
  year?: string
  role?: string
  overview?: string
  results?: { value: string; label: string }[]
  /** Shown as a "Visit the project" link inside the case study. */
  href?: string
}

export type HelloAbout = {
  /** The short line in the About row. */
  intro: string
  heading: string
  paragraphs: string[]
  services: string[]
  clients: string[]
  recognition: string[]
  resume: { label: string; href: string } | null
}

export type HelloPlay = { title: string; label: string; tags: string; description: string }

export type HelloFooter = {
  /** The big closing line. */
  heading: string
  /** A word inside `heading` that gets the hand-drawn underline. */
  highlight: string
  socials: { label: string; href: string }[]
  note: string
}

export type StickerHelloPortfolioProps = {
  /** The word after the greeting in the headline. */
  name?: string
  greeting?: string
  /** The nav's brand line. */
  fullName?: string
  stickers?: HelloSticker[]
  bio?: string
  /** Appended to the bio as an underlined link. `null` hides it. */
  studio?: { label: string; href: string } | null
  ctaLabel?: string
  nav?: { work?: string; play?: string; about?: string }
  projects?: HelloProject[]
  /** The sticker sheet. `false` hides the whole Play section. */
  play?: Partial<HelloPlay> | false
  about?: Partial<HelloAbout>
  footer?: Partial<HelloFooter>
  email?: string
  location?: string
  /** IANA zone for the footer clock, e.g. "America/New_York". */
  timeZone?: string
  colors?: { paper?: string; ink?: string; accent?: string }
  fonts?: { display?: string; body?: string }
  /** Horizontal squeeze of the display serif, 0.6–1. */
  squeeze?: number
  defaultTheme?: "system" | "light" | "dark"
  onThemeChange?: (theme: "light" | "dark") => void
  onProjectOpen?: (project: HelloProject, index: number) => void
  /** Minimum height of the page. A definite length, so it survives any host layout. */
  height?: string
  className?: string
}

type Theme = "light" | "dark"
type PlayKind = "sun" | "loaf" | "heart" | "bolt" | "hello" | "star" | "eye" | "flower" | "aplus" | "wow"
type Placed = { id: number; kind: PlayKind; x: number; y: number; r: number }

/* ------------------------------------------------------------------ logic */

// #region logic
function clamp(v: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, v))
}

function cycle(i: number, n: number, step = 1): number {
  if (n <= 0) return 0
  return (((i + step) % n) + n) % n
}

// Small deterministic PRNG so the scenery is the same on every render.
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

// A starburst outline: `points` spikes alternating between two radii.
function burstPath(cx: number, cy: number, points: number, outer: number, inner: number): string {
  const n = Math.max(3, Math.round(points)) * 2
  let d = ""
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 - Math.PI / 2
    const r = k % 2 === 0 ? outer : inner
    d += (k ? "L" : "M") + (cx + Math.cos(a) * r).toFixed(2) + " " + (cy + Math.sin(a) * r).toFixed(2)
  }
  return d + "Z"
}

// -1 when the element sits below the viewport, 1 when it has left above it.
function parallax(top: number, height: number, viewH: number): number {
  if (viewH <= 0 || height + viewH <= 0) return 0
  const progress = (viewH - top) / (viewH + height)
  return clamp(progress * 2 - 1, -1, 1)
}

// w100 is the headline measured at 100px; returns the size that fits `avail`.
function fitFont(w100: number, avail: number, squeeze: number, min: number, max: number): number {
  if (avail <= 0 || w100 <= 0) return min
  const perPx = (w100 / 100) * squeeze
  return Math.floor(clamp((avail * 0.94) / perPx, min, max) * 10) / 10
}

function splitHighlight(text: string, word: string): [string, string, string] {
  const i = word ? text.indexOf(word) : -1
  if (i < 0) return [text, "", ""]
  return [text.slice(0, i), word, text.slice(i + word.length)]
}

function formatClock(date: Date, timeZone?: string): string {
  const opts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", hour12: false }
  try {
    return new Intl.DateTimeFormat("en-GB", timeZone ? { ...opts, timeZone } : opts).format(date)
  } catch {
    return new Intl.DateTimeFormat("en-GB", opts).format(date)
  }
}

function mailtoHref(email: string, subject?: string): string {
  return "mailto:" + email + (subject ? "?subject=" + encodeURIComponent(subject) : "")
}

// Somewhere on the sheet that isn't the very edge, tilted a little.
function placeSticker(rnd: () => number): { x: number; y: number; r: number } {
  return { x: 0.1 + rnd() * 0.8, y: 0.14 + rnd() * 0.72, r: Math.round((rnd() - 0.5) * 36) }
}
// #endregion logic

/* --------------------------------------------------------------- defaults */

const D_STICKERS: HelloSticker[] = [
  { lines: ["Like the berry", "Or the tree", "Say it twice"], shape: "burst", color: "#fff23a", ink: "#161616", x: 61, y: 6, rotate: -10, size: 0.66 },
  { lines: ["Not the gin", "OK, maybe the gin", "Definitely not the gin"], shape: "oval", color: "#ff5b47", ink: "#161616", x: 91, y: 92, rotate: 12, size: 0.66 },
]

const D_PROJECTS: HelloProject[] = [
  {
    title: "Rise & Shine Daily",
    client: "Morning Loaf Co.",
    disciplines: ["Brand Design,", "Murals, OLV"],
    description: "A sunny new look and street campaign for a neighbourhood bakery that starts baking at 4am.",
    art: "mural",
    year: "2026",
    role: "Creative lead, illustration",
    overview:
      "Morning Loaf had great bread and a logo nobody could remember. We rebuilt the brand around the best part of the day — that first warm loaf — with a wordmark that leans forward, a cast of noodle-limbed characters, and a wheat-paste campaign that took over every blank wall on the bus route.",
    results: [
      { value: "3.2×", label: "foot traffic in the launch month" },
      { value: "41", label: "walls pasted across the city" },
      { value: "12k", label: "loaves sold in week one" },
    ],
  },
  {
    title: "Money, But Friendly",
    client: "Tandem",
    disciplines: ["Brand Design,", "Digital, OOH"],
    description: "A flexible design system for pitching a campaign for Tandem, a bill-splitting app for roommates.",
    art: "phone",
    year: "2025",
    role: "Art direction, product UI",
    overview:
      "Splitting rent shouldn't feel like doing taxes. We gave Tandem a warm purple, a type system that's comfortable saying “you owe $12.50” out loud, and an app UI where every number reads like a friendly nudge rather than an invoice.",
    results: [
      { value: "+64%", label: "trial-to-paid in the pitch test" },
      { value: "9", label: "markets launched off one kit" },
      { value: "4.8", label: "App Store rating after redesign" },
    ],
  },
  {
    title: "Small Wins, Big Leaves",
    client: "Sprout & Co.",
    disciplines: ["Packaging,", "Retail, Social"],
    description: "Packaging and in-store identity for a plant shop that thinks every windowsill deserves a jungle.",
    art: "packaging",
    year: "2025",
    role: "Packaging design",
    overview:
      "Each plant got a name, a personality and a pot to match. The system flexes from seed packets to tote bags with one rounded wordmark, a sprout mark and a palette pulled straight from the greenhouse.",
    results: [
      { value: "28", label: "SKUs in the first range" },
      { value: "2×", label: "average basket size" },
      { value: "0", label: "plastic in the packaging" },
    ],
  },
  {
    title: "Hoot Hoot Hooray",
    client: "Night Owls Jazz Fest",
    disciplines: ["Poster Series,", "Type, Print"],
    description: "Twelve wheat-paste posters for a three-night jazz festival held on the top floor of a parking garage.",
    art: "posters",
    year: "2024",
    role: "Design & typography",
    overview:
      "A festival for night owls needed posters that looked best at 2am under a sodium lamp. Loud flat colour, owl eyes everywhere, and a stacked type system that could be cut, rearranged and pasted by volunteers on the night.",
    results: [
      { value: "Sold", label: "out all three nights" },
      { value: "12", label: "posters in the series" },
      { value: "1", label: "very confused owl" },
    ],
  },
]

const D_PLAY: HelloPlay = {
  title: "Play",
  label: "Sticker sheet",
  tags: "Drag, drop, peel",
  description: "Everything here is drawn in code. Drag the stickers around, add more from the tray, or peel them all off and start again.",
}

const D_ABOUT: HelloAbout = {
  intro: "Designer, illustrator, occasional baker. Booking new projects from spring.",
  heading: "A little more about me.",
  paragraphs: [
    "I grew up drawing on the backs of my mom’s grocery receipts and never really stopped. Ten years in, I’ve made brands, campaigns, packaging and a few websites that wiggle — always for people trying to leave things better than they found them.",
    "I believe good design should feel like a friend who’s happy to see you. When I’m not designing, I’m probably baking something that didn’t need to be that complicated, or hunting for the best taco truck in the Blue Ridge.",
  ],
  services: ["Brand identity", "Campaigns & OOH", "Illustration", "Packaging", "Art direction", "Websites"],
  clients: ["Morning Loaf Co.", "Tandem", "Sprout & Co.", "Night Owls Jazz Fest", "Little Fox Books", "Good Dog Brewing"],
  recognition: ["Type Directors Club, 2025", "Communication Arts, 2024", "Brand New — Noted, 2024", "Adobe Design Achievement, 2019"],
  resume: { label: "Résumé", href: "#" },
}

const D_FOOTER: HelloFooter = {
  heading: "Let’s make something happy.",
  highlight: "happy",
  socials: [
    { label: "Instagram", href: "https://instagram.com" },
    { label: "Dribbble", href: "https://dribbble.com" },
    { label: "LinkedIn", href: "https://linkedin.com" },
  ],
  note: "Designed in Asheville with too much coffee.",
}

const PLAY_KINDS: PlayKind[] = ["sun", "loaf", "heart", "bolt", "hello", "star", "eye", "flower", "aplus", "wow"]
const PLAY_LABEL: Record<PlayKind, string> = {
  sun: "Smiling sun",
  loaf: "Happy loaf",
  heart: "XO heart",
  bolt: "Lightning bolt",
  hello: "Hello",
  star: "Star",
  eye: "Eyeball",
  flower: "Daisy",
  aplus: "A plus",
  wow: "Wow",
}
const D_PLACED: Placed[] = [
  { id: 1, kind: "sun", x: 0.14, y: 0.3, r: -8 },
  { id: 2, kind: "hello", x: 0.34, y: 0.66, r: 6 },
  { id: 3, kind: "heart", x: 0.52, y: 0.28, r: 12 },
  { id: 4, kind: "loaf", x: 0.7, y: 0.62, r: -14 },
  { id: 5, kind: "bolt", x: 0.86, y: 0.3, r: 16 },
  { id: 6, kind: "eye", x: 0.24, y: 0.78, r: 0 },
  { id: 7, kind: "flower", x: 0.92, y: 0.76, r: -6 },
]

/* ------------------------------------------------------------------ styles */

const SH_CSS = `
.sh-root{position:relative;isolation:isolate;width:100%;box-sizing:border-box;--sh-paper:var(--sh-paper-light,#e5eeec);--sh-ink:var(--sh-ink-light,#141414);--sh-soft:#3b403f;--sh-muted:#6a7371;--sh-line:rgba(20,20,20,.62);--sh-faint:rgba(20,20,20,.12);--sh-accent:var(--sh-accent-c,#ff5b47);--sh-serif:"Instrument Serif","Gloock","Bodoni Moda","Didot","Bodoni 72","Times New Roman",Times,serif;--sh-sans:"Inter Tight","Neue Haas Grotesk Text","Helvetica Neue",Helvetica,Arial,ui-sans-serif,system-ui,sans-serif;background:var(--sh-paper);color:var(--sh-ink);font-family:var(--sh-sans);-webkit-font-smoothing:antialiased;line-height:1.45;transition:background-color .45s ease,color .45s ease}
.sh-root[data-theme="dark"]{--sh-paper:#0f1413;--sh-ink:#e7eeec;--sh-soft:#c3ccc9;--sh-muted:#8a9491;--sh-line:rgba(231,238,236,.34);--sh-faint:rgba(231,238,236,.1)}
.sh-root :where(*){box-sizing:border-box}
.sh-root ::selection{background:#fff23a;color:#141414}
.sh-root :focus-visible{outline:2px solid var(--sh-accent);outline-offset:3px}
.sh-root :where(button){font:inherit;color:inherit;background:none;border:0;padding:0;margin:0;cursor:pointer;text-align:inherit;letter-spacing:inherit}
.sh-root :where(a){color:inherit;text-decoration:none}
.sh-root :where(svg){display:block;max-width:none;flex:none}
.sh-root :where(h1,h2,h3,p,ul,ol,li,dl,dt,dd,figure){margin:0;padding:0;font-size:inherit;font-weight:inherit;list-style:none}
.sh-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}

.sh-page{container-type:inline-size;width:100%}
.sh-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));column-gap:clamp(12px,1.6cqw,24px);padding:0 clamp(16px,2.6cqw,28px)}

.sh-nav{position:sticky;top:0;z-index:30;border-bottom:1px solid var(--sh-line);background:color-mix(in oklab,var(--sh-paper) 88%,transparent);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);font-size:12.5px;transition:background-color .45s,border-color .45s}
.sh-nav .sh-grid{height:44px;align-items:center}
.sh-brand{grid-column:1 / span 3;justify-self:start;white-space:nowrap;font-weight:500}
.sh-brand:hover .sh-brand-dot{transform:scale(1.4) rotate(90deg)}
.sh-brand-dot{display:inline-block;width:7px;height:7px;margin-right:8px;border-radius:2px;background:var(--sh-accent);transform-origin:center;transition:transform .4s cubic-bezier(.3,1.6,.5,1);vertical-align:1px}
.sh-link{position:relative;justify-self:start;padding:4px 0;color:var(--sh-ink);white-space:nowrap}
.sh-link::after{content:"";position:absolute;left:0;right:0;bottom:0;height:1px;background:currentColor;transform:scaleX(0);transform-origin:right;transition:transform .35s cubic-bezier(.2,.8,.2,1)}
.sh-link:hover::after,.sh-link[aria-current="true"]::after{transform:scaleX(1);transform-origin:left}
.sh-link[aria-current="true"]::before{content:"";position:absolute;left:-12px;top:50%;width:5px;height:5px;margin-top:-2.5px;border-radius:50%;background:var(--sh-accent)}

.sh-hero{position:relative;padding:clamp(56px,10cqw,148px) clamp(16px,2.6cqw,28px) clamp(36px,5cqw,64px);text-align:center;overflow:hidden}
.sh-title-wrap{position:relative;width:100%}
.sh-title-box{position:relative;margin:0 auto;line-height:1}
.sh-title{font-family:var(--sh-serif);font-weight:400;line-height:1.02;letter-spacing:-.025em;white-space:nowrap;color:var(--sh-ink)}
.sh-sq{display:block;width:max-content;position:relative;left:50%;transform:translateX(-50%) scaleX(var(--sh-squeeze,.84));transform-origin:50% 50%}
.sh-measure{position:absolute;left:0;top:0;visibility:hidden;white-space:nowrap;pointer-events:none;font-family:var(--sh-serif);font-weight:400;font-size:100px;letter-spacing:-.025em}
.sh-ch{display:inline-block;transition:transform .5s cubic-bezier(.3,1.7,.5,1),color .2s;animation:sh-up 1s cubic-bezier(.2,.8,.2,1) backwards;animation-delay:calc(var(--c,0) * 45ms + 120ms)}
.sh-ch:hover{transform:translateY(-.07em) rotate(-6deg)}
.sh-ch:nth-of-type(2n):hover{transform:translateY(-.05em) rotate(5deg)}
.sh-clip{display:block;clip-path:inset(-60% -15% 0 -15%);padding:.12em 0 .16em;margin:-.12em 0 -.16em}

.sh-hs{position:absolute;z-index:3;touch-action:none;user-select:none;-webkit-user-select:none;cursor:grab;font-family:var(--sh-sans);color:var(--sh-hs-i,#161616)}
.sh-hs:active{cursor:grabbing}
.sh-hs-in{position:relative;container-type:inline-size;display:grid;place-items:center;width:100%;height:100%;animation:sh-pop .7s cubic-bezier(.3,1.6,.5,1) backwards;animation-delay:calc(var(--i,0) * 160ms + 900ms);transition:transform .35s cubic-bezier(.3,1.6,.5,1),filter .3s;filter:drop-shadow(0 2px 0 rgba(0,0,0,.08)) drop-shadow(0 6px 10px rgba(0,0,0,.12))}
.sh-hs:hover .sh-hs-in{transform:rotate(-7deg) scale(1.07)}
.sh-hs[data-lift="true"] .sh-hs-in{transform:scale(1.14) rotate(4deg);filter:drop-shadow(0 18px 18px rgba(0,0,0,.25))}
.sh-hs-bg{position:absolute;left:0;top:0;right:0;bottom:0;background:var(--sh-hs-c,#fff23a)}
.sh-hs[data-shape="oval"] .sh-hs-bg,.sh-hs[data-shape="circle"] .sh-hs-bg{border-radius:50%}
.sh-hs[data-shape="pill"] .sh-hs-bg{border-radius:999px}
.sh-hs[data-shape="burst"] .sh-hs-bg{background:none}
.sh-burst{position:absolute;left:0;top:0;width:100%;height:100%;fill:var(--sh-hs-c,#fff23a);animation:sh-spin 26s linear infinite}
.sh-hs-t{position:relative;display:block;width:74%;font-size:10.8cqw;line-height:1.05;font-weight:500;letter-spacing:.01em;text-transform:uppercase;text-align:center;animation:sh-flip .45s cubic-bezier(.3,1.5,.5,1)}
.sh-hs[data-shape="pill"] .sh-hs-t{width:86%;font-size:7cqw}
.sh-hs[data-shape="oval"] .sh-hs-t{font-size:9cqw}

.sh-bio-wrap{position:relative;max-width:610px;margin:clamp(30px,3cqw,34px) auto 0}
.sh-bio{font-size:clamp(14.5px,1.42cqw,17px);line-height:1.42;color:var(--sh-ink);text-wrap:balance;animation:sh-rise .9s .55s cubic-bezier(.2,.8,.2,1) backwards}
.sh-studio{white-space:nowrap;background-image:linear-gradient(currentColor,currentColor);background-size:100% 1px;background-repeat:no-repeat;background-position:0 100%;padding-bottom:1px;transition:background-size .35s cubic-bezier(.2,.8,.2,1),color .2s}
.sh-studio:hover{background-size:0 1px;color:var(--sh-accent)}
.sh-loop{position:absolute;right:calc(100% - 30px);top:-22px;width:clamp(120px,15cqw,190px);height:auto;color:var(--sh-ink);pointer-events:none}
.sh-loop path{fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.sh-loop .sh-draw{stroke-dasharray:1;stroke-dashoffset:1;animation:sh-draw 1.6s 1.1s cubic-bezier(.6,.1,.3,1) forwards}
.sh-loop .sh-head{opacity:0;animation:sh-fade .3s 2.55s forwards}
@container (max-width:719px){.sh-loop{display:none}}

.sh-good{display:inline-flex;flex-direction:column;align-items:center;gap:10px;margin-top:clamp(48px,8cqw,104px);font-size:11px;letter-spacing:.06em;text-transform:uppercase;animation:sh-rise .9s .8s cubic-bezier(.2,.8,.2,1) backwards}
.sh-good svg{animation:sh-bob 1.8s ease-in-out infinite}
.sh-good:hover{color:var(--sh-accent)}

.sh-row{border-top:1px solid var(--sh-line);border-bottom:1px solid var(--sh-line);padding-top:12px;padding-bottom:12px;row-gap:10px;align-items:start;font-size:12.5px;line-height:1.35;transition:border-color .45s}
.sh-row-title{grid-column:1 / span 2;display:flex;align-items:baseline;gap:.35em;font-family:var(--sh-serif);font-weight:400;font-size:clamp(28px,3.4cqw,44px);line-height:1;letter-spacing:-.02em;margin-top:-2px}
.sh-row-title>span{display:inline-block;transform:scaleX(var(--sh-squeeze,.84));transform-origin:0 50%;white-space:nowrap}
.sh-row-title .sh-arr{flex:none;font-family:var(--sh-sans);font-weight:300;font-size:.62em;transform:translateY(-.08em);transition:transform .45s cubic-bezier(.3,1.6,.5,1)}
.sh-proj:hover .sh-arr,.sh-row:hover .sh-arr{transform:translate(.22em,-.08em)}
.sh-meta{grid-column:span 1;color:var(--sh-ink)}
.sh-meta dt{color:var(--sh-ink)}
.sh-meta dd{color:var(--sh-soft)}
.sh-row-desc{grid-column:5 / span 2;color:var(--sh-ink);max-width:46ch}
@container (max-width:859px){.sh-row-title{grid-column:1 / -1;margin-bottom:4px}.sh-meta{grid-column:span 2}.sh-row-desc{grid-column:span 2}}
@container (max-width:559px){.sh-meta{grid-column:span 3}.sh-row-desc{grid-column:1 / -1}.sh-brand{grid-column:1 / span 3}}

.sh-proj{scroll-margin-top:44px}
.sh-art{position:relative;display:block;width:100%;height:clamp(250px,47cqw,640px);overflow:hidden;cursor:none;background:#d9d4ca}
.sh-art:focus-visible{outline-offset:-4px}
.sh-art-in{position:absolute;left:0;right:0;top:-7%;bottom:-7%;transform:translate3d(0,calc(var(--sh-py,0) * 1px),0) scale(1.02);transition:transform .6s cubic-bezier(.2,.8,.2,1);will-change:transform}
.sh-art:hover .sh-art-in{transform:translate3d(0,calc(var(--sh-py,0) * 1px),0) scale(1.05)}
.sh-art-svg{position:absolute;left:0;top:0;width:100%;height:100%}
.sh-cursor{position:absolute;left:0;top:0;z-index:2;width:96px;height:96px;margin:-48px 0 0 -48px;display:grid;place-items:center;border-radius:50%;background:#fff23a;color:#141414;font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;text-align:center;line-height:1.1;pointer-events:none;opacity:0;scale:.4;transition:opacity .25s,scale .35s cubic-bezier(.3,1.6,.5,1);box-shadow:0 10px 24px -10px rgba(0,0,0,.4)}
.sh-art[data-cursor="true"] .sh-cursor{opacity:1;scale:1}
.sh-art-tag{position:absolute;left:14px;bottom:14px;z-index:2;padding:6px 10px;border-radius:999px;background:rgba(20,20,20,.72);color:#fff;font-size:11px;letter-spacing:.04em;text-transform:uppercase;opacity:0;transform:translateY(6px);transition:opacity .25s,transform .3s}
.sh-art:hover .sh-art-tag,.sh-art:focus-visible .sh-art-tag{opacity:1;transform:none}
@media (hover:none){.sh-art{cursor:pointer}.sh-art-tag{opacity:1;transform:none}}
.sh-img{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover}

.sh-section{scroll-margin-top:44px}
.sh-board{position:relative;height:clamp(380px,44cqw,560px);overflow:hidden;background-color:var(--sh-paper);background-image:radial-gradient(var(--sh-faint) 1.2px,transparent 1.3px);background-size:22px 22px;touch-action:none}
.sh-board-hint{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-family:var(--sh-serif);font-size:clamp(28px,4cqw,52px);color:var(--sh-muted);white-space:nowrap;pointer-events:none;animation:sh-rise .5s cubic-bezier(.2,.8,.2,1) both}
.sh-stk{position:absolute;width:clamp(68px,8.6cqw,108px);aspect-ratio:1;margin:0;touch-action:none;cursor:grab;user-select:none;-webkit-user-select:none;animation:sh-pop .5s cubic-bezier(.3,1.6,.5,1) backwards}
.sh-stk:active{cursor:grabbing}
.sh-stk-in{display:block;width:100%;height:100%;transition:transform .3s cubic-bezier(.3,1.6,.5,1),filter .3s;filter:drop-shadow(2.5px 0 0 #fff) drop-shadow(-2.5px 0 0 #fff) drop-shadow(0 2.5px 0 #fff) drop-shadow(0 -2.5px 0 #fff) drop-shadow(0 5px 7px rgba(0,0,0,.18))}
.sh-stk:hover .sh-stk-in{transform:scale(1.06) rotate(-4deg)}
.sh-stk[data-lift="true"] .sh-stk-in{transform:scale(1.16) rotate(6deg);filter:drop-shadow(2.5px 0 0 #fff) drop-shadow(-2.5px 0 0 #fff) drop-shadow(0 2.5px 0 #fff) drop-shadow(0 -2.5px 0 #fff) drop-shadow(0 22px 18px rgba(0,0,0,.28))}
.sh-stk[data-slap="true"] .sh-stk-in{animation:sh-slap .38s cubic-bezier(.3,1.6,.5,1)}
.sh-stk svg{width:100%;height:100%}
.sh-stk-txt{font-family:var(--sh-sans);font-weight:800;letter-spacing:-.01em}

.sh-tray{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:14px 24px;padding:14px clamp(16px,2.6cqw,28px);border-bottom:1px solid var(--sh-line)}
.sh-tray-set{display:flex;flex-wrap:wrap;gap:6px}
.sh-tray-btn{width:42px;height:42px;padding:5px;border-radius:12px;border:1px solid var(--sh-faint);transition:transform .3s cubic-bezier(.3,1.6,.5,1),border-color .2s,background-color .2s}
.sh-tray-btn:hover{transform:translateY(-3px) rotate(-6deg);border-color:var(--sh-line);background:color-mix(in oklab,var(--sh-paper),var(--sh-ink) 5%)}
.sh-tray-btn svg{width:100%;height:100%}
.sh-tray-side{display:flex;align-items:center;gap:16px;font-size:12.5px;color:var(--sh-soft)}
.sh-pill{display:inline-flex;align-items:center;gap:7px;padding:8px 13px;border:1px solid var(--sh-ink);border-radius:999px;font-size:12px;line-height:1;color:var(--sh-ink);transition:background-color .2s,color .2s,transform .25s cubic-bezier(.3,1.6,.5,1)}
.sh-pill:hover{background:var(--sh-ink);color:var(--sh-paper)}
.sh-pill:active{transform:scale(.96)}
.sh-pill:disabled{opacity:.4;cursor:default;background:none;color:var(--sh-ink)}
.sh-pill-solid{background:var(--sh-ink);color:var(--sh-paper)}
.sh-pill-solid:hover{background:var(--sh-accent);border-color:var(--sh-accent);color:#141414}

.sh-about{padding-top:clamp(28px,4cqw,56px);padding-bottom:clamp(28px,4cqw,56px);row-gap:28px}
.sh-portrait{grid-column:1 / span 2;position:relative;align-self:start;max-width:420px}
.sh-portrait svg{width:100%;height:auto}
.sh-portrait .sh-head-g{transform-box:fill-box;transform-origin:50% 90%;transition:transform .6s cubic-bezier(.3,1.6,.5,1)}
.sh-portrait:hover .sh-head-g{transform:rotate(-6deg)}
.sh-eye{transform-box:fill-box;transform-origin:center;animation:sh-blink 4.6s infinite}
.sh-me{position:absolute;right:-6%;top:6%;width:30%;aspect-ratio:1;display:grid;place-items:center;border-radius:50%;background:var(--sh-accent);color:#141414;font-size:clamp(9px,1cqw,12px);font-weight:600;line-height:1.05;text-transform:uppercase;text-align:center;transform:rotate(14deg);box-shadow:0 8px 16px -8px rgba(0,0,0,.35);transition:transform .45s cubic-bezier(.3,1.6,.5,1)}
.sh-portrait:hover .sh-me{transform:rotate(-8deg) scale(1.08)}
.sh-about-body{grid-column:3 / -1}
.sh-about-h{font-family:var(--sh-serif);font-size:clamp(34px,5cqw,68px);line-height:1;letter-spacing:-.02em;margin-bottom:22px}
.sh-about-h>span{display:inline-block;transform:scaleX(var(--sh-squeeze,.84));transform-origin:0 50%}
.sh-about-p{font-size:clamp(14.5px,1.35cqw,16.5px);line-height:1.55;color:var(--sh-soft);max-width:62ch;margin-bottom:14px}
.sh-lists{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin-top:28px;padding-top:18px;border-top:1px solid var(--sh-line)}
.sh-lists h3{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--sh-muted);margin-bottom:10px}
.sh-lists li{font-size:13.5px;line-height:1.75}
.sh-about-cta{display:flex;flex-wrap:wrap;gap:10px;margin-top:26px}
@container (max-width:859px){.sh-portrait{grid-column:1 / span 3}.sh-about-body{grid-column:1 / -1}}
@container (max-width:559px){.sh-portrait{grid-column:1 / span 5}.sh-lists{grid-template-columns:1fr 1fr}}

.sh-foot{border-top:1px solid var(--sh-line);padding-top:clamp(40px,7cqw,96px);padding-bottom:20px}
.sh-foot-h{grid-column:1 / -1;font-family:var(--sh-serif);font-size:clamp(44px,9.6cqw,148px);line-height:.96;letter-spacing:-.03em;text-align:center}
.sh-foot-h>span{display:inline-block;transform:scaleX(var(--sh-squeeze,.84));transform-origin:50% 50%}
.sh-hl{position:relative;display:inline-block}
.sh-hl svg{position:absolute;left:-4%;bottom:-.12em;width:108%;height:.32em;overflow:visible}
.sh-hl path{fill:none;stroke:var(--sh-accent);stroke-width:3.5;stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:1}
.sh-hl[data-on="true"] path{animation:sh-draw 1.1s .2s cubic-bezier(.6,.1,.3,1) forwards}
.sh-foot-cta{grid-column:1 / -1;display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:10px;margin-top:clamp(24px,3.4cqw,40px)}
.sh-email{font-size:clamp(15px,1.6cqw,19px);padding:11px 18px}
.sh-foot-row{grid-column:1 / -1;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px 24px;margin-top:clamp(40px,7cqw,88px);padding-top:14px;border-top:1px solid var(--sh-line);font-size:12px;color:var(--sh-soft)}
.sh-socials{display:flex;flex-wrap:wrap;gap:18px}
.sh-socials a{position:relative}
.sh-socials a:hover{color:var(--sh-ink)}
.sh-clock{display:inline-flex;align-items:center;gap:8px;font-variant-numeric:tabular-nums}
.sh-clock i{width:6px;height:6px;border-radius:50%;background:#3ccf6e;box-shadow:0 0 0 0 rgba(60,207,110,.6);animation:sh-ping 2.2s infinite}
.sh-tools{display:flex;align-items:center;gap:16px}
.sh-tool{display:inline-flex;align-items:center;gap:6px;color:var(--sh-soft);transition:color .2s}
.sh-tool:hover{color:var(--sh-ink)}
.sh-tool svg{transition:transform .5s cubic-bezier(.3,1.6,.5,1)}
.sh-root[data-theme="dark"] .sh-tool-theme svg{transform:rotate(180deg)}
.sh-tool-top:hover svg{transform:translateY(-3px)}

.sh-case{position:fixed;left:0;top:0;right:0;bottom:0;z-index:80;overflow-y:auto;overscroll-behavior:contain;background:var(--sh-paper);color:var(--sh-ink);animation:sh-sheet .55s cubic-bezier(.2,.8,.2,1) both}
.sh-case-in{container-type:inline-size;min-height:100%}
.sh-case-bar{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:12px;height:52px;padding:0 clamp(16px,2.6cqw,28px);border-bottom:1px solid var(--sh-line);background:color-mix(in oklab,var(--sh-paper) 90%,transparent);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);font-size:12.5px}
.sh-case-nav{display:flex;gap:8px}
.sh-case-head{padding:clamp(28px,6cqw,80px) clamp(16px,2.6cqw,28px) clamp(20px,3cqw,36px)}
.sh-case-kicker{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--sh-muted);margin-bottom:12px}
.sh-case-title{font-family:var(--sh-serif);font-size:clamp(46px,9cqw,132px);line-height:.95;letter-spacing:-.03em}
.sh-case-title>span{display:inline-block;transform:scaleX(var(--sh-squeeze,.84));transform-origin:0 50%}
.sh-case-meta{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-top:clamp(22px,3cqw,40px);padding:14px 0;border-top:1px solid var(--sh-line);border-bottom:1px solid var(--sh-line);font-size:12.5px}
.sh-case-meta dd{color:var(--sh-soft)}
.sh-case-over{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:16px;margin-top:clamp(20px,3cqw,36px)}
.sh-case-over p{grid-column:3 / -1;font-size:clamp(17px,2cqw,24px);line-height:1.4;letter-spacing:-.005em;text-wrap:pretty}
.sh-case-over h3{grid-column:1 / span 2;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--sh-muted);padding-top:6px}
.sh-case-hero{position:relative;height:clamp(260px,52cqw,720px);overflow:hidden}
.sh-case-crops{display:grid;grid-template-columns:1fr 1fr;gap:clamp(8px,1.2cqw,16px);padding:clamp(8px,1.2cqw,16px) clamp(16px,2.6cqw,28px) 0}
.sh-case-crop{position:relative;aspect-ratio:4 / 3;overflow:hidden;border-radius:6px}
.sh-case-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;padding:clamp(28px,5cqw,64px) clamp(16px,2.6cqw,28px)}
.sh-stat{border-top:1px solid var(--sh-line);padding-top:12px}
.sh-stat b{display:block;font-family:var(--sh-serif);font-weight:400;font-size:clamp(40px,6.4cqw,92px);line-height:1;letter-spacing:-.02em}
.sh-stat span{display:block;margin-top:8px;font-size:12.5px;color:var(--sh-soft)}
.sh-case-next{display:flex;align-items:center;justify-content:space-between;gap:16px;width:100%;padding:clamp(24px,4cqw,48px) clamp(16px,2.6cqw,28px);border-top:1px solid var(--sh-line);text-align:left}
.sh-case-next small{display:block;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--sh-muted);margin-bottom:6px}
.sh-case-next strong{font-family:var(--sh-serif);font-weight:400;font-size:clamp(34px,6cqw,84px);line-height:1;letter-spacing:-.02em;display:inline-block;transform:scaleX(var(--sh-squeeze,.84));transform-origin:0 50%}
.sh-case-next svg{transition:transform .45s cubic-bezier(.3,1.6,.5,1)}
.sh-case-next:hover svg{transform:translateX(10px)}
.sh-case-next:hover strong{color:var(--sh-accent)}
@container (max-width:719px){.sh-case-meta{grid-template-columns:1fr 1fr}.sh-case-over p,.sh-case-over h3{grid-column:1 / -1}.sh-case-stats{grid-template-columns:1fr}.sh-case-crops{grid-template-columns:1fr}}

.sh-toast{position:fixed;left:50%;bottom:24px;z-index:90;transform:translate(-50%,16px) rotate(-3deg);opacity:0;padding:12px 18px;border-radius:999px;background:#fff23a;color:#141414;font-size:13px;font-weight:600;pointer-events:none;box-shadow:0 12px 26px -12px rgba(0,0,0,.45);transition:opacity .25s,transform .4s cubic-bezier(.3,1.6,.5,1)}
.sh-toast[data-on="true"]{opacity:1;transform:translate(-50%,0) rotate(-3deg)}

@keyframes sh-up{from{transform:translateY(105%)}to{transform:none}}
@keyframes sh-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes sh-pop{0%{transform:scale(0) rotate(-40deg)}100%{transform:none}}
@keyframes sh-flip{from{opacity:0;transform:translateY(40%) rotate(-8deg)}to{opacity:1;transform:none}}
@keyframes sh-spin{to{transform:rotate(360deg)}}
@keyframes sh-draw{to{stroke-dashoffset:0}}
@keyframes sh-fade{to{opacity:1}}
@keyframes sh-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(5px)}}
@keyframes sh-slap{0%{transform:scale(1.16) rotate(6deg)}55%{transform:scale(.94) rotate(-2deg)}100%{transform:none}}
@keyframes sh-blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
@keyframes sh-ping{0%{box-shadow:0 0 0 0 rgba(60,207,110,.55)}80%,100%{box-shadow:0 0 0 7px rgba(60,207,110,0)}}
@keyframes sh-sheet{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.sh-ch,.sh-hs-in,.sh-hs-t,.sh-bio,.sh-good,.sh-good svg,.sh-burst,.sh-stk,.sh-stk-in,.sh-eye,.sh-clock i,.sh-case,.sh-board-hint{animation:none}.sh-loop .sh-draw,.sh-hl path{animation:none;stroke-dashoffset:0}.sh-loop .sh-head{animation:none;opacity:1}.sh-art-in{transform:none}.sh-root :where(*){transition-duration:.01ms}}
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

function useInView(ref: React.RefObject<Element | null>, threshold = 0.4): boolean {
  const [seen, setSeen] = React.useState(false)
  React.useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    if (typeof IntersectionObserver !== "function") {
      setSeen(true)
      return
    }
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && setSeen(true), { threshold })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, seen, threshold])
  return seen
}

/* ------------------------------------------------------------------ marks */

function ArrowDown() {
  return (
    <svg width="11" height="16" viewBox="0 0 11 16" fill="none" stroke="currentColor" strokeWidth="1.1" aria-hidden="true">
      <path d="M5.5 1v13.5M1 10l4.5 4.5L10 10" />
    </svg>
  )
}

function ArrowRight({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 30 18" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <path d="M1 9h27M20 1l8 8-8 8" />
    </svg>
  )
}

function ThemeMark() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 1.5a6.5 6.5 0 0 1 0 13z" fill="currentColor" />
    </svg>
  )
}

// The hand-drawn loop that swings down from the headline and points at the bio.
function Loop() {
  return (
    <svg className="sh-loop" viewBox="0 0 220 170" aria-hidden="true">
      <path
        className="sh-draw"
        pathLength={1}
        d="M34 4C10 40 4 92 34 122C60 148 104 150 116 126C126 104 100 92 88 110C74 132 100 160 140 158C168 156 190 146 206 132"
      />
      <path className="sh-head" d="M190 126L207 131L199 147" />
    </svg>
  )
}

/* -------------------------------------------------------------- artworks */

const ROUNDED = "'Arial Rounded MT Bold','Nunito','Varela Round','Helvetica Neue',Arial,sans-serif"
const HEAVY = "'Arial Black','Helvetica Neue',Helvetica,Arial,sans-serif"

function Wordmark({ x, y, s = 1, color = "#ef8a17" }: { x: number; y: number; s?: number; color?: string }) {
  return (
    <g transform={"translate(" + x + " " + y + ") rotate(-11) scale(" + s + ")"} fill={color} fontFamily={ROUNDED} fontWeight={900}>
      <text x="-112" y="-12" fontSize="64" letterSpacing="-2">
        morning
      </text>
      <text x="-104" y="80" fontSize="112" letterSpacing="-5">
        loaf
      </text>
      <circle cx="118" cy="10" r="26" fill="none" stroke={color} strokeWidth="6" />
      <text x="100" y="20" fontSize="28">
        co.
      </text>
    </g>
  )
}

function Cloud({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={"translate(" + x + " " + y + ") scale(" + s + ")"}>
      <g fill="#fff">
        <circle cx="-38" cy="6" r="26" />
        <circle cx="-8" cy="-14" r="32" />
        <circle cx="28" cy="-4" r="28" />
        <circle cx="48" cy="12" r="20" />
        <rect x="-62" y="6" width="128" height="26" rx="13" />
      </g>
      <circle cx="-2" cy="4" r="14" fill="#f39a1f" />
      <circle cx="-6" cy="0" r="4" fill="#ffd27a" />
    </g>
  )
}

// Wheat-pasted posters on a bakery wall, under a tree.
function ArtMural({ uid }: { uid: string }) {
  const scene = React.useMemo(() => {
    const rnd = mulberry32(11)
    const greens = ["#3f6f2b", "#4f8235", "#66994a", "#7fb05a", "#355f25"]
    const leaves = Array.from({ length: 90 }, () => ({
      x: 1120 + rnd() * 520,
      y: -30 + rnd() * 200 + Math.max(0, (rnd() - 0.6) * 140),
      r: 16 + rnd() * 34,
      c: greens[Math.floor(rnd() * greens.length)],
    }))
    const shade = Array.from({ length: 26 }, () => ({ x: 1080 + rnd() * 540, y: 170 + rnd() * 260, rx: 30 + rnd() * 70, ry: 14 + rnd() * 30, a: rnd() * 180 }))
    const gravel = Array.from({ length: 320 }, () => ({ x: rnd() * 1600, y: 612 + rnd() * 110, r: 0.8 + rnd() * 2.6, c: rnd() > 0.5 ? "#a9987a" : "#e2d6bd" }))
    const litter = Array.from({ length: 34 }, () => ({ x: rnd() * 1600, y: 618 + rnd() * 100, a: rnd() * 180, c: rnd() > 0.5 ? "#b8813f" : "#d6a75a" }))
    return { leaves, shade, gravel, litter }
  }, [])
  const P = 330
  const panelX = [-70, 260, 590, 920, 1250, 1580]
  return (
    <svg className="sh-art-svg" viewBox="0 0 1600 720" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={uid + "m-sky"} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fc6ec" />
          <stop offset="1" stopColor="#d7ebf4" />
        </linearGradient>
        <filter id={uid + "m-blur"} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="16" />
        </filter>
        <filter id={uid + "m-soft"}>
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      <rect width="1600" height="190" fill={"url(#" + uid + "m-sky)"} />
      {/* the building behind */}
      <rect x="150" y="18" width="600" height="160" fill="#ecebe5" />
      <rect x="150" y="18" width="600" height="14" fill="#d6d3cb" />
      <path d="M230 128c20-40 60-44 70-10s50 20 60-14 40-30 60 6" fill="none" stroke="#3aa06b" strokeWidth="12" strokeLinecap="round" />
      <text x="430" y="138" fontFamily={HEAVY} fontSize="46" fontStyle="italic" fill="#2b8a5a" transform="rotate(-6 430 138)">
        hey!
      </text>
      <circle cx="610" cy="110" r="26" fill="#f5a3c7" />
      <circle cx="610" cy="110" r="10" fill="#ecebe5" />
      {/* the tree */}
      {scene.leaves.map((l, i) => (
        <circle key={i} cx={l.x} cy={l.y} r={l.r} fill={l.c} />
      ))}
      {/* wall cap and wall */}
      <rect y="156" width="1600" height="24" fill="#9b968d" />
      <rect y="180" width="1600" height="8" fill="#6c675f" opacity=".55" />
      <rect y="188" width="1600" height="424" fill="#d8d4cb" />
      {/* panels */}
      <rect x={panelX[0]} y="204" width={P} height="392" fill="#f4f2ec" />
      <rect x={panelX[1]} y="204" width={P} height="392" fill="#f6c524" />
      <rect x={panelX[2]} y="204" width={P} height="392" fill="#8dcff0" />
      <rect x={panelX[3]} y="204" width={P} height="392" fill="#f4f2ec" />
      <rect x={panelX[4]} y="204" width={P} height="392" fill="#f6c524" />
      <rect x={panelX[5]} y="204" width={P} height="392" fill="#f4f2ec" />
      <Wordmark x={95} y={380} s={0.92} />
      {/* the noodle-limbed runner */}
      <g transform="translate(425 0)">
        <g opacity=".32" transform="translate(70 36) skewX(-28)" fill="none" stroke="#3a2c63" strokeWidth="24" strokeLinecap="round">
          <path d="M-40 300C-100 330-100 400-40 410C30 420 50 360 0 345C-50 330-60 420 0 450" />
          <path d="M0 450C20 480-20 505-40 525M0 450C50 470 70 500 55 528" strokeWidth="16" />
        </g>
        <g fill="none" strokeLinecap="butt">
          <path d="M-35 330C-70 305-95 292-105 262" stroke="#151515" strokeWidth="16" />
          <path d="M-35 330C-70 305-95 292-105 262" stroke="#fff" strokeWidth="16" strokeDasharray="8 8" />
          <path d="M-20 318C20 300 50 300 72 278" stroke="#151515" strokeWidth="16" />
          <path d="M-20 318C20 300 50 300 72 278" stroke="#fff" strokeWidth="16" strokeDasharray="8 8" />
          <path d="M0 450C20 480-20 505-40 525M0 450C50 470 70 500 55 528" stroke="#151515" strokeWidth="18" />
          <path d="M0 450C20 480-20 505-40 525M0 450C50 470 70 500 55 528" stroke="#fff" strokeWidth="18" strokeDasharray="9 9" />
          <path d="M-40 300C-100 330-100 400-40 410C30 420 50 360 0 345C-50 330-60 420 0 450" stroke="#151515" strokeWidth="26" />
          <path d="M-40 300C-100 330-100 400-40 410C30 420 50 360 0 345C-50 330-60 420 0 450" stroke="#fff" strokeWidth="26" strokeDasharray="12 12" />
        </g>
        <ellipse cx="-38" cy="270" rx="34" ry="30" fill="#f4f2ec" stroke="#151515" strokeWidth="3" />
        <path d="M-70 262h64" stroke="#151515" strokeWidth="8" />
        <path d="M-14 244l14-12 6 16z" fill="#e2322a" />
        <circle cx="-108" cy="256" r="13" fill="#e2322a" />
        <circle cx="76" cy="272" r="13" fill="#e2322a" />
        <path d="M-62 520h36c6 0 8 10 0 12h-40z" fill="#f4f2ec" stroke="#151515" strokeWidth="3" />
        <path d="M40 524h34c6 0 8 10 0 12h-38z" fill="#f4f2ec" stroke="#151515" strokeWidth="3" />
        <path d="M-56 520h18v-8h-16zM46 524h18v-8h-16z" fill="#e2322a" />
        <rect x="-90" y="540" width="190" height="11" rx="5.5" fill="#1b1b1b" />
        <circle cx="-60" cy="558" r="8" fill="#1b1b1b" />
        <circle cx="70" cy="558" r="8" fill="#1b1b1b" />
      </g>
      {/* clouds and the flying loaf */}
      <Cloud x={660} y={270} s={0.9} />
      <Cloud x={840} y={240} s={0.7} />
      <Cloud x={700} y={520} s={0.85} />
      <Cloud x={860} y={470} s={1} />
      <g transform="translate(756 390) rotate(-14)">
        <path d="M-90 -6c-30-4-56 10-70 26M-90 14c-24 2-44 14-52 28" stroke="#167f7a" strokeWidth="6" strokeLinecap="round" fill="none" />
        <path d="M-20 -30c-30-50-80-56-96-40 26 4 46 22 54 46z" fill="#fff" stroke="#151515" strokeWidth="3" />
        <path d="M-80 40V-6c0-42 30-60 50-50 14-24 54-24 68 0 20-10 50 8 50 50v46z" fill="#d9964b" stroke="#151515" strokeWidth="3.5" />
        <path d="M-66 40V0c0-28 20-42 36-34 12-18 44-18 56 0 16-8 36 6 36 34v40z" fill="#f6dfae" />
        <circle cx="-26" cy="8" r="7" fill="#151515" />
        <circle cx="22" cy="8" r="7" fill="#151515" />
        <circle cx="-24" cy="6" r="2.4" fill="#fff" />
        <circle cx="24" cy="6" r="2.4" fill="#fff" />
        <path d="M-12 22q10 12 22 0" stroke="#151515" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <path d="M10-20c30-56 84-60 100-42-28 4-52 22-62 48z" fill="#fff" stroke="#151515" strokeWidth="3" />
        <circle cx="-44" cy="20" r="6" fill="#ff8f8f" opacity=".7" />
        <circle cx="40" cy="20" r="6" fill="#ff8f8f" opacity=".7" />
      </g>
      <Wordmark x={1085} y={380} s={0.92} />
      {/* the giant slice */}
      <g transform="translate(1415 410)">
        <path d="M-130 140V-10c-24-108 80-150 130-92 50-58 154-16 130 92V140z" fill="#f6dfae" stroke="#b5651d" strokeWidth="20" strokeLinejoin="round" />
        <ellipse cx="-60" cy="40" rx="14" ry="9" fill="#e7c486" />
        <ellipse cx="50" cy="80" rx="18" ry="10" fill="#e7c486" />
        <ellipse cx="70" cy="-10" rx="10" ry="7" fill="#e7c486" />
        <ellipse cx="-30" cy="100" rx="9" ry="6" fill="#e7c486" />
        <circle cx="-34" cy="-10" r="10" fill="#151515" />
        <circle cx="34" cy="-10" r="10" fill="#151515" />
        <path d="M-30 26q30 30 60 0" stroke="#151515" strokeWidth="7" fill="none" strokeLinecap="round" />
      </g>
      <Wordmark x={1745} y={380} s={0.92} />
      {/* paste seams */}
      <g stroke="#000" strokeOpacity=".07" strokeWidth="2">
        {panelX.map((x) => (
          <path key={x} d={"M" + x + " 204v392"} />
        ))}
        <path d="M0 400h1600" />
      </g>
      {/* the tree's shadow on the wall */}
      <g fill="#203020" opacity=".2" filter={"url(#" + uid + "m-blur)"}>
        {scene.shade.map((s, i) => (
          <ellipse key={i} cx={s.x} cy={s.y} rx={s.rx} ry={s.ry} transform={"rotate(" + s.a + " " + s.x + " " + s.y + ")"} />
        ))}
      </g>
      {/* kerb and gravel */}
      <rect y="600" width="1600" height="120" fill="#cdbf9f" />
      <rect y="598" width="1600" height="14" fill="#958c7d" />
      <rect y="612" width="1600" height="10" fill="#000" opacity=".08" filter={"url(#" + uid + "m-soft)"} />
      {scene.gravel.map((g, i) => (
        <circle key={i} cx={g.x} cy={g.y} r={g.r} fill={g.c} />
      ))}
      {scene.litter.map((l, i) => (
        <ellipse key={i} cx={l.x} cy={l.y} rx="9" ry="3.5" fill={l.c} transform={"rotate(" + l.a + " " + l.x + " " + l.y + ")"} />
      ))}
    </svg>
  )
}

// A phone on a sunny wooden table, coffee and a card beside it.
function ArtPhone({ uid }: { uid: string }) {
  const grain = React.useMemo(() => {
    const rnd = mulberry32(5)
    return Array.from({ length: 46 }, (_, i) => {
      const y = i * 16 + rnd() * 8
      const a = (rnd() - 0.5) * 18
      const b = (rnd() - 0.5) * 18
      return { d: "M-20 " + y + "C400 " + (y + a) + " 900 " + (y + b) + " 1620 " + (y + a * 0.5), c: rnd() > 0.5 ? "#a96b35" : "#dba26a", w: 1 + rnd() * 3.5, o: 0.25 + rnd() * 0.45 }
    })
  }, [])
  const rows = [
    { t: "Rent · October", v: "$650.00", c: "#ffb547" },
    { t: "Groceries with Ana", v: "$38.20", c: "#5ad1a3" },
    { t: "Pizza night", v: "$12.50", c: "#ff7a9c" },
  ]
  return (
    <svg className="sh-art-svg" viewBox="0 0 1600 720" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={uid + "p-wood"} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#cf9152" />
          <stop offset="1" stopColor="#b9773d" />
        </linearGradient>
        <linearGradient id={uid + "p-screen"} x1="0" y1="0" x2=".4" y2="1">
          <stop offset="0" stopColor="#24186a" />
          <stop offset="1" stopColor="#6d4cf2" />
        </linearGradient>
        <linearGradient id={uid + "p-card"} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff7a59" />
          <stop offset="1" stopColor="#ffbe4d" />
        </linearGradient>
        <filter id={uid + "p-blur"} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="22" />
        </filter>
        <filter id={uid + "p-sh"} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <clipPath id={uid + "p-clip"}>
          <rect x="-152" y="-318" width="304" height="636" rx="44" />
        </clipPath>
      </defs>
      <rect width="1600" height="720" fill={"url(#" + uid + "p-wood)"} />
      {grain.map((g, i) => (
        <path key={i} d={g.d} stroke={g.c} strokeWidth={g.w} strokeOpacity={g.o} fill="none" />
      ))}
      <g stroke="#6e4220" strokeOpacity=".5" strokeWidth="3">
        <path d="M0 236h1600M0 486h1600" />
      </g>
      {/* coffee */}
      <g transform="translate(300 200)">
        <circle r="130" fill="#000" opacity=".2" filter={"url(#" + uid + "p-sh)"} transform="translate(18 22)" />
        <circle r="122" fill="#f5f2ea" />
        <circle r="104" fill="none" stroke="#e2ddd0" strokeWidth="3" />
        <rect x="70" y="-18" width="70" height="36" rx="18" fill="#fff" />
        <circle r="80" fill="#fff" />
        <circle r="64" fill="#5a3417" />
        <circle r="54" fill="#a8703f" opacity=".55" />
        <path d="M0 26C-40 0-30-34 0-18C30-34 40 0 0 26z" fill="#f6ead8" />
      </g>
      {/* card */}
      <g transform="translate(1300 520) rotate(18)">
        <rect x="-150" y="-95" width="300" height="190" rx="18" fill="#000" opacity=".25" filter={"url(#" + uid + "p-sh)"} transform="translate(14 18)" />
        <rect x="-150" y="-95" width="300" height="190" rx="18" fill={"url(#" + uid + "p-card)"} />
        <rect x="-118" y="-40" width="44" height="34" rx="6" fill="#ffe08a" />
        <text x="-118" y="-56" fontFamily={HEAVY} fontSize="20" fill="#fff" letterSpacing="2">
          TANDEM
        </text>
        <text x="-118" y="56" fontFamily="ui-monospace,Menlo,monospace" fontSize="17" fill="#fff" letterSpacing="3">
          •••• 2026
        </text>
        <circle cx="96" cy="50" r="20" fill="#fff" opacity=".7" />
        <circle cx="120" cy="50" r="20" fill="#fff" opacity=".4" />
      </g>
      {/* plant shadow and sun */}
      <g fill="#2a1a0c" opacity=".22" filter={"url(#" + uid + "p-blur)"}>
        <ellipse cx="1180" cy="120" rx="120" ry="40" transform="rotate(-24 1180 120)" />
        <ellipse cx="1330" cy="200" rx="140" ry="36" transform="rotate(18 1330 200)" />
        <ellipse cx="1480" cy="90" rx="110" ry="34" transform="rotate(-40 1480 90)" />
        <ellipse cx="1260" cy="300" rx="90" ry="30" transform="rotate(30 1260 300)" />
      </g>
      <path d="M380 -40L760 -40L320 760L-60 760Z" fill="#fff6d8" opacity=".16" filter={"url(#" + uid + "p-blur)"} />
      {/* phone */}
      <g transform="translate(800 380) rotate(-6)">
        <rect x="-166" y="-332" width="332" height="664" rx="58" fill="#000" opacity=".35" filter={"url(#" + uid + "p-sh)"} transform="translate(26 30)" />
        <rect x="-166" y="-332" width="332" height="664" rx="58" fill="#1a1a1c" />
        <rect x="-162" y="-328" width="324" height="656" rx="54" fill="none" stroke="#4a4a50" strokeWidth="2" />
        <g clipPath={"url(#" + uid + "p-clip)"}>
          <rect x="-152" y="-318" width="304" height="636" fill={"url(#" + uid + "p-screen)"} />
          <circle cx="120" cy="-220" r="160" fill="#a98bff" opacity=".22" />
          <text x="-122" y="-282" fontFamily="system-ui,sans-serif" fontSize="15" fontWeight="600" fill="#fff">
            9:41
          </text>
          <rect x="-50" y="-300" width="100" height="28" rx="14" fill="#0b0b0d" />
          <g fill="#fff">
            <rect x="92" y="-294" width="22" height="11" rx="3" opacity=".9" />
            <circle cx="78" cy="-288" r="4" opacity=".9" />
          </g>
          <text x="-122" y="-226" fontFamily="system-ui,sans-serif" fontSize="15" fill="#cfc6ff">
            Hi, Sam — your share this month
          </text>
          <text x="-124" y="-176" fontFamily="system-ui,sans-serif" fontSize="48" fontWeight="700" fill="#fff" letterSpacing="-1.5">
            $482.16
          </text>
          <path d="M-122 -110C-90 -130-70 -100-40 -112S10 -150 40 -128 90 -104 122 -146" stroke="#ffd36b" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <circle cx="122" cy="-146" r="6" fill="#ffd36b" />
          {["Send", "Request", "Split"].map((t, i) => (
            <g key={t} transform={"translate(" + (-122 + i * 84) + " -78)"}>
              <rect width="76" height="34" rx="17" fill={i === 2 ? "#ffd36b" : "#fff"} fillOpacity={i === 2 ? 1 : 0.16} />
              <text x="38" y="22" textAnchor="middle" fontFamily="system-ui,sans-serif" fontSize="13" fontWeight="600" fill={i === 2 ? "#24186a" : "#fff"}>
                {t}
              </text>
            </g>
          ))}
          {rows.map((r, i) => (
            <g key={r.t} transform={"translate(-122 " + (-20 + i * 78) + ")"}>
              <rect width="244" height="64" rx="16" fill="#fff" fillOpacity=".1" />
              <circle cx="32" cy="32" r="16" fill={r.c} />
              <text x="58" y="29" fontFamily="system-ui,sans-serif" fontSize="13" fontWeight="600" fill="#fff">
                {r.t}
              </text>
              <text x="58" y="47" fontFamily="system-ui,sans-serif" fontSize="11" fill="#cfc6ff">
                {i === 0 ? "Split 3 ways" : "Settled up"}
              </text>
              <text x="230" y="38" textAnchor="end" fontFamily="system-ui,sans-serif" fontSize="14" fontWeight="700" fill="#fff">
                {r.v}
              </text>
            </g>
          ))}
          <rect x="-152" y="250" width="304" height="68" fill="#120c3a" fillOpacity=".55" />
          {[0, 1, 2, 3].map((i) => (
            <circle key={i} cx={-90 + i * 60} cy="280" r={i === 0 ? 7 : 5} fill="#fff" opacity={i === 0 ? 1 : 0.45} />
          ))}
          <rect x="-50" y="302" width="100" height="5" rx="2.5" fill="#fff" opacity=".7" />
          <path d="M-152 -318L60 -318L-152 120Z" fill="#fff" opacity=".07" />
        </g>
      </g>
    </svg>
  )
}

function Leaf({ x, y, a, s = 1, c = "#3f8a4f" }: { x: number; y: number; a: number; s?: number; c?: string }) {
  return (
    <g transform={"translate(" + x + " " + y + ") rotate(" + a + ") scale(" + s + ")"}>
      <path d="M0 0C30-20 80-20 110 0C80 22 30 22 0 0z" fill={c} />
      <path d="M8 0H100" stroke="#fff" strokeOpacity=".35" strokeWidth="2.5" />
      <path d="M40 0l12-10M64 0l12-10M40 0l12 10M64 0l12 10" stroke="#fff" strokeOpacity=".25" strokeWidth="2" />
    </g>
  )
}

// A plant shop's range: a box, two potted plants and a tote.
function ArtPackaging({ uid }: { uid: string }) {
  return (
    <svg className="sh-art-svg" viewBox="0 0 1600 720" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <filter id={uid + "k-sh"} x="-30%" y="-60%" width="160%" height="220%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
        <linearGradient id={uid + "k-floor"} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9d8b8" />
          <stop offset="1" stopColor="#b6c9a2" />
        </linearGradient>
      </defs>
      <rect width="1600" height="720" fill="#dfe9d2" />
      <path d="M520 520V300a280 280 0 0 1 560 0v220z" fill="#f2b893" />
      <circle cx="1320" cy="160" r="54" fill="#ffd84a" />
      <rect y="520" width="1600" height="200" fill={"url(#" + uid + "k-floor)"} />
      <rect y="516" width="1600" height="8" fill="#000" opacity=".06" />
      {/* shadows */}
      <g fill="#1d2b14" opacity=".22" filter={"url(#" + uid + "k-sh)"}>
        <ellipse cx="400" cy="590" rx="140" ry="18" />
        <ellipse cx="720" cy="590" rx="120" ry="16" />
        <ellipse cx="985" cy="586" rx="90" ry="14" />
        <ellipse cx="1240" cy="594" rx="150" ry="18" />
      </g>
      {/* box */}
      <g transform="translate(400 0)">
        <path d="M-110 230L-60 200H140L90 230z" fill="#4f8d63" />
        <path d="M90 230L140 200V550L90 580z" fill="#204a2f" />
        <rect x="-110" y="230" width="200" height="350" fill="#2f6b45" />
        <circle cx="-10" cy="350" r="56" fill="#f5efe1" />
        <path d="M-10 384V346M-10 352c-6-24-30-30-40-22 6 16 26 22 40 22zM-10 346c6-24 30-30 40-22-6 16-26 22-40 22z" fill="#2f6b45" stroke="#2f6b45" strokeWidth="5" strokeLinecap="round" />
        <text x="-10" y="460" textAnchor="middle" fontFamily={ROUNDED} fontWeight={900} fontSize="34" fill="#f5efe1" letterSpacing="-1">
          sprout
        </text>
        <text x="-10" y="496" textAnchor="middle" fontFamily={ROUNDED} fontWeight={900} fontSize="22" fill="#f5efe1">
          &amp; co.
        </text>
        <text x="-10" y="550" textAnchor="middle" fontFamily="ui-monospace,Menlo,monospace" fontSize="12" fill="#a8cdb3" letterSpacing="3">
          SEED KIT · Nº 04
        </text>
        <g transform="translate(70 240) rotate(14)">
          <path d={burstPath(0, 0, 12, 46, 38)} fill="#ffd84a" />
          <text textAnchor="middle" y="7" fontFamily={HEAVY} fontSize="18" fill="#141414">
            NEW!
          </text>
        </g>
      </g>
      {/* monstera */}
      <g transform="translate(720 0)">
        <path d="M-6 430C-20 360-60 320-120 300M0 430C0 340 20 280 60 220M6 430C30 380 80 350 140 340M0 430C-10 360-10 300-30 240" stroke="#2f6b3a" strokeWidth="7" fill="none" strokeLinecap="round" />
        <Leaf x={-120} y={300} a={200} s={1.15} />
        <Leaf x={60} y={220} a={-60} s={1.2} c="#4b9a5a" />
        <Leaf x={140} y={340} a={-20} s={1.05} c="#5aa463" />
        <Leaf x={-30} y={240} a={-110} s={1.1} c="#3a7f48" />
        <Leaf x={-60} y={360} a={170} s={0.9} c="#5aa463" />
        <Leaf x={20} y={300} a={-40} s={1.25} c="#3f8a4f" />
        <Leaf x={-10} y={330} a={-150} s={1.2} c="#4b9a5a" />
        <Leaf x={40} y={380} a={10} s={0.95} c="#3a7f48" />
        <Leaf x={-40} y={290} a={-80} s={1.3} c="#5aa463" />
        <Leaf x={10} y={260} a={-95} s={1.05} c="#2f7a40" />
        <path d="M-96 430H96L76 580H-76z" fill="#d9774b" />
        <rect x="-104" y="414" width="208" height="34" rx="6" fill="#c4643a" />
        <rect x="-70" y="480" width="140" height="56" rx="28" fill="#f5e3cc" />
        <text x="0" y="516" textAnchor="middle" fontFamily={ROUNDED} fontWeight={900} fontSize="24" fill="#c4643a">
          Monty
        </text>
      </g>
      {/* cactus */}
      <g transform="translate(985 0)">
        <rect x="-26" y="300" width="52" height="170" rx="26" fill="#4f9a5d" />
        <path d="M-26 400h-24a18 18 0 0 1-18-18v-40" stroke="#4f9a5d" strokeWidth="26" fill="none" strokeLinecap="round" />
        <path d="M26 380h22a18 18 0 0 0 18-18v-28" stroke="#4f9a5d" strokeWidth="24" fill="none" strokeLinecap="round" />
        <g fill="#fff" opacity=".85">
          {[330, 360, 390, 420, 450].map((y) => (
            <React.Fragment key={y}>
              <circle cx="-10" cy={y} r="2.5" />
              <circle cx="10" cy={y + 14} r="2.5" />
            </React.Fragment>
          ))}
        </g>
        <g transform="translate(0 296)">
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="0" cy="-12" rx="7" ry="12" fill="#ff7fa8" transform={"rotate(" + a + ")"} />
          ))}
          <circle r="6" fill="#ffd84a" />
        </g>
        <path d="M-76 470H76L62 580H-62z" fill="#f1e3c8" />
        <rect x="-82" y="460" width="164" height="24" rx="5" fill="#e3d0ad" />
        <path d="M-40 520q10-14 20 0t20 0 20 0 20 0" stroke="#d9774b" strokeWidth="5" fill="none" strokeLinecap="round" />
        <text x="0" y="560" textAnchor="middle" fontFamily={ROUNDED} fontWeight={900} fontSize="18" fill="#b0874e">
          Spike
        </text>
      </g>
      {/* tote */}
      <g transform="translate(1240 0)">
        <path d="M-70 300c0-90 40-110 70-110s70 20 70 110" stroke="#ece3cf" strokeWidth="18" fill="none" />
        <path d="M-150 300H150L162 590H-162z" fill="#f5efe1" />
        <path d="M-150 300H150l2 30H-152z" fill="#000" opacity=".05" />
        <circle cx="0" cy="440" r="92" fill="#2f6b45" />
        <path d="M0 484V430M0 438c-10-34-44-42-58-30 8 22 38 30 58 30zM0 430c10-34 44-42 58-30-8 22-38 30-58 30z" fill="#f5efe1" stroke="#f5efe1" strokeWidth="6" strokeLinecap="round" />
        <text x="0" y="510" textAnchor="middle" fontFamily={ROUNDED} fontWeight={900} fontSize="17" fill="#f5efe1">
          sprout &amp; co.
        </text>
      </g>
      {/* seed packets on the floor */}
      <g transform="translate(560 640) rotate(-10)">
        <rect x="-50" y="-34" width="100" height="68" rx="6" fill="#ffd84a" />
        <circle cx="-20" cy="0" r="16" fill="#ff7a59" />
        <rect x="4" y="-12" width="34" height="6" rx="3" fill="#141414" opacity=".7" />
        <rect x="4" y="2" width="24" height="6" rx="3" fill="#141414" opacity=".4" />
      </g>
      <g transform="translate(1440 650) rotate(12)">
        <rect x="-50" y="-34" width="100" height="68" rx="6" fill="#ff9ec0" />
        <circle cx="-20" cy="0" r="16" fill="#2f6b45" />
        <rect x="4" y="-12" width="34" height="6" rx="3" fill="#141414" opacity=".7" />
        <rect x="4" y="2" width="24" height="6" rx="3" fill="#141414" opacity=".4" />
      </g>
    </svg>
  )
}

function OwlEyes({ x, y, s = 1, iris = "#ffd84a" }: { x: number; y: number; s?: number; iris?: string }) {
  return (
    <g transform={"translate(" + x + " " + y + ") scale(" + s + ")"}>
      <circle cx="-38" r="34" fill="#141414" />
      <circle cx="38" r="34" fill="#141414" />
      <circle cx="-38" r="18" fill={iris} />
      <circle cx="38" r="18" fill={iris} />
      <circle cx="-34" cy="-4" r="7" fill="#141414" />
      <circle cx="42" cy="-4" r="7" fill="#141414" />
      <path d="M-10 30L0 46 10 30z" fill="#ff8a1f" />
    </g>
  )
}

// A run of festival posters pasted on brick.
function ArtPosters({ uid }: { uid: string }) {
  const bricks = React.useMemo(() => {
    const rnd = mulberry32(3)
    const shades = ["#7e3f2d", "#8b4632", "#743a29", "#93503a", "#6c3526"]
    const out: { x: number; y: number; c: string }[] = []
    for (let r = 0; r < 20; r++) for (let c = -1; c < 15; c++) out.push({ x: c * 120 + (r % 2 ? 60 : 0), y: r * 38, c: shades[Math.floor(rnd() * shades.length)] })
    return out
  }, [])
  const W = 300
  const H = 420
  const xs = [140, 480, 820, 1160]
  return (
    <svg className="sh-art-svg" viewBox="0 0 1600 720" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id={uid + "o-light"} cx=".5" cy=".35" r=".75">
          <stop offset="0" stopColor="#ffcf8a" stopOpacity=".28" />
          <stop offset="1" stopColor="#000" stopOpacity=".5" />
        </radialGradient>
        <filter id={uid + "o-sh"} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>
      <rect width="1600" height="720" fill="#5a2c20" />
      {bricks.map((b, i) => (
        <rect key={i} x={b.x + 3} y={b.y + 3} width="114" height="32" rx="2" fill={b.c} />
      ))}
      <g filter={"url(#" + uid + "o-sh)"} fill="#000" opacity=".35">
        {xs.map((x) => (
          <rect key={x} x={x + 8} y={150 + 10} width={W} height={H} />
        ))}
      </g>
      {/* A: orange, giant eyes */}
      <g transform={"translate(" + xs[0] + " 150) rotate(-1.5 150 210)"}>
        <rect width={W} height={H} fill="#ff5a36" />
        <circle cx="150" cy="150" r="110" fill="#f6ead2" />
        <OwlEyes x={150} y={140} s={1.3} />
        <text x="24" y="330" fontFamily={HEAVY} fontSize="62" fill="#141414" letterSpacing="-3">
          NIGHT
        </text>
        <text x="24" y="390" fontFamily={HEAVY} fontSize="62" fill="#141414" letterSpacing="-3">
          OWLS
        </text>
        <text x="24" y="410" fontFamily="ui-monospace,Menlo,monospace" fontSize="11" fill="#141414" letterSpacing="2">
          JAZZ FEST · 3 NIGHTS
        </text>
      </g>
      {/* B: blue, stacked bars */}
      <g transform={"translate(" + xs[1] + " 150) rotate(1.2 150 210)"}>
        <rect width={W} height={H} fill="#2140c4" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x={30 + i * 10} y={40 + i * 34} width={240 - i * 20} height="22" rx="11" fill="#f6ead2" opacity={1 - i * 0.12} />
        ))}
        <text x="150" y="326" textAnchor="middle" fontFamily={HEAVY} fontSize="86" fill="#ffd84a" letterSpacing="-4">
          HOOT
        </text>
        <text x="150" y="380" textAnchor="middle" fontFamily={HEAVY} fontSize="26" fill="#f6ead2" letterSpacing="2">
          MAY 14–16
        </text>
      </g>
      {/* C: pink, sound waves */}
      <g transform={"translate(" + xs[2] + " 150) rotate(-0.8 150 210)"}>
        <rect width={W} height={H} fill="#f7c5d7" />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <path key={i} d={"M20 " + (50 + i * 26) + "q35-22 65 0t65 0 65 0 65 0"} stroke="#141414" strokeWidth="7" fill="none" strokeLinecap="round" />
        ))}
        <text x="22" y="320" fontFamily={HEAVY} fontSize="70" fill="#141414" letterSpacing="-3">
          HOO
        </text>
        <text x="22" y="392" fontFamily={HEAVY} fontSize="70" fill="#ff5a36" letterSpacing="-3">
          RAY!
        </text>
      </g>
      {/* D: cream, owl silhouette */}
      <g transform={"translate(" + xs[3] + " 150) rotate(1.8 150 210)"}>
        <rect width={W} height={H} fill="#f3ead6" />
        <path d="M70 330V150L100 90 130 140H170L200 90 230 150V330a80 80 0 0 1-160 0z" fill="#141414" />
        <OwlEyes x={150} y={190} s={0.95} iris="#ff5a36" />
        <path d="M110 300q40 30 80 0" stroke="#f3ead6" strokeWidth="6" fill="none" strokeLinecap="round" />
        <text x="150" y="398" textAnchor="middle" fontFamily="ui-monospace,Menlo,monospace" fontSize="15" fill="#141414" letterSpacing="3">
          LEVEL P2 · 9PM
        </text>
      </g>
      {/* tape */}
      <g fill="#fff8e0" opacity=".78">
        {xs.map((x, i) => (
          <React.Fragment key={x}>
            <rect x={x - 14} y="136" width="64" height="22" transform={"rotate(" + (i % 2 ? 14 : -18) + " " + x + " 146)"} />
            <rect x={x + W - 44} y="136" width="64" height="22" transform={"rotate(" + (i % 2 ? -12 : 20) + " " + (x + W) + " 146)"} />
          </React.Fragment>
        ))}
      </g>
      <rect width="1600" height="720" fill={"url(#" + uid + "o-light)"} />
      <rect y="640" width="1600" height="80" fill="#2a2522" />
      <rect y="636" width="1600" height="8" fill="#000" opacity=".35" />
    </svg>
  )
}

function ProjectArt({ project, uid, label }: { project: HelloProject; uid: string; label?: string }) {
  if (project.image)
    return (
      <img
        className="sh-img"
        src={project.image}
        alt={label ?? project.imageAlt ?? ""}
        width={1600}
        height={720}
        loading="lazy"
        decoding="async"
        style={{ maxWidth: "none" }}
      />
    )
  const kind = project.art ?? "mural"
  if (kind === "phone") return <ArtPhone uid={uid} />
  if (kind === "packaging") return <ArtPackaging uid={uid} />
  if (kind === "posters") return <ArtPosters uid={uid} />
  return <ArtMural uid={uid} />
}

/* --------------------------------------------------------------- stickers */

function PlayArt({ kind }: { kind: PlayKind }) {
  switch (kind) {
    case "sun":
      return (
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <path d={burstPath(50, 50, 12, 48, 38)} fill="#ffd23f" />
          <circle cx="38" cy="45" r="5" fill="#151515" />
          <circle cx="62" cy="45" r="5" fill="#151515" />
          <path d="M36 58q14 14 28 0" stroke="#151515" strokeWidth="5" fill="none" strokeLinecap="round" />
          <circle cx="30" cy="58" r="5" fill="#ff8f6b" opacity=".6" />
          <circle cx="70" cy="58" r="5" fill="#ff8f6b" opacity=".6" />
        </svg>
      )
    case "loaf":
      return (
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <path d="M14 86V44C8 18 36 6 50 22 64 6 92 18 86 44V86z" fill="#f6dfae" stroke="#c0712b" strokeWidth="8" strokeLinejoin="round" />
          <circle cx="40" cy="50" r="4.5" fill="#151515" />
          <circle cx="60" cy="50" r="4.5" fill="#151515" />
          <path d="M42 62q8 8 16 0" stroke="#151515" strokeWidth="4" fill="none" strokeLinecap="round" />
        </svg>
      )
    case "heart":
      return (
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <path d="M50 88C20 66 6 50 6 32 6 18 18 8 31 8c8 0 15 4 19 11 4-7 11-11 19-11 13 0 25 10 25 24 0 18-14 34-44 56z" fill="#ff4d5a" />
          <text className="sh-stk-txt" x="50" y="56" textAnchor="middle" fontSize="26" fill="#fff">
            xo
          </text>
        </svg>
      )
    case "bolt":
      return (
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <path d="M58 4L18 56h26L36 96 82 40H56z" fill="#4d7cff" />
          <path d="M58 4L18 56h26" stroke="#fff" strokeOpacity=".4" strokeWidth="3" fill="none" />
        </svg>
      )
    case "hello":
      return (
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <rect x="4" y="30" width="92" height="40" rx="20" fill="#ff8fc7" />
          <text className="sh-stk-txt" x="50" y="58" textAnchor="middle" fontSize="20" fill="#151515">
            HELLO!
          </text>
        </svg>
      )
    case "star":
      return (
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <path d={burstPath(50, 54, 5, 46, 20)} fill="#3fbf7f" />
          <path d="M80 10l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#ffd23f" />
        </svg>
      )
    case "eye":
      return (
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="44" fill="#fff" />
          <circle cx="50" cy="50" r="44" fill="none" stroke="#151515" strokeWidth="3" />
          <circle cx="54" cy="50" r="22" fill="#3aa0ff" />
          <circle cx="56" cy="50" r="11" fill="#151515" />
          <circle cx="62" cy="43" r="5" fill="#fff" />
        </svg>
      )
    case "flower":
      return (
        <svg viewBox="0 0 100 100" aria-hidden="true">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <ellipse key={a} cx="50" cy="24" rx="13" ry="22" fill="#fff" stroke="#e8e2d6" strokeWidth="1.5" transform={"rotate(" + a + " 50 50)"} />
          ))}
          <circle cx="50" cy="50" r="16" fill="#ffb000" />
        </svg>
      )
    case "aplus":
      return (
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="44" fill="#ff8a00" />
          <circle cx="50" cy="50" r="36" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="4 5" />
          <text className="sh-stk-txt" x="50" y="62" textAnchor="middle" fontSize="34" fill="#fff">
            A+
          </text>
        </svg>
      )
    case "wow":
      return (
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <path d={burstPath(50, 50, 14, 48, 36)} fill="#8b5cf6" />
          <text className="sh-stk-txt" x="50" y="59" textAnchor="middle" fontSize="24" fill="#fff" transform="rotate(-10 50 50)">
            WOW
          </text>
        </svg>
      )
  }
}

/* ------------------------------------------------------------------ parts */

// One of the headline's sticker puns. Click to swap the joke, drag to move it.
function HeroSticker({ s, index }: { s: HelloSticker; index: number }) {
  const lines = s.lines.length ? s.lines : [""]
  const shape = s.shape ?? "burst"
  const [line, setLine] = React.useState(0)
  const [off, setOff] = React.useState({ x: 0, y: 0 })
  const [lift, setLift] = React.useState(false)
  const drag = React.useRef({ on: false, sx: 0, sy: 0, ox: 0, oy: 0, moved: false })
  const size = s.size ?? 0.66
  const aspect = shape === "oval" ? 1.7 : shape === "pill" ? 2.6 : 1
  return (
    <button
      type="button"
      className="sh-hs"
      data-shape={shape}
      data-lift={lift ? "true" : undefined}
      aria-label={lines[line] + (lines.length > 1 ? ". Click for another." : "")}
      style={
        {
          left: (s.x ?? 50) + "%",
          top: (s.y ?? 50) + "%",
          width: "max(" + size + "em," + Math.round(62 * Math.sqrt(aspect)) + "px)",
          aspectRatio: String(aspect),
          transform: "translate(-50%,-50%) translate(" + off.x + "px," + off.y + "px) rotate(" + (s.rotate ?? 0) + "deg)",
          "--sh-hs-c": s.color ?? "#fff23a",
          "--sh-hs-i": s.ink ?? "#161616",
          "--i": index,
        } as React.CSSProperties
      }
      onPointerDown={(e) => {
        if (e.button !== 0) return
        drag.current = { on: true, sx: e.clientX, sy: e.clientY, ox: off.x, oy: off.y, moved: false }
        e.currentTarget.setPointerCapture?.(e.pointerId)
      }}
      onPointerMove={(e) => {
        const d = drag.current
        if (!d.on) return
        const dx = e.clientX - d.sx
        const dy = e.clientY - d.sy
        if (!d.moved && Math.hypot(dx, dy) < 4) return
        if (!d.moved) setLift(true)
        d.moved = true
        setOff({ x: d.ox + dx, y: d.oy + dy })
      }}
      onPointerUp={(e) => {
        drag.current.on = false
        setLift(false)
        e.currentTarget.releasePointerCapture?.(e.pointerId)
      }}
      onPointerCancel={() => {
        drag.current.on = false
        setLift(false)
      }}
      onClick={() => {
        if (drag.current.moved) {
          drag.current.moved = false
          return
        }
        setLine((i) => cycle(i, lines.length))
      }}
      onDoubleClick={() => setOff({ x: 0, y: 0 })}
    >
      <span className="sh-hs-in">
        <span className="sh-hs-bg" aria-hidden="true">
          {shape === "burst" ? (
            <svg className="sh-burst" viewBox="0 0 100 100">
              <path d={burstPath(50, 50, 15, 50, 42)} />
            </svg>
          ) : null}
        </span>
        <span key={line} className="sh-hs-t" aria-hidden="true">
          {lines[line]}
        </span>
      </span>
    </button>
  )
}

function Headline({ greeting, name, stickers, squeeze }: { greeting: string; name: string; stickers: HelloSticker[]; squeeze: number }) {
  const text = (greeting ? greeting + " " : "") + name
  const wrapRef = React.useRef(null as HTMLDivElement | null)
  const measureRef = React.useRef(null as HTMLSpanElement | null)
  const [fit, setFit] = React.useState(null as null | { size: number; width: number })

  useIsoLayoutEffect(() => {
    const wrap = wrapRef.current
    const m = measureRef.current
    if (!wrap || !m) return
    const run = () => {
      const w100 = m.getBoundingClientRect().width
      const size = fitFont(w100, wrap.clientWidth, squeeze, 32, 230)
      setFit({ size, width: Math.ceil((w100 / 100) * size * squeeze) })
    }
    run()
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(run) : null
    ro?.observe(wrap)
    let live = true
    document.fonts?.ready?.then(() => live && run())
    return () => {
      live = false
      ro?.disconnect()
    }
  }, [text, squeeze])

  let c = 0
  return (
    <div ref={wrapRef} className="sh-title-wrap">
      <span ref={measureRef} className="sh-measure" aria-hidden="true">
        {text}
      </span>
      <div className="sh-title-box" style={fit ? { width: fit.width, fontSize: fit.size } : { fontSize: "clamp(40px,12.5cqw,200px)" }}>
        <h1 className="sh-title" aria-label={text}>
          <span className="sh-clip" aria-hidden="true">
            <span className="sh-sq">
              {Array.from(text).map((ch, i) =>
                ch === " " ? (
                  <React.Fragment key={i}> </React.Fragment>
                ) : (
                  <span key={i} className="sh-ch" style={{ "--c": c++ } as React.CSSProperties}>
                    {ch}
                  </span>
                ),
              )}
            </span>
          </span>
        </h1>
        {stickers.map((s, i) => (
          <HeroSticker key={i} s={s} index={i} />
        ))}
      </div>
    </div>
  )
}

function Row({
  title,
  meta,
  description,
  as = "h2",
}: {
  title: string
  meta: [string, React.ReactNode][]
  description: React.ReactNode
  as?: "h2" | "h3"
}) {
  const H = as
  return (
    <div className="sh-row sh-grid">
      <H className="sh-row-title">
        <span className="sh-arr" aria-hidden="true">
          →
        </span>
        <span>{title}</span>
      </H>
      {meta.map(([k, v]) => (
        <dl key={k} className="sh-meta">
          <dt>{k}</dt>
          <dd>{v}</dd>
        </dl>
      ))}
      <p className="sh-row-desc">{description}</p>
    </div>
  )
}

function Lines({ items }: { items: string[] }) {
  return (
    <>
      {items.map((t, i) => (
        <React.Fragment key={i}>
          {i ? <br /> : null}
          {t}
        </React.Fragment>
      ))}
    </>
  )
}

// A full-bleed artwork that drifts with the scroll and opens its case study.
function ArtBand({
  project,
  uid,
  onOpen,
  setRef,
}: {
  project: HelloProject
  uid: string
  onOpen: () => void
  setRef: (el: HTMLButtonElement | null) => void
}) {
  const cursorRef = React.useRef(null as HTMLSpanElement | null)
  const [cursor, setCursor] = React.useState(false)
  const place = (e: React.PointerEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const el = cursorRef.current
    if (el) el.style.transform = "translate(" + (e.clientX - r.left) + "px," + (e.clientY - r.top) + "px)"
  }
  return (
    <button
      ref={setRef}
      type="button"
      className="sh-art"
      data-cursor={cursor ? "true" : undefined}
      aria-label={"Open the case study: " + project.title}
      onClick={onOpen}
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse") return
        place(e)
        setCursor(true)
      }}
      onPointerMove={(e) => e.pointerType === "mouse" && place(e)}
      onPointerLeave={() => setCursor(false)}
    >
      <span className="sh-art-in">
        <ProjectArt project={project} uid={uid} />
      </span>
      <span ref={cursorRef} className="sh-cursor" aria-hidden="true">
        View
        <br />
        case ↗
      </span>
      <span className="sh-art-tag" aria-hidden="true">
        Case study{project.year ? " · " + project.year : ""}
      </span>
    </button>
  )
}

function CaseStudy({
  project,
  index,
  total,
  next,
  uid,
  onClose,
  onStep,
}: {
  project: HelloProject
  index: number
  total: number
  next: HelloProject
  uid: string
  onClose: () => void
  onStep: (step: number) => void
}) {
  const closeRef = React.useRef(null as HTMLButtonElement | null)
  const sheetRef = React.useRef(null as HTMLDivElement | null)
  React.useEffect(() => {
    closeRef.current?.focus({ preventScroll: true })
    sheetRef.current?.scrollTo?.({ top: 0 })
  }, [index])
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      else if (e.key === "ArrowRight") onStep(1)
      else if (e.key === "ArrowLeft") onStep(-1)
    }
    addEventListener("keydown", onKey)
    return () => removeEventListener("keydown", onKey)
  }, [onClose, onStep])

  const meta: [string, string][] = [
    ["Client", project.client],
    ["Discipline", project.disciplines.join(" ").replace(/,\s*$/, "")],
    ["Year", project.year ?? "—"],
    ["Role", project.role ?? "—"],
  ]
  const custom = !!project.image
  return (
    <div ref={sheetRef} className="sh-case" role="dialog" aria-modal="true" aria-label={project.title + " case study"}>
      <div className="sh-case-in">
        <div className="sh-case-bar">
          <button ref={closeRef} type="button" className="sh-pill" onClick={onClose}>
            ← Back to work
          </button>
          <span aria-live="polite">
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
          <div className="sh-case-nav">
            <button type="button" className="sh-pill" onClick={() => onStep(-1)} aria-label="Previous project">
              ←
            </button>
            <button type="button" className="sh-pill" onClick={() => onStep(1)} aria-label="Next project">
              →
            </button>
          </div>
        </div>
        <header className="sh-case-head">
          <p className="sh-case-kicker">Case study · {project.client}</p>
          <h2 className="sh-case-title">
            <span>{project.title}</span>
          </h2>
          <dl className="sh-case-meta">
            {meta.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <div className="sh-case-over">
            <h3>Overview</h3>
            <p>{project.overview ?? project.description}</p>
          </div>
        </header>
        <div className="sh-case-hero">
          <ProjectArt project={project} uid={uid + "c"} label={project.imageAlt ?? project.title} />
        </div>
        {custom ? null : (
          <div className="sh-case-crops">
            <div className="sh-case-crop">
              <CropArt project={project} uid={uid + "l"} side="left" />
            </div>
            <div className="sh-case-crop">
              <CropArt project={project} uid={uid + "r"} side="right" />
            </div>
          </div>
        )}
        {project.results?.length ? (
          <div className="sh-case-stats">
            {project.results.map((r) => (
              <div key={r.label} className="sh-stat">
                <b>{r.value}</b>
                <span>{r.label}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ height: 40 }} />
        )}
        {project.href ? (
          <div className="sh-grid" style={{ paddingBottom: 32 }}>
            <a className="sh-pill sh-pill-solid" href={project.href} target="_blank" rel="noreferrer" style={{ justifySelf: "start" }}>
              Visit the project ↗
            </a>
          </div>
        ) : null}
        <button type="button" className="sh-case-next" onClick={() => onStep(1)}>
          <span>
            <small>Next project</small>
            <strong>{next.title}</strong>
          </span>
          <ArrowRight size={44} />
        </button>
      </div>
    </div>
  )
}

// A detail shot: the same drawing, zoomed into its left or right third.
function CropArt({ project, uid, side }: { project: HelloProject; uid: string; side: "left" | "right" }) {
  return (
    <div style={{ position: "absolute", top: "-25%", width: "280%", height: "150%", left: side === "left" ? "-8%" : "-170%" }}>
      <ProjectArt project={project} uid={uid} />
    </div>
  )
}

function Portrait({ uid }: { uid: string }) {
  const curls = React.useMemo(() => {
    const out: { x: number; y: number; r: number }[] = []
    for (let k = 0; k <= 16; k++) {
      const a = Math.PI * (1.02 + (k / 16) * 0.96)
      out.push({ x: 200 + Math.cos(a) * 92, y: 228 + Math.sin(a) * 104, r: 30 })
    }
    for (let k = 0; k < 6; k++) out.push({ x: 140 + k * 24, y: 150 + (k % 2) * 10, r: 22 })
    return out
  }, [])
  return (
    <svg viewBox="0 0 400 480" role="img" aria-label="Illustrated portrait">
      <defs>
        <clipPath id={uid + "pt-shirt"}>
          <path d="M50 480C60 384 130 352 200 352S340 384 350 480z" />
        </clipPath>
      </defs>
      <path d="M0 480V200A200 190 0 0 1 400 200V480z" fill="#ffd84a" />
      <path d="M326 70l5 14 14 5-14 5-5 14-5-14-14-5 14-5zM62 128l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" fill="#141414" />
      <g clipPath={"url(#" + uid + "pt-shirt)"}>
        <rect x="40" y="340" width="320" height="150" fill="#2f6fe0" />
        {[372, 400, 428, 456].map((y) => (
          <rect key={y} x="40" y={y} width="320" height="10" fill="#f5efe1" />
        ))}
      </g>
      <g className="sh-head-g">
        <rect x="176" y="296" width="48" height="64" rx="16" fill="#d9a07a" />
        <ellipse cx="200" cy="214" rx="112" ry="112" fill="#3a2317" />
        <circle cx="122" cy="252" r="16" fill="#e2ad87" />
        <circle cx="278" cy="252" r="16" fill="#e2ad87" />
        <circle cx="120" cy="272" r="6" fill="#ff5b47" />
        <circle cx="280" cy="272" r="6" fill="#ff5b47" />
        <ellipse cx="200" cy="246" rx="78" ry="90" fill="#ebb994" />
        {curls.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={c.r} fill="#3a2317" />
        ))}
        <ellipse cx="166" cy="290" rx="14" ry="8" fill="#ff8f8f" opacity=".5" />
        <ellipse cx="234" cy="290" rx="14" ry="8" fill="#ff8f8f" opacity=".5" />
        <ellipse className="sh-eye" cx="170" cy="258" rx="5.5" ry="6.5" fill="#141414" />
        <ellipse className="sh-eye" cx="230" cy="258" rx="5.5" ry="6.5" fill="#141414" />
        <g fill="#fff" fillOpacity=".18" stroke="#141414" strokeWidth="5">
          <circle cx="170" cy="258" r="25" />
          <circle cx="230" cy="258" r="25" />
        </g>
        <path d="M195 256q5-6 10 0" stroke="#141414" strokeWidth="5" fill="none" />
        <path d="M178 304q22 20 44 0" stroke="#6b2e1f" strokeWidth="5" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  )
}

// The sticker sheet: drag stickers around, add from the tray, shuffle, peel.
function StickerBoard({ reduced }: { reduced: boolean }) {
  const boardRef = React.useRef(null as HTMLDivElement | null)
  const [items, setItems] = React.useState(D_PLACED)
  const [lifted, setLifted] = React.useState(-1)
  const [slap, setSlap] = React.useState(-1)
  const nextId = React.useRef(100)
  const rnd = React.useRef(mulberry32(2026))
  const drag = React.useRef({ id: -1, dx: 0, dy: 0 })

  const move = (id: number, x: number, y: number) =>
    setItems((arr) => arr.map((s) => (s.id === id ? { ...s, x: clamp(x, 0.04, 0.96), y: clamp(y, 0.06, 0.94) } : s)))
  const front = (id: number) =>
    setItems((arr) => {
      const it = arr.find((s) => s.id === id)
      return it ? [...arr.filter((s) => s.id !== id), it] : arr
    })
  const add = (kind: PlayKind) => {
    const p = placeSticker(rnd.current)
    setItems((arr) => [...arr, { id: nextId.current++, kind, ...p }])
  }
  const shuffle = () => setItems((arr) => arr.map((s) => ({ ...s, ...placeSticker(rnd.current) })))
  const peel = (id: number) => setItems((arr) => arr.filter((s) => s.id !== id))

  return (
    <>
      <div ref={boardRef} className="sh-board">
        {items.length === 0 ? <p className="sh-board-hint">A clean sheet. Go wild.</p> : null}
        {items.map((s) => (
          <button
            key={s.id}
            type="button"
            className="sh-stk"
            data-lift={lifted === s.id ? "true" : undefined}
            data-slap={slap === s.id ? "true" : undefined}
            aria-label={PLAY_LABEL[s.kind] + " sticker. Drag or use the arrow keys to move it, R to turn it, Delete to peel it off."}
            style={{ left: s.x * 100 + "%", top: s.y * 100 + "%", transform: "translate(-50%,-50%) rotate(" + s.r + "deg)" }}
            onPointerDown={(e) => {
              if (e.button !== 0) return
              const r = boardRef.current!.getBoundingClientRect()
              drag.current = { id: s.id, dx: e.clientX - (r.left + s.x * r.width), dy: e.clientY - (r.top + s.y * r.height) }
              front(s.id)
              setLifted(s.id)
              e.currentTarget.setPointerCapture?.(e.pointerId)
            }}
            onPointerMove={(e) => {
              if (drag.current.id !== s.id) return
              const r = boardRef.current!.getBoundingClientRect()
              move(s.id, (e.clientX - drag.current.dx - r.left) / r.width, (e.clientY - drag.current.dy - r.top) / r.height)
            }}
            onPointerUp={(e) => {
              if (drag.current.id !== s.id) return
              drag.current.id = -1
              setLifted(-1)
              if (!reduced) {
                setSlap(s.id)
                setTimeout(() => setSlap((v) => (v === s.id ? -1 : v)), 400)
              }
              e.currentTarget.releasePointerCapture?.(e.pointerId)
            }}
            onPointerCancel={() => {
              drag.current.id = -1
              setLifted(-1)
            }}
            onKeyDown={(e) => {
              const step = e.shiftKey ? 0.08 : 0.02
              if (e.key === "ArrowLeft") move(s.id, s.x - step, s.y)
              else if (e.key === "ArrowRight") move(s.id, s.x + step, s.y)
              else if (e.key === "ArrowUp") move(s.id, s.x, s.y - step)
              else if (e.key === "ArrowDown") move(s.id, s.x, s.y + step)
              else if (e.key === "r" || e.key === "R") setItems((arr) => arr.map((t) => (t.id === s.id ? { ...t, r: t.r + 15 } : t)))
              else if (e.key === "Delete" || e.key === "Backspace") peel(s.id)
              else return
              e.preventDefault()
            }}
          >
            <span className="sh-stk-in">
              <PlayArt kind={s.kind} />
            </span>
          </button>
        ))}
      </div>
      <div className="sh-tray">
        <div className="sh-tray-set" role="group" aria-label="Add a sticker">
          {PLAY_KINDS.map((k) => (
            <button key={k} type="button" className="sh-tray-btn" onClick={() => add(k)} aria-label={"Add a " + PLAY_LABEL[k] + " sticker"} title={PLAY_LABEL[k]}>
              <PlayArt kind={k} />
            </button>
          ))}
        </div>
        <div className="sh-tray-side">
          <span aria-live="polite">
            {items.length} {items.length === 1 ? "sticker" : "stickers"} stuck
          </span>
          <button type="button" className="sh-pill" onClick={shuffle} disabled={!items.length}>
            Shuffle
          </button>
          <button type="button" className="sh-pill" onClick={() => setItems([])} disabled={!items.length}>
            Peel all
          </button>
        </div>
      </div>
    </>
  )
}

/* -------------------------------------------------------------- template */

export default function StickerHelloPortfolio({
  name = "Juniper.",
  greeting = "Hi, I’m",
  fullName = "Juniper Vale",
  stickers = D_STICKERS,
  bio = "I’m an interdisciplinary designer based in Asheville, North Carolina. I enjoy designing things that make people smile for brands that do some good. Currently at",
  studio = { label: "Fig & Fable", href: "#" },
  ctaLabel = "The good stuff",
  nav,
  projects = D_PROJECTS,
  play,
  about,
  footer,
  email = "hello@junipervale.studio",
  location = "Asheville, NC",
  timeZone = "America/New_York",
  colors,
  fonts,
  squeeze = 0.84,
  defaultTheme = "system",
  onThemeChange,
  onProjectOpen,
  height = "100svh",
  className = "",
}: StickerHelloPortfolioProps) {
  const uid = React.useId().replace(/:/g, "")
  const reduced = useReducedMotion()
  const playCfg = play === false ? null : { ...D_PLAY, ...play }
  const aboutCfg = { ...D_ABOUT, ...about }
  const footCfg = { ...D_FOOTER, ...footer }
  const labels = { work: "Work", play: "Play", about: "About", ...nav }
  const sq = clamp(squeeze, 0.6, 1)

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

  /* sections: nav scrolls to them and marks the one in view */
  const topRef = React.useRef(null as HTMLDivElement | null)
  const workRef = React.useRef(null as HTMLElement | null)
  const playRef = React.useRef(null as HTMLElement | null)
  const aboutRef = React.useRef(null as HTMLElement | null)
  const footRef = React.useRef(null as HTMLElement | null)
  const [active, setActive] = React.useState("")
  React.useEffect(() => {
    if (typeof IntersectionObserver !== "function") return
    const els = [workRef.current, playRef.current, aboutRef.current, footRef.current].filter(Boolean) as HTMLElement[]
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) if (e.isIntersecting) setActive((e.target as HTMLElement).dataset.section ?? "")
      },
      { rootMargin: "-45% 0px -50% 0px" },
    )
    els.forEach((el) => io.observe(el))
    const onTop = new IntersectionObserver((es) => es[0]?.isIntersecting && setActive(""), { rootMargin: "0px 0px -60% 0px" })
    if (topRef.current) onTop.observe(topRef.current)
    return () => {
      io.disconnect()
      onTop.disconnect()
    }
  }, [playCfg === null])
  const go = (el: HTMLElement | null) => el?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" })

  /* parallax: every artwork band drifts against the scroll */
  const bands = React.useRef([] as (HTMLButtonElement | null)[])
  React.useEffect(() => {
    if (reduced) return
    let raf = 0
    const run = () => {
      raf = 0
      const vh = innerHeight
      for (const el of bands.current) {
        if (!el) continue
        const r = el.getBoundingClientRect()
        if (r.bottom < -100 || r.top > vh + 100) continue
        el.style.setProperty("--sh-py", (parallax(r.top, r.height, vh) * -r.height * 0.06).toFixed(1))
      }
    }
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(run)
    }
    run()
    addEventListener("scroll", queue, { capture: true, passive: true })
    addEventListener("resize", queue)
    return () => {
      cancelAnimationFrame(raf)
      removeEventListener("scroll", queue, { capture: true })
      removeEventListener("resize", queue)
    }
  }, [reduced, projects.length])

  /* case study */
  const [open, setOpen] = React.useState(-1)
  const lastFocus = React.useRef(null as HTMLElement | null)
  const openCase = (i: number) => {
    lastFocus.current = document.activeElement as HTMLElement | null
    setOpen(i)
    onProjectOpen?.(projects[i], i)
  }
  const closeCase = React.useCallback(() => {
    setOpen(-1)
    requestAnimationFrame(() => lastFocus.current?.focus?.({ preventScroll: true }))
  }, [])
  const stepCase = React.useCallback(
    (step: number) =>
      setOpen((i) => {
        if (i < 0) return i
        const n = cycle(i, projects.length, step)
        onProjectOpen?.(projects[n], n)
        return n
      }),
    [projects, onProjectOpen],
  )

  /* toast + email */
  const [toast, setToast] = React.useState("")
  const toastTimer = React.useRef(0)
  const say = (msg: string) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(""), 2200)
  }
  React.useEffect(() => () => clearTimeout(toastTimer.current), [])
  const copyEmail = () => {
    const done = () => say("Copied! Talk soon ✶")
    try {
      const p = navigator.clipboard?.writeText(email)
      if (p) p.then(done, () => say(email))
      else say(email)
    } catch {
      say(email)
    }
  }

  /* clock */
  const [clock, setClock] = React.useState("")
  React.useEffect(() => {
    const tick = () => setClock(formatClock(new Date(), timeZone))
    tick()
    const t = setInterval(tick, 15000)
    return () => clearInterval(t)
  }, [timeZone])

  const footSeen = useInView(footRef, 0.3)
  const [hlA, hlWord, hlB] = splitHighlight(footCfg.heading, footCfg.highlight)

  const style = {
    minHeight: height,
    "--sh-squeeze": sq,
    ...(colors?.paper ? { "--sh-paper-light": colors.paper } : null),
    ...(colors?.ink ? { "--sh-ink-light": colors.ink } : null),
    ...(colors?.accent ? { "--sh-accent-c": colors.accent } : null),
    ...(fonts?.display ? { "--sh-serif": fonts.display } : null),
    ...(fonts?.body ? { "--sh-sans": fonts.body } : null),
  } as React.CSSProperties

  return (
    <div className={"sh-root " + className} data-theme={theme} style={style}>
      <style>{SH_CSS}</style>
      <div className="sh-page">
        <nav className="sh-nav" aria-label="Primary">
          <div className="sh-grid">
            <button type="button" className="sh-brand" onClick={() => go(topRef.current)}>
              <span className="sh-brand-dot" aria-hidden="true" />
              {fullName}
            </button>
            <button type="button" className="sh-link" aria-current={active === "work" ? "true" : undefined} onClick={() => go(workRef.current)}>
              {labels.work}
            </button>
            {playCfg ? (
              <button type="button" className="sh-link" aria-current={active === "play" ? "true" : undefined} onClick={() => go(playRef.current)}>
                {labels.play}
              </button>
            ) : (
              <span />
            )}
            <button type="button" className="sh-link" aria-current={active === "about" ? "true" : undefined} onClick={() => go(aboutRef.current)}>
              {labels.about}
            </button>
          </div>
        </nav>

        <div ref={topRef} className="sh-hero">
          <Headline greeting={greeting} name={name} stickers={stickers} squeeze={sq} />
          <div className="sh-bio-wrap">
            <Loop />
            <p className="sh-bio">
              {bio}
              {studio ? (
                <>
                  {" "}
                  <a className="sh-studio" href={studio.href} target={studio.href.startsWith("#") ? undefined : "_blank"} rel="noreferrer">
                    {studio.label}
                  </a>
                  .
                </>
              ) : null}
            </p>
          </div>
          <button type="button" className="sh-good" onClick={() => go(workRef.current)}>
            {ctaLabel}
            <ArrowDown />
          </button>
        </div>

        <section ref={workRef} className="sh-section" data-section="work" aria-label={labels.work}>
          {projects.map((p, i) => (
            <article key={p.title + i} className="sh-proj">
              <Row
                title={p.title}
                meta={[
                  ["Client:", p.client],
                  ["", <Lines key="d" items={p.disciplines} />],
                ]}
                description={p.description}
              />
              <ArtBand project={p} uid={uid + "w" + i} onOpen={() => openCase(i)} setRef={(el) => (bands.current[i] = el)} />
            </article>
          ))}
        </section>

        {playCfg ? (
          <section ref={playRef} className="sh-section" data-section="play" aria-label={labels.play}>
            <Row title={playCfg.title} meta={[["Project:", playCfg.label], ["", playCfg.tags]]} description={playCfg.description} />
            <StickerBoard reduced={reduced} />
          </section>
        ) : null}

        <section ref={aboutRef} className="sh-section" data-section="about" aria-label={labels.about}>
          <Row title={labels.about} meta={[["Based in:", location], ["Say hi:", email]]} description={aboutCfg.intro} />
          <div className="sh-about sh-grid">
            <div className="sh-portrait">
              <Portrait uid={uid} />
              <span className="sh-me" aria-hidden="true">
                That’s
                <br />
                me!
              </span>
            </div>
            <div className="sh-about-body">
              <h3 className="sh-about-h">
                <span>{aboutCfg.heading}</span>
              </h3>
              {aboutCfg.paragraphs.map((t, i) => (
                <p key={i} className="sh-about-p">
                  {t}
                </p>
              ))}
              <div className="sh-lists">
                {(
                  [
                    ["Services", aboutCfg.services],
                    ["Select clients", aboutCfg.clients],
                    ["Recognition", aboutCfg.recognition],
                  ] as [string, string[]][]
                ).map(([h, list]) => (
                  <div key={h}>
                    <h3>{h}</h3>
                    <ul>
                      {list.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="sh-about-cta">
                <a className="sh-pill sh-pill-solid" href={mailtoHref(email, "Hello from your site")}>
                  Start a project <ArrowRight size={16} />
                </a>
                {aboutCfg.resume ? (
                  <a className="sh-pill" href={aboutCfg.resume.href} target={aboutCfg.resume.href.startsWith("#") ? undefined : "_blank"} rel="noreferrer">
                    {aboutCfg.resume.label} ↗
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <footer ref={footRef} className="sh-foot sh-grid" data-section="about">
          <h2 className="sh-foot-h">
            <span>
              {hlA}
              {hlWord ? (
                <span className="sh-hl" data-on={footSeen ? "true" : undefined}>
                  {hlWord}
                  <svg viewBox="0 0 200 20" preserveAspectRatio="none" aria-hidden="true">
                    <path pathLength={1} d="M3 13C40 5 80 4 120 8S180 15 197 7" />
                  </svg>
                </span>
              ) : null}
              {hlB}
            </span>
          </h2>
          <div className="sh-foot-cta">
            <button type="button" className="sh-pill sh-pill-solid sh-email" onClick={copyEmail} aria-label={"Copy " + email}>
              {email}
            </button>
            <a className="sh-pill sh-email" href={mailtoHref(email, "Hello from your site")}>
              Say hello <ArrowRight size={18} />
            </a>
          </div>
          <div className="sh-foot-row">
            <ul className="sh-socials">
              {footCfg.socials.map((s) => (
                <li key={s.label}>
                  <a className="sh-link" href={s.href} target="_blank" rel="noreferrer">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
            <span className="sh-clock">
              <i aria-hidden="true" />
              {location} · {clock || "--:--"}
            </span>
            <div className="sh-tools">
              <button type="button" className="sh-tool sh-tool-theme" onClick={toggleTheme} aria-label={"Switch to " + (theme === "dark" ? "light" : "dark") + " theme"}>
                <ThemeMark />
                {theme === "dark" ? "Dark" : "Light"}
              </button>
              <button type="button" className="sh-tool sh-tool-top" onClick={() => go(topRef.current)}>
                <svg width="10" height="13" viewBox="0 0 11 16" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
                  <path d="M5.5 15V1.5M1 6l4.5-4.5L10 6" />
                </svg>
                Back to top
              </button>
            </div>
          </div>
          <p className="sh-foot-row" style={{ borderTop: 0, marginTop: 4, paddingTop: 0 }}>
            <span>
              © {new Date().getFullYear()} {fullName}
            </span>
            <span>{footCfg.note}</span>
          </p>
        </footer>
      </div>

      {open >= 0 && projects[open] ? (
        <CaseStudy
          project={projects[open]}
          index={open}
          total={projects.length}
          next={projects[cycle(open, projects.length)]}
          uid={uid + "case" + open}
          onClose={closeCase}
          onStep={stepCase}
        />
      ) : null}
      <div className="sh-toast" data-on={toast ? "true" : undefined} role="status" aria-live="polite">
        {toast}
      </div>
    </div>
  )
}
