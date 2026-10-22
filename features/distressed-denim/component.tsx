"use client"

// Distressed Denim — a hanging length of denim you can rip. The cloth is a real
// mesh: a few thousand points joined by threads, gathered at the top so it falls
// in soft vertical folds, pressed in wherever the pointer rests. Drag across it
// and the threads under the stroke break; the cut opens under its own weight,
// the flaps sag and curl to show the pale reverse, and the torn edge frays into
// the white weft that survives when the indigo warp snaps.
//
// One file, React only, WebGL1. No textures, no data, no audio. The weave is
// drawn per pixel (3/1 twill, slub, mottled dye take-up); the cloth only
// simulates while something is moving, then sleeps, and sleeps off-screen too.
// Without WebGL it falls back to a CSS twill so the page is never blank.

import * as React from "react"

export interface DenimPalette {
  /** Darkest indigo, in the fold shadows. */
  deep: string
  /** Body indigo. */
  indigo: string
  /** Faded, washed indigo on the highlights. */
  wash: string
  /** Undyed weft threads, fray and the reverse side. */
  weft: string
  /** What shows through a hole. */
  under: string
}

export type DenimPreset = "indigo" | "rinse" | "lightwash" | "black"

export interface DistressedDenimProps {
  /** Dye and wash. Defaults to "indigo". */
  preset?: DenimPreset
  /** Colour overrides, merged over the preset. */
  palette?: { deep?: string; indigo?: string; wash?: string; weft?: string; under?: string }
  /** Width of one warp thread in CSS px. Defaults to 2.4. */
  thread?: number
  /** How deep the drape folds are, 0–1. Defaults to 0.6. */
  folds?: number
  /** How washed out the fabric is, 0–1. Defaults to 0.55. */
  fade?: number
  /** Rips already torn when it first paints, clustered near the middle. Defaults to 0. */
  rips?: number
  /** Drag to rip, click to puncture, hover to press. Defaults to true. */
  interactive?: boolean
  /** Reshuffles the folds, the starting rips and the yarn. */
  seed?: number
  /** Content laid over the fabric. */
  children?: React.ReactNode
  /** Root height. A definite length, never a percentage. */
  height?: string
  className?: string
}

const PRESETS: { [K in DenimPreset]: DenimPalette } = {
  indigo: { deep: "#14234a", indigo: "#2f4f8f", wash: "#93abd6", weft: "#eef1f6", under: "#0c1018" },
  rinse: { deep: "#0b1530", indigo: "#1d3366", wash: "#5772a8", weft: "#e3e8f0", under: "#080b12" },
  lightwash: { deep: "#3e5c92", indigo: "#7391c4", wash: "#c3d1e8", weft: "#f6f8fb", under: "#1a1f2b" },
  black: { deep: "#0b0b0e", indigo: "#25262c", wash: "#62646d", weft: "#dcdcdf", under: "#050506" },
}

// #region denim
// Pure helpers, lifted out and executed by tests/distressed-denim.test.mjs.

/** Small seeded PRNG (mulberry32). */
export function ddmRandom(seed: number) {
  let a = (seed >>> 0) || 1
  return function () {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Hex → [r, g, b] in 0–1, or the fallback for anything that isn't #rgb / #rrggbb. */
export function ddmHex(hex: string, fallback: number[]) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((hex || "").trim())
  if (!m) return fallback
  const h = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1]
  return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255]
}

/** Distance from (px, py) to the segment (ax, ay)–(bx, by). */
export function ddmSegDist(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax
  const dy = by - ay
  const l2 = dx * dx + dy * dy
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0
  return Math.hypot(px - ax - dx * t, py - ay - dy * t)
}

/** Grid spacing (CSS px) so a w × h cloth with margins stays under `budget` points. */
export function ddmSpacing(w: number, h: number, budget: number) {
  return Math.max(7, Math.ceil(Math.sqrt(((w * 1.2 + 40) * (h * 1.3 + 40)) / budget)))
}

/** Starting rips: short, mostly horizontal slashes clustered round the middle, in 0–1 coordinates. */
export function ddmSlashes(count: number, seed: number) {
  const rand = ddmRandom(seed)
  const out = [] as number[][]
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2
    const r = Math.sqrt(rand()) * 0.27
    const cx = 0.5 + Math.cos(a) * r * 0.8
    const cy = 0.5 + Math.sin(a) * r
    const len = 0.018 + rand() * 0.03
    const tilt = (rand() - 0.5) * 0.7
    out.push([cx - Math.cos(tilt) * len, cy - Math.sin(tilt) * len, cx + Math.cos(tilt) * len, cy + Math.sin(tilt) * len])
  }
  return out
}
// #endregion

