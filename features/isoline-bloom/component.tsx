"use client"

import * as React from "react"

/**
 * Isoline Bloom — a living lobed shape drawn only by its contour lines.
 *
 * One full-screen fragment pass. A trefoil-ish field (a radius bent by a few
 * angular harmonics, twisted with distance and domain-warped by slow fbm) is
 * sliced into isolines that flow outward from the core. Each line is measured
 * in screen pixels with fwidth, so it stays a crisp neon hairline at any size
 * with a soft bloom around it. Colour is read off the direction from the
 * centre — violet on one side, magenta through the middle, ember red on the
 * other — and the lines fade out toward the edge of the shape while a deep
 * indigo glow pools in the core.
 *
 * The pointer is a lens: the shape leans toward it, the lines bulge around it
 * and brighten under it, and moving fast pumps the outward flow. A click or
 * tap sends a shock pulse through the rings. With no hand on it, an invisible
 * lens wanders the field so it never sits dead.
 *
 * Self-contained: raw WebGL2, React is the only import. No textures, no image
 * assets, no CSS file. The canvas sizes itself from its own box, never the
 * window, and releases every GL object on unmount.
 */

export type IsolineParams = {
  // the shape
  /** Overall size: the outer edge of the shape, as a fraction of the shorter side. */
  scale: number
  /** Where the shape sits, 0..1 across and up the box. */
  centerX: number
  centerY: number
  /** Number of main lobes. 3 is the trefoil. */
  lobes: number
  /** How deep the lobes cut. 0 is a circle. */
  lobeDepth: number
  /** A second, slower harmonic that keeps the lobes from looking machined. */
  wobble: number
  /** Angular twist per unit radius — outer rings lag the inner ones. */
  twist: number
  /** Domain-warp amount: organic irregularity in every line. */
  warp: number
  /** How fast the shape itself breathes and morphs. */
  morph: number
  /** Turns per second the whole figure rotates. Negative spins the other way. */
  spin: number
  // the lines
  /** Isolines between the core and the edge. */
  rings: number
  /** Line core width in CSS px. */
  lineWidth: number
  /** Bloom radius around each line, in CSS px. */
  glow: number
  /** Bloom strength. */
  glowGain: number
  /** Rings per second flowing outward from the core. Negative pulls inward. */
  flow: number
  /** How quickly the outer rings fade. Higher keeps fewer lit. */
  falloff: number
  /** Radius (0..1 of the shape) where the innermost lines start to show. */
  hollow: number
  // colour
  /** Angle of the colour axis in radians: where `leftColor` sits. */
  hueAngle: number
  /** Slowly rotates the colour axis, in radians per second. */
  hueDrift: number
  /** How much hotter (whiter) the inner rings burn. */
  heat: number
  coreGlow: number
  exposure: number
  // the pointer
  /** How far the shape leans toward the pointer, 0..1. */
  pull: number
  /** How hard the pointer bulges the lines outward. */
  lens: number
  /** Lens radius, as a fraction of the shorter side. */
  lensRadius: number
  /** Extra brightness under the pointer. */
  lensGlow: number
  /** How much pointer speed pumps the flow. */
  energy: number
  /** Click pulse speed, shape-radii per second. */
  pulseSpeed: number
  /** Click pulse strength. */
  pulseGain: number
  // post
  speed: number
  vignette: number
  grain: number
  // palette
  backgroundColor: string
  coreColor: string
  leftColor: string
  midColor: string
  rightColor: string
  hotColor: string
}

export const ISOLINE_DEFAULTS: IsolineParams = {
  scale: 0.5,
  centerX: 0.5,
  centerY: 0.5,
  lobes: 3,
  lobeDepth: 0.24,
  wobble: 0.35,
  twist: 0.55,
  warp: 0.035,
  morph: 0.18,
  spin: 0.012,

  rings: 11,
  lineWidth: 1.6,
  glow: 7,
  glowGain: 0.42,
  flow: 0.22,
  falloff: 1.6,
  hollow: 0.08,

  hueAngle: 3.4,
  hueDrift: 0.02,
  heat: 0.4,
  coreGlow: 0.55,
  exposure: 1.35,

  pull: 0.18,
  lens: 0.07,
  lensRadius: 0.16,
  lensGlow: 0.9,
  energy: 1,
  pulseSpeed: 0.9,
  pulseGain: 1,

  speed: 1,
  vignette: 0.55,
  grain: 0.03,

  backgroundColor: "#000000",
  coreColor: "#1b0b7a",
  leftColor: "#7a3cff",
  midColor: "#ff3fc4",
  rightColor: "#ff2448",
  hotColor: "#ffd6f6",
}

