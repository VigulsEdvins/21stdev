"use client"

// Design Process Template — a case-study page that tells how a product was
// made, phase by phase. A small eyebrow, a large indented headline with a round
// accent badge set in the middle of the sentence, a short intro beside the
// team's role chips, then one ruled row per phase: its share of the time in
// accent, a big title, the activities as pill chips, and a description in the
// right column.
//
// It's interactive throughout. The headline rises in word by word, and its
// badge is a link: the envelope opens under the pointer. Role chips filter the
// phases: pick "Director" and the phases they weren't part of fade back.
// Activity chips cross-reference: hover "Research" and every phase that also
// did research lights up its chip, and a click pins it. The allocation bar
// shows how the time was split. Hover a segment to light its phase, or click
// it to scroll there. Each percentage counts up when its row scrolls into view.
// Escape clears everything.
//
// Every mark is drawn in this file. Nothing loads at runtime.
import * as React from "react"

/* ------------------------------------------------------------------ types */

export type ProcessGlyph = "mail" | "search" | "target" | "bulb" | "layers" | "check" | "pen" | "spark"

export type ProcessPhase = {
  name: string
  /** Share of the whole project, 0–100. The bar normalises if they don't sum to 100. */
  percent: number
  tags: string[]
  description: string
  /** Roles from `roles` who worked on this phase. Leave it out to count everyone. */
  roles?: string[]
  /** Pops in beside the percentage on hover. */
  glyph?: ProcessGlyph
}

export type DesignProcessTemplateProps = {
  eyebrow?: string
  /** Put `{icon}` where the round badge sits in the sentence. */
  headline?: string
  /** The glyph inside the headline badge. */
  icon?: ProcessGlyph
  /** Where the badge links to. Empty makes it decorative. */
  iconHref?: string
  /** Accessible name of the badge link. */
  iconLabel?: string
  intro?: string
  roles?: string[]
  phases?: ProcessPhase[]
  /** The bar between the intro and the phases. */
  showAllocation?: boolean
  allocationLabel?: string
  /** Badge, percentages and highlights. */
  accent?: string
  fonts?: { display?: string; body?: string }
  /** Called with the role filter, or `null` when it clears. */
  onRoleChange?: (role: string | null) => void
  /** Called with the pinned activity, or `null` when it clears. */
  onTagSelect?: (tag: string | null) => void
  maxWidth?: string
  height?: string
  className?: string
}

/* ------------------------------------------------------------------ logic */

// #region logic
type HeadlinePart = { kind: "word"; value: string } | { kind: "icon" }

function parseHeadline(text: string): HeadlinePart[] {
  const out: HeadlinePart[] = []
  for (const tok of text.split(/(\{icon\})|\s+/)) {
    if (!tok) continue
    out.push(tok === "{icon}" ? { kind: "icon" } : { kind: "word", value: tok })
  }
  return out
}

function clampPercent(v: number): number {
  return Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 0
}

function allocation(percents: number[]): { start: number; width: number }[] {
  const vals = percents.map(clampPercent)
  const total = vals.reduce((a, b) => a + b, 0)
  let at = 0
  return vals.map((v) => {
    const width = total > 0 ? (v / total) * 100 : 100 / Math.max(1, vals.length)
    const seg = { start: at, width }
    at += width
    return seg
  })
}

function tagKey(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, " ")
}

function tagCounts(lists: string[][]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const list of lists) {
    const seen = new Set(list.map(tagKey))
    for (const k of seen) out[k] = (out[k] ?? 0) + 1
  }
  return out
}

function phaseHasRole(phaseRoles: string[] | undefined, role: string | null): boolean {
  if (!role || !phaseRoles) return true
  const k = tagKey(role)
  return phaseRoles.some((r) => tagKey(r) === k)
}

function easeOutCubic(t: number): number {
  const c = Math.min(1, Math.max(0, t))
  return 1 - Math.pow(1 - c, 3)
}

