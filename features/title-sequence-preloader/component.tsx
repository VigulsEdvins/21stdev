"use client"

import * as React from "react"

/**
 * Title Sequence Preloader: a page gate cut like a conference opening title.
 * While the page loads, a monochrome reel plays shot after shot: light pouring
 * through a window onto a monitor, a faceted monolith turning under a lamp,
 * frozen debris round an eye that watches the pointer, a targeting reticle in
 * fog, a kaleidoscope tunnel of blocks, a date strung between two names, a
 * figure on a moon, and a dark planet with a lashed corona. Every shot credits
 * your people on leader lines, in its own typographic voice. When the load
 * reaches 100 a rocket lifts off through the clouds, the clouds rise over the
 * lens, and they dissolve to reveal the page.
 *
 * Self-contained: React is the only import. All nine scenes are one inline
 * WebGL2 fragment shader (raymarched solids, value-noise fog, volumetric light),
 * graded to two inks. Callouts, HUD and type are DOM and SVG over the canvas.
 *
 * Interactive: the camera drifts with the pointer; hovering a credit holds the
 * shot; tap to cut to the next shot; hold to fast-forward; arrows cut, Enter
 * skips. Honours prefers-reduced-motion: stills instead of motion, no drift.
 */

export type TitleCredit = string | { name: string; role?: string }

export type TitleShot =
  | "beams"
  | "monolith"
  | "debris"
  | "target"
  | "tunnel"
  | "constellation"
  | "moon"
  | "eclipse"

export type TitleSequencePreloaderProps = {
  /** The people on the leader lines. The first word of a name is set as the given name. */
  credits?: TitleCredit[]
  /** Finale, left of the rocket. */
  title?: string
  /** Finale, right of the rocket. */
  location?: string
  /** The date strung between two names. Defaults to today, DD.MM.YYYY. */
  date?: string
  /** Which shots, in what order. Repeats are allowed. */
  shots?: TitleShot[]
  /** Real load progress, 0 to 100. Leave out to run the built-in timed loader. */
  progress?: number
  /** Length of the built-in loader. The reel is paced to land on it. */
  durationMs?: number
  /** Length of one shot when `progress` drives the gate. */
  shotMs?: number
  /** Never lift: the reel and the finale play forever. */
  loop?: boolean
  /** Multiplies every clock in the sequence. */
  speed?: number
  /** Cyan: given names, the date, the counter. */
  accent?: string
  /** A hot red for tally lights and one tag in the debris shot. */
  hot?: string
  /** A pale yellow for tagged credits. */
  marker?: string
  /** The navy plate behind boxed credits. */
  plate?: string
  /** Highlight ink of the grade. */
  tint?: string
  /** Shadow ink of the grade. */
  shade?: string
  /** Film grain, 0 to 1. */
  grain?: number
  /** Pointer drift, tap-to-cut, hold-to-fast-forward and keys. */
  interactive?: boolean
  /** The skip button. Empty hides it. */
  skipLabel?: string
  /** Bottom bar hint. Empty hides it. */
  hint?: string
  /** Stage height. Must be a definite length: "100%" collapses on most pages. */
  height?: string
  /** Fires on every cut. */
  onShotChange?: (index: number, shot: TitleShot) => void
  /** Fires once, when the clouds have cleared. Never fires while looping. */
  onComplete?: () => void
  className?: string
  /** The page behind the gate. */
  children?: React.ReactNode
}

// #region logic
export const SHOT_IDS = ["beams", "monolith", "debris", "target", "tunnel", "constellation", "moon", "eclipse"]
/** Shader scene of the rocket, after the last credit. */
export const FINALE_SCENE = 8
export const FINALE_MS = 4600
export const REVEAL_MS = 1700

export type Look = "duo" | "mono" | "tag" | "plate" | "orbit" | "rail"
/**
 * One credit position. `a` is what the leader points at, in scene units (x
 * right, y up, 1 = the stage's shorter side, origin at the centre), so it
 * stays on the object the shader drew there. `e` is where the leader ends and
 * the label begins, as fractions of the stage from its centre (landscape);
 * `p` is the same on a portrait stage. `side` is which way the label reads
 * away from `e`.
 */
export type Slot = { a: number[]; e: number[]; p: number[]; side: "l" | "r" }
export type ShotDef = { scene: number; look: Look; slots: Slot[] }

function slot(a: number[], e: number[], p: number[], side: "l" | "r"): Slot {
  return { a, e, p, side }
}

// Slots are listed in fill order: with fewer names than slots, the first ones
// are used, so each list alternates sides.
export const SHOTS: { [id: string]: ShotDef } = {
  beams: {
    scene: 0,
    look: "duo",
    slots: [
      slot([-0.3, 0.125], [-0.33, 0.33], [-0.34, 0.26], "r"),
      slot([0.26, -0.33], [0.1, -0.1], [0.3, -0.3], "l"),
      slot([0.5, 0.2], [0.34, 0.3], [0.3, 0.3], "l"),
    ],
  },
  monolith: {
    scene: 1,
    look: "mono",
    slots: [
      slot([-0.12, 0.13], [-0.24, 0.28], [-0.34, 0.3], "l"),
      slot([0.14, 0.08], [0.24, 0.2], [0.34, 0.24], "r"),
      slot([-0.13, -0.09], [-0.24, -0.2], [-0.34, -0.24], "l"),
      slot([0.1, -0.15], [0.25, -0.28], [0.34, -0.3], "r"),
    ],
  },
  debris: {
    scene: 2,
    look: "tag",
    slots: [
      slot([-0.08, 0.08], [-0.17, 0.3], [-0.34, 0.3], "l"),
      slot([0.09, 0.07], [0.2, 0.3], [0.34, 0.24], "r"),
      slot([-0.1, -0.06], [-0.24, -0.2], [-0.34, -0.24], "l"),
      slot([0.1, -0.08], [0.27, -0.16], [0.34, -0.3], "r"),
    ],
  },
  target: {
    scene: 3,
    look: "plate",
    slots: [
      slot([-0.2, 0], [-0.24, 0.034], [-0.34, 0.22], "l"),
      slot([0.2, 0], [0.24, 0.034], [0.34, -0.22], "r"),
      slot([-0.2, 0], [-0.24, -0.034], [-0.34, 0.17], "l"),
      slot([0.2, 0], [0.24, -0.034], [0.34, -0.17], "r"),
    ],
  },
  tunnel: {
    scene: 4,
    look: "plate",
    slots: [
      slot([-0.09, 0], [-0.2, 0.034], [-0.34, 0.24], "l"),
      slot([0.09, 0], [0.2, 0.034], [0.34, -0.24], "r"),
      slot([-0.09, 0], [-0.2, -0.034], [-0.34, 0.19], "l"),
      slot([0.09, 0], [0.2, -0.034], [0.34, -0.19], "r"),
    ],
  },
  constellation: {
    scene: 5,
    look: "orbit",
    slots: [slot([-0.15, 0], [-0.19, 0], [-0.34, 0.1], "l"), slot([0.15, 0], [0.19, 0], [0.34, -0.1], "r")],
  },
  moon: {
    scene: 6,
    look: "duo",
    slots: [
      slot([-0.03, -0.1], [-0.2, -0.2], [-0.34, -0.2], "l"),
      slot([0.035, -0.1], [0.2, -0.2], [0.34, -0.3], "r"),
      slot([-0.03, -0.1], [-0.2, -0.255], [-0.34, -0.25], "l"),
      slot([0.035, -0.1], [0.2, -0.255], [0.34, -0.35], "r"),
    ],
  },
  eclipse: {
    scene: 7,
    look: "rail",
    slots: [
      slot([-0.21, 0], [-0.21, 0.04], [-0.34, 0.2], "l"),
      slot([0.21, 0], [0.21, 0.04], [0.34, -0.2], "r"),
      slot([-0.21, 0], [-0.21, -0.045], [-0.34, 0.15], "l"),
      slot([0.21, 0], [0.21, -0.045], [0.34, -0.15], "r"),
    ],
  },
}

export function clamp(x: number, lo: number, hi: number) {
  return x < lo ? lo : x > hi ? hi : x
}

