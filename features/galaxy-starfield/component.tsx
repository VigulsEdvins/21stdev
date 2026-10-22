"use client"

// Galaxy Starfield — a full-bleed hero background: you sit inside a sphere of
// tens of thousands of stars, each one twinkling on its own clock and flaring
// into a four-point diffraction cross when it peaks, against a slow nebula
// that drifts in violet and teal with a dusty band across the equator. The
// universe leans toward the pointer, turns by itself, and can be dragged round
// like a planetarium dome. On load the camera warps in from deep space.
//
// One file, React only, raw WebGL: no three.js, no textures, no network. It
// sleeps off-screen, holds a still frame for reduced motion, thins itself out
// on software renderers, and falls back to a CSS sky without WebGL.

import * as React from "react"

export type StarfieldPreset = "prism" | "aurora" | "ember" | "ice"

export interface StarfieldNebula {
  /** Deep space behind everything. */
  base: string
  /** First nebula cloud. */
  a: string
  /** Second nebula cloud. */
  b: string
  /** The dusty band across the equator. */
  band: string
}

export interface GalaxyStarfieldProps {
  /** Star and nebula colours. Defaults to "ember". */
  preset?: StarfieldPreset
  /** Star colours, overriding the preset's. */
  colors?: string[]
  /** Nebula colours, merged over the preset's. */
  nebula?: { base?: string; a?: string; b?: string; band?: string }
  /** How many stars. Defaults to 65000 (fewer on software renderers). */
  stars?: number
  /** Twinkle speed multiplier. Defaults to 1. */
  twinkle?: number
  /** Auto-rotation, in turns per minute. 0 stops it. Defaults to 0.4. */
  autoRotate?: number
  /** Drag to orbit and lean toward the pointer. Defaults to true. */
  interactive?: boolean
  /** Wheel or pinch to zoom. Off by default so the page still scrolls. */
  zoom?: boolean
  /** Warp in from deep space on load. Defaults to true. */
  intro?: boolean
  /** Reshuffles the stars. */
  seed?: number
  /** Content laid over the sky. */
  children?: React.ReactNode
  /** Root height. A definite length, never a percentage. */
  height?: string
  className?: string
}

const PRESETS: { [k: string]: { colors: string[]; nebula: StarfieldNebula } } = {
  prism: {
    colors: ["#ff1e4a", "#23ff4b", "#2a6fff", "#ffd900", "#ff00ea", "#00ffea", "#ffffff", "#ff8800"],
    nebula: { base: "#010004", a: "#260540", b: "#051f40", band: "#1a140d" },
  },
  aurora: {
    colors: ["#5effc1", "#2dd4bf", "#a7f3d0", "#7dd3fc", "#ffffff", "#c4b5fd", "#34d399"],
    nebula: { base: "#000306", a: "#03261f", b: "#062033", band: "#0b1a14" },
  },
  ember: {
    colors: ["#ffb347", "#ff6b3d", "#ffd27a", "#ff3d6e", "#ffffff", "#ffe4b5", "#ff8c42"],
    nebula: { base: "#040100", a: "#3a0d06", b: "#2a1404", band: "#1f140a" },
  },
  ice: {
    colors: ["#ffffff", "#cfe6ff", "#9cc7ff", "#e0f2fe", "#a5b4fc", "#bae6fd"],
    nebula: { base: "#00010a", a: "#0a1438", b: "#04223a", band: "#10131c" },
  },
}

// #region starfield
// Pure helpers, lifted out and executed by tests/galaxy-starfield.test.mjs.

