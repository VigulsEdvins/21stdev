"use client"

import * as React from "react"

/* ------------------------------------------------------------------ types */

export type PinboardPortfolioHeroProps = {
  /**
   * Height of the hero. Must be a definite length — the sheet is fitted to this
   * box, so a percentage collapses to 0px unless every ancestor up to <html>
   * has a real height. Never pass `"100%"`.
   */
  height?: string
  /** Floor for the height, so the sheet stays readable on short viewports. */
  minHeight?: string
  /**
   * `"contain"` keeps the whole 2:3 sheet visible and centred — the poster as
   * drawn. `"cover"` crops it top and bottom to fill a wide hero band.
   */
  fit?: "contain" | "cover"
  /** Name inked on the pinned slip. Its last word is the red one. */
  name?: string
  /**
   * Let the board be handled: drag the paper and the pins around, drag the wall
   * to pan, hold Ctrl/Cmd and wheel to zoom, double-click to put it all back.
   *
   * Off by default, and off means *unchanged* — the interaction state starts at
   * the poster's drawn rest position, so nothing about the static hero moves.
   *
   * It claims touch gestures on the sheet (`touch-action: none`), so a
   * full-viewport interactive hero leaves a phone with no way to scroll past
   * it. Give it a bounded `height` when you turn this on.
   */
  interactive?: boolean
  className?: string
}

/* The sheet. Every coordinate in this file lives in this box. */
const W = 735
const H = 1102

/* --------------------------------------------------------------- lettering
   The display face is drawn, not set: an ultra-black geometric grotesque on a
   100-unit cap height, stem 32, bar 27. Seven glyphs is the whole alphabet the
   lockup needs, and drawing them means no font can fail to load and take the
   poster with it. Counters are holes, so every path fills evenodd. */

