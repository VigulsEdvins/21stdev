"use client"

// Slat Count Preloader — a Swiss-poster loading gate built from black slats.
// Every character on screen is a 3 × 7 grid of 2:1 bars, and every row always
// owns exactly three of them. A number is drawn by sliding those bars sideways
// into the lit cells and stacking the spares behind them, so the count never
// fades or swaps glyphs: it shunts, row by row, with a staggered delay per bar.
// At 100 the poster splits into horizontal blinds that slide off whatever it
// was guarding.
//
// One file, React only. Hover the slats to light a row and lean the type,
// click (or Enter / Space) to scatter them and watch them find their way back.
// Every rule in the scoped <style> is .scp- prefixed and nothing is fetched.

import * as React from "react"

export interface SlatPalette {
  /** The poster. Also the colour of the blinds that slide away at the end. */
  background: string
  /** The slats and the HUD type. */
  ink: string
  /** The row under the pointer, the progress rail and focus rings. */
  accent: string
}

export type SlatPreset = "vermilion" | "ink" | "paper" | "cobalt"

export interface SlatCountPreloaderProps {
  /** Content revealed once the blinds open. Ignored while `loop` is set. */
  children?: React.ReactNode
  /** Run forever as a showcase: children are never revealed, onComplete never fires. */
  loop?: boolean
  /**
   * Real loading progress, 0–100. Leave undefined to run the built-in
   * simulated load over `durationMs`. The count holds until this hits 100.
   */
  progress?: number
  /** Length of the simulated load. Defaults to 5600ms. */
  durationMs?: number
  /**
   * Show these frames in order instead of a percentage, one per `stepMs`.
   * Numbers and A–Z both work: `[3, 2, 1, "GO"]`. Numbers right-align and
   * follow `pad`; strings centre, so `["3", "2", "1"]` counts down mid-screen.
   * Overrides `progress`.
   */
  sequence?: Array<string | number>
  /** Minimum character slots. Grows to fit the longest `sequence` frame. Defaults to 3. */
  digits?: number
  /** Pad numbers with zeros (`007`). With false the spare slots fold away. Defaults to true. */
  pad?: boolean
  /** Starting colours. Defaults to "vermilion". */
  preset?: SlatPreset
  /** Colour overrides, merged over the preset. */
  palette?: Partial<SlatPalette>
  /** Top-left line of the HUD. */
  label?: string
  /** Bottom-left line of the HUD. */
  caption?: string
  /** Corner type, registration marks, the rail and the skip button. Defaults to true. */
  hud?: boolean
  /** Character height, any CSS length. Defaults to a size that fits the gate (container units). */
  size?: string
  /** Slat width ÷ height. Defaults to 2. */
  slatRatio?: number
  /** How long one slat takes to shunt, in ms. Defaults to 520. */
  speed?: number
  /** How often the count advances, in ms. Defaults to 720. */
  stepMs?: number
  /** Hover to light a row, click to scatter. Defaults to true. */
  interactive?: boolean
  /** How the gate leaves: horizontal blinds, or a plain fade. Defaults to "blinds". */
  exit?: "blinds" | "fade"
  /** Face for the HUD. The default stack never fetches anything. */
  fontFamily?: string
  /** Root height. A definite length, never a percentage. */
  height?: string
  /** Fired once, after the gate has lifted. */
  onComplete?: () => void
  /** Extra root class names. */
  className?: string
}

const PRESETS: Record<SlatPreset, SlatPalette> = {
  vermilion: { background: "#ec472c", ink: "#0d0b0a", accent: "#fff1df" },
  ink: { background: "#0f0e0d", ink: "#ec472c", accent: "#f4ede2" },
  paper: { background: "#efe9dd", ink: "#141312", accent: "#ec472c" },
  cobalt: { background: "#1d3bd1", ink: "#f3efe6", accent: "#ffcd3c" },
}

const MONO_STACK = '"JetBrains Mono", "SF Mono", ui-monospace, Menlo, Consolas, monospace'

const ROWS = 7
const BLINDS = 8
const INTRO_MS = 900
const HOLD_MS = 1100
const SCATTER_MS = 520

// #region timeline
// Pure helpers, lifted out and executed by tests/slat-count-preloader.test.mjs.

