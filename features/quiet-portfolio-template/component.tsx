"use client"

// Quiet Portfolio Template — a whole minimal personal site in one component.
// A floating pill nav (Home / Essays / ⌘K / theme), a hand-drawn avatar next to
// a one-line intro, the current role with every previous one folded underneath,
// a "what I do" note, a list of recent work that opens in place and shows a
// generated cover under the pointer, an essay index with a reader, a command
// palette over all of it, and a footer that keeps your local time.
//
// Everything is drawn in this file: the avatar and project covers are SVG, the
// type is the system stack, and nothing loads at runtime. Pass your own content
// through props; every section hides itself when you leave it empty.
import * as React from "react"

export type QuietRole = {
  title: string
  company: string
  period: string
  location?: string
  href?: string
}

export type QuietProject = {
  name: string
  description?: string
  year?: string
  tags?: string[]
  href?: string
  /** 0–360. Tints the generated cover; derived from the name when omitted. */
  hue?: number
}

export type QuietEssay = {
  slug: string
  title: string
  /** ISO date, e.g. "2026-08-14". */
  date: string
  summary?: string
  /** One string per block. "## " starts a heading, "> " a quote, "- " a list item. */
  body: string[]
}

export type QuietLink = { label: string; href: string }

export interface QuietPortfolioTemplateProps {
  /** First name, bold in the intro. */
  name?: string
  /** Used in the footer and the avatar's alt text. Defaults to `name`. */
  fullName?: string
  tagline?: string
  location?: string
  email?: string
  /** An image URL, your own node, or nothing for the drawn portrait. */
  avatar?: string | React.ReactNode
  /** A short line under the avatar's dot, e.g. "Open to new projects". Empty hides the dot. */
  status?: string
  currentRole?: QuietRole | null
  previousRoles?: QuietRole[]
  about?: React.ReactNode
  projects?: QuietProject[]
  essays?: QuietEssay[]
  socials?: QuietLink[]
  /** IANA zone for the footer clock. */
  timeZone?: string
  /** Used sparingly: focus rings, the status dot, the palette's active row. */
  accent?: string
  defaultTheme?: "system" | "light" | "dark"
  onThemeChange?: (theme: "light" | "dark") => void
  /** Minimum height of the page. A definite length, so it survives any host layout. */
  height?: string
  className?: string
}

// #region content
const DEFAULT_ROLE: QuietRole = {
  title: "Product Marketing & Comms",
  company: "Fieldnote",
  period: "2024 – Present",
  location: "Berlin",
}

const DEFAULT_PREVIOUS: QuietRole[] = [
  { title: "Senior Product Marketing Manager", company: "Parcelwise", period: "2022 – 2024", location: "Berlin" },
  { title: "Product Marketing Manager", company: "Loop Labs", period: "2020 – 2022", location: "Amsterdam" },
  { title: "Growth & Content Lead", company: "Quietly", period: "2019 – 2020", location: "Remote" },
  { title: "Communications Associate", company: "Brightline Health", period: "2017 – 2019", location: "Bengaluru" },
  { title: "Frontend Developer", company: "Studio Sable", period: "2015 – 2017", location: "Bengaluru" },
]

const DEFAULT_PROJECTS: QuietProject[] = [
  { name: "Dot", description: "A one-dot habit tracker that lives in your menu bar and nowhere else.", year: "2026", tags: ["macOS", "Swift"], hue: 18 },
  { name: "Kiez Alerts", description: "A live map of emergencies and transit disruptions, street by street.", year: "2025", tags: ["Maps", "Open data"], hue: 350 },
  { name: "Lowtide Radio", description: "Ambient internet radio for deep work. 300k listeners a month.", year: "2024", tags: ["Audio", "Community"], hue: 200 },
  { name: "Hours", description: "Time zones for teams that never sleep at the same time.", year: "2024", tags: ["Web", "Teams"], hue: 262 },
  { name: "Scoop", description: "One email a morning with the launches worth your five minutes.", year: "2023", tags: ["Newsletter"], hue: 42 },
  { name: "Proofsheet", description: "Polished product screenshots without opening a design tool.", year: "2023", tags: ["Tool", "Design"], hue: 150 },
  { name: "Peek", description: "An AI that tells you what a link says before you click it.", year: "2025", tags: ["AI", "Extension"], hue: 300 },
]

const DEFAULT_ESSAYS: QuietEssay[] = [
  {
    slug: "positioning-is-a-decision",
    title: "Positioning is a decision, not a sentence",
    date: "2026-08-14",
    summary: "Most positioning work fails because nobody is willing to lose anything.",
    body: [
      "Every team I have worked with has a positioning statement. Almost none of them have a position. The statement is a sentence somebody wrote in a workshop; the position is the set of customers you are willing to disappoint.",
      "## The test",
      "Read your homepage headline and ask who it turns away. If the honest answer is nobody, you have written a sentence, not made a decision.",
      "> Clarity is what is left after you remove everything you were afraid to say no to.",
      "The work is not wordsmithing. It is sitting with the sales team, the product team and the founder until everyone agrees on the one thing you will be known for, and the three things you will quietly stop mentioning.",
      "Once that is settled, the copy nearly writes itself.",
    ],
  },
  {
    slug: "the-launch-is-the-least-interesting-day",
    title: "The launch is the least interesting day",
    date: "2026-05-02",
    summary: "The day you ship is loud. The thirty days after it are where the story is decided.",
    body: [
      "Launch days are loud and short. Everyone refreshes the same dashboards, the numbers spike, and by Thursday the team is back to its backlog.",
      "The interesting part starts after that: the first support tickets, the first confused tweet, the first customer who uses the feature for something you never imagined.",
      "## What I do instead",
      "- Write the follow-up post before the launch post.",
      "- Keep a running doc of every surprising use, with names.",
      "- Ship a small improvement in week two and talk about it like it matters, because it does.",
      "A launch is a promise. The weeks after it are where you keep it.",
    ],
  },
  {
    slug: "write-the-changelog-first",
    title: "Write the changelog first",
    date: "2025-11-20",
    summary: "If you cannot explain a feature in two lines, it is not ready to be built.",
    body: [
      "Before a feature gets a ticket, I try to write its changelog entry. Two lines, plain words, no adjectives.",
      "It is a cheap test. If the entry needs a paragraph of context, the feature is probably three features. If it sounds boring, it might be exactly right.",
      "> The best changelogs read like a friend telling you something useful.",
      "It also means marketing starts on day one instead of the week before release, which is the only schedule that has ever worked for me.",
    ],
  },
  {
    slug: "taste-is-a-practice",
    title: "Taste is a practice",
    date: "2025-03-09",
    summary: "Nobody is born with taste. You collect it, one deliberate choice at a time.",
    body: [
      "People talk about taste like it is a gift. In my experience it is closer to a habit: noticing what makes you pause, and asking why.",
      "I keep a folder of things that stopped me. A receipt with perfect spacing. A train announcement that was somehow kind. A settings page that explained itself.",
      "## The only rule",
      "Write down one sentence about why each thing works. After a year, the sentences start to agree with each other, and that agreement is your taste.",
    ],
  },
]

const DEFAULT_SOCIALS: QuietLink[] = [
  { label: "X", href: "https://x.com" },
  { label: "GitHub", href: "https://github.com" },
  { label: "LinkedIn", href: "https://www.linkedin.com" },
  { label: "Read.cv", href: "https://read.cv" },
]
// #endregion content

// #region text
type Block = { kind: "h" | "quote" | "li" | "p"; text: string }

function parseBlock(line: string): Block {
  const t = line.trim()
  if (t.startsWith("## ")) return { kind: "h", text: t.slice(3).trim() }
  if (t.startsWith("> ")) return { kind: "quote", text: t.slice(2).trim() }
  if (t.startsWith("- ")) return { kind: "li", text: t.slice(2).trim() }
  return { kind: "p", text: t }
}

// Consecutive list items become one list; everything else stays one block.
function groupBlocks(lines: string[]): (Block | { kind: "list"; items: string[] })[] {
  const out: (Block | { kind: "list"; items: string[] })[] = []
  for (const line of lines) {
    const b = parseBlock(line)
    if (!b.text) continue
    const last = out[out.length - 1]
    if (b.kind === "li") {
      if (last && last.kind === "list") last.items.push(b.text)
      else out.push({ kind: "list", items: [b.text] })
    } else out.push(b)
  }
  return out
}

function readingMinutes(body: string[]): number {
  const words = body.join(" ").split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 220))
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

// Parsed by hand: `new Date("2026-08-14")` is UTC midnight and prints as the
// 13th anywhere west of Greenwich.
function formatDate(iso: string, withYear: boolean): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return iso
  const md = MONTHS[Number(m[2]) - 1] + " " + Number(m[3])
  return withYear ? md + ", " + m[1] : md
}

