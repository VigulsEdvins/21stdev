"use client"

import * as React from "react"

/**
 * Starburst Thanks Footer — a closing "thank you for your time" sign-off for a
 * portfolio or deck: heavy extended caps, a hand-lettered line underneath, a
 * loose pen loop around both, a hot-pink starburst, and contact pills with
 * little pointing hands.
 *
 * Click (or Enter on) the starburst and it pops, throws sparks, and the
 * headline says thanks in the next language. The hand lettering writes itself
 * in stroke by stroke the first time it's seen, the loop draws round, the star
 * leans toward the pointer, the hands tap whichever pill you point at, and the
 * email pill copies the address.
 *
 * No dependencies and nothing fetched: React is the only import, the hand
 * lettering is a built-in single-stroke alphabet drawn as SVG, and the film
 * grain is an inline SVG noise filter.
 */

// #region signoff
// Pure: lettering, star, loop and dust geometry. Lifted out and run by the test.

/** A small deterministic hash → [0, 1), so every render jitters the same way. */
export const hash = (n: number): number => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

const round = (v: number): number => Math.round(v * 100) / 100

/**
 * A single-stroke marker alphabet on a 10-unit cap height: [advance, path].
 * Every coordinate is absolute (M, L, Q, Z only), y runs down from the cap line.
 */
export const GLYPHS: Record<string, [number, string]> = {
  A: [6, "M0 10L3 0L6 10M1.2 6.2L4.8 6.2"],
  B: [5.6, "M0 10L0 0L3.2 0Q5.2 0 5.2 2.4Q5.2 4.8 3 4.8L0 4.8M3 4.8Q5.6 4.8 5.6 7.4Q5.6 10 3 10L0 10"],
  C: [5.5, "M5.5 1.2Q4.6 0 3 0Q0 0 0 5Q0 10 3 10Q4.6 10 5.5 8.8"],
  D: [5.6, "M0 0L0 10L2.6 10Q5.6 10 5.6 5Q5.6 0 2.6 0Z"],
  E: [5, "M5 0L0 0L0 10L5 10M0 5L3.8 5"],
  F: [5, "M5 0L0 0L0 10M0 5L3.8 5"],
  G: [6, "M5.6 1.4Q4.6 0 3 0Q0 0 0 5Q0 10 3 10Q6 10 6 6L3.4 6"],
  H: [5.6, "M0 0L0 10M5.6 0L5.6 10M0 5L5.6 5"],
  I: [1, "M0.5 0L0.5 10"],
  J: [4.6, "M4.6 0L4.6 7Q4.6 10 2.3 10Q0 10 0 7.6"],
  K: [5.4, "M0 0L0 10M5.4 0L0 6.2M1.8 4.6L5.4 10"],
  L: [4.6, "M0 0L0 10L4.6 10"],
  M: [7, "M0 10L0.6 0L3.5 7L6.4 0L7 10"],
  N: [5.6, "M0 10L0 0L5.6 10L5.6 0"],
  O: [6, "M3 0Q0 0 0 5Q0 10 3 10Q6 10 6 5Q6 0 3 0Z"],
  P: [5.2, "M0 10L0 0L3 0Q5.2 0 5.2 2.7Q5.2 5.4 3 5.4L0 5.4"],
  Q: [6.4, "M3 0Q0 0 0 5Q0 10 3 10Q6 10 6 5Q6 0 3 0ZM3.6 7L6.4 10.6"],
  R: [5.4, "M0 10L0 0L3 0Q5.2 0 5.2 2.7Q5.2 5.4 3 5.4L0 5.4M2.4 5.4L5.4 10"],
  S: [5.2, "M5 1.2Q4.2 0 2.6 0Q0.2 0 0.2 2.5Q0.2 4.6 2.6 5Q5.2 5.5 5.2 7.6Q5.2 10 2.6 10Q0.8 10 0 8.6"],
  T: [6, "M0 0L6 0M3 0L3 10"],
  U: [5.6, "M0 0L0 7Q0 10 2.8 10Q5.6 10 5.6 7L5.6 0"],
  V: [6, "M0 0L3 10L6 0"],
  W: [8, "M0 0L1.9 10L4 2.6L6.1 10L8 0"],
  X: [5.6, "M0 0L5.6 10M5.6 0L0 10"],
  Y: [5.6, "M0 0L2.8 5L5.6 0M2.8 5L2.8 10"],
  Z: [5.4, "M0 0L5.4 0L0 10L5.4 10"],
  "0": [5, "M2.5 0Q0 0 0 5Q0 10 2.5 10Q5 10 5 5Q5 0 2.5 0Z"],
  "1": [3, "M0 2L2 0L2 10"],
  "2": [5, "M0 2Q0.6 0 2.6 0Q5 0 5 2.6Q5 4.6 0 10L5 10"],
  "3": [5.2, "M0 1Q1 0 2.5 0Q5 0 5 2.4Q5 4.8 2.2 4.8Q5.2 4.8 5.2 7.4Q5.2 10 2.5 10Q0.8 10 0 8.8"],
  "4": [5.4, "M4 10L4 0L0 7L5.4 7"],
  "5": [5, "M5 0L0.6 0L0.2 4.6Q1.2 4 2.6 4Q5 4 5 7Q5 10 2.4 10Q0.8 10 0 8.8"],
  "6": [5, "M4.6 0.8Q3.8 0 2.6 0Q0 0 0 5.6Q0 10 2.5 10Q5 10 5 7.2Q5 4.6 2.6 4.6Q0.8 4.6 0 6"],
  "7": [5, "M0 0L5 0L1.6 10"],
  "8": [5, "M2.5 4.8Q0.2 4.8 0.2 2.4Q0.2 0 2.5 0Q4.8 0 4.8 2.4Q4.8 4.8 2.5 4.8Q0 4.8 0 7.4Q0 10 2.5 10Q5 10 5 7.4Q5 4.8 2.5 4.8Z"],
  "9": [5, "M5 4Q4.2 5.4 2.4 5.4Q0 5.4 0 2.7Q0 0 2.5 0Q5 0 5 4L5 6Q5 10 2.4 10Q1 10 0.2 9"],
  "!": [1, "M0.5 0L0.5 6.8M0.5 9.4L0.5 10"],
  "?": [4.6, "M0 1.6Q0.6 0 2.4 0Q4.6 0 4.6 2.4Q4.6 4 2.4 5.2L2.4 7M2.4 9.4L2.4 10"],
  ".": [1, "M0.5 9.4L0.5 10"],
  ",": [1.4, "M0.9 9.2L0.3 11"],
  "'": [1, "M0.5 0L0.5 2.6"],
  ":": [1, "M0.5 3L0.5 3.6M0.5 9.4L0.5 10"],
  "-": [3.6, "M0 5.4L3.6 5.4"],
  "/": [4, "M4 0L0 10"],
  "&": [6, "M6 10L1.4 3.4Q0.6 2 1.6 0.8Q2.6 0 3.6 0.8Q4.4 2 2.6 3.8L1 5.4Q0 6.6 0 8Q0 10 2.2 10Q4 10 5.6 6.6"],
}

