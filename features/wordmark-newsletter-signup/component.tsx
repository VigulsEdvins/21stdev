"use client"

import * as React from "react"
import { createPortal } from "react-dom"

/*
 * Wordmark Newsletter Signup: a newsletter signup for a brand that is loud
 * about its name. The brand wordmark fills the field edge to edge in heavy
 * condensed capitals, cropped by the section like a shop sign, and a
 * hard-bordered card sits on top of it with the form.
 *
 * The wordmark is SVG text in system fonts. Each line is measured on a canvas
 * and scaled to the full width, then stretched upright so any heavy system
 * face reads as a condensed display cut. The line count is chosen for the
 * box, so a phone gets more, shorter lines.
 *
 * The signature: on a valid signup the wordmark letters drop out one by one
 * and the confirmation word drops in, letter by letter, in the brand's place.
 * The modal plays the same drop as its entrance.
 *
 * A real form: a labelled email field set in display type that shrinks as the
 * address grows, optional topic chips, a consent box that can be required,
 * async onSubscribe with pending, error (aria-live) and success states.
 * Three layouts: a full section, a popup (focus trap, Escape, scroll lock,
 * focus return) and a compact band that sits above a footer. Four presets
 * with a designed dark version each, or your own palette.
 */

export type WordmarkPreset = "sauce" | "pickle" | "mustard" | "blueberry"

export type WordmarkPalette = {
  /** Section background. */
  ground: string
  /** Wordmark letters. */
  mark: string
  /** Card background. */
  paper: string
  /** Card borders and text. */
  ink: string
  /** Button fill, focus ring, checkbox. */
  accent: string
  /** Text on the button. */
  onAccent: string
  /** Card headline. Defaults to the accent. */
  headline?: string
}

export type SubscribeData = { email: string; topics: string[]; consent: boolean }

export type WordmarkNewsletterSignupProps = {
  /** The wordmark. Use "\n" (or an array) to fix the lines, otherwise the words are split to fill the box. */
  brand?: string | string[]
  /** What the wordmark becomes after a signup. Same rules as `brand`. */
  successWord?: string | string[]
  /** Card headline. Set in capitals. */
  headline?: string
  /** One or two short sentences under the headline. */
  description?: React.ReactNode
  emailLabel?: string
  placeholder?: string
  buttonLabel?: string
  pendingLabel?: string
  /** Topic chips the reader can pick. Omit for none. */
  topics?: string[]
  defaultTopics?: string[]
  topicsLabel?: string
  /** Consent line next to the checkbox. null hides the checkbox. */
  consent?: React.ReactNode | null
  /** The form refuses to send until the box is ticked. Defaults to true when there is a checkbox. */
  requireConsent?: boolean
  /** Small social proof under the button, e.g. "18,240 cooks read it". */
  proof?: React.ReactNode
  successTitle?: string
  /** Shown after a signup. A function gets the address. */
  successCopy?: React.ReactNode | ((email: string) => React.ReactNode)
  resetLabel?: string
  /** Every built-in message, for other languages or another voice. */
  messages?: WnsMessagesInput
  /** Play the letter drop when the section first scrolls into view ("view"), on mount, or never. */
  intro?: "view" | "mount" | false
  /** Where the success state leads next, e.g. the latest issue. Set as a hard-bordered button. */
  successAction?: { label: string; href: string } | null
  /**
   * Called with the address, topics and consent. Return (or resolve) to show the success state;
   * throw (or reject) with an Error to show its message. Without it the form succeeds after a short pause.
   */
  onSubscribe?: (data: SubscribeData) => void | Promise<unknown>
  /** "section": full field with the card on top. "modal": popup over the page. "band": compact strip above a footer. */
  variant?: "section" | "modal" | "band"
  /** Modal, controlled. */
  open?: boolean
  /** Modal, uncontrolled. */
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  preset?: WordmarkPreset
  /** Override the preset's light colours. */
  palette?: WordmarkPaletteInput
  /** Override the preset's dark colours. */
  darkPalette?: WordmarkPaletteInput
  /** "auto" follows a `.dark` class on any ancestor (shadcn / Tailwind convention). */
  theme?: "auto" | "light" | "dark"
  /** Section minimum height. Any definite CSS length. */
  height?: number | string
  /** Most lines the wordmark may break into. */
  maxLines?: number
  /** How far the last wordmark line drops past the bottom edge, as a fraction of its height (0 to 0.5). */
  crop?: number
  /** Modal: "wordmark" fills the screen with the brand; "dim" darkens the page behind the card. */
  backdrop?: "wordmark" | "dim"
  /** Optional photo tile beside the card (section only, wide screens). */
  image?: { src: string; alt: string } | null
  /** Font stacks. Pass your own, e.g. "var(--font-display)". The wordmark wants a heavy face. */
  displayFont?: string
  textFont?: string
  ariaLabel?: string
  className?: string
  style?: React.CSSProperties
}

const PRESETS: { [k: string]: { light: WordmarkPalette; dark: WordmarkPalette } } = {
  sauce: {
    light: { ground: "#f6c6b8", mark: "#c4111b", paper: "#ffffff", ink: "#0e0e0e", accent: "#d80f1a", onAccent: "#ffffff" },
    dark: { ground: "#151212", mark: "#a50c15", paper: "#0b0b0b", ink: "#f3efe9", accent: "#ff4249", onAccent: "#0b0b0b" },
  },
  pickle: {
    light: { ground: "#dfe6cf", mark: "#1f6b34", paper: "#ffffff", ink: "#0d1a10", accent: "#1f6b34", onAccent: "#ffffff" },
    dark: { ground: "#0c1a10", mark: "#2b8a45", paper: "#08110a", ink: "#e9f2e4", accent: "#7fd28f", onAccent: "#08110a" },
  },
  mustard: {
    light: { ground: "#141414", mark: "#f2b705", paper: "#ffffff", ink: "#111111", accent: "#f2b705", onAccent: "#111111", headline: "#111111" },
    dark: { ground: "#0c0c0c", mark: "#e0a800", paper: "#141414", ink: "#f5f1e6", accent: "#f2b705", onAccent: "#141414" },
  },
  blueberry: {
    light: { ground: "#c9cfe4", mark: "#2731c8", paper: "#ffffff", ink: "#0b0c1a", accent: "#2731c8", onAccent: "#ffffff" },
    dark: { ground: "#0b0d22", mark: "#2c37d6", paper: "#070815", ink: "#e8eaff", accent: "#8c95ff", onAccent: "#070815" },
  },
}

// Set condensed: Helvetica Neue resolves to its Condensed Black on Apple systems and Roboto Condensed
// where installed. Arial Black comes before Arial Narrow, which has no heavy weight. Elsewhere the
// heavy fallbacks are measured and stretched upright. Pass a real condensed face as displayFont.
const MESSAGES = {
  required: "Enter your email address.",
  invalid: "That address is missing something. Try name@domain.com.",
  consent: "Tick the box below so we're allowed to send it.",
  failed: "We couldn't sign you up just now. Try again in a moment.",
  close: "Close",
}