/** Small seeded PRNG (mulberry32). */
export function gsfRandom(seed: number) {
  let a = (seed >>> 0) || 1
  return function () {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Hex → linear [r, g, b] (sRGB decoded), or the fallback for anything that isn't #rgb / #rrggbb. */
export function gsfLinear(hex: string, fallback: number[]) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((hex || "").trim())
  if (!m) return fallback
  const h = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1]
  const out = [] as number[]
  for (let i = 0; i < 3; i++) {
    const c = parseInt(h.slice(i * 2, i * 2 + 2), 16) / 255
    out.push(c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
  }
  return out
}

/**
 * The sky: `count` stars uniformly filling a ball of `radius`. Interleaved per star:
 * x, y, z, r, g, b, size, phase, speed. Sizes are mostly tiny, a few are bright.
 */
export function gsfStars(count: number, radius: number, palette: number[][], seed: number) {
  const rand = gsfRandom(seed)
  const out = new Float32Array(count * 9)
  const n = Math.max(1, palette.length)
  for (let i = 0; i < count; i++) {
    const r = radius * Math.cbrt(rand())
    const theta = rand() * Math.PI * 2
    const phi = Math.acos(2 * rand() - 1)
    const c = palette[Math.floor(rand() * n) % n] || [1, 1, 1]
    const w = rand() * 0.2
    const o = i * 9
    out[o] = r * Math.sin(phi) * Math.cos(theta)
    out[o + 1] = r * Math.sin(phi) * Math.sin(theta)
    out[o + 2] = r * Math.cos(phi)
    out[o + 3] = c[0] + (1 - c[0]) * w
    out[o + 4] = c[1] + (1 - c[1]) * w
    out[o + 5] = c[2] + (1 - c[2]) * w
    out[o + 6] = Math.pow(rand(), 7) * 20 + 1
    out[o + 7] = rand() * Math.PI * 2
    out[o + 8] = rand() * 4 + 0.5
  }
  return out
}

/** Column-major perspective projection. */
export function gsfPerspective(fovY: number, aspect: number, near: number, far: number) {
  const f = 1 / Math.tan(fovY / 2)
  const nf = 1 / (near - far)
  return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]
}

/** Where the camera sits orbiting the origin at `dist`, from yaw and pitch (radians). */
export function gsfOrbit(yaw: number, pitch: number, dist: number) {
  const cp = Math.cos(pitch)
  return [dist * Math.sin(yaw) * cp, dist * Math.sin(pitch), dist * Math.cos(yaw) * cp]
}

/** Column-major view matrix looking from `eye` at the origin, y up. Also returns the camera basis. */
export function gsfLookAt(eye: number[]) {
  const zl = Math.hypot(eye[0], eye[1], eye[2]) || 1
  const z = [eye[0] / zl, eye[1] / zl, eye[2] / zl]
  let x = [z[2], 0, -z[0]] // up × z with up = (0, 1, 0)
  const xl = Math.hypot(x[0], x[1], x[2]) || 1
  x = [x[0] / xl, x[1] / xl, x[2] / xl]
  const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]]
  const dot = (a: number[]) => a[0] * eye[0] + a[1] * eye[1] + a[2] * eye[2]
  const view = [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x), -dot(y), -dot(z), 1]
  return { view, x, y, z }
}

/** Column-major rotation about x then y (the universe leaning toward the pointer). */
export function gsfLean(rx: number, ry: number) {
  const cx = Math.cos(rx)
  const sx = Math.sin(rx)
  const cy = Math.cos(ry)
  const sy = Math.sin(ry)
  // R = Rx · Ry
  return [cy, sx * sy, -cx * sy, 0, 0, cx, sx, 0, sy, -sx * cy, cx * cy, 0, 0, 0, 0, 1]
}

/** Hex → display [r, g, b] in 0–1, or the fallback. The nebula is authored in these. */
export function gsfHex(hex: string, fallback: number[]) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((hex || "").trim())
  if (!m) return fallback
  const h = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1]
  return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255]
}

/** Ease-out cubic, clamped. */
export function gsfEase(t: number) {
  const k = Math.max(0, Math.min(1, t))
  return 1 - Math.pow(1 - k, 3)
}
// #endregion

const QUAD_VS = `
attribute vec2 aPos;
varying vec2 vNdc;
void main() { vNdc = aPos; gl_Position = vec4(aPos, 0.0, 1.0); }
`

