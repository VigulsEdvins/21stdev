"use client"

import * as React from "react"

/**
 * Dither Sweep Navbar
 *
 * An editorial, blueprint-styled header: hairline-ruled cells, monospace caps,
 * a wordmark that retracts behind its mark once the page scrolls, and a nav
 * hover that fills each cell with a chunky left-to-right pixel dissolve.
 *
 * Self-contained: React is the only import. No CSS file, no images, no icon
 * package. The dissolve is a 24x6 grid of cells with staggered opacity
 * transitions, so it costs no canvas, no rAF loop and no animation library.
 */

export interface DitherSweepNavChild {
  label: string
  href?: string
}

export interface DitherSweepNavItem {
  label: string
  href?: string
  /** Renders the cell as a submenu trigger with a drop panel underneath. */
  children?: DitherSweepNavChild[]
}

export interface DitherSweepNavbarProps {
  /** Wordmark text. It slides behind the mark on scroll, and back out on hover. */
  brand?: string
  /** Replaces the built-in mark. Sized by the component, so let it fill its box. */
  logo?: React.ReactNode
  /** Where the logo links to */
  logoHref?: string
  items?: DitherSweepNavItem[]
  /** Trailing call-to-action cell. `null` drops it and widens the nav. */
  cta?: { label: string; href: string } | null
  /** Fill colour of the nav dissolve, and the ink for text and the mark */
  ink?: string
  /** Page/bar colour */
  paper?: string
  /** Hairline rule colour */
  rule?: string
  /** CTA text and CTA dissolve colour */
  accent?: string
  /**
   * The bar scales with the viewport, exactly like the editorial layouts this
   * pattern comes from. 1 is the reference size; 1.2 makes everything 20% larger.
   */
  scale?: number
  /** Length of the pixel dissolve, in ms */
  durationMs?: number
  /** Fix the bar to the top of the viewport and hide it when scrolling down. */
  sticky?: boolean
  /** Extra root class names */
  className?: string
}

// #region dissolve
/** Cells across and down one dissolve. 24x6 keeps the cells square on a bar. */
export const PX_COLS = 24
export const PX_ROWS = 6

/**
 * How long one cell takes to fade in. The rest of the budget is the sweep.
 * Long enough that several ranks of cells are mid-fade at once, which is what
 * makes the leading edge read as grain rather than as a hard step.
 */
export const PX_CELL_MS = 180

/**
 * Arrival order for every cell, as a 0..1 fraction of the sweep.
 *
 * Mostly left-to-right, roughened so the leading edge breaks up into pixels
 * instead of marching as a clean wipe. Derived from a hash rather than
 * Math.random so the server and the client agree and hydration stays quiet.
 */
export function pixelOrder(cols: number = PX_COLS, rows: number = PX_ROWS): number[] {
  const out: number[] = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const h = Math.sin(col * 12.9898 + row * 78.233) * 43758.5453
      const jitter = h - Math.floor(h)
      out.push((col / (cols - 1)) * 0.7 + jitter * 0.3)
    }
  }
  return out
}
// #endregion

const PX_ORDER = pixelOrder()

