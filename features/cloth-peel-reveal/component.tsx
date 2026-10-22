"use client"

import * as React from "react"

export interface ClothPeelRevealProps {
  /** Content underneath, revealed as the sheet is pulled away */
  children?: React.ReactNode
  /** The sheet's colour */
  sheetColor?: string
  /** Optional word drawn onto the sheet, so the type folds with the cloth. Newlines split lines. */
  sheetText?: string
  /** Colour of `sheetText` */
  textColor?: string
  /** How long the peel takes, in ms */
  durationMs?: number
  /** Hold before the peel begins, in ms */
  delayMs?: number
  /** Peel off, hold, drop back, repeat. For showcases. */
  loop?: boolean
  /** Hold at each end of a loop cycle, in ms */
  holdMs?: number
  /** Direction the sheet is dragged, in degrees. 180 is left, 270 is down. */
  angleDeg?: number
  /** Depth of the folds. 0 is a flat sheet, 0.4 is heavy crumple. */
  foldAmplitude?: number
  /** How many folds run across the sheet */
  foldFrequency?: number
  /** How ragged the sheet's trailing edge is as it lifts */
  edgeRoughness?: number
  /** How far the sheet swings out of the screen plane. 0 stays flat; 1.2 is a hard turn. */
  tilt?: number
  /** Root height. A definite length - never a percentage. */
  height?: string
  /** Fired once, when the sheet is fully gone */
  onReveal?: () => void
  /** Extra root class names */
  className?: string
}

// #region progress
/** Slow to release, then the sheet is away. */
export function peelEase(t: number): number {
  const p = Math.min(1, Math.max(0, t))
  return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2.2) / 2
}

/** Where one loop cycle sits. */
export function loopPhase(
  elapsed: number,
  duration: number,
  hold: number,
): { progress: number; stage: "peeling" | "gone" | "returning" | "settled" } {
  const cycle = duration * 2 + hold * 2
  const t = ((elapsed % cycle) + cycle) % cycle
  if (t < duration) return { progress: peelEase(t / duration), stage: "peeling" }
  if (t < duration + hold) return { progress: 1, stage: "gone" }
  if (t < duration * 2 + hold)
    return { progress: 1 - peelEase((t - duration - hold) / duration), stage: "returning" }
  return { progress: 0, stage: "settled" }
}

/** #rrggbb or #rgb to three 0..1 floats. Falls back to black. */
export function parseHex(hex: string): [number, number, number] {
  let h = String(hex).trim().replace("#", "")
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return [0, 0, 0]
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ]
}

/**
 * A cols x rows quad grid over the unit square. The sheet needs real geometry,
 * because the folds are per-vertex displacement, not a screen-space trick.
 */
export function buildGrid(cols: number, rows: number) {
  const uvs = new Float32Array((cols + 1) * (rows + 1) * 2)
  let k = 0
  for (let y = 0; y <= rows; y++) {
    for (let x = 0; x <= cols; x++) {
      uvs[k++] = x / cols
      uvs[k++] = y / rows
    }
  }
  const indices = new Uint16Array(cols * rows * 6)
  let i = 0
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const a = y * (cols + 1) + x
      const b = a + 1
      const c = a + (cols + 1)
      const d = c + 1
      indices[i++] = a
      indices[i++] = c
      indices[i++] = b
      indices[i++] = b
      indices[i++] = c
      indices[i++] = d
    }
  }
  return { uvs, indices, vertexCount: (cols + 1) * (rows + 1), indexCount: indices.length }
}
// #endregion

