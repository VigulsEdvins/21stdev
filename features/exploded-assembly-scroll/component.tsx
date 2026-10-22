"use client"

import * as React from "react"

/**
 * Exploded Assembly Scroll — an engineering services page whose drawing builds
 * itself as you scroll.
 *
 * A cream spec sheet (nav, breadcrumb, headline, three capabilities) over an
 * orange drawing panel. The panel pins, and scroll assembles a line-drawn
 * isometric process skid in four stages: the structural frame, the rotating
 * equipment, the pressure vessel, then the piping and controls. Each part
 * traces itself in where it floats in the exploded view, then slides home
 * along a dashed leader and lands with a ring. Between stages the drawing
 * holds still, and the stage table on the right fills, ticks and moves on.
 * Scroll back and it comes apart again.
 *
 * Everything is SVG built from numbers — no images, no fonts, React is the
 * only import. The geometry helpers (box, cyl, pipe, …) are exported, so you
 * can model your own assembly and pass it in as `parts`.
 */

// #region assembly
// Pure: projection, geometry and the scroll → assembly mapping. Lifted out and run by the test.

export type V3 = [number, number, number]
export type P2 = [number, number]
export type Axis = "x" | "y" | "z"
/** Faces are filled with shades of the panel colour; "line" is stroke only. */
export type Tone = "top" | "left" | "right" | "side" | "line"
export type Shape = { d: string; tone: Tone; pts: P2[] }

export type AssemblyPart = {
  /** Stage this part belongs to, 0-based, in `steps` order. */
  step: number
  /** BOM line, e.g. "Motor, 75 kW TEFC". */
  label: string
  /** Small second column in the BOM, e.g. "IEC 280M". */
  spec?: string
  /** Where it floats in the exploded view, relative to where it lands (world units). */
  offset: V3
  /** Drawn back to front — build them with box / cyl / pipe / dome / line. */
  shapes: Shape[]
  /** Where the item balloon sits relative to the part's centre, screen units. */
  balloon?: P2
}

export const clamp01 = (v: number): number => (v > 0 ? (v > 1 ? 1 : v) : 0)

export const smoothstep = (edge0: number, edge1: number, x: number): number => {
  if (edge0 === edge1) return x < edge0 ? 0 : 1
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

export const easeInOutCubic = (x: number): number => {
  const t = clamp01(x)
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/** 0 when the track's top meets the stage's top, 1 when the pinned stage is about to leave. */
export const progressFrom = (top: number, height: number, stage: number): number => {
  const travel = height - stage
  if (!(travel > 0)) return 0
  return clamp01(-top / travel)
}

/** Scroll before the first stage starts, and after the last one ends. */
export const INTRO = 0.05
export const OUTRO = 0.08
/** The tail of every stage is a hold on the finished stage. */
export const HOLD = 0.3

export const stageSpan = (n: number): number => (1 - INTRO - OUTRO) / Math.max(1, n)

/** 0 → 1 across stage k's slice of the scroll. */
export const stageT = (p: number, k: number, n: number): number => {
  const span = stageSpan(n)
  return clamp01((p - (INTRO + k * span)) / span)
}

/**
 * One part inside its stage: parts of a stage overlap, each starting a little
 * after the one before. `draw` traces the outline, `fly` brings it home.
 */
export const partPhase = (t: number, j: number, m: number) => {
  const build = clamp01(t / (1 - HOLD))
  const gap = 0.42
  const w = 1 / (1 + Math.max(0, m - 1) * gap)
  const u = clamp01((build - j * gap * w) / w)
  return { u, draw: smoothstep(0, 0.46, u), fly: easeInOutCubic((u - 0.4) / 0.6) }
}

/** The stage being worked on, or -1 before the first starts. Holds count as their stage. */
export const stageAt = (p: number, n: number): number => {
  if (n < 1 || p <= INTRO) return -1
  return Math.min(n - 1, Math.floor((p - INTRO) / stageSpan(n)))
}

/** The progress at which stage k is complete and holding — where a click scrolls to. */
export const holdAt = (k: number, n: number): number => INTRO + (k + 1 - HOLD * 0.45) * stageSpan(n)

/**
 * Where to settle when scrolling stops mid-build: finish the stage in the
 * direction of travel, or back out of it. null when already holding.
 */
export const snapTarget = (p: number, n: number, dir: number): number | null => {
  if (n < 1 || p <= INTRO || p >= 1 - OUTRO) return null
  const k = stageAt(p, n)
  const t = stageT(p, k, n)
  if (t >= 1 - HOLD) return null
  if (dir >= 0) return holdAt(k, n)
  return k > 0 ? holdAt(k - 1, n) : INTRO * 0.5
}

/** A stage-table row: built before the current stage, being built, holding finished, or not yet. */
export const rowState = (k: number, current: number, t: number): "idle" | "active" | "held" | "done" =>
  k < current ? "done" : k > current ? "idle" : t >= 1 - HOLD ? "held" : "active"

/** Frame-rate independent ease toward the scroll position. */
export const follow = (cur: number, target: number, dt: number, tau: number): number => {
  if (!(tau > 0)) return target
  const next = cur + (target - cur) * (1 - Math.exp(-Math.max(0, dt) / tau))
  return Math.abs(target - next) < 2e-4 ? target : next
}

// ---- projection & geometry --------------------------------------------------

const COS30 = Math.sqrt(3) / 2

/** World (x right-back, y left-back, z up) → screen. A sphere of radius r draws as a circle of r × 1.2247. */
export const iso = (x: number, y: number, z: number): P2 => [(x - y) * COS30, (x + y) * 0.5 - z]

const fmt = (n: number): string => {
  const v = Math.round(n * 10) / 10
  return String(v === 0 ? 0 : v)
}

const pathOf = (pts: P2[], close: boolean): string =>
  pts.map((p, i) => (i ? "L" : "M") + fmt(p[0]) + " " + fmt(p[1])).join("") + (close ? "Z" : "")

const shapeOf = (pts3: V3[], tone: Tone, close = true): Shape => {
  const pts = pts3.map((p) => iso(p[0], p[1], p[2]))
  return { d: pathOf(pts, close), tone, pts }
}

/** Convex hull, counter-clockwise (monotone chain). */
export const hull = (input: P2[]): P2[] => {
  const pts = [...input].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  if (pts.length < 3) return pts
  const cross = (o: P2, a: P2, b: P2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower: P2[] = []
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop()
    lower.push(p)
  }
  const upper: P2[] = []
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop()
    upper.push(p)
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1))
}

/** An axis-aligned block: the three faces a viewer can see. */
export const box = (x: number, y: number, z: number, w: number, d: number, h: number): Shape[] => [
  shapeOf([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], "left"),
  shapeOf([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]], "right"),
  shapeOf([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], "top"),
]

