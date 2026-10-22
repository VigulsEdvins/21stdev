"use client"

import * as React from "react"

/**
 * Velocity Reel — a scroll-scrubbed cinematic title sequence.
 *
 * Ten shots, one canvas, no assets: a rim-lit face, an archer drawing, an
 * arrow through glass, a blade through what is left of it, a fly-through of
 * the shards, then a jet, a supercar and a formula car tearing out of the
 * debris on red light, a burst, and an emblem. Scroll is the timeline — scrub
 * back and it runs backwards. Everything is drawn from numbers, so it weighs
 * nothing and stays sharp at any resolution.
 */

export type Scene =
  | "portrait"
  | "archer"
  | "arrow"
  | "blade"
  | "shatter"
  | "jet"
  | "car"
  | "formula"
  | "burst"
  | "emblem"

/** How a chapter arrives: a crossfade, or a hard cut on a white-hot frame. */
export type Cut = "fade" | "flash"

export type ReelChapter = {
  scene: Scene
  title: string
  kicker?: string
  line?: string
  cut?: Cut
}

export type VelocityReelProps = {
  chapters?: ReelChapter[]
  /** Viewport-heights of scroll per chapter. */
  chapterScroll?: number
  /** Height of the sticky stage. Must be a definite length. */
  height?: string
  /** Everything fast is this colour. Hex. */
  accent?: string
  /** The cold back-light on silhouettes and glass. Hex. */
  rim?: string
  /** The brightest tone on polished metal. Hex. */
  metal?: string
  /** SVG path data in a 200×200 box for the final shot. Default: a bevelled star. */
  emblem?: string
  /** Film grain strength, 0 to disable. */
  grain?: number
  letterbox?: boolean
  hud?: boolean
  /** Pointer moves the camera and the key light. */
  parallax?: boolean
  /** Length the timecode pretends the reel runs. */
  reelSeconds?: number
  className?: string
}

// #region story
// Pure: position → what is on screen. Lifted out and run by the test.

export const clamp01 = (v: number): number => (v > 0 ? (v > 1 ? 1 : v) : 0)

