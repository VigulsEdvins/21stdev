"use client"

import * as React from "react"

/*
 * Duotone Team Roster: a "meet the people" section. A heavy display headline
 * sits bottom-left on a burning colour field; beside it, the team hangs in
 * tall columns of portraits that drift slowly in opposite directions. Every
 * photo is pushed through one tritone (shadow, midtone, highlight) built from
 * the palette, so a roster shot on ten different phones reads as one set.
 *
 * The signature: point at, tab to or tap a portrait and it lifts out of the
 * wall, colour bleeds back into it, the rest of the wall sinks into the field,
 * and its small craft chip unfolds into a card with the name, role, one line
 * and a link. The columns hold still while you read.
 *
 * Content, photos, open roles, colours (four presets or your own), column
 * count, drift speed, type and height are all props. Below ~700px the columns
 * become one drifting strip above the headline. Reduced motion keeps the
 * columns staggered and still. A pause button stops the drift at any time.
 */

export type RosterPreset = "ember" | "cobalt" | "moss" | "mono"

export type RosterPalette = {
  /** Darkest colour: the edges of the field and the chips. */
  ground: string
  /** The field between the edge and the glow. */
  deep: string
  /** The hot centre of the field, and the tritone midtone. */
  hot: string
  /** The brightest light in the field. */
  glow: string
  /** Headline, chip text and the CTA fill. */
  ink: string
  /** Tritone shadow and highlight applied to every portrait. */
  shadow: string
  highlight: string
  /** Tritone midtone. Defaults to a paler mix of hot and highlight so prints lift off the field. */
  mid?: string
}

export type TeamMember = {
  name: string
  role: string
  /** Short label on the chip ("Colour", "Sound"). Defaults to the role. */
  craft?: string
  /** One line shown when the chip unfolds. */
  bio?: string
  /** Portrait URL. A monogram plate stands in when missing or broken. */
  photo?: string
  /** object-position for the portrait, e.g. "50% 30%". */
  focus?: string
  href?: string
  /** Link text in the unfolded card. Defaults to labels.memberLink. */
  linkLabel?: string
  /** Brightens (>1) or darkens (<1) this portrait before the tritone, for very dark or bright photos. */
  exposure?: number
}

export type OpenRole = {
  title: string
  href: string
  /** Chip label. Defaults to "Hiring". */
  craft?: string
  /** One line under the title. */
  note?: string
  /** Big word in the empty frame. Defaults to "You?". */
  mark?: string
  /** Link text in the unfolded card. Defaults to labels.roleLink. */
  linkLabel?: string
}

/** Every built-in string, for translation. */
export type RosterLabels = {
  pause: string
  play: string
  /** Accessible name of the portrait wall. */
  team: string
  /** Prefix read before an open role's title. */
  openRole: string
  /** Chip on an open-role frame without its own craft. */
  hiring: string
  roleLink: string
  memberLink: string
}

export const DEFAULT_LABELS: RosterLabels = {
  pause: "Pause",
  play: "Play",
  team: "Team",
  openRole: "Open role",
  hiring: "Hiring",
  roleLink: "See the role",
  memberLink: "Say hello",
}

export type RosterLink = { label: string; href: string }

export type DuotoneTeamRosterProps = {
  members?: TeamMember[]
  /** Empty frames placed among the portraits, each linking to a job. */
  openRoles?: OpenRole[]
  /** Small display word above the headline. */
  eyebrow?: string
  /** The headline. Use "\n" to break lines; each line is fitted to the column. */
  title?: string
  intro?: string
  cta?: RosterLink | null
  secondaryCta?: RosterLink | null
  preset?: RosterPreset
  /** Overrides any colour of the preset. */
  palette?: RosterPaletteInput
  /** Portrait columns on wide screens (2 to 4). Tablets get 2; phones a strip. */
  columns?: number
  /** Seconds a column takes to drift past one portrait. Lower is faster. */
  driftSeconds?: number
  /** false (or driftSeconds <= 0) gives a still, scannable wall that grows with the team, headline pinned beside it. */
  drift?: boolean
  /** Section height on tablet and desktop. A definite length, never a percentage. */
  height?: string
  /** Display face for the headline, eyebrow and monograms. */
  fontFamily?: string
  /** Horizontal stretch of the display face (1 = as drawn). */
  stretch?: number
  uppercase?: boolean
  grain?: boolean
  /** Built-in strings (pause, play, team, openRole, hiring, roleLink, memberLink). */
  labels?: RosterLabelsInput
  className?: string
  /** Called when a portrait is clicked or opened with the keyboard. */
  onMemberSelect?: (member: TeamMember) => void
  /** A mouse click on a portrait follows its link (never a mailto:, which stays on the "Say hello" link). Default true. */
  clickFollowsLink?: boolean
}

// #region roster-logic
export const PRESETS = {
  ember: { ground: "#170403", deep: "#4f0d06", hot: "#ee7a1c", glow: "#ffb54a", ink: "#fff0c8", shadow: "#260604", highlight: "#ffe2ad" },
  cobalt: { ground: "#03061f", deep: "#0d1c6e", hot: "#2e57f5", glow: "#86a6ff", ink: "#eef1ff", shadow: "#050b33", highlight: "#d9e3ff" },
  moss: { ground: "#061008", deep: "#163519", hot: "#5d8a35", glow: "#c3d66e", ink: "#f3f6dd", shadow: "#08170b", highlight: "#eef3c4" },
  mono: { ground: "#090909", deep: "#262626", hot: "#8c8c8c", glow: "#e0e0e0", ink: "#fafafa", shadow: "#0d0d0d", highlight: "#f4f4f4" },
}

export function resolvePalette(preset: string, overrides: any): RosterPalette {
  const table: any = PRESETS
  const base = table[preset] || PRESETS.ember
  const out: any = Object.assign({}, base)
  if (overrides) for (const k of Object.keys(base)) if (overrides[k]) out[k] = overrides[k]
  return out
}

/** "#f80" or "#ff8800" to [r, g, b] in 0..1, for the SVG tritone tables. */
export function hexToUnit(hex: string) {
  let h = String(hex || "").trim().replace("#", "")
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return [0, 0, 0]
  return [0, 2, 4].map((i) => Math.round((parseInt(h.slice(i, i + 2), 16) / 255) * 1000) / 1000)
}