/** A stroke-only polyline — rungs, seams, door lines. */
export const line = (pts: V3[]): Shape => shapeOf(pts, "line", false)

const along = (c: V3, axis: Axis, t: number): V3 =>
  axis === "x" ? [c[0] + t, c[1], c[2]] : axis === "y" ? [c[0], c[1] + t, c[2]] : [c[0], c[1], c[2] + t]

/** Points on a circle of radius r around `c`, perpendicular to `axis`, from angle a0 to a1. */
const ring = (c: V3, axis: Axis, r: number, a0: number, a1: number, n: number): V3[] => {
  const out: V3[] = []
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n
    const u = r * Math.cos(a)
    const v = r * Math.sin(a)
    out.push(axis === "z" ? [c[0] + u, c[1] + v, c[2]] : axis === "x" ? [c[0], c[1] + u, c[2] + v] : [c[0] + u, c[1], c[2] + v])
  }
  return out
}

// The half of a ring that faces the viewer: its radial direction points toward +x+y+z.
const FRONT_FROM = -Math.PI / 4
const FRONT_TO = (3 * Math.PI) / 4

/**
 * A cylinder from `c` running `len` (> 0) along `axis`. The far cap is the one
 * you see. `bands` draws seam rings at those distances along the axis.
 */
export const cyl = (c: V3, axis: Axis, len: number, r: number, bands: number[] = []): Shape[] => {
  const end = along(c, axis, len)
  const a = ring(c, axis, r, 0, 2 * Math.PI, 40)
  const b = ring(end, axis, r, 0, 2 * Math.PI, 40)
  const body = hull([...a, ...b].map((p) => iso(p[0], p[1], p[2])))
  const out: Shape[] = [{ d: pathOf(body, true), tone: "side", pts: body }]
  for (const t of bands) out.push(shapeOf(ring(along(c, axis, t), axis, r, FRONT_FROM, FRONT_TO, 20), "line", false))
  out.push(shapeOf(b.slice(0, -1), axis === "z" ? "top" : axis === "x" ? "right" : "left"))
  return out
}

/** An elliptical head on a vertical shell: rim centre `c`, radius r, rise h. */
export const dome = (c: V3, r: number, h: number): Shape[] => {
  const pts: P2[] = []
  for (let k = 0; k <= 6; k++) {
    const phi = (k / 6) * (Math.PI / 2)
    for (const p of ring([c[0], c[1], c[2] + h * Math.sin(phi)], "z", r * Math.cos(phi) + 1e-6, 0, 2 * Math.PI, 32)) {
      pts.push(iso(p[0], p[1], p[2]))
    }
  }
  const body = hull(pts)
  return [{ d: pathOf(body, true), tone: "top", pts: body }, shapeOf(ring(c, "z", r, FRONT_FROM, FRONT_TO, 20), "line", false)]
}

/** A pipe through axis-aligned points, with a knuckle at every bend. */
export const pipe = (points: V3[], r: number): Shape[] => {
  const out: Shape[] = []
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    const axis: Axis = a[0] !== b[0] ? "x" : a[1] !== b[1] ? "y" : "z"
    const k = axis === "x" ? 0 : axis === "y" ? 1 : 2
    const start = a[k] <= b[k] ? a : b
    out.push(...cyl(start, axis, Math.abs(b[k] - a[k]), r))
    if (i < points.length - 1) {
      const [sx, sy] = iso(b[0], b[1], b[2])
      const R = r * 1.2247
      const circle: P2[] = []
      for (let j = 0; j < 24; j++) circle.push([sx + R * Math.cos((j / 24) * 2 * Math.PI), sy + R * Math.sin((j / 24) * 2 * Math.PI)])
      out.push({ d: pathOf(circle, true), tone: "side", pts: circle })
    }
  }
  return out
}

/** A flange: a short, fat cylinder. */
export const flange = (c: V3, axis: Axis, r: number, t = 3): Shape[] => cyl(c, axis, t, r)

export type Bounds = { minX: number; minY: number; maxX: number; maxY: number }

export const boundsOf = (pts: P2[]): Bounds => {
  const b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  for (const [x, y] of pts) {
    if (x < b.minX) b.minX = x
    if (y < b.minY) b.minY = y
    if (x > b.maxX) b.maxX = x
    if (y > b.maxY) b.maxY = y
  }
  return b
}

export const DEFAULT_BALLOON: P2 = [-34, -30]

export type PreparedPart = AssemblyPart & {
  /** Index within its stage, and how many parts the stage has. */
  j: number
  m: number
  /** Item number on the balloon and in the BOM: stage by stage, 1-based. */
  no: number
  /** Screen centre when assembled, and the screen shift of the exploded view. */
  center: P2
  shift: P2
  balloonAt: P2
}

