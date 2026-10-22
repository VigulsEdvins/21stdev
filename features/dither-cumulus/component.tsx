"use client"

import * as React from "react"

/**
 * Dither Cumulus — a sky of pixel-art cumulus, printed with an ordered dither.
 *
 * One fragment pass, rendered at *cell* resolution and scaled up with
 * `image-rendering: pixelated`, so every cloud pixel is a crisp square and the
 * shader only pays for the cells it draws.
 *
 * Each cloud is a heightfield: a union of hemispheres at three sizes (the
 * cauliflower billows) riding on a slow fbm mass that decides where cloud is
 * at all. Because the height really is a stack of domes, its gradient is a real
 * surface normal — the billows are lit by a light you can move, they cast
 * shadows onto each other by marching a few steps toward that light, and the
 * edges facing it pick up a silver lining. Three of these decks drift at
 * different depths and fade into the sky behind them.
 *
 * Everything collapses to one tone per cell, then an ordered Bayer dither
 * picks between two neighbouring colours of a six-step palette — the
 * checkerboard fringe of the reference art.
 *
 * Hover moves the light (and the dithered moon that is its source). Drag to
 * scrub the sky — the decks part in parallax and coast when released. Click to
 * blow a gust that billows the clouds outward. Left alone, the light wanders.
 *
 * Self-contained: raw WebGL2, React is the only import. No textures, no image
 * assets, no CSS file. Sizes from its own box and releases every GL object on
 * unmount.
 */

export type CumulusParams = {
  // the print
  /** CSS px per cell. Everything is drawn on this grid. */
  pixel: number
  /** Bayer matrix size: 0 (none, hard posterise), 2, 4 or 8. */
  dither: number
  /** Tone contrast around mid-grey before dithering. */
  contrast: number
  // the clouds
  /** How much of the sky is cloud, 0..1. */
  coverage: number
  /** Overall zoom. Larger is bigger clouds. */
  scale: number
  /** How lumpy the billows are: weight of the two smaller dome octaves. */
  billow: number
  /** Cloud decks, back to front (1..3). */
  layers: number
  /** Width of the dithered fringe at a cloud's edge. */
  edge: number
  /** How fast the cloud masses grow and dissolve. */
  morph: number
  /** Wind speed (sky widths per second) and heading (radians, 0 = east). */
  wind: number
  windAngle: number
  // the light
  /** Height of the light above the cloud tops, radians. Low is dramatic. */
  sunElevation: number
  /** How strongly the billows' normals catch the light. */
  relief: number
  /** Billows shadowing billows. */
  shadow: number
  ambient: number
  /** The bright rim on edges facing the light. */
  rim: number
  /** Tone of a fully shadowed cloud, 0..1 along the palette. */
  shadeTone: number
  /** Radius of the moon / sun disc, sky heights. 0 hides it. */
  orb: number
  glow: number
  // the sky
  /** Sky tone far from / near the light, 0..1 along the palette. */
  skyLow: number
  skyHigh: number
  /** Far decks fade toward the sky. */
  haze: number
  // the hand
  parallax: number
  /** Strength of a click gust. */
  gust: number
  /** How long a flung sky coasts. Higher stops sooner. */
  friction: number
  // post
  speed: number
  seed: number
  // palette, dark to bright
  nightColor: string
  deepColor: string
  duskColor: string
  mistColor: string
  shadeColor: string
  cloudColor: string
}

export const CUMULUS_DEFAULTS: CumulusParams = {
  pixel: 3,
  dither: 4,
  contrast: 1.05,

  coverage: 0.4,
  scale: 1,
  billow: 1,
  layers: 3,
  edge: 0.025,
  morph: 0.012,
  wind: 0.018,
  windAngle: 0.5,

  sunElevation: 0.62,
  relief: 1.2,
  shadow: 1,
  ambient: 0.25,
  rim: 0.55,
  shadeTone: 0.42,
  orb: 0.045,
  glow: 0.35,

  skyLow: 0.06,
  skyHigh: 0.4,
  haze: 0.55,

  parallax: 1,
  gust: 1,
  friction: 2.4,

  speed: 1,
  seed: 7,

  nightColor: "#0a1626",
  deepColor: "#15314a",
  duskColor: "#2d5872",
  mistColor: "#7c99a7",
  shadeColor: "#d2d6ca",
  cloudColor: "#fbfaef",
}