export const SPACE = 3.2
export const TRACK = 1.9

export type Glyph = { d: string; x: number; w: number; dy: number; rot: number }

/**
 * Lays text out in the marker alphabet. Accents are stripped (É → E), case is
 * ignored, and anything the alphabet lacks becomes a space rather than a gap
 * in the middle of a word. `jitter` 0 sets it dead straight.
 */
export const layoutScript = (
  text: string,
  seed: number = 1,
  track: number = TRACK,
  jitter: number = 1,
): { glyphs: Glyph[]; width: number } => {
  const clean = String(text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
  const glyphs: Glyph[] = []
  let x = 0
  for (let i = 0; i < clean.length; i++) {
    const g = GLYPHS[clean[i]]
    if (!g) {
      x += SPACE
      continue
    }
    glyphs.push({
      d: g[1],
      x: round(x),
      w: g[0],
      dy: round((hash(i * 7.31 + seed * 13.7) - 0.5) * 1.1 * jitter),
      rot: round((hash(i * 3.17 + seed * 5.3) - 0.5) * 8 * jitter),
    })
    x += g[0] + track
  }
  const last = glyphs[glyphs.length - 1]
  return { glyphs, width: last ? round(last.x + last.w) : 0 }
}

/** A closed star: `points` spikes, alternating radii. `wobble` makes the spikes uneven, like a hand-cut sticker. */
export const starPath = (
  points: number,
  outer: number,
  inner: number,
  cx: number = 0,
  cy: number = 0,
  wobble: number = 0,
  seed: number = 0,
): string => {
  const n = Math.max(3, Math.floor(points) || 3)
  const pts: string[] = []
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2
    const r = i % 2 ? inner : outer * (1 + (hash(i * 9.7 + seed) - 0.5) * wobble)
    pts.push(round(cx + Math.cos(a) * r) + " " + round(cy + Math.sin(a) * r))
  }
  return "M" + pts.join("L") + "Z"
}

