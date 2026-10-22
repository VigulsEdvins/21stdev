"use client"

/**
 * Florilegium Template — a botanical journal and atelier landing page built
 * around one object: a single procedural flower that never cuts. It blooms out
 * of the preloader, settles into the editorial hero, and from there every
 * scroll step morphs the same mesh into the next species — anemone, dahlia,
 * poppy (pixelated), four catalogue specimens on black, and three footer
 * blooms with hand-scribbled notes drawn around them.
 *
 * One file. React is the only import. One WebGL1 canvas (2D fallback), the
 * mesh is generated on the CPU from a species "form" and re-generated only
 * while a morph is in flight. Handwriting is stroked SVG, no web fonts.
 */

import * as React from "react"

// ---- public types ---------------------------------------------------------

/** The shape of one species. Every number morphs; counts may be fractional. */
export type FlowerForm = {
  /** petal whorls, 1–9 */
  layers: number
  /** petals per whorl: [outer, inner] — up to 21 */
  petals: [number, number]
  /** petal length [outer, inner]; the open head is normalised to radius ≈ 1 */
  length: [number, number]
  /** petal half-width [outer, inner] */
  width: [number, number]
  /** petal base elevation in degrees [outer, inner]; 0 flat, 90 upright */
  open: [number, number]
  /** bend along the petal in degrees; + reflexes outward, − cups inward */
  curl: [number, number]
  /** cross-section roll in radians; 0 flat, ~1.6 quilled */
  roll: [number, number]
  /** attachment radius [outer, inner] */
  base: [number, number]
  /** 0 alternates whorls, 1 spirals them on the golden angle */
  stagger: number
  ruffle: number
  ruffleFreq: number
  /** tip superellipse: 1 pointed, 2 round, 3 square */
  tip: number
  /** where the petal is widest: <1 near the base, >1 near the tip */
  widest: number
  notch: number
  twist: number
  jitter: number
  innerMix: number
  blotchSize: number
  blotchAmt: number
  vein: number
  speckle: number
  crinkle: number
  sheen: number
  /** grazing-angle sheen of velvety petals (rose, anemone) */
  velvet: number
  /** low-frequency waviness of the petal blade, 0–1 */
  wave: number
  /** margins rolling back, as rose petals do */
  reflex: number
  disk: number
  diskHeight: number
  /** 0 plain, 1 radiating stigma (poppy), 2 florets (sunflower), 3 knobbly boss (anemone) */
  diskPattern: number
  stamens: number
  stamenLength: number
  stamenSpread: number
  antherSize: number
  sepals: number
  sepalLength: number
  stemWidth: number
  stemBend: number
  leaves: number
  leafLength: number
  leafWidth: number
  leafAt: number
  leafSerration: number
  /** frilled bracts just under the head (anemone involucre), 0–9 */
  collar: number
  colors: {
    /** base → body → tip of the outer whorl */
    petal: [string, string, string]
    inner: string
    blotch: string
    disk: string
    ring: string
    filament: string
    anther: string
    green: string
  }
}

export type FlorilegiumSpecies = {
  /** display name */
  name: string
  latin: string
  family: string
  origin: string
  blurb: string
  /** a preset key of FLORA, or a full form */
  form: string | FlowerForm
  note?: { title: string; text: string; credit: string }
  care?: { light: string; water: string; season: string; vase: string }
}

export type ScribbleNote = {
  text: string
  /** centre, % of the stage */
  x: number
  y: number
  /** degrees */
  rotate?: number
  /** cap height in cqw */
  size?: number
  arrow?: { x: number; y: number; rotate?: number; scale?: number; shape?: "curve" | "hook" | "line" | "loop" }
}

export type FooterBloom = {
  species: FlorilegiumSpecies
  word: string
  notes: ScribbleNote[]
}

export type FlorilegiumLink = { label: string; href?: string; scene?: number }

export type FlorilegiumPalette = {
  paper: string
  panel: string
  ink: string
  mute: string
  night: string
  nightInk: string
  nightMute: string
  footer: string
  footerInk: string
  footerMute: string
  accent: string
}

// ---- species ---------------------------------------------------------------

// #region flower
const BASE_FORM: FlowerForm = {
  layers: 1, petals: [6, 6], length: [0.8, 0.6], width: [0.3, 0.25], open: [15, 30], curl: [0, 0],
  roll: [0.3, 0.3], base: [0.08, 0.06], stagger: 0, ruffle: 0, ruffleFreq: 3, tip: 2, widest: 1,
  notch: 0, twist: 0, jitter: 0.08, innerMix: 0.3, blotchSize: 0.2, blotchAmt: 0, vein: 0.3,
  speckle: 0, crinkle: 0, sheen: 0.3, velvet: 0.1, wave: 0.55, reflex: 0, disk: 0.08, diskHeight: 0.06, diskPattern: 0, stamens: 0,
  stamenLength: 0.2, stamenSpread: 45, antherSize: 0.02, sepals: 0, sepalLength: 0.3,
  stemWidth: 0.035, stemBend: 0.2, leaves: 0, leafLength: 0.7, leafWidth: 0.2, leafAt: 0.25,
  leafSerration: 0, collar: 0,
  colors: {
    petal: ["#888888", "#aaaaaa", "#cccccc"], inner: "#aaaaaa", blotch: "#222222", disk: "#333333",
    ring: "#444444", filament: "#333333", anther: "#222222", green: "#4c6b36",
  },
}

const form = (o: { [k: string]: unknown }) => ({ ...BASE_FORM, ...o }) as FlowerForm

/** Ten tuned species. Pass a key as `form`, or spread one to make your own. */
export const FLORA = {
  anemone: form({
    velvet: 0.3, wave: 0.5, layers: 1, petals: [8, 8], length: [0.84, 0.72], width: [0.45, 0.4], open: [20, 36], curl: [-30, -30],
    roll: [0.42, 0.5], base: [0.13, 0.12], stagger: 0, ruffle: 0.04, ruffleFreq: 2.5, tip: 2.4, widest: 1.45,
    jitter: 0.1, innerMix: 0.25, blotchSize: 0.22, blotchAmt: 0.9, vein: 0.5, crinkle: 0.1, sheen: 0.2,
    disk: 0.19, diskHeight: 0.14, diskPattern: 3, stamens: 96, stamenLength: 0.2, stamenSpread: 40, antherSize: 0.017,
    stemWidth: 0.034, stemBend: 0.3, collar: 7,
    colors: {
      petal: ["#2a1960", "#5238a6", "#6a50c2"], inner: "#5f45ba", blotch: "#f1eee9", disk: "#1a1526",
      ring: "#2c2140", filament: "#1b1526", anther: "#231b33", green: "#4b6a35",
    },
  }),
  dahlia: form({
    velvet: 0.15, wave: 0.3, layers: 9, petals: [14, 8], length: [0.86, 0.3], width: [0.2, 0.13], open: [4, 80], curl: [12, -44],
    roll: [1.45, 1.9], base: [0.1, 0.02], stagger: 1, tip: 2.1, widest: 1.1, notch: 0.05, jitter: 0.06,
    innerMix: 0.45, blotchSize: 0.3, blotchAmt: 0.3, vein: 0.25, sheen: 0.32, disk: 0.06, diskHeight: 0.08,
    sepals: 7, sepalLength: 0.28, stemWidth: 0.04, stemBend: 0.15, leaves: 2, leafLength: 0.9, leafWidth: 0.26,
    leafAt: 0.22, leafSerration: 0.08,
    colors: {
      petal: ["#b8406b", "#e27a9c", "#f3b0c3"], inner: "#b02f63", blotch: "#9a2654", disk: "#6e1a3f",
      ring: "#8a2550", filament: "#6e1a3f", anther: "#6e1a3f", green: "#3f5f32",
    },
  }),
  poppy: form({
    velvet: 0.1, wave: 0.95, layers: 2, petals: [2, 2], length: [0.84, 0.76], width: [0.64, 0.56], open: [24, 40], curl: [-26, -32],
    roll: [0.5, 0.62], base: [0.05, 0.04], stagger: 0, ruffle: 0.08, ruffleFreq: 3.5, tip: 2.3, widest: 1.25,
    jitter: 0.1, innerMix: 0.2, blotchSize: 0.19, blotchAmt: 0.95, vein: 0.35, crinkle: 0.9, sheen: 0.36,
    disk: 0.13, diskHeight: 0.17, diskPattern: 1, stamens: 72, stamenLength: 0.16, stamenSpread: 50,
    antherSize: 0.017, stemWidth: 0.03, stemBend: 0.4, leaves: 1, leafLength: 0.62, leafWidth: 0.13,
    leafAt: 0.35, leafSerration: 0.45,
    colors: {
      petal: ["#7a0d0a", "#df2f1d", "#f2482b"], inner: "#d42a18", blotch: "#100707", disk: "#6a7a58",
      ring: "#3f4c34", filament: "#16110f", anther: "#2b2420", green: "#5a7a3c",
    },
  }),
  ranunculus: form({
    velvet: 0.15, wave: 0.15, layers: 9, petals: [8, 5], length: [0.68, 0.24], width: [0.44, 0.22], open: [34, 84], curl: [-46, -78],
    roll: [0.95, 1.35], base: [0.13, 0.02], stagger: 1, ruffle: 0.02, tip: 2.4, widest: 1.2, jitter: 0.07,
    innerMix: 0.3, blotchSize: 0.25, blotchAmt: 0.2, vein: 0.3, crinkle: 0.05, sheen: 0.3, disk: 0.05,
    diskHeight: 0.06, sepals: 5, sepalLength: 0.25, stemWidth: 0.035, stemBend: 0.2, leaves: 2,
    leafLength: 0.6, leafWidth: 0.15, leafAt: 0.3, leafSerration: 0.35,
    colors: {
      petal: ["#c9482a", "#ef7a52", "#f9a581"], inner: "#e65d38", blotch: "#a8341b", disk: "#4f6a2f",
      ring: "#7c8f45", filament: "#4f6a2f", anther: "#4f6a2f", green: "#47663a",
    },
  }),
  magnolia: form({
    velvet: 0.05, wave: 0.35, layers: 2.2, petals: [6, 3], length: [1, 0.9], width: [0.34, 0.3], open: [50, 70], curl: [-8, -16],
    roll: [0.8, 0.9], base: [0.08, 0.05], stagger: 0, ruffle: 0.01, tip: 2, widest: 1.35, jitter: 0.08,
    innerMix: 0.4, blotchSize: 0.42, blotchAmt: 0.55, vein: 0.2, sheen: 0.45, disk: 0.06, diskHeight: 0.3,
    stamens: 40, stamenLength: 0.1, stamenSpread: 70, antherSize: 0.014, stemWidth: 0.05, stemBend: 0.1,
    colors: {
      petal: ["#962c69", "#e6c6d4", "#fbf4f3"], inner: "#f6ecef", blotch: "#7a1d56", disk: "#c9b16a",
      ring: "#8a7a40", filament: "#d9a46b", anther: "#c98a5a", green: "#6b5843",
    },
  }),
  lily: form({
    velvet: 0.1, wave: 0.5, layers: 1.7, petals: [3, 3], length: [1, 0.95], width: [0.2, 0.22], open: [55, 60], curl: [170, 160],
    roll: [0.25, 0.3], base: [0.04, 0.04], stagger: 0, ruffle: 0.05, ruffleFreq: 2, tip: 1.3, widest: 0.7,
    jitter: 0.08, innerMix: 0.2, blotchSize: 0.26, blotchAmt: 0.4, vein: 0.4, speckle: 0.9, sheen: 0.4,
    disk: 0.02, diskHeight: 0, stamens: 7, stamenLength: 0.85, stamenSpread: 28, antherSize: 0.05,
    stemWidth: 0.035, stemBend: 0.3, leaves: 3, leafLength: 0.7, leafWidth: 0.08, leafAt: 0.12,
    colors: {
      petal: ["#e8a85c", "#f0701f", "#dc4f12"], inner: "#f2801f", blotch: "#f7e9c0", disk: "#9a8a4a",
      ring: "#9a8a4a", filament: "#c9a47a", anther: "#7a2a14", green: "#4a6b2e",
    },
  }),
  waterlily: form({
    velvet: 0.1, wave: 0.3, layers: 4, petals: [10, 8], length: [0.95, 0.55], width: [0.2, 0.16], open: [4, 55], curl: [-6, -20],
    roll: [0.5, 0.7], base: [0.08, 0.05], stagger: 1, tip: 1.35, widest: 0.85, jitter: 0.07, innerMix: 0.3,
    blotchSize: 0.3, blotchAmt: 0.3, vein: 0.3, sheen: 0.35, disk: 0.15, diskHeight: 0.08, stamens: 60,
    stamenLength: 0.22, stamenSpread: 25, antherSize: 0.02, stemWidth: 0.03, stemBend: 0.6,
    colors: {
      petal: ["#f6e2ea", "#f3b7cc", "#e27ba0"], inner: "#f9d8e4", blotch: "#fff4d6", disk: "#f2c230",
      ring: "#e8a817", filament: "#f3c437", anther: "#f7d24a", green: "#3f6b3a",
    },
  }),
  rose: form({
    velvet: 0.25, wave: 0.2, reflex: 0.3, layers: 8, petals: [5, 5], length: [0.74, 0.32], width: [0.52, 0.32], open: [40, 86], curl: [10, -62],
    roll: [1.05, 1.45], base: [0.11, 0.02], stagger: 1, ruffle: 0.03, ruffleFreq: 2, tip: 2.6, widest: 1.3,
    jitter: 0.06, innerMix: 0.55, blotchSize: 0.25, blotchAmt: 0.3, vein: 0.2, crinkle: 0.1, sheen: 0.22,
    disk: 0, diskHeight: 0, sepals: 5, sepalLength: 0.42, stemWidth: 0.03, stemBend: 0.08,
    colors: {
      petal: ["#3d0412", "#8c0d2b", "#a8173a"], inner: "#5a0718", blotch: "#3a0612", disk: "#3a0612",
      ring: "#3a0612", filament: "#3a0612", anther: "#3a0612", green: "#3d5a2a",
    },
  }),
  tulip: form({
    velvet: 0.12, wave: 0.2, layers: 2, petals: [3, 3], length: [0.95, 0.92], width: [0.42, 0.4], open: [78, 82], curl: [-6, -10],
    roll: [0.9, 1], base: [0.08, 0.06], stagger: 0, tip: 2, widest: 1.2, jitter: 0.06, innerMix: 0.2,
    blotchSize: 0.13, blotchAmt: 0.55, vein: 0.2, sheen: 0.5, disk: 0.03, diskHeight: 0.2, stamens: 6,
    stamenLength: 0.3, stamenSpread: 15, antherSize: 0.03, stemWidth: 0.04, stemBend: 0.2, leaves: 2,
    leafLength: 1.3, leafWidth: 0.22, leafAt: 0.25,
    colors: {
      petal: ["#f2c94c", "#e8543a", "#d93a5a"], inner: "#e04a3a", blotch: "#2a1a3a", disk: "#d8d0a8",
      ring: "#d8d0a8", filament: "#2a2420", anther: "#1a1418", green: "#4f7a3a",
    },
  }),
  sunflower: form({
    velvet: 0.1, wave: 0.6, layers: 2, petals: [21, 21], length: [0.55, 0.46], width: [0.12, 0.11], open: [8, 18], curl: [10, 0],
    roll: [0.6, 0.6], base: [0.42, 0.4], stagger: 0.5, tip: 1.5, widest: 0.7, jitter: 0.1, innerMix: 0.3,
    blotchSize: 0.2, blotchAmt: 0.3, vein: 0.5, sheen: 0.2, disk: 0.44, diskHeight: 0.1, diskPattern: 2,
    sepals: 14, sepalLength: 0.3, stemWidth: 0.06, stemBend: 0.15, leaves: 2, leafLength: 0.9,
    leafWidth: 0.5, leafAt: 0.18, leafSerration: 0.15,
    colors: {
      petal: ["#d98a12", "#f2b31e", "#f7c832"], inner: "#e8a218", blotch: "#a85a0c", disk: "#3a2410",
      ring: "#6a3c14", filament: "#3a2410", anther: "#3a2410", green: "#4a6a2a",
    },
  }),
}

// ---- resolved, mixable form ---

type RForm = { n: FlowerForm; pal: number[][] }

const lin = (hex: string) => {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || "").trim())
  const v = m ? parseInt(m[1], 16) : 0x888888
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((c) => Math.pow(c / 255, 2.2))
}

const resolveForm = (f: FlowerForm): RForm => {
  const c = f.colors
  return {
    n: f,
    pal: [c.petal[0], c.petal[1], c.petal[2], c.inner, c.blotch, c.disk, c.ring, c.filament, c.anther, c.green].map(lin),
  }
}

const mixForm = (a: RForm, b: RForm, t: number): RForm => {
  if (t <= 0) return a
  if (t >= 1) return b
  const out: { [k: string]: unknown } = {}
  const an = a.n as unknown as { [k: string]: unknown }
  const bn = b.n as unknown as { [k: string]: unknown }
  for (const k in an) {
    const x = an[k]
    const y = bn[k]
    if (typeof x === "number" && typeof y === "number") out[k] = x + (y - x) * t
    else if (Array.isArray(x) && Array.isArray(y) && typeof x[0] === "number")
      out[k] = (x as number[]).map((v, i) => v + ((y as number[])[i] - v) * t)
    else out[k] = x
  }
  return { n: out as unknown as FlowerForm, pal: a.pal.map((c, i) => c.map((v, j) => v + (b.pal[i][j] - v) * t)) }
}

// ---- topology ---

const MAXL = 9
const MAXP = 21
const PU = 26
const PV = 16
const MAXSEP = 16
const SU = 8
const SV = 4
const MAXCOL = 9
const MAXLF = 6
const MAXST = 96
const DR = 8
const DS = 24
const STU = 30
const STS = 8
const STEM_LEN = 6.5
const STRIDE = 13
const PETAL_V = (PU + 1) * (PV + 1)
const SEP_V = (SU + 1) * (SV + 1)
const ST_V = 55
const DISK_V = (DR + 1) * (DS + 1)
const STEM_V = (STU + 1) * (STS + 1)
const O_SEP = MAXL * MAXP * PETAL_V
const O_COL = O_SEP + MAXSEP * SEP_V
const O_LEAF = O_COL + MAXCOL * PETAL_V
const O_DISK = O_LEAF + MAXLF * PETAL_V
const O_ST = O_DISK + DISK_V
const O_STEM = O_ST + MAXST * ST_V
const VERTS = O_STEM + STEM_V

/** Fixed index buffer: every slot exists; absent petals collapse to a point. */
const buildTopology = () => {
  const idx: number[] = []
  const patches: number[][] = []
  const grid = (start: number, rows: number, cols: number, kind: number) => {
    patches.push([start, rows, cols, kind])
    for (let i = 0; i < rows - 1; i++)
      for (let j = 0; j < cols - 1; j++) {
        const a = start + i * cols + j
        const b = a + 1
        const c = a + cols
        const d = c + 1
        idx.push(a, b, c, b, d, c)
      }
  }
  for (let s = 0; s < MAXL * MAXP; s++) grid(s * PETAL_V, PU + 1, PV + 1, 0)
  for (let s = 0; s < MAXSEP; s++) grid(O_SEP + s * SEP_V, SU + 1, SV + 1, 4)
  for (let s = 0; s < MAXCOL; s++) grid(O_COL + s * PETAL_V, PU + 1, PV + 1, 4)
  for (let s = 0; s < MAXLF; s++) grid(O_LEAF + s * PETAL_V, PU + 1, PV + 1, 6)
  grid(O_DISK, DR + 1, DS + 1, 1)
  for (let s = 0; s < MAXST; s++) {
    const o = O_ST + s * ST_V
    grid(o, 5, 2, 2)
    grid(o + 10, 5, 2, 2)
    grid(o + 20, 5, 7, 3)
  }
  grid(O_STEM, STU + 1, STS + 1, 5)
  return { index: new Uint32Array(idx), vertices: VERTS, patches }
}

// ---- geometry helpers ---

