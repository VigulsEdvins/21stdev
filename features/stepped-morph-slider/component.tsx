"use client"

// An image slider whose window is a stepped, skyline-like mask. Every slide
// has its own blocky shape; going to the next one morphs the mask column by
// column into the new shape while the picture cross-fades and drifts. Hover
// lifts the column under the pointer. It slides on its own, with a story-style
// timeline under the picture; click, drag, swipe, the arrows, a timeline
// segment or ←/→ jump around.
//
// Slides without an image get one painted on a canvas — layered ridges fading
// into haze under a low sun — so it works with no assets at all.
//
// No dependencies. React is the only import.

import React from "react"

export type SteppedSlide = {
  /** Image URL. Omit to use a painted landscape. */
  image?: string
  title: string
  caption?: string
  /** Seed for this slide's shape (and painted image). */
  seed?: number
  /** Palette for the painted landscape: "dawn" | "alpine" | "dusk" | "mist". */
  palette?: LandPalette
}

export type LandPalette = "dawn" | "alpine" | "dusk" | "mist"

export type SteppedMorphSliderProps = {
  slides?: SteppedSlide[]
  /** Columns in every shape. More = finer steps. */
  columns?: number
  /** Milliseconds between slides; 0 = no autoplay. */
  autoplay?: number
  /** Morph duration, ms. */
  duration?: number
  /** Width / height of the image window. */
  aspect?: number
  /** Thin outline around the shape. Empty hides it. */
  outline?: string
  background?: string
  ink?: string
  muted?: string
  accent?: string
  onChange?: (index: number) => void
  className?: string
}

/* ------------------------------------------------------------------ logic */

// #region logic
function clamp(v: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, v))
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

function easeInOutCubic(t: number): number {
  const c = clamp(t, 0, 1)
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2
}

/** A stepped shape: K columns, each with its own x-span, top and bottom. */
export type Shape = { xs: number[]; top: number[]; bot: number[] }

// a skyline-like stepped shape inside a w×h box; every shape has the same
// number of columns, so any two can morph corner-for-corner
function makeShape(seed: number, k: number, w: number, h: number): Shape {
  const r = mulberry32(seed * 7919 + 13)
  // column widths: uneven, never thinner than a sliver
  const weights = Array.from({ length: k }, () => 0.45 + r() * 1.1)
  const sum = weights.reduce((a, b) => a + b, 0)
  const xs = [0]
  for (const wt of weights) xs.push(xs[xs.length - 1] + (wt / sum) * w)
  xs[k] = w
  const top: number[] = []
  const bot: number[] = []
  let t = h * (0.12 + r() * 0.3)
  let b = h * (0.62 + r() * 0.3)
  for (let i = 0; i < k; i++) {
    // neighbours step, and sometimes jump, so the outline reads as blocks
    t = clamp(t + (r() - 0.5) * h * (r() < 0.3 ? 0.55 : 0.28), 0, h * 0.46)
    b = clamp(b + (r() - 0.5) * h * (r() < 0.3 ? 0.55 : 0.28), h * 0.56, h)
    if (r() < 0.12) t = 0
    if (r() < 0.12) b = h
    top.push(Math.round(t))
    bot.push(Math.round(b))
  }
  return { xs: xs.map((x) => Math.round(x)), top, bot }
}

// interpolate two shapes; columns move in a left-to-right stagger
function lerpShape(a: Shape, b: Shape, p: number, stagger = 0.35): Shape {
  const k = a.top.length
  const col = (i: number) => easeInOutCubic(clamp((p - (i / Math.max(1, k - 1)) * stagger) / (1 - stagger), 0, 1))
  const xs = a.xs.map((x, i) => {
    const e = col(Math.min(i, k - 1))
    return x + (b.xs[i] - x) * e
  })
  const top = a.top.map((v, i) => v + (b.top[i] - v) * col(i))
  const bot = a.bot.map((v, i) => v + (b.bot[i] - v) * col(i))
  return { xs, top, bot }
}

