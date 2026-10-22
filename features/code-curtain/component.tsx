"use client"

import * as React from "react"

/**
 * Code Curtain — a hanging sheet of source code that behaves like cloth.
 *
 * Every character is a point in a verlet mesh. Columns are chains that can
 * go slack but barely stretch; rows are loose spacers that keep the sheet
 * together. Each glyph turns with the thread it hangs from, so the text bends
 * and folds as the curtain moves.
 *
 * Move across it and the code parts around the pointer; grab a character and
 * pull; double-click to hammer in a pin (or pull one out, rod hooks included);
 * press R to rehang it, the arrow keys for a gust. With `tearable` it rips.
 * Threads under strain blush toward `accentColor`.
 *
 * Self-contained: React is the only import. One canvas, no fonts to load.
 */

export interface CodeCurtainProps {
  /** What the curtain is woven from. Whitespace runs collapse to one space. */
  text?: string
  /** Characters across. */
  columns?: number
  /** Characters down. */
  rows?: number
  /** Largest curtain width in px. It shrinks to fit narrower boxes. */
  curtainWidth?: number
  /** Largest curtain height in px. It shrinks to fit shorter boxes. */
  curtainHeight?: number
  /** How the top edge hangs: every point on the rod, a hook every fourth, or two corners. */
  hang?: Hang
  /** Pull per step, in px. */
  gravity?: number
  /** Velocity kept per step, 0–1. */
  damping?: number
  /** How far a thread may stretch, as a multiple of its rest length. */
  stretch?: number
  /** Constraint passes per step. More is stiffer and costs more. */
  iterations?: number
  /** Threads snap when pulled too far. */
  tearable?: boolean
  /** Stretch, as a multiple of rest length, at which a thread snaps. */
  tearAt?: number
  /** Idle draught. 0 for still air. Off under reduced motion. */
  wind?: number
  /** Unfurl from the rod on load and on every rehang. Off under reduced motion. */
  intro?: boolean
  /** Characters under the pointer flicker through random glyphs, then settle. Off under reduced motion. */
  scramble?: boolean
  /** Pleats squeeze and dim the glyphs in them, like fabric turning from the light. */
  folds?: boolean
  /** Reach of the pointer, in px. */
  pointerRadius?: number
  /** How hard the pointer shoves, in px per move. */
  pointerStrength?: number
  /** Keep every point inside the box. */
  contain?: boolean
  /** Glyph colour. Defaults to the root's text colour (the foreground token). */
  inkColor?: string
  /** Colour of strained or touched threads. "" turns the tint off. */
  accentColor?: string
  /** Glyph font stack. */
  fontFamily?: string
  /** Glyph weight. */
  fontWeight?: number | string
  /** Draw the rod and its hooks. */
  showRod?: boolean
  /** Small instruction line, gone after the first touch. "" hides it. */
  hint?: string
  /** Show the Rehang button in the top corner. */
  resetButton?: boolean
  /** Root height. A definite length — never a percentage. */
  height?: string
  /** Extra root class names. Set a background here. */
  className?: string
}

const SOURCE =
  "function step(p) { if (p.pinned) return; const vx = (p.x - p.px) * damping; const vy = (p.y - p.py) * damping; " +
  "p.px = p.x; p.py = p.y; p.x += vx; p.y += vy + gravity; } " +
  "function solve(a, b, rest) { const dx = b.x - a.x, dy = b.y - a.y; const d = Math.hypot(dx, dy); " +
  "if (d > rest * lo && d < rest * hi) return; const k = (clamp(d, rest * lo, rest * hi) - d) / d / 2; " +
  "if (!a.pinned) { a.x -= dx * k; a.y -= dy * k; } if (!b.pinned) { b.x += dx * k; b.y += dy * k; } } " +
  "for (const p of points) step(p); for (let i = 0; i < 5; i++) links.forEach(solve); draw(); requestAnimationFrame(loop); "

// #region physics
export type Hang = "rod" | "loops" | "corners"
export type Cloth = { cols: number; rows: number; x: Float64Array; y: Float64Array; px: Float64Array; py: Float64Array; pin: Uint8Array; a: Int32Array; b: Int32Array; rest: Float64Array; lo: Float64Array; hi: Float64Array; alive: Uint8Array; down: Int32Array; right: Int32Array }