const DEG = Math.PI / 180
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}
const cl = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x)
const sm = (a: number, b: number, x: number) => {
  const t = cl((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
/** Smooth 2D value noise, 0..1. */
const vnoise = (x: number, y: number) => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  let fx = x - ix
  let fy = y - iy
  fx = fx * fx * (3 - 2 * fx)
  fy = fy * fy * (3 - 2 * fy)
  const h = (a: number, b: number) => hash(a * 157.31 + b * 113.97)
  return lerp(lerp(h(ix, iy), h(ix + 1, iy), fx), lerp(h(ix, iy + 1), h(ix + 1, iy + 1), fx), fy)
}
const tint = (c: number[], k: number) => [c[0] * k, c[1] * k, c[2] * k]
const mix3 = (a: number[], b: number[], t: number) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]

const put = (
  d: Float32Array, i: number, x: number, y: number, z: number, nx: number, ny: number, nz: number,
  c: number[], u: number, v: number, ao: number, kind: number,
) => {
  const o = i * STRIDE
  d[o] = x; d[o + 1] = y; d[o + 2] = z
  d[o + 3] = nx; d[o + 4] = ny; d[o + 5] = nz
  d[o + 6] = c[0]; d[o + 7] = c[1]; d[o + 8] = c[2]
  d[o + 9] = u; d[o + 10] = v; d[o + 11] = ao; d[o + 12] = kind
}

const collapse = (d: Float32Array, start: number, count: number, kind: number) => {
  for (let i = start; i < start + count; i++) {
    const o = i * STRIDE
    d.fill(0, o, o + STRIDE)
    d[o + 4] = 1
    d[o + 12] = kind
  }
}

const SPN = 40
const SPR = new Float64Array(SPN + 1)
const SPY = new Float64Array(SPN + 1)
const SPA = new Float64Array(SPN + 1)

type Blade = {
  len: number; wid: number; open: number; curl: number; roll: number; ruffle: number; rfreq: number
  tip: number; widest: number; notch: number; twist: number; phase: number
  /** low-frequency waviness and uneven margins */
  wave?: number
  /** margins rolling back */
  margin?: number
  /** a constant roll about the spine, so neighbours shingle instead of cutting through each other */
  bank?: number
  /** the blade leans to one side along its length */
  lean?: number
  /** extra curl in the last third: tips flick in or out */
  flick?: number
  /** darken toward the flower's axis (the heart sits in its own shade) */
  heart?: boolean
}

/**
 * One petal-like surface: a spine bent in the plane of (radial R, world up),
 * swept across by a rolled, ruffled width profile. Writes rows × cols
 * vertices from `start`, normals from the grid so they match the winding.
 */
const blade = (
  d: Float32Array, start: number, rows: number, cols: number,
  ox: number, oy: number, oz: number, rx: number, rz: number,
  p: Blade, c0: number[], c1: number[], c2: number[], ao0: number, kind: number,
) => {
  const us = rows - 1
  const vs = cols - 1
  const sx = -rz
  const sz = rx
  let r = 0
  let y = 0
  SPR[0] = 0; SPY[0] = 0; SPA[0] = p.open
  const fl = p.flick || 0
  const bend = (t: number) => p.open - p.curl * Math.pow(t, 1.25) - fl * sm(0.6, 1, t)
  for (let i = 1; i <= SPN; i++) {
    const a = bend((i - 0.5) / SPN)
    r += (Math.cos(a) * p.len) / SPN
    y += (Math.sin(a) * p.len) / SPN
    SPR[i] = r; SPY[i] = y; SPA[i] = bend(i / SPN)
  }
  const lean = (p.lean || 0) * p.len * 0.2
  for (let i = 0; i <= us; i++) {
    // rows crowd toward the tip, where the outline turns
    const u = 1 - Math.pow(1 - i / us, 1.55)
    const uw = Math.pow(u, p.widest)
    const ex = Math.abs(2 * uw - 1)
    const sh = Math.pow(Math.max(0, 1 - Math.pow(ex, p.tip)), 1 / p.tip)
    const w = p.wid * (0.07 * (1 - u) + 0.93 * sh)
    const tw = p.twist * u + (p.bank || 0)
    const ct = Math.cos(tw)
    const st = Math.sin(tw)
    const col = u < 0.5 ? mix3(c0, c1, u * 2) : mix3(c1, c2, (u - 0.5) * 2)
    const ao = ao0 * (0.5 + 0.5 * sm(0, 0.55, u))
    for (let j = 0; j <= vs; j++) {
      const v = -1 + (2 * j) / vs
      const ue = u * (1 - p.notch * Math.exp((-v * v) / 0.05))
      const f = ue * SPN
      const i0 = Math.min(SPN - 1, Math.floor(f))
      const ft = f - i0
      const rr = lerp(SPR[i0], SPR[i0 + 1], ft)
      const yy = lerp(SPY[i0], SPY[i0 + 1], ft)
      const aa = lerp(SPA[i0], SPA[i0 + 1], ft)
      const ca = Math.cos(aa)
      const sa = Math.sin(aa)
      const nx = -rx * sa
      const ny = ca
      const nz = -rz * sa
      const tsx = sx * ct + nx * st
      const tsy = ny * st
      const tsz = sz * ct + nz * st
      const tnx = nx * ct - sx * st
      const tny = ny * ct
      const tnz = nz * ct - sz * st
      // no two petals alike: uneven margins, a soft warp, edges that roll back
      const wave = p.wave || 0
      const side = v < 0 ? 3.7 : 8.9
      const wv = w * (1 + wave * 0.32 * (vnoise(u * 3.2 + p.phase * 2.1, side + p.phase) - 0.5) * u)
      const warp = wave * p.wid * 0.5 * (vnoise(u * 2.2 + p.phase, v * 1.4 + p.phase * 0.6) - 0.5) * u
      const roll = -(p.margin || 0) * p.wid * 0.45 * Math.pow(Math.abs(v), 3) * sm(0.15, 0.9, u)
      const phi = v * p.roll
      let lat: number
      let lift: number
      if (Math.abs(p.roll) > 1e-3) {
        lat = (Math.sin(phi) / p.roll) * wv
        lift = ((1 - Math.cos(phi)) / p.roll) * wv
      } else {
        lat = v * wv
        lift = 0.5 * v * v * p.roll * wv
      }
      const rf = p.ruffle * p.wid * Math.sin(v * p.rfreq * Math.PI + p.phase + u * 2.6) * Math.pow(u, 1.4) * (0.35 + 0.65 * Math.abs(v))
      const off = lift + rf + warp + roll
      const latL = lat + lean * u * u
      put(
        d, start + i * cols + j,
        ox + rx * rr + tsx * latL + tnx * off,
        oy + yy + tsy * latL + tny * off,
        oz + rz * rr + tsz * latL + tnz * off,
        tnx, tny, tnz, col, u, v, ao, kind,
      )
    }
  }
  if (p.heart)
    for (let i = start; i < start + rows * cols; i++) {
      const o = i * STRIDE
      d[o + 11] *= 0.5 + 0.5 * sm(0.04, 0.5, Math.hypot(d[o], d[o + 2]))
    }
  gridNormals(d, start, rows, cols)
}

/** n = dv × du, which is the geometric normal of the (a, b, c) winding. */
const gridNormals = (d: Float32Array, start: number, rows: number, cols: number) => {
  for (let i = 0; i < rows; i++) {
    const i0 = Math.max(0, i - 1)
    const i1 = Math.min(rows - 1, i + 1)
    for (let j = 0; j < cols; j++) {
      const j0 = Math.max(0, j - 1)
      const j1 = Math.min(cols - 1, j + 1)
      const a = (start + i0 * cols + j) * STRIDE
      const b = (start + i1 * cols + j) * STRIDE
      const c = (start + i * cols + j0) * STRIDE
      const e = (start + i * cols + j1) * STRIDE
      const ux = d[b] - d[a], uy = d[b + 1] - d[a + 1], uz = d[b + 2] - d[a + 2]
      const vx = d[e] - d[c], vy = d[e + 1] - d[c + 1], vz = d[e + 2] - d[c + 2]
      let nx = vy * uz - vz * uy
      let ny = vz * ux - vx * uz
      let nz = vx * uy - vy * ux
      const l = Math.hypot(nx, ny, nz)
      const o = (start + i * cols + j) * STRIDE
      if (l > 1e-9) {
        nx /= l; ny /= l; nz /= l
        d[o + 3] = nx; d[o + 4] = ny; d[o + 5] = nz
      } else {
        const k = Math.hypot(d[o + 3], d[o + 4], d[o + 5]) || 1
        d[o + 3] /= k; d[o + 4] /= k; d[o + 5] /= k
        if (k === 1 && d[o + 3] === 0 && d[o + 4] === 0 && d[o + 5] === 0) d[o + 4] = 1
      }
    }
  }
}

/** Where the open head reaches and where its mass sits — for framing. */
const headMetrics = (f: FlowerForm) => {
  const o = f.open[0] * DEG
  const reach = f.base[0] + f.length[0] * (0.5 + 0.5 * Math.cos(o))
  const radius = Math.max(reach, f.length[0] * Math.sin(o) * 0.8, f.disk * 1.2, 0.2) + 0.04
  return { radius, pivot: f.length[0] * Math.sin(o) * 0.35 + f.diskHeight * 0.2 }
}

const stemPoint = (bend: number, s: number) => [bend * s * s * 1.4, -0.03 - s * STEM_LEN, bend * 0.35 * s * s]

/**
 * Write the whole flower for a (mixed) form at a bloom state 0..1 into `d`.
 * Deterministic: the same form and bloom always produce the same mesh.
 */
const buildFlower = (rf: RForm, bloom: number, d: Float32Array) => {
  const f = rf.n
  const P = rf.pal
  const b = cl(bloom)
  const L = cl(f.layers, 1, MAXL)
  const blotchless = [P[0], P[1], P[2]]
  // petals
  for (let k = 0; k < MAXL; k++) {
    const presL = cl(L - k)
    const t = L > 1 ? cl(k / (L - 1)) : 0
    const n = Math.max(1, lerp(f.petals[0], f.petals[1], t))
    const bk = sm(t * 0.42, t * 0.42 + 0.58, b)
    const open = lerp((84 + 6 * t) * DEG, lerp(f.open[0], f.open[1], t) * DEG, bk)
    const curl = lerp(-22 * DEG, lerp(f.curl[0], f.curl[1], t) * DEG, bk)
    const roll0 = lerp(f.roll[0], f.roll[1], t)
    const roll = lerp(Math.max(roll0, 0.95), roll0, bk)
    const len = lerp(f.length[0], f.length[1], t) * lerp(0.42, 1, bk)
    const wid = lerp(f.width[0], f.width[1], t) * lerp(0.74, 1, bk)
    const r0 = lerp(f.base[0], f.base[1], t) * lerp(0.35, 1, bk)
    const off = k * lerp(Math.PI / n, 2.39996, cl(f.stagger))
    const cm = t * f.innerMix
    const c0 = mix3(blotchless[0], P[3], cm)
    const c1 = mix3(blotchless[1], P[3], cm)
    const c2 = mix3(blotchless[2], P[3], cm)
    for (let j = 0; j < MAXP; j++) {
      const start = (k * MAXP + j) * PETAL_V
      const pres = presL * cl(n - j)
      if (pres < 0.002) {
        collapse(d, start, PETAL_V, 0)
        continue
      }
      const h1 = hash(k * 97 + j * 13 + 1)
      const h2 = hash(k * 31 + j * 7 + 2)
      const h3 = hash(k * 17 + j * 29 + 3)
      const th = (j / n) * Math.PI * 2 + off + (h1 - 0.5) * f.jitter * 0.6
      const rx = Math.cos(th)
      const rz = Math.sin(th)
      const g = pres * (1 + (h2 - 0.5) * f.jitter)
      const shade = 0.93 + h3 * 0.12
      blade(
        d, start, PU + 1, PV + 1, rx * r0, 0.004 * k, rz * r0, rx, rz,
        {
          len: len * g, wid: wid * (0.6 + 0.4 * pres), open: open + (h3 - 0.5) * f.jitter * 0.5, curl,
          roll, ruffle: f.ruffle, rfreq: f.ruffleFreq, tip: Math.max(0.9, f.tip), widest: Math.max(0.2, f.widest),
          notch: f.notch, twist: f.twist + (h1 - 0.5) * f.jitter, phase: h2 * 6.28,
          wave: f.wave, margin: f.reflex * (0.4 + 0.6 * (1 - t)), heart: true,
          lean: (h3 - 0.5) * (0.25 + f.jitter * 2), flick: (h1 - 0.5) * 0.25 * (0.3 + f.wave),
          bank: 0.2 * cl((wid * n) / (Math.PI * Math.max(0.05, r0 + len * 0.5)) - 0.6, 0, 1.5),
        },
        tint(c0, shade), tint(c1, shade), tint(c2, shade), 1 - 0.38 * t, 0,
      )
    }
  }
  const G = P[9]
  const gDark = tint(G, 0.72)
  const gLite = tint(G, 1.18)
  // sepals
  const bs = sm(0, 0.45, b)
  for (let q = 0; q < MAXSEP; q++) {
    const start = O_SEP + q * SEP_V
    const pres = cl(f.sepals - q)
    if (pres < 0.002 || f.sepalLength < 0.01) {
      collapse(d, start, SEP_V, 4)
      continue
    }
    const th = (q / Math.max(1, f.sepals)) * Math.PI * 2 + 0.3
    const rx = Math.cos(th)
    const rz = Math.sin(th)
    blade(
      d, start, SU + 1, SV + 1, rx * f.base[0] * 0.6, -0.02, rz * f.base[0] * 0.6, rx, rz,
      {
        len: f.sepalLength * pres, wid: f.sepalLength * 0.3 * pres, open: lerp(82, -48, bs) * DEG,
        curl: lerp(-8, 26, bs) * DEG, roll: 0.45, ruffle: 0, rfreq: 1, tip: 1.3, widest: 0.8, notch: 0,
        twist: 0, phase: 0,
      },
      gDark, G, gLite, 0.85, 4,
    )
  }
  // collar bracts
  for (let q = 0; q < MAXCOL; q++) {
    const start = O_COL + q * PETAL_V
    const pres = cl(f.collar - q)
    if (pres < 0.002) {
      collapse(d, start, PETAL_V, 4)
      continue
    }
    const th = (q / Math.max(1, Math.ceil(f.collar))) * Math.PI * 2 + 0.5 + hash(q + 40) * 0.4
    const rx = Math.cos(th)
    const rz = Math.sin(th)
    blade(
      d, start, PU + 1, PV + 1, rx * 0.03, -0.2 - hash(q + 9) * 0.05, rz * 0.03, rx, rz,
      {
        len: (0.42 + hash(q + 3) * 0.14) * pres, wid: 0.07 * pres, open: lerp(-10, 14, bs) * DEG, curl: 58 * DEG,
        roll: 0.2, ruffle: 1.1, rfreq: 5, tip: 1.1, widest: 0.6, notch: 0, twist: 0.6, phase: q * 1.7,
      },
      gDark, G, gLite, 0.9, 4,
    )
  }
  // leaves on the stem
  for (let q = 0; q < MAXLF; q++) {
    const start = O_LEAF + q * PETAL_V
    const pres = cl(f.leaves - q)
    if (pres < 0.002 || f.leafLength < 0.01) {
      collapse(d, start, PETAL_V, 6)
      continue
    }
    const s = cl(f.leafAt + q * 0.12, 0, 0.95)
    const sp = stemPoint(f.stemBend, s)
    const th = q * 2.4 + 1.1
    const rx = Math.cos(th)
    const rz = Math.sin(th)
    blade(
      d, start, PU + 1, PV + 1, sp[0] + rx * f.stemWidth, sp[1], sp[2] + rz * f.stemWidth, rx, rz,
      {
        len: f.leafLength * pres, wid: f.leafWidth * pres, open: 40 * DEG, curl: 95 * DEG, roll: 0.5,
        ruffle: f.leafSerration * 0.6, rfreq: 10, tip: 1.4, widest: 0.7, notch: 0, twist: 0.25, phase: q * 2, wave: 0.6,
      },
      tint(G, 0.62), tint(G, 0.86), G, 0.9, 6,
    )
  }
  // disk
  {
    const dr = Math.max(f.disk, 0.001)
    for (let i = 0; i <= DR; i++) {
      const rho = i / DR
      const r = dr * rho
      const q = Math.max(0.02, 1 - rho * rho)
      const y = f.diskHeight * Math.pow(q, 0.6)
      const slope = f.diskHeight > 0 ? (f.diskHeight * 0.6 * Math.pow(q, -0.4) * 2 * rho) / dr : 0
      const nl = Math.hypot(slope, 1)
      const c = mix3(P[5], P[6], sm(0.3, 1, rho))
      for (let j = 0; j <= DS; j++) {
        const a = (j / DS) * Math.PI * 2
        const ca = Math.cos(a)
        const sa = Math.sin(a)
        put(d, O_DISK + i * (DS + 1) + j, ca * r, y, sa * r, (ca * slope) / nl, 1 / nl, (sa * slope) / nl, c, rho, j / DS, 0.8, 1)
      }
    }
  }
  // stamens
  const bS = sm(0.35, 1, b)
  const wf = 0.006 + f.antherSize * 0.16
  for (let i = 0; i < MAXST; i++) {
    const o = O_ST + i * ST_V
    const pres = cl(f.stamens - i)
    if (pres < 0.002 || f.stamenLength < 0.005) {
      collapse(d, o, 20, 2)
      collapse(d, o + 20, 35, 3)
      continue
    }
    const h1 = hash(i * 7.13 + 1)
    const h2 = hash(i * 3.7 + 2)
    const h3 = hash(i * 11.1 + 3)
    const th = i * 2.39996 + h1 * 0.3
    const ct = Math.cos(th)
    const st = Math.sin(th)
    const ring = f.disk * 0.92 + 0.02 + h2 * Math.max(0.03, f.disk * 0.25)
    const beta0 = f.stamenSpread * DEG * (0.7 + 0.6 * h3) * lerp(0.3, 1, bS)
    const len = f.stamenLength * (0.75 + 0.5 * h1) * lerp(0.45, 1, bS) * pres
    let px = ct * ring
    let py = f.diskHeight * 0.15
    let pz = st * ring
    let dx = 0
    let dy = 1
    let dz = 0
    for (let s = 0; s <= 4; s++) {
      if (s > 0) {
        const be = beta0 * (0.7 + (0.6 * s) / 4)
        dx = ct * Math.sin(be)
        dy = Math.cos(be)
        dz = st * Math.sin(be)
        px += (dx * len) / 4
        py += (dy * len) / 4
        pz += (dz * len) / 4
      }
      const be = beta0 * (0.7 + (0.6 * s) / 4)
      const bx = ct * Math.cos(be)
      const by = -Math.sin(be)
      const bz = st * Math.cos(be)
      const w = wf * (1 - s * 0.12)
      put(d, o + s * 2, px - st * w, py, pz + ct * w, bx, by, bz, P[7], s / 4, -1, 0.75, 2)
      put(d, o + s * 2 + 1, px + st * w, py, pz - ct * w, bx, by, bz, P[7], s / 4, 1, 0.75, 2)
      put(d, o + 10 + s * 2, px - bx * w, py - by * w, pz - bz * w, -st, 0, ct, P[7], s / 4, -1, 0.75, 2)
      put(d, o + 10 + s * 2 + 1, px + bx * w, py + by * w, pz + bz * w, -st, 0, ct, P[7], s / 4, 1, 0.75, 2)
    }
    // the anther: a small ellipsoid, long across the filament
    const a = f.antherSize * lerp(0.5, 1, bS) * pres
    const e1 = [-st, 0, ct]
    const e2 = [dx, dy, dz]
    const e3 = [ct * Math.cos(beta0), -Math.sin(beta0), st * Math.cos(beta0)]
    const r1 = a * 1.7
    const r2 = a * 0.8
    const r3 = a * 0.7
    for (let la = 0; la <= 4; la++) {
      const th = (la / 4) * Math.PI
      const c1 = Math.cos(th)
      const s1 = Math.sin(th)
      for (let lo = 0; lo <= 6; lo++) {
        const ph = (lo / 6) * Math.PI * 2
        const c2 = Math.cos(ph) * s1
        const s2 = Math.sin(ph) * s1
        let nx = (e1[0] * c1) / 1.7 + (e2[0] * c2) / 0.8 + (e3[0] * s2) / 0.7
        let ny = (e1[1] * c1) / 1.7 + (e2[1] * c2) / 0.8 + (e3[1] * s2) / 0.7
        let nz = (e1[2] * c1) / 1.7 + (e2[2] * c2) / 0.8 + (e3[2] * s2) / 0.7
        const nl = Math.hypot(nx, ny, nz) || 1
        nx /= nl; ny /= nl; nz /= nl
        put(
          d, o + 20 + la * 7 + lo,
          px + e2[0] * r2 * 0.6 + e1[0] * r1 * c1 + e2[0] * r2 * c2 + e3[0] * r3 * s2,
          py + e2[1] * r2 * 0.6 + e1[1] * r1 * c1 + e2[1] * r2 * c2 + e3[1] * r3 * s2,
          pz + e2[2] * r2 * 0.6 + e1[2] * r1 * c1 + e2[2] * r2 * c2 + e3[2] * r3 * s2,
          nx, ny, nz, P[8], la / 4, lo / 6, 1, 3,
        )
      }
    }
  }
  // stem
  for (let i = 0; i <= STU; i++) {
    const s = i / STU
    const c = stemPoint(f.stemBend, s)
    let tx = 2.8 * f.stemBend * s
    let ty = -STEM_LEN
    let tz = 0.7 * f.stemBend * s
    const tl = Math.hypot(tx, ty, tz)
    tx /= tl; ty /= tl; tz /= tl
    // B = T × Z, C = B × T
    let bx = ty
    let by = -tx
    const bl = Math.hypot(bx, by) || 1
    bx /= bl; by /= bl
    const cx = by * tz
    const cy = -bx * tz
    const cz = bx * ty - by * tx
    const r = f.stemWidth * (1 + 1.5 * Math.exp((-s * STEM_LEN) / 0.07)) * (1 - 0.25 * s)
    const col = mix3(tint(G, 1.1), tint(G, 0.7), s)
    for (let j = 0; j <= STS; j++) {
      const a = (j / STS) * Math.PI * 2
      const ca = Math.cos(a)
      const sa = Math.sin(a)
      const nx = bx * ca + cx * sa
      const ny = by * ca + cy * sa
      const nz = cz * sa
      put(d, O_STEM + i * (STS + 1) + j, c[0] + nx * r, c[1] + ny * r, c[2] + nz * r, nx, ny, nz, col, s, j / STS, 1, 5)
    }
  }
  return headMetrics(f)
}
// #endregion

// #region scroll
const clamp01 = (x: number) => (x <= 0 ? 0 : x > 1 ? 1 : x)
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/** 0 while the root's top sits at the stage's top, 1 when its bottom does. */
const progressFrom = (top: number, height: number, viewport: number) => {
  const travel = height - viewport
  if (travel <= 0) return 0
  return clamp01(-top / travel)
}

/** Scroll progress → a continuous scene coordinate 0..n-1 that holds on each integer. */
const sceneCoord = (p: number, n: number, hold: number) => {
  if (n <= 1) return 0
  const t = clamp01(p) * (n - 1)
  const i = Math.min(Math.floor(t), n - 2)
  const h = hold / 2
  return i + easeInOut(clamp01((t - i - h) / (1 - 2 * h)))
}

/**
 * How present an element that lives on scenes a..b is at `c`. `d` 0..1 makes
 * it arrive late and, mirrored, leave late.
 */
const span = (c: number, a: number, b: number, d: number) => {
  const s = (x: number) => {
    const t = clamp01(x)
    return t * t * (3 - 2 * t)
  }
  const i = s((c - (a - 0.6 + 0.2 * d)) / 0.32)
  const o = s((b + 0.6 - 0.2 * (1 - d) - c) / 0.32)
  return Math.min(i, o)
}
// #endregion

// #region hand
// A single-stroke handwriting alphabet. Glyph space: baseline 0, x-height 0.5,
// caps 0.9, ascenders 1, y up. [advance, path].
const GLYPHS: { [k: string]: [number, string] } = {
  a: [0.56, "M0.42,0.42 C0.36,0.52 0.12,0.52 0.06,0.32 C0,0.1 0.14,-0.02 0.26,0 C0.36,0.02 0.42,0.12 0.44,0.24 M0.44,0.48 L0.44,0.12 C0.44,0.04 0.47,0 0.52,0.02"],
  b: [0.52, "M0.06,1 L0.06,0.02 M0.06,0.28 C0.1,0.46 0.24,0.52 0.34,0.48 C0.48,0.42 0.5,0.12 0.36,0.03 C0.24,-0.04 0.1,0.02 0.06,0.1"],
  c: [0.48, "M0.42,0.42 C0.34,0.52 0.12,0.5 0.06,0.3 C0.02,0.12 0.14,-0.01 0.26,0 C0.34,0 0.4,0.04 0.44,0.1"],
  d: [0.56, "M0.42,0.4 C0.34,0.52 0.12,0.5 0.06,0.3 C0,0.1 0.14,-0.02 0.26,0 C0.36,0.02 0.42,0.12 0.44,0.22 M0.46,1 L0.44,0.1 C0.44,0.03 0.48,0 0.53,0.02"],
  e: [0.5, "M0.06,0.24 L0.42,0.28 C0.44,0.42 0.34,0.5 0.24,0.5 C0.1,0.5 0.04,0.36 0.04,0.24 C0.04,0.08 0.16,-0.01 0.28,0 C0.36,0 0.42,0.04 0.46,0.1"],
  f: [0.38, "M0.4,0.92 C0.34,1 0.2,0.98 0.18,0.84 L0.16,-0.02 M0.02,0.48 L0.34,0.5"],
  g: [0.54, "M0.42,0.4 C0.34,0.52 0.12,0.5 0.06,0.32 C0.02,0.14 0.14,0.04 0.26,0.06 C0.36,0.08 0.42,0.18 0.44,0.28 M0.45,0.5 L0.44,-0.18 C0.42,-0.34 0.2,-0.38 0.08,-0.26"],
  h: [0.52, "M0.06,1 L0.06,0 M0.06,0.26 C0.1,0.44 0.22,0.52 0.32,0.48 C0.42,0.44 0.44,0.34 0.44,0.24 L0.45,0"],
  i: [0.2, "M0.08,0.48 L0.08,0.02 M0.075,0.7 L0.09,0.73"],
  j: [0.26, "M0.16,0.48 L0.16,-0.2 C0.15,-0.34 0.04,-0.38 -0.04,-0.3 M0.155,0.7 L0.17,0.73"],
  k: [0.46, "M0.06,1 L0.06,0 M0.38,0.5 L0.07,0.2 M0.16,0.28 L0.42,0"],
  l: [0.2, "M0.08,1 L0.07,0.08 C0.07,0.02 0.1,0 0.15,0.01"],
  m: [0.66, "M0.06,0.5 L0.06,0 M0.06,0.3 C0.1,0.46 0.2,0.52 0.26,0.46 C0.32,0.4 0.32,0.3 0.32,0 M0.32,0.3 C0.36,0.46 0.46,0.52 0.52,0.46 C0.58,0.4 0.58,0.3 0.58,0"],
  n: [0.52, "M0.06,0.5 L0.06,0 M0.06,0.28 C0.1,0.44 0.22,0.52 0.32,0.48 C0.42,0.44 0.44,0.34 0.44,0.24 L0.45,0"],
  o: [0.5, "M0.24,0.5 C0.08,0.5 0.03,0.32 0.04,0.22 C0.05,0.08 0.14,0 0.25,0 C0.38,0 0.45,0.12 0.45,0.26 C0.45,0.4 0.36,0.5 0.24,0.5 C0.2,0.5 0.18,0.49 0.16,0.47"],
  p: [0.52, "M0.06,0.5 L0.06,-0.36 M0.06,0.3 C0.1,0.46 0.24,0.52 0.34,0.48 C0.48,0.42 0.5,0.12 0.36,0.03 C0.24,-0.04 0.1,0.02 0.06,0.12"],
  q: [0.56, "M0.42,0.4 C0.34,0.52 0.12,0.5 0.06,0.3 C0,0.1 0.14,-0.02 0.26,0 C0.36,0.02 0.42,0.12 0.44,0.22 M0.45,0.5 L0.44,-0.36 C0.46,-0.3 0.5,-0.26 0.54,-0.26"],
  r: [0.38, "M0.06,0.5 L0.06,0 M0.06,0.26 C0.1,0.42 0.2,0.52 0.34,0.48"],
  s: [0.44, "M0.38,0.44 C0.32,0.52 0.12,0.52 0.08,0.4 C0.04,0.28 0.36,0.28 0.38,0.14 C0.4,0 0.14,-0.04 0.04,0.06"],
  t: [0.34, "M0.16,0.82 L0.15,0.08 C0.15,0.01 0.2,-0.01 0.28,0.02 M0.02,0.5 L0.32,0.52"],
  u: [0.52, "M0.06,0.5 L0.06,0.2 C0.06,0.06 0.14,0 0.24,0 C0.34,0 0.42,0.08 0.44,0.2 M0.44,0.5 L0.45,0"],
  v: [0.44, "M0.02,0.5 L0.21,0 L0.42,0.5"],
  w: [0.62, "M0.02,0.5 L0.16,0 L0.3,0.4 L0.44,0 L0.58,0.5"],
  x: [0.44, "M0.04,0.5 L0.4,0 M0.4,0.5 L0.04,0"],
  y: [0.46, "M0.04,0.5 L0.22,0.06 M0.42,0.5 L0.2,-0.2 C0.16,-0.32 0.08,-0.36 0,-0.3"],
  z: [0.46, "M0.04,0.48 L0.4,0.5 L0.04,0.02 L0.42,0.02"],
  A: [0.58, "M0.02,0 L0.28,0.9 L0.54,0 M0.12,0.32 L0.46,0.34"],
  B: [0.5, "M0.06,0 L0.06,0.9 C0.4,0.92 0.44,0.6 0.36,0.54 C0.3,0.5 0.14,0.48 0.08,0.48 C0.52,0.5 0.52,0.04 0.06,0.02"],
  C: [0.62, "M0.56,0.76 C0.48,0.9 0.3,0.94 0.18,0.82 C0.02,0.66 0.02,0.24 0.18,0.08 C0.3,-0.04 0.48,0 0.58,0.14"],
  D: [0.66, "M0.06,0 L0.06,0.9 C0.5,0.92 0.62,0.66 0.6,0.44 C0.58,0.16 0.4,0 0.06,0.02"],
  E: [0.54, "M0.5,0.9 L0.08,0.88 L0.06,0.02 L0.5,0 M0.07,0.46 L0.4,0.47"],
  F: [0.52, "M0.5,0.9 L0.08,0.88 L0.06,0 M0.07,0.46 L0.4,0.47"],
  G: [0.64, "M0.56,0.76 C0.48,0.9 0.3,0.94 0.18,0.82 C0.02,0.66 0.02,0.24 0.18,0.08 C0.32,-0.04 0.54,0 0.58,0.18 L0.58,0.38 L0.36,0.38"],
  H: [0.6, "M0.06,0.9 L0.06,0 M0.52,0.9 L0.52,0 M0.06,0.46 L0.52,0.47"],
  I: [0.22, "M0.1,0.9 L0.1,0"],
  J: [0.5, "M0.44,0.9 L0.44,0.22 C0.44,0.02 0.2,-0.06 0.04,0.12"],
  K: [0.54, "M0.06,0.9 L0.06,0 M0.48,0.9 L0.07,0.38 M0.2,0.52 L0.52,0"],
  L: [0.5, "M0.08,0.9 L0.06,0.02 L0.46,0"],
  M: [0.7, "M0.04,0 L0.08,0.9 L0.34,0.3 L0.6,0.9 L0.64,0"],
  N: [0.6, "M0.06,0 L0.06,0.9 L0.52,0 L0.52,0.9"],
  O: [0.68, "M0.34,0.9 C0.1,0.9 0.02,0.62 0.04,0.42 C0.06,0.14 0.2,0 0.34,0 C0.54,0 0.64,0.2 0.64,0.44 C0.64,0.7 0.52,0.9 0.34,0.9 C0.28,0.9 0.24,0.88 0.2,0.84"],
  P: [0.52, "M0.06,0 L0.06,0.9 C0.44,0.92 0.52,0.74 0.48,0.62 C0.44,0.48 0.24,0.44 0.07,0.46"],
  Q: [0.7, "M0.34,0.9 C0.1,0.9 0.02,0.62 0.04,0.42 C0.06,0.14 0.2,0 0.34,0 C0.54,0 0.64,0.2 0.64,0.44 C0.64,0.7 0.52,0.9 0.34,0.9 M0.4,0.2 L0.66,-0.06"],
  R: [0.56, "M0.06,0 L0.06,0.9 C0.44,0.92 0.52,0.74 0.48,0.62 C0.44,0.48 0.24,0.44 0.07,0.46 M0.24,0.46 L0.52,0"],
  S: [0.56, "M0.5,0.8 C0.42,0.92 0.12,0.94 0.08,0.74 C0.04,0.54 0.5,0.5 0.52,0.24 C0.54,0.02 0.18,-0.04 0.04,0.12"],
  T: [0.58, "M0.02,0.9 L0.56,0.91 M0.29,0.9 L0.28,0"],
  U: [0.62, "M0.06,0.9 L0.06,0.3 C0.06,0.06 0.18,0 0.3,0 C0.44,0 0.54,0.08 0.54,0.3 L0.55,0.9"],
  V: [0.58, "M0.02,0.9 L0.28,0 L0.56,0.9"],
  W: [0.76, "M0.02,0.9 L0.2,0 L0.38,0.66 L0.56,0 L0.74,0.9"],
  X: [0.56, "M0.04,0.9 L0.52,0 M0.52,0.9 L0.04,0"],
  Y: [0.56, "M0.04,0.9 L0.28,0.46 L0.52,0.9 M0.28,0.46 L0.28,0"],
  Z: [0.58, "M0.06,0.88 L0.52,0.9 L0.04,0.02 L0.54,0"],
  "0": [0.52, "M0.26,0.8 C0.06,0.8 0.04,0.5 0.04,0.4 C0.04,0.2 0.1,0 0.26,0 C0.42,0 0.48,0.2 0.48,0.4 C0.48,0.6 0.42,0.8 0.26,0.8"],
  "1": [0.36, "M0.08,0.64 L0.24,0.8 L0.24,0"],
  "2": [0.5, "M0.06,0.64 C0.1,0.8 0.38,0.84 0.42,0.62 C0.44,0.44 0.2,0.28 0.04,0.02 L0.46,0.02"],
  "3": [0.5, "M0.06,0.72 C0.16,0.84 0.42,0.82 0.42,0.62 C0.42,0.46 0.26,0.42 0.18,0.42 C0.36,0.42 0.46,0.32 0.46,0.2 C0.46,0 0.16,-0.04 0.04,0.1"],
  "4": [0.54, "M0.36,0 L0.36,0.8 L0.04,0.26 L0.5,0.26"],
  "5": [0.5, "M0.44,0.8 L0.1,0.8 L0.08,0.46 C0.24,0.52 0.46,0.46 0.46,0.24 C0.46,0 0.16,-0.04 0.04,0.1"],
  "6": [0.5, "M0.42,0.76 C0.3,0.84 0.06,0.78 0.05,0.4 C0.04,0.1 0.16,0 0.26,0 C0.4,0 0.46,0.12 0.46,0.24 C0.46,0.4 0.34,0.48 0.24,0.48 C0.14,0.48 0.08,0.4 0.06,0.32"],
  "7": [0.5, "M0.04,0.8 L0.46,0.8 L0.18,0"],
  "8": [0.52, "M0.26,0.44 C0.06,0.5 0.08,0.8 0.26,0.8 C0.44,0.8 0.46,0.5 0.26,0.44 C0.04,0.38 0.04,0 0.26,0 C0.48,0 0.48,0.38 0.26,0.44"],
  "9": [0.5, "M0.44,0.5 C0.36,0.32 0.06,0.34 0.06,0.56 C0.06,0.76 0.2,0.8 0.28,0.8 C0.44,0.8 0.46,0.6 0.44,0.5 L0.4,0"],
  ".": [0.18, "M0.07,0.02 L0.09,0.05"],
  ",": [0.18, "M0.09,0.05 L0.04,-0.1"],
  "'": [0.14, "M0.08,0.9 L0.06,0.7"],
  "!": [0.18, "M0.08,0.9 L0.07,0.24 M0.07,0.02 L0.09,0.05"],
  "?": [0.48, "M0.06,0.72 C0.1,0.92 0.44,0.92 0.42,0.68 C0.4,0.5 0.22,0.48 0.22,0.26 M0.215,0.02 L0.23,0.05"],
  "-": [0.34, "M0.04,0.28 L0.3,0.29"],
  ":": [0.18, "M0.08,0.4 L0.09,0.43 M0.07,0.02 L0.09,0.05"],
  "/": [0.34, "M0.02,-0.05 L0.32,0.92"],
  "&": [0.56, "M0.52,0.02 L0.14,0.52 C0.04,0.66 0.12,0.86 0.24,0.86 C0.36,0.86 0.4,0.7 0.3,0.6 L0.1,0.42 C-0.02,0.3 0.06,0 0.24,0 C0.36,0 0.46,0.1 0.5,0.24"],
}

/** Hand-drawn arrows and marks, in the same glyph space. */
const MARKS: { [k: string]: string } = {
  curve: "M0,0 C0.3,0.42 0.8,0.48 1.2,0.2 M1.02,0.32 L1.2,0.2 L1.04,0.06",
  hook: "M0,0 C0.1,0.5 0.5,0.7 0.9,0.62 M0.74,0.74 L0.9,0.62 L0.72,0.5",
  line: "M0,0 L1.1,0.05 M0.94,0.16 L1.1,0.05 L0.95,-0.07",
  loop: "M0,0 C0.3,0.3 0.7,0.5 0.6,0.15 C0.5,-0.1 0.3,0.2 0.6,0.35 C0.8,0.45 1.1,0.4 1.3,0.3 M1.15,0.42 L1.3,0.3 L1.13,0.2",
}

type Placed = { d: string; x: number; y: number; r: number; s: number }

/**
 * Lay a line of text out in glyph space with a seeded hand wobble.
 * Returns each glyph's strokes (split per subpath so they can draw on in order)
 * and the block's extent. Lines are split on "\n"; unknown characters are spaces.
 */
const layoutHand = (text: string, seed = 1, lineHeight = 1.25) => {
  const placed: Placed[] = []
  let width = 0
  const lines = text.split("\n")
  lines.forEach((line, li) => {
    let x = 0
    Array.from(line).forEach((ch, ci) => {
      const g = GLYPHS[ch]
      const k = seed * 31 + li * 7 + ci
      const sc = 1 + (hash(k + 0.1) - 0.5) * 0.12
      if (!g) {
        x += 0.3
        return
      }
      for (const sub of g[1].split(/(?=M)/)) {
        if (!sub.trim()) continue
        placed.push({ d: sub.trim(), x, y: -li * lineHeight + (hash(k + 0.3) - 0.5) * 0.06, r: (hash(k + 0.7) - 0.5) * 7, s: sc })
      }
      x += g[0] * sc + 0.035
    })
    width = Math.max(width, x)
  })
  return { placed, width, height: 1 + (lines.length - 1) * lineHeight, lines: lines.length }
}
// #endregion

// ---- matrices (column-major) -------------------------------------------------

const m4 = () => {
  const o = new Float32Array(16)
  o[0] = o[5] = o[10] = o[15] = 1
  return o
}
const mul = (a: Float32Array, b: Float32Array) => {
  const o = new Float32Array(16)
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++) {
      let s = 0
      for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]
      o[c * 4 + r] = s
    }
  return o
}
const perspective = (fovy: number, aspect: number, near: number, far: number) => {
  const f = 1 / Math.tan(fovy / 2)
  const o = new Float32Array(16)
  o[0] = f / aspect
  o[5] = f
  o[10] = (far + near) / (near - far)
  o[11] = -1
  o[14] = (2 * far * near) / (near - far)
  return o
}
const rotX = (a: number) => {
  const o = m4()
  const c = Math.cos(a)
  const s = Math.sin(a)
  o[5] = c; o[6] = s; o[9] = -s; o[10] = c
  return o
}
const rotY = (a: number) => {
  const o = m4()
  const c = Math.cos(a)
  const s = Math.sin(a)
  o[0] = c; o[2] = -s; o[8] = s; o[10] = c
  return o
}
const rotZ = (a: number) => {
  const o = m4()
  const c = Math.cos(a)
  const s = Math.sin(a)
  o[0] = c; o[1] = s; o[4] = -s; o[5] = c
  return o
}
const translate = (x: number, y: number, z: number) => {
  const o = m4()
  o[12] = x; o[13] = y; o[14] = z
  return o
}
const scale = (s: number) => {
  const o = m4()
  o[0] = o[5] = o[10] = s
  return o
}
const ortho = (l: number, r: number, b: number, t: number, n: number, f: number) => {
  const o = m4()
  o[0] = 2 / (r - l); o[5] = 2 / (t - b); o[10] = -2 / (f - n)
  o[12] = -(r + l) / (r - l); o[13] = -(t + b) / (t - b); o[14] = -(f + n) / (f - n)
  return o
}
/** A camera at `eye` looking at `at`, world up +y. */
const lookAt = (eye: number[], at: number[]) => {
  let zx = eye[0] - at[0], zy = eye[1] - at[1], zz = eye[2] - at[2]
  const zl = Math.hypot(zx, zy, zz) || 1
  zx /= zl; zy /= zl; zz /= zl
  let xx = zz, xy = 0, xz = -zx
  const xl = Math.hypot(xx, xz) || 1
  xx /= xl; xz /= xl
  const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx
  const o = m4()
  o[0] = xx; o[4] = xy; o[8] = xz
  o[1] = yx; o[5] = yy; o[9] = yz
  o[2] = zx; o[6] = zy; o[10] = zz
  o[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2])
  o[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2])
  o[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2])
  return o
}
const xform = (m: Float32Array, x: number, y: number, z: number) => [
  m[0] * x + m[4] * y + m[8] * z + m[12],
  m[1] * x + m[5] * y + m[9] * z + m[13],
  m[2] * x + m[6] * y + m[10] * z + m[14],
  m[3] * x + m[7] * y + m[11] * z + m[15],
]