/**
 * A pen loop round the headline: a tilted ellipse that goes a little more than
 * once round and spirals in, so the ends overshoot instead of meeting.
 * Fits inside a w × h box.
 */
export const loopPath = (w: number = 100, h: number = 40, turns: number = 1.1, tilt: number = -5, steps: number = 140): string => {
  const cx = w / 2
  const cy = h / 2
  const rx = w * 0.46
  const ry = h * 0.36
  const tr = (tilt * Math.PI) / 180
  const ct = Math.cos(tr)
  const st = Math.sin(tr)
  const pts: string[] = []
  for (let i = 0; i <= steps; i++) {
    const u = i / steps
    const a = Math.PI * 0.92 + u * turns * Math.PI * 2
    const k = 1 - 0.06 * u + 0.015 * Math.sin(a * 3)
    const x = Math.cos(a) * rx * k
    const y = Math.sin(a) * ry * k * (1 + 0.04 * u)
    pts.push(round(cx + x * ct - y * st) + " " + round(cy + x * st + y * ct))
  }
  return "M" + pts.join("L")
}

/** The next language, wrapping. Never NaN, never out of range. */
export const cycle = (i: number, n: number): number => (n > 0 && Number.isFinite(i) ? (((Math.floor(i) + 1) % n) + n) % n : 0)

/** "Rio Valente" → "RV". Two letters at most. */
export const initialsOf = (name: string): string =>
  String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()

/** Specks of dust on the film, in percent of the section. */
export const dust = (n: number, seed: number = 0): { x: number; y: number; s: number; o: number }[] =>
  Array.from({ length: Math.max(0, Math.floor(n) || 0) }, (_, i) => ({
    x: round(hash(i * 1.7 + seed) * 100),
    y: round(hash(i * 2.9 + seed + 4) * 100),
    s: round(1 + hash(i * 5.3 + seed) * 2.2),
    o: round(0.12 + hash(i * 8.1 + seed) * 0.4),
  }))
// #endregion

export type FooterLink = {
  /** Hand-lettered line above the pill, e.g. "More of my work". */
  caption?: string
  /** What the pill reads. */
  label: string
  href?: string
}

export interface StarburstThanksFooterProps {
  name?: string
  /** Replaces the generated monogram + name. */
  logo?: React.ReactNode
  /** Clicking the star cycles through these. */
  thanks?: string[]
  tagline?: string
  signoff?: string
  links?: FooterLink[]
  email?: string
  phone?: string
  copiedLabel?: string
  /** Minimum height. Any definite CSS length. */
  height?: string
  background?: string
  ink?: string
  accent?: string
  fontDisplay?: string
  fontSans?: string
  /** Film grain opacity, 0 to turn it off. */
  grain?: number
  starPoints?: number
  onThanks?: (index: number, word: string) => void
  className?: string
}

const DEFAULT_THANKS = ["Thank you", "Obrigado", "Gracias", "Merci", "Danke", "Grazie", "Arigato"]

const DEFAULT_LINKS: FooterLink[] = [
  { caption: "More of my work", label: "www.behance.net/riovalente", href: "#" },
  { caption: "More of my art", label: "www.instagram.com/rio.valente", href: "#" },
]

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'>" +
  "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/>" +
  "<feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .7 0'/></filter>" +
  "<rect width='100%' height='100%' filter='url(%23n)'/></svg>\")"

const ORBIT = loopPath()
const SEP = starPath(8, 5.6, 1.5)
const SPECKS = dust(22, 3)
const SPARKS = Array.from({ length: 12 }, (_, i) => ({ a: i * 30 + 15, l: i % 2 ? 0.7 : 1 }))

const HAND =
  "M8 13V3.5A2 2 0 0 1 12 3.5V10.5A2 2 0 0 1 16 10.5V11.5A2 2 0 0 1 20 11.5V12.5A1.8 1.8 0 0 1 23.6 12.5V19" +
  "Q23.6 27 16 27H13Q9.5 27 7.6 24L3 17.4Q2 15.6 3.6 14.8Q5 14.2 6.2 15.6L8 18Z"

