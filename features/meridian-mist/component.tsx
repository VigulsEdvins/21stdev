"use client"

import * as React from "react"

/**
 * Meridian Mist — a grainy cobalt mesh gradient under a drafting overlay.
 *
 * One full-screen fragment pass. The colour is a stack of broad gaussian
 * lobes over a slate ground: sky blue catching the top-left corner, a royal
 * bloom in the middle, navy pooling into the bottom-left, a periwinkle tint on
 * the right and sky again in the bottom-right corner. Slow fbm warps all of it
 * so the mesh breathes. On top sit hairline guides — columns, rows and a pair
 * of large overlapping circles — drawn in CSS pixels so they stay crisp, then
 * fine grain over everything, as if the whole sheet were printed.
 *
 * The royal bloom leans toward the pointer and a click drops a ring that
 * expands through the mist. Opt in with `crosshair` for a dashed drafting
 * crosshair that snaps to any guide it comes near, lighting that guide up.
 *
 * Self-contained: raw WebGL2, React is the only import. No textures, no image
 * assets, no CSS file. The canvas sizes itself from its own box, never the
 * window, and releases every GL object on unmount.
 */

export type MistParams = {
  // the light
  /** Where the royal bloom sits, 0..1 with y down. */
  glowX: number
  glowY: number
  /** Size of the royal bloom. */
  bloom: number
  /** How much navy pools into the bottom-left. 0 leaves it slate. */
  depth: number
  /** Strength of the sky-blue corners and the periwinkle tint. */
  haze: number
  // motion
  /** How far the slow fbm pushes the mesh around. */
  flow: number
  speed: number
  // film
  /** Grain amplitude. The reference sits around 0.05. */
  grain: number
  /** Grain cell in CSS px. */
  grainSize: number
  /** Grain re-rolls per second. 0 prints it still. */
  grainFps: number
  // the drafting overlay
  /** Vertical guides, as fractions of the width. Up to 8. */
  columns: number[]
  /** Horizontal guides, as fractions of the height. Up to 8. */
  rows: number[]
  /** How many circles, 0..3, stacked along the long side. */
  circles: number
  /** Circle radius as a fraction of the short side. */
  circleRadius: number
  /** Distance between circle centres, in radii. 1 is the reference overlap. */
  circleGap: number
  /** Guide opacity at rest. */
  lineOpacity: number
  /** Guide stroke in CSS px. */
  lineWidth: number
  // the pointer
  /** How hard the bloom leans toward the pointer. */
  lens: number
  /** How bright guides get near the pointer. */
  glint: number
  /** Pointer reach, as a fraction of the box's short side. */
  reach: number
  /** Crosshair snap distance in CSS px. 0 turns snapping off. */
  snap: number
  // palette
  inkColor: string
  navyColor: string
  royalColor: string
  skyColor: string
  lilacColor: string
  slateColor: string
  mistColor: string
  lineColor: string
}

export const MIST_DEFAULTS: MistParams = {
  glowX: 0.44,
  glowY: 0.55,
  bloom: 1,
  depth: 1,
  haze: 1,

  flow: 1,
  speed: 1,

  grain: 0.05,
  grainSize: 1,
  grainFps: 18,

  columns: [0.37, 0.632],
  rows: [0.252, 0.745, 0.757, 0.826],
  circles: 2,
  circleRadius: 0.453,
  circleGap: 1,
  lineOpacity: 0.2,
  lineWidth: 1,

  lens: 0.7,
  glint: 0.35,
  reach: 0.32,
  snap: 14,

  inkColor: "#0d1c3c",
  navyColor: "#14306b",
  royalColor: "#2f64cf",
  skyColor: "#6cadf0",
  lilacColor: "#7480c0",
  slateColor: "#8fa1ba",
  mistColor: "#9aaac0",
  lineColor: "#dce6f5",
}