export const smoothstep = (edge0: number, edge1: number, x: number): number => {
  if (edge0 === edge1) return x < edge0 ? 0 : 1
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

/**
 * 0 when the element's top meets the viewport's top, 1 when its bottom meets
 * the viewport's bottom. Measured from the element, so it stays in step
 * wherever the reel sits on a page.
 */
export const progressFrom = (top: number, height: number, viewport: number): number => {
  const travel = height - viewport
  if (!(travel > 0)) return 0
  return clamp01(-top / travel)
}

/** Which chapter a progress lands in, and how far through it. */
export const chapterAt = (progress: number, count: number): { index: number; local: number } => {
  if (!(count > 0)) return { index: 0, local: 0 }
  const x = clamp01(progress) * count
  const index = Math.min(count - 1, Math.floor(x))
  return { index, local: clamp01(x - index) }
}

/** How much of the next shot is on screen at the tail of this one. */
export const mixAt = (local: number, window: number): number =>
  window > 0 ? smoothstep(1 - window, 1, local) : 0

/** Strength of the white frame on a hard cut, either side of the boundary. */
export const flashAt = (local: number, into: boolean, out: boolean): number =>
  Math.max(into ? 1 - smoothstep(0, 0.07, local) : 0, out ? smoothstep(0.95, 1, local) : 0)

/** The title: slides in, holds, leaves. The first is up before anyone scrolls; the last stays. */
export const titleReveal = (local: number, first = false, last = false): number =>
  (first ? 1 : smoothstep(0.04, 0.22, local)) * (last ? 1 : 1 - smoothstep(0.8, 0.95, local))

/** HH:MM:SS:FF at a given frame rate, for a progress through a reel of `seconds`. */
export const timecode = (progress: number, seconds: number, fps = 24): string => {
  const frames = Math.floor(clamp01(progress) * Math.max(0, seconds) * fps)
  const ff = frames % fps
  const s = Math.floor(frames / fps)
  const pad = (v: number) => String(v).padStart(2, "0")
  return pad(Math.floor(s / 3600)) + ":" + pad(Math.floor(s / 60) % 60) + ":" + pad(s % 60) + ":" + pad(ff)
}

/** Deterministic 0..1 noise from an integer. Same shard, same place, every scrub. */
export const hash = (n: number): number => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

/** "#rgb" or "#rrggbb" → [r, g, b]. Anything else falls back to white. */
export const rgbOf = (hex: string): [number, number, number] => {
  let h = hex.trim().replace(/^#/, "")
  if (/^[0-9a-f]{3}$/i.test(h)) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  if (!/^[0-9a-f]{6}$/i.test(h)) return [255, 255, 255]
  const v = parseInt(h, 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}

export const rgba = (hex: string, a: number): string => {
  const [r, g, b] = rgbOf(hex)
  return "rgba(" + r + "," + g + "," + b + "," + clamp01(a).toFixed(3) + ")"
}

/** The hex scaled towards black (k < 1) or white (k > 1). */
export const shade = (hex: string, k: number): string => {
  const c = rgbOf(hex).map((v) =>
    Math.round(k <= 1 ? v * Math.max(0, k) : v + (255 - v) * Math.min(1, k - 1)),
  )
  return "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")"
}

/**
 * Device pixels per scene unit. Shots are composed in a 1600×900 frame; a
 * landscape screen fits it, a portrait one crops the sides rather than
 * shrinking the subject to a postage stamp.
 */
export const fitScale = (w: number, h: number): number => {
  if (!(w > 0 && h > 0)) return 0
  return Math.max(Math.min(w / 1600, h / 900), Math.min(w / 1000, h / 900))
}
// #endregion

const DEFAULT_CHAPTERS: ReelChapter[] = [
  { scene: "portrait", kicker: "Stillness", title: "FOCUS", line: "Before anything moves, everything is decided." },
  { scene: "archer", kicker: "Intent", title: "DRAW", line: "Tension is just speed that hasn't happened yet." },
  { scene: "arrow", kicker: "Commit", title: "RELEASE", line: "One frame. No second attempt.", cut: "flash" },
  { scene: "blade", kicker: "Precision", title: "PIERCE", line: "Force breaks things. Precision chooses where.", cut: "flash" },
  { scene: "shatter", kicker: "Threshold", title: "BREAK", line: "Every limit is glass from the other side.", cut: "flash" },
  { scene: "jet", kicker: "Altitude", title: "ASCEND", line: "Faster than the sound it makes." },
  { scene: "car", kicker: "Momentum", title: "VELOCITY", line: "The road is only a suggestion.", cut: "flash" },
  { scene: "formula", kicker: "Margin", title: "APEX", line: "Thousandths of a second, argued with a right foot." },
  { scene: "burst", kicker: "Ignition", title: "IGNITE", line: "All of it, at once.", cut: "flash" },
  { scene: "emblem", kicker: "Everything that moves", title: "REDLINE", line: "Scroll back. Watch it again." },
]

const SANS = 'ui-sans-serif, system-ui, "Helvetica Neue", Helvetica, Arial, sans-serif'
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace'
const TAU = Math.PI * 2
const BODY = "#030406"

const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3)
const easeIn = (x: number) => Math.pow(clamp01(x), 3)
const easeInOut = (x: number) => {
  const v = clamp01(x)
  return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2
}
const easeBack = (x: number) => {
  const v = clamp01(x)
  const c = 1.9
  return 1 + (c + 1) * Math.pow(v - 1, 3) + c * Math.pow(v - 1, 2)
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

// ---------------------------------------------------------------------------
// Drawing kit. Every shot is composed in scene units: origin at the centre of
// the frame, ±800 wide by ±450 tall, y down.

type Frame = {
  g: CanvasRenderingContext2D
  w: number
  h: number
  /** device px per scene unit */
  k: number
  /** half the visible frame, in scene units */
  hw: number
  hh: number
  /** progress through this shot, 0..1 */
  t: number
  /** ambient clock in seconds; frozen under reduced motion */
  time: number
  /** smoothed pointer, -1..1 */
  px: number
  py: number
  accent: string
  rim: string
  metal: string
  emblem: Path2D | null
}

/** Put the pen in scene space, with a camera zoom, offset, and pointer parallax. */
const view = (f: Frame, zoom = 1, ox = 0, oy = 0, depth = 1) => {
  const s = f.k * zoom
  f.g.setTransform(s, 0, 0, s, f.w / 2 + (ox - f.px * 36 * depth) * f.k, f.h / 2 + (oy - f.py * 22 * depth) * f.k)
}

const screen = (f: Frame) => f.g.setTransform(1, 0, 0, 1, 0, 0)

/** Fill the frame, then lay a soft pool of colour at a point in scene space. */
const backdrop = (f: Frame, base: string, glow: string, gx: number, gy: number, radius: number, a: number) => {
  const g = f.g
  screen(f)
  g.globalCompositeOperation = "source-over"
  g.globalAlpha = 1
  g.fillStyle = base
  g.fillRect(0, 0, f.w, f.h)
  const cx = f.w / 2 + gx * f.k
  const cy = f.h / 2 + gy * f.k
  const r = Math.max(1, radius * f.k)
  const grad = g.createRadialGradient(cx, cy, 0, cx, cy, r)
  grad.addColorStop(0, rgba(glow, a))
  grad.addColorStop(0.45, rgba(glow, a * 0.3))
  grad.addColorStop(1, rgba(glow, 0))
  g.fillStyle = grad
  g.fillRect(0, 0, f.w, f.h)
}

/** A closed, smoothed outline through a flat [x, y, x, y…] list. */
const smooth = (pts: number[]): Path2D => {
  const p = new Path2D()
  const n = pts.length / 2
  if (n < 3) return p
  const X = (i: number) => pts[((i % n) + n) % n * 2]
  const Y = (i: number) => pts[((i % n) + n) % n * 2 + 1]
  p.moveTo((X(-1) + X(0)) / 2, (Y(-1) + Y(0)) / 2)
  for (let i = 0; i < n; i++) p.quadraticCurveTo(X(i), Y(i), (X(i) + X(i + 1)) / 2, (Y(i) + Y(i + 1)) / 2)
  p.closePath()
  return p
}

/** A closed polygon with hard corners, for wings and fins. Several lists = several pieces. */
const sharp = (...parts: number[][]): Path2D => {
  const p = new Path2D()
  for (const pts of parts) {
    for (let i = 0; i < pts.length; i += 2) {
      if (i === 0) p.moveTo(pts[i], pts[i + 1])
      else p.lineTo(pts[i], pts[i + 1])
    }
    p.closePath()
  }
  return p
}

/** A right half traced top to bottom, completed into a symmetric outline. */
const mirrored = (right: number[]): number[] => {
  const left: number[] = []
  for (let i = right.length - 2; i >= 0; i -= 2) if (right[i] !== 0) left.push(-right[i], right[i + 1])
  return right.concat(left)
}

/** Points around a wheel arch, left to right over the top. */
const arch = (cx: number, cy: number, r: number, steps = 9): number[] => {
  const out: number[] = []
  for (let i = 0; i <= steps; i++) {
    const a = Math.PI - (Math.PI * i) / steps
    out.push(cx + Math.cos(a) * r, cy - Math.sin(a) * r)
  }
  return out
}

/**
 * Rim light on any silhouette. The shape is painted in the rim colour with a
 * halo, then painted again in black, nudged away from the light and pulled in
 * slightly — the sliver left uncovered is the rim. Works for strokes and fills
 * alike, so limbs can be lines.
 */
const rimLit = (
  f: Frame,
  paint: (style: string) => void,
  lx: number,
  ly: number,
  width: number,
  strength: number,
  cx = 0,
  cy = 0,
  inset = 0.985,
) => {
  const g = f.g
  g.save()
  g.shadowColor = rgba(f.rim, 0.85)
  g.shadowBlur = 46 * f.k
  g.globalAlpha = 0.55 * strength
  paint(f.rim)
  g.shadowBlur = 8 * f.k
  g.globalAlpha = strength
  paint(shade(f.rim, 1.35))
  g.restore()
  g.save()
  g.translate(cx - lx * width, cy - ly * width)
  g.scale(inset, inset)
  g.translate(-cx, -cy)
  paint(BODY)
  g.restore()
}

/** A light streak fading in from x1 and hot at x2, with a glow around a white core. */
const trail = (f: Frame, x1: number, x2: number, y: number, color: string, width: number, a: number) => {
  if (a <= 0.002 || Math.abs(x2 - x1) < 1) return
  const g = f.g
  g.save()
  g.globalCompositeOperation = "lighter"
  const layers: [number, number, string][] = [
    [7, 0.07, color],
    [3, 0.22, color],
    [1, 0.85, color],
    [0.32, 0.9, "#ffffff"],
  ]
  for (const [wm, am, c] of layers) {
    const grad = g.createLinearGradient(x1, y, x2, y)
    grad.addColorStop(0, rgba(c, 0))
    grad.addColorStop(0.7, rgba(c, a * am * 0.6))
    grad.addColorStop(1, rgba(c, a * am))
    g.fillStyle = grad
    const hw = (width * wm) / 2
    g.beginPath()
    g.moveTo(x1, y - hw * 0.2)
    g.lineTo(x2, y - hw)
    g.quadraticCurveTo(x2 + hw, y, x2, y + hw)
    g.lineTo(x1, y + hw * 0.2)
    g.closePath()
    g.fill()
  }
  g.restore()
}

/** An anamorphic lens flare: a long horizontal blade of light, a bloom, a hot point. */
const flare = (f: Frame, x: number, y: number, size: number, color: string, a: number, reach = 16) => {
  if (a <= 0.002) return
  const g = f.g
  g.save()
  g.globalCompositeOperation = "lighter"
  const L = size * reach
  const blade = g.createLinearGradient(x - L, y, x + L, y)
  blade.addColorStop(0, rgba(color, 0))
  blade.addColorStop(0.5, rgba(color, a * 0.8))
  blade.addColorStop(1, rgba(color, 0))
  g.fillStyle = blade
  g.fillRect(x - L, y - size * 0.05, L * 2, size * 0.1)
  const core = g.createLinearGradient(x - L * 0.5, y, x + L * 0.5, y)
  core.addColorStop(0, "rgba(255,255,255,0)")
  core.addColorStop(0.5, "rgba(255,255,255," + (a * 0.9).toFixed(3) + ")")
  core.addColorStop(1, "rgba(255,255,255,0)")
  g.fillStyle = core
  g.fillRect(x - L * 0.5, y - size * 0.014, L, size * 0.028)
  const bloom = g.createRadialGradient(x, y, 0, x, y, size)
  bloom.addColorStop(0, "rgba(255,255,255," + a.toFixed(3) + ")")
  bloom.addColorStop(0.18, rgba(color, a * 0.55))
  bloom.addColorStop(1, rgba(color, 0))
  g.fillStyle = bloom
  g.beginPath()
  g.arc(x, y, size, 0, TAU)
  g.fill()
  g.restore()
}

/**
 * Horizontal speed lines. Position is a function of `phase`, not accumulated
 * state, so scrubbing backwards runs them backwards.
 */
const speedLines = (
  f: Frame,
  count: number,
  y0: number,
  spread: number,
  color: string,
  a: number,
  phase: number,
  len: number,
  seed: number,
  width = 2.2,
) => {
  if (a <= 0.002) return
  const g = f.g
  g.save()
  g.globalCompositeOperation = "lighter"
  for (let i = 0; i < count; i++) {
    const r1 = hash(seed + i * 3.1)
    const r2 = hash(seed + i * 7.7)
    const r3 = hash(seed + i * 1.3)
    const L = len * (0.35 + r2 * 0.9)
    const span = f.hw * 2 + L * 2
    const raw = r1 * span - phase * (0.5 + r3) * 1400
    const x = ((raw % span) + span) % span - f.hw - L
    const y = y0 + (r3 - 0.5) * spread
    const grad = g.createLinearGradient(x, y, x + L, y)
    grad.addColorStop(0, rgba(color, 0))
    grad.addColorStop(0.85, rgba(color, a * (0.35 + r2 * 0.65)))
    grad.addColorStop(1, rgba(color, 0))
    g.fillStyle = grad
    const th = width * (0.4 + r1 * 1.2)
    g.fillRect(x, y - th / 2, L, th)
  }
  g.restore()
}

/** One glass shard: an irregular polygon, catching light as it turns. */
const shard = (f: Frame, x: number, y: number, size: number, rot: number, seed: number, tint: string, a: number) => {
  const g = f.g
  const sides = 3 + Math.floor(hash(seed * 1.7) * 3)
  g.save()
  g.translate(x, y)
  g.rotate(rot)
  g.beginPath()
  for (let j = 0; j < sides; j++) {
    const ang = (j / sides) * TAU + hash(seed + j * 5.3) * 0.9
    const rr = size * (0.45 + hash(seed + j * 9.1) * 0.75)
    const px = Math.cos(ang) * rr
    const py = Math.sin(ang) * rr * (0.5 + hash(seed * 3.3) * 0.6)
    if (j === 0) g.moveTo(px, py)
    else g.lineTo(px, py)
  }
  g.closePath()
  // The glint: shards flare as their face turns toward the light.
  const glint = Math.pow(Math.abs(Math.sin(rot * 1.7 + seed)), 6)
  g.fillStyle = rgba(tint, (0.07 + glint * 0.38) * a)
  g.fill()
  g.lineWidth = Math.max(0.6, size * 0.035)
  g.strokeStyle = "rgba(235,245,255," + ((0.35 + glint * 0.65) * a).toFixed(3) + ")"
  g.stroke()
  g.restore()
}

/** Dust hanging in a light: slow, deterministic, barely there. */
const motes = (f: Frame, count: number, color: string, a: number, seed: number) => {
  const g = f.g
  g.save()
  g.globalCompositeOperation = "lighter"
  for (let i = 0; i < count; i++) {
    const x = (hash(seed + i) - 0.5) * f.hw * 2 + Math.sin(f.time * 0.3 + i) * 12
    const span = f.hh * 2
    const raw = hash(seed + i * 2.3) * span - f.time * (4 + hash(i) * 10) - f.t * 60
    const y = ((raw % span) + span) % span - f.hh
    const r = 0.8 + hash(seed + i * 4.1) * 2.6
    g.fillStyle = rgba(color, a * (0.25 + hash(i * 6.1) * 0.75))
    g.beginPath()
    g.arc(x, y, r, 0, TAU)
    g.fill()
  }
  g.restore()
}

/** Brushed metal, top-lit: bright crest, dark waist, a bounce of light underneath. */
const metalFill = (f: Frame, top: number, bottom: number) => {
  const grad = f.g.createLinearGradient(0, top, 0, bottom)
  grad.addColorStop(0, shade(f.metal, 1.08))
  grad.addColorStop(0.22, shade(f.metal, 0.62))
  grad.addColorStop(0.46, shade(f.metal, 0.1))
  grad.addColorStop(0.7, shade(f.metal, 0.32))
  grad.addColorStop(1, shade(f.metal, 0.04))
  return grad
}

/** A slow white band raking across a clipped shape — the thing that reads as "polished". */
const sheen = (f: Frame, clip: Path2D, pos: number, spread: number, a: number) => {
  const g = f.g
  g.save()
  g.clip(clip)
  g.globalCompositeOperation = "lighter"
  const grad = g.createLinearGradient(pos - spread, -spread, pos + spread, spread)
  grad.addColorStop(0, "rgba(255,255,255,0)")
  grad.addColorStop(0.5, "rgba(255,255,255," + a.toFixed(3) + ")")
  grad.addColorStop(1, "rgba(255,255,255,0)")
  g.fillStyle = grad
  g.fillRect(pos - spread * 2, -2000, spread * 4, 4000)
  g.restore()
}

/** A floor that mirrors what is drawn by `paint` and fades it into the dark. */
const reflect = (f: Frame, ground: number, paint: () => void, a: number) => {
  const g = f.g
  g.save()
  g.globalAlpha = a
  g.translate(0, ground * 2)
  g.scale(1, -1)
  paint()
  g.restore()
  const fade = g.createLinearGradient(0, ground, 0, ground + 260)
  fade.addColorStop(0, "rgba(2,3,5,0.25)")
  fade.addColorStop(1, "rgba(2,3,5,1)")
  g.fillStyle = fade
  g.fillRect(-f.hw - 400, ground, f.hw * 2 + 800, f.hh + 600)
}

// ---------------------------------------------------------------------------
// Shapes, composed once at module load.

const HEAD = smooth(
  mirrored([
    0, -500, 100, -490, 180, -452, 236, -388, 264, -306, 272, -222, 270, -160, 290, -165, 305, -130, 306, -80,
    294, -30, 272, -2, 262, 50, 248, 120, 222, 185, 178, 238, 148, 290, 140, 360, 152, 405, 232, 440, 360, 474,
    520, 520, 640, 590, 720, 700, 760, 860, 780, 1100,
  ]),
)

const TORSO = smooth([
  -95, -205, -30, -226, 60, -218, 112, -196, 122, -120, 104, -40, 80, 40, 72, 120, 80, 200, 78, 520, -98, 520,
  -104, 200, -118, 100, -134, 0, -140, -100, -128, -172,
])

const JET = smooth([
  660, 0, 540, -18, 400, -38, 250, -58, 130, -76, 20, -72, -80, -56, -300, -50, -470, -56, -600, -58, -652, -44,
  -664, 4, -622, 26, -420, 40, -200, 48, 100, 46, 200, 30, 400, 18, 560, 8,
])
const JET_FIN = sharp([-380, -52, -520, -236, -566, -250, -610, -250, -600, -56])
const JET_CANOPY = smooth([262, -56, 190, -96, 80, -110, -6, -88, 60, -70, 180, -62])
const JET_WING = smooth([90, 22, -300, 112, -430, 112, -330, 30])
const JET_TAILPLANE = smooth([-470, 18, -630, 72, -690, 72, -610, 18])

const CAR = smooth(
  [
    505, -40, 522, -70, 500, -102, 440, -122, 300, -142, 150, -172, 40, -234, -80, -252, -200, -242, -330, -202,
    -440, -168, -506, -152, -526, -116, -520, -62, -500, -38, -440, -34,
  ].concat(arch(-330, -70, 104), [-230, -34, 230, -34], arch(330, -70, 100), [440, -34]),
)
const CAR_GLASS = smooth([140, -178, 36, -228, -80, -242, -196, -232, -300, -202, -150, -186, 40, -180])
const CAR_INTAKE = smooth([-250, -150, -150, -148, -120, -112, -206, -96])

const FORMULA = smooth([
  650, -40, 600, -54, 420, -72, 250, -94, 120, -112, 60, -132, -60, -134, -120, -196, -206, -196, -300, -142,
  -440, -118, -540, -104, -600, -74, -584, -38, -400, -34, 400, -34, 600, -30,
])
const FORMULA_REAR = sharp(
  [-470, -262, -626, -262, -632, -226, -470, -232],
  [-520, -232, -540, -232, -552, -104, -530, -104],
  [-470, -272, -482, -272, -482, -150, -470, -150],
)
const FORMULA_WING = smooth([540, -18, 690, -18, 700, -44, 690, -48, 556, -42])

// ---------------------------------------------------------------------------
// The shots. Each paints the whole frame, background included, from `f.t`.

const portrait = (f: Frame) => {
  const { g, t } = f
  const lit = easeOut(t / 0.55)
  backdrop(f, "#020306", f.rim, 0, -120, 900, 0.08 + lit * 0.1)
  const zoom = 1 + easeInOut(t) * 0.14
  view(f, zoom, 0, 40 + easeInOut(t) * 30, 0.6)
  // The key light swings with the pointer, so the rim runs round the head.
  const ang = -Math.PI / 2 + f.px * 0.7
  const lx = Math.cos(ang)
  const ly = Math.sin(ang)
  rimLit(
    f,
    (s) => {
      g.fillStyle = s
      g.fill(HEAD)
    },
    lx,
    ly,
    3 + lit * 8,
    0.25 + lit * 0.75,
    0,
    -60,
    0.985 - lit * 0.006,
  )
  // A cold catch on the cheekbones, only just there.
  g.save()
  g.clip(HEAD)
  g.globalCompositeOperation = "lighter"
  for (const side of [-1, 1]) {
    const cg = g.createRadialGradient(side * 200, -60, 0, side * 200, -60, 160)
    cg.addColorStop(0, rgba(f.rim, 0.07 * lit * (1 + side * f.px * 0.8)))
    cg.addColorStop(1, rgba(f.rim, 0))
    g.fillStyle = cg
    g.fillRect(side * 200 - 200, -260, 400, 400)
  }
  g.restore()
  motes(f, 40, f.rim, 0.35 * lit, 11)
  view(f, 1, 0, 0, 0.2)
  const pulse = 0.75 + Math.sin(f.time * 1.7) * 0.08
  // Kept short of the face: the blades frame the head, they do not cross it.
  flare(f, -f.hw * 0.9, -130, 80, f.rim, lit * pulse, 3.2)
  flare(f, f.hw * 0.9, -130, 80, f.rim, lit * pulse, 3.2)
}

const archer = (f: Frame) => {
  const { g, t } = f
  backdrop(f, "#020306", f.rim, 360, -260, 900, 0.12)
  view(f, 1 + t * 0.06, -170 - t * 30, 60, 0.7)
  const draw = easeInOut(t / 0.6)
  const released = t > 0.82
  const since = (t - 0.82) / 0.18
  const tremble = !released && t > 0.6 ? Math.sin(f.time * 23) * 1.4 : 0
  const pull = released ? 1 : draw
  const hx = lerp(250, 30, pull) + tremble
  const hy = -212
  const ex = lerp(40, -205, pull)
  const ey = lerp(-168, -214, pull)

  const lx = -0.55 + f.px * 0.4
  const ly = -0.83
  rimLit(
    f,
    (s) => {
      g.fillStyle = s
      g.strokeStyle = s
      g.lineCap = "round"
      g.lineJoin = "round"
      g.beginPath()
      g.ellipse(0, -300, 52, 62, 0.08, 0, TAU)
      g.fill()
      g.fillRect(-30, -256, 60, 56)
      g.fill(TORSO)
      g.lineWidth = 44
      g.beginPath()
      g.moveTo(96, -190)
      g.lineTo(232, -198)
      g.stroke()
      g.lineWidth = 32
      g.beginPath()
      g.moveTo(232, -198)
      g.lineTo(372, -202)
      g.stroke()
      g.lineWidth = 42
      g.beginPath()
      g.moveTo(-80, -190)
      g.lineTo(ex, ey)
      g.stroke()
      g.lineWidth = 30
      g.beginPath()
      g.moveTo(ex, ey)
      g.lineTo(hx, hy)
      g.stroke()
      g.beginPath()
      g.arc(hx, hy, 22, 0, TAU)
      g.arc(376, -200, 24, 0, TAU)
      g.fill()
    },
    lx,
    ly,
    7,
    0.95,
    0,
    -120,
  )

  // The bow: a compound limb that flexes as it is drawn.
  const flex = 60 + pull * 50
  const tipTop = { x: 372 - flex, y: -560 }
  const tipBot = { x: 372 - flex, y: 150 }
  g.save()
  g.lineCap = "round"
  const limb = g.createLinearGradient(0, -560, 0, 150)
  limb.addColorStop(0, shade(f.metal, 0.9))
  limb.addColorStop(0.5, shade(f.metal, 0.2))
  limb.addColorStop(1, shade(f.metal, 0.7))
  g.strokeStyle = limb
  g.lineWidth = 15
  g.beginPath()
  g.moveTo(tipTop.x, tipTop.y)
  g.quadraticCurveTo(420, -390, 376, -200)
  g.quadraticCurveTo(420, -10, tipBot.x, tipBot.y)
  g.stroke()
  g.fillStyle = shade(f.metal, 0.5)
  for (const tp of [tipTop, tipBot]) {
    g.beginPath()
    g.arc(tp.x, tp.y, 17, 0, TAU)
    g.fill()
  }
  // The string: lit by the back-light, and after the shot, ringing.
  g.strokeStyle = rgba(f.rim, 0.85)
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(tipTop.x, tipTop.y)
  if (released) {
    const ring = Math.sin(since * 70) * Math.exp(-since * 5) * 40
    g.quadraticCurveTo(tipTop.x + ring, hy, tipBot.x, tipBot.y)
  } else g.lineTo(hx, hy)
  if (!released) g.lineTo(tipBot.x, tipBot.y)
  g.stroke()
  g.restore()

  // The arrow, nocked, then gone.
  const fly = released ? Math.pow(since, 2) * 3200 : 0
  const tail = hx - 30 + fly
  const tip = hx + 610 + fly
  if (released) trail(f, hx - 200, tail, hy, f.accent, 16, 1 - since * 0.4)
  g.save()
  const shaft = g.createLinearGradient(0, hy - 5, 0, hy + 5)
  shaft.addColorStop(0, shade(f.metal, 1.1))
  shaft.addColorStop(1, shade(f.metal, 0.2))
  g.fillStyle = shaft
  g.fillRect(tail, hy - 4, tip - tail - 60, 8)
  g.fillStyle = f.accent
  g.beginPath()
  g.moveTo(tail, hy - 3)
  g.lineTo(tail + 56, hy - 3)
  g.lineTo(tail + 18, hy - 15)
  g.closePath()
  g.moveTo(tail, hy + 3)
  g.lineTo(tail + 56, hy + 3)
  g.lineTo(tail + 18, hy + 15)
  g.closePath()
  g.fill()
  g.fillStyle = metalFill(f, hy - 20, hy + 20)
  g.beginPath()
  g.moveTo(tip, hy)
  g.lineTo(tip - 66, hy - 18)
  g.lineTo(tip - 56, hy)
  g.lineTo(tip - 66, hy + 18)
  g.closePath()
  g.fill()
  g.restore()
  flare(f, tip - 30, hy, 60, released ? f.accent : f.rim, released ? 1 - since : 0.35 + pull * 0.5)
  view(f, 1, 0, 0, 0.2)
  flare(f, f.hw * 0.7, -300, 110, f.rim, 0.5)
}

/** A thick sheet of glass seen at an angle, and the break that runs through it. */
const glassPane = (f: Frame, gx: number, ix: number, iy: number, crack: number, seed: number) => {
  const g = f.g
  const face = new Path2D()
  face.moveTo(gx - 50, -f.hh - 60)
  face.lineTo(gx + 90, -f.hh - 110)
  face.lineTo(gx + 90, f.hh + 110)
  face.lineTo(gx - 50, f.hh + 60)
  face.closePath()
  const fill = g.createLinearGradient(gx - 50, 0, gx + 90, 0)
  fill.addColorStop(0, rgba(f.rim, 0.1))
  fill.addColorStop(0.5, rgba(f.rim, 0.035))
  fill.addColorStop(1, rgba(f.rim, 0.14))
  g.fillStyle = fill
  g.fill(face)
  g.strokeStyle = rgba(f.rim, 0.45)
  g.lineWidth = 1.5
  g.stroke(face)
  if (crack <= 0) return
  // Radial cracks, jagged, foreshortened onto the face.
  g.save()
  g.clip(face)
  g.globalCompositeOperation = "lighter"
  g.lineWidth = 1.3
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * TAU + hash(seed + i) * 0.3
    const len = (180 + hash(seed + i * 4.4) * 520) * crack
    g.strokeStyle = "rgba(225,240,255," + (0.3 + hash(i * 2.2) * 0.5).toFixed(3) + ")"
    g.beginPath()
    g.moveTo(ix, iy)
    let px = ix
    let py = iy
    for (let s = 1; s <= 6; s++) {
      const d = (len * s) / 6
      const jit = (hash(seed + i * 13 + s) - 0.5) * 0.5
      px = ix + Math.cos(a + jit) * d * 0.28
      py = iy + Math.sin(a + jit) * d
      g.lineTo(px, py)
    }
    g.stroke()
  }
  // Concentric fractures.
  for (let ring = 1; ring <= 3; ring++) {
    const rr = ring * 70 * crack
    g.strokeStyle = "rgba(210,232,255," + (0.35 / ring).toFixed(3) + ")"
    g.beginPath()
    for (let j = 0; j <= 24; j++) {
      const a = (j / 24) * TAU
      const wob = 1 + (hash(seed + ring * 31 + j) - 0.5) * 0.35
      const x = ix + Math.cos(a) * rr * wob * 0.28
      const y = iy + Math.sin(a) * rr * wob
      if (j === 0) g.moveTo(x, y)
      else g.lineTo(x, y)
    }
    g.stroke()
  }
  g.restore()
}

/** Shards thrown from a point. `tau` is seconds since the break. */
const burstShards = (
  f: Frame,
  ox: number,
  oy: number,
  tau: number,
  count: number,
  seed: number,
  spread: number,
  forward: number,
  scale = 1,
) => {
  if (tau <= 0) return
  const g = f.g
  for (let i = 0; i < count; i++) {
    const s = seed + i * 17.13
    const sp = (280 + hash(s) * 1000) * spread
    const ang = (hash(s + 1) - 0.5) * Math.PI * 1.25
    const vx = Math.cos(ang) * sp * forward + (hash(s + 2) - 0.3) * 200
    const vy = Math.sin(ang) * sp
    const x = ox + (hash(s + 3) - 0.5) * 40 + vx * tau
    const y = oy + (hash(s + 4) - 0.5) * 140 + vy * tau + 140 * tau * tau
    const size = (7 + Math.pow(hash(s + 5), 2) * 52) * scale
    const rot = hash(s + 6) * TAU + (hash(s + 7) - 0.5) * 9 * tau
    const tint = i % 6 === 0 ? f.accent : f.rim
    shard(f, x, y, size, rot, s, tint, 1)
  }
  // Glitter: the fine dust of the break.
  g.save()
  g.globalCompositeOperation = "lighter"
  for (let i = 0; i < count * 2; i++) {
    const s = seed + 999 + i * 5.7
    const sp = 500 + hash(s) * 1600
    const ang = (hash(s + 1) - 0.5) * Math.PI * 1.4
    const x = ox + Math.cos(ang) * sp * forward * tau
    const y = oy + Math.sin(ang) * sp * tau * 0.8
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(f.time * 8 + i))
    g.fillStyle = "rgba(230,242,255," + (tw * Math.max(0, 1 - tau * 0.5)).toFixed(3) + ")"
    const r = 1 + hash(s + 2) * 2.2
    g.fillRect(x, y, r, r)
  }
  g.restore()
}

