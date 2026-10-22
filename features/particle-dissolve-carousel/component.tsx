"use client"

import * as React from "react"

/**
 * Particle Dissolve Carousel — every slide is made of dust. Change slides and
 * the picture comes apart: a wave crosses it, each grain lifts off carrying
 * its colour, rides a drifting flow field, then turns and settles back into
 * its place as a grain of the next picture. At rest the picture keeps shedding
 * a little dust, and the pointer drags a wake of loose grains behind it.
 *
 * Raw WebGL2. The grains are simulated on the GPU with transform feedback, one
 * per cell of a grid laid over the stage, and the picture underneath is drawn
 * through the same per-place timeline, so a grain lifting off is exactly where
 * the old picture goes dark and a grain landing is where the new one appears.
 * React is the only import. Without WebGL2 it cross-fades plain images.
 */

export type ParticleDissolveItem = {
  /** Image URL. Must be CORS-enabled, same-origin or a data: URL. */
  src: string
  title?: string
  caption?: string
  /** A small line above the title: a place, a date, a number. */
  eyebrow?: string
  alt?: string
}

export type DissolvePattern = "sweep" | "radial" | "scatter"

export type ParticleDissolveCarouselProps = {
  items: ParticleDissolveItem[]
  /** Total height. **Must be a definite length.** */
  height?: string
  /** Most grains on the stage. Fewer are used on a small stage, and half on a device that cannot keep up. */
  particles?: number
  /** Milliseconds a dissolve takes from first grain lifting to last grain landing. */
  duration?: number
  /** The shape of the wave: from the edge, from a point, or everywhere at once. Clicks always ripple from where they land. */
  pattern?: DissolvePattern
  /** How far the grains fly. */
  scatter?: number
  /** How much the flow field curls them. */
  turbulence?: number
  /** How brightly grains burn in flight, and the ember line at the dissolving edge. 0 is flat colour. */
  glow?: number
  /** How much dust the picture sheds at rest. 0 keeps it perfectly still. */
  dust?: number
  /** How hard pointer momentum drags loose grains. 0 turns it off. */
  push?: number
  /** The colour behind the picture while it is in pieces. Hex. */
  backdrop?: string
  /** Milliseconds between automatic dissolves. 0 (default) is off. */
  autoplay?: number
  /** Wrap past the ends. */
  loop?: boolean
  /** Title, counter, progress and the up-next card over the picture. */
  overlay?: boolean
  /** Controlled index. Omit for uncontrolled. */
  index?: number
  defaultIndex?: number
  onIndexChange?: (index: number) => void
  className?: string
}

// #region dust
/** Share of the dissolve spent on the wave crossing the stage; each grain's own flight takes the rest. */
export const STAGGER = 0.5
/** A grain's own timeline, 0 → 1: the old picture gives way to it over [0, RELEASE]... */
export const RELEASE = 0.08
/** ...it is drawn home over [RETURN_START, RETURN_END]... */
export const RETURN_START = 0.42
export const RETURN_END = 0.9
/** ...and the new picture takes over from it over [LAND_START, 1]. */
export const LAND_START = 0.86
/** Area each grain needs, in CSS pixels; below it a small stage uses fewer. */
export const PX_PER_GRAIN = 6

export function wrapIndex(i: number, n: number, loop: boolean): number {
  if (n <= 0) return 0
  return loop ? ((i % n) + n) % n : Math.min(Math.max(i, 0), n - 1)
}

/**
 * Where one grain is on its own timeline, given the dissolve's progress p and
 * the grain's place in the wave (order, 0 = first to go). The shaders run the
 * same sum; at p = 1 every grain is home, whatever its order.
 */
export function grainPhase(p: number, order: number): number {
  return Math.min(Math.max((p - order * STAGGER) / (1 - STAGGER), 0), 1)
}

/** How many grains a stage of this size gets. */
export function grainCount(cssWidth: number, cssHeight: number, most: number): number {
  return Math.max(1000, Math.min(Math.round(most), Math.round((cssWidth * cssHeight) / PX_PER_GRAIN)))
}

/** A grid of about n cells in this aspect: columns, rows. */
export function grid(n: number, aspect: number): [number, number] {
  const cols = Math.max(1, Math.round(Math.sqrt(n * aspect)))
  return [cols, Math.max(1, Math.round(n / cols))]
}

/** "#rgb" or "#rrggbb" to 0..1 channels; anything else is the fallback. */
export function parseHex(hex: string, fallback: [number, number, number] = [0.03, 0.03, 0.04]): [number, number, number] {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return fallback
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1]
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number]
}

/**
 * How far the wave travels: from a point, to the farthest corner; from an
 * edge along dir, to the farthest corner along it. Stage units: x in
 * [0, aspect], y in [0, 1].
 */
export function waveReach(ox: number, oy: number, aspect: number, dir: [number, number] | null): number {
  const corners = [[0, 0], [aspect, 0], [0, 1], [aspect, 1]]
  let far = 0
  for (const [x, y] of corners) {
    const d = dir ? (x - ox) * dir[0] + (y - oy) * dir[1] : Math.hypot(x - ox, y - oy)
    far = Math.max(far, d)
  }
  return Math.max(far, 0.001)
}
// #endregion

/** Clicks, keys and autoplay use this; a reduced-motion change is a plain cross-fade. */
const DURATION = 2600
const REDUCED_DURATION = 420
/** A frame slower than this counts against the device; this many of them halve the grains. */
const SLOW_FRAME_S = 0.05
const SLOW_FRAMES = 12
/** Seconds the grains keep moving after the pointer stops, when there is no dust to keep the loop alive. */
const SETTLE_S = 2.5
/** Pointer momentum → acceleration on nearby grains. */
const PUSH_GAIN = 2.6

/** GLSL wants a decimal point on a float literal. */
const f = (x: number) => (Number.isInteger(x) ? x.toFixed(1) : String(x))

/**
 * The per-place timeline, shared by the picture and the grains so that they
 * agree to the pixel. order() is where a place sits in the wave; phase() is
 * the same sum as grainPhase().
 */