// 3 × 7 bitmap font, one string per row, "1" is a lit cell.
export const SCP_FONT: Record<string, string[]> = {
  "0": ["111", "101", "101", "101", "101", "101", "111"],
  "1": ["010", "110", "010", "010", "010", "010", "111"],
  "2": ["111", "001", "001", "111", "100", "100", "111"],
  "3": ["111", "001", "001", "111", "001", "001", "111"],
  "4": ["101", "101", "101", "111", "001", "001", "001"],
  "5": ["111", "100", "100", "111", "001", "001", "111"],
  "6": ["111", "100", "100", "111", "101", "101", "111"],
  "7": ["111", "001", "001", "010", "010", "010", "010"],
  "8": ["111", "101", "101", "111", "101", "101", "111"],
  "9": ["111", "101", "101", "111", "001", "001", "111"],
  A: ["111", "101", "101", "111", "101", "101", "101"],
  B: ["110", "101", "101", "110", "101", "101", "110"],
  C: ["111", "100", "100", "100", "100", "100", "111"],
  D: ["110", "101", "101", "101", "101", "101", "110"],
  E: ["111", "100", "100", "111", "100", "100", "111"],
  F: ["111", "100", "100", "111", "100", "100", "100"],
  G: ["111", "100", "100", "101", "101", "101", "111"],
  H: ["101", "101", "101", "111", "101", "101", "101"],
  I: ["111", "010", "010", "010", "010", "010", "111"],
  J: ["001", "001", "001", "001", "001", "101", "111"],
  K: ["101", "101", "110", "100", "110", "101", "101"],
  L: ["100", "100", "100", "100", "100", "100", "111"],
  M: ["101", "111", "111", "101", "101", "101", "101"],
  N: ["110", "101", "101", "101", "101", "101", "101"],
  O: ["111", "101", "101", "101", "101", "101", "111"],
  P: ["111", "101", "101", "111", "100", "100", "100"],
  Q: ["111", "101", "101", "101", "101", "111", "001"],
  R: ["111", "101", "101", "110", "101", "101", "101"],
  S: ["111", "100", "100", "111", "001", "001", "111"],
  T: ["111", "010", "010", "010", "010", "010", "010"],
  U: ["101", "101", "101", "101", "101", "101", "111"],
  V: ["101", "101", "101", "101", "101", "101", "010"],
  W: ["101", "101", "101", "101", "111", "111", "101"],
  X: ["101", "101", "101", "010", "101", "101", "101"],
  Y: ["101", "101", "101", "111", "010", "010", "010"],
  Z: ["111", "001", "001", "010", "100", "100", "111"],
  "-": ["000", "000", "000", "111", "000", "000", "000"],
  "!": ["010", "010", "010", "010", "010", "000", "010"],
  ".": ["000", "000", "000", "000", "000", "000", "010"],
}

// Where the three bars of one row go. A bar whose own cell is lit stays put;
// a spare slides to the nearest lit cell and hides behind it. The middle bar
// of a "101" row has two equally near homes, so it alternates by row and the
// shunts don't all lean the same way. Empty row: null.
export function scpRowTargets(row: string, r: number) {
  const lit: number[] = []
  for (let c = 0; c < 3; c++) if (row[c] === "1") lit.push(c)
  if (!lit.length) return null
  const out: number[] = []
  for (let c = 0; c < 3; c++) {
    if (lit.indexOf(c) > -1) {
      out.push(c)
      continue
    }
    let best = lit[0]
    for (const l of lit) {
      const d = Math.abs(l - c)
      const bd = Math.abs(best - c)
      if (d < bd || (d === bd && l !== best && (r % 2 === 0 ? l > best : l < best))) best = l
    }
    out.push(best)
  }
  return out
}

