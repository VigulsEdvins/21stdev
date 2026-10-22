"use client"

import * as React from "react"

/**
 * Sunlit Cutting Mat — a green self-healing mat on a desk by a window.
 *
 * The mat itself (grid, ruler ticks, numbers, the 45° guide) is drawn once per
 * resize with the 2D canvas API, into an offscreen canvas, and uploaded as a
 * texture. That keeps the lines and figures crisp at any DPR. Sunlight is the
 * shader's job: the sun gets in through a slatted blind and past foliage
 * outside, so what lands on the mat is straight, soft-edged bands broken up by
 * blurred leaf shadows, swaying slowly. The bands never ripple — the light is
 * blocked, not refracted.
 *
 * Self-contained: raw WebGL2, React is the only import. Where WebGL2 is
 * missing it paints a flat CSS grid rather than an empty box.
 */

export interface SunlitCuttingMatProps {
  /** Content centred on the mat — a headline, a CTA. */
  children?: React.ReactNode
  /** Mat colour, #rrggbb. */
  color?: string
  /** Colour of the sunlight, #rrggbb. */
  sunColor?: string
  /** Sunlight strength. 0 is an overcast day, 1.6 is harsh noon. */
  intensity?: number
  /** Animation speed multiplier. 0 freezes the light. */
  speed?: number
  /** One grid square, in CSS px. The grid is stretched slightly to fit whole squares. */
  unit?: number
  /** Root height. A definite length — never a percentage. */
  height?: string
  /** Extra root class names. */
  className?: string
}

// #region grid
/** How many whole squares fit `span` px at roughly `unit` px each, and their exact size. */
export function fitGrid(span: number, unit: number) {
  const count = Math.max(1, Math.round(span / Math.max(4, unit)))
  return { count, step: span / count }
}

/** Label every square when there is room for two digits, else thin them out. */
export function labelEvery(step: number) {
  return step >= 22 ? 1 : step >= 11 ? 2 : 5
}

/** Width of the ruler border, in CSS px. */
export function borderFor(unit: number) {
  return Math.min(30, Math.max(16, Math.round(unit * 0.72)))
}

/** #rrggbb or #rgb to three linear-light 0..1 floats. Falls back to black. */
export function hexToLinear(hex: string) {
  let h = hex.trim().replace("#", "")
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return [0, 0, 0]
  return [0, 2, 4].map((i) => Math.pow(parseInt(h.slice(i, i + 2), 16) / 255, 2.2))
}
// #endregion

/**
 * Paints the mat's ink into `ctx`. Red channel = white ink coverage, green =
 * the darker ruler border. Drawn additively on black so the two never clobber
 * each other, and the shader picks the actual colours.
 */
