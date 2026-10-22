"use client"

import * as React from "react"

/* ------------------------------------------------------------------ types */

export type BrushstrokePortfolioHeroProps = {
  /**
   * Height of the hero. Must be a definite length — the sheet is fitted to this
   * box, so a percentage collapses to 0px unless every ancestor up to `<html>`
   * has a real height. Never pass `"100%"`.
   */
  height?: string
  /** Floor for the height, so the rules and the painted word stay legible. */
  minHeight?: string
  /**
   * `"contain"` keeps the whole 1200x734 sheet visible and centred — the poster
   * as drawn. `"cover"` crops it left and right to fill a taller hero.
   */
  fit?: "contain" | "cover"
  /** Top rule, left cell. Its **first word** is the bold one. */
  role?: string
  /** Top rule, centre cell — the big line. */
  period?: string
  /** Top rule, centre cell — the letterspaced line under it. */
  periodNote?: string
  /** Set above the painted word. Its **last word** is the bold one. */
  name?: string
  /** Append a lowercase possessive to the name, as the poster does. */
  possessive?: boolean
  /** Bottom rule, left cell. Set in caps. */
  email?: string
  /** Bottom rule, right cell. */
  phone?: string
  /**
   * Face for the set text — the rules, the name line, the contacts. The painted
   * word and the ghost lockup are drawn, not set, and ignore this.
   */
  sansFamily?: string
  className?: string
}

/* The sheet. Every coordinate in this file lives in this box. */
const W = 1200
const H = 734

/* Margins the rules and the grid are hung off. */
const ML = 75
const MR = W - ML

/* --------------------------------------------------------------- geometry
   The painted word is not a font and not a traced outline. Every mark is a
   centreline plus a pressure profile — a half-width per point — and the filled
   outline is generated from the two. That is what a brush actually does, and it
   means the taper at the end of a stroke is a number in the data rather than a
   hand-fitted bezier that has to be redrawn every time a letter moves. */

type Vec = [number, number]

// #region ribbon

const fmt = (n: number) => (Math.round(n * 100) / 100).toString()

/**
 * Catmull-Rom through every point, emitted as cubics. The spline passes through
 * the offset points instead of near them, so a width profile lands where the
 * data says it does.
 */
export function curve(pts: Vec[], closed: boolean): string {
  const n = pts.length
  const at = (i: number) =>
    pts[closed ? (i + n) % n : Math.min(n - 1, Math.max(0, i))]
  let d = "M" + fmt(pts[0][0]) + " " + fmt(pts[0][1])
  const span = closed ? n : n - 1
  for (let i = 0; i < span; i++) {
    const p0 = at(i - 1)
    const p1 = at(i)
    const p2 = at(i + 1)
    const p3 = at(i + 2)
    d +=
      "C" +
      fmt(p1[0] + (p2[0] - p0[0]) / 6) + " " + fmt(p1[1] + (p2[1] - p0[1]) / 6) + " " +
      fmt(p2[0] - (p3[0] - p1[0]) / 6) + " " + fmt(p2[1] - (p3[1] - p1[1]) / 6) + " " +
      fmt(p2[0]) + " " + fmt(p2[1])
  }
  return closed ? d + "Z" : d
}

/** One side of a stroke: every point pushed along its normal by its half-width. */
function offset(pts: Vec[], w: number[], side: number, closed: boolean): Vec[] {
  const n = pts.length
  const out: Vec[] = []
  for (let i = 0; i < n; i++) {
    const a = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)]
    const b = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)]
    let tx = b[0] - a[0]
    let ty = b[1] - a[1]
    const len = Math.hypot(tx, ty) || 1
    tx /= len
    ty /= len
    out.push([pts[i][0] - ty * w[i] * side, pts[i][1] + tx * w[i] * side])
  }
  return out
}

/** An open stroke: up one side, back down the other, closed. */
export function ribbon(pts: Vec[], w: number[]): string {
  const back = offset(pts, w, -1, false)
  back.reverse()
  return curve(offset(pts, w, 1, false).concat(back), true)
}

