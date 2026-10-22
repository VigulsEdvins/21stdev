"use client"

import * as React from "react"

/* ------------------------------------------------------------------ types */

export type BoardContact = {
  kind: "phone" | "mail" | "link"
  text: string
  /** Where the row goes on click. Omit it and the row is plain text. */
  href?: string
}
export type BoardRow = { title: string; lines?: string[]; date: string }
export type BoardSchool = { title: string; detail?: string[]; date: string }
export type BoardTile = { label: string; tint: string; ink?: string }

export type FlatlayResumeBoardProps = {
  /**
   * Height of the hero. Must be a definite length — the board is fitted to this
   * box, so a percentage collapses to 0px unless every ancestor up to <html>
   * has a real height. Never pass `"100%"`.
   */
  height?: string
  /** Floor for the height, so the board stays readable on short viewports. */
  minHeight?: string
  name?: string
  title?: string
  /** The smaller role lines under the title. Three fit. */
  roles?: string[]
  country?: string
  locale?: string
  /** Hovering a row draws the red ring round it; a row with `href` is a link. */
  contacts?: BoardContact[]
  /** Pre-broken lines for the watch face. Wrap a phrase in *stars* to bold it. */
  about?: string[]
  /** The receipt. Six rows fit before it runs past the paper. */
  items?: BoardRow[]
  education?: BoardSchool[]
  /** Handwritten on the grid paper. Six lines fit. */
  abilities?: string[]
  skills?: string[]
  tiles?: BoardTile[]
  /** Encoded into the pinned QR, for real — see README. Also the QR's link. */
  portfolioUrl?: string
  /** Encoded into the second QR, at the foot of the receipt. */
  codeUrl?: string
  /** Portrait for the card. Omit it for the drawn stand-in. */
  photo?: string
  className?: string
}

/* The desk. Every coordinate in this file lives in this box. */
const W = 735
const H = 1035

// #region qr
/* A QR encoder, byte mode, error-correction level M, versions 1-10 (up to 213
   bytes — every URL anyone puts on a CV). A decorative QR is worse than none
   on a resume, so this produces a real, scannable matrix. */

const GF_EXP = new Uint8Array(512)
const GF_LOG = new Uint8Array(256)
for (let i = 0, x = 1; i < 255; i++) {
  GF_EXP[i] = x
  GF_LOG[x] = i
  x <<= 1
  if (x & 0x100) x ^= 0x11d
}
for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255]

const gmul = (a: number, b: number) => (a === 0 || b === 0 ? 0 : GF_EXP[GF_LOG[a] + GF_LOG[b]])

/* ecPerBlock, group1 blocks, group1 data codewords, group2 blocks, group2 data */
const EC_M = [
  [10, 1, 16, 0, 0],
  [16, 1, 28, 0, 0],
  [26, 1, 44, 0, 0],
  [18, 2, 32, 0, 0],
  [24, 2, 43, 0, 0],
  [16, 4, 27, 0, 0],
  [18, 4, 31, 0, 0],
  [22, 2, 38, 2, 39],
  [22, 3, 36, 2, 37],
  [26, 4, 43, 1, 44],
]
const ALIGN: number[][] = [[], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]]
const REMAINDER = [0, 7, 7, 7, 7, 7, 0, 0, 0, 0]

function genPoly(n: number) {
  let p = [1]
  for (let i = 0; i < n; i++) {
    const next = new Array(p.length + 1).fill(0)
    for (let j = 0; j < p.length; j++) {
      next[j] ^= p[j]
      next[j + 1] ^= gmul(p[j], GF_EXP[i])
    }
    p = next
  }
  return p
}

function ecBytes(data: number[], n: number) {
  const gen = genPoly(n)
  const res = new Array(data.length + n).fill(0)
  for (let i = 0; i < data.length; i++) res[i] = data[i]
  for (let i = 0; i < data.length; i++) {
    const c = res[i]
    if (c === 0) continue
    for (let j = 0; j < gen.length; j++) res[i + j] ^= gmul(gen[j], c)
  }
  return res.slice(data.length)
}

function bch(value: number, poly: number, bits: number) {
  let v = value << bits
  const deg = poly.toString(2).length - 1
  while (v.toString(2).length - 1 >= deg) v ^= poly << (v.toString(2).length - 1 - deg)
  return (value << bits) | v
}

