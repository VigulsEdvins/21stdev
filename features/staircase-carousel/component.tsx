"use client"

import * as React from "react"

/**
 * Staircase Carousel — portrait photos on a staircase. The chosen photo sits
 * level, at full size, with its title beside it; every photo before it steps
 * up a whole storey and every photo after it steps down one, each shrunk a
 * little. Moving slides the strip along on a spring while the photos ease up
 * or down to their new step, and the title pops out as the next one pops in.
 *
 * The strip's spring is computed once and handed to CSS as a `linear()`
 * easing; the steps are plain CSS transitions; the titles are keyframe
 * animations. Nothing runs per frame in JavaScript. React is the only import.
 */

export type StaircaseItem = {
  title: string
  /** Image URL. Without one the photo is a soft gradient. */
  src?: string
  alt?: string
}

export type StaircaseCarouselProps = {
  items: StaircaseItem[]
  /** Root height. **Must be a definite length.** */
  height?: string
  /** Width of each photo, any CSS length. Photos are 3:4. */
  slideWidth?: string
  /** Scale of every photo that isn't chosen. */
  inactiveScale?: number
  /** How far each side steps, as a fraction of a photo's height. */
  step?: number
  /** Photo corner radius, px. */
  radius?: number
  /** Bounce of the strip's spring, 0 to about 0.5. */
  bounce?: number
  /** Roughly how long the strip takes, seconds. */
  duration?: number
  /** How long a photo takes to change step, seconds. */
  stepDuration?: number
  /** The chosen photo's title, beside it. */
  titles?: boolean
  /** Title size, any CSS length. */
  titleSize?: string
  controls?: boolean
  background?: string
  /** Text, dots and buttons. Defaults to the theme's foreground. */
  color?: string
  fontFamily?: string
  /** A stylesheet to load for `fontFamily`. Nothing loads by default. */
  fontHref?: string | null
  index?: number
  defaultIndex?: number
  onIndexChange?: (index: number) => void
  /** Clicking the photo that's already chosen. */
  onSelect?: (item: StaircaseItem, index: number) => void
  ariaLabel?: string
  className?: string
}

// #region motion
/** Which step photo i stands on: -1 a storey up (before), 0 level, 1 a storey down (after). */
export function stepOf(i: number, active: number): number {
  return i < active ? -1 : i > active ? 1 : 0
}

/** Photo i's transform, in the pen's order: translate, then scale. */
export function slideTransform(i: number, active: number, step: number, inactiveScale: number): string {
  const s = stepOf(i, active)
  return "translateY(" + s * step * 100 + "%) scale(" + (s === 0 ? 1 : inactiveScale) + ")"
}

export function springAt(t: number, bounce: number, duration: number): number {
  const zeta = 1 - Math.min(Math.max(bounce, 0), 0.9)
  const w = (2 * Math.PI) / Math.max(duration, 0.05)
  if (zeta >= 1) return 1 - Math.exp(-w * t) * (1 + w * t)
  const wd = w * Math.sqrt(1 - zeta * zeta)
  return 1 - Math.exp(-zeta * w * t) * (Math.cos(wd * t) + ((zeta * w) / wd) * Math.sin(wd * t))
}

/** The spring as a CSS easing, sampled until its envelope is within 0.1%. */
export function springEasing(bounce: number, duration: number, samples = 48): { easing: string; ms: number } {
  const zeta = 1 - Math.min(Math.max(bounce, 0), 0.9)
  const w = (2 * Math.PI) / Math.max(duration, 0.05)
  const T = Math.log(1000) / (zeta * w)
  const pts: string[] = []
  for (let k = 0; k <= samples; k++) {
    const v = k === samples ? 1 : springAt((k / samples) * T, bounce, duration)
    pts.push(+v.toFixed(4) + "")
  }
  return { easing: "linear(" + pts.join(", ") + ")", ms: Math.round(T * 1000) }
}

export function clampIndex(i: number, n: number): number {
  return n <= 0 ? 0 : Math.min(Math.max(Math.round(i), 0), n - 1)
}
// #endregion

