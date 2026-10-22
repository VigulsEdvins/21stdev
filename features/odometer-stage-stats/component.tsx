"use client"

import * as React from "react"

/*
 * Odometer Stage Stats: a "by the numbers" section that puts one figure on
 * stage at a time. A committed colour field, one enormous condensed numeral in
 * the middle, the line that explains it underneath, a short story pinned to
 * alternating corners and the stat's key word set huge and faint along the
 * bottom edge.
 *
 * The step is the signature: the old figure drops out of its cells, and every
 * character of the new one spins through a few digits like a counter wheel
 * before it lands, each a beat after its neighbour. Forward steps roll up,
 * backward steps roll down.
 *
 * Two modes. "scroll" (default): the stage sticks while the section scrolls
 * past, and each stretch of scroll is one stat. "click": a fixed-height band
 * with prev / next, the segment bar and optional autoplay. Both take ←/→, and
 * the segment bar along the bottom jumps to any stat.
 *
 * The numerals are drawn in SVG by this file (0–9 . , % + − × / $ € £ ¥ ₹ K M B), so
 * the figure is the same heavy condensed shape on every machine with no web
 * font. Any other character falls back to the UI font.
 */

export type StagePreset = "signal" | "cobalt" | "forest" | "ink" | "saffron"

export type StagePalette = {
  /** The colour field. */
  field: string
  /** Numerals and text on the field. */
  ink: string
  /** The field in dark mode (an ancestor with the `dark` class). Defaults to `field`. */
  fieldDark?: string
  /** The faint backdrop word. Defaults to the field mixed with 20% black. */
  ghost?: string
}

export type Stat = {
  /** The figure, e.g. "96", "4.2×", "$2.4B", "61%", "12K". */
  value: string
  /** What the figure counts, one short line under it. Text, or any node (then give `alt`). */
  label: React.ReactNode
  /** What a screen reader hears for this stat. Defaults to the figure and the label when the label is text. */
  alt?: string
  /** Two or three sentences, pinned to a corner. */
  story?: string
  /** Where the number comes from. Shown small in the corner. */
  source?: string
  /** The faint backdrop word. Defaults to the label's first word. Pass "" for none. */
  word?: string
}

export type OdometerStageStatsProps = {
  stats?: Stat[]
  /** Small heading in the top-left corner. Also names the section for screen readers. */
  title?: string
  preset?: StagePreset
  /** Override any colour of the preset. */
  palette?: StagePaletteInput
  /** "scroll": the stage sticks and scrolling steps through the stats. "click": a band with controls. */
  mode?: "scroll" | "click"
  /** Height of the stage. Any CSS length. */
  height?: string
  /** Scroll distance per stat in "scroll" mode. Any CSS length. */
  step?: string
  /** px of fixed header above the stage in "scroll" mode. */
  stickyTop?: number
  /** ms per stat in "click" mode; 0 turns autoplay off. Off under reduced motion. */
  autoplay?: number
  /** Shown under the last stat. */
  cta?: { label: string; href?: string; onClick?: (e: React.MouseEvent) => void }
  /** Height cap of the numeral. Any CSS length; it also shrinks to fit the width. */
  numberSize?: string
  /** Font stack for text. Pass your own, e.g. "var(--font-sans)". */
  uiFont?: string
  /** Font stack for the faint backdrop word and the title. */
  wordFont?: string
  /** Font stack for the corner stories. */
  storyFont?: string
  showGrain?: boolean
  onStepChange?: (index: number) => void
  className?: string
  style?: React.CSSProperties
}

const PRESETS: { [k: string]: StagePalette } = {
  signal: { field: "#D3261C", ink: "#FFFFFF", fieldDark: "#A81C14" },
  cobalt: { field: "#1C3ED4", ink: "#FFFFFF", fieldDark: "#1430A8" },
  forest: { field: "#0E4A32", ink: "#E6F5C4", fieldDark: "#0A3825" },
  ink: { field: "#151515", ink: "#F3F3F3", fieldDark: "#0C0C0C", ghost: "#262626" },
  saffron: { field: "#F2B705", ink: "#141414", fieldDark: "#DCA500" },
}

const DEFAULT_STATS: Stat[] = [
  {
    value: "96",
    label: "brands launched since 2014",
    word: "Brands",
    story:
      "From a two-table ramen counter to a regional rail line. Every one of them started as a single page of words, before anyone picked a colour.",
    source: "Studio records, January 2026",
  },
  {
    value: "38",
    label: "of them still work with us",
    word: "Clients",
    story:
      "Most identities are finished the day they launch. Ours keep a desk here: menus, signage, the third shop, the rebrand of the rebrand.",
    source: "Active retainers, January 2026",
  },
  {
    value: "4.2×",
    label: "more direct bookings in the year after a relaunch",
    word: "Lift",
    story:
      "Median across the eleven hospitality clients who shared their numbers with us. Measured against the twelve months before the new name went up.",
    source: "Client-reported, 2019 to 2025",
  },
  {
    value: "1",
    label: "studio, one floor, no subcontractors",
    word: "Studio",
    story:
      "Strategy, naming, type and the website are made by the same nine people around the same table. You meet all of them in the first week.",
  },
]

const UI_FONT = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
const WORD_FONT =
  '"Bebas Neue", "Oswald", "Antonio", Impact, Haettenschweiler, "Arial Narrow Bold", "Roboto Condensed", "Helvetica Neue", sans-serif'

