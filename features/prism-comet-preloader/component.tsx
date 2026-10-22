"use client"

// Prism Comet Preloader — a cinematic loading gate built like a motion
// designer's effects stack, with the load progress as the interpolation
// slider. One sheet of iridescent fractal noise hangs from a flare at the top
// of the frame. As the page loads, that same sheet is pushed through four
// passes, live: it curls into polar coordinates and blooms, spins half a turn
// and gathers into a sphere-warped flame, tips over into a radial-blurred
// comet, and a four-point star ignites at its head. At 100% the star swoops to
// the centre, swells and turns in 3D into an iridescent star-shaped portal,
// and the camera pushes through it onto the page.
//
// One file, React only, no assets. Every frame is a single fullscreen WebGL
// fragment shader: the passes are not cross-fades between pictures but one
// continuous coordinate rig (cartesian → fan → ring → cone → comet), so every
// streak you see is the same streak, bent. The HUD is DOM over the canvas,
// styled by a scoped <style> where every rule is .pcp- prefixed.

import * as React from "react"

export interface PrismCometPalette {
  /** The night behind everything. */
  background: string
  /** Deep body of the streaks, the speed lines and the portal's membrane. */
  blue: string
  /** Mid tone of the streaks and the portal's second band. */
  violet: string
  /** Hot tone of the streaks, the star's halo and the portal's first band. */
  magenta: string
  /** Flare tint, chromatic fringe and the portal's rim. */
  cyan: string
  /** Sparks and the warm side of the chromatic fringe. */
  gold: string
}

export interface PrismCometPreloaderProps {
  /** Content revealed through the portal. Ignored while `loop` is set. */
  children?: React.ReactNode
  /** Run forever as a showcase: children are never revealed, onComplete never fires. */
  loop?: boolean
  /**
   * Real loading progress, 0–100. Leave undefined to run the built-in
   * simulated load over `durationMs`. The star waits for 100.
   */
  progress?: number
  /** Length of the simulated load. Defaults to 6500ms. */
  durationMs?: number
  /** Wordmark set under the portal. */
  word?: string
  /** Line under the wordmark. */
  caption?: string
  /**
   * Labels for the passes, announced to screen readers as the morph reaches
   * each one. The last is announced once loaded.
   */
  passes?: string[]
  /** Colour overrides (hex), merged over the defaults. */
  palette?: Partial<PrismCometPalette>
  /** Brightness of the light, 0.4–2. */
  intensity?: number
  /** Speed of the flow, 0–3. 0 freezes the noise but not the load. */
  speed?: number
  /** Render scale, 0.35–1. The light is soft, so the default 0.6 costs a third of the pixels and looks the same. */
  quality?: number
  /** The faint compositing grid behind the load. Defaults to true. */
  grid?: boolean
  /** The loading counter. Defaults to true. */
  hud?: boolean
  /** Film grain over the frame. Defaults to true. */
  grain?: boolean
  /** Face for the wordmark. The default stack never fetches anything. */
  fontFamily?: string
  /** Root height. A definite length, never a percentage. */
  height?: string
  /** Fired once, after the camera has passed through the portal. */
  onComplete?: () => void
  /** Extra root class names. */
  className?: string
}

const DEFAULT_PALETTE: PrismCometPalette = {
  background: "#03030b",
  blue: "#2c55ff",
  violet: "#8a3dff",
  magenta: "#ff3fc8",
  cyan: "#86e6ff",
  gold: "#ffc35c",
}

const DEFAULT_PASSES = [
  "Fractal noise\nOptical flare",
  "Polar coordinates",
  "Sphere warp\nMesh warp",
  "Radial blur\nDisplacement\nWave warp",
  "Final",
]

const DISPLAY_STACK = '"Space Grotesk", "Sora", "Inter", "Helvetica Neue", Arial, sans-serif'
const MONO_STACK = '"JetBrains Mono", "SF Mono", ui-monospace, Menlo, Consolas, monospace'

// A four-point star in a 2 × 2 box centred on the origin (the no-WebGL fallback).
const SPARK = "M0-1C.07-.24.24-.07 1 0 .24.07.07.24 0 1-.07.24-.24.07-1 0-.24-.07-.07-.24 0-1Z"

const IGNITE_MS = 2600
const HOLD_MS = 3200
const LIFT_MS = 1700

type Phase = "load" | "ignite" | "reveal" | "lift" | "done"

// #region timeline
// Pure helpers, lifted out and executed by tests/prism-comet-preloader.test.mjs.

const TAU = Math.PI * 2
// Where the portal settles: centre (shader units, y up), radius and resting turn.
const HERO_Y = 0.1
const HERO_R = 0.28
const HERO_ROT = 0.38
// Size of the comet's head star while it rides the comet.
const HEAD_R = 0.05

const clamp01 = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const sm = (t: number) => t * t * (3 - 2 * t)

// Surges and stalls like a real load instead of a linear tween. [time, progress] knots.
const KNOTS = [
  [0, 0],
  [0.16, 0.22],
  [0.27, 0.26],
  [0.55, 0.62],
  [0.66, 0.66],
  [0.84, 0.9],
  [1, 1],
]

export function pcpSimulated(t: number) {
  if (t <= 0) return 0
  if (t >= 1) return 1
  for (let i = 0; i < KNOTS.length - 1; i++) {
    const [t0, p0] = KNOTS[i]
    const [t1, p1] = KNOTS[i + 1]
    if (t <= t1) return p0 + (p1 - p0) * sm((t - t0) / (t1 - t0))
  }
  return 1
}

