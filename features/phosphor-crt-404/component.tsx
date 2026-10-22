"use client"

import * as React from "react"

/**
 * Phosphor CRT 404 — a "page not found" screen shown on an old pink-phosphor
 * television. The picture is a 200 × 150 pixel scene (an eyebrow between
 * double rules, a chunky extruded error code, music notes, a heart-framed
 * message, and a pyramid between palm trees and clouds) lit up as round
 * phosphor dots with a soft bloom, filling the whole component like the
 * glass of a tube. The grid sizes itself to the screen: 150 rows with more
 * columns on wide screens, about 200 columns with more rows on tall ones,
 * where a striped sun rises into the extra sky.
 *
 * Nothing is downloaded and no web fonts are used. Every glyph and sprite is
 * a bitmap in this file. Each frame is built into a small tone buffer, pushed
 * to a 200 × 150 canvas, scaled up with nearest-neighbour and masked by a
 * round-dot pattern. That small canvas is also the bloom layer.
 *
 * Interaction:
 * - The pyramid is the way out: hover or focus it and it brightens and its
 *   arrows blink. It is a real link (`homeHref`), so it works from the
 *   keyboard and with assistive tech.
 * - Click the screen to change the
 *   channel: static, a vertical roll and torn rows, then the next message.
 * - The pointer leaves a phosphor trail, and the layers shift by whole
 *   pixels for parallax.
 * - The power button collapses the picture to a dot and boots it again.
 *
 * Runs at 30 fps and pauses when off-screen or when the tab is hidden.
 * With prefers-reduced-motion the scene is a still frame: no bobbing, sway,
 * parallax, static or power animation. Channel changes then cut straight to
 * the next message.
 */

// #region screen
// The design size. The live grid keeps 150 rows and adds columns on wide
// screens, or keeps about 200 columns and adds rows on tall ones, so the
// picture fills the screen without cropping or stretching.
export const COLS = 200
export const ROWS = 150

// The size of the grid being drawn. composeScene sets it from the layout.
const G = { w: COLS, h: ROWS }

/** Grid columns and rows for a screen of this size. */
export function gridSize(width: number, height: number): number[] {
  const aspect = width > 0 && height > 0 ? width / height : COLS / ROWS
  if (aspect >= COLS / ROWS) return [Math.min(420, Math.round(ROWS * aspect)), ROWS]
  const cols = Math.max(176, Math.min(COLS, Math.round(ROWS * aspect * 1.5)))
  return [cols, Math.min(560, Math.round(cols / aspect))]
}

/** How many message characters fit between the hearts on a grid this wide. */
export function messageChars(cols: number): number {
  return Math.max(8, Math.min(24, Math.floor((cols - 36) / 6)))
}