const CSS =
  // isolate: the title sits at z-index -1, behind the photos but above the root's background
  ".stc-root{position:relative;isolation:isolate;overflow:hidden;display:grid;place-items:center;width:100%;" +
  "color:var(--color-foreground,#262626);user-select:none;-webkit-user-select:none;touch-action:pan-y;" +
  "outline:none;-webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent}" +
  ".stc-root:focus-visible{box-shadow:inset 0 0 0 2px var(--color-primary,#171717)}" +
  ".stc-stage{position:relative}" +
  ".stc-strip{display:flex;width:max-content}" +
  ".stc-slide{flex-shrink:0;display:block;margin:0;padding:0;border:0;aspect-ratio:3/4;overflow:hidden;" +
  "cursor:pointer;will-change:transform;background:color-mix(in oklab,currentColor 10%,transparent);" +
  "-webkit-tap-highlight-color:transparent}" +
  ".stc-slide:focus-visible{outline:2px solid currentColor;outline-offset:4px}" +
  ".stc-slide>img{width:100%;height:100%;max-width:none;display:block;object-fit:cover;pointer-events:none}" +
  ".stc-titles{position:absolute;left:100%;top:0;bottom:0;margin-left:12px;z-index:-1;pointer-events:none}" +
  ".stc-title{position:absolute;left:0;top:0;bottom:0;display:flex;align-items:center;white-space:nowrap;" +
  "font-weight:500;transform-origin:0 50%}" +
  // On a phone there's no room beside the photo; under it is free (the next photo is a step down and over).
  "@media (max-width:640px){.stc-titles{left:0;right:0;top:100%;bottom:auto;height:24px;margin:6px 0 0;z-index:1}" +
  ".stc-title{left:0;right:0;justify-content:center;transform-origin:50% 50%;font-size:15px}}" +
  "@keyframes stc-in{from{opacity:0;transform:scale(.5);filter:blur(2px)}to{opacity:1;transform:scale(1);filter:blur(0)}}" +
  "@keyframes stc-out{from{opacity:1;transform:scale(1);filter:blur(0)}to{opacity:0;transform:scale(.5);filter:blur(2px)}}" +
  ".stc-controls{position:absolute;bottom:16px;left:50%;transform:translateX(-50%);z-index:1;display:flex;" +
  "align-items:center;gap:16px;padding:0 8px;border-radius:999px;" +
  "background:color-mix(in oklab,currentColor 7%,transparent);" +
  "border:1px solid color-mix(in oklab,currentColor 12%,transparent);" +
  "-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);" +
  "box-shadow:0 1px 3px rgba(0,0,0,.08),0 1px 2px -1px rgba(0,0,0,.08)}" +
  ".stc-btn{display:grid;place-items:center;margin:0;padding:8px;border:0;border-radius:999px;background:none;" +
  "color:inherit;cursor:pointer;transition:opacity .2s,transform .2s}" +
  ".stc-btn:disabled{opacity:.3;cursor:default}" +
  ".stc-btn:not(:disabled):active{transform:scale(.88)}" +
  ".stc-btn:focus-visible,.stc-dot:focus-visible{outline:2px solid currentColor;outline-offset:2px}" +
  ".stc-dots{min-width:180px;display:flex;justify-content:center;align-items:center;gap:8px}" +
  ".stc-dot{position:relative;width:8px;height:8px;margin:0;padding:0;border:0;border-radius:999px;" +
  "background:currentColor;opacity:.3;cursor:pointer;transition:width .3s,opacity .3s}" +
  ".stc-dot::after{content:\"\";position:absolute;inset:-10px -4px}" +
  ".stc-dot[aria-current]{width:28px;opacity:1}" +
  ".stc-count{font-size:13px;font-variant-numeric:tabular-nums}" +
  ".stc-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}" +
  "@media (prefers-reduced-motion:reduce){.stc-strip,.stc-slide{transition:none !important}" +
  ".stc-title{animation:none !important}.stc-title[data-out]{display:none}.stc-dot,.stc-btn{transition:none}}"

function Chevron({ dir }: { dir: -1 | 1 }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ maxWidth: "none" }}>
      <path d={dir < 0 ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
    </svg>
  )
}

const pad = (n: number) => (n < 10 ? "0" + n : "" + n)

const blank = (i: number) => {
  const h = (i * 47 + 200) % 360
  return "linear-gradient(160deg, hsl(" + h + " 30% 80%), hsl(" + ((h + 40) % 360) + " 26% 58%))"
}

