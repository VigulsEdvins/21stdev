"use client"

// Pixel Park Template — a complete company site for a small New York studio,
// told in pixel art: a moonlit park meadow under a floating glass nav, a
// mission card, a manifesto, a signed letter with a postage stamp, a careers
// card over a skyline-and-lake view, contact details, a closing line, a footer
// and a snowy park at the very bottom.
//
// It is interactive throughout: the hero follows the pointer in parallax and
// its fireflies gather where you point (click to release more); the live
// clock in the corner is a button that walks the park through dawn, day, dusk
// and night; the letter signs itself as it scrolls in; the stamp can be
// postmarked with today's date; the careers card has birds you can scatter;
// the email copies itself; the footer snow drifts away from the pointer; and
// the subscribe form validates itself.
//
// Every picture is drawn in this file. The scenes are painted pixel by pixel
// from a seeded PRNG into small rasters (dithered with a Bayer matrix, foliage
// built from shaded leaf clusters, hand-drawn sprites for people, benches,
// lamps and the statue) and scaled up with crisp pixels. Nothing loads: no
// fonts, images or stylesheets, so it renders inside a sandboxed capture.
import * as React from "react"

/* ------------------------------------------------------------------ types */

export type ParkLink = { label: string; href: string }
export type ParkScene = "night" | "dawn" | "day" | "dusk"
export type ParkPerson = { name: string; href?: string }
export type ParkMission = {
  title?: string
  /** "January 2025" — shown in bold in the sentence under the title. */
  founded?: string
  founders?: ParkPerson[]
  /** Ends the sentence: "… by A and B {tail}". */
  tail?: string
  backedBy?: string
}
export type ParkManifesto = { kicker?: string; title?: string }
export type ParkLetter = {
  paragraphs?: string[]
  signoff?: string
  /** Each gets a signature drawn from its name. */
  signers?: string[]
  /** Printed small on the stamp. */
  stampValue?: string
}
export type ParkCareers = { title?: string; body?: string; action?: ParkLink }
export type ParkDetail = {
  label: string
  value: string
  href?: string
  /** "email" adds a copy button; "download" an arrow chip. */
  kind?: "text" | "email" | "download"
}
export type ParkClosing = { title?: string; body?: string; action?: ParkLink }
export type ParkSocial = { kind: "x" | "linkedin" | "github" | "instagram"; href: string; label?: string }

export type PixelParkTemplateProps = {
  /** The headline over the park. */
  brand?: string
  city?: string
  /** Shown beside the clock. */
  cityCode?: string
  /** IANA zone for the clock and for scene="auto". */
  timeZone?: string
  /** Replaces the sunrise mark in the nav and above the closing line. */
  logo?: React.ReactNode
  nav?: ParkLink[]
  cta?: ParkLink
  mission?: ParkMission
  manifesto?: ParkManifesto
  letter?: ParkLetter
  careers?: ParkCareers
  details?: ParkDetail[]
  closing?: ParkClosing
  footerLinks?: ParkLink[]
  socials?: ParkSocial[]
  subscribePlaceholder?: string
  /** Called with the address when the footer form is sent. Awaited; a throw shows an error. */
  onSubscribe?: (email: string) => unknown
  copyright?: string
  credit?: string
  /** Time of day in the park. "auto" follows the clock in `timeZone`. */
  scene?: ParkScene | "auto"
  /** Re-plants the trees, flowers and people. */
  seed?: number
  /** "auto" follows a `.dark` class on an ancestor. */
  theme?: "auto" | "light" | "dark"
  /** Fade-and-rise on load. */
  animateIn?: boolean
  /** Minimum height of the hero. A definite length, so it survives any host layout. */
  height?: string
  className?: string
}

/* ------------------------------------------------------------------ logic */

// #region logic
type RGB = number[]
type Raster = { w: number; h: number; d: Uint8ClampedArray }
type Leaf = { x: number; y: number; r: number; lift: number }
type SpriteMap = { [k: string]: string }
type ScenePalette = {
  sky: string[]
  far: string[]
  lawn: string[]
  flowers: string[]
  trees: string[]
  path: string[]
  wood: string[]
  tint: string
  dim: number
  stars: boolean
  glow: number
  flies: "fireflies" | "petals"
}

const SCENES = ["night", "dawn", "day", "dusk"]

const PARK = {
  night: {
    sky: ["#030817", "#071233", "#0d1f4a", "#16305f"],
    far: ["#06122a", "#0b1d3d", "#123052", "#1b4466"],
    lawn: ["#0a1d2e", "#0f2a3d", "#15384b", "#1c4858", "#245866", "#2e6a73", "#3b7d80", "#4d918d"],
    flowers: ["#4b72c4", "#6c93e2", "#97b8f7", "#c3d6ff", "#eef4ff"],
    trees: ["#02060f", "#050c1c", "#0a172c", "#10233c", "#17334a", "#21465a", "#2f5d6a", "#447a7f"],
    path: ["#3c5266", "#566f84", "#7891a3", "#9db3c1", "#c3d2db"],
    wood: ["#2a120d", "#5a2a1b", "#8c4329"],
    tint: "#0a1838",
    dim: 0.32,
    stars: true,
    glow: 1,
    flies: "fireflies",
  },
  dawn: {
    sky: ["#1f2350", "#4f3f78", "#9a6a92", "#e8a09a"],
    far: ["#1d1f40", "#2b2b52", "#3d3a64", "#544c78"],
    lawn: ["#17202f", "#1f2c3c", "#293947", "#344753", "#43575f", "#556a6d", "#6b807c", "#87978e"],
    flowers: ["#a771a8", "#c992c2", "#e6b6d6", "#f8d8e6", "#fff4f7"],
    trees: ["#0b0d1e", "#12152b", "#1b203b", "#262c4d", "#343a60", "#474b72", "#605e86"],
    path: ["#5c566f", "#787089", "#988fa6", "#b9aec2", "#dacfdc"],
    wood: ["#2a1a1e", "#5a3436", "#8a5048"],
    tint: "#3a2f5a",
    dim: 0.18,
    stars: true,
    glow: 0.7,
    flies: "fireflies",
  },
  day: {
    sky: ["#5d97df", "#7fb0e9", "#a6caf1", "#cfe2f7"],
    far: ["#3f6e4b", "#4f8259", "#64966a", "#7eab7f"],
    lawn: ["#24502a", "#2d6031", "#377039", "#438244", "#539551", "#66a85f", "#7fbb70", "#9dce88"],
    flowers: ["#e8d35a", "#f4e58c", "#ffffff", "#f6b9d0", "#cfe4ff"],
    trees: ["#0f2a19", "#163a21", "#1f4d2b", "#2b6435", "#3b7c40", "#529750", "#70b261"],
    path: ["#8c8473", "#a69e8b", "#bfb7a3", "#d5cebc", "#e9e3d4"],
    wood: ["#4a2616", "#7d4126", "#b0643a"],
    tint: "#ffffff",
    dim: 0,
    stars: false,
    glow: 0.55,
    flies: "petals",
  },
  dusk: {
    sky: ["#1a1438", "#47286a", "#a84d6a", "#f08a4b"],
    far: ["#1c1530", "#2a1f40", "#3b2b4f", "#503a5e"],
    lawn: ["#181c1c", "#202925", "#2b372f", "#38463a", "#475645", "#5a6850", "#717c5c", "#8f9470"],
    flowers: ["#d9783e", "#efa04f", "#f8c870", "#ffe4a6", "#fff6dc"],
    trees: ["#08070f", "#100e1c", "#1a172a", "#26213a", "#352d4c", "#493c5e", "#625070"],
    path: ["#5f4c4f", "#7e6563", "#9d827b", "#bea095", "#dcc1b2"],
    wood: ["#2a140e", "#5c2c1a", "#934526"],
    tint: "#4a2a4a",
    dim: 0.2,
    stars: false,
    glow: 0.75,
    flies: "fireflies",
  },
}

// Sprites: one character per pixel, "." is clear. Colours come from a map, so
// one drawing serves every coat, every scene and both directions.
const SPRITES = {
  bench: [
    "bbbbbbbbbbbbbbbbbb",
    "BBBBBBBBBBBBBBBBBB",
    "bbbbbbbbbbbbbbbbbb",
    "BBBBBBBBBBBBBBBBBB",
    ".m..............m.",
    "wwwwwwwwwwwwwwwwww",
    "WWWWWWWWWWWWWWWWWW",
    ".mm............mm.",
    ".m..............m.",
    ".m..............m.",
  ],
  sitter: [
    ".hh..",
    "hhhh.",
    ".ss..",
    "ccccc",
    "cccCc",
    "cccCc",
    "cccCc",
    "ppppp",
    "pp.pp",
    "p...p",
    "b...b",
  ],
  picnic: [
    "...hh.......hh...",
    "..hhh.......ss...",
    "...ss......dddd..",
    "..cccc.....dddd..",
    "..cccc..qQqQddQq.",
    "..ccppqQqQqQppqQ.",
    ".qQqQqQqQqQqQqQq.",
    "qQqQqQqQqQqQqQq..",
    ".................",
  ],
  walker: [
    ".hhh.",
    ".sss.",
    ".kkk.",
    "ccccC",
    "ccccC",
    "cccCC",
    "s.cC.",
    ".pp..",
    ".p.p.",
    ".p.p.",
    "bb.bb",
  ],
  kid: [
    ".hh.",
    "hhhh",
    ".ss.",
    "kkkk",
    "cccC",
    "cccC",
    ".pp.",
    ".p.p",
    "bb.b",
  ],
  snowman: [
    "..kkk..",
    "..kkk..",
    ".KKKKK.",
    "..www..",
    ".wewew.",
    "..wow..",
    ".ttttt.",
    "wwwwwtt",
    "wwewwWW",
    "wwwwwWW",
    "wwewWWW",
    ".wwWWW.",
  ],
  sled: [
    "....hh...",
    "...hhhh..",
    "....ss...",
    "...cccc..",
    "..ccccpp.",
    "rrrrrrrrr",
    ".r.....r.",
    "rrrrrrrr.",
  ],
  dog: [
    "......dd",
    "d....ddd",
    ".ddddddd",
    ".ddddd..",
    ".d.d.d..",
  ],
  lamp: [
    ".mmm.",
    "mLLLm",
    "mLLLm",
    ".mmm.",
    "..m..",
    "..m..",
    "..m..",
    "..m..",
    "..m..",
    "..m..",
    "..m..",
    "..m..",
    "..m..",
    "..m..",
    "..m..",
    "..m..",
    "..m..",
    ".mmm.",
    "mmmmm",
  ],
  statue: [
    "......ff....",
    ".....fFf....",
    "......t.....",
    "......g.....",
    "..k.k.g.....",
    "...GGkg.....",
    "..kGgk......",
    "...Gg.g.....",
    "..gGGgg.....",
    "..GGGg......",
    ".tgGGGg.....",
    "ttGGGgg.....",
    "ttGGGgg.....",
    ".gGGGgg.....",
    ".gGGGggg....",
    ".gGGGGgg....",
    "ggGGGGgg....",
    ".pPPPPpp....",
    ".pPPPPpp....",
    ".pPAPApp....",
    ".pPPPPpp....",
    "ppPPPPPpp...",
    "pPPPPPPPpp..",
    "PPPPPPPPPpp.",
  ],
  duck: [
    ".hh..",
    "hhho.",
    ".bb..",
    "bbbbb",
  ],
}

function clamp(v: number, a: number, b: number): number {
  return v < a ? a : v > b ? b : v
}