function countValue(target: number, t: number): number {
  return Math.round(target * easeOutCubic(t))
}

function statusLine(role: string | null, tag: string | null, roleHits: number, tagHits: number, total: number): string {
  const parts: string[] = []
  if (role) parts.push(roleHits + " of " + total + " phases with " + role)
  if (tag) parts.push(tag + " in " + tagHits + (tagHits === 1 ? " phase" : " phases"))
  return parts.join(" · ")
}
// #endregion logic

/* ------------------------------------------------------------------ defaults */

const D_HEADLINE =
  "As our team developed the app, we went through a variety of phases {icon} from the research phase to the final design."
const D_INTRO = "We paid special attention to each stage, striving to create an innovative and satisfying app."
const D_ROLES = ["Director", "Project manager", "UIX designer", "Product designer"]
const D_PHASES: ProcessPhase[] = [
  {
    name: "Discovery",
    percent: 15,
    tags: ["Competitor analysis", "Hypotheses", "Research"],
    description:
      "We conducted an in-depth analysis of competitors by studying their products and identifying key features, advantages and disadvantages",
    roles: ["Director", "Project manager", "Product designer"],
    glyph: "search",
  },
  {
    name: "Define",
    percent: 30,
    tags: ["App map", "User flow", "UX design", "Wireframe", "Testing"],
    description:
      "At this stage, our team worked systematically to determine the best ways to achieve the end goal within the application development",
    roles: ["Project manager", "UIX designer", "Product designer"],
    glyph: "target",
  },
  {
    name: "Ideate",
    percent: 15,
    tags: ["Moodboard", "Initial style", "Research"],
    description:
      "We conceptualized the visualization and design of the app. We created interface sketches, screen prototypes and general style of the application",
    roles: ["UIX designer", "Product designer"],
    glyph: "bulb",
  },
  {
    name: "Solution",
    percent: 40,
    tags: ["Design system", "Branding", "UI design", "UX design", "Testing"],
    description:
      "We prepared the app for release, making sure it not only met all technical requirements, but also provided users with an aesthetic and satisfying visual experience in line with the brand",
    roles: ["Director", "UIX designer", "Product designer"],
    glyph: "check",
  },
]

const SANS =
  '"Manrope", "Plus Jakarta Sans", "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

/* ------------------------------------------------------------------ styles */