// The nebula is a sphere at infinity: each pixel's view ray, turned into the universe's
// frame, samples 3D noise, so there is no seam and no pinch at the poles.
const SKY_FS = `
precision highp float;
uniform float uTime;
uniform float uTan;
uniform float uAspect;
uniform vec3 uRight;
uniform vec3 uUp;
uniform vec3 uBack;
uniform mat3 uLeanT;
uniform vec3 uBase;
uniform vec3 uA;
uniform vec3 uB;
uniform vec3 uBand;
uniform float uFade;
varying vec2 vNdc;

float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; } return v; }

void main() {
  vec3 ray = normalize(-uBack + vNdc.x * uTan * uAspect * uRight + vNdc.y * uTan * uUp);
  vec3 d = uLeanT * ray;
  float t = uTime * 0.02;
  float equator = smoothstep(0.4, 0.0, abs(asin(clamp(d.y, -1.0, 1.0))) / 3.14159265);
  float n1 = fbm(d * 3.0 + vec3(t, t, 0.0));
  float n2 = fbm(d * 5.0 - vec3(t * 1.2, t * 0.8, 0.0) + n1);
  vec3 col = uBase;
  col += uA * n1 * (0.4 + 0.6 * equator);
  col += uB * n2 * (0.4 + 0.4 * equator);
  col += uBand * equator * (n1 * n2) * 2.0;
  gl_FragColor = vec4(col * uFade, 1.0);
}
`

const STAR_VS = `
attribute vec3 aPos;
attribute vec3 aColor;
attribute float aSize;
attribute float aPhase;
attribute float aSpeed;
uniform mat4 uProj;
uniform mat4 uView;
uniform mat4 uLean;
uniform float uTime;
uniform float uDpr;
uniform float uMaxPt;
varying vec3 vColor;
varying float vTwinkle;
void main() {
  vColor = aColor;
  float wave = sin(uTime * aSpeed + aPhase) * 0.5 + 0.5;
  vTwinkle = 0.15 + wave * 0.3 + pow(wave, 10.0) * 2.5;
  vec4 mv = uView * uLean * vec4(aPos, 1.0);
  gl_Position = uProj * mv;
  gl_PointSize = min(aSize * uDpr * (600.0 / max(length(mv.xyz), 1.0)) * vTwinkle, uMaxPt);
}
`

// Each star: a hot core, a soft halo and a four-point diffraction cross.
const STAR_FS = `
precision mediump float;
uniform float uFade;
varying vec3 vColor;
varying float vTwinkle;
void main() {
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float d = length(uv);
  float rays = (exp(-abs(uv.x) * 30.0) * exp(-abs(uv.y)) + exp(-abs(uv.y) * 30.0) * exp(-abs(uv.x))) * 0.8;
  float core = exp(-d * 15.0);
  float a = (rays + core + exp(-d * 4.0) * 0.5) * smoothstep(1.0, 0.1, d);
  if (a < 0.02) discard;
  gl_FragColor = vec4(mix(vColor, vec3(1.0), core * 0.9), a * min(vTwinkle, 2.5) * uFade);
}
`

const GSF_CSS = `
.gsf-root { position: relative; width: 100%; overflow: hidden; isolation: isolate; background: #000; touch-action: pan-y; }
.gsf-root canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; max-width: none; }
.gsf-root[data-orbit="true"] canvas { cursor: grab; }
.gsf-root[data-orbit="true"][data-dragging="true"] canvas { cursor: grabbing; }
.gsf-fallback {
  position: absolute; inset: 0;
  background:
    radial-gradient(1px 1px at 20% 30%, #fff 50%, transparent 51%),
    radial-gradient(1px 1px at 70% 60%, #fff 50%, transparent 51%),
    radial-gradient(1.5px 1.5px at 45% 80%, #fff 50%, transparent 51%),
    radial-gradient(1px 1px at 85% 15%, #fff 50%, transparent 51%),
    radial-gradient(120% 60% at 50% 50%, var(--gsf-a), var(--gsf-base) 70%);
}
.gsf-over { position: relative; z-index: 1; height: 100%; pointer-events: none; }
.gsf-over a, .gsf-over button, .gsf-over input, .gsf-over select, .gsf-over textarea, .gsf-over [data-interactive] { pointer-events: auto; }
`