// Every bar of one character slot, row-major: the column it lands in, how many
// rows it drops (empty rows fold into their nearest lit neighbour, below on a
// tie), and whether it is flat. A space folds every bar flat onto the middle
// row; an unknown character reads as a dash.
export function scpLayout(ch: string) {
  const mid = (ROWS - 1) / 2
  const bars: Array<{ col: number; dy: number; flat: boolean }> = []
  const key = (ch || " ").toUpperCase()
  if (key === " ") {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < 3; c++) bars.push({ col: c, dy: mid - r, flat: true })
    return bars
  }
  const rows = SCP_FONT[key] || SCP_FONT["-"]
  const targets = rows.map((row, r) => scpRowTargets(row, r))
  for (let r = 0; r < ROWS; r++) {
    let src = r
    if (!targets[r]) {
      for (let d = 1; d < ROWS; d++) {
        if (r + d < ROWS && targets[r + d]) { src = r + d; break }
        if (r - d >= 0 && targets[r - d]) { src = r - d; break }
      }
    }
    const t = targets[src] || [0, 1, 2]
    for (let c = 0; c < 3; c++) bars.push({ col: t[c], dy: src - r, flat: !targets[src] })
  }
  return bars
}

// Per-bar transition delay, n is 1-based within a slot. Five uneven values
// laid over the grid with overlapping nth-child-style rules, so neighbours
// never move in lockstep and the shunt reads as mechanical, not tweened.
export function scpDelay(n: number) {
  let d = 0
  if (n % 2 === 1) d = 123
  if (n >= 3 && n % 2 === 1) d = 222
  if ((n - 1) % 5 === 0) d = 69
  if ((n - 2) % 3 === 0) d = 99
  return d
}

// Surges and stalls like a real load instead of a linear tween. [time, progress] knots.
const KNOTS = [
  [0, 0],
  [0.18, 0.22],
  [0.3, 0.27],
  [0.55, 0.61],
  [0.68, 0.66],
  [0.86, 0.93],
  [1, 1],
]

export function scpSimulated(t: number) {
  if (t <= 0) return 0
  if (t >= 1) return 1
  for (let i = 0; i < KNOTS.length - 1; i++) {
    const a = KNOTS[i]
    const b = KNOTS[i + 1]
    if (t <= b[0]) {
      const local = (t - a[0]) / (b[0] - a[0])
      const eased = 1 - Math.pow(1 - local, 2)
      return a[1] + (b[1] - a[1]) * eased
    }
  }
  return 1
}

// A frame as exactly `slots` characters. Numbers right-align (zero-padded or
// folded away), words centre.
export function scpFormat(value: string | number, slots: number, pad: boolean) {
  if (typeof value === "number") {
    const s = String(Math.max(0, Math.round(value)))
    return s.length >= slots ? s : (pad ? "0" : " ").repeat(slots - s.length) + s
  }
  const s = value.toUpperCase()
  if (s.length >= slots) return s
  const left = Math.floor((slots - s.length) / 2)
  return " ".repeat(left) + s + " ".repeat(slots - s.length - left)
}

// Seeded, so a scatter is random but the same click replays the same burst.
export function scpRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
// #endregion