const CSS =
  ".stf{position:relative;isolation:isolate;overflow:hidden;overflow:clip;container-type:inline-size;display:flex;flex-direction:column;width:100%;box-sizing:border-box;background:var(--stf-bg);color:var(--stf-ink);font-family:var(--stf-sans);-webkit-font-smoothing:antialiased;touch-action:pan-y}" +
  ".stf::before{content:'';position:absolute;inset:-50%;z-index:0;pointer-events:none;background-image:" + GRAIN + ";background-size:180px 180px;opacity:var(--stf-grain);mix-blend-mode:difference;animation:stf-grain .9s steps(1) infinite}" +
  ".stf::after{content:'';position:absolute;inset:0;z-index:0;pointer-events:none;background:radial-gradient(ellipse 75% 70% at 50% 45%,transparent 45%,color-mix(in oklab,var(--stf-bg) 55%,#000) 100%)}" +
  ":where(.stf) button{appearance:none;background:none;border:0;padding:0;margin:0;font:inherit;color:inherit;cursor:pointer}" +
  ":where(.stf) a{color:inherit;text-decoration:none}" +
  ".stf :focus-visible{outline:2px solid var(--stf-accent);outline-offset:4px}" +
  ".stf-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}" +
  ".stf-fx{position:absolute;inset:0;z-index:0;pointer-events:none}" +
  ".stf-dust{position:absolute;border-radius:50%;background:var(--stf-ink)}" +
  ".stf-scratch{position:absolute;width:1px;background:linear-gradient(transparent,var(--stf-ink),transparent);opacity:.18}" +
  ".stf-in{position:relative;z-index:1;flex:1;display:flex;flex-direction:column;align-items:center;padding:clamp(28px,4.5cqw,60px) 16px clamp(28px,4cqw,56px)}" +
  // logo
  ".stf-logo{display:inline-flex;align-items:center;gap:.55em;font-size:clamp(12px,1.45cqw,18px)}" +
  ".stf-mark{display:block;flex:none;max-width:none;overflow:visible}" +
  ".stf-mark path{fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:square;stroke-linejoin:miter;transition:transform .45s cubic-bezier(.2,.9,.3,1.3)}" +
  ".stf-mark-i path{stroke-width:1.7}" +
  ".stf-logo:hover .stf-mark-l{transform:translateX(-1.6px)}" +
  ".stf-logo:hover .stf-mark-r{transform:translateX(1.6px)}" +
  ".stf-name{display:flex;flex-direction:column;font-family:var(--stf-display);font-weight:900;text-transform:uppercase;line-height:.92;letter-spacing:.01em}" +
  // headline stage
  ".stf-mid{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:clamp(56px,8cqw,120px) 0 clamp(40px,6cqw,90px)}" +
  ".stf-stage{position:relative;display:flex;flex-direction:column;align-items:center;font-size:clamp(34px,8.6cqw,124px)}" +
  ".stf-stage:hover{--stf-orot:-2.5deg;--stf-osc:1.03}" +
  ".stf-h{position:relative;z-index:2;margin:0;font-family:var(--stf-display);font-weight:900;font-size:1em;line-height:.95;letter-spacing:-.01em;text-transform:uppercase;white-space:nowrap;transform:scaleX(1.12);color:var(--stf-ink)}" +
  ".stf-ch{display:inline-block}" +
  ".stf:not(.is-in) .stf-ch{opacity:0}" +
  ".stf.is-in .stf-ch{animation:stf-drop .7s cubic-bezier(.2,1.5,.35,1) both}" +
  ".stf-tag{position:relative;z-index:2;margin:.06em 0 0 -.3em;color:var(--stf-ink)}" +
  ".stf-orbit{position:absolute;left:-11%;top:-32%;width:120%;height:154%;z-index:1;overflow:visible;max-width:none;pointer-events:none;color:var(--stf-ink);transform:translate(calc(var(--stf-px,0) * -6px),calc(var(--stf-py,0) * -4px)) rotate(var(--stf-orot,0deg)) scale(var(--stf-osc,1));transition:transform .8s cubic-bezier(.2,.8,.2,1)}" +
  ".stf-orbit path{fill:none;stroke:currentColor;stroke-width:1.3;stroke-linecap:round;stroke-dasharray:var(--l,999) var(--l,999);stroke-dashoffset:var(--l,999)}" +
  ".stf.is-in .stf-orbit path{animation:stf-write 2.2s .25s cubic-bezier(.5,0,.3,1) forwards}" +
  // star
  ".stf-star-wrap{position:absolute;z-index:3;right:-.62em;top:-1.2em;width:1.5em;height:1.5em;transform:translate(calc(var(--stf-px,0) * 18px),calc(var(--stf-py,0) * 12px));transition:transform .6s cubic-bezier(.2,.8,.2,1)}" +
  ".stf-star{position:relative;display:block;width:100%;height:100%;border-radius:50%;color:var(--stf-accent);transition:transform .35s cubic-bezier(.2,.9,.3,1.4)}" +
  ".stf-star:hover{transform:scale(1.08)}" +
  ".stf-star:active{transform:scale(.94)}" +
  ".stf-star-pop{display:block;width:100%;height:100%}" +
  ".stf-star-svg{display:block;width:100%;height:100%;max-width:none;overflow:visible;animation:stf-spin 48s linear infinite;transition:filter .3s}" +
  ".stf-star:hover .stf-star-svg{filter:drop-shadow(0 0 .1em var(--stf-accent))}" +
  ".stf-star-svg path{fill:none;stroke:currentColor;stroke-width:1.6;stroke-linejoin:miter}" +
  ".stf-sparks{position:absolute;inset:0;pointer-events:none}" +
  ".stf-spark{position:absolute;left:50%;top:50%;width:62%;height:2px;margin-top:-1px;transform-origin:0 50%;transform:rotate(var(--a))}" +
  ".stf-spark i{display:block;height:100%;border-radius:2px;background:var(--stf-accent);transform-origin:0 50%;animation:stf-shoot .7s cubic-bezier(.15,.8,.3,1) forwards}" +
  ".stf-signoff{position:relative;z-index:2;margin:2.4em 0 0;font-size:clamp(11px,1.15cqw,15px);letter-spacing:.01em;opacity:.92}" +
  // links
  ".stf-links{display:flex;flex-wrap:wrap;justify-content:center;align-items:flex-start;gap:clamp(12px,1.4cqw,20px) clamp(8px,1cqw,14px);font-size:clamp(12px,1.3cqw,17px)}" +
  ".stf-item{display:flex;flex-direction:column;align-items:center}" +
  ".stf-item.has-hand{padding-bottom:1.3em}" +
  ".stf-cap{height:1.9em;display:flex;align-items:flex-end;justify-content:center;margin-bottom:.3em}" +
  ".stf-cap-copied{color:var(--stf-accent)}" +
  ".stf-pillwrap{position:relative}" +
  ".stf-pill{display:inline-flex;align-items:center;border:1.5px solid var(--stf-ink);border-radius:999px;padding:.32em .85em;line-height:1.25;white-space:nowrap;color:var(--stf-ink);transition:background .25s,color .25s,transform .25s cubic-bezier(.2,.9,.3,1.4)}" +
  ".stf-pill:hover,.stf-pill:focus-visible{background:var(--stf-ink);color:var(--stf-bg)}" +
  ".stf-pill:active{transform:scale(.96)}" +
  ".stf-hand{position:absolute;left:54%;top:calc(100% - .75em);z-index:2;width:1.45em;height:1.85em;pointer-events:none;animation:stf-bob 2.4s ease-in-out infinite}" +
  ".stf-item:nth-child(4n+3) .stf-hand{animation-delay:-1.2s}" +
  ".stf-hand svg{display:block;width:100%;height:100%;max-width:none;overflow:visible;transition:transform .22s cubic-bezier(.2,.9,.3,1.4)}" +
  ".stf-hand .stf-palm{fill:var(--stf-ink);stroke:var(--stf-bg);stroke-width:1.5;stroke-linejoin:round}" +
  ".stf-hand .stf-knuckle{fill:none;stroke:var(--stf-bg);stroke-width:1.1;stroke-linecap:round}" +
  ".stf-hand .stf-click{fill:none;stroke:var(--stf-ink);stroke-width:1.4;stroke-linecap:round;opacity:0;transition:opacity .2s}" +
  ".stf-pillwrap:hover .stf-hand svg,.stf-pillwrap:focus-within .stf-hand svg{transform:translateY(-14%) scale(.9)}" +
  ".stf-pillwrap:hover .stf-click,.stf-pillwrap:focus-within .stf-click{opacity:1}" +
  ".stf-sep{display:block;flex:none;width:.72em;height:.72em;margin-top:2.55em;max-width:none;fill:var(--stf-ink);transition:transform .6s cubic-bezier(.2,.9,.3,1.3)}" +
  ".stf-links:hover .stf-sep{transform:rotate(45deg) scale(1.15)}" +
  ".stf-phone{margin-top:.75em;font-size:.92em;letter-spacing:.02em;opacity:.92;transition:color .2s}" +
  ".stf-phone:hover{color:var(--stf-accent)}" +
  // the hand lettering
  ".stf-script{display:block;flex:none;max-width:none;overflow:visible}" +
  ".stf .stf-script path{fill:none;stroke:currentColor;stroke-width:.85;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:var(--l,999) var(--l,999);stroke-dashoffset:var(--l,999)}" +
  ".stf.is-in .stf-script path{animation:stf-write .45s cubic-bezier(.6,.05,.3,1) forwards}" +
  "@container (max-width: 640px){.stf-links{flex-direction:column;align-items:center}.stf-sep{display:none}.stf-cap{height:1.6em}}" +
  "@keyframes stf-write{to{stroke-dashoffset:0}}" +
  "@keyframes stf-drop{0%{opacity:0;transform:translateY(-.35em) rotate(-8deg)}60%{opacity:1}100%{opacity:1;transform:none}}" +
  "@keyframes stf-spin{to{transform:rotate(360deg)}}" +
  "@keyframes stf-shoot{0%{transform:translateX(40%) scaleX(.15);opacity:1}100%{transform:translateX(110%) scaleX(.55);opacity:0}}" +
  "@keyframes stf-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(3px)}}" +
  "@keyframes stf-grain{0%{transform:translate(0,0)}20%{transform:translate(-4%,3%)}40%{transform:translate(3%,-5%)}60%{transform:translate(-6%,-2%)}80%{transform:translate(5%,4%)}}" +
  "@media (prefers-reduced-motion: reduce){" +
  ".stf::before,.stf-star-svg,.stf-hand{animation:none}" +
  ".stf:not(.is-in) .stf-ch{opacity:1}" +
  ".stf.is-in .stf-ch{animation:none}" +
  ".stf .stf-script path,.stf .stf-orbit path{stroke-dashoffset:0}" +
  ".stf.is-in .stf-script path,.stf.is-in .stf-orbit path{animation:none}" +
  ".stf-sparks{display:none}" +
  ".stf-star-wrap,.stf-orbit{transform:none;transition:none}" +
  "}"