const VERTEX_SRC = `#version 300 es
in vec2 a_uv;

uniform float u_progress;
uniform vec2 u_dir;
uniform float u_amp;
uniform float u_freq;
uniform float u_tilt;

out vec2 v_uv;
out float v_shade;
out float v_wave;

float hash(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 34.5);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
  v_uv = a_uv;

  // 1.3x oversized, so the torn edge starts off screen
  vec3 P = vec3((a_uv - 0.5) * 2.6, 0.0);

  float along  = dot(a_uv - 0.5, u_dir);
  float across = dot(a_uv - 0.5, vec2(-u_dir.y, u_dir.x));

  // slack builds as the sheet lets go; the trailing half crumples hardest
  float slack = smoothstep(0.0, 0.4, u_progress) * (0.4 + 0.6 * smoothstep(-0.5, 0.5, -along));

  // Evenly spaced sines read as corrugated metal. Warping the phase with
  // noise varies the fold spacing, which is what makes cloth look like cloth.
  float warp = noise(a_uv * 2.4) * 2.6;
  float ph = along * u_freq * 6.2831853 + warp - u_progress * 6.0;
  float w = sin(ph) * 0.55
          + sin(ph * 2.17 + 1.3) * 0.28
          + sin(across * u_freq * 2.6 + warp * 1.7) * 0.3
          + (noise(a_uv * 7.0) - 0.5) * 0.5;
  w *= u_amp * slack;
  P.z = w;
  v_wave = w;

  // droop, strongest where the cloth has already let go
  P.y -= slack * 0.55 * (0.45 + 0.55 * smoothstep(-0.6, 0.6, across));

  // The sheet swings out of the screen plane. Without this it stays a flat
  // screen-aligned rectangle; with it the far edge foreshortens and the
  // silhouette curves, which is most of what reads as real cloth.
  float yaw = u_progress * u_tilt;
  float cy = cos(yaw), sy = sin(yaw);
  P = vec3(P.x * cy + P.z * sy, P.y, -P.x * sy + P.z * cy);

  float roll = -u_progress * 0.18;
  float cr = cos(roll), sr = sin(roll);
  P = vec3(P.x * cr - P.y * sr, P.x * sr + P.y * cr, P.z);

  P.xy += u_dir * u_progress * 2.9;

  // analytic fold slope lights the creases
  float dw = (cos(ph) * 0.55 + 0.608 * cos(ph * 2.17 + 1.3)) * u_freq * 6.2831853 * u_amp * slack;
  vec3 n = normalize(vec3(-dw * 0.16, 0.28, 1.0));
  vec3 L = normalize(vec3(-0.4, 0.45, 0.8));
  // cloth stays bright; creases are soft grey, not black banding
  v_shade = 0.70 + 0.30 * max(dot(n, L), 0.0);

  float camZ = 3.2;
  float wd = max(camZ - P.z, 0.2);
  gl_Position = vec4(P.xy * (camZ / wd), clamp(-P.z * 0.2, -0.99, 0.99), 1.0);
}`

const FRAGMENT_SRC = `#version 300 es
precision highp float;

in vec2 v_uv;
in float v_shade;
in float v_wave;

uniform vec3 u_color;
uniform vec2 u_dir;
uniform float u_edge;
uniform sampler2D u_tex;
uniform int u_hasTex;

out vec4 fragColor;

float hash(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 34.5);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float s = 0.0, a = 0.5, n = 0.0;
  for (int i = 0; i < 4; i++) { s += a * noise(p); n += a; p *= 2.07; a *= 0.5; }
  return s / n;
}

void main() {
  // The sheet carries its own torn edge, cut per fragment so the raggedness
  // is crisp no matter how coarse the mesh is.
  float trail = dot(v_uv - 0.5, -u_dir);
  float rag = (fbm(v_uv * 6.0) - 0.5) * u_edge;
  // The furthest on-screen corner of a 1.3x sheet sits at trail 0.545, so the
  // cut has to clear that plus the ragged swing, or the tear shows at rest.
  if (trail + rag + v_wave * 0.45 > 0.56 + u_edge * 0.5) discard;

  vec3 base = u_color;
  if (u_hasTex == 1) {
    // The sheet is 1.3x oversized so its torn edge starts off screen; the
    // artwork must still land on the viewport, not be blown up across it.
    vec2 tuv = (v_uv - 0.11538) / 0.76923;
    if (tuv.x >= 0.0 && tuv.x <= 1.0 && tuv.y >= 0.0 && tuv.y <= 1.0) {
      vec4 t = texture(u_tex, vec2(tuv.x, 1.0 - tuv.y));
      base = mix(base, t.rgb, t.a);
    }
  }
  fragColor = vec4(base * v_shade, 1.0);
}`

