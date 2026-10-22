"use client"

import * as React from "react"

/**
 * Frosted Glass Menu
 *
 * A quiet, membership-club style navigation: a frosted glass bar that unfolds
 * in place into a full index — muted column heads, monospace caps links, a
 * pill call-to-action, a ruled footer, and a little hand-drawn traveller who
 * hauls a suitcase along the footer rule. He strolls while the menu is open
 * and breaks into a run when the call-to-action is hovered.
 *
 * Self-contained: React is the only import. No CSS file, no images, no icon
 * package — the mark, the arrow and the traveller are inline SVG.
 */

export interface FrostedGlassMenuLink {
  label: string
  href?: string
  /** Opens in a new tab */
  external?: boolean
}

export interface FrostedGlassMenuColumn {
  /** Muted column head */
  title: string
  links: FrostedGlassMenuLink[]
}

export interface FrostedGlassMenuProps {
  /** Replaces the built-in mark. Sized by the component, so let it fill its box. */
  logo?: React.ReactNode
  /** Accessible name for the logo link */
  logoLabel?: string
  logoHref?: string
  columns?: FrostedGlassMenuColumn[]
  /** Pill call-to-action at the top right. `null` drops it. */
  cta?: { label: string; href: string } | null
  /** Left side of the footer rule. `null` drops the footer. */
  footer?: React.ReactNode | null
  /** The figure on the footer rule. `null` drops him; any node replaces him. */
  mascot?: React.ReactNode | null
  /** Controlled open state */
  open?: boolean
  /** Uncontrolled initial state */
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Text, rules and the mark */
  ink?: string
  /** Glass tint. Keep it translucent or the frost has nothing to blur. */
  glass?: string
  /** Column heads and the footer */
  muted?: string
  /** Hairline colour */
  rule?: string
  /** Backdrop blur, in px */
  blur?: number
  /** Widest the panel grows */
  maxWidth?: number | string
  /** Pin to the top of the viewport instead of sitting in flow */
  fixed?: boolean
  /** Close after a link is chosen (default true) */
  closeOnNavigate?: boolean
  className?: string
}

const DEFAULT_COLUMNS: FrostedGlassMenuColumn[] = [
  {
    title: "Meridian",
    links: [
      { label: "Dining", href: "#dining" },
      { label: "Travel", href: "#travel" },
      { label: "Card", href: "#card" },
      { label: "App", href: "#app" },
      { label: "Concierge", href: "#concierge" },
    ],
  },
  {
    title: "Benefits",
    links: [
      { label: "Member Benefits", href: "#benefits" },
      { label: "Lounge Access", href: "#lounges" },
    ],
  },
  {
    title: "Contact",
    links: [
      { label: "Email", href: "#email" },
      { label: "Twitter", href: "#twitter" },
      { label: "Instagram", href: "#instagram" },
    ],
  },
]

// #region glass
/**
 * The glass tint with its alpha dropped, for the pieces that must hide what is
 * behind them (the traveller's trousers, the suitcase). Anything that is not
 * an rgba() colour is already opaque enough and comes back unchanged.
 */
export function solidGlass(glass: string): string {
  const m = glass.match(/^\s*rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[,/]\s*[\d.]+%?\s*)?\)\s*$/i)
  return m ? "rgb(" + m[1] + ", " + m[2] + ", " + m[3] + ")" : glass
}

/**
 * The CTA's border: the hairline colour with its alpha raised so the pill
 * reads. Only an rgba() hairline has an alpha to raise.
 */
export function strongerRule(rule: string): string {
  if (!/^\s*rgba\(/i.test(rule)) return rule
  return rule.replace(/,\s*[\d.]+\s*\)\s*$/, ", 0.32)")
}
// #endregion

