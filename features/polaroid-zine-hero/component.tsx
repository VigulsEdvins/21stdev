"use client"

import * as React from "react"

/* ------------------------------------------------------------------ types */

export type ZineSlide = {
  /** The script headline across the top of the print. */
  script: string
  /** Script continued over the print's lower edge, one entry per line. */
  tail?: string[]
  /** The typewritten slip taped to the top corner, one entry per line. */
  note?: string[]
  /** The justified typewritten column, one entry per line. Already broken. */
  body?: string[]
}

export type PolaroidZineHeroProps = {
  /**
   * Height of the hero. Must be a definite length — the page is fitted to this
   * box, so a percentage collapses to 0px unless every ancestor up to <html>
   * has a real height. Never pass `"100%"`.
   */
  height?: string
  /** Floor for the height, so the page stays readable on short viewports. */
  minHeight?: string
  /** Pages, in order. One slide hides the carousel controls entirely. */
  slides?: ZineSlide[]
  /**
   * Centre photograph. Omit it for the drawn stand-in — the default has to be
   * generated, because an external origin means no cover image (see README).
   */
  portrait?: string
  /** The five pinned snapshots. Any left out fall back to a drawn stand-in. */
  photos?: string[]
  /** Bottom-left credit line. */
  issue?: string
  /** Bottom-left handle, set beside the issue line. */
  handle?: string
  /** Fires when the page changes, by control or keyboard. */
  onSlideChange?: (index: number) => void
  className?: string
}

/* The page. Every coordinate in this file lives in this box — 4:5, the ratio
   the layout was drawn at. */
const W = 735
const H = 919

/* ------------------------------------------------------------------ script
   The headline is a handwritten script, and no script face is a safe system
   font: the usual stack resolves differently on every platform and falls back
   to a serif on the headless box that renders the cover image. So it is drawn —
   centre-line strokes on a baseline at y=0, x-height -34, cap -62, ascender
   -70, descender +22, stroked with a round pen and slanted at draw time. */

type Pen = { w: number; d: string }

