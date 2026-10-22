"use client"

// Dragon Seal Preloader — a film title card that loads, then stays as the
// landing screen. On a sepia stage, a lace of cloud scrolls is engraved round
// the frame as the load climbs, and the eight trigrams on a bronze astrolabe
// light one by one. At 100% a dragon draws itself in, coiled round the seal,
// two hands rise out from behind it (one raised, one open), and the credits
// set themselves in the corner like the opening of a film.
//
// The landing that follows is live: the light and every layer follow the
// pointer, the astrolabe's rule tracks it, and the seal turns. Drag it, tap
// it or use the arrows, and each step brings up the next credit.
//
// One file, React only. Every line is procedural SVG built in the file, the
// paper and film grain are painted onto canvas on mount, and every rule in
// the scoped <style> is .dsp- prefixed. Nothing is fetched.

import * as React from "react"

export interface DragonSealCredit {
  /** Role line in the original script, e.g. "概念设计 | 美术指导". Set small. */
  roles: string
  /** The name, set large. */
  name: string
  /** Role line in Latin script, set tiny and wide. */
  rolesLatin?: string
  /** Name in Latin script, set wide under the name. */
  nameLatin?: string
}

export interface DragonSealLink {
  label: string
  /** Leave out to render a button instead of a link. */
  href?: string
}

export interface DragonSealPalette {
  /** Background. */
  stage: string
  /** The dark inside the seal and the dragon's body. */
  face: string
  /** Engraved lines on the stage. */
  ink: string
  /** Fill of the hands and the seal's rim. */
  paper: string
  /** Lines drawn over the paper fills. */
  shade: string
  /** Light behind the seal. */
  glow: string
  /** Vermilion accent: the brand chop, markers, the notch. */
  seal: string
  /** Interface text. */
  text: string
}

export type DragonSealTone = "sepia" | "jade" | "cinnabar" | "paper"

export interface DragonSealPreloaderProps {
  /**
   * Real loading progress, 0–100. Leave undefined to run the built-in
   * simulated load over `durationMs`. The dragon waits for 100.
   */
  progress?: number
  /** Length of the simulated load. Defaults to 4600ms. */
  durationMs?: number
  /** Open straight on the landing screen, no load. For repeat visits. */
  skipIntro?: boolean
  /** Brand set in the vermilion chop, top left. One or two characters read best. */
  brand?: string
  /** Brand in Latin script beside the chop. */
  brandLatin?: string
  /** Links top right. */
  nav?: DragonSealLink[]
  /** The credits the seal turns through. Two to eight read best. */
  credits?: DragonSealCredit[]
  /** Line set vertically down the right edge. */
  verse?: string
  /** The call to action, bottom right. */
  cta?: DragonSealLink
  /** Fired when the call to action is pressed. */
  onEnter?: () => void
  /** Fired once the landing screen is up. */
  onLoaded?: () => void
  /** Turn to the next credit after this long idle. 0 to never. Defaults to 6500ms. */
  autoAdvanceMs?: number
  /** Colour preset. "paper" is ink on parchment, for light pages. */
  tone?: DragonSealTone
  /** Colour overrides, merged over the tone. */
  palette?: Partial<DragonSealPalette>
  /** Face for the CJK lines. The default stack never fetches anything. */
  fontFamily?: string
  /** Root height. A definite length, never a percentage. */
  height?: string
  /** Extra root class names. */
  className?: string
}

const TONES: Record<DragonSealTone, DragonSealPalette> = {
  sepia: {
    stage: "#15100b",
    face: "#0d0906",
    ink: "#d3b98f",
    paper: "#dcc39b",
    shade: "#2c2015",
    glow: "#ffcf8f",
    seal: "#b5352b",
    text: "#e8d6b6",
  },
  jade: {
    stage: "#08120f",
    face: "#040a08",
    ink: "#a3cdb8",
    paper: "#c6ddcf",
    shade: "#11241b",
    glow: "#86e3bd",
    seal: "#c43d30",
    text: "#d8ece1",
  },
  cinnabar: {
    stage: "#1b0806",
    face: "#110403",
    ink: "#eca67d",
    paper: "#f2c09b",
    shade: "#3b1009",
    glow: "#ff9466",
    seal: "#efc25a",
    text: "#f8ddc9",
  },
  paper: {
    stage: "#e9ddc5",
    face: "#f3ead8",
    ink: "#3b2c1e",
    paper: "#f8f0e1",
    shade: "#3b2c1e",
    glow: "#a8743d",
    seal: "#b3271f",
    text: "#2b1f15",
  },
}

// Invented names: nobody's real credits.
const DEFAULT_CREDITS: DragonSealCredit[] = [
  {
    roles: "概念设计 | 美术指导 | 造型设计",
    name: "墨川",
    rolesLatin: "Concept Design | Art Direction | Character Design",
    nameLatin: "Mo Chuan",
  },
  { roles: "摄影指导", name: "林霁", rolesLatin: "Director of Photography", nameLatin: "Lin Ji" },
  { roles: "原创音乐 | 声音设计", name: "苏遥", rolesLatin: "Original Score | Sound Design", nameLatin: "Su Yao" },
  { roles: "编剧 | 导演", name: "沈岚", rolesLatin: "Written & Directed by", nameLatin: "Shen Lan" },
]

const DEFAULT_NAV: DragonSealLink[] = [{ label: "Story" }, { label: "Cast" }, { label: "Stills" }, { label: "Screenings" }]

const CJK_STACK =
  '"Songti SC", "STSong", "Noto Serif SC", "Noto Serif CJK SC", "Source Han Serif SC", "SimSun", "Hiragino Mincho ProN", serif'
const LATIN_STACK = '"Helvetica Neue", "Avenir Next", Helvetica, Arial, system-ui, sans-serif'
const MONO_STACK = '"JetBrains Mono", "SF Mono", ui-monospace, Menlo, Consolas, monospace'

// The twelve earthly branches, round the rim.
const BRANCHES = "子丑寅卯辰巳午未申酉戌亥"

type Pt = [number, number]

interface Shape {
  fill: string
  line: string
}

interface Hand {
  shapes: Shape[]
  lines: string
}

// #region timeline
// Pure helpers, lifted out and executed by tests/dragon-seal-preloader.test.mjs.

const clamp01 = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x)

// Surges and stalls like a real load instead of a linear tween. [time, progress] knots.
const KNOTS = [
  [0, 0],
  [0.2, 0.26],
  [0.31, 0.29],
  [0.58, 0.66],
  [0.7, 0.7],
  [1, 1],
]

export function dspSimulated(t: number) {
  if (t <= 0) return 0
  if (t >= 1) return 1
  for (let i = 0; i < KNOTS.length - 1; i++) {
    const a = KNOTS[i]
    const b = KNOTS[i + 1]
    if (t <= b[0]) {
      const local = (t - a[0]) / (b[0] - a[0])
      const eased = 1 - Math.pow(1 - local, 3)
      return a[1] + (b[1] - a[1]) * eased
    }
  }
  return 1
}

// Trigrams fully lit at progress p: each owns an eighth of the load.
export function dspLit(p: number) {
  return Math.min(8, Math.floor(clamp01(p) * 8 + 1e-9))
}

// Degrees the seal turns per credit.
export function dspStep(n: number) {
  return 360 / Math.max(1, n)
}

// The credit sitting under the notch when the seal is at this angle.
export function dspIndexAt(angle: number, n: number) {
  const m = Math.max(1, n)
  const k = Math.round(angle / dspStep(m))
  return ((k % m) + m) % m
}

// Nearest resting angle, keeping whole turns so the seal never spins back.
export function dspSnap(angle: number, n: number) {
  const s = dspStep(n)
  return Math.round(angle / s) * s
}

// Shortest signed turn from one credit to another, in steps.
export function dspDelta(from: number, to: number, n: number) {
  const m = Math.max(1, n)
  let d = (((to - from) % m) + m) % m
  if (d > m / 2) d -= m
  return d
}

// Wrap degrees into (-180, 180].
export function dspWrap(deg: number) {
  let d = deg % 360
  if (d > 180) d -= 360
  if (d <= -180) d += 360
  return d
}

// Film timecode, hh:mm:ss:ff.
export function dspTimecode(ms: number, fps: number) {
  const f = Math.max(0, Math.floor((ms / 1000) * fps))
  const two = (v: number) => String(v).padStart(2, "0")
  return two(Math.floor(f / (fps * 3600))) + ":" + two(Math.floor(f / (fps * 60)) % 60) + ":" + two(Math.floor(f / fps) % 60) + ":" + two(f % fps)
}

// Seeded so every mount engraves the same stipple.
export function dspRng(seed: number) {
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

// #region art
// The engraving, all in one 1000 × 1000 box centred on the seal (radius 200).
// Pure maths with no DOM, so it is safe to build during render, and on a server.

// The eight trigrams, read from the inside out (true is an unbroken line), with
// the name the loader calls out as each one lights.
export const DSP_TRIGRAMS = [
  { lines: [true, true, true], han: "乾", name: "Heaven" },
  { lines: [true, true, false], han: "兑", name: "Lake" },
  { lines: [true, false, true], han: "离", name: "Fire" },
  { lines: [true, false, false], han: "震", name: "Thunder" },
  { lines: [false, true, true], han: "巽", name: "Wind" },
  { lines: [false, true, false], han: "坎", name: "Water" },
  { lines: [false, false, true], han: "艮", name: "Mountain" },
  { lines: [false, false, false], han: "坤", name: "Earth" },
]

const r1 = (n: number) => Math.round(n * 10) / 10
const pt = (p: Pt) => r1(p[0]) + " " + r1(p[1])
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const sstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const unit = (a: Pt, b: Pt): Pt => {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const l = Math.hypot(dx, dy) || 1
  return [dx / l, dy / l]
}

// Catmull-Rom through the points, written out as cubic Béziers.
export function dspSmooth(pts: Pt[], closed: boolean) {
  const n = pts.length
  if (n < 2) return ""
  const get = (i: number) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))])
  let d = "M" + pt(pts[0])
  const last = closed ? n : n - 1
  for (let i = 0; i < last; i++) {
    const p0 = get(i - 1)
    const p1 = get(i)
    const p2 = get(i + 1)
    const p3 = get(i + 2)
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += "C" + pt(c1) + " " + pt(c2) + " " + pt(p2)
  }
  return closed ? d + "Z" : d
}

export function dspSpiral(cx: number, cy: number, r: number, turns: number, a0: number, dir: number, tight: number) {
  const pts: Pt[] = []
  const steps = Math.max(8, Math.round(turns * 18))
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const a = a0 + dir * t * turns * Math.PI * 2
    const rr = r * (1 - tight * t)
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr])
  }
  return pts
}

// Scale, mirror, rotate (radians) and move a set of local points.
function place(pts: Pt[], x: number, y: number, s: number, rot: number, flip: number) {
  const c = Math.cos(rot)
  const sn = Math.sin(rot)
  return pts.map(([px, py]): Pt => {
    const lx = px * s * flip
    const ly = py * s
    return [x + lx * c - ly * sn, y + lx * sn + ly * c]
  })
}

function circle(r: number) {
  const a = r1(r)
  return "M" + a + " 0A" + a + " " + a + " 0 1 1 " + -a + " 0A" + a + " " + a + " 0 1 1 " + a + " 0Z"
}

function ticks(rA: number, rB: number, n: number, every: number, rLong: number) {
  let d = ""
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const r2 = every > 0 && i % every === 0 ? rLong : rB
    d += "M" + pt([Math.cos(a) * rA, Math.sin(a) * rA]) + "L" + pt([Math.cos(a) * r2, Math.sin(a) * r2])
  }
  return d
}

function stipple(rIn: number, rOut: number, n: number, seed: number) {
  const rnd = dspRng(seed)
  let d = ""
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2
    const r = rIn + (rOut - rIn) * Math.sqrt(rnd())
    d += "M" + pt([Math.cos(a) * r, Math.sin(a) * r]) + "h0"
  }
  return d
}

// ---- the cloud scroll (xiangyun): three curls under a cap, and a tail ----------
const CLOUD: Pt[][] = [
  dspSpiral(0, 0.02, 0.44, 1.35, Math.PI, 1, 0.82),
  dspSpiral(0, 0.02, 0.31, 1.0, Math.PI, 1, 0.75),
  dspSpiral(-0.66, 0.16, 0.26, 1.2, 0, -1, 0.8),
  dspSpiral(0.64, 0.14, 0.24, 1.2, Math.PI, 1, 0.8),
  [
    [-0.92, 0.16],
    [-0.86, -0.12],
    [-0.6, -0.26],
    [-0.4, -0.36],
    [-0.2, -0.56],
    [0.12, -0.6],
    [0.38, -0.42],
    [0.52, -0.26],
    [0.8, -0.2],
    [0.9, 0.06],
  ],
  [
    [0.86, 0.3],
    [1.12, 0.36],
    [1.38, 0.3],
    [1.7, 0.08],
  ],
  [
    [0.7, 0.38],
    [1.05, 0.48],
    [1.4, 0.4],
    [1.7, 0.08],
  ],
]