const DISPLAY_FONT = '"Helvetica Neue", "Roboto Condensed", "Arial Black", "Arial Narrow", Inter, "Liberation Sans", Arial, sans-serif'
const TEXT_FONT = '"Helvetica Neue", Helvetica, Inter, "Liberation Sans", Arial, sans-serif'

// #region logic
export function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[^\s@.]{2,}$/.test(s.trim())
}

/** Display size for the email field: full size while it fits, then shrinks with the address down to a floor. */
export function emailFontSize(length: number, max = 26, min = 14, fits = 17): number {
  if (length <= fits) return max
  return Math.max(min, Math.round(((max * fits) / length) * 10) / 10)
}

export function toLines(input: string | string[]): string[] | null {
  if (Array.isArray(input)) return input.map((l) => l.trim().toUpperCase()).filter(Boolean)
  if (input.includes("\n")) return input.split("\n").map((l) => l.trim().toUpperCase()).filter(Boolean)
  return null
}

/** Every way to cut the words into n contiguous lines. */
export function partitions(words: string[], n: number): string[][] {
  if (n === 1) return [[words.join(" ")]]
  const out: string[][] = []
  for (let i = 1; i <= words.length - n + 1; i++) {
    for (const rest of partitions(words.slice(i), n - 1)) out.push([words.slice(0, i).join(" "), ...rest])
  }
  return out
}

export type WordmarkLine = { text: string; x0: number; y0: number; sx: number; sy: number; xs: number[] }
export type WordmarkLayout = { lines: WordmarkLine[]; cap: number; height: number; capU: number }
export type WordmarkOptions = {
  maxLines: number
  /** "fill": first line at the top, last line cropped at the bottom edge, the card between. "band": a stack in the flow that reports its own height. */
  mode: "fill" | "band"
  /** Upright stretch range (cap height against width). Above about 1.35 a regular face starts to look distorted. */
  minRatio: number
  maxRatio: number
  /** Gap between lines, as a fraction of the cap height. */
  gap: number
  padX: number
  padY: number
  /** Fill only: how far the last line drops below the bottom edge, as a fraction of the cap height. */
  crop: number
  /** Shortest line against the longest. Splits less even than this are skipped, so no lone "IN" or "CO." line. */
  balance: number
  /** Band only: the tallest the stack may grow. */
  maxHeight?: number
  /** Band only: cap height ceiling, so a short word cannot grow taller than the name it replaces. */
  maxCap?: number
}

/** Clip window of each line, in cap heights: room above for accents (É, Ü), below for Q and commas. */
export const CLIP_TOP = 0.32
export const CLIP_BOTTOM = 1.14
/** The window while letters move: cap line to baseline, plus a hair below for the settle of incoming letters. */
export const SETTLE_CLIP = 0.03
/** How far letters travel out of and into their line. Clears the clip window both ways. */
export const DROP = 1.5

/**
 * Lays the wordmark out in a box. `measure` returns a string's advance at 100px, `capU` the cap
 * height at 100px. The longest line spans the width and every line shares one size, stretched
 * upright inside [minRatio, maxRatio]. Without fixed lines, the even split with the biggest
 * capitals wins; ties go to fewer lines.
 */
export function layoutWordmark(
  input: string | string[],
  box: { w: number; h: number },
  measure: (s: string) => number,
  capU: number,
  o: WordmarkOptions,
): WordmarkLayout {
  const fixed = toLines(input)
  const words = String(Array.isArray(input) ? input.join(" ") : input).trim().toUpperCase().split(/\s+/).filter(Boolean)
  const W = Math.max(1, box.w - 2 * o.padX)
  const stackH = (n: number, cap: number) => n * cap + (n - 1) * cap * o.gap

  const fit = (lines: string[]) => {
    const n = lines.length
    let sx = W / Math.max(1, ...lines.map(measure))
    let sy = sx * o.maxRatio
    // Too tall for its box: give up stretch first, then size.
    const room = o.mode === "fill" ? box.h - 2 * o.padY : (o.maxHeight ?? Infinity)
    if (stackH(n, sy * capU) > room) {
      sy = Math.max(sx * o.minRatio, room / (n + (n - 1) * o.gap) / capU)
      if (stackH(n, sy * capU) > room) {
        sy = room / (n + (n - 1) * o.gap) / capU
        sx = sy / o.minRatio
      }
    }
    if (o.maxCap && sy * capU > o.maxCap) {
      sy = o.maxCap / capU
      sx = Math.min(sx, sy / o.minRatio)
    }
    return { lines, sx, sy, cap: sy * capU }
  }

  let best = fit(fixed ?? [words.join(" ") || " "])
  if (!fixed) {
    for (let n = 2; n <= Math.min(o.maxLines, words.length); n++) {
      let bestN: ReturnType<typeof fit> | null = null
      let bestEven = 0
      for (const p of partitions(words, n)) {
        const widths = p.map(measure)
        const even = Math.min(...widths) / Math.max(...widths)
        if (even < o.balance) continue
        if (even > bestEven) {
          bestEven = even
          bestN = fit(p)
        }
      }
      if (bestN && bestN.cap > best.cap * 1.04) best = bestN
    }
  }

  // One line alone in a tall field would leave it lopsided; it is set twice, top and bottom, like a sign.
  if (o.mode === "fill" && best.lines.length === 1 && box.h - 2 * o.padY > 2.4 * best.cap) best = { ...best, lines: [best.lines[0], best.lines[0]] }
  const n = best.lines.length
  const cap = best.cap
  const total = stackH(n, cap)
  let height = box.h
  let ys: number[]
  if (o.mode === "band") {
    height = total + 2 * o.padY
    ys = best.lines.map((_, i) => o.padY + i * cap * (1 + o.gap))
  } else {
    // A frame: first line on top, last line dropped past the bottom edge, the rest spread between.
    const last = Math.max(o.padY + (n - 1) * cap * (1 + o.gap), box.h - o.padY - cap + o.crop * cap)
    ys = best.lines.map((_, i) => (n === 1 ? o.padY : o.padY + ((last - o.padY) * i) / (n - 1)))
  }
  const lines = best.lines.map((text, i) => {
    const xs: number[] = []
    // Each glyph ends where its kerned prefix ends, so pairs like "TA" keep their kerning.
    for (let k = 0; k < text.length; k++) xs.push(k === 0 ? 0 : measure(text.slice(0, k + 1)) - measure(text[k]))
    return { text, x0: (box.w - measure(text) * best.sx) / 2, y0: ys[i], sx: best.sx, sy: best.sy, xs }
  })
  return { lines, cap, height, capU }
}

/** Order letters left to right, line by line, skipping spaces. */
export function letterOrder(lines: string[]): number[][] {
  let k = 0
  return lines.map((t) => t.split("").map((c) => (c === " " ? -1 : k++)))
}

function channel(v: number) {
  const s = v / 255
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

export function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const m = /^#([0-9a-f]{6})$/i.exec(hex)
    if (!m) return NaN
    const n = parseInt(m[1], 16)
    return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  }
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