const SCRIPT: Record<string, Pen> = {
  a: { w: 38, d: "M28 -26C22 -34 10 -34 5 -26C0 -18 2 -6 9 -2C16 2 25 -3 28 -11M29 -33L29 -7C29 -3 31 0 34 1" },
  b: { w: 36, d: "M8 -68C7 -48 5 -26 5 -12C5 -4 8 0 14 0C22 0 30 -8 31 -18C32 -26 27 -32 20 -31C14 -30 9 -25 6 -18" },
  c: { w: 34, d: "M29 -26C25 -33 14 -34 8 -27C2 -20 3 -8 10 -3C16 1 25 -1 30 -7" },
  d: { w: 38, d: "M31 -68L29 -8C29 -3 31 0 34 1M29 -25C25 -32 14 -34 8 -27C2 -20 3 -8 10 -3C17 1 26 -3 29 -11" },
  e: { w: 34, d: "M5 -16C12 -18 23 -22 29 -26C26 -32 15 -35 9 -28C3 -21 3 -8 11 -3C17 0 25 -2 30 -8" },
  f: { w: 30, d: "M11 2C13 -20 15 -44 18 -56C20 -66 26 -70 31 -67M4 -32L27 -34" },
  g: { w: 36, d: "M28 -26C23 -33 12 -34 7 -27C1 -20 3 -8 10 -4C16 -1 24 -4 27 -11M29 -33L26 6C25 16 18 22 9 20C5 19 2 16 1 13" },
  h: { w: 38, d: "M8 -68C7 -48 5 -26 5 0M5 -18C8 -26 15 -33 22 -32C27 -31 29 -27 28 -20L26 0" },
  i: { w: 20, d: "M10 -34L8 0M11 -47L11 -43" },
  j: { w: 22, d: "M12 -34L8 8C7 17 2 21 -3 19M13 -47L13 -43" },
  k: { w: 34, d: "M9 -68C8 -48 6 -26 6 0M27 -33L8 -15M13 -18L26 0" },
  l: { w: 22, d: "M14 -68C12 -46 10 -22 10 -8C10 -3 12 0 16 1" },
  m: { w: 50, d: "M5 -34L4 0M4 -21C7 -28 12 -33 18 -32C22 -31 23 -27 23 -21L22 0M22 -21C25 -28 30 -33 36 -32C40 -31 41 -27 41 -21L40 0" },
  n: { w: 36, d: "M5 -34L4 0M4 -20C7 -27 13 -33 20 -32C25 -31 27 -27 26 -20L25 0" },
  o: { w: 38, d: "M18 -33C10 -33 4 -26 4 -17C4 -8 10 -1 18 -1C26 -1 33 -9 33 -18C33 -26 26 -33 18 -33Z" },
  p: { w: 38, d: "M5 -33L1 21M4 -17C7 -27 14 -33 21 -32C28 -31 31 -24 29 -16C27 -7 20 -1 13 -2C8 -3 5 -8 4 -13" },
  q: { w: 38, d: "M30 -33L26 21M29 -17C26 -27 19 -33 12 -32C5 -31 2 -24 4 -16C6 -7 13 -1 20 -2C25 -3 28 -8 29 -13" },
  r: { w: 28, d: "M6 -33L4 0M4 -20C7 -28 13 -34 22 -32" },
  s: { w: 32, d: "M27 -28C23 -33 12 -34 8 -30C4 -26 7 -20 14 -18C21 -16 24 -12 22 -6C19 0 9 1 4 -3" },
  t: { w: 26, d: "M16 -50C14 -32 12 -16 12 -8C12 -3 15 0 20 -1M4 -31L25 -33" },
  u: { w: 38, d: "M6 -33L4 -11C3 -5 6 -1 12 -1C19 -1 25 -8 27 -17L30 -33M27 -17L25 -6C24 -2 26 0 29 1" },
  v: { w: 34, d: "M5 -33L12 -1L29 -33" },
  w: { w: 44, d: "M4 -33L9 -1L20 -24L24 -1L39 -33" },
  x: { w: 34, d: "M5 -33L27 -1M28 -33L3 -1" },
  y: { w: 36, d: "M5 -33L14 -4L30 -33M14 -4L9 11C6 19 0 22 -4 19" },
  z: { w: 34, d: "M5 -32L27 -33L4 -2L28 -3" },
  A: { w: 40, d: "M1 0L23 -62L34 0M8 -20L30 -21" },
  B: { w: 42, d: "M13 -62C11 -42 9 -20 8 0M13 -62C27 -63 35 -57 34 -48C33 -39 25 -34 12 -34M12 -34C27 -35 36 -29 35 -19C34 -8 24 -1 8 0" },
  C: { w: 44, d: "M41 -52C36 -60 23 -64 15 -56C5 -46 5 -18 15 -7C22 0 34 -2 41 -9" },
  D: { w: 46, d: "M12 -62C10 -42 9 -20 8 0M12 -62C30 -63 41 -51 40 -32C39 -13 25 0 8 0" },
  E: { w: 38, d: "M36 -62L11 -62C10 -42 8 -20 8 0L34 -1M9 -33L28 -34" },
  F: { w: 36, d: "M36 -62L11 -62C10 -42 8 -20 8 0M9 -33L28 -34" },
  G: { w: 46, d: "M41 -52C36 -60 23 -64 15 -56C5 -46 5 -18 15 -7C24 1 38 -3 40 -14L41 -27L27 -26" },
  H: { w: 46, d: "M11 -62C10 -42 8 -20 8 0M40 -62C38 -42 37 -20 36 0M9 -33L38 -34" },
  I: { w: 22, d: "M16 -62C14 -42 12 -20 11 0" },
  J: { w: 30, d: "M24 -62C22 -40 20 -18 18 -8C16 1 8 5 2 0" },
  K: { w: 44, d: "M12 -62C10 -42 9 -20 8 0M39 -62L10 -32M17 -38L40 0" },
  L: { w: 36, d: "M13 -62C11 -42 9 -20 8 0L33 -1" },
  M: { w: 54, d: "M2 0L11 -62L27 -22L47 -62L45 0" },
  N: { w: 48, d: "M4 0L13 -62L36 -14L42 -62" },
  O: { w: 48, d: "M24 -63C13 -63 5 -50 5 -32C5 -14 13 -1 24 -1C35 -1 43 -14 43 -32C43 -50 35 -63 24 -63Z" },
  P: { w: 40, d: "M13 -62C11 -42 9 -20 8 0M13 -62C28 -63 37 -56 36 -45C35 -33 24 -27 10 -28" },
  Q: { w: 48, d: "M24 -63C13 -63 5 -50 5 -32C5 -14 13 -1 24 -1C35 -1 43 -14 43 -32C43 -50 35 -63 24 -63ZM30 -14L44 4" },
  R: { w: 42, d: "M13 -62C11 -42 9 -20 8 0M13 -62C28 -63 37 -56 36 -45C35 -34 25 -28 11 -29L38 0" },
  S: { w: 38, d: "M35 -54C30 -62 16 -64 10 -57C4 -49 9 -40 19 -35C29 -30 35 -22 30 -11C25 -1 11 1 3 -5" },
  T: { w: 40, d: "M3 -61L38 -62M22 -62C20 -42 18 -20 17 0" },
  U: { w: 46, d: "M11 -62C9 -42 7 -22 7 -14C7 -4 14 1 23 1C33 1 40 -5 41 -16L44 -62" },
  V: { w: 42, d: "M4 -62L20 0L39 -62" },
  W: { w: 58, d: "M3 -62L13 0L28 -44L34 0L54 -62" },
  X: { w: 42, d: "M5 -62L36 0M39 -62L3 0" },
  Y: { w: 40, d: "M5 -62L21 -30L19 0M21 -30L38 -62" },
  Z: { w: 40, d: "M5 -61L35 -62L4 -1L36 -2" },
  "0": { w: 36, d: "M18 -62C10 -62 5 -49 5 -31C5 -13 10 -1 18 -1C26 -1 31 -13 31 -31C31 -49 26 -62 18 -62Z" },
  "1": { w: 26, d: "M6 -52L17 -62C15 -42 13 -20 12 0" },
  "2": { w: 34, d: "M6 -52C10 -60 20 -64 26 -59C33 -54 31 -44 24 -36L4 -1L31 -2" },
  "3": { w: 34, d: "M7 -55C12 -62 24 -63 28 -57C32 -51 27 -43 17 -41C28 -42 34 -35 32 -24C30 -11 16 -5 5 -11" },
  "4": { w: 36, d: "M27 -62L4 -20L33 -21M24 -36L22 0" },
  "5": { w: 34, d: "M31 -61L11 -61L7 -38C14 -43 25 -41 29 -33C33 -24 29 -10 19 -6C13 -4 8 -5 4 -9" },
  "6": { w: 34, d: "M29 -57C22 -63 12 -59 8 -48C4 -37 4 -18 9 -8C13 -1 23 -1 27 -8C31 -15 29 -26 21 -28C15 -30 10 -26 8 -20" },
  "7": { w: 32, d: "M4 -61L31 -62L13 0" },
  "8": { w: 34, d: "M18 -62C11 -62 7 -56 8 -49C10 -38 30 -35 31 -20C32 -9 25 -2 17 -2C9 -2 3 -9 4 -19C5 -34 27 -37 28 -50C29 -57 24 -62 18 -62Z" },
  "9": { w: 34, d: "M6 -6C13 0 23 -4 27 -15C31 -26 31 -45 26 -55C22 -62 12 -62 8 -55C4 -48 6 -37 14 -35C20 -33 25 -37 27 -43" },
  ",": { w: 14, d: "M7 -2C9 2 8 8 3 12" },
  ".": { w: 12, d: "M6 -2L7 0" },
  "'": { w: 12, d: "M8 -50C7 -44 6 -40 5 -37" },
  "!": { w: 16, d: "M11 -62L8 -16M6 -2L7 0" },
  "?": { w: 30, d: "M5 -52C9 -60 19 -64 25 -59C32 -53 28 -44 20 -38C16 -35 15 -30 15 -24M13 -2L14 0" },
  "-": { w: 26, d: "M4 -20L22 -21" },
  "—": { w: 40, d: "M3 -20L37 -21" },
  ":": { w: 14, d: "M8 -26L8 -24M6 -2L7 0" },
  ";": { w: 14, d: "M9 -26L9 -24M7 -2C9 2 8 8 3 12" },
  "&": { w: 44, d: "M40 0C28 -6 12 -20 10 -34C9 -43 14 -50 21 -49C27 -48 29 -42 26 -36C21 -26 6 -20 5 -10C4 -2 12 3 20 0C27 -3 32 -9 34 -16" },
  "/": { w: 28, d: "M26 -64L4 4" },
  "(": { w: 20, d: "M16 -64C8 -50 6 -30 8 -12C9 -4 11 0 14 4" },
  ")": { w: 20, d: "M6 -64C14 -50 16 -30 14 -12C13 -4 11 0 8 4" },
  "“": { w: 20, d: "M7 -50C6 -44 5 -40 4 -37M16 -50C15 -44 14 -40 13 -37" },
  "”": { w: 20, d: "M7 -50C6 -44 5 -40 4 -37M16 -50C15 -44 14 -40 13 -37" },
  " ": { w: 20, d: "" },
}