const TIMELINE =
  "const float STAGGER = " + f(STAGGER) + ";\n" +
  "const float RELEASE = " + f(RELEASE) + ";\n" +
  "const float RETURN_START = " + f(RETURN_START) + ";\n" +
  "const float RETURN_END = " + f(RETURN_END) + ";\n" +
  "const float LAND_START = " + f(LAND_START) + ";\n" +
  `uniform float u_aspect;
uniform float u_p;
uniform vec2 u_origin;
uniform vec2 u_dir;
uniform float u_radial;
uniform float u_reach;
uniform float u_grain;
uniform float u_seed;
uniform vec2 u_cells;

float hash12(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 g = fract(p);
  vec2 u = g * g * (3.0 - 2.0 * g);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
             mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    s += a * vnoise(p);
    p = p * 2.03 + 17.1;
    a *= 0.5;
  }
  return s / 0.9375;
}
float order(vec2 uv) {
  vec2 s = vec2(uv.x * u_aspect, uv.y);
  float d = u_radial > 0.5 ? length(s - u_origin) : dot(s - u_origin, u_dir);
  d = clamp(d / u_reach, 0.0, 1.0);
  // Contrast-stretched so a pure-noise wave still uses the whole timeline.
  float n = clamp((fbm(s * 3.5 + u_seed) - 0.5) * 2.2 + 0.5, 0.0, 1.0);
  // Even a clean sweep gets a ragged front: noise pushed in along the edge,
  // and a little per grain so it frays like sand. Per grid cell, and every
  // grain's home lies inside its own cell, so the picture and the grains
  // draw the same number for the same place.
  float speck = hash12(floor(uv * u_cells) + u_seed) - 0.5;
  return clamp(mix(d, n, u_grain) + (n - 0.5) * 0.1 * (1.0 - u_grain) + speck * 0.07, 0.0, 1.0);
}
float phase(vec2 uv) {
  return clamp((u_p - order(uv) * STAGGER) / (1.0 - STAGGER), 0.0, 1.0);
}
`

/** object-fit: cover, for a picture of aspect ia on a stage of aspect u_aspect. */
const COVER = `vec2 coverUv(vec2 uv, float ia) {
  vec2 s = u_aspect > ia ? vec2(1.0, ia / u_aspect) : vec2(u_aspect / ia, 1.0);
  return (uv - 0.5) * s + 0.5;
}
`

const QUAD_VERT = `#version 300 es
layout(location = 0) in vec2 a_position;
out vec2 vUv;
void main() {
  vUv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

// The picture under the grains: the old one where its grains have not left,
// the new one where theirs have landed, the backdrop in between. An ember line
// burns along the edge that is coming apart.
const PICTURE_FRAG =
  `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D u_from;
uniform sampler2D u_to;
uniform float u_fromAspect;
uniform float u_toAspect;
uniform vec3 u_backdrop;
uniform float u_glow;
uniform float u_still;
uniform vec2 u_res;
` +
  TIMELINE +
  COVER +
  `void main() {
  vec3 a = texture(u_from, coverUv(vUv, u_fromAspect)).rgb;
  vec3 b = texture(u_to, coverUv(vUv, u_toAspect)).rgb;
  vec3 col;
  if (u_still > 0.5) {
    col = mix(a, b, smoothstep(0.0, 1.0, u_p));
  } else {
    float l = phase(vUv);
    // The grain is fully drawn by RELEASE / 2; only then does its place go dark.
    float showA = 1.0 - smoothstep(RELEASE * 0.5, RELEASE, l);
    float showB = smoothstep(LAND_START, 1.0, l);
    // The gap is not a hole: the backdrop, faintly lit by whichever picture
    // the grains overhead are carrying.
    vec3 gap = u_backdrop + mix(a, b, smoothstep(0.3, 0.75, l)) * 0.07;
    col = a * showA + b * showB + gap * (1.0 - showA - showB);
    // Embers: the old picture flares just as it lets go.
    float burn = smoothstep(0.0, 0.012, l) * (1.0 - smoothstep(0.012, 0.05, l));
    col += (a * 0.45 + vec3(0.05, 0.03, 0.015)) * burn * u_glow;
  }
  vec2 px = floor(vUv * u_res);
  col += (hash12(px) - 0.5) * 0.018;
  o = vec4(col, 1.0);
}
`

// One grain per vertex. Updates its own state (written back by transform
// feedback) and draws itself in the same pass.
const GRAIN_VERT =
  `#version 300 es
precision highp float;
layout(location = 0) in vec2 a_home;
layout(location = 1) in vec4 a_seed;
layout(location = 2) in vec4 a_state;
layout(location = 3) in vec2 a_life;
out vec4 v_state;
out vec2 v_life;
out vec4 v_color;
out float v_burn;
uniform sampler2D u_from;
uniform sampler2D u_to;
uniform float u_fromAspect;
uniform float u_toAspect;
uniform float u_fromLod;
uniform float u_toLod;
uniform float u_dt;
uniform float u_time;
uniform vec2 u_mouse;
uniform vec2 u_mouseVel;
uniform float u_push;
uniform float u_turb;
uniform float u_scatter;
uniform float u_glow;
uniform float u_dust;
uniform float u_point;
` +
  TIMELINE +
  COVER +
  `vec3 hash33(vec3 p) {
  p = fract(p * vec3(0.1031, 0.11369, 0.13787));
  p += dot(p, p.yxz + 19.19);
  return -1.0 + 2.0 * fract(vec3((p.x + p.y) * p.z, (p.x + p.z) * p.y, (p.y + p.z) * p.x));
}
float snoise(vec3 p) {
  const float K1 = 0.333333333;
  const float K2 = 0.166666667;
  vec3 i = floor(p + (p.x + p.y + p.z) * K1);
  vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);
  vec3 e = step(vec3(0.0), d0 - d0.yzx);
  vec3 i1 = e * (1.0 - e.zxy);
  vec3 i2 = 1.0 - e.zxy * (1.0 - e);
  vec3 d1 = d0 - (i1 - K2);
  vec3 d2 = d0 - (i2 - 2.0 * K2);
  vec3 d3 = d0 - (1.0 - 3.0 * K2);
  vec4 h = max(0.6 - vec4(dot(d0, d0), dot(d1, d1), dot(d2, d2), dot(d3, d3)), 0.0);
  vec4 n = h * h * h * h * vec4(dot(d0, hash33(i)), dot(d1, hash33(i + i1)), dot(d2, hash33(i + i2)), dot(d3, hash33(i + 1.0)));
  return dot(vec4(31.316), n);
}