/** Twice the signed area of a closed polygon — the shoelace sum. */
function shoelace(pts: Vec[]): number {
  let a = 0
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length
    a += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1]
  }
  return a
}

/**
 * A closed stroke — the bowl of an `o`. Which side of the centreline ends up
 * outside depends on the direction it was wound, so the two offsets are
 * measured rather than assumed.
 */
export function ring(pts: Vec[], w: number[]): string {
  const a = offset(pts, w, 1, true)
  const b = offset(pts, w, -1, true)
  const outward = Math.abs(shoelace(a)) >= Math.abs(shoelace(b))
  const outer = outward ? a : b
  const inner = outward ? b : a
  // The counter must wind against the outer contour, so that it is a hole
  // under fill-rule nonzero. Evenodd would punch it out too, but then every
  // place two strokes of a letter overlap would become a hole as well.
  inner.reverse()
  return curve(outer, true) + curve(inner, true)
}

/**
 * A painted bowl. Pressure peaks on the two down-strokes and eases off over the
 * top and bottom of the curve, which is where a loaded brush is moving fastest
 * and leaving least.
 */
export function bowl(
  cx: number, cy: number, rx: number, ry: number,
  wmax: number, wmin: number, rot: number, steps: number,
): string {
  const pts: Vec[] = []
  const w: number[] = []
  const co = Math.cos(rot)
  const si = Math.sin(rot)
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2
    const x = Math.cos(t) * rx
    const y = Math.sin(t) * ry
    pts.push([cx + x * co - y * si, cy + x * si + y * co])
    w.push(wmin + (wmax - wmin) * Math.abs(Math.cos(t)))
  }
  return ring(pts, w)
}

