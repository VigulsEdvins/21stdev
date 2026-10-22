"use client"

import * as React from "react"

/*
 * Water Ripple Carousel — a full-bleed image carousel where tapping the
 * picture drops a ripple: a ring of bending water spreads from that point,
 * refracting the old picture at its edge, and the next picture appears inside
 * it. One WebGL fragment shader; falls back to a fade without WebGL.
 *
 * Tap the picture, use the arrows, swipe, ←/→ or let it autoplay. Slides
 * without an `image` get a painted landscape, so it works with no assets.
 * Off-origin images need CORS for WebGL.
 */

export type LandPalette = "dawn" | "alpine" | "dusk" | "mist"

export type Slide = {
  image?: string
  title?: string
  caption?: string
  alt?: string
  /** Palette and seed of the painted landscape used when `image` is empty. */
  palette?: LandPalette
  seed?: number
}

export type WaterRippleCarouselProps = {
  slides?: Slide[]
  /** Any CSS length. Default 100svh. */
  height?: number | string
  /** ms the transition takes. */
  duration?: number
  /** How strongly the ring bends the picture (0–2). */
  strength?: number
  /** ms per slide; 0 turns autoplay off. */
  autoplay?: number
  /** Colour of text, buttons and the progress line. */
  ink?: string
  onChange?: (index: number) => void
  className?: string
  style?: React.CSSProperties
  ariaLabel?: string
}

// #region logic
export function wrap(i: number, n: number): number {
  return n ? ((i % n) + n) % n : 0
}

export function pad2(n: number): string {
  return n < 10 ? "0" + n : String(n)
}

/** Where an untargeted transition starts: right of centre going forward, left going back. */
export function defaultOrigin(dir: number, w: number, h: number, r: number): [number, number] {
  return [w * (dir >= 0 ? 0.62 + r * 0.25 : 0.13 + r * 0.25), h * (0.3 + r * 0.4)]
}

/** UV scale that covers a w×h box with an iw×ih image (centre crop). */
export function coverScale(w: number, h: number, iw: number, ih: number): [number, number] {
  const box = w / h
  const img = iw / ih
  return box > img ? [1, img / box] : [box / img, 1]
}

/** Ring radius, in stage heights, at progress t — ends past every corner from (x, y). */
export function ringRadius(t: number, x: number, y: number, w: number, h: number): number {
  const far = Math.hypot(Math.max(x, w - x), Math.max(y, h - y)) / h
  return Math.min(1, Math.max(0, t)) * (far + 0.18)
}
// #endregion logic

/* ------------------------------------------------------- painted images */