// ---- shaders -------------------------------------------------------------------

const SWAY = `
  float onStem = step(4.5, a_kind);
  float blade = step(a_kind, 0.5) + step(3.5, a_kind) * step(a_kind, 4.5) + step(5.5, a_kind);
  float tip = a_uv.x * a_uv.x * blade;
  vec3 p = a_pos + vec3(
    sin(u_time * 1.3 + a_pos.y * 4.0 + a_pos.x * 3.0),
    0.6 * sin(u_time * 1.7 + a_pos.z * 3.0),
    cos(u_time * 1.1 + a_pos.z * 4.0 + a_pos.x)
  ) * (u_sway * 0.014 * tip);
`

const VERT = `
attribute vec3 a_pos;
attribute vec3 a_nrm;
attribute vec3 a_col;
attribute vec2 a_uv;
attribute float a_ao;
attribute float a_kind;
uniform mat4 u_proj;
uniform mat4 u_mvh;
uniform mat4 u_mvs;
uniform mat4 u_lh;
uniform mat4 u_ls;
uniform float u_time;
uniform float u_sway;
varying vec3 v_n;
varying vec3 v_p;
varying vec3 v_c;
varying vec2 v_uv;
varying float v_ao;
varying float v_k;
varying vec4 v_l;
void main() {
` + SWAY + `
  // the head nods toward the camera; the stem and its leaves stay upright
  vec4 mv = mix(u_mvh * vec4(p, 1.0), u_mvs * vec4(p, 1.0), onStem);
  v_p = mv.xyz;
  v_n = mix((u_mvh * vec4(a_nrm, 0.0)).xyz, (u_mvs * vec4(a_nrm, 0.0)).xyz, onStem);
  // look the shadow up a little off the surface, on the side facing the light, so thin petals don't shadow themselves
  float facing = dot(normalize(v_n), normalize(vec3(-0.6, 0.68, 0.42))) >= 0.0 ? 1.0 : -1.0;
  vec3 q = p + a_nrm * (0.03 * facing);
  v_l = mix(u_lh * vec4(q, 1.0), u_ls * vec4(q, 1.0), onStem);
  v_c = a_col;
  v_uv = a_uv;
  v_ao = a_ao;
  v_k = a_kind;
  gl_Position = u_proj * mv;
}
`

// Depth from the key light, packed into RGBA8 so it works without extensions.
const SHADOW_VERT = `
attribute vec3 a_pos;
attribute vec2 a_uv;
attribute float a_kind;
uniform mat4 u_lh;
uniform mat4 u_ls;
uniform float u_time;
uniform float u_sway;
void main() {
` + SWAY + `
  gl_Position = mix(u_lh * vec4(p, 1.0), u_ls * vec4(p, 1.0), onStem);
}
`