const DISPLAY: Record<string, { w: number; d: string }> = {
  P: {
    w: 99,
    d:
      "M0 0H58C84 0 99 12.5 99 32S84 64 58 64H32V100H0Z" +
      "M32 24H57C66 24 71 27 71 32S66 40 57 40H32Z",
  },
  O: {
    w: 110,
    d:
      "M0 50A55 50 0 1 1 110 50A55 50 0 1 1 0 50Z" +
      "M31 50A24 21 0 1 0 79 50A24 21 0 1 0 31 50Z",
  },
  R: {
    w: 101,
    d:
      "M0 0H58C84 0 99 12 99 30C99 43.5 90.5 53.5 76 57.5L101 100H63.5L42 61H32V100H0Z" +
      "M32 23H57C66 23 71 25.5 71 30S66 37 57 37H32Z",
  },
  T: { w: 98, d: "M0 0H98V27H65V100H33V27H0Z" },
  F: { w: 88, d: "M0 0H88V27H32V41H76V67H32V100H0Z" },
  L: { w: 82, d: "M0 0H32V73H82V100H0Z" },
  I: { w: 32, d: "M0 0H32V100H0Z" },
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

/* "PORT" over "FOLIO", the lower line mirrored on its baseline so the two read
   as one block and its reflection. Both are scaled to the widths the poster
   measures — that is what makes the row edges align. */
const TOP = setWord("PORT", -2)
const BOTTOM = setWord("FOLIO", -2)
const TOP_X = 166
const TOP_Y = 401
const TOP_S = 464 / TOP.width
const BOT_X = 174
const BOT_BASE = 642
const BOT_S = 434 / BOTTOM.width

/* ------------------------------------------------------------ handwriting
   The wall labels are a marker hand, and a marker hand is not a system font.
   Every character below is drawn as centre-line strokes on a baseline at y=0:
   x-height -38, cap -64, ascender -72, descender +22. They are rendered with a
   round pen and slanted at draw time, so the label reads the same on a machine
   with no script face installed as on one with five. */

type Pen = { w: number; d: string }

const HANDWRITING: Record<string, Pen> = {
  a: { w: 42, d: "M31 -30C25 -37 12 -37 7 -29C2 -21 3 -9 11 -4C19 1 28 -5 31 -13M32 -37L32 -8C32 -3 34 -1 37 0" },
  b: { w: 42, d: "M8 -70L8 -1M8 -17C11 -28 19 -36 27 -35C35 -34 38 -25 36 -15C34 -5 26 0 18 -1C12 -2 9 -8 8 -13" },
  c: { w: 38, d: "M33 -30C28 -36 16 -37 10 -30C3 -22 4 -9 12 -4C19 1 29 -2 34 -8" },
  d: { w: 42, d: "M35 -70L35 -1M35 -17C32 -28 24 -36 16 -35C8 -34 4 -25 6 -15C8 -5 16 0 24 -1C30 -2 34 -8 35 -13" },
  e: { w: 40, d: "M6 -17C14 -19 27 -24 34 -29C31 -35 19 -38 12 -31C5 -24 4 -9 13 -4C20 0 29 -3 34 -9" },
  f: { w: 32, d: "M14 -1L14 -58C14 -67 21 -72 28 -68M5 -34L27 -36" },
  g: { w: 40, d: "M32 -30C26 -36 14 -37 8 -30C2 -23 4 -10 12 -5C19 -1 28 -5 31 -13M33 -36L31 5C30 15 23 21 13 19C8 18 5 15 4 12" },
  h: { w: 42, d: "M8 -70L8 -1M8 -20C11 -29 19 -36 27 -34C33 -32 34 -26 33 -18L31 -1" },
  i: { w: 22, d: "M12 -37L12 -1M12 -52L12 -48" },
  j: { w: 24, d: "M14 -37L12 6C11 16 5 21 -1 19M14 -52L14 -48" },
  k: { w: 38, d: "M10 -70L10 -1M31 -36L11 -17M17 -21L31 -1" },
  l: { w: 24, d: "M14 -70L14 -7C14 -3 16 0 19 1" },
  m: { w: 56, d: "M5 -36L5 -1M5 -22C8 -30 14 -36 21 -35C26 -34 27 -29 27 -22L27 -1M27 -22C30 -30 36 -36 43 -35C48 -34 49 -29 49 -22L49 -1" },
  n: { w: 38, d: "M5 -36L5 -1M5 -21C8 -29 15 -36 23 -35C29 -34 30 -28 30 -20L30 -1" },
  o: { w: 40, d: "M20 -36C11 -36 4 -28 4 -18C4 -8 11 -1 20 -1C29 -1 36 -9 36 -19C36 -29 29 -36 20 -36Z" },
  p: { w: 42, d: "M6 -36L6 21M6 -17C9 -28 17 -36 25 -35C33 -34 36 -25 34 -15C32 -5 24 0 16 -1C10 -2 7 -8 6 -13" },
  q: { w: 42, d: "M34 -36L34 21M34 -17C31 -28 23 -36 15 -35C7 -34 4 -25 6 -15C8 -5 16 0 24 -1C30 -2 33 -8 34 -13" },
  r: { w: 32, d: "M7 -36L7 -1M7 -22C10 -30 17 -37 26 -35" },
  s: { w: 36, d: "M31 -31C26 -36 14 -38 9 -33C4 -28 8 -21 16 -19C24 -17 28 -12 25 -6C22 0 10 1 4 -4" },
  t: { w: 30, d: "M16 -54L16 -10C16 -4 19 -1 24 -2M5 -34L28 -36" },
  u: { w: 42, d: "M6 -36L6 -12C6 -6 9 -1 15 -1C22 -1 28 -8 30 -17L32 -36M30 -17L30 -7C30 -3 32 0 35 1" },
  v: { w: 38, d: "M5 -36L14 -1L32 -36" },
  w: { w: 50, d: "M4 -36L11 -1L23 -25L28 -1L45 -36" },
  x: { w: 36, d: "M5 -36L29 -1M30 -36L4 -1" },
  y: { w: 38, d: "M5 -36L15 -5L33 -36M15 -5L10 11C7 19 1 22 -3 19" },
  z: { w: 36, d: "M5 -35L30 -36L5 -2L31 -3" },
  A: { w: 40, d: "M2 -1L24 -64L35 -1M9 -22L31 -22" },
  B: { w: 44, d: "M12 -64L9 -1M12 -64C27 -65 36 -58 35 -48C34 -39 25 -34 11 -35M11 -35C28 -36 38 -29 37 -18C36 -7 25 0 9 -1" },
  C: { w: 48, d: "M44 -53C38 -62 24 -66 15 -57C4 -46 4 -18 15 -7C23 1 37 -2 44 -10" },
  D: { w: 48, d: "M12 -64L10 -1M12 -64C31 -65 42 -53 41 -33C40 -13 26 0 10 -1" },
  E: { w: 40, d: "M38 -64L11 -64L9 -1L36 -2M10 -34L30 -35" },
  I: { w: 24, d: "M18 -64L15 -1" },
  K: { w: 46, d: "M12 -64L9 -1M40 -64L11 -32M18 -38L41 -1" },
  M: { w: 56, d: "M2 -1L12 -64L28 -24L50 -64L48 -1" },
  N: { w: 48, d: "M4 -1L13 -64L37 -12L45 -64" },
  P: { w: 42, d: "M12 -64L8 -1M12 -64C28 -65 38 -57 37 -45C36 -33 25 -27 10 -28" },
  S: { w: 42, d: "M39 -56C33 -64 17 -66 11 -58C5 -50 10 -41 21 -36C32 -31 38 -23 33 -12C28 -1 12 1 4 -6" },
  T: { w: 46, d: "M4 -63L46 -64M25 -64L22 -1" },
  U: { w: 54, d: "M13 -64L10 -21C9 -9 15 0 25 0C36 0 43 -9 45 -21L50 -64" },
  X: { w: 46, d: "M5 -64L38 -1M43 -64L3 -1" },
  "Đ": { w: 48, d: "M12 -64L10 -1M12 -64C31 -65 42 -53 41 -33C40 -13 26 0 10 -1M1 -34L25 -35" },
  "4": { w: 40, d: "M32 -64L3 -21L36 -22M29 -35L27 -1" },
  ",": { w: 14, d: "M7 -2C9 2 8 8 3 12" },
  ".": { w: 12, d: "M6 -3L7 -1" },
  "/": { w: 30, d: "M30 -66L5 4" },
  "!": { w: 18, d: "M10 -64L8 -18M7 -3L8 -1" },
  " ": { w: 24, d: "" },
}

/** Accents, drawn separately and dropped over the letter they belong to. */
const MARKS: Record<string, string> = {
  circumflex: "M-10 -46L-1 -55L8 -46",
  grave: "M-9 -62L3 -51",
  acute: "M9 -62L-3 -51",
  horn: "M0 -34C8 -41 13 -37 13 -31",
  dot: "M0 9L1 11",
}

/** Precomposed characters the poster needs, as a base plus placed accents. */
const COMPOSED: Record<string, { base: string; marks: [string, number, number][] }> = {
  "ầ": { base: "a", marks: [["circumflex", 18, 0], ["grave", 16, -13]] },
  "ấ": { base: "a", marks: [["circumflex", 18, 0], ["acute", 20, -13]] },
  "ạ": { base: "a", marks: [["dot", 17, 0]] },
  "ứ": { base: "u", marks: [["horn", 30, 0], ["acute", 16, 0]] },
  "ừ": { base: "u", marks: [["horn", 30, 0], ["grave", 16, 0]] },
  "ế": { base: "e", marks: [["circumflex", 18, 0], ["acute", 20, -13]] },
  "ê": { base: "e", marks: [["circumflex", 18, 0]] },
  "ô": { base: "o", marks: [["circumflex", 20, 0]] },
  "ơ": { base: "o", marks: [["horn", 30, 0]] },
  "ư": { base: "u", marks: [["horn", 30, 0]] },
  "á": { base: "a", marks: [["acute", 20, 0]] },
  "à": { base: "a", marks: [["grave", 16, 0]] },
  "é": { base: "e", marks: [["acute", 20, 0]] },
  "í": { base: "i", marks: [["acute", 6, 0]] },
  "ó": { base: "o", marks: [["acute", 20, 0]] },
  "ú": { base: "u", marks: [["acute", 16, 0]] },
}

/** Repeatable wobble, so the same label is uneven the same way on every paint. */
const wobble = (n: number) => {
  const v = Math.sin(n * 12.9898 + 4.233) * 43758.5453
  return (v - Math.floor(v)) * 2 - 1
}

type Stroke = { d: string; x: number; dy: number; rot: number }

/** Sets a string in the drawn hand and reports the advance it consumed. */
function writeLine(text: string, seed = 0) {
  const strokes: Stroke[] = []
  let pen = 0
  let i = 0
  for (const ch of text) {
    const comp = COMPOSED[ch]
    const key = comp ? comp.base : ch
    const glyph = HANDWRITING[key] ?? HANDWRITING[key.toLowerCase()] ?? HANDWRITING[" "]
    const dy = wobble(i + seed * 7.7) * 1.6
    const rot = wobble(i + seed * 3.1 + 40) * 1.7
    if (glyph.d) strokes.push({ d: glyph.d, x: pen, dy, rot })
    if (comp) {
      for (const [mark, mx, my] of comp.marks) {
        strokes.push({ d: MARKS[mark], x: pen + mx, dy: dy + my, rot })
      }
    }
    pen += glyph.w
    i++
  }
  return { strokes, width: pen }
}

/* -------------------------------------------------------------------- copy
   Each label carries the width it occupies on the sheet, so the blocks sit
   exactly where the arrows point regardless of the string inside them. */

type Label = { t: string; x: number; y: number; cap: number; w: number; bold?: boolean }

const ANNOTATIONS: Label[][] = [
  [
    { t: "Print Design", x: 112, y: 212, cap: 22, w: 134, bold: true },
    { t: "Magazines, books,", x: 108, y: 241, cap: 15, w: 124 },
    { t: "covers, calendars,", x: 104, y: 266, cap: 15, w: 126 },
    { t: "product boxes, Posm", x: 100, y: 291, cap: 15, w: 150 },
  ],
  [
    { t: "Communication Design", x: 424, y: 222, cap: 22, w: 236, bold: true },
    { t: "Design poster, banner,", x: 460, y: 251, cap: 15, w: 172 },
    { t: "social media post,", x: 472, y: 275, cap: 15, w: 140 },
    { t: "brochure, flyer, infographic...", x: 424, y: 299, cap: 15, w: 248 },
  ],
  [
    { t: "Ux/Ui Design", x: 136, y: 760, cap: 22, w: 132, bold: true },
    { t: "Design app, website,", x: 116, y: 790, cap: 15, w: 158 },
    { t: "landing page, UX wireframe.", x: 98, y: 816, cap: 15, w: 202 },
  ],
  [
    { t: "About me", x: 560, y: 790, cap: 22, w: 98, bold: true },
    { t: "I have been in this", x: 532, y: 818, cap: 15, w: 142 },
    { t: "profession for 4 years", x: 528, y: 844, cap: 15, w: 164 },
  ],
]

const PRINT_NOTE = ["Magazines, books,", "covers, calendars,", "product boxes, Posm"]
const COMMS_NOTE = ["Design poster, banner,", "social media post,", "brochure, flyer, infographic..."]
const UX_NOTE = ["Design app, website,", "landing page, UX wireframe."]

const CSS = `
.pph-root{position:relative;width:100%;overflow:hidden;isolation:isolate;background-color:#84868a}
.pph-l{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:block}
.pph-wall{background:radial-gradient(108% 52% at 50% -10%,#ffffff 0%,#f4f4f5 9%,#dfe0e2 24%,#c1c3c5 42%,#a3a5a8 60%,#85878b 78%,#6d6f73 100%)}
.pph-wall2{background:radial-gradient(64% 38% at 50% 104%,rgba(255,255,255,.1),rgba(255,255,255,0) 62%),radial-gradient(126% 78% at 50% 34%,rgba(0,0,0,0) 32%,rgba(0,0,0,.12) 60%,rgba(0,0,0,.3) 84%,rgba(0,0,0,.46) 100%)}
.pph-vig{background:radial-gradient(108% 62% at 50% 34%,rgba(0,0,0,0) 30%,rgba(0,0,0,.12) 58%,rgba(0,0,0,.3) 82%,rgba(0,0,0,.5) 100%),linear-gradient(180deg,rgba(0,0,0,.06) 0%,rgba(0,0,0,0) 26%,rgba(0,0,0,0) 50%,rgba(0,0,0,.2) 100%)}
.pph-tex{mix-blend-mode:soft-light;opacity:.92}
.pph-tex2{mix-blend-mode:overlay;opacity:.26}
.pph-play{pointer-events:auto;touch-action:none}
.pph-grab{cursor:grab}
.pph-play[data-grab="1"] .pph-grab{cursor:grabbing}
.pph-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
`

/* ---------------------------------------------------------- the handling

   Nothing below changes what the poster looks like at rest. Every paper is
   offset by (0,0), every pin sits where it was drawn, and the view is the whole
   sheet — so with `interactive` off this is all identity arithmetic. */

type Vec = { x: number; y: number }
type View = { x: number; y: number; w: number; h: number }

/* The sheet is 735x1102, but the artwork sits in the middle of it with a wide
   empty margin all round. Framing the whole sheet on a landscape screen leaves
   the poster a small island in a field of bare wall — 42% of a 1440x900 frame.
   Frame the drawing instead, with a little air around it, and let the wall fill
   whatever the aspect ratio leaves over. */
/* Measured off the artwork, not guessed: the topmost ink is the "Print Design"
   cap at y 190, the lowest the descenders of "profession for 4 years" at 849,
   and the paper spans x 48 (the lilac scrap) to 690 (the Ux/Ui pad). Plus a
   margin, so nothing sits against the edge of the frame. */
const CONTENT: View = { x: 22, y: 164, w: 694, h: 711 }
const REST_VIEW: View = CONTENT
const REST_OFFSETS: Vec[] = Array.from({ length: 6 }, () => ({ x: 0, y: 0 }))

/** Pins pierce paper: these move with the sheet they hold, by index into PINS. */
const PAPER_PINS: number[][] = [[], [], [4], [2], [3], [5]]

const PINS: { x: number; y: number; r: number; tone: "red" | "blue" }[] = [
  { x: 158, y: 406, r: 11, tone: "red" },
  { x: 104, y: 600, r: 10, tone: "red" },
  { x: 236, y: 478, r: 11, tone: "red" },
  { x: 553, y: 345, r: 11, tone: "red" },
  { x: 128, y: 618, r: 11, tone: "blue" },
  { x: 628, y: 468, r: 11, tone: "blue" },
]

/** How far in you can go. 1 is the whole sheet. */
const MIN_ZOOM = 0.3

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** How long a displaced thing takes to get back, in ms. Eased out, so it leaves
 *  quickly and arrives gently — and it genuinely arrives, which an exponential
 *  decay never does: that has an infinite tail and was still a visible distance
 *  out after six seconds. */
const RETURN_MS = 2600

const easeHome = (p: number) => 1 - Math.pow(1 - p, 3)

/** Positions `p` of the way from where they were let go back to where they were
 *  drawn. Interpolating from a snapshot rather than easing the live value each
 *  frame makes the journey depend only on elapsed time, so a slow frame or a
 *  backgrounded tab changes nothing about how long it takes. */
function lerpHome<T extends Vec>(from: T[], rest: T[], p: number): T[] {
  return from.map((v, i) => ({ ...v, x: v.x + (rest[i].x - v.x) * p, y: v.y + (rest[i].y - v.y) * p }))
}

/** Has anything strayed far enough from where it was drawn to be worth moving? */
function astray(cur: Vec[], rest: Vec[]) {
  return cur.some((v, i) => Math.abs(v.x - rest[i].x) > 0.05 || Math.abs(v.y - rest[i].y) > 0.05)
}

/* The floss is two cubics between two pins each. Rather than re-deriving a
   curve when a pin moves — which loses the drawn shape — each control point is
   stored in the chord's own frame, as a fraction of the chord's length along it
   and across it. Re-projecting those onto a moved chord keeps the thread's
   exact resting curve and lets it stretch, swing and bend with its pins. */
type Frame = { u: number; v: number }

function frame(a: Vec, b: Vec, c: Vec): Frame {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const px = c.x - a.x
  const py = c.y - a.y
  return { u: (px * ux + py * uy) / len, v: (px * -uy + py * ux) / len }
}

const FLOSS = [
  { a: 0, b: 1, rest: [{ x: 120, y: 442 }, { x: 94, y: 500 }] },
  { a: 3, b: 5, rest: [{ x: 602, y: 351 }, { x: 646, y: 392 }] },
].map((f) => ({
  a: f.a,
  b: f.b,
  c1: frame(PINS[f.a], PINS[f.b], f.rest[0]),
  c2: frame(PINS[f.a], PINS[f.b], f.rest[1]),
}))

function flossPath(a: Vec, b: Vec, c1: Frame, c2: Frame) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const put = (f: Frame) =>
    a.x + (ux * f.u - uy * f.v) * len + " " + (a.y + (uy * f.u + ux * f.v) * len)
  return "M" + a.x + " " + a.y + "C" + put(c1) + " " + put(c2) + " " + b.x + " " + b.y
}