// Scoped to .cpr-root, so installing this never restyles the host app.
// No interpolation in here - dynamic values arrive as CSS custom properties.
const CPR_CSS = `
.cpr-root, .cpr-root * { box-sizing: border-box; }
.cpr-root { position: relative; width: 100%; overflow: hidden; }

.cpr-content { position: absolute; inset: 0; width: 100%; height: 100%; }

/* Tailwind Preflight sets height:auto and max-width:100% on canvas, which
   collapses it to nothing inside an absolutely-positioned parent. */
.cpr-root canvas {
  position: absolute; inset: 0; width: 100%; height: 100%;
  max-width: none; display: block; pointer-events: none; z-index: 10;
}

/* Stands in until the mesh is live, and replaces it entirely when WebGL2 is
   unavailable or motion is reduced. */
.cpr-sheet {
  position: absolute; inset: 0; z-index: 10; pointer-events: none;
  background: var(--cpr-color);
  display: flex; align-items: center; justify-content: center;
  color: var(--cpr-text);
  font-weight: 900; text-transform: uppercase; line-height: 0.9;
  font-size: clamp(3rem, 12vw, 10rem); letter-spacing: -0.03em;
  white-space: pre-line; text-align: center;
  transition: transform 0.6s cubic-bezier(0.7, 0, 0.3, 1), opacity 0.6s ease;
}
.cpr-sheet[data-gone="true"] { transform: translateX(-100%); opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .cpr-sheet { transition: opacity 0.2s linear; }
  .cpr-sheet[data-gone="true"] { transform: none; }
}
`

/** Draws the sheet's word to an offscreen canvas. No network, no font files. */
function makeTextTexture(
  text: string,
  color: string,
  w: number,
  h: number,
): HTMLCanvasElement | null {
  const c = document.createElement("canvas")
  c.width = w
  c.height = h
  const x = c.getContext("2d")
  if (!x) return null
  x.clearRect(0, 0, w, h)
  const lines = text.split("\n")
  // leave a margin, or the longest line runs off both edges of the sheet
  const longest = Math.max(...lines.map((l) => l.length), 1)
  const size = Math.min(h / (lines.length * 1.5), (w * 1.35) / longest)
  x.fillStyle = color
  x.textAlign = "center"
  x.textBaseline = "middle"
  x.font = "900 " + Math.round(size) + "px ui-sans-serif, system-ui, Impact, sans-serif"
  const lh = size * 0.95
  const top = h / 2 - ((lines.length - 1) * lh) / 2
  lines.forEach((l, i) => x.fillText(l.toUpperCase(), w / 2, top + i * lh))
  return c
}

