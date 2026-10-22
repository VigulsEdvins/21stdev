"use client"

import * as React from "react"

/*
 * Checker Quilt Testimonials: a testimonials section laid out as a full-bleed
 * checkerboard. Each row pairs a quote, set large on a solid colour field,
 * with a portrait of the person who said it. Two rows sit diagonally, so the
 * fields and the faces alternate like a quilt.
 *
 * Moving to the next people is the signature: each row's field sweeps across
 * and covers the old portrait, then pulls back to the other side and shows
 * the new one, which settles from a slightly tight crop. The fields trade
 * places, so the checkerboard inverts every step.
 *
 * Prev/next, a counter, autoplay with a progress line (pauses on hover,
 * focus, a hidden tab and the pause button), ←/→, and swipe. On a narrow
 * container it becomes one quote-over-photo pair that sweeps vertically.
 * A testimonial without a photo, or one whose photo fails, gets a plate with
 * the person's initials in a third tone, so a text-only quilt still reads as
 * four tiles.
 */

export type QuiltPreset = "bottle" | "oxblood" | "marigold" | "mint" | "cobalt"

export type QuiltPalette = {
  /** First field (top row on desktop) and the text on it. */
  fieldA: string
  inkA: string
  /** Second field and the text on it. */
  fieldB: string
  inkB: string
  /** Heading band and its text. */
  band: string
  bandInk: string
  /** Third tone behind portraits: shown while one loads, and with initials when there is no photo. */
  plate?: string
  plateInk?: string
}

export type Testimonial = {
  quote: string
  name: string
  /** One short line under the name: role, company, what they came in for. */
  context?: string
  /** Portrait URL. Without one, the tile shows a monogram plate. */
  photo?: string
  alt?: string
  /** CSS object-position for the portrait, e.g. "50% 30%". */
  focus?: string
  /** Without a photo: a company logo URL for the plate, or a figure such as { value: "9 → 4", label: "days to close the month" }. */
  logo?: string
  stat?: { value: string; label: string }
}

export type CheckerQuiltTestimonialsProps = {
  testimonials?: Testimonial[]
  heading?: React.ReactNode
  /** Optional link in the heading band. Give it an onClick to open a booking modal instead. */
  cta?: { label: string; href?: string; onClick?: (e: React.MouseEvent) => void }
  preset?: QuiltPreset
  /** Override any colour of the preset. */
  palette?: QuiltPaletteInput
  /** Rows of pairs on a wide container. Narrow containers always show one. */
  rows?: 1 | 2
  /** ms per step; 0 turns autoplay off. */
  autoplay?: number
  /** Page shown first. */
  defaultPage?: number
  /** Height of the quilt on a wide container. Any CSS length. */
  height?: number | string
  /** Height of the quote + photo pair on a narrow container. */
  mobileHeight?: number | string
  /** Container width (px) below which the quilt stacks. */
  stackBelow?: number
  /** Font stacks. Pass your own, e.g. "var(--font-serif)". */
  quoteFont?: string
  uiFont?: string
  ariaLabel?: string
  onChange?: (page: number) => void
  className?: string
  style?: React.CSSProperties
}