const arrow = (f: Frame) => {
  const { g, t } = f
  const hit = 0.28
  const tau = Math.max(0, t - hit) * 1.25
  const gx = 140
  backdrop(f, "#03060b", f.rim, gx + 200, 0, 800, 0.16 + (t > hit ? Math.exp(-tau * 6) * 0.4 : 0))
  const shake = t > hit ? Math.sin(tau * 95) * Math.exp(-tau * 9) * 16 : 0
  view(f, 1.02 + t * 0.06, -60 + shake, shake * 0.5, 0.8)
  const tipX = t < hit ? lerp(-f.hw - 400, gx + 20, easeIn(t / hit) * 0.3 + (t / hit) * 0.7) : gx + 20 + easeOut((t - hit) / 0.72) * 230
  const y = 0
  // Red light rides in with it.
  trail(f, -f.hw - 200, tipX - 170, y, f.accent, 22, 1)
  speedLines(f, 16, y, 110, f.accent, 0.5, t * 2 + f.time * 0.3, 380, 40, 3)
  glassPane(f, gx, gx + 20, y, t > hit ? easeOut(tau * 3.2) : 0, 7)
  // The arrow: shaft, ferrule, a three-blade broadhead.
  g.save()
  const shaft = g.createLinearGradient(0, y - 9, 0, y + 9)
  shaft.addColorStop(0, shade(f.metal, 1.12))
  shaft.addColorStop(0.45, shade(f.metal, 0.55))
  shaft.addColorStop(1, shade(f.metal, 0.08))
  g.fillStyle = shaft
  g.fillRect(tipX - 1200, y - 9, 1060, 18)
  g.fillStyle = metalFill(f, y - 14, y + 14)
  g.fillRect(tipX - 190, y - 13, 60, 26)
  const head = new Path2D()
  head.moveTo(tipX, y)
  head.lineTo(tipX - 150, y - 44)
  head.lineTo(tipX - 196, y - 64)
  head.lineTo(tipX - 168, y - 12)
  head.lineTo(tipX - 168, y + 12)
  head.lineTo(tipX - 196, y + 64)
  head.lineTo(tipX - 150, y + 44)
  head.closePath()
  g.fillStyle = metalFill(f, y - 64, y + 64)
  g.fill(head)
  g.strokeStyle = "rgba(255,255,255,0.55)"
  g.lineWidth = 1.2
  g.beginPath()
  g.moveTo(tipX, y)
  g.lineTo(tipX - 168, y)
  g.stroke()
  sheen(f, head, tipX - 200 + t * 260, 40, 0.5)
  g.restore()
  burstShards(f, gx + 30, y, tau, 80, 3, 1, 1)
  if (t > hit) {
    view(f, 1, -60 + shake, 0, 0.8)
    flare(f, gx + 25, y, 140, f.rim, Math.exp(-tau * 3) * 1.2)
  }
  flare(f, tipX - 20, y, 50, f.accent, 0.6)
}

