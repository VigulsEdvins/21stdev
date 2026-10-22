"use client"

import * as React from "react"
import { createPortal } from "react-dom"

/*
 * Spotlight Offer Quiz: the discount popup that asks one good question first.
 *
 * A spotlit studio stage with your product photo bleeding off the right, a huge
 * offer, one personal question and a stack of answer pills. Pointing at an
 * answer brings its product up under the light. Picking one locks the light on
 * it: the pills give way to a personal pick (name and one line about it), an
 * email field and a button that turns into the code itself, with copy.
 *
 * Every word, photo and colour is a prop. Two layouts: a full-screen takeover
 * popup (focus trap, Escape, scroll lock, focus return; opened by you, after a
 * delay, or on exit intent, and remembered when dismissed) and an inline offer
 * section. Three stage presets, each with optional dark pairing, or your own
 * palette; photos can be graded to studio monochrome so mixed stock matches.
 * With no photo, or one that fails to load, the stage sets the pick's name in
 * giant lit capitals instead, so it never shows a broken image.
 */

export type OfferOption = {
  /** The answer, as the visitor would say it. */
  label: string
  /** A short form of the answer for "Our pick for …" and the change chip, e.g. "pour-over". */
  tag?: string
  /** The product this answer leads to. Shown under the light and in the claim step. */
  pick?: string
  /** One short line about the pick. */
  note?: string
  /** Product photo for this answer. Falls back to the stage `image`. */
  image?: string
  imageAlt?: string
  /** CSS object-position for the photo, e.g. "50% 30%". */
  focus?: string
  /** "cover" fills the stage; "contain" stands a cut-out packshot on the floor with a shadow. Falls back to `imageFit`. */
  fit?: "cover" | "contain"
  /** Where "Shop the pick" goes after the code is shown. */
  href?: string
  /** A code just for this answer. Falls back to `code`. */
  code?: string
}

export type OfferPreset = "graphite" | "chalk" | "midnight"
export type OfferGrade = "mono" | "natural" | "warm"

export type OfferPalette = {
  /** The lit part of the backdrop, behind the product. */
  stage: string
  /** The backdrop's falloff into shadow. */
  deep: string
  /** Headline, pills, borders. */
  ink: string
  /** Secondary text. Keep 4.5:1 against the shadowed side. */
  muted: string
  /** Submit button fill and focus ring. */
  accent: string
  /** Text on the accent. */
  onAccent: string
  /** The beam's colour. */
  beam: string
}

export type ClaimData = { email: string; option: OfferOption; index: number }

export type SpotlightOfferQuizProps = {
  /** "modal" is a full-screen popup over the page; "section" sits inline. */
  variant?: "modal" | "section"
  /** Controlled open state for the modal. */
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** How the modal opens by itself when uncontrolled: never, after `delayMs`, or when the pointer leaves the top of the page. */
  trigger?: "manual" | "delay" | "exit-intent"
  delayMs?: number
  /** After a close, decline or claim, stay quiet for this many days (0 = always show). Defaults to 7 with a self-opening trigger, 0 otherwise. */
  rememberDismissDays?: number
  storageKey?: string

  /** Small line above the offer. */
  kicker?: React.ReactNode
  /** The offer, set huge and fitted to the column. "\n" makes two lines. */
  offer?: string
  /** The one question. */
  question?: React.ReactNode
  /** The answers. Four to six reads best. */
  options?: OfferOption[]
  /** Accessible name for the answers group. */
  optionsLabel?: string
  /** Line above the pick in the claim step. A function gets the option. */
  pickIntro?: React.ReactNode | ((option: OfferOption) => React.ReactNode)
  changeLabel?: string

  /** The product on stage before anything is picked. Without it, the stage shows the line-up: every answer's product side by side. */
  image?: string
  imageAlt?: string
  imageFocus?: string
  /** "cover" for photos, "contain" for transparent packshots (they stand on the stage floor). */
  imageFit?: "cover" | "contain"
  /** The word the stage spells if the hero `image` fails to load. Defaults to the offer. */
  brand?: string
  grade?: OfferGrade

  /** Ask for an email before showing the code. false shows the code straight after the pick. */
  collectEmail?: boolean
  emailLabel?: string
  placeholder?: string
  submitLabel?: string | ((option: OfferOption) => string)
  pendingLabel?: string
  /** The discount code. An option's own `code`, or a string returned by `onClaim`, wins. */
  code?: string
  /**
   * Called with the email (empty when `collectEmail` is false), the option and its index.
   * Resolve to show the code, resolve with a string to show that code instead, or throw an Error to show its message.
   */
  onClaim?: (data: ClaimData) => void | string | Promise<void | string>
  onPick?: (option: OfferOption, index: number) => void
  /** Line under the code. A function gets the email and the option. */
  doneCopy?: React.ReactNode | ((email: string, option: OfferOption) => React.ReactNode)
  copyLabel?: string
  copiedLabel?: string
  /** Label of the link to the pick (when it has an `href`). A function gets the option. */
  shopLabel?: string | ((option: OfferOption) => string)
  /** Label of the button that closes the popup after the code, when the pick has no `href`. */
  continueLabel?: string
  /** Small print under the form. */
  finePrint?: React.ReactNode

  /** The cheeky way out. null hides it. Shown in the modal, or in the section when `onDecline` is set. */
  decline?: React.ReactNode | null
  onDecline?: () => void
  closeLabel?: string

  preset?: OfferPreset
  /** Preset used under a `.dark` ancestor. */
  darkPreset?: OfferPreset
  colors?: OfferPaletteInput
  displayFont?: string
  textFont?: string
  /** Section height. A definite length, never a percentage. */
  height?: string
  className?: string
  "aria-label"?: string
}

const PRESETS: { graphite: OfferPalette; chalk: OfferPalette; midnight: OfferPalette } = {
  graphite: {
    stage: "#8b8f95",
    deep: "#141517",
    ink: "#f4f4f2",
    muted: "#d6d8db",
    accent: "#f4f4f2",
    onAccent: "#101113",
    beam: "#ffffff",
  },
  chalk: {
    stage: "#fbfbfc",
    deep: "#b4bac1",
    ink: "#111316",
    muted: "#2c3035",
    accent: "#111316",
    onAccent: "#f4f5f6",
    beam: "#ffffff",
  },
  midnight: {
    stage: "#4a6584",
    deep: "#060b13",
    ink: "#eef3f8",
    muted: "#c3cdd8",
    accent: "#f1d06a",
    onAccent: "#0b1320",
    beam: "#e9f1ff",
  },
}

const GRADES: { mono: string; natural: string; warm: string } = {
  mono: "grayscale(1) contrast(1.12) brightness(0.92)",
  natural: "none",
  warm: "sepia(0.28) saturate(0.9) contrast(1.06)",
}

const DISPLAY = '"Helvetica Neue", "Inter Display", Inter, "Segoe UI", Roboto, Arial, sans-serif'
const TEXT = '"Helvetica Neue", Inter, "Segoe UI", Roboto, Arial, sans-serif'

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 .9 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")"

// #region logic
export type QuizStep = "ask" | "claim" | "done"
export type QuizState = {
  step: QuizStep
  /** The committed answer, -1 for none. */
  picked: number
  /** The answer being pointed at in the ask step, -1 for none. */
  preview: number
  status: "idle" | "pending" | "error"
  error: string
  code: string
  email: string
}
export type QuizAction =
  | { type: "preview"; index: number }
  | { type: "pick"; index: number }
  | { type: "change" }
  | { type: "submit" }
  | { type: "invalid"; error: string }
  | { type: "success"; code: string; email: string }
  | { type: "fail"; error: string }
  | { type: "reset" }

export function initialQuiz(): QuizState {
  return { step: "ask", picked: -1, preview: -1, status: "idle", error: "", code: "", email: "" }
}