function smoothstep(a: number, b: number, x: number): number {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hexToRgb(hex: string): RGB {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return [0, 0, 0]
  let s = m[1]
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2]
  const n = parseInt(s, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgbToHex(c: RGB): string {
  return "#" + c.slice(0, 3).map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0")).join("")
}

function mixRgb(a: RGB, b: RGB, t: number): RGB {
  const k = clamp(t, 0, 1)
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]
}

/** Integer lattice hash in [0, 1). */
function hash2(x: number, y: number, s: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 982451653)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

function vnoise(x: number, y: number, s: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const fx = x - xi
  const fy = y - yi
  const u = fx * fx * (3 - 2 * fx)
  const v = fy * fy * (3 - 2 * fy)
  const a = hash2(xi, yi, s)
  const b = hash2(xi + 1, yi, s)
  const c = hash2(xi, yi + 1, s)
  const d = hash2(xi + 1, yi + 1, s)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

function fbm(x: number, y: number, s: number): number {
  return vnoise(x, y, s) * 0.55 + vnoise(x * 2.03, y * 2.03, s + 17) * 0.3 + vnoise(x * 4.1, y * 4.1, s + 31) * 0.15
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]

function bayer(x: number, y: number): number {
  return (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16
}

/**
 * A colour from a ramp, ordered-dithered between neighbouring steps. A
 * `spread` under 1 narrows the dithered band, for cleaner hand-pixelled edges.
 */
function pickRamp(ramp: RGB[], t: number, x: number, y: number, spread = 1): RGB {
  const n = ramp.length
  if (!n) return [0, 0, 0]
  const f = clamp(t, 0, 1) * (n - 1)
  const i = Math.floor(f)
  return ramp[Math.min(n - 1, f - i > 0.5 + (bayer(x, y) - 0.5) * spread ? i + 1 : i)]
}

function makeRaster(w: number, h: number): Raster {
  return { w, h, d: new Uint8ClampedArray(Math.max(0, w * h * 4)) }
}

function setPx(r: Raster, x: number, y: number, c: RGB, a = 1) {
  x = Math.floor(x)
  y = Math.floor(y)
  if (x < 0 || y < 0 || x >= r.w || y >= r.h || a <= 0) return
  const i = (y * r.w + x) * 4
  if (a >= 1) {
    r.d[i] = c[0]
    r.d[i + 1] = c[1]
    r.d[i + 2] = c[2]
    r.d[i + 3] = 255
    return
  }
  const da = r.d[i + 3] / 255
  const oa = a + da * (1 - a)
  for (let k = 0; k < 3; k++) r.d[i + k] = oa ? (c[k] * a + r.d[i + k] * da * (1 - a)) / oa : 0
  r.d[i + 3] = oa * 255
}

function getPx(r: Raster, x: number, y: number): RGB {
  x = clamp(Math.floor(x), 0, r.w - 1)
  y = clamp(Math.floor(y), 0, r.h - 1)
  const i = (y * r.w + x) * 4
  return [r.d[i], r.d[i + 1], r.d[i + 2], r.d[i + 3]]
}

/** Light spilling onto what is already painted (lamps, the moon). */
function addGlow(r: Raster, cx: number, cy: number, rad: number, c: RGB, strength: number) {
  for (let y = Math.floor(cy - rad); y <= cy + rad; y++) {
    for (let x = Math.floor(cx - rad); x <= cx + rad; x++) {
      if (x < 0 || y < 0 || x >= r.w || y >= r.h) continue
      const d = Math.hypot(x - cx, y - cy) / rad
      if (d >= 1) continue
      const k = strength * (1 - d) * (1 - d)
      // quantised to three bands so the glow stays pixel art
      const q = Math.floor(k * 3 + bayer(x, y)) / 3
      if (q <= 0) continue
      const i = (y * r.w + x) * 4
      for (let j = 0; j < 3; j++) r.d[i + j] = Math.min(255, r.d[i + j] + (c[j] - r.d[i + j] * 0.35) * q)
    }
  }
}

/**
 * Foliage: overlapping crowns, each shaded from a light direction, broken
 * into small leaf clumps (a jittered cell grid, each cell a little sphere)
 * with ragged leafy edges.
 */
function paintLeaves(r: Raster, leaves: Leaf[], ramp: RGB[], seed: number, lx: number, ly: number, clump = 4) {
  const ll = Math.hypot(lx, ly) || 1
  const nx = lx / ll
  const ny = ly / ll
  for (const b of leaves) {
    const x0 = Math.floor(b.x - b.r - 2)
    const x1 = Math.ceil(b.x + b.r + 2)
    const y0 = Math.max(0, Math.floor(b.y - b.r - 2))
    const y1 = Math.min(r.h - 1, Math.ceil(b.y + b.r + 2))
    for (let y = y0; y <= y1; y++) {
      for (let x = Math.max(0, x0); x <= Math.min(r.w - 1, x1); x++) {
        const dx = x - b.x
        const dy = y - b.y
        const d = Math.sqrt(dx * dx + dy * dy)
        const edge = b.r * (0.82 + 0.32 * vnoise(x / 3.4, y / 3.4, seed)) + (hash2(x, y, seed + 1) - 0.5) * 1.6
        if (d > edge) continue
        // nearest clump centre
        const cx = Math.floor(x / clump)
        const cy = Math.floor(y / clump)
        let best = 1e9
        let bx = 0
        let by = 0
        for (let j = -1; j <= 1; j++) {
          for (let i = -1; i <= 1; i++) {
            const px = (cx + i + 0.15 + 0.7 * hash2(cx + i, cy + j, seed + 3)) * clump
            const py = (cy + j + 0.15 + 0.7 * hash2(cx + i, cy + j, seed + 4)) * clump
            const q = (x - px) * (x - px) + (y - py) * (y - py)
            if (q < best) {
              best = q
              bx = x - px
              by = y - py
            }
          }
        }
        const local = (bx * nx + by * ny) / clump
        const n = (dx * nx + dy * ny) / Math.max(1, b.r)
        const rim = d / Math.max(1, edge)
        const t = 0.42 + 0.4 * n + 0.2 * local - 0.26 * rim * rim - 0.12 * (best / (clump * clump)) + 0.14 * (vnoise(x / 1.6, y / 1.6, seed + 5) - 0.5) + b.lift
        setPx(r, x, y, pickRamp(ramp, t, x, y, 0.4))
      }
    }
  }
}

function spriteValid(rows: string[]): boolean {
  return rows.length > 0 && rows.every((row) => row.length === rows[0].length)
}

function drawSprite(r: Raster, rows: string[], map: SpriteMap, x: number, y: number, flip = false, tint: RGB | null = null, dim = 0) {
  const w = rows[0]?.length ?? 0
  const cache: { [k: string]: RGB } = {}
  for (let j = 0; j < rows.length; j++) {
    for (let i = 0; i < w; i++) {
      const ch = rows[j][flip ? w - 1 - i : i]
      if (ch === "." || !(ch in map)) continue
      if (!cache[ch]) cache[ch] = tint ? mixRgb(hexToRgb(map[ch]), tint, dim) : hexToRgb(map[ch])
      setPx(r, x + i, y + j, cache[ch])
    }
  }
}

function bezier(p0: number[], p1: number[], p2: number[], t: number): number[] {
  const u = 1 - t
  return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]
}

/** Distance from a point to a polyline whose vertices carry a half-width. */
function nearPath(pts: number[][], x: number, y: number): number[] {
  let best = 1e9
  let hw = 0
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]
    const b = pts[i + 1]
    const vx = b[0] - a[0]
    const vy = b[1] - a[1]
    const l2 = vx * vx + vy * vy || 1
    const t = clamp(((x - a[0]) * vx + (y - a[1]) * vy) / l2, 0, 1)
    const d = Math.hypot(x - a[0] - vx * t, y - a[1] - vy * t)
    if (d < best) {
      best = d
      hw = a[2] + (b[2] - a[2]) * t
    }
  }
  return [best, hw]
}

function resolveScene(name: string | undefined): ParkScene {
  return SCENES.includes(name as string) ? (name as ParkScene) : "night"
}

function scenePalette(scene: string): ScenePalette {
  return PARK[resolveScene(scene)] as ScenePalette
}

/**
 * The hero: a park meadow seen from the edge of the trees. Returns the scene
 * behind (sky, lawn, path, people) and the framing trees in front, so they
 * can move apart in parallax.
 */
function paintPark(W: number, H: number, seed: number, scene: string) {
  const P = scenePalette(scene)
  const rand = mulberry32(seed)
  const bg = makeRaster(W, H)
  const fg = makeRaster(W, H)
  const k = Math.max(0.5, Math.min(W, H * 1.7) / 340)
  const sky = P.sky.map(hexToRgb)
  const far = P.far.map(hexToRgb)
  const lawn = P.lawn.map(hexToRgb)
  const flw = P.flowers.map(hexToRgb)
  const tree = P.trees.map(hexToRgb)
  const stone = P.path.map(hexToRgb)
  const tint = hexToRgb(P.tint)
  const yh = Math.round(H * 0.16)

  // sky
  for (let y = 0; y < yh + 10; y++) for (let x = 0; x < W; x++) setPx(bg, x, y, pickRamp(sky, y / (yh + 10) + (vnoise(x / 30, y / 6, seed + 3) - 0.5) * 0.2, x, y))
  if (P.stars) for (let i = 0; i < (W * yh) / 70; i++) setPx(bg, rand() * W, rand() * yh, [255, 255, 255], 0.25 + rand() * 0.6)

  // a far line of trees along the horizon
  const farLeaves: Leaf[] = []
  for (let x = -8; x < W + 8; x += (3 + rand() * 6) * k) farLeaves.push({ x, y: yh - (1 + rand() * 6) * k, r: (4 + rand() * 6) * k, lift: (rand() - 0.5) * 0.25 })
  paintLeaves(bg, farLeaves, far, seed + 1, -0.4, -0.9)

  // the path: one walk curving toward the viewer, one branching off behind the trees
  const p0 = [W * 0.84, H * 0.56]
  const main: number[][] = []
  for (let i = 0; i <= 36; i++) {
    const s = i / 36
    const p = bezier(p0, [W * 0.63, H * 0.78], [W * 0.6, H * 1.08], s)
    main.push([p[0], p[1], (1.2 + 15 * Math.pow(s, 1.45)) * k])
  }
  const branch: number[][] = []
  for (let i = 0; i <= 14; i++) {
    const s = i / 14
    const p = bezier(p0, [W * 0.93, H * 0.52], [W * 1.06, H * 0.47], s)
    branch.push([p[0], p[1], (1.2 - 0.3 * s) * k])
  }

  const shadows = [
    [W * 0.03, H * 0.66, W * 0.27, H * 0.1],
    [W * 0.98, H * 0.68, W * 0.21, H * 0.09],
    [W * 0.16, H * 0.36, W * 0.12, H * 0.07],
  ]
  const shadeAt = (x: number, y: number) => {
    let s = 0
    for (const e of shadows) {
      const q = ((x - e[0]) / e[2]) ** 2 + ((y - e[1]) / e[3]) ** 2
      if (q < 1) s = Math.max(s, 1 - q)
    }
    return s
  }
  const lawnTop = (x: number) => yh + Math.round(1.6 * k * Math.sin(x / (23 * k)) + 1.2 * k * Math.sin(x / (8 * k) + 1))
  const onPath = new Uint8Array(W * H)

  for (let y = yh - 6; y < H; y++) {
    if (y < 0) continue
    for (let x = 0; x < W; x++) {
      const top = lawnTop(x)
      if (y < top) continue
      const u = x / W
      const v = (y - yh) / (H - yh)
      const glow = Math.exp(-((u - 0.52) ** 2) / 0.08 - ((v - 0.2) ** 2) / 0.05) * P.glow
      const sh = shadeAt(x, y)
      const pm = nearPath(main, x, y)
      const pb = nearPath(branch, x, y)
      const pd = pm[0] - pm[1] < pb[0] - pb[1] ? pm : pb
      if (pd[0] < pd[1] + (hash2(x, y, seed + 4) - 0.5) * 1.6) {
        onPath[y * W + x] = 1
        const t = 0.3 + 0.45 * glow + 0.2 * (1 - pd[0] / Math.max(1, pd[1])) + 0.25 * (vnoise(x / 2.3, y / 1.6, seed + 5) - 0.5) + 0.15 * v - 0.55 * sh
        setPx(bg, x, y, pickRamp(stone, t, x, y))
        continue
      }
      let t = 0.2 + 0.55 * glow + 0.4 * (fbm(x / (16 * k), y / (7 * k), seed + 2) - 0.5) - 0.06 * v + 0.12 * (vnoise(x / (3 * k), y / (2 * k), seed + 9) - 0.5)
      t -= 0.3 * Math.max(0, 1 - (y - top) / (5 * k))
      t -= 0.5 * sh
      setPx(bg, x, y, pickRamp(lawn, t, x, y))
    }
  }

  // flowers: sparse near the horizon, a carpet in front, clumped in drifts
  for (let y = yh; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (y < lawnTop(x) + 1) continue
      const edge = onPath[y * W + x]
      if (edge && hash2(x, y, seed + 15) > 0.04) continue
      const u = x / W
      const v = (y - yh) / (H - yh)
      const glow = Math.exp(-((u - 0.52) ** 2) / 0.08 - ((v - 0.2) ** 2) / 0.05) * P.glow
      const sh = shadeAt(x, y)
      const dens = 0.03 + 0.62 * smoothstep(0.05, 1, v)
      const drift = smoothstep(0.4, 0.7, fbm(x / (12 * k), y / (5 * k), seed + 11))
      const clump = vnoise(x / 1.7, y / 1.3, seed + 16)
      const p = (dens * drift * (0.3 + 1.1 * clump) + 0.004) * (1 - 0.6 * sh)
      if (hash2(x, y, seed + 12) >= p) continue
      const b = clamp(0.12 + 0.62 * v + 0.3 * glow + (hash2(x, y, seed + 13) - 0.5) * 0.55 - 0.5 * sh, 0, 1)
      const c = pickRamp(flw, b, x, y)
      setPx(bg, x, y, c)
      if (v > 0.62 && hash2(x, y, seed + 14) < 0.16 * (v - 0.62) / 0.38) {
        const dim = mixRgb(c, lawn[2], 0.45)
        setPx(bg, x - 1, y, dim)
        setPx(bg, x + 1, y, dim)
        setPx(bg, x, y - 1, dim)
        setPx(bg, x, y + 1, mixRgb(c, lawn[1], 0.6))
      }
    }
  }

  // people, all sized in art pixels so they read as sprites
  const people = [P.trees[0], "#e8e3d6", "#b7464f", "#e2b04a", "#5a7fc4", "#d8d0e8"]
  const skin = "#e2b495"
  const pick = (i: number) => people[1 + (Math.floor(rand() * 1000) + i) % (people.length - 1)]
  const bp = main[11]
  const bx = Math.round(bp[0] - bp[2] - 21)
  const by = Math.round(bp[1] - 6)
  drawSprite(bg, SPRITES.bench, { b: P.wood[2], B: P.wood[1], w: P.wood[2], W: P.wood[0], m: "#151520" }, bx, by, false, tint, P.dim)
  drawSprite(bg, SPRITES.sitter, { h: "#2b1b16", s: skin, c: "#c9cfdc", C: "#9aa3b8", p: "#3b3f52", b: "#1a1a22" }, bx + 4, by - 4, false, tint, P.dim)
  const blankets = [
    [0.74, 0.27, false],
    [0.79, 0.35, true],
    [0.72, 0.44, false],
  ]
  blankets.forEach((b, i) => {
    const x = Math.round(W * (b[0] as number))
    const y = Math.round(yh + (H - yh) * ((b[1] as number) - 0.16) / 0.84)
    drawSprite(bg, SPRITES.picnic, { h: "#2b1b16", s: skin, c: pick(i), d: pick(i + 2), p: "#3b3f52", q: "#eef2f7", Q: i === 1 ? "#c4475a" : "#6f8fd0" }, x, y, b[2] as boolean, tint, P.dim)
  })
  drawSprite(bg, SPRITES.walker, { h: "#2b1b16", s: skin, k: "#8b2f3c", c: "#d9dde6", C: "#a9b0c0", p: "#2b2f40", b: "#151520" }, Math.round(W * 0.8), Math.round(yh + (H - yh) * 0.05), true, tint, P.dim)

  // framing trees: trunks first, then the canopy in front of them
  const trunks = [
    [W * 0.05, H * 0.2, H * 0.7, 3],
    [W * 0.14, H * 0.28, H * 0.5, 2],
    [W * 0.92, H * 0.24, H * 0.72, 3],
    [W * 0.985, H * 0.2, H * 0.74, 3],
  ]
  for (const t of trunks) {
    const tw = Math.max(2, Math.round(t[3] * k))
    for (let y = Math.floor(t[1]); y < t[2]; y++) {
      for (let i = 0; i < tw; i++) setPx(fg, t[0] + i + Math.sin(y / 9) * 0.8, y, i === 0 ? tree[2] : tree[0])
    }
  }
  const left: Leaf[] = []
  for (let i = 0; i < 46; i++) {
    const a = rand()
    const reach = (0.07 + 0.15 * Math.sin(a * Math.PI) ** 0.8) * W * (0.55 + 0.6 * rand())
    left.push({ x: -0.06 * W + rand() * (reach + 0.06 * W), y: (-0.06 + 0.8 * a) * H, r: (12 + rand() * 15) * k, lift: (rand() - 0.5) * 0.34 })
  }
  const right: Leaf[] = []
  for (let i = 0; i < 40; i++) {
    const a = rand()
    const reach = (0.05 + 0.1 * Math.sin(a * Math.PI) ** 0.8) * W * (0.5 + 0.45 * rand())
    right.push({ x: 1.06 * W - rand() * (reach + 0.06 * W), y: (-0.06 + 0.82 * a) * H, r: (11 + rand() * 15) * k, lift: (rand() - 0.5) * 0.34 })
  }
  const crown: Leaf[] = []
  for (let i = 0; i < 30; i++) {
    const x = rand() * W
    const mid = Math.abs(x / W - 0.5) < 0.2
    crown.push({ x, y: (mid ? -0.1 : -0.06) * H + rand() * 0.05 * H - (mid ? 6 * k : 0), r: (9 + rand() * 12) * k, lift: (rand() - 0.5) * 0.2 - 0.08 })
  }
  const byY = (a: Leaf, b: Leaf) => a.y - b.y
  const cl = Math.max(4, Math.round(6 * k))
  paintLeaves(fg, crown.sort(byY), tree, seed + 22, 0.2, -1, cl)
  paintLeaves(fg, left.sort(byY), tree, seed + 20, 0.75, -0.65, cl)
  paintLeaves(fg, right.sort(byY), tree, seed + 21, -0.75, -0.65, cl)

  return { bg, fg, bench: [bx + 9, by], horizon: yh }
}