export default function GalaxyStarfield({
  preset = "ember",
  colors,
  nebula,
  stars = 65000,
  twinkle = 1,
  autoRotate = 0.4,
  interactive = true,
  zoom = false,
  intro = true,
  seed = 7,
  children,
  height = "100svh",
  className = "",
}: GalaxyStarfieldProps) {
  const base = PRESETS[preset] || PRESETS.ember
  const palette = colors && colors.length ? colors : base.colors
  const sky = { ...base.nebula, ...(nebula || {}) }
  const rootRef = React.useRef(null as HTMLDivElement | null)
  const canvasRef = React.useRef(null as HTMLCanvasElement | null)
  const [failed, setFailed] = React.useState(false)
  const [dragging, setDragging] = React.useState(false)
  const live = React.useRef({ twinkle, autoRotate, interactive, zoom })
  live.current = { twinkle, autoRotate, interactive, zoom }
  const geometryKey = [palette.join(","), stars, seed].join("|")
  const skyKey = [sky.base, sky.a, sky.b, sky.band].join("|")
  const skyRef = React.useRef(sky)
  skyRef.current = sky

  React.useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    if (!root || !canvas) return
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, premultipliedAlpha: false })
    if (!gl) {
      setFailed(true)
      return
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const info = gl.getExtension("WEBGL_debug_renderer_info")
    const soft = !!info && /swiftshader|llvmpipe|software|basic render/i.test(String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)))

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)
      if (!s) return null
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null
    }
    const link = (vsSrc: string, fsSrc: string) => {
      const vs = compile(gl.VERTEX_SHADER, vsSrc)
      const fs = compile(gl.FRAGMENT_SHADER, fsSrc)
      const p = gl.createProgram()
      if (!vs || !fs || !p) return null
      gl.attachShader(p, vs)
      gl.attachShader(p, fs)
      gl.linkProgram(p)
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null
      return { p, vs, fs }
    }
    const skyProg = link(QUAD_VS, SKY_FS)
    const starProg = link(STAR_VS, STAR_FS)
    if (!skyProg || !starProg) {
      setFailed(true)
      return
    }
    const uni = (p: WebGLProgram, names: string[]) => {
      const out = {} as { [k: string]: WebGLUniformLocation | null }
      for (const n of names) out[n] = gl.getUniformLocation(p, n)
      return out
    }
    const SU = uni(skyProg.p, ["uTime", "uTan", "uAspect", "uRight", "uUp", "uBack", "uLeanT", "uBase", "uA", "uB", "uBand", "uFade"])
    const TU = uni(starProg.p, ["uProj", "uView", "uLean", "uTime", "uDpr", "uMaxPt", "uFade"])

    // Geometry: one full-screen triangle for the sky, one interleaved buffer for the stars.
    const quad = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, quad)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const count = Math.max(1, Math.min(soft ? 18000 : 120000, Math.round(stars)))
    const linearPalette = palette.map((c) => gsfLinear(c, [1, 1, 1]))
    const data = gsfStars(count, 800, linearPalette, seed)
    const starBuf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, starBuf)
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
    const sLoc = gl.getAttribLocation(skyProg.p, "aPos")
    const starAttrs = [
      ["aPos", 3, 0],
      ["aColor", 3, 3],
      ["aSize", 1, 6],
      ["aPhase", 1, 7],
      ["aSpeed", 1, 8],
    ].map((a) => [gl.getAttribLocation(starProg.p, a[0] as string), a[1] as number, a[2] as number])
    const maxPoint = (gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as Float32Array)[1] || 64

    // Camera and motion state.
    let w = 1
    let h = 1
    let dpr = 1
    let raf = 0
    let visible = true
    let yaw = 0
    let pitch = 0
    let yawVel = 0
    let pitchVel = 0
    let dist = 100
    let distTarget = 100
    let leanX = 0
    let leanY = 0
    let aimX = 0
    let aimY = 0
    let last = performance.now()
    const start = last
    const introMs = intro && !reduced ? 2400 : 0
    let drag = null as null | { x: number; y: number; id: number }

    const resize = () => {
      const r = root.getBoundingClientRect()
      w = Math.max(1, Math.round(r.width))
      h = Math.max(1, Math.round(r.height))
      // The sky shader runs per pixel: hold the canvas to a pixel budget on big or software screens.
      const budget = soft ? 900000 : 3200000
      dpr = Math.max(0.5, Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(budget / (w * h))))
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      if (reduced) draw(start + 4000)
    }

    const setColor = (loc: WebGLUniformLocation | null, hex: string, fb: number[]) => gl.uniform3fv(loc, gsfHex(hex, fb))

    const draw = (now: number) => {
      const o = live.current
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const k = introMs ? gsfEase((now - start) / introMs) : 1
      // Motion: the drag spins with momentum, auto-rotation turns underneath it, the universe leans.
      if (!drag) {
        yawVel *= Math.pow(0.04, dt)
        pitchVel *= Math.pow(0.04, dt)
      }
      const auto = reduced ? 0 : (o.autoRotate * Math.PI * 2) / 60
      yaw += (yawVel + auto) * dt
      pitch = Math.max(-1.2, Math.min(1.2, pitch + pitchVel * dt))
      const ease = 1 - Math.pow(0.05, dt * 3)
      leanX += ((o.interactive ? aimY * 0.08 : 0) - leanX) * ease
      leanY += ((o.interactive ? aimX * 0.08 : 0) - leanY) * ease
      dist += (distTarget - dist) * ease
      const camDist = dist + (1 - k) * 520
      const fade = introMs ? Math.min(1, (now - start) / 900) : 1
      const time = reduced ? 3.7 : ((now - start) / 1000) * o.twinkle

      const eye = gsfOrbit(yaw, pitch, camDist)
      const cam = gsfLookAt(eye)
      const lean = gsfLean(leanX, leanY)
      const proj = gsfPerspective((60 * Math.PI) / 180, w / h, 0.1, 2000)

      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.disable(gl.BLEND)
      gl.useProgram(skyProg.p)
      gl.bindBuffer(gl.ARRAY_BUFFER, quad)
      for (const a of starAttrs) if (a[0] >= 0) gl.disableVertexAttribArray(a[0])
      gl.enableVertexAttribArray(sLoc)
      gl.vertexAttribPointer(sLoc, 2, gl.FLOAT, false, 0, 0)
      gl.uniform1f(SU.uTime, time)
      gl.uniform1f(SU.uTan, Math.tan((30 * Math.PI) / 180))
      gl.uniform1f(SU.uAspect, w / h)
      gl.uniform3fv(SU.uRight, cam.x)
      gl.uniform3fv(SU.uUp, cam.y)
      gl.uniform3fv(SU.uBack, cam.z)
      // The lean's inverse is its transpose: take the 3×3 of lean, transposed, for column-major mat3.
      gl.uniformMatrix3fv(SU.uLeanT, false, [lean[0], lean[4], lean[8], lean[1], lean[5], lean[9], lean[2], lean[6], lean[10]])
      const s = skyRef.current
      setColor(SU.uBase, s.base, [0.005, 0, 0.015])
      setColor(SU.uA, s.a, [0.15, 0.02, 0.25])
      setColor(SU.uB, s.b, [0.02, 0.12, 0.25])
      setColor(SU.uBand, s.band, [0.1, 0.08, 0.05])
      gl.uniform1f(SU.uFade, 0.25 + 0.75 * fade)
      gl.drawArrays(gl.TRIANGLES, 0, 3)

      gl.enable(gl.BLEND)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE)
      gl.useProgram(starProg.p)
      gl.disableVertexAttribArray(sLoc)
      gl.bindBuffer(gl.ARRAY_BUFFER, starBuf)
      for (const a of starAttrs) {
        if (a[0] < 0) continue
        gl.enableVertexAttribArray(a[0])
        gl.vertexAttribPointer(a[0], a[1], gl.FLOAT, false, 36, a[2] * 4)
      }
      gl.uniformMatrix4fv(TU.uProj, false, proj)
      gl.uniformMatrix4fv(TU.uView, false, cam.view)
      gl.uniformMatrix4fv(TU.uLean, false, lean)
      gl.uniform1f(TU.uTime, time)
      gl.uniform1f(TU.uDpr, dpr)
      gl.uniform1f(TU.uMaxPt, Math.min(maxPoint, 72 * dpr))
      gl.uniform1f(TU.uFade, fade)
      gl.drawArrays(gl.POINTS, 0, count)
    }

    const frame = (now: number) => {
      raf = 0
      if (!visible) return
      draw(now)
      raf = requestAnimationFrame(frame)
    }
    const wake = () => {
      if (raf || !visible) return
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }

    const onMove = (e: PointerEvent) => {
      const r = root.getBoundingClientRect()
      aimX = ((e.clientX - r.left) / r.width) * 2 - 1
      aimY = -(((e.clientY - r.top) / r.height) * 2 - 1)
      if (drag && e.pointerId === drag.id) {
        const dx = e.clientX - drag.x
        const dy = e.clientY - drag.y
        drag.x = e.clientX
        drag.y = e.clientY
        yawVel = (-dx / Math.max(1, r.width)) * 9
        pitchVel = (dy / Math.max(1, r.height)) * 6
        yaw += (-dx / Math.max(1, r.width)) * 3.2
        pitch = Math.max(-1.2, Math.min(1.2, pitch + (dy / Math.max(1, r.height)) * 2.2))
      }
      if (reduced) draw(performance.now())
    }
    const onDown = (e: PointerEvent) => {
      if (!live.current.interactive || e.pointerType === "touch" || e.button !== 0) return
      if ((e.target as HTMLElement).closest("a,button,input,textarea,select,[data-interactive]")) return
      drag = { x: e.clientX, y: e.clientY, id: e.pointerId }
      canvas.setPointerCapture(e.pointerId)
      setDragging(true)
    }
    const onUp = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return
      drag = null
      setDragging(false)
    }
    const onLeave = () => {
      aimX = 0
      aimY = 0
    }
    const onWheel = (e: WheelEvent) => {
      if (!live.current.zoom) return
      e.preventDefault()
      distTarget = Math.max(30, Math.min(420, distTarget * Math.exp(e.deltaY * 0.0012)))
      if (reduced) draw(performance.now())
    }
    const lost = (e: Event) => {
      e.preventDefault()
      cancelAnimationFrame(raf)
      raf = 0
      setFailed(true)
    }

    root.addEventListener("pointermove", onMove)
    root.addEventListener("pointerleave", onLeave)
    canvas.addEventListener("pointerdown", onDown)
    canvas.addEventListener("pointerup", onUp)
    canvas.addEventListener("pointercancel", onUp)
    root.addEventListener("wheel", onWheel, { passive: false })
    canvas.addEventListener("webglcontextlost", lost)
    const ro = new ResizeObserver(resize)
    ro.observe(root)
    const io = new IntersectionObserver((entries) => {
      visible = entries[0] ? entries[0].isIntersecting : true
      if (visible && !reduced) wake()
    })
    io.observe(root)
    const onVis = () => {
      visible = document.visibilityState === "visible"
      if (visible && !reduced) wake()
    }
    document.addEventListener("visibilitychange", onVis)
    resize()
    // Paint the first frame synchronously so the sky is never blank.
    draw(reduced ? start + 4000 : performance.now())
    if (!reduced) wake()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      document.removeEventListener("visibilitychange", onVis)
      root.removeEventListener("pointermove", onMove)
      root.removeEventListener("pointerleave", onLeave)
      canvas.removeEventListener("pointerdown", onDown)
      canvas.removeEventListener("pointerup", onUp)
      canvas.removeEventListener("pointercancel", onUp)
      root.removeEventListener("wheel", onWheel)
      canvas.removeEventListener("webglcontextlost", lost)
      for (const prog of [skyProg, starProg]) {
        gl.deleteProgram(prog.p)
        gl.deleteShader(prog.vs)
        gl.deleteShader(prog.fs)
      }
      gl.deleteBuffer(quad)
      gl.deleteBuffer(starBuf)
    }
    // The nebula's colours update live through skyRef; only the stars rebuild.
  }, [geometryKey, intro])

  return (
    <div
      ref={rootRef}
      className={"gsf-root " + className}
      data-orbit={interactive ? "true" : "false"}
      data-dragging={dragging ? "true" : "false"}
      data-sky={skyKey}
      style={
        {
          height,
          "--gsf-base": sky.base,
          "--gsf-a": sky.a,
        } as React.CSSProperties
      }
      role="img"
      aria-label="A starfield with a drifting nebula. Drag to orbit."
    >
      <style>{GSF_CSS}</style>
      {failed ? <div className="gsf-fallback" aria-hidden="true" /> : <canvas ref={canvasRef} aria-hidden="true" />}
      {children ? <div className="gsf-over">{children}</div> : null}
    </div>
  )
}