export function quizReducer(s: QuizState, a: QuizAction): QuizState {
  switch (a.type) {
    case "preview":
      return s.step === "ask" && s.preview !== a.index ? { ...s, preview: a.index } : s
    case "pick":
      if (a.index < 0) return s
      return { ...s, step: "claim", picked: a.index, preview: -1, status: "idle", error: "" }
    case "change":
      return s.step === "claim" ? { ...s, step: "ask", preview: -1, status: "idle", error: "" } : s
    case "submit":
      return s.step === "claim" && s.status !== "pending" ? { ...s, status: "pending", error: "" } : s
    case "invalid":
      return { ...s, status: "error", error: a.error }
    case "success":
      return { ...s, step: "done", status: "idle", error: "", code: a.code, email: a.email }
    case "fail":
      return { ...s, status: "error", error: a.error }
    case "reset":
      return initialQuiz()
  }
  return s
}

/** Which photo is under the light: the one pointed at, else the pick, else the stage's own (-1). */
export function litSlot(s: QuizState): number {
  if (s.step === "ask" && s.preview >= 0) return s.preview
  return s.picked
}

export function isEmail(v: string): boolean {
  const t = v.trim()
  if (t.length > 254 || /\s/.test(t)) return false
  const at = t.indexOf("@")
  if (at < 1 || at !== t.lastIndexOf("@")) return false
  const domain = t.slice(at + 1)
  if (domain.includes("..") || domain.startsWith(".") || domain.endsWith(".")) return false
  const parts = domain.split(".")
  return parts.length >= 2 && parts.every((p) => p.length > 0) && parts[parts.length - 1].length >= 2
}

/** Font size that makes a line measured at 100px fill `avail`, held between min and max. */
export function fitSize(width100: number, avail: number, min: number, max: number): number {
  if (!(width100 > 0) || !(avail > 0)) return min
  return Math.max(min, Math.min(max, Math.floor((avail / width100) * 100 * 100) / 100))
}

/** The words the empty stage spells, in capitals, longest line first for sizing. */
export function stillWords(text: string): { lines: string[]; longest: number } {
  const words = text
    .split(/\s+/)
    .map((w) => w.trim().toUpperCase())
    .filter(Boolean)
  // Short tokens ("&", "OF", "A") never stand alone on a line: they join the next word, or the last one.
  const lines: string[] = []
  let carry = ""
  for (const w of words) {
    if (w.replace(/[^A-Z0-9]/g, "").length <= 2 && w.length <= 2) carry = carry ? carry + " " + w : w
    else {
      lines.push(carry ? carry + " " + w : w)
      carry = ""
    }
  }
  if (carry) lines.length ? (lines[lines.length - 1] += " " + carry) : lines.push(carry)
  return { lines, longest: lines.reduce((m, w) => Math.max(m, w.length), 0) }
}

/** Size of the empty stage's lettering: the widest line fills `share` of the box, all lines fit its height. */
export function stillSize(width100: number, lines: number, box: { w: number; h: number }, share: number): number {
  if (!(lines > 0) || !(box.w > 0) || !(box.h > 0)) return 0
  const byWidth = fitSize(width100, box.w * share, 20, 600)
  const byHeight = Math.floor((box.h * 0.8) / (lines * 0.86))
  return Math.max(20, Math.min(byWidth, byHeight))
}

/** True while a dismissal stamped at `stamp` (ms) is still inside its quiet period. */
export function dismissedRecently(stamp: number | null, now: number, days: number): boolean {
  if (!stamp || !(days > 0)) return false
  return now - stamp < days * 864e5
}

/** The code shown after a claim: what onClaim returned, else the option's, else the default. */
export function resolveCode(returned: unknown, option: { code?: string } | undefined, fallback: string): string {
  if (typeof returned === "string" && returned.trim()) return returned.trim()
  if (option && option.code) return option.code
  return fallback
}
// #endregion