/** The careers card: a skyline over trees, mirrored in a lake. */
function paintSkyline(W: number, H: number, seed: number) {
  const rand = mulberry32(seed)
  const r = makeRaster(W, H)
  const k = W / 240
  const horizon = Math.round(H * 0.66)
  const shore = Math.round(H * 0.79)
  const sky = ["#3a70c2", "#477dca", "#568ad2", "#6898d9", "#7ea8e1", "#97bae8", "#b3ccef"].map(hexToRgb)
  for (let y = 0; y < shore; y++) for (let x = 0; x < W; x++) setPx(r, x, y, pickRamp(sky, y / horizon + (vnoise(x / 40, y / 8, seed) - 0.5) * 0.12, x, y))

  // a couple of painted clouds
  const cloud = (cx: number, cy: number, s: number) => {
    const puffs = [[0, 0, 5], [6, -2, 6], [12, 0, 5], [-5, 1, 4], [17, 1, 3.5]]
    for (const p of puffs) {
      const px = cx + p[0] * s
      const py = cy + p[1] * s
      const pr = p[2] * s
      for (let y = Math.floor(py - pr); y <= py + pr; y++) {
        if (y > cy + 2 * s) continue
        for (let x = Math.floor(px - pr); x <= px + pr; x++) {
          if (Math.hypot(x - px, y - py) > pr) continue
          const t = (y - (cy - 7 * s)) / (10 * s)
          setPx(r, x, y, pickRamp([[255, 255, 255], [234, 242, 252], [205, 222, 244]], t, x, y))
        }
      }
    }
  }
  cloud(W * 0.62, H * 0.16, k * 0.9)
  cloud(W * 0.9, H * 0.28, k * 0.7)

  type Tower = { x0: number; x1: number; top: number; face: string; side: string; win: string; style: string; crown: string }
  const paintTower = (b: Tower) => {
    const x0 = Math.round(b.x0)
    const x1 = Math.round(b.x1)
    const top = Math.round(b.top)
    const w = x1 - x0
    const sideW = Math.max(1, Math.round(w * 0.24))
    const face = hexToRgb(b.face)
    const side = hexToRgb(b.side)
    const win = hexToRgb(b.win)
    const hi = mixRgb(face, [255, 255, 255], 0.35)
    for (let y = top; y < horizon + 4; y++) {
      for (let x = x0; x < x1; x++) {
        const s = x >= x1 - sideW
        let c = s ? side : face
        const lx = x - x0
        const ly = y - top
        if (x === x0) c = hi
        else if (b.style === "grid" && ly > 1 && lx % 2 === 1 && ly % 2 === 0) c = s ? mixRgb(win, side, 0.4) : win
        else if (b.style === "bands" && ly > 1 && ly % 3 === 1 && lx % 4 !== 0) c = s ? mixRgb(win, side, 0.4) : win
        else if (b.style === "classic" && ly > 2 && lx % 2 === 1 && ly % 3 !== 0) c = s ? mixRgb(win, side, 0.5) : win
        else if (b.style === "strips" && lx % 3 === 1) c = s ? mixRgb(win, side, 0.4) : win
        if (b.style !== "glass" || hash2(x, y, seed + 5) > 0.92) setPx(r, x, y, c)
        else setPx(r, x, y, mixRgb(c, win, (ly % 4) / 6))
      }
    }
    if (b.crown === "spire") for (let y = top - Math.round(10 * k); y < top; y++) setPx(r, x0 + Math.floor(w / 2), y, side)
    if (b.crown === "antenna") for (let y = top - Math.round(6 * k); y < top; y++) setPx(r, x0 + 1, y, side)
    if (b.crown === "step") {
      for (let s = 1; s <= 2; s++) {
        const inset = Math.round(w * 0.18 * s)
        for (let y = top - 3 * s; y < top - 3 * (s - 1); y++) for (let x = x0 + inset; x < x1 - inset; x++) setPx(r, x, y, x === x0 + inset ? hi : face)
      }
    }
    if (b.crown === "gable") {
      const roof = hexToRgb("#5f8f86")
      for (let j = 0; j < Math.ceil(w / 2); j++) for (let x = x0 + j; x < x1 - j; x++) setPx(r, x, top - j - 1, j % 2 ? mixRgb(roof, [0, 0, 0], 0.15) : roof)
    }
  }

  // hazy background towers
  for (let x = -2; x < W; ) {
    const w = (5 + rand() * 9) * k
    const h = (0.06 + rand() * 0.18) * H
    paintTower({ x0: x, x1: x + w, top: horizon - h, face: "#9cbbe2", side: "#8aaad6", win: "#86a6d4", style: rand() < 0.5 ? "grid" : "bands", crown: rand() < 0.2 ? "antenna" : "flat" })
    x += w + rand() * 3 * k
  }
  const towers: Tower[] = [
    { x0: 0.0, x1: 0.13, top: 0.4, face: "#d9cdb6", side: "#b8a98f", win: "#8e8574", style: "classic", crown: "gable" },
    { x0: 0.13, x1: 0.19, top: 0.5, face: "#c4ccd8", side: "#a3adbd", win: "#7e8aa0", style: "grid", crown: "flat" },
    { x0: 0.31, x1: 0.38, top: 0.38, face: "#e3dccd", side: "#c0b7a5", win: "#93897a", style: "classic", crown: "step" },
    { x0: 0.38, x1: 0.47, top: 0.44, face: "#cfd8e6", side: "#aab6c9", win: "#7c8aa3", style: "bands", crown: "flat" },
    { x0: 0.47, x1: 0.53, top: 0.3, face: "#b8c9e0", side: "#93a8c7", win: "#6c83a8", style: "glass", crown: "antenna" },
    { x0: 0.545, x1: 0.585, top: 0.09, face: "#eef1f5", side: "#c9d0db", win: "#8d98ab", style: "grid", crown: "flat" },
    { x0: 0.6, x1: 0.67, top: 0.33, face: "#dde4ee", side: "#b5c0d0", win: "#7d8ba3", style: "strips", crown: "step" },
    { x0: 0.67, x1: 0.71, top: 0.42, face: "#cbbfae", side: "#a99c88", win: "#857a6a", style: "classic", crown: "flat" },
    { x0: 0.72, x1: 0.79, top: 0.13, face: "#5f7aa6", side: "#4a628a", win: "#3d5278", style: "glass", crown: "spire" },
    { x0: 0.79, x1: 0.85, top: 0.27, face: "#e6e9ee", side: "#c3c9d3", win: "#8b95a6", style: "grid", crown: "step" },
    { x0: 0.88, x1: 0.95, top: 0.44, face: "#d6cbb8", side: "#b4a68f", win: "#8b8070", style: "classic", crown: "flat" },
    { x0: 0.95, x1: 1.01, top: 0.32, face: "#c9d4e4", side: "#a5b2c8", win: "#7a89a2", style: "bands", crown: "antenna" },
  ]
  for (const t of towers) paintTower({ ...t, x0: t.x0 * W, x1: t.x1 * W, top: t.top * H })

  // the bank under the trees, so the lake never mirrors sky through a gap
  for (let y = Math.round(H * 0.7); y < shore; y++) for (let x = 0; x < W; x++) setPx(r, x, y, pickRamp([[24, 58, 30], [34, 76, 38], [46, 94, 46]], 0.3 + 0.4 * vnoise(x / 6, y / 3, seed + 2), x, y))

  // the trees along the far shore
  const greens = ["#1c4220", "#265628", "#336c30", "#43833a", "#5a9a47", "#78b358", "#9dcb6c", "#c2df88"].map(hexToRgb)
  const leaves: Leaf[] = []
  for (let x = -6; x < W + 6; x += (4 + rand() * 7) * k) {
    leaves.push({ x, y: H * (0.62 + rand() * 0.06), r: (6 + rand() * 7) * k, lift: (rand() - 0.5) * 0.3 })
    leaves.push({ x: x + rand() * 4 * k, y: H * (0.7 + rand() * 0.06), r: (5 + rand() * 6) * k, lift: (rand() - 0.5) * 0.3 + 0.04 })
  }
  for (let i = 0; i < 9; i++) leaves.push({ x: W * (0.02 + rand() * 0.2), y: H * (0.52 + rand() * 0.14), r: (7 + rand() * 6) * k, lift: (rand() - 0.5) * 0.2 })
  leaves.sort((a, b) => a.y - b.y)
  paintLeaves(r, leaves, greens, seed + 7, -0.6, -0.8)
  const pink = ["#7c2652", "#a8386e", "#d0558f", "#ec7fb0", "#f8aacb", "#ffd1e3"].map(hexToRgb)
  const blossom: Leaf[] = []
  for (let y = Math.round(H * 0.64); y < shore - 2; y++) for (let i = 0; i < Math.max(2, Math.round(2 * k)); i++) setPx(r, W * 0.865 + i, y, i ? [70, 40, 32] : [110, 70, 52])
  for (let i = 0; i < 13; i++) blossom.push({ x: W * 0.865 + (rand() - 0.5) * 20 * k, y: H * 0.625 + (rand() - 0.5) * 11 * k, r: (3.5 + rand() * 4) * k, lift: (rand() - 0.5) * 0.2 })
  blossom.sort((a, b) => a.y - b.y)
  paintLeaves(r, blossom, pink, seed + 8, -0.6, -0.8)

  // rocks on the shore, then the lake with the whole view upside down in it
  const rock = ["#4f5662", "#6f7783", "#9199a5", "#b6bcc6"].map(hexToRgb)
  const rocks: Leaf[] = []
  for (let x = W * 0.3; x < W * 0.8; x += (5 + rand() * 9) * k) if (rand() < 0.7) rocks.push({ x, y: shore - 1, r: (1.5 + rand() * 2.2) * k, lift: 0.1 })
  paintLeaves(r, rocks, rock, seed + 9, -0.6, -0.8)
  const water = ["#244f8f", "#2e5fa1", "#3a70b3", "#4b82c2", "#6098d0"].map(hexToRgb)
  for (let y = shore; y < H; y++) {
    const depth = (y - shore) / Math.max(1, H - shore)
    const ox = Math.round(Math.sin(y * 0.9 + seed) * (0.6 + depth * 1.6))
    const srcY = shore - 1 - Math.round((y - shore) * 1.2)
    for (let x = 0; x < W; x++) {
      const src = getPx(r, x + ox, srcY)
      const base = pickRamp(water, 0.62 - 0.45 * depth + 0.2 * (vnoise(x / 16, y / 2, seed + 3) - 0.5), x, y)
      let c = mixRgb(src, base, 0.4 + 0.35 * depth)
      if (hash2(Math.floor(x / 4), y, seed + 6) > 0.955) c = mixRgb(c, [230, 240, 255], 0.5)
      setPx(r, x, y, c)
    }
  }
  return { bg: r, shore, horizon }
}

/** The postage stamp: the statue in the harbour, the skyline behind. */
function paintStamp(W: number, H: number, seed: number) {
  const rand = mulberry32(seed)
  const r = makeRaster(W, H)
  const sea = Math.round(H * 0.74)
  const sky = ["#4f86d2", "#679ada", "#86b0e3", "#a7c6ec", "#cbdcf3"].map(hexToRgb)
  for (let y = 0; y < sea; y++) for (let x = 0; x < W; x++) setPx(r, x, y, pickRamp(sky, y / sea, x, y))
  for (let i = 0; i < 2; i++) {
    const cx = W * (0.55 + i * 0.25)
    const cy = H * (0.18 + i * 0.12)
    for (let y = -3; y <= 1; y++) for (let x = -7; x <= 7; x++) if ((x * x) / 49 + (y * y) / 9 < 1 + (hash2(x, y, seed + i) - 0.5) * 0.4) setPx(r, cx + x, cy + y, y < -1 ? [255, 255, 255] : [226, 236, 250])
  }
  for (let x = Math.round(W * 0.42); x < W; ) {
    const w = 2 + Math.floor(rand() * 4)
    const h = Math.round(H * (0.08 + rand() * 0.28))
    const c = hexToRgb(rand() < 0.5 ? "#89a4cc" : "#7b97c2")
    for (let y = sea - h; y < sea; y++) for (let i = 0; i < w; i++) setPx(r, x + i, y, (y - sea + h) % 2 === 1 && i % 2 === 1 ? mixRgb(c, [255, 255, 255], 0.25) : c)
    x += w + (rand() < 0.3 ? 1 : 0)
  }
  const water = ["#2f5f9f", "#3c70b0", "#4d82c0", "#6b9bd0"].map(hexToRgb)
  for (let y = sea; y < H; y++) for (let x = 0; x < W; x++) {
    let c = pickRamp(water, 0.75 - (y - sea) / (H - sea) * 0.6, x, y)
    if (hash2(Math.floor(x / 3), y, seed + 2) > 0.9) c = mixRgb(c, [230, 240, 255], 0.55)
    setPx(r, x, y, c)
  }
  // the island
  const isle = ["#2e5a2a", "#3f7536", "#5a9246", "#7cae5a"].map(hexToRgb)
  for (let y = sea - 3; y < sea + 2; y++) for (let x = Math.round(W * 0.04); x < W * 0.44; x++) {
    const e = Math.abs(x - W * 0.24) / (W * 0.2)
    if (y < sea - 3 + e * 4) continue
    setPx(r, x, y, pickRamp(isle, 0.7 - (y - sea + 3) / 5, x, y))
  }
  const sx = Math.round(W * 0.24) - 5
  drawSprite(r, SPRITES.statue, { f: "#ffd55a", F: "#ff9f2e", t: "#4f9a8c", g: "#3f7f74", G: "#6cb7a6", k: "#8fd0c0", p: "#a99677", P: "#cdbb9a", A: "#8c7a5c" }, sx, sea - SPRITES.statue.length + 1)
  return r
}