const SHADOW_FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
void main() {
  vec4 e = fract(gl_FragCoord.z * vec4(1.0, 255.0, 65025.0, 16581375.0));
  e -= e.yzww * vec4(1.0 / 255.0, 1.0 / 255.0, 1.0 / 255.0, 0.0);
  gl_FragColor = e;
}
`

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec3 v_n;
varying vec3 v_p;
varying vec3 v_c;
varying vec2 v_uv;
varying float v_ao;
varying float v_k;
varying vec4 v_l;
uniform vec3 u_blotch;
uniform vec4 u_pet;
uniform vec4 u_bl;
uniform vec3 u_rimc;
uniform vec3 u_light;
uniform sampler2D u_shadow;
uniform vec3 u_sh;
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y);
}
float depthAt(vec2 uv) { return dot(texture2D(u_shadow, uv), vec4(1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 16581375.0)); }
float lit(vec3 q, vec2 o) { return step(q.z - u_sh.z, depthAt(q.xy + o * u_sh.x)); }
// nine taps on a disc, turned per pixel so the penumbra reads as grain, not steps
float shadow() {
  vec3 q = v_l.xyz / v_l.w * 0.5 + 0.5;
  if (q.x < 0.0 || q.x > 1.0 || q.y < 0.0 || q.y > 1.0 || q.z > 1.0) return 1.0;
  float a = h21(gl_FragCoord.xy) * 6.2831853;
  mat2 R = mat2(cos(a), sin(a), -sin(a), cos(a)) * 2.2;
  float s = lit(q, vec2(0.0));
  s += lit(q, R * vec2(1.0, 0.0));
  s += lit(q, R * vec2(-0.5, 0.87));
  s += lit(q, R * vec2(-0.5, -0.87));
  s += lit(q, R * vec2(0.0, 1.9));
  s += lit(q, R * vec2(1.65, -0.95));
  s += lit(q, R * vec2(-1.65, -0.95));
  s += lit(q, R * vec2(1.4, 1.4));
  s += lit(q, R * vec2(-1.4, 1.2));
  return s / 9.0;
}
void main() {
  vec3 n = normalize(v_n);
  vec3 v = normalize(-v_p);
  vec3 col = v_c;
  float k = v_k;
  float u = v_uv.x;
  float s = v_uv.y;
  float flip = step(k, 0.5) + step(1.5, k) * step(k, 2.5) + step(3.5, k) * step(k, 4.5) + step(5.5, k);
  float back = 0.0;
  if (flip > 0.5 && !gl_FrontFacing) { n = -n; back = 1.0; }
  float petal = step(k, 0.5);
  float green = step(3.5, k) * step(k, 4.5) + step(5.5, k);
  if (k < 0.5) {
    // crumple: two octaves of smooth noise across the petal
    vec2 q = vec2(u * 7.0 + s * 1.3, s * 3.1 + u * 0.7);
    float c1 = vn(q) + 0.5 * vn(q * 2.3 + 7.1);
    float c2 = vn(q + 13.7) + 0.5 * vn(q * 2.1 + 3.3);
    n = normalize(n + u_pet.y * 0.55 * vec3(c1 - 0.75, 0.0, c2 - 0.75));
    col *= 1.0 - u_pet.y * 0.16 * (c1 - 0.75);
    // veins fan out from the claw; finer ones branch in toward the tip
    float wob = 0.18 * vn(vec2(u * 5.0, s * 2.0));
    float l1 = abs(fract(s * 5.5 + wob + 0.5) - 0.5);
    float l2 = abs(fract(s * 12.0 + wob * 2.0 + 0.25) - 0.5);
    float l3 = abs(fract(s * 23.0 + wob * 3.0) - 0.5);
    // soft, broken, never a ruled line
    float vein = (1.0 - smoothstep(0.0, 0.16, l1)) * 0.7 + (1.0 - smoothstep(0.0, 0.14, l2)) * 0.35 * smoothstep(0.25, 0.7, u)
      + (1.0 - smoothstep(0.0, 0.12, l3)) * 0.2 * smoothstep(0.55, 0.95, u);
    vein *= smoothstep(0.02, 0.2, u) * (1.0 - 0.45 * u) * (0.35 + 0.65 * vn(vec2(s * 9.0, u * 7.0)));
    col *= 1.0 - u_pet.x * vein * 0.22;
    // pigment is never even: soft mottling and a deeper flush at the margin
    float mot = vn(vec2(u * 6.0, s * 3.5) + 11.0) * 0.65 + vn(vec2(u * 19.0, s * 9.0)) * 0.35;
    col *= 0.88 + 0.24 * mot;
    float bz = max(u_bl.x, 0.01);
    float bl = (1.0 - smoothstep(bz * 0.5, bz * (1.0 + 0.25 * vn(vec2(s * 8.0, 3.0))), u)) * u_bl.y;
    col = mix(col, u_blotch, bl);
    vec2 g = vec2(u * 16.0, s * 5.0);
    vec2 cell = floor(g);
    float r = h21(cell);
    float spot = (1.0 - smoothstep(0.12, 0.28, length(fract(g) - 0.5 - (vec2(h21(cell + 3.1), r) - 0.5) * 0.4))) * step(0.5, r);
    spot *= smoothstep(0.12, 0.32, u) * (1.0 - smoothstep(0.62, 0.85, u));
    col = mix(col, vec3(0.05, 0.006, 0.003), spot * u_pet.w);
    col = mix(col, min(col * 1.35 + 0.01, vec3(1.0)), smoothstep(0.55, 1.0, abs(s)) * (0.2 + 0.3 * u) * 0.6);
    col = mix(col, vec3(dot(col, vec3(0.3333))) * 1.06 + 0.02, back * 0.1);
  } else if (k < 1.5) {
    float pat = u_bl.z;
    float rays = (1.0 - smoothstep(0.02, 0.08, abs(fract(s * 11.0) - 0.5))) * smoothstep(0.18, 0.45, u) * (1.0 - smoothstep(0.88, 1.0, u));
    col = mix(col, vec3(0.03, 0.025, 0.02), rays * clamp(1.0 - abs(pat - 1.0), 0.0, 1.0));
    float a = s * 6.2831853;
    float fl = smoothstep(0.1, 0.8, sin(34.0 * a + 46.0 * u) * sin(-21.0 * a + 46.0 * u));
    float w2 = clamp(1.0 - abs(pat - 2.0), 0.0, 1.0);
    col = mix(col, col * (0.55 + 0.9 * fl) + vec3(0.22, 0.15, 0.0) * fl * smoothstep(0.66, 0.96, u), w2);
    col = mix(col, vec3(0.07, 0.06, 0.02), w2 * (1.0 - smoothstep(0.12, 0.38, u)));
    float w3 = clamp(pat - 2.0, 0.0, 1.0);
    float knob = sin(u * 58.0 + sin(s * 44.0) * 1.5) * sin(s * 150.0 + u * 9.0);
    n = normalize(n + w3 * 0.55 * vec3(cos(u * 58.0) * sin(s * 150.0), 0.0, sin(u * 58.0) * cos(s * 150.0)));
    col *= 1.0 + w3 * (0.45 * knob + 0.25 * smoothstep(0.75, 1.0, u));
  } else if (k < 3.5 && k > 2.5) {
    // anthers: dusted with pollen
    col *= 0.75 + 0.5 * vn(v_uv * vec2(9.0, 14.0));
  } else if (green > 0.5) {
    float mid = 1.0 - smoothstep(0.0, 0.07, abs(s));
    col *= 1.0 + 0.25 * mid * smoothstep(0.05, 0.3, u) - 0.12 * vn(vec2(u * 9.0, s * 4.0));
  }
  vec3 L = normalize(vec3(-0.6, 0.68, 0.42));
  float sh = mix(1.0, shadow(), u_sh.y);
  float ndl = dot(n, L);
  float wrap = clamp((ndl + 0.3) / 1.3, 0.0, 1.0);
  float diff = wrap * wrap * sh;
  vec3 hemi = mix(vec3(0.46, 0.4, 0.37), vec3(0.6, 0.64, 0.72), n.y * 0.5 + 0.5);
  float thin = petal + green * 0.5;
  float trans = clamp(-ndl, 0.0, 1.0) * thin * (0.45 + 0.55 * sh);
  float graze = 1.0 - clamp(abs(dot(n, v)), 0.0, 1.0);
  float fres = graze * graze * graze;
  vec3 h = normalize(L + v);
  float spec = pow(clamp(dot(n, h), 0.0, 1.0), 34.0) * u_pet.z * (0.35 + 0.65 * petal) * sh;
  float silk = 0.0;
#ifdef HAS_DERIV
  // petal cells run along the blade, so the highlight streaks along it like satin
  vec3 dpx = dFdx(v_p);
  vec3 dpy = dFdy(v_p);
  float dsx = dFdx(s);
  float dsy = dFdy(s);
  float det = dFdx(u) * dsy - dFdy(u) * dsx;
  vec3 T = (dpx * dsy - dpy * dsx) * (det < 0.0 ? -1.0 : 1.0);
  T = T - n * dot(n, T);
  if (dot(T, T) > 1e-12) {
    T = normalize(T);
    float th = dot(T, h);
    silk = pow(sqrt(max(0.0, 1.0 - th * th)), 90.0) * (0.55 + 0.9 * vn(vec2(s * 46.0, u * 3.0))) * u_pet.z * petal * sh;
  }
#endif
  vec3 c = col * (hemi * 0.5 * v_ao + 1.1 * diff * vec3(1.0, 0.97, 0.92) * (0.55 + 0.45 * v_ao));
  c += col * col * trans * 1.5;
  c += col * pow(graze, 1.5) * u_bl.w * 0.9 * petal;
  c += u_rimc * fres * u_light.x * v_ao + vec3(spec) * 0.45;
  c += (col * 0.6 + 0.12) * silk;
  c *= u_light.y * (1.0 - u_light.z * smoothstep(0.6, 0.97, graze) * 0.5);
  c = (c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14);
  c = mix(vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), c, 0.9);
  gl_FragColor = vec4(pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2)), 1.0);
}
`

const BLIT_VERT = `
attribute vec2 a_xy;
varying vec2 v_uv;
void main() {
  v_uv = a_xy * 0.5 + 0.5;
  gl_Position = vec4(a_xy, 0.0, 1.0);
}
`

const BLIT_FRAG = `
precision mediump float;
uniform sampler2D u_tex;
uniform vec2 u_scale;
uniform float u_levels;
varying vec2 v_uv;
void main() {
  vec4 c = texture2D(u_tex, v_uv * u_scale);
  float a = step(0.5, c.a);
  vec3 rgb = c.rgb / max(c.a, 0.001);
  rgb = floor(rgb * u_levels + 0.5) / u_levels;
  gl_FragColor = vec4(rgb * a, a);
}
`

// ---- poses ------------------------------------------------------------------

type Pose = { el: number; nod: number; spin: number; size: number; ox: number; oy: number; pixel: number; rim: number }

const mixPose = (a: Pose, b: Pose, t: number): Pose => ({
  el: lerp(a.el, b.el, t), nod: lerp(a.nod, b.nod, t), spin: lerp(a.spin, b.spin, t), size: lerp(a.size, b.size, t),
  ox: lerp(a.ox, b.ox, t), oy: lerp(a.oy, b.oy, t), pixel: lerp(a.pixel, b.pixel, t), rim: lerp(a.rim, b.rim, t),
})

type SceneKind = "hero" | "anthesis" | "pixel" | "specimen" | "footer"

const POSES: { [k: string]: { wide: Pose; tall: Pose } } = {
  hero: {
    wide: { el: 6, nod: 44, spin: 0.5, size: 0.86, ox: 0.6, oy: 0.08, pixel: 0, rim: 0.25 },
    tall: { el: 6, nod: 40, spin: 0.5, size: 0.74, ox: 0.3, oy: 0.42, pixel: 0, rim: 0.25 },
  },
  anthesis: {
    wide: { el: 8, nod: 34, spin: 1.4, size: 0.47, ox: 0, oy: -0.18, pixel: 0, rim: 0.25 },
    tall: { el: 8, nod: 34, spin: 1.4, size: 0.72, ox: 0, oy: -0.12, pixel: 0, rim: 0.25 },
  },
  pixel: {
    wide: { el: 8, nod: 42, spin: 2.2, size: 0.47, ox: 0, oy: -0.18, pixel: 1, rim: 0.2 },
    tall: { el: 8, nod: 42, spin: 2.2, size: 0.72, ox: 0, oy: -0.12, pixel: 1, rim: 0.2 },
  },
  specimen: {
    wide: { el: 4, nod: 30, spin: 3, size: 0.5, ox: 0.01, oy: 0.12, pixel: 0, rim: 0.9 },
    tall: { el: 4, nod: 30, spin: 3, size: 0.62, ox: 0, oy: 0.06, pixel: 0, rim: 0.9 },
  },
  footer: {
    wide: { el: 3, nod: 24, spin: 4, size: 0.28, ox: 0, oy: 0.17, pixel: 0, rim: 0.3 },
    tall: { el: 3, nod: 24, spin: 4, size: 0.5, ox: 0, oy: 0.06, pixel: 0, rim: 0.3 },
  },
}

const INTRO_WIDE: Pose = { el: 4, nod: 6, spin: -0.6, size: 0.46, ox: 0, oy: 0, pixel: 0, rim: 0.3 }
const INTRO_TALL: Pose = { el: 4, nod: 6, spin: -0.6, size: 0.66, ox: 0, oy: 0.04, pixel: 0, rim: 0.3 }

// ---- palettes -------------------------------------------------------------------

const LIGHT: FlorilegiumPalette = {
  paper: "#f5f3ee", panel: "#e8e1d6", ink: "#141210", mute: "#6b665e", night: "#070707", nightInk: "#efebe4",
  nightMute: "#9a958d", footer: "#e7e6e2", footerInk: "#121110", footerMute: "#5d5953", accent: "#5a40ad",
}
const DARK: FlorilegiumPalette = {
  paper: "#12110f", panel: "#1f1c18", ink: "#efe9df", mute: "#a29c92", night: "#050505", nightInk: "#efebe4",
  nightMute: "#9a958d", footer: "#171614", footerInk: "#ece8e0", footerMute: "#a39e96", accent: "#9d8af0",
}

const rgbOf = (hex: string) => {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || "").trim())
  const v = m ? parseInt(m[1], 16) : 0
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}
const cssRgb = (c: number[]) => "rgb(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + ")"

// ---- copy ---------------------------------------------------------------------------

const SANS = '"Inter", "Helvetica Neue", Helvetica, Arial, system-ui, sans-serif'
const GEO = '"Jost", "Futura", "Avenir Next", "Century Gothic", "Inter", "Helvetica Neue", Arial, sans-serif'
const SERIF = '"Cormorant Garamond", "Cormorant", "Didot", "Bodoni 72", "Playfair Display", "Times New Roman", Georgia, serif'

const DEFAULT_SPECIMENS: FlorilegiumSpecies[] = [
  {
    name: "Ranunculus", latin: "Ranunculus asiaticus", family: "Ranunculaceae", origin: "Persia", form: "ranunculus",
    blurb: "Persian buttercups fold a hundred tissue-thin petals into one bloom. Grown from claw-like corms, they were the prized florist's flower of eighteenth-century Istanbul.",
    note: { title: "Observe the buttercup family", text: "Some 2,000 species share it, from clematis to hellebore — most of them quietly poisonous to the touch.", credit: "Mira Kovač" },
    care: { light: "Full sun, cool nights", water: "Moist, never wet", season: "March — May", vase: "7 to 10 days" },
  },
  {
    name: "Magnolia", latin: "Magnolia × soulangeana", family: "Magnoliaceae", origin: "East Asia", form: "magnolia",
    blurb: "One of the oldest flowering plants alive, the magnolia evolved before bees did. Its tepals are tough as leather because beetles were its first pollinators.",
    note: { title: "Observe the magnolia family", text: "Fossil magnolias are 95 million years old. The shape you see has barely changed since the Cretaceous.", credit: "Theo Arden" },
    care: { light: "Sun to light shade", water: "Deep, weekly", season: "February — April", vase: "4 to 6 days" },
  },
  {
    name: "Lily", latin: "Lilium lancifolium", family: "Liliaceae", origin: "Japan", form: "lily",
    blurb: "Six recurved tepals, a speckled throat and a crown of rust-red anthers. The tiger lily has been grown in Japan for a thousand years for its edible bulb.",
    note: { title: "Observe the lily family", text: "Snip the anthers as each bud opens — the pollen stains linen and is toxic to cats.", credit: "Hana Ito" },
    care: { light: "Sun on the face, shade at the feet", water: "Even, twice a week", season: "July — August", vase: "10 to 14 days" },
  },
  {
    name: "Water lily", latin: "Nymphaea 'Marliacea'", family: "Nymphaeaceae", origin: "Egypt", form: "waterlily",
    blurb: "It opens with the sun and closes by mid-afternoon, drawing its bud below the surface each night. Monet painted it some two hundred and fifty times.",
    note: { title: "Observe the water-lily family", text: "One of the first lineages of flowering plants to branch away from the rest, long before roses or lilies.", credit: "Céline Marchetti" },
    care: { light: "Six hours of sun", water: "Still pond, 40 cm deep", season: "June — September", vase: "3 to 4 days" },
  },
]

const ROSE: FlorilegiumSpecies = {
  name: "Rose", latin: "Rosa 'Black Baccara'", family: "Rosaceae", origin: "France", form: "rose",
  blurb: "A velvet red so dark it reads as black at the edges.",
}
const TULIP: FlorilegiumSpecies = {
  name: "Tulip", latin: "Tulipa 'Apeldoorn'", family: "Liliaceae", origin: "Anatolia", form: "tulip",
  blurb: "It keeps growing in the vase, bending toward the window.",
}
const SUNFLOWER: FlorilegiumSpecies = {
  name: "Sunflower", latin: "Helianthus annuus", family: "Asteraceae", origin: "North America", form: "sunflower",
  blurb: "Its seeds spiral in Fibonacci numbers, 34 one way and 55 the other.",
}

const DEFAULT_FOOTER: FooterBloom[] = [
  {
    species: ROSE,
    word: "Flowers",
    notes: [
      { text: "people are\nthe flowers\nof life", x: 75, y: 40, rotate: -13, size: 1.7 },
      { text: "joy", x: 64, y: 25, rotate: -6, size: 2.1, arrow: { x: 62.5, y: 29, rotate: 120, scale: 4.6, shape: "line" } },
      { text: "love", x: 17.5, y: 52, rotate: -84, size: 2, arrow: { x: 21, y: 49, rotate: -6, scale: 6.4, shape: "curve" } },
      { text: "grow", x: 58.5, y: 88, rotate: -86, size: 1.4, arrow: { x: 57.5, y: 82, rotate: -125, scale: 3, shape: "line" } },
    ],
  },
  {
    species: TULIP,
    word: "Grow",
    notes: [
      { text: "roots before\nbranches", x: 75, y: 41, rotate: -10, size: 1.7 },
      { text: "slowly", x: 64, y: 25, rotate: -8, size: 1.9, arrow: { x: 62, y: 29, rotate: 124, scale: 4.4, shape: "line" } },
      { text: "care", x: 17.5, y: 53, rotate: -84, size: 2, arrow: { x: 21, y: 49, rotate: -10, scale: 6.6, shape: "loop" } },
      { text: "rain", x: 58.5, y: 88, rotate: -86, size: 1.4, arrow: { x: 57.5, y: 82, rotate: -125, scale: 3, shape: "line" } },
    ],
  },
  {
    species: SUNFLOWER,
    word: "Light",
    notes: [
      { text: "turn toward\nwhat warms you", x: 75, y: 41, rotate: -11, size: 1.6 },
      { text: "sun", x: 64, y: 25, rotate: -4, size: 2.1, arrow: { x: 62, y: 29, rotate: 122, scale: 4.4, shape: "line" } },
      { text: "home", x: 17.5, y: 52, rotate: -84, size: 2, arrow: { x: 21, y: 49, rotate: -8, scale: 6.4, shape: "hook" } },
      { text: "seed", x: 58.5, y: 88, rotate: -86, size: 1.4, arrow: { x: 57.5, y: 82, rotate: -125, scale: 3, shape: "line" } },
    ],
  },
]

export type HeroCopy = {
  species: FlorilegiumSpecies
  breadcrumb: [string, string]
  category: string
  title: string
  highlight: string
  season: string
  cta: { label: string; href?: string }
  date: string
  views: string
  threadTitle: string
  /** `to` is a scene index to jump to */
  thread: { title: string; to: number }[]
  hint: string
}

export type AnthesisCopy = {
  species: FlorilegiumSpecies
  word: string
  left: string
  right: string
  pixelSpecies: FlorilegiumSpecies
  pixelLeft: string
  pixelRight: string
  /** five words along the bottom; index 1 marks the first scene, 3 the pixel one */
  words: string[]
}

export type FooterCopy = {
  paragraphs: [string, string]
  blooms: FooterBloom[]
  links: FlorilegiumLink[]
  signature: [string, string]
  copyright: string
  newsletter: { title: string; placeholder: string; button: string; done: string }
}

export type FlorilegiumTemplateProps = {
  brand?: string
  nav?: FlorilegiumLink[]
  searchPlaceholder?: string
  hero?: HeroInput
  anthesis?: AnthesisInput
  specimens?: FlorilegiumSpecies[]
  footer?: FooterInput
  socials?: { label: string; href?: string; icon: "instagram" | "pinterest" | "x" }[]
  onSubscribe?: (email: string) => void
  /** Light-theme colours; any key overrides the default. */
  palette?: PaletteInput
  /** Dark-theme colours. */
  darkPalette?: PaletteInput
  /** "auto" follows a `.dark` ancestor, then the OS. */
  theme?: "auto" | "light" | "dark"
  /** Font stacks. `href` injects one stylesheet <link>; null (default) loads nothing. */
  fonts?: { sans?: string; geo?: string; serif?: string; href?: string | null }
  preloader?: boolean
  /** seconds */
  preloaderDuration?: number
  /** pixel size, in CSS px, of the pixelated scene */
  pixelBlock?: number
  /** idle sway, slow turn and pointer tilt */
  alive?: boolean
  /** The sticky stage. Must be a definite length. */
  height?: string
  /** stage-heights of scroll per scene */
  sceneScroll?: number
  className?: string
}

