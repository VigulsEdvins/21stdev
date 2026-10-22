"use client"

import * as React from "react"

/*
 * Seam History Timeline: the "Our story" section of an about page. Wide photo
 * milestones run off the right edge of the section, each one a photo over a
 * sentence or two, and neighbouring milestones meet on a slanted seam: real
 * clip-path parallelograms that share one angle, so the field colour shows
 * through as a thin slanted gutter.
 *
 * The milestone in focus is in full colour. The ones around it are washed
 * into a haze of the field colour, so the strip reads as "now" and "not yet".
 * Above the strip, a year rail works as the timeline's axis and its
 * navigation: a dark liquid pill sits on the current year and flows to the
 * next one when you move (the leading end runs ahead, the trailing end
 * follows, and a neck pinches between them through an SVG goo filter). A
 * milestone that spans two years rests as two fused pills.
 *
 * Drag with momentum, horizontal wheel or trackpad, arrow keys, Home / End,
 * the buttons, or a year on the rail. A live region announces each milestone.
 * Presets (harbour, moss, graphite, signal) each have a designed dark version
 * and follow a `.dark` ancestor. Reduced motion jumps instead of flowing.
 */

export type SeamPreset = "harbour" | "moss" | "graphite" | "signal"

export type SeamPalette = {
  /** Section background, showing through the seams. */
  field: string
  /** Heading and rail years on the field. */
  onField: string
  /** Intro text and quiet rail years on the field. */
  mutedOnField: string
  /** The milestone card under the photo. */
  card: string
  /** Milestone titles. */
  ink: string
  /** Milestone body text. */
  muted: string
  /** Year pills, the liquid indicator and the buttons. */
  pill: string
  /** Text on the pills. */
  onPill: string
  /** The haze laid over milestones that are not in focus. */
  wash: string
}

export type Milestone = {
  /** 2019, [2021, 2022], "2021-2022" or a word such as "Today". */
  years: number | string | number[]
  title: string
  /** A sentence or two. Any node. */
  body?: React.ReactNode
  /** Photo URL. Without one (or if it fails to load) the years are set large on a plate. */
  image?: string
  /** Describe the photo. Empty string marks it decorative. */
  alt?: string
  /** CSS object-position for the photo, e.g. "50% 30%", to keep its subject in the crop. */
  imagePosition?: string
  /** Optional link under the text, e.g. a case study. */
  href?: string
  linkLabel?: string
}

export type SeamHistoryTimelineProps = {
  milestones?: Milestone[]
  /** Small label above the heading. Pass "" to drop it. */
  eyebrow?: string
  heading?: string
  /** One or two sentences beside the controls. */
  intro?: React.ReactNode
  preset?: SeamPreset
  /** Override any colour of the preset's light palette. */
  palette?: SeamPaletteInput
  /** Override any colour of the preset's dark palette. */
  darkPalette?: SeamPaletteInput
  /** "auto" follows a `.dark` class on any ancestor (shadcn / Tailwind convention). */
  theme?: "auto" | "light" | "dark"
  /** Lean of the seams in degrees, 0 to 24. Phones use a little over half of it. */
  seamAngle?: number
  /** Strength of the haze over milestones not in focus, 0 to 1. */
  wash?: number
  /** Milestone in focus on first render. */
  startIndex?: number
  /** Controlled focus. Pair with `onChange`. */
  index?: number
  onChange?: (index: number) => void
  /** Any CSS length. The section sizes to its content by default. */
  minHeight?: string
  displayFont?: string
  /** The small label over the heading. A serif by default, as a quiet second voice. */
  labelFont?: string
  textFont?: string
  /** Accessible names for the buttons and the region. */
  labels?: { previous?: string; next?: string; rail?: string }
  className?: string
}

// #region logic
export const PRESETS = {
  harbour: {
    light: { field: "#a9bdd2", onField: "#0d1620", mutedOnField: "#2a3947", card: "#f8fafc", ink: "#0f1923", muted: "#4d5b69", pill: "#0d1620", onPill: "#f3f6f9", wash: "#e6edf4" },
    dark: { field: "#0f1b27", onField: "#e8eef4", mutedOnField: "#97a9bb", card: "#172534", ink: "#edf2f7", muted: "#a5b5c5", pill: "#e8eef4", onPill: "#0c131b", wash: "#0f1b27" },
  },
  moss: {
    light: { field: "#3d5030", onField: "#f3f5ec", mutedOnField: "#c6d0b6", card: "#f8f9f3", ink: "#151b0f", muted: "#525c46", pill: "#151b0f", onPill: "#f3f5ec", wash: "#dde4d0" },
    dark: { field: "#131910", onField: "#ecf0e4", mutedOnField: "#a5af96", card: "#1d2519", ink: "#eef2e6", muted: "#abb59d", pill: "#ecf0e4", onPill: "#131910", wash: "#131910" },
  },
  graphite: {
    light: { field: "#e4e5e7", onField: "#141619", mutedOnField: "#4c5259", card: "#ffffff", ink: "#141619", muted: "#50565d", pill: "#141619", onPill: "#f4f5f6", wash: "#eceef0" },
    dark: { field: "#111315", onField: "#eceef0", mutedOnField: "#9aa1a8", card: "#1c1f23", ink: "#eceef0", muted: "#a7adb4", pill: "#eceef0", onPill: "#111315", wash: "#111315" },
  },
  signal: {
    light: { field: "#e4572e", onField: "#1a0e09", mutedOnField: "#2c1209", card: "#fff8f4", ink: "#1a0e09", muted: "#5c4136", pill: "#1a0e09", onPill: "#fff8f4", wash: "#f6d2c2" },
    dark: { field: "#24100a", onField: "#ffeae0", mutedOnField: "#e2ab95", card: "#331811", ink: "#fff1ea", muted: "#e4b9a8", pill: "#ff7a50", onPill: "#1a0904", wash: "#24100a" },
  },
}

/** Years as 1 or 2 display strings: 2019, [2021, 2022], "2021-2022", "2021 to 2022", "Today". */
export function normalizeYears(y: number | string | number[]): string[] {
  if (Array.isArray(y)) return y.slice(0, 2).map((v) => String(v))
  if (typeof y === "number") return [String(y)]
  const s = String(y).trim()
  const m = s.match(/^(\S+)\s*(?:-|\u2013|\u2014|to|\/)\s*(\S+)$/i)
  if (m && /\d/.test(m[1]) && /\d/.test(m[2])) return [m[1], m[2]]
  return [s]
}

