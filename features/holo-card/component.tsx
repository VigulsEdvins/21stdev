"use client"

import * as React from "react"

/**
 * Holo Card — a holographic foil trading card you tilt with the pointer.
 *
 * The shine is not a looping animation. Its phase is driven by the **viewing
 * direction**, so the rainbow moves because you moved the card, and holding it
 * still holds the shine still — which is the entire difference between this
 * and a gradient on a timer.
 *
 * The layers are parallaxed the same way: the view vector is taken into card
 * space and divided by a bounded normal component before offsetting UV, so the
 * art sits *inside* the card rather than sliding across it.
 *
 * Self-contained: raw WebGL2, React is the only import. No three.js, no
 * animation library, no CSS file, and no images required — the card face is
 * generated if you do not supply art.
 */

export type Finish = "pearl" | "silver" | "gold" | "original"

export type HoloCardProps = {
  name?: string
  /** The small line under the name — a type line, a class, a role. */
  subtitle?: string
  /** Bottom-left collector's number, e.g. "No. 001". */
  number?: string
  /** Bottom-right rarity word. */
  rarity?: string
  /**
   * The subject: a PNG with transparency, parallaxed forward. Without one the
   * card renders its generated face, which is a real foil pattern rather than
   * a placeholder.
   */
  art?: string
  /** Full-bleed backdrop, parallaxed backward. */
  background?: string
  finish?: Finish
  /** Card width. Height follows the 5:7 trading-card ratio. */
  width?: string
  /** Foil strength, 0–1. */
  foil?: number
  /**
   * How far the rainbow follows the grating rather than washing across the
   * card. 0 is a flat sheen; the default bands it along the ruling, which is
   * what real foil does.
   */
  pattern?: number
  /** How far the subject floats forward, and the backdrop back. */
  depth?: number
  bgDepth?: number
  /** Largest tilt in degrees. */
  tilt?: number
  /** Drift when nobody is touching it, so it catches the light on its own. */
  idle?: boolean
  /** Click, tap or Enter flips it. */
  flippable?: boolean
  /** What is printed on the back. */
  back?: React.ReactNode
  className?: string
}

// #region card
/** Clamp to ±max. */
export const clampTilt = (v: number, max: number): number =>
  v > max ? max : v < -max ? -max : v > 0 || v < 0 ? v : 0

/**
 * Pointer position over the card, as a tilt in degrees.
 *
 * `x` and `y` are 0..1 across the element. The signs are what make it feel
 * like an object: pushing the pointer right lifts the right edge away, so the
 * card leans *into* the cursor rather than following it like a puppet.
 */
export const tiltFromPointer = (
  x: number,
  y: number,
  max: number,
): { ax: number; ay: number } => ({
  ax: clampTilt((0.5 - y) * 2 * max, max),
  ay: clampTilt((x - 0.5) * 2 * max, max),
})

/**
 * The unit view vector in card space for a given tilt, in degrees.
 *
 * This is the value the whole effect hangs off: both the parallax and the
 * holographic phase read it, which is why they stay in agreement and the shine
 * appears to belong to the same surface the art is printed on.
 */
export const viewFromTilt = (ax: number, ay: number): [number, number, number] => {
  const rx = (ax * Math.PI) / 180
  const ry = (ay * Math.PI) / 180
  const x = Math.sin(ry) * Math.cos(rx)
  const y = -Math.sin(rx)
  const z = Math.cos(ry) * Math.cos(rx)
  const len = Math.hypot(x, y, z) || 1
  return [x / len, y / len, z / len]
}

/**
 * The UV offset for a layer at `depth`, given the view vector.
 *
 * `|z|` is floored at 0.4 on purpose. At a glancing angle the true division
 * runs away to infinity and the layer shoots off the card; bounding it keeps
 * the parallax believable right out to the edge of the tilt.
 */
export const parallaxOffset = (
  view: [number, number, number],
  depth: number,
): [number, number] => {
  const k = depth * 0.1 / Math.max(Math.abs(view[2]), 0.4)
  return [view[0] * k, view[1] * k]
}