const STORY_FONT = '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Charter, Georgia, "Times New Roman", serif'

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"

/*
 * Glyphs are stroked skeletons: cap height 200 units, a 42-unit stroke, butt
 * caps and mitred joins, which gives a heavy compressed poster figure with slit
 * counters. Each sits in a box 240 units tall (the extra 40 is for the comma's
 * tail). Strokes stay inside their width (the test samples every path); the
 * box clips terminals flat at the cap line and the baseline on purpose.
 */
type Glyph = { w: number; d: string; s?: number; d2?: string; s2?: number; rot?: boolean }

const STROKE = 42
const BOWL_SIX = "M21 112A28 28 0 0 1 77 112V151A28 28 0 0 1 21 151ZM74.4 37.2A28 28 0 0 0 21 49V151"

const GLYPHS: { [k: string]: Glyph } = {
  "0": { w: 98, d: "M21 49A28 28 0 0 1 77 49V151A28 28 0 0 1 21 151Z" },
  "1": { w: 70, d: "M49 0V200M16 54L54 10" },
  "2": { w: 98, d: "M21 49A28 28 0 0 1 77 49C77 105 21 128 21 168V179H98" },
  "3": { w: 98, d: "M21 49A28 28 0 0 1 77 49V74A24 24 0 0 1 53 98H41M41 98H49A28 28 0 0 1 77 126V151A28 28 0 0 1 21 151" },
  "4": { w: 102, d: "M81 0V200M73 0L21 132V140H102" },
  "5": { w: 98, d: "M94 21H21V112M21 112C21 94 33 84 49 84A28 28 0 0 1 77 112V151A28 28 0 0 1 21 151" },
  "6": { w: 98, d: BOWL_SIX },
  "7": { w: 98, d: "M4 21H77L36 200" },
  "8": { w: 98, d: "M24 46A25 25 0 0 1 74 46V67A25 25 0 0 1 24 67ZM21 126A28 28 0 0 1 77 126V151A28 28 0 0 1 21 151Z" },
  "9": { w: 98, d: BOWL_SIX, rot: true },
  ".": { w: 42, d: "M21 158V200" },
  ",": { w: 50, d: "M28 158V198L21 232" },
  "%": {
    w: 170,
    s: 32,
    d: "M16 37A21 21 0 0 1 58 37V69A21 21 0 0 1 16 69ZM112 131A21 21 0 0 1 154 131V163A21 21 0 0 1 112 163ZM128 0L42 200",
  },
  "+": { w: 112, s: 36, d: "M56 48V152M6 100H106" },
  "×": { w: 96, s: 30, d: "M20 66L76 134M76 66L20 134" },
  "-": { w: 86, s: 38, d: "M6 108H80" },
  "/": { w: 106, s: 36, d: "M88 0L18 200" },
  K: { w: 104, d: "M21 0V200M36 128L84 -10M48 96L88 222" },
  M: { w: 140, d: "M21 200V0M21 0L70 150L119 0M119 0V200" },
  B: { w: 118, d: "M21 0V200M0 21H52A37.5 37.5 0 0 1 52 96H21M21 96H55A41.5 41.5 0 0 1 55 179H0" },
  $: { w: 100, s: 36, d: "M80 56A30 28 0 0 0 20 64C20 98 80 102 80 136A30 28 0 0 1 20 144", d2: "M50 0V200", s2: 16 },
  "€": { w: 120, s: 36, d: "M100 52.6A40 79 0 1 0 100 147.4", d2: "M4 84H72M4 116H72", s2: 18 },
  "£": { w: 100, d: "M82 39A30 30 0 0 0 26 54V179M0 179H100", d2: "M4 104H72", s2: 26 },
  "¥": { w: 110, s: 36, d: "M22 0L55 98L88 0M55 98V200", d2: "M16 120H94M16 154H94", s2: 22 },
  "₹": { w: 104, s: 30, d: "M2 15H102M2 54H102", d2: "M2 15H40A39 39 0 0 1 40 93H16L86 200", s2: 30 },
}

// #region logic
const ALIASES: { [k: string]: string } = { x: "×", X: "×", "*": "×", k: "K", m: "M", b: "B", "−": "-", "–": "-" }

/** Split a figure into glyph keys. Known glyphs map to the SVG set; anything else is kept for the text fallback. */
export function parseValue(value: string): string[] {
  const out: string[] = []
  for (const raw of Array.from(String(value))) {
    const ch = ALIASES[raw] || raw
    out.push(ch)
  }
  return out
}

export function isDrawn(ch: string): boolean {
  return Object.prototype.hasOwnProperty.call(GLYPHS, ch)
}

/** Width of one glyph cell in ems of the cap height (spaces and fallbacks get a fixed width). */
export function glyphEm(ch: string): number {
  if (ch === " ") return 0.28
  return isDrawn(ch) ? GLYPHS[ch].w / 200 : 0.62
}

export const GAP_EM = 0.06

/** Total width of a figure in ems of its cap height. Drives the fit-to-width font size. */
export function figureEm(chars: string[]): number {
  if (!chars.length) return 0.5
  let w = 0
  for (const ch of chars) w += glyphEm(ch)
  return w + GAP_EM * (chars.length - 1)
}

export function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n
}

/** Which stat a scroll progress (0..1 through the section) shows. Every stat gets an equal stretch. */
export function stepFromProgress(p: number, n: number): number {
  if (n <= 1) return 0
  return Math.min(n - 1, Math.floor(clamp01(p) * n))
}