/** How a screen reader hears the years. */
export function spokenYears(years: string[]): string {
  return years.length > 1 ? years[0] + " to " + years[1] : years[0] || ""
}

export function clampIndex(i: number, n: number): number {
  if (n <= 0) return 0
  return Math.max(0, Math.min(n - 1, Math.round(i)))
}

/** 1 for the milestone in focus, falling to 0 one milestone away. */
export function focusAt(pos: number, i: number): number {
  return Math.max(0, 1 - Math.abs(pos - i))
}

/**
 * How far the strip is moved for a focus position: one step per milestone,
 * but never further than `maxShift` (the last card flush with the container).
 * Past the last milestone it keeps following, so the rubber band still reads.
 */
export function trackShift(pos: number, step: number, maxShift: number, n: number): number {
  if (pos > n - 1) return Math.min((n - 1) * step, maxShift) + (pos - (n - 1)) * step
  return Math.min(pos * step, maxShift)
}

/** Opacity of a card whose left edge is `x` px from the container's left: gone once well past it. */
export function passedOpacity(x: number, step: number): number {
  return 1 - Math.max(0, Math.min(1, (-x - step * 0.25) / (step * 0.35)))
}

/** Past an end the strip follows the pointer with growing resistance. */
export function rubber(over: number, limit: number): number {
  if (over <= 0) return 0
  return (limit * over) / (limit + over)
}

/**
 * Where a drag lands: the position it was thrown towards (velocity in px/ms
 * over about 180 ms), rounded to a milestone. A quick flick always moves at
 * least one milestone in its direction.
 */
export function snapIndex(pos: number, velocity: number, step: number, from: number, n: number): number {
  const projected = pos - (velocity * 180) / Math.max(1, step)
  let to = clampIndex(projected, n)
  if (to === from && Math.abs(velocity) > 0.35) to = clampIndex(from + (velocity < 0 ? 1 : -1), n)
  return to
}

/** Thickness of the liquid neck, as a share of the pill height, for two ends `dist` px apart. */
export function neckRatio(dist: number): number {
  return Math.max(0.16, Math.min(0.46, 0.5 - dist / 1100))
}

/**
 * The card outline as a CSS path(): a rectangle whose left and / or right
 * edge leans by `o` px over its height, every corner rounded by `r`. The
 * right edge leans in at the bottom and the next card's left edge leans in at
 * the top, so two neighbours meet on parallel seams. `leftLean` lets the left
 * edge straighten on its own once the card before it has gone.
 */
export function seamPath(w: number, h: number, o: number, r: number, slantLeft: boolean, slantRight: boolean, leftLean = o): string {
  const pts = [
    [slantLeft ? leftLean : 0, 0],
    [w, 0],
    [slantRight ? w - o : w, h],
    [0, h],
  ]
  const f = (v: number) => String(Math.round(v * 10) / 10)
  const towards = (a: number[], b: number[], d: number) => {
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const len = Math.hypot(dx, dy) || 1
    const k = Math.min(d, len / 2) / len
    return [a[0] + dx * k, a[1] + dy * k]
  }
  let d = ""
  for (let i = 0; i < 4; i++) {
    const prev = pts[(i + 3) % 4]
    const cur = pts[i]
    const next = pts[(i + 1) % 4]
    const a = towards(cur, prev, r)
    const b = towards(cur, next, r)
    d += (i === 0 ? "M" : "L") + f(a[0]) + " " + f(a[1]) + "Q" + f(cur[0]) + " " + f(cur[1]) + " " + f(b[0]) + " " + f(b[1])
  }
  return d + "Z"
}

