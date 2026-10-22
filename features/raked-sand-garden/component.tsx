"use client"

// Raked Sand Garden — a karesansui gravel bed seen from above, under a low sun.
// The gravel is a real heightfield: parallel furrows across the bed, concentric
// rings around each stone where the gardener walked the rake round it, moss at
// the stones' feet. Every furrow is lit per pixel and casts its own shadow, so
// the pattern reads by raking light, the way the real thing does. Drag across
// it and a wooden rake lowers into the gravel and draws new furrows behind it,
// curving as the head turns, overwriting whatever was there.
//
// One file, React only, WebGL2. No textures, no network. It draws only while
// something changes, then holds the frame. Without WebGL2 it falls back to a
// CSS furrow pattern so the page is never blank.

import * as React from "react"

export type SandLight = "auto" | "day" | "night"

export interface RakedSandGardenProps {
  /** "day" (low warm sun), "night" (moonlight), or "auto" to follow a `.dark` class on <html>. Defaults to "auto". */
  light?: SandLight
  /** Stone groupings set in the gravel, 0–5. Defaults to 3. */
  stones?: number
  /** Distance between furrows in CSS px. Defaults to scaling with the frame, 14–26. */
  groove?: number
  /** Teeth on the rake. Defaults to 6. */
  tines?: number
  /** Rake one stroke across the bed the first time it scrolls into view. Defaults to true. */
  autoRake?: boolean
  /** Drag to rake. Defaults to true. */
  interactive?: boolean
  /** Reshuffles the stones. */
  seed?: number
  /** Content laid over the garden. */
  children?: React.ReactNode
  /** Root height. A definite length, never a percentage. */
  height?: string
  className?: string
}

// #region garden
// Pure helpers, lifted out and executed by tests/raked-sand-garden.test.mjs.