export function dspCloud(x: number, y: number, s: number, rot: number, flip: number) {
  let d = ""
  for (const part of CLOUD) d += dspSmooth(place(part, x, y, s, rot, flip), false)
  return d
}

// A flame: two strokes meeting at a tip that curls over.
function flame(at: Pt, ang: number, len: number, w: number, bend: number) {
  const d: Pt = [Math.cos(ang), Math.sin(ang)]
  const n: Pt = [-d[1], d[0]]
  const p = (u: number, v: number): Pt => [at[0] + d[0] * u + n[0] * v, at[1] + d[1] * u + n[1] * v]
  const tip = p(len, bend * len * 0.34)
  const curl = dspSpiral(
    tip[0] - n[0] * bend * len * 0.08,
    tip[1] - n[1] * bend * len * 0.08,
    len * 0.08,
    1,
    Math.atan2(n[1] * bend, n[0] * bend),
    bend,
    0.7,
  )
  const outline = [p(0, w), p(len * 0.42, w * 0.8 + bend * len * 0.1), p(len * 0.78, bend * len * 0.3 + w * 0.25), tip]
  const back = [tip, p(len * 0.84, bend * len * 0.3 - w * 0.1), p(len * 0.5, -w * 0.4 + bend * len * 0.14), p(0, -w)]
  return {
    fill: dspSmooth([...outline, ...back.slice(1)], true),
    line: dspSmooth(outline, false) + dspSmooth(back, false) + dspSmooth(curl, false),
  }
}

// A finger (or a limb) as one outline through its joints with a round end. The
// line leaves the base open so it melts into whatever it grows from.
function finger(joints: Pt[], radii: number[]) {
  const n = joints.length
  const dirs = joints.map((_, i) => unit(joints[Math.max(0, i - 1)], joints[Math.min(n - 1, i + 1)]))
  const left: Pt[] = []
  const right: Pt[] = []
  joints.forEach((p, i) => {
    const [ux, uy] = dirs[i]
    right.push([p[0] - uy * radii[i], p[1] + ux * radii[i]])
    left.push([p[0] + uy * radii[i], p[1] - ux * radii[i]])
  })
  const tip = joints[n - 1]
  const [ux, uy] = dirs[n - 1]
  const r = radii[n - 1]
  const cap: Pt[] = []
  for (let k = 1; k < 6; k++) {
    const a = (k / 6) * Math.PI
    const c = Math.cos(a) * r
    const f = Math.sin(a) * r
    cap.push([tip[0] - uy * c + ux * f, tip[1] + ux * c + uy * f])
  }
  const pts = [...right, ...cap, ...left.reverse()]
  return { fill: dspSmooth(pts, true), line: dspSmooth(pts, false) }
}

function crease(p: Pt, dir: Pt, w: number, bow: number) {
  const n: Pt = [-dir[1], dir[0]]
  const a: Pt = [p[0] + n[0] * w, p[1] + n[1] * w]
  const b: Pt = [p[0] - n[0] * w, p[1] - n[1] * w]
  const c: Pt = [p[0] + dir[0] * bow, p[1] + dir[1] * bow]
  return "M" + pt(a) + "Q" + pt(c) + " " + pt(b)
}

function nail(tip: Pt, dir: Pt, w: number, len: number) {
  const n: Pt = [-dir[1], dir[0]]
  const p = (u: number, v: number): Pt => [tip[0] + dir[0] * u + n[0] * v, tip[1] + dir[1] * u + n[1] * v]
  return dspSmooth([p(-len, -w), p(-len * 0.1, -w * 0.95), p(len * 0.25, 0), p(-len * 0.1, w * 0.95), p(-len, w), p(-len * 1.08, 0)], true)
}

// ---- the outer lace -------------------------------------------------------------
function ringLace(rIn: number, rOut: number, count: number) {
  let d = ""
  const w = rOut - rIn
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2
    const odd = i % 2 === 1
    const r = rIn + w * (odd ? 0.34 : 0.64)
    d += dspCloud(Math.cos(a) * r, Math.sin(a) * r, w * 0.36, a + Math.PI / 2 + (odd ? 0 : Math.PI), odd ? 1 : -1)
    const a2 = ((i + 0.5) / count) * Math.PI * 2
    const r2 = rIn + w * (odd ? 0.78 : 0.2)
    d += dspSmooth(dspSpiral(Math.cos(a2) * r2, Math.sin(a2) * r2, w * 0.1, 1.3, a2, odd ? 1 : -1, 0.8), false)
  }
  return d
}

// ---- the seal -------------------------------------------------------------------
function petals(rIn: number, rOut: number, n: number, phase: number) {
  let d = ""
  for (let i = 0; i < n; i++) {
    const a0 = ((i + phase) / n) * Math.PI * 2
    const a1 = ((i + phase + 1) / n) * Math.PI * 2
    const am = (a0 + a1) / 2
    const p0: Pt = [Math.cos(a0) * rIn, Math.sin(a0) * rIn]
    const p1: Pt = [Math.cos(a1) * rIn, Math.sin(a1) * rIn]
    const tip: Pt = [Math.cos(am) * rOut, Math.sin(am) * rOut]
    const k = (rOut - rIn) * 0.7
    const c0: Pt = [p0[0] + Math.cos(a0) * k, p0[1] + Math.sin(a0) * k]
    const c1: Pt = [p1[0] + Math.cos(a1) * k, p1[1] + Math.sin(a1) * k]
    d += "M" + pt(p0) + "Q" + pt(c0) + " " + pt(tip) + "Q" + pt(c1) + " " + pt(p1)
    const rm = rIn + (rOut - rIn) * 0.55
    d += "M" + pt([Math.cos(am) * (rIn + 2), Math.sin(am) * (rIn + 2)]) + "L" + pt([Math.cos(am) * rm, Math.sin(am) * rm])
  }
  return d
}

// A square with a T-shaped gate in each side: the palace at a mandala's heart.
function palace(h: number, gate: number, depth: number) {
  const pts: Pt[] = []
  for (let k = 0; k < 4; k++) {
    const rot = (k * Math.PI) / 2
    const c = Math.cos(rot)
    const s = Math.sin(rot)
    const side: Pt[] = [
      [-h, -h],
      [-gate, -h],
      [-gate, -h - depth],
      [-gate * 1.6, -h - depth],
      [-gate * 1.6, -h - depth * 2],
      [gate * 1.6, -h - depth * 2],
      [gate * 1.6, -h - depth],
      [gate, -h - depth],
      [gate, -h],
    ]
    for (const [x, y] of side) pts.push([x * c - y * s, x * s + y * c])
  }
  return "M" + pts.map(pt).join("L") + "Z"
}

// Tiny cells between the palace walls and the inner lotus, like a city plan.
function lattice() {
  let d = ""
  for (let x = -66; x <= 66; x += 9) {
    for (let y = -66; y <= 66; y += 9) {
      const r = Math.hypot(x, y)
      if (r < 64 || Math.abs(x) < 16 || Math.abs(y) < 16) continue
      d += "M" + pt([x - 2.6, y - 2.6]) + "h5.2v5.2h-5.2Z"
    }
  }
  return d
}

function trigram(lines: boolean[], a: number, r: number, w: number) {
  let d = ""
  const t: Pt = [-Math.sin(a), Math.cos(a)]
  const n: Pt = [Math.cos(a), Math.sin(a)]
  lines.forEach((solid, k) => {
    const rr = r + (k - 1) * 6.5
    const c: Pt = [n[0] * rr, n[1] * rr]
    const seg = (u0: number, u1: number) => {
      d += "M" + pt([c[0] + t[0] * u0, c[1] + t[1] * u0]) + "L" + pt([c[0] + t[0] * u1, c[1] + t[1] * u1])
    }
    if (solid) seg(-w, w)
    else {
      seg(-w, -w * 0.22)
      seg(w * 0.22, w)
    }
  })
  return d
}

// ---- the dragon -----------------------------------------------------------------
function dragonHead(at: Pt, rot: number, s: number) {
  const parts: Pt[][] = [
    // skull, brow, snout and the nose that curls up at the end
    [[-10, -20], [6, -34], [22, -44], [34, -52], [48, -46], [62, -38], [82, -36], [100, -38], [108, -46], [118, -42], [121, -30], [116, -20]],
    // upper lip back to the corner of the mouth, and its fangs
    [[116, -20], [104, -14], [88, -10], [72, -6], [58, -2]],
    [[104, -14], [101, -4], [97, -12]],
    [[88, -10], [84, 4], [80, -8]],
    [[72, -6], [70, 1], [66, -4]],
    // lower jaw, dropped open
    [[58, -2], [70, 7], [84, 14], [95, 19], [99, 26], [90, 31], [72, 31], [52, 28], [32, 24], [12, 21], [-6, 18]],
    [[90, 18], [88, 9], [84, 16]],
    [[76, 12], [75, 5], [71, 10]],
    // forked tongue
    [[64, 6], [82, 8], [100, 4], [116, -2], [128, 4], [134, -4]],
    [[128, 4], [136, 8]],
    // eyelid and the bag under the eye
    [[34, -36], [44, -41], [55, -35]],
    [[30, -22], [44, -18], [56, -24]],
    // ridges down the snout
    [[60, -30], [80, -28], [100, -30]],
    [[64, -24], [84, -22], [104, -24]],
    // whiskers, long and curling
    [[114, -24], [132, -32], [150, -52], [158, -76], [148, -92], [136, -86], [140, -76]],
    [[106, -14], [126, -2], [146, 16], [158, 38], [150, 54], [138, 48], [142, 38]],
    // beard
    [[100, 40], [96, 56], [86, 70]],
    [[90, 40], [82, 58], [70, 66]],
  ]
  let line = ""
  for (const p of parts) line += dspSmooth(place(p, at[0], at[1], s, rot, 1), false)
  for (const [x, y, r, dir] of [
    [36, -50, 7, 1],
    [108, -38, 5, -1],
    [8, -30, 6, 1],
  ]) {
    line += dspSmooth(place(dspSpiral(x, y, r, 1.2, Math.PI, dir, 0.8), at[0], at[1], s, rot, 1), false)
  }
  let maneFill = ""
  let maneLine = ""
  for (const [x, y, a, len, w, bend] of [
    [6, -30, Math.PI + 0.55, 62, 10, -1],
    [0, -16, Math.PI + 0.22, 76, 11, 1],
    [0, 0, Math.PI - 0.08, 70, 10, -1],
    [6, 14, Math.PI - 0.42, 60, 9, 1],
    [16, 22, Math.PI - 0.85, 48, 8, -1],
    [44, 10, Math.PI - 1.0, 34, 6, 1],
    [32, 18, Math.PI - 0.75, 30, 5, -1],
  ]) {
    const f = flame(place([[x, y]], at[0], at[1], s, rot, 1)[0], a + rot, len * s, w * s, bend)
    maneFill += f.fill
    maneLine += f.line
  }
  // skull and jaw are filled apart so the open mouth stays open
  const skull: Pt[] = [[-10, -20], [6, -34], [22, -44], [34, -52], [48, -46], [62, -38], [82, -36], [100, -38], [108, -46], [118, -42], [121, -30], [116, -20], [104, -14], [88, -10], [72, -6], [58, -2], [40, 4], [18, 8], [-8, 8]]
  const jaw: Pt[] = [[58, -2], [70, 7], [84, 14], [95, 19], [99, 26], [90, 31], [72, 31], [52, 28], [32, 24], [12, 21], [-6, 18], [-8, 8], [18, 8], [40, 4]]
  let fill = dspSmooth(place(skull, at[0], at[1], s, rot, 1), true) + dspSmooth(place(jaw, at[0], at[1], s, rot, 1), true)
  // antlers, swept back, with tines: solid, so they read against the lace
  for (const a of [
    [24, -40, 10, -56, -12, -68, -38, -70, 6, 5, 3.6, 2.2],
    [16, -44, 0, -64, -22, -78, -46, -82, 7.5, 6.2, 5, 3.4],
    [-14, -76, -22, -94, -17, -110, -17, -110, 4.4, 3.2, 2.2, 2.2],
    [-38, -82, -50, -98, -46, -112, -46, -112, 4, 2.8, 1.8, 1.8],
  ]) {
    const j: Pt[] = [
      [a[0], a[1]],
      [a[2], a[3]],
      [a[4], a[5]],
      [a[6], a[7]],
    ]
    const f = finger(place(a[4] === a[6] ? j.slice(0, 3) : j, at[0], at[1], s, rot, 1), (a[4] === a[6] ? a.slice(8, 11) : a.slice(8)).map((v) => v * s))
    fill += f.fill
    line += f.line
  }
  const eye = place([[44, -28]], at[0], at[1], s, rot, 1)[0]
  const er = r1(8 * s)
  line += "M" + pt([eye[0] + er, eye[1]]) + "A" + er + " " + er + " 0 1 1 " + pt([eye[0] - er, eye[1]]) + "A" + er + " " + er + " 0 1 1 " + pt([eye[0] + er, eye[1]]) + "Z"
  return { fill, line, maneFill, maneLine, eye }
}