const PALETTES = {
  dawn: { top: "#e7b7a5", bottom: "#f8e8d6", sun: "#fff4df", far: "#d2b2bb", near: "#3a2a3b", mist: "255,240,232" },
  alpine: { top: "#7ea5c8", bottom: "#e3ecf2", sun: "#ffffff", far: "#a9bfd0", near: "#1c3044", mist: "236,244,250" },
  dusk: { top: "#2a2450", bottom: "#ef8d60", sun: "#ffd9a6", far: "#93607c", near: "#18121f", mist: "255,196,160" },
  mist: { top: "#c4d0cb", bottom: "#eef1ec", sun: "#ffffff", far: "#aebcb5", near: "#2c3a33", mist: "246,248,245" },
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function hexRgb(h: string): [number, number, number] {
  const v = parseInt(h.replace("#", ""), 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}
function mixRgb(a: string, b: string, t: number): string {
  const A = hexRgb(a)
  const B = hexRgb(b)
  return "rgb(" + A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",") + ")"
}

// A layered-ridge landscape: sky, a low sun, five ridges fading into haze with
// mist between them, a tree line on the nearest, film grain. Painted once.
function paintLandscape(seed: number, palette: LandPalette, w = 1600, h = 1000): string {
  if (typeof document === "undefined") return ""
  const c = document.createElement("canvas")
  c.width = w
  c.height = h
  const g = c.getContext("2d")
  if (!g) return ""
  const P = PALETTES[palette] ?? PALETTES.dawn
  const r = mulberry32(seed * 104729 + 7)

  const sky = g.createLinearGradient(0, 0, 0, h * 0.72)
  sky.addColorStop(0, P.top)
  sky.addColorStop(1, P.bottom)
  g.fillStyle = sky
  g.fillRect(0, 0, w, h)
  const sx = w * (0.22 + r() * 0.56)
  const sy = h * (0.26 + r() * 0.16)
  const halo = g.createRadialGradient(sx, sy, 0, sx, sy, w * 0.45)
  halo.addColorStop(0, "rgba(" + hexRgb(P.sun).join(",") + ",.85)")
  halo.addColorStop(0.08, "rgba(" + hexRgb(P.sun).join(",") + ",.55)")
  halo.addColorStop(1, "rgba(" + hexRgb(P.sun).join(",") + ",0)")
  g.fillStyle = halo
  g.fillRect(0, 0, w, h)
  g.fillStyle = P.sun
  g.beginPath()
  g.arc(sx, sy, h * 0.045, 0, Math.PI * 2)
  g.fill()

  const layers = 5
  for (let L = 0; L < layers; L++) {
    const k = L / (layers - 1)
    const base = h * (0.42 + k * 0.4)
    const amp = h * (0.07 + k * 0.1)
    const ph = [r(), r(), r(), r()].map((v) => v * Math.PI * 2)
    const fr = [1.3 + r(), 3.1 + r() * 2, 7 + r() * 4, 17 + r() * 8]
    const ridge = (x: number) => {
      const u = x / w
      return (
        base -
        amp *
          (0.55 * Math.sin(u * fr[0] + ph[0]) +
            0.28 * Math.sin(u * fr[1] + ph[1]) +
            0.12 * Math.abs(Math.sin(u * fr[2] + ph[2])) +
            0.05 * Math.sin(u * fr[3] + ph[3]))
      )
    }
    const mist = g.createLinearGradient(0, base - amp * 1.4, 0, base + amp * 0.4)
    mist.addColorStop(0, "rgba(" + P.mist + ",0)")
    mist.addColorStop(1, "rgba(" + P.mist + "," + (0.55 - k * 0.35).toFixed(2) + ")")
    g.fillStyle = mist
    g.fillRect(0, base - amp * 1.4, w, amp * 1.8)
    const body = g.createLinearGradient(0, base - amp, 0, h)
    body.addColorStop(0, mixRgb(P.far, P.near, Math.pow(k, 1.3)))
    body.addColorStop(1, mixRgb(P.far, P.near, Math.min(1, Math.pow(k, 1.3) + 0.18)))
    g.fillStyle = body
    g.beginPath()
    g.moveTo(0, h)
    for (let x = 0; x <= w; x += 6) g.lineTo(x, ridge(x))
    g.lineTo(w, h)
    g.closePath()
    g.fill()
    if (L >= layers - 2) {
      g.fillStyle = mixRgb(P.far, P.near, Math.min(1, Math.pow(k, 1.3) + 0.08))
      for (let x = 0; x < w; x += 7 + r() * 9) {
        if (r() < 0.35) continue
        const y = ridge(x) + 2
        const th = h * (0.025 + r() * 0.035) * (0.6 + k)
        const tw = th * 0.32
        g.beginPath()
        g.moveTo(x, y - th)
        g.lineTo(x + tw, y)
        g.lineTo(x - tw, y)
        g.closePath()
        g.fill()
      }
    }
  }

  const vig = g.createRadialGradient(w / 2, h * 0.45, h * 0.3, w / 2, h / 2, w * 0.78)
  vig.addColorStop(0, "rgba(0,0,0,0)")
  vig.addColorStop(1, "rgba(0,0,0,.32)")
  g.fillStyle = vig
  g.fillRect(0, 0, w, h)
  const grain = g.getImageData(0, 0, w, h)
  const d = grain.data
  for (let i = 0; i < d.length; i += 4) {
    const v = (r() - 0.5) * 14
    d[i] += v
    d[i + 1] += v
    d[i + 2] += v
  }
  g.putImageData(grain, 0, 0)
  return c.toDataURL("image/jpeg", 0.88)
}

const DEFAULT_SLIDES: Slide[] = [
  { title: "First Light", caption: "Haze lifting off the eastern ridges.", palette: "dawn", seed: 3 },
  { title: "High Pass", caption: "Cold air, clear to the far range.", palette: "alpine", seed: 8 },
  { title: "Ember Hour", caption: "The last of the sun on the valley floor.", palette: "dusk", seed: 14 },
  { title: "Still Valley", caption: "Morning mist that never quite lifts.", palette: "mist", seed: 21 },
  { title: "Rose Ridge", caption: "Five ridges, one long exhale.", palette: "dawn", seed: 34 },
  { title: "Blue Hour", caption: "Pines going dark against the snow.", palette: "alpine", seed: 55 },
]

// Every slide as an image URL; slides without one are painted after mount.
function useSlideImages(slides: Slide[]): string[] {
  const key = slides.map((s) => s.image || (s.palette || "dawn") + ":" + (s.seed ?? 1)).join("|")
  const [painted, setPainted] = React.useState(() => slides.map(() => ""))
  React.useEffect(() => {
    setPainted(slides.map((s, i) => (s.image ? "" : paintLandscape(s.seed ?? i + 1, s.palette || "dawn"))))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return slides.map((s, i) => s.image || painted[i] || "")
}

type LayerProps = {
  from: string
  to: string
  x: number
  y: number
  w: number
  h: number
  dir: number
  duration: number
  opts: { [k: string]: number }
  onDone: () => void
}

const RIPPLE_VERT = "attribute vec2 p;varying vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}"
const RIPPLE_FRAG = [
  "precision highp float;",
  "varying vec2 uv;",
  "uniform sampler2D A,B;",
  "uniform vec2 c,ca,cb;",
  "uniform float r,asp,str;",
  "vec2 cov(vec2 u,vec2 s){return (u-.5)*s+.5;}",
  "void main(){",
  "  vec2 q=(uv-c)*vec2(asp,1.);",
  "  float d=length(q);",
  "  float w=exp(-pow((d-r)*7.,2.));",
  "  vec2 off=normalize(q+1e-5)*sin((d-r)*70.)*.014*str*w/vec2(asp,1.);",
  "  vec2 u2=clamp(uv+off,0.,1.);",
  "  vec3 a=texture2D(A,cov(u2,ca)).rgb;",
  "  vec3 b=texture2D(B,cov(u2,cb)).rgb;",
  "  float m=smoothstep(r+.03,r-.03,d);",
  "  gl_FragColor=vec4(mix(a,b,m)+w*.07*str,1.);",
  "}",
].join("\n")

// The ripple: both pictures as textures, one ring per transition. Anything
// that goes wrong (no WebGL, no CORS) just ends the transition.
function Layer({ from, to, x, y, w, h, duration, opts, onDone }: LayerProps) {
  const ref = React.useRef(null as HTMLCanvasElement | null)
  const done = React.useRef(onDone)
  done.current = onDone
  const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  React.useEffect(() => {
    if (reduce) return
    const cv = ref.current
    const gl = cv ? cv.getContext("webgl", { premultipliedAlpha: false }) : null
    if (!cv || !gl) return void done.current()
    let dead = false
    let raf = 0
    const sh = (type: number, code: string) => {
      const o = gl.createShader(type)!
      gl.shaderSource(o, code)
      gl.compileShader(o)
      return o
    }
    const prog = gl.createProgram()!
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, RIPPLE_VERT))
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, RIPPLE_FRAG))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return void done.current()
    gl.useProgram(prog)
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    const U = (k: string) => gl.getUniformLocation(prog, k)
    const load = (src: string) =>
      new Promise((res, rej) => {
        const im = new Image()
        im.crossOrigin = "anonymous"
        im.onload = () => im.decode().catch(() => undefined).then(() => res(im))
        im.onerror = rej
        im.src = src
      })
    Promise.all([load(from), load(to)])
      .then((list) => {
        if (dead) return
        const [a, b] = list as HTMLImageElement[]
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
        ;[a, b].forEach((im, i) => {
          gl.activeTexture(i ? gl.TEXTURE1 : gl.TEXTURE0)
          gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im)
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        })
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        cv.width = Math.round(w * dpr)
        cv.height = Math.round(h * dpr)
        gl.viewport(0, 0, cv.width, cv.height)
        gl.uniform1i(U("A"), 0)
        gl.uniform1i(U("B"), 1)
        gl.uniform2f(U("c"), x / w, 1 - y / h)
        gl.uniform2fv(U("ca"), coverScale(w, h, a.naturalWidth, a.naturalHeight))
        gl.uniform2fv(U("cb"), coverScale(w, h, b.naturalWidth, b.naturalHeight))
        gl.uniform1f(U("asp"), w / h)
        gl.uniform1f(U("str"), opts.strength ?? 1)
        const t0 = performance.now()
        const frame = (now: number) => {
          if (dead) return
          const t = Math.min(1, (now - t0) / duration)
          gl.uniform1f(U("r"), ringRadius(Math.pow(t, 0.85), x, y, w, h))
          gl.drawArrays(gl.TRIANGLES, 0, 3)
          if (t < 1) raf = requestAnimationFrame(frame)
          else done.current()
        }
        raf = requestAnimationFrame(frame)
      })
      .catch(() => !dead && done.current())
    return () => {
      dead = true
      cancelAnimationFrame(raf)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  if (reduce) return <img className="wr-in wr-fade" src={to} alt="" aria-hidden="true" onAnimationEnd={onDone} />
  return <canvas ref={ref} className="wr-in" aria-hidden="true" />
}

const WR_CSS = [
  ".wr-root{position:relative;width:100%;overflow:hidden;background:#0d0d0f;color:var(--wr-ink);user-select:none;-webkit-user-select:none;touch-action:pan-y;outline:none;cursor:pointer}",
  ".wr-root:focus-visible{box-shadow:inset 0 0 0 2px var(--wr-ink)}",
  ".wr-base{position:absolute;inset:0}",
  ".wr-img{position:absolute;inset:0;width:100%;height:100%;max-width:none;object-fit:cover;display:block;pointer-events:none}",
  ".wr-in{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none}",
  ".wr-fade{max-width:none;object-fit:cover;animation:wr-fade .35s ease both}",
  "@keyframes wr-fade{from{opacity:0}to{opacity:1}}",
  ".wr-shade{position:absolute;inset:auto 0 0 0;height:46%;background:linear-gradient(to top,rgba(0,0,0,.6),rgba(0,0,0,0));pointer-events:none}",
  ".wr-text{position:absolute;left:clamp(20px,4vw,56px);bottom:clamp(44px,8vh,80px);right:clamp(140px,20vw,280px);pointer-events:none}",
  ".wr-line{display:block;overflow:hidden;padding-bottom:.08em}",
  ".wr-line>span{display:block;animation:wr-rise .9s cubic-bezier(.2,.8,.2,1) both}",
  ".wr-title{font:500 clamp(34px,6vw,84px)/1 ui-serif,Georgia,'Times New Roman',serif;letter-spacing:-.02em}",
  ".wr-cap{margin-top:12px;font:400 14px/1.4 ui-sans-serif,system-ui,sans-serif;opacity:.82;max-width:44ch}",
  ".wr-cap>span{animation-delay:.08s}",
  ".wr-nav{position:absolute;right:clamp(20px,4vw,56px);bottom:clamp(44px,8vh,80px);display:flex;align-items:center;gap:14px;cursor:default}",
  ".wr-count{font:500 12px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.14em}",
  ".wr-btn{appearance:none;width:44px;height:44px;border-radius:50%;border:1px solid color-mix(in srgb,var(--wr-ink) 45%,transparent);background:transparent;color:inherit;display:grid;place-items:center;cursor:pointer;transition:background .2s ease,color .2s ease}",
  ".wr-btn:hover{background:var(--wr-ink);color:#0d0d0f}",
  ".wr-btn:focus-visible{outline:2px solid var(--wr-ink);outline-offset:2px}",
  ".wr-track{position:absolute;left:clamp(20px,4vw,56px);right:clamp(20px,4vw,56px);bottom:clamp(20px,3.5vh,36px);height:1px;background:color-mix(in srgb,var(--wr-ink) 28%,transparent)}",
  ".wr-fill{height:100%;background:var(--wr-ink);transform-origin:left;transform:scaleX(0)}",
  ".wr-fill[data-run='1']{animation:wr-auto var(--wr-auto) linear forwards}",
  ".wr-root[data-paused='1'] .wr-fill{animation-play-state:paused}",
  ".wr-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}",
  "@keyframes wr-rise{from{transform:translateY(105%)}to{transform:none}}",
  "@keyframes wr-auto{to{transform:scaleX(1)}}",
  "@media (prefers-reduced-motion:reduce){.wr-line>span{animation:none}}",
].join("\n")

export default function WaterRippleCarousel({
  slides = DEFAULT_SLIDES,
  height = "100svh",
  duration = 1900,
  strength = 1,
  autoplay = 6000,
  ink = "#ffffff",
  onChange,
  className,
  style,
  ariaLabel = "Image carousel",
}: WaterRippleCarouselProps) {
  const opts = { strength }
  const n = slides.length
  const srcs = useSlideImages(slides)
  const [index, setIndex] = React.useState(0)
  const [incoming, setIncoming] = React.useState(null as null | { to: number; dir: number; x: number; y: number; w: number; h: number; id: number })
  const [paused, setPaused] = React.useState(false)
  const rootRef = React.useRef(null as HTMLDivElement | null)
  const down = React.useRef(null as null | { x: number; y: number })
  const seq = React.useRef(0)

  const go = (dir: number, px?: number, py?: number) => {
    const root = rootRef.current
    if (!root || incoming || n < 2) return
    const w = root.clientWidth
    const h = root.clientHeight
    seq.current += 1
    const [dx, dy] = defaultOrigin(dir, w, h, (seq.current * 0.618) % 1)
    setIncoming({ to: wrap(index + dir, n), dir, x: px ?? dx, y: py ?? dy, w, h, id: Date.now() })
  }
  const commit = () => {
    if (!incoming) return
    setIndex(incoming.to)
    setIncoming(null)
  }

  React.useEffect(() => {
    onChange?.(index)
  }, [index, onChange])

  // warm the cache so a tap starts its transition at once
  React.useEffect(() => {
    srcs.forEach((src) => {
      if (src) new Image().src = src
    })
  }, [srcs.join("|")]) // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    const root = rootRef.current
    if (!root) return
    let seen = true
    const sync = () => setPaused(!seen || document.hidden)
    const io = new IntersectionObserver(([e]) => {
      seen = e.isIntersecting
      sync()
    })
    io.observe(root)
    document.addEventListener("visibilitychange", sync)
    return () => {
      io.disconnect()
      document.removeEventListener("visibilitychange", sync)
    }
  }, [])

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") go(1)
    else if (e.key === "ArrowLeft") go(-1)
    else return
    e.preventDefault()
  }
  const onDown = (e: React.PointerEvent) => {
    down.current = { x: e.clientX, y: e.clientY }
  }
  const onUp = (e: React.PointerEvent) => {
    const s = down.current
    down.current = null
    if (!s || !rootRef.current) return
    const dx = e.clientX - s.x
    const b = rootRef.current.getBoundingClientRect()
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - s.y)) go(dx < 0 ? 1 : -1)
    else if (Math.abs(dx) < 8) go(1, e.clientX - b.left, e.clientY - b.top)
  }
  const stop = (e: React.PointerEvent) => e.stopPropagation()

  const shown = incoming ? incoming.to : index
  const s = slides[shown] || {}

  return (
    <div
      ref={rootRef}
      className={["wr-root", className].filter(Boolean).join(" ")}
      style={{ height, ["--wr-ink" as string]: ink, ["--wr-auto" as string]: autoplay + "ms", ...style }}
      data-paused={paused ? "1" : "0"}
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={onKey}
      onPointerDown={onDown}
      onPointerUp={onUp}
    >
      <style>{WR_CSS}</style>
      <div className="wr-base">
        {srcs[index] ? <img className="wr-img" src={srcs[index]} alt={slides[index]?.alt || slides[index]?.title || ""} draggable={false} /> : null}
      </div>
      {incoming && srcs[index] && srcs[incoming.to] ? (
        <Layer
          key={incoming.id}
          from={srcs[index]}
          to={srcs[incoming.to]}
          x={incoming.x}
          y={incoming.y}
          w={incoming.w}
          h={incoming.h}
          dir={incoming.dir}
          duration={duration}
          opts={opts}
          onDone={commit}
        />
      ) : null}
      <div className="wr-shade" aria-hidden="true" />
      <div className="wr-text" key={"t" + shown} aria-hidden="true">
        {s.title ? (
          <span className="wr-line wr-title">
            <span>{s.title}</span>
          </span>
        ) : null}
        {s.caption ? (
          <span className="wr-line wr-cap">
            <span>{s.caption}</span>
          </span>
        ) : null}
      </div>
      <div className="wr-nav" onPointerDown={stop} onPointerUp={stop}>
        <span className="wr-count" aria-hidden="true">
          {pad2(shown + 1)} / {pad2(n)}
        </span>
        <button type="button" className="wr-btn" aria-label="Previous" onClick={() => go(-1)}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </button>
        <button type="button" className="wr-btn" aria-label="Next" onClick={() => go(1)}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="m6 3 5 5-5 5" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </button>
      </div>
      <div className="wr-track" aria-hidden="true">
        <div key={"f" + index} className="wr-fill" data-run={autoplay > 0 && n > 1 && !incoming ? "1" : "0"} onAnimationEnd={() => go(1)} />
      </div>
      <div className="wr-sr" aria-live="polite">
        {"Slide " + (shown + 1) + " of " + n + (s.title ? ": " + s.title : "")}
      </div>
    </div>
  )
}