function yearOf(iso: string): string {
  return iso.slice(0, 4)
}
// #endregion text

// #region search
// Subsequence match: every query character in order, rewarding runs and word
// starts. -1 means no match; higher is better.
function scoreMatch(query: string, text: string): number {
  const q = query.toLowerCase().replace(/\s+/g, "")
  const t = text.toLowerCase()
  if (!q) return 0
  let score = 0
  let ti = 0
  let run = 0
  for (const ch of q) {
    const found = t.indexOf(ch, ti)
    if (found < 0) return -1
    run = found === ti ? run + 1 : 1
    const wordStart = found === 0 || /[\s\-_./&]/.test(t[found - 1])
    score += 1 + run * 2 + (wordStart ? 4 : 0) - Math.min(found - ti, 6) * 0.2
    ti = found + 1
  }
  if (t.startsWith(q)) score += 10
  return score
}

type Command = { id: string; group: string; label: string; hint?: string; keywords?: string }

function filterCommands<T extends Command>(commands: T[], query: string): T[] {
  if (!query.trim()) return commands
  return commands
    .map((c, i) => {
      const s = Math.max(scoreMatch(query, c.label), scoreMatch(query, c.keywords ?? "") - 2)
      return { c, s, i }
    })
    .filter((r) => r.s >= 0)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((r) => r.c)
}
// #endregion search

// #region art
function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
// #endregion art

