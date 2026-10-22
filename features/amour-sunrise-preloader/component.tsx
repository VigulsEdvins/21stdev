"use client"

// Amour Sunrise Preloader — a mid-century poster that loads itself.
// Fat, wobbly marker letters arch over a rising cobalt sun. They are written
// stroke by stroke as the load climbs, the sun climbs with them, and a count
// in cream rides inside it. At 100% the letters boing in a wave, the count
// turns into a heart that beats, and on the way out the sun swells until it
// swallows the screen.
//
// One file, React only. The letters come from a built-in single-stroke
// alphabet drawn with round caps, so any word works. Their lines "boil" like
// hand-inked animation, and each one sways on its own spring away from the
// pointer. Every rule in the scoped <style> is .amr- prefixed and nothing is
// fetched.

import * as React from "react"

export interface AmourPalette {
  /** Paper behind everything. */
  paper: string
  /** The letters. */
  ink: string
  /** The sun at its rim. */
  sun: string
  /** The sun at its heart, where it is darkest. */
  core: string
  /** The count, heart and caption set inside the sun. */
  glow: string
}

export interface AmourSunrisePreloaderProps {
  /** Content revealed once the sun has swallowed the screen. Ignored while `loop` is set. */
  children?: React.ReactNode
  /** Run forever as a showcase: children are never revealed, onComplete never fires. */
  loop?: boolean
  /**
   * Real loading progress, 0–100. Leave undefined to run the built-in
   * simulated load over `durationMs`. The letters hold until this hits 100.
   */
  progress?: number
  /** Length of the simulated load. Defaults to 4200ms. */
  durationMs?: number
  /** The word arched over the sun. A–Z, 0–9 and ! ? . , ' - ♥ (accents are dropped). */
  word?: string
  /** Line set inside the sun. */
  caption?: string
  /** Colour overrides, merged over the defaults. */
  palette?: Partial<AmourPalette>
  /** Stroke weight multiplier. 1 matches the poster; 0.6 is a fine pen, 1.4 is a fat marker. */
  weight?: number
  /** How far the letters fan out with the arch. 0 stands them upright. */
  fan?: number
  /** Line boil, the hand-inked shimmer. 0 turns it off, 2 is jittery. */
  boil?: number
  /** How hard the letters lean away from the pointer. 0 keeps them still. */
  sway?: number
  /** Show the percentage inside the sun while loading. Defaults to true. */
  counter?: boolean
  /** Face for the caption. The default stack never fetches anything. */
  fontFamily?: string
  /** Root height. A definite length, never a percentage. */
  height?: string
  /** Fired once, after the gate has lifted. */
  onComplete?: () => void
  /** Extra root class names. */
  className?: string
}

const DEFAULT_PALETTE: AmourPalette = {
  paper: "#f4e7df",
  ink: "#0b215d",
  sun: "#2f5090",
  core: "#0f2662",
  glow: "#f4e7df",
}

const SERIF_STACK = '"Fraunces", "Playfair Display", "Iowan Old Style", Georgia, "Times New Roman", serif'
const MONO_STACK = '"JetBrains Mono", "SF Mono", ui-monospace, Menlo, Consolas, monospace'

// #region geometry
// Pure helpers, lifted out and executed by tests/amour-sunrise-preloader.test.mjs.