/**
 * Stamps each path's real length into --l for the draw-in. `pathLength` would
 * do this declaratively, but Chrome ignores it for CSS dash arrays. A
 * non-scaling stroke is dashed in screen pixels, so `screen` measures it there,
 * with headroom in case the section grows after the draw-in.
 */
const useStrokeLengths = (ref: React.RefObject<SVGSVGElement | null>, key: string, screen: boolean = false) =>
  React.useEffect(() => {
    ref.current?.querySelectorAll("path").forEach((p) => {
      const total = p.getTotalLength()
      let len = total
      const m = screen ? p.getScreenCTM() : null
      if (m) {
        len = 0
        let prev: DOMPoint | null = null
        for (let i = 0; i <= 64; i++) {
          const q = p.getPointAtLength((i / 64) * total).matrixTransform(m)
          if (prev) len += Math.hypot(q.x - prev.x, q.y - prev.y)
          prev = q
        }
        len *= 1.6
      }
      p.style.setProperty("--l", String(Math.ceil(len) + 1))
    })
  }, [ref, key, screen])

/** Text in the marker alphabet. `cap` is the cap height in em. */
function Script({
  text,
  seed = 1,
  cap,
  className = "",
  delay = 0,
  step = 0.06,
}: {
  text: string
  seed?: number
  cap: number
  className?: string
  delay?: number
  step?: number
}) {
  const ref = React.useRef<SVGSVGElement>(null)
  const { glyphs, width } = React.useMemo(() => layoutScript(text, seed), [text, seed])
  useStrokeLengths(ref, text)
  const vbW = width + 6
  const vbH = 14
  return (
    <svg
      ref={ref}
      className={"stf-script " + className}
      viewBox={"-3 -2 " + vbW + " " + vbH}
      style={{ height: (cap * vbH) / 10 + "em", width: (cap * vbW) / 10 + "em" }}
      aria-hidden="true"
      focusable="false"
    >
      <g transform="skewX(-12)">
        {glyphs.map((g, i) => (
          <path
            key={i}
            d={g.d}
            transform={"translate(" + g.x + " " + g.dy + ") rotate(" + g.rot + " " + g.w / 2 + " 5)"}
            style={{ animationDelay: delay + i * step + "s" }}
          />
        ))}
      </g>
    </svg>
  )
}