/** How far through its own stretch the current stat is (0..1), for the segment bar. */
export function progressWithin(p: number, n: number): number {
  if (n <= 0) return 0
  const x = clamp01(p) * n
  const i = stepFromProgress(p, n)
  return clamp01(x - i)
}

/** Where to scroll so stat i is on stage: a little past the start of its stretch, so it never sits on a boundary. */
export function anchorFraction(i: number, n: number): number {
  if (n <= 1) return 0
  if (i <= 0) return 0
  return (i + 0.18) / n
}

export function wrap(i: number, n: number): number {
  return n ? ((i % n) + n) % n : 0
}

export function pad2(n: number): string {
  return n < 10 ? "0" + n : String(n)
}

/**
 * The digits a cell spins through before it lands on its own: the two or
 * three before it, in order, like a counter wheel. Digits pass
 * two or three neighbours (longer for cells further right, so the figure
 * settles left to right); anything else just slides in.
 */
export function rollStrip(target: string, position: number): string[] {
  if (!/^[0-9]$/.test(target)) return [target]
  const t = Number(target)
  const spins = 2 + (position % 2)
  const out: string[] = []
  for (let k = spins; k >= 1; k--) out.push(String((t - k + 10) % 10))
  out.push(target)
  return out
}

/** The faint backdrop word: the stat's own, else the first word of its label (when the label is text). */
export function backdropWord(stat: { label?: unknown; word?: string }): string {
  if (typeof stat.word === "string") return stat.word
  if (typeof stat.label !== "string") return ""
  const first = stat.label.trim().split(/\s+/)[0] || ""
  return first.replace(/[^\p{L}\p{N}]/gu, "")
}

/** One sentence a screen reader hears for a stat. */
export function spoken(stat: { value: string; label?: unknown; alt?: string }): string {
  if (stat.alt) return stat.alt
  return (stat.value + " " + (typeof stat.label === "string" ? stat.label : "")).trim()
}
// #endregion logic

function GlyphSvg({ ch }: { ch: string }) {
  const g = GLYPHS[ch]
  if (!g) return <span className="ost-fallback">{ch === " " ? " " : ch}</span>
  return (
    <svg
      className="ost-glyph"
      viewBox={"0 0 " + g.w + " 240"}
      width={g.w}
      height={240}
      style={{ width: g.w / 200 + "em", height: "1.2em", maxWidth: "none" }}
      aria-hidden="true"
      focusable="false"
    >
      <g transform={g.rot ? "rotate(180 " + g.w / 2 + " 100)" : undefined}>
        <path d={g.d} fill="none" stroke="currentColor" strokeWidth={g.s || STROKE} strokeLinejoin="miter" strokeMiterlimit={3} />
        {g.d2 ? <path d={g.d2} fill="none" stroke="currentColor" strokeWidth={g.s2 || STROKE} strokeLinejoin="miter" /> : null}
      </g>
    </svg>
  )
}

type Phase = "from" | "to" | "out"

const PITCH = 1.2

function Figure({
  value,
  phase,
  dir,
  order,
}: {
  value: string
  phase: Phase
  /** Which way this step moves: 1 rolls up, -1 rolls down. */
  dir: 1 | -1
  /** Which way the figure was stacked when it came in (it keeps that stack on the way out). */
  order: 1 | -1
}) {
  const chars = parseValue(value)
  const em = figureEm(chars)
  const fit = "calc(var(--ost-fitw, 88cqw) / " + em.toFixed(3) + ")"
  return (
    <span
      className="ost-figure"
      data-phase={phase}
      data-dir={dir === 1 ? "up" : "down"}
      style={{ fontSize: "min(var(--ost-figmax), " + fit + ")" }}
      aria-hidden="true"
    >
      {chars.map((ch, i) => {
        const strip = rollStrip(ch, chars.length - 1 - i)
        const ordered = order === 1 ? strip : strip.slice().reverse()
        const len = ordered.length
        const target = order === 1 ? len - 1 : 0
        // Symbols (% $ K . …) do not spin: they rise a hair into place while their neighbours
        // roll, so no cell is ever empty mid-step.
        const sym = len === 1
        // Digits sit PITCH apart like numbers on a wheel; the 0.2em gap is just wider than the
        // cells' 0.16em edge fade, so a landed digit's neighbours are fully out of sight. Up: the strip starts one slot below and
        // travels until its last glyph is in the cell. Down: it starts above and travels until
        // its first glyph is.
        const start = sym ? 0.14 * (order === 1 ? 1 : -1) : order === 1 ? PITCH : -PITCH * len
        const end = -PITCH * target
        // Leaving, the landed glyph carries on part of a slot in the step's direction and fades.
        const y = phase === "from" ? start : phase === "to" ? end : end + (dir === 1 ? -0.5 : 0.5)
        return (
          <span
            key={i}
            className="ost-cell"
            data-tail={ch === "," ? "" : undefined}
            style={{ width: glyphEm(ch) + "em", marginRight: i < chars.length - 1 ? GAP_EM + "em" : 0 }}
          >
            <span
              className="ost-strip"
              data-sym={sym ? "" : undefined}
              style={{
                transform: "translate3d(0," + y + "em,0)",
                // The new figure waits for the old one to clear its cells, then lands left to right.
                transitionDelay: (phase === "out" ? i * 10 : 40 + i * 50) + "ms",
              }}
            >
              {ordered.map((g, k) => (
                <span className="ost-slot" key={k} data-target={k === target ? "" : undefined}>
                  <GlyphSvg ch={g} />
                </span>
              ))}
            </span>
          </span>
        )
      })}
    </span>
  )
}