export default function StaircaseCarousel({
  items,
  height = "100svh",
  slideWidth = "clamp(120px, 20vw, 240px)",
  inactiveScale = 0.8,
  step = 1,
  radius = 0,
  bounce = 0.1,
  duration = 0.8,
  stepDuration = 0.6,
  titles = true,
  titleSize = "20px",
  controls = true,
  color,
  background = "color-mix(in oklab, var(--color-foreground, #000) 7%, var(--color-background, #fff))",
  fontFamily = '"Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif',
  fontHref = null,
  index,
  defaultIndex = 2,
  onIndexChange,
  onSelect,
  ariaLabel = "Photo carousel",
  className = "",
}: StaircaseCarouselProps) {
  const n = items.length
  const [inner, setInner] = React.useState(clampIndex(index ?? defaultIndex, n))
  const active = index == null ? clampIndex(inner, n) : clampIndex(index, n)
  const strip = React.useMemo(() => springEasing(bounce, duration), [bounce, duration])
  const pop = React.useMemo(() => springEasing(0.2, 0.8), [])
  const swipe = React.useRef({ id: -1, x: 0, done: false })

  // The title on show plus any still popping out. Keys only ever grow, so a
  // title that comes back while its old self is leaving gets a fresh element.
  const seq = React.useRef(0)
  const [shown, setShown] = React.useState([{ key: 0, i: active, out: false }])
  React.useEffect(() => {
    setShown((list) => {
      const cur = list.find((t) => !t.out)
      if (cur && cur.i === active) return list
      seq.current += 1
      return [...list.map((t) => ({ ...t, out: true })), { key: seq.current, i: active, out: false }]
    })
    const t = window.setTimeout(() => setShown((list) => list.filter((x) => !x.out)), pop.ms)
    return () => window.clearTimeout(t)
  }, [active, pop.ms])

  React.useEffect(() => {
    if (!fontHref) return
    const exists = Array.from(document.querySelectorAll("link[rel=stylesheet]")).some(
      (l) => (l as HTMLLinkElement).href === fontHref,
    )
    if (exists) return
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = fontHref
    link.setAttribute("data-staircase-font", "")
    document.head.appendChild(link)
  }, [fontHref])

  const go = (i: number) => {
    const next = clampIndex(i, n)
    if (next === active) return
    setInner(next)
    onIndexChange?.(next)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    let to = -1
    if (e.key === "ArrowRight" || e.key === "ArrowDown") to = active + 1
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") to = active - 1
    else if (e.key === "Home") to = 0
    else if (e.key === "End") to = n - 1
    else return
    e.preventDefault()
    go(to)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    swipe.current = { id: e.pointerId, x: e.clientX, done: false }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const s = swipe.current
    if (s.id !== e.pointerId || s.done) return
    const dx = e.clientX - s.x
    if (Math.abs(dx) > 40) {
      s.done = true
      go(active + (dx < 0 ? 1 : -1))
    }
  }
  const onPointerEnd = () => {
    swipe.current.id = -1
    window.setTimeout(() => {
      swipe.current.done = false
    }, 0)
  }

  const stepTransition = "transform " + stepDuration * 1000 + "ms ease-in-out"
  const current = items[active]

  return (
    <div
      className={"stc-root " + className}
      style={{ height, background, color, fontFamily }}
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      <style>{CSS}</style>

      <div className="stc-stage" style={{ width: slideWidth, ["--stc-w" as string]: slideWidth } as React.CSSProperties}>
        <div
          className="stc-strip"
          style={{
            transform: "translateX(calc(" + -active + " * var(--stc-w)))",
            transition: "transform " + strip.ms + "ms " + strip.easing,
          }}
        >
          {items.map((item, i) => {
            const isActive = i === active
            return (
              <button
                key={i}
                type="button"
                className="stc-slide"
                aria-label={i + 1 + " of " + n + ": " + item.title}
                aria-current={isActive ? "true" : undefined}
                tabIndex={isActive ? 0 : -1}
                onClick={() => {
                  if (swipe.current.done) return
                  if (isActive) onSelect?.(item, i)
                  else go(i)
                }}
                style={{
                  width: slideWidth,
                  borderRadius: radius,
                  transform: slideTransform(i, active, step, inactiveScale),
                  transition: stepTransition,
                  background: item.src ? undefined : blank(i),
                }}
              >
                {item.src ? (
                  <img src={item.src} alt={item.alt ?? item.title} draggable={false} decoding="async" width={300} height={400} style={{ maxWidth: "none" }} />
                ) : null}
              </button>
            )
          })}
        </div>

        {titles ? (
          <div className="stc-titles" aria-hidden="true" style={{ fontSize: titleSize }}>
            {shown.map((t) => (
              <div
                key={t.key}
                className="stc-title"
                data-out={t.out ? "" : undefined}
                style={{ animation: (t.out ? "stc-out " : "stc-in ") + pop.ms + "ms " + pop.easing + " both" }}
              >
                {items[t.i]?.title}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {controls && n > 1 ? (
        <div className="stc-controls" onPointerDown={(e) => e.stopPropagation()}>
          <button type="button" className="stc-btn" aria-label="Previous slide" disabled={active <= 0} onClick={() => go(active - 1)}>
            <Chevron dir={-1} />
          </button>
          <div className="stc-dots">
            {n > 14 ? (
              <span className="stc-count">
                {pad(active + 1)} / {pad(n)}
              </span>
            ) : (
              items.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  className="stc-dot"
                  aria-label={"Go to slide " + (i + 1) + ": " + item.title}
                  aria-current={i === active ? "true" : undefined}
                  onClick={() => go(i)}
                />
              ))
            )}
          </div>
          <button type="button" className="stc-btn" aria-label="Next slide" disabled={active >= n - 1} onClick={() => go(active + 1)}>
            <Chevron dir={1} />
          </button>
        </div>
      ) : null}

      <div className="stc-sr" aria-live="polite" aria-atomic="true">
        {current ? "Slide " + (active + 1) + " of " + n + ": " + current.title : ""}
      </div>
    </div>
  )
}