/** Overlays on the defaults. Named for the weather, not the numbers. */
export const CUMULUS_PRESETS: Record<string, Partial<CumulusParams>> = {
  nocturne: {},
  daybreak: {
    nightColor: "#1c3768", deepColor: "#3a68a8", duskColor: "#77a8da",
    mistColor: "#e8a993", shadeColor: "#fbd9bd", cloudColor: "#fffaf0",
    coverage: 0.34, skyLow: 0.1, skyHigh: 0.38, shadeTone: 0.55, sunElevation: 0.45, rim: 0.8, glow: 0.5, seed: 8,
  },
  ember: {
    nightColor: "#1a0a10", deepColor: "#4a1325", duskColor: "#9a2e2c",
    mistColor: "#de6c38", shadeColor: "#f5bf76", cloudColor: "#fff0d4",
    skyHigh: 0.36, sunElevation: 0.32, rim: 0.9, coverage: 0.3, windAngle: 0.1, seed: 21,
  },
  lilac: {
    nightColor: "#181230", deepColor: "#372964", duskColor: "#6a56a6",
    mistColor: "#b199d6", shadeColor: "#e9d8f1", cloudColor: "#fff8fd",
    dither: 8, skyHigh: 0.46, morph: 0.02, seed: 41,
  },
  storm: {
    nightColor: "#0a0c0f", deepColor: "#1b2026", duskColor: "#343c45",
    mistColor: "#5b6670", shadeColor: "#959ea4", cloudColor: "#d5d9da",
    coverage: 0.78, ambient: 0.18, shadow: 1.6, shadeTone: 0.28, orb: 0, glow: 0.15,
    wind: 0.05, windAngle: -0.25, morph: 0.03, seed: 13,
  },
  gameboy: {
    nightColor: "#0f380f", deepColor: "#0f380f", duskColor: "#306230",
    mistColor: "#306230", shadeColor: "#8bac0f", cloudColor: "#9bbc0f",
    pixel: 4, dither: 2, contrast: 1.15, seed: 29,
  },
}

const MAX_GUSTS = 4
/** A buffer bigger than this many cells gets coarser cells instead. */
const MAX_CELLS = 900_000

type Kind = "f" | "i" | "c"
type Slot = [keyof CumulusParams, Kind]

/** Which parameters reach the shader, and as what. `c` is a hex colour. */
const UNIFORMS: Slot[] = [
  ["dither", "i"], ["contrast", "f"],
  ["coverage", "f"], ["scale", "f"], ["billow", "f"], ["layers", "i"], ["edge", "f"], ["morph", "f"],
  ["sunElevation", "f"], ["relief", "f"], ["shadow", "f"], ["ambient", "f"], ["rim", "f"],
  ["shadeTone", "f"], ["orb", "f"], ["glow", "f"],
  ["skyLow", "f"], ["skyHigh", "f"], ["haze", "f"], ["parallax", "f"], ["gust", "f"], ["seed", "f"],
  ["nightColor", "c"], ["deepColor", "c"], ["duskColor", "c"],
  ["mistColor", "c"], ["shadeColor", "c"], ["cloudColor", "c"],
]

const uName = (k: string) => "u" + k[0].toUpperCase() + k.slice(1)
const glslType = (kind: Kind) => (kind === "c" ? "vec3" : kind === "i" ? "int" : "float")
const declare = (slots: Slot[]) =>
  slots.map(([k, kind]) => "uniform " + glslType(kind) + " " + uName(k) + ";").join("\n")