const FGM_CSS = `
.fgm-root {
  position: relative;
  z-index: 50;
  width: 100%;
  box-sizing: border-box;
  padding: 16px;
  font-family: "IBM Plex Mono", "Geist Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  -webkit-font-smoothing: antialiased;
  color: var(--fgm-ink);
  pointer-events: none;
}
.fgm-root.fgm-fixed { position: fixed; top: 0; left: 0; right: 0; }
/* The root keeps only the bar's height in flow; the panel unfolds over the page. */
.fgm-slot { position: relative; height: 64px; margin: 0 auto; max-width: var(--fgm-max); }

.fgm-card {
  position: absolute;
  top: 0; left: 0; right: 0;
  pointer-events: auto;
  container-type: inline-size;
  border-radius: 14px;
  background-color: var(--fgm-glass);
  -webkit-backdrop-filter: blur(var(--fgm-blur)) saturate(1.15);
  backdrop-filter: blur(var(--fgm-blur)) saturate(1.15);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.55),
    inset 0 0 0 1px rgba(255, 255, 255, 0.18),
    0 1px 2px rgba(20, 16, 12, 0.06),
    0 18px 50px -18px rgba(20, 16, 12, 0.28);
  overflow: hidden;
  transition: box-shadow 0.5s ease;
}
.fgm-open .fgm-card {
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.55),
    inset 0 0 0 1px rgba(255, 255, 255, 0.18),
    0 2px 4px rgba(20, 16, 12, 0.06),
    0 40px 90px -30px rgba(20, 16, 12, 0.45);
}
/* A faint film grain so the glass reads as frosted rather than as a flat tint. */
.fgm-card::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.5;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.95' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.09'/%3E%3C/svg%3E");
}

/* ---- head row ------------------------------------------------------------ */
.fgm-head {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 14px 0 20px;
}
.fgm-head::after {
  content: "";
  position: absolute;
  left: 0; right: 0; bottom: 0;
  height: 1px;
  background: var(--fgm-rule);
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.fgm-open .fgm-head::after { transform: scaleX(1); }

.fgm-logo {
  display: inline-flex;
  width: 36px;
  height: 36px;
  color: var(--fgm-ink);
  border-radius: 999px;
  outline-offset: 4px;
  transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.fgm-logo svg { width: 100%; height: 100%; display: block; max-width: none; }
.fgm-logo:hover { transform: rotate(90deg); }

.fgm-toggle {
  appearance: none;
  border: 0;
  background: transparent;
  color: var(--fgm-ink);
  font: inherit;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  height: 44px;
  padding: 0 10px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition: background-color 0.25s ease;
}
.fgm-toggle:hover { background-color: color-mix(in srgb, var(--fgm-ink) 7%, transparent); }
.fgm-toggle-word { position: relative; display: inline-block; height: 1.3em; overflow: hidden; line-height: 1.3; }
.fgm-toggle-word span { display: block; transition: transform 0.45s cubic-bezier(0.7, 0, 0.2, 1); }
.fgm-open .fgm-toggle-word span { transform: translateY(-100%); }
.fgm-icon { position: relative; width: 24px; height: 24px; flex: none; }
.fgm-icon i {
  position: absolute;
  left: 2px; right: 2px; top: 50%;
  height: 1.75px;
  margin-top: -0.875px;
  border-radius: 2px;
  background: currentColor;
  transition: transform 0.45s cubic-bezier(0.7, 0, 0.2, 1);
}
.fgm-icon i:nth-child(1) { transform: translateY(-4px); }
.fgm-icon i:nth-child(2) { transform: translateY(4px); }
.fgm-open .fgm-icon i:nth-child(1) { transform: rotate(45deg); }
.fgm-open .fgm-icon i:nth-child(2) { transform: rotate(-45deg); }

/* ---- body: unfolds with the 0fr -> 1fr grid trick, so no measured heights ---- */
.fgm-fold {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.fgm-open .fgm-fold { grid-template-rows: 1fr; }
/* Never taller than the screen: a long index scrolls inside the glass. */
.fgm-fold-inner {
  min-height: 0;
  max-height: calc(100svh - 96px);
  overflow: hidden auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
}
.fgm-closed .fgm-fold-inner { visibility: hidden; transition: visibility 0s linear 0.6s; }

.fgm-body {
  position: relative;
  display: grid;
  grid-template-columns: repeat(var(--fgm-cols), max-content) minmax(0, 1fr);
  column-gap: clamp(28px, 7cqi, 76px);
  padding: 40px 30px 0;
  min-height: 330px;
}
.fgm-col { display: flex; flex-direction: column; min-width: 0; }
.fgm-col-title {
  margin: 0 0 22px;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--fgm-muted);
}
.fgm-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }

.fgm-reveal {
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.fgm-open .fgm-reveal {
  opacity: 1;
  transform: none;
  transition: opacity 0.5s ease, transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
  transition-delay: calc(120ms + var(--i, 0) * 40ms);
}

.fgm-link {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 0;
  color: var(--fgm-ink);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  white-space: nowrap;
  outline: none;
  transition: opacity 0.3s ease, color 0.3s ease;
}
/* The label is set twice and rolled up a line on hover. */
.fgm-roll { position: relative; display: inline-block; height: 1.3em; line-height: 1.3; overflow: hidden; }
.fgm-roll span { display: block; transition: transform 0.45s cubic-bezier(0.7, 0, 0.2, 1); }
.fgm-roll span + span { position: absolute; left: 0; top: 100%; }
.fgm-link:hover .fgm-roll span,
.fgm-link:focus-visible .fgm-roll span { transform: translateY(-100%); }
.fgm-link::after {
  content: "";
  position: absolute;
  left: 0; right: 0; bottom: 6px;
  height: 1px;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: right center;
  transition: transform 0.45s cubic-bezier(0.7, 0, 0.2, 1);
}
.fgm-link:hover::after,
.fgm-link:focus-visible::after { transform: scaleX(1); transform-origin: left center; }
.fgm-dot {
  width: 5px; height: 5px;
  border-radius: 999px;
  background: currentColor;
  margin-left: -13px;
  opacity: 0;
  transform: scale(0);
  transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.2s ease, margin 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.fgm-link:hover .fgm-dot,
.fgm-link:focus-visible .fgm-dot { opacity: 1; transform: scale(1); margin-left: 0; }
/* Hovering one link quiets the rest of the index. */
.fgm-body:has(.fgm-link:hover) .fgm-link:not(:hover) { opacity: 0.38; }

/* ---- call-to-action ------------------------------------------------------- */
.fgm-aside { justify-self: end; display: flex; flex-direction: column; align-items: flex-end; }
.fgm-cta {
  position: relative;
  isolation: isolate;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  height: 46px;
  padding: 0 22px 0 24px;
  border-radius: 999px;
  border: 1.5px solid var(--fgm-cta-rule);
  color: var(--fgm-ink);
  background: rgba(255, 255, 255, 0.18);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  outline-offset: 3px;
  transition: color 0.45s cubic-bezier(0.7, 0, 0.2, 1), border-color 0.45s ease;
}
.fgm-cta::before {
  content: "";
  position: absolute;
  inset: -2px;
  z-index: -1;
  border-radius: inherit;
  background: var(--fgm-ink);
  clip-path: circle(0% at 12% 50%);
  transition: clip-path 0.55s cubic-bezier(0.7, 0, 0.2, 1);
}
.fgm-cta:hover, .fgm-cta:focus-visible { color: var(--fgm-glass-solid); border-color: var(--fgm-ink); }
.fgm-cta:hover::before, .fgm-cta:focus-visible::before { clip-path: circle(150% at 12% 50%); }
.fgm-arrow { width: 16px; height: 16px; flex: none; overflow: hidden; position: relative; }
.fgm-arrow svg {
  position: absolute; inset: 0;
  width: 16px; height: 16px; max-width: none;
  transition: transform 0.45s cubic-bezier(0.7, 0, 0.2, 1);
}
.fgm-arrow svg + svg { transform: translateX(-140%); }
.fgm-cta:hover .fgm-arrow svg, .fgm-cta:focus-visible .fgm-arrow svg { transform: translateX(140%); }
.fgm-cta:hover .fgm-arrow svg + svg, .fgm-cta:focus-visible .fgm-arrow svg + svg { transform: none; }

/* ---- the traveller --------------------------------------------------------- */
.fgm-mascot {
  position: absolute;
  right: 26px;
  bottom: -1px;
  width: 156px;
  height: 143px;
  color: var(--fgm-ink);
  pointer-events: none;
}
.fgm-mascot > svg { width: 156px; height: 143px; max-width: none; display: block; overflow: visible; }
.fgm-open .fgm-mascot.fgm-reveal { transform: none; }
.fgm-closed .fgm-mascot.fgm-reveal { transform: translateX(26px); }
.fgm-trav * { transform-box: view-box; }
.fgm-trav-body { transform-origin: 48px 60px; }
.fgm-trav-leg-f { transform-origin: 46px 60px; }
.fgm-trav-leg-b { transform-origin: 48px 60px; }
.fgm-trav-arm { transform-origin: 34px 34px; }
.fgm-trav-case { transform-origin: 86px 100px; }
.fgm-trav-wheel { transform-origin: 86px 99px; }
.fgm-open .fgm-trav-body { animation: fgm-bob var(--fgm-step) ease-in-out infinite; }
.fgm-open .fgm-trav-leg-f { animation: fgm-swing var(--fgm-stride) ease-in-out infinite; }
.fgm-open .fgm-trav-leg-b { animation: fgm-swing var(--fgm-stride) ease-in-out infinite reverse; }
.fgm-open .fgm-trav-arm { animation: fgm-arm var(--fgm-stride) ease-in-out infinite; }
.fgm-open .fgm-trav-case { animation: fgm-rattle var(--fgm-step) ease-in-out infinite; }
.fgm-open .fgm-trav-wheel { animation: fgm-spin var(--fgm-step) linear infinite; }
.fgm-root { --fgm-stride: 1.4s; --fgm-step: 0.7s; }
.fgm-root.fgm-rush { --fgm-stride: 0.5s; --fgm-step: 0.25s; }
.fgm-rush .fgm-trav { transform: rotate(-5deg) translateX(-6px); }
.fgm-trav { transform-origin: 50% 100%; transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1); }
.fgm-dust { opacity: 0; transition: opacity 0.3s ease; }
.fgm-rush .fgm-dust { opacity: 1; }
.fgm-rush .fgm-dust path { animation: fgm-puff 0.5s linear infinite; }
.fgm-rush .fgm-dust path + path { animation-delay: 0.25s; }

@keyframes fgm-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-1.6px); } }
@keyframes fgm-swing { 0%, 100% { transform: rotate(-9deg); } 50% { transform: rotate(9deg); } }
@keyframes fgm-arm { 0%, 100% { transform: rotate(10deg); } 50% { transform: rotate(-14deg); } }
@keyframes fgm-rattle { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-2.5deg); } }
@keyframes fgm-spin { to { transform: rotate(-360deg); } }
@keyframes fgm-puff { from { transform: translateX(0); opacity: 1; } to { transform: translateX(10px); opacity: 0; } }

/* ---- footer ---------------------------------------------------------------- */
.fgm-foot {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 52px;
  padding: 0 30px;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--fgm-muted);
}
.fgm-foot::before {
  content: "";
  position: absolute;
  left: 0; right: 0; top: 0;
  height: 1px;
  background: var(--fgm-rule);
}
.fgm-nofoot { height: 26px; }

/* ---- narrow panels ---------------------------------------------------------- */
/* Too tight for the pill beside the index: it moves to a row of its own. */
@container (max-width: 820px) {
  .fgm-body { row-gap: 30px; }
  .fgm-aside { grid-column: 1 / -1; grid-row: 1; justify-self: start; align-items: flex-start; }
}
@container (max-width: 640px) {
  .fgm-body { grid-template-columns: repeat(2, minmax(0, 1fr)); row-gap: 32px; padding: 28px 22px 156px; min-height: 0; }
  .fgm-aside { grid-column: 1 / -1; grid-row: 1; justify-self: stretch; align-items: stretch; }
  .fgm-cta { justify-content: space-between; }
  .fgm-foot { padding: 0 22px; }
}
@container (max-width: 330px) {
  .fgm-body { grid-template-columns: minmax(0, 1fr); }
  .fgm-mascot { right: 14px; }
}

@media (prefers-reduced-motion: reduce) {
  .fgm-root *, .fgm-root *::before, .fgm-root *::after {
    animation: none !important;
    transition-duration: 0.01ms !important;
    transition-delay: 0s !important;
  }
}
`

