"use client"

import * as React from "react"

/*
 * Grid Loupe Shader — a WebGL image that turns into a magnifying mosaic under
 * the pointer. The picture is cut into a grid; every cell near the pointer
 * shows its own patch blown up, so the closest cells flatten into single
 * colours and the outer ones read as a ring of tiny lenses. White dots grow on
 * the grid nodes, and the lens widens the faster you move.
 *
 * One fragment shader does the whole effect. With no `src`, a still life of
 * ranunculus is painted on a canvas at runtime, so it needs no assets at all.
 */

export type LoupePalette = "coral" | "blush" | "butter"

export type GridLoupeShaderProps = {
  /** Image URL (needs CORS if off-origin). Omit to paint the built-in ranunculus still life. */
  src?: string
  /** Palette of the painted still life, used when `src` is empty. */
  palette?: LoupePalette
  alt?: string
  /** Any CSS length. Default 100svh. */
  height?: number | string
  /** Grid cell size in CSS px. */
  cellSize?: number
  /** Draw dots on the grid nodes. */
  dots?: boolean
  dotColor?: string
  /** Largest dot radius as a fraction of the cell. */
  dotScale?: number
  /** Blend the lens in by distance instead of hard cells. */
  fade?: boolean
  /** How much pointer speed widens the lens. */
  spread?: number
  /** Lens radius while the pointer rests, as a fraction of the longer side. 0 = speed only. */
  restRadius?: number
  /** Open with the whole picture as a mosaic that settles. */
  intro?: boolean
  /** Let the lens wander when nobody is pointing. */
  autoplay?: boolean
  className?: string
  style?: React.CSSProperties
  /** Laid over the image; pointer events pass through to the lens except on interactive children. */
  children?: React.ReactNode
}

// #region logic
/** Lens strength 0..1 of a grid point at distance `d` from the lens centre. */
export function lensAt(d: number, radius: number): number {
  if (radius <= 0) return 0
  return 1 - Math.min(1, Math.max(0, d / radius))
}

/** Where a pixel `l` px into a cell of size `box` samples from, for lens strength `s`. */
export function sampleOffset(l: number, box: number, s: number): number {
  return (box * s) / 2 + l * (1 - s)
}

/** Frame-rate independent ease toward a target; k is roughly 1 / settle-time. */
export function approach(cur: number, target: number, dt: number, k: number): number {
  return target + (cur - target) * Math.exp(-dt * k)
}

/** UV scale that covers a w×h box with an iw×ih image (centre crop). */
export function coverScale(w: number, h: number, iw: number, ih: number): [number, number] {
  const box = w / h
  const img = iw / ih
  return box > img ? [1, img / box] : [box / img, 1]
}

/** "#rgb" / "#rrggbb" → 0..1 triplet; anything else is white. */
export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.trim().replace(/^#/, "")
  if (h.length === 3) h = h.replace(/./g, (c) => c + c)
  if (!/^[0-9a-f]{6}$/i.test(h)) return [1, 1, 1]
  const n = parseInt(h, 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

/** Deterministic 0..1 noise, so the painted still life is the same every load. */
export function rng(seed: number) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}
// #endregion logic

const VERT = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}"

// The lens, per pixel. Mirrors lensAt / sampleOffset above.
const FRAG = [
  "precision highp float;",
  "uniform sampler2D u_img;",
  "uniform vec2 u_res;",
  "uniform float u_dpr;",
  "uniform vec2 u_mouse;",
  "uniform float u_radius;",
  "uniform float u_box;",
  "uniform vec2 u_cover;",
  "uniform float u_fade;",
  "uniform float u_dots;",
  "uniform float u_dotScale;",
  "uniform vec3 u_dotColor;",
  "float lens(vec2 c){return u_radius<=0.?0.:1.-clamp(distance(c,u_mouse)/u_radius,0.,1.);}",
  "vec3 tex(vec2 p){vec2 uv=(p/u_res-.5)*u_cover+.5;return texture2D(u_img,clamp(uv,0.,1.)).rgb;}",
  "void main(){",
  "  vec2 p=vec2(gl_FragCoord.x,u_res.y*u_dpr-gl_FragCoord.y)/u_dpr;",
  "  vec2 cell=floor(p/u_box)*u_box;",
  "  float s=lens(cell);",
  "  vec2 q=cell+u_box*s*.5+(p-cell)*(1.-s);",
  "  vec3 col=tex(q);",
  "  if(u_fade>.5)col=mix(tex(p),col,s);",
  "  if(u_dots>.5){",
  "    vec2 n=floor(p/u_box+.5)*u_box;",
  "    float r=u_box*u_dotScale*lens(n);",
  "    float a=r>.05?clamp(r-distance(p,n)+.5,0.,1.):0.;",
  "    col=mix(col,u_dotColor,a);",
  "  }",
  "  gl_FragColor=vec4(col,1.);",
  "}",
].join("\n")