/** Repeatable wobble, so the same line is uneven the same way on every paint. */
const wobble = (n: number) => {
  const v = Math.sin(n * 12.9898 + 4.233) * 43758.5453
  return (v - Math.floor(v)) * 2 - 1
}

type Stroke = { d: string; x: number; dy: number; rot: number }

/** Sets a string in the drawn hand and reports the advance it consumed. */
function writeScript(text: string, seed = 0) {
  const strokes: Stroke[] = []
  let pen = 0
  let i = 0
  for (const ch of text) {
    const glyph = SCRIPT[ch] ?? SCRIPT[ch.toLowerCase()] ?? SCRIPT[" "]
    if (glyph.d) {
      strokes.push({
        d: glyph.d,
        x: pen,
        dy: wobble(i + seed * 7.7) * 1.5,
        rot: wobble(i + seed * 3.1 + 40) * 1.4,
      })
    }
    pen += glyph.w
    i++
  }
  return { strokes, width: pen }
}

/* -------------------------------------------------------------------- copy
   The typewritten column is justified the way a typewriter justifies: the
   lines are already broken, and each is stretched to one measured width. That
   is why short lines open up into wide gaps instead of trailing off. */

const DEFAULT_SLIDES: ZineSlide[] = [
  {
    script: "Be the Creative you",
    tail: ["you wanted your younger", "self to know"],
    note: ["Notes from", "a creative", "to a creative."],
    body: [
      "The world will tell you to be this or",
      "that. And sometimes, it's hard to choose",
      "your own path — with all the pressure,",
      "expectations, and “shoulds.”",
      "But you're more than what you think you",
      "are. It's never too late to start, to",
      "create, or to become the person your",
      "younger self dreamed of being.",
    ],
  },
  {
    script: "Start before you",
    tail: ["feel ready, and let the", "work teach you"],
    note: ["Notes from", "a creative", "to a creative."],
    body: [
      "Nobody hands you permission. The first",
      "draft is meant to be bad — that is what",
      "a draft is for. You learn the craft by",
      "making the thing, badly, again.",
      "Every maker you admire has a folder of",
      "work they would rather you never saw.",
      "They kept going anyway, and that is the",
      "whole of the difference.",
    ],
  },
  {
    script: "Keep the small",
    tail: ["things that made you", "want to make"],
    note: ["Notes from", "a creative", "to a creative."],
    body: [
      "Somewhere there is a version of you who",
      "drew for no reason at all, with nobody",
      "watching and nothing riding on it.",
      "That one was not naive.",
      "Protect the part that makes things for",
      "the joy of it. It is the part that will",
      "still be here when the trends have gone",
      "and the brief has changed again.",
    ],
  },
]

