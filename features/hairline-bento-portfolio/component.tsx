"use client"

// Hairline Bento Portfolio — a whole link-in-bio portfolio on one sheet: a
// grid of cells divided by one-pixel rules on warm paper, a stretched black
// display name, and one inverted panel that sells the thing you're launching.
//
// The badge beside the name is a ring of text around a status dot. It spins on
// its own, faster under the pointer, and you can grab it and flick it. The
// name fits itself to the cell, and each letter turns to outline on hover.
// About counts its numbers up. Click the email to copy it. The panel takes a
// waitlist (pick topics, then your email) and the mailing list opens into a
// subscribe field. The footer keeps your local time and a light/dark switch.
//
// Every mark is drawn in this file. Nothing loads at runtime.
import * as React from "react"

/* ------------------------------------------------------------------ types */

export type BentoFindMe = { label: string; title: string; description: string; cta: string; href: string }
export type BentoConnect = { label: string; title: string; description: string; href: string }
export type BentoAbout = { label: string; headline: string[]; body: string }
export type BentoProduct = { label: string; title: string; description: string; cta: string; href: string }
export type BentoContact = { label: string; cta: string; subject: string }
export type BentoOffer = {
  label: string
  /** A line break ("\n") splits the title onto two lines. */
  title: string
  description: string
  tags: string[]
  placeholder: string
  cta: string
  footnote: string
  /** Where the corner arrow goes. Empty hides the arrow. */
  href: string
  /** Spots left out of the total; drawn as squares by the footnote. `null` hides them. */
  spots: { left: number; total: number } | null
}
export type BentoNewsletter = { label: string; title: string; description: string; cta: string }

export type HairlineBentoPortfolioProps = {
  name?: string
  /** Set the display lines yourself. Defaults to first word / the rest. */
  nameLines?: string[]
  role?: string
  location?: string
  /** The chips under the name. */
  badges?: string[]
  /** Green, pulsing dot when true; a quiet grey one when false. */
  available?: boolean
  /** Runs around the ring badge. */
  ringText?: string
  email?: string
  findMe?: Partial<BentoFindMe>
  connect?: Partial<BentoConnect>
  about?: Partial<BentoAbout>
  product?: Partial<BentoProduct>
  art?: Partial<BentoProduct>
  contact?: Partial<BentoContact>
  offer?: Partial<BentoOffer>
  newsletter?: Partial<BentoNewsletter>
  /** Called with the waitlist email and the picked topics. A rejected promise shows an error. */
  onJoinWaitlist?: (entry: { email: string; topics: string[] }) => void | Promise<unknown>
  onSubscribe?: (email: string) => void | Promise<unknown>
  /** IANA zone for the footer clock, e.g. "Europe/Warsaw". */
  timeZone?: string
  /** The footer's left line. */
  footer?: string
  /** The status dot, focus rings and button shadows. */
  accent?: string
  /** Paper colour for the light theme. */
  paper?: string
  fonts?: { display?: string; body?: string }
  /** Horizontal stretch of the display name. Defaults to 1.32, or 1 when you pass your own display font. */
  displayStretch?: number
  defaultTheme?: "system" | "light" | "dark"
  onThemeChange?: (theme: "light" | "dark") => void
  maxWidth?: string
  height?: string
  className?: string
}

type Theme = "light" | "dark"
type Status = "idle" | "loading" | "error" | "done"

/* ------------------------------------------------------------------ logic */

// #region logic
function clamp(v: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, v))
}

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim())
}

function splitName(name: string, lines?: string[]): string[] {
  const given = (lines ?? []).map((l) => l.trim()).filter(Boolean)
  if (given.length) return given
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length <= 1) return [words[0] ?? ""]
  return [words[0], words.slice(1).join(" ")]
}

function splitNumbers(text: string): { num: boolean; value: string }[] {
  const out: { num: boolean; value: string }[] = []
  for (const m of text.matchAll(/(\d+)|(\D+)/g)) out.push({ num: !!m[1], value: m[0] })
  return out
}

function easeOutCubic(t: number): number {
  const c = clamp(t, 0, 1)
  return 1 - Math.pow(1 - c, 3)
}

function countValue(target: number, t: number): number {
  return Math.round(target * easeOutCubic(t))
}

function ringText(text: string): string {
  const t = text.trim()
  if (!t) return ""
  return /[·•✦]$/.test(t) ? t + " " : t + " · "
}

// Fits the ring text to a circle of radius 44 (circumference ≈ 276).
function ringFontSize(len: number): number {
  if (len <= 0) return 9
  return Math.round(clamp(276 / (len * 0.62), 6, 10.5) * 10) / 10
}

function angleDelta(from: number, to: number): number {
  let d = (to - from) % 360
  if (d > 180) d -= 360
  if (d <= -180) d += 360
  return d
}

function formatClock(date: Date, timeZone?: string): string {
  const opts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", hour12: false }
  try {
    return new Intl.DateTimeFormat("en-GB", timeZone ? { ...opts, timeZone } : opts).format(date)
  } catch {
    return new Intl.DateTimeFormat("en-GB", opts).format(date)
  }
}

function mailtoHref(email: string, subject?: string, body?: string): string {
  const q = [subject ? "subject=" + encodeURIComponent(subject) : "", body ? "body=" + encodeURIComponent(body) : ""].filter(Boolean)
  return "mailto:" + email + (q.length ? "?" + q.join("&") : "")
}

// widths are each line measured at 100px; returns the font size that fits the widest.
function fitFont(widths: number[], avail: number, stretch: number, min: number, max: number): number {
  const widest = (Math.max(1, ...widths) / 100) * stretch
  if (avail <= 0) return min
  return Math.floor(clamp((avail * 0.98) / widest, min, max) * 10) / 10
}
// #endregion logic