export function pcpEase(t: number) {
  const x = clamp01(t)
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

// Load progress (0–1) → position in the effects stack (0–4). Each quarter of
// the load holds its pass for a beat, then morphs into the next one:
// 0 noise · 1 polar · 2 sphere · 3 comet · 4 comet with its star.
export function pcpMorph(p: number) {
  const x = clamp01(p) * 4
  const k = Math.min(3, Math.floor(x))
  return k + sm(clamp01((x - k - 0.3) / 0.7))
}

// Which pass label is showing at stack position m, out of n labels.
export function pcpPass(m: number, n: number) {
  if (n < 1) return -1
  const x = Math.min(4, Math.max(0, m))
  return Math.min(n - 1, Math.round((x / 4) * (n - 1)))
}

// Portrait frames zoom out so the bloom and the comet still fit across.
export function pcpView(aspect: number) {
  const zoom = Math.max(1, 0.92 / Math.max(aspect, 0.1))
  return { zoom, w: aspect * zoom, h: zoom }
}

// Where the comet's head rides, the direction its tail points (radians), and
// how far that tail can run before it leaves the frame.
export function pcpHead(aspect: number) {
  const v = pcpView(aspect)
  const x = -Math.min(v.w * 0.3, 0.52)
  const y = -v.h * 0.2
  const tail = lerp(1.05, 0.5, clamp01((aspect - 0.5) / 1))
  const room = Math.min((v.w / 2 - x) / Math.cos(tail), (v.h / 2 - y) / Math.sin(tail))
  return { x, y, tail, room }
}

// The coordinate rig at stack position m. The sheet is mapped through a fan:
// a pixel's angle around the apex, relative to beta, picks the column (u) and
// its distance past rho0 picks the depth (v). A fan with a tiny opening and a
// far apex is just the flat sheet; open it to a full turn with the apex on the
// sheet's top edge and it is polar coordinates. Everything between is a morph.
export function pcpRig(m: number, aspect: number) {
  const { zoom, w, h } = pcpView(aspect)
  const s1 = sm(clamp01(m))
  const s2 = sm(clamp01(m - 1))
  const s3 = sm(clamp01(m - 2))
  const s4 = sm(clamp01(m - 3))

  // 0 → 1 · polar coordinates: the hanging sheet curls into a fan and closes into a ring
  let phi = Math.max(0.02, s1 * TAU)
  const rho0 = ((1 - s1) * w) / phi
  let ax = 0
  let ay = (h / 2) * (1 - s1) + rho0
  let beta = -Math.PI / 2
  let kv = lerp(1 / h, 2.6, s1)

  // 1 → 2 · sphere + mesh warp: the ring spins half a turn and gathers upward into a flame
  beta += s2 * Math.PI
  phi = lerp(phi, 0.85, s2)
  ay = lerp(ay, -0.3, s2)
  kv = lerp(kv, 1.45, s2)

  // 2 → 3 · radial blur + wave warp: the flame tips over into a comet
  const head = pcpHead(aspect)
  beta = lerp(beta, head.tail, s3)
  phi = lerp(phi, 0.55, s3)
  ax = lerp(ax, head.x, s3)
  ay = lerp(ay, head.y, s3)
  // long, but ending inside the frame: the sheet's curtains run out by v ≈ 0.8
  kv = lerp(kv, Math.max(0.75, 0.8 / (head.room * 0.92)), s3)

  // the fan's side edges soften in, vanish while the ring is closed, and come back as it opens
  const closed = sm(clamp01((phi / TAU - 0.9) / 0.1))
  return {
    zoom,
    ax,
    ay,
    beta,
    phi,
    rho0,
    kv,
    vf: lerp(1, 0.32, s3),
    // a narrow fan crushes the noise across it into grit; sample less of the sheet as it narrows
    narrow: lerp(lerp(1, 0.55, s2), 0.3, s3),
    wave: s3,
    bulge: s2 * (1 - s3),
    edge: clamp01(s1 * 4) * (1 - closed),
    closed,
    star: s4,
    lines: s4,
  }
}

// The ignition at 100% (i: 0–1): the head star swoops from the comet's head to
// the centre on a curve, swells, spins a full turn and a bit, and turns from a
// sparkle into the portal while the tail retracts into it.
export function pcpIgnite(i: number, aspect: number) {
  const head = pcpHead(aspect)
  const x = clamp01(i)
  const e = pcpEase(x)
  const cx = head.x * 0.15 + 0.22
  const cy = head.y - 0.1
  const k = 1 - e
  return {
    x: k * k * head.x + 2 * k * e * cx + e * e * 0,
    y: k * k * head.y + 2 * k * e * cy + e * e * HERO_Y,
    r: lerp(HEAD_R, HERO_R, sm(clamp01((x - 0.08) / 0.8))),
    rot: lerp(0, HERO_ROT + TAU, e),
    mode: sm(clamp01((x - 0.3) / 0.55)),
    comet: 1 - sm(clamp01((x - 0.05) / 0.5)),
    retract: sm(clamp01(x / 0.5)),
    lines: 1 - sm(clamp01((x - 0.4) / 0.4)),
    bloom: Math.exp(-Math.pow((x - 0.32) / 0.08, 2)),
  }
}

// "#rgb" / "#rrggbb" → [r, g, b] in 0–1, or null for anything else.
export function pcpHex(s: string) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(s).trim())
  if (!m) return null
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1]
  return [0, 2, 4].map((o) => parseInt(h.slice(o, o + 2), 16) / 255)
}
// #endregion

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`

const FRAG = `
precision highp float;

uniform vec2 uRes;
uniform float uZoom;
uniform float uTime;

uniform vec2 uApex;
uniform float uBeta;
uniform float uPhi;
uniform float uRho0;
uniform float uKv;
uniform float uVf;
uniform float uNarrow;
uniform float uWave;
uniform float uBulge;
uniform float uEdge;
uniform float uClosed;
uniform float uComet;
uniform float uLines;
uniform float uLineDir;

uniform vec2 uStarC;
uniform float uStarR;
uniform float uStarAmt;
uniform float uStarMode;
uniform float uStarRot;
uniform float uSwirl;
uniform vec2 uTilt;
uniform float uHoleOpen;
uniform float uFlash;
uniform float uBloom;

uniform vec3 uPtr;
uniform vec3 uBg;
uniform vec3 uBlue;
uniform vec3 uViolet;
uniform vec3 uMagenta;
uniform vec3 uCyan;
uniform vec3 uGold;
uniform float uExposure;
uniform float uGrain;