function wordStyle(word: string): React.CSSProperties {
  return { ["--ost-chars" as string]: Math.max(3, Array.from(word).length) } as React.CSSProperties
}

function Arrow({ dir, axis }: { dir: "prev" | "next"; axis: "x" | "y" }) {
  const d =
    axis === "y"
      ? dir === "next"
        ? "M9 3v11M4.5 10 9 14.5 13.5 10"
        : "M9 15V4M4.5 8 9 3.5 13.5 8"
      : dir === "next"
        ? "M3 9h11M10 4.5 14.5 9 10 13.5"
        : "M15 9H4M8 4.5 3.5 9 8 13.5"
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d={d}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PlayPause({ playing }: { playing: boolean }) {
  return playing ? (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <rect x="3" y="2.5" width="2.6" height="9" fill="currentColor" />
      <rect x="8.4" y="2.5" width="2.6" height="9" fill="currentColor" />
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path d="M4 2.4v9.2L11.6 7Z" fill="currentColor" />
    </svg>
  )
}

const css = `
.ost { position: relative; display: block; width: 100%; isolation: isolate; color: var(--ost-ink); --ost-field-now: var(--ost-field); }
.dark .ost { --ost-field-now: var(--ost-field-dark); }
.ost *, .ost *::before, .ost *::after { box-sizing: border-box; }
.ost svg { max-width: none; }
.ost-anchor { position: absolute; left: 0; width: 1px; height: 1px; pointer-events: none; }
.ost-stage { position: relative; width: 100%; overflow: hidden; background-color: var(--ost-field-now); color: var(--ost-ink); container-type: size; font-family: var(--ost-ui); transition: background-color 400ms ease; }
.ost[data-mode="scroll"] .ost-stage { position: sticky; }
.ost-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.38; mix-blend-mode: soft-light; background-size: 220px 220px; }
.ost-word { position: absolute; left: clamp(12px, 2.4cqw, 40px); bottom: 0; margin: 0; font-family: var(--ost-word); font-weight: 900; font-stretch: condensed; text-transform: uppercase; letter-spacing: -0.02em; line-height: 0.74; font-size: min(clamp(88px, 22cqw, 400px), calc((100cqw - 32px) / (var(--ost-chars, 6) * 0.58))); white-space: nowrap; color: rgba(0, 0, 0, 0.16); color: var(--ost-ghost, color-mix(in srgb, var(--ost-field-now) 80%, #000)); transform-origin: 0 100%; transform: translate3d(0, 9%, 0) scaleX(0.88); pointer-events: none; user-select: none; transition: opacity 420ms cubic-bezier(0.23, 1, 0.32, 1) 140ms, transform 620ms cubic-bezier(0.23, 1, 0.32, 1) 140ms; }
.ost-word[data-state="from"] { opacity: 0; transform: translate3d(0, 34%, 0) scaleX(0.88); transition: none; }
.ost-word[data-state="out"] { opacity: 0; transform: translate3d(0, -10%, 0) scaleX(0.88); transition: opacity 110ms ease, transform 110ms ease; }
.ost-top { position: absolute; z-index: 2; top: 0; left: 0; right: 0; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: clamp(18px, 2.6cqw, 36px) clamp(18px, 3cqw, 48px); }
.ost-title { margin: 0; font-family: var(--ost-word); font-size: 17px; line-height: 1.15; font-weight: 800; text-transform: uppercase; letter-spacing: 0.03em; max-width: 44ch; text-wrap: balance; }
.ost-nav { display: flex; align-items: center; gap: 10px; }
.ost-count { font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums; letter-spacing: 0.02em; margin-right: 6px; white-space: nowrap; }
.ost-count span { opacity: 0.7; }
.ost-btn { appearance: none; display: inline-grid; place-items: center; width: 44px; height: 44px; padding: 0; border-radius: 0; border: 1.5px solid var(--ost-ink); background: transparent; color: var(--ost-ink); cursor: pointer; transition: background-color 160ms ease, color 160ms ease, transform 160ms cubic-bezier(0.23, 1, 0.32, 1); }
.ost-btn:hover { background: var(--ost-ink); color: var(--ost-field-now); }
.ost-btn:active { transform: scale(0.94); }
.ost-btn:disabled { opacity: 0.35; cursor: default; background: transparent; color: var(--ost-ink); transform: none; }
.ost-btn svg { transition: transform 220ms cubic-bezier(0.23, 1, 0.32, 1); }
.ost[data-mode="scroll"] .ost-btn[data-dir="next"]:hover:not(:disabled) svg { transform: translateY(2px); }
.ost[data-mode="scroll"] .ost-btn[data-dir="prev"]:hover:not(:disabled) svg { transform: translateY(-2px); }
.ost[data-mode="click"] .ost-btn[data-dir="next"]:hover:not(:disabled) svg { transform: translateX(2px); }
.ost[data-mode="click"] .ost-btn[data-dir="prev"]:hover:not(:disabled) svg { transform: translateX(-2px); }
.ost-btn:focus-visible, .ost-seg:focus-visible, .ost-cta:focus-visible { outline: 2px solid var(--ost-ink); outline-offset: 3px; }
.ost-center { --ost-ctop: clamp(64px, 11cqh, 112px); --ost-cbot: clamp(56px, 10cqh, 104px); --ost-below: 96px; position: absolute; z-index: 1; left: 0; right: 0; top: var(--ost-ctop); bottom: var(--ost-cbot); display: flex; flex-direction: column; align-items: center; justify-content: flex-start; text-align: center; padding: 0 clamp(16px, 3cqw, 48px); pointer-events: none; }
.ost-center > * { pointer-events: auto; }
.ost-figwrap { display: grid; justify-items: center; align-items: end; flex: none; height: var(--ost-figmax); margin-top: max(0px, calc((100cqh - var(--ost-ctop) - var(--ost-cbot) - var(--ost-figmax) - var(--ost-below)) / 2)); }
.ost-figwrap > * { grid-area: 1 / 1; }
.ost-figure { display: inline-flex; align-items: flex-start; line-height: 1; height: 1em; color: var(--ost-ink); }
.ost-cell { position: relative; display: block; flex: none; height: 1em; clip-path: inset(-0.16em -0.12em); -webkit-mask-image: linear-gradient(transparent, #000 0.16em, #000 calc(100% - 0.16em), transparent); mask-image: linear-gradient(transparent, #000 0.16em, #000 calc(100% - 0.16em), transparent); -webkit-mask-size: 100% calc(100% + 0.32em); mask-size: 100% calc(100% + 0.32em); -webkit-mask-position: 0 -0.16em; mask-position: 0 -0.16em; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; }
.ost-cell[data-tail] { clip-path: inset(-0.16em -0.12em -0.24em -0.12em); -webkit-mask-size: 100% calc(100% + 0.4em); mask-size: 100% calc(100% + 0.4em); }
.ost-strip { display: flex; flex-direction: column; will-change: transform; transition-property: transform; transition-duration: 850ms; transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1); }
.ost-figure[data-phase="from"] .ost-strip { transition: none; }
.ost-strip[data-sym] { transition-property: transform, opacity; transition-duration: 420ms, 300ms; }
.ost-figure[data-phase="from"] .ost-strip[data-sym] { opacity: 0; }
.ost-figure[data-phase="out"] .ost-strip { opacity: 0; transition-property: transform, opacity; transition-duration: 120ms, 100ms; transition-timing-function: cubic-bezier(0.65, 0, 0.35, 1), ease; }
.ost-figure[data-phase="out"] .ost-slot:not([data-target]) { visibility: hidden; }
.ost-slot { display: flex; justify-content: center; height: 1.2em; }
.ost-glyph { display: block; flex: none; overflow: hidden; }
.ost-fallback { display: block; height: 1em; font-size: 1em; line-height: 1; font-weight: 800; font-family: var(--ost-ui); letter-spacing: -0.04em; }
.ost-label { margin: clamp(10px, 2.2cqh, 26px) 0 0; font-size: clamp(17px, 1.55cqw, 23px); line-height: 1.3; font-weight: 600; letter-spacing: -0.005em; max-width: 30ch; text-wrap: balance; transition: opacity 380ms ease 120ms, transform 500ms cubic-bezier(0.22, 1, 0.36, 1) 120ms, filter 380ms ease 120ms; }
.ost-label[data-state="from"] { opacity: 0; transform: translateY(12px); filter: blur(3px); transition: none; }
.ost-cta { display: inline-flex; align-items: center; gap: 10px; margin-top: 22px; min-height: 48px; padding: 0 22px; border-radius: 0; background: var(--ost-ink); color: var(--ost-field-now); font-size: 15px; font-weight: 700; text-decoration: none; border: 0; cursor: pointer; transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1), opacity 380ms ease; }
.ost-cta svg { transition: transform 220ms cubic-bezier(0.23, 1, 0.32, 1); }
.ost-cta:hover svg { transform: translateX(4px); }
.ost-cta:active { transform: scale(0.97); }
.ost-cta[data-state="from"] { opacity: 0; transform: translateY(8px); transition: none; }
.ost-cta[data-state="to"] { transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1), opacity 380ms ease 420ms; }
.ost-stories { display: contents; }
.ost-story { position: absolute; z-index: 1; width: min(340px, 27cqw); margin: 0; text-align: left; font-family: var(--ost-story); font-size: 16.5px; line-height: 1.45; text-wrap: pretty; transition: opacity 400ms ease 200ms, transform 500ms cubic-bezier(0.22, 1, 0.36, 1) 200ms, filter 400ms ease 200ms; }
.ost-story[data-side="start"] { left: clamp(18px, 3cqw, 48px); bottom: clamp(12px, 3cqh, 36px); }
.ost-story[data-side="end"] { right: clamp(18px, 3cqw, 48px); bottom: clamp(12px, 3cqh, 36px); }
.ost-story[data-state="from"] { opacity: 0; filter: blur(3px); transition: none; }
.ost-story[data-state="out"] { opacity: 0; transition: opacity 150ms ease, transform 150ms ease; transition-delay: 0ms; }
.ost-story[data-state="from"][data-side="start"], .ost-story[data-state="out"][data-side="start"] { transform: translateX(-12px); }
.ost-story[data-state="from"][data-side="end"], .ost-story[data-state="out"][data-side="end"] { transform: translateX(12px); }
.ost-mark { display: block; margin-bottom: 8px; font-family: var(--ost-ui); font-size: 13px; font-weight: 700; letter-spacing: 0.04em; font-variant-numeric: tabular-nums; }
.ost-source { display: block; margin-top: 12px; font-family: var(--ost-ui); font-size: 12.5px; line-height: 1.4; font-weight: 500; }
.ost-bar { position: absolute; z-index: 2; left: clamp(18px, 3cqw, 48px); right: clamp(18px, 3cqw, 48px); bottom: clamp(14px, 2cqw, 26px); display: flex; gap: 8px; }
.ost-seg { position: relative; flex: 1 1 0; height: 28px; padding: 0; margin: 0; border: 0; background: transparent; cursor: pointer; color: var(--ost-ink); }
.ost-seg::before { content: ""; position: absolute; left: 0; right: 0; top: 50%; height: 3px; margin-top: -1.5px; background: currentColor; opacity: 0.28; transition: opacity 160ms ease, height 160ms ease; }
.ost-seg:hover::before { opacity: 0.5; }
.ost-seg:active .ost-fill, .ost-seg:active::before { opacity: 0.8; }
.ost-fill { position: absolute; left: 0; right: 0; top: 50%; height: 3px; margin-top: -1.5px; background: currentColor; transform-origin: 0 50%; transition: transform 240ms cubic-bezier(0.23, 1, 0.32, 1); }
.ost[data-mode="click"] .ost-fill { transition: transform 360ms cubic-bezier(0.23, 1, 0.32, 1); }
.ost-sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
@media (prefers-reduced-motion: reduce) {
  .ost-strip, .ost-word, .ost-label, .ost-story, .ost-cta, .ost-fill, .ost-btn, .ost-btn svg, .ost-stage { transition: none !important; filter: none !important; }
  .ost-story[data-state="out"], .ost-word[data-state="out"] { display: none; }
}
`

/* Container queries: one stacked composition for a narrow stage. Kept apart so the test can read them. */
const narrowCss = `
@container (max-width: 1180px) {
  .ost-label { max-width: 24ch; }
  .ost-story { width: min(300px, 28cqw); }
}
@container (max-width: 760px) {
  .ost-center { --ost-ctop: 72px; --ost-cbot: clamp(118px, 31cqw, 170px); --ost-below: 210px; --ost-fitw: 88cqw; --ost-nh: 34cqh; }
  .ost-label { max-width: 30ch; }
  .ost-stories { display: grid; width: 100%; max-width: 46ch; margin-top: clamp(16px, 3cqh, 28px); }
  .ost-stories > .ost-story { grid-area: 1 / 1; position: static; width: auto; font-size: 15.5px; }
  .ost-story[data-state="from"], .ost-story[data-state="out"] { transform: translateY(8px) !important; }
  .ost-word { bottom: 44px; font-size: min(30cqw, calc((100cqw - 44px) / (var(--ost-chars, 6) * 0.62))); transform: scaleX(0.88); }
  .ost-word[data-state="from"] { transform: translate3d(0, 24%, 0) scaleX(0.88); }
  .ost-word[data-state="out"] { transform: translate3d(0, -8%, 0) scaleX(0.88); }
  .ost-title { font-size: 14px; max-width: 24ch; }
  .ost-count { display: none; }
  .ost-btn { width: 40px; height: 40px; }
}
@container (max-height: 620px) {
  .ost-stories { display: none; }
  .ost-center { --ost-cbot: clamp(56px, 10cqh, 104px); --ost-below: 96px; }
}
`

export default function OdometerStageStats({
  stats = DEFAULT_STATS,
  title = "Halden Studio, eleven years in figures",
  preset = "signal",
  palette,
  mode = "scroll",
  height = "100svh",
  step = "80svh",
  stickyTop = 0,
  autoplay = 5200,
  cta,
  numberSize = "min(var(--ost-nh, 42cqh), 560px)",
  uiFont = UI_FONT,
  wordFont = WORD_FONT,
  storyFont = STORY_FONT,
  showGrain = true,
  onStepChange,
  className,
  style,
}: OdometerStageStatsProps) {
  const list = stats.length ? stats : DEFAULT_STATS
  const n = list.length
  const base = PRESETS[preset] || PRESETS.signal
  const colors = {
    field: (palette && palette.field) || base.field,
    ink: (palette && palette.ink) || base.ink,
    fieldDark: (palette && (palette.fieldDark || palette.field)) || base.fieldDark || base.field,
    ghost: (palette && palette.ghost) || (palette && palette.field ? undefined : base.ghost),
  }

  const rootRef = React.useRef<HTMLElement | null>(null)
  const stageRef = React.useRef<HTMLDivElement | null>(null)
  const anchorsRef = React.useRef<(HTMLSpanElement | null)[]>([])
  const [index, setIndex] = React.useState(0)
  const [within, setWithin] = React.useState(0)
  const [view, setView] = React.useState({ cur: 0, prev: -1, dir: 1 as 1 | -1, prevDir: 1 as 1 | -1, phase: "to" as Phase, key: 0 })
  const [reduced, setReduced] = React.useState(false)
  const [playing, setPlaying] = React.useState(true)
  const [held, setHeld] = React.useState(false)
  const [announce, setAnnounce] = React.useState("")
  const lockRef = React.useRef<{ target: number; until: number } | null>(null)
  const shownRef = React.useRef(0)
  const headingId = React.useId()

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const on = () => setReduced(mq.matches)
    on()
    mq.addEventListener("change", on)
    return () => mq.removeEventListener("change", on)
  }, [])

  // A stat change starts the roll: the new figure mounts below its cells ("from"),
  // then two frames later it is released to travel ("to"); the old one leaves ("out").
  React.useEffect(() => {
    // Compare against what is on stage, so a re-run (Strict Mode) never rolls or announces twice.
    if (shownRef.current === index) return
    const forcedDir = stepDirRef.current
    stepDirRef.current = 0
    shownRef.current = index
    setView((v) => {
      if (v.cur === index) return v
      const forced = forcedDir
      const dir: 1 | -1 = forced ? (forced > 0 ? 1 : -1) : index > v.cur ? 1 : -1
      return { cur: index, prev: v.cur, dir, prevDir: v.dir, phase: reduced ? "to" : "from", key: v.key + 1 }
    })
    setAnnounce("Stat " + (index + 1) + " of " + n + ": " + spoken(list[index] || list[0]))
    if (onStepChange) onStepChange(index)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  React.useEffect(() => {
    if (view.phase !== "from") return
    let r2 = 0
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => setView((v) => (v.phase === "from" ? { ...v, phase: "to" } : v)))
    })
    return () => {
      cancelAnimationFrame(r1)
      cancelAnimationFrame(r2)
    }
  }, [view.phase, view.key])

  React.useEffect(() => {
    if (view.prev < 0) return
    const t = window.setTimeout(() => setView((v) => (v.key === view.key ? { ...v, prev: -1 } : v)), reduced ? 0 : 700)
    return () => window.clearTimeout(t)
  }, [view.key, view.prev, reduced])

  // Scroll mode: the section's own scroll progress picks the stat. Listening in the
  // capture phase catches whichever element actually scrolls, window or not.
  React.useEffect(() => {
    if (mode !== "scroll") return
    let raf = 0
    const read = () => {
      raf = 0
      const root = rootRef.current
      const stage = stageRef.current
      if (!root || !stage) return
      const rect = root.getBoundingClientRect()
      const travel = rect.height - stage.offsetHeight
      const p = travel > 0 ? clamp01((stickyTop - rect.top) / travel) : 0
      const i = stepFromProgress(p, n)
      const lock = lockRef.current
      if (lock) {
        if (i === lock.target || performance.now() > lock.until) lockRef.current = null
        else return
      }
      setIndex(i)
      setWithin(progressWithin(p, n))
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read)
    }
    read()
    document.addEventListener("scroll", onScroll, { capture: true, passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true })
      window.removeEventListener("resize", onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [mode, n, stickyTop])

  // Which way the next step should roll when it is not simply "higher index = up" (a wrap).
  const stepDirRef = React.useRef(0)

  const go = React.useCallback(
    (to: number) => {
      // Click mode wraps, like its autoplay; scroll mode stops at the ends of the section.
      const i = mode === "click" ? wrap(to, n) : Math.max(0, Math.min(n - 1, to))
      if (mode === "click" && i !== to) stepDirRef.current = to > i ? 1 : -1
      if (mode === "scroll") {
        const a = anchorsRef.current[i]
        if (a) {
          lockRef.current = { target: i, until: performance.now() + 1400 }
          a.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" })
        }
        setWithin(0.18)
      } else {
        setWithin(1)
      }
      setIndex(i)
    },
    [mode, n, reduced],
  )

  // Click mode autoplay: pauses on hover, keyboard focus, a hidden tab and the pause button.
  const autoplayOn = mode === "click" && autoplay > 0 && !reduced && n > 1
  React.useEffect(() => {
    if (!autoplayOn || !playing || held) return
    const t = window.setTimeout(() => {
      if (document.visibilityState === "hidden") return
      setIndex((i) => {
        if (i === n - 1) stepDirRef.current = 1
        return wrap(i + 1, n)
      })
    }, autoplay)
    return () => window.clearTimeout(t)
  }, [autoplayOn, playing, held, autoplay, index, n])

  React.useEffect(() => {
    if (mode === "click") setWithin(1)
  }, [mode, index])

  const onKeyDown = (e: React.KeyboardEvent) => {
    const t = e.target as HTMLElement
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return
    if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "PageDown") {
      if (index < n - 1 || mode === "click") {
        e.preventDefault()
        go(index + 1)
      }
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") {
      if (index > 0 || mode === "click") {
        e.preventDefault()
        go(index - 1)
      }
    } else if (e.key === "Home") {
      e.preventDefault()
      go(0)
    } else if (e.key === "End") {
      e.preventDefault()
      go(n - 1)
    }
  }

  const cur = list[view.cur] || list[0]
  const prev = view.prev >= 0 ? list[view.prev] : null
  const enter: "from" | "to" = view.phase === "from" ? "from" : "to"
  const side = view.cur % 2 === 0 ? "start" : "end"
  const word = backdropWord(cur)
  const prevWord = prev ? backdropWord(prev) : ""
  const isLast = view.cur === n - 1
  const totalHeight = mode === "scroll" && n > 1 ? "calc(" + height + " + " + (n - 1) + " * " + step + ")" : height

  const rootStyle = {
    "--ost-field": colors.field,
    "--ost-field-dark": colors.fieldDark,
    "--ost-ink": colors.ink,
    ...(colors.ghost ? { "--ost-ghost": colors.ghost } : null),
    "--ost-ui": uiFont,
    "--ost-word": wordFont,
    "--ost-story": storyFont,
    height: totalHeight,
    ...style,
  } as React.CSSProperties

  return (
    <section
      ref={rootRef as React.RefObject<HTMLElement>}
      className={"ost" + (className ? " " + className : "")}
      data-mode={mode}
      style={rootStyle}
      aria-labelledby={headingId}
      onKeyDown={onKeyDown}
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setHeld(false)
      }}
    >
      <style>{css + narrowCss}</style>

      {mode === "scroll" && n > 1
        ? list.map((_, i) => (
            <span
              key={i}
              ref={(el) => {
                anchorsRef.current[i] = el
              }}
              className="ost-anchor"
              aria-hidden="true"
              style={{
                top: "calc((100% - " + height + ") * " + anchorFraction(i, n).toFixed(4) + ")",
                scrollMarginTop: stickyTop + "px",
              }}
            />
          ))
        : null}

      <div ref={stageRef} className="ost-stage" style={{ height, top: stickyTop }}>
        {showGrain ? <div className="ost-grain" style={{ backgroundImage: GRAIN }} aria-hidden="true" /> : null}

        {prev && prevWord ? (
          <p key={"w" + (view.key - 1)} className="ost-word" data-state="out" aria-hidden="true" style={wordStyle(prevWord)}>
            {prevWord}
          </p>
        ) : null}
        {word ? (
          <p key={"w" + view.key} className="ost-word" data-state={enter} aria-hidden="true" style={wordStyle(word)}>
            {word}
          </p>
        ) : null}

        <div className="ost-top">
          <h2 id={headingId} className="ost-title">
            {title}
          </h2>
          <div className="ost-nav">
            <span className="ost-count" aria-hidden="true">
              {pad2(view.cur + 1)} <span>/ {pad2(n)}</span>
            </span>
            {autoplayOn ? (
              <button
                type="button"
                className="ost-btn"
                onClick={() => setPlaying((p) => !p)}
                aria-label={playing ? "Pause stats" : "Play stats"}
              >
                <PlayPause playing={playing} />
              </button>
            ) : null}
            <button
              type="button"
              className="ost-btn"
              data-dir="prev"
              onClick={() => go(index - 1)}
              disabled={mode === "scroll" && index <= 0}
              aria-label="Previous stat"
            >
              <Arrow dir="prev" axis={mode === "scroll" ? "y" : "x"} />
            </button>
            <button
              type="button"
              className="ost-btn"
              data-dir="next"
              onClick={() => go(index + 1)}
              disabled={mode === "scroll" && index >= n - 1}
              aria-label="Next stat"
            >
              <Arrow dir="next" axis={mode === "scroll" ? "y" : "x"} />
            </button>
          </div>
        </div>

        {/* The size cap is declared here, not on the root, so the phone layout's --ost-nh applies to it. */}
        <div className="ost-center" style={{ ["--ost-figmax" as string]: numberSize } as React.CSSProperties}>
          <div className="ost-figwrap">
            {prev ? (
              <Figure key={"n" + (view.key - 1)} value={prev.value} phase="out" dir={view.dir} order={view.prevDir} />
            ) : null}
            <Figure key={"n" + view.key} value={cur.value} phase={enter} dir={view.dir} order={view.dir} />
          </div>
          <p key={"l" + view.key} className="ost-label" data-state={enter} aria-hidden="true">
            {cur.label}
          </p>
          {isLast && cta ? (
            cta.href ? (
              <a key={"c" + view.key} className="ost-cta" data-state={enter} href={cta.href} onClick={cta.onClick}>
                {cta.label}
                <CtaArrow />
              </a>
            ) : (
              <button key={"c" + view.key} type="button" className="ost-cta" data-state={enter} onClick={cta.onClick}>
                {cta.label}
                <CtaArrow />
              </button>
            )
          ) : null}
          <div className="ost-stories">
            {prev && (prev.story || prev.source) ? (
              <p key={"s" + (view.key - 1)} className="ost-story" data-side={view.prev % 2 === 0 ? "start" : "end"} data-state="out" aria-hidden="true">
                <span className="ost-mark">[ {pad2(view.prev + 1)} ]</span>
                {prev.story}
                {prev.source ? <span className="ost-source">Source: {prev.source}</span> : null}
              </p>
            ) : null}
            {cur.story || cur.source ? (
              <p key={"s" + view.key} className="ost-story" data-side={side} data-state={enter} aria-hidden="true">
                <span className="ost-mark">[ {pad2(view.cur + 1)} ]</span>
                {cur.story}
                {cur.source ? <span className="ost-source">Source: {cur.source}</span> : null}
              </p>
            ) : null}
          </div>
        </div>

        <div className="ost-bar">
          {list.map((s, i) => {
            const fill = i < index ? 1 : i > index ? 0 : mode === "scroll" ? Math.max(0.06, within) : within
            return (
              <button
                key={i}
                type="button"
                className="ost-seg"
                onClick={() => go(i)}
                aria-label={"Stat " + (i + 1) + ": " + spoken(s)}
                aria-current={i === index ? "step" : undefined}
              >
                <span className="ost-fill" style={{ transform: "scaleX(" + fill.toFixed(3) + ")" }} aria-hidden="true" />
              </button>
            )
          })}
        </div>

        <div className="ost-sr" aria-live="polite" aria-atomic="true">
          {announce}
        </div>
      </div>

      <dl className="ost-sr">
        {list.map((s, i) => (
          <div key={i}>
            <dt>{s.alt ? s.alt : s.value}</dt>
            <dd>
              {s.alt ? null : s.label}
              {s.story ? ". " + s.story : ""}
              {s.source ? " Source: " + s.source + "." : ""}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function CtaArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2.5 8h10M8.5 3.5 13 8l-4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export type StagePaletteInput = Partial<StagePalette>