const SCP_CSS = `
.scp-root { position: relative; width: 100%; overflow: hidden; isolation: isolate; }
.scp-content { position: relative; height: 100%; overflow: auto; }
.scp-gate {
  position: absolute; inset: 0; z-index: 10; container-type: size;
  display: flex; align-items: center; justify-content: center;
  color: var(--scp-ink); box-sizing: border-box;
  -webkit-user-select: none; user-select: none;
}
.scp-gate[data-phase="done"] { display: none; }
.scp-gate > div, .scp-gate > button, .scp-gate span { box-sizing: border-box; }
.scp-gate svg { max-width: none; }

.scp-blinds { position: absolute; inset: 0; display: flex; flex-direction: column; z-index: 0; transition: opacity 600ms ease; }
.scp-blind {
  flex: 1 1 0; margin-bottom: -1px; background: var(--scp-bg);
  transition: transform 860ms cubic-bezier(0.76, 0, 0.24, 1);
}
.scp-gate[data-phase="exit"][data-exit="blinds"] .scp-blind:nth-child(odd) { transform: translateX(-101%); }
.scp-gate[data-phase="exit"][data-exit="blinds"] .scp-blind:nth-child(even) { transform: translateX(101%); }
.scp-gate[data-phase="exit"][data-exit="fade"] .scp-blinds { opacity: 0; }

.scp-stage {
  position: relative; z-index: 1; display: flex; align-items: center; justify-content: center;
  transition: opacity 380ms ease, transform 520ms cubic-bezier(0.65, 0, 0.35, 1);
}
.scp-gate[data-phase="exit"] .scp-stage { opacity: 0; transform: scale(0.94); }

.scp-counter {
  --g: calc(var(--scp-dh) * 0.024);
  --h: calc((var(--scp-dh) - 6 * var(--g)) / 7);
  --w: calc(var(--h) * var(--scp-ratio));
  position: relative; display: flex; gap: calc(var(--w) * 0.55);
  padding: calc(var(--h) * 0.6); margin: 0; border: 0; background: transparent; color: inherit;
  font: inherit; cursor: default; border-radius: 2px; outline: none;
  transform: skewX(var(--scp-lean, 0deg));
  transition: transform 420ms cubic-bezier(0.22, 1, 0.36, 1);
}
.scp-counter[data-interactive="true"] { cursor: pointer; }
.scp-counter:focus-visible { box-shadow: 0 0 0 2px var(--scp-accent); }
.scp-digit { position: relative; flex: none; width: calc(3 * var(--w) + 2 * var(--g)); height: var(--scp-dh); }
.scp-slat {
  position: absolute; display: block;
  left: calc(var(--c) * (var(--w) + var(--g)));
  top: calc(var(--r) * (var(--h) + var(--g)));
  width: var(--w); height: var(--h);
  background: var(--scp-ink);
  transform: translate(calc(var(--x) * (100% + var(--g))), calc(var(--y) * (100% + var(--g)))) scaleX(var(--s));
  transition:
    transform var(--scp-speed) cubic-bezier(0.65, 0, 0.35, 1),
    background-color 220ms ease;
  will-change: transform;
}
.scp-slat[data-hot="true"] { background: var(--scp-accent); }
.scp-counter[data-scatter="true"] .scp-slat { transition-duration: 300ms, 220ms; transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1), ease; }

.scp-unit {
  position: absolute; top: calc(var(--h) * 0.6); left: 100%; margin-left: calc(var(--w) * 0.1);
  font-family: var(--scp-font); font-size: max(11px, calc(var(--h) * 0.62)); font-weight: 600; line-height: 1;
  transform: skewX(calc(var(--scp-lean, 0deg) * -1));
}

.scp-hud {
  position: absolute; z-index: 2; font-family: var(--scp-font);
  font-size: clamp(10px, 1.6cqmin, 13px); line-height: 1.35; letter-spacing: 0.14em; text-transform: uppercase;
  transition: opacity 300ms ease;
}
.scp-gate[data-phase="exit"] .scp-hud, .scp-gate[data-phase="exit"] .scp-mark { opacity: 0; }
.scp-tl { top: clamp(16px, 4cqmin, 40px); left: clamp(16px, 4cqmin, 40px); }
.scp-tr { top: clamp(16px, 4cqmin, 40px); right: clamp(16px, 4cqmin, 40px); text-align: right; }
.scp-bl { bottom: clamp(16px, 4cqmin, 40px); left: clamp(16px, 4cqmin, 40px); max-width: min(46cqw, 440px); }
.scp-br { bottom: clamp(16px, 4cqmin, 40px); right: clamp(16px, 4cqmin, 40px); display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }
.scp-dim { opacity: 0.62; }
.scp-status { display: inline-flex; align-items: center; gap: 8px; }
.scp-dot { width: 7px; height: 7px; background: var(--scp-ink); display: inline-block; animation: scp-blink 1s steps(2, jump-none) infinite; }
.scp-gate[data-phase="hold"] .scp-dot { animation: none; background: var(--scp-accent); }

.scp-rail { display: flex; gap: 3px; }
.scp-tick { width: 14px; height: 7px; background: var(--scp-ink); opacity: 0.18; transition: opacity 300ms ease, background-color 300ms ease; }
.scp-tick[data-on="true"] { opacity: 1; }
.scp-tick[data-on="true"]:last-child { background: var(--scp-accent); }

.scp-skip {
  margin: 0; padding: 4px 0; border: 0; background: transparent; color: inherit; cursor: pointer;
  font: inherit; letter-spacing: inherit; text-transform: inherit;
  border-bottom: 1px solid currentColor; opacity: 0.8; transition: opacity 200ms ease, color 200ms ease;
}
.scp-skip:hover { opacity: 1; color: var(--scp-accent); }
.scp-skip:focus-visible { outline: 2px solid var(--scp-accent); outline-offset: 3px; }

.scp-mark { position: absolute; z-index: 2; width: 14px; height: 14px; opacity: 0.55; transition: opacity 300ms ease; }
.scp-mark::before, .scp-mark::after { content: ""; position: absolute; background: var(--scp-ink); }
.scp-mark::before { left: 6px; top: 0; width: 2px; height: 14px; }
.scp-mark::after { top: 6px; left: 0; width: 14px; height: 2px; }
.scp-m1 { top: 50%; left: clamp(16px, 4cqmin, 40px); margin-top: -7px; }
.scp-m2 { top: 50%; right: clamp(16px, 4cqmin, 40px); margin-top: -7px; }
.scp-hint { position: absolute; z-index: 2; left: 50%; top: clamp(16px, 4cqmin, 40px); transform: translateX(-50%); white-space: nowrap; }

.scp-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.scp-skip.scp-sr:focus-visible { width: auto; height: auto; clip: auto; overflow: visible; left: 16px; bottom: 16px; z-index: 3; }

@keyframes scp-blink { 0% { opacity: 1; } 100% { opacity: 0.15; } }

@container (max-width: 860px) {
  .scp-hint { display: none; }
}
@container (max-width: 560px) {
  .scp-hint, .scp-m1, .scp-m2 { display: none; }
  .scp-bl { max-width: 50cqw; }
  .scp-tick { width: 8px; }
}

@media (prefers-reduced-motion: reduce) {
  .scp-slat { transition-duration: 1ms, 1ms; transition-delay: 0ms !important; }
  .scp-counter { transition: none; transform: none; }
  .scp-unit { transform: none; }
  .scp-dot { animation: none; }
  .scp-blind { transition: none; }
  .scp-gate[data-phase="exit"] .scp-blind { transform: none; }
  .scp-gate[data-phase="exit"] .scp-blinds { opacity: 0; }
}
`