/* ---------- the painted still life ---------- */

const PALETTES = {
  coral: { ground: ["#0b1510", "#1d3122"], leaf: ["#1f3b26", "#4f7a3c"], deep: "#4a060d", mid: "#c4221b", edge: "#ff5f3d", lip: "#ffb796", heart: "#6f8f3a" },
  blush: { ground: ["#131016", "#2c2430"], leaf: ["#24382b", "#58784a"], deep: "#7a2440", mid: "#d8607e", edge: "#f7a7b6", lip: "#ffe3e6", heart: "#8a9a4a" },
  butter: { ground: ["#0f1418", "#22303a"], leaf: ["#24402e", "#5f8a44"], deep: "#8a4a06", mid: "#e8a321", edge: "#ffd25e", lip: "#fff1bf", heart: "#7c9a34" },
} as const

type Pal = (typeof PALETTES)[LoupePalette]
type C2 = CanvasRenderingContext2D

function leaf(g: C2, x: number, y: number, len: number, wid: number, ang: number, pal: Pal, alpha: number) {
  g.save()
  g.translate(x, y)
  g.rotate(ang)
  g.globalAlpha = alpha
  const lg = g.createLinearGradient(0, -wid, 0, wid)
  lg.addColorStop(0, pal.leaf[1])
  lg.addColorStop(1, pal.leaf[0])
  g.fillStyle = lg
  g.beginPath()
  g.moveTo(0, 0)
  g.bezierCurveTo(len * 0.3, -wid, len * 0.75, -wid * 0.8, len, 0)
  g.bezierCurveTo(len * 0.7, wid * 0.7, len * 0.3, wid * 0.9, 0, 0)
  g.fill()
  g.strokeStyle = "rgba(220,240,190,0.22)"
  g.lineWidth = Math.max(1.5, wid * 0.05)
  g.beginPath()
  g.moveTo(len * 0.04, 0)
  g.quadraticCurveTo(len * 0.5, -wid * 0.12, len * 0.96, 0)
  g.stroke()
  g.restore()
}

