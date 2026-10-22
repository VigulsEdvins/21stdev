"use client"

// Callsign Radio Landing: a complete homepage for an independent radio
// station, laid out like a live front page. The station's call sign runs up
// the left edge as a giant masthead, and that masthead is the level meter:
// press play and the letters drain, then fill segment by segment with the
// signal, two channels, a peak tick and a red zone where the frequency sits.
// The feature slot shows the show on air now; the right rail is today's
// schedule, ticking in the station's own time zone, and any row previews its
// show in the feature slot.
//
// Below the fold the same radio language runs on: the ways to tune in set in
// the call sign's face, the residents as an index with their artwork following
// the pointer, the archive with play buttons that drive the same player, a
// support tuner you drag like a dial, and a footer with the running-order
// newsletter. A mini player docks to the bottom while something is playing.
//
// Everything is drawn here: the display face is SVG strokes (no web fonts),
// show artwork is generated two-ink riso prints (any show or episode takes an
// `image`), and nothing loads at runtime unless you pass a stream or images.
import * as React from "react"

export type CrInk = [string, string]
export type CrArt = "rings" | "bars" | "dots" | "stripes" | "blocks"

export type CrShow = {
  id: string
  title: string
  host: string
  genres: string[]
  /** One or two sentences for the feature slot. */
  blurb: string
  /** Two riso inks for the generated artwork, e.g. ["#ff48b0", "#0078bf"]. */
  ink?: CrInk
  art?: CrArt
  /** A photo or artwork URL; replaces the generated print. */
  image?: string
  /** "talk" makes the simulated meter speak instead of pump. */
  kind?: "music" | "talk"
  /** When it airs, for the residents index, e.g. "Weekdays 13:00". */
  slot?: string
  href?: string
  /** Leave out of the residents index (e.g. an automated overnight block). */
  hidden?: boolean
}

/** A slot in the day: the show `show` (an id) starts at `start` ("13:00") and runs until the next slot. */
export type CrSlot = { start: string; show: string }

export type CrEpisode = {
  id: string
  /** Show id. */
  show: string
  title: string
  /** As printed, e.g. "Fri 10 Oct". */
  date: string
  minutes: number
  audioUrl?: string
  image?: string
}

export type CrTier = { name: string; amount: number; perks: string[] }
export type CrWay = { value: string; unit: string; text: string; href?: string }
export type CrLink = { label: string; href?: string }

export type CrTokens = {
  ground: string
  ink: string
  muted: string
  line: string
  dim: string
  tally: string
  onTally: string
  panel: string
  paper: string
}

export type CrSource = { kind: "live" } | { kind: "episode"; episode: CrEpisode }

export type CallsignRadioLandingProps = {
  station?: {
    name?: string
    /** The masthead letters, e.g. "KORA". */
    callsign?: string
    /** Printed after the call sign and lit red on the meter, e.g. "98.4". */
    frequency?: string
    city?: string
    tagline?: string
    /** IANA zone the schedule runs in, e.g. "Europe/Amsterdam". */
    timeZone?: string
  }
  links?: CrLink[]
  /** The membership button in the nav; scrolls to the support tuner. */
  memberCta?: string
  /** Live stream URL. Without one, play still works and the meter runs on a simulated signal. */
  streamUrl?: string
  /** Set when the stream sends CORS headers, so the meter can read the real signal. */
  corsMeter?: boolean
  shows?: CrShow[]
  /** Today's running order (or every day's, if `week` is not given). */
  schedule?: CrSlot[]
  /** Optional per-day running orders, keys "mon" to "sun". */
  week?: { [weekday: string]: CrSlot[] }
  episodes?: CrEpisode[] | null
  listen?: { title?: string; ways?: CrWay[] } | null
  residents?: { title?: string; text?: string } | null
  archive?: { title?: string; text?: string } | null
  support?: {
    title?: string
    text?: string
    currency?: string
    min?: number
    max?: number
    start?: number
    tiers?: CrTier[]
    /** The perk line under the first tier. */
    fallbackPerk?: string
    /** The name shown under the first tier. */
    fallbackTier?: string
    /** After a successful gift: the headline (`{tier}` is replaced) and the line under it. */
    doneTitle?: string
    doneText?: string
  } | null
  footer?: {
    columns?: { title: string; links: CrLink[] }[]
    address?: string[]
    email?: string
    newsletterTitle?: string
    newsletterText?: string
    /** Shown after a successful sign-up. */
    successText?: string
    addressTitle?: string
    legal?: string
  } | null
  /** "night" is a club station on carbon and chalk, "daytime" a community station on signal yellow. */
  preset?: "night" | "daytime"
  /** Override any colour token, per theme. */
  palette?: { light?: { [token: string]: string }; dark?: { [token: string]: string } }
  /** "system" follows the host's `.dark` class, then the OS. */
  theme?: "system" | "light" | "dark"
  themeToggle?: boolean
  onPlay?: (source: CrSource) => unknown
  /** Return false (or reject) to show the reminder as failed. */
  onRemind?: (show: CrShow, start: string) => unknown
  onSupport?: (amount: number, cadence: "monthly" | "once", tier: CrTier | null) => unknown
  onSubscribe?: (email: string) => unknown
  /** Interface strings ("On air now", "Listen back", "Give"...). Pass any subset. */
  labels?: CrLabelsInput
  /** Hero height. A definite length, never a percentage. */
  height?: string
  className?: string
}

// #region content
const DEFAULT_STATION = {
  name: "Kora Radio",
  callsign: "KORA",
  frequency: "98.4",
  city: "Rotterdam",
  tagline: "Independent radio from the Rotterdam harbour, on 98.4 FM, DAB+ and online. Paid for by the people who listen.",
  timeZone: "Europe/Amsterdam",
}

/** Every interface string, so a station in any language can rewrite them. */
const DEFAULT_LABELS = {
  today: "Today on",
  onAir: "On air",
  onAirNow: "On air now",
  later: "Later today",
  earlier: "Earlier today",
  nextAt: "Next at",
  to: "to",
  listenBack: "Listen back",
  remindAt: "Remind me at",
  reminderSet: "Reminder set for",
  reminderRetry: "Try the reminder again",
  backToNow: "Back to what's on now",
  wholeDay: "The whole day",
  showLess: "Show less",
  live: "Live",
  liveOn: "Live on",
  archive: "Archive",
  streamError: "The stream did not start.",
  tryAgain: "Try again",
  backToLive: "Back to live",
  closePlayer: "Close the player",
  monthly: "Monthly",
  once: "Once",
  perMonth: "a month",
  perOnce: "once",
  give: "Give",
  sending: "Sending",
  sendError: "That did not go through. Try again.",
  changeAmount: "Change the amount",
  emptyArchive: "Nothing in this genre yet. Pick another one.",
  allGenres: "All",
  emailLabel: "Email address",
  subscribe: "Subscribe",
  subscribing: "Subscribing",
  emailInvalid: "That email address looks incomplete.",
  menu: "Menu",
  dayTheme: "Day",
  nightTheme: "Night",
}
export type CrLabels = typeof DEFAULT_LABELS

const DEFAULT_LINKS: CrLink[] = [
  { label: "Listen", href: "#listen" },
  { label: "Schedule", href: "#schedule" },
  { label: "Residents", href: "#residents" },
  { label: "Archive", href: "#archive" },
  { label: "Support", href: "#support" },
]

const DEFAULT_SHOWS: CrShow[] = [
  { id: "overnight", title: "Overnight", host: "From the archive", genres: ["Archive"], blurb: "The week's best shows replayed while the studio sleeps, with the news on the hour.", ink: ["#3255a4", "#ff48b0"], art: "dots", hidden: true },
  { id: "first-light", title: "First Light", host: "Noor Achterberg", genres: ["Ambient", "Folk"], blurb: "Slow records for the first tram, the weather off the North Sea and the harbour report at half past.", ink: ["#ffe800", "#00a95c"], art: "stripes", slot: "Weekdays 06:00" },
  { id: "dock-talk", title: "Dock Talk", host: "Jesse van Dalen and Mira Osei", genres: ["Talk", "City"], blurb: "Two hours on the city: council votes, rents, the new bridge and whoever rings the studio line.", ink: ["#ff6c2f", "#3255a4"], art: "blocks", kind: "talk", slot: "Weekdays 09:00" },
  { id: "crate-hours", title: "Crate Hours", host: "Sami Haddad", genres: ["Soul", "Funk"], blurb: "One shelf of the station's record library a week, with the stories written on the sleeves.", ink: ["#ff48b0", "#0078bf"], art: "rings", slot: "Weekdays 11:00" },
  { id: "low-tide", title: "Low Tide", host: "Lieke Brands", genres: ["Jazz", "Dub"], blurb: "Spiritual jazz, dub and long instrumentals for the slow middle of the afternoon.", ink: ["#ffe800", "#0078bf"], art: "bars", slot: "Weekdays 13:00" },
  { id: "kade-sessions", title: "Kade Sessions", host: "Tomás Rey", genres: ["Live", "Indie"], blurb: "A band plays Studio 2 every week, live to air, with no second takes.", ink: ["#ff665e", "#3255a4"], art: "dots", slot: "Thursdays 15:00" },
  { id: "rush-hour", title: "Rush Hour", host: "Femke de Wit", genres: ["News", "Music"], blurb: "News on the hour, traffic on the bridges and new music made in the city.", ink: ["#ffe800", "#ff48b0"], art: "blocks", kind: "talk", slot: "Weekdays 17:00" },
  { id: "signal-noise", title: "Signal / Noise", host: "Ayla Demir", genres: ["Experimental", "Bass"], blurb: "Field recordings, broken beats and bass music, and one guest a week with a record nobody has heard.", ink: ["#0078bf", "#ff6c2f"], art: "rings", slot: "Tuesdays 19:00" },
  { id: "night-ferry", title: "Night Ferry", host: "Okke Visser", genres: ["House", "Electro"], blurb: "Deep house and electro, mixed live from the old ferry office at the end of the quay.", ink: ["#ff48b0", "#00a95c"], art: "stripes", slot: "Fridays 22:00" },
]

const DEFAULT_SCHEDULE: CrSlot[] = [
  { start: "00:00", show: "overnight" },
  { start: "06:00", show: "first-light" },
  { start: "09:00", show: "dock-talk" },
  { start: "11:00", show: "crate-hours" },
  { start: "13:00", show: "low-tide" },
  { start: "15:00", show: "kade-sessions" },
  { start: "17:00", show: "rush-hour" },
  { start: "19:00", show: "signal-noise" },
  { start: "22:00", show: "night-ferry" },
]

const DEFAULT_EPISODES: CrEpisode[] = [
  { id: "nf-212", show: "night-ferry", title: "Back to back with Rosa Vink, four hours from the ferry office", date: "Fri 10 Oct", minutes: 120 },
  { id: "ks-88", show: "kade-sessions", title: "Hollow Pier, live in Studio 2", date: "Thu 9 Oct", minutes: 58 },
  { id: "ch-140", show: "crate-hours", title: "The Surinamese funk shelf", date: "Wed 8 Oct", minutes: 118 },
  { id: "dt-301", show: "dock-talk", title: "Who owns the waterfront?", date: "Tue 7 Oct", minutes: 96 },
  { id: "lt-77", show: "low-tide", title: "Alice Coltrane, start to finish", date: "Mon 6 Oct", minutes: 120 },
  { id: "sn-52", show: "signal-noise", title: "Recordings from the container terminal", date: "Sat 4 Oct", minutes: 175 },
  { id: "fl-410", show: "first-light", title: "Fog on the Maas", date: "Fri 3 Oct", minutes: 180 },
]

const DEFAULT_WAYS: CrWay[] = [
  { value: "98.4", unit: "FM", text: "Across Rotterdam and the Rijnmond, on any radio with a dial." },
  { value: "11C", unit: "DAB+", text: "Digital radio across South Holland, in the car and the kitchen." },
  { value: "320", unit: "kbps stream", text: "In the browser, or any app that plays a stream link." },
  { value: "744 9840", unit: "Studio line", text: "Requests and dedications, answered live during every show." },
]

const DEFAULT_TIERS: CrTier[] = [
  { name: "Listener", amount: 3, perks: ["Your name in the yearly thank-you broadcast"] },
  { name: "Supporter", amount: 6, perks: ["The printed running order, every month", "Early tickets for studio sessions"] },
  { name: "Resident", amount: 12, perks: ["A Kora tote and enamel pin", "A vote on the summer schedule"] },
  { name: "Patron", amount: 25, perks: ["Your name on the studio wall", "A seat in the studio during a live show"] },
]

const DEFAULT_SUPPORT = {
  title: "Keep Kora on air",
  text: "No ads and no owner. Listeners pay for the transmitter, the studio rent and the music licences.",
  currency: "€",
  min: 3,
  max: 30,
  start: 8,
  tiers: DEFAULT_TIERS,
  fallbackPerk: "Every bit goes to the transmitter, the rent and the licences",
  fallbackTier: "Listener",
  doneTitle: "Thank you. You are a {tier} now.",
  doneText: "A receipt is on its way to your inbox.",
}

const DEFAULT_COLUMNS: { title: string; links: CrLink[] }[] = [
    { title: "Listen", links: [{ label: "Live stream", href: "#listen" }, { label: "Today's schedule", href: "#schedule" }, { label: "Listen back", href: "#archive" }] },
    { title: "Station", links: [{ label: "About Kora" }, { label: "Volunteer" }, { label: "Press and partners" }] },
]

const DEFAULT_FOOTER = {
  columns: DEFAULT_COLUMNS,
  address: ["Kora Radio Foundation", "The old ferry office, Quay 4", "Rotterdam"],
  email: "studio@kora.example",
  newsletterTitle: "The running order",
  newsletterText: "Next week's schedule and every record we played, each Monday morning.",
  successText: "Subscribed. The first running order arrives on Monday.",
  addressTitle: "Studio",
  legal: "Kora Radio Foundation. Listener-funded since 2009.",
}

const PRESETS: { [k: string]: { light: CrTokens; dark: CrTokens; segment: number; gap: number } } = {
  night: {
    light: { ground: "#fbfbfa", ink: "#0d0e0c", muted: "#55564f", line: "rgba(13,14,12,.14)", dim: "rgba(13,14,12,.2)", tally: "#d4361e", onTally: "#ffffff", panel: "#f0f0ed", paper: "#f1f2ee" },
    dark: { ground: "#0d0e0c", ink: "#f2f1ec", muted: "#a5a59e", line: "rgba(242,241,236,.14)", dim: "rgba(242,241,236,.22)", tally: "#e5402a", onTally: "#ffffff", panel: "#171815", paper: "#eeefea" },
    segment: 22,
    gap: 6,
  },
  daytime: {
    light: { ground: "#ffd21f", ink: "#12120c", muted: "#3f3b14", line: "rgba(18,18,12,.2)", dim: "rgba(18,18,12,.2)", tally: "#0b6b3a", onTally: "#ffffff", panel: "#ffdf5c", paper: "#f6f5ef" },
    dark: { ground: "#14140f", ink: "#f6f3e4", muted: "#b6b29b", line: "rgba(246,243,228,.15)", dim: "rgba(246,243,228,.22)", tally: "#ffd21f", onTally: "#14140f", panel: "#1e1e17", paper: "#f6f5ef" },
    segment: 40,
    gap: 12,
  },
}
// #endregion content

// #region glyphs
// The display face: heavy, condensed, rounded-square strokes, 200 units tall.
// Each glyph is a few centrelines stroked 30 units wide; corners round at 22.
const GH = 200
const GK = 22
const GSW = 30
const GGAP = 14
type GLine = { z: boolean; p: number[][] }
/** `n` forces the meter to treat a narrow glyph as one segment. */
type GDef = { w: number; l: GLine[]; n?: number }
const go = (...p: number[][]): GLine => ({ z: false, p })
const gz = (...p: number[][]): GLine => ({ z: true, p })
const G_O = gz([15, 15], [85, 15], [85, 185], [15, 185])
const G_P = go([15, 200], [15, 15, 0], [85, 15], [85, 108], [15, 108, 0])