// the outline: along the tops left→right, down, along the bottoms right→left
function shapePath(s: Shape, lift: number[] = []): string {
  const k = s.top.length
  let d = ""
  for (let i = 0; i < k; i++) {
    const t = s.top[i] - (lift[i] ?? 0)
    d += (i === 0 ? "M" : "L") + s.xs[i].toFixed(1) + " " + t.toFixed(1) + "L" + s.xs[i + 1].toFixed(1) + " " + t.toFixed(1)
  }
  for (let i = k - 1; i >= 0; i--) {
    const b = s.bot[i] + (lift[i] ?? 0)
    d += "L" + s.xs[i + 1].toFixed(1) + " " + b.toFixed(1) + "L" + s.xs[i].toFixed(1) + " " + b.toFixed(1)
  }
  return d + "Z"
}

// which column an x falls in
function columnAt(s: Shape, x: number): number {
  for (let i = 0; i < s.top.length; i++) if (x >= s.xs[i] && x < s.xs[i + 1]) return i
  return -1
}

function wrap(i: number, n: number): number {
  return n ? ((i % n) + n) % n : 0
}
// #endregion logic

/* ------------------------------------------------------- painted images */

const PALETTES = {
  dawn: { top: "#e7b7a5", bottom: "#f8e8d6", sun: "#fff4df", far: "#d2b2bb", near: "#3a2a3b", mist: "255,240,232" },
  alpine: { top: "#7ea5c8", bottom: "#e3ecf2", sun: "#ffffff", far: "#a9bfd0", near: "#1c3044", mist: "236,244,250" },
  dusk: { top: "#2a2450", bottom: "#ef8d60", sun: "#ffd9a6", far: "#93607c", near: "#18121f", mist: "255,196,160" },
  mist: { top: "#c4d0cb", bottom: "#eef1ec", sun: "#ffffff", far: "#aebcb5", near: "#2c3a33", mist: "246,248,245" },
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

// a layered-ridge landscape: sky, a low sun, five ridges fading into haze with
// mist between them, a tree line on the nearest, film grain — painted once
function paintLandscape(seed: number, palette: LandPalette, w = 1600, h = 960): string {
  if (typeof document === "undefined") return ""
  const c = document.createElement("canvas")
  c.width = w
  c.height = h
  const g = c.getContext("2d")
  if (!g) return ""
  const P = PALETTES[palette] ?? PALETTES.dawn
  const r = mulberry32(seed * 104729 + 7)

  // sky and sun
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

  // ridges, far to near
  const layers = 5
  for (let L = 0; L < layers; L++) {
    const k = L / (layers - 1)
    const base = h * (0.42 + k * 0.4)
    const amp = h * (0.07 + k * 0.1)
    const ph = Array.from({ length: 4 }, () => r() * Math.PI * 2)
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
    // mist rising off the ridge behind
    const mist = g.createLinearGradient(0, base - amp * 1.4, 0, base + amp * 0.4)
    mist.addColorStop(0, "rgba(" + P.mist + ",0)")
    mist.addColorStop(1, "rgba(" + P.mist + "," + (0.55 - k * 0.35).toFixed(2) + ")")
    g.fillStyle = mist
    g.fillRect(0, base - amp * 1.4, w, amp * 1.8)
    // the ridge itself: atmospheric perspective from haze to near-black
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
    // a tree line on the two nearest ridges
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

  // a soft vignette and film grain
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
  return c.toDataURL("image/jpeg", 0.9)
}

/* --------------------------------------------------------------- defaults */

const D_SLIDES: SteppedSlide[] = [
  { title: "Lavender Dawn", caption: "First light over the far ridges.", palette: "dawn", seed: 4 },
  { title: "Alpine Blue", caption: "Clear air, five valleys deep.", palette: "alpine", seed: 12 },
  { title: "Ember Dusk", caption: "The sun going down behind the pass.", palette: "dusk", seed: 23 },
  { title: "Morning Fog", caption: "Pines standing in the cloud line.", palette: "mist", seed: 31 },
]

/* -------------------------------------------------------------- component */

const VW = 1000

export default function SteppedMorphSlider({
  slides = D_SLIDES,
  columns = 7,
  autoplay = 5200,
  duration = 1100,
  aspect = 5 / 3,
  outline = "",
  background = "#f6f5f2",
  ink = "#121212",
  muted = "#8a8a86",
  accent = "#121212",
  onChange,
  className = "",
}: SteppedMorphSliderProps) {
  const uid = "sm" + React.useId().replace(/[^a-zA-Z0-9]/g, "")
  const VH = Math.round(VW / clamp(aspect, 0.6, 3))
  const K = clamp(Math.round(columns), 3, 16)
  const n = slides.length

  const [reduced, setReduced] = React.useState(false)
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const on = () => setReduced(mq.matches)
    on()
    mq.addEventListener?.("change", on)
    return () => mq.removeEventListener?.("change", on)
  }, [])

  // painted stand-ins for slides without an image (client-only)
  const [painted, setPainted] = React.useState([] as string[])
  const paintKey = slides.map((s, i) => (s.image ? "img" : (s.palette ?? "dawn") + (s.seed ?? i))).join("|")
  React.useEffect(() => {
    setPainted(slides.map((s, i) => (s.image ? "" : paintLandscape(s.seed ?? i + 1, s.palette ?? "dawn"))))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paintKey])
  const src = (i: number) => slides[wrap(i, n)]?.image || painted[wrap(i, n)] || ""

  const shapes = React.useMemo(
    () => slides.map((s, i) => makeShape(s.seed ?? i + 1, K, VW, VH)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paintKey, K, VH],
  )

  const [index, setIndex] = React.useState(0)
  const [prev, setPrev] = React.useState(0)
  const [p, setP] = React.useState(1)
  const [lift, setLift] = React.useState(new Array(K).fill(0) as number[])
  const [hover, setHover] = React.useState(-1)
  const indexRef = React.useRef(0)
  const [progress, setProgress] = React.useState(0)

  const go = (to: number) => {
    if (!n) return
    const cur = indexRef.current
    const nextIx = wrap(to, n)
    if (nextIx === cur) return
    indexRef.current = nextIx
    setPrev(cur)
    setIndex(nextIx)
    setP(reduced ? 1 : 0)
    setProgress(0)
    onChange?.(nextIx)
  }
  const next = () => go(indexRef.current + 1)
  const back = () => go(indexRef.current - 1)
  const nextRef = React.useRef(next)
  nextRef.current = next

  // the morph clock
  React.useEffect(() => {
    if (p >= 1) return
    let raf = 0
    const t0 = performance.now() - p * duration
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / Math.max(1, duration))
      setP(k)
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  // autoplay with a progress line; it only stops off-screen or under reduced motion
  const rootRef = React.useRef(null as HTMLDivElement | null)
  const [visible, setVisible] = React.useState(true)
  React.useEffect(() => {
    const el = rootRef.current
    if (!el || typeof IntersectionObserver !== "function") return
    const io = new IntersectionObserver((es) => setVisible(es.some((e) => e.isIntersecting)))
    io.observe(el)
    return () => io.disconnect()
  }, [])
  React.useEffect(() => {
    if (!autoplay || reduced || !visible || n < 2) return
    let raf = 0
    const t0 = performance.now() - progress * autoplay
    const tick = (now: number) => {
      const k = (now - t0) / autoplay
      if (k >= 1) {
        setProgress(0)
        nextRef.current()
        return
      }
      setProgress(k)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplay, reduced, visible, n, index])

  // hover lifts the column under the pointer (springy, settles back)
  React.useEffect(() => {
    if (reduced) return
    let raf = 0
    let last = 0
    const vel = new Array(K).fill(0)
    const cur = lift.slice(0, K)
    while (cur.length < K) cur.push(0)
    const tick = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016
      last = now
      let moving = false
      for (let i = 0; i < K; i++) {
        const target = hover === i ? 16 : 0
        vel[i] += (220 * (target - cur[i]) - 18 * vel[i]) * dt
        cur[i] += vel[i] * dt
        if (Math.abs(target - cur[i]) > 0.05 || Math.abs(vel[i]) > 0.05) moving = true
      }
      setLift(cur.slice())
      if (moving) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hover, reduced, K])

  const shape = n ? lerpShape(shapes[wrap(prev, n)], shapes[wrap(index, n)], p) : { xs: [0, VW], top: [0], bot: [VH] }
  const d = shapePath(shape, lift)

  /* pointer: hover column, drag/swipe to change */
  const drag = React.useRef({ x: 0, down: false, moved: false })
  const svgX = (e: PointerSvgEv) => {
    const r = e.currentTarget.getBoundingClientRect()
    return ((e.clientX - r.left) / r.width) * VW
  }
  const onMove = (e: PointerSvgEv) => {
    const col = columnAt(shape, svgX(e))
    if (col !== hover) setHover(col)
    if (drag.current.down && Math.abs(e.clientX - drag.current.x) > 8) drag.current.moved = true
  }
  const onDown = (e: PointerSvgEv) => {
    drag.current = { x: e.clientX, down: true, moved: false }
  }
  const onUp = (e: PointerSvgEv) => {
    const dx = e.clientX - drag.current.x
    const wasDrag = drag.current.moved
    drag.current.down = false
    if (wasDrag && Math.abs(dx) > 40) (dx < 0 ? next : back)()
    else if (!wasDrag) next()
  }
  const onLeave = () => {
    setHover(-1)
    drag.current.down = false
  }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault()
      next()
    } else if (e.key === "ArrowLeft") {
      e.preventDefault()
      back()
    }
  }

  const cur = slides[wrap(index, n)]
  const ease = easeInOutCubic(p)
  const pad = (v: number) => String(v).padStart(2, "0")

  return (
    <div
      ref={rootRef}
      className={"sm-root " + className}
      style={{ background, color: ink, ["--sm-ink" as string]: ink, ["--sm-muted" as string]: muted, ["--sm-accent" as string]: accent, ["--sm-bg" as string]: background } as React.CSSProperties}
    >
      <style>{SM_CSS}</style>
      <div className="sm-stage" role="region" aria-roledescription="carousel" aria-label="Image slider" tabIndex={0} onKeyDown={onKey}>
        <svg
          className="sm-svg"
          viewBox={"-20 -20 " + (VW + 40) + " " + (VH + 40)}
          preserveAspectRatio="xMidYMid meet"
          onPointerMove={onMove}
          onPointerDown={onDown}
          onPointerUp={onUp}
          onPointerLeave={onLeave}
          role="img"
          aria-label={cur ? cur.title + (cur.caption ? " — " + cur.caption : "") : "Slide"}
        >
          <defs>
            <clipPath id={uid + "clip"}>
              <path d={d} />
            </clipPath>
          </defs>
          <g clipPath={"url(#" + uid + "clip)"}>
            <rect x="-20" y="-20" width={VW + 40} height={VH + 40} fill={ink} />
            {p < 1 && src(prev) && (
              <image
                href={src(prev)}
                x="-20"
                y="-20"
                width={VW + 40}
                height={VH + 40}
                preserveAspectRatio="xMidYMid slice"
                opacity={1 - ease}
                style={{ transform: "scale(" + (1 + 0.06 * ease) + ")", transformOrigin: "50% 50%", transformBox: "fill-box" }}
              />
            )}
            {src(index) && (
              <image
                href={src(index)}
                x="-20"
                y="-20"
                width={VW + 40}
                height={VH + 40}
                preserveAspectRatio="xMidYMid slice"
                opacity={ease}
                style={{ transform: "scale(" + (1.08 - 0.08 * ease) + ")", transformOrigin: "50% 50%", transformBox: "fill-box" }}
              />
            )}
          </g>
          {outline && <path d={d} fill="none" stroke={outline} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />}
        </svg>
      </div>

      {/* story-style timeline: done, filling, still to come — each one a button */}
      <div className="sm-timeline" role="tablist" aria-label="Slides">
        {slides.map((s, i) => {
          const at = wrap(index, n)
          const fill = i < at ? 1 : i > at ? 0 : autoplay && !reduced ? progress : 1
          return (
            <button key={i} type="button" role="tab" className="sm-seg" aria-label={"Slide " + (i + 1) + ": " + s.title} aria-selected={i === at} onClick={() => go(i)}>
              <i style={{ transform: "scaleX(" + fill + ")" }} />
            </button>
          )
        })}
      </div>

      <div className="sm-bar">
        <div className="sm-count" aria-hidden="true">
          <b>{pad(wrap(index, n) + 1)}</b>
          <span>/ {pad(n)}</span>
        </div>
        <div className="sm-text" aria-live="polite">
          <h3 key={"t" + index} className="sm-title">
            {cur?.title}
          </h3>
          {cur?.caption && (
            <p key={"c" + index} className="sm-caption">
              {cur.caption}
            </p>
          )}
        </div>
        <div className="sm-nav">
          <button type="button" className="sm-arrow" onClick={back} aria-label="Previous slide">
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path d="M11 4 6 9l5 5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button type="button" className="sm-arrow" onClick={next} aria-label="Next slide">
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path d="m7 4 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

const SM_CSS = `
.sm-root{position:relative;width:100%;box-sizing:border-box;padding:clamp(16px,3vw,40px) clamp(14px,3vw,44px);font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}
.sm-root :where(*){box-sizing:border-box}
.sm-root :where(h3,p){margin:0;padding:0;font-size:inherit;font-weight:inherit}
.sm-root :where(button){font:inherit;color:inherit;background:none;border:0;padding:0;margin:0;cursor:pointer}
.sm-root :focus-visible{outline:2px solid var(--sm-accent);outline-offset:3px}
.sm-stage{position:relative;width:100%;max-width:1180px;margin:0 auto;outline:none}
.sm-svg{display:block;width:100%;height:auto;max-width:none;cursor:pointer;touch-action:pan-y;user-select:none;-webkit-user-select:none}
.sm-timeline{display:flex;gap:6px;max-width:1180px;margin:clamp(12px,2vw,20px) auto 0}
.sm-seg{position:relative;flex:1;height:16px}
.sm-seg::before,.sm-seg i{content:"";position:absolute;left:0;right:0;top:50%;height:3px;margin-top:-1.5px;border-radius:3px}
.sm-seg::before{background:color-mix(in srgb,var(--sm-ink) 14%,transparent);transition:background-color .2s}
.sm-seg:hover::before{background:color-mix(in srgb,var(--sm-ink) 30%,transparent)}
.sm-seg i{background:var(--sm-accent);transform-origin:0 50%}
.sm-bar{display:flex;align-items:center;gap:clamp(12px,2.4vw,28px);max-width:1180px;margin:clamp(10px,1.6vw,16px) auto 0}
.sm-count{flex:none;display:flex;align-items:baseline;gap:6px;font-variant-numeric:tabular-nums;color:var(--sm-muted);font-size:13px;letter-spacing:.04em}
.sm-count b{color:var(--sm-ink);font-size:clamp(28px,4vw,46px);font-weight:600;letter-spacing:-.03em;line-height:.9}
.sm-text{flex:1;min-width:0;overflow:hidden}
.sm-title{font-size:clamp(17px,2vw,24px);font-weight:600;letter-spacing:-.02em;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;animation:sm-up .6s cubic-bezier(.2,.8,.2,1) both}
.sm-caption{margin-top:3px;font-size:13.5px;color:var(--sm-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;animation:sm-up .6s .08s cubic-bezier(.2,.8,.2,1) both}
.sm-nav{flex:none;display:flex;gap:8px}
.sm-arrow{display:grid;place-items:center;width:42px;height:42px;border:1px solid color-mix(in srgb,var(--sm-ink) 22%,transparent);border-radius:99px;transition:border-color .2s,background-color .2s,color .2s}
.sm-arrow:hover{border-color:var(--sm-ink);background:var(--sm-ink);color:var(--sm-bg)}
@keyframes sm-up{from{opacity:0;transform:translateY(60%)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.sm-title,.sm-caption{animation:none}.sm-arrow,.sm-seg::before{transition:none}}
`

// event alias lives after the JSX so the 21st CLI tokenizer stays linear
type PointerSvgEv = React.PointerEvent<SVGSVGElement>