/** Mixes two hex colours, t = 0 gives a, t = 1 gives b. */
export function mixHex(a: string, b: string, t: number) {
  const x = hexToUnit(a)
  const y = hexToUnit(b)
  return "#" + [0, 1, 2].map((i) => Math.round((x[i] + (y[i] - x[i]) * t) * 255).toString(16).padStart(2, "0")).join("")
}

/** One feFuncR/G/B table per channel: shadow, midtone, highlight. */
export function tritoneTables(shadow: string, mid: string, highlight: string) {
  const s = hexToUnit(shadow)
  const m = hexToUnit(mid)
  const h = hexToUnit(highlight)
  return [0, 1, 2].map((c) => s[c] + " " + m[c] + " " + h[c])
}

export function initials(name: string) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return "?"
  const first = parts[0][0]
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ""
  return (first + last).toUpperCase()
}

/**
 * Deals the people (and open roles) into columns round-robin, so neighbours
 * differ, then pads short columns with repeats until each holds `minPerColumn`
 * so a drifting loop never shows a gap. Repeats are flagged `dup` and are
 * hidden from assistive tech. Open roles are spread through the deck.
 */
export function dealColumns(count: number, roleCount: number, columns: number, minPerColumn: number) {
  const cols = Math.max(1, Math.floor(columns) || 1)
  const deck: any[] = []
  for (let i = 0; i < count; i++) deck.push({ kind: "member", index: i })
  for (let r = 0; r < roleCount; r++) {
    const at = Math.min(deck.length, Math.round(((r + 1) * (count + roleCount)) / (roleCount + 1)) - 1 + r)
    deck.splice(Math.max(0, at), 0, { kind: "role", index: r })
  }
  const out: any[][] = []
  for (let c = 0; c < cols; c++) out.push([])
  deck.forEach((d, i) => out[i % cols].push({ kind: d.kind, index: d.index, dup: false }))
  if (!deck.length) return out
  // Pad from the far end of the column furthest away, so a repeat never sits
  // level with the same face in the next column.
  for (let c = 0; c < cols; c++) {
    let from = (c + Math.floor(cols / 2) + (cols % 2 ? 1 : 0)) % cols
    if (cols === 1) from = 0
    const pool = out[from].filter((e) => !e.dup).slice().reverse()
    const rest = deck.map((d) => ({ kind: d.kind, index: d.index, dup: false })).reverse()
    const candidates = pool.concat(rest)
    let k = 0
    let guard = 0
    while (out[c].length < minPerColumn && guard < candidates.length * 3) {
      const d = candidates[k % candidates.length]
      k++
      guard++
      const clash = out[c].some((e) => e.kind === d.kind && e.index === d.index)
      if (clash && guard < candidates.length) continue
      out[c].push({ kind: d.kind, index: d.index, dup: true })
    }
  }
  return out
}

/** Font size that makes the widest headline line fill `available` px. */
export function fitTitleSize(available: number, widestAt100: number, stretch: number, min: number, max: number) {
  if (!(available > 0) || !(widestAt100 > 0)) return min
  const size = (available / (widestAt100 * (stretch > 0 ? stretch : 1))) * 100
  return Math.max(min, Math.min(max, Math.floor(size * 10) / 10))
}

/** Layout for a container width: a strip on phones, 2 columns on tablets. */
export function layoutFor(width: number, columns: number) {
  if (width > 0 && width < 700) return 0
  const wanted = Math.max(2, Math.min(4, Math.round(columns) || 3))
  if (width > 0 && width < 1000) return 2
  return wanted
}

