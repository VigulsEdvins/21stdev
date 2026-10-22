"use client"

import * as React from "react"

/*
 * Glass Fan Testimonials: a featured-reviews section where each quote is a
 * white card set in a square pane of frosted glass, and the panes overlap in a
 * fan, each tilted a little more than the one in front of it. The card at the
 * right is the front of the fan, flat and on top; through its glass you see
 * the ones behind it, softened.
 *
 * The signature is the shuffle. Next lifts the front pane off to the right and
 * tucks it in behind the fan while the others step forward and straighten;
 * prev pulls the back pane out and lays it on top. Clicking a pane further
 * back shuffles it to the front. Hovering a pane parts the fan around it,
 * lifts it, and tilts it towards the pointer with a moving glare.
 *
 * Prev/next, ←/→ on the focused fan, swipe, an avatar strip that jumps to a
 * person, and autoplay with a progress ring that pauses on hover, on focus, off
 * screen, in a hidden tab and with its button. Off under prefers-reduced-motion,
 * where steps swap without travel. On a narrow container the fan closes up into
 * a deck. Every quote shares one type size, fitted so none is ever clipped.
 */

export type GlassFanTheme = "auto" | "light" | "dark"

export type GlassFanTestimonial = {
  quote: string
  name: string
  /** One short line under the name, e.g. "CEO, Northwind". */
  role?: string
  /** Avatar URL. Without one (or if it fails), the avatar shows initials. */
  photo?: string
  alt?: string
  /** 0 to 5, shown with one star as "5.0". Omit to hide. */
  rating?: number
}

export type GlassFanPalette = {
  /** The card inside each pane, its text and its secondary text. */
  paper?: string
  ink?: string
  muted?: string
  /** Hairlines: card ring, divider, buttons. */
  line?: string
  /** The star and the autoplay ring. */
  accent?: string
  /** Section background (only painted when theme is "light" or "dark"). */
  surface?: string
}

export type GlassFanTestimonialsProps = {
  testimonials?: GlassFanTestimonial[]
  /** Small caps line above the heading. Pass null to drop it. */
  eyebrow?: React.ReactNode
  /** Pass null to drop it (then ariaLabel names the section). */
  heading?: React.ReactNode
  /** Average rating shown under the heading, e.g. { rating: 4.9, label: "from 120+ client reviews" }. */
  summary?: { rating: number; label?: string }
  /** Panes visible in the fan at once (2 to 6). Extras wait behind it. */
  visible?: number
  /** Degrees the back pane leans; the panes in between lean less. */
  tilt?: number
  /** Edge of the square glass pane in px on a wide container. Shrinks to fit. */
  cardSize?: number
  /** "auto" follows the host's .dark class on a transparent background; "light" / "dark" paint their own. */
  theme?: GlassFanTheme
  palette?: GlassFanPalette
  /** Pattern behind the fan that the glass softens. */
  backdrop?: "dots" | "grid" | "none"
  /** ms per step; 0 turns autoplay off. */
  autoplay?: number
  /** Testimonial at the front first. */
  defaultIndex?: number
  /** Height of the stage the fan sits on. Defaults to the pane size plus room for the tilt. */
  height?: number | string
  /** Show the avatar strip under the fan. */
  showAvatars?: boolean
  fontFamily?: string
  ariaLabel?: string
  onChange?: (index: number) => void
  className?: string
  style?: React.CSSProperties
}

function QuoteGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z" />
      <path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z" />
    </svg>
  )
}

const STAR_PATH =
  "M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"

function Star({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={STAR_PATH} />
    </svg>
  )
}

