"use client"

// Coquette Desktop Portfolio — a whole portfolio template dressed as a quiet,
// pale-grey desktop. "welcome to my portfolio" sits in the middle; ribboned
// folders (blush lace, black gingham, a gift-wrapped one, one tied with pink
// bows) and two paper documents are scattered around it, and a dock of pastel
// and maroon apps waits at the bottom.
//
// It behaves like a desktop. Drag icons, rubber-band select them, double-click
// to open. Folders open Finder windows (search, list/grid, tags, a detail page
// per project); documents open About Me and a Mail composer. Windows drag,
// resize, zoom, minimise into the dock and stack by focus. The dock magnifies
// and bounces, ⌘/Ctrl+K opens Spotlight, the grid opens Launchpad, and the
// maroon disc plays a little music box. Right-click the wallpaper for more.
//
// Every icon, thumbnail and sound is made in this file — nothing loads.
import * as React from "react"

/* ------------------------------------------------------------------ types */

export type DesktopProject = {
  id?: string
  name: string
  year?: string
  description?: string
  role?: string
  tags?: string[]
  url?: string
}

export type FolderStyle = "blush" | "noir" | "ribbon" | "bows" | "plain"

export type DesktopFolder = {
  id: string
  /** Label under the desktop icon. */
  label: string
  /** Finder window title. Defaults to the label. */
  title?: string
  style?: FolderStyle
  /** Icon centre, as a percentage of the desktop. */
  x: number
  y: number
  projects: DesktopProject[]
}

export type DesktopLink = { label: string; url: string }
export type DesktopFaq = { q: string; a: string }
export type Wallpaper = "plain" | "blush" | "gingham" | "dots"

export type CoquetteDesktopPortfolioProps = {
  name?: string
  eyebrow?: string
  headline?: string
  about?: { title?: string; paragraphs: string[] }
  folders?: DesktopFolder[]
  /** Positions (percent) of the two paper documents. */
  aboutIcon?: { x: number; y: number; label?: string }
  contactIcon?: { x: number; y: number; label?: string }
  email?: string
  links?: DesktopLink[]
  availability?: string
  now?: string[]
  skills?: string[]
  faq?: DesktopFaq[]
  song?: { title: string; artist: string }
  /** Soft pink used for bows, folders and highlights. */
  accent?: string
  /** Deep maroon used for selection, buttons and dock apps. */
  deep?: string
  wallpaper?: Wallpaper
  /** Open a window on load: "about", "contact" or a folder id. */
  openOnLoad?: string | null
  intro?: boolean
  height?: string
  className?: string
}

type Project = Required<Pick<DesktopProject, "name">> & DesktopProject & { id: string; folderId: string }
type Folder = Omit<DesktopFolder, "projects"> & { title: string; style: FolderStyle; projects: Project[] }
type Loc = { folder: string | null; project: string | null; tag: string | null }
type Kind = "finder" | "about" | "contact" | "calendar" | "messages" | "gallery" | "notes" | "music" | "skills" | "trash"
type Phase = "in" | "open" | "out" | "min" | "hidden"
type Win = {
  id: string
  kind: Kind
  x: number
  y: number
  w: number
  h: number
  z: number
  phase: Phase
  max: boolean
  ox: number
  oy: number
  hist: Loc[]
  hi: number
}

/* ------------------------------------------------------------------ logic */

// #region logic
const DOCK_RESERVE = 84

function clamp(v: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, v))
}

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "item"
}

function normalizeFolders(folders: DesktopFolder[]): Folder[] {
  const seen = new Set<string>()
  return folders.map((f) => ({
    ...f,
    title: f.title ?? f.label,
    style: f.style ?? "blush",
    projects: f.projects.map((p) => {
      let id = p.id ?? slugify(p.name)
      while (seen.has(f.id + "/" + id)) id += "-2"
      seen.add(f.id + "/" + id)
      return { ...p, id, folderId: f.id }
    }),
  }))
}

function filterProjects(projects: Project[], query: string, tag: string | null): Project[] {
  const q = query.trim().toLowerCase()
  return projects.filter((p) => {
    if (tag && !(p.tags ?? []).includes(tag)) return false
    if (!q) return true
    return [p.name, p.description ?? "", p.role ?? "", ...(p.tags ?? [])].join(" ").toLowerCase().includes(q)
  })
}

/** Where a new window lands: cascaded from the centre, always fully on the desktop. */
function placeWindow(desk: { w: number; h: number }, size: { w: number; h: number }, n: number, compact: boolean) {
  const room = Math.max(160, desk.h - DOCK_RESERVE)
  if (compact) {
    const w = Math.max(200, desk.w - 16)
    const h = Math.max(160, Math.min(size.h + 60, room - 16))
    return { x: 8, y: clamp(8 + (n % 3) * 10, 0, Math.max(0, room - h)), w, h }
  }
  const w = Math.min(size.w, desk.w - 32)
  const h = Math.min(size.h, room - 24)
  const step = (n % 6) * 26
  const x = clamp(Math.round((desk.w - w) / 2 - 60 + step), 12, Math.max(12, desk.w - w - 12))
  const y = clamp(Math.round((room - h) / 2 - 30 + step), 12, Math.max(12, room - h - 12))
  return { x, y, w, h }
}

/** Keep a dragged window's title bar reachable. */
function clampWindow(x: number, y: number, w: number, desk: { w: number; h: number }) {
  return {
    x: clamp(x, 80 - w, desk.w - 80),
    y: clamp(y, 0, Math.max(0, desk.h - DOCK_RESERVE - 28)),
  }
}

/** macOS-style dock magnification: 1 at rest, up to 1 + amp under the pointer. */
function dockScale(pointer: number | null, center: number, reach = 110, amp = 0.5): number {
  if (pointer === null) return 1
  const d = Math.abs(pointer - center)
  if (d >= reach) return 1
  return 1 + amp * Math.cos((d / reach) * (Math.PI / 2)) ** 2
}

function mailtoHref(email: string, subject: string, body: string): string {
  const q: string[] = []
  if (subject) q.push("subject=" + encodeURIComponent(subject))
  if (body) q.push("body=" + encodeURIComponent(body))
  return "mailto:" + email + (q.length ? "?" + q.join("&") : "")
}