export function dspDragon() {
  // the spine winds clockwise from the tail at upper right to the head rising at upper left
  const N = 260
  const th0 = (-62 * Math.PI) / 180
  const th1 = (218 * Math.PI) / 180
  const spine: Pt[] = []
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const th = lerp(th0, th1, t)
    const r = 256 + 40 * Math.sin(t * Math.PI * 4.6 + 1.1) + 14 * t
    spine.push([Math.cos(th) * r, Math.sin(th) * r])
  }
  const tang = spine.map((_, i) => unit(spine[Math.max(0, i - 1)], spine[Math.min(N, i + 1)]))
  // the left-hand normal of a clockwise path points away from the seal
  const norm = tang.map(([x, y]): Pt => [y, -x])
  const width = spine.map((_, i) => 3 + 30 * sstep(0, 0.4, i / N) - 4 * sstep(0.88, 1, i / N))
  const edgeO = spine.map((p, i): Pt => [p[0] + norm[i][0] * width[i], p[1] + norm[i][1] * width[i]])
  const edgeI = spine.map((p, i): Pt => [p[0] - norm[i][0] * width[i], p[1] - norm[i][1] * width[i]])

  const bodyFill = dspSmooth([...edgeO, ...edgeI.slice().reverse()], true)
  const outline = dspSmooth(edgeO, false) + dspSmooth(edgeI, false)

  // scales: offset rows of arcs bulging toward the head
  let scales = ""
  for (let i = 8, row = 0; i < N - 10; i += 5, row++) {
    const w = width[i]
    const cols = row % 2 ? [-0.55, 0, 0.55] : [-0.28, 0.28]
    const r = w * 0.3
    for (const v of cols) {
      const c: Pt = [spine[i][0] + norm[i][0] * v * w, spine[i][1] + norm[i][1] * v * w]
      const a: Pt = [c[0] + norm[i][0] * r, c[1] + norm[i][1] * r]
      const b: Pt = [c[0] - norm[i][0] * r, c[1] - norm[i][1] * r]
      const q: Pt = [c[0] + tang[i][0] * r * 1.5, c[1] + tang[i][1] * r * 1.5]
      scales += "M" + pt(a) + "Q" + pt(q) + " " + pt(b)
    }
  }

  // belly plates along the inner edge
  const band = spine.map((p, i): Pt => [p[0] - norm[i][0] * width[i] * 0.62, p[1] - norm[i][1] * width[i] * 0.62])
  let belly = dspSmooth(band.slice(10, N - 4), false)
  for (let i = 12; i < N - 6; i += 3) belly += "M" + pt(band[i]) + "L" + pt(edgeI[i])

  // dorsal fins along the outer edge
  let fins = ""
  for (let i = 14; i < N - 14; i += 6) {
    const len = width[i] * 0.75
    const a = edgeO[i]
    const b = edgeO[i + 5]
    const base = edgeO[i + 1]
    const tip: Pt = [base[0] + norm[i][0] * len - tang[i][0] * len * 0.55, base[1] + norm[i][1] * len - tang[i][1] * len * 0.55]
    fins += "M" + pt(a) + "Q" + pt([lerp(a[0], tip[0], 0.6) + tang[i][0] * 3, lerp(a[1], tip[1], 0.6) + tang[i][1] * 3]) + " " + pt(tip)
    fins += "Q" + pt([lerp(b[0], tip[0], 0.4), lerp(b[1], tip[1], 0.4)]) + " " + pt(b)
  }

  // four legs: thigh, shin, a flame at the elbow, four talons
  let legFill = ""
  let legLine = ""
  for (const [t, side, size] of [
    [0.29, -1, 50],
    [0.47, 1, 58],
    [0.73, -1, 58],
    [0.87, 1, 54],
  ]) {
    const i = Math.round(t * N)
    const n: Pt = [norm[i][0] * side, norm[i][1] * side]
    const tg = tang[i]
    const hip: Pt = [spine[i][0] + n[0] * width[i] * 0.4, spine[i][1] + n[1] * width[i] * 0.4]
    const knee: Pt = [hip[0] + n[0] * size * 0.7 - tg[0] * size * 0.2, hip[1] + n[1] * size * 0.7 - tg[1] * size * 0.2]
    const ankle: Pt = [knee[0] + tg[0] * size * 0.55 + n[0] * size * 0.24, knee[1] + tg[1] * size * 0.55 + n[1] * size * 0.24]
    const back = Math.atan2(-tg[1], -tg[0])
    for (const [da, len, bend] of [
      [0.5 * side, 0.62, side],
      [0.15 * side, 0.5, -side],
    ]) {
      const f = flame(knee, back + da, size * len, size * 0.08, bend)
      legFill += f.fill
      legLine += f.line
    }
    const thigh = finger([hip, knee], [size * 0.19, size * 0.14])
    const shin = finger([knee, ankle], [size * 0.13, size * 0.1])
    legFill += thigh.fill + shin.fill
    legLine += thigh.line + shin.line + crease(knee, unit(hip, knee), size * 0.12, size * 0.04)
    const fwd = Math.atan2(tg[1] * 0.75 + n[1] * 0.65, tg[0] * 0.75 + n[0] * 0.65)
    for (let k = -1.5; k <= 1.5; k += 1) {
      const a = fwd + k * 0.42
      const len = size * (0.4 - Math.abs(k) * 0.05)
      const w = size * 0.055
      const d: Pt = [Math.cos(a), Math.sin(a)]
      const nn: Pt = [-d[1] * side, d[0] * side]
      const q = (u: number, v: number): Pt => [ankle[0] + d[0] * u + nn[0] * v, ankle[1] + d[1] * u + nn[1] * v]
      const talon = dspSmooth([q(0, w), q(len * 0.55, w * 0.9 + len * 0.08), q(len * 0.9, len * 0.32), q(len, len * 0.52), q(len * 0.72, len * 0.18), q(len * 0.4, -w * 0.4), q(0, -w)], true)
      legFill += talon
      legLine += talon
    }
  }

  // the tail ends in a fan of flames
  let tailFill = ""
  let tailLine = ""
  const tailBack = Math.atan2(-tang[0][1], -tang[0][0])
  for (const [da, len, bend] of [
    [-0.5, 46, -1],
    [-0.1, 62, 1],
    [0.35, 52, -1],
    [0.75, 38, 1],
  ]) {
    const f = flame(spine[2], tailBack + da, len, 10, bend)
    tailFill += f.fill
    tailLine += f.line
  }

  const end = spine[N]
  const head = dragonHead(end, Math.atan2(tang[N][1], tang[N][0]) - 0.3, 1.6)

  // a few clouds riding with the body
  let clouds = ""
  for (const [deg, r, s, flip] of [
    [-34, 368, 40, 1],
    [22, 360, 34, -1],
    [118, 366, 40, 1],
    [158, 352, 30, -1],
    [-118, 352, 30, -1],
    [72, 388, 28, 1],
  ]) {
    const a = (deg * Math.PI) / 180
    clouds += dspCloud(Math.cos(a) * r, Math.sin(a) * r, s, a + Math.PI / 2, flip)
  }

  return { bodyFill, outline, scales, belly, fins, legFill, legLine, tailFill, tailLine, head, clouds }
}

// ---- the hands ------------------------------------------------------------------
// Palm towards us, the index raised, the other three curled down onto the palm
// and the thumb laid across them: the teaching gesture. Wrist at the origin.
export function dspHandRaised() {
  const shapes: Shape[] = []
  const lines: string[] = []
  shapes.push({
    fill: dspSmooth([[-40, 90], [-41, 30], [-44, 0], [-52, -36], [-50, -76], [-40, -112], [-14, -124], [20, -124], [44, -116], [58, -98], [58, -64], [50, -24], [42, 10], [40, 90]], true),
    line: "",
  })
  shapes[0].line = shapes[0].fill
  shapes.push(finger([[-25, -108], [-26, -168], [-27, -206], [-27, -234]], [14, 12.6, 11.4, 10.4]))
  lines.push(crease([-26, -165], [0, -1], 10, 3), crease([-26, -171], [0, -1], 9, 3), crease([-27, -204], [0, -1], 8.6, 3))
  for (const [x, top, bot, r] of [
    [50, -132, -90, 10.5],
    [29, -148, -92, 12],
    [5, -152, -94, 13],
  ]) {
    shapes.push(finger([[x + 1, bot + 6], [x, top + r]], [r, r]))
    lines.push(crease([x, top + r * 2.1], [0, -1], r * 0.7, -2.5), nail([x + 1, bot + 2], [0, 1], r * 0.6, r * 0.95))
  }
  shapes.push(finger([[-46, -28], [-38, -62], [-20, -86], [2, -98]], [19, 15, 12.5, 11]))
  lines.push(nail([2, -98], unit([-20, -86], [2, -98]), 7.4, 11), crease([-22, -84], unit([-38, -62], [-20, -86]), 11.5, 3))
  lines.push(
    dspSmooth([[-40, -2], [-26, -26], [-14, -50], [-4, -66]], false),
    dspSmooth([[-10, -48], [14, -56], [36, -66], [52, -80]], false),
    dspSmooth([[-28, 34], [0, 38], [30, 34]], false),
    dspSmooth([[-28, 46], [0, 50], [30, 46]], false),
  )
  return { shapes, lines: lines.join("") }
}

// Palm towards us, the fingers pointing down and open: the giving gesture.
export function dspHandOpen() {
  const shapes: Shape[] = []
  const lines: string[] = []
  const palm = dspSmooth([[-40, -90], [-41, -30], [-44, 0], [-52, 34], [-50, 76], [-40, 108], [-10, 118], [22, 118], [44, 110], [56, 90], [56, 50], [50, 10], [42, -20], [40, -90]], true)
  shapes.push({ fill: palm, line: palm })
  for (const f of [
    [42, 100, 46, 140, 48, 160, 49, 176, 10.4, 9, 8.3, 7.8],
    [22, 108, 24, 152, 25, 180, 25, 198, 12.4, 11, 10, 9.3],
    [-1, 110, -1, 158, -1, 188, -1, 208, 13, 11.6, 10.6, 9.8],
    [-24, 106, -26, 150, -27, 178, -27, 196, 12.8, 11.4, 10.4, 9.6],
  ]) {
    const j: Pt[] = [
      [f[0], f[1]],
      [f[2], f[3]],
      [f[4], f[5]],
      [f[6], f[7]],
    ]
    shapes.push(finger(j, f.slice(8)))
    const u1 = unit(j[0], j[1])
    lines.push(crease(j[1], u1, f[9] * 0.82, 2.5), crease([j[1][0] + u1[0] * 5, j[1][1] + u1[1] * 5], u1, f[9] * 0.78, 2.5), crease(j[2], unit(j[1], j[2]), f[10] * 0.8, 2.5))
  }
  shapes.push(finger([[-44, 24], [-62, 58], [-74, 88], [-80, 112]], [19, 14.5, 12.4, 11]))
  lines.push(crease([-73, 86], unit([-62, 58], [-74, 88]), 11, 3))
  lines.push(
    dspSmooth([[-46, 16], [-28, 40], [-20, 70], [-22, 98]], false),
    dspSmooth([[-44, 30], [-16, 46], [12, 56], [32, 74]], false),
    dspSmooth([[-8, 92], [16, 86], [36, 84], [54, 80]], false),
    dspSmooth([[-30, -36], [0, -40], [30, -36]], false),
  )
  return { shapes, lines: lines.join("") }
}

export function dspSeal() {
  const trigrams = DSP_TRIGRAMS.map((t, i) => trigram(t.lines, (i / 8) * Math.PI * 2 - Math.PI / 2, 163, 12.5))
  let spokes = ""
  for (let i = 0; i < 8; i++) {
    const a = ((i + 0.5) / 8) * Math.PI * 2 - Math.PI / 2
    spokes += "M" + pt([Math.cos(a) * 153, Math.sin(a) * 153]) + "L" + pt([Math.cos(a) * 174, Math.sin(a) * 174])
  }
  let cross = ""
  for (const [x, y] of [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ]) {
    const o: Pt = [-y * 6, x * 6]
    cross += "M" + pt([x * 58 + o[0], y * 58 + o[1]]) + "L" + pt([x * 72 + o[0], y * 72 + o[1]])
    cross += "M" + pt([x * 58 - o[0], y * 58 - o[1]]) + "L" + pt([x * 72 - o[0], y * 72 - o[1]])
  }
  return {
    rimLines: circle(198) + circle(195) + circle(178) + ticks(195, 190.5, 180, 0, 0) + ticks(195, 187, 36, 0, 0),
    band: circle(176) + circle(150) + spokes,
    bandDots: circle(153),
    trigrams,
    face: circle(146) + petals(128, 146, 24, 0) + palace(86, 22, 9) + palace(79, 20, 8) + palace(72, 18, 7) + circle(58) + petals(40, 58, 8, 0.5) + circle(40) + circle(24) + cross,
    faceDots: circle(124),
    lattice: lattice(),
    fine: ticks(24, 40, 24, 0, 0),
    rays: ticks(10, 21, 16, 2, 24),
    needle: "M-142 0L-20 -5L0 -12L20 -5L142 0L20 5L0 12L-20 5Z" + circle(12) + "M142 0L158 -6L158 6Z",
  }
}