/** Does top-row column `c` hang from the rod? */
export function isHook(c: number, cols: number, hang: Hang) {
  if (hang === "corners") return c === 0 || c === cols - 1
  if (hang === "loops") return c % 4 === 0 || c === cols - 1
  return true
}

/**
 * A cols x rows sheet, point i = r * cols + c. Each point gets a down link
 * (a chain: slack to 2% of its length, stretch to `stretch`) and a right link
 * (a spacer: 0.6x to 4x). The top row's right links are a hem as tight as the
 * chains, so a curtain hung by its corners drapes instead of collapsing.
 */
export function buildCloth(cols: number, rows: number, cellW: number, cellH: number, hang: Hang, stretch: number) {
  const n = cols * rows
  const m = cols * (rows - 1) + (cols - 1) * rows
  const cl = {
    cols,
    rows,
    x: new Float64Array(n),
    y: new Float64Array(n),
    px: new Float64Array(n),
    py: new Float64Array(n),
    pin: new Uint8Array(n),
    a: new Int32Array(m),
    b: new Int32Array(m),
    rest: new Float64Array(m),
    lo: new Float64Array(m),
    hi: new Float64Array(m),
    alive: new Uint8Array(m).fill(1),
    down: new Int32Array(n).fill(-1),
    right: new Int32Array(n).fill(-1),
  }
  let k = 0
  const link = (i: number, j: number, rest: number, lo: number, hi: number) => {
    cl.a[k] = i
    cl.b[k] = j
    cl.rest[k] = rest
    cl.lo[k] = rest * lo
    cl.hi[k] = rest * hi
    return k++
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c
      cl.x[i] = cl.px[i] = c * cellW
      cl.y[i] = cl.py[i] = r * cellH
      cl.pin[i] = r === 0 && isHook(c, cols, hang) ? 1 : 0
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c
      if (r < rows - 1) cl.down[i] = link(i, i + cols, cellH, 0.02, stretch)
      if (c < cols - 1) cl.right[i] = link(i, i + 1, cellW, 0.6, r === 0 ? stretch : 4)
    }
  }
  return cl
}

/** One verlet step. `wind` is a sideways draught that grows down the sheet. */
export function step(cl: Cloth, gravity: number, damping: number, wind: number, t: number) {
  const { cols, rows, x, y, px, py, pin } = cl
  for (let i = 0; i < x.length; i++) {
    if (pin[i]) continue
    const vx = (x[i] - px[i]) * damping
    const vy = (y[i] - py[i]) * damping
    px[i] = x[i]
    py[i] = y[i]
    let fx = 0
    if (wind) {
      const c = i % cols
      const r = (i - c) / cols
      fx = wind * 0.02 * (r / rows) * (0.55 + 0.45 * Math.sin(t * 1.1 + c * 0.21 - r * 0.07) * Math.sin(t * 0.37 + 1.7))
    }
    x[i] += vx + fx
    y[i] += vy + gravity
  }
}

/**
 * Pull every link back inside its slack range. Links only act when too short
 * or too long, which is what lets the chains fold. With `tearAt` > 0 a link
 * stretched past `tearAt` x its rest length snaps for good.
 */
export function relax(cl: Cloth, iterations: number, tearAt: number) {
  const { x, y, pin, a, b, rest, lo, hi, alive } = cl
  for (let it = 0; it < iterations; it++) {
    for (let k = 0; k < a.length; k++) {
      if (!alive[k]) continue
      const i = a[k]
      const j = b[k]
      const dx = x[j] - x[i]
      const dy = y[j] - y[i]
      const d = Math.hypot(dx, dy)
      if (d === 0) continue
      if (tearAt > 0 && d > rest[k] * tearAt) {
        alive[k] = 0
        continue
      }
      let target = 0
      if (d < lo[k]) target = lo[k]
      else if (d > hi[k]) target = hi[k]
      else continue
      const f = (target - d) / d / 2
      const ox = dx * f
      const oy = dy * f
      if (!pin[i]) {
        x[i] -= ox
        y[i] -= oy
      }
      if (!pin[j]) {
        x[j] += ox
        y[j] += oy
      }
    }
  }
}