void main() {
  vec2 home = vec2(a_home.x * u_aspect, a_home.y);
  vec2 d = a_state.xy;
  vec2 v = a_state.zw;
  float age = a_life.x;
  float maxLife = mix(2.4, 6.0, a_seed.y);
  float dt = u_dt;
  vec2 pos = home + d;

  // The flow field every loose grain rides.
  float ang = snoise(vec3(pos * 2.4, u_time * 0.11 + a_seed.z * 0.35)) * 6.2831;
  vec2 flow = vec2(cos(ang), sin(ang));

  // Pointer momentum: grains near the pointer are dragged the way it moves.
  vec2 tm = pos - u_mouse;
  float near = 0.004 / (dot(tm, tm) + 0.004);
  vec2 drag = u_mouseVel * near * near * u_push;

  float l = phase(a_home);
  float alpha = 0.0;
  float burn = 0.0;
  float toB = 0.0;

  if (l > 0.0) {
    // In the dissolve: lift off, ride the flow and the wave's wind, come home.
    float fly = smoothstep(RELEASE * 0.5, RELEASE, l) * (1.0 - smoothstep(RETURN_START, RETURN_END, l));
    vec2 wind = u_radial > 0.5 ? normalize(home - u_origin + vec2(0.0001)) : u_dir;
    vec2 acc = (flow * 1.5 * u_turb + wind * (0.7 + a_seed.w * 0.9) + vec2(0.0, 0.3)) * u_scatter * fly;
    v = v * exp(-1.1 * dt) + (acc + drag) * dt;
    d += v * dt;
    float back = smoothstep(RETURN_START, RETURN_END, l);
    pos = home + d * (1.0 - back);
    if (back >= 1.0) {
      // Home: drop the flight so the grain rests exactly where it landed.
      d = vec2(0.0);
      v = vec2(0.0);
    }
    alpha = smoothstep(0.0, RELEASE * 0.5, l) * (1.0 - smoothstep(LAND_START + 0.04, 1.0, l));
    burn = fly;
    toB = smoothstep(0.3, 0.75, l);
    age = maxLife * a_seed.w;
  } else if (a_seed.x < u_dust * 0.14) {
    // Dust: a share of the grains keeps lifting off the resting picture,
    // drifting a while and fading, then starting over from home.
    age += dt;
    if (age > maxLife) {
      age = 0.0;
      d = vec2(0.0);
      v = (a_seed.zw - 0.5) * 0.02;
    }
    float t = age / maxLife;
    v = v * exp(-0.7 * dt) + (flow * 0.32 * u_turb + vec2(0.0, 0.035) + drag) * dt;
    d += v * dt;
    pos = home + d;
    alpha = smoothstep(0.0, 0.12, t) * (1.0 - smoothstep(0.55, 1.0, t)) * smoothstep(0.0015, 0.01, length(d)) * 0.75;
    burn = alpha * 0.25;
  } else {
    // Pinned: a critically damped spring home. Only visible once something
    // has knocked it loose, and swirled a little while it is.
    float loose = length(d);
    v += (-d * 10.0 - v * 6.3 + drag + flow * min(loose, 0.08) * 5.0 * u_turb) * dt;
    d += v * dt;
    pos = home + d;
    alpha = smoothstep(0.002, 0.014, loose);
    burn = alpha * 0.4;
  }

  v_state = vec4(d, v);
  v_life = vec2(age, 0.0);

  vec3 c = alpha > 0.002
    ? mix(textureLod(u_from, coverUv(a_home, u_fromAspect), u_fromLod).rgb,
          textureLod(u_to, coverUv(a_home, u_toAspect), u_toLod).rgb, toB)
    : vec3(0.0);
  float g = burn * u_glow;
  v_color = vec4(c * (1.0 + 0.35 * g) + vec3(0.06, 0.035, 0.015) * g, alpha);
  v_burn = g;
  gl_Position = vec4(pos.x / u_aspect * 2.0 - 1.0, pos.y * 2.0 - 1.0, 0.0, 1.0);
  gl_PointSize = alpha > 0.002 ? u_point * (1.0 + 0.5 * g) : 0.0;
}
`

// A soft round grain. Burning grains blend partly additively, so a dense
// cloud of them glows instead of just covering.
const GRAIN_FRAG = `#version 300 es
precision highp float;
in vec4 v_color;
in float v_burn;
out vec4 o;
void main() {
  float r = length(gl_PointCoord - 0.5);
  float a = v_color.a * (1.0 - smoothstep(0.18, 0.5, r));
  o = vec4(v_color.rgb * a, a * (1.0 - 0.4 * v_burn));
}
`

type Picture = { tex: WebGLTexture; aspect: number; w: number; h: number }
type Prog = { prog: WebGLProgram; u: Record<string, WebGLUniformLocation | null> }
type Uniform = number | number[] | { unit: number; tex: WebGLTexture }
type Wave = {
  from: number
  to: number
  t: number
  duration: number
  origin: [number, number]
  dir: [number, number]
  radial: boolean
  grain: number
  reach: number
  seed: number
}
type Swarm = {
  n: number
  cols: number
  rows: number
  vao: WebGLVertexArrayObject[]
  state: WebGLBuffer[]
  life: WebGLBuffer[]
  statics: WebGLBuffer[]
  side: number
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    // Without this the upload throws. With it, a host that sends no CORS
    // header fails here instead, where we can fall back.
    img.crossOrigin = "anonymous"
    img.decoding = "async"
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("could not load " + src))
    img.src = src
  })

const pad = (i: number) => String(i).padStart(2, "0")

const CSS =
  ".pdc-root{position:relative;display:block;width:100%;overflow:hidden;isolation:isolate;" +
  "background:var(--color-background,#0A0A0B);color:#FFFFFF;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif}" +
  ".pdc-stage{position:absolute;inset:0;overflow:hidden;cursor:pointer;touch-action:pan-y;user-select:none;" +
  "-webkit-user-select:none;outline:none;-webkit-tap-highlight-color:transparent}" +
  ".pdc-stage:focus-visible{box-shadow:inset 0 0 0 2px var(--color-primary,#FFFFFF)}" +
  ".pdc-canvas,.pdc-fallback{position:absolute;inset:0;display:block;width:100%;height:100%;max-width:none}" +
  ".pdc-canvas{transition:opacity 500ms ease}" +
  ".pdc-fallback{object-fit:cover;transition:opacity 700ms ease}" +
  ".pdc-overlay{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:space-between;" +
  "padding:clamp(16px,3.2vw,40px);pointer-events:none}" +
  ".pdc-overlay:before,.pdc-overlay:after{content:'';position:absolute;left:0;right:0;z-index:-1;pointer-events:none}" +
  ".pdc-overlay:before{top:0;height:160px;background:linear-gradient(to bottom,rgba(0,0,0,.42),rgba(0,0,0,0))}" +
  ".pdc-overlay:after{bottom:0;height:min(62%,420px);background:linear-gradient(to top,rgba(0,0,0,.66),rgba(0,0,0,.28) 45%,rgba(0,0,0,0))}" +
  ".pdc-top{display:flex;align-items:center;gap:20px}" +
  ".pdc-count{flex-shrink:0;font:500 12px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.14em;" +
  "font-variant-numeric:tabular-nums;color:rgba(255,255,255,.62)}" +
  ".pdc-count b{font-weight:600;color:#FFFFFF}" +
  ".pdc-bars{display:flex;flex:1 1 auto;gap:6px;max-width:420px;margin-left:auto}" +
  ".pdc-bar{position:relative;flex:1 1 0;height:22px;padding:0;border:0;background:transparent;cursor:pointer;pointer-events:auto}" +
  ".pdc-bar:before{content:'';position:absolute;left:0;right:0;top:10px;height:2px;border-radius:2px;background:rgba(255,255,255,.24)}" +
  ".pdc-fill{position:absolute;left:0;right:0;top:10px;height:2px;border-radius:2px;background:#FFFFFF;" +
  "transform-origin:left center;transform:scaleX(0);transition:transform 500ms cubic-bezier(0.23,1,0.32,1)}" +
  ".pdc-bar[data-state='past'] .pdc-fill,.pdc-bar[data-state='now'] .pdc-fill{transform:scaleX(1)}" +
  ".pdc-bar[data-state='timed'] .pdc-fill{transition:none;animation:pdc-grow linear forwards}" +
  ".pdc-bar:focus-visible{outline:2px solid #FFFFFF;outline-offset:2px;border-radius:2px}" +
  ".pdc-bottom{display:flex;align-items:flex-end;justify-content:space-between;gap:24px}" +
  ".pdc-text{min-width:0;max-width:min(720px,100%)}" +
  ".pdc-eyebrow{display:flex;align-items:center;gap:10px;margin:0 0 14px;" +
  "font:500 11px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.72)}" +
  ".pdc-eyebrow:before{content:'';width:22px;height:1px;background:currentColor}" +
  ".pdc-title{margin:0;font-family:ui-serif,'Iowan Old Style','Palatino Linotype',Georgia,serif;font-weight:400;" +
  "font-size:clamp(40px,7.4vw,112px);line-height:.92;letter-spacing:-.025em;text-wrap:balance;text-shadow:0 2px 30px rgba(0,0,0,.25)}" +
  ".pdc-ch{display:inline-block;white-space:pre;animation:pdc-gather 900ms cubic-bezier(0.23,1,0.32,1) both}" +
  ".pdc-caption{margin:16px 0 0;max-width:46ch;font-size:15px;line-height:1.5;color:rgba(255,255,255,.78);" +
  "animation:pdc-in 700ms 260ms cubic-bezier(0.23,1,0.32,1) both}" +
  ".pdc-eyebrow{animation:pdc-in 600ms cubic-bezier(0.23,1,0.32,1) both}" +
  ".pdc-nav{display:flex;align-items:center;gap:10px;flex-shrink:0;pointer-events:auto}" +
  ".pdc-btn{display:flex;align-items:center;justify-content:center;width:44px;height:44px;padding:0;border-radius:50%;" +
  "border:1px solid rgba(255,255,255,.3);background:rgba(10,10,12,.28);color:#FFFFFF;cursor:pointer;" +
  "backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);transition:transform 160ms ease-out,background-color 200ms ease,border-color 200ms ease}" +
  ".pdc-next{position:relative;display:flex;align-items:center;gap:14px;padding:8px 18px 8px 8px;border-radius:18px;" +
  "border:1px solid rgba(255,255,255,.26);background:rgba(10,10,12,.32);color:#FFFFFF;cursor:pointer;text-align:left;" +
  "backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);overflow:hidden;" +
  "transition:transform 160ms ease-out,background-color 200ms ease,border-color 200ms ease}" +
  ".pdc-thumb{position:relative;flex-shrink:0;width:96px;height:64px;border-radius:11px;overflow:hidden;background:rgba(255,255,255,.08)}" +
  ".pdc-thumb img{position:absolute;inset:0;display:block;width:96px;height:64px;max-width:none;object-fit:cover;" +
  "transition:transform 700ms cubic-bezier(0.23,1,0.32,1),filter 400ms ease}" +
  ".pdc-thumb:after{content:'';position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 0 0 1px rgba(255,255,255,.18)}" +
  ".pdc-nextText{display:flex;flex-direction:column;gap:6px;min-width:0}" +
  ".pdc-nextLabel{display:flex;align-items:center;gap:8px;font:500 10px/1 ui-monospace,SFMono-Regular,Menlo,monospace;" +
  "letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.62)}" +
  ".pdc-nextTitle{max-width:180px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;" +
  "font-family:ui-serif,'Iowan Old Style','Palatino Linotype',Georgia,serif;font-size:19px;line-height:1.1}" +
  ".pdc-timer{position:absolute;left:0;bottom:0;height:2px;width:100%;background:#FFFFFF;transform-origin:left center;" +
  "transform:scaleX(0);animation:pdc-grow linear forwards;opacity:.85}" +
  ".pdc-btn:active,.pdc-next:active{transform:scale(0.97)}" +
  ".pdc-btn:disabled,.pdc-next:disabled{opacity:.4;cursor:default}" +
  ".pdc-btn:focus-visible,.pdc-next:focus-visible{outline:2px solid #FFFFFF;outline-offset:3px}" +
  "@media (hover:hover) and (pointer:fine){" +
  ".pdc-btn:hover:not(:disabled),.pdc-next:hover:not(:disabled){background:rgba(10,10,12,.5);border-color:rgba(255,255,255,.55)}" +
  ".pdc-next:hover:not(:disabled) .pdc-thumb img{transform:scale(1.08);filter:saturate(1.15)}" +
  ".pdc-next:hover:not(:disabled) .pdc-arrow{transform:translateX(3px)}}" +
  ".pdc-arrow{transition:transform 200ms ease-out}" +
  ".pdc-root[data-paused='true'] .pdc-fill,.pdc-root[data-paused='true'] .pdc-timer,.pdc-root[data-paused='true'] .pdc-clock{animation-play-state:paused}" +
  ".pdc-clock{position:absolute;width:0;height:0;animation:pdc-clock linear forwards}" +
  ".pdc-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);" +
  "white-space:nowrap;border:0}" +
  "@keyframes pdc-gather{from{opacity:0;filter:blur(10px);transform:translateY(.18em) scale(1.08)}}" +
  "@keyframes pdc-in{from{opacity:0;transform:translateY(8px)}}" +
  "@keyframes pdc-fade{from{opacity:0}}" +
  "@keyframes pdc-grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}" +
  "@keyframes pdc-clock{from{opacity:0}to{opacity:0}}" +
  "@media (prefers-reduced-motion:reduce){.pdc-ch,.pdc-caption,.pdc-eyebrow{animation-name:pdc-fade}" +
  ".pdc-thumb img,.pdc-fill{transition:none}}" +
  "@media (max-width:640px){.pdc-nextText,.pdc-prev{display:none}.pdc-next{padding:6px;border-radius:14px}" +
  ".pdc-thumb{width:72px;height:52px}.pdc-thumb img{width:72px;height:52px}.pdc-caption{font-size:14px}.pdc-bars{max-width:none}}"

export default function ParticleDissolveCarousel({
  items,
  height = "100svh",
  particles = 160000,
  duration = DURATION,
  pattern = "sweep",
  scatter = 1,
  turbulence = 1,
  glow = 0.6,
  dust = 0.35,
  push = 1,
  backdrop = "#08080A",
  autoplay = 0,
  loop = true,
  overlay = true,
  index,
  defaultIndex = 0,
  onIndexChange,
  className = "",
}: ParticleDissolveCarouselProps) {
  const n = items.length
  const rootRef = React.useRef<HTMLElement | null>(null)
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)

  const [uncontrolled, setUncontrolled] = React.useState(() => wrapIndex(defaultIndex, n, loop))
  const active = index === undefined ? wrapIndex(uncontrolled, n, loop) : wrapIndex(index, n, loop)

  const [failed, setFailed] = React.useState(false)
  const [ready, setReady] = React.useState(false)
  const [generation, setGeneration] = React.useState(0)
  const [reduced, setReduced] = React.useState(false)
  const [hidden, setHidden] = React.useState(false)
  const [inView, setInView] = React.useState(true)
  const [focused, setFocused] = React.useState(false)
  const [overControls, setOverControls] = React.useState(false)
  /** The user has taken over: rotation stops and does not come back. */
  const [stopped, setStopped] = React.useState(false)

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    // A tab in the background should neither animate nor rotate.
    const onVisibility = () => setHidden(document.hidden)
    onVisibility()
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      mq.removeEventListener("change", sync)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  React.useEffect(() => {
    const el = rootRef.current
    if (!el || typeof IntersectionObserver === "undefined") return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.15 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const go = React.useCallback(
    (next: number) => {
      const w = wrapIndex(next, n, loop)
      if (index === undefined) setUncontrolled(w)
      onIndexChange?.(w)
    },
    [index, n, loop, onIndexChange],
  )

  // ---- engine ----------------------------------------------------------------
  // Mutable state shared by the frame loop and the pointer; the loop reads it.
  const live = React.useRef({ reduced, duration, pattern, scatter, turbulence, glow, dust, push, backdrop, particles, awake: true })
  live.current = { reduced, duration, pattern, scatter, turbulence, glow, dust, push, backdrop, particles, awake: inView && !hidden }
  const engineRef = React.useRef({
    cur: active,
    wave: null as Wave | null,
    /** A slide asked for while a dissolve is running; it starts the moment that one lands. */
    queued: null as number | null,
    /** Where the next dissolve should ripple from: set by a click, consumed by the wave. */
    origin: null as [number, number] | null,
    aspect: 1.6,
    mouse: null as [number, number] | null,
    energy: 0,
    kick: () => {},
    refit: () => {},
    start: (_to: number) => {},
  })
  const E = engineRef.current

  E.start = (to: number) => {
    if (to === E.cur) return
    const { reduced: still, duration: ms, pattern: shape } = live.current
    const count = items.length
    const forward = loop ? ((to - E.cur + count) % count) * 2 <= count : to > E.cur
    const a = E.aspect
    const click = E.origin
    E.origin = null
    const jitter = Math.random() - 0.5
    let origin: [number, number]
    let dir: [number, number] = [0, 0]
    let radial = true
    if (click && shape !== "scatter") origin = click
    else if (shape === "radial") origin = [a * (0.5 + jitter * 0.3), 0.5 + (Math.random() - 0.5) * 0.3]
    else if (shape === "scatter") origin = [a / 2, 0.5]
    else {
      // A sweep goes the way the slides do: forward comes apart from the right.
      radial = false
      const dy = jitter * 0.45
      const len = Math.hypot(1, dy)
      dir = [(forward ? -1 : 1) / len, dy / len]
      origin = [forward ? a : 0, 0.5]
    }
    E.wave = {
      from: E.cur,
      to,
      t: 0,
      duration: (still ? REDUCED_DURATION : Math.max(ms, 600)) / 1000,
      origin,
      dir,
      radial,
      grain: shape === "scatter" ? 1 : 0.2,
      reach: waveReach(origin[0], origin[1], a, radial ? null : dir),
      seed: Math.random() * 100,
    }
    E.kick()
  }

  // Any index change dissolves into the new slide. One already running
  // finishes first; the newest request waits and follows straight on.
  const previous = React.useRef(active)
  React.useEffect(() => {
    if (previous.current === active) return
    previous.current = active
    if (E.wave) {
      E.queued = active
      return
    }
    E.start(active)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  // Waking (scrolled back into view, tab shown) restarts a loop that idled.
  React.useEffect(() => {
    if (inView && !hidden) E.kick()
  }, [inView, hidden, E])

  const sources = items.map((i) => i.src).join("\n")

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || n === 0) return
    const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false })
    if (!gl) {
      setFailed(true)
      return
    }

    let disposed = false
    let raf = 0
    let last = 0
    let clock = 0
    let started = false
    // Frame-time watchdog: judge the first busy frames, once.
    let lite = false
    let judged = 0
    let slow = 0
    let mouseVel: [number, number] = [0, 0]
    let lastMouse: [number, number] | null = null
    const pictures: (Picture | null)[] = items.map(() => null)
    let picProg: Prog
    let grainProg: Prog
    let quad: WebGLVertexArrayObject | null = null
    let swarm: Swarm | null = null
    const owned: { textures: WebGLTexture[]; buffers: WebGLBuffer[] } = { textures: [], buffers: [] }

    const onLost = (e: Event) => {
      e.preventDefault()
      cancelAnimationFrame(raf)
      raf = 0
    }
    const onRestored = () => setGeneration((g) => g + 1)
    canvas.addEventListener("webglcontextlost", onLost)
    canvas.addEventListener("webglcontextrestored", onRestored)

    const shader = (type: number, src: string) => {
      const s = gl.createShader(type)
      if (!s) throw new Error("could not create shader")
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error("shader: " + gl.getShaderInfoLog(s))
      return s
    }
    const program = (vert: string, frag: string, varyings?: string[]): Prog => {
      const prog = gl.createProgram()
      if (!prog) throw new Error("could not create program")
      const v = shader(gl.VERTEX_SHADER, vert)
      const fr = shader(gl.FRAGMENT_SHADER, frag)
      gl.attachShader(prog, v)
      gl.attachShader(prog, fr)
      if (varyings) gl.transformFeedbackVaryings(prog, varyings, gl.SEPARATE_ATTRIBS)
      gl.linkProgram(prog)
      gl.deleteShader(v)
      gl.deleteShader(fr)
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link: " + gl.getProgramInfoLog(prog))
      const u: Prog["u"] = {}
      const count = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS) as number
      for (let i = 0; i < count; i++) {
        const info = gl.getActiveUniform(prog, i)
        if (info) u[info.name.replace(/^u_/, "")] = gl.getUniformLocation(prog, info.name)
      }
      return { prog, u }
    }
    const use = (p: Prog, u: Record<string, Uniform>) => {
      gl.useProgram(p.prog)
      for (const k in u) {
        const loc = p.u[k]
        if (!loc) continue
        const v = u[k]
        if (typeof v === "number") gl.uniform1f(loc, v)
        else if (Array.isArray(v)) {
          if (v.length === 2) gl.uniform2f(loc, v[0], v[1])
          else gl.uniform3f(loc, v[0], v[1], v[2])
        } else {
          gl.activeTexture(gl.TEXTURE0 + v.unit)
          gl.bindTexture(gl.TEXTURE_2D, v.tex)
          gl.uniform1i(loc, v.unit)
        }
      }
    }
    const buffer = (data: Float32Array, usage: number) => {
      const b = gl.createBuffer()
      if (!b) throw new Error("could not allocate a buffer")
      gl.bindBuffer(gl.ARRAY_BUFFER, b)
      gl.bufferData(gl.ARRAY_BUFFER, data, usage)
      owned.buffers.push(b)
      return b
    }
    const dropSwarm = () => {
      if (!swarm) return
      for (const v of swarm.vao) gl.deleteVertexArray(v)
      for (const b of [...swarm.state, ...swarm.life, ...swarm.statics]) {
        gl.deleteBuffer(b)
        owned.buffers = owned.buffers.filter((x) => x !== b)
      }
      swarm = null
    }

    // One grain per cell of a grid over the stage, jittered so it never reads as a grid.
    const buildSwarm = () => {
      dropSwarm()
      const most = live.current.particles * (lite ? 0.5 : 1)
      const count = grainCount(canvas.clientWidth, canvas.clientHeight, most)
      const [cols, rows] = grid(count, E.aspect)
      const total = cols * rows
      const home = new Float32Array(total * 2)
      const seed = new Float32Array(total * 4)
      const life = new Float32Array(total * 2)
      for (let r = 0, i = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++, i++) {
          home[i * 2] = (c + 0.5 + (Math.random() - 0.5) * 0.7) / cols
          home[i * 2 + 1] = (r + 0.5 + (Math.random() - 0.5) * 0.7) / rows
          for (let k = 0; k < 4; k++) seed[i * 4 + k] = Math.random()
          life[i * 2] = Math.random() * 6
        }
      }
      const zeros = new Float32Array(total * 4)
      const statics = [buffer(home, gl.STATIC_DRAW), buffer(seed, gl.STATIC_DRAW)]
      const state = [buffer(zeros, gl.DYNAMIC_COPY), buffer(zeros, gl.DYNAMIC_COPY)]
      const lifeBufs = [buffer(life, gl.DYNAMIC_COPY), buffer(life, gl.DYNAMIC_COPY)]
      const vao = [0, 1].map((side) => {
        const v = gl.createVertexArray()
        if (!v) throw new Error("could not create a vertex array")
        gl.bindVertexArray(v)
        const attrib = (loc: number, b: WebGLBuffer, size: number) => {
          gl.bindBuffer(gl.ARRAY_BUFFER, b)
          gl.enableVertexAttribArray(loc)
          gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0)
        }
        attrib(0, statics[0], 2)
        attrib(1, statics[1], 4)
        attrib(2, state[side], 4)
        attrib(3, lifeBufs[side], 2)
        return v
      })
      gl.bindVertexArray(null)
      gl.bindBuffer(gl.ARRAY_BUFFER, null)
      swarm = { n: total, cols, rows, vao, state, life: lifeBufs, statics, side: 0 }
    }

    // The mip level a grain samples at: about one grain's worth of picture.
    const lodFor = (pic: Picture, cols: number) => {
      const a = E.aspect
      const visible = a > pic.aspect ? pic.w : pic.w * (a / pic.aspect)
      return Math.max(0, Math.log2(visible / cols))
    }

    const pick = (i: number) => pictures[i] ?? pictures.find((p) => p) ?? null

    const draw = (dt: number) => {
      const L = live.current
      const w = E.wave
      const from = pick(w ? w.from : E.cur)
      const to = pick(w ? w.to : E.cur)
      if (!from || !to) return
      const p = w ? Math.min(w.t / w.duration, 1) : 0
      const timeline: Record<string, Uniform> = {
        aspect: E.aspect,
        p,
        origin: w ? w.origin : [0, 0],
        dir: w ? w.dir : [1, 0],
        radial: w && w.radial ? 1 : 0,
        reach: w ? w.reach : 1,
        grain: w ? w.grain : 0,
        seed: w ? w.seed : 0,
        from: { unit: 0, tex: from.tex },
        to: { unit: 1, tex: to.tex },
        fromAspect: from.aspect,
        toAspect: to.aspect,
        glow: L.glow,
        cells: swarm ? [swarm.cols, swarm.rows] : [1, 1],
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.disable(gl.BLEND)
      use(picProg, { ...timeline, backdrop: parseHex(L.backdrop), still: L.reduced ? 1 : 0, res: [canvas.width, canvas.height] })
      gl.bindVertexArray(quad)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

      if (L.reduced || !swarm) return
      const s = swarm
      const m = E.mouse
      use(grainProg, {
        ...timeline,
        fromLod: lodFor(from, s.cols),
        toLod: lodFor(to, s.cols),
        dt,
        time: clock,
        mouse: m ?? [-10, -10],
        mouseVel: m ? mouseVel : [0, 0],
        push: L.push * PUSH_GAIN,
        turb: L.turbulence,
        scatter: L.scatter,
        dust: L.dust,
        point: (canvas.width / s.cols) * 1.45,
      })
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
      const next = 1 - s.side
      gl.bindVertexArray(s.vao[s.side])
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, s.state[next])
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, s.life[next])
      gl.beginTransformFeedback(gl.POINTS)
      gl.drawArrays(gl.POINTS, 0, s.n)
      gl.endTransformFeedback()
      // A buffer still bound for feedback cannot be read as an attribute next frame.
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null)
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, null)
      gl.bindVertexArray(null)
      s.side = next
    }

    const frame = (now: number) => {
      raf = 0
      if (disposed || !started) return
      const raw = (now - last) / 1000
      last = now
      // A dissolve keeps to the clock even when frames are slow, so a
      // struggling device still lands it on time instead of in slow motion.
      const elapsed = Math.min(raw, 0.25)
      const dt = Math.min(elapsed, 1 / 30)
      clock += dt
      const L = live.current
      if (!lite && judged < 40 && !L.reduced) {
        judged += 1
        if (judged > 6 && raw > SLOW_FRAME_S) slow += 1
        if (slow >= SLOW_FRAMES) {
          lite = true
          resize(true)
        }
      }
      // Pointer momentum, smoothed so a flick carries on a moment after the hand stops.
      const m = E.mouse
      if (m && lastMouse && dt > 0) {
        const k = 1 - Math.exp(-dt * 9)
        mouseVel = [mouseVel[0] + ((m[0] - lastMouse[0]) / dt - mouseVel[0]) * k, mouseVel[1] + ((m[1] - lastMouse[1]) / dt - mouseVel[1]) * k]
        if (Math.hypot(mouseVel[0], mouseVel[1]) > 0.05) E.energy = now
      } else mouseVel = [0, 0]
      lastMouse = m ? [m[0], m[1]] : null

      const w = E.wave
      let landed = false
      if (w) {
        w.t += elapsed
        landed = w.t >= w.duration
        E.energy = now
      }
      draw(dt)
      if (w && landed) {
        // Every grain was home and the new picture whole on the frame just drawn.
        E.cur = w.to
        E.wave = null
        const q = E.queued
        E.queued = null
        if (q !== null && q !== E.cur) E.start(q)
      }
      const shedding = L.dust > 0 && !L.reduced
      if (E.wave || (L.awake && (shedding || now - E.energy < SETTLE_S * 1000))) {
        raf = requestAnimationFrame(frame)
      }
    }
    E.refit = () => {
      if (started) resize(true)
    }
    E.kick = () => {
      if (raf || disposed || !started) return
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }

    const resize = (rebuild = false) => {
      const dpr = lite ? 1 : Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.round(canvas.clientWidth * dpr)
      const h = Math.round(canvas.clientHeight * dpr)
      if (w === 0 || h === 0) return
      const aspect = w / h
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      const want = grainCount(canvas.clientWidth, canvas.clientHeight, live.current.particles * (lite ? 0.5 : 1))
      if (rebuild || !swarm || Math.abs(aspect - E.aspect) / E.aspect > 0.02 || Math.abs(want - swarm.n) / swarm.n > 0.12) {
        E.aspect = aspect
        buildSwarm()
      }
      draw(0)
      E.kick()
    }

    try {
      picProg = program(QUAD_VERT, PICTURE_FRAG)
      grainProg = program(GRAIN_VERT, GRAIN_FRAG, ["v_state", "v_life"])
      quad = gl.createVertexArray()
      gl.bindVertexArray(quad)
      buffer(new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
      gl.enableVertexAttribArray(0)
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
      gl.bindVertexArray(null)
      E.aspect = Math.max(canvas.clientWidth, 1) / Math.max(canvas.clientHeight, 1)
    } catch {
      if (!disposed) setFailed(true)
      return
    }
    const observer = new ResizeObserver(() => started && resize())
    observer.observe(canvas)

    let refused = 0
    items.forEach((item, i) => {
      loadImage(item.src).then(
        (img) => {
          if (disposed) return
          const tex = gl.createTexture()
          if (!tex) return
          gl.bindTexture(gl.TEXTURE_2D, tex)
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
          // Mipmaps: the picture is shown smaller than it is, and each grain
          // samples about one grain's worth of it.
          gl.generateMipmap(gl.TEXTURE_2D)
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
          owned.textures.push(tex)
          const w = img.naturalWidth || 1
          const h = img.naturalHeight || 1
          pictures[i] = { tex, aspect: w / h, w, h }
          if (!started) {
            started = true
            setReady(true)
            resize(true)
          } else if (!raf) draw(0)
        },
        () => {
          refused += 1
          if (refused === items.length && !disposed) setFailed(true)
        },
      )
    })

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      E.kick = () => {}
      E.refit = () => {}
      observer.disconnect()
      canvas.removeEventListener("webglcontextlost", onLost)
      canvas.removeEventListener("webglcontextrestored", onRestored)
      dropSwarm()
      if (quad) gl.deleteVertexArray(quad)
      for (const t of owned.textures) gl.deleteTexture(t)
      for (const b of owned.buffers) gl.deleteBuffer(b)
      if (picProg) gl.deleteProgram(picProg.prog)
      if (grainProg) gl.deleteProgram(grainProg.prog)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sources, generation, n])

  // A new grain budget rebuilds the swarm.
  React.useEffect(() => {
    E.refit()
  }, [particles, E])

  // ---- pointer -----------------------------------------------------------------
  const press = React.useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null)

  const toStage = (e: React.PointerEvent<HTMLDivElement>): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect()
    return [((e.clientX - r.left) / r.width) * E.aspect, 1 - (e.clientY - r.top) / r.height]
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const pr = press.current
    if (pr && e.pointerId === pr.id && Math.hypot(e.clientX - pr.x, e.clientY - pr.y) > 8) pr.moved = true
    if (reduced || push <= 0 || !ready) return
    E.mouse = toStage(e)
    E.kick()
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    press.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false }
  }

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const pr = press.current
    press.current = null
    if (!pr || e.pointerId !== pr.id || pr.moved || n < 2) return
    // A tap dissolves into the next slide, rippling out from where it landed.
    if (!loop && active >= n - 1) return
    setStopped(true)
    E.origin = toStage(e)
    go(active + 1)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault()
      setStopped(true)
      go(active + (e.key === "ArrowRight" ? 1 : -1))
    }
  }

  // ---- autoplay ----------------------------------------------------------------
  // The progress bar, the up-next card's timer and a hidden clock share one
  // duration and one pause state, so what fills is exactly what fires. Resting
  // the pointer on the picture does not pause it (on a full-bleed hero it
  // would never run); the controls, focus, a hidden tab or scrolling it away
  // does, and taking over stops it for good.
  const playing = autoplay > 0 && !reduced && n > 1 && ready && !stopped && (loop || active < n - 1)
  const paused = overControls || focused || hidden || !inView

  const current = items[active]
  const atStart = !loop && active === 0
  const atEnd = !loop && active === n - 1
  const nextItem = n > 1 && !atEnd ? items[wrapIndex(active + 1, n, loop)] : undefined
  const announce = current ? (current.title ?? current.alt ?? "Slide") + ", " + (active + 1) + " of " + n : ""
  const title = current?.title ?? ""

  const step = (d: number) => {
    setStopped(true)
    go(active + d)
  }

  return (
    <section
      ref={rootRef}
      className={"pdc-root " + className}
      style={{ height }}
      role="region"
      aria-roledescription="carousel"
      aria-label="Carousel"
      data-paused={paused}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false)
      }}
    >
      <style>{CSS}</style>
      <div
        className="pdc-stage"
        tabIndex={0}
        aria-label="Slides. Click to dissolve into the next one, or use the arrow keys."
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          press.current = null
        }}
        onPointerLeave={() => {
          E.mouse = null
        }}
      >
        {failed ? (
          items.map((item, i) => (
            <img
              key={item.src}
              className="pdc-fallback"
              src={item.src}
              alt={i === active ? item.alt ?? "" : ""}
              aria-hidden={i !== active}
              draggable={false}
              style={{ opacity: i === active ? 1 : 0 }}
            />
          ))
        ) : (
          <canvas ref={canvasRef} className="pdc-canvas" style={{ opacity: ready ? 1 : 0 }} aria-hidden="true" />
        )}
      </div>

      {overlay && n > 0 ? (
        <div className="pdc-overlay">
          <div className="pdc-top">
            <span className="pdc-count">
              <b>{pad(active + 1)}</b> / {pad(n)}
            </span>
            {n > 1 ? (
              <div
                className="pdc-bars"
                onPointerEnter={() => setOverControls(true)}
                onPointerLeave={() => setOverControls(false)}
              >
                {items.map((item, i) => (
                  <button
                    key={item.src + i}
                    type="button"
                    className="pdc-bar"
                    data-state={i < active ? "past" : i === active ? (playing ? "timed" : "now") : "next"}
                    aria-label={"Go to slide " + (i + 1) + (item.title ? ": " + item.title : "")}
                    aria-current={i === active ? "true" : undefined}
                    onClick={() => {
                      setStopped(true)
                      go(i)
                    }}
                  >
                    <span
                      className="pdc-fill"
                      key={i === active && playing ? "timed-" + active : "fill"}
                      style={i === active && playing ? { animationDuration: autoplay + "ms" } : undefined}
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="pdc-bottom">
            <div className="pdc-text" key={active}>
              {current?.eyebrow ? <p className="pdc-eyebrow">{current.eyebrow}</p> : null}
              {title ? (
                <h2 className="pdc-title" aria-label={title}>
                  {Array.from(title).map((ch, i) => (
                    <span
                      key={i}
                      className="pdc-ch"
                      aria-hidden="true"
                      style={{ animationDelay: Math.round(120 + i * 28 + ((i * 7919) % 11) * 14) + "ms" }}
                    >
                      {ch}
                    </span>
                  ))}
                </h2>
              ) : null}
              {current?.caption ? <p className="pdc-caption">{current.caption}</p> : null}
            </div>

            {n > 1 ? (
              <div
                className="pdc-nav"
                onPointerEnter={() => setOverControls(true)}
                onPointerLeave={() => setOverControls(false)}
              >
                <button type="button" className="pdc-btn pdc-prev" onClick={() => step(-1)} disabled={atStart} aria-label="Previous slide">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M19 12H5M11 18l-6-6 6-6" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="pdc-next"
                  onClick={() => step(1)}
                  disabled={!nextItem}
                  aria-label={"Next slide" + (nextItem?.title ? ": " + nextItem.title : "")}
                >
                  <span className="pdc-thumb">
                    {nextItem ? <img src={nextItem.src} alt="" width={96} height={64} draggable={false} /> : null}
                  </span>
                  <span className="pdc-nextText">
                    <span className="pdc-nextLabel">
                      Up next
                      <svg className="pdc-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </span>
                    <span className="pdc-nextTitle">{nextItem?.title ?? "Next"}</span>
                  </span>
                  {playing ? <span className="pdc-timer" key={"timer-" + active} style={{ animationDuration: autoplay + "ms" }} /> : null}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {playing ? (
        <span
          className="pdc-clock"
          key={"clock-" + active}
          style={{ animationDuration: autoplay + "ms" }}
          onAnimationEnd={() => go(active + 1)}
          aria-hidden="true"
        />
      ) : null}

      <p className="pdc-sr" aria-live="polite">
        {announce}
      </p>
    </section>
  )
}