export function smooth(a: number, b: number, x: number) {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

/** Unknown ids are dropped; an empty result means every shot. */
export function shotList(shots?: string[] | null) {
  const out = (shots || []).filter((s) => Object.prototype.hasOwnProperty.call(SHOTS, s))
  return out.length ? out : SHOT_IDS.slice()
}

export type Credit = { first: string; rest: string; role: string }

/** "Ada Lindqvist" → given name "Ada", the rest "Lindqvist". */
export function splitCredit(c: TitleCredit): Credit {
  const name = typeof c === "string" ? c : c && typeof c.name === "string" ? c.name : ""
  const role = typeof c === "object" && c && typeof c.role === "string" ? c.role.trim() : ""
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return { first: parts[0] || "", rest: parts.slice(1).join(" "), role }
}

/**
 * Which names go in which shot. Fewer names than slots: dealt round-robin so
 * every shot gets its share, in reading order. More: each pass round the reel
 * (`cycle`) moves on to the next names.
 */
export function distribute(n: number, caps: number[], cycle: number) {
  const total = caps.reduce((a, b) => a + b, 0)
  if (n <= 0 || total <= 0) return caps.map(() => [] as number[])
  const counts = caps.map(() => 0)
  if (n >= total) {
    for (let i = 0; i < caps.length; i++) counts[i] = caps[i]
  } else {
    let left = n
    for (let r = 0; left > 0; r++) {
      for (let i = 0; i < caps.length && left > 0; i++) {
        if (r < caps[i]) {
          counts[i]++
          left--
        }
      }
    }
  }
  let k = n > total ? (Math.max(0, Math.floor(cycle)) * total) % n : 0
  return counts.map((c) => {
    const out = [] as number[]
    for (let j = 0; j < c; j++) out.push(k++ % n)
    return out
  })
}

/** The built-in loader: bursts and stalls like a real one, 0 → 100 at `duration`. */
export function simulatedProgress(ms: number, duration: number) {
  const K = [0, 0, 0.07, 8, 0.16, 19, 0.24, 23, 0.35, 41, 0.46, 50, 0.55, 54, 0.66, 70, 0.76, 77, 0.86, 90, 0.94, 96, 1, 100]
  const u = clamp(ms / Math.max(1, duration), 0, 1)
  for (let i = 2; i < K.length; i += 2) {
    if (u <= K[i]) {
      const t = (u - K[i - 2]) / (K[i] - K[i - 2])
      return K[i - 1] + (K[i + 1] - K[i - 1]) * t * t * (3 - 2 * t)
    }
  }
  return 100
}

export type Phase = "titles" | "finale" | "reveal" | "done"
export type DirState = {
  phase: Phase
  /** Index into the shot list. */
  shot: number
  /** Passes round the list. */
  cycle: number
  /** ms into the current shot, finale or reveal. */
  local: number
  /** The built-in loader's clock; the reel is paced on it. */
  clock: number
  /** The counter, 0..100, never falling. */
  shown: number
  /** ms since the gate opened, for the timecode. */
  total: number
  /** Skip was pressed before the load finished. */
  armed: boolean
}
export type DirOpts = {
  count: number
  shotMs: number
  duration: number
  finaleMs: number
  revealMs: number
  /** Real progress, or null for the built-in loader. */
  target: number | null
  loop: boolean
  /** A credit is hovered: the shot waits. */
  hold: boolean
}

export function initialState(): DirState {
  return { phase: "titles", shot: 0, cycle: 0, local: 0, clock: 0, shown: 0, total: 0, armed: false }
}

export function loadedOf(s: DirState, o: DirOpts) {
  return o.target === null ? simulatedProgress(s.clock, o.duration) : clamp(o.target, 0, 100)
}

/** One tick of the sequence. Pure: the same state and input give the same result. */
export function advance(prev: DirState, dt: number, o: DirOpts): DirState {
  const s = { ...prev }
  const count = Math.max(1, o.count)
  s.total += dt
  if (s.phase === "titles") {
    if (o.target === null) {
      // The loader and the reel share one clock, so the last shot ends at 100.
      if (!o.hold) s.clock = Math.min(o.duration, s.clock + dt)
      const shot = Math.min(count - 1, Math.floor((s.clock + 1e-6) / o.shotMs))
      s.local = s.clock - shot * o.shotMs
      s.shot = shot
      if (s.clock >= o.duration) {
        s.phase = "finale"
        s.local = 0
      }
    } else {
      if (!o.hold) s.local += dt
      if (s.local >= o.shotMs) {
        s.shot = (s.shot + 1) % count
        if (s.shot === 0) s.cycle++
        s.local = 0
      }
      if (clamp(o.target, 0, 100) >= 100 && (s.armed || s.local >= o.shotMs * 0.5)) {
        s.phase = "finale"
        s.local = 0
      }
    }
  } else if (s.phase === "finale") {
    s.local += dt
    if (s.local >= o.finaleMs) {
      if (o.loop) return { ...initialState(), cycle: s.cycle + 1, total: s.total }
      s.phase = "reveal"
      s.local = 0
    }
  } else if (s.phase === "reveal") {
    s.local += dt
    if (s.local >= o.revealMs) s.phase = "done"
  }
  // The counter eases after the load, never runs backwards, and reads 100 at lift-off.
  if (s.phase !== "titles") {
    s.shown = 100
    return s
  }
  const L = loadedOf(s, o)
  s.shown = Math.max(s.shown, L - s.shown < 0.05 ? L : s.shown + (L - s.shown) * (1 - Math.exp(-dt / 140)))
  return s
}

/** Skip: straight to the finale once the load allows it; from the finale, straight to the reveal. */
export function skip(prev: DirState, o: DirOpts): DirState {
  const s = { ...prev }
  if (s.phase === "finale" && !o.loop) return { ...s, phase: "reveal", local: 0 }
  if (s.phase !== "titles") return s
  if (o.target === null) return { ...s, clock: o.duration, phase: "finale", local: 0 }
  if (clamp(o.target, 0, 100) >= 100) return { ...s, phase: "finale", local: 0 }
  return { ...s, armed: true }
}

/** Cut to the next (dir 1) or previous (dir -1) shot. */
export function cut(prev: DirState, dir: number, o: DirOpts): DirState {
  if (prev.phase !== "titles") return prev
  const count = Math.max(1, o.count)
  const s = { ...prev }
  if (o.target === null) {
    const next = s.shot + (dir < 0 ? -1 : 1)
    if (next >= count) return skip(s, o)
    s.shot = Math.max(0, next)
    s.clock = s.shot * o.shotMs
    s.local = 0
    return s
  }
  s.shot = (s.shot + (dir < 0 ? count - 1 : 1)) % count
  if (dir > 0 && s.shot === 0) s.cycle++
  s.local = 0
  return s
}

function hash1(x: number) {
  const v = Math.sin(x * 12.9898 + 78.233) * 43758.5453
  return v - Math.floor(v)
}

const GLYPHS = "#%&*+=-/:;01"

/** Text resolving out of noise, left to right with a little jitter. u = 1 is the text. */
export function scramble(text: string, u: number, seed: number) {
  let out = ""
  const n = text.length
  for (let i = 0; i < n; i++) {
    const ch = text[i]
    if (ch === " ") {
      out += " "
      continue
    }
    const at = (i / Math.max(1, n)) * 0.7 + hash1(i * 7.1 + seed) * 0.3
    if (u >= at) out += ch
    else out += GLYPHS[Math.floor(hash1(i * 3.7 + seed + Math.floor(u * 24) * 1.3) * GLYPHS.length) % GLYPHS.length]
  }
  return out
}

const LEET: { [k: string]: string } = { A: "4", E: "3", I: "1", O: "0", S: "5", T: "7" }

/** One letter swapped for its digit, the flicker of a title card being typed. */
export function leet(text: string, pick: number) {
  const idx = [] as number[]
  for (let i = 0; i < text.length; i++) if (LEET[text[i].toUpperCase()]) idx.push(i)
  if (!idx.length) return text
  const i = idx[Math.abs(Math.floor(pick)) % idx.length]
  return text.slice(0, i) + LEET[text[i].toUpperCase()] + text.slice(i + 1)
}

export function timecode(ms: number, fps = 24) {
  const f = Math.floor(Math.max(0, ms) / (1000 / fps))
  const v = [Math.floor(f / fps / 3600), Math.floor(f / fps / 60) % 60, Math.floor(f / fps) % 60, f % fps]
  return v.map((x) => String(x).padStart(2, "0")).join(":")
}

export function formatDate(d: Date) {
  return String(d.getDate()).padStart(2, "0") + "." + String(d.getMonth() + 1).padStart(2, "0") + "." + d.getFullYear()
}

export function hexToRgb(hex: string) {
  let h = String(hex || "").trim().replace(/^#/, "")
  if (h.length === 3) h = h.split("").map((c) => c + c).join("")
  if (!/^[0-9a-f]{6}$/i.test(h)) return [0, 0, 0]
  const n = parseInt(h, 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

/** Label size, pessimistic: fallback faces run wider than the condensed ones asked for. */
export function estimateLabel(c: Credit, look: string, fs: number) {
  const n = c.first.length + (c.rest ? c.rest.length + 1 : 0)
  const per = look === "orbit" ? 0.98 : look === "rail" ? 0.9 : look === "mono" ? 0.84 : look === "plate" ? 0.7 : 0.74
  const size = look === "orbit" ? 0.8 : look === "rail" ? 0.8 : look === "mono" ? 0.9 : 1
  const extra = look === "plate" || look === "tag" ? fs * 1.2 : look === "orbit" ? fs * 2 : 0
  const nameW = n * fs * size * per + extra
  const roleW = c.role ? c.role.length * fs * 0.62 * 0.86 : 0
  const h = fs * (look === "plate" || look === "tag" ? 1.75 : 1.15) + (c.role ? fs * 0.95 : 0) + (look === "rail" ? 8 : 0)
  return { w: Math.ceil(Math.max(nameW, roleW)), h: Math.ceil(h) }
}

export type Callout = { ax: number; ay: number; kx: number; ex: number; ey: number; side: "l" | "r"; room: number }

/**
 * Leader and label geometry in stage pixels. The label is kept inside the
 * stage between the letterbox bars (`top`, `bottom`); the leader runs from the
 * anchor to a knee and then flat into the label.
 */
export function layoutCallout(sl: Slot, w: number, h: number, lw: number, lh: number, top: number, bottom: number): Callout {
  const m = Math.min(w, h)
  const e = h > w * 1.1 ? sl.p : sl.e
  const pad = Math.max(14, Math.round(w * 0.025))
  const gap = 8
  const ax = w / 2 + sl.a[0] * m
  const ay = h / 2 - sl.a[1] * m
  const lo = top + lh / 2 + 6
  const hi = h - bottom - lh / 2 - 6
  const ey = lo > hi ? h / 2 : clamp(h / 2 - e[1] * h, lo, hi)
  let ex = w / 2 + e[0] * w
  if (sl.side === "l") ex = Math.min(w - pad, Math.max(ex, pad + lw + gap))
  else ex = Math.max(pad, Math.min(ex, w - pad - lw - gap))
  const kx = ex + (sl.side === "l" ? 18 : -18)
  const room = Math.max(40, sl.side === "l" ? ex - gap - pad : w - ex - gap - pad)
  return { ax, ay, kx, ex, ey, side: sl.side, room }
}
// #endregion

/* ------------------------------------------------------------------ defaults */

const DEFAULT_CREDITS: TitleCredit[] = [
  { name: "Ada Lindqvist", role: "Direction" },
  { name: "Theo Marchetti", role: "Art direction" },
  { name: "Noor Haddad", role: "Motion" },
  { name: "Kenji Arata", role: "3D" },
  { name: "Lena Okafor", role: "Typography" },
  { name: "Mateo Ruiz", role: "Lighting" },
  { name: "Ines Duarte", role: "Compositing" },
  { name: "Oskar Brandt", role: "Sound" },
  { name: "Priya Raman", role: "Engineering" },
  { name: "Jonas Weller", role: "Edit" },
  { name: "Saoirse Byrne", role: "Producer" },
  { name: "Yusuf Demir", role: "Colour" },
  { name: "Maya Sorensen", role: "Storyboard" },
  { name: "Dev Kapoor", role: "Shaders" },
  { name: "Elsa Novak", role: "Particles" },
  { name: "Rafe Callahan", role: "Camera" },
  { name: "Zoe Laurent", role: "Titles" },
  { name: "Kai Moreno", role: "Rigging" },
  { name: "Hana Sato", role: "Illustration" },
  { name: "Felix Adeyemi", role: "Music" },
  { name: "Clara Voss", role: "Research" },
  { name: "Arjun Mehta", role: "Pipeline" },
  { name: "Lucia Ferri", role: "Design" },
  { name: "Emil Strand", role: "Tools" },
]

/* ------------------------------------------------------------------- shaders */

const VERT = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`

// Every smoothstep here runs low edge to high edge: reversed edges are
// undefined in GLSL and come out black on ANGLE. Falling ramps are 1 - ramp.
const FRAG = `#version 300 es
precision highp float;
out vec4 o;
uniform vec2 uRes;
uniform float uTime;
uniform float uT;
uniform int uScene;
uniform vec2 uMouse;
uniform float uFade;
uniform float uReveal;
uniform float uFF;
uniform float uFlash;
uniform float uGrain;
uniform float uMotion;
uniform vec3 uTint;
uniform vec3 uShade;
uniform vec3 uAccent;
uniform vec3 uHot;
uniform float uPx;

#define PI 3.14159265

float h11(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float h21(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float h31(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }

float vn(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), u.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), u.x), u.y);
}
float vn3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  float a = mix(mix(h31(i), h31(i + vec3(1.0, 0.0, 0.0)), u.x), mix(h31(i + vec3(0.0, 1.0, 0.0)), h31(i + vec3(1.0, 1.0, 0.0)), u.x), u.y);
  float b = mix(mix(h31(i + vec3(0.0, 0.0, 1.0)), h31(i + vec3(1.0, 0.0, 1.0)), u.x), mix(h31(i + vec3(0.0, 1.0, 1.0)), h31(i + vec3(1.0, 1.0, 1.0)), u.x), u.y);
  return mix(a, b, u.z);
}
const mat2 M2 = mat2(1.6, 1.2, -1.2, 1.6);
float fbm(vec2 p) { float s = 0.0; float a = 0.5; for (int i = 0; i < 5; i++) { s += a * vn(p); p = M2 * p; a *= 0.5; } return s; }
float fbm3(vec2 p) { float s = 0.0; float a = 0.5; for (int i = 0; i < 3; i++) { s += a * vn(p); p = M2 * p; a *= 0.5; } return s; }
mat2 rot(float a) { float c = cos(a); float s = sin(a); return mat2(c, s, -s, c); }
float sdBox(vec3 p, vec3 b) { vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0); }
float sdBox2(vec2 p, vec2 b) { vec2 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0); }
float sdSeg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a; vec2 ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
float band(float x, float w) { return 1.0 - smoothstep(0.0, w, abs(x)); }
vec3 camRay(vec3 ro, vec3 ta, vec2 uv, float f) {
  vec3 w = normalize(ta - ro);
  vec3 u = normalize(cross(vec3(0.0, 1.0, 0.0), w));
  vec3 v = cross(w, u);
  return normalize(uv.x * u + uv.y * v + f * w);
}

/* 0 · a dark room, light fanning through a window onto a monitor */
vec3 sBeams(vec2 uv, float t) {
  uv *= 1.0 - 0.012 * t;
  uv += uMouse * vec2(0.03, 0.018);
  vec2 L = vec2(1.1, 1.0);
  vec2 d = uv - L;
  float dist = length(d);
  float ang = atan(d.y, d.x) + 0.015 * sin(t * 0.5);
  float q = (ang + 2.62) / 0.66;
  float inWin = smoothstep(-0.03, 0.03, q) * (1.0 - smoothstep(0.97, 1.03, q));
  float soft = 0.03 + 0.05 * dist;
  float pane = inWin * (1.0 - smoothstep(0.36 - soft, 0.44, abs(fract(q * 4.0) - 0.5)));
  float dust = 0.5 + 0.9 * fbm(uv * 3.0 + vec2(t * 0.05, -t * 0.03));
  float shaft = pane * exp(-dist * 0.55) * dust * 0.5;
  float fy = -0.24;
  float onFloor = 1.0 - smoothstep(fy - 0.003, fy + 0.003, uv.y);
  float pool = pane * onFloor * exp(-dist * 0.3) * (0.7 + 0.5 * vn(vec2(uv.x * 9.0, 3.0 / max(fy - uv.y + 0.04, 0.02))));
  float wall = 0.03 + 0.035 * smoothstep(-0.25, 0.7, uv.y);
  float flo = 0.018 + 0.02 * smoothstep(-0.9, fy, uv.y);
  float c = mix(wall, flo, onFloor) + shaft + pool * 0.55;
  c += 0.3 * exp(-dist * 2.2);
  c += 0.05 * band(uv.y - fy, 0.004);
  vec2 m = uv - vec2(-0.44, 0.03);
  m.y -= m.x * 0.16;
  float sd = sdBox2(m, vec2(0.25, 0.155)) - 0.006;
  float inside = 1.0 - smoothstep(0.0, 0.0025, sd);
  float inScr = 1.0 - smoothstep(0.0, 0.002, sdBox2(m, vec2(0.232, 0.138)));
  float glare = pane * 0.22 * band(m.x * 0.9 + m.y - 0.04 + 0.03 * sin(t * 0.35), 0.07);
  float glass = 0.01 + glare + 0.025 * (1.0 - smoothstep(-0.14, 0.14, m.y));
  float mon = mix(0.02 + shaft * 0.35, glass + shaft * 0.2, inScr);
  float rim = band(sd, 0.0035) * (0.2 + shaft * 2.2);
  float stand = 1.0 - smoothstep(0.0, 0.0025, sdBox2(uv - vec2(-0.43, -0.175), vec2(0.016, 0.06)));
  float foot = 1.0 - smoothstep(0.0, 0.0025, sdBox2(uv - vec2(-0.43, -0.238), vec2(0.085, 0.007)));
  c = mix(c, 0.015 + shaft * 0.15, max(stand, foot) * (1.0 - inside));
  c = mix(c, mon, inside) + rim;
  float tally = (1.0 - smoothstep(0.0, 0.002, sdBox2(m - vec2(0.14, 0.095), vec2(0.02, 0.0045)))) * inScr;
  vec2 g = uv * 26.0 + vec2(t * 0.35, -t * 0.22);
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5 - (vec2(h21(id), h21(id + 7.3)) - 0.5) * 0.7;
  float mote = (1.0 - smoothstep(0.0, 0.07, length(f))) * step(0.84, h21(id + 3.1));
  c += mote * pane * 0.7 * (1.0 - inside) * (0.5 + 0.5 * sin(t * 3.0 + h21(id) * 20.0));
  return vec3(c) + uHot * tally * 1.1;
}