/** Shove points away from (mx, my), and drag them a little along the pointer's motion. */
export function push(cl: Cloth, mx: number, my: number, radius: number, strength: number, dx: number, dy: number) {
  const { x, y, pin } = cl
  const r2 = radius * radius
  for (let i = 0; i < x.length; i++) {
    if (pin[i]) continue
    const ex = x[i] - mx
    const ey = y[i] - my
    const ls = ex * ex + ey * ey
    if (ls >= r2) continue
    const f = smoothstep(r2, -0.4 * r2, ls)
    const d = Math.sqrt(ls) || 1
    x[i] += (ex / d) * f * strength * 0.75 + dx * f * 0.2
    y[i] += (ey / d) * f * strength * 0.75 + dy * f * 0.2
  }
}

/** Index of the point nearest (mx, my) within `radius`, or -1. */
export function nearest(cl: Cloth, mx: number, my: number, radius: number) {
  let best = -1
  let bd = radius * radius
  for (let i = 0; i < cl.x.length; i++) {
    const d = (cl.x[i] - mx) ** 2 + (cl.y[i] - my) ** 2
    if (d < bd) {
      bd = d
      best = i
    }
  }
  return best
}

/** Keep every free point inside a rectangle, bouncing a little off the walls. */
export function contain(cl: Cloth, x0: number, y0: number, x1: number, y1: number) {
  const { x, y, px, py, pin } = cl
  for (let i = 0; i < x.length; i++) {
    if (pin[i]) continue
    if (x[i] < x0) {
      px[i] = x0 + (x0 - px[i]) * 0.3
      x[i] = x0
    } else if (x[i] > x1) {
      px[i] = x1 - (px[i] - x1) * 0.3
      x[i] = x1
    }
    if (y[i] < y0) {
      py[i] = y0 + (y0 - py[i]) * 0.3
      y[i] = y0
    } else if (y[i] > y1) {
      py[i] = y1 - (py[i] - y1) * 0.3
      y[i] = y1
    }
  }
}

/**
 * How open the weave is around point i: its left and right threads' length
 * over their rest length, averaged. Under 1 the cloth is pleated there.
 * 1 when the point has no live sideways thread.
 */
export function fold(cl: Cloth, i: number) {
  const { x, y, a, b, rest, alive, right, cols } = cl
  let sum = 0
  let n = 0
  const c = i % cols
  const ls = [right[i], c > 0 ? right[i - 1] : -1]
  for (const l of ls) {
    if (l < 0 || !alive[l]) continue
    sum += Math.hypot(x[b[l]] - x[a[l]], y[b[l]] - y[a[l]]) / rest[l]
    n++
  }
  return n ? sum / n : 1
}

/** Gather every free point up under the rod, `k` of its hanging length, so it can drop. */
export function bunch(cl: Cloth, k: number) {
  const { cols, x, y, px, py, pin } = cl
  for (let i = cols; i < x.length; i++) {
    if (pin[i]) continue
    const top = i % cols
    y[i] = py[i] = y[top] + (y[i] - y[top]) * k
    px[i] = x[i]
  }
}

/** A glyph index that changes every few frames, the same for everyone at that moment. */
export function scrambleIndex(i: number, tick: number, n: number) {
  let h = (i * 374761393 + Math.floor(tick / 4) * 668265263) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) % n
}