const blade = (f: Frame) => {
  const { g, t } = f
  backdrop(f, "#03070c", f.rim, 260, -80, 820, 0.2)
  view(f, 1.05 + t * 0.05, 0, 0, 0.9)
  // Suspended glass — time has nearly stopped.
  const drift = t * 0.6 + f.time * 0.03
  burstShards(f, 260, -20, 0.35 + drift, 46, 101, 0.55, 0.6, 1.8)
  const bx = lerp(-f.hw - 1000, -560, easeOut(t / 0.5)) + easeInOut((t - 0.5) / 0.5) * 140
  const by = 30
  g.save()
  g.translate(bx, by)
  g.rotate(-0.1)
  // Handle, guard, blade.
  g.fillStyle = "#0b0c0f"
  g.beginPath()
  g.moveTo(-420, -54)
  g.quadraticCurveTo(-200, -74, -10, -62)
  g.lineTo(-10, 70)
  g.quadraticCurveTo(-200, 84, -420, 58)
  g.quadraticCurveTo(-450, 2, -420, -54)
  g.fill()
  g.fillStyle = shade(f.metal, 0.45)
  for (const rx of [-330, -190]) {
    g.beginPath()
    g.arc(rx, 4, 11, 0, TAU)
    g.fill()
  }
  g.fillStyle = metalFill(f, -118, 122)
  g.fillRect(-26, -118, 30, 240)
  const knife = new Path2D()
  knife.moveTo(4, -70)
  knife.lineTo(820, -70)
  knife.lineTo(1010, -38)
  knife.lineTo(1130, 12)
  knife.quadraticCurveTo(900, 70, 620, 82)
  knife.lineTo(4, 76)
  knife.closePath()
  g.fillStyle = metalFill(f, -70, 82)
  g.fill(knife)
  // The bevel and the etching.
  g.save()
  g.clip(knife)
  g.fillStyle = "rgba(0,0,0,0.35)"
  g.beginPath()
  g.moveTo(4, 30)
  g.lineTo(940, 34)
  g.lineTo(1130, 12)
  g.quadraticCurveTo(900, 70, 620, 82)
  g.lineTo(4, 76)
  g.fill()
  g.strokeStyle = "rgba(20,24,30,0.4)"
  g.lineWidth = 1.6
  for (let i = 0; i < 26; i++) {
    const x = 120 + i * 26
    const yy = -26 + Math.sin(i * 0.9) * 10
    g.beginPath()
    g.moveTo(x, yy)
    g.bezierCurveTo(x + 8, yy - 18, x + 22, yy + 18, x + 30, yy - 2)
    g.stroke()
    if (i % 3 === 0) {
      g.beginPath()
      g.arc(x + 12, yy + 14, 5, 0, TAU)
      g.stroke()
    }
  }
  g.restore()
  g.strokeStyle = "rgba(255,255,255,0.7)"
  g.lineWidth = 1.5
  g.beginPath()
  g.moveTo(4, 76)
  g.lineTo(620, 82)
  g.quadraticCurveTo(900, 70, 1130, 12)
  g.stroke()
  sheen(f, knife, lerp(-300, 1400, t), 120, 0.55)
  g.restore()
  // A bolt of red light fires through the break.
  const bolt = smoothstep(0.45, 0.62, t)
  if (bolt > 0) {
    view(f, 1.05 + t * 0.05, 0, 0, 0.9)
    trail(f, -f.hw - 100, lerp(-f.hw, 280, bolt), -150, f.accent, 18, bolt)
    flare(f, lerp(-f.hw, 280, bolt), -150, 80, f.accent, bolt * 0.9)
  }
  const tipWorldX = bx + 1130
  if (tipWorldX > 180) flare(f, Math.min(tipWorldX, 400), by - 100, 70, f.rim, 0.6)
}