// A single-stroke marker alphabet. Each glyph is [advance width, strokes],
// drawn in a box 100 tall: the cap line sits at y = 12, the baseline at
// y = 88, leaving room for a round cap of up to 24 units. Strokes are drawn
// in the order a hand would write them, which is the order they ink in.
export const AMR_GLYPHS: { [ch: string]: [number, string[]] } = {
  " ": [44, []],
  A: [86, ["M14 88 C20 62 30 30 43 12 C56 30 66 62 72 88", "M27 62 C38 60 50 60 60 62"]],
  B: [74, ["M17 88 V12", "M17 12 H35 C51 12 57 21 57 31 C57 42 48 48 33 48 H17", "M17 48 H39 C55 48 62 58 62 68 C62 81 52 88 37 88 H17"]],
  C: [78, ["M65 23 C58 15 50 12 42 12 C24 12 13 29 13 50 C13 72 25 88 43 88 C53 88 61 84 67 76"]],
  D: [82, ["M17 88 V12", "M17 12 H33 C57 12 70 29 70 50 C70 72 56 88 33 88 H17"]],
  E: [66, ["M55 12 H17 V88 H56", "M17 49 H47"]],
  F: [62, ["M53 12 H17 V88", "M17 49 H45"]],
  G: [84, ["M67 24 C59 15 51 12 42 12 C24 12 13 29 13 50 C13 72 25 88 44 88 C61 88 71 77 71 60 V53 H47"]],
  H: [80, ["M15 12 V88", "M65 12 V88", "M15 50 H65"]],
  I: [36, ["M18 12 V88"]],
  J: [62, ["M49 12 V63 C49 79 41 88 30 88 C21 88 14 83 12 73"]],
  K: [76, ["M17 12 V88", "M61 12 L19 55", "M31 44 L63 88"]],
  L: [62, ["M17 12 V88 H53"]],
  M: [100, ["M14 88 C15 62 17 34 21 13 L50 57 L79 13 C83 34 85 62 86 88"]],
  N: [82, ["M15 88 V13 L67 87 V12"]],
  O: [88, ["M44 12 C64 12 76 29 76 50 C76 72 63 88 44 88 C25 88 12 72 12 50 C12 29 25 12 44 12 Z"]],
  P: [72, ["M17 88 V12 H35 C52 12 60 22 60 34 C60 47 51 56 35 56 H17"]],
  Q: [88, ["M44 12 C64 12 76 29 76 50 C76 72 63 88 44 88 C25 88 12 72 12 50 C12 29 25 12 44 12 Z", "M53 65 L77 89"]],
  R: [76, ["M17 88 V12 H35 C52 12 60 22 60 33 C60 46 51 54 35 54 H19", "M37 54 C46 64 56 76 63 88"]],
  S: [70, ["M58 22 C52 15 45 12 36 12 C23 12 14 20 14 30 C14 42 24 46 36 50 C50 54 58 59 58 70 C58 82 48 88 36 88 C26 88 17 84 12 76"]],
  T: [76, ["M12 14 C28 13 46 13 64 14", "M38 14 V88"]],
  U: [80, ["M14 12 V57 C14 77 25 88 40 88 C56 88 66 77 66 57 V12"]],
  V: [80, ["M12 12 C22 40 32 66 40 88 C48 66 58 40 68 12"]],
  W: [110, ["M12 12 L30 88 L55 31 L80 88 L98 12"]],
  X: [76, ["M14 12 L62 88", "M62 12 L14 88"]],
  Y: [76, ["M12 12 L38 50 L64 12", "M38 50 V88"]],
  Z: [72, ["M14 13 H58 L14 87 H59"]],
  "0": [70, ["M35 12 C50 12 58 28 58 50 C58 72 50 88 35 88 C20 88 12 72 12 50 C12 28 20 12 35 12 Z"]],
  "1": [50, ["M14 27 L31 12 V88"]],
  "2": [68, ["M14 28 C16 18 24 12 34 12 C46 12 56 20 56 32 C56 46 44 56 14 88 H58"]],
  "3": [66, ["M14 20 C20 14 27 12 34 12 C46 12 54 20 54 30 C54 42 44 48 30 48 C46 48 56 56 56 68 C56 80 46 88 32 88 C24 88 16 84 12 78"]],
  "4": [70, ["M45 88 V12 L12 64 H60"]],
  "5": [66, ["M54 12 H21 L17 46 C22 42 28 40 34 40 C48 40 56 50 56 64 C56 78 46 88 32 88 C24 88 16 84 12 78"]],
  "6": [68, ["M52 16 C46 13 41 12 36 12 C20 12 12 30 12 54 C12 76 22 88 36 88 C48 88 56 80 56 66 C56 52 48 44 36 44 C24 44 14 52 12 60"]],
  "7": [66, ["M12 12 H56 L26 88"]],
  "8": [66, ["M33 48 C20 48 14 40 14 30 C14 20 22 12 33 12 C44 12 52 20 52 30 C52 40 46 48 33 48 C18 48 12 58 12 68 C12 80 22 88 33 88 C44 88 54 80 54 68 C54 58 48 48 33 48 Z"]],
  "9": [68, ["M56 40 C54 50 46 56 34 56 C20 56 12 46 12 34 C12 20 22 12 34 12 C48 12 56 24 56 44 C56 70 46 88 30 88 C24 88 18 86 14 82"]],
  "%": [74, ["M60 14 L14 86", "M18 18 V21", "M56 79 V82"]],
  "!": [36, ["M18 12 V60", "M18 86 V88"]],
  "?": [64, ["M14 26 C16 16 24 12 33 12 C45 12 51 20 51 29 C51 41 33 45 33 61", "M33 86 V88"]],
  ".": [36, ["M18 86 V88"]],
  ",": [36, ["M19 84 L14 96"]],
  "'": [32, ["M16 12 V30"]],
  "-": [60, ["M14 52 H46"]],
  "♥": [92, ["M46 86 C30 72 12 58 12 36 C12 20 22 12 33 12 C41 12 45 18 46 27 C47 18 51 12 59 12 C70 12 80 20 80 36 C80 58 62 72 46 86 Z"]],
}

// Accents are dropped (É → E), lower case is lifted, anything unknown is a space.
export function amrGlyph(ch: string) {
  const key = ch.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase()
  return AMR_GLYPHS[key] ?? AMR_GLYPHS[ch] ?? AMR_GLYPHS[" "]
}

const clamp01 = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x)

// Surges and stalls like a real load instead of a linear tween. [time, progress] knots.
const KNOTS = [
  [0, 0],
  [0.22, 0.28],
  [0.33, 0.31],
  [0.6, 0.7],
  [0.7, 0.73],
  [1, 1],
]