/** The cosine palette the foil is built from. Phase in turns. */
export const spectrum = (phase: number): [number, number, number] => [
  0.66 + 0.25 * Math.cos(6.28318 * phase),
  0.66 + 0.25 * Math.cos(6.28318 * (phase + 0.33)),
  0.66 + 0.25 * Math.cos(6.28318 * (phase + 0.67)),
]
// #endregion

const FINISH_ID: Record<Finish, number> = { pearl: 0, silver: 1, original: 2, gold: 3 }

const VERT = `#version 300 es
void main() {
  // An oversized triangle, not a quad. The *2 matters: without it the three
  // vertices land on (-1,-1) (1,-1) (-1,1) and cover exactly half the
  // viewport, which renders as a card sliced corner to corner.
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2) * 2.0 - 1.0;
  gl_Position = vec4(p, 0.0, 1.0);
}
`

const FRAG = `#version 300 es
precision highp float;
out vec4 fragColor;

uniform vec2 uRes;
uniform vec3 uView;
uniform float uTime;
uniform float uFoil;
uniform float uFinish;
uniform float uDepth;
uniform float uBgDepth;
uniform float uHasArt;
uniform float uPattern;
uniform float uHasBg;
uniform sampler2D tArt;
uniform sampler2D tBg;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float inside(vec2 p) { return step(0.0, p.x) * step(0.0, p.y) * step(p.x, 1.0) * step(p.y, 1.0); }

// The view vector taken into card space and divided by a bounded normal
// component. Unbounded, a glancing angle sends the layer off the card.
vec2 parallax(vec2 uv, float depth) {
  return uv + uView.xy / max(abs(uView.z), 0.4) * depth * 0.10;
}

vec3 spectrum(float phase) {
  return 0.66 + 0.25 * cos(6.28318 * (phase + vec3(0.0, 0.33, 0.67)));
}

// Real holographic foil is a diffraction grating, so the colour bands *along*
// the ruling rather than washing across the card. This is the grating
// coordinate: radial rays crossed with concentric rings.
float grating(vec2 uv) {
  vec2 p = (uv - vec2(0.5, 0.46)) * vec2(uRes.x / uRes.y, 1.0);
  // The angular coefficient must be a whole number. atan wraps by 2*pi at the
  // branch cut, so a fractional multiplier leaves a fraction of a turn of
  // phase there — a hard seam running out of the centre of the card.
  return atan(p.y, p.x) * 3.0 + length(p) * 6.0;
}

// The phase is a function of the viewing direction, not of time. Hold the card
// still and the rainbow holds still.
vec3 film(vec2 uv) {
  float phase = uv.x * 0.85 + uv.y * 0.55 + uView.x * 1.5 - uView.y * 0.9
    + grating(uv) * uPattern;
  if (uFinish > 2.5) {
    float hi = 0.5 + 0.5 * sin(phase * 6.28318);
    float glint = 0.5 + 0.5 * cos((phase + 0.25) * 6.28318);
    return mix(vec3(0.72, 0.50, 0.20), vec3(1.00, 0.90, 0.60), hi * 0.7 + glint * 0.3);
  }
  vec3 color = spectrum(phase);
  return mix(color, vec3(dot(color, vec3(0.2126, 0.7152, 0.0722))), step(0.5, uFinish));
}

// A narrow band that crosses the card as it turns. The tenth power is what
// keeps it a band rather than a wash.
float sweep(vec2 uv) {
  return pow(0.5 + 0.5 * sin((uv.x * 0.72 + uv.y * 0.45 + uView.x * 1.2 + uView.y * 0.6) * 6.283), 10.0);
}

// The generated face, for a card with no art of its own: a starburst behind
// concentric guilloche rings, which is what is actually printed under the
// picture on a real foil card.
vec3 generated(vec2 uv) {
  vec2 p = (uv - vec2(0.5, 0.46)) * vec2(uRes.x / uRes.y, 1.0) * 2.1;
  float r = length(p);
  float a = atan(p.y, p.x);

  // Deliberately dark and nearly colourless. On a card with no art the foil
  // has to be the whole show, and it cannot be if the base is already loud.
  vec3 col = mix(vec3(0.045, 0.035, 0.075), vec3(0.015, 0.012, 0.03), smoothstep(0.1, 1.4, r));

  // Fine radial ruling — the grating made visible. Thin and bright, so the
  // spectrum has something crisp to sit on.
  float rays = pow(0.5 + 0.5 * cos(a * 72.0), 8.0);
  col += vec3(0.55, 0.60, 0.80) * rays * smoothstep(1.45, 0.12, r) * 0.42;

  // Concentric rings at a different pitch, so the two cross into a moire.
  float rings = pow(0.5 + 0.5 * cos(r * 90.0), 8.0);
  col += vec3(0.45, 0.55, 0.85) * rings * smoothstep(1.5, 0.1, r) * 0.30;

  // One bright halo where the art would sit, to give the composition a centre.
  col += vec3(0.5, 0.42, 0.75) * smoothstep(0.60, 0.40, r) * 0.16;
  col += vec3(0.95, 0.90, 1.0) * (smoothstep(0.52, 0.49, r) - smoothstep(0.49, 0.46, r)) * 0.5;

  return col;
}

void main() {
  vec2 uv = vec2(gl_FragCoord.x / uRes.x, 1.0 - gl_FragCoord.y / uRes.y);

  vec2 bu = parallax(uv, uBgDepth);
  vec3 col = uHasBg > 0.5
    ? texture(tBg, clamp(bu, 0.0, 1.0)).rgb
    : generated(bu);

  if (uHasArt > 0.5) {
    // The subject is pushed forward and scaled a touch, so it reads as sitting
    // above the backdrop rather than printed on it.
    vec2 su = (parallax(uv, uDepth) - 0.5) / 1.06 + 0.5;
    vec4 art = texture(tArt, clamp(su, 0.0, 1.0));
    col = mix(col, art.rgb, art.a * inside(su));
  }

  if (uFinish > 2.5) col = col * vec3(1.02, 0.95, 0.78) + vec3(0.05, 0.012, 0.0);

  vec3 foil = film(uv);
  float amount = abs(uFinish - 2.0) < 0.05 ? 0.0 : uFoil;
  float luminance = dot(col, vec3(0.2126, 0.7152, 0.0722));
  float band = sweep(uv);
  float goldBoost = uFinish > 2.5 ? 1.7 : 1.0;

  // With no art the foil carries the card, so it is allowed to be much
  // stronger; over a picture it stays at the reference's restrained level.
  float lift = mix(1.7, 1.0, uHasArt);
  col *= 1.0 - amount * 0.21 * (1.0 - foil) * (0.2 + band * 0.8);
  col += foil * amount * band * goldBoost * (0.065 + 0.11 * (1.0 - luminance)) * lift;
  // On a card with no art, the spectrum is hung on the ruling itself — scaled
  // by how bright the base already is — so the gaps between the rays stay
  // black. Adding it flat is what turns the whole card milky.
  col += foil * amount * (1.0 - uHasArt) * foil * (0.04 + 2.4 * luminance);

  // The laminate catches hardest right at the edge of the card.
  float edge = 1.0 - smoothstep(0.015, 0.06, min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y)));
  col = mix(col, foil * 0.75 + 0.21, edge * amount * (uFinish > 2.5 ? 0.42 : 0.3));

  // Glitter: a sparse hash of cells, each winking on its own phase as the card
  // turns. This is the one place time is allowed in, and only barely.
  vec2 cell = floor(uv * vec2(480.0, 720.0));
  float flake = step(0.994, hash(cell)) *
    pow(0.5 + 0.5 * sin(hash(cell + 8.0) * 30.0 + uView.x * 20.0 + uTime * 0.6), 10.0);
  col += foil * flake * amount * 0.13;

  fragColor = vec4(pow(clamp(col, 0.0, 1.0), vec3(1.0 / 1.6)), 1.0);
}
`