function drawMat(ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number, unit: number) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.globalCompositeOperation = "source-over"
  ctx.globalAlpha = 1
  ctx.fillStyle = "#000"
  ctx.fillRect(0, 0, w, h)
  ctx.globalCompositeOperation = "lighter"

  const b = borderFor(unit)
  const iw = w - 2 * b
  const ih = h - 2 * b
  if (iw <= 0 || ih <= 0) return

  ctx.fillStyle = "#0f0"
  ctx.fillRect(0, 0, w, b)
  ctx.fillRect(0, h - b, w, b)
  ctx.fillRect(0, b, b, ih)
  ctx.fillRect(w - b, b, b, ih)

  const gx = fitGrid(iw, unit)
  const gy = fitGrid(ih, unit)
  const X = (i: number) => b + i * gx.step
  const Y = (j: number) => h - b - j * gy.step // origin bottom-left, like a real mat
  const snap = (v: number, lw: number) => (Math.round(v * dpr) + (lw * dpr) % 2 / 2) / dpr

  ctx.strokeStyle = "#f00"
  ctx.fillStyle = "#f00"
  const line = (x0: number, y0: number, x1: number, y1: number) => {
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.stroke()
  }

  // fine grid, then the bold every-five grid over it
  for (const major of [false, true]) {
    ctx.lineWidth = major ? 2 : 1
    ctx.globalAlpha = major ? 0.92 : 0.2
    for (let i = 0; i <= gx.count; i++) {
      if ((i % 5 === 0 || i === gx.count) !== major) continue
      const x = snap(X(i), ctx.lineWidth)
      line(x, b, x, h - b)
    }
    for (let j = 0; j <= gy.count; j++) {
      if ((j % 5 === 0 || j === gy.count) !== major) continue
      const y = snap(Y(j), ctx.lineWidth)
      line(b, y, w - b, y)
    }
  }

  // the 45° cutting guide from the origin
  ctx.save()
  ctx.beginPath()
  ctx.rect(b, b, iw, ih)
  ctx.clip()
  ctx.lineWidth = 1.25
  ctx.globalAlpha = 0.85
  const n = Math.max(gx.count, gy.count)
  line(X(0), Y(0), X(n), Y(n))
  ctx.restore()

  // ruler ticks along the inner edge of the border, figures in the border
  const every = labelEvery(Math.min(gx.step, gy.step))
  ctx.lineWidth = 1
  ctx.font = "500 " + Math.round(b * 0.36) + "px ui-sans-serif, system-ui, sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  const mid = b * 0.42
  for (let i = 0; i <= gx.count; i++) {
    const x = snap(X(i), 1)
    const len = b * (i % 5 === 0 ? 0.36 : 0.2)
    ctx.globalAlpha = 0.9
    line(x, b, x, b - len)
    line(x, h - b, x, h - b + len)
    if (i % every === 0) {
      ctx.globalAlpha = 0.8
      ctx.fillText(String(i), X(i), mid)
      ctx.fillText(String(i), X(i), h - mid)
    }
  }
  for (let j = 0; j <= gy.count; j++) {
    const y = snap(Y(j), 1)
    const len = b * (j % 5 === 0 ? 0.36 : 0.2)
    ctx.globalAlpha = 0.9
    line(b, y, b - len, y)
    line(w - b, y, w - b + len, y)
    if (j % every === 0) {
      ctx.globalAlpha = 0.8
      ctx.fillText(String(j), mid, Y(j))
      ctx.fillText(String(j), w - mid, Y(j))
    }
  }
  ctx.globalAlpha = 1
}

const VERTEX_SRC = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

const FRAGMENT_SRC = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;

uniform sampler2D uInk;
uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uMat;
uniform vec3 uSun;
uniform float uIntensity;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}

float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return s / 0.9375;
}

// How much sun reaches this point of the desk, 0..1.
float sunlight(vec2 p, float t) {
  // The blind hangs still but the sun direction breathes a little as the
  // blind drifts in a draught — rotation and slide, never a warp.
  float a = -0.72 + 0.03 * sin(t * 0.19) + 0.015 * sin(t * 0.47 + 1.3);
  vec2 dir = vec2(cos(a), sin(a));
  vec2 nrm = vec2(-dir.y, dir.x);
  float along = dot(p, dir);
  float across = dot(p, nrm);

  // Slats. Penumbra widens where the shadow falls further from the blind,
  // so the band edges soften unevenly along their length.
  // A second, slower term makes the slats uneven, like a blind that hangs
  // a little crooked, so the bands never read as a stripe pattern.
  float pen = 0.55 + 0.45 * noise(vec2(along * 0.9 + 4.0, t * 0.03));
  float s = across * 3.1 + 0.25 * sin(t * 0.11) + t * 0.012;
  float band = sin(6.2831853 * s) + 0.45 * sin(6.2831853 * s * 0.43 + 1.7);
  float slats = smoothstep(-pen, pen, band + 0.15);

  // Foliage outside the window: large, far away, so its shadow is blurry.
  // It drifts with a gusting wind and slowly changes shape.
  vec2 wind = vec2(t * 0.03 + 0.05 * sin(t * 0.37), 0.04 * sin(t * 0.23) + 0.02 * sin(t * 0.83));
  float f = fbm(p * 1.6 + wind) * 0.7 + fbm(p * 2.8 - wind * 1.4 + 9.0) * 0.3;
  float leaves = mix(0.3, 1.0, smoothstep(0.36, 0.6, f));

  // The window only throws a pool of light: brighter toward the top-left,
  // falling off toward the far corner.
  float pool = 0.45 + 0.55 * smoothstep(-1.1, 0.7, dot(p, vec2(-0.55, 0.83)) + 0.12 * sin(t * 0.05));

  return slats * leaves * pool;
}

