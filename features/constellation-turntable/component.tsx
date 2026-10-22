"use client"

import * as React from "react"

/**
 * Constellation Turntable — a star-chart record on a flat, illustrated deck.
 *
 * The record is a night sky: a starfield and a Milky Way lane pressed between
 * the grooves, the planets laid out on a spiral, and one constellation per
 * track with its name set along its groove band. A white tonearm with a
 * perforated headshell rests on it.
 *
 * It plays. Press play (or tap the label) and the platter spins up, the arm
 * cues and drops, and the needle walks inward through the side in real time.
 * The constellation under the needle draws itself in. Grab the record to
 * scratch it — the music bends with the platter. Drag the arm to drop the
 * needle anywhere. Tap a constellation to cue its track, tap a planet to ring
 * it. The score is generated live with Web Audio, one key per constellation.
 *
 * Self-contained: React is the only import. Every shape is SVG built from
 * numbers and every sound is synthesised, so there is nothing to host.
 */

export type ConstellationTrack = {
  /** The constellation. Printed along its groove band and in the player. */
  title: string
  /** Length in seconds. Its band on the record is proportional. Default 210. */
  duration?: number
  /** Where the name sits, in degrees: 0 is three o'clock, clockwise. */
  angle?: number
  /** Where the figure sits, in degrees. Defaults to just past the name. */
  figureAngle?: number
  /**
   * The figure as polylines in a -1..1 box: x runs along the groove, y
   * outward. Omit it and one is drawn from the title.
   */
  figure?: Array<Array<[number, number]>>
  /** Root of the track's generated score, in Hz. */
  root?: number
}

export type TurntablePalette = {
  /** The deck behind the record. */
  background?: string
  vinyl?: string
  /** The dark ring between the grooves and the label. */
  deadWax?: string
  groove?: string
  label?: string
  /** Text and spindle on the label. */
  labelInk?: string
  star?: string
  planet?: string
  /** Outlines and bands on the planets. */
  planetInk?: string
  arm?: string
  /** Sleeves, end caps and the shaded edge of the tube. */
  armShade?: string
  /** The stylus, and the glow on the playing constellation. */
  accent?: string
  /** The two headshell screws. */
  screw?: string
}

export type ConstellationTurntableProps = {
  /** The side, outermost groove first. Up to about eight read well. */
  tracks?: ConstellationTrack[]
  palette?: TurntablePalette
  /** Curved along the top of the label. */
  title?: string
  /** Curved along the bottom of the label. */
  subtitle?: string
  /** Starting speed. The player switches between 33⅓ and 45. */
  defaultRpm?: 33 | 45
  /** Start spinning on mount. Sound waits for the first tap or key. */
  autoPlay?: boolean
  /** Generate the score with Web Audio. Off means silent, never created. */
  sound?: boolean
  /** 0–1. */
  volume?: number
  /**
   * `poster` crops like the print: the record bleeds off the top-left and the
   * arm drops in from above. `full` shows the whole deck, pivot and all.
   */
  framing?: "poster" | "full"
  /** Star count multiplier, 0–3. */
  density?: number
  /** Same seed, same sky. */
  seed?: number
  /** The planet spiral. */
  planets?: boolean
  /** The player panel. Keyboard and record still work without it. */
  controls?: boolean
  /** Explicit height — never a percentage, which collapses without a height chain. */
  height?: string | number
  className?: string
  onTrackChange?: (index: number, track: ConstellationTrack) => void
  onPlayingChange?: (playing: boolean) => void
}

type Segment = { kind: number; track: number; t0: number; t1: number; r0: number; r1: number }
type Star = { x: number; y: number; r: number; o: number }

// #region turntable
/** Clamp, with NaN falling to the low end. */
export const clamp = (v: number, lo: number, hi: number): number => (v > hi ? hi : v >= lo ? v : lo)