/* 1 · a faceted monolith turning under a lamp, in fog */
float sdPoly(vec3 p, float r) {
  const float G = 1.618034;
  float d = abs(dot(p, normalize(vec3(0.0, 1.0, G))));
  d = max(d, abs(dot(p, normalize(vec3(0.0, 1.0, -G)))));
  d = max(d, abs(dot(p, normalize(vec3(1.0, G, 0.0)))));
  d = max(d, abs(dot(p, normalize(vec3(-1.0, G, 0.0)))));
  d = max(d, abs(dot(p, normalize(vec3(G, 0.0, 1.0)))));
  d = max(d, abs(dot(p, normalize(vec3(-G, 0.0, 1.0)))));
  float e = abs(dot(p, normalize(vec3(1.0, 1.0, 1.0))));
  e = max(e, abs(dot(p, normalize(vec3(-1.0, 1.0, 1.0)))));
  e = max(e, abs(dot(p, normalize(vec3(1.0, -1.0, 1.0)))));
  e = max(e, abs(dot(p, normalize(vec3(1.0, 1.0, -1.0)))));
  e = max(e, abs(dot(p, normalize(vec3(0.0, 1.0 / G, G)))));
  e = max(e, abs(dot(p, normalize(vec3(0.0, 1.0 / G, -G)))));
  e = max(e, abs(dot(p, normalize(vec3(1.0 / G, G, 0.0)))));
  e = max(e, abs(dot(p, normalize(vec3(-1.0 / G, G, 0.0)))));
  e = max(e, abs(dot(p, normalize(vec3(G, 0.0, 1.0 / G)))));
  e = max(e, abs(dot(p, normalize(vec3(-G, 0.0, 1.0 / G)))));
  return max(d - r, e - r * 0.99);
}
float mMono(vec3 p, float t) {
  vec3 q = p - vec3(0.0, 0.15 + 0.04 * sin(t * 0.9), 0.0);
  q.xz *= rot(t * 0.2 + 0.5);
  q.xy *= rot(0.4);
  return min(sdPoly(q, 0.62), p.y + 1.0);
}
vec3 sMonolith(vec2 uv, float t) {
  float ang = 0.6 + t * 0.06 + uMouse.x * 0.3;
  vec3 ro = vec3(sin(ang) * 4.8, 0.35 + uMouse.y * 0.35, -cos(ang) * 4.8);
  vec3 rd = camRay(ro, vec3(0.0, 0.1, 0.0), uv, 1.9);
  float d = 0.0;
  bool hit = false;
  for (int i = 0; i < 90; i++) {
    float h = mMono(ro + rd * d, t);
    if (h < 0.0015) { hit = true; break; }
    d += h;
    if (d > 18.0) break;
  }
  vec3 Lp = vec3(0.7, 6.0, 0.3);
  float c = 0.012;
  if (hit) {
    vec3 p = ro + rd * d;
    vec2 e = vec2(0.002, 0.0);
    vec3 n = normalize(vec3(
      mMono(p + e.xyy, t) - mMono(p - e.xyy, t),
      mMono(p + e.yxy, t) - mMono(p - e.yxy, t),
      mMono(p + e.yyx, t) - mMono(p - e.yyx, t)));
    vec3 l = normalize(Lp - p);
    float spot = smoothstep(0.95, 0.988, dot(normalize(p - Lp), vec3(0.0, -1.0, 0.0)));
    float sh = 1.0;
    float st = 0.03;
    for (int i = 0; i < 28; i++) {
      float h = mMono(p + l * st, t);
      sh = min(sh, 12.0 * h / st);
      st += clamp(h, 0.02, 0.35);
      if (sh < 0.005 || st > 7.0) break;
    }
    sh = clamp(sh, 0.0, 1.0);
    float ground = step(p.y, -0.99);
    float dif = max(dot(n, l), 0.0);
    float rim = pow(clamp(1.0 + dot(rd, n), 0.0, 1.0), 5.0);
    float fill = max(dot(n, normalize(vec3(-0.7, 0.25, -0.6))), 0.0);
    float face = 0.85 + 0.3 * h31(floor(n * 23.0 + 50.0));
    float obj = (0.03 + dif * (0.25 + spot * 0.9) * sh + fill * 0.07 + rim * 0.35) * face;
    float gnd = 0.012 + dif * spot * sh * 0.85 + 0.02 * vn(p.xz * 3.0);
    c = mix(obj, gnd, ground);
    c = mix(c, 0.012, 1.0 - exp(-0.012 * d * d));
  }
  float tmax = hit ? d : 18.0;
  float stp = tmax / 26.0;
  float jit = h21(gl_FragCoord.xy + fract(uTime) * 91.0);
  float vol = 0.0;
  for (int i = 0; i < 26; i++) {
    vec3 p = ro + rd * ((float(i) + jit) * stp);
    float cone = smoothstep(0.95, 0.988, dot(normalize(p - Lp), vec3(0.0, -1.0, 0.0)));
    vec2 sc = -Lp.xz * (0.15 - p.y) / (Lp.y - 0.15);
    float occ = p.y > 0.8 ? 1.0 : smoothstep(0.4, 0.66, length(p.xz - sc));
    float dens = 0.6 + 0.4 * vn3(p * 1.4 + vec3(0.0, -t * 0.2, t * 0.07));
    vol += cone * occ * dens;
  }
  c += vol * stp * 0.1;
  return vec3(c);
}

/* 2 · an explosion held still round an eye that watches the pointer */
float mDebris(vec3 p, float t, out float id) {
  float d = length(p) - 0.36;
  id = 0.0;
  for (int i = 0; i < 14; i++) {
    float fi = float(i);
    vec3 dir = normalize(vec3(h11(fi * 3.1 + 1.0), h11(fi * 5.7 + 2.0), h11(fi * 7.3 + 3.0)) * 2.0 - 1.0 + 0.001);
    float r = 0.8 + 1.7 * h11(fi * 1.9 + 4.0) + t * 0.05;
    vec3 q = p - dir * r;
    q.xy *= rot(t * (0.2 + 0.4 * h11(fi)) + fi);
    q.yz *= rot(t * (0.15 + 0.3 * h11(fi + 9.0)) + fi * 2.0);
    float k = h11(fi * 9.1);
    vec3 b = k < 0.45 ? vec3(0.3, 0.014, 0.2) * (0.55 + k) : vec3(0.08, 0.11, 0.065) * (0.7 + k);
    float s = sdBox(q, b) - 0.005;
    if (s < d) { d = s; id = fi + 1.0; }
  }
  return d;
}
float mDebrisD(vec3 p, float t) { float id; return mDebris(p, t, id); }
vec3 sDebris(vec2 uv, float t) {
  vec3 ro = vec3(uMouse.x * 0.6, 0.1 + uMouse.y * 0.4, -6.2);
  vec3 rd = camRay(ro, vec3(0.0), uv, 2.0);
  vec2 sp = uv * 1.6;
  float smoke = fbm(sp + vec2(fbm(sp + t * 0.03), fbm(sp - t * 0.02)) * 1.2);
  float c = 0.012 + 0.16 * smoke * smoke * smoothstep(-0.4, 0.9, uv.x + uv.y * 0.6) + 0.04 * exp(-dot(uv, uv) * 5.0);
  vec3 col = vec3(c);
  float d = 0.0;
  float id = 0.0;
  bool hit = false;
  for (int i = 0; i < 80; i++) {
    float h = mDebris(ro + rd * d, t, id);
    if (h < 0.0015) { hit = true; break; }
    d += h;
    if (d > 13.0) break;
  }
  if (hit) {
    vec3 p = ro + rd * d;
    vec2 e = vec2(0.002, 0.0);
    vec3 n = normalize(vec3(
      mDebrisD(p + e.xyy, t) - mDebrisD(p - e.xyy, t),
      mDebrisD(p + e.yxy, t) - mDebrisD(p - e.yxy, t),
      mDebrisD(p + e.yyx, t) - mDebrisD(p - e.yyx, t)));
    vec3 l = normalize(vec3(0.7, 0.8, -0.6));
    float dif = max(dot(n, l), 0.0);
    float back = pow(clamp(1.0 + dot(rd, n), 0.0, 1.0), 3.0) * max(dot(n, normalize(vec3(-0.8, 0.2, 0.6))), 0.0);
    float spec = pow(max(dot(reflect(rd, n), l), 0.0), 40.0);
    col = vec3((0.015 + dif * dif * 0.85 + back * 0.9 + spec * 0.9) * (0.75 + 0.3 * h11(id * 4.1)));
    if (id < 0.5) {
      vec3 look = normalize(vec3(uMouse.x * 0.9, uMouse.y * 0.7 + 0.05, -1.0));
      float k = dot(normalize(p), look);
      float iris = smoothstep(0.86, 0.875, k);
      float pupil = smoothstep(0.955, 0.962, k);
      float fib = 0.7 + 0.3 * vn(p.xy * 38.0);
      vec3 ir = uAccent * (0.3 + 0.55 * fib) * (0.45 + dif);
      vec3 sclera = vec3(0.5 + dif * 0.45 + back * 0.2);
      col = mix(sclera, ir, iris);
      col = mix(col, vec3(0.01), pupil);
      col += vec3(spec * 1.2);
    }
    col = mix(col, vec3(c), 1.0 - exp(-0.004 * d * d));
  }
  return col;
}

/* 3 · lit fog for the reticle */
vec3 sTarget(vec2 uv, float t) {
  vec2 p = uv * 1.1 + uMouse * 0.05;
  vec2 w = vec2(fbm(p * 1.4 + vec2(t * 0.05, 0.0)), fbm(p * 1.4 + vec2(5.2, -t * 0.04)));
  float f = fbm(p * 1.9 + w * 1.6 + vec2(-t * 0.06, t * 0.02));
  float glow = exp(-dot(uv, uv) * 2.4);
  float c = 0.03 + f * f * 0.9 * (0.3 + 0.9 * glow) + glow * 0.12;
  c *= 0.75 + 0.25 * smoothstep(-0.9, 0.3, uv.y);
  return vec3(c);
}