/** Calendar month as weeks of day numbers (null = padding), weeks start Monday. */
function monthGrid(year: number, month: number): (number | null)[][] {
  const first = (new Date(year, month, 1).getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = Array.from({ length: first }, () => null)
  for (let d = 1; d <= days; d++) cells.push(d)
  while (cells.length % 7) cells.push(null)
  const weeks: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

/** Narrow screens: icons sit in rows of three above the headline. */
function compactSpot(i: number): { x: number; y: number } {
  return { x: [18, 50, 82][i % 3], y: 11 + Math.floor(i / 3) * 18 }
}

const STOP = new Set("the and are you your yours what how who why when where can does did for with that this have has was will would could should about any our out get".split(" "))

/** Canned-answer lookup for the Messages app: the FAQ sharing the most meaningful words. */
function answerFor(text: string, faq: DesktopFaq[], fallback: string): string {
  const words = (text.toLowerCase().match(/[a-z0-9.]{3,}/g) ?? []).filter((w) => !STOP.has(w))
  let best: DesktopFaq | null = null
  let score = 0
  for (const f of faq) {
    const hay = (f.q + " " + f.a).toLowerCase()
    const s = words.filter((w) => hay.includes(w)).length
    if (s > score) {
      score = s
      best = f
    }
  }
  return best ? best.a : fallback
}
// #endregion logic

/* --------------------------------------------------------------- defaults */

const DEFAULT_ABOUT = {
  title: "about me",
  paragraphs: [
    "I'm a passionate web developer with over 5 years of experience building modern, responsive websites and web applications that deliver exceptional user experiences.",
    "My expertise includes front-end development with React, Next.js and Tailwind CSS, as well as back-end development with Node.js and Express.",
    "I'm always eager to learn new technologies and techniques to improve my skills and deliver better solutions to my clients.",
  ],
}

const DEFAULT_FOLDERS: DesktopFolder[] = [
  {
    id: "web-app",
    label: "web app",
    title: "Web App Projects",
    style: "blush",
    x: 17,
    y: 62,
    projects: [
      { name: "Todo List", year: "2026", role: "Design + build", tags: ["React", "Tailwind"], description: "A calm little task list with drag-to-reorder, keyboard shortcuts and offline sync. Built to be opened a hundred times a day." },
      { name: "Content Manager", year: "2025", role: "Full stack", tags: ["Next.js", "Node"], description: "A headless CMS dashboard for a small studio: rich text, image crops, scheduled publishing and role-based access." },
      { name: "PWA Journal", year: "2025", role: "Front end", tags: ["React", "PWA"], description: "An installable journaling app that works on a plane. Local-first storage, mood tags and a soft pink dark mode." },
    ],
  },
  {
    id: "websites",
    label: "websites",
    title: "Websites",
    style: "noir",
    x: 81,
    y: 12,
    projects: [
      { name: "Bakery Site", year: "2026", role: "Design + build", tags: ["Next.js", "Motion"], description: "A buttery site for a neighbourhood bakery with a live 'fresh out of the oven' board and pre-orders." },
      { name: "Studio Portfolio", year: "2025", role: "Front end", tags: ["React", "Motion"], description: "A scroll-driven portfolio for a photography studio. Big images, tiny type, zero clutter." },
      { name: "Florist", year: "2024", role: "Design", tags: ["Design", "Tailwind"], description: "A seasonal bouquet catalogue with a delivery-date picker and gift notes." },
    ],
  },
  {
    id: "ecommerce",
    label: "ecommerce",
    title: "Ecommerce",
    style: "ribbon",
    x: 61,
    y: 27,
    projects: [
      { name: "Bow & Co.", year: "2026", role: "Full stack", tags: ["Next.js", "Node"], description: "A hair-accessory shop with a bundle builder, wishlists and a one-page checkout." },
      { name: "Sneaker Drop", year: "2025", role: "Front end", tags: ["React", "Motion"], description: "Timed product drops with a waiting room, live stock counter and raffle entries." },
      { name: "Candle Shop", year: "2024", role: "Design + build", tags: ["Tailwind", "Design"], description: "Scent quiz, subscriptions and gift wrapping for an independent candle maker." },
    ],
  },
  {
    id: "landing-pages",
    label: "landing pages",
    title: "Landing Pages",
    style: "bows",
    x: 83,
    y: 58,
    projects: [
      { name: "SaaS Launch", year: "2026", role: "Design + build", tags: ["Next.js", "Design"], description: "A launch page that doubled sign-ups: crisp pricing, honest copy and a live product demo." },
      { name: "App Waitlist", year: "2025", role: "Front end", tags: ["React", "Tailwind"], description: "Referral-powered waitlist with a leaderboard and a confetti moment when you move up." },
      { name: "Event Page", year: "2024", role: "Design", tags: ["Design", "Motion"], description: "A one-day conference page with a schedule that knows what's on right now." },
    ],
  },
]

const DEFAULT_FAQ: DesktopFaq[] = [
  { q: "What do you do?", a: "I design and build websites and web apps — mostly React, Next.js and Tailwind, with Node on the back end." },
  { q: "Are you available?", a: "Yes! I'm taking on new projects. Open the calendar in the dock to see when I can start." },
  { q: "How do I reach you?", a: "Open 'contact me' on the desktop, or the Mail app in the dock — I reply within a day." },
  { q: "What's your favourite project?", a: "Bow & Co. — a tiny shop with a very big bundle builder. It's in the ecommerce folder." },
]

const TAG_COLORS = ["#ff5f57", "#f6a23c", "#f2c94c", "#34c759", "#3b82f6", "#a855f7"]

/* ------------------------------------------------------------------ icons */

const FOLDER_BACK = "M3 9a4 4 0 0 1 4-4h15.5a3 3 0 0 1 2.2 1l3.6 4H57a4 4 0 0 1 4 4v30a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"

function Bow({ x, y, s = 1, r = 0, fill, stroke }: { x: number; y: number; s?: number; r?: number; fill: string; stroke: string }) {
  return (
    <g transform={"translate(" + x + " " + y + ") rotate(" + r + ") scale(" + s + ") translate(-20 -14)"}>
      <path d="M19 15c-2 5-5 9-8 13l4.5-.6L20 16Z" fill={fill} stroke={stroke} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M21 15c2 5 5 9 8 13l-4.5-.6L20 16Z" fill={fill} stroke={stroke} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M20 14C14 4 2 2 3 12c1 8 11 6 17 2Z" fill={fill} stroke={stroke} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M20 14c6-10 18-12 17-2-1 8-11 6-17 2Z" fill={fill} stroke={stroke} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M18 13C13 8 7 8 7 11.5M22 13c5-5 11-5 11-1.5" fill="none" stroke={stroke} strokeWidth=".9" opacity=".6" />
      <ellipse cx="20" cy="14" rx="3.6" ry="4.1" fill={fill} stroke={stroke} strokeWidth="1.3" />
    </g>
  )
}

function FolderIcon({ style, uid, size = 64 }: { style: FolderStyle; uid: string; size?: number }) {
  const pink = "var(--cdp-accent)"
  const dark = style === "noir" || style === "ribbon" || style === "bows"
  const back = dark ? "#232326" : "color-mix(in oklab, var(--cdp-accent) 88%, #b0305e)"
  const front = dark ? "#303034" : pink
  return (
    <svg viewBox="0 0 64 52" width={size} height={size * 0.8125} className="cdp-svg" aria-hidden="true">
      <path d={FOLDER_BACK} fill={back} />
      {style === "noir" && <path d={FOLDER_BACK} fill={"url(#" + uid + "-ging)"} />}
      {style === "ribbon" && <rect x="28" y="5" width="8" height="12" fill={pink} />}
      <rect x="3" y="15" width="58" height="34" rx="4" fill={front} />
      {style === "blush" && <rect x="3" y="15" width="58" height="34" rx="4" fill={"url(#" + uid + "-lace)"} />}
      {style === "noir" && <rect x="3" y="15" width="58" height="34" rx="4" fill={"url(#" + uid + "-ging)"} />}
      {style === "bows" && <rect x="3" y="15" width="58" height="34" rx="4" fill={"url(#" + uid + "-lace)"} opacity=".35" />}
      {style === "ribbon" && <rect x="28" y="15" width="8" height="34" fill={pink} />}
      <rect x="4" y="16" width="56" height="1.4" rx=".7" fill="#fff" opacity={dark ? 0.14 : 0.55} />
      {style === "blush" && <Bow x={51} y={11} s={0.5} r={12} fill="#fff" stroke="#bfbfc4" />}
      {style === "noir" && <Bow x={13} y={9} s={0.5} r={-10} fill="#ededf0" stroke="#8a8a90" />}
      {style === "ribbon" && (
        <>
          <Bow x={32} y={16} s={0.44} fill={pink} stroke="#8d3a5a" />
          <Bow x={12} y={23} s={0.36} r={-14} fill={pink} stroke="#8d3a5a" />
          <Bow x={52} y={23} s={0.36} r={14} fill={pink} stroke="#8d3a5a" />
        </>
      )}
      {style === "bows" && (
        <>
          <Bow x={14} y={17} s={0.42} r={-8} fill={pink} stroke="#8d3a5a" />
          <Bow x={32} y={16} s={0.42} fill={pink} stroke="#8d3a5a" />
          <Bow x={50} y={17} s={0.42} r={8} fill={pink} stroke="#8d3a5a" />
        </>
      )}
    </svg>
  )
}

function DocIcon({ tone, size = 40 }: { tone: "ink" | "accent"; size?: number }) {
  const stroke = tone === "ink" ? "var(--color-foreground, #111)" : "color-mix(in oklab, var(--cdp-accent) 80%, var(--cdp-deep))"
  const fill = tone === "ink" ? "var(--color-background, #fff)" : "color-mix(in oklab, var(--cdp-accent) 16%, var(--color-background, #fff))"
  return (
    <svg viewBox="0 0 40 48" width={size} height={size * 1.2} className="cdp-svg" aria-hidden="true">
      <path d="M9 3.5h15l10.5 10.5v28.5a2.5 2.5 0 0 1-2.5 2.5H9a2.5 2.5 0 0 1-2.5-2.5V6A2.5 2.5 0 0 1 9 3.5Z" fill={fill} stroke={stroke} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M23.5 3.5v8a2.5 2.5 0 0 0 2.5 2.5h8.5" fill="none" stroke={stroke} strokeWidth="2.6" strokeLinejoin="round" />
    </svg>
  )
}

type DockApp = { key: string; label: string; kind: Kind | "launchpad" | "spotlight" }

const DOCK: DockApp[] = [
  { key: "finder", label: "Finder", kind: "finder" },
  { key: "launchpad", label: "Launchpad", kind: "launchpad" },
  { key: "about", label: "About Me", kind: "about" },
  { key: "spotlight", label: "Spotlight", kind: "spotlight" },
  { key: "contact", label: "Mail", kind: "contact" },
  { key: "calendar", label: "Calendar", kind: "calendar" },
  { key: "messages", label: "Messages", kind: "messages" },
  { key: "gallery", label: "Gallery", kind: "gallery" },
  { key: "notes", label: "Now", kind: "notes" },
  { key: "music", label: "Music Box", kind: "music" },
  { key: "skills", label: "Skills", kind: "skills" },
  { key: "trash", label: "Trash", kind: "trash" },
]

function DockIcon({ app, uid, now }: { app: string; uid: string; now: Date }) {
  const deep = "var(--cdp-deep)"
  const pink = "var(--cdp-accent)"
  const tile = (fill: string) => <rect x="1" y="1" width="46" height="46" rx="11" fill={fill} stroke="rgba(0,0,0,.08)" />
  const month = now.toLocaleString("en", { month: "short" }).toUpperCase()
  let body: React.ReactNode = null
  switch (app) {
    case "finder":
      body = (
        <>
          <rect x="1" y="1" width="46" height="46" rx="11" fill="#8e6f7c" />
          <path d="M24 1h12a11 11 0 0 1 11 11v24a11 11 0 0 1-11 11H24Z" fill="#c9a6b5" />
          <path d="M22 1c-3 9-4 17-1 25h3c-1 7 0 14 2 21" fill="none" stroke="#3a2630" strokeWidth="1.8" />
          <path d="M14 15v6M33 15v6" stroke="#3a2630" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M12 32c7 5 17 5 24 0" fill="none" stroke="#3a2630" strokeWidth="2" strokeLinecap="round" />
        </>
      )
      break
    case "launchpad":
      body = (
        <>
          {tile("#2e2e32")}
          {[0, 1, 2].map((r) => [0, 1, 2].map((c) => <circle key={r + "-" + c} cx={14 + c * 10} cy={14 + r * 10} r="3.2" fill="#fff" />))}
        </>
      )
      break
    case "about":
      body = (
        <>
          {tile("color-mix(in oklab, " + pink + " 70%, #9b6b80)")}
          <text x="24" y="33" textAnchor="middle" fontSize="25" fontWeight="700" fill="#fff" fontFamily="Georgia, 'Times New Roman', serif">A</text>
        </>
      )
      break
    case "spotlight":
      body = (
        <>
          {tile("#fff")}
          <circle cx="24" cy="24" r="10.5" fill="none" stroke="#2b2b2e" strokeWidth="2.6" />
        </>
      )
      break
    case "contact":
      body = (
        <>
          {tile("#fff")}
          <rect x="11" y="15" width="26" height="18" rx="2.5" fill="none" stroke={deep} strokeWidth="2.2" />
          <path d="M12 16.5 24 26l12-9.5" fill="none" stroke={deep} strokeWidth="2.2" strokeLinejoin="round" />
        </>
      )
      break
    case "calendar":
      body = (
        <>
          {tile("#fff")}
          <text x="24" y="15" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#e0457b" fontFamily="system-ui, sans-serif">{month}</text>
          <text x="24" y="36" textAnchor="middle" fontSize="19" fontWeight="500" fill="#222" fontFamily="system-ui, sans-serif">{now.getDate()}</text>
        </>
      )
      break
    case "messages":
      body = (
        <>
          {tile("#fff")}
          <path d="M24 12c-8 0-13.5 4.8-13.5 10.8 0 3.4 1.8 6.3 4.7 8.3L14 36.5l6.4-3.2c1.2.3 2.3.4 3.6.4 8 0 13.5-4.8 13.5-10.9S32 12 24 12Z" fill="none" stroke={deep} strokeWidth="2.2" strokeLinejoin="round" />
        </>
      )
      break
    case "gallery":
      body = (
        <>
          <rect x="1" y="1" width="46" height="46" rx="11" fill={"url(#" + uid + "-grad)"} />
          <rect x="13" y="13" width="22" height="22" rx="4" fill="#fff" opacity=".35" />
        </>
      )
      break
    case "notes":
      body = (
        <>
          {tile("#fff")}
          <text x="24" y="28" textAnchor="middle" fontSize="11" fontWeight="600" fill="#e0457b" fontFamily="system-ui, sans-serif">{now.getFullYear()}</text>
        </>
      )
      break
    case "music":
      body = (
        <>
          {tile(deep)}
          <circle cx="24" cy="24" r="13" fill="#fff" />
          <circle cx="24" cy="24" r="8.5" fill="none" stroke={deep} strokeWidth=".8" opacity=".5" />
          <circle cx="24" cy="24" r="3" fill={deep} />
        </>
      )
      break
    case "skills":
      body = (
        <>
          {tile("color-mix(in oklab, " + pink + " 55%, #fff)")}
          {[0, 1, 2].map((r) => [0, 1, 2].map((c) => <circle key={r + "-" + c} cx={15 + c * 9} cy={15 + r * 9} r="2.6" fill={deep} />))}
        </>
      )
      break
    case "trash":
      body = (
        <>
          {tile("#fff")}
          <rect x="15" y="15" width="18" height="18" rx="3" fill="#c81d56" />
        </>
      )
      break
  }
  return (
    <svg viewBox="0 0 48 48" width="100%" height="100%" className="cdp-svg" aria-hidden="true">
      {body}
    </svg>
  )
}

/** A generated website screenshot for a project — layout and palette come from its name. */
function ProjectArt({ project, className, square }: { project: Project; className?: string; square?: boolean }) {
  const h = hashString(project.name)
  const PAL = [
    ["#fde4ec", "#f4b6cb", "#7d1d45"],
    ["#2b2b2e", "#f4b6cb", "#fafafa"],
    ["#fff6f9", "#e27fa3", "#3a3a3e"],
    ["#f6ede6", "#d98fa8", "#5b1a36"],
  ]
  const [bg, mid, ink] = PAL[h % PAL.length]
  const v = (h >>> 3) % 3
  const initial = project.name.trim().charAt(0).toUpperCase()
  if (square)
    return (
      <svg viewBox="0 0 100 100" className={"cdp-svg " + (className ?? "")} aria-hidden="true">
        <rect width="100" height="100" fill={bg} />
        <circle cx={v === 1 ? 78 : 22} cy={v === 2 ? 80 : 22} r="30" fill={mid} opacity=".55" />
        <text x="50" y="70" textAnchor="middle" fontSize="58" fontStyle="italic" fontWeight="700" fill={ink} fontFamily="'Times New Roman', Times, Georgia, serif">{initial}</text>
        <Bow x={76} y={24} s={0.62} r={14} fill={mid} stroke={ink} />
      </svg>
    )
  return (
    <svg viewBox="0 0 160 100" className={"cdp-svg " + (className ?? "")} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="160" height="100" fill={bg} />
      <rect width="160" height="9" fill={ink} opacity=".08" />
      <circle cx="6" cy="4.5" r="1.6" fill="#ff5f57" />
      <circle cx="11" cy="4.5" r="1.6" fill="#febc2e" />
      <circle cx="16" cy="4.5" r="1.6" fill="#28c840" />
      <rect x="40" y="2.5" width="80" height="4" rx="2" fill={ink} opacity=".12" />
      {v === 0 && (
        <>
          <text x="12" y="46" fontSize="26" fontStyle="italic" fontWeight="700" fill={ink} fontFamily="Georgia, 'Times New Roman', serif">{project.name.split(" ")[0].toLowerCase()}</text>
          <rect x="12" y="54" width="60" height="3" rx="1.5" fill={ink} opacity=".35" />
          <rect x="12" y="60" width="44" height="3" rx="1.5" fill={ink} opacity=".25" />
          <rect x="12" y="70" width="26" height="9" rx="4.5" fill={mid} />
          <circle cx="122" cy="52" r="26" fill={mid} />
          <Bow x={122} y={52} s={0.9} fill="#fff" stroke={ink} />
        </>
      )}
      {v === 1 && (
        <>
          <text x="80" y="40" textAnchor="middle" fontSize="22" fontStyle="italic" fontWeight="700" fill={ink} fontFamily="Georgia, 'Times New Roman', serif">{project.name.toLowerCase()}</text>
          <rect x="58" y="46" width="44" height="3" rx="1.5" fill={ink} opacity=".3" />
          {[0, 1, 2].map((i) => (
            <rect key={i} x={14 + i * 46} y="58" width="40" height="32" rx="3" fill={i === 1 ? mid : ink} opacity={i === 1 ? 1 : 0.1} />
          ))}
        </>
      )}
      {v === 2 && (
        <>
          <rect x="0" y="9" width="72" height="91" fill={mid} />
          <text x="36" y="66" textAnchor="middle" fontSize="48" fontStyle="italic" fontWeight="700" fill={bg} fontFamily="Georgia, 'Times New Roman', serif">{initial}</text>
          <rect x="84" y="28" width="60" height="5" rx="2.5" fill={ink} opacity=".7" />
          <rect x="84" y="39" width="52" height="3" rx="1.5" fill={ink} opacity=".3" />
          <rect x="84" y="45" width="46" height="3" rx="1.5" fill={ink} opacity=".3" />
          <rect x="84" y="58" width="28" height="9" rx="4.5" fill={ink} />
        </>
      )}
    </svg>
  )
}

/* ------------------------------------------------------------ sound */

// A tiny music box: a pentatonic loop on sine + triangle voices, made live.
const MELODY = [0, 4, 7, 12, 11, 7, 4, 2, 4, 7, 9, 7, 4, 0, 2, -1, 0, 4, 7, 12, 14, 12, 9, 7, 9, 7, 4, 2, 0, -1, 0, null]

function useMusicBox() {
  const ctx = React.useRef(null as AudioContext | null)
  const timer = React.useRef(null as number | null)
  const step = React.useRef(0)
  const [playing, setPlaying] = React.useState(false)

  const stop = React.useCallback(() => {
    if (timer.current !== null) window.clearInterval(timer.current)
    timer.current = null
    setPlaying(false)
  }, [])

  const play = React.useCallback(() => {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!ctx.current) ctx.current = new AC()
      const ac = ctx.current
      void ac.resume()
      const note = (semi: number) => {
        const t = ac.currentTime
        const f = 523.25 * Math.pow(2, semi / 12)
        for (const [type, vol, mul] of [["sine", 0.07, 1], ["triangle", 0.025, 2]] as const) {
          const o = ac.createOscillator()
          const g = ac.createGain()
          o.type = type
          o.frequency.value = f * mul
          g.gain.setValueAtTime(0, t)
          g.gain.linearRampToValueAtTime(vol, t + 0.01)
          g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1)
          o.connect(g).connect(ac.destination)
          o.start(t)
          o.stop(t + 1.2)
        }
      }
      if (timer.current !== null) window.clearInterval(timer.current)
      timer.current = window.setInterval(() => {
        const n = MELODY[step.current % MELODY.length]
        step.current++
        if (n !== null) note(n)
      }, 260)
      setPlaying(true)
    } catch {
      setPlaying(false)
    }
  }, [])

  React.useEffect(
    () => () => {
      if (timer.current !== null) window.clearInterval(timer.current)
      void ctx.current?.close().catch(() => {})
    },
    [],
  )
  return { playing, play, stop }
}