#define PI 3.14159265
#define TAU 6.28318531

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// Value noise that tiles every 'per' cells across x, so the sheet closes into
// a ring without a seam.
float pnoise(vec2 p, float per) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 w = f * f * (3.0 - 2.0 * f);
  float x0 = mod(i.x, per);
  float x1 = mod(i.x + 1.0, per);
  float a = hash(vec2(x0, i.y));
  float b = hash(vec2(x1, i.y));
  float c = hash(vec2(x0, i.y + 1.0));
  float d = hash(vec2(x1, i.y + 1.0));
  return mix(mix(a, b, w.x), mix(c, d, w.x), w.y);
}

float fbm(vec2 p, float per) {
  float s = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    s += amp * pnoise(p, per);
    p = p * 2.0 + vec2(0.0, 17.3);
    per *= 2.0;
    amp *= 0.5;
  }
  return s / 0.9375;
}

mat2 rot(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, s, -s, c);
}

// The one layer everything is made of: ridged fractal-noise curtains hanging
// from a flare along v = 0, in sheet space (u across 0–1, v down).
vec3 sheet(float u, float v, float t) {
  float X = u * 20.0;
  float vy = v * uVf;
  float w = fbm(vec2(X * 0.5, vy * 1.3 - t * 0.12), 10.0);
  float wave = sin(v * 9.0 - t * 2.2) * uWave * 0.9;
  float n = fbm(vec2(X + (w - 0.5) * 5.0 + wave, vy * 1.6 - t * 0.22), 20.0);
  float ridge = 1.0 - abs(n * 2.0 - 1.0);
  float ribbons = pow(ridge, mix(5.0, 2.6, uWave));
  float blob = pnoise(vec2(X * 0.25, v * 2.2 - t * 0.18), 5.0);
  float len = 0.5 + 0.42 * pnoise(vec2(X * 0.5, 3.7 + t * 0.03), 10.0);
  float body = smoothstep(len + 0.08, len - 0.42, v) * smoothstep(-0.02, 0.07, v);
  float I = ribbons * body * (0.3 + 1.25 * blob);

  float hue = pnoise(vec2(X * 0.5, v * 0.7 + t * 0.04 + 9.0), 10.0);
  vec3 c = mix(uBlue, uViolet, smoothstep(0.22, 0.58, hue));
  c = mix(c, uMagenta, smoothstep(0.6, 0.9, hue) * 0.85);
  vec3 col = c * I * 1.7;
  // chromatic fringe where a ribbon turns hot, warm on one side, cool on the other
  float fringe = smoothstep(0.42, 0.62, I) * smoothstep(1.0, 0.68, I);
  col += mix(uGold, uCyan, smoothstep(0.3, 0.7, hue)) * fringe * 0.55;
  col += vec3(1.0, 0.97, 0.93) * smoothstep(0.72, 1.25, I) * 1.4;

  // the optical flare the sheet hangs from
  float across = mix(1.0 - 0.7 * smoothstep(0.0, 0.5, abs(u - 0.5)), 1.0, uClosed);
  float flare = exp(-abs(v) * 6.5) * 0.6 + exp(-abs(v) * 30.0) * 1.3;
  col += mix(uCyan, vec3(1.0), 0.45) * flare * across;

  // sparks drifting down the curtains
  vec2 g = vec2(u * 64.0, v * 20.0 - t * 0.7);
  vec2 id = floor(g);
  id.x = mod(id.x, 64.0);
  float h = hash(id + 11.0);
  vec2 off = vec2(hash(id + 3.7), hash(id + 9.1)) - 0.5;
  float spark = step(0.93, h) * smoothstep(0.17, 0.0, length(fract(g) - 0.5 - off * 0.6));
  spark *= (0.55 + 0.45 * sin(t * 6.0 + h * 40.0)) * smoothstep(0.05, 0.2, v) * smoothstep(1.15, 0.6, v);
  col += mix(uGold, vec3(1.0), 0.35) * spark * 1.5;
  return col;
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec2 a = p * uZoom;
  float t = uTime;

  // the pointer is a displacement pass by hand: a small eddy that drags the light
  vec2 pd = a - uPtr.xy;
  float pr = dot(pd, pd);
  vec2 aw = uPtr.xy + rot(uPtr.z * 1.5 * exp(-pr * 14.0)) * pd * (1.0 - uPtr.z * 0.22 * exp(-pr * 24.0));

  vec3 col = uBg + uBlue * 0.05 * smoothstep(1.2, 0.0, length(p));
  float alpha = 1.0;

  if (uComet > 0.001) {
    vec2 d = aw - uApex;
    float rho = length(d);
    float ang = mod(atan(d.y, d.x) - uBeta + PI, TAU) - PI;
    float v = (rho - uRho0) * uKv;
    float u = ang / uPhi * (1.0 - uBulge * 0.45 * sin(clamp(v, 0.0, 1.0) * PI)) + 0.5;
    float mask = mix(1.0, smoothstep(0.0, 0.07, u) * smoothstep(1.0, 0.93, u), uEdge);
    col += sheet(0.5 + (u - 0.5) * uNarrow, v, t) * mask * uComet;
    col += mix(uViolet, uCyan, 0.5) * exp(-pr * 70.0) * uPtr.z * 0.1;
  }

  // speed lines streaming back past the comet
  if (uLines > 0.001) {
    vec2 dir = vec2(cos(uLineDir), sin(uLineDir));
    float along = dot(a, dir);
    float across = dot(a, vec2(-dir.y, dir.x)) * 38.0;
    float h = hash(vec2(floor(across), 3.1));
    float lane = fract(across) - 0.5;
    float seg = fract(along * 0.45 - t * (0.5 + h * 1.3) + h * 9.0);
    float line = step(0.8, h) * exp(-lane * lane * 40.0) * smoothstep(0.0, 0.08, seg) * smoothstep(0.42, 0.1, seg);
    col += mix(uBlue, uViolet, hash(vec2(h, 1.0))) * line * uLines * 0.85;
  }

  if (uStarAmt > 0.001) {
    vec2 q = a - uStarC;
    float den = max(0.2, 1.0 + dot(q, uTilt));
    q /= den;
    float rr = length(q);
    float R = max(uStarR, 0.0001);
    q = rot(uStarRot + uSwirl * min(rr / R, 3.0)) * q;
    float e = mix(0.46, 0.6, uStarMode);
    vec2 qa = abs(q) / R + 0.00001;
    float S = pow(pow(qa.x, e) + pow(qa.y, e), 1.0 / e);
    float ang = atan(q.y, q.x);

    // the sparkle riding the comet's head: a crisp white star in a magenta halo
    vec3 spark = vec3(1.0) * smoothstep(1.0, 0.5, S) * 2.4;
    spark += mix(uMagenta, uViolet, 0.35) * (0.7 / (1.0 + S * S * 0.5));
    spark += uMagenta * exp(-rr / R * 0.8) * 0.5;
    col += spark * uStarAmt * (1.0 - uStarMode);

    if (uStarMode > 0.001) {
      // the portal: a star-shaped hole in a dark membrane, white-hot inside,
      // with thin-film bands running round the rim
      float aa = 2.5 * uZoom * den / (uRes.y * R);
      float inside = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, S);
      float sf = S + 0.05 * sin(ang * 2.0 + t * 0.6) + 0.03 * sin(rr / R * 9.0 - t);
      vec3 ic = vec3(2.6, 2.55, 2.7);
      ic = mix(ic, mix(vec3(1.6), uMagenta * 1.9, 0.65), smoothstep(0.42, 0.66, sf));
      ic = mix(ic, uViolet * 1.7, smoothstep(0.66, 0.82, sf));
      ic = mix(ic, uCyan * 1.7, smoothstep(0.82, 0.94, sf));
      ic += vec3(0.9, 0.95, 1.0) * smoothstep(0.93, 1.0, S) * 1.3;

      float o = max(S - 1.0, 0.0);
      float fold = 0.5 + 0.5 * sin(ang * 2.0 + 0.7);
      vec3 mem = mix(uBg, uBlue, 0.1) * 1.3;
      mem += uBlue * (0.1 + 0.16 * fold) * exp(-o * 0.55);
      mem += uBlue * 0.45 * exp(-o * 4.5) + uCyan * 0.75 * exp(-o * 26.0);
      mem -= vec3(0.05) * exp(-o * 9.0) * (1.0 - exp(-o * 60.0));
      float rays = pow(0.5 + 0.5 * sin(ang * 6.0 + sin(ang * 3.0 + t * 0.2) * 1.6 + t * 0.05), 7.0);
      mem += mix(uCyan, vec3(1.0), 0.4) * rays * exp(-rr / R * 0.7) * 0.7;
      // light spilling past the rim
      mem += mix(uCyan, vec3(1.0), 0.6) * exp(-o * 7.0) * 0.32;

      vec3 portal = mix(max(mem, vec3(0.0)), ic, inside);
      col = mix(col, portal, uStarMode);
      float hole = inside * (1.0 - smoothstep(0.5, 0.88, S));
      alpha = 1.0 - uHoleOpen * hole * uStarMode;
    }
  }

  // the star catching: a bloom off the star, not a white frame
  float bd = length(a - uStarC);
  col += vec3(1.0, 0.95, 1.0) * uBloom * (exp(-bd * 18.0) * 3.0 + exp(-bd * 5.5) * 1.1 + 0.03);

  col = 1.0 - exp(-col * uExposure);
  col *= 1.0 - 0.5 * smoothstep(0.35, 1.25, length(p * vec2(0.9, 1.0)));
  col += (hash(gl_FragCoord.xy + fract(t * 7.0) * 311.0) - 0.5) * uGrain;
  col = mix(col, vec3(1.0), uFlash);
  alpha = mix(alpha, 1.0, uFlash);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0) * alpha, alpha);
}
`

const UNIFORMS = [
  "uRes", "uZoom", "uTime", "uApex", "uBeta", "uPhi", "uRho0", "uKv", "uVf", "uNarrow", "uWave", "uBulge", "uEdge",
  "uClosed", "uComet", "uLines", "uLineDir", "uStarC", "uStarR", "uStarAmt", "uStarMode", "uStarRot",
  "uSwirl", "uTilt", "uHoleOpen", "uFlash", "uBloom", "uPtr", "uBg", "uBlue", "uViolet", "uMagenta", "uCyan", "uGold",
  "uExposure", "uGrain",
] as const

function link(gl: WebGLRenderingContext, vert: string, frag: string) {
  const program = gl.createProgram()
  if (!program) return null
  for (const [type, source] of [
    [gl.VERTEX_SHADER, vert],
    [gl.FRAGMENT_SHADER, frag],
  ] as const) {
    const shader = gl.createShader(type)
    if (!shader) return null
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader)
      return null
    }
    gl.attachShader(program, shader)
    gl.deleteShader(shader)
  }
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null
  return program
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false)
  React.useEffect(() => {
    if (typeof matchMedia === "undefined") return
    const mq = matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])
  return reduced
}

const PCP_CSS = `
.pcp-root {
  position: relative;
  width: 100%;
  overflow: hidden;
  isolation: isolate;
  -webkit-tap-highlight-color: transparent;
}
.pcp-root:not([data-phase="done"]) { background: var(--pcp-bg); }
.pcp-root svg, .pcp-root canvas, .pcp-root img { max-width: none; }
.pcp-dest {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.5s ease;
}
.pcp-root[data-phase="lift"] .pcp-dest, .pcp-dest[data-active="true"] { opacity: 1; pointer-events: auto; }
.pcp-gate {
  position: absolute;
  inset: 0;
  z-index: 10;
  background: var(--pcp-bg);
  color: #f3f1ff;
  font-family: var(--pcp-mono);
  cursor: pointer;
  outline: none;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
}
.pcp-root[data-phase="lift"] .pcp-gate { pointer-events: none; }
.pcp-root[data-phase="lift"][data-hole="true"] .pcp-gate {
  background: transparent;
  opacity: 0;
  transition: opacity 0.4s ease 1.25s;
}
.pcp-root[data-phase="lift"][data-hole="true"][data-gl="false"] .pcp-gate { transition-delay: 0.3s; }
.pcp-gate:focus-visible .pcp-frame { box-shadow: inset 0 0 0 1px rgba(170, 185, 255, 0.55); }
.pcp-layer, .pcp-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
}