const VERT = `
attribute vec3 aPos;
attribute vec3 aNor;
attribute vec2 aUv;
attribute vec2 aFray;
uniform vec2 uRes;
varying vec3 vNor;
varying vec2 vUv;
varying vec2 vFray;
varying float vZ;
void main() {
  vNor = aNor;
  vUv = aUv;
  vFray = aFray;
  vZ = aPos.z;
  gl_Position = vec4(aPos.x / uRes.x * 2.0 - 1.0, 1.0 - aPos.y / uRes.y * 2.0, -aPos.z / 4000.0, 1.0);
}
`

const FRAG = `
precision highp float;
uniform float uThread;
uniform float uFade;
uniform float uSeed;
uniform float uAmp;
uniform vec2 uLight;
uniform vec3 uDeep;
uniform vec3 uIndigo;
uniform vec3 uWash;
uniform vec3 uWeft;
varying vec3 vNor;
varying vec2 vUv;
varying vec2 vFray;
varying float vZ;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }

void main() {
  vec2 p = vUv;
  float t = uThread;
  vec3 L = normalize(vec3(uLight, 0.75));
  float fray = vFray.x;
  float wear = vFray.y;

  // Torn edge: the indigo warp is gone, the white weft survives as loose
  // horizontal threads, and between them there is nothing.
  float row = floor(p.y / (t * 1.6));
  float inRow = fract(p.y / (t * 1.6));
  float weftLine = smoothstep(0.34, 0.12, abs(inRow - 0.5));
  // Each weft row gives out at its own distance from the hole, so the rim is ragged, never the mesh.
  float ragged = noise(vec2(p.x * 0.06, row * 0.9 + uSeed)) * 0.55 + noise(vec2(row * 2.3, p.x * 0.4)) * 0.25 + noise(p * 0.3) * 0.2;
  float gone = wear * 1.25 + fray * 0.9 - ragged * 0.75;
  float fringe = smoothstep(0.05, 0.4, gone);
  float loose = step(0.22, noise(vec2(row * 3.1 + uSeed, p.x * 0.03)));
  float strand = weftLine * loose;
  if (gone > 0.5 && strand < 0.5) discard;
  if (gone > 1.15) discard;

  // 3/1 twill: indigo warp floats over three weft, under one, shifted each row.
  vec2 c = vec2(p.x / t, p.y / (t * 0.9));
  vec2 cell = floor(c);
  vec2 f = fract(c);
  float warpOver = step(0.5, mod(cell.x - mod(cell.y, 4.0), 4.0));
  float slub = noise(vec2(cell.x * 1.7 + uSeed, p.y / (t * 16.0)));
  float heather = noise(p / t * vec2(0.9, 0.22) + uSeed * 3.0);
  float mottle = fbm(p / 90.0 + uSeed * 1.3);
  float washArea = smoothstep(0.38, 0.85, fbm(p / 420.0 + uSeed * 0.7));
  vec3 warp = mix(uDeep, uIndigo, 0.3 + 0.45 * slub + 0.5 * (mottle - 0.5));
  warp = mix(warp, uWash, clamp(uFade * (0.1 + 0.45 * heather + 0.6 * (mottle - 0.4) + 0.55 * washArea), 0.0, 0.85));
  vec3 weft = mix(uWeft, warp, 0.6);
  vec3 face = mix(weft * (0.85 + 0.15 * sin(f.y * 3.1416)), warp * (0.84 + 0.18 * sin(f.x * 3.1416)), warpOver);
  // Where a lip turns over, its underside sits in its own shadow.
  vec3 back = face * 0.55;

  vec3 n = normalize(vNor);
  vec3 col = face;
  if (!gl_FrontFacing) { n = -n; col = back; fringe = 0.0; }

  // Worn halo round a tear, then the fringe itself.
  col = mix(col, mix(uWash, uWeft, 0.35), clamp(wear * 1.6, 0.0, 0.75) * (0.5 + 0.5 * noise(p * 0.08)));
  float fuzz = noise(p * 0.9) * noise(p * 0.23 + 7.0);
  col = mix(col, uWeft * (0.78 + 0.22 * fuzz), clamp(fringe * (0.45 + 0.5 * fuzz), 0.0, 1.0));
  col = mix(col, uWeft * (0.85 + 0.15 * noise(p * 0.5)), smoothstep(0.4, 0.55, gone) * strand);

  // Soft cloth light: wrapped diffuse, darker deep in the folds, a velvet sheen
  // where the surface turns away, and a gentle highlight on the crests.
  float diff = clamp((dot(n, L) + 0.45) / 1.45, 0.0, 1.0);
  float ao = clamp(0.78 + vZ / (uAmp * 2.6 + 1.0), 0.45, 1.12);
  float sheen = pow(1.0 - clamp(n.z, 0.0, 1.0), 2.5);
  float spec = pow(clamp(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 14.0);
  col *= (0.2 + 0.95 * diff * diff) * ao;
  col += uWash * (sheen * 0.22 + spec * 0.1);
  col += (hash(p + uSeed) - 0.5) * 0.03;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`