type Phase = "idle" | "intro" | "count" | "hold" | "reset" | "exit" | "done"

export default function SlatCountPreloader({
  children,
  loop = false,
  progress,
  durationMs = 5600,
  sequence,
  digits = 3,
  pad = true,
  preset = "vermilion",
  palette,
  label = "Slat / Count — N°07",
  caption = "Loading the good part. Every figure is twenty-one bars, shunted into place.",
  hud = true,
  size,
  slatRatio = 2,
  speed = 520,
  stepMs = 720,
  interactive = true,
  exit = "blinds",
  fontFamily = MONO_STACK,
  height = "100svh",
  onComplete,
  className = "",
}: SlatCountPreloaderProps) {
  const colors = { ...(PRESETS[preset] || PRESETS.vermilion), ...palette }
  const seqKey = sequence ? sequence.join("\u0001") : ""
  const slots = Math.max(1, digits, ...(sequence || []).map((v) => String(v).length))
  const blank = " ".repeat(slots)
  const dash = "-".repeat(slots)

  const [phase, setPhase] = React.useState<Phase>("idle")
  const [cycle, setCycle] = React.useState(0)
  const [text, setText] = React.useState(blank)
  const [pct, setPct] = React.useState(0)
  const [scatter, setScatter] = React.useState(0)
  const [hotRow, setHotRow] = React.useState(-1)
  const [reduced, setReduced] = React.useState(false)

  const progressRef = React.useRef(progress)
  progressRef.current = progress
  const durationRef = React.useRef(durationMs)
  durationRef.current = durationMs
  const onCompleteRef = React.useRef(onComplete)
  onCompleteRef.current = onComplete
  const sequenceRef = React.useRef(sequence)
  sequenceRef.current = sequence
  const skipRef = React.useRef(false)
  const counterRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener?.("change", sync)
    return () => mq.removeEventListener?.("change", sync)
  }, [])

  // idle → intro: the bars grow out of nothing into a row of dashes.
  React.useEffect(() => {
    if (phase !== "idle") return
    setText(blank)
    const t = window.setTimeout(() => setPhase("intro"), 60)
    return () => window.clearTimeout(t)
  }, [phase, blank])

  React.useEffect(() => {
    if (phase !== "intro") return
    setText(dash)
    setPct(0)
    skipRef.current = false
    const t = window.setTimeout(() => setPhase("count"), INTRO_MS)
    return () => window.clearTimeout(t)
  }, [phase, dash, cycle])

  // The count. Frames advance on a fixed beat so every shunt has room to land.
  React.useEffect(() => {
    if (phase !== "count") return
    const frames = seqKey && sequenceRef.current ? sequenceRef.current.slice() : null
    const t0 = performance.now()
    let i = 0
    let shown = 0
    const tick = () => {
      if (frames) {
        if (skipRef.current) i = frames.length - 1
        if (i >= frames.length) {
          setPhase("hold")
          return
        }
        setText(scpFormat(frames[i], slots, pad))
        setPct(Math.round(((i + 1) / frames.length) * 100))
        i++
        return
      }
      const real = progressRef.current
      const p = skipRef.current
        ? 100
        : typeof real === "number"
          ? real
          : scpSimulated((performance.now() - t0) / Math.max(1, durationRef.current)) * 100
      shown = Math.max(shown, Math.min(100, Math.floor(p)))
      setText(scpFormat(shown, slots, pad))
      setPct(shown)
      if (shown >= 100) setPhase("hold")
    }
    tick()
    const id = window.setInterval(tick, stepMs)
    return () => window.clearInterval(id)
  }, [phase, cycle, seqKey, slots, pad, stepMs])

  React.useEffect(() => {
    if (phase !== "hold") return
    const t = window.setTimeout(() => setPhase(loop ? "reset" : "exit"), HOLD_MS)
    return () => window.clearTimeout(t)
  }, [phase, loop])

  // Loop only: collapse back to the dash, fold flat, start over.
  React.useEffect(() => {
    if (phase !== "reset") return
    setText(dash)
    const a = window.setTimeout(() => setText(blank), 900)
    const b = window.setTimeout(() => {
      setCycle((c) => c + 1)
      setPhase("intro")
    }, 1600)
    return () => {
      window.clearTimeout(a)
      window.clearTimeout(b)
    }
  }, [phase, dash, blank])

  React.useEffect(() => {
    if (phase !== "exit") return
    const ms = reduced || exit === "fade" ? 650 : 860 + (BLINDS - 1) * 60 + 120
    const t = window.setTimeout(() => {
      setPhase("done")
      onCompleteRef.current?.()
    }, ms)
    return () => window.clearTimeout(t)
  }, [phase, reduced, exit])

  React.useEffect(() => {
    if (!scatter) return
    const t = window.setTimeout(() => setScatter(0), SCATTER_MS)
    return () => window.clearTimeout(t)
  }, [scatter])

  const counting = phase === "count" || phase === "hold"
  const live = phase !== "exit" && phase !== "done"

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!interactive) return
    const el = counterRef.current
    if (!el) return
    const box = el.getBoundingClientRect()
    const inset = Math.min(box.height, box.width) * 0.06
    const y = (e.clientY - box.top - inset) / Math.max(1, box.height - inset * 2)
    const x = (e.clientX - box.left) / Math.max(1, box.width)
    setHotRow(y < 0 || y >= 1 ? -1 : Math.floor(y * ROWS))
    if (!reduced) el.style.setProperty("--scp-lean", ((0.5 - x) * 9).toFixed(2) + "deg")
  }
  const onPointerLeave = () => {
    setHotRow(-1)
    counterRef.current?.style.setProperty("--scp-lean", "0deg")
  }
  const onShuffle = () => {
    if (!interactive || !live) return
    setScatter(1 + Math.floor(Math.random() * 1e9))
  }
  // Straight to the final frame; the hold still plays so the shunt lands.
  const onSkip = () => {
    if (phase !== "idle" && phase !== "intro" && phase !== "count") return
    skipRef.current = true
    const frames = sequenceRef.current
    setText(scpFormat(frames && frames.length ? frames[frames.length - 1] : 100, slots, pad))
    setPct(100)
    setPhase("hold")
  }

  const rnd = scatter ? scpRng(scatter) : null
  const chars = text.split("")
  const numeric = !seqKey
  const ticks = 12
  const lit = Math.round((pct / 100) * ticks)
  const status =
    phase === "hold" ? (loop ? "Ready — again" : "Ready") : phase === "count" ? "Loading" : phase === "exit" ? "Enter" : "Setting type"

  const gateStyle = {
    "--scp-bg": colors.background,
    "--scp-ink": colors.ink,
    "--scp-accent": colors.accent,
    "--scp-font": fontFamily,
  } as React.CSSProperties

  const counterStyle = {
    // One slot is about (0.434 × ratio + 0.048) character-heights wide.
    "--scp-dh": size || "min(50cqh, " + (82 / (slots * (0.434 * slatRatio + 0.048))).toFixed(2) + "cqw)",
    "--scp-ratio": String(slatRatio),
    "--scp-speed": speed + "ms",
  } as React.CSSProperties

  return (
    <div className={"scp-root " + className} style={{ height }}>
      <style>{SCP_CSS}</style>

      {!loop && children != null && <div className="scp-content" aria-hidden={phase !== "done" ? true : undefined}>{children}</div>}

      <div
        className="scp-gate"
        data-phase={phase}
        data-exit={exit}
        style={gateStyle}
        role="progressbar"
        aria-label={label || "Loading"}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-busy={phase !== "done"}
      >
        <div className="scp-blinds" aria-hidden="true">
          {Array.from({ length: BLINDS }, (_, i) => (
            <div key={i} className="scp-blind" style={{ transitionDelay: (reduced ? 0 : i * 60) + "ms" }} />
          ))}
        </div>

        <div className="scp-stage">
          <button
            ref={counterRef}
            type="button"
            className="scp-counter"
            data-interactive={interactive ? "true" : "false"}
            data-scatter={scatter ? "true" : "false"}
            style={counterStyle}
            onClick={onShuffle}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
            tabIndex={interactive ? 0 : -1}
            aria-label={interactive ? "Scatter the slats" : undefined}
            aria-hidden={interactive ? undefined : true}
          >
            {chars.map((ch, k) => {
              const bars = scpLayout(ch)
              return (
                <span key={k} className="scp-digit" aria-hidden="true">
                  {bars.map((b, i) => {
                    const r = Math.floor(i / 3)
                    const c = i % 3
                    let col = b.col
                    let dy = b.dy
                    if (rnd) {
                      col = Math.floor(rnd() * 3)
                      dy = b.dy + Math.round((rnd() - 0.5) * 3)
                      dy = Math.max(-r, Math.min(ROWS - 1 - r, dy))
                    }
                    const delay = rnd ? Math.floor(rnd() * 90) : scpDelay(i + 1) + k * 45
                    const style = {
                      "--c": c,
                      "--r": r,
                      "--x": col - c,
                      "--y": dy,
                      "--s": b.flat && !rnd ? 0 : 1,
                      transitionDelay: delay + "ms, 0ms",
                    } as React.CSSProperties
                    return <span key={i} className="scp-slat" data-hot={hotRow === r + dy ? "true" : undefined} style={style} />
                  })}
                </span>
              )
            })}
            {numeric && counting && <span className="scp-unit" aria-hidden="true">%</span>}
          </button>
        </div>

        {hud && (
          <>
            <span className="scp-mark scp-m1" aria-hidden="true" />
            <span className="scp-mark scp-m2" aria-hidden="true" />
            <div className="scp-hud scp-tl">{label}</div>
            <div className="scp-hud scp-tr">
              <span className="scp-status">
                <span className="scp-dot" aria-hidden="true" />
                {status}
              </span>
              <div className="scp-dim">{numeric ? String(pct).padStart(3, "0") + " / 100" : text.trim() || "—"}</div>
            </div>
            <div className="scp-hud scp-bl scp-dim">{caption}</div>
            {interactive && <div className="scp-hud scp-hint scp-dim">Hover the slats · click to scatter</div>}
            <div className="scp-hud scp-br">
              <div className="scp-rail" aria-hidden="true">
                {Array.from({ length: ticks }, (_, i) => (
                  <span key={i} className="scp-tick" data-on={i < lit ? "true" : undefined} />
                ))}
              </div>
              {!loop && live && (
                <button type="button" className="scp-skip" onClick={onSkip}>
                  Skip intro →
                </button>
              )}
            </div>
          </>
        )}
        {!hud && !loop && live && (
          <button type="button" className="scp-skip scp-sr" onClick={onSkip}>
            Skip intro
          </button>
        )}
        <span className="scp-sr" aria-live="polite">
          {phase === "hold" ? "Loaded" : ""}
        </span>
      </div>
    </div>
  )
}