const HERO: HeroCopy = {
  species: {
    name: "Anemone", latin: "Anemone coronaria", family: "Ranunculaceae", origin: "Mediterranean", form: "anemone",
    blurb: "The windflower — it opens in the morning and closes at dusk.",
  },
  breadcrumb: ["Journal", "Culture"],
  category: "Culture",
  title: "Floral inspired collection",
  highlight: "Anemone coronaria",
  season: "SS27",
  cta: { label: "Shop the edit" },
  date: "18 October",
  views: "2,418",
  threadTitle: "Today's thread",
  thread: [
    { title: "How a Dutch nursery kept the 1987 ranunculus alive", to: 3 },
    { title: "Five quiet rules for a vase that lasts a week", to: 4 },
    { title: "Why the poppy only opens for the morning", to: 2 },
  ],
  hint: "Drag to turn — tap to rustle",
}

const ANTHESIS: AnthesisCopy = {
  species: {
    name: "Dahlia", latin: "Dahlia pinnata", family: "Asteraceae", origin: "Mexico", form: "dahlia",
    blurb: "The national flower of Mexico, once grown by the Aztecs for its tubers.",
  },
  word: "ANTHESIS",
  left: "The hour a flower\nis fully open",
  right: "Grown in code,\nnever once cut",
  pixelSpecies: {
    name: "Poppy", latin: "Papaver rhoeas", family: "Papaveraceae", origin: "Eurasia", form: "poppy",
    blurb: "Crumpled in the bud, smooth by noon, gone by evening.",
  },
  pixelLeft: "Studio-grade blooms\nwithout the garden",
  pixelRight: "Procedural flora for\nbrands, reels and print",
  words: ["Unfurled", "Rendered", "Synthetic", "Pixelated", "Perennial"],
}

const FOOTER: FooterCopy = {
  paragraphs: [
    "Every flower here begins as a closed bud of numbers — a whorl, a curve, a seed. Like each of us, it starts with a quiet potential, ready to open with proper care and attention.",
    "Every soul is like a petal, gently unfurling before the sun. We made Anthesis to slow the page to the pace of a bloom: one flower, never cut, only ever changing into the next.",
  ],
  blooms: DEFAULT_FOOTER,
  links: [
    { label: "Journal", scene: 0 },
    { label: "Species", scene: 3 },
    { label: "Atelier", scene: 1 },
    { label: "Instagram", href: "https://instagram.com" },
  ],
  signature: ["Hear. See. Feel.", "life, people"],
  copyright: "© 2026 Anthesis Studio",
  newsletter: {
    title: "Letters from the garden, once a season",
    placeholder: "your@email.com",
    button: "Subscribe",
    done: "Planted. See you in spring.",
  },
}

const NAV: FlorilegiumLink[] = [
  { label: "Journal", scene: 0 },
  { label: "Atelier", scene: 1 },
  { label: "Species", scene: 3 },
  { label: "Visit", scene: -1 },
]

const SOCIALS: { label: string; href?: string; icon: "instagram" | "pinterest" | "x" }[] = [
  { label: "Instagram", href: "https://instagram.com", icon: "instagram" },
  { label: "Pinterest", href: "https://pinterest.com", icon: "pinterest" },
  { label: "X", href: "https://x.com", icon: "x" },
]

const CSS = `
.flg-root{position:relative;width:100%;}
.flg-stage{position:sticky;top:0;width:100%;overflow:hidden;container-type:size;isolation:isolate;color:var(--flg-ink);font-family:var(--flg-sans);-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;touch-action:pan-y;}
.flg-stage *{box-sizing:border-box;}
.flg-stage :where(button){font:inherit;color:inherit;background:none;border:0;padding:0;margin:0;cursor:pointer;text-align:inherit;}
.flg-stage :where(button:disabled){cursor:default;opacity:.35;}
.flg-stage :where(a){color:inherit;text-decoration:none;}
.flg-stage :where(p,h1,h2,h3){margin:0;font-size:inherit;font-weight:inherit;}
.flg-stage :focus-visible{outline:1.5px solid currentColor;outline-offset:3px;border-radius:3px;}
.flg-canvas{position:absolute;inset:0;width:100%;height:100%;max-width:none;display:block;z-index:2;opacity:0;}
.flg-back,.flg-front{position:absolute;inset:0;pointer-events:none;}
.flg-back{z-index:1;}
.flg-front{z-index:3;}
.flg-front a,.flg-front button,.flg-front input,.flg-front label{pointer-events:auto;}
.flg-fx{opacity:0;visibility:hidden;will-change:opacity,transform;}
.flg-a{position:absolute;}
.flg-mask{display:block;overflow:hidden;padding-bottom:0.08em;margin-bottom:-0.08em;}
.flg-mask>span{display:block;will-change:transform;}
.flg-small{font-size:clamp(10px,0.74cqw,12.5px);letter-spacing:0.01em;}
.flg-caps{text-transform:uppercase;letter-spacing:0.14em;font-size:clamp(9.5px,0.66cqw,11.5px);font-weight:600;}
.flg-body{font-size:clamp(12.5px,0.9cqw,15px);line-height:1.6;color:var(--flg-mute);}
.flg-mute{color:var(--flg-mute);}
.flg-pre{white-space:pre-line;}

.flg-head{left:3.4cqw;right:3.4cqw;top:0;height:clamp(64px,10cqh,108px);display:flex;align-items:center;z-index:4;}
.flg-logo{display:flex;align-items:center;gap:clamp(10px,0.9cqw,16px);font-weight:700;font-size:clamp(12px,0.84cqw,15px);letter-spacing:-0.01em;}
.flg-logo svg{flex:none;}
.flg-search{position:absolute;left:36.6cqw;display:flex;align-items:center;gap:12px;}
.flg-search input{font:inherit;font-size:clamp(11px,0.74cqw,13px);color:inherit;background:transparent;border:0;outline:0;width:13cqw;min-width:120px;padding:4px 0;border-bottom:1px solid transparent;transition:border-color .3s;}
.flg-search input::placeholder{color:var(--flg-mute);}
.flg-search input:focus{border-bottom-color:currentColor;}
.flg-round{width:clamp(28px,2.3cqw,38px);height:clamp(28px,2.3cqw,38px);border-radius:50%;display:grid;place-items:center;flex:none;background:color-mix(in srgb,var(--flg-bg) 72%,transparent);box-shadow:0 0 0 1px color-mix(in srgb,var(--flg-ink) 13%,transparent);transition:background-color .25s ease,transform .25s ease;}
.flg-round:hover{background:color-mix(in srgb,var(--flg-ink) 9%,var(--flg-bg));}
.flg-round:active{transform:scale(0.94);}
.flg-hits{position:absolute;top:calc(100% + 10px);left:44px;min-width:240px;background:var(--flg-bg);box-shadow:0 0 0 1px color-mix(in srgb,var(--flg-ink) 12%,transparent),0 18px 40px -18px rgba(0,0,0,.35);border-radius:10px;padding:6px;}
.flg-hits button{display:flex;justify-content:space-between;gap:18px;width:100%;padding:9px 10px;border-radius:6px;font-size:clamp(11px,0.76cqw,13px);}
.flg-hits button:hover,.flg-hits button[data-on]{background:color-mix(in srgb,var(--flg-ink) 7%,transparent);}
.flg-nav{margin-left:auto;display:flex;gap:clamp(18px,2.3cqw,40px);font-size:clamp(11px,0.76cqw,13px);font-weight:500;}
.flg-nav button{position:relative;padding:4px 0;}
.flg-nav button::after{content:"";position:absolute;left:0;right:0;bottom:0;height:1px;background:currentColor;transform:scaleX(0);transform-origin:right;transition:transform .35s cubic-bezier(.2,.8,.2,1);}
.flg-nav button:hover::after,.flg-nav button[aria-current="true"]::after{transform:scaleX(1);transform-origin:left;}

.flg-crumb{left:3.4cqw;top:50%;writing-mode:vertical-rl;transform:rotate(180deg) translateY(50%);display:flex;gap:10px;align-items:center;font-size:clamp(10px,0.7cqw,12px);font-weight:500;}
.flg-hero{left:12.4cqw;top:31cqh;width:46cqw;}
.flg-chip{display:inline-flex;align-items:center;gap:10px;font-weight:600;font-size:clamp(11px,0.76cqw,13px);}
.flg-h1{font-family:var(--flg-geo);font-weight:400;font-size:clamp(30px,3.55cqw,70px);line-height:1.14;letter-spacing:-0.028em;margin:2.4cqh 0 2.8cqh;}
.flg-h1 em{font-style:normal;color:var(--flg-mute);}
.flg-meta{display:flex;align-items:center;gap:clamp(14px,1.6cqw,28px);font-size:clamp(10.5px,0.72cqw,12.5px);}
.flg-meta>span{display:inline-flex;align-items:center;gap:7px;color:var(--flg-mute);}
.flg-cta{display:inline-flex;align-items:center;gap:12px;font-weight:600;}
.flg-cta svg{transition:transform .3s cubic-bezier(.2,.8,.2,1);}
.flg-cta:hover svg{transform:translateX(4px);}
.flg-thread{left:12.4cqw;bottom:7.5cqh;width:50cqw;}
.flg-thread h3{display:flex;align-items:center;gap:10px;font-size:clamp(11px,0.76cqw,13px);font-weight:600;margin-bottom:2.6cqh;}
.flg-items{display:grid;grid-template-columns:repeat(3,1fr);gap:2.2cqw;}
.flg-item{display:flex;gap:12px;align-items:center;font-size:clamp(10.5px,0.72cqw,12.5px);line-height:1.4;color:var(--flg-mute);transition:color .25s;}
.flg-item:hover{color:var(--flg-ink);}
.flg-item img,.flg-tile{width:clamp(36px,2.8cqw,52px);height:clamp(36px,2.8cqw,52px);border-radius:7px;object-fit:cover;flex:none;max-width:none;background:#1b1916;display:block;transition:transform .35s cubic-bezier(.2,.8,.2,1);}
.flg-item:hover img{transform:scale(1.06) rotate(-2deg);}
.flg-pips{left:3.4cqw;bottom:7.5cqh;display:flex;flex-direction:column;gap:7px;}
.flg-pips i{width:4px;height:4px;border-radius:50%;background:var(--flg-ink);opacity:.25;}
.flg-pips i:first-child{opacity:.9;}
.flg-social{right:3.4cqw;top:16cqh;display:flex;flex-direction:column;gap:12px;}
.flg-hint{right:calc(3.4cqw + 52px);bottom:8.2cqh;font-size:clamp(10px,0.68cqw,12px);}
.flg-arrows{right:3.4cqw;bottom:7.5cqh;display:flex;flex-direction:column;gap:10px;z-index:4;}

.flg-word{left:0;right:0;top:10.5cqh;text-align:center;font-weight:500;line-height:0.78;letter-spacing:-0.045em;white-space:nowrap;font-size:20cqw;}
.flg-panel{left:17.6cqw;right:17.6cqw;top:44cqh;bottom:19cqh;background:var(--flg-panel);}
.flg-cap{top:45.5cqh;font-size:clamp(13px,1.24cqw,22px);line-height:1.22;letter-spacing:-0.012em;white-space:pre-line;}
.flg-cap-l{right:calc(100cqw - 16.2cqw);text-align:right;}
.flg-cap-r{left:83.8cqw;}
.flg-words{left:3.4cqw;right:3.4cqw;bottom:5cqh;display:flex;justify-content:space-between;}
.flg-words span{position:relative;font-weight:600;font-size:clamp(10px,0.78cqw,13px);letter-spacing:0.05em;text-transform:uppercase;transition:opacity .4s;opacity:.55;}
.flg-words span[data-on]{opacity:1;}
.flg-words span::after{content:"";position:absolute;left:0;right:0;bottom:-7px;height:1.5px;background:var(--flg-accent);transform:scaleX(0);transition:transform .5s cubic-bezier(.2,.8,.2,1);}
.flg-words span[data-on]::after{transform:scaleX(1);}
.flg-tag{left:50%;top:39.5cqh;transform:translateX(-50%);font-size:clamp(10px,0.7cqw,12px);}

.flg-spec-l{left:6cqw;top:25cqh;width:27cqw;}
.flg-family{display:flex;align-items:center;gap:10px;font-weight:600;font-size:clamp(11px,0.76cqw,13px);}
.flg-family i{width:9px;height:9px;background:var(--flg-mute);display:block;}
.flg-name{font-family:var(--flg-serif);font-weight:300;font-size:clamp(44px,5.4cqw,110px);line-height:1.02;letter-spacing:-0.02em;margin:2.6cqh 0 3.4cqh;}
.flg-latin{font-family:var(--flg-serif);font-style:italic;font-size:clamp(14px,1.15cqw,20px);color:var(--flg-mute);margin:-1.8cqh 0 2.6cqh;}
.flg-facts{display:flex;gap:4cqw;margin-top:5cqh;font-size:clamp(11px,0.76cqw,13px);}
.flg-facts b{display:block;font-weight:600;margin-bottom:1.4cqh;}
.flg-spec-r{right:6cqw;top:25cqh;width:20.5cqw;}
.flg-thumbs{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:3.4cqh;}
.flg-thumbs img,.flg-thumbs i{display:block;width:100%;aspect-ratio:1.45;object-fit:cover;max-width:none;background:#141311;}
.flg-thumbs img{transition:transform .5s cubic-bezier(.2,.8,.2,1),filter .5s;}
.flg-thumbs button{display:block;overflow:hidden;}
.flg-thumbs button:hover img{transform:scale(1.08);filter:brightness(1.1);}
.flg-note h3{font-size:clamp(11.5px,0.82cqw,14px);font-weight:600;margin-bottom:1.6cqh;}
.flg-credit{display:flex;align-items:center;gap:12px;margin:2.4cqh 0 3.6cqh;font-size:clamp(10.5px,0.72cqw,12.5px);color:var(--flg-mute);}
.flg-credit::before{content:"";width:26px;height:1px;background:currentColor;}
.flg-btn{display:flex;align-items:center;justify-content:center;gap:12px;width:100%;padding:clamp(13px,2.1cqh,20px) 0;background:color-mix(in srgb,var(--flg-ink) 12%,transparent);font-weight:600;font-size:clamp(11.5px,0.8cqw,14px);transition:background-color .3s;}
.flg-btn:hover{background:color-mix(in srgb,var(--flg-ink) 20%,transparent);}
.flg-dots{left:6cqw;bottom:7cqh;display:flex;align-items:center;gap:12px;}
.flg-dot{width:22px;height:22px;display:grid;place-items:center;}
.flg-dot i{width:6px;height:6px;border-radius:50%;background:var(--flg-ink);opacity:.3;transition:opacity .3s,transform .3s;}
.flg-dot:hover i{opacity:.7;}
.flg-dot[aria-current="true"] i{opacity:1;transform:scale(1.25);background:var(--flg-accent);}
.flg-share{right:calc(6cqw + 60px);bottom:7.8cqh;display:flex;align-items:center;gap:clamp(16px,2cqw,34px);font-size:clamp(10.5px,0.72cqw,12.5px);}
.flg-share a{color:var(--flg-mute);transition:color .25s;}
.flg-share a:hover{color:var(--flg-ink);}
.flg-drawer{position:absolute;top:0;right:0;bottom:0;width:min(420px,92cqw);z-index:6;background:#121110;color:#efebe4;padding:clamp(28px,5cqh,56px) clamp(24px,2.6cqw,44px);display:flex;flex-direction:column;gap:3cqh;transform:translateX(104%);visibility:hidden;transition:transform .6s cubic-bezier(.2,.8,.2,1),visibility 0s linear .6s;pointer-events:auto;box-shadow:-30px 0 60px -30px rgba(0,0,0,.6);overflow-y:auto;}
.flg-drawer[data-open]{transform:none;visibility:visible;transition:transform .6s cubic-bezier(.2,.8,.2,1),visibility 0s;}
.flg-drawer dl{display:grid;grid-template-columns:auto 1fr;gap:2.2cqh 24px;margin:0;font-size:clamp(12px,0.86cqw,14.5px);}
.flg-drawer dt{color:#9a958d;}
.flg-drawer dd{margin:0;}

.flg-fp{top:12cqh;font-size:clamp(13px,1.26cqw,21px);line-height:1.38;letter-spacing:-0.006em;}
.flg-fp-l{left:3cqw;width:33cqw;}
.flg-fp-r{left:52cqw;width:43cqw;}
.flg-news{left:3cqw;top:31cqh;width:26cqw;}
.flg-news form{display:flex;align-items:center;gap:14px;border-bottom:1px solid color-mix(in srgb,var(--flg-ink) 40%,transparent);padding:8px 0;margin-top:12px;}
.flg-news input{flex:1;min-width:0;font:inherit;font-size:clamp(12px,0.86cqw,14.5px);color:inherit;background:transparent;border:0;outline:0;}
.flg-news input::placeholder{color:var(--flg-mute);}
.flg-news button{font-weight:600;font-size:clamp(11px,0.78cqw,13px);display:inline-flex;gap:8px;align-items:center;}
.flg-pager{left:3cqw;bottom:13cqh;display:flex;align-items:center;gap:14px;font-size:clamp(10.5px,0.72cqw,12.5px);}
.flg-pager b{font-weight:600;color:var(--flg-ink);}
.flg-scrib{position:absolute;overflow:visible;pointer-events:none;color:var(--flg-ink);}
.flg-scrib path{fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1 1.1;stroke-dashoffset:clamp(0, calc(1 - var(--p, 1) * var(--n, 1) + var(--i, 0)), 1.05);}
.flg-fbar{left:3cqw;right:3cqw;bottom:3.4cqh;display:flex;align-items:flex-end;justify-content:space-between;gap:24px;}
.flg-fbar>div{display:flex;align-items:flex-end;gap:clamp(20px,3cqw,56px);}
.flg-flinks{display:flex;gap:clamp(14px,1.8cqw,30px);font-size:clamp(10.5px,0.74cqw,12.5px);font-weight:500;align-items:center;}
.flg-flinks span{color:var(--flg-mute);font-weight:400;}
.flg-flinks button,.flg-flinks a{transition:opacity .25s;}
.flg-flinks button:hover,.flg-flinks a:hover{opacity:.6;}

.flg-pre-ui{z-index:7;pointer-events:none;}
.flg-pre-ui>*{position:absolute;}
.flg-count{right:3.4cqw;bottom:4cqh;font-family:var(--flg-serif);font-weight:300;font-size:clamp(64px,10cqw,190px);line-height:.8;letter-spacing:-0.04em;font-variant-numeric:tabular-nums;}
.flg-pre-cap{left:3.4cqw;bottom:5cqh;display:flex;flex-direction:column;gap:8px;}
.flg-pre-cap i{font-family:var(--flg-serif);font-size:clamp(16px,1.4cqw,26px);font-weight:300;}
.flg-pre-bar{left:3.4cqw;right:3.4cqw;bottom:2.4cqh;height:1px;background:color-mix(in srgb,var(--flg-ink) 14%,transparent);}
.flg-pre-bar i{position:absolute;inset:0;background:var(--flg-ink);transform-origin:left;transform:scaleX(0);}
.flg-pre-brand{left:50%;top:6cqh;transform:translateX(-50%);display:flex;gap:12px;align-items:center;font-weight:700;font-size:clamp(12px,0.84cqw,15px);}
.flg-skip{right:3.4cqw;top:5.6cqh;pointer-events:auto;font-size:clamp(10.5px,0.72cqw,12.5px);color:var(--flg-mute);}
.flg-ring{left:50%;top:50%;transform:translate(-50%,-50%);overflow:visible;}

.flg-grain{position:absolute;inset:0;width:100%;height:100%;z-index:5;pointer-events:none;mix-blend-mode:multiply;opacity:.5;}
.flg-dark .flg-grain{mix-blend-mode:screen;opacity:.16;}

@container (max-width: 760px){
  .flg-search,.flg-nav button:not(:nth-child(3)),.flg-crumb,.flg-social,.flg-pips,.flg-hint,.flg-cap-r,.flg-share,.flg-spec-r,.flg-fp-r,.flg-tag{display:none;}
  .flg-hero{left:6cqw;width:88cqw;top:auto;bottom:24cqh;}
  .flg-h1{font-size:7.6cqw;margin:1.6cqh 0 2cqh;}
  .flg-arrows{display:none;}
  .flg-stage{--flg-hs:1.9;}
  .flg-stage [data-note],.flg-stage [data-mark]{display:none;}
  .flg-thread{left:6cqw;width:76cqw;bottom:5.5cqh;}
  .flg-thread h3{margin-bottom:1.6cqh;}
  .flg-items{grid-template-columns:1fr;}
  .flg-items>*:not(:first-child){display:none;}
  .flg-word{top:13cqh;}
  .flg-panel{left:7cqw;right:7cqw;top:36cqh;bottom:23cqh;}
  .flg-cap{top:27cqh;font-size:3.7cqw;}
  .flg-cap-l{right:auto;left:6cqw;text-align:left;}
  .flg-words{left:5cqw;right:5cqw;bottom:6cqh;}
  .flg-words span{font-size:2.3cqw;letter-spacing:.02em;}
  .flg-spec-l{left:6cqw;top:11cqh;width:88cqw;}
  .flg-name{font-size:13.5cqw;margin:1.4cqh 0 1.6cqh;}
  .flg-latin{margin:-0.6cqh 0 0;}
  .flg-spec-l .flg-body{position:absolute;top:64cqh;left:0;width:88cqw;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}
  .flg-facts{position:absolute;top:77cqh;left:0;margin:0;}
  .flg-dots{left:5cqw;bottom:4.5cqh;}
  .flg-fp-l{left:6cqw;width:88cqw;top:10.5cqh;font-size:3.5cqw;}
  .flg-news{left:6cqw;top:auto;bottom:12.5cqh;width:88cqw;}
  .flg-pager{left:6cqw;top:auto;bottom:24cqh;}
  .flg-fbar{left:6cqw;right:6cqw;bottom:3cqh;flex-wrap:wrap;}
  .flg-fbar svg{display:none;}
  .flg-fbar>div{gap:14px;}
  .flg-flinks{flex-wrap:wrap;row-gap:6px;}
  .flg-count{font-size:22cqw;}
}
@container (max-height: 560px){
  .flg-thread,.flg-pips{display:none;}
}
@media (prefers-reduced-motion: reduce){
  .flg-stage *{transition-duration:0.01ms !important;animation-duration:0.01ms !important;}
}
`