const CSS = `
.soq {
  --soq-stage: var(--soq-l-stage); --soq-deep: var(--soq-l-deep); --soq-ink: var(--soq-l-ink);
  --soq-muted: var(--soq-l-muted); --soq-accent: var(--soq-l-accent); --soq-on: var(--soq-l-on);
  --soq-beam: var(--soq-l-beam);
  --soq-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --soq-swing: cubic-bezier(0.65, 0, 0.35, 1);
  position: relative; isolation: isolate; overflow: hidden; box-sizing: border-box;
  color: var(--soq-ink); background: var(--soq-deep);
  font-family: var(--soq-text); -webkit-font-smoothing: antialiased;
  container-type: inline-size; container-name: soq;
}
.dark .soq[data-paired] {
  --soq-stage: var(--soq-d-stage); --soq-deep: var(--soq-d-deep); --soq-ink: var(--soq-d-ink);
  --soq-muted: var(--soq-d-muted); --soq-accent: var(--soq-d-accent); --soq-on: var(--soq-d-on);
  --soq-beam: var(--soq-d-beam);
}
.soq *, .soq *::before, .soq *::after { box-sizing: border-box; }
.soq img { max-width: none; display: block; }
:where(.soq) button, :where(.soq) input { font: inherit; color: inherit; margin: 0; }
.soq :focus-visible { outline: 2px solid var(--soq-accent); outline-offset: 3px; }

.soq-modal { position: fixed; inset: 0; z-index: 1000; height: 100vh; height: 100dvh; }
.soq-modal { opacity: 0; transform: scale(0.97); transition: opacity 250ms var(--soq-ease), transform 250ms var(--soq-ease); }
.soq-modal[data-shown] { opacity: 1; transform: none; }
.soq-modal[data-closing] { opacity: 0; transform: scale(0.99); transition-duration: 150ms, 150ms; }
.soq-modal:focus { outline: none; }
.soq-scroll { position: absolute; inset: 0; overflow-y: auto; overscroll-behavior: contain; }
.soq-frame { position: relative; isolation: isolate; overflow: hidden; min-height: 100%; }

.soq-stage {
  position: absolute; inset: 0; z-index: -3; pointer-events: none;
  background:
    radial-gradient(40% 55% at 22% 24%, color-mix(in oklab, var(--soq-stage) 38%, transparent), transparent 72%),
    radial-gradient(70% 85% at 68% 26%, var(--soq-stage) 0%, color-mix(in oklab, var(--soq-stage) 52%, var(--soq-deep)) 42%, var(--soq-deep) 96%);
}
.soq-grain { position: absolute; inset: -50%; z-index: 3; pointer-events: none; opacity: 0.13; mix-blend-mode: overlay; background-size: 180px 180px; }

.soq-plate {
  --soq-l0: 24%;
  position: absolute; z-index: -2; top: 0; right: 0; bottom: 0; width: 56%;
  -webkit-mask-image: linear-gradient(to right, transparent 0%, #000 34%);
  mask-image: linear-gradient(to right, transparent 0%, #000 34%);
}
.soq-shot { position: absolute; inset: 0; visibility: hidden; }
.soq-shot[data-on] { visibility: visible; z-index: 2; animation: soq-wipe 420ms var(--soq-swing) both; }
.soq-shot[data-on][data-kind="still"] { animation: soq-in 200ms var(--soq-ease) 110ms both; }
.soq-shot[data-prev] { visibility: visible; z-index: 1; }
.soq-shot[data-prev] { animation: soq-out 160ms linear 420ms both; }
.soq:not([data-lit="photo"]) .soq-shot[data-prev] { animation: soq-out 110ms var(--soq-ease) both; }
.soq-shot[data-on][data-pull][data-kind="photo"] { animation: soq-pull 460ms var(--soq-swing) both; }
@keyframes soq-pull {
  from { clip-path: inset(0 calc(100% - var(--soq-l0) - (100% - var(--soq-l0)) * (var(--i) + 1) / var(--n)) 0 calc(var(--soq-l0) + (100% - var(--soq-l0)) * var(--i) / var(--n))); }
  to { clip-path: inset(0 0 0 0); }
}
.soq-lineup {
  position: absolute; top: 9%; bottom: 13%; left: 0; right: 0; display: flex; gap: 6px; padding-left: var(--soq-l0);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 12%, #000 82%, transparent 100%);
  mask-image: linear-gradient(to bottom, transparent 0%, #000 12%, #000 82%, transparent 100%);
}
.soq-tile { position: relative; flex: 1 1 0; min-width: 0; overflow: hidden; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 10%; }
.soq-tile img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: var(--soq-grade); }
.soq-tile[data-fit="contain"] img { object-fit: contain; inset: 12% 6% 18%; width: 88%; height: 70%; }
.soq-tile[data-fit]::after { content: ""; position: absolute; inset: 0; background: linear-gradient(to top, color-mix(in oklab, var(--soq-deep) 72%, transparent), transparent 45%); }
.soq-vert {
  position: relative; z-index: 1; writing-mode: vertical-rl; transform: rotate(180deg); white-space: nowrap;
  font-family: var(--soq-display); font-weight: 800; text-transform: uppercase; letter-spacing: -0.03em; line-height: 1;
  font-size: var(--soq-tile, 40px); color: transparent;
  background: linear-gradient(180deg, var(--soq-ink) 0%, var(--soq-ink) 86%, color-mix(in oklab, var(--soq-ink) 55%, var(--soq-deep)) 100%);
  -webkit-background-clip: text; background-clip: text;
}
@keyframes soq-wipe { from { clip-path: inset(100% 0 0 0); } to { clip-path: inset(0 0 0 0); } }
@keyframes soq-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes soq-out { from { opacity: 1; } to { opacity: 0; } }
.soq-shot img {
  position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
  filter: var(--soq-grade); transform: scale(1.05); transition: transform 1100ms var(--soq-ease);
}
.soq-shot[data-on] img { transform: scale(1); }
.soq-shot[data-fit="contain"] img { inset: 10% 8% 16% 12%; width: 80%; height: 74%; object-fit: contain; }
.soq-shot[data-fit="contain"]::before {
  content: ""; position: absolute; left: 22%; right: 12%; bottom: 11%; height: 7%; border-radius: 50%;
  background: radial-gradient(50% 50% at 50% 50%, color-mix(in oklab, var(--soq-deep) 80%, transparent), transparent 72%);
}
.soq-shot[data-kind="photo"]::after {
  content: ""; position: absolute; inset: 0;
  background: linear-gradient(to top, color-mix(in oklab, var(--soq-deep) 70%, transparent), transparent 40%);
}

.soq-still {
  position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; align-items: flex-end;
  padding: 0 6% 4% 0;
  font-family: var(--soq-display); font-weight: 800; text-transform: uppercase;
  font-size: var(--soq-still, 120px);
  line-height: 0.86; letter-spacing: -0.045em; text-align: right; white-space: nowrap;
  color: transparent;
  background: radial-gradient(130% 110% at 62% 0%, var(--soq-ink) 0%, color-mix(in oklab, var(--soq-ink) 74%, var(--soq-deep)) 52%, color-mix(in oklab, var(--soq-ink) 30%, var(--soq-deep)) 100%);
  -webkit-background-clip: text; background-clip: text;
}
.soq-still span { display: block; }

.soq-beam {
  position: absolute; z-index: -1; pointer-events: none; top: -14%; left: 72%; width: 62%; height: 132%;
  margin-left: -31%; transform-origin: 50% 0%;
  background: conic-gradient(from 180deg at 50% 0%, transparent 0deg, transparent 163deg, color-mix(in oklab, var(--soq-beam) 26%, transparent) 167deg, color-mix(in oklab, var(--soq-beam) 40%, transparent) 174deg, color-mix(in oklab, var(--soq-beam) 52%, transparent) 180deg, color-mix(in oklab, var(--soq-beam) 40%, transparent) 186deg, color-mix(in oklab, var(--soq-beam) 26%, transparent) 193deg, transparent 197deg, transparent 360deg);
  filter: blur(12px); mix-blend-mode: screen; opacity: 0.78;
  rotate: var(--soq-aim, 0deg); scale: 1 1;
  transition: opacity 600ms var(--soq-ease), rotate 520ms var(--soq-swing), scale 700ms var(--soq-ease);
  animation: soq-sway 11s ease-in-out infinite alternate;
}
.soq-pool {
  position: absolute; z-index: -1; pointer-events: none; left: 44%; right: -6%; bottom: -10%; height: 34%;
  background: radial-gradient(50% 50% at 50% 50%, color-mix(in oklab, var(--soq-beam) 26%, transparent), transparent 70%);
  mix-blend-mode: screen; opacity: 0; transition: opacity 600ms var(--soq-ease);
}
.soq[data-lit="packshot"] .soq-pool, .soq[data-lit="lineup"] .soq-pool { opacity: 0.55; }
.soq[data-step="claim"] .soq-beam, .soq[data-step="done"] .soq-beam { opacity: 1; scale: 1.35 1.04; }
.soq[data-step="claim"][data-lit="packshot"] .soq-pool, .soq[data-step="done"][data-lit="packshot"] .soq-pool { opacity: 0.9; }
.soq[data-swap] .soq-beam { opacity: 0.25; }
.soq-modal:not([data-shown]) .soq-beam, .soq-modal:not([data-shown]) .soq-pool { opacity: 0; }
@keyframes soq-sway { from { transform: rotate(-2.2deg); } to { transform: rotate(2.2deg); } }

.soq-in {
  position: relative; display: grid; grid-template-columns: minmax(0, 50fr) minmax(0, 50fr);
  min-height: var(--soq-h);
}
.soq-modal .soq-in { min-height: 100vh; min-height: 100dvh; }
.soq-copy {
  display: flex; flex-direction: column; align-items: flex-end; justify-content: center; text-align: center;
  padding: clamp(72px, 9vh, 112px) clamp(24px, 5vw, 88px) clamp(48px, 7vh, 88px);
}
.soq-col { width: 100%; max-width: 440px; }
.soq-h { margin: 0; font-family: var(--soq-display); font-weight: 800; }
.soq-kicker { display: block; font-size: clamp(17px, 1.9cqi, 26px); line-height: 1.1; text-transform: uppercase; letter-spacing: -0.01em; }
.soq-offer {
  display: block; position: relative; margin-top: 6px; text-transform: uppercase; white-space: nowrap;
  font-size: var(--soq-fit, 96px); line-height: 0.9; letter-spacing: -0.045em; font-variant-numeric: tabular-nums;
}
.soq-offer span { display: block; }
.soq-measure { position: absolute; left: 0; top: 0; visibility: hidden; pointer-events: none; font-size: 100px; white-space: nowrap; }
.soq-measure span { display: inline-block; }
.soq-q { margin: 0 auto 26px; max-width: 30ch; font-size: 18px; line-height: 1.4; color: var(--soq-muted); text-wrap: balance; }

.soq-panels { position: relative; display: grid; margin-top: 18px; }
.soq-panel > .soq-for:first-child { margin-top: 8px; }
.soq-panel {
  grid-area: 1 / 1; min-width: 0;
  transition: opacity 250ms var(--soq-ease) 70ms, transform 300ms var(--soq-ease) 70ms, visibility 0s linear 0s;
}
.soq-panel[data-hidden] {
  position: absolute; top: 0; left: 0; right: 0; opacity: 0; transform: translateY(10px); visibility: hidden; pointer-events: none;
  transition: opacity 150ms var(--soq-ease), transform 150ms var(--soq-ease), visibility 0s linear 150ms;
}
.soq-panel > * { transition: opacity 260ms var(--soq-ease), transform 320ms var(--soq-ease); transition-delay: calc(70ms + var(--i, 0) * 40ms); }
.soq-panel[data-hidden] > * { opacity: 0; transform: translateY(6px); transition-delay: 0ms; transition-duration: 120ms; }

.soq-pills { display: grid; gap: 10px; margin: 0; padding: 0; border: 0; min-width: 0; }
.soq-pill {
  position: relative; display: flex; align-items: center; justify-content: center; width: 100%; min-height: 56px;
  padding: 10px 22px; border-radius: 999px; cursor: pointer; overflow: hidden;
  border: 1.5px solid color-mix(in oklab, var(--soq-ink) 62%, transparent);
  background: color-mix(in oklab, var(--soq-ink) 9%, transparent);
  font-size: 18px; line-height: 1.2; font-weight: 500; letter-spacing: -0.005em;
  transition: border-color 200ms ease, background-color 200ms ease, color 200ms ease, transform 160ms var(--soq-ease);
}
.soq-pill::before {
  content: ""; position: absolute; inset: 0; border-radius: inherit; background: var(--soq-ink);
  transform: scaleX(0); transform-origin: 0 50%; transition: transform 250ms var(--soq-ease); z-index: 0;
}
.soq-pill span { position: relative; z-index: 1; transition: color 220ms ease; }
@media (hover: hover) and (pointer: fine) {
  .soq-pill:hover { border-color: var(--soq-ink); }
  .soq-pill:hover::before { transform: scaleX(1); }
  .soq-pill:hover span { color: var(--soq-deep); }
}
.soq-pill:focus-visible { border-color: var(--soq-ink); }
.soq-pill:focus-visible::before { transform: scaleX(1); }
.soq-pill:focus-visible span { color: var(--soq-deep); }
.soq-pill:active { transform: scale(0.98); }
.soq-pill[aria-pressed="true"] { border-color: var(--soq-ink); }

.soq-decline {
  display: inline-block; margin-top: 26px; padding: 6px 4px; background: none; border: 0; cursor: pointer;
  font-size: 15px; line-height: 1.35; color: var(--soq-ink);
  text-decoration: underline; text-decoration-color: color-mix(in oklab, var(--soq-ink) 35%, transparent);
  text-underline-offset: 4px; transition: text-decoration-color 200ms ease, opacity 200ms ease;
}
.soq-decline:hover { text-decoration-color: var(--soq-ink); }

.soq-check { display: inline-block; vertical-align: -3px; margin-right: 8px; }
.soq-check path { stroke-dasharray: 20; stroke-dashoffset: 20; }
.soq-panel:not([data-hidden]) .soq-check path { stroke-dashoffset: 0; transition: stroke-dashoffset 500ms var(--soq-ease) 260ms; }
.soq-for { margin: 0; font-size: 14px; line-height: 1.3; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--soq-muted); }
.soq-pick { margin: 8px 0 0; font-family: var(--soq-display); font-size: clamp(28px, 3cqi, 38px); line-height: 1.02; font-weight: 800; letter-spacing: -0.03em; text-wrap: balance; }
.soq-note { margin: 10px auto 0; max-width: 34ch; font-size: 16px; line-height: 1.45; color: var(--soq-muted); text-wrap: balance; }
.soq-change {
  display: inline-flex; align-items: center; gap: 8px; margin-top: 14px; min-height: 36px; padding: 6px 14px 6px 12px;
  border-radius: 999px; border: 1px solid color-mix(in oklab, var(--soq-ink) 40%, transparent); background: transparent;
  font-size: 14px; cursor: pointer; transition: border-color 200ms ease, background-color 200ms ease, transform 160ms var(--soq-ease);
}
.soq-change svg { transition: transform 300ms var(--soq-ease); }
.soq-change:hover { border-color: var(--soq-ink); background: color-mix(in oklab, var(--soq-ink) 10%, transparent); }
.soq-change:hover svg { transform: rotate(-200deg); }
.soq-change:active { transform: scale(0.97); }

.soq-form { margin-top: 24px; text-align: center; }
.soq-label { display: block; margin: 0 0 10px; font-size: 14px; font-weight: 600; color: var(--soq-ink); }
.soq-row {
  position: relative; display: flex; flex-wrap: wrap; align-items: stretch; gap: 6px; padding: 5px; border-radius: 30px;
  border: 1.5px solid color-mix(in oklab, var(--soq-ink) 62%, transparent);
  background: color-mix(in oklab, var(--soq-deep) 38%, transparent);
  transition: border-color 200ms ease;
}
.soq-row[data-stack] { flex-direction: column; border-radius: 26px; padding: 6px; }
.soq-row[data-stack] .soq-input { flex: 0 0 auto; height: 46px; }
.soq-row:focus-within { border-color: var(--soq-ink); }
.soq-row[data-invalid] { border-color: var(--soq-err); animation: soq-shake 360ms var(--soq-ease); }
@keyframes soq-shake { 20% { transform: translateX(-6px); } 45% { transform: translateX(5px); } 70% { transform: translateX(-3px); } 100% { transform: none; } }
.soq-input {
  flex: 1 1 190px; min-width: 0; height: 48px; padding: 0 8px 0 16px; border: 0; background: transparent; outline: none;
  font-size: 17px; color: var(--soq-ink);
}
.soq-input::placeholder { color: color-mix(in oklab, var(--soq-ink) 58%, transparent); }
.soq .soq-input:focus-visible { outline: none; }
.soq-btn {
  position: relative; flex: 1 0 auto; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  min-height: 48px; padding: 0 22px; border: 0; border-radius: 999px; cursor: pointer; overflow: hidden;
  background: var(--soq-accent); color: var(--soq-on); font-size: 16px; font-weight: 700; white-space: nowrap;
  transition: transform 160ms var(--soq-ease), opacity 200ms ease;
}
.soq-btn::after {
  content: ""; position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, color-mix(in oklab, var(--soq-on) 16%, transparent) 50%, transparent 70%);
  transform: translateX(-110%); transition: transform 600ms var(--soq-ease);
}
@media (hover: hover) and (pointer: fine) { .soq-btn:hover::after { transform: translateX(110%); } }
.soq-btn:active { transform: scale(0.97); }
.soq-btn[aria-busy="true"] { cursor: progress; }
.soq-btn-l { display: grid; }
.soq-btn-l > span { grid-area: 1 / 1; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
.soq-btn-l > span:not([data-on]) { visibility: hidden; }
.soq-btn[aria-busy="true"] .soq-dots i { animation: soq-dot 900ms ease-in-out infinite; }
.soq-dots { display: inline-flex; gap: 3px; }
.soq-dots i { width: 4px; height: 4px; border-radius: 50%; background: currentColor; opacity: 0.35; }
.soq-dots i:nth-child(2) { animation-delay: 150ms !important; }
.soq-dots i:nth-child(3) { animation-delay: 300ms !important; }
@keyframes soq-dot { 50% { opacity: 1; transform: translateY(-2px); } }
.soq-wait { display: inline-flex; align-items: center; gap: 8px; margin: 18px 0 0; font-size: 15px; color: var(--soq-muted); }
.soq-wait .soq-dots i { animation: soq-dot 900ms ease-in-out infinite; }
.soq-msg { min-height: 22px; margin: 8px 0 0; font-size: 14px; line-height: 1.4; color: var(--soq-err); }
.soq-fine { margin: 4px auto 0; max-width: 40ch; text-wrap: pretty; font-size: 13px; line-height: 1.45; color: var(--soq-muted); }

.soq-code {
  display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 16px;
  padding: 8px 8px 8px 24px; border-radius: 999px; border: 1.5px dashed var(--soq-ink);
  background: color-mix(in oklab, var(--soq-deep) 38%, transparent);
}
.soq-code .soq-btn { flex: 0 0 auto; min-width: 96px; }
.soq-code-v {
  font-family: var(--soq-display); font-weight: 800; font-size: clamp(22px, 2.6cqi, 32px); letter-spacing: 0.04em;
  user-select: all; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.soq-shop {
  display: inline-flex; align-items: center; justify-content: center; gap: 10px; margin-top: 18px; min-height: 52px; padding: 0 26px;
  border-radius: 999px; border: 1.5px solid var(--soq-ink); color: var(--soq-ink); text-decoration: none; font-weight: 600; font-size: 16px;
  background: transparent; cursor: pointer; transition: background-color 220ms ease, color 220ms ease, transform 160ms var(--soq-ease);
}
.soq-shop svg { transition: transform 260ms var(--soq-ease); }
.soq-shop:hover { background: var(--soq-ink); color: var(--soq-deep); }
.soq-shop:hover svg { transform: translateX(4px); }
.soq-shop:active { transform: scale(0.97); }
.soq-done-copy { margin: 14px auto 0; max-width: 36ch; text-wrap: pretty; font-size: 15px; line-height: 1.5; color: var(--soq-muted); }

.soq-close {
  position: absolute; top: 18px; right: 18px; z-index: 5; width: 44px; height: 44px; border-radius: 50%;
  display: grid; place-items: center; cursor: pointer; border: 1px solid color-mix(in oklab, var(--soq-ink) 30%, transparent);
  background: color-mix(in oklab, var(--soq-deep) 40%, transparent); color: var(--soq-ink);
  transition: transform 260ms var(--soq-ease), border-color 200ms ease, background-color 200ms ease;
}
.soq-close:hover { transform: rotate(90deg); border-color: var(--soq-ink); }
.soq-close:active { transform: rotate(90deg) scale(0.94); }
.soq-sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }

@container soq (max-width: 760px) {
  .soq-in { grid-template-columns: minmax(0, 1fr); }
  .soq-plate { --soq-l0: 0%; left: 0; width: 100%; bottom: auto; height: 330px;
    -webkit-mask-image: linear-gradient(to bottom, #000 45%, transparent 100%); mask-image: linear-gradient(to bottom, #000 45%, transparent 100%); }
  .soq-beam { left: 50%; width: 120%; margin-left: -60%; height: 380px; top: -40px; }
  .soq-pool { display: none; }
  .soq-stage { background: radial-gradient(90% 300px at 50% 120px, var(--soq-stage) 0%, color-mix(in oklab, var(--soq-stage) 45%, var(--soq-deep)) 55%, var(--soq-deep) 100%); }
  .soq-still { bottom: auto; height: 236px; padding: 44px 16px 0 0; justify-content: center; }
  .soq-shot[data-fit="contain"] img { inset: 6% 18% 26% 18%; width: 64%; height: 68%; }
  .soq-copy { align-items: center; justify-content: flex-start; padding: 250px 16px 40px; }
  .soq-lineup { top: 52px; bottom: auto; height: 184px; }
  .soq-tile { padding-bottom: 14px; }
  .soq[data-lit="still"] .soq-pick { display: none; }
  .soq-vert { white-space: normal; max-height: 160px; line-height: 0.95; }
  .soq-kicker { font-size: 17px; }
  .soq-q { font-size: 17px; margin-bottom: 20px; }
  .soq-panels { margin-top: 22px; }
  .soq-pill { min-height: 52px; font-size: 17px; }
  .soq-row { flex-direction: column; border-radius: 26px; padding: 6px; }
  .soq-input { flex: 0 0 auto; height: 46px; }
  .soq-close { top: 12px; right: 12px; }
}

@media (prefers-reduced-motion: reduce) {
  .soq-beam { animation: none; transition: opacity 200ms linear; }
  .soq-shot[data-on][data-pull][data-kind="photo"] { animation: soq-in 160ms linear both; }
  .soq-shot[data-on], .soq-shot[data-on][data-kind="still"] { animation: soq-in 160ms linear both; }
  .soq-shot[data-prev] { visibility: hidden; }
  .soq-shot img, .soq-shot[data-on] img { transform: none; transition: none; }
  .soq-panel, .soq-panel[data-hidden], .soq-panel > *, .soq-panel[data-hidden] > * { transform: none; transition-property: opacity, visibility; }
  .soq-modal, .soq-modal[data-shown], .soq-modal[data-closing] { transform: none; }
  .soq-pill::before { transition: none; }
  .soq-row[data-invalid] { animation: none; }
  .soq-close:hover { transform: none; }
  .soq-change:hover svg, .soq-shop:hover svg { transform: none; }
  .soq-check path { stroke-dashoffset: 0; transition: none !important; }
}
`