/* --------------------------------------------------------------- defaults */

const D_FIND: BentoFindMe = {
  label: "Find me",
  title: "Instagram",
  description: "Design tips, Figma, AI workflow",
  cta: "@mira.nowak.ux",
  href: "https://instagram.com",
}
const D_CONNECT: BentoConnect = {
  label: "LinkedIn",
  title: "Let’s connect",
  description: "Full work history, case studies, and recommendations.",
  href: "https://linkedin.com",
}
const D_ABOUT: BentoAbout = {
  label: "About",
  headline: ["11 years designing.", "7 focused on UX."],
  body:
    "Drawn to design since childhood — now specialising in design systems and advanced prototypes. Equally passionate about illustration and animation. I love discovering new workflows and sharing what I learn. Right now I’m experimenting with how AI can genuinely support the UX process.",
}
const D_PRODUCT: BentoProduct = {
  label: "Template",
  title: "Case Study Template",
  description: "Notion template for documenting UX work. Process-first.",
  cta: "Get on Gumroad",
  href: "https://gumroad.com",
}
const D_ART: BentoProduct = {
  label: "Illustration",
  title: "Art & Sketches",
  description: "Artwork, sketches & process videos",
  cta: "@mira.draws",
  href: "https://instagram.com",
}
const D_CONTACT: BentoContact = { label: "Contact", cta: "Say hello", subject: "Hello from your site" }
const D_OFFER: BentoOffer = {
  label: "Coming soon",
  title: "Work\nwith me",
  description: "1:1 sessions on Figma, design process, career, or project feedback. Paid. Limited spots.",
  tags: ["Figma deep dives", "Career advice", "Design critique", "Process fix"],
  placeholder: "Email",
  cta: "Join the waitlist",
  footnote: "Mentorship — Limited spots",
  href: "#",
  spots: { left: 3, total: 5 },
}
const D_NEWS: BentoNewsletter = {
  label: "Mailing list",
  title: "Be the first to know",
  description:
    "I’m working on a Variables ebook and more resources. No spam — just a quiet heads-up when something worth knowing drops, plus subscriber-only promos.",
  cta: "Subscribe",
}

/* ------------------------------------------------------------------ styles */