/** data-flg="from to delay mode" — read by the frame loop, never by React. */
const fx = (a: number, b: number, d = 0, mode = "") => ({ "data-flg": a + " " + b + " " + d + " " + mode, className: "flg-fx" })

const toForm = (s: FlorilegiumSpecies) => {
  if (typeof s.form !== "string") return s.form
  const f = (FLORA as unknown as { [k: string]: FlowerForm })[s.form]
  return f || FLORA.anemone
}

export default function FlorilegiumTemplate({
  brand = "Anthesis",
  nav = NAV,
  searchPlaceholder = "Search species",
  hero: heroIn,
  anthesis: anthIn,
  specimens = DEFAULT_SPECIMENS,
  footer: footIn,
  socials = SOCIALS,
  onSubscribe,
  palette,
  darkPalette,
  theme = "auto",
  fonts,
  preloader = true,
  preloaderDuration = 2.8,
  pixelBlock = 9,
  alive = true,
  height = "100svh",
  sceneScroll = 0.85,
  className = "",
}: FlorilegiumTemplateProps) {
  const hero = { ...HERO, ...heroIn } as HeroCopy
  const ant = { ...ANTHESIS, ...anthIn } as AnthesisCopy
  const foot = { ...FOOTER, ...footIn } as FooterCopy
  const specs = specimens.length ? specimens : DEFAULT_SPECIMENS
  const blooms = foot.blooms.length ? foot.blooms : DEFAULT_FOOTER

  const S_SPEC = 3
  const S_FOOT = S_SPEC + specs.length
  const N = S_FOOT + blooms.length
  const species = [hero.species, ant.species, ant.pixelSpecies, ...specs, ...blooms.map((b) => b.species)]
  const kinds = species.map((_, i) =>
    (i === 0 ? "hero" : i === 1 ? "anthesis" : i === 2 ? "pixel" : i < S_FOOT ? "specimen" : "footer") as SceneKind,
  )
  const speciesKey = JSON.stringify(species.map((s) => s.form))

  const rootRef = React.useRef(null as HTMLElement | null)
  const stageRef = React.useRef(null as HTMLDivElement | null)
  const canvasRef = React.useRef(null as HTMLCanvasElement | null)
  const wordRef = React.useRef(null as HTMLSpanElement | null)
  const jumpRef = React.useRef((i: number) => {})
  const skipRef = React.useRef(() => {})
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "")

  const [reduced, setReduced] = React.useState(false)
  const [dark, setDark] = React.useState(theme === "dark")
  const [scene, setScene] = React.useState(0)
  const [thumbs, setThumbs] = React.useState({} as { [k: string]: string })
  const [detail, setDetail] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [email, setEmail] = React.useState("")
  const [sent, setSent] = React.useState(0)
  const [introDone, setIntroDone] = React.useState(!preloader)

  const pal = { ...(dark ? DARK : LIGHT), ...(dark ? darkPalette : palette) } as FlorilegiumPalette
  const sans = fonts?.sans || SANS
  const serif = fonts?.serif || SERIF
  const geo = fonts?.geo || GEO
  const fontHref = fonts?.href ?? null

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])

  // Theme: explicit, else a .dark ancestor, else the OS.
  React.useEffect(() => {
    if (theme !== "auto") {
      setDark(theme === "dark")
      return
    }
    const root = rootRef.current
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const sync = () => {
      const marked = root?.closest(".dark, .light, [data-theme]")
      if (marked) setDark(marked.classList.contains("dark") || marked.getAttribute("data-theme") === "dark")
      else setDark(mq.matches)
    }
    sync()
    const mo = new MutationObserver(sync)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] })
    mq.addEventListener("change", sync)
    return () => {
      mo.disconnect()
      mq.removeEventListener("change", sync)
    }
  }, [theme])

  React.useEffect(() => {
    if (!fontHref) return
    const exists = Array.from(document.querySelectorAll("link[rel=stylesheet]")).some((l) => (l as HTMLLinkElement).href === fontHref)
    if (exists) return
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = fontHref
    link.setAttribute("data-florilegium-font", "")
    document.head.appendChild(link)
  }, [fontHref])

  const live = React.useRef({ pal, kinds, alive, reduced, pixelBlock, N, preloaderDuration, preloader })
  live.current = { pal, kinds, alive, reduced, pixelBlock, N, preloaderDuration, preloader }
  const sceneRef = React.useRef(0)

  React.useEffect(() => {
    const root = rootRef.current
    const stage = stageRef.current
    const canvas = canvasRef.current
    if (!root || !stage || !canvas) return

    const forms = species.map((s) => resolveForm(toForm(s)))
    const topo = buildTopology()
    const data = new Float32Array(VERTS * STRIDE)

    // ---- GL, with a 2D fallback ------------------------------------------
    let gl: WebGLRenderingContext | null = null
    let ctx2d: CanvasRenderingContext2D | null = null
    let prog: WebGLProgram | null = null
    let blit: WebGLProgram | null = null
    let shadowProg: WebGLProgram | null = null
    let sfbo: WebGLFramebuffer | null = null
    let stex: WebGLTexture | null = null
    let sdepth: WebGLRenderbuffer | null = null
    let ssize = 0
    let vbo: WebGLBuffer | null = null
    let ibo: WebGLBuffer | null = null
    let quad: WebGLBuffer | null = null
    let fbo: WebGLFramebuffer | null = null
    let ftex: WebGLTexture | null = null
    let fdepth: WebGLRenderbuffer | null = null
    let fw = 0
    let fh = 0
    let soft = false
    const loc: { [k: string]: WebGLUniformLocation | null } = {}
    const att: { [k: string]: number } = {}

    const compile = (g: WebGLRenderingContext, vsSrc: string, fsSrc: string) => {
      const sh = (type: number, src: string) => {
        const s = g.createShader(type)
        if (!s) return null
        g.shaderSource(s, src)
        g.compileShader(s)
        return g.getShaderParameter(s, g.COMPILE_STATUS) ? s : null
      }
      const vs = sh(g.VERTEX_SHADER, vsSrc)
      const fs = sh(g.FRAGMENT_SHADER, fsSrc)
      if (!vs || !fs) return null
      const p = g.createProgram()
      if (!p) return null
      g.attachShader(p, vs)
      g.attachShader(p, fs)
      g.linkProgram(p)
      g.deleteShader(vs)
      g.deleteShader(fs)
      return g.getProgramParameter(p, g.LINK_STATUS) ? p : null
    }

    const initGL = () => {
      const g = canvas.getContext("webgl", { alpha: true, antialias: true, premultipliedAlpha: true }) as WebGLRenderingContext | null
      if (!g) return false
      // ~100k vertices: 32-bit indices, available on every WebGL1 we target
      if (!g.getExtension("OES_element_index_uint")) return false
      const deriv = g.getExtension("OES_standard_derivatives")
      prog = compile(g, VERT, (deriv ? "#extension GL_OES_standard_derivatives : enable\n#define HAS_DERIV 1\n" : "") + FRAG)
      blit = compile(g, BLIT_VERT, BLIT_FRAG)
      shadowProg = compile(g, SHADOW_VERT, SHADOW_FRAG)
      if (!prog || !blit) return false
      const dbg = g.getExtension("WEBGL_debug_renderer_info")
      const name = dbg ? String(g.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : ""
      soft = /swiftshader|llvmpipe|software/i.test(name)
      vbo = g.createBuffer()
      g.bindBuffer(g.ARRAY_BUFFER, vbo)
      g.bufferData(g.ARRAY_BUFFER, data.byteLength, g.DYNAMIC_DRAW)
      ibo = g.createBuffer()
      g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, ibo)
      g.bufferData(g.ELEMENT_ARRAY_BUFFER, topo.index, g.STATIC_DRAW)
      quad = g.createBuffer()
      g.bindBuffer(g.ARRAY_BUFFER, quad)
      g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), g.STATIC_DRAW)
      for (const n of ["a_pos", "a_nrm", "a_col", "a_uv", "a_ao", "a_kind"]) att[n] = g.getAttribLocation(prog, n)
      att.a_xy = g.getAttribLocation(blit, "a_xy")
      if (shadowProg) for (const n of ["a_pos", "a_uv", "a_kind"]) att["s_" + n] = g.getAttribLocation(shadowProg, n)
      if (shadowProg) for (const n of ["u_lh", "u_ls", "u_time", "u_sway"]) loc["s_" + n] = g.getUniformLocation(shadowProg, n)
      for (const n of ["u_proj", "u_mvh", "u_mvs", "u_lh", "u_ls", "u_shadow", "u_sh", "u_time", "u_sway", "u_blotch", "u_pet", "u_bl", "u_rimc", "u_light"])
        loc[n] = g.getUniformLocation(prog, n)
      for (const n of ["u_tex", "u_scale", "u_levels"]) loc[n] = g.getUniformLocation(blit, n)
      g.clearColor(0, 0, 0, 0)
      fbo = null
      fw = fh = 0
      sfbo = null
      ssize = 0
      gl = g
      meshKey = ""
      return true
    }

    const onLost = (e: Event) => {
      e.preventDefault()
      gl = null
    }
    const onRestored = () => {
      if (!initGL()) gl = null
    }
    canvas.addEventListener("webglcontextlost", onLost)
    canvas.addEventListener("webglcontextrestored", onRestored)

    let meshKey = ""
    let metrics = { radius: 1, pivot: 0 }
    let cur = forms[0]

    if (!initGL()) {
      gl = null
      ctx2d = canvas.getContext("2d")
    }

    // ---- measuring --------------------------------------------------------
    let W = 1
    let H = 1
    let dpr = 1
    const fitWord = () => {
      const w = wordRef.current
      if (!w) return
      const box = w.parentElement as HTMLElement
      box.style.fontSize = "100px"
      const natural = w.offsetWidth || 1
      box.style.fontSize = ((W * 0.935) / natural) * 100 + "px"
    }
    const measure = () => {
      W = Math.max(1, stage.clientWidth)
      H = Math.max(1, stage.clientHeight)
      const budget = soft ? 1.3e6 : 8.3e6
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      if (W * H * dpr * dpr > budget) dpr = Math.sqrt(budget / (W * H))
      const cw = Math.max(1, Math.round(W * dpr))
      const ch = Math.max(1, Math.round(H * dpr))
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw
        canvas.height = ch
      }
      fitWord()
      dirty = true
    }
    let dirty = true
    const ro = new ResizeObserver(measure)
    ro.observe(stage)
    measure()

    // ---- the overlay elements ------------------------------------------------
    type Node = { el: HTMLElement; a: number; b: number; d: number; mode: string; last: number }
    let nodes: Node[] = []
    const collect = () => {
      nodes = Array.from(stage.querySelectorAll("[data-flg]")).map((el) => {
        const [a, b, d, mode] = (el.getAttribute("data-flg") || "0 0 0").split(" ")
        return { el: el as HTMLElement, a: +a, b: +b, d: +d || 0, mode: mode || "", last: -1 }
      })
    }
    collect()
    const mo = new MutationObserver(() => {
      collect()
      dirty = true
    })
    mo.observe(stage, { childList: true, subtree: true })
    const preEls = Array.from(stage.querySelectorAll("[data-flg-pre]")) as HTMLElement[]
    const countEl = stage.querySelector("[data-flg-count]") as HTMLElement | null
    const barEl = stage.querySelector("[data-flg-bar]") as HTMLElement | null
    const ringEl = stage.querySelector("[data-flg-ring]") as SVGElement | null

    // ---- state -------------------------------------------------------------------
    const L0 = live.current
    // read the media query directly: the reduced state above lands a render late
    const rmNow = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const startP = (() => {
      const r = root.getBoundingClientRect()
      return progressFrom(r.top, r.height, H)
    })()
    const st = {
      coord: sceneCoord(startP, L0.N, 0.34),
      intro: L0.preloader && !rmNow && startP < 0.02 ? 0 : 1.3,
      user: 0,
      spinV: 0,
      tiltX: 0,
      tiltY: 0,
      px: 0,
      py: 0,
      rx: 0,
      rv: 0,
      time: 0,
      pose: INTRO_WIDE,
      hit: { x: 0, y: 0, r: 0 },
      lastScene: -1,
      lastBg: "",
      introSent: false,
    }
    if (st.intro >= 1.3) {
      st.introSent = true
      setIntroDone(true)
    }
    skipRef.current = () => {
      st.intro = Math.max(st.intro, 0.8)
    }

    // ---- drawing -------------------------------------------------------------------
    const upload = (form: RForm, bloom: number) => {
      metrics = buildFlower(form, bloom, data)
      if (gl && vbo) {
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, data)
      }
    }

    const matrices = (pose: Pose, vw: number, vh: number) => {
      const fov = 30 * DEG
      const f = 1 / Math.tan(fov / 2)
      const D = (f * vh) / (Math.max(0.05, pose.size) * Math.min(vw, vh))
      const proj = perspective(fov, vw / vh, Math.max(0.05, D - 4), D + 12)
      proj[8] -= pose.ox
      proj[9] -= pose.oy
      const nod = pose.nod * DEG
      const pv = metrics.pivot / metrics.radius
      const centre = translate(0, -pv * Math.cos(nod), -pv * Math.sin(nod))
      const sc = scale(1 / metrics.radius)
      const head = mul(centre, mul(rotX(nod), mul(rotY(pose.spin), sc)))
      const stem = mul(centre, mul(rotY(pose.spin * 0.35), sc))
      const view = mul(translate(0, 0, -D), mul(rotX((pose.el + st.tiltX) * DEG), rotZ(st.tiltY * DEG)))
      const mvh = mul(view, head)
      const mvs = mul(view, stem)
      // the key light, as an orthographic camera hugging the head
      const L = [-0.6, 0.68, 0.42]
      const ll = Math.hypot(L[0], L[1], L[2])
      const c = [0, 0, -D]
      const lv = lookAt([c[0] + (L[0] / ll) * 6, c[1] + (L[1] / ll) * 6, c[2] + (L[2] / ll) * 6], c)
      const lp = mul(ortho(-1.3, 1.3, -1.3, 1.3, 3.4, 9), lv)
      return { proj, mvh, mvs, lh: mul(lp, mvh), ls: mul(lp, mvs) }
    }

    const ensureShadow = (size: number) => {
      const g = gl
      if (!g || !shadowProg) return false
      if (sfbo && ssize === size) return true
      if (sfbo) {
        g.deleteFramebuffer(sfbo)
        g.deleteTexture(stex)
        g.deleteRenderbuffer(sdepth)
      }
      ssize = size
      stex = g.createTexture()
      g.bindTexture(g.TEXTURE_2D, stex)
      g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, size, size, 0, g.RGBA, g.UNSIGNED_BYTE, null)
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.NEAREST)
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.NEAREST)
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE)
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE)
      sdepth = g.createRenderbuffer()
      g.bindRenderbuffer(g.RENDERBUFFER, sdepth)
      g.renderbufferStorage(g.RENDERBUFFER, g.DEPTH_COMPONENT16, size, size)
      sfbo = g.createFramebuffer()
      g.bindFramebuffer(g.FRAMEBUFFER, sfbo)
      g.framebufferTexture2D(g.FRAMEBUFFER, g.COLOR_ATTACHMENT0, g.TEXTURE_2D, stex, 0)
      g.framebufferRenderbuffer(g.FRAMEBUFFER, g.DEPTH_ATTACHMENT, g.RENDERBUFFER, sdepth)
      const ok = g.checkFramebufferStatus(g.FRAMEBUFFER) === g.FRAMEBUFFER_COMPLETE
      g.bindFramebuffer(g.FRAMEBUFFER, null)
      if (!ok) {
        g.deleteFramebuffer(sfbo)
        sfbo = null
      }
      return ok
    }

    /**
     * Shadow pass from the key light, then the flower into whatever `target`
     * binds (it also sets the viewport and clears).
     */
    const drawMesh = (pose: Pose, vw: number, vh: number, form: RForm, night: number, target: () => void) => {
      const g = gl
      if (!g || !prog || !vbo || !ibo) return
      const M = matrices(pose, vw, vh)
      const sway = live.current.alive && !live.current.reduced ? 1 : 0
      const ptr = (a: number, size: number, off: number) => {
        if (a < 0) return
        g.enableVertexAttribArray(a)
        g.vertexAttribPointer(a, size, g.FLOAT, false, STRIDE * 4, off * 4)
      }
      const off = () => {
        for (const n in att) if (att[n] >= 0) g.disableVertexAttribArray(att[n])
      }
      g.enable(g.DEPTH_TEST)
      const size = soft ? 1024 : 2048
      const shadowed = ensureShadow(size) && !!sfbo && !!shadowProg
      if (shadowed && shadowProg) {
        g.bindFramebuffer(g.FRAMEBUFFER, sfbo)
        g.viewport(0, 0, size, size)
        g.clearColor(1, 1, 1, 1)
        g.clear(g.COLOR_BUFFER_BIT | g.DEPTH_BUFFER_BIT)
        g.clearColor(0, 0, 0, 0)
        g.useProgram(shadowProg)
        off()
        g.bindBuffer(g.ARRAY_BUFFER, vbo)
        ptr(att.s_a_pos, 3, 0)
        ptr(att.s_a_uv, 2, 9)
        ptr(att.s_a_kind, 1, 12)
        g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, ibo)
        g.uniformMatrix4fv(loc.s_u_lh, false, M.lh)
        g.uniformMatrix4fv(loc.s_u_ls, false, M.ls)
        g.uniform1f(loc.s_u_time, st.time)
        g.uniform1f(loc.s_u_sway, sway)
        g.drawElements(g.TRIANGLES, topo.index.length, g.UNSIGNED_INT, 0)
      }
      target()
      g.enable(g.DEPTH_TEST)
      g.useProgram(prog)
      off()
      g.bindBuffer(g.ARRAY_BUFFER, vbo)
      ptr(att.a_pos, 3, 0)
      ptr(att.a_nrm, 3, 3)
      ptr(att.a_col, 3, 6)
      ptr(att.a_uv, 2, 9)
      ptr(att.a_ao, 1, 11)
      ptr(att.a_kind, 1, 12)
      g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, ibo)
      g.uniformMatrix4fv(loc.u_proj, false, M.proj)
      g.uniformMatrix4fv(loc.u_mvh, false, M.mvh)
      g.uniformMatrix4fv(loc.u_mvs, false, M.mvs)
      g.uniformMatrix4fv(loc.u_lh, false, M.lh)
      g.uniformMatrix4fv(loc.u_ls, false, M.ls)
      g.activeTexture(g.TEXTURE1)
      g.bindTexture(g.TEXTURE_2D, shadowed ? stex : null)
      g.uniform1i(loc.u_shadow, 1)
      g.uniform3f(loc.u_sh, 1 / size, shadowed ? 0.85 : 0, 0.006)
      g.activeTexture(g.TEXTURE0)
      g.uniform1f(loc.u_time, st.time)
      g.uniform1f(loc.u_sway, sway)
      const n = form.n
      g.uniform3fv(loc.u_blotch, new Float32Array(form.pal[4]))
      g.uniform4f(loc.u_pet, n.vein, n.crinkle, n.sheen, n.speckle)
      g.uniform4f(loc.u_bl, n.blotchSize, n.blotchAmt, n.diskPattern, n.velvet)
      g.uniform3f(loc.u_rimc, lerp(0.95, 0.75, night), lerp(0.9, 0.8, night), lerp(0.85, 0.95, night))
      g.uniform3f(loc.u_light, pose.rim, lerp(0.95, 1.05, night), lerp(0.45, 0, night))
      g.drawElements(g.TRIANGLES, topo.index.length, g.UNSIGNED_INT, 0)
    }

    const ensureFbo = (w: number, h: number) => {
      const g = gl
      if (!g) return false
      if (fbo && fw >= w && fh >= h) return true
      if (fbo) {
        g.deleteFramebuffer(fbo)
        g.deleteTexture(ftex)
        g.deleteRenderbuffer(fdepth)
      }
      fw = w
      fh = h
      ftex = g.createTexture()
      g.bindTexture(g.TEXTURE_2D, ftex)
      g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, fw, fh, 0, g.RGBA, g.UNSIGNED_BYTE, null)
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.NEAREST)
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.NEAREST)
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE)
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE)
      fdepth = g.createRenderbuffer()
      g.bindRenderbuffer(g.RENDERBUFFER, fdepth)
      g.renderbufferStorage(g.RENDERBUFFER, g.DEPTH_COMPONENT16, fw, fh)
      fbo = g.createFramebuffer()
      g.bindFramebuffer(g.FRAMEBUFFER, fbo)
      g.framebufferTexture2D(g.FRAMEBUFFER, g.COLOR_ATTACHMENT0, g.TEXTURE_2D, ftex, 0)
      g.framebufferRenderbuffer(g.FRAMEBUFFER, g.DEPTH_ATTACHMENT, g.RENDERBUFFER, fdepth)
      const ok = g.checkFramebufferStatus(g.FRAMEBUFFER) === g.FRAMEBUFFER_COMPLETE
      g.bindFramebuffer(g.FRAMEBUFFER, null)
      if (!ok) {
        g.deleteFramebuffer(fbo)
        fbo = null
      }
      return ok
    }

    const render = (pose: Pose, form: RForm, night: number) => {
      const g = gl
      const cw = canvas.width
      const ch = canvas.height
      if (g) {
        const block = Math.round((1 + cl(pose.pixel) * (live.current.pixelBlock - 1)) * dpr)
        if (block >= 2 && ensureFbo(Math.ceil(cw / 2), Math.ceil(ch / 2)) && fbo && blit && quad) {
          const vw = Math.max(1, Math.ceil(cw / block))
          const vh = Math.max(1, Math.ceil(ch / block))
          drawMesh(pose, vw, vh, form, night, () => {
            g.bindFramebuffer(g.FRAMEBUFFER, fbo)
            g.viewport(0, 0, vw, vh)
            g.clear(g.COLOR_BUFFER_BIT | g.DEPTH_BUFFER_BIT)
          })
          g.bindFramebuffer(g.FRAMEBUFFER, null)
          g.viewport(0, 0, cw, ch)
          g.clear(g.COLOR_BUFFER_BIT | g.DEPTH_BUFFER_BIT)
          g.disable(g.DEPTH_TEST)
          g.useProgram(blit)
          for (const n in att) if (att[n] >= 0) g.disableVertexAttribArray(att[n])
          g.bindBuffer(g.ARRAY_BUFFER, quad)
          g.enableVertexAttribArray(att.a_xy)
          g.vertexAttribPointer(att.a_xy, 2, g.FLOAT, false, 0, 0)
          g.activeTexture(g.TEXTURE0)
          g.bindTexture(g.TEXTURE_2D, ftex)
          g.uniform1i(loc.u_tex, 0)
          g.uniform2f(loc.u_scale, vw / fw, vh / fh)
          g.uniform1f(loc.u_levels, lerp(255, 7, cl(pose.pixel * 1.4 - 0.2)))
          g.drawArrays(g.TRIANGLE_STRIP, 0, 4)
        } else {
          drawMesh(pose, cw, ch, form, night, () => {
            g.bindFramebuffer(g.FRAMEBUFFER, null)
            g.viewport(0, 0, cw, ch)
            g.clear(g.COLOR_BUFFER_BIT | g.DEPTH_BUFFER_BIT)
          })
        }
      } else if (ctx2d) {
        draw2D(ctx2d, cw, ch, pose)
      }
    }

    // A painter's-algorithm fallback: every patch as one filled outline.
    const draw2D = (ctx: CanvasRenderingContext2D, cw: number, ch: number, pose: Pose) => {
      const { proj, mvh, mvs } = matrices(pose, cw, ch)
      const mvpH = mul(proj, mvh)
      const mvpS = mul(proj, mvs)
      let mvp = mvpH
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, cw, ch)
      const items: { z: number; pts: number[]; c: string; line: number }[] = []
      const proj2 = (i: number) => {
        const o = i * STRIDE
        const p = xform(mvp, data[o], data[o + 1], data[o + 2])
        const w = p[3] || 1
        return [((p[0] / w) * 0.5 + 0.5) * cw, (1 - ((p[1] / w) * 0.5 + 0.5)) * ch, p[2] / w]
      }
      for (const pt of topo.patches) {
        const [start, rows, cols, kind] = pt
        const mid = start + Math.floor(rows / 2) * cols + Math.floor(cols / 2)
        const mo = mid * STRIDE
        if (data[mo] === 0 && data[mo + 1] === 0 && data[mo + 2] === 0) continue
        mvp = kind >= 5 ? mvpS : mvpH
        const nv = xform(kind >= 5 ? mvs : mvh, data[mo + 3], data[mo + 4], data[mo + 5])
        const lit = 0.55 + 0.45 * Math.abs(nv[1] * 0.7 + nv[2] * 0.5 - nv[0] * 0.3)
        const c = [data[mo + 6], data[mo + 7], data[mo + 8]].map((v) => Math.round(255 * Math.pow(Math.min(1, v * lit), 1 / 2.2)))
        const pts: number[] = []
        let z = 0
        if (kind === 5 || kind === 2) {
          for (let i = 0; i < rows; i++) {
            const p = proj2(start + i * cols)
            pts.push(p[0], p[1])
            z += p[2]
          }
          items.push({ z: z / rows, pts, c: "rgb(" + c.join(",") + ")", line: kind === 5 ? 3 * dpr : 1 })
          continue
        }
        const ring: number[] = []
        for (let j = 0; j < cols; j++) ring.push(start + j)
        for (let i = 1; i < rows; i++) ring.push(start + i * cols + cols - 1)
        for (let j = cols - 2; j >= 0; j--) ring.push(start + (rows - 1) * cols + j)
        for (let i = rows - 2; i > 0; i--) ring.push(start + i * cols)
        for (const v of ring) {
          const p = proj2(v)
          pts.push(p[0], p[1])
          z += p[2]
        }
        items.push({ z: z / ring.length, pts, c: "rgb(" + c.join(",") + ")", line: 0 })
      }
      items.sort((a, b) => b.z - a.z)
      ctx.lineJoin = "round"
      ctx.lineCap = "round"
      for (const it of items) {
        ctx.beginPath()
        ctx.moveTo(it.pts[0], it.pts[1])
        for (let i = 2; i < it.pts.length; i += 2) ctx.lineTo(it.pts[i], it.pts[i + 1])
        if (it.line) {
          ctx.strokeStyle = it.c
          ctx.lineWidth = it.line
          ctx.stroke()
        } else {
          ctx.closePath()
          ctx.fillStyle = it.c
          ctx.fill()
        }
      }
    }

    // ---- thumbnails, rendered by the same engine -------------------------------------
    const shots: { i: number; kind: string }[] = []
    species.forEach((_, i) => {
      shots.push({ i, kind: "p" })
      if (i >= S_SPEC && i < S_FOOT) shots.push({ i, kind: "c" })
    })
    const done: { [k: string]: string } = {}
    const snap = document.createElement("canvas")
    snap.width = snap.height = 192
    const sctx = snap.getContext("2d")
    const shoot = () => {
      const job = shots.shift()
      if (!job || !sctx) return
      const S = Math.min(320, canvas.width, canvas.height)
      if (S < 96) {
        shots.unshift(job)
        return
      }
      const pose: Pose =
        job.kind === "p"
          ? { el: 6, nod: 36, spin: 0.7 + job.i, size: 0.78, ox: 0, oy: 0.04, pixel: 0, rim: 0.5 }
          : { el: 4, nod: 84, spin: 1.3 + job.i, size: 1.9, ox: 0.18, oy: -0.12, pixel: 0, rim: 0.5 }
      upload(forms[job.i], 1)
      meshKey = ""
      sctx.fillStyle = job.kind === "p" ? "#1b1916" : "#141311"
      sctx.fillRect(0, 0, 192, 192)
      if (gl) {
        const g = gl
        const tx = st.tiltX
        const ty = st.tiltY
        st.tiltX = st.tiltY = 0
        drawMesh(pose, S, S, forms[job.i], 1, () => {
          g.bindFramebuffer(g.FRAMEBUFFER, null)
          g.viewport(0, 0, S, S)
          g.enable(g.SCISSOR_TEST)
          g.scissor(0, 0, S, S)
          g.clear(g.COLOR_BUFFER_BIT | g.DEPTH_BUFFER_BIT)
        })
        st.tiltX = tx
        st.tiltY = ty
        gl.disable(gl.SCISSOR_TEST)
        sctx.drawImage(canvas, 0, canvas.height - S, S, S, 0, 0, 192, 192)
      } else if (ctx2d) {
        const off = document.createElement("canvas")
        off.width = off.height = 192
        const octx = off.getContext("2d")
        if (octx) {
          draw2D(octx, 192, 192, pose)
          sctx.drawImage(off, 0, 0)
        }
      }
      try {
        done[job.i + job.kind] = snap.toDataURL("image/jpeg", 0.88)
      } catch {
        // a tainted or lost canvas just means no thumbnail
      }
      if (!shots.length) setThumbs({ ...done })
    }

    // ---- pointer ------------------------------------------------------------------------
    let drag: { id: number; x: number; y: number; moved: boolean; t: number } | null = null
    const interactive = (t: EventTarget | null) =>
      !!(t as HTMLElement | null)?.closest?.("a,button,input,textarea,select,label,[data-flg-ui]")
    const overFlower = (x: number, y: number) => Math.hypot(x - st.hit.x, y - st.hit.y) < st.hit.r
    const onDown = (e: PointerEvent) => {
      if (interactive(e.target) || st.intro < 1) return
      const r = stage.getBoundingClientRect()
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false, t: performance.now() }
      if (overFlower(e.clientX - r.left, e.clientY - r.top) && e.pointerType === "mouse") stage.style.cursor = "grabbing"
    }
    const onMove = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect()
      const x = e.clientX - r.left
      const y = e.clientY - r.top
      st.px = (x / Math.max(1, r.width)) * 2 - 1
      st.py = (y / Math.max(1, r.height)) * 2 - 1
      if (drag && drag.id === e.pointerId) {
        const dx = e.clientX - drag.x
        if (!drag.moved && Math.abs(dx) > 5 && e.pointerType === "mouse") drag.moved = true
        if (drag.moved) {
          st.user += dx * 0.0085
          st.spinV = dx * 0.5
          drag.x = e.clientX
        }
      } else if (e.pointerType === "mouse" && !interactive(e.target)) {
        stage.style.cursor = st.intro >= 1 && overFlower(x, y) ? "grab" : ""
      }
    }
    const onUp = (e: PointerEvent) => {
      if (!drag || drag.id !== e.pointerId) return
      const r = stage.getBoundingClientRect()
      if (!drag.moved && performance.now() - drag.t < 450 && overFlower(e.clientX - r.left, e.clientY - r.top)) {
        st.rv -= 3.6
        st.spinV += 1.8
      }
      drag = null
      stage.style.cursor = ""
    }
    const onLeave = () => {
      st.px = 0
      st.py = 0
    }
    stage.addEventListener("pointerdown", onDown)
    window.addEventListener("pointermove", onMove, { passive: true })
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
    stage.addEventListener("pointerleave", onLeave)

    // ---- scroll jumps ------------------------------------------------------------------
    jumpRef.current = (i: number) => {
      const n = live.current.N
      const target = i < 0 ? n - 1 : Math.max(0, Math.min(n - 1, i))
      const r = root.getBoundingClientRect()
      const travel = r.height - stage.clientHeight
      const delta = (target / Math.max(1, n - 1)) * travel + r.top
      let el: HTMLElement | null = root.parentElement
      while (el && el !== document.body) {
        const oy = getComputedStyle(el).overflowY
        if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight) break
        el = el.parentElement
      }
      const behavior: ScrollBehavior = live.current.reduced ? "auto" : "smooth"
      if (el && el !== document.body) el.scrollBy({ top: delta, behavior })
      else window.scrollBy({ top: delta, behavior })
    }

    // ---- loop -------------------------------------------------------------------------
    let raf = 0
    let last = performance.now()
    let last0 = last
    let onScreen = true
    const io = new IntersectionObserver((es) => {
      onScreen = es.some((e) => e.isIntersecting)
      if (onScreen) wake()
    })
    io.observe(root)
    const onVis = () => {
      if (!document.hidden) wake()
    }
    document.addEventListener("visibilitychange", onVis)
    const wake = () => {
      if (!raf) {
        last = last0 = performance.now()
        raf = requestAnimationFrame(frame)
      }
    }

    const sceneBg = (kind: SceneKind, P: FlorilegiumPalette) =>
      kind === "specimen" ? [P.night, P.nightInk, P.nightMute] : kind === "footer" ? [P.footer, P.footerInk, P.footerMute] : [P.paper, P.ink, P.mute]

    const frame = (now: number) => {
      raf = 0
      if (!onScreen || document.hidden) return
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
      last = now
      const Lv = live.current
      const n = Lv.N
      const moving = Lv.alive && !Lv.reduced
      st.time += moving ? dt : 0

      // scroll → scene coordinate, lightly smoothed
      const r = root.getBoundingClientRect()
      const target = sceneCoord(progressFrom(r.top, r.height, H), n, 0.34)
      const k = Lv.reduced ? 1 : 1 - Math.exp(-dt * 8)
      const before = st.coord
      st.coord += (target - st.coord) * k
      if (Math.abs(target - st.coord) < 1e-4) st.coord = target
      const c = st.coord

      // intro clock
      const introBefore = st.intro
      const rdt = Math.min(0.25, Math.max(0, (now - last0) / 1000))
      last0 = now
      if (st.intro < 1.3) st.intro = Math.min(1.3, st.intro + rdt / Math.max(0.5, Lv.preloaderDuration))
      if (st.intro >= 1.1 && !st.introSent) {
        st.introSent = true
        setIntroDone(true)
      }
      const I = st.intro

      // pose
      const tall = W / H < 0.85
      const i0 = Math.max(0, Math.min(n - 1, Math.floor(c)))
      const i1 = Math.min(n - 1, i0 + 1)
      const f = c - i0
      const pa = POSES[Lv.kinds[i0]] || POSES.hero
      const pb = POSES[Lv.kinds[i1]] || POSES.hero
      let pose = mixPose(tall ? pa.tall : pa.wide, tall ? pb.tall : pb.wide, f)
      pose.spin += c * 0.55
      if (I < 1.3) {
        const ip = tall ? INTRO_TALL : INTRO_WIDE
        const intro = { ...ip, spin: ip.spin + I * 0.9, nod: lerp(ip.nod, 30, sm(0.25, 0.85, I)), oy: ip.oy + lerp(-0.14, 0, sm(0, 0.6, I)) }
        pose = mixPose(intro, pose, easeInOut(cl((I - 0.8) / 0.26)))
      }
      // pointer tilt + drag inertia + idle turn
      st.tiltX += ((moving ? st.py * 5 : 0) - st.tiltX) * Math.min(1, dt * 3)
      st.tiltY += ((moving ? -st.px * 3 : 0) - st.tiltY) * Math.min(1, dt * 3)
      if (!drag) {
        st.user += st.spinV * dt * 0.02
        st.spinV *= Math.exp(-dt * 2.4)
      }
      if (moving) st.user += dt * 0.06
      pose.spin += st.user
      // tap: the petals close a little and spring back open
      const acc = -70 * st.rx - 9 * st.rv
      st.rv += acc * dt
      st.rx += st.rv * dt
      if (Math.abs(st.rx) < 1e-4 && Math.abs(st.rv) < 1e-3) st.rx = st.rv = 0
      const bloomIntro = I >= 1 ? 1 : easeInOut(cl((I - 0.06) / 0.78))
      const bloom = cl(bloomIntro + Math.min(0, st.rx) * 1.2)

      // thumbnails share the buffer, so they go first and force a rebuild
      if (shots.length && I > 0.05) shoot()
      // morph only when it changes
      const key = i0 + "|" + f.toFixed(3) + "|" + bloom.toFixed(3)
      if (key !== meshKey) {
        cur = mixForm(forms[i0], forms[i1], f)
        upload(cur, bloom)
        meshKey = key
      }
      st.pose = pose
      st.hit = {
        x: (pose.ox * 0.5 + 0.5) * W,
        y: (1 - (pose.oy * 0.5 + 0.5)) * H,
        r: pose.size * Math.min(W, H) * 0.5 * 1.05,
      }

      // colours
      const P = Lv.pal
      const ka = sceneBg(Lv.kinds[i0], P)
      const kb = sceneBg(Lv.kinds[i1], P)
      const cf = sm(0.3, 0.7, f)
      const bg = cssRgb(mix3(rgbOf(ka[0]), rgbOf(kb[0]), cf))
      if (bg !== st.lastBg) {
        st.lastBg = bg
        stage.style.backgroundColor = bg
        stage.style.setProperty("--flg-bg", bg)
        stage.style.setProperty("--flg-ink", cssRgb(mix3(rgbOf(ka[1]), rgbOf(kb[1]), cf)))
        stage.style.setProperty("--flg-mute", cssRgb(mix3(rgbOf(ka[2]), rgbOf(kb[2]), cf)))
      }
      const night = cl((Lv.kinds[i0] === "specimen" ? 1 - cf : 0) + (Lv.kinds[i1] === "specimen" ? cf : 0))

      render(pose, cur, night)
      canvas.style.opacity = String(sm(0, 0.12, I))

      // overlay
      const changed = dirty || Math.abs(c - before) > 1e-5 || I !== introBefore
      if (changed) {
        dirty = false
        for (const nd of nodes) {
          const gate = I >= 1.3 ? 1 : sm(0.86 + nd.d * 0.14, 1 + nd.d * 0.14, I)
          let p = span(c, nd.a, nd.b, nd.d) * gate
          if (p < 0.002) p = 0
          if (Math.abs(p - nd.last) < 0.001) continue
          nd.last = p
          const s = nd.el.style
          s.visibility = p > 0 ? "visible" : "hidden"
          const dir = c < nd.a ? 1 : c > nd.b ? -1 : 0
          if (nd.mode === "mask") {
            s.opacity = p > 0 ? "1" : "0"
            const inner = nd.el.firstElementChild as HTMLElement | null
            if (inner) inner.style.transform = "translate3d(0," + ((1 - p) * dir * 108).toFixed(2) + "%,0)"
          } else if (nd.mode === "draw") {
            const leaving = c > nd.b
            s.opacity = leaving ? p.toFixed(3) : "1"
            s.setProperty("--p", leaving ? "1" : p.toFixed(3))
          } else if (nd.mode === "fade") {
            s.opacity = p.toFixed(3)
          } else {
            s.opacity = p.toFixed(3)
            s.translate = "0 " + ((1 - p) * dir * 26).toFixed(2) + "px"
          }
        }
        // preloader
        const pre = 1 - sm(0.78, 0.92, I)
        for (const el of preEls) {
          el.style.opacity = pre.toFixed(3)
          el.style.visibility = pre > 0.002 ? "visible" : "hidden"
        }
        const pct = Math.round(100 * easeInOut(cl(I / 0.86)))
        if (countEl) countEl.textContent = String(pct).padStart(3, "0")
        if (barEl) barEl.style.transform = "scaleX(" + (pct / 100).toFixed(3) + ")"
        if (ringEl) ringEl.style.setProperty("--p", (pct / 100).toFixed(3))
      }
      const sc = Math.round(c)
      if (sc !== st.lastScene) {
        st.lastScene = sc
        sceneRef.current = sc
        setScene(sc)
      }
    }
    wake()

    return () => {
      cancelAnimationFrame(raf)
      raf = 0
      io.disconnect()
      ro.disconnect()
      mo.disconnect()
      document.removeEventListener("visibilitychange", onVis)
      stage.removeEventListener("pointerdown", onDown)
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
      stage.removeEventListener("pointerleave", onLeave)
      canvas.removeEventListener("webglcontextlost", onLost)
      canvas.removeEventListener("webglcontextrestored", onRestored)
      const g = gl as WebGLRenderingContext | null
      if (g) {
        g.deleteBuffer(vbo)
        g.deleteBuffer(ibo)
        g.deleteBuffer(quad)
        if (fbo) g.deleteFramebuffer(fbo)
        if (ftex) g.deleteTexture(ftex)
        if (fdepth) g.deleteRenderbuffer(fdepth)
        g.deleteProgram(prog)
        g.deleteProgram(blit)
        if (shadowProg) g.deleteProgram(shadowProg)
        if (sfbo) g.deleteFramebuffer(sfbo)
        if (stex) g.deleteTexture(stex)
        if (sdepth) g.deleteRenderbuffer(sdepth)
      }
    }
    // species are the only thing the GL side cannot pick up live
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speciesKey])

  // leave the detail drawer behind when the specimen leaves
  React.useEffect(() => {
    if (scene < S_SPEC || scene >= S_FOOT) setDetail(false)
  }, [scene, S_SPEC, S_FOOT])

  React.useEffect(() => {
    if (!detail) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDetail(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [detail])

  const jump = (i: number) => jumpRef.current(i)
  const hits = query.trim()
    ? species
        .map((s, i) => ({ s, i }))
        .filter(({ s }) => (s.name + " " + s.latin + " " + s.family).toLowerCase().includes(query.trim().toLowerCase()))
        .slice(0, 5)
    : []
  const specIdx = Math.max(0, Math.min(specs.length - 1, scene - S_SPEC))
  const active = specs[specIdx]
  const bloomIdx = Math.max(0, Math.min(blooms.length - 1, scene - S_FOOT))
  const subscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setSent(-1)
      return
    }
    onSubscribe?.(email.trim())
    setSent(1)
  }
  const navScene = (l: FlorilegiumLink) => (l.scene === -1 ? N - 1 : l.scene ?? 0)
  const navCurrent = (l: FlorilegiumLink) => {
    const s = navScene(l)
    if (s >= S_FOOT || l.scene === -1) return scene >= S_FOOT
    if (s >= S_SPEC) return scene >= S_SPEC && scene < S_FOOT
    if (s >= 1) return scene >= 1 && scene < S_SPEC
    return scene === 0
  }
  const stageStyle = {
    height,
    "--flg-sans": sans,
    "--flg-serif": serif,
    "--flg-geo": geo,
    "--flg-ink": pal.ink,
    "--flg-mute": pal.mute,
    "--flg-panel": pal.panel,
    "--flg-accent": pal.accent,
    "--flg-bg": pal.paper,
    backgroundColor: pal.paper,
  } as React.CSSProperties

  return (
    <section
      ref={rootRef}
      className={"flg-root " + (dark ? "flg-dark " : "") + className}
      style={{ height: "calc(" + height + " * " + (1 + (N - 1) * sceneScroll).toFixed(3) + ")" }}
      aria-label={brand + " — botanical journal"}
    >
      <style>{CSS}</style>
      <div ref={stageRef} className="flg-stage" style={stageStyle}>
        {/* ---------- behind the flower ---------- */}
        <div className="flg-back" aria-hidden>
          <div {...fx(1, 2, 0.1, "fade")} className="flg-fx flg-a flg-panel" />
          <div {...fx(1, 2, 0)} className="flg-fx flg-a flg-word">
            <span ref={wordRef}>{ant.word}</span>
          </div>
        </div>

        <canvas ref={canvasRef} className="flg-canvas" aria-hidden />

        {/* ---------- in front ---------- */}
        <div className="flg-front">
          {/* header */}
          <header {...fx(0, N - 1, 0)} className="flg-fx flg-a flg-head">
            <button className="flg-logo" onClick={() => jump(0)} aria-label={brand + ", back to top"}>
              <Mark />
              <span>{brand}</span>
            </button>
            <div className="flg-search" role="search">
              <button className="flg-round" aria-label="Search" onClick={() => setSearchOpen(true)}>
                <Icon name="search" />
              </button>
              <input
                value={query}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => window.setTimeout(() => setSearchOpen(false), 160)}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && hits[0]) {
                    jump(hits[0].i)
                    setQuery("")
                    ;(e.target as HTMLInputElement).blur()
                  }
                  if (e.key === "Escape") setQuery("")
                }}
              />
              {searchOpen && hits.length > 0 && (
                <div className="flg-hits">
                  {hits.map(({ s, i }, k) => (
                    <button key={i} data-on={k === 0 ? "" : undefined} onMouseDown={(e) => e.preventDefault()} onClick={() => { jump(i); setQuery("") }}>
                      <span>{s.name}</span>
                      <span className="flg-mute">{s.latin}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <nav className="flg-nav" aria-label="Sections">
              {nav.map((l) =>
                l.href ? (
                  <a key={l.label} href={l.href}>{l.label}</a>
                ) : (
                  <button key={l.label} aria-current={navCurrent(l) ? "true" : undefined} onClick={() => jump(navScene(l))}>
                    {l.label}
                  </button>
                ),
              )}
            </nav>
          </header>

          {/* prev / next — every scene */}
          <div {...fx(0, N - 1, 0.2)} className="flg-fx flg-a flg-arrows">
            <button className="flg-round" aria-label="Previous section" onClick={() => jump(scene - 1)} disabled={scene <= 0}>
              <Icon name="up" />
            </button>
            <button className="flg-round" aria-label="Next section" onClick={() => jump(scene + 1)} disabled={scene >= N - 1}>
              <Icon name="down" />
            </button>
          </div>

          {/* ---------- 0 · hero ---------- */}
          <div {...fx(0, 0, 0.1)} className="flg-fx flg-a flg-crumb flg-mute" aria-hidden>
            <span>{hero.breadcrumb[0]}</span>
            <span>»</span>
            <span style={{ color: "var(--flg-ink)" }}>{hero.breadcrumb[1]}</span>
          </div>
          <div className="flg-a flg-hero">
            <div {...fx(0, 0, 0.15)} className="flg-fx flg-chip">
              <Mark size={22} /> {hero.category}
            </div>
            <h1 className="flg-h1">
              <span {...fx(0, 0, 0.25, "mask")} className="flg-fx flg-mask"><span>{hero.title}</span></span>
              <span {...fx(0, 0, 0.35, "mask")} className="flg-fx flg-mask">
                <span>{hero.highlight} <em>{hero.season}</em></span>
              </span>
            </h1>
            <div {...fx(0, 0, 0.45)} className="flg-fx flg-meta">
              {hero.cta.href ? (
                <a className="flg-cta" href={hero.cta.href}><Icon name="arrow" /> {hero.cta.label}</a>
              ) : (
                <button className="flg-cta" onClick={() => jump(S_SPEC)}><Icon name="arrow" /> {hero.cta.label}</button>
              )}
              <span><Icon name="calendar" /> {hero.date}</span>
              <span><Icon name="eye" /> {hero.views}</span>
            </div>
          </div>
          <div {...fx(0, 0, 0.55)} className="flg-fx flg-a flg-thread">
            <h3><Icon name="calendar" /> {hero.threadTitle}</h3>
            <div className="flg-items">
              {hero.thread.map((t, k) => (
                <button key={k} className="flg-item" onClick={() => jump(t.to)}>
                  {thumbs[t.to + "p"] ? <img src={thumbs[t.to + "p"]} alt="" width={52} height={52} /> : <i className="flg-tile" />}
                  <span>{t.title}</span>
                </button>
              ))}
            </div>
          </div>
          <div {...fx(0, 0, 0.6)} className="flg-fx flg-a flg-pips" aria-hidden>
            <i /><i /><i />
          </div>
          <div {...fx(0, 0, 0.3)} className="flg-fx flg-a flg-social">
            {socials.map((s) => (
              <a key={s.label} className="flg-round" href={s.href} aria-label={s.label} target="_blank" rel="noreferrer">
                <Icon name={s.icon} />
              </a>
            ))}
          </div>
          <div {...fx(0, 0, 0.7)} className="flg-fx flg-a flg-hint flg-mute" aria-hidden>
            {hero.hint}
          </div>

          {/* ---------- 1–2 · anthesis + pixelated ---------- */}
          <p {...fx(1, 1, 0.3)} className="flg-fx flg-a flg-cap flg-cap-l">{ant.left}</p>
          <p {...fx(1, 1, 0.4)} className="flg-fx flg-a flg-cap flg-cap-r">{ant.right}</p>
          <p {...fx(2, 2, 0.3)} className="flg-fx flg-a flg-cap flg-cap-l">{ant.pixelLeft}</p>
          <p {...fx(2, 2, 0.4)} className="flg-fx flg-a flg-cap flg-cap-r">{ant.pixelRight}</p>
          <div {...fx(1, 1, 0.5)} className="flg-fx flg-a flg-tag flg-caps flg-mute" aria-hidden>
            {ant.species.latin}
          </div>
          <div {...fx(2, 2, 0.5)} className="flg-fx flg-a flg-tag flg-caps flg-mute" aria-hidden>
            {ant.pixelSpecies.latin} — {pixelBlock}px
          </div>
          <div {...fx(1, 2, 0.45)} className="flg-fx flg-a flg-words">
            {ant.words.slice(0, 5).map((w, k) => (
              <span key={w} data-on={(scene === 1 && k === 1) || (scene === 2 && k === 3) ? "" : undefined}>{w}</span>
            ))}
          </div>

          {/* ---------- specimens ---------- */}
          {specs.map((s, k) => {
            const at = S_SPEC + k
            return (
              <React.Fragment key={s.name + k}>
                <div className="flg-a flg-spec-l">
                  <div {...fx(at, at, 0.1)} className="flg-fx flg-family"><i /> {s.family}</div>
                  <h2 {...fx(at, at, 0.2, "mask")} className="flg-fx flg-mask flg-name"><span>{s.name}</span></h2>
                  <div {...fx(at, at, 0.3)} className="flg-fx flg-latin">{s.latin}</div>
                  <p {...fx(at, at, 0.4)} className="flg-fx flg-body">{s.blurb}</p>
                  <div {...fx(at, at, 0.5)} className="flg-fx flg-facts">
                    <div><b>Origin</b><span className="flg-mute">{s.origin}</span></div>
                    <div><b>Family</b><span className="flg-mute">{s.family}</span></div>
                  </div>
                </div>
                <div className="flg-a flg-spec-r">
                  <div {...fx(at, at, 0.25)} className="flg-fx flg-thumbs">
                    <button aria-label={"Turn the " + s.name} onClick={() => setDetail(true)}>
                      {thumbs[at + "p"] ? <img src={thumbs[at + "p"]} alt={s.name + ", side view"} /> : <i />}
                    </button>
                    <button aria-label={"Look into the " + s.name} onClick={() => setDetail(true)}>
                      {thumbs[at + "c"] ? <img src={thumbs[at + "c"]} alt={s.name + ", seen from above"} /> : <i />}
                    </button>
                  </div>
                  {s.note && (
                    <div {...fx(at, at, 0.35)} className="flg-fx flg-note">
                      <h3>{s.note.title}</h3>
                      <p className="flg-body">{s.note.text}</p>
                      <div className="flg-credit">{s.note.credit}</div>
                    </div>
                  )}
                  <div {...fx(at, at, 0.45)} className="flg-fx">
                    <button className="flg-btn" onClick={() => setDetail(true)} aria-expanded={detail && specIdx === k}>
                      View detail
                    </button>
                  </div>
                </div>
              </React.Fragment>
            )
          })}
          <div {...fx(S_SPEC, S_FOOT - 1, 0.3)} className="flg-fx flg-a flg-dots" role="tablist" aria-label="Specimens">
            {specs.map((s, k) => (
              <button
                key={k}
                className="flg-dot"
                role="tab"
                aria-label={s.name}
                aria-selected={specIdx === k}
                aria-current={scene === S_SPEC + k ? "true" : undefined}
                onClick={() => jump(S_SPEC + k)}
              >
                <i />
              </button>
            ))}
            <span className="flg-small flg-mute" style={{ marginLeft: 8 }}>
              {String(specIdx + 1).padStart(2, "0")} / {String(specs.length).padStart(2, "0")}
            </span>
          </div>
          <div {...fx(S_SPEC, S_FOOT - 1, 0.4)} className="flg-fx flg-a flg-share">
            <span>Share on</span>
            {socials.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noreferrer">{s.icon === "instagram" ? "Ig" : s.icon === "pinterest" ? "Pi" : s.label.slice(0, 2)}</a>
            ))}
          </div>
          <aside className="flg-drawer" data-open={detail ? "" : undefined} aria-hidden={!detail} data-flg-ui>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="flg-caps" style={{ color: "#9a958d" }}>{active?.family}</span>
              <button className="flg-round" style={{ boxShadow: "0 0 0 1px rgba(239,235,228,.2)" }} onClick={() => setDetail(false)} aria-label="Close detail" tabIndex={detail ? 0 : -1}>
                <Icon name="close" />
              </button>
            </div>
            <div>
              <div style={{ fontFamily: serif, fontWeight: 300, fontSize: "clamp(40px, 4.2cqw, 72px)", lineHeight: 1 }}>{active?.name}</div>
              <div style={{ fontFamily: serif, fontStyle: "italic", color: "#9a958d", marginTop: 8 }}>{active?.latin}</div>
            </div>
            {thumbs[S_SPEC + specIdx + "c"] && (
              <img src={thumbs[S_SPEC + specIdx + "c"]} alt="" style={{ width: "100%", aspectRatio: "1.6", objectFit: "cover", maxWidth: "none", display: "block" }} />
            )}
            <p className="flg-body" style={{ color: "#b9b4ab" }}>{active?.blurb}</p>
            {active?.care && (
              <dl>
                <dt>Light</dt><dd>{active.care.light}</dd>
                <dt>Water</dt><dd>{active.care.water}</dd>
                <dt>Season</dt><dd>{active.care.season}</dd>
                <dt>Vase life</dt><dd>{active.care.vase}</dd>
              </dl>
            )}
          </aside>

          {/* ---------- footer ---------- */}
          <p {...fx(S_FOOT, N - 1, 0.1)} className="flg-fx flg-a flg-fp flg-fp-l">{foot.paragraphs[0]}</p>
          <p {...fx(S_FOOT, N - 1, 0.2)} className="flg-fx flg-a flg-fp flg-fp-r">{foot.paragraphs[1]}</p>
          <div {...fx(S_FOOT, N - 1, 0.3)} className="flg-fx flg-a flg-news">
            <div className="flg-small flg-mute">{foot.newsletter.title}</div>
            {sent === 1 ? (
              <div style={{ padding: "8px 0", marginTop: 12, fontWeight: 600 }} role="status">{foot.newsletter.done}</div>
            ) : (
              <form onSubmit={subscribe} noValidate>
                <input
                  type="email"
                  value={email}
                  placeholder={foot.newsletter.placeholder}
                  aria-label="Email"
                  aria-invalid={sent === -1}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (sent === -1) setSent(0)
                  }}
                />
                <button type="submit">{foot.newsletter.button} <Icon name="arrow" /></button>
              </form>
            )}
            {sent === -1 && <div className="flg-small" style={{ marginTop: 8, color: "#b0302a" }} role="alert">That address looks unfinished.</div>}
          </div>
          <div {...fx(S_FOOT, N - 1, 0.35)} className="flg-fx flg-a flg-pager flg-mute">
            <b>{String(bloomIdx + 1).padStart(2, "0")}</b> / {String(blooms.length).padStart(2, "0")}
            <span style={{ fontFamily: serif, fontStyle: "italic", fontSize: "1.25em" }}>{blooms[bloomIdx]?.species.latin}</span>
            <button className="flg-round" aria-label="Next bloom" onClick={() => jump(scene >= N - 1 ? S_FOOT : scene + 1)}>
              <Icon name={scene >= N - 1 ? "up" : "down"} />
            </button>
          </div>
          {blooms.map((b, k) => {
            const at = S_FOOT + k
            return (
              <React.Fragment key={b.word + k}>
                <Scribble {...fx(at, at, 0.15, "draw")} text={b.word} x={50} y={68} size={9.6} rotate={-5} weight={0.14} crayon seed={k + 3} uid={uid + "w" + k} />
                {b.notes.map((nt, j) => (
                  <React.Fragment key={j}>
                    <Scribble {...fx(at, at, 0.4 + j * 0.12, "draw")} data-note={String(j)} text={nt.text} x={nt.x} y={nt.y} size={nt.size ?? 1.8} rotate={nt.rotate ?? 0} weight={0.07} seed={k * 9 + j} />
                    {nt.arrow && (
                      <Scribble {...fx(at, at, 0.5 + j * 0.12, "draw")} data-mark="" mark={nt.arrow.shape || "curve"} x={nt.arrow.x} y={nt.arrow.y} size={nt.arrow.scale ?? 4} rotate={nt.arrow.rotate ?? 0} weight={0.035} seed={k * 5 + j} anchor="start" />
                    )}
                  </React.Fragment>
                ))}
              </React.Fragment>
            )
          })}
          <div {...fx(S_FOOT, N - 1, 0.5)} className="flg-fx flg-a flg-fbar">
            <div>
              <HandLine text={foot.signature[0]} size={1.5} />
              <nav className="flg-flinks" aria-label="Footer">
                {foot.links.map((l) =>
                  l.href ? (
                    <a key={l.label} href={l.href} target="_blank" rel="noreferrer">{l.label}</a>
                  ) : (
                    <button key={l.label} onClick={() => jump(l.scene ?? 0)}>{l.label}</button>
                  ),
                )}
              </nav>
            </div>
            <div>
              <span className="flg-flinks"><span>{foot.copyright}</span></span>
              <HandLine text={foot.signature[1]} size={1.5} />
            </div>
          </div>
        </div>

        {/* ---------- preloader ---------- */}
        {preloader && !introDone && (
          <div className="flg-front flg-pre-ui" aria-live="polite">
            <div data-flg-pre className="flg-pre-brand"><Mark /> {brand}</div>
            <button data-flg-pre className="flg-skip" onClick={() => skipRef.current()}>Skip intro</button>
            <svg data-flg-pre data-flg-ring className="flg-ring" width="46cqmin" height="46cqmin" viewBox="0 0 100 100" aria-hidden style={{ width: "46cqmin", height: "46cqmin" }}>
              <circle cx="50" cy="50" r="49" fill="none" stroke="var(--flg-ink)" strokeOpacity="0.14" strokeWidth="0.25" />
              <circle cx="50" cy="50" r="49" fill="none" stroke="var(--flg-ink)" strokeWidth="0.35" pathLength={1} strokeDasharray="1 1" style={{ strokeDashoffset: "calc(1 - var(--p, 0))" }} transform="rotate(-90 50 50)" />
            </svg>
            <div data-flg-pre className="flg-pre-cap">
              <span className="flg-caps flg-mute">Germinating</span>
              <i>{hero.species.latin}</i>
            </div>
            <div data-flg-pre className="flg-count" data-flg-count aria-hidden>000</div>
            <div data-flg-pre className="flg-pre-bar" aria-hidden><i data-flg-bar /></div>
          </div>
        )}

        {/* print grain over everything, the flower included */}
        <svg className="flg-grain" aria-hidden>
          <filter id={"flg-grain-" + uid}>
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.48  0 0 0 0 0.45  0 0 0 0.09 0" />
          </filter>
          <rect width="100%" height="100%" filter={"url(#flg-grain-" + uid + ")"} />
        </svg>
      </div>
    </section>
  )
}