/* The five pinned snapshots, placed by hand. */
type Slot = { cx: number; cy: number; w: number; h: number; rot: number; pin: [number, number] }

const SLOTS: Slot[] = [
  { cx: 204, cy: 403, w: 83, h: 118, rot: -4, pin: [-12, -60] },
  { cx: 526, cy: 381, w: 78, h: 131, rot: 5, pin: [-2, -64] },
  { cx: 191, cy: 536, w: 135, h: 96, rot: -7, pin: [44, -40] },
  { cx: 542, cy: 533, w: 130, h: 130, rot: 4, pin: [-44, -62] },
  { cx: 496, cy: 612, w: 99, h: 126, rot: -5, pin: [-16, -58] },
]

/* The centre print: a deep bottom border, the way a instant print is cut. */
const CARD = { x: 186, y: 240, w: 335, h: 407, rot: -1.5, pad: 13, foot: 40 }

const INK = "#2b2724"
const RED = "#93291e"

const CSS = `
.pzh-root{position:relative;width:100%;overflow:hidden;isolation:isolate;background-color:#efece6;display:flex;align-items:center;justify-content:center}
.pzh-l{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:block}
.pzh-tex{mix-blend-mode:multiply;opacity:.5}
.pzh-vig{background:radial-gradient(120% 76% at 50% 42%,rgba(0,0,0,0) 52%,rgba(58,48,38,.07) 80%,rgba(58,48,38,.16) 100%)}
.pzh-page{position:relative;display:block;width:100%;height:100%}
.pzh-mono{font-family:"Courier New",Courier,ui-monospace,SFMono-Regular,Menlo,monospace}
.pzh-fade{transition:opacity .5s ease}
.pzh-hit{cursor:pointer;outline:none}
.pzh-hit:focus-visible .pzh-ring{opacity:1}
.pzh-ring{opacity:0}
.pzh-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@keyframes pzh-in{from{opacity:0}to{opacity:1}}
.pzh-slide{animation:pzh-in .45s ease both}
@media (prefers-reduced-motion: reduce){.pzh-fade{transition:none}.pzh-slide{animation:none}}
`

/* ------------------------------------------------------- drawn stand-ins
   The defaults have to be generated. 21st's capture sandbox blocks external
   origins, so a component whose default state points at a photo URL builds
   fine and then never gets a cover image. These are deliberately flat,
   high-contrast figures: at print size they read as scanned snapshots, and
   they are only ever what you see until `portrait` / `photos` are passed. */

/** The print's ground, behind the figure and clipped to the window. */
function portraitGround(w: number, h: number) {
  return (
    <g>
      <rect width={w} height={h} fill="#c9c8c5" />
      <ellipse cx={w * 0.5} cy={h * 0.12} rx={w * 0.85} ry={h * 0.5} fill="#d4d3d0" opacity="0.6" />
    </g>
  )
}

/**
 * Head-and-shoulders, framed close, running past the print's bottom edge the
 * way the original's subject is cut out of its frame. The features are a
 * suggestion and no more: drawn in detail at this size they read as a cartoon,
 * left plain they read as a photograph nobody has looked at closely yet.
 */