/* ------------------------------------------------------------ app views */

type Ctx = {
  name: string
  about: { title: string; paragraphs: string[] }
  folders: Folder[]
  projects: Project[]
  tags: string[]
  email: string
  links: DesktopLink[]
  availability: string
  now: string[]
  skills: string[]
  faq: DesktopFaq[]
  song: { title: string; artist: string }
  uid: string
  openProject: (p: Project, from?: { x: number; y: number }) => void
  openKind: (k: Kind) => void
  music: ReturnType<typeof useMusicBox>
}

function AboutView({ c }: { c: Ctx }) {
  return (
    <div className="cdp-doc">
      <h2 className="cdp-doc-h">{c.about.title}</h2>
      {c.about.paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      <div className="cdp-doc-sign">
        <span>— {c.name}</span>
        <svg viewBox="0 0 40 28" width="26" height="18" className="cdp-svg" aria-hidden="true">
          <Bow x={20} y={14} fill="var(--cdp-accent)" stroke="var(--cdp-deep)" />
        </svg>
      </div>
      {c.links.length > 0 && (
        <div className="cdp-chips">
          {c.links.map((l) => (
            <a key={l.url} className="cdp-chip" href={l.url} target="_blank" rel="noreferrer">
              {l.label} ↗
            </a>
          ))}
          <button type="button" className="cdp-chip is-solid" onClick={() => c.openKind("contact")}>
            say hello
          </button>
        </div>
      )}
    </div>
  )
}

function FinderView({ win, c, go, narrow }: { win: Win; c: Ctx; go: (loc: Loc, push?: boolean) => void; narrow: boolean }) {
  const loc = win.hist[win.hi]
  const [query, setQuery] = React.useState("")
  const [view, setView] = React.useState<"grid" | "list">("grid")
  const [sel, setSel] = React.useState(null as string | null)
  const folder = c.folders.find((f) => f.id === loc.folder) ?? null
  const scope = folder ? folder.projects : c.projects
  const items = filterProjects(scope, query, loc.tag)
  const project = loc.project ? c.projects.find((p) => p.id === loc.project && p.folderId === loc.folder) ?? null : null
  const open = (p: Project) => go({ folder: p.folderId, project: p.id, tag: null })

  React.useEffect(() => setSel(null), [loc.folder, loc.tag, loc.project])

  return (
    <div className="cdp-finder">
      <div className="cdp-toolbar">
        <button type="button" className="cdp-tb" aria-label="Back" disabled={win.hi === 0} onClick={() => go(win.hist[win.hi - 1], false)}>
          ‹
        </button>
        <button type="button" className="cdp-tb" aria-label="Forward" disabled={win.hi >= win.hist.length - 1} onClick={() => go(win.hist[win.hi + 1], false)}>
          ›
        </button>
        <label className="cdp-search">
          <svg viewBox="0 0 16 16" width="11" height="11" className="cdp-svg" aria-hidden="true">
            <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            placeholder="Search"
            aria-label="Search projects"
            onChange={(e) => {
              setQuery(e.target.value)
              if (project) go({ ...loc, project: null })
            }}
          />
        </label>
        <div className="cdp-seg" role="group" aria-label="View">
          <button type="button" aria-pressed={view === "grid"} onClick={() => setView("grid")} aria-label="Icons">
            <svg viewBox="0 0 16 16" width="11" height="11" className="cdp-svg" aria-hidden="true">
              <path d="M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM9 9h5v5H9z" fill="currentColor" />
            </svg>
          </button>
          <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")} aria-label="List">
            <svg viewBox="0 0 16 16" width="11" height="11" className="cdp-svg" aria-hidden="true">
              <path d="M2 3h12M2 8h12M2 13h12" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </button>
        </div>
      </div>
      <div className="cdp-finder-body">
        {!narrow && (
          <nav className="cdp-side" aria-label="Sidebar">
            <p className="cdp-side-h">Favorites</p>
            <button type="button" className={"cdp-side-i" + (!loc.folder && !loc.tag ? " is-on" : "")} onClick={() => go({ folder: null, project: null, tag: null })}>
              <i style={{ background: "#3b82f6" }} />
              <span>Recents</span>
            </button>
            {c.folders.map((f, i) => (
              <button type="button" key={f.id} className={"cdp-side-i" + (loc.folder === f.id && !loc.tag ? " is-on" : "")} onClick={() => go({ folder: f.id, project: null, tag: null })}>
                <i style={{ background: ["#e0457b", "#34c759", "#f2c94c", "#a855f7", "#f6a23c"][i % 5] }} />
                <span>{f.title}</span>
              </button>
            ))}
            <p className="cdp-side-h">Tags</p>
            {c.tags.map((t, i) => (
              <button type="button" key={t} className={"cdp-side-i" + (loc.tag === t ? " is-on" : "")} onClick={() => go({ folder: null, project: null, tag: t })}>
                <i style={{ background: TAG_COLORS[i % TAG_COLORS.length] }} />
                <span>{t}</span>
              </button>
            ))}
          </nav>
        )}
        <div className="cdp-main" onClick={(e) => e.target === e.currentTarget && setSel(null)}>
          {project ? (
            <article className="cdp-detail">
              <div className="cdp-shot">
                <ProjectArt project={project} />
              </div>
              <div className="cdp-detail-info">
                <h3>{project.name}</h3>
                <p className="cdp-muted">
                  {[project.role, project.year].filter(Boolean).join(" · ")}
                </p>
                {project.description && <p>{project.description}</p>}
                {(project.tags ?? []).length > 0 && (
                  <div className="cdp-chips">
                    {(project.tags ?? []).map((t) => (
                      <button type="button" key={t} className="cdp-chip" onClick={() => go({ folder: null, project: null, tag: t })}>
                        <i style={{ background: TAG_COLORS[Math.max(0, c.tags.indexOf(t)) % TAG_COLORS.length] }} />
                        {t}
                      </button>
                    ))}
                  </div>
                )}
                <div className="cdp-chips">
                  {project.url ? (
                    <a className="cdp-chip is-solid" href={project.url} target="_blank" rel="noreferrer">
                      visit site ↗
                    </a>
                  ) : (
                    <button type="button" className="cdp-chip is-solid" onClick={() => c.openKind("contact")}>
                      ask about it
                    </button>
                  )}
                </div>
              </div>
            </article>
          ) : items.length === 0 ? (
            <p className="cdp-empty">No items match “{query}”.</p>
          ) : view === "grid" ? (
            <div className="cdp-grid" role="list">
              {items.map((p) => (
                <button
                  type="button"
                  role="listitem"
                  key={p.folderId + p.id}
                  className={"cdp-file" + (sel === p.folderId + p.id ? " is-sel" : "")}
                  onClick={(e) => {
                    setSel(p.folderId + p.id)
                    if (e.detail === 0) open(p)
                  }}
                  onPointerUp={(e) => e.pointerType === "touch" && open(p)}
                  onDoubleClick={() => open(p)}
                >
                  <FolderIcon style="plain" uid={c.uid} size={46} />
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="cdp-list" role="table">
              <div className="cdp-row is-head" role="row">
                <span>Name</span>
                <span>Year</span>
                <span>Kind</span>
              </div>
              {items.map((p) => (
                <button
                  type="button"
                  role="row"
                  key={p.folderId + p.id}
                  className={"cdp-row" + (sel === p.folderId + p.id ? " is-sel" : "")}
                  onClick={(e) => {
                    setSel(p.folderId + p.id)
                    if (e.detail === 0) open(p)
                  }}
                  onDoubleClick={() => open(p)}
                >
                  <span>
                    <FolderIcon style="plain" uid={c.uid} size={16} /> {p.name}
                  </span>
                  <span>{p.year ?? "—"}</span>
                  <span>{p.role ?? "Project"}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="cdp-status">{project ? project.name : items.length + (items.length === 1 ? " item" : " items")}</div>
    </div>
  )
}

function ContactView({ c }: { c: Ctx }) {
  const [from, setFrom] = React.useState("")
  const [subject, setSubject] = React.useState("")
  const [body, setBody] = React.useState("")
  const [sent, setSent] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const href = mailtoHref(c.email, subject || "Hello from your portfolio", body + (from ? "\n\n— " + from : ""))
  return (
    <div className="cdp-mail">
      <div className="cdp-toolbar">
        <a
          className="cdp-send"
          href={href}
          onClick={() => {
            setSent(true)
            window.setTimeout(() => setSent(false), 2400)
          }}
          aria-label="Send"
        >
          <svg viewBox="0 0 16 16" width="13" height="13" className="cdp-svg" aria-hidden="true">
            <path d="M1.5 7.5 14.5 2l-4 12-3-5z" fill="currentColor" />
          </svg>
          {sent ? "opening mail…" : "send"}
        </a>
        <button
          type="button"
          className="cdp-chip"
          onClick={() => {
            try {
              void navigator.clipboard.writeText(c.email).then(() => {
                setCopied(true)
                window.setTimeout(() => setCopied(false), 1600)
              })
            } catch {
              /* clipboard unavailable */
            }
          }}
        >
          {copied ? "copied!" : "copy address"}
        </button>
      </div>
      <label className="cdp-field">
        <span>To:</span>
        <b className="cdp-to">{c.email}</b>
      </label>
      <label className="cdp-field">
        <span>From:</span>
        <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="your name" />
      </label>
      <label className="cdp-field">
        <span>Subject:</span>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Hello from your portfolio" />
      </label>
      <textarea className="cdp-body" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Tell me about your project…" aria-label="Message" />
      {c.links.length > 0 && (
        <div className="cdp-chips cdp-pad">
          {c.links.map((l) => (
            <a key={l.url} className="cdp-chip" href={l.url} target="_blank" rel="noreferrer">
              {l.label} ↗
            </a>
          ))}
        </div>
      )}
      {sent && (
        <div className="cdp-plane" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="28" height="28" className="cdp-svg">
            <path d="M1.5 7.5 14.5 2l-4 12-3-5z" fill="var(--cdp-deep)" />
          </svg>
        </div>
      )}
    </div>
  )
}

function CalendarView({ c }: { c: Ctx }) {
  const today = React.useMemo(() => new Date(), [])
  const [cur, setCur] = React.useState({ y: today.getFullYear(), m: today.getMonth() })
  const weeks = monthGrid(cur.y, cur.m)
  const label = new Date(cur.y, cur.m, 1).toLocaleString("en", { month: "long", year: "numeric" })
  const shift = (d: number) => setCur((s) => ({ y: s.y + Math.floor((s.m + d) / 12), m: (((s.m + d) % 12) + 12) % 12 }))
  return (
    <div className="cdp-cal">
      <div className="cdp-cal-head">
        <b>{label}</b>
        <span>
          <button type="button" className="cdp-tb" aria-label="Previous month" onClick={() => shift(-1)}>
            ‹
          </button>
          <button type="button" className="cdp-tb" aria-label="Next month" onClick={() => shift(1)}>
            ›
          </button>
        </span>
      </div>
      <div className="cdp-cal-grid" role="grid">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i} className="cdp-cal-dow">
            {d}
          </span>
        ))}
        {weeks.flat().map((d, i) => {
          const isToday = d === today.getDate() && cur.m === today.getMonth() && cur.y === today.getFullYear()
          const weekend = i % 7 >= 5
          return (
            <span key={i} className={"cdp-cal-d" + (isToday ? " is-today" : "") + (weekend ? " is-off" : "")}>
              {d ?? ""}
            </span>
          )
        })}
      </div>
      <p className="cdp-avail">
        <i />
        {c.availability}
      </p>
      <a className="cdp-chip is-solid" href={mailtoHref(c.email, "Let's book a call", "")}>
        book a call
      </a>
    </div>
  )
}

type Msg = { me: boolean; text: string }

function MessagesView({ c }: { c: Ctx }) {
  const first = c.name.split(" ")[0]
  const [msgs, setMsgs] = React.useState<Msg[]>([{ me: false, text: "hey, I'm " + first + "! ask me anything ✿" }])
  const [typing, setTyping] = React.useState(false)
  const [draft, setDraft] = React.useState("")
  const end = React.useRef(null as HTMLDivElement | null)
  const timer = React.useRef(null as number | null)
  React.useEffect(() => {
    end.current?.scrollIntoView({ block: "end" })
  }, [msgs, typing])
  React.useEffect(() => () => void (timer.current !== null && window.clearTimeout(timer.current)), [])
  const ask = (q: string, a?: string) => {
    if (!q.trim() || typing) return
    setMsgs((m) => [...m, { me: true, text: q }])
    setTyping(true)
    const reply = a ?? answerFor(q, c.faq, "ooh, good one — send me an email at " + c.email + " and let's talk properly.")
    timer.current = window.setTimeout(() => {
      setTyping(false)
      setMsgs((m) => [...m, { me: false, text: reply }])
    }, 700 + Math.min(1400, reply.length * 12))
  }
  return (
    <div className="cdp-msgs">
      <div className="cdp-thread">
        <p className="cdp-thread-to">
          To: <b>{c.name}</b>
        </p>
        {msgs.map((m, i) => (
          <p key={i} className={"cdp-bubble" + (m.me ? " is-me" : "")}>
            {m.text}
          </p>
        ))}
        {typing && (
          <p className="cdp-bubble cdp-typing" aria-label="typing">
            <i />
            <i />
            <i />
          </p>
        )}
        <div ref={end} />
      </div>
      <div className="cdp-suggest">
        {c.faq.map((f) => (
          <button type="button" key={f.q} className="cdp-chip" onClick={() => ask(f.q, f.a)} disabled={typing}>
            {f.q}
          </button>
        ))}
      </div>
      <form
        className="cdp-compose"
        onSubmit={(e) => {
          e.preventDefault()
          ask(draft)
          setDraft("")
        }}
      >
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="iMessage" aria-label="Message" />
        <button type="submit" aria-label="Send" disabled={!draft.trim()}>
          ↑
        </button>
      </form>
    </div>
  )
}

function GalleryView({ c }: { c: Ctx }) {
  return (
    <div className="cdp-gallery">
      {c.projects.map((p) => (
        <button type="button" key={p.folderId + p.id} className="cdp-tile" onClick={(e) => c.openProject(p, { x: e.clientX, y: e.clientY })}>
          <ProjectArt project={p} />
          <span>{p.name}</span>
        </button>
      ))}
    </div>
  )
}

function NotesView({ c }: { c: Ctx }) {
  const [done, setDone] = React.useState({} as { [k: number]: boolean })
  const date = new Date().toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" })
  return (
    <div className="cdp-notes">
      <p className="cdp-muted">{date}</p>
      <h3>now ✿</h3>
      <ul>
        {c.now.map((t, i) => (
          <li key={i}>
            <label>
              <input type="checkbox" checked={!!done[i]} onChange={() => setDone((d) => ({ ...d, [i]: !d[i] }))} />
              <span>{t}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}

function MusicView({ c }: { c: Ctx }) {
  const { playing, play, stop } = c.music
  return (
    <div className="cdp-music" data-playing={playing ? "on" : "off"}>
      <div className="cdp-disc" aria-hidden="true">
        <svg viewBox="0 0 80 80" className="cdp-svg" width="80" height="80">
          <circle cx="40" cy="40" r="38" fill="#1d1d20" />
          {[32, 26, 20].map((r) => (
            <circle key={r} cx="40" cy="40" r={r} fill="none" stroke="#fff" strokeOpacity=".08" />
          ))}
          <circle cx="40" cy="40" r="13" fill="var(--cdp-accent)" />
          <circle cx="40" cy="40" r="2.5" fill="#1d1d20" />
        </svg>
        <svg viewBox="0 0 40 28" width="30" height="21" className="cdp-svg cdp-disc-bow">
          <Bow x={20} y={14} fill="var(--cdp-accent)" stroke="var(--cdp-deep)" />
        </svg>
      </div>
      <div className="cdp-music-info">
        <b>{c.song.title}</b>
        <span className="cdp-muted">{c.song.artist}</span>
        <div className="cdp-eq" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <i key={i} style={{ animationDelay: i * -0.17 + "s" }} />
          ))}
        </div>
        <button type="button" className="cdp-chip is-solid" onClick={playing ? stop : play} aria-pressed={playing}>
          {playing ? "❚❚ pause" : "▶ play"}
        </button>
      </div>
    </div>
  )
}

function SkillsView({ c }: { c: Ctx }) {
  return (
    <div className="cdp-skills">
      {c.skills.map((s, i) => (
        <div key={s} className="cdp-skill" style={{ animationDelay: i * 40 + "ms" }}>
          <span className="cdp-skill-badge" style={{ background: i % 3 === 0 ? "var(--cdp-deep)" : i % 3 === 1 ? "var(--cdp-accent)" : "#2e2e32", color: i % 3 === 1 ? "var(--cdp-deep)" : "#fff" }}>
            {s.replace(/[^A-Za-z0-9]/g, "").slice(0, 2)}
          </span>
          <span>{s}</span>
        </div>
      ))}
    </div>
  )
}

const TRASH = ["portfolio-v1-FINAL-final.fig", "comic-sans-experiment.css", "lorem-ipsum.txt", "marquee-tag.html"]

function TrashView() {
  const [items, setItems] = React.useState(TRASH)
  const [emptying, setEmptying] = React.useState(false)
  return (
    <div className="cdp-trash">
      {items.length ? (
        <>
          <ul className={emptying ? "is-emptying" : ""}>
            {items.map((t, i) => (
              <li key={t} style={{ animationDelay: i * 70 + "ms" }}>
                <DocIcon tone="ink" size={14} /> {t}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="cdp-chip is-solid"
            onClick={() => {
              setEmptying(true)
              window.setTimeout(() => {
                setItems([])
                setEmptying(false)
              }, 520)
            }}
          >
            empty trash
          </button>
        </>
      ) : (
        <p className="cdp-empty">
          Trash is empty — only the good stuff stays.
          <button type="button" className="cdp-link" onClick={() => setItems(TRASH)}>
            put it back
          </button>
        </p>
      )}
    </div>
  )
}

/* ---------------------------------------------------------------- windows */

const SIZES: { [K in Kind]: { w: number; h: number; title: string } } = {
  finder: { w: 600, h: 380, title: "Finder" },
  about: { w: 480, h: 340, title: "About Me" },
  contact: { w: 460, h: 400, title: "New Message" },
  calendar: { w: 300, h: 360, title: "Calendar" },
  messages: { w: 360, h: 440, title: "Messages" },
  gallery: { w: 560, h: 400, title: "Gallery" },
  notes: { w: 300, h: 320, title: "Now" },
  music: { w: 340, h: 180, title: "Music Box" },
  skills: { w: 400, h: 300, title: "Skills" },
  trash: { w: 400, h: 260, title: "Trash" },
}

function titleOf(w: Win, c: Ctx): string {
  if (w.kind !== "finder") return SIZES[w.kind].title
  const loc = w.hist[w.hi]
  if (loc.project) return c.projects.find((p) => p.id === loc.project && p.folderId === loc.folder)?.name ?? "Finder"
  if (loc.tag) return loc.tag
  return c.folders.find((f) => f.id === loc.folder)?.title ?? "Recents"
}

/* ------------------------------------------------------------- component */

export default function CoquetteDesktopPortfolio({
  name = "Kedhareswer",
  eyebrow = "welcome to my",
  headline = "portfolio",
  about = DEFAULT_ABOUT,
  folders: foldersIn = DEFAULT_FOLDERS,
  aboutIcon = { x: 12.5, y: 24 },
  contactIcon = { x: 76, y: 80 },
  email = "hello@example.com",
  links = [
    { label: "GitHub", url: "https://github.com" },
    { label: "LinkedIn", url: "https://linkedin.com" },
  ],
  availability = "Booking new projects — replies within a day",
  now = ["Shipping a design system in pink", "Learning WebGL shaders", "Reading 'Refactoring UI' again", "Drinking too much matcha"],
  skills = ["React", "Next.js", "TypeScript", "Tailwind", "Node.js", "Express", "Figma", "Motion", "PostgreSQL"],
  faq = DEFAULT_FAQ,
  song = { title: "ribbon waltz", artist: "music box · made in code" },
  accent = "#f4b6cb",
  deep = "#7d1d45",
  wallpaper: wallpaperIn = "plain",
  openOnLoad = null,
  intro = true,
  height = "100svh",
  className = "",
}: CoquetteDesktopPortfolioProps) {
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const root = React.useRef(null as HTMLDivElement | null)
  const [desk, setDesk] = React.useState({ w: 1200, h: 800 })
  const compact = desk.w < 640
  const [reduced, setReduced] = React.useState(false)
  const folders = React.useMemo(() => normalizeFolders(foldersIn), [foldersIn])
  const projects = React.useMemo(() => folders.flatMap((f) => f.projects), [folders])
  const tags = React.useMemo(() => [...new Set(projects.flatMap((p) => p.tags ?? []))].slice(0, 8), [projects])
  const [today, setToday] = React.useState(() => new Date())

  const icons = React.useMemo(
    () => [
      { id: "about", label: aboutIcon.label ?? "about me", kind: "doc" as const, tone: "ink" as const, x: aboutIcon.x, y: aboutIcon.y },
      ...folders.map((f) => ({ id: "f:" + f.id, label: f.label, kind: "folder" as const, style: f.style, folder: f.id, x: f.x, y: f.y })),
      { id: "contact", label: contactIcon.label ?? "contact me", kind: "doc" as const, tone: "accent" as const, x: contactIcon.x, y: contactIcon.y },
    ],
    [folders, aboutIcon.x, aboutIcon.y, aboutIcon.label, contactIcon.x, contactIcon.y, contactIcon.label],
  )
  const [moved, setMoved] = React.useState({} as { [k: string]: { x: number; y: number } })
  const [selected, setSelected] = React.useState(() => new Set([] as string[]))
  const [band, setBand] = React.useState(null as { x0: number; y0: number; x1: number; y1: number } | null)
  const [wins, setWins] = React.useState([] as Win[])
  const zTop = React.useRef(20)
  const winCount = React.useRef(0)
  const [launchpad, setLaunchpad] = React.useState(false)
  const [spot, setSpot] = React.useState(false)
  const [menu, setMenu] = React.useState(null as { x: number; y: number } | null)
  const [wall, setWall] = React.useState(wallpaperIn as Wallpaper)
  const [bounce, setBounce] = React.useState(null as string | null)
  const [dockX, setDockX] = React.useState(null as number | null)
  const dockRefs = React.useRef({} as { [k: string]: HTMLButtonElement | null })
  const dockBase = React.useRef({} as { [k: string]: number })
  const music = useMusicBox()

  /* ---- measure ---- */
  React.useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const read = () => setDesk({ w: el.clientWidth, h: el.clientHeight })
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const on = () => setReduced(mq.matches)
    on()
    mq.addEventListener("change", on)
    const t = window.setInterval(() => setToday(new Date()), 60000)
    return () => {
      mq.removeEventListener("change", on)
      window.clearInterval(t)
    }
  }, [])

  const local = React.useCallback((cx: number, cy: number) => {
    const r = root.current?.getBoundingClientRect()
    return r ? { x: cx - r.left, y: cy - r.top } : { x: cx, y: cy }
  }, [])

  const dockPoint = React.useCallback(
    (key: string) => {
      const el = dockRefs.current[key]
      if (!el) return { x: desk.w / 2, y: desk.h - 30 }
      const r = el.getBoundingClientRect()
      return local(r.left + r.width / 2, r.top + r.height / 2)
    },
    [desk.w, desk.h, local],
  )

  /* ---- window manager ---- */
  const later = React.useCallback((fn: () => void, ms: number) => window.setTimeout(fn, reduced ? 0 : ms), [reduced])

  const focus = React.useCallback((id: string) => {
    setWins((ws) => {
      const top = ws.reduce((m, w) => Math.max(m, w.z), 0)
      const me = ws.find((w) => w.id === id)
      if (!me || me.z === top) return ws
      zTop.current = top + 1
      return ws.map((w) => (w.id === id ? { ...w, z: top + 1 } : w))
    })
  }, [])

  const settle = React.useCallback(
    (id: string, from: Phase, to: Phase | null, ms = 280) =>
      later(
        () =>
          setWins((ws) =>
            to === null ? ws.filter((w) => !(w.id === id && w.phase === from)) : ws.map((w) => (w.id === id && w.phase === from ? { ...w, phase: to } : w)),
          ),
        ms,
      ),
    [later],
  )

  const restore = React.useCallback(
    (id: string) => {
      setWins((ws) => ws.map((w) => (w.id === id ? { ...w, phase: "in", z: ++zTop.current } : w)))
      settle(id, "in", "open")
    },
    [settle],
  )

  const bump = React.useCallback(
    (key: string) => {
      if (reduced) return
      setBounce(key)
      window.setTimeout(() => setBounce((b) => (b === key ? null : b)), 700)
    },
    [reduced],
  )

  const launch = React.useCallback(
    (kind: Kind, origin?: { x: number; y: number }, loc?: Loc) => {
      const key = kind === "finder" ? "finder" : kind
      const o = origin ?? dockPoint(key)
      if (!origin) bump(key)
      setMenu(null)
      setWins((ws) => {
        // Finder: reuse a window already showing that folder; other apps are single-window.
        const same = ws.find((w) =>
          kind === "finder" ? w.kind === "finder" && loc && w.hist[w.hi].folder === loc.folder && !w.hist[w.hi].tag : w.kind === kind,
        )
        if (same) {
          const hist = loc && kind === "finder" ? [...same.hist.slice(0, same.hi + 1), loc] : same.hist
          const wasHidden = same.phase === "hidden" || same.phase === "min"
          if (wasHidden) window.setTimeout(() => settle(same.id, "in", "open"), 0)
          return ws.map((w) =>
            w.id === same.id
              ? { ...w, z: ++zTop.current, hist, hi: loc && kind === "finder" ? hist.length - 1 : w.hi, phase: wasHidden ? "in" : w.phase, ox: wasHidden ? o.x - w.x : w.ox, oy: wasHidden ? o.y - w.y : w.oy }
              : w,
          )
        }
        const n = winCount.current++
        const size = SIZES[kind]
        const g = placeWindow(desk, size, n, compact)
        const id = kind + "-" + n
        window.setTimeout(() => settle(id, "in", "open"), 0)
        return [
          ...ws,
          {
            id,
            kind,
            ...g,
            z: ++zTop.current,
            phase: "in" as Phase,
            max: false,
            ox: o.x - g.x,
            oy: o.y - g.y,
            // a project opened straight from Spotlight/Launchpad can still go Back to its folder
            hist: loc?.project ? [{ ...loc, project: null }, loc] : [loc ?? { folder: null, project: null, tag: null }],
            hi: loc?.project ? 1 : 0,
          },
        ]
      })
    },
    [desk, compact, dockPoint, bump, settle],
  )

  const close = React.useCallback(
    (id: string) => {
      setWins((ws) => ws.map((w) => (w.id === id ? { ...w, phase: "out" } : w)))
      settle(id, "out", null, 200)
      if (id.startsWith("music-")) music.stop()
    },
    [settle, music],
  )

  const minimize = React.useCallback(
    (id: string) => {
      setWins((ws) =>
        ws.map((w) => {
          if (w.id !== id) return w
          const d = dockPoint(w.kind)
          const x = w.max ? 0 : w.x
          const y = w.max ? 0 : w.y
          return { ...w, phase: "min", ox: d.x - x, oy: d.y - y }
        }),
      )
      settle(id, "min", "hidden", 320)
    },
    [dockPoint, settle],
  )

  const go = React.useCallback((id: string, loc: Loc, push = true) => {
    setWins((ws) =>
      ws.map((w) => {
        if (w.id !== id) return w
        if (!push) {
          const hi = w.hist.findIndex((h) => h === loc)
          return { ...w, hi: hi < 0 ? w.hi : hi }
        }
        const hist = [...w.hist.slice(0, w.hi + 1), loc]
        return { ...w, hist, hi: hist.length - 1 }
      }),
    )
  }, [])

  const openKind = React.useCallback((k: Kind) => launch(k), [launch])
  const openProject = React.useCallback(
    (p: Project, from?: { x: number; y: number }) => {
      setLaunchpad(false)
      setSpot(false)
      launch("finder", from ? local(from.x, from.y) : undefined, { folder: p.folderId, project: p.id, tag: null })
    },
    [launch, local],
  )

  const onDock = (app: DockApp) => {
    if (app.kind === "launchpad") {
      bump(app.key)
      setLaunchpad((v) => !v)
      return
    }
    if (app.kind === "spotlight") {
      setSpot((v) => !v)
      return
    }
    const mine = wins.filter((w) => w.kind === app.kind)
    const hidden = mine.find((w) => w.phase === "hidden")
    if (hidden) return restore(hidden.id)
    if (mine.length) return focus(mine.reduce((a, b) => (a.z > b.z ? a : b)).id)
    launch(app.kind, undefined, app.kind === "finder" ? { folder: null, project: null, tag: null } : undefined)
  }

  /* ---- auto-open ---- */
  // The latest launch/desk, read when the timer fires, so re-measuring never cancels it.
  const opened = React.useRef(false)
  const onLoad = React.useRef(() => {})
  onLoad.current = () => {
    const o = { x: desk.w / 2, y: desk.h / 2 }
    if (openOnLoad === "about" || openOnLoad === "contact") launch(openOnLoad, o)
    else if (openOnLoad && folders.some((f) => f.id === openOnLoad)) launch("finder", o, { folder: openOnLoad, project: null, tag: null })
  }
  React.useEffect(() => {
    if (opened.current || !openOnLoad) return
    const t = window.setTimeout(
      () => {
        opened.current = true
        onLoad.current()
      },
      intro && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 900 : 60,
    )
    return () => window.clearTimeout(t)
  }, [openOnLoad, intro])

  /* ---- keyboard ---- */
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setSpot((v) => !v)
        setLaunchpad(false)
      } else if (e.key === "Escape") {
        setSpot(false)
        setLaunchpad(false)
        setMenu(null)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  /* ---- desktop icons ---- */
  const posOf = (id: string, i: number, x: number, y: number) => moved[id] ?? (compact ? compactSpot(i) : { x, y })

  const iconDown = (e: React.PointerEvent, id: string, i: number, x: number, y: number) => {
    if (e.button !== 0) return
    e.stopPropagation()
    setMenu(null)
    const start = { cx: e.clientX, cy: e.clientY, ...posOf(id, i, x, y) }
    let dragging = false
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - start.cx
      const dy = ev.clientY - start.cy
      if (!dragging && Math.hypot(dx, dy) < 4) return
      dragging = true
      el.dataset.drag = "on"
      setMoved((m) => ({
        ...m,
        [id]: { x: clamp(start.x + (dx / desk.w) * 100, 4, 96), y: clamp(start.y + (dy / desk.h) * 100, 5, 88) },
      }))
    }
    const up = (ev: PointerEvent) => {
      el.removeEventListener("pointermove", move)
      el.removeEventListener("pointerup", up)
      el.removeEventListener("pointercancel", up)
      delete el.dataset.drag
      if (!dragging) {
        if (ev.shiftKey || ev.metaKey) setSelected((s) => new Set(s.has(id) ? [...s].filter((v) => v !== id) : [...s, id]))
        else setSelected(new Set([id]))
        if (ev.pointerType === "touch") openIcon(id, el)
      }
    }
    el.addEventListener("pointermove", move)
    el.addEventListener("pointerup", up)
    el.addEventListener("pointercancel", up)
  }

  const openIcon = (id: string, el?: HTMLElement | null) => {
    const r = el?.getBoundingClientRect()
    const o = r ? local(r.left + r.width / 2, r.top + r.height / 2) : undefined
    if (id === "about" || id === "contact") launch(id as Kind, o)
    else launch("finder", o, { folder: id.slice(2), project: null, tag: null })
  }

  const surfaceDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || e.target !== e.currentTarget) return
    setMenu(null)
    setSelected(new Set())
    const p = local(e.clientX, e.clientY)
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)
    setBand({ x0: p.x, y0: p.y, x1: p.x, y1: p.y })
    const move = (ev: PointerEvent) => {
      const q = local(ev.clientX, ev.clientY)
      setBand({ x0: p.x, y0: p.y, x1: q.x, y1: q.y })
      const L = Math.min(p.x, q.x)
      const R = Math.max(p.x, q.x)
      const T = Math.min(p.y, q.y)
      const B = Math.max(p.y, q.y)
      const hit = icons
        .map((ic, i) => ({ id: ic.id, ...posOf(ic.id, i, ic.x, ic.y) }))
        .filter((ic) => {
          const cx = (ic.x / 100) * desk.w
          const cy = (ic.y / 100) * desk.h
          return cx + 40 > L && cx - 40 < R && cy + 40 > T && cy - 40 < B
        })
        .map((ic) => ic.id)
      setSelected(new Set(hit))
    }
    const up = () => {
      el.removeEventListener("pointermove", move)
      el.removeEventListener("pointerup", up)
      el.removeEventListener("pointercancel", up)
      setBand(null)
    }
    el.addEventListener("pointermove", move)
    el.addEventListener("pointerup", up)
    el.addEventListener("pointercancel", up)
  }

  /* ---- window drag / resize ---- */
  const dragWin = (e: React.PointerEvent, w: Win, mode: "move" | "size") => {
    if (e.button !== 0) return
    if ((e.target as HTMLElement).closest("button,input,a") && mode === "move") return
    e.preventDefault()
    focus(w.id)
    const start = { cx: e.clientX, cy: e.clientY, x: w.x, y: w.y, w: w.w, h: w.h }
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - start.cx
      const dy = ev.clientY - start.cy
      setWins((ws) =>
        ws.map((x) => {
          if (x.id !== w.id) return x
          if (mode === "size") return { ...x, max: false, w: clamp(start.w + dx, 260, desk.w - x.x), h: clamp(start.h + dy, 160, desk.h - x.y) }
          if (x.max) return x
          return { ...x, ...clampWindow(start.x + dx, start.y + dy, x.w, desk) }
        }),
      )
    }
    const up = () => {
      el.removeEventListener("pointermove", move)
      el.removeEventListener("pointerup", up)
      el.removeEventListener("pointercancel", up)
    }
    el.addEventListener("pointermove", move)
    el.addEventListener("pointerup", up)
    el.addEventListener("pointercancel", up)
  }

  /* ---- dock magnification ---- */
  const dockMove = (e: React.PointerEvent) => {
    if (reduced || e.pointerType !== "mouse" || compact) return
    if (dockX === null) {
      for (const a of DOCK) {
        const el = dockRefs.current[a.key]
        if (el) {
          const r = el.getBoundingClientRect()
          dockBase.current[a.key] = r.left + r.width / 2
        }
      }
    }
    setDockX(e.clientX)
  }

  const c: Ctx = {
    name,
    about: { title: about.title ?? "about me", paragraphs: about.paragraphs },
    folders,
    projects,
    tags,
    email,
    links,
    availability,
    now,
    skills,
    faq,
    song,
    uid,
    openProject,
    openKind,
    music,
  }

  const running = new Set(wins.map((w) => w.kind as string))
  const topZ = wins.reduce((m, w) => (w.phase === "hidden" ? m : Math.max(m, w.z)), 0)
  const WALLS: Record<Wallpaper, string> = {
    plain: "var(--cdp-desk)",
    blush: "radial-gradient(120% 90% at 50% 45%, var(--cdp-desk) 40%, color-mix(in oklab, var(--cdp-accent) 38%, var(--cdp-desk)))",
    gingham:
      "repeating-linear-gradient(0deg, color-mix(in oklab, var(--cdp-accent) 18%, transparent) 0 22px, transparent 22px 44px), repeating-linear-gradient(90deg, color-mix(in oklab, var(--cdp-accent) 18%, transparent) 0 22px, transparent 22px 44px), var(--cdp-desk)",
    dots: "radial-gradient(color-mix(in oklab, var(--cdp-accent) 55%, transparent) 1.4px, transparent 1.6px) 0 0 / 22px 22px, var(--cdp-desk)",
  }

  return (
    <div
      ref={root}
      className={"cdp-root " + className}
      data-intro={intro && !reduced ? "on" : "off"}
      data-compact={compact ? "on" : "off"}
      style={{ height, "--cdp-accent": accent, "--cdp-deep": deep, background: WALLS[wall] } as React.CSSProperties}
      onContextMenu={(e) => {
        if ((e.target as HTMLElement).closest(".cdp-win,.cdp-dock,.cdp-over")) return
        e.preventDefault()
        const p = local(e.clientX, e.clientY)
        setMenu({ x: clamp(p.x, 4, desk.w - 200), y: clamp(p.y, 4, desk.h - 190) })
      }}
    >
      <style>{CDP_CSS}</style>
      <svg width="0" height="0" className="cdp-defs" aria-hidden="true">
        <defs>
          <pattern id={uid + "-ging"} width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="4" height="8" fill="#fff" opacity=".28" />
            <rect width="8" height="4" fill="#fff" opacity=".28" />
          </pattern>
          <pattern id={uid + "-lace"} width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r=".95" fill="#fff" opacity=".85" />
          </pattern>
          <linearGradient id={uid + "-grad"} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ff5c9a" />
            <stop offset="1" stopColor="#f9c6d8" />
          </linearGradient>
        </defs>
      </svg>

      <div className="cdp-surface" onPointerDown={surfaceDown} />

      <h1 className="cdp-hello">
        <span className="cdp-eyebrow">{eyebrow}</span>
        <span className="cdp-headline">
          {headline}
          <svg viewBox="0 0 40 28" className="cdp-svg cdp-hello-bow" aria-hidden="true">
            <Bow x={20} y={14} r={-14} fill="var(--cdp-accent)" stroke="var(--cdp-deep)" />
          </svg>
        </span>
      </h1>

      {icons.map((ic, i) => {
        const p = posOf(ic.id, i, ic.x, ic.y)
        return (
          <button
            type="button"
            key={ic.id}
            className={"cdp-icon" + (selected.has(ic.id) ? " is-sel" : "")}
            style={{ left: p.x + "%", top: p.y + "%", "--i": i } as React.CSSProperties}
            onPointerDown={(e) => iconDown(e, ic.id, i, ic.x, ic.y)}
            onDoubleClick={(e) => openIcon(ic.id, e.currentTarget)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                openIcon(ic.id, e.currentTarget)
              }
            }}
            aria-label={"Open " + ic.label}
          >
            <span className="cdp-icon-art">
              {ic.kind === "doc" ? <DocIcon tone={ic.tone} size={compact ? 34 : 40} /> : <FolderIcon style={ic.style} uid={uid} size={compact ? 56 : 72} />}
            </span>
            <span className="cdp-icon-label">{ic.label}</span>
          </button>
        )
      })}

      {band && (
        <div
          className="cdp-band"
          style={{ left: Math.min(band.x0, band.x1), top: Math.min(band.y0, band.y1), width: Math.abs(band.x1 - band.x0), height: Math.abs(band.y1 - band.y0) }}
        />
      )}

      {wins.map((w) => {
        const style: React.CSSProperties = w.max
          ? { left: 0, top: 0, width: desk.w, height: desk.h - DOCK_RESERVE, zIndex: w.z }
          : { left: w.x, top: w.y, width: w.w, height: w.h, zIndex: w.z }
        ;(style as Record<string, string | number>)["--ox"] = (w.max ? w.ox + w.x : w.ox) + "px"
        ;(style as Record<string, string | number>)["--oy"] = (w.max ? w.oy + w.y : w.oy) + "px"
        const title = titleOf(w, c)
        return (
          <section
            key={w.id}
            role="dialog"
            aria-label={title}
            className={"cdp-win is-" + w.phase + (w.z === topZ ? " is-top" : "") + " cdp-k-" + w.kind}
            style={style}
            onPointerDownCapture={() => focus(w.id)}
          >
            <header className="cdp-bar" onPointerDown={(e) => dragWin(e, w, "move")} onDoubleClick={(e) => !(e.target as HTMLElement).closest("button") && setWins((ws) => ws.map((x) => (x.id === w.id ? { ...x, max: !x.max } : x)))}>
              <span className="cdp-lights">
                <button type="button" className="cdp-l is-r" aria-label="Close" onClick={() => close(w.id)}>
                  <svg viewBox="0 0 8 8" className="cdp-svg" aria-hidden="true">
                    <path d="M2 2l4 4M6 2 2 6" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                </button>
                <button type="button" className="cdp-l is-y" aria-label="Minimize" onClick={() => minimize(w.id)}>
                  <svg viewBox="0 0 8 8" className="cdp-svg" aria-hidden="true">
                    <path d="M1.5 4h5" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                </button>
                <button type="button" className="cdp-l is-g" aria-label="Zoom" onClick={() => setWins((ws) => ws.map((x) => (x.id === w.id ? { ...x, max: !x.max } : x)))}>
                  <svg viewBox="0 0 8 8" className="cdp-svg" aria-hidden="true">
                    <path d="M2 5.8V2h3.8zM6 2.2V6H2.2z" fill="currentColor" />
                  </svg>
                </button>
              </span>
              <span className="cdp-title">{title}</span>
            </header>
            <div className="cdp-content">
              {w.kind === "about" && <AboutView c={c} />}
              {w.kind === "finder" && <FinderView win={w} c={c} go={(loc, push) => go(w.id, loc, push)} narrow={(w.max ? desk.w : w.w) < 460} />}
              {w.kind === "contact" && <ContactView c={c} />}
              {w.kind === "calendar" && <CalendarView c={c} />}
              {w.kind === "messages" && <MessagesView c={c} />}
              {w.kind === "gallery" && <GalleryView c={c} />}
              {w.kind === "notes" && <NotesView c={c} />}
              {w.kind === "music" && <MusicView c={c} />}
              {w.kind === "skills" && <SkillsView c={c} />}
              {w.kind === "trash" && <TrashView />}
            </div>
            {!w.max && !compact && <span className="cdp-grip" onPointerDown={(e) => dragWin(e, w, "size")} aria-hidden="true" />}
          </section>
        )
      })}

      <nav className="cdp-dock" aria-label="Dock" onPointerMove={dockMove} onPointerLeave={() => setDockX(null)}>
        {DOCK.map((a) => {
          const s = dockX === null ? 1 : dockScale(dockX, dockBase.current[a.key] ?? 0)
          return (
            <React.Fragment key={a.key}>
              {a.key === "trash" && <span className="cdp-dock-sep" aria-hidden="true" />}
              <button
                type="button"
                ref={(el) => {
                  dockRefs.current[a.key] = el
                }}
                className={"cdp-dock-btn" + (bounce === a.key ? " is-bounce" : "")}
                style={{ "--s": s } as React.CSSProperties}
                onClick={() => onDock(a)}
                aria-label={a.label}
              >
                <span className="cdp-tip">{a.label}</span>
                <span className="cdp-dock-art">
                  <DockIcon app={a.key} uid={uid} now={today} />
                </span>
                {(running.has(a.kind) || (a.kind === "launchpad" && launchpad) || (a.kind === "music" && music.playing)) && <i className="cdp-run" />}
              </button>
            </React.Fragment>
          )
        })}
      </nav>

      {menu && (
        <div className="cdp-menu" role="menu" style={{ left: menu.x, top: menu.y }}>
          <button type="button" role="menuitem" onClick={() => launch("about", menu)}>
            Get Info…
          </button>
          <button type="button" role="menuitem" onClick={() => (setMenu(null), setLaunchpad(true))}>
            Show All Work
          </button>
          <hr />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMoved({})
              setMenu(null)
            }}
          >
            Clean Up
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              const order: Wallpaper[] = ["plain", "blush", "gingham", "dots"]
              setWall((w) => order[(order.indexOf(w) + 1) % order.length])
              setMenu(null)
            }}
          >
            Change Wallpaper
          </button>
          <hr />
          <button type="button" role="menuitem" onClick={() => launch("contact", menu)}>
            New Message…
          </button>
        </div>
      )}

      {launchpad && <Launchpad c={c} onClose={() => setLaunchpad(false)} />}
      {spot && (
        <Spotlight
          c={c}
          onClose={() => setSpot(false)}
          onPick={(r) => {
            setSpot(false)
            if (r.project) openProject(r.project)
            else if (r.folder) launch("finder", undefined, { folder: r.folder, project: null, tag: null })
            else if (r.kind) launch(r.kind)
          }}
        />
      )}
    </div>
  )
}