/* ---- no WebGL: the same story in CSS, smaller ---- */
.pcp-fallback {
  background:
    radial-gradient(circle at 50% 50%, var(--pcp-magenta) 0%, transparent 28%),
    radial-gradient(ellipse 60% 45% at 50% 50%, var(--pcp-violet) 0%, transparent 70%),
    radial-gradient(ellipse 90% 70% at 50% 40%, var(--pcp-blue) 0%, transparent 75%),
    var(--pcp-bg);
  opacity: calc(0.25 + var(--pcp-p) * 0.5);
  transition: opacity 1s ease;
}
.pcp-root:not([data-phase="load"]) .pcp-fallback { opacity: 0.9; }
.pcp-fbstar {
  position: absolute;
  left: 50%;
  top: 50%;
  width: calc(var(--pcp-u) * 0.6);
  height: calc(var(--pcp-u) * 0.6);
  margin: calc(var(--pcp-u) * -0.3) 0 0 calc(var(--pcp-u) * -0.3);
  fill: #fff;
  filter: drop-shadow(0 0 calc(var(--pcp-u) * 0.03) var(--pcp-magenta)) drop-shadow(0 0 calc(var(--pcp-u) * 0.08) var(--pcp-cyan));
  transform: scale(calc(0.05 + var(--pcp-p) * 0.2));
  transition: transform 1.6s cubic-bezier(0.5, 0, 0.1, 1);
}
.pcp-root:not([data-phase="load"]) .pcp-fbstar { transform: rotate(45deg) scale(1); }