/** The footer: a snowy avenue of trees at night, lamps lit, everyone out. */
function paintWinter(W: number, H: number, seed: number) {
  const rand = mulberry32(seed)
  const r = makeRaster(W, H)
  const k = Math.max(0.6, W / 360)
  const ground = Math.round(H * 0.62)
  const sky = ["#08122e", "#0e1f4a", "#172f68", "#223f80", "#30528f"].map(hexToRgb)
  for (let y = 0; y < ground + 2; y++) for (let x = 0; x < W; x++) setPx(r, x, y, pickRamp(sky, y / ground, x, y))
  for (let i = 0; i < W / 4; i++) setPx(r, rand() * W, rand() * ground * 0.6, [255, 255, 255], 0.2 + rand() * 0.5)

  // the city at the end of the avenue
  const city = [[0.4, 0.3], [0.43, 0.18], [0.455, 0.02], [0.49, 0.22], [0.52, 0.34], [0.555, 0.28]]
  for (const c of city) {
    const x0 = Math.round(W * c[0])
    const w = Math.round(W * 0.028)
    const top = Math.round(H * c[1])
    for (let y = top; y < ground; y++) for (let x = x0; x < x0 + w; x++) {
      let col = mixRgb([52, 78, 140], [30, 50, 100], (x - x0) / w)
      if ((y - top) % 3 === 1 && (x - x0) % 2 === 1 && hash2(x, y, seed + 3) > 0.62) col = [244, 214, 132]
      setPx(r, x, y, col)
    }
  }

  // far snowy shrubs, then the ground
  const farTrees = ["#1e3268", "#2a4380", "#3d5a98", "#5d7bb6", "#8aa4d6"].map(hexToRgb)
  const shrubs: Leaf[] = []
  for (let x = -4; x < W + 4; x += (4 + rand() * 6) * k) shrubs.push({ x, y: ground - (1 + rand() * 4) * k, r: (3 + rand() * 5) * k, lift: (rand() - 0.5) * 0.2 })
  paintLeaves(r, shrubs, farTrees, seed + 4, 0.1, -1)
  const snow = ["#4864a4", "#5f7cb8", "#7f9ad0", "#a5bce5", "#cad9f2", "#e9f0fb", "#fbfdff"].map(hexToRgb)
  for (let y = ground; y < H; y++) for (let x = 0; x < W; x++) {
    const v = (y - ground) / (H - ground)
    const lane = Math.abs(x / W - 0.5) < 0.06 + v * 0.16 ? 0.1 : 0
    let t = 0.42 + 0.42 * v + 0.25 * (fbm(x / (14 * k), y / (5 * k), seed + 5) - 0.5) - lane
    t -= 0.3 * Math.max(0, 1 - Math.abs(x / W - 0.18) / 0.2) * Math.max(0, 1 - v * 1.5)
    t -= 0.3 * Math.max(0, 1 - Math.abs(x / W - 0.82) / 0.2) * Math.max(0, 1 - v * 1.5)
    setPx(r, x, y, pickRamp(snow, t, x, y))
  }

  // the avenue: trunks with bare branches, then snow-laden crowns lit from above
  const bark = hexToRgb("#0a1124")
  const barkHi = hexToRgb("#24365f")
  const trunkXs = [0.03, 0.13, 0.24, 0.33, 0.67, 0.76, 0.87, 0.97]
  for (const tx of trunkXs) {
    const x = W * tx
    const tw = Math.max(2, Math.round(2.4 * k * (Math.abs(tx - 0.5) > 0.3 ? 1.3 : 1)))
    const base = ground + Math.round((Math.abs(tx - 0.5) * 0.5) * (H - ground))
    for (let y = Math.round(H * 0.18); y < base; y++) for (let i = 0; i < tw; i++) setPx(r, x + i, y, i === 0 ? barkHi : bark)
    for (let b = 0; b < 3; b++) {
      const by = H * (0.2 + b * 0.1)
      const dir = (b % 2 ? 1 : -1) * (tx < 0.5 ? 1 : -1)
      for (let j = 0; j < 9 * k; j++) setPx(r, x + dir * j, by - j * 0.7, bark)
    }
  }
  const crowns = ["#0b1430", "#13234d", "#1d3469", "#2b4888", "#4566a6", "#7593cc", "#b4c8ec", "#eef4fd"].map(hexToRgb)
  const leaves: Leaf[] = []
  for (let i = 0; i < 70; i++) {
    const left = i % 2 === 0
    const a = rand()
    const x = left ? W * (-0.04 + a * 0.4) : W * (1.04 - a * 0.4)
    leaves.push({ x, y: H * (-0.12 + rand() * 0.52) + a * H * 0.1, r: (7 + rand() * 10) * k, lift: (rand() - 0.5) * 0.25 })
  }
  leaves.sort((a, b) => a.y - b.y)
  paintLeaves(r, leaves, crowns, seed + 6, 0.12, -1)

  // lamps and everyone out in the snow
  const lamps = [[0.07, 0], [0.86, 0], [0.36, 1], [0.62, 1]]
  const lampAt: number[][] = []
  for (const l of lamps) {
    const x = Math.round(W * l[0])
    const s = l[1] ? 0.7 : 1
    const rows = SPRITES.lamp.slice(l[1] ? 5 : 0)
    const y = ground + Math.round((l[1] ? 0.08 : 0.42) * (H - ground)) - rows.length
    drawSprite(r, rows, { m: "#0b1124", L: "#ffe7a3" }, x, y)
    lampAt.push([x + 2, y + 2, s])
  }
  for (const l of lampAt) addGlow(r, l[0], l[1], 14 * k * l[2], [255, 214, 140], 0.85)

  const coats = ["#c8383a", "#2f5fb3", "#e8b93a", "#3f8a5a", "#e7e2d8", "#7a3f8a", "#d86b2c"]
  const hats = ["#e7e2d8", "#c8383a", "#1d2a4a", "#2f5fb3", "#e8b93a"]
  const cast = ["walker", "kid", "snowman", "sled", "walker", "kid", "walker", "dog", "walker", "sled", "snowman", "kid", "walker", "walker", "kid"]
  const crowd = cast.map((kind, i) => ({ kind, u: 0.06 + (i / cast.length) * 0.9 + (rand() - 0.5) * 0.04, v: 0.3 + rand() * 0.62, i }))
  crowd.sort((a, b) => a.v - b.v)
  for (const p of crowd) {
    const rows = (SPRITES as { [k: string]: string[] })[p.kind]
    const x = Math.round(W * p.u)
    const y = Math.round(ground + p.v * (H - ground)) - rows.length
    const coat = coats[(p.i * 3 + Math.floor(rand() * 7)) % coats.length]
    const map: SpriteMap = { h: hats[(p.i + 1) % hats.length], s: "#f0c7a6", k: coats[(p.i + 3) % coats.length], c: coat, C: rgbToHex(mixRgb(hexToRgb(coat), [10, 20, 50], 0.35)), p: "#1d2540", b: "#0d1222", w: "#f6f9ff", W: "#b9c9e6", e: "#1d2540", o: "#ff8a2a", K: "#1d2540", t: "#c8383a", r: "#8a3a22", d: "#6a4630" }
    for (let i = 0; i < rows[0].length; i++) setPx(r, x + i, y + rows.length, [70, 95, 150], 0.35)
    drawSprite(r, rows, map, x, y, hash2(p.i, 3, seed) > 0.5)
  }
  return { bg: r, lamps: lampAt, ground }
}

function sceneForHour(h: number): ParkScene {
  if (h >= 5 && h < 8) return "dawn"
  if (h >= 8 && h < 17) return "day"
  if (h >= 17 && h < 20) return "dusk"
  return "night"
}

function nextScene(s: string): ParkScene {
  const i = SCENES.indexOf(s)
  return SCENES[(i + 1) % SCENES.length] as ParkScene
}

function formatClock(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone }).format(date)
  } catch {
    return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).format(date)
  }
}

function hourIn(date: Date, timeZone: string): number {
  try {
    const s = new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone }).format(date)
    return parseInt(s, 10) % 24
  } catch {
    return date.getHours()
  }
}

function postmarkDate(date: Date): string {
  const m = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][date.getMonth()]
  return m + " " + String(date.getDate()).padStart(2, "0") + " " + date.getFullYear()
}

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())
}

/**
 * A signature drawn from a name: a tall looped capital, a small stroke per
 * letter (loops up for ascenders, down for descenders) and a flourish back
 * under the name. Deterministic, so a name always signs the same way.
 */
function signaturePath(name: string, seed: number) {
  const letters = name.replace(/[^A-Za-z]/g, "").slice(0, 9) || "A"
  const rand = mulberry32(seed + letters.charCodeAt(0) * 131 + letters.length * 7)
  const base = 30
  const pts: number[][] = []
  let x = 6
  pts.push([x, base + 3], [x + 4, base - 20 - rand() * 4], [x + 9, base - 23], [x + 7, base - 9], [x + 2, base - 4], [x + 12, base - 7])
  x += 12
  for (const ch of letters.slice(1).toLowerCase()) {
    const asc = "bdfhklt".includes(ch)
    const desc = "gjpqy".includes(ch)
    const a = 5 + (ch.charCodeAt(0) % 4) + rand() * 2
    const step = 4.2 + rand() * 2.4
    if (asc) pts.push([x + step * 0.7, base - 17 - rand() * 3], [x + step * 0.35, base - 3])
    else if (desc) pts.push([x + step * 0.5, base - a], [x + step * 0.7, base + 9 + rand() * 2], [x + step * 0.35, base + 2])
    else pts.push([x + step * 0.5, base - a])
    pts.push([x + step, base - rand() * 1.5])
    x += step
  }
  pts.push([x + 6, base - 9], [x + 4, base + 4], [x * 0.55, base + 7], [x + 16, base + 2])
  const f = (n: number) => n.toFixed(1)
  let d = "M" + f(pts[0][0]) + " " + f(pts[0][1])
  let maxX = 0
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += " C" + f(c1[0]) + " " + f(c1[1]) + " " + f(c2[0]) + " " + f(c2[1]) + " " + f(p2[0]) + " " + f(p2[1])
    maxX = Math.max(maxX, p1[0], p2[0], c1[0], c2[0])
  }
  return { d, w: Math.ceil(maxX + 6), h: 46 }
}
// #endregion logic

/* ------------------------------------------------------------------ drawing on screen */

type Overlay = {
  frame: (ctx: CanvasRenderingContext2D, t: number) => void
  point?: (x: number, y: number, on: boolean) => void
  tap?: (x: number, y: number) => void
}
type Painted = { layers: Raster[]; overlay?: Overlay }

function putRaster(cv: HTMLCanvasElement, r: Raster) {
  cv.width = r.w
  cv.height = r.h
  const ctx = cv.getContext("2d")
  if (!ctx) return
  const img = ctx.createImageData(r.w, r.h)
  img.data.set(r.d)
  ctx.putImageData(img, 0, 0)
}

/**
 * A pixel-art scene: paints its rasters once per size and key, scales them up
 * with crisp pixels, and runs an optional overlay (fireflies, snow, birds)
 * only while it is on screen.
 */
function PixelScene({
  paint,
  sig,
  pixel,
  layers,
  margin = 0,
  depth,
  overlayAt,
  animate,
  className,
  onReady,
}: {
  paint: (W: number, H: number) => Painted
  sig: string
  pixel: (cw: number) => number
  layers: number
  margin?: number
  depth?: number[]
  overlayAt?: number
  animate: boolean
  className?: string
  onReady?: () => void
}) {
  const box = React.useRef(null as HTMLDivElement | null)
  const canvases = React.useRef([] as (HTMLCanvasElement | null)[])
  const over = React.useRef(null as HTMLCanvasElement | null)
  const overlay = React.useRef(null as Overlay | null)
  const geo = React.useRef({ px: 1, m: 0 })
  const paintRef = React.useRef(paint)
  paintRef.current = paint
  const readyRef = React.useRef(onReady)
  readyRef.current = onReady
  const [drawn, setDrawn] = React.useState(false)

  React.useEffect(() => {
    const el = box.current
    if (!el) return
    let last = ""
    let timer = 0
    const draw = () => {
      const cw = el.clientWidth
      const ch = el.clientHeight
      if (!cw || !ch) return
      const px = pixel(cw)
      const W = Math.ceil(cw / px) + margin * 2
      const H = Math.ceil(ch / px) + margin * 2
      const key = W + "x" + H + ":" + sig
      if (key === last) return
      last = key
      const out = paintRef.current(W, H)
      geo.current = { px, m: margin }
      const place = (cv: HTMLCanvasElement) => {
        cv.style.width = W * px + "px"
        cv.style.height = H * px + "px"
        cv.style.left = -margin * px + "px"
        cv.style.top = -margin * px + "px"
      }
      out.layers.forEach((r, i) => {
        const cv = canvases.current[i]
        if (!cv) return
        putRaster(cv, r)
        place(cv)
      })
      if (over.current) {
        over.current.width = W
        over.current.height = H
        place(over.current)
      }
      overlay.current = out.overlay ?? null
      setDrawn(true)
      readyRef.current?.()
    }
    draw()
    if (typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(() => {
      window.clearTimeout(timer)
      timer = window.setTimeout(draw, last ? 150 : 0)
    })
    ro.observe(el)
    return () => {
      ro.disconnect()
      window.clearTimeout(timer)
    }
  }, [sig, margin, pixel])

  // the overlay runs only while visible, and never under reduced motion
  React.useEffect(() => {
    const el = box.current
    const cv = over.current
    if (!el || !cv || !animate) {
      if (cv) cv.getContext("2d")?.clearRect(0, 0, cv.width, cv.height)
      return
    }
    let raf = 0
    let on = true
    let lastT = 0
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (!on || now - lastT < 33) return
      lastT = now
      const ctx = cv.getContext("2d")
      const o = overlay.current
      if (!ctx || !o) return
      ctx.clearRect(0, 0, cv.width, cv.height)
      o.frame(ctx, now / 1000)
    }
    raf = requestAnimationFrame(loop)
    let io: IntersectionObserver | null = null
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver((es) => {
        for (const e of es) on = e.isIntersecting
      })
      io.observe(el)
    }
    return () => {
      cancelAnimationFrame(raf)
      io?.disconnect()
    }
  }, [animate])

  const toArt = (e: React.PointerEvent) => {
    const r = box.current?.getBoundingClientRect()
    if (!r) return [0, 0]
    const g = geo.current
    return [(e.clientX - r.left) / g.px + g.m, (e.clientY - r.top) / g.px + g.m]
  }
  const shift = (d: number) =>
    d ? ({ transform: "translate3d(calc(var(--ppk-px, 0) * " + d + "px), calc(var(--ppk-py, 0) * " + d * 0.5 + "px), 0)" } as React.CSSProperties) : undefined
  const at = overlayAt ?? layers

  const nodes = []
  for (let i = 0; i <= layers; i++) {
    if (i === at) nodes.push(<canvas key="o" ref={over} aria-hidden="true" className="ppk-canvas" style={shift(depth?.[Math.max(0, i - 1)] ?? 0)} />)
    if (i < layers) nodes.push(<canvas key={i} ref={(n) => { canvases.current[i] = n }} aria-hidden="true" className="ppk-canvas" style={shift(depth?.[i] ?? 0)} />)
  }

  return (
    <div
      ref={box}
      className={"ppk-scene " + (className || "")}
      data-drawn={drawn ? "true" : "false"}
      onPointerMove={(e) => {
        if (e.pointerType === "touch") return
        const p = toArt(e)
        overlay.current?.point?.(p[0], p[1], true)
      }}
      onPointerLeave={() => overlay.current?.point?.(0, 0, false)}
      onPointerDown={(e) => {
        const p = toArt(e)
        overlay.current?.tap?.(p[0], p[1])
      }}
    >
      {nodes}
    </div>
  )
}