export function splitLines(title: string) {
  return String(title || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
}
// #endregion roster-logic

const U = "https://images.unsplash.com/"
const Q = "?auto=format&fit=crop&w=720&h=960&q=80"

export const DEFAULT_MEMBERS: TeamMember[] = [
  { name: "Priya Nair", role: "Supervising colourist", craft: "Colour", bio: "Grades every feature that leaves the building. Prefers film emulation to LUTs.", photo: U + "photo-1494790108377-be9c29b29330" + Q, focus: "50% 30%", href: "mailto:priya@foxglove-post.example" },
  { name: "Daniel Osei", role: "Head of sound", craft: "Sound", bio: "Mixes in Atmos, then checks every reel on a pair of tired laptop speakers.", photo: U + "photo-1507003211169-0a1dd7228f2d" + Q, focus: "50% 30%", href: "mailto:daniel@foxglove-post.example" },
  { name: "Ellie Marsh", role: "Offline editor", craft: "Edit", bio: "Cuts long-form documentary. Asks what the film is about before opening the timeline.", photo: U + "photo-1438761681033-6461ffad8d80" + Q, focus: "50% 35%", href: "mailto:ellie@foxglove-post.example" },
  { name: "Marcus Bell", role: "VFX supervisor", craft: "VFX", bio: "Fixes what the shoot could not: skies, rigs, the boom that dipped into frame.", photo: U + "photo-1500648767791-00dcc994a43e" + Q, focus: "50% 30%", href: "mailto:marcus@foxglove-post.example" },
  { name: "Hannah Cole", role: "Post producer", craft: "Production", bio: "Keeps schedules, budgets and deliverables honest from first call to final QC.", photo: U + "photo-1544005313-94ddf0286df2" + Q, focus: "50% 30%", href: "mailto:hannah@foxglove-post.example" },
  { name: "Graham Whitlock", role: "Online editor", craft: "Finishing", bio: "Conforms, masters and delivers to whatever spec a broadcaster invents next.", photo: U + "photo-1472099645785-5658abf4ff4e" + Q, focus: "50% 30%", href: "mailto:graham@foxglove-post.example" },
  { name: "Mira Kowalczyk", role: "Motion designer", craft: "Motion", bio: "Titles, maps and the end credits nobody notices until they are wrong.", photo: U + "photo-1517841905240-472988babdf9" + Q, focus: "50% 30%", href: "mailto:mira@foxglove-post.example" },
  { name: "Jules Okafor", role: "Dialogue editor", craft: "Dialogue", bio: "Rebuilds noisy location sound one syllable at a time.", photo: U + "photo-1506794778202-cad84cf45f1d" + Q, focus: "50% 30%", href: "mailto:jules@foxglove-post.example" },
  { name: "Sam Lindqvist", role: "Assistant colourist", craft: "Colour", bio: "Matches cameras, preps the grade and runs the dailies every morning.", photo: U + "photo-1502823403499-6ccfcf4fb453" + Q, focus: "50% 30%", href: "mailto:sam@foxglove-post.example" },
  { name: "Noa Brandt", role: "Studio manager", craft: "Studio", bio: "Runs the suites, the kit room and, under protest, the coffee rota.", photo: U + "photo-1524504388940-b1c1722653e1" + Q, focus: "50% 30%", href: "mailto:noa@foxglove-post.example" },
]

const useIsoLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect

const DISPLAY_STACK = '"Arial Black", "Archivo Black", "Helvetica Neue", Inter, "Segoe UI", system-ui, sans-serif'

const css = `
.dtr{position:relative;isolation:isolate;overflow:hidden;width:100%;container-type:inline-size;color:var(--dtr-ink);background:var(--dtr-ground);font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;-webkit-font-smoothing:antialiased;--dtr-ease:cubic-bezier(.23,1,.32,1);--dtr-gap:14px;--dtr-pad:clamp(20px,3.2cqw,48px)}
.dtr *,.dtr *::before,.dtr *::after{box-sizing:border-box}
.dtr-field{position:absolute;inset:0;z-index:-2;background:radial-gradient(38cqw 46cqw at 0% 100%,var(--dtr-ground) 0%,color-mix(in srgb,var(--dtr-ground) 55%,var(--dtr-deep)) 72%,transparent 100%),radial-gradient(70% 62% at 34% 36%,var(--dtr-glow) 0%,var(--dtr-hot) 26%,color-mix(in srgb,var(--dtr-hot) 55%,var(--dtr-deep)) 48%,transparent 78%),radial-gradient(60% 90% at 78% 30%,color-mix(in srgb,var(--dtr-hot) 70%,var(--dtr-deep)) 0%,transparent 70%),linear-gradient(98deg,var(--dtr-ground) 0%,var(--dtr-deep) 16%,transparent 42%),linear-gradient(0deg,var(--dtr-ground) 0%,color-mix(in srgb,var(--dtr-deep) 85%,transparent) 30%,transparent 62%),var(--dtr-deep)}
.dtr-grain{position:absolute;inset:-50%;z-index:-1;pointer-events:none;opacity:.2;mix-blend-mode:overlay;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.6 -.35'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");background-size:220px 220px}
.dtr-defs{position:absolute;width:0;height:0;overflow:hidden;pointer-events:none}
.dtr-in{position:relative;display:grid;grid-template-columns:minmax(0,42fr) minmax(0,58fr);height:100%}
.dtr[data-cols="2"] .dtr-in{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
.dtr-copy{position:relative;z-index:5;isolation:isolate;grid-row:1;grid-column:1;pointer-events:none;display:flex;flex-direction:column;justify-content:flex-end;padding:var(--dtr-pad);padding-right:clamp(16px,2cqw,32px);min-width:0}
.dtr-title{position:relative;margin:0;text-shadow:0 .02em .14em color-mix(in srgb,var(--dtr-ground) 30%,transparent);font-family:var(--dtr-display);font-weight:900;font-synthesis:none;line-height:.84;letter-spacing:-.035em;color:var(--dtr-ink);font-size:var(--dtr-ts,clamp(56px,9cqw,200px));text-transform:var(--dtr-case)}
.dtr-eyebrow{display:block;font-size:.36em;line-height:1;letter-spacing:-.01em;margin:0 0 .16em .02em;transform:scaleX(var(--dtr-stretch));transform-origin:0 50%;white-space:nowrap}
.dtr-line{display:block;clip-path:inset(-30% -400% 0 -10%);padding-bottom:.04em;margin-bottom:-.04em}
.dtr-line>span{display:inline-block;white-space:nowrap;transform:scaleX(var(--dtr-stretch));transform-origin:0 50%}
.dtr-line>span>span{display:inline-block;animation:dtr-line-in 900ms var(--dtr-ease) both;animation-delay:calc(120ms + var(--i,0) * 50ms)}
.dtr-intro,.dtr-actions{pointer-events:auto}
.dtr-intro{margin:clamp(18px,2.2cqw,28px) 0 0;max-width:38ch;font-size:clamp(15px,1.15cqw,17px);line-height:1.55;color:color-mix(in srgb,var(--dtr-ink) 86%,transparent);text-wrap:pretty}
.dtr-actions{display:flex;flex-wrap:wrap;align-items:center;gap:12px 22px;margin-top:clamp(20px,2.4cqw,30px)}
.dtr-cta{position:relative;display:inline-flex;align-items:center;gap:12px;height:46px;padding:0 18px 0 20px;border-radius:3px;background:var(--dtr-ink);color:var(--dtr-ground);font-size:13px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;text-decoration:none;overflow:hidden;transition:transform 160ms var(--dtr-ease),background-color 220ms ease;outline:none}
.dtr-cta::before{content:"";position:absolute;inset:0;background:var(--dtr-glow);clip-path:inset(0 100% 0 0);transition:clip-path 280ms var(--dtr-ease)}
.dtr-cta>span{position:relative;z-index:1}
.dtr-cta-label{position:relative;display:inline-block;overflow:hidden;height:1.2em;line-height:1.2em}
.dtr-cta-label>span{display:block;transition:transform 260ms var(--dtr-ease)}
.dtr-cta-arrow{display:inline-block;transition:transform 260ms var(--dtr-ease)}
.dtr-cta:active{transform:scale(.97)}
.dtr-cta:focus-visible::before{clip-path:inset(0 0 0 0)}
.dtr-cta:focus-visible,.dtr-link:focus-visible,.dtr-pause:focus-visible,.dtr-panel a:focus-visible{outline:2px solid var(--dtr-ink);outline-offset:3px}
.dtr-link{color:var(--dtr-ink);font-size:14px;font-weight:600;text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:5px;transition:text-underline-offset 220ms var(--dtr-ease),opacity 200ms ease;outline:none}
.dtr-wall{position:relative;z-index:1;grid-row:1;grid-column:2;display:grid;grid-template-columns:repeat(var(--dtr-cols),minmax(0,1fr));gap:var(--dtr-gap);padding:0 var(--dtr-pad) 0 clamp(8px,1cqw,16px);height:100%;overflow:hidden;-webkit-mask-image:linear-gradient(180deg,transparent 0,#000 5%,#000 95%,transparent 100%);mask-image:linear-gradient(180deg,transparent 0,#000 5%,#000 95%,transparent 100%)}
.dtr-col{position:relative;min-width:0;animation:dtr-rise 1100ms var(--dtr-ease) both;animation-delay:calc(var(--ci) * 90ms)}
.dtr-track{display:flex;flex-direction:column;will-change:transform;transition:translate 280ms var(--dtr-ease);animation:dtr-up var(--dtr-dur) linear infinite;animation-delay:var(--dtr-phase)}
.dtr-col[data-dir="down"] .dtr-track{animation-name:dtr-down}
.dtr[data-paused] .dtr-track,.dtr[data-active] .dtr-track,.dtr[data-offscreen] .dtr-track,.dtr-wall:focus-within .dtr-track,.dtr[data-paused] .dtr-strip-track,.dtr[data-active] .dtr-strip-track,.dtr[data-offscreen] .dtr-strip-track,.dtr-strip:focus-within .dtr-strip-track{animation-play-state:paused}
.dtr-card{position:relative;container:dtrcard/inline-size;margin:0 0 var(--dtr-gap);aspect-ratio:3/4;border-radius:3px;transition:transform 260ms var(--dtr-ease);-webkit-tap-highlight-color:transparent}
.dtr-card::after{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;box-shadow:0 2px 6px color-mix(in srgb,var(--dtr-ground) 40%,transparent),0 18px 44px -12px color-mix(in srgb,var(--dtr-ground) 85%,transparent);opacity:0;transition:opacity 260ms ease;pointer-events:none}
.dtr-photo{position:absolute;inset:0;overflow:hidden;border-radius:3px;background:var(--dtr-deep);transition:opacity 260ms ease,filter 260ms ease}
.dtr-photo img{position:absolute;inset:0;display:block;width:100%;height:100%;max-width:none;object-fit:cover;transition:transform 300ms var(--dtr-ease)}
.dtr-photo img{transform-origin:50% 22%}
.dtr-card[data-on] .dtr-photo img{transform:scale(1.05)}
.dtr-hit{position:absolute;inset:0;z-index:1;margin:0;padding:0;border:0;border-radius:3px;background:transparent;cursor:default;outline:none;-webkit-tap-highlight-color:transparent}
.dtr-card[data-click] .dtr-hit{cursor:pointer}
.dtr-hit:focus-visible{box-shadow:0 0 0 2px var(--dtr-ground),0 0 0 4px var(--dtr-ink)}
.dtr-true{opacity:0;transition:opacity 300ms ease}
.dtr-plate{position:absolute;inset:0;display:grid;place-items:center;background:radial-gradient(90% 70% at 50% 35%,var(--dtr-hot),var(--dtr-deep) 70%,var(--dtr-ground));font-family:var(--dtr-display);font-weight:900;color:var(--dtr-ink);font-size:clamp(40px,7cqw,96px);letter-spacing:-.04em}
.dtr-plate span{transform:scaleX(var(--dtr-stretch));transition:transform 300ms var(--dtr-ease)}
.dtr-card[data-on] .dtr-plate span{transform:translateY(-.95em) scaleX(var(--dtr-stretch)) scale(.82)}
.dtr-plate{grid-template-rows:1fr auto 1fr}.dtr-plate span{grid-row:2}
.dtr-plate em{transition:opacity 160ms ease;grid-row:3;align-self:start;margin-top:.9em;max-width:80%;font:700 12px/1.35 ui-sans-serif,system-ui,sans-serif;letter-spacing:.04em;text-transform:uppercase;font-style:normal;text-align:center;color:color-mix(in srgb,var(--dtr-ink) 78%,transparent)}
.dtr-role .dtr-plate{background:repeating-linear-gradient(135deg,transparent 0 10px,color-mix(in srgb,var(--dtr-ink) 9%,transparent) 10px 11px),radial-gradient(90% 70% at 50% 30%,color-mix(in srgb,var(--dtr-hot) 70%,var(--dtr-deep)),var(--dtr-ground) 85%);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--dtr-ink) 28%,transparent);font-size:clamp(34px,5.2cqw,76px)}
.dtr-card{--dtr-ct:calc(100% - 26px);--dtr-cr:calc(100% - var(--dtr-cw));--dtr-cb:0px;--dtr-cl:0px}
.dtr-chip,.dtr-panel{position:absolute;left:12px;bottom:12px;background:color-mix(in srgb,var(--dtr-ground) 95%,transparent);color:var(--dtr-ink);border-radius:3px}
.dtr-chip{padding:8px 10px 7px;font-size:11px;font-weight:700;line-height:1;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;max-width:calc(100% - 24px);overflow:hidden;text-overflow:ellipsis;transition:opacity 160ms ease}
.dtr-panel{z-index:2;right:12px;max-height:calc(100% - 24px);overflow:hidden;padding:10px 12px 11px;clip-path:inset(var(--dtr-ct) var(--dtr-cr) var(--dtr-cb) var(--dtr-cl) round 3px);opacity:0;visibility:hidden;transition:clip-path 200ms var(--dtr-ease),opacity 100ms ease 120ms,visibility 0s linear 220ms;pointer-events:none}
.dtr-col:first-child .dtr-chip{left:auto;right:12px}
.dtr-col:first-child .dtr-card{--dtr-cr:0px;--dtr-cl:calc(100% - var(--dtr-cw))}

.dtr-name{margin:0;font-size:clamp(15px,7cqw,19px);font-weight:800;line-height:1.15;letter-spacing:-.01em}
.dtr-roleline{margin:3px 0 0;font-size:13px;line-height:1.35;color:color-mix(in srgb,var(--dtr-ink) 78%,transparent)}
.dtr-bio{margin:6px 0 0;font-size:13px;line-height:1.4;color:color-mix(in srgb,var(--dtr-ink) 90%,transparent)}
.dtr-panel a{display:inline-flex;align-items:center;gap:6px;margin-top:8px;color:var(--dtr-ink);font-size:13px;font-weight:700;text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:4px;outline:none}
.dtr-panel a span{display:inline-block;transition:transform 260ms var(--dtr-ease)}
.dtr-card[data-on]{z-index:3;transform:translateY(-6px) scale(1.02)}
.dtr-card[data-on]::after{opacity:1}
.dtr-card[data-on] .dtr-true{opacity:.72}
.dtr-card[data-on] .dtr-chip,.dtr-card[data-on] .dtr-plate em{opacity:0;transition-duration:90ms}
.dtr-card[data-on] .dtr-panel{clip-path:inset(0 0 0 0 round 3px);opacity:1;visibility:visible;pointer-events:auto;transition:clip-path 300ms var(--dtr-ease),opacity 60ms ease,visibility 0s}
.dtr-title{transform-origin:0 100%;transition:transform 300ms var(--dtr-ease)}
.dtr[data-active-col="0"] .dtr-title{transform:scale(.84)}
.dtr[data-active] .dtr-card:not([data-on]) .dtr-photo{opacity:.42;filter:saturate(.7)}
.dtr[data-active] .dtr-card:not([data-on]) .dtr-chip{opacity:.5}
.dtr-pause{position:absolute;right:var(--dtr-pad);bottom:14px;z-index:6;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--dtr-ink) 32%,transparent);display:inline-flex;align-items:center;gap:8px;height:32px;padding:0 12px;border:0;border-radius:3px;background:color-mix(in srgb,var(--dtr-ground) 88%,transparent);color:var(--dtr-ink);font:700 11px/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;transition:transform 160ms var(--dtr-ease),background-color 200ms ease;outline:none}
.dtr-pause:active{transform:scale(.96)}
.dtr-pause i{display:inline-block;width:8px;height:9px;border-left:3px solid currentColor;border-right:3px solid currentColor}
.dtr[data-paused] .dtr-pause i{border-right:0;border-left:8px solid currentColor;border-top:4.5px solid transparent;border-bottom:4.5px solid transparent;width:0;height:0}
.dtr-strip{display:none}
.dtr[data-mode="strip"] .dtr-in{display:flex;flex-direction:column;height:auto}
.dtr[data-mode="strip"] .dtr-wall{display:none}
.dtr[data-mode="strip"] .dtr-strip{display:block;position:relative;order:-1;overflow:hidden;padding:20px 0 4px;-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 6%,#000 94%,transparent 100%);mask-image:linear-gradient(90deg,transparent 0,#000 6%,#000 94%,transparent 100%)}
.dtr-strip-track{display:flex;width:max-content;padding-left:20px;will-change:transform;transition:translate 280ms var(--dtr-ease);animation:dtr-left var(--dtr-sdur) linear infinite}
.dtr-strip .dtr-card{width:clamp(170px,56cqw,250px);margin:0 10px 0 0;flex:none}
.dtr[data-mode="strip"] .dtr-copy{padding:18px 20px 28px}
.dtr[data-mode="strip"] .dtr-pause{position:static;margin-left:auto}
.dtr[data-static] .dtr-track{animation:none}
.dtr[data-static] .dtr-wall{height:auto;padding-top:var(--dtr-pad);padding-bottom:var(--dtr-pad);-webkit-mask-image:none;mask-image:none}
.dtr[data-static] .dtr-col:nth-child(2){padding-top:clamp(32px,6cqw,96px)}
.dtr[data-static] .dtr-col:nth-child(3){padding-top:clamp(16px,3cqw,48px)}
.dtr[data-static] .dtr-col:nth-child(4){padding-top:clamp(48px,8cqw,128px)}
.dtr[data-static] .dtr-in{height:auto;align-items:start}
.dtr[data-static] .dtr-copy{position:sticky;top:0;height:var(--dtr-h);min-height:600px}
.dtr[data-static][data-mode="strip"] .dtr-copy{position:relative;height:auto;min-height:0}
.dtr[data-static] .dtr-strip{overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none}
.dtr[data-static] .dtr-strip-track{animation:none;padding-right:20px}
.dtr[data-static] .dtr-strip .dtr-card{scroll-snap-align:start}
@container dtrcard (max-width:229px){.dtr-bio{display:none}.dtr-panel{padding:9px 10px 10px}}
@keyframes dtr-up{from{transform:translate3d(0,0,0)}to{transform:translate3d(0,-50%,0)}}
@keyframes dtr-down{from{transform:translate3d(0,-50%,0)}to{transform:translate3d(0,0,0)}}
@keyframes dtr-left{from{transform:translate3d(0,0,0)}to{transform:translate3d(calc(-50% + 10px),0,0)}}
@keyframes dtr-rise{from{opacity:0;transform:translate3d(0,56px,0)}to{opacity:1;transform:none}}
@keyframes dtr-line-in{from{transform:translate3d(0,104%,0)}to{transform:none}}
@media (hover:hover) and (pointer:fine){
.dtr-cta:hover::before{clip-path:inset(0 0 0 0)}
.dtr-cta:hover .dtr-cta-label>span{transform:translateY(-100%)}
.dtr-cta:hover .dtr-cta-arrow{transform:translateX(4px)}
.dtr-link:hover{text-underline-offset:8px}
.dtr-panel a:hover span{transform:translate(2px,-2px)}
.dtr-pause:hover{background:var(--dtr-ground)}
}
@media (prefers-reduced-motion:reduce){
.dtr-track,.dtr-strip-track{animation:none;transform:translate3d(0,calc(-50% * var(--dtr-rest,0)),0)}
.dtr-strip-track{transform:none}
.dtr-col,.dtr-line>span>span{animation:none}
.dtr-card,.dtr-panel,.dtr-cta-label>span,.dtr-cta-arrow{transition-duration:1ms}
.dtr-card[data-on],.dtr-card[data-on] .dtr-photo img{transform:none}
.dtr-title{transition-duration:1ms}
.dtr-pause{display:none}
}
`

type Slot =
  | { key: string; kind: "member"; member: TeamMember; dup: boolean }
  | { key: string; kind: "role"; role: OpenRole; dup: boolean }

/** Nudges a drifting column (or the phone strip) so a focused card is fully visible. */
function bringIntoView(card: HTMLElement) {
  const frame = card.closest(".dtr-wall, .dtr-strip") as HTMLElement | null
  const track = card.closest(".dtr-track, .dtr-strip-track") as HTMLElement | null
  if (!frame || !track) return
  const f = frame.getBoundingClientRect()
  const r = card.getBoundingClientRect()
  const vertical = track.classList.contains("dtr-track")
  // Start from where the track is right now (it may still be easing back).
  const now = getComputedStyle(track).translate
  const parts = !now || now === "none" ? ["0", "0"] : now.split(" ")
  let x = parseFloat(parts[0]) || 0
  let y = parseFloat(parts[1] || "0") || 0
  const m = 24
  if (vertical) {
    if (r.top < f.top + m) y += f.top + m - r.top
    else if (r.bottom > f.bottom - m) y -= r.bottom - (f.bottom - m)
  } else {
    if (r.left < f.left + m) x += f.left + m - r.left
    else if (r.right > f.right - m) x -= r.right - (f.right - m)
  }
  track.style.translate = Math.round(x) + "px " + Math.round(y) + "px"
}

/** Lets the track ease back into its loop once focus moves on. */
function releaseNudge(card: HTMLElement) {
  const track = card.closest(".dtr-track, .dtr-strip-track") as HTMLElement | null
  if (track) track.style.translate = ""
}

function Portrait(props: {
  slot: Slot
  on: boolean
  filterId: string
  labels: RosterLabels
  onEnter: (key: string) => void
  onLeave: (key: string) => void
  onToggle: (key: string) => void
  onSelect?: (member: TeamMember) => void
  follows: boolean
}) {
  const { slot, on, filterId, labels, onEnter, onLeave, onToggle, onSelect, follows } = props
  const [failed, setFailed] = React.useState(false)
  const pointer = React.useRef("mouse")
  const panelId = "p" + React.useId().replace(/[^a-zA-Z0-9]/g, "")
  const hidden = slot.dup
  const isRole = slot.kind === "role"
  const member = slot.kind === "member" ? slot.member : null
  const role = slot.kind === "role" ? slot.role : null
  const craft = member ? member.craft || member.role : role ? role.craft || labels.hiring : ""
  const label = member ? member.name + ", " + member.role : role ? labels.openRole + ": " + role.title : ""
  const photo = member && member.photo && !failed ? member.photo : ""
  const href = member ? member.href : role ? role.href : undefined
  const linkLabel = member ? member.linkLabel || labels.memberLink : (role && role.linkLabel) || labels.roleLink
  const exposure = member && member.exposure && member.exposure > 0 ? member.exposure : 1
  const focus = (member && member.focus) || "50% 22%"
  const followable = follows && Boolean(href) && !/^mailto:/i.test(String(href))
  const clickable = Boolean((member && onSelect) || followable)

  const follow = (card: HTMLElement) => {
    const a = card.querySelector(".dtr-panel a") as HTMLAnchorElement | null
    if (a) a.click()
  }

  return (
    <div
      className={"dtr-card" + (isRole ? " dtr-role" : "")}
      data-on={on ? "" : undefined}
      data-click={clickable ? "" : undefined}
      aria-hidden={hidden ? true : undefined}
      style={{ ["--dtr-cw" as any]: Math.min(26, craft.length) * 0.74 + 2.2 + "em" }}
      onPointerDown={(e) => {
        pointer.current = e.pointerType
      }}
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse") return
        // A card cut off by the frame slides fully into view (it stays under the pointer).
        bringIntoView(e.currentTarget)
        onEnter(slot.key)
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== "mouse") return
        onLeave(slot.key)
        if (!e.currentTarget.contains(document.activeElement)) releaseNudge(e.currentTarget)
      }}
      onBlur={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
        onLeave(slot.key)
        releaseNudge(e.currentTarget)
      }}
    >
      <div className="dtr-photo">
        {photo ? (
          <>
            <img
              className="dtr-duo"
              src={photo}
              alt=""
              width={720}
              height={960}
              loading="lazy"
              decoding="async"
              draggable={false}
              style={{
                filter: (exposure !== 1 ? "brightness(" + exposure + ") " : "") + "url(#" + filterId + ")",
                objectPosition: focus,
              }}
              onError={() => setFailed(true)}
            />
            <img
              className="dtr-true"
              src={photo}
              alt=""
              width={720}
              height={960}
              loading="lazy"
              decoding="async"
              draggable={false}
              style={{ objectPosition: focus }}
            />
          </>
        ) : (
          <div className="dtr-plate" aria-hidden="true">
            <span>{member ? initials(member.name) : (role && role.mark) || "You?"}</span>
            {role ? <em>{role.title}</em> : null}
          </div>
        )}
      </div>
      <span className="dtr-chip" aria-hidden="true">
        {craft}
      </span>
      <button
        type="button"
        className="dtr-hit"
        tabIndex={hidden ? -1 : 0}
        aria-label={label}
        aria-expanded={hidden ? undefined : on}
        aria-controls={panelId}
        onFocus={(e) => {
          // Pointer focus is handled by hover and tap; keyboard focus unfolds here.
          if (!e.currentTarget.matches(":focus-visible")) return
          onEnter(slot.key)
          bringIntoView(e.currentTarget.parentElement as HTMLElement)
        }}
        onClick={(e) => {
          const card = e.currentTarget.parentElement as HTMLElement
          if (member && onSelect) onSelect(member)
          if (e.detail === 0) {
            // Keyboard: Enter opens the card, a second Enter moves to its link.
            if (!on) {
              onEnter(slot.key)
              bringIntoView(card)
            } else {
              const a = card.querySelector(".dtr-panel a") as HTMLElement | null
              if (a) a.focus()
            }
            return
          }
          if (pointer.current === "mouse") {
            if (followable) follow(card)
            return
          }
          if (!on) bringIntoView(card)
          onToggle(slot.key)
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") onLeave(slot.key)
        }}
      />
      <div
        className="dtr-panel"
        id={panelId}
        aria-hidden={on ? undefined : true}
        onKeyDown={(e) => {
          if (e.key !== "Escape") return
          const btn = e.currentTarget.parentElement?.querySelector(".dtr-hit") as HTMLElement | null
          if (btn) btn.focus()
          onLeave(slot.key)
        }}
      >
        <p className="dtr-name">{member ? member.name : role ? role.title : ""}</p>
        {member || (role && role.note) ? <p className="dtr-roleline">{member ? member.role : role ? role.note : ""}</p> : null}
        {member && member.bio ? <p className="dtr-bio">{member.bio}</p> : null}
        {href ? (
          <a href={href} tabIndex={hidden || !on ? -1 : 0}>
            {linkLabel} <span aria-hidden="true">↗</span>
          </a>
        ) : null}
      </div>
    </div>
  )
}