/* ---- the compositing grid ---- */
.pcp-grid {
  background-image:
    linear-gradient(rgba(150, 170, 255, 0.075) 1px, transparent 1px),
    linear-gradient(90deg, rgba(150, 170, 255, 0.075) 1px, transparent 1px);
  background-size: calc(var(--pcp-u) * 0.065) calc(var(--pcp-u) * 0.065);
  background-position: 50% 50%;
  mix-blend-mode: screen;
  -webkit-mask-image: radial-gradient(ellipse at 50% 50%, #000 30%, transparent 85%);
  mask-image: radial-gradient(ellipse at 50% 50%, #000 30%, transparent 85%);
  transition: opacity 1.4s ease;
}
.pcp-root:not([data-phase="load"]) .pcp-grid { opacity: 0; }

/* ---- letterbox ---- */
.pcp-bar {
  position: absolute;
  left: 0;
  right: 0;
  height: calc(var(--pcp-u) * 0.065);
  background: #000;
  pointer-events: none;
  transition: transform 1.1s cubic-bezier(0.7, 0, 0.2, 1);
}
.pcp-bar-top { top: 0; transform: translateY(-101%); }
.pcp-bar-bot { bottom: 0; transform: translateY(101%); }
.pcp-root[data-phase="ignite"] .pcp-bar, .pcp-root[data-phase="reveal"] .pcp-bar { transform: none; }

/* ---- HUD ---- */
.pcp-hud {
  position: absolute;
  inset: 0;
  pointer-events: none;
  font-size: clamp(9px, calc(var(--pcp-u) * 0.017), 13px);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  transition: opacity 0.7s ease;
}
.pcp-root[data-phase="lift"] .pcp-hud { opacity: 0; }
.pcp-bl {
  position: absolute;
  left: calc(var(--pcp-u) * 0.05);
  bottom: calc(var(--pcp-u) * 0.05);
  transition: opacity 0.8s ease, transform 0.8s cubic-bezier(0.6, 0, 0.2, 1);
}
.pcp-root:not([data-phase="load"]) .pcp-bl { opacity: 0; transform: translateY(1.2em); }
.pcp-count {
  font-family: var(--pcp-display);
  font-size: clamp(30px, calc(var(--pcp-u) * 0.13), 112px);
  font-weight: 300;
  line-height: 0.9;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  margin: 0;
  text-shadow: -1px 0 color-mix(in srgb, var(--pcp-cyan) 60%, transparent), 1px 0 color-mix(in srgb, var(--pcp-magenta) 60%, transparent);
}
.pcp-count small { font-size: 0.3em; letter-spacing: 0.1em; margin-left: 0.3em; vertical-align: top; opacity: 0.6; }
.pcp-segs { display: flex; gap: 4px; margin-top: 0.9em; width: clamp(120px, calc(var(--pcp-u) * 0.36), 300px); }
.pcp-seg { position: relative; flex: 1; height: 2px; background: rgba(200, 205, 255, 0.16); overflow: hidden; }
.pcp-seg::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, var(--pcp-cyan), var(--pcp-violet), var(--pcp-magenta));
  transform-origin: 0 50%;
  transform: scaleX(clamp(0, calc(var(--pcp-p) * 4 - var(--k)), 1));
}


/* ---- the wordmark under the portal ---- */
.pcp-title {
  position: absolute;
  left: 0;
  right: 0;
  text-align: center;
  pointer-events: none;
  transition: opacity 0.6s ease, transform 1.7s cubic-bezier(0.6, 0, 0.3, 1), filter 1.2s ease;
}
.pcp-root[data-phase="lift"] .pcp-title { opacity: 0; transform: scale(1.35); filter: blur(10px); }
.pcp-word {
  margin: 0;
  font-family: var(--pcp-display);
  font-size: clamp(26px, calc(var(--pcp-u) * 0.085), 110px);
  font-weight: 300;
  letter-spacing: 0.34em;
  text-indent: 0.34em;
  text-transform: uppercase;
  line-height: 1;
  white-space: nowrap;
}
.pcp-letter {
  display: inline-block;
  opacity: 0;
  filter: blur(14px);
  transform: translateY(0.35em) scale(1.4);
  text-shadow:
    -0.04em 0 color-mix(in srgb, var(--pcp-cyan) 75%, transparent),
    0.04em 0 color-mix(in srgb, var(--pcp-magenta) 75%, transparent),
    0 0 0.5em color-mix(in srgb, var(--pcp-violet) 60%, transparent);
  transition: opacity 1s ease, filter 1.2s ease, transform 1.4s cubic-bezier(0.15, 0.8, 0.15, 1);
}
.pcp-root[data-phase="reveal"] .pcp-letter, .pcp-root[data-phase="lift"] .pcp-letter {
  opacity: 1;
  filter: blur(0);
  transform: none;
}
.pcp-caption, .pcp-hint {
  margin: 1.4em 0 0;
  font-size: clamp(9px, calc(var(--pcp-u) * 0.017), 13px);
  letter-spacing: 0.4em;
  text-indent: 0.4em;
  text-transform: uppercase;
  color: rgba(225, 228, 255, 0.72);
  opacity: 0;
  transition: opacity 1s ease 0.7s, letter-spacing 1.6s cubic-bezier(0.2, 0.8, 0.2, 1) 0.6s;
}
.pcp-hint { margin-top: 0.9em; color: rgba(225, 228, 255, 0.45); transition-delay: 1.6s; }
.pcp-root[data-phase="reveal"] .pcp-caption { opacity: 1; letter-spacing: 0.5em; }
.pcp-root[data-phase="reveal"] .pcp-hint { opacity: 1; animation: pcp-breathe 2.4s ease-in-out 2.4s infinite; }