// ---- small parts ------------------------------------------------------------------------

/** A stroked line of handwriting (or a hand-drawn mark), positioned in % of the stage. */
function Scribble({
  text,
  mark,
  x,
  y,
  size,
  rotate = 0,
  weight = 0.07,
  crayon = false,
  seed = 1,
  uid = "",
  anchor = "center",
  ...rest
}: {
  text?: string
  mark?: string
  x: number
  y: number
  /** cap height in cqw */
  size: number
  rotate?: number
  weight?: number
  crayon?: boolean
  seed?: number
  uid?: string
  anchor?: "center" | "start"
  [k: string]: unknown
}) {
  const lay = text ? layoutHand(text, seed) : null
  const paths = lay
    ? lay.placed
    : [{ d: MARKS[mark || "curve"] || MARKS.curve, x: 0, y: 0, r: 0, s: 1 }]
  const pad = 0.3
  const w = lay ? lay.width : 1.35
  const h = lay ? lay.height + 0.4 : 1
  const top = lay ? 1 : 0.8
  const vb = [-pad, -top - pad, w + pad * 2, h + pad * 2]
  const fid = "flg-cr-" + uid
  const pos: React.CSSProperties =
    anchor === "start"
      ? { left: x + "%", top: y + "%", width: "calc(var(--flg-hs, 1) * " + (vb[2] * size).toFixed(3) + "cqw)", transformOrigin: (pad / vb[2]) * 100 + "% " + ((top + pad) / vb[3]) * 100 + "%", transform: "translate(" + -(pad / vb[2]) * 100 + "%, " + -((top + pad) / vb[3]) * 100 + "%) rotate(" + rotate + "deg)" }
      : { left: x + "%", top: y + "%", width: "calc(var(--flg-hs, 1) * " + (vb[2] * size).toFixed(3) + "cqw)", transform: "translate(-50%, -50%) rotate(" + rotate + "deg)" }
  return (
    <svg
      {...(rest as { [k: string]: string })}
      className={"flg-fx flg-scrib"}
      viewBox={vb.join(" ")}
      style={{ ...pos, "--n": paths.length } as React.CSSProperties}
      aria-label={text}
      role={text ? "img" : undefined}
      aria-hidden={text ? undefined : true}
    >
      {crayon && (
        <filter id={fid} x="-10%" y="-30%" width="120%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="9" numOctaves="2" seed={seed} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="0.03" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feTurbulence type="fractalNoise" baseFrequency="34" numOctaves="2" seed={seed + 7} result="g" />
          <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -3.4 0 0 0 2.75" result="ga" />
          <feComposite in="d" in2="ga" operator="in" />
        </filter>
      )}
      <g filter={crayon ? "url(#" + fid + ")" : undefined} strokeWidth={weight}>
        {paths.map((p, i) => (
          <g key={i} transform={"translate(" + p.x.toFixed(3) + " " + (-p.y).toFixed(3) + ") rotate(" + p.r.toFixed(2) + ") scale(" + p.s.toFixed(3) + " " + (-p.s).toFixed(3) + ")"}>
            <path d={p.d} pathLength={1} style={{ "--i": i } as React.CSSProperties} />
          </g>
        ))}
      </g>
    </svg>
  )
}