/** Overlays on the defaults. Named for the mood, not the numbers. */
export const ISOLINE_PRESETS: Record<string, Partial<IsolineParams>> = {
  ultraviolet: {},
  "solar-flare": {
    coreColor: "#4a0d00", leftColor: "#ff2a00", midColor: "#ff8a1f", rightColor: "#ffd23f",
    hotColor: "#fff3cf", backgroundColor: "#050100",
    lobes: 5, lobeDepth: 0.12, wobble: 0.5, twist: 1.1, rings: 14, flow: 0.35, hueAngle: 1.2,
  },
  abyss: {
    coreColor: "#00264d", leftColor: "#00c2ff", midColor: "#2bffd5", rightColor: "#3a6bff",
    hotColor: "#e0fffb", backgroundColor: "#00040a",
    lobes: 4, lobeDepth: 0.16, twist: -0.6, warp: 0.09, rings: 12, flow: 0.15, spin: -0.01,
  },
  aurora: {
    coreColor: "#06331f", leftColor: "#3cff8f", midColor: "#38e1ff", rightColor: "#b06bff",
    hotColor: "#efffee", backgroundColor: "#010604",
    lobes: 2, lobeDepth: 0.26, wobble: 0.6, twist: 1.4, warp: 0.1, rings: 16, lineWidth: 1.2, flow: 0.18,
  },
  ghost: {
    coreColor: "#202024", leftColor: "#d9d9e3", midColor: "#ffffff", rightColor: "#9a9aa8",
    hotColor: "#ffffff", backgroundColor: "#000000",
    glowGain: 0.35, heat: 0.1, rings: 18, lineWidth: 1, lobeDepth: 0.14, hueDrift: 0,
  },
}

export type IsolinePreset = keyof typeof ISOLINE_PRESETS

const MAX_PULSES = 6

type Kind = "f" | "c"
type Slot = [keyof IsolineParams, Kind]

/** Which parameters reach the shader, and as what. `c` is a hex colour. */
const UNIFORMS: Slot[] = [
  ["lobes", "f"], ["lobeDepth", "f"], ["wobble", "f"], ["twist", "f"], ["warp", "f"],
  ["rings", "f"], ["lineWidth", "f"], ["glow", "f"], ["glowGain", "f"],
  ["falloff", "f"], ["hollow", "f"],
  ["heat", "f"], ["coreGlow", "f"], ["exposure", "f"],
  ["lens", "f"], ["lensRadius", "f"], ["lensGlow", "f"], ["pulseGain", "f"],
  ["vignette", "f"], ["grain", "f"],
  ["backgroundColor", "c"], ["coreColor", "c"], ["leftColor", "c"],
  ["midColor", "c"], ["rightColor", "c"], ["hotColor", "c"],
]

const uName = (k: string) => "u" + k[0].toUpperCase() + k.slice(1)
const declare = (slots: Slot[]) =>
  slots.map(([k, kind]) => "uniform " + (kind === "c" ? "vec3" : "float") + " " + uName(k) + ";").join("\n")