const shatter = (f: Frame) => {
  const { g, t } = f
  backdrop(f, "#02050a", f.rim, 0, 0, 900, 0.14)
  view(f, 1, 0, 0, 1.4)
  // Flying through a frozen explosion. Depth is analytic: z shrinks with t.
  const cam = t * 2.6 + f.time * 0.02
  const lens = 520
  const items: { z: number; i: number }[] = []
  for (let i = 0; i < 160; i++) {
    // Wraps to the back once it passes the lens; the fog hides the pop.
    const raw = 0.3 + hash(i * 3.7) * 3.2 - cam - 0.08
    items.push({ z: ((raw % 3.2) + 3.2) % 3.2 + 0.08, i })
  }
  items.sort((a, b) => b.z - a.z)
  for (const { z, i } of items) {
    const x = (hash(i * 1.9) - 0.5) * 1500
    const y = (hash(i * 2.9) - 0.5) * 900
    const sx = (x / z) * (lens / 520) - f.px * 60 / z
    const sy = (y / z) * (lens / 520) - f.py * 40 / z
    const size = (14 + hash(i * 5.1) * 40) / z
    if (Math.abs(sx) > f.hw + size * 2 || Math.abs(sy) > f.hh + size * 2) continue
    const fog = clamp01((3.28 - z) / 1.2)
    const tint = i % 5 === 0 ? f.accent : f.rim
    const rot = hash(i * 7.3) * TAU + (t * 3 + f.time * 0.2) * (hash(i) - 0.5) * 2
    g.globalAlpha = fog
    shard(f, sx, sy, size, rot, i * 11.3, tint, 1)
  }
  g.globalAlpha = 1
  // The red beam from the last shot, still burning through the middle.
  trail(f, -f.hw - 100, f.hw + 100, 30, f.accent, 10 + t * 20, 0.5 + t * 0.5)
  flare(f, f.px * 80, 30, 120, f.accent, 0.4 + t * 0.6)
}

/** A vehicle in profile: metal body, glass, an outline catching the rim light. */
const vehicle = (f: Frame, body: Path2D, top: number, bottom: number) => {
  const g = f.g
  g.fillStyle = metalFill(f, top, bottom)
  g.fill(body)
  const edge = g.createLinearGradient(0, top, 0, bottom)
  edge.addColorStop(0, rgba(f.rim, 0.9))
  edge.addColorStop(0.5, rgba(f.rim, 0.15))
  edge.addColorStop(1, rgba(f.rim, 0))
  g.strokeStyle = edge
  g.lineWidth = 2.2
  g.stroke(body)
}

const glassFill = (f: Frame, p: Path2D, top: number, bottom: number) => {
  const g = f.g
  const grad = g.createLinearGradient(0, top, 0, bottom)
  grad.addColorStop(0, "#1a1f27")
  grad.addColorStop(0.4, "#050608")
  grad.addColorStop(1, "#0d1016")
  g.fillStyle = grad
  g.fill(p)
  g.strokeStyle = "rgba(255,255,255,0.25)"
  g.lineWidth = 1.2
  g.stroke(p)
}

/** A wheel whose rim glows in the accent colour, spokes smeared by speed. */
const wheel = (f: Frame, cx: number, cy: number, r: number, spin: number, glow: number) => {
  const g = f.g
  g.fillStyle = "#050507"
  g.beginPath()
  g.arc(cx, cy, r, 0, TAU)
  g.fill()
  g.strokeStyle = "rgba(255,255,255,0.12)"
  g.lineWidth = 2
  g.stroke()
  g.save()
  g.globalCompositeOperation = "lighter"
  const hub = g.createRadialGradient(cx, cy, 0, cx, cy, r * 1.25)
  hub.addColorStop(0, rgba(f.accent, 0.85 * glow))
  hub.addColorStop(0.55, rgba(f.accent, 0.4 * glow))
  hub.addColorStop(1, rgba(f.accent, 0))
  g.fillStyle = hub
  g.beginPath()
  g.arc(cx, cy, r * 1.25, 0, TAU)
  g.fill()
  g.lineCap = "round"
  // Five twin spokes, drawn a few times at trailing angles: motion blur.
  for (let echo = 0; echo < 4; echo++) {
    g.strokeStyle = rgba(f.accent, (0.9 - echo * 0.22) * glow)
    g.lineWidth = r * 0.07
    for (let s = 0; s < 5; s++) {
      const a = spin + (s / 5) * TAU + echo * 0.09
      for (const off of [-0.09, 0.09]) {
        g.beginPath()
        g.moveTo(cx + Math.cos(a) * r * 0.18, cy + Math.sin(a) * r * 0.18)
        g.lineTo(cx + Math.cos(a + off) * r * 0.72, cy + Math.sin(a + off) * r * 0.72)
        g.stroke()
      }
    }
  }
  g.strokeStyle = rgba(f.accent, glow)
  g.lineWidth = r * 0.06
  g.beginPath()
  g.arc(cx, cy, r * 0.74, 0, TAU)
  g.stroke()
  g.strokeStyle = "rgba(255,255,255," + (0.8 * glow).toFixed(3) + ")"
  g.lineWidth = r * 0.02
  g.stroke()
  g.restore()
}

/** The ground the cars run on: a horizon line, and light moving over the floor. */
const road = (f: Frame, ground: number, phase: number) => {
  const g = f.g
  const hz = g.createLinearGradient(-f.hw, 0, f.hw, 0)
  hz.addColorStop(0, rgba(f.accent, 0))
  hz.addColorStop(0.5, rgba(f.accent, 0.35))
  hz.addColorStop(1, rgba(f.accent, 0))
  g.fillStyle = hz
  g.fillRect(-f.hw, ground - 1, f.hw * 2, 2)
  speedLines(f, 14, ground + 90, 150, "#9aa4b4", 0.25, phase, 500, 77, 1.5)
}

const car = (f: Frame) => {
  const { g, t } = f
  backdrop(f, "#040305", f.accent, 0, 40, 900, 0.12 + t * 0.06)
  const ground = 150
  view(f, 1.05, 0, 0, 0.8)
  const phase = t * 3 + f.time * 0.6
  const enter = easeOut(t / 0.55)
  const cx = lerp(-f.hw - 900, 20, enter) + Math.sin(f.time * 1.3) * 3
  speedLines(f, 26, -60, 520, f.accent, 0.55, phase, 600, 5, 2.5)
  // Debris of the last shot, left behind.
  burstShards(f, cx + 300, -60, 0.4 + t * 1.2, 26, 211, 0.7, -1.2, 1.1)
  const spin = -(t * 60 + f.time * 14)
  const paint = () => {
    g.save()
    g.translate(cx, ground)
    vehicle(f, CAR, -252, -30)
    glassFill(f, CAR_GLASS, -242, -176)
    g.fillStyle = "rgba(0,0,0,0.6)"
    g.fill(CAR_INTAKE)
    g.strokeStyle = "rgba(255,255,255,0.18)"
    g.lineWidth = 1.2
    g.beginPath()
    g.moveTo(480, -104)
    g.quadraticCurveTo(0, -140, -500, -128)
    g.stroke()
    wheel(f, -330, -74, 82, spin, 1)
    wheel(f, 330, -74, 78, spin * 1.05, 1)
    g.restore()
  }
  reflect(f, ground, paint, 0.3)
  road(f, ground, phase)
  paint()
  g.save()
  g.translate(cx, ground)
  sheen(f, CAR, lerp(-800, 800, (t * 1.4 + f.time * 0.05) % 1.2), 140, 0.3)
  g.restore()
  // Red light pouring off the wheels, and the tail lamp.
  trail(f, cx - 1800, cx - 330, ground - 74, f.accent, 60, 0.55 * enter)
  trail(f, cx - 1400, cx + 330, ground - 74, f.accent, 40, 0.35 * enter)
  trail(f, cx - 1600, cx - 515, ground - 132, f.accent, 10, 0.9)
  flare(f, cx + 505, ground - 96, 50, f.rim, 0.8)
  flare(f, cx - 515, ground - 132, 40, f.accent, 0.8)
}