/** Deterministic noise, so the spatter is the same sheet on every render. */
function rng(seed: number) {
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

/* ------------------------------------------------------------- the word
   "Portfolio", painted. Nine letters, mixed case exactly as the poster sets
   them: caps on the P, the R and the closing O, lowercase between. Each entry
   is one pass of the brush — the P is two, the R is three — written as the
   path the hand took and the pressure it carried. Baseline sits at y=400,
   x-height at 295, ascenders at 245. */

const WORD = [
  /* P — stem pulled down, then the bowl swung off the top of it. */
  ribbon([[219, 249], [223, 298], [228, 349], [234, 401]], [6, 14, 13.5, 6.5]),
  ribbon([[218, 256], [266, 248], [299, 276], [273, 311], [229, 318]], [7, 13, 12, 10.5, 7]),
  /* o */
  bowl(350, 348, 44, 50, 13.5, 9, -0.06, 48),
  /* R — stem, bowl, then the leg kicked out to the baseline. */
  ribbon([[407, 257], [411, 328], [419, 399]], [6, 13.5, 6]),
  ribbon([[407, 261], [456, 253], [489, 281], [463, 315], [417, 322]], [6.5, 12.5, 11.5, 10, 6.5]),
  ribbon([[447, 317], [473, 357], [499, 399]], [10, 11, 4.5]),
  /* t — the stem flicks right off the baseline, crossbar laid over it. */
  ribbon([[526, 247], [529, 309], [533, 369], [546, 399], [563, 395]], [4.5, 12, 11, 8, 4]),
  ribbon([[487, 301], [529, 296], [571, 301]], [4, 9, 3.5]),
  /* f — ascender hooked left at the top, dropping past the baseline. */
  ribbon([[632, 243], [607, 245], [598, 299], [596, 359], [594, 405]], [4, 9.5, 12, 11, 5]),
  ribbon([[561, 303], [603, 298], [646, 303]], [4, 9, 3.5]),
  /* o */
  bowl(681, 350, 42, 49, 13, 8.5, -0.05, 48),
  /* l */
  ribbon([[739, 249], [744, 319], [751, 395], [765, 400]], [5, 13, 10, 4]),
  /* i — stem and a dropped dot. */
  ribbon([[789, 295], [793, 349], [799, 399]], [5, 12, 5]),
  ribbon([[784, 258], [793, 267]], [8, 7]),
  /* O — the closing cap, loaded heavier than anything else on the sheet. */
  bowl(898, 340, 66, 70, 16.5, 11, 0.04, 56),
].join(" ")

/* The bar under the word: one long drag, loaded at the left and running dry
   before it lifts. The three streaks are what the splayed bristles leave after
   the body of the stroke has stopped depositing. */

const BAR = [
  ribbon(
    [[218, 449], [300, 455], [430, 460], [600, 461], [760, 457], [890, 450], [974, 446]],
    [16, 26, 30, 30, 27, 17, 6],
  ),
  ribbon([[930, 433], [968, 430], [988, 429]], [3, 1.4, 0.4]),
  ribbon([[918, 441], [975, 437], [1006, 436]], [5, 2.4, 0.6]),
  ribbon([[922, 450], [985, 447], [1014, 447]], [5.5, 2.6, 0.7]),
  ribbon([[920, 458], [978, 457], [1004, 458]], [5, 2.2, 0.6]),
  ribbon([[924, 466], [972, 467], [996, 469]], [4, 1.6, 0.5]),
].join(" ")

/* ------------------------------------------------------- the ghost lockup
   A heavy grotesque, drawn rather than set, because it only needs seven
   glyphs and a webfont that fails to load would take the whole watermark with
   it. Cap height 100, stem 34, bar 28. Counters are holes, so the lockup
   fills evenodd — unlike the painted word, none of these overlap. */

const DISPLAY: Record<string, { w: number; d: string }> = {
  P: { w: 100, d: "M0 0H58C86 0 100 13 100 33S86 66 58 66H34V100H0Z M34 25H56C66 25 72 28 72 33S66 41 56 41H34Z" },
  O: { w: 112, d: "M56 0C87 0 112 22 112 50S87 100 56 100S0 78 0 50S25 0 56 0Z M56 26C43 26 34 36 34 50S43 74 56 74S78 64 78 50S69 26 56 26Z" },
  R: { w: 104, d: "M0 0H58C86 0 100 12 100 30C100 44 91 54 76 58L104 100H66L42 63H34V100H0Z M34 24H56C66 24 72 26 72 31S66 38 56 38H34Z" },
  T: { w: 100, d: "M0 0H100V28H67V100H33V28H0Z" },
  F: { w: 90, d: "M0 0H90V28H34V43H78V70H34V100H0Z" },
  L: { w: 84, d: "M0 0H34V72H84V100H0Z" },
  I: { w: 34, d: "M0 0H34V100H0Z" },
}

function setWord(word: string, tracking: number) {
  let pen = 0
  const glyphs = [...word].map((c) => {
    const g = DISPLAY[c]
    const at = pen
    pen += g.w + tracking
    return { d: g.d, x: at }
  })
  return { glyphs, width: pen - tracking }
}

/* "PORT" over "FOLIO", both fitted to the same measured width so the two rows
   stack as one block behind the painting. */
const GHOST_TOP = setWord("PORT", -3)
const GHOST_BOT = setWord("FOLIO", -3)
const GHOST_W = 470
const GHOST_X = 252
const TOP_S = GHOST_W / GHOST_TOP.width
const BOT_S = GHOST_W / GHOST_BOT.width
const TOP_Y = 348
const BOT_Y = 478

/* ----------------------------------------------------------------- marks
   The small printed furniture: the three device glyphs on the top rule and the
   two contact glyphs on the bottom one. Drawn on a 16-unit box centred on the
   origin so they can be dropped anywhere and scaled once. */

const TRI = [0, 120, 240].map((deg) => {
  const t = ((deg - 90) * Math.PI) / 180
  return { x: Math.cos(t) * 3.1, y: Math.sin(t) * 3.1 }
})

const ENVELOPE =
  "M-7-5H7V5H-7Z M-7-5L0 1L7-5"
const PHONE =
  "M-5.4-6.2C-6.6-6.2-7.4-5.3-7.2-4.2C-6.4 1.2-2.2 5.6 3.1 6.6C4.2 6.8 5.2 6 5.2 4.9V2.6C5.2 1.7 4.6 1 3.7 0.9L2 0.7C1.3 0.6 0.7 1 0.4 1.6L0.1 2.3C-2 1.2-3.5-0.4-4.4-2.5L-3.8-2.9C-3.2-3.2-2.9-3.9-3-4.6L-3.3-6C-3.4-6.1-3.6-6.2-3.8-6.2Z"

/* ------------------------------------------------------------------ sheet
   Everything below is furniture: the grid the layout is hung on, the torn left
   edge and the spray that came off it, and the fine flecks the loaded brush
   threw across the middle of the sheet. All of it is seeded, so the poster is
   the same sheet every render instead of a new one each mount. */

const GRID_X0 = 370
const GRID_X1 = 1010
const GRID_Y0 = 95
const GRID_Y1 = 650
const CELL = 64

const GRID_V: number[] = []
for (let x = GRID_X0; x <= GRID_X1 + 0.5; x += CELL) GRID_V.push(x)
const GRID_H: number[] = []
for (let y = GRID_Y0; y <= GRID_Y1 + 0.5; y += CELL) GRID_H.push(y)

/** The ragged left edge of the sheet, and the ink that ran off it. */
const TORN = (() => {
  const r = rng(9137)
  const pts: Vec[] = []
  for (let y = 80; y <= 542; y += 15) {
    pts.push([1 + Math.pow(r(), 1.6) * 15, y])
  }
  // Splined rather than polylined: a tear in paper curves, a sawtooth reads as
  // a die-cut.
  return "M0 80L" + curve(pts, false).slice(1) + "L0 542Z"
})()

type Dot = { x: number; y: number; r: number }

/** Spray off the torn edge: dense at the tear, thinning as it carries right. */
const SPRAY: Dot[] = (() => {
  const r = rng(20231)
  const dots: Dot[] = []
  for (let i = 0; i < 340; i++) {
    const t = Math.pow(r(), 2.6)
    dots.push({
      x: 4 + t * 152,
      y: 386 + (r() - 0.5) * (86 + t * 330),
      r: 0.4 + Math.pow(r(), 3) * 3.6 * (1 - t * 0.55),
    })
  }
  return dots
})()

/** Dust and specks over the whole sheet, not just where the brush went. */
const DUST: Dot[] = (() => {
  const r = rng(8815)
  const dots: Dot[] = []
  for (let i = 0; i < 130; i++) {
    dots.push({ x: r() * W, y: r() * H, r: 0.25 + Math.pow(r(), 4.5) * 1.7 })
  }
  return dots
})()

/** Flecks thrown off the brush across the middle of the sheet. */
const FLECKS: Dot[] = (() => {
  const r = rng(4402)
  const dots: Dot[] = []
  for (let i = 0; i < 90; i++) {
    dots.push({
      x: 196 + r() * 830,
      y: 226 + r() * 286,
      r: 0.35 + Math.pow(r(), 3.4) * 2.6,
    })
  }
  return dots
})()

/* ------------------------------------------------------------------ style */

/* The grain of the stock, shared by the sheet and by everything printed on
   it. Isotropic on purpose — stretching it two ways makes a woven linen, and
   this is a cold-pressed paper: granular, not cloth. */
const TOOTH = "0.17"

const INK = "#1a181c"
const RULE = "#222024"

const CSS = `
.bph-root{position:relative;width:100%;overflow:hidden;isolation:isolate;background:#e7e4dd;}
.bph-svg{position:absolute;inset:0;width:100%;height:100%;display:block;}
.bph-tooth{mix-blend-mode:overlay;opacity:.7;}
.bph-mottle{mix-blend-mode:multiply;opacity:.38;}
.bph-grain{mix-blend-mode:overlay;opacity:.62;}
.bph-set{font-kerning:none;paint-order:stroke;}
`

const SANS_STACK =
  '"Helvetica Neue", Helvetica, Arial, "Liberation Sans", "DejaVu Sans", sans-serif'

/* ------------------------------------------------------------- component */

export default function BrushstrokePortfolioHero({
  height = "100svh",
  minHeight = "460px",
  fit = "contain",
  role = "3D Artist",
  period = "2022-2023",
  periodNote = "Selected works",
  name = "Your Name",
  possessive = true,
  email = "hello@example.com",
  phone = "000 000 0000",
  sansFamily = SANS_STACK,
  className,
}: BrushstrokePortfolioHeroProps) {
  // Filter ids are global. Two posters on one page would otherwise share them
  // and the second mount would repaint the first.
  const uid = React.useId().replace(/:/g, "")
  const id = (n: string) => n + uid
  const u = (n: string) => "url(#" + id(n) + ")"

  const up = (s: string) => s.toLocaleUpperCase()
  const roleWords = role.trim().split(/\s+/)
  const nameWords = name.trim().split(/\s+/)
  const nameLead = nameWords.slice(0, -1).map(up).join(" ")
  const nameLast = up(nameWords[nameWords.length - 1] ?? "")

  // SVG cannot measure text, so the phone glyph is placed off an advance
  // estimate for the caps run rather than a real measurement. It only has to
  // keep a believable gap, and it tracks the string length when the number
  // changes.
  const phoneGap = phone.length * (11 * 0.58 + 1.3)

  return (
    <div
      className={"bph-root" + (className ? " " + className : "")}
      style={{ height, minHeight }}
    >
      <style>{CSS}</style>
      <svg
        className="bph-svg"
        viewBox={"0 0 " + W + " " + H}
        preserveAspectRatio={fit === "cover" ? "xMidYMid slice" : "xMidYMid meet"}
        role="img"
        aria-label={name + " — " + role + ", " + period + " " + periodNote}
      >
        <defs>
          {/* The painted marks. Two displacement passes rough the outline, then
              a turbulence stretched hard along x is thresholded into a mask and
              composited in — that mask is the dry brush. Its ramp is what keeps
              the strokes solid ink with bristle streaks instead of grey dither:
              four of seven stops sit at full opacity before the drop. */}
          <filter
            id={id("brush")}
            x="-10%" y="-24%" width="120%" height="148%"
            colorInterpolationFilters="sRGB"
          >
            {/* 1. The outline goes ragged. */}
            <feTurbulence type="fractalNoise" baseFrequency="0.014 0.024" numOctaves="3" seed="11" result="coarse" />
            <feDisplacementMap in="SourceGraphic" in2="coarse" scale="6" xChannelSelector="R" yChannelSelector="G" result="rag" />
            {/* 2. Soften the vector edge, so the tooth has something to bite
                   into instead of a hard boundary. */}
            <feGaussianBlur in="rag" stdDeviation="0.6" result="soft" />
            {/* 3. Paper tooth — the same grain the sheet itself is given, so
                   the ink sits in the surface rather than on it. Weighted hard
                   towards opaque: this speckles a dark stroke, it does not
                   turn one grey. */}
            <feTurbulence type="fractalNoise" baseFrequency={TOOTH} numOctaves="3" seed="7" result="tooth" />
            <feColorMatrix in="tooth" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0" result="toothA" />
            <feComponentTransfer in="toothA" result="toothM">
              <feFuncA type="table" tableValues="0.28 0.74 0.92 0.99 1 1" />
            </feComponentTransfer>
            {/* 4. Load. Where the brush was carrying and where it was running
                   out, at the scale of a whole letter rather than a fibre. */}
            <feTurbulence type="fractalNoise" baseFrequency="0.018 0.03" numOctaves="2" seed="19" result="blotch" />
            <feColorMatrix in="blotch" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0" result="blotchA" />
            <feComponentTransfer in="blotchA" result="blotchM">
              <feFuncA type="table" tableValues="0.5 0.78 0.93 1 1 1" />
            </feComponentTransfer>
            {/* 5. Bristle skip along the drag. */}
            <feTurbulence type="fractalNoise" baseFrequency="0.005 0.26" numOctaves="3" seed="3" result="bristle" />
            <feColorMatrix in="bristle" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0" result="bristleA" />
            <feComponentTransfer in="bristleA" result="bristleM">
              <feFuncA type="table" tableValues="1 1 1 0.97 0.72 0.3" />
            </feComponentTransfer>
            {/* 6. One mask: tooth x load x skip. */}
            <feComposite in="toothM" in2="blotchM" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" result="m1" />
            <feComposite in="m1" in2="bristleM" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" result="mask" />
            <feComposite in="soft" in2="mask" operator="in" />
          </filter>

          {/* The same press run far lighter — the ghost lockup and the spray. */}
          <filter
            id={id("press")}
            x="-8%" y="-14%" width="116%" height="128%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence type="fractalNoise" baseFrequency="0.03 0.05" numOctaves="2" seed="17" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" xChannelSelector="R" yChannelSelector="G" result="d" />
            <feTurbulence type="fractalNoise" baseFrequency={TOOTH} numOctaves="3" seed="7" result="f" />
            <feColorMatrix in="f" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0" result="fa" />
            <feComponentTransfer in="fa" result="fm">
              <feFuncA type="table" tableValues="0.42 0.8 0.93 0.99 1 1" />
            </feComponentTransfer>
            <feComposite in="d" in2="fm" operator="in" />
          </filter>

          {/* Board tooth: turbulence stretched along y so the fibre runs. */}
          <filter id={id("tooth")} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency={TOOTH} numOctaves="3" seed="7" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="1" intercept="0" />
            </feComponentTransfer>
          </filter>

          {/* Broad blotching, so the sheet is not one flat tone. */}
          <filter id={id("mottle")} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.004" numOctaves="3" seed="41" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.4" intercept="0" />
            </feComponentTransfer>
          </filter>

          <filter id={id("grain")} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" seed="31" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.42" intercept="0" />
            </feComponentTransfer>
          </filter>

          <radialGradient id={id("vig")} cx="50%" cy="47%" r="74%">
            <stop offset="68%" stopColor="#2a2216" stopOpacity="0" />
            <stop offset="100%" stopColor="#2a2216" stopOpacity="0.17" />
          </radialGradient>
        </defs>

        {/* ---- the sheet ---- */}
        <rect width={W} height={H} fill="#eae7df" />
        <rect className="bph-mottle" width={W} height={H} filter={u("mottle")} />
        <rect className="bph-tooth" width={W} height={H} filter={u("tooth")} />

        <g fill={INK} opacity="0.17">
          {DUST.map((p, i) => (
            <circle key={i} cx={fmt(p.x)} cy={fmt(p.y)} r={fmt(p.r)} />
          ))}
        </g>

        {/* ---- layout grid, printed faint under everything ---- */}
        <g stroke={INK} strokeWidth="0.8" opacity="0.05">
          {GRID_V.map((x) => <line key={"v" + x} x1={x} y1={GRID_Y0} x2={x} y2={GRID_Y1} />)}
          {GRID_H.map((y) => <line key={"h" + y} x1={GRID_X0} y1={y} x2={GRID_X1} y2={y} />)}
        </g>
        <g stroke={INK} strokeWidth="0.9" opacity="0.05">
          <line x1={ML} y1="82" x2={ML} y2="657" />
          <line x1={MR} y1="82" x2={MR} y2="657" />
        </g>

        {/* ---- the watermark, under the painting ---- */}
        <g fill={INK} fillRule="evenodd" opacity="0.15" filter={u("press")}>
          <g transform={"translate(" + GHOST_X + " " + TOP_Y + ") scale(" + fmt(TOP_S) + ")"}>
            {GHOST_TOP.glyphs.map((g, i) => (
              <path key={i} d={g.d} transform={"translate(" + g.x + " -100)"} />
            ))}
          </g>
          <g transform={"translate(" + GHOST_X + " " + BOT_Y + ") scale(" + fmt(BOT_S) + ")"}>
            {GHOST_BOT.glyphs.map((g, i) => (
              <path key={i} d={g.d} transform={"translate(" + g.x + " -100)"} />
            ))}
          </g>
        </g>

        {/* ---- torn left edge and the spray off it ---- */}
        <g fill={INK} filter={u("press")}>
          <path d={TORN} opacity="0.72" />
          {SPRAY.map((p, i) => (
            <circle key={i} cx={fmt(p.x)} cy={fmt(p.y)} r={fmt(p.r)} opacity="0.62" />
          ))}
        </g>

        {/* ---- the painting ---- */}
        <g fill={INK} fillRule="nonzero" filter={u("brush")}>
          <path d={WORD} />
          <path d={BAR} />
          {FLECKS.map((p, i) => (
            <circle key={i} cx={fmt(p.x)} cy={fmt(p.y)} r={fmt(p.r)} opacity="0.7" />
          ))}
        </g>

        {/* ---- rules ---- */}
        <g stroke={RULE} strokeWidth="1.6">
          <line x1={ML} y1="36" x2={MR} y2="36" />
          <line x1={ML} y1="82" x2={MR} y2="82" />
          <line x1={ML} y1="657" x2={MR} y2="657" />
          <line x1={ML} y1="705" x2={MR} y2="705" />
          <line x1={ML} y1="36" x2={ML} y2="82" />
          <line x1={MR} y1="36" x2={MR} y2="82" />
          <line x1={ML} y1="657" x2={ML} y2="705" />
          <line x1={MR} y1="657" x2={MR} y2="705" />
          <line x1="247" y1="36" x2="247" y2="82" />
          <line x1="1008" y1="36" x2="1008" y2="82" />
        </g>

        {/* ---- set text ---- */}
        <g className="bph-set" fill={INK} fontFamily={sansFamily}>
          <text x="90" y="66" fontSize="21" letterSpacing="0.7">
            <tspan fontWeight={700}>{up(roleWords[0] ?? "")}</tspan>
            {roleWords.length > 1 ? (
              <tspan fontWeight={400}>{" " + up(roleWords.slice(1).join(" "))}</tspan>
            ) : null}
          </text>

          <text x={W / 2} y="57" fontSize="20" fontWeight={700} letterSpacing="1.5" textAnchor="middle">
            {up(period)}
          </text>
          <text x={W / 2} y="74" fontSize="9.5" fontWeight={500} letterSpacing="3.4" textAnchor="middle">
            {up(periodNote)}
          </text>

          <text x={W / 2} y="215" fontSize="23" letterSpacing="2.8" textAnchor="middle">
            {nameLead ? <tspan fontWeight={400}>{nameLead + " "}</tspan> : null}
            <tspan fontWeight={700}>{nameLast}</tspan>
            {possessive ? <tspan fontSize="17" fontWeight={400} letterSpacing="0">{"’s"}</tspan> : null}
          </text>

          <text x="112" y="689" fontSize="11" fontWeight={500} letterSpacing="1.35">
            {up(email)}
          </text>
          <text x={MR - 13} y="689" fontSize="11" fontWeight={500} letterSpacing="1.35" textAnchor="end">
            {phone}
          </text>
        </g>

        {/* ---- device and contact glyphs ---- */}
        <g fill="none" stroke={INK} strokeWidth="1.6">
          {[0, 1, 2].map((i) => (
            <g key={i} transform={"translate(" + (1035 + i * 29) + " 59)"}>
              <circle r="7.6" />
              {i === 0 ? (
                <path
                  d="M-4.6 2.9C-5.9-1.1-3.2-4.8 0.9-4.8C3.6-4.8 5.4-3.1 5.4-1C5.4 1.5 3.1 2.8 1 2"
                  strokeLinecap="round"
                />
              ) : (
                TRI.map((p, k) => (
                  <circle key={k} cx={fmt(p.x)} cy={fmt(p.y)} r="1.7" fill={INK} stroke="none" />
                ))
              )}
            </g>
          ))}
          <g transform="translate(94 685)" strokeWidth="1.5" strokeLinejoin="round">
            <path d={ENVELOPE} />
          </g>
          <g transform={"translate(" + fmt(MR - 26 - phoneGap) + " 685)"}>
            <path d={PHONE} fill={INK} stroke="none" />
          </g>
        </g>

        {/* ---- press wear over the top ---- */}
        <rect width={W} height={H} fill={u("vig")} />
        <rect className="bph-grain" width={W} height={H} filter={u("grain")} />
      </svg>
    </div>
  )
}