// A ranunculus is dozens of cupped petals in tight concentric rings: draw each
// ring as overlapping crescents, outer first, shaded dark at the base and lit
// at the lip, on a slightly squashed disc so the bloom faces up and away.
function bloom(g: C2, cx: number, cy: number, R: number, tilt: number, pal: Pal, rand: () => number) {
  g.save()
  g.translate(cx, cy)
  g.rotate(tilt)
  g.scale(1, 0.86)
  const shadow = g.createRadialGradient(R * 0.12, R * 0.2, R * 0.4, R * 0.12, R * 0.2, R * 1.25)
  shadow.addColorStop(0, "rgba(0,0,0,0.55)")
  shadow.addColorStop(1, "rgba(0,0,0,0)")
  g.fillStyle = shadow
  g.beginPath()
  g.arc(R * 0.12, R * 0.2, R * 1.25, 0, Math.PI * 2)
  g.fill()

  const rings = 12
  g.shadowColor = "rgba(30,0,4,0.55)"
  g.shadowBlur = R * 0.05
  g.shadowOffsetY = R * 0.015
  for (let i = 0; i < rings; i++) {
    const t = i / rings
    const r = R * Math.pow(1 - t, 0.8)
    const inner = r * (0.42 + t * 0.25)
    const k = 6 + Math.round(t * 5)
    const w = (Math.PI / k) * 1.5
    const off = rand() * Math.PI * 2
    for (let j = 0; j < k; j++) {
      const a = off + (j / k) * Math.PI * 2 + (rand() - 0.5) * 0.3
      const rr = r * (0.86 + rand() * 0.2)
      // dark where the petal folds into the bloom, lit only at its cupped lip
      const grad = g.createRadialGradient(0, 0, 0, 0, 0, rr)
      const base = Math.min(0.8, inner / rr)
      grad.addColorStop(0, pal.deep)
      grad.addColorStop(base, pal.deep)
      grad.addColorStop(base + (1 - base) * 0.55, pal.mid)
      grad.addColorStop(base + (1 - base) * 0.94, pal.edge)
      grad.addColorStop(1, pal.lip)
      g.fillStyle = grad
      g.beginPath()
      const steps = 16
      for (let q = 0; q <= steps; q++) {
        const aa = a - w + (2 * w * q) / steps
        const bulge = 1 + 0.07 * Math.sin((q / steps) * Math.PI)
        const px = Math.cos(aa) * rr * bulge
        const py = Math.sin(aa) * rr * bulge
        if (q === 0) g.moveTo(px, py)
        else g.lineTo(px, py)
      }
      g.quadraticCurveTo(Math.cos(a) * inner * 0.5, Math.sin(a) * inner * 0.5, Math.cos(a - w) * rr, Math.sin(a - w) * rr)
      g.fill()
    }
  }
  g.shadowColor = "transparent"
  // the tight green heart
  const hr = R * 0.09
  const hg = g.createRadialGradient(-hr * 0.3, -hr * 0.3, 0, 0, 0, hr)
  hg.addColorStop(0, "#d8e6a0")
  hg.addColorStop(1, pal.heart)
  g.fillStyle = hg
  g.beginPath()
  g.arc(0, 0, hr, 0, Math.PI * 2)
  g.fill()
  // one light from the upper left over the whole bloom
  g.globalCompositeOperation = "soft-light"
  const lit = g.createLinearGradient(-R, -R, R, R)
  lit.addColorStop(0, "rgba(255,255,255,0.35)")
  lit.addColorStop(1, "rgba(0,0,0,0.6)")
  g.fillStyle = lit
  g.beginPath()
  g.arc(0, 0, R * 1.02, 0, Math.PI * 2)
  g.fill()
  g.restore()
}

/** Paints the ranunculus still life and returns it as a data URL ("" on the server). */
export function paintStillLife(palette: LoupePalette = "coral", w = 1800, h = 1200): string {
  if (typeof document === "undefined") return ""
  const c = document.createElement("canvas")
  c.width = w
  c.height = h
  const g = c.getContext("2d")
  if (!g) return ""
  const pal = PALETTES[palette] || PALETTES.coral
  const rand = rng(palette.length * 7919 + 13)

  const bg = g.createLinearGradient(0, 0, w, h)
  bg.addColorStop(0, pal.ground[1])
  bg.addColorStop(1, pal.ground[0])
  g.fillStyle = bg
  g.fillRect(0, 0, w, h)
  // out-of-focus foliage behind
  for (let i = 0; i < 26; i++) {
    const x = rand() * w
    const y = rand() * h
    const r = 60 + rand() * 220
    const b = g.createRadialGradient(x, y, 0, x, y, r)
    b.addColorStop(0, i % 3 ? "rgba(80,120,70,0.22)" : "rgba(170,190,110,0.16)")
    b.addColorStop(1, "rgba(0,0,0,0)")
    g.fillStyle = b
    g.fillRect(x - r, y - r, r * 2, r * 2)
  }
  const s = w / 1800
  const leaves: [number, number, number, number, number, number][] = [
    [140, 260, 520, 120, 0.35, 0.55], [1700, 180, 480, 110, 2.6, 0.5], [900, 1180, 560, 130, -1.2, 0.85],
    [380, 900, 520, 120, -0.5, 0.9], [1320, 760, 560, 130, 0.3, 0.9], [1020, 120, 420, 100, 2.2, 0.8],
    [60, 700, 460, 110, -0.15, 0.85], [1600, 1120, 480, 120, -2.4, 0.85],
  ]
  for (const [x, y, l, wd, a, al] of leaves) leaf(g, x * s, y * s, l * s, wd * s, a, pal, al)
  const blooms: [number, number, number, number][] = [
    [1450, 1010, 300, 0.4], [250, 1080, 150, -0.3], [1230, 400, 270, -0.2], [600, 560, 360, 0.15], [1560, 120, 170, 0.6],
  ]
  for (const [x, y, r, t] of blooms) bloom(g, x * s, y * s, r * s, t, pal, rand)

  // vignette and film grain
  const v = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75)
  v.addColorStop(0, "rgba(0,0,0,0)")
  v.addColorStop(1, "rgba(0,0,0,0.55)")
  g.fillStyle = v
  g.fillRect(0, 0, w, h)
  const img = g.getImageData(0, 0, w, h)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * 18
    d[i] += n
    d[i + 1] += n
    d[i + 2] += n
  }
  g.putImageData(img, 0, 0)
  return c.toDataURL("image/jpeg", 0.9)
}