function drawnPortrait(w: number, h: number) {
  const cx = w * 0.5
  const P = (x: number, y: number) => cx + w * x + " " + h * y
  return (
    <g>
      {/* shirt — shoulders kept off the lower left, where the hand is written */}
      <path
        d={
          "M" + P(-0.06, 0.545) +
          "C" + P(-0.13, 0.575) + " " + P(-0.24, 0.63) + " " + P(-0.265, 0.75) +
          "C" + P(-0.282, 0.87) + " " + P(-0.288, 1) + " " + P(-0.288, 1.14) +
          "L" + P(0.288, 1.14) +
          "C" + P(0.288, 1) + " " + P(0.282, 0.87) + " " + P(0.265, 0.75) +
          "C" + P(0.24, 0.63) + " " + P(0.13, 0.575) + " " + P(0.06, 0.545) +
          "Z"
        }
        fill="#1b1a19"
      />
      <g stroke="#33302e" strokeWidth={w * 0.006} fill="none" opacity="0.75">
        <path d={"M" + P(-0.175, 0.67) + "C" + P(-0.195, 0.8) + " " + P(-0.2, 0.97) + " " + P(-0.198, 1.14)} />
        <path d={"M" + P(0.175, 0.67) + "C" + P(0.195, 0.8) + " " + P(0.2, 0.97) + " " + P(0.198, 1.14)} />
        <path d={"M" + P(-0.06, 0.55) + "C" + P(-0.03, 0.6) + " " + P(0.03, 0.6) + " " + P(0.06, 0.55)} />
      </g>
      {/* neck */}
      <path d={"M" + P(-0.072, 0.45) + "L" + P(0.072, 0.45) + "L" + P(0.085, 0.575) + "L" + P(-0.085, 0.575) + "Z"} fill="#8a8681" />
      <path d={"M" + P(-0.085, 0.5) + "C" + P(-0.04, 0.55) + " " + P(0.04, 0.55) + " " + P(0.085, 0.5) + "L" + P(0.085, 0.575) + "L" + P(-0.085, 0.575) + "Z"} fill="#6e6a66" opacity="0.55" />
      {/* head */}
      <ellipse cx={cx} cy={h * 0.31} rx={w * 0.158} ry={h * 0.19} fill="#a8a49f" />
      {/* hair: crown and temples, with a fringe across the brow */}
      <path
        d={
          "M" + P(-0.176, 0.36) +
          "C" + P(-0.186, 0.22) + " " + P(-0.12, 0.115) + " " + P(0, 0.115) +
          "C" + P(0.12, 0.115) + " " + P(0.186, 0.22) + " " + P(0.176, 0.36) +
          "C" + P(0.168, 0.3) + " " + P(0.156, 0.26) + " " + P(0.138, 0.245) +
          "C" + P(0.1, 0.212) + " " + P(0.02, 0.225) + " " + P(-0.06, 0.25) +
          "C" + P(-0.11, 0.266) + " " + P(-0.152, 0.29) + " " + P(-0.176, 0.36) +
          "Z"
        }
        fill="#1d1c1b"
      />
      <path d={"M" + P(-0.174, 0.33) + "C" + P(-0.168, 0.37) + " " + P(-0.162, 0.39) + " " + P(-0.155, 0.4) + "C" + P(-0.164, 0.38) + " " + P(-0.17, 0.355) + " " + P(-0.176, 0.33) + "Z"} fill="#1d1c1b" />
      <path d={"M" + P(0.174, 0.33) + "C" + P(0.168, 0.37) + " " + P(0.162, 0.39) + " " + P(0.155, 0.4) + "C" + P(0.164, 0.38) + " " + P(0.17, 0.355) + " " + P(0.176, 0.33) + "Z"} fill="#1d1c1b" />
      {/* brow, eyes, nose, a closed mouth */}
      <g fill="#4f4b47" opacity="0.62">
        <path d={"M" + P(-0.095, 0.318) + "C" + P(-0.07, 0.305) + " " + P(-0.035, 0.305) + " " + P(-0.018, 0.316) + "L" + P(-0.02, 0.328) + "C" + P(-0.04, 0.32) + " " + P(-0.072, 0.322) + " " + P(-0.095, 0.33) + "Z"} />
        <path d={"M" + P(0.095, 0.318) + "C" + P(0.07, 0.305) + " " + P(0.035, 0.305) + " " + P(0.018, 0.316) + "L" + P(0.02, 0.328) + "C" + P(0.04, 0.32) + " " + P(0.072, 0.322) + " " + P(0.095, 0.33) + "Z"} />
      </g>
      <g fill="#403c39" opacity="0.72">
        <ellipse cx={cx - w * 0.062} cy={h * 0.352} rx={w * 0.021} ry={h * 0.009} />
        <ellipse cx={cx + w * 0.062} cy={h * 0.352} rx={w * 0.021} ry={h * 0.009} />
      </g>
      <path d={"M" + P(0.004, 0.36) + "C" + P(0.016, 0.395) + " " + P(0.016, 0.4) + " " + P(-0.008, 0.412)} fill="none" stroke="#6f6a65" strokeWidth={w * 0.007} opacity="0.55" strokeLinecap="round" />
      <path d={"M" + P(-0.042, 0.438) + "C" + P(-0.015, 0.449) + " " + P(0.015, 0.449) + " " + P(0.042, 0.438)} fill="none" stroke="#57534f" strokeWidth={w * 0.008} opacity="0.6" strokeLinecap="round" />
    </g>
  )
}