/** Small seeded PRNG (mulberry32). */
export function rsgRandom(seed: number) {
  let a = (seed >>> 0) || 1
  return function () {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Grid cell size in CSS px: fine enough for the furrows, coarse enough to stay cheap. */
export function rsgCell(w: number, h: number, groove: number, dpr = 1) {
  return Math.max(dpr >= 2 ? 1 : 1.5, Math.min(Math.sqrt((w * h) / 420000), groove / 4.5))
}

/** Smooth lattice noise in 0–1. */
export function rsgNoise(x: number, y: number) {
  const hash = (i: number, j: number) => {
    let n = Math.imul(i, 374761393) + Math.imul(j, 668265263)
    n = Math.imul(n ^ (n >>> 13), 1274126177)
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296
  }
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)
  const a = hash(ix, iy) + (hash(ix + 1, iy) - hash(ix, iy)) * ux
  const b = hash(ix, iy + 1) + (hash(ix + 1, iy + 1) - hash(ix, iy + 1)) * ux
  return a + (b - a) * uy
}

/** Furrow cross-section: 0 on the ridge, -depth in the trough. `u` is 0 at a trough. */
export function rsgFurrow(u: number, groove: number, depth: number) {
  const t = 0.5 + 0.5 * Math.cos((2 * Math.PI * u) / groove)
  return -depth * Math.pow(t, 1.5)
}

export interface RsgStone {
  x: number
  y: number
  r: number
  /** Squash across the stone's own axis. */
  e: number
  /** Rotation in radians. */
  a: number
  /** Outline wobble phases. */
  p1: number
  p2: number
  /** Crown height as a multiple of r: uprights stand high, flat stones barely clear the gravel. */
  tall: number
  /** Crown pushed toward one end of the stone's axis, -1–1: a reclining stone. */
  lean: number
  /** Moss collar width in px; 0 lets the rings run tight to the stone. */
  moss: number
}

/**
 * Stone groupings, kept clear of the middle band so content and the first stroke have
 * room. Each group has its own character: a big upright cut by the frame, a reclining
 * stone, a flat one with rings run tight to it.
 */
export function rsgStones(groups: number, seed: number, w: number, h: number) {
  const rnd = rsgRandom(seed * 7919 + 13)
  // [x, y, size, tall, squash, lean, moss, companions]
  const plan = [
    [0.07, 0.84, 1.45, 1.0, 0.82, 0, 0.3, 2],
    [0.8, 0.17, 1.15, 0.5, 0.52, 0.6, 0.2, 1],
    [0.6, 0.86, 1.0, 0.2, 0.74, 0, 0, 0],
    [0.36, 0.18, 0.8, 0.85, 0.85, 0, 0.3, 1],
    [0.96, 0.86, 0.9, 0.45, 0.6, -0.5, 0.25, 0],
  ]
  const base = Math.max(20, Math.min(84, Math.min(w, h) * 0.066))
  const out: RsgStone[] = []
  const n = Math.max(0, Math.min(5, Math.round(groups)))
  for (let g = 0; g < n; g++) {
    const [ax, ay, size, tall, sq, lean, moss, comp] = plan[g]
    const r = base * size * (0.92 + rnd() * 0.16)
    const x = (ax + (rnd() - 0.5) * 0.03) * w
    const y = (ay + (rnd() - 0.5) * 0.03) * h
    const mw = r * moss
    out.push({ x, y, r, e: sq * (0.94 + rnd() * 0.12), a: rnd() * Math.PI, p1: rnd() * 6.28, p2: rnd() * 6.28, tall, lean, moss: mw })
    for (let c = 0; c < comp; c++) {
      // Companions sit on the far side from the middle band.
      const ang = (0.15 + rnd() * 0.7) * Math.PI * (ay < 0.5 ? -1 : 1)
      const cr = r * (0.34 + rnd() * 0.18)
      const dist = r * 0.9 + cr * (0.9 + rnd() * 0.5)
      out.push({ x: x + Math.cos(ang) * dist, y: y + Math.sin(ang) * dist, r: cr, e: 0.7 + rnd() * 0.25, a: rnd() * Math.PI, p1: rnd() * 6.28, p2: rnd() * 6.28, tall: 0.45 + rnd() * 0.3, lean: rnd() - 0.5, moss: mw * 0.8 })
    }
  }
  return out
}

/** A stone's outline radius at angle `th` (local frame), as a multiple of r. */
function rsgRim(s: RsgStone, th: number) {
  return 1 + 0.08 * Math.sin(2 * th + s.p2) + 0.08 * Math.sin(3 * th + s.p1) + 0.05 * Math.sin(5 * th + s.p2 * 1.7)
}

/** How far the moss reaches past the rim at angle `th`: patchy, and heavier on one side. */
function rsgMossAt(s: RsgStone, th: number) {
  if (s.moss <= 0) return 0
  const lump = rsgNoise(Math.cos(th) * 1.6 + s.p1 * 3, Math.sin(th) * 1.6 + s.p2 * 3)
  // Heavier toward the sun (upper left), so each stone's shadow falls on bare gravel.
  return s.moss * (0.15 + 1.0 * lump + 1.1 * Math.max(0, Math.cos(th + s.a + 2.42)))
}

/** Stone-local frame: [x along the axis, y across (unsquashed), angle]. */
function rsgLocal(s: RsgStone, x: number, y: number) {
  const dx = x - s.x
  const dy = y - s.y
  const c = Math.cos(s.a)
  const si = Math.sin(s.a)
  const lx = dx * c + dy * si
  const ly = (-dx * si + dy * c) / s.e
  return [lx, ly, Math.atan2(ly, lx)]
}

/**
 * Lays the garden into `F` (RGBA per cell: height px, stone, moss, ring zone):
 * meandering furrows across the bed, rings round each island of stone and moss.
 */
export function rsgLay(F: Float32Array, gw: number, gh: number, cell: number, stones: RsgStone[], groove: number, tines: number, depth: number) {
  const n = gw * gh
  // Signed distance to the nearest island edge (stone plus its moss).
  const dist = new Float32Array(n).fill(1e9)
  let mean = 0
  for (const s of stones) mean += s.r / (stones.length || 1)
  const blend = mean * 0.8 + groove
  // Round an island the gardener walks a narrower pass: at most four rings.
  const ring = groove * Math.min(tines, 4)
  for (const s of stones) {
    const pts: number[] = []
    const steps = 200
    const c = Math.cos(s.a)
    const si = Math.sin(s.a)
    for (let k = 0; k < steps; k++) {
      const th = (k / steps) * Math.PI * 2
      const rr = s.r * rsgRim(s, th) + rsgMossAt(s, th)
      const lx = Math.cos(th) * rr
      const ly = Math.sin(th) * rr * s.e
      pts.push(s.x + lx * c - ly * si, s.y + lx * si + ly * c)
    }
    const reach = s.r * 1.25 + s.moss * 2.3 + ring + groove * 2
    const i0 = Math.max(0, Math.floor((s.x - reach) / cell))
    const i1 = Math.min(gw - 1, Math.ceil((s.x + reach) / cell))
    const j0 = Math.max(0, Math.floor((s.y - reach) / cell))
    const j1 = Math.min(gh - 1, Math.ceil((s.y + reach) / cell))
    for (let j = j0; j <= j1; j++) {
      const y = (j + 0.5) * cell
      for (let i = i0; i <= i1; i++) {
        const x = (i + 0.5) * cell
        let best = 1e18
        for (let k = 0; k < pts.length; k += 2) {
          const dx = x - pts[k]
          const dy = y - pts[k + 1]
          const d2 = dx * dx + dy * dy
          if (d2 < best) best = d2
        }
        const [lx, ly, th] = rsgLocal(s, x, y)
        const rad = Math.hypot(lx, ly)
        const rim = s.r * rsgRim(s, th)
        const d = rad < rim + rsgMossAt(s, th) ? -Math.sqrt(best) : Math.sqrt(best)
        const p = j * gw + i
        // Smooth union, so rings round a group bend through the gaps instead of creasing.
        const a0 = dist[p]
        const kk = Math.max(0, blend - Math.abs(a0 - d)) / blend
        dist[p] = Math.min(a0, d) - kk * kk * blend * 0.25
        const q = rad / rim
        if (q < 1.02) {
          // The stone: steep sided, its crown placed by `lean`, weathered into facets.
          const along = Math.max(-1, Math.min(1, lx / (s.r * 1.1)))
          const crown = 1 + s.lean * along * 0.9
          const shape = Math.pow(Math.max(0, 1 - Math.min(1, q) * Math.min(1, q)), s.tall > 0.7 ? 0.26 : 0.42)
          const crag = (1 - Math.abs(2 * rsgNoise(x * 0.045 + s.p1, y * 0.045) - 1)) * 0.7 + (1 - Math.abs(2 * rsgNoise(x * 0.11, y * 0.11 + s.p2) - 1)) * 0.3
          const top = s.r * s.tall * shape * crown * (0.85 + 0.3 * rsgNoise(x * 0.018 + s.p2, y * 0.018)) + crag * Math.min(5, s.r * (0.02 + 0.03 * Math.min(1, s.tall)))
          const m = Math.max(0, Math.min(1, (1.02 - q) / 0.05))
          F[p * 4] = Math.max(F[p * 4], top * m)
          F[p * 4 + 1] = Math.max(F[p * 4 + 1], m)
        }
      }
    }
  }
  const gap = groove * 0.3
  for (let j = 0; j < gh; j++) {
    const y = (j + 0.5) * cell
    for (let i = 0; i < gw; i++) {
      const p = j * gw + i
      const x = (i + 0.5) * cell
      if (F[p * 4 + 1] >= 0.999) {
        F[p * 4 + 3] = 1
        continue
      }
      // Hand-raked lines are never ruler straight: a slow meander and a little hand shake.
      const wob = (rsgNoise(x * 0.0022, y * 0.0016) - 0.5) * groove * 0.9 + (rsgNoise(x * 0.012, y * 0.01 + 3.7) - 0.5) * groove * 0.12
      const line = rsgFurrow(y + wob, groove, depth)
      const swell = (rsgNoise(x * 0.006, y * 0.006) - 0.5) * depth * 0.35
      let hgt = line + swell
      let moss = 0
      const d = dist[p]
      if (d < 1e8) {
        const rag = (rsgNoise(x * 0.06, y * 0.06) - 0.5) * 5
        if (d < rag) {
          moss = Math.max(0, Math.min(1, (rag - d) / 3)) * (1 - F[p * 4 + 1])
          const mound = depth * 0.2 + rsgNoise(x * 0.2, y * 0.2) * 2 + rsgNoise(x * 0.6, y * 0.6) * 0.8
          hgt = hgt * (1 - moss) + mound * moss
        }
        const u = d - gap
        if (u < ring + groove) {
          // Between the island and the first ring the gravel is a smooth, untouched shoulder.
          const rings = (u < 0 ? 0 : rsgFurrow(u - groove * 0.5, groove, depth)) + swell
          const b = Math.max(0, Math.min(1, (u - ring + groove * 0.15) / (groove * 0.3)))
          const blended = rings * (1 - b) + line * b
          const berm = depth * 0.3 * Math.exp(-Math.pow((u - ring) / (groove * 0.28), 2))
          const w = 1 - moss
          hgt = hgt * (1 - w) + (blended + berm) * w
        }
      }
      F[p * 4] = F[p * 4 + 1] > 0 ? Math.max(F[p * 4], hgt) : hgt
      F[p * 4 + 2] = moss
      // The rings round an island are the gardener's; a passing stroke stops at their outer berm.
      F[p * 4 + 3] = d < 1e8 ? Math.max(0, Math.min(1, (ring + groove * 0.6 - (d - gap)) / (groove * 0.3))) : 0
    }
  }
}

/**
 * Presses the rake into the gravel at (cx, cy), head across `(dx, dy)` (unit, the
 * direction of travel), and rewrites the cells under it as fresh furrows. `press`
 * (0–1) ramps in as a stroke starts, narrowing the footprint so a
 * stroke begins with a rounded cap. Returns the touched row range [j0, j1], or null.
 */
export function rsgStamp(F: Float32Array, gw: number, gh: number, cell: number, cx: number, cy: number, dx: number, dy: number, along: number, groove: number, tines: number, depth: number, press = 1) {
  const half = (groove * tines) / 2
  const shoulder = groove * 0.5
  const pr = Math.max(0, Math.min(1, press))
  const reach = (half + shoulder) * Math.sqrt(Math.max(0.12, pr))
  const R = reach + along
  const i0 = Math.max(0, Math.floor((cx - R) / cell))
  const i1 = Math.min(gw - 1, Math.ceil((cx + R) / cell))
  const j0 = Math.max(0, Math.floor((cy - R) / cell))
  const j1 = Math.min(gh - 1, Math.ceil((cy + R) / cell))
  if (i0 > i1 || j0 > j1) return null
  const nx = -dy
  const ny = dx
  const first = -((tines - 1) / 2) * groove
  for (let j = j0; j <= j1; j++) {
    const y = (j + 0.5) * cell - cy
    for (let i = i0; i <= i1; i++) {
      const x = (i + 0.5) * cell - cx
      const a = x * dx + y * dy
      if (a > along || a < -along) continue
      const u = x * nx + y * ny
      const au = Math.abs(u)
      if (au > reach) continue
      const p = (j * gw + i) * 4
      const keep = Math.max(F[p + 1], F[p + 2], F[p + 3])
      if (keep > 0.98) continue
      // Under the teeth the gravel is rewritten outright; only the rim blends.
      const wa = Math.min(1, 2 - (2 * Math.abs(a)) / along)
      const edge = Math.min(1, (reach - au) / (groove * 0.25))
      const k = Math.min(1, wa * edge) * (1 - keep)
      // Past the outer teeth the gravel shoved aside stands as a low shoulder,
      // so old furrows run into a ridge instead of merging with the new ones.
      const target = au <= half ? rsgFurrow(u - first, groove, depth) : depth * 0.3 * Math.sin(Math.PI * Math.min(1, (au - half) / shoulder))
      F[p] += (target - F[p]) * k
    }
  }
  return [j0, j1]
}

/** Where the rake lifts, the gravel it was pushing is left as a low crescent ahead of the head. */
export function rsgBerm(F: Float32Array, gw: number, gh: number, cell: number, cx: number, cy: number, dx: number, dy: number, groove: number, tines: number, depth: number) {
  const half = (groove * tines) / 2
  const R = half + groove * 1.6
  const i0 = Math.max(0, Math.floor((cx - R) / cell))
  const i1 = Math.min(gw - 1, Math.ceil((cx + R) / cell))
  const j0 = Math.max(0, Math.floor((cy - R) / cell))
  const j1 = Math.min(gh - 1, Math.ceil((cy + R) / cell))
  if (i0 > i1 || j0 > j1) return null
  for (let j = j0; j <= j1; j++) {
    const y = (j + 0.5) * cell - cy
    for (let i = i0; i <= i1; i++) {
      const x = (i + 0.5) * cell - cx
      const a = x * dx + y * dy
      const u = (x * -dy + y * dx) / half
      if (Math.abs(u) > 1.15 || a < -groove * 0.3) continue
      const p = (j * gw + i) * 4
      if (Math.max(F[p + 1], F[p + 2], F[p + 3]) > 0.02) continue
      const front = groove * (0.35 + 0.5 * (1 - u * u))
      const across = Math.max(0, Math.min(1, (1.15 - Math.abs(u)) / 0.3))
      const heap = depth * (0.3 + 0.2 * (1 - u * u)) * Math.exp(-Math.pow((a - front) / (groove * 0.4), 2)) * across
      if (heap > 0.01) F[p] = Math.max(F[p], heap)
    }
  }
  return [j0, j1]
}
/**
 * A centre line and wave height for the opening stroke that keeps the whole rake clear of
 * every island's rings: [y, amp] in px. Falls back to the path with the fewest touches.
 */
export function rsgClearPath(F: Float32Array, gw: number, gh: number, cell: number, w: number, h: number, reach: number) {
  let best = [h * 0.5, 0]
  let fewest = Infinity
  for (const yc of [0.5, 0.46, 0.54, 0.42, 0.58]) {
    for (const am of [0.065, 0.045, 0.03, 0.015, 0]) {
      let hits = 0
      for (let x = 0; x < w; x += cell * 3) {
        const e = (x + 0.12 * w) / (1.24 * w)
        const cy = (yc + Math.sin(e * Math.PI * 2) * am) * h
        const i = Math.floor(x / cell)
        for (let o = -reach; o <= reach; o += cell * 2) {
          const j = Math.floor((cy + o) / cell)
          if (j >= 0 && j < gh && i < gw && F[(j * gw + i) * 4 + 3] > 0.01) hits++
        }
      }
      if (hits < fewest) {
        fewest = hits
        best = [yc * h, am * h]
      }
      if (!hits) return best
    }
  }
  return best
}
/**
 * Canvas pixels per CSS px. Every pixel marches a shadow, so the frame is held to a pixel
 * budget (2.2M on a GPU, 0.6M in software) — on a big or dense screen the gravel renders a
 * little under native resolution rather than tripping the GPU watchdog.
 */
export function rsgScale(w: number, h: number, dpr: number, soft: boolean) {
  const budget = soft ? 600000 : 2200000
  return Math.max(0.5, Math.min(dpr, 2, Math.sqrt(budget / Math.max(1, w * h))))
}
// #endregion

type Look = {
  sun: number[]
  sunCol: number[]
  sky: number[]
  sand: number[]
  rock: number[]
  moss: number[]
  wood: number[]
  cane: number[]
  night: number
}

const DAY: Look = {
  sun: [-0.62, -0.55, 0.42],
  sunCol: [1.9, 1.75, 1.52],
  sky: [0.42, 0.46, 0.53],
  sand: [0.84, 0.83, 0.8],
  rock: [0.4, 0.39, 0.37],
  moss: [0.21, 0.26, 0.14],
  wood: [0.47, 0.36, 0.26],
  cane: [0.74, 0.65, 0.47],
  night: 0,
}

const NIGHT: Look = {
  sun: [0.6, -0.55, 0.3],
  sunCol: [0.8, 0.83, 0.9],
  sky: [0.085, 0.09, 0.105],
  sand: [0.8, 0.8, 0.8],
  rock: [0.55, 0.55, 0.56],
  moss: [0.34, 0.42, 0.27],
  wood: [0.56, 0.42, 0.3],
  cane: [0.78, 0.68, 0.5],
  night: 1,
}

const RSG_CSS = [
  ".rsg-root{position:relative;width:100%;overflow:hidden;isolation:isolate;touch-action:pan-y;user-select:none;-webkit-user-select:none}",
  ".rsg-root canvas{position:absolute;inset:0;display:block;width:100%;height:100%;max-width:none}",
  ".rsg-root.rsg-live canvas{cursor:none}",
  ".rsg-fallback{position:absolute;inset:0;background-color:#d6d0c2;background-image:repeating-linear-gradient(180deg,rgba(255,255,255,.35) 0 3px,rgba(0,0,0,.08) 6px,rgba(0,0,0,.16) 9px,rgba(255,255,255,.2) 14px)}",
  ".rsg-night .rsg-fallback{background-color:#1d2330;background-image:repeating-linear-gradient(180deg,rgba(255,255,255,.08) 0 3px,rgba(0,0,0,.2) 9px,rgba(255,255,255,.05) 14px)}",
  ".rsg-over{position:absolute;inset:0;pointer-events:none}",
  ".rsg-over>*{pointer-events:auto}",
].join("")

const LABEL = "A raked gravel garden seen from above. Drag across it to rake new furrows."

const VERT = "#version 300 es\nin vec2 aPos;void main(){gl_Position=vec4(aPos,0.,1.);}"

const FRAG = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform float uDpr, uCell, uGroove, uTines, uNight, uMaxH;
uniform vec3 uSun, uSunCol, uSky, uSand, uRock, uMoss, uWood, uCane;
uniform vec4 uRake;
uniform vec3 uRakeP;
out vec4 outColor;
vec2 ts;
vec4 F(vec2 p){ return texture(uTex, p / (uCell * ts)); }
float H(vec2 p){ return texture(uTex, p / (uCell * ts)).r; }
float h12(vec2 p){ vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
vec2 h22(vec2 p){ vec3 q = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); q += dot(q, q.yzx + 33.33); return fract((q.xx + q.yz) * q.zy); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(h12(i), h12(i + vec2(1, 0)), u.x), mix(h12(i + vec2(0, 1)), h12(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 4; i++){ s += a * vn(p); p = p * 2.03 + 17.1; a *= .5; } return s; }
vec4 vor(vec2 x, out vec2 id){
  vec2 n = floor(x), f = fract(x); float f1 = 8., f2 = 8.; vec2 mr = vec2(0.); id = n;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++){
    vec2 g = vec2(float(i), float(j)); vec2 r = g + .15 + .7 * h22(n + g) - f; float d = dot(r, r);
    if (d < f1){ f2 = f1; f1 = d; mr = r; id = n + g; } else if (d < f2) f2 = d;
  }
  return vec4(sqrt(f1), sqrt(f2), mr);
}
float sdBox(vec2 p, vec2 b){ vec2 d = abs(p) - b; return length(max(d, 0.)) + min(max(d.x, d.y), 0.); }
float segD(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0., 1.); return length(pa - ba * h); }
vec3 lin(vec3 c){ return pow(c, vec3(2.2)); }
float shadow(vec2 p, float h0, vec3 L){
  vec2 d = normalize(L.xy); float rise = L.z / length(L.xy);
  float res = 1., t = uCell * .7;
  for (int i = 0; i < 26; i++){
    float ray = h0 + t * rise;
    if (ray > uMaxH) break;
    float diff = ray - H(p + d * t);
    res = min(res, 11. * diff / t);
    if (res < 0.) break;
    t = t * 1.2 + .35;
  }
  return smoothstep(0., 1., clamp(res, 0., 1.));
}
void main(){
  ts = vec2(textureSize(uTex, 0));
  vec2 p = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;
  vec3 L = normalize(uSun);
  vec4 f = F(p);
  float h = f.r, rock = f.g, moss = f.b;
  float e = uCell;
  vec3 N = normalize(vec3(-(H(p + vec2(e, 0.)) - H(p - vec2(e, 0.))) / (2. * e), -(H(p + vec2(0., e)) - H(p - vec2(0., e))) / (2. * e), 1.));

  // Granite gravel: a few CSS px per stone, domed, dark in the gaps between.
  float hd2 = clamp(uDpr - 1., 0., 1.);
  float peb = max(1.5, uGroove * .12) * mix(1., 1.3, hd2);
  vec2 cid; vec4 v = vor(p / peb, cid);
  float rid = h12(cid);
  float crev = smoothstep(.02, .24, v.y - v.x);
  vec3 Ns = normalize(N + vec3(-v.zw * .42, 0.));
  float tone = rid < .07 ? .42 : rid < .25 ? .8 : rid < .3 ? 1.1 : .97;
  tone *= .93 + .12 * h12(cid + 7.3);
  vec3 alb = lin(uSand) * tone * mix(mix(.74, .86, hd2), 1., crev) * (.96 + .08 * fbm(p * .004));
  float glint = step(mix(.985, .983, uNight), h12(cid + 3.1));

  // Moss: dense, fine, darker where it's thick.
  if (moss > .01){
    // Cushion moss grows in tufts: each a small dome with its own shade, dark between.
    vec2 mid; vec4 mv = vor(p / 4.2, mid);
    float mr = h12(mid);
    float mf = fbm(p * .35);
    vec3 m = lin(uMoss) * (.5 + .65 * mr) * (.8 + .4 * vn(p * 1.4)) * (.85 + .3 * vn(p * .04));
    m = mix(m, lin(uMoss * vec3(1.25, 1.15, .75)), step(.72, h12(mid + 2.)) * .7);
    m *= mix(.45, 1., smoothstep(0., .3, mv.y - mv.x));
    vec3 Nm = normalize(N + vec3(-mv.zw * 1.1 + (vec2(vn(p * 1.1), vn(p * 1.1 + 9.)) - .5) * .8, 0.));
    // Each tuft has its own reach, so the edge breaks into clumps with gravel between.
    float k = smoothstep(.2, .55, moss + (mr - .5) * .55 + (mf - .5) * .35);
    alb = mix(alb, m, k); Ns = normalize(mix(Ns, Nm, k)); glint *= 1. - k;
  }
  float rk = 0.;
  // Stone: weathered, lichen flecked, rough under the light.
  if (rock > .01){
    vec2 q = p * .11;
    float b0 = fbm(q), bx = fbm(q + vec2(.15, 0.)), by = fbm(q + vec2(0., .15));
    vec3 Nr = normalize(N + vec3(-(bx - b0), -(by - b0), 0.) * 6.);
    float lich = smoothstep(.6, .72, fbm(p * .07 + 31.));
    vec3 r = lin(uRock) * (.7 + .55 * fbm(p * .03 + 5.)) ;
    r = mix(r, lin(vec3(.66, .67, .62)), lich * .35);
    float k = smoothstep(.2, .9, rock);
    rk = k;
    alb = mix(alb, r, k); Ns = normalize(mix(Ns, Nr, k)); glint *= 1. - k;
  }

  float ndl = max(dot(Ns, L), 0.);
  float sh = shadow(p, h + .2, L);

  // Rake: shadows on the gravel first.
  vec2 c = uRake.xy, d = uRake.zw, nn = vec2(-d.y, d.x);
  float vis = uRakeP.x, lift = uRakeP.y, hw = uRakeP.z;
  // The head rides on its teeth: the bar's top sits this high above the gravel.
  float barH = 12. + lift;
  if (vis > .001){
    vec2 Lxy = L.xy / L.z;
    vec2 sp = p + Lxy * barH - c;
    float pen = .8 + barH * .03;
    float occ = 1. - smoothstep(-pen, pen, sdBox(vec2(dot(sp, d), dot(sp, nn)), vec2(7., hw)));
    // Teeth: square pegs from the head down into the gravel.
    for (int k = 0; k < 9; k++){
      if (float(k) >= uTines) break;
      vec2 tp = c + nn * ((float(k) - (uTines - 1.) * .5) * uGroove) - d * 3.;
      float td = segD(p, tp - Lxy * max(lift, 0.), tp - Lxy * barH);
      occ = max(occ, 1. - smoothstep(1.4, 2.6, td));
    }
    // The handle leaves the head's top and climbs toward the gardener, ahead of the stroke.
    vec2 s0 = c - Lxy * barH;
    vec2 D = normalize(d - Lxy * .26);
    float tt = max(dot(p - s0, D), 0.);
    float hd = length(p - s0 - D * tt);
    float hr = 5. + tt * .004;
    float hp = .8 + tt * .012;
    occ = max(occ, (1. - smoothstep(hr - hp, hr + hp, hd)) * (1. - smoothstep(300., 1600., tt)));
    sh *= 1. - .85 * occ * vis;
  }

  float g = uGroove * .5;
  float q = g * .7071;
  float cav = h - .125 * (H(p + vec2(g, 0.)) + H(p - vec2(g, 0.)) + H(p + vec2(0., g)) + H(p - vec2(0., g))
    + H(p + vec2(q, q)) + H(p - vec2(q, q)) + H(p + vec2(q, -q)) + H(p - vec2(q, -q)));
  float ao = clamp(1. + cav * .16, .6, 1.15);
  float R = 26.;
  float big = .25 * (H(p + vec2(R, 0.)) + H(p - vec2(R, 0.)) + H(p + vec2(0., R)) + H(p - vec2(0., R)));
  ao *= clamp(1. - max(0., big - h) * .009, .45, 1.);
  // Where a stone sits in the gravel, a thin dark line of contact.
  float near = .25 * (F(p + vec2(3., 0.)).g + F(p - vec2(3., 0.)).g + F(p + vec2(0., 3.)).g + F(p - vec2(0., 3.)).g);
  ao *= 1. - .55 * clamp(near * 2., 0., 1.) * (1. - smoothstep(.1, .6, rock));

  vec3 sky = lin(uSky) * (.55 + .45 * Ns.z);
  // Furrow floors stay shaded whichever way the furrow runs: the walls hide most of the sky
  // and fines settle there, so a furrow that runs along the light still reads.
  float floorShade = mix(1., ao, .5);
  vec3 sun = lin(uSunCol) * ndl * sh * floorShade;
  vec3 col = alb * (sun + sky * ao * mix(2.1, 1.3, uNight));
  vec3 Hv = normalize(L + vec3(0., 0., 1.));
  // Weathered granite has a dull sheen where it faces the light.
  col += lin(uSunCol) * pow(max(dot(Ns, Hv), 0.), 16.) * .14 * rk * sh;
  col += lin(uSunCol) * glint * pow(max(dot(Ns, Hv), 0.), 70.) * sh * mix(1.6, 2.6, uNight);

  // The rake itself: cedar head, cane handle running back to the gardener.
  if (vis > .001){
    float tt = dot(p - c, d);
    float hdst = abs(dot(p - c, nn));
    float hr = 5.;
    float ha = (1. - smoothstep(hr - .7, hr + .7, hdst)) * step(-4., tt);
    vec2 lb = vec2(dot(p - c, d), dot(p - c, nn));
    vec3 skyR = lin(uSky) * 2.1;
    // Teeth trail behind the head as it is pulled: shaded cedar pegs.
    float tu = (lb.y + (uTines - 1.) * .5 * uGroove) / uGroove;
    float tk = clamp(floor(tu + .5), 0., uTines - 1.);
    vec2 tl = vec2(lb.x + 8.5, lb.y - (tk - (uTines - 1.) * .5) * uGroove);
    float tdd = sdBox(tl, vec2(2.6, 2.4)) - .8;
    float ta = 1. - smoothstep(-.6, .6, tdd);
    if (ta > 0.){
      vec3 Nt = normalize(vec3(-d * .55, 1.));
      vec3 tc = lin(uWood) * .8 * (lin(uSunCol) * max(dot(Nt, L), 0.) + skyR * .5);
      col = mix(col, tc, ta * vis);
    }
    float bd = sdBox(lb, vec2(6., hw - 1.)) - 1.;
    float ba = 1. - smoothstep(-.7, .7, bd);
    if (ba > 0.){
      float grain = fbm(vec2(lb.y * .04, lb.x * .9)) * .6 + .7 * vn(vec2(lb.y * .008, lb.x * .35));
      vec3 wa = lin(uWood) * (.6 + .5 * grain);
      float bev = smoothstep(-3., 0., bd);
      vec2 gdir = abs(lb.x) - 6. > abs(lb.y) - hw + 1. ? vec2(sign(lb.x), 0.) : vec2(0., sign(lb.y));
      vec2 gw = gdir.x * d + gdir.y * nn;
      vec3 Nb = normalize(vec3(gw * bev * 1.4, 1.));
      vec3 wc = wa * (lin(uSunCol) * max(dot(Nb, L), 0.) + skyR * (.6 + .4 * Nb.z));
      // Peg ends show through the top of the head as end grain.
      float peg = 1. - smoothstep(1.6, 2.4, length(vec2(lb.x + 1., lb.y - (tk - (uTines - 1.) * .5) * uGroove)));
      wc *= 1. - .35 * peg;
      col = mix(col, wc, ba * vis);
    }
    if (ha > 0.){
      float s = clamp(dot(p - c, nn) / hr, -1., 1.);
      vec3 Nh = normalize(vec3(nn * s, sqrt(max(1. - s * s, 0.))));
      float node = 1. - smoothstep(0., 2.2, abs(mod(tt + 120., 260.) - 130.) - 128.);
      float streak = .85 + .3 * vn(vec2(tt * .02, s * 3.));
      vec3 ca = lin(uCane) * streak * mix(1., .55, node);
      vec3 hc = ca * (lin(uSunCol) * max(dot(Nh, L), 0.) + skyR * (.6 + .4 * Nh.z));
      hc += lin(uSunCol) * pow(max(dot(Nh, Hv), 0.), 40.) * .25;
      col = mix(col, hc, ha * vis);
    }
  }

  vec2 uv = p / uRes;
  vec2 vc = uv - .5;
  col *= 1. - mix(.22, .5, uNight) * dot(vc, vc) * 1.6;
  col *= 1. + (1. - uNight) * .06 * (1. - uv.x - uv.y);
  col = col / (1. + col * .22) * 1.12;
  col = pow(max(col, 0.), vec3(1. / 2.2));
  col += (h12(gl_FragCoord.xy) - .5) / 255.;
  outColor = vec4(col, 1.);
}`

export default function RakedSandGarden({
  light = "auto",
  stones = 3,
  groove,
  tines = 6,
  autoRake = true,
  interactive = true,
  seed = 3,
  children,
  height = "100svh",
  className = "",
}: RakedSandGardenProps) {
  const rootRef = React.useRef(null as HTMLDivElement | null)
  const canvasRef = React.useRef(null as HTMLCanvasElement | null)
  const [failed, setFailed] = React.useState(false)
  const [dark, setDark] = React.useState(false)
  const night = light === "night" || (light === "auto" && dark)
  const opts = React.useRef({ interactive, night, autoRake, redraw: () => {} })
  opts.current.interactive = interactive
  opts.current.autoRake = autoRake
  opts.current.night = night

  // "auto" follows the page: a .dark class on <html>, as 21st and shadcn set it.
  React.useEffect(() => {
    if (light !== "auto") return
    const el = document.documentElement
    const read = () => setDark(el.classList.contains("dark"))
    read()
    const mo = new MutationObserver(read)
    mo.observe(el, { attributes: true, attributeFilter: ["class"] })
    return () => mo.disconnect()
  }, [light])

  React.useEffect(() => {
    opts.current.redraw()
  }, [night])

  const nt = Math.max(2, Math.min(9, Math.round(tines)))

  React.useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    if (!root || !canvas) return
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, preserveDrawingBuffer: true })
    // A software renderer (21st's capture, some VMs) draws far fewer pixels per frame.
    const info = gl && gl.getExtension("WEBGL_debug_renderer_info")
    const soft = !!info && /swiftshader|llvmpipe|software|basic render/i.test(String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)))
    if (!gl) {
      setFailed(true)
      return
    }
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type) as WebGLShader
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return s
    }
    const vs = compile(gl.VERTEX_SHADER, VERT)
    const fs = compile(gl.FRAGMENT_SHADER, FRAG)
    const program = gl.createProgram() as WebGLProgram
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.bindAttribLocation(program, 0, "aPos")
    gl.linkProgram(program)
    const ok =
      gl.getShaderParameter(vs, gl.COMPILE_STATUS) &&
      gl.getShaderParameter(fs, gl.COMPILE_STATUS) &&
      gl.getProgramParameter(program, gl.LINK_STATUS)
    if (!ok) {
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      setFailed(true)
      return
    }
    gl.useProgram(program)
    const quad = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, quad)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    const tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    const U: { [k: string]: WebGLUniformLocation | null } = {}
    for (const n of ["uTex", "uRes", "uDpr", "uCell", "uGroove", "uTines", "uNight", "uMaxH", "uSun", "uSunCol", "uSky", "uSand", "uRock", "uMoss", "uWood", "uCane", "uRake", "uRakeP"]) {
      U[n] = gl.getUniformLocation(program, n)
    }
    gl.uniform1i(U.uTex, 0)

    let g = 14
    let depth = 4
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let w = 0
    let h = 0
    let builtW = 0
    let builtH = 0
    let cell = 2
    let gw = 1
    let gh = 1
    let field = new Float32Array(4)
    let maxH = 10
    let dirty: number[] | null = null
    let raf = 0
    let visible = true
    let seen = false
    // The rake: where it is, which way it travels, how far it is lifted, how visible.
    const rake = { x: -999, y: -999, dx: 1, dy: 0, lift: 7, liftTo: 7, vis: 0, visTo: 0, down: false, fresh: false, fx: 0, fy: 0, run: 0 }
    let hold = 0
    let auto: { t0: number; dur: number; y: number; amp: number; ph: number } | null = null
    let autoTimer = 0
    let last = performance.now()

    const build = () => {
      g = groove ? Math.max(6, Math.min(40, groove)) : Math.max(14, Math.min(26, Math.min(w, h) * 0.022))
      depth = g * 0.3
      cell = rsgCell(w, h, g, window.devicePixelRatio || 1)
      // A little spare grid, so small resizes (a scrollbar, the URL bar) keep the strokes.
      gw = Math.ceil((w + 2 * g) / cell) + 1
      gh = Math.ceil((h + 2 * g) / cell) + 1
      builtW = w
      builtH = h
      field = new Float32Array(gw * gh * 4)
      const st = rsgStones(stones, seed, w, h)
      rsgLay(field, gw, gh, cell, st, g, nt, depth)
      maxH = depth
      for (const s of st) maxH = Math.max(maxH, s.r * (s.tall * (1 + Math.abs(s.lean)) + 0.15))
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, gw, gh, 0, gl.RGBA, gl.FLOAT, field)
      dirty = null
    }

    const upload = () => {
      if (!dirty) return
      const j0 = dirty[0]
      const rows = dirty[1] - j0 + 1
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, j0, gw, rows, gl.RGBA, gl.FLOAT, field.subarray(j0 * gw * 4, (j0 + rows) * gw * 4))
      dirty = null
    }

    const mark = (r: number[] | null) => {
      if (!r) return
      dirty = dirty ? [Math.min(dirty[0], r[0]), Math.max(dirty[1], r[1])] : r
    }

    // Walk the rake from where it was to (x, y), turning the head gradually, pressing as it goes.
    const travel = (x: number, y: number, press: boolean) => {
      if (press && rake.fresh) {
        // A new stroke takes its heading from the first real move, so it never smears sideways.
        const mx = x - rake.fx
        const my = y - rake.fy
        const ml = Math.hypot(mx, my)
        if (ml < g * 0.6) {
          rake.x = x
          rake.y = y
          return
        }
        rake.fresh = false
        rake.run = 0
        rake.dx = mx / ml
        rake.dy = my / ml
        rake.x = rake.fx
        rake.y = rake.fy
      }
      const ox = rake.x
      const oy = rake.y
      const dist = Math.hypot(x - ox, y - oy)
      if (ox < -900 || dist > Math.max(w, h)) {
        rake.x = x
        rake.y = y
        return
      }
      const step = Math.max(cell * 0.9, 1)
      const n = Math.max(1, Math.ceil(dist / step))
      for (let i = 1; i <= n; i++) {
        const px = ox + ((x - ox) * i) / n
        const py = oy + ((y - oy) * i) / n
        const sx = px - rake.x
        const sy = py - rake.y
        const sl = Math.hypot(sx, sy)
        if (sl > 1e-3) {
          const k = Math.min(1, sl / (g * 1.6))
          let ndx = rake.dx + (sx / sl - rake.dx) * k
          let ndy = rake.dy + (sy / sl - rake.dy) * k
          const nl = Math.hypot(ndx, ndy) || 1
          ndx /= nl
          ndy /= nl
          rake.dx = ndx
          rake.dy = ndy
        }
        rake.x = px
        rake.y = py
        if (press) {
          rake.run += dist / n
          mark(rsgStamp(field, gw, gh, cell, px, py, rake.dx, rake.dy, Math.max(step * 1.3, 2.5), g, nt, depth, rake.run / (g * 1.4)))
        }
      }
    }

    const render = () => {
      upload()
      const look = opts.current.night ? NIGHT : DAY
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.uniform2f(U.uRes, w, h)
      gl.uniform1f(U.uDpr, canvas.width / w)
      gl.uniform1f(U.uCell, cell)
      gl.uniform1f(U.uGroove, g)
      gl.uniform1f(U.uTines, nt)
      gl.uniform1f(U.uNight, look.night)
      gl.uniform1f(U.uMaxH, maxH + 40)
      gl.uniform3fv(U.uSun, look.sun)
      gl.uniform3fv(U.uSunCol, look.sunCol)
      gl.uniform3fv(U.uSky, look.sky)
      gl.uniform3fv(U.uSand, look.sand)
      gl.uniform3fv(U.uRock, look.rock)
      gl.uniform3fv(U.uMoss, look.moss)
      gl.uniform3fv(U.uWood, look.wood)
      gl.uniform3fv(U.uCane, look.cane)
      gl.uniform4f(U.uRake, rake.x, rake.y, rake.dx, rake.dy)
      gl.uniform3f(U.uRakeP, rake.vis, rake.lift, (g * nt) / 2 + 12)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    const frame = (now: number) => {
      raf = 0
      if (!visible) return
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      let busy = false
      if (auto) {
        const t = (now - auto.t0) / auto.dur
        const e = t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t)
        const x = -0.12 * w + e * 1.24 * w
        const y = auto.y + Math.sin(e * Math.PI * 2 + auto.ph) * auto.amp
        travel(x, y, t > 0)
        rake.visTo = t > 1 ? 0 : 1
        rake.liftTo = t > 0.97 ? 7 : 0
        if (t > 1.15) auto = null
        busy = true
      }
      const ease = reduce ? 1 : 1 - Math.exp(-dt * 14)
      rake.vis += (rake.visTo - rake.vis) * ease
      rake.lift += (rake.liftTo - rake.lift) * (reduce ? 1 : 1 - Math.exp(-dt * 18))
      if (Math.abs(rake.vis - rake.visTo) > 0.004 || Math.abs(rake.lift - rake.liftTo) > 0.05) busy = true
      render()
      if (busy) raf = requestAnimationFrame(frame)
    }
    const wake = () => {
      if (!raf && visible) {
        last = performance.now()
        raf = requestAnimationFrame(frame)
      }
    }
    opts.current.redraw = wake

    const startAuto = () => {
      if (!opts.current.autoRake || reduce) return
      autoTimer = window.setTimeout(() => {
        if (rake.down) return
        rake.x = -999
        rake.dx = 1
        rake.dy = 0
        const path = rsgClearPath(field, gw, gh, cell, w, h, (g * nt) / 2 + g)
        auto = { t0: performance.now() + 250, dur: Math.max(2600, Math.min(5200, w * 3.2)), y: path[0], amp: path[1], ph: 0 }
        travel(-0.12 * w, path[0], false)
        rake.run = 1e9
        rake.lift = 7
        wake()
      }, 700)
    }

    const resize = () => {
      const rect = root.getBoundingClientRect()
      const nw = Math.max(1, Math.round(rect.width))
      const nh = Math.max(1, Math.round(rect.height))
      const dpr = rsgScale(nw, nh, window.devicePixelRatio || 1, soft)
      canvas.width = Math.round(nw * dpr)
      canvas.height = Math.round(nh * dpr)
      const fits = nw <= builtW + 2 * g && nh <= builtH + 2 * g && nw >= builtW - 2 * g && nh >= builtH - 2 * g
      w = nw
      h = nh
      // ponytail: a big resize re-lays the garden and clears the strokes; resample the old field if that ever matters.
      if (!builtW || !fits) build()
      render()
    }

    const local = (e: PointerEvent) => {
      const b = canvas.getBoundingClientRect()
      return [e.clientX - b.left, e.clientY - b.top]
    }
    const onMove = (e: PointerEvent) => {
      if (!opts.current.interactive) return
      const p = local(e)
      if (hold && Math.hypot(p[0] - rake.fx, p[1] - rake.fy) > 10) {
        clearTimeout(hold)
        hold = 0
      }
      if (auto && !rake.down) return
      if (!rake.down && e.pointerType !== "mouse") return
      travel(p[0], p[1], rake.down)
      rake.visTo = 1
      wake()
    }
    const begin = (e: PointerEvent, p: number[]) => {
      hold = 0
      if (auto) {
        auto = null
        rake.x = -999
      }
      clearTimeout(autoTimer)
      if (e.pointerType !== "mouse" || rake.x < -900) {
        rake.x = -999
        travel(p[0], p[1], false)
      }
      rake.down = true
      rake.fresh = true
      rake.fx = p[0]
      rake.fy = p[1]
      rake.visTo = 1
      rake.liftTo = 0
      if (e.pointerType !== "mouse") rake.vis = 1
      try {
        root.setPointerCapture(e.pointerId)
      } catch (_) {
        // Capture is a nicety; raking still works without it.
      }
      wake()
    }
    const onDown = (e: PointerEvent) => {
      if (!opts.current.interactive || e.button > 0) return
      if ((e.target as HTMLElement).closest("a,button,input,textarea,select,[data-interactive]")) return
      const p = local(e)
      // On touch the page must still scroll: a finger rakes only after resting a moment.
      if (e.pointerType === "touch") {
        clearTimeout(hold)
        hold = window.setTimeout(() => begin(e, p), 250)
        rake.fx = p[0]
        rake.fy = p[1]
        return
      }
      begin(e, p)
    }
    // Once raking, a finger's moves are ours, not the page's scroll.
    const onTouchMove = (e: TouchEvent) => {
      if (rake.down) e.preventDefault()
    }
    const onUp = (e: PointerEvent) => {
      clearTimeout(hold)
      hold = 0
      if (!rake.down) return
      rake.down = false
      // The gravel the head was pushing is left where it lifts.
      if (!rake.fresh) mark(rsgBerm(field, gw, gh, cell, rake.x, rake.y, rake.dx, rake.dy, g, nt, depth))
      rake.liftTo = 7
      // A finger has no hover, so the rake goes away with it.
      if (e.pointerType !== "mouse") rake.visTo = 0
      wake()
    }
    const onLeave = () => {
      if (rake.down || auto) return
      rake.visTo = 0
      wake()
    }

    const lost = (ev: Event) => {
      ev.preventDefault()
      cancelAnimationFrame(raf)
      raf = 0
      setFailed(true)
    }
    canvas.addEventListener("webglcontextlost", lost)
    root.addEventListener("pointermove", onMove)
    root.addEventListener("pointerdown", onDown)
    root.addEventListener("pointerup", onUp)
    root.addEventListener("pointercancel", onUp)
    root.addEventListener("pointerleave", onLeave)
    root.addEventListener("touchmove", onTouchMove, { passive: false })
    const ro = new ResizeObserver(resize)
    ro.observe(root)
    const io = new IntersectionObserver((entries) => {
      visible = entries[0] ? entries[0].isIntersecting : true
      if (visible && !seen) {
        seen = true
        startAuto()
      }
      if (visible) wake()
    })
    io.observe(root)
    resize()

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(autoTimer)
      ro.disconnect()
      io.disconnect()
      opts.current.redraw = () => {}
      canvas.removeEventListener("webglcontextlost", lost)
      root.removeEventListener("pointermove", onMove)
      root.removeEventListener("pointerdown", onDown)
      root.removeEventListener("pointerup", onUp)
      root.removeEventListener("pointercancel", onUp)
      root.removeEventListener("pointerleave", onLeave)
      root.removeEventListener("touchmove", onTouchMove)
      clearTimeout(hold)
      gl.deleteTexture(tex)
      gl.deleteBuffer(quad)
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
    }
  }, [stones, seed, groove, nt])

  return (
    <div
      ref={rootRef}
      className={"rsg-root" + (night ? " rsg-night" : "") + (interactive && !failed ? " rsg-live" : "") + (className ? " " + className : "")}
      style={{ height, background: night ? "#151a24" : "#d6d0c2" }}
    >
      <style>{RSG_CSS}</style>
      {failed ? (
        <div className="rsg-fallback" role="img" aria-label={LABEL} />
      ) : (
        <canvas ref={canvasRef} role="img" aria-label={LABEL} />
      )}
      {children ? <div className="rsg-over">{children}</div> : null}
    </div>
  )
}