const formula = (f: Frame) => {
  const { g, t } = f
  backdrop(f, "#040305", f.accent, 0, 60, 950, 0.14 + t * 0.08)
  const ground = 170
  view(f, 1.1 - t * 0.05, 0, 0, 0.8)
  const phase = t * 4 + f.time * 0.9
  const cx = lerp(-f.hw - 900, 0, easeOut(t / 0.45)) + Math.sin(f.time * 2.1) * 2
  speedLines(f, 34, -40, 560, f.accent, 0.7, phase, 700, 9, 3)
  const spin = -(t * 80 + f.time * 18)
  const paint = () => {
    g.save()
    g.translate(cx, ground)
    vehicle(f, FORMULA_REAR, -272, -104)
    vehicle(f, FORMULA, -196, -30)
    vehicle(f, FORMULA_WING, -48, -18)
    // Helmet and halo.
    g.fillStyle = "#07080b"
    g.beginPath()
    g.arc(-10, -150, 32, 0, TAU)
    g.fill()
    g.fillStyle = rgba(f.accent, 0.9)
    g.fillRect(-2, -160, 34, 9)
    g.strokeStyle = shade(f.metal, 0.5)
    g.lineWidth = 7
    g.beginPath()
    g.moveTo(-70, -136)
    g.quadraticCurveTo(-20, -198, 90, -120)
    g.stroke()
    g.fillStyle = rgba(f.accent, 0.85)
    g.fillRect(-470, -150, 8, 34)
    wheel(f, -360, -88, 92, spin, 1)
    wheel(f, 380, -80, 82, spin * 1.1, 1)
    g.restore()
  }
  reflect(f, ground, paint, 0.28)
  road(f, ground, phase)
  paint()
  trail(f, cx - 2000, cx - 360, ground - 88, f.accent, 80, 0.6)
  trail(f, cx - 1600, cx + 380, ground - 80, f.accent, 50, 0.45)
  trail(f, cx - 1800, cx - 610, ground - 240, f.accent, 8, 0.7)
  flare(f, cx - 466, ground - 133, 44, f.accent, 0.9)
}

const burst = (f: Frame, emblemStrength = 0) => {
  const { g, t } = f
  const heat = easeIn(t) * 0.6 + 0.4
  backdrop(f, "#070102", f.accent, 0, 0, 900, 0.35 * heat)
  view(f, 1, 0, 0, 0.5)
  g.save()
  g.globalCompositeOperation = "lighter"
  // Rays out of the vanishing point, pulling in as it builds.
  const turn = t * 0.5 + f.time * 0.04
  const inner = lerp(260, 0, easeOut(t))
  for (let i = 0; i < 110; i++) {
    const a = (i / 110) * TAU + turn * (hash(i) > 0.5 ? 1 : -0.6) + hash(i * 3.1) * 0.05
    const wdt = 0.004 + hash(i * 2.2) * 0.02
    const far = 1900
    const al = (0.05 + hash(i * 5.5) * 0.3) * heat * (1 - emblemStrength * 0.6)
    const grad = g.createRadialGradient(0, 0, inner, 0, 0, far)
    grad.addColorStop(0, "rgba(255,240,240," + (al * 1.6).toFixed(3) + ")")
    grad.addColorStop(0.2, rgba(f.accent, al))
    grad.addColorStop(1, rgba(f.accent, 0))
    g.fillStyle = grad
    g.beginPath()
    g.moveTo(Math.cos(a) * inner, Math.sin(a) * inner)
    g.lineTo(Math.cos(a - wdt) * far, Math.sin(a - wdt) * far)
    g.lineTo(Math.cos(a + wdt) * far, Math.sin(a + wdt) * far)
    g.closePath()
    g.fill()
  }
  g.restore()
  // Everything from the last shot converges on the point.
  for (let i = 0; i < 10; i++) {
    const side = i % 2 === 0 ? -1 : 1
    const yy = (hash(i * 4.4) - 0.5) * 500 * (1 - easeInOut(t))
    trail(f, side * (f.hw + 200), side * lerp(260, 20, easeInOut(t)), yy, f.accent, 6 + hash(i) * 10, 0.6 * (1 - emblemStrength))
  }
  const core = g.createRadialGradient(0, 0, 0, 0, 0, 260 + t * 200)
  core.addColorStop(0, "rgba(255,255,255," + (0.5 + t * 0.5).toFixed(3) + ")")
  core.addColorStop(0.15, rgba(f.accent, 0.8))
  core.addColorStop(1, rgba(f.accent, 0))
  g.save()
  g.globalCompositeOperation = "lighter"
  g.fillStyle = core
  g.fillRect(-600, -600, 1200, 1200)
  g.restore()
}

/** The default mark: a five-point star cut into ten bevelled facets. */
const star = (f: Frame, R: number) => {
  const g = f.g
  const r = R * 0.42
  const pts: { x: number; y: number }[] = []
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 === 0 ? R : r
    pts.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr })
  }
  const light = -Math.PI * 0.75 + f.px * 0.8
  for (let i = 0; i < 10; i++) {
    const p = pts[i]
    const q = pts[(i + 1) % 10]
    const mid = Math.atan2((p.y + q.y) / 2, (p.x + q.x) / 2)
    const k = 0.35 + 0.75 * Math.max(0, Math.cos(mid - light)) + (i % 2) * 0.08
    g.fillStyle = shade(f.accent, k)
    g.beginPath()
    g.moveTo(0, 0)
    g.lineTo(p.x, p.y)
    g.lineTo(q.x, q.y)
    g.closePath()
    g.fill()
    g.strokeStyle = "rgba(255,210,210,0.35)"
    g.lineWidth = 1
    g.stroke()
  }
}

const emblem = (f: Frame) => {
  const { g, t } = f
  burst(f, 1)
  const land = easeBack(t / 0.42)
  const turn = Math.cos((1 - clamp01(t / 0.42)) * Math.PI * 1.1)
  backdrop(f, "rgba(3,3,5," + (0.55 + 0.35 * smoothstep(0, 0.4, t)).toFixed(3) + ")", f.accent, 0, -60, 700, 0.22)
  view(f, 1, 0, -70, 0.5)
  const R = 150
  const breathe = 1 + Math.sin(f.time * 1.4) * 0.012
  const paint = () => {
    g.save()
    g.scale(Math.max(0.02, Math.abs(turn)) * land * breathe, land * breathe)
    if (f.emblem) {
      g.translate(-R, -R)
      g.scale(R / 100, R / 100)
      const grad = g.createLinearGradient(0, 0, 200, 200)
      grad.addColorStop(0, shade(f.accent, 1.3))
      grad.addColorStop(0.5, f.accent)
      grad.addColorStop(1, shade(f.accent, 0.35))
      g.fillStyle = grad
      g.fill(f.emblem)
      g.strokeStyle = "rgba(255,220,220,0.5)"
      g.lineWidth = 1.5
      g.stroke(f.emblem)
    } else star(f, R)
    g.restore()
  }
  const glow = g.createRadialGradient(0, 0, 0, 0, 0, R * 3)
  glow.addColorStop(0, rgba(f.accent, 0.5 * land))
  glow.addColorStop(1, rgba(f.accent, 0))
  g.fillStyle = glow
  g.fillRect(-R * 3, -R * 3, R * 6, R * 6)
  const ground = R + 40
  reflect(f, ground, paint, 0.25)
  paint()
  const sweep = smoothstep(0.35, 0.7, t)
  flare(f, lerp(-f.hw, f.hw, sweep), ground - 10, 70, f.accent, Math.sin(sweep * Math.PI) * 0.9)
  flare(f, 0, 0, 120, f.accent, 0.35 * land)
  speedLines(f, 8, ground, 20, f.accent, 0.35, f.time * 0.2 + t, 400, 303, 1.4)
}

const SCENES: Record<Scene, (f: Frame) => void> = {
  portrait,
  archer,
  arrow,
  blade,
  shatter,
  jet: (f) => jet(f),
  car,
  formula,
  burst: (f) => burst(f, 0),
  emblem,
}