export function qrMatrix(text: string) {
  const bytes: number[] = []
  for (const b of new TextEncoder().encode(text)) bytes.push(b)

  let version = -1
  for (let v = 1; v <= 10; v++) {
    const spec = EC_M[v - 1]
    const capacity = spec[1] * spec[2] + spec[3] * spec[4]
    if (bytes.length * 8 + 4 + (v < 10 ? 8 : 16) <= capacity * 8) {
      version = v
      break
    }
  }
  if (version < 0) return null

  const [ecLen, g1, d1, g2, d2] = EC_M[version - 1]
  const dataCodewords = g1 * d1 + g2 * d2
  const countBits = version < 10 ? 8 : 16

  /* bit stream */
  const bits: number[] = []
  const push = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1)
  }
  push(0b0100, 4)
  push(bytes.length, countBits)
  for (const b of bytes) push(b, 8)
  const cap = dataCodewords * 8
  for (let i = 0; i < 4 && bits.length < cap; i++) bits.push(0)
  while (bits.length % 8 !== 0) bits.push(0)
  const words: number[] = []
  for (let i = 0; i < bits.length; i += 8) {
    let w = 0
    for (let j = 0; j < 8; j++) w = (w << 1) | bits[i + j]
    words.push(w)
  }
  const PAD = [0xec, 0x11]
  for (let i = 0; words.length < dataCodewords; i++) words.push(PAD[i % 2])

  /* split into blocks, compute EC, interleave */
  const blocks: number[][] = []
  let at = 0
  for (let i = 0; i < g1; i++) {
    blocks.push(words.slice(at, at + d1))
    at += d1
  }
  for (let i = 0; i < g2; i++) {
    blocks.push(words.slice(at, at + d2))
    at += d2
  }
  const ecs = blocks.map((b) => ecBytes(b, ecLen))

  const stream: number[] = []
  const maxData = Math.max(d1, d2)
  for (let i = 0; i < maxData; i++) {
    for (const b of blocks) if (i < b.length) stream.push(b[i])
  }
  for (let i = 0; i < ecLen; i++) {
    for (const e of ecs) stream.push(e[i])
  }

  /* matrix */
  const size = version * 4 + 17
  const m: number[][] = Array.from({ length: size }, () => new Array(size).fill(-1))

  const finder = (r: number, c: number) => {
    for (let i = -1; i <= 7; i++) {
      for (let j = -1; j <= 7; j++) {
        const rr = r + i
        const cc = c + j
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue
        const on =
          i >= 0 && i <= 6 && j >= 0 && j <= 6 &&
          (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4))
        m[rr][cc] = on ? 1 : 0
      }
    }
  }
  finder(0, 0)
  finder(0, size - 7)
  finder(size - 7, 0)

  for (let i = 8; i < size - 8; i++) {
    const on = i % 2 === 0 ? 1 : 0
    m[6][i] = on
    m[i][6] = on
  }

  const onFinder = (r: number, c: number) =>
    (r <= 8 && c <= 8) || (r <= 8 && c >= size - 9) || (r >= size - 9 && c <= 8)
  for (const r of ALIGN[version - 1]) {
    for (const c of ALIGN[version - 1]) {
      if (onFinder(r, c)) continue
      for (let i = -2; i <= 2; i++) {
        for (let j = -2; j <= 2; j++) {
          m[r + i][c + j] = Math.max(Math.abs(i), Math.abs(j)) !== 1 ? 1 : 0
        }
      }
    }
  }

  m[size - 8][8] = 1 /* dark module */

  /* reserve format areas */
  const reserved: number[][] = []
  for (let i = 0; i < 9; i++) {
    if (m[8][i] < 0) { m[8][i] = 0; reserved.push([8, i]) }
    if (m[i][8] < 0) { m[i][8] = 0; reserved.push([i, 8]) }
  }
  for (let i = 0; i < 8; i++) {
    if (m[8][size - 1 - i] < 0) { m[8][size - 1 - i] = 0; reserved.push([8, size - 1 - i]) }
    if (m[size - 1 - i][8] < 0) { m[size - 1 - i][8] = 0; reserved.push([size - 1 - i, 8]) }
  }
  if (version >= 7) {
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        m[size - 11 + j][i] = 0
        m[i][size - 11 + j] = 0
        reserved.push([size - 11 + j, i], [i, size - 11 + j])
      }
    }
  }
  const isReserved = new Set(reserved.map(([r, c]) => r * size + c))

  /* place the stream */
  const dataBits: number[] = []
  for (const w of stream) for (let i = 7; i >= 0; i--) dataBits.push((w >> i) & 1)
  for (let i = 0; i < REMAINDER[version - 1]; i++) dataBits.push(0)

  let bi = 0
  let up = true
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--
    for (let k = 0; k < size; k++) {
      const row = up ? size - 1 - k : k
      for (const c of [col, col - 1]) {
        if (m[row][c] >= 0) continue
        m[row][c] = bi < dataBits.length ? dataBits[bi] : 0
        bi++
      }
    }
    up = !up
  }

  /* masks */
  const MASKS = [
    (r: number, c: number) => (r + c) % 2 === 0,
    (r: number) => r % 2 === 0,
    (r: number, c: number) => c % 3 === 0,
    (r: number, c: number) => (r + c) % 3 === 0,
    (r: number, c: number) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r: number, c: number) => ((r * c) % 2) + ((r * c) % 3) === 0,
    (r: number, c: number) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
    (r: number, c: number) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
  ]

  const functional: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false))
  const mark = (r: number, c: number) => { if (r >= 0 && r < size && c >= 0 && c < size) functional[r][c] = true }
  for (let i = -1; i <= 7; i++) for (let j = -1; j <= 7; j++) {
    mark(i, j); mark(i, size - 7 + j); mark(size - 7 + i, j)
  }
  for (let i = 0; i < size; i++) { mark(6, i); mark(i, 6) }
  for (const r of ALIGN[version - 1]) for (const c of ALIGN[version - 1]) {
    if (onFinder(r, c)) continue
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) mark(r + i, c + j)
  }
  for (const [r, c] of reserved) mark(r, c)
  mark(size - 8, 8)

  const penalty = (g: number[][]) => {
    let score = 0
    for (let r = 0; r < size; r++) {
      let run = 1
      for (let c = 1; c < size; c++) {
        if (g[r][c] === g[r][c - 1]) run++
        else { if (run >= 5) score += run - 2; run = 1 }
      }
      if (run >= 5) score += run - 2
    }
    for (let c = 0; c < size; c++) {
      let run = 1
      for (let r = 1; r < size; r++) {
        if (g[r][c] === g[r - 1][c]) run++
        else { if (run >= 5) score += run - 2; run = 1 }
      }
      if (run >= 5) score += run - 2
    }
    for (let r = 0; r < size - 1; r++) {
      for (let c = 0; c < size - 1; c++) {
        const v = g[r][c]
        if (v === g[r][c + 1] && v === g[r + 1][c] && v === g[r + 1][c + 1]) score += 3
      }
    }
    const pat1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0]
    const pat2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1]
    const hit = (arr: number[], p: number[]) => p.every((v: number, i: number) => arr[i] === v)
    for (let r = 0; r < size; r++) {
      for (let c = 0; c + 11 <= size; c++) {
        const row = g[r].slice(c, c + 11)
        if (hit(row, pat1) || hit(row, pat2)) score += 40
      }
    }
    for (let c = 0; c < size; c++) {
      for (let r = 0; r + 11 <= size; r++) {
        const col = []
        for (let k = 0; k < 11; k++) col.push(g[r + k][c])
        if (hit(col, pat1) || hit(col, pat2)) score += 40
      }
    }
    let dark = 0
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) dark += g[r][c]
    const pct = (dark * 100) / (size * size)
    score += Math.floor(Math.abs(pct - 50) / 5) * 10
    return score
  }

  let best: number[][] = []
  let bestScore = Infinity
  for (let mask = 0; mask < 8; mask++) {
    const g = m.map((row) => row.slice())
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!functional[r][c] && MASKS[mask](r, c)) g[r][c] ^= 1
      }
    }
    /* format info: level M is 0b00 */
    const fmt = bch((0b00 << 3) | mask, 0b10100110111, 10) ^ 0b101010000010010
    for (let i = 0; i <= 5; i++) g[8][i] = (fmt >> (14 - i)) & 1
    g[8][7] = (fmt >> 8) & 1
    g[8][8] = (fmt >> 7) & 1
    g[7][8] = (fmt >> 6) & 1
    for (let i = 9; i <= 14; i++) g[14 - i][8] = (fmt >> (14 - i)) & 1
    for (let i = 0; i <= 7; i++) g[size - 1 - i][8] = (fmt >> i) & 1
    for (let i = 8; i <= 14; i++) g[8][size - 15 + i] = (fmt >> i) & 1
    g[size - 8][8] = 1
    if (version >= 7) {
      const vinfo = bch(version, 0b1111100100101, 12)
      for (let i = 0; i < 18; i++) {
        const bit = (vinfo >> i) & 1
        g[Math.floor(i / 3)][size - 11 + (i % 3)] = bit
        g[size - 11 + (i % 3)][Math.floor(i / 3)] = bit
      }
    }
    const sc = penalty(g)
    if (sc < bestScore) { bestScore = sc; best = g }
  }
  return best
}
// #endregion
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

/* ------------------------------------------------------------- handwriting
   The board mixes a printed sans with a marker hand — the labels, the list on
   the grid paper, the card on the SD — and a marker hand is not a system
   font: the usual stack resolves differently on every machine and to a serif
   on the headless box that renders the cover. So it is drawn. The alphabet
   above is centre-line strokes on a baseline at y=0, cap height 62, set with
   a round pen; the same strokes painted fat and layered give the puffy
   "abilities" and the glowing "skills". */

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

type Layer = { stroke: string; width: number; filter?: string; opacity?: number }

/**
 * Paints `text` in the hand at (x, y) with the cap height `cap`, in board
 * pixels. `layers` are painted in order, widest first: one layer is a pen,
 * a wide dark one under a narrow light one is puffy sticker lettering.
 */
function hand(text: string, x: number, y: number, cap: number, layers: Layer[], skew = -10, seed = 0) {
  const line = writeScript(text, seed)
  const s = cap / 62
  const paths = line.strokes.map((st, i) => (
    <path key={i} d={st.d} transform={"translate(" + st.x + " " + st.dy + ") rotate(" + st.rot + ")"} />
  ))
  return (
    <g
      transform={"translate(" + x + " " + y + ") scale(" + s + ") skewX(" + skew + ")"}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {layers.map((l, i) => (
        <g key={i} stroke={l.stroke} strokeWidth={l.width / s} filter={l.filter} opacity={l.opacity}>
          {paths}
        </g>
      ))}
    </g>
  )
}

/* ------------------------------------------------------------------ paper */

/**
 * A polygon with every edge torn: points jittered along each side at two
 * scales — a slow wander that makes the big tears and a fast one for the
 * fibres — and closed.
 */
function ragged(pts: number[][], amp: number, seed: number, step = 8) {
  let d = ""
  let k = 0
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i]
    const [x1, y1] = pts[(i + 1) % pts.length]
    const len = Math.hypot(x1 - x0, y1 - y0)
    const n = Math.max(1, Math.round(len / step))
    const nx = -(y1 - y0) / len
    const ny = (x1 - x0) / len
    for (let j = 0; j < n; j++) {
      const t = j / n
      const w = j === 0 ? 0 : wobble(k + seed * 9.1) * amp * 0.55 + wobble(Math.floor(k / 5) + seed * 5.7 + 100) * amp * 1.1
      d += (d ? "L" : "M") + (x0 + (x1 - x0) * t + nx * w).toFixed(1) + " " + (y0 + (y1 - y0) * t + ny * w).toFixed(1)
      k++
    }
  }
  return d + "Z"
}

const rectPts = (x: number, y: number, w: number, h: number) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]

/** The same polygon pushed `d` outward from its centre. */
function inflate(pts: number[][], d: number) {
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length
  return pts.map(([x, y]) => {
    const len = Math.hypot(x - cx, y - cy) || 1
    return [x + ((x - cx) / len) * d, y + ((y - cy) / len) * d]
  })
}

/**
 * A torn sheet: a fibrous white fringe torn on its own seed, then the paper
 * itself over it, so every edge reads as pulled apart rather than cut.
 */
const torn = (pts: number[][], amp: number, seed: number, fill: string, filter?: string) => (
  <>
    <path d={ragged(inflate(pts, 1.4), amp * 1.15, seed + 1, 5)} fill="#ffffff" opacity="0.8" />
    <path d={ragged(pts, amp, seed)} fill={fill} filter={filter} />
  </>
)