const VERT = `#version 300 es
void main(){
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uDpr;
uniform float uTime;
uniform float uMorphT;
uniform float uFlowPhase;
uniform float uSpinA;
uniform float uHueA;
uniform vec2 uCenter;
uniform float uRadius;
uniform vec2 uPointer;
uniform float uPointerOn;
uniform vec4 uPulse[${MAX_PULSES}];
${declare(UNIFORMS)}
out vec4 frag;

float hash12(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash12(i), b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0)), d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p){
  float s = 0.0, a = 0.5;
  mat2 r = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 4; i++){ s += a * vnoise(p); p = r * p * 2.03 + 11.7; a *= 0.5; }
  return s;
}

// The normalised radius: 0 at the core, 1 on the outer edge of the shape.
float field(vec2 px, out vec2 dir){
  vec2 p = (px - uCenter) / uRadius;
  float m = uMorphT;
  vec2 w = vec2(fbm(p * 1.1 + vec2(m * 0.7, -m * 0.4)), fbm(p * 1.1 + vec2(-m * 0.5, m * 0.6) + 7.3)) - 0.5;
  vec2 q = p + w * uWarp * 4.0;
  float r = length(q);
  float a = atan(q.y, q.x) + uSpinA - uTwist * r;
  float L = max(uLobes, 1.0);
  float shape =
      uLobeDepth * sin(L * a + 0.6 * sin(m * 0.9))
    + uLobeDepth * uWobble * sin((L - 1.0) * a - m * 1.3 + 1.7)
    + uLobeDepth * uWobble * 0.45 * sin((L + 2.0) * a + m * 0.8 + 4.1);
  // Lobes grow in with radius, so the core stays a soft knot rather than a star.
  shape *= 0.55 + 0.45 * smoothstep(0.0, 0.5, r);
  dir = r > 1e-4 ? q / r : vec2(1.0, 0.0);
  return r / (1.0 + shape);
}

vec3 tone(vec3 c){ return 1.0 - exp(-c * uExposure); }

void main(){
  vec2 px = gl_FragCoord.xy / uDpr;
  vec2 dir;
  float f = field(px, dir);
  float minSide = min(uRes.x, uRes.y) / uDpr;

  // The lens: lines bulge outward around the pointer.
  vec2 dp = (px - uPointer) / max(minSide * uLensRadius, 1.0);
  float bump = exp(-dot(dp, dp)) * uPointerOn;
  f -= uLens * bump;

  // Click pulses: a travelling shock front that kicks the lines and lights them.
  float shock = 0.0;
  for (int i = 0; i < ${MAX_PULSES}; i++){
    vec4 pu = uPulse[i];
    if (pu.w <= 0.0) continue;
    float age = uTime - pu.z;
    if (age < 0.0) continue;
    float d = length(px - pu.xy) / uRadius;
    float front = age * pu.w;
    float k = (d - front) / 0.09;
    shock += exp(-k * k) * exp(-age * 1.4) * uPulseGain;
  }
  f += shock * 0.035;

  // Isolines, measured in screen pixels so they stay hairlines at any size.
  float v = f * uRings - uFlowPhase;
  float dv = max(fwidth(v), 1e-4);
  float dist = abs(v - floor(v + 0.5)) / dv / uDpr;
  float core = 1.0 - smoothstep(uLineWidth * 0.5 - 0.5, uLineWidth * 0.5 + 0.6, dist);
  float halo = exp(-dist / max(uGlow, 0.1)) * uGlowGain;

  // Bright inside, fading to nothing at the edge; the very core is left hollow.
  float env = smoothstep(uHollow * 0.4, uHollow * 1.4 + 0.02, f)
            * pow(clamp(1.0 - f, 0.0, 1.0), uFalloff);

  // Colour off the direction from the centre.
  float side = dot(dir, vec2(cos(uHueA), sin(uHueA)));
  vec3 col = side > 0.0 ? mix(uMidColor, uLeftColor, side) : mix(uMidColor, uRightColor, -side);
  col = mix(col, uHotColor, uHeat * exp(-f * 5.0));

  float lit = env * (1.0 + bump * uLensGlow + shock * 1.5);
  vec3 c = uBackgroundColor;
  // Indigo pooled in the core, under the lines.
  c += uCoreColor * uCoreGlow * exp(-f * f * 11.0) * (1.0 + 0.35 * bump);
  c += col * (core * 1.25 + halo) * lit;

  c = tone(c);
  vec2 uv = gl_FragCoord.xy / uRes;
  float vig = 1.0 - uVignette * smoothstep(0.35, 1.05, length((uv - 0.5) * vec2(uRes.x / uRes.y, 1.0)));
  c = mix(uBackgroundColor, c, clamp(vig, 0.0, 1.0));
  c += (hash12(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) * uGrain;
  frag = vec4(max(c, 0.0), 1.0);
}`

// #region field
/** "#f0a" / "#ff00aa" → [r, g, b] in 0..1. Anything unparsable is black. */
export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.trim().replace(/^#/, "")
  if (h.length === 3) h = h.split("").map((c) => c + c).join("")
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return [0, 0, 0]
  const v = parseInt(h, 16)
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255]
}