export function dspRings() {
  return {
    lace: ringLace(690, 810, 44),
    rules: circle(690) + circle(682) + circle(810) + circle(818),
    dots: circle(700) + circle(800),
    stipple: stipple(692, 808, 2600, 3),
    scale: circle(905) + ticks(905, 920, 120, 10, 935),
  }
}
// #endregion

type DspArt = {
  rings: ReturnType<typeof dspRings>
  dragon: ReturnType<typeof dspDragon>
  raised: Hand
  open: Hand
  seal: ReturnType<typeof dspSeal>
}

// Built once, the first time any instance renders.
let ART: DspArt | null = null
function getArt() {
  if (!ART) ART = { rings: dspRings(), dragon: dspDragon(), raised: dspHandRaised(), open: dspHandOpen(), seal: dspSeal() }
  return ART
}

// Is a #rgb / #rrggbb colour light enough to need dark ink on it?
function isLight(hex: string) {
  const h = hex.replace("#", "")
  const full = h.length === 3 ? h.replace(/./g, "$&$&") : h.slice(0, 6)
  const v = parseInt(full, 16)
  if (full.length !== 6 || Number.isNaN(v)) return false
  const lum = 0.2126 * ((v >> 16) & 255) + 0.7152 * ((v >> 8) & 255) + 0.0722 * (v & 255)
  return lum > 150
}

// ---- textures -----------------------------------------------------------------

interface DspTextures {
  paper: string
  grain: string
}

function paintPaper(dark: boolean) {
  const n = 384
  const c = document.createElement("canvas")
  c.width = n
  c.height = n
  const g = c.getContext("2d")
  if (!g) throw new Error("no 2d context")
  const rnd = dspRng(17)
  // soft mottling
  for (let k = 0; k < 90; k++) {
    const x = rnd() * n
    const y = rnd() * n
    const r = 20 + rnd() * 90
    const v = rnd() > 0.5 ? 255 : 0
    const grad = g.createRadialGradient(x, y, 0, x, y, r)
    grad.addColorStop(0, "rgba(" + v + "," + v + "," + v + "," + (0.03 + rnd() * 0.05).toFixed(3) + ")")
    grad.addColorStop(1, "rgba(" + v + "," + v + "," + v + ",0)")
    g.fillStyle = grad
    for (const ox of [-n, 0, n]) for (const oy of [-n, 0, n]) {
      g.save()
      g.translate(ox, oy)
      g.fillRect(x - r, y - r, r * 2, r * 2)
      g.restore()
    }
  }
  // fibres
  g.lineWidth = 0.6
  for (let k = 0; k < 260; k++) {
    const x = rnd() * n
    const y = rnd() * n
    const a = rnd() * Math.PI
    const l = 4 + rnd() * 14
    g.strokeStyle = dark ? "rgba(255,240,210," + (0.03 + rnd() * 0.06).toFixed(3) + ")" : "rgba(60,40,20," + (0.03 + rnd() * 0.06).toFixed(3) + ")"
    g.beginPath()
    g.moveTo(x, y)
    g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + rnd() * 3, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l)
    g.stroke()
  }
  // foxing: a few darker specks
  for (let k = 0; k < 140; k++) {
    g.fillStyle = "rgba(20,10,0," + (0.08 + rnd() * 0.2).toFixed(3) + ")"
    const s = rnd() < 0.9 ? 0.8 : 1.8
    g.fillRect(rnd() * n, rnd() * n, s, s)
  }
  return c
}

function paintGrain() {
  const n = 160
  const c = document.createElement("canvas")
  c.width = n
  c.height = n
  const g = c.getContext("2d")
  if (!g) throw new Error("no 2d context")
  const img = g.createImageData(n, n)
  const rnd = dspRng(7)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.round(rnd() * 255)
    img.data[i] = v
    img.data[i + 1] = v
    img.data[i + 2] = v
    img.data[i + 3] = 40
  }
  g.putImageData(img, 0, 0)
  return c
}

// Synchronous on purpose: toBlob waits for idle time, which a page this busy never has.
const toUrl = (c: HTMLCanvasElement) => 'url("' + c.toDataURL("image/png") + '")'

// ---- styles -------------------------------------------------------------------

