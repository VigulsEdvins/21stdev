"use client"

import * as React from "react"

/**
 * Alter Ego Mask Reveal: a portrait landing page with a secret.
 *
 * A quiet civilian portrait sits on a charcoal backdrop. Move the pointer over
 * it and a gooey, liquid blob follows you, uncovering the masked hero
 * underneath, but only where you have been. The trail melts back within a
 * second, so the mask closes up behind you and disappears once you leave. Click
 * (or press Enter) to suit up completely; click again to take the mask off.
 *
 * Ships with a civilian portrait and the masked hero as defaults (embedded,
 * so nothing is fetched). Pass `baseSrc` / `revealSrc` for your own two shots
 * and line the faces up with `revealFit`. React is the only import.
 */

export interface AlterEgoMaskRevealProps {
  /** Big stretched word behind the civilian. */
  word?: string
  /** Big stretched word behind the hero, seen through the mask. */
  revealWord?: string
  /** Civilian name line, top left. */
  name?: string
  /** Hero line, top left, seen through the mask. */
  revealName?: string
  /** Small label above the name. */
  label?: string
  /** Small label above the hero line. */
  revealLabel?: string
  /** Line along the bottom edge. Empty hides it. */
  caption?: string
  /** Hint shown until the first interaction. Empty hides it. */
  hint?: string
  /** Civilian photo, shown first. 3:4 works best. */
  baseSrc?: string
  /** Hero photo, seen through the goo. */
  revealSrc?: string
  /** Nudge `revealSrc` so its face lands on the base face: offsets in % of the portrait, scale 1 = cover.
   *  Defaults to the fit for the built-in photos, or no nudge when you pass your own `revealSrc`. */
  revealFit?: { x?: number; y?: number; scale?: number }
  /** Brush radius, in 1/1000ths of the stage height. */
  brush?: number
  /** How long the trail lingers before it melts away (ms). */
  linger?: number
  /** Suit colour, the rim of the blob and the hero word. */
  accent?: string
  /** Civilian backdrop. */
  backdrop?: string
  /** Hero backdrop. */
  revealBackdrop?: string
  /** A ghost pointer circles the face until someone interacts. */
  autoPeek?: boolean
  /** Font stack for the big words. Any bold condensed face; nothing is loaded. */
  fontFamily?: string
  /** Stage height. A definite length, never a percentage. */
  height?: string
  /** Extra root class names. */
  className?: string
}

// #region trail
export type Blob = { x: number; y: number; r: number; age: number; life: number; size: number; seed: number }

export const clamp01 = (x: number) => (x <= 0 ? 0 : x > 1 ? 1 : x)

/** Radius of a trail blob over its life: swells in fast, holds, then melts. */
export function blobRadius(age: number, life: number, size: number) {
  if (age <= 0 || age >= life) return 0
  const grow = Math.min(140, life * 0.25)
  if (age < grow) {
    // easeOutBack: a little over-full, like a drop landing
    const u = age / grow - 1
    return size * (1 + 2.70158 * u * u * u + 1.70158 * u * u)
  }
  const t = (age - grow) / (life - grow)
  return size * (1 - t * t * t)
}

/** Points to stamp between two pointer samples, so fast moves leave no gaps. */
export function stampsBetween(ax: number, ay: number, bx: number, by: number, spacing: number) {
  const d = Math.hypot(bx - ax, by - ay)
  const n = Math.min(12, Math.floor(d / Math.max(1, spacing)))
  const out: [number, number][] = []
  for (let i = 1; i <= n; i++) out.push([ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n])
  return out
}

/** Frame-rate independent approach of `v` towards `to`. */
export function approach(v: number, to: number, rate: number, dt: number) {
  return to + (v - to) * Math.exp(-rate * dt)
}

/** Where the portrait sits in a stage `vw` wide and 1000 tall: bottom anchored, centred. */
export function portraitBox(vw: number) {
  const s = Math.min(930 / 800, (vw * 0.98) / 600)
  return { s, x: (vw - 600 * s) / 2, y: 1000 - 800 * s }
}
// #endregion

const MAX = 40
const FLOOD = 0
const HEAD = 1
const PEEK = 2
const FIRST_TRAIL = 3

const AEM_CSS = `
.aem-root { position: relative; overflow: hidden; isolation: isolate; user-select: none; -webkit-user-select: none; touch-action: pan-y; cursor: crosshair; outline: none; }
.aem-root:focus-visible { box-shadow: inset 0 0 0 2px var(--aem-accent); }
.aem-svg { position: absolute; inset: 0; display: block; width: 100%; height: 100%; max-width: none; }
.aem-hint { position: absolute; left: 50%; bottom: 7%; transform: translateX(-50%); display: flex; align-items: center; gap: 10px; padding: 8px 14px 8px 12px; border-radius: 999px; font: 500 11px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: 0.22em; text-transform: uppercase; color: #ece6dc; background: rgba(10, 12, 13, 0.55); border: 1px solid rgba(236, 230, 220, 0.16); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); pointer-events: none; transition: opacity 600ms ease, transform 600ms ease; white-space: nowrap; }
.aem-hint[data-gone="true"] { opacity: 0; transform: translate(-50%, 8px); }
.aem-dot { position: relative; width: 8px; height: 8px; border-radius: 50%; background: var(--aem-accent); }
.aem-dot::after { content: ""; position: absolute; inset: -5px; border-radius: 50%; border: 1px solid var(--aem-accent); animation: aem-ping 1.8s cubic-bezier(0.2, 0.7, 0.3, 1) infinite; }
@keyframes aem-ping { from { transform: scale(0.4); opacity: 1; } to { transform: scale(1.6); opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  .aem-dot::after { animation: none; }
  .aem-hint { transition: none; }
}
`

const DEFAULT_FONT = "Anton, 'Bebas Neue', Oswald, Impact, 'Arial Narrow', sans-serif"
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"

/** A radial web: spokes from a centre plus sagging rings between them. */
function webPath(cx: number, cy: number, spokes: number, rings: number[], tilt = 0) {
  let d = ""
  const ang = (i: number) => tilt + (i / spokes) * Math.PI * 2
  const far = rings[rings.length - 1] * 1.4
  for (let i = 0; i < spokes; i++) {
    const a = ang(i)
    d += `M${cx.toFixed(1)} ${cy.toFixed(1)}L${(cx + Math.cos(a) * far).toFixed(1)} ${(cy + Math.sin(a) * far).toFixed(1)}`
  }
  for (const r of rings) {
    for (let i = 0; i < spokes; i++) {
      const a0 = ang(i)
      const a1 = ang(i + 1)
      const am = (a0 + a1) / 2
      const x0 = cx + Math.cos(a0) * r
      const y0 = cy + Math.sin(a0) * r
      const x1 = cx + Math.cos(a1) * r
      const y1 = cy + Math.sin(a1) * r
      const qr = r * 0.86
      d += `M${x0.toFixed(1)} ${y0.toFixed(1)}Q${(cx + Math.cos(am) * qr).toFixed(1)} ${(cy + Math.sin(am) * qr).toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`
    }
  }
  return d
}

export default function AlterEgoMaskReveal({
  word = "PARKER",
  revealWord = "THWIP!",
  name = "Peter Parker",
  revealName = "Your friendly neighbour",
  label = "File 001 · Civilian",
  revealLabel = "File 001 · Masked",
  caption = "Queens, NY — 40.7282° N, 73.7949° W",
  hint = "Hover his face",
  baseSrc = BASE_PHOTO,
  revealSrc = REVEAL_PHOTO,
  revealFit,
  brush = 78,
  linger = 950,
  accent = "#e23a44",
  backdrop = "#20272b",
  revealBackdrop = "#0b0b0c",
  autoPeek = true,
  fontFamily = DEFAULT_FONT,
  height = "100svh",
  className = "",
}: AlterEgoMaskRevealProps) {
  const rootRef = React.useRef<HTMLDivElement>(null)
  const svgRef = React.useRef<SVGSVGElement>(null)
  const circleRefs = React.useRef<(SVGCircleElement | null)[]>([])
  const [vw, setVw] = React.useState(1600)
  const [touched, setTouched] = React.useState(false)

  const rawId = React.useId()
  const uid = "aem" + rawId.replace(/[^a-zA-Z0-9_-]/g, "")
  const id = React.useCallback((s: string) => uid + "-" + s, [uid])

  // Mutable simulation state, read by the animation loop.
  const sim = React.useRef({
    blobs: Array.from({ length: MAX }, (): Blob => ({ x: 0, y: 0, r: 0, age: 0, life: 0, size: 0, seed: 0 })),
    next: FIRST_TRAIL,
    px: 0,
    py: 0,
    inside: false,
    last: null as null | [number, number],
    flood: false,
    touched: false,
    reduced: false,
    raf: 0,
    t0: 0,
    vw: 1600,
  })

  const box = portraitBox(vw)
  // The brush is sized for a full-height portrait; on a narrow stage it shrinks with the face.
  const brushAt = React.useCallback((w: number) => brush * (portraitBox(w).s / (930 / 800)), [brush])

  // ---- stage size → viewBox width ----------------------------------------------
  React.useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) {
        const w = Math.round((1000 * r.width) / r.height)
        sim.current.vw = w
        setVw(w)
      }
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ---- animation loop ----------------------------------------------------------
  const tick = React.useCallback(
    (now: number) => {
      const S = sim.current
      const dt = Math.min(0.05, (now - (S.t0 || now)) / 1000)
      S.t0 = now
      const b = S.blobs
      let alive = false

      // flood: the whole-suit reveal
      const W = S.vw
      const full = Math.hypot(W, 1000) * 1.05
      b[FLOOD].r = S.reduced ? (S.flood ? full : 0) : approach(b[FLOOD].r, S.flood ? full : 0, S.flood ? 3.2 : 4.5, dt)
      if (b[FLOOD].r < 1) b[FLOOD].r = 0
      if (b[FLOOD].r > 0 || S.flood) alive = true

      // head: sits under the pointer while it is over the stage
      const hs = brushAt(W) * 1.05
      b[HEAD].x = S.reduced ? S.px : approach(b[HEAD].x, S.px, 22, dt)
      b[HEAD].y = S.reduced ? S.py : approach(b[HEAD].y, S.py, 22, dt)
      b[HEAD].r = approach(b[HEAD].r, S.inside ? hs : 0, S.inside ? 12 : 7, dt)
      if (b[HEAD].r < 0.5) b[HEAD].r = 0
      if (b[HEAD].r > 0 || S.inside) alive = true

      // peek: a ghost pointer that circles the face until someone interacts
      if (autoPeek && !S.touched && !S.reduced) {
        const bx = portraitBox(W)
        const t = now / 1000
        const cx = bx.x + 300 * bx.s
        const cy = bx.y + 360 * bx.s
        const phase = (t % 5.2) / 5.2
        const on = Math.sin(Math.PI * clamp01(phase * 1.3)) // swell in and out each loop
        b[PEEK].x = cx + Math.cos(t * 1.25) * 88 * bx.s
        b[PEEK].y = cy + Math.sin(t * 1.9) * 70 * bx.s
        b[PEEK].r = brushAt(W) * 1.1 * on * on
        alive = true
      } else {
        b[PEEK].r = approach(b[PEEK].r, 0, 6, dt)
        if (b[PEEK].r < 0.5) b[PEEK].r = 0
        else alive = true
      }

      // trail
      for (let i = FIRST_TRAIL; i < MAX; i++) {
        const k = b[i]
        if (k.life <= 0) continue
        k.age += dt * 1000
        k.r = blobRadius(k.age, k.life, k.size)
        if (k.age >= k.life) {
          k.life = 0
          k.r = 0
        } else {
          alive = true
          if (!S.reduced) {
            // a slow drip: melting blobs sag a little
            k.y += dt * 18 * (k.age / k.life)
            k.x += Math.sin(now / 400 + k.seed * 6.28) * dt * 6
          }
        }
      }

      for (let i = 0; i < MAX; i++) {
        const c = circleRefs.current[i]
        if (!c) continue
        c.setAttribute("cx", b[i].x.toFixed(1))
        c.setAttribute("cy", b[i].y.toFixed(1))
        c.setAttribute("r", Math.max(0, b[i].r).toFixed(1))
      }

      S.raf = alive ? requestAnimationFrame(tick) : 0
      if (!alive) S.t0 = 0
    },
    [autoPeek, brushAt],
  )

  const wake = React.useCallback(() => {
    const S = sim.current
    if (!S.raf) S.raf = requestAnimationFrame(tick)
  }, [tick])

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const set = () => {
      sim.current.reduced = mq.matches
      wake()
    }
    set()
    mq.addEventListener("change", set)
    return () => {
      mq.removeEventListener("change", set)
      cancelAnimationFrame(sim.current.raf)
      sim.current.raf = 0
    }
  }, [wake])

  // ---- pointer → stage coordinates ---------------------------------------------
  const toStage = (clientX: number, clientY: number): [number, number] | null => {
    const svg = svgRef.current
    const m = svg?.getScreenCTM()
    if (!svg || !m) return null
    const p = new DOMPoint(clientX, clientY).matrixTransform(m.inverse())
    return [p.x, p.y]
  }

  const markTouched = () => {
    if (!sim.current.touched) {
      sim.current.touched = true
      setTouched(true)
    }
  }

  const stamp = (x: number, y: number) => {
    const S = sim.current
    const k = S.blobs[S.next]
    S.next = S.next + 1 >= MAX ? FIRST_TRAIL : S.next + 1
    const seed = Math.random()
    k.x = x
    k.y = y
    k.age = 0
    k.seed = seed
    k.size = brushAt(S.vw) * (0.72 + seed * 0.42)
    k.life = S.reduced ? linger * 0.6 : linger * (0.8 + seed * 0.4)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const p = toStage(e.clientX, e.clientY)
    if (!p) return
    const S = sim.current
    markTouched()
    if (!S.inside) {
      S.inside = true
      S.blobs[HEAD].x = p[0]
      S.blobs[HEAD].y = p[1]
    }
    S.px = p[0]
    S.py = p[1]
    if (!S.last) {
      stamp(p[0], p[1])
      S.last = p
    } else {
      const dots = stampsBetween(S.last[0], S.last[1], p[0], p[1], brushAt(S.vw) * 0.42)
      for (const [x, y] of dots) stamp(x, y)
      if (dots.length) S.last = p
    }
    wake()
  }

  const onPointerLeave = () => {
    const S = sim.current
    S.inside = false
    S.last = null
    wake()
  }

  const toggleSuit = (x?: number, y?: number) => {
    const S = sim.current
    markTouched()
    if (!S.flood) {
      const bx = portraitBox(S.vw)
      S.blobs[FLOOD].x = x ?? bx.x + 300 * bx.s
      S.blobs[FLOOD].y = y ?? bx.y + 350 * bx.s
    }
    S.flood = !S.flood
    wake()
  }

  const onClick = (e: React.MouseEvent) => {
    const p = toStage(e.clientX, e.clientY)
    toggleSuit(p?.[0], p?.[1])
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      toggleSuit()
    }
  }

  // ---- layout ------------------------------------------------------------------
  const wordW = vw * 0.94
  const wordSize = Math.min(360, wordW / Math.max(3, word.length) * 1.55, wordW / Math.max(3, revealWord.length) * 1.55)
  const wordY = 150 + wordSize * 0.84
  const pad = Math.max(28, vw * 0.035)
  const portrait = `translate(${box.x.toFixed(1)} ${box.y.toFixed(1)}) scale(${box.s.toFixed(4)})`
  // The built-in fit only makes sense for the built-in hero photo.
  const fit = { x: 0, y: 0, scale: 1, ...(revealFit ?? (revealSrc === REVEAL_PHOTO ? REVEAL_FIT : undefined)) }

  const labels = (kicker: string, title: string, ink: string, dim: string) => (
    <g fontFamily={MONO}>
      <text x={pad} y={pad + 14} fontSize="15" letterSpacing="4" fill={dim}>{kicker.toUpperCase()}</text>
      <text x={pad} y={pad + 44} fontSize="22" letterSpacing="1.5" fill={ink} fontWeight="600">{title}</text>
      {caption && (
        <text x={vw - pad} y={1000 - pad} fontSize="14" letterSpacing="3" fill={dim} textAnchor="end">{caption.toUpperCase()}</text>
      )}
    </g>
  )

  const bigWord = (text: string, props: React.SVGProps<SVGTextElement>) =>
    text ? (
      <text
        x={vw / 2}
        y={wordY}
        textAnchor="middle"
        fontFamily={fontFamily}
        fontSize={wordSize}
        fontWeight={900}
        textLength={wordW}
        lengthAdjust="spacingAndGlyphs"
        {...props}
      >
        {text}
      </text>
    ) : null

  return (
    <div
      ref={rootRef}
      className={"aem-root w-full " + className}
      style={{ height, background: backdrop, ["--aem-accent" as string]: accent } as React.CSSProperties}
      onPointerMove={onPointerMove}
      onPointerDown={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerCancel={onPointerLeave}
      onClick={onClick}
      onKeyDown={onKeyDown}
      tabIndex={0}
      role="img"
      aria-label={`${name}. Hover to reveal the mask; press Enter to put it on or take it off.`}
    >
      <style>{AEM_CSS}</style>
      <svg
        ref={svgRef}
        className="aem-svg"
        viewBox={`0 0 ${vw} 1000`}
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={id("bg")} cx="0.5" cy="0.42" r="0.75">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.07" />
            <stop offset="1" stopColor="#000000" stopOpacity="0.35" />
          </radialGradient>
          <radialGradient id={id("glow")} cx="0.5" cy="0.4" r="0.55">
            <stop offset="0" stopColor={accent} stopOpacity="0.32" />
            <stop offset="1" stopColor={accent} stopOpacity="0" />
          </radialGradient>
          <filter id={id("goo")} filterUnits="userSpaceOnUse" x="-100" y="-100" width={vw + 200} height="1200">
            <feGaussianBlur in="SourceGraphic" stdDeviation="16" result="b" />
            <feColorMatrix in="b" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 26 -11" result="g" />
            <feTurbulence type="fractalNoise" baseFrequency="0.014" numOctaves="2" seed="7" result="n" />
            <feDisplacementMap in="g" in2="n" scale="22" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id={id("rim")} filterUnits="userSpaceOnUse" x="-100" y="-100" width={vw + 200} height="1200">
            <feGaussianBlur in="SourceGraphic" stdDeviation="16" result="b" />
            <feColorMatrix in="b" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 26 -11" result="g" />
            <feTurbulence type="fractalNoise" baseFrequency="0.014" numOctaves="2" seed="7" result="n" />
            <feDisplacementMap in="g" in2="n" scale="22" xChannelSelector="R" yChannelSelector="G" result="shape" />
            <feMorphology in="shape" operator="dilate" radius="3" result="fat" />
            <feComposite in="fat" in2="shape" operator="out" result="ring" />
            <feFlood floodColor={accent} result="c" />
            <feComposite in="c" in2="ring" operator="in" result="edge" />
            <feGaussianBlur in="edge" stdDeviation="5" result="halo" />
            <feMerge>
              <feMergeNode in="halo" />
              <feMergeNode in="edge" />
            </feMerge>
          </filter>
          <g id={id("blobs")}>
            {Array.from({ length: MAX }, (_, i) => (
              <circle key={i} ref={(el) => { circleRefs.current[i] = el }} cx="0" cy="0" r="0" fill="#fff" />
            ))}
          </g>
          <mask id={id("mask")} maskUnits="userSpaceOnUse" x="-100" y="-100" width={vw + 200} height="1200">
            <g filter={`url(#${id("goo")})`}>
              <use href={`#${id("blobs")}`} />
            </g>
          </mask>
          {/* photos melt into the backdrop instead of ending in a hard rectangle */}
          <radialGradient id={id("fade")} cx="0.5" cy="0.44" r="0.5">
            <stop offset="0.6" stopColor="#fff" />
            <stop offset="1" stopColor="#000" />
          </radialGradient>
          <mask id={id("feather")} maskContentUnits="objectBoundingBox">
            <rect width="1" height="1" fill={`url(#${id("fade")})`} />
          </mask>
        </defs>

        {/* ---- civilian layer ---- */}
        <g>
          <rect x="-100" y="-100" width={vw + 200} height="1200" fill={backdrop} />
          <rect width={vw} height="1000" fill={`url(#${id("bg")})`} />
          {bigWord(word, { fill: "none", stroke: "#ece6dc", strokeWidth: 1.4, opacity: 0.22 })}
          <g transform={portrait}>
            <image href={baseSrc} width="600" height="800" preserveAspectRatio="xMidYMid slice" mask={`url(#${id("feather")})`} />
          </g>
          {labels(label, name, "#ece6dc", "rgba(236,230,220,0.5)")}
        </g>

        {/* ---- hero layer, only where the goo is ---- */}
        <g mask={`url(#${id("mask")})`}>
          <rect x="-100" y="-100" width={vw + 200} height="1200" fill={revealBackdrop} />
          <rect width={vw} height="1000" fill={`url(#${id("glow")})`} />
          <path
            d={webPath(vw / 2, box.y + 352 * box.s, 30, [120, 230, 350, 480, 620, 780, 950], -Math.PI / 2)}
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.2"
            opacity="0.09"
          />
          {bigWord(revealWord, { fill: accent, opacity: 0.95 })}
          <g transform={portrait}>
            <g transform={`translate(${300 + fit.x * 6} ${400 + fit.y * 8}) scale(${fit.scale}) translate(-300 -400)`}>
              <image href={revealSrc} width="600" height="800" preserveAspectRatio="xMidYMid slice" mask={`url(#${id("feather")})`} />
            </g>
          </g>
          {labels(revealLabel, revealName, "#ffffff", accent)}
        </g>

        {/* ---- glowing edge of the goo ---- */}
        <g filter={`url(#${id("rim")})`} pointerEvents="none">
          <use href={`#${id("blobs")}`} />
        </g>
      </svg>

      {hint && (
        <div className="aem-hint" data-gone={touched ? "true" : "false"} aria-hidden="true">
          <span className="aem-dot" />
          {hint}
        </div>
      )}
    </div>
  )
}