export function amrSimulated(t: number) {
  if (t <= 0) return 0
  if (t >= 1) return 1
  for (let i = 0; i < KNOTS.length - 1; i++) {
    const a = KNOTS[i]
    const b = KNOTS[i + 1]
    if (t <= b[0]) {
      const local = (t - a[0]) / (b[0] - a[0])
      return a[1] + (b[1] - a[1]) * (1 - Math.pow(1 - local, 3))
    }
  }
  return 1
}

// How far slice i of n is inked at progress p: each owns an equal share.
export function amrLit(p: number, i: number, n: number) {
  return clamp01(clamp01(p) * n - i)
}

// The count read out inside the sun.
export function amrCounter(v: number) {
  return String(Math.round(Math.min(100, Math.max(0, v)))) + "%"
}

// Deterministic noise in [0, 1).
export function amrHash(x: number) {
  const s = Math.sin(x * 12.9898 + 78.233) * 43758.5453
  return s - Math.floor(s)
}

// Maps an absolute M/L/H/V/C/Z path through the affine [a, b, c, d, e, f]
// (x' = a x + c y + e, y' = b x + d y + f). With jitter, every point is
// nudged by up to that many output units, keyed on the point itself so a
// closed shape's start and end move together and stay closed.
export function amrPath(d: string, m: number[], jitter: number, seed: number) {
  const tokens = d.match(/[MLHVCZ]|-?\d*\.?\d+/g) || []
  let out = ""
  let cmd = ""
  let x = 0
  let y = 0
  const put = (px: number, py: number) => {
    x = px
    y = py
    let ox = m[0] * px + m[2] * py + m[4]
    let oy = m[1] * px + m[3] * py + m[5]
    if (jitter) {
      const k = px * 7.13 + py * 3.71 + seed * 17.9
      ox += (amrHash(k) - 0.5) * 2 * jitter
      oy += (amrHash(k + 41.3) - 0.5) * 2 * jitter
    }
    return ox.toFixed(1) + " " + oy.toFixed(1)
  }
  let i = 0
  while (i < tokens.length) {
    const t = tokens[i]
    if (/[MLHVCZ]/.test(t)) {
      cmd = t
      i++
      if (t === "Z") out += "Z"
      continue
    }
    const num = (k: number) => parseFloat(tokens[i + k])
    if (cmd === "M" || cmd === "L") {
      out += (out ? " " : "") + (cmd === "M" ? "M" : "L") + put(num(0), num(1))
      if (cmd === "M") cmd = "L"
      i += 2
    } else if (cmd === "H") {
      out += " L" + put(num(0), y)
      i += 1
    } else if (cmd === "V") {
      out += " L" + put(x, num(0))
      i += 1
    } else if (cmd === "C") {
      const a = put(num(0), num(1))
      const b = put(num(2), num(3))
      out += " C" + a + " " + b + " " + put(num(4), num(5))
      i += 6
    } else {
      i++
    }
  }
  return out
}

// Sets a line of glyphs upright, centred on (cx, cy), cap height `size`.
// Returns one path for the whole line, plus its width.
export function amrLine(text: string, cx: number, cy: number, size: number) {
  const s = size / 76
  const glyphs = Array.from(text).map(amrGlyph)
  const width = glyphs.reduce((sum, g) => sum + g[0], 0) * s
  let x = cx - width / 2
  let d = ""
  for (const g of glyphs) {
    for (const stroke of g[1]) d += (d ? " " : "") + amrPath(stroke, [s, 0, 0, s, x, cy - 50 * s], 0, 0)
    x += g[0] * s
  }
  return { d, width }
}

// The poster: a sun sitting on the bottom edge, and the word arched over
// it. Each letter stands on the sun's rim (or on the floor, past its edge),
// leans out with the arch, and stretches up to a common cap line, so the
// outer letters run long the way they do in a hand-lettered poster.
export function amrLayout(widths: number[], W: number, H: number, weight: number, fan: number) {
  const n = Math.max(1, widths.length)
  // A tall box gets a taller poster, not a taller gap above it: the letters
  // are allowed to stretch further the narrower the box is.
  const F = Math.min(H, Math.max(W * 1.6, 260))
  const top = H - F
  // portrait boxes get a planet: wider than the screen, so its rim stays flat
  const R = Math.min(F * 0.6, W * (H > W * 1.1 ? 0.66 : 0.46))
  const reach = Math.max(3.6, Math.min(4.8, (F / W) * 2.6))
  const cx = W / 2
  const cy = H + R * 0.02
  const margin = W * 0.035
  const gapU = 4
  const units = widths.reduce((a, b) => a + b, 0) + gapU * (n - 1)
  const sx = Math.max(0.05, Math.min((W - margin * 2) / units, F / 210))
  const stroke = 22 * sx * weight
  const span = units * sx
  const rim = R + F * 0.045
  const floor = H - F * 0.035

  const letters = []
  let cursor = cx - span / 2
  for (let i = 0; i < n; i++) {
    const w = widths[i] * sx
    const want = cursor + w / 2
    cursor += w + gapU * sx
    const rel = (want - cx) / (W / 2)
    const capY = top + F * (0.05 + 0.04 * rel * rel)
    let bx = want
    let by = floor
    let t = 0
    let L = 0
    for (let k = 0; k < 4; k++) {
      const dx = bx - cx
      const phi = Math.asin(Math.max(-1, Math.min(1, dx / rim)))
      t = Math.max(-0.62, Math.min(0.62, phi * 0.42 * fan))
      // the letter's foot is as wide as the letter: lift it clear of the rim
      const lift = (w / 2) * Math.abs(Math.sin(phi - t))
      by = Math.min(cy - Math.sqrt(Math.max(0, rim * rim - dx * dx)) - lift, floor)
      L = (by - capY) / Math.cos(t)
      L = Math.max(stroke + 76 * sx * 0.6, Math.min(stroke + 76 * sx * reach, L))
      bx += want - (bx + (Math.sin(t) * L) / 2)
    }
    const sy = (L - stroke) / 76
    const mx = bx + (Math.sin(t) * L) / 2
    const my = by - (Math.cos(t) * L) / 2
    const cos = Math.cos(t)
    const sin = Math.sin(t)
    // glyph (gx, gy) → u = (gx - w/2) sx, v = (gy - 88) sy - stroke/2, rotated by t about the foot
    const u0 = (-widths[i] / 2) * sx
    const v0 = -88 * sy - stroke / 2
    const m = [sx * cos, sx * sin, -sy * sin, sy * cos, bx + u0 * cos - v0 * sin, by + u0 * sin + v0 * cos]
    letters.push({ bx, by, t, sy, L, mx, my, m })
  }
  return { cx, cy, R, sx, stroke, top, F, letters }
}
// #endregion