const HB_CSS = `
.hb-root{width:100%;box-sizing:border-box;--hb-accent:#22c55e;--hb-paper:var(--hb-paper-light,#e9e3d9);--hb-ink:#171615;--hb-soft:#46423d;--hb-muted:#7d776d;--hb-line:rgba(23,22,21,.5);--hb-tint:rgba(23,22,21,.035);--hb-panel:#1b1a19;--hb-panel-ink:#f0eae0;--hb-panel-muted:#8f897f;--hb-panel-line:rgba(240,234,224,.34);--hb-err:#fca5a5;--hb-display:"Archivo Black","Arial Black","Helvetica Neue",Arial,sans-serif;--hb-sans:"Space Grotesk","Inter",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:var(--hb-paper);color:var(--hb-ink);font-family:var(--hb-sans);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:clamp(16px,5vw,72px) clamp(16px,4vw,56px);-webkit-font-smoothing:antialiased;transition:background-color .45s ease,color .45s ease}
.hb-root[data-theme="dark"]{--hb-paper:#141413;--hb-ink:#ece6dc;--hb-soft:#c4bdb1;--hb-muted:#8a847a;--hb-line:rgba(236,230,220,.28);--hb-tint:rgba(236,230,220,.045);--hb-panel:#ece6dc;--hb-panel-ink:#171615;--hb-panel-muted:#6f695f;--hb-panel-line:rgba(23,22,21,.3);--hb-err:#b91c1c}
.hb-root :where(*){box-sizing:border-box}
.hb-root ::selection{background:var(--hb-accent);color:#0c0c0b}
.hb-root :focus-visible{outline:2px solid var(--hb-accent);outline-offset:2px}
.hb-root :where(button){font:inherit;color:inherit;background:none;border:0;padding:0;margin:0;cursor:pointer;text-align:inherit;letter-spacing:inherit}
.hb-root :where(a){color:inherit;text-decoration:none}
.hb-root :where(svg){display:block;max-width:none;flex:none}
.hb-root :where(h1,h2,h3,p,ul,figure){margin:0;padding:0;font-size:inherit;font-weight:inherit}
.hb-root :where(input){font:inherit;color:inherit;margin:0;border-radius:0}
.hb-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}

.hb-wrap{width:100%;max-width:var(--hb-max,1120px);container-type:inline-size}
.hb-grid{display:grid;gap:1px;background:var(--hb-line);border:1px solid var(--hb-line);grid-template-columns:minmax(0,1fr);grid-template-areas:"hero" "find" "offer" "about" "li" "contact" "tpl" "art" "mail";transition:background-color .45s,border-color .45s}
@container (min-width:640px){.hb-grid{grid-template-columns:repeat(2,minmax(0,1fr));grid-template-areas:"hero hero" "find li" "about about" "tpl art" "contact offer" "mail mail"}}
@container (min-width:960px){.hb-grid{grid-template-columns:1fr 1fr 1.38fr 1.08fr;grid-template-areas:"hero hero find offer" "li about about offer" "tpl art contact offer" "mail mail mail mail"}}

.hb-cell{position:relative;background:var(--hb-paper);padding:20px 22px 22px;display:flex;flex-direction:column;min-width:0;transition:background-color .3s ease;animation:hb-rise .8s cubic-bezier(.2,.7,.2,1) both;animation-delay:calc(var(--i,0) * 70ms + 60ms)}
.hb-cell:not(.hb-offer):hover{background:color-mix(in oklab,var(--hb-paper),var(--hb-ink) 3.5%)}
@container (min-width:960px){.hb-cell{min-height:206px}.hb-a-mail{min-height:0}}
.hb-a-hero{grid-area:hero}.hb-a-find{grid-area:find}.hb-a-li{grid-area:li}.hb-a-about{grid-area:about}.hb-a-tpl{grid-area:tpl}.hb-a-art{grid-area:art}.hb-a-contact{grid-area:contact}.hb-a-offer{grid-area:offer}.hb-a-mail{grid-area:mail}

.hb-label{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:18px;font-size:10.5px;line-height:1.2;letter-spacing:.16em;text-transform:uppercase;font-weight:600;color:var(--hb-muted)}
.hb-push{margin-top:auto}
.hb-title{font-size:clamp(18px,2cqw,22px);font-weight:700;letter-spacing:-.012em;line-height:1.15;margin-bottom:8px}
.hb-desc{font-size:13.5px;line-height:1.55;color:var(--hb-soft);max-width:46ch;margin-bottom:16px}
.hb-desc:last-child{margin-bottom:0}

.hb-btn{display:inline-flex;align-items:center;gap:8px;align-self:flex-start;border:1px solid var(--hb-ink);padding:9px 13px;font-size:12.5px;font-weight:600;line-height:1;white-space:nowrap;color:var(--hb-ink);transition:background-color .2s,color .2s,transform .22s cubic-bezier(.2,.8,.2,1),box-shadow .22s cubic-bezier(.2,.8,.2,1)}
.hb-btn:hover{background:var(--hb-ink);color:var(--hb-paper)}
.hb-btn-solid{background:var(--hb-ink);color:var(--hb-paper)}
.hb-btn-solid:hover{transform:translate(-2px,-2px);box-shadow:3px 3px 0 var(--hb-accent)}
.hb-btn:active{transform:none;box-shadow:none}
.hb-arr{display:inline-block;transition:transform .25s cubic-bezier(.2,.8,.2,1)}
.hb-btn:hover .hb-arr,.hb-join:hover .hb-arr{transform:translateX(3px)}
.hb-btn:hover .hb-arr-ne{transform:translate(2px,-2px)}
.hb-corner{width:15px;height:15px;color:var(--hb-muted);transition:transform .3s cubic-bezier(.2,.8,.2,1),color .3s}
.hb-a-li:hover .hb-corner,.hb-corner-link:hover .hb-corner{transform:translate(3px,-3px);color:var(--hb-ink)}

.hb-a-hero{flex-direction:row;align-items:center;gap:clamp(8px,2cqw,24px);padding-right:clamp(14px,2cqw,26px)}
.hb-hero-main{flex:1;min-width:0;display:flex;flex-direction:column;align-self:stretch}
.hb-namebox{position:relative;width:100%;margin:2px 0 18px}
.hb-measure{position:absolute;left:0;top:0;visibility:hidden;white-space:nowrap;pointer-events:none;font-family:var(--hb-display);font-weight:900;font-size:100px;letter-spacing:-.01em}
.hb-name{font-family:var(--hb-display);font-weight:900;font-size:clamp(34px,7cqw,84px);line-height:.88;letter-spacing:-.01em;color:var(--hb-ink)}
.hb-nl{display:block;white-space:nowrap;padding-bottom:.1em;margin-bottom:-.1em;clip-path:inset(-40% -300% 0 -10%)}
.hb-nl-in{display:inline-block;transform:scaleX(var(--hb-stretch,1));transform-origin:0 50%}
.hb-ch{display:inline-block;animation:hb-up .9s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(var(--c,0) * 38ms + 220ms);transition:color .25s;-webkit-text-stroke:1.4px transparent}
.hb-ch:hover{color:transparent;-webkit-text-stroke-color:var(--hb-ink)}
.hb-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:auto}
.hb-chip{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--hb-line);padding:6px 9px;font-size:11.5px;font-weight:500;line-height:1;color:var(--hb-ink);white-space:nowrap}
.hb-chip-dot{width:6px;height:6px;background:var(--hb-accent)}
.hb-chip-dot[data-off="true"]{background:var(--hb-muted)}

.hb-ring{width:clamp(104px,14cqw,152px);aspect-ratio:1;touch-action:none;cursor:grab;user-select:none;-webkit-user-select:none}
.hb-ring:active{cursor:grabbing}
.hb-ring-text{fill:var(--hb-ink);font-family:var(--hb-sans);font-weight:600;letter-spacing:.06em}
.hb-dot{fill:var(--hb-accent)}
.hb-dot[data-off="true"]{fill:var(--hb-muted)}
.hb-pulse{fill:var(--hb-accent);transform-box:fill-box;transform-origin:center;animation:hb-pulse 2.2s cubic-bezier(.2,.6,.3,1) infinite}
@container (max-width:639px){.hb-a-hero{flex-direction:column;align-items:stretch}.hb-ring{position:absolute;top:10px;right:10px;width:86px}.hb-a-hero .hb-label{padding-right:92px;min-height:52px;align-items:flex-start}}

.hb-head{font-size:clamp(18px,2cqw,22px);font-weight:700;letter-spacing:-.012em;line-height:1.22;margin-bottom:14px}
.hb-head>span{display:block}
.hb-num{font-variant-numeric:tabular-nums}

.hb-email{align-self:flex-start;font-size:clamp(14px,1.5cqw,16px);font-weight:700;letter-spacing:-.005em;margin-bottom:12px;text-align:left;word-break:break-all;background-image:linear-gradient(var(--hb-ink),var(--hb-ink));background-size:0 1px;background-repeat:no-repeat;background-position:0 100%;transition:background-size .35s cubic-bezier(.2,.8,.2,1)}
.hb-email:hover{background-size:100% 1px}
.hb-hint{font-size:11px;color:var(--hb-muted);margin:-6px 0 14px;min-height:14px;transition:color .2s}
.hb-hint[data-on="true"]{color:var(--hb-ink)}

.hb-offer{background:var(--hb-panel);color:var(--hb-panel-ink);transition:background-color .45s,color .45s}
.hb-offer .hb-label{color:var(--hb-panel-muted)}
.hb-offer .hb-corner{color:var(--hb-panel-muted)}
.hb-offer .hb-corner-link:hover .hb-corner{color:var(--hb-panel-ink)}
.hb-offer-title{font-size:clamp(26px,3cqw,34px);font-weight:700;line-height:1.04;letter-spacing:-.025em;margin:clamp(20px,5cqw,64px) 0 14px;white-space:pre-line}
.hb-offer .hb-desc{color:var(--hb-panel-muted)}
.hb-tags{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:22px}
.hb-tag{border:1px solid var(--hb-panel-line);padding:6px 9px;font-size:11.5px;font-weight:500;line-height:1;color:var(--hb-panel-ink);transition:background-color .2s,color .2s,border-color .2s}
.hb-tag:hover{border-color:var(--hb-panel-ink)}
.hb-tag[aria-pressed="true"]{background:var(--hb-panel-ink);color:var(--hb-panel);border-color:var(--hb-panel-ink)}
.hb-form{display:flex;flex-direction:column;gap:9px}
.hb-field{width:100%;border:1px solid var(--hb-panel-line);background:transparent;padding:11px 12px;font-size:13px;color:var(--hb-panel-ink);outline:none;transition:border-color .2s}
.hb-field::placeholder{color:var(--hb-panel-muted)}
.hb-field:focus{border-color:var(--hb-panel-ink)}
.hb-field[aria-invalid="true"]{border-color:var(--hb-err)}
.hb-join{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;background:var(--hb-panel-ink);color:var(--hb-panel);padding:12px;font-size:13px;font-weight:700;transition:transform .22s cubic-bezier(.2,.8,.2,1),box-shadow .22s cubic-bezier(.2,.8,.2,1),opacity .2s}
.hb-join:hover{transform:translate(-2px,-2px);box-shadow:3px 3px 0 var(--hb-accent)}
.hb-join:disabled{opacity:.6;cursor:progress;transform:none;box-shadow:none}
.hb-err{font-size:11.5px;color:var(--hb-err);min-height:15px}
.hb-done{border:1px solid var(--hb-panel-line);padding:14px;font-size:13px;line-height:1.5;animation:hb-rise .5s cubic-bezier(.2,.8,.2,1) both}
.hb-done b{display:flex;align-items:center;gap:8px;font-size:14px;margin-bottom:4px}
.hb-tick{display:inline-grid;place-items:center;width:18px;height:18px;background:var(--hb-accent);color:#0c0c0b;font-size:11px}
.hb-again{margin-top:10px;font-size:11.5px;color:var(--hb-panel-muted);text-decoration:underline;text-underline-offset:3px}
.hb-again:hover{color:var(--hb-panel-ink)}
.hb-foot-note{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:auto;padding-top:26px;font-size:11px;color:var(--hb-panel-muted)}
.hb-spots{display:flex;gap:4px}
.hb-spot{width:7px;height:7px;border:1px solid var(--hb-panel-muted)}
.hb-spot[data-on="true"]{background:var(--hb-accent);border-color:var(--hb-accent)}

.hb-a-mail{flex-direction:row;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:16px 32px}
.hb-mail-main{flex:1 1 360px;min-width:0}
.hb-mail-main .hb-desc{max-width:78ch}
.hb-mform{display:flex;gap:0;animation:hb-rise .4s cubic-bezier(.2,.8,.2,1) both}
.hb-mfield{width:min(260px,60vw);border:1px solid var(--hb-ink);border-right:0;background:transparent;padding:0 12px;font-size:12.5px;outline:none;color:var(--hb-ink)}
.hb-mfield::placeholder{color:var(--hb-muted)}
.hb-mfield[aria-invalid="true"]{border-color:var(--hb-err)}
.hb-mside{display:flex;flex-direction:column;align-items:flex-end;gap:6px}
.hb-mside .hb-err{color:var(--hb-muted)}
.hb-mail-done{display:inline-flex;align-items:center;gap:8px;font-size:12.5px;font-weight:600;border:1px solid var(--hb-line);padding:9px 13px;animation:hb-rise .4s cubic-bezier(.2,.8,.2,1) both}

.hb-foot{width:100%;max-width:var(--hb-max,1120px);display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 20px;margin-top:14px;font-size:11.5px;color:var(--hb-muted);animation:hb-rise .8s .7s cubic-bezier(.2,.7,.2,1) both}
.hb-clock{display:inline-flex;align-items:center;gap:7px;font-variant-numeric:tabular-nums}
.hb-clock i{width:5px;height:5px;background:var(--hb-accent);animation:hb-blink 2s steps(2,end) infinite}
.hb-theme{display:inline-flex;align-items:center;gap:7px;color:var(--hb-muted);transition:color .2s}
.hb-theme:hover{color:var(--hb-ink)}
.hb-theme svg{transition:transform .5s cubic-bezier(.2,.8,.2,1)}
.hb-root[data-theme="dark"] .hb-theme svg{transform:rotate(180deg)}

.hb-toast{position:fixed;left:50%;bottom:24px;z-index:60;transform:translate(-50%,14px);opacity:0;background:var(--hb-ink);color:var(--hb-paper);padding:10px 14px;font-size:12.5px;font-weight:600;pointer-events:none;box-shadow:3px 3px 0 var(--hb-accent);transition:opacity .25s,transform .3s cubic-bezier(.2,.8,.2,1)}
.hb-toast[data-on="true"]{opacity:1;transform:translate(-50%,0)}

@keyframes hb-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes hb-up{from{transform:translateY(110%)}to{transform:none}}
@keyframes hb-pulse{0%{transform:scale(1);opacity:.5}80%,100%{transform:scale(3);opacity:0}}
@keyframes hb-blink{0%{opacity:1}100%{opacity:.25}}
@media (prefers-reduced-motion:reduce){.hb-cell,.hb-ch,.hb-foot,.hb-done,.hb-mform,.hb-mail-done,.hb-clock i{animation:none}.hb-pulse{animation:none;opacity:0}.hb-root :where(*){transition-duration:.01ms}}
`