/** Overlays on the defaults. Named for the light, not the numbers. */
export const MIST_PRESETS: Record<string, Partial<MistParams>> = {
  cobalt: {},
  dusk: {
    inkColor: "#1c1433", navyColor: "#2c2163", royalColor: "#5a49c8", skyColor: "#e59bb8",
    lilacColor: "#b07ab8", slateColor: "#a59cb4", mistColor: "#b8aec2", lineColor: "#f1e6f2",
  },
  glacier: {
    inkColor: "#0b2a33", navyColor: "#11414d", royalColor: "#1f8fa6", skyColor: "#9be3ef",
    lilacColor: "#6fb2b8", slateColor: "#a7b9bd", mistColor: "#c2d0d2", lineColor: "#eef8fa",
    columns: [0.25, 0.5, 0.75], circles: 1, circleRadius: 0.36,
  },
  sage: {
    inkColor: "#18261c", navyColor: "#24402c", royalColor: "#4f8a5c", skyColor: "#cfe0a4",
    lilacColor: "#8fa58a", slateColor: "#a9b2a3", mistColor: "#c3c8b9", lineColor: "#f3f6ea",
    rows: [0.3, 0.7], circles: 3, circleRadius: 0.3, circleGap: 1.2,
  },
  graphite: {
    inkColor: "#0e0f12", navyColor: "#1d2027", royalColor: "#3d4250", skyColor: "#9aa3b2",
    lilacColor: "#6b6f7c", slateColor: "#7c818b", mistColor: "#8f939b", lineColor: "#e6e8ec",
    grain: 0.065, lineOpacity: 0.16,
  },
}

const MAX_GUIDES = 8
const MAX_CIRCLES = 3
const MAX_RIPPLES = 4

type Tunable = Exclude<keyof MistParams, "columns" | "rows" | "speed" | "grainFps" | "snap" | "circles" | "circleRadius" | "circleGap">
type Kind = "f" | "c"
type Slot = [Tunable, Kind]

/** Which parameters reach the shader, and as what. `c` is a hex colour. */
const UNIFORMS: Slot[] = [
  ["glowX", "f"], ["glowY", "f"], ["bloom", "f"], ["depth", "f"], ["haze", "f"],
  ["flow", "f"], ["grain", "f"], ["grainSize", "f"],
  ["lineOpacity", "f"], ["lineWidth", "f"],
  ["lens", "f"], ["glint", "f"], ["reach", "f"],
  ["inkColor", "c"], ["navyColor", "c"], ["royalColor", "c"], ["skyColor", "c"],
  ["lilacColor", "c"], ["slateColor", "c"], ["mistColor", "c"], ["lineColor", "c"],
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
uniform float uWall;
uniform float uFrame;
uniform vec2 uLamp;
uniform float uLampOn;
uniform vec2 uCursor;
uniform float uCursorOn;
uniform float uCols[${MAX_GUIDES}];
uniform float uColGlow[${MAX_GUIDES}];
uniform int uColCount;
uniform float uRows[${MAX_GUIDES}];
uniform float uRowGlow[${MAX_GUIDES}];
uniform int uRowCount;
uniform vec3 uCircles[${MAX_CIRCLES}];
uniform float uCircleGlow[${MAX_CIRCLES}];
uniform int uCircleCount;
uniform vec4 uRipple[${MAX_RIPPLES}];
${declare(UNIFORMS)}
out vec4 frag;

float hash12(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float noise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
             mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0;
  float a = 0.5;
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 4; i++){
    v += a * noise(p);
    p = r * p * 2.03 + 11.7;
    a *= 0.5;
  }
  return v;
}
// An axis-aligned gaussian lobe: 1 at c, falling off over s.
float lobe(vec2 q, vec2 c, vec2 s){
  vec2 d = (q - c) / s;
  return exp(-dot(d, d));
}
// A hairline: 1 on the stroke, antialiased over about a CSS pixel.
float hair(float d, float w){
  return 1.0 - smoothstep(w * 0.5, w * 0.5 + 0.9, d);
}

