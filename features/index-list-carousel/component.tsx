"use client"

import * as React from "react"

/*
 * Index List Carousel — a typographic index: big numbered titles on one side,
 * one picture on the other. Hover or tap a title and its picture wipes in
 * over the last one, from the right going down the list and from the left
 * going back up. The active row opens to show its caption.
 *
 * Hover, tap, ↑/↓ or ←/→, and autoplay that waits while the pointer is inside.
 * Slides without an `image` get a painted landscape, so it works with no
 * assets at all. Page colours follow the theme tokens.
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

export type IndexListCarouselProps = {
  slides?: Slide[]
  /** Any CSS length. Default 100svh. */
  height?: number | string
  /** Small label above the list. */
  label?: string
  /** Put the picture on the left instead. */
  imageSide?: "left" | "right"
  /** ms per row; 0 turns autoplay off. */
  autoplay?: number
  background?: string
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

/**
 * Which layer a picture is: the one wiping in, the one it covers, or hidden
 * to the right (further down the list) or left (further up). A hidden picture
 * waits clipped on the side it will wipe in from.
 */
export function layerOf(i: number, active: number, previous: number): "on" | "was" | "after" | "before" {
  return i === active ? "on" : i === previous ? "was" : i > active ? "after" : "before"
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

const IL_CSS = [
  ".il-root{position:relative;width:100%;display:grid;grid-template-columns:minmax(260px,42%) 1fr;gap:clamp(16px,3vw,48px);padding:clamp(16px,4vw,56px);box-sizing:border-box;overflow:hidden;background:var(--il-bg);color:var(--il-ink);outline:none}",
  ".il-root[data-side='left']{grid-template-columns:1fr minmax(260px,42%)}",
  ".il-root[data-side='left'] .il-list{order:2}",
  ".il-root:focus-visible{box-shadow:inset 0 0 0 2px var(--il-ink)}",
  ".il-list{display:flex;flex-direction:column;justify-content:center;min-height:0;overflow:auto;scrollbar-width:none}",
  ".il-list::-webkit-scrollbar{display:none}",
  ".il-label{display:flex;justify-content:space-between;margin-bottom:clamp(12px,2.4vh,24px);font:500 12px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--il-muted)}",
  ".il-row{appearance:none;display:grid;grid-template-columns:auto 1fr;column-gap:14px;align-items:baseline;width:100%;padding:10px 0;border:0;border-bottom:1px solid var(--il-line);background:transparent;color:var(--il-faint);text-align:left;cursor:pointer;transition:color .35s ease,padding .45s cubic-bezier(.2,.7,.2,1)}",
  ".il-row:first-of-type{border-top:1px solid var(--il-line)}",
  ".il-row[data-on='1']{color:var(--il-ink);padding-left:12px}",
  ".il-row:focus-visible{outline:2px solid var(--il-ink);outline-offset:2px}",
  ".il-num{font:500 11px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.1em;color:var(--il-muted)}",
  ".il-title{font:500 clamp(22px,3.2vw,44px)/1.1 ui-serif,Georgia,'Times New Roman',serif;letter-spacing:-.01em}",
  ".il-more{grid-column:2;display:grid;grid-template-rows:0fr;transition:grid-template-rows .45s cubic-bezier(.2,.7,.2,1)}",
  ".il-row[data-on='1'] .il-more{grid-template-rows:1fr}",
  ".il-more>span{overflow:hidden;font:400 13px/1.45 ui-sans-serif,system-ui,sans-serif;color:var(--il-muted);padding-top:2px}",
  ".il-pane{position:relative;min-height:0;overflow:hidden;border-radius:4px;background:var(--il-line)}",
  ".il-pane img{position:absolute;inset:0;width:100%;height:100%;max-width:none;object-fit:cover;display:block;visibility:hidden;transform:scale(1.08)}",
  ".il-pane img[data-l='on']{visibility:visible;z-index:2;clip-path:inset(0 0 0 0);transform:none;transition:clip-path .85s cubic-bezier(.7,0,.2,1),transform 1.3s cubic-bezier(.2,.7,.2,1)}",
  ".il-pane img[data-l='was']{visibility:visible;z-index:1;transform:none}",
  ".il-pane img[data-l='after']{clip-path:inset(0 0 0 100%)}",
  ".il-pane img[data-l='before']{clip-path:inset(0 100% 0 0)}",
  ".il-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}",
  "@media (max-width:720px){.il-root,.il-root[data-side='left']{grid-template-columns:1fr;grid-template-rows:minmax(0,46%) 1fr}.il-root .il-list{order:2;justify-content:flex-start}.il-pane{order:1}}",
  "@media (prefers-reduced-motion:reduce){.il-pane img{transition:none!important;transform:none}.il-row,.il-more{transition:none}}",
].join("\n")

export default function IndexListCarousel({
  slides = DEFAULT_SLIDES,
  height = "100svh",
  label = "Index",
  imageSide = "right",
  autoplay = 4500,
  background = "var(--color-background, #f2efe8)",
  ink = "var(--color-foreground, #161513)",
  onChange,
  className,
  style,
  ariaLabel = "Image carousel",
}: IndexListCarouselProps) {
  const n = slides.length
  const srcs = useSlideImages(slides)
  const [state, setState] = React.useState({ active: 0, previous: -1 })
  const rootRef = React.useRef(null as HTMLDivElement | null)
  const inside = React.useRef(false)
  const lastTouch = React.useRef(0)
  const { active, previous } = state

  const show = React.useCallback((i: number) => {
    setState((s) => (s.active === i ? s : { active: i, previous: s.active }))
  }, [])

  React.useEffect(() => {
    onChange?.(active)
  }, [active, onChange])

  React.useEffect(() => {
    if (!autoplay || n < 2) return
    const root = rootRef.current
    let seen = true
    const io = new IntersectionObserver(([e]) => (seen = e.isIntersecting))
    if (root) io.observe(root)
    const t = window.setInterval(() => {
      if (!seen || document.hidden || inside.current || performance.now() - lastTouch.current < autoplay) return
      setState((s) => ({ active: wrap(s.active + 1, n), previous: s.active }))
    }, autoplay)
    return () => {
      window.clearInterval(t)
      io.disconnect()
    }
  }, [autoplay, n])

  const touch = () => (lastTouch.current = performance.now())
  const onKey = (e: React.KeyboardEvent) => {
    let d = 0
    if (e.key === "ArrowDown" || e.key === "ArrowRight") d = 1
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") d = -1
    else return
    e.preventDefault()
    touch()
    show(wrap(active + d, n))
  }

  const s = slides[active] || {}

  return (
    <div
      ref={rootRef}
      className={["il-root", className].filter(Boolean).join(" ")}
      style={{
        height,
        ["--il-bg" as string]: background,
        ["--il-ink" as string]: ink,
        ["--il-muted" as string]: "color-mix(in srgb, var(--il-ink) 55%, transparent)",
        ["--il-faint" as string]: "color-mix(in srgb, var(--il-ink) 28%, transparent)",
        ["--il-line" as string]: "color-mix(in srgb, var(--il-ink) 12%, transparent)",
        ...style,
      }}
      data-side={imageSide}
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={onKey}
      onPointerEnter={(e) => e.pointerType === "mouse" && (inside.current = true)}
      onPointerLeave={() => (inside.current = false)}
    >
      <style>{IL_CSS}</style>
      <div className="il-list">
        <div className="il-label" aria-hidden="true">
          <span>{label}</span>
          <span>{pad2(n)}</span>
        </div>
        {slides.map((sl, i) => (
          <button
            key={i}
            type="button"
            className="il-row"
            data-on={i === active ? "1" : "0"}
            aria-current={i === active ? "true" : undefined}
            onMouseEnter={() => show(i)}
            onFocus={() => show(i)}
            onClick={() => (touch(), show(i))}
          >
            <span className="il-num">{pad2(i + 1)}</span>
            <span className="il-title">{sl.title || "Untitled"}</span>
            {sl.caption ? (
              <span className="il-more">
                <span>{sl.caption}</span>
              </span>
            ) : null}
          </button>
        ))}
      </div>
      <div className="il-pane">
        {slides.map((sl, i) =>
          srcs[i] ? <img key={i} src={srcs[i]} alt={i === active ? sl.alt || sl.title || "" : ""} data-l={layerOf(i, active, previous)} draggable={false} /> : null,
        )}
      </div>
      <div className="il-sr" aria-live="polite">
        {(s.title || "Slide " + (active + 1)) + ", " + (active + 1) + " of " + n}
      </div>
    </div>
  )
}