function jet(f: Frame) {
  const { g, t } = f
  backdrop(f, "#030407", f.rim, -200, -100, 900, 0.12)
  view(f, 1, 0, -20, 0.8)
  const phase = t * 3 + f.time * 0.5
  const jx = lerp(-f.hw - 900, 40, easeOut(t / 0.6)) + Math.sin(f.time * 0.9) * 6
  const jy = -20 + Math.sin(f.time * 0.7) * 5 - easeInOut(t) * 30
  const lean = -0.03 - easeInOut(t) * 0.04
  speedLines(f, 30, 0, 700, f.rim, 0.25, phase, 500, 21, 1.6)
  // The glass it came through, blowing past.
  burstShards(f, jx + 200, jy, 0.25 + t * 1.6, 44, 409, 0.9, -1.4, 1.3)
  trail(f, jx - 2200, jx - 640, jy - 10, f.accent, 28, 0.9)
  g.save()
  g.translate(jx, jy)
  g.rotate(lean)
  // Afterburner.
  const burn = 0.8 + Math.sin(f.time * 31) * 0.1 + Math.sin(f.time * 17) * 0.1
  g.save()
  g.globalCompositeOperation = "lighter"
  const cone = g.createLinearGradient(-660, 0, -960, 0)
  cone.addColorStop(0, "rgba(255,240,220," + (0.9 * burn).toFixed(3) + ")")
  cone.addColorStop(0.2, rgba(f.accent, 0.8 * burn))
  cone.addColorStop(1, rgba(f.accent, 0))
  g.fillStyle = cone
  g.beginPath()
  g.moveTo(-660, -30)
  g.quadraticCurveTo(-800, -20, -960 - burn * 60, 0)
  g.quadraticCurveTo(-800, 20, -660, 26)
  g.closePath()
  g.fill()
  g.restore()
  g.fillStyle = "#08090c"
  g.fill(JET_WING)
  vehicle(f, JET_FIN, -250, -52)
  vehicle(f, JET, -110, 48)
  g.fillStyle = metalFill(f, 18, 112)
  g.fill(JET_TAILPLANE)
  glassFill(f, JET_CANOPY, -110, -56)
  g.strokeStyle = "rgba(0,0,0,0.45)"
  g.lineWidth = 1.2
  for (const px of [-300, -120, 60, 300]) {
    g.beginPath()
    g.moveTo(px, -50)
    g.lineTo(px + 10, 44)
    g.stroke()
  }
  g.fillStyle = "rgba(0,0,0,0.7)"
  g.fillRect(150, 10, 60, 22)
  sheen(f, JET, lerp(-900, 900, t), 160, 0.35)
  g.restore()
  flare(f, jx - 660, jy - 2, 70, f.accent, 0.9 * burn)
  flare(f, jx + 150, jy - 100, 40, f.rim, 0.5)
}

// ---------------------------------------------------------------------------

const styles = [
  ".vr-title{clip-path:inset(-20% calc((1 - var(--vr-r, 1)) * 100%) -20% 0)}",
  "@keyframes vr-hint{0%{transform:scaleY(0);transform-origin:top}45%{transform:scaleY(1);transform-origin:top}55%{transform:scaleY(1);transform-origin:bottom}100%{transform:scaleY(0);transform-origin:bottom}}",
  ".vr-hint-line{animation:vr-hint 2.2s cubic-bezier(.7,0,.3,1) infinite}",
  "@keyframes vr-rec{0%,100%{opacity:1}50%{opacity:.25}}",
  ".vr-rec{animation:vr-rec 1.6s steps(2,end) infinite}",
  ".vr-tick{transition:width .35s cubic-bezier(.2,.8,.2,1),background-color .35s,opacity .35s}",
  ".vr-tick-btn:hover .vr-tick,.vr-tick-btn:focus-visible .vr-tick{width:28px;opacity:1}",
  ".vr-tick-btn .vr-tick-label{opacity:0;transform:translateX(6px);transition:opacity .25s,transform .25s}",
  ".vr-tick-btn:hover .vr-tick-label,.vr-tick-btn:focus-visible .vr-tick-label{opacity:1;transform:none}",
  "@media (prefers-reduced-motion: reduce){.vr-hint-line,.vr-rec{animation:none}.vr-tick,.vr-tick-btn .vr-tick-label{transition:none}}",
].join("\n")