const DP_CSS = `
.dp-root{--dp-bg:var(--color-background,#fff);--dp-fg:var(--color-foreground,#111);--dp-muted:var(--color-muted-foreground,#71717a);--dp-line:var(--color-border,#e7e7e7);--dp-ink:color-mix(in oklab,var(--dp-accent) 80%,var(--dp-fg));--dp-chip:color-mix(in oklab,var(--dp-fg) 42%,transparent);--dp-soft:color-mix(in oklab,var(--dp-accent) 9%,transparent);position:relative;width:100%;background:var(--dp-bg);color:var(--dp-fg);font-family:var(--dp-body);container-type:inline-size;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
.dp-root :where(h2,h3,p,ol,li){margin:0;padding:0}
.dp-root :where(ol){list-style:none}
.dp-root :where(button){font:inherit;color:inherit;background:none;border:0;margin:0;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent}
.dp-root :where(svg){display:block;max-width:none;flex:none}
.dp-root :where(a){color:inherit;text-decoration:none}
.dp-root :where(button,a):focus-visible{outline:2px solid var(--dp-accent);outline-offset:3px}
.dp-page{max-width:var(--dp-max);margin:0 auto;padding:clamp(28px,6cqi,64px) clamp(18px,5.6cqi,60px) clamp(56px,9cqi,112px)}
.dp-eyebrow{font-size:14px;letter-spacing:.01em;color:var(--dp-muted);display:flex;align-items:center;gap:10px}
.dp-eyebrow i{width:6px;height:6px;border-radius:50%;background:var(--dp-accent);display:inline-block}

.dp-head{font-family:var(--dp-display);font-weight:500;font-size:clamp(30px,5.3cqi,60px);line-height:1.1;letter-spacing:-.022em;text-indent:1.72em;max-width:15.2em;margin-top:clamp(56px,9cqi,104px);color:var(--dp-fg);text-wrap:pretty}
.dp-w{display:inline-block;text-indent:0;overflow:hidden;vertical-align:top;padding-bottom:.09em;margin-bottom:-.09em}
.dp-w>span{display:inline-block;transition:transform .9s cubic-bezier(.2,.75,.15,1),opacity .9s ease;transition-delay:calc(var(--i) * 26ms)}
.dp-root[data-anim="on"] .dp-head:not([data-seen]) .dp-w>span{transform:translateY(105%);opacity:0}
.dp-badge{position:relative;display:inline-grid;place-items:center;text-indent:0;width:.86em;height:.86em;border-radius:50%;background:var(--dp-accent);color:#fff;vertical-align:-.1em;margin:0 .06em;transition:transform .5s cubic-bezier(.3,1.6,.5,1),box-shadow .3s ease,opacity .6s ease;transition-delay:0s,0s,calc(var(--i) * 26ms)}
.dp-root[data-anim="on"] .dp-head:not([data-seen]) .dp-badge{transform:scale(0);opacity:0}
.dp-badge svg{width:.46em;height:.46em;overflow:visible}
.dp-badge::after{content:"";position:absolute;inset:0;border-radius:50%;border:2px solid var(--dp-accent);opacity:0;pointer-events:none}
.dp-head[data-seen] .dp-badge::after{animation:dp-ping 3.2s cubic-bezier(.2,.6,.3,1) 1.4s infinite}
a.dp-badge:hover,a.dp-badge:focus-visible{transform:scale(1.12) rotate(-8deg);box-shadow:0 .12em .4em color-mix(in oklab,var(--dp-accent) 45%,transparent)}
.dp-flap{transform-box:fill-box;transform-origin:50% 0;transition:transform .45s cubic-bezier(.3,1.4,.5,1)}
.dp-letter{transform-box:fill-box;transform:translateY(40%);opacity:0;transition:transform .45s cubic-bezier(.3,1.4,.5,1) .05s,opacity .2s ease .05s}
a.dp-badge:hover .dp-flap,a.dp-badge:focus-visible .dp-flap{transform:scaleY(-1)}
a.dp-badge:hover .dp-letter,a.dp-badge:focus-visible .dp-letter{transform:translateY(-30%);opacity:1}
.dp-tip{position:absolute;left:50%;bottom:calc(100% + 10px);transform:translate(-50%,4px);font-family:var(--dp-body);font-size:12px;font-weight:500;letter-spacing:0;line-height:1;white-space:nowrap;padding:7px 10px;border-radius:999px;background:var(--dp-fg);color:var(--dp-bg);opacity:0;pointer-events:none;transition:opacity .2s ease,transform .2s ease}
a.dp-badge:hover .dp-tip,a.dp-badge:focus-visible .dp-tip{opacity:1;transform:translate(-50%,0) rotate(8deg)}

.dp-intro{display:grid;grid-template-columns:minmax(0,1.62fr) minmax(0,1fr);gap:28px 32px;margin-top:clamp(64px,11cqi,128px);align-items:start}
.dp-lede{font-size:15px;line-height:1.36;max-width:15.5em;color:var(--dp-fg)}
.dp-roles{display:flex;flex-direction:column;gap:12px}
.dp-chips{display:flex;flex-wrap:wrap;gap:6px 6px}
.dp-chip{position:relative;display:inline-flex;align-items:center;gap:6px;height:38px;padding:0 14px;border-radius:999px;border:1px solid var(--dp-chip);font-size:13px;line-height:1;white-space:nowrap;color:var(--dp-fg);background:transparent;transition:background-color .25s ease,color .25s ease,border-color .25s ease,transform .25s cubic-bezier(.3,1.5,.5,1)}
.dp-chip:hover{border-color:var(--dp-fg)}
.dp-chip:active{transform:scale(.96)}
.dp-chip[aria-pressed="true"]{background:var(--dp-fg);border-color:var(--dp-fg);color:var(--dp-bg)}
.dp-chip[data-match]{border-color:var(--dp-accent);color:var(--dp-ink);background:var(--dp-soft)}
.dp-chip[data-match][aria-pressed="true"]{background:var(--dp-accent);border-color:var(--dp-accent);color:#fff}
.dp-chip sup{position:absolute;top:-7px;right:-5px;display:grid;place-items:center;min-width:18px;height:18px;padding:0 4px;border-radius:999px;background:var(--dp-accent);color:#fff;font-size:9.5px;font-weight:600;line-height:1;font-variant-numeric:tabular-nums;opacity:0;transform:scale(.4);transition:opacity .2s ease,transform .3s cubic-bezier(.3,1.6,.5,1);pointer-events:none}
.dp-chip:hover sup,.dp-chip:focus-visible sup,.dp-chip[data-match] sup{opacity:1;transform:none}
.dp-status{min-height:18px;font-size:12px;color:var(--dp-muted);display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.dp-clear{font-size:12px;color:var(--dp-ink);text-decoration:underline;text-underline-offset:3px}

.dp-alloc{margin-top:clamp(64px,10cqi,120px)}
.dp-alloc-top{display:flex;justify-content:space-between;align-items:baseline;gap:16px;font-size:12px;color:var(--dp-muted);margin-bottom:14px}
.dp-alloc-top b{font-weight:500;color:var(--dp-fg);font-variant-numeric:tabular-nums}
.dp-bar{display:flex;gap:4px;width:100%}
.dp-seg{position:relative;min-width:0;text-align:left;display:flex;flex-direction:column;gap:10px;padding-bottom:4px;transition:flex-basis 1.1s cubic-bezier(.2,.75,.15,1),opacity .3s ease;transition-delay:calc(var(--i) * 90ms),0s}
.dp-root[data-anim="on"] .dp-alloc:not([data-seen]) .dp-seg{flex-basis:0 !important}
.dp-seg>i{display:block;height:6px;border-radius:999px;background:color-mix(in oklab,var(--dp-fg) 14%,transparent);transition:background-color .3s ease,transform .3s ease;transform-origin:50% 50%}
.dp-seg:hover>i,.dp-seg[data-active]>i{background:var(--dp-accent);transform:scaleY(1.5)}
.dp-seg>span{display:flex;gap:6px;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--dp-muted);transition:color .3s ease}
.dp-seg>span b{font-weight:500;color:var(--dp-ink);font-variant-numeric:tabular-nums}
.dp-seg:hover>span,.dp-seg[data-active]>span{color:var(--dp-fg)}
.dp-seg[data-dim]{opacity:.3}

.dp-phases{margin-top:clamp(56px,9cqi,104px)}
.dp-phase{position:relative;padding:clamp(28px,4.2cqi,44px) 0 clamp(36px,5.4cqi,58px);scroll-margin-top:24px;transition:opacity .45s ease,transform .9s cubic-bezier(.2,.75,.15,1),filter .45s ease}
.dp-phase+.dp-phase{border-top:1px solid var(--dp-line)}
.dp-phase+.dp-phase::before{content:"";position:absolute;left:0;right:0;top:-1px;height:1px;background:var(--dp-accent);transform:scaleX(0);transform-origin:0 50%;transition:transform .7s cubic-bezier(.2,.75,.15,1)}
.dp-phase[data-active]::before{transform:scaleX(1)}
.dp-root[data-anim="on"] .dp-phase:not([data-seen]){opacity:0;transform:translateY(28px)}
.dp-phase[data-dim]{opacity:.26;filter:saturate(0)}
.dp-phase[data-flash] .dp-title{color:var(--dp-ink)}
.dp-pct{display:flex;align-items:center;gap:10px;height:22px;font-size:14px;font-weight:500;color:var(--dp-ink);font-variant-numeric:tabular-nums}
.dp-glyph{display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:var(--dp-accent);color:#fff;transform:scale(0) rotate(-40deg);transition:transform .45s cubic-bezier(.3,1.6,.5,1)}
.dp-glyph svg{width:12px;height:12px}
.dp-phase[data-active] .dp-glyph{transform:none}
.dp-title{font-family:var(--dp-display);font-weight:500;font-size:clamp(36px,5.2cqi,58px);line-height:1.05;letter-spacing:-.025em;margin:clamp(14px,2cqi,22px) 0 clamp(24px,3.6cqi,40px);transition:color .4s ease,transform .5s cubic-bezier(.2,.75,.15,1)}
.dp-phase[data-active] .dp-title{transform:translateX(.12em)}
.dp-row{display:grid;grid-template-columns:minmax(0,1.62fr) minmax(0,1fr);gap:22px 32px;align-items:start}
.dp-desc{font-size:15px;line-height:1.3;max-width:23em;padding-top:2px}

@container (max-width:720px){
.dp-intro,.dp-row{grid-template-columns:minmax(0,1fr)}
.dp-head{text-indent:1.1em}
.dp-chip{height:34px;padding:0 12px;font-size:12.5px}
.dp-seg>span{font-size:11px}
}
@container (max-width:460px){.dp-seg>span em{display:none}}
@keyframes dp-ping{0%{transform:scale(1);opacity:.55}70%,100%{transform:scale(1.9);opacity:0}}
@media (prefers-reduced-motion:reduce){.dp-root :where(*){transition-duration:.01ms !important;transition-delay:0s !important}.dp-head[data-seen] .dp-badge::after{animation:none}.dp-phase[data-active] .dp-title{transform:none}}
`