void main(){
  float dpr = max(uDpr, 0.25);
  vec2 cssRes = uRes / dpr;
  vec2 P = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / dpr;
  vec2 uv = P / cssRes;
  float t = uTime;
  float shortSide = min(cssRes.x, cssRes.y);

  // ---- the pointer ---------------------------------------------------------
  float reach = max(uReach, 0.02) * shortSide;
  vec2 lampPx = uLamp * cssRes;
  vec2 dl = P - lampPx;
  float fall = exp(-dot(dl, dl) / (reach * reach)) * uLampOn;

  vec2 q = uv;

  // A click: a ring that refracts the mist and draws itself as a guide.
  float ring = 0.0;
  for (int i = 0; i < ${MAX_RIPPLES}; i++){
    vec4 r = uRipple[i];
    if (r.w <= 0.0) continue;
    float age = uWall - r.z;
    if (age < 0.0 || age > 2.6) continue;
    vec2 rd = P - r.xy * cssRes;
    float dist = length(rd);
    float rad = age * shortSide * 0.38;
    float w = exp(-pow((dist - rad) / (shortSide * 0.06), 2.0)) * exp(-age * 1.4) * r.w;
    q += (rd / max(dist, 1e-3)) / cssRes * w * shortSide * 0.025;
    ring += hair(abs(dist - rad), uLineWidth) * exp(-age * 1.1) * r.w;
  }

  // ---- slow mesh flow ------------------------------------------------------
  float ts = t * 0.05;
  vec2 warp = vec2(fbm(q * 1.3 + vec2(0.0, ts)), fbm(q * 1.3 + vec2(4.7, 2.1 - ts * 0.9))) - 0.5;
  q += warp * 0.22 * uFlow;

  // The bloom wanders a little on its own and leans toward the pointer.
  vec2 gc = vec2(uGlowX, uGlowY) + 0.035 * vec2(sin(t * 0.17), cos(t * 0.13));
  gc = mix(gc, uLamp, uLens * uLampOn * 0.45);

  // ---- colour, slate up to navy --------------------------------------------
  vec3 col = uSlateColor;
  col = mix(col, uMistColor, lobe(q, vec2(1.0, 0.0), vec2(0.7, 0.5)) * 0.7);
  col = mix(col, uLilacColor, clamp(lobe(q, vec2(0.84 + 0.02 * sin(t * 0.11), 0.64), vec2(0.2, 0.13)) * 0.65 * uHaze, 0.0, 1.0));
  float band = lobe(q, vec2(-0.08, 0.48), vec2(0.5, 0.26));
  col = mix(col, mix(uRoyalColor, uNavyColor, 0.4), clamp(band * 1.45 * uDepth, 0.0, 1.0));
  float royal = lobe(q, gc, vec2(0.36, 0.25) * max(uBloom, 0.05));
  col = mix(col, uRoyalColor, clamp(royal * 1.3, 0.0, 1.0));
  float deep = lobe(q, vec2(0.42, 0.93), vec2(0.32, 0.18));
  col = mix(col, mix(uRoyalColor, uNavyColor, 0.5), clamp(deep * 1.3 * uDepth, 0.0, 1.0));
  float navy = lobe(q, vec2(-0.08, 1.02), vec2(0.42, 0.36));
  col = mix(col, uNavyColor, clamp(navy * 1.5 * uDepth, 0.0, 1.0));
  col = mix(col, uInkColor, clamp(lobe(q, vec2(-0.1, 1.1), vec2(0.3, 0.25)) * uDepth, 0.0, 1.0) * 0.8);
  col = mix(col, uSkyColor, clamp(lobe(q, vec2(-0.04, 0.13), vec2(0.2, 0.13)) * uHaze, 0.0, 1.0));
  col = mix(col, uSkyColor, clamp(lobe(q, vec2(0.86, 1.02), vec2(0.26, 0.15)) * uHaze, 0.0, 1.0));
  // A pool of light under the pointer.
  col = mix(col, uSkyColor, fall * 0.16 * uLens);

  // ---- the drafting overlay, crisp in CSS px --------------------------------
  float lw = max(uLineWidth, 0.25);
  float lift = fall * uGlint;
  float a = 0.0;
  for (int i = 0; i < ${MAX_GUIDES}; i++){
    if (i >= uColCount) break;
    float h = hair(abs(P.x - uCols[i] * cssRes.x), lw);
    a = max(a, h * (uLineOpacity + uColGlow[i] * 0.32 + lift));
  }
  for (int i = 0; i < ${MAX_GUIDES}; i++){
    if (i >= uRowCount) break;
    float h = hair(abs(P.y - uRows[i] * cssRes.y), lw);
    a = max(a, h * (uLineOpacity + uRowGlow[i] * 0.32 + lift));
  }
  for (int i = 0; i < ${MAX_CIRCLES}; i++){
    if (i >= uCircleCount) break;
    vec3 c = uCircles[i];
    float h = hair(abs(length(P - c.xy) - c.z), lw);
    a = max(a, h * (uLineOpacity * 0.85 + uCircleGlow[i] * 0.32 + lift));
  }

  // The crosshair: dashed, fading out from the cursor so it reads as a tool.
  vec2 dc = P - uCursor;
  float cfade = exp(-length(dc) / (shortSide * 0.45)) * uCursorOn;
  float cv = hair(abs(dc.x), lw) * step(0.45, fract(P.y / 8.0));
  float ch = hair(abs(dc.y), lw) * step(0.45, fract(P.x / 8.0));
  a = max(a, max(cv, ch) * 0.5 * cfade);
  a = max(a, hair(abs(length(dc) - 5.0), lw * 1.2) * 0.9 * uCursorOn);
  a = max(a, ring * 0.75);

  col = mix(col, uLineColor, clamp(a, 0.0, 1.0));

  // ---- grain over everything, like ink on paper -----------------------------
  vec2 gp = floor(P / max(uGrainSize, 0.5));
  float g = hash12(gp + uFrame * vec2(17.13, 31.71)) - 0.5;
  float g2 = hash12(floor(gp * 0.5) + uFrame * vec2(5.3, 9.7)) - 0.5;
  col += (g * 0.85 + g2 * 0.3) * uGrain;

  frag = vec4(clamp(col, 0.0, 1.0), 1.0);
}`

// #region drafting
/** "#f0a" / "#ff00aa" → [r, g, b] in 0..1. Anything unparsable is black. */
export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.trim().replace(/^#/, "")
  if (h.length === 3) h = h.split("").map((c) => c + c).join("")
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return [0, 0, 0]
  const v = parseInt(h, 16)
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255]
}

/** Which grain frame a clock time falls on. 0 fps prints the grain still. */
export function grainFrame(seconds: number, fps: number) {
  if (!(fps > 0) || !Number.isFinite(seconds)) return 0
  return Math.floor(seconds * Math.min(fps, 120)) % 4096
}

/** Guide fractions, cleaned: finite, inside the box, at most eight. */
export function cleanGuides(list: number[]) {
  return (Array.isArray(list) ? list : [])
    .filter((v) => typeof v === "number" && Number.isFinite(v))
    .map((v) => Math.min(Math.max(v, 0), 1))
    .slice(0, 8)
}

/**
 * The circles, as [cx, cy, r] in CSS px. They stack along the long side of the
 * box, centred, so a portrait sheet stacks them vertically like the reference
 * and a landscape one lays them side by side.
 */
export function circleLayout(w: number, h: number, count: number, radius: number, gap: number) {
  const n = Math.min(Math.max(Math.round(Number.isFinite(count) ? count : 0), 0), 3)
  const r = Math.min(w, h) * Math.max(Number.isFinite(radius) ? radius : 0, 0)
  const step = (Number.isFinite(gap) ? gap : 0) * r
  const out: [number, number, number][] = []
  for (let i = 0; i < n; i++) {
    const off = (i - (n - 1) / 2) * step
    out.push(w > h ? [w / 2 + off, h / 2, r] : [w / 2, h / 2 + off, r])
  }
  return out
}

/**
 * Snap a pointer (CSS px) to the nearest guide within `threshold`. Columns and
 * rows snap independently, so near a crossing it lands on the intersection;
 * only a pointer on neither falls through to the circles, and is projected
 * onto the nearest outline. Returns [x, y, column, row, circle], -1 for none.
 */
export function snapPoint(
  x: number,
  y: number,
  cols: number[],
  rows: number[],
  circles: [number, number, number][],
  threshold: number,
) {
  let sx = x
  let sy = y
  let col = -1
  let row = -1
  let ring = -1
  if (!(threshold > 0)) return [sx, sy, col, row, ring]
  let best = threshold
  cols.forEach((c, i) => {
    const d = Math.abs(x - c)
    if (d <= best) {
      best = d
      col = i
    }
  })
  best = threshold
  rows.forEach((c, i) => {
    const d = Math.abs(y - c)
    if (d <= best) {
      best = d
      row = i
    }
  })
  if (col >= 0) sx = cols[col]
  if (row >= 0) sy = rows[row]
  if (col < 0 && row < 0) {
    best = threshold
    circles.forEach(([cx, cy, r], i) => {
      const d = Math.hypot(x - cx, y - cy)
      if (d > 1e-6 && Math.abs(d - r) <= best) {
        best = Math.abs(d - r)
        ring = i
      }
    })
    if (ring >= 0) {
      const [cx, cy, r] = circles[ring]
      const d = Math.hypot(x - cx, y - cy)
      sx = cx + ((x - cx) / d) * r
      sy = cy + ((y - cy) / d) * r
    }
  }
  return [sx, sy, col, row, ring]
}
// #endregion

export type MeridianMistProps = {
  /**
   * Explicit height. The canvas fills this box, so it must be a definite
   * length — "100%" only works if every ancestor has one too.
   */
  height?: string
  /** A named palette, layered over the defaults. */
  preset?: keyof typeof MIST_PRESETS
  /** Overrides layered over the preset. */
  params?: Partial<MistParams>
  /** Bloom follows the pointer, guides glint, click drops a ring. */
  interactive?: boolean
  /** The snapping crosshair and its coordinate readout. Off by default. */
  crosshair?: boolean
  /** Device-pixel-ratio cap. Grain is per-pixel, so 2 is plenty. */
  maxDpr?: number
  /** Content laid over the mist. Pointer events pass through unless opted in. */
  children?: React.ReactNode
  className?: string
}

export default function MeridianMist({
  height = "100svh",
  preset = "glacier",
  params,
  interactive = true,
  crosshair = false,
  maxDpr = 2,
  children,
  className = "",
}: MeridianMistProps) {
  const rootRef = React.useRef<HTMLElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const readoutRef = React.useRef<HTMLDivElement>(null)
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
  const P = React.useMemo<MistParams>(
    () => ({ ...MIST_DEFAULTS, ...(MIST_PRESETS[preset] ?? {}), ...(params ?? {}) }),
    [preset, params],
  )
  // The loop reads through a ref, so tuning a value never restarts WebGL.
  const paramsRef = React.useRef(P)
  paramsRef.current = P
  const repaintRef = React.useRef<() => void>(() => {})
  React.useEffect(() => repaintRef.current(), [P])

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
        console.error("meridian-mist:", gl.getShaderInfoLog(s))
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
      console.error("meridian-mist:", gl.getProgramInfoLog(program))
      gl.deleteProgram(program)
      setFailed(true)
      return
    }

    const loc = (n: string) => gl.getUniformLocation(program, n)
    const tuned = UNIFORMS.map(([k, kind]) => [loc(uName(k)), k, kind] as const)
    const U = {
      res: loc("uRes"), dpr: loc("uDpr"), time: loc("uTime"), wall: loc("uWall"), frame: loc("uFrame"),
      lamp: loc("uLamp"), lampOn: loc("uLampOn"), cursor: loc("uCursor"), cursorOn: loc("uCursorOn"),
      cols: loc("uCols"), colGlow: loc("uColGlow"), colCount: loc("uColCount"),
      rows: loc("uRows"), rowGlow: loc("uRowGlow"), rowCount: loc("uRowCount"),
      circles: loc("uCircles"), circleGlow: loc("uCircleGlow"), circleCount: loc("uCircleCount"),
      ripple: loc("uRipple"),
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

    // Reduced motion freezes the clock — and the grain — on one frame.
    const FROZEN = 12
    const t0 = performance.now()
    const wall = () => (reduced ? FROZEN : (performance.now() - t0) / 1000)
    let clockT = FROZEN
    let lastWall = wall()

    // ---- the pointer --------------------------------------------------------
    let targetX = 0.5
    let targetY = 0.5
    let lampX = MIST_DEFAULTS.glowX
    let lampY = MIST_DEFAULTS.glowY
    let lampOn = 0
    let cursorX = -100
    let cursorY = -100
    let cursorOn = 0
    let inside = false
    let lastLabel = ""
    const colGlow = new Float32Array(MAX_GUIDES)
    const rowGlow = new Float32Array(MAX_GUIDES)
    const circleGlow = new Float32Array(MAX_CIRCLES)
    const colBuf = new Float32Array(MAX_GUIDES)
    const rowBuf = new Float32Array(MAX_GUIDES)
    const circleBuf = new Float32Array(MAX_CIRCLES * 3)
    const ripples = new Float32Array(MAX_RIPPLES * 4)
    let rippleNext = 0

    const toUv = (e: PointerEvent): [number, number] => {
      const r = canvas.getBoundingClientRect()
      return [
        Math.min(Math.max((e.clientX - r.left) / Math.max(r.width, 1), 0), 1),
        Math.min(Math.max((e.clientY - r.top) / Math.max(r.height, 1), 0), 1),
      ]
    }
    const onMove = (e: PointerEvent) => {
      if (!interactive) return
      ;[targetX, targetY] = toUv(e)
      inside = true
      if (reduced) paint()
    }
    const onLeave = () => {
      inside = false
      if (reduced) paint()
    }
    const onDown = (e: PointerEvent) => {
      if (!interactive || e.button > 0) return
      // Let buttons and links in the overlay keep their clicks.
      if ((e.target as HTMLElement | null)?.closest("a,button,input,textarea,select,label,[role=button]")) return
      ;[targetX, targetY] = toUv(e)
      inside = true
      if (reduced) {
        paint()
        return
      }
      // The ring starts where the crosshair is, so a snapped click lands on the guide.
      const [sx, sy] = snapNow()
      ripples.set([sx / cssW, sy / cssH, wall(), 1], rippleNext * 4)
      rippleNext = (rippleNext + 1) % MAX_RIPPLES
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

    // ---- the guides, in CSS px ------------------------------------------------
    let cols: number[] = []
    let rows: number[] = []
    let circles: [number, number, number][] = []
    const layout = (t: number) => {
      const p = paramsRef.current
      cols = cleanGuides(p.columns).map((v) => v * cssW)
      rows = cleanGuides(p.rows).map((v) => v * cssH)
      // The circles breathe a hair and drift with the pointer, for depth.
      circles = circleLayout(cssW, cssH, p.circles, p.circleRadius, p.circleGap).map(([x, y, r], i) => [
        x + (lampX - 0.5) * cssW * 0.025 * lampOn,
        y + (lampY - 0.5) * cssH * 0.025 * lampOn,
        r * (1 + 0.006 * Math.sin(t * 0.5 + i * 2.1)),
      ])
    }
    const snapNow = () =>
      snapPoint(targetX * cssW, targetY * cssH, cols, rows, circles, crosshair ? paramsRef.current.snap : 0)

    // ---- one frame ----------------------------------------------------------
    const paint = () => {
      const p = paramsRef.current
      const now = wall()
      const dt = Math.min(Math.max(now - lastWall, 0), 0.1)
      lastWall = now
      if (!reduced) clockT += dt * p.speed
      const t = clockT
      layout(t)

      const ease = (rate: number) => (reduced ? 1 : 1 - Math.exp(-dt * rate))
      const live = interactive && inside
      lampX += ((live ? targetX : p.glowX) - lampX) * ease(live ? 5 : 1.2)
      lampY += ((live ? targetY : p.glowY) - lampY) * ease(live ? 5 : 1.2)
      lampOn += ((live ? 1 : 0) - lampOn) * ease(3)

      const [sx, sy, sc, sr, sk] = snapNow()
      const showCross = live && crosshair
      cursorX += (sx - cursorX) * (cursorOn < 0.02 ? 1 : ease(22))
      cursorY += (sy - cursorY) * (cursorOn < 0.02 ? 1 : ease(22))
      cursorOn += ((showCross ? 1 : 0) - cursorOn) * ease(8)
      for (let i = 0; i < MAX_GUIDES; i++) {
        colGlow[i] += ((showCross && i === sc ? 1 : 0) - colGlow[i]) * ease(10)
        rowGlow[i] += ((showCross && i === sr ? 1 : 0) - rowGlow[i]) * ease(10)
      }
      for (let i = 0; i < MAX_CIRCLES; i++) circleGlow[i] += ((showCross && i === sk ? 1 : 0) - circleGlow[i]) * ease(10)

      // The readout: written straight to the DOM, only when it changes.
      const label = readoutRef.current
      if (label) {
        const snapped = sc >= 0 || sr >= 0 || sk >= 0
        const text = Math.round(sx) + " × " + Math.round(sy) + (snapped ? "  ◆" : "")
        if (text !== lastLabel) {
          label.textContent = text
          lastLabel = text
        }
        label.style.opacity = String(cursorOn)
        const flipX = cursorX > cssW - 120 ? -100 : 0
        const flipY = cursorY > cssH - 40 ? -100 : 0
        label.style.transform =
          "translate(" + (cursorX + (flipX ? -12 : 12)) + "px," + (cursorY + (flipY ? -12 : 12)) + "px) translate(" +
          flipX + "%," + flipY + "%)"
      }

      colBuf.fill(0)
      rowBuf.fill(0)
      circleBuf.fill(0)
      cols.forEach((v, i) => (colBuf[i] = v / cssW))
      rows.forEach((v, i) => (rowBuf[i] = v / cssH))
      circles.forEach((c, i) => circleBuf.set(c, i * 3))

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
      gl.uniform1f(U.wall, now)
      gl.uniform1f(U.frame, grainFrame(now, p.grainFps))
      gl.uniform2f(U.lamp, lampX, lampY)
      gl.uniform1f(U.lampOn, interactive ? lampOn : 0)
      gl.uniform2f(U.cursor, cursorX, cursorY)
      gl.uniform1f(U.cursorOn, cursorOn)
      gl.uniform1fv(U.cols, colBuf)
      gl.uniform1fv(U.colGlow, colGlow)
      gl.uniform1i(U.colCount, cols.length)
      gl.uniform1fv(U.rows, rowBuf)
      gl.uniform1fv(U.rowGlow, rowGlow)
      gl.uniform1i(U.rowCount, rows.length)
      gl.uniform3fv(U.circles, circleBuf)
      gl.uniform1fv(U.circleGlow, circleGlow)
      gl.uniform1i(U.circleCount, circles.length)
      gl.uniform4fv(U.ripple, ripples)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    repaintRef.current = () => {
      if (reduced) paint()
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
      if (!reduced && !raf && visible && !document.hidden) {
        lastWall = wall()
        raf = requestAnimationFrame(frame)
      }
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
    if (!reduced) wake()

    return () => {
      repaintRef.current = () => {}
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
  }, [interactive, crosshair, reduced, generation, maxDpr])

  const line = "color-mix(in srgb, " + P.lineColor + " " + Math.round(P.lineOpacity * 100) + "%, transparent)"

  return (
    <section
      ref={rootRef}
      className={
        "relative w-full overflow-hidden " + (interactive ? (crosshair ? "cursor-crosshair " : "") + "touch-pan-y " : "") + className
      }
      style={{ height, background: P.slateColor }}
      aria-label="A grainy mesh gradient under hairline drafting guides"
    >
      {failed ? (
        // No WebGL2: a still print of the same sheet beats a flat box.
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(28% 18% at 0% 12%, " + P.skyColor + " 0%, transparent 100%)," +
              "radial-gradient(30% 18% at 88% 100%, " + P.skyColor + " 0%, transparent 100%)," +
              "radial-gradient(55% 45% at 0% 100%, " + P.inkColor + " 0%, " + P.navyColor + " 40%, transparent 100%)," +
              "radial-gradient(50% 35% at 44% 55%, " + P.royalColor + " 0%, transparent 100%)," +
              "radial-gradient(60% 30% at 0% 48%, " + P.royalColor + " 0%, transparent 100%)," +
              "radial-gradient(25% 15% at 84% 64%, " + P.lilacColor + " 0%, transparent 100%)," +
              P.slateColor,
          }}
        >
          {cleanGuides(P.columns).map((v, i) => (
            <div key={"c" + i} className="absolute inset-y-0 w-px" style={{ left: v * 100 + "%", background: line }} />
          ))}
          {cleanGuides(P.rows).map((v, i) => (
            <div key={"r" + i} className="absolute inset-x-0 h-px" style={{ top: v * 100 + "%", background: line }} />
          ))}
        </div>
      ) : (
        <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 block h-full w-full" />
      )}
      {crosshair && interactive && !failed ? (
        <div
          ref={readoutRef}
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 z-20 whitespace-pre rounded-sm px-1.5 py-0.5 font-mono text-[10px] tracking-[0.12em] tabular-nums"
          style={{ opacity: 0, color: P.lineColor, background: "color-mix(in srgb, " + P.inkColor + " 35%, transparent)" }}
        />
      ) : null}
      {children ? (
        <div className="pointer-events-none relative z-10 flex h-full w-full flex-col">{children}</div>
      ) : null}
    </section>
  )
}