/** Frayed cloth: short threads sticking out of every edge. */
function fray(pts: number[][], seed: number) {
  let d = ""
  let k = 0
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i]
    const [x1, y1] = pts[(i + 1) % pts.length]
    const len = Math.hypot(x1 - x0, y1 - y0)
    const nx = -(y1 - y0) / len
    const ny = (x1 - x0) / len
    for (let s = 6; s < len - 4; s += 7 + Math.abs(wobble(k + seed)) * 6) {
      const t = s / len
      const l = 2.5 + Math.abs(wobble(k * 1.7 + seed)) * 5
      const px = x0 + (x1 - x0) * t
      const py = y0 + (y1 - y0) * t
      d += "M" + px.toFixed(1) + " " + py.toFixed(1) + "l" + (-nx * l + wobble(k + 9) * 1.5).toFixed(1) + " " + (-ny * l + wobble(k + 21) * 1.5).toFixed(1)
      k++
    }
  }
  return d
}

/**
 * A marker loop round a box: a lap and a bit, drifting outward so the ends
 * miss each other the way a quick circle on paper does.
 */
function loop(cx: number, cy: number, rx: number, ry: number, seed: number) {
  const n = 34
  const pts: number[][] = []
  for (let i = 0; i <= n; i++) {
    const t = -0.55 + (i / n) * (Math.PI * 2 + 1.05)
    const j = 1 + wobble(i + seed * 5.3) * 0.045
    const drift = (i / n) * 4
    pts.push([cx + Math.cos(t) * (rx * j + drift), cy + Math.sin(t) * (ry * j + drift * 0.8)])
  }
  let d = "M" + pts[0][0].toFixed(1) + " " + pts[0][1].toFixed(1)
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2
    const my = (pts[i][1] + pts[i + 1][1]) / 2
    d += "Q" + pts[i][0].toFixed(1) + " " + pts[i][1].toFixed(1) + " " + mx.toFixed(1) + " " + my.toFixed(1)
  }
  return d
}

/** A quick double underline: one stroke the width of the word, a shorter one under it. */
function underline(x: number, y: number, w: number, seed: number) {
  const a = wobble(seed) * 1.2
  const b = wobble(seed + 7) * 1.2
  return (
    "M" + x + " " + (y + a).toFixed(1) +
    "Q" + (x + w * 0.35).toFixed(1) + " " + (y + 2.2 + b).toFixed(1) + " " + (x + w).toFixed(1) + " " + (y - 0.6 + a).toFixed(1) +
    "M" + (x + 4) + " " + (y + 4 + b).toFixed(1) +
    "Q" + (x + w * 0.5).toFixed(1) + " " + (y + 5.6 + a).toFixed(1) + " " + (x + w * 0.92).toFixed(1) + " " + (y + 3.2 + b).toFixed(1)
  )
}

/** A tick. */
function tick(x: number, y: number, seed: number) {
  const a = wobble(seed + 3) * 0.8
  return "M" + x + " " + (y + a).toFixed(1) + "L" + (x + 3.5) + " " + (y + 4.5) + "L" + (x + 11) + " " + (y - 6 + a).toFixed(1)
}

/** A paper clip, standing up, `h` tall with its top at (x, y). */
const clipPath = (x: number, y: number, h: number) =>
  "M" + (x + 2) + " " + (y + h * 0.3) +
  "L" + (x + 2) + " " + (y + h - 5) +
  "A5 5 0 0 0 " + (x + 12) + " " + (y + h - 5) +
  "L" + (x + 12) + " " + (y + 4) +
  "A4 4 0 0 0 " + (x + 4) + " " + (y + 4) +
  "L" + (x + 4) + " " + (y + h - 11) +
  "A3 3 0 0 0 " + (x + 10) + " " + (y + h - 11) +
  "L" + (x + 10) + " " + (y + 9)

/* -------------------------------------------------------------------- copy */

const ROLES = ["Software Developer", "ML / Data Science", "Full-stack Engineer"]

const CONTACTS: BoardContact[] = [
  { kind: "phone", text: "+91 93989 11432", href: "tel:+919398911432" },
  { kind: "mail", text: "kedhareswer.12110626@gmail.com", href: "mailto:kedhareswer.12110626@gmail.com" },
  { kind: "link", text: "kedhar.vercel.app", href: "https://kedhar.vercel.app/" },
]

const ABOUT = [
  "I am an *AI Engineer* and",
  "*Software Developer* building",
  "document intelligence and",
  "*RAG* systems at *DiligenceVault*.",
  "My work spans *LLM agents*,",
  "*retrieval systems* and",
  "full-stack product engineering.",
]

const ITEMS: BoardRow[] = [
  { title: "Software Developer", lines: ["DiligenceVault", "lead sales app, internal tools"], date: "2026-now" },
  { title: "AI Engineer Intern", lines: ["DiligenceVault", "document intelligence"], date: "2025-2026" },
  { title: "Research Intern", lines: ["upGrad Campus", "Yara rules + ML hybrid"], date: "2025" },
  { title: "QuantumPDF ChatApp", lines: ["RAG over PDFs", "adaptive chunking, vector db"], date: "2025" },
  { title: "ThesisFlow-AI", lines: ["research platform", "realtime collaboration"], date: "2025" },
  { title: "Agentic LLM Chess", lines: ["agent orchestration", "self-improvement loop"], date: "2026" },
]

const EDUCATION: BoardSchool[] = [
  { title: "B.Tech CSE", detail: ["Lovely Professional University", "Data Science (AI & ML) — CGPA 7.74"], date: "2021 - 2025" },
  { title: "higher secondary", detail: ["Sri Siddhartha Junior College", "Marks 889"], date: "2019 - 2021" },
  { title: "matriculation", detail: ["Vijaya Bharathi EM High School", "GPA 9.5"], date: "2018 - 2019" },
]

const ABILITIES = [
  "machine learning",
  "retrieval / RAG",
  "document intelligence",
  "full-stack development",
  "data science",
  "agentic LLM systems",
]

const SKILLS = ["adaptability", "communication", "collaboration", "problem-solving"]

const TILES: BoardTile[] = [
  { label: "Py", tint: "#2b4d8c", ink: "#a9d3ff" },
  { label: "TS", tint: "#1f4f92", ink: "#9cc9ff" },
  { label: "Re", tint: "#173a55", ink: "#7fe3f5" },
  { label: "SQL", tint: "#5a4218", ink: "#ffd98a" },
]

const CSS = `
.frb-root{position:relative;width:100%;overflow:hidden;isolation:isolate;background-color:#0a0a0b;display:flex;align-items:center;justify-content:center}
.frb-l{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:block}
.frb-board{position:relative;display:block;width:100%;height:100%}
.frb-vig{background:radial-gradient(120% 78% at 50% 42%,rgba(0,0,0,0) 40%,rgba(0,0,0,.45) 78%,rgba(0,0,0,.78) 100%)}
.frb-sans{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}
.frb-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.frb-hit{cursor:pointer;outline:none}
.frb-ink{mix-blend-mode:multiply}
.frb-ring,.frb-arrow{stroke-dasharray:1 2;stroke-dashoffset:1;transition:stroke-dashoffset .55s cubic-bezier(.35,.7,.25,1)}
.frb-arrow{transition-delay:.3s}
.frb-hit:hover .frb-ring,.frb-hit:focus-visible .frb-ring,.frb-hit:focus-within .frb-ring{stroke-dashoffset:0}
.frb-hit:hover .frb-arrow,.frb-hit:focus-visible .frb-arrow,.frb-hit:focus-within .frb-arrow{stroke-dashoffset:0}
.frb-lift{transform-box:fill-box;transform-origin:center;transition:transform .5s cubic-bezier(.2,.8,.2,1)}
.frb-hit:hover .frb-lift,.frb-hit:focus-visible .frb-lift,.frb-hit:focus-within .frb-lift{transform:translateY(-5px) rotate(-1deg)}
@media (prefers-reduced-motion:reduce){
.frb-ring,.frb-arrow,.frb-lift{transition:none}
}
`

/* ------------------------------------------------------------------ board */

const RED = "#c9261c"