.pcp-frame { position: absolute; inset: 0; pointer-events: none; }
.pcp-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
}

@keyframes pcp-breathe { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }

@media (prefers-reduced-motion: reduce) {
  .pcp-root[data-phase="reveal"] .pcp-hint { animation: none; }
  .pcp-letter { filter: none; transform: none; transition: opacity 0.4s ease; }
  .pcp-root[data-phase="lift"] .pcp-title { transform: none; filter: none; }
  .pcp-bar, .pcp-bl, .pcp-fbstar { transition-duration: 0.01s; }
  .pcp-root[data-phase="lift"][data-hole="true"] .pcp-gate { transition-delay: 0s; }
}
`

export default function PrismCometPreloader({
  children,
  loop = false,
  progress,
  durationMs = 6500,
  word = "Prisma",
  caption = "Five passes · One light",
  passes = DEFAULT_PASSES,
  palette,
  intensity = 1,
  speed = 1,
  quality = 0.6,
  grid = true,
  hud = true,
  grain = true,
  fontFamily = DISPLAY_STACK,
  height = "100svh",
  onComplete,
  className = "",
}: PrismCometPreloaderProps) {
  const [phase, setPhase] = React.useState<Phase>("load")
  const [pct, setPct] = React.useState(0)
  const [pass, setPass] = React.useState(0)
  const [cycle, setCycle] = React.useState(0)
  const [failed, setFailed] = React.useState(false)
  const [generation, setGeneration] = React.useState(0)
  const [box, setBox] = React.useState({ w: 1280, h: 800 })
  const still = usePrefersReducedMotion()

  const rootRef = React.useRef<HTMLDivElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const pointerRef = React.useRef<{ x: number; y: number } | null>(null)
  const rushRef = React.useRef(false)
  const shownRef = React.useRef(0)
  const phaseRef = React.useRef<Phase>("load")
  const phaseAtRef = React.useRef(0)
  const cycleAtRef = React.useRef(0)
  const cycleRef = React.useRef(cycle)
  cycleRef.current = cycle
  const progressRef = React.useRef(progress)
  progressRef.current = progress
  const onCompleteRef = React.useRef(onComplete)
  onCompleteRef.current = onComplete

  const hole = !loop && children != null
  const colors = { ...DEFAULT_PALETTE, ...palette }
  const look = {
    colors,
    exposure: 1.25 * Math.min(2, Math.max(0.4, intensity)),
    speed: Math.min(3, Math.max(0, speed)),
    quality: Math.min(1, Math.max(0.35, quality)),
    grain: grain ? 0.035 : 0,
    hole,
    passes: passes.length,
  }
  const lookRef = React.useRef(look)
  lookRef.current = look

  const igniteMs = still ? 600 : IGNITE_MS
  const liftMs = still ? 700 : LIFT_MS

  React.useEffect(() => {
    phaseRef.current = phase
    phaseAtRef.current = performance.now()
    if (phase === "load") cycleAtRef.current = phaseAtRef.current
  }, [phase, cycle])

  // ---- size everything off the root ------------------------------------------------
  React.useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const measure = () => {
      const r = root.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) setBox({ w: Math.round(r.width), h: Math.round(r.height) })
    }
    measure()
    if (typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(measure)
    ro.observe(root)
    return () => ro.disconnect()
  }, [])

  // ---- load: drive the stack from progress -------------------------------------------
  React.useEffect(() => {
    if (phase !== "load") return
    const root = rootRef.current
    let raf = 0
    let shown = 0
    let last = performance.now()
    const start = last
    let lastPct = -1
    rushRef.current = false

    const paint = (p: number) => {
      shownRef.current = p
      root?.style.setProperty("--pcp-p", p.toFixed(4))
      const next = Math.round(p * 100)
      if (next !== lastPct) {
        lastPct = next
        setPct(next)
      }
    }

    const tick = (now: number) => {
      const dt = Math.min(64, now - last)
      last = now
      const external = progressRef.current
      let target =
        external !== undefined ? clamp01(external / 100) : pcpSimulated((now - start) / Math.max(400, durationMs))
      if (rushRef.current) target = 1
      // glide toward the target so stepped real progress still morphs smoothly
      const rate = rushRef.current ? 0.06 : external !== undefined ? 0.08 : 1
      shown += (target - shown) * Math.min(1, rate * (dt / 16.7))
      if (target - shown < 0.002) shown = target
      paint(shown)
      if (shown >= 1) {
        setPhase("ignite")
        return
      }
      raf = requestAnimationFrame(tick)
    }
    paint(0)
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase, cycle, durationMs])

  // ---- the light: one shader, one loop -----------------------------------------------
  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let gl: WebGLRenderingContext | null = null
    try {
      gl = canvas.getContext("webgl", {
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: "high-performance",
      }) as WebGLRenderingContext | null
    } catch {
      gl = null
    }
    if (!gl) {
      setFailed(true)
      return
    }
    const program = link(gl, VERT, FRAG)
    if (!program) {
      setFailed(true)
      return
    }

    // one triangle that covers the screen
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(program, "aPos")
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)
    gl.useProgram(program)
    const U = {} as Record<(typeof UNIFORMS)[number], WebGLUniformLocation | null>
    for (const name of UNIFORMS) U[name] = gl.getUniformLocation(program, name)

    let raf = 0
    let last = performance.now()
    let clock = 0
    let mShown = 0
    let igShown = 0
    let lastPass = -1
    let visible = true
    const ptr = { x: 0, y: 0, on: 0, nx: 0, ny: 0 }

    const io =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver((entries) => {
            visible = entries[entries.length - 1].isIntersecting
          })
        : null
    io?.observe(canvas)

    const rgb = (hex: string, fallback: string) => pcpHex(hex) ?? pcpHex(fallback) ?? [0, 0, 0]

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.064, (now - last) / 1000)
      last = now
      if (!visible || (typeof document !== "undefined" && document.hidden) || !gl) return
      const L = lookRef.current
      if (!still) clock += dt * L.speed
      const t = still ? 4 : clock % 600

      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const cw = Math.max(1, Math.round(canvas.clientWidth * dpr * L.quality))
      const ch = Math.max(1, Math.round(canvas.clientHeight * dpr * L.quality))
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw
        canvas.height = ch
      }
      const aspect = cw / ch

      const phase = phaseRef.current
      const since = now - phaseAtRef.current
      const k = (rate: number) => (still ? 1 : 1 - Math.exp(-dt * rate))

      // where in the stack we are: progress while loading, the end of it after
      const mTarget = phase === "load" ? pcpMorph(shownRef.current) : 4
      mShown += (mTarget - mShown) * k(phase === "load" && mTarget < mShown ? 30 : 6)
      if (phase === "load") igShown = 0
      else if (phase === "ignite") igShown = Math.max(igShown, clamp01(since / igniteMs))
      else igShown += (1 - igShown) * k(5)
      const lift = phase === "lift" ? clamp01(since / liftMs) : 0
      const rig = pcpRig(mShown, aspect)
      const ig = pcpIgnite(igShown, aspect)
      const loading = phase === "load"

      const nextPass = loading ? pcpPass(mShown, L.passes) : L.passes - 1
      if (nextPass !== lastPass) {
        lastPass = nextPass
        setPass(nextPass)
      }

      // the pointer, eased, in shader units
      const target = pointerRef.current
      ptr.on += ((target && !still ? 1 : 0) - ptr.on) * k(4)
      if (target) {
        ptr.nx += (target.x - ptr.nx) * k(7)
        ptr.ny += (target.y - ptr.ny) * k(7)
      } else {
        ptr.nx += (0 - ptr.nx) * k(1.5)
        ptr.ny += (0 - ptr.ny) * k(1.5)
      }
      ptr.x = ptr.nx * (aspect * rig.zoom) * 0.5
      ptr.y = -ptr.ny * rig.zoom * 0.5

      // the star: the comet's head while loading, the portal once lit
      const mode = loading ? 0 : ig.mode
      const breathe = still ? 0 : Math.sin(t * 1.3) * 0.025 * mode
      const zoomIn = still ? 1 : Math.exp(sm(lift) * 5.4)
      const starX = loading ? rig.ax : ig.x + ptr.x * 0.04 * mode
      const starY = loading ? rig.ay : ig.y + ptr.y * 0.04 * mode
      const starR = (loading ? HEAD_R : ig.r) * (1 + breathe) * zoomIn
      const fade = 1 - lift
      const comet = loading ? 1 : ig.comet

      const C = L.colors
      gl.viewport(0, 0, cw, ch)
      gl.uniform2f(U.uRes, cw, ch)
      gl.uniform1f(U.uZoom, rig.zoom)
      gl.uniform1f(U.uTime, t)
      gl.uniform2f(U.uApex, loading ? rig.ax : ig.x, loading ? rig.ay : ig.y)
      gl.uniform1f(U.uBeta, rig.beta)
      gl.uniform1f(U.uPhi, rig.phi)
      gl.uniform1f(U.uRho0, rig.rho0)
      gl.uniform1f(U.uKv, rig.kv * (1 + (loading ? 0 : ig.retract) * 5))
      gl.uniform1f(U.uVf, rig.vf)
      gl.uniform1f(U.uNarrow, rig.narrow)
      gl.uniform1f(U.uWave, rig.wave)
      gl.uniform1f(U.uBulge, rig.bulge)
      gl.uniform1f(U.uEdge, rig.edge)
      gl.uniform1f(U.uClosed, rig.closed)
      gl.uniform1f(U.uComet, comet)
      gl.uniform1f(U.uLines, (loading ? rig.lines : ig.lines) * fade)
      gl.uniform1f(U.uLineDir, pcpHead(aspect).tail)
      gl.uniform2f(U.uStarC, starX, starY)
      gl.uniform1f(U.uStarR, starR)
      gl.uniform1f(U.uStarAmt, loading ? rig.star : 1)
      gl.uniform1f(U.uStarMode, mode)
      gl.uniform1f(U.uStarRot, (loading ? 0 : ig.rot) + (still ? 0 : Math.sin(t * 0.3) * 0.05 * mode))
      gl.uniform1f(U.uSwirl, mode * (0.55 + (still ? 0 : Math.sin(t * 0.7) * 0.08)))
      gl.uniform2f(U.uTilt, (0.32 - ptr.nx * 0.4 * ptr.on) * mode * fade, (0.22 + ptr.ny * 0.34 * ptr.on) * mode * fade)
      gl.uniform1f(U.uHoleOpen, L.hole ? (still ? lift : sm(clamp01(lift / 0.4))) : 0)
      // a bloom as the star catches; looping, a white-out through the portal into the next load
      gl.uniform1f(U.uBloom, loading || still ? 0 : ig.bloom * (1 - lift))
      let flash = 0
      if (!L.hole && phase === "lift") flash = still ? lift : sm(clamp01((lift - 0.5) / 0.5))
      if (loading && cycleRef.current > 0 && !still) flash = Math.exp(-since / 450)
      gl.uniform1f(U.uFlash, flash)
      gl.uniform3f(U.uPtr, ptr.x, ptr.y, ptr.on * (loading ? 1 : 1 - mode))
      gl.uniform3fv(U.uBg, rgb(C.background, DEFAULT_PALETTE.background))
      gl.uniform3fv(U.uBlue, rgb(C.blue, DEFAULT_PALETTE.blue))
      gl.uniform3fv(U.uViolet, rgb(C.violet, DEFAULT_PALETTE.violet))
      gl.uniform3fv(U.uMagenta, rgb(C.magenta, DEFAULT_PALETTE.magenta))
      gl.uniform3fv(U.uCyan, rgb(C.cyan, DEFAULT_PALETTE.cyan))
      gl.uniform3fv(U.uGold, rgb(C.gold, DEFAULT_PALETTE.gold))
      gl.uniform1f(U.uExposure, L.exposure)
      gl.uniform1f(U.uGrain, still ? 0 : L.grain)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    raf = requestAnimationFrame(frame)

    // A lost context leaves a dead canvas unless the whole setup runs again.
    const onLost = (e: Event) => {
      e.preventDefault()
      cancelAnimationFrame(raf)
      raf = 0
    }
    const onRestored = () => setGeneration((g) => g + 1)
    canvas.addEventListener("webglcontextlost", onLost)
    canvas.addEventListener("webglcontextrestored", onRestored)

    return () => {
      cancelAnimationFrame(raf)
      io?.disconnect()
      canvas.removeEventListener("webglcontextlost", onLost)
      canvas.removeEventListener("webglcontextrestored", onRestored)
      if (gl && !gl.isContextLost()) {
        gl.deleteProgram(program)
        gl.deleteBuffer(buffer)
      }
    }
  }, [still, generation, igniteMs, liftMs])

  // ---- holds between phases ---------------------------------------------------------
  React.useEffect(() => {
    if (phase === "ignite") {
      const t = setTimeout(() => setPhase("reveal"), igniteMs)
      return () => clearTimeout(t)
    }
    if (phase === "reveal") {
      const t = setTimeout(() => setPhase("lift"), HOLD_MS)
      return () => clearTimeout(t)
    }
    if (phase === "lift") {
      const t = setTimeout(() => {
        if (loop) {
          setPct(0)
          setCycle((c) => c + 1)
          setPhase("load")
        } else {
          setPhase("done")
          onCompleteRef.current?.()
        }
      }, liftMs)
      return () => clearTimeout(t)
    }
  }, [phase, loop, igniteMs, liftMs])

  const onActivate = () => {
    if (phase === "load") rushRef.current = true
    else if (phase === "ignite") setPhase("reveal")
    else if (phase === "reveal") setPhase("lift")
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const root = rootRef.current
    if (!root) return
    const r = root.getBoundingClientRect()
    pointerRef.current = {
      x: ((e.clientX - r.left) / r.width) * 2 - 1,
      y: ((e.clientY - r.top) / r.height) * 2 - 1,
    }
  }
  const onPointerLeave = () => {
    pointerRef.current = null
  }

  const loading = phase === "load"
  const u = Math.min(box.w, box.h)
  const zoom = pcpView(box.w / Math.max(1, box.h)).zoom
  const titleTop = (0.5 + (HERO_R * 0.92 - HERO_Y + 0.05) / zoom) * 100
  // without WebGL there is no frame loop to report the pass, so read it off the counter
  const at = failed ? (loading ? pcpPass(pcpMorph(pct / 100), passes.length) : passes.length - 1) : pass
  const label = at >= 0 && at < passes.length ? passes[at] : ""
  const hint = loop ? "Click to replay" : "Click to enter"

  return (
    <div
      ref={rootRef}
      className={"pcp-root " + className}
      data-phase={phase}
      data-hole={hole}
      data-gl={!failed}
      style={
        {
          height,
          "--pcp-u": u + "px",
          "--pcp-p": 0,
          "--pcp-bg": colors.background,
          "--pcp-blue": colors.blue,
          "--pcp-violet": colors.violet,
          "--pcp-magenta": colors.magenta,
          "--pcp-cyan": colors.cyan,
          "--pcp-display": fontFamily,
          "--pcp-mono": MONO_STACK,
        } as React.CSSProperties
      }
      onPointerMove={onPointerMove}
      onPointerDown={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <style>{PCP_CSS}</style>

      {hole ? (
        <div className="pcp-dest" data-active={phase === "done"} aria-hidden={phase !== "done" && phase !== "lift"}>
          {children}
        </div>
      ) : null}

      {phase !== "done" ? (
        <div
          className="pcp-gate"
          role="progressbar"
          aria-label={word + " is loading"}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-valuetext={loading ? pct + "%" : "Loaded. Press Enter to continue."}
          tabIndex={0}
          onClick={onActivate}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              onActivate()
            }
          }}
        >
          {failed ? (
            <div className="pcp-layer pcp-fallback" aria-hidden="true">
              <svg className="pcp-fbstar" viewBox="-1 -1 2 2">
                <path d={SPARK} />
              </svg>
            </div>
          ) : (
            <canvas key={generation} ref={canvasRef} className="pcp-canvas" aria-hidden="true" />
          )}
          {grid ? <div className="pcp-layer pcp-grid" aria-hidden="true" /> : null}

          <div className="pcp-title" style={{ top: titleTop + "%" }} aria-hidden="true">
            <p className="pcp-word">
              {Array.from(word).map((ch, i) => (
                <span key={cycle + ":" + i} className="pcp-letter" style={{ transitionDelay: 0.05 + i * 0.08 + "s" }}>
                  {ch === " " ? " " : ch}
                </span>
              ))}
            </p>
            {caption ? <p className="pcp-caption">{caption}</p> : null}
            <p className="pcp-hint">{hint}</p>
          </div>

          <div className="pcp-bar pcp-bar-top" />
          <div className="pcp-bar pcp-bar-bot" />

          {hud ? (
            <div className="pcp-hud" aria-hidden="true">
              <div className="pcp-bl">
                <p className="pcp-count">
                  {String(pct).padStart(3, "0")}
                  <small>%</small>
                </p>
                <div className="pcp-segs">
                  {[0, 1, 2, 3].map((k) => (
                    <i key={k} className="pcp-seg" style={{ "--k": k } as React.CSSProperties} />
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          <div className="pcp-frame" />
          <span className="pcp-sr" aria-live="polite">
            {loading ? label.replace(/\n/g, ", ") : word + (caption ? " — " + caption : "")}
          </span>
        </div>
      ) : null}
    </div>
  )
}