/** The idle lens: wanders the field on incommensurate sines, never closing a loop. */
export function driftPos(t: number) {
  const x = 0.5 + 0.28 * Math.sin(t * 0.23) + 0.1 * Math.sin(t * 0.071 + 1.9)
  const y = 0.5 + 0.24 * Math.cos(t * 0.19) + 0.11 * Math.cos(t * 0.057 + 3.4)
  return [Math.min(Math.max(x, 0.08), 0.92), Math.min(Math.max(y, 0.08), 0.92)]
}

/**
 * Pointer speed (box-widths per second) → a flow boost. Fast swipes pump the
 * rings outward; the boost is capped so a flick can't strobe the screen.
 */
export function energyFrom(speed: number, gain: number) {
  if (!Number.isFinite(speed) || speed <= 0 || gain <= 0) return 0
  return Math.min(speed * 1.6 * gain, 4)
}

/** Write a pulse into the ring buffer and return the next free slot. */
export function pushPulse(buf: Float32Array, slot: number, pulse: [number, number, number, number]) {
  const n = Math.floor(buf.length / 4)
  const i = ((slot % n) + n) % n
  buf.set(pulse, i * 4)
  return (i + 1) % n
}
// #endregion

export type IsolineBloomProps = {
  /**
   * Explicit height. The canvas fills this box, so it must be a definite
   * length — "100%" only works if every ancestor has one too.
   */
  height?: string
  /** A named palette + shape, layered over the defaults. */
  preset?: IsolinePreset
  /** Overrides layered over the preset. */
  params?: Partial<IsolineParams>
  /** Pointer lenses the lines; click sends a pulse. */
  interactive?: boolean
  /** "scroll" keeps page scrolling on touch; "draw" takes the gesture. */
  touch?: "scroll" | "draw"
  /** Device-pixel-ratio cap. The shader is per-pixel, so 2 is plenty. */
  maxDpr?: number
  className?: string
}