const DSN_CSS = `
.dsn-root {
  /* The bar is sized in a fluid unit, re-based at each breakpoint, so the whole
     header scales with the viewport instead of reflowing. It lands on 10px at
     1728 / 834 / 393 wide. Kept in the stylesheet, not inline, or the inline
     value would outrank the breakpoints below. */
  --dsn-u: calc(0.5787407vw * var(--dsn-scale, 1));
  --dsn-b: max(1px, calc(var(--dsn-u) * 0.1));
  /* In flow by default, so an unpinned bar occupies its own space and whatever
     follows it starts below rather than underneath. The inset is a margin here
     and an offset when fixed, so both modes sit the same 0.8u off the edge. */
  position: relative;
  margin: calc(var(--dsn-u) * 0.8);
  z-index: 60;
  pointer-events: none;
  font-family: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  -webkit-font-smoothing: antialiased;
}
.dsn-root.dsn-sticky {
  position: fixed;
  margin: 0;
  top: calc(var(--dsn-u) * 0.8);
  left: calc(var(--dsn-u) * 0.8);
  right: calc(var(--dsn-u) * 0.8);
}

.dsn-bar {
  position: relative;
  transition: transform 0.4s ease;
  background-color: var(--dsn-paper);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23g)' opacity='0.045'/%3E%3C/svg%3E");
}
.dsn-root.dsn-hidden .dsn-bar { transform: translateY(-101%); }

/* Hairlines. The bar draws its own bottom rule and one left rule per cell, so
   adjacent cells never double up into a 2px line. */
.dsn-rule { position: absolute; z-index: 2; background-color: var(--dsn-rule); pointer-events: none; }
.dsn-rule-b { left: 0; right: 0; bottom: 0; height: var(--dsn-b); }
.dsn-rule-l { left: 0; top: 0; width: var(--dsn-b); height: 100%; }

.dsn-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(1px, 1fr));
  column-gap: calc(var(--dsn-u) * 2);
}

/* ---- logo ---------------------------------------------------------------- */
.dsn-logo {
  grid-column: 1 / 7;
  display: flex;
  padding: calc(var(--dsn-u) * 1.2) 0 calc(var(--dsn-u) * 1.2) calc(var(--dsn-u) * 3.2);
}
.dsn-logo-in {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  overflow: hidden;
  pointer-events: auto;
}
.dsn-mark {
  position: relative;
  z-index: 2;
  display: block;
  flex: none;
  width: calc(var(--dsn-u) * 3.8);
  color: var(--dsn-ink);
  background-color: var(--dsn-paper);
  text-decoration: none;
}
.dsn-mark svg { display: block; width: 100%; height: auto; }
.dsn-word {
  display: block;
  flex: none;
  padding-left: var(--dsn-u);
  color: var(--dsn-ink);
  font-family: "Inter Tight", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: calc(var(--dsn-u) * 2.4);
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.03em;
  white-space: nowrap;
  text-decoration: none;
  text-transform: uppercase;
  transition: transform 0.4s ease;
}
.dsn-root.dsn-scrolled .dsn-word { transform: translateX(-100%); pointer-events: none; }
.dsn-logo-in:hover .dsn-word { transform: translateX(0); pointer-events: auto; }

/* ---- nav ----------------------------------------------------------------- */
.dsn-nav {
  grid-column: 7 / 13;
  display: flex;
  margin-left: calc(var(--dsn-u) * -1);
  pointer-events: auto;
}
.dsn-menu { display: flex; width: 100%; }
.dsn-item-wrap { position: relative; flex: 1; }

/* ---- a cell -------------------------------------------------------------- */
.dsn-fill {
  position: relative;
  z-index: 0;
  display: flex;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: calc(var(--dsn-u) * 1.2);
  border: 0;
  border-radius: 0;
  background: none;
  color: var(--dsn-dim);
  font: inherit;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  overflow: hidden;
  transition: color 0.3s cubic-bezier(0.625, 0.05, 0, 1);
}
.dsn-fill:hover, .dsn-fill:focus-visible { color: var(--dsn-paper); }
.dsn-fill:focus-visible { outline: var(--dsn-b) solid var(--dsn-accent); outline-offset: calc(var(--dsn-u) * -0.4); }

/* The dissolve. Oversized to 24:6 so the cells stay square whatever the cell's
   own aspect ratio is, then clipped by the button's overflow. */
.dsn-px {
  position: absolute;
  z-index: 0;
  top: calc(var(--dsn-b) * -1);
  left: calc(var(--dsn-b) * -1);
  height: calc(100% + var(--dsn-b) * 2);
  aspect-ratio: 24 / 6;
  min-width: calc(100% + var(--dsn-b) * 2);
  display: grid;
  grid-template-columns: repeat(24, 1fr);
  grid-template-rows: repeat(6, 1fr);
  pointer-events: none;
}
.dsn-px i {
  display: block;
  background-color: var(--dsn-fill-color);
  opacity: 0;
  transition: opacity var(--dsn-cell) linear var(--dsn-d);
}
.dsn-fill:hover .dsn-px i,
.dsn-fill:focus-visible .dsn-px i,
.dsn-open > .dsn-fill .dsn-px i { opacity: 1; }

/* ---- rolling label ------------------------------------------------------- */
.dsn-label { position: relative; z-index: 3; flex: 1; align-self: flex-start; display: grid; overflow: hidden; }
.dsn-label span {
  grid-area: 1 / 1;
  font-size: calc(var(--dsn-u) * 1.4);
  line-height: 1.4;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: uppercase;
  white-space: nowrap;
  transition: transform 0.48s cubic-bezier(0.625, 0.05, 0, 1);
}
.dsn-label span + span { transform: translateY(100%); }
.dsn-fill:hover .dsn-label span,
.dsn-fill:focus-visible .dsn-label span,
.dsn-open > .dsn-fill .dsn-label span { transform: translateY(-100%); }
.dsn-fill:hover .dsn-label span + span,
.dsn-fill:focus-visible .dsn-label span + span,
.dsn-open > .dsn-fill .dsn-label span + span { transform: translateY(0); }

/* ---- corner ticks on submenu cells --------------------------------------- */
.dsn-tick {
  position: absolute;
  z-index: 2;
  width: calc(var(--dsn-u) * 0.6);
  right: calc(var(--dsn-u) * 0.6);
  color: currentColor;
  transition: transform 0.5s cubic-bezier(0.23, 1, 0.32, 1);
}
.dsn-tick svg { display: block; width: 100%; height: auto; }
.dsn-tick-t { top: calc(var(--dsn-u) * 0.6); transform: translate(calc(100% + var(--dsn-u) * 1.2), calc(-100% - var(--dsn-u) * 1.2)); }
.dsn-tick-b { bottom: calc(var(--dsn-u) * 0.6); }
.dsn-open .dsn-tick-t { transform: translate(0, 0); }
.dsn-open .dsn-tick-b { transform: translate(calc(100% + var(--dsn-u) * 1.2), calc(100% + var(--dsn-u) * 1.2)); }

/* ---- dropdown ------------------------------------------------------------ */
.dsn-drop {
  position: absolute;
  top: calc(100% - var(--dsn-b));
  left: 0;
  display: grid;
  grid-template-rows: 0fr;
  grid-template-columns: 1fr;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.4s ease, grid-template-rows 0.4s ease;
}
.dsn-drop-in {
  min-width: calc(var(--dsn-u) * 26.4);
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: var(--dsn-b) solid var(--dsn-rule);
  background-color: var(--dsn-paper);
}
.dsn-drop-item { border-bottom: var(--dsn-b) solid var(--dsn-rule); }
.dsn-drop-item:last-child { border-bottom: 0; }

/* ---- CTA ----------------------------------------------------------------- */
.dsn-cta {
  position: relative;
  flex: none;
  width: calc(var(--dsn-u) * 20);
  --dsn-fill-color: var(--dsn-accent);
}
.dsn-cta .dsn-fill {
  flex-direction: row;
  color: var(--dsn-accent);
  padding: calc(var(--dsn-u) * 1.2) calc(var(--dsn-u) * 0.4) calc(var(--dsn-u) * 0.4) calc(var(--dsn-u) * 1.2);
}
.dsn-cta .dsn-fill:hover, .dsn-cta .dsn-fill:focus-visible { color: var(--dsn-paper); }
.dsn-arrow { position: relative; z-index: 3; align-self: flex-end; flex: none; width: calc(var(--dsn-u) * 2); overflow: hidden; }
.dsn-arrow svg { display: block; width: 100%; height: auto; }
.dsn-arrow span { display: block; transition: transform 0.48s cubic-bezier(0.625, 0.05, 0, 1); }
.dsn-arrow span + span { position: absolute; inset: 0; transform: translateX(-100%); }
.dsn-fill:hover .dsn-arrow span,
.dsn-fill:focus-visible .dsn-arrow span { transform: translateX(100%); }
.dsn-fill:hover .dsn-arrow span + span,
.dsn-fill:focus-visible .dsn-arrow span + span { transform: translateX(0); }

/* ---- burger -------------------------------------------------------------- */
.dsn-burger { display: none; }
.dsn-burger-ic { position: absolute; right: calc(var(--dsn-u) * 1.6); display: flex; flex-direction: column; gap: calc(var(--dsn-u) * 0.2); width: calc(var(--dsn-u) * 1.5); }
.dsn-burger-ic b { display: block; width: 100%; height: var(--dsn-b); background-color: var(--dsn-ink); transform-origin: 50%; transition: transform 0.4s ease; }

/* ---- desktop: hover opens the drop panel --------------------------------- */
@media (min-width: 992px) {
  .dsn-item-wrap:hover .dsn-drop,
  .dsn-item-wrap:focus-within .dsn-drop {
    grid-template-rows: 1fr;
    opacity: 1;
    pointer-events: auto;
  }
  .dsn-item-wrap:hover .dsn-tick-t,
  .dsn-item-wrap:focus-within .dsn-tick-t { transform: translate(0, 0); }
  .dsn-item-wrap:hover .dsn-tick-b,
  .dsn-item-wrap:focus-within .dsn-tick-b { transform: translate(calc(100% + var(--dsn-u) * 1.2), calc(100% + var(--dsn-u) * 1.2)); }
}

/* ---- mobile: the menu is a panel that clips open -------------------------- */
@media (max-width: 991px) {
  .dsn-root { --dsn-u: calc(1.1990408vw * var(--dsn-scale, 1)); }
  .dsn-logo { padding-left: calc(var(--dsn-u) * 2.4); }
  .dsn-nav { margin-left: calc(var(--dsn-u) * -0.8); position: relative; }
  .dsn-burger {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: calc(var(--dsn-u) * 1.2);
    border: 0;
    background: none;
    color: var(--dsn-dim);
    font: inherit;
    font-size: calc(var(--dsn-u) * 1.4);
    line-height: 1.4;
    font-weight: 500;
    text-transform: uppercase;
    cursor: pointer;
  }
  .dsn-burger.dsn-on .dsn-burger-ic b:first-child,
  .dsn-burger.dsn-on .dsn-burger-ic b:last-child { transform: scaleX(0); }
  .dsn-menu {
    position: absolute;
    top: 100%;
    left: 0;
    flex-direction: column;
    width: calc(100% + 1px);
    border-left: var(--dsn-b) solid var(--dsn-rule);
    border-right: var(--dsn-b) solid var(--dsn-rule);
    background-color: var(--dsn-paper);
    clip-path: inset(0 0 100%);
    pointer-events: none;
    transition: clip-path 0.4s ease;
  }
  .dsn-menu.dsn-on { clip-path: inset(0); pointer-events: auto; }
  .dsn-item-wrap { flex: 0 auto; }
  .dsn-item-wrap > .dsn-rule-l { display: none; }
  .dsn-fill { border-bottom: var(--dsn-b) solid var(--dsn-rule); }
  .dsn-tick { display: none; }
  .dsn-drop {
    position: static;
    opacity: 1;
    pointer-events: auto;
    grid-template-rows: 0fr;
    background-color: rgba(0, 0, 0, 0.04);
    transition: grid-template-rows 0.4s ease;
  }
  .dsn-open > .dsn-drop { grid-template-rows: 1fr; }
  .dsn-drop-in { min-width: auto; border: 0; background: none; }
  .dsn-cta { width: 100%; }
}

@media (max-width: 767px) {
  .dsn-root { --dsn-u: calc(2.5445293vw * var(--dsn-scale, 1)); }
  .dsn-logo { padding: var(--dsn-u) 0 var(--dsn-u) calc(var(--dsn-u) * 1.2); }
  .dsn-mark { width: calc(var(--dsn-u) * 2.8); }
  .dsn-word { padding-left: calc(var(--dsn-u) * 0.8); font-size: calc(var(--dsn-u) * 2); }
}

@media (prefers-reduced-motion: reduce) {
  .dsn-px i { transition-delay: 0s; transition-duration: 0.12s; }
  .dsn-bar, .dsn-word, .dsn-tick, .dsn-drop, .dsn-menu, .dsn-label span, .dsn-arrow span {
    transition-duration: 0.01ms;
  }
}
`