/** Zoom about a fixed point of the sheet, so what is under the cursor stays there. */
function zoomAbout(v: View, anchor: Vec, factor: number): View {
  const w = clamp(v.w * factor, W * MIN_ZOOM, W)
  const h = (w / W) * H
  const rx = (anchor.x - v.x) / v.w
  const ry = (anchor.y - v.y) / v.h
  return clampView({ x: anchor.x - rx * w, y: anchor.y - ry * h, w, h })
}

/** Keep the sheet covering the frame — you can look closer, never off the edge. */
function clampView(v: View): View {
  return {
    w: v.w,
    h: v.h,
    x: clamp(v.x, Math.min(0, W - v.w), Math.max(0, W - v.w)),
    y: clamp(v.y, Math.min(0, H - v.h), Math.max(0, H - v.h)),
  }
}

/* ------------------------------------------------------------------ hero */

export default function PinboardPortfolioHero({
  height = "100svh",
  minHeight = "620px",
  fit = "contain",
  name = "Trần Đức Đạt",
  interactive = false,
  className = "",
}: PinboardPortfolioHeroProps) {
  // Two heroes on one page would otherwise share filter ids, and the second
  // would repaint the first.
  const uid = "pph" + React.useId().replace(/[^a-zA-Z0-9]/g, "")
  const id = (n: string) => uid + "-" + n
  const u = (n: string) => "url(#" + uid + "-" + n + ")"

  /* ------------------------------------------------------------ handling */

  /* ------------------------------------------------------------ handling

     None of this is React state. The poster is ~680 SVG leaves under a dozen
     filters, and re-rendering it through React every frame runs at 3fps — so
     React draws the board once, at rest, and every drag and drift is written
     straight to the DOM. Once everything has settled the DOM is back to exactly
     what React rendered, so the two never disagree. */

  const svgRef = React.useRef<SVGSVGElement | null>(null)
  const offs = React.useRef(REST_OFFSETS.map((v) => ({ ...v })))
  const pins = React.useRef(PINS.map((v) => ({ ...v })))
  const view = React.useRef({ ...REST_VIEW })
  const nodes = React.useRef<{
    papers: SVGGElement[][]
    pins: SVGGElement[]
    floss: SVGPathElement[][]
  } | null>(null)
  const drag = React.useRef<{
    kind: "paper" | "pin"
    i: number
    m: DOMMatrix | null
    from: Vec
    offs: Vec[]
    pins: Vec[]
  } | null>(null)
  const live = React.useRef(new Map<number, Vec>())
  const pinching = React.useRef<{ dist: number } | null>(null)

  /* Screen pixels reach the sheet through the SVG's own matrix, so the fit, the
     letterboxing and the current zoom are the browser's arithmetic rather than
     ours. Frozen at grab time: re-reading it mid-gesture would measure against a
     view the gesture is itself changing. */
  const sheetAt = (m: DOMMatrix | null, cx: number, cy: number): Vec =>
    m ? new DOMPoint(cx, cy).matrixTransform(m) : { x: 0, y: 0 }

  const inverse = () => svgRef.current?.getScreenCTM()?.inverse() ?? null

  /** Last value written to each attribute, so an unchanged one is never touched. */
  const painted = React.useRef(new Map<string, string>())

  /* Write the current positions onto the DOM. The only thing that moves anything.
     Every write is guarded: setAttribute invalidates whatever it touches even
     when the value is identical, and re-setting the root viewBox invalidates the
     whole SVG — ~680 leaves and a dozen filters. Writing all of it every frame
     cost ~300ms a frame; writing only what moved costs nothing for the parts
     standing still. */
  const paint = () => {
    const n = nodes.current
    if (!n) return
    const seen = painted.current
    const put = (el: Element, name: string, key: string, value: string) => {
      if (seen.get(key) === value) return
      seen.set(key, value)
      el.setAttribute(name, value)
    }
    n.papers.forEach((els, i) => {
      const o = offs.current[i]
      els.forEach((el, k) => {
        const d = el.dataset
        const t = "translate(" + (+d.rx! + o.x) + " " + (+d.ry! + o.y) + ") rotate(" + d.rot + ")"
        put(el, "transform", "p" + i + "." + k, t)
      })
    })
    n.pins.forEach((el, i) => {
      const q = pins.current[i]
      put(el, "transform", "n" + i, "translate(" + (q.x - PINS[i].x) + " " + (q.y - PINS[i].y) + ")")
    })
    n.floss.forEach((els, j) => {
      const f = FLOSS[j]
      const d = flossPath(pins.current[f.a], pins.current[f.b], f.c1, f.c2)
      els.forEach((el, k) => put(el, "d", "f" + j + "." + k, d))
    })
    const v = view.current
    const svg = svgRef.current
    if (svg) put(svg, "viewBox", "view", v.x + " " + v.y + " " + v.w + " " + v.h)
  }

  React.useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const all = (sel: string) => [...svg.querySelectorAll<SVGGElement>(sel)]
    nodes.current = {
      papers: REST_OFFSETS.map((_, i) => all('[data-paper="' + i + '"]')),
      pins: PINS.map((_, i) => svg.querySelector<SVGGElement>('[data-pin="' + i + '"]')!),
      floss: FLOSS.map((_, j) => [...svg.querySelectorAll<SVGPathElement>('[data-floss="' + j + '"]')]),
    }
  }, [])

  const start = (kind: "paper" | "pin", i: number, e: React.PointerEvent) => {
    const m = inverse()
    try {
      svgRef.current?.setPointerCapture(e.pointerId)
    } catch {
      /* capture is a nicety; the move handler works without it */
    }
    svgRef.current?.setAttribute("data-grab", "1")
    drag.current = {
      kind,
      i,
      m,
      from: sheetAt(m, e.clientX, e.clientY),
      offs: offs.current.map((v) => ({ ...v })),
      pins: pins.current.map((v) => ({ ...v })),
    }
  }

  /** Grab a sheet of paper, or a pin. Stops the wall underneath from seeing it. */
  const hold = (kind: "paper" | "pin", i: number) =>
    interactive
      ? {
          className: "pph-grab",
          onPointerDown: (e: React.PointerEvent) => {
            if (e.button !== 0) return
            e.stopPropagation()
            live.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
            if (live.current.size > 1) return
            start(kind, i, e)
          },
        }
      : {}

  /* The wall is not a handle — only the paper and the pins are. This tracks
     pointers so a two-finger pinch still reads, and starts nothing. */
  const onPointerDown = (e: React.PointerEvent) => {
    if (!interactive || e.button !== 0) return
    live.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (live.current.size > 1) drag.current = null
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!interactive) return
    if (live.current.has(e.pointerId)) live.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (live.current.size >= 2) {
      const [p1, p2] = [...live.current.values()]
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y) || 1
      const m = inverse()
      const mid = sheetAt(m, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2)
      if (!pinching.current) {
        pinching.current = { dist }
        return
      }
      const ratio = pinching.current.dist / dist
      pinching.current = { dist }
      view.current = zoomAbout(view.current, mid, ratio)
      paint()
      return
    }

    const d = drag.current
    if (!d) return
    const here = sheetAt(d.m, e.clientX, e.clientY)
    const dx = here.x - d.from.x
    const dy = here.y - d.from.y

    if (d.kind === "paper") {
      offs.current[d.i] = { x: d.offs[d.i].x + dx, y: d.offs[d.i].y + dy }
      for (const k of PAPER_PINS[d.i]) {
        pins.current[k] = { ...pins.current[k], x: d.pins[k].x + dx, y: d.pins[k].y + dy }
      }
    } else {
      pins.current[d.i] = { ...pins.current[d.i], x: d.pins[d.i].x + dx, y: d.pins[d.i].y + dy }
    }
    paint()
  }

  const onPointerUp = (e: React.PointerEvent) => {
    live.current.delete(e.pointerId)
    if (live.current.size < 2) pinching.current = null
    drag.current = null
    svgRef.current?.setAttribute("data-grab", "0")
    try {
      if (svgRef.current?.hasPointerCapture(e.pointerId)) svgRef.current.releasePointerCapture(e.pointerId)
    } catch {
      /* already gone */
    }
  }

  /* Nothing stays where you leave it. Every frame each displaced paper and pin
     takes the same fraction of its remaining distance home — a slow start, a
     long tail and no fixed duration, so a sheet shoved across the wall takes its
     time while a nudged one is back almost at once.

     dt is real elapsed time, so the drift runs at one speed whatever the frame
     rate; the cap only stops a backgrounded tab from teleporting on its first
     frame back. */
  React.useEffect(() => {
    if (!interactive) return
    const drifts = !matchMedia("(prefers-reduced-motion: reduce)").matches
    let raf = 0
    let from: { offs: Vec[]; pins: typeof PINS; t: number } | null = null
    let clean = true
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      if (drag.current) {
        from = null
        clean = false
        return
      }
      if (!astray(offs.current, REST_OFFSETS) && !astray(pins.current, PINS)) {
        from = null
        // Land exactly, once. Stopping at "near enough" leaves a fractional
        // residue in the DOM forever; this is the only frame that writes it.
        if (!clean) {
          offs.current = REST_OFFSETS.map((v) => ({ ...v }))
          pins.current = PINS.map((v) => ({ ...v }))
          paint()
          clean = true
        }
        return
      }
      clean = false
      if (!from) {
        from = {
          offs: offs.current.map((v) => ({ ...v })),
          pins: pins.current.map((v) => ({ ...v })),
          t: now,
        }
      }
      const p = drifts ? easeHome(Math.min(1, (now - from.t) / RETURN_MS)) : 1
      if (p >= 1) {
        offs.current = REST_OFFSETS.map((v) => ({ ...v }))
        pins.current = PINS.map((v) => ({ ...v }))
        from = null
      } else {
        offs.current = lerpHome(from.offs, REST_OFFSETS, p)
        pins.current = lerpHome(from.pins, PINS, p)
      }
      paint()
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [interactive])

  /** Put the board back the way it was drawn, at once. */
  const reset = () => {
    if (!interactive) return
    offs.current = REST_OFFSETS.map((v) => ({ ...v }))
    pins.current = PINS.map((v) => ({ ...v }))
    view.current = { ...REST_VIEW }
    paint()
  }

  /* Wheel is the page's, not ours. A hero that swallows it traps the reader
     against the poster, so zoom takes the modifier every map and canvas app
     already uses. React's own wheel listener is passive, so preventDefault has
     to come from a native one. */
  React.useEffect(() => {
    const svg = svgRef.current
    if (!interactive || !svg) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const m = svg.getScreenCTM()
      if (!m) return
      const a = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
      view.current = zoomAbout(view.current, a, Math.exp(e.deltaY * 0.0016))
      paint()
    }
    svg.addEventListener("wheel", onWheel, { passive: false })
    return () => svg.removeEventListener("wheel", onWheel)
  }, [interactive])

  /** A sheet of paper: where it was drawn, plus the handles that move it. */
  const paper = (i: number, x: number, y: number, rot: number) => ({
    "data-paper": i,
    "data-rx": x,
    "data-ry": y,
    "data-rot": rot,
    transform: "translate(" + x + " " + y + ") rotate(" + rot + ")",
    ...hold("paper", i),
  })


  // The slip is 96 wide. Measure the hand rather than forcing each word into a
  // fixed box, so a longer name stays centred instead of overrunning the paper.
  const nameParts = React.useMemo(() => {
    const words = name.trim().split(/\s+/)
    const given = words.length > 1 ? words.slice(0, -1).join(" ") : ""
    const last = words.length > 1 ? words[words.length - 1] : name.trim()
    const s = 13 / 64
    const gap = given ? 7 : 0
    const gw = given ? writeLine(given).width * s : 0
    const lw = writeLine(last).width * s

    const fit = Math.min(1, 88 / Math.max(gw + gap + lw, 1))
    const x = (-(gw + gap + lw) * fit) / 2
    return { given, last, x, lastX: x + (gw + gap) * fit, gw: gw * fit, lw: lw * fit }
  }, [name])

  /** One line in the drawn hand, set on its baseline at (x, y). */
  const hand = (
    t: string,
    x: number,
    y: number,
    cap: number,
    width: number | undefined,
    weight: number,
    color: string,
    seed: number,
  ) => {
    const line = writeLine(t, seed)
    const nominal = cap / 64
    const s =
      width === undefined
        ? nominal
        : Math.min(Math.max(width / line.width, nominal * 0.84), nominal * 1.16)
    return (
      <g
        transform={"translate(" + x + " " + y + ") scale(" + s + ") skewX(-11)"}
        stroke={color}
        strokeWidth={weight}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {line.strokes.map((st, i) => (
          <path
            key={i}
            d={st.d}
            transform={"translate(" + st.x + " " + st.dy + ") rotate(" + st.rot + ")"}
          />
        ))}
      </g>
    )
  }

  /** A stack of lines in the drawn hand — the body copy on a pinned slip. */
  const handBlock = (lines: string[], x: number, y: number, lh: number, cap: number, seed: number) =>
    lines.map((t, i) => (
      <g key={i}>{hand(t, x, y + i * lh, cap, undefined, 7.5, "#5c584f", seed + i)}</g>
    ))

  /** A glossy pin head, lit from the upper left, sitting on its own shadow. */
  const pin = (x: number, y: number, r: number, tone: "red" | "blue") => (
    <g>
      <ellipse cx={x + r * 0.45} cy={y + r * 0.95} rx={r * 1.05} ry={r * 0.48} fill="#000" opacity="0.32" filter={u("soft")} />
      <circle cx={x} cy={y} r={r} fill={u("pin" + tone)} />
      <circle cx={x} cy={y} r={r - 0.6} fill="none" stroke="#000" strokeOpacity="0.32" strokeWidth={r * 0.13} />
      <ellipse
        cx={x - r * 0.33}
        cy={y - r * 0.39}
        rx={r * 0.3}
        ry={r * 0.18}
        fill="#fff"
        opacity="0.92"
        transform={"rotate(-34 " + (x - r * 0.33) + " " + (y - r * 0.39) + ")"}
      />
      <ellipse
        cx={x + r * 0.3}
        cy={y + r * 0.44}
        rx={r * 0.34}
        ry={r * 0.19}
        fill="#fff"
        opacity="0.14"
        transform={"rotate(-34 " + (x + r * 0.3) + " " + (y + r * 0.44) + ")"}
      />
    </g>
  )

  /** A hand-drawn arrowhead: two strokes meeting at the point, never a glyph. */
  const head = (px: number, py: number, dx: number, dy: number, len: number, w: number) => {
    const m = Math.hypot(dx, dy) || 1
    const bx = -dx / m
    const by = -dy / m
    const c = Math.cos(0.5)
    const s = Math.sin(0.5)
    return (
      <g stroke="#3a3a3a" strokeWidth={w} strokeLinecap="round" fill="none">
        <path d={"M" + px + " " + py + "L" + (px + (bx * c - by * s) * len) + " " + (py + (bx * s + by * c) * len)} />
        <path d={"M" + px + " " + py + "L" + (px + (bx * c + by * s) * len) + " " + (py + (-bx * s + by * c) * len)} />
      </g>
    )
  }

  return (
    <section className={"pph-root " + className} style={{ height, minHeight }}>
      <style>{CSS}</style>
      <div className="pph-sr">
        <h1>Portfolio — {name}</h1>
        <p>Print design: magazines, books, covers, calendars, product boxes, Posm.</p>
        <p>Communication design: design poster, banner, social media post, brochure, flyer, infographic.</p>
        <p>Ux/Ui design: design app, website, landing page, UX wireframe.</p>
        <p>About me: I have been in this profession for 4 years.</p>
      </div>

      <div className="pph-l pph-wall" />
      <div className="pph-l pph-wall2" />

      {/* Board tooth. Fibre with the grain first, then the fine speckle that
          keeps the wall from reading as a gradient. */}
      <svg className="pph-l pph-tex" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <filter id={id("fibre")} x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.011 0.46" numOctaves="3" seed="5" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0" intercept="1" />
              <feFuncR type="linear" slope="0.4" intercept="0.3" />
              <feFuncG type="linear" slope="0.4" intercept="0.3" />
              <feFuncB type="linear" slope="0.4" intercept="0.3" />
            </feComponentTransfer>
          </filter>
          <filter id={id("grain")} x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.78" numOctaves="4" seed="17" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0" intercept="1" />
            </feComponentTransfer>
          </filter>
        </defs>
        <rect width="100%" height="100%" filter={u("fibre")} />
        <rect width="100%" height="100%" filter={u("grain")} opacity="0.5" />
      </svg>

      <svg
        ref={svgRef}
        className={"pph-l" + (interactive ? " pph-play" : "")}
        viewBox={REST_VIEW.x + " " + REST_VIEW.y + " " + REST_VIEW.w + " " + REST_VIEW.h}
        preserveAspectRatio={fit === "cover" ? "xMidYMid slice" : "xMidYMid meet"}
        aria-hidden="true"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={reset}
      >
        <defs>
          {/* Stamped ink. The shape is warped twice — coarse for the ragged
              outline, fine for edge chatter — then bitten by a noise mask kept
              deliberately steep: a shallow ramp turns solids into dither, and
              the poster's letters are solid with flecks, not grey. */}
          <filter id={id("ink")} x="-9%" y="-9%" width="118%" height="118%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.013 0.02" numOctaves="2" seed="3" result="w1" />
            <feDisplacementMap in="SourceGraphic" in2="w1" scale="5" xChannelSelector="R" yChannelSelector="G" result="r1" />
            <feTurbulence type="fractalNoise" baseFrequency="0.085 0.13" numOctaves="3" seed="12" result="w2" />
            <feDisplacementMap in="r1" in2="w2" scale="3.4" xChannelSelector="R" yChannelSelector="G" result="r2" />
            <feTurbulence type="fractalNoise" baseFrequency="0.09 0.2" numOctaves="3" seed="21" result="sp" />
            <feColorMatrix in="sp" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 24 0 0 0 -4.4" result="spa" />
            <feComposite in="r2" in2="spa" operator="in" result="bitten" />
            <feTurbulence type="fractalNoise" baseFrequency="0.18 0.34" numOctaves="3" seed="31" result="fine" />
            <feColorMatrix in="fine" type="matrix" values="0 0 0 0 0.76 0 0 0 0 0.76 0 0 0 0 0.76 14 0 0 0 -10.2" result="finea" />
            <feComposite in="finea" in2="bitten" operator="in" result="dust" />
            <feMerge>
              <feMergeNode in="bitten" />
              <feMergeNode in="dust" />
            </feMerge>
          </filter>

          {/* The same press run lighter, for the portraits. */}
          <filter id={id("ink2")} x="-9%" y="-9%" width="118%" height="118%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.028 0.038" numOctaves="2" seed="8" result="w1" />
            <feDisplacementMap in="SourceGraphic" in2="w1" scale="2.4" xChannelSelector="R" yChannelSelector="G" result="r1" />
            <feTurbulence type="fractalNoise" baseFrequency="0.14 0.19" numOctaves="2" seed="14" result="sp" />
            <feColorMatrix in="sp" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 26 0 0 0 -3.1" result="spa" />
            <feComposite in="r1" in2="spa" operator="in" />
          </filter>

          {/* Just enough tremor to keep the drawn hand off the ruler. */}
          <filter id={id("nib")} x="-12%" y="-12%" width="124%" height="124%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="19" result="w" />
            <feDisplacementMap in="SourceGraphic" in2="w" scale="1.6" xChannelSelector="R" yChannelSelector="G" />
          </filter>

          {/* Embroidery floss: a wobble, plus the nap that keeps it off-flat. */}
          <filter id={id("floss")} x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.9 0.12" numOctaves="2" seed="6" result="w" />
            <feDisplacementMap in="SourceGraphic" in2="w" scale="2.4" xChannelSelector="R" yChannelSelector="G" />
          </filter>

          <pattern id={id("halftone")} patternUnits="userSpaceOnUse" width="2.5" height="2.5">
            <circle cx="1.25" cy="1.25" r="0.85" fill="#1c1a17" />
          </pattern>

          <filter id={id("smudge")} x="-40%" y="-40%" width="180%" height="180%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="41" result="w" />
            <feDisplacementMap in="SourceGraphic" in2="w" scale="70" xChannelSelector="R" yChannelSelector="G" />
            <feGaussianBlur stdDeviation="9" />
          </filter>
          <filter id={id("soft")} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2.6" />
          </filter>
          <filter id={id("beamBlur")} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
          <filter id={id("paperDrop")} x="-30%" y="-25%" width="165%" height="172%">
            <feDropShadow dx="2.2" dy="4.4" stdDeviation="3.2" floodColor="#000" floodOpacity="0.42" />
          </filter>
          <filter id={id("slipDrop")} x="-30%" y="-25%" width="165%" height="175%">
            <feDropShadow dx="1.6" dy="3" stdDeviation="2.2" floodColor="#000" floodOpacity="0.36" />
          </filter>

          <linearGradient id={id("beamCone")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.88" />
            <stop offset="0.42" stopColor="#fff" stopOpacity="0.26" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={id("beamCore")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
            <stop offset="0.34" stopColor="#fff" stopOpacity="0.34" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <radialGradient id={id("beamGlow")} cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
            <stop offset="0.52" stopColor="#fff" stopOpacity="0.3" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>

          <radialGradient id={id("pinred")} cx="34%" cy="28%" r="74%">
            <stop offset="0" stopColor="#ff9a90" />
            <stop offset="0.34" stopColor="#e8352c" />
            <stop offset="0.8" stopColor="#a5100e" />
            <stop offset="1" stopColor="#630504" />
          </radialGradient>
          <radialGradient id={id("pinblue")} cx="34%" cy="28%" r="74%">
            <stop offset="0" stopColor="#93a9ff" />
            <stop offset="0.34" stopColor="#2f3fbb" />
            <stop offset="0.8" stopColor="#131c6c" />
            <stop offset="1" stopColor="#070b33" />
          </radialGradient>
          <linearGradient id={id("yellow")} x1="0" y1="0" x2="0.35" y2="1">
            <stop offset="0" stopColor="#fdf2a8" />
            <stop offset="0.62" stopColor="#f5e184" />
            <stop offset="1" stopColor="#e6cd60" />
          </linearGradient>
          <linearGradient id={id("white")} x1="0" y1="0" x2="0.3" y2="1">
            <stop offset="0" stopColor="#fdfcf8" />
            <stop offset="1" stopColor="#e4e1d6" />
          </linearGradient>
          <linearGradient id={id("lilac")} x1="0" y1="0" x2="0.3" y2="1">
            <stop offset="0" stopColor="#dccdf1" />
            <stop offset="1" stopColor="#bda6dc" />
          </linearGradient>
          <linearGradient id={id("tape")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.4" />
            <stop offset="0.45" stopColor="#fff" stopOpacity="0.14" />
            <stop offset="1" stopColor="#fff" stopOpacity="0.36" />
          </linearGradient>

          <linearGradient id={id("gridFade")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.16" stopColor="#fff" stopOpacity="0.9" />
            <stop offset="0.64" stopColor="#fff" stopOpacity="0.72" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <clipPath id={id("face1")}>
            <path d="M302 486C302 460 317 444 342 444C367 444 382 460 382 487C382 509 381 526 377 541C373 558 360 573 342 573C324 573 311 558 307 541C303 526 302 504 302 486Z" />
          </clipPath>
          <clipPath id={id("face2")}>
            <path d="M456 630C456 607 472 593 498 593C524 593 540 607 540 630C540 652 538 669 531 682C524 694 510 700 498 700C486 700 472 694 465 682C458 669 456 652 456 630Z" />
          </clipPath>
          <mask id={id("gridMask")}>
            <rect x="166" y="205" width="463" height="464" fill={u("gridFade")} />
          </mask>
        </defs>

        {/* The lamp, hung just above the sheet. */}
        <g style={{ mixBlendMode: "screen" }}>
          <ellipse cx="367" cy="-58" rx="196" ry="168" fill={u("beamGlow")} />
          <path d="M303 -12L431 -12L503 316L231 316Z" fill={u("beamCone")} filter={u("beamBlur")} opacity="0.92" />
          <path d="M322 -12L412 -12L452 214L282 214Z" fill={u("beamCore")} filter={u("beamBlur")} opacity="0.8" />
        </g>

        {/* Scuffs the board came with. */}
        <g fill="#54565a" opacity="0.17" filter={u("smudge")}>
          <ellipse cx="96" cy="286" rx="52" ry="96" transform="rotate(-14 96 286)" />
          <ellipse cx="132" cy="196" rx="34" ry="24" transform="rotate(-22 132 196)" />
          <ellipse cx="642" cy="742" rx="46" ry="70" transform="rotate(12 642 742)" />
        </g>

        {/* Pencilled setting-out grid, fading at both ends. */}
        <g mask={u("gridMask")} stroke="#fff" strokeOpacity="0.5" strokeWidth="1">
          {Array.from({ length: 7 }, (_, i) => (
            <line key={"v" + i} x1={166 + i * 77.17} y1="205" x2={166 + i * 77.17} y2="669" />
          ))}
          {Array.from({ length: 7 }, (_, i) => (
            <line key={"h" + i} x1="166" y1={205 + i * 77.33} x2="629" y2={205 + i * 77.33} />
          ))}
        </g>

        {/* Register marks: the centre line and the measure above the lockup. */}
        <line x1="411" y1="343" x2="411" y2="692" stroke="#1f1f1f" strokeOpacity="0.42" strokeWidth="1.1" />
        <g stroke="#2a2a2a" strokeOpacity="0.8" strokeWidth="1.6" strokeLinecap="round" fill="none" filter={u("nib")}>
          <path d="M247 379L338 376" strokeDasharray="9 6" />
          <path d="M247 371L247 387" />
          <path d="M240 378L250 374" />
          <path d="M240 378L250 382" />
        </g>

        {/* PORT */}
        <g filter={u("ink")} fill="#131313">
          <g transform={"translate(" + TOP_X + " " + TOP_Y + ") scale(" + TOP_S + ")"}>
            {TOP.glyphs.map((g, i) => (
              <path key={i} d={g.d} fillRule="evenodd" transform={"translate(" + g.x + " 0)"} />
            ))}
          </g>
        </g>

        {/* The reader in the O — printed over the letters, which is why he
            reads against the solids rather than behind them. */}
        <g filter={u("ink2")}>
          <path
            d="M302 486C302 460 317 444 342 444C367 444 382 460 382 487C382 509 381 526 377 541C373 558 360 573 342 573C324 573 311 558 307 541C303 526 302 504 302 486Z"
            fill="#d8d5cf"
          />
          <g clipPath={u("face1")}>
            <rect x="298" y="438" width="90" height="140" fill={u("halftone")} opacity="0.13" />
            <path d="M300 470C316 462 340 458 362 462C378 465 384 472 386 482L384 496C378 482 366 474 348 471C328 468 310 472 300 482Z" fill="#1c1a17" opacity="0.2" />
            <path d="M302 508C307 536 317 558 334 568C320 574 307 560 303 542Z" fill="#1c1a17" opacity="0.22" />
            <path d="M381 506C377 534 367 558 351 568C364 572 377 559 381 542Z" fill="#1c1a17" opacity="0.16" />
            <path d="M337 528C341 540 344 549 348 554C342 557 336 552 334 542Z" fill="#1c1a17" opacity="0.17" />
          </g>
          <g fill="#131313">
            <path d="M292 524C289 504 287 478 294 462C302 446 319 437 342 436C365 435 384 444 391 460C398 476 396 504 393 524L392 537L379 535C382 516 382 500 379 489C375 476 366 469 353 467C339 465 327 470 319 480C311 489 306 502 304 516L302 537L292 537Z" />
            <path d="M303 512C306 492 317 477 333 471C345 466 358 468 367 475C352 472 339 477 330 487C321 496 314 505 309 518Z" />

            <path d="M311 450L316 441L325 449Z" />
            <path d="M333 442L343 431L353 442Z" />
            <path d="M359 447L370 438L377 451Z" />
            <path d="M383 464L391 459L393 470Z" />
            <path d="M296 480L291 466L301 468Z" />
          </g>
          <g fill="none" stroke="#131313" strokeLinecap="round">
            <path d="M305 487C313 482 326 480 335 484" strokeWidth="3.4" />
            <path d="M351 484C360 480 373 482 381 487" strokeWidth="3.4" />
            <circle cx="320" cy="509" r="19.5" fill="#d8d5cf" strokeWidth="4.8" />
            <circle cx="367" cy="509" r="19.5" fill="#d8d5cf" strokeWidth="4.8" />
            <path d="M340 506L347 506" strokeWidth="3.8" />
            <path d="M301 504L288 498" strokeWidth="4" />
            <path d="M387 504L399 498" strokeWidth="4" />
          </g>
          <g fill="#131313">
            <path d="M313 510C316 505 325 505 328 510C325 515 316 515 313 510Z" />
            <path d="M360 510C363 505 372 505 375 510C372 515 363 515 360 510Z" />
          </g>
          <g fill="#f4f3f0" opacity="0.8">
            <circle cx="318" cy="508" r="1.3" />
            <circle cx="365" cy="508" r="1.3" />
          </g>
          <path d="M344 530C342 542 339 550 334 555" fill="none" stroke="#131313" strokeOpacity="0.55" strokeWidth="2.4" strokeLinecap="round" />
        </g>

        {/* FOLIO, mirrored on its baseline. */}
        <g filter={u("ink")} fill="#131313">
          <g transform={"translate(" + BOT_X + " " + BOT_BASE + ") scale(" + BOT_S + " " + -BOT_S + ")"}>
            {BOTTOM.glyphs.map((g, i) => (
              <path key={i} d={g.d} fillRule="evenodd" transform={"translate(" + g.x + " 0)"} />
            ))}
          </g>
        </g>

        {/* The second face, breaking out over the bottom line. */}
        <g filter={u("ink2")}>
          <path
            d="M456 630C456 607 472 593 498 593C524 593 540 607 540 630C540 652 538 669 531 682C524 694 510 700 498 700C486 700 472 694 465 682C458 669 456 652 456 630Z"
            fill="#d8d5cf"
          />
          <g clipPath={u("face2")}>
            <rect x="452" y="588" width="92" height="116" fill={u("halftone")} opacity="0.13" />
            <path d="M458 616C472 606 490 601 508 603C524 605 534 612 538 622L536 634C530 620 518 612 502 610C484 608 468 613 458 624Z" fill="#1c1a17" opacity="0.22" />
            <path d="M457 646C462 670 472 687 487 694C474 698 462 687 458 671Z" fill="#1c1a17" opacity="0.24" />
            <path d="M539 644C535 670 525 687 510 694C523 697 535 685 539 670Z" fill="#1c1a17" opacity="0.16" />
            <path d="M494 668C497 678 500 684 504 688C498 691 492 686 491 678Z" fill="#1c1a17" opacity="0.18" />
          </g>
          <g fill="#131313">
            <path d="M453 642C446 616 450 594 464 582C478 570 500 566 517 572C533 578 545 592 549 609L552 636L537 626L533 609C528 596 516 589 501 590C486 591 473 600 467 614L462 644Z" />
            <path d="M461 590L463 568L480 583Z" />
            <path d="M484 578L494 554L509 575Z" />
            <path d="M513 577L532 562L538 585Z" />
            <path d="M538 596L552 590L553 606Z" />
            <path d="M470 643C478 638 490 636 498 637L498 642C490 642 480 644 472 647Z" />
            <path d="M503 637C511 636 522 638 530 643L529 647C521 644 511 642 503 642Z" />
          </g>
          <g fill="#d8d5cf" stroke="#131313" strokeWidth="1.9">
            <path d="M475 660C478 655 487 655 490 660C487 665 478 665 475 660Z" />
            <path d="M511 660C514 655 523 655 526 660C523 665 514 665 511 660Z" />
          </g>
          <g fill="#131313">
            <circle cx="482" cy="660" r="2.4" />
            <circle cx="518" cy="660" r="2.4" />
          </g>
          <path d="M501 667L499 682L506 684" fill="none" stroke="#131313" strokeOpacity="0.8" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </g>

        {/* Two strips of tape, gone matte where the light hits them. */}
        {[
          { x: 425, y: 412, w: 58, h: 22, r: -10 },
          { x: 268, y: 637, w: 62, h: 22, r: -8 },
        ].map((t, i) => (
          <g key={i} transform={"translate(" + t.x + " " + t.y + ") rotate(" + t.r + ")"}>
            <rect x={-t.w / 2} y={-t.h / 2} width={t.w} height={t.h} fill={u("tape")} opacity="0.22" />
            <g stroke="#fff" strokeOpacity="0.22" strokeWidth="0.8">
              <line x1={-t.w / 2} y1={-t.h / 2} x2={t.w / 2} y2={-t.h / 2} />
              <line x1={-t.w / 2} y1={t.h / 2} x2={t.w / 2} y2={t.h / 2} />
            </g>
            <g stroke="#000" strokeOpacity="0.08" strokeWidth="0.8">
              <line x1={-t.w / 2} y1={-t.h / 2 + 1.2} x2={t.w / 2} y2={-t.h / 2 + 1.2} />
              <line x1={-t.w / 2} y1={t.h / 2 - 1.2} x2={t.w / 2} y2={t.h / 2 - 1.2} />
            </g>
          </g>
        ))}

        {/* Floss, run before the paper so its ends tuck under the slips. */}
        <g filter={u("floss")} fill="none" strokeLinecap="round">
          {[
            { c: "#000", o: 0.28, w: 5.4, t: "translate(1.5 3)" },
            { c: "#bf1f1e", o: 1, w: 4.2, t: undefined },
            { c: "#f07a72", o: 0.5, w: 1.2, t: "translate(-0.8 -1.2)" },
          ].map((pass, k) => (
            <g key={k} stroke={pass.c} strokeOpacity={pass.o} strokeWidth={pass.w} transform={pass.t}>
              {FLOSS.map((f, j) => (
                <path key={j} data-floss={j} d={flossPath(PINS[f.a], PINS[f.b], f.c1, f.c2)} />
              ))}
            </g>
          ))}
        </g>

        {/* ------------------------------------------------------- the paper */}

        {/* Lilac scrap, bottom left, mostly buried. */}
        <g {...paper(0, 74, 678, -12)} filter={u("slipDrop")}>
          <rect x="-26" y="-18" width="52" height="36" fill={u("lilac")} />
          <g stroke="#8f79b4" strokeOpacity="0.45" strokeWidth="0.7">
            <line x1="-20" y1="-6" x2="20" y2="-6" />
            <line x1="-20" y1="2" x2="20" y2="2" />
            <line x1="-20" y1="10" x2="14" y2="10" />
          </g>
        </g>

        {/* The scrap of body copy that landed under the big slip. */}
        <g {...paper(1, 104, 688, -7)} filter={u("slipDrop")}>
          <rect x="-40" y="-18" width="80" height="36" fill={u("white")} />
          {handBlock(COMMS_NOTE, -34, -6, 7.5, 4.6, 91)}
        </g>

        {/* "Print Design" slip. */}
        <g {...paper(2, 130, 654, -5)} filter={u("paperDrop")}>
          <rect x="-48" y="-37" width="96" height="74" fill={u("white")} />
          <g stroke="#a8bcd8" strokeOpacity="0.4" strokeWidth="0.6">
            {[-10, -1, 8, 17, 26].map((y) => (
              <line key={y} x1="-40" y1={y} x2="40" y2={y} />
            ))}
          </g>
          {hand("Print Design", -40, -16, 11, 58, 7.5, "#3c3a35", 11)}
          {handBlock(PRINT_NOTE, -40, -2, 9, 5.6, 21)}
        </g>

        {/* "Communication" note. */}
        <g {...paper(3, 231, 531, -7)} filter={u("paperDrop")}>
          <rect x="-46" y="-31" width="92" height="62" fill={u("yellow")} />
          <path d="M46 20L46 31L33 31Z" fill="#d6bf58" />
          {hand("Communication", -34, -6, 9.5, 68, 7.5, "#3c3a35", 31)}
          {handBlock(COMMS_NOTE, -38, 7, 8, 4.8, 41)}
        </g>

        {/* Name slip, and the sheet it was torn off. */}
        <g {...paper(4, 546, 370, -8)} filter={u("slipDrop")}>
          <rect x="-47" y="-19" width="94" height="38" fill={u("white")} />
        </g>
        <g {...paper(4, 550, 373, -4)} filter={u("paperDrop")}>
          <rect x="-48" y="-20" width="96" height="40" fill={u("white")} />
          <g stroke="#a8bcd8" strokeOpacity="0.35" strokeWidth="0.6">
            <line x1="-40" y1="-9" x2="40" y2="-9" />
            <line x1="-40" y1="9" x2="40" y2="9" />
          </g>
          {nameParts.given ? hand(nameParts.given, nameParts.x, 4, 13, nameParts.gw, 7.5, "#3c3a35", 51) : null}
          {hand(nameParts.last, nameParts.lastX, 4, 13, nameParts.lw, 8.2, "#c8151c", 61)}
        </g>

        {/* "Ux/Ui Design" pad, torn off the spiral. */}
        <g {...paper(5, 634, 511, -1)} filter={u("paperDrop")}>
          <rect x="-56" y="-46" width="112" height="92" fill={u("yellow")} />
          <rect x="-56" y="-46" width="112" height="13" fill="#efdb78" />
          <line x1="-56" y1="-33" x2="56" y2="-33" stroke="#d2ba55" strokeWidth="0.8" />
          <g fill="#38321f">
            {Array.from({ length: 9 }, (_, i) => (
              <circle key={i} cx={-44 + i * 11} cy="-39.5" r="2.4" />
            ))}
          </g>
          {hand("Ux/Ui Design", -44, -2, 10.5, 64, 7.5, "#3c3a35", 71)}
          {handBlock(UX_NOTE, -44, 12, 10, 5.8, 81)}
        </g>

        {PINS.map((q, i) => (
          <g key={i} data-pin={i} {...hold("pin", i)}>
            {/* A pin head is 11 units across — too small to catch on a phone. */}
            {interactive ? <circle cx={q.x} cy={q.y} r={q.r * 2.1} fill="transparent" /> : null}
            {pin(q.x, q.y, q.r, q.tone)}
          </g>
        ))}

        {/* --------------------------------------- hand-lettered on the wall */}
        <g filter={u("nib")}>
          {ANNOTATIONS.map((block, b) => (
            <g key={b} transform={"rotate(-2.4 " + block[0].x + " " + block[0].y + ")"}>
              {block.map((l, i) => (
                <g key={i}>
                  {hand(l.t, l.x, l.y, l.cap, l.w, l.bold ? 8.6 : 7, l.bold ? "#333333" : "#4a4a4a", b * 10 + i)}
                </g>
              ))}
            </g>
          ))}
        </g>

        {/* Arrows, drawn by the same hand as the labels. */}
        <g filter={u("nib")}>
          <g fill="none" stroke="#3a3a3a" strokeLinecap="round">
            <path d="M223 394C213 371 196 345 176 322" strokeWidth="3.2" />
            <path d="M338 740C324 761 306 777 287 791" strokeWidth="4.4" />
            <path d="M458 746C489 748 517 760 541 774" strokeWidth="3" strokeDasharray="10 7" />
          </g>
          {head(176, 322, -20, -23, 19, 3.2)}
          {head(287, 791, -19, 14, 21, 4.4)}
          {head(546, 777, 24, 14, 18, 3)}
        </g>
      </svg>

      {/* A last pass of tooth over everything, so the ink sits in the board
          instead of on top of it. */}
      <svg className="pph-l pph-tex2" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <filter id={id("mottle")} x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.16" numOctaves="5" seed="23" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0" intercept="1" />
              <feFuncR type="linear" slope="0.52" intercept="0.24" />
              <feFuncG type="linear" slope="0.52" intercept="0.24" />
              <feFuncB type="linear" slope="0.52" intercept="0.24" />
            </feComponentTransfer>
          </filter>
        </defs>
        <rect width="100%" height="100%" filter={u("mottle")} />
      </svg>

      <div className="pph-l pph-vig" />
    </section>
  )
}