export default function IsolineBloom({
  height = "100svh",
  preset = "ultraviolet",
  params,
  interactive = true,
  touch = "scroll",
  maxDpr = 2,
  className = "",
}: IsolineBloomProps) {
  const rootRef = React.useRef<HTMLElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const [failed, setFailed] = React.useState(false)
  const [generation, setGeneration] = React.useState(0)
  const [reduced, setReduced] = React.useState(false)

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])

  // Defaults < preset < explicit params.
  const P = React.useMemo<IsolineParams>(
    () => ({ ...ISOLINE_DEFAULTS, ...(ISOLINE_PRESETS[preset] ?? {}), ...(params ?? {}) }),
    [preset, params],
  )
  // The loop reads through a ref, so tuning a value never restarts WebGL.
  const paramsRef = React.useRef(P)
  paramsRef.current = P

  React.useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    if (!root || !canvas) return

    const gl = canvas.getContext("webgl2", {
      antialias: false,
      alpha: false,
      depth: false,
      powerPreference: "high-performance",
    })
    if (!gl) {
      setFailed(true)
      return
    }

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)
      if (!s) return null
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error("isoline-bloom:", gl.getShaderInfoLog(s))
        gl.deleteShader(s)
        return null
      }
      return s
    }
    const vs = compile(gl.VERTEX_SHADER, VERT)
    const fs = compile(gl.FRAGMENT_SHADER, FRAG)
    const program = vs && fs ? gl.createProgram() : null
    if (!program || !vs || !fs) {
      setFailed(true)
      return
    }
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("isoline-bloom:", gl.getProgramInfoLog(program))
      gl.deleteProgram(program)
      setFailed(true)
      return
    }

    const loc = (n: string) => gl.getUniformLocation(program, n)
    const tuned = UNIFORMS.map(([k, kind]) => [loc(uName(k)), k, kind] as const)
    const U = {
      res: loc("uRes"), dpr: loc("uDpr"), time: loc("uTime"), morphT: loc("uMorphT"),
      flowPhase: loc("uFlowPhase"), spinA: loc("uSpinA"), hueA: loc("uHueA"),
      center: loc("uCenter"), radius: loc("uRadius"),
      pointer: loc("uPointer"), pointerOn: loc("uPointerOn"), pulse: loc("uPulse"),
    }
    const vao = gl.createVertexArray()

    // ---- sizing, from the element rather than the window --------------------
    let cssW = 1
    let cssH = 1
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, Math.max(maxDpr, 0.5))
      cssW = Math.max(canvas.clientWidth, 1)
      cssH = Math.max(canvas.clientHeight, 1)
      const w = Math.floor(cssW * dpr)
      const h = Math.floor(cssH * dpr)
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      if (reduced) paint()
    }

    // Reduced motion freezes every clock on a frame that is already composed.
    const FROZEN = 9
    const t0 = performance.now()
    const clock = () => (reduced ? FROZEN : ((performance.now() - t0) / 1000) * paramsRef.current.speed)
    let lastClock = clock()
    let morphT = FROZEN * ISOLINE_DEFAULTS.morph
    let flowPhase = 0
    let spinA = 0
    let hueA = 0

    // ---- the pointer --------------------------------------------------------
    let targetX = 0.5
    let targetY = 0.5
    let lensX = 0.5
    let lensY = 0.5
    let lensOn = 0
    let inside = false
    let lastTouched = -1e9
    let lastMove = { x: 0.5, y: 0.5, t: 0 }
    let energy = 0
    const pulses = new Float32Array(MAX_PULSES * 4)
    let pulseNext = 0

    const toUv = (e: PointerEvent): [number, number] => {
      const r = canvas.getBoundingClientRect()
      return [
        Math.min(Math.max((e.clientX - r.left) / Math.max(r.width, 1), 0), 1),
        Math.min(Math.max(1 - (e.clientY - r.top) / Math.max(r.height, 1), 0), 1),
      ]
    }
    const onMove = (e: PointerEvent) => {
      if (!interactive) return
      const [x, y] = toUv(e)
      const now = performance.now() / 1000
      const dt = now - lastMove.t
      if (inside && dt > 0 && dt < 0.25) {
        const boost = energyFrom(Math.hypot(x - lastMove.x, (y - lastMove.y) * (cssH / cssW)) / dt, paramsRef.current.energy)
        energy = Math.max(energy, boost)
      }
      lastMove = { x, y, t: now }
      targetX = x
      targetY = y
      inside = true
      lastTouched = now
    }
    const onLeave = () => {
      inside = false
    }
    const onDown = (e: PointerEvent) => {
      if (!interactive || e.button > 0) return
      const [x, y] = toUv(e)
      targetX = x
      targetY = y
      inside = true
      lastTouched = performance.now() / 1000
      lastMove = { x, y, t: lastTouched }
      pulseNext = pushPulse(pulses, pulseNext, [
        x * cssW, y * cssH, clock(), reduced ? 0 : Math.max(paramsRef.current.pulseSpeed, 0.05),
      ])
      if (!reduced) energy = Math.max(energy, 1.5 * paramsRef.current.energy)
    }

    root.addEventListener("pointermove", onMove)
    root.addEventListener("pointerdown", onDown)
    root.addEventListener("pointerleave", onLeave)
    root.addEventListener("pointercancel", onLeave)

    const onLost = (e: Event) => {
      e.preventDefault()
      cancelAnimationFrame(raf)
      raf = 0
    }
    const onRestored = () => setGeneration((g) => g + 1)
    canvas.addEventListener("webglcontextlost", onLost)
    canvas.addEventListener("webglcontextrestored", onRestored)

    // ---- one frame ----------------------------------------------------------
    const paint = () => {
      const p = paramsRef.current
      const t = clock()
      const dt = Math.min(Math.max(t - lastClock, 0), 0.1)
      lastClock = t

      // Clocks integrate their rates, so dragging a slider never makes the
      // figure jump — it just speeds up or slows down from where it is.
      energy *= Math.exp(-dt * 1.8)
      morphT += dt * p.morph * (1 + energy * 0.5)
      flowPhase += dt * p.flow * (1 + energy)
      spinA += dt * p.spin * Math.PI * 2
      hueA += dt * p.hueDrift
      if (reduced) {
        morphT = FROZEN * p.morph
        flowPhase = 0.35
        spinA = 0
        hueA = 0
      }

      // With no hand on it, the lens wanders on its own so the figure never
      // sits dead — and a still capture of it still shows the bulge.
      const idle = !inside || performance.now() / 1000 - lastTouched > 5
      const [gx, gy] = driftPos(t * 0.5)
      const wantX = idle ? gx : targetX
      const wantY = idle ? gy : targetY
      const k = reduced ? 1 : 1 - Math.exp(-dt * (idle ? 1.2 : 8))
      lensX += (wantX - lensX) * k
      lensY += (wantY - lensY) * k
      const onTarget = interactive && !reduced ? (idle ? 0.45 : 1) : 0
      lensOn += (onTarget - lensOn) * (reduced ? 1 : 1 - Math.exp(-dt * 3))

      // The shape leans toward the lens.
      const minSide = Math.min(cssW, cssH)
      const cx = (p.centerX + (lensX - p.centerX) * p.pull * lensOn) * cssW
      const cy = (p.centerY + (lensY - p.centerY) * p.pull * lensOn) * cssH

      gl.useProgram(program)
      gl.bindVertexArray(vao)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, canvas.width, canvas.height)
      for (const [l, key, kind] of tuned) {
        const v = p[key]
        if (kind === "c") gl.uniform3fv(l, hexToRgb(v as string))
        else gl.uniform1f(l, v as number)
      }
      gl.uniform2f(U.res, canvas.width, canvas.height)
      gl.uniform1f(U.dpr, canvas.width / cssW)
      gl.uniform1f(U.time, t)
      gl.uniform1f(U.morphT, morphT)
      gl.uniform1f(U.flowPhase, flowPhase)
      gl.uniform1f(U.spinA, spinA)
      gl.uniform1f(U.hueA, p.hueAngle + hueA)
      gl.uniform2f(U.center, cx, cy)
      gl.uniform1f(U.radius, Math.max(p.scale * minSide, 1))
      gl.uniform2f(U.pointer, lensX * cssW, lensY * cssH)
      gl.uniform1f(U.pointerOn, lensOn)
      gl.uniform4fv(U.pulse, pulses)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    // ---- loop, paused whenever nobody can see it -----------------------------
    let raf = 0
    let visible = true
    const frame = () => {
      raf = 0
      paint()
      if (visible && !document.hidden) raf = requestAnimationFrame(frame)
    }
    const wake = () => {
      if (!reduced && !raf && visible && !document.hidden) raf = requestAnimationFrame(frame)
    }
    const io = new IntersectionObserver((entries) => {
      visible = entries.some((e) => e.isIntersecting)
      wake()
    })
    io.observe(root)
    document.addEventListener("visibilitychange", wake)

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)

    // Paint before the first rAF so nothing ever flashes an empty canvas.
    paint()
    if (reduced) {
      // Nothing moves; one frame is the whole piece.
    } else {
      wake()
    }

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      io.disconnect()
      document.removeEventListener("visibilitychange", wake)
      root.removeEventListener("pointermove", onMove)
      root.removeEventListener("pointerdown", onDown)
      root.removeEventListener("pointerleave", onLeave)
      root.removeEventListener("pointercancel", onLeave)
      canvas.removeEventListener("webglcontextlost", onLost)
      canvas.removeEventListener("webglcontextrestored", onRestored)
      gl.deleteVertexArray(vao)
      gl.deleteProgram(program)
    }
  }, [interactive, reduced, generation, maxDpr])

  return (
    <section
      ref={rootRef}
      className={
        "relative w-full overflow-hidden " +
        (interactive ? "cursor-crosshair " : "") +
        (touch === "draw" ? "touch-none " : "touch-pan-y ") +
        className
      }
      style={{ height, backgroundColor: P.backgroundColor }}
      aria-label="Glowing contour lines of a slowly morphing shape"
    >
      {failed ? (
        // No WebGL2: a still picture of the same glow beats a black box.
        <div
          className="absolute inset-0"
          style={{
            background:
              "repeating-radial-gradient(circle at 50% 50%, transparent 0 22px, " + P.midColor + "55 23px, transparent 25px)," +
              "radial-gradient(38% 38% at 50% 50%, " + P.coreColor + " 0%, transparent 70%)," +
              P.backgroundColor,
            maskImage: "radial-gradient(closest-side, #000 40%, transparent 100%)",
          }}
        />
      ) : (
        <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 block h-full w-full" />
      )}
    </section>
  )
}