export const mulberry32 = (seed: number) => {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const hashString = (s: string): number => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/** Into (-π, π]. */
export const wrapAngle = (a: number): number => {
  const t = (a + Math.PI) % (Math.PI * 2)
  return (t <= 0 ? t + Math.PI * 2 : t) - Math.PI
}

// Record space: centre at the origin, radius 500. The deck shares it.
export const RECORD_R = 500
export const LABEL_R = 158
export const WAX_R = 200
export const GROOVE_OUT = 492
export const GROOVE_IN = 212

// The arm is drawn once, in the pose of the print, and turned about its pivot.
export const PIVOT = [532, -680]
export const STYLUS = [257, 302]
const ARM_L = Math.hypot(STYLUS[0] - PIVOT[0], STYLUS[1] - PIVOT[1])
const PIVOT_D = Math.hypot(PIVOT[0], PIVOT[1])
const PHI0 = Math.atan2(STYLUS[1] - PIVOT[1], STYLUS[0] - PIVOT[0])
const PSI = Math.atan2(-PIVOT[1], -PIVOT[0])

/** How far to turn the arm from its drawn pose to put the stylus at radius r. Inward is positive. */
export const armAngle = (r: number): number => {
  const c = clamp((PIVOT_D * PIVOT_D + ARM_L * ARM_L - r * r) / (2 * ARM_L * PIVOT_D), -1, 1)
  return PSI - Math.acos(c) - PHI0
}

export const stylusAt = (theta: number): number[] => [
  PIVOT[0] + ARM_L * Math.cos(PHI0 + theta),
  PIVOT[1] + ARM_L * Math.sin(PHI0 + theta),
]

export const stylusRadius = (theta: number): number => {
  const s = stylusAt(theta)
  return Math.hypot(s[0], s[1])
}

// Seconds of silent groove: before the first track, between tracks, after the last.
export const LEAD_IN = 3
export const GAP = 2.5
export const LEAD_OUT = 4

/**
 * The side as a spiral: lead-in, tracks with gaps between, lead-out. The groove
 * pitch is constant, so each track's band is as wide as it is long.
 * kind: 0 lead-in, 1 track, 2 gap, 3 lead-out.
 */
export const buildTimeline = (durations: number[], outer: number, inner: number): Segment[] => {
  const ds = durations.length ? durations.map((d) => (Number.isFinite(d) && d > 0 ? d : 210)) : [210]
  const n = ds.length
  const fixed = 6 + 5 * (n - 1) + 10
  const pitch = Math.max(outer - inner - fixed, 1) / ds.reduce((a, b) => a + b, 0)
  const out: Segment[] = []
  let t = 0
  let r = outer
  const push = (kind: number, track: number, dt: number, dr: number) => {
    out.push({ kind, track, t0: t, t1: t + dt, r0: r, r1: r - dr })
    t += dt
    r -= dr
  }
  push(0, 0, LEAD_IN, 6)
  ds.forEach((d, i) => {
    if (i) push(2, i, GAP, 5)
    push(1, i, d, d * pitch)
  })
  push(3, n - 1, LEAD_OUT, 10)
  return out
}

export const sideLength = (tl: Segment[]): number => tl[tl.length - 1].t1

export const segmentAt = (tl: Segment[], t: number): Segment => {
  for (const s of tl) if (t < s.t1) return s
  return tl[tl.length - 1]
}

export const radiusAt = (tl: Segment[], t: number): number => {
  const tt = clamp(t, 0, sideLength(tl))
  const s = segmentAt(tl, tt)
  return s.r0 + ((s.r1 - s.r0) * (tt - s.t0)) / (s.t1 - s.t0)
}

export const timeAt = (tl: Segment[], r: number): number => {
  const rr = clamp(r, tl[tl.length - 1].r1, tl[0].r0)
  for (const s of tl) if (rr >= s.r1) return s.t0 + ((s.r0 - rr) / (s.r0 - s.r1)) * (s.t1 - s.t0)
  return sideLength(tl)
}

export const trackStart = (tl: Segment[], i: number): number => {
  for (const s of tl) if (s.kind === 1 && s.track === i) return s.t0
  return 0
}

/** 0 in the silent groove, 1 inside a track, with a short fade at each end. */
export const trackLevel = (s: Segment, t: number): number =>
  s.kind === 1 ? clamp(Math.min((t - s.t0) / 1.2, (s.t1 - t) / 1.2), 0, 1) : 0

export const formatTime = (sec: number): string => {
  const s = Math.max(0, Math.floor(Number.isFinite(sec) ? sec : 0))
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0")
}

/** Platter speed in rad/s. Anything but 45 is 33⅓. */
export const rpmToOmega = (rpm: number): number => ((rpm === 45 ? 45 : 100 / 3) * Math.PI * 2) / 60

/** First-order approach: the motor pulling the platter to speed, or friction letting it go. */
export const approach = (v: number, target: number, dt: number, tau: number): number =>
  target + (v - target) * Math.exp(-dt / Math.max(tau, 1e-4))

/**
 * The pressed sky. Field stars are uniform by area, mostly faint with a few
 * bright; the Milky Way is a dense lane of dust across the upper right.
 * `avoid` is [x, y, radius] circles kept clear — planets, names, figures.
 */
export const makeStars = (seed: number, density: number, avoid: number[][]): Star[] => {
  const rand = mulberry32(seed)
  const d = clamp(density, 0, 3)
  const lo = WAX_R + 6
  const hi = RECORD_R - 7
  const out: Star[] = []
  const clear = (x: number, y: number, pad: number): boolean => {
    for (const a of avoid) if (Math.hypot(x - a[0], y - a[1]) < a[2] + pad) return false
    return true
  }
  const field = Math.round(560 * d)
  for (let i = 0; i < field; i++) {
    const r = Math.sqrt(lo * lo + rand() * (hi * hi - lo * lo))
    const a = rand() * Math.PI * 2
    const size = 0.8 + 2.9 * rand() ** 6
    const o = 0.55 + rand() * 0.45
    const x = Math.cos(a) * r
    const y = Math.sin(a) * r
    if (clear(x, y, size + 3)) out.push({ x, y, r: size, o })
  }
  const lane = Math.round(720 * d)
  for (let i = 0; i < lane; i++) {
    const u = rand() * 2 - 1
    const g = rand() + rand() + rand() - 1.5
    const a = ((-18 + u * 40) * Math.PI) / 180
    const r = clamp(296 + 26 * Math.sin(u * 2.6) + g * 36 * (1 - 0.45 * u * u), lo, hi)
    const size = 0.45 + rand() * 0.75
    const o = 0.35 + rand() * 0.5
    const x = Math.cos(a) * r
    const y = Math.sin(a) * r
    if (clear(x, y, 2)) out.push({ x, y, r: size, o })
  }
  return out
}
// #endregion

const FONT = '"Avenir Next", "Futura", "Century Gothic", "Gill Sans", ui-sans-serif, system-ui, sans-serif'

const DEFAULT_PALETTE: Required<TurntablePalette> = {
  background: "#10172a",
  vinyl: "#1e3f86",
  deadWax: "#15244a",
  groove: "#4069b8",
  label: "#eceef2",
  labelInk: "#1e3f86",
  star: "#ffffff",
  planet: "#eda53d",
  planetInk: "#3a2608",
  arm: "#f2f5f9",
  armShade: "#bdd1ea",
  accent: "#d5e45a",
  screw: "#3f86c6",
}

// The sky of the print, outermost groove first.
export const DEFAULT_TRACKS: ConstellationTrack[] = [
  {
    title: "Capricorn",
    duration: 204,
    angle: 100,
    figureAngle: 136,
    root: 110,
    figure: [[[-1, -0.55], [-0.45, -0.1], [0.05, 0.55], [0.55, 0.35], [1, -0.15], [0.35, -0.4], [-0.3, -0.55], [-1, -0.55]]],
  },
  {
    title: "Scorpio",
    duration: 245,
    angle: -3,
    figureAngle: 27,
    root: 146.83,
    figure: [
      [[-1, 0.7], [-0.85, 0.2], [-1, -0.3]],
      [[-0.85, 0.2], [-0.5, 0.1], [-0.2, -0.05], [0.1, -0.2], [0.35, -0.45], [0.5, -0.8], [0.75, -0.85], [0.95, -0.6], [0.9, -0.3]],
    ],
  },
  {
    title: "Ursa Major",
    duration: 168,
    angle: -25,
    figureAngle: -62,
    root: 87.31,
    figure: [[[-1, 0.3], [-0.62, 0.1], [-0.25, 0.05], [0.05, -0.1], [0.15, -0.7], [0.75, -0.75], [0.8, -0.15], [0.05, -0.1]]],
  },
  {
    title: "Taurus",
    duration: 231,
    angle: 18,
    figureAngle: 46,
    root: 130.81,
    figure: [
      [[-1, 0.75], [-0.25, 0], [0.05, -0.15], [0.35, 0.05], [1, 0.7]],
      [[0.05, -0.15], [0.2, -0.7]],
    ],
  },
  {
    title: "Hercules",
    duration: 270,
    angle: -134,
    figureAngle: -160,
    root: 82.41,
    figure: [
      [[-0.35, 0.3], [0.3, 0.35], [0.4, -0.3], [-0.25, -0.35], [-0.35, 0.3]],
      [[-0.35, 0.3], [-0.8, 0.75]],
      [[0.3, 0.35], [0.85, 0.7]],
      [[0.4, -0.3], [0.95, -0.6]],
      [[-0.25, -0.35], [-0.9, -0.7]],
    ],
  },
  {
    title: "Aries",
    duration: 192,
    angle: 76,
    figureAngle: 47,
    root: 98,
    figure: [[[-1, -0.35], [-0.25, 0.1], [0.35, 0.3], [1, 0.05]]],
  },
]

// Positions and sizes off the print. Notes are a pentatonic: the giants ring low.
const PLANETS = [
  { name: "Mercury", x: -187, y: 123, r: 3.7, note: 1567.98 },
  { name: "Venus", x: -178, y: 163, r: 5.3, note: 1318.51 },
  { name: "Earth", x: -156, y: 207, r: 7.4, note: 1174.66 },
  { name: "Mars", x: -123, y: 251, r: 9.5, note: 987.77 },
  { name: "Jupiter", x: -65, y: 297, r: 25.3, note: 196 },
  { name: "Saturn", x: 20, y: 340, r: 16.8, note: 293.66 },
  { name: "Uranus", x: 100, y: 356, r: 14.2, note: 392 },
  { name: "Neptune", x: 178, y: 353, r: 11.6, note: 493.88 },
  { name: "Pluto", x: 242, y: 334, r: 6.3, note: 783.99 },
]

const SPARKLES = [
  { x: 428, y: -127, s: 34, d: 0 },
  { x: 376, y: 71, s: 30, d: 1.3 },
  { x: -182, y: 334, s: 32, d: 0.6 },
  { x: -87, y: -224, s: 18, d: 2.1 },
  { x: -330, y: -300, s: 22, d: 1.7 },
  { x: -446, y: 116, s: 18, d: 0.9 },
  { x: 128, y: -436, s: 16, d: 2.6 },
]

const NAME_SIZE = 13
const NAME_TRACK = 5.6
const nameLength = (s: string) => s.length * (NAME_SIZE * 0.74 + NAME_TRACK)
const isBottom = (deg: number) => {
  const a = ((deg % 360) + 360) % 360
  return a > 28 && a < 152
}
const polar = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180
  return [Math.cos(a) * r, Math.sin(a) * r]
}
const arcPath = (r: number, from: number, to: number, sweep: 0 | 1) => {
  const [x1, y1] = polar(r, from)
  const [x2, y2] = polar(r, to)
  return "M" + x1.toFixed(2) + " " + y1.toFixed(2) + "A" + r + " " + r + " 0 0 " + sweep + " " + x2.toFixed(2) + " " + y2.toFixed(2)
}

// A figure for a constellation that didn't bring one: a seeded walk.
const inventFigure = (title: string): Array<Array<[number, number]>> => {
  const rand = mulberry32(hashString(title) || 1)
  const n = 5 + Math.floor(rand() * 3)
  const main: Array<[number, number]> = []
  for (let i = 0; i < n; i++) main.push([-1 + (2 * i) / (n - 1), (rand() * 2 - 1) * 0.75])
  const k = 1 + Math.floor(rand() * (n - 2))
  return [main, [main[k], [main[k][0] + 0.15, main[k][1] > 0 ? -0.8 : 0.8]]]
}

type Placed = {
  title: string
  rc: number
  band: number
  angle: number
  bottom: boolean
  path: string
  hit: string
  lines: string[]
  points: number[][]
}

const placeTracks = (list: ConstellationTrack[], tl: Segment[]): Placed[] =>
  list.map((t, i) => {
    const seg = tl.find((s) => s.kind === 1 && s.track === i) ?? tl[0]
    const rc = (seg.r0 + seg.r1) / 2
    const band = seg.r0 - seg.r1
    const angle = Number.isFinite(t.angle) ? (t.angle as number) : -120 + i * 137.508
    const bottom = isBottom(angle)
    const half = ((nameLength(t.title) / 2) * 180) / Math.PI / rc
    const span = Math.min(half + 40, 170)
    const path = bottom ? arcPath(rc, angle + span, angle - span, 0) : arcPath(rc, angle - span, angle + span, 1)
    const hit = bottom ? arcPath(rc, angle + half + 2, angle - half - 2, 0) : arcPath(rc, angle - half - 2, angle + half + 2, 1)
    const w = clamp(band * 1.9, 46, 112)
    const room = Math.max(Math.min(rc - WAX_R - 12, RECORD_R - 14 - rc), 8)
    const h = clamp(band * 0.8, 16, room)
    const fa = Number.isFinite(t.figureAngle)
      ? (t.figureAngle as number)
      : angle + (((nameLength(t.title) / 2 + w + 22) / rc) * 180) / Math.PI
    const a = (fa * Math.PI) / 180
    const flip = isBottom(fa) ? -1 : 1
    const cx = Math.cos(a) * rc
    const cy = Math.sin(a) * rc
    const tx = -Math.sin(a) * flip
    const ty = Math.cos(a) * flip
    const nx = Math.cos(a) * flip
    const ny = Math.sin(a) * flip
    const seen = new Map<string, number[]>()
    const lines = (t.figure && t.figure.length ? t.figure : inventFigure(t.title)).map((line) =>
      line
        .map(([u, v]) => {
          const x = cx + u * w * tx + v * h * nx
          const y = cy + u * w * ty + v * h * ny
          seen.set(u + "," + v, [x, y])
          return x.toFixed(1) + "," + y.toFixed(1)
        })
        .join(" "),
    )
    return { title: t.title, rc, band, angle, bottom, path, hit, lines, points: [...seen.values()] }
  })

// ---------------------------------------------------------------------------
// Sound: a slow pad, star chimes through an echo and a hall, and vinyl crackle.
// Pitch follows the platter, so spin-up, spin-down and scratching all bend it.