export default function ClothPeelReveal({
  children,
  sheetColor = "#ffffff",
  sheetText,
  textColor = "#111111",
  durationMs = 1500,
  delayMs = 700,
  loop = false,
  holdMs = 900,
  angleDeg = 196,
  tilt = 0.85,
  foldAmplitude = 0.13,
  foldFrequency = 4.2,
  edgeRoughness = 0.09,
  height = "100svh",
  onReveal,
  className = "",
}: ClothPeelRevealProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const [reducedMotion, setReducedMotion] = React.useState(false)
  // Until the mesh is live the CSS sheet covers the content, so a browser
  // without WebGL2 never flashes the page it is meant to be hiding.
  const [glReady, setGlReady] = React.useState(false)
  const [fallbackGone, setFallbackGone] = React.useState(false)

  const onRevealRef = React.useRef(onReveal)
  onRevealRef.current = onReveal
  // Read by the render loop, so changing a knob never rebuilds the GL program.
  const cfg = React.useRef({
    sheetColor, sheetText, textColor, durationMs, delayMs, loop, holdMs,
    angleDeg, foldAmplitude, foldFrequency, edgeRoughness, tilt,
  })
  cfg.current = {
    sheetColor, sheetText, textColor, durationMs, delayMs, loop, holdMs,
    angleDeg, foldAmplitude, foldFrequency, edgeRoughness, tilt,
  }

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

    const gl = canvas.getContext("webgl2", { alpha: true, antialias: true, depth: true })
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

    const grid = buildGrid(120, 80)
    const uvBuf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf)
    gl.bufferData(gl.ARRAY_BUFFER, grid.uvs, gl.STATIC_DRAW)
    const idxBuf = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, grid.indices, gl.STATIC_DRAW)

    const uvAttr = gl.getAttribLocation(prog, "a_uv")
    const u = (n: string) => gl.getUniformLocation(prog, n)
    const loc = {
      progress: u("u_progress"), dir: u("u_dir"), amp: u("u_amp"), freq: u("u_freq"),
      edge: u("u_edge"), tilt: u("u_tilt"), color: u("u_color"),
      tex: u("u_tex"), hasTex: u("u_hasTex"),
    }

    // The sheet's word becomes a texture, so the type folds with the cloth
    let tex: WebGLTexture | null = null
    let hasTex = 0
    if (cfg.current.sheetText) {
      const aspect = canvas.clientWidth / Math.max(canvas.clientHeight, 1)
      const tw = 1024
      const th = Math.max(64, Math.round(1024 / Math.max(aspect, 0.2)))
      const src = makeTextTexture(cfg.current.sheetText, cfg.current.textColor, tw, th)
      if (src) {
        tex = gl.createTexture()
        gl.bindTexture(gl.TEXTURE_2D, tex)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src)
        hasTex = 1
      }
    }

    gl.enable(gl.DEPTH_TEST)
    gl.depthFunc(gl.LEQUAL)

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

    const start = Date.now()
    let raf = 0
    let destroyed = false
    let fired = false

    const render = () => {
      if (destroyed) return
      const c = cfg.current
      const elapsed = Date.now() - start - c.delayMs

      let progress: number
      if (elapsed <= 0) progress = 0
      else if (c.loop) progress = loopPhase(elapsed, c.durationMs, c.holdMs).progress
      else progress = peelEase(elapsed / Math.max(c.durationMs, 1))

      if (!fired && progress >= 1) {
        fired = true
        onRevealRef.current?.()
      }

      const rad = (c.angleDeg * Math.PI) / 180
      const [r, g, bl] = parseHex(c.sheetColor)

      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

      gl.useProgram(prog)
      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf)
      gl.enableVertexAttribArray(uvAttr)
      gl.vertexAttribPointer(uvAttr, 2, gl.FLOAT, false, 0, 0)
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf)

      gl.uniform1f(loc.progress, progress)
      gl.uniform2f(loc.dir, Math.cos(rad), Math.sin(rad))
      gl.uniform1f(loc.amp, c.foldAmplitude)
      gl.uniform1f(loc.freq, c.foldFrequency)
      gl.uniform1f(loc.edge, c.edgeRoughness)
      gl.uniform1f(loc.tilt, c.tilt)
      gl.uniform3f(loc.color, r, g, bl)
      gl.uniform1i(loc.hasTex, hasTex)
      if (tex) {
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, tex)
        gl.uniform1i(loc.tex, 0)
      }

      gl.drawElements(gl.TRIANGLES, grid.indexCount, gl.UNSIGNED_SHORT, 0)

      // Nothing left to draw once the sheet is away and not coming back.
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
      gl.deleteBuffer(uvBuf)
      gl.deleteBuffer(idxBuf)
      if (tex) gl.deleteTexture(tex)
    }
  }, [reducedMotion])

  // Reduced motion: no cloth, just uncover once.
  React.useEffect(() => {
    if (!reducedMotion) return
    const id = setTimeout(() => {
      setFallbackGone(true)
      onRevealRef.current?.()
    }, 250)
    return () => clearTimeout(id)
  }, [reducedMotion])

  return (
    <div
      className={"cpr-root " + className}
      style={{
        height,
        ["--cpr-color" as string]: sheetColor,
        ["--cpr-text" as string]: textColor,
      }}
    >
      <style>{CPR_CSS}</style>

      <div className="cpr-content">{children}</div>

      {!reducedMotion && <canvas ref={canvasRef} aria-hidden="true" />}

      {!glReady && (
        <div className="cpr-sheet" data-gone={fallbackGone} aria-hidden="true">
          {sheetText}
        </div>
      )}
    </div>
  )
}
