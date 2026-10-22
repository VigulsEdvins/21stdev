"use client"

import * as React from "react"

export interface NoiseDissolveRevealProps {
  /** Content sitting under the veil, revealed as it tears away */
  children?: React.ReactNode
  /** Veil colour. The sheet that tears. */
  veilColor?: string
  /** How long the tear itself takes, in ms */
  durationMs?: number
  /** Hold before the tear begins, in ms */
  delayMs?: number
  /**
   * Tear open, hold, seal back, repeat. For showcases. `onReveal` still fires
   * on the first open. Leave it off to use this as a real page gate.
   */
  loop?: boolean
  /** Hold at each end of a loop cycle, in ms */
  holdMs?: number
  /**
   * Blob size. Higher means smaller, more numerous islands; lower means
   * fewer, broader tears. Roughly 1.5 to 8.
   */
  noiseScale?: number
  /** Edge feather. 0 is a hard paper tear, 0.2 is an ink bleed. */
  softness?: number
  /**
   * How much earlier the middle opens than the corners. 0 tears everywhere at
   * once; 1 opens from the centre outward.
   */
  centerBias?: number
  /** Root height. A definite length - never a percentage. */
  height?: string
  /** Fired once, when the veil has finished tearing away */
  onReveal?: () => void
  /** Extra root class names */
  className?: string
}

// #region progress
/**
 * The tear is driven by a threshold sweeping across a static noise field, so
 * the easing here is what gives it its character: a slow nucleation while the
 * first holes open, then a rush as they merge.
 */
export function tearEase(t: number): number {
  const p = Math.min(1, Math.max(0, t))
  // cubic in-out, biased so the back half runs away from the front half
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 2.4) / 2
}

/** Where one loop cycle sits: opening, open, sealing, or sealed. */
export function loopPhase(
  elapsed: number,
  duration: number,
  hold: number,
): { progress: number; stage: "opening" | "open" | "sealing" | "sealed" } {
  const cycle = duration * 2 + hold * 2
  const t = ((elapsed % cycle) + cycle) % cycle
  if (t < duration) return { progress: tearEase(t / duration), stage: "opening" }
  if (t < duration + hold) return { progress: 1, stage: "open" }
  if (t < duration * 2 + hold)
    return { progress: 1 - tearEase((t - duration - hold) / duration), stage: "sealing" }
  return { progress: 0, stage: "sealed" }
}

/** #rrggbb or #rgb to three 0..1 floats. Falls back to black. */
export function parseHex(hex: string): [number, number, number] {
  let h = hex.trim().replace("#", "")
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return [0, 0, 0]
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ]
}
// #endregion

const VERTEX_SRC = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = (a_position + 1.0) * 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`

const FRAGMENT_SRC = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;

uniform vec2 u_resolution;
uniform vec3 u_color;
uniform float u_progress;
uniform float u_scale;
uniform float u_soft;
uniform float u_bias;
uniform float u_seed;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21) + u_seed);
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// value noise with a smooth interpolant, so the islands have soft shoulders
// and the threshold cuts them into ragged edges rather than clean circles
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y);
}

// fractal brownian motion: the high octaves are what make the tear look torn
// instead of blobby
float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  float norm = 0.0;
  for (int i = 0; i < 5; i++) {
    sum += amp * noise(p);
    norm += amp;
    p *= 2.03;
    amp *= 0.5;
  }
  return sum / norm;
}

void main() {
  // aspect-correct, so blobs stay round on any viewport
  float m = min(u_resolution.x, u_resolution.y);
  vec2 p = (v_uv * u_resolution) / m;

  // fbm clusters around 0.5, which makes the threshold sweep through the bulk
  // all at once and reads as fog. Stretching the mid-range apart gives the cut
  // defined islands with fibrous edges instead.
  float n = fbm(p * u_scale);
  n = smoothstep(0.28, 0.72, n);

  // distance from centre, 0 at the middle and 1 at the corners
  vec2 d2 = (v_uv - 0.5) * vec2(max(u_resolution.x / max(u_resolution.y, 1.0), 1.0),
                                max(u_resolution.y / max(u_resolution.x, 1.0), 1.0));
  float d = clamp(length(d2) * 1.41421, 0.0, 1.0);

  // sweep the threshold past both ends, so the veil is solid at 0 and gone at 1
  float t = mix(-u_soft - 0.02, 1.0 + u_soft + 0.02, u_progress);
  float thr = t * (1.0 + u_bias) - u_bias * d;

  // opaque where the noise still sits above the threshold
  float alpha = smoothstep(thr - u_soft, thr + u_soft, n);

  fragColor = vec4(u_color, clamp(alpha, 0.0, 1.0));
}`