/** A static line of handwriting that sits in normal flow. */
function HandLine({ text, size }: { text: string; size: number }) {
  const lay = layoutHand(text, 11)
  return (
    <svg viewBox={"-0.2 -1.15 " + (lay.width + 0.4) + " 1.6"} style={{ width: (lay.width + 0.4) * size + "cqw", minWidth: (lay.width + 0.4) * 14 + "px", overflow: "visible", flex: "none" }} role="img" aria-label={text}>
      <g fill="none" stroke="currentColor" strokeWidth={0.06} strokeLinecap="round" strokeLinejoin="round">
        {lay.placed.map((p, i) => (
          <path key={i} d={p.d} transform={"translate(" + p.x.toFixed(3) + " " + (-p.y).toFixed(3) + ") rotate(" + p.r.toFixed(2) + ") scale(" + p.s.toFixed(3) + " " + (-p.s).toFixed(3) + ")"} />
        ))}
      </g>
    </svg>
  )
}

/** The brand mark: a black disc with a five-dot bloom punched out of it. */
function Mark({ size = 30 }: { size?: number }) {
  const dots = [0, 1, 2, 3, 4].map((i) => {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2
    return [15 + Math.cos(a) * 5.6, 15 + Math.sin(a) * 5.6]
  })
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden style={{ flex: "none" }}>
      <circle cx="15" cy="15" r="15" fill="var(--flg-ink)" />
      {dots.map((d, i) => (
        <circle key={i} cx={d[0]} cy={d[1]} r="2.6" fill="var(--flg-bg)" />
      ))}
      <circle cx="15" cy="15" r="1.7" fill="var(--flg-bg)" />
    </svg>
  )
}

function Icon({ name }: { name: string }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
  const body: { [k: string]: React.ReactNode } = {
    search: <><circle cx="7" cy="7" r="4.5" {...p} /><path d="M10.5 10.5 14 14" {...p} /></>,
    arrow: <path d="M2 8h11M9 4l4 4-4 4" {...p} />,
    up: <path d="M4.5 9.5 8 6l3.5 3.5" {...p} />,
    down: <path d="M4.5 6.5 8 10l3.5-3.5" {...p} />,
    calendar: <><rect x="2.5" y="3.5" width="11" height="10" rx="1.5" {...p} /><path d="M2.5 7h11M5.5 2v3M10.5 2v3" {...p} /></>,
    eye: <><path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z" {...p} /><circle cx="8" cy="8" r="2" {...p} /></>,
    close: <path d="M4 4l8 8M12 4l-8 8" {...p} />,
    instagram: <><rect x="2.5" y="2.5" width="11" height="11" rx="3.2" {...p} /><circle cx="8" cy="8" r="2.6" {...p} /><circle cx="11.4" cy="4.7" r="0.5" fill="currentColor" /></>,
    pinterest: <><circle cx="8" cy="8" r="6" {...p} /><path d="M7.2 13.6 8.6 7.2M6.4 9.6C5.5 7 7 5 8.8 5.2c1.9.2 2.4 2.2 1.6 3.7-.6 1.1-1.8 1.2-2.4.6" {...p} /></>,
    x: <><path d="M3 2.8h2.8l7.2 10.4h-2.8Z" {...p} strokeWidth={1.1} /><path d="M12.6 2.8 8.9 7M7.1 9 3.4 13.2" {...p} /></>,
  }
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden style={{ flex: "none", display: "block" }}>
      {body[name] || body.arrow}
    </svg>
  )
}

// Declared after the JSX: the 21st CLI tokenizer hangs on generics before it.
export type HeroInput = Partial<HeroCopy>
export type AnthesisInput = Partial<AnthesisCopy>
export type FooterInput = Partial<FooterCopy>
export type PaletteInput = Partial<FlorilegiumPalette>