function channel(c: number): number {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

export function luminance(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return NaN
  const n = parseInt(m[1], 16)
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
}

export function contrast(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  if (Number.isNaN(la) || Number.isNaN(lb)) return NaN
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}
// #endregion

const DEFAULT_MILESTONES: Milestone[] = [
  {
    years: 2014,
    title: "A workbench and a borrowed van",
    body: "Ines Holt and Tomas Sennett start taking renovation work out of a rented garage, drawing every joint by hand before they cut it.",
    image: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1400&q=75",
    alt: "Architectural drawings and drafting tools spread across a desk",
  },
  {
    years: [2016, 2017],
    title: "Our first house, start to finish",
    body: "A family home on a sloping plot: our first full design and build, and the first time we framed a house in cross-laminated timber.",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=75",
    alt: "A modern house with large windows, lit from inside at dusk",
  },
  {
    years: 2019,
    title: "A workshop of our own",
    body: "We move into a prefab hall where wall panels are built indoors, dry and square, then craned into place in days rather than months.",
    image: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1400&q=75",
    alt: "A building site with a tower crane against the sky",
  },
  {
    years: [2021, 2022],
    title: "Schools and a library",
    body: "Two primary schools and a public library, built while lessons carried on next door.",
    image: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=1400&q=75",
    alt: "A white public building with a curved facade",
    href: "#",
    linkLabel: "Read the case study",
  },
  {
    years: 2024,
    title: "Homes, five storeys up",
    body: "Our first apartment block: forty-eight homes on a timber frame, with the workshop building every wall.",
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1400&q=75",
    alt: "Looking up at tall buildings against a pale sky",
  },
  {
    years: "Today",
    title: "The next street",
    body: "Planning permission for a whole street of timber homes, and open roles in design, site and the workshop.",
    image: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1400&q=75",
    alt: "A bright open-plan studio with long desks",
    href: "#",
    linkLabel: "See open roles",
  },
]

const STYLES = `
.sht{--ease:cubic-bezier(.23,1,.32,1);position:relative;overflow:hidden;isolation:isolate;padding:clamp(56px,8vw,112px) 0 clamp(56px,7vw,104px);background:var(--field);color:var(--on-field);font-family:var(--text-font);-webkit-font-smoothing:antialiased;
--field:var(--l-field);--on-field:var(--l-on-field);--muted-on-field:var(--l-muted-on-field);--card:var(--l-card);--ink:var(--l-ink);--muted:var(--l-muted);--pill:var(--l-pill);--on-pill:var(--l-on-pill);--wash:var(--l-wash)}
.sht[data-theme=dark],:where(.dark) .sht[data-theme=auto]{--field:var(--d-field);--on-field:var(--d-on-field);--muted-on-field:var(--d-muted-on-field);--card:var(--d-card);--ink:var(--d-ink);--muted:var(--d-muted);--pill:var(--d-pill);--on-pill:var(--d-on-pill);--wash:var(--d-wash)}
.sht,.sht *{box-sizing:border-box}
.sht ::selection{background:var(--pill);color:var(--on-pill)}
.sht__wrap{width:100%;max-width:1280px;margin:0 auto;padding:0 clamp(16px,5vw,64px)}
.sht__head{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:24px clamp(32px,6vw,96px);align-items:end}
.sht__eyebrow{margin:0 0 14px;font-family:var(--label-font);font-size:21px;line-height:1.2;font-weight:400;letter-spacing:-.005em;color:var(--on-field)}
.sht__h{margin:0;font-family:var(--display-font);font-weight:600;font-size:clamp(40px,5.6vw,80px);line-height:.96;letter-spacing:-.038em;color:var(--on-field);text-wrap:balance;max-width:13ch}
.sht__side{display:flex;flex-direction:column;gap:28px;padding-bottom:6px}
.sht__intro{margin:0;font-size:17px;line-height:1.55;color:var(--muted-on-field);max-width:44ch;text-wrap:pretty}
.sht__ctrls{display:flex;gap:10px}
.sht__btn{all:unset;box-sizing:border-box;display:inline-grid;place-items:center;width:52px;height:52px;border-radius:999px;background:var(--pill);color:var(--on-pill);cursor:pointer;transition:transform .16s var(--ease),opacity .2s ease,background-color .2s ease}
.sht__btn svg{width:20px;height:20px;transition:transform .18s var(--ease)}
.sht__btn:not([disabled]):active{transform:scale(.96)}
.sht__btn[disabled]{cursor:default;background:transparent;color:var(--muted-on-field);box-shadow:inset 0 0 0 1.5px currentColor;opacity:.55}
.sht__btn:focus-visible,.sht__slot:focus-visible,.sht__link:focus-visible,.sht__viewport:focus-visible{outline:2px solid var(--on-field);outline-offset:3px}
@supports selector(:has(a)){.sht__viewport:focus-visible{outline:none}.sht:has(.sht__viewport:focus-visible:not([data-dragging=true])) .sht__slot[aria-current]{outline:2px solid var(--on-field);outline-offset:4px}.sht:has(.sht__viewport:focus-visible:not([data-dragging=true])) .sht__card[data-active=true] .sht__text{box-shadow:inset 4px 0 0 var(--ink)}}
@media (hover:hover){.sht__btn:not([disabled]):hover [data-dir=next]{transform:translateX(3px)}.sht__btn:not([disabled]):hover [data-dir=prev]{transform:translateX(-3px)}}
.sht__rail{position:relative;margin:clamp(34px,5vw,58px) -10px 0;padding:4px 10px;overflow-x:auto;overflow-y:hidden;scrollbar-width:none}
.sht__rail::-webkit-scrollbar{display:none}
.sht__rail[data-scroll=true]{-webkit-mask-image:linear-gradient(90deg,#000 calc(100% - 40px),transparent);mask-image:linear-gradient(90deg,#000 calc(100% - 40px),transparent)}
.sht__railin{position:relative;display:flex;justify-content:space-between;gap:28px;min-width:max-content;width:100%;padding:6px 0}
.sht__axis{position:absolute;z-index:-1;left:0;right:0;top:50%;height:1px;background:var(--muted-on-field);opacity:.45;pointer-events:none}
.sht__slot{all:unset;position:static;display:inline-flex;gap:2px;cursor:pointer;border-radius:999px;background:var(--field);box-shadow:inset 0 0 0 1px color-mix(in oklab,var(--muted-on-field) calc(70% * (1 - var(--cov,0))),transparent)}
.sht__chip{display:inline-grid;place-items:center;height:36px;padding:0 16px;border-radius:999px;font-size:15px;font-weight:500;letter-spacing:-.01em;font-variant-numeric:tabular-nums;color:var(--on-field);white-space:nowrap;transition:transform .16s var(--ease)}
.sht__slot:active .sht__chip{transform:scale(.96)}
@media (hover:hover){.sht__slot:not([aria-current]):hover{box-shadow:inset 0 0 0 1.5px var(--on-field)}}
.sht__goo{position:absolute;inset:0;pointer-events:none}
.sht__blob{position:absolute;top:6px;left:0;height:36px;border-radius:999px;background:var(--pill);will-change:transform,width}
.sht__neck{position:absolute;left:0;top:24px;height:0;background:var(--pill);will-change:transform,width}
.sht__lit{position:absolute;inset:0;display:flex;justify-content:space-between;gap:28px;padding:6px 0;pointer-events:none;will-change:clip-path}
.sht__lit .sht__slot{background:transparent;box-shadow:none}
.sht__lit .sht__chip{color:var(--on-pill)}
.sht__viewport{position:relative;margin-top:clamp(20px,2.4vw,32px);touch-action:pan-y;cursor:grab;user-select:none;-webkit-user-select:none}
.sht__viewport[data-dragging=true]{cursor:grabbing}
.sht__track{display:flex;align-items:stretch;will-change:transform}
.sht__card{position:relative;flex:0 0 var(--cw);display:flex;flex-direction:column;background:var(--card);color:var(--ink);--f:0}
.sht__card[data-active=false]{cursor:pointer}
.sht__photo{position:relative;height:var(--ph);overflow:hidden;background:color-mix(in oklab,var(--field) 80%,var(--card))}
.sht__photo img{position:absolute;inset:0;width:100%;height:100%;max-width:none;object-fit:cover;display:block;-webkit-user-drag:none;opacity:0;transition:opacity .24s ease}
.sht__photo img[data-loaded=true]{opacity:1}
.sht__plate{position:absolute;inset:0;display:flex;align-items:flex-end;padding:0 0 0 var(--padl);overflow:hidden;background:color-mix(in oklab,var(--field) 86%,var(--on-field))}
.sht__plate span{display:block;font-family:var(--display-font);font-weight:700;font-size:min(calc(var(--ph) * .58),calc(var(--cw) * .2));line-height:1;margin-bottom:-.2em;letter-spacing:-.055em;color:color-mix(in oklab,var(--field) 62%,var(--on-field));white-space:nowrap}
.sht__wash{position:absolute;inset:0;background:var(--wash);pointer-events:none}
.sht__past{position:absolute;inset:0;background:var(--field);opacity:0;pointer-events:none}
.sht__pills{position:absolute;top:22px;left:var(--pillx);display:inline-flex;transform:translateX(calc(var(--hv,0) * 5px))}
.sht__pgoo,.sht__ptext{display:inline-flex;gap:6px}
.sht__pgoo{position:relative}
.sht__pgoo i{display:block;height:34px;border-radius:999px;background:var(--pill)}
.sht__pgoo b{position:absolute;top:10px;height:14px;background:var(--pill)}
.sht__ptext{position:absolute;inset:0}
.sht__ptext span{display:inline-grid;place-items:center;height:34px;padding:0 15px;font-size:15px;font-weight:500;letter-spacing:-.01em;font-variant-numeric:tabular-nums;color:var(--on-pill);white-space:nowrap}
.sht__pgoo i.sht__sizer{padding:0 15px;font-size:15px;font-weight:500;letter-spacing:-.01em;font-variant-numeric:tabular-nums;color:transparent;line-height:34px;white-space:nowrap}
.sht__text{flex:1;display:flex;flex-direction:column;gap:10px;padding:26px var(--padr) 30px var(--padl);min-height:170px}
.sht__title{margin:0;font-family:var(--display-font);font-size:clamp(20px,1.7vw,24px);line-height:1.18;font-weight:600;letter-spacing:-.02em;color:var(--ink)}
.sht__body{margin:0;font-size:16px;line-height:1.55;color:var(--muted);max-width:52ch}
.sht__link{align-self:flex-start;margin-top:auto;padding-top:8px;font-size:15px;font-weight:500;color:var(--ink);text-decoration:underline;text-underline-offset:4px;text-decoration-thickness:1px;display:inline-flex;align-items:center;gap:8px;border-radius:4px}
.sht__link svg{width:16px;height:16px;transition:transform .18s var(--ease)}
.sht__card[data-active=false] .sht__link{pointer-events:none}
@media (hover:hover){.sht__link:hover svg{transform:translateX(4px)}.sht__link:hover{text-decoration-thickness:2px}}
.sht__sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
@media (max-width:720px){.sht__head{grid-template-columns:1fr;align-items:start}.sht__side{gap:22px}.sht__intro{font-size:16px}.sht__body{font-size:15px}.sht__btn{width:48px;height:48px}.sht__railin,.sht__lit{justify-content:flex-start;gap:22px}.sht__text{min-height:0;padding-top:22px;padding-bottom:26px}}
@media (prefers-reduced-motion:reduce){.sht__btn,.sht__btn svg,.sht__link svg,.sht__photo img,.sht__pills{transition:none}}
`

const PALETTE_KEYS = ["field", "onField", "mutedOnField", "card", "ink", "muted", "pill", "onPill", "wash"]
const CSS_NAMES = ["field", "on-field", "muted-on-field", "card", "ink", "muted", "pill", "on-pill", "wash"]

const useIsoLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect

type Spring = { x: number; v: number }

function Arrow({ dir }: { dir: "prev" | "next" }) {
  return (
    <svg data-dir={dir} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d={dir === "next" ? "M4 10h11M11 5.5 15.5 10 11 14.5" : "M16 10H5M9 5.5 4.5 10 9 14.5"}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** The fused year pills on a photo: shapes through the goo filter, text crisp on top. */
function CardPills({ years, filter }: { years: string[]; filter: string }) {
  const gooRef = React.useRef(null as HTMLSpanElement | null)
  const neckRef = React.useRef(null as HTMLElement | null)
  useIsoLayoutEffect(() => {
    const g = gooRef.current
    const n = neckRef.current
    if (!g || !n) return
    const items = g.querySelectorAll("i")
    if (items.length < 2) return
    const a = items[0] as HTMLElement
    const b = items[1] as HTMLElement
    const left = a.offsetLeft + a.offsetWidth / 2
    const right = b.offsetLeft + b.offsetWidth / 2
    n.style.left = left + "px"
    n.style.width = Math.max(0, right - left) + "px"
  }, [years.join("|")])
  return (
    <span className="sht__pills" aria-hidden="true">
      <span className="sht__pgoo" ref={gooRef} style={{ filter: "url(#" + filter + ")" }}>
        {years.map((y) => (
          <i key={y} className="sht__sizer">
            {y}
          </i>
        ))}
        {years.length > 1 && <b ref={neckRef} />}
      </span>
      <span className="sht__ptext">
        {years.map((y) => (
          <span key={y}>{y}</span>
        ))}
      </span>
    </span>
  )
}

export default function SeamHistoryTimeline({
  milestones = DEFAULT_MILESTONES,
  eyebrow = "Our story",
  heading = "Twelve years of building in timber",
  intro = "How two carpenters with a borrowed van became a practice that designs and builds low-carbon homes, schools and housing.",
  preset = "harbour",
  palette,
  darkPalette,
  theme = "auto",
  seamAngle = 12,
  wash = 0.62,
  startIndex = 0,
  index,
  onChange,
  minHeight,
  labelFont = 'ui-serif, "Iowan Old Style", "Charter", "Bitstream Charter", Georgia, serif',
  displayFont = '"Inter Display", "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  textFont = '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  labels,
  className,
}: SeamHistoryTimelineProps) {
  const n = milestones.length
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "")
  const filterId = "sht-goo-" + uid
  const headingId = "sht-h-" + uid

  const years = React.useMemo(() => milestones.map((m) => normalizeYears(m.years)), [milestones])

  const controlled = typeof index === "number"
  const [inner, setInner] = React.useState(() => clampIndex(startIndex, n))
  const active = controlled ? clampIndex(index as number, n) : inner
  const [failed, setFailed] = React.useState(() => ({}) as { [url: string]: boolean })
  const [announce, setAnnounce] = React.useState("")
  const [dragging, setDragging] = React.useState(false)
  const [geo, setGeo] = React.useState({ cw: 0, ph: 0, h: 0, o: 0, vw: 0, mobile: false })

  const rootRef = React.useRef(null as HTMLElement | null)
  const viewportRef = React.useRef(null as HTMLDivElement | null)
  const trackRef = React.useRef(null as HTMLDivElement | null)
  const railRef = React.useRef(null as HTMLDivElement | null)
  const railInRef = React.useRef(null as HTMLDivElement | null)
  const blobLRef = React.useRef(null as HTMLDivElement | null)
  const blobRRef = React.useRef(null as HTMLDivElement | null)
  const neckRef = React.useRef(null as HTMLDivElement | null)
  const litRef = React.useRef(null as HTMLDivElement | null)
  const cardRefs = React.useRef([] as (HTMLDivElement | null)[])
  const washRefs = React.useRef([] as (HTMLDivElement | null)[])
  const veilRefs = React.useRef([] as (HTMLDivElement | null)[])
  const slotRefs = React.useRef([] as (HTMLButtonElement | null)[])

  const sim = React.useRef({
    pos: { x: clampIndex(startIndex, n), v: 0 } as Spring,
    target: clampIndex(startIndex, n),
    step: 1,
    maxShift: 0,
    geo: { cw: 0, h: 0, o: 0, r: 18, ph: 0, padBase: 30, pillBase: 22 },
    lean: [] as number[],
    cov: [] as number[],
    L: { x: 0, v: 0 } as Spring,
    Lw: { x: 0, v: 0 } as Spring,
    R: { x: 0, v: 0 } as Spring,
    Rw: { x: 0, v: 0 } as Spring,
    railTargets: [] as { l: number; lw: number; r: number; rw: number }[],
    railW: 0,
    dir: 1,
    hov: [] as number[],
    hovTarget: -1,
    raf: 0,
    last: 0,
    reduced: false,
    dragging: false,
    railReady: false,
  })

  const go = React.useCallback(
    (to: number) => {
      const next = clampIndex(to, n)
      if (!controlled) setInner(next)
      if (next !== active) onChange?.(next)
    },
    [active, controlled, n, onChange],
  )

  // Reduced motion
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const set = () => {
      sim.current.reduced = mq.matches
    }
    set()
    mq.addEventListener?.("change", set)
    return () => mq.removeEventListener?.("change", set)
  }, [])

  // Paint one frame from the simulation state.
  const paint = React.useCallback(() => {
    const s = sim.current
    const track = trackRef.current
    const shift = trackShift(s.pos.x, s.step, s.maxShift, n)
    if (track) track.style.transform = "translate3d(" + (-shift).toFixed(2) + "px,0,0)"
    const g = s.geo
    let prevOp = 1
    for (let i = 0; i < n; i++) {
      const f = focusAt(s.pos.x, i)
      const hov = s.hov[i] || 0
      const el = cardRefs.current[i]
      // A milestone that has slid past the left edge leaves the frame completely.
      const op = passedOpacity(i * s.step - shift, s.step)
      if (el) {
        el.style.opacity = op.toFixed(3)
        el.style.setProperty("--hv", (hov * (1 - f)).toFixed(3))
        el.style.pointerEvents = op < 0.5 ? "none" : ""
        // The left seam only exists while there is a card to meet: as the one before fades,
        // this edge straightens, so pill, title and edge share the heading's line.
        if (g.h) {
          const lean = i === 0 ? 0 : Math.round(g.o * prevOp)
          if (s.lean[i] !== lean) {
            s.lean[i] = lean
            el.style.clipPath = 'path("' + seamPath(g.cw, g.h, g.o, g.r, lean > 0, i < n - 1, lean) + '")'
            el.style.setProperty("--padl", Math.round(lean * (1 - g.ph / g.h)) + g.padBase + "px")
            el.style.setProperty("--pillx", Math.round(lean * (1 - 22 / g.h)) + g.pillBase + "px")
          }
        }
      }
      prevOp = op
      // Still to come: a pale haze. Already passed: it recedes toward the field.
      const amount = wash * (1 - f) * (1 - 0.7 * hov)
      const ahead = i > s.pos.x
      const w = washRefs.current[i]
      if (w) w.style.opacity = (ahead ? amount : 0).toFixed(3)
      const v = veilRefs.current[i]
      if (v) v.style.opacity = (ahead ? 0 : amount).toFixed(3)
    }
    if (s.railReady) {
      const L = s.L.x
      const R = s.R.x
      const lw = Math.max(0, s.Lw.x)
      const rw = Math.max(0, s.Rw.x)
      const bl = blobLRef.current
      const br = blobRRef.current
      const nk = neckRef.current
      if (bl) {
        bl.style.transform = "translate3d(" + L.toFixed(2) + "px,0,0)"
        bl.style.width = lw.toFixed(2) + "px"
      }
      if (br) {
        br.style.transform = "translate3d(" + R.toFixed(2) + "px,0,0)"
        br.style.width = rw.toFixed(2) + "px"
      }
      const a = Math.min(L + lw / 2, R + rw / 2)
      const b = Math.max(L + lw / 2, R + rw / 2)
      if (nk) {
        const t = 36 * neckRatio(b - a)
        nk.style.transform = "translate3d(" + a.toFixed(2) + "px," + (-t / 2).toFixed(2) + "px,0)"
        nk.style.width = (b - a).toFixed(2) + "px"
        nk.style.height = t.toFixed(2) + "px"
      }
      const left = Math.min(L, R)
      const right = Math.max(L + lw, R + rw)
      const lit = litRef.current
      if (lit) lit.style.clipPath = "inset(0 " + Math.max(0, s.railW - right).toFixed(1) + "px 0 " + Math.max(0, left).toFixed(1) + "px)"
      // Fade each year's ring by how much of it the visible liquid covers. The goo threshold
      // erases thin ends, so measure from the solid part only.
      const vl = (lw >= 24 ? Math.min(L, R) : R) + 8
      const vr = (rw >= 24 ? Math.max(L + lw, R + rw) : L + lw) - 8
      for (let i = 0; i < n; i++) {
        const slot = slotRefs.current[i]
        const t = s.railTargets[i]
        if (!slot || !t) continue
        const width = Math.max(1, t.r + t.rw - t.l)
        const cov = Math.max(0, Math.min(1, (Math.min(vr, t.r + t.rw) - Math.max(vl, t.l)) / width))
        const prev = s.cov[i] ?? -1
        if (Math.abs(prev - cov) > 0.02 || (cov === 0 && prev !== 0) || (cov === 1 && prev !== 1)) {
          s.cov[i] = cov
          slot.style.setProperty("--cov", cov.toFixed(2))
        }
      }
    }
  }, [n, wash])

  const tick = React.useCallback(
    (now: number) => {
      const s = sim.current
      const dt = Math.min(0.05, s.last ? (now - s.last) / 1000 : 1 / 60)
      s.last = now
      let t = s.railTargets[clampIndex(s.target, n)]
      if (s.dragging) {
        // Mid-drag the pill stretches between the two years the strip is between.
        const p = Math.max(0, Math.min(n - 1, s.pos.x))
        const a = s.railTargets[Math.floor(p)]
        const b = s.railTargets[Math.ceil(p)]
        const k = p - Math.floor(p)
        if (a && b) t = { l: a.l + (b.l - a.l) * k, lw: a.lw + (b.lw - a.lw) * k, r: a.r + (b.r - a.r) * k, rw: a.rw + (b.rw - a.rw) * k }
      }
      if (s.reduced) {
        if (!s.dragging) s.pos = { x: s.target, v: 0 }
        if (t) {
          s.L = { x: t.l, v: 0 }
          s.Lw = { x: t.lw, v: 0 }
          s.R = { x: t.r, v: 0 }
          s.Rw = { x: t.rw, v: 0 }
        }
        for (let i = 0; i < n; i++) s.hov[i] = s.hovTarget === i ? 1 : 0
        paint()
        s.raf = 0
        s.last = 0
        return
      }
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)))
      const h = dt / steps
      const spring = (sp: Spring, to: number, k: number, c: number) => {
        for (let i = 0; i < steps; i++) {
          sp.v += (k * (to - sp.x) - c * sp.v) * h
          sp.x += sp.v * h
        }
      }
      if (!s.dragging) spring(s.pos, s.target, 150, 24)
      if (t) {
        // The end that leads in the direction of travel runs ahead; the other one is pulled after it.
        const lead = [420, 38] as const
        const lag = [110, 19] as const
        const lk = s.dir < 0 ? lead : lag
        const rk = s.dir < 0 ? lag : lead
        spring(s.L, t.l, lk[0], lk[1])
        spring(s.Lw, t.lw, lk[0], lk[1])
        spring(s.R, t.r, rk[0], rk[1])
        spring(s.Rw, t.rw, rk[0], rk[1])
      }
      let hovMoving = false
      for (let i = 0; i < n; i++) {
        const goal = s.hovTarget === i ? 1 : 0
        const cur = s.hov[i] || 0
        const nx = cur + (goal - cur) * Math.min(1, dt * 12)
        s.hov[i] = Math.abs(goal - nx) < 0.002 ? goal : nx
        if (s.hov[i] !== goal) hovMoving = true
      }
      paint()
      const settled = (sp: Spring, to: number, eps: number) => Math.abs(sp.x - to) < eps && Math.abs(sp.v) < eps * 4
      const done =
        !s.dragging &&
        settled(s.pos, s.target, 0.0008) &&
        (!t || (settled(s.L, t.l, 0.2) && settled(s.R, t.r, 0.2) && settled(s.Lw, t.lw, 0.2) && settled(s.Rw, t.rw, 0.2))) &&
        !hovMoving
      if (done) {
        s.pos.x = s.target
        s.pos.v = 0
        if (t) {
          s.L = { x: t.l, v: 0 }
          s.R = { x: t.r, v: 0 }
          s.Lw = { x: t.lw, v: 0 }
          s.Rw = { x: t.rw, v: 0 }
        }
        paint()
        s.raf = 0
        s.last = 0
        return
      }
      s.raf = requestAnimationFrame(tick)
    },
    [n, paint],
  )

  const kick = React.useCallback(() => {
    const s = sim.current
    if (!s.raf && typeof window !== "undefined") {
      s.last = 0
      s.raf = requestAnimationFrame(tick)
    }
  }, [tick])

  React.useEffect(
    () => () => {
      cancelAnimationFrame(sim.current.raf)
      sim.current.raf = 0
    },
    [],
  )

  // Measure: card size, seam offset, rail chip positions.
  const measure = React.useCallback(() => {
    const vp = viewportRef.current
    if (!vp) return
    const W = vp.clientWidth
    if (!W) return
    const mobile = W < 640
    const cw = Math.round(Math.max(260, Math.min(mobile ? W * 0.9 : W * 0.6, 860)))
    const ph = Math.round(cw * (mobile ? 0.66 : 0.44))
    setGeo((g) => (g.cw === cw && g.ph === ph && g.vw === W && g.mobile === mobile ? g : { ...g, cw, ph, vw: W, mobile }))
  }, [])

  const measureHeight = React.useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const h = track.offsetHeight
    const angle = Math.max(0, Math.min(24, seamAngle)) * (geo.mobile ? 0.4 : 1)
    const o = Math.round(h * Math.tan((angle * Math.PI) / 180))
    setGeo((g) => (g.h === h && g.o === o ? g : { ...g, h, o }))
  }, [seamAngle, geo.mobile])

  const measureRail = React.useCallback(() => {
    const inEl = railInRef.current
    if (!inEl) return
    const s = sim.current
    s.railW = inEl.offsetWidth
    const rail = railRef.current
    if (rail) rail.dataset.scroll = rail.scrollWidth > rail.clientWidth + 1 ? "true" : "false"
    s.railTargets = slotRefs.current.map((slot) => {
      const chips = slot ? (Array.from(slot.querySelectorAll(".sht__chip")) as HTMLElement[]) : []
      const a = chips[0]
      const b = chips[chips.length - 1]
      if (!a || !b) return { l: 0, lw: 0, r: 0, rw: 0 }
      return { l: a.offsetLeft, lw: a.offsetWidth, r: b.offsetLeft, rw: b.offsetWidth }
    })
    const t = s.railTargets[clampIndex(s.target, n)]
    if (t && !s.railReady) {
      s.L = { x: t.l, v: 0 }
      s.Lw = { x: t.lw, v: 0 }
      s.R = { x: t.r, v: 0 }
      s.Rw = { x: t.rw, v: 0 }
      s.railReady = true
    } else if (t) {
      kick()
    }
    paint()
  }, [n, paint, kick])

  useIsoLayoutEffect(() => {
    measure()
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => measure()) : null
    if (ro && viewportRef.current) ro.observe(viewportRef.current)
    return () => ro?.disconnect()
  }, [measure])

  useIsoLayoutEffect(() => {
    measureHeight()
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => measureHeight()) : null
    if (ro && trackRef.current) ro.observe(trackRef.current)
    return () => ro?.disconnect()
  }, [measureHeight, geo.cw, geo.ph])

  useIsoLayoutEffect(() => {
    measureRail()
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => measureRail()) : null
    if (ro && railInRef.current) ro.observe(railInRef.current)
    let cancelled = false
    // Webfonts can change chip widths after first paint.
    document.fonts?.ready?.then(() => {
      if (!cancelled) measureRail()
    })
    return () => {
      cancelled = true
      ro?.disconnect()
    }
  }, [measureRail, years])

  // Step between cards follows the geometry.
  const gutter = geo.mobile ? 10 : 14
  const overlap = Math.max(0, geo.o - gutter)
  const step = Math.max(1, geo.cw - overlap)
  useIsoLayoutEffect(() => {
    sim.current.step = step
    // Every milestone, the last included, rests on the heading's left line; the field shows after the last.
    sim.current.maxShift = Infinity
    sim.current.geo = { cw: geo.cw, h: geo.h, o: geo.o, r: geo.mobile ? 14 : 18, ph: geo.ph, padBase: geo.mobile ? 18 : 30, pillBase: geo.mobile ? 16 : 22 }
    sim.current.lean = []
    paint()
  }, [step, paint, n, geo.cw, geo.o, geo.ph, geo.h, geo.mobile])

  // Follow the active index.
  const first = React.useRef(true)
  React.useEffect(() => {
    const s = sim.current
    s.dir = active >= s.target ? 1 : -1
    s.target = active
    kick()
    if (first.current) {
      first.current = false
    } else {
      const m = milestones[active]
      if (m) setAnnounce(spokenYears(years[active]) + ". " + m.title + ".")
    }
    // Keep the active year in view on a scrolling rail, without moving the page.
    const rail = railRef.current
    const slot = slotRefs.current[active]
    if (rail && slot && rail.scrollWidth > rail.clientWidth + 1) {
      const left = slot.offsetLeft - (rail.clientWidth - slot.offsetWidth) / 2
      rail.scrollTo({ left: Math.max(0, left), behavior: s.reduced ? "auto" : "smooth" })
    }
  }, [active, kick, milestones, years])

  // Wheel: horizontal intent only, so vertical page scroll is never captured.
  React.useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return
    let timer = 0
    let free = 0
    const onWheel = (e: WheelEvent) => {
      const dx = e.shiftKey && Math.abs(e.deltaX) < 1 ? e.deltaY : e.deltaX
      if (Math.abs(dx) <= Math.abs(e.deltaY) && !e.shiftKey) return
      e.preventDefault()
      const s = sim.current
      if (!timer) free = s.target
      free = Math.max(-0.2, Math.min(n - 0.8, free + dx / s.step))
      const to = clampIndex(free, n)
      if (to !== s.target) {
        s.dir = to > s.target ? 1 : -1
        go(to)
      }
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        timer = 0
      }, 160)
    }
    vp.addEventListener("wheel", onWheel, { passive: false })
    return () => {
      vp.removeEventListener("wheel", onWheel)
      window.clearTimeout(timer)
    }
  }, [go, n])

  // Drag with momentum.
  const drag = React.useRef({ id: -1, x0: 0, p0: 0, moved: false, samples: [] as { x: number; t: number }[], suppress: false })
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || drag.current.id !== -1) return
    const target = e.target as HTMLElement
    if (target.closest("a,button")) return
    drag.current = { id: e.pointerId, x0: e.clientX, p0: sim.current.pos.x, moved: false, samples: [{ x: e.clientX, t: e.timeStamp }], suppress: false }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (d.id !== e.pointerId) return
    const dx = e.clientX - d.x0
    const s = sim.current
    if (!d.moved) {
      if (Math.abs(dx) < 6) return
      d.moved = true
      s.dragging = true
      setDragging(true)
      try {
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      } catch {}
    }
    let p = d.p0 - dx / s.step
    if (p < 0) p = -rubber(-p, 0.35)
    if (p > n - 1) p = n - 1 + rubber(p - (n - 1), 0.35)
    const before = clampIndex(s.pos.x, n)
    s.pos.x = p
    s.pos.v = 0
    const after = clampIndex(p, n)
    if (after !== before) s.dir = after > before ? 1 : -1
    kick()
    d.samples.push({ x: e.clientX, t: e.timeStamp })
    if (d.samples.length > 6) d.samples.shift()
    paint()
  }
  const endDrag = (e: React.PointerEvent) => {
    const d = drag.current
    if (d.id !== e.pointerId) return
    d.id = -1
    if (!d.moved) return
    const s = sim.current
    s.dragging = false
    setDragging(false)
    d.suppress = true
    const a = d.samples[0]
    const b = d.samples[d.samples.length - 1]
    const v = b && a && b.t > a.t ? (b.x - a.x) / (b.t - a.t) : 0
    const to = snapIndex(s.pos.x, v, s.step, active, n)
    s.dir = to >= s.pos.x ? 1 : -1
    if (to === active) {
      s.target = to
      kick()
    } else go(to)
    kick()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const t = e.target as HTMLElement
    if (t.closest("input,textarea,select,[contenteditable=true]")) return
    let to = -1
    if (e.key === "ArrowRight") to = active + 1
    else if (e.key === "ArrowLeft") to = active - 1
    else if (e.key === "Home") to = 0
    else if (e.key === "End") to = n - 1
    if (to < 0 || to > n - 1) return
    e.preventDefault()
    go(to)
  }

  // Focus moving into the strip must never scroll the overflow-hidden section sideways.
  const onScrollReset = (e: React.UIEvent<HTMLElement>) => {
    const el = e.currentTarget
    if (el.scrollLeft) el.scrollLeft = 0
  }

  const pal = PRESETS[preset] || PRESETS.harbour
  const light = { ...pal.light, ...(palette || {}) } as SeamPalette
  const dark = { ...pal.dark, ...(darkPalette || {}) } as SeamPalette
  const vars = {} as { [k: string]: string }
  PALETTE_KEYS.forEach((k, i) => {
    vars["--l-" + CSS_NAMES[i]] = (light as { [k: string]: string })[k]
    vars["--d-" + CSS_NAMES[i]] = (dark as { [k: string]: string })[k]
  })
  vars["--display-font"] = displayFont
  vars["--label-font"] = labelFont
  vars["--text-font"] = textFont
  if (minHeight) vars.minHeight = minHeight

  const ready = geo.cw > 0
  const r = geo.mobile ? 14 : 18
  const H = geo.h || geo.ph + 170
  const o = geo.o
  const padBase = geo.mobile ? 18 : 30

  return (
    <section
      ref={rootRef}
      className={"sht" + (className ? " " + className : "")}
      data-theme={theme}
      style={vars as React.CSSProperties}
      aria-labelledby={headingId}
      onKeyDown={onKeyDown}
      onScroll={onScrollReset}
    >
      <style>{STYLES}</style>
      <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute" }}>
        <defs>
          <filter id={filterId} x="-20%" y="-60%" width="140%" height="220%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      <div className="sht__wrap">
        <div className="sht__head">
          <div>
            {eyebrow ? <p className="sht__eyebrow">{eyebrow}</p> : null}
            <h2 className="sht__h" id={headingId}>
              {heading}
            </h2>
          </div>
          <div className="sht__side">
            {intro ? <p className="sht__intro">{intro}</p> : null}
            <div className="sht__ctrls">
              <button type="button" className="sht__btn" aria-label={labels?.previous || "Previous milestone"} disabled={active <= 0} onClick={() => go(active - 1)}>
                <Arrow dir="prev" />
              </button>
              <button type="button" className="sht__btn" aria-label={labels?.next || "Next milestone"} disabled={active >= n - 1} onClick={() => go(active + 1)}>
                <Arrow dir="next" />
              </button>
            </div>
          </div>
        </div>

        <div className="sht__rail" ref={railRef}>
          <div className="sht__railin" ref={railInRef} role="group" aria-label={labels?.rail || "Years"}>
            <span className="sht__axis" aria-hidden="true" />
            {milestones.map((m, i) => (
              <button
                key={i}
                type="button"
                ref={(el) => {
                  slotRefs.current[i] = el
                }}
                className="sht__slot"
                aria-label={spokenYears(years[i]) + ": " + m.title}
                aria-current={i === active ? "step" : undefined}
                onClick={() => go(i)}
              >
                {years[i].map((y) => (
                  <span key={y} className="sht__chip">
                    {y}
                  </span>
                ))}
              </button>
            ))}
            <div className="sht__goo" aria-hidden="true" style={{ filter: "url(#" + filterId + ")" }}>
              <div className="sht__blob" ref={blobLRef} />
              <div className="sht__neck" ref={neckRef} />
              <div className="sht__blob" ref={blobRRef} />
            </div>
            <div className="sht__lit" ref={litRef} aria-hidden="true" style={{ clipPath: "inset(0 100% 0 0)" }}>
              {milestones.map((_, i) => (
                <span key={i} className="sht__slot">
                  {years[i].map((y) => (
                    <span key={y} className="sht__chip">
                      {y}
                    </span>
                  ))}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div
          className="sht__viewport"
          ref={viewportRef}
          data-dragging={dragging ? "true" : "false"}
          tabIndex={0}
          role="region"
          aria-roledescription="timeline"
          aria-label={heading + ". Use the left and right arrow keys to move between milestones."}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onScroll={onScrollReset}
          onClickCapture={(e) => {
            if (drag.current.suppress) {
              drag.current.suppress = false
              e.preventDefault()
              e.stopPropagation()
            }
          }}
          style={{ visibility: ready ? "visible" : "hidden" }}
        >
          <div
            className="sht__track"
            ref={trackRef}
            style={{ ["--cw" as string]: geo.cw + "px", ["--ph" as string]: geo.ph + "px" } as React.CSSProperties}
          >
            {milestones.map((m, i) => {
              const slantL = i > 0
              const slantR = i < n - 1
              const isActive = i === active
              // The right seam leans in by o at the bottom; on phones reserve its lean at the middle
              // of the text block instead, so the text keeps a usable measure.
              const padr = (slantR ? Math.round(geo.mobile ? (o * (geo.ph + (H - geo.ph) / 2)) / H : o) : 0) + padBase
              const showImg = !!m.image && !failed[m.image]
              return (
                <div
                  key={i}
                  ref={(el) => {
                    cardRefs.current[i] = el
                  }}
                  className="sht__card"
                  role="group"
                  aria-roledescription="milestone"
                  aria-label={i + 1 + " of " + n + ": " + spokenYears(years[i]) + ", " + m.title}
                  data-active={isActive ? "true" : "false"}
                  onClick={() => {
                    if (!isActive) go(i)
                  }}
                  onFocus={() => {
                    if (!isActive) go(i)
                  }}
                  onPointerEnter={(e) => {
                    if (e.pointerType !== "mouse") return
                    sim.current.hovTarget = i
                    kick()
                  }}
                  onPointerLeave={() => {
                    if (sim.current.hovTarget === i) sim.current.hovTarget = -1
                    kick()
                  }}
                  style={
                    {
                      marginLeft: i === 0 ? 0 : -overlap,
                      ["--padr" as string]: padr + "px",
                      zIndex: n - Math.abs(i - active),
                    } as React.CSSProperties
                  }
                >
                  <div className="sht__photo">
                    {showImg ? (
                      <img
                        src={m.image}
                        alt={m.alt ?? ""}
                        width={geo.cw || 860}
                        height={geo.ph || 380}
                        decoding="async"
                        draggable={false}
                        ref={(el) => {
                          if (el && el.complete && el.naturalWidth > 0) el.dataset.loaded = "true"
                        }}
                        onLoad={(e) => {
                          e.currentTarget.dataset.loaded = "true"
                        }}
                        onError={() => setFailed((f) => ({ ...f, [m.image as string]: true }))}
                        style={m.imagePosition ? { objectPosition: m.imagePosition } : undefined}
                      />
                    ) : (
                      <div className="sht__plate" aria-hidden="true">
                        <span>{years[i][years[i].length - 1]}</span>
                      </div>
                    )}
                    <div
                      className="sht__wash"
                      ref={(el) => {
                        washRefs.current[i] = el
                      }}
                    />
                    <div
                      className="sht__past"
                      ref={(el) => {
                        veilRefs.current[i] = el
                      }}
                    />
                    <CardPills years={years[i]} filter={filterId} />
                  </div>
                  <div className="sht__text">
                    <h3 className="sht__title">{m.title}</h3>
                    {m.body ? <p className="sht__body">{m.body}</p> : null}
                    {m.href ? (
                      <a className="sht__link" href={m.href} tabIndex={isActive ? 0 : -1}>
                        {m.linkLabel || "Read more"}
                        <Arrow dir="next" />
                      </a>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <p className="sht__sr" aria-live="polite" aria-atomic="true">
        {announce}
      </p>
    </section>
  )
}

/** Any subset of a palette, merged over the preset. */
export type SeamPaletteInput = { [K in keyof SeamPalette]?: string }