type Sound = {
  update: (rate: number, level: number, contact: boolean, dt: number) => void
  retune: (root: number, minor: boolean) => void
  thump: () => void
  ring: (freq: number) => void
  setVolume: (v: number) => void
  suspend: () => void
  resume: () => void
  dispose: () => void
}

const createSound = (volume: number): Sound | null => {
  if (typeof window === "undefined") return null
  const AC =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  let ctx: AudioContext
  try {
    ctx = new AC()
  } catch {
    return null
  }
  const rate = ctx.sampleRate
  const master = ctx.createGain()
  master.gain.value = 0
  master.gain.setTargetAtTime(volume, ctx.currentTime, 0.1)
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -16
  comp.ratio.value = 3
  master.connect(comp)
  comp.connect(ctx.destination)

  const verb = ctx.createConvolver()
  const irLen = Math.floor(rate * 3.4)
  const ir = ctx.createBuffer(2, irLen, rate)
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch)
    for (let i = 0; i < irLen; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 2.8)
  }
  verb.buffer = ir
  const wet = ctx.createGain()
  wet.gain.value = 0.38
  verb.connect(wet)
  wet.connect(master)

  const echo = ctx.createDelay(1.5)
  echo.delayTime.value = 0.39
  const feedback = ctx.createGain()
  feedback.gain.value = 0.36
  echo.connect(feedback)
  feedback.connect(echo)
  const echoOut = ctx.createGain()
  echoOut.gain.value = 0.45
  echo.connect(echoOut)
  echoOut.connect(master)
  echo.connect(verb)

  const padFilter = ctx.createBiquadFilter()
  padFilter.type = "lowpass"
  padFilter.frequency.value = 760
  padFilter.Q.value = 0.9
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 0.055
  const lfoDepth = ctx.createGain()
  lfoDepth.gain.value = 340
  lfo.connect(lfoDepth)
  lfoDepth.connect(padFilter.frequency)
  lfo.start()
  const padGain = ctx.createGain()
  padGain.gain.value = 0
  padFilter.connect(padGain)
  padGain.connect(master)
  padGain.connect(verb)

  let base = 110
  let ratios = [1, 1.498, 2.378, 4.49]
  let scale = [0, 3, 5, 7, 10]
  const voices: { osc: OscillatorNode; v: number; last: number }[] = []
  for (let v = 0; v < 4; v++) {
    for (const det of [-7, 6]) {
      const osc = ctx.createOscillator()
      osc.type = det < 0 ? "triangle" : "sine"
      osc.detune.value = det
      const g = ctx.createGain()
      g.gain.value = v === 0 ? 0.3 : 0.17
      osc.connect(g)
      g.connect(padFilter)
      osc.start()
      voices.push({ osc, v, last: 0 })
    }
  }

  // Vinyl: low hiss plus sparse pops, looped, played at the platter's speed.
  const noiseLen = rate * 4
  const noise = ctx.createBuffer(1, noiseLen, rate)
  const nd = noise.getChannelData(0)
  for (let i = 0; i < noiseLen; i++) nd[i] = (Math.random() * 2 - 1) * 0.05
  for (let p = 0; p < 110; p++) {
    const at = Math.floor(Math.random() * (noiseLen - 80))
    const amp = (0.25 + Math.random() * 0.75) * (Math.random() < 0.5 ? -1 : 1)
    for (let k = 0; k < 60; k++) nd[at + k] += amp * Math.exp(-k / 7)
  }
  const crackle = ctx.createBufferSource()
  crackle.buffer = noise
  crackle.loop = true
  const hp = ctx.createBiquadFilter()
  hp.type = "highpass"
  hp.frequency.value = 650
  const crackleGain = ctx.createGain()
  crackleGain.gain.value = 0
  crackle.connect(hp)
  hp.connect(crackleGain)
  crackleGain.connect(master)
  crackle.start()

  const bell = (freq: number, gain: number, decay: number) => {
    const t = ctx.currentTime
    const env = ctx.createGain()
    env.gain.setValueAtTime(0, t)
    env.gain.linearRampToValueAtTime(gain, t + 0.008)
    env.gain.exponentialRampToValueAtTime(0.0001, t + decay)
    const a = ctx.createOscillator()
    a.frequency.value = freq
    const b = ctx.createOscillator()
    b.frequency.value = freq * 2.76
    const bg = ctx.createGain()
    bg.gain.value = 0.16
    a.connect(env)
    b.connect(bg)
    bg.connect(env)
    env.connect(master)
    env.connect(echo)
    env.connect(verb)
    a.start(t)
    b.start(t)
    a.stop(t + decay + 0.05)
    b.stop(t + decay + 0.05)
  }

  let chimeIn = 0.6
  let degree = 5
  let lastPad = -1
  let lastCrackle = -1
  let lastPitch = -1

  return {
    update(r, level, contact, dt) {
      const t = ctx.currentTime
      const speed = Math.abs(r)
      const pitch = Math.max(speed, 0.002)
      if (Math.abs(pitch - lastPitch) > 0.001) {
        lastPitch = pitch
        for (const vo of voices) vo.osc.frequency.setTargetAtTime(Math.max(base * ratios[vo.v] * pitch, 1), t, 0.03)
        crackle.playbackRate.setTargetAtTime(clamp(speed, 0.04, 4), t, 0.03)
      }
      const pad = contact ? 0.15 * level * Math.min(1, speed) : 0
      if (Math.abs(pad - lastPad) > 0.002) {
        lastPad = pad
        padGain.gain.setTargetAtTime(pad, t, 0.09)
      }
      const crack = contact ? 0.075 * Math.min(1, Math.sqrt(speed)) : 0
      if (Math.abs(crack - lastCrackle) > 0.002) {
        lastCrackle = crack
        crackleGain.gain.setTargetAtTime(crack, t, 0.04)
      }
      if (contact && level > 0.4 && speed > 0.55) {
        chimeIn -= dt * speed
        if (chimeIn <= 0) {
          degree = clamp(degree + [-2, -1, 1, 1, 2][Math.floor(Math.random() * 5)], 0, 11)
          const step = scale[degree % 5] + 12 * Math.floor(degree / 5)
          bell(base * 4 * Math.pow(2, step / 12) * pitch, 0.065 * level, 2.6)
          chimeIn = 0.3 + Math.random() * 1.0
        }
      }
    },
    retune(root, minor) {
      base = clamp(root, 30, 600)
      ratios = minor ? [1, 1.498, 2.378, 4.49] : [1, 1.498, 2.52, 4.49]
      scale = minor ? [0, 3, 5, 7, 10] : [0, 2, 4, 7, 9]
      lastPitch = -1
    },
    thump() {
      const t = ctx.currentTime
      const o = ctx.createOscillator()
      o.frequency.setValueAtTime(70, t)
      o.frequency.exponentialRampToValueAtTime(34, t + 0.16)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.32, t)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.36)
      o.connect(g)
      g.connect(master)
      o.start(t)
      o.stop(t + 0.4)
    },
    ring(freq) {
      bell(freq, 0.12, 3.4)
    },
    setVolume(v) {
      master.gain.setTargetAtTime(v, ctx.currentTime, 0.06)
    },
    suspend() {
      if (ctx.state === "running") ctx.suspend().catch(() => {})
    },
    resume() {
      if (ctx.state === "suspended") ctx.resume().catch(() => {})
    },
    dispose() {
      ctx.close().catch(() => {})
    },
  }
}

// ---------------------------------------------------------------------------

// Each style is scoped under .ctt-root. No globals, no imported sheets.
const CSS =
  ".ctt-root .ctt-sparkle{position:absolute;transform:translate(-50%,-50%);animation:ctt-twinkle 3.4s ease-in-out infinite;pointer-events:none}" +
  "@keyframes ctt-twinkle{0%,100%{opacity:.6;transform:translate(-50%,-50%) scale(.74) rotate(0deg)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.06) rotate(10deg)}}" +
  ".ctt-root .ctt-planet{transform-box:fill-box;transform-origin:center;transition:transform .35s cubic-bezier(.3,1.6,.5,1);cursor:pointer}" +
  ".ctt-root .ctt-planet:hover{transform:scale(1.22)}" +
  ".ctt-root .ctt-name{cursor:pointer}" +
  ".ctt-root .ctt-name text{transition:opacity .6s ease,fill .6s ease}" +
  ".ctt-root .ctt-line{transition:stroke-dashoffset 2.2s cubic-bezier(.45,0,.2,1),opacity .8s ease}" +
  ".ctt-root .ctt-glow{transition:opacity 1s ease}" +
  ".ctt-root .ctt-ping{transform-box:fill-box;transform-origin:center;animation:ctt-ping 1.3s cubic-bezier(.2,.6,.3,1) forwards}" +
  "@keyframes ctt-ping{from{transform:scale(1);opacity:.9}to{transform:scale(3.4);opacity:0}}" +
  "@media (prefers-reduced-motion:reduce){.ctt-root .ctt-sparkle,.ctt-root .ctt-ping{animation:none}.ctt-root .ctt-line,.ctt-root .ctt-planet{transition:none}}"

type Camera = { x: number; y: number; w: number; h: number }

// The print's crop, and the whole deck with its pivot and counterweight.
const POSTER: Camera = { x: -240, y: -240, w: 800, h: 800 }
const FULL: Camera = { x: -545, y: -905, w: 1290, h: 1450 }