// ---- styles -------------------------------------------------------------------

const AMR_CSS = `
.amr-root {
  position: relative;
  width: 100%;
  overflow: hidden;
  background: var(--amr-paper);
  color: var(--amr-ink);
  -webkit-tap-highlight-color: transparent;
}
.amr-gate *, .amr-gate *::before, .amr-gate *::after { box-sizing: border-box; }
.amr-dest {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.7s ease 0.1s;
}
.amr-dest[data-active="true"] { opacity: 1; pointer-events: auto; }

.amr-gate {
  position: absolute;
  inset: 0;
  z-index: 10;
  background: var(--amr-paper);
  cursor: pointer;
  outline: none;
  user-select: none;
  -webkit-user-select: none;
  transition: opacity 0.4s ease 1.05s;
}
.amr-gate:focus-visible .amr-frame { box-shadow: inset 0 0 0 2px var(--amr-ink); }
.amr-root[data-phase="lift"] .amr-gate { opacity: 0; pointer-events: none; }
.amr-frame { position: absolute; inset: 0; pointer-events: none; }

.amr-stage, .amr-grain {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  display: block;
  overflow: visible;
}
.amr-grain {
  pointer-events: none;
  mix-blend-mode: multiply;
  opacity: 0.32;
}
.amr-blush {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(ellipse 80% 70% at 50% 42%, transparent 55%, rgba(80, 40, 20, 0.07) 100%);
}

/* ---- the sun ---- */
.amr-rise {
  transform: translateY(calc((1 - var(--amr-rise)) * var(--amr-r) * 1.04));
}
.amr-sun-scale {
  transform: scale(1);
  transition: transform 0.95s cubic-bezier(0.55, 0, 0.2, 1) 0.05s;
}
.amr-root[data-phase="bloom"] .amr-sun-scale { animation: amr-swell 1.1s cubic-bezier(0.3, 1.6, 0.4, 1) 0.1s; }
.amr-root[data-phase="lift"] .amr-sun-scale { transform: scale(var(--amr-cover)); }
.amr-sun { transition: filter 0.4s ease; }
.amr-gate:hover .amr-sun { filter: brightness(1.04) saturate(1.05); }
.amr-ring {
  fill: none;
  stroke: var(--amr-ink);
  opacity: 0;
}
.amr-root[data-phase="bloom"] .amr-ring {
  animation: amr-ring 1.8s cubic-bezier(0.15, 0.6, 0.3, 1) both;
}
.amr-ring-2 { animation-delay: 0.22s !important; }
.amr-ring-3 { animation-delay: 0.44s !important; }

/* ---- inside the sun ---- */
.amr-count {
  fill: none;
  stroke: var(--amr-glow);
  stroke-linecap: round;
  stroke-linejoin: round;
  transform-box: fill-box;
  transform-origin: center;
  transition: opacity 0.35s ease, transform 0.5s cubic-bezier(0.5, 0, 0.75, 0);
}
.amr-root:not([data-phase="load"]) .amr-count { opacity: 0; transform: scale(0.4) rotate(-12deg); }
.amr-heart {
  fill: var(--amr-glow);
  fill-opacity: 0;
  stroke: var(--amr-glow);
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 1 1;
  stroke-dashoffset: 1;
  opacity: 0;
  transform-box: fill-box;
  transform-origin: 50% 60%;
}
.amr-root[data-phase="bloom"] .amr-heart,
.amr-root[data-phase="hold"] .amr-heart,
.amr-root[data-phase="lift"] .amr-heart {
  opacity: 1;
  animation: amr-ink 0.9s cubic-bezier(0.45, 0, 0.2, 1) 0.25s forwards, amr-fill 0.5s ease 1s forwards;
}
.amr-root[data-phase="hold"] .amr-heart {
  stroke-dashoffset: 0;
  fill-opacity: 1;
  animation: amr-beat 1.1s cubic-bezier(0.3, 0, 0.3, 1) infinite;
}
.amr-root[data-phase="lift"] .amr-heart { stroke-dashoffset: 0; fill-opacity: 1; animation: none; }
.amr-root[data-phase="set"] .amr-heart { opacity: 0; stroke-dashoffset: 0; fill-opacity: 1; transition: opacity 0.4s ease; }
.amr-caption {
  fill: var(--amr-glow);
  font-family: var(--amr-serif);
  font-style: italic;
  letter-spacing: 0.04em;
  opacity: 0.88;
}
.amr-hint {
  fill: var(--amr-glow);
  font-family: var(--amr-mono);
  letter-spacing: 0.32em;
  text-transform: uppercase;
  opacity: 0;
  transition: opacity 0.6s ease;
}
.amr-root[data-phase="hold"] .amr-hint { opacity: 0.62; animation: amr-blink 2.4s ease-in-out 0.6s infinite; }

/* ---- the letters ---- */
.amr-word path {
  fill: none;
  stroke: var(--amr-ink);
  stroke-linecap: round;
  stroke-linejoin: round;
}
.amr-letter { cursor: pointer; }
.amr-fly {
  transition: transform 0.8s cubic-bezier(0.4, 0, 0.7, 0.4), opacity 0.5s ease 0.2s;
}
.amr-root[data-phase="lift"] .amr-fly { transform: translate(var(--fx), var(--fy)) rotate(var(--fr)); opacity: 0; }
.amr-word .amr-hit { fill: none; stroke: transparent; }

.amr-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@keyframes amr-swell {
  0% { transform: scale(1); }
  35% { transform: scale(1.045); }
  100% { transform: scale(1); }
}
@keyframes amr-ring {
  0% { opacity: 0; transform: scale(1); }
  12% { opacity: 0.5; }
  100% { opacity: 0; transform: scale(1.5); }
}
@keyframes amr-ink { to { stroke-dashoffset: 0; } }
@keyframes amr-fill { to { fill-opacity: 1; } }
@keyframes amr-beat {
  0%, 100% { transform: scale(1); }
  14% { transform: scale(1.14); }
  28% { transform: scale(0.98); }
  42% { transform: scale(1.08); }
  70% { transform: scale(1); }
}
@keyframes amr-blink {
  0%, 100% { opacity: 0.62; }
  50% { opacity: 0.25; }
}

@media (prefers-reduced-motion: reduce) {
  .amr-rise { transform: none; }
  .amr-root[data-phase="bloom"] .amr-sun-scale, .amr-root[data-phase="bloom"] .amr-ring { animation: none; }
  .amr-root[data-phase="lift"] .amr-sun-scale { transform: none; }
  .amr-sun-scale, .amr-fly, .amr-count { transition: opacity 0.4s ease; }
  .amr-root[data-phase="lift"] .amr-fly { transform: none; }
  .amr-root:not([data-phase="load"]) .amr-count { transform: none; }
  .amr-root[data-phase="bloom"] .amr-heart, .amr-root[data-phase="hold"] .amr-heart {
    animation: none;
    stroke-dashoffset: 0;
    fill-opacity: 1;
    transition: opacity 0.5s ease;
  }
  .amr-root[data-phase="hold"] .amr-hint { animation: none; }
  .amr-gate { transition: opacity 0.5s ease 0.2s; }
}
`

