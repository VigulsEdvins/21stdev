"use client"

import * as React from "react"

/**
 * Crimson Confessional — a scroll-scrubbed noir sequence.
 *
 * Each chapter is a word and a line of copy over a procedural canvas. Nothing
 * here is an illustration or an asset: the light cone, the puppet strings, the
 * receding grid, the iris, the glyph flood and the CRT static are all drawn
 * from scroll position every frame, so the whole piece is a few hundred lines
 * and weighs nothing. Scroll *is* the timeline — there is no autoplay, and
 * scrubbing backwards runs it backwards.
 *
 * Self-contained: React is the only import, one canvas, no CSS file, no
 * animation library, no fonts to download.
 */

/** What the canvas draws for a chapter that has no still of its own. */
export type Motif = "beam" | "strings" | "race" | "watch" | "flood" | "static" | "void"

/**
 * How a still comes in. The shape is a mask that grows with scroll, so the
 * image is uncovered rather than faded — a light widening, an aperture
 * opening, a bar crossing the frame.
 */
export type Reveal = "cone" | "iris" | "wipe" | "slats" | "none"

/** Texture laid over a still. Texture only: never a subject. */
export type Overlay = "glyphs" | "static" | "grid" | "none"

export type Chapter = {
  /** The large word. Kept short — it is set very wide. */
  word: string
  /** One cryptic line beneath it. */
  line?: string
  /**
   * Drawn only when the chapter has no `image`. A still is the scene; drawing
   * a motif over one puts a second light cone on top of a photograph of a
   * light cone, which is how this went wrong the first time.
   */
  motif?: Motif
  /**
   * A still for this chapter. Any URL or data URI. It is not pasted on top —
   * it is drawn into the frame: cropped to cover, drained to greyscale, washed
   * to the palette, pushed by scroll, and then the motif, the halftone and the
   * grain go over it, so a photograph and a drawn motif end up looking like
   * the same picture.
   */
  image?: string
  /** How the still is uncovered as the chapter runs. Default `cone`. */
  reveal?: Reveal
  /** Texture over the still. Texture only — never a second subject. */
  overlay?: Overlay
  /** How hard the still is pushed by scroll. 0 pins it. */
  parallax?: number
  /** Overrides `imageLevel` for this chapter. A pale still needs less. */
  level?: number
  /** Draw the red censor bar across the word as the chapter peaks. */
  censor?: boolean
}

export type CrimsonConfessionalProps = {
  chapters?: Chapter[]
  /**
   * Scroll length of each chapter, as a multiple of the viewport. Lower is
   * faster and more abrupt; below about 0.8 the type has no time to land.
   */
  chapterScroll?: number
  /** Paper/ink. The bone is deliberately not white — white reads as a bug here. */
  ink?: string
  bone?: string
  /** The signal red. Everything bright is this colour. */
  crimson?: string
  /** Deep oxblood, for fields and falloff. */
  oxblood?: string
  /** 0 disables the film grain. Above ~0.3 it eats the type. */
  grain?: number
  /** Scanlines over everything, as in the CRT reference. */
  scanlines?: boolean
  /**
   * How far a chapter's still is drained towards the palette. 1 is a full
   * duotone and is what makes an arbitrary image belong here; 0 leaves it as
   * it came, which almost never sits right against the red.
   */
  duotone?: number
  /** Brightness of the stills. They sit under type, so they stay down. */
  imageLevel?: number
  className?: string
}

// #region scroll
/**
 * Clamp to 0..1. Written as a positive test so that NaN and -0 both fall out
 * as 0: a NaN progress would otherwise reach the canvas as NaN geometry, which
 * draws nothing at all and gives no error to find it by.
 */
export const clamp01 = (v: number): number => (v > 0 ? (v > 1 ? 1 : v) : 0)