/** First colour that reads at 4.5:1 on the ground, else the one that reads best. Non-hex colours pass through. */
export function pickReadable(ground: string, options: string[], min = 4.5): string {
  let best = options[0]
  let bestC = -1
  for (const c of options) {
    const r = contrast(c, ground)
    if (Number.isNaN(r)) return options[0]
    if (r >= min) return c
    if (r > bestC) {
      bestC = r
      best = c
    }
  }
  return best
}
// #endregion

const CSS = `
.wns, .wns *, .wns *::before, .wns *::after { box-sizing: border-box; }
.wns {
  --g: var(--wl-ground); --m: var(--wl-mark); --p: var(--wl-paper); --k: var(--wl-ink); --a: var(--wl-accent); --oa: var(--wl-onAccent); --hl: var(--wl-headline); --u: var(--wl-under); --r: var(--wl-ring);
  --wns-out: cubic-bezier(0.23, 1, 0.32, 1);
  --wns-settle: cubic-bezier(0.2, 1.22, 0.36, 1);
  position: relative; width: 100%; background: var(--g); color: var(--k);
  font-family: var(--wns-text); overflow: hidden; isolation: isolate;
  -webkit-font-smoothing: antialiased;
}
:where(.dark) .wns[data-theme="auto"], .wns[data-theme="dark"] {
  --g: var(--wd-ground); --m: var(--wd-mark); --p: var(--wd-paper); --k: var(--wd-ink); --a: var(--wd-accent); --oa: var(--wd-onAccent); --hl: var(--wd-headline); --u: var(--wd-under); --r: var(--wd-ring);
}
.wns ::selection { background: var(--a); color: var(--oa); }
.wns-section { min-height: var(--wns-h); display: grid; place-items: center; padding: clamp(72px, 9vw, 120px) 16px; }
.wns-mark { position: absolute; inset: 0; z-index: 0; pointer-events: none; font-family: var(--wns-display); }
.wns-mark svg { display: block; width: 100%; height: 100%; overflow: visible; max-width: none; }
.wns-mark text { fill: var(--m); font-weight: 900; font-size: 100px; font-stretch: condensed; }
.wns-mark[data-stretch="normal"] text { font-stretch: normal; }
.wns-letter { transform: translateY(0); }
.wns-letter[data-phase="out"] { transform: translateY(var(--drop)); transition: transform 300ms cubic-bezier(0.5, 0, 0.75, 0.3); }
.wns-letter[data-phase="pre"] { transform: translateY(calc(var(--drop) * -1)); transition: none; }
.wns-letter[data-phase="in"] { transform: translateY(0); transition: transform 560ms var(--wns-settle); }

.wns-card {
  position: relative; z-index: 2; width: min(500px, 100%); background: var(--p); color: var(--k);
  border: 3px solid var(--k); padding: clamp(28px, 4vw, 44px) clamp(20px, 3.4vw, 40px) clamp(24px, 3vw, 32px);
}
.wns-photo {
  position: absolute; z-index: 1; left: clamp(24px, 6vw, 110px); top: clamp(48px, 9vh, 120px);
  width: clamp(160px, 19vw, 300px); aspect-ratio: 4 / 5; border: 3px solid var(--k); background: var(--p); overflow: hidden;
}
.wns-photo img { display: block; width: 100%; height: 100%; max-width: none; object-fit: cover; }
@media (max-width: 1023px) { .wns-photo { display: none; } }

.wns-h { margin: 0; color: var(--hl); font-family: var(--wns-text); font-weight: 700; text-transform: uppercase; text-align: center;
  font-size: clamp(28px, 3.1vw, 42px); line-height: 0.98; letter-spacing: -0.012em; text-wrap: balance; }
.wns-h:focus { outline: none; }
.wns-desc { margin: 14px auto 0; max-width: 34ch; text-align: center; font-size: 15px; line-height: 1.45; color: var(--k); opacity: 0.82; text-wrap: pretty; }
.wns-form { margin: 26px 0 0; display: grid; gap: 16px; }
.wns-field { position: relative; display: block; border: 3px solid var(--k); background: var(--p); padding: 9px 14px 8px; cursor: text;
  transition: box-shadow 160ms ease; }
.wns-field:focus-within { box-shadow: 0 0 0 3px var(--p), 0 0 0 6px var(--r); }
.wns-field[data-invalid="true"]:focus-within { box-shadow: 0 0 0 2px var(--p), 0 0 0 4px var(--r); }
.wns-field[data-invalid="true"] { border-color: var(--a); }
.wns-label { display: block; font-size: 11px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; line-height: 1; }
.wns-input { display: block; width: 100%; margin: 6px 0 0; padding: 0; border: 0; outline: 0; background: transparent; color: var(--k);
  font-family: var(--wns-text); font-weight: 700; letter-spacing: -0.01em; line-height: 1.15; height: 34px;
  border-radius: 0; -webkit-appearance: none; appearance: none; }
.wns-input::placeholder { color: var(--k); opacity: 0.38; text-transform: uppercase; }
.wns-input[readonly] { opacity: 0.6; }
.wns-btn[aria-disabled="true"] { cursor: progress; }
.wns-card:focus { outline: none; }

.wns-topics { border: 0; margin: 0; padding: 0; min-width: 0; }
.wns-topics legend { padding: 0; margin: 0 0 8px; font-size: 11px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; }
.wns-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.wns-chip { appearance: none; border: 2px solid var(--k); background: transparent; color: var(--k); font: inherit; font-size: 12px; font-weight: 700;
  letter-spacing: 0.06em; text-transform: uppercase; padding: 8px 12px 7px; min-height: 36px; cursor: pointer; display: inline-flex; align-items: center; gap: 7px;
  transition: background-color 140ms ease, color 140ms ease, transform 120ms ease; }
.wns-chip svg { width: 10px; height: 10px; transition: transform 200ms var(--wns-out); }
.wns-chip[aria-pressed="true"] { background: var(--k); color: var(--p); }
.wns-chip:active { transform: translateY(1px); }

.wns-consent { display: grid; grid-template-columns: 22px 1fr; gap: 12px; align-items: start; font-size: 11.5px; line-height: 1.35;
  letter-spacing: 0.02em; text-transform: uppercase; cursor: pointer; }
.wns-box { appearance: none; -webkit-appearance: none; margin: 0; width: 22px; height: 22px; border: 2px solid var(--k); background: var(--p);
  display: grid; place-items: center; cursor: pointer; border-radius: 0; transition: background-color 120ms ease; }
.wns-box::after { content: ""; width: 10px; height: 6px; border-left: 3px solid var(--oa); border-bottom: 3px solid var(--oa);
  transform: translateY(-2px) rotate(-45deg) scale(0.6); opacity: 0; transition: transform 180ms var(--wns-out), opacity 120ms ease; }
.wns-box:checked { background: var(--a); border-color: var(--k); }
.wns-box:checked::after { opacity: 1; transform: translateY(-2px) rotate(-45deg) scale(1); }
.wns-consent[data-invalid="true"] .wns-box { border-color: var(--a); box-shadow: 0 0 0 2px var(--a); }

.wns-btn { position: relative; appearance: none; width: 100%; min-height: 62px; border: 3px solid var(--k); background: var(--a); color: var(--oa);
  font-family: var(--wns-text); font-weight: 700; font-size: 22px; letter-spacing: 0.01em; text-transform: uppercase; cursor: pointer;
  overflow: hidden; border-radius: 0; transition: transform 120ms ease; }
.wns-btn::before { content: ""; position: absolute; inset: 0; background: var(--k); clip-path: inset(100% 0 0 0);
  transition: clip-path 250ms var(--wns-out); }
.wns-btn:active:not([aria-disabled="true"]) { transform: translateY(2px); }
.wns-roll { position: relative; display: block; height: 1.15em; overflow: hidden; line-height: 1.15; transition: color 200ms ease; }
.wns-roll span { display: block; transition: transform 250ms var(--wns-out); }
@media (hover: hover) and (pointer: fine) {
  .wns-btn:hover:not([aria-disabled="true"]) .wns-roll span { transform: translateY(-100%); }
  .wns-btn:hover:not([aria-disabled="true"])::before { clip-path: inset(0 0 0 0); }
  .wns-btn:hover:not([aria-disabled="true"]) .wns-roll { color: var(--p); }
  .wns-chip:hover { background: color-mix(in srgb, var(--k) 10%, transparent); }
  .wns-chip[aria-pressed="true"]:hover { background: var(--k); }
  .wns-link:hover { text-decoration-thickness: 3px; }
  .wns-x:hover svg { transform: rotate(90deg); }
}
.wns-btn[aria-busy="true"]::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 4px; background: var(--k);
  transform-origin: left; animation: wns-bar 1100ms cubic-bezier(0.65, 0, 0.35, 1) infinite; }
@keyframes wns-bar { 0% { transform: scaleX(0); } 60% { transform: scaleX(1); transform-origin: left; } 61% { transform-origin: right; } 100% { transform: scaleX(0); transform-origin: right; } }

.wns-status { min-height: 0; font-size: 13px; font-weight: 700; line-height: 1.35; display: flex; gap: 8px; align-items: flex-start; }
.wns-fieldwrap { position: relative; }
.wns-fieldwrap .wns-status { position: absolute; left: 0; right: 0; top: calc(100% + 6px); z-index: 1; }
.wns-fieldwrap[data-error="true"] { margin-bottom: 18px; }
.wns-status i { flex: none; width: 16px; height: 16px; margin-top: 1px; background: var(--a); color: var(--oa); font-style: normal; font-size: 12px;
  line-height: 16px; text-align: center; }
.wns-proof { margin: 0; text-align: center; font-size: 11.5px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; opacity: 0.78; }

.wns-done { text-align: center; display: grid; gap: 14px; justify-items: center; }
.wns-done p { margin: 0; font-size: 15px; line-height: 1.5; max-width: 34ch; text-wrap: pretty; }
.wns-done strong { font-weight: 700; overflow-wrap: anywhere; }
.wns-action { display: inline-flex; align-items: center; justify-content: center; min-height: 52px; padding: 0 24px; border: 3px solid var(--k);
  background: var(--a); color: var(--oa); font-size: 16px; font-weight: 700; letter-spacing: 0.02em; text-transform: uppercase; text-decoration: none;
  position: relative; overflow: hidden; transition: transform 120ms ease; }
.wns-action::before { content: ""; position: absolute; inset: 0; background: var(--k); clip-path: inset(100% 0 0 0); transition: clip-path 250ms var(--wns-out); }
.wns-action span { position: relative; transition: color 200ms ease; }
.wns-action:active { transform: translateY(2px); }
@media (hover: hover) and (pointer: fine) {
  .wns-action:hover::before { clip-path: inset(0 0 0 0); }
  .wns-action:hover span { color: var(--p); }
}
.wns-strip .wns-action { min-height: 44px; }
.wns-link { appearance: none; border: 0; background: none; padding: 10px 4px; min-height: 40px; color: var(--k); font: inherit; font-size: 12px; font-weight: 700;
  letter-spacing: 0.09em; text-transform: uppercase; text-decoration: underline; text-underline-offset: 4px; text-decoration-thickness: 2px; cursor: pointer; }
.wns-swap { animation: wns-swap 320ms var(--wns-out) both; }
@keyframes wns-swap { from { opacity: 0; transform: translateY(8px); filter: blur(2px); } to { opacity: 1; transform: none; filter: none; } }

.wns :focus-visible { outline: 3px solid var(--r); outline-offset: 3px; }
.wns .wns-input:focus-visible { outline: none; }
.wns .wns-btn:focus-visible { outline-color: var(--k); outline-offset: 4px; }

.wns-x { position: absolute; top: 8px; right: 8px; width: 44px; height: 44px; display: grid; place-items: center; appearance: none; border: 0;
  background: transparent; color: var(--k); cursor: pointer; }
.wns-modal .wns-card > div > .wns-h, .wns-modal .wns-done .wns-h { padding-inline: 36px; }
.wns-x svg { width: 26px; height: 26px; transition: transform 220ms var(--wns-out); }

.wns-modal { position: fixed; inset: 0; z-index: 2147483000; display: grid; place-items: center; padding: 16px; overflow-y: auto;
  animation: wns-fade 220ms ease both; }
.wns-modal[data-closing="true"] { animation: wns-fadeout 170ms ease both; }
.wns-modal .wns-card { animation: wns-rise 250ms var(--wns-out) 60ms both; }
.wns-modal[data-closing="true"] .wns-card { animation: wns-sink 150ms ease both; }
@keyframes wns-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes wns-fadeout { from { opacity: 1; } to { opacity: 0; } }
@keyframes wns-rise { from { opacity: 0; transform: translateY(8px) scale(0.96); } to { opacity: 1; transform: none; } }
@keyframes wns-sink { to { opacity: 0; transform: scale(0.96); } }
.wns-modal .wns-backdrop { position: fixed; inset: 0; z-index: 0; }
.wns-modal[data-backdrop="dim"] { background: rgba(8, 8, 8, 0.62); }

@media (max-width: 1023px) {
  .wns-section > .wns-card, .wns-modal > .wns-card { align-self: center; }
  .wns-section, .wns-modal { display: flex; flex-direction: column; justify-content: flex-start; place-items: normal; padding: 0 16px 40px; }
  .wns-section { min-height: var(--wns-held); }
  .wns-section[data-done] { justify-content: center; }
  .wns-modal[data-backdrop="dim"] { justify-content: center; }
  .wns-section > .wns-mark, .wns-modal > .wns-mark { position: relative; inset: auto; margin: 0 -16px; justify-self: stretch; }
  .wns-section > .wns-card, .wns-modal > .wns-card { margin-top: -36px; }
}
.wns-band { padding: 0 16px clamp(24px, 3vw, 40px); }
.wns-band .wns-mark { position: relative; inset: auto; margin: 0 -16px; }
.wns-strip { position: relative; z-index: 2; margin: 0 auto; background: var(--p); border: 3px solid var(--k);
  display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr) auto; align-items: stretch; }
.wns-strip .wns-h { text-align: left; font-size: clamp(20px, 1.9vw, 28px); padding: 16px 20px; align-self: center; }
.wns-strip .wns-field { border-width: 0 0 0 3px; padding-top: 12px; }
.wns-strip .wns-field:focus-within { box-shadow: inset 0 0 0 3px var(--r); }
.wns-strip .wns-btn:focus-visible { outline: 3px solid var(--k); outline-offset: -9px; }
.wns-under .wns-box { background: transparent; border-color: var(--u); }
.wns-under .wns-box:checked { background: var(--a); border-color: var(--a); }
.wns-under :focus-visible { outline-color: var(--u); }
.wns-strip .wns-btn { border-width: 0 0 0 3px; min-height: 72px; padding: 0 30px; width: auto; }
.wns-strip .wns-btn:active:not([aria-disabled="true"]) { transform: none; }
.wns-strip .wns-btn:active:not([aria-disabled="true"]) .wns-roll { transform: translateY(2px); }
.wns-strip .wns-done { grid-column: 1 / -1; padding: 0 20px; min-height: 72px; grid-template-columns: auto 1fr auto auto; gap: 20px; text-align: left; align-items: center; }
.wns-strip .wns-done .wns-h { padding: 0; }
.wns-under { min-height: 36px; margin: 14px auto 0; display: flex; flex-wrap: wrap; gap: 10px 28px; align-items: center; justify-content: space-between;
  color: var(--u); }
.wns-under .wns-consent { color: inherit; max-width: 640px; }
.wns-under .wns-proof { text-align: right; }
.wns-under .wns-status { color: inherit; }
@media (max-width: 860px) {
  .wns-strip { grid-template-columns: 1fr; }
  .wns-strip .wns-h { padding: 14px 16px 12px; }
  .wns-under > .wns-status { flex-basis: 100%; }
  .wns-strip .wns-field { border-width: 3px 0 0; }
  .wns-strip .wns-btn { border-width: 3px 0 0; width: 100%; }
  .wns-strip .wns-done { grid-template-columns: 1fr; text-align: center; justify-items: center; }
  .wns-under .wns-proof { text-align: left; }
}
@media (prefers-reduced-motion: reduce) {
  .wns-letter, .wns-roll span, .wns-btn::before, .wns-chip, .wns-chip svg, .wns-box::after, .wns-x svg { transition: none !important; }
  .wns-swap, .wns-modal, .wns-modal .wns-card { animation-duration: 1ms !important; animation-delay: 0ms !important; }
  .wns-btn[aria-busy="true"]::after { animation: none; transform: none; opacity: 0.5; }
}
`