/** A small standing figure. Five variants so the wall does not repeat. */
function drawnSnapshot(w: number, h: number, v: number) {
  const cx = w * 0.5
  const P = (x: number, y: number) => cx + w * x + " " + h * y
  const grounds = ["#cbc9c4", "#bfbdb8", "#d2d0cc", "#b8b6b1", "#c6c4bf"]
  const wears = ["#2b2a28", "#4c4a47", "#3a3835", "#242322", "#57554f"]
  const horizon = h * (0.58 + (v % 3) * 0.07)
  const wear = wears[v % 5]
  const lift = (v % 2) * 0.04
  return (
    <g>
      <rect width={w} height={h} fill={grounds[v % 5]} />
      <rect y={horizon} width={w} height={h - horizon} fill="#9b9995" opacity="0.5" />
      <ellipse cx={cx} cy={h * 0.93} rx={w * 0.26} ry={h * 0.035} fill="#6d6b68" opacity="0.3" />
      {/* legs */}
      <g fill="#37352f">
        <path d={"M" + P(-0.1, 0.6 + lift) + "L" + P(-0.02, 0.6 + lift) + "L" + P(-0.03, 0.92) + "L" + P(-0.095, 0.92) + "Z"} />
        <path d={"M" + P(0.02, 0.6 + lift) + "L" + P(0.1, 0.6 + lift) + "L" + P(0.095, 0.92) + "L" + P(0.03, 0.92) + "Z"} />
      </g>
      {/* body and arms as one silhouette */}
      <path
        d={
          "M" + P(-0.075, 0.355 + lift) +
          "C" + P(-0.135, 0.375 + lift) + " " + P(-0.172, 0.42 + lift) + " " + P(-0.175, 0.5 + lift) +
          "C" + P(-0.176, 0.56 + lift) + " " + P(-0.166, 0.62 + lift) + " " + P(-0.152, 0.66 + lift) +
          "L" + P(0.152, 0.66 + lift) +
          "C" + P(0.166, 0.62 + lift) + " " + P(0.176, 0.56 + lift) + " " + P(0.175, 0.5 + lift) +
          "C" + P(0.172, 0.42 + lift) + " " + P(0.135, 0.375 + lift) + " " + P(0.075, 0.355 + lift) +
          "Z"
        }
        fill={wear}
      />
      {/* head */}
      <ellipse cx={cx} cy={h * (0.27 + lift)} rx={w * 0.082} ry={h * 0.072} fill="#a7a39e" />
      <path
        d={
          "M" + P(-0.09, 0.275 + lift) +
          "C" + P(-0.095, 0.2 + lift) + " " + P(-0.055, 0.176 + lift) + " " + P(0, 0.176 + lift) +
          "C" + P(0.055, 0.176 + lift) + " " + P(0.095, 0.2 + lift) + " " + P(0.09, 0.275 + lift) +
          "C" + P(0.085, 0.235 + lift) + " " + P(0.05, 0.222 + lift) + " " + P(0, 0.222 + lift) +
          "C" + P(-0.05, 0.222 + lift) + " " + P(-0.085, 0.235 + lift) + " " + P(-0.09, 0.275 + lift) +
          "Z"
        }
        fill="#221f1e"
      />
    </g>
  )
}

/* ------------------------------------------------------------------ hero */