const frame = (framing: "poster" | "full", bw: number, bh: number, panel: boolean): Camera => {
  const aspect = bw > 0 && bh > 0 ? bw / bh : 1
  if (framing === "full") {
    const fit = FULL.w / FULL.h
    if (aspect > fit) {
      const h = FULL.h * 1.05
      const w = h * aspect
      // Wide boxes: lean the deck left, clear of the player panel.
      const lean = Math.min((w - FULL.w) * 0.35, w * 0.12)
      return { x: FULL.x + FULL.w / 2 - w / 2 + lean, y: FULL.y - FULL.h * 0.025, w, h }
    }
    const w = FULL.w * 1.06
    const h = w / aspect
    return { x: FULL.x - FULL.w * 0.03, y: FULL.y + FULL.h / 2 - h / 2, w, h }
  }
  if (aspect >= 1) {
    const w = POSTER.h * aspect
    return { x: POSTER.x - (w - POSTER.w) * 0.1, y: POSTER.y, w, h: POSTER.h }
  }
  // Tall boxes: centre the print in the room the player panel leaves above it.
  const h = POSTER.w / aspect
  return { x: POSTER.x, y: POSTER.y - (h - POSTER.h) * (panel ? 0.24 : 0.5), w: POSTER.w, h }
}

// Headshell axis in the drawn pose: from the stylus up-right to the collar.
const HEAD_DEG = -42.8
const AX = Math.cos((HEAD_DEG * Math.PI) / 180)
const AY = Math.sin((HEAD_DEG * Math.PI) / 180)
const TUBE_START = [STYLUS[0] + AX * 290, STYLUS[1] + AY * 290]
const TUBE =
  "M" + TUBE_START[0].toFixed(1) + " " + TUBE_START[1].toFixed(1) +
  "C" + (TUBE_START[0] + AX * 52).toFixed(1) + " " + (TUBE_START[1] + AY * 52).toFixed(1) +
  " 528 46 528 -12L" + PIVOT[0] + " " + PIVOT[1]
const HEAD = "translate(" + STYLUS[0] + " " + STYLUS[1] + ") rotate(" + HEAD_DEG + ")"
const COUNTER = "translate(" + PIVOT[0] + " " + PIVOT[1] + ") rotate(0.4)"

type Mode = "park" | "cue" | "down" | "hold" | "drag"