const QPT_CSS = `
.qpt-root{--qpt-bg:#ffffff;--qpt-fg:#111113;--qpt-soft:#3f3f46;--qpt-muted:#6e6e76;--qpt-faint:#a1a1a9;--qpt-line:#e8e8eb;--qpt-card:#fafafa;--qpt-chip:#f1f1f3;--qpt-glass:rgba(255,255,255,.78);--qpt-shadow:0 1px 2px rgba(17,17,19,.04),0 8px 24px -12px rgba(17,17,19,.12);position:relative;isolation:isolate;background:var(--qpt-bg);color:var(--qpt-fg);font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;font-feature-settings:"cv11","ss01";-webkit-font-smoothing:antialiased;line-height:1.5;transition:background-color .35s ease,color .35s ease}
.qpt-root[data-theme="dark"]{--qpt-bg:#0c0c0e;--qpt-fg:#ededf0;--qpt-soft:#c9c9cf;--qpt-muted:#9a9aa3;--qpt-faint:#62626b;--qpt-line:#232328;--qpt-card:#131316;--qpt-chip:#1d1d21;--qpt-glass:rgba(18,18,21,.72);--qpt-shadow:0 1px 2px rgba(0,0,0,.4),0 10px 30px -12px rgba(0,0,0,.7)}
.qpt-root ::selection{background:color-mix(in srgb,var(--qpt-accent) 26%,transparent)}
.qpt-root :focus-visible{outline:2px solid var(--qpt-accent);outline-offset:2px;border-radius:6px}
.qpt-root :where(button){font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer;text-align:inherit}
.qpt-root :where(a){color:inherit;text-decoration:none}
.qpt-root :where(svg){display:block;max-width:none;flex:none}
.qpt-root :where(img){max-width:none}
.qpt-page{max-width:588px;margin:0 auto;padding:0 24px 40px}
.qpt-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}

.qpt-navwrap{position:sticky;top:16px;z-index:30;display:flex;justify-content:center;padding-top:18px;margin-bottom:64px;pointer-events:none}
.qpt-nav{pointer-events:auto;position:relative;display:flex;align-items:center;gap:2px;padding:6px;border:1px solid var(--qpt-line);border-radius:14px;background:var(--qpt-glass);backdrop-filter:saturate(1.4) blur(14px);-webkit-backdrop-filter:saturate(1.4) blur(14px);box-shadow:var(--qpt-shadow);transition:background-color .35s ease,border-color .35s ease}
.qpt-pill{position:absolute;top:6px;bottom:6px;left:0;border-radius:9px;background:var(--qpt-chip);transition:transform .45s cubic-bezier(.3,1.3,.5,1),width .45s cubic-bezier(.3,1.3,.5,1),opacity .2s}
.qpt-tab{position:relative;z-index:1;display:flex;align-items:center;gap:8px;height:34px;padding:0 14px;border-radius:9px;font-size:15px;color:var(--qpt-muted);transition:color .2s}
.qpt-tab:hover,.qpt-tab[aria-current="page"]{color:var(--qpt-fg)}
.qpt-tab[aria-current="page"]{font-weight:500}
.qpt-count{min-width:20px;height:20px;padding:0 6px;border-radius:999px;background:var(--qpt-chip);color:var(--qpt-muted);font-size:11.5px;font-weight:500;display:inline-flex;align-items:center;justify-content:center;font-variant-numeric:tabular-nums;transition:background-color .2s}
.qpt-tab[aria-current="page"] .qpt-count{background:var(--qpt-bg)}
.qpt-sep{width:1px;height:18px;background:var(--qpt-line);margin:0 12px}
.qpt-kbd{display:inline-flex;align-items:center;justify-content:center;gap:2px;height:26px;min-width:34px;padding:0 7px;border-radius:7px;background:var(--qpt-chip);color:var(--qpt-soft);font-size:12px;font-weight:500;letter-spacing:.02em;font-family:inherit;transition:transform .15s,background-color .2s}
.qpt-cmdk{display:flex;align-items:center;height:34px;padding:0 6px;border-radius:9px}
.qpt-cmdk:hover .qpt-kbd{background:var(--qpt-line)}
.qpt-cmdk:active .qpt-kbd{transform:scale(.94)}
.qpt-theme{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;color:var(--qpt-soft);transition:background-color .2s,color .2s}
.qpt-theme:hover{background:var(--qpt-chip);color:var(--qpt-fg)}
.qpt-sun-core{transition:r .45s cubic-bezier(.3,1.4,.5,1)}
.qpt-sun-moon{transition:cx .45s cubic-bezier(.3,1.4,.5,1),cy .45s cubic-bezier(.3,1.4,.5,1)}
.qpt-sun-rays{transform-origin:12px 12px;transition:transform .45s cubic-bezier(.3,1.4,.5,1),opacity .3s}
.qpt-root[data-theme="dark"] .qpt-sun-rays{transform:scale(.4) rotate(45deg);opacity:0}
.qpt-progress{position:absolute;left:14px;right:14px;bottom:-1px;height:2px;border-radius:2px;background:var(--qpt-accent);transform-origin:left;transform:scaleX(0);opacity:.9}

.qpt-intro{display:flex;align-items:flex-start;gap:24px;margin-bottom:44px}
.qpt-avatar{position:relative;width:56px;height:56px;flex:none;border-radius:999px;transition:transform .5s cubic-bezier(.3,1.4,.5,1)}
.qpt-avatar:hover{transform:rotate(-6deg) scale(1.05)}
.qpt-avatar-clip{width:56px;height:56px;border-radius:999px;overflow:hidden;box-shadow:0 0 0 1px var(--qpt-line)}
.qpt-avatar-clip>*{width:56px;height:56px;object-fit:cover}
.qpt-dot{position:absolute;right:0;bottom:1px;width:13px;height:13px;border-radius:999px;background:var(--qpt-accent);box-shadow:0 0 0 2.5px var(--qpt-bg)}
.qpt-dot::after{content:"";position:absolute;inset:0;border-radius:inherit;background:var(--qpt-accent);animation:qpt-ping 2.4s cubic-bezier(0,0,.2,1) infinite}
.qpt-intro p{margin:0;font-size:17px;line-height:1.55;color:var(--qpt-muted);text-wrap:pretty}
.qpt-intro strong{color:var(--qpt-fg);font-weight:600}
.qpt-status{display:block;margin-top:6px;font-size:13px;color:var(--qpt-faint)}
.qpt-hello{position:relative;display:inline-block}
.qpt-hello-btn{color:var(--qpt-fg);font-weight:500;background-image:linear-gradient(currentColor,currentColor);background-size:100% 1px;background-position:0 100%;background-repeat:no-repeat;padding-bottom:1px;transition:background-size .3s,color .2s}
.qpt-hello-btn:hover{color:var(--qpt-accent)}
.qpt-pop{position:absolute;left:0;top:calc(100% + 10px);z-index:25;width:236px;padding:6px;border:1px solid var(--qpt-line);border-radius:12px;background:var(--qpt-bg);box-shadow:var(--qpt-shadow);animation:qpt-pop .22s cubic-bezier(.2,.9,.3,1.2) both;transform-origin:top left}
.qpt-pop-row{display:flex;width:100%;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;font-size:14px;color:var(--qpt-fg);transition:background-color .15s}
.qpt-pop-row:hover{background:var(--qpt-chip)}
.qpt-pop-row small{margin-left:auto;font-size:12px;color:var(--qpt-faint)}
.qpt-pop-sep{height:1px;margin:6px 4px;background:var(--qpt-line)}
.qpt-pop-links{display:flex;flex-wrap:wrap;gap:4px;padding:2px 4px 4px}
.qpt-pop-links a{font-size:12.5px;color:var(--qpt-muted);padding:4px 8px;border-radius:6px;background:var(--qpt-chip);transition:color .15s}
.qpt-pop-links a:hover{color:var(--qpt-fg)}

.qpt-section{margin-bottom:44px}
.qpt-label{display:flex;align-items:center;gap:16px;margin:0 0 18px;font-size:14px;font-weight:400;letter-spacing:.08em;text-transform:uppercase;color:var(--qpt-muted)}
.qpt-label::after{content:"";flex:1;height:1px;background:var(--qpt-line)}
.qpt-card{border:1px solid var(--qpt-line);border-radius:6px;background:var(--qpt-card);transition:background-color .35s,border-color .35s}
.qpt-role{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding:15px 16px 14px}
.qpt-role-title{font-size:17px;font-weight:500;line-height:1.35}
.qpt-role-meta{margin-top:3px;font-size:13px;color:var(--qpt-muted);font-variant-numeric:tabular-nums}
.qpt-role-right{text-align:right;flex:none}
.qpt-role-co{font-size:15px;font-weight:500;line-height:1.4}
a.qpt-role-co{background-image:linear-gradient(currentColor,currentColor);background-size:0 1px;background-position:100% 100%;background-repeat:no-repeat;transition:background-size .3s}
a.qpt-role-co:hover{background-size:100% 1px;background-position:0 100%}
.qpt-more{display:inline-flex;align-items:center;gap:10px;margin:14px 0 0 12px;padding:6px 6px;border-radius:8px;font-size:15px;color:var(--qpt-muted);transition:color .2s}
.qpt-more:hover{color:var(--qpt-fg)}
.qpt-more svg{transition:transform .35s cubic-bezier(.3,1.4,.5,1)}
.qpt-more[aria-expanded="true"] svg{transform:rotate(180deg)}
.qpt-fold{display:grid;grid-template-rows:0fr;transition:grid-template-rows .45s cubic-bezier(.2,.8,.2,1)}
.qpt-fold[data-open="true"]{grid-template-rows:1fr}
.qpt-fold>div{overflow:hidden;min-height:0}
.qpt-timeline{position:relative;margin:10px 0 0;padding:0 0 0 17px;list-style:none}
.qpt-timeline::before{content:"";position:absolute;left:4px;top:18px;bottom:18px;width:1px;background:var(--qpt-line)}
.qpt-timeline li{position:relative;opacity:0;transform:translateY(-6px);transition:opacity .35s ease,transform .45s cubic-bezier(.2,.8,.2,1);transition-delay:calc(var(--i) * 45ms)}
.qpt-fold[data-open="true"] .qpt-timeline li{opacity:1;transform:none}
.qpt-timeline li::before{content:"";position:absolute;left:-16px;top:21px;width:7px;height:7px;border-radius:99px;background:var(--qpt-bg);box-shadow:inset 0 0 0 1.5px var(--qpt-faint)}
.qpt-timeline .qpt-role{padding:12px 16px 12px 12px;border-radius:6px;transition:background-color .2s}
.qpt-timeline .qpt-role:hover{background:var(--qpt-card)}
.qpt-timeline .qpt-role-title{font-size:15.5px}
.qpt-timeline .qpt-role-co{font-size:14px}

.qpt-about{padding:30px 24px 30px 25px;font-size:17px;line-height:1.72;color:var(--qpt-fg);text-wrap:pretty}
.qpt-about p{margin:0}
.qpt-about p+p{margin-top:12px}

.qpt-work{margin:0;padding:0;list-style:none}
.qpt-row{display:flex;width:100%;align-items:center;justify-content:space-between;gap:16px;padding:9px 0;font-size:17px;color:var(--qpt-fg)}
.qpt-row-name{display:flex;align-items:baseline;gap:10px;transition:transform .35s cubic-bezier(.3,1.4,.5,1)}
.qpt-row-year{font-size:13px;color:var(--qpt-faint);opacity:0;transform:translateX(-4px);transition:opacity .25s,transform .35s;font-variant-numeric:tabular-nums}
.qpt-row-arrow{color:var(--qpt-muted);transition:transform .4s cubic-bezier(.3,1.4,.5,1),color .2s}
.qpt-work li:hover .qpt-row-name,.qpt-row:focus-visible .qpt-row-name{transform:translateX(4px)}
.qpt-work li:hover .qpt-row-year,.qpt-row[aria-expanded="true"] .qpt-row-year{opacity:1;transform:none}
.qpt-work li:hover .qpt-row-arrow{color:var(--qpt-fg);transform:translateX(3px)}
.qpt-row[aria-expanded="true"] .qpt-row-arrow{transform:rotate(90deg);color:var(--qpt-fg)}
.qpt-work[data-hovering="true"] li:not(:hover) .qpt-row:not([aria-expanded="true"]){color:var(--qpt-faint)}
.qpt-row{transition:color .25s}
.qpt-detail{display:flex;gap:16px;padding:6px 0 16px 4px}
.qpt-detail-art{width:112px;height:70px;border-radius:6px;overflow:hidden;flex:none;box-shadow:0 0 0 1px var(--qpt-line)}
.qpt-detail p{margin:0 0 10px;font-size:15px;line-height:1.55;color:var(--qpt-muted)}
.qpt-tags{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.qpt-tag{font-size:12px;padding:2px 8px;border-radius:999px;background:var(--qpt-chip);color:var(--qpt-muted)}
.qpt-visit{display:inline-flex;align-items:center;gap:4px;font-size:13px;font-weight:500;color:var(--qpt-fg);margin-left:4px}
.qpt-visit:hover{color:var(--qpt-accent)}

.qpt-preview{position:fixed;left:0;top:0;z-index:40;width:216px;pointer-events:none;border-radius:10px;overflow:hidden;background:var(--qpt-bg);box-shadow:0 0 0 1px var(--qpt-line),0 18px 40px -16px rgba(0,0,0,.35);opacity:0;transition:opacity .2s ease;will-change:transform}
.qpt-preview[data-show="true"]{opacity:1}
.qpt-preview-art{width:216px;height:135px}
.qpt-preview-cap{display:flex;justify-content:space-between;gap:8px;padding:8px 10px;font-size:12px;color:var(--qpt-muted)}
.qpt-preview-cap b{color:var(--qpt-fg);font-weight:500}

.qpt-essays{margin:0;padding:0;list-style:none}
.qpt-year{display:grid;grid-template-columns:64px 1fr;gap:8px;padding:6px 0;border-top:1px solid var(--qpt-line)}
.qpt-year:first-child{border-top:0}
.qpt-year-label{padding-top:14px;font-size:13px;color:var(--qpt-faint);font-variant-numeric:tabular-nums}
.qpt-essay{display:flex;width:100%;align-items:baseline;justify-content:space-between;gap:16px;padding:12px 10px;margin:0 -10px;border-radius:8px;transition:background-color .2s}
.qpt-essay:hover{background:var(--qpt-card)}
.qpt-essay-title{font-size:17px;color:var(--qpt-fg);line-height:1.4}
.qpt-essay-sum{display:block;margin-top:3px;font-size:14px;color:var(--qpt-muted);line-height:1.5}
.qpt-essay-date{flex:none;font-size:13px;color:var(--qpt-faint);font-variant-numeric:tabular-nums}
.qpt-lede{margin:-4px 0 36px;font-size:17px;color:var(--qpt-muted);line-height:1.6}
.qpt-h1{margin:0 0 8px;font-size:30px;line-height:1.2;letter-spacing:-.02em;font-weight:600;text-wrap:balance}

.qpt-back{display:inline-flex;align-items:center;gap:6px;margin-bottom:28px;font-size:14px;color:var(--qpt-muted);transition:color .2s}
.qpt-back:hover{color:var(--qpt-fg)}
.qpt-back svg{transition:transform .3s cubic-bezier(.3,1.4,.5,1)}
.qpt-back:hover svg{transform:translateX(-3px)}
.qpt-meta{margin:0 0 36px;font-size:14px;color:var(--qpt-muted);font-variant-numeric:tabular-nums}
.qpt-prose{font-size:17px;line-height:1.75;color:var(--qpt-soft)}
.qpt-prose p{margin:0 0 20px;text-wrap:pretty}
.qpt-prose h2{margin:36px 0 12px;font-size:19px;line-height:1.35;font-weight:600;color:var(--qpt-fg);letter-spacing:-.01em}
.qpt-prose blockquote{margin:28px 0;padding:2px 0 2px 20px;border-left:2px solid var(--qpt-accent);font-size:19px;line-height:1.55;color:var(--qpt-fg)}
.qpt-prose ul{margin:0 0 20px;padding-left:20px;list-style:disc}
.qpt-prose li{margin:6px 0;padding-left:4px}
.qpt-prose li::marker{color:var(--qpt-faint)}
.qpt-pager{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:48px;padding-top:24px;border-top:1px solid var(--qpt-line)}
.qpt-pager button{display:flex;flex-direction:column;justify-content:flex-start;padding:12px 14px;border-radius:8px;border:1px solid var(--qpt-line);transition:background-color .2s,border-color .2s}
.qpt-pager button:hover{background:var(--qpt-card)}
.qpt-pager small{display:block;font-size:12px;color:var(--qpt-faint);margin-bottom:2px}
.qpt-pager span{font-size:14.5px;color:var(--qpt-fg);line-height:1.4}
.qpt-pager .qpt-next{text-align:right;align-items:flex-end;grid-column:2}

.qpt-foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px 24px;margin-top:72px;padding-top:20px;border-top:1px solid var(--qpt-line);font-size:13px;color:var(--qpt-muted)}
.qpt-foot nav{display:flex;flex-wrap:wrap;gap:4px 16px}
.qpt-foot a{transition:color .2s}
.qpt-foot a:hover{color:var(--qpt-fg)}
.qpt-clock{display:inline-flex;align-items:center;gap:8px;font-variant-numeric:tabular-nums}
.qpt-clock i{width:6px;height:6px;border-radius:9px;background:var(--qpt-faint)}
.qpt-clock i[data-day="true"]{background:#f5a524}
.qpt-foot-hint{width:100%;font-size:12px;color:var(--qpt-faint)}
.qpt-foot-hint button{color:var(--qpt-muted)}
.qpt-foot-hint button:hover{color:var(--qpt-fg)}

.qpt-overlay{position:fixed;inset:0;z-index:60;display:flex;align-items:flex-start;justify-content:center;padding:12vh 16px 16px;background:rgba(10,10,12,.28);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);animation:qpt-fade .18s ease both}
.qpt-root[data-theme="dark"] .qpt-overlay{background:rgba(0,0,0,.55)}
.qpt-palette{width:100%;max-width:540px;border:1px solid var(--qpt-line);border-radius:14px;background:var(--qpt-bg);color:var(--qpt-fg);box-shadow:0 30px 80px -20px rgba(0,0,0,.45);overflow:hidden;animation:qpt-pop .24s cubic-bezier(.2,.9,.3,1.15) both;transform-origin:top center}
.qpt-search{display:flex;align-items:center;gap:10px;padding:0 16px;border-bottom:1px solid var(--qpt-line);color:var(--qpt-muted)}
.qpt-search input{flex:1;height:52px;border:0;outline:0;background:transparent;color:var(--qpt-fg);font:inherit;font-size:16px;caret-color:var(--qpt-accent)}
.qpt-search input:focus-visible{outline:none}
.qpt-search input::placeholder{color:var(--qpt-faint)}
.qpt-list{max-height:min(380px,52vh);overflow-y:auto;padding:6px;overscroll-behavior:contain}
.qpt-group{padding:10px 10px 6px;font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--qpt-faint)}
.qpt-item{position:relative;display:flex;width:100%;align-items:center;gap:12px;padding:10px 12px;border-radius:9px;font-size:15px;color:var(--qpt-soft)}
.qpt-item[aria-selected="true"]{background:var(--qpt-chip);color:var(--qpt-fg)}
.qpt-item[aria-selected="true"]::before{content:"";position:absolute;left:0;top:10px;bottom:10px;width:2px;border-radius:2px;background:var(--qpt-accent)}
.qpt-item-icon{width:18px;height:18px;display:flex;align-items:center;justify-content:center;color:var(--qpt-muted)}
.qpt-item-hint{margin-left:auto;font-size:12.5px;color:var(--qpt-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:45%}
.qpt-empty{padding:28px 16px;text-align:center;font-size:14px;color:var(--qpt-muted)}
.qpt-keys{display:flex;gap:16px;padding:10px 16px;border-top:1px solid var(--qpt-line);font-size:12px;color:var(--qpt-faint)}
.qpt-keys span{display:inline-flex;align-items:center;gap:6px}
.qpt-keys .qpt-kbd{height:20px;min-width:20px;padding:0 5px;font-size:11px;border-radius:5px}

.qpt-toast{position:fixed;left:50%;bottom:24px;z-index:70;display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:999px;background:var(--qpt-fg);color:var(--qpt-bg);font-size:14px;box-shadow:0 12px 30px -10px rgba(0,0,0,.4);animation:qpt-toast .35s cubic-bezier(.2,.9,.3,1.2) both}

.qpt-rise{animation:qpt-rise .7s cubic-bezier(.2,.75,.2,1) both;animation-delay:calc(var(--i) * 70ms)}
@keyframes qpt-rise{from{opacity:0;transform:translateY(10px);filter:blur(4px)}to{opacity:1;transform:none;filter:none}}
@keyframes qpt-pop{from{opacity:0;transform:translateY(-6px) scale(.97)}to{opacity:1;transform:none}}
@keyframes qpt-fade{from{opacity:0}to{opacity:1}}
@keyframes qpt-toast{from{opacity:0;transform:translate(-50%,12px) scale(.96)}to{opacity:1;transform:translate(-50%,0)}}
@keyframes qpt-ping{0%{transform:scale(1);opacity:.55}80%,100%{transform:scale(2.3);opacity:0}}
@keyframes qpt-blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
.qpt-eyes{transform-box:fill-box;transform-origin:center;animation:qpt-blink 5.5s infinite}

@media (max-width:560px){
.qpt-page{padding:0 16px 32px}
.qpt-navwrap{margin-bottom:44px}
.qpt-tab{padding:0 11px;font-size:14.5px}
.qpt-sep{margin:0 6px}
.qpt-intro{gap:16px}
.qpt-role{flex-direction:column;gap:6px}
.qpt-role-right{text-align:left;display:flex;gap:8px;align-items:baseline}
.qpt-role-right .qpt-role-meta{margin:0}
.qpt-about{padding:22px 18px}
.qpt-year{grid-template-columns:1fr;gap:0}
.qpt-year-label{padding-top:12px}
.qpt-detail-art{display:none}
.qpt-h1{font-size:26px}
}
@media (prefers-reduced-motion:reduce){
.qpt-root *,.qpt-root *::before,.qpt-root *::after{animation:none !important;transition-duration:.01ms !important}
.qpt-timeline li{opacity:1;transform:none}
}
`