/* 4 · a kaleidoscope tunnel of blocks, flying towards the light */
float mTunnel(vec3 p) {
  float r = length(p.xy);
  float a = atan(p.y, p.x) + p.z * 0.035;
  float sec = 2.0 * PI / 12.0;
  float af = abs(a - sec * floor(a / sec + 0.5));
  vec2 pp = vec2(cos(af), sin(af)) * r;
  float cell = 0.6;
  float zi = floor(p.z / cell + 0.5);
  float z = p.z - zi * cell;
  float R = 1.55;
  float d = R - r;
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float hh = h21(vec2(zi, 1.3 + fk * 6.1));
    float g = 0.1 + 0.62 * hh * hh;
    float zo = (h21(vec2(zi, 4.7 + fk)) - 0.5) * cell * 0.3;
    d = min(d, sdBox(vec3(pp.x - (R - g * 0.5), pp.y - (0.064 + fk * 0.126), z - zo), vec3(g * 0.5, 0.066, cell * (0.22 + 0.14 * hh))));
  }
  return d * 0.6;
}
vec3 sTunnel(vec2 uv, float t) {
  vec3 ro = vec3(uMouse.x * 0.15, uMouse.y * 0.12, t * 1.1);
  vec2 q = rot(t * 0.12) * uv;
  vec3 rd = normalize(vec3(q, 1.25));
  float d = 0.0;
  bool hit = false;
  float steps = 0.0;
  for (int i = 0; i < 110; i++) {
    float h = mTunnel(ro + rd * d);
    if (h < 0.001) { hit = true; break; }
    d += min(h, 0.3);
    steps += 1.0;
    if (d > 28.0) break;
  }
  float c = 1.0;
  if (hit) {
    vec3 p = ro + rd * d;
    vec2 e = vec2(0.002, 0.0);
    vec3 n = normalize(vec3(
      mTunnel(p + e.xyy) - mTunnel(p - e.xyy),
      mTunnel(p + e.yxy) - mTunnel(p - e.yxy),
      mTunnel(p + e.yyx) - mTunnel(p - e.yyx)));
    vec3 l = normalize(vec3(-p.xy * 0.25, 1.0));
    float dif = max(dot(n, l), 0.0);
    float ao = 1.0 - steps / 110.0;
    float surf = (0.01 + 0.55 * pow(dif, 3.0) + 0.05 * max(dot(n, -rd), 0.0)) * ao;
    c = mix(surf, 1.0, smoothstep(2.0, 24.0, d));
  }
  return vec3(c + exp(-length(uv) * 5.0) * 0.3);
}

/* 5 · a night for the date */
vec3 sStars(vec2 uv, float t) {
  float c = 0.006 + 0.03 * exp(-uv.y * uv.y * 40.0);
  for (int k = 0; k < 2; k++) {
    float fk = float(k);
    vec2 g = uv * (60.0 + fk * 80.0) + fk * 13.1 + uMouse * (4.0 + 6.0 * fk);
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5 - (vec2(h21(id + 1.7), h21(id + 9.2)) - 0.5) * 0.6;
    float hs = h21(id);
    float star = (1.0 - smoothstep(0.0, 0.08, length(f))) * step(0.93, hs);
    c += star * (0.3 + 0.35 * sin(t * 2.0 + hs * 50.0) + 0.3) * (0.6 - 0.25 * fk);
  }
  c += 0.05 * fbm(uv * 1.5 + t * 0.02) * exp(-uv.y * uv.y * 6.0);
  return vec3(c);
}

/* 6 · a moon over a ridge; the figure standing on it is drawn crisp in SVG */
vec3 sMoon(vec2 uv, float t) {
  vec2 par = uMouse * vec2(7.0, 5.0) * uPx;
  vec2 mc = vec2(0.0, 0.08 + 0.004 * t) - par * 0.35;
  float R = 0.48;
  vec2 q = (uv - mc) / R;
  float r = length(q);
  float c = 0.03 + 0.03 * smoothstep(-0.5, 0.5, uv.y);
  float halo = 0.3 * exp(-(max(r, 1.0) - 1.0) * 6.0) + 0.12 * exp(-(max(r, 1.0) - 1.0) * 1.8);
  float disc = 1.0 - smoothstep(0.995, 1.005, r);
  vec3 n = vec3(q, sqrt(max(0.0, 1.0 - r * r)));
  float light = 0.35 + 0.65 * max(dot(n, normalize(vec3(-0.3, 0.2, 1.0))), 0.0);
  float alb = 0.78 - 0.35 * smoothstep(0.45, 0.75, fbm(q * 2.2 + 3.1));
  vec2 cg = q * 7.0;
  vec2 ci = floor(cg);
  float cr = 0.15 + 0.25 * h21(ci);
  float cd = length(fract(cg) - 0.5 - (vec2(h21(ci + 2.0), h21(ci + 5.0)) - 0.5) * 0.4);
  alb += step(0.8, h21(ci + 9.0)) * (band(cd - cr, 0.025) * 0.06 - (1.0 - smoothstep(0.0, cr, cd)) * 0.07);
  alb += 0.08 * (fbm(q * 12.0) - 0.5);
  float moon = alb * light * (0.65 + 0.35 * sqrt(n.z));
  c = mix(c + halo, moon * 1.25, disc);
  vec2 gp = uv + par;
  float gx = gp.x;
  float gy = -0.3 + (0.05 * fbm(vec2(gx * 2.2, 1.0)) - 0.025 + 0.012 * vn(vec2(gx * 14.0, 0.0))) * smoothstep(0.06, 0.35, abs(gx));
  float below = gy - gp.y;
  float gm = smoothstep(-0.0015, 0.0015, below);
  float rimg = exp(-max(below, 0.0) * 55.0) * 0.55 * (0.6 + 0.4 * fbm(vec2(gx * 30.0, gp.y * 30.0)));
  float rock = 0.02 + 0.05 * fbm(gp * 18.0) * exp(-max(below, 0.0) * 6.0);
  c = mix(c, rock + rimg * (0.4 + 0.6 * exp(-abs(gx) * 1.5)), gm);
  c += 0.12 * exp(-abs(below) * 25.0) * (0.5 + 0.5 * fbm(vec2(gx * 3.0 - t * 0.1, 0.0)));
  return vec3(c);
}

/* 7 · a dark planet with a lashed corona; its sun follows the pointer */
vec3 sEclipse(vec2 uv, float t) {
  vec2 q = uv + uMouse * 0.01;
  float R = 0.2;
  float r = length(q);
  vec2 dir = q / max(r, 0.0001);
  vec2 ld = normalize(vec2(-0.55, 0.6) + uMouse * 1.6 + vec2(0.0001, 0.0));
  float lit = 0.5 + 0.5 * dot(dir, ld);
  float c = 0.012 + 0.02 * fbm3(uv * 1.2);
  vec2 sg = uv * 110.0;
  vec2 sid = floor(sg);
  c += step(0.975, h21(sid)) * (1.0 - smoothstep(0.0, 0.3, length(fract(sg) - 0.5))) * 0.35;
  float out1 = max(r - R, 0.0);
  float disc = 1.0 - smoothstep(R - 0.0015, R + 0.0015, r);
  c += (0.35 * exp(-out1 * 30.0) + 0.1 * exp(-out1 * 6.0)) * (0.25 + 0.75 * lit * lit) * (1.0 - disc);
  float a = atan(q.y, q.x);
  float fil = 0.0;
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float aa = a + out1 * (fk - 1.0) * 2.5 + 0.02 * sin(t * 0.7 + fk);
    vec2 ring = vec2(cos(aa), sin(aa));
    float strand = pow(vn(ring * (9.5 + fk * 5.0) + fk * 7.0), 12.0);
    float len = 0.02 + 0.09 * vn(ring * 1.6 + fk * 3.0 + 1.0);
    fil += strand * (1.0 - smoothstep(0.0, len, out1));
  }
  c += fil * 1.4 * (0.3 + 0.7 * lit) * (1.0 - disc);
  vec2 sp = q * 2.2;
  vec2 w = vec2(fbm(sp + vec2(t * 0.05, 0.0)), fbm(sp + vec2(3.3, -t * 0.04)));
  float smoke = smoothstep(0.55, 0.85, fbm(sp * 1.4 + w * 2.2 + vec2(-t * 0.06, 0.0)));
  c += smoke * exp(-abs(r - 0.36) * 5.0) * (1.0 - disc) * 0.3 * (0.4 + 0.6 * lit);
  vec3 n = vec3(q / R, sqrt(max(0.0, 1.0 - r * r / (R * R))));
  float rimL = pow(1.0 - n.z, 2.5) * max(dot(dir, ld), 0.0);
  float surf = 0.01 + 0.04 * fbm(q * 18.0) * n.z + rimL * 0.85;
  surf += 0.03 * band(r - R * 0.45, 0.012) * (0.5 + 0.5 * vn(dir * 14.0));
  c = mix(c, surf, disc);
  float oa = t * 0.35 + 2.2;
  vec2 sc = vec2(cos(oa) * 0.36, sin(oa) * 0.08 + 0.21);
  float sd = length(q - sc);
  c += (1.0 - smoothstep(0.009, 0.011, sd)) * (0.25 + 0.5 * max(dot(normalize(q - sc + 0.0001), ld), 0.0)) + 0.06 * exp(-sd * 40.0);
  return vec3(c);
}

/* 8 · lift-off through the clouds, then the clouds rise over the lens */
float puff(float x, float s, float seed) {
  float i = floor(x / s);
  float best = -1.0;
  for (int k = -1; k <= 1; k++) {
    float j = i + float(k);
    float cx = (j + 0.5 + 0.4 * (h11(j * 1.7 + seed) - 0.5)) * s;
    float r = s * (0.6 + 0.5 * h11(j * 3.1 + seed * 2.0));
    float dx = x - cx;
    best = max(best, sqrt(max(r * r - dx * dx, 0.0)) - r * 0.45);
  }
  return best;
}
vec4 sLiftoff(vec2 uv, float t) {
  float rise = smoothstep(0.0, 0.62, uReveal);
  float pan = smoothstep(1.2, 4.6, t) * 0.07;
  vec2 w = uv + vec2(0.0, pan);
  float ry = 0.0 + 0.02 * t + 0.022 * t * t;
  vec2 rk = vec2(0.01 * sin(t * 0.8), ry);
  vec2 noz = rk - vec2(0.0, 0.032);
  float base = -0.2;
  float c = 0.012 + 0.03 * (1.0 - smoothstep(-0.3, 0.5, w.y));
  vec2 sg = w * 90.0;
  c += step(0.985, h21(floor(sg))) * (1.0 - smoothstep(0.0, 0.3, length(fract(sg) - 0.5))) * 0.5 * smoothstep(0.0, 0.5, w.y);
  c += 0.22 * exp(-length((w - noz) * vec2(1.0, 0.6)) * 4.0);
  float below = max(noz.y - w.y, 0.0);
  float on = step(w.y, noz.y);
  float wob = vn(vec2(w.y * 22.0 - t * 14.0, 1.0)) - 0.5;
  float wid = 0.003 + 0.045 * pow(below, 0.85) + abs(wob) * 0.012 * min(below * 4.0, 1.0);
  float dx = w.x - rk.x - wob * 0.03 * below;
  float core = exp(-dx * dx / (wid * wid)) * on;
  float trail = exp(-dx * dx / (wid * wid * 9.0 + 0.0004)) * on;
  float smk = 0.5 + 0.5 * fbm(vec2(w.x * 26.0, w.y * 9.0 - t * 1.6));
  c += core * (1.6 - min(below, 1.0) * 0.9) + trail * 0.28 * smk;
  c += 2.2 * exp(-length((w - noz) * vec2(1.0, 0.6)) * 90.0);
  vec2 rp = w - rk;
  float rkd = min(min(sdBox2(rp, vec2(0.0048, 0.026)) - 0.0015, length(rp - vec2(0.0, 0.026)) - 0.0048), sdBox2(rp + vec2(0.0, 0.02), vec2(0.01, 0.005)) - 0.001);
  float rkm = 1.0 - smoothstep(0.0, 0.0012, rkd);
  c = mix(c, 0.03 + 0.25 * (1.0 - smoothstep(-0.03, 0.01, rp.y)), rkm);
  for (int i = 0; i < 3; i++) {
    float L = float(i);
    float x = w.x + uMouse.x * 0.012 * (L + 1.0);
    float boost = 0.13 * exp(-pow((x - rk.x) / (0.16 + 0.05 * t), 2.0)) * smoothstep(0.0, 1.6, t) * (1.0 - L * 0.25);
    float top = base - 0.02 - 0.075 * L + puff(x + L * 3.1, 0.2 - L * 0.03, L * 11.0) * 0.55 + puff(x + L * 7.7, 0.07, L * 5.0 + 3.0) * 0.5 + boost + rise * (1.3 + L * 0.12);
    float depth = top - w.y;
    float edge = 0.006 + 0.01 * L;
    float m = smoothstep(-edge, edge, depth + 0.012 * (fbm3(vec2(x * 22.0, w.y * 22.0 + t * 0.1)) - 0.5));
    float light = 0.12 + 1.7 * exp(-abs(x - rk.x) * (2.2 + L)) * smoothstep(0.0, 0.8, t + 0.3);
    float tex = fbm(vec2(x * 6.0 + L * 4.0, w.y * 7.0 - t * 0.05 * (L + 1.0)));
    float shade = light * (0.3 + 0.7 * tex) * (0.55 + 0.6 * exp(-max(depth, 0.0) * 18.0)) * (1.0 - 0.22 * L);
    shade = mix(shade, 1.05 + 0.35 * tex, rise);
    c = mix(c, shade, m);
  }
  float u2 = smoothstep(0.42, 1.0, uReveal);
  float nz = fbm(uv * 2.3 + 11.0);
  float thr = u2 * 1.3 - 0.12;
  float alpha = smoothstep(thr - 0.05, thr + 0.05, nz);
  c += band(nz - thr, 0.06) * u2 * 0.6;
  return vec4(vec3(c), alpha);
}