/* ------------------------------------------------------------------ hooks */

function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false)
  React.useEffect(() => {
    if (typeof matchMedia !== "function") return
    const mq = matchMedia("(prefers-reduced-motion: reduce)")
    const on = () => setReduced(mq.matches)
    on()
    mq.addEventListener?.("change", on)
    return () => mq.removeEventListener?.("change", on)
  }, [])
  return reduced
}

function useInView(ref: React.RefObject<Element | null>, threshold = 0.25): boolean {
  const [seen, setSeen] = React.useState(false)
  React.useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    if (typeof IntersectionObserver !== "function") {
      setSeen(true)
      return
    }
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && setSeen(true), { threshold })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, seen, threshold])
  return seen
}

// Counts 0 → target once `go` turns true. Reduced motion jumps straight there.
function useCountUp(target: number, go: boolean, reduced: boolean, ms = 1100): number {
  const [value, setValue] = React.useState(0)
  React.useEffect(() => {
    if (!go) return
    if (reduced || typeof requestAnimationFrame !== "function") {
      setValue(target)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const t = (now - t0) / ms
      setValue(countValue(target, t))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, go, reduced, ms])
  return value
}

/* ------------------------------------------------------------------ marks */

function Glyph({ name }: { name: ProcessGlyph }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...p}>
      {name === "mail" && (
        <>
          <rect className="dp-letter" x="7" y="5" width="10" height="9" rx="1" fill="#fff" stroke="none" opacity="0" />
          <rect x="3.5" y="6" width="17" height="12.5" rx="2.2" />
          <path className="dp-flap" d="M4.2 7l7.8 5.8L19.8 7" />
        </>
      )}
      {name === "search" && (
        <>
          <circle cx="10.5" cy="10.5" r="6" />
          <path d="M15 15l5 5" />
        </>
      )}
      {name === "target" && (
        <>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="12" cy="12" r=".8" fill="currentColor" />
        </>
      )}
      {name === "bulb" && (
        <>
          <path d="M9 17.5h6M10 20.5h4" />
          <path d="M8.6 14.6A6 6 0 1 1 15.4 14.6c-.6.5-.9 1.2-.9 1.9v1H9.5v-1c0-.7-.3-1.4-.9-1.9z" />
        </>
      )}
      {name === "layers" && (
        <>
          <path d="M12 4l8.5 4.5L12 13 3.5 8.5z" />
          <path d="M3.5 12.5L12 17l8.5-4.5M3.5 16.2L12 20.7l8.5-4.5" />
        </>
      )}
      {name === "check" && <path d="M5 12.5l4.5 4.5L19 7.5" />}
      {name === "pen" && (
        <>
          <path d="M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 3L8 18.5z" />
          <path d="M13.5 7l3 3" />
        </>
      )}
      {name === "spark" && <path d="M12 3.5c.6 4.6 3.9 7.9 8.5 8.5-4.6.6-7.9 3.9-8.5 8.5-.6-4.6-3.9-7.9-8.5-8.5 4.6-.6 7.9-3.9 8.5-8.5z" />}
    </svg>
  )
}