const U = "https://images.unsplash.com/photo-"
const Q = "?q=80&w=1600&auto=format&fit=crop"

const DEFAULT_OPTIONS: OfferOption[] = [
  {
    label: "Always on a call",
    tag: "someone always on a call",
    pick: "Studio over-ears",
    note: "Closed-back, thirty hours a charge, and they fold flat into a coat pocket.",
    image: U + "1505740420928-5e560c06d30e" + Q,
    imageAlt: "Over-ear headphones",
  },
  {
    label: "Never on time",
    tag: "someone never on time",
    pick: "Field Watch 38",
    note: "A 38 mm steel case, sapphire glass and a strap that softens with wear.",
    image: U + "1523275335684-37898b6baf30" + Q,
    imageAlt: "A wristwatch",
  },
  {
    label: "Still shoots on film",
    tag: "the film photographer",
    pick: "Instant 600",
    note: "Prints in ninety seconds. Comes with two packs of film in the box.",
    image: U + "1526170375885-4d8ecf77b99f" + Q,
    imageAlt: "An instant camera",
  },
  {
    label: "Lives outdoors",
    tag: "someone who lives outdoors",
    pick: "Ridge sunglasses",
    note: "Polarised lenses in a light acetate frame that survives a rucksack.",
    image: U + "1572635196237-14b3f281503f" + Q,
    imageAlt: "A pair of sunglasses",
  },
  {
    label: "Impossible to buy for",
    tag: "the impossible one",
    pick: "Gift card",
    note: "Any amount from £20, sent by email on the day you choose.",
  },
]

const useIsoLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect

function useMounted() {
  const [m, setM] = React.useState(false)
  React.useEffect(() => setM(true), [])
  return m
}

function useReducedMotion() {
  const [r, setR] = React.useState(false)
  React.useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)")
    const f = () => setR(q.matches)
    f()
    q.addEventListener?.("change", f)
    return () => q.removeEventListener?.("change", f)
  }, [])
  return r
}

function readStamp(key: string): number | null {
  try {
    const v = window.localStorage.getItem(key)
    return v ? Number(v) || null : null
  } catch {
    return null
  }
}
function writeStamp(key: string) {
  try {
    window.localStorage.setItem(key, String(Date.now()))
  } catch {
    /* storage blocked: the popup simply asks again next time */
  }
}

function Still({ text, size }: { text: string; size: number }) {
  const { lines } = stillWords(text)
  const style = (size ? { "--soq-still": size + "px" } : {}) as React.CSSProperties
  return (
    <div className="soq-still" style={style} aria-hidden="true">
      {lines.map((l, i) => (
        <span key={i}>{l}</span>
      ))}
    </div>
  )
}

export default function SpotlightOfferQuiz({
  variant = "modal",
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  trigger = "manual",
  delayMs = 6000,
  rememberDismissDays,
  storageKey = "spotlight-offer-quiz",
  kicker = "Your first gift,",
  offer = "15% off",
  question = "Who are you shopping for? We'll find the thing they'll actually use.",
  options = DEFAULT_OPTIONS,
  optionsLabel = "Who are you shopping for?",
  pickIntro,
  changeLabel = "Change answer",
  image,
  imageAlt = "",
  imageFocus = "50% 50%",
  imageFit = "cover",
  brand,
  grade = "mono",
  collectEmail = true,
  emailLabel = "Where should we send your code?",
  placeholder = "you@example.com",
  submitLabel = "Send my code",
  pendingLabel = "Sending",
  code = "FIRSTGIFT15",
  onClaim,
  onPick,
  doneCopy,
  copyLabel = "Copy",
  copiedLabel = "Copied",
  shopLabel = (o: OfferOption) => "Shop " + (o.pick || "now"),
  continueLabel = "Start shopping",
  finePrint = "One code per order. No spam, unsubscribe in one click.",
  decline = "No thanks, I'll wrap socks again",
  onDecline,
  closeLabel = "Close offer",
  preset = "graphite",
  darkPreset,
  colors,
  displayFont = DISPLAY,
  textFont = TEXT,
  height = "100svh",
  className,
  "aria-label": ariaLabel,
}: SpotlightOfferQuizProps) {
  const uid = React.useId().replace(/:/g, "")
  const mounted = useMounted()
  const reduced = useReducedMotion()
  const [state, dispatch] = React.useReducer(quizReducer, undefined, initialQuiz)
  const [email, setEmail] = React.useState("")
  const [copied, setCopied] = React.useState(false)
  const [failed, setFailed] = React.useState({} as { [src: string]: boolean })
  const [swap, setSwap] = React.useState(false)
  const [openState, setOpenState] = React.useState(defaultOpen && trigger === "manual")
  const [shown, setShown] = React.useState(false)
  const [closing, setClosing] = React.useState(false)
  const [fit, setFit] = React.useState(0)
  const [box, setBox] = React.useState({ w: 0, h: 0, narrow: false })
  const [panelsMin, setPanelsMin] = React.useState(0)

  const rootRef = React.useRef(null as HTMLDivElement | null)
  const colRef = React.useRef(null as HTMLDivElement | null)
  const measureRef = React.useRef(null as HTMLSpanElement | null)
  const inputRef = React.useRef(null as HTMLInputElement | null)
  const copyRef = React.useRef(null as HTMLButtonElement | null)
  const codeRef = React.useRef(null as HTMLSpanElement | null)
  const pillRefs = React.useRef([] as (HTMLButtonElement | null)[])
  const pickedAt = React.useRef(0)
  const plateRef = React.useRef(null as HTMLDivElement | null)
  const scrollRef = React.useRef(null as HTMLDivElement | null)
  const panelRefs = React.useRef([] as (HTMLDivElement | null)[])
  const previewTimer = React.useRef(0)
  const alive = React.useRef(true)
  const prevSlot = React.useRef(-2)
  const [prev, setPrev] = React.useState(-2)

  React.useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const isModal = variant === "modal"
  const quietDays = rememberDismissDays ?? (trigger === "manual" ? 0 : 7)
  const controlled = openProp !== undefined
  const isOpen = isModal ? (controlled ? !!openProp : openState) : true

  const setOpen = React.useCallback(
    (v: boolean) => {
      if (!controlled) setOpenState(v)
      onOpenChange?.(v)
    },
    [controlled, onOpenChange],
  )

  // ---- self-opening triggers (uncontrolled modal only)
  React.useEffect(() => {
    if (!isModal || controlled || trigger === "manual") return
    if (dismissedRecently(readStamp(storageKey), Date.now(), quietDays)) return
    if (trigger === "delay") {
      const t = window.setTimeout(() => setOpen(true), Math.max(0, delayMs))
      return () => window.clearTimeout(t)
    }
    const onOut = (e: MouseEvent) => {
      if (!e.relatedTarget && e.clientY <= 0) {
        setOpen(true)
        document.removeEventListener("mouseout", onOut)
      }
    }
    // Exit intent needs a mouse; touch visitors get the delay instead.
    if (!window.matchMedia("(pointer: fine)").matches) {
      const t = window.setTimeout(() => setOpen(true), Math.max(0, delayMs))
      return () => window.clearTimeout(t)
    }
    document.addEventListener("mouseout", onOut)
    return () => document.removeEventListener("mouseout", onOut)
  }, [isModal, controlled, trigger, delayMs, quietDays, storageKey, setOpen])

  // ---- entrance: lights come up a frame after mount
  React.useEffect(() => {
    if (!isModal || !isOpen || !mounted) {
      setShown(false)
      return
    }
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)))
    return () => cancelAnimationFrame(r)
  }, [isModal, isOpen, mounted])

  const requestClose = React.useCallback(() => {
    if (quietDays > 0) writeStamp(storageKey)
    if (reduced) return setOpen(false)
    setClosing(true)
    window.setTimeout(() => {
      setClosing(false)
      setOpen(false)
    }, 150)
  }, [reduced, setOpen, quietDays, storageKey])

  // ---- dialog behaviour: scroll lock, Escape, focus trap, focus return
  React.useEffect(() => {
    if (!isModal || !isOpen || !mounted) return
    const before = document.activeElement as HTMLElement | null
    const html = document.documentElement
    const prevOverflow = html.style.overflow
    html.style.overflow = "hidden"
    // The dialog itself takes focus: focusing a pill would light up its product before anyone asked.
    const t = window.setTimeout(() => rootRef.current?.focus({ preventScroll: true }), 60)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        requestClose()
        return
      }
      if (e.key !== "Tab" || !rootRef.current) return
      const items = Array.from(
        rootRef.current.querySelectorAll("button, input, a[href], [tabindex]:not([tabindex='-1'])"),
      ).filter((n) => !(n as HTMLButtonElement).disabled && !n.closest("[inert], [data-hidden]")) as HTMLElement[]
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && (document.activeElement === first || !rootRef.current.contains(document.activeElement))) {
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
      html.style.overflow = prevOverflow
      before?.focus?.({ preventScroll: true })
    }
  }, [isModal, isOpen, mounted, requestClose])

  // ---- fit the offer to its column
  const offerLines = React.useMemo(() => offer.split("\n").map((l) => l.trim()).filter(Boolean), [offer])
  useIsoLayoutEffect(() => {
    const col = colRef.current
    const m = measureRef.current
    if (!col || !m) return
    const run = () => {
      const w = Array.from(m.children).reduce((mx, el) => Math.max(mx, (el as HTMLElement).getBoundingClientRect().width), 0)
      const avail = col.getBoundingClientRect().width
      const narrow = (rootRef.current?.getBoundingClientRect().width || 1000) <= 760
      setFit(fitSize(w * 1.02, avail, 36, narrow ? 112 : 148))
    }
    run()
    const ro = new ResizeObserver(run)
    ro.observe(col)
    return () => ro.disconnect()
  }, [offerLines, displayFont, mounted, isOpen])

  // ---- the stage box, for sizing the lettering that stands in for a missing photo
  useIsoLayoutEffect(() => {
    const el = plateRef.current
    if (!el) return
    const run = () => {
      const r = el.getBoundingClientRect()
      const narrow = (rootRef.current?.getBoundingClientRect().width || 1000) <= 760
      setBox((b) => (b.w === r.width && b.h === r.height && b.narrow === narrow ? b : { w: r.width, h: r.height, narrow }))
    }
    run()
    const ro = new ResizeObserver(run)
    ro.observe(el)
    return () => ro.disconnect()
  }, [mounted, isOpen])

  // ---- hidden steps are inert (set as a property: React 18 and 19 disagree on the attribute)
  React.useEffect(() => {
    const order = ["ask", "claim", "done"]
    panelRefs.current.forEach((el, i) => {
      if (el) el.inert = order[i] !== state.step
    })
  }, [state.step, mounted, isOpen])

  // ---- the steps share one height, so the offer above them never moves
  useIsoLayoutEffect(() => {
    const els = panelRefs.current.filter(Boolean) as HTMLDivElement[]
    if (!els.length) return
    const run = () => setPanelsMin(els.reduce((m, el) => Math.max(m, el.offsetHeight), 0))
    run()
    const ro = new ResizeObserver(run)
    els.forEach((el) => ro.observe(el))
    return () => ro.disconnect()
  }, [mounted, isOpen, options, state.picked])

  // ---- a new step starts at the top of the popup
  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [state.step])

  // ---- which photo is lit, and the swap choreography
  const slot = litSlot(state)
  React.useEffect(() => {
    if (prevSlot.current === slot) return
    setPrev(prevSlot.current)
    prevSlot.current = slot
    if (reduced) return
    setSwap(true)
    const t = window.setTimeout(() => setSwap(false), 260)
    return () => window.clearTimeout(t)
  }, [slot, reduced])

  const shots = React.useMemo(() => {
    const list = [{ key: -1, src: image || "", alt: imageAlt, focus: imageFocus, fit: imageFit, word: brand || offerLines.join(" ") }]
    // An answer without its own photo spells its pick rather than repeating the stage's photo.
    options.forEach((o, i) => list.push({ key: i, src: o.image || "", alt: o.imageAlt || o.pick || o.label, focus: o.focus || imageFocus, fit: o.fit || imageFit, word: o.pick || o.label }))
    return list
  }, [options, image, imageAlt, imageFocus, imageFit, brand, offerLines])

  // Lettering sizes: measured in the display face, fitted to the stage box like the offer.
  const stillSizes = React.useMemo(() => {
    const out: { [word: string]: number } = {}
    if (!box.w || typeof document === "undefined") return out
    const ctx = document.createElement("canvas").getContext("2d")
    if (!ctx) return out
    ctx.font = "800 100px " + displayFont
    const area = box.narrow ? { w: box.w - 16, h: 192 } : { w: box.w, h: box.h }
    shots.forEach((s) => {
      const { lines } = stillWords(s.word)
      const w = lines.reduce((m, l) => Math.max(m, ctx.measureText(l).width - 4.5 * Math.max(0, l.length - 1)), 0)
      out[s.word] = stillSize(w * 1.04, lines.length, area, box.narrow ? 0.9 : 0.7)
    })
    // The line-up's upright names: one size for every column, held by the column width and the stage height.
    const inLineup = options.filter((o) => o.image)
    const colW = (box.w * (box.narrow ? 1 : 0.76) - 6 * (inLineup.length - 1)) / Math.max(1, inLineup.length)
    // Phones wrap each name onto two upright lines, so the longest word sets the size there.
    const longest = inLineup.reduce((m, o) => {
      const name = (o.pick || o.label).toUpperCase()
      const parts = box.narrow ? name.split(/\s+/) : [name]
      return parts.reduce((mm, w) => Math.max(mm, ctx.measureText(w).width), m)
    }, 0)
    out["\u0000tile"] = box.narrow
      ? Math.min(colW / 2.3, fitSize(longest * 1.06, 150, 12, 60))
      : Math.min(colW * 0.46, fitSize(longest * 1.04, box.h * 0.6, 12, 200))
    return out
  }, [shots, box, displayFont, options])

  // Preload every answer's photo so a hover never waits on the network.
  React.useEffect(() => {
    const seen: { [src: string]: boolean } = {}
    shots.forEach((s) => {
      if (!s.src || seen[s.src]) return
      seen[s.src] = true
      const im = new Image()
      im.onerror = () => setFailed((f) => (f[s.src] ? f : { ...f, [s.src]: true }))
      im.src = s.src
    })
  }, [shots])

  // ---- actions
  const preview = (i: number) => {
    window.clearTimeout(previewTimer.current)
    previewTimer.current = window.setTimeout(() => dispatch({ type: "preview", index: i }), i < 0 ? 140 : 80)
  }
  const option = state.picked >= 0 ? options[state.picked] : undefined

  const finish = async (opt: OfferOption, index: number, value: string) => {
    dispatch({ type: "submit" })
    try {
      const out = onClaim ? await onClaim({ email: value, option: opt, index }) : await new Promise((r) => window.setTimeout(r, 700))
      if (!alive.current) return
      if (quietDays > 0) writeStamp(storageKey)
      dispatch({ type: "success", code: resolveCode(out, opt, code), email: value })
      window.setTimeout(() => copyRef.current?.focus({ preventScroll: true }), 320)
    } catch (err) {
      if (!alive.current) return
      dispatch({ type: "fail", error: err instanceof Error && err.message ? err.message : "That didn't go through. Try again in a moment." })
      inputRef.current?.focus()
    }
  }

  const pick = (i: number) => {
    window.clearTimeout(previewTimer.current)
    pickedAt.current = Date.now()
    dispatch({ type: "pick", index: i })
    onPick?.(options[i], i)
    if (!collectEmail) {
      if (onClaim) finish(options[i], i, "")
      else dispatch({ type: "success", code: resolveCode(undefined, options[i], code), email: "" })
      if (!onClaim) window.setTimeout(() => copyRef.current?.focus({ preventScroll: true }), reduced ? 30 : 330)
      return
    }
    window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), reduced ? 30 : 330)
  }

  const change = () => {
    // A double-click on an answer lands on this chip, which appears under the pointer: ignore it.
    if (Date.now() - pickedAt.current < 450) return
    const was = state.picked
    dispatch({ type: "change" })
    window.setTimeout(() => pillRefs.current[was]?.focus({ preventScroll: true }), reduced ? 30 : 260)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!option || state.status === "pending") return
    const value = email.trim()
    if (!value) {
      dispatch({ type: "invalid", error: "Add your email so we know where to send it." })
      inputRef.current?.focus()
      return
    }
    if (!isEmail(value)) {
      dispatch({ type: "invalid", error: "That address is missing something. Try name@domain.com." })
      inputRef.current?.focus()
      return
    }
    finish(option, state.picked, value)
  }

  const copy = async () => {
    const text = state.code
    let ok = false
    try {
      await navigator.clipboard.writeText(text)
      ok = true
    } catch {
      // Clipboard blocked (iframes, http): select the code so the visitor can copy it.
      const el = codeRef.current
      if (el) {
        const range = document.createRange()
        range.selectNodeContents(el)
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(range)
        try {
          ok = document.execCommand("copy")
        } catch {
          ok = false
        }
      }
    }
    if (ok) {
      setCopied(true)
      window.setTimeout(() => alive.current && setCopied(false), 1800)
    }
  }

  const declineClick = () => {
    onDecline?.()
    if (isModal) requestClose()
  }

  // ---- palette
  const base = { ...(PRESETS[preset] || PRESETS.graphite), ...colors }
  const dark = darkPreset ? { ...PRESETS[darkPreset], ...colors } : base
  const vars = {
    "--soq-display": displayFont,
    "--soq-text": textFont,
    "--soq-grade": GRADES[grade] || "none",
    "--soq-h": height,
    "--soq-err": "#ff8a7a",
    "--soq-fit": fit ? fit + "px" : undefined,
    "--soq-l-stage": base.stage,
    "--soq-l-deep": base.deep,
    "--soq-l-ink": base.ink,
    "--soq-l-muted": base.muted,
    "--soq-l-accent": base.accent,
    "--soq-l-on": base.onAccent,
    "--soq-l-beam": base.beam,
    "--soq-d-stage": dark.stage,
    "--soq-d-deep": dark.deep,
    "--soq-d-ink": dark.ink,
    "--soq-d-muted": dark.muted,
    "--soq-d-accent": dark.accent,
    "--soq-d-on": dark.onAccent,
    "--soq-d-beam": dark.beam,
  } as React.CSSProperties
  if (preset === "chalk" && !colors?.ink) (vars as { [k: string]: string })["--soq-err"] = "#a8231a"

  const step = state.step
  const intro =
    option && (typeof pickIntro === "function" ? pickIntro(option) : pickIntro ?? (option.tag ? "Our pick for " + option.tag : "Our pick for you"))
  const submitText = option ? (typeof submitLabel === "function" ? submitLabel(option) : submitLabel) : ""
  const shopText = option ? (typeof shopLabel === "function" ? shopLabel(option) : shopLabel) : ""
  const doneText = option
    ? typeof doneCopy === "function"
      ? doneCopy(state.email, option)
      : doneCopy ??
        (state.email
          ? "We've sent it to " + state.email + " too. It works on " + (option.pick || "your pick") + " or anything else in the shop."
          : "Use it at checkout. It works on " + (option.pick || "your pick") + " or anything else in the shop.")
    : null
  const showDecline = decline !== null && decline !== undefined && (isModal || !!onDecline)
  const hide = (h: boolean) => (h ? ({ "data-hidden": "", "aria-hidden": true } as { [k: string]: unknown }) : {})
  const litShot = shots.find((x) => x.key === slot)
  // The line-up holds the answers that have a photo; the rest spell their pick when pointed at.
  const members = options.map((o, i) => (o.image ? i : -1)).filter((i) => i >= 0)
  const lineup = !image && members.length > 0
  const litKind =
    slot < 0 && lineup ? "lineup" : litShot && litShot.src && !failed[litShot.src] ? (litShot.fit === "contain" ? "packshot" : "photo") : "still"
  const aim =
    slot >= 0 && lineup && !reduced && members.includes(slot) ? ((members.indexOf(slot) - (members.length - 1) / 2) * 4).toFixed(2) + "deg" : "0deg"
  const panelRef = (i: number) => (el: HTMLDivElement | null) => {
    panelRefs.current[i] = el
  }

  const plate = (
    <>
      <div className="soq-stage" aria-hidden="true" />
      <div className="soq-plate" ref={plateRef}>
        {shots.map((s) => {
          const on = s.key === slot
          const was = s.key === prev && !on
          const ok = !!s.src && !failed[s.src]
          if (s.key < 0 && lineup)
            return (
              <div key={s.key} className="soq-shot" data-on={on || undefined} data-prev={was || undefined} data-kind="still" aria-hidden={!on || undefined}>
                <div className="soq-lineup" style={{ "--soq-tile": (stillSizes["\u0000tile"] || 40) + "px" } as React.CSSProperties}>
                  {members.map((i) => {
                    const o = options[i]
                    const src = o.image && !failed[o.image] ? o.image : ""
                    return (
                      <div key={i} className="soq-tile" data-fit={src ? o.fit || imageFit : undefined}>
                        {src ? (
                          <img src={src} alt="" width={800} height={1200} decoding="async" style={{ objectPosition: o.focus || imageFocus }} />
                        ) : (
                          <span className="soq-vert">{(o.pick || o.label).replace(/-/g, "\u2011")}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          return (
            <div
              key={s.key}
              className="soq-shot"
              data-on={on || undefined}
              data-prev={was || undefined}
              data-pull={(lineup && members.includes(s.key)) || undefined}
              data-kind={ok ? "photo" : "still"}
              data-fit={ok ? s.fit : undefined}
              aria-hidden={!on || undefined}
              style={{ "--i": members.indexOf(s.key), "--n": Math.max(1, members.length) } as React.CSSProperties}
            >
              {ok ? (
                <img
                  src={s.src}
                  alt={on ? s.alt || "" : ""}
                  width={1600}
                  height={1200}
                  decoding="async"
                  style={{ objectPosition: s.focus }}
                  onError={() => setFailed((f) => ({ ...f, [s.src]: true }))}
                />
              ) : (
                <Still text={s.word} size={stillSizes[s.word] || 0} />
              )}
            </div>
          )
        })}
      </div>
      <div className="soq-beam" aria-hidden="true" />
      <div className="soq-pool" aria-hidden="true" />
      <div className="soq-grain" aria-hidden="true" style={{ backgroundImage: GRAIN }} />
    </>
  )

  const titleId = uid + "-t"
  const content = (
    <div className="soq-in">
      <div className="soq-copy">
        <div className="soq-col" ref={colRef}>
          <h2 className="soq-h" id={titleId}>
            <span className="soq-kicker">{kicker}</span>
            <span className="soq-offer">
              {offerLines.map((l, i) => (
                <span key={i}>{l}</span>
              ))}
              <span className="soq-measure" ref={measureRef} aria-hidden="true">
                {offerLines.map((l, i) => (
                  <span key={i}>{l}</span>
                ))}
              </span>
            </span>
          </h2>
          <div className="soq-panels" style={panelsMin ? { minHeight: panelsMin } : undefined}>
            <div className="soq-panel" ref={panelRef(0)} {...hide(step !== "ask")}>
              {question ? <p className="soq-q">{question}</p> : null}
              <fieldset className="soq-pills" style={{ "--i": 0 } as React.CSSProperties} onPointerLeave={() => preview(-1)}>
                <legend className="soq-sr">{optionsLabel}</legend>
                {options.map((o, i) => (
                  <button
                    key={i}
                    ref={(el) => {
                      pillRefs.current[i] = el
                    }}
                    type="button"
                    className="soq-pill"
                    aria-pressed={state.picked === i}
                    onPointerEnter={(e) => e.pointerType === "mouse" && preview(i)}
                    onFocus={() => preview(i)}
                    onBlur={() => preview(-1)}
                    onClick={() => pick(i)}
                  >
                    <span>{o.label}</span>
                  </button>
                ))}
              </fieldset>
              {showDecline ? (
                <button type="button" className="soq-decline" style={{ "--i": 1 } as React.CSSProperties} onClick={declineClick}>
                  {decline}
                </button>
              ) : null}
            </div>

            <div className="soq-panel" ref={panelRef(1)} {...hide(step !== "claim")}>
              {option ? (
                <>
                  <p className="soq-for" style={{ "--i": 0 } as React.CSSProperties}>
                    {intro}
                  </p>
                  <p className="soq-pick" style={{ "--i": 1 } as React.CSSProperties}>
                    {option.pick || option.label}
                  </p>
                  {option.note ? (
                    <p className="soq-note" style={{ "--i": 2 } as React.CSSProperties}>
                      {option.note}
                    </p>
                  ) : null}
                  <div style={{ "--i": 3 } as React.CSSProperties}>
                    <button type="button" className="soq-change" onClick={change} aria-label={changeLabel + " (" + option.label + ")"}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M13.5 8a5.5 5.5 0 1 1-1.61-3.89M13.5 2.5v3h-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>{changeLabel}</span>
                    </button>
                  </div>
                  {collectEmail ? (
                    <form className="soq-form" style={{ "--i": 4 } as React.CSSProperties} onSubmit={submit} noValidate>
                      <label className="soq-label" htmlFor={uid + "-e"}>
                        {emailLabel}
                      </label>
                      <div className="soq-row" data-invalid={state.status === "error" || undefined} data-stack={submitText.length > 14 || undefined} key={state.error}>
                        <input
                          ref={inputRef}
                          id={uid + "-e"}
                          className="soq-input"
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          placeholder={placeholder}
                          value={email}
                          aria-invalid={state.status === "error" || undefined}
                          aria-describedby={uid + "-m " + uid + "-f"}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                        <button className="soq-btn" type="submit" aria-busy={state.status === "pending"}>
                          <span className="soq-btn-l">
                            <span data-on={state.status !== "pending" || undefined}>{submitText}</span>
                            <span data-on={state.status === "pending" || undefined}>
                              {pendingLabel}
                              <span className="soq-dots" aria-hidden="true">
                                <i />
                                <i />
                                <i />
                              </span>
                            </span>
                          </span>
                        </button>
                      </div>
                      <p className="soq-msg" id={uid + "-m"} role="alert" aria-live="assertive">
                        {state.error}
                      </p>
                      {finePrint ? (
                        <p className="soq-fine" id={uid + "-f"}>
                          {finePrint}
                        </p>
                      ) : null}
                    </form>
                  ) : (
                    <div style={{ "--i": 4 } as React.CSSProperties}>
                      {state.status === "pending" ? (
                        <p className="soq-wait" role="status">
                          {pendingLabel}
                          <span className="soq-dots" aria-hidden="true">
                            <i />
                            <i />
                            <i />
                          </span>
                        </p>
                      ) : null}
                      <p className="soq-msg" role="alert" aria-live="assertive">
                        {state.error}
                      </p>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            <div className="soq-panel" ref={panelRef(2)} {...hide(step !== "done")}>
              {option ? (
                <>
                  <p className="soq-for" style={{ "--i": 0 } as React.CSSProperties}>
                    <svg className="soq-check" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M3 8.5l3.2 3L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Your code for {offerLines.join(" ").toLowerCase()}
                  </p>
                  <div className="soq-code" style={{ "--i": 1 } as React.CSSProperties}>
                    <span className="soq-code-v" ref={codeRef}>
                      {state.code}
                    </span>
                    <button ref={copyRef} type="button" className="soq-btn" onClick={copy} aria-label={copied ? copiedLabel : copyLabel + " " + state.code}>
                      {copied ? copiedLabel : copyLabel}
                    </button>
                  </div>
                  <span className="soq-sr" aria-live="polite">
                    {copied ? copiedLabel : ""}
                  </span>
                  <p className="soq-done-copy" style={{ "--i": 2 } as React.CSSProperties}>
                    {doneText}
                  </p>
                  <div style={{ "--i": 3 } as React.CSSProperties}>
                    {option.href ? (
                      <a className="soq-shop" href={option.href}>
                        {shopText}
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <path d="M3 8h9.5M8.5 3.5 13 8l-4.5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </a>
                    ) : isModal ? (
                      <button type="button" className="soq-shop" onClick={requestClose}>
                        {continueLabel}
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <path d="M3 8h9.5M8.5 3.5 13 8l-4.5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <div aria-hidden="true" />
    </div>
  )

  const common = {
    ref: rootRef,
    "data-step": step,
    "data-swap": swap || undefined,
    "data-lit": litKind,
    "data-lineup": lineup || undefined,
    "data-paired": darkPreset ? "" : undefined,
    style: { ...vars, "--soq-aim": aim } as React.CSSProperties,
  }

  if (isModal) {
    if (!mounted || !isOpen) return null
    return createPortal(
      <div
        {...common}
        className={"soq soq-modal" + (className ? " " + className : "")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-shown={shown || undefined}
        data-closing={closing || undefined}
      >
        <style>{CSS}</style>
        <div className="soq-scroll" ref={scrollRef}>
          <div className="soq-frame">
            {plate}
            {content}
          </div>
        </div>
        <button type="button" className="soq-close" aria-label={closeLabel} onClick={requestClose}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </button>
      </div>,
      document.body,
    )
  }

  return (
    <section {...common} className={"soq soq-section" + (className ? " " + className : "")} aria-labelledby={ariaLabel ? undefined : titleId} aria-label={ariaLabel}>
      <style>{CSS}</style>
      {plate}
      {content}
    </section>
  )
}

// Declared after the JSX: the 21st CLI tokenizer hangs on generics before it.
export type OfferPaletteInput = Partial<OfferPalette>