const GLYPHS: { [ch: string]: GDef } = {
  A: { w: 100, l: [go([15, 200], [15, 15], [85, 15], [85, 200]), go([15, 108], [85, 108])] },
  B: { w: 100, l: [go([15, 100, 0], [79, 100], [79, 15], [15, 15, 0], [15, 185, 0], [85, 185], [85, 100], [15, 100, 0])] },
  C: { w: 100, l: [go([85, 64], [85, 15], [15, 15], [15, 185], [85, 185], [85, 136])] },
  D: { w: 100, l: [gz([15, 15, 0], [85, 15], [85, 185], [15, 185, 0])] },
  E: { w: 96, l: [go([96, 15], [15, 15, 0], [15, 185, 0], [96, 185]), go([15, 100], [84, 100])] },
  F: { w: 94, l: [go([94, 15], [15, 15, 0], [15, 200]), go([15, 104], [82, 104])] },
  G: { w: 100, l: [go([85, 64], [85, 15], [15, 15], [15, 185], [85, 185], [85, 104, 0], [50, 104])] },
  H: { w: 100, l: [go([15, 0], [15, 200]), go([85, 0], [85, 200]), go([15, 100], [85, 100])] },
  I: { w: 30, l: [go([15, 0], [15, 200])], n: 1 },
  J: { w: 96, l: [go([81, 0], [81, 185], [15, 185], [15, 138])] },
  K: { w: 100, l: [go([15, 0], [15, 200]), go([96, -6], [26, 104, 0], [96, 206])] },
  L: { w: 92, l: [go([15, 0], [15, 185, 0], [92, 185])] },
  M: { w: 126, l: [go([15, 200], [15, 15, 0], [63, 118, 0], [111, 15, 0], [111, 200])] },
  N: { w: 104, l: [go([15, 0], [15, 200]), go([89, 0], [89, 200]), go([8, -12], [96, 212])] },
  O: { w: 100, l: [G_O] },
  P: { w: 100, l: [G_P] },
  Q: { w: 100, l: [G_O, go([54, 142, 0], [98, 210, 0])] },
  R: { w: 100, l: [G_P, go([44, 108], [92, 208])] },
  S: { w: 100, l: [go([100, 15], [15, 15], [15, 100], [85, 100], [85, 185], [0, 185])] },
  T: { w: 100, l: [go([0, 15], [100, 15]), go([50, 15], [50, 200])] },
  U: { w: 100, l: [go([15, 0], [15, 185], [85, 185], [85, 0])] },
  V: { w: 104, l: [go([6, -14], [52, 196, 0], [98, -14])] },
  W: { w: 126, l: [go([15, 0], [15, 185, 0], [63, 96, 0], [111, 185, 0], [111, 0])] },
  X: { w: 104, l: [go([4, -14], [100, 214]), go([100, -14], [4, 214])] },
  Y: { w: 104, l: [go([4, -14], [52, 96, 0], [100, -14]), go([52, 96], [52, 200])] },
  Z: { w: 100, l: [go([0, 15], [85, 15, 0], [15, 185, 0], [100, 185])] },
  "0": { w: 100, l: [G_O] },
  "1": { w: 60, l: [go([0, 15], [36, 15, 0], [36, 200])], n: 1 },
  "2": { w: 100, l: [go([0, 15], [85, 15], [85, 100], [15, 100], [15, 185, 0], [100, 185])] },
  "3": { w: 100, l: [go([0, 15], [85, 15], [85, 185], [0, 185]), go([30, 100], [85, 100])] },
  "4": { w: 100, l: [go([70, 4, 0], [14, 124, 0], [100, 124]), go([70, 0], [70, 200])] },
  "5": { w: 100, l: [go([100, 15], [15, 15, 0], [15, 100], [85, 100], [85, 185], [0, 185])] },
  "6": { w: 100, l: [go([92, 15], [15, 15], [15, 185], [85, 185], [85, 100], [15, 100, 0])] },
  "7": { w: 96, l: [go([0, 15], [81, 15, 0], [34, 212, 0])] },
  "8": { w: 100, l: [G_O, go([15, 100], [85, 100])] },
  "9": { w: 100, l: [go([8, 185], [85, 185], [85, 15], [15, 15], [15, 100], [85, 100, 0])] },
  ".": { w: 50, l: [go([10, 185], [40, 185])], n: 1 },
  ",": { w: 50, l: [go([10, 185], [40, 185]), go([34, 186], [22, 216])], n: 1 },
  ":": { w: 50, l: [go([10, 70], [40, 70]), go([10, 185], [40, 185])], n: 1 },
  "-": { w: 80, l: [go([8, 104], [72, 104])] },
  "+": { w: 100, l: [go([10, 104], [90, 104]), go([50, 64], [50, 144])] },
  "/": { w: 80, l: [go([2, 214], [78, -14])] },
  "?": { w: 92, l: [go([4, 15], [77, 15], [77, 100], [40, 100, 0], [40, 142]), go([25, 185], [55, 185])] },
  "!": { w: 40, l: [go([20, 0], [20, 140]), go([5, 185], [35, 185])], n: 1 },
  "€": { w: 104, l: [go([92, 52], [92, 15], [26, 15], [26, 185], [92, 185], [92, 148]), go([0, 80], [64, 80]), go([0, 122], [64, 122])] },
  "$": { w: 100, l: [go([100, 30], [15, 30], [15, 100], [85, 100], [85, 170], [0, 170]), go([50, 0], [50, 200])] },
  "£": { w: 100, l: [go([86, 50], [86, 15], [30, 15], [30, 185, 0]), go([0, 185], [100, 185]), go([0, 104], [70, 104])] },
  " ": { w: 44, l: [] },
}

const fx = (n: number) => String(Math.round(n * 100) / 100)

function gCorner(v: number[], p: number[], q: number[], dx: number) {
  const r = v.length > 2 ? v[2] : GK
  const l1 = Math.hypot(v[0] - p[0], v[1] - p[1])
  const l2 = Math.hypot(q[0] - v[0], q[1] - v[1])
  const c = Math.min(r, l1 / 2, l2 / 2)
  if (!(c > 0) || !l1 || !l2) return "L" + fx(v[0] + dx) + " " + fx(v[1])
  const ax = v[0] + ((p[0] - v[0]) / l1) * c
  const ay = v[1] + ((p[1] - v[1]) / l1) * c
  const bx = v[0] + ((q[0] - v[0]) / l2) * c
  const by = v[1] + ((q[1] - v[1]) / l2) * c
  return "L" + fx(ax + dx) + " " + fx(ay) + "Q" + fx(v[0] + dx) + " " + fx(v[1]) + " " + fx(bx + dx) + " " + fx(by)
}

function gLinePath(line: GLine, dx: number) {
  const p = line.p
  const n = p.length
  if (n < 2) return ""
  if (line.z) {
    let d = "M" + fx((p[n - 1][0] + p[0][0]) / 2 + dx) + " " + fx((p[n - 1][1] + p[0][1]) / 2)
    for (let i = 0; i < n; i++) d += gCorner(p[i], p[(i - 1 + n) % n], p[(i + 1) % n], dx)
    return d + "Z"
  }
  let d = "M" + fx(p[0][0] + dx) + " " + fx(p[0][1])
  for (let i = 1; i < n - 1; i++) d += gCorner(p[i], p[i - 1], p[i + 1], dx)
  return d + "L" + fx(p[n - 1][0] + dx) + " " + fx(p[n - 1][1])
}

function gNorm(ch: string) {
  const c = ch.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase()
  if (c === "'" || c === "’") return ""
  if (c === "&") return "+"
  return GLYPHS[c] ? c : c.trim() ? "-" : " "
}

function glyphPath(ch: string, dx: number) {
  const g = GLYPHS[gNorm(ch) || " "] || GLYPHS[" "]
  return g.l.map((l) => gLinePath(l, dx)).join("")
}

/** Lays a string out in the face: each glyph's x and width, and the total width, in units (cap height 200). */
function layoutText(text: string) {
  const chars = Array.from(text).map(gNorm).filter((c) => c !== "")
  const items: { ch: string; x: number; w: number }[] = []
  let x = 0
  chars.forEach((ch, i) => {
    const g = GLYPHS[ch] || GLYPHS[" "]
    items.push({ ch, x, w: g.w })
    x += g.w + (i < chars.length - 1 ? GGAP : 0)
  })
  return { items, width: x }
}

/** Greedy word wrap in glyph units. A word wider than the line keeps a line of its own. */
function wrapText(text: string, maxW: number) {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let cur = ""
  for (const w of words) {
    const next = cur ? cur + " " + w : w
    if (!cur || layoutText(next).width <= maxW) cur = next
    else {
      lines.push(cur)
      cur = w
    }
  }
  if (cur) lines.push(cur)
  return lines.length ? lines : [""]
}
// #endregion glyphs

// #region logic
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

/** "13:00" -> 780 minutes. Bad input -> 0. */
function toMin(hhmm: string) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm || "").trim())
  if (!m) return 0
  return clamp(+m[1], 0, 24) * 60 + clamp(+m[2], 0, 59)
}
const pad2 = (n: number) => (n < 10 ? "0" : "") + n
const fmtMin = (m: number) => pad2(Math.floor((m % 1440) / 60)) + ":" + pad2(m % 60)

/** Sorted slots with a computed end (the next slot's start, or midnight). */
function runningOrder(slots: CrSlot[]) {
  const s = slots
    .map((x) => ({ ...x, from: toMin(x.start) }))
    .sort((a, b) => a.from - b.from)
  return s.map((x, i) => ({ ...x, to: i < s.length - 1 ? s[i + 1].from : 1440 }))
}

/** Index of the slot on air at `min` minutes past midnight, or -1 before the first slot. */
function onAirIndex(order: { from: number; to: number }[], min: number) {
  for (let i = order.length - 1; i >= 0; i--) if (min >= order[i].from) return i
  return -1
}

function slotProgress(slot: { from: number; to: number }, min: number, sec: number) {
  const len = Math.max(1, slot.to - slot.from)
  return clamp((min - slot.from + sec / 60) / len, 0, 1)
}

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]

/** Wall-clock time in the station's zone. Falls back to the visitor's clock on a bad zone. */
function stationClock(tz: string, d: Date) {
  try {
    const f = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit", weekday: "short", day: "numeric", month: "short", hourCycle: "h23", timeZoneName: "short" })
    const parts: { [k: string]: string } = {}
    for (const p of f.formatToParts(d)) parts[p.type] = p.value
    const h = +parts.hour % 24
    return {
      min: h * 60 + +parts.minute,
      sec: +parts.second,
      day: (parts.weekday || "").slice(0, 3).toLowerCase(),
      label: parts.weekday + " " + parts.day + " " + parts.month,
      zone: parts.timeZoneName || "",
    }
  } catch {
    return {
      min: d.getHours() * 60 + d.getMinutes(),
      sec: d.getSeconds(),
      day: WEEKDAYS[d.getDay()],
      label: d.toDateString().slice(0, 10),
      zone: "",
    }
  }
}

function hash1(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}
function vnoise(t: number) {
  const i = Math.floor(t)
  const f = t - i
  const u = f * f * (3 - 2 * f)
  return hash1(i) * (1 - u) + hash1(i + 1) * u
}

/**
 * A believable programme level, 0..1, for when the real signal can't be read.
 * Music pumps on a 122 bpm kick with a slow swell; talk comes in syllables
 * and words with pauses between phrases. Channel 1 is offset from channel 0.
 */
function envelope(t: number, kind: string, ch: number) {
  const c = ch ? 0.37 : 0
  if (kind === "talk") {
    const syl = Math.pow(Math.max(0, Math.sin((t + c * 0.05) * Math.PI * 4.4)), 2)
    const word = vnoise(t * 1.9 + 11)
    const phrase = smooth(0.22, 0.36, vnoise(t * 0.5 + 3))
    const lv = (0.2 + 0.52 * syl * (0.5 + 0.5 * word)) * (0.18 + 0.82 * phrase) + 0.05 + 0.05 * vnoise(t * 9 + c * 20)
    return clamp(lv, 0, 0.995)
  }
  const beat = 60 / 122
  const ph = (t % beat) / beat
  const kick = Math.exp(-ph * 7)
  const back = Math.floor(t / beat) % 2 ? Math.exp(-ph * 9) : 0
  const hat = Math.exp(-((t % (beat / 4)) / (beat / 4)) * 5) * 0.1
  const swell = 0.5 + 0.5 * Math.sin(t * 0.21 + c) * Math.sin(t * 0.083 + 1.3)
  const lv = 0.32 + 0.3 * kick + 0.12 * back + hat + 0.17 * swell + 0.1 * (vnoise(t * 6 + c * 30) - 0.5)
  return clamp(lv, 0, 0.995)
}

/** RMS of a time-domain buffer as a meter level: -48 dBFS..0 dBFS -> 0..1. */
function rmsLevel(buf: Float32Array) {
  let s = 0
  for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i]
  const rms = Math.sqrt(s / Math.max(1, buf.length))
  if (!(rms > 0)) return 0
  return clamp((20 * Math.log10(rms) + 48) / 48, 0, 1)
}

/** Relative luminance of a #rrggbb ink, so a title is printed in the darker of two. */
function inkLum(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return 0.5
  const n = parseInt(m[1], 16)
  const ch = [n >> 16, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
}

/** The highest tier the amount reaches, or null under the first. */
function tierFor(amount: number, tiers: CrTier[]) {
  let t: CrTier | null = null
  for (const x of [...tiers].sort((a, b) => a.amount - b.amount)) if (amount >= x.amount) t = x
  return t
}

/** Every perk unlocked at this amount, lowest tier first. */
function perksFor(amount: number, tiers: CrTier[]) {
  return [...tiers]
    .sort((a, b) => a.amount - b.amount)
    .filter((t) => amount >= t.amount)
    .flatMap((t) => t.perks)
}

/** Dial position (0..1) to a whole amount. */
function dialAmount(f: number, min: number, max: number) {
  return Math.round(min + clamp(f, 0, 1) * (max - min))
}

function nextAmount(v: number, key: string, min: number, max: number) {
  if (key === "ArrowRight" || key === "ArrowUp") return clamp(v + 1, min, max)
  if (key === "ArrowLeft" || key === "ArrowDown") return clamp(v - 1, min, max)
  if (key === "PageUp") return clamp(v + 5, min, max)
  if (key === "PageDown") return clamp(v - 5, min, max)
  if (key === "Home") return min
  if (key === "End") return max
  return v
}

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim())

function mulberry(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seedOf(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/**
 * Archive grid shape on four columns: the first card is the feature (2 x 2), the next four
 * are small, then rows of four small; a last partial row is filled so there are no holes
 * (one card spans the row, two split it, three go wide + small + small).
 */
function archiveShape(i: number, n: number) {
  if (n < 5) return "small"
  if (i === 0) return "big"
  if (i < 5) return "small"
  const rest = n - 5
  const whole = Math.floor(rest / 4) * 4
  const j = i - 5 - whole
  if (j < 0) return "small"
  const r = rest - whole
  if (r === 1) return "full"
  if (r === 2) return "wide"
  return j === 0 ? "wide" : "small"
}

/**
 * Meter segments laid per glyph, so a cut never leaves a sliver at a glyph's edge: each glyph
 * is split into whole segments of about `seg` units with `gap` between them. Returns where each
 * segment starts and ends (word units) and the gaps to paint.
 */
function meterSegments(items: { ch: string; x: number; w: number }[], seg: number, gap: number) {
  const starts: number[] = []
  const ends: number[] = []
  const gaps: number[][] = []
  for (const it of items) {
    if (it.ch === " ") continue
    const g = GLYPHS[it.ch]
    const n = g && g.n ? g.n : Math.max(1, Math.round((it.w + gap) / (seg + gap)))
    const sw = (it.w - (n - 1) * gap) / n
    for (let k = 0; k < n; k++) {
      const x0 = it.x + k * (sw + gap)
      starts.push(x0)
      ends.push(x0 + sw)
      if (k < n - 1) gaps.push([x0 + sw, gap])
    }
  }
  return { starts, ends, gaps }
}

/** Lit length for a level: the end of the last segment the level reaches into (0 when silent). */
function litEnd(segs: { starts: number[]; ends: number[] }, level: number, W: number) {
  const t = clamp(level, 0, 1) * W
  if (t <= 0) return 0
  for (let i = 0; i < segs.starts.length; i++) if (t <= segs.ends[i]) return t > segs.starts[i] || i === 0 ? segs.ends[i] : segs.ends[i - 1]
  return W
}

/** The segment a peak sits in: [x, width]. */
function peakSeg(segs: { starts: number[]; ends: number[] }, level: number, W: number) {
  const e = litEnd(segs, level, W)
  for (let i = 0; i < segs.ends.length; i++) if (segs.ends[i] >= e - 0.01) return [segs.starts[i], segs.ends[i] - segs.starts[i]]
  return [0, 0]
}

const fmtDuration = (m: number) => (m >= 60 ? Math.floor(m / 60) + " h" + (m % 60 ? " " + (m % 60) + " min" : "") : m + " min")
// #endregion logic

const useIsoLayout = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect

function useReducedMotion() {
  const [reduced, setReduced] = React.useState(() => typeof window !== "undefined" && typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches)
  React.useEffect(() => {
    if (typeof matchMedia !== "function") return
    const mq = matchMedia("(prefers-reduced-motion: reduce)")
    const on = () => setReduced(mq.matches)
    on()
    mq.addEventListener("change", on)
    return () => mq.removeEventListener("change", on)
  }, [])
  return reduced
}

function useTheme(pref: "system" | "light" | "dark") {
  const read = () => {
    if (pref !== "system") return pref === "dark"
    if (typeof document === "undefined") return false
    const el = document.documentElement
    if (el.classList.contains("dark")) return true
    if (el.classList.contains("light")) return false
    return typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches
  }
  const [dark, setDark] = React.useState(pref === "dark")
  useIsoLayout(() => {
    setDark(read())
    if (pref !== "system") return
    const mq = typeof matchMedia === "function" ? matchMedia("(prefers-color-scheme: dark)") : null
    const on = () => setDark(read())
    const mo = new MutationObserver(on)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    if (mq) mq.addEventListener("change", on)
    return () => {
      mo.disconnect()
      if (mq) mq.removeEventListener("change", on)
    }
  }, [pref])
  return [dark, setDark] as const
}

/** Section heads rise in once, armed after mount so nothing is hidden without JS or under reduced motion. */
function useReveal(root: { current: HTMLElement | null }, reduced: boolean) {
  React.useEffect(() => {
    const el = root.current
    if (!el || reduced || typeof IntersectionObserver === "undefined") return
    const items = Array.from(el.querySelectorAll(".cr-rv"))
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) if (e.isIntersecting) {
          e.target.setAttribute("data-in", "")
          io.unobserve(e.target)
        }
      },
      { rootMargin: "0px 0px -8% 0px" }
    )
    for (const it of items) {
      if (it.getBoundingClientRect().top < window.innerHeight) continue
      it.setAttribute("data-armed", "")
      io.observe(it)
    }
    return () => io.disconnect()
  }, [root, reduced])
}