/* ------------------------------------------------------------------ overlays */

/** Fireflies that blink, wander, gather toward the pointer and burst from a click. Petals by day. */
function fireflies(W: number, H: number, seed: number, kind: string, top: number): Overlay {
  const rand = mulberry32(seed + 99)
  const petals = kind === "petals"
  type Fly = { x: number; y: number; vx: number; vy: number; ph: number; sp: number; life: number }
  const flies: Fly[] = []
  const spawn = (x: number, y: number, life: number, burst: boolean): Fly => {
    const a = rand() * Math.PI * 2
    const s = burst ? 0.4 + rand() * 0.7 : 0.05
    return { x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, ph: rand() * 6.28, sp: 1.5 + rand() * 2.5, life }
  }
  const n = Math.round((W * H) / (petals ? 1500 : 900))
  for (let i = 0; i < n; i++) flies.push(spawn(rand() * W, top + rand() * (H - top), -1, false))
  const ptr = { x: 0, y: 0, on: false }
  return {
    point(x, y, on) {
      ptr.x = x
      ptr.y = y
      ptr.on = on
    },
    tap(x, y) {
      for (let i = 0; i < 24; i++) flies.push(spawn(x, y, 1, true))
    },
    frame(ctx, t) {
      for (let i = flies.length - 1; i >= 0; i--) {
        const f = flies[i]
        const wander = vnoise(f.x / 40 + t * 0.2, f.y / 40, i) - 0.5
        if (petals) {
          f.vx += 0.012 + wander * 0.02
          f.vy += 0.006 + Math.sin(t * f.sp + f.ph) * 0.01
        } else {
          f.vx += Math.cos(wander * 6.28) * 0.012
          f.vy += Math.sin(wander * 6.28) * 0.012
        }
        if (ptr.on) {
          const dx = ptr.x - f.x
          const dy = ptr.y - f.y
          const d = Math.hypot(dx, dy)
          if (d < 70 && d > 3) {
            f.vx += (dx / d) * 0.02 * (petals ? -1 : 1)
            f.vy += (dy / d) * 0.02 * (petals ? -1 : 1)
          }
        }
        f.vx *= 0.95
        f.vy *= 0.95
        f.x += f.vx
        f.y += f.vy
        if (f.life > 0) {
          f.life -= 0.006
          if (f.life <= 0) {
            flies.splice(i, 1)
            continue
          }
        }
        if (f.x < -4) f.x = W + 3
        if (f.x > W + 4) f.x = -3
        if (f.y < top - 6) f.y = H - 2
        if (f.y > H + 4) f.y = top
        const x = Math.round(f.x)
        const y = Math.round(f.y)
        if (petals) {
          ctx.fillStyle = i % 3 ? "rgba(255,255,255,.9)" : "rgba(250,190,214,.95)"
          ctx.fillRect(x, y, 1, 1)
          continue
        }
        const b = Math.pow(0.5 + 0.5 * Math.sin(t * f.sp + f.ph), 3) * (f.life > 0 ? Math.min(1, f.life * 2) : 1)
        if (b < 0.05) continue
        ctx.fillStyle = "rgba(220,245,140," + (b * 0.42).toFixed(3) + ")"
        ctx.fillRect(x - 1, y, 3, 1)
        ctx.fillRect(x, y - 1, 1, 3)
        ctx.fillStyle = "rgba(255,252,200," + b.toFixed(3) + ")"
        ctx.fillRect(x, y, 1, 1)
      }
    },
  }
}

/** Clouds drift, ducks paddle, the lake glints, and a click sends up a flock. */
function skylineLife(W: number, H: number, seed: number, shore: number): Overlay {
  const rand = mulberry32(seed + 7)
  const clouds = [0, 1].map((i) => ({ x: rand() * W, y: H * (0.06 + i * 0.2), s: 0.06 + rand() * 0.05 }))
  const ducks = [0, 1].map(() => ({ x: rand() * W, y: shore + 6 + rand() * (H - shore - 12), s: 0.04 + rand() * 0.04 }))
  type Bird = { x: number; y: number; vx: number; vy: number; ph: number }
  let birds: Bird[] = []
  const flock = (x: number, y: number) => {
    for (let i = 0; i < 7; i++) birds.push({ x: x + (rand() - 0.5) * 8, y: y + (rand() - 0.5) * 6, vx: 0.4 + rand() * 0.5, vy: -0.25 - rand() * 0.35, ph: rand() * 6 })
  }
  flock(W * 0.2, H * 0.3)
  const puff = [[0, 1, 9], [2, 0, 5], [3, -1, 4], [-2, 0, 4]]
  return {
    tap(x, y) {
      flock(x, Math.min(y, shore - 4))
    },
    frame(ctx, t) {
      ctx.fillStyle = "rgba(255,255,255,.9)"
      for (const c of clouds) {
        c.x += c.s
        if (c.x > W + 16) c.x = -16
        for (const p of puff) ctx.fillRect(Math.round(c.x + p[0] - p[2] / 2), Math.round(c.y + p[1]), p[2], 2)
      }
      birds = birds.filter((b) => b.y > -6 && b.x < W + 6)
      ctx.fillStyle = "#24314a"
      for (const b of birds) {
        b.x += b.vx
        b.y += b.vy
        b.vy *= 0.995
        const up = Math.sin(t * 12 + b.ph) > 0
        const x = Math.round(b.x)
        const y = Math.round(b.y)
        ctx.fillRect(x, y, 1, 1)
        ctx.fillRect(x - 1, y + (up ? -1 : 0), 1, 1)
        ctx.fillRect(x + 1, y + (up ? -1 : 0), 1, 1)
      }
      for (let i = 0; i < 14; i++) {
        const sx = Math.floor(hash2(i, Math.floor(t * 1.5), seed) * W)
        const sy = shore + 1 + Math.floor(hash2(i, Math.floor(t * 1.5) + 7, seed) * (H - shore - 1))
        ctx.fillStyle = "rgba(240,248,255," + (0.4 + 0.5 * Math.abs(Math.sin(t * 3 + i))).toFixed(2) + ")"
        ctx.fillRect(sx, sy, 2, 1)
      }
      for (const d of ducks) {
        d.x -= d.s
        if (d.x < -8) d.x = W + 8
        const x = Math.round(d.x)
        const y = Math.round(d.y + Math.sin(t * 2 + d.s * 100) * 0.4)
        ctx.fillStyle = "rgba(255,255,255,.35)"
        ctx.fillRect(x + 4, y + 4, 4, 1)
        SPRITES.duck.forEach((row, j) => {
          for (let i = 0; i < row.length; i++) {
            const ch = row[i]
            if (ch === ".") continue
            ctx.fillStyle = ch === "h" ? "#2f6b3e" : ch === "o" ? "#f0a030" : "#8a6a4a"
            ctx.fillRect(x + i, y + j, 1, 1)
          }
        })
      }
    },
  }
}

/** Snow falling past the lamps; the pointer is a breeze, a click a snowball's puff. */
function snowfall(W: number, H: number, seed: number, lamps: number[][]): Overlay {
  const rand = mulberry32(seed + 3)
  type Flake = { x: number; y: number; vy: number; ph: number; s: number; life: number; vx: number }
  const flakes: Flake[] = []
  const n = Math.round((W * H) / 70)
  for (let i = 0; i < n; i++) flakes.push({ x: rand() * W, y: rand() * H, vy: 0.12 + rand() * 0.3, ph: rand() * 6.28, s: rand() < 0.15 ? 2 : 1, life: -1, vx: 0 })
  const ptr = { x: 0, y: 0, on: false }
  return {
    point(x, y, on) {
      ptr.x = x
      ptr.y = y
      ptr.on = on
    },
    tap(x, y) {
      for (let i = 0; i < 24; i++) {
        const a = rand() * Math.PI * 2
        const s = 0.3 + rand() * 0.9
        flakes.push({ x, y, vy: Math.sin(a) * s - 0.3, vx: Math.cos(a) * s, ph: 0, s: 1, life: 1 })
      }
    },
    frame(ctx, t) {
      for (const l of lamps) {
        const f = 0.12 + 0.05 * Math.sin(t * 7 + l[0]) * Math.sin(t * 3.1 + l[1])
        ctx.fillStyle = "rgba(255,220,150," + f.toFixed(3) + ")"
        const rr = Math.round(5 * l[2])
        ctx.fillRect(l[0] - rr, l[1] - rr + 1, rr * 2 + 1, rr * 2 - 1)
        ctx.fillRect(l[0] - rr + 1, l[1] - rr, rr * 2 - 1, rr * 2 + 1)
      }
      for (let i = flakes.length - 1; i >= 0; i--) {
        const f = flakes[i]
        let wind = Math.sin(t * 0.7 + f.ph) * 0.15
        if (ptr.on) {
          const dx = f.x - ptr.x
          const dy = f.y - ptr.y
          const d = Math.hypot(dx, dy)
          if (d < 30 && d > 0.5) {
            f.vx += (dx / d) * 0.08
            f.y += (dy / d) * 0.3
          }
        }
        if (f.life > 0) {
          f.vy += 0.03
          f.life -= 0.02
          if (f.life <= 0) {
            flakes.splice(i, 1)
            continue
          }
        }
        f.vx *= 0.94
        wind += f.vx
        f.x += wind
        f.y += f.vy
        if (f.life < 0) {
          if (f.y > H + 2) {
            f.y = -2
            f.x = rand() * W
          }
          if (f.x < -2) f.x = W + 1
          if (f.x > W + 2) f.x = -1
        }
        ctx.fillStyle = f.life > 0 ? "rgba(255,255,255," + f.life.toFixed(2) + ")" : "rgba(255,255,255,.85)"
        ctx.fillRect(Math.round(f.x), Math.round(f.y), f.s, f.s)
      }
    },
  }
}

/* ------------------------------------------------------------------ svg pieces */

function useSvgId() {
  return "ppk" + React.useId().replace(/[^a-zA-Z0-9_-]/g, "")
}

/** The sunrise mark: half a sun over the horizon, rays above. */
function SunriseMark({ size = 18 }: { size?: number }) {
  return (
    <svg className="ppk-svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="M3 17.5h18M6.5 17.5a5.5 5.5 0 0 1 11 0" />
      <path d="M12 6.5v2.2M5.6 9.6l1.5 1.5M18.4 9.6l-1.5 1.5M2.8 14h1.8M19.4 14h1.8" />
      <path d="M7 20.5h10" opacity=".55" />
    </svg>
  )
}

function ArrowChip() {
  return (
    <span className="ppk-chip" aria-hidden="true">
      <svg className="ppk-svg" width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 5h6M5.5 2.5 8 5 5.5 7.5" />
      </svg>
    </span>
  )
}

function SceneIcon({ scene }: { scene: ParkScene }) {
  if (scene === "night")
    return (
      <svg className="ppk-svg" width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M10.6 1.6a6.6 6.6 0 1 0 3.8 10.8A5.6 5.6 0 0 1 10.6 1.6Z" />
      </svg>
    )
  return (
    <svg className="ppk-svg" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      {scene === "day" ? <circle cx="8" cy="8" r="3" /> : <path d="M3.5 11a4.5 4.5 0 0 1 9 0M1.5 11h13" />}
      <path d={scene === "day" ? "M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1" : "M8 3v1.6M3.1 5.6l1.1 1.1M12.9 5.6l-1.1 1.1"} />
    </svg>
  )
}