/** Hermite step from edge0 to edge1; edge0 > edge1 runs it backwards. */
export function smoothstep(edge0: number, edge1: number, v: number) {
  const t = Math.min(1, Math.max(0, (v - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}
// #endregion

type Atlas = { size: number; ink: HTMLCanvasElement[]; tint: HTMLCanvasElement[] }

function buildAtlas(chars: string[], fontSize: number, font: string, ink: string, accent: string, dpr: number): Atlas {
  const size = Math.ceil(fontSize * 1.4)
  const draw = (ch: string, color: string) => {
    const c = document.createElement("canvas")
    c.width = c.height = Math.ceil(size * dpr)
    const g = c.getContext("2d")
    if (!g) return c
    g.scale(dpr, dpr)
    g.font = font
    g.textAlign = "center"
    g.textBaseline = "middle"
    g.fillStyle = color
    g.fillText(ch, size / 2, size / 2)
    return c
  }
  return {
    size,
    ink: chars.map((ch) => draw(ch, ink)),
    tint: accent ? chars.map((ch) => draw(ch, accent)) : [],
  }
}

export default function CodeCurtain({
  text = SOURCE,
  columns = 40,
  rows = 40,
  curtainWidth = 420,
  curtainHeight = 420,
  hang = "rod",
  gravity = 0.2,
  damping = 0.99,
  stretch = 1.1,
  iterations = 5,
  tearable = false,
  tearAt = 4.5,
  wind = 0.35,
  intro = true,
  scramble = true,
  folds = true,
  pointerRadius = 70,
  pointerStrength = 4,
  contain: containProp = false,
  inkColor,
  accentColor = "#ff5b2e",
  fontFamily = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  fontWeight = 700,
  showRod = true,
  hint = "drag the code · double-click to pin · R to rehang",
  resetButton = true,
  height = "100svh",
  className = "",
}: CodeCurtainProps) {
  const rootRef = React.useRef<HTMLElement | null>(null)
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const resetRef = React.useRef<() => void>(() => {})
  const gustRef = React.useRef<(dir: number) => void>(() => {})
  const [touched, setTouched] = React.useState(false)

  // knobs read every frame, so changing them never rebuilds the sheet
  const knobs = React.useRef({ gravity, damping, iterations, tearable, tearAt, wind, pointerRadius, pointerStrength, contain: containProp })
  knobs.current = { gravity, damping, iterations, tearable, tearAt, wind, pointerRadius, pointerStrength, contain: containProp }

  const cols = Math.max(2, Math.round(columns))
  const rws = Math.max(2, Math.round(rows))

  React.useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!root || !canvas || !ctx) return

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const woven = text.replace(/\s+/g, " ") || " "
    const chars = [...new Set(woven)].filter((ch) => ch !== " ")
    const charIndex = new Map(chars.map((ch, i) => [ch, i]))

    let W = 0
    let H = 0
    let dpr = 1
    let ox = 0
    let oy = 0
    let cw = 0
    let chh = 0
    let cell = 0
    let fontSize = 12
    let cl = buildCloth(cols, rws, 1, 1, hang, stretch)
    let glyph = new Int16Array(0)
    let atlas: Atlas | null = null
    let ink = ""
    let userPins = new Set<number>()
    let jumble = new Float64Array(0) // tick until which each glyph scrambles

    let grabbed = -1
    let grabWasPinned = 0
    let gx = 0
    let gy = 0
    let hovering = false
    let mx = 0
    let my = 0
    let lastMx = 0
    let lastMy = 0
    let t = 0
    let acc = 0
    let last = 0
    let frame = 0
    let raf = 0
    let visible = true

    const resolveInk = () => inkColor || getComputedStyle(root).color || "#333"

    const rebuildAtlas = () => {
      ink = resolveInk()
      const font = fontWeight + " " + fontSize.toFixed(2) + "px " + fontFamily
      atlas = buildAtlas(chars, fontSize, font, ink, accentColor, dpr)
    }

    const hangSheet = () => {
      cw = Math.max(80, Math.min(curtainWidth, W - 48))
      chh = Math.max(80, Math.min(curtainHeight, H - 128))
      const cellW = cw / (cols - 1)
      const cellH = chh / (rws - 1)
      cell = Math.min(cellW, cellH)
      ox = (W - cw) / 2
      oy = Math.max(40, (H - chh) / 2 - 24)
      cl = buildCloth(cols, rws, cellW, cellH, hang, stretch)
      glyph = new Int16Array(cols * rws)
      for (let r = 0; r < rws; r++) {
        for (let c = 0; c < cols; c++) {
          const ch = woven[(c + r * cols) % woven.length]
          glyph[r * cols + c] = ch === " " ? -1 : (charIndex.get(ch) ?? -1)
        }
      }
      grabbed = -1
      userPins = new Set()
      jumble = new Float64Array(cols * rws)
      const fs = Math.max(9, cellH * 1.2)
      if (fs !== fontSize || !atlas) {
        fontSize = fs
        rebuildAtlas()
      }
      // reduced motion: start from where it would come to rest, no drop-in bounce
      if (mq.matches) settle(240)
      else if (intro) bunch(cl, 0.06)
    }

    const tick = () => {
      const k = knobs.current
      const breeze = mq.matches ? 0 : k.wind
      if (grabbed >= 0) {
        cl.px[grabbed] = cl.x[grabbed]
        cl.py[grabbed] = cl.y[grabbed]
        cl.x[grabbed] = gx
        cl.y[grabbed] = gy
      }
      step(cl, k.gravity, k.damping, breeze, t)
      relax(cl, Math.max(1, Math.round(k.iterations)), k.tearable ? k.tearAt : 0)
      if (k.contain) contain(cl, -ox + 4, -oy + 4, W - ox - 4, H - oy - 4)
      t += 1 / 60
    }

    const settle = (n: number) => {
      for (let i = 0; i < n; i++) tick()
    }

    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      if (!atlas) return
      const k = knobs.current
      const { x, y, down, alive, a, b, rest, pin } = cl
      const size = atlas.size
      const half = size / 2
      const tinting = atlas.tint.length > 0
      const reach = k.pointerRadius
      const strain = Math.max(0.05, stretch * 0.6)
      const jumbling = scramble && !mq.matches
      const tickNow = Math.round(t * 60)

      // the rod, drawn first so the hem sits over it
      if (showRod) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        const ry = oy - fontSize * 0.55
        ctx.strokeStyle = ink
        ctx.fillStyle = ink
        ctx.lineWidth = 2
        ctx.lineCap = "round"
        ctx.beginPath()
        ctx.moveTo(ox - 18, ry)
        ctx.lineTo(ox + cw + 18, ry)
        ctx.stroke()
        for (const ex of [ox - 22, ox + cw + 22]) {
          ctx.beginPath()
          ctx.arc(ex, ry, 4, 0, Math.PI * 2)
          ctx.fill()
        }
        if (hang !== "rod") {
          ctx.lineWidth = 1.25
          for (let c = 0; c < cols; c++) {
            if (!isHook(c, cols, hang) || !pin[c]) continue
            ctx.beginPath()
            ctx.arc(x[c] + ox, ry + 2, Math.max(3, cell * 0.38), 0, Math.PI * 2)
            ctx.stroke()
          }
        }
      }

      for (let i = 0; i < glyph.length; i++) {
        let g = glyph[i]
        if (g < 0) continue
        if (jumbling && jumble[i] > tickNow) g = scrambleIndex(i, tickNow, chars.length)
        // turn with the thread this glyph hangs on: the one below, else the one above
        let l = down[i]
        if (l < 0 || !alive[l]) l = i >= cols ? down[i - cols] : -1
        let cos = 1
        let sin = 0
        let tint = 0
        if (l >= 0 && alive[l]) {
          const dx = x[b[l]] - x[a[l]]
          const dy = y[b[l]] - y[a[l]]
          const d = Math.hypot(dx, dy)
          if (d > 0) {
            cos = dy / d
            sin = -dx / d
            // chains always sit a little past their limit under gravity; only real strain shows
            if (tinting) tint = (d / rest[l] - stretch - 0.12) / strain
          }
        }
        if (tinting && hovering && grabbed < 0) {
          const pd = Math.hypot(x[i] - mx, y[i] - my)
          if (pd < reach) tint = Math.max(tint, (1 - pd / reach) * 0.9)
        }
        if (tinting && grabbed >= 0) {
          const pd = Math.hypot(x[i] - x[grabbed], y[i] - y[grabbed])
          if (pd < cell * 3) tint = Math.max(tint, 1 - pd / (cell * 3))
        }
        // a pleat turns the weave away from us: narrower glyphs, less light
        let sx = 1
        let sy = 1
        let light = 1
        if (folds) {
          const across = fold(cl, i)
          // a chain gone slack is bunching up and down: squash the other way
          const along = l >= 0 && alive[l] ? (Math.hypot(x[b[l]] - x[a[l]], y[b[l]] - y[a[l]]) / rest[l]) * 1.15 : 1
          sx = Math.min(1, Math.max(0.3, across))
          sy = Math.min(1, Math.max(0.3, along))
          light = 0.3 + 0.7 * smoothstep(0.45, 0.95, Math.min(across, along))
        }
        const tx = x[i] + ox
        const ty = y[i] + oy
        ctx.setTransform(dpr * cos * sx, dpr * sin * sx, -dpr * sin * sy, dpr * cos * sy, dpr * tx, dpr * ty)
        if (tint > 0.02) {
          tint = Math.min(1, tint)
          ctx.globalAlpha = (1 - tint) * light
          ctx.drawImage(atlas.ink[g], -half, -half, size, size)
          ctx.globalAlpha = tint * Math.max(light, 0.6)
          ctx.drawImage(atlas.tint[g], -half, -half, size, size)
        } else {
          ctx.globalAlpha = light
          ctx.drawImage(atlas.ink[g], -half, -half, size, size)
        }
      }

      ctx.globalAlpha = 1

      // pins the visitor hammered in: a head, its shadow, a glint
      if (userPins.size) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        const pr = Math.max(3.5, cell * 0.42)
        for (const i of userPins) {
          const cx = x[i] + ox
          const cy = y[i] + oy
          ctx.globalAlpha = 0.22
          ctx.fillStyle = "#000"
          ctx.beginPath()
          ctx.arc(cx + pr * 0.45, cy + pr * 0.7, pr, 0, Math.PI * 2)
          ctx.fill()
          ctx.globalAlpha = 1
          ctx.fillStyle = accentColor || ink
          ctx.beginPath()
          ctx.arc(cx, cy, pr, 0, Math.PI * 2)
          ctx.fill()
          ctx.globalAlpha = 0.7
          ctx.fillStyle = "#fff"
          ctx.beginPath()
          ctx.arc(cx - pr * 0.35, cy - pr * 0.35, pr * 0.3, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = 1
      }
    }

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (!visible) {
        last = now
        return
      }
      // fixed 60 Hz steps, so the cloth behaves the same on a 120 Hz screen
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60
      last = now
      acc += dt
      let n = 0
      while (acc >= 1 / 60 && n < 4) {
        tick()
        acc -= 1 / 60
        n++
      }
      if (n === 4) acc = 0
      // theme switched: re-ink the glyphs
      if (!inkColor && ++frame % 30 === 0 && resolveInk() !== ink) rebuildAtlas()
      draw()
    }

    const resize = () => {
      const r = root.getBoundingClientRect()
      const w = Math.round(r.width)
      const h = Math.round(r.height)
      if (w === W && h === H) return
      W = w
      H = h
      const nd = Math.min(window.devicePixelRatio || 1, 2)
      const dprChanged = nd !== dpr
      dpr = nd
      canvas.width = Math.max(1, Math.round(W * dpr))
      canvas.height = Math.max(1, Math.round(H * dpr))
      canvas.style.width = W + "px"
      canvas.style.height = H + "px"
      if (dprChanged) atlas = null
      hangSheet()
      draw()
    }

    const local = (e: PointerEvent | MouseEvent) => {
      const r = canvas.getBoundingClientRect()
      return [e.clientX - r.left - ox, e.clientY - r.top - oy]
    }

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      const [px, py] = local(e)
      mx = lastMx = px
      my = lastMy = py
      setTouched(true)
      const i = nearest(cl, px, py, Math.max(20, cell * 2))
      if (i < 0) return
      grabbed = i
      grabWasPinned = cl.pin[i]
      cl.pin[i] = 1
      gx = px
      gy = py
      canvas.setPointerCapture(e.pointerId)
      canvas.style.cursor = "grabbing"
    }

    const onMove = (e: PointerEvent) => {
      const [px, py] = local(e)
      hovering = true
      mx = px
      my = py
      if (grabbed >= 0) {
        gx = px
        gy = py
      } else {
        const k = knobs.current
        push(cl, px, py, k.pointerRadius, k.pointerStrength, px - lastMx, py - lastMy)
        if (scramble) {
          // the inner half of the pointer's reach decodes for a moment
          const until = Math.round(t * 60) + 14 + Math.random() * 12
          const r2 = (k.pointerRadius * 0.5) ** 2
          for (let i = 0; i < jumble.length; i++) {
            if ((cl.x[i] - px) ** 2 + (cl.y[i] - py) ** 2 < r2) jumble[i] = until
          }
        }
        canvas.style.cursor = nearest(cl, px, py, Math.max(20, cell * 2)) >= 0 ? "grab" : "default"
      }
      lastMx = px
      lastMy = py
    }

    const release = () => {
      if (grabbed < 0) return
      const i = grabbed
      cl.pin[i] = userPins.has(i) ? 1 : grabWasPinned
      // keep the flick, but not a teleport
      const vx = cl.x[i] - cl.px[i]
      const vy = cl.y[i] - cl.py[i]
      const v = Math.hypot(vx, vy)
      const cap = cell * 3
      if (v > cap) {
        cl.px[i] = cl.x[i] - (vx / v) * cap
        cl.py[i] = cl.y[i] - (vy / v) * cap
      }
      grabbed = -1
      canvas.style.cursor = "grab"
    }

    const onLeave = () => {
      hovering = false
    }

    const onDouble = (e: MouseEvent) => {
      const [px, py] = local(e)
      const i = nearest(cl, px, py, Math.max(20, cell * 2))
      if (i < 0) return
      if (grabbed === i) grabbed = -1
      if (cl.pin[i] || userPins.has(i)) {
        cl.pin[i] = 0
        userPins.delete(i)
      } else {
        cl.pin[i] = 1
        cl.x[i] = cl.px[i] = px
        cl.y[i] = cl.py[i] = py
        userPins.add(i)
      }
    }

    resetRef.current = () => {
      hangSheet()
      draw()
    }
    gustRef.current = (dir: number) => {
      for (let i = 0; i < cl.x.length; i++) {
        if (cl.pin[i]) continue
        const depth = Math.floor(i / cols) / rws
        cl.x[i] += dir * cell * 0.9 * depth * (0.8 + 0.4 * Math.random())
      }
    }

    const observer = new ResizeObserver(resize)
    observer.observe(root)
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
    })
    io.observe(root)
    canvas.addEventListener("pointerdown", onDown)
    canvas.addEventListener("pointermove", onMove)
    canvas.addEventListener("pointerup", release)
    canvas.addEventListener("pointercancel", release)
    canvas.addEventListener("pointerleave", onLeave)
    canvas.addEventListener("dblclick", onDouble)
    resize()
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      io.disconnect()
      canvas.removeEventListener("pointerdown", onDown)
      canvas.removeEventListener("pointermove", onMove)
      canvas.removeEventListener("pointerup", release)
      canvas.removeEventListener("pointercancel", release)
      canvas.removeEventListener("pointerleave", onLeave)
      canvas.removeEventListener("dblclick", onDouble)
    }
  }, [text, cols, rws, hang, stretch, curtainWidth, curtainHeight, inkColor, accentColor, fontFamily, fontWeight, showRod, intro, scramble, folds])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "r" || e.key === "R") {
      resetRef.current()
      setTouched(true)
    } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault()
      gustRef.current(e.key === "ArrowLeft" ? -1 : 1)
      setTouched(true)
    }
  }

  return (
    <section
      ref={rootRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label="Code curtain. Drag the characters to pull the cloth, double-click to pin, arrow keys for a gust of wind, R to rehang."
      className={"relative w-full select-none overflow-hidden text-[var(--color-foreground)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-inset " + className}
      style={{ height }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute left-0 top-0 block"
        style={{ touchAction: "none", maxWidth: "none" }}
      />
      {resetButton && (
        <button
          type="button"
          onClick={() => {
            resetRef.current()
            setTouched(true)
          }}
          className="absolute right-4 top-4 rounded-full border border-[var(--color-border)] bg-[var(--color-background)]/80 px-3 py-1.5 font-mono text-xs text-[var(--color-foreground)] backdrop-blur transition-colors hover:bg-[var(--color-foreground)] hover:text-[var(--color-background)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] motion-reduce:transition-none"
        >
          ↺ Rehang
        </button>
      )}
      {hint && (
        <p
          aria-hidden="true"
          className={
            "pointer-events-none absolute inset-x-0 bottom-6 text-center font-mono text-[11px] tracking-wide text-[var(--color-muted-foreground)] transition-opacity duration-700 motion-reduce:transition-none " +
            (touched ? "opacity-0" : "opacity-100")
          }
        >
          {hint}
        </p>
      )}
    </section>
  )
}