/* ------------------------------------------------------------------ parts */

type PhaseRowProps = {
  phase: ProcessPhase
  index: number
  id: string
  counts: Record<string, number>
  activeTag: string | null
  pinnedTag: string | null
  active: boolean
  dim: boolean
  flash: boolean
  reduced: boolean
  onHover: (i: number | null) => void
  onTagHover: (key: string | null) => void
  onTagPin: (tag: string) => void
}

function PhaseRow(props: PhaseRowProps) {
  const { phase, index, id, counts, activeTag, pinnedTag, active, dim, flash, reduced } = props
  const ref = React.useRef(null as HTMLLIElement | null)
  const seen = useInView(ref, 0.2)
  const pct = useCountUp(Math.round(clampPercent(phase.percent)), seen, reduced)
  return (
    <li
      ref={ref}
      id={id}
      className="dp-phase"
      data-seen={seen ? "" : undefined}
      data-active={active ? "" : undefined}
      data-dim={dim ? "" : undefined}
      data-flash={flash ? "" : undefined}
      onPointerEnter={() => props.onHover(index)}
      onPointerLeave={() => props.onHover(null)}
      onFocus={() => props.onHover(index)}
      onBlur={() => props.onHover(null)}
    >
      <article aria-labelledby={id + "-t"}>
        <p className="dp-pct">
          <span aria-label={Math.round(clampPercent(phase.percent)) + "% of the project"}>{pct}%</span>
          {phase.glyph && (
            <span className="dp-glyph" aria-hidden="true">
              <Glyph name={phase.glyph} />
            </span>
          )}
        </p>
        <h3 id={id + "-t"} className="dp-title">
          {phase.name}
        </h3>
        <div className="dp-row">
          <div className="dp-chips" role="group" aria-label={phase.name + " activities"}>
            {phase.tags.map((tag) => {
              const k = tagKey(tag)
              const n = counts[k] ?? 1
              return (
                <button
                  key={tag}
                  type="button"
                  className="dp-chip"
                  data-match={activeTag === k ? "" : undefined}
                  aria-pressed={pinnedTag === k}
                  title={n > 1 ? tag + " — in " + n + " phases" : undefined}
                  onPointerEnter={() => props.onTagHover(k)}
                  onPointerLeave={() => props.onTagHover(null)}
                  onFocus={() => props.onTagHover(k)}
                  onBlur={() => props.onTagHover(null)}
                  onClick={() => props.onTagPin(tag)}
                >
                  {tag}
                  {n > 1 && <sup aria-hidden="true">×{n}</sup>}
                </button>
              )
            })}
          </div>
          <p className="dp-desc">{phase.description}</p>
        </div>
      </article>
    </li>
  )
}