const DSP_CSS = `
.dsp-root {
  position: relative;
  width: 100%;
  overflow: hidden;
  isolation: isolate;
  background: var(--dsp-stage);
  color: var(--dsp-text);
  font-family: var(--dsp-latin);
  -webkit-tap-highlight-color: transparent;
  --dsp-par: calc(var(--dsp-s) * 0.014);
  --dsp-ease: cubic-bezier(0.16, 1, 0.3, 1);
}
.dsp-root[data-phase="boot"], .dsp-root[data-phase="load"], .dsp-root[data-phase="summon"] { cursor: pointer; }
.dsp-shell, .dsp-shell *, .dsp-shell *::before, .dsp-shell *::after { box-sizing: border-box; }
.dsp-shell { position: absolute; inset: 0; }

/* ---- the stage ---- */
.dsp-backdrop {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 70% 60% at 50% var(--dsp-cy), var(--dsp-lift) 0%, transparent 70%),
    var(--dsp-stage);
}
.dsp-paper {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: var(--dsp-paper-tex);
  background-size: 384px 384px;
  mix-blend-mode: var(--dsp-blend-paper);
  opacity: var(--dsp-paper-k);
}
.dsp-glow {
  position: absolute;
  left: 50%;
  top: var(--dsp-cy);
  width: calc(var(--dsp-s) * 1.25);
  height: calc(var(--dsp-s) * 1.25);
  margin: calc(var(--dsp-s) * -0.625) 0 0 calc(var(--dsp-s) * -0.625);
  border-radius: 50%;
  pointer-events: none;
  background: radial-gradient(closest-side, var(--dsp-glow), transparent 72%);
  mix-blend-mode: var(--dsp-blend-light);
  opacity: calc(0.05 + var(--dsp-p) * 0.13);
  transform: translate3d(calc(var(--dsp-mx) * var(--dsp-par) * 2.2), calc(var(--dsp-my) * var(--dsp-par) * 2.2), 0);
  transition: opacity 1.2s ease;
}
.dsp-root[data-phase="landing"] .dsp-glow { opacity: 0.2; animation: dsp-breathe 7s ease-in-out infinite alternate; }
.dsp-flash {
  position: absolute;
  left: 50%;
  top: var(--dsp-cy);
  width: calc(var(--dsp-s) * 0.9);
  height: calc(var(--dsp-s) * 0.9);
  margin: calc(var(--dsp-s) * -0.45) 0 0 calc(var(--dsp-s) * -0.45);
  border-radius: 50%;
  pointer-events: none;
  background: radial-gradient(closest-side, var(--dsp-glow), transparent);
  mix-blend-mode: var(--dsp-blend-light);
  opacity: 0;
  transform: scale(0.2);
}
.dsp-root[data-phase="summon"] .dsp-flash { animation: dsp-flash 2.2s cubic-bezier(0.2, 0.7, 0.2, 1) both; }
.dsp-root[data-pulse="1"] .dsp-flash { animation: dsp-pulse 1.1s cubic-bezier(0.2, 0.7, 0.2, 1) both; }

/* ---- the emblem: stacked layers, each its own svg so moves stay on the GPU ---- */
.dsp-weave { position: absolute; inset: 0; }
.dsp-root[data-phase="boot"] .dsp-weave, .dsp-root[data-phase="load"] .dsp-weave { animation: dsp-weave 0.42s steps(3) infinite; }
.dsp-emblem {
  position: absolute;
  left: 50%;
  top: var(--dsp-cy);
  width: var(--dsp-s);
  height: var(--dsp-s);
  margin: calc(var(--dsp-s) * -0.5) 0 0 calc(var(--dsp-s) * -0.5);
}
.dsp-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  transform: translate3d(calc(var(--dsp-mx) * var(--dsp-par) * var(--d)), calc(var(--dsp-my) * var(--dsp-par) * var(--d)), 0);
}
.dsp-layer svg, .dsp-spin, .dsp-turn {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}
.dsp-root svg, .dsp-root canvas, .dsp-root img { max-width: none; }

.dsp-rings .dsp-spin { animation: dsp-spin 360s linear infinite; }
.dsp-rings .dsp-scale { animation: dsp-spin 520s linear infinite reverse; }
.dsp-lace { opacity: 0.78; }
.dsp-spark { opacity: 0; transition: opacity 0.6s ease; }
.dsp-root[data-phase="load"] .dsp-spark { opacity: 1; }

/* the dragon draws itself in */
.dsp-draw { stroke-dasharray: 1 2; stroke-dashoffset: 1; }
.dsp-root[data-phase="summon"] .dsp-draw {
  animation: dsp-draw var(--du, 2s) cubic-bezier(0.45, 0.05, 0.2, 1) var(--dl, 0s) forwards;
}
.dsp-root[data-phase="landing"] .dsp-draw { stroke-dashoffset: 0; }
.dsp-fade { opacity: 0; }
.dsp-root[data-phase="summon"] .dsp-fade { animation: dsp-in 1.4s ease var(--dl, 0s) forwards; }
.dsp-root[data-phase="landing"] .dsp-fade { opacity: 1; }
.dsp-dragon .dsp-turn { animation: dsp-sway 14s ease-in-out infinite alternate; }
.dsp-eye { opacity: 0; transform-box: fill-box; transform-origin: center; }
.dsp-root[data-phase="summon"] .dsp-eye { animation: dsp-glint 1.2s ease 2.4s forwards; }
.dsp-root[data-phase="landing"] .dsp-eye { opacity: 1; animation: dsp-blink 9s ease-in-out 2s infinite; }

/* the hands rise out from behind the seal */
.dsp-hand .dsp-rise {
  position: absolute;
  inset: 0;
  opacity: 0;
  transform: translate3d(0, calc(var(--dir) * var(--dsp-s) * 0.2), 0) scale(0.92);
  transition: transform 2s var(--dsp-ease) var(--dl), opacity 0.9s ease var(--dl);
}
.dsp-root[data-phase="summon"] .dsp-hand .dsp-rise, .dsp-root[data-phase="landing"] .dsp-hand .dsp-rise { opacity: 1; transform: none; }
.dsp-hand .dsp-bob { position: absolute; inset: 0; animation: dsp-bob 6s ease-in-out infinite alternate; animation-delay: var(--bd); }

/* the seal */
.dsp-seal .dsp-in {
  position: absolute;
  inset: 0;
  opacity: 0;
  transform: scale(0.94);
  filter: blur(8px);
  animation: dsp-rack 1.8s var(--dsp-ease) 0.35s forwards;
}
.dsp-root[data-phase="summon"] .dsp-seal .dsp-thud { animation: dsp-thud 0.9s var(--dsp-ease) both; }
.dsp-thud { position: absolute; inset: 0; }
.dsp-face .dsp-spin { animation: dsp-spin 240s linear infinite; }
.dsp-face .dsp-turn { transform: rotate(calc(var(--dsp-a) * 0.25deg)); }
.dsp-band .dsp-turn { transform: rotate(calc(var(--dsp-a) * -0.5deg)); }
.dsp-rim .dsp-turn { transform: rotate(calc(var(--dsp-a) * 1deg)); }
.dsp-needle .dsp-turn { transform: rotate(calc(var(--dsp-n) * 1deg)); }
.dsp-needle { opacity: 0; transition: opacity 1.2s ease; }
.dsp-root[data-phase="landing"] .dsp-needle { opacity: 1; }
.dsp-tri { opacity: 0.22; transition: opacity 0.5s ease, stroke 0.5s ease; }
.dsp-tri[data-lit="1"] { opacity: 1; }
.dsp-tri[data-hot="1"] { stroke: var(--dsp-glow); }
.dsp-sun { transform-box: fill-box; transform-origin: center; animation: dsp-sun 4s ease-in-out infinite alternate; }

/* the dial: an invisible control laid over the seal */
.dsp-dial {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 42%;
  height: 42%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  cursor: grab;
  outline: none;
  touch-action: none;
  pointer-events: none;
}
.dsp-root[data-phase="landing"] .dsp-dial { pointer-events: auto; }
.dsp-dial:active { cursor: grabbing; }
.dsp-dial:focus-visible { box-shadow: 0 0 0 1px var(--dsp-seal), 0 0 0 6px color-mix(in srgb, var(--dsp-seal) 25%, transparent); }

/* ---- film ---- */
.dsp-vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(ellipse 75% 70% at 50% 50%, transparent 45%, var(--dsp-vig) 100%);
}
.dsp-grain {
  position: absolute;
  inset: -50%;
  pointer-events: none;
  opacity: 0.5;
  mix-blend-mode: overlay;
  background-image: var(--dsp-grain-tex);
  background-size: 160px 160px;
  animation: dsp-grain 0.8s steps(5) infinite;
}
.dsp-flicker {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: var(--dsp-stage);
  opacity: 0;
  animation: dsp-flicker 0.24s steps(2) infinite;
}
.dsp-scratch {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  pointer-events: none;
  background: linear-gradient(transparent, var(--dsp-ink) 20%, var(--dsp-ink) 70%, transparent);
  opacity: 0;
  animation: dsp-scratch 4.2s steps(1) infinite;
}
.dsp-scratch + .dsp-scratch { animation-duration: 6.6s; animation-delay: -2.1s; }
.dsp-boot {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: #000;
  opacity: 0;
}
.dsp-root[data-phase="boot"] .dsp-boot { animation: dsp-boot 1.1s steps(9) forwards; }
.dsp-veil {
  position: absolute;
  inset: 0;
  z-index: 9;
  background: var(--dsp-stage);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.7s ease;
}
.dsp-veil[data-on="true"] { opacity: 1; pointer-events: auto; }

/* ---- type ---- */
.dsp-ui { position: absolute; inset: 0; z-index: 4; pointer-events: none; }
.dsp-ui a, .dsp-ui button { pointer-events: auto; }
.dsp-btn {
  appearance: none;
  -webkit-appearance: none;
  background: none;
  border: 0;
  margin: 0;
  padding: 0;
  color: inherit;
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  text-decoration: none;
  cursor: pointer;
}
.dsp-btn:focus-visible { outline: 1px solid var(--dsp-seal); outline-offset: 4px; }

.dsp-top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: clamp(16px, 3.4vh, 36px) clamp(16px, 4vw, 56px);
}
.dsp-brand { display: flex; align-items: center; gap: 14px; opacity: 0; }
.dsp-root[data-phase="landing"] .dsp-brand { animation: dsp-up 1.2s var(--dsp-ease) 0.1s forwards; }
.dsp-chop {
  display: flex;
  flex-flow: column wrap-reverse;
  align-content: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 3px;
  background: var(--dsp-seal);
  color: var(--dsp-chop-ink);
  font-family: var(--dsp-cjk);
  font-size: 14px;
  line-height: 1;
  letter-spacing: 0;
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--dsp-chop-ink) 35%, transparent), inset 0 0 0 4px var(--dsp-seal), inset 0 0 6px rgba(0, 0, 0, 0.35);
  transition: transform 0.4s var(--dsp-ease);
}
.dsp-chop span { display: block; padding: 0.5px 0.5px; }
.dsp-chop[data-many="true"] { font-size: 12px; }
.dsp-chop:hover { transform: rotate(-6deg) scale(1.06); }
.dsp-brand-latin { font-size: 11px; letter-spacing: 0.5em; text-transform: uppercase; opacity: 0.85; }
.dsp-nav { display: flex; gap: clamp(14px, 2.4vw, 34px); font-size: 11px; letter-spacing: 0.32em; text-transform: uppercase; opacity: 0; }
.dsp-root[data-phase="landing"] .dsp-nav { animation: dsp-up 1.2s var(--dsp-ease) 0.25s forwards; }
.dsp-nav .dsp-btn { position: relative; padding: 6px 0; opacity: 0.72; transition: opacity 0.3s ease; }
.dsp-nav .dsp-btn::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0.32em;
  bottom: 0;
  height: 1px;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: 100% 50%;
  transition: transform 0.45s var(--dsp-ease);
}
.dsp-nav .dsp-btn:hover { opacity: 1; }
.dsp-nav .dsp-btn:hover::after { transform: scaleX(1); transform-origin: 0 50%; }
.dsp-tc {
  font-family: var(--dsp-mono);
  font-size: 10px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--dsp-text);
  opacity: 0.55;
  font-variant-numeric: tabular-nums;
}
.dsp-tc b { font-weight: 400; color: var(--dsp-seal); }

.dsp-verse {
  position: absolute;
  right: clamp(16px, 4vw, 56px);
  top: 50%;
  transform: translateY(-50%);
  writing-mode: vertical-rl;
  font-family: var(--dsp-cjk);
  font-size: 13px;
  letter-spacing: 0.9em;
  opacity: 0;
  color: var(--dsp-ink);
}
.dsp-root[data-phase="landing"] .dsp-verse { animation: dsp-verse 2.4s ease 0.8s forwards; }
.dsp-verse::before {
  content: "";
  display: inline-block;
  width: 1px;
  height: 46px;
  margin-bottom: 18px;
  background: currentColor;
  opacity: 0.6;
}

/* the credit, set like the opening of a film */
.dsp-credits {
  position: absolute;
  left: clamp(18px, 6vw, 96px);
  bottom: clamp(70px, 14vh, 150px);
  width: max(260px, calc(50% - var(--dsp-s) * 0.3 - clamp(18px, 6vw, 96px)));
}
.dsp-credit { position: relative; }
.dsp-credit + .dsp-credit { position: absolute; left: 0; bottom: 0; }
.dsp-roles {
  margin: 0;
  font-family: var(--dsp-cjk);
  font-size: clamp(12px, 1.25vw, 16px);
  line-height: 1.7;
  letter-spacing: 0.26em;
}
.dsp-name {
  margin: 0.28em 0 0.32em;
  font-family: var(--dsp-cjk);
  font-weight: 600;
  font-size: clamp(38px, 5.4vw, 78px);
  line-height: 1;
  letter-spacing: 0.14em;
  white-space: nowrap;
}
.dsp-roles-latin {
  margin: 0;
  font-family: var(--dsp-mono);
  font-size: clamp(8px, 0.75vw, 10px);
  line-height: 1.8;
  letter-spacing: 0.34em;
  text-transform: uppercase;
  opacity: 0.7;
}
.dsp-name-latin {
  margin: 0.7em 0 0;
  font-size: clamp(11px, 1vw, 14px);
  letter-spacing: 0.72em;
  text-transform: uppercase;
}
.dsp-word { display: inline-block; white-space: nowrap; }
.dsp-ch { display: inline-block; }
.dsp-credit[data-state="in"] .dsp-ch { opacity: 0; filter: blur(8px); transform: translateY(0.3em); animation: dsp-letter 1s var(--dsp-ease) forwards; }
.dsp-credit[data-state="out"] { animation: dsp-out 0.7s ease forwards; }
.dsp-rule {
  display: block;
  width: 64px;
  height: 1px;
  margin: 0 0 14px;
  background: var(--dsp-seal);
  transform-origin: 0 50%;
  transform: scaleX(0);
}
.dsp-credit[data-state="in"] .dsp-rule { animation: dsp-rule 1.1s var(--dsp-ease) forwards; }

/* the loading read-out sits where the credits will */
.dsp-readout {
  position: absolute;
  left: clamp(18px, 6vw, 96px);
  bottom: clamp(70px, 14vh, 150px);
  min-width: 220px;
  outline: none;
  transition: opacity 0.8s ease, filter 0.8s ease;
}
.dsp-root[data-phase="summon"] .dsp-readout, .dsp-root[data-phase="landing"] .dsp-readout { opacity: 0; filter: blur(6px); pointer-events: none; }
.dsp-readout:focus-visible { outline: 1px solid var(--dsp-seal); outline-offset: 10px; }
.dsp-kicker {
  display: block;
  font-family: var(--dsp-cjk);
  font-size: 13px;
  letter-spacing: 0.36em;
  opacity: 0.85;
}
.dsp-kicker small { font-family: var(--dsp-mono); font-size: 9px; letter-spacing: 0.34em; text-transform: uppercase; opacity: 0.7; }
.dsp-count {
  display: block;
  margin: 10px 0 8px;
  font-family: var(--dsp-cjk);
  font-size: clamp(44px, 6vw, 84px);
  line-height: 1;
  letter-spacing: 0.06em;
  font-variant-numeric: tabular-nums;
}
.dsp-count small { font-size: 0.3em; letter-spacing: 0.2em; opacity: 0.6; margin-left: 0.4em; }
.dsp-gua { display: block; font-family: var(--dsp-mono); font-size: 10px; letter-spacing: 0.34em; text-transform: uppercase; opacity: 0.8; min-height: 1.4em; }
.dsp-gua b { font-family: var(--dsp-cjk); font-weight: 400; font-size: 14px; letter-spacing: 0; margin-right: 10px; color: var(--dsp-seal); }
.dsp-track { display: block; position: relative; width: 220px; height: 1px; margin-top: 16px; background: color-mix(in srgb, var(--dsp-text) 18%, transparent); }
.dsp-track i { position: absolute; inset: 0; background: var(--dsp-text); transform-origin: 0 50%; transform: scaleX(var(--dsp-p)); }
.dsp-track s { position: absolute; top: -3px; width: 1px; height: 7px; background: color-mix(in srgb, var(--dsp-text) 40%, transparent); }

/* bottom right: the credit counter and the way in */
.dsp-controls {
  position: absolute;
  right: clamp(16px, 4vw, 56px);
  bottom: clamp(28px, 6vh, 56px);
  display: flex;
  align-items: center;
  gap: clamp(14px, 2vw, 28px);
  opacity: 0;
}
.dsp-root[data-phase="landing"] .dsp-controls { animation: dsp-up 1.2s var(--dsp-ease) 0.5s forwards; }
.dsp-index { display: flex; align-items: center; gap: 10px; font-family: var(--dsp-mono); font-size: 10px; letter-spacing: 0.24em; font-variant-numeric: tabular-nums; }
.dsp-index b { font-weight: 400; font-size: 13px; }
.dsp-arrow {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--dsp-text) 30%, transparent);
  transition: border-color 0.3s ease, background 0.3s ease, transform 0.3s ease;
}
.dsp-arrow:hover { border-color: var(--dsp-text); transform: scale(1.06); }
.dsp-arrow svg { width: 12px; height: 12px; }
.dsp-cta {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 14px;
  padding: 13px 22px 13px 24px;
  border: 1px solid color-mix(in srgb, var(--dsp-text) 45%, transparent);
  font-size: 11px;
  letter-spacing: 0.4em;
  text-transform: uppercase;
  overflow: hidden;
  transition: color 0.45s ease, border-color 0.45s ease;
}
.dsp-cta::before {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--dsp-seal);
  transform: translateY(101%);
  transition: transform 0.5s var(--dsp-ease);
}
.dsp-cta:hover { color: var(--dsp-chop-ink); border-color: var(--dsp-seal); }
.dsp-cta:hover::before { transform: none; }
.dsp-cta span, .dsp-cta svg { position: relative; }
.dsp-cta svg { width: 18px; height: 10px; transition: transform 0.45s var(--dsp-ease); }
.dsp-cta:hover svg { transform: translateX(4px); }
.dsp-hint {
  position: absolute;
  left: 50%;
  bottom: clamp(26px, 5vh, 48px);
  transform: translateX(-50%);
  font-family: var(--dsp-mono);
  font-size: 9px;
  letter-spacing: 0.34em;
  text-transform: uppercase;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.8s ease;
}
.dsp-root[data-phase="landing"] .dsp-hint { animation: dsp-hint 1.6s ease 1.4s forwards; }
.dsp-root[data-touched="true"] .dsp-hint { animation: none; opacity: 0; }
.dsp-skip {
  position: absolute;
  right: clamp(16px, 4vw, 56px);
  bottom: clamp(28px, 6vh, 56px);
  font-family: var(--dsp-mono);
  font-size: 10px;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  opacity: 0.5;
  transition: opacity 0.3s ease;
}
.dsp-skip:hover { opacity: 1; }
.dsp-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

/* ---- tall screens: the seal moves up, the credit sits under it ---- */
.dsp-root[data-tall="true"] .dsp-credits, .dsp-root[data-tall="true"] .dsp-readout { bottom: clamp(96px, 15vh, 150px); width: auto; right: clamp(18px, 6vw, 96px); }
.dsp-root[data-tall="true"] .dsp-verse, .dsp-root[data-tall="true"] .dsp-nav, .dsp-root[data-tall="true"] .dsp-hint { display: none; }
.dsp-root[data-tall="true"] .dsp-controls { left: clamp(16px, 4vw, 56px); justify-content: space-between; }

@keyframes dsp-spin { to { transform: rotate(360deg); } }
@keyframes dsp-sway { from { transform: rotate(-1.4deg) scale(0.995); } to { transform: rotate(1.4deg) scale(1.005); } }
@keyframes dsp-bob { from { transform: translate3d(0, -0.5%, 0); } to { transform: translate3d(0, 0.5%, 0); } }
@keyframes dsp-draw { to { stroke-dashoffset: 0; } }
@keyframes dsp-in { to { opacity: 1; } }
@keyframes dsp-rack { to { opacity: 1; transform: none; filter: blur(0); } }
@keyframes dsp-thud { 0% { transform: scale(1); } 22% { transform: scale(1.035); } 100% { transform: scale(1); } }
@keyframes dsp-glint { 0% { opacity: 0; transform: scale(0.2); } 40% { opacity: 1; transform: scale(2.2); } 100% { opacity: 1; transform: scale(1); } }
@keyframes dsp-blink { 0%, 96%, 100% { transform: scale(1); } 98% { transform: scale(1, 0.1); } }
@keyframes dsp-sun { from { transform: scale(0.92); opacity: 0.85; } to { transform: scale(1.08); opacity: 1; } }
@keyframes dsp-flash {
  0% { opacity: 0; transform: scale(0.2); }
  25% { opacity: 0.9; }
  100% { opacity: 0; transform: scale(1.6); }
}
@keyframes dsp-pulse {
  0% { opacity: 0; transform: scale(0.3); }
  30% { opacity: 0.55; }
  100% { opacity: 0; transform: scale(1.2); }
}
@keyframes dsp-breathe { from { opacity: 0.16; } to { opacity: 0.26; } }
@keyframes dsp-weave {
  0% { transform: translate(0, 0); }
  33% { transform: translate(0.4px, -0.5px); }
  66% { transform: translate(-0.3px, 0.4px); }
  100% { transform: translate(0, 0); }
}
@keyframes dsp-grain {
  0% { transform: translate(0, 0); }
  20% { transform: translate(-7%, 4%); }
  40% { transform: translate(5%, -6%); }
  60% { transform: translate(-3%, -9%); }
  80% { transform: translate(8%, 3%); }
  100% { transform: translate(-5%, 7%); }
}
@keyframes dsp-flicker { 0% { opacity: 0.035; } 50% { opacity: 0; } 100% { opacity: 0.02; } }
@keyframes dsp-scratch {
  0% { left: 18%; opacity: 0; }
  12% { left: 71%; opacity: 0.12; }
  14% { opacity: 0; }
  46% { left: 33%; opacity: 0.08; }
  48% { opacity: 0; }
  80% { left: 86%; opacity: 0.1; }
  82% { opacity: 0; }
}
@keyframes dsp-boot {
  0% { opacity: 1; }
  20% { opacity: 0.55; }
  30% { opacity: 0.95; }
  45% { opacity: 0.3; }
  55% { opacity: 0.7; }
  70% { opacity: 0.1; }
  80% { opacity: 0.35; }
  100% { opacity: 0; }
}
@keyframes dsp-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes dsp-verse { from { opacity: 0; letter-spacing: 0.4em; } to { opacity: 0.7; letter-spacing: 0.9em; } }
@keyframes dsp-letter { to { opacity: 1; filter: blur(0); transform: none; } }
@keyframes dsp-out { to { opacity: 0; filter: blur(6px); transform: translateY(-0.4em); } }
@keyframes dsp-rule { to { transform: scaleX(1); } }
@keyframes dsp-hint { to { opacity: 0.55; } }

@media (max-width: 720px) {
  .dsp-nav, .dsp-verse { display: none; }
  .dsp-cta { padding: 12px 16px; letter-spacing: 0.3em; }
}

@media (prefers-reduced-motion: reduce) {
  .dsp-root { --dsp-par: 0px; }
  .dsp-rings .dsp-spin, .dsp-rings .dsp-scale, .dsp-face .dsp-spin, .dsp-dragon .dsp-turn, .dsp-hand .dsp-bob, .dsp-sun { animation: none; }
  .dsp-weave, .dsp-grain, .dsp-flicker, .dsp-scratch { animation: none; }
  .dsp-root[data-phase="boot"] .dsp-weave, .dsp-root[data-phase="load"] .dsp-weave { animation: none; }
  .dsp-scratch, .dsp-flash { display: none; }
  .dsp-draw { stroke-dasharray: none; stroke-dashoffset: 0; opacity: 0; transition: opacity 0.8s ease; }
  .dsp-root[data-phase="summon"] .dsp-draw { animation: none; opacity: 1; }
  .dsp-root[data-phase="landing"] .dsp-draw { opacity: 1; }
  .dsp-hand .dsp-rise { transform: none; transition: opacity 0.8s ease; }
  .dsp-seal .dsp-in { animation: dsp-in 0.6s ease forwards; transform: none; filter: none; }
  .dsp-root[data-phase="summon"] .dsp-seal .dsp-thud { animation: none; }
  .dsp-credit[data-state="in"] .dsp-ch { filter: none; transform: none; animation: dsp-in 0.5s ease forwards; }
  .dsp-root[data-phase="landing"] .dsp-eye { animation: none; }
}
`