/* ---------- the display face ---------- */

type GlyphsProps = { text: string; wrap?: boolean; knock?: boolean; fit?: boolean; className?: string }

/** Text set in the face as SVG strokes. Height is 1em per line; `wrap` breaks lines to the parent's width; `fit` scales to the width instead. */
function Glyphs({ text, wrap, knock, fit, className }: GlyphsProps) {
  const id = "g" + React.useId().replace(/[^a-zA-Z0-9]/g, "")
  const ref = React.useRef(null as SVGSVGElement | null)
  const [maxW, setMaxW] = React.useState(0)
  useIsoLayout(() => {
    const svg = ref.current
    const host = svg && svg.parentElement
    if (!wrap || !svg || !host) return
    const measure = () => {
      const fs = parseFloat(getComputedStyle(svg).fontSize) || 16
      const w = host.clientWidth
      if (w > 0) setMaxW(Math.floor((w / fs) * GH))
    }
    measure()
    if (typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(measure)
    ro.observe(host)
    return () => ro.disconnect()
  }, [wrap, text])
  const rows = wrap && maxW > 0 ? wrapText(text, maxW) : [text]
  const lead = knock ? 40 : 46
  const pad = knock ? 26 : 0
  const laid = rows.map((r) => layoutText(r))
  const W = Math.max(1, ...laid.map((l) => l.width))
  const Hh = rows.length * GH + (rows.length - 1) * lead
  const vb = [-pad, -pad, W + pad * 2, Hh + pad * 2].map(fx).join(" ")
  // a single word wider than the column scales down to fit rather than spilling out
  const shrink = fit || (wrap && maxW > 0 && W > maxW)
  const style = shrink ? undefined : ({ height: fx((Hh + pad * 2) / GH) + "em", width: fx((W + pad * 2) / GH) + "em" } as React.CSSProperties)
  return (
    <svg ref={ref} className={"cr-glyphs " + (className || "")} viewBox={vb} style={style} aria-hidden="true" focusable="false" data-fit={shrink ? "" : undefined}>
      <defs>
        {laid.map((l, i) => (
          <clipPath id={id + "c" + i} key={"c" + i} clipPathUnits="userSpaceOnUse">
            {l.items.map((it, j) => (
              <rect key={j} x={it.x - 0.5} y={0} width={it.w + 1} height={GH} />
            ))}
          </clipPath>
        ))}
      </defs>
      {laid.map((l, i) => {
        const d = l.items.map((it) => glyphPath(it.ch, it.x)).join("")
        return (
          <g key={i} transform={"translate(0 " + i * (GH + lead) + ")"}>
            {knock ? <rect className="cr-band" x={-pad} y={-pad} width={l.width + pad * 2} height={GH + pad * 2} /> : null}
            <path className="cr-stroke" d={d} clipPath={"url(#" + id + "c" + i + ")"} strokeWidth={GSW} />
          </g>
        )
      })}
    </svg>
  )
}

/* ---------- the masthead meter ---------- */

type MeterState = { L: number; R: number; pL: number; pR: number; live: number }
type MeterFn = (s: MeterState) => void

type MeterWordProps = {
  word: string
  /** Index into the word where the red zone starts (the frequency). -1 = the last fifth. */
  redAt: number
  vertical?: boolean
  seg: number
  gap: number
  register: (fn: MeterFn) => () => void
  className?: string
}

/** The call sign drawn as a two-channel segment meter. Levels arrive through `register`, never through React state. */
function MeterWord({ word, redAt, vertical, seg, gap, register, className }: MeterWordProps) {
  const id = "m" + React.useId().replace(/[^a-zA-Z0-9]/g, "")
  const lay = layoutText(word)
  const W = Math.max(1, lay.width)
  const d = lay.items.map((it) => glyphPath(it.ch, it.x)).join("")
  const segs = meterSegments(lay.items, seg, gap)
  const redItem = redAt >= 0 && redAt < lay.items.length ? lay.items[redAt] : null
  const redX = redItem ? redItem.x : segs.starts[Math.floor(segs.starts.length * 0.8)] || W
  const refs = React.useRef({} as { [k: string]: SVGRectElement | null })
  const bind = (k: string) => (el: SVGRectElement | null) => {
    refs.current[k] = el
  }
  useIsoLayout(() => {
    const set = (k: string, a: string, v: number) => {
      const el = refs.current[k]
      if (el) el.setAttribute(a, fx(v))
    }
    return register((s) => {
      const a = litEnd(segs, s.L, W)
      const b = litEnd(segs, s.R, W)
      set("litL", "width", a)
      set("litR", "width", b)
      set("dimL", "x", a)
      set("dimL", "width", Math.max(0, redX - a))
      set("dimR", "x", b)
      set("dimR", "width", Math.max(0, redX - b))
      set("dimRedL", "x", Math.max(a, redX))
      set("dimRedL", "width", W + 4 - Math.max(a, redX))
      set("dimRedR", "x", Math.max(b, redX))
      set("dimRedR", "width", W + 4 - Math.max(b, redX))
      set("redL", "width", Math.max(0, a - redX))
      set("redR", "width", Math.max(0, b - redX))
      const pa = peakSeg(segs, s.pL, W)
      const pb = peakSeg(segs, s.pR, W)
      set("pkL", "x", pa[0])
      set("pkL", "width", pa[1])
      set("pkR", "x", pb[0])
      set("pkR", "width", pb[1])
      set("pkL", "opacity", s.live * (s.pL > 0.04 ? 1 : 0))
      set("pkR", "opacity", s.live * (s.pR > 0.04 ? 1 : 0))
      set("split", "width", Math.max(a, b))
      set("split", "opacity", s.live)
    })
  }, [W, redX, register, seg, gap])
  const vb = vertical ? "0 0 " + GH + " " + fx(W) : "0 0 " + fx(W) + " " + GH
  return (
    <svg className={"cr-meter " + (className || "")} data-v={vertical ? "" : undefined} data-h={vertical ? undefined : ""} viewBox={vb} preserveAspectRatio={vertical ? "xMidYMax meet" : "xMinYMid meet"} aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={id + "b"} clipPathUnits="userSpaceOnUse">
          {lay.items.map((it, j) => (
            <rect key={j} x={it.x} y={0} width={it.w} height={GH} />
          ))}
        </clipPath>
        <clipPath id={id + "l"} clipPathUnits="userSpaceOnUse">
          <rect ref={bind("litL")} x={0} y={-20} width={W} height={120} />
          <rect ref={bind("litR")} x={0} y={100} width={W} height={120} />
        </clipPath>
        <clipPath id={id + "d"} clipPathUnits="userSpaceOnUse">
          <rect ref={bind("dimL")} x={W} y={-20} width={4} height={120} />
          <rect ref={bind("dimR")} x={W} y={100} width={4} height={120} />
        </clipPath>
        <clipPath id={id + "q"} clipPathUnits="userSpaceOnUse">
          <rect ref={bind("dimRedL")} x={W} y={-20} width={4} height={120} />
          <rect ref={bind("dimRedR")} x={W} y={100} width={4} height={120} />
        </clipPath>
        <clipPath id={id + "r"} clipPathUnits="userSpaceOnUse">
          <rect ref={bind("redL")} x={redX} y={-20} width={Math.max(0, W - redX)} height={120} />
          <rect ref={bind("redR")} x={redX} y={100} width={Math.max(0, W - redX)} height={120} />
        </clipPath>
      </defs>
      <g transform={vertical ? "translate(0 " + fx(W) + ") rotate(-90)" : undefined}>
        <g clipPath={"url(#" + id + "b)"}>
          <path className="cr-m-dim" d={d} strokeWidth={GSW} clipPath={"url(#" + id + "d)"} />
          <path className="cr-m-dimred" d={d} strokeWidth={GSW} clipPath={"url(#" + id + "q)"} />
          <path className="cr-m-lit" d={d} strokeWidth={GSW} clipPath={"url(#" + id + "l)"} />
          <path className="cr-m-red" d={d} strokeWidth={GSW} clipPath={"url(#" + id + "r)"} />
        </g>
        {segs.gaps.map((g, j) => (
          <rect key={j} className="cr-gapfill" x={fx(g[0])} y={-2} width={fx(g[1])} height={GH + 4} />
        ))}
        <rect ref={bind("split")} className="cr-gapfill" x={0} y={99.25} width={W} height={1.5} opacity={0} />
        <rect ref={bind("pkL")} className="cr-m-peak" x={0} y={0} width={seg} height={99.25} opacity={0} />
        <rect ref={bind("pkR")} className="cr-m-peak" x={0} y={100.75} width={seg} height={99.25} opacity={0} />
      </g>
    </svg>
  )
}

/* ---------- riso artwork ---------- */

type CoverProps = { show: CrShow; seed: string; image?: string; label?: string; alt?: string; className?: string; top?: boolean }

/** A two-ink riso print for a show: ink A and ink B overprint (multiply), slightly out of register, with paper grain. */
function Cover({ show, seed, image, label, alt, className, top }: CoverProps) {
  const id = "p" + React.useId().replace(/[^a-zA-Z0-9]/g, "")
  if (image) {
    return (
      <span className={"cr-cover " + (className || "")}>
        <img src={image} alt={alt || ""} loading="lazy" decoding="async" width={800} height={800} />
      </span>
    )
  }
  const ink = show.ink || (["#ff48b0", "#0078bf"] as CrInk)
  const art = show.art || "rings"
  const rnd = mulberry(seedOf(seed + show.id))
  const r = () => rnd()
  const a: React.ReactNode[] = []
  const b: React.ReactNode[] = []
  let knockLabel = false
  if (art === "rings") {
    const cx = 230 + r() * 110
    const cy = 230 + r() * 110
    for (let i = 0; i < 11; i++) a.push(<circle key={i} cx={fx(cx)} cy={fx(cy)} r={28 + i * 25} fill="none" stroke="currentColor" strokeWidth={11} />)
    b.push(<circle key="s" cx={fx(110 + r() * 70)} cy={fx(170 + r() * 60)} r={112 + r() * 20} fill="currentColor" />)
  } else if (art === "bars") {
    // a tide chart: a half sun rising behind a waveform, with the overprint making a third ink
    const n = 22
    const mid = 236 + r() * 30
    const off = seedOf(seed) % 50
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1)
      const h = 26 + 210 * Math.pow(vnoise(t * 4.1 + r() * 0.25 + off), 1.3) * (0.35 + 0.65 * Math.sin(t * Math.PI))
      a.push(<rect key={i} x={fx(14 + i * 17.6)} y={fx(mid - h / 2)} width={11.5} height={fx(h)} fill="currentColor" />)
    }
    a.push(<rect key="tide" x={0} y={fx(mid + 108)} width={400} height={12} fill="currentColor" />)
    b.push(<rect key="band" x={0} y={0} width={400} height={56} fill="currentColor" />)
    b.push(<circle key="sun" cx={fx(140 + r() * 120)} cy={fx(mid + 20)} r={fx(118 + r() * 24)} fill="currentColor" />)
  } else if (art === "dots") {
    const ox = r() * 400
    const oy = r() * 400
    for (let y = 10; y < 400; y += 17)
      for (let x = 10 + ((y / 17) % 2) * 8.5; x < 400; x += 17) {
        const dd = Math.hypot(x - ox, y - oy) / 520
        const rad = 7.6 * smooth(0.02, 0.95, dd)
        if (rad > 0.7) a.push(<circle key={x + "-" + y} cx={fx(x)} cy={fx(y)} r={fx(rad)} fill="currentColor" />)
      }
    const ch = Array.from(show.title.replace(/[^A-Za-z0-9]/g, ""))[0] || "K"
    b.push(<path key="big" d={glyphPath(ch, 0)} transform={"translate(" + fx(150 + r() * 40) + " " + fx(96 + r() * 30) + ") scale(1.62)"} fill="none" stroke="currentColor" strokeWidth={GSW} />)
  } else if (art === "stripes") {
    let y = 200 + r() * 30
    let th = 22
    while (y < 410) {
      a.push(<rect key={y} x={0} y={fx(y)} width={400} height={fx(th)} fill="currentColor" />)
      y += th + 9
      th = Math.max(4, th * 0.8)
    }
    b.push(<circle key="sun" cx={fx(110 + r() * 180)} cy={fx(205 + r() * 30)} r={fx(92 + r() * 22)} fill="currentColor" />)
  } else {
    const cell = 80
    for (let y = 0; y < 5; y++)
      for (let x = 0; x < 5; x++) if (r() < 0.42 && !(x < 3 && y === 0)) a.push(<rect key={x + "-" + y} x={x * cell} y={y * cell} width={cell} height={cell} fill="currentColor" />)
    const k = 120 + r() * 120
    b.push(<polygon key="band" points={"0," + fx(400 - k + 300) + " " + fx(k + 260) + ",0 " + fx(k + 360) + ",0 0," + fx(400 - k + 400)} fill="currentColor" />)
    b.push(<circle key="dot" cx={fx(60 + r() * 280)} cy={fx(250 + r() * 100)} r={34} fill="currentColor" />)
  }
  const name = (label === undefined ? show.title : label).toUpperCase()
  const lay = layoutText(name)
  const sc = Math.min(0.24, 330 / Math.max(1, lay.width))
  const labelD = lay.items.map((it) => glyphPath(it.ch, it.x)).join("")
  const labelAt = "translate(30 76) scale(" + fx(sc) + ")"
  const labelPath = <path d={labelD} transform={labelAt} fill="none" stroke="currentColor" strokeWidth={GSW} clipPath={"url(#" + id + "c)"} />
  return (
    <span className={"cr-cover " + (className || "")}>
      <svg viewBox="0 0 400 400" preserveAspectRatio={top ? "xMidYMin slice" : "xMidYMid slice"} role={alt ? "img" : undefined} aria-label={alt} aria-hidden={alt ? undefined : true} focusable="false">
        <defs>
          <filter id={id + "g"} x="0" y="0" width="1" height="1">
            <feTurbulence type="fractalNoise" baseFrequency="1.15" numOctaves={2} seed={seedOf(seed) % 97} result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -7 5.15" result="m" />
            <feComposite in="SourceGraphic" in2="m" operator="in" />
          </filter>
          <clipPath id={id + "c"} clipPathUnits="userSpaceOnUse">
            {lay.items.map((it, j) => (
              <rect key={j} x={it.x - 0.5} y={0} width={it.w + 1} height={GH} />
            ))}
          </clipPath>
        </defs>
        <rect className="cr-paperfill" width={400} height={400} />
        <g className="cr-plate cr-pa" style={{ color: ink[0] }} filter={"url(#" + id + "g)"}>
          {a}
        </g>
        <g className="cr-plate cr-pb" style={{ color: ink[1] }} filter={"url(#" + id + "g)"}>
          {b}
        </g>
        {!name.trim() ? null : knockLabel ? (
          <g className="cr-knocklabel">{labelPath}</g>
        ) : (
          <>
            <rect className="cr-paperfill" x={0} y={62} width={400} height={fx(GH * sc + 28)} />
            <g className="cr-plate" style={{ color: inkLum(ink[0]) < inkLum(ink[1]) ? ink[0] : ink[1] }}>
              {labelPath}
            </g>
          </>
        )}
      </svg>
    </span>
  )
}