export default function VelocityReel({
  chapters = DEFAULT_CHAPTERS,
  chapterScroll = 1.1,
  height = "100svh",
  accent = "#ff1f3a",
  rim = "#9cc8ff",
  metal = "#dfe5ee",
  emblem,
  grain = 0.12,
  letterbox = true,
  hud = true,
  parallax = true,
  reelSeconds = 58,
  className = "",
}: VelocityReelProps) {
  const rootRef = React.useRef<HTMLElement | null>(null)
  const stageRef = React.useRef<HTMLDivElement | null>(null)
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const titleRef = React.useRef<HTMLDivElement | null>(null)
  const lineRef = React.useRef<HTMLParagraphElement | null>(null)
  const clockRef = React.useRef<HTMLSpanElement | null>(null)
  const fillRef = React.useRef<HTMLDivElement | null>(null)
  const hintRef = React.useRef<HTMLDivElement | null>(null)
  const [reduced, setReduced] = React.useState(false)
  // Only the chapter is React state; everything that moves per frame is
  // written straight to the DOM by the loop.
  const [index, setIndex] = React.useState(0)

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])

  const look = React.useRef({ chapters, accent, rim, metal, emblem, grain, letterbox, parallax, reelSeconds })
  look.current = { chapters, accent, rim, metal, emblem, grain, letterbox, parallax, reelSeconds }

  React.useEffect(() => {
    const root = rootRef.current
    const stage = stageRef.current
    const canvas = canvasRef.current
    if (!root || !stage || !canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let raf = 0
    let progress = 0
    let shown = -1
    let tx = 0
    let ty = 0
    let px = 0
    let py = 0
    const start = performance.now()
    const bursts: { x: number; y: number; at: number }[] = []

    // The incoming shot of a crossfade paints here, then lands in one drawImage.
    const layer = document.createElement("canvas")
    const lctx = layer.getContext("2d")

    // Grain: one noise tile, built once, tiled at a random offset each frame.
    const tile = document.createElement("canvas")
    tile.width = 160
    tile.height = 160
    const tctx = tile.getContext("2d")
    let pattern: CanvasPattern | null = null
    if (tctx) {
      const img = tctx.createImageData(160, 160)
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() * 255
        img.data[i] = v
        img.data[i + 1] = v
        img.data[i + 2] = v
        img.data[i + 3] = 255
      }
      tctx.putImageData(img, 0, 0)
      pattern = ctx.createPattern(tile, "repeat")
    }

    let mark: Path2D | null = null
    const markSource = look.current.emblem
    if (markSource) {
      try {
        mark = new Path2D(markSource)
      } catch {
        mark = null
      }
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75)
      const w = Math.round(canvas.clientWidth * dpr)
      const h = Math.round(canvas.clientHeight * dpr)
      if (w === 0 || h === 0) return
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        layer.width = w
        layer.height = h
      }
    }
    const observer = new ResizeObserver(() => {
      resize()
      if (reduced) paint(0)
    })
    observer.observe(canvas)

    const measure = () => {
      const r = root.getBoundingClientRect()
      progress = progressFrom(r.top, r.height, window.innerHeight)
    }

    const frameFor = (g: CanvasRenderingContext2D, t: number, time: number): Frame => {
      const w = canvas.width
      const h = canvas.height
      const k = fitScale(w, h)
      const L = look.current
      return {
        g, w, h, k, hw: w / 2 / k, hh: h / 2 / k, t, time, px, py,
        accent: L.accent, rim: L.rim, metal: L.metal, emblem: mark,
      }
    }

    const shoot = (g: CanvasRenderingContext2D, scene: Scene, t: number, time: number) => {
      g.save()
      g.globalAlpha = 1
      g.globalCompositeOperation = "source-over"
      ;(SCENES[scene] ?? SCENES.burst)(frameFor(g, t, time))
      g.restore()
      g.setTransform(1, 0, 0, 1, 0, 0)
    }

    const paint = (time: number) => {
      const w = canvas.width
      const h = canvas.height
      if (!w || !h) return
      const L = look.current
      const list = L.chapters
      const n = list.length
      if (!n) return
      const { index: i, local } = chapterAt(progress, n)
      const cur = list[i]
      const next = list[i + 1]
      shoot(ctx, cur.scene, local, time)
      const mix = next ? mixAt(local, next.cut === "flash" ? 0.035 : 0.14) : 0
      if (mix > 0 && next && lctx) {
        lctx.setTransform(1, 0, 0, 1, 0, 0)
        lctx.clearRect(0, 0, w, h)
        shoot(lctx, next.scene, 0, time)
        ctx.globalAlpha = mix
        ctx.drawImage(layer, 0, 0)
        ctx.globalAlpha = 1
      }

      // Post: flash cuts, clicked flares, vignette, grain.
      const flash = flashAt(local, i > 0 && cur.cut === "flash", next?.cut === "flash")
      if (flash > 0.001) {
        ctx.globalCompositeOperation = "lighter"
        ctx.fillStyle = rgba(L.rim, flash * 0.9)
        ctx.fillRect(0, 0, w, h)
        ctx.globalCompositeOperation = "source-over"
      }
      const f = frameFor(ctx, local, time)
      for (let b = bursts.length - 1; b >= 0; b--) {
        const age = (performance.now() - bursts[b].at) / 1000
        if (age > 1.2) {
          bursts.splice(b, 1)
          continue
        }
        screen(f)
        ctx.setTransform(f.k, 0, 0, f.k, bursts[b].x, bursts[b].y)
        const a = Math.pow(1 - age / 1.2, 2)
        flare(f, 0, 0, 90 + age * 160, L.accent, a * 1.2)
        ctx.save()
        ctx.globalCompositeOperation = "lighter"
        ctx.strokeStyle = rgba(L.accent, a * 0.8)
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(0, 0, 40 + age * 420, 0, TAU)
        ctx.stroke()
        ctx.restore()
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75)
      vg.addColorStop(0, "rgba(0,0,0,0)")
      vg.addColorStop(1, "rgba(0,0,0,0.75)")
      ctx.fillStyle = vg
      ctx.fillRect(0, 0, w, h)
      if (pattern && L.grain > 0) {
        const ox = reduced ? 0 : Math.floor(Math.random() * 160)
        const oy = reduced ? 0 : Math.floor(Math.random() * 160)
        ctx.globalAlpha = Math.min(1, L.grain)
        ctx.globalCompositeOperation = "overlay"
        ctx.setTransform(1, 0, 0, 1, ox, oy)
        ctx.fillStyle = pattern
        ctx.fillRect(-ox, -oy, w, h)
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.globalCompositeOperation = "source-over"
        ctx.globalAlpha = 1
      }

      // The DOM layer: letterbox, title reveal, timecode, rail.
      const bar = L.letterbox
        ? (w > h ? 1 : 0.45) * lerp(19, 10.5, smoothstep(0, 0.05, progress)) + smoothstep(0.97, 1, progress) * 3
        : 0
      stage.style.setProperty("--vr-bar", bar.toFixed(2) + "%")
      const r = titleReveal(local, i === 0, i === n - 1)
      if (titleRef.current) {
        titleRef.current.style.setProperty("--vr-r", r.toFixed(3))
        titleRef.current.style.transform = "translate3d(" + ((1 - r) * -24 + local * -14).toFixed(2) + "px,0,0)"
      }
      if (lineRef.current) {
        lineRef.current.style.opacity = (r * (i === 0 ? 1 : smoothstep(0.12, 0.3, local))).toFixed(3)
      }
      if (clockRef.current) clockRef.current.textContent = timecode(progress, L.reelSeconds)
      if (fillRef.current) fillRef.current.style.transform = "scaleY(" + progress.toFixed(4) + ")"
      if (hintRef.current) hintRef.current.style.opacity = (1 - smoothstep(0.005, 0.03, progress)).toFixed(3)
      if (i !== shown) {
        shown = i
        setIndex(i)
      }
    }

    const onMove = (e: PointerEvent) => {
      if (!look.current.parallax) return
      const r = stage.getBoundingClientRect()
      tx = ((e.clientX - r.left) / r.width) * 2 - 1
      ty = ((e.clientY - r.top) / r.height) * 2 - 1
    }
    const onLeave = () => {
      tx = 0
      ty = 0
    }
    const onDown = (e: PointerEvent) => {
      if (reduced) return
      if ((e.target as HTMLElement | null)?.closest("button")) return
      const r = canvas.getBoundingClientRect()
      const dpr = canvas.width / Math.max(1, r.width)
      bursts.push({ x: (e.clientX - r.left) * dpr, y: (e.clientY - r.top) * dpr, at: performance.now() })
      if (bursts.length > 6) bursts.shift()
    }

    resize()
    measure()

    if (reduced) {
      // No loop, no ambient clock: the frame you are parked on, repainted on scroll.
      paint(0)
      const onScroll = () => {
        measure()
        paint(0)
      }
      addEventListener("scroll", onScroll, { passive: true })
      addEventListener("resize", onScroll)
      return () => {
        observer.disconnect()
        removeEventListener("scroll", onScroll)
        removeEventListener("resize", onScroll)
      }
    }

    // Scroll writes a number; the frame loop reads it.
    const onScroll = () => measure()
    addEventListener("scroll", onScroll, { passive: true })
    addEventListener("resize", onScroll)
    stage.addEventListener("pointermove", onMove, { passive: true })
    stage.addEventListener("pointerleave", onLeave)
    stage.addEventListener("pointerdown", onDown)

    const loop = (now: number) => {
      measure()
      px += (tx - px) * 0.06
      py += (ty - py) * 0.06
      // Offscreen, the reel costs nothing: no drawing when the stage cannot be seen.
      const r = root.getBoundingClientRect()
      if (r.bottom > 0 && r.top < window.innerHeight) paint((now - start) / 1000)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      removeEventListener("scroll", onScroll)
      removeEventListener("resize", onScroll)
      stage.removeEventListener("pointermove", onMove)
      stage.removeEventListener("pointerleave", onLeave)
      stage.removeEventListener("pointerdown", onDown)
    }
  }, [reduced, chapters.length, emblem])

  /** Jump the page so chapter `i` sits with its title fully up. */
  const goTo = (i: number) => {
    const root = rootRef.current
    if (!root) return
    const r = root.getBoundingClientRect()
    const travel = r.height - window.innerHeight
    if (!(travel > 0)) return
    const target = ((i + 0.4) / chapters.length) * travel
    window.scrollBy({ top: target + r.top, behavior: reduced ? "auto" : "smooth" })
  }

  const active = chapters[index] ?? chapters[0]
  const last = active?.scene === "emblem" || index === chapters.length - 1
  const pad = (v: number) => String(v).padStart(2, "0")

  return (
    <section
      ref={rootRef}
      className={"relative w-full " + className}
      style={{
        height: "calc(" + Math.max(1, chapters.length * chapterScroll) + " * " + height + ")",
        background: "#020305",
        color: "#e8edf5",
      }}
      aria-label="Velocity Reel"
    >
      <style>{styles}</style>
      <div
        ref={stageRef}
        className="sticky top-0 w-full overflow-hidden"
        style={{ height, touchAction: "pan-y" }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 block"
          style={{ width: "100%", height: "100%", maxWidth: "none" }}
          aria-hidden="true"
        />

        {letterbox && (
          <>
            <div className="pointer-events-none absolute inset-x-0 top-0 bg-black" style={{ height: "var(--vr-bar, 10%)" }} />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-black" style={{ height: "var(--vr-bar, 10%)" }} />
          </>
        )}

        {hud && (
          <div className="pointer-events-none absolute inset-0" style={{ fontFamily: MONO }}>
            {/* Slate: top left and right, sitting on the letterbox. */}
            <div
              className="absolute left-4 right-4 flex items-center justify-between sm:left-8 sm:right-8"
              style={{ top: "calc(var(--vr-bar, 10%) - 26px)", fontSize: 10, letterSpacing: "0.28em", color: "rgba(232,237,245,0.55)" }}
            >
              <span className="flex items-center gap-2">
                <span className="vr-rec inline-block rounded-full" style={{ width: 6, height: 6, background: accent }} />
                SC {pad(index + 1)} / {pad(chapters.length)}
              </span>
              <span ref={clockRef} style={{ fontVariantNumeric: "tabular-nums" }}>00:00:00:00</span>
            </div>

            {/* The title card. */}
            <div
              className={
                "absolute px-5 sm:px-10 " +
                (last ? "inset-x-0 flex flex-col items-center text-center" : "left-0 max-w-[92vw]")
              }
              style={{ bottom: last ? "calc(var(--vr-bar, 10%) + 5%)" : "calc(var(--vr-bar, 10%) + 22px)" }}
            >
              <div ref={titleRef} className="vr-title" style={{ willChange: "transform" }}>
                <div
                  className="mb-2 flex items-center gap-3"
                  style={{ fontSize: 10, letterSpacing: "0.34em", textTransform: "uppercase", color: accent }}
                >
                  <span className="inline-block" style={{ width: 22, height: 1, background: accent }} />
                  {active?.kicker ?? "Scene " + pad(index + 1)}
                </div>
                <h2
                  className="m-0 font-black leading-[0.86]"
                  style={{
                    fontFamily: SANS,
                    fontSize: last ? "clamp(2.6rem, 9vw, 7.5rem)" : "clamp(2.8rem, 10vw, 8.5rem)",
                    letterSpacing: "-0.02em",
                    fontStyle: "italic",
                    color: "#f4f7fb",
                    textShadow: "0 0 50px " + rgba(accent, 0.35),
                  }}
                >
                  {active?.title}
                </h2>
              </div>
              {active?.line && (
                <p
                  ref={lineRef}
                  className="m-0 mt-3 max-w-sm"
                  style={{ fontSize: 11, lineHeight: 1.6, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(232,237,245,0.6)" }}
                >
                  {active.line}
                </p>
              )}
            </div>

            {/* The reel rail: one tick per shot, and a way to jump to it. */}
            <nav
              aria-label="Scenes"
              className="pointer-events-auto absolute right-3 top-1/2 flex -translate-y-1/2 flex-col items-end gap-2.5 sm:right-6"
            >
              <div className="absolute right-0 top-0 h-full" style={{ width: 1, background: "rgba(232,237,245,0.12)" }}>
                <div ref={fillRef} className="h-full w-full origin-top" style={{ background: accent, transform: "scaleY(0)" }} />
              </div>
              {chapters.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={"Scene " + (i + 1) + ": " + c.title}
                  aria-current={i === index ? "step" : undefined}
                  className="vr-tick-btn flex cursor-pointer items-center gap-2 border-0 bg-transparent p-1 pr-0 outline-none"
                  style={{ color: "inherit" }}
                >
                  <span
                    className="vr-tick-label hidden sm:inline"
                    style={{ fontSize: 9, letterSpacing: "0.3em", color: "rgba(232,237,245,0.75)" }}
                  >
                    {c.title}
                  </span>
                  <span
                    className="vr-tick block"
                    style={{
                      height: 2,
                      width: i === index ? 22 : 10,
                      opacity: i === index ? 1 : 0.45,
                      background: i === index ? accent : "rgba(232,237,245,0.8)",
                    }}
                  />
                </button>
              ))}
            </nav>

            <div
              ref={hintRef}
              className="absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-2"
              style={{ bottom: "calc(var(--vr-bar, 10%) + 18px)", fontSize: 9, letterSpacing: "0.4em", color: "rgba(232,237,245,0.6)" }}
            >
              SCROLL
              <span className="relative block overflow-hidden" style={{ width: 1, height: 34, background: "rgba(232,237,245,0.15)" }}>
                <span className="vr-hint-line absolute inset-0 block" style={{ background: accent }} />
              </span>
            </div>
          </div>
        )}
      </div>

      {/* The story as text, for anything that will never see the canvas. */}
      <ol className="sr-only">
        {chapters.map((c, i) => (
          <li key={i}>
            {c.title}
            {c.line ? " — " + c.line : ""}
          </li>
        ))}
      </ol>
    </section>
  )
}