const VERT = `#version 300 es
void main(){
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uSun;
uniform vec2 uLook;
uniform vec2 uTravel;
uniform vec4 uGusts[${MAX_GUSTS}];
${declare(UNIFORMS)}
out vec4 frag;

float hash12(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec2 hash22(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash12(i), b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0)), d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p){
  float s = 0.0, a = 0.5;
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = r * p * 2.02 + 11.3; a *= 0.5; }
  return s / 0.9375;
}

// The tallest of the hemispheres seeded in the 3x3 cells around p. Centres sit
// in [0.15, 0.85] of their cell and radii stay under 1.1, so nothing outside
// the 3x3 can reach p. Height is in the same units as p: a real dome.
float domes(vec2 p){
  vec2 i = floor(p), f = fract(p);
  float m = 0.0;
  for (int y = -1; y <= 1; y++)
  for (int x = -1; x <= 1; x++) {
    vec2 o = vec2(float(x), float(y));
    vec2 g = i + o;
    vec2 c = o + 0.15 + 0.7 * hash22(g) - f;
    float r = 0.6 + 0.45 * hash12(g + 3.7);
    float q = dot(c, c) / (r * r);
    m = max(m, r * sqrt(max(1.0 - q, 0.0)));
  }
  return m;
}

// Deck k at p: x = height (negative is clear sky), y = the billows alone.
// The mass decides where cloud is; only the domes shape the surface, so a
// rising mass never reads as one long slope shadowing itself.
vec2 cloud(vec2 p, float k){
  vec2 o = vec2(k * 11.7 + uSeed * 1.37, k * 5.3 - uSeed * 0.71);
  float m = fbm(p * 0.4 + o * 0.61 + vec2(uTime * uMorph, -uTime * uMorph * 0.6));
  float cov = (m - 0.5) * 3.2 + (uCoverage - 0.5) * 1.6 - (1.0 - k / 2.0) * 0.18;
  if (cov < -0.75) return vec2(-1.0, 0.0);
  float b = domes(p + o) * 0.75
          + domes(p * 2.13 + o * 1.3 + 4.1) * 0.22 * uBillow
          + domes(p * 4.37 + o * 1.7 + 9.2) * 0.08 * uBillow;
  return vec2(cov * 0.45 + b - 0.8, b);
}

vec3 pal(int i){
  if (i <= 0) return uNightColor;
  if (i == 1) return uDeepColor;
  if (i == 2) return uDuskColor;
  if (i == 3) return uMistColor;
  if (i == 4) return uShadeColor;
  return uCloudColor;
}

float bayer2(vec2 a){ a = floor(a); return fract(a.x * 0.5 + a.y * a.y * 0.75); }
float bayer4(vec2 a){ return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a){ return bayer4(0.5 * a) * 0.25 + bayer2(a); }
float threshold(vec2 c){
  if (uDither >= 8) return bayer8(c) + 0.5 / 64.0;
  if (uDither >= 4) return bayer4(c) + 0.5 / 16.0;
  if (uDither >= 2) return bayer2(c) + 0.125;
  return 0.5;
}

void main(){
  vec2 cell = floor(gl_FragCoord.xy);
  float minSide = min(uRes.x, uRes.y);
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / minSide;
  vec2 sun = (uSun * uRes - 0.5 * uRes) / minSide;

  // ---- sky: darkest far from the light, a dithered halo around it -----------
  vec2 toSun = sun - uv;
  float sunDist = length(toSun);
  float tone = mix(uSkyLow, uSkyHigh, exp(-sunDist * 1.1));
  tone += uGlow * 0.5 * exp(-sunDist * sunDist / max(uOrb * uOrb * 30.0, 0.004));
  if (uOrb > 0.0) {
    float disc = 1.0 - smoothstep(uOrb - 0.004, uOrb + 0.004, sunDist);
    tone = mix(tone, 1.02, disc);
  }

  float sky = tone;

  // ---- gusts: a ring that shoves the decks outward and puffs them up --------
  vec2 shove = vec2(0.0);
  float puff = 0.0;
  for (int i = 0; i < ${MAX_GUSTS}; i++) {
    vec4 g = uGusts[i];
    float age = uTime - g.z;
    if (g.w <= 0.0 || age < 0.0 || age > 2.6) continue;
    vec2 at = (g.xy * uRes - 0.5 * uRes) / minSide;
    vec2 dv = uv - at;
    float dist = length(dv);
    float front = age * 0.55;
    float w = 0.06 + age * 0.1;
    float k = exp(-pow((dist - front) / w, 2.0)) * (1.0 - age / 2.6) * g.w * uGust;
    shove += dv / max(dist, 1e-3) * k * 0.09;
    puff += k * 0.1;
  }

  // ---- the decks, far to near ---------------------------------------------
  float elev = clamp(uSunElevation, 0.05, 1.5);
  float slope = tan(elev);
  int decks = clamp(uLayers, 1, 3);
  for (int L = 0; L < 3; L++) {
    if (L < 3 - decks) continue;
    float depth = (float(L) + 1.0) / 3.0;               // 1 = nearest
    float sc = uScale * 1.5 * mix(2.0, 1.0, depth);     // far decks are smaller
    vec2 q = uv - uTravel * mix(0.3, 1.0, depth) - uLook * uParallax * 0.035 * depth - shove * depth;
    vec2 p = q * sc;
    float k = float(L);
    vec2 here = cloud(p, k);
    float h = here.x + puff * depth;
    if (h < -uEdge) continue;
    float alpha = smoothstep(-uEdge, uEdge, h);

    // surface normal from the billows
    float eps = 0.02;
    float b = here.y;
    vec2 grad = vec2(cloud(p + vec2(eps, 0.0), k).y - b, cloud(p + vec2(0.0, eps), k).y - b) / eps;
    vec3 n = normalize(vec3(-grad * uRelief, 1.0));

    // the light sits over the moon; nearby billows are lit from the side
    vec2 dir = normalize(sun - q + vec2(1e-4));
    vec3 Lv = normalize(vec3(dir * cos(elev), sin(elev)));
    float dif = max(dot(n, Lv), 0.0);

    // billows shadow billows: walk toward the light, see what stands taller
    float occ = 0.0;
    for (int s = 1; s <= 4; s++) {
      float d = float(s) * 0.09;
      vec2 there = cloud(p + dir * d, k);
      if (there.x > 0.0) occ += max(there.y - (b + d * slope), 0.0);
    }
    float lit = dif * exp(-occ * uShadow * 4.0);

    // silver lining on thin edges that face the light
    float thin = 1.0 - smoothstep(0.0, 0.22, h);
    float facing = max(dot(-normalize(grad + vec2(1e-5)), dir), 0.0);
    float rim = thin * facing * uRim;

    float light = clamp(uAmbient + (1.0 - uAmbient) * lit + rim, 0.0, 1.2);
    float c = mix(uShadeTone, 1.0, light);
    c = mix(c, sky + 0.2, (1.0 - depth) * uHaze);     // aerial perspective
    tone = mix(tone, c, alpha);
  }

  // ---- print: one tone, dithered between two palette steps ------------------
  tone = clamp((tone - 0.5) * uContrast + 0.5, 0.0, 1.0);
  float x = tone * 5.0;
  float lo = floor(x);
  int idx = int(lo) + ((x - lo) > threshold(cell) ? 1 : 0);
  frag = vec4(pal(clamp(idx, 0, 5)), 1.0);
}`