function Mark() {
  // A 3x3 pixel glyph, in the same currency as the hover dissolve.
  return (
    <svg viewBox="0 0 34 39" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="1" y="1" width="32" height="37" stroke="currentColor" strokeWidth="2" />
      <rect x="7" y="7" width="8" height="9" fill="currentColor" />
      <rect x="19" y="7" width="8" height="9" fill="currentColor" opacity="0.35" />
      <rect x="7" y="23" width="8" height="9" fill="currentColor" opacity="0.35" />
      <rect x="19" y="23" width="8" height="9" fill="currentColor" />
    </svg>
  )
}

function Tick({ variant }: { variant: "t" | "b" }) {
  return (
    <span className={"dsn-tick dsn-tick-" + variant} aria-hidden="true">
      <svg viewBox="0 0 7 7" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 6.5V0.5H0" stroke="currentColor" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

function Arrow() {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M11.875 14.375L16.25 9.93818L11.875 5.625M16.25 9.93818H2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

/** The dissolve overlay. Same grid for every cell, only the colour changes. */
function Pixels({ sweepMs }: { sweepMs: number }) {
  return (
    <span className="dsn-px" aria-hidden="true">
      {PX_ORDER.map((t, i) => (
        <i key={i} style={{ ["--dsn-d" as string]: Math.round(t * sweepMs) + "ms" } as React.CSSProperties} />
      ))}
    </span>
  )
}

/** Label printed twice: the pair rolls up together on hover. */
function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="dsn-label">
      <span>{children}</span>
      <span aria-hidden="true">{children}</span>
    </span>
  )
}

const DEFAULT_ITEMS: DitherSweepNavItem[] = [
  {
    label: "Product",
    children: [
      { label: "Overview", href: "#overview" },
      { label: "Integrations", href: "#integrations" },
    ],
  },
  { label: "Pricing", href: "#pricing" },
  {
    label: "Resources",
    children: [
      { label: "Insights", href: "#insights" },
      { label: "Changelog", href: "#changelog" },
      { label: "Docs", href: "#docs" },
    ],
  },
  { label: "About", href: "#about" },
]

export default function DitherSweepNavbar({
  brand = "Northmark",
  logo,
  logoHref = "#",
  items = DEFAULT_ITEMS,
  cta = { label: "Contact us", href: "#contact" },
  ink = "#282828",
  paper = "#f5f5ed",
  rule = "#b3b3af",
  accent = "#fa3600",
  scale = 1,
  durationMs = 500,
  sticky = true,
  className,
}: DitherSweepNavbarProps) {
  const [scrolled, setScrolled] = React.useState(false)
  const [hidden, setHidden] = React.useState(false)
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [openItem, setOpenItem] = React.useState<number | null>(null)

  React.useEffect(() => {
    if (!sticky) return
    let last = window.scrollY
    // Capture, so this also works when the page scrolls inside a container
    // rather than the window — scroll events do not bubble.
    const onScroll = (e?: Event) => {
      const el = e && (e.target as HTMLElement | null)
      const y = el && el !== (document as unknown as HTMLElement) ? el.scrollTop : window.scrollY
      setScrolled(y > 8)
      // Only duck away once clear of the top, and never while the panel is open.
      setHidden(y > 120 && y > last && !menuOpen)
      last = y
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true, capture: true })
    return () => window.removeEventListener("scroll", onScroll, { capture: true })
  }, [sticky, menuOpen])

  // Escape dismisses whichever disclosure is open, innermost first.
  React.useEffect(() => {
    if (openItem === null && !menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      if (openItem !== null) setOpenItem(null)
      else setMenuOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [openItem, menuOpen])

  const sweepMs = Math.max(0, durationMs - PX_CELL_MS)

  const rootStyle = {
    ["--dsn-scale" as string]: scale,
    ["--dsn-ink" as string]: ink,
    ["--dsn-paper" as string]: paper,
    ["--dsn-rule" as string]: rule,
    ["--dsn-accent" as string]: accent,
    ["--dsn-dim" as string]: "color-mix(in srgb, " + ink + " 72%, transparent)",
    ["--dsn-fill-color" as string]: ink,
    ["--dsn-cell" as string]: PX_CELL_MS + "ms",
  } as React.CSSProperties

  const rootClass = [
    "dsn-root",
    sticky ? "dsn-sticky" : "",
    scrolled ? "dsn-scrolled" : "",
    hidden ? "dsn-hidden" : "",
    className || "",
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <>
      <style>{DSN_CSS}</style>
      <header className={rootClass} style={rootStyle}>
        <div className="dsn-bar">
          <span className="dsn-rule dsn-rule-b" />
          <div className="dsn-grid">
            <div className="dsn-logo">
              <div className="dsn-logo-in">
                <a className="dsn-mark" href={logoHref} aria-label={brand}>
                  {logo ?? <Mark />}
                </a>
                <a className="dsn-word" href={logoHref} tabIndex={-1} aria-hidden="true">
                  {brand}
                </a>
              </div>
            </div>

            <div className="dsn-nav">
              <button
                type="button"
                className={"dsn-burger" + (menuOpen ? " dsn-on" : "")}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
              >
                <span className="dsn-rule dsn-rule-l" />
                Menu
                <span className="dsn-burger-ic" aria-hidden="true">
                  <b />
                  <b />
                  <b />
                </span>
              </button>

              <div className={"dsn-menu" + (menuOpen ? " dsn-on" : "")}>
                {items.map((item, i) => {
                  const hasKids = !!item.children?.length
                  const open = openItem === i
                  return (
                    <div key={item.label} className={"dsn-item-wrap" + (open ? " dsn-open" : "")}>
                      <span className="dsn-rule dsn-rule-l" />
                      {hasKids ? (
                        <button
                          type="button"
                          className="dsn-fill"
                          aria-expanded={open}
                          onClick={() => setOpenItem(open ? null : i)}
                        >
                          <Pixels sweepMs={sweepMs} />
                          <Label>{item.label}</Label>
                          <Tick variant="t" />
                          <Tick variant="b" />
                        </button>
                      ) : (
                        <a className="dsn-fill" href={item.href}>
                          <Pixels sweepMs={sweepMs} />
                          <Label>{item.label}</Label>
                        </a>
                      )}

                      {hasKids && (
                        <div className="dsn-drop">
                          <div className="dsn-drop-in">
                            {item.children!.map((kid) => (
                              <a key={kid.label} className="dsn-fill dsn-drop-item" href={kid.href}>
                                <Pixels sweepMs={sweepMs} />
                                <Label>{kid.label}</Label>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}

                {cta && (
                  <div className="dsn-cta">
                    <span className="dsn-rule dsn-rule-l" />
                    <a className="dsn-fill" href={cta.href}>
                      <Pixels sweepMs={sweepMs} />
                      <Label>{cta.label}</Label>
                      <span className="dsn-arrow" aria-hidden="true">
                        <span>
                          <Arrow />
                        </span>
                        <span>
                          <Arrow />
                        </span>
                      </span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  )
}