/* ------------------------------------------------------------------ hooks */

const useIsoLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect

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

function useInView(ref: React.RefObject<Element | null>): boolean {
  const [seen, setSeen] = React.useState(false)
  React.useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    if (typeof IntersectionObserver !== "function") {
      setSeen(true)
      return
    }
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && setSeen(true), { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, seen])
  return seen
}

/* ------------------------------------------------------------------ marks */

function CornerArrow() {
  return (
    <svg className="hb-corner" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <path d="M3.5 12.5 12.5 3.5M5.5 3.5h7v7" />
    </svg>
  )
}

function ThemeMark() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 1.5a6.5 6.5 0 0 1 0 13z" fill="currentColor" />
    </svg>
  )
}

/* ------------------------------------------------------------------ parts */

// The ring badge: text on a circle around a status dot. It turns on its own,
// three times faster under the pointer, and can be grabbed and flicked.
function Ring({ text, available, reduced, uid }: { text: string; available: boolean; reduced: boolean; uid: string }) {
  const svgRef = React.useRef(null as SVGSVGElement | null)
  const gRef = React.useRef(null as SVGGElement | null)
  const st = React.useRef({ a: -90, v: 0, base: 0, hover: false, drag: false, last: 0, lastT: 0 })
  const label = ringText(text)
  const fs = ringFontSize(label.length)

  React.useEffect(() => {
    let raf = 0
    let prev = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000)
      prev = now
      const s = st.current
      const target = reduced ? 0 : s.hover ? 54 : 16
      s.base += (target - s.base) * Math.min(1, dt * 4)
      if (!s.drag) {
        s.a += (s.base + s.v) * dt
        s.v *= Math.pow(0.05, dt)
        if (Math.abs(s.v) < 0.5) s.v = 0
      }
      gRef.current?.setAttribute("transform", "rotate(" + s.a.toFixed(2) + " 60 60)")
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [reduced])

  const angleAt = (e: React.PointerEvent) => {
    const r = svgRef.current!.getBoundingClientRect()
    return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI
  }

  return (
    <svg
      ref={svgRef}
      className="hb-ring"
      viewBox="0 0 120 120"
      role="img"
      aria-label={text}
      onPointerEnter={() => (st.current.hover = true)}
      onPointerLeave={() => (st.current.hover = false)}
      onPointerDown={(e) => {
        const s = st.current
        s.drag = true
        s.v = 0
        s.last = angleAt(e)
        s.lastT = performance.now()
        e.currentTarget.setPointerCapture?.(e.pointerId)
      }}
      onPointerMove={(e) => {
        const s = st.current
        if (!s.drag) return
        const a = angleAt(e)
        const d = angleDelta(s.last, a)
        const now = performance.now()
        const dt = Math.max(8, now - s.lastT) / 1000
        s.a += d
        s.v = clamp(s.v * 0.4 + (d / dt) * 0.6, -1800, 1800)
        s.last = a
        s.lastT = now
      }}
      onPointerUp={(e) => {
        const s = st.current
        s.drag = false
        if (reduced || performance.now() - s.lastT > 90) s.v = 0
        e.currentTarget.releasePointerCapture?.(e.pointerId)
      }}
      onPointerCancel={() => {
        st.current.drag = false
        st.current.v = 0
      }}
    >
      <defs>
        <path id={uid + "ring"} d="M60 60m-44 0a44 44 0 1 1 88 0a44 44 0 1 1-88 0" />
      </defs>
      <g ref={gRef} transform="rotate(-90 60 60)">
        <text className="hb-ring-text" style={{ fontSize: fs + "px" }}>
          <textPath href={"#" + uid + "ring"} textLength="274" lengthAdjust="spacing">
            {label}
          </textPath>
        </text>
      </g>
      {available ? <circle className="hb-pulse" cx="60" cy="60" r="5.5" /> : null}
      <circle className="hb-dot" data-off={available ? undefined : "true"} cx="60" cy="60" r="5.5" />
    </svg>
  )
}