function Mark() {
  // Four rounded quadrants of a disc, parted by a cross-shaped gap.
  return (
    <svg viewBox="0 0 36 36" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.4 2.1v14.3H2.1A16 16 0 0 1 16.4 2.1Zm3.2 0a16 16 0 0 1 14.3 14.3H19.6V2.1ZM2.1 19.6h14.3v14.3A16 16 0 0 1 2.1 19.6Zm17.5 0h14.3a16 16 0 0 1-14.3 14.3V19.6Z"
      />
    </svg>
  )
}

function Arrow() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" />
    </svg>
  )
}

/** Line-art traveller with a bucket hat, a crossbody bag and a rolling case. */
function Traveller() {
  const outline = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const
  // Light trousers: a fat ink stroke with a paper stroke laid inside it.
  const leg = (d: string) => (
    <>
      <path d={d} {...outline} strokeWidth={9} />
      <path d={d} {...outline} stroke="var(--fgm-glass-solid)" strokeWidth={6} />
    </>
  )
  return (
    <svg viewBox="0 0 120 110" aria-hidden="true">
      <g className="fgm-trav">
        <g className="fgm-dust" {...outline} strokeWidth={1.4}>
          <path d="M4 96h7" />
          <path d="M8 90h5" />
        </g>
        {/* suitcase, pivoting on its wheel */}
        <g className="fgm-trav-case">
          <g transform="rotate(-22 86 100)">
            <path d="M80 64V50h8v14" {...outline} strokeWidth={1.8} />
            <rect x={74} y={64} width={20} height={32} rx={3.5} fill="var(--fgm-glass-solid)" stroke="currentColor" strokeWidth={1.8} />
            <path d="M80 69v22M88 69v22" {...outline} strokeWidth={1.4} />
          </g>
        </g>
        <g className="fgm-trav-wheel">
          <circle cx={86} cy={99} r={3} fill="var(--fgm-glass-solid)" stroke="currentColor" strokeWidth={1.6} />
          <path d="M86 97v4" {...outline} strokeWidth={1.2} />
        </g>
        <g className="fgm-trav-body">
          {/* back leg, kicked up behind */}
          <g className="fgm-trav-leg-b">
            {leg("M49 60 59 73 66 87")}
            <path d="M63 86.5c2.6-1.6 6.2-.9 7.4 1.4.9 1.8-.7 3.2-3 3.2h-5.2c-1.2 0-1.5-3.4.8-4.6Z" fill="currentColor" />
          </g>
          {/* front leg, reaching */}
          <g className="fgm-trav-leg-f">
            {leg("M45 60 37 77 31 95")}
            <path d="M33.5 93.4c-2.2-.9-6.6-.6-9.2 1.4-1.4 1.1-1 3.2 1 3.2h8.6c1.4 0 1.8-3.8-.4-4.6Z" fill="currentColor" />
          </g>
          {/* back arm, pulling the case handle */}
          <path d="M44 35 55 46 64.5 53.5" {...outline} strokeWidth={4.6} />
          <circle cx={65.2} cy={54} r={2.6} fill="currentColor" />
          {/* face and ear, tucked under the hat brim and into the collar */}
          <ellipse cx={37.6} cy={26.4} rx={5.8} ry={6.6} fill="var(--fgm-glass-solid)" stroke="currentColor" strokeWidth={1.6} />
          <path d="M42.6 25.2c1.8-.6 2.8.8 2.2 2.4-.4 1-1.4 1.4-2.4 1.2" fill="var(--fgm-glass-solid)" stroke="currentColor" strokeWidth={1.3} strokeLinejoin="round" />
          {/* jacket */}
          <path d="M31 33.5c4.6-3.6 11.4-4.1 16-1.1l4.6 26.2c-4.4 2.6-10 2.9-14.2 1.2L31 33.5Z" fill="currentColor" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" />
          {/* strap and bag */}
          <path d="M46.6 33.8 32 53.5" {...outline} stroke="var(--fgm-glass-solid)" strokeWidth={1.6} />
          <rect x={23} y={49} width={13} height={10} rx={2} fill="var(--fgm-glass-solid)" stroke="currentColor" strokeWidth={1.7} transform="rotate(-14 29.5 54)" />
          {/* front arm, swinging */}
          <g className="fgm-trav-arm">
            <path d="M35 35 25.5 43.5 17 40" {...outline} strokeWidth={4.6} />
            <circle cx={16} cy={39.6} r={2.5} fill="currentColor" />
          </g>
          {/* bucket hat */}
          <path d="M31.2 14.6c.4-5.6 4.2-8.6 8.6-8.4 4.6.2 7.4 3.8 7.2 9.2" fill="var(--fgm-glass-solid)" stroke="currentColor" strokeWidth={1.7} strokeLinejoin="round" />
          <path d="M27 21.4c2.2-5.6 7.6-7 13.4-6.8 5.6.2 9.6 2 10.6 6.2.4 1.4-.8 2.4-2.6 1.8-6-2-12.4-2.2-18.8-.4-1.8.6-3.2.4-2.6-.8Z" fill="var(--fgm-glass-solid)" stroke="currentColor" strokeWidth={1.7} strokeLinejoin="round" />
        </g>
      </g>
    </svg>
  )
}