// ---- component ----------------------------------------------------------------

type Phase = "boot" | "load" | "summon" | "landing"

const BOOT_MS = 1100
const SUMMON_MS = 3700
const REWIND_MS = 750
const FPS = 24

// Light from the side, so the hatching gathers on the far edge of each hand.
function HandArt({ hand, uid, id, y }: { hand: Hand; uid: string; id: string; y: number }) {
  return (
    <g transform={"translate(0 " + y + ")"}>
      <defs>
        <linearGradient id={uid + id + "g"} x1="-70" y1="0" x2="70" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0.3" stopColor="#000" />
          <stop offset="1" stopColor="#fff" />
        </linearGradient>
        <mask id={uid + id + "m"} maskUnits="userSpaceOnUse" x="-120" y="-280" width="240" height="560">
          <rect x="-120" y="-280" width="240" height="560" fill={"url(#" + uid + id + "g)"} />
        </mask>
      </defs>
      {hand.shapes.map((s, i) => (
        <React.Fragment key={i}>
          <path d={s.fill} fill="var(--dsp-paper)" />
          <path d={s.line} fill="none" stroke="var(--dsp-shade)" strokeWidth="1.7" strokeLinejoin="round" />
        </React.Fragment>
      ))}
      <g mask={"url(#" + uid + id + "m)"}>
        {hand.shapes.map((s, i) => (
          <path key={i} d={s.fill} fill={"url(#" + uid + "hatch)"} />
        ))}
      </g>
      <path d={hand.lines} fill="none" stroke="var(--dsp-shade)" strokeWidth="1.15" strokeLinecap="round" />
    </g>
  )
}

const Rings = React.memo(function Rings({ uid, maskRef, sparkRef }: { uid: string; maskRef: React.Ref<SVGCircleElement>; sparkRef: React.Ref<SVGGElement> }) {
  const a = getArt().rings
  return (
    <div className="dsp-layer dsp-rings" style={{ "--d": 0.35 } as React.CSSProperties}>
      <div className="dsp-scale">
        <svg viewBox="-500 -500 1000 1000" aria-hidden="true">
          <path d={a.scale} fill="none" stroke="var(--dsp-ink)" strokeWidth="1" opacity="0.22" />
        </svg>
      </div>
      <div className="dsp-spin">
        <svg viewBox="-500 -500 1000 1000" aria-hidden="true">
          <defs>
            <mask id={uid + "reveal"} maskUnits="userSpaceOnUse" x="-1000" y="-1000" width="2000" height="2000">
              <circle
                ref={maskRef}
                r="750"
                fill="none"
                stroke="#fff"
                strokeWidth="170"
                pathLength={1}
                strokeDasharray="1 2"
                strokeDashoffset="1"
                transform="rotate(-90)"
              />
            </mask>
          </defs>
          <g mask={"url(#" + uid + "reveal)"} fill="none" stroke="var(--dsp-ink)" strokeLinecap="round" strokeLinejoin="round">
            <g className="dsp-lace">
              <path d={a.lace} strokeWidth="1.6" />
              <path d={a.rules} strokeWidth="1.4" />
              <path d={a.dots} strokeWidth="2.6" strokeDasharray="0 7" />
              <path d={a.stipple} strokeWidth="2.1" opacity="0.6" />
            </g>
          </g>
          <g ref={sparkRef} className="dsp-spark">
            <path d="M0 -680V-820" stroke="var(--dsp-glow)" strokeWidth="2" opacity="0.8" />
            <circle cy="-750" r="7" fill="var(--dsp-glow)" />
            <circle cy="-750" r="22" fill="var(--dsp-glow)" opacity="0.18" />
          </g>
        </svg>
      </div>
    </div>
  )
})

const Dragon = React.memo(function Dragon() {
  const d = getArt().dragon
  const ln = { fill: "none", stroke: "var(--dsp-ink)", strokeLinecap: "round", strokeLinejoin: "round", pathLength: 1 } as const
  const del = (s: number, du: number) => ({ "--dl": s + "s", "--du": du + "s" }) as React.CSSProperties
  return (
    <div className="dsp-layer dsp-dragon" style={{ "--d": 0.8 } as React.CSSProperties}>
      <div className="dsp-turn">
        <svg viewBox="-500 -500 1000 1000" aria-hidden="true">
          <path className="dsp-draw" d={d.clouds} {...ln} strokeWidth="1.5" opacity="0.85" style={del(0.2, 2.6)} />
          <path className="dsp-fade" d={d.bodyFill} fill="var(--dsp-face)" style={del(0.5, 0)} />
          <path className="dsp-fade" d={d.tailFill} fill="var(--dsp-face)" style={del(0.4, 0)} />
          <path className="dsp-draw" d={d.tailLine} {...ln} strokeWidth="1.5" style={del(0, 1.2)} />
          <path className="dsp-draw" d={d.outline} {...ln} strokeWidth="2.1" style={del(0, 2.2)} />
          <path className="dsp-draw" d={d.scales} {...ln} strokeWidth="1.25" style={del(0.25, 2.4)} />
          <path className="dsp-draw" d={d.belly} {...ln} strokeWidth="1.1" style={del(0.35, 2.2)} />
          <path className="dsp-draw" d={d.fins} {...ln} strokeWidth="1.35" style={del(0.3, 2.3)} />
          <path className="dsp-fade" d={d.legFill} fill="var(--dsp-face)" style={del(1, 0)} />
          <path className="dsp-draw" d={d.legLine} {...ln} strokeWidth="1.5" style={del(1, 1.6)} />
          <path className="dsp-fade" d={d.head.maneFill} fill="var(--dsp-face)" style={del(1.5, 0)} />
          <path className="dsp-draw" d={d.head.maneLine} {...ln} strokeWidth="1.5" style={del(1.7, 1.5)} />
          <path className="dsp-fade" d={d.head.fill} fill="var(--dsp-face)" style={del(1.4, 0)} />
          <path className="dsp-draw" d={d.head.line} {...ln} strokeWidth="1.8" style={del(1.5, 1.6)} />
          <circle className="dsp-eye" cx={d.head.eye[0]} cy={d.head.eye[1]} r="5.4" fill="var(--dsp-glow)" />
        </svg>
      </div>
    </div>
  )
})

const Hands = React.memo(function Hands({ uid }: { uid: string }) {
  const art = getArt()
  return (
    <>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <pattern id={uid + "hatch"} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
            <path d="M0 0.5H4" stroke="var(--dsp-shade)" strokeWidth="0.9" />
          </pattern>
        </defs>
      </svg>
      <div className="dsp-layer dsp-hand" style={{ "--d": 1.25, "--dir": 1, "--dl": "0.35s", "--bd": "0s" } as React.CSSProperties}>
        <div className="dsp-rise">
          <div className="dsp-bob">
            <svg viewBox="-500 -500 1000 1000" aria-hidden="true">
              <HandArt hand={art.raised} uid={uid} id="r" y={-168} />
            </svg>
          </div>
        </div>
      </div>
      <div className="dsp-layer dsp-hand" style={{ "--d": 1.25, "--dir": -1, "--dl": "0.6s", "--bd": "-3s" } as React.CSSProperties}>
        <div className="dsp-rise">
          <div className="dsp-bob">
            <svg viewBox="-500 -500 1000 1000" aria-hidden="true">
              <HandArt hand={art.open} uid={uid} id="o" y={168} />
            </svg>
          </div>
        </div>
      </div>
    </>
  )
})