const OUT_MS = 300
const IN_MS = 560
/** The new word starts dropping this long after the old one starts falling. */
const IN_LEAD = 120
/** Per-letter stagger: 24ms out and 40ms in, shrunk for long words so the whole swap stays short. */
const outStagger = (n: number) => Math.min(24, 260 / Math.max(1, n))
const inStagger = (n: number) => Math.min(40, 420 / Math.max(1, n))

function usePrefersReducedMotion() {
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

/** Matches the breakpoint in the CSS below which the wordmark stacks above the card (phones and tablets). */
function useNarrow() {
  const [narrow, setNarrow] = React.useState(false)
  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)")
    const on = () => setNarrow(mq.matches)
    on()
    mq.addEventListener("change", on)
    return () => mq.removeEventListener("change", on)
  }, [])
  return narrow
}

function canMeasureCondensed() {
  const ctx = document.createElement("canvas").getContext("2d") as (CanvasRenderingContext2D & { fontStretch?: string }) | null
  if (!ctx || !("fontStretch" in ctx)) return false
  ctx.fontStretch = "condensed"
  return ctx.fontStretch === "condensed"
}

const useIsoLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect

type Phase = "rest" | "pre" | "in"

function Wordmark(props: {
  text: string | string[]
  /** The brand: in the flow, a swapped word keeps its height. */
  base: string | string[]
  mode: "fill" | "band"
  maxLines: number
  crop: number
  intro: boolean
  /** With intro: wait until the wordmark is a third in view before dropping in. */
  introOnView?: boolean
  reduced: boolean
  uid: string
  /** Phone: the stack sits in the flow above the card. */
  stack?: boolean
}) {
  const { text, maxLines, crop, intro, reduced, uid, stack = false, introOnView = false } = props
  const [visible, setVisible] = React.useState(!introOnView)
  const mode = stack ? "band" : props.mode
  const wrapRef = React.useRef(null as HTMLDivElement | null)
  const [box, setBox] = React.useState({ w: 0, h: 0 })
  const [family, setFamily] = React.useState("")
  const [fontsTick, setFontsTick] = React.useState(0)
  const [condensedOk, setCondensedOk] = React.useState(true)
  const [shown, setShown] = React.useState(text)
  // The word on its way out, drawn under the new one while it falls.
  const [prev, setPrev] = React.useState(null as string | string[] | null)
  const [phase, setPhase] = React.useState((intro && !reduced ? "pre" : "rest") as Phase)
  const key = JSON.stringify(text)
  const shownKey = JSON.stringify(shown)
  const prevKey = JSON.stringify(prev)
  const baseKey = JSON.stringify(props.base)

  React.useEffect(() => {
    if (visible) return
    const el = wrapRef.current
    if (!el || typeof IntersectionObserver === "undefined") return setVisible(true)
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && setVisible(true), { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [visible])

  React.useEffect(() => {
    if (reduced && phase === "pre") setPhase("rest")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced])

  useIsoLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    setFamily(getComputedStyle(el).fontFamily)
    setCondensedOk(canMeasureCondensed())
    const host = mode === "band" ? el : (el.parentElement as HTMLElement)
    const read = () => setBox({ w: host.clientWidth, h: mode === "band" ? 0 : host.clientHeight })
    read()
    const ro = new ResizeObserver(read)
    ro.observe(host)
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts
    fonts?.ready.then(() => setFontsTick((t) => t + 1))
    return () => ro.disconnect()
  }, [mode])

  const lay = React.useMemo(() => {
    if (!box.w || !family || typeof document === "undefined") return null
    const ctx = document.createElement("canvas").getContext("2d")
    if (!ctx) return null
    // Measure with the same condensed setting the SVG draws with. A browser whose canvas cannot
    // take it draws normal width too (data-stretch), so measuring and drawing always agree.
    ctx.font = "900 100px " + family
    if (condensedOk) (ctx as CanvasRenderingContext2D & { fontStretch: string }).fontStretch = "condensed"
    const cache = new Map()
    const measure = (s: string) => {
      if (!cache.has(s)) cache.set(s, ctx.measureText(s).width)
      return cache.get(s) as number
    }
    const capU = ctx.measureText("H").actualBoundingBoxAscent || 72
    const opts: WordmarkOptions = {
      // Behind a centred card only the top and bottom lines read, so the field frames it with two.
      maxLines: mode === "fill" ? Math.min(maxLines, 2) : maxLines,
      mode,
      minRatio: 1.0,
      maxRatio: 1.35,
      gap: 0.16,
      crop,
      // How uneven a split may be. A band line has nothing to hide it, so it stays even.
      balance: mode === "fill" ? 0.15 : stack ? 0.25 : 0.45,
      // The band's ink edges line up with its strip, which sits 16px in.
      padX: mode === "band" ? (stack ? Math.max(12, box.w * 0.032) : 16) : Math.max(12, box.w * 0.022),
      padY: mode === "band" ? Math.max(16, box.w * 0.016) : Math.max(16, box.w * 0.02),
      maxHeight: stack ? Math.max(220, window.innerHeight * 0.42) : Math.max(220, box.w * 0.24),
    }
    return (t: string | string[]) => {
      if (mode !== "band" || JSON.stringify(t) === baseKey) return layoutWordmark(t, box, measure, capU, opts)
      // In the flow the stack keeps the name's height, so nothing below moves when the word swaps.
      const base = layoutWordmark(props.base, box, measure, capU, opts)
      const next = layoutWordmark(t, box, measure, capU, { ...opts, maxCap: base.cap, maxLines: base.lines.length })
      // One line sits against the card or strip below; more lines spread over the name's space.
      // One line sits against the card or strip below. More lines spread over the name's space while
      // the gaps stay tight, otherwise they sit as a block in its middle.
      const n = next.lines.length
      const lastY = base.lines[base.lines.length - 1].y0 + base.cap - next.cap
      const firstY = base.lines[0].y0
      const tight = n > 1 && (lastY - firstY) / (n - 1) <= next.cap * 1.6
      const dy = n === 1 ? lastY - next.lines[0].y0 : (base.height - next.height) / 2
      return {
        ...next,
        height: base.height,
        lines: next.lines.map((l, i) => ({ ...l, y0: tight ? firstY + ((lastY - firstY) * i) / (n - 1) : l.y0 + dy })),
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseKey, box.w, box.h, family, fontsTick, mode, maxLines, crop, stack, condensedOk])

  const layout = React.useMemo(() => (lay ? lay(shown) : null), [lay, shownKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const prevLayout = React.useMemo(() => (lay && prev ? lay(prev) : null), [lay, prevKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // A new word: the old letters fall out of their lines while the new ones drop in behind them.
  React.useEffect(() => {
    if (key === shownKey) return
    if (reduced) {
      setPrev(null)
      setShown(text)
      setPhase("rest")
      return
    }
    setPrev(shown)
    setShown(text)
    setPhase("pre")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reduced])

  const count = (l: WordmarkLayout | null) => (l ? l.lines.reduce((n, x) => n + x.text.replace(/ /g, "").length, 0) : 0)
  const inCount = count(layout)
  const outCount = count(prevLayout)

  React.useEffect(() => {
    if (phase === "pre" && layout && visible) {
      let r2 = 0
      const r1 = requestAnimationFrame(() => {
        r2 = requestAnimationFrame(() => setPhase("in"))
      })
      return () => {
        cancelAnimationFrame(r1)
        cancelAnimationFrame(r2)
      }
    }
    if (phase === "in") {
      const done = Math.max(IN_LEAD + IN_MS + inCount * inStagger(inCount), OUT_MS + outCount * outStagger(outCount)) + 60
      const t = window.setTimeout(() => {
        setPrev(null)
        setPhase("rest")
      }, done)
      return () => window.clearTimeout(t)
    }
  }, [phase, layout, inCount, outCount, visible])

  const height = mode === "band" ? (layout ? layout.height : 0) : undefined
  const h = mode === "band" ? (layout ? layout.height : 0) : box.h

  const draw = (l: WordmarkLayout, layer: "a" | "b", letterPhase: string, stagger: number, lead: number) => {
    const order = letterOrder(l.lines.map((x) => x.text))
    return l.lines.map((line, li) => (
      <g key={layer + JSON.stringify(line.text) + li} transform={"translate(" + line.x0 + " " + line.y0 + ") scale(" + line.sx + " " + line.sy + ")"}>
        <g clipPath={"url(#" + uid + layer + li + ")"}>
          {line.text.split("").map((c, i) =>
            c === " " ? null : (
              <text
                key={i}
                className="wns-letter"
                data-phase={letterPhase}
                x={line.xs[i]}
                y={l.capU}
                style={
                  {
                    "--drop": l.capU * DROP + "px",
                    transitionDelay: letterPhase === "rest" || letterPhase === "pre" ? undefined : lead + order[li][i] * stagger + "ms",
                  } as React.CSSProperties
                }
              >
                {c}
              </text>
            ),
          )}
        </g>
      </g>
    ))
  }
  // While letters move, the window is the cap height exactly, so they sink through the baseline and
  // drop through the cap line with no slivers showing in the margins. At rest it opens up for accents.
  const clips = (l: WordmarkLayout, layer: "a" | "b", moving: boolean) =>
    l.lines.map((line, li) => {
      const top = moving ? 0 : CLIP_TOP
      const bottom = !moving ? CLIP_BOTTOM : layer === "a" ? 1 + SETTLE_CLIP : 1
      return (
        <clipPath id={uid + layer + li} key={layer + li}>
          <rect x={-40} y={-l.capU * top} width={line.text.length * 140 + 80} height={l.capU * (top + bottom)} />
        </clipPath>
      )
    })

  return (
    <div ref={wrapRef} className="wns-mark" aria-hidden="true" data-stretch={condensedOk ? undefined : "normal"} style={height !== undefined ? { height } : undefined}>
      {layout && (
        <svg width={box.w} height={h} viewBox={"0 0 " + box.w + " " + h}>
          <defs>
            {prevLayout && clips(prevLayout, "b", true)}
            {clips(layout, "a", phase !== "rest")}
          </defs>
          {prevLayout && draw(prevLayout, "b", phase === "in" ? "out" : "rest", outStagger(outCount), 0)}
          {draw(layout, "a", phase, inStagger(inCount), prevLayout ? IN_LEAD : 0)}
        </svg>
      )}
    </div>
  )
}

function Mark(props: { on: boolean }) {
  return (
    <svg viewBox="0 0 10 10" aria-hidden="true">
      <path d={props.on ? "M1 5.2l2.6 2.6L9 2.2" : "M5 0v10M0 5h10"} stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  )
}

export default function WordmarkNewsletterSignup({
  brand = "Big Sunday Sauce Co.",
  successWord = "See you Sunday",
  headline = "One recipe every Sunday, straight to your inbox",
  description = "Sauces, sides and the odd kitchen disaster. Free, weekly, and one click to leave.",
  emailLabel = "Email",
  placeholder = "you@kitchen.com",
  buttonLabel = "Sign me up",
  pendingLabel = "Signing you up",
  topics,
  defaultTopics = [],
  topicsLabel = "Send me",
  consent = "I agree to get the newsletter and the occasional note about new sauces. Unsubscribe anytime.",
  requireConsent,
  proof,
  successTitle = "You're on the list",
  successCopy = (email: string) => (
    <>
      First issue lands Sunday at 8am. We sent a confirmation link to <strong>{email}</strong>.
    </>
  ),
  resetLabel = "Use a different email",
  messages: messagesProp,
  intro = "view",
  successAction = null,
  onSubscribe,
  variant = "section",
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  preset = "sauce",
  palette,
  darkPalette,
  theme = "auto",
  height = "min(100svh, 880px)",
  maxLines = 4,
  crop = 0.14,
  backdrop = "wordmark",
  image = null,
  displayFont = DISPLAY_FONT,
  textFont = TEXT_FONT,
  ariaLabel = "Newsletter signup",
  className,
  style,
}: WordmarkNewsletterSignupProps) {
  const msg = { ...MESSAGES, ...messagesProp }
  const uid = "wns" + React.useId().replace(/[^a-zA-Z0-9]/g, "")
  const reduced = usePrefersReducedMotion()
  const narrow = useNarrow()
  const hasConsent = consent !== null && consent !== undefined && consent !== false
  const mustConsent = hasConsent && (requireConsent ?? true)

  const [email, setEmail] = React.useState("")
  const [picked, setPicked] = React.useState(defaultTopics)
  const [agreed, setAgreed] = React.useState(false)
  const [status, setStatus] = React.useState("idle" as "idle" | "pending" | "error" | "done")
  const [error, setError] = React.useState("")
  const [invalid, setInvalid] = React.useState("" as "" | "email" | "consent")
  const [doneEmail, setDoneEmail] = React.useState("")
  const [photoOk, setPhotoOk] = React.useState(true)
  // Below 1024px the section sizes to its content; its last height is held through success so the
  // host page below does not jump. Wide screens have a fixed section height and need no hold.
  const sectionRef = React.useRef(null as HTMLElement | null)
  const [formH, setFormH] = React.useState(0)

  const inputRef = React.useRef(null as HTMLInputElement | null)
  const boxRef = React.useRef(null as HTMLInputElement | null)
  const doneRef = React.useRef(null as HTMLHeadingElement | null)
  const cardRef = React.useRef(null as HTMLDivElement | null)
  const alive = React.useRef(true)
  React.useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  // ---- modal open state
  const [openState, setOpenState] = React.useState(defaultOpen)
  const isOpen = variant === "modal" ? (openProp ?? openState) : true
  const [closing, setClosing] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  const setOpen = React.useCallback(
    (v: boolean) => {
      if (openProp === undefined) setOpenState(v)
      onOpenChange?.(v)
    },
    [openProp, onOpenChange],
  )
  const requestClose = React.useCallback(() => {
    if (reduced) return setOpen(false)
    setClosing(true)
    window.setTimeout(() => {
      setClosing(false)
      setOpen(false)
    }, 170)
  }, [reduced, setOpen])

  React.useEffect(() => {
    if (variant !== "modal" || !isOpen) return
    const prev = document.activeElement as HTMLElement | null
    const root = document.documentElement
    const prevOverflow = root.style.overflow
    const prevPad = root.style.paddingRight
    // Keep the page from shifting by the scrollbar's width when it disappears.
    const bar = window.innerWidth - root.clientWidth
    root.style.overflow = "hidden"
    if (bar > 0) root.style.paddingRight = bar + "px"
    // A touch screen gets the dialog focused, not the field, so the keyboard does not cover it on open.
    const coarse = window.matchMedia("(pointer: coarse)").matches
    const t = window.setTimeout(() => (coarse ? cardRef.current : inputRef.current)?.focus({ preventScroll: true }), 40)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        requestClose()
        return
      }
      if (e.key !== "Tab" || !cardRef.current) return
      const items = Array.from(
        cardRef.current.querySelectorAll("button, input, a[href], [tabindex]:not([tabindex='-1'])"),
      ).filter((n) => !(n as HTMLButtonElement).disabled) as HTMLElement[]
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && (document.activeElement === first || !cardRef.current.contains(document.activeElement))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => {
      window.clearTimeout(t)
      document.removeEventListener("keydown", onKey)
      root.style.overflow = prevOverflow
      root.style.paddingRight = prevPad
      prev?.focus?.({ preventScroll: true })
    }
  }, [variant, isOpen, requestClose])

  React.useEffect(() => {
    const el = sectionRef.current
    if (!el || status === "done" || typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(() => setFormH(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [status])

  // ---- form
  const toggleTopic = (t: string) => setPicked((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (status === "pending") return
    const value = email.trim()
    if (!value) {
      setInvalid("email")
      setError(msg.required)
      setStatus("error")
      inputRef.current?.focus()
      return
    }
    if (!isEmail(value)) {
      setInvalid("email")
      setError(msg.invalid)
      setStatus("error")
      inputRef.current?.focus()
      return
    }
    if (mustConsent && !agreed) {
      setInvalid("consent")
      setError(msg.consent)
      setStatus("error")
      boxRef.current?.focus()
      return
    }
    setInvalid("")
    setError("")
    setStatus("pending")
    try {
      if (onSubscribe) await onSubscribe({ email: value, topics: picked, consent: agreed })
      else await new Promise((r) => window.setTimeout(r, 900))
      if (!alive.current) return
      setDoneEmail(value)
      setStatus("done")
      window.setTimeout(() => doneRef.current?.focus({ preventScroll: true }), 60)
    } catch (err) {
      if (!alive.current) return
      setError(err instanceof Error && err.message ? err.message : msg.failed)
      setStatus("error")
      inputRef.current?.focus()
    }
  }

  const reset = () => {
    setStatus("idle")
    setEmail("")
    setError("")
    setAgreed(false)
    window.setTimeout(() => inputRef.current?.focus(), 30)
  }

  // ---- palette
  const pal = PRESETS[preset] ?? PRESETS.sauce
  const light = { ...pal.light, ...palette }
  const dark = { ...pal.dark, ...darkPalette }
  const vars: Record<string, string> = {
    "--wns-display": displayFont,
    "--wns-text": textFont,
  }
  for (const k of ["ground", "mark", "paper", "ink", "accent", "onAccent"] as const) {
    vars["--wl-" + k] = light[k]
    vars["--wd-" + k] = dark[k]
  }
  // Focus rings and selected edges need 3:1 against the card; a pale accent falls back to ink.
  vars["--wl-ring"] = pickReadable(light.paper, [light.accent, light.ink], 3)
  vars["--wd-ring"] = pickReadable(dark.paper, [dark.accent, dark.ink], 3)
  vars["--wl-under"] = pickReadable(light.ground, [light.mark, light.ink, light.paper])
  vars["--wd-under"] = pickReadable(dark.ground, [dark.mark, dark.ink, dark.paper])
  vars["--wl-headline"] = light.headline ?? light.accent
  vars["--wd-headline"] = dark.headline ?? dark.accent

  const done = status === "done"
  const markText = done ? successWord : brand
  const errId = uid + "-err"
  const band = variant === "band"
  // Sized for whichever is longer, the address or the placeholder, so neither clips on a phone.
  const fieldSize = emailFontSize(Math.max(email.length, placeholder.length), narrow ? 22 : band ? 24 : 26, 14, band ? 22 : narrow ? 15 : 17)

  const field = (
    <label className="wns-field" data-invalid={invalid === "email" ? "true" : undefined}>
      <span className="wns-label">{emailLabel}</span>
      <input
        ref={inputRef}
        className="wns-input"
        type="email"
        name="email"
        inputMode="email"
        autoComplete="email"
        spellCheck={false}
        autoCapitalize="off"
        placeholder={placeholder}
        value={email}
        readOnly={status === "pending"}
        aria-invalid={invalid === "email" || undefined}
        aria-describedby={error ? errId : undefined}
        style={{ fontSize: fieldSize }}
        onChange={(e) => {
          setEmail(e.target.value)
          if (invalid === "email") {
            setInvalid("")
            setError("")
            setStatus("idle")
          }
        }}
      />
    </label>
  )

  const button = (
    <button className="wns-btn" type="submit" aria-disabled={status === "pending" || undefined} aria-busy={status === "pending" || undefined}>
      <span className="wns-roll">
        <span>{status === "pending" ? pendingLabel : buttonLabel}</span>
        <span aria-hidden="true">{status === "pending" ? pendingLabel : buttonLabel}</span>
      </span>
    </button>
  )

  const consentRow = hasConsent ? (
    <label className="wns-consent" data-invalid={invalid === "consent" ? "true" : undefined}>
      <input
        ref={boxRef}
        className="wns-box"
        type="checkbox"
        checked={agreed}
        required={mustConsent}
        aria-invalid={invalid === "consent" || undefined}
        onChange={(e) => {
          setAgreed(e.target.checked)
          if (invalid === "consent") {
            setInvalid("")
            setError("")
            setStatus("idle")
          }
        }}
      />
      <span>{consent}</span>
    </label>
  ) : null

  const statusLine = (
    <div className="wns-status" id={errId} role="status" aria-live="polite">
      {error ? (
        <>
          <i aria-hidden="true">!</i>
          <span>{error}</span>
        </>
      ) : null}
    </div>
  )

  const successBlock = (
    <div className="wns-done wns-swap">
      <h2 className="wns-h" ref={doneRef} tabIndex={-1}>
        {successTitle}
      </h2>
      <p>{typeof successCopy === "function" ? successCopy(doneEmail) : successCopy}</p>
      {successAction ? (
        <a className="wns-action" href={successAction.href}>
          <span>{successAction.label}</span>
        </a>
      ) : null}
      <button type="button" className="wns-link" onClick={reset}>
        {resetLabel}
      </button>
    </div>
  )

  const topicsRow =
    topics && topics.length ? (
      <fieldset className="wns-topics">
        <legend>{topicsLabel}</legend>
        <div className="wns-chips">
          {topics.map((t) => (
            <button key={t} type="button" className="wns-chip" aria-pressed={picked.includes(t)} onClick={() => toggleTopic(t)}>
              <Mark on={picked.includes(t)} />
              {t}
            </button>
          ))}
        </div>
      </fieldset>
    ) : null

  const card = (
    <div
      className="wns-card"
      ref={cardRef}
      tabIndex={variant === "modal" ? -1 : undefined}
    >
      {variant === "modal" && (
        <button type="button" className="wns-x" aria-label={msg.close} onClick={requestClose}>
          <svg viewBox="0 0 26 26" aria-hidden="true">
            <path d="M3 3l20 20M23 3L3 23" stroke="currentColor" strokeWidth="2.5" />
          </svg>
        </button>
      )}
      {done ? (
        successBlock
      ) : (
        <div className={status === "idle" && doneEmail ? "wns-swap" : undefined}>
          <h2 className="wns-h" id={uid + "-h"}>
            {headline}
          </h2>
          {description ? <p className="wns-desc">{description}</p> : null}
          <form className="wns-form" noValidate onSubmit={submit} aria-labelledby={uid + "-h"}>
            <div className="wns-fieldwrap" data-error={error ? "true" : undefined}>
              {field}
              {statusLine}
            </div>
            {topicsRow}
            {consentRow}
            {button}
            {proof ? <p className="wns-proof">{proof}</p> : null}
          </form>
        </div>
      )}
    </div>
  )

  const common = {
    "data-theme": theme,
    style: { ...(vars as React.CSSProperties), ...style },
  }

  if (band) {
    return (
      <section className={"wns wns-band" + (className ? " " + className : "")} aria-label={ariaLabel} {...common}>
        <style>{CSS}</style>
        <Wordmark text={markText} base={brand} mode="band" maxLines={maxLines} crop={crop} intro={intro !== false} introOnView={intro === "view"} reduced={reduced} uid={uid} />
        <form className="wns-strip" noValidate onSubmit={submit} aria-labelledby={uid + "-h"}>
          {done ? (
            <div className="wns-done wns-swap">
              <h2 className="wns-h" ref={doneRef} tabIndex={-1}>
                {successTitle}
              </h2>
              <p>{typeof successCopy === "function" ? successCopy(doneEmail) : successCopy}</p>
              {successAction ? (
                <a className="wns-action" href={successAction.href}>
                  <span>{successAction.label}</span>
                </a>
              ) : null}
              <button type="button" className="wns-link" onClick={reset}>
                {resetLabel}
              </button>
            </div>
          ) : (
            <>
              <h2 className="wns-h" id={uid + "-h"}>
                {headline}
              </h2>
              {field}
              {button}
            </>
          )}
        </form>
        <div className="wns-under">
          {done ? <span /> : consentRow}
          {done ? null : statusLine}
          {proof ? <p className="wns-proof">{proof}</p> : null}
        </div>
      </section>
    )
  }

  if (variant === "modal") {
    if (!mounted || !isOpen) return null
    return createPortal(
      <div
        className={"wns wns-modal" + (className ? " " + className : "")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={uid + "-h"}
        aria-label={done ? successTitle : undefined}
        data-closing={closing || undefined}
        data-backdrop={backdrop}
        {...common}
      >
        <style>{CSS}</style>
        <div className="wns-backdrop" onClick={requestClose} />
        {backdrop === "dim" ? null : <Wordmark text={markText} base={brand} mode="fill" maxLines={maxLines} crop={crop} intro={intro !== false} reduced={reduced} uid={uid} stack={narrow} />}
        {card}
      </div>,
      document.body,
    )
  }

  return (
    <section
      ref={sectionRef}
      data-done={done || undefined}
      className={"wns wns-section" + (className ? " " + className : "")}
      aria-label={ariaLabel}
      {...common}
      style={{
        ...common.style,
        ["--wns-h" as string]: typeof height === "number" ? height + "px" : height,
        ["--wns-held" as string]: done && formH ? formH + "px" : "0px",
      }}
    >
      <style>{CSS}</style>
      <Wordmark text={markText} base={brand} mode="fill" maxLines={maxLines} crop={crop} intro={intro !== false} introOnView={intro === "view"} reduced={reduced} uid={uid} stack={narrow} />
      {image && photoOk ? (
        <div className="wns-photo">
          <img src={image.src} alt={image.alt} width={600} height={750} loading="lazy" onError={() => setPhotoOk(false)} />
        </div>
      ) : null}
      {card}
    </section>
  )
}

// Declared after the JSX: the 21st CLI tokenizer hangs on generics before it.
export type WordmarkPaletteInput = Partial<WordmarkPalette>
export type WnsMessagesInput = Partial<typeof MESSAGES>