export default function DuotoneTeamRoster({
  members = DEFAULT_MEMBERS,
  openRoles = [],
  eyebrow = "Meet",
  title = "The\ncrew",
  intro = "Ten editors, colourists and sound people finishing features, series and ads in a converted print works in Leeds.",
  cta = { label: "Start a project", href: "#contact" },
  secondaryCta = null,
  preset = "ember",
  palette,
  columns = 3,
  driftSeconds = 9,
  drift = true,
  height = "100svh",
  fontFamily = DISPLAY_STACK,
  stretch = 1.16,
  uppercase = true,
  grain = true,
  labels,
  className = "",
  onMemberSelect,
  clickFollowsLink = true,
}: DuotoneTeamRosterProps) {
  const pal = resolvePalette(preset, palette)
  const text: RosterLabels = { ...DEFAULT_LABELS, ...(labels || {}) }
  const rawId = React.useId()
  const uid = "dtr" + rawId.replace(/[^a-zA-Z0-9]/g, "")
  const filterId = uid + "-tone"
  const titleId = uid + "-title"
  const rootRef = React.useRef(null as HTMLElement | null)
  const copyRef = React.useRef(null as HTMLDivElement | null)
  const titleRef = React.useRef(null as HTMLHeadingElement | null)
  const [cols, setCols] = React.useState(layoutFor(0, columns))
  const [titleSize, setTitleSize] = React.useState(0)
  const [active, setActive] = React.useState(null as string | null)
  const [paused, setPaused] = React.useState(false)
  const [outOfView, setOutOfView] = React.useState(false)
  const [tabHidden, setTabHidden] = React.useState(false)
  const offscreen = outOfView || tabHidden

  const lines = splitLines(title)
  // The shadow end is lifted toward the field so dark skin and dark clothes keep their detail.
  const mid = (palette && palette.mid) || mixHex(pal.hot, pal.highlight, 0.35)
  const tables = tritoneTables(mixHex(pal.shadow, pal.deep, 0.4), mid, mixHex(pal.highlight, pal.ink, 0.5))
  const still = !drift || !(driftSeconds > 0)
  const copies = still ? [0] : [0, 1]
  const [minPer, setMinPer] = React.useState(4)
  const plan = React.useMemo(
    () => dealColumns(members.length, openRoles.length, cols || 1, cols && !still ? minPer : 0),
    [members.length, openRoles.length, cols, minPer, still],
  )

  const slotFor = (e: { kind: string; index: number; dup: boolean }, prefix: string): Slot =>
    e.kind === "role"
      ? { key: prefix, kind: "role", role: openRoles[e.index], dup: e.dup }
      : { key: prefix, kind: "member", member: members[e.index], dup: e.dup }

  // Measure the container: choose the layout and fit the headline to its column.
  useIsoLayoutEffect(() => {
    const root = rootRef.current
    const copy = copyRef.current
    const head = titleRef.current
    if (!root || !copy || !head) return
    const fit = () => {
      const w = root.getBoundingClientRect().width
      const next = layoutFor(w, columns)
      setCols((c) => (c === next ? c : next))
      const spans = head.querySelectorAll(".dtr-line > span")
      let widest = 0
      const cur = parseFloat(getComputedStyle(head).fontSize) || 100
      spans.forEach((s) => {
        widest = Math.max(widest, (s as HTMLElement).offsetWidth)
      })
      const widestAt100 = (widest / cur) * 100
      const cs = getComputedStyle(copy)
      const avail = copy.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      const h = root.getBoundingClientRect().height
      const strip = next === 0
      // Enough portraits per column that one loop is taller than the wall.
      if (next > 0) {
        const wallW = root.getBoundingClientRect().width * (next === 2 ? 0.5 : 0.58)
        const cardH = ((wallW - 14 * (next + 1)) / next) * (4 / 3) + 14
        const need = Math.max(3, Math.ceil(h / Math.max(80, cardH)))
        setMinPer((m) => (m === need ? m : need))
      }
      const maxByHeight = strip ? 200 : Math.max(56, (h * 0.52) / Math.max(1, lines.length + 0.45))
      // On the wall layout the widest line runs on into the first column of portraits, like a poster.
      const overhang = strip ? 1 : 1.18
      setTitleSize(fitTitleSize(avail * overhang, widestAt100, stretch, 40, Math.min(280, maxByHeight)))
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(root)
    return () => ro.disconnect()
  }, [columns, stretch, title, fontFamily, uppercase, lines.length])

  // Stop drifting while nobody can see it.
  React.useEffect(() => {
    const root = rootRef.current
    if (!root || typeof IntersectionObserver === "undefined") return
    const io = new IntersectionObserver(([entry]) => setOutOfView(!entry.isIntersecting), { threshold: 0 })
    io.observe(root)
    const vis = () => setTabHidden(document.hidden)
    document.addEventListener("visibilitychange", vis)
    return () => {
      io.disconnect()
      document.removeEventListener("visibilitychange", vis)
    }
  }, [])

  const onEnter = React.useCallback((key: string) => setActive(key), [])
  const onLeave = React.useCallback((key: string) => setActive((a) => (a === key ? null : a)), [])
  const onToggle = React.useCallback((key: string) => setActive((a) => (a === key ? null : key)), [])

  // Tap outside an unfolded card folds it again.
  React.useEffect(() => {
    if (!active) return
    const down = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return
      const t = e.target as HTMLElement | null
      if (!t || !t.closest || !t.closest(".dtr-card")) setActive(null)
    }
    document.addEventListener("pointerdown", down)
    return () => document.removeEventListener("pointerdown", down)
  }, [active])

  const rootStyle = {
    ["--dtr-ground" as any]: pal.ground,
    ["--dtr-deep" as any]: pal.deep,
    ["--dtr-hot" as any]: pal.hot,
    ["--dtr-glow" as any]: pal.glow,
    ["--dtr-ink" as any]: pal.ink,
    ["--dtr-display" as any]: fontFamily,
    ["--dtr-stretch" as any]: String(stretch),
    ["--dtr-case" as any]: uppercase ? "uppercase" : "none",
    ["--dtr-cols" as any]: String(cols || 1),
    ["--dtr-ts" as any]: titleSize ? titleSize + "px" : undefined,
    ["--dtr-sdur" as any]: Math.max(8, (members.length + openRoles.length) * Math.max(1, driftSeconds) * 0.55) + "s",
    ["--dtr-h" as any]: height,
    height: cols === 0 || still ? "auto" : height,
    minHeight: cols === 0 ? undefined : still ? height : "600px",
  } as React.CSSProperties

  const pauseButton = (
    <button
      type="button"
      className="dtr-pause"
      aria-pressed={paused}
      onClick={() => setPaused((p) => !p)}
    >
      <i aria-hidden="true" />
      {paused ? text.play : text.pause}
    </button>
  )

  const phases = [0, 0.38, 0.71, 0.18]

  return (
    <section
      ref={rootRef}
      className={"dtr " + className}
      style={rootStyle}
      aria-labelledby={titleId}
      data-mode={cols === 0 ? "strip" : "columns"}
      data-cols={cols || undefined}
      data-active={active ? "" : undefined}
      data-active-col={active && cols !== 0 ? active.split("-")[0] : undefined}
      data-paused={paused ? "" : undefined}
      data-static={still ? "" : undefined}
      data-offscreen={offscreen ? "" : undefined}
    >
      <style>{css}</style>
      <svg className="dtr-defs" aria-hidden="true" focusable="false">
        <filter id={filterId} colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values="0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0" />
          <feComponentTransfer>
            <feFuncR type="table" tableValues="0 0.13 0.5 0.9 1" />
            <feFuncG type="table" tableValues="0 0.13 0.5 0.9 1" />
            <feFuncB type="table" tableValues="0 0.13 0.5 0.9 1" />
          </feComponentTransfer>
          <feComponentTransfer>
            <feFuncR type="table" tableValues={tables[0]} />
            <feFuncG type="table" tableValues={tables[1]} />
            <feFuncB type="table" tableValues={tables[2]} />
          </feComponentTransfer>
        </filter>
      </svg>
      <div className="dtr-field" aria-hidden="true" />
      {grain ? <div className="dtr-grain" aria-hidden="true" /> : null}
      {cols !== 0 && !still ? pauseButton : null}

      <div className="dtr-in">
        <div className="dtr-copy" ref={copyRef}>
          <h2 className="dtr-title" id={titleId} ref={titleRef}>
            {eyebrow ? <span className="dtr-eyebrow">{eyebrow} </span> : null}
            {lines.map((l, i) => (
              <span className="dtr-line" key={i} style={{ ["--i" as any]: i }}>
                <span>
                  <span>{l}</span>
                </span>
                {i < lines.length - 1 ? " " : null}
              </span>
            ))}
          </h2>
          {intro ? <p className="dtr-intro">{intro}</p> : null}
          {cta || secondaryCta ? (
            <div className="dtr-actions">
              {cta ? (
                <a className="dtr-cta" href={cta.href}>
                  <span className="dtr-cta-label">
                    <span>{cta.label}</span>
                    <span aria-hidden="true">{cta.label}</span>
                  </span>
                  <span className="dtr-cta-arrow" aria-hidden="true">
                    →
                  </span>
                </a>
              ) : null}
              {secondaryCta ? (
                <a className="dtr-link" href={secondaryCta.href}>
                  {secondaryCta.label}
                </a>
              ) : null}
              {cols === 0 && !still ? pauseButton : null}
            </div>
          ) : null}
        </div>

        {cols === 0 ? (
          <div className="dtr-strip" role="group" aria-label={text.team}>
            <div className="dtr-strip-track">
              {copies.map((copy) =>
                plan[0].map((e, i) => {
                  const slot = slotFor({ ...e, dup: e.dup || copy === 1 }, "s" + copy + "-" + i)
                  return (
                    <Portrait
                      key={slot.key}
                      slot={slot}
                      on={active === slot.key}
                      filterId={filterId}
                      labels={text}
                      onEnter={onEnter}
                      onLeave={onLeave}
                      onToggle={onToggle}
                      onSelect={onMemberSelect}
                      follows={clickFollowsLink}
                    />
                  )
                }),
              )}
            </div>
          </div>
        ) : (
          <div className="dtr-wall" role="group" aria-label={text.team}>
            {plan.map((col, c) => {
              const dur = Math.max(6, col.length * Math.max(1, driftSeconds))
              const phase = phases[c % phases.length]
              return (
                <div
                  className="dtr-col"
                  key={c}
                  data-dir={c % 2 ? "down" : "up"}
                  style={{
                    ["--ci" as any]: c,
                    ["--dtr-dur" as any]: dur + "s",
                    ["--dtr-phase" as any]: -(dur * phase) + "s",
                    ["--dtr-rest" as any]: c % 2 ? 1 - phase : phase,
                  }}
                >
                  <div className="dtr-track">
                    {copies.map((copy) =>
                      col.map((e, i) => {
                        const slot = slotFor({ ...e, dup: e.dup || copy === 1 }, c + "-" + copy + "-" + i)
                        return (
                          <div key={slot.key}>
                            <Portrait
                              slot={slot}
                              on={active === slot.key}
                              filterId={filterId}
                              labels={text}
                              onEnter={onEnter}
                              onLeave={onLeave}
                              onToggle={onToggle}
                              onSelect={onMemberSelect}
                              follows={clickFollowsLink}
                            />
                          </div>
                        )
                      }),
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

// Declared after the JSX: the 21st CLI tokenizer hangs on generics before it.
export type RosterPaletteInput = Partial<RosterPalette>
export type RosterLabelsInput = Partial<RosterLabels>