function Monogram({ name }: { name: string }) {
  const { glyphs, width } = React.useMemo(() => layoutScript(initialsOf(name), 0, 1.6, 0), [name])
  const words = name.trim().split(/\s+/).filter(Boolean)
  const lines = [words[0] ?? "", words.slice(1).join(" ")].filter(Boolean)
  const vbW = width + 16
  return (
    <span className="stf-logo">
      <svg className="stf-mark" viewBox={"-8 -2 " + vbW + " 14"} style={{ height: "2.4em", width: (2.4 * vbW) / 14 + "em" }} aria-hidden="true" focusable="false">
        <path className="stf-mark-l" d="M-6 0L-2 5L-6 10" />
        <path className="stf-mark-r" d={"M" + (width + 6) + " 0L" + (width + 2) + " 5L" + (width + 6) + " 10"} />
        <g className="stf-mark-i">
          {glyphs.map((g, i) => (
            <path key={i} d={g.d} transform={"translate(" + g.x + " 0)"} />
          ))}
        </g>
      </svg>
      <span className="stf-name">
        {lines.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </span>
    </span>
  )
}

function Hand() {
  return (
    <span className="stf-hand" aria-hidden="true">
      <svg viewBox="0 -5 26 33" focusable="false">
        <path className="stf-click" d="M10 0.2V-3.4M5.6 1.4L3.3-0.9M14.4 1.4L16.7-0.9" />
        <path className="stf-palm" d={HAND} />
        <path className="stf-knuckle" d="M12 10.5V15M16 11.5V15.5M20 12.5V16" />
      </svg>
    </span>
  )
}

function Sep() {
  return (
    <svg className="stf-sep" viewBox="-6 -6 12 12" aria-hidden="true" focusable="false">
      <path d={SEP} />
    </svg>
  )
}

export default function StarburstThanksFooter({
  name = "Rio Valente",
  logo,
  thanks = DEFAULT_THANKS,
  tagline = "For your time",
  signoff = "and see you soon!!",
  links = DEFAULT_LINKS,
  email = "hello@riovalente.studio",
  phone = "+351 900 000 000",
  copiedLabel = "Copied!",
  height = "100svh",
  background = "#0a0a0a",
  ink = "#f4f4f2",
  accent = "#ff1f5a",
  fontDisplay = "'Archivo Black', 'Arial Black', 'Helvetica Neue', Arial, sans-serif",
  fontSans = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  grain = 0.16,
  starPoints = 10,
  onThanks,
  className = "",
}: StarburstThanksFooterProps) {
  const rootRef = React.useRef<HTMLElement>(null)
  const popRef = React.useRef<HTMLSpanElement>(null)
  const orbitRef = React.useRef<SVGSVGElement>(null)
  useStrokeLengths(orbitRef, "orbit", true)
  const [seen, setSeen] = React.useState(false)
  const [idx, setIdx] = React.useState(0)
  const [burst, setBurst] = React.useState(0)
  const [copied, setCopied] = React.useState(0)

  const words = thanks.filter((w) => w && w.trim()).length ? thanks.filter((w) => w && w.trim()) : ["Thank you"]
  const word = words[idx % words.length]
  const star = React.useMemo(() => starPath(starPoints, 46, 20, 0, 0, 0.22, 2), [starPoints])

  // The lettering and the loop write themselves in once, when first seen.
  React.useEffect(() => {
    const el = rootRef.current
    if (!el || typeof IntersectionObserver === "undefined") {
      setSeen(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true)
          io.disconnect()
        }
      },
      { threshold: 0.2 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  React.useEffect(() => {
    if (!copied) return
    const id = window.setTimeout(() => setCopied(0), 2400)
    return () => clearTimeout(id)
  }, [copied])

  const thank = () => {
    const next = cycle(idx, words.length)
    setIdx(next)
    setBurst((b) => b + 1)
    onThanks?.(next, words[next])
    const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    // A full turn: the spikes are uneven, so anything less would snap back.
    if (!reduced)
      popRef.current?.animate?.(
        [
          { transform: "scale(1) rotate(0deg)" },
          { transform: "scale(1.25) rotate(200deg)", offset: 0.45 },
          { transform: "scale(1) rotate(360deg)" },
        ],
        { duration: 700, easing: "cubic-bezier(.2,.9,.25,1.1)" },
      )
  }

  const copy = async () => {
    if (!email) return
    try {
      await navigator.clipboard.writeText(email)
      setCopied((c) => c + 1)
    } catch {
      window.location.href = "mailto:" + email
    }
  }

  const onMove = (e: React.PointerEvent<HTMLElement>) => {
    const el = rootRef.current
    if (!el || e.pointerType !== "mouse") return
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height) return
    el.style.setProperty("--stf-px", (((e.clientX - r.left) / r.width - 0.5) * 2).toFixed(3))
    el.style.setProperty("--stf-py", (((e.clientY - r.top) / r.height - 0.5) * 2).toFixed(3))
  }
  const onLeave = () => {
    rootRef.current?.style.setProperty("--stf-px", "0")
    rootRef.current?.style.setProperty("--stf-py", "0")
  }

  const style = {
    "--stf-bg": background,
    "--stf-ink": ink,
    "--stf-accent": accent,
    "--stf-display": fontDisplay,
    "--stf-sans": fontSans,
    "--stf-grain": String(grain),
    minHeight: height,
  } as React.CSSProperties

  return (
    <footer
      ref={rootRef}
      className={"stf" + (seen ? " is-in" : "") + (className ? " " + className : "")}
      style={style}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <style>{CSS}</style>
      <div className="stf-fx" aria-hidden="true">
        {SPECKS.map((d, i) => (
          <span key={i} className="stf-dust" style={{ left: d.x + "%", top: d.y + "%", width: d.s, height: d.s, opacity: d.o }} />
        ))}
        <span className="stf-scratch" style={{ left: "81%", top: "64%", height: "9%", transform: "rotate(14deg)" }} />
        <span className="stf-scratch" style={{ left: "13%", top: "22%", height: "6%", transform: "rotate(-8deg)" }} />
      </div>

      <div className="stf-in">
        <div>{logo ?? <Monogram name={name} />}</div>

        <div className="stf-mid">
          <div className="stf-stage">
            <svg ref={orbitRef} className="stf-orbit" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true" focusable="false">
              <path d={ORBIT} vectorEffect="non-scaling-stroke" />
            </svg>

            <span className="stf-star-wrap">
              <button type="button" className="stf-star" onClick={thank} aria-label={"Say thanks another way (now: " + word + ")"}>
                <span ref={popRef} className="stf-star-pop">
                  <svg className="stf-star-svg" viewBox="-52 -52 104 104" aria-hidden="true" focusable="false">
                    <path d={star} vectorEffect="non-scaling-stroke" />
                  </svg>
                </span>
                {burst > 0 && (
                  <span key={burst} className="stf-sparks" aria-hidden="true">
                    {SPARKS.map((s, i) => (
                      <span key={i} className="stf-spark" style={{ "--a": s.a + "deg", width: 62 * s.l + "%" } as React.CSSProperties}>
                        <i />
                      </span>
                    ))}
                  </span>
                )}
              </button>
            </span>

            <h2 className="stf-h">
              <span className="stf-sr">{word + " " + tagline}</span>
              <span key={idx} aria-hidden="true">
                {[...word].map((c, i) => (
                  <span key={i} className="stf-ch" style={{ animationDelay: i * 0.035 + "s" }}>
                    {c === " " ? " " : c}
                  </span>
                ))}
              </span>
            </h2>
            {tagline && <Script text={tagline} seed={3} cap={0.5} className="stf-tag" delay={0.6} />}
          </div>
          {signoff && <p className="stf-signoff">{signoff}</p>}
        </div>

        <nav className="stf-links" aria-label="Contact">
          {links.map((l, i) => (
            <React.Fragment key={i}>
              {i > 0 && <Sep />}
              <div className="stf-item has-hand">
                <span className="stf-cap">{l.caption && <Script text={l.caption} seed={i + 7} cap={0.78} delay={1.2 + i * 0.5} step={0.035} />}</span>
                <span className="stf-pillwrap">
                  <a
                    className="stf-pill"
                    href={l.href || "#"}
                    target={l.href && /^https?:/.test(l.href) ? "_blank" : undefined}
                    rel={l.href && /^https?:/.test(l.href) ? "noopener noreferrer" : undefined}
                    onClick={(e) => {
                      if (!l.href || l.href === "#") e.preventDefault()
                    }}
                  >
                    {l.label}
                  </a>
                  <Hand />
                </span>
              </div>
            </React.Fragment>
          ))}
          {email && (
            <>
              {links.length > 0 && <Sep />}
              <div className="stf-item">
                <span className="stf-cap stf-cap-copied">{copied > 0 && <Script key={copied} text={copiedLabel} seed={11} cap={0.78} step={0.035} />}</span>
                <span className="stf-pillwrap">
                  <button type="button" className="stf-pill" onClick={copy} title="Copy email address">
                    {email}
                  </button>
                </span>
                {phone && (
                  <a className="stf-phone" href={"tel:" + phone.replace(/[^\d+]/g, "")}>
                    {phone}
                  </a>
                )}
                <span className="stf-sr" role="status">
                  {copied ? "Email address copied" : ""}
                </span>
              </div>
            </>
          )}
        </nav>
      </div>
    </footer>
  )
}