/** Hermite ease, for crossfades that start and end still. */
export const smoothstep = (edge0: number, edge1: number, x: number): number => {
  if (edge1 === edge0) return x < edge0 ? 0 : 1
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

/**
 * Where the sequence is, given the root's position in the viewport.
 *
 * Measured from the element, not from `window.scrollY`: the component can sit
 * anywhere on a page, inside a scroller, or after content whose height changes
 * after load, and all three break an absolute-scroll calculation.
 */
export const progressFrom = (top: number, height: number, viewport: number): number => {
  const travel = height - viewport
  if (travel <= 0) return 0
  return clamp01(-top / travel)
}

/**
 * Split total progress into a chapter index and that chapter's own 0..1.
 *
 * The last chapter is the awkward one: at progress exactly 1 a naive
 * `floor(p * n)` lands on index n, one past the end, and the sequence blanks
 * at the bottom of the scroll — where it is most visible.
 */
export const chapterAt = (
  progress: number,
  count: number,
): { index: number; local: number } => {
  if (count <= 0) return { index: 0, local: 0 }
  const scaled = clamp01(progress) * count
  const index = Math.min(Math.floor(scaled), count - 1)
  return { index, local: clamp01(scaled - index) }
}

/**
 * How present a chapter's type is: up during the first third, held, then out.
 * Words overlap slightly at the seams so the sequence never shows an empty
 * frame between two chapters.
 *
 * The two ends are exceptions. The first chapter is already up: fading it in
 * from nothing means whoever arrives before scrolling is looking at a black
 * rectangle, which is both a poor first frame and, as it turns out, an
 * unusable one — a cover capture of it comes back empty. The last chapter
 * never leaves, so the sequence rests on its final frame instead of fading to
 * black for whoever is parked at the bottom of the page.
 */
export const typeOpacity = (local: number, first = false, last = false): number =>
  (first ? 1 : smoothstep(0, 0.28, local)) * (last ? 1 : 1 - smoothstep(0.74, 1, local))
// #endregion

const DEFAULT_CHAPTERS: Chapter[] = [
  { word: "PRIDE", line: "You were told you chose this.", motif: "beam" },
  { word: "STRINGS", line: "Someone above you is holding them.", motif: "strings" },
  { word: "THE RACE", line: "Everyone is running. Nobody is arriving.", motif: "race" },
  { word: "WATCHED", line: "The room has been listening the whole time.", motif: "watch" },
  { word: "NOISE", line: "Attention is the only currency they take.", motif: "flood", censor: true },
  { word: "STATIC", line: "You stopped being able to hear yourself.", motif: "static", censor: true },
  { word: "QUIET", line: "Then you turned it off.", motif: "void" },
]

const STACK =
  'ui-sans-serif, system-ui, "Helvetica Neue", Helvetica, Arial, sans-serif'
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace'
const GLYPHS = "01ABCDEF/\\|<>[]{}=+-*#$%&@?!:;"

export default function CrimsonConfessional({
  chapters = DEFAULT_CHAPTERS,
  chapterScroll = 1.35,
  ink = "#07070a",
  bone = "#e6e0d6",
  crimson = "#e01221",
  oxblood = "#3d070d",
  grain = 0.16,
  scanlines = true,
  duotone = 0.92,
  imageLevel = 0.62,
  className = "",
}: CrimsonConfessionalProps) {
  const rootRef = React.useRef<HTMLElement | null>(null)
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const [reduced, setReduced] = React.useState(false)
  // Driven by scroll, mirrored into state only so the DOM type layer can react.
  const [view, setView] = React.useState({ index: 0, local: 0 })

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])

  const look = React.useRef({
    ink, bone, crimson, oxblood, grain, scanlines, duotone, imageLevel, chapters,
  })
  look.current = {
    ink, bone, crimson, oxblood, grain, scanlines, duotone, imageLevel, chapters,
  }

  React.useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    if (!root || !canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let raf = 0
    let disposed = false
    // Scroll writes here; the frame loop reads it. Doing the drawing inside the
    // scroll handler instead would run it several times per frame on a
    // trackpad and jank the whole page.
    let progress = 0
    let painted = -1

    // Stills, by chapter index, with holes. Each loads on its own and is drawn
    // the moment it lands; waiting for the set would hold the whole sequence
    // black behind the slowest one.
    const stills: (HTMLImageElement | null)[] = look.current.chapters.map(() => null)
    look.current.chapters.forEach((ch, i) => {
      if (!ch.image) return
      const img = new Image()
      img.decoding = "async"
      // Never read back from this canvas, so a tainted one costs nothing and
      // a cross-origin still that lacks CORS headers still draws.
      img.onload = () => {
        if (!disposed) stills[i] = img
      }
      img.src = ch.image
    })

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.round(canvas.clientWidth * dpr)
      const h = Math.round(canvas.clientHeight * dpr)
      if (w === 0 || h === 0) return
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      painted = -1
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)

    const measure = () => {
      const r = root.getBoundingClientRect()
      progress = progressFrom(r.top, r.height, window.innerHeight)
    }

    // ---- the motifs -------------------------------------------------------
    // Each draws in a 0..1 square space scaled to the canvas, takes the
    // chapter's own progress, and is responsible for its own fade.

    const beam = (g: CanvasRenderingContext2D, w: number, h: number, t: number, a: number) => {
      // A hard triangular shaft from a point above, widening to the floor, with
      // dust drifting through it. The reference's cone has a crisp edge, so
      // this is a filled path rather than a radial gradient.
      const apexX = w * 0.5
      const apexY = -h * 0.12
      // Starts wide enough to be a shaft rather than a needle: this is the
      // frame the piece opens on.
      const spread = w * (0.22 + 0.28 * t)
      const grad = g.createLinearGradient(0, apexY, 0, h)
      grad.addColorStop(0, "rgba(224,18,33," + 0.5 * a + ")")
      grad.addColorStop(0.55, "rgba(224,18,33," + 0.16 * a + ")")
      grad.addColorStop(1, "rgba(224,18,33,0)")
      g.fillStyle = grad
      g.beginPath()
      g.moveTo(apexX, apexY)
      g.lineTo(apexX - spread, h)
      g.lineTo(apexX + spread, h)
      g.closePath()
      g.fill()

      // The one figure, standing in it. Two shapes and no detail: at this size
      // a drawing would only read as a smudge, while a silhouette reads as a
      // person — and it is the whole point of the reference composition.
      // Scaled off the short side, not the height: on a phone a figure sized
      // from height fills the frame and stops reading as distant.
      const fh = Math.min(w, h) * 0.14
      const fx = apexX
      const fy = h * 0.93
      g.fillStyle = "rgba(6,4,6," + 0.94 * a + ")"
      g.beginPath()
      g.moveTo(fx - fh * 0.17, fy)
      g.quadraticCurveTo(fx - fh * 0.13, fy - fh * 0.62, fx, fy - fh * 0.66)
      g.quadraticCurveTo(fx + fh * 0.13, fy - fh * 0.62, fx + fh * 0.17, fy)
      g.closePath()
      g.fill()
      g.beginPath()
      g.arc(fx, fy - fh * 0.78, fh * 0.115, 0, Math.PI * 2)
      g.fill()

      // Motes. Deterministic positions so the field does not boil.
      g.fillStyle = "rgba(255,225,225," + 0.5 * a + ")"
      for (let i = 0; i < 90; i++) {
        const s = (i * 2654435761) >>> 0
        const fx = ((s % 1000) / 1000 - 0.5) * 2
        const fy = ((s >>> 10) % 1000) / 1000
        const y = ((fy + t * 0.25) % 1) * h
        const half = ((y - apexY) / (h - apexY)) * spread
        const x = apexX + fx * half * 0.92
        const r = 0.6 + ((s >>> 20) % 10) / 9
        g.globalAlpha = (0.15 + 0.5 * (((s >>> 5) % 100) / 100)) * a
        g.beginPath()
        g.arc(x, y, r, 0, Math.PI * 2)
        g.fill()
      }
      g.globalAlpha = 1
    }

    const strings = (g: CanvasRenderingContext2D, w: number, h: number, t: number, a: number) => {
      // Taut lines converging on a point off the top of the frame, swaying as
      // if something up there just moved.
      const hubX = w * 0.5
      const hubY = h * 0.07
      const tilt = Math.sin(t * 6.283) * 0.07 * smoothstep(0, 0.4, t)
      const n = 14
      g.lineWidth = Math.max(1, w * 0.0012)
      for (let i = 0; i < n; i++) {
        const f = (i + 0.5) / n
        const sway = Math.sin(t * 6.283 + i * 1.7) * w * 0.012 * smoothstep(0, 0.4, t)
        const endX = w * (0.06 + 0.88 * f) + sway
        g.strokeStyle = "rgba(224,18,33," + (0.22 + 0.5 * Math.abs(0.5 - f) * 2) * a + ")"
        g.beginPath()
        g.moveTo(hubX, hubY)
        // The line goes slack near the bottom rather than ending in mid-air.
        g.quadraticCurveTo(endX, h * 0.62, endX, h * (0.78 + 0.18 * f))
        g.stroke()
        // The knot at the end.
        g.fillStyle = "rgba(224,18,33," + 0.75 * a + ")"
        g.beginPath()
        g.arc(endX, h * (0.78 + 0.18 * f), Math.max(1.5, w * 0.0018), 0, Math.PI * 2)
        g.fill()
      }

      // The control bar they hang from, tilting as it works. Without it the
      // strings are just lines going off the top of the frame; with it there
      // is somebody up there holding them, which is the whole idea.
      g.save()
      g.translate(hubX, hubY)
      g.rotate(tilt)
      const barW = w * 0.2
      const barT = Math.max(3, h * 0.008)
      g.fillStyle = "rgba(10,6,8," + 0.95 * a + ")"
      g.fillRect(-barW / 2, -barT / 2, barW, barT)
      g.fillRect(-barT / 2, -h * 0.05, barT, h * 0.1)
      g.strokeStyle = "rgba(224,18,33," + 0.55 * a + ")"
      g.lineWidth = Math.max(1, w * 0.0009)
      g.strokeRect(-barW / 2, -barT / 2, barW, barT)
      g.restore()
    }

    const race = (g: CanvasRenderingContext2D, w: number, h: number, t: number, a: number) => {
      // A grid running to a vanishing point, with marks sliding along it —
      // everyone moving, nobody arriving.
      const vpY = h * 0.42
      g.lineWidth = Math.max(1.4, w * 0.0016)
      for (let i = -12; i <= 12; i++) {
        // Lanes fade towards the edges of frame so the eye goes to the centre.
        const edge = 1 - Math.abs(i) / 13
        g.strokeStyle = "rgba(224,18,33," + (0.16 + 0.5 * edge) * a + ")"
        g.beginPath()
        g.moveTo(w * 0.5, vpY)
        g.lineTo(w * 0.5 + i * w * 0.14, h * 1.05)
        g.stroke()
      }
      // Horizontals, spaced so they crowd towards the horizon, scrolling in.
      for (let i = 0; i < 16; i++) {
        const f = ((i / 16 + t * 0.6) % 1) ** 2.4
        const y = vpY + f * (h - vpY)
        g.strokeStyle = "rgba(224,18,33," + (0.2 + 0.55 * f) * smoothstep(0, 0.1, f) * a + ")"
        g.beginPath()
        g.moveTo(0, y)
        g.lineTo(w, y)
        g.stroke()
      }
      // The horizon itself, bright — the thing nobody reaches.
      g.strokeStyle = "rgba(230,224,214," + 0.5 * a + ")"
      g.lineWidth = Math.max(1, w * 0.001)
      g.beginPath()
      g.moveTo(0, vpY)
      g.lineTo(w, vpY)
      g.stroke()

      // The runners: slabs on their own lanes, all at the same pace, all
      // getting bigger as they come at you and none of them passing the line.
      for (let i = 0; i < 11; i++) {
        const lane = (i - 5) * w * 0.096
        const f = ((i * 0.137 + t * 0.9) % 1) ** 2.2
        const y = vpY + f * (h - vpY)
        const x = w * 0.5 + lane * (f * 1.6 + 0.08)
        const s = Math.max(3, f * w * 0.022)
        g.fillStyle = "rgba(6,4,6," + (0.3 + 0.65 * f) * a + ")"
        g.fillRect(x - s / 2, y - s * 2.2, s, s * 2.2)
        g.fillStyle = "rgba(224,18,33," + (0.35 + 0.6 * f) * a + ")"
        g.fillRect(x - s / 2, y - s * 0.22, s, s * 0.22)
      }
    }

    const watch = (g: CanvasRenderingContext2D, w: number, h: number, t: number, a: number) => {
      // An iris: concentric arcs closing on a slit. Geometry, not a drawing of
      // an eye — it reads as a lens, which is the more unpleasant of the two.
      const cx = w * 0.5
      const cy = h * 0.46
      const base = Math.min(w, h) * 0.42
      const open = 0.35 + 0.65 * smoothstep(0.1, 0.7, t)

      // A glow behind it, so the lens sits in the dark rather than on it.
      const halo = g.createRadialGradient(cx, cy, 0, cx, cy, base * 1.5)
      halo.addColorStop(0, "rgba(224,18,33," + 0.3 * a + ")")
      halo.addColorStop(1, "rgba(224,18,33,0)")
      g.fillStyle = halo
      g.fillRect(cx - base * 1.5, cy - base * 1.5, base * 3, base * 3)

      // Blades: arcs with a rotating gap, so it reads as a mechanism closing
      // on you rather than as a target painted on the screen.
      for (let i = 0; i < 7; i++) {
        const r = base * (0.3 + i * 0.11)
        g.strokeStyle = "rgba(224,18,33," + (0.85 - i * 0.085) * a + ")"
        g.lineWidth = Math.max(1.5, w * 0.0026 * (1 - i * 0.08))
        g.beginPath()
        g.arc(cx, cy, r, 0.3 + i * 0.5 + t * 0.6, Math.PI * 2 - 0.3 + i * 0.5 + t * 0.6)
        g.stroke()
      }
      // The outer housing, unbroken and bright.
      g.strokeStyle = "rgba(230,224,214," + 0.55 * a + ")"
      g.lineWidth = Math.max(1.5, w * 0.002)
      g.beginPath()
      g.arc(cx, cy, base * 1.06, 0, Math.PI * 2)
      g.stroke()

      // The pupil: a slit that widens as it notices you.
      g.fillStyle = "rgba(10,2,4," + 0.9 * a + ")"
      g.beginPath()
      g.ellipse(cx, cy, base * 0.26, base * 0.46, 0, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = "rgba(224,18,33," + 0.95 * a + ")"
      g.beginPath()
      g.ellipse(cx, cy, base * 0.14 * open, base * 0.4, 0, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = "rgba(255,240,240," + 0.85 * a * open + ")"
      g.beginPath()
      g.ellipse(cx, cy, base * 0.045 * open, base * 0.2, 0, 0, Math.PI * 2)
      g.fill()
    }

    const flood = (g: CanvasRenderingContext2D, w: number, h: number, t: number, a: number) => {
      // Columns of glyphs falling at different rates. The wall of code from the
      // overwhelm reference, and the one motif where the type is the texture.
      const size = Math.max(10, w * 0.011)
      const cols = Math.ceil(w / (size * 0.72))
      g.font = size + "px " + MONO
      g.textBaseline = "top"
      for (let c = 0; c < cols; c++) {
        const s = (c * 1103515245 + 12345) >>> 0
        const speed = 0.35 + ((s % 100) / 100) * 1.1
        const offset = ((s >>> 7) % 1000) / 1000
        const x = c * size * 0.72
        const rows = Math.ceil(h / size) + 2
        for (let r = 0; r < rows; r++) {
          const y = ((r / rows + offset + t * speed) % 1) * (h + size) - size
          const gi = (s + r * 37 + Math.floor(t * 6) * ((s >>> 3) % 5)) % GLYPHS.length
          const near = 1 - Math.abs(y / h - 0.5) * 1.2
          g.fillStyle =
            r % 9 === 0
              ? "rgba(230,224,214," + 0.5 * near * a + ")"
              : "rgba(224,18,33," + (0.1 + 0.42 * near) * a + ")"
          g.fillText(GLYPHS[gi], x, y)
        }
      }
    }

    const staticNoise = (
      g: CanvasRenderingContext2D,
      w: number,
      h: number,
      t: number,
      a: number,
    ) => {
      // Blocky CRT noise plus a rolling bright band. Drawn as rectangles rather
      // than per-pixel ImageData: at device resolution the per-pixel version
      // costs more than everything else in this component put together.
      const cell = Math.max(3, w * 0.006)
      const cols = Math.ceil(w / cell)
      const rows = Math.ceil(h / cell)
      const seed = Math.floor(t * 900)
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const s = ((x * 73856093) ^ (y * 19349663) ^ (seed * 83492791)) >>> 0
          const v = (s % 1000) / 1000
          if (v > 0.82) {
            g.fillStyle =
              v > 0.965
                ? "rgba(230,224,214," + 0.5 * a + ")"
                : "rgba(224,18,33," + 0.3 * a + ")"
            g.fillRect(x * cell, y * cell, cell, cell)
          }
        }
      }
      // Colour split: the same noise offset left and right. A CRT does not
      // lose signal in greyscale, it loses it in fringes.
      const off = Math.max(2, w * 0.0035)
      for (const [dx, tint] of [[-off, "rgba(255,40,40,"], [off, "rgba(40,200,255,"]] as const) {
        for (let y = 0; y < rows; y += 2) {
          for (let x = 0; x < cols; x += 2) {
            const s2 = ((x * 73856093) ^ (y * 19349663) ^ ((seed + 7) * 83492791)) >>> 0
            if ((s2 % 1000) / 1000 > 0.9) {
              g.fillStyle = tint + 0.35 * a + ")"
              g.fillRect(x * cell + dx, y * cell, cell, cell)
            }
          }
        }
      }

      const bandY = ((t * 0.9) % 1) * h
      const band = g.createLinearGradient(0, bandY - h * 0.08, 0, bandY + h * 0.08)
      band.addColorStop(0, "rgba(230,224,214,0)")
      band.addColorStop(0.5, "rgba(230,224,214," + 0.1 * a + ")")
      band.addColorStop(1, "rgba(230,224,214,0)")
      g.fillStyle = band
      g.fillRect(0, bandY - h * 0.08, w, h * 0.16)
    }

    const voidMotif = (
      g: CanvasRenderingContext2D,
      w: number,
      h: number,
      t: number,
      a: number,
    ) => {
      // Everything drains to one point and goes out — the CRT being switched
      // off. The last thing the sequence does, so it has to land cleanly.
      const cx = w * 0.5
      // Sits below the type rather than behind it: the collapsing line reads
      // as a horizon under the last word, and a bone word on a bright white
      // band cannot be read at all.
      const cy = h * 0.72
      // A CRT going off does it in two moves: the picture squashes to a
      // horizontal line, then the line shrinks to a point and the point
      // lingers. Doing both at once just gives a shrinking blob.
      const squash = smoothstep(0.08, 0.5, t)
      const pinch = smoothstep(0.52, 0.88, t)
      const rw = w * 0.34 * (1 - pinch) + w * 0.0012
      const rh = h * 0.26 * (1 - squash) + h * 0.0016

      // It gets brighter as it loses area — the same charge in less screen.
      const heat = 0.35 + 0.65 * squash
      const glow = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.5)
      glow.addColorStop(0, "rgba(224,18,33," + 0.42 * a * heat + ")")
      glow.addColorStop(0.4, "rgba(224,18,33," + 0.1 * a * heat + ")")
      glow.addColorStop(1, "rgba(224,18,33,0)")
      g.fillStyle = glow
      g.fillRect(0, 0, w, h)

      g.fillStyle = "rgba(255,246,244," + a * (0.55 + 0.45 * squash) * (1 - pinch * 0.15) + ")"
      g.beginPath()
      g.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2)
      g.fill()

      // The afterimage on the phosphor, once it is down to a line.
      if (squash > 0.6) {
        g.fillStyle = "rgba(224,18,33," + 0.5 * a * (squash - 0.6) * 2.5 + ")"
        g.fillRect(cx - rw * 1.5, cy - h * 0.001, rw * 3, h * 0.002)
      }
    }

    /**
     * Draw a chapter's still so that it belongs to the frame rather than
     * sitting on it: cropped to cover, drained of its own colour, washed to
     * the palette, and pushed a little by scroll so it is not a flat plate.
     */
    const still = (
      g: CanvasRenderingContext2D,
      img: HTMLImageElement,
      w: number,
      h: number,
      t: number,
      a: number,
      push: number,
      level: number,
    ) => {
      const L = look.current
      const iw = img.naturalWidth || 1
      const ih = img.naturalHeight || 1
      // Cover, plus a little headroom so the parallax never exposes an edge.
      const bleed = 1.12
      const scale = Math.max(w / iw, h / ih) * bleed
      const dw = iw * scale
      const dh = ih * scale
      const dx = (w - dw) / 2
      const dy = (h - dh) / 2 + (t - 0.5) * h * push

      g.save()
      g.globalAlpha = a * level
      // grayscale is the duotone: the wash below supplies the only colour, so
      // whatever the still was — a green field, a blue sky — it arrives here
      // already belonging to the palette.
      g.filter =
        "grayscale(" + L.duotone + ") contrast(1.25) brightness(0.82)"
      g.drawImage(img, dx, dy, dw, dh)
      g.filter = "none"

      // The wash. Multiply keeps the blacks black and tints everything above
      // them, which is what a duotone print does.
      g.globalCompositeOperation = "multiply"
      g.globalAlpha = a * 0.85
      const wash = g.createLinearGradient(0, 0, 0, h)
      wash.addColorStop(0, L.oxblood)
      wash.addColorStop(0.5, L.crimson)
      wash.addColorStop(1, L.oxblood)
      g.fillStyle = wash
      g.fillRect(0, 0, w, h)

      // And a hard falloff to ink at the edges so the still has no seam.
      g.globalCompositeOperation = "source-over"
      g.globalAlpha = a
      const edge = g.createRadialGradient(
        w * 0.5, h * 0.48, Math.min(w, h) * 0.18,
        w * 0.5, h * 0.5, Math.max(w, h) * 0.62,
      )
      edge.addColorStop(0, "rgba(0,0,0,0)")
      edge.addColorStop(1, L.ink)
      g.fillStyle = edge
      g.fillRect(0, 0, w, h)
      g.restore()
      g.globalAlpha = 1
      g.globalCompositeOperation = "source-over"
    }

    /**
     * Clip to the shape that is uncovering the still, and report whether the
     * shape wants a light drawn along its edge. The shape grows with the
     * chapter, so scrolling opens the picture up instead of dissolving it in.
     */
    const clipReveal = (
      g: CanvasRenderingContext2D,
      kind: Reveal,
      w: number,
      h: number,
      t: number,
    ) => {
      const e = smoothstep(0, 0.72, t)
      if (kind === "none") return
      g.beginPath()
      if (kind === "cone") {
        // A shaft from above that widens as you scroll. The still is only
        // visible where the light has reached.
        const apexX = w * 0.5
        const apexY = -h * 0.1
        const spread = w * (0.07 + 0.72 * e)
        g.moveTo(apexX, apexY)
        g.lineTo(apexX - spread, h * 1.05)
        g.lineTo(apexX + spread, h * 1.05)
        g.closePath()
      } else if (kind === "iris") {
        g.arc(w * 0.5, h * 0.48, Math.max(w, h) * 0.08 + Math.max(w, h) * 0.62 * e, 0, Math.PI * 2)
      } else if (kind === "wipe") {
        g.rect(0, 0, w * e, h)
      } else {
        // Slats: the picture arriving through a blind.
        const n = 9
        for (let i = 0; i < n; i++) {
          const band = h / n
          g.rect(0, i * band, w, band * e)
        }
      }
      g.clip()
    }

    /** The light that belongs to a reveal, drawn over the uncovered still. */
    const revealLight = (
      g: CanvasRenderingContext2D,
      kind: Reveal,
      w: number,
      h: number,
      t: number,
      a: number,
    ) => {
      if (kind !== "cone" && kind !== "iris") return
      const e = smoothstep(0, 0.72, t)
      if (kind === "cone") {
        const apexX = w * 0.5
        const apexY = -h * 0.1
        const spread = w * (0.07 + 0.72 * e)
        const grad = g.createLinearGradient(0, apexY, 0, h)
        grad.addColorStop(0, "rgba(224,18,33," + 0.34 * a + ")")
        grad.addColorStop(0.6, "rgba(224,18,33," + 0.08 * a + ")")
        grad.addColorStop(1, "rgba(224,18,33,0)")
        g.fillStyle = grad
        g.beginPath()
        g.moveTo(apexX, apexY)
        g.lineTo(apexX - spread, h * 1.05)
        g.lineTo(apexX + spread, h * 1.05)
        g.closePath()
        g.fill()
      } else {
        const r = Math.max(w, h) * 0.08 + Math.max(w, h) * 0.62 * e
        g.strokeStyle = "rgba(224,18,33," + 0.5 * a + ")"
        g.lineWidth = Math.max(1.5, w * 0.0018)
        g.beginPath()
        g.arc(w * 0.5, h * 0.48, r, 0, Math.PI * 2)
        g.stroke()
      }
    }

    const MOTIFS: Record<
      Motif,
      (g: CanvasRenderingContext2D, w: number, h: number, t: number, a: number) => void
    > = { beam, strings, race, watch, flood, static: staticNoise, void: voidMotif }

    // A halftone screen, built once and tiled. The references are all printed
    // things — the dot screen is most of why they read as posters rather than
    // as renders, and it costs one cached pattern.
    let screen: CanvasPattern | null = null
    const buildScreen = () => {
      const cell = 4
      const tile = document.createElement("canvas")
      tile.width = cell
      tile.height = cell
      const tg = tile.getContext("2d")
      if (!tg) return null
      tg.fillStyle = "rgba(0,0,0,0.55)"
      tg.beginPath()
      tg.arc(cell / 2, cell / 2, cell * 0.28, 0, Math.PI * 2)
      tg.fill()
      return ctx.createPattern(tile, "repeat")
    }

    const paint = () => {
      const L = look.current
      const w = canvas.width
      const h = canvas.height
      const { index, local } = chapterAt(progress, L.chapters.length)

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.fillStyle = L.ink
      ctx.fillRect(0, 0, w, h)

      // An oxblood floor under everything, brighter where the chapter peaks.
      const peak = smoothstep(0, 0.4, local) * (1 - smoothstep(0.7, 1, local))
      const floor = ctx.createRadialGradient(w * 0.5, h * 0.55, 0, w * 0.5, h * 0.55, Math.max(w, h) * 0.75)
      floor.addColorStop(0, L.oxblood)
      floor.addColorStop(1, L.ink)
      ctx.globalAlpha = 0.35 + 0.45 * peak
      ctx.fillStyle = floor
      ctx.fillRect(0, 0, w, h)
      ctx.globalAlpha = 1

      // Cross-fade neighbours at the seam so motifs dissolve rather than cut.
      const draw = (i: number, t: number, a: number) => {
        const ch = L.chapters[i]
        if (a <= 0.001) return
        const img = ch && stills[i]

        if (ch && img) {
          // A still is the scene. It is uncovered through the reveal shape and
          // then given texture — never a motif, because a motif would draw a
          // second cone on top of a photograph of a cone.
          const kind = ch.reveal ?? "cone"
          ctx.save()
          clipReveal(ctx, kind, w, h, t)
          still(ctx, img, w, h, t, a, ch.parallax ?? 0.12, ch.level ?? L.imageLevel)
          if (ch.overlay === "glyphs") flood(ctx, w, h, t, a * 0.85)
          else if (ch.overlay === "static") staticNoise(ctx, w, h, t, a * 0.9)
          else if (ch.overlay === "grid") race(ctx, w, h, t, a * 0.5)
          ctx.restore()
          revealLight(ctx, kind, w, h, t, a)
          return
        }

        if (ch?.motif) MOTIFS[ch.motif]?.(ctx, w, h, t, a)
      }
      const outgoing = smoothstep(0.82, 1, local)
      draw(index, local, 1 - outgoing)
      if (outgoing > 0) draw(index + 1, 0, outgoing)

      if (L.scanlines) {
        ctx.fillStyle = "rgba(0,0,0,0.22)"
        const pitch = Math.max(2, Math.round(h / 320))
        for (let y = 0; y < h; y += pitch * 2) ctx.fillRect(0, y, w, pitch)
      }

      if (L.grain > 0) {
        if (!screen) screen = buildScreen()
        if (screen) {
          ctx.globalAlpha = 0.5
          ctx.fillStyle = screen
          ctx.fillRect(0, 0, w, h)
          ctx.globalAlpha = 1
        }

        // Sparse dots, reseeded per frame. Cheaper than ImageData and, because
        // it is sparse, reads as film rather than as television.
        const count = Math.round((w * h) / 4200)
        const seed = Math.floor(performance.now() * 0.06)
        ctx.fillStyle = "rgba(255,255,255," + L.grain * 0.5 + ")"
        for (let i = 0; i < count; i++) {
          const s = ((i * 2246822519) ^ (seed * 3266489917)) >>> 0
          ctx.fillRect((s % w), ((s >>> 12) % h), 1, 1)
        }
      }

      // A vignette, so the frame has edges and the type has somewhere to sit.
      const vig = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.28, w * 0.5, h * 0.5, Math.max(w, h) * 0.72)
      vig.addColorStop(0, "rgba(0,0,0,0)")
      vig.addColorStop(1, "rgba(0,0,0,0.78)")
      ctx.fillStyle = vig
      ctx.fillRect(0, 0, w, h)
    }

    const frame = () => {
      if (disposed) return
      measure()
      paint()
      const next = chapterAt(progress, look.current.chapters.length)
      // Only re-render React when the chapter or a visible slice of the local
      // progress changes — not sixty times a second for a text layer.
      const q = Math.round(next.local * 40) / 40
      if (next.index !== painted || q !== view.local) {
        painted = next.index
        setView((v) => (v.index === next.index && v.local === q ? v : { index: next.index, local: q }))
      }
      raf = requestAnimationFrame(frame)
    }

    resize()
    measure()

    if (reduced) {
      // No loop and no scrub: paint the frame the reader is parked on, and
      // repaint on scroll so the sequence still advances by chapter.
      paint()
      const onScroll = () => {
        measure()
        paint()
        const next = chapterAt(progress, look.current.chapters.length)
        setView({ index: next.index, local: next.local })
      }
      addEventListener("scroll", onScroll, { passive: true })
      addEventListener("resize", onScroll)
      return () => {
        disposed = true
        observer.disconnect()
        removeEventListener("scroll", onScroll)
        removeEventListener("resize", onScroll)
      }
    }

    raf = requestAnimationFrame(frame)
    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
    // `view` is written by this effect, never read as an input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, chapters.length])

  const active = chapters[view.index] ?? chapters[0]
  const o = typeOpacity(view.local, view.index === 0, view.index === chapters.length - 1)
  // The censor bar wipes across the word once the chapter has landed.
  const wipe = active?.censor ? smoothstep(0.42, 0.66, view.local) : 0

  return (
    <section
      ref={rootRef}
      className={"relative w-full " + className}
      style={{
        height: "calc(" + chapters.length * chapterScroll + " * 100svh)",
        background: ink,
        color: bone,
      }}
      aria-label="Crimson Confessional"
    >
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" aria-hidden="true" />

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <div className="relative" style={{ opacity: o }}>
            {wipe > 0 && (
              <span
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  background: crimson,
                  transformOrigin: "left center",
                  transform: "scaleX(" + wipe.toFixed(3) + ")",
                }}
              />
            )}
            <h2
              className="relative m-0 font-semibold leading-[0.9]"
              style={{
                fontFamily: STACK,
                fontSize: "clamp(2.6rem, 11vw, 9rem)",
                letterSpacing: "0.02em",
                // Drifts up through its own chapter — slow, so it reads as a
                // camera push rather than as an entrance.
                transform: "translateY(" + (10 - 20 * view.local).toFixed(2) + "px)",
                textShadow: "0 0 40px rgba(224,18,33,0.35)",
              }}
            >
              {active?.word}
            </h2>
          </div>

          {active?.line && (
            <p
              className="m-0 mt-6 max-w-md text-balance"
              style={{
                fontFamily: MONO,
                fontSize: "clamp(0.68rem, 1.5vw, 0.84rem)",
                letterSpacing: "0.26em",
                textTransform: "uppercase",
                color: "rgba(230,224,214,0.62)",
                opacity:
                  (view.index === 0 ? 1 : smoothstep(0.18, 0.42, view.local)) *
                  (view.index === chapters.length - 1
                    ? 1
                    : 1 - smoothstep(0.76, 1, view.local)),
              }}
            >
              {active.line}
            </p>
          )}
        </div>

        {/* Chapter counter, bottom left, like a reel marker. */}
        <div
          className="pointer-events-none absolute bottom-6 left-6 flex items-center gap-3"
          style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.2em", color: "rgba(230,224,214,0.45)" }}
        >
          <span style={{ color: crimson }}>
            {String(view.index + 1).padStart(2, "0")}
          </span>
          <span>/ {String(chapters.length).padStart(2, "0")}</span>
        </div>
      </div>

      {/* The words as ordinary markup, for readers and crawlers that will
          never see a canvas. Visually hidden, not display:none. */}
      <ol className="sr-only">
        {chapters.map((c) => (
          <li key={c.word}>
            {c.word}
            {c.line ? " — " + c.line : ""}
          </li>
        ))}
      </ol>
    </section>
  )
}