function Signature({ name, seed, play }: { name: string; seed: number; play: boolean }) {
  const s = React.useMemo(() => signaturePath(name, seed), [name, seed])
  return (
    <svg className="ppk-svg ppk-sig" width={s.w * 1.15} height={s.h * 1.15} viewBox={"0 0 " + s.w + " " + s.h} fill="none" role="img" aria-label={"Signed, " + name} data-play={play ? "true" : "false"}>
      <path d={s.d} pathLength={1} stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Postmark({ city, date }: { city: string; date: string }) {
  const id = useSvgId()
  return (
    <svg className="ppk-svg ppk-postmark" viewBox="0 0 150 80" aria-hidden="true">
      <defs>
        <path id={id + "ring"} d="M40 40m-27 0a27 27 0 1 1 54 0a27 27 0 1 1 -54 0" />
      </defs>
      <g fill="none" stroke="currentColor">
        <circle cx="40" cy="40" r="35" strokeWidth="1.6" />
        <circle cx="40" cy="40" r="20" strokeWidth="1" />
        {[0, 1, 2, 3, 4].map((i) => (
          <path key={i} d={"M78 " + (22 + i * 9) + " q8 -4 16 0 t16 0 t16 0 t16 0"} strokeWidth="1.6" />
        ))}
      </g>
      <text fill="currentColor" fontSize="7.5" fontWeight="600" letterSpacing="1.6">
        <textPath href={"#" + id + "ring"} startOffset="2%">{(city + " · NY · ").toUpperCase().repeat(2)}</textPath>
      </text>
      <text x="40" y="38" textAnchor="middle" fill="currentColor" fontSize="6.6" fontWeight="700" letterSpacing=".6">{date.slice(0, 6)}</text>
      <text x="40" y="47" textAnchor="middle" fill="currentColor" fontSize="6.6" fontWeight="700" letterSpacing=".6">{date.slice(7)}</text>
    </svg>
  )
}

function SocialIcon({ kind }: { kind: ParkSocial["kind"] }) {
  if (kind === "x")
    return (
      <svg className="ppk-svg" width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.8 2.5h3.3l-7.2 8.2 8.4 11.1h-6.6l-5.2-6.8-5.9 6.8H1.3l7.7-8.8L1 2.5h6.8l4.7 6.2 5.3-6.2Zm-1.2 17.4h1.8L6.6 4.3H4.6l12 15.6Z" />
      </svg>
    )
  if (kind === "linkedin")
    return (
      <svg className="ppk-svg" width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4v11H3v-11Zm6.5 0h3.8v1.5h.06c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.77 2.6 4.77 6v5.55h-4v-4.9c0-1.17-.02-2.68-1.63-2.68-1.64 0-1.89 1.28-1.89 2.6v4.98h-4V9.75Z" />
      </svg>
    )
  if (kind === "github")
    return (
      <svg className="ppk-svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 1.5a10.5 10.5 0 0 0-3.3 20.47c.52.1.72-.23.72-.5v-1.8c-2.93.64-3.55-1.4-3.55-1.4-.48-1.22-1.17-1.54-1.17-1.54-.96-.66.07-.64.07-.64 1.06.07 1.62 1.09 1.62 1.09.94 1.6 2.47 1.14 3.07.87.1-.68.37-1.14.66-1.4-2.34-.27-4.8-1.17-4.8-5.2 0-1.15.41-2.09 1.08-2.83-.1-.27-.47-1.34.1-2.8 0 0 .89-.28 2.9 1.08a10 10 0 0 1 5.27 0c2-1.36 2.9-1.08 2.9-1.08.57 1.46.2 2.53.1 2.8.67.74 1.08 1.68 1.08 2.83 0 4.04-2.47 4.93-4.81 5.19.38.33.71.97.71 1.96v2.9c0 .28.19.61.73.5A10.5 10.5 0 0 0 12 1.5Z" />
      </svg>
    )
  return (
    <svg className="ppk-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

/* ------------------------------------------------------------------ defaults */

const DEFAULT_BRAND = "The Long Weekend Company of New York"
const DEFAULT_NAV: ParkLink[] = [
  { label: "About", href: "#about" },
  { label: "Writing", href: "#letter" },
  { label: "Careers", href: "#careers" },
]
const DEFAULT_LETTER = [
  "We picture a near future where one person directs a small crew of agents, and the agents carry most of the day-to-day weight of running a business. Every owner should have a full staff on call, at any hour, as if they ran a company a hundred times their size.",
  "There are hundreds of millions of businesses in the world, and many more are about to be started. We want every one of them to be agent-native from day one, so that anyone with a good idea can open the doors.",
  "Our name is a promise more than a joke. The work should get done while you are out in the park.",
]
const DEFAULT_DETAILS: ParkDetail[] = [
  { label: "Headquarters", value: "88 Mercer Street, Floor 3\nNew York, NY 10012" },
  { label: "For press", value: "Download press kit", href: "#", kind: "download" },
  { label: "Get in touch", value: "hello@longweekend.example", href: "mailto:hello@longweekend.example", kind: "email" },
]
const DEFAULT_FOOTER: ParkLink[] = [
  { label: "Home", href: "#top" },
  { label: "About", href: "#about" },
  { label: "Writing", href: "#letter" },
  { label: "Careers", href: "#careers" },
  { label: "Privacy Policy", href: "#" },
  { label: "Company", href: "#contact" },
]
const DEFAULT_SOCIALS: ParkSocial[] = [
  { kind: "x", href: "#", label: "X" },
  { kind: "linkedin", href: "#", label: "LinkedIn" },
]

const SCENE_LABEL = { night: "Night", dawn: "Dawn", day: "Day", dusk: "Dusk" }

/* ------------------------------------------------------------------ styles */

const PPK_CSS = `
.ppk-root{--ppk-bg:#fcfcfa;--ppk-card:#ffffff;--ppk-text:#1d2029;--ppk-soft:#5d626d;--ppk-faint:#9a9fa8;--ppk-line:rgba(29,32,41,.1);--ppk-ink:#151a28;--ppk-stripe1:#c3c9d2;--ppk-stripe2:#e4e7eb;--ppk-stripe3:#a9b1bc;--ppk-shadow:0 1px 2px rgba(20,28,48,.06),0 18px 40px -18px rgba(20,28,48,.28);--ppk-serif:"Newsreader","Iowan Old Style","Palatino Linotype",Palatino,"Book Antiqua","URW Palladio L",P052,Georgia,serif;--ppk-sans:"Inter","SF Pro Text",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;position:relative;isolation:isolate;overflow-x:clip;background:var(--ppk-bg);color:var(--ppk-text);font-family:var(--ppk-sans);font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased;transition:background-color .5s ease,color .5s ease}
.ppk-root[data-theme="dark"],.dark .ppk-root[data-theme="auto"]{--ppk-bg:#0a0f1d;--ppk-card:#111829;--ppk-text:#e8ebf3;--ppk-soft:#a5acbc;--ppk-faint:#6c7487;--ppk-line:rgba(255,255,255,.1);--ppk-ink:#e8ebf3;--ppk-stripe1:#1d2740;--ppk-stripe2:#121a2e;--ppk-stripe3:#2a3756;--ppk-shadow:0 1px 2px rgba(0,0,0,.4),0 22px 48px -20px rgba(0,0,0,.8)}
.ppk-root :where(h1,h2,h3,p,ul,li,figure,dl,dt,dd){margin:0;padding:0}
.ppk-root :where(ul){list-style:none}
.ppk-root :where(a){color:inherit;text-decoration:none}
.ppk-root :where(button,input){font:inherit;color:inherit;background:none;border:0;margin:0;padding:0;border-radius:0}
.ppk-root :where(button){cursor:pointer;text-align:inherit}
.ppk-root :where(a,button,input,[tabindex]):focus-visible{outline:2px solid #7ea6ff;outline-offset:3px;border-radius:6px}
.ppk-svg{display:block;max-width:none;flex:none;overflow:visible}
.ppk-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.ppk-serif{font-family:var(--ppk-serif);font-weight:400;letter-spacing:-.02em}
.ppk-pre{opacity:0;transform:translateY(20px)}
.ppk-rv{transition:opacity 1s cubic-bezier(.2,.7,.2,1),transform 1s cubic-bezier(.2,.7,.2,1)}

.ppk-scene{position:absolute;inset:0;overflow:hidden}
.ppk-canvas{position:absolute;display:block;max-width:none;image-rendering:pixelated;image-rendering:crisp-edges;pointer-events:none;transition:transform .9s cubic-bezier(.2,.7,.2,1)}
.ppk-scene[data-drawn="false"] .ppk-canvas{opacity:0}
.ppk-scene .ppk-canvas{transition:transform .9s cubic-bezier(.2,.7,.2,1),opacity .8s ease}

/* nav */
.ppk-navwrap{position:sticky;top:0;z-index:50;height:0}
.ppk-nav{position:absolute;left:50%;top:12px;transform:translateX(-50%);display:flex;align-items:center;gap:2px;padding:4px;border-radius:9px;background:rgba(14,22,46,.42);border:1px solid rgba(255,255,255,.14);-webkit-backdrop-filter:blur(14px) saturate(1.4);backdrop-filter:blur(14px) saturate(1.4);box-shadow:0 10px 30px -14px rgba(0,0,0,.6);color:#f4f6fb;transition:background-color .4s,box-shadow .4s;white-space:nowrap}
.ppk-nav[data-scrolled="true"]{background:rgba(12,18,36,.78)}
.ppk-mark{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;background:rgba(255,255,255,.12);color:#fff;transition:background-color .3s}
.ppk-mark:hover{background:rgba(255,255,255,.22)}
.ppk-mark .ppk-svg{transition:transform .8s cubic-bezier(.3,1.5,.5,1)}
.ppk-mark:hover .ppk-svg{transform:translateY(-1px) rotate(-8deg)}
.ppk-navlinks{display:flex;align-items:center}
.ppk-navlink{position:relative;padding:6px 11px;font-size:12px;border-radius:6px;color:rgba(244,246,251,.82);transition:color .2s,background-color .2s}
.ppk-navlink:hover{color:#fff;background:rgba(255,255,255,.08)}
.ppk-navlink[aria-current="true"]{color:#fff}
.ppk-navlink[aria-current="true"]::after{content:"";position:absolute;left:50%;bottom:1px;width:3px;height:3px;margin-left:-1.5px;border-radius:50%;background:#bcd3ff}
.ppk-cta{display:inline-flex;align-items:center;gap:7px;margin-left:4px;padding:6px 7px 6px 11px;border-radius:6px;background:#0b1020;border:1px solid rgba(255,255,255,.1);color:#fff;font-size:12px;transition:background-color .25s,transform .25s}
.ppk-cta:hover{background:#1a2340;transform:translateY(-1px)}
.ppk-chip{display:inline-flex;align-items:center;justify-content:center;width:15px;height:15px;border-radius:50%;background:rgba(255,255,255,.16);transition:transform .3s}
.ppk-cta:hover .ppk-chip,.ppk-arrowlink:hover .ppk-chip{transform:translateX(2px)}
.ppk-menu{display:none;width:28px;height:28px;border-radius:6px;align-items:center;justify-content:center;color:#fff}
.ppk-menu span{display:block;width:12px;height:1.5px;background:currentColor;box-shadow:0 -4px 0 currentColor,0 4px 0 currentColor;transition:box-shadow .3s,transform .3s}
.ppk-menu[aria-expanded="true"] span{box-shadow:none;transform:rotate(45deg)}
.ppk-sheet{position:absolute;left:50%;top:58px;transform:translateX(-50%);width:min(280px,calc(100vw - 32px));padding:6px;border-radius:10px;background:rgba(12,18,36,.9);border:1px solid rgba(255,255,255,.12);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);display:grid;gap:2px}
.ppk-sheet a{padding:10px 12px;border-radius:7px;color:#f4f6fb;font-size:14px}
.ppk-sheet a:hover{background:rgba(255,255,255,.08)}

/* hero */
.ppk-hero{position:relative;overflow:hidden;background:#040a1a;color:#fff;display:flex;flex-direction:column}
.ppk-hero[data-scene="day"]{background:#2a5a2e}
.ppk-veil{position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(2,6,20,.5) 0%,rgba(2,6,20,.1) 26%,transparent 46%,transparent 80%,rgba(2,6,20,.22) 100%)}
.ppk-hero[data-scene="day"] .ppk-veil{background:linear-gradient(180deg,rgba(10,30,70,.5) 0%,rgba(10,30,70,.16) 30%,transparent 50%)}
.ppk-clock{position:absolute;top:18px;right:clamp(16px,2.4vw,32px);z-index:3;display:inline-flex;align-items:center;gap:7px;padding:5px 8px;border-radius:6px;font-size:11px;font-variant-numeric:tabular-nums;color:rgba(255,255,255,.92);transition:background-color .25s}
.ppk-clock:hover{background:rgba(255,255,255,.1)}
.ppk-clock small{font-size:11px;color:rgba(255,255,255,.55);letter-spacing:.04em}
.ppk-clock .ppk-svg{transition:transform .6s cubic-bezier(.3,1.5,.5,1)}
.ppk-clock:hover .ppk-svg{transform:rotate(-20deg)}
.ppk-herobody{position:relative;z-index:2;width:100%;max-width:1240px;margin:0 auto;padding:clamp(86px,11vh,120px) clamp(16px,3vw,40px) 40px;box-sizing:border-box;pointer-events:none}
.ppk-herobody a,.ppk-herobody button{pointer-events:auto}
.ppk-h1{text-align:center;font-family:var(--ppk-serif);font-weight:400;font-size:clamp(30px,3.7vw,52px);line-height:1.08;letter-spacing:-.025em;color:#fff;text-shadow:0 2px 24px rgba(0,8,30,.55);text-wrap:balance;max-width:13em;margin:0 auto}
.ppk-mission{margin-top:clamp(40px,8vh,84px);margin-left:clamp(0px,10%,140px);width:min(380px,100%);padding:20px 22px 18px;border-radius:7px;background:rgba(150,180,235,.1);border:1px solid rgba(255,255,255,.16);-webkit-backdrop-filter:blur(10px) saturate(1.2);backdrop-filter:blur(10px) saturate(1.2);box-shadow:0 20px 50px -24px rgba(0,0,0,.7);box-sizing:border-box;pointer-events:auto;transition:background-color .35s,border-color .35s,transform .5s cubic-bezier(.2,.7,.2,1)}
.ppk-mission:hover{background:rgba(150,180,235,.16);border-color:rgba(255,255,255,.26);transform:translateY(-2px)}
.ppk-mission h2{font-family:var(--ppk-serif);font-weight:400;font-size:clamp(20px,1.85vw,26px);line-height:1.22;letter-spacing:-.02em;color:#fff;text-wrap:balance}
.ppk-mission p{margin-top:14px;font-size:11.5px;line-height:1.6;color:rgba(255,255,255,.86)}
.ppk-mission b{font-weight:600;color:#fff}
.ppk-mission .ppk-founder{color:#fff;text-decoration:underline;text-decoration-color:rgba(255,255,255,.45);text-underline-offset:3px;transition:text-decoration-color .2s}
.ppk-mission .ppk-founder:hover{text-decoration-color:#fff}
.ppk-mission small{display:block;margin-top:14px;font-size:10.5px;color:rgba(255,255,255,.5)}
.ppk-hint{position:absolute;left:50%;bottom:22px;z-index:2;transform:translateX(-50%);font-size:10.5px;letter-spacing:.06em;color:rgba(255,255,255,.55);pointer-events:none;white-space:nowrap;transition:opacity .6s}
.ppk-hero[data-touched="true"] .ppk-hint{opacity:0}
.ppk-hero[data-intro="play"] .ppk-h1{animation:ppk-rise 1.2s cubic-bezier(.2,.7,.2,1) .15s both}
.ppk-hero[data-intro="play"] .ppk-mission{animation:ppk-rise 1.2s cubic-bezier(.2,.7,.2,1) .45s both}
.ppk-hero[data-intro="play"] .ppk-scene{animation:ppk-dawn 1.6s ease both}
.ppk-hero[data-swap="true"] .ppk-scene{opacity:.15;transition:opacity .25s}
.ppk-hero .ppk-scene{transition:opacity .6s}
@keyframes ppk-rise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
@keyframes ppk-dawn{from{opacity:0;filter:brightness(.4)}to{opacity:1;filter:none}}

.ppk-stripes{display:grid;gap:2px;padding:2px 0;background:var(--ppk-bg)}
.ppk-stripes i{display:block;height:3px;background:var(--ppk-stripe1)}
.ppk-stripes i:nth-child(2){height:2px;background:var(--ppk-stripe3)}
.ppk-stripes i:nth-child(3){height:2px;background:var(--ppk-stripe2)}
.ppk-stripes i:nth-child(4){height:1px;background:var(--ppk-stripe1)}

/* about */
.ppk-sec{position:relative;scroll-margin-top:72px}
.ppk-wrap{width:100%;max-width:1040px;margin:0 auto;padding:0 clamp(16px,3vw,40px);box-sizing:border-box}
.ppk-about{padding:clamp(80px,12vw,150px) 0 clamp(60px,8vw,90px);text-align:center}
.ppk-kicker{max-width:34em;margin:0 auto;font-size:11.5px;line-height:1.6;color:var(--ppk-soft);text-wrap:balance}
.ppk-h2{margin:18px auto 0;max-width:15em;font-family:var(--ppk-serif);font-weight:400;font-size:clamp(28px,3.1vw,42px);line-height:1.16;letter-spacing:-.025em;color:var(--ppk-text);text-wrap:balance}
.ppk-letterwrap{position:relative;width:min(400px,100%);margin:clamp(48px,7vw,80px) auto 0;text-align:left}
.ppk-letter{position:relative;padding:28px 30px 26px;border-radius:5px;background:var(--ppk-card);box-shadow:var(--ppk-shadow);border:1px solid var(--ppk-line);font-size:11.5px;line-height:1.62;color:var(--ppk-text);transition:transform .6s cubic-bezier(.2,.7,.2,1),box-shadow .6s;transform:rotate(var(--ppk-tilt,0deg))}
.ppk-letter p+p{margin-top:12px}
.ppk-signoff{margin-top:32px}
.ppk-signers{color:var(--ppk-faint)}
.ppk-sigs{display:flex;align-items:flex-end;gap:10px;margin-top:6px;color:var(--ppk-text);min-height:53px}
.ppk-sig path{stroke-dasharray:1;stroke-dashoffset:0}
.ppk-sig[data-play="true"] path{animation:ppk-sign 1.8s cubic-bezier(.5,.1,.3,1) both}
.ppk-sig[data-play="true"]+.ppk-sig path{animation-delay:1.3s}
@keyframes ppk-sign{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
.ppk-stamp{position:absolute;right:-132px;bottom:-40px;z-index:2;width:176px;padding:8px;box-sizing:border-box;background:#fbfaf6;filter:drop-shadow(0 8px 14px rgba(20,28,48,.25));transform:rotate(7deg);transition:transform .5s cubic-bezier(.3,1.4,.5,1);cursor:pointer;--ppk-perf:radial-gradient(circle at 50% 50%,transparent 3.2px,#000 3.6px);-webkit-mask:var(--ppk-perf) -5px -5px/10px 10px,linear-gradient(#000,#000) 5px 5px/calc(100% - 10px) calc(100% - 10px) no-repeat;mask:var(--ppk-perf) -5px -5px/10px 10px,linear-gradient(#000,#000) 5px 5px/calc(100% - 10px) calc(100% - 10px) no-repeat}
.ppk-stamp:hover{transform:rotate(3deg) translateY(-4px) scale(1.04)}
.ppk-stamp:active{transform:rotate(3deg) scale(.98)}
.ppk-stampart{position:relative;aspect-ratio:64/46;overflow:hidden;outline:1px solid rgba(0,0,0,.08)}
.ppk-stampart .ppk-scene{position:absolute;inset:0}
.ppk-stampval{position:absolute;right:4px;top:3px;z-index:1;font:700 9px/1 var(--ppk-serif);color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.3)}
.ppk-stampcity{position:absolute;left:4px;bottom:3px;z-index:1;font:600 6.5px/1 var(--ppk-sans);letter-spacing:.14em;color:#fff;text-transform:uppercase;text-shadow:0 1px 0 rgba(0,0,0,.35)}
.ppk-postmark{position:absolute;right:-10px;bottom:56px;z-index:3;width:150px;height:80px;color:rgba(30,40,70,.72);pointer-events:none;mix-blend-mode:multiply;animation:ppk-thunk .45s cubic-bezier(.3,1.6,.5,1) both}
.ppk-root[data-theme="dark"] .ppk-postmark,.dark .ppk-root[data-theme="auto"] .ppk-postmark{color:rgba(205,215,240,.78);mix-blend-mode:normal}
@keyframes ppk-thunk{from{opacity:0;transform:scale(1.5) rotate(-8deg)}to{opacity:1;transform:none}}

/* careers */
.ppk-careers{padding:clamp(80px,11vw,140px) 0 0}
.ppk-card{position:relative;width:100%;max-width:780px;margin:0 auto;aspect-ratio:1.66;min-height:360px;border-radius:9px;overflow:hidden;background:#5d90d6;box-shadow:var(--ppk-shadow);isolation:isolate;transition:transform .6s cubic-bezier(.2,.7,.2,1)}
.ppk-card:hover{transform:translateY(-3px)}
.ppk-card .ppk-scene{cursor:crosshair}
.ppk-glass{position:absolute;left:clamp(12px,2.2%,20px);top:clamp(12px,3.4%,22px);z-index:2;width:min(300px,calc(100% - 24px));padding:20px 20px 18px;border-radius:7px;box-sizing:border-box;color:#fff;background:rgba(110,150,215,.24);border:1px solid rgba(255,255,255,.28);-webkit-backdrop-filter:blur(12px) saturate(1.3);backdrop-filter:blur(12px) saturate(1.3);background-image:radial-gradient(240px circle at var(--ppk-gx,30%) var(--ppk-gy,0%),rgba(255,255,255,.2),transparent 70%)}
.ppk-glass h2{font-family:var(--ppk-serif);font-weight:400;font-size:clamp(22px,2.2vw,30px);line-height:1.12;letter-spacing:-.02em;text-wrap:balance}
.ppk-glass p{margin-top:16px;font-size:11.5px;line-height:1.6;color:rgba(255,255,255,.9)}
.ppk-arrowlink{display:inline-flex;align-items:center;gap:6px;margin-top:20px;font-size:11.5px;text-decoration:underline;text-decoration-color:rgba(255,255,255,.5);text-underline-offset:3px}
.ppk-arrowlink .ppk-chip{background:rgba(255,255,255,.22)}
.ppk-tip{position:absolute;right:12px;bottom:10px;z-index:2;font-size:10px;letter-spacing:.04em;color:rgba(255,255,255,.75);pointer-events:none;text-shadow:0 1px 4px rgba(0,20,60,.6)}
.ppk-details{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:28px 40px;width:100%;max-width:620px;margin:34px auto 0;padding:0 8px;box-sizing:border-box}
.ppk-details dt{font-size:10.5px;color:var(--ppk-faint)}
.ppk-details dd{margin-top:6px;font-size:11.5px;line-height:1.55;white-space:pre-line;color:var(--ppk-text)}
.ppk-details a{display:inline-flex;align-items:center;gap:6px;text-decoration:underline;text-decoration-color:var(--ppk-line);text-underline-offset:3px;transition:text-decoration-color .2s}
.ppk-details a:hover{text-decoration-color:currentColor}
.ppk-details .ppk-chip{width:14px;height:14px;background:transparent;border:1px solid var(--ppk-line)}
.ppk-copy{margin-left:8px;padding:2px 7px;border-radius:999px;border:1px solid var(--ppk-line)!important;font-size:10px;color:var(--ppk-soft);transition:color .2s,border-color .2s}
.ppk-copy:hover{color:var(--ppk-text)}

/* closing + footer */
.ppk-closing{padding:clamp(90px,12vw,150px) 0 clamp(70px,9vw,110px);text-align:center}
.ppk-closing .ppk-svg{margin:0 auto;color:var(--ppk-soft)}
.ppk-closing .ppk-h2{margin-top:22px;max-width:14em}
.ppk-closing p{margin-top:22px;font-size:11px;color:var(--ppk-soft)}
.ppk-closing p a{display:inline-flex;align-items:center;gap:5px;color:var(--ppk-text);text-decoration:underline;text-decoration-color:var(--ppk-line);text-underline-offset:3px}
.ppk-closing .ppk-chip{width:13px;height:13px;background:transparent;border:1px solid var(--ppk-line)}
.ppk-foot{display:flex;align-items:center;justify-content:space-between;gap:20px 28px;flex-wrap:wrap;width:100%;max-width:880px;margin:0 auto;padding:0 clamp(16px,3vw,40px) 26px;box-sizing:border-box}
.ppk-footlinks{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:10.5px;color:var(--ppk-soft)}
.ppk-footlinks a{transition:color .2s}
.ppk-footlinks a:hover{color:var(--ppk-text)}
.ppk-footend{display:flex;align-items:center;gap:8px}
.ppk-sub{position:relative;display:flex;align-items:center;height:30px;width:min(230px,58vw);padding:0 3px 0 11px;border-radius:7px;border:1px solid var(--ppk-line);background:var(--ppk-card);box-sizing:border-box;transition:border-color .2s,box-shadow .2s}
.ppk-sub:focus-within{border-color:color-mix(in oklab,var(--ppk-text) 35%,transparent)}
.ppk-sub[data-state="error"]{border-color:#d4545e;animation:ppk-shake .4s}
.ppk-sub input{flex:1;min-width:0;height:100%;font-size:11px;outline:none}
.ppk-sub input::placeholder{color:var(--ppk-faint)}
.ppk-sub button{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:5px;color:var(--ppk-soft);transition:background-color .2s,color .2s}
.ppk-sub button:hover{background:color-mix(in oklab,var(--ppk-text) 7%,transparent);color:var(--ppk-text)}
.ppk-sub .ppk-chip{width:14px;height:14px;background:transparent;border:1px solid var(--ppk-line)}
.ppk-note{position:absolute;left:0;top:calc(100% + 6px);font-size:10.5px;white-space:nowrap;color:var(--ppk-soft)}
.ppk-sub[data-state="error"] .ppk-note{color:#d4545e}
.ppk-social{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:7px;border:1px solid var(--ppk-line);background:var(--ppk-card);color:var(--ppk-text);transition:transform .25s,border-color .2s}
.ppk-social:hover{transform:translateY(-2px);border-color:color-mix(in oklab,var(--ppk-text) 30%,transparent)}
@keyframes ppk-shake{20%,60%{transform:translateX(-4px)}40%,80%{transform:translateX(4px)}}
.ppk-winter{position:relative;height:clamp(190px,27vw,400px);overflow:hidden;background:#0e1f4a}
.ppk-winter .ppk-scene{cursor:crosshair}
.ppk-credits{position:absolute;left:0;right:0;bottom:0;z-index:2;display:flex;justify-content:space-between;gap:16px;padding:26px clamp(16px,3vw,40px) 10px;background:linear-gradient(180deg,transparent,rgba(12,24,60,.55));font-size:10px;color:rgba(255,255,255,.88);text-shadow:0 1px 6px rgba(0,10,40,.6);pointer-events:none}

@media (max-width:760px){
  .ppk-navlinks{display:none}
  .ppk-menu{display:inline-flex}
  .ppk-mission{margin-left:auto;margin-right:auto}
  .ppk-clock{top:58px;right:50%;transform:translateX(50%)}
  .ppk-herobody{padding-top:104px}
  .ppk-stamp{right:-6px;bottom:-78px;width:124px}
  .ppk-postmark{right:62px;bottom:-62px;width:120px;height:64px}
  .ppk-letterwrap{margin-bottom:60px}
  .ppk-card{aspect-ratio:auto;height:560px;min-height:0}
  .ppk-glass{width:calc(100% - 24px)}
  .ppk-tip{display:none}
  .ppk-details{grid-template-columns:minmax(0,1fr);gap:22px}
  .ppk-foot{justify-content:center}
  .ppk-footlinks{justify-content:center}
}
@media (max-width:420px){
  .ppk-cta{padding:6px 7px}
  .ppk-cta .ppk-ctalabel{max-width:96px;overflow:hidden;text-overflow:ellipsis}
}
@media (prefers-reduced-motion:reduce){
  .ppk-root *,.ppk-root *::before,.ppk-root *::after{animation:none!important;transition:none!important}
  .ppk-canvas{transform:none!important}
  .ppk-pre{opacity:1;transform:none}
}
`

/* ------------------------------------------------------------------ hooks */

const useIsoLayoutEffect = typeof window === "undefined" ? React.useEffect : React.useLayoutEffect

function useReducedMotion() {
  const [reduced, setReduced] = React.useState(false)
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const on = () => setReduced(mq.matches)
    on()
    mq.addEventListener?.("change", on)
    return () => mq.removeEventListener?.("change", on)
  }, [])
  return reduced
}

const heroPixel = (cw: number) => Math.max(2, Math.round(cw / 330))
const cardPixel = (cw: number) => Math.max(2, Math.round(cw / 240))
const stampPixel = (cw: number) => cw / 64
const winterPixel = (cw: number) => Math.max(2, Math.round(cw / 340))

/* ------------------------------------------------------------------ component */

export default function PixelParkTemplate({
  brand = DEFAULT_BRAND,
  city = "New York",
  cityCode = "NYC",
  timeZone = "America/New_York",
  logo,
  nav = DEFAULT_NAV,
  cta = { label: "Get early access", href: "#updates" },
  mission,
  manifesto,
  letter,
  careers,
  details = DEFAULT_DETAILS,
  closing,
  footerLinks = DEFAULT_FOOTER,
  socials = DEFAULT_SOCIALS,
  subscribePlaceholder = "Get updates in your inbox",
  onSubscribe,
  copyright,
  credit = "Painted pixel by pixel",
  scene = "night",
  seed = 7,
  theme = "auto",
  animateIn = true,
  height = "100svh",
  className = "",
}: PixelParkTemplateProps) {
  const root = React.useRef(null as HTMLDivElement | null)
  const hero = React.useRef(null as HTMLElement | null)
  const emailRef = React.useRef(null as HTMLInputElement | null)
  const letterRef = React.useRef(null as HTMLDivElement | null)
  const glassRef = React.useRef(null as HTMLDivElement | null)
  const reduced = useReducedMotion()

  const m = {
    title: "Our mission is to let one person run a company that runs itself.",
    founded: "March 2025",
    founders: [{ name: "Mara Quinn" }, { name: "Ilya Ostrova" }],
    tail: "to make that ordinary.",
    backedBy: "Backed by Lantern Fund & Pier Seventeen Partners",
    ...mission,
  }
  const mf = {
    kicker: "Software was supposed to give us our evenings back. Instead, every new tool asks for a little more of the day.",
    title: "So we build the agents that take the work, and hand back the time.",
    ...manifesto,
  }
  const lt = {
    paragraphs: DEFAULT_LETTER,
    signoff: "with love from " + cityCode + ",",
    signers: m.founders.map((f) => f.name.split(" ")[0]),
    stampValue: "75¢",
    ...letter,
  }
  const cr = {
    title: "Come build the future in " + city + ".",
    body: "We believe the next wave of software will be built by small, devoted teams armed with very capable agents.",
    action: { label: "See open roles", href: "#contact" },
    ...careers,
  }
  const cl = {
    title: "We're building tools for businesses that run themselves",
    body: "If that sounds like your kind of work,",
    action: { label: "come work with us", href: "#careers" },
    ...closing,
  }
  const year = 2025
  const copy = copyright ?? "© " + brand + " " + year

  const [now, setNow] = React.useState(null as Date | null)
  const [sceneNow, setSceneNow] = React.useState(resolveScene(scene === "auto" ? "night" : scene))
  const [swap, setSwap] = React.useState(false)
  const [scrolled, setScrolled] = React.useState(false)
  const [menu, setMenu] = React.useState(false)
  const [active, setActive] = React.useState(null as string | null)
  const [introPlay, setIntroPlay] = React.useState(false)
  const [touched, setTouched] = React.useState(false)
  const [signed, setSigned] = React.useState(false)
  const [stamped, setStamped] = React.useState(null as string | null)
  const [copied, setCopied] = React.useState(false)
  const [email, setEmail] = React.useState("")
  const [subState, setSubState] = React.useState("idle" as "idle" | "error" | "sending" | "done")
  const [subNote, setSubNote] = React.useState("")

  useIsoLayoutEffect(() => {
    if (animateIn && !reduced) setIntroPlay(true)
  }, [animateIn, reduced])

  // the clock, and the park following it when scene="auto"
  React.useEffect(() => {
    const tick = () => setNow(new Date())
    tick()
    const id = window.setInterval(tick, 10000)
    return () => window.clearInterval(id)
  }, [])
  React.useEffect(() => {
    if (scene === "auto") setSceneNow(sceneForHour(hourIn(new Date(), timeZone)))
    else setSceneNow(resolveScene(scene))
  }, [scene, timeZone])

  React.useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24)
    on()
    window.addEventListener("scroll", on, { passive: true })
    return () => window.removeEventListener("scroll", on)
  }, [])

  React.useEffect(() => {
    const el = root.current
    if (!el || typeof IntersectionObserver === "undefined") return
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) if (e.isIntersecting) setActive((e.target as HTMLElement).dataset.sec ?? null)
      },
      { rootMargin: "-45% 0px -50% 0px" }
    )
    el.querySelectorAll("[data-sec]").forEach((s) => io.observe(s))
    return () => io.disconnect()
  }, [])

  // the letter signs itself when it comes into view
  React.useEffect(() => {
    const el = letterRef.current
    if (!el) return
    if (reduced || typeof IntersectionObserver === "undefined") {
      setSigned(true)
      return
    }
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          setSigned(true)
          io.disconnect()
        }
      },
      { rootMargin: "0px 0px -20% 0px" }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [reduced])

  // Reveal on scroll. Only what starts below the fold is hidden, and only once
  // JS runs, so server-rendered and captured pages are never blank.
  useIsoLayoutEffect(() => {
    const el = root.current
    if (!el || reduced || typeof IntersectionObserver === "undefined") return
    const items = Array.from(el.querySelectorAll("[data-rv]")) as HTMLElement[]
    const below = items.filter((n) => n.getBoundingClientRect().top > window.innerHeight * 0.92)
    below.forEach((n) => n.classList.add("ppk-pre"))
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          if (!e.isIntersecting) continue
          const n = e.target as HTMLElement
          n.classList.add("ppk-rv")
          n.classList.remove("ppk-pre")
          io.unobserve(n)
        }
      },
      { rootMargin: "0px 0px -8% 0px" }
    )
    below.forEach((n) => io.observe(n))
    return () => {
      io.disconnect()
      // reduced motion can arrive after the first paint; never leave anything hidden
      below.forEach((n) => n.classList.remove("ppk-pre"))
    }
  }, [reduced])

  const animate = !reduced

  const paintHero = React.useCallback(
    (W: number, H: number): Painted => {
      const p = paintPark(W, H, seed, sceneNow)
      return { layers: [p.bg, p.fg], overlay: fireflies(W, H, seed, scenePalette(sceneNow).flies, p.horizon + 4) }
    },
    [seed, sceneNow]
  )
  const paintCard = React.useCallback((W: number, H: number): Painted => {
    const p = paintSkyline(W, H, seed + 1)
    return { layers: [p.bg], overlay: skylineLife(W, H, seed, p.shore) }
  }, [seed])
  const paintPostage = React.useCallback((W: number, H: number): Painted => ({ layers: [paintStamp(W, H, seed + 2)] }), [seed])
  const paintFooter = React.useCallback((W: number, H: number): Painted => {
    const p = paintWinter(W, H, seed + 3)
    return { layers: [p.bg], overlay: snowfall(W, H, seed, p.lamps) }
  }, [seed])

  const onHeroMove = (e: React.PointerEvent) => {
    if (!touched) setTouched(true)
    if (reduced || e.pointerType === "touch") return
    const el = hero.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty("--ppk-px", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3))
    el.style.setProperty("--ppk-py", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3))
  }
  const onHeroLeave = () => {
    const el = hero.current
    if (!el) return
    el.style.setProperty("--ppk-px", "0")
    el.style.setProperty("--ppk-py", "0")
  }

  const cycleScene = () => {
    if (reduced) {
      setSceneNow((s) => nextScene(s))
      return
    }
    setSwap(true)
    window.setTimeout(() => {
      setSceneNow((s) => nextScene(s))
      window.setTimeout(() => setSwap(false), 60)
    }, 230)
  }

  /** In-page links scroll instead of jumping. */
  const onLink = (e: React.MouseEvent, href: string) => {
    setMenu(false)
    if (!href.startsWith("#") || href.length < 2) return
    const id = href.slice(1)
    const el = id === "top" ? root.current : root.current?.querySelector('[data-sec="' + id + '"]')
    if (!el) return
    e.preventDefault()
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" })
    if (id === "updates") window.setTimeout(() => emailRef.current?.focus({ preventScroll: true }), reduced ? 0 : 800)
  }

  const onGlassMove = (e: React.PointerEvent) => {
    const el = glassRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty("--ppk-gx", (((e.clientX - r.left) / r.width) * 100).toFixed(1) + "%")
    el.style.setProperty("--ppk-gy", (((e.clientY - r.top) / r.height) * 100).toFixed(1) + "%")
  }

  const onLetterMove = (e: React.PointerEvent) => {
    if (reduced || e.pointerType === "touch") return
    const el = e.currentTarget as HTMLElement
    const r = el.getBoundingClientRect()
    el.style.setProperty("--ppk-tilt", ((((e.clientX - r.left) / r.width) * 2 - 1) * 0.8).toFixed(2) + "deg")
  }

  const copyEmail = async (value: string) => {
    try {
      await navigator.clipboard?.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEmail(email)) {
      setSubState("error")
      setSubNote("That doesn't look like an email address.")
      return
    }
    setSubState("sending")
    setSubNote("")
    try {
      if (onSubscribe) await onSubscribe(email.trim())
      setSubState("done")
      setSubNote("You're on the list. See you in the park.")
      setEmail("")
    } catch {
      setSubState("error")
      setSubNote("Something went wrong. Please try again.")
    }
  }

  const mark = logo ?? <SunriseMark size={16} />
  const isCurrent = (href: string) => active !== null && href === "#" + active

  const founders = m.founders.map((f, i) => {
    const sep = i === 0 ? "" : i === m.founders.length - 1 ? " and " : ", "
    return (
      <React.Fragment key={f.name}>
        {sep}
        {f.href ? (
          <a className="ppk-founder" href={f.href}>{f.name}</a>
        ) : (
          <span className="ppk-founder">{f.name}</span>
        )}
      </React.Fragment>
    )
  })

  return (
    <div ref={root} className={"ppk-root " + className} data-theme={theme}>
      <style>{PPK_CSS}</style>

      {/* ---------------------------------------------------------------- nav */}
      <div className="ppk-navwrap">
        <header className="ppk-nav" data-scrolled={scrolled || menu ? "true" : "false"}>
          <a href="#top" className="ppk-mark" aria-label={brand + ", back to top"} onClick={(e) => onLink(e, "#top")}>
            {mark}
          </a>
          <nav className="ppk-navlinks" aria-label="Primary">
            {nav.map((l) => (
              <a key={l.label + l.href} href={l.href} className="ppk-navlink" aria-current={isCurrent(l.href) ? "true" : undefined} onClick={(e) => onLink(e, l.href)}>
                {l.label}
              </a>
            ))}
          </nav>
          <a href={cta.href} className="ppk-cta" onClick={(e) => onLink(e, cta.href)}>
            <span className="ppk-ctalabel">{cta.label}</span>
            <ArrowChip />
          </a>
          <button type="button" className="ppk-menu" aria-expanded={menu} aria-label={menu ? "Close menu" : "Open menu"} onClick={() => setMenu((v) => !v)}>
            <span />
          </button>
        </header>
        {menu ? (
          <nav className="ppk-sheet" aria-label="Menu">
            {nav.map((l) => (
              <a key={l.label + l.href} href={l.href} onClick={(e) => onLink(e, l.href)}>
                {l.label}
              </a>
            ))}
          </nav>
        ) : null}
      </div>

      {/* ---------------------------------------------------------------- hero */}
      <section
        ref={hero}
        className="ppk-hero ppk-sec"
        data-sec="top"
        data-scene={sceneNow}
        data-intro={introPlay ? "play" : "off"}
        data-swap={swap ? "true" : "false"}
        data-touched={touched ? "true" : "false"}
        style={{ minHeight: height }}
        onPointerMove={onHeroMove}
        onPointerLeave={onHeroLeave}
        onPointerDown={() => setTouched(true)}
      >
        <PixelScene paint={paintHero} sig={sceneNow + seed} pixel={heroPixel} layers={2} margin={5} depth={[-3, 7]} overlayAt={1} animate={animate} />
        <div className="ppk-veil" aria-hidden="true" />
        <button type="button" className="ppk-clock" onClick={cycleScene} aria-label={"Local time in " + city + ". Change the park to " + SCENE_LABEL[nextScene(sceneNow)].toLowerCase()} title="Change the time of day">
          <SceneIcon scene={sceneNow} />
          <span suppressHydrationWarning>{now ? formatClock(now, timeZone) : "--:--"}</span>
          <small>{cityCode}</small>
        </button>
        <div className="ppk-herobody">
          <h1 className="ppk-h1">{brand}</h1>
          <div className="ppk-mission">
            <h2>{m.title}</h2>
            <p>
              {brand} was founded in <b>{m.founded}</b> by {founders} {m.tail}
            </p>
            {m.backedBy ? <small>{m.backedBy}</small> : null}
          </div>
        </div>
        <p className="ppk-hint" aria-hidden="true">{animate ? (sceneNow === "day" ? "move through the meadow" : "point to gather the fireflies · click to free more") : ""}</p>
      </section>
      <div className="ppk-stripes" aria-hidden="true"><i /><i /><i /><i /></div>

      {/* ---------------------------------------------------------------- about + letter */}
      <section className="ppk-sec ppk-about" data-sec="about">
        <div className="ppk-wrap">
          <p className="ppk-kicker" data-rv>{mf.kicker}</p>
          <h2 className="ppk-h2" data-rv>{mf.title}</h2>
          <div className="ppk-letterwrap ppk-sec" data-sec="letter" data-rv>
            <div className="ppk-letter" ref={letterRef} onPointerMove={onLetterMove} onPointerLeave={(e) => (e.currentTarget as HTMLElement).style.setProperty("--ppk-tilt", "0deg")}>
              {lt.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
              <p className="ppk-signoff">{lt.signoff}</p>
              <p className="ppk-signers">{lt.signers.join(" & ")}</p>
              <div className="ppk-sigs">
                {lt.signers.map((s, i) => (
                  <Signature key={s + i} name={s} seed={seed + i * 17} play={signed && !reduced} />
                ))}
              </div>
            </div>
            <button
              type="button"
              className="ppk-stamp"
              onClick={() => setStamped((v) => (v ? null : postmarkDate(new Date())))}
              aria-pressed={stamped ? "true" : "false"}
              aria-label={stamped ? "Remove the postmark" : "Postmark the letter with today's date"}
            >
              <div className="ppk-stampart">
                <PixelScene paint={paintPostage} sig={"stamp" + seed} pixel={stampPixel} layers={1} animate={false} />
                <span className="ppk-stampval">{lt.stampValue}</span>
                <span className="ppk-stampcity">{city}</span>
              </div>
            </button>
            {stamped ? <Postmark city={city} date={stamped} /> : null}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- careers + details */}
      <section className="ppk-sec ppk-careers" data-sec="careers">
        <div className="ppk-wrap">
          <div className="ppk-card" data-rv>
            <PixelScene paint={paintCard} sig={"card" + seed} pixel={cardPixel} layers={1} animate={animate} />
            <div className="ppk-glass" ref={glassRef} onPointerMove={onGlassMove}>
              <h2>{cr.title}</h2>
              <p>{cr.body}</p>
              <a className="ppk-arrowlink" href={cr.action.href} onClick={(e) => onLink(e, cr.action.href)}>
                {cr.action.label}
                <ArrowChip />
              </a>
            </div>
            {animate ? <span className="ppk-tip" aria-hidden="true">click the sky to scatter birds</span> : null}
          </div>
          <dl className="ppk-details ppk-sec" data-sec="contact" data-rv>
            {details.map((d) => (
              <div key={d.label}>
                <dt>{d.label}</dt>
                <dd>
                  {d.href ? (
                    <a href={d.href}>
                      {d.value}
                      {d.kind === "download" ? <ArrowChip /> : null}
                    </a>
                  ) : (
                    d.value
                  )}
                  {d.kind === "email" ? (
                    <button type="button" className="ppk-copy" onClick={() => copyEmail(d.value)} aria-live="polite">
                      {copied ? "Copied" : "Copy"}
                    </button>
                  ) : null}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ---------------------------------------------------------------- closing + footer */}
      <section className="ppk-sec ppk-closing" data-sec="closing">
        <div className="ppk-wrap" data-rv>
          {logo ?? <SunriseMark size={22} />}
          <h2 className="ppk-h2">{cl.title}</h2>
          <p>
            {cl.body}{" "}
            <a href={cl.action.href} onClick={(e) => onLink(e, cl.action.href)}>
              {cl.action.label}
              <ArrowChip />
            </a>
          </p>
        </div>
      </section>

      <footer className="ppk-sec" data-sec="updates">
        <div className="ppk-foot">
          <nav className="ppk-footlinks" aria-label="Footer">
            {footerLinks.map((l) => (
              <a key={l.label + l.href} href={l.href} onClick={(e) => onLink(e, l.href)}>
                {l.label}
              </a>
            ))}
          </nav>
          <div className="ppk-footend">
            <form className="ppk-sub" data-state={subState} onSubmit={subscribe} noValidate>
              <label className="ppk-sr" htmlFor={"ppk-email-" + seed}>Email address</label>
              <input
                ref={emailRef}
                id={"ppk-email-" + seed}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder={subscribePlaceholder}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (subState === "error") setSubState("idle")
                }}
                aria-invalid={subState === "error"}
              />
              <button type="submit" aria-label="Subscribe" disabled={subState === "sending"}>
                <ArrowChip />
              </button>
              <span className="ppk-note" role="status">{subNote}</span>
            </form>
            {socials.map((s) => (
              <a key={s.kind + s.href} className="ppk-social" href={s.href} aria-label={s.label ?? s.kind}>
                <SocialIcon kind={s.kind} />
              </a>
            ))}
          </div>
        </div>
        <div className="ppk-stripes" aria-hidden="true"><i /><i /><i /><i /></div>
        <div className="ppk-winter">
          <PixelScene paint={paintFooter} sig={"winter" + seed} pixel={winterPixel} layers={1} animate={animate} />
          <div className="ppk-credits">
            <span>{copy}</span>
            <span>{credit}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