// Scoped to .ndr-root, so installing this never restyles the host app.
// No interpolation in here - dynamic values arrive as CSS custom properties.
const NDR_CSS = `
.ndr-root, .ndr-root * { box-sizing: border-box; }
.ndr-root { position: relative; width: 100%; overflow: hidden; }

.ndr-content { position: absolute; inset: 0; width: 100%; height: 100%; }

/* Tailwind Preflight sets height:auto and max-width:100% on canvas, which
   collapses it to nothing inside an absolutely-positioned parent. */
.ndr-root canvas {
  position: absolute; inset: 0; width: 100%; height: 100%;
  max-width: none; display: block; pointer-events: none; z-index: 10;
}

/* Fallback veil for browsers without WebGL2, and for reduced motion. */
.ndr-veil {
  position: absolute; inset: 0; z-index: 10;
  background: var(--ndr-color); pointer-events: none;
  transition: opacity 0.4s ease;
}
.ndr-veil[data-gone="true"] { opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .ndr-veil { transition: none; }
}
`

export default function NoiseDissolveReveal({
  children,
  veilColor = "#000000",
  durationMs = 1100,
  delayMs = 600,
  loop = false,
  holdMs = 900,
  noiseScale = 7.0,
  softness = 0.015,
  centerBias = 0.16,
  height = "100svh",
  onReveal,
  className = "",
}: NoiseDissolveRevealProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const [reducedMotion, setReducedMotion] = React.useState(false)
  // Only true once the GL program is live. Until then the CSS veil covers the
  // content, so a browser without WebGL2 never flashes the page underneath.
  const [glReady, setGlReady] = React.useState(false)

  // Held in refs so the render loop reads current values without tearing down
  // and rebuilding the GL program on every prop change.
  const onRevealRef = React.useRef(onReveal)
  onRevealRef.current = onReveal
  const cfg = React.useRef({ veilColor, durationMs, delayMs, loop, holdMs, noiseScale, softness, centerBias })
  cfg.current = { veilColor, durationMs, delayMs, loop, holdMs, noiseScale, softness, centerBias }

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReducedMotion(mq.matches)
    const h = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener("change", h)
    return () => mq.removeEventListener("change", h)
  }, [])

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || reducedMotion) return

    const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: false, antialias: true })
    if (!gl) return

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)
      if (!s) return null
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        gl.deleteShader(s)
        return null
      }
      return s
    }

    const vs = compile(gl.VERTEX_SHADER, VERTEX_SRC)
    const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT_SRC)
    const prog = gl.createProgram()
    if (!vs || !fs || !prog) return
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return
    setGlReady(true)

    const posAttr = gl.getAttribLocation(prog, "a_position")
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    )

    const u = (n: string) => gl.getUniformLocation(prog, n)
    const loc = {
      res: u("u_resolution"),
      color: u("u_color"),
      progress: u("u_progress"),
      scale: u("u_scale"),
      soft: u("u_soft"),
      bias: u("u_bias"),
      seed: u("u_seed"),
    }

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr))
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    const seed = Math.random() * 100
    const start = Date.now()
    let raf = 0
    let destroyed = false
    let fired = false

    const render = () => {
      if (destroyed) return
      const c = cfg.current
      const elapsed = Date.now() - start - c.delayMs

      let progress: number
      if (elapsed <= 0) {
        progress = 0
      } else if (c.loop) {
        progress = loopPhase(elapsed, c.durationMs, c.holdMs).progress
      } else {
        progress = tearEase(elapsed / Math.max(c.durationMs, 1))
      }

      if (!fired && progress >= 1) {
        fired = true
        onRevealRef.current?.()
      }

      const [r, g, bl] = parseHex(c.veilColor)
      gl.useProgram(prog)
      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.enableVertexAttribArray(posAttr)
      gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0)

      gl.uniform2f(loc.res, canvas.width, canvas.height)
      gl.uniform3f(loc.color, r, g, bl)
      gl.uniform1f(loc.progress, progress)
      gl.uniform1f(loc.scale, c.noiseScale)
      gl.uniform1f(loc.soft, Math.max(c.softness, 0.001))
      gl.uniform1f(loc.bias, c.centerBias)
      gl.uniform1f(loc.seed, seed)

      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, 6)

      // Once torn and not looping there is nothing left to draw.
      if (!c.loop && progress >= 1) return
      raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)

    return () => {
      destroyed = true
      setGlReady(false)
      cancelAnimationFrame(raf)
      ro.disconnect()
      gl.deleteProgram(prog)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      gl.deleteBuffer(buf)
    }
  }, [reducedMotion])

  // Reduced motion: no tear, just uncover the content once.
  const [rmDone, setRmDone] = React.useState(false)
  React.useEffect(() => {
    if (!reducedMotion) return
    const id = setTimeout(() => {
      setRmDone(true)
      onRevealRef.current?.()
    }, 200)
    return () => clearTimeout(id)
  }, [reducedMotion])

  return (
    <div
      className={"ndr-root " + className}
      style={{ height, ["--ndr-color" as string]: veilColor }}
    >
      <style>{NDR_CSS}</style>

      <div className="ndr-content">{children}</div>

      {!reducedMotion && <canvas ref={canvasRef} aria-hidden="true" />}

      {/* Covers the content until the shader is live, and stands in for it
          entirely when WebGL2 is unavailable or motion is reduced. */}
      {!glReady && <div className="ndr-veil" data-gone={reducedMotion && rmDone} aria-hidden="true" />}
    </div>
  )
}