export default function ConstellationTurntable({
  tracks,
  palette,
  title = "Side A",
  subtitle = "Music of the Spheres",
  defaultRpm = 33,
  autoPlay = false,
  sound = true,
  volume = 0.7,
  framing = "poster",
  density = 1,
  seed = 7,
  planets = true,
  controls = true,
  height = "100svh",
  className = "",
  onTrackChange,
  onPlayingChange,
}: ConstellationTurntableProps) {
  const uid = "ctt" + React.useId().replace(/[^a-zA-Z0-9]/g, "")
  const pal = { ...DEFAULT_PALETTE, ...palette }
  const list = tracks && tracks.length ? tracks : DEFAULT_TRACKS
  const durKey = list.map((t) => t.duration ?? 210).join(",")
  const timeline = React.useMemo(
    () => buildTimeline(list.map((t) => t.duration ?? 210), GROOVE_OUT, GROOVE_IN),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [durKey],
  )
  const layoutKey = durKey + "|" + list.map((t) => t.title + t.angle + t.figureAngle + JSON.stringify(t.figure ?? "")).join("|")
  const placed = React.useMemo(
    () => placeTracks(list, timeline),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layoutKey],
  )

  const stars = React.useMemo(() => {
    const avoid: number[][] = []
    if (planets) for (const p of PLANETS) avoid.push([p.x, p.y, p.r * (p.name === "Saturn" ? 2 : 1.15)])
    for (const p of placed) {
      const half = nameLength(p.title) / 2 + 6
      for (let s = -half; s <= half; s += 9) {
        const [x, y] = polar(p.rc, p.angle + (s / p.rc) * (180 / Math.PI))
        avoid.push([x, y, 9])
      }
      for (const [x, y] of p.points) avoid.push([x, y, 5])
    }
    for (const s of SPARKLES) avoid.push([s.x, s.y, s.s * 0.2])
    return makeStars(seed, density, avoid)
  }, [seed, density, planets, placed])

  // -------------------------------------------------------------- layout
  const rootRef = React.useRef<HTMLDivElement>(null)
  const rotorRef = React.useRef<HTMLDivElement>(null)
  const armRef = React.useRef<SVGGElement>(null)
  const shadowRef = React.useRef<SVGGElement>(null)
  const cueRef = React.useRef<SVGGElement>(null)
  const tipRef = React.useRef<HTMLDivElement>(null)
  const [box, setBox] = React.useState({ w: 0, h: 0 })

  React.useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const cam = frame(framing, box.w || 1200, box.h || 800, controls)
  const k = (box.w || 1200) / cam.w
  const recordPx = RECORD_R * 2 * k
  const recordLeft = (-RECORD_R - cam.x) * k
  const recordTop = (-RECORD_R - cam.y) * k

  // -------------------------------------------------------------- state
  const [hud, setHud] = React.useState({ track: 0, time: 0, playing: false, pos: 0 })
  const [rpm, setRpm] = React.useState<33 | 45>(defaultRpm === 45 ? 45 : 33)
  const [muted, setMuted] = React.useState(false)
  const [tip, setTip] = React.useState<string | null>(null)
  const [pings, setPings] = React.useState<{ id: number; x: number; y: number; r: number }[]>([])
  const [announce, setAnnounce] = React.useState("")

  const sim = React.useRef({
    angle: 0,
    omega: 0,
    t: 0,
    motor: false,
    mode: "park" as Mode,
    cueT: 0,
    theta: 0,
    parkTheta: 0,
    lift: 1,
    contact: false,
    grab: null as null | { id: number; last: number; at: number; moved: number; target: Element | null; x: number; y: number },
    grabOmega: 0,
    armGrab: null as null | { id: number; offset: number },
    track: -1,
    shownSec: -1,
    shownPos: -1,
    playing: false,
  })
  const audio = React.useRef<Sound | null>(null)
  const tuning = React.useRef({ rpm, timeline, list, sound, volume, muted, reduced: false, onTrackChange, onPlayingChange })
  tuning.current = { ...tuning.current, rpm, timeline, list, sound, volume, muted, onTrackChange, onPlayingChange }

  const ensureAudio = React.useCallback(() => {
    const t = tuning.current
    if (!t.sound) return
    if (!audio.current) {
      audio.current = createSound(t.muted ? 0 : clamp(t.volume, 0, 1))
      const s = sim.current
      const tr = t.list[Math.max(s.track, 0)]
      if (audio.current && tr) audio.current.retune(tr.root ?? 110 * Math.pow(2, (hashString(tr.title) % 12) / 12), s.track % 2 === 0)
    }
    audio.current?.resume()
  }, [])

  React.useEffect(() => {
    audio.current?.setVolume(muted ? 0 : clamp(volume, 0, 1))
  }, [muted, volume])

  React.useEffect(() => {
    if (!sound && audio.current) {
      audio.current.dispose()
      audio.current = null
    }
  }, [sound])

  // -------------------------------------------------------------- transport
  const play = React.useCallback(() => {
    const s = sim.current
    s.motor = true
    if (s.mode === "park") {
      s.mode = "cue"
      s.cueT = 0
    } else if (s.mode === "hold") {
      s.mode = "down"
    }
  }, [])

  const pause = React.useCallback(() => {
    const s = sim.current
    s.motor = false
    if (s.mode === "cue") s.t = s.cueT
    if (s.mode === "down" || s.mode === "cue") s.mode = "hold"
  }, [])

  const toggle = React.useCallback(() => {
    ensureAudio()
    if (sim.current.motor) pause()
    else play()
  }, [ensureAudio, pause, play])

  const cue = React.useCallback(
    (i: number) => {
      ensureAudio()
      const s = sim.current
      const tl = tuning.current.timeline
      const n = tuning.current.list.length
      const idx = clamp(Math.round(i), 0, n - 1)
      s.cueT = Math.max(trackStart(tl, idx) - (idx ? GAP * 0.6 : 1.2), 0)
      s.mode = "cue"
      s.motor = true
    },
    [ensureAudio],
  )

  const skip = React.useCallback(
    (dir: 1 | -1) => {
      const s = sim.current
      const tl = tuning.current.timeline
      const seg = segmentAt(tl, s.mode === "cue" ? s.cueT : s.t)
      const cur = seg.track
      if (dir < 0 && seg.kind === 1 && s.t - seg.t0 > 3 && s.mode !== "park") cue(cur)
      else cue(clamp(cur + dir, 0, tuning.current.list.length - 1))
    },
    [cue],
  )

  React.useEffect(() => {
    if (autoPlay) play()
  }, [autoPlay, play])

  // -------------------------------------------------------------- the loop
  React.useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const syncMotion = () => {
      tuning.current.reduced = media.matches
    }
    syncMotion()
    media.addEventListener("change", syncMotion)

    let visible = true
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
    })
    io.observe(root)

    const onVisibility = () => {
      if (document.hidden) audio.current?.suspend()
      else audio.current?.resume()
    }
    document.addEventListener("visibilitychange", onVisibility)

    let raf = 0
    let last = performance.now()
    let drawnAngle = NaN
    let drawnTheta = NaN
    let drawnLift = NaN

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const s = sim.current
      const t = tuning.current
      const tl = t.timeline
      const nominal = rpmToOmega(t.rpm)

      // Platter
      if (s.grab) {
        if (now - s.grab.at > 60) s.grabOmega = approach(s.grabOmega, 0, dt, 0.05)
        s.omega = s.grabOmega
      } else {
        const target = s.motor ? nominal : 0
        const tau = s.motor ? (s.omega > nominal * 1.4 || s.omega < 0 ? 0.28 : 0.42) : 0.75
        s.omega = approach(s.omega, target, dt, tau)
        if (!s.motor && Math.abs(s.omega) < 0.004) s.omega = 0
        if (!t.reduced) s.angle += s.omega * dt
      }

      // Arm
      let goal = s.theta
      let liftGoal = 1
      if (s.mode === "park") goal = s.parkTheta
      else if (s.mode === "cue") goal = armAngle(radiusAt(tl, s.cueT))
      else if (s.mode === "down" || s.mode === "hold") goal = armAngle(radiusAt(tl, s.t))
      if (s.mode === "down") liftGoal = 0
      if (s.mode === "drag") {
        liftGoal = 1
      } else if (s.mode === "down" && s.contact) {
        s.theta = goal
      } else {
        const next = approach(s.theta, goal, dt, t.reduced ? 0.02 : 0.2)
        const cap = 1.4 * dt
        s.theta += clamp(next - s.theta, -cap, cap)
      }
      if (s.mode === "cue" && Math.abs(s.theta - goal) < 0.0015) {
        s.t = s.cueT
        s.mode = "down"
      }
      s.lift = approach(s.lift, liftGoal, dt, liftGoal < s.lift ? 0.13 : 0.08)
      const touching = s.mode === "down" && s.lift < 0.06
      if (touching && !s.contact) audio.current?.thump()
      s.contact = touching

      // Playhead
      const ratio = s.omega / nominal
      if (s.contact) {
        s.t = Math.max(0, s.t + ratio * dt)
        if (s.t >= sideLength(tl) - 0.02) {
          s.motor = false
          s.mode = "park"
          s.parkTheta = 0
          s.t = 0
        }
      }
      const at = s.mode === "cue" ? s.cueT : s.t
      const seg = segmentAt(tl, at)
      const level = trackLevel(seg, s.t)
      audio.current?.update(ratio, level, s.contact, dt)

      // Track and transport changes
      if (seg.track !== s.track) {
        s.track = seg.track
        const tr = t.list[seg.track]
        if (tr) {
          audio.current?.retune(tr.root ?? 110 * Math.pow(2, (hashString(tr.title) % 12) / 12), seg.track % 2 === 0)
          t.onTrackChange?.(seg.track, tr)
        }
      }
      const playing = s.motor
      const sec = seg.kind === 1 ? Math.floor(at - seg.t0) : 0
      const pos = Math.round((at / sideLength(tl)) * 400)
      if (playing !== s.playing || sec !== s.shownSec || pos !== s.shownPos || seg.track !== hudTrack) {
        if (playing !== s.playing) t.onPlayingChange?.(playing)
        s.playing = playing
        s.shownSec = sec
        s.shownPos = pos
        hudTrack = seg.track
        setHud({ track: seg.track, time: sec, playing, pos: at })
      }

      // Draw
      if (!visible) return
      if (s.angle !== drawnAngle && rotorRef.current) {
        drawnAngle = s.angle
        rotorRef.current.style.transform = "rotate(" + ((s.angle * 180) / Math.PI).toFixed(3) + "deg)"
      }
      if (s.theta !== drawnTheta || Math.abs(s.lift - drawnLift) > 0.001) {
        drawnTheta = s.theta
        drawnLift = s.lift
        const deg = ((s.theta * 180) / Math.PI).toFixed(4)
        const turn = "rotate(" + deg + " " + PIVOT[0] + " " + PIVOT[1] + ")"
        armRef.current?.setAttribute("transform", turn)
        const off = 12 + 26 * s.lift
        shadowRef.current?.setAttribute("transform", "translate(" + (off * 0.72).toFixed(2) + " " + off.toFixed(2) + ") " + turn)
        shadowRef.current?.setAttribute("opacity", (0.5 - 0.18 * s.lift).toFixed(3))
        cueRef.current?.setAttribute("transform", "rotate(" + (-28 * s.lift).toFixed(2) + ")")
      }
    }
    let hudTrack = -1
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      media.removeEventListener("change", syncMotion)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  React.useEffect(
    () => () => {
      audio.current?.dispose()
      audio.current = null
    },
    [],
  )

  // Say what's on when the track changes while playing.
  const current = list[clamp(hud.track, 0, list.length - 1)]
  React.useEffect(() => {
    if (hud.playing && current) setAnnounce("Now playing " + current.title)
    else if (!hud.playing) setAnnounce("")
  }, [hud.playing, current])

  // -------------------------------------------------------------- pointer
  const toWorld = (cx: number, cy: number) => {
    const r = rootRef.current!.getBoundingClientRect()
    return [cam.x + (cx - r.left) / k, cam.y + (cy - r.top) / k]
  }

  const ring = (i: number) => {
    const p = PLANETS[i]
    ensureAudio()
    audio.current?.ring(p.note)
    const id = performance.now()
    setPings((ps) => [...ps.slice(-5), { id, x: p.x, y: p.y, r: p.r }])
    window.setTimeout(() => setPings((ps) => ps.filter((q) => q.id !== id)), 1400)
  }

  const onRecordDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const [x, y] = toWorld(e.clientX, e.clientY)
    if (Math.hypot(x, y) > RECORD_R) return
    ensureAudio()
    e.currentTarget.setPointerCapture(e.pointerId)
    const s = sim.current
    s.grab = { id: e.pointerId, last: Math.atan2(y, x), at: performance.now(), moved: 0, target: e.target as Element, x: e.clientX, y: e.clientY }
    s.grabOmega = s.omega
    setTip(null)
  }

  const onRecordMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = sim.current
    if (tipRef.current) {
      const r = rootRef.current!.getBoundingClientRect()
      tipRef.current.style.transform = "translate(" + (e.clientX - r.left + 14) + "px," + (e.clientY - r.top + 16) + "px)"
    }
    const g = s.grab
    if (!g || g.id !== e.pointerId) return
    const [x, y] = toWorld(e.clientX, e.clientY)
    const a = Math.atan2(y, x)
    const d = wrapAngle(a - g.last)
    const now = performance.now()
    const dt = Math.max((now - g.at) / 1000, 1 / 240)
    g.last = a
    g.at = now
    g.moved = Math.max(g.moved, Math.hypot(e.clientX - g.x, e.clientY - g.y))
    if (g.moved < 4) return
    s.angle += d
    s.grabOmega = s.grabOmega * 0.45 + (d / dt) * 0.55
    if (rotorRef.current) rotorRef.current.style.transform = "rotate(" + ((s.angle * 180) / Math.PI).toFixed(3) + "deg)"
  }

  const onRecordUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = sim.current
    const g = s.grab
    if (!g || g.id !== e.pointerId) return
    s.grab = null
    if (g.moved >= 4) {
      s.omega = clamp(s.grabOmega, -60, 60)
      return
    }
    s.omega = s.grabOmega
    const target = g.target?.closest?.("[data-ctt]")
    const hit = target?.getAttribute("data-ctt") ?? ""
    if (hit.startsWith("planet:")) ring(Number(hit.slice(7)))
    else if (hit.startsWith("track:")) cue(Number(hit.slice(6)))
    else {
      const [x, y] = toWorld(e.clientX, e.clientY)
      if (Math.hypot(x, y) < LABEL_R) toggle()
    }
  }

  // A cancel is the browser taking the gesture (a scroll): let go, never a tap.
  const onRecordCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = sim.current
    if (!s.grab || s.grab.id !== e.pointerId) return
    s.grab = null
    s.omega = clamp(s.grabOmega, -60, 60)
  }

  const onArmDown = (e: React.PointerEvent<SVGGElement>) => {
    if (e.button !== 0) return
    e.stopPropagation()
    ensureAudio()
    e.currentTarget.setPointerCapture(e.pointerId)
    const s = sim.current
    const [x, y] = toWorld(e.clientX, e.clientY)
    const a = Math.atan2(y - PIVOT[1], x - PIVOT[0])
    if (s.mode === "cue") s.t = s.cueT
    s.armGrab = { id: e.pointerId, offset: s.theta - a }
    s.mode = "drag"
    setTip(null)
  }

  const onArmMove = (e: React.PointerEvent<SVGGElement>) => {
    const s = sim.current
    if (!s.armGrab || s.armGrab.id !== e.pointerId) return
    const [x, y] = toWorld(e.clientX, e.clientY)
    const a = Math.atan2(y - PIVOT[1], x - PIVOT[0])
    s.theta = clamp(a + s.armGrab.offset, armAngle(RECORD_R + 70), armAngle(GROOVE_IN + 1))
  }

  const onArmUp = (e: React.PointerEvent<SVGGElement>) => {
    const s = sim.current
    if (!s.armGrab || s.armGrab.id !== e.pointerId) return
    s.armGrab = null
    const r = stylusRadius(s.theta)
    const tl = tuning.current.timeline
    if (r <= GROOVE_OUT + 4) {
      s.t = Math.min(timeAt(tl, r), sideLength(tl) - 1)
      s.mode = "down"
      s.motor = true
    } else {
      s.mode = "park"
      s.parkTheta = s.theta
      s.motor = false
      s.t = 0
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return
    const onButton = (e.target as HTMLElement).tagName === "BUTTON"
    const key = e.key.toLowerCase()
    if ((key === " " || key === "enter") && onButton) return
    if (key === " " || key === "enter" || key === "k") toggle()
    else if (key === "arrowright" || key === "n") skip(1)
    else if (key === "arrowleft" || key === "p") skip(-1)
    else if (key === "3") setRpm(33)
    else if (key === "4") setRpm(45)
    else if (key === "m") setMuted((m) => !m)
    else return
    e.preventDefault()
  }

  const showTip = (label: string) => (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || sim.current.grab) return
    if (tipRef.current) {
      const r = rootRef.current!.getBoundingClientRect()
      tipRef.current.style.transform = "translate(" + (e.clientX - r.left + 14) + "px," + (e.clientY - r.top + 16) + "px)"
    }
    setTip(label)
  }
  const hideTip = () => setTip(null)

  // -------------------------------------------------------------- pieces
  const seg = segmentAt(timeline, hud.pos)
  const curLen = list[hud.track]?.duration ?? 210
  const side = sideLength(timeline)

  const recordArt = React.useMemo(
    () => (
      <svg
        viewBox="-500 -500 1000 1000"
        width="100%"
        height="100%"
        style={{ display: "block", maxWidth: "none", overflow: "visible" }}
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={uid + "-v"} r="0.5" cx="0.5" cy="0.5">
            <stop offset="0.4" stopColor="#000" stopOpacity="0" />
            <stop offset="0.86" stopColor="#000" stopOpacity="0.08" />
            <stop offset="1" stopColor="#000" stopOpacity="0.26" />
          </radialGradient>
          <filter id={uid + "-haze"} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="22" />
          </filter>
        </defs>
        <circle r={RECORD_R} fill={pal.vinyl} />
        <circle r={RECORD_R} fill={"url(#" + uid + "-v)"} />
        {/* The Milky Way's glow under its dust */}
        <path
          d={arcPath(298, -56, 20, 1)}
          fill="none"
          stroke={pal.star}
          strokeOpacity="0.07"
          strokeWidth="70"
          strokeLinecap="round"
          filter={"url(#" + uid + "-haze)"}
        />
        {/* Microgroove sheen, then the drawn grooves */}
        <g fill="none" stroke={pal.star} strokeOpacity="0.028" strokeWidth="0.7">
          {Array.from({ length: 92 }, (_, i) => (
            <circle key={i} r={WAX_R + 4 + i * 3.2} />
          ))}
        </g>
        <g fill="none" stroke={pal.groove} strokeWidth="1.4">
          {Array.from({ length: 13 }, (_, i) => (
            <circle key={i} r={213 + i * 23} strokeOpacity={0.8} />
          ))}
        </g>
        <g fill="none" stroke="#000" strokeOpacity="0.12" strokeWidth="4.5">
          {timeline
            .filter((s) => s.kind === 2)
            .map((s) => (
              <circle key={s.t0} r={(s.r0 + s.r1) / 2} />
            ))}
        </g>
        <g fill={pal.star}>
          {stars.map((s, i) => (
            <circle key={i} cx={s.x.toFixed(1)} cy={s.y.toFixed(1)} r={s.r.toFixed(2)} opacity={s.o.toFixed(2)} />
          ))}
        </g>
        <circle r={RECORD_R - 1.5} fill="none" stroke="#000" strokeOpacity="0.28" strokeWidth="3" />
        <circle r={RECORD_R - 6} fill="none" stroke={pal.star} strokeOpacity="0.06" strokeWidth="1.2" />
        <circle r={WAX_R} fill={pal.deadWax} />
        <circle r={WAX_R - 7} fill="none" stroke={pal.star} strokeOpacity="0.05" strokeWidth="1.2" />
        <circle r={LABEL_R + 9} fill="none" stroke="#000" strokeOpacity="0.18" strokeWidth="2" />
        <circle r={LABEL_R} fill={pal.label} />
        <circle r={LABEL_R - 16} fill="none" stroke={pal.labelInk} strokeOpacity="0.1" strokeWidth="1" />
        <path id={uid + "-lt"} d={arcPath(LABEL_R - 31, -170, -10, 1)} fill="none" />
        <path id={uid + "-lb"} d={arcPath(LABEL_R - 31, 170, 10, 0)} fill="none" />
        <g fill={pal.labelInk} style={{ fontFamily: FONT, fontSize: 12, letterSpacing: 4.5, fontWeight: 600 }}>
          <text textAnchor="middle" dominantBaseline="central" opacity="0.62">
            <textPath href={"#" + uid + "-lt"} startOffset="50%">
              {title.toUpperCase()}
            </textPath>
          </text>
          <text textAnchor="middle" dominantBaseline="central" opacity="0.42" style={{ fontSize: 10, letterSpacing: 3.5 }}>
            <textPath href={"#" + uid + "-lb"} startOffset="50%">
              {subtitle.toUpperCase()}
            </textPath>
          </text>
        </g>
      </svg>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uid, stars, timeline, pal.vinyl, pal.deadWax, pal.groove, pal.label, pal.labelInk, pal.star, title, subtitle],
  )

  const playing = hud.playing
  const activeTrack = seg.kind === 1 || seg.kind === 3 ? seg.track : -1
  const btn =
    "grid place-items-center rounded-full transition-[background-color,transform,opacity] duration-200 active:scale-95 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"

  // Where the player goes: beside the deck when there's room on the right,
  // under it in a tall box, otherwise a slim bar.
  const reach = framing === "full" ? 640 : 562
  const freeRight = box.w - (reach - cam.x) * k
  const freeBelow = box.h - (RECORD_R + 20 - cam.y) * k
  const panel: "side" | "stack" | "mini" =
    freeRight >= 360 || !box.w ? "side" : freeBelow >= 230 ? "stack" : "mini"
  const panelStyle: React.CSSProperties = {
    background: "color-mix(in srgb, " + pal.background + " 72%, transparent)",
    borderColor: "rgba(255,255,255,0.09)",
    boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
  }

  // The side as a map: one segment per track, as long as the track.
  const trackMap = (
    <div className="flex items-center gap-[3px]">
      {list.map((t, i) => {
        const s = timeline.find((x) => x.kind === 1 && x.track === i)!
        const fill = hud.pos >= s.t1 ? 1 : hud.pos <= s.t0 ? 0 : (hud.pos - s.t0) / (s.t1 - s.t0)
        return (
          <button
            key={i}
            type="button"
            aria-label={"Play " + t.title}
            title={t.title}
            className="group relative h-4 min-w-0 focus-visible:outline-none"
            style={{ flexGrow: s.t1 - s.t0, flexBasis: 0 }}
            onClick={() => cue(i)}
          >
            <span
              className="absolute inset-x-0 top-1/2 h-[4px] -translate-y-1/2 overflow-hidden rounded-full transition-[height] duration-200 group-hover:h-[6px] group-focus-visible:h-[6px] motion-reduce:transition-none"
              style={{ background: i === hud.track ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.13)" }}
            >
              <span
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ width: fill * 100 + "%", background: i === hud.track ? pal.accent : "rgba(255,255,255,0.8)" }}
              />
            </span>
          </button>
        )
      })}
    </div>
  )
  const prevButton = (
    <button type="button" aria-label="Previous track" className={btn + " h-9 w-9 shrink-0 text-white/80 hover:bg-white/10"} onClick={() => skip(-1)}>
      <Icon d="M7 6v12M18 6l-8 6 8 6z" />
    </button>
  )
  const nextButton = (
    <button type="button" aria-label="Next track" className={btn + " h-9 w-9 shrink-0 text-white/80 hover:bg-white/10"} onClick={() => skip(1)}>
      <Icon d="M17 6v12M6 6l8 6-8 6z" />
    </button>
  )
  const playButton = (size: number) => (
    <button
      type="button"
      aria-label={playing ? "Pause" : "Play"}
      aria-pressed={playing}
      className={btn + " shrink-0"}
      style={{ width: size, height: size, background: pal.label, color: pal.background }}
      onClick={toggle}
    >
      {playing ? <Icon d="M9 6v12M15 6v12" bold /> : <Icon d="M8 5.5v13l11-6.5z" fill />}
    </button>
  )
  const speedSwitch = (
    <div className="flex shrink-0 rounded-full bg-white/[0.07] p-[3px] text-[11px] font-semibold tabular-nums" role="radiogroup" aria-label="Speed">
      {([33, 45] as const).map((v) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={rpm === v}
          className="rounded-full px-2.5 py-1 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 motion-reduce:transition-none"
          style={rpm === v ? { background: pal.label, color: pal.background } : { color: "rgba(255,255,255,0.6)" }}
          onClick={() => setRpm(v)}
        >
          {v === 45 ? "45" : "33⅓"}
        </button>
      ))}
    </div>
  )
  const muteButton = sound ? (
    <button
      type="button"
      aria-label={muted ? "Unmute" : "Mute"}
      aria-pressed={muted}
      className={btn + " h-9 w-9 shrink-0 text-white/80 hover:bg-white/10"}
      onClick={() => {
        ensureAudio()
        setMuted((m) => !m)
      }}
    >
      {muted ? (
        <Icon d="M4 9.5h3.5L12 6v12l-4.5-3.5H4zM16 9.5l5 5M21 9.5l-5 5" />
      ) : (
        <Icon d="M4 9.5h3.5L12 6v12l-4.5-3.5H4zM15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11" />
      )}
    </button>
  ) : null

  return (
    <div
      ref={rootRef}
      className={
        "ctt-root relative w-full select-none overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/30 " +
        className
      }
      style={{
        height,
        background:
          "radial-gradient(circle at " + (recordLeft + recordPx / 2) + "px " + (recordTop + recordPx / 2) + "px, rgba(255,255,255,0.05), rgba(255,255,255,0) " + recordPx * 0.75 + "px), " + pal.background,
        fontFamily: FONT,
        WebkitTapHighlightColor: "transparent",
      }}
      tabIndex={0}
      role="application"
      aria-roledescription="turntable"
      aria-label={"Turntable, " + title + ". Space plays or pauses, arrow keys change track, 3 and 4 set the speed, M mutes."}
      onKeyDown={onKeyDown}
      onPointerDown={() => {
        if (sim.current.motor) ensureAudio()
      }}
    >
      <style>{CSS}</style>

      {/* Record: a still wrapper for the shadow, a spinning rotor inside */}
      <div
        className="absolute rounded-full"
        style={{
          left: recordLeft,
          top: recordTop,
          width: recordPx,
          height: recordPx,
          opacity: box.w ? 1 : 0,
          boxShadow: "0 " + recordPx * 0.03 + "px " + recordPx * 0.08 + "px rgba(0,0,0,0.45)",
        }}
      >
        <div
          ref={rotorRef}
          className="absolute inset-0 rounded-full"
          style={{ willChange: "transform", cursor: "grab", touchAction: "pan-y" }}
          onPointerDown={onRecordDown}
          onPointerMove={onRecordMove}
          onPointerUp={onRecordUp}
          onPointerCancel={onRecordCancel}
        >
          {recordArt}

          {/* Live layer: names, figures and planets */}
          <svg
            viewBox="-500 -500 1000 1000"
            width="100%"
            height="100%"
            className="absolute inset-0"
            style={{ display: "block", maxWidth: "none", overflow: "visible" }}
          >
            {placed.map((p, i) => {
              const on = i === activeTrack
              return (
                <g key={i}>
                  <g
                    className="ctt-glow"
                    fill={pal.accent}
                    opacity={on ? 0.32 : 0}
                    style={{ filter: "blur(3px)" }}
                  >
                    {p.points.map(([x, y], j) => (
                      <circle key={j} cx={x} cy={y} r={7} />
                    ))}
                  </g>
                  <g fill="none" stroke={pal.star} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                    {p.lines.map((pts, j) => (
                      <polyline
                        key={j}
                        className="ctt-line"
                        points={pts}
                        pathLength={1}
                        strokeDasharray="1 1"
                        strokeDashoffset={on ? 0 : 1}
                        opacity={on ? 0.75 : 0}
                      />
                    ))}
                  </g>
                  <g fill={pal.star}>
                    {p.points.map(([x, y], j) => (
                      <circle key={j} cx={x} cy={y} r={on ? 2.9 : 2.1} />
                    ))}
                  </g>
                  <path id={uid + "-n" + i} d={p.path} fill="none" />
                  <g
                    className="ctt-name"
                    data-ctt={"track:" + i}
                    onPointerEnter={showTip("Play " + p.title)}
                    onPointerLeave={hideTip}
                  >
                    <path d={p.hit} fill="none" stroke="transparent" strokeWidth="30" pointerEvents="stroke" />
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={on ? pal.accent : pal.star}
                      opacity={on ? 1 : 0.86}
                      style={{ fontFamily: FONT, fontSize: NAME_SIZE, letterSpacing: NAME_TRACK, fontWeight: 600 }}
                    >
                      <textPath href={"#" + uid + "-n" + i} startOffset="50%">
                        {p.title.toUpperCase()}
                      </textPath>
                    </text>
                  </g>
                </g>
              )
            })}

            {planets &&
              PLANETS.map((p, i) => (
                <g
                  key={p.name}
                  className="ctt-planet"
                  data-ctt={"planet:" + i}
                  onPointerEnter={showTip(p.name)}
                  onPointerLeave={hideTip}
                >
                  <Planet p={p} pal={pal} uid={uid} />
                </g>
              ))}
            {pings.map((q) => (
              <circle
                key={q.id}
                className="ctt-ping"
                cx={q.x}
                cy={q.y}
                r={q.r + 3}
                fill="none"
                stroke={pal.planet}
                strokeWidth="2"
                pointerEvents="none"
              />
            ))}
          </svg>

          {SPARKLES.map((s, i) => (
            <span
              key={i}
              className="ctt-sparkle"
              style={{
                left: ((s.x + RECORD_R) / 10) + "%",
                top: ((s.y + RECORD_R) / 10) + "%",
                width: (s.s / 10) + "%",
                height: (s.s / 10) + "%",
                animationDelay: -s.d + "s",
              }}
            >
              <svg viewBox="-50 -50 100 100" width="100%" height="100%" style={{ display: "block", maxWidth: "none", overflow: "visible" }} aria-hidden="true">
                <circle r="20" fill={pal.star} opacity="0.14" />
                <path d="M0 -50 L4 -4 L50 0 L4 4 L0 50 L-4 4 L-50 0 L-4 -4Z" fill={pal.star} />
                <path d="M0 -24 L2 -2 L24 0 L2 2 L0 24 L-2 2 L-24 0 L-2 -2Z" fill={pal.star} transform="rotate(45)" opacity="0.7" />
                <circle r="6" fill={pal.star} />
              </svg>
            </span>
          ))}
        </div>

        {/* A still reflection, so the sky turns under the light */}
        <div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background:
              "conic-gradient(from 20deg, rgba(255,255,255,0) 0deg, rgba(255,255,255,0.075) 34deg, rgba(255,255,255,0) 68deg, rgba(255,255,255,0) 180deg, rgba(255,255,255,0.05) 214deg, rgba(255,255,255,0) 250deg)",
            WebkitMaskImage: "radial-gradient(circle, transparent 40.2%, #000 40.6%, #000 99%, transparent 100%)",
            maskImage: "radial-gradient(circle, transparent 40.2%, #000 40.6%, #000 99%, transparent 100%)",
          }}
        />
      </div>

      {/* Deck overlay: spindle, arm and its shadow. Never spins. */}
      <svg
        className="pointer-events-none absolute inset-0"
        width="100%"
        height="100%"
        viewBox={cam.x + " " + cam.y + " " + cam.w + " " + cam.h}
        preserveAspectRatio="none"
        style={{ display: "block", maxWidth: "none", opacity: box.w ? 1 : 0 }}
        aria-hidden="true"
      >
        {/* Spindle */}
        <line x1="0" y1="0" x2="15" y2="24" stroke={pal.armShade} strokeWidth="15" strokeLinecap="round" />
        <circle r="10.5" fill={pal.labelInk} />
        <circle cx="-3" cy="-3" r="3" fill="#fff" opacity="0.35" />

        {/* Pivot base and cue lever — only the full framing reaches them */}
        <g transform={"translate(" + PIVOT[0] + " " + PIVOT[1] + ")"}>
          <circle r="92" fill="#fff" opacity="0.04" />
          <circle r="92" fill="none" stroke="#fff" strokeOpacity="0.09" strokeWidth="2" />
          <circle r="64" fill="#000" opacity="0.18" />
          <g transform="translate(-118 92)">
            <circle r="16" fill="#fff" opacity="0.06" />
            <g ref={cueRef} transform="rotate(-28)">
              <rect x="-6" y="-48" width="12" height="52" rx="6" fill={pal.armShade} />
              <circle cy="-46" r="9" fill={pal.arm} />
            </g>
          </g>
        </g>

        <g ref={shadowRef} opacity="0.4">
          <ArmShape pal={pal} mono="#020611" />
        </g>
        <g
          ref={armRef}
          data-ctt="arm"
          style={{ pointerEvents: "visiblePainted", cursor: "grab", touchAction: "none" }}
          onPointerDown={onArmDown}
          onPointerMove={onArmMove}
          onPointerUp={onArmUp}
          onPointerCancel={onArmUp}
        >
          <ArmShape pal={pal} />
        </g>
        <circle cx={PIVOT[0]} cy={PIVOT[1]} r="36" fill={pal.arm} stroke={pal.armShade} strokeWidth="7" />
        <circle cx={PIVOT[0]} cy={PIVOT[1]} r="10" fill={pal.deadWax} />
      </svg>

      {/* Hover label for planets and constellations */}
      <div
        ref={tipRef}
        className="pointer-events-none absolute left-0 top-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] transition-opacity duration-200 motion-reduce:transition-none"
        style={{
          opacity: tip ? 1 : 0,
          color: pal.background,
          background: pal.label,
          boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
        }}
      >
        {tip}
      </div>

      {controls && panel !== "mini" && (
        <div
          className={
            "absolute rounded-[22px] border p-4 text-white backdrop-blur-md " +
            (panel === "stack" ? "bottom-3 left-3 right-3" : "bottom-6 right-6 w-[332px]")
          }
          style={panelStyle}
        >
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.26em] text-white/55">
            <span>
              {title} · {rpm === 45 ? "45" : "33⅓"} rpm
            </span>
            <span className="tabular-nums">
              {String(hud.track + 1).padStart(2, "0")} / {String(list.length).padStart(2, "0")}
            </span>
          </div>
          <div
            className="mt-2 truncate text-[22px] font-semibold uppercase leading-tight tracking-[0.3em]"
            style={{ color: playing ? pal.accent : "#fff", transition: "color .6s ease" }}
          >
            {current?.title}
          </div>
          <div className="mt-3">{trackMap}</div>
          <div className="mt-1.5 flex justify-between text-[11px] tabular-nums text-white/50">
            <span>{formatTime(hud.time)}</span>
            <span>
              {formatTime(curLen)} · side {formatTime(side - LEAD_IN - LEAD_OUT - GAP * (list.length - 1))}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            {prevButton}
            {playButton(48)}
            {nextButton}
            <div className="ml-auto" />
            {speedSwitch}
            {muteButton}
          </div>
          {panel === "side" && (
            <p className="mt-3 text-[10.5px] leading-relaxed text-white/40">
              Tap the label to play · drag the record to scratch · drag the arm to drop the needle · tap a constellation or a
              planet
            </p>
          )}
        </div>
      )}

      {/* Tight boxes: one slim bar, so the deck stays visible */}
      {controls && panel === "mini" && (
        <div
          className={
            "absolute rounded-[18px] border px-2.5 pb-2 pt-2.5 text-white backdrop-blur-md " +
            (box.w < 520 ? "bottom-3 left-3 right-3" : "bottom-4 right-4 w-[380px]")
          }
          style={panelStyle}
        >
          <div className="flex items-center gap-1.5">
            {playButton(40)}
            <div className="min-w-0 flex-1 pl-1.5">
              <div
                className="truncate text-[13px] font-semibold uppercase leading-tight tracking-[0.26em]"
                style={{ color: playing ? pal.accent : "#fff", transition: "color .6s ease" }}
              >
                {current?.title}
              </div>
              <div className="mt-0.5 text-[10.5px] tabular-nums text-white/50">
                {String(hud.track + 1).padStart(2, "0")} / {String(list.length).padStart(2, "0")} · {formatTime(hud.time)} /{" "}
                {formatTime(curLen)}
              </div>
            </div>
            {prevButton}
            {nextButton}
            {muteButton}
          </div>
          <div className="mt-1.5 px-1">{trackMap}</div>
        </div>
      )}

      <div aria-live="polite" className="sr-only">
        {announce}
      </div>
    </div>
  )
}