const compile = (gl: WebGL2RenderingContext, type: number, src: string) => {
  const sh = gl.createShader(type)
  if (!sh) throw new Error("no shader")
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh)
    gl.deleteShader(sh)
    throw new Error("shader: " + log)
  }
  return sh
}

export default function HoloCard({
  name = "Holo Card",
  subtitle = "Foil · View-dependent",
  number = "No. 001",
  rarity = "RARE",
  art,
  background,
  finish = "pearl",
  width = "clamp(230px, 64vw, 340px)",
  foil = 1,
  pattern = 0.22,
  depth = 0.28,
  bgDepth = -0.2,
  tilt = 16,
  idle = true,
  flippable = true,
  back,
  className = "",
}: HoloCardProps) {
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const [flipped, setFlipped] = React.useState(false)
  const [failed, setFailed] = React.useState(false)
  const [generation, setGeneration] = React.useState(0)
  const [reduced, setReduced] = React.useState(false)
  // Mirrored out of the loop so the CSS transform can follow the same angles
  // the shader is using — one source of truth, or the shine and the geometry
  // disagree and it stops looking like one object.
  const [angles, setAngles] = React.useState({ ax: 0, ay: 0 })

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])

  const tuning = React.useRef({ foil, depth, bgDepth, finish, tilt, idle, reduced, pattern })
  tuning.current = { foil, depth, bgDepth, finish, tilt, idle, reduced, pattern }

  // Written by pointer handlers, read by the loop.
  const target = React.useRef({ ax: 0, ay: 0, active: false })

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext("webgl2", { alpha: false, antialias: false })
    if (!gl) {
      setFailed(true)
      return
    }

    let program: WebGLProgram | null = null
    let vao: WebGLVertexArrayObject | null = null
    const textures: WebGLTexture[] = []
    let raf = 0
    let disposed = false
    let ax = 0
    let ay = 0
    const started = performance.now()

    const onLost = (e: Event) => {
      e.preventDefault()
      cancelAnimationFrame(raf)
    }
    const onRestored = () => setGeneration((g) => g + 1)
    canvas.addEventListener("webglcontextlost", onLost)
    canvas.addEventListener("webglcontextrestored", onRestored)

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.round(canvas.clientWidth * dpr)
      const h = Math.round(canvas.clientHeight * dpr)
      if (w === 0 || h === 0) return
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        gl.viewport(0, 0, w, h)
      }
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)

    let u: Record<string, WebGLUniformLocation | null> = {}
    let hasArt = 0
    let hasBg = 0

    const makeTexture = (unit: number) => {
      const tex = gl.createTexture()
      gl.activeTexture(gl.TEXTURE0 + unit)
      gl.bindTexture(gl.TEXTURE_2D, tex)
      // A single transparent pixel until the real image lands, so the first
      // frames sample something valid instead of rendering black.
      gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
        new Uint8Array([0, 0, 0, 0]),
      )
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      if (tex) textures.push(tex)
      return tex
    }

    const load = (src: string | undefined, unit: number, tex: WebGLTexture | null, mark: (v: number) => void) => {
      if (!src || !tex) return
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.decoding = "async"
      img.onload = () => {
        if (disposed) return
        gl.activeTexture(gl.TEXTURE0 + unit)
        gl.bindTexture(gl.TEXTURE_2D, tex)
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
        mark(1)
      }
      // A missing or CORS-blocked image leaves the generated face in place
      // rather than blanking the card.
      img.src = src
    }

    const frame = () => {
      if (disposed) return
      const t = tuning.current
      const goalX = target.current.active ? target.current.ax : 0
      const goalY = target.current.active ? target.current.ay : 0
      const now = (performance.now() - started) / 1000

      let driftX = 0
      let driftY = 0
      if (t.idle && !t.reduced && !target.current.active) {
        // A slow figure-of-eight, so a card nobody is touching still catches
        // the light. Two frequencies that share no multiple, or it visibly loops.
        driftX = Math.sin(now * 0.41) * t.tilt * 0.34
        driftY = Math.cos(now * 0.27) * t.tilt * 0.46
      }

      // Critically-damped-ish chase. Snapping to the pointer feels like a
      // texture; easing to it feels like an object with mass.
      const k = t.reduced ? 1 : 0.12
      ax += (goalX + driftX - ax) * k
      ay += (goalY + driftY - ay) * k

      const view = viewFromTilt(ax, ay)

      gl.useProgram(program)
      gl.bindVertexArray(vao)
      gl.uniform2f(u.uRes, canvas.width, canvas.height)
      gl.uniform3f(u.uView, view[0], view[1], view[2])
      gl.uniform1f(u.uTime, t.reduced ? 0 : now)
      gl.uniform1f(u.uFoil, t.foil)
      gl.uniform1f(u.uFinish, FINISH_ID[t.finish] ?? 0)
      gl.uniform1f(u.uDepth, t.depth)
      gl.uniform1f(u.uBgDepth, t.bgDepth)
      gl.uniform1f(u.uHasArt, hasArt)
      gl.uniform1f(u.uHasBg, hasBg)
      gl.uniform1f(u.uPattern, t.pattern)
      gl.uniform1i(u.tArt, 0)
      gl.uniform1i(u.tBg, 1)
      gl.drawArrays(gl.TRIANGLES, 0, 3)

      // Quantised, so the DOM is not re-rendered for a hundredth of a degree.
      const qx = Math.round(ax * 10) / 10
      const qy = Math.round(ay * 10) / 10
      setAngles((a) => (a.ax === qx && a.ay === qy ? a : { ax: qx, ay: qy }))

      raf = requestAnimationFrame(frame)
    }

    try {
      const vs = compile(gl, gl.VERTEX_SHADER, VERT)
      const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
      program = gl.createProgram()
      if (!program) throw new Error("no program")
      gl.attachShader(program, vs)
      gl.attachShader(program, fs)
      gl.linkProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error("link: " + gl.getProgramInfoLog(program))
      }
      vao = gl.createVertexArray()
      gl.bindVertexArray(vao)

      for (const key of [
        "uRes", "uView", "uTime", "uFoil", "uFinish",
        "uDepth", "uBgDepth", "uHasArt", "uHasBg", "uPattern", "tArt", "tBg",
      ]) {
        u[key] = gl.getUniformLocation(program, key)
      }

      const artTex = makeTexture(0)
      const bgTex = makeTexture(1)
      load(art, 0, artTex, (v) => (hasArt = v))
      load(background, 1, bgTex, (v) => (hasBg = v))

      resize()
      raf = requestAnimationFrame(frame)
    } catch {
      if (!disposed) setFailed(true)
    }

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      observer.disconnect()
      canvas.removeEventListener("webglcontextlost", onLost)
      canvas.removeEventListener("webglcontextrestored", onRestored)
      for (const tex of textures) gl.deleteTexture(tex)
      if (vao) gl.deleteVertexArray(vao)
      if (program) gl.deleteProgram(program)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generation, art, background])

  const onPointerMove = (e: React.PointerEvent) => {
    const el = rootRef.current
    if (!el) return
    // Relative to the card's own box, so it behaves the same wherever it sits.
    const r = el.getBoundingClientRect()
    const { ax, ay } = tiltFromPointer(
      (e.clientX - r.left) / Math.max(r.width, 1),
      (e.clientY - r.top) / Math.max(r.height, 1),
      tuning.current.tilt,
    )
    target.current = { ax, ay, active: true }
  }
  const release = () => {
    target.current = { ax: 0, ay: 0, active: false }
  }

  const label = flippable ? (flipped ? "Show the front of " : "Show the back of ") + name : undefined

  return (
    <div
      className={"relative select-none " + className}
      style={{ width, perspective: "1100px" }}
    >
      <div
        ref={rootRef}
        role={flippable ? "button" : undefined}
        tabIndex={flippable ? 0 : undefined}
        aria-label={label}
        aria-pressed={flippable ? flipped : undefined}
        className="relative w-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
        style={{
          aspectRatio: "5 / 7",
          transformStyle: "preserve-3d",
          // The shader and the geometry read the same two angles.
          transform:
            "rotateX(" + angles.ax + "deg) rotateY(" + (angles.ay + (flipped ? 180 : 0)) + "deg)",
          transition: flipped !== undefined ? "transform 120ms linear" : undefined,
          borderRadius: "5%",
        }}
        onPointerMove={onPointerMove}
        onPointerLeave={release}
        onPointerCancel={release}
        onClick={() => flippable && setFlipped((f) => !f)}
        onKeyDown={(e) => {
          if (!flippable) return
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            setFlipped((f) => !f)
          }
        }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            // The print sizes off the card, not the viewport, so a 200px card
            // and a 400px card are the same design at two sizes.
            containerType: "inline-size",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            borderRadius: "5%",
            boxShadow:
              "0 24px 60px -20px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.14) inset",
          }}
        >
          {failed ? (
            <div
              className="h-full w-full"
              style={{
                background:
                  "conic-gradient(from 210deg, #4b2a6b, #2b5f7a, #6b2a4f, #7a6a2b, #4b2a6b)",
              }}
            />
          ) : (
            <canvas ref={canvasRef} className="block h-full w-full" aria-hidden="true" />
          )}

          {/* Foil is busy by nature, so the ink gets its own ground. Without
              these the subtitle is unreadable wherever a bright band lands. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[28%]"
            style={{ background: "linear-gradient(to bottom, rgba(4,2,10,0.72), transparent)" }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[22%]"
            style={{ background: "linear-gradient(to top, rgba(4,2,10,0.72), transparent)" }}
          />
          {/* The inner rule, so it reads as something printed and trimmed. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-[3.5%] rounded-[3.5%]"
            style={{ border: "1px solid rgba(255,255,255,0.22)" }}
          />

          {/* Print. Real text, over the foil — on a genuine card the ink is not
              laminated either, and it keeps the type crisp and selectable. */}
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-[7%]">
            <div>
              <p
                className="m-0 font-semibold leading-tight text-white"
                style={{ fontSize: "min(6cqw, 1.35rem)", textShadow: "0 2px 10px rgba(0,0,0,0.6)" }}
              >
                {name}
              </p>
              {subtitle && (
                <p
                  className="m-0 mt-1 font-mono uppercase text-white/70"
                  style={{ fontSize: "min(3cqw, 0.62rem)", letterSpacing: "0.2em" }}
                >
                  {subtitle}
                </p>
              )}
            </div>
            <div className="flex items-end justify-between gap-2">
              <span
                className="font-mono text-white/70"
                style={{ fontSize: "min(3cqw, 0.6rem)", letterSpacing: "0.16em" }}
              >
                {number}
              </span>
              {rarity && (
                <span
                  className="rounded-full border border-white/30 bg-black/30 px-2 py-0.5 font-mono uppercase text-white backdrop-blur-sm"
                  style={{ fontSize: "min(2.8cqw, 0.56rem)", letterSpacing: "0.18em" }}
                >
                  {rarity}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            borderRadius: "5%",
            background:
              "radial-gradient(120% 90% at 50% 20%, #2a1745 0%, #150c24 55%, #090511 100%)",
            boxShadow:
              "0 24px 60px -20px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.12) inset",
          }}
        >
          {back ?? (
            <div className="flex h-full w-full items-center justify-center p-[10%] text-center">
              <div
                className="h-full w-full rounded-[4%] border border-white/15"
                style={{
                  background:
                    "repeating-conic-gradient(from 0deg at 50% 50%, rgba(255,255,255,0.055) 0deg 6deg, transparent 6deg 12deg)",
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