type View = { name: "home" } | { name: "essays" } | { name: "essay"; slug: string }
type Theme = "light" | "dark"

export default function QuietPortfolioTemplate({
  name = "Ari",
  fullName = "Ari Novak",
  tagline = "I build, create, and tell stories that make products matter.",
  location = "Berlin",
  email = "hello@example.com",
  avatar,
  status = "Open to new projects",
  currentRole = DEFAULT_ROLE,
  previousRoles = DEFAULT_PREVIOUS,
  about = "Started out learning how to code. Got obsessed with marketing great products. Now I do product marketing and comms, helping companies tell the right story, the right way. On the side, I build my own things, like Lowtide Radio (300k monthly listeners) and other experiments. I care about taste, clarity, and the kind of design that makes you pause. Lately, I've been playing with AI to see what breaks and what sticks.",
  projects = DEFAULT_PROJECTS,
  essays = DEFAULT_ESSAYS,
  socials = DEFAULT_SOCIALS,
  timeZone = "Europe/Berlin",
  accent = "#f2682a",
  defaultTheme = "system",
  onThemeChange,
  height = "100svh",
  className,
}: QuietPortfolioTemplateProps) {
  const uid = React.useId().replace(/:/g, "")
  const rootRef = React.useRef(null as HTMLDivElement | null)
  const person = fullName || name

  const [theme, setTheme] = React.useState<Theme>(defaultTheme === "dark" ? "dark" : "light")
  const [view, setView] = React.useState<View>({ name: "home" })
  const [paletteOpen, setPaletteOpen] = React.useState(false)
  const [openProject, setOpenProject] = React.useState(null as number | null)
  const [rolesOpen, setRolesOpen] = React.useState(false)
  const [toast, setToast] = React.useState(null as { id: number; text: string } | null)
  const [mod, setMod] = React.useState("⌘")

  const sortedEssays = React.useMemo(() => [...essays].sort((a, b) => (a.date < b.date ? 1 : -1)), [essays])

  // "system" follows the host: its .dark class first (shadcn), then the OS.
  React.useEffect(() => {
    if (defaultTheme !== "system") return
    const dark =
      document.documentElement.classList.contains("dark") ||
      (typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches)
    setTheme(dark ? "dark" : "light")
  }, [defaultTheme])

  React.useEffect(() => {
    if (typeof navigator !== "undefined" && !/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) setMod("Ctrl")
  }, [])

  const toggleTheme = React.useCallback(() => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark"
      onThemeChange?.(next)
      return next
    })
  }, [onThemeChange])

  const say = React.useCallback((text: string) => setToast({ id: Date.now(), text }), [])
  React.useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])

  const copyEmail = React.useCallback(() => {
    const done = () => say("Copied " + email)
    const fallback = () => {
      const ta = document.createElement("textarea")
      ta.value = email
      ta.style.position = "fixed"
      ta.style.opacity = "0"
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand("copy")
        done()
      } catch {
        say(email)
      }
      ta.remove()
    }
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(email).then(done, fallback)
    else fallback()
  }, [email, say])

  // Changing page brings the top of the template back into view, without
  // yanking a host page that has already scrolled past it.
  const go = React.useCallback((next: View) => {
    setView(next)
    const el = rootRef.current
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: "start" })
  }, [])

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    addEventListener("keydown", onKey)
    return () => removeEventListener("keydown", onKey)
  }, [])

  const revealProject = React.useCallback(
    (i: number) => {
      go({ name: "home" })
      setOpenProject(i)
      requestAnimationFrame(() => {
        rootRef.current
          ?.querySelector('[data-qpt-project="' + i + '"]')
          ?.scrollIntoView({ block: "center", behavior: "smooth" })
      })
    },
    [go],
  )

  type Cmd = Command & { icon: React.ReactNode; run: () => void }
  const commands = React.useMemo<Cmd[]>(() => {
    const list: Cmd[] = [
      { id: "home", group: "Pages", label: "Home", icon: <HomeIcon />, run: () => go({ name: "home" }) },
    ]
    if (essays.length)
      list.push({ id: "essays", group: "Pages", label: "Essays", hint: essays.length + " posts", icon: <DocIcon />, run: () => go({ name: "essays" }) })
    for (const e of sortedEssays)
      list.push({
        id: "essay:" + e.slug,
        group: "Essays",
        label: e.title,
        hint: formatDate(e.date, true),
        keywords: e.summary,
        icon: <DocIcon />,
        run: () => go({ name: "essay", slug: e.slug }),
      })
    projects.forEach((p, i) =>
      list.push({
        id: "project:" + i,
        group: "Recent work",
        label: p.name,
        hint: p.description,
        keywords: (p.tags ?? []).join(" ") + " " + (p.description ?? ""),
        icon: <ProjectSwatch name={p.name} hue={p.hue} />,
        run: () => revealProject(i),
      }),
    )
    list.push(
      { id: "theme", group: "Actions", label: theme === "dark" ? "Switch to light theme" : "Switch to dark theme", keywords: "theme dark light mode", icon: <SunMoon theme={theme} size={16} id={uid + "c"} />, run: toggleTheme },
    )
    if (email) {
      list.push({ id: "copy", group: "Actions", label: "Copy email address", hint: email, keywords: "contact mail", icon: <CopyIcon />, run: copyEmail })
      list.push({ id: "mail", group: "Actions", label: "Send an email", hint: email, keywords: "contact hello", icon: <MailIcon />, run: () => { window.location.href = "mailto:" + email } })
    }
    for (const s of socials)
      list.push({ id: "link:" + s.href, group: "Elsewhere", label: s.label, hint: s.href.replace(/^https?:\/\/(www\.)?/, ""), icon: <OutIcon />, run: () => { window.open(s.href, "_blank", "noopener,noreferrer") } })
    return list
  }, [essays.length, sortedEssays, projects, theme, email, socials, go, revealProject, toggleTheme, copyEmail, uid])

  const activeEssay = view.name === "essay" ? sortedEssays.find((e) => e.slug === view.slug) : undefined
  const tab = view.name === "home" ? "home" : "essays"

  let i = 0 // entrance stagger
  const rise = (cls = "") => ({ className: (cls ? cls + " " : "") + "qpt-rise", style: { "--i": i++ } as React.CSSProperties })

  return (
    <div
      ref={rootRef}
      className={"qpt-root" + (className ? " " + className : "")}
      data-theme={theme}
      style={{ minHeight: height, ["--qpt-accent" as string]: accent }}
    >
      <style>{QPT_CSS}</style>

      <Nav
        tab={tab}
        essayCount={essays.length}
        onTab={(t) => go({ name: t })}
        onPalette={() => setPaletteOpen(true)}
        onTheme={toggleTheme}
        theme={theme}
        mod={mod}
        uid={uid}
        reading={!!activeEssay}
        rootRef={rootRef}
      />

      <main className="qpt-page" key={view.name === "essay" ? "essay:" + view.slug : view.name}>
        {view.name === "home" && (
          <>
            <section {...rise("qpt-intro")}>
              <div className="qpt-avatar">
                <div className="qpt-avatar-clip">
                  {typeof avatar === "string" ? (
                    <img src={avatar} alt={person} width={56} height={56} style={{ maxWidth: "none" }} />
                  ) : (
                    avatar ?? <DrawnAvatar id={uid} label={person} />
                  )}
                </div>
                {status ? <span className="qpt-dot" title={status} /> : null}
              </div>
              <div>
                <h1 className="qpt-sr">{person}</h1>
                <p>
                  <strong>Hey, I'm {name}.</strong> {tagline}
                  {location ? " Based in " + location + "." : ""}{" "}
                  {email || socials.length ? <SayHello email={email} socials={socials} onCopy={copyEmail} /> : null}
                </p>
                {status ? <span className="qpt-status">{status}</span> : null}
              </div>
            </section>

            {currentRole || previousRoles.length ? (
              <section {...rise("qpt-section")}>
                <h2 className="qpt-label">Work</h2>
                {currentRole ? (
                  <div className="qpt-card">
                    <RoleRow role={currentRole} />
                  </div>
                ) : null}
                {previousRoles.length ? (
                  <>
                    <button
                      type="button"
                      className="qpt-more"
                      aria-expanded={rolesOpen}
                      aria-controls={uid + "-roles"}
                      onClick={() => setRolesOpen((o) => !o)}
                    >
                      <ChevronIcon />
                      Previous roles
                      <span className="qpt-count">{previousRoles.length}</span>
                    </button>
                    <div className="qpt-fold" data-open={rolesOpen} id={uid + "-roles"}>
                      <div>
                        <ol className="qpt-timeline" aria-hidden={!rolesOpen}>
                          {previousRoles.map((r, k) => (
                            <li key={r.title + r.company + k} style={{ "--i": k } as React.CSSProperties}>
                              <RoleRow role={r} tabbable={rolesOpen} />
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  </>
                ) : null}
              </section>
            ) : null}

            {about ? (
              <section {...rise("qpt-section")}>
                <h2 className="qpt-label">What I do</h2>
                <div className="qpt-card qpt-about">{typeof about === "string" ? <p>{about}</p> : about}</div>
              </section>
            ) : null}

            {projects.length ? (
              <section {...rise("qpt-section")}>
                <h2 className="qpt-label">Recent work</h2>
                <ProjectList projects={projects} open={openProject} onOpen={setOpenProject} uid={uid} />
              </section>
            ) : null}
          </>
        )}

        {view.name === "essays" && (
          <>
            <h1 {...rise("qpt-h1")}>Essays</h1>
            <p {...rise("qpt-lede")}>
              Notes on positioning, launches and taste. {sortedEssays.length} so far.
            </p>
            <ul {...rise("qpt-essays")}>
              {groupByYear(sortedEssays).map(([year, list]) => (
                <li key={year} className="qpt-year">
                  <span className="qpt-year-label">{year}</span>
                  <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                    {list.map((e) => (
                      <li key={e.slug}>
                        <button type="button" className="qpt-essay" onClick={() => go({ name: "essay", slug: e.slug })}>
                          <span>
                            <span className="qpt-essay-title">{e.title}</span>
                            {e.summary ? <span className="qpt-essay-sum">{e.summary}</span> : null}
                          </span>
                          <span className="qpt-essay-date">{formatDate(e.date, false)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </>
        )}

        {view.name === "essay" && (
          activeEssay ? (
            <EssayReader
              essay={activeEssay}
              essays={sortedEssays}
              onBack={() => go({ name: "essays" })}
              onOpen={(slug) => go({ name: "essay", slug })}
              rise={rise}
            />
          ) : (
            <p className="qpt-lede">That essay has moved.</p>
          )
        )}

        <footer className="qpt-foot">
          <span>
            © {new Date().getFullYear()} {person}
          </span>
          {socials.length ? (
            <nav aria-label="Elsewhere">
              {socials.map((s) => (
                <a key={s.href + s.label} href={s.href} target="_blank" rel="noreferrer">
                  {s.label}
                </a>
              ))}
            </nav>
          ) : null}
          <Clock timeZone={timeZone} place={location} />
          <span className="qpt-foot-hint">
            <button type="button" onClick={() => setPaletteOpen(true)}>
              Press {mod === "⌘" ? "⌘" : "Ctrl "}K
            </button>{" "}
            to jump anywhere.
          </span>
        </footer>
      </main>

      {paletteOpen ? <Palette commands={commands} onClose={() => setPaletteOpen(false)} uid={uid} /> : null}

      {toast ? (
        <div key={toast.id} className="qpt-toast" role="status">
          <CheckIcon />
          {toast.text}
        </div>
      ) : null}
    </div>
  )
}

function groupByYear(essays: QuietEssay[]): [string, QuietEssay[]][] {
  const map = new Map<string, QuietEssay[]>()
  for (const e of essays) {
    const y = yearOf(e.date)
    if (!map.has(y)) map.set(y, [])
    map.get(y)!.push(e)
  }
  return [...map.entries()]
}

/* ------------------------------------------------------------------ nav */

function Nav({
  tab,
  essayCount,
  onTab,
  onPalette,
  onTheme,
  theme,
  mod,
  uid,
  reading,
  rootRef,
}: {
  tab: "home" | "essays"
  essayCount: number
  onTab: (t: "home" | "essays") => void
  onPalette: () => void
  onTheme: () => void
  theme: Theme
  mod: string
  uid: string
  reading: boolean
  rootRef: React.RefObject<HTMLDivElement | null>
}) {
  const navRef = React.useRef(null as HTMLElement | null)
  const pillRef = React.useRef(null as HTMLSpanElement | null)
  const barRef = React.useRef(null as HTMLSpanElement | null)
  const placed = React.useRef(false)

  // The active tab's pill slides between tabs rather than jumping.
  React.useLayoutEffect(() => {
    const place = () => {
      const nav = navRef.current
      const pill = pillRef.current
      const btn = nav?.querySelector<HTMLElement>('[aria-current="page"]')
      if (!nav || !pill || !btn) return
      // no slide on first paint, only between tabs
      if (!placed.current) pill.style.transition = "none"
      pill.style.width = btn.offsetWidth + "px"
      pill.style.transform = "translateX(" + btn.offsetLeft + "px)"
      if (!placed.current) {
        void pill.offsetWidth
        pill.style.transition = ""
        placed.current = true
      }
    }
    place()
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(place) : null
    if (navRef.current) ro?.observe(navRef.current)
    return () => ro?.disconnect()
  }, [tab, essayCount])

  // Reading progress: how far through the article the viewport has travelled.
  React.useEffect(() => {
    const bar = barRef.current
    if (!bar) return
    if (!reading) {
      bar.style.transform = "scaleX(0)"
      return
    }
    let raf = 0
    const update = () => {
      raf = 0
      const article = rootRef.current?.querySelector("article")
      if (!article) return
      const r = article.getBoundingClientRect()
      const total = r.height - innerHeight * 0.6
      const p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 1
      bar.style.transform = "scaleX(" + p.toFixed(4) + ")"
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    addEventListener("scroll", onScroll, { passive: true })
    addEventListener("resize", onScroll)
    return () => {
      removeEventListener("scroll", onScroll)
      removeEventListener("resize", onScroll)
      cancelAnimationFrame(raf)
    }
  }, [reading, rootRef])

  return (
    <div className="qpt-navwrap">
      <nav ref={navRef} className="qpt-nav" aria-label="Main">
        <span ref={pillRef} className="qpt-pill" aria-hidden="true" />
        <button type="button" className="qpt-tab" aria-current={tab === "home" ? "page" : undefined} onClick={() => onTab("home")}>
          Home
        </button>
        {essayCount ? (
          <button type="button" className="qpt-tab" aria-current={tab === "essays" ? "page" : undefined} onClick={() => onTab("essays")}>
            Essays
            <span className="qpt-count">{essayCount}</span>
          </button>
        ) : null}
        <span className="qpt-sep" aria-hidden="true" />
        <button type="button" className="qpt-cmdk" onClick={onPalette} aria-label="Search and commands" aria-keyshortcuts="Meta+K Control+K">
          <kbd className="qpt-kbd">{mod === "⌘" ? "⌘K" : "Ctrl K"}</kbd>
        </button>
        <span className="qpt-sep" aria-hidden="true" />
        <button
          type="button"
          className="qpt-theme"
          onClick={onTheme}
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          title={theme === "dark" ? "Light" : "Dark"}
        >
          <SunMoon theme={theme} size={18} id={uid + "n"} />
        </button>
        <span ref={barRef} className="qpt-progress" aria-hidden="true" />
      </nav>
    </div>
  )
}

/* ---------------------------------------------------------------- intro */

function SayHello({ email, socials, onCopy }: { email: string; socials: QuietLink[]; onCopy: () => void }) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef(null as HTMLSpanElement | null)

  React.useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    addEventListener("pointerdown", onDown)
    addEventListener("keydown", onKey)
    return () => {
      removeEventListener("pointerdown", onDown)
      removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <span className="qpt-hello" ref={ref}>
      <button type="button" className="qpt-hello-btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        Say hello
      </button>
      {open ? (
        <span className="qpt-pop" role="menu" style={{ display: "block" }}>
          {email ? (
            <>
              <button
                type="button"
                role="menuitem"
                className="qpt-pop-row"
                onClick={() => {
                  onCopy()
                  setOpen(false)
                }}
              >
                <CopyIcon />
                Copy email
                <small>{email.length > 16 ? email.split("@")[0] + "@…" : email}</small>
              </button>
              <a role="menuitem" className="qpt-pop-row" href={"mailto:" + email} onClick={() => setOpen(false)}>
                <MailIcon />
                Open mail app
              </a>
            </>
          ) : null}
          {email && socials.length ? <span className="qpt-pop-sep" style={{ display: "block" }} /> : null}
          {socials.length ? (
            <span className="qpt-pop-links">
              {socials.map((s) => (
                <a key={s.href + s.label} href={s.href} target="_blank" rel="noreferrer" role="menuitem">
                  {s.label}
                </a>
              ))}
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  )
}

function RoleRow({ role, tabbable = true }: { role: QuietRole; tabbable?: boolean }) {
  return (
    <div className="qpt-role">
      <div>
        <div className="qpt-role-title">{role.title}</div>
        <div className="qpt-role-meta">{role.period}</div>
      </div>
      <div className="qpt-role-right">
        {role.href ? (
          <a className="qpt-role-co" href={role.href} target="_blank" rel="noreferrer" tabIndex={tabbable ? undefined : -1}>
            {role.company}
          </a>
        ) : (
          <div className="qpt-role-co">{role.company}</div>
        )}
        {role.location ? <div className="qpt-role-meta">{role.location}</div> : null}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- projects */

function ProjectList({
  projects,
  open,
  onOpen,
  uid,
}: {
  projects: QuietProject[]
  open: number | null
  onOpen: (i: number | null) => void
  uid: string
}) {
  const [hover, setHover] = React.useState(null as number | null)
  const previewRef = React.useRef(null as HTMLDivElement | null)
  const target = React.useRef({ x: 0, y: 0 })
  const pos = React.useRef({ x: 0, y: 0 })
  const raf = React.useRef(0)
  const [fine, setFine] = React.useState(false)

  React.useEffect(() => {
    if (typeof matchMedia !== "function") return
    const mq = matchMedia("(hover: hover) and (pointer: fine)")
    const set = () => setFine(mq.matches)
    set()
    mq.addEventListener?.("change", set)
    return () => mq.removeEventListener?.("change", set)
  }, [])

  // The cover trails the pointer with a little lag, and leans into the motion.
  const tick = React.useCallback(() => {
    const el = previewRef.current
    const p = pos.current
    const t = target.current
    const dx = t.x - p.x
    p.x += dx * 0.18
    p.y += (t.y - p.y) * 0.18
    if (el) el.style.transform = "translate(" + (p.x + 22).toFixed(1) + "px," + (p.y - 70).toFixed(1) + "px) rotate(" + Math.max(-8, Math.min(8, dx * 0.08)).toFixed(2) + "deg)"
    raf.current = Math.abs(dx) + Math.abs(t.y - p.y) > 0.3 ? requestAnimationFrame(tick) : 0
  }, [])

  const onMove = (e: React.PointerEvent) => {
    target.current = { x: e.clientX, y: e.clientY }
    if (hover === null) pos.current = { ...target.current }
    if (!raf.current) raf.current = requestAnimationFrame(tick)
  }
  React.useEffect(() => () => cancelAnimationFrame(raf.current), [])
  // the card mounts after the first move; place it before it fades in
  React.useLayoutEffect(() => {
    if (hover !== null && !raf.current) raf.current = requestAnimationFrame(tick)
  }, [hover, tick])

  const shown = hover !== null && hover !== open && fine ? projects[hover] : null
  const last = React.useRef(null as QuietProject | null)
  if (shown) last.current = shown
  const card = shown ?? last.current

  return (
    <>
      <ul className="qpt-work" data-hovering={hover !== null} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        {projects.map((p, k) => {
          const isOpen = open === k
          const panel = uid + "-p" + k
          return (
            <li key={p.name + k} data-qpt-project={k} onPointerEnter={() => setHover(k)}>
              <button
                type="button"
                className="qpt-row"
                aria-expanded={isOpen}
                aria-controls={panel}
                onClick={() => onOpen(isOpen ? null : k)}
              >
                <span className="qpt-row-name">
                  {p.name}
                  {p.year ? <span className="qpt-row-year">{p.year}</span> : null}
                </span>
                <span className="qpt-row-arrow">
                  <ArrowIcon />
                </span>
              </button>
              <div className="qpt-fold" data-open={isOpen} id={panel}>
                <div>
                  <div className="qpt-detail" aria-hidden={!isOpen}>
                    <div className="qpt-detail-art">
                      <ProjectArt name={p.name} hue={p.hue} id={uid + "d" + k} />
                    </div>
                    <div>
                      {p.description ? <p>{p.description}</p> : null}
                      <div className="qpt-tags">
                        {(p.tags ?? []).map((t) => (
                          <span className="qpt-tag" key={t}>
                            {t}
                          </span>
                        ))}
                        {p.href ? (
                          <a className="qpt-visit" href={p.href} target="_blank" rel="noreferrer" tabIndex={isOpen ? undefined : -1}>
                            Visit <OutIcon />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
      {fine && card ? (
        <div ref={previewRef} className="qpt-preview" data-show={!!shown} aria-hidden="true">
          <div className="qpt-preview-art">
            <ProjectArt name={card.name} hue={card.hue} id={uid + "pv"} />
          </div>
          <div className="qpt-preview-cap">
            <b>{card.name}</b>
            <span>{card.year}</span>
          </div>
        </div>
      ) : null}
    </>
  )
}

/* --------------------------------------------------------------- essays */

function EssayReader({
  essay,
  essays,
  onBack,
  onOpen,
  rise,
}: {
  essay: QuietEssay
  essays: QuietEssay[]
  onBack: () => void
  onOpen: (slug: string) => void
  rise: (cls?: string) => { className: string; style: React.CSSProperties }
}) {
  const at = essays.findIndex((e) => e.slug === essay.slug)
  const newer = at > 0 ? essays[at - 1] : null
  const older = at < essays.length - 1 ? essays[at + 1] : null
  return (
    <article>
      <button type="button" onClick={onBack} {...rise("qpt-back")}>
        <ArrowIcon flip /> Essays
      </button>
      <h1 {...rise("qpt-h1")}>
        {essay.title}
      </h1>
      <p {...rise("qpt-meta")}>
        <time dateTime={essay.date}>{formatDate(essay.date, true)}</time> · {readingMinutes(essay.body)} min read
      </p>
      <div {...rise("qpt-prose")}>
        {groupBlocks(essay.body).map((b, k) =>
          b.kind === "list" ? (
            <ul key={k}>
              {b.items.map((t, j) => (
                <li key={j}>{t}</li>
              ))}
            </ul>
          ) : b.kind === "h" ? (
            <h2 key={k}>{b.text}</h2>
          ) : b.kind === "quote" ? (
            <blockquote key={k}>{b.text}</blockquote>
          ) : (
            <p key={k}>{b.text}</p>
          ),
        )}
      </div>
      {newer || older ? (
        <nav className="qpt-pager" aria-label="More essays">
          {older ? (
            <button type="button" onClick={() => onOpen(older.slug)}>
              <small>← Older</small>
              <span>{older.title}</span>
            </button>
          ) : null}
          {newer ? (
            <button type="button" className="qpt-next" onClick={() => onOpen(newer.slug)}>
              <small>Newer →</small>
              <span>{newer.title}</span>
            </button>
          ) : null}
        </nav>
      ) : null}
    </article>
  )
}

/* -------------------------------------------------------------- palette */

function Palette({
  commands,
  onClose,
  uid,
}: {
  commands: (Command & { icon: React.ReactNode; run: () => void })[]
  onClose: () => void
  uid: string
}) {
  const [query, setQuery] = React.useState("")
  const [active, setActive] = React.useState(0)
  const inputRef = React.useRef(null as HTMLInputElement | null)
  const listRef = React.useRef(null as HTMLDivElement | null)
  const results = React.useMemo(() => filterCommands(commands, query), [commands, query])

  React.useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    inputRef.current?.focus()
    return () => prev?.focus?.()
  }, [])
  React.useEffect(() => setActive(0), [query])
  React.useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" })
  }, [active])

  const run = (c: (typeof results)[number] | undefined) => {
    if (!c) return
    onClose()
    // after the dialog is gone, so focus and scroll land on the page
    setTimeout(c.run, 0)
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActive((a) => (results.length ? (a + 1) % results.length : 0))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((a) => (results.length ? (a - 1 + results.length) % results.length : 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      run(results[active])
    } else if (e.key === "Escape") {
      e.preventDefault()
      onClose()
    } else if (e.key === "Tab") {
      e.preventDefault() // the input is the only stop; arrows move the selection
    }
  }

  // Grouped only while browsing; a query ranks across groups.
  const grouped = !query.trim()
  let lastGroup = ""

  return (
    <div className="qpt-overlay" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="qpt-palette" role="dialog" aria-modal="true" aria-label="Search and commands" onKeyDown={onKey}>
        <div className="qpt-search">
          <SearchIcon />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search essays, work, actions…"
            role="combobox"
            aria-expanded="true"
            aria-controls={uid + "-list"}
            aria-activedescendant={results[active] ? uid + "-o" + active : undefined}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="qpt-kbd" style={{ height: 22, fontSize: 11 }}>
            esc
          </kbd>
        </div>
        <div className="qpt-list" ref={listRef} role="listbox" id={uid + "-list"}>
          {results.length === 0 ? (
            <div className="qpt-empty">Nothing matches “{query}”.</div>
          ) : (
            results.map((c, k) => {
              const head = grouped && c.group !== lastGroup ? c.group : null
              lastGroup = c.group
              return (
                <React.Fragment key={c.id}>
                  {head ? (
                    <div className="qpt-group" role="presentation">
                      {head}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    tabIndex={-1}
                    id={uid + "-o" + k}
                    role="option"
                    aria-selected={k === active}
                    className="qpt-item"
                    onPointerMove={() => k !== active && setActive(k)}
                    onClick={() => run(c)}
                  >
                    <span className="qpt-item-icon">{c.icon}</span>
                    {c.label}
                    {c.hint ? <span className="qpt-item-hint">{grouped ? c.hint : c.group}</span> : null}
                  </button>
                </React.Fragment>
              )
            })
          )}
        </div>
        <div className="qpt-keys" aria-hidden="true">
          <span>
            <kbd className="qpt-kbd">↑</kbd>
            <kbd className="qpt-kbd">↓</kbd> move
          </span>
          <span>
            <kbd className="qpt-kbd">↵</kbd> open
          </span>
          <span>
            <kbd className="qpt-kbd">esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- clock */

function Clock({ timeZone, place }: { timeZone: string; place: string }) {
  const [now, setNow] = React.useState(null as Date | null)
  React.useEffect(() => {
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 15000)
    return () => clearInterval(t)
  }, [])
  if (!now) return <span className="qpt-clock" />
  let time = ""
  let hour = 12
  try {
    time = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit" }).format(now)
    hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", hourCycle: "h23" }).format(now))
  } catch {
    time = now.toTimeString().slice(0, 5)
    hour = now.getHours()
  }
  const day = hour >= 7 && hour < 20
  return (
    <span className="qpt-clock" title={day ? "Probably awake" : "Probably asleep"}>
      <i data-day={day} />
      {place ? place + " · " : ""}
      {time}
    </span>
  )
}

/* ----------------------------------------------------------------- art */

// A portrait drawn in SVG: a warm brick wall, dark hair and beard, a black
// jacket over a white tee. It blinks every few seconds.
function DrawnAvatar({ id, label }: { id: string; label: string }) {
  const bricks: React.ReactNode[] = []
  for (let r = 0; r < 9; r++) {
    for (let c = -1; c < 5; c++) {
      const x = c * 26 + (r % 2 ? 13 : 0)
      const shade = ["#a8443a", "#b24d40", "#9a3c33", "#b85648"][(r * 7 + c * 3 + 16) % 4]
      bricks.push(<rect key={r + "-" + c} x={x + 1} y={r * 12 + 1} width={24} height={10} rx={1.5} fill={shade} />)
    }
  }
  return (
    <svg width={56} height={56} viewBox="0 0 104 104" role="img" aria-label={label}>
      <defs>
        <radialGradient id={id + "-lite"} cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="1" stopColor="#000" stopOpacity="0.2" />
        </radialGradient>
        <linearGradient id={id + "-skin"} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d9a07a" />
          <stop offset="1" stopColor="#b97c58" />
        </linearGradient>
      </defs>
      <rect width="104" height="104" fill="#7e2f28" />
      {bricks}
      <rect x="0" y="58" width="104" height="6" fill="#d9d2c6" opacity="0.55" />
      <rect width="104" height="104" fill={"url(#" + id + "-lite)"} />
      {/* jacket, tee */}
      <path d="M14 104 C16 86 28 78 42 75 L62 75 C76 78 88 86 90 104 Z" fill="#17171a" />
      <path d="M42 75 L52 92 L62 75 Z" fill="#f4f1ec" />
      <path d="M40 76 L47 96 L36 104 M64 76 L57 96 L68 104" stroke="#2a2a2f" strokeWidth="2" fill="none" />
      {/* neck, ears, head */}
      <path d="M45 62 L45 76 Q52 81 59 76 L59 62 Z" fill="#b57653" />
      <ellipse cx="34.5" cy="50" rx="4" ry="6" fill="#c78a64" />
      <ellipse cx="69.5" cy="50" rx="4" ry="6" fill="#c78a64" />
      <ellipse cx="52" cy="47" rx="17" ry="21" fill={"url(#" + id + "-skin)"} />
      {/* beard */}
      <path d="M35.5 48 C35 62 42 71 52 71 C62 71 69 62 68.5 48 C66 57 62 59 58 58.5 C55 57.5 49 57.5 46 58.5 C42 59 38 57 35.5 48 Z" fill="#2b211c" />
      <path d="M46.5 61.5 Q52 64.5 57.5 61.5" stroke="#8a4f3c" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* hair */}
      <path d="M34 46 C31 28 42 20 53 21 C66 21 73 30 70 46 C68 38 66 34 63 32 C56 36 44 35 38 32 C36 36 35 40 34 46 Z" fill="#231b17" />
      <path d="M40 26 C48 19 62 20 67 28" stroke="#3a2c24" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* brows, eyes, nose */}
      <path d="M40.5 40.5 Q45 38.5 48.5 40.5 M55.5 40.5 Q59 38.5 63.5 40.5" stroke="#231b17" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <g className="qpt-eyes">
        <ellipse cx="44.5" cy="46" rx="2" ry="2.3" fill="#1a1411" />
        <ellipse cx="59.5" cy="46" rx="2" ry="2.3" fill="#1a1411" />
      </g>
      <path d="M52 47 L50 54 Q52 55.5 54 54" stroke="#9a5f43" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Each project gets a cover generated from its name: one of six motifs, tinted
// by its hue. No two names look alike, and nothing needs uploading.
function ProjectArt({ name, hue, id }: { name: string; hue?: number; id: string }) {
  const h = hashString(name)
  const hh = hue ?? h % 360
  const motif = h % 6
  const ink = "hsl(" + hh + " 72% 52%)"
  const deep = "hsl(" + hh + " 55% 28%)"
  const bg = "hsl(" + hh + " 70% 94%)"
  const mid = "hsl(" + hh + " 65% 80%)"
  const rnd = (k: number) => ((Math.imul(h ^ (k * 2654435761), 1597334677) >>> 0) % 1000) / 1000
  const shapes: React.ReactNode[] = []
  if (motif === 0) {
    for (let k = 5; k >= 1; k--) shapes.push(<circle key={k} cx={110} cy={52} r={k * 14} fill={k % 2 ? mid : bg} />)
    shapes.push(<circle key="c" cx={110} cy={52} r={9} fill={ink} />)
  } else if (motif === 1) {
    const pick = Math.floor(rnd(1) * 40)
    for (let y = 0; y < 5; y++)
      for (let x = 0; x < 8; x++)
        shapes.push(<circle key={x + "-" + y} cx={24 + x * 16} cy={20 + y * 15} r={y * 8 + x === pick ? 6 : 3} fill={y * 8 + x === pick ? ink : mid} />)
  } else if (motif === 2) {
    for (let k = 0; k < 6; k++) {
      const y = 24 + k * 11
      const a = 6 + rnd(k) * 8
      shapes.push(
        <path key={k} d={"M-4 " + y + " Q 20 " + (y - a) + " 40 " + y + " T 80 " + y + " T 120 " + y + " T 164 " + y} stroke={k === 3 ? ink : mid} strokeWidth={k === 3 ? 3 : 2} fill="none" />,
      )
    }
  } else if (motif === 3) {
    for (let k = 0; k < 13; k++) {
      const bh = 14 + rnd(k) * 56
      shapes.push(<rect key={k} x={18 + k * 10} y={84 - bh} width={6} height={bh} rx={3} fill={k === 6 ? ink : mid} />)
    }
  } else if (motif === 4) {
    shapes.push(<circle key="f" cx={80} cy={50} r={34} fill="none" stroke={mid} strokeWidth={6} />)
    shapes.push(<path key="a" d="M80 16 A34 34 0 0 1 112 62" fill="none" stroke={ink} strokeWidth={6} strokeLinecap="round" />)
    shapes.push(<path key="h" d="M80 50 L80 30 M80 50 L94 58" stroke={deep} strokeWidth={3} strokeLinecap="round" />)
  } else {
    for (let k = 0; k < 3; k++)
      shapes.push(<rect key={k} x={36 + k * 12} y={22 + k * 10} width={72} height={46} rx={6} fill={k === 2 ? "#fff" : mid} stroke={k === 2 ? ink : "none"} strokeWidth={2} />)
    shapes.push(<rect key="l1" x={70} y={52} width={30} height={4} rx={2} fill={ink} />)
    shapes.push(<rect key="l2" x={70} y={60} width={20} height={4} rx={2} fill={mid} />)
  }
  return (
    <svg width="100%" height="100%" viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={id + "-g"} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={bg} />
          <stop offset="1" stopColor={"hsl(" + hh + " 60% 88%)"} />
        </linearGradient>
      </defs>
      <rect width="160" height="100" fill={"url(#" + id + "-g)"} />
      {shapes}
      <text x="12" y="90" fontSize="10" fontWeight="600" fill={deep} fontFamily="ui-sans-serif,system-ui,sans-serif" letterSpacing="0.4">
        {name.slice(0, 18)}
      </text>
    </svg>
  )
}

function ProjectSwatch({ name, hue }: { name: string; hue?: number }) {
  const hh = hue ?? hashString(name) % 360
  return <span style={{ width: 12, height: 12, borderRadius: 4, background: "hsl(" + hh + " 72% 55%)", display: "block" }} />
}

/* ---------------------------------------------------------------- icons */

function SunMoon({ theme, size, id }: { theme: Theme; size: number; id: string }) {
  const dark = theme === "dark"
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <mask id={id + "-m"}>
        <rect width="24" height="24" fill="#fff" />
        <circle className="qpt-sun-moon" cx={dark ? 16 : 30} cy={dark ? 7 : -6} r="6.5" fill="#000" />
      </mask>
      <circle className="qpt-sun-core" cx="12" cy="12" r={dark ? 8 : 4.5} fill="currentColor" mask={"url(#" + id + "-m)"} />
      <g className="qpt-sun-rays" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
      </g>
    </svg>
  )
}

const ico = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const

function ArrowIcon({ flip }: { flip?: boolean }) {
  return (
    <svg {...ico} width={18} height={18} style={flip ? { transform: "scaleX(-1)" } : undefined}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}
function ChevronIcon() {
  return (
    <svg {...ico}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}
function SearchIcon() {
  return (
    <svg {...ico} width={18} height={18}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  )
}
function HomeIcon() {
  return (
    <svg {...ico}>
      <path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" />
    </svg>
  )
}
function DocIcon() {
  return (
    <svg {...ico}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </svg>
  )
}
function CopyIcon() {
  return (
    <svg {...ico}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h8" />
    </svg>
  )
}
function MailIcon() {
  return (
    <svg {...ico}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3.5 6.5l8.5 6.5 8.5-6.5" />
    </svg>
  )
}
function OutIcon() {
  return (
    <svg {...ico} width={13} height={13}>
      <path d="M7 17L17 7M9 7h8v8" />
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg {...ico}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  )
}