function Arrow({ dir }: { dir: "prev" | "next" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
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

// #region logic
export function wrap(i: number, n: number): number {
  return n ? ((i % n) + n) % n : 0
}

/** How far back testimonial i sits when `active` is at the front: 0 is the front pane. */
export function depthOf(i: number, active: number, n: number): number {
  return wrap(i - active, n)
}

/** Signed number of steps from one front card to another, the short way round (ties go forward). */
export function shortestStep(from: number, to: number, n: number): number {
  const fwd = wrap(to - from, n)
  return fwd > n / 2 ? fwd - n : fwd
}

/** Pane edge that fits the container, and the horizontal distance between neighbouring panes. */
export function fanGeometry(width: number, cardSize: number, visible: number): { size: number; step: number } {
  const size = Math.max(220, Math.min(cardSize, width - 56))
  if (visible < 2) return { size, step: 0 }
  // The reference overlaps neighbours by 100px of 340: keep that ratio as the widest spread.
  const maxStep = size * 0.706
  const room = (width - size - 56) / (visible - 1)
  return { size, step: Math.max(14, Math.min(maxStep, room)) }
}

/** How far a pane at this depth leans: 0 at the front, -tilt at the back, eased in between. */
export function leanFor(depth: number, visible: number, tilt: number): number {
  if (visible < 2 || depth <= 0) return 0
  const t = Math.min(1, depth / (visible - 1))
  return -tilt * Math.pow(t, 0.8)
}

export type Pose = { x: number; y: number; r: number; s: number; o: number; z: number }

/** Where a pane sits in the fan. Depths past the last visible one wait, hidden, behind it. */
export function poseFor(depth: number, visible: number, step: number, tilt: number, hoverDepth: number): Pose {
  const v = Math.max(1, visible)
  const shown = Math.min(depth, v - 1)
  const pose: Pose = { x: ((v - 1) / 2 - shown) * step, y: 0, r: leanFor(shown, v, tilt), s: 1, o: 1, z: 100 - depth }
  if (depth >= v) {
    pose.x -= Math.min(28, step * 0.25)
    pose.r -= 3
    pose.s = 0.94
    pose.o = 0
    return pose
  }
  if (hoverDepth >= 0 && hoverDepth < v) {
    // Part the fan around the hovered pane and lift it.
    const gap = Math.min(30, 8 + step * 0.12)
    if (depth > hoverDepth) pose.x -= gap
    else if (depth < hoverDepth) pose.x += gap
    else {
      pose.y = -14
      pose.r *= 0.35
    }
  }
  return pose
}

/** Did this pane go round the back (forward) or come round to the front (back) on a step? */
export function wrapsOn(oldDepth: number, newDepth: number, delta: number): boolean {
  return delta > 0 ? newDepth > oldDepth : delta < 0 ? newDepth < oldDepth : false
}

/** Order a wrapping pane moves in, so a multi-step shuffle deals one pane at a time. */
export function dealOrder(oldDepth: number, delta: number, n: number): number {
  return delta > 0 ? oldDepth : n - 1 - oldDepth
}

/** Largest size in [lo, hi], in half-pixel steps, for which fits() holds (lo if none). */
export function fitSize(lo: number, hi: number, fits: (n: number) => boolean): number {
  let a = Math.round(lo * 2)
  let b = Math.round(hi * 2)
  if (b <= a) return a / 2
  if (fits(b / 2)) return b / 2
  while (b - a > 1) {
    const mid = (a + b) >> 1
    if (fits(mid / 2)) a = mid
    else b = mid
  }
  return a / 2
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return ""
  const first = parts[0][0] || ""
  const last = parts.length > 1 ? parts[parts.length - 1][0] || "" : ""
  return (first + last).toUpperCase()
}

export function formatRating(r: number): string {
  return (Math.round(Math.max(0, Math.min(5, r)) * 10) / 10).toFixed(1)
}

/** A small, sharp avatar from an images.unsplash.com URL; any other host is left alone. */
export function avatarSrc(url: string, px: number): string {
  if (!/^https:\/\/images\.unsplash\.com\//.test(url)) return url
  const base = url.replace(/([?&])w=\d+&?/, "$1").replace(/[?&]$/, "")
  return base + (base.includes("?") ? "&" : "?") + "w=" + px
}

export function pad2(n: number): string {
  return n < 10 ? "0" + n : String(n)
}
// #endregion logic

const U = "https://images.unsplash.com/"
const Q = "?auto=format&fit=crop&crop=faces&w=160&h=160&q=80"

const DEFAULT_TESTIMONIALS: GlassFanTestimonial[] = [
  {
    quote:
      "They took a product nobody could explain in one sentence and gave it a story our sales team now tells from memory. Trial sign-ups doubled the month we launched.",
    name: "Maya Lindqvist",
    role: "Head of Growth, Northwind Freight",
    photo: U + "photo-1438761681033-6461ffad8d80" + Q,
    alt: "Maya Lindqvist",
    rating: 5,
  },
  {
    quote:
      "The rare studio that sweats the details engineers usually skip. Every empty state, every error and every loading frame was thought through before we asked.",
    name: "Daniel Hartmann",
    role: "CTO, Ledgerline",
    photo: U + "photo-1472099645785-5658abf4ff4e" + Q,
    alt: "Daniel Hartmann",
    rating: 5,
  },
  {
    quote:
      "Six weeks from the first workshop to a shipped redesign, and not one milestone slipped. Our board asked who we had hired.",
    name: "Clara Moretti",
    role: "Founder, Fieldnote Health",
    photo: U + "photo-1494790108377-be9c29b29330" + Q,
    alt: "Clara Moretti",
    rating: 5,
  },
  {
    quote:
      "They rebuilt our design system without pausing the roadmap. Screens that used to take a sprint now ship in a day.",
    name: "Tomás Ferreira",
    role: "VP Product, Orbital Pay",
    photo: U + "photo-1507003211169-0a1dd7228f2d" + Q,
    alt: "Tomás Ferreira",
    rating: 4.9,
  },
  {
    quote:
      "Calm, opinionated, and right far more often than not. They talked us out of two features, and both would have been mistakes.",
    name: "Hannah Becker",
    role: "Product Director, Kestrel Maps",
    photo: U + "photo-1544005313-94ddf0286df2" + Q,
    alt: "Hannah Becker",
    rating: 5,
  },
  {
    quote:
      "Checkout conversion went from 2.1% to 3.4% after their audit. The report paid for the whole engagement inside a quarter.",
    name: "Samuel Ward",
    role: "Head of E-commerce, Atlas & Oak",
    photo: U + "photo-1500648767791-00dcc994a43e" + Q,
    alt: "Samuel Ward",
    rating: 5,
  },
]

const css = `
.gft { --gft-ease: cubic-bezier(0.22, 1, 0.36, 1); --gft-paper: #ffffff; --gft-ink: #0a0a0a; --gft-muted: #737373; --gft-line: #e5e5e5; --gft-chip: #f5f5f5; --gft-accent: #fbbf24; --gft-surface: #ffffff; --gft-glass-top: rgba(255, 255, 255, 0.1); --gft-glass-edge: rgba(0, 0, 0, 0.05); --gft-glass-hi: rgba(255, 255, 255, 0.55); --gft-shadow: rgba(0, 0, 0, 0.1); --gft-card-shadow: rgba(0, 0, 0, 0.18); --gft-pattern: rgba(10, 10, 10, 0.11); --gft-head: var(--color-foreground, #0a0a0a); --gft-sub: var(--color-muted-foreground, #737373); position: relative; width: 100%; container-type: inline-size; padding: clamp(56px, 8cqi, 96px) 0 clamp(48px, 6cqi, 80px); color: var(--gft-head); font-family: var(--gft-font); -webkit-font-smoothing: antialiased; overflow: hidden; isolation: isolate; }
.dark .gft[data-theme="auto"], .gft[data-theme="dark"] { --gft-paper: #141416; --gft-ink: #f4f4f5; --gft-muted: #a1a1aa; --gft-line: #2a2a2e; --gft-chip: #1f1f23; --gft-accent: #f5c45b; --gft-surface: #09090b; --gft-glass-top: rgba(255, 255, 255, 0.07); --gft-glass-edge: rgba(255, 255, 255, 0.08); --gft-glass-hi: rgba(255, 255, 255, 0.14); --gft-shadow: rgba(0, 0, 0, 0.45); --gft-card-shadow: rgba(0, 0, 0, 0.6); --gft-pattern: rgba(255, 255, 255, 0.1); }
.gft[data-theme="light"] { --gft-head: #0a0a0a; --gft-sub: #737373; background: var(--gft-surface); }
.gft[data-theme="dark"] { --gft-head: #f4f4f5; --gft-sub: #a1a1aa; background: var(--gft-surface); }
.gft *, .gft *::before, .gft *::after { box-sizing: border-box; }
.gft img { max-width: none; }

.gft-head { text-align: center; padding: 0 20px; margin-bottom: clamp(8px, 2cqi, 24px); }
.gft-eyebrow { margin: 0 0 8px; font-size: 12px; line-height: 16px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--gft-sub); }
.gft-title { margin: 0; font-size: clamp(30px, 4.2cqi, 40px); line-height: 1.08; font-weight: 500; letter-spacing: -0.05em; color: var(--gft-head); text-wrap: balance; }
.gft-summary { display: inline-flex; align-items: center; gap: 10px; margin-top: 16px; font-size: 13px; color: var(--gft-sub); font-variant-numeric: tabular-nums; }
.gft-summary b { color: var(--gft-head); font-weight: 600; }
.gft-stars { position: relative; display: inline-flex; gap: 2px; color: color-mix(in srgb, var(--gft-sub) 35%, transparent); }
.gft-stars-fill { position: absolute; inset: 0 auto 0 0; display: inline-flex; gap: 2px; overflow: hidden; color: var(--gft-accent); white-space: nowrap; }
.gft-stars svg { flex: none; }

.gft-stage { position: relative; height: var(--gft-h); touch-action: pan-y; outline: none; isolation: isolate; }
.gft-stage:focus-visible::after { content: ""; position: absolute; inset: 8px max(12px, calc(50% - var(--gft-span) / 2 - 24px)); border-radius: 24px; outline: 2px solid var(--gft-head); outline-offset: 0; pointer-events: none; }
.gft-pattern { position: absolute; inset: 0; z-index: -1000; pointer-events: none; -webkit-mask-image: radial-gradient(closest-side, #000 30%, transparent 100%); mask-image: radial-gradient(closest-side, #000 30%, transparent 100%); }
.gft-pattern[data-kind="dots"] { background-image: radial-gradient(var(--gft-pattern) 1.1px, transparent 1.6px); background-size: 18px 18px; background-position: center; }
.gft-pattern[data-kind="grid"] { background-image: linear-gradient(var(--gft-pattern) 1px, transparent 1px), linear-gradient(90deg, var(--gft-pattern) 1px, transparent 1px); background-size: 36px 36px; background-position: center; }

.gft-card { position: absolute; left: 50%; top: 50%; width: var(--gft-s); height: var(--gft-s); margin: calc(var(--gft-s) / -2) 0 0 calc(var(--gft-s) / -2); transition: transform 720ms var(--gft-ease) var(--gft-delay, 0ms), opacity 420ms ease var(--gft-delay, 0ms); will-change: transform; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.gft-card[data-depth="0"] { cursor: default; }
.gft-card[data-hidden="1"] { pointer-events: none; }
.gft-tilt { position: absolute; inset: 0; transform: perspective(1100px) rotateX(var(--gft-rx, 0deg)) rotateY(var(--gft-ry, 0deg)); transition: transform 600ms var(--gft-ease); }
.gft-card[data-hover="1"] .gft-tilt { transition: transform 120ms linear; }
.gft-glass { position: absolute; inset: 0; border-radius: 16px; background: linear-gradient(var(--gft-glass-top), transparent); border: 1px solid var(--gft-glass-edge); box-shadow: inset 0 1px 0 var(--gft-glass-hi), 0 25px 25px var(--gft-shadow); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); }
.gft-paper { position: absolute; inset: calc(var(--gft-s) * 0.047); display: flex; flex-direction: column; border-radius: 12px; padding: calc(var(--gft-s) * 0.07); overflow: hidden; color: var(--gft-ink); background: color-mix(in srgb, var(--gft-paper) var(--gft-alpha, 100%), transparent); box-shadow: 0 0 0 1px var(--gft-line), 0 22px 44px -14px var(--gft-card-shadow); transition: background-color 500ms ease; }
.gft-glare { position: absolute; inset: 0; border-radius: 16px; pointer-events: none; opacity: 0; background: radial-gradient(240px circle at var(--gft-gx, 50%) var(--gft-gy, 0%), rgba(255, 255, 255, 0.42), transparent 62%); mix-blend-mode: soft-light; transition: opacity 400ms ease; }
.gft-card[data-hover="1"] .gft-glare { opacity: 1; }
.gft-chip { flex: none; display: inline-grid; place-items: center; width: 32px; height: 32px; border-radius: 8px; background: var(--gft-chip); box-shadow: inset 0 0 0 1px var(--gft-line); color: color-mix(in srgb, var(--gft-ink) 75%, transparent); margin-bottom: 16px; }
.gft-quote { flex: 1 1 auto; min-height: 0; margin: 0; overflow: hidden; }
.gft-quote p { margin: 0; font-size: var(--gft-fs, 14px); line-height: 1.62; letter-spacing: -0.006em; color: var(--gft-ink); text-wrap: pretty; }
.gft-foot { flex: none; display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--gft-line); }
.gft-who { display: flex; align-items: center; gap: 8px; min-width: 0; }
.gft-who > span { min-width: 0; }
.gft-name, .gft-role { display: block; font-size: 12px; line-height: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.gft-name { font-weight: 500; color: var(--gft-ink); }
.gft-role { color: var(--gft-muted); }
.gft-rate { flex: none; display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 500; color: var(--gft-ink); font-variant-numeric: tabular-nums; }
.gft-rate svg { color: var(--gft-accent); }

.gft-avatar { position: relative; flex: none; display: inline-grid; place-items: center; width: var(--gft-av, 24px); height: var(--gft-av, 24px); border-radius: 999px; overflow: hidden; background: var(--gft-chip); color: var(--gft-muted); font-size: calc(var(--gft-av, 24px) * 0.38); font-weight: 600; letter-spacing: 0.02em; }
.gft-avatar img { position: absolute; inset: 0; width: 100%; height: 100%; max-width: none; object-fit: cover; opacity: 0; transition: opacity 300ms ease; }
.gft-avatar img[data-loaded="1"] { opacity: 1; }

.gft-bar { display: flex; align-items: center; justify-content: center; gap: 14px 22px; flex-wrap: wrap; padding: 0 20px; margin-top: clamp(4px, 1.5cqi, 16px); }
.gft-people { display: flex; align-items: center; gap: 8px; padding: 4px; }
.gft-person { --gft-av: 28px; position: relative; display: inline-grid; padding: 0; margin: 0; border: 0; border-radius: 999px; background: none; cursor: pointer; box-shadow: 0 0 0 1px var(--gft-line); transition: transform 360ms var(--gft-ease), box-shadow 200ms ease, filter 200ms ease, opacity 200ms ease; filter: grayscale(0.7); opacity: 0.7; }
.gft-person:hover { transform: translateY(-2px); filter: none; opacity: 1; }
.gft-person[aria-current="true"] { transform: translateY(-2px); filter: none; opacity: 1; box-shadow: 0 0 0 2px var(--gft-surface-ring, var(--gft-paper)), 0 0 0 3.5px var(--gft-head); }
.gft-person:focus-visible { outline: 2px solid var(--gft-head); outline-offset: 5px; }
.gft-count { min-width: 64px; text-align: center; font-size: 13px; letter-spacing: 0.06em; color: var(--gft-sub); font-variant-numeric: tabular-nums; }
.gft-count b { color: var(--gft-head); font-weight: 600; }
.gft-ctrls { display: flex; align-items: center; gap: 8px; }
.gft-btn { position: relative; display: inline-grid; place-items: center; width: 40px; height: 40px; padding: 0; border-radius: 999px; border: 1px solid color-mix(in srgb, var(--gft-head) 14%, transparent); background: color-mix(in srgb, var(--gft-paper) 72%, transparent); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); color: var(--gft-head); cursor: pointer; transition: background-color 200ms ease, border-color 200ms ease, transform 160ms var(--gft-ease); }
.gft-btn svg { transition: transform 260ms var(--gft-ease); }
.gft-btn:hover { background: var(--gft-paper); border-color: color-mix(in srgb, var(--gft-head) 28%, transparent); }
.gft-btn[data-dir="next"]:hover svg { transform: translateX(2px); }
.gft-btn[data-dir="prev"]:hover svg { transform: translateX(-2px); }
.gft-btn:active { transform: scale(0.94); }
.gft-btn:focus-visible { outline: 2px solid var(--gft-head); outline-offset: 3px; }
.gft-ring { position: absolute; inset: -1px; width: 40px; height: 40px; transform: rotate(-90deg); pointer-events: none; }
.gft-ring circle { fill: none; stroke: var(--gft-accent); stroke-width: 2; stroke-linecap: round; stroke-dasharray: 119.4; stroke-dashoffset: 119.4; }
.gft-ring circle[data-run="1"] { animation: gft-progress var(--gft-auto) linear forwards; }
@keyframes gft-progress { from { stroke-dashoffset: 119.4; } to { stroke-dashoffset: 0; } }

.gft-sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }

@media (prefers-reduced-motion: reduce) {
  .gft-card, .gft-tilt, .gft-glare, .gft-person, .gft-btn, .gft-btn svg, .gft-avatar img { transition: none !important; }
  .gft-ring circle[data-run="1"] { animation: none; }
}
`

function toLen(v: number | string): string {
  return typeof v === "number" ? v + "px" : v
}

function transformOf(p: Pose): string {
  return "translate3d(" + p.x.toFixed(2) + "px, " + p.y.toFixed(2) + "px, 0) rotate(" + p.r.toFixed(2) + "deg) scale(" + p.s + ")"
}

const useIsoLayoutEffect = typeof window === "undefined" ? React.useEffect : React.useLayoutEffect

function Avatar({ t, px }: { t: GlassFanTestimonial; px: number }) {
  const [loaded, setLoaded] = React.useState(false)
  const [failed, setFailed] = React.useState(false)
  const ref = React.useRef(null as HTMLImageElement | null)
  useIsoLayoutEffect(() => {
    const el = ref.current
    if (el && el.complete && el.naturalWidth > 0) setLoaded(true)
  }, [t.photo])
  return (
    <span className="gft-avatar" aria-hidden="true">
      {initials(t.name)}
      {t.photo && !failed ? (
        <img
          ref={ref}
          src={avatarSrc(t.photo, px * 3)}
          alt=""
          width={px}
          height={px}
          decoding="async"
          draggable={false}
          data-loaded={loaded ? "1" : "0"}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          style={{ maxWidth: "none" }}
        />
      ) : null}
    </span>
  )
}

function StarRow({ rating }: { rating: number }) {
  const pct = (Math.max(0, Math.min(5, rating)) / 5) * 100
  const five = [0, 1, 2, 3, 4]
  return (
    <span className="gft-stars" aria-hidden="true">
      {five.map((k) => (
        <Star key={k} size={14} />
      ))}
      <span className="gft-stars-fill" style={{ width: pct + "%" }}>
        {five.map((k) => (
          <Star key={k} size={14} />
        ))}
      </span>
    </span>
  )
}

export default function GlassFanTestimonials({
  testimonials = DEFAULT_TESTIMONIALS,
  eyebrow = "Featured reviews",
  heading = "Client highlights",
  summary,
  visible = 3,
  tilt = 10,
  cardSize = 340,
  theme = "auto",
  palette,
  backdrop = "dots",
  autoplay = 6500,
  defaultIndex = 0,
  height,
  showAvatars = true,
  fontFamily,
  ariaLabel,
  onChange,
  className,
  style,
}: GlassFanTestimonialsProps) {
  const items = testimonials
  const n = items.length
  const v = Math.max(1, Math.min(6, Math.round(visible), n || 1))
  const uid = React.useId()
  const headingId = "gft-h" + uid.replace(/:/g, "")

  const [active, setActive] = React.useState(() => wrap(defaultIndex, n))
  const [width, setWidth] = React.useState(1024)
  const [hover, setHover] = React.useState(-1)
  const [stageHover, setStageHover] = React.useState(false)
  const [focusIn, setFocusIn] = React.useState(false)
  const [userPaused, setUserPaused] = React.useState(false)
  const [hiddenTab, setHiddenTab] = React.useState(false)
  const [inView, setInView] = React.useState(true)
  const [reduced, setReduced] = React.useState(false)
  const [runId, setRunId] = React.useState(0)

  const stageRef = React.useRef(null as HTMLDivElement | null)
  const cardRefs = React.useRef([] as (HTMLDivElement | null)[])
  const quoteRefs = React.useRef([] as (HTMLElement | null)[])
  const activeRef = React.useRef(active)
  const pending = React.useRef(null as null | { from: number; delta: number; user: boolean })
  const running = React.useRef([] as { anim: Animation; el: HTMLDivElement; z: string }[])
  const timers = React.useRef([] as number[])
  const swipe = React.useRef(null as null | { x: number; y: number; id: number })
  const onChangeRef = React.useRef(onChange)
  onChangeRef.current = onChange

  // A shorter list can strand the front card past its end.
  React.useEffect(() => {
    if (active >= n && n) setActive(wrap(active, n))
  }, [n, active])
  activeRef.current = active

  const { size, step } = fanGeometry(width, cardSize, v)
  const stageH = height !== undefined ? toLen(height) : Math.round(size * 1.12 + 112) + "px"
  const span = Math.round(size + step * (v - 1) + size * 0.2)

  // Container width drives the fan.
  useIsoLayoutEffect(() => {
    const el = stageRef.current
    if (!el) return
    setWidth(el.clientWidth || 1024)
    const ro = new ResizeObserver(() => setWidth(el.clientWidth || 1024))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    const vis = () => setHiddenTab(document.visibilityState === "hidden")
    vis()
    document.addEventListener("visibilitychange", vis)
    let io: IntersectionObserver | undefined
    if (stageRef.current && "IntersectionObserver" in window) {
      io = new IntersectionObserver((entries) => setInView(entries[0].isIntersecting), { threshold: 0.25 })
      io.observe(stageRef.current)
    }
    return () => {
      mq.removeEventListener("change", sync)
      document.removeEventListener("visibilitychange", vis)
      io?.disconnect()
    }
  }, [])

  // One type size for every quote: the largest that fits the fullest card.
  useIsoLayoutEffect(() => {
    const boxes = quoteRefs.current.slice(0, n).filter(Boolean) as HTMLElement[]
    if (!boxes.length) return
    const hi = Math.min(17, size / 21)
    const lo = 11.5
    let best = hi
    for (const box of boxes) {
      const fits = (px: number) => {
        box.style.setProperty("--gft-fs", px + "px")
        return box.scrollHeight <= box.clientHeight + 0.5
      }
      best = Math.min(best, fitSize(lo, best, fits))
    }
    for (const box of boxes) box.style.setProperty("--gft-fs", best + "px")
  }, [size, items])

  const stopRunning = () => {
    for (const r of running.current) {
      r.anim.cancel()
      r.el.style.transition = ""
      r.el.style.zIndex = r.z
    }
    running.current = []
    for (const t of timers.current) window.clearTimeout(t)
    timers.current = []
  }
  React.useEffect(() => stopRunning, [])

  const go = (delta: number, user: boolean) => {
    if (n < 2 || !delta) return
    stopRunning()
    const from = activeRef.current
    const next = wrap(from + delta, n)
    pending.current = { from, delta, user }
    activeRef.current = next
    setActive(next)
    if (user) setRunId((r) => r + 1)
    onChangeRef.current?.(next)
  }
  const goTo = (i: number) => go(shortestStep(activeRef.current, i, n), true)

  // The shuffle: panes that go round the back (or come round to the front) travel
  // out to the right and back in, instead of sliding through the fan.
  useIsoLayoutEffect(() => {
    const p = pending.current
    pending.current = null
    if (!p || reduced || typeof Element === "undefined" || !Element.prototype.animate) return
    const dur = p.user ? 760 : 920
    const dealGap = Math.min(110, 360 / Math.abs(p.delta))
    const outX = (pose: Pose) => pose.x + size * 0.56
    for (let i = 0; i < n; i++) {
      const el = cardRefs.current[i]
      if (!el) continue
      const od = depthOf(i, p.from, n)
      const nd = depthOf(i, active, n)
      if (!wrapsOn(od, nd, p.delta)) continue
      const from = poseFor(od, v, step, tilt, -1)
      const to = poseFor(nd, v, step, tilt, -1)
      const front = poseFor(0, v, step, tilt, -1)
      const out: Pose = { x: outX(front), y: -size * 0.1, r: tilt * 0.7, s: 1.02, o: 1, z: 0 }
      const delay = dealOrder(od, p.delta, n) * dealGap
      const finalZ = String(to.z)
      const forward = p.delta > 0
      el.style.transition = "none"
      // Going round the back: stay on top while lifting out, then drop behind.
      // Coming to the front: stay behind until clear of the fan, then rise.
      el.style.zIndex = forward ? String(300 - dealOrder(od, p.delta, n)) : String(from.z)
      const anim = el.animate(
        [
          { transform: transformOf(from), opacity: from.o },
          { transform: transformOf(out), opacity: 1, offset: forward ? 0.42 : 0.52 },
          { transform: transformOf(to), opacity: to.o },
        ],
        { duration: dur, delay, easing: "cubic-bezier(0.65, 0, 0.35, 1)", fill: "backwards" },
      )
      const entry = { anim, el, z: finalZ }
      running.current.push(entry)
      timers.current.push(
        window.setTimeout(() => {
          el.style.zIndex = forward ? String(-dealOrder(od, p.delta, n)) : String(300 + dealOrder(od, p.delta, n))
        }, delay + dur * (forward ? 0.46 : 0.5)),
      )
      anim.onfinish = () => {
        el.style.transition = ""
        el.style.zIndex = finalZ
        running.current = running.current.filter((r) => r !== entry)
      }
    }
  }, [active])

  const paused = userPaused || stageHover || focusIn || hiddenTab || !inView || reduced
  const autoOn = autoplay > 0 && n > 1

  React.useEffect(() => {
    if (!autoOn || paused) return
    const t = window.setTimeout(() => go(1, false), autoplay)
    return () => window.clearTimeout(t)
  }, [autoOn, paused, active, autoplay, runId])

  // Restart the ring when autoplay resumes, so it always shows the time actually left.
  const wasPaused = React.useRef(paused)
  React.useEffect(() => {
    if (wasPaused.current && !paused) setRunId((r) => r + 1)
    wasPaused.current = paused
  }, [paused])

  // Pointer tilt and glare on the hovered pane, written straight to its style.
  const onCardMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || reduced) return
    const tiltEl = e.currentTarget.querySelector(".gft-tilt") as HTMLElement | null
    if (!tiltEl) return
    const r = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    tiltEl.style.setProperty("--gft-ry", ((px - 0.5) * 9).toFixed(2) + "deg")
    tiltEl.style.setProperty("--gft-rx", ((0.5 - py) * 9).toFixed(2) + "deg")
    tiltEl.style.setProperty("--gft-gx", (px * 100).toFixed(1) + "%")
    tiltEl.style.setProperty("--gft-gy", (py * 100).toFixed(1) + "%")
  }
  const onCardLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    const tiltEl = e.currentTarget.querySelector(".gft-tilt") as HTMLElement | null
    if (tiltEl) {
      tiltEl.style.setProperty("--gft-rx", "0deg")
      tiltEl.style.setProperty("--gft-ry", "0deg")
    }
    setHover(-1)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault()
      go(1, true)
    } else if (e.key === "ArrowLeft") {
      e.preventDefault()
      go(-1, true)
    } else if (e.key === "Home") {
      e.preventDefault()
      goTo(0)
    } else if (e.key === "End") {
      e.preventDefault()
      goTo(n - 1)
    }
  }

  // Swipe: the fan follows the finger, so a swipe to the right deals the next card.
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
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) go(dx > 0 ? 1 : -1, true)
  }

  const hoverDepth = hover >= 0 ? depthOf(hover, active, n) : -1
  const current = items[active]

  const vars = {
    "--gft-s": size + "px",
    "--gft-h": stageH,
    "--gft-span": span + "px",
    "--gft-auto": autoplay + "ms",
    "--gft-font": fontFamily || "inherit",
  } as { [k: string]: string }
  if (palette?.paper) vars["--gft-paper"] = palette.paper
  if (palette?.ink) vars["--gft-ink"] = palette.ink
  if (palette?.muted) vars["--gft-muted"] = palette.muted
  if (palette?.line) vars["--gft-line"] = palette.line
  if (palette?.accent) vars["--gft-accent"] = palette.accent
  if (palette?.surface) vars["--gft-surface"] = palette.surface

  if (!n) return null

  return (
    <section
      className={"gft" + (className ? " " + className : "")}
      data-theme={theme}
      aria-labelledby={heading != null ? headingId : undefined}
      aria-label={heading == null ? ariaLabel || "Testimonials" : undefined}
      style={{ ...(vars as React.CSSProperties), ...style }}
    >
      <style>{css}</style>

      {eyebrow != null || heading != null || summary ? (
        <header className="gft-head">
          {eyebrow != null ? <p className="gft-eyebrow">{eyebrow}</p> : null}
          {heading != null ? (
            <h2 id={headingId} className="gft-title">
              {heading}
            </h2>
          ) : null}
          {summary ? (
            <div className="gft-summary">
              <StarRow rating={summary.rating} />
              <span>
                <b>{formatRating(summary.rating)}</b>
                {summary.label ? " " + summary.label : null}
              </span>
              <span className="gft-sr">Average rating {formatRating(summary.rating)} out of 5</span>
            </div>
          ) : null}
        </header>
      ) : null}

      <div
        ref={stageRef}
        className="gft-stage"
        role="group"
        aria-roledescription="carousel"
        aria-label={ariaLabel || "Testimonials, use the arrow keys to shuffle"}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onFocus={() => setFocusIn(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusIn(false)
        }}
        onPointerEnter={(e) => e.pointerType === "mouse" && setStageHover(true)}
        onPointerLeave={() => {
          setStageHover(false)
          setHover(-1)
        }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipe.current = null)}
      >
        {backdrop !== "none" ? <div className="gft-pattern" data-kind={backdrop} aria-hidden="true" /> : null}

        {items.map((t, i) => {
          const depth = depthOf(i, active, n)
          const pose = poseFor(depth, v, step, tilt, hoverDepth)
          const hidden = depth >= v
          // The front card is the most see-through, so the fan reads through its glass;
          // closed up into a deck, the cards behind would only muddy it.
          const alpha = step < size * 0.5 || depth > 1 ? 100 : depth === 0 ? 93 : 97
          return (
            <div
              key={i}
              ref={(el) => {
                cardRefs.current[i] = el
              }}
              className="gft-card"
              data-depth={depth}
              data-hidden={hidden ? "1" : undefined}
              data-hover={hover === i ? "1" : undefined}
              aria-hidden={depth !== 0 ? true : undefined}
              style={
                {
                  transform: transformOf(pose),
                  opacity: pose.o,
                  zIndex: pose.z,
                  "--gft-delay": Math.min(depth, v) * 28 + "ms",
                  "--gft-alpha": alpha + "%",
                } as React.CSSProperties
              }
              onClick={() => {
                if (depth > 0 && !hidden) go(depth, true)
              }}
              onPointerEnter={(e) => {
                if (e.pointerType === "mouse" && !hidden) setHover(i)
              }}
              onPointerMove={onCardMove}
              onPointerLeave={onCardLeave}
            >
              <div className="gft-tilt">
                <div className="gft-glass" />
                <figure className="gft-paper" style={{ margin: 0 }}>
                  <span className="gft-chip" aria-hidden="true">
                    <QuoteGlyph />
                  </span>
                  <blockquote
                    className="gft-quote"
                    ref={(el) => {
                      quoteRefs.current[i] = el
                    }}
                  >
                    <p>{t.quote}</p>
                  </blockquote>
                  <figcaption className="gft-foot">
                    <span className="gft-who">
                      <Avatar t={t} px={24} />
                      <span>
                        <span className="gft-name">{t.name}</span>
                        {t.role ? <span className="gft-role">{t.role}</span> : null}
                      </span>
                    </span>
                    {t.rating != null ? (
                      <span className="gft-rate">
                        <Star size={16} />
                        <span aria-hidden="true">{formatRating(t.rating)}</span>
                        <span className="gft-sr">Rated {formatRating(t.rating)} out of 5</span>
                      </span>
                    ) : null}
                  </figcaption>
                </figure>
                <div className="gft-glare" />
              </div>
            </div>
          )
        })}
      </div>

      {n > 1 ? (
        <div className="gft-bar">
          {showAvatars ? (
            <div className="gft-people" role="group" aria-label="Choose a review">
              {items.map((t, i) => (
                <button
                  key={i}
                  type="button"
                  className="gft-person"
                  aria-label={"Show " + t.name + "'s review"}
                  aria-current={i === active ? "true" : undefined}
                  onClick={() => goTo(i)}
                >
                  <Avatar t={t} px={30} />
                </button>
              ))}
            </div>
          ) : null}
          <div className="gft-ctrls">
            <button type="button" className="gft-btn" data-dir="prev" aria-label="Previous review" onClick={() => go(-1, true)}>
              <Arrow dir="prev" />
            </button>
            <span className="gft-count" aria-hidden="true">
              <b>{pad2(active + 1)}</b> / {pad2(n)}
            </span>
            <button type="button" className="gft-btn" data-dir="next" aria-label="Next review" onClick={() => go(1, true)}>
              {autoOn && !reduced ? (
                <svg className="gft-ring" viewBox="0 0 40 40" aria-hidden="true">
                  <circle key={active + "-" + runId} cx="20" cy="20" r="19" data-run={paused ? undefined : "1"} />
                </svg>
              ) : null}
              <Arrow dir="next" />
            </button>
            {autoOn && !reduced ? (
              <button
                type="button"
                className="gft-btn"
                aria-label={userPaused ? "Play testimonials" : "Pause testimonials"}
                aria-pressed={userPaused}
                onClick={() => setUserPaused((p) => !p)}
              >
                {userPaused ? (
                  <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true">
                    <path d="M4 2.6v8.8a.6.6 0 0 0 .9.5l7-4.4a.6.6 0 0 0 0-1L4.9 2.1a.6.6 0 0 0-.9.5Z" fill="currentColor" />
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true">
                    <rect x="3" y="2.5" width="2.6" height="9" rx="0.6" fill="currentColor" />
                    <rect x="8.4" y="2.5" width="2.6" height="9" rx="0.6" fill="currentColor" />
                  </svg>
                )}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <p className="gft-sr" aria-live="polite" aria-atomic="true">
        {"Review " + (active + 1) + " of " + n + ": " + current.name + (current.role ? ", " + current.role : "")}
      </p>
    </section>
  )
}