export default function PolaroidZineHero({
  height = "100svh",
  minHeight = "560px",
  slides = DEFAULT_SLIDES,
  portrait,
  photos = [],
  issue = "ISSUE NOVEMBER 2025",
  handle = "@THEHYBRIDDESIGNER.NP",
  onSlideChange,
  className = "",
}: PolaroidZineHeroProps) {
  // Two heroes on one page would otherwise share filter ids and the second
  // would repaint the first.
  const uid = "pzh" + React.useId().replace(/[^a-zA-Z0-9]/g, "")
  const id = (n: string) => uid + "-" + n
  const u = (n: string) => "url(#" + uid + "-" + n + ")"

  const pages = slides.length > 0 ? slides : DEFAULT_SLIDES
  const [index, setIndex] = React.useState(0)
  const at = Math.min(index, pages.length - 1)
  const page = pages[at]

  const rootRef = React.useRef<HTMLElement | null>(null)

  const go = React.useCallback(
    (to: number) => {
      const next = Math.min(Math.max(to, 0), pages.length - 1)
      setIndex(next)
      onSlideChange?.(next)
      // At either end its own control unmounts. Focus would fall to <body>,
      // which is outside this subtree, and every later arrow key would be lost.
      if (next === 0 || next === pages.length - 1) rootRef.current?.focus()
    },
    [pages.length, onSlideChange],
  )

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault()
      go(at + 1)
    } else if (e.key === "ArrowLeft") {
      e.preventDefault()
      go(at - 1)
    }
  }

  /** One line of the drawn script, set on its baseline. */
  const script = (
    t: string,
    x: number,
    y: number,
    cap: number,
    weight: number,
    width: number | undefined,
    seed: number,
    halo = false,
  ) => {
    const line = writeScript(t, seed)
    const nominal = cap / 62
    const s =
      width === undefined
        ? nominal
        : Math.min(Math.max(width / line.width, nominal * 0.7), nominal * 1.45)
    const paths = line.strokes.map((st, i) => (
      <path key={i} d={st.d} transform={"translate(" + st.x + " " + st.dy + ") rotate(" + st.rot + ")"} />
    ))
    return (
      <g
        transform={"translate(" + x + " " + y + ") scale(" + s + ") skewX(-13)"}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {halo ? (
          <g stroke="#e7e4dd" strokeWidth={weight + 5} opacity="0.85">
            {paths}
          </g>
        ) : null}
        <g stroke={INK} strokeWidth={weight}>
          {paths}
        </g>
      </g>
    )
  }

  /** A focusable control drawn in the page's own coordinates. */
  const control = (cx: number, cy: number, dir: 1 | -1, label: string) => (
    <g
      className="pzh-hit"
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={() => go(at + dir)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          e.stopPropagation()
          go(at + dir)
        }
      }}
      style={{ pointerEvents: "auto" }}
    >
      <circle cx={cx} cy={cy} r="12" fill="#ffffff" opacity="0.78" />
      <circle className="pzh-ring" cx={cx} cy={cy} r="15.5" fill="none" stroke={INK} strokeWidth="1.6" />
      <path
        d={"M" + (cx - dir * 2.4) + " " + (cy - 4.6) + "L" + (cx + dir * 2.6) + " " + cy + "L" + (cx - dir * 2.4) + " " + (cy + 4.6)}
        fill="none"
        stroke="#3c3733"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  )

  const photoOf = (i: number, w: number, h: number) =>
    photos[i] ? (
      <image href={photos[i]} x="0" y="0" width={w} height={h} preserveAspectRatio="xMidYMid slice" />
    ) : (
      drawnSnapshot(w, h, i)
    )

  const pw = CARD.w - CARD.pad * 2
  const ph = CARD.h - CARD.pad - CARD.foot

  return (
    <section
      ref={rootRef}
      className={"pzh-root " + className}
      style={{ height, minHeight }}
      onKeyDown={onKeyDown}
      tabIndex={pages.length > 1 ? 0 : -1}
      aria-roledescription="carousel"
      aria-label="Notes from a creative"
    >
      <style>{CSS}</style>
      <div className="pzh-sr">
        <h1>{page.script} {(page.tail ?? []).join(" ")}</h1>
        {(page.note ?? []).length > 0 ? <p>{(page.note ?? []).join(" ")}</p> : null}
        <p>{(page.body ?? []).join(" ")}</p>
        <p>
          {issue} {handle}
        </p>
        <p aria-live="polite">
          Page {at + 1} of {pages.length}
        </p>
      </div>

      <svg
        className="pzh-page"
        viewBox={"0 0 " + W + " " + H}
        preserveAspectRatio="xMidYMid meet"
        style={{ pointerEvents: "none" }}
      >
        <defs>
          {/* Paper tooth, laid over the whole page by multiply. */}
          <filter id={id("tooth")} x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="4" seed="11" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0" intercept="1" />
              <feFuncR type="linear" slope="0.22" intercept="0.78" />
              <feFuncG type="linear" slope="0.22" intercept="0.78" />
              <feFuncB type="linear" slope="0.22" intercept="0.76" />
            </feComponentTransfer>
          </filter>
          {/* Film grain, confined to the photographs. */}
          <filter id={id("screen")} x="-2%" y="-2%" width="104%" height="104%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" seed="29" result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0 0.16" result="g" />
            <feComposite in="g" in2="SourceGraphic" operator="atop" result="grainy" />
            <feBlend in="grainy" in2="SourceGraphic" mode="multiply" />
          </filter>
          {/* Just enough tremor to keep the drawn hand off the ruler. */}
          <filter id={id("nib")} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="17" result="w" />
            <feDisplacementMap in="SourceGraphic" in2="w" scale="1.3" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id={id("cardDrop")} x="-18%" y="-14%" width="140%" height="138%">
            <feDropShadow dx="2" dy="5" stdDeviation="6" floodColor="#4a4136" floodOpacity="0.3" />
          </filter>
          <filter id={id("snapDrop")} x="-26%" y="-22%" width="156%" height="152%">
            <feDropShadow dx="1.6" dy="3.4" stdDeviation="3" floodColor="#4a4136" floodOpacity="0.34" />
          </filter>
          <radialGradient id={id("pin")} cx="34%" cy="28%" r="74%">
            <stop offset="0" stopColor="#ff8a7c" />
            <stop offset="0.36" stopColor="#cf2f22" />
            <stop offset="1" stopColor="#7d130c" />
          </radialGradient>
          <clipPath id={id("window")}>
            <rect x="0" y="0" width={pw} height={ph} />
          </clipPath>
          <clipPath id={id("bleed")}>
            <rect x="0" y="0" width={pw} height={ph + CARD.foot - 8} />
          </clipPath>
          {SLOTS.map((s, i) => (
            <clipPath key={i} id={id("snap" + i)}>
              <rect x="0" y="0" width={s.w - 12} height={s.h - 20} />
            </clipPath>
          ))}
        </defs>

        <rect width={W} height={H} fill="#efece6" />
        <g className="pzh-slide" key={at}>
          {/* The slip taped into the corner. */}
          {(page.note ?? []).length > 0 ? (
            <g transform="translate(600.5 73) rotate(0.6)">
              <rect x="-111" y="-68" width="222" height="136" fill="#f0ebdf" />
              <rect x="-111" y="-68" width="222" height="27" fill="#f7f3ea" />
              <line x1="-111" y1="-41" x2="111" y2="-41" stroke="#e0d6c2" strokeWidth="0.8" />
              {(page.note ?? []).map((line, i) => (
                <text
                  key={i}
                  className="pzh-mono"
                  x="-72"
                  y={13 + i * 19}
                  fontSize="13.5"
                  letterSpacing="0.4"
                  fill={RED}
                >
                  {line}
                </text>
              ))}
            </g>
          ) : null}

          {/* The typewritten column, each line stretched to one measured width. */}
          {(page.body ?? []).map((line, i) => (
            <text
              key={i}
              className="pzh-mono"
              x="418"
              y={772 + i * 15.5}
              fontSize="11"
              fill={RED}
              textLength="292"
              lengthAdjust="spacing"
            >
              {line}
            </text>
          ))}
        </g>

        {/* The centre print. */}
        <g transform={"translate(" + (CARD.x + CARD.w / 2) + " " + (CARD.y + CARD.h / 2) + ") rotate(" + CARD.rot + ")"}>
          <g transform={"translate(" + -CARD.w / 2 + " " + -CARD.h / 2 + ")"} filter={u("cardDrop")}>
            <rect width={CARD.w} height={CARD.h} fill="#fbf9f4" />
            <g transform={"translate(" + CARD.pad + " " + CARD.pad + ")"}>
              <g clipPath={u("window")} filter={u("screen")}>
                {portrait ? (
                  <image href={portrait} x="0" y="0" width={pw} height={ph} preserveAspectRatio="xMidYMid slice" />
                ) : (
                  portraitGround(pw, ph)
                )}
              </g>
              {portrait ? null : (
                <g clipPath={u("bleed")} filter={u("screen")}>
                  {drawnPortrait(pw, ph)}
                </g>
              )}
            </g>
          </g>
        </g>

        {/* The five pinned snapshots. */}
        {SLOTS.map((s, i) => (
          <g key={i} transform={"translate(" + s.cx + " " + s.cy + ") rotate(" + s.rot + ")"}>
            <g transform={"translate(" + -s.w / 2 + " " + -s.h / 2 + ")"} filter={u("snapDrop")}>
              <rect width={s.w} height={s.h} fill="#fbf9f4" />
              <g transform="translate(6 6)" clipPath={u("snap" + i)} filter={u("screen")}>
                {photoOf(i, s.w - 12, s.h - 20)}
              </g>
            </g>
            <g>
              <ellipse cx={s.pin[0] + 1.4} cy={s.pin[1] + 3.6} rx="6.4" ry="3.2" fill="#4a4136" opacity="0.32" />
              <circle cx={s.pin[0]} cy={s.pin[1]} r="6.4" fill={u("pin")} />
              <ellipse cx={s.pin[0] - 2} cy={s.pin[1] - 2.4} rx="1.9" ry="1.2" fill="#fff" opacity="0.85" transform={"rotate(-34 " + (s.pin[0] - 2) + " " + (s.pin[1] - 2.4) + ")"} />
            </g>
          </g>
        ))}

        {/* The hand, over the print. */}
        <g className="pzh-slide" key={"hand" + at} filter={u("nib")}>
          <g transform="rotate(-2 222 250)">{script(page.script, 222, 250, 30, 5.6, 306, 3)}</g>
          <g transform="translate(206 612) rotate(-9)">
            {(page.tail ?? [])[0] ? script((page.tail ?? [])[0], 0, 0, 19, 4.6, 230, 7, true) : null}
            {(page.tail ?? [])[1] ? script((page.tail ?? [])[1], 16, 34, 19, 4.6, 132, 9, true) : null}
          </g>
        </g>

        {/* Footer. */}
        <text className="pzh-mono" x="36" y="890" fontSize="7" fill={INK} textLength="76" lengthAdjust="spacing">
          {issue}
        </text>
        <text className="pzh-mono" x="124" y="890" fontSize="7" fill={INK} opacity="0.85" textLength="142" lengthAdjust="spacing">
          {handle}
        </text>

        {/* Carousel chrome — real controls, not drawn ones. */}
        {pages.length > 1 ? (
          <g>
            {at > 0 ? control(19, 461, -1, "Previous page") : null}
            {at < pages.length - 1 ? control(716, 461, 1, "Next page") : null}
            <g>
              {pages.map((_, i) => (
                <circle
                  key={i}
                  cx={W / 2 + (i - (pages.length - 1) / 2) * 11.5}
                  cy="906"
                  r={i === at ? 3 : 2.6}
                  fill={i === at ? "#6d6257" : "#b9b2a6"}
                />
              ))}
            </g>
          </g>
        ) : null}

      </svg>

      {/* Tooth over the whole surface, not just the page — otherwise the sheet
          and the margin around it read as two different papers. */}
      <svg className="pzh-l pzh-tex" preserveAspectRatio="none" aria-hidden="true">
        <rect width="100%" height="100%" filter={u("tooth")} />
      </svg>

      <div className="pzh-l pzh-vig" />
    </section>
  )
}