const Seal = React.memo(function Seal({
  count,
  trigramRefs,
}: {
  count: number
  trigramRefs: React.MutableRefObject<(SVGPathElement | null)[]>
}) {
  const s = getArt().seal
  const step = 360 / Math.max(1, count)
  return (
    <div className="dsp-seal">
      <div className="dsp-thud">
        <div className="dsp-in">
          <div className="dsp-layer dsp-face" style={{ "--d": 0.6 } as React.CSSProperties}>
            <div className="dsp-spin">
              <div className="dsp-turn">
                <svg viewBox="-500 -500 1000 1000" aria-hidden="true">
                  <circle r="200" fill="var(--dsp-face)" />
                  <g fill="none" stroke="var(--dsp-ink)" strokeLinecap="round" strokeLinejoin="round">
                    <path d={s.face} strokeWidth="1.3" />
                    <path d={s.faceDots} strokeWidth="2.2" strokeDasharray="0 5" />
                    <path d={s.lattice} strokeWidth="0.9" opacity="0.55" />
                    <path d={s.fine} strokeWidth="0.9" opacity="0.7" />
                  </g>
                </svg>
              </div>
            </div>
          </div>
          <div className="dsp-layer dsp-band" style={{ "--d": 0.6 } as React.CSSProperties}>
            <div className="dsp-turn">
              <svg viewBox="-500 -500 1000 1000" aria-hidden="true">
                <path d={circle(176) + circle(150)} fill="var(--dsp-face)" fillRule="evenodd" />
                <g fill="none" stroke="var(--dsp-ink)" strokeLinecap="round">
                  <path d={s.band} strokeWidth="1.2" />
                  <path d={s.bandDots} strokeWidth="2" strokeDasharray="0 6" />
                  {s.trigrams.map((d, i) => (
                    <path
                      key={i}
                      ref={(el) => {
                        trigramRefs.current[i] = el
                      }}
                      className="dsp-tri"
                      d={d}
                      strokeWidth="3.2"
                    />
                  ))}
                </g>
              </svg>
            </div>
          </div>
          <div className="dsp-layer dsp-rim" style={{ "--d": 0.6 } as React.CSSProperties}>
            <div className="dsp-turn">
              <svg viewBox="-500 -500 1000 1000" aria-hidden="true">
                <path d={circle(200) + circle(176)} fill="var(--dsp-paper)" fillRule="evenodd" />
                <path d={s.rimLines} fill="none" stroke="var(--dsp-shade)" strokeWidth="1.1" />
                <g fill="var(--dsp-shade)" fontFamily="var(--dsp-cjk)" fontSize="11" textAnchor="middle" dominantBaseline="central">
                  {Array.from(BRANCHES).map((ch, i) => (
                    <text key={i} transform={"rotate(" + (i * 30 + 15) + ") translate(0 -182.5)"}>
                      {ch}
                    </text>
                  ))}
                </g>
                {Array.from({ length: count }, (_, i) => (
                  <path key={i} d="M-5 -201L0 -209L5 -201Z" fill="var(--dsp-seal)" transform={"rotate(" + (-90 - i * step) + ")"} />
                ))}
              </svg>
            </div>
          </div>
          <div className="dsp-layer dsp-needle" style={{ "--d": 0.7 } as React.CSSProperties}>
            <div className="dsp-turn">
              <svg viewBox="-500 -500 1000 1000" aria-hidden="true">
                <path d={s.needle} fill="none" stroke="var(--dsp-ink)" strokeWidth="1.2" strokeLinejoin="round" opacity="0.75" />
              </svg>
            </div>
          </div>
          <div className="dsp-layer dsp-core" style={{ "--d": 0.7 } as React.CSSProperties}>
            <svg viewBox="-500 -500 1000 1000" aria-hidden="true">
              <g className="dsp-sun">
                <circle r="30" fill="var(--dsp-glow)" opacity="0.12" />
                <path d={s.rays} fill="none" stroke="var(--dsp-ink)" strokeWidth="1.3" strokeLinecap="round" />
                <circle r="7.5" fill="var(--dsp-ink)" />
              </g>
            </svg>
          </div>
          <div className="dsp-layer" style={{ "--d": 0.6 } as React.CSSProperties}>
            <svg viewBox="-500 -500 1000 1000" aria-hidden="true">
              <path d="M-226 0L-214 -7V7Z" fill="var(--dsp-seal)" />
              <path d={circle(214)} fill="none" stroke="var(--dsp-ink)" strokeWidth="1.4" strokeDasharray="0 6" strokeLinecap="round" opacity="0.6" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
})

// Letters animate one by one, but stay grouped in words so a line only ever
// breaks at a space.
function Letters({ text, delay, step }: { text: string; delay: number; step: number }) {
  let k = 0
  return (
    <>
      {text.split(" ").map((word, w) => (
        <React.Fragment key={w}>
          {w > 0 ? " " : null}
          <span className="dsp-word">
            {Array.from(word).map((ch, i) => (
              <span key={i} className="dsp-ch" style={{ animationDelay: (delay + k++ * step).toFixed(3) + "s" }}>
                {ch}
              </span>
            ))}
          </span>
        </React.Fragment>
      ))}
    </>
  )
}

function Credit({ credit, state }: { credit: DragonSealCredit; state: "in" | "out" }) {
  const rolesN = Array.from(credit.roles).length
  return (
    <div className="dsp-credit" data-state={state} aria-hidden={state === "out"}>
      <span className="dsp-rule" />
      <p className="dsp-roles">
        <Letters text={credit.roles} delay={0.05} step={0.028} />
      </p>
      <p className="dsp-name">
        <Letters text={credit.name} delay={0.2 + rolesN * 0.012} step={0.12} />
      </p>
      {credit.rolesLatin ? (
        <p className="dsp-roles-latin">
          <Letters text={credit.rolesLatin} delay={0.5} step={0.008} />
        </p>
      ) : null}
      {credit.nameLatin ? (
        <p className="dsp-name-latin">
          <Letters text={credit.nameLatin} delay={0.65} step={0.04} />
        </p>
      ) : null}
    </div>
  )
}

function LinkOrButton({ link, className, onClick, children }: { link: DragonSealLink; className: string; onClick?: () => void; children?: React.ReactNode }) {
  if (link.href) {
    return (
      <a className={"dsp-btn " + className} href={link.href} onClick={onClick}>
        {children ?? link.label}
      </a>
    )
  }
  return (
    <button type="button" className={"dsp-btn " + className} onClick={onClick}>
      {children ?? link.label}
    </button>
  )
}

const Arrow = ({ flip }: { flip?: boolean }) => (
  <svg viewBox="0 0 12 12" aria-hidden="true" style={flip ? { transform: "scaleX(-1)" } : undefined}>
    <path d="M2 6H10M6.5 2.5L10 6L6.5 9.5" fill="none" stroke="currentColor" strokeWidth="1.1" />
  </svg>
)

export default function DragonSealPreloader({
  progress,
  durationMs = 4600,
  skipIntro = false,
  brand = "天枢",
  brandLatin = "Tianshu",
  nav = DEFAULT_NAV,
  credits = DEFAULT_CREDITS,
  verse = "云起龙骧 · 星移斗转",
  cta = { label: "Enter" },
  onEnter,
  onLoaded,
  autoAdvanceMs = 6500,
  tone = "sepia",
  palette,
  fontFamily = CJK_STACK,
  height = "100svh",
  className = "",
}: DragonSealPreloaderProps) {
  const [phase, setPhase] = React.useState<Phase>(skipIntro ? "landing" : "boot")
  const [pct, setPct] = React.useState(skipIntro ? 100 : 0)
  const [index, setIndex] = React.useState(0)
  const [prev, setPrev] = React.useState<number | null>(null)
  const [cycle, setCycle] = React.useState(0)
  const [veil, setVeil] = React.useState(false)
  const [pulse, setPulse] = React.useState(0)
  const [touched, setTouched] = React.useState(false)
  const [tex, setTex] = React.useState<DspTextures | null>(null)
  const [frame, setFrame] = React.useState({ s: 800, tall: false })

  const uid = "dsp" + React.useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const rootRef = React.useRef<HTMLDivElement>(null)
  const maskRef = React.useRef<SVGCircleElement>(null)
  const sparkRef = React.useRef<SVGGElement>(null)
  const tcRef = React.useRef<HTMLSpanElement>(null)
  const trigramRefs = React.useRef<(SVGPathElement | null)[]>([])
  const pointerRef = React.useRef<{ x: number; y: number } | null>(null)
  const rushRef = React.useRef(false)
  const startRef = React.useRef(0)
  // the seal's angle: shown, where it is heading, and the drag in progress
  const turnRef = React.useRef({ cur: 0, target: 0, vel: 0, drag: false, last: 0, moved: 0, speed: 0 })
  const indexRef = React.useRef(0)
  const progressRef = React.useRef(progress)
  progressRef.current = progress
  const onLoadedRef = React.useRef(onLoaded)
  onLoadedRef.current = onLoaded

  const colors = { ...TONES[tone], ...palette }
  const light = tone === "paper"
  const n = Math.max(1, credits.length)
  const safeIndex = Math.min(index, n - 1)
  const credit = credits[safeIndex]
  const lit = dspLit(pct / 100)

  // ---- paper and grain, painted once per tone ------------------------------------
  React.useEffect(() => {
    try {
      setTex({ paper: toUrl(paintPaper(!light)), grain: toUrl(paintGrain()) })
    } catch {
      /* no canvas: the flat stage stands in */
    }
  }, [light])

  // ---- size the emblem off the frame ---------------------------------------------
  React.useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const measure = () => {
      const r = root.getBoundingClientRect()
      if (r.width <= 0 || r.height <= 0) return
      const tall = r.width / r.height < 0.82
      const s = tall ? Math.min(r.height * 0.74, r.width * 1.16) : r.height * 0.97
      setFrame((f) => (Math.abs(f.s - s) < 1 && f.tall === tall ? f : { s: Math.round(s), tall }))
    }
    measure()
    if (typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(measure)
    ro.observe(root)
    return () => ro.disconnect()
  }, [])

  // ---- one loop for the light, the parallax, the rule, the seal and the timecode ---
  React.useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const still = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches
    let raf = 0
    let mx = 0
    let my = 0
    let needle = -90
    let lastTc = -1
    const t0 = performance.now()
    startRef.current = t0
    const tick = (now: number) => {
      const ptr = pointerRef.current
      let tx = 0
      let ty = 0
      if (ptr) {
        tx = ptr.x
        ty = ptr.y
      } else if (!still) {
        const s = (now - t0) / 1000
        tx = Math.sin(s * 0.33) * 0.35
        ty = Math.sin(s * 0.21 + 1.3) * 0.25
      }
      mx += (tx - mx) * 0.06
      my += (ty - my) * 0.06
      root.style.setProperty("--dsp-mx", mx.toFixed(4))
      root.style.setProperty("--dsp-my", my.toFixed(4))

      // the rule on the seal points at the pointer, or idles round slowly
      const r = root.getBoundingClientRect()
      const want = ptr
        ? (Math.atan2(ptr.y * r.height * 0.5 - (parseFloat(root.dataset.cy || "0.5") - 0.5) * r.height, ptr.x * r.width * 0.5) * 180) / Math.PI
        : needle + (still ? 0 : 0.06)
      needle += dspWrap(want - needle) * (ptr ? 0.08 : 1)
      root.style.setProperty("--dsp-n", needle.toFixed(2))

      // the seal: follows the drag, then springs to the nearest credit
      const turn = turnRef.current
      if (!turn.drag) {
        if (still) {
          turn.cur = turn.target
          turn.vel = 0
        } else {
          turn.vel = (turn.vel + (turn.target - turn.cur) * 0.035) * 0.8
          turn.cur += turn.vel
          if (Math.abs(turn.target - turn.cur) < 0.01 && Math.abs(turn.vel) < 0.01) turn.cur = turn.target
        }
      }
      root.style.setProperty("--dsp-a", turn.cur.toFixed(3))

      if (tcRef.current) {
        const tc = Math.floor(((now - t0) / 1000) * FPS)
        if (tc !== lastTc) {
          lastTc = tc
          tcRef.current.textContent = dspTimecode(now - t0, FPS)
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  // ---- boot: the projector warms up ---------------------------------------------------
  React.useEffect(() => {
    if (phase !== "boot") return
    const t = setTimeout(() => setPhase("load"), BOOT_MS)
    return () => clearTimeout(t)
  }, [phase, cycle])

  // ---- load: the lace is engraved round the frame and the trigrams light ------------
  React.useEffect(() => {
    const root = rootRef.current
    const paint = (p: number) => {
      root?.style.setProperty("--dsp-p", p.toFixed(4))
      if (maskRef.current) maskRef.current.style.strokeDashoffset = (1 - p).toFixed(4)
      if (sparkRef.current) sparkRef.current.setAttribute("transform", "rotate(" + (p * 360).toFixed(2) + ")")
      const on = dspLit(p)
      trigramRefs.current.forEach((el, i) => {
        if (!el) return
        el.dataset.lit = i < on ? "1" : "0"
        el.dataset.hot = i === on - 1 && p < 1 ? "1" : "0"
      })
    }
    if (phase === "landing" || phase === "summon") {
      paint(1)
      return
    }
    if (phase !== "load") {
      paint(0)
      return
    }
    let raf = 0
    let shown = 0
    let last = performance.now()
    const start = last
    let lastPct = -1
    const tick = (now: number) => {
      const dt = Math.min(64, now - last)
      last = now
      const external = progressRef.current
      let target = external !== undefined ? clamp01(external / 100) : dspSimulated((now - start) / Math.max(400, durationMs))
      if (rushRef.current) target = 1
      const rate = rushRef.current ? 0.12 : external !== undefined ? 0.1 : 1
      shown += (target - shown) * Math.min(1, rate * (dt / 16.7))
      if (target - shown < 0.002) shown = target
      paint(shown)
      const next = Math.round(shown * 100)
      if (next !== lastPct) {
        lastPct = next
        setPct(next)
      }
      if (shown >= 1) {
        setPhase("summon")
        return
      }
      raf = requestAnimationFrame(tick)
    }
    paint(0)
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase, cycle, durationMs])

  // ---- summon: the dragon draws in, then the landing ---------------------------------
  React.useEffect(() => {
    if (phase !== "summon") return
    const t = setTimeout(() => setPhase("landing"), SUMMON_MS)
    return () => clearTimeout(t)
  }, [phase])

  React.useEffect(() => {
    if (phase === "landing") onLoadedRef.current?.()
  }, [phase, cycle])

  // ---- the credits turn on their own when left alone ---------------------------------
  // Show credit `next`, keeping the outgoing one for its fade. No side effects
  // inside state updaters: StrictMode runs those twice.
  const select = (next: number) => {
    const cur = indexRef.current
    if (next === cur) return
    indexRef.current = next
    setPrev(cur)
    setIndex(next)
  }

  // Turn the seal `by` steps (or the shortest way to `to`) and show that credit.
  const goTo = (to: number, by?: number) => {
    const target = ((to % n) + n) % n
    const steps = by ?? dspDelta(indexRef.current, target, n)
    if (!steps) return
    const turn = turnRef.current
    turn.target = dspSnap(turn.target, n) + steps * dspStep(n)
    select(target)
  }
  const goToRef = React.useRef(goTo)
  goToRef.current = goTo

  React.useEffect(() => {
    if (phase !== "landing" || autoAdvanceMs <= 0 || credits.length < 2) return
    const t = setTimeout(() => goToRef.current(indexRef.current + 1, 1), autoAdvanceMs)
    return () => clearTimeout(t)
  }, [phase, safeIndex, autoAdvanceMs, credits.length])

  // the outgoing credit is dropped once it has faded
  React.useEffect(() => {
    if (prev === null) return
    const t = setTimeout(() => setPrev(null), 800)
    return () => clearTimeout(t)
  }, [prev, index])

  React.useEffect(() => {
    if (!pulse) return
    const t = setTimeout(() => setPulse(0), 1100)
    return () => clearTimeout(t)
  }, [pulse])

  // ---- replay: the veil comes down, the stage resets, the veil lifts -------------------
  React.useEffect(() => {
    if (!veil) return
    const t = setTimeout(() => {
      const turn = turnRef.current
      turn.cur = turn.target = turn.vel = 0
      rushRef.current = false
      indexRef.current = 0
      setPct(0)
      setIndex(0)
      setPrev(null)
      setTouched(false)
      setPhase("boot")
      setCycle((c) => c + 1)
      setVeil(false)
    }, REWIND_MS)
    return () => clearTimeout(t)
  }, [veil])

  const rush = () => {
    if (phase === "boot" || phase === "load") {
      if (phase === "boot") setPhase("load")
      rushRef.current = true
    } else if (phase === "summon") setPhase("landing")
  }

  // ---- pointer: parallax everywhere, drag on the seal --------------------------------
  const local = (e: { clientX: number; clientY: number }) => {
    const root = rootRef.current
    if (!root) return null
    const r = root.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: ((e.clientY - r.top) / r.height) * 2 - 1, r }
  }
  const angleAt = (e: { clientX: number; clientY: number }) => {
    const root = rootRef.current
    if (!root) return 0
    const r = root.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height * (frame.tall ? 0.42 : 0.5)
    return (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = local(e)
    if (p && e.pointerType !== "touch") pointerRef.current = { x: p.x, y: p.y }
  }
  const onPointerLeave = () => {
    pointerRef.current = null
  }

  const onDialDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phase !== "landing") return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    const turn = turnRef.current
    turn.drag = true
    turn.last = angleAt(e)
    turn.moved = 0
    turn.speed = 0
    turn.vel = 0
    setTouched(true)
  }
  const onDialMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const turn = turnRef.current
    if (!turn.drag) return
    const a = angleAt(e)
    const d = dspWrap(a - turn.last)
    turn.last = a
    turn.cur += d
    turn.target = turn.cur
    turn.moved += Math.abs(d)
    turn.speed = turn.speed * 0.6 + d * 0.4
    if (turn.moved >= 3) select(dspIndexAt(turn.cur, n))
  }
  const onDialUp = () => {
    const turn = turnRef.current
    if (!turn.drag) return
    turn.drag = false
    if (turn.moved < 3) {
      // a tap: one step on, and a pulse of light
      setPulse((p) => p + 1)
      goTo(indexRef.current + 1, 1)
      return
    }
    turn.target = dspSnap(turn.cur + turn.speed * 5, n)
    select(dspIndexAt(turn.target, n))
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (phase !== "landing") {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        rush()
      }
      return
    }
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault()
      setTouched(true)
      goTo(indexRef.current + 1, 1)
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault()
      setTouched(true)
      goTo(indexRef.current - 1, -1)
    } else if (e.key === "Home") {
      e.preventDefault()
      goTo(0)
    } else if (e.key === "End") {
      e.preventDefault()
      goTo(n - 1)
    }
  }

  const loading = phase === "boot" || phase === "load"
  const gua = lit > 0 ? DSP_TRIGRAMS[lit - 1] : null
  const status = phase === "summon" ? "Summoning" : "Unsealing"

  return (
    <div
      ref={rootRef}
      className={"dsp-root " + className}
      data-phase={phase}
      data-tall={frame.tall}
      data-touched={touched}
      data-pulse={pulse ? 1 : 0}
      data-cy={frame.tall ? 0.42 : 0.5}
      style={
        {
          height,
          "--dsp-s": frame.s + "px",
          "--dsp-cy": frame.tall ? "42%" : "50%",
          "--dsp-mx": 0,
          "--dsp-my": 0,
          "--dsp-p": skipIntro ? 1 : 0,
          "--dsp-a": 0,
          "--dsp-n": -90,
          "--dsp-stage": colors.stage,
          "--dsp-face": colors.face,
          "--dsp-ink": colors.ink,
          "--dsp-paper": colors.paper,
          "--dsp-shade": colors.shade,
          "--dsp-glow": colors.glow,
          "--dsp-seal": colors.seal,
          "--dsp-text": colors.text,
          "--dsp-chop-ink": isLight(colors.seal) ? colors.face : light ? colors.paper : colors.text,
          "--dsp-lift": light ? "rgba(255, 250, 238, 0.7)" : "color-mix(in srgb, " + colors.glow + " 10%, transparent)",
          "--dsp-vig": light ? "rgba(90, 60, 25, 0.38)" : "rgba(0, 0, 0, 0.78)",
          "--dsp-blend-paper": light ? "multiply" : "soft-light",
          "--dsp-paper-k": light ? 0.45 : 0.9,
          "--dsp-blend-light": light ? "multiply" : "screen",
          "--dsp-cjk": fontFamily,
          "--dsp-latin": LATIN_STACK,
          "--dsp-mono": MONO_STACK,
          "--dsp-paper-tex": tex?.paper ?? "none",
          "--dsp-grain-tex": tex?.grain ?? "none",
        } as React.CSSProperties
      }
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onClick={loading || phase === "summon" ? rush : undefined}
      onKeyDown={onKeyDown}
    >
      <style>{DSP_CSS}</style>
      <div className="dsp-shell">
        <div className="dsp-backdrop" />
        <div className="dsp-paper" />
        <div className="dsp-glow" />

        <div className="dsp-weave" key={cycle}>
          <div className="dsp-emblem">
            <Rings uid={uid} maskRef={maskRef} sparkRef={sparkRef} />
            <Dragon />
            <Hands uid={uid} />
            <Seal count={n} trigramRefs={trigramRefs} />
            <div
              className="dsp-dial"
              role="slider"
              tabIndex={phase === "landing" ? 0 : -1}
              aria-label="Turn the seal to change the credit"
              aria-valuemin={1}
              aria-valuemax={n}
              aria-valuenow={safeIndex + 1}
              aria-valuetext={credit ? credit.name + (credit.nameLatin ? " (" + credit.nameLatin + ")" : "") + ", " + (credit.rolesLatin || credit.roles) : undefined}
              onPointerDown={onDialDown}
              onPointerMove={onDialMove}
              onPointerUp={onDialUp}
              onPointerCancel={onDialUp}
            />
          </div>
        </div>
        <div className="dsp-flash" key={"f" + pulse} />

        <div className="dsp-vignette" />
        <div className="dsp-grain" />
        <div className="dsp-flicker" />
        <i className="dsp-scratch" />
        <i className="dsp-scratch" />

        <div className="dsp-ui">
          <div className="dsp-top">
            {phase === "landing" ? (
              <>
                <div className="dsp-brand">
                  <button
                    type="button"
                    className="dsp-btn dsp-chop"
                    title="Replay the opening"
                    aria-label={brand + " — replay the opening"}
                    data-many={Array.from(brand).length > 2}
                    onClick={() => setVeil(true)}
                  >
                    {Array.from(brand)
                      .slice(0, 4)
                      .map((ch, i) => (
                        <span key={i}>{ch}</span>
                      ))}
                  </button>
                  <span className="dsp-brand-latin">{brandLatin}</span>
                </div>
                {nav.length ? (
                  <nav className="dsp-nav" aria-label={brandLatin || brand}>
                    {nav.map((l, i) => (
                      <LinkOrButton key={i} link={l} className="" />
                    ))}
                  </nav>
                ) : null}
              </>
            ) : (
              <>
                <span className="dsp-tc" aria-hidden="true">
                  <b>●</b> R{String(cycle + 1).padStart(2, "0")} · <span ref={tcRef}>00:00:00:00</span>
                </span>
                <span className="dsp-tc" aria-hidden="true">
                  {FPS} fps · {status}
                </span>
              </>
            )}
          </div>

          {verse ? (
            <p className="dsp-verse" aria-hidden={phase !== "landing"}>
              {verse}
            </p>
          ) : null}

          <div
            className="dsp-readout"
            role="progressbar"
            tabIndex={loading ? 0 : -1}
            aria-label={brandLatin || brand}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-valuetext={loading ? pct + "%" : "Loaded"}
            aria-hidden={!loading}
          >
            <span className="dsp-kicker">
              启封 <small>· {status}</small>
            </span>
            <span className="dsp-count">
              {String(pct).padStart(3, "0")}
              <small>%</small>
            </span>
            <span className="dsp-gua">
              {gua ? (
                <>
                  <b>{gua.han}</b>
                  {gua.name}
                </>
              ) : (
                " "
              )}
            </span>
            <span className="dsp-track">
              <i />
              {Array.from({ length: 9 }, (_, i) => (
                <s key={i} style={{ left: (i / 8) * 100 + "%" }} />
              ))}
            </span>
          </div>

          {phase === "landing" && credit ? (
            <div className="dsp-credits" aria-live="polite">
              {prev !== null && prev !== safeIndex && credits[prev] ? <Credit key={"o" + prev + "-" + index} credit={credits[prev]} state="out" /> : null}
              <Credit key={"i" + safeIndex + "-" + cycle} credit={credit} state="in" />
            </div>
          ) : null}

          {phase === "landing" ? (
            <div className="dsp-controls">
              {n > 1 ? (
                <div className="dsp-index">
                  <button
                    type="button"
                    className="dsp-btn dsp-arrow"
                    aria-label="Previous credit"
                    onClick={() => {
                      setTouched(true)
                      goTo(indexRef.current - 1, -1)
                    }}
                  >
                    <Arrow flip />
                  </button>
                  <span aria-hidden="true">
                    <b>{String(safeIndex + 1).padStart(2, "0")}</b> / {String(n).padStart(2, "0")}
                  </span>
                  <button
                    type="button"
                    className="dsp-btn dsp-arrow"
                    aria-label="Next credit"
                    onClick={() => {
                      setTouched(true)
                      goTo(indexRef.current + 1, 1)
                    }}
                  >
                    <Arrow />
                  </button>
                </div>
              ) : null}
              <LinkOrButton link={cta} className="dsp-cta" onClick={onEnter}>
                <span>{cta.label}</span>
                <svg viewBox="0 0 18 10" aria-hidden="true">
                  <path d="M0 5H16M12 1L16 5L12 9" fill="none" stroke="currentColor" strokeWidth="1.1" />
                </svg>
              </LinkOrButton>
            </div>
          ) : (
            <button type="button" className="dsp-btn dsp-skip" onClick={(e) => (e.stopPropagation(), rush())}>
              Skip
            </button>
          )}

          {phase === "landing" && n > 1 ? (
            <span className="dsp-hint" aria-hidden="true">
              转动印盘 · Drag the seal
            </span>
          ) : null}
        </div>

        <div className="dsp-boot" />
        <div className="dsp-veil" data-on={veil} />
      </div>
    </div>
  )
}