function Icon({ d, fill, bold }: { d: string; fill?: boolean; bold?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" style={{ display: "block", maxWidth: "none" }}>
      <path
        d={d}
        fill={fill ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={bold ? 2.6 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Planet({ p, pal, uid }: { p: (typeof PLANETS)[number]; pal: Required<TurntablePalette>; uid: string }) {
  const ink = { stroke: pal.planetInk, strokeOpacity: 0.85, strokeWidth: 1.6 }
  if (p.name === "Jupiter") {
    const clip = uid + "-jup"
    return (
      <g transform={"translate(" + p.x + " " + p.y + ")"}>
        <clipPath id={clip}>
          <circle r={p.r} />
        </clipPath>
        <circle r={p.r} fill={pal.planet} {...ink} />
        <g clipPath={"url(#" + clip + ")"} stroke={pal.planetInk} strokeOpacity="0.85" strokeWidth="2.2" strokeLinecap="round" fill="none">
          <path d="M-16 -15H4M10 -15H14" />
          <path d="M-23 -6H-12M-5 -6H20" />
          <path d="M-1 3H23" />
          <path d="M-19 12H-4M2 12H14" />
        </g>
        <circle cx="-9" cy="3" r="4.6" fill={pal.planet} {...ink} strokeWidth={1.8} />
        <circle r={p.r} fill="none" stroke="#000" strokeOpacity="0.12" strokeWidth="5" transform="translate(-2 2)" clipPath={"url(#" + clip + ")"} />
      </g>
    )
  }
  if (p.name === "Saturn") {
    return (
      <g transform={"translate(" + p.x + " " + p.y + ") rotate(-28)"}>
        <ellipse rx={p.r * 1.95} ry={p.r * 0.52} fill="none" stroke={pal.planetInk} strokeOpacity="0.85" strokeWidth="7" />
        <ellipse rx={p.r * 1.95} ry={p.r * 0.52} fill="none" stroke={pal.planet} strokeWidth="4" />
        <circle r={p.r} fill={pal.planet} {...ink} />
        <path d={"M" + -p.r * 0.7 + " -4.5H" + p.r * 0.7 + "M" + -p.r * 0.85 + " 3.5H" + p.r * 0.85} stroke={pal.planetInk} strokeOpacity="0.22" strokeWidth="1.4" />
        <path
          d={"M" + -p.r * 1.95 + " 0A" + p.r * 1.95 + " " + p.r * 0.52 + " 0 0 0 " + p.r * 1.95 + " 0"}
          fill="none"
          stroke={pal.planetInk}
          strokeOpacity="0.85"
          strokeWidth="7"
        />
        <path
          d={"M" + -p.r * 1.95 + " 0A" + p.r * 1.95 + " " + p.r * 0.52 + " 0 0 0 " + p.r * 1.95 + " 0"}
          fill="none"
          stroke={pal.planet}
          strokeWidth="4"
        />
      </g>
    )
  }
  return (
    <g transform={"translate(" + p.x + " " + p.y + ")"}>
      <circle r={p.r} fill={pal.planet} {...(p.r > 6 ? ink : {})} />
      {p.r > 6 && <path d={"M" + -p.r * 0.2 + " " + p.r * 0.92 + "A" + p.r + " " + p.r + " 0 0 1 " + -p.r * 0.92 + " " + -p.r * 0.1} fill="none" stroke="#000" strokeOpacity="0.14" strokeWidth={p.r * 0.35} />}
    </g>
  )
}

// The arm in the print's pose. `mono` draws its silhouette for the shadow.
function ArmShape({ pal, mono }: { pal: Required<TurntablePalette>; mono?: string }) {
  const c = (v: string) => mono ?? v
  return (
    <>
      {/* Counterweight behind the pivot */}
      <g transform={COUNTER}>
        <path d="M0 0V-120" stroke={c(pal.armShade)} strokeWidth="26" strokeLinecap="round" fill="none" />
        <rect x="-40" y="-212" width="80" height="78" rx="12" fill={c(pal.arm)} stroke="none" />
        {!mono && (
          <g stroke={pal.armShade} strokeWidth="3.2">
            {[-196, -184, -172, -160, -148].map((y) => (
              <path key={y} d={"M-32 " + y + "H32"} />
            ))}
          </g>
        )}
      </g>
      {/* Tube: shaded edge first, then the bright face */}
      <path d={TUBE} fill="none" stroke={c(pal.armShade)} strokeWidth="35" strokeLinecap="round" />
      {!mono && <path d={TUBE} fill="none" stroke={pal.arm} strokeWidth="24" strokeLinecap="round" transform="translate(4.5 0)" />}
      <g transform={HEAD} stroke="none">
        {/* Finger lift */}
        <path d="M50 30L80 118" stroke={c(pal.arm)} strokeWidth="10" strokeLinecap="round" fill="none" />
        {!mono && <path d="M50 30L59 57" stroke={pal.armShade} strokeWidth="10" strokeLinecap="butt" fill="none" />}
        {/* Stylus */}
        <rect x="-7" y="-14" width="24" height="28" rx="4" fill={c(pal.accent)} />
        {!mono && <circle cx="-3" cy="0" r="3" fill="#000" opacity="0.25" />}
        {/* Headshell */}
        <rect x="6" y="-33" width="215" height="66" rx="9" fill={c(pal.arm)} />
        {!mono && (
          <>
            <rect x="6" y="-33" width="15" height="66" rx="7" fill={pal.armShade} />
            <rect x="206" y="-33" width="15" height="66" rx="7" fill={pal.armShade} />
            <rect x="21" y="25" width="185" height="8" fill="#000" opacity="0.05" />
            <rect x="40" y="-24" width="36" height="13" rx="6.5" fill={pal.deadWax} />
            <rect x="30" y="11" width="36" height="13" rx="6.5" fill={pal.deadWax} />
            <circle cx="69" cy="-17.5" r="7" fill={pal.screw} stroke="#a6cdea" strokeWidth="2.2" />
            <circle cx="59" cy="17.5" r="7" fill={pal.screw} stroke="#a6cdea" strokeWidth="2.2" />
            <g fill={pal.deadWax}>
              {[0, 1, 2, 3, 4, 5].map((i) =>
                [0, 1, 2, 3].map((j) => <circle key={i + "-" + j} cx={116 + i * 14.5} cy={-21 + j * 14} r="3.9" />),
              )}
            </g>
          </>
        )}
        {/* Collar */}
        <rect x="221" y="-22" width="12" height="44" fill={c(pal.armShade)} />
        <rect x="232" y="-28" width="44" height="56" rx="5" fill={c(pal.arm)} />
        {!mono && (
          <g stroke={pal.armShade} strokeWidth="2.8">
            {[-21, -14, -7, 0, 7, 14, 21].map((y) => (
              <path key={y} d={"M236 " + y + "H272"} />
            ))}
          </g>
        )}
        <rect x="275" y="-19" width="17" height="38" fill={c(pal.armShade)} />
      </g>
    </>
  )
}