function Arrow({ dir }: { dir: "prev" | "next" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d={dir === "next" ? "M3 9h11M10 4.5 14.5 9 10 13.5" : "M15 9H4M8 4.5 3.5 9 8 13.5"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PlayPause({ playing }: { playing: boolean }) {
  return playing ? (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <rect x="3" y="2.5" width="2.6" height="9" rx="0.6" fill="currentColor" />
      <rect x="8.4" y="2.5" width="2.6" height="9" rx="0.6" fill="currentColor" />
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path d="M4 2.6v8.8a.6.6 0 0 0 .9.5l7-4.4a.6.6 0 0 0 0-1L4.9 2.1a.6.6 0 0 0-.9.5Z" fill="currentColor" />
    </svg>
  )
}

// #region logic
export function wrap(i: number, n: number): number {
  return n ? ((i % n) + n) % n : 0
}

export function pad2(n: number): string {
  return n < 10 ? "0" + n : String(n)
}

export function pageCount(total: number, perPage: number): number {
  return Math.max(1, Math.ceil(total / Math.max(1, perPage)))
}

/** Testimonial indices shown on a page. A short last page borrows from the start, so no tile is ever empty. */
export function itemsOnPage(total: number, perPage: number, page: number): number[] {
  const out: number[] = []
  if (!total) return out
  for (let r = 0; r < perPage; r++) out.push(wrap(page * perPage + r, total))
  return out
}

/** Which half of a row the colour field holds. Alternates by row and by page, which makes the checkerboard. */
export function fieldSide(page: number, row: number): "start" | "end" {
  return (page + row) % 2 === 0 ? "start" : "end"
}

/** Which colour a row's field is. Two rows keep their colours; a single row alternates per page. */
export function fieldTone(page: number, row: number, perPage: number): "a" | "b" {
  if (perPage > 1) return row % 2 === 0 ? "a" : "b"
  return page % 2 === 0 ? "a" : "b"
}

/** Keep the first visible testimonial on screen when the number of rows changes. */
export function remapPage(page: number, fromPer: number, toPer: number, total: number): number {
  return wrap(Math.floor((page * fromPer) / Math.max(1, toPer)), pageCount(total, toPer))
}

/** Starting type size by quote length; the tile then fits it to its own height. */
export function quoteSize(quote: string): "l" | "m" | "s" {
  const n = quote.length
  return n <= 120 ? "l" : n <= 200 ? "m" : "s"
}

/** Largest integer in [lo, hi] for which fits() holds (lo if none). Binary search, about 6 layout reads. */
export function fitSize(lo: number, hi: number, fits: (n: number) => boolean): number {
  let a = Math.ceil(lo)
  let b = Math.floor(hi)
  if (b <= a) return a
  if (fits(b)) return b
  while (b - a > 1) {
    const mid = (a + b) >> 1
    if (fits(mid)) a = mid
    else b = mid
  }
  return a
}

/** A width-based srcset for an images.unsplash.com URL; empty for any other host. */
export function unsplashSrcSet(url: string): string {
  if (!/^https:\/\/images\.unsplash\.com\//.test(url)) return ""
  const base = url.replace(/([?&])w=\d+&?/, "$1").replace(/[?&]$/, "")
  const sep = base.includes("?") ? "&" : "?"
  return [600, 1200, 1800].map((w) => base + sep + "w=" + w + " " + w + "w").join(", ")
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return ""
  const first = parts[0][0] || ""
  const last = parts.length > 1 ? parts[parts.length - 1][0] || "" : ""
  return (first + last).toUpperCase()
}
// #endregion logic

const PRESETS: Record<QuiltPreset, QuiltPalette> = {
  bottle: { fieldA: "#1d4535", inkA: "#fbeea0", fieldB: "#fbeea0", inkB: "#1d4535", band: "#13301f", bandInk: "#fbeea0", plate: "#7fa487", plateInk: "#13301f" },
  oxblood: { fieldA: "#5b1622", inkA: "#f9d3cc", fieldB: "#f6c3bb", inkB: "#4a111b", band: "#3f0e17", bandInk: "#f9d3cc", plate: "#b4566a", plateInk: "#3f0e17" },
  marigold: { fieldA: "#17181c", inkA: "#f4b23f", fieldB: "#f4b23f", inkB: "#17181c", band: "#0e0f12", bandInk: "#f4b23f", plate: "#5a5d68", plateInk: "#f4b23f" },
  mint: { fieldA: "#0e3b2d", inkA: "#c4ecd2", fieldB: "#bfe8cd", inkB: "#0b3326", band: "#082a1f", bandInk: "#c4ecd2", plate: "#5e9b81", plateInk: "#082a1f" },
  cobalt: { fieldA: "#1c3a9e", inkA: "#dce8ff", fieldB: "#d3e3ff", inkB: "#152c7a", band: "#132a75", bandInk: "#dce8ff", plate: "#7090e2", plateInk: "#132a75" },
}

const U = "https://images.unsplash.com/"
const Q = "?auto=format&fit=crop&w=1200&q=80"

const DEFAULT_TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "I came in limping and sure I would have to give up running. They traced it to my hips, not my knee, and I ran my first 10k in April.",
    name: "Ellie Marsh",
    context: "Runner's knee, six sessions",
    photo: U + "photo-1438761681033-6461ffad8d80" + Q,
    alt: "Ellie, a woman with shoulder-length auburn hair, outdoors by a lake",
    focus: "50% 30%",
  },
  {
    quote:
      "I assumed a stiff shoulder was just part of getting older. Three months on I can reach the top shelf and lift my granddaughter again.",
    name: "Graham Whitlock",
    context: "Frozen shoulder, after a fall",
    photo: U + "photo-1472099645785-5658abf4ff4e" + Q,
    alt: "Graham, a grey-haired man with glasses and a green polo shirt",
    focus: "50% 45%",
  },
  {
    quote:
      "Twelve minutes of exercises before work, and the ache I had lived with for two years is gone. No gadgets, no upsell, just a plan I could keep.",
    name: "Priya Nair",
    context: "Desk-job back pain",
    photo: U + "photo-1494790108377-be9c29b29330" + Q,
    alt: "Priya, a laughing woman with long dark hair in a red sweater",
    focus: "50% 18%",
  },
  {
    quote:
      "Back on the pitch in five weeks, and they taught me the warm-up that has kept the ankle quiet all season.",
    name: "Daniel Osei",
    context: "Ankle sprain, Sunday league",
    photo: U + "photo-1507003211169-0a1dd7228f2d" + Q,
    alt: "Daniel, a smiling man with short dark hair in a white T-shirt",
    focus: "50% 18%",
  },
  {
    quote:
      "The first appointment where someone actually listened. A calm room, a clear plan, and an email the next morning to check how I was doing.",
    name: "Hannah Cole",
    context: "Pelvic pain in pregnancy",
    photo: U + "photo-1544005313-94ddf0286df2" + Q,
    alt: "Hannah, a woman with long dark hair looking at the camera",
    focus: "50% 30%",
  },
  {
    quote:
      "Six weeks after my hip replacement I walked the whole coast path to the harbour. My surgeon asked who my physio was.",
    name: "Marcus Bell",
    context: "Hip replacement recovery",
    photo: U + "photo-1500648767791-00dcc994a43e" + Q,
    alt: "Marcus, a man with a short beard smiling in daylight",
    focus: "50% 30%",
  },
]

const ROW_STAGGER_MS = 90
// Autoplay steps take their time; a step the visitor asked for answers faster.
const TIMING = {
  auto: { cover: 420, reveal: 680, rise: 560, lead: 30 },
  user: { cover: 300, reveal: 500, rise: 420, lead: 0 },
}

const css = `
.cqt { --cq-ease: cubic-bezier(0.23, 1, 0.32, 1); --cq-sweep: cubic-bezier(0.77, 0, 0.175, 1); container-type: inline-size; position: relative; width: 100%; font-family: var(--cq-uf); color: var(--cq-band-ink); background: var(--cq-band); -webkit-font-smoothing: antialiased; }
.cqt *, .cqt *::before, .cqt *::after { box-sizing: border-box; }
.cqt img { max-width: none; }

.cqt-band { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px 40px; flex-wrap: wrap; padding: clamp(22px, 2.6cqi, 40px) clamp(20px, 3.4cqi, 56px) clamp(20px, 2.2cqi, 32px); position: relative; }
.cqt-heading { margin: 0; font-family: var(--cq-qf); font-weight: 400; font-size: clamp(30px, 3.6cqi, 58px); line-height: 0.98; letter-spacing: -0.025em; max-width: 19ch; text-wrap: balance; }
.cqt-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.cqt-count { font-size: 14px; font-variant-numeric: tabular-nums; letter-spacing: 0.04em; margin: 0 10px 0 4px; white-space: nowrap; }
.cqt-count b { font-weight: 600; }
.cqt-count span { opacity: 0.72; }
.cqt-btn { display: inline-grid; place-items: center; width: 44px; height: 44px; border-radius: 999px; border: 1px solid color-mix(in srgb, var(--cq-band-ink) 42%, transparent); color: var(--cq-band-ink); background: transparent; cursor: pointer; transition: background-color 200ms ease, color 200ms ease, border-color 200ms ease, transform 160ms var(--cq-ease); }
.cqt-btn svg { transition: transform 260ms var(--cq-ease); }
.cqt-btn:hover { background: var(--cq-band-ink); color: var(--cq-band); border-color: var(--cq-band-ink); }
.cqt-btn[data-dir="next"]:hover svg { transform: translateX(2px); }
.cqt-btn[data-dir="prev"]:hover svg { transform: translateX(-2px); }
.cqt-btn:active { transform: scale(0.96); }
.cqt-btn:focus-visible, .cqt-cta:focus-visible { outline: 2px solid var(--cq-band-ink); outline-offset: 3px; box-shadow: 0 0 0 6px var(--cq-band); }
.cqt-cta { display: inline-flex; align-items: center; gap: 10px; height: 44px; padding: 0 20px; margin-right: 10px; border-radius: 999px; font-size: 15px; font-weight: 600; text-decoration: none; color: var(--cq-band); background: var(--cq-band-ink); transition: transform 160ms var(--cq-ease), gap 260ms var(--cq-ease); white-space: nowrap; }
.cqt-cta:hover { gap: 14px; }
.cqt-cta:active { transform: scale(0.97); }
.cqt-track { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: color-mix(in srgb, var(--cq-band-ink) 18%, transparent); overflow: hidden; }
.cqt-bar { position: absolute; inset: 0; background: var(--cq-band-ink); transform-origin: left center; transform: scaleX(0); }
.cqt-bar[data-run="1"] { animation: cqt-progress var(--cq-auto) linear forwards; }
.cqt:hover .cqt-bar, .cqt:focus-within .cqt-bar, .cqt[data-paused="1"] .cqt-bar { animation-play-state: paused; }
@keyframes cqt-progress { from { transform: scaleX(0); } to { transform: scaleX(1); } }

.cqt-quilt { position: relative; display: grid; height: var(--cq-h); grid-template-rows: repeat(var(--cq-rows), minmax(0, 1fr)); touch-action: pan-y; outline: none; }
.cqt-quilt:focus-visible::after { content: ""; position: absolute; inset: 0; z-index: 5; pointer-events: none; box-shadow: inset 0 0 0 3px var(--cq-band), inset 0 0 0 5px var(--cq-band-ink), inset 0 0 0 8px var(--cq-band); }
.cqt-row { position: relative; overflow: hidden; isolation: isolate; }

.cqt-photo { position: absolute; top: 0; bottom: 0; width: 50%; overflow: hidden; }
.cqt-photo[data-at="start"] { left: 0; }
.cqt-photo[data-at="end"] { right: 0; }
.cqt-plate { position: absolute; inset: 0; display: grid; place-items: center; color: var(--cq-plate-ink); background: var(--cq-plate); }
.cqt-stat { display: grid; justify-items: center; gap: 10px; padding: 24px; text-align: center; }
.cqt-stat b { font-family: var(--cq-qf); font-weight: 400; font-size: clamp(48px, 7cqi, 112px); line-height: 1; letter-spacing: -0.03em; }
.cqt-stat span { font-size: 15px; line-height: 1.35; max-width: 22ch; opacity: 0.85; }
.cqt-logo { width: 46%; height: 34%; object-fit: contain; max-width: none; }
.cqt-mono { font-family: var(--cq-qf); font-style: italic; font-size: clamp(72px, 12cqi, 190px); line-height: 1; letter-spacing: -0.04em; opacity: 0.9; user-select: none; }
.cqt-img { position: absolute; inset: 0; width: 100%; height: 100%; max-width: none; object-fit: cover; opacity: 0; transition: opacity 360ms ease; }
.cqt-img[data-loaded="1"] { opacity: 1; }
.cqt-img[data-cached="1"] { transition: none; }
.cqt-settle { position: absolute; inset: 0; animation: cqt-settle calc(var(--cq-reveal-ms) * 1.9) var(--cq-ease) both; }
@keyframes cqt-settle { from { transform: scale(1.08); } to { transform: scale(1); } }

.cqt-field { position: absolute; inset: 0; z-index: 1; }
.cqt-row[data-side="start"] .cqt-field { clip-path: inset(-1px 50% -1px -1px); }
.cqt-row[data-side="end"] .cqt-field { clip-path: inset(-1px -1px -1px 50%); }
.cqt-row[data-phase="cover"] .cqt-field { clip-path: inset(-1px); transition: clip-path var(--cq-cover-ms) var(--cq-sweep), background-color 300ms ease; }
.cqt-row[data-phase="reveal"] .cqt-field { transition: clip-path var(--cq-reveal-ms) var(--cq-ease), background-color 300ms ease; }

.cqt-sweep { display: none; }

.cqt-quote { --cq-fs: 30px; position: absolute; top: 0; bottom: 0; width: 50%; z-index: 2; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: clamp(48px, 5cqi, 88px) clamp(28px, 5cqi, 96px); padding-left: max(clamp(28px, 5cqi, 96px), calc(var(--cq-fs) * 1.45 + 16px)); }
.cqt-quote[data-at="start"] { left: 0; }
.cqt-quote[data-at="end"] { right: 0; }
.cqt-words { position: relative; max-width: 100%; transition: opacity 160ms ease, transform 160ms ease; }
.cqt-row[data-phase="cover"] .cqt-words { opacity: 0; transform: translateY(-8px); transition-delay: calc(var(--cq-cover-ms) - 130ms + var(--cq-rd, 0ms)); }
.cqt-quotebody { position: relative; }
.cqt-mark { position: absolute; left: -0.6em; top: -0.06em; font-family: var(--cq-qf); font-size: calc(var(--cq-fs) * 2.4); line-height: 0.8; color: color-mix(in srgb, currentColor 32%, transparent); pointer-events: none; user-select: none; }
.cqt-text { margin: 0; font-family: var(--cq-qf); font-weight: 400; font-size: var(--cq-fs); line-height: 1.13; letter-spacing: -0.018em; text-wrap: pretty; max-width: 27ch; hanging-punctuation: first; }
.cqt-words[data-size="m"] .cqt-text { line-height: 1.15; max-width: 30ch; }
.cqt-words[data-size="s"] .cqt-text { line-height: 1.18; max-width: 33ch; }
.cqt-who { margin-top: clamp(16px, calc(var(--cq-fs) * 0.8), 32px); font-size: 15px; line-height: 1.4; }
.cqt-name { display: block; font-weight: 650; letter-spacing: 0.01em; }
.cqt-ctx { display: block; opacity: 0.8; }
.cqt-in { animation: cqt-rise var(--cq-rise-ms) var(--cq-ease) both; animation-delay: var(--d, 0ms); }
@keyframes cqt-rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }

.cqt-sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }

@media (prefers-reduced-motion: reduce) {
  .cqt-field, .cqt-row[data-phase] .cqt-field, .cqt-sweep, .cqt-row[data-phase] .cqt-sweep, .cqt-words, .cqt-btn, .cqt-btn svg, .cqt-cta, .cqt-img { transition: none !important; }
  .cqt-settle, .cqt-in { animation: none !important; }
  .cqt-bar[data-run="1"] { animation: none; }
}
`

// Stacked layout. Written as a container query so the first paint (and server HTML) is already
// stacked on a narrow container; SCOPE is replaced with this instance's selector.
const narrowCss = `
SCOPE .cqt-band { flex-direction: column; align-items: stretch; gap: 20px; }
SCOPE .cqt-controls { width: 100%; }
SCOPE .cqt-cta { flex: 1 0 100%; justify-content: center; margin: 0 0 6px; }
SCOPE .cqt-count { margin: 0 auto 0 0; }
SCOPE .cqt-quilt { height: var(--cq-hm); grid-template-rows: minmax(0, 1fr); }
SCOPE .cqt-row:nth-child(n+2) { display: none; }
SCOPE .cqt-photo, SCOPE .cqt-quote { width: auto; left: 0; right: 0; height: 50%; }
SCOPE .cqt-photo[data-at="start"], SCOPE .cqt-quote[data-at="start"] { top: 0; bottom: auto; }
SCOPE .cqt-photo[data-at="end"], SCOPE .cqt-quote[data-at="end"] { top: auto; bottom: 0; }
SCOPE .cqt-quote { padding: 24px; align-items: stretch; }
SCOPE .cqt-mono { font-size: clamp(72px, 26cqi, 150px); }
SCOPE .cqt-row[data-side="start"] .cqt-field, SCOPE .cqt-row[data-side="start"][data-phase] .cqt-field { clip-path: inset(-1px -1px 50% -1px); transition: background-color 300ms ease; }
SCOPE .cqt-row[data-side="end"] .cqt-field, SCOPE .cqt-row[data-side="end"][data-phase] .cqt-field { clip-path: inset(50% -1px -1px -1px); transition: background-color 300ms ease; }
SCOPE .cqt-sweep { display: block; position: absolute; inset: 0; z-index: 1; clip-path: inset(-1px -1px -1px 100%); }
SCOPE .cqt-row[data-dir="prev"] .cqt-sweep { clip-path: inset(-1px 100% -1px -1px); }
SCOPE .cqt-row[data-phase="cover"] .cqt-sweep { clip-path: inset(-1px); transition: clip-path var(--cq-cover-ms) var(--cq-sweep), background-color 300ms ease; }
SCOPE .cqt-row[data-phase="reveal"] .cqt-sweep { clip-path: inset(-1px 100% -1px -1px); transition: clip-path var(--cq-reveal-ms) var(--cq-ease), background-color 300ms ease; }
SCOPE .cqt-row[data-phase="reveal"][data-dir="prev"] .cqt-sweep { clip-path: inset(-1px -1px -1px 100%); }
SCOPE .cqt-text { max-width: none; }
SCOPE .cqt-mark { position: static; display: block; height: 0.4em; margin: 0 0 0.12em -0.05em; }
`

function stackedCss(scope: string, below: number): string {
  return "@container (max-width: " + (below - 0.02) + "px) {\n" + narrowCss.split("SCOPE").join(scope) + "\n}"
}

function toLen(v: number | string): string {
  return typeof v === "number" ? v + "px" : v
}

// Portraits already decoded once; they skip the fade on later visits.
const LOADED = new Set() as Set<string>

const useIsoLayoutEffect = typeof window === "undefined" ? React.useEffect : React.useLayoutEffect

function Portrait({ t, settle, eager }: { t: Testimonial; settle: boolean; eager: boolean }) {
  const cached = !!t.photo && LOADED.has(t.photo)
  const [loaded, setLoaded] = React.useState(cached)
  const [failed, setFailed] = React.useState(false)
  const imgRef = React.useRef(null as HTMLImageElement | null)
  useIsoLayoutEffect(() => {
    const el = imgRef.current
    if (el && el.complete && el.naturalWidth > 0) {
      if (t.photo) LOADED.add(t.photo)
      setLoaded(true)
    }
  }, [])
  const showInitials = !t.photo || failed
  return (
    <div className={settle ? "cqt-settle" : undefined} style={settle ? undefined : { position: "absolute", inset: 0 }}>
      <div className="cqt-plate" aria-hidden={t.stat ? undefined : true}>
        {showInitials ? (
          t.logo ? (
            <img className="cqt-logo" src={t.logo} alt="" width={320} height={160} draggable={false} style={{ maxWidth: "none" }} />
          ) : t.stat ? (
            <p className="cqt-stat" style={{ margin: 0 }}>
              <b>{t.stat.value}</b>
              <span>{t.stat.label}</span>
            </p>
          ) : (
            <span className="cqt-mono">{initials(t.name)}</span>
          )
        ) : null}
      </div>
      {t.photo && !failed ? (
        <img
          ref={imgRef}
          className="cqt-img"
          src={t.photo}
          alt={t.alt || "Portrait of " + t.name}
          width={1200}
          height={1200}
          decoding="async"
          loading={eager ? "eager" : "lazy"}
          srcSet={unsplashSrcSet(t.photo) || undefined}
          sizes="(max-width: 720px) 100vw, 50vw"
          draggable={false}
          data-loaded={loaded ? "1" : "0"}
          data-cached={cached ? "1" : "0"}
          onLoad={() => {
            if (t.photo) LOADED.add(t.photo)
            setLoaded(true)
          }}
          onError={() => setFailed(true)}
          style={{ objectPosition: t.focus || "50% 35%", maxWidth: "none" }}
        />
      ) : null}
    </div>
  )
}

/** The quote tile. Its type is fitted to the tile, so no quote is ever clipped at any height. */
function QuoteTile({
  t,
  side,
  tone,
  narrow,
  animate,
  delay,
  lead,
  contentKey,
  onFitted,
}: {
  t: Testimonial
  side: "start" | "end"
  tone: "a" | "b"
  narrow: boolean
  animate: boolean
  delay: number
  lead: number
  contentKey: string
  onFitted: () => void
}) {
  const figRef = React.useRef(null as HTMLElement | null)
  const wordsRef = React.useRef(null as HTMLDivElement | null)
  const size = quoteSize(t.quote)

  const fit = React.useCallback(() => {
    const fig = figRef.current
    const words = wordsRef.current
    if (!fig || !words) return
    const cs = getComputedStyle(fig)
    const availH = fig.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
    const availW = fig.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
    if (availH <= 0 || availW <= 0) return
    const cap = narrow ? { l: 30, m: 27, s: 24 }[size] : { l: 50, m: 42, s: 35 }[size]
    const hi = Math.min(cap, availW / (narrow ? 11 : 12))
    const set = (n: number) => fig.style.setProperty("--cq-fs", n + "px")
    const best = fitSize(15, hi, (n) => {
      set(n)
      return words.offsetHeight <= availH
    })
    set(best)
    fig.dataset.fit = String(best)
    onFitted()
  }, [narrow, size, onFitted])

  useIsoLayoutEffect(() => {
    fit()
  }, [fit, t.quote, t.name, t.context])

  React.useEffect(() => {
    const fig = figRef.current
    if (!fig || typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(() => fit())
    ro.observe(fig)
    return () => ro.disconnect()
  }, [fit])

  return (
    <figure
      ref={(el) => {
        figRef.current = el
      }}
      className="cqt-quote"
      data-at={side}
      style={{ color: tone === "a" ? "var(--cq-ia)" : "var(--cq-ib)", margin: 0 }}
    >
      <div
        ref={(el) => {
          wordsRef.current = el
        }}
        className="cqt-words"
        data-size={size}
        style={{ ["--cq-rd" as string]: delay + "ms" } as React.CSSProperties}
      >
        <div key={contentKey} className="cqt-quotebody">
          <span className={"cqt-mark" + (animate ? " cqt-in" : "")} aria-hidden="true" style={{ ["--d" as string]: delay + lead + "ms" } as React.CSSProperties}>
            {"“"}
          </span>
          <blockquote style={{ margin: 0 }}>
            <p className={"cqt-text" + (animate ? " cqt-in" : "")} style={{ ["--d" as string]: delay + lead + 40 + "ms" } as React.CSSProperties}>
              {t.quote}
            </p>
          </blockquote>
          <figcaption className={"cqt-who" + (animate ? " cqt-in" : "")} style={{ ["--d" as string]: delay + lead + 120 + "ms" } as React.CSSProperties}>
            <span className="cqt-name">{t.name}</span>
            {t.context ? <span className="cqt-ctx">{t.context}</span> : null}
          </figcaption>
        </div>
      </div>
    </figure>
  )
}

export default function CheckerQuiltTestimonials({
  testimonials = DEFAULT_TESTIMONIALS,
  heading = "Back on their feet, in their own words.",
  cta,
  preset = "bottle",
  palette,
  rows = 2,
  autoplay = 8000,
  defaultPage = 0,
  height = "clamp(560px, 76cqi, 1180px)",
  mobileHeight = "min(700px, calc(100svh - 120px))",
  stackBelow = 720,
  quoteFont = '"Iowan Old Style", "Palatino Linotype", Palatino, Charter, "Bitstream Charter", "Sitka Text", Cambria, Georgia, serif',
  uiFont = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Inter, Roboto, sans-serif',
  ariaLabel = "Testimonials",
  onChange,
  className,
  style,
}: CheckerQuiltTestimonialsProps) {
  const list = testimonials.length ? testimonials : DEFAULT_TESTIMONIALS
  const total = list.length
  const pal = { ...(PRESETS[preset] || PRESETS.bottle) }
  if (palette) for (const k of Object.keys(palette) as (keyof QuiltPalette)[]) if (palette[k]) (pal as Record<string, string | undefined>)[k] = palette[k]

  const rootRef = React.useRef(null as HTMLElement | null)
  const [narrow, setNarrow] = React.useState(false)
  const perPage = narrow ? 1 : rows
  const pages = pageCount(total, perPage)

  const startPage = wrap(Math.floor(defaultPage), pages)
  const [page, setPage] = React.useState(startPage)
  const [phase, setPhase] = React.useState("idle" as "idle" | "arm" | "cover" | "reveal")
  const [dir, setDir] = React.useState("next" as "next" | "prev")
  const [fast, setFast] = React.useState(false)
  const [step, setStep] = React.useState(0)
  const [userPaused, setUserPaused] = React.useState(false)
  const [hidden, setHidden] = React.useState(false)
  const [reduced, setReduced] = React.useState(false)
  const [announce, setAnnounce] = React.useState(false)

  const pageRef = React.useRef(startPage)
  const targetRef = React.useRef(startPage)
  const phaseRef = React.useRef("idle")
  const timers = React.useRef([] as number[])
  const perRef = React.useRef(perPage)
  const swipe = React.useRef(null as { x: number; y: number; id: number } | null)

  // Narrow layout follows the component's own width, not the viewport.
  React.useEffect(() => {
    const el = rootRef.current
    if (!el || typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width || el.clientWidth
      setNarrow(w < stackBelow)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [stackBelow])

  React.useEffect(() => {
    if (perRef.current === perPage) return
    const next = remapPage(pageRef.current, perRef.current, perPage, total)
    perRef.current = perPage
    pageRef.current = targetRef.current = next
    setPage(next)
  }, [perPage, total])

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    const vis = () => setHidden(document.visibilityState === "hidden")
    vis()
    document.addEventListener("visibilitychange", vis)
    return () => {
      mq.removeEventListener("change", sync)
      document.removeEventListener("visibilitychange", vis)
      timers.current.forEach((t) => window.clearTimeout(t))
    }
  }, [])

  // Warm the next page's portraits so the reveal shows a face, not a plate.
  React.useEffect(() => {
    const next = itemsOnPage(total, perPage, wrap(page + 1, pages))
    next.forEach((i) => {
      const src = list[i]?.photo
      if (src && !LOADED.has(src)) {
        const im = new Image()
        im.onload = () => LOADED.add(src)
        im.src = src
      }
    })
  }, [page, perPage, pages, total, list])

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }

  const go = React.useCallback(
    (delta: number, fromUser: boolean) => {
      if (pages < 2) return
      if (fromUser) setAnnounce(true)
      targetRef.current = wrap(targetRef.current + delta, pages)
      const commit = () => {
        const p = targetRef.current
        pageRef.current = p
        setPage(p)
        setStep((s) => s + 1)
        onChange?.(p)
      }
      if (reduced) {
        commit()
        return
      }
      if (phaseRef.current === "cover" || phaseRef.current === "arm") return
      const tm = fromUser ? TIMING.user : TIMING.auto
      const stagger = fromUser ? 50 : ROW_STAGGER_MS
      setFast(fromUser)
      setDir(delta < 0 ? "prev" : "next")
      phaseRef.current = "arm"
      setPhase("arm")
      // One frame in the start position, so the narrow sweep enters from the side it travels toward.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          phaseRef.current = "cover"
          setPhase("cover")
          later(() => {
            commit()
            phaseRef.current = "reveal"
            setPhase("reveal")
            later(() => {
              if (phaseRef.current === "reveal") {
                phaseRef.current = "idle"
                setPhase("idle")
              }
            }, tm.reveal + stagger + 120)
          }, tm.cover + stagger)
        }),
      )
    },
    [pages, reduced, onChange],
  )

  const playing = autoplay > 0 && pages > 1 && !userPaused && !reduced
  const running = playing && !hidden

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault()
      go(1, true)
    } else if (e.key === "ArrowLeft") {
      e.preventDefault()
      go(-1, true)
    }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return
    swipe.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
  }
  const onPointerUp = (e: React.PointerEvent) => {
    const s = swipe.current
    swipe.current = null
    if (!s || s.id !== e.pointerId) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.3) go(dx < 0 ? 1 : -1, true)
  }

  const shown = itemsOnPage(total, perPage, page)
  const current = shown.map((i) => list[i])
  const tm = fast ? TIMING.user : TIMING.auto
  const stagger = fast ? 50 : ROW_STAGGER_MS

  const vars = {
    "--cq-a": pal.fieldA,
    "--cq-ia": pal.inkA,
    "--cq-b": pal.fieldB,
    "--cq-ib": pal.inkB,
    "--cq-band": pal.band,
    "--cq-band-ink": pal.bandInk,
    "--cq-plate": pal.plate || "color-mix(in srgb, " + pal.fieldA + " 82%, #ffffff)",
    "--cq-plate-ink": pal.plateInk || pal.inkA,
    "--cq-h": toLen(height),
    "--cq-hm": toLen(mobileHeight),
    "--cq-rows": String(perPage),
    "--cq-auto": Math.max(1000, autoplay) + "ms",
    "--cq-cover-ms": tm.cover + "ms",
    "--cq-reveal-ms": tm.reveal + "ms",
    "--cq-rise-ms": tm.rise + "ms",
    "--cq-qf": quoteFont,
    "--cq-uf": uiFont,
  } as React.CSSProperties

  // Every quote on a page shares one size: the smallest any visible tile can take.
  const quiltRef = React.useRef(null as HTMLDivElement | null)
  const syncSizes = React.useCallback(() => {
    const q = quiltRef.current
    if (!q) return
    const figs = Array.from(q.querySelectorAll(".cqt-quote")) as HTMLElement[]
    const shown = figs.filter((f) => f.offsetParent !== null && f.dataset.fit)
    if (!shown.length) return
    const min = Math.min(...shown.map((f) => Number(f.dataset.fit)))
    shown.forEach((f) => f.style.setProperty("--cq-fs", min + "px"))
  }, [])
  useIsoLayoutEffect(() => {
    syncSizes()
  })

  const headingId = React.useId()
  const scope = '.cqt[data-cq="' + headingId + '"]'

  return (
    <section
      ref={(el) => {
        rootRef.current = el
      }}
      className={"cqt" + (className ? " " + className : "")}
      style={{ ...vars, ...style }}
      data-cq={headingId}
      data-paused={running ? "0" : "1"}
      aria-roledescription="carousel"
      aria-label={heading ? undefined : ariaLabel}
      aria-labelledby={heading ? headingId : undefined}
    >
      <style>{css + stackedCss(scope, stackBelow)}</style>

      <div className="cqt-band">
        {heading ? (
          <h2 id={headingId} className="cqt-heading">
            {heading}
          </h2>
        ) : (
          <span />
        )}
        <div className="cqt-controls">
          {cta ? (
            <a className="cqt-cta" href={cta.href || "#"} onClick={cta.onClick}>
              {cta.label}
              <Arrow dir="next" />
            </a>
          ) : null}
          {pages > 1 ? (
            <>
              <p className="cqt-count" aria-hidden="true">
                <b>{pad2(page + 1)}</b>
                <span> / {pad2(pages)}</span>
              </p>
              <button type="button" className="cqt-btn" data-dir="prev" aria-label="Previous testimonials" onClick={() => go(-1, true)}>
                <Arrow dir="prev" />
              </button>
              {autoplay > 0 && !reduced ? (
                <button
                  type="button"
                  className="cqt-btn"
                  aria-label={userPaused ? "Play testimonials" : "Pause testimonials"}
                  aria-pressed={userPaused}
                  onClick={() => setUserPaused((v) => !v)}
                >
                  <PlayPause playing={!userPaused} />
                </button>
              ) : null}
              <button type="button" className="cqt-btn" data-dir="next" aria-label="Next testimonials" onClick={() => go(1, true)}>
                <Arrow dir="next" />
              </button>
            </>
          ) : null}
        </div>
        {playing ? (
          <div className="cqt-track" aria-hidden="true">
            <div key={page + ":" + step} className="cqt-bar" data-run="1" onAnimationEnd={() => go(1, false)} />
          </div>
        ) : null}
      </div>

      <div
        ref={(el) => {
          quiltRef.current = el
        }}
        className="cqt-quilt"
        role="group"
        tabIndex={0}
        aria-label={"Testimonials " + (page + 1) + " of " + pages + ". Use the arrow keys to move."}
        onKeyDown={onKey}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipe.current = null)}
      >
        {current.map((t, row) => {
          // On a narrow container the pair stacks; quote and photo still trade places each step, under a sideways sweep.
          const side = fieldSide(page, row)
          const photoAt = side === "start" ? "end" : "start"
          const tone = fieldTone(page, row, perPage)
          const fill = tone === "a" ? "var(--cq-a)" : "var(--cq-b)"
          const delay = row * stagger
          const key = page + ":" + shown[row]
          return (
            <div
              key={row}
              className="cqt-row"
              role="group"
              aria-roledescription="slide"
              aria-label={shown[row] + 1 + " of " + total}
              data-side={side}
              data-phase={phase}
              data-dir={dir}
              style={{ background: fill }}
            >
              <div className="cqt-photo" data-at={photoAt}>
                <Portrait key={key} t={t} settle={step > 0 && !reduced} eager={step === 0} />
              </div>
              <div className="cqt-field" aria-hidden="true" style={{ background: fill, transitionDelay: delay + "ms" }} />
              <div className="cqt-sweep" aria-hidden="true" style={{ background: fill }} />
              <QuoteTile
                t={t}
                side={side}
                tone={tone}
                narrow={narrow}
                animate={step > 0 && !reduced}
                delay={delay}
                lead={tm.lead}
                contentKey={key}
                onFitted={syncSizes}
              />
            </div>
          )
        })}
      </div>

      <div className="cqt-sr" aria-live={announce && !running ? "polite" : "off"} aria-atomic="true">
        {current.map((t) => t.name + ": " + t.quote).join(" ")}
      </div>
    </section>
  )
}

// Declared after the JSX: the 21st CLI tokenizer hangs on generics before it.
export type QuiltPaletteInput = Partial<QuiltPalette>