// ---- built-in photos (webp, embedded so the component fetches nothing) -------
// Civilian portrait, 735 x 985.
const BASE_PHOTO =
  "data:image/webp;base64,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"
// Masked hero, 736 x 736. Its face is smaller in frame, hence REVEAL_FIT.
const REVEAL_PHOTO =
  "data:image/webp;base64,UklGRvB/AABXRUJQVlA4WAoAAAAgAAAA3wIA3wIASUNDUMgBAAAAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADZWUDggAn4AAJBjAp0BKuAC4AI+SSKPRaKiIRIIpQgoBISxt3CMK2Fr6sbMYrbWXJe5J3S8GTzLYX/1Nu/aU/yro92Ytw8P2EP3f+l/dD+8+/zx73ve3/v3+Q/6HtS8hOz/NE87/df+1/g/81+9vy9/53/p/0Hvw/o3+c/ZH4B/1l/8H+R/1vtr/tz77/3P9Rv7ofuR7sn/M/c/3y/1X/c/tf/uPko/nX+c/9nZIeil5tf/a/d34kP3E/cH3Kv93//9X8mm+Zdhv5v7t+0vhj9//0/Nj7p/2vXR3D/rviX5Hd8F2/jI5hf6ni1fvPNy/5Xsf/0fMk859Df/l9ob/U/cH1h/tn/C9WfquelUQrO3YhPv4JlpxQpuInS7qh2b432EUxJOuhIymNuntUlOg3ZIhPaQVUmeWgOlUbQUJhtAluCMhzWtPI+Ic3reuIDEu+1b95vsPw0rB8GwySCJBTyVGmK2EoZP7d3kbCSO2kFa1LB9QNP/Y9vWctrFRkW7i0jzopZsU5xJjJXQq/gsEnpXNcavekdQIK2o5Rd7F3hIPNonri698nf3oS4VbUnTDohJMDwu/7RabJ2Lg9mEmuKTMYwbX0zzmUp2MhXs/CzeLFnuvzZrZz6rQeZ/93ze2VeENIPjr1HX2al18iaVQkHiN+AjKU0pTL1zcdaTmeSW+Loh68Zj3NbDv4oC0M/051LPvb07o2Nc8k1r2JeMXxcNDGf39nkaZ4LxNks7GQdApif0enCb8GrU9TaFcv12ZJo+BUGtCBZHVys2Re4/k+kw6/qYUkVWS+gXCRp14D7SVzWPO9hCXvmTCCOdvvrPLdy5ujAlNuV/p5IGff/9zyD8J0Tk3AHrCBFnuGLno43dmrXCqU+FaX6rOSph5YIQmQopEhDkKFxWabBHbT5TqRWV8A6bCmqVBE1pGxoWGTBn7aIvMdqL4D/L2H/1NTEdbPXyDTF2LC0WBiOp8UxGEAmtxSZ+NOygZkAnDyavAyz2dAhAe3tJSH3xbo3nrpqgdqeSJvtQHeRsB4xvc6Bb6EgqYFLg0QG6h/zZXT8iDPgwu083foyQoXrbm+lcebGeb/v7ftvv/g5gpD3Sop0HhEGdNantaWqvcSFjtXSNQg/KRDMXtk8htS0daidy0rOLqQ3H8ors4NrarcBWe2wiPiD3/AGoZemGN3KpLLPLQk+nBqB47YIGmM43uBvjbzupgSKGXwMaPiCx5xGSo2QxHkqcpypBMX3UXcIB4KLcyAS6PEs9dasA5UnbBvt/87rZzWgIKCWV1/f/MpvWobJK8h+o4vJM/nxHMMGqAj2ZOLcw69ggf0yl2dGIO8HJgGaWJq6BVOifxIfd/iMn6oQc+LAQ6k2mHX9XvCboZOTPwkeadZ1/8fpMzurxemb6xr5tWpR3OD0mLO15cfIZbB7r1v96dQcilbrGNTkf9j97ARntqdflIioKHdOAFBsvtYoydIsPJnQeayAcq4s8R9V2cbWh9bgZX/2spy7NBJTKJU0AE89uziqXhP8PTgINug2ow/NLoYmb63HDz8ym/rJGJ3X10qmnQE5ymbNpg+wcJYa7x8O6i/pItcQbOAlyv8tMOX7W5RtuJfcPOd+BpWj/hwPEJalEmmvDzji2mjVSWjNlSjziO1/75YLoC7gLEvuHpGPoZ/etuKPQbBpL8Q7Eb1IxEzNO6FCjxi0XKfr0WlrrvueZZkCRw2ufwB+K3EZUKdUvqJIbhVp1clAbrFPgLcE1f7N2QGxKJOCyykFFrALAwFZQtXv0L9cRtqS9FwQPybgmB6u39OXNedhu3+XcPPABytKb4jnySBh3AtpTqWXD82miefsjnfEFvbhaBbolscLL/K+NPwb5n291gP+mVMOXk37k7XDUMxP8wPEkC73lx2XEV91ITFYlrGU15jaZbqfh4ly132mGz5N1mrW1aJYk3Z2sVKbxvjePOgjKdbLTi19t2Yy6sT+sP48aTGUkVI62vIJ09BZY5J7ThhRycZga6wK6gM90lz9BYADggYZE+PqSz98Or0Ne23Uw/7AOAEca1luVfRAg4O2F0E+UGYNrgaz/LJG4Ip/IHPT0ndCJE6MqlKTHlyOXRTWTxrFFJJeEh5KeySAdC71C42Rg7xCyuZmvyxMTTch5A/UuU4eyyTixOt/z2NQsiu3sh+KEnOheklW0iZ27oDskoEVrll76uneMqajvVE9fPip/rW/YUHkQwR4PIk25os+n5wisxPE4ZxxPQeFcKoPdO56jLWBz5LnjNXIV4ISn9SOB/PBhvUIsxKL4Nnqzrz5zSz+eDsN04logO1kMKuejpId5mp31hqDvLdK3AY2YzEHagPdrGV3cpqjynecu+GHGuEAgOXtYb2I4JhaPhTVQM/h8DCudTkaN6GwA6e8IcMa8Weba0kI0CWqwhyZRD66ukDQTdGkIZwaKZ421BY2F6EcQNWmN32vqcHMuRxXVdQ51QfOkcNJpjtlMss3jCzvBffo8ZaLgE2Ae3LyIr9e5zso/5uZfPLz9XVFastMWRXbUHUhn9htUgicSHR7zt4PK7uhOmXSYvAkjHvkUZFoemJk5KIZlz2uOC+M9/nUA5KtA/sNstOOwFrBkH074vbPMrZTXps1/YBQsGT8nLlICYc9srlfbXd591aqi1xzWndXJ06pB963JDGV5a/eigIzcETRECKSS10M1Zpsao/KaUCSg99nMiSwARVEyIH3zQwnOHgzSGFGgZ1gLxCGiiFMcfot9mdk9NfZuFNOfDVvWAohNF5nZpk02NTjx2ilz5UmE11SUV0wJekmIJWy2ibtBKaxi57+njxsAmRjvkApbvGX02PIq0Z+vK5bqq2yhrDYSW3R9CORDgUFmTcLGAcAmwrdv78Pk5JZqFFgFfl0kUzjRX/wsKsEfTD5UQSUamgOHWxmG8HprDA+4gCvk3coUbycxODFYNcEvE8gt9tJDd1QIniRTsU6QIo+UDmowuL04d8TdWhXYIHUFia12a2hj1Wm+rl6/S9+AbLh121J+EpSNRxAU0mATalRxN2VgrGHF2N/KrrlDy1wXFjysNjQUstb12YpFiRrMPnK7iolL8n88+t5ncQb2nqLB92Ajiqp6vHyWNk+zWwiAaO7efLoib8R1EyD6NdEewAO+PiVMZIJVywoWqMJQJoyECpVnt5EkVqYNbKWBlO2vGGfwZenCou26X0qDKMH4XUSYWBUe/Rf6j4mdQrKxCg+hT+xsNRk6SUIsCrHBeGi/ZVjEg8tTJd1F1LoQKDSJrY4oabOZqPwjxj4rT5We/YQl+UeFlCp4f0mjmKx/0MheyMU86UQ/CGSkT5ha4k0CfKpBN+lHmATIPd0TNcA+b+WJyN3ml+B6F2XlYntlp/w/J+vn8UzHge/Ra9UO13ZXg2Z6F7lsPIzyu44646LYkFa5dsykVD5cMoZzDVJfkTWSTjwL7Zyv0zY0Wl7FTDjdrfmycxkFr74nu6ASNAwZozUmGoVb1H+3HKfx1m1q8be3QZvbp9GN9Ek21glJ8DKXBuw1gknq7Ple6ILKsOSehQT6RcO4Ff9KIi4Aq4Hq0McMXfhQiIORY7fxNxek1Z+LOB+FIBZ4XoWUSm5c6UQ4FcO4T5GZr7B5Jo85AOY/TJBtpRhNGrsVwfhd9/ASOAU65mZtB5xV8Gg4lZw5clfQNzGbYBhqv4y8r+UdkSfvfbEg95Usc9RP/B3Ouw+JiF3hW2AsQGUxcBKIxCVQuSq6RoGdVj5ExzTWyjkCYbg96JphXNdnwVROIX43F5FVoK+D2Nxn3DN1P74QbW+2D9AwaG/OSImN37hOsUY9F0EsfbBQjg2Xwi3pxK8OzD3cdT/7LwBv+hyPXOCzmTWP96HgTr19/lvUKcDSpGz/T9ZaQiOAfC3yDiNTm7DgulrWVI1ffROKo0Etc+DT9iQyX2aDDSlfzz5raAi8SuWvCiSYwE0eVyp/7QEBXcbZLrBWm4yonRwsapso8F7T/7ApXFmXteq1H0VrmsM+mpX/sfQxo9/QLqAaDsObo68CtCdwAe8ABt4TiqTMUig30tJH4tJc4MOsKTz92D8WvqOyo42uh9vkuvf4iDssc5guDcGNSIszlJioC0NS/yfJKDhNh4vR16C6DifR0fbsza6EsNh3kMKMd7nLUN11x2G3/AI3/uLo3y1V/mi2n6CwzaTc4BJw7iYvkNFSmxPRE7SZORIyM4nKfaum0W8ihhUK101Bf4S9m9XcnStQSuSjFNlvSWPbcWk15uI9302+Zle5KNDqyP6M4bPm6XhRJ6UzD/NVhQcatIlugliG1VfHlycLEwi6mz40NiKJI7VGmamGI6eZySnTjpxNN/lK19p4TuK+TKVCCuPH9qif4ihAeQsDZukCZOBllJF1iTTnaA+tqCg98klD2YzgL2NLLakuNLIlGhdNjA6MdhPa0k9yY/XrU4wu7LfVC0iNDRY/y+tux0DK9Gf3VIM6R5q+lLF3oM7iSNJjNwZPC96f1H37kDviBQ48gV0QKqwoLxVIIB+sENZDtzVGq3trINrBMPjlqgzNeyhAMh6gYklbwCmDlRcbot/d9kYsutY0k31rVKeU1z8fR7yiAvj6N4d4KLjlEpD2sy3VNoseccvTxwiD9X/w0RlsPyhlxsFEOzYYqWNUoIU/FIPhzkGp0PmuSQnvOJokCh6C/C5EGbcKlid2n7+OE+e7wnUc2XhgfJtGT241vAIQvfKfBDm0bStKJDwlclSt7iAy396WJX3uRJ5AokemKT8RK2vZttM6HQXZ8OLKzEwEavLpJhvfM5M4uDoDC4kAv32cu952ySkH3ikmEEoX8hol6SNDTLsdf18LusWOjTJ/8ckcKHA1MkvVLU0HtBXnRbrCccAHHB7OYb3h3yHvpo5DmAkqhXtCVGvYn5KVbXI6xwq+4Nbnu8DHl2/3AHLh3W8SqX0VZn4l0nRfCnSZevnLl5esACGYrFxrM4Ohufhr47Ff7kccQbybe5GvGY1HEvRFYdR5FZqi+8rsi1cVQWDvesVzfDMdiq+CUxMhNSEBHaTW1r6yyj3bWa4acoHUOY5EmOmIYtl5SKw4OkDeHO8fuGTTpzvj12ckyHJ780rLSBHGyMC+XqJ654ltMsvuGGkKxuK5Rts1jTqNUJ/hSBLx2TcvjzGRowpfd66gZW3J4KydciQQzUzxo5CUAl++Ugj9Kokaz3ZeWM+RgdpqjVfbDCIZQlQOqXdv0/WGGndRukyIUbn25fpIDTKBLqgYjLdEE3r+U2vnBWJmR8MU28+5CSmepfAO4ShydOFKTy/vF9cQ7bBcV6PbX6X6pmPpOmBqzIaOSNoXQJQdZhh24Lv6L2YZKv0ArU7se/nMA/xwlrnup1+aH6W1vmGmSuDnT792RBRg5muWbXN1Bu7I//mPcrZ2cG5MCmsNgrkV6suBtbPbyzaTOFWVwPF0NYfhA6YyXL477U/pv1RZfvQHZ13PElyA5rvTtpS5oNQ0G3lwW2eNUyQfkgccnPT1cLH3/FJCz8vXvWHlIYoVtEVVxhTehr1zLE+0mFQDWstqF06izuJmWkf3KOoGxOgZmLvzdVXF7upkJUB6nsNI5422TX3Tb0o2w8HQF1DS+o8u8pdpm+PGuUKcg4WRhjGg9tHfDSo8WPRv9o0A1FLc6avtQIgjIZ9NTg/6LiKH9X+RHC6MmYDspgHZl+j+sxiYKjWKwhAiE83T7ZMxmXBTQ1D7ATeDySbol0veX/bh3f4F1nDB3P6IYQN4erUT47oNF0K+RQFrtyLElGvOGgpeTcnO6uy0YDDYq5PTtM5ZhiXPHmAf6CaDUIenyPCrhrzdb4x9uQj4Tjg0lQYldYqdaWyvUoipxcazKg0RgxO8vZij5MZBouBvWtZ716jjAbeWPQmJ0G5Y0Hc34waiJ2iLc1NbRC0q+cEzdqkZAigMvQOvNX4fXNWxaoWGFoi6p1+aFxCXIumyI1otTF0I5oz7jU1hwoCN1ZLwQxwXjc1ueC5sUzzcLYuFgkJWlBJa2zsrB5x9sjVy90sZWNw8Bx9NvkDibbbsl4WXocHjbuiG4m0+boXuP4h1sVUw8Dg8s3ep0FHTcux0+rJQw/7K7l7u8/T2T5+F9dqLs8E7uNIgd4ygoIE456Ds5de79ZLK4dCZK55shYMsAsZSEv+CmD7ImRLw8EZAqoNNpR61HIAJN22ohxbdalyl4e7dESI5uVIlkWvegI+4Q6kP13AyODKluElN8DDz/kC9U3E2ZuRfBg/W4a+DnXL7xjHze1RZQ1Ykp3dOzjmrmNqqecNk4iTyXUviGe3gr7awP5zw9C1xi7PJTTiWlFl7fbx+RF+0A8smQtbtXBGLIxpw42U8iZPIvfQyOD8W7aAS3fUAf6qffSwAA21xGp1RO23Oe1fKoxS2o3JezznSdHwakeCyKm2RJxamLwLM814Sf/iXWfjSGJYpj+sKWD/42+Jaom9KXUGRG029p+ksR9GhB8ixtArJJFirbzQAdehZe/JkHWFIbzyV0FN2fxyxCNVLgIooSIkEwPzrOizUaW6zhM66YOkwAP7qqHc464wj/XmzPmzDs3cDvHMJsT8SCL6NwRWAhTYuGplmRrj5UeZkJU50t6s+5Oa0DNISBUrGY/rbKkxJkNHV63kB1dfYVOT+MuMeTlU41hIJjnos+Sz1M8yVDr3Aj1EteP+hTAl6e50/dTnpee/CXLX4nhL539ykBJC7lt2cxnLDFC5US1sPBbjiHEo57NFhIBh+eKpGuNxmDflYdQrm2ZBWgC8fhUtvtZGhal4poxAmwodTgbjfWWJdnMddeDDABkvTUSnL62ssOg1fGQnyNHmSvbbilIjRVHlRY5CSrRe/MQ5XB2BheqgtXr+/beRaJ6BKHEl2yUnp6mxFSpAG5jGe4z9y8kJRL+o+UB+VM8P6olcQtvKIP58DLuKo7VB2zgHfe+z0y1wIZGBeoPHoQMvjm3qhz7sOEZBdj4FeLWHVCEgqWoH4L17K6QsSVTNUjVHLeaPLsBeup7xqkM9PD8uhHYw3pPV5pB6GNdTipcz/l+nbmaoKOKQanx+dHWAFpqecRBz8/7hv7aLGIxHkZ/HAXtJ3ZxZFdVlrEuoxzhNNz4p3o+o1fk4sqa7e75o8QuqVpz/mxON6xSUT+ekNBwWV4gVmJAIWrd6G9jE3fmEsvBXmsPHU245cn+3yCFRJQWuUaUzdeRjdjS77/Cin2YgbRVdsXogeDnfik3aT4G2dtrcOltHypZl6TyaEr0zI8sWxIEP6YafksFOKsiR8lr4nXTtuLhA8W1CZFuxQXssXSQhFz5NXdHn6UJtxZpeYKr/jqeUuoM9fL/AGgcdf9W6CCmjYm6AEd89CUp7hyKr+UC0SbS8iKpL8M8ssdoG/H3Sv5MxTTLiLDSpbZFoLQXx58Ib76cJQ2eYQPASmX0iOhEOI7ECt+AFHDB4JCaxn88FHfhMOI4tzOrXzZ5KbDH1qwyl+31kQE/fZBvySyeolicOSjb2VrauF95Jmt+pS1utzgtBYi0FvMLr2m9Gb/59lRuuWFFt/lEl7O8fp+2X+6PY87x4feLg8G90nN0TJjsJe0s9QAl/W4dkgIZygyGr8E37C8GNG8Vxq3PiZTXgDG78TOixZKPvn0uG0HcJj4Cx1hXl3ua541uRF0b/Okv5K8TzyUGRlh3BGfg6+vd4CHWXsvLKaKrpxFUx9Nz7ykXBbRjUND1YplUNybNVA4dumvyZlntLmsVFaYU2fMzJ4ZAxDqFFq1tYyKllYSGLHuNHtMw4Aq7TF/n4snL4PfkgTXSQ59ZQpTW/ksrfudAI69Z1OVn4aXK/2miKEHzJX6nw4gU2cz5ZKjQ6sz9FGeyoH+BnSsFTWb/Y8UQdb4RfknQkOxLRNGFLnrcI8F1PS1Nn/RkvCtdBkZQYnRUXGoOLmFjUTBnKajuLG0RGdoZZTHCF1kHBQXaBPqlXIKZbjfh2d8qQBYBt1hgCWFqNNkHEGqvq4idFn1EDYXzwP2j8G0UiuRrvkmF2t1BaOOvYBKa3oH5li7YqKoQZjjVxWrL8g/p+njaCDQTTyjRmpHeMgWhUpFeHHevNHKRiBqo2bKW9S3hapAvAXQ0xTtgKZuT7kC+k20VVtCv41Lyz7MdXtGK2UpEFEvVq/+uM6RKjeeuyslcO5zVb44TjHDft5tLXA6zPIvbjR8aQ7v/prED93gj6N/2MNcHc/1P8sQPk42v30TSaqfVSoJnRyr7guCrlF3FNd6WzXv8yL8d8E1wQS4nzdAD+G0vC82gd1r2LEJPl/dZirYOtDI0Eqg7TUTiDBWot7E50GnTys6eJqdF2NIlcWx+I6LDurbIpFdZLWw1b728RjJ3JOqR7/SldlGWg82v/1Z8Af3UsJ3cClrafvvmgHOhZPg8cDZ+7lB1dozDpesGnpOk27rK8lrwsQx9TJr2y5UBmOjFRoyg5LIxTJ7WPMvNuFgxjIYZAk3Kni1lrCsBHgKDNQLezk0WAimr6ZGyh9tEGDh66DSHOKHPabNuTMymk4jbIbNq3EqSeeonRhkjkuYyi+iy0ZNj9Xgni4+Iu2L6OhjVaZZmgJnhLSaBaG0G5/IYGbsR2FZrrBs1oSdNN89FJtWpcnEA0pEzfO/Ab0ey3Nw9aUGnDwSY0BtInmte4LDVIaRhCFhrvlEcZI+TZ7VimWfIpWfnQJweR1q1/Z/dWaUBgfVU37hmJ063VIspWHLU4RrnPqXXsWWwy7FNMmOXWy1KzB8dC7TNVBugwj0DqoaljHEv/gum9S2I8WA/6uWbBT0iq0e/oono1U4PKsILlBTc5LZEhF8W3Bry4IVUtVOMTHR8rVw82k0uw7zxa5ApuHwLceg4KUMDT4gTXWczgmCgQ2GgXnMWZjSkHche/4HyIs5AjOPNsz3rrvd34M9jGEFo2lsGnWtkq+YoNW9qTot0In3jdX+vGOZp7bzFQ55IwXS7WgmgMNkSOR8tTqSOphJ69M93bBal5/z5VkLI1pO1hipFSGHEqdeHUa12JSOGwH2niyI9m8W9D6XgAeSB6xQnF7urwy3lFlrvPkCOBD9kP/o4lKUpjrFhkdtd7MAsNar/ckcON3L8xWn/T5ylgaMsHDkzDRtOepuuwFZuC2Xxb/a6SURirnhERFbW6oU1o1D1MaPW+nJGo1ueC0J+JXftusG+jQyop5HuBvTtYnNgPuTfFTndTtJlFXLBWp6+xOg+wYCCOoWQrCr4XB4i5TXlEPVzJJ8id5Q/0u4440+SODDMFnLvmTAcOJuiq0gTofTfOO/EzKgL9IX0aFddCfWuf5rTDA9uhoxIVQLgeRKutqWC+Gxikmv4/50m4ESR9vBlyeds6ay3S5t9iXOW8jUkwqsduN1AXjsLFbmVxyp5VPOo0PGvhe1ms5SFJwm6LU85usuun1xLiVLgpm5Nq/yomiS00NP5/ny6blFX6qNGnHdzIltQ1UY2kPeEtSOqNGz4j7/AYHFVczun2I0I2mUBNPpgnfKxLvavXhpVjQXx/fHTmowVB9W3jXEZP/wMcvykQZStM9s+t4ClajpQrf2axnCNGNGeN1my01XtJjC29zLC/sZUEHfbxnlxGDc4fFpykximsaswGlJez6gkbP4Ce4EKSFqypo9j/rg/Isc5h0D8+Fhg+Q8A6fFpKCcGd0p7VhaU+P84fBPTlOTVLPeXQVLZkttDIa43x/tDbEFk+5cEQ6AvaWnca9ID9vAXOsQvdo6uueG/MEOovFWZOo6jC/Oli/TOkTy/w2e0IGJ/hfGPVLeBbm8gEcTxRqCpL1PrbMyj5aXDGR87u9SPfxj6vy47AetJunHaDHlYEvLwSlEXsx9Ex4WyL4LJ8pwpaRppiG9sHItqcvZFS85lzaHKN/xP+nXDnNtZVioMZAPXv9FzGYeiVCAxo3J03YdUQJDdEhKVndOBNr3y/OK/2drJ2X4+Hiw9g1ykLGP+9JTa9C5At5HbTGH+S0i0A66EJ8z8o6zYP1YIWnFrfIRzqvOm4V+zjODEUiagwxP3iw34HpnbYOpITDuePQW7s6LuGTaUeSF603kqlzxBLvtC95ZQHp5IDAvj5Y9VV3AUUo/3bxofmePdgb46TkkSj+dAkZmUKyXOB2U5UNnuO9vnobXFut7JI/0FwDEc12GT7P3v3rZv18zkV3TyuKyec35IC12FKG9jNgit7lDREWipac87JyNW4AM6lhNMvbhZROZqnllmyh54IFJ7rTpjtulqP3ypIX8qTFxEsLS8P+rsFkX/k3ev9Shiox203v9VYOFbn6W0X5NPgAUgwvEz+JJfLfR2REVPVl2QozYXganyjTbAVunXlxFSZ1v2PAV8bt4NKiqB2bDKow3+c7fX7HcU1s+eHrJS2MGdJtpZ2tOUN7QTuGFy2qeiFJisR5qCiaXT28V7ZrIKbL153OegzsiOL9pAO2DeRBrB8NXb60Qc1pE/av4c8wdCcv4PVICBTnjTnw7+ODXj5QiDFY8qmb9wSGi6DR8zGcTnt2ANSodEfiLMpNwT+T+tqx69cw6Kz9EEb/orumdLtngbzUhxn2YdD44u/RHs9agWOGNpAlhTyBtR3T426bJzewYK06gT3zkEWMIEdGpqRUOuXQ4D52/nUlKNsfbvVzJahyBDWlRTBRfFg2Tpk0ZLZbcFhTb+04cxLVzS5W2OSFr55k8zqwPndRnCW/+pvPb/a8KcHXVq0LvD268YqBr/fvNZHL64Ft0DTuiFq1sN3+sCznmyufqVdotZbg7mpZakOhvc8h1fU3pWNPX5yKwPZGM4/6/gYrYC0xPPS8Kjc7ZIDXvRFiGyCkVt99dY2Tw3ANIG5RRSDPZ6AxTCcQ8GaeqgzJ5qQwnPbUwEhKOb2ys8CRyn2GsMTTIr/C3RAsOysldSZwRsHpYoJJkmwoYdjhN8mQOKSiSWZnAvjGFjAdJEhUZ1gr4D/fQZPhjUYkQ8kSobVaPvo+XqoDn6TEnLgTyeRO6SX/nz9o3Uei3p7hp99w2htpcxp1VSnGDWnMbDTwLaB6y0nUIbqSAHIMBvtWJOEvfUlvszA5awkg/5ynxS8k5hwF1lSvnuI68HwOUUV0bW2aVH8zbdRzJTuAukgdD2XC4D6HfGiNI+UZdWpK+2eGSCOBRrDiGUs/3Imd97/QmUMsuty4ka5+xUFeF/JoaM3UCF3vfwlP/tC/y69167N/9KS6ekQ+A3cHBaY2RHo/R8WRNMc1/idyxaMu3WAZDLr7sXGTeIv/L9n+Bqu5aIlOuv1R2hDGXJfV/z97VTTgNTHKfJJ2RiKfIf4X1RRyl7jYZ780DG6cRd7h5g/Eq3Y6r7KtJ06hrn9u4TpvUhrFvMsXmmf1AdcKFWuXBehIL4frSfAL3Cr1pbIgCc/e2yS/HwgRW2gFSsfuUWn2hi2M14lWNdaS90L2/vWUGain3P/qqEoDF54NZBBsJwXoB/ARJo18rnQE9xu9nt9Xl2LAeuCAJl3qeXWuoW9uWl/yHbnya6nNmFtH+HI5Wfdmk0ZjiAVVTfPVzMqdS/oCf43Wg26eBQU7WP5Av9/ptGBlpF16hSVB3c2/Qly7+ZmE6Z7IUA9QVdwu0Z7zqYVfCz6sGyuRNqHsGMiYGljWNOYShp8LjUyZHOt18Qeij7BnJVfL6MXpXP1e1EmYQgqtv3u/eWvGWZz1xAp3Augli0iSaa31ItKwKQj2SYmIm1HcDj2oHRMXetaI864UAldFUL9JXoZpELM9ebseNaei9sPhyfybNg9oL5KoQMy/FH7nwuG2qk7mg+LxHmoTzPJFOMrjJO46AG2JRifnj5czaVKQcyv4MPmEHnvek7EfQRk/W9g2MQLzTLrJ1hIghdOYwqFslGnD9mur2UMiwpdc/dFeMLdVSNscrSjzr0/A2vATPOdoXjVo5k04YhsN0Yjm7rrawH+4S5yE1OjIQBPAXb4QrhdjqVR0Jol3fxEarADMhzRl5nIcXnf8apFetiBAUyNXXyp180YrAcfXcFZ7ii6IJpKwMmoUX/fk8qorIv8x2BQDMl7XvRO8rl9hSucXyuRkM1omXqRaWGQLwebMr85fDIFFeB4kf0hBjyVjnRK1BrDMdv2NUB4HvAcGPXOwMwyrtLt3aBxMcXT7PXjfmMsWyuZHLObxA4sN4gNkBgFumtE6BJMdCc/EnrUtSVjwg/bsSEC/d323fGUcsihKH0/5ENK4PHR4x4MGdhk3jJ7Q2RvDtpQbw/zyohz2yPBd9Pit9i6DVHAj/xhJrGOhGatfYN+uCMZOhtLyDJheCIjnjvg3nKZwuyonsUWFo1z0tPK6Ah+S8VXn79ND7RO0FcGRfR/Q/PVzWccV8qi0LgbIj9yv1odyWhVjIWl/R8C/q2s+txCms/odALKC//C5eY80qKG4TFAAebe8ztKC2huWdF7181ECXkGxD2b3mQkoDoEcYIvx+CalAXyAAE/jL4A3NW4h0Vjzpb6Q1gKl/Mk9xknrFkKl07I3WgD72p2XT71WAjPK2DJo7vJziFw64Vbd1EQYFspTuQmDhgge+6sXImDWB79t7RHOyMq3+Q1hS0q8K43RaINN/yK5YjM4e92TY47q4SwZRFTgaocaLK9XMf9x3K9YvVRYStXnnDUL1bTFvXrhXF6O5FjnYZuELVN8Nr3KUtVJN6DOxJ0m+olG/8HUhc1lDFe4G1j5+aHNB9TSYvTK5WOSAyGHCEbcDrv0jzVFuhy5VflaZ+O3wUiQIV53f5uwah+HfPXixUykkkPM3LzQk3Zlwo5+HXaONC5WYo4GUa3KnH6Us6ZRUl1z5eCS6SuGqMHANqcZdl225rEbD8StXLyefflPPCNtPYGrOIOC8iDSR094SFQ6SozwnfdCMl6BnPkMDeCJ3wrOKPlXq/Is4c162wnHMkclwGyGYMg5mYZlFsMP0hkkzfw+3H/BxX3fIMZt/DJXOGf2AJlId+bHSDHfpvsjkhp/CSLAJoQKKpx2EBFKWNIBB8/k5Q3Wbhf5PSRgWNlnPzv0pyJJK2GGL9hLyrp1rsmqW+iYEOhSkVXrY9oukT3U+WkkQ3VjDkQhm5coN3jxmdDO07rGsxQ0uB1Bl1SEHppRWEm/xaNY+SDcuqP18NS6VmdxOyd9HoZWwtRloeND9IQIKhra4NCENMU1o7J4I4TLijhuwJVBaTseucB39RhrWLy1Isej+tvcHU86esln/5JAOvBo9i3Q0lxYnZK1yGHDsOKZofKFvbtDFrPSBC/mwiE6DJyMYsZOV0RmzYOiSlc+ut7HxLIIBsRACktro4MpRWD8BQsEH2aPu2a+71b/SJSTMG6WxilrcJ04SRBfkQnkcRDP7TeJoK04MRkAvOg0bktCgX6ADy0eRf0X2vNNtepo2QQ1MWb3ndmGkBNNf7F1pf5AgbftGx7eW/FI0bNtLFXH+IUwnpzhfMajG97yS+el3Y7vUOEpdMpK2tMHKyPts7fOjpcJMXB04lZFBsw10/cEu6dmrlJFIvDEdiznPF/8mU81jpqphEXXwL5BXFku8LL37uGLw+1KB9BP09dcf3l210FwXsfoo23+YVo7jB/coDj9l+2TYYo4HgjxgTKXtHa+I5EIPGt7EXnlj9t/XLMd2tY4kgdZjwTDhYduj6CFfydUe/soNeYxQ8XALp5x0j5YAPsCDqBLPvaD4HPuh5PNac0iVOgQP7dTGlMRsMrNGom9wpQnidR2VIhuo279nqGe1njDmob1k76t3Szr1Ahur/yKlfg3zjLqSjD4TqD5w1tyO2IuZPu2GNFnTS96UhZk1UgCmcNTQQHwc0PrMy4Sd0/qwKkzSpdeEIeXkuOa57d9ZpyqWWT8hKkSt0DoRNCO0LzFMOQq3WgBhrKhd53sgnPg3jxMsYZD7jTzZvZ+8sIhHc7s3xVwFs/kg1EVLO85iT3tNjbGp4O7aVTG2n2tNl7z0Ajs2lGvpmQtw3YFP5Kbih+NaqtClb67+HV2fcjoPiSE5VhozcZtymrIcl897SPcDlQ4/z9KWsZcUn9OAppEIUpuDX1jKt0Hop6GQluzKVq+NVuE5N3NzuaxHhvYg2XBEgj8bsbM2JtSGOZ1LlROCllomXrDDmvXazEeaQgQiPRqdhDarMhX5WoV7Cfa4UFaqnAM/g/2rnZyyIssKIDAGlwQ9njDgDbkj335Lxypemgl03oU4QYjLu1bhSNlSmjw0XmbVTTkehRyWmapZy1Ean9onG94SOCrkrwgO6IQ0KaeR541r3AfpzMBIG19fR7nzb+D/3on/YT/z8cbVHG+GwUCUPcJ0EXKDd1MHczFSzFlHoD7yNZV0/l+SSqMeu9JBFh72xa1G+jOc1BWutaqdLKSsq1buRr9QIx/TA2FKpQA06MRiZcgFie5cuaLIEyeGaqZoX1M4YzuiB5un5SKf/KjaRSkWw2qQLUzfP26Vr7s2oTD4xJke9QQgQ69M0INPXoSv3flNeXJAlT+voF3tYksNVBAQ0NmqNoxuCJQIXIyz8nCq6n2Nnk5iKFxQnzNqi5meyn/tP2mRVU9Ccz8X5nVHtjfM2vqlqzLPZzkuw1EOBznlABv9VvKmfvUb5Dz3vCoRMuzZDCZljY8jBLQI+f6X+Z47p/ogacCqp1YQvL61mztyrMUzUF6tj+fyXev+ZZKkehkje0TtPYt1+sbKyCRUOgGo+KCLB0hAStEmxG+hfCqVXNT9d9zkSt1ibbv4wnroKKATgLWi6IhFe/O8g6P5/s+e8RsZZ72rz9b+Tr+lfl7VHTZ0mFhYrSwqI2+/h2X3dbNW3+m1cyrleJGhhkj0WMUnboAXrucc6GqbFX9PfJQvcmJsk57/iaV0/PkMFWNkvPrCLfVE7ZPnFVBRORzlL73lB+YpetOPy6RA2DR5k8o7NFiSswPtCU82JQ5O35P9U8VOXpZSnPjlw3aDhxav9LJNCFlx7gxPp7MTCukHX9fh1PUBsnXtZSOmUMtRlm/Ss1JXq/T1wogkhiNB3+Cz5663T9D9ZB3KKs5Xg/ddNLE0zVS7z9gDqvmRv0LEhggEI9FAY0ddB/EW2H3ACPpoJ49QYhkpAOxT6uS4i3xWQ6n42l8v//Vyn7uytw7ywoA2yw7DjEde1skYCM1k3YtFgi1cwQpsBz+6Yxv676ihtDtKTOO/NPq3u0NnKYP5U8N1eUO9rq9/S5Lyw2fqv1bEZxU4ei9ETZfIofXTa5+JX+dnVd6in0W0eHZDGOTl4BZKjpwIOfyaz8mUjYsf2/yPxqEJMV1zt/e5YZyW9tm/Pe+bKlOq27gpxdcqdZmPmcm/frJfEwh9ENwrvtgjfDf+ftw3HLVjr07y0SZgEkhgMux1o6e3bjrZCW15GbU0xDqNa91d4aeDE0Tx/VZo8FqTz250OQIW0zL0mCdfO3LLOlRAjJfMQOKI1nU4XmxC5ZiCyRTOOCYah4eKuQrEgUonJP7PDn0uc9RXjZe5if7IUEc0DktqUZNaRoNvSZyI78EMGknT/KkvO3K9mWPdaMUcqktj+53jddBAEko3N4XnerXU0jKEJ6hsSGU5pFMGDHhKYSCzvXBGsjjxFarO/zlGjFqyr/FmBP8yCmnAcWyC251c/4WJqLzWV6v2vYP+XvQTG4yCFBnE4EWXIi0LWMXovLKfsFRZmTnolIxHQ001YxzlLRuIoACsbrCMTFdNK+g/mt+FWcABQwbU3SQtRI2+u4EUaz+wiI1sf5VXMts1TnEBUVdfppidUoUQJjxnf0w1CGzSYdlNm/jbgqqd/CFrRBdgL+uDq5LLADyMARC3mmxBSd93czvcHQp3tIrUC0VykbzOtt8lKXAJ9XY82g4U6jybY+emDV6e4ZSmUYueTJRiDL4hikGnR49nrYDyim7yFcBPVp7xlO7/L2DXLO+p+Qhg0A690fpFcn4XsMZysxQI9ssqyS6Hvohz0bsk0o4lLH3VjAa/1xJgaqbxXJQF7oIyjj8Dk/F5SIQ8KQI3My1FR0X+lIO0NEbpfF3m8iq6h/pZb1d5K+bljLrBISglbyvSSRGXy/3Ih4YcGFKbFFcNUEdC7AkNmyn1ETfg/R6BgvVhuoSOkqXldF4F//9XNF8rZLhvEYMKqiWjJhGigaiHk2gIsqafrRMKhrXKU9KMb+4BkWRl/GWrFZPTUQg4rz8cFLfFeKxW4jddhuEzTfv9gtFL4jqYBx+9UEVr4DPtojGyrSORI8m8UmS7H8Cg0pQ9KJtUqaJjM1yc4RMymEzzD8sSVKsDIIzCpU16hpZnz2NqgZDipHYhq3plK8ZzVX6PAS5BKOc4JlpiAnRuPdVz/hESXUCRwUP4+WnjukNJkmn71PwkoEMJ/7kiTxKgnGaW89ZGUGbWBPVl/Lhd9Jy4OfKbFOVCOxUaDvUmjoK6ogeFIkhTqqJjHKaHW8BM2geEZl3J2JK+4OKkYYX/MhXPizHMBrmWUv8o4XavRbXO/9H5q/fCj9pscJmPWk8qcOeWAF0fgX29CjtHp6qBU44y2dF1lAeIrB+0k7lsiRIvHGN8YHa3on+U30wCSJ7FJUUfp5tERMgPYX2/NV6mQaE5AzaOvp/adZkxfBDPoGw/0DXsVVb4CneJjnHpXSLyIMTdlL8k6PzL7pFOrQfHnNZ6UQd83VwztPjFCJWpYrcMHI+e8Om8j6EOgTgstR5IlPB2Xikzkd9vhjQodDtAqAjnNXHF/GXobJXKjlmXAFsTb9tDmphi3DyHJTgHKWwMk6kVhW4o1q/1RZZCZHLuG/QqtoPDgfDATF4d09ri+eT3sWaITX2mT1uednN210ZRqXxh1c5dyqDidPxXS6rbo2mmRLC4gw/aG5SwFckyV1kQWNMi667LLLzQ1Poy35auGOnNoHehYnwZiudr9nQkn2dm4Y1Bw5VvNIRc0YyMbfHAVzS8QrINHbX5bfszdjtfwBWSbe2K9t3C80MfkBF2bQi683tXc9huRiwkXH+NyTALrdVjWnzz04MSJdt5oyh770/6RzJK3BLgShucbTvDqvqIL/h5Q2l+wDvtfr3KRMKaQnCol8/kWj1sYUEDpf+2oJBLuqy+wAlF47j1Y+/FUMcAFU2CL6Enh3iCi2PXoEeMxB/fibAC0Ljbt+W66afGmrRsuz+T/gOoLa/7svwyi961mfM8r8Ub9Ryf6OIyOgspAuqfC88feJUP3hqmEtLLlFKXOWNvTjKkjUb+6cvVTiHDEphldXsqHmFAIfM/GHdG13X5ZoecfbQ3jGuSaRXdN1SIOYD5FOoeQervkuPewtQGJj4vlnaPsQnnhC4uFeyZWK/vzSTId4PHVh2eAhrxpTyGRUDIaIHtLcm3SaZpK86SeBqpt5CwbHvtnfIadZkx59QaFLKeQTpRU8GK1cz5E3be3lkr788DvqmSyeWZHUXnP++WLTywT/iY8A9zcajjPh8txp2X9yxbSzSLPiU8hQj4O6TcpT4VkewBrG5vo+FY0CRCzUuS3wnnSLiyjL6buNmOPKTxj00fQJPIkBGlr+ixIhPljUkKu6ALjkT6FCHRH4ClI9rgst3cZ+vDVLNgICeNkNPr0Lkrx+SJV3hxgwZoab8SYmEOp32LawKv3Ged5o78Yz4RfslEjHj0bNSrPK7yBRLX7ZOnyPOCuKKp5RJAJmrsFxGDVZApru+z/2YrD2FEtgajOW0Eh+e1A4jZ+zpyofE2Aze+d/9c5Okqw97XByggiqcTCLfR6IDi0QKtwmyoAV5Yc7UH8LlF+J6TcJ3i3zWzA15zkTEfiI/WYduMEbwY/FuJdg/q8ogC4g2mB7NZ42+rZPr7mAxPNLOMZwUBHPCpe5+DJuOEq9pcBOCPWTJS26fMaxUTecC3mm2AQWRff56unHQleBgpNHdP2dgdbPKO0EoTHbHWialzDFY/p+rSPigQCNpRm0ipe1RvcnwlqSiwYoN/frFcJp7351/ByvNifkRhcugmVrSkK1wpcMCMV2inXTmBe0S1FIbE/QhAFgf1RxIgwaLNBX+4LkqqkiebrkKevn/c0mXHSdEI64eTm+Ukp0MBvF2aI/3G4f+FyAy/hhqo76ECE/CGvrfeIndpIpcQGG/bv3NdjlIW3ktpf6U6TF/+SfIpBqq++cUn9KBLPl/t3mA01muJNeQmQT2yHxs4vfSIIBS/Liv9+dY11mfsmLFOWcWNx/X6bC0CG/jsC61YnzPUyaN88eBhfZm3kSSwcAcWsRkQTKCIdmtcitF0DmICrdJMF6XKkumo8qv+mSe0GIjF8PyspNyzQOIChSTCiJdKUMNgQXGkr/zP67HnUusfbwXRKLRcp+uLgttdXrmgSoWvpxkQMyYUIxpJkRt/U8QE9T5T4lMYzwtQww14fr/O3UGyY+xigUbBs94guKIzX/L7fToRQ8fNmZ1mOptEArdIBJuHDJZVbTRAejP8BGnBjBKCs5CIKeYbdAi24nvglCtzudvAVZES7iX3NQ9iOsL3kSV/cCfzRe1+QlPxMpR8UV8292Yf67ppqKr9sL3Adr6pGaLiGQU/dhhTJXmDP96jk2aCEjyS/B5tT4H5t4sExCU6SD9ny627dCRTuXsyyfhMEaiqfFmJlhhcmG10D2m8+lFvI4KLjBtrDWk2v+WOkQoyiCDVpQHypzBBUngZRcIq2px2fha0ISoY83bclxQAAAATedVdtzXI+P8O+H57YfP9j+wtBw3S4hiz9FfyJzzbGRrEDvWB/H4hdvdiaYz9AkFvfsIs5h70zqykw2+r9etB2ZIr1qo5BVEQLFTm+tWQZMNK4NxP2d4rwSJm5TX6Rwf5FB54Q2wA2Biu9Qwt+HO/ymI5lAQ5O/M2FJWKTSSJFijsP0MxU8MqjyWiNE+wlnxv3naVJiWZzAHOX6wHK66CE8gOJwTSA+17MmRLAh7HO7ewetHVrZBUEjZpoE7E0HbyKXqh2wN6c96frumY+AIF0v0SrnkuKsDU/dpnn0hilnwKjwHCEZaS8tj45uwwBkuiLJxwxvn+4egLQGON2USmzPbklTIVJE2Lp3ILGrlPNlL+LdWJM4Jj+Cbpkk+wD9Bzrb00sVPPtzaIMdCaTq3+OuTMl0/TrBVIK1KOnOS3Rry2hR37GF/CWOzvdkdGxldQjnmaPpAWCZs05r3JtgjTlBQfhPzAoh8+5niRwkjmWCiSVhvUHoSpv39mhliSr+6RE/lU9lP6GmMftFRJ+vRxLI9w/JQ0FwrrPduPRdrW/05riWiOpKQlncGIglTH0b5FkeibOdb0zi8cvBV20yOl8R8t9tkuW5lG0Qh23s4/WlgvTUBLuxxXxJTmULBguylEloBOzGfhcLPw+mSdIwiwSTxloDRYk7N64zshTFV/aLKu5EG7Pq/Q2pNXhq6G1KjvOd3Mgs1jFc5tRmCgc5W/79yKEffkp4tBEZdB/B/VgUz/GETeau556Wi1ctvNKqMX4uX9VMWXaLgBh+/Dqa7ulrEQ9Qon9o+7jeKz7xFFBAmy7utd2ubKU8W92tTM4TzIX7oJ+G9k407JKqLvMXidt7maCXH5OsgIzIPA459jANDfyXH8Mcu/F5lIPbEQTDpbjUh5cabBCUw/rD6wR9X1HI39zgkc9OxPLqulUPkFEoHLvGHa+6joR5MYdTO1lkswRt+G5B4CpNRR7W5tPjwekmPV+ccP9dzcUdiVQ1qBs0qKisFoqHq9lZaHu0oqioU2k1mWxL6ptbIV5dxyVXl04dZhaXboKy5E8hTQdNKOYHdPWI5tzbbepfmwCPzrl3itTCVY/qJ6Ts48Tio/nx1AfhhsH1Eazb4WT/dUCSgdF04Rns+9Vmem1QHJt2vavSmp5qlnFkryz1esAIDZ4/JKuJgoFVF031OMlNRiSRDT2xLGQ+3eedbdp7EOklxdbz5wYm7o5dniqLrr8PCJVD68V571TcFJycI77kh9rH0J8yncNe3gKEYG6PoflX97xF5xOq5rVUXnYkL4htpYtva1aXpa369i9bPvS/FHnYROaVD5/Zr/34g+sWxzQelzMwjqxF5iYjumoC2jT/SbVJ64OHjz4yJ0LD1tx+/SoOEA3CAHH77W+AAN1iWeoGa08vUAAAgtMkVqOz3qRPGRt0vWSPxmm6nMnSVn3bi+R40drTIZbbJMcGXJl2R2qjBsk+cq8DQg2uxERolDfeQZj8EQ/+D36wZ4se2wzMNiPLGryhEsJi5e5mEgp3DiuUKJU0ZkJNa4lyHJxzLCGfGzJ1SYowEetQ38of4KEuCjfsM6GHAufwD/H15djj9Gy450+pA854DWYcyHls303GCIl7W5gX1Dby8yJ6il7Fjqp2P7Bp5m8wUofINsebTgj398HB+mOvhBEXbMc/m0WrulNY6/tMFzz2CR9sGQMvelay8mJB8xjhKNpa0jCcr8k7tEMzyOthIl5LpxU62Ba7oswB8aGFLXG8goF8qhgoktU90rrDxHc5Y3zpG6N0iEfXc9QA6NvNGmb5cWN71vvqa64ZPUXwqthi8QWonTSlp/gzWN2AH38WdG85JoMsIu/+i5BrcWbkBKNn5Uct1G3JUey95lq9f86KWPXspZbasiu1tKiwenDTBKDwbhv6HfONzxs3efPtL+cI9te3DNwgmbeoTI8FbZWwpZSmdsTOpSLwV7qjFEZicMK99NTFoGTGQNwcg3YUSQC8ZUJcDGYF7VGLeBHciPSO3CEhFtubNqpW2NuTVz2JYrKZkKCUom88/1T43rdJqSePsjmQR+GBXCPvVBs34Izs6GbKFH8NmWPL+1XbPbW/h65I3enFL8k7ubglTkm0nJapBwZUntYSR291SbBB89xoZ7qFqYQaF5DT7dvVsSuSYrYDiUJegv92nRO6cbKqGkSJBwo9Vc/ju+HflnIYeRcX1+bIpgpOGdBajOA8vDCtdZ+yAtfClCj/A7RW2DMapP30sa5XoMUIdRmN5FrL1Z6obY7dM5CnlAk2XcbTzNlheGgiA9YkgQBCrHcPxLI4/NIZh9ROGTd2vPYiK31p30AnqC4bGbM1wPYtDGLHpOaBwF5zhLzFhCANcsvqAA3/8pb+GPZkt8wgdcN6R3gQ3K1ZaLnm9iAH3lNzLU0jxehyE6LC3RggUgDEOrDSDd7kOvFjDdzmu4lzFZrIJiLLmlWp9zsXdYj0gYDbiOksWdm/POVKVIn0fqZWTmJpok0Wk9RqP72z98DYLMcC1xHRzmsMIL59HwDVXntV4A6Z6i2Q9A/T0M0pRwH4PmcqycG/Y2wR3Rf54w29kt7M94pnKUAcwVJYWZiPb3n1ruMPZGtXMKDRBrEsjrJAoE7/ANp3gLc58GG6HLtnO6udUUjljJ6e8Arps/36RZ/y9kNufU6tW0lXPHYB+esDOzs+3ht9iaEGxFo3Q8mBxZrU/qcTQncQSJU/rJbhg3+Paogoz1vYXkMUEQmtyAYqJr3UKRSJEqf+YyI65SIhYc1Rn6Eez/F4EopCJhljQ8IYIq8PsVYyDQeyFp5zBIWbICftKgYb8h4vnhnCmQcc0LSWshmcbvbiCbvrOZ5vaw/xPRS6s4ib+GmTnGyh/AiS84080l8+C2SAkBP8nRh+9L0RyHKnxJ6rWqeDvucWjR8jVmx+mWoPRinfe4ixtRrIrY86f6sb+N6r6o7rn0Xt9GtMkeQP4yYYgI7K75DstxYu2oODHjf2bkDbliDRS1EKpMNlbHFa3w/EUTJXoYj0N0MUEO1V0YSNNfra+2ig5KI1EnSkF1OqcgfoRynJP0M2mlOfFy3SlhfReLok9b1zMjNhdX21YcWZwCvtv0BkjpLCYoROn5I4jAxmDbx5Z8vIhqqsWGhAUN+0HsRuQNtvkxuwkBiMMuuCpfzhPgi8ZDOZGFO8nG2Xw38CY8hIhJxrP8Q5WQvowufDVRFVEQfxtXD51Ct/uSTwp7DuFq4/AcRmru2LMV2Z41jd+pfpsxOPs24t06oiAaVzyPDtB2/h5yvz3m7zSZHvuSEFyqGSnvAgRpo72QcWPinvDwlW/JGFSgaPmQgo6pzz4GOXdqp9sg9Q6GtRZ96tDWvov+l2KHHE/AE/N3PWE0DzxUEPj9qlU4q4e+4UMY/BWt3nHFtsQTkrV+J8WykZwRGC9d5NG0yFcFW8bqC2H4TDEJL/mxRtpNJlbJbU5by4t7Jdc48Txqxe+nAganRbUqmncxwVhs+gDzWxhYlcIN5JXkAAOF+LsQHggg1aEmMBYAKNHqsv2mrCbjcd0HdNRJ66eUaUMJj02BxCW2PMJ22psDvLon9i9nA6f9Z7zapXSUTUYNlTLb5T8PbwwxbRQG3domtUzlB+7PmnLlFT/8cJGP7rf8kckGRdGRZxUPW0QveecNrP6EPTEomOCLkEpi7z7MKP0TVWxxtkgbE6ByBCP4ohQyhxzFYe3nElKEjqDWUChRfhoSrKktqiUQlhZnGiKaKtSwOoPEPgL2cV7lrbp/KUEfKFPYvy9Uy5TiU+5kkDcteyIhj1QXMQeNU9Gp6wmXIOKZoBpE2AViNTbW1i1vjRL1SwwBXrNgLtP2dOhEeunO9PaInmMVw1ZbWVWfBDxFEUmujO6SZ1vV/vBqU2Y8M2Z88p5QAfHo0JT9xkzHztAA3ZrBNhjCMJurIpjlloVqlnFVsBGU6DsNn7eXOtD2oAdtsy2zwyFMfXNnL+UZJfi/rc/0xpnx3JZd6RB0dLh8Wx1D5J0mX4ID6WePbd6nlkG50Z3/sMWA4Tx7J8pzb1Dmvkm2FxSdnDqp1BkC+LVZZKonp5jA2S8N8aTrf6G5hQ4LtyaoF6AO3ZSHHYwrGvvAk/fnJ1nTBXr2Ardpa2uV/+S04qHPHiedieJOFuHhWq9b2VUCJdp2w/yIwRtv+fnwl6jnkJhGyOx9nPX4PrHCjh3DDBqArAadHyvnIST76gKFGd0oILF8yF2wjFuWt28Lm7233JU5bHPxOeC+WUbIatAi3a+E4ACngcH+0+hBs1sV8m7L39Jrvjs1N6nVIjddsnDdhsfTOxl2/F+ODV6YuBtmKGOxEG/Y8+pC8orOIWmK3toChn5wiC9Q5AYmkLbybF6qL4Wm4FalgawxJe8C3YXQueGOk9aF7/tQtgoXsvcVwAdh+4tzLXyg4l0YVgM/A3P78Mop1sWORaq6jJiFpw90Y++c47gkSpDj8ED+G9CTxJq8kkTf2p+TNHKxQ6m1oNvX9PVrfKLi4gROw7eqGVK+WExzcZRmYL3EbpRGdChOeVKA7wdb7rS5mjtiDojOJEs3mAXMhqqQfPoXasAcisLZG7/PqimQI1xUqsk1PksUPIWrl9Eq7J+THzqrhmdbcJA10v4FcdzOuVN4lfqzyhoKeGwa1mZLSUbtXgaSwt/P4xGxBM/veCeG3xxT38sYUnqP4w0h/XvJlgjH2WnQE6zIj6aKj3lzUZ7kJ6ojwpvGxGgd1qNYmF7Sh8ac8I75VLTHnA1GATQqBYawv4xhTZ4zvdMejO0/TTXGsXNvtrPRjqnb0TunS0rAY/w5rw0g0bbSPB8SOUB4tX3h1gF+6s1J/1sut0S5HLmKIN7QtHI2gbRkkxUJF+tGETOMtKZryC4bTCl0QDLJ7DhKHv++kIkwSptavVX5UDuoLeD1d3jZA0aYhuH/0U0hfFv6Y+bt4KnLfu3miLeV5QPImJLxTTf3PZBneylN7u/k46Mt/kA3c69NpXIyYWNSCQzF7DvsyB4+UsviqXr5whU1SGaEEvCBI8kt2mwcWk83VSXuzJWYv742FgqPZXcU6d2xszX2/MKCnLdE4+MmE/PMSypK8sgzMtPKUcL1aYmCaw4Idu4pXwHGqjjQ733R8E+8zYbm7iUSjE6Msdy6BSStIvr2AG93iqLbfe0ipXTI6JPD4uVEdsjh/wfIysPlc39tOU2vFwn4JdfpHmUCdVhOkHk4Yc/LPU578osdvPtDLp1/GC33p6ogdXtlKb9Xz7WZVzIxugALJQVIW0d9AYi2sPYBEJIbtOJ66PbECG6WLr4FV+mlrELdxiknByKvomsM2enneoyFhDvSlxRsEGTH+reaiYm5xsLyHAZarw/HGBFp17dZolCDfxTptfeyfeHOx5L/+tKXolGSqPUvYZk/nu/22G3Y7R/gneFMmj7ck7bB/P/gwJAdSQNo9/EWIgg7JZezG97yuuH9shM3WZMHisTjtofBduG3DKaAbqCjMaqYjfX5Al227Jzx9tF1TjqkmCa3Z/CNMpZcumwt9N5e7jxN+BlTlOfcL+RVaVxtLi4cB19aVpuRGk3JxKRJVsjE5TZzFgqshJcAQTn7GGbVW0F8zwCjbh83JvW8Yi9+iXpx4ivKKr8YWinqXWIj/LrFii7C8qeKjxXwxoT/WOcQXY/N1zluN8R+hGthznbzNJB9w8AcRJ8eJISOvbpxZnET65kKSFC1+ILrofVzTTt01frOGv0ow3Haf13Hf2gk50pr1nrJUjfZMG0v9fhrzb43IObsNvSuiA01h34YvtgKlnEnUdAOlSUU7oddNdXREpnFtTE6U8lqYIx/RN+3Xs6NCkwc69osWMsSobMIxNT1lGvUodrOoQfZw4EY2Rz0zOcq4gPB+IPF1IH81aAoZwGoh8N04MDRQgN1IhlzW0KZAENI4eBIASbgOyjjZYj5u7ZVEh7guwtNciryIrstLcB28cFc98OrarZ9lxZ/HNMWIhL2vX4GiDuFUdl/FGcgz4ncTOjdK91K47vpVgZ9RGyp6PtTvY+1UBOTRlxY+O2M7a8WVg1kkDLRFTzCFYWfbXuduFZYkJBwpxxafBgKuoqJiLxatwd8Tqv3QU+ZVmFotdPHes2288SaNe+2G+dgC4ggtahjA9DIxXIlSeD5EO2tow+pihIXkrEWjuOS3Yxuo0skDW4iGLNn20U5XS/YDegqNcN8N3zYAD+IM3UQm7MMh87pxMuwY6CjQt6wdxglCaWEFYZMAACzEks9ILmDCwNBS+I6BOkIqma+XttYmri6QW11IYAsl77FbxXMzRYFAdP7NTmCzwBD0kt+H+XAurIS/EvC237k85AXOucjchX4jVSm8bNzqHvo7s2qgJFek6hyHTzJ/sbX3v6lopZbNf+cbXjyC8lMmh123a5bctU+nwgP2+0MVwclLLwvoo0vMJyL3LOfG8TV1IrupT6eVrtpb3zPGvtAldcGt9QJIhEZgi51ijpRzX3XZaBeYfCpGnylKz9R9sm14ajW52QFO0tiXWR6WYze6gEn0Mr8F12caYkLPJR3+lZR5cboVdJIqTmhvxuXb9ECblqpm9Uof/8xFO5EHBg/Kql0Ti9S+0upWlrVneaipkGOoFf/Y0odaen55gIxx2pmKVEbKFTLRUeq7/qFbbMj9wQhy6i03gSzX8qM2Xy07a5QZelALG14vyDqh0LH2EKxJt24ZNCTRtYlNDi1hpFiT9SXVRbO8EdNLdx+D6bmcfHBjEJxu1dK0NZhw2/X4wpaosT7sSohFe3enK3Sg718qG/To8ig1nDzp71omijP/GiGJoB9j42ltOBf4UkNKLmdYf4AnDcYzdebMpui05q0xq79yf7Mhhy3ZNID66B8iYWixwWJ3iGJpkR6PmywkNTxPkiwm4rPN0QNew0tRoa0Lzid9G8NyBbJ1hn5yvUCv491PksR9mhbT2T30DFdxSYsfuQItBG7wxguHhy94PRXsIlVHv7qhgzDTzdqoMO6pUeWDFYjvfbkdMu1GtmCGvBxcub7GGsYHje4+Gw/66DztB+10ShppTj8AoHKhUlSWoQN0zAcuR6NN6wjew3uvC15wXFfs89Dlut1j7EX5utTJ8PFUHYGMlivLqLpKxkeSFx+5pRJsmoZhG9JiwXucuzbw3PSuq2gItKhqYVubz/L2Mga5IVUbgBvffctlVjRCpq4zhabGHxYJoKSefOlS+UR0EyAX1JaND2b6VjQwJZDCcM36qQ8UB6eotJdlrz1mOPwVmVayBAraAdRnVJVk1cvVPGgwnfyCrd1iajoN0EYNHJUkNDlU0HSgYJXu2r6J0ddeXFvVxpowhFsjceHmsecudmEIP5kqnKfjGSshMTW1uTwitavI37HFrET1R/YRrf2tFDlJDwE+IR7OfEc+yAh4+v7Jb6AVFRjmfEe3BwUg/dvWu4nbjDHcpnFlQkwo3auuemg8SPaRbJpO8x778RgU6v2e85XyNJCmL6y35LidcGm0B/wUFjwRMAkVEWi40a8hlablTWgL3lG0HyDfc6k2m7RSTBAarADpLggmPt0MLHR3ppOumdoyHQfqdbzJFI/1MEWQ5Er0eBpPfs4ENyGRO4j3fwK6nsokr1m3H2EAsULnBV/aX0+W13FrGBpw3g8b3aUmfl3MEEDU45WFextS22hweTyiL/aprpOSNHcTVSJIBmOZp9JIaRfhpzxCfVXlOyvU6Sp9c0pjjEy65xh7iQlZYxmID/TOz81liOIjGds1CObZ23rUt/Jhf1ocSKgSwNjEhTxNf7l+nUPJ8UzExxNyFAjKO96rfpzvpmEaVDH8DXQKqsXYF0oZuKg58om6uU8Z3QGrL8zzpCseBLczWnliAm9UfoQGiLqiiDf6TuiHnlmhKINaYGiNa2T3Br1stLfUgWfszq1pEe5HgxeGH5kXswAdgJ6MzYv/ZOE1Bi2QXsbsrDK4u+LOdh++9qoEv8+U+XnGGREMYq0nU0ihbR3rJM3+PgGkZ684M9WHbhLGzeAUdz0/m1hymUdBhgs7K6wYjApXfBkBsdCOQPyVdibmp16FbCe9yQ2kgm56pzEvZP0Zlt4jlsb6P4I1um6gns5lgwxuex3zAGR7FSeZTMVQ4Pc3vyeTBtw7Idm5O/te+J7gCIleHIfuCFxe3f1qrJnLhSwofG9b2Fwjb6Ou2SnnnZ3kQEWc4fpJkuvEmerzUmn8RpWtIdPletrHrdgMjhvuWB3e6qBDHaRnYnPaA5gIYaApPANBKr5SFCvg7vaEOogkGP71npGZWzmSzTw53Kex7jKexUz4NRdLczuY9vNCL/4HZwYSmX6HpqYWHLVeOHY73Hu8DSZzXh6/n8A0D8lv0QXIIpadk3jBgxAUHOmAZQqzcrJ2jP8JaFr2zx41QPYZ9GCbgAopcDoGQeoJ30cgPHiyvrQLO2jDGunL+qidbzXQ/2bY5st8et+yBBUCEste/ZjVVkt+JRhrLT4vpf+1ie1myU286TT2TzbOIaOODJ7C/OM6F6grXDRyKMPOnHXcvMrHCTYN2llNk8FlrkxhSV56R6ubfGrPXBmdc+weCLVE31YlOCzu40kUhiEe77R93WDa1BL2KxY15izyfG3B/kH356m792wsbzmkAfn6mvnd2TJwtXeGLwKcikxRF9JalFEB8c2/jDsboni3D0xfHXZhlhjMVt6vNBNBHRrZWS4RfrzNP9UBwHgSxS4/S34tnVFCS9IKYmwHWEydkbsakIwhF9qHe9pv7Lt4dryyp9LxkeDe01vtZ2B15f4mQh93lYFXBNugLG1GwV78/upmSUfPhZWJMp90xEzl9VmmzoGYMACyRtL3D/fuECHeyOTXOErq6CkH3xONly69L/aV0thV7tcuIvj4fWKzcR6LqUfy3cacH0OMfwu4tB+tcFdbSHrnPGqCpbkI3gu7JQPQDX7DN57nCl7uQVgnXIqqM3VgWvIRtweD3jBXzgDhf2t8jBjb1ADL3lDir4SC6svYhR3U1uCBC+rzXfxU0mVytOtoFSwIKERPaHijvoDq7YKCY0Ps5MdPxg0DCAB3IyiO3TywguOLCr2Li6fgUZT0Ja3RszL6bVSeMJh8SnHxq+eemD5usP36hp2JqrKemncnl/0K+r/u2MOJwg3j9ENgCN9mpHG0DQINSxlyWF4kq7g7qSbRMNoAUjvr5WW2U9LBsOufsTGGM7Vv5xgSDXR1lNbB/5SMGrwYa93KJXS8MshU+3cM/JF5lA7lBSSf1jRyjlbLo62h2ZpvzzhojJptrlZUGO+LyF09WVsW0EoEekoSA+Z3KyFI3obTsYwIjWWjdyCY+EdvQUIDbz0SR8r5hHDqfuzOO3GEP1ekH+4aY8uNyf29tnD0yV3qDWNi0GamoYNU/tiJIolKYU3STriDjHjZh2vhyKHVHlIgvDgBlc2h+QoC/IrmqfsOAMLegh/fUTYrU2m2ygrChs36axdRtAMYlW965t39Jz+Tc6HalSCsfGGc/dILfKfE5fjvPrLyfKEX634mda9LBTfDWxoTOFsgazvIxmt7xpPi5AJX5SHwcCTaUp4RW/eHLH/0+N5x6m7NxEogSMXMA2krpgJgCiU31IX7B6LbcbOtTHkgqz8tx2Ur8jSYR+X984Cl6Cjdifk2DSJWXCJpCDP8Dj7Q/p95grpf4wXAALmlo7VbgTzPOqjjQ7kZ9r5n/Mf07WT0dQExU8HMeaOf9mfohQbmYTPW2O1/oNfgzCK1VJWgrb5w2Fft326jaeCveml3Z2hJZfR6NgKRU+KgS4M2uHbz+NF98ib97N6OHMnRNRUM1EQLKsf1GTRNRigXOouTJzUAWOLcmIOcFitgjVMxe8p3x84M0bdV6baIZ7cjJTQhvoklu0iz0TsaE2SSpXugRjG8VzlxniKo6TNZAd5s5Sx1Bkvrv+Dt5C/qTsmFw2wx8K++9JwQxHaIqwjUsYuPVK9s3GjToRRzEKctzkzM/a7zVd6OsSozKQ4gCKlRuAB4lXr+KsLw8vvffT/v1JIMymQ1thMLryhnojaXIWhhOw5COtB+Ww2OXddwz+DMs+DM3pk5uh6JRBPudykcvlV4032Oxz9XlskwJNBxw5lKG4oSSfX61f6l2YKnXPpZejLZKwjrotOYKxjUE7tPDRlK/RrUbND5mNZ6O0r3iGQhKVlzH7H0wdE2ZHcqTlwXQeCkPjuuDcdB0jj6B0h3UoYHvirMoxNsb3i5mqCs6hQuWcfTl4RWgajNRAr8k50X9pTkana9ujhS8WPKdjpRM492avTDY37oBJTzIzgUqtRxhRu9QjJ1nehsQfZu7bsRaqBqr0jWOCrrvB0DmVvrm9oH0dV99mK7fIEOidxsPhKFYyVz090RszhrxgqsX+emLiZqkdHtVwY8/VdrXmL13eGToV5bOasKeQ6L0dsWKju2CatcuDrMhLSgLXFRVd6lkkEn4CWyHLqLftYF/Gd4v4GfOx2yKa8fIPec1iypQnWSsc38prBAmdv89HClNXVIdqpLNkxpfmRoDpC4vXA0CUNDo9jhUUHrlVX+DqWbKl6ZZcWEOV7IiBV63ODhD9FIn5rx7C1pYwxMVf5q/oL1qC3Xosv/HWKgM9BWcqUZxvc44CyJg1BKFH4lcL8T4EgauQsTskBGhbQ99XHjMmIusojAykyCl9K60YzMzHiZlXUMwNNQK4Ew6vUJMmR8SBzAJcD6Um5OH55I8/P04qxjgRcsn/e68ucz0ZIcR1CQekepadSBhRnh/z7b25bU13XiANyW2Pu2qAiQ5hNCguhlRsBQTSBgFXojK+iH+5p/hZIa/nTGwJuKZgrfg9OcCpGA0PkfLVBioxY1nwcGVq/FV3Wqk4rbNOAyw/rFiEspISggfbCUB2nYEeAH4zxZjF4L4YO8uQ8azhyGEQPo+oLCflD+CiMezYIJ7K63/5X7YfhtH+6STWjSVzPtrh4XZh32xVvIAf5Td13q84oKV0xcfw4LUexPx3fOVJYI9L0HKfLyUQ2+pIJpXu4hnSKpUfve40HdAuaiHZY8TuBfMNwSsD71fp3prEvguYiH8YIrZfRzIsHvX66oDhc0JaCalSkKdlprWAZiyz/dV4T5xw9+4F/3LryGCZbZ1cbOXCDQlOBhfs58uswpYANWvddnM23PNM9fn8bxrzYNUlVUWARwhE2seXThSnwtqrtVYTuDRVWv79cFpubMdCzzX9K4kMSxbYn4734uwFQZd90og8nY0gTn89yAPdDGe3FkZcy1sldoJ3gGhtZGWY+SL7+I+c0SBgbF/2bMuy6mPRCVyRyjQbZQtpaCk05UcdHcNPWY2n4dicR6+RO4w9x5U1zLp3G0iyij6aePIiz2C1256v4PJKiqkMoeu39IhcmS4nZ0zhOn6vBqhrXXt1aVcTGbDNsvVmUfoNzMtVxJt5bShz1Xr0Ht10wnLfKxChSTVPiNor3lmC0sGFGaK1LsVD3QtOFbncXOSHHQsHTWUUP70AMTwuVL4MRGQQyuRx3zRkX0OwQI1+vQI8L1jlJrUILmAYSzWeVV+IKUa6ioSqChVgw7XZ1y8hy30e3rZFUa7iUZ0pWMAC0t+THhz0+Vl3xWRokIC/NzVHEURtVUGghdamcJQfAHsNQw5F2qSbzhLiDuFr+vNxk99VpNq0gp1svKs1xcx7Z2pYWTikI4xdoJzThD8pTORySqyjNKdEvvqYxIDaj8XdWBy4AGY+IztzxYnu1i1Ty0n2WZnTS/CV23GSfcWjzjImL99OM+c+jVkmrknPZYnMnOAHwnHr4SZ0fH0mmoq8nPXS6AhmepcrifBHDAC9ODZAt4Td2eIg2TmDW2qn4sAbmIsUPSreELnKg38muQI0iI4D3ZYIG7vwckx7CqJ1YYuQlyrwJV9SRjKphCGEeF1kL9tlM8dvlgIh7IKCUiKNfb9smj+NTknnL6aVOKa3yx386F4XyjZAN6PokUOBEW7Km0hRrf8vD2YaLw3Kd8asNjodrbVBMYZnrKiTcpqjzk/n1/Irt31IrXHH7n2N879td38GbsC8Rw+CHX+rVqWmrHC9TzDjFYs/6alUtnIHy6c7+8Shv2TpI6zU5q1MN67dnQkkAO+I+Q8QlWKxjwQ/eQzbiLklujbYM612dcAftXGXEhwznwgo5s4gvsGR0TTyK3CCBBuIw0gMslKJs+RCNQanmS2rIC4ApoAfk0iLuYySjpaurfz1Lz6ZqbIFq+yvW1ZGVf2k1sYi0SN3itstBsZKmZQ/Vb5OAoLVFaZNS1wU3hl5VkPdYuZ7AQ2BZIMIMGQzlGHhC92gS/Ky8Yi2gWwd/1rudi4gd+F3VImStkCjc/ZQGeEeL+YKOq2K+O6h8lyzHWWIOl3A+rC4NT5b+9ci3h3Rnc78JKqToP9zgZIA64habWhvSlqyW18OxYCbHWPv+waNfC/cGP7qJL3wh+nz5MlQf0bGgEVB2TQdQNmHl02oLcCufO68gnxj98bE/Mv8eMl16NOFHNyRje+Ekj15xWTMp4I0xu89uUhK2CZteWxZZE+wkGhU60VmoiJYKshlDDRWs2l+IM7cWkCg4Px4dQ659Vjs8ikFe/JnKKo/2efIkPTeM2mLQ27H6+m0l/YO5MiFCqhpwoloASMNmU4kgcTCasKkj/T3SfL5MkSR1mNuFB1Ev07W8BAgaoL88e77/XWz6UYCXtMhVRci1Z7tNZJe9mlxqNF7/ix/70grOZe68dsj1DTacL3Jm5imcfHrx24V+9evWxlTbV5V8sjnNLa/YSzHTYsJ5WpYqgg0PZJmzPso5zLa/zwKV+zJSBkhxCS+rsXHm6lA806o62jYFaRi9Pn7rwvGqzTT7iKTYBwGqq1iVBxX6fPbz/v7OSH+IcAviUnekyY7MpJdNqCXgg+OV1aH4AODkqEgZ3FIfa9SuqTiIdpvpKWlwdmthCiAm4xPmjW5ovt+qxvlnN3faEX4BOzp0h7pxYbz5x6Z9TIEXwZKgE9GF22FVZTGeBirEY/5L+4rZz+3svjjkr3uuqcNXU5qNvV4pX+R9aDl0u3JE3XKZekQX9ATW22VNVb/X83hRJD2+qxMimfbFseF2yUEGDfFKGjoOwkTvn2wBbhg4g7jmWs4CEHaUoHAa7KPhvnfkPzs3hp+RQgSeDhbu4Hc8gTSFa1qnBwa/iM+kM/rnMyUmUSx+121tIdUc0/crzFl3QAqL2jAX3JBiNCAk19QgxIeDEU3KLOy+1DHHIT/WOzHEckrxGYpavdRGaIGA0ax2ylli2WzRmcQHRMH0RPxp4D0va/pafG/UnUowAP+fhX2zbik866/KxbLL6goBNFhjDOLOvraT72avE3uhntt1YNpA8SP1hUhfZFuMEvol9ajzZgLGgP+5iL24cML/b1h4r0uqwjNRXtd8Q2LGNvPO/AZQYGY1MgLuVF8smVR60A67v1XapeDGRs1+2vZY8bH2zP8VCeeLt2WiWigIhLJJWYWhCKi+VaPsVLdij3Xg2Ze3DdW5k+EmEkuFAp98xMAzWVRlzn514zLaYUxuw9y2kvnU6+j/AKtoQSw0t1c+0oz0NL2O3Rj8+4GnqEVLYwStR0zO5ER6pUEeI1MEoxPgcB4PSF8q3AmTponO3GQNs1J2FyLN12mnVgGNMdV/BIKAce6wQnfl1ivk5ta4rvcGl1nR+4XzLp9jgp8ttUVZB9hQN7BLNeZWnsEsfp4/X5NXj2GlRQcbCwnF9XdwRrw4EmkToaq1xD1jAi4CfWC7L90oZbEuxFXXTOeZmRJ08BeJQUuX5HMzfSr3s4QQhQdk9PgnwoHJLiVMgjTWjw1vPInyEeKQzCa8346xvNEW+0dLNGXg3VQqivyBLY77SxwaQAktnLgfqQmtWsD04xzXa1cnJ/CjWxbCSGteIEHQbde2o2HdIQcozR/K9aZJHITfjWR21BcjekXF/zvaDVhUk04K9mGiYWgIbR+5+JQxeBOUe7uWaXlRk+Yx5IY5nplfTu3++OxETL62xbud9wxwltgwU+RaGyIeYqtLLIqqFD7L9r0LqCZnxIezkt5Li5wA5Q525UyLMu3qQ/Ev2RR6yQ7s3Si0TS0SqaOgGczXdHUspzJIEBvrSVXF79Bm6KhjOqdJgRPYnImMySG1spJAaXFQMeH8EwEN1USJLTVOoooKVVXNE36aFVgEO1UkDli9Q4x2O7vKxV6w/kLiTcJ6oo6SikgFyA0zylsh4e62eunUIxI9XIrUaQCqaAMHpEboT8m1Vfd/HDl88X3Unkhyf4GTuheWWWORm9sE+HBAc65yckggugDCM1/EkaL6ktBUNmO/JkXoh+9QyME1Ef44EKONhrix8R31G/81+j4EVoKAbN86+f12puIgFH3kRPooNP37G8GfSViZbxy1i+Eh5ODhSQr8h7YePBD/6q+dTB6At2eDnfQydOUQV5r5puoMZxVFx8x4j1se9FZMcarShVMnEfib+6hRcq0u/gAfhDDp7Ll1cqcu/W9PXZ4LPcniFbo6/n87CxYZSznCi6N0/162glKGw4B7+HThjU9sB6yuJGSryInzP+v2aVLn8lj3Pvdm0PgW9w4hpordH+d84NX+mJl6Z2Rvygn8nNqwdudO4fDdBYpfxjkD6Mau1F4lgaLX5vjySq0UbTOxnuiFEIMKF0WAJeDPMZGiXgzzHBVUUrivKkyNtrFHAYYkPtOTzbEbBaqB1Uy3L/3FaKoR2QkUb/4UiOXgVAoylFDlA4gSZta4oDwVww7mKC6nkx3qpMRp6pUiqMxYw98UI0iT3Qm+Abh0odkxDYxG4s+VOXmIRwDEk2Mtuguin5x+pfHj+x6gktBEQk2zpWOWAanIEPgbCqhw1rw50YVcFa702UoIr05juXBSGiUd+5sah5iOio0y5/C/JguYzEBiOATYmNTZTBDDZAjOafv7goGdjAaGZUpd6TNLa6B54AJQqPH+mYUJaoKCpz7FLRP9+1n/KDDaC5lYiOkS+iw7YzOl5ibdZLJhtylyw8z1XZgEN5LFQPmkdsa6tMvX84N4n7NxxC30fO6gN6nYDK63oxpn7GTQYtIJiVwkM+OqpS/wbqIOyQ9F3aNPC5kpfn5uGseQ1HK2+Bv/wNRJhwfchLAiJ47/4x+qePRwNf94BytjJg9YF9PVnzuJwegnTDucZLh28/m+LaeS+S9hc7foNKAkfuD29kuxJj0Rqgj2qbtyU7RqFXo/kMu6SFFDdodjo8qjT0VHKTTydzw7XHhRG4hk2htAX4OAo85lBTJuGGVWyZ5h/us6ni84JeUugSMgi/qSYLoF4RvAMBFTYqpO6XDn3YOzmY/csq+VlHFqqR2bZnjkBIWQ5Zj5CSZKrkRDXmIncHX3JVydgWqBBoX3VkB+AZv84uC2JqZy1Vve6sxw/F+N3iLyOxPEk2PuH0aR4ScbLni5PK1YKV47tyOj/GhWCNjZHCH0WW70TnKYkoszSaTYuZF2dZ0+UgTPqdKZy+KobPze31zd8IJxMDyKr8jWPElI8djEBeEqvqRQXXaKJUex6cR0nB9YKXpukvmpMBZGpG7Fpqydi9/ZTV040LcRwl7a15/ZyS5B16PyIq3IqL+m5AB2b+XAScLArTsBUxtszPmG0UfSwmnj+P6tl8BTQXj5GgNstPPaXBvrdkA6Lx14ykkmv7Cl+BMBjjRzAeAhYhpn94OOSskiKFJl1dkDmIDbve/bw6GIqpkZGJVfeKO1ShnRLqTW1FlLaQYHMtE3yqfS6Dy9+yiEh1Adi4LzV9bKqL5aH2R7SXfNJHJwqFuhnSgpyjMcjbCOx4hQBOCpgS12+AmFk/Osa73RYIOgiCJyTW/NFTGqilIMxKhvGa6ZtcQgvQEQIrBuvrdtz+qmZGVJ1UGlnHOqiH7HxZcPQomqp8oZQjdXUDJcGsdQ2aA1w3Gn4l4XFnJgsvBCebJBV539AwYBjH6Ff2fdpnxOFGQ0i8eiULIDJX3sJk1GEYeBWgDdrR0h2S7drs4iyn8W6Y4p2+HUYrsl5J5d9fT7+no8d9S4xEuGuvTDPlcOrRE5CJrJltxB1SAflXNQN6zwAV/fRz2UnM4hCOiCbUplz2Gpf1HM1WTx1qnJxHqOdsM95SvcHsO293cg4/x2bqUSSm5cC70WtF3H1AEdCVsBgxj/yPCbMMmDJsWo9PIN12hoZxdw62/dYPQvepaXcemZ1Q8JO/F3hftjPUWFOOoBVQKRmVvVht/PZPoQZjQRyVBO+uB0AW/idpeUgaN/5LM3Trtps0pypHJK99IMNYfIkDs3RSyErkSN7d3xrVaZwAFXMOZLugwljUQU0Swa1gyUTyWecyz9uPrRbQNswHkTPk6nyl3CThLEliooJ5faE4Js9r8ZBdU2lD2gA6KpUG1uX+TYeo4BwOjDGDY2CqD2lui8QnzOFJtlb/D8FliIwOrJbeNy9704Y+zaSFAZ+mwOrSE8c8CgWiVjbT0zThobQDE0/3oJDTrqJn9NooVojNpu6lAapfbEo/keT+UN2FWWvYi8ybC8M9AzmL9XiEUCjswvADAapp4IwBgix4j0KKrNMeLyCDUbcmlAOSbAop42pS0wv91zAPJp5QpToodmff/YjZvc50FzJzkPoe9TDnIgTkPHR4pujKBOFUYYKU8E3AEefXBJVpPsCvxB2XYNSka1auegyzhpcIYG/KWWjI81F7itWzK+g94WhYIlN/go4+5b5VOCCpHhs53LhARNMqMVa3s1w0iKx/aNTiOLvpv4dzIRobBt0cfjW7yn8t7wZIL5ZORvyXTbw1rKzL6NyKNFj8U/O9WOjXcVboNrH2UbNT34A0TIy85QbprW++IPrbr4IRMZfMG7T3s3BQkrqTn/LvnKp+ts3RgqSta5JILoCDDLzkphft4yYuuWEc26Re58bDjYChAx6pVCSR5weOK1fb+qdLPguVQE7RSvydXK0kVR30uwd0UDyBkGl4uppIiY5iwaTgKnuP9waA74DC1vcv2puEiNrFbOb+/QUNGN27dkk32oCQLy75xK9vhkaozYBi9B+C9pZB/ZUeeE0zeuDn5iSzSTxVZLmkdv5xODufhrZxdUnqlvRvlgImYsG+gpF6WvQIzUycCSDvDIjEnR1JGE4dcmIIOrdVzbnjti38wTHkhhMUlHNnmfXOdr1sRpdb5XFBtpQV+A7wxwg2NygYBNcvxmGrdi47bVvVlzn01VoOxkB54/endHHHUH2jYiyNVyYo6ixpf/LV3TpsKUv9ZgxVy+jWPB+K9crDzHAfj60qF6acxHYcdaO3EKOE+cN0P7Zu14KltxIhcCV5otanL4oQpXxyqX4Bky+6cS/e9eQvUrO9jzU78II6AK5hQ2WURityOYwtcfWAWSZcrCj4DWAtC/3z54D1CGJuJwfZzoWX3hfx2p/4vzgZ0u2lsrVfq0iWZorp7g6tau3ywE7oyX5HlRt+KTK8v56Mx0D/SPtDgvp1vbDkOEiKuRIzVsFb4MrazgAGrta2FDGaURY/zQgnP/ndkE8UyOzt72ZalgDkC+VbclbTr4jNF3x3Qmpb4uLBvgFP4ljoZdGuZxG/DosmXP8bb3+0ygp3/bGx6CZMNFFtAHGXAo/1WSuGa9yM5YEFmoVqDTuTURwTVkbezotGnN0yA+I5fyrbmG7OM3gWVpKecfbskNYC95B75v9HbEWg4BaXi8Q559ylO6jwW15sdW20enB7o6NKQcX9WbGD54IcbBu4kkbWwZwDKTOwtnFL9r7UVfrZNYWPvdq+gcmEjcei27oJuy4QGB/KcYNxRuFm4WnfOu8fubiSS1l2OjkzV0yVyt1AHHaQ620rs/KLHFawiAwyBuI5Z4qY3n7YRX9bEOOY1Kp+eYSaI8OEYwAz0tGk9EaYYbNzAdNJictwqZUhFZfCLiqf1NgBXod/G54Fp1ECsXTSr1lTRq86893hMdO89lX8xLtBmPjwDEtYrRiWFNwhscPizpWXcqwO1kJ1OB7h39RU0JEN8wHVc+x0yhs8vsraVUhc7LZx0GuLBmGqSAe1CCYqEX30GYAyade8ArwjLHOJUF+tmSpX4ADxnmU0EcM9DMzE3baqbVh3GmxCUROrazQrlWdQiNKxYtz5OudplxX2IexK3Z+9j6zzZ1pMUIUhkLbJCXWw8OF7U64oSxR4tr8cYBZqOcQGsVOmuic9HnOjw62tMMz4wauOngPula6B1tJ153LD2GTUjBO5JjdJ9uK5SNYkdzEd9FZG6IkAlzmBSocFDqlTPrn4xCYo8i65yIcPDCx+o/or2zPOEyd297YviEC5BNjTVeGkQnnHIrUgUHOT7Gf/vLk3QJDJSgTyhPbnSMOFOwy43QyssHwV7C0i+EP1Pik38TewXPxGUHs/m1yX8jyr+m4//Cl5FC/oti1U/nrackZ2aaexBQGllEGPCNX1fspef/lO8xX+wg7jueOsvJl/uqeemlFeQk4q27FMzaEIZvY2rETx7mxz/A5axcaooIux1iO9fMFWQf7t+6xrxhTT4iHmSHWD3L6JjEbVJiUg3BXFinnK2X6JHXRhtuu0oap97tK5+zMHxWyc5Au3BR+fU+lloKkgFZeD1T8p8hZ2AWwM8oKuVihFPZi6Mzu57H7vODFbg5OweNbiODiOi4fILWxido0dWHtavrb97HmGdrpg0CM0HaQvtr7JwLXiO1vFkVwSHlmBzqAYO1Qc6JOYO280xU1jmnDbgkomXIcrKfd2uRB5He6st9RJCJ2LLmEiD1cFbJRCml43RNrsK1TrAJaHSCUFgxaKiABJEhyBjb81+tBQaL2ZHyQv80OnSaJlGXzmriM83jbdMDq2GiQl1PxuihyEAh4ZMT4wmiwFcMK/BrTFOuQ/tXHxNevzQhX/QR/3csU7g9X32DYlptIM1YlAbTKCxvu/Sf6z9iSBtYwoNx+ewVNe0SH3L8ZAyi7MDvpWcibYCerj2lQoi/xLqgDm8eivvYmjhIEDz+Mn9jzwCON1eN1TkfH4ZK7u+n/8foJ4k86q6UT6yR5xr+N0DJfqcanJqDfyovPg7GFkJts3jv8daNit0BmuYWB137IGcW/P7m8mzMvEF9qtHw82QJRUV+m2uPg/ryr3jeMG6MsKDL3TNNjpQk/iYsEaIJEwxs2HJtjNsdDxprGPX4ob0vkJaiWrMPIDoH1ItP4QzuqIQqJJcyHwkuUdnLyIiUUDPK/6ivjLeAB/iJXd7Ovm6eJTTgUnOWZ8pdbAwyhg4gRa3Z89xY/rvu/rdi0IL+KlL+9T36adwAeLtwGkJgMcjbwQjPXnwBqrIh1ddP+aFGUdhi5IkKwubx4yUScE5ET7pAhlkTIQXNRJsphXikiBv1y4Xxne7A8fZ03ypWoR5cyljMArqmTQ6YZti4HKxqJiId99Pml8tdeIwV1HwB9/C/ZCB7zGUlRuc4J0Z+62HTxp8doP955crviYSpGsHbaXVHZKA3/9MdpnknPrDfPHNWKmKAPyfXX44Q6cN0XkXmtQ4MP+NknbRmAmxsu9WEDqr3rQIrVgOaPap3HrPKeCE0lAxsjtvIU0IiA3tyPWZvTp7gm6H+ehL/oU3Gzah6DirNBPXMhKfSu9P9U9jfvgAAdOyjrNdtZMH1T91LhS1qDSLUJEgPVreB507Y+8AdYT21D1v/thkC6upzPm7dr9Pk93ERhd3wPzmGJ8Me24EDUwembJRQcTMXQ56cfBzh0woZUy0kH8/YI+HZqXhKEWAcb+tToe6uIlupw9P75osAOwrRKZ45j+mJOxR/ukfssme8fcgWGc4E9hlxtyHkzhJQ2WWfsHDrz7kqO9CUCe+xAhpo9HusWej1y2o0kYYxvOq4qgwXghqEYKWL/ZW5Cmt/WS4OPwYkHuzMVALQSRNFNFhLVgqCjRB00BOZcAOEt9GR2wvV49YuGjsS7q2ioWeQD2YQ8zYs+K7bAkEimdlHPOrUYqK+uFKNhVMccZjwaYP6KG3uZrqZ2EbLaGlo53CgaGjiiacjj6YME+OuDfc49hduW7MoDN8UAu+Zil9AWdjUOCuchjA98dOkU7hugqkRVQNM9ceNHyN3HS9CSXPgNKxjAeUsgAHK5rqHoLFHNFwBPdAFFzDTP+HgGirYnS2ZlLlNQEy9OEv8Np6ijl8lVqa4hXyKuPHlUUpVNowjVNJ42yH61dfSVC4bK8YYsi8y2kFMaqVk8CBQx7l1w72CR5zxI3YFgmDz4QF8fVxMGR+p4EOXRvwxdeSuVL/8VtrtNZCL98wTz9XbAYTT7uoc3CkEbYtZcP5Vy1J20nOVHa8KSk1PVYuFtAT7l3Lnm9MPGsILZ+D6ib79VDyLFo1M+lzhPn6sXhEUaRFRyR+EOILMtkK8dMeVasvLfCMG/Sxk49+S5CWsq2vTF7gH2ND6KYfAhbsXYABhkFBWc9oVYy5GXtaJoHzdzSkJ6DPKxlCJSjZHalxK0RvOLIZ3KXk3FTn3BatgToSmDnvyF5yX1kbv7Jf0Q0qU0pCEwqESIADtjIol0iBLWcT8jAO8gRZk5YSDyI/oPDJcLCzNeBQvZfLUDxpJYvJBMlnooGWwVev7Xu4dU/u0/d38jP8+W3P0xtOcmwQaEl8OalXdTaIPV7BapqfSby0pt0ZcZSyCq6tHwSsIb6+4+/uvpjjSIA4i/Cb0/Y68KhKB9LGYv2CTHbl5B5b26h93dvcN3XgsfC7M7krx9zJem6ZAoGKQinxBlIihSNJOzIhm47p3JjoaZJxWnBU7BKpB/io/zJyL55arcy9miPP/ynhDTwsRyXxxVsb0FqqtXbmkKjqWGJuXl/bn21Y/lSovzLrsWHMPs0wyY5w5MH3ln0tQ05HsADs9W7FEsrpwRUdFyB9SksORV9mKEvFvmTbeETeNYg+FLJfsCyOReA16Z5krjI0f3b1nMscOjcdx0LMeIvfV7QuDOJtmtWJUGs05s+DrMX5HzSxWrlQLYkDCMDabvkmPSeAjRQXjzCB/EbXXlDR9lVocSrzvv9uv/clG4RfQfSDUgXePWnKsGZSlw679ff1MWpCp2rY1Eo9kLa+iCeGD2wcZmTz3JBa8hiqoVUpZENBtxiM/GqPTgAqGwLt+4c6OoVRObbBQlDIjt1xtP2kUjd5+qaNvtnCSwl5XKaUlhKqEhTR0siUHp0CBQlaf62XBWqRpfwKbcMd25MlAM1aoJggWE4niZt/Z/WGNulNzLVs1BhmyfTl9b3WlNWFTDHgw/kDog9bXGm0yjibnFv9061YnCIpDtPKKrdplFE3f+5BkI8P+oIyIqdeYXuZvfISSKflLd2k8Tkl8VGKhj8jsTW7O2fJooR0dg6PJU4VKIN3Onh2dpdI8uKJ4B9dcOycDkEfE3YcbqPnTPxmzuFPAC4Fo3TWOfkZ1HnDI9D4dslP1+0jSVcQqc9+fbi+Dyb80joaCHzRaUNebmFvu/ERDK/CL1npJ3JNN4QetkURTOXWw70lo//WnVtTLhkdlJjYljmXrbOl5JZzhE8VYDA/d55MK0HQPlaCTxTkRyuHQ1fu/D9W0hDWW7pLKYNg9gEWbSFmGSX4r+uXUWLMY4XcmyLhJO1x2INzFPWRaJeH2MPSJIB/Cp0cCp0e+iySMVsCNPKvQJVgBmZCePlo1S02e4IHSxS5eHwgd3tBBbkjopZo8RU7qu91hGOu43KMw0xifOM0t5oZFziEyso4YDTsK+j91vDeCyrle1cETY8b1eAxXeHO5BIQypdw4Ytyqhw93nKiMLY+IuX+ZH5+Gltls1msbSC2vSGRiQb+mIP8qRVzAiZg+zGQPn9rvi9H6STi94Abc2T/rQoHD5lCFx+TlWgqzXJTsOM36ztpVhyWCrgr+NEYoQIzjbgwSsLQXMYlz1t42ACwHimrZ5YtANFAroA8Kz2K98CHj2n9ESA5NBCFx7SvK8rjZBYGYglNdxK40zbMuhk9lTeNn7BPjUSOaPZx8wA0jL1MxfkMiQ8bGxwlP5aYbTze8i1hI6VghjgOTj7xXmB5PipMT1FEAwlk5Pf8yv0zn9Xjhh2fmsBJpA/7uZUEa8gIMfJEyh7KkQNiyz6nQ1tzWl0/SZ6duMd1J9YfMePmBRNnKbJvYphonaxGgJ6hMPxmZNYtvzvzSQ7x8oclVVTBd8Bl2Nzo6fpmFCVyZiVEEWtLLFZw/ngs0kAbz29W3rfAhQVLh9oViRnMjfZEW741G9lC1OSzjBm3sKOKsmQOmmTOmsbmdmyurs+asKEAke3LfOllYreIbD63wpvudrQUU0VLCetVHcLMx/+vhgsRw0BZiEe6r85S4X4R+TtJH0CaJaaLY/pehgSIDU+KJ6do9EDMrRg8WItzirll9ChKl8NnM5xpHCFL8lhNPPncd7QYz+BrL1aMqYUW1yMoMZ3x3UDG33R1xPLQPg19Y7YU+AbQE6TWYvTY3q2ks1O4v+Rr0bW+zbMPga6n8t1JceGF4aNGa+uPwkmGmsHVPFtlr23hW6HWl4LBPaGzwluE+HsOaN/dTt7kPj3BxKKshQN7Z/tk6P2hCdIX/KwacmwxuzbkL5ocfX9HjO8wV8qkA9QR/6DQKMBhrINVrQKnJ5xUV4JIwjd5GoFrdxJYi3xF0vfVy57mCmUm484WhEm4WYh+f7hzv4fzUQ9FL8xZOrqlR1HP1DC51+pv7Aly3wUeGZr99WILqFp1YMEr6FBAx8BOpLWQ6yx+abRgKCnfNjZ13ISy1BIJT2qkDmidLMbG4Z3dc7/6Zoi6D9AHr3UniT7fpdfM8oYEYTx4BShSvZDvyJxvGFlafdyX+/iFiAPOA0BuN1p8458ZzaKGxixCkIH+FiFBezjfQnWhxpuYft2ypIMGB9iecTWEg6iXNsAOTbz9BMzRCMjjeG1DlvZLBDcyK+Q6CuDGxWqkMs1jzInemMyQDWd/pSqYE8RY452jqFAS9JCNCQsYj67w4Pa9hY2NS3AIz8ocSXxnY59eqt46pmbP5yHcoK4iFRkZwuoMRW++f6ZygM+uVvQOegNvtiNWaGx9bpjzKZu2Wg2iwz5hiucjDutl+bpsHO5yQldOoyzUS2V7eIdnX3hK+Gwibbu81y9jY09IqOSTHbcl+bawo7xR43h7oH4ljJsdbccdKwBnFhm0nORc6K2WDPdedqpigHWmfZlJDxKv/WBDoGVVh9y6BC5koEzSA6tZtK/XMpjJ/xg1RDDQOzymByuQ8GSn3ZIdbJCBd3BOQCK9AUzrtCmBnVS4xEi+0KrnUEjd8TerrBUvvpIT/FUJq/C+/32AqmB0Q3WPfNaPMF28j3Uu6zUyisPBUx1kcXo/PmLP7C8uEQK6jLZHutK/anBlM3zqtv8S5+YyARqARgMKlTfViE0uEvgrcrmIDyGyQy1MWuTd1oSZ8KX7h+Wbyir4IWb+nReXvwrfwnHe2hiPQi3uDElXxvendV8lDr3CydUpDAxZe4RchaC+9/dsucBy8FfYtba+wynp/bINgR66qyVN/bvG0k1HUTQ6LUJvi7VRbEdpf4XNULgOJ2ygsRkzYZigT66EzhSx0Yz8wcihXp90dMSOPE9mVLldmO1AGaekK3N8szFjswSO6P61F/wYzRHGZxE6Cd9QdKpqIeZB5CWFX9DcMXk96sFR0lWoDeuLLbF/c44wnf/9U1YgfJdoQl+d727GmQ7s1R+DqQc5GOW6bN/eD/utmXUEMPzKJohpve8S2ZShxN6ZlfPyjJEa/iELPO7/zLSkP6Yb1fOP3I8l+J/Nrz38tdL29o6KO2H5NNAvANnjTthtyUqoEzy8xNUVV/uj1QV2eH9pxM4jjLmmxd5F25xnkED5RNKdDWeb1Cjwwa99QylorOQd0TYrdGmdqNb2jXHojI1uYOwbPotoMqIRaKYwWVnMLSgC+K9SIlC4WwQ9tBuvMUiin+QiMyq3VGnZkvREyLH/4+aeFAwvogDew7xREaxrJ3TeZ7gMSc0VfFb6PXBlNkQNWHIVU539mN5iymlqBZpal/q1Yruy+HEjZXemrIFKqM5ewQyFq8Yjh77Dm862+qslgro0ziJEmN9Fbnr/UcR/gAjh3gzCJi7Anb4OMNAJ4NlxefgxDPId9W/gWsxaMJSK9VbLskdJ+rqJXQuLyJID6WRCCUg3n/1fe9NF4J5CW0PuljAyOxvKXVBNHQTFnebCA01qHXL40OdYYTIERscn6ZroNZBPoKp00VrvEnWQ/BLRGum2Gy7CLnK2NZOU2UV+qanZG8IpX6pFzMBhJJRPpNjBlN/DBmZlksJkXBQYozbBanL0voVk3vTbGnOjnkQ5OoV1ek6zmmuBzMi8BUrgmy8zk+rjqIWVdab8NMGjlcMO9z4Z5zteh4K3UV18hm1p5xNaGB7r5M3qM/XRO9hQkQMyvLxwgdMjsfhRYZLdULalyaqHkCufKFrt/grblUWmTEPmDxwo9qy1qgWaxMQ5Kodo3/hDXd732MacK+HRATjxzumDeiRQAAAA"
const REVEAL_FIT = { x: 0.3, y: -0.4, scale: 0.864 }