export default function FlatlayResumeBoard({
  height = "100svh",
  minHeight = "640px",
  name = "Kedhareswer N.",
  title = "AI Engineer",
  roles = ROLES,
  country = "CTRY.INDIA",
  locale = "LOC.MADANAPALLE",
  contacts = CONTACTS,
  about = ABOUT,
  items = ITEMS,
  education = EDUCATION,
  abilities = ABILITIES,
  skills = SKILLS,
  tiles = TILES,
  portfolioUrl = "https://kedhar.vercel.app/",
  codeUrl = "https://github.com/Kedhareswer",
  photo,
  className = "",
}: FlatlayResumeBoardProps) {
  const uid = "frb" + React.useId().replace(/[^a-zA-Z0-9]/g, "")
  const id = (n: string) => uid + "-" + n
  const u = (n: string) => "url(#" + uid + "-" + n + ")"

  // The matrices only change when the URLs do, and the encoder is not cheap.
  const portfolioQr = React.useMemo(() => qrMatrix(portfolioUrl), [portfolioUrl])
  const codeQr = React.useMemo(() => qrMatrix(codeUrl), [codeUrl])

  /**
   * Draws a matrix into a box, quiet zone included. The dark modules are one
   * path, not a rect each: separate rects leave anti-aliased seams between
   * neighbours at any fractional scale, and a seam through a finder pattern's
   * 3-wide core breaks the 1:1:3:1:1 run every reader looks for first.
   */
  const qr = (m: number[][] | null, x: number, y: number, box: number, ink = "#111") => {
    if (!m || m.length === 0) return <rect x={x} y={y} width={box} height={box} fill="#ddd" />
    const quiet = 2
    const n = m.length + quiet * 2
    const s = box / n
    let d = ""
    for (let r = 0; r < m.length; r++) {
      for (let c = 0; c < m.length; c++) {
        if (m[r][c] !== 1) continue
        d += "M" + ((c + quiet) * s).toFixed(2) + " " + ((r + quiet) * s).toFixed(2) + "h" + s.toFixed(2) + "v" + s.toFixed(2) + "h-" + s.toFixed(2) + "z"
      }
    }
    return (
      <g transform={"translate(" + x + " " + y + ")"}>
        <rect width={box} height={box} fill="#f9f9f7" />
        <path d={d} fill={ink} shapeRendering="crispEdges" />
      </g>
    )
  }

  /** *stars* mark an emphasised run inside a pre-broken line. */
  const emphasised = (line: string, key: number, x: number, y: number, size: number) => {
    const parts = line.split("*")
    return (
      <text key={key} className="frb-sans" x={x} y={y} fontSize={size} fill="#e4e4e6">
        {parts.map((part, i) =>
          i % 2 === 1 ? (
            <tspan key={i} fontWeight="700" fill="#ffffff">
              {part}
            </tspan>
          ) : (
            <tspan key={i}>{part}</tspan>
          ),
        )}
      </text>
    )
  }

  const contactIcon = (kind: BoardContact["kind"], cx: number, cy: number) => (
    <g>
      <circle cx={cx} cy={cy} r="7.4" fill="#232325" />
      <g fill="none" stroke="#f4f4f4" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
        {kind === "phone" ? (
          <path d={"M" + (cx - 2.6) + " " + (cy - 3.2) + "l1.9 1.9-1.1 1.5a5.2 5.2 0 0 0 2.6 2.6l1.5-1.1 1.9 1.9-1.2 1.2a7.4 7.4 0 0 1-6.8-6.8Z"} fill="#f4f4f4" stroke="none" />
        ) : null}
        {kind === "mail" ? (
          <>
            <rect x={cx - 4} y={cy - 2.8} width="8" height="5.6" rx="0.8" />
            <path d={"M" + (cx - 4) + " " + (cy - 2.4) + "l4 2.8 4-2.8"} />
          </>
        ) : null}
        {kind === "link" ? (
          <>
            <path d={"M" + (cx - 0.4) + " " + (cy + 1.6) + "a2.4 2.4 0 0 1 0-3.4l1.8-1.8a2.4 2.4 0 0 1 3.4 3.4l-0.9 0.9"} />
            <path d={"M" + (cx + 0.4) + " " + (cy - 1.6) + "a2.4 2.4 0 0 1 0 3.4l-1.8 1.8a2.4 2.4 0 0 1-3.4-3.4l0.9-0.9"} />
          </>
        ) : null}
      </g>
    </g>
  )

  /** A paper clip: gold wire with a highlight along its top edge. */
  const paperClip = (x: number, y: number, h: number, colour: string, light: string, rot = 0) => (
    <g transform={"rotate(" + rot + " " + (x + 7) + " " + (y + h / 2) + ")"} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={clipPath(x, y, h)} stroke="#000" strokeWidth="3.6" opacity="0.35" transform="translate(1.2 2)" />
      <path d={clipPath(x, y, h)} stroke={colour} strokeWidth="2.6" />
      <path d={clipPath(x, y, h)} stroke={light} strokeWidth="0.9" transform="translate(-0.5 -0.6)" opacity="0.8" />
    </g>
  )

  /**
   * Stand-in portrait, black and white — the default cannot be a URL, see
   * README. Drawn in three-quarter profile with no features, because at card
   * size a silhouette reads as a photograph and a drawn face reads as a cartoon.
   */
  const drawnPhoto = (w: number, h: number) => (
    <g clipPath={u("photo")}>
      <g transform={"scale(" + w / 144 + " " + h / 164 + ")"}>
        <rect width="144" height="164" fill={u("studio")} />
        {/* hood behind the head, then the jacket */}
        <path d="M78 66C96 40 130 46 132 84C134 104 124 114 112 118L98 96Z" fill="#131417" />
        <path d="M-12 172C-4 126 30 106 62 104L80 112C116 108 142 126 156 172Z" fill="#0f1013" />
        <path d="M-12 172C-2 130 26 110 60 106L56 130C30 136 10 150 -2 172Z" fill="#1a1c20" opacity="0.85" />
        <path d="M62 104C70 116 78 118 80 112" fill="none" stroke="#2b2d33" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M74 113L70 172" stroke="#25272c" strokeWidth="1.2" />
        {/* neck and head, turned away from the light */}
        <path d="M58 82L88 80L92 108L62 110Z" fill="#8a8681" />
        <path d="M76 18C56 20 46 40 48 58C46 62 40 66 44 70C46 74 52 72 52 76C52 84 56 90 66 94C74 96 82 92 88 84C96 74 100 62 100 48C100 30 92 18 76 18Z" fill={u("face")} />
        <ellipse cx="98" cy="62" rx="5" ry="8" fill="#a9a49d" />
        <ellipse cx="58" cy="52" rx="6" ry="2.4" fill="#2e2c29" opacity="0.28" />
        <ellipse cx="57" cy="45.5" rx="7" ry="1.4" fill="#2e2c29" opacity="0.22" />
        <path d="M48 56C42 34 52 14 76 12C102 10 112 32 106 60C104 46 96 38 84 38C70 38 62 44 56 56C54 60 52 62 48 56Z" fill="#121316" />
        <path d="M56 44C60 50 58 58 52 60C50 54 52 48 56 44Z" fill="#16171a" />
        <rect width="144" height="164" fill={u("photoShade")} />
      </g>
      <rect width={w} height={h} filter={u("grain")} opacity="0.22" style={{ mixBlendMode: "multiply" }} />
    </g>
  )

  const allText = [
    name, title, ...roles, country, locale,
    ...contacts.map((c) => c.text),
    ...about.map((a) => a.replace(/\*/g, "")),
    ...items.map((i) => i.title + " " + (i.lines ?? []).join(" ") + " " + i.date),
    ...education.map((e) => e.title + " " + (e.detail ?? []).join(" ") + " " + e.date),
    ...abilities, ...skills, ...tiles.map((t) => t.label),
    portfolioUrl, codeUrl,
  ]

  const linkRow = contacts.findIndex((c) => c.kind === "link")

  return (
    <section className={"frb-root " + className} style={{ height, minHeight }}>
      <style>{CSS}</style>
      <div className="frb-sr">
        <h1>{name} — {title}</h1>
        {allText.map((t, i) => (
          <p key={i}>{t}</p>
        ))}
      </div>

      <svg className="frb-board" viewBox={"0 0 " + W + " " + H} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs>
          <filter id={id("grain")} x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="13" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0" intercept="1" />
            </feComponentTransfer>
          </filter>
          {/* the desk: a fine matte fibre, screened over near-black */}
          <filter id={id("fibre")} x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.7 0.7" numOctaves="4" seed="7" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0" intercept="1" />
              <feFuncR type="linear" slope="0.26" intercept="0.05" />
              <feFuncG type="linear" slope="0.26" intercept="0.05" />
              <feFuncB type="linear" slope="0.26" intercept="0.06" />
            </feComponentTransfer>
          </filter>
          {/* crumpled paper. |turbulence| at a low frequency: its zero-crossings become long,
              sharp ridges — the folds — with flat paper between, not stucco. Lit from the
              top-left, then the tone range is compressed so flat paper stays white and only
              the folds take a little shadow. */}
          <filter id={id("crumple")} x="-2%" y="-2%" width="104%" height="104%" colorInterpolationFilters="sRGB">
            <feTurbulence type="turbulence" baseFrequency="0.013 0.02" numOctaves="2" seed="9" result="fine" />
            <feTurbulence type="fractalNoise" baseFrequency="0.005 0.007" numOctaves="1" seed="4" result="broad" />
            <feComposite in="fine" in2="broad" operator="arithmetic" k2="0.6" k3="0.7" result="bump" />
            <feDiffuseLighting in="bump" lightingColor="#ffffff" surfaceScale="5" diffuseConstant="1" result="lit">
              <feDistantLight azimuth="225" elevation="45" />
            </feDiffuseLighting>
            <feComponentTransfer in="lit" result="norm">
              <feFuncR type="linear" slope="0.62" intercept="0.54" />
              <feFuncG type="linear" slope="0.62" intercept="0.54" />
              <feFuncB type="linear" slope="0.62" intercept="0.54" />
            </feComponentTransfer>
            <feComposite in="norm" in2="SourceGraphic" operator="in" result="normIn" />
            <feBlend in="normIn" in2="SourceGraphic" mode="multiply" />
          </filter>
          <filter id={id("crease")} x="-2%" y="-2%" width="104%" height="104%" colorInterpolationFilters="sRGB">
            <feTurbulence type="turbulence" baseFrequency="0.011 0.016" numOctaves="2" seed="11" result="fine" />
            <feTurbulence type="fractalNoise" baseFrequency="0.004 0.006" numOctaves="1" seed="6" result="broad" />
            <feComposite in="fine" in2="broad" operator="arithmetic" k2="0.55" k3="0.75" result="bump" />
            <feDiffuseLighting in="bump" lightingColor="#ffffff" surfaceScale="3.5" diffuseConstant="1" result="lit">
              <feDistantLight azimuth="220" elevation="45" />
            </feDiffuseLighting>
            <feComponentTransfer in="lit" result="norm">
              <feFuncR type="linear" slope="0.5" intercept="0.63" />
              <feFuncG type="linear" slope="0.5" intercept="0.63" />
              <feFuncB type="linear" slope="0.5" intercept="0.63" />
            </feComponentTransfer>
            <feComposite in="norm" in2="SourceGraphic" operator="in" result="normIn" />
            <feBlend in="normIn" in2="SourceGraphic" mode="multiply" />
          </filter>
          {/* cloth: slow folds over the denim */}
          <filter id={id("fold")} x="-2%" y="-2%" width="104%" height="104%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.008 0.012" numOctaves="2" seed="21" result="n" />
            <feDiffuseLighting in="n" lightingColor="#ffffff" surfaceScale="5" diffuseConstant="1" result="lit">
              <feDistantLight azimuth="230" elevation="50" />
            </feDiffuseLighting>
            <feComponentTransfer in="lit" result="norm">
              <feFuncR type="linear" slope="0.7" intercept="0.46" />
              <feFuncG type="linear" slope="0.7" intercept="0.46" />
              <feFuncB type="linear" slope="0.7" intercept="0.46" />
            </feComponentTransfer>
            <feComposite in="norm" in2="SourceGraphic" operator="in" result="normIn" />
            <feBlend in="normIn" in2="SourceGraphic" mode="multiply" />
          </filter>
          {/* any portrait becomes the board's black and white */}
          <filter id={id("mono")} colorInterpolationFilters="sRGB">
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncR type="linear" slope="1.14" intercept="-0.06" />
              <feFuncG type="linear" slope="1.14" intercept="-0.06" />
              <feFuncB type="linear" slope="1.14" intercept="-0.06" />
            </feComponentTransfer>
          </filter>
          {/* ink: print sits in the fibres, not on them — a little uneven in density, its edges
              pushed about by the grain, and multiplied into the paper by .frb-ink */}
          <filter id={id("ink")} x="-6%" y="-14%" width="112%" height="128%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="5" result="speck" />
            <feColorMatrix in="speck" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.35 0.68" result="density" />
            <feComposite in="SourceGraphic" in2="density" operator="in" result="uneven" />
            <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="8" result="fibre" />
            <feDisplacementMap in="uneven" in2="fibre" scale="1.1" xChannelSelector="R" yChannelSelector="G" result="bled" />
            <feGaussianBlur in="bled" stdDeviation="0.16" />
          </filter>
          <filter id={id("drop")} x="-24%" y="-20%" width="152%" height="154%">
            <feDropShadow dx="4" dy="9" stdDeviation="7.5" floodColor="#000" floodOpacity="0.78" />
          </filter>
          <filter id={id("drop2")} x="-30%" y="-26%" width="164%" height="162%">
            <feDropShadow dx="2.5" dy="5" stdDeviation="4" floodColor="#000" floodOpacity="0.66" />
          </filter>
          <filter id={id("soft")} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          <filter id={id("glow")} x="-40%" y="-60%" width="180%" height="220%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
          <filter id={id("stain")} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.6" />
          </filter>
          <clipPath id={id("photo")}>
            <rect width="144" height="164" />
          </clipPath>
          <pattern id={id("dots")} patternUnits="userSpaceOnUse" width="13" height="13">
            <circle cx="6.5" cy="6.5" r="1.5" fill="#9d9a94" opacity="0.8" />
          </pattern>
          <pattern id={id("grid")} patternUnits="userSpaceOnUse" width="10" height="10">
            <path d="M10 0H0V10" fill="none" stroke="#c9d3da" strokeWidth="0.6" />
          </pattern>
          <pattern id={id("twill")} patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)">
            <rect width="4" height="1.3" fill="#a3a7ad" opacity="0.5" />
            <rect y="2" width="4" height="0.7" fill="#2c2f34" opacity="0.5" />
          </pattern>
          <linearGradient id={id("studio")} x1="0" y1="0" x2="0.6" y2="1">
            <stop offset="0" stopColor="#dcdcda" />
            <stop offset="0.55" stopColor="#b9b9b6" />
            <stop offset="1" stopColor="#7d7d7b" />
          </linearGradient>
          <linearGradient id={id("face")} x1="0" y1="0" x2="1" y2="0.4">
            <stop offset="0" stopColor="#d3d0ca" />
            <stop offset="0.6" stopColor="#bab6ae" />
            <stop offset="1" stopColor="#8d8a84" />
          </linearGradient>
          <linearGradient id={id("photoShade")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.08" />
            <stop offset="0.5" stopColor="#000000" stopOpacity="0" />
            <stop offset="1" stopColor="#000000" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id={id("paper")} x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0" stopColor="#fbfbf9" />
            <stop offset="0.55" stopColor="#f2f2f0" />
            <stop offset="1" stopColor="#e0e0dd" />
          </linearGradient>
          <linearGradient id={id("sheet")} x1="0" y1="0" x2="0.3" y2="1">
            <stop offset="0" stopColor="#e9e8e5" />
            <stop offset="0.5" stopColor="#d9d8d5" />
            <stop offset="1" stopColor="#c3c2bf" />
          </linearGradient>
          <linearGradient id={id("wood")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e6c184" />
            <stop offset="0.45" stopColor="#d3a662" />
            <stop offset="1" stopColor="#b2853f" />
          </linearGradient>
          <linearGradient id={id("alu")} x1="0" y1="0" x2="0.5" y2="1">
            <stop offset="0" stopColor="#f4f4f6" />
            <stop offset="0.3" stopColor="#c6c7cb" />
            <stop offset="0.7" stopColor="#8c8e93" />
            <stop offset="1" stopColor="#e2e3e6" />
          </linearGradient>
          <linearGradient id={id("screen")} x1="0" y1="0" x2="0.2" y2="1">
            <stop offset="0" stopColor="#1b1b1f" />
            <stop offset="1" stopColor="#0a0a0c" />
          </linearGradient>
          <linearGradient id={id("chrome")} x1="0" y1="0" x2="0.35" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.28" stopColor="#c9cbd0" />
            <stop offset="0.55" stopColor="#7c7f86" />
            <stop offset="0.8" stopColor="#d5d7db" />
            <stop offset="1" stopColor="#8f9298" />
          </linearGradient>
          <linearGradient id={id("denim")} x1="0" y1="0" x2="0.5" y2="1">
            <stop offset="0" stopColor="#7a7e86" />
            <stop offset="1" stopColor="#4d5158" />
          </linearGradient>
          <linearGradient id={id("strip")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f6f5f2" />
            <stop offset="1" stopColor="#dcdad4" />
          </linearGradient>
          <linearGradient id={id("plastic")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.05" />
            <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.22" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0.42" />
          </linearGradient>
          <linearGradient id={id("leaf")} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#0f2f16" />
            <stop offset="1" stopColor="#2f7d3b" />
          </linearGradient>
          {tiles.map((t, i) => (
            <linearGradient key={i} id={id("tile" + i)} x1="0" y1="0" x2="0.35" y2="1">
              <stop offset="0" stopColor={t.tint} />
              <stop offset="1" stopColor="#0a0d14" />
            </linearGradient>
          ))}
        </defs>

        {/* the desk */}
        <rect width={W} height={H} fill="#070708" />
        <rect width={W} height={H} filter={u("fibre")} opacity="0.34" style={{ mixBlendMode: "screen" }} />
        <ellipse cx="320" cy="400" rx="440" ry="420" fill="#2a2a2e" opacity="0.3" filter={u("soft")} />

        {/* red yarn, behind the sheet's edge and round the smiley pin */}
        <g fill="none" stroke="#b6231a" strokeWidth="4.4" strokeLinecap="round">
          <path d="M-6 318C24 322 44 336 40 356C36 378 8 386 -6 396" />
          <path d="M-6 574C10 582 14 600 2 618" />
          <path d="M-6 946C36 928 72 948 82 984C66 1006 22 998 -6 970" />
        </g>
        <g fill="none" stroke="#e5574a" strokeWidth="1.1" strokeLinecap="round" opacity="0.55">
          <path d="M-6 316C24 320 44 334 40 354" />
          <path d="M-6 944C36 926 72 946 82 982" />
        </g>

        {/* the perforated backing sheet, creased, torn along the top */}
        <g filter={u("drop")}>
          {torn([[44, 36], [300, 30], [402, 78], [400, 852], [46, 858]], 5, 3, u("sheet"), u("crease"))}
          <path d={ragged([[44, 36], [300, 30], [402, 78], [400, 852], [46, 858]], 5, 3)} fill={u("dots")} opacity="0.55" />
        </g>

        {/* earbud cable along the top */}
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M-8 34C30 12 58 46 96 30S150 0 190 22S232 62 268 40S326 4 372 26S428 48 470 22" stroke="#000" strokeWidth="7" opacity="0.4" transform="translate(2 4)" />
          <path d="M-8 34C30 12 58 46 96 30S150 0 190 22S232 62 268 40S326 4 372 26S428 48 470 22" stroke="#ecebe7" strokeWidth="5.4" />
          <path d="M-8 34C30 12 58 46 96 30S150 0 190 22S232 62 268 40S326 4 372 26S428 48 470 22" stroke="#b7b5b0" strokeWidth="1.2" transform="translate(0 1.6)" opacity="0.7" />
          <g transform="rotate(-28 40 22)">
            <rect x="26" y="12" width="28" height="18" rx="9" fill="#efeeeb" stroke="#bdbbb6" strokeWidth="0.8" />
            <circle cx="46" cy="21" r="4.5" fill="#cfcdc8" />
          </g>
        </g>

        {/* palm leaves, top right */}
        <g transform="translate(748 -14)">
          {[98, 111, 124, 137, 150, 163, 176].map((a, i) => (
            <g key={i} transform={"rotate(" + a + ")"}>
              <path d={"M0 0C14 -9 90 -11 " + (146 + (i % 3) * 14) + " 0C90 11 14 9 0 0Z"} fill={u("leaf")} />
              <path d={"M4 0L" + (140 + (i % 3) * 14) + " 0"} stroke="#3f9a4a" strokeWidth="0.9" opacity="0.7" />
            </g>
          ))}
          <path d="M0 0C-20 30 -30 70 -24 118" fill="none" stroke="#1d4d25" strokeWidth="5" strokeLinecap="round" />
        </g>

        {/* a ruled strip, torn, on the right edge */}
        <g filter={u("drop2")} transform="rotate(3 724 546)">
          {torn(rectPts(708, 474, 44, 146), 3.5, 27, "#f5f5f3")}
          <g stroke="#b9c8d8" strokeWidth="0.8">
            {Array.from({ length: 11 }, (_, i) => (
              <line key={i} x1="710" y1={486 + i * 12.5} x2="752" y2={486 + i * 12.5} />
            ))}
          </g>
          <line x1="716" y1="476" x2="716" y2="618" stroke="#e39a9a" strokeWidth="0.8" />
        </g>

        {/* the receipt, crumpled. The print lives inside the crumple so the folds shade the
            ink with the paper; the marker sits above it, crisp, so hovering never re-lights
            the sheet. */}
        <g filter={u("drop")}>
          <g filter={u("crumple")}>
            {torn(rectPts(352, 196, 352, 550), 4.5, 5, u("paper"))}
            {/* coffee ring, top right of the receipt */}
            <g opacity="0.88" filter={u("stain")}>
              <circle cx="622" cy="254" r="49" fill="none" stroke="#8a6535" strokeWidth="8" opacity="0.5" />
              <circle cx="624" cy="256" r="52" fill="none" stroke="#a37c45" strokeWidth="2" opacity="0.35" />
              <path d="M578 268C588 300 640 306 664 276" fill="none" stroke="#7c5a2e" strokeWidth="6" opacity="0.4" strokeLinecap="round" />
              <circle cx="622" cy="254" r="44" fill="#c9a874" opacity="0.2" />
            </g>
            <g className="frb-ink" filter={u("ink")}>
              <text className="frb-sans" x="426" y="272" fontSize="23" fill="#1c1c1d">the</text>
              <text className="frb-sans" x="426" y="309" fontSize="39" fontWeight="700" fill="#141415" letterSpacing="-1">experience</text>
              <text className="frb-sans" x="566" y="337" fontSize="23" fill="#1c1c1d">shop</text>
              <text className="frb-sans" x="420" y="366" fontSize="10.5" fill="#7a7874">items</text>
              <text className="frb-sans" x="608" y="366" fontSize="10.5" fill="#7a7874">date</text>
              {items.slice(0, 6).map((row, i) => {
                const y = 394 + i * 48
                const tw = row.title.length * 8.1
                return (
                  <g key={i}>
                    <text className="frb-sans" x="420" y={y} fontSize="15" fontWeight="700" fill="#141415">{row.title}</text>
                    <line x1={420 + tw + 8} y1={y - 3} x2="598" y2={y - 3} stroke="#8f8d88" strokeWidth="1.2" strokeDasharray="1.2 3.8" strokeLinecap="round" opacity="0.8" />
                    <text className="frb-sans" x="606" y={y} fontSize="13" fontWeight="700" fill="#141415">{row.date}</text>
                    {(row.lines ?? []).slice(0, 2).map((l, j) => (
                      <text key={j} className="frb-sans" x="424" y={y + 14 + j * 11} fontSize="9.4" fontStyle="italic" fill="#8a8883">{l}</text>
                    ))}
                  </g>
                )
              })}
              <rect x="478" y="650" width="90" height="38" rx="5" fill="#121214" />
              <text className="frb-sans" x="523" y="678" fontSize="19" fontWeight="800" textAnchor="middle" fill="#f5c518" letterSpacing="0.5">CODE</text>
              <text className="frb-sans" x="480" y="704" fontSize="7.8" fill="#6d6b67">scan the code</text>
              <text className="frb-sans" x="480" y="714" fontSize="7.8" fill="#6d6b67">to view GitHub</text>
            </g>
            {qr(codeQr, 582, 636, 84)}
          </g>
        </g>
        {items.slice(0, 6).map((row, i) => {
          const y = 394 + i * 48
          const tw = row.title.length * 8.1
          return (
            <g key={i} className="frb-hit">
              <rect x="414" y={y - 17} width={tw + 14} height="24" fill="transparent" />
              <path className="frb-ring" d={loop(420 + tw / 2, y - 5, tw / 2 + 10, 14, i + 2)} pathLength={1} fill="none" stroke={RED} strokeWidth="1.9" strokeLinecap="round" pointerEvents="none" />
            </g>
          )
        })}
        <a href={codeUrl} target="_blank" rel="noreferrer" className="frb-hit">
          <rect x="474" y="632" width="196" height="92" fill="transparent" />
          <path className="frb-ring" d={loop(523, 669, 58, 27, 7)} pathLength={1} fill="none" stroke={RED} strokeWidth="1.9" strokeLinecap="round" pointerEvents="none" />
        </a>

        {/* photo + name card */}
        <g filter={u("drop")}>
          <rect x="42" y="92" width="350" height="172" fill="#f6f6f4" />
          <rect x="42" y="92" width="350" height="172" fill={u("paper")} opacity="0.5" />
          <g transform="translate(46 96)">
            {photo ? (
              <g clipPath={u("photo")}>
                <image href={photo} x="0" y="0" width="144" height="164" preserveAspectRatio="xMidYMid slice" filter={u("mono")} />
                <rect width="144" height="164" fill={u("photoShade")} opacity="0.7" />
                <rect width="144" height="164" filter={u("grain")} opacity="0.18" style={{ mixBlendMode: "multiply" }} />
              </g>
            ) : (
              drawnPhoto(144, 164)
            )}
          </g>
          <g className="frb-ink" filter={u("ink")}>
            <text className="frb-sans" x="204" y="121" fontSize="21" fontWeight="700" fill="#1a1a1b" textLength="172" lengthAdjust="spacingAndGlyphs">{name}</text>
            <text className="frb-sans" x="204" y="139" fontSize="13.5" fontWeight="700" fill="#2a2a2c">{title}</text>
            {roles.slice(0, 3).map((r, i) => (
              <text key={i} className="frb-sans" x="204" y={155 + i * 11.5} fontSize="8.8" fontStyle="italic" fontWeight="600" fill="#4a4a4c">{r}</text>
            ))}
            <rect x="204" y="191" width="176" height="17" fill="none" stroke="#242426" strokeWidth="1" />
            <line x1="292" y1="191" x2="292" y2="208" stroke="#242426" strokeWidth="1" />
            <text className="frb-sans" x="210" y="203" fontSize="7" fontWeight="600" fill="#242426">{country}</text>
            <text className="frb-sans" x="298" y="203" fontSize="7" fontWeight="600" fill="#242426">{locale}</text>
            {contacts.slice(0, 3).map((c, i) => {
              const y = 219 + i * 15.5
              return (
                <g key={i}>
                  {contactIcon(c.kind, 211, y)}
                  <text className="frb-sans" x="224" y={y + 3} fontSize="8.2" fill="#242426">{c.text}</text>
                </g>
              )
            })}
          </g>
        </g>
        {contacts.slice(0, 3).map((c, i) => {
          const y = 219 + i * 15.5
          const tw = c.text.length * 4.6
          const inner = (
            <>
              <rect x="200" y={y - 9} width={tw + 32} height="18" fill="transparent" />
              <path className="frb-ring" d={loop(224 + tw / 2, y, tw / 2 + 10, 8.2, i + 11)} pathLength={1} fill="none" stroke={RED} strokeWidth="1.7" strokeLinecap="round" pointerEvents="none" />
              {i === linkRow ? (
                <path className="frb-arrow" d={"M" + (236 + tw) + " " + (y - 2) + "C" + (270 + tw) + " " + (y - 14) + " 396 226 428 208M416 205L428 208L421 220"} pathLength={1} fill="none" stroke={RED} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />
              ) : null}
            </>
          )
          return c.href ? (
            <a key={i} href={c.href} target={c.kind === "link" ? "_blank" : undefined} rel={c.kind === "link" ? "noreferrer" : undefined} className="frb-hit">
              {inner}
            </a>
          ) : (
            <g key={i} className="frb-hit">{inner}</g>
          )
        })}
        {paperClip(62, 80, 46, "#d9b04a", "#fbe8a6", 2)}

        {/* "my portfolio" — a real QR on torn paper, over the receipt's top */}
        <a href={portfolioUrl} target="_blank" rel="noreferrer" className="frb-hit">
          <g className="frb-lift">
            <g filter={u("drop")}>
              <g filter={u("crease")}>
                {torn(rectPts(446, 62, 164, 172), 5, 9, "#f9f9f7")}
                {qr(portfolioQr, 466, 92, 122)}
              </g>
            </g>
            <g transform="rotate(-2 498 68)" filter={u("drop2")}>
              <path d={ragged([[428, 54], [568, 54], [568, 84], [428, 84]], 1.2, 31, 7)} fill="#fbfaf7" stroke="#1a1a1b" strokeWidth="1.7" strokeLinejoin="round" />
              <g className="frb-ink" filter={u("ink")}>
                {hand("my portfolio", 444, 76, 14.5, [{ stroke: "#141415", width: 2.1 }], -6, 4)}
              </g>
            </g>
            {paperClip(596, 190, 44, "#d9b04a", "#fbe8a6", -84)}
          </g>
        </a>

        {/* the watch — a screen, so its type stays crisp */}
        <g filter={u("drop")}>
          <rect x="176" y="460" width="132" height="28" rx="6" fill="#8f9196" />
          <rect x="126" y="268" width="232" height="202" rx="52" fill={u("alu")} />
          <rect x="131" y="273" width="222" height="192" rx="47" fill="#0a0a0b" />
          <rect x="140" y="282" width="204" height="174" rx="38" fill={u("screen")} />
          <rect x="140" y="282" width="204" height="174" rx="38" fill="none" stroke="#2a2a2e" strokeWidth="1" />
          <rect x="358" y="320" width="12" height="36" rx="5" fill={u("alu")} />
          <g stroke="#6b6d72" strokeWidth="1">
            {Array.from({ length: 7 }, (_, i) => (
              <line key={i} x1="359" y1={325 + i * 4.5} x2="369" y2={325 + i * 4.5} />
            ))}
          </g>
          <rect x="358" y="368" width="8" height="28" rx="4" fill="#9c9ea3" />
          <g>
            <rect x="156" y="300" width="80" height="22" rx="11" fill="#2c2c2f" />
            <text className="frb-sans" x="196" y="315.5" fontSize="11.5" fontWeight="600" textAnchor="middle" fill="#ffffff">about me</text>
            <rect x="268" y="305" width="24" height="12" rx="3" fill="none" stroke="#4ade80" strokeWidth="1.2" />
            <rect x="270" y="307" width="17" height="8" rx="1" fill="#4ade80" />
            <rect x="293" y="308.5" width="2" height="5" rx="1" fill="#4ade80" />
            <text className="frb-sans" x="330" y="316" fontSize="13.5" fontWeight="600" textAnchor="middle" fill="#ffffff">12:15</text>
          </g>
          {about.slice(0, 8).map((line, i) => emphasised(line, i, 156, 344 + i * 15, 10.6))}
        </g>
        {paperClip(304, 476, 48, "#d23a2f", "#ff9d94", 6)}

        {/* smiley pin, over the yarn */}
        <g transform="rotate(-8 58 356)" filter={u("drop2")}>
          <circle cx="58" cy="356" r="25" fill="#f5c630" />
          <circle cx="58" cy="356" r="25" fill="none" stroke="#d3a21a" strokeWidth="1.6" />
          <circle cx="49" cy="349" r="3.4" fill="#1a1a1a" />
          <circle cx="67" cy="349" r="3.4" fill="#1a1a1a" />
          <path d="M46 362C52 372 64 372 70 362" fill="none" stroke="#1a1a1a" strokeWidth="3.2" strokeLinecap="round" />
        </g>

        {/* education: a torn label, then a notebook page; hover an entry and it gets underlined */}
        <g filter={u("drop2")} transform="rotate(-1 156 504)">
          <g filter={u("crease")}>
            {torn(rectPts(38, 480, 236, 50), 4, 21, "#f4f4f2")}
            <g className="frb-ink" filter={u("ink")}>
              <text className="frb-sans" x="84" y="514" fontSize="23" fontWeight="600" fill="#1a1a1b">education</text>
            </g>
          </g>
        </g>
        <g transform="rotate(-0.8 214 603)">
          <g filter={u("drop2")}>
            <g filter={u("crease")}>
              {torn(rectPts(96, 536, 236, 134), 1.6, 33, "#fafaf8")}
              <g stroke="#c6d3e2" strokeWidth="0.7">
                {Array.from({ length: 8 }, (_, i) => (
                  <line key={i} x1="98" y1={556 + i * 15} x2="330" y2={556 + i * 15} />
                ))}
              </g>
              <g fill="#cdcbc5" stroke="#aaa7a0" strokeWidth="0.6">
                {Array.from({ length: 7 }, (_, i) => (
                  <circle key={i} cx="106" cy={547 + i * 19} r="3.2" />
                ))}
              </g>
              <g className="frb-ink" filter={u("ink")}>
                {education.slice(0, 3).map((e, i) => {
                  const y = 561 + i * 40
                  return (
                    <g key={i}>
                      <text className="frb-sans" x="120" y={y} fontSize="12.5" fontWeight="700" fill="#171718">{e.title}</text>
                      <text className="frb-sans" x="324" y={y} fontSize="8.8" fontWeight="600" textAnchor="end" fill="#3a3a3c">{e.date}</text>
                      {(e.detail ?? []).slice(0, 2).map((d, j) => (
                        <text key={j} className="frb-sans" x="122" y={y + 11 + j * 9.5} fontSize="7.6" fill="#7a7873">{d}</text>
                      ))}
                    </g>
                  )
                })}
              </g>
              <rect x="282" y="656" width="50" height="16" rx="1" fill="#ffffff" opacity="0.4" transform="rotate(-8 307 664)" />
            </g>
          </g>
          {education.slice(0, 3).map((e, i) => {
            const y = 561 + i * 40
            return (
              <g key={i} className="frb-hit">
                <rect x="114" y={y - 12} width="212" height="32" fill="transparent" />
                <path className="frb-ring" d={underline(120, y + 3, e.title.length * 7.2, i + 3)} pathLength={1} fill="none" stroke={RED} strokeWidth="1.8" strokeLinecap="round" pointerEvents="none" />
              </g>
            )
          })}
        </g>

        {/* abilities, handwritten on grid paper; hover a line and it gets ticked */}
        <g filter={u("drop2")}>
          <g filter={u("crease")}>
            {torn(rectPts(96, 712, 226, 124), 1.6, 37, "#fbfbf9")}
            <path d={ragged(rectPts(96, 712, 226, 124), 1.6, 37)} fill={u("grid")} />
            <g fill="#cdcbc5" stroke="#aaa7a0" strokeWidth="0.6">
              {Array.from({ length: 6 }, (_, i) => (
                <circle key={i} cx="104" cy={724 + i * 20} r="2.6" />
              ))}
            </g>
            <g className="frb-ink" filter={u("ink")}>
              {abilities.slice(0, 6).map((a, i) => (
                <g key={i}>{hand(a, 122, 742 + i * 16.5, 12.5, [{ stroke: "#262a36", width: 1.7 }], -8, i)}</g>
              ))}
              <path d="M298 792L302 802L313 803L304 810L307 821L298 814L289 821L292 810L283 803L294 802Z" fill="none" stroke="#2a2a2e" strokeWidth="1.4" strokeLinejoin="round" transform="rotate(-12 298 806)" />
            </g>
          </g>
        </g>
        {abilities.slice(0, 6).map((a, i) => {
          const y = 742 + i * 16.5
          const w = writeScript(a, i).width * (12.5 / 62)
          return (
            <g key={i} className="frb-hit">
              <rect x="118" y={y - 12} width={w + 30} height="16" fill="transparent" />
              <path className="frb-ring" d={tick(124 + w, y - 4, i)} pathLength={1} fill="none" stroke={RED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />
            </g>
          )
        })}
        <g filter={u("drop2")} transform="rotate(-1.2 198 694)">
          <rect x="40" y="676" width="316" height="36" rx="18" fill={u("wood")} />
          {hand("abilities", 92, 705, 21, [{ stroke: "#8a6534", width: 9.5 }, { stroke: "#fbf8f0", width: 5.2 }], -6, 8)}
          <g stroke="#a67a3e" strokeWidth="0.7" opacity="0.35" fill="none">
            <path d="M56 686C130 682 230 690 340 685" />
            <path d="M56 700C140 704 240 696 340 702" />
            <path d="M120 693C180 691 260 695 300 692" />
          </g>
        </g>
        <g transform="rotate(-6 306 706)" filter={u("drop2")}>
          <path d="M291 702L321 702L317 720L295 720Z" fill="#232326" />
          <path d="M291 702L321 702L320 706L292 706Z" fill="#3a3a3e" />
          <g fill="none" stroke="#d2d3d6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M298 702L295 688A4 4 0 0 1 303 687L301 702" />
            <path d="M314 702L317 688A4 4 0 0 0 309 687L311 702" />
          </g>
        </g>

        {/* denim, then the SD card and the app tiles on it — objects, so they lift on hover */}
        <g filter={u("drop")}>
          <path d={ragged([[360, 740], [704, 728], [712, 996], [372, 1004]], 4, 17, 8)} fill={u("denim")} filter={u("fold")} />
          <path d={ragged([[360, 740], [704, 728], [712, 996], [372, 1004]], 4, 17, 8)} fill={u("twill")} opacity="0.4" />
          <path d={fray([[360, 740], [704, 728], [712, 996], [372, 1004]], 17)} fill="none" stroke="#dcdee2" strokeWidth="0.9" strokeLinecap="round" opacity="0.7" />
        </g>
        <g className="frb-hit" transform="rotate(-16 402 727)">
          <g className="frb-lift" filter={u("drop")}>
            <path d="M356 672L436 672L450 686L450 782L356 782Z" fill="#141416" />
            <rect x="356" y="672" width="80" height="13" fill="#202023" />
            <g fill="#d1a83e">
              {Array.from({ length: 8 }, (_, i) => (
                <rect key={i} x={361 + i * 9.8} y="674" width="7" height="11" rx="1.5" />
              ))}
            </g>
            <rect x="352" y="708" width="5" height="16" rx="2" fill="#3a3a3e" />
            {hand("software", 368, 730, 13.5, [{ stroke: "#f5f5f5", width: 2.2 }], -6, 12)}
            {hand("skills", 368, 756, 13.5, [{ stroke: "#f5f5f5", width: 2.2 }], -6, 13)}
          </g>
        </g>
        {tiles.slice(0, 4).map((t, i) => {
          const x = [412, 536, 404, 528][i]
          const y = [786, 780, 900, 894][i]
          const rot = [-5, 7, -3, 9][i]
          return (
            <g key={i} className="frb-hit" transform={"rotate(" + rot + " " + (x + 52) + " " + (y + 52) + ")"}>
              <g className="frb-lift" filter={u("drop")}>
                <rect x={x} y={y} width="104" height="104" rx="24" fill={u("chrome")} />
                <rect x={x + 5} y={y + 5} width="94" height="94" rx="20" fill="#1c1f26" />
                <rect x={x + 8} y={y + 8} width="88" height="88" rx="18" fill={u("tile" + i)} />
                <rect x={x + 12} y={y + 12} width="80" height="36" rx="14" fill="#ffffff" opacity="0.06" />
                <text
                  className="frb-sans"
                  x={x + 52}
                  y={y + 68}
                  fontSize={t.label.length > 2 ? 33 : 42}
                  fontWeight="700"
                  textAnchor="middle"
                  fill={t.ink ?? "#dfe8f5"}
                >
                  {t.label}
                </text>
              </g>
            </g>
          )
        })}

        {/* soft skills: a glowing tag, then torn strips stepping down; each lifts and gets underlined */}
        <g transform="rotate(-1 110 854)">
          <rect x="50" y="832" width="150" height="42" rx="6" fill="#0b141c" opacity="0.7" />
          {hand("soft skills", 60, 866, 22, [{ stroke: "#3fd0f2", width: 9, filter: u("glow"), opacity: 0.8 }, { stroke: "#062230", width: 5.6 }, { stroke: "#f2fdff", width: 2.4 }], -6, 20)}
          <line x1="56" y1="875" x2="194" y2="875" stroke="#3fd0f2" strokeWidth="1.4" opacity="0.8" />
        </g>
        {skills.slice(0, 4).map((s, i) => {
          const x = [94, 122, 70, 176][i]
          const y = [870, 903, 946, 976][i]
          const w = [172, 190, 176, 186][i]
          const rot = [-1, 0.8, -0.6, 0.5][i]
          return (
            <g key={i} className="frb-hit" transform={"rotate(" + rot + " " + (x + w / 2) + " " + (y + 15) + ")"}>
              <g className="frb-lift">
                <g filter={u("drop2")}>
                  <g filter={u("crease")}>
                    {torn(rectPts(x, y, w, 30), 1.1, 41 + i, u("strip"))}
                    <g className="frb-ink" filter={u("ink")}>
                      <text className="frb-sans" x={x + 12} y={y + 21} fontSize="15.5" fontStyle="italic" fontWeight="700" fill="#1c1c1e">{s}</text>
                    </g>
                  </g>
                </g>
                <path className="frb-ring" d={underline(x + 12, y + 25, s.length * 8.4, i + 50)} pathLength={1} fill="none" stroke={RED} strokeWidth="1.8" strokeLinecap="round" pointerEvents="none" />
              </g>
            </g>
          )
        })}
        {hand("teamwork", 258, 966, 10.5, [{ stroke: "#f2f2f2", width: 1.6 }], -8, 5)}
        <g transform="rotate(-4 322 860)">
          <rect x="300" y="847" width="44" height="26" fill="#f4f2ec" />
          <g fill="#1b1b1c">
            {Array.from({ length: 13 }, (_, i) => (
              <rect key={i} x={303 + i * 3} y="851" width={i % 3 === 0 ? 1.6 : 0.9} height="18" />
            ))}
          </g>
        </g>

        {/* the corner of a plastic sleeve, bottom right */}
        <g>
          <path d="M604 1042L742 1042L742 872C704 896 656 962 604 1042Z" fill={u("plastic")} />
          <path d="M742 872C704 896 656 962 604 1042" fill="none" stroke="#ffffff" strokeWidth="1.4" opacity="0.5" />
          <path d="M742 900C712 922 676 972 640 1042" fill="none" stroke="#ffffff" strokeWidth="0.8" opacity="0.25" />
        </g>

        {/* grain over the whole board — it must not swallow the hover under it */}
        <rect width={W} height={H} filter={u("grain")} opacity="0.14" style={{ mixBlendMode: "overlay" }} pointerEvents="none" />
      </svg>

      <div className="frb-l frb-vig" />
    </section>
  )
}