/* -------------------------------------------------------------- overlays */

function Launchpad({ c, onClose }: { c: Ctx; onClose: () => void }) {
  const [q, setQ] = React.useState("")
  const items = filterProjects(c.projects, q, null)
  return (
    <div className="cdp-over cdp-launch" onClick={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-label="Launchpad">
      <input className="cdp-launch-q" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search work" />
      <div className="cdp-launch-grid" onClick={(e) => e.target === e.currentTarget && onClose()}>
        {items.map((p, i) => (
          <button type="button" key={p.folderId + p.id} className="cdp-app" style={{ animationDelay: i * 25 + "ms" }} onClick={(e) => c.openProject(p, { x: e.clientX, y: e.clientY })}>
            <span className="cdp-app-art">
              <ProjectArt project={p} square />
            </span>
            <span>{p.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

type Hit = { label: string; sub: string; project?: Project; folder?: string; kind?: Kind }

function Spotlight({ c, onClose, onPick }: { c: Ctx; onClose: () => void; onPick: (h: Hit) => void }) {
  const [q, setQ] = React.useState("")
  const [i, setI] = React.useState(0)
  const apps: Hit[] = (Object.keys(SIZES) as Kind[]).filter((k) => k !== "finder").map((k) => ({ label: SIZES[k].title, sub: "Application", kind: k }))
  const all: Hit[] = [
    ...c.projects.map((p) => ({ label: p.name, sub: c.folders.find((f) => f.id === p.folderId)?.title ?? "Project", project: p })),
    ...c.folders.map((f) => ({ label: f.title, sub: "Folder", folder: f.id })),
    ...apps,
  ]
  const needle = q.trim().toLowerCase()
  const hits = (needle ? all.filter((h) => (h.label + " " + h.sub + " " + (h.project?.tags ?? []).join(" ")).toLowerCase().includes(needle)) : all).slice(0, 8)
  const cur = Math.min(i, Math.max(0, hits.length - 1))
  return (
    <div className="cdp-over cdp-spot-wrap" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cdp-spot" role="dialog" aria-label="Spotlight">
        <div className="cdp-spot-in">
          <svg viewBox="0 0 16 16" width="18" height="18" className="cdp-svg" aria-hidden="true">
            <circle cx="7" cy="7" r="4.8" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="m10.6 10.6 3.2 3.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            autoFocus
            value={q}
            placeholder="Spotlight Search"
            aria-label="Spotlight Search"
            onChange={(e) => {
              setQ(e.target.value)
              setI(0)
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") (e.preventDefault(), setI((v) => Math.min(v + 1, hits.length - 1)))
              if (e.key === "ArrowUp") (e.preventDefault(), setI((v) => Math.max(v - 1, 0)))
              if (e.key === "Enter" && hits[cur]) onPick(hits[cur])
            }}
          />
        </div>
        {hits.length > 0 && (
          <ul className="cdp-spot-list" role="listbox">
            {hits.map((h, n) => (
              <li key={h.label + h.sub} role="option" aria-selected={n === cur}>
                <button type="button" className={n === cur ? "is-on" : ""} onMouseEnter={() => setI(n)} onClick={() => onPick(h)}>
                  <span className="cdp-spot-ic">
                    {h.project ? <FolderIcon style="plain" uid={c.uid} size={20} /> : h.folder ? <FolderIcon style={c.folders.find((f) => f.id === h.folder)?.style ?? "plain"} uid={c.uid} size={20} /> : <DockIcon app={h.kind ?? "finder"} uid={c.uid} now={new Date()} />}
                  </span>
                  <b>{h.label}</b>
                  <span className="cdp-muted">{h.sub}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------- css */

const CDP_CSS = `
.cdp-root{--cdp-bg:var(--color-background,#fff);--cdp-fg:var(--color-foreground,#161616);--cdp-mute:var(--color-muted-foreground,#777);--cdp-line:var(--color-border,#e4e4e4);--cdp-desk:color-mix(in oklab,var(--cdp-bg) 93%,var(--cdp-fg));--cdp-chrome:color-mix(in oklab,var(--cdp-bg) 95%,var(--cdp-fg));--cdp-side:color-mix(in oklab,var(--cdp-bg) 96.5%,var(--cdp-fg));position:relative;width:100%;overflow:hidden;isolation:isolate;container-type:size;color:var(--cdp-fg);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",system-ui,Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.45;user-select:none;-webkit-user-select:none;touch-action:manipulation}
.cdp-root :where(button),.cdp-root :where(input),.cdp-root :where(textarea){font:inherit;color:inherit}
.cdp-root :where(button){background:none;border:0;padding:0;cursor:default}
.cdp-svg{display:block;max-width:none;flex:none;overflow:visible}
.cdp-defs{position:absolute;width:0;height:0;overflow:hidden}
.cdp-surface{position:absolute;inset:0}
.cdp-muted{color:var(--cdp-mute)}

.cdp-hello{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);margin:0;display:flex;flex-direction:column;align-items:center;pointer-events:none;text-align:center;white-space:nowrap}
.cdp-root[data-compact="on"] .cdp-hello{top:62%}
.cdp-eyebrow{font-weight:300;font-size:clamp(13px,1.9cqw,22px);letter-spacing:.01em;color:color-mix(in oklab,var(--cdp-fg) 78%,transparent)}
.cdp-headline{position:relative;font-family:"Times New Roman",Times,"Liberation Serif",Tinos,Georgia,serif;font-style:italic;font-weight:700;font-size:clamp(52px,9.4cqw,132px);line-height:.95;letter-spacing:-.02em;padding:0 .08em}
.cdp-hello-bow{position:absolute;right:-.3em;top:-.12em;width:.4em;height:.28em}

.cdp-icon{position:absolute;display:flex;flex-direction:column;align-items:center;gap:4px;width:96px;transform:translate(-50%,-50%);touch-action:none;outline:none;z-index:2}
.cdp-icon-art{display:grid;place-items:center;min-width:62px;min-height:54px;padding:3px 6px;border-radius:6px;transition:transform .18s ease}
.cdp-icon:hover .cdp-icon-art{transform:translateY(-2px)}
.cdp-icon[data-drag] .cdp-icon-art{transform:scale(1.06);filter:drop-shadow(0 8px 10px rgba(0,0,0,.18))}
.cdp-icon-label{font-size:11.5px;padding:1px 6px;border-radius:4px;line-height:1.35;max-width:96px;text-align:center}
.cdp-icon.is-sel .cdp-icon-art{background:color-mix(in oklab,var(--cdp-fg) 10%,transparent)}
.cdp-icon.is-sel .cdp-icon-label{background:var(--cdp-deep);color:#fff}
.cdp-icon:focus-visible .cdp-icon-label{outline:2px solid var(--cdp-deep);outline-offset:1px}
.cdp-band{position:absolute;z-index:3;border:1px solid color-mix(in oklab,var(--cdp-deep) 70%,transparent);background:color-mix(in oklab,var(--cdp-accent) 25%,transparent);pointer-events:none}

.cdp-win{position:absolute;display:flex;flex-direction:column;background:var(--cdp-bg);border-radius:10px;overflow:hidden;box-shadow:0 0 0 .5px rgba(0,0,0,.18),0 10px 30px rgba(0,0,0,.12),0 30px 60px -20px rgba(0,0,0,.18);transform-origin:var(--ox) var(--oy)}
.cdp-win:not(.is-top) .cdp-l{background:color-mix(in oklab,var(--cdp-fg) 18%,var(--cdp-bg))}
.cdp-win.is-in{animation:cdp-open .28s cubic-bezier(.2,.9,.3,1.05) both}
.cdp-win.is-out{animation:cdp-close .2s ease-in both;pointer-events:none}
.cdp-win.is-min{animation:cdp-min .32s cubic-bezier(.5,0,.8,.4) both;pointer-events:none}
.cdp-win.is-hidden{visibility:hidden;pointer-events:none}
@keyframes cdp-open{from{opacity:0;transform:scale(.12)}to{opacity:1;transform:none}}
@keyframes cdp-close{to{opacity:0;transform:scale(.92)}}
@keyframes cdp-min{to{opacity:.2;transform:scale(.04,.02)}}
.cdp-bar{position:relative;display:flex;align-items:center;height:28px;flex:none;padding:0 10px;background:var(--cdp-chrome);border-bottom:1px solid var(--cdp-line);touch-action:none}
.cdp-lights{display:flex;gap:7px;position:relative;z-index:1}
.cdp-l{width:12px;height:12px;border-radius:50%;display:grid;place-items:center;color:rgba(0,0,0,.55);box-shadow:inset 0 0 0 .5px rgba(0,0,0,.12)}
.cdp-l svg{width:7px;height:7px;opacity:0}
.cdp-lights:hover .cdp-l svg,.cdp-l:focus-visible svg{opacity:1}
.cdp-l.is-r{background:#ff5f57}.cdp-l.is-y{background:#febc2e}.cdp-l.is-g{background:#28c840}
.cdp-title{position:absolute;inset:0 70px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:color-mix(in oklab,var(--cdp-fg) 72%,transparent);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;pointer-events:none}
.cdp-content{position:relative;flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden}
.cdp-grip{position:absolute;right:0;bottom:0;width:16px;height:16px;cursor:nwse-resize;touch-action:none;z-index:2}

.cdp-doc{padding:14px 22px 20px;overflow:auto;user-select:text;-webkit-user-select:text}
.cdp-doc-h{margin:0 0 8px;font-size:21px;font-weight:700;letter-spacing:-.01em}
.cdp-doc p{margin:0 0 10px;font-size:12.5px;color:color-mix(in oklab,var(--cdp-fg) 86%,transparent)}
.cdp-doc-sign{display:flex;align-items:center;gap:6px;margin:4px 0 12px;font-family:Georgia,"Times New Roman",serif;font-style:italic;font-size:16px}
.cdp-chips{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.cdp-pad{padding:8px 12px}
.cdp-chip{display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 10px;border-radius:999px;border:1px solid var(--cdp-line);background:var(--cdp-bg);font-size:11.5px;text-decoration:none;color:inherit;cursor:pointer;transition:transform .15s ease,background .15s ease;white-space:nowrap}
.cdp-root .cdp-chip{cursor:pointer}
.cdp-chip:hover{background:color-mix(in oklab,var(--cdp-accent) 22%,var(--cdp-bg))}
.cdp-chip:active{transform:scale(.96)}
.cdp-chip:disabled{opacity:.5}
.cdp-chip i{width:8px;height:8px;border-radius:50%}
.cdp-chip.is-solid{background:var(--cdp-deep);border-color:var(--cdp-deep);color:#fff}
.cdp-chip.is-solid:hover{background:color-mix(in oklab,var(--cdp-deep) 85%,#000)}

.cdp-finder,.cdp-mail,.cdp-msgs{display:flex;flex-direction:column;flex:1;min-height:0}
.cdp-toolbar{display:flex;align-items:center;gap:6px;height:34px;flex:none;padding:0 10px;border-bottom:1px solid var(--cdp-line);background:var(--cdp-bg)}
.cdp-tb{width:22px;height:22px;border-radius:5px;font-size:18px;line-height:1;display:inline-grid;place-items:center;color:color-mix(in oklab,var(--cdp-fg) 70%,transparent)}
.cdp-root .cdp-tb:hover:not(:disabled){background:color-mix(in oklab,var(--cdp-fg) 8%,transparent)}
.cdp-tb:disabled{opacity:.3}
.cdp-search{flex:1;display:flex;align-items:center;gap:6px;height:22px;padding:0 8px;border-radius:6px;background:color-mix(in oklab,var(--cdp-fg) 6%,var(--cdp-bg));color:var(--cdp-mute);max-width:260px}
.cdp-search input{flex:1;min-width:0;border:0;outline:0;background:none;font-size:12px;color:var(--cdp-fg);user-select:text}
.cdp-seg{margin-left:auto;display:flex;border-radius:6px;overflow:hidden;background:color-mix(in oklab,var(--cdp-fg) 6%,var(--cdp-bg))}
.cdp-seg button{width:26px;height:22px;display:grid;place-items:center;color:var(--cdp-mute)}
.cdp-seg button[aria-pressed="true"]{background:color-mix(in oklab,var(--cdp-fg) 14%,var(--cdp-bg));color:var(--cdp-fg)}
.cdp-finder-body{flex:1;min-height:0;display:flex}
.cdp-side{width:160px;flex:none;overflow:auto;padding:8px 8px;background:var(--cdp-side);border-right:1px solid var(--cdp-line)}
.cdp-side-h{margin:8px 6px 3px;font-size:10.5px;font-weight:600;color:var(--cdp-mute)}
.cdp-side-i{display:flex;align-items:center;gap:7px;width:100%;padding:3px 6px;border-radius:5px;font-size:12px;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cdp-side-i span{overflow:hidden;text-overflow:ellipsis}
.cdp-side-i i{width:9px;height:9px;border-radius:50%;flex:none}
.cdp-side-i:hover{background:color-mix(in oklab,var(--cdp-fg) 6%,transparent)}
.cdp-side-i.is-on{background:color-mix(in oklab,var(--cdp-fg) 11%,transparent);font-weight:600}
.cdp-main{flex:1;min-width:0;overflow:auto;container-type:inline-size;background:color-mix(in oklab,var(--cdp-bg) 98.5%,var(--cdp-fg))}
.cdp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:8px 6px;padding:18px 14px}
.cdp-file{display:flex;flex-direction:column;align-items:center;gap:6px;padding:6px 4px;border-radius:6px;outline:none}
.cdp-file span{font-size:11.5px;padding:1px 5px;border-radius:4px;text-align:center;line-height:1.3}
.cdp-file:hover .cdp-svg{transform:translateY(-2px)}
.cdp-file .cdp-svg{transition:transform .18s ease}
.cdp-file.is-sel{background:color-mix(in oklab,var(--cdp-fg) 8%,transparent)}
.cdp-file.is-sel span,.cdp-file:focus-visible span{background:var(--cdp-deep);color:#fff}
.cdp-list{display:flex;flex-direction:column;padding:4px 0}
.cdp-row{display:grid;grid-template-columns:1.6fr .5fr 1fr;gap:8px;align-items:center;padding:4px 14px;font-size:12px;text-align:left}
.cdp-row>span:first-child{display:flex;align-items:center;gap:6px}
.cdp-row:nth-child(odd):not(.is-head){background:color-mix(in oklab,var(--cdp-fg) 3%,transparent)}
.cdp-row.is-head{font-size:11px;color:var(--cdp-mute);border-bottom:1px solid var(--cdp-line)}
.cdp-row.is-sel,.cdp-row:focus-visible{background:var(--cdp-deep);color:#fff;outline:none}
.cdp-status{flex:none;height:22px;display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--cdp-mute);border-top:1px solid var(--cdp-line);background:var(--cdp-chrome)}
.cdp-empty{margin:auto;padding:28px 16px;text-align:center;color:var(--cdp-mute);font-size:12px;display:flex;flex-direction:column;align-items:center;gap:8px}
.cdp-link{color:var(--cdp-deep);text-decoration:underline;cursor:pointer}
.cdp-detail{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:18px;padding:18px;animation:cdp-fade .25s ease both;user-select:text;-webkit-user-select:text}
.cdp-shot{border-radius:8px;overflow:hidden;box-shadow:0 0 0 1px var(--cdp-line),0 12px 24px -12px rgba(0,0,0,.3);aspect-ratio:16/10;align-self:start}
.cdp-shot .cdp-svg{width:100%;height:100%}
.cdp-detail-info{display:flex;flex-direction:column;gap:8px}
.cdp-detail-info h3{margin:0;font-family:Georgia,"Times New Roman",serif;font-style:italic;font-size:24px;line-height:1.05}
.cdp-detail-info p{margin:0;font-size:12.5px}
@container (max-width:420px){.cdp-detail{grid-template-columns:1fr}}
@keyframes cdp-fade{from{opacity:0;transform:translateY(4px)}}

.cdp-mail{position:relative}
.cdp-send{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 12px;border-radius:6px;background:var(--cdp-deep);color:#fff;text-decoration:none;font-size:12px;font-weight:600;cursor:pointer}
.cdp-send:active{transform:scale(.96)}
.cdp-field{display:flex;align-items:center;gap:8px;min-height:30px;padding:0 14px;border-bottom:1px solid var(--cdp-line);font-size:12.5px}
.cdp-field>span{color:var(--cdp-mute);width:52px;flex:none}
.cdp-field input{flex:1;min-width:0;border:0;outline:0;background:none;user-select:text}
.cdp-to{display:inline-flex;padding:1px 8px;border-radius:999px;background:color-mix(in oklab,var(--cdp-accent) 35%,var(--cdp-bg));color:var(--cdp-deep);font-weight:600;font-size:12px}
.cdp-body{flex:1;min-height:60px;border:0;outline:0;resize:none;padding:12px 14px;background:none;font-size:13px;user-select:text}
.cdp-plane{position:absolute;left:40%;top:50%;animation:cdp-fly 1.1s cubic-bezier(.5,0,.6,1) both;pointer-events:none}
@keyframes cdp-fly{0%{transform:translate(0,0) rotate(0);opacity:0}15%{opacity:1}100%{transform:translate(220px,-260px) rotate(-20deg);opacity:0}}

.cdp-cal{padding:12px 14px 14px;display:flex;flex-direction:column;gap:10px;overflow:auto}
.cdp-cal-head{display:flex;align-items:center;justify-content:space-between;font-size:14px}
.cdp-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center}
.cdp-cal-dow{font-size:10px;color:var(--cdp-mute);padding-bottom:4px}
.cdp-cal-d{display:grid;place-items:center;height:28px;border-radius:50%;font-size:12px;font-variant-numeric:tabular-nums}
.cdp-cal-d.is-off{color:var(--cdp-mute)}
.cdp-cal-d.is-today{background:var(--cdp-deep);color:#fff;font-weight:700}
.cdp-avail{display:flex;align-items:center;gap:8px;margin:0;font-size:12px}
.cdp-avail i{width:8px;height:8px;border-radius:50%;background:#34c759;box-shadow:0 0 0 3px color-mix(in oklab,#34c759 25%,transparent);animation:cdp-pulse 1.8s ease-in-out infinite}
@keyframes cdp-pulse{50%{box-shadow:0 0 0 6px transparent}}
.cdp-cal .cdp-chip{align-self:flex-start}

.cdp-thread{flex:1;overflow:auto;padding:10px 12px;display:flex;flex-direction:column;gap:5px}
.cdp-thread-to{margin:0 0 6px;text-align:center;font-size:11px;color:var(--cdp-mute)}
.cdp-bubble{margin:0;max-width:78%;padding:6px 11px;border-radius:16px;background:color-mix(in oklab,var(--cdp-fg) 8%,var(--cdp-bg));font-size:12.5px;align-self:flex-start;animation:cdp-pop .22s cubic-bezier(.2,.9,.3,1.3) both;user-select:text;-webkit-user-select:text}
.cdp-bubble.is-me{align-self:flex-end;background:var(--cdp-deep);color:#fff}
.cdp-typing{display:flex;gap:3px;padding:9px 12px}
.cdp-typing i{width:6px;height:6px;border-radius:50%;background:var(--cdp-mute);animation:cdp-dot 1s ease-in-out infinite}
.cdp-typing i:nth-child(2){animation-delay:.15s}.cdp-typing i:nth-child(3){animation-delay:.3s}
@keyframes cdp-dot{50%{transform:translateY(-3px);opacity:.4}}
@keyframes cdp-pop{from{opacity:0;transform:scale(.8) translateY(6px)}}
.cdp-suggest{display:flex;gap:5px;overflow-x:auto;padding:6px 10px;flex:none;scrollbar-width:none}
.cdp-compose{display:flex;gap:6px;padding:8px 10px;flex:none;border-top:1px solid var(--cdp-line)}
.cdp-compose input{flex:1;min-width:0;height:26px;padding:0 11px;border-radius:999px;border:1px solid var(--cdp-line);outline:0;background:var(--cdp-bg);user-select:text}
.cdp-compose button{width:26px;height:26px;border-radius:50%;background:var(--cdp-deep);color:#fff;font-weight:700;cursor:pointer}
.cdp-compose button:disabled{opacity:.35}

.cdp-gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;padding:14px;overflow:auto}
.cdp-tile{display:flex;flex-direction:column;gap:6px;text-align:left;font-size:11.5px;cursor:pointer}
.cdp-tile .cdp-svg{width:100%;height:auto;aspect-ratio:16/10;border-radius:6px;box-shadow:0 0 0 1px var(--cdp-line);transition:transform .2s ease,box-shadow .2s ease}
.cdp-tile:hover .cdp-svg{transform:translateY(-3px) rotate(-.6deg);box-shadow:0 0 0 1px var(--cdp-line),0 12px 20px -10px rgba(0,0,0,.35)}

.cdp-notes{padding:12px 18px;overflow:auto;background:color-mix(in oklab,#fff5c9 45%,var(--cdp-bg));flex:1}
.cdp-notes p{margin:0;font-size:11px}
.cdp-notes h3{margin:2px 0 8px;font-size:19px}
.cdp-notes ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.cdp-notes label{display:flex;gap:8px;align-items:flex-start;font-size:12.5px;cursor:pointer}
.cdp-notes input{accent-color:var(--cdp-deep);margin-top:3px}
.cdp-notes input:checked+span{text-decoration:line-through;color:var(--cdp-mute)}

.cdp-music{display:flex;align-items:center;gap:16px;padding:14px 18px;flex:1}
.cdp-disc{position:relative;flex:none}
.cdp-disc>.cdp-svg:first-child{animation:cdp-spin 4s linear infinite;animation-play-state:paused}
.cdp-music[data-playing="on"] .cdp-disc>.cdp-svg:first-child{animation-play-state:running}
.cdp-disc-bow{position:absolute;right:-8px;top:-6px}
@keyframes cdp-spin{to{transform:rotate(360deg)}}
.cdp-music-info{display:flex;flex-direction:column;gap:3px;min-width:0}
.cdp-music-info b{font-family:Georgia,"Times New Roman",serif;font-style:italic;font-size:17px}
.cdp-music-info span{font-size:11.5px}
.cdp-music-info .cdp-chip{align-self:flex-start;margin-top:6px}
.cdp-eq{display:flex;align-items:flex-end;gap:3px;height:14px;margin-top:4px}
.cdp-eq i{width:3px;height:100%;border-radius:2px;background:var(--cdp-deep);transform-origin:bottom;transform:scaleY(.25);animation:cdp-eq .7s ease-in-out infinite alternate;animation-play-state:paused}
.cdp-music[data-playing="on"] .cdp-eq i{animation-play-state:running}
@keyframes cdp-eq{to{transform:scaleY(1)}}

.cdp-skills{display:grid;grid-template-columns:repeat(auto-fill,minmax(82px,1fr));gap:12px 8px;padding:16px;overflow:auto}
.cdp-skill{display:flex;flex-direction:column;align-items:center;gap:6px;font-size:11.5px;text-align:center;animation:cdp-pop .3s cubic-bezier(.2,.9,.3,1.3) both}
.cdp-skill-badge{display:grid;place-items:center;width:44px;height:44px;border-radius:11px;font-weight:700;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.15);transition:transform .2s ease}
.cdp-skill:hover .cdp-skill-badge{transform:translateY(-3px) rotate(-4deg)}

.cdp-trash{display:flex;flex-direction:column;gap:12px;padding:14px 16px;flex:1;overflow:auto}
.cdp-trash ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.cdp-trash li{display:flex;align-items:center;gap:8px;font-size:12px;font-family:ui-monospace,Menlo,monospace}
.cdp-trash ul.is-emptying li{animation:cdp-toss .5s cubic-bezier(.5,0,.8,.3) both}
@keyframes cdp-toss{to{transform:translate(120px,40px) rotate(25deg) scale(.4);opacity:0}}
.cdp-trash>.cdp-chip{align-self:flex-start}

.cdp-dock{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);z-index:9000;display:flex;align-items:flex-end;gap:4px;height:54px;padding:6px 7px;border-radius:16px;background:color-mix(in oklab,var(--cdp-bg) 62%,transparent);box-shadow:0 0 0 1px color-mix(in oklab,var(--cdp-fg) 10%,transparent),0 10px 30px -8px rgba(0,0,0,.2);backdrop-filter:blur(18px) saturate(1.4);-webkit-backdrop-filter:blur(18px) saturate(1.4);max-width:calc(100% - 16px);overflow:visible}
.cdp-dock-btn{position:relative;flex:none;width:calc(40px * var(--s,1));height:calc(40px * var(--s,1));transition:width .12s ease,height .12s ease;outline:none;cursor:pointer}
.cdp-root .cdp-dock-btn{cursor:pointer}
.cdp-dock-art{display:block;width:100%;height:100%;filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.18))}
.cdp-dock-btn:active .cdp-dock-art{filter:brightness(.8) drop-shadow(0 1px 1.5px rgba(0,0,0,.18))}
.cdp-dock-btn.is-bounce .cdp-dock-art{animation:cdp-bounce .7s ease both}
@keyframes cdp-bounce{0%,100%{transform:none}25%{transform:translateY(-16px)}50%{transform:none}70%{transform:translateY(-6px)}}
.cdp-dock-btn:focus-visible .cdp-dock-art{outline:2px solid var(--cdp-deep);outline-offset:2px;border-radius:11px}
.cdp-run{position:absolute;left:50%;bottom:-5px;width:4px;height:4px;margin-left:-2px;border-radius:50%;background:color-mix(in oklab,var(--cdp-fg) 70%,transparent)}
.cdp-tip{position:absolute;left:50%;bottom:calc(100% + 10px);transform:translate(-50%,4px);padding:3px 9px;border-radius:6px;background:color-mix(in oklab,var(--cdp-bg) 90%,var(--cdp-fg));box-shadow:0 0 0 .5px rgba(0,0,0,.2),0 4px 12px rgba(0,0,0,.12);font-size:11.5px;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .12s ease,transform .12s ease}
.cdp-dock-btn:hover .cdp-tip,.cdp-dock-btn:focus-visible .cdp-tip{opacity:1;transform:translate(-50%,0)}
.cdp-dock-sep{width:1px;height:36px;margin:0 3px 2px;background:color-mix(in oklab,var(--cdp-fg) 18%,transparent);flex:none}
.cdp-root[data-compact="on"] .cdp-dock{gap:2px;padding:5px;height:38px;border-radius:12px}
.cdp-root[data-compact="on"] .cdp-dock-btn{width:26px;height:26px}
.cdp-root[data-compact="on"] .cdp-dock-sep{height:22px;margin:0 2px 2px}

.cdp-menu{position:absolute;z-index:9500;min-width:190px;padding:5px;border-radius:8px;background:color-mix(in oklab,var(--cdp-bg) 85%,transparent);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);box-shadow:0 0 0 .5px rgba(0,0,0,.22),0 10px 30px rgba(0,0,0,.18);animation:cdp-fade .12s ease both}
.cdp-menu button{display:block;width:100%;text-align:left;padding:3px 10px;border-radius:4px;font-size:12.5px}
.cdp-menu button:hover,.cdp-menu button:focus-visible{background:var(--cdp-deep);color:#fff;outline:none}
.cdp-menu hr{border:0;border-top:1px solid var(--cdp-line);margin:4px 6px}

.cdp-over{position:absolute;inset:0;z-index:9800}
.cdp-launch{display:flex;flex-direction:column;align-items:center;gap:26px;padding:36px 24px 90px;background:color-mix(in oklab,var(--cdp-desk) 55%,transparent);backdrop-filter:blur(26px) saturate(1.3);-webkit-backdrop-filter:blur(26px) saturate(1.3);animation:cdp-zoom .28s ease both;overflow:auto}
@keyframes cdp-zoom{from{opacity:0;transform:scale(1.06)}}
.cdp-launch-q{width:220px;height:26px;padding:0 12px;border-radius:7px;border:1px solid color-mix(in oklab,var(--cdp-fg) 12%,transparent);background:color-mix(in oklab,var(--cdp-bg) 60%,transparent);outline:0;text-align:center;user-select:text}
.cdp-launch-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:26px 20px;width:100%;max-width:860px;align-content:start;flex:1}
.cdp-app{display:flex;flex-direction:column;align-items:center;gap:8px;font-size:12px;cursor:pointer;animation:cdp-pop .35s cubic-bezier(.2,.9,.3,1.2) both}
.cdp-app-art{width:72px;height:72px;border-radius:18px;overflow:hidden;box-shadow:0 0 0 1px rgba(0,0,0,.06),0 6px 14px -6px rgba(0,0,0,.35);transition:transform .15s ease}
.cdp-app-art .cdp-svg{width:100%;height:100%}
.cdp-app:hover .cdp-app-art{transform:scale(1.06)}
.cdp-app:active .cdp-app-art{transform:scale(.94)}
.cdp-spot-wrap{display:flex;justify-content:center;align-items:flex-start;padding-top:14cqh}
.cdp-spot{width:min(560px,calc(100% - 24px));border-radius:12px;overflow:hidden;background:color-mix(in oklab,var(--cdp-bg) 86%,transparent);backdrop-filter:blur(28px) saturate(1.5);-webkit-backdrop-filter:blur(28px) saturate(1.5);box-shadow:0 0 0 .5px rgba(0,0,0,.25),0 24px 60px -10px rgba(0,0,0,.35);animation:cdp-fade .16s ease both}
.cdp-spot-in{display:flex;align-items:center;gap:10px;padding:0 14px;height:46px;color:var(--cdp-mute)}
.cdp-spot-in input{flex:1;min-width:0;border:0;outline:0;background:none;font-size:19px;font-weight:300;color:var(--cdp-fg);user-select:text}
.cdp-spot-list{list-style:none;margin:0;padding:5px;border-top:1px solid var(--cdp-line);max-height:300px;overflow:auto}
.cdp-spot-list button{display:flex;align-items:center;gap:10px;width:100%;padding:5px 8px;border-radius:6px;text-align:left;font-size:12.5px}
.cdp-spot-list button b{font-weight:500}
.cdp-spot-list button .cdp-muted{margin-left:auto;font-size:11px}
.cdp-spot-list button.is-on{background:var(--cdp-deep);color:#fff}
.cdp-spot-list button.is-on .cdp-muted{color:rgba(255,255,255,.75)}
.cdp-spot-ic{width:20px;height:20px;display:grid;place-items:center;flex:none}

.cdp-root[data-intro="on"] .cdp-icon{animation:cdp-drop .55s cubic-bezier(.2,.9,.3,1.25) both;animation-delay:calc(var(--i) * 80ms + 350ms)}
.cdp-root[data-intro="on"] .cdp-eyebrow{animation:cdp-rise .7s ease both .1s}
.cdp-root[data-intro="on"] .cdp-headline{animation:cdp-rise .8s cubic-bezier(.2,.8,.2,1) both .22s}
.cdp-root[data-intro="on"] .cdp-hello-bow{animation:cdp-tie .6s cubic-bezier(.2,.9,.3,1.5) both 1.1s}
.cdp-root[data-intro="on"] .cdp-dock{animation:cdp-dock .6s cubic-bezier(.2,.9,.3,1.1) both .5s}
@keyframes cdp-drop{from{opacity:0;transform:translate(-50%,-50%) translateY(-14px) scale(.8)}}
@keyframes cdp-rise{from{opacity:0;transform:translateY(14px);filter:blur(6px)}}
@keyframes cdp-tie{from{opacity:0;transform:scale(0) rotate(-40deg)}}
@keyframes cdp-dock{from{opacity:0;transform:translate(-50%,90px)}}

@media (prefers-reduced-motion:reduce){
.cdp-root *,.cdp-root *::before,.cdp-root *::after{animation-duration:.001ms !important;animation-delay:0s !important;animation-iteration-count:1 !important;transition-duration:.001ms !important}
}
`