export default function FrostedGlassMenu({
  logo,
  logoLabel = "Home",
  logoHref = "#",
  columns = DEFAULT_COLUMNS,
  cta = { label: "Become a Founding Member", href: "#join" },
  footer = "2026 © Meridian Exploration, Inc.",
  mascot,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  ink = "#141210",
  glass = "rgba(238, 235, 231, 0.74)",
  muted = "rgba(20, 18, 16, 0.5)",
  rule = "rgba(20, 18, 16, 0.14)",
  blur = 28,
  maxWidth = 880,
  fixed = false,
  closeOnNavigate = true,
  className,
}: FrostedGlassMenuProps) {
  const [openState, setOpenState] = React.useState(defaultOpen)
  const open = openProp ?? openState
  const [rush, setRush] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const toggleRef = React.useRef<HTMLButtonElement>(null)
  const foldRef = React.useRef<HTMLDivElement>(null)
  const panelId = React.useId()

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (openProp === undefined) setOpenState(next)
      onOpenChange?.(next)
    },
    [openProp, onOpenChange],
  )

  // Escape closes and hands focus back to the toggle; a press outside closes.
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      setOpen(false)
      toggleRef.current?.focus()
    }
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.querySelector(".fgm-card")?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    document.addEventListener("pointerdown", onDown)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("pointerdown", onDown)
    }
  }, [open, setOpen])

  // A folded panel must not be reachable by Tab. Set as an attribute: React 18
  // does not know the inert prop.
  React.useEffect(() => {
    if (!open) setRush(false)
    foldRef.current?.toggleAttribute("inert", !open)
  }, [open])

  const glassSolid = React.useMemo(() => solidGlass(glass), [glass])

  const vars = {
    "--fgm-ink": ink,
    "--fgm-glass": glass,
    "--fgm-glass-solid": glassSolid,
    "--fgm-muted": muted,
    "--fgm-rule": rule,
    "--fgm-cta-rule": strongerRule(rule),
    "--fgm-blur": blur + "px",
    "--fgm-max": typeof maxWidth === "number" ? maxWidth + "px" : maxWidth,
    "--fgm-cols": columns.length,
  } as React.CSSProperties

  let i = 0
  const onNavigate = () => {
    if (closeOnNavigate) setOpen(false)
  }

  return (
    <div
      ref={rootRef}
      className={
        "fgm-root " +
        (open ? "fgm-open" : "fgm-closed") +
        (rush ? " fgm-rush" : "") +
        (fixed ? " fgm-fixed" : "") +
        (className ? " " + className : "")
      }
      style={vars}
    >
      <style>{FGM_CSS}</style>
      <div className="fgm-slot">
        <nav className="fgm-card" aria-label="Main">
          <div className="fgm-head">
            <a className="fgm-logo" href={logoHref} aria-label={logoLabel}>
              {logo ?? <Mark />}
            </a>
            <button
              ref={toggleRef}
              type="button"
              className="fgm-toggle"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpen(!open)}
            >
              <span className="fgm-toggle-word" aria-hidden="true">
                <span>Menu</span>
                <span>Close</span>
              </span>
              <span className="fgm-icon" aria-hidden="true">
                <i />
                <i />
              </span>
              <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
                {open ? "Close menu" : "Open menu"}
              </span>
            </button>
          </div>

          <div className="fgm-fold">
            <div className="fgm-fold-inner" id={panelId} ref={foldRef}>
              <div className="fgm-body">
                {columns.map((col) => (
                  <div className="fgm-col" key={col.title}>
                    <h2 className="fgm-col-title fgm-reveal" style={{ "--i": i++ } as React.CSSProperties}>
                      {col.title}
                    </h2>
                    <ul className="fgm-list">
                      {col.links.map((link) => (
                        <li key={link.label} className="fgm-reveal" style={{ "--i": i++ } as React.CSSProperties}>
                          <a
                            className="fgm-link"
                            href={link.href ?? "#"}
                            onClick={onNavigate}
                            {...(link.external ? { target: "_blank", rel: "noreferrer" } : null)}
                          >
                            <span className="fgm-dot" aria-hidden="true" />
                            <span className="fgm-roll">
                              <span>{link.label}</span>
                              <span aria-hidden="true">{link.label}</span>
                            </span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

                <div className="fgm-aside">
                  {cta && (
                    <a
                      className="fgm-cta fgm-reveal"
                      style={{ "--i": 2 } as React.CSSProperties}
                      href={cta.href}
                      onClick={onNavigate}
                      onPointerEnter={() => setRush(true)}
                      onPointerLeave={() => setRush(false)}
                      onFocus={() => setRush(true)}
                      onBlur={() => setRush(false)}
                    >
                      <span>{cta.label}</span>
                      <span className="fgm-arrow" aria-hidden="true">
                        <Arrow />
                        <Arrow />
                      </span>
                    </a>
                  )}
                </div>

                {mascot !== null && (
                  <div className="fgm-mascot fgm-reveal" style={{ "--i": i + 2 } as React.CSSProperties}>
                    {mascot ?? <Traveller />}
                  </div>
                )}
              </div>

              {footer !== null ? (
                <div className="fgm-foot fgm-reveal" style={{ "--i": i } as React.CSSProperties}>
                  {footer}
                </div>
              ) : (
                <div className="fgm-nofoot" />
              )}
            </div>
          </div>
        </nav>
      </div>
    </div>
  )
}