// 5 × 7 bitmap font. Each number is one row; bit 4 is the leftmost pixel.
const FONT: { [k: string]: number[] } = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1c, 0x12, 0x11, 0x11, 0x11, 0x12, 0x1c],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x11, 0x19, 0x15, 0x13, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x15, 0x0a],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x11, 0x0a, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  "0": [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  "1": [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  "2": [0x0e, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1f],
  "3": [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  "4": [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  "5": [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  "6": [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  "7": [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  "8": [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  "9": [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  " ": [0, 0, 0, 0, 0, 0, 0],
  "!": [0x04, 0x04, 0x04, 0x04, 0x04, 0x00, 0x04],
  "?": [0x0e, 0x11, 0x01, 0x02, 0x04, 0x00, 0x04],
  ".": [0x00, 0x00, 0x00, 0x00, 0x00, 0x0c, 0x0c],
  ",": [0x00, 0x00, 0x00, 0x00, 0x0c, 0x04, 0x08],
  "'": [0x04, 0x04, 0x08, 0x00, 0x00, 0x00, 0x00],
  "-": [0x00, 0x00, 0x00, 0x1f, 0x00, 0x00, 0x00],
  ":": [0x00, 0x0c, 0x0c, 0x00, 0x0c, 0x0c, 0x00],
  "/": [0x01, 0x01, 0x02, 0x04, 0x08, 0x10, 0x10],
  "&": [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  "#": [0x0a, 0x0a, 0x1f, 0x0a, 0x1f, 0x0a, 0x0a],
  "<": [0x02, 0x04, 0x08, 0x10, 0x08, 0x04, 0x02],
  ">": [0x08, 0x04, 0x02, 0x01, 0x02, 0x04, 0x08],
  "(": [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ")": [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  "+": [0x00, 0x04, 0x04, 0x1f, 0x04, 0x04, 0x00],
  "=": [0x00, 0x00, 0x1f, 0x00, 0x1f, 0x00, 0x00],
  _: [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1f],
}

// Thick 7 × 9 digits for the big code: two-pixel strokes read as chunky
// blocks once scaled.
const BIG: { [k: string]: string[] } = {
  "0": ["0111110", "1111111", "1100011", "1100011", "1100011", "1100011", "1100011", "1111111", "0111110"],
  "1": ["0001100", "0011100", "0111100", "0001100", "0001100", "0001100", "0001100", "0111111", "0111111"],
  "2": ["0111110", "1111111", "1100011", "0000111", "0011110", "0111100", "1110000", "1111111", "1111111"],
  "3": ["1111110", "1111111", "0000011", "0011110", "0011110", "0000011", "0000011", "1111111", "1111110"],
  "4": ["0001110", "0011110", "0110110", "1100110", "1111111", "1111111", "0000110", "0000110", "0000110"],
  "5": ["1111111", "1111111", "1100000", "1111110", "1111111", "0000011", "0000011", "1111111", "1111110"],
  "6": ["0111110", "1111110", "1100000", "1111110", "1111111", "1100011", "1100011", "1111111", "0111110"],
  "7": ["1111111", "1111111", "0000011", "0000110", "0001100", "0011000", "0011000", "0011000", "0011000"],
  "8": ["0111110", "1111111", "1100011", "1111111", "0111110", "1100011", "1100011", "1111111", "0111110"],
  "9": ["0111110", "1111111", "1100011", "1100011", "1111111", "0111111", "0000011", "0111111", "0111110"],
}

const NOTE = ["000110", "000111", "000101", "000100", "000100", "011100", "111100", "111100", "011000"]
const NOTES = ["00111111", "00111111", "00100001", "00100001", "00100001", "01100011", "11100111", "11000110"]
const CLEF = [
  "001100", "010010", "010010", "010100", "001000", "011000", "101100",
  "100110", "100101", "010101", "001110", "000100", "001100",
]
const HEART = ["011000110", "111101111", "111111111", "111111111", "011111110", "001111100", "000111000", "000010000"]
const HEART_SMALL = ["0110110", "1111111", "1111111", "0111110", "0011100", "0001000"]
const ARROW_R = ["100", "110", "111", "110", "100"]
const ARROW_L = ["001", "011", "111", "011", "001"]

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]

/** Ordered-dither threshold in [0, 1) for a pixel. */
export function bayer(x: number, y: number): number {
  return (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16
}

/** A continuous brightness (0..4) dithered down to a whole tone. */
export function ditherTone(v: number, x: number, y: number): number {
  const t = Math.floor(v + bayer(x, y))
  return t < 0 ? 0 : t > 4 ? 4 : t
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Upper-case, drop what the font can't draw, and cut to `max` characters. */
export function normalizeText(s: string, max: number): string {
  let out = ""
  for (const ch of String(s || "").toUpperCase()) out += FONT[ch] ? ch : " "
  return out.replace(/\s+/g, " ").trim().slice(0, Math.max(0, max)).trim()
}

export function textWidth(s: string): number {
  return s.length ? s.length * 6 - 1 : 0
}

export function hexToRgb(hex: string): number[] {
  let h = String(hex || "").trim().replace(/^#/, "")
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  if (!/^[0-9a-f]{6}$/i.test(h)) return [255, 143, 171]
  const n = parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function mix(a: number[], b: number[], t: number): number[] {
  return [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t))
}

/**
 * Five phosphor tones plus the glass behind them. Tone 0 is an unlit dot,
 * still faintly visible like on a real tube. Tone 4 runs hot toward white.
 */
export function toneRamp(phosphor: string): { tones: number[][]; glass: number[] } {
  const p = hexToRgb(phosphor)
  const dark = [13, 6, 8]
  return {
    tones: [mix(dark, p, 0.075), mix(dark, p, 0.3), mix(dark, p, 0.56), mix(dark, p, 0.84), mix(p, [255, 255, 255], 0.28)],
    glass: mix(dark, p, 0.045),
  }
}

export type Rect = { x: number; y: number; w: number; h: number }
export type SceneLayout = {
  cols: number
  rows: number
  cx: number
  /** Rows the upper group (eyebrow, code, message) moves down by. */
  dy: number
  /** Rows the ground (pyramid, palms, clouds) moves down by; it sits on the bottom edge. */
  by: number
  mountain: { topY: number; baseY: number; topW: number; baseW: number }
  label: { x: number; y: number; w: number; h: number; text: string }
  hit: Rect
}

const LABEL_Y = 120
const MOUNTAIN_TOP = 98
const MOUNTAIN_BASE = 148

/** Where everything sits on a grid. The pyramid widens to fit the label. */
export function layoutScene(label: string, cols = COLS, rows = ROWS): SceneLayout {
  const cx = Math.round(cols / 2)
  const by = Math.max(0, rows - ROWS)
  const dy = Math.round(by * 0.5)
  const w = textWidth(label)
  const baseW = Math.min(cols - 4, Math.max(150, w + 60))
  const frac = (LABEL_Y + 3 - MOUNTAIN_TOP) / (MOUNTAIN_BASE - MOUNTAIN_TOP)
  const need = w + 18
  const topW = Math.max(30, Math.min(baseW - 20, Math.ceil((need - baseW * frac) / (1 - frac))))
  const lx = Math.round(cx - w / 2)
  return {
    cols,
    rows,
    cx,
    dy,
    by,
    mountain: { topY: MOUNTAIN_TOP + by, baseY: MOUNTAIN_BASE + by, topW, baseW },
    label: { x: lx, y: LABEL_Y + by, w, h: 7, text: label },
    hit: { x: Math.round(cx - baseW / 2), y: MOUNTAIN_TOP + by - 2, w: baseW, h: ROWS - MOUNTAIN_TOP + 2 },
  }
}

export type Scene = {
  /** Seconds. Frozen for reduced motion. */
  t: number
  code: string
  eyebrow: string
  message: string
  label: string
  /** 0..1, how lit the pyramid is. */
  hover: number
  /** Parallax, -1..1 each. */
  px: number
  py: number
  /** On-screen channel display, "" for none. */
  osd: string
}

function plot(buf: Uint8Array, x: number, y: number, tone: number) {
  x = Math.round(x)
  y = Math.round(y)
  if (x < 0 || y < 0 || x >= G.w || y >= G.h) return
  buf[y * G.w + x] = tone
}

function brighten(buf: Uint8Array, x: number, y: number, tone: number) {
  x = Math.round(x)
  y = Math.round(y)
  if (x < 0 || y < 0 || x >= G.w || y >= G.h) return
  const i = y * G.w + x
  if (buf[i] < tone) buf[i] = tone
}

function drawText(buf: Uint8Array, s: string, x: number, y: number, tone: number) {
  for (let c = 0; c < s.length; c++) {
    const rows = FONT[s[c]] || FONT[" "]
    for (let r = 0; r < 7; r++) {
      for (let b = 0; b < 5; b++) if (rows[r] & (16 >> b)) plot(buf, x + c * 6 + b, y + r, tone)
    }
  }
}

function drawSprite(buf: Uint8Array, rows: string[], x: number, y: number, tone: number) {
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) if (rows[r][c] === "1") plot(buf, x + c, y + r, tone)
  }
}

function fillDisc(buf: Uint8Array, cx: number, cy: number, r: number, tone: number) {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r + r * 0.6) plot(buf, x, y, tone)
    }
  }
}

/** A big glyph as rows of "0"/"1". Digits are thick; anything else falls back to the 5 × 7 font. */
function bigGlyph(ch: string): string[] {
  if (BIG[ch]) return BIG[ch]
  const rows = FONT[ch] || FONT[" "]
  const out = ["0000000"]
  for (const r of rows) {
    let line = "0"
    for (let b = 0; b < 5; b++) line += r & (16 >> b) ? "1" : "0"
    out.push(line + "0")
  }
  return out.concat(["0000000"])
}

/** Scale for the big code so it never runs past 150 pixels. */
export function codeScale(code: string): number {
  const n = Math.max(1, code.length)
  for (let s = 4; s > 1; s--) if (n * 7 * s + (n - 1) * (s + 2) <= 150) return s
  return 1
}

function drawCode(buf: Uint8Array, code: string, cx: number, y: number) {
  const s = codeScale(code)
  const gap = s + 2
  const total = code.length * 7 * s + (code.length - 1) * gap
  const x0 = Math.round(cx - total / 2)
  const depth = s + 2
  const glyphs = [...code].map(bigGlyph)
  const at = (g: string[], gx: number, gy: number) => gy >= 0 && gy < 9 && gx >= 0 && gx < 7 && g[gy][gx] === "1"

  // Extrusion first, back to front: a striped side that falls down-right.
  for (let d = depth; d >= 1; d--) {
    const tone = d === depth ? 1 : d % 2 ? 2 : 1
    const ox = Math.ceil(d * 0.5)
    glyphs.forEach((g, i) => {
      const gx0 = x0 + i * (7 * s + gap)
      for (let gy = 0; gy < 9; gy++) {
        for (let gx = 0; gx < 7; gx++) {
          if (!at(g, gx, gy)) continue
          for (let sy = 0; sy < s; sy++) for (let sx = 0; sx < s; sx++) plot(buf, gx0 + gx * s + sx + ox, y + gy * s + sy + d, tone)
        }
      }
    })
  }
  // The face: bright, with a hot bevel along every top edge.
  glyphs.forEach((g, i) => {
    const gx0 = x0 + i * (7 * s + gap)
    for (let gy = 0; gy < 9; gy++) {
      for (let gx = 0; gx < 7; gx++) {
        if (!at(g, gx, gy)) continue
        const topEdge = !at(g, gx, gy - 1)
        // Only the outer left contour catches light, not the inside of a counter.
        const leftEdge = !at(g, gx - 1, gy) && ![...g[gy].slice(0, gx)].includes("1")
        for (let sy = 0; sy < s; sy++) {
          for (let sx = 0; sx < s; sx++) {
            const hot = (topEdge && sy === 0) || (leftEdge && sx === 0)
            plot(buf, gx0 + gx * s + sx, y + gy * s + sy, hot ? 4 : 3)
          }
        }
      }
    }
  })
}

function drawMountain(buf: Uint8Array, L: SceneLayout, hover: number, ox: number, oy: number) {
  const { topY, baseY, topW, baseW } = L.mountain
  const H = baseY - topY
  for (let y = topY; y <= baseY + 2; y++) {
    const f = Math.min(1, (y - topY) / H)
    const half = (topW + (baseW - topW) * f) / 2
    const left = L.cx - half
    for (let x = Math.floor(left); x <= Math.ceil(L.cx + half); x++) {
      const u = (x - left) / (half * 2)
      // Lit from the upper left; the right flank falls into shade.
      let v = 2.95 - 1.45 * u + 0.4 * (1 - f) + hover * 1.15
      if (y === topY) v = 4
      if (u < 0.035) v = 4
      plot(buf, x + ox, y + oy, ditherTone(v, x, y))
    }
  }
  drawText(buf, L.label.text, L.label.x + ox, L.label.y + oy, 0)
}

function drawPalm(buf: Uint8Array, bx: number, by: number, h: number, dir: number, sway: number) {
  const tx = bx + dir * h * 0.3
  const ty = by - h
  const cx = bx + dir * h * 0.02
  const cy = by - h * 0.55
  const steps = Math.ceil(h * 1.6)
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = (1 - t) * (1 - t) * bx + 2 * (1 - t) * t * cx + t * t * tx
    const y = (1 - t) * (1 - t) * by + 2 * (1 - t) * t * cy + t * t * ty
    const w = Math.round(4 - t * 2)
    const ring = Math.round(y) % 3 === 0
    for (let k = 0; k < w; k++) {
      const edge = dir > 0 ? k === 0 : k === w - 1
      plot(buf, x + k - w / 2, y, ring ? 1 : edge ? 4 : k === w - 1 || k === 0 ? 2 : 3)
    }
  }
  const len = h * 0.55
  const fronds = [
    [-172, 1], [-140, 0.92], [-104, 0.62], [-62, 0.95], [-22, 1], [18, 0.78], [196, 0.8],
  ]
  for (let f = 0; f < fronds.length; f++) {
    const a = ((dir > 0 ? fronds[f][0] : 180 - fronds[f][0]) * Math.PI) / 180
    const l = len * fronds[f][1]
    const n = Math.ceil(l * 1.4)
    const wob = Math.sin(sway + f * 0.9)
    for (let k = 0; k <= n; k++) {
      const t = k / n
      const x = tx + Math.cos(a) * l * t + wob * t * t * 1.6
      const y = ty + Math.sin(a) * l * t + l * t * t * 0.5 + Math.cos(sway + f) * t * t * 0.8
      plot(buf, x, y, t < 0.55 ? 4 : 3)
      if (t < 0.8) plot(buf, x, y + 1, 3)
      if (k % 2 === 0 && t > 0.12 && t < 0.97) {
        const leaf = Math.round((1 - t) * 3 + 1)
        const side = Math.cos(a) >= 0 ? 1 : -1
        for (let j = 1; j <= leaf; j++) plot(buf, x - side * j * 0.5, y + 1 + j, 2)
      }
    }
  }
  fillDisc(buf, tx - 1.5, ty + 2.5, 1.2, 2)
  fillDisc(buf, tx + 1.5, ty + 2.5, 1.2, 2)
}

// [x, y, r] for the left bank, x relative to the centre. Mirrored for the
// right bank, and repeated outward on wide screens.
const CLOUDS = [
  [-96, 144, 7], [-87, 139, 7.5], [-78, 142, 6], [-70, 145, 7], [-59, 147, 6], [-49, 149, 5],
  [-37, 148, 4], [-29, 144, 5], [-21, 146, 4], [-13, 149, 4],
]

function drawClouds(buf: Uint8Array, L: SceneLayout, drift: number[], ox: number, oy: number) {
  // A cloud anchored in each bottom corner, so no shape of screen leaves one bare.
  const discs: number[][] = [[-1 + drift[0], L.rows - 3, 7], [L.cols + drift[1], L.rows - 4, 7.5]]
  for (let k = 0; L.cx - 13 - k * 88 >= -10; k++) {
    CLOUDS.forEach((c, i) => {
      const lift = k % 2 ? (i % 3) - 1 : 0
      discs.push([L.cx + c[0] - k * 88 + drift[i % drift.length], c[1] + L.by + lift, c[2]])
      discs.push([L.cx - c[0] + k * 88 - drift[(i + 2) % drift.length], c[1] + L.by + (i % 2) - lift, c[2]])
    })
  }
  for (const [x, y, r] of discs) fillDisc(buf, x + ox + 1, y + oy + 1, r, 2)
  for (const [x, y, r] of discs) fillDisc(buf, x + ox, y + oy, r - 0.6, 3)
  for (const [x, y, r] of discs) fillDisc(buf, x + ox - 0.8, y + oy - 0.8, r - 1.9, 4)
}

// Palms by distance from the centre: [distance, height, lean]. Lean +1 is
// toward the centre on the left. More stand outward on wide screens.
function palmsFor(L: SceneLayout): number[][] {
  const out = [[64, 46, 1], [81, 27, -1]]
  for (let k = 1, d = 81 + 46; L.cx - d >= -6; k++, d += 46) out.push([d, k % 2 ? 36 : 27, k % 2 ? 1 : -1])
  return out
}

// Normalised: [u, v, phase].
const STARS = (() => {
  const rnd = mulberry32(404)
  const out: number[][] = []
  for (let i = 0; i < 90; i++) out.push([rnd(), rnd(), rnd() * 6.28])
  return out
})()

/** A striped sun rising behind the pyramid, for tall screens with sky to spare. */
function drawSun(buf: Uint8Array, cx: number, cy: number, r: number, t: number) {
  for (let y = Math.floor(cy - r); y <= cy; y++) {
    const f = (y - (cy - r)) / r
    const half = Math.sqrt(Math.max(0, r * r - (cy - y) * (cy - y)))
    const cut = f > 0.42 && ((((y - t * 3) % 8) + 8) % 8) < (f - 0.42) * 7
    if (cut) continue
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) plot(buf, x, y, ditherTone(3.5 - f * 1.3, x, y))
  }
}

/** Paint one frame of the picture into `buf` (COLS × ROWS tones, 0..4). */
export function composeScene(buf: Uint8Array, scene: Scene, L: SceneLayout) {
  G.w = L.cols
  G.h = L.rows
  buf.fill(0)
  const { t, px, py } = scene
  const off = (k: number, down = L.dy) => [Math.round(px * k), Math.round(py * k * 0.5) + down]
  const skyRows = L.mountain.topY - 4

  // Sky sparkles, about one per 900 pixels of sky, kept off the code.
  {
    const [ox, oy] = off(0.6, 0)
    const n = Math.min(STARS.length, Math.round((L.cols * skyRows) / 840))
    for (let i = 0; i < n; i++) {
      const [u, v, ph] = STARS[i]
      const x = Math.round(4 + u * (L.cols - 8))
      const y = Math.round(3 + v * (skyRows - 3))
      if (Math.abs(x - L.cx) < 84 && y > L.dy + 8 && y < L.dy + 92) continue
      const tw = Math.sin(t * 1.7 + ph * 3)
      if (tw > 0.72) {
        plot(buf, x + ox, y + oy, 4)
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) plot(buf, x + ox + dx, y + oy + dy, 2)
      } else plot(buf, x + ox, y + oy, tw > 0 ? 2 : 1)
    }
  }

  // Eyebrow between double rules.
  if (scene.eyebrow) {
    const [ox, oy] = off(2)
    const w = textWidth(scene.eyebrow)
    const x = Math.round(L.cx - w / 2) + ox
    const y = 12 + oy
    drawText(buf, scene.eyebrow, x, y, 4)
    for (let i = 0; i < 11; i++) {
      for (const ry of [2, 4]) {
        plot(buf, x - 5 - i, y + ry, 3)
        plot(buf, x + w + 4 + i, y + ry, 3)
      }
    }
  }

  // Music notes, bobbing in a loose ring around the code.
  {
    const [ox, oy] = off(3.2)
    const notes: [string[], number, number][] = [
      [CLEF, -60, 25], [NOTE, -78, 46], [NOTES, -68, 63],
      [NOTE, 64, 24], [NOTES, 68, 43], [CLEF, 56, 58],
    ]
    notes.forEach(([sprite, x, y], i) => {
      const bob = Math.round(Math.sin(t * 2.1 + i * 1.3) * 1.6)
      const lit = Math.sin(t * 1.3 + i * 2.1) > 0.55 ? 4 : 3
      drawSprite(buf, sprite, L.cx + x + ox, y + oy + bob, lit)
    })
  }

  // The code.
  {
    const [ox, oy] = off(2.5)
    drawCode(buf, scene.code, L.cx + ox, 27 + oy)
  }

  // Message between two beating hearts.
  if (scene.message) {
    const [ox, oy] = off(1.6)
    const w = textWidth(scene.message)
    const x = Math.round(L.cx - w / 2) + ox
    const y = 81 + oy
    drawText(buf, scene.message, x, y, 4)
    const beat = (t * 1.25) % 1 < 0.18
    const heart = beat ? HEART : HEART_SMALL
    const hw = heart[0].length
    const hy = y + 3 - Math.floor(heart.length / 2)
    drawSprite(buf, heart, x - 7 - Math.ceil(hw / 2) - 3, hy, 4)
    drawSprite(buf, heart, x + w + 7 - Math.floor(hw / 2) + 3, hy, 4)
  }

  // On tall screens, a sun fills the sky between the message and the pyramid.
  {
    const room = L.mountain.topY - (L.dy + 92)
    if (room >= 34) {
      const [ox, oy] = off(0.8, 0)
      drawSun(buf, L.cx + ox, L.mountain.topY + 8 + oy, Math.min(L.cols * 0.34, room + 4), t)
    }
  }

  // Pyramid — the link home.
  {
    const [ox, oy] = off(1, 0)
    drawMountain(buf, L, scene.hover, ox, oy)
    if (scene.hover > 0.5 && (t * 2.4) % 1 < 0.62) {
      drawSprite(buf, ARROW_R, L.label.x - 7 + ox, L.label.y + 1 + oy, 0)
      drawSprite(buf, ARROW_L, L.label.x + L.label.w + 4 + ox, L.label.y + 1 + oy, 0)
    }
  }

  // Palms.
  {
    const [ox, oy] = off(2.2, 0)
    palmsFor(L).forEach(([d, h, lean], i) => {
      const base = L.rows - (h > 40 ? 1 : 0)
      drawPalm(buf, L.cx - d + ox, base + oy, h, lean, t * 0.9 + i * 1.7)
      drawPalm(buf, L.cx + d + ox, base + oy, h, -lean, t * 0.9 + i * 1.7 + 0.8)
    })
  }

  // Cloud banks drift a little in front of everything.
  {
    const [ox, oy] = off(3.6, 0)
    const drift = [0, 1, 2].map((i) => Math.round(Math.sin(t * 0.32 + i * 2) * 2))
    drawClouds(buf, L, drift, ox, oy)
  }

  // Channel display, top left, the way a set shows it after you press CH.
  if (scene.osd) {
    drawText(buf, scene.osd, 6, 5, 4)
    for (let i = 0; i < textWidth(scene.osd); i++) brighten(buf, 6 + i, 13, 2)
  }
}

/**
 * The signal between the picture and the tube. Strength 0 copies `src`
 * exactly. Toward 1 it rolls the frame, tears rows sideways and buries it in
 * snow.
 */
export function applySignal(src: Uint8Array, dst: Uint8Array, strength: number, t: number, seed: number, cols = G.w, rows = G.h) {
  if (strength <= 0) {
    dst.set(src)
    return
  }
  const rnd = mulberry32(seed)
  const roll = Math.round(strength * strength * rows * 0.35)
  for (let y = 0; y < rows; y++) {
    let tear = Math.round(Math.sin(y * 0.21 + t * 37) * strength * 7)
    if (rnd() < strength * 0.14) tear += Math.round((rnd() - 0.5) * 34 * strength)
    const sy = (y + roll) % rows
    const bar = Math.abs(((t * 3) % 1) * rows - y) < 3 && strength > 0.3
    for (let x = 0; x < cols; x++) {
      const sx = (((x - tear) % cols) + cols) % cols
      let v = src[sy * cols + sx]
      if (rnd() < strength * 0.85) {
        const r = rnd()
        v = r < 0.45 ? 0 : r < 0.7 ? 1 : r < 0.86 ? 2 : r < 0.95 ? 3 : 4
      }
      if (bar && v < 4) v++
      dst[y * cols + x] = v
    }
  }
}

/** The channel-change envelope: a fast hit of static that settles. `e` is 0..1 of its duration. */
export function staticEnvelope(e: number): number {
  if (e < 0 || e >= 1) return 0
  return e < 0.15 ? e / 0.15 : Math.pow(1 - (e - 0.15) / 0.85, 1.5)
}

export function osdLabel(channel: number): string {
  const n = ((Math.round(channel) % 100) + 100) % 100
  return "CH " + (n < 10 ? "0" : "") + n
}
// #endregion

const DEFAULT_MESSAGES = ["SIGNAL LOST", "THIS PAGE DRIFTED OFF", "TRY ANOTHER CHANNEL", "OR HEAD BACK HOME"]
const RETUNE_SECONDS = 0.62
const BOOT_SECONDS = 0.9
const OSD_SECONDS = 2.4

const CSS =
  ".p4c-root{--p4c-glow:#ff8fab}" +
  ".p4c-pic{transform-origin:50% 50%}" +
  ".p4c-pic[data-power=on]{animation:p4c-on .9s cubic-bezier(.2,.7,.2,1) both}" +
  ".p4c-pic[data-power=off]{animation:p4c-off .55s cubic-bezier(.6,0,.9,.4) both}" +
  "@keyframes p4c-on{0%{transform:scale(.002,.004);opacity:0;filter:brightness(4)}12%{transform:scale(1,.004);opacity:1;filter:brightness(4)}46%{transform:scale(1,1);filter:brightness(1.8)}100%{transform:scale(1,1);filter:brightness(1)}}" +
  "@keyframes p4c-off{0%{transform:scale(1,1);filter:brightness(1)}40%{transform:scale(1,.006);filter:brightness(3)}75%{transform:scale(.004,.006);opacity:1;filter:brightness(5)}100%{transform:scale(0,0);opacity:0}}" +
  ".p4c-dot{opacity:0}" +
  ".p4c-dot[data-power=off]{animation:p4c-dot 1.8s .45s ease-out both}" +
  "@keyframes p4c-dot{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(.4)}}" +
  ".p4c-flicker{animation:p4c-flicker .13s steps(2) infinite}" +
  "@keyframes p4c-flicker{0%{opacity:1}100%{opacity:.975}}" +
  ".p4c-roll{animation:p4c-roll 7.5s linear infinite}" +
  "@keyframes p4c-roll{0%{transform:translateY(-40%)}100%{transform:translateY(360%)}}" +
  ".p4c-knob{transition:transform .18s cubic-bezier(.2,.7,.2,1),box-shadow .18s}" +
  ".p4c-knob:active{transform:translateY(1px) scale(.97)}" +
  ".p4c-knob:focus-visible,.p4c-link:focus-visible{outline:2px dashed var(--p4c-glow);outline-offset:3px}" +
  ".p4c-led[data-busy=true]{animation:p4c-led .12s steps(2) 5}" +
  "@keyframes p4c-led{0%{opacity:1}100%{opacity:.25}}" +
  "@media (prefers-reduced-motion:reduce){.p4c-pic[data-power],.p4c-dot[data-power],.p4c-flicker,.p4c-roll,.p4c-led[data-busy=true]{animation:none}.p4c-pic[data-power=off]{opacity:0}}"

let audio: AudioContext | null = null

/** A short burst of tube noise. Only ever called from a click, so it never autoplays. */
function playStatic(kind: "tune" | "off" | "on", volume: number) {
  try {
    if (!audio) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      audio = new Ctor()
    }
    const ctx = audio
    if (ctx.state === "suspended") void ctx.resume()
    const now = ctx.currentTime
    const dur = kind === "tune" ? 0.42 : 0.22
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    const noise = ctx.createBufferSource()
    noise.buffer = buffer
    const filter = ctx.createBiquadFilter()
    filter.type = kind === "off" ? "lowpass" : "bandpass"
    filter.frequency.value = kind === "off" ? 900 : 2600
    filter.Q.value = 0.7
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(volume, now + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur)
    noise.connect(filter).connect(gain).connect(ctx.destination)
    noise.start(now)
    noise.stop(now + dur)
    if (kind !== "tune") {
      const tone = ctx.createOscillator()
      const tg = ctx.createGain()
      tone.frequency.setValueAtTime(kind === "off" ? 140 : 70, now)
      tone.frequency.exponentialRampToValueAtTime(kind === "off" ? 38 : 160, now + 0.2)
      tg.gain.setValueAtTime(volume * 0.9, now)
      tg.gain.exponentialRampToValueAtTime(0.0001, now + 0.24)
      tone.connect(tg).connect(ctx.destination)
      tone.start(now)
      tone.stop(now + 0.26)
    }
  } catch {
    // No audio is fine.
  }
}

function rgb(c: number[], a = 1) {
  return a === 1 ? "rgb(" + c.join(",") + ")" : "rgba(" + c.join(",") + "," + a + ")"
}

export default function PhosphorCrt404({
  code = "404",
  eyebrow = "PAGE NOT FOUND",
  messages = DEFAULT_MESSAGES,
  homeLabel = "TAKE ME HOME",
  homeHref = "/",
  onHome,
  onRetune,
  phosphor = "#ff8fab",
  channel = 4,
  brand = "",
  hint = "Click the screen to change the channel",
  sound = true,
  height = "100svh",
  className = "",
  style,
}: PhosphorCrt404Props) {
  const screenRef = React.useRef(null as HTMLElement | null)
  const fitRef = React.useRef(null as HTMLDivElement | null)
  const dotRef = React.useRef(null as HTMLCanvasElement | null)
  const lowRef = React.useRef(null as HTMLCanvasElement | null)

  const [msgIndex, setMsgIndex] = React.useState(0)
  const [ch, setCh] = React.useState(channel)
  const [power, setPower] = React.useState(true)
  const [busy, setBusy] = React.useState(0)
  const [dims, setDims] = React.useState([COLS, ROWS])
  const [cols, rows] = dims

  const cleanCode = normalizeText(code, 5).replace(/ /g, "") || "404"
  const cleanEyebrow = normalizeText(eyebrow, 24)
  const cleanLabel = normalizeText(homeLabel, 18) || "HOME"
  const list = (messages && messages.length ? messages : DEFAULT_MESSAGES).map((m) => normalizeText(m, messageChars(cols)))
  const layout = React.useMemo(() => layoutScene(cleanLabel, cols, rows), [cleanLabel, cols, rows])
  const ramp = React.useMemo(() => toneRamp(phosphor), [phosphor])
  const titleId = React.useId()

  // Everything the frame loop reads, refreshed every render.
  const live = React.useRef({
    code: cleanCode, eyebrow: cleanEyebrow, list, layout, ramp, sound,
    msg: 0, ch: channel, power: true, onRetune,
  })
  live.current = { ...live.current, code: cleanCode, eyebrow: cleanEyebrow, list, layout, ramp, sound, onRetune }

  // Mutable animation state.
  const st = React.useRef({
    hover: 0, hoverTarget: 0, px: 0, py: 0, tpx: 0, tpy: 0,
    retuneAt: -1, swapped: true, bootAt: 0, osdUntil: 0, offAt: -1, reduced: false, start: 0,
  })

  const retune = React.useCallback(() => {
    const s = st.current
    const l = live.current
    if (!l.power) return
    const now = performance.now() / 1000
    if (s.reduced) {
      l.msg = (l.msg + 1) % l.list.length
      l.ch = l.ch + 1
      setMsgIndex(l.msg)
      setCh(l.ch)
      s.osdUntil = now + OSD_SECONDS
      l.onRetune?.(l.msg)
    } else {
      s.retuneAt = now
      s.swapped = false
    }
    setBusy((b) => b + 1)
    if (l.sound) playStatic("tune", 0.07)
  }, [])

  const togglePower = React.useCallback(() => {
    const s = st.current
    const l = live.current
    const now = performance.now() / 1000
    l.power = !l.power
    setPower(l.power)
    if (l.power) {
      s.bootAt = now
      s.osdUntil = now + OSD_SECONDS
      s.offAt = -1
    } else s.offAt = now
    if (l.sound) playStatic(l.power ? "on" : "off", 0.08)
  }, [])

  React.useEffect(() => {
    const screen = screenRef.current
    const fit = fitRef.current
    const dot = dotRef.current
    const low = lowRef.current
    if (!screen || !fit || !dot || !low) return
    const dctx = dot.getContext("2d")
    const lctx = low.getContext("2d")
    if (!dctx || !lctx) return
    const s = st.current
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    s.reduced = mq.matches
    const onMotion = () => (s.reduced = mq.matches)
    mq.addEventListener("change", onMotion)

    // Buffers follow the grid, which follows the screen's shape.
    let gw = 0
    let gh = 0
    let image = lctx.createImageData(1, 1)
    let scene = new Uint8Array(0)
    let out = new Uint8Array(0)
    let trail = new Float32Array(0)

    // The dot mask is drawn once per size at device resolution, one dot per
    // picture pixel, so the dots stay crisp at any (fractional) cell size.
    const mask = document.createElement("canvas")
    const mctx = mask.getContext("2d")

    const resize = () => {
      const r = screen.getBoundingClientRect()
      if (r.width < 4 || r.height < 4 || !mctx) return
      const [c, h] = gridSize(r.width, r.height)
      if (c !== gw || h !== gh) {
        gw = c
        gh = h
        low.width = gw
        low.height = gh
        image = lctx.createImageData(gw, gh)
        scene = new Uint8Array(gw * gh)
        out = new Uint8Array(gw * gh)
        trail = new Float32Array(gw * gh)
        setDims([gw, gh])
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      // Fill the glass: the picture runs a hair past the edges, like overscan.
      const scale = Math.max(r.width / gw, r.height / gh) * 1.01
      fit.style.width = gw * scale + "px"
      fit.style.height = gh * scale + "px"
      dot.width = mask.width = Math.max(gw, Math.round(gw * scale * dpr))
      dot.height = mask.height = Math.max(gh, Math.round(gh * scale * dpr))
      const cw = dot.width / gw
      const chh = dot.height / gh
      mctx.clearRect(0, 0, mask.width, mask.height)
      mctx.fillStyle = "#fff"
      if (cw >= 3) {
        const rad = Math.min(cw, chh) * 0.45
        mctx.beginPath()
        for (let y = 0; y < gh; y++) {
          for (let x = 0; x < gw; x++) {
            const cx = (x + 0.5) * cw
            const cy = (y + 0.5) * chh
            mctx.moveTo(cx + rad, cy)
            mctx.arc(cx, cy, rad, 0, Math.PI * 2)
          }
        }
        mctx.fill()
      } else {
        for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) mctx.fillRect(x * cw, y * chh, cw * 0.7, chh * 0.7)
      }
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(screen)

    let visible = true
    const io = new IntersectionObserver((e) => (visible = e[0]?.isIntersecting ?? true))
    io.observe(screen)

    const onMove = (e: PointerEvent) => {
      const fr = fit.getBoundingClientRect()
      // Powered off, the picture is scaled to a dot: a near-zero rect would send the loop below to Infinity.
      if (!live.current.power || fr.width < 1 || fr.height < 1) return
      const gx =((e.clientX - fr.left) / fr.width) * gw
      const gy = ((e.clientY - fr.top) / fr.height) * gh
      const R = 6
      for (let y = Math.floor(gy - R); y <= gy + R; y++) {
        for (let x = Math.floor(gx - R); x <= gx + R; x++) {
          if (x < 0 || y < 0 || x >= gw || y >= gh) continue
          const v = 1 - Math.hypot(x - gx, y - gy) / R
          const i = y * gw + x
          if (v > trail[i]) trail[i] = v
        }
      }
      const rr = screen.getBoundingClientRect()
      s.tpx = Math.max(-1, Math.min(1, ((e.clientX - rr.left) / rr.width) * 2 - 1))
      s.tpy = Math.max(-1, Math.min(1, ((e.clientY - rr.top) / rr.height) * 2 - 1))
    }
    const onLeave = () => {
      s.tpx = 0
      s.tpy = 0
    }
    screen.addEventListener("pointermove", onMove)
    screen.addEventListener("pointerleave", onLeave)

    s.start = performance.now() / 1000
    s.bootAt = s.start
    s.osdUntil = s.start + OSD_SECONDS
    let raf = 0
    let last = 0
    let frameNo = 0

    const frame = (ms: number) => {
      raf = requestAnimationFrame(frame)
      if (!visible || document.hidden || ms - last < 1000 / 30 - 2) return
      const l = live.current
      // A resize lands a render later than the buffers; skip until the layout catches up.
      if (l.layout.cols !== gw || l.layout.rows !== gh) return
      last = ms
      frameNo++
      const now = ms / 1000
      if (!l.power && s.offAt > 0 && now - s.offAt > 0.7) return
      const reduced = s.reduced
      const t = reduced ? 1.3 : now - s.start

      s.hover += (s.hoverTarget - s.hover) * (reduced ? 1 : 0.28)
      s.px += ((reduced ? 0 : s.tpx) - s.px) * 0.12
      s.py += ((reduced ? 0 : s.tpy) - s.py) * 0.12

      // Channel change: swap the message under the thickest static.
      let strength = 0
      if (s.retuneAt > 0) {
        const e = (now - s.retuneAt) / RETUNE_SECONDS
        strength = staticEnvelope(e)
        if (!s.swapped && e >= 0.3) {
          s.swapped = true
          l.msg = (l.msg + 1) % l.list.length
          l.ch = l.ch + 1
          s.osdUntil = now + OSD_SECONDS
          setMsgIndex(l.msg)
          setCh(l.ch)
          l.onRetune?.(l.msg)
        }
        if (e >= 1) s.retuneAt = -1
      }
      if (!reduced) {
        const b = (now - s.bootAt) / BOOT_SECONDS
        if (b < 1) strength = Math.max(strength, (1 - b) * (1 - b) * 0.65)
      }

      const osdLeft = s.osdUntil - now
      const osd = osdLeft > 0 && (osdLeft > 0.6 || reduced || (osdLeft * 4) % 1 > 0.35) ? osdLabel(l.ch) : ""
      composeScene(
        scene,
        {
          t, code: l.code, eyebrow: l.eyebrow, message: l.list[l.msg % l.list.length] || "",
          label: l.layout.label.text, hover: s.hover, px: s.px, py: s.py, osd,
        },
        l.layout,
      )
      applySignal(scene, out, reduced ? 0 : strength, t, frameNo * 7919 + 1, gw, gh)

      // Phosphor trail, and a faint idle shimmer.
      const shimmer = reduced ? null : mulberry32(frameNo)
      for (let i = 0; i < out.length; i++) {
        const v = trail[i]
        if (v > 0.01) {
          if (v > 0.7 && out[i] < 2) out[i] = 2
          else if (v > 0.2 && out[i] < 4) out[i]++
          trail[i] = v * 0.86
        } else if (v) trail[i] = 0
        if (shimmer && out[i] && out[i] < 4 && shimmer() < 0.003) out[i]++
      }

      const tones = l.ramp.tones
      const d = image.data
      for (let i = 0, j = 0; i < out.length; i++, j += 4) {
        const c = tones[out[i]]
        d[j] = c[0]
        d[j + 1] = c[1]
        d[j + 2] = c[2]
        d[j + 3] = 255
      }
      lctx.putImageData(image, 0, 0)

      dctx.globalCompositeOperation = "copy"
      dctx.imageSmoothingEnabled = false
      dctx.drawImage(low, 0, 0, dot.width, dot.height)
      dctx.globalCompositeOperation = "destination-in"
      dctx.drawImage(mask, 0, 0)
      dctx.globalCompositeOperation = "source-over"
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      mq.removeEventListener("change", onMotion)
      screen.removeEventListener("pointermove", onMove)
      screen.removeEventListener("pointerleave", onLeave)
    }
  }, [])

  const hit = layout.hit
  const ink = hexToRgb(phosphor)
  const glow = rgb(ink)
  const message = list[msgIndex % list.length] || ""
  const pill =
    "p4c-knob inline-flex h-8 select-none items-center justify-center rounded-full font-mono text-[11px] font-semibold tracking-[0.2em] backdrop-blur-md disabled:opacity-40"
  const pillStyle = {
    color: rgb(ink, 0.85),
    background: "rgba(20,10,13,.55)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.08), 0 0 0 1px " + rgb(ink, 0.28) + ", 0 6px 18px rgba(0,0,0,.45)",
  }

  return (
    <section
      ref={screenRef}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a, button")) return
        retune()
      }}
      className={"p4c-root relative w-full cursor-pointer overflow-hidden " + className}
      style={{
        height,
        background: rgb(ramp.glass),
        isolation: "isolate",
        ["--p4c-glow" as string]: glow,
        ...style,
      }}
      aria-labelledby={titleId}
    >
      <style>{CSS}</style>
      <h1 id={titleId} className="sr-only">
        {"Error " + cleanCode + " — " + (cleanEyebrow || "page not found").toLowerCase()}
      </h1>
      <p className="sr-only" aria-live="polite">
        {power ? osdLabel(ch) + ": " + message.toLowerCase() : "Screen off"}
      </p>

      {/* The picture. */}
      <div className="p4c-pic absolute inset-0 flex items-center justify-center" data-power={power ? "on" : "off"}>
        <div className="p4c-flicker relative shrink-0" ref={fitRef}>
          <canvas
            ref={dotRef}
            aria-hidden
            className="absolute left-0 top-0 block"
            style={{ width: "100%", height: "100%", maxWidth: "none" }}
          />
          <canvas
            ref={lowRef}
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 block"
            style={{
              width: "100%",
              height: "100%",
              maxWidth: "none",
              filter: "blur(5px) saturate(1.25) contrast(1.35)",
              mixBlendMode: "screen",
              opacity: 0.6,
            }}
          />
          <a
            href={homeHref}
            onClick={(e) => onHome?.(e)}
            onPointerEnter={() => (st.current.hoverTarget = 1)}
            onPointerLeave={() => (st.current.hoverTarget = 0)}
            onFocus={() => (st.current.hoverTarget = 1)}
            onBlur={() => (st.current.hoverTarget = 0)}
            className="p4c-link absolute block rounded-sm"
            style={{
              left: (hit.x / cols) * 100 + "%",
              top: (hit.y / rows) * 100 + "%",
              width: (hit.w / cols) * 100 + "%",
              height: (hit.h / rows) * 100 + "%",
              clipPath:
                "polygon(" + (50 - (layout.mountain.topW / hit.w) * 50) + "% 0, " + (50 + (layout.mountain.topW / hit.w) * 50) + "% 0, 100% 100%, 0 100%)",
            }}
          >
            <span className="sr-only">{homeLabel}</span>
          </a>
        </div>
      </div>

      {/* Afterglow when the screen is switched off. */}
      <div
        aria-hidden
        className="p4c-dot pointer-events-none absolute left-1/2 top-1/2 -ml-[1.5vmin] -mt-[1.5vmin] h-[3vmin] w-[3vmin] rounded-full"
        data-power={power ? "on" : "off"}
        style={{ background: "radial-gradient(closest-side, #fff, " + glow + " 40%, transparent)" }}
      />

      {/* Glass: rolling refresh band, tube vignette, reflection. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="p4c-roll absolute inset-x-0 top-0 h-[22%] motion-reduce:hidden"
          style={{ background: "linear-gradient(180deg, transparent, " + rgb(ink, power ? 0.045 : 0) + ", transparent)" }}
        />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(130% 125% at 50% 50%, transparent 50%, rgba(0,0,0,.38) 76%, rgba(0,0,0,.78) 100%)",
          boxShadow: "inset 0 0 90px rgba(0,0,0,.65), inset 0 0 14px rgba(0,0,0,.8)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(165deg, rgba(255,255,255,.07) 0%, rgba(255,255,255,.02) 20%, transparent 36%), radial-gradient(55% 28% at 28% 4%, rgba(255,255,255,.05), transparent 70%)",
        }}
      />

      {/* Controls in the top-right corner, over dark sky; the channel display has the top-left. */}
      <div className="absolute right-0 top-0 z-10 flex flex-col items-end gap-2 p-4 sm:p-6">
        <div className="flex items-center gap-2.5">
          {brand ? (
            <span
              className="mr-2 hidden select-none font-mono text-[10px] font-semibold uppercase tracking-[0.32em] sm:inline"
              style={{ color: rgb(ink, 0.5) }}
            >
              {brand}
            </span>
          ) : null}
          <span
            key={busy}
            aria-hidden
            className="p4c-led mr-1 block h-[7px] w-[7px] rounded-full transition-[background,box-shadow] duration-300"
            data-busy={busy > 0 ? "true" : "false"}
            style={{
              background: power ? glow : "#3a2a2e",
              boxShadow: power ? "0 0 8px " + glow + ", 0 0 2px #fff inset" : "inset 0 1px 1px rgba(0,0,0,.6)",
            }}
          />
          <button
            type="button"
            onClick={togglePower}
            aria-label={power ? "Turn the screen off" : "Turn the screen on"}
            aria-pressed={power}
            className={pill + " w-8"}
            style={pillStyle}
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M5 4.2a5 5 0 1 0 6 0" />
              <path d="M8 2.2v5.2" />
            </svg>
          </button>
        </div>
        {hint ? (
          <span
            className="pointer-events-none hidden select-none font-mono text-[10px] uppercase tracking-[0.24em] md:block"
            style={{ color: rgb(ink, 0.5) }}
          >
            {hint}
          </span>
        ) : null}
      </div>
    </section>
  )
}

export type PhosphorCrt404Props = {
  /** The big extruded code. Digits look best; up to 5 characters. */
  code?: string
  /** Line between the double rules at the top. Up to 24 characters of A–Z, 0–9 and basic punctuation. */
  eyebrow?: string
  /** One message per channel. Clicking the screen moves to the next. Up to 24 characters each. */
  messages?: string[]
  /** Written across the pyramid, which is the link home. Up to 18 characters. */
  homeLabel?: string
  homeHref?: string
  /** Called when the pyramid is clicked. Call `event.preventDefault()` to route client-side. */
  onHome?: (event: { preventDefault: () => void }) => void
  /** Called with the new message index after each channel change. */
  onRetune?: (index: number) => void
  /** Phosphor colour (hex). The five tones, the glass and the room glow all derive from it. */
  phosphor?: string
  /** Channel number shown on screen. Each change adds one. */
  channel?: number
  /** Embossed on the set's chin. */
  brand?: string
  /** Small line under the set. Pass "" to hide it. */
  hint?: string
  /** Static and power sounds. Only played after a click. */
  sound?: boolean
  /** A definite height. Never a percentage: an installed page has no height chain. */
  height?: string
  className?: string
  style?: React.CSSProperties
}