export const prepareParts = (parts: AssemblyPart[], steps: number): PreparedPart[] => {
  const count = new Map<number, number>()
  const out: PreparedPart[] = []
  for (const part of parts) {
    if (!(part.step >= 0 && part.step < steps) || !part.shapes.length) continue
    const j = count.get(part.step) ?? 0
    count.set(part.step, j + 1)
    const b = boundsOf(part.shapes.flatMap((s) => s.pts))
    const center: P2 = [(b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2]
    const shift = iso(part.offset[0], part.offset[1], part.offset[2])
    const bo = part.balloon ?? DEFAULT_BALLOON
    out.push({ ...part, j, m: 0, no: 0, center, shift, balloonAt: [center[0] + bo[0], center[1] + bo[1]] })
  }
  const before: number[] = []
  for (let k = 0, acc = 0; k < steps; k++) {
    before.push(acc)
    acc += count.get(k) ?? 0
  }
  for (const p of out) {
    p.m = count.get(p.step) ?? 1
    p.no = before[p.step] + p.j + 1
  }
  return out
}

/** Everything the drawing can occupy, assembled or exploded, padded: [x, y, w, h]. */
export const viewBoxFor = (parts: PreparedPart[], pad = 18): [number, number, number, number] => {
  const pts: P2[] = []
  for (const p of parts) {
    for (const s of p.shapes) for (const q of s.pts) pts.push(q, [q[0] + p.shift[0], q[1] + p.shift[1]])
    pts.push([p.balloonAt[0] - 10, p.balloonAt[1] - 10], [p.balloonAt[0] + 10, p.balloonAt[1] + 10])
  }
  if (!pts.length) return [-100, -100, 200, 200]
  const b = boundsOf(pts)
  return [Math.floor(b.minX - pad), Math.floor(b.minY - pad), Math.ceil(b.maxX - b.minX + 2 * pad), Math.ceil(b.maxY - b.minY + 2 * pad)]
}

/** How far along the whole build is, 0–1. */
export const assembled = (phases: { draw: number; fly: number }[]): number =>
  phases.length ? phases.reduce((s, f) => s + 0.35 * f.draw + 0.65 * f.fly, 0) / phases.length : 0

/** "#rrggbb" mixed toward "#rrggbb" by t, or null if either is not a 6-digit hex. */
export const mixHex = (a: string, b: string, t: number): string | null => {
  const re = /^#([0-9a-f]{6})$/i
  const ma = re.exec(a.trim())
  const mb = re.exec(b.trim())
  if (!ma || !mb) return null
  const na = parseInt(ma[1], 16)
  const nb = parseInt(mb[1], 16)
  let out = "#"
  for (const sh of [16, 8, 0]) {
    const ca = (na >> sh) & 255
    const cb = (nb >> sh) & 255
    out += Math.round(ca + (cb - ca) * clamp01(t)).toString(16).padStart(2, "0")
  }
  return out
}

/**
 * The default drawing: a pump skid for a process plant. Train centreline at
 * y = 24, z = 66; the vessel stands at (100, -30). Parts are listed in
 * painting order, back to front, which is also their assembly order.
 */
export const buildSkid = (): AssemblyPart[] => {
  const Y = 24
  const Z = 66
  const VX = 100
  const VY = -30
  const rungs: Shape[] = []
  for (let z = 72; z <= 236; z += 14) rungs.push(line([[131, -40, z], [131, -22, z]]))
  return [
    // 01 — structural skid
    {
      step: 0,
      label: "Main rails, W10×33",
      spec: "2 × 3.0 m",
      offset: [0, 0, 50],
      balloon: [-150, -8],
      shapes: [...box(-150, -62, 0, 300, 12, 16), ...box(-150, 50, 0, 300, 12, 16)],
    },
    {
      step: 0,
      label: "Cross members",
      spec: "C8 channel × 5",
      offset: [0, 0, 105],
      balloon: [-40, -56],
      shapes: [-140, -75, -10, 55, 120].flatMap((x) => box(x, -62, 16, 12, 124, 10)),
    },
    {
      step: 0,
      label: "Pedestals & base ring",
      spec: "A36 plate",
      offset: [0, 0, 150],
      balloon: [40, -50],
      shapes: [...box(66, -64, 26, 68, 68, 6), ...box(-134, Y - 22, 26, 76, 44, 8), ...box(-48, Y - 20, 26, 70, 40, 8)],
    },
    // Stage 04, but painted here: the panel stands behind the motor.
    {
      step: 3,
      label: "Local control panel",
      spec: "NEMA 4X",
      offset: [0, 0, 90],
      balloon: [-40, -30],
      shapes: [
        ...box(-146, -58, 26, 30, 24, 78),
        ...box(-148, -60, 104, 34, 28, 4),
        line([[-116, -54, 60], [-116, -38, 60], [-116, -38, 98], [-116, -54, 98], [-116, -54, 60]]),
        line([[-116, -51, 92], [-116, -48, 92]]),
        line([[-116, -45, 92], [-116, -42, 92]]),
        line([[-116, -51, 86], [-116, -42, 86]]),
      ],
    },
    // 02 — rotating equipment
    {
      step: 1,
      label: "Motor, 75 kW TEFC",
      spec: "IEC 280M",
      offset: [-30, 0, 90],
      balloon: [-40, -44],
      shapes: [
        ...box(-126, Y - 20, 34, 56, 40, 10),
        ...cyl([-140, Y, Z], "x", 10, 20),
        ...cyl([-130, Y, Z], "x", 64, 22, [8, 16, 24, 32, 40, 48, 56]),
        ...box(-108, Y - 8, 84, 20, 16, 12),
        ...cyl([-66, Y, Z], "x", 6, 4),
      ],
    },
    {
      step: 1,
      label: "Coupling guard & bearing frame",
      spec: "API 610",
      offset: [0, 0, 80],
      balloon: [-26, -52],
      shapes: [
        ...box(-60, Y - 12, 48, 16, 24, 32),
        ...box(-38, Y - 8, 34, 24, 16, 22),
        ...cyl([-44, Y, Z], "x", 34, 11, [10, 24]),
      ],
    },
    {
      step: 1,
      label: "Pump casing, OH2",
      spec: "6×4-13",
      offset: [0, 40, 90],
      balloon: [34, -58],
      shapes: [
        ...box(-6, Y - 14, 34, 18, 28, 6),
        ...cyl([-10, Y, Z], "x", 24, 28, [12]),
        ...cyl([2, Y, Z + 26], "z", 18, 9),
        ...flange([2, Y, Z + 44], "z", 15, 4),
        ...cyl([14, Y, Z], "x", 20, 10),
        ...flange([34, Y, Z], "x", 16, 4),
      ],
    },
    // 03 — pressure vessel
    {
      step: 2,
      label: "Skirt & shell, SA-516-70",
      spec: "ID 1.4 m",
      offset: [0, 0, 80],
      balloon: [54, -40],
      shapes: [
        ...cyl([VX, VY, 32], "z", 28, 30),
        ...cyl([VX, VY, 60], "z", 176, 28, [44, 88, 132]),
        ...cyl([VX, VY + 26, Z], "y", 10, 10),
        ...flange([VX, VY + 36, Z], "y", 15),
        ...cyl([VX, VY + 26, 190], "y", 10, 9),
        ...flange([VX, VY + 36, 190], "y", 14),
      ],
    },
    {
      step: 2,
      label: "2:1 elliptical head",
      spec: "t = 16 mm",
      offset: [0, 0, 90],
      balloon: [-46, -20],
      shapes: [...dome([VX, VY, 236], 28, 16), ...cyl([VX, VY, 248], "z", 14, 5), ...flange([VX, VY, 262], "z", 9)],
    },
    {
      step: 2,
      label: "Access ladder",
      spec: "OSHA 1910.23",
      offset: [40, 0, 40],
      balloon: [44, -30],
      shapes: [...box(130, -42, 60, 2, 2, 186), ...box(130, -22, 60, 2, 2, 186), ...rungs],
    },
    // 04 — piping & controls
    {
      step: 3,
      label: "Suction line & gate valve",
      spec: "6 in. Sch 40",
      offset: [0, 40, 60],
      balloon: [-14, 40],
      shapes: [
        ...pipe([[38, Y, Z], [VX, Y, Z], [VX, VY + 39, Z]], 7),
        ...box(60, Y - 9, Z - 9, 14, 18, 18),
        ...cyl([67, Y, Z + 9], "z", 20, 2),
        ...cyl([67, Y, Z + 29], "z", 2, 11),
      ],
    },
    {
      step: 3,
      label: "Discharge riser & check valve",
      spec: "4 in. Sch 80",
      offset: [0, 0, 80],
      balloon: [16, -64],
      shapes: [
        ...pipe([[2, Y, Z + 48], [2, Y, 190], [VX, Y, 190], [VX, VY + 39, 190]], 6),
        ...cyl([2, Y, 120], "z", 16, 10),
        ...cyl([40, Y, 196], "z", 12, 1.5),
        ...cyl([40, Y - 2, 214], "y", 4, 8),
      ],
    },
  ]
}
// #endregion

// ---------------------------------------------------------------------------

export type AssemblyStep = {
  /** The italic line in the stage table. */
  title: string
  /** What gets built, e.g. "Structural skid" — shown on the figure and over the BOM. */
  caption: string
  /** One sentence under the caption. */
  detail?: string
}

export type AssemblyFeature = { title: string; body: string }
export type AssemblyNavLink = { label: string; href?: string; active?: boolean }

export type ExplodedAssemblyScrollProps = {
  brand?: string
  nav?: AssemblyNavLink[]
  /** The last crumb is painted in the accent. Empty hides the row. */
  breadcrumb?: string[]
  title?: string
  intro?: string
  features?: AssemblyFeature[]
  /** One row per stage. Parts point at a stage by index. */
  steps?: AssemblyStep[]
  /** The drawing. Default: a process pump skid in twelve parts. */
  parts?: AssemblyPart[]
  tagline?: string
  statement?: string
  company?: string
  year?: string
  /** Brand colour: logo, active link, bullets, and the drawing panel. */
  accent?: string
  /** The page behind the headline. */
  surface?: string
  /** Type on the page. */
  ink?: string
  /** Lines and type on the accent panel. */
  panelInk?: string
  fontSans?: string
  fontMono?: string
  /** Height of the pinned drawing panel. Must be a definite length. */
  height?: string
  /** Panel-heights of scroll per stage. */
  scrollPerStep?: number
  /** Ease the drawing toward the scroll position instead of following it 1:1. */
  smooth?: boolean
  /** When scrolling stops mid-stage, finish (or undo) that stage. */
  snap?: boolean
  /** A faint dashed outline of the finished assembly underneath. */
  ghost?: boolean
  /** Called with the stage being built, or -1 before the first. */
  onStepChange?: (index: number) => void
  className?: string
}

const SANS = '"Inter Tight", "Inter", "Helvetica Neue", Helvetica, Arial, ui-sans-serif, system-ui, sans-serif'
const MONO = '"JetBrains Mono", "IBM Plex Mono", "SF Mono", ui-monospace, Menlo, Consolas, monospace'

const DEFAULT_NAV: AssemblyNavLink[] = [{ label: "Home" }, { label: "About" }, { label: "Services", active: true }]

const DEFAULT_FEATURES: AssemblyFeature[] = [
  {
    title: "Equipment Design & Integration",
    body: "We develop custom solutions—from pressure vessels and heat exchangers to rotating equipment—tailored to performance, efficiency, and regulatory requirements.",
  },
  {
    title: "Pipeline & Structural Systems",
    body: "Our teams engineer mechanically sound pipeline supports, pressure containment systems, and modular skids built for stability and adaptability in the field.",
  },
  {
    title: "Quality Assurance & Testing",
    body: "We implement rigorous testing protocols to ensure that every design meets industry standards and client specifications, guaranteeing reliability and safety.",
  },
]

const DEFAULT_STEPS: AssemblyStep[] = [
  { title: "Multidisciplinary Collaboration", caption: "Structural skid", detail: "Rails, cross members and pedestals — one welded frame every discipline builds on." },
  { title: "Compliance-Driven Design", caption: "Rotating equipment", detail: "Motor, coupling and an API 610 pump, aligned on a single shaft line." },
  { title: "Design for Manufacturability", caption: "Pressure vessel", detail: "Shell, head and ladder, detailed for rolling, welding and inspection." },
  { title: "Integrated Piping & Controls", caption: "Piping & instrumentation", detail: "Suction, discharge and a local panel close the loop — ready to ship." },
]

// useLayoutEffect warns during a server render; the measurement only matters in the browser.
const useIsoLayoutEffect = typeof window === "undefined" ? React.useEffect : React.useLayoutEffect

const styles = [
  ".eas{-webkit-font-smoothing:antialiased}",
  ".eas-link{position:relative;text-decoration:none;color:inherit;transition:color .2s}",
  ".eas-link::after{content:\"\";position:absolute;left:0;right:0;bottom:-4px;height:1px;background:currentColor;transform:scaleX(0);transform-origin:right;transition:transform .3s cubic-bezier(.2,.8,.2,1)}",
  ".eas-link:hover::after,.eas-link:focus-visible::after,.eas-link[aria-current]::after{transform:scaleX(1);transform-origin:left}",
  ".eas-oct{clip-path:polygon(30% 0,70% 0,100% 30%,100% 70%,70% 100%,30% 100%,0 70%,0 30%);transition:transform .45s cubic-bezier(.2,.8,.2,1)}",
  ".eas-feat:hover .eas-oct{transform:rotate(45deg) scale(1.15)}",
  ".eas-feat-t{background:linear-gradient(currentColor,currentColor) 0 100%/0 1px no-repeat;transition:background-size .35s cubic-bezier(.2,.8,.2,1)}",
  ".eas-feat:hover .eas-feat-t{background-size:100% 1px}",
  ".eas-panel{container-type:inline-size}",
  ".eas-grid{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);height:100%;border:1px solid var(--eas-line)}",
  ".eas-fig{position:relative;min-width:0;min-height:0;overflow:hidden;cursor:crosshair}",
  ".eas-side{display:flex;flex-direction:column;min-width:0;min-height:0;border-left:1px solid var(--eas-line)}",
  ".eas-row{position:relative;display:grid;grid-template-columns:58px minmax(0,1fr) 34px;align-items:stretch;width:100%;min-height:38px;padding:0;border:0;border-bottom:1px solid var(--eas-line);background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;overflow:hidden}",
  ".eas-row>span{position:relative;display:flex;align-items:center}",
  ".eas-row-n{justify-content:flex-start;padding-left:18px;border-right:1px solid var(--eas-line);transition:background-color .3s,color .3s}",
  ".eas-row-t{padding:0 18px;font-style:italic;white-space:nowrap;min-width:0}",
  ".eas-row-fill{position:absolute;left:58px;top:0;bottom:0;right:0;background:var(--eas-panel-ink);opacity:.1;transform-origin:left;transform:scaleX(var(--rp,0))}",
  ".eas-row:hover .eas-row-t,.eas-row:focus-visible .eas-row-t{text-decoration:underline;text-underline-offset:3px}",
  ".eas-row:focus-visible{outline:2px solid var(--eas-panel-ink);outline-offset:-3px}",
  ".eas-row[data-state=active] .eas-row-n,.eas-row[data-state=held] .eas-row-n,.eas-row[data-state=done] .eas-row-n{background:var(--eas-panel-ink);color:var(--eas-accent)}",
  ".eas-row[data-state=idle]{color:var(--eas-dim-ink)}",
  ".eas-tick{justify-content:center;opacity:0;transform:scale(.4);transition:opacity .25s,transform .35s cubic-bezier(.3,1.6,.5,1)}",
  ".eas-row[data-state=held] .eas-tick,.eas-row[data-state=done] .eas-tick{opacity:1;transform:none}",
  ".eas-row[data-state=held] .eas-row-fill{opacity:.16}",
  ".eas-row[data-state=active] .eas-row-t::before{content:\"\";display:inline-block;width:6px;height:6px;margin-right:10px;background:currentColor;animation:eas-blink 1s steps(2,start) infinite}",
  "@keyframes eas-blink{to{visibility:hidden}}",
  ".eas-detail{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;padding:16px 18px 14px;overflow:hidden}",
  ".eas-bom{margin:12px 0 0;padding:0;list-style:none}",
  ".eas-bom li{display:grid;grid-template-columns:26px minmax(0,1fr) auto 18px;gap:10px;align-items:center;padding:6px 0;border-bottom:1px dashed var(--eas-line);opacity:.4;transition:opacity .3s}",
  ".eas-bom li[data-state=move],.eas-bom li[data-state=set]{opacity:1}",
  ".eas-bom-n{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border:1px solid currentColor;border-radius:99px;font-size:10px}",
  ".eas-bom li[data-state=set] .eas-bom-n{background:var(--eas-panel-ink);color:var(--eas-accent)}",
  ".eas-bom-s{opacity:0;transition:opacity .2s}",
  ".eas-bom li[data-state=set] .eas-bom-s{opacity:1}",
  ".eas-bom li[data-state=move] .eas-bom-s{opacity:1}",
  ".eas-bom-s .eas-spin{display:none}",
  ".eas-bom li[data-state=move] .eas-spin{display:block;animation:eas-spin .9s linear infinite}",
  ".eas-bom li[data-state=move] .eas-check{display:none}",
  "@keyframes eas-spin{to{transform:rotate(360deg)}}",
  ".eas-bar{height:3px;background:var(--eas-line);overflow:hidden}",
  ".eas-bar>i{display:block;height:100%;background:var(--eas-panel-ink);transform-origin:left;transform:scaleX(0)}",
  ".eas-sh{stroke-dasharray:1 1;stroke-dashoffset:calc(1 - var(--d,1));fill-opacity:var(--f,1);stroke-linejoin:round;stroke-linecap:round}",
  ".eas-part[data-drawn] .eas-sh{stroke-dasharray:none}",
  ".eas-part{transition:opacity .3s}",
  ".eas-part[data-dim]{opacity:.18}",
  ".eas-hit{cursor:pointer}",
  ".eas-t-top{fill:var(--eas-top)}.eas-t-left{fill:var(--eas-left)}.eas-t-right{fill:var(--eas-right)}.eas-t-side{fill:var(--eas-side)}.eas-t-line{fill:none}",
  ".eas-ghost path{fill:none;stroke-dasharray:2 3}",
  ".eas-xh{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .2s}",
  ".eas-fig:hover .eas-xh{opacity:1}",
  ".eas-xh>i{position:absolute;background:var(--eas-panel-ink);opacity:.35}",
  "@keyframes eas-nudge{0%,100%{transform:translateY(-2px)}50%{transform:translateY(3px)}}",
  ".eas-hint-a{display:inline-block;animation:eas-nudge 1.4s ease-in-out infinite}",
  "@container (max-width: 720px){",
  ".eas-grid{grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(0,1fr) auto}",
  ".eas-side{border-left:0;border-top:1px solid var(--eas-line)}",
  ".eas-row{min-height:34px}",
  ".eas-bom,.eas-tagline,.eas-statement,.eas-detail-p{display:none}",
  ".eas-detail{flex:none;padding:10px 14px}",
  "}",
  "@media (prefers-reduced-motion: reduce){.eas-link::after,.eas-oct,.eas-feat-t,.eas-row-n,.eas-tick,.eas-bom li,.eas-part{transition:none}.eas-hint-a,.eas-row[data-state=active] .eas-row-t::before,.eas-bom li[data-state=move] .eas-spin{animation:none}}",
].join("\n")

const pad2 = (n: number) => String(n).padStart(2, "0")

export default function ExplodedAssemblyScroll({
  brand = "CoreAxis",
  nav = DEFAULT_NAV,
  breadcrumb = ["Home", "Services", "Mechanical Design Engineering"],
  title = "Mechanical Design Engineering",
  intro = "From upstream extraction systems to downstream processing facilities, we design precision-engineered mechanical components that withstand the harshest environments in the oil and gas industry.",
  features = DEFAULT_FEATURES,
  steps = DEFAULT_STEPS,
  parts,
  tagline = "Engineered for Performance. Built for Extremes.",
  statement = "All deliverables are aligned with ASME, ISO, and client-specific standards",
  company = "CoreAxis Technologies",
  year = "2024",
  accent = "#ec5d1a",
  surface = "#fbecd9",
  ink = "#141210",
  panelInk = "#1c0f07",
  fontSans = SANS,
  fontMono = MONO,
  height = "100svh",
  scrollPerStep = 0.9,
  smooth = true,
  snap = true,
  ghost = true,
  onStepChange,
  className = "",
}: ExplodedAssemblyScrollProps) {
  const trackRef = React.useRef<HTMLDivElement | null>(null)
  const stageRef = React.useRef<HTMLDivElement | null>(null)
  const figRef = React.useRef<HTMLDivElement | null>(null)
  const svgRef = React.useRef<SVGSVGElement | null>(null)
  const xhRef = React.useRef<HTMLDivElement | null>(null)
  const partRefs = React.useRef<(SVGGElement | null)[]>([])
  const leadRefs = React.useRef<(SVGGElement | null)[]>([])
  const rowRefs = React.useRef<(HTMLButtonElement | null)[]>([])
  const bomRefs = React.useRef<(HTMLLIElement | null)[]>([])
  const barRef = React.useRef<HTMLElement | null>(null)
  const pctRef = React.useRef<HTMLSpanElement | null>(null)
  const hintRef = React.useRef<HTMLDivElement | null>(null)

  const n = steps.length
  const source = React.useMemo(() => parts ?? buildSkid(), [parts])
  const prepared = React.useMemo(() => prepareParts(source, n), [source, n])
  const viewBox = React.useMemo(() => viewBoxFor(prepared), [prepared])

  const [active, setActive] = React.useState(-1)
  const [hot, setHot] = React.useState<number | null>(null)
  const [reduced, setReduced] = React.useState(false)

  const onStep = React.useRef(onStepChange)
  onStep.current = onStepChange

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])

  // Faces are shades of the panel colour, so hidden lines stay hidden.
  const tones = React.useMemo(() => {
    const mix = (to: string, t: number) =>
      mixHex(accent, to, t) ?? "color-mix(in srgb, " + accent + ", " + to + " " + Math.round(t * 100) + "%)"
    return {
      top: mix("#ffffff", 0.2),
      side: mix("#ffffff", 0.1),
      left: mix("#ffffff", 0.04),
      right: mix("#000000", 0.1),
      line: mixHex(panelInk, accent, 0.35) ?? panelInk,
      dim: mixHex(panelInk, accent, 0.45) ?? panelInk,
    }
  }, [accent, panelInk])

  // Scroll → progress → DOM. React only hears about the stage changing.
  useIsoLayoutEffect(() => {
    const track = trackRef.current
    const stage = stageRef.current
    if (!track || !stage) return

    let raf = 0
    let snapTimer = 0
    let target = 0
    let cur = -1
    let last = 0
    let lastTarget = 0
    let dir = 1
    let touching = false
    let shown = -2
    const lastState: string[] = []
    const lastRow: string[] = []

    const measure = () => {
      const r = track.getBoundingClientRect()
      target = progressFrom(r.top, r.height, stage.offsetHeight)
      if (target !== lastTarget) dir = target > lastTarget ? 1 : -1
      lastTarget = target
    }

    const paint = (p: number) => {
      const phases = prepared.map((part, i) => {
        const f = partPhase(stageT(p, part.step, n), part.j, part.m)
        const g = partRefs.current[i]
        if (g) {
          const k = 1 - f.fly
          g.setAttribute("transform", "translate(" + (part.shift[0] * k).toFixed(2) + " " + (part.shift[1] * k).toFixed(2) + ")")
          g.style.setProperty("--d", f.draw.toFixed(4))
          g.style.setProperty("--f", smoothstep(0.35, 0.9, f.u).toFixed(4))
          g.toggleAttribute("data-drawn", f.draw >= 1)
          g.style.visibility = f.draw > 0 ? "visible" : "hidden"
        }
        const lead = leadRefs.current[i]
        if (lead) {
          const k = 1 - f.fly
          const x = part.center[0] + part.shift[0] * k
          const y = part.center[1] + part.shift[1] * k
          const [trail, dotAt, land, balloon] = Array.from(lead.children) as SVGElement[]
          trail.setAttribute("x2", x.toFixed(2))
          trail.setAttribute("y2", y.toFixed(2))
          trail.style.opacity = (f.draw > 0 && f.fly < 1 ? Math.min(1, f.draw * 2) * 0.9 : 0).toFixed(3)
          dotAt.style.opacity = trail.style.opacity
          const ringT = clamp01((f.fly - 0.82) / 0.18)
          land.setAttribute("r", (4 + 22 * ringT).toFixed(2))
          land.style.opacity = (ringT > 0 && ringT < 1 ? 1 - ringT : 0).toFixed(3)
          const bo = part.balloon ?? DEFAULT_BALLOON
          balloon.setAttribute("transform", "translate(" + (x + bo[0]).toFixed(2) + " " + (y + bo[1]).toFixed(2) + ")")
          const own = stageAt(p, n) === part.step
          balloon.style.opacity = (own ? smoothstep(0.25, 0.6, f.draw) : 0).toFixed(3)
          const ld = balloon.firstElementChild as SVGLineElement | null
          if (ld) {
            ld.setAttribute("x2", (-bo[0]).toFixed(2))
            ld.setAttribute("y2", (-bo[1]).toFixed(2))
          }
        }
        const li = bomRefs.current[i]
        const st = f.fly >= 1 ? "set" : f.draw > 0 ? "move" : "wait"
        if (li && lastState[i] !== st) {
          lastState[i] = st
          li.setAttribute("data-state", st)
        }
        return f
      })

      steps.forEach((_, k) => {
        const row = rowRefs.current[k]
        if (!row) return
        const t = stageT(p, k, n)
        row.style.setProperty("--rp", clamp01(t / (1 - HOLD)).toFixed(4))
        const st = rowState(k, stageAt(p, n), t)
        if (lastRow[k] !== st) {
          lastRow[k] = st
          row.setAttribute("data-state", st)
        }
      })

      const a = assembled(phases)
      if (barRef.current) barRef.current.style.transform = "scaleX(" + a.toFixed(4) + ")"
      if (pctRef.current) pctRef.current.textContent = String(Math.round(a * 100)).padStart(3, "0") + "%"
      if (hintRef.current) hintRef.current.style.opacity = String(1 - smoothstep(0, INTRO, p))

      const s = stageAt(p, n)
      if (s !== shown) {
        shown = s
        setActive(s)
        onStep.current?.(s)
      }
    }

    const frame = (now: number) => {
      raf = 0
      measure()
      const dt = last ? (now - last) / 1000 : 1 / 60
      last = now
      cur = cur < 0 || reduced || !smooth ? target : follow(cur, target, Math.min(dt, 0.1), 0.09)
      paint(cur)
      if (cur !== target) raf = requestAnimationFrame(frame)
      else last = 0
    }

    const settle = () => {
      snapTimer = 0
      if (touching) return
      measure()
      const goal = snapTarget(target, n, dir)
      if (goal === null) return
      const r = track.getBoundingClientRect()
      const travel = r.height - stage.offsetHeight
      if (travel > 0) window.scrollBy({ top: (goal - target) * travel, behavior: "smooth" })
    }

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(frame)
      if (snap && !reduced) {
        window.clearTimeout(snapTimer)
        snapTimer = window.setTimeout(settle, 220)
      }
    }
    const onTouchStart = () => {
      touching = true
    }
    const onTouchEnd = () => {
      touching = false
      schedule()
    }

    measure()
    cur = target
    paint(cur)
    addEventListener("scroll", schedule, { passive: true })
    addEventListener("resize", schedule)
    addEventListener("touchstart", onTouchStart, { passive: true })
    addEventListener("touchend", onTouchEnd, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(snapTimer)
      removeEventListener("scroll", schedule)
      removeEventListener("resize", schedule)
      removeEventListener("touchstart", onTouchStart)
      removeEventListener("touchend", onTouchEnd)
    }
  }, [prepared, steps, n, smooth, snap, reduced])

  /** Scroll the page so stage k has just finished and is holding. */
  const goTo = (k: number) => {
    const track = trackRef.current
    const stage = stageRef.current
    if (!track || !stage) return
    const r = track.getBoundingClientRect()
    const travel = r.height - stage.offsetHeight
    if (!(travel > 0)) return
    window.scrollBy({ top: r.top + holdAt(k, n) * travel, behavior: reduced ? "auto" : "smooth" })
  }

  // The crosshair and its readout, in drawing units. No React state per move.
  const onFigMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const fig = figRef.current
    const xh = xhRef.current
    if (!fig || !xh) return
    const r = fig.getBoundingClientRect()
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    const [h, v, label] = Array.from(xh.children) as HTMLElement[]
    h.style.transform = "translateY(" + y + "px)"
    v.style.transform = "translateX(" + x + "px)"
    label.style.transform = "translate(" + Math.min(x + 10, r.width - 120) + "px," + Math.max(y - 22, 4) + "px)"
    const ctm = svgRef.current?.getScreenCTM()
    if (ctm) {
      const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
      label.textContent = "X " + pt.x.toFixed(1) + "  Y " + (-pt.y).toFixed(1)
    }
  }

  const trackHeight = "calc(" + (1 + Math.max(1, n) * scrollPerStep) + " * " + height + ")"
  const shown = active >= 0 ? active : 0
  const step = steps[shown]
  const figNo = active >= 0 ? pad2(active + 1) : "00"

  const vars = {
    "--eas-accent": accent,
    "--eas-panel-ink": panelInk,
    "--eas-line": tones.line,
    "--eas-dim-ink": tones.dim,
    "--eas-top": tones.top,
    "--eas-side": tones.side,
    "--eas-left": tones.left,
    "--eas-right": tones.right,
  } as React.CSSProperties

  return (
    <section
      className={"eas relative w-full " + className}
      style={{ ...vars, color: ink, fontFamily: fontMono }}
      aria-label={title || brand}
    >
      <style>{styles}</style>
      <div className="relative w-full" style={{ background: surface, overflow: "clip" }}>
        {/* ---- the spec sheet ---- */}
        <div className="px-5 pb-10 pt-6 sm:px-9 sm:pb-11 sm:pt-8">
          <nav className="flex items-center justify-between gap-4" style={{ fontSize: 13, letterSpacing: "0.04em" }}>
            <a href="#" className="eas-link uppercase" style={{ color: accent, fontWeight: 600 }}>
              {brand}
            </a>
            <ul className="m-0 flex list-none gap-4 p-0 sm:gap-5">
              {nav.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href ?? "#"}
                    className="eas-link uppercase"
                    style={l.active ? { color: accent } : undefined}
                    aria-current={l.active ? "page" : undefined}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {breadcrumb.length > 0 && (
            <ol className="m-0 mt-6 flex list-none flex-wrap items-center gap-x-2 p-0 uppercase" style={{ fontSize: 11.5, letterSpacing: "0.04em" }} aria-label="Breadcrumb">
              {breadcrumb.map((c, i) => {
                const last = i === breadcrumb.length - 1
                return (
                  <li key={c + i} className="flex items-center gap-2">
                    {last ? (
                      <span style={{ color: accent }} aria-current="page">
                        {c}
                      </span>
                    ) : (
                      <a href="#" className="eas-link">
                        {c}
                      </a>
                    )}
                    {!last && <span aria-hidden="true">&gt;</span>}
                  </li>
                )
              })}
            </ol>
          )}

          {title && (
            <h1
              className="m-0 mt-9 uppercase sm:mt-11"
              style={{ fontFamily: fontSans, fontWeight: 800, fontSize: "clamp(28px, 4.3vw, 50px)", lineHeight: 1.02, letterSpacing: "-0.025em" }}
            >
              {title}
            </h1>
          )}
          {intro && (
            <p className="m-0 mt-7" style={{ fontSize: 12.5, lineHeight: 1.36, maxWidth: 560 }}>
              {intro}
            </p>
          )}

          {features.length > 0 && (
            <ul className="m-0 mt-10 grid list-none gap-x-10 gap-y-7 p-0 md:grid-cols-3" style={{ maxWidth: 940 }}>
              {features.map((f) => (
                <li key={f.title} className="eas-feat">
                  <div className="flex items-center gap-3">
                    <span className="eas-oct inline-block shrink-0" style={{ width: 16, height: 16, background: accent }} aria-hidden="true" />
                    <h3 className="eas-feat-t m-0" style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: "0.005em" }}>
                      {f.title}
                    </h3>
                  </div>
                  <p className="m-0 mt-3" style={{ fontSize: 11.5, lineHeight: 1.38, paddingLeft: 28, maxWidth: 260 }}>
                    {f.body}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ---- the drawing panel: the track is the scroll budget, the stage pins ---- */}
        <div ref={trackRef} className="eas-panel relative w-full" style={{ height: trackHeight, background: accent, color: panelInk }}>
          <div ref={stageRef} className="sticky top-0 w-full p-3 sm:p-6" style={{ height }}>
            <div className="eas-grid">
              <div
                ref={figRef}
                className="eas-fig"
                onPointerMove={onFigMove}
                onPointerLeave={() => setHot(null)}
              >
                <svg
                  ref={svgRef}
                  className="absolute left-0 top-0 block"
                  width="100%"
                  height="100%"
                  viewBox={viewBox.join(" ")}
                  preserveAspectRatio="xMidYMid meet"
                  style={{ maxWidth: "none", overflow: "visible" }}
                  role="img"
                  aria-label={"Isometric drawing of the assembly, " + (active + 1 > 0 ? active + 1 : 0) + " of " + n + " stages built"}
                >
                  {ghost && (
                    <g className="eas-ghost" stroke={panelInk} strokeWidth={0.5} opacity={0.22} aria-hidden="true">
                      {prepared.map((part, i) => part.shapes.map((s, k) => <path key={i + "-" + k} d={s.d} />))}
                    </g>
                  )}
                  {prepared.map((part, i) => (
                    <g
                      key={i}
                      ref={(el) => {
                        partRefs.current[i] = el
                      }}
                      className="eas-part eas-hit"
                      data-dim={hot !== null && hot !== part.step ? "" : undefined}
                      stroke={panelInk}
                      strokeWidth={0.9}
                      style={{ visibility: "hidden" }}
                      onPointerEnter={() => setHot(part.step)}
                      onClick={() => goTo(part.step)}
                    >
                      {part.shapes.map((s, k) => (
                        <path key={k} d={s.d} className={"eas-sh eas-t-" + s.tone} pathLength={1} />
                      ))}
                    </g>
                  ))}
                  {/* leaders, landing rings and item balloons ride above the parts */}
                  <g stroke={panelInk} fill="none" pointerEvents="none" aria-hidden="true">
                    {prepared.map((part, i) => (
                      <g
                        key={i}
                        ref={(el) => {
                          leadRefs.current[i] = el
                        }}
                      >
                        <line x1={part.center[0]} y1={part.center[1]} x2={part.center[0]} y2={part.center[1]} strokeWidth={0.8} strokeDasharray="4 3" style={{ opacity: 0 }} />
                        <circle cx={part.center[0]} cy={part.center[1]} r={2.2} fill={panelInk} style={{ opacity: 0 }} />
                        <circle cx={part.center[0]} cy={part.center[1]} r={4} strokeWidth={1} style={{ opacity: 0 }} />
                        <g style={{ opacity: 0 }}>
                          <line x1={0} y1={0} x2={0} y2={0} strokeWidth={0.7} />
                          <circle r={9} fill={accent} strokeWidth={0.9} />
                          <text
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill={panelInk}
                            stroke="none"
                            style={{ fontFamily: fontMono, fontSize: 9, fontWeight: 600 }}
                          >
                            {part.no}
                          </text>
                        </g>
                      </g>
                    ))}
                  </g>
                </svg>

                {/* HUD on the figure */}
                <div className="pointer-events-none absolute left-3 top-3 sm:left-4 sm:top-4" style={{ fontSize: 10.5, letterSpacing: "0.06em" }}>
                  <div className="uppercase" style={{ fontStyle: "italic" }}>
                    Fig. {figNo} — {active >= 0 ? step?.caption : "General arrangement"}
                  </div>
                  <div className="mt-1 uppercase" style={{ opacity: 0.6 }}>
                    Iso · 1:50 · dwg ca-{pad2(n)}-{figNo}
                  </div>
                </div>
                <div
                  ref={hintRef}
                  className="pointer-events-none absolute bottom-3 right-3 uppercase sm:bottom-4 sm:right-4"
                  style={{ fontSize: 10.5, letterSpacing: "0.08em" }}
                  aria-hidden="true"
                >
                  Scroll to assemble <span className="eas-hint-a">↓</span>
                </div>
                <div className="pointer-events-none absolute bottom-3 left-3 flex items-end gap-2 sm:bottom-4 sm:left-4" style={{ fontSize: 9.5 }} aria-hidden="true">
                  <svg width="64" height="10" viewBox="0 0 64 10" style={{ maxWidth: "none", display: "block" }}>
                    <path d="M0.5 1V9M32 5V9M63.5 1V9M0.5 9H63.5" fill="none" stroke="currentColor" strokeWidth="1" />
                    <rect x="0.5" y="6" width="31.5" height="3" fill="currentColor" />
                  </svg>
                  <span>0 — 2 m</span>
                </div>
                <div ref={xhRef} className="eas-xh" aria-hidden="true">
                  <i style={{ left: 0, right: 0, top: 0, height: 1 }} />
                  <i style={{ top: 0, bottom: 0, left: 0, width: 1 }} />
                  <span className="absolute left-0 top-0 whitespace-nowrap" style={{ fontSize: 9.5, letterSpacing: "0.04em" }} />
                </div>
              </div>

              <div className="eas-side">
                <div role="list" aria-label="Build stages">
                  {steps.map((s, k) => (
                    <div role="listitem" key={k}>
                      <button
                        type="button"
                        ref={(el) => {
                          rowRefs.current[k] = el
                        }}
                        className="eas-row"
                        data-state="idle"
                        style={{ fontSize: 12.5 }}
                        aria-current={active === k ? "step" : undefined}
                        aria-label={pad2(k + 1) + " " + s.title + " — " + s.caption}
                        onClick={() => goTo(k)}
                        onPointerEnter={() => setHot(k)}
                        onPointerLeave={() => setHot((h) => (h === k ? null : h))}
                        onFocus={() => setHot(k)}
                        onBlur={() => setHot((h) => (h === k ? null : h))}
                      >
                        <span className="eas-row-n" style={{ fontStyle: "italic" }}>
                          {pad2(k + 1)}
                        </span>
                        <span className="eas-row-t">
                          <span className="eas-row-fill" style={{ left: 0 }} aria-hidden="true" />
                          <span className="relative min-w-0 truncate">{s.title}</span>
                        </span>
                        <span className="eas-tick" aria-hidden="true">
                          <svg width="12" height="10" viewBox="0 0 12 10" style={{ maxWidth: "none" }}>
                            <path d="M1 5.2 4.3 8.5 11 1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                          </svg>
                        </span>
                      </button>
                    </div>
                  ))}
                </div>

                <div className="eas-detail">
                  <div className="flex items-baseline justify-between gap-3 uppercase" style={{ fontSize: 10.5, letterSpacing: "0.06em" }}>
                    <span aria-live="polite">
                      Stage {pad2(shown + 1)} / {pad2(n)} · {step?.caption}
                    </span>
                    <span ref={pctRef} style={{ fontVariantNumeric: "tabular-nums" }}>
                      000%
                    </span>
                  </div>
                  <div className="eas-bar mt-2">
                    <i
                      ref={(el) => {
                        barRef.current = el
                      }}
                    />
                  </div>
                  {step?.detail && (
                    <p className="eas-detail-p m-0 mt-3" style={{ fontSize: 11.5, lineHeight: 1.4, maxWidth: 420 }}>
                      {step.detail}
                    </p>
                  )}
                  <ul className="eas-bom" style={{ fontSize: 11 }} aria-label="Parts in this stage">
                    {prepared.map((part, i) => (
                      <li
                        key={i}
                        ref={(el) => {
                          bomRefs.current[i] = el
                        }}
                        data-state="wait"
                        hidden={part.step !== shown}
                      >
                        <span className="eas-bom-n">{part.no}</span>
                        <span className="truncate">{part.label}</span>
                        <span style={{ opacity: 0.7, whiteSpace: "nowrap" }}>{part.spec}</span>
                        <span className="eas-bom-s inline-flex justify-center" aria-hidden="true">
                          <svg className="eas-check" width="11" height="11" viewBox="0 0 12 12" style={{ maxWidth: "none" }}>
                            <path d="M1 6.2 4.3 9.5 11 2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                          </svg>
                          <svg className="eas-spin" width="11" height="11" viewBox="0 0 12 12" style={{ maxWidth: "none" }}>
                            <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray="18 10" />
                          </svg>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {tagline && (
                  <div className="eas-tagline" style={{ borderTop: "1px solid var(--eas-line)", padding: "11px 18px", fontSize: 12, fontStyle: "italic" }}>
                    {tagline}
                  </div>
                )}
                {statement && (
                  <p
                    className="eas-statement m-0 uppercase"
                    style={{
                      borderTop: "1px solid var(--eas-line)",
                      padding: "clamp(14px, 2vw, 22px) 18px",
                      fontFamily: fontSans,
                      fontWeight: 700,
                      fontSize: "clamp(16px, 2.05vw, 26px)",
                      lineHeight: 1.18,
                      letterSpacing: "-0.012em",
                    }}
                  >
                    {statement}
                  </p>
                )}
                <div className="flex" style={{ borderTop: "1px solid var(--eas-line)", fontSize: 12 }}>
                  <span className="flex-1 truncate" style={{ padding: "10px 18px" }}>
                    {company}
                  </span>
                  <span style={{ padding: "10px 18px", borderLeft: "1px solid var(--eas-line)", fontStyle: "italic" }}>{year}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