function CountUp({ text, run, reduced }: { text: string; run: boolean; reduced: boolean }) {
  const [t, setT] = React.useState(0)
  React.useEffect(() => {
    if (!run) return
    if (reduced) {
      setT(1)
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1400)
      setT(p)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [run, reduced])
  return (
    <span>
      <span className="hb-sr">{text}</span>
      <span aria-hidden="true">
        {splitNumbers(text).map((p, i) =>
          p.num ? (
            <span key={i} className="hb-num">
              {countValue(Number(p.value), t)}
            </span>
          ) : (
            <React.Fragment key={i}>{p.value}</React.Fragment>
          ),
        )}
      </span>
    </span>
  )
}

/* -------------------------------------------------------------- component */

export default function HairlineBentoPortfolio({
  name = "Mira Nowak",
  nameLines,
  role = "UX Designer & Mentor",
  location = "Kraków",
  badges,
  available = true,
  ringText: ring = "Building this site with Claude Code and Figma AI",
  email = "mira.nowak@example.com",
  findMe,
  connect,
  about,
  product,
  art,
  contact,
  offer,
  newsletter,
  onJoinWaitlist,
  onSubscribe,
  timeZone = "Europe/Warsaw",
  footer,
  accent = "#22c55e",
  paper,
  fonts,
  displayStretch,
  defaultTheme = "system",
  onThemeChange,
  maxWidth = "1120px",
  height = "100svh",
  className = "",
}: HairlineBentoPortfolioProps) {
  const uid = "hb" + React.useId().replace(/[^a-zA-Z0-9]/g, "")
  const reduced = useReducedMotion()

  const F = { ...D_FIND, ...findMe }
  const C = { ...D_CONNECT, ...connect }
  const A = { ...D_ABOUT, ...about }
  const P = { ...D_PRODUCT, ...product }
  const R = { ...D_ART, ...art }
  const K = { ...D_CONTACT, ...contact }
  const O = { ...D_OFFER, ...offer }
  const N = { ...D_NEWS, ...newsletter }
  const chips = badges ?? [available ? "Available for work" : "Booked for now", location + " / Remote"]
  const lines = splitName(name, nameLines)
  const stretch = displayStretch ?? (fonts?.display ? 1 : 1.32)

  /* theme: "system" follows the host's .dark class first, then the OS */
  const [theme, setTheme] = React.useState((defaultTheme === "dark" ? "dark" : "light") as Theme)
  const [themeTouched, setThemeTouched] = React.useState(false)
  React.useEffect(() => {
    if (defaultTheme !== "system" || themeTouched) return
    const read = () =>
      setTheme(
        document.documentElement.classList.contains("dark") ||
          (typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches)
          ? "dark"
          : "light",
      )
    read()
    const mo = new MutationObserver(read)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    const mq = typeof matchMedia === "function" ? matchMedia("(prefers-color-scheme: dark)") : null
    mq?.addEventListener?.("change", read)
    return () => {
      mo.disconnect()
      mq?.removeEventListener?.("change", read)
    }
  }, [defaultTheme, themeTouched])
  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark"
    setThemeTouched(true)
    setTheme(next)
    onThemeChange?.(next)
  }

  /* the display name fits its cell: each line measured once at 100px */
  const nameBox = React.useRef(null as HTMLDivElement | null)
  const measures = React.useRef([] as (HTMLSpanElement | null)[])
  const [fontPx, setFontPx] = React.useState(0)
  const linesKey = lines.join("|")
  useIsoLayoutEffect(() => {
    const box = nameBox.current
    if (!box) return
    const run = () => {
      const widths = measures.current.slice(0, lines.length).map((el) => (el ? el.offsetWidth : 0))
      setFontPx(fitFont(widths, box.clientWidth, stretch, 28, 112))
    }
    run()
    let alive = true
    document.fonts?.ready.then(() => alive && run())
    if (typeof ResizeObserver !== "function") return
    const ro = new ResizeObserver(run)
    ro.observe(box)
    return () => {
      alive = false
      ro.disconnect()
    }
  }, [linesKey, stretch, fonts?.display])

  /* About counts up the first time it's seen */
  const aboutRef = React.useRef(null as HTMLDivElement | null)
  const aboutSeen = useInView(aboutRef)

  /* footer clock, client-only so server and client agree */
  const [clock, setClock] = React.useState("")
  React.useEffect(() => {
    const t = () => setClock(formatClock(new Date(), timeZone))
    t()
    const id = window.setInterval(t, 15000)
    return () => window.clearInterval(id)
  }, [timeZone])

  /* toast */
  const [toast, setToast] = React.useState("")
  const toastTimer = React.useRef(0)
  const flash = (msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(""), 1800)
  }
  React.useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const [copied, setCopied] = React.useState(false)
  const copyEmail = () => {
    const ok = () => {
      setCopied(true)
      flash("Email copied")
      window.setTimeout(() => setCopied(false), 1800)
    }
    try {
      const p = navigator.clipboard?.writeText(email)
      if (p) p.then(ok, () => flash(email))
      else flash(email)
    } catch {
      flash(email)
    }
  }

  /* waitlist */
  const [picked, setPicked] = React.useState([] as string[])
  const [wlEmail, setWlEmail] = React.useState("")
  const [wl, setWl] = React.useState("idle" as Status)
  const [wlMsg, setWlMsg] = React.useState("")
  const toggleTag = (t: string) => setPicked((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]))
  const joinWaitlist = async (e: React.FormEvent) => {
    e.preventDefault()
    if (wl === "loading") return
    if (!isEmail(wlEmail)) {
      setWl("error")
      setWlMsg("That email doesn’t look quite right.")
      return
    }
    setWl("loading")
    setWlMsg("")
    try {
      const topics = O.tags.filter((t) => picked.includes(t))
      if (onJoinWaitlist) await onJoinWaitlist({ email: wlEmail.trim(), topics })
      else await new Promise((r) => setTimeout(r, 650))
      setWl("done")
      flash("You’re on the waitlist")
    } catch {
      setWl("error")
      setWlMsg("Couldn’t save that — try again in a moment.")
    }
  }

  /* mailing list */
  const mailInput = React.useRef(null as HTMLInputElement | null)
  const [mailOpen, setMailOpen] = React.useState(false)
  const [mlEmail, setMlEmail] = React.useState("")
  const [ml, setMl] = React.useState("idle" as Status)
  const [mlMsg, setMlMsg] = React.useState("")
  React.useEffect(() => {
    if (mailOpen) mailInput.current?.focus()
  }, [mailOpen])
  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (ml === "loading") return
    if (!isEmail(mlEmail)) {
      setMl("error")
      setMlMsg("Check that email.")
      return
    }
    setMl("loading")
    setMlMsg("")
    try {
      if (onSubscribe) await onSubscribe(mlEmail.trim())
      else await new Promise((r) => setTimeout(r, 550))
      setMl("done")
      flash("Subscribed — see you soon")
    } catch {
      setMl("error")
      setMlMsg("Couldn’t subscribe — try again.")
    }
  }

  const style = {
    minHeight: height,
    "--hb-accent": accent,
    "--hb-max": maxWidth,
    "--hb-stretch": String(stretch),
    ...(paper ? { "--hb-paper-light": paper } : null),
    ...(fonts?.display ? { "--hb-display": fonts.display } : null),
    ...(fonts?.body ? { "--hb-sans": fonts.body } : null),
  } as React.CSSProperties

  const year = new Date().getFullYear()
  let ci = 0

  return (
    <div className={"hb-root " + className} data-theme={theme} style={style}>
      <style>{HB_CSS}</style>

      <div className="hb-wrap">
        <section className="hb-grid" aria-label={name + " — portfolio"}>
          {/* hero */}
          <div className="hb-cell hb-a-hero" style={{ "--i": 0 } as React.CSSProperties}>
            <div className="hb-hero-main">
              <p className="hb-label">{role}</p>
              <div ref={nameBox} className="hb-namebox">
                {lines.map((l, i) => (
                  <span key={"m" + i} ref={(el) => void (measures.current[i] = el)} className="hb-measure" aria-hidden="true">
                    {l}
                  </span>
                ))}
                <h1 className="hb-name" style={fontPx ? { fontSize: fontPx + "px" } : undefined} aria-label={name}>
                  {lines.map((l, i) => (
                    <span key={i} className="hb-nl" aria-hidden="true">
                      <span className="hb-nl-in">
                        {Array.from(l).map((ch, j) => (
                          <span key={j} className="hb-ch" style={{ "--c": ci++ } as React.CSSProperties}>
                            {ch === " " ? " " : ch}
                          </span>
                        ))}
                      </span>
                    </span>
                  ))}
                </h1>
              </div>
              <ul className="hb-chips">
                {chips.map((c, i) => (
                  <li key={i} className="hb-chip">
                    {i === 0 ? <span className="hb-chip-dot" data-off={available ? undefined : "true"} aria-hidden="true" /> : null}
                    {c}
                  </li>
                ))}
              </ul>
            </div>
            <Ring text={ring} available={available} reduced={reduced} uid={uid} />
          </div>

          {/* find me */}
          <div className="hb-cell hb-a-find" style={{ "--i": 1 } as React.CSSProperties}>
            <p className="hb-label">{F.label}</p>
            <div className="hb-push">
              <h2 className="hb-title">{F.title}</h2>
              <p className="hb-desc">{F.description}</p>
              <a className="hb-btn hb-btn-solid" href={F.href} target="_blank" rel="noreferrer">
                <span className="hb-arr">→</span>
                {F.cta}
              </a>
            </div>
          </div>

          {/* offer panel */}
          <div className="hb-cell hb-offer hb-a-offer" style={{ "--i": 2 } as React.CSSProperties}>
            <div className="hb-label">
              <span>{O.label}</span>
              {O.href ? (
                <a className="hb-corner-link" href={O.href} aria-label={O.title.replace(/\n/g, " ")}>
                  <CornerArrow />
                </a>
              ) : null}
            </div>
            <h2 className="hb-offer-title">{O.title}</h2>
            <p className="hb-desc">{O.description}</p>
            {wl === "done" ? (
              <div className="hb-done" role="status">
                <b>
                  <span className="hb-tick" aria-hidden="true">
                    ✓
                  </span>
                  You’re on the list.
                </b>
                {picked.length ? "Noted: " + O.tags.filter((t) => picked.includes(t)).join(", ") + ". " : ""}
                I’ll write to {wlEmail.trim()} when a spot opens.
                <div>
                  <button
                    type="button"
                    className="hb-again"
                    onClick={() => {
                      setWl("idle")
                      setWlEmail("")
                    }}
                  >
                    Use another email
                  </button>
                </div>
              </div>
            ) : (
              <form className="hb-form" onSubmit={joinWaitlist} noValidate>
                {O.tags.length ? (
                  <div className="hb-tags" role="group" aria-label="What would help most?">
                    {O.tags.map((t) => (
                      <button key={t} type="button" className="hb-tag" aria-pressed={picked.includes(t)} onClick={() => toggleTag(t)}>
                        {t}
                      </button>
                    ))}
                  </div>
                ) : null}
                <label className="hb-sr" htmlFor={uid + "wl"}>
                  Email for the waitlist
                </label>
                <input
                  id={uid + "wl"}
                  className="hb-field"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder={O.placeholder}
                  value={wlEmail}
                  aria-invalid={wl === "error" ? true : undefined}
                  aria-describedby={uid + "wlm"}
                  onChange={(e) => {
                    setWlEmail(e.target.value)
                    if (wl === "error") setWl("idle")
                  }}
                />
                <button type="submit" className="hb-join" disabled={wl === "loading"}>
                  {wl === "loading" ? "Joining…" : O.cta}
                  {wl === "loading" ? null : <span className="hb-arr">→</span>}
                </button>
                <p id={uid + "wlm"} className="hb-err" aria-live="polite">
                  {wl === "error" ? wlMsg : ""}
                </p>
              </form>
            )}
            <div className="hb-foot-note">
              <span>{O.footnote}</span>
              {O.spots ? (
                <span className="hb-spots" role="img" aria-label={O.spots.left + " of " + O.spots.total + " spots left"}>
                  {Array.from({ length: clamp(O.spots.total, 0, 12) }, (_, i) => (
                    <span key={i} className="hb-spot" data-on={i < O.spots!.left ? "true" : undefined} />
                  ))}
                </span>
              ) : null}
            </div>
          </div>

          {/* linkedin */}
          <a className="hb-cell hb-a-li" href={C.href} target="_blank" rel="noreferrer" style={{ "--i": 3 } as React.CSSProperties}>
            <span className="hb-label">
              <span>{C.label}</span>
              <CornerArrow />
            </span>
            <span className="hb-push">
              <span className="hb-title" style={{ display: "block" }}>
                {C.title}
              </span>
              <span className="hb-desc" style={{ display: "block" }}>
                {C.description}
              </span>
            </span>
          </a>

          {/* about */}
          <div ref={aboutRef} className="hb-cell hb-a-about" style={{ "--i": 4 } as React.CSSProperties}>
            <p className="hb-label">{A.label}</p>
            <h2 className="hb-head">
              {A.headline.map((h, i) => (
                <CountUp key={i} text={h} run={aboutSeen} reduced={reduced} />
              ))}
            </h2>
            <p className="hb-desc" style={{ maxWidth: "70ch" }}>
              {A.body}
            </p>
          </div>

          {/* product */}
          <div className="hb-cell hb-a-tpl" style={{ "--i": 5 } as React.CSSProperties}>
            <p className="hb-label">{P.label}</p>
            <h2 className="hb-title">{P.title}</h2>
            <p className="hb-desc">{P.description}</p>
            <a className="hb-btn hb-push" href={P.href} target="_blank" rel="noreferrer">
              <span className="hb-arr hb-arr-ne">↗</span>
              {P.cta}
            </a>
          </div>

          {/* art */}
          <div className="hb-cell hb-a-art" style={{ "--i": 6 } as React.CSSProperties}>
            <p className="hb-label">{R.label}</p>
            <h2 className="hb-title">{R.title}</h2>
            <p className="hb-desc">{R.description}</p>
            <a className="hb-btn hb-btn-solid hb-push" href={R.href} target="_blank" rel="noreferrer">
              <span className="hb-arr">→</span>
              {R.cta}
            </a>
          </div>

          {/* contact */}
          <div className="hb-cell hb-a-contact" style={{ "--i": 7 } as React.CSSProperties}>
            <p className="hb-label">{K.label}</p>
            <div className="hb-push" style={{ display: "flex", flexDirection: "column" }}>
              <button type="button" className="hb-email" onClick={copyEmail} title="Copy email">
                {email}
              </button>
              <p className="hb-hint" data-on={copied ? "true" : undefined} aria-live="polite">
                {copied ? "Copied to clipboard ✓" : "Click to copy"}
              </p>
              <a className="hb-btn" href={mailtoHref(email, K.subject)}>
                {K.cta}
                <span className="hb-arr">→</span>
              </a>
            </div>
          </div>

          {/* mailing list */}
          <div className="hb-cell hb-a-mail" style={{ "--i": 8 } as React.CSSProperties}>
            <div className="hb-mail-main">
              <p className="hb-label">{N.label}</p>
              <h2 className="hb-title">{N.title}</h2>
              <p className="hb-desc">{N.description}</p>
            </div>
            <div className="hb-mside">
              {ml === "done" ? (
                <p className="hb-mail-done" role="status">
                  <span className="hb-tick" aria-hidden="true">
                    ✓
                  </span>
                  Subscribed
                </p>
              ) : mailOpen ? (
                <form className="hb-mform" onSubmit={subscribe} noValidate>
                  <label className="hb-sr" htmlFor={uid + "ml"}>
                    Email for the mailing list
                  </label>
                  <input
                    ref={mailInput}
                    id={uid + "ml"}
                    className="hb-mfield"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@studio.com"
                    value={mlEmail}
                    aria-invalid={ml === "error" ? true : undefined}
                    aria-describedby={uid + "mlm"}
                    onChange={(e) => {
                      setMlEmail(e.target.value)
                      if (ml === "error") setMl("idle")
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setMailOpen(false)
                        setMl("idle")
                      }
                    }}
                  />
                  <button type="submit" className="hb-btn hb-btn-solid" disabled={ml === "loading"}>
                    {ml === "loading" ? "…" : N.cta}
                    <span className="hb-arr">→</span>
                  </button>
                </form>
              ) : (
                <button type="button" className="hb-btn" onClick={() => setMailOpen(true)}>
                  {N.cta}
                  <span className="hb-arr">→</span>
                </button>
              )}
              <p id={uid + "mlm"} className="hb-err" aria-live="polite">
                {ml === "error" ? mlMsg : ""}
              </p>
            </div>
          </div>
        </section>
      </div>

      <footer className="hb-foot">
        <span>{footer ?? "© " + year + " " + name + " — drawn on a grid, one hairline at a time."}</span>
        <span className="hb-clock" aria-label={clock ? location + ", local time " + clock : undefined}>
          <i aria-hidden="true" />
          {location} {clock || "--:--"}
        </span>
        <button type="button" className="hb-theme" onClick={toggleTheme} aria-label={"Switch to " + (theme === "dark" ? "light" : "dark") + " theme"}>
          <ThemeMark />
          {theme === "dark" ? "Dark" : "Light"}
        </button>
      </footer>

      <div className="hb-toast" data-on={toast ? "true" : undefined} role="status" aria-live="polite">
        {toast}
      </div>
    </div>
  )
}