void main() {
  vec2 fc = gl_FragCoord.xy;
  float row = floor(fc.y / 3.0);
  fc.x += (h11(row * 1.7 + floor(uTime * 30.0)) - 0.5) * 22.0 * uFF * uRes.x / 1200.0;
  float m = min(uRes.x, uRes.y);
  vec2 uv = (fc - 0.5 * uRes) / m;
  uv += uMotion * (vec2(vn(vec2(uTime * 2.1, 1.0)), vn(vec2(uTime * 1.7, 5.0))) - 0.5) * 0.002;
  float t = uT;
  vec3 col = vec3(0.0);
  float alpha = 1.0;
  if (uScene == 0) col = sBeams(uv, t);
  else if (uScene == 1) col = sMonolith(uv, t);
  else if (uScene == 2) col = sDebris(uv, t);
  else if (uScene == 3) col = sTarget(uv, t);
  else if (uScene == 4) col = sTunnel(uv, t);
  else if (uScene == 5) col = sStars(uv, t);
  else if (uScene == 6) col = sMoon(uv, t);
  else if (uScene == 7) col = sEclipse(uv, t);
  else { vec4 r = sLiftoff(uv, t); col = r.rgb; alpha = r.a; }
  col *= uFade;
  col += uFlash * 0.55;
  col = col * 1.15 / (1.0 + col * 0.35);
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  vec3 g = mix(uShade, uTint, clamp(l, 0.0, 1.0)) + (col - l);
  g *= 1.0 - 0.55 * smoothstep(0.3, 1.3, length(uv * vec2(0.72, 1.0)));
  g += (h21(fc + fract(uTime * 7.3) * 517.0) - 0.5) * uGrain * 0.1;
  float sc = floor(uTime * 11.0);
  g += step(0.83, h11(sc)) * band(uv.x - (h11(sc + 3.0) - 0.5) * 1.7, 0.0011) * 0.07 * uGrain * uMotion;
  g += uFF * 0.1 * band(fract(fc.y / uRes.y + uTime * 0.9) - 0.5, 0.025);
  o = vec4(clamp(g, 0.0, 1.0), alpha);
}`

const UNIFORMS = [
  "uRes", "uTime", "uT", "uScene", "uMouse", "uFade", "uReveal", "uFF", "uFlash",
  "uGrain", "uMotion", "uTint", "uShade", "uAccent", "uHot", "uPx",
]

// Compile and link without reading any status back: reading it blocks until the
// driver is done, and this shader is big. With KHR_parallel_shader_compile the
// work happens off the main thread and `programState` polls for it, so the
// callouts and the counter keep moving while the picture is still compiling.
function buildProgram(gl: WebGL2RenderingContext) {
  const vs = gl.createShader(gl.VERTEX_SHADER)
  const fs = gl.createShader(gl.FRAGMENT_SHADER)
  const prog = gl.createProgram()
  if (!vs || !fs || !prog) return null
  gl.shaderSource(vs, VERT)
  gl.shaderSource(fs, FRAG)
  gl.compileShader(vs)
  gl.compileShader(fs)
  gl.attachShader(prog, vs)
  gl.attachShader(prog, fs)
  gl.linkProgram(prog)
  return { prog, vs, fs }
}

type Built = { prog: WebGLProgram; vs: WebGLShader; fs: WebGLShader }

function programState(gl: WebGL2RenderingContext, b: Built, ext: { COMPLETION_STATUS_KHR: number } | null) {
  if (ext && !gl.getProgramParameter(b.prog, ext.COMPLETION_STATUS_KHR)) return "wait"
  if (gl.getProgramParameter(b.prog, gl.LINK_STATUS)) {
    gl.deleteShader(b.vs)
    gl.deleteShader(b.fs)
    return "ok"
  }
  console.warn("[title-sequence-preloader]", gl.getShaderInfoLog(b.fs) || gl.getShaderInfoLog(b.vs) || gl.getProgramInfoLog(b.prog))
  return "fail"
}

/* ----------------------------------------------------------------------- css */

const CSS = `
.tsp-root { position: relative; width: 100%; isolation: isolate; }
.tsp-dest { position: relative; }
.tsp-gate {
  position: absolute; left: 0; right: 0; top: 0; z-index: 20; overflow: hidden;
  background: #000; color: #eef1f3; outline: none; cursor: crosshair;
  touch-action: manipulation; user-select: none; -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent; -webkit-touch-callout: none; container-type: inline-size;
  --tsp-cond: "Oswald", "Bebas Neue", "Barlow Condensed", "Roboto Condensed", "Arial Narrow", "Helvetica Neue", Arial, sans-serif;
  --tsp-serif: "Playfair Display", "Bodoni 72", Didot, Georgia, "Times New Roman", serif;
  --tsp-mono: ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace;
}
.tsp-gate:focus-visible { box-shadow: inset 0 0 0 2px var(--tsp-accent); }
.tsp-gate[data-phase="reveal"] { pointer-events: none; cursor: default; background: transparent; box-shadow: none; }
.tsp-gate[data-still="true"][data-phase="reveal"] { opacity: 0; transition: opacity .8s ease; }
.tsp-canvas { position: absolute; inset: 0; width: 100%; height: 100%; max-width: none; display: block; }
.tsp-fallback { position: absolute; inset: 0; background: radial-gradient(60% 55% at 50% 45%, #3a3d41 0%, #111214 55%, #000 100%); }
.tsp-fallback[data-scene="4"] { background: radial-gradient(35% 35% at 50% 50%, #fff 0%, #8a8d90 30%, #151617 75%); }
.tsp-fallback[data-scene="5"], .tsp-fallback[data-scene="7"] { background: radial-gradient(40% 40% at 50% 50%, #1b1c1e 0%, #000 70%); }
.tsp-fallback[data-scene="6"] { background: radial-gradient(28% 40% at 50% 42%, #d9dcde 0%, #9ea2a5 60%, #202224 64%, #050505 100%); }
.tsp-fallback[data-scene="8"] { background: linear-gradient(#030303 0%, #0b0b0c 55%, #c9cccf 78%, #6d7073 100%); }
.tsp-layer { position: absolute; inset: 0; pointer-events: none; transition: opacity .24s ease; }
.tsp-layer[data-out="1"] { opacity: 0; }
.tsp-svg { position: absolute; left: 0; top: 0; overflow: visible; max-width: none; }
.tsp-line { fill: none; stroke: rgba(255,255,255,.72); stroke-width: 1; stroke-dasharray: 1; stroke-dashoffset: 1; animation: tsp-draw .45s cubic-bezier(.65,0,.25,1) forwards; transition: stroke .2s, stroke-width .2s; }
.tsp-lead[data-hot="true"] .tsp-line { stroke: var(--tsp-accent); stroke-width: 1.6; }
.tsp-dot { fill: #fff; transform-box: fill-box; transform-origin: center; transform: scale(0); animation: tsp-pop .32s cubic-bezier(.3,1.7,.5,1) forwards; }
.tsp-lead[data-hot="true"] .tsp-dot { fill: var(--tsp-accent); }
.tsp-ring { fill: none; stroke: rgba(255,255,255,.6); stroke-width: 1; transform-box: fill-box; transform-origin: center; opacity: 0; animation: tsp-ping 1.8s ease-out infinite; }
.tsp-hair { fill: none; stroke: rgba(255,255,255,.42); stroke-width: 1; }
.tsp-bold { fill: none; stroke: rgba(255,255,255,.9); stroke-width: 2; }
.tsp-fill { fill: rgba(255,255,255,.92); }
.tsp-knot { fill: rgba(255,255,255,.8); }
.tsp-figure { fill: #030304; filter: drop-shadow(0 0 1.2px rgba(236,241,244,.7)); opacity: 0; animation: tsp-in .6s ease forwards; }
.tsp-limbs { fill: none; stroke: #030304; stroke-width: 6.2; stroke-linecap: round; stroke-linejoin: round; }
.tsp-laser { fill: none; stroke: rgba(255,255,255,.6); stroke-width: 1; stroke-dasharray: 1; stroke-dashoffset: 1; animation: tsp-draw .7s cubic-bezier(.7,0,.2,1) forwards; }
.tsp-date { fill: var(--tsp-accent); font-family: var(--tsp-mono); letter-spacing: .32em; }
.tsp-hud { opacity: 0; animation: tsp-in .5s ease .1s forwards; }
.tsp-spin { transform-box: view-box; animation: tsp-spin 14s linear infinite; }
.tsp-spin-rev { transform-box: view-box; animation: tsp-spin 9s linear infinite reverse; }
.tsp-label {
  position: absolute; transform: translateY(-50%); white-space: nowrap; pointer-events: auto; cursor: default;
  display: flex; flex-direction: column; gap: .3em; font-size: var(--tsp-fs); line-height: 1.05;
  opacity: 0; animation: tsp-in .25s ease forwards; text-shadow: 0 0 14px rgba(0,0,0,.55);
}
.tsp-label[data-side="l"] { align-items: flex-end; text-align: right; }
.tsp-label[data-side="r"] { align-items: flex-start; text-align: left; }
.tsp-name {
  display: inline-flex; align-items: baseline; gap: .36em; font-family: var(--tsp-cond); font-weight: 700;
  letter-spacing: .07em; text-transform: uppercase; color: #f4f6f7;
  transition: background-color .18s, color .18s, box-shadow .18s;
}
.tsp-role { font-family: var(--tsp-mono); font-size: .6em; letter-spacing: .24em; text-transform: uppercase; color: rgba(238,241,243,.5); transition: color .18s; }
.tsp-label:hover .tsp-role { color: var(--tsp-accent); }
.tsp-label:hover .tsp-name { background: #f4f6f7; color: #050607; box-shadow: 0 0 0 .28em #f4f6f7; text-shadow: none; }
.tsp-label[data-look="duo"][data-v="0"] .tsp-name { color: var(--tsp-accent); }
.tsp-label[data-look="mono"] .tsp-name { font-weight: 600; font-size: .9em; letter-spacing: .16em; }
.tsp-label[data-look="tag"] .tsp-name { font-size: .92em; letter-spacing: .12em; }
.tsp-label[data-look="tag"][data-v="0"] .tsp-name { color: var(--tsp-marker); }
.tsp-label[data-look="tag"][data-v="3"] .tsp-name { color: var(--tsp-hot); }
.tsp-label[data-look="plate"] .tsp-name, .tsp-label[data-look="tag"][data-v="2"] .tsp-name { background: var(--tsp-plate); padding: .34em .6em .3em; text-transform: none; letter-spacing: .02em; text-shadow: none; }
.tsp-label[data-look="plate"] .tsp-first, .tsp-label[data-look="tag"][data-v="2"] .tsp-first { text-transform: uppercase; letter-spacing: .1em; }
.tsp-label[data-look="plate"] .tsp-rest, .tsp-label[data-look="tag"][data-v="2"] .tsp-rest { font-family: var(--tsp-serif); font-style: italic; font-weight: 700; letter-spacing: .01em; color: #dce6ff; }
.tsp-label[data-look="plate"]:hover .tsp-name, .tsp-label[data-look="tag"][data-v="2"]:hover .tsp-name { background: #f4f6f7; box-shadow: none; }
.tsp-label[data-look="plate"]:hover .tsp-rest, .tsp-label[data-look="tag"][data-v="2"]:hover .tsp-rest { color: var(--tsp-plate); }
.tsp-label[data-look="orbit"] .tsp-name { font-family: var(--tsp-mono); font-weight: 500; font-size: .8em; letter-spacing: .34em; }
.tsp-label[data-look="rail"] .tsp-name { font-weight: 600; font-size: .8em; letter-spacing: .22em; }
.tsp-ruler { display: block; align-self: stretch; height: 6px; border-top: 1px solid rgba(238,241,243,.55); background: repeating-linear-gradient(90deg, rgba(238,241,243,.55) 0 1px, transparent 1px 6px); background-size: 100% 4px; background-repeat: no-repeat; }
.tsp-rings { display: inline-flex; align-self: center; color: var(--tsp-accent); }
.tsp-rings i { width: .8em; height: .8em; border: 1px solid currentColor; border-radius: 50%; display: block; }
.tsp-rings i + i { margin-left: -.3em; }
.tsp-bar {
  position: absolute; left: 0; right: 0; z-index: 2; display: flex; align-items: center; justify-content: space-between;
  gap: 18px; padding: 0 24px; padding: 0 clamp(14px, 3.2cqw, 40px); background: #000;
  font-family: var(--tsp-mono); font-size: 10px; letter-spacing: .2em; text-transform: uppercase;
  color: rgba(238,241,243,.58); transition: transform 1.1s cubic-bezier(.7,0,.2,1);
}
.tsp-top { top: 0; border-bottom: 1px solid rgba(255,255,255,.06); }
.tsp-bottom { bottom: 0; border-top: 1px solid rgba(255,255,255,.06); }
.tsp-gate[data-phase="reveal"] .tsp-top { transform: translateY(-101%); }
.tsp-gate[data-phase="reveal"] .tsp-bottom { transform: translateY(101%); }
.tsp-gate[data-phase="reveal"] .tsp-layer, .tsp-gate[data-phase="reveal"] .tsp-ff { opacity: 0; transition: opacity .3s ease; }
.tsp-brand { display: flex; align-items: center; gap: 10px; min-width: 0; color: #eef1f3; }
.tsp-brand b { font-weight: 600; letter-spacing: .24em; }
.tsp-tri { width: 0; height: 0; flex: none; border-left: 5px solid transparent; border-right: 5px solid transparent; border-bottom: 8px solid var(--tsp-hot); animation: tsp-blink 1.6s steps(2, jump-none) infinite; }
.tsp-dim { color: rgba(238,241,243,.42); }
.tsp-slate { display: flex; gap: 18px; font-variant-numeric: tabular-nums; }
.tsp-count { display: flex; align-items: baseline; gap: 8px; }
.tsp-num { font-family: var(--tsp-cond); font-weight: 700; font-size: 32px; font-size: clamp(22px, 3.4cqw, 40px); line-height: 1; letter-spacing: .02em; color: #f4f6f7; font-variant-numeric: tabular-nums; }
.tsp-pct { font-family: var(--tsp-cond); font-size: 15px; color: var(--tsp-accent); letter-spacing: 0; }
.tsp-status { margin-left: 6px; white-space: nowrap; }
.tsp-reel { position: relative; flex: 1 1 auto; max-width: 440px; display: flex; gap: 4px; align-items: center; }
.tsp-reel i { flex: 1; height: 7px; border: 1px solid rgba(238,241,243,.28); transition: background-color .3s, border-color .3s; }
.tsp-reel i[data-state="past"] { background: rgba(238,241,243,.3); }
.tsp-reel i[data-state="on"] { background: var(--tsp-accent); border-color: var(--tsp-accent); }
.tsp-reel b { position: absolute; left: 0; right: 0; bottom: -7px; height: 1px; background: #f4f6f7; transform-origin: left; transform: scaleX(0); }
.tsp-actions { display: flex; align-items: center; gap: 16px; white-space: nowrap; }
.tsp-skip { font: inherit; letter-spacing: inherit; text-transform: inherit; color: #f4f6f7; background: transparent; border: 1px solid rgba(238,241,243,.4); padding: 8px 13px; cursor: pointer; transition: background-color .2s, color .2s; }
.tsp-skip:hover, .tsp-skip:focus-visible { background: #f4f6f7; color: #000; outline: none; }
.tsp-ff { position: absolute; left: 50%; z-index: 3; transform: translateX(-50%); padding: 5px 9px; background: #f4f6f7; color: #000; font-family: var(--tsp-mono); font-size: 10px; letter-spacing: .24em; pointer-events: none; }
.tsp-fin { position: absolute; transform: translateY(-50%); white-space: nowrap; font-family: var(--tsp-mono); font-weight: 600; letter-spacing: .3em; color: #f4f6f7; text-shadow: 0 0 18px rgba(0,0,0,.6); opacity: 0; animation: tsp-in .4s ease forwards; }
@container (max-width: 760px) { .tsp-hint, .tsp-dim { display: none; } }
@container (max-width: 540px) { .tsp-reel, .tsp-tc { display: none; } .tsp-bar { font-size: 9px; letter-spacing: .14em; } }
@keyframes tsp-draw { to { stroke-dashoffset: 0; } }
@keyframes tsp-pop { to { transform: scale(1); } }
@keyframes tsp-ping { 0% { transform: scale(.4); opacity: .9; } 100% { transform: scale(2.4); opacity: 0; } }
@keyframes tsp-in { to { opacity: 1; } }
@keyframes tsp-spin { to { transform: rotate(360deg); } }
@keyframes tsp-blink { 50% { opacity: .2; } }
@media (prefers-reduced-motion: reduce) {
  .tsp-line, .tsp-laser { animation: none; stroke-dashoffset: 0; }
  .tsp-dot { animation: none; transform: none; }
  .tsp-ring { animation: none; opacity: 0; }
  .tsp-spin, .tsp-spin-rev, .tsp-tri { animation: none; }
  .tsp-label, .tsp-hud, .tsp-fin { animation-duration: .01s; animation-delay: 0s !important; }
  .tsp-bar { transition: none; }
}
`

/* ------------------------------------------------------------------- pieces */

/** Text that resolves out of glyph noise, then flickers a letter to a digit now and then. */
function Scramble({ text, delay, dur, seed, still }: { text: string; delay: number; dur: number; seed: number; still: boolean }) {
  const ref = React.useRef(null as HTMLSpanElement | null)
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    el.textContent = still ? text : ""
    if (still) return
    let raf = 0
    let timer = 0
    let n = 0
    const glitch = () => {
      timer = window.setTimeout(() => {
        el.textContent = leet(text, seed + n++)
        timer = window.setTimeout(() => {
          el.textContent = text
          glitch()
        }, 90)
      }, 2600 + ((seed * 977 + n * 331) % 3400))
    }
    const t0 = performance.now()
    const tick = (now: number) => {
      const u = (now - t0 - delay) / dur
      if (u >= 1) {
        el.textContent = text
        glitch()
        return
      }
      el.textContent = u < 0 ? "" : scramble(text, u, seed)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
    }
  }, [text, delay, dur, seed, still])
  return <span ref={ref} />
}

function Rings() {
  return (
    <span className="tsp-rings">
      <i />
      <i />
    </span>
  )
}

type LabelProps = {
  c: Credit
  look: Look
  v: number
  geo: Callout
  w: number
  delay: number
  speed: number
  still: boolean
  seed: number
  onEnter: () => void
  onLeave: () => void
}

function Label({ c, look, v, geo, w, delay, speed, still, seed, onEnter, onLeave }: LabelProps) {
  const style: React.CSSProperties = { top: geo.ey, animationDelay: delay + "s", maxWidth: geo.room }
  if (geo.side === "l") style.right = w - (geo.ex - 8)
  else style.left = geo.ex + 8
  const d = delay * 1000 + 60
  const dur = 460 / speed
  return (
    <div
      className="tsp-label"
      data-look={look}
      data-v={v}
      data-side={geo.side}
      style={style}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
    >
      <span className="tsp-name">
        {look === "orbit" && geo.side === "r" ? <Rings /> : null}
        <span className="tsp-first">
          <Scramble text={c.first} delay={d} dur={dur} seed={seed} still={still} />
        </span>
        {c.rest ? (
          <span className="tsp-rest">
            <Scramble text={c.rest} delay={d + 110 / speed} dur={dur} seed={seed + 5} still={still} />
          </span>
        ) : null}
        {look === "orbit" && geo.side === "l" ? <Rings /> : null}
      </span>
      {look === "rail" ? <i className="tsp-ruler" /> : null}
      {c.role ? <span className="tsp-role">{c.role}</span> : null}
    </div>
  )
}

function arcPath(cx: number, cy: number, r: number, a0: number, a1: number) {
  const x0 = cx + Math.cos(a0) * r
  const y0 = cy + Math.sin(a0) * r
  const x1 = cx + Math.cos(a1) * r
  const y1 = cy + Math.sin(a1) * r
  return "M" + x0.toFixed(1) + " " + y0.toFixed(1) + " A" + r.toFixed(1) + " " + r.toFixed(1) + " 0 0 1 " + x1.toFixed(1) + " " + y1.toFixed(1)
}

type ArtProps = {
  id: string
  w: number
  h: number
  fs: number
  date: string
  speed: number
  hudRef: { current: SVGGElement | null }
}

/** The set dressing each shot draws over its picture. */
function ShotArt({ id, w, h, fs, date, speed, hudRef }: ArtProps) {
  const m = Math.min(w, h)
  const cx = w / 2
  const cy = h / 2
  const X = (x: number) => cx + x * m
  const Y = (y: number) => cy - y * m
  const origin = { transformOrigin: cx.toFixed(1) + "px " + cy.toFixed(1) + "px" }

  if (id === "target") {
    const r = 0.19 * m
    const s = Math.max(6, r * 0.13)
    const squares = [] as React.ReactNode[]
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8
      const x = cx + Math.cos(a) * r
      const y = cy + Math.sin(a) * r
      squares.push(
        <rect
          key={i}
          x={x - s / 2}
          y={y - s / 2}
          width={s}
          height={s}
          className="tsp-fill"
          transform={"rotate(" + ((a * 180) / Math.PI).toFixed(1) + " " + x.toFixed(1) + " " + y.toFixed(1) + ")"}
        />,
      )
    }
    return (
      <g ref={hudRef}>
        <g className="tsp-hud">
          <line x1={cx - r * 3} y1={cy} x2={cx - r * 1.08} y2={cy} className="tsp-hair" />
          <line x1={cx + r * 1.08} y1={cy} x2={cx + r * 3} y2={cy} className="tsp-hair" />
          <line x1={cx} y1={cy - r * 1.75} x2={cx} y2={cy - r * 1.08} className="tsp-hair" />
          <line x1={cx} y1={cy + r * 1.08} x2={cx} y2={cy + r * 1.75} className="tsp-hair" />
          <circle cx={cx} cy={cy} r={r} className="tsp-hair" />
          <circle cx={cx} cy={cy} r={r * 0.34} className="tsp-bold" />
          <circle cx={cx} cy={cy} r={r * 0.08} className="tsp-fill" />
          <path d={arcPath(cx, cy, r * 1.3, -0.95, 0.95)} className="tsp-bold" />
          <g className="tsp-spin" style={origin}>
            {squares}
          </g>
          <g className="tsp-spin-rev" style={origin}>
            <path d={arcPath(cx, cy, r * 0.62, 0.3, 1.5)} className="tsp-hair" />
            <path d={arcPath(cx, cy, r * 0.62, 3.44, 4.64)} className="tsp-hair" />
          </g>
        </g>
      </g>
    )
  }

  if (id === "constellation") {
    const half = Math.max(58, date.length * fs * 0.62)
    const stars = [
      [-0.46, 0.16], [-0.38, 0.22], [-0.3, 0.17], [-0.24, 0.24],
    ]
    const stars2 = [
      [0.24, -0.2], [0.31, -0.15], [0.39, -0.22], [0.46, -0.17],
    ]
    const poly = (pts: number[][]) => pts.map((p) => X(p[0]).toFixed(1) + "," + Y(p[1]).toFixed(1)).join(" ")
    const reach = 0.15 * m
    return (
      <g className="tsp-hud">
        <text x={cx} y={cy + fs * 0.34} textAnchor="middle" className="tsp-date" style={{ fontSize: fs * 0.95 }}>
          {date}
        </text>
        {reach > half + 12 ? (
          <>
            <line x1={cx - reach} y1={cy} x2={cx - half - 8} y2={cy} className="tsp-hair" />
            <line x1={cx + half + 8} y1={cy} x2={cx + reach} y2={cy} className="tsp-hair" />
            <circle cx={cx - half - 8} cy={cy} r={2} className="tsp-knot" />
            <circle cx={cx + half + 8} cy={cy} r={2} className="tsp-knot" />
          </>
        ) : null}
        <polyline points={poly(stars)} className="tsp-hair" />
        <polyline points={poly(stars2)} className="tsp-hair" />
        {stars.concat(stars2).map((p, i) => (
          <circle key={i} cx={X(p[0])} cy={Y(p[1])} r={i % 2 ? 1.6 : 2.4} className="tsp-knot" />
        ))}
      </g>
    )
  }

  if (id === "monolith") {
    const L = [
      [-1.7, 0.62, -0.04, 0.06],
      [-0.3, 0.75, 1.8, -0.42],
      [1.6, 0.5, 0.06, -0.03],
    ]
    return (
      <g>
        {L.map((l, i) => (
          <line
            key={i}
            x1={X(l[0])}
            y1={Y(l[1])}
            x2={X(l[2])}
            y2={Y(l[3])}
            pathLength={1}
            className="tsp-laser"
            style={{ animationDelay: (0.1 + i * 0.14) / speed + "s" }}
          />
        ))}
      </g>
    )
  }

  if (id === "tunnel" || id === "eclipse") {
    const gap = (id === "tunnel" ? 0.09 : 0.21) * m
    const pad = Math.max(14, w * 0.025)
    return (
      <g className="tsp-hud">
        <line x1={pad} y1={cy} x2={cx - gap} y2={cy} className="tsp-hair" />
        <line x1={cx + gap} y1={cy} x2={w - pad} y2={cy} className="tsp-hair" />
        <line x1={pad} y1={cy - 4} x2={pad} y2={cy + 4} className="tsp-hair" />
        <line x1={w - pad} y1={cy - 4} x2={w - pad} y2={cy + 4} className="tsp-hair" />
      </g>
    )
  }

  if (id === "moon") {
    const k = (0.36 * m) / 100
    return (
      <g
        className="tsp-figure"
        transform={"translate(" + X(0).toFixed(1) + " " + Y(-0.3).toFixed(1) + ") scale(" + k.toFixed(4) + ")"}
      >
        <circle cx={0} cy={-91} r={6} />
        <ellipse cx={0} cy={-96} rx={10.5} ry={1.9} />
        <path d="M-6 -96 L-5.4 -104 Q0 -106.6 5.4 -104 L6 -96 Z" />
        <rect x={-2.2} y={-86.5} width={4.4} height={5.5} />
        <path d="M-9 -83 C-11.5 -83 -12.6 -80.5 -12.8 -76 L-14.8 -38 L14.8 -38 L12.8 -76 C12.6 -80.5 11.5 -83 9 -83 Z" />
        <path d="M3.66 -93.74 L41.44 -125.33 L46.56 -118.67 L6.34 -90.26 Z" />
        <ellipse cx={44} cy={-122} rx={2.4} ry={5.6} transform="rotate(-37.6 44 -122)" />
        <g className="tsp-limbs">
          <line x1={-5.5} y1={-40} x2={-7.2} y2={-2} />
          <line x1={5.5} y1={-40} x2={7.8} y2={-2} />
          <line x1={-11} y1={-78} x2={-15.5} y2={-49} />
          <polyline points="11,-79 20,-87 17,-100" />
        </g>
        <ellipse cx={-9} cy={-1.4} rx={5.2} ry={2.3} />
        <ellipse cx={9.6} cy={-1.4} rx={5.2} ry={2.3} />
      </g>
    )
  }

  if (id === "beams") {
    const x0 = X(-0.7)
    const x1 = X(-0.17)
    const y0 = Y(0.23)
    const y1 = Y(-0.26)
    const k = Math.max(10, m * 0.025)
    const corner = (x: number, y: number, sx: number, sy: number) =>
      x + sx * k + "," + y + " " + x + "," + y + " " + x + "," + (y + sy * k)
    return (
      <g className="tsp-hud">
        <polyline points={corner(x0, y0, 1, 1)} className="tsp-hair" />
        <polyline points={corner(x1, y0, -1, 1)} className="tsp-hair" />
        <polyline points={corner(x0, y1, 1, -1)} className="tsp-hair" />
        <polyline points={corner(x1, y1, -1, -1)} className="tsp-hair" />
      </g>
    )
  }

  return null
}

type FinaleProps = {
  title: string
  location: string
  w: number
  h: number
  fs: number
  speed: number
  still: boolean
  layerRef: { current: HTMLDivElement | null }
}

/** Title ←  ·  → location, either side of the rocket. */
function Finale({ title, location, w, h, fs, speed, still, layerRef }: FinaleProps) {
  const m = Math.min(w, h)
  const y = h / 2 + 0.06 * m
  const gapC = Math.max(30, 0.085 * m)
  const arrow = clamp(w * 0.07, 30, 96)
  const pad = Math.max(14, w * 0.025)
  const avail = w / 2 - gapC - arrow - 12 - pad
  const size = (s: string) => clamp(avail / Math.max(1, s.length * 0.95), 9, fs * 1.35)
  const xl = w / 2 - gapC
  const xr = w / 2 + gapC
  const d = 0.45 / speed
  const pts = (a: number[]) => a.map((v) => v.toFixed(1)).join(" ")
  return (
    <div ref={layerRef} className="tsp-layer" aria-hidden="true">
      <svg className="tsp-svg" width={w} height={h} viewBox={"0 0 " + w + " " + h}>
        <g className="tsp-lead">
          <polyline points={pts([xl, y, xl - arrow, y])} pathLength={1} className="tsp-line" style={{ animationDelay: d + "s" }} />
          <polyline points={pts([xl - arrow + 6, y - 4, xl - arrow, y, xl - arrow + 6, y + 4])} pathLength={1} className="tsp-line" style={{ animationDelay: d + 0.35 / speed + "s" }} />
          <polyline points={pts([xr, y, xr + arrow, y])} pathLength={1} className="tsp-line" style={{ animationDelay: d + "s" }} />
          <polyline points={pts([xr + arrow - 6, y - 4, xr + arrow, y, xr + arrow - 6, y + 4])} pathLength={1} className="tsp-line" style={{ animationDelay: d + 0.35 / speed + "s" }} />
        </g>
      </svg>
      <div className="tsp-fin" style={{ right: w - (xl - arrow - 10), top: y, fontSize: size(title), animationDelay: d + 0.2 / speed + "s" }}>
        <Scramble text={title} delay={(d + 0.25 / speed) * 1000} dur={700 / speed} seed={3} still={still} />
      </div>
      <div className="tsp-fin" style={{ left: xr + arrow + 10, top: y, fontSize: size(location), animationDelay: d + 0.3 / speed + "s" }}>
        <Scramble text={location} delay={(d + 0.35 / speed) * 1000} dur={700 / speed} seed={7} still={still} />
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- component */

export default function TitleSequencePreloader({
  credits = DEFAULT_CREDITS,
  title = "STUDIO.2026",
  location = "LOW ORBIT",
  date,
  shots,
  progress,
  durationMs = 16000,
  shotMs,
  loop = false,
  speed = 1,
  accent = "#7fe0ee",
  hot = "#ff4d6d",
  marker = "#f3e37c",
  plate = "#1b2a7a",
  tint = "#eef3f6",
  shade = "#050608",
  grain = 0.5,
  interactive = true,
  skipLabel = "Skip",
  hint = "Hold to fast-forward · tap to cut",
  height = "100svh",
  onShotChange,
  onComplete,
  className = "",
  children,
}: TitleSequencePreloaderProps) {
  const shotsKey = (shots || []).join(",")
  const list = React.useMemo(() => shotList(shots), [shotsKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const people = React.useMemo(() => (credits || []).map(splitCredit).filter((c) => c.first), [credits])
  const caps = list.map((id) => SHOTS[id].slots.length)
  const capsKey = caps.join(",")

  const sp = speed > 0 ? speed : 1
  const simulated = typeof progress !== "number" || !isFinite(progress)
  const count = list.length
  const perShot = simulated ? Math.max(900, durationMs / count) : Math.max(900, shotMs ?? 2200)

  const [phase, setPhase] = React.useState("titles" as Phase)
  const [shot, setShot] = React.useState({ i: 0, cycle: 0 })
  const [size, setSize] = React.useState({ w: 0, h: 0 })
  const [noGl, setNoGl] = React.useState(false)
  const [reduced, setReduced] = React.useState(false)
  const [hover, setHover] = React.useState(-1)
  const [ff, setFf] = React.useState(false)
  const [armed, setArmed] = React.useState(false)
  const [today] = React.useState(() => formatDate(new Date()))
  const finished = phase === "done"

  const gateRef = React.useRef(null as HTMLDivElement | null)
  const canvasRef = React.useRef(null as HTMLCanvasElement | null)
  const destRef = React.useRef(null as HTMLDivElement | null)
  const layerRef = React.useRef(null as HTMLDivElement | null)
  const hudRef = React.useRef(null as SVGGElement | null)
  const counterRef = React.useRef(null as HTMLSpanElement | null)
  const progRef = React.useRef(null as HTMLDivElement | null)
  const fillRef = React.useRef(null as HTMLElement | null)
  const tcRef = React.useRef(null as HTMLSpanElement | null)
  const dirRef = React.useRef(initialState())
  const holdRef = React.useRef(false)
  const ffRef = React.useRef(false)
  const flashRef = React.useRef(0)
  const reducedRef = React.useRef(false)
  const pointer = React.useRef({ x: 0, y: 0, t: -1e9 })
  const press = React.useRef({ down: false, timer: 0 })

  const dirOpts: DirOpts = {
    count,
    shotMs: perShot,
    duration: perShot * count,
    finaleMs: FINALE_MS,
    revealMs: REVEAL_MS,
    target: simulated ? null : clamp(progress as number, 0, 100),
    loop,
    hold: false,
  }
  const live = React.useRef({ dirOpts, list, speed: sp, grain, interactive, colors: [tint, shade, accent, hot], onShotChange, onComplete })
  live.current = { dirOpts, list, speed: sp, grain, interactive, colors: [tint, shade, accent, hot], onShotChange, onComplete }

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const on = () => {
      reducedRef.current = mq.matches
      setReduced(mq.matches)
    }
    on()
    mq.addEventListener("change", on)
    return () => mq.removeEventListener("change", on)
  }, [])

  // A hovered credit holds its shot; a cut must never leave that hold behind.
  React.useEffect(() => {
    holdRef.current = false
    setHover(-1)
  }, [shot.i, shot.cycle, phase])

  // The page underneath stays out of the tab order until the clouds part.
  React.useEffect(() => {
    const el = destRef.current
    if (el) el.inert = phase === "titles" || phase === "finale"
  }, [phase])

  React.useEffect(() => {
    if (finished) return
    const gate = gateRef.current
    const canvas = canvasRef.current
    if (!gate || !canvas) return

    let gl = null as WebGL2RenderingContext | null
    try {
      gl = canvas.getContext("webgl2", {
        alpha: true,
        premultipliedAlpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: "high-performance",
      }) as WebGL2RenderingContext | null
    } catch {
      gl = null
    }
    const built = gl ? buildProgram(gl) : null
    if (!built) gl = null
    const prog = built ? built.prog : null
    const ext = gl ? (gl.getExtension("KHR_parallel_shader_compile") as { COMPLETION_STATUS_KHR: number } | null) : null
    let ready = false
    const vao = gl ? gl.createVertexArray() : null
    const U: { [k: string]: WebGLUniformLocation | null } = {}
    const ctx = gl
    setNoGl(!gl)
    const onLost = (e: Event) => {
      e.preventDefault()
      gl = null
      setNoGl(true)
    }
    canvas.addEventListener("webglcontextlost", onLost)

    // Resolution: the picture is soft and grainy by design, so it renders
    // below device pixels and drops further if frames run long.
    const top = Math.min(window.devicePixelRatio || 1, 1.5) * 0.8
    let scale = top
    const MAX_PX = 1100000
    let W = 1
    let H = 1
    const resize = () => {
      const r = gate.getBoundingClientRect()
      W = Math.max(1, Math.round(r.width))
      H = Math.max(1, Math.round(r.height))
      setSize((s) => (s.w === W && s.h === H ? s : { w: W, h: H }))
      let k = scale
      if (W * H * k * k > MAX_PX) k = Math.sqrt(MAX_PX / (W * H))
      const cw = Math.max(1, Math.round(W * k))
      const ch = Math.max(1, Math.round(H * k))
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw
        canvas.height = ch
      }
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(gate)

    let visible = true
    const io = new IntersectionObserver((es) => {
      visible = es.length ? es[es.length - 1].isIntersecting : true
    })
    io.observe(gate)

    let raf = 0
    let last = performance.now()
    let anim = 0
    let mx = 0
    let my = 0
    let frames = 0
    let spent = 0
    let lastPct = -1
    let lastTc = ""
    let seen = { phase: dirRef.current.phase, shot: dirRef.current.shot, cycle: dirRef.current.cycle }

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const raw = Math.min(64, Math.max(0, now - last))
      last = now
      const L = live.current
      const still = reducedRef.current
      const dt = raw * L.speed * (ffRef.current ? 4 : 1)
      const o = { ...L.dirOpts, hold: holdRef.current }
      let s = dirRef.current
      if (s.shot >= o.count) s = { ...s, shot: 0, local: 0 }
      s = advance(s, dt, o)
      dirRef.current = s
      anim += dt / 1000

      if (s.phase !== seen.phase || s.shot !== seen.shot || s.cycle !== seen.cycle) {
        // The reveal carries on from the lift-off's clock: only cuts restart it.
        if (s.phase !== "reveal") anim = 0
        if (s.phase !== seen.phase) setPhase(s.phase)
        if (s.shot !== seen.shot || s.cycle !== seen.cycle) {
          setShot({ i: s.shot, cycle: s.cycle })
          if (s.phase === "titles") L.onShotChange?.(s.shot, L.list[s.shot] as TitleShot)
        }
        if (s.phase === "done") L.onComplete?.()
        seen = { phase: s.phase, shot: s.shot, cycle: s.cycle }
      }
      if (s.phase === "done") return

      const pct = Math.floor(s.shown)
      if (pct !== lastPct) {
        lastPct = pct
        if (counterRef.current) counterRef.current.textContent = String(pct).padStart(3, "0")
        if (progRef.current) progRef.current.setAttribute("aria-valuenow", String(pct))
        if (fillRef.current) fillRef.current.style.transform = "scaleX(" + (s.shown / 100).toFixed(3) + ")"
      }
      const tc = timecode(s.total)
      if (tc !== lastTc && tcRef.current) {
        lastTc = tc
        tcRef.current.textContent = tc
      }

      // Pointer drift, or a slow idle wander once the pointer has gone quiet.
      const P = pointer.current
      let tx = P.x
      let ty = P.y
      if (now - P.t > 2500) {
        tx = Math.sin(now / 3100) * 0.35
        ty = Math.cos(now / 4300) * 0.2
      }
      if (still || !L.interactive) {
        tx = 0
        ty = 0
      }
      const ease = 1 - Math.exp(-raw / 260)
      mx += (tx - mx) * ease
      my += (ty - my) * ease
      const layer = layerRef.current
      if (layer) {
        layer.style.transform = "translate3d(" + (-mx * 7).toFixed(2) + "px," + (my * 5).toFixed(2) + "px,0)"
        const out = s.phase === "titles" && !holdRef.current && s.local > o.shotMs - 240 ? "1" : "0"
        if (layer.dataset.out !== out) layer.dataset.out = out
      }
      if (hudRef.current) hudRef.current.setAttribute("transform", "translate(" + (mx * 14).toFixed(2) + " " + (-my * 10).toFixed(2) + ")")
      flashRef.current *= Math.exp(-raw / 90)

      if (!gl || !prog || !built || !visible || document.hidden) return
      if (!ready) {
        const st = programState(gl, built, ext)
        if (st === "wait") return
        if (st === "fail") {
          gl = null
          setNoGl(true)
          return
        }
        for (const n of UNIFORMS) U[n] = gl.getUniformLocation(prog, n)
        ready = true
      }
      const scene = s.phase === "titles" ? SHOTS[L.list[s.shot]].scene : FINALE_SCENE
      const T = still ? (scene === FINALE_SCENE ? 2.4 : 1.3) : anim
      const fadeIn = still ? 1 : smooth(0, 0.22, anim)
      const fadeOut = s.phase === "titles" && !holdRef.current ? 1 - smooth(o.shotMs - 150, o.shotMs, s.local) : 1
      const [ti, sh, ac, ho] = L.colors.map(hexToRgb)
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.useProgram(prog)
      gl.bindVertexArray(vao)
      gl.uniform2f(U.uRes, canvas.width, canvas.height)
      gl.uniform1f(U.uTime, still ? 0 : now / 1000)
      gl.uniform1f(U.uT, T)
      gl.uniform1i(U.uScene, scene)
      gl.uniform2f(U.uMouse, mx, my)
      gl.uniform1f(U.uFade, scene === FINALE_SCENE ? (still ? 1 : smooth(0, 0.35, anim)) : Math.min(fadeIn, fadeOut))
      gl.uniform1f(U.uReveal, s.phase === "reveal" && !still ? clamp(s.local / o.revealMs, 0, 1) : 0)
      gl.uniform1f(U.uFF, ffRef.current && !still ? 1 : 0)
      gl.uniform1f(U.uFlash, still ? 0 : flashRef.current)
      gl.uniform1f(U.uGrain, clamp(L.grain, 0, 1))
      gl.uniform1f(U.uMotion, still ? 0 : 1)
      gl.uniform3f(U.uTint, ti[0], ti[1], ti[2])
      gl.uniform3f(U.uShade, sh[0], sh[1], sh[2])
      gl.uniform3f(U.uAccent, ac[0], ac[1], ac[2])
      gl.uniform3f(U.uHot, ho[0], ho[1], ho[2])
      gl.uniform1f(U.uPx, 1 / Math.max(1, Math.min(W, H)))
      gl.drawArrays(gl.TRIANGLES, 0, 3)

      spent += raw
      frames++
      if (frames >= 45) {
        const avg = spent / frames
        spent = 0
        frames = 0
        if (avg > 24 && scale > 0.42) {
          scale *= 0.82
          resize()
        } else if (avg < 15 && scale < top) {
          scale = Math.min(top, scale * 1.08)
          resize()
        }
      }
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      canvas.removeEventListener("webglcontextlost", onLost)
      if (ctx && built) {
        if (!ready) {
          ctx.deleteShader(built.vs)
          ctx.deleteShader(built.fs)
        }
        ctx.deleteVertexArray(vao)
        ctx.deleteProgram(built.prog)
      }
    }
  }, [finished])

  React.useEffect(() => () => clearTimeout(press.current.timer), [])

  const flashIfMoved = (next: DirState) => {
    const prev = dirRef.current
    if (next.shot !== prev.shot || next.phase !== prev.phase) flashRef.current = 1
    dirRef.current = next
  }
  const doCut = (dir: number) => flashIfMoved(cut(dirRef.current, dir, live.current.dirOpts))
  const doSkip = () => {
    const next = skip(dirRef.current, live.current.dirOpts)
    if (next.armed) setArmed(true)
    flashIfMoved(next)
  }
  const endHold = () => {
    press.current.down = false
    clearTimeout(press.current.timer)
    if (ffRef.current) {
      ffRef.current = false
      setFf(false)
      return true
    }
    return false
  }
  const onMove = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect()
    pointer.current = {
      x: clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1),
      y: clamp(1 - ((e.clientY - r.top) / r.height) * 2, -1, 1),
      t: performance.now(),
    }
  }
  const onDown = (e: React.PointerEvent) => {
    if (!interactive) return
    if (e.pointerType === "mouse" && e.button !== 0) return
    if ((e.target as Element).closest("button, a, .tsp-label")) return
    press.current.down = true
    clearTimeout(press.current.timer)
    press.current.timer = window.setTimeout(() => {
      if (!press.current.down) return
      ffRef.current = true
      setFf(true)
    }, 260)
  }
  const onUp = () => {
    if (!press.current.down) return
    if (!endHold()) doCut(1)
  }
  const onKey = (e: React.KeyboardEvent) => {
    if (!interactive || e.target !== e.currentTarget) return
    if (e.key === "ArrowRight" || e.key === " ") {
      e.preventDefault()
      doCut(1)
    } else if (e.key === "ArrowLeft") {
      e.preventDefault()
      doCut(-1)
    } else if (e.key === "Enter" || e.key === "Escape") {
      e.preventDefault()
      doSkip()
    }
  }

  const assignment = React.useMemo(
    () => distribute(people.length, capsKey.split(",").map(Number), shot.cycle),
    [people.length, capsKey, shot.cycle],
  )

  const w = size.w
  const h = size.h
  const bar = Math.round(clamp(h * 0.095, 40, 84))
  const fs = Math.round(clamp(w * 0.0098, 10.5, 15) * 10) / 10
  const id = list[Math.min(shot.i, count - 1)]
  const def = SHOTS[id]
  const names = assignment[Math.min(shot.i, count - 1)] || []
  const gating = !finished
  const still = reduced
  const pad2 = (n: number) => String(n).padStart(2, "0")
  const slate =
    phase === "titles" ? "SC " + pad2(Math.min(shot.i, count - 1) + 1) + "/" + pad2(count) : phase === "finale" ? "Lift-off" : "Clear"
  const vars = {
    height,
    "--tsp-accent": accent,
    "--tsp-hot": hot,
    "--tsp-marker": marker,
    "--tsp-plate": plate,
    "--tsp-fs": fs + "px",
  } as React.CSSProperties

  let overlay = null as React.ReactNode
  if (w > 0 && h > 0 && phase === "titles") {
    const geos = names.map((ix, j) => {
      const c = people[ix]
      const est = estimateLabel(c, def.look, fs)
      return { c, j, geo: layoutCallout(def.slots[j], w, h, est.w, est.h, bar, bar) }
    })
    overlay = (
      <div key={shot.cycle + ":" + shot.i} ref={layerRef} className="tsp-layer" aria-hidden="true">
        <svg className="tsp-svg" width={w} height={h} viewBox={"0 0 " + w + " " + h}>
          <ShotArt id={id} w={w} h={h} fs={fs} date={date || today} speed={sp} hudRef={hudRef} />
          {geos.map(({ geo, j }) => {
            const t0 = (0.22 + j * 0.16) / sp
            return (
              <g key={j} className="tsp-lead" data-hot={hover === j}>
                <polyline
                  points={geo.ax.toFixed(1) + "," + geo.ay.toFixed(1) + " " + geo.kx.toFixed(1) + "," + geo.ey.toFixed(1) + " " + geo.ex.toFixed(1) + "," + geo.ey.toFixed(1)}
                  pathLength={1}
                  className="tsp-line"
                  style={{ animationDelay: t0 + 0.08 / sp + "s" }}
                />
                <circle cx={geo.ax} cy={geo.ay} r={2.4} className="tsp-dot" style={{ animationDelay: t0 + "s" }} />
                <circle cx={geo.ax} cy={geo.ay} r={6} className="tsp-ring" style={{ animationDelay: t0 + 0.2 / sp + "s" }} />
              </g>
            )
          })}
        </svg>
        {geos.map(({ c, j, geo }) => (
          <Label
            key={j}
            c={c}
            look={def.look}
            v={j % 4}
            geo={geo}
            w={w}
            delay={(0.22 + j * 0.16 + 0.4) / sp}
            speed={sp}
            still={still}
            seed={shot.i * 17 + j * 5 + shot.cycle * 3}
            onEnter={() => {
              holdRef.current = true
              setHover(j)
            }}
            onLeave={() => {
              holdRef.current = false
              setHover(-1)
            }}
          />
        ))}
      </div>
    )
  } else if (w > 0 && h > 0 && phase !== "done") {
    overlay = <Finale title={title} location={location} w={w} h={h} fs={fs} speed={sp} still={still} layerRef={layerRef} />
  }

  return (
    <div className={"tsp-root " + className} style={{ height: gating ? height : "auto", minHeight: height }}>
      <style>{CSS}</style>
      {!loop && (
        <div ref={destRef} className="tsp-dest" style={{ minHeight: height }}>
          {children}
        </div>
      )}
      {gating && (
        <div
          ref={gateRef}
          className="tsp-gate"
          data-phase={phase}
          data-still={still}
          style={vars}
          tabIndex={0}
          role="region"
          aria-roledescription="title sequence"
          aria-label={"Opening titles while the page loads." + (interactive ? " Arrow keys cut between shots, Enter skips." : "")}
          onPointerMove={onMove}
          onPointerDown={onDown}
          onPointerUp={onUp}
          onPointerCancel={endHold}
          onPointerLeave={endHold}
          onKeyDown={onKey}
        >
          <canvas ref={canvasRef} className="tsp-canvas" aria-hidden="true" />
          {noGl ? <div className="tsp-fallback" data-scene={phase === "titles" ? def.scene : FINALE_SCENE} /> : null}
          {overlay}
          {ff ? (
            <div className="tsp-ff" style={{ top: bar + 14 }} aria-hidden="true">
              ▸▸ ×4
            </div>
          ) : null}
          <div className="tsp-bar tsp-top" style={{ height: bar }}>
            <div className="tsp-brand">
              <span className="tsp-tri" />
              <b>{title}</b>
              <span className="tsp-dim">Opening titles</span>
            </div>
            <div className="tsp-slate" aria-hidden="true">
              <span>{slate}</span>
              <span ref={tcRef} className="tsp-tc">
                00:00:00:00
              </span>
            </div>
          </div>
          <div className="tsp-bar tsp-bottom" style={{ height: bar }}>
            <div ref={progRef} className="tsp-count" role="progressbar" aria-label="Loading" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0}>
              <span ref={counterRef} className="tsp-num" aria-hidden="true">
                000
              </span>
              <span className="tsp-pct" aria-hidden="true">
                %
              </span>
              <span className="tsp-status">{phase === "titles" ? (armed ? "Skip when ready" : "Loading") : "Lift-off"}</span>
            </div>
            <div className="tsp-reel" aria-hidden="true">
              {list.map((_, i) => (
                <i key={i} data-state={phase !== "titles" || i < shot.i ? "past" : i === shot.i ? "on" : "next"} />
              ))}
              <b ref={fillRef} />
            </div>
            <div className="tsp-actions">
              {hint && interactive ? <span className="tsp-hint">{hint}</span> : null}
              {skipLabel ? (
                <button type="button" className="tsp-skip" onClick={doSkip}>
                  {skipLabel}
                </button>
              ) : null}
            </div>
          </div>
          <ul className="sr-only">
            {people.map((c, i) => (
              <li key={i}>{[c.first, c.rest].filter(Boolean).join(" ") + (c.role ? ", " + c.role : "")}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