// ---- component ----------------------------------------------------------------

type Phase = "load" | "bloom" | "hold" | "lift" | "set" | "done"

const BLOOM_MS = 1700
const HOLD_MS = 2800
const LIFT_MS = 1500
const SET_MS = 1500
const INTRO_MS = 900
const BOIL_MS = 125

const deg = (r: number) => (r * 180) / Math.PI

export default function AmourSunrisePreloader({
  children,
  loop = false,
  progress,
  durationMs = 4200,
  word = "AMOUR",
  caption = "loading, with love",
  palette,
  weight = 1,
  fan = 1,
  boil = 1,
  sway = 1,
  counter = true,
  fontFamily = SERIF_STACK,
  height = "100svh",
  onComplete,
  className = "",
}: AmourSunrisePreloaderProps) {
  const [phase, setPhase] = React.useState<Phase>("load")
  const [pct, setPct] = React.useState(0)
  const [cycle, setCycle] = React.useState(0)
  const [size, setSize] = React.useState({ w: 1280, h: 800 })

  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const rootRef = React.useRef<HTMLDivElement>(null)
  const gradRef = React.useRef<SVGRadialGradientElement>(null)
  const letterRefs = React.useRef<(SVGGElement | null)[]>([])
  const strokeRefs = React.useRef<(SVGPathElement | null)[][]>([])
  const pointerRef = React.useRef<{ x: number; y: number; vx: number; t: number } | null>(null)
  const springRef = React.useRef<{ a: number; va: number; s: number; vs: number }[]>([])
  const shownRef = React.useRef(0)
  const rushRef = React.useRef(false)
  const progressRef = React.useRef(progress)
  progressRef.current = progress
  const onCompleteRef = React.useRef(onComplete)
  onCompleteRef.current = onComplete

  const colors = { ...DEFAULT_PALETTE, ...palette }
  const chars = React.useMemo(() => Array.from(word.trim() || " "), [word])
  const W = size.w
  const H = size.h

  // ---- the poster, laid out for this box -----------------------------------------
  const layout = React.useMemo(() => {
    const glyphs = chars.map(amrGlyph)
    const lay = amrLayout(
      glyphs.map((g) => g[0]),
      W,
      H,
      Math.max(0.2, weight),
      Math.max(0, fan),
    )
    const letters = lay.letters.map((l, i) => {
      const dx = l.mx - lay.cx
      const dy = l.my - lay.cy
      const len = Math.hypot(dx, dy) || 1
      const throwBy = Math.max(W, H) * 0.75
      return {
        ...l,
        strokes: glyphs[i][1],
        fx: (dx / len) * throwBy,
        fy: (dy / len) * throwBy,
        fr: deg(l.t) * 1.6,
      }
    })
    const corner = Math.hypot(Math.max(lay.cx, W - lay.cx), lay.cy)
    return { ...lay, letters, cover: (corner / lay.R) * 1.04 }
  }, [chars, W, H, weight, fan])
  const layoutRef = React.useRef(layout)
  layoutRef.current = layout
  const n = layout.letters.length
  const R = layout.R

  // ---- size off the box ------------------------------------------------------------
  React.useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const measure = () => {
      const r = root.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) setSize({ w: Math.round(r.width), h: Math.round(r.height) })
    }
    measure()
    if (typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(measure)
    ro.observe(root)
    return () => ro.disconnect()
  }, [])

  // ---- ink: how much of each stroke is written at progress p ------------------------
  const paint = React.useCallback(
    (p: number) => {
      shownRef.current = p
      const still = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches
      const lay = layoutRef.current
      lay.letters.forEach((l, i) => {
        const v = amrLit(p, i, lay.letters.length)
        const paths = strokeRefs.current[i] || []
        const k = Math.max(1, l.strokes.length)
        paths.forEach((el, j) => {
          if (!el) return
          if (still) {
            el.style.strokeDashoffset = "0"
            el.style.opacity = v > 0 ? (0.25 + v * 0.75).toFixed(3) : "0"
            return
          }
          const s = clamp01(v * k - j)
          el.style.strokeDashoffset = (1 - s).toFixed(4)
          el.style.opacity = s > 0.002 ? "1" : "0"
        })
      })
    },
    [],
  )
  // a new word or a new box re-inks what was already written
  React.useEffect(() => {
    paint(shownRef.current)
  }, [layout, paint])

  // ---- load and set: drive the pen and the sun from progress -------------------------
  React.useEffect(() => {
    if (phase !== "load" && phase !== "set") return
    const root = rootRef.current
    let raf = 0
    let shown = phase === "load" ? 0 : 1
    let last = performance.now()
    const start = last
    const intro = cycle === 0 && phase === "load"
    let lastPct = -1
    rushRef.current = false

    const tick = (now: number) => {
      const dt = Math.min(64, now - last)
      last = now
      if (phase === "set") {
        shown = 1 - clamp01((now - start) / SET_MS)
        shown = shown * shown * (3 - 2 * shown)
      } else {
        const external = progressRef.current
        let target =
          external !== undefined ? clamp01(external / 100) : amrSimulated((now - start) / Math.max(400, durationMs))
        if (rushRef.current) target = 1
        // glide toward the target so stepped real progress still writes smoothly
        const rate = rushRef.current ? 0.14 : external !== undefined ? 0.1 : 1
        shown += (target - shown) * Math.min(1, rate * (dt / 16.7))
        if (target - shown < 0.002) shown = target
      }
      paint(shown)
      const enter = intro ? clamp01((now - start) / INTRO_MS) : 1
      const rise = (1 - Math.pow(1 - enter, 3)) * (0.5 + 0.5 * (1 - Math.pow(1 - shown, 2)))
      root?.style.setProperty("--amr-rise", rise.toFixed(4))
      const next = Math.round(shown * 100)
      if (next !== lastPct) {
        lastPct = next
        setPct(next)
      }
      if (phase === "load" && shown >= 1 && enter >= 1) {
        setPhase("bloom")
        return
      }
      if (phase === "set" && shown <= 0) {
        setCycle((c) => c + 1)
        setPhase("load")
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase, cycle, durationMs, paint])

  // ---- holds between phases -----------------------------------------------------------
  React.useEffect(() => {
    if (phase === "bloom") {
      const t = setTimeout(() => setPhase("hold"), BLOOM_MS)
      return () => clearTimeout(t)
    }
    if (phase === "hold") {
      const t = setTimeout(() => setPhase(loop ? "set" : "lift"), HOLD_MS)
      return () => clearTimeout(t)
    }
    if (phase === "lift") {
      const t = setTimeout(() => {
        setPhase("done")
        onCompleteRef.current?.()
      }, LIFT_MS)
      return () => clearTimeout(t)
    }
  }, [phase, loop])

  // ---- springs: every letter sways on its own, boings when poked ----------------------
  const kick = React.useCallback((i: number, strength: number) => {
    const s = springRef.current[i]
    if (!s) return
    s.vs += 7 * strength
    s.va += (amrHash(i * 3.1 + performance.now()) - 0.5) * 160 * strength
  }, [])

  // at 100% the word boings in a wave, left to right
  React.useEffect(() => {
    if (phase !== "bloom") return
    const timers = layoutRef.current.letters.map((_, i) => setTimeout(() => kick(i, 1), 80 + i * 85))
    return () => timers.forEach(clearTimeout)
  }, [phase, kick])

  // ---- the life loop: pointer light, springs and line boil ----------------------------
  React.useEffect(() => {
    const still = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches
    let raf = 0
    let last = performance.now()
    let lx = 0
    let ly = 0
    let wind = 0
    let boilAt = 0
    let frame = 0
    const tick = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      const lay = layoutRef.current
      const ptr = pointerRef.current
      const box = rootRef.current?.getBoundingClientRect()
      const bw = box?.width || 1
      const bh = box?.height || 1

      // the sun's shading leans away from the pointer, like a lit sphere
      const tx = ptr ? (ptr.x / bw) * 2 - 1 : still ? 0 : Math.sin(now / 2600) * 0.35
      const ty = ptr ? (ptr.y / bh) * 2 - 1 : 0
      lx += (tx - lx) * 0.06
      ly += (ty - ly) * 0.06
      const grad = gradRef.current
      if (grad) {
        grad.setAttribute("fx", (0.5 - lx * 0.16).toFixed(4))
        grad.setAttribute("fy", (0.5 - Math.max(-1, ly) * 0.08).toFixed(4))
      }

      if (!still) {
        // wind from how fast the pointer is moving, dying away
        const vx = ptr && now - ptr.t < 120 ? ptr.vx : 0
        wind += (Math.max(-1, Math.min(1, vx / 2400)) - wind) * 0.12
        const sig = Math.min(bw, bh) * 0.24
        const amount = Math.max(0, sway)
        while (springRef.current.length < lay.letters.length) springRef.current.push({ a: 0, va: 0, s: 0, vs: 0 })
        lay.letters.forEach((l, i) => {
          const s = springRef.current[i]
          let target = Math.sin(now / 900 + i * 0.8) * 1.4 * amount
          if (ptr) {
            const dx = ptr.x - l.mx
            const dy = ptr.y - l.my
            target = -(dx / sig) * Math.exp(-(dx * dx + dy * dy) / (2 * sig * sig)) * 16 * amount
          }
          target += wind * 9 * amount
          s.va += (-(s.a - target) * 70 - s.va * 7.5) * dt
          s.a += s.va * dt
          s.vs += (-s.s * 210 - s.vs * 8) * dt
          s.s = Math.max(-0.35, Math.min(0.35, s.s + s.vs * dt))
          const el = letterRefs.current[i]
          if (!el) return
          const rot = deg(l.t)
          el.setAttribute(
            "transform",
            "translate(" + l.bx.toFixed(1) + " " + l.by.toFixed(1) + ") rotate(" + (rot + s.a).toFixed(2) + ") scale(" +
              (1 + s.s * 0.5).toFixed(4) + " " + (1 - s.s).toFixed(4) + ") rotate(" + (-rot).toFixed(2) + ") translate(" +
              (-l.bx).toFixed(1) + " " + (-l.by).toFixed(1) + ")",
          )
        })

        // boil: three hand-inked frames, cycled like a cel loop
        if (boil > 0 && now - boilAt > BOIL_MS) {
          boilAt = now
          frame = (frame + 1) % 3
          const jitter = lay.stroke * 0.05 * boil
          lay.letters.forEach((l, i) => {
            const paths = strokeRefs.current[i] || []
            l.strokes.forEach((d, j) => {
              paths[j]?.setAttribute("d", amrPath(d, l.m, jitter, frame * 7 + 1 + i))
            })
          })
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [boil, sway])

  const onActivate = () => {
    if (phase === "load") rushRef.current = true
    else if (phase === "bloom") setPhase("hold")
    else if (phase === "hold") setPhase(loop ? "set" : "lift")
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const root = rootRef.current
    if (!root) return
    const r = root.getBoundingClientRect()
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    const now = performance.now()
    const prev = pointerRef.current
    const vx = prev ? ((x - prev.x) / Math.max(1, now - prev.t)) * 1000 : 0
    pointerRef.current = { x, y, vx: prev ? prev.vx * 0.5 + vx * 0.5 : 0, t: now }
  }
  const onPointerLeave = () => {
    pointerRef.current = null
  }

  const loading = phase === "load"
  const jitter0 = layout.stroke * 0.05 * boil
  const count = amrLine(amrCounter(pct), 0, -R * 0.6, R * 0.25)
  const heart = amrLine("♥", 0, -R * 0.6, R * 0.34)
  const label = word.trim() || "Page"

  return (
    <div
      ref={rootRef}
      className={"amr-root " + className}
      data-phase={phase}
      style={
        {
          height,
          "--amr-rise": 0,
          "--amr-r": R.toFixed(1) + "px",
          "--amr-cover": layout.cover.toFixed(3),
          "--amr-paper": colors.paper,
          "--amr-ink": colors.ink,
          "--amr-glow": colors.glow,
          "--amr-serif": fontFamily,
          "--amr-mono": MONO_STACK,
        } as React.CSSProperties
      }
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <style>{AMR_CSS}</style>

      {!loop && children ? (
        <div className="amr-dest" data-active={phase === "done"} aria-hidden={phase !== "done"}>
          {children}
        </div>
      ) : null}

      {phase !== "done" ? (
        <div
          className="amr-gate"
          role="progressbar"
          aria-label={label + " is loading"}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-valuetext={loading ? pct + "%" : "Loaded. Press Enter to continue."}
          tabIndex={0}
          onClick={onActivate}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              onActivate()
            }
          }}
        >
          <div className="amr-blush" />
          <svg className="amr-stage" viewBox={"0 0 " + W + " " + H} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <defs>
              <radialGradient id={uid + "-sun"} ref={gradRef} cx="0.5" cy="0.5" r="0.5" fx="0.5" fy="0.5">
                <stop offset="0" stopColor={colors.core} />
                <stop offset="0.55" stopColor={colors.core} stopOpacity="0.55" />
                <stop offset="1" stopColor={colors.core} stopOpacity="0" />
              </radialGradient>
            </defs>

            <g transform={"translate(" + layout.cx.toFixed(1) + " " + layout.cy.toFixed(1) + ")"}>
              <g className="amr-rise">
                <g className="amr-sun-scale">
                  <circle className="amr-ring" r={R} strokeWidth={Math.max(1.5, layout.stroke * 0.12)} />
                  <circle className="amr-ring amr-ring-2" r={R} strokeWidth={Math.max(1.5, layout.stroke * 0.09)} />
                  <circle className="amr-ring amr-ring-3" r={R} strokeWidth={Math.max(1, layout.stroke * 0.06)} />
                  <g className="amr-sun">
                    <circle r={R} fill={colors.sun} />
                    <circle r={R} fill={"url(#" + uid + "-sun)"} />
                  </g>
                </g>
                {counter ? (
                  <path className="amr-count" d={count.d} strokeWidth={Math.max(3, R * 0.25 * 0.24)} />
                ) : null}
                <path className="amr-heart" d={heart.d} pathLength={1} strokeWidth={Math.max(3, R * 0.34 * 0.2)} />
                {caption ? (
                  <text className="amr-caption" x={0} y={-R * 0.25} textAnchor="middle" fontSize={Math.max(12, R * 0.075)}>
                    {caption}
                  </text>
                ) : null}
                <text className="amr-hint" x={0} y={-R * 0.12} textAnchor="middle" fontSize={Math.max(9, R * 0.036)}>
                  {loop ? "click to replay" : "click to enter"}
                </text>
              </g>
            </g>

            <g className="amr-word" key={cycle} strokeWidth={layout.stroke.toFixed(2)}>
              {layout.letters.map((l, i) => (
                <g
                  key={i}
                  className="amr-fly"
                  style={{ "--fx": l.fx.toFixed(1) + "px", "--fy": l.fy.toFixed(1) + "px", "--fr": l.fr.toFixed(1) + "deg" } as React.CSSProperties}
                >
                  <g
                    ref={(el) => {
                      letterRefs.current[i] = el
                    }}
                    className="amr-letter"
                    onPointerEnter={() => kick(i, 0.5)}
                    onClick={(e) => {
                      e.stopPropagation()
                      kick(i, 1.1)
                    }}
                  >
                    {l.strokes.map((d, j) => (
                      <path
                        key={j}
                        ref={(el) => {
                          if (!strokeRefs.current[i]) strokeRefs.current[i] = []
                          strokeRefs.current[i][j] = el
                        }}
                        d={amrPath(d, l.m, jitter0, 1 + i)}
                        pathLength={1}
                        strokeDasharray="1 1"
                        style={{ strokeDashoffset: 1, opacity: 0 }}
                      />
                    ))}
                    {l.strokes.map((d, j) => (
                      <path key={"hit" + j} className="amr-hit" d={amrPath(d, l.m, 0, 0)} strokeWidth={layout.stroke * 1.6} />
                    ))}
                  </g>
                </g>
              ))}
            </g>
          </svg>

          <svg className="amr-grain" aria-hidden="true">
            <filter id={uid + "-grain"}>
              <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter={"url(#" + uid + "-grain)"} />
          </svg>

          <div className="amr-frame" />
          <span className="amr-sr" aria-live="polite">
            {loading ? "" : label + " — " + caption}
          </span>
        </div>
      ) : null}
    </div>
  )
}