/* ------------------------------------------------------------------ main */

export default function DesignProcessTemplate({
  eyebrow = "Design process",
  headline = D_HEADLINE,
  icon = "mail",
  iconHref = "mailto:hello@example.com",
  iconLabel = "Get in touch",
  intro = D_INTRO,
  roles = D_ROLES,
  phases = D_PHASES,
  showAllocation = true,
  allocationLabel = "Time allocation",
  accent = "#2f64ef",
  fonts,
  onRoleChange,
  onTagSelect,
  maxWidth = "1160px",
  height = "100svh",
  className = "",
}: DesignProcessTemplateProps) {
  const uid = "dp" + React.useId().replace(/[^a-zA-Z0-9]/g, "")
  const reduced = useReducedMotion()

  // Reveal styles switch on only after mount, so server HTML and no-JS show everything.
  const [anim, setAnim] = React.useState(false)
  React.useEffect(() => setAnim(!reduced), [reduced])

  const headRef = React.useRef(null as HTMLHeadingElement | null)
  const allocRef = React.useRef(null as HTMLDivElement | null)
  const headSeen = useInView(headRef, 0.3)
  const allocSeen = useInView(allocRef, 0.4)

  const [role, setRole] = React.useState(null as string | null)
  const [hoverRole, setHoverRole] = React.useState(null as string | null)
  const [pinnedTag, setPinnedTag] = React.useState(null as string | null)
  const [hoverTag, setHoverTag] = React.useState(null as string | null)
  const [activePhase, setActivePhase] = React.useState(null as number | null)
  const [flash, setFlash] = React.useState(null as number | null)

  const parts = React.useMemo(() => parseHeadline(headline), [headline])
  const segs = React.useMemo(() => allocation(phases.map((p) => p.percent)), [phases])
  const counts = React.useMemo(() => tagCounts(phases.map((p) => p.tags)), [phases])
  const total = Math.round(phases.reduce((a, p) => a + clampPercent(p.percent), 0))

  const viewRole = hoverRole ?? role
  const pinnedKey = pinnedTag ? tagKey(pinnedTag) : null
  const viewTag = hoverTag ?? pinnedKey
  const roleHits = phases.filter((p) => phaseHasRole(p.roles, role)).length
  const status = statusLine(role, pinnedTag, roleHits, pinnedKey ? counts[pinnedKey] ?? 0 : 0, phases.length)

  const pickRole = (r: string) => {
    const next = role && tagKey(role) === tagKey(r) ? null : r
    setRole(next)
    onRoleChange?.(next)
  }
  const pinTag = (t: string) => {
    const next = pinnedKey === tagKey(t) ? null : t
    setPinnedTag(next)
    onTagSelect?.(next)
  }
  const clearAll = () => {
    if (role) onRoleChange?.(null)
    if (pinnedTag) onTagSelect?.(null)
    setRole(null)
    setPinnedTag(null)
  }

  const flashTimer = React.useRef(0)
  React.useEffect(() => () => clearTimeout(flashTimer.current), [])
  const goTo = (i: number) => {
    const el = document.getElementById(uid + "-p" + i)
    el?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" })
    setFlash(i)
    clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlash(null), 1400)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && (role || pinnedTag)) clearAll()
  }

  const style = {
    "--dp-accent": accent,
    "--dp-max": maxWidth,
    "--dp-display": fonts?.display ?? SANS,
    "--dp-body": fonts?.body ?? fonts?.display ?? SANS,
    minHeight: height,
  } as React.CSSProperties

  let wi = 0
  return (
    <section
      className={"dp-root " + className}
      style={style}
      data-anim={anim ? "on" : undefined}
      aria-label={eyebrow}
      onKeyDown={onKeyDown}
    >
      <style>{DP_CSS}</style>
      <div className="dp-page">
        <p className="dp-eyebrow">
          <i aria-hidden="true" />
          {eyebrow}
        </p>

        <h2 ref={headRef} className="dp-head" data-seen={headSeen ? "" : undefined}>
          {parts.map((part, i) => {
            const n = wi++
            const sep = i < parts.length - 1 ? " " : ""
            if (part.kind === "icon") {
              const inner = (
                <>
                  <Glyph name={icon} />
                  {iconHref && <span className="dp-tip">{iconLabel}</span>}
                </>
              )
              return (
                <React.Fragment key={i}>
                  {iconHref ? (
                    <a className="dp-badge" href={iconHref} aria-label={iconLabel} style={{ "--i": n } as React.CSSProperties}>
                      {inner}
                    </a>
                  ) : (
                    <span className="dp-badge" aria-hidden="true" style={{ "--i": n } as React.CSSProperties}>
                      {inner}
                    </span>
                  )}
                  {sep}
                </React.Fragment>
              )
            }
            return (
              <React.Fragment key={i}>
                <span className="dp-w">
                  <span style={{ "--i": n } as React.CSSProperties}>{part.value}</span>
                </span>
                {sep}
              </React.Fragment>
            )
          })}
        </h2>

        <div className="dp-intro">
          <p className="dp-lede">{intro}</p>
          {roles.length > 0 && (
            <div className="dp-roles">
              <div className="dp-chips" role="group" aria-label="Filter phases by role">
                {roles.map((r) => (
                  <button
                    key={r}
                    type="button"
                    className="dp-chip"
                    aria-pressed={!!role && tagKey(role) === tagKey(r)}
                    onClick={() => pickRole(r)}
                    onPointerEnter={() => setHoverRole(r)}
                    onPointerLeave={() => setHoverRole(null)}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <p className="dp-status" aria-live="polite">
                {status}
                {status && (
                  <button type="button" className="dp-clear" onClick={clearAll}>
                    Clear
                  </button>
                )}
              </p>
            </div>
          )}
        </div>

        {showAllocation && phases.length > 0 && (
          <div ref={allocRef} className="dp-alloc" data-seen={allocSeen ? "" : undefined}>
            <p className="dp-alloc-top">
              <span>{allocationLabel}</span>
              <span>
                {phases.length} phases · <b>{total}%</b>
              </span>
            </p>
            <div className="dp-bar">
              {phases.map((p, i) => (
                <button
                  key={p.name + i}
                  type="button"
                  className="dp-seg"
                  style={{ flex: "0 1 " + segs[i].width + "%", "--i": i } as React.CSSProperties}
                  data-active={activePhase === i ? "" : undefined}
                  data-dim={!phaseHasRole(p.roles, viewRole) ? "" : undefined}
                  aria-label={"Go to " + p.name + ", " + Math.round(clampPercent(p.percent)) + "%"}
                  onPointerEnter={() => setActivePhase(i)}
                  onPointerLeave={() => setActivePhase(null)}
                  onFocus={() => setActivePhase(i)}
                  onBlur={() => setActivePhase(null)}
                  onClick={() => goTo(i)}
                >
                  <i aria-hidden="true" />
                  <span aria-hidden="true">
                    <b>{Math.round(clampPercent(p.percent))}%</b>
                    <em style={{ fontStyle: "normal" }}>{p.name}</em>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <ol className="dp-phases">
          {phases.map((p, i) => (
            <PhaseRow
              key={p.name + i}
              phase={p}
              index={i}
              id={uid + "-p" + i}
              counts={counts}
              activeTag={viewTag}
              pinnedTag={pinnedKey}
              active={activePhase === i}
              dim={!phaseHasRole(p.roles, viewRole)}
              flash={flash === i}
              reduced={reduced}
              onHover={setActivePhase}
              onTagHover={setHoverTag}
              onTagPin={pinTag}
            />
          ))}
        </ol>
      </div>
    </section>
  )
}