// #region sky
/** "#f0a" / "#ff00aa" → [r, g, b] in 0..1. Anything unparsable is black. */
export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.trim().replace(/^#/, "")
  if (h.length === 3) h = h.split("").map((c) => c + c).join("")
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return [0, 0, 0]
  const v = parseInt(h, 16)
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255]
}

/**
 * The drawing buffer, in cells. Cells are `pixel` CSS px square, never under
 * one, and a box too big for `maxCells` gets coarser cells rather than a
 * buffer the GPU chokes on. Returns [columns, rows, effective cell size].
 */
export function cellGrid(cssW: number, cssH: number, pixel: number, maxCells: number): [number, number, number] {
  const w = Math.max(cssW, 1)
  const h = Math.max(cssH, 1)
  let size = Math.max(Number.isFinite(pixel) ? pixel : 1, 1)
  const need = (w / size) * (h / size)
  if (need > maxCells) size *= Math.sqrt(need / maxCells)
  return [Math.max(Math.round(w / size), 1), Math.max(Math.round(h / size), 1), size]
}

/** The idle light: drifts along the top of the sky, never closing a loop. */
export function sunDrift(t: number) {
  const x = 0.5 + 0.34 * Math.sin(t * 0.13 + 2.4) + 0.08 * Math.sin(t * 0.051)
  const y = 0.8 + 0.1 * Math.cos(t * 0.11) + 0.04 * Math.cos(t * 0.037 + 1.1)
  return [Math.min(Math.max(x, 0.06), 0.94), Math.min(Math.max(y, 0.55), 0.95)]
}