void main() {
  vec2 frag = vUv * uResolution;
  float m = min(uResolution.x, uResolution.y);
  vec2 p = (frag - 0.5 * uResolution) / m;
  float t = uTime;

  vec2 texel = 1.0 / uResolution;
  vec4 ink = texture(uInk, vUv);
  // a hair of bloom around the white lines, the way printed ink glows in sun
  float glow = 0.25 * (texture(uInk, vUv + vec2(2.0, 0.0) * texel).r
                     + texture(uInk, vUv - vec2(2.0, 0.0) * texel).r
                     + texture(uInk, vUv + vec2(0.0, 2.0) * texel).r
                     + texture(uInk, vUv - vec2(0.0, 2.0) * texel).r);

  // vinyl: fine grain plus soft mottling from years of blade marks
  float grain = hash(floor(frag)) - 0.5;
  float mottle = fbm(p * 5.0 + 3.1) - 0.5;
  vec3 mat = uMat * (1.0 + grain * 0.06 + mottle * 0.14);
  mat *= mix(1.0, 0.6, ink.g);
  vec3 albedo = mat;

  float L = sunlight(p, t) * uIntensity;

  // cool skylight fills the shadows; warm sun lands in the gaps
  vec3 sky = vec3(0.5, 0.66, 0.74);
  vec3 col = albedo * (sky * 0.95 + uSun * L * 1.3);
  // the vinyl is slightly translucent: lit patches glow a richer, yellower green
  col += uMat * uSun * vec3(0.9, 1.15, 0.6) * L * 0.55;
  // printed ink stays near-white in shade, and blooms a touch in sun
  col = mix(col, vec3(0.78, 0.85, 0.82) + uSun * L * 0.5, ink.r * 0.92);
  col += vec3(0.8) * glow * (0.05 + 0.12 * L);

  // filmic-ish rolloff, vignette, back to sRGB, dither against banding
  col = 1.0 - exp(-col * 1.2);
  vec2 v = vUv - 0.5;
  col *= 1.0 - 0.35 * dot(v, v);
  col = pow(col, vec3(1.0 / 2.2));
  col += (hash(frag + fract(t) * 91.7) - 0.5) / 255.0;
  outColor = vec4(col, 1.0);
}`

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false)
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduced(mq.matches)
    const h = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener("change", h)
    return () => mq.removeEventListener("change", h)
  }, [])
  return reduced
}

export default function SunlitCuttingMat({
  children,
  color = "#0c7f55",
  sunColor = "#fff0cf",
  intensity = 1,
  speed = 1,
  unit = 32,
  height = "100svh",
  className = "",
}: SunlitCuttingMatProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const reduced = usePrefersReducedMotion()
  const [failed, setFailed] = React.useState(false)
  // bumped when a lost context comes back, to rebuild everything from scratch
  const [generation, setGeneration] = React.useState(0)

  // Read by the render loop, so prop changes never tear down the GL program.
  const cfg = React.useRef({ color, sunColor, intensity, speed, unit })
  cfg.current = { color, sunColor, intensity, speed, unit }
  // redraw the ink texture when the grid size changes
  const unitRef = React.useRef(unit)

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false })
    const ink2d = document.createElement("canvas")
    const ctx = ink2d.getContext("2d")
    if (!gl || !ctx) {
      setFailed(true)
      return
    }

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return s
    }
    const vs = compile(gl.VERTEX_SHADER, VERTEX_SRC)
    const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT_SRC)
    const program = gl.createProgram()!
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      if (!gl.isContextLost()) setFailed(true)
      gl.deleteProgram(program)
      return
    }
    gl.useProgram(program)

    const vao = gl.createVertexArray()
    const buffer = gl.createBuffer()
    gl.bindVertexArray(vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(program, "aPos")
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)

    const u = (name: string) => gl.getUniformLocation(program, name)
    const uInk = u("uInk")
    const uResolution = u("uResolution")
    const uTime = u("uTime")
    const uMat = u("uMat")
    const uSun = u("uSun")
    const uIntensity = u("uIntensity")
    gl.uniform1i(uInk, 0)

    let dirty = true
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.max(1, canvas.clientWidth)
      const h = Math.max(1, canvas.clientHeight)
      canvas.width = ink2d.width = Math.round(w * dpr)
      canvas.height = ink2d.height = Math.round(h * dpr)
      drawMat(ctx, w, h, dpr, cfg.current.unit)
      unitRef.current = cfg.current.unit
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, ink2d)
      gl.viewport(0, 0, canvas.width, canvas.height)
      dirty = false
    }

    const render = (time: number) => {
      if (dirty || unitRef.current !== cfg.current.unit) resize()
      const c = cfg.current
      gl.uniform2f(uResolution, canvas.width, canvas.height)
      gl.uniform1f(uTime, time)
      gl.uniform3fv(uMat, hexToLinear(c.color))
      gl.uniform3fv(uSun, hexToLinear(c.sunColor))
      gl.uniform1f(uIntensity, c.intensity)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    // Start mid-afternoon rather than at t=0, so the first frame (and any
    // still capture) already has the light in a characterful place.
    const T0 = 40
    let raf = 0
    let sim = T0
    let last = performance.now()
    const frame = (now: number) => {
      // a backgrounded tab must not jump the light forward when it returns
      sim += Math.min(0.1, (now - last) / 1000) * cfg.current.speed
      last = now
      render(sim)
      raf = requestAnimationFrame(frame)
    }

    const observer = new ResizeObserver(() => {
      dirty = true
      if (reduced) render(T0)
    })
    observer.observe(canvas)

    // Reduced motion: one still frame of dappled light, no animation.
    if (reduced) render(T0)
    else raf = requestAnimationFrame(frame)

    const onLost = (e: Event) => {
      e.preventDefault()
      cancelAnimationFrame(raf)
    }
    const onRestored = () => setGeneration((g) => g + 1)
    canvas.addEventListener("webglcontextlost", onLost)
    canvas.addEventListener("webglcontextrestored", onRestored)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      canvas.removeEventListener("webglcontextlost", onLost)
      canvas.removeEventListener("webglcontextrestored", onRestored)
      gl.deleteTexture(texture)
      gl.deleteBuffer(buffer)
      gl.deleteVertexArray(vao)
      gl.deleteProgram(program)
    }
  }, [reduced, generation])

  const b = borderFor(unit)
  return (
    <section
      className={"relative w-full overflow-hidden " + className}
      style={{
        height,
        backgroundColor: color,
        // no-WebGL fallback: a flat mat with the bold grid, still recognisable
        backgroundImage: failed
          ? "linear-gradient(rgba(255,255,255,0.7) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.7) 2px, transparent 2px)"
          : undefined,
        backgroundSize: failed ? unit * 5 + "px " + unit * 5 + "px" : undefined,
        backgroundPosition: b + "px " + b + "px",
      }}
    >
      {!failed && (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            maxWidth: "none",
            display: "block",
          }}
        />
      )}
      {children != null && (
        <div className="absolute inset-0 flex items-center justify-center p-8 text-center">
          {children}
        </div>
      )}
    </section>
  )
}