/* ---------- small icons (geometric, drawn on a 24 grid) ---------- */

function Icon({ name }: { name: "play" | "pause" | "vol" | "mute" | "arrow" | "check" | "close" | "back" | "bell" }) {
  const p: { [k: string]: React.ReactNode } = {
    play: <path d="M7 4.5v15l12.5-7.5z" fill="currentColor" />,
    pause: <path d="M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z" fill="currentColor" />,
    vol: <path d="M4 9h4l5-4v14l-5-4H4zM16 8.5c1.2 1 1.8 2.2 1.8 3.5s-.6 2.5-1.8 3.5M18.5 6c2 1.6 3 3.6 3 6s-1 4.4-3 6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" />,
    mute: <path d="M4 9h4l5-4v14l-5-4H4zM16.5 9.5l5 5M21.5 9.5l-5 5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" />,
    arrow: <path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth={2} />,
    check: <path d="M4.5 12.5l4.5 4.5 10.5-11" fill="none" stroke="currentColor" strokeWidth={2.2} />,
    close: <path d="M5 5l14 14M19 5L5 19" fill="none" stroke="currentColor" strokeWidth={2} />,
    back: <path d="M20 12H5M11 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth={2} />,
    bell: <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15zM10 20.5h4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" />,
  }
  return (
    <svg className="cr-ic" viewBox="0 0 24 24" width={20} height={20} aria-hidden="true" focusable="false">
      {p[name]}
    </svg>
  )
}