/** A flung sky slows exponentially; under a hair it stops. */
export function coast(v: number, dt: number, friction: number) {
  const next = v * Math.exp(-Math.max(dt, 0) * Math.max(friction, 0))
  return Math.abs(next) < 1e-4 ? 0 : next
}

/** A press that barely moved and let go quickly is a click, not a drag. */
export function isTap(dx: number, dy: number, ms: number) {
  return Math.hypot(dx, dy) < 6 && ms < 450
}
// #endregion

export type DitherCumulusProps = {
  /**
   * Explicit height. The canvas fills this box, so it must be a definite
   * length — "100%" only works if every ancestor has one too.
   */
  height?: string
  /** A named palette + weather, layered over the defaults. */
  preset?: keyof typeof CUMULUS_PRESETS
  /** Overrides layered over the preset. Live — never restarts WebGL. */
  params?: Partial<CumulusParams>
  /** Hover moves the light, drag scrubs the sky, click blows a gust. */
  interactive?: boolean
  /** "scroll" keeps vertical page scrolling on touch; "draw" takes the gesture. */
  touch?: "scroll" | "draw"
  /** Content laid over the sky. Pointer events pass through unless opted in. */
  children?: React.ReactNode
  className?: string
}

export default function DitherCumulus({
  height = "100svh",
  preset = "nocturne",
  params,
  interactive = true,
  touch = "scroll",
  children,
  className = "",
}: DitherCumulusProps) {
  const rootRef = React.useRef<HTMLElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const [failed, setFailed] = React.useState(false)
  const [generation, setGeneration] = React.useState(0)
  const [reduced, setReduced] = React.useState(false)
  const [dragging, setDragging] = React.useState(false)

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])

  // Defaults < preset < explicit params.
  const P = React.useMemo<CumulusParams>(
    () => ({ ...CUMULUS_DEFAULTS, ...(CUMULUS_PRESETS[preset] ?? {}), ...(params ?? {}) }),
    [preset, params],
  )
  // The loop reads through a ref, so tuning a value never restarts WebGL.
  const paramsRef = React.useRef(P)
  paramsRef.current = P
  // A reduced-motion sky only paints on demand; a param change is a demand.
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
        console.error("dither-cumulus:", gl.getShaderInfoLog(s))
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
      console.error("dither-cumulus:", gl.getProgramInfoLog(program))
      gl.deleteProgram(program)
      setFailed(true)
      return
    }

    const loc = (n: string) => gl.getUniformLocation(program, n)
    const tuned = UNIFORMS.map(([k, kind]) => [loc(uName(k)), k, kind] as const)
    const U = {
      res: loc("uRes"), time: loc("uTime"), sun: loc("uSun"),
      look: loc("uLook"), travel: loc("uTravel"), gusts: loc("uGusts"),
    }
    const vao = gl.createVertexArray()

    // ---- sizing: the buffer is the cell grid, CSS scales it up ---------------
    let cssW = 1
    let cssH = 1
    const fit = () => {
      cssW = Math.max(canvas.clientWidth, 1)
      cssH = Math.max(canvas.clientHeight, 1)
      const [w, h] = cellGrid(cssW, cssH, paramsRef.current.pixel, MAX_CELLS)
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
    }
    const resize = () => {
      fit()
      if (reduced) paint()
    }

    // Reduced motion freezes the clock; the hand still moves the light.
    const FROZEN = 40
    const t0 = performance.now()
    const clock = () => (reduced ? FROZEN : ((performance.now() - t0) / 1000) * paramsRef.current.speed)
    let lastClock = clock()

    // ---- the hand -----------------------------------------------------------
    let sunX = 0.22
    let sunY = 0.82
    let targetX = sunX
    let targetY = sunY
    let lookX = 0
    let lookY = 0
    let inside = false
    let lastTouched = -1e9
    let travelX = 0
    let travelY = 0
    let velX = 0
    let velY = 0
    const gusts = new Float32Array(MAX_GUSTS * 4)
    let gustNext = 0

    let drag: { id: number; x: number; y: number; lastX: number; lastY: number; at: number; last: number } | null = null

    const frac = (e: PointerEvent): [number, number] => {
      const r = canvas.getBoundingClientRect()
      return [
        Math.min(Math.max((e.clientX - r.left) / Math.max(r.width, 1), 0), 1),
        Math.min(Math.max(1 - (e.clientY - r.top) / Math.max(r.height, 1), 0), 1),
      ]
    }
    const touchedNow = () => {
      inside = true
      lastTouched = performance.now() / 1000
    }

    const onMove = (e: PointerEvent) => {
      if (!interactive) return
      touchedNow()
      if (drag && e.pointerId === drag.id) {
        // One sky width per sky width dragged; the near deck tracks the finger.
        const minSide = Math.min(cssW, cssH)
        const dx = (e.clientX - drag.lastX) / minSide
        const dy = -(e.clientY - drag.lastY) / minSide
        const now = performance.now()
        const dt = Math.max((now - drag.last) / 1000, 1 / 240)
        travelX += dx
        travelY += dy
        velX = velX * 0.6 + (dx / dt) * 0.4
        velY = velY * 0.6 + (dy / dt) * 0.4
        drag.lastX = e.clientX
        drag.lastY = e.clientY
        drag.last = now
      } else {
        ;[targetX, targetY] = frac(e)
      }
      if (reduced) paint()
    }
    const onLeave = () => {
      inside = false
    }
    const onDown = (e: PointerEvent) => {
      if (!interactive || e.button > 0) return
      // Let buttons and links in the overlay keep their clicks.
      if ((e.target as HTMLElement | null)?.closest("a,button,input,textarea,select,label,[role=button]")) return
      touchedNow()
      const now = performance.now()
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY, at: now, last: now }
      velX = 0
      velY = 0
      try {
        root.setPointerCapture(e.pointerId)
      } catch {
        // a synthetic or already-released pointer; dragging still works inside
      }
      setDragging(true)
    }
    const onUp = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return
      const tap = isTap(e.clientX - drag.x, e.clientY - drag.y, performance.now() - drag.at)
      // A release after holding still should not fling.
      if (performance.now() - drag.last > 80) {
        velX = 0
        velY = 0
      }
      drag = null
      setDragging(false)
      if (tap && !reduced) {
        const [x, y] = frac(e)
        gusts.set([x, y, clock(), 1], gustNext * 4)
        gustNext = (gustNext + 1) % MAX_GUSTS
        velX = 0
        velY = 0
      }
      if (reduced) {
        velX = 0
        velY = 0
        paint()
      }
    }

    root.addEventListener("pointermove", onMove)
    root.addEventListener("pointerdown", onDown)
    root.addEventListener("pointerup", onUp)
    root.addEventListener("pointercancel", onUp)
    root.addEventListener("pointerleave", onLeave)

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
      fit()
      const t = clock()
      const dt = Math.min(Math.max(t - lastClock, 0), 0.1)
      lastClock = t

      // The wind always blows; a fling rides on top and coasts out.
      if (!reduced) {
        travelX += Math.cos(p.windAngle) * p.wind * dt
        travelY += Math.sin(p.windAngle) * p.wind * dt
        if (!drag) {
          travelX += velX * dt
          travelY += velY * dt
          velX = coast(velX, dt, p.friction)
          velY = coast(velY, dt, p.friction)
        }
      }

      // With no hand on it the light wanders, so the sky never sits dead.
      const idle = !interactive || !inside || performance.now() / 1000 - lastTouched > 6
      const [gx, gy] = sunDrift(t)
      const wantX = idle ? gx : targetX
      const wantY = idle ? gy : targetY
      const k = reduced ? 1 : 1 - Math.exp(-dt * (idle ? 0.8 : 6))
      sunX += (wantX - sunX) * k
      sunY += (wantY - sunY) * k
      const lk = interactive ? 1 : 0
      lookX += ((wantX - 0.5) * 2 * lk - lookX) * k
      lookY += ((wantY - 0.5) * 2 * lk - lookY) * k

      gl.useProgram(program)
      gl.bindVertexArray(vao)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, canvas.width, canvas.height)
      for (const [l, key, kind] of tuned) {
        const v = p[key]
        if (kind === "c") gl.uniform3fv(l, hexToRgb(v as string))
        else if (kind === "i") gl.uniform1i(l, Number(v) | 0)
        else gl.uniform1f(l, v as number)
      }
      gl.uniform2f(U.res, canvas.width, canvas.height)
      gl.uniform1f(U.time, t)
      gl.uniform2f(U.sun, sunX, sunY)
      gl.uniform2f(U.look, lookX, lookY)
      gl.uniform2f(U.travel, travelX, travelY)
      gl.uniform4fv(U.gusts, gusts)
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
        lastClock = clock()
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
    wake()

    return () => {
      cancelAnimationFrame(raf)
      repaintRef.current = () => {}
      observer.disconnect()
      io.disconnect()
      document.removeEventListener("visibilitychange", wake)
      root.removeEventListener("pointermove", onMove)
      root.removeEventListener("pointerdown", onDown)
      root.removeEventListener("pointerup", onUp)
      root.removeEventListener("pointercancel", onUp)
      root.removeEventListener("pointerleave", onLeave)
      canvas.removeEventListener("webglcontextlost", onLost)
      canvas.removeEventListener("webglcontextrestored", onRestored)
      gl.deleteVertexArray(vao)
      gl.deleteProgram(program)
    }
  }, [interactive, reduced, generation])

  return (
    <section
      ref={rootRef}
      className={
        "relative w-full select-none overflow-hidden " +
        (interactive ? (dragging ? "cursor-grabbing " : "cursor-grab ") : "") +
        (touch === "draw" ? "touch-none " : "touch-pan-y ") +
        className
      }
      style={{ height, background: P.nightColor }}
      aria-label="Pixel-art cumulus clouds printed with an ordered dither"
    >
      {failed ? (
        // No WebGL2: a still picture of the same sky beats a blank box.
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(38% 30% at 22% 18%, " + P.cloudColor + " 0%, " + P.shadeColor + " 45%, transparent 72%)," +
              "radial-gradient(45% 34% at 78% 78%, " + P.shadeColor + " 0%, " + P.mistColor + " 50%, transparent 75%)," +
              "radial-gradient(70% 60% at 30% 30%, " + P.duskColor + " 0%, " + P.deepColor + " 60%, " + P.nightColor + " 100%)",
          }}
        />
      ) : (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="absolute inset-0 block h-full w-full"
          // The buffer is one texel per cell; the browser must not blur it.
          style={{ imageRendering: "pixelated", maxWidth: "none" }}
        />
      )}
      {children ? (
        <div className="pointer-events-none relative z-10 flex h-full w-full flex-col">{children}</div>
      ) : null}
    </section>
  )
}