const DDM_CSS = `
.ddm-root { position: relative; width: 100%; overflow: hidden; isolation: isolate; touch-action: pan-y; }
.ddm-root canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; max-width: none; }
.ddm-fallback {
  position: absolute; inset: 0;
  background:
    repeating-linear-gradient(63deg, rgba(255,255,255,0.08) 0 1px, transparent 1px 4px),
    radial-gradient(120% 90% at 50% 40%, var(--ddm-wash), var(--ddm-indigo) 55%, var(--ddm-deep));
}
.ddm-over { position: relative; z-index: 1; height: 100%; pointer-events: none; }
.ddm-over a, .ddm-over button, .ddm-over [data-interactive] { pointer-events: auto; }
`

export default function DistressedDenim({
  preset = "indigo",
  palette,
  thread = 2.4,
  folds = 0.6,
  fade = 0.55,
  rips = 0,
  interactive = true,
  seed = 7,
  children,
  height = "100svh",
  className = "",
}: DistressedDenimProps) {
  const colors = { ...(PRESETS[preset] || PRESETS.indigo), ...(palette || {}) }
  const rootRef = React.useRef(null as HTMLDivElement | null)
  const canvasRef = React.useRef(null as HTMLCanvasElement | null)
  const [failed, setFailed] = React.useState(false)
  const opts = React.useRef({ thread, fade, interactive })
  opts.current = { thread, fade, interactive }
  const key = [colors.deep, colors.indigo, colors.wash, colors.weft, colors.under, rips, seed, folds].join("|")

  React.useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    if (!root || !canvas) return
    const gl = canvas.getContext("webgl", { antialias: true, alpha: false })
    if (!gl) {
      setFailed(true)
      return
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)
      if (!s) return null
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null
    }
    const vs = compile(gl.VERTEX_SHADER, VERT)
    const fs = compile(gl.FRAGMENT_SHADER, FRAG)
    const program = gl.createProgram()
    if (!vs || !fs || !program) {
      setFailed(true)
      return
    }
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      setFailed(true)
      return
    }
    gl.useProgram(program)
    const U = {} as { [k: string]: WebGLUniformLocation | null }
    for (const name of ["uRes", "uThread", "uFade", "uSeed", "uAmp", "uLight", "uDeep", "uIndigo", "uWash", "uWeft"]) {
      U[name] = gl.getUniformLocation(program, name)
    }
    const fallback = [0.1, 0.15, 0.3]
    gl.uniform3fv(U.uDeep, ddmHex(colors.deep, fallback))
    gl.uniform3fv(U.uIndigo, ddmHex(colors.indigo, fallback))
    gl.uniform3fv(U.uWash, ddmHex(colors.wash, fallback))
    gl.uniform3fv(U.uWeft, ddmHex(colors.weft, [0.9, 0.92, 0.95]))
    gl.uniform1f(U.uSeed, (seed % 97) * 0.37)
    const under = ddmHex(colors.under, [0.05, 0.06, 0.08])
    gl.clearColor(under[0], under[1], under[2], 1)
    gl.enable(gl.DEPTH_TEST)
    gl.frontFace(gl.CW)

    const buf = {
      pos: gl.createBuffer(),
      nor: gl.createBuffer(),
      uv: gl.createBuffer(),
      fray: gl.createBuffer(),
      idx: gl.createBuffer(),
    }
    const attr = (name: string, b: WebGLBuffer | null, size: number) => {
      const loc = gl.getAttribLocation(program, name)
      gl.bindBuffer(gl.ARRAY_BUFFER, b)
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0)
    }
    attr("aPos", buf.pos, 3)
    attr("aNor", buf.nor, 3)
    attr("aUv", buf.uv, 2)
    attr("aFray", buf.fray, 2)

    // ---- the cloth --------------------------------------------------------
    let w = 1
    let h = 1
    let nx = 0
    let ny = 0
    let s = 10
    let amp = 0
    let pos = new Float32Array(0)
    let prev = new Float32Array(0)
    let home = new Float32Array(0) // rest depth of each point, so a press springs back
    let nor = new Float32Array(0)
    let fray = new Float32Array(0)
    let pinned = new Uint8Array(0)
    let cA = new Int32Array(0)
    let cB = new Int32Array(0)
    let cR = new Float32Array(0)
    let alive = new Uint8Array(0)
    let offV = 0
    let offD = 0
    let tris = 0
    let topo = true
    const rand = ddmRandom(seed * 31 + 5)
    const pointer = { x: 0, y: 0, on: false }
    let drag = null as null | { x: number; y: number; moved: boolean }
    let still = 0
    let raf = 0
    let visible = true

    const build = () => {
      s = ddmSpacing(w, h, 14000)
      const mx = w * 0.1 + 2 * s
      const top = -2 * s
      nx = Math.ceil((w + 2 * mx) / s) + 1
      ny = Math.ceil((h * 1.25 - top) / s) + 1
      const n = nx * ny
      amp = Math.max(0, Math.min(1, folds)) * Math.min(150, w * 0.085 + 24)
      pos = new Float32Array(n * 3)
      prev = new Float32Array(n * 3)
      home = new Float32Array(n)
      nor = new Float32Array(n * 3)
      fray = new Float32Array(n * 2)
      pinned = new Uint8Array(n)
      const uv = new Float32Array(n * 2)
      const k = (seed % 97) * 0.61
      // Gathered at the top: each column has a fold depth that drifts as it falls.
      const fold = (x: number, y: number) =>
        amp *
        (0.62 * Math.sin(x / 120 + k + Math.sin(y / 420 + k) * 0.6) +
          0.3 * Math.sin(x / 47 + k * 2 + y / 700) +
          0.14 * Math.sin(x / 19 + k * 3 + Math.sin(y / 160) * 1.5))
      for (let j = 0; j < ny; j++) {
        let u = 0
        for (let i = 0; i < nx; i++) {
          const p = j * nx + i
          const x = -mx + i * s
          const y = top + j * s
          const z = fold(x, y)
          if (i > 0) {
            const q = (p - 1) * 3
            u += Math.hypot(x - pos[q], z - pos[q + 2])
          }
          pos[p * 3] = prev[p * 3] = x
          pos[p * 3 + 1] = prev[p * 3 + 1] = y
          pos[p * 3 + 2] = prev[p * 3 + 2] = z
          home[p] = z
          uv[p * 2] = u
          uv[p * 2 + 1] = j * s
          pinned[p] = j === 0 || j === ny - 1 ? 1 : 0
        }
      }
      // Threads: verticals first (top-down, so the hang converges), then horizontals, then one diagonal per cell.
      const nc = nx * (ny - 1) + (nx - 1) * ny + (nx - 1) * (ny - 1)
      cA = new Int32Array(nc)
      cB = new Int32Array(nc)
      cR = new Float32Array(nc)
      alive = new Uint8Array(nc).fill(1)
      let c = 0
      const link = (a: number, b: number) => {
        cA[c] = a
        cB[c] = b
        cR[c] = Math.hypot(pos[a * 3] - pos[b * 3], pos[a * 3 + 1] - pos[b * 3 + 1], pos[a * 3 + 2] - pos[b * 3 + 2])
        c++
      }
      for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx; i++) link(j * nx + i, (j + 1) * nx + i)
      offV = 0
      const offH = c
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx - 1; i++) link(j * nx + i, j * nx + i + 1)
      offD = c
      for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) link(j * nx + i, (j + 1) * nx + i + 1)
      hOff = offH
      gl.bindBuffer(gl.ARRAY_BUFFER, buf.uv)
      gl.bufferData(gl.ARRAY_BUFFER, uv, gl.STATIC_DRAW)
      gl.bindBuffer(gl.ARRAY_BUFFER, buf.pos)
      gl.bufferData(gl.ARRAY_BUFFER, pos, gl.DYNAMIC_DRAW)
      gl.bindBuffer(gl.ARRAY_BUFFER, buf.nor)
      gl.bufferData(gl.ARRAY_BUFFER, nor, gl.DYNAMIC_DRAW)
      gl.bindBuffer(gl.ARRAY_BUFFER, buf.fray)
      gl.bufferData(gl.ARRAY_BUFFER, fray, gl.DYNAMIC_DRAW)
      topo = true
    }
    let hOff = 0
    const vIdx = (i: number, j: number) => offV + j * nx + i
    const hIdx = (i: number, j: number) => hOff + j * (nx - 1) + i
    const dIdx = (i: number, j: number) => offD + j * (nx - 1) + i

    // Break every thread whose midpoint lies within r of the stroke, and pull the lips apart.
    const cut = (ax: number, ay: number, bx: number, by: number, r: number) => {
      let any = false
      const sl = Math.hypot(bx - ax, by - ay)
      const weftBreak = sl > 0 ? 0.2 + 0.75 * Math.abs(by - ay) / sl : 0.45
      for (let c = 0; c < alive.length; c++) {
        if (!alive[c]) continue
        const a = cA[c] * 3
        const b = cB[c] * 3
        if (pinned[cA[c]] && pinned[cB[c]]) continue
        const weft = c >= hOff && c < offD
        // The indigo warp (and the diagonal) snaps across a wide band; the white weft
        // only near the stroke, and mostly survives, strung across the gap.
        if (ddmSegDist((pos[a] + pos[b]) / 2, (pos[a + 1] + pos[b + 1]) / 2, ax, ay, bx, by) < (weft ? r : r * 1.6)) {
          if (weft && rand() > weftBreak) continue
          alive[c] = 0
          any = true
        }
      }
      if (!any) return
      const dx = bx - ax
      const dy = by - ay
      const len = Math.hypot(dx, dy) || 1
      const px = -dy / len
      const py = dx / len
      for (let p = 0; p < nx * ny; p++) {
        if (pinned[p]) continue
        const q = p * 3
        const d = ddmSegDist(pos[q], pos[q + 1], ax, ay, bx, by)
        if (d > r * 2.4) continue
        const side = (pos[q] - ax) * px + (pos[q + 1] - ay) * py
        const sign = len > 1 ? (side < 0 ? -1 : 1) : 0
        const rx = len > 1 ? px * sign : pos[q] - ax
        const ry = len > 1 ? py * sign : pos[q + 1] - ay
        const rl = Math.hypot(rx, ry) || 1
        const f = (1 - d / (r * 2.4)) * 1.6
        // Nudge the lips apart, in the plane of the cloth.
        prev[q] -= (rx / rl) * f
        prev[q + 1] -= (ry / rl) * f
      }
      topo = true
      still = 0
    }

    const step = () => {
      const n = nx * ny
      const g = 0.025
      const press = pointer.on && !reduced
      const R = Math.max(70, s * 7)
      let moving = 0
      for (let p = 0; p < n; p++) {
        if (pinned[p]) continue
        const q = p * 3
        const vx = (pos[q] - prev[q]) * 0.985
        const vy = (pos[q + 1] - prev[q + 1]) * 0.985
        const vz = (pos[q + 2] - prev[q + 2]) * 0.985
        prev[q] = pos[q]
        prev[q + 1] = pos[q + 1]
        prev[q + 2] = pos[q + 2]
        pos[q] += vx
        pos[q + 1] += vy + g
        pos[q + 2] += vz + (home[p] - pos[q + 2]) * 0.004
        if (press) {
          // The pointer is a fingertip resting on the cloth: it dents it, and the folds give round it.
          const dx = pos[q] - pointer.x
          const dy = pos[q + 1] - pointer.y
          const d2 = dx * dx + dy * dy
          if (d2 < R * R) {
            const fall = 1 - Math.sqrt(d2) / R
            const target = home[p] - fall * fall * (amp * 0.9 + 18)
            if (pos[q + 2] > target) pos[q + 2] += (target - pos[q + 2]) * 0.18
          }
        }
        const m = Math.abs(vx) + Math.abs(vy) + Math.abs(vz)
        if (m > moving) moving = m
      }
      for (let it = 0; it < 12; it++) {
        for (let c = 0; c < alive.length; c++) {
          if (!alive[c]) continue
          const a = cA[c]
          const b = cB[c]
          const ia = a * 3
          const ib = b * 3
          const dx = pos[ib] - pos[ia]
          const dy = pos[ib + 1] - pos[ia + 1]
          const dz = pos[ib + 2] - pos[ia + 2]
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6
          const r = cR[c]
          const wa = pinned[a] ? 0 : 1
          const wb = pinned[b] ? 0 : 1
          const ws = wa + wb
          if (!ws) continue
          const k = (d - r) / d / ws
          pos[ia] += dx * k * wa
          pos[ia + 1] += dy * k * wa
          pos[ia + 2] += dz * k * wa
          pos[ib] -= dx * k * wb
          pos[ib + 1] -= dy * k * wb
          pos[ib + 2] -= dz * k * wb
        }
      }
      return moving
    }

    const normals = () => {
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          const l = (j * nx + Math.max(0, i - 1)) * 3
          const r = (j * nx + Math.min(nx - 1, i + 1)) * 3
          const u = (Math.max(0, j - 1) * nx + i) * 3
          const d = (Math.min(ny - 1, j + 1) * nx + i) * 3
          const ax = pos[r] - pos[l]
          const ay = pos[r + 1] - pos[l + 1]
          const az = pos[r + 2] - pos[l + 2]
          const bx = pos[d] - pos[u]
          const by = pos[d + 1] - pos[u + 1]
          const bz = pos[d + 2] - pos[u + 2]
          const x = ay * bz - az * by
          const y = az * bx - ax * bz
          const z = ax * by - ay * bx
          const len = Math.hypot(x, y, z) || 1
          const q = (j * nx + i) * 3
          nor[q] = x / len
          nor[q + 1] = y / len
          nor[q + 2] = z / len
        }
      }
    }

    // After a tear: which triangles still have all three threads, and how frayed each point is.
    const retopo = () => {
      const index = new Uint16Array((nx - 1) * (ny - 1) * 6)
      tris = 0
      for (let j = 0; j < ny - 1; j++) {
        for (let i = 0; i < nx - 1; i++) {
          const a = j * nx + i
          const dg = alive[dIdx(i, j)]
          if (dg && alive[hIdx(i, j)] && alive[vIdx(i + 1, j)]) {
            index[tris++] = a
            index[tris++] = a + 1
            index[tris++] = a + nx + 1
          }
          if (dg && alive[vIdx(i, j)] && alive[hIdx(i, j + 1)]) {
            index[tris++] = a
            index[tris++] = a + nx + 1
            index[tris++] = a + nx
          }
        }
      }
      const n = nx * ny
      const deg = new Float32Array(n)
      const broke = new Float32Array(n)
      for (let c = 0; c < alive.length; c++) {
        deg[cA[c]]++
        deg[cB[c]]++
        if (!alive[c]) {
          broke[cA[c]]++
          broke[cB[c]]++
        }
      }
      const sharp = new Float32Array(n)
      for (let p = 0; p < n; p++) sharp[p] = Math.min(1, (broke[p] / (deg[p] || 1)) * 2.2)
      // Wear spreads a few threads out from the edge.
      let wear = sharp
      for (let pass = 0; pass < 3; pass++) {
        const out = new Float32Array(n)
        for (let j = 0; j < ny; j++) {
          for (let i = 0; i < nx; i++) {
            const p = j * nx + i
            let sum = wear[p] * 2
            let cnt = 2
            if (i > 0) { sum += wear[p - 1]; cnt++ }
            if (i < nx - 1) { sum += wear[p + 1]; cnt++ }
            if (j > 0) { sum += wear[p - nx]; cnt++ }
            if (j < ny - 1) { sum += wear[p + nx]; cnt++ }
            out[p] = Math.max(wear[p], (sum / cnt) * 1.15)
          }
        }
        wear = out
      }
      for (let p = 0; p < n; p++) {
        fray[p * 2] = sharp[p]
        fray[p * 2 + 1] = wear[p]
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, buf.fray)
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, fray)
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf.idx)
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, index.subarray(0, tris), gl.DYNAMIC_DRAW)
      topo = false
    }

    const render = () => {
      if (topo) retopo()
      normals()
      const o = opts.current
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      gl.uniform2f(U.uRes, w, h)
      gl.uniform1f(U.uThread, Math.max(1.5, Math.min(10, o.thread)))
      gl.uniform1f(U.uFade, Math.max(0, Math.min(1, o.fade)))
      gl.uniform1f(U.uAmp, amp)
      const lx = pointer.on ? (pointer.x / w - 0.5) * 0.5 : 0
      gl.uniform2f(U.uLight, -0.7 + lx, -0.55)
      gl.bindBuffer(gl.ARRAY_BUFFER, buf.pos)
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, pos)
      gl.bindBuffer(gl.ARRAY_BUFFER, buf.nor)
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, nor)
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf.idx)
      gl.drawElements(gl.TRIANGLES, tris, gl.UNSIGNED_SHORT, 0)
    }

    // Simulate only while the cloth is moving; once it settles the canvas holds its frame.
    const frame = () => {
      raf = 0
      if (!visible) return
      const moving = Math.max(step(), step())
      render()
      still = moving < 0.03 && !pointer.on ? still + 1 : 0
      if (still < 40) raf = requestAnimationFrame(frame)
    }
    function wake() {
      still = 0
      if (!raf && visible) raf = requestAnimationFrame(frame)
    }

    const resize = () => {
      const rect = root.getBoundingClientRect()
      const nw = Math.max(1, Math.round(rect.width))
      const nh = Math.max(1, Math.round(rect.height))
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(nw * dpr)
      canvas.height = Math.round(nh * dpr)
      if (nw === w && nh === h) return render()
      // ponytail: a resize re-hangs the cloth, so earlier rips are lost; keep them if anyone resizes mid-rip.
      w = nw
      h = nh
      build()
      if (rips > 0) {
        for (const sl of ddmSlashes(Math.min(24, rips), seed)) cut(sl[0] * w, sl[1] * h, sl[2] * w, sl[3] * h, s * 0.75)
        // Let the starting rips fall open before the first paint.
        for (let i = 0; i < 160; i++) step()
      }
      render()
      wake()
    }

    const local = (e: PointerEvent) => {
      const b = canvas.getBoundingClientRect()
      return [e.clientX - b.left, e.clientY - b.top]
    }
    const onMove = (e: PointerEvent) => {
      const p = local(e)
      pointer.x = p[0]
      pointer.y = p[1]
      pointer.on = true
      if (drag && opts.current.interactive) {
        if (Math.hypot(p[0] - drag.x, p[1] - drag.y) > s * 0.5) {
          cut(drag.x, drag.y, p[0], p[1], s * 0.75)
          drag = { x: p[0], y: p[1], moved: true }
        }
      }
      wake()
    }
    const onDown = (e: PointerEvent) => {
      if (!opts.current.interactive) return
      if ((e.target as HTMLElement).closest("a,button,input,textarea,select,[data-interactive]")) return
      const p = local(e)
      drag = { x: p[0], y: p[1], moved: false }
      wake()
    }
    const onUp = () => {
      // A click that never dragged punches a small hole.
      if (drag && !drag.moved) cut(drag.x, drag.y, drag.x, drag.y, s * 1.4)
      drag = null
      wake()
    }
    const onLeave = () => {
      drag = null
      pointer.on = false
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
    window.addEventListener("pointerup", onUp)
    root.addEventListener("pointerleave", onLeave)
    const ro = new ResizeObserver(resize)
    ro.observe(root)
    const io = new IntersectionObserver((entries) => {
      visible = entries[0] ? entries[0].isIntersecting : true
      if (visible) wake()
    })
    io.observe(root)
    resize()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      canvas.removeEventListener("webglcontextlost", lost)
      root.removeEventListener("pointermove", onMove)
      root.removeEventListener("pointerdown", onDown)
      window.removeEventListener("pointerup", onUp)
      root.removeEventListener("pointerleave", onLeave)
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      for (const b of Object.values(buf)) gl.deleteBuffer(b)
    }
  }, [key])

  return (
    <div
      ref={rootRef}
      className={"ddm-root " + className}
      style={
        {
          height,
          background: colors.under,
          "--ddm-deep": colors.deep,
          "--ddm-indigo": colors.indigo,
          "--ddm-wash": colors.wash,
        } as React.CSSProperties
      }
      role="img"
      aria-label="Hanging denim. Drag across it to rip it, click to puncture it."
    >
      <style>{DDM_CSS}</style>
      {failed ? <div className="ddm-fallback" aria-hidden="true" /> : <canvas ref={canvasRef} aria-hidden="true" />}
      {children ? <div className="ddm-over">{children}</div> : null}
    </div>
  )
}