/** The mini player's progress: the audio's real position when it has one, else listening time. Its own component so the page doesn't re-render while it ticks. */
function DockProgress({ audio, played, source, live }: { audio: { current: HTMLAudioElement | null }; played: { current: { key: string; ms: number; since: number } }; source: CrSource; live: number }) {
  const [f, setF] = React.useState(0)
  React.useEffect(() => {
    const tick = () => {
      if (source.kind === "live") return setF(live)
      const a = audio.current
      if (a && a.getAttribute("data-src") && isFinite(a.duration) && a.duration > 0) return setF(clamp(a.currentTime / a.duration, 0, 1))
      const p = played.current
      const ms = p.ms + (p.since ? Date.now() - p.since : 0)
      setF(clamp(ms / 60000 / Math.max(1, source.episode.minutes), 0, 1))
    }
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [audio, played, source, live])
  return (
    <span className="cr-dock-prog" aria-hidden="true">
      <i style={{ transform: "scaleX(" + fx(f) + ")" }} />
    </span>
  )
}

/** The station clock, ticking every second in the station's zone. Its own component so the page doesn't re-render each second. */
function Clock({ tz }: { tz: string }) {
  const [t, setT] = React.useState(null as null | { hms: string; zone: string })
  useIsoLayout(() => {
    const tick = () => {
      const c = stationClock(tz, new Date())
      setT({ hms: fmtMin(c.min) + ":" + pad2(c.sec), zone: c.zone })
    }
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [tz])
  return (
    <span className="cr-clock cr-mono">
      {t ? t.hms : "--:--:--"}
      {t && t.zone ? <span className="cr-zone"> {t.zone}</span> : null}
    </span>
  )
}

const CR_CSS = `
.cr-root{--cr-pad:clamp(16px,3.2vw,48px);--cr-gut:clamp(16px,2.2vw,36px);--cr-nav:64px;--cr-ease:cubic-bezier(.22,1,.36,1);--cr-r:6px;--cr-sans:"Helvetica Neue",Helvetica,Inter,Arial,system-ui,sans-serif;--cr-mono:ui-monospace,"SF Mono","JetBrains Mono",Menlo,Consolas,"DejaVu Sans Mono",monospace;position:relative;min-height:var(--cr-h);background:var(--cr-ground);color:var(--cr-ink);font-family:var(--cr-sans);font-size:16px;line-height:1.5;-webkit-font-smoothing:antialiased;overflow-x:clip;isolation:isolate;transition:background-color .35s var(--cr-ease),color .35s var(--cr-ease)}
.cr-root[data-theme="dark"]{color-scheme:dark}
.cr-root :where(*){box-sizing:border-box;margin:0;padding:0}
.cr-root :where(button,input){font:inherit;color:inherit;background:none;border:0;border-radius:0;letter-spacing:inherit}
.cr-root :where(button){cursor:pointer}
.cr-root :where(a){color:inherit;text-decoration:none}
.cr-root :where(ul,ol){list-style:none}
.cr-root :where(img){max-width:none}
.cr-root ::selection{background:var(--cr-tally);color:var(--cr-on-tally)}
.cr-root :where(a,button,input,[tabindex]):focus-visible{outline:2px solid var(--cr-tally);outline-offset:3px;border-radius:2px}
.cr-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap}
.cr-mono{font-family:var(--cr-mono);font-variant-numeric:tabular-nums;letter-spacing:0}
.cr-skip{position:absolute;left:12px;top:-60px;z-index:60;background:var(--cr-ink);color:var(--cr-ground);padding:10px 14px;border-radius:var(--cr-r);font-weight:700;font-size:14px;transition:top .2s var(--cr-ease)}
.cr-skip:focus{top:12px}

.cr-glyphs{display:block;overflow:visible;flex:none;max-width:none}
.cr-glyphs[data-fit]{width:100%;height:auto}
.cr-stroke{fill:none;stroke:currentColor;stroke-linejoin:miter;stroke-miterlimit:8}
.cr-band{fill:var(--cr-ground);transition:fill .35s var(--cr-ease)}
.cr-meter{display:block;max-width:none}
.cr-meter path{fill:none;stroke-linejoin:miter;stroke-miterlimit:8}
.cr-m-dim{stroke:var(--cr-dim)}
.cr-m-lit{stroke:var(--cr-ink)}
.cr-m-red{stroke:var(--cr-tally)}
.cr-m-dimred{stroke:color-mix(in srgb,var(--cr-tally) 34%,transparent)}
.cr-m-peak{fill:var(--cr-tally)}
.cr-gapfill{fill:var(--cr-ground);transition:fill .35s var(--cr-ease)}
.cr-ic{display:block;flex:none}

.cr-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:10px;height:44px;padding:0 18px;border-radius:var(--cr-r);font-weight:700;font-size:15px;letter-spacing:-.005em;white-space:nowrap;overflow:hidden;isolation:isolate;transition:transform .16s var(--cr-ease),color .25s var(--cr-ease),box-shadow .25s var(--cr-ease)}
.cr-btn::before{content:"";position:absolute;inset:0;z-index:-1;background:var(--cr-ink);transform:scaleX(0);transform-origin:left;transition:transform .32s var(--cr-ease)}
.cr-btn .cr-ic{transition:transform .25s var(--cr-ease)}
.cr-btn:active{transform:scale(.97)}
.cr-solid{background:var(--cr-tally);color:var(--cr-on-tally)}
.cr-line{box-shadow:inset 0 0 0 1.5px var(--cr-ink);color:var(--cr-ink)}
.cr-quiet{color:var(--cr-ink);padding:0 4px;height:36px}
.cr-quiet::before{display:none}
.cr-quiet span{background:linear-gradient(currentColor,currentColor) 0 100%/0 1.5px no-repeat;transition:background-size .3s var(--cr-ease)}
@media (hover:hover){
.cr-solid:hover::before,.cr-line:hover::before{transform:scaleX(1)}
.cr-solid:hover,.cr-line:hover{color:var(--cr-ground)}
.cr-btn:hover .cr-ic{transform:translateX(3px)}
.cr-quiet:hover span{background-size:100% 1.5px}
}

.cr-nav{position:sticky;top:0;z-index:30;height:var(--cr-nav);display:flex;align-items:center;gap:20px;padding:0 var(--cr-pad);background:var(--cr-ground);border-bottom:1px solid var(--cr-line);transition:background-color .35s var(--cr-ease)}
.cr-brand{display:flex;align-items:center;gap:10px;font-size:22px;flex:none}
.cr-brand-f{font-family:var(--cr-mono);font-size:13px;font-weight:600;color:var(--cr-tally)}
.cr-links{display:flex;align-items:center;gap:0;font-size:15px;font-weight:600}
.cr-links li{display:flex;align-items:center}
.cr-links li+li::before{content:"/";color:var(--cr-muted);font-weight:400;padding:0 10px}
.cr-links a{position:relative;padding:6px 0;background:linear-gradient(currentColor,currentColor) 0 100%/0 2px no-repeat;transition:background-size .3s var(--cr-ease)}
@media (hover:hover){.cr-links a:hover{background-size:100% 2px}}
.cr-nav-end{margin-left:auto;display:flex;align-items:center;gap:14px}
.cr-onair{display:flex;align-items:center;gap:8px;font-size:13px;max-width:280px;min-width:0;transition:opacity .25s var(--cr-ease),transform .25s var(--cr-ease)}
.cr-onair[data-off]{opacity:0;transform:translateY(-4px);pointer-events:none}
.cr-onair b{font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cr-onair .cr-mono{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--cr-tally)}
.cr-lamp{width:9px;height:9px;border-radius:50%;background:var(--cr-tally);flex:none;box-shadow:0 0 0 3px color-mix(in srgb,var(--cr-tally) 22%,transparent)}
.cr-lamp[data-blink]{animation:cr-blink 2.4s steps(1,end) infinite}
@keyframes cr-blink{0%,70%{opacity:1}71%,100%{opacity:.35}}
.cr-mode{height:36px;padding:0 12px;border-radius:var(--cr-r);box-shadow:inset 0 0 0 1px var(--cr-line);font-size:13px;font-weight:600;display:flex;align-items:center;gap:8px;transition:box-shadow .2s var(--cr-ease)}
.cr-mode i{width:12px;height:12px;border-radius:50%;background:linear-gradient(90deg,var(--cr-ink) 50%,transparent 50%);box-shadow:inset 0 0 0 1.5px var(--cr-ink)}
@media (hover:hover){.cr-mode:hover{box-shadow:inset 0 0 0 1.5px var(--cr-ink)}}
.cr-menu-btn{display:none;height:40px;padding:0 14px;border-radius:var(--cr-r);box-shadow:inset 0 0 0 1.5px var(--cr-ink);font-weight:700;font-size:14px}

.cr-hero{--cr-hh:calc(clamp(640px,var(--cr-h),1000px) - var(--cr-nav));position:relative;display:grid;grid-template-columns:clamp(150px,12.5vw,206px) minmax(0,1fr) clamp(320px,25vw,392px);column-gap:var(--cr-gut);height:var(--cr-hh);padding:0 var(--cr-pad)}
.cr-mast{position:relative;grid-row:1;min-height:0}
.cr-mast-in{position:absolute;inset:26px 0 26px 0}
.cr-mast .cr-meter{width:100%;height:100%}
.cr-mast .cr-meter[data-h]{display:none}
.cr-feature{display:flex;flex-direction:column;min-width:0;min-height:0;padding:26px 0}
.cr-stage{display:grid;grid-template-columns:minmax(0,25fr) minmax(0,75fr);column-gap:var(--cr-gut);align-items:start}
.cr-aside{display:flex;flex-direction:column;gap:18px;padding-top:2px}
.cr-tagline{font-size:15px;line-height:1.45;color:var(--cr-muted);max-width:30ch}
.cr-kicker{display:flex;align-items:center;flex-wrap:wrap;gap:8px 10px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}
.cr-kicker .cr-mono{font-weight:600;color:var(--cr-muted);letter-spacing:0;text-transform:none;font-size:12px}
.cr-cover-wrap{position:relative;justify-self:end;width:100%;height:clamp(260px,calc(var(--cr-hh) - 345px),640px);border-radius:var(--cr-r);overflow:hidden;background:var(--cr-panel)}
.cr-cover{position:relative;display:block;width:100%;height:100%;overflow:hidden;background:var(--cr-paper)}
.cr-cover svg,.cr-cover img{position:absolute;inset:0;width:100%;height:100%;display:block;max-width:none;object-fit:cover}
.cr-paperfill{fill:var(--cr-paper)}
.cr-plate{mix-blend-mode:multiply}
.cr-pb{transform:translate(2.5px,-2px);transition:transform .5s var(--cr-ease)}
.cr-pa{transition:transform .5s var(--cr-ease)}
.cr-knocklabel{color:var(--cr-paper)}
.cr-ftitle{position:relative;z-index:2;margin-top:-.62em;font-size:clamp(46px,6vw,98px);min-height:1em}
.cr-ftitle .cr-glyphs{color:var(--cr-ink)}
.cr-fmeta{display:grid;grid-template-columns:minmax(0,25fr) minmax(0,75fr);column-gap:var(--cr-gut);margin-top:16px}
.cr-host{font-size:15px;font-weight:700}
.cr-host-a{margin-top:10px}
.cr-host-b{visibility:hidden}
.cr-next{display:flex;flex-direction:column;align-items:flex-start;text-align:left;gap:1px;margin-top:6px;padding:12px 0 0;border-top:1px solid var(--cr-line);width:100%;transition:transform .2s var(--cr-ease)}
.cr-next-k{font-family:var(--cr-mono);font-size:12px;color:var(--cr-muted)}
.cr-next-t{font-size:17px;font-weight:700;letter-spacing:-.01em;background:linear-gradient(currentColor,currentColor) 0 100%/0 1.5px no-repeat;transition:background-size .3s var(--cr-ease)}
.cr-next-h{font-size:13px;color:var(--cr-muted)}
@media (hover:hover){.cr-next:hover .cr-next-t{background-size:100% 1.5px}}
.cr-host span{display:block;font-weight:400;color:var(--cr-muted);font-size:13px}
.cr-blurb{font-size:17px;line-height:1.5;max-width:52ch;text-wrap:pretty}
.cr-genres{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.cr-tag{font-family:var(--cr-mono);font-size:11px;font-weight:600;padding:3px 7px;border-radius:4px;box-shadow:inset 0 0 0 1px var(--cr-line);color:var(--cr-muted)}
.cr-player{margin-top:auto;padding-top:20px;display:flex;align-items:center;gap:16px}
.cr-play{position:relative;width:60px;height:60px;flex:none;border-radius:var(--cr-r);background:var(--cr-tally);color:var(--cr-on-tally);display:grid;place-items:center;transition:transform .16s var(--cr-ease)}
.cr-play .cr-ic{width:26px;height:26px}
.cr-play::after{content:"";position:absolute;inset:-5px;border-radius:9px;box-shadow:0 0 0 1.5px var(--cr-tally);opacity:0;transform:scale(.92);transition:opacity .25s var(--cr-ease),transform .25s var(--cr-ease)}
@media (hover:hover){.cr-play:hover::after{opacity:1;transform:scale(1)}}
.cr-play:active{transform:scale(.95)}
.cr-play[data-busy]::before{content:"";position:absolute;inset:6px;border-radius:4px;border:2px solid transparent;border-top-color:var(--cr-on-tally);animation:cr-spin .9s linear infinite}
@keyframes cr-spin{to{transform:rotate(1turn)}}
.cr-pinfo{min-width:0;flex:1}
.cr-pline{display:flex;align-items:baseline;gap:10px;font-size:14px;min-width:0}
.cr-pline b{font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cr-pline .cr-mono{font-size:12px;color:var(--cr-muted);flex:none}
.cr-prog{position:relative;height:3px;margin-top:9px;background:var(--cr-line);border-radius:2px;overflow:hidden}
.cr-prog i{position:absolute;inset:0;background:var(--cr-ink);transform-origin:left;transition:transform 1s linear}
.cr-ptimes{display:flex;justify-content:space-between;margin-top:6px;font-size:11px;color:var(--cr-muted)}
.cr-vol{display:flex;align-items:center;gap:6px;flex:none}
.cr-iconbtn{width:40px;height:40px;display:grid;place-items:center;border-radius:var(--cr-r);color:var(--cr-ink);transition:background-color .2s var(--cr-ease)}
@media (hover:hover){.cr-iconbtn:hover{background:var(--cr-line)}}
.cr-range{-webkit-appearance:none;appearance:none;width:92px;height:24px;background:transparent;cursor:pointer}
.cr-range::-webkit-slider-runnable-track{height:3px;border-radius:2px;background:linear-gradient(90deg,var(--cr-ink) var(--v),var(--cr-line) var(--v))}
.cr-range::-moz-range-track{height:3px;border-radius:2px;background:linear-gradient(90deg,var(--cr-ink) var(--v),var(--cr-line) var(--v))}
.cr-range::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;margin-top:-5.5px;border-radius:3px;background:var(--cr-ink);border:0}
.cr-range::-moz-range-thumb{width:14px;height:14px;border-radius:3px;background:var(--cr-ink);border:0}
.cr-perr{font-size:13px;color:var(--cr-tally);font-weight:600;display:flex;align-items:center;gap:10px}
.cr-perr button{text-decoration:underline;text-underline-offset:3px}
.cr-factions{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}

.cr-rail{position:relative;min-height:0;overflow-y:auto;overscroll-behavior:contain;border-left:1px solid var(--cr-line);padding:0 0 26px var(--cr-gut);scrollbar-width:thin;scrollbar-color:var(--cr-line) transparent;-webkit-mask-image:linear-gradient(180deg,#000 calc(100% - 56px),transparent);mask-image:linear-gradient(180deg,#000 calc(100% - 56px),transparent)}
.cr-rail-h{position:sticky;top:0;z-index:2;display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:26px 0 14px;background:var(--cr-ground);transition:background-color .35s var(--cr-ease)}
.cr-rail-h h2{font-size:15px;font-weight:700}
.cr-rail-h h2 span{display:block;font-weight:400;font-size:13px;color:var(--cr-muted)}
.cr-clock{font-size:13px;font-weight:600}
.cr-zone{color:var(--cr-muted);font-weight:400}
.cr-order{position:relative}
.cr-order::before{content:"";position:absolute;left:69px;top:14px;bottom:14px;width:1px;background:var(--cr-line)}
.cr-slot{position:relative;width:100%;display:grid;grid-template-columns:56px 28px minmax(0,1fr);align-items:start;text-align:left;padding:12px 10px 12px 0;border-radius:var(--cr-r);transition:background-color .2s var(--cr-ease)}
@media (hover:hover){.cr-slot:hover{background:color-mix(in srgb,var(--cr-ink) 5%,transparent)}.cr-slot:hover .cr-slot-title{transform:translateX(3px)}}
.cr-slot[aria-pressed="true"]{background:color-mix(in srgb,var(--cr-ink) 8%,transparent)}
.cr-slot-t{font-size:13px;font-weight:600;padding-top:1px}
.cr-dot{position:relative;z-index:1;width:13px;height:13px;margin:4px 0 0 7px;border-radius:50%;background:linear-gradient(135deg,var(--a) 50%,var(--b) 50%);box-shadow:0 0 0 3px var(--cr-ground);transition:box-shadow .35s var(--cr-ease)}
.cr-slot-body{display:flex;flex-direction:column;gap:2px;min-width:0}
.cr-slot-k{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--cr-muted);display:flex;align-items:center;gap:6px}
.cr-slot-title{font-size:17px;font-weight:700;line-height:1.25;letter-spacing:-.01em;transition:transform .25s var(--cr-ease)}
.cr-slot-host{font-size:13px;color:var(--cr-muted)}
.cr-slot[data-state="past"] .cr-slot-title,.cr-slot[data-state="past"] .cr-slot-t{color:var(--cr-muted)}
.cr-slot[data-state="now"] .cr-slot-k{color:var(--cr-tally)}
.cr-slot[data-state="now"] .cr-slot-title{font-size:21px}
.cr-slot .cr-prog{margin-top:8px}
.cr-slot .cr-prog i{background:var(--cr-tally)}
.cr-more{display:none}

.cr-sec{padding:clamp(64px,8vw,128px) var(--cr-pad)}
.cr-sec-h{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:16px 40px;margin-bottom:clamp(28px,3.4vw,52px)}
.cr-h2{font-size:clamp(36px,4.6vw,72px);line-height:1}
.cr-sec-t{font-size:17px;line-height:1.5;color:var(--cr-muted);max-width:44ch}
.cr-rv[data-armed]{opacity:0;transform:translateY(12px);filter:blur(3px);transition:opacity .5s var(--cr-ease),transform .5s var(--cr-ease),filter .5s var(--cr-ease)}
.cr-rv[data-armed][data-in]{opacity:1;transform:none;filter:none}

.cr-ways{border-top:1px solid var(--cr-line);border-bottom:1px solid var(--cr-line);padding:0 var(--cr-pad);display:grid;grid-template-columns:repeat(4,minmax(0,1fr))}
.cr-way{display:flex;flex-direction:column;gap:12px;padding:clamp(24px,3vw,40px) clamp(16px,2vw,28px) clamp(24px,3vw,40px) 0}
.cr-way+.cr-way{border-left:1px solid var(--cr-line);padding-left:clamp(16px,2vw,28px)}
.cr-way .cr-way-v{color:var(--cr-ink);display:flex;flex-direction:column;align-items:flex-start;gap:10px;font-size:clamp(34px,3.4vw,54px)}
.cr-way-u{font-family:var(--cr-mono);font-size:12px;font-weight:700;color:var(--cr-tally);text-transform:uppercase;letter-spacing:.04em;line-height:1;padding-bottom:2px}
.cr-way p{font-size:15px;color:var(--cr-muted);max-width:30ch}

.cr-res{position:relative}
.cr-res-list{border-top:1px solid var(--cr-ink)}
.cr-res-row{position:relative;display:grid;grid-template-columns:88px minmax(0,1.5fr) minmax(0,1fr) minmax(0,.7fr) minmax(0,.9fr) 44px;align-items:center;gap:24px;padding:18px 0;border-bottom:1px solid var(--cr-line)}
.cr-res-t{min-width:0;font-size:clamp(30px,3vw,46px);transition:transform .25s var(--cr-ease)}
.cr-res-host{font-size:16px;font-weight:600}
.cr-res-slot{font-size:13px;color:var(--cr-muted)}
.cr-res-g{display:flex;flex-wrap:wrap;gap:6px}
.cr-res-go{width:44px;height:44px;display:grid;place-items:center;border-radius:var(--cr-r);box-shadow:inset 0 0 0 1px var(--cr-line);transition:background-color .25s var(--cr-ease),color .25s var(--cr-ease),box-shadow .25s var(--cr-ease)}
.cr-res-thumb{display:block;position:relative;width:88px;height:88px;border-radius:var(--cr-r);overflow:hidden;transition:transform .25s var(--cr-ease)}
.cr-res-thumb .cr-cover{position:absolute;inset:0}
@media (hover:hover){
.cr-res-row:hover .cr-res-t,.cr-res-row:focus-visible .cr-res-t{transform:translateX(10px)}
.cr-res-row:hover .cr-res-thumb{transform:scale(1.06) rotate(-2deg)}
.cr-res-row:hover .cr-res-go{background:var(--cr-tally);color:var(--cr-on-tally);box-shadow:none}
.cr-res-row:hover .cr-res-go .cr-ic{transform:translateX(2px)}
}
.cr-res-go .cr-ic{transition:transform .25s var(--cr-ease)}

.cr-filters{display:flex;flex-wrap:wrap;gap:8px}
.cr-chip{height:36px;padding:0 14px;border-radius:999px;font-size:14px;font-weight:600;box-shadow:inset 0 0 0 1px var(--cr-line);transition:background-color .2s var(--cr-ease),color .2s var(--cr-ease),box-shadow .2s var(--cr-ease)}
.cr-chip[aria-pressed="true"]{background:var(--cr-ink);color:var(--cr-ground);box-shadow:none}
@media (hover:hover){.cr-chip:hover{box-shadow:inset 0 0 0 1.5px var(--cr-ink)}}
.cr-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:clamp(16px,2vw,28px)}
.cr-ep{position:relative;display:flex;flex-direction:column;gap:12px;min-width:0}
.cr-ep[data-shape="big"]{grid-column:span 2;grid-row:span 2}
.cr-ep[data-shape="wide"]{grid-column:span 2}
.cr-ep[data-shape="full"]{grid-column:span 4;flex-direction:row;align-items:center}
.cr-ep-art{position:relative;display:block;width:100%;aspect-ratio:1;border-radius:var(--cr-r);overflow:hidden;background:var(--cr-paper)}
.cr-ep[data-shape="wide"] .cr-ep-art{aspect-ratio:2/1}
.cr-ep[data-shape="full"] .cr-ep-art{width:calc(25% - 15px);flex:none}
.cr-ep[data-shape="full"]{gap:clamp(16px,2vw,28px)}
.cr-ep[data-shape="full"] .cr-ep-title{font-size:clamp(20px,1.8vw,26px)}
.cr-ep-art .cr-cover{position:absolute;inset:0}
.cr-ep-play{position:absolute;left:12px;bottom:12px;width:48px;height:48px;border-radius:var(--cr-r);background:#0d0e0c;color:#ffffff;display:grid;place-items:center;transition:transform .2s var(--cr-ease),background-color .2s var(--cr-ease),color .2s var(--cr-ease)}
.cr-ep[data-shape="big"] .cr-ep-play{width:60px;height:60px;left:16px;bottom:16px}
.cr-ep-play[data-on]{background:var(--cr-tally);color:var(--cr-on-tally)}
.cr-ep-art:active .cr-ep-play{transform:scale(.94)}
.cr-ep-meta{display:flex;flex-direction:column;gap:4px;min-width:0}
.cr-ep-show{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--cr-muted)}
.cr-ep-title{font-size:17px;font-weight:700;line-height:1.3;letter-spacing:-.01em;text-wrap:pretty;background:linear-gradient(currentColor,currentColor) 0 100%/0 1.5px no-repeat;transition:background-size .3s var(--cr-ease)}
.cr-ep[data-shape="big"] .cr-ep-title{font-size:clamp(20px,1.8vw,26px)}
.cr-ep-when{font-size:12px;color:var(--cr-muted)}
.cr-eq{display:inline-flex;align-items:flex-end;gap:2px;height:12px;margin-left:6px;vertical-align:-1px}
.cr-eq i{width:3px;background:var(--cr-tally);animation:cr-eq .9s var(--cr-ease) infinite alternate}
.cr-eq i:nth-child(2){animation-delay:-.3s}.cr-eq i:nth-child(3){animation-delay:-.6s}
@keyframes cr-eq{from{height:3px}to{height:12px}}
@media (hover:hover){
.cr-ep:hover .cr-pb,.cr-stage:hover .cr-pb,.cr-res-row:hover .cr-pb{transform:translate(7px,-5px)}
.cr-ep:hover .cr-pa,.cr-stage:hover .cr-pa{transform:translate(-2px,2px)}
.cr-ep:hover .cr-ep-play{transform:scale(1.1);background:var(--cr-tally);color:var(--cr-on-tally)}
.cr-ep:hover .cr-ep-title{background-size:100% 1.5px}
}
.cr-empty{grid-column:1/-1;padding:40px 0;color:var(--cr-muted)}

.cr-support{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:clamp(28px,4vw,72px);background:var(--cr-panel);border-radius:var(--cr-r);padding:clamp(24px,4vw,64px);transition:background-color .35s var(--cr-ease)}
.cr-sup-l{display:flex;flex-direction:column;gap:20px}
.cr-seg{display:inline-flex;align-self:flex-start;padding:3px;border-radius:calc(var(--cr-r) + 3px);box-shadow:inset 0 0 0 1px var(--cr-line)}
.cr-seg button{height:36px;padding:0 14px;border-radius:var(--cr-r);font-size:14px;font-weight:600;color:var(--cr-muted);transition:background-color .2s var(--cr-ease),color .2s var(--cr-ease)}
.cr-seg button[aria-pressed="true"]{background:var(--cr-ink);color:var(--cr-ground)}
.cr-sup-r{display:flex;flex-direction:column;gap:16px}
.cr-amount{display:flex;align-items:flex-end;gap:14px;font-size:clamp(64px,7vw,112px)}
.cr-amount-u{font-size:15px;font-weight:600;color:var(--cr-muted);padding-bottom:6px;line-height:1.2}
.cr-amount-u b{display:block;color:var(--cr-ink);font-size:17px}
.cr-perks{display:flex;flex-direction:column;gap:8px;min-height:92px}
.cr-perks li{display:flex;gap:10px;align-items:flex-start;font-size:15px}
.cr-perks .cr-ic{width:18px;height:18px;margin-top:2px;color:var(--cr-tally)}
.cr-dial{grid-column:1/-1;position:relative;padding-top:40px;touch-action:none;cursor:ew-resize;user-select:none;-webkit-user-select:none;border-radius:var(--cr-r)}
.cr-dial-scale{position:relative;height:60px;border-top:1.5px solid var(--cr-ink)}
.cr-tick{position:absolute;top:0;width:1.5px;height:12px;background:var(--cr-muted);transform:translateX(-50%)}
.cr-tick[data-major]{height:22px;background:var(--cr-ink)}
.cr-tick-n{position:absolute;top:34px;font-size:12px;color:var(--cr-muted);transform:translateX(-50%)}
.cr-mark{position:absolute;top:24px;width:0;display:flex;justify-content:center;font-size:12px;font-weight:700;white-space:nowrap}
.cr-mark span{position:absolute;bottom:calc(100% + 4px);left:0;transform:translateX(-50%)}
.cr-mark[data-edge="start"] span{transform:translateX(-6px)}
.cr-mark[data-edge="end"] span{transform:translateX(calc(-100% + 6px))}
.cr-mark i{flex:none;width:9px;height:9px;border-radius:2px;background:var(--cr-ink);transform:rotate(45deg)}
.cr-mark[data-on] i{background:var(--cr-tally)}
.cr-needle{position:absolute;top:-14px;height:42px;width:0;transition:left .18s var(--cr-ease);pointer-events:none}
.cr-needle::before{content:"";position:absolute;left:-1.5px;top:0;bottom:0;width:3px;background:var(--cr-tally);border-radius:2px}
.cr-needle::after{content:"";position:absolute;left:-7px;top:0;width:14px;height:26px;border-radius:4px;background:var(--cr-tally);box-shadow:0 0 0 3px var(--cr-panel)}
.cr-dial[data-drag] .cr-needle{transition:none}
.cr-sup-done{display:flex;flex-direction:column;gap:10px;font-size:17px}
.cr-sup-done b{font-size:22px}

.cr-foot{padding:clamp(56px,7vw,112px) var(--cr-pad) 32px;border-top:1px solid var(--cr-line)}
.cr-foot-word{margin-bottom:clamp(36px,5vw,72px)}
.cr-foot-word .cr-meter{width:100%;height:auto}
.cr-foot-grid{display:grid;grid-template-columns:minmax(0,1.6fr) repeat(3,minmax(0,1fr));gap:clamp(24px,3vw,48px)}
.cr-foot h3{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--cr-muted);margin-bottom:14px}
.cr-foot li{margin-bottom:8px;font-size:15px}
.cr-foot li a{background:linear-gradient(currentColor,currentColor) 0 100%/0 1.5px no-repeat;transition:background-size .3s var(--cr-ease),color .2s var(--cr-ease)}
@media (hover:hover){.cr-foot li a:hover{background-size:100% 1.5px}}
.cr-foot address{font-style:normal;font-size:15px;line-height:1.6}
.cr-foot address a{text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1px}
.cr-news h3{color:var(--cr-ink);font-size:clamp(22px,2vw,28px);letter-spacing:-.01em;text-transform:none;margin-bottom:8px}
.cr-news p{font-size:15px;color:var(--cr-muted);margin-bottom:16px;max-width:40ch}
.cr-news label{display:block;font-size:13px;font-weight:700;margin-bottom:6px}
.cr-news-row{display:flex;gap:8px}
.cr-input{flex:1;min-width:0;height:44px;padding:0 14px;border-radius:var(--cr-r);background:var(--cr-ground);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--cr-ink) 40%,transparent);font-size:15px;transition:box-shadow .2s var(--cr-ease)}
.cr-input::placeholder{color:var(--cr-muted);opacity:1}
.cr-input:focus{outline:none;box-shadow:inset 0 0 0 2px var(--cr-tally)}
.cr-msg{font-size:13px;margin-top:8px;min-height:20px}
.cr-msg[data-bad]{color:var(--cr-tally);font-weight:600}
.cr-legal{display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;margin-top:clamp(40px,5vw,72px);padding-top:20px;border-top:1px solid var(--cr-line);font-size:13px;color:var(--cr-muted)}

.cr-dock{position:sticky;bottom:12px;z-index:25;margin:0 var(--cr-pad);height:0;overflow:visible;pointer-events:none}
.cr-dock-in{position:absolute;right:0;bottom:0;width:min(100%,620px);overflow:hidden;display:flex;align-items:center;gap:14px;padding:10px 12px 10px 16px;border-radius:calc(var(--cr-r) + 4px);background:var(--cr-ink);color:var(--cr-ground);box-shadow:0 18px 40px -16px rgba(0,0,0,.5);transform:translateY(calc(100% + 24px));opacity:0;transition:transform .45s var(--cr-ease),opacity .3s var(--cr-ease);pointer-events:none}
.cr-dock[data-on] .cr-dock-in{transform:none;opacity:1;pointer-events:auto}
.cr-dock .cr-meter{width:auto;height:30px;flex:none}
.cr-dock .cr-m-lit{stroke:var(--cr-ground)}
.cr-dock .cr-m-dim{stroke:color-mix(in srgb,var(--cr-ground) 22%,transparent)}
.cr-dock .cr-gapfill{fill:var(--cr-ink)}
.cr-dock-t{min-width:0;flex:1;font-size:14px;line-height:1.3}
.cr-dock-t b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cr-dock-t span{font-size:12px;opacity:.75}
.cr-dock .cr-iconbtn{color:var(--cr-ground)}
.cr-dock .cr-dock-p{width:44px;height:44px;border-radius:var(--cr-r);background:var(--cr-tally);color:var(--cr-on-tally);display:grid;place-items:center;flex:none}
.cr-dock .cr-quiet{color:var(--cr-ground);font-size:13px}
.cr-dock-prog{position:absolute;left:0;right:0;bottom:0;height:3px;background:color-mix(in srgb,var(--cr-ground) 18%,transparent)}
.cr-dock-prog i{position:absolute;inset:0;background:var(--cr-tally);transform-origin:left;transition:transform 1s linear}

.cr-sheet{position:fixed;inset:0;z-index:70;display:flex;flex-direction:column;background:var(--cr-ground);padding:16px var(--cr-pad) 32px;animation:cr-sheet .32s var(--cr-ease)}
@keyframes cr-sheet{from{opacity:0;transform:translateY(-12px)}}
.cr-sheet-h{display:flex;align-items:center;justify-content:space-between;height:48px}
.cr-sheet ul{margin-top:24px;display:flex;flex-direction:column}
.cr-sheet li a{display:block;padding:12px 0;font-size:34px;font-weight:800;letter-spacing:-.02em;border-bottom:1px solid var(--cr-line)}
.cr-sheet .cr-btn{margin-top:28px;align-self:flex-start}

@media (max-width:1180px){
.cr-onair{display:none}
}
@media (max-width:1099px){
.cr-links{display:none}
.cr-menu-btn{display:inline-flex;align-items:center}
.cr-nav-end .cr-solid{display:none}
.cr-hero{grid-template-columns:clamp(96px,13vw,124px) minmax(0,1fr);height:auto;grid-template-rows:auto auto}
.cr-mast{grid-row:1/span 2}
.cr-mast-in{position:sticky;top:calc(var(--cr-nav) + 24px);inset:auto;padding:24px 0}
.cr-mast .cr-meter[data-v]{width:100%;height:auto}
.cr-cover-wrap{max-width:none;height:auto;aspect-ratio:4/3}
.cr-ftitle{font-size:clamp(46px,8vw,98px)}
.cr-stage{grid-template-columns:1fr}
.cr-aside{flex-direction:row;align-items:flex-start;justify-content:space-between;gap:24px;margin-bottom:16px}
.cr-tagline{max-width:46ch}
.cr-kicker{flex:none}
.cr-host-a,.cr-next{display:none}
.cr-host-b{visibility:visible}
.cr-feature{padding:24px 0 32px}
.cr-rail{-webkit-mask-image:none;mask-image:none;grid-column:2;border-left:0;border-top:1px solid var(--cr-line);padding:0 0 32px;overflow:visible}
.cr-rail-h{position:static}
.cr-ways{grid-template-columns:repeat(2,minmax(0,1fr))}
.cr-way:nth-child(3){border-left:0;padding-left:0}
.cr-way:nth-child(n+3){border-top:1px solid var(--cr-line)}
.cr-res-row{grid-template-columns:72px minmax(0,1.4fr) minmax(0,1fr) minmax(0,.8fr) 44px}
.cr-res-thumb{width:72px;height:72px}
.cr-res-g{display:none}
.cr-mark span{visibility:hidden}
.cr-mark[data-on] span{visibility:visible}
.cr-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
.cr-ep[data-shape="big"]{grid-row:auto}
.cr-ep[data-shape="full"]{grid-column:span 2}
.cr-ep[data-shape="full"] .cr-ep-art{width:calc(50% - 10px)}
.cr-foot-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
.cr-foot-grid .cr-news{grid-column:1/-1}
}
@media (max-width:719px){
.cr-nav{gap:12px}
.cr-brand{font-size:19px}
.cr-mode span{display:none}
.cr-hero{display:block;padding:0 var(--cr-pad)}
.cr-mast{padding-top:12px}
.cr-mast-in{position:static}
.cr-mast .cr-meter[data-v]{display:none}
.cr-mast .cr-meter[data-h]{display:block;width:100%;height:auto}
.cr-feature{padding:16px 0 28px}
.cr-ftitle{order:1}
.cr-player{order:2}
.cr-fmeta{order:3}
.cr-stage{grid-template-columns:1fr}
.cr-aside{order:2;margin-top:0}
.cr-stage .cr-cover-wrap{order:1;margin-bottom:0}
.cr-aside{display:contents}
.cr-tagline{order:0;margin-bottom:14px;font-size:15px;max-width:none}
.cr-kicker{order:0;margin-bottom:12px}
.cr-ftitle{font-size:clamp(40px,13vw,64px);margin-top:-.55em}
.cr-fmeta{grid-template-columns:1fr;row-gap:10px;margin-top:12px}
.cr-blurb{font-size:16px}
.cr-player{margin-top:14px;padding-top:0;gap:12px}
.cr-play{width:56px;height:56px}
.cr-vol .cr-range{display:none}
.cr-rail{padding-bottom:24px}
.cr-slot[data-far]{display:none}
.cr-rail[data-all] .cr-slot[data-far]{display:grid}
.cr-more{display:inline-flex;margin-top:8px}
.cr-ways{grid-template-columns:repeat(2,minmax(0,1fr))}
.cr-way{padding:20px 12px 20px 0}
.cr-way:nth-child(even){border-left:1px solid var(--cr-line);padding-left:14px}
.cr-way .cr-way-v{font-size:30px}
.cr-way p{font-size:14px}
.cr-res-row{grid-template-columns:64px minmax(0,1fr) 44px;gap:14px;padding:16px 0}
.cr-res-thumb{width:64px;height:64px}
.cr-res-mid{display:flex;flex-direction:column;gap:4px;min-width:0}
.cr-res-t{font-size:28px}
.cr-res-slot{display:none}
.cr-grid{grid-template-columns:1fr}
.cr-ep[data-shape]{grid-column:auto;flex-direction:column;align-items:stretch}
.cr-ep[data-shape="wide"],.cr-ep[data-shape="full"],.cr-ep[data-shape="small"]{flex-direction:row;align-items:center;gap:14px}
.cr-ep[data-shape="wide"] .cr-ep-art,.cr-ep[data-shape="full"] .cr-ep-art,.cr-ep[data-shape="small"] .cr-ep-art{width:112px;flex:none;aspect-ratio:1}
.cr-ep[data-shape="full"] .cr-ep-title{font-size:17px}
.cr-ep[data-shape="small"] .cr-ep-play,.cr-ep[data-shape="wide"] .cr-ep-play,.cr-ep[data-shape="full"] .cr-ep-play{width:40px;height:40px;left:8px;bottom:8px}
.cr-support{grid-template-columns:1fr}
.cr-tick-n[data-minor]{display:none}
.cr-mark span{visibility:hidden}
.cr-mark[data-on] span{visibility:visible}
.cr-foot-grid{grid-template-columns:1fr}
.cr-news-row{flex-direction:column}
.cr-input{flex:none}
.cr-dock-in{gap:10px;padding:8px 8px 8px 12px}
.cr-dock .cr-meter{height:22px}
.cr-dock .cr-quiet{display:none}
}
@media (min-width:720px) and (max-width:1099px){
.cr-res-mid{display:contents}
}
@media (min-width:1100px){
.cr-res-mid{display:contents}
}
@media (prefers-reduced-motion:reduce){
.cr-root *,.cr-root *::before,.cr-root *::after{animation:none !important;transition:none !important}
.cr-rv[data-armed]{opacity:1;transform:none}
}
`

export default function CallsignRadioLanding({
  station,
  links = DEFAULT_LINKS,
  memberCta = "Become a member",
  streamUrl,
  corsMeter = false,
  shows = DEFAULT_SHOWS,
  schedule = DEFAULT_SCHEDULE,
  week,
  episodes = DEFAULT_EPISODES,
  listen,
  residents,
  archive,
  support,
  footer,
  preset = "night",
  palette,
  theme = "system",
  themeToggle = true,
  onPlay,
  onRemind,
  onSupport,
  onSubscribe,
  labels,
  height = "100svh",
  className,
}: CallsignRadioLandingProps) {
  const rootRef = React.useRef(null as HTMLDivElement | null)
  const reduced = useReducedMotion()
  const [dark, setDark] = useTheme(theme)
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "")
  const ST = { ...DEFAULT_STATION, ...(station || {}) }
  const T = { ...DEFAULT_LABELS, ...(labels || {}) } as CrLabels
  const P = PRESETS[preset] || PRESETS.night
  const tokens = { ...(dark ? P.dark : P.light), ...((palette && (dark ? palette.dark : palette.light)) || {}) } as CrTokens
  const LS = listen === null ? null : { title: "Tune in", ways: DEFAULT_WAYS, ...(listen || {}) }
  const RS = residents === null ? null : { title: "Residents", text: "Every show is made by people who live here, most of them volunteers, in the same two studios.", ...(residents || {}) }
  const AR = archive === null || episodes === null ? null : { title: "Listen back", text: "Every show stays in the archive for a year.", ...(archive || {}) }
  const SP = support === null ? null : { ...DEFAULT_SUPPORT, ...(support || {}) }
  const FT = footer === null ? null : { ...DEFAULT_FOOTER, ...(footer || {}) }
  const showMap: { [id: string]: CrShow } = {}
  for (const s of shows) showMap[s.id] = s
  const fallbackShow: CrShow = { id: "_", title: ST.name, host: ST.city, genres: [], blurb: ST.tagline }
  const showOf = (id: string) => showMap[id] || fallbackShow
  const masthead = (ST.callsign + (ST.frequency ? " " + ST.frequency : "")).toUpperCase()
  const redAt = ST.frequency ? layoutText(ST.callsign).items.length + 1 : -1

  useReveal(rootRef, reduced)

  /* ---------- the clock and the running order ---------- */
  const [clock, setClock] = React.useState(null as null | ReturnType<typeof stationClock>)
  useIsoLayout(() => {
    const tick = () => setClock(stationClock(ST.timeZone, new Date()))
    tick()
    const iv = setInterval(tick, 15000)
    return () => clearInterval(iv)
  }, [ST.timeZone])
  const today = (week && clock && week[clock.day]) || schedule
  const order = runningOrder(today && today.length ? today : DEFAULT_SCHEDULE)
  const ready = !!clock
  const cur = clock ? Math.max(0, onAirIndex(order, clock.min)) : 0
  const [sel, setSel] = React.useState(-1)
  const fi = sel >= 0 && sel < order.length ? sel : cur
  const feat = order[fi]
  const fshow = showOf(feat ? feat.show : "")
  const nowShow = showOf(order[cur] ? order[cur].show : "")
  const prog = clock && order[cur] ? slotProgress(order[cur], clock.min, clock.sec) : 0
  const fstate = !ready ? "wait" : fi === cur ? "now" : fi < cur ? "past" : "next"
  const next = fi + 1 < order.length ? order[fi + 1] : null
  const railRef = React.useRef(null as HTMLDivElement | null)
  const [railAll, setRailAll] = React.useState(false)
  // put the slot on air at the top of the rail's own scroll, without moving the page
  React.useEffect(() => {
    const rail = railRef.current
    if (!rail || !clock) return
    const rows = Array.from(rail.querySelectorAll(".cr-order > li")) as HTMLElement[]
    const head = rail.querySelector(".cr-rail-h") as HTMLElement | null
    if (!head || rail.scrollHeight <= rail.clientHeight + 4) return
    // start the list on the row before the one on air, or on the latest row that can sit whole under the header
    const max = rail.scrollHeight - rail.clientHeight
    const base = rail.scrollTop - rail.getBoundingClientRect().top - head.offsetHeight
    let to = 0
    for (let i = Math.max(0, cur - 1); i >= 0; i--) {
      const want = base + rows[i].getBoundingClientRect().top
      if (want <= max + 1) {
        to = Math.max(0, want)
        break
      }
    }
    rail.scrollTop = to
    // only when the slot changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur, !!clock])

  /* ---------- player ---------- */
  const audioRef = React.useRef(null as HTMLAudioElement | null)
  const [source, setSource] = React.useState({ kind: "live" } as CrSource)
  const [status, setStatus] = React.useState("idle" as "idle" | "loading" | "playing" | "error")
  const [vol, setVol] = React.useState(80)
  const [muted, setMuted] = React.useState(false)
  const [said, setSaid] = React.useState("")
  const playing = status === "playing" || status === "loading"
  const liveOn = playing && source.kind === "live"
  const srcShow = source.kind === "episode" ? showOf(source.episode.show) : nowShow
  const kind = srcShow.kind || "music"
  const analysers = React.useRef(null as null | { l: AnalyserNode; r: AnalyserNode; buf: Float32Array })
  const ctxRef = React.useRef(null as AudioContext | null)

  React.useEffect(() => {
    const a = audioRef.current
    if (a) {
      a.volume = vol / 100
      a.muted = muted
    }
  }, [vol, muted])

  const wireMeter = () => {
    const a = audioRef.current
    if (!a || !corsMeter || analysers.current || typeof window === "undefined") return
    try {
      const AC = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return
      const ctx = new AC()
      const src = ctx.createMediaElementSource(a)
      const split = ctx.createChannelSplitter(2)
      const l = ctx.createAnalyser()
      const r = ctx.createAnalyser()
      l.fftSize = r.fftSize = 1024
      src.connect(split)
      split.connect(l, 0)
      split.connect(r, 1)
      src.connect(ctx.destination)
      ctxRef.current = ctx
      analysers.current = { l, r, buf: new Float32Array(1024) }
    } catch {
      analysers.current = null
    }
  }

  // listening time per source, for episodes without a real audio file
  const played = React.useRef({ key: "", ms: 0, since: 0 })
  const start = (next: CrSource) => {
    const a = audioRef.current
    const url = next.kind === "live" ? streamUrl : next.episode.audioUrl
    setSource(next)
    setDocked(true)
    const key = next.kind === "live" ? "live" : next.episode.id
    if (played.current.key !== key) played.current = { key, ms: 0, since: 0 }
    played.current.since = Date.now()
    if (onPlay) onPlay(next)
    const label = next.kind === "live" ? ST.name + " live: " + nowShow.title : next.episode.title
    if (!url || !a) {
      setStatus("playing")
      setSaid("Playing " + label)
      return
    }
    if (a.getAttribute("data-src") !== url) {
      if (corsMeter) a.crossOrigin = "anonymous"
      a.src = url
      a.setAttribute("data-src", url)
    }
    wireMeter()
    if (ctxRef.current && ctxRef.current.state === "suspended") ctxRef.current.resume().catch(() => undefined)
    setStatus("loading")
    setSaid("Tuning in to " + label)
    a.play().then(
      () => {
        setStatus("playing")
        setSaid("Playing " + label)
      },
      () => {
        setStatus("error")
        setSaid(T.streamError)
      }
    )
  }
  const stop = () => {
    if (played.current.since) played.current.ms += Date.now() - played.current.since
    played.current.since = 0
    const a = audioRef.current
    if (a && !a.paused) a.pause()
    setStatus("idle")
    setSaid("Paused")
  }
  const toggleLive = () => (liveOn ? stop() : start({ kind: "live" }))
  const toggleEpisode = (ep: CrEpisode) => (playing && source.kind === "episode" && source.episode.id === ep.id ? stop() : start({ kind: "episode", episode: ep }))
  React.useEffect(
    () => () => {
      if (ctxRef.current) ctxRef.current.close().catch(() => undefined)
    },
    []
  )

  /* ---------- the meter loop: one clock for every meter on the page ---------- */
  const meters = React.useRef([] as MeterFn[])
  const register = React.useCallback((fn: MeterFn) => {
    meters.current.push(fn)
    fn(lv.current)
    return () => {
      meters.current = meters.current.filter((f) => f !== fn)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const lv = React.useRef({ L: reduced ? 1 : 0, R: reduced ? 1 : 0, pL: 0, pR: 0, live: 0, hL: 0, hR: 0 })
  React.useEffect(() => {
    const on = status === "playing"
    let raf = 0
    let last = 0
    const s = lv.current
    const ease = (c: number, t: number, up: number, down: number, dt: number) => c + (t - c) * (1 - Math.exp(-dt * (t > c ? up : down)))
    const frame = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016
      last = now
      let tL = 1
      let tR = 1
      if (on) {
        const an = analysers.current
        if (an) {
          an.l.getFloatTimeDomainData(an.buf as never)
          tL = rmsLevel(an.buf)
          an.r.getFloatTimeDomainData(an.buf as never)
          tR = rmsLevel(an.buf)
        } else if (reduced) {
          tL = 0.7
          tR = 0.68
        } else {
          tL = envelope(now / 1000, kind, 0)
          tR = envelope(now / 1000, kind, 1)
        }
      }
      if (reduced) {
        s.L = tL
        s.R = tR
        s.live = on ? 1 : 0
      } else {
        s.L = ease(s.L, tL, on ? 26 : 3.2, on ? 6.5 : 6, dt)
        s.R = ease(s.R, tR, on ? 26 : 3.2, on ? 6.5 : 6, dt)
        s.live = ease(s.live, on ? 1 : 0, 8, 8, dt)
      }
      if (on) {
        if (s.L >= s.pL) (s.pL = s.L), (s.hL = 0.9)
        else if (s.hL > 0) s.hL -= dt
        else s.pL = Math.max(s.L, s.pL - dt * 0.45)
        if (s.R >= s.pR) (s.pR = s.R), (s.hR = 0.9)
        else if (s.hR > 0) s.hR -= dt
        else s.pR = Math.max(s.R, s.pR - dt * 0.45)
      }
      for (const fn of meters.current) fn(s)
      const settled = !on && s.L > 0.997 && s.R > 0.997 && s.live < 0.01
      if (settled) {
        s.L = s.R = 1
        s.live = 0
        for (const fn of meters.current) fn(s)
        return
      }
      if (on && reduced && !analysers.current) {
        for (const fn of meters.current) fn(s)
        return
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [status, kind, reduced])

  /* ---------- the dock appears when the hero player scrolls away ---------- */
  const playerRef = React.useRef(null as HTMLDivElement | null)
  const [playerSeen, setPlayerSeen] = React.useState(true)
  React.useEffect(() => {
    const el = playerRef.current
    if (!el || typeof IntersectionObserver === "undefined") return
    const io = new IntersectionObserver((es) => setPlayerSeen(es[0].isIntersecting), { threshold: 0 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const [docked, setDocked] = React.useState(false)
  const dockOn = docked && !playerSeen


  /* ---------- theme, nav ---------- */
  const go = (href?: string) => (e: React.MouseEvent) => {
    if (!href || href.charAt(0) !== "#" || href.length < 2) return
    const el = rootRef.current && rootRef.current.querySelector('[data-sec="' + href.slice(1) + '"]')
    if (!el) return
    e.preventDefault()
    setMenu(false)
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" })
  }
  const [menu, setMenu] = React.useState(false)
  const menuBtn = React.useRef(null as HTMLButtonElement | null)
  const sheetRef = React.useRef(null as HTMLDivElement | null)
  React.useEffect(() => {
    if (!menu) return
    const first = sheetRef.current && (sheetRef.current.querySelector("a,button") as HTMLElement | null)
    if (first) first.focus()
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(false)
        if (menuBtn.current) menuBtn.current.focus()
      }
      if (e.key === "Tab" && sheetRef.current) {
        const f = Array.from(sheetRef.current.querySelectorAll("a,button")) as HTMLElement[]
        if (!f.length) return
        const a = f[0]
        const z = f[f.length - 1]
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault()
          z.focus()
        } else if (!e.shiftKey && document.activeElement === z) {
          e.preventDefault()
          a.focus()
        }
      }
    }
    document.addEventListener("keydown", key)
    return () => document.removeEventListener("keydown", key)
  }, [menu])

  /* ---------- reminders ---------- */
  const alive = React.useRef(true)
  React.useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  const [reminders, setReminders] = React.useState({} as { [start: string]: "busy" | "set" | "error" })
  const remind = async (show: CrShow, startAt: string) => {
    if (reminders[startAt] === "busy" || reminders[startAt] === "set") return
    setReminders((r) => ({ ...r, [startAt]: "busy" }))
    let ok = true
    try {
      if (onRemind) {
        const res = await onRemind(show, startAt)
        if (res === false) ok = false
      } else await new Promise((r) => setTimeout(r, 450))
    } catch {
      ok = false
    }
    if (!alive.current) return
    setReminders((r) => ({ ...r, [startAt]: ok ? "set" : "error" }))
    setSaid(ok ? "Reminder set for " + show.title + " at " + startAt : "The reminder did not save.")
  }

  const resRef = React.useRef(null as HTMLElement | null)
  const residentShows = shows.filter((s) => !s.hidden)

  /* ---------- archive ---------- */
  const eps = episodes || []
  const genreList = [T.allGenres, ...Array.from(new Set(eps.flatMap((e) => showOf(e.show).genres.slice(0, 1))))]
  const [genre, setGenre] = React.useState("")
  const shown = !genre || genre === T.allGenres ? eps : eps.filter((e) => showOf(e.show).genres.slice(0, 1).indexOf(genre) > -1)

  /* ---------- support ---------- */
  const smin = SP ? SP.min : 0
  const smax = SP ? Math.max(SP.min + 1, SP.max) : 1
  const [amount, setAmount] = React.useState(SP ? clamp(SP.start, SP.min, SP.max) : 0)
  const [cadence, setCadence] = React.useState("monthly" as "monthly" | "once")
  const [sState, setSState] = React.useState("idle" as "idle" | "busy" | "done" | "error")
  const dialRef = React.useRef(null as HTMLDivElement | null)
  const [dragging, setDragging] = React.useState(false)
  const tier = SP ? tierFor(amount, SP.tiers) : null
  const perks = SP ? perksFor(amount, SP.tiers) : []
  const pct = (v: number) => ((v - smin) / (smax - smin)) * 100
  const dialAt = (clientX: number) => {
    const el = dialRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setAmount(dialAmount((clientX - r.left) / Math.max(1, r.width), smin, smax))
    if (sState === "done" || sState === "error") setSState("idle")
  }
  const give = async () => {
    if (!SP || sState === "busy") return
    setSState("busy")
    let ok = true
    try {
      if (onSupport) {
        const res = await onSupport(amount, cadence, tier)
        if (res === false) ok = false
      } else await new Promise((r) => setTimeout(r, 600))
    } catch {
      ok = false
    }
    if (alive.current) setSState(ok ? "done" : "error")
  }
  const cur$ = SP ? SP.currency : ""

  /* ---------- newsletter ---------- */
  const [email, setEmail] = React.useState("")
  const [nState, setNState] = React.useState("idle" as "idle" | "busy" | "done" | "error" | "invalid")
  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEmail(email)) return setNState("invalid")
    setNState("busy")
    let ok = true
    try {
      if (onSubscribe) {
        const res = await onSubscribe(email.trim())
        if (res === false) ok = false
      } else await new Promise((r) => setTimeout(r, 500))
    } catch {
      ok = false
    }
    if (alive.current) setNState(ok ? "done" : "error")
  }

  const vars = {
    "--cr-h": height,
    "--cr-ground": tokens.ground,
    "--cr-ink": tokens.ink,
    "--cr-muted": tokens.muted,
    "--cr-line": tokens.line,
    "--cr-dim": tokens.dim,
    "--cr-tally": tokens.tally,
    "--cr-on-tally": tokens.onTally,
    "--cr-panel": tokens.panel,
    "--cr-paper": tokens.paper,
  } as React.CSSProperties

  const featLabel = fstate === "now" ? T.onAirNow : fstate === "next" ? T.later : T.earlier
  const featEpisode = eps.find((e) => feat && e.show === feat.show)
  const playLabel = liveOn ? "Pause " + ST.name : status === "error" ? "Try the stream again" : "Listen live to " + ST.name
  const sourceTitle = source.kind === "episode" ? source.episode.title : nowShow.title
  const sourceLine = source.kind === "episode" ? showOf(source.episode.show).title + ", " + source.episode.date : T.liveOn + " " + (ST.frequency ? ST.frequency + " FM" : ST.name)

  return (
    <div ref={rootRef} className={"cr-root " + (className || "")} data-theme={dark ? "dark" : "light"} data-preset={preset} style={vars}>
      <style>{CR_CSS}</style>
      <a className="cr-skip" href={"#" + uid + "-sched"} onClick={go("#schedule")}>
        Skip to today's schedule
      </a>
      <audio
        ref={audioRef}
        preload="none"
        onPlaying={() => setStatus("playing")}
        onWaiting={() => setStatus((s) => (s === "playing" ? "loading" : s))}
        onError={() => {
          if (audioRef.current && audioRef.current.getAttribute("data-src")) setStatus("error")
        }}
      />

      <header className="cr-nav">
        <a className="cr-brand" href="#listen" onClick={go("#listen")} aria-label={ST.name + ", back to the top"}>
          <Glyphs text={ST.callsign} />
          {ST.frequency ? <span className="cr-brand-f">{ST.frequency}</span> : null}
        </a>
        <nav aria-label="Sections">
          <ul className="cr-links">
            {links.map((l) => (
              <li key={l.label}>
                <a href={l.href || "#"} onClick={go(l.href)}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="cr-nav-end">
          <span className="cr-onair" data-off={playerSeen ? "" : undefined}>
            <i className="cr-lamp" data-blink={liveOn && !reduced ? "" : undefined} aria-hidden="true" />
            <span className="cr-mono">{T.onAir}</span>
            <b>{nowShow.title}</b>
          </span>
          {themeToggle ? (
            <button type="button" className="cr-mode" onClick={() => setDark(!dark)} aria-label={dark ? "Switch to the day theme" : "Switch to the night theme"}>
              <i aria-hidden="true" />
              <span>{dark ? T.dayTheme : T.nightTheme}</span>
            </button>
          ) : null}
          {SP ? (
            <a className="cr-btn cr-solid" href="#support" onClick={go("#support")}>
              {memberCta}
            </a>
          ) : null}
          <button ref={menuBtn} type="button" className="cr-menu-btn" aria-expanded={menu} aria-controls={uid + "-menu"} onClick={() => setMenu(true)}>
            {T.menu}
          </button>
        </div>
      </header>

      {menu ? (
        <div className="cr-sheet" id={uid + "-menu"} role="dialog" aria-modal="true" aria-label="Menu" ref={sheetRef}>
          <div className="cr-sheet-h">
            <span style={{ fontSize: 22 }}>
              <Glyphs text={masthead} />
            </span>
            <button
              type="button"
              className="cr-iconbtn"
              aria-label="Close menu"
              onClick={() => {
                setMenu(false)
                if (menuBtn.current) menuBtn.current.focus()
              }}
            >
              <Icon name="close" />
            </button>
          </div>
          <ul>
            {links.map((l) => (
              <li key={l.label}>
                <a href={l.href || "#"} onClick={go(l.href)}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          {SP ? (
            <a className="cr-btn cr-solid" href="#support" onClick={go("#support")}>
              {memberCta}
            </a>
          ) : null}
        </div>
      ) : null}

      <section className="cr-hero" data-sec="listen" aria-labelledby={uid + "-h1"}>
        <h1 className="cr-sr" id={uid + "-h1"}>
          {ST.name}
          {ST.frequency ? ", " + ST.frequency + " FM " : " "}
          {ST.city ? "in " + ST.city : ""}
        </h1>
        <div className="cr-mast">
          <div className="cr-mast-in">
            <MeterWord word={masthead} redAt={redAt} vertical seg={P.segment} gap={P.gap} register={register} />
          </div>
          <MeterWord word={masthead} redAt={redAt} seg={P.segment} gap={P.gap} register={register} />
        </div>

        <div className="cr-feature">
          <div className="cr-stage">
            <div className="cr-aside">
              <p className="cr-tagline">{ST.tagline}</p>
              <p className="cr-kicker" style={ready ? undefined : { visibility: "hidden" }}>
                {fstate === "now" ? <i className="cr-lamp" data-blink={liveOn && !reduced ? "" : undefined} aria-hidden="true" /> : null}
                <span style={fstate === "now" ? { color: "var(--cr-tally)" } : undefined}>{featLabel}</span>
                {feat ? <span className="cr-mono">{fmtMin(feat.from) + " to " + fmtMin(feat.to)}</span> : null}
              </p>
              <p className="cr-host cr-host-a">
                {fshow.host}
                {fshow.genres.length ? <span>{fshow.genres.join(", ")}</span> : null}
              </p>
              {next ? (
                <button type="button" className="cr-next" onClick={() => setSel(fi + 1)}>
                  <span className="cr-next-k">{T.nextAt + " " + fmtMin(next.from)}</span>
                  <span className="cr-next-t">{showOf(next.show).title}</span>
                  <span className="cr-next-h">{showOf(next.show).host}</span>
                </button>
              ) : null}
            </div>
            <div className="cr-cover-wrap">
              <Cover show={fshow} seed="hero" image={fshow.image} label="" alt={"Artwork for " + fshow.title} />
            </div>
          </div>
          <h2 className="cr-ftitle">
            <span className="cr-sr">{fshow.title}</span>
            <Glyphs text={fshow.title} wrap knock />
          </h2>
          <div className="cr-fmeta">
            <p className="cr-host cr-host-b">
              {fshow.host}
              {fshow.genres.length ? <span>{fshow.genres.join(", ")}</span> : null}
            </p>
            <div>
              <p className="cr-blurb">{fshow.blurb}</p>
              {fstate === "past" || fstate === "next" ? (
                <div className="cr-factions">
                  {fstate === "next" ? (
                    <button type="button" className="cr-btn cr-line" onClick={() => feat && remind(fshow, fmtMin(feat.from))} disabled={reminders[fmtMin(feat ? feat.from : 0)] === "busy"}>
                      <Icon name={reminders[fmtMin(feat ? feat.from : 0)] === "set" ? "check" : "bell"} />
                      {reminders[fmtMin(feat ? feat.from : 0)] === "set"
                        ? T.reminderSet + " " + fmtMin(feat ? feat.from : 0)
                        : reminders[fmtMin(feat ? feat.from : 0)] === "error"
                          ? T.reminderRetry
                          : T.remindAt + " " + fmtMin(feat ? feat.from : 0)}
                    </button>
                  ) : featEpisode ? (
                    <button type="button" className="cr-btn cr-line" onClick={() => toggleEpisode(featEpisode)}>
                      <Icon name={playing && source.kind === "episode" && source.episode.id === featEpisode.id ? "pause" : "play"} />
                      {T.listenBack}
                    </button>
                  ) : null}
                  <button type="button" className="cr-btn cr-quiet" onClick={() => setSel(-1)}>
                    <Icon name="back" />
                    <span>{T.backToNow}</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
          <div className="cr-player" ref={playerRef}>
            <button type="button" className="cr-play" onClick={toggleLive} aria-label={playLabel} aria-pressed={liveOn} data-busy={status === "loading" && source.kind === "live" ? "" : undefined}>
              <Icon name={liveOn ? "pause" : "play"} />
            </button>
            <div className="cr-pinfo">
              {status === "error" ? (
                <p className="cr-perr" role="alert">
                  {T.streamError}
                  <button type="button" onClick={() => start(source)}>
                    {T.tryAgain}
                  </button>
                </p>
              ) : (
                <p className="cr-pline">
                  <b>{source.kind === "episode" && playing ? sourceTitle : T.live + ": " + nowShow.title}</b>
                  <span className="cr-mono">{source.kind === "episode" && playing ? T.archive : order[cur] ? fmtMin(order[cur].from) + "-" + fmtMin(order[cur].to) : ""}</span>
                </p>
              )}
              <div className="cr-prog" role="progressbar" aria-label="Time through the show on air" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(prog * 100)}>
                <i style={{ transform: "scaleX(" + fx(prog) + ")" }} />
              </div>
            </div>
            <div className="cr-vol">
              <button type="button" className="cr-iconbtn" onClick={() => setMuted(!muted)} aria-label={muted ? "Unmute" : "Mute"} aria-pressed={muted}>
                <Icon name={muted || vol === 0 ? "mute" : "vol"} />
              </button>
              <input
                className="cr-range"
                type="range"
                min={0}
                max={100}
                value={muted ? 0 : vol}
                aria-label="Volume"
                style={{ "--v": (muted ? 0 : vol) + "%" } as React.CSSProperties}
                onChange={(e) => {
                  setVol(+e.target.value)
                  if (muted) setMuted(false)
                }}
              />
            </div>
          </div>
        </div>

        <div className="cr-rail" ref={railRef} data-sec="schedule" id={uid + "-sched"} data-all={railAll ? "" : undefined} tabIndex={-1}>
          <div className="cr-rail-h">
            <h2>
              {T.today + " " + ST.name}
              <span>{clock ? clock.label : " "}</span>
            </h2>
            <Clock tz={ST.timeZone} />
          </div>
          <ol className="cr-order">
            {order.map((o, i) => {
              const sh = showOf(o.show)
              const state = !ready ? "next" : i === cur ? "now" : i < cur ? "past" : "next"
              const far = i < cur - 1 || i > cur + 3
              const ink = sh.ink || ["#888888", "#444444"]
              return (
                <li key={o.start + i}>
                  <button
                    type="button"
                    className="cr-slot"
                    data-state={state}
                    data-far={far ? "" : undefined}
                    aria-pressed={i === fi && sel >= 0}
                    aria-current={state === "now" ? "time" : undefined}
                    aria-label={fmtMin(o.from) + ", " + sh.title + ", " + sh.host + (state === "now" ? ", on air now" : "")}
                    onClick={() => setSel(i === cur ? -1 : i)}
                  >
                    <span className="cr-slot-t cr-mono">{fmtMin(o.from)}</span>
                    <span className="cr-dot" style={{ "--a": ink[0], "--b": ink[1] } as React.CSSProperties} aria-hidden="true" />
                    <span className="cr-slot-body">
                      <span className="cr-slot-k">
                        {state === "now" ? (
                          <>
                            <i className="cr-lamp" aria-hidden="true" />
                            {T.onAir}
                          </>
                        ) : (
                          sh.genres.join(", ")
                        )}
                      </span>
                      <span className="cr-slot-title">{sh.title}</span>
                      <span className="cr-slot-host">{sh.host}</span>
                      {state === "now" ? (
                        <span className="cr-prog" aria-hidden="true">
                          <i style={{ transform: "scaleX(" + fx(prog) + ")" }} />
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
          <button type="button" className="cr-btn cr-line cr-more" onClick={() => setRailAll(!railAll)} aria-expanded={railAll}>
            {railAll ? T.showLess : T.wholeDay}
          </button>
        </div>
      </section>

      {LS ? (
        <section className="cr-ways" aria-label={LS.title}>
          {LS.ways.map((w) => (
            <div className="cr-way" key={w.unit + w.value}>
              <p className="cr-way-v">
                <span className="cr-sr">{w.value + " " + w.unit}</span>
                <Glyphs text={w.value} />
                <span className="cr-way-u" aria-hidden="true">
                  {w.unit}
                </span>
              </p>
              <p>{w.href ? <a href={w.href}>{w.text}</a> : w.text}</p>
            </div>
          ))}
        </section>
      ) : null}

      {RS && residentShows.length ? (
        <section className="cr-sec cr-res" data-sec="residents" aria-labelledby={uid + "-res"} ref={resRef}>
          <div className="cr-sec-h cr-rv">
            <div>
              <h2 className="cr-h2" id={uid + "-res"}>
                <span className="cr-sr">{RS.title}</span>
                <Glyphs text={RS.title} />
              </h2>
              <p className="cr-sec-t" style={{ marginTop: 14 }}>
                {RS.text}
              </p>
            </div>
          </div>
          <ul className="cr-res-list">
            {residentShows.map((s, i) => (
              <li key={s.id}>
                <a className="cr-res-row" aria-label={s.title + ", " + s.host + (s.slot ? ", " + s.slot : "")} href={s.href || "#archive"} onClick={s.href ? undefined : go("#archive")}>
                  <span className="cr-res-thumb" aria-hidden="true">
                    <Cover show={s} seed="thumb" image={s.image} label="" />
                  </span>
                  <span className="cr-res-mid">
                    <span className="cr-res-t">
                      <Glyphs text={s.title} wrap />
                    </span>
                    <span className="cr-res-host">{s.host}</span>
                  </span>
                  <span className="cr-res-slot cr-mono">{s.slot || ""}</span>
                  <span className="cr-res-g">
                    {s.genres.map((g) => (
                      <span className="cr-tag" key={g}>
                        {g}
                      </span>
                    ))}
                  </span>
                  <span className="cr-res-go" aria-hidden="true">
                    <Icon name="arrow" />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {AR ? (
        <section className="cr-sec" data-sec="archive" aria-labelledby={uid + "-arc"} style={{ paddingTop: 0 }}>
          <div className="cr-sec-h cr-rv">
            <div>
              <h2 className="cr-h2" id={uid + "-arc"}>
                <span className="cr-sr">{AR.title}</span>
                <Glyphs text={AR.title} />
              </h2>
              <p className="cr-sec-t" style={{ marginTop: 14 }}>
                {AR.text}
              </p>
            </div>
            <div className="cr-filters" role="group" aria-label="Filter the archive by genre">
              {genreList.map((g) => (
                <button key={g} type="button" className="cr-chip" aria-pressed={genre === g || (!genre && g === T.allGenres)} onClick={() => setGenre(g)}>
                  {g}
                </button>
              ))}
            </div>
          </div>
          <ul className="cr-grid">
            {shown.length ? (
              shown.map((ep, i) => {
                const sh = showOf(ep.show)
                const on = playing && source.kind === "episode" && source.episode.id === ep.id
                const shape = archiveShape(i, shown.length)
                return (
                  <li className="cr-ep" key={ep.id} data-shape={shape}>
                    <button type="button" className="cr-ep-art" onClick={() => toggleEpisode(ep)} aria-label={(on ? "Pause " : "Play ") + sh.title + ": " + ep.title} aria-pressed={on}>
                      <Cover show={sh} seed={ep.id} image={ep.image || sh.image} top={shape === "wide"} />
                      <span className="cr-ep-play" data-on={on ? "" : undefined} aria-hidden="true">
                        <Icon name={on ? "pause" : "play"} />
                      </span>
                    </button>
                    <div className="cr-ep-meta">
                      <span className="cr-ep-show">
                        {sh.title}
                        {on ? (
                          <span className="cr-eq" aria-hidden="true">
                            <i />
                            <i />
                            <i />
                          </span>
                        ) : null}
                      </span>
                      <span className="cr-ep-title">{ep.title}</span>
                      <span className="cr-ep-when cr-mono">
                        {ep.date}, {fmtDuration(ep.minutes)}
                      </span>
                    </div>
                  </li>
                )
              })
            ) : (
              <li className="cr-empty">{T.emptyArchive}</li>
            )}
          </ul>
        </section>
      ) : null}

      {SP ? (
        <section className="cr-sec" data-sec="support" aria-labelledby={uid + "-sup"} style={{ paddingTop: 0 }}>
          <div className="cr-support cr-rv">
            <div className="cr-sup-l">
              <h2 className="cr-h2" id={uid + "-sup"}>
                <span className="cr-sr">{SP.title}</span>
                <Glyphs text={SP.title} wrap />
              </h2>
              <p className="cr-sec-t">{SP.text}</p>
              <div className="cr-seg" role="group" aria-label="How often">
                <button type="button" aria-pressed={cadence === "monthly"} onClick={() => setCadence("monthly")}>
                  {T.monthly}
                </button>
                <button type="button" aria-pressed={cadence === "once"} onClick={() => setCadence("once")}>
                  {T.once}
                </button>
              </div>
            </div>
            <div className="cr-sup-r">
              {sState === "done" ? (
                <div className="cr-sup-done" role="status">
                  <b>{SP.doneTitle.replace("{tier}", tier ? tier.name : SP.fallbackTier)}</b>
                  <p>
                    {cur$}
                    {amount} {cadence === "monthly" ? T.perMonth : T.perOnce}. {SP.doneText}
                  </p>
                  <button type="button" className="cr-btn cr-line" style={{ alignSelf: "flex-start" }} onClick={() => setSState("idle")}>
                    {T.changeAmount}
                  </button>
                </div>
              ) : (
                <>
                  <div className="cr-amount">
                    <span className="cr-sr">{cur$ + amount}</span>
                    <Glyphs text={cur$ + amount} />
                    <span className="cr-amount-u" aria-hidden="true">
                      <b>{tier ? tier.name : SP.fallbackTier}</b>
                      {cadence === "monthly" ? T.perMonth : T.perOnce}
                    </span>
                  </div>
                  <ul className="cr-perks" aria-label="What you get">
                    {(perks.length ? perks : [SP.fallbackPerk]).map((p) => (
                      <li key={p}>
                        <Icon name="check" />
                        {p}
                      </li>
                    ))}
                  </ul>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
                    <button type="button" className="cr-btn cr-solid" onClick={give} disabled={sState === "busy"}>
                      {sState === "busy" ? T.sending : T.give + " " + cur$ + amount + " " + (cadence === "monthly" ? T.perMonth : T.perOnce)}
                      <Icon name="arrow" />
                    </button>
                    {sState === "error" ? (
                      <span className="cr-perr" role="alert">
                        {T.sendError}
                      </span>
                    ) : null}
                  </div>
                </>
              )}
            </div>
            <div
              className="cr-dial"
              ref={dialRef}
              role="slider"
              tabIndex={0}
              aria-label={cadence === "monthly" ? "Monthly amount" : "Amount"}
              aria-valuemin={smin}
              aria-valuemax={smax}
              aria-valuenow={amount}
              aria-valuetext={cur$ + amount + (tier ? ", " + tier.name : "")}
              data-drag={dragging ? "" : undefined}
              onKeyDown={(e) => {
                const v = nextAmount(amount, e.key, smin, smax)
                if (v !== amount || ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"].indexOf(e.key) > -1) {
                  e.preventDefault()
                  setAmount(v)
                  if (sState !== "idle" && sState !== "busy") setSState("idle")
                }
              }}
              onPointerDown={(e) => {
                ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
                setDragging(true)
                dialAt(e.clientX)
              }}
              onPointerMove={(e) => {
                if (dragging) dialAt(e.clientX)
              }}
              onPointerUp={() => setDragging(false)}
              onPointerCancel={() => setDragging(false)}
            >
              {SP.tiers.map((t) => (
                <span
                  key={t.name}
                  className="cr-mark"
                  data-on={tier && tier.name === t.name ? "" : undefined}
                  data-edge={pct(clamp(t.amount, smin, smax)) < 8 ? "start" : pct(clamp(t.amount, smin, smax)) > 92 ? "end" : undefined}
                  style={{ left: pct(clamp(t.amount, smin, smax)) + "%" }}
                  aria-hidden="true"
                >
                  <span>{t.name}</span>
                  <i />
                </span>
              ))}
              <div className="cr-dial-scale" aria-hidden="true">
                {Array.from({ length: smax - smin + 1 }, (_, k) => smin + k).map((v) => (
                  <React.Fragment key={v}>
                    <span className="cr-tick" data-major={v % 5 === 0 || v === smin || v === smax ? "" : undefined} style={{ left: pct(v) + "%" }} />
                    {v % 5 === 0 || v === smin || v === smax ? (
                      <span className="cr-tick-n cr-mono" data-minor={v === smin || v === smax || v % 10 === 0 ? undefined : ""} style={{ left: pct(v) + "%" }}>
                        {cur$ + v}
                      </span>
                    ) : null}
                  </React.Fragment>
                ))}
                <span className="cr-needle" style={{ left: pct(amount) + "%" }} />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {FT ? (
        <footer className="cr-foot">
          <div className="cr-foot-word" aria-hidden="true">
            <MeterWord word={masthead} redAt={redAt} seg={P.segment} gap={P.gap} register={register} />
          </div>
          <div className="cr-foot-grid">
            <form className="cr-news" onSubmit={subscribe} noValidate>
              <h3>{FT.newsletterTitle}</h3>
              <p>{FT.newsletterText}</p>
              {nState === "done" ? (
                <p className="cr-msg" role="status">
                  {FT.successText}
                </p>
              ) : (
                <>
                  <label htmlFor={uid + "-email"}>{T.emailLabel}</label>
                  <div className="cr-news-row">
                    <input
                      id={uid + "-email"}
                      className="cr-input"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        if (nState === "invalid" || nState === "error") setNState("idle")
                      }}
                      aria-invalid={nState === "invalid"}
                      aria-describedby={uid + "-emsg"}
                    />
                    <button type="submit" className="cr-btn cr-solid" disabled={nState === "busy"}>
                      {nState === "busy" ? T.subscribing : T.subscribe}
                    </button>
                  </div>
                  <p className="cr-msg" id={uid + "-emsg"} data-bad={nState === "invalid" || nState === "error" ? "" : undefined} role={nState === "invalid" || nState === "error" ? "alert" : undefined}>
                    {nState === "invalid" ? T.emailInvalid : nState === "error" ? T.sendError : ""}
                  </p>
                </>
              )}
            </form>
            {FT.columns.map((c) => (
              <nav key={c.title} aria-label={c.title}>
                <h3>{c.title}</h3>
                <ul>
                  {c.links.map((l) => (
                    <li key={l.label}>
                      <a href={l.href || "#"} onClick={go(l.href)}>
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
            <div>
              <h3>{FT.addressTitle}</h3>
              <address>
                {FT.address.map((a) => (
                  <span key={a} style={{ display: "block" }}>
                    {a}
                  </span>
                ))}
                {FT.email ? <a href={"mailto:" + FT.email}>{FT.email}</a> : null}
              </address>
            </div>
          </div>
          <div className="cr-legal">
            <span>
              © {new Date().getFullYear()} {FT.legal}
            </span>
            <span className="cr-mono">
              {ST.frequency ? ST.frequency + " FM, " : ""}
              {ST.city}
            </span>
          </div>
        </footer>
      ) : null}

      <div className="cr-dock" data-on={dockOn ? "" : undefined} aria-hidden={!dockOn}>
        <div className="cr-dock-in">
          <MeterWord word={ST.callsign.toUpperCase()} redAt={-1} seg={P.segment} gap={P.gap} register={register} />
          <div className="cr-dock-t">
            <b>{sourceTitle}</b>
            <span>{sourceLine}</span>
          </div>
          {source.kind === "episode" ? (
            <button type="button" className="cr-btn cr-quiet" tabIndex={dockOn ? 0 : -1} onClick={() => start({ kind: "live" })}>
              <span>{T.backToLive}</span>
            </button>
          ) : null}
          <button type="button" className="cr-dock-p" tabIndex={dockOn ? 0 : -1} onClick={() => (playing ? stop() : start(source))} aria-label={playing ? "Pause" : "Play"}>
            <Icon name={playing ? "pause" : "play"} />
          </button>
          <button
            type="button"
            className="cr-iconbtn"
            tabIndex={dockOn ? 0 : -1}
            onClick={() => {
              stop()
              setDocked(false)
            }}
            aria-label={T.closePlayer}
          >
            <Icon name="close" />
          </button>
          {dockOn ? <DockProgress audio={audioRef} played={played} source={source} live={prog} /> : null}
        </div>
      </div>
      <p className="cr-sr" aria-live="polite">
        {said}
      </p>
    </div>
  )
}

// Declared after the JSX: the 21st CLI tokenizer hangs on generics before it.
export type CrLabelsInput = { [K in keyof CrLabels]?: string }