/* ---------- the component ---------- */

const GL_CSS = [
  ".gl-root{position:relative;width:100%;overflow:hidden;background:#0b1510;touch-action:pan-y;isolation:isolate}",
  ".gl-img,.gl-canvas{position:absolute;inset:0;width:100%;height:100%;max-width:none;display:block;object-fit:cover}",
  ".gl-canvas{opacity:0;transition:opacity .5s ease}",
  ".gl-canvas[data-ready='1']{opacity:1}",
  ".gl-over{position:absolute;inset:0;pointer-events:none;z-index:1}",
  ".gl-over a,.gl-over button,.gl-over input,.gl-over select,.gl-over label{pointer-events:auto}",
  "@media (prefers-reduced-motion:reduce){.gl-canvas{transition:none}}",
].join("\n")

export default function GridLoupeShader({
  src,
  palette = "coral",
  alt = "A still life of ranunculus that turns into a magnifying mosaic under the pointer",
  height = "100svh",
  cellSize = 72,
  dots = true,
  dotColor = "#ffffff",
  dotScale = 0.15,
  fade = false,
  spread = 2,
  restRadius = 0.12,
  intro = true,
  autoplay = true,
  className,
  style,
  children,
}: GridLoupeShaderProps) {
  const rootRef = React.useRef(null as HTMLDivElement | null)
  const canvasRef = React.useRef(null as HTMLCanvasElement | null)
  const [painted, setPainted] = React.useState("")
  const [ready, setReady] = React.useState(false)
  const url = src || painted

  React.useEffect(() => {
    if (!src) setPainted(paintStillLife(palette))
  }, [src, palette])

  // Settings live in a ref so changing a prop doesn't rebuild the GL context.
  const opts = React.useRef({ cellSize, dots, dotColor, dotScale, fade, spread, restRadius, autoplay })
  opts.current = { cellSize, dots, dotColor, dotScale, fade, spread, restRadius, autoplay }

  React.useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    if (!root || !canvas || !url) return
    const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false })
    if (!gl) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const compile = (type: number, code: string) => {
      const sh = gl.createShader(type)
      if (!sh) return null
      gl.shaderSource(sh, code)
      gl.compileShader(sh)
      return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null
    }
    const vs = compile(gl.VERTEX_SHADER, VERT)
    const fs = compile(gl.FRAGMENT_SHADER, FRAG)
    const prog = gl.createProgram()
    if (!vs || !fs || !prog) return
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return
    gl.useProgram(prog)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, "a")
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const U = (n: string) => gl.getUniformLocation(prog, n)
    const u = {
      res: U("u_res"), dpr: U("u_dpr"), mouse: U("u_mouse"), radius: U("u_radius"), box: U("u_box"), cover: U("u_cover"),
      fade: U("u_fade"), dots: U("u_dots"), dotScale: U("u_dotScale"), dotColor: U("u_dotColor"),
    }

    const tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    let iw = 0
    let ih = 0
    let dead = false
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.decoding = "async"
    img.onload = () => {
      if (dead) return
      try {
        gl.bindTexture(gl.TEXTURE_2D, tex)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img)
      } catch {
        return // tainted (no CORS): the <img> underneath stays visible
      }
      iw = img.naturalWidth
      ih = img.naturalHeight
      setReady(true)
    }
    img.src = url

    let w = 1
    let h = 1
    let dpr = 1
    const resize = () => {
      const r = root.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = Math.max(1, r.width)
      h = Math.max(1, r.height)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(root)

    // m = lagging lens centre, t = pointer target, s = speed-driven radius
    const m = { x: w / 2, y: h / 2, tx: w / 2, ty: h / 2, s: intro && !reduce ? 1.5 : 0, rest: 0 }
    let inside = false
    let lastPointer = -1e9
    const onMove = (e: PointerEvent) => {
      const r = root.getBoundingClientRect()
      m.tx = e.clientX - r.left
      m.ty = e.clientY - r.top
      inside = true
      lastPointer = performance.now()
    }
    const onLeave = () => {
      inside = false
      lastPointer = performance.now()
    }
    root.addEventListener("pointermove", onMove)
    root.addEventListener("pointerdown", onMove)
    root.addEventListener("pointerleave", onLeave)

    let visible = true
    const io = new IntersectionObserver(([en]) => {
      visible = en.isIntersecting
      if (visible && !raf) raf = requestAnimationFrame(frame)
    })
    io.observe(root)

    let raf = 0
    let prev = performance.now()
    const frame = (now: number) => {
      raf = 0
      if (!visible || dead) return
      const dt = Math.min(0.05, (now - prev) / 1000)
      prev = now
      const o = opts.current
      const span = Math.max(w, h)
      const wander = o.autoplay && !reduce && !inside && now - lastPointer > 1800
      if (wander) {
        const t = now / 1000
        m.tx = w / 2 + w * 0.32 * Math.sin(t * 0.37)
        m.ty = h / 2 + h * 0.26 * Math.sin(t * 0.53 + 1.1)
      }
      m.x = approach(m.x, m.tx, dt, 7)
      m.y = approach(m.y, m.ty, dt, 7)
      const speed = Math.hypot(m.x - m.tx, m.y - m.ty)
      m.s = approach(m.s, (speed / span) * o.spread, dt, 1.6)
      m.rest = approach(m.rest, inside || wander ? 1 : 0, dt, 3)
      if (iw) {
        gl.uniform2f(u.res, w, h)
        gl.uniform1f(u.dpr, dpr)
        gl.uniform2f(u.mouse, m.x, m.y)
        gl.uniform1f(u.radius, (m.s + o.restRadius * m.rest) * span)
        gl.uniform1f(u.box, Math.max(8, o.cellSize))
        const [cx, cy] = coverScale(w, h, iw, ih)
        gl.uniform2f(u.cover, cx, cy)
        gl.uniform1f(u.fade, o.fade ? 1 : 0)
        gl.uniform1f(u.dots, o.dots ? 1 : 0)
        gl.uniform1f(u.dotScale, o.dotScale)
        const [r, g, b] = hexToRgb(o.dotColor)
        gl.uniform3f(u.dotColor, r, g, b)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      dead = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      root.removeEventListener("pointermove", onMove)
      root.removeEventListener("pointerdown", onMove)
      root.removeEventListener("pointerleave", onLeave)
      gl.deleteTexture(tex)
      gl.deleteBuffer(buf)
      gl.deleteProgram(prog)
      setReady(false)
    }
  }, [url, intro])

  return (
    <div
      ref={rootRef}
      className={["gl-root", className].filter(Boolean).join(" ")}
      style={{ height, ...style }}
      role="img"
      aria-label={alt}
    >
      <style>{GL_CSS}</style>
      {url ? <img className="gl-img" src={url} alt="" aria-hidden="true" draggable={false} /> : null}
      <canvas ref={canvasRef} className="gl-canvas" data-ready={ready ? "1" : "0"} aria-hidden="true" />
      {children ? <div className="gl-over">{children}</div> : null}
    </div>
  )
}
