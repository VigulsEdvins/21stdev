"use client"

// Kamm Trek Landing: a complete landing page for a company that runs guided
// hut-to-hut treks, drawn as a Swiss topographic map come to life.
//
// The hero is a relief model of the whole trek. A height field is generated
// for the range, lit by a low golden-hour sun (alpenglow after dark), hazed
// with distance, and rendered from high above the valley with the contour
// lines draped over it, the way a museum relief is painted. The trail runs
// over the model in waymark red, and every hut on it is a pin you can press.
//
// The same height field is then printed flat, in the manner of a Swiss map
// sheet: hypsometric tint, warm light from the north-west, cool blue shadow,
// brown and glacier-blue contours. Under that map sits the day-by-day height
// profile. Move along the profile (pointer, touch or arrow keys) and a walker
// moves along the trail on the map, while the day's distance, ascent, hut and
// walking time update beside it. The map language carries on into the huts
// (each one shown on its own map excerpt), the legend of what is included, the
// departures and booking form, the hut-book reviews with their stamps, and the
// footer, which is the collar of the map sheet.
//
// Every word, stage, hut, departure, guide, review, question, colour preset
// and the terrain seed are props. All art is computed here on a 2D canvas, so
// nothing loads at runtime and the page renders the same in a software GPU.
import * as React from "react"

export type KammPreset = "summer" | "winter"

export type KammLink = { label: string; href?: string }

export type KammPeak = { name: string; at?: [number, number] }

/** Where the trek starts: a village in the valley. `at` is the map position, 0..1 from the north-west corner. */
export type KammPlace = { name: string; alt: number; at: [number, number] }

/** One day of walking, ending at a hut (or the final village). */
export type KammStage = {
  /** Where the day ends, e.g. "Grathütte". */
  to: string
  /** Altitude of the hut or village, in metres. */
  alt: number
  /** Map position of the hut, 0..1 from the north-west corner. */
  at: [number, number]
  km: number
  /** Walking time as signposts write it, e.g. "5 h 40 min". */
  hours: string
  /** Altitudes sampled evenly along the day. The first and last are pinned to the previous stop and this one. */
  profile: number[]
  /** The day in a few words, e.g. "Over the Fuorcla Rotgrat". */
  title: string
  text: string
  /** Where you sleep, e.g. "Rooms of 4, hot shower". Leave out for the final village. */
  sleep?: string
  /** Your duffel is waiting at this hut. */
  duffel?: boolean
  /** Where the hut sits in the hero photo, [x, y] as fractions of the photo itself (crop-safe). Only used with `hero.image`. */
  heroAt?: [number, number]
  /** A photo of the hut. Without it the hut is shown on its own map excerpt. */
  image?: string
  imageAlt?: string
}

export type KammDeparture = {
  id: string
  /** First day, ISO date "2027-07-04". */
  start: string
  guide: string
  capacity: number
  booked: number
  price: number
  /** A short label, e.g. "Larch week". */
  note?: string
}

export type KammHoldRequest = { departure: KammDeparture; people: number; name: string; email: string }

export type KammLegendItem = {
  symbol: "hut" | "guide" | "bag" | "meal" | "cable" | "rope" | "bus" | "shield"
  title: string
  text: string
}

export type KammGuide = { name: string; role: string; text: string; image?: string; imageAlt?: string }

export type KammQuote = {
  quote: string
  name: string
  from: string
  /** Hut whose stamp goes on the entry. */
  hut: string
  alt?: number
  /** Date as written in the hut book, e.g. "14.7.2026". */
  date: string
}

export type KammFaq = { q: string; a: string }

/** Every piece of interface copy, for another language or another kind of trip. `{n}`-style tokens are filled in. */
export type KammLabels = {
  skip?: string
  menu?: string
  close?: string
  distance?: string
  ascent?: string
  highest?: string
  days?: string
  /** "Day {n} of {total}" */
  dayOf?: string
  /** "Day" in the tabs and the profile */
  day?: string
  up?: string
  down?: string
  duffelWaiting?: string
  /** "End of the trek, {alt} m." */
  end?: string
  night?: string
  duffelHere?: string
  /** "on the map, 1:25 000." after the hut's name, when it is shown on a map excerpt */
  mapNote?: string
  /** "Night {n}, after {hours} of walking." */
  hutCaption?: string
  notIncluded?: string
  allMonths?: string
  /** "{weekday}, with {guide}" */
  withGuide?: string
  placeLeft?: string
  /** "{n} places left" */
  placesLeft?: string
  full?: string
  /** "{n} held for you" on a departure you just held */
  heldRow?: string
  holdTitle?: string
  waitTitle?: string
  /** What the party is called: walkers, skiers, riders. */
  people?: string
  nameField?: string
  emailField?: string
  holdOne?: string
  /** "Hold {n} places" */
  holdMany?: string
  waitButton?: string
  sending?: string
  errName?: string
  errEmail?: string
  errSend?: string
  fine?: string
  heldTitle?: string
  /** "{places} on {dates} with {guide} {are} yours. The deposit link is on its way to {email}." */
  heldText?: string
  waitDoneTitle?: string
  /** "We will email {email} the moment {places} open up on {dates}." */
  waitText?: string
  holdAnother?: string
  /** "Anything else? Write to" ... "A guide answers, usually the same day." */
  askBefore?: string
  askAfter?: string
  /** "The next group leaves {start} on {date}." */
  nextGroup?: string
  noNext?: string
  disclaimer?: string
}

export type KammTrekLandingProps = {
  /** Interface copy: labels, buttons, form fields, messages. */
  labels?: KammLabels
  brand?: string
  /** Shown next to the brand, e.g. "Hut treks". */
  tagline?: string
  nav?: KammLink[]
  /** Hero height; the relief fills it. A definite length, never a percentage. */
  height?: string
  /** "summer" is golden light on green valleys; "winter" is snow to the valley floor. */
  preset?: KammPreset
  /** "system" follows the host's `.dark` class, then the OS. */
  theme?: "system" | "light" | "dark"
  themeToggle?: boolean
  /** Waymark colour for the trail and the main buttons. */
  accent?: string
  /** Moves every mountain. Any integer gives a different range. */
  seed?: number
  /** Metres between contours on the printed map. */
  contourInterval?: number
  hero?: {
    title?: string
    text?: string
    cta?: string
    secondary?: string
    /** A photo for the hero instead of the generated relief. Place the pins with each stage's `heroAt`. */
    image?: string
    imageAlt?: string
    /** Over a photo: the trail as points, each [x, y] as fractions of the photo (0..1). */
    trail?: [number, number][]
    /** A live note pinned to the trail, e.g. where a group is tonight. Set to null to hide. */
    live?: { stage: number; label: string } | null
  }
  route?: {
    title?: string
    text?: string
    /** Name of the trek, shown on the map. */
    name?: string
    start?: KammPlace
    stages?: KammStage[]
    /**
     * Summit names. A plain name goes on the next highest summit near the route; give
     * `at` to pin a name near a map position (it snaps to the top of that summit).
     */
    peaks?: (string | KammPeak)[]
  }
  huts?: { title?: string; text?: string }
  included?: {
    title?: string
    text?: string
    /** Big number in the statement, e.g. "6 kg". */
    figure?: string
    items?: KammLegendItem[]
    excluded?: string[]
  }
  departures?: {
    title?: string
    text?: string
    currency?: string
    items?: KammDeparture[]
    /** Called when someone holds places. Return false (or a promise of false) to show an error. */
    onHold?: KammHoldHandler
  }
  reviews?: { title?: string; items?: KammQuote[] }
  guides?: { title?: string; items?: KammGuide[] }
  faq?: { title?: string; items?: KammFaq[] }
  footer?: {
    title?: string
    note?: string
    email?: string
    phone?: string
    address?: string[]
    links?: KammLink[]
  }
}

// #region content
const DEFAULT_START: KammPlace = { name: "Valpiana", alt: 1180, at: [0.5, 0.93] }

const DEFAULT_STAGES: KammStage[] = [
  {
    to: "Rifugio Ronc",
    alt: 2105,
    at: [0.32, 0.56],
    km: 11.2,
    hours: "4 h 50 min",
    profile: [1180, 1320, 1515, 1740, 1905, 2180, 2105],
    title: "Out of the valley",
    text: "Larch forest, then open pasture. A steady first climb, with lunch at the Alp Ronc cheese dairy and a shower before dinner.",
    sleep: "Rooms of 4, hot shower, wine from the valley",
    duffel: true,
  },
  {
    to: "Chamanna Lej Alv",
    alt: 2475,
    at: [0.2, 0.5],
    km: 13.6,
    hours: "5 h 30 min",
    profile: [2105, 2290, 2460, 2380, 2240, 2395, 2610, 2475],
    title: "The balcony path",
    text: "A long traverse high above the valley, past three tarns, to a stone hut on the shore of a milky glacier lake.",
    sleep: "Dorm of 10, lake swim, solar shower",
  },
  {
    to: "Grathütte",
    alt: 2912,
    at: [0.4, 0.41],
    km: 9.8,
    hours: "5 h 40 min",
    profile: [2475, 2560, 2740, 2905, 3048, 2980, 2912],
    title: "Over the Fuorcla Rotgrat",
    text: "The big day. Up the moraine, over the pass at 3,048 m on a short fixed rope, then down to the highest hut of the week.",
    sleep: "Dorm of 12, no shower, the best sunset of the trip",
  },
  {
    to: "Rifugio Bocchetta",
    alt: 2340,
    at: [0.6, 0.4],
    km: 12.4,
    hours: "5 h",
    profile: [2912, 2990, 2850, 2620, 2700, 2480, 2410, 2340],
    title: "Along the crest",
    text: "With the glacier on your left for the whole morning, then a long scree descent to a hut with a sunny terrace.",
    sleep: "Rooms of 2 and 4, hot shower",
    duffel: true,
  },
  {
    to: "Berghaus Sura",
    alt: 2180,
    at: [0.77, 0.43],
    km: 14.1,
    hours: "5 h 20 min",
    profile: [2340, 2510, 2650, 2440, 2300, 2420, 2290, 2180],
    title: "Two small passes",
    text: "The best view back along the whole route. Anyone who wants a rest day can take the cable car straight to the hut.",
    sleep: "Rooms of 2, wood-fired sauna",
    duffel: true,
  },
  {
    to: "Sankt Alder",
    alt: 1310,
    at: [0.78, 0.54],
    km: 13.3,
    hours: "4 h 30 min",
    profile: [2180, 2260, 2050, 1840, 1620, 1450, 1310],
    title: "Down to the post bus",
    text: "Through the high pastures to Sankt Alder, a last coffee on the square, and the 15:40 post bus back to Valpiana.",
  },
]

const DEFAULT_PEAKS = ["Piz Rotgrat", "Il Corn", "Piz Lavèr", "Muot Alv", "Sasso Nero", "Piz Ault"]

const DEFAULT_LEGEND: KammLegendItem[] = [
  { symbol: "guide", title: "A mountain guide", text: "IFMGA certified, with you every step, and never more than 10 walkers to one guide." },
  { symbol: "hut", title: "Five nights in huts", text: "Booked and paid, with dinner, breakfast and a packed lunch every day." },
  { symbol: "bag", title: "Your duffel, sent ahead", text: "It meets you on nights 1, 4 and 5, where a cable car or a road reaches the hut." },
  { symbol: "rope", title: "Kit for the pass", text: "Harness and helmet for the fixed rope on day 3. Bring your own if you prefer." },
  { symbol: "cable", title: "Cable cars and lifts", text: "Every ride on the route, including the bad-weather variant." },
  { symbol: "bus", title: "The post bus back", text: "Sankt Alder to Valpiana on the last afternoon, so you finish where you parked." },
]

const DEFAULT_EXCLUDED = ["Travel to Valpiana", "Drinks at the huts", "Travel insurance with mountain rescue", "Single-room supplement, CHF 260"]

function iso(y: number, m: number, d: number) {
  return y + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0")
}

const DEFAULT_DEPARTURES: KammDeparture[] = [
  [6, 27, "Anna Caduff", 3, ""],
  [7, 4, "Marco Bezzola", 6, ""],
  [7, 11, "Anna Caduff", 10, ""],
  [7, 18, "Lea Tschudi", 8, ""],
  [7, 25, "Marco Bezzola", 9, ""],
  [8, 1, "Anna Caduff", 5, "Swiss national day at the hut"],
  [8, 8, "Lea Tschudi", 10, ""],
  [8, 15, "Marco Bezzola", 7, ""],
  [8, 22, "Anna Caduff", 4, ""],
  [8, 29, "Lea Tschudi", 6, ""],
  [9, 5, "Marco Bezzola", 2, ""],
  [9, 12, "Lea Tschudi", 1, "Larch week"],
].map(([m, d, guide, booked, note], i) => ({
  id: "rg27-" + (i + 1),
  start: iso(2027, m as number, d as number),
  guide: guide as string,
  capacity: 10,
  booked: booked as number,
  price: (m as number) === 9 ? 2380 : 2480,
  note: (note as string) || undefined,
}))

const DEFAULT_REVIEWS: KammQuote[] = [
  {
    quote: "Day three is hard and nobody pretends otherwise. Anna had us over the pass by eleven and sitting in the sun at Grathütte by two.",
    name: "Ruth M.",
    from: "Edinburgh",
    hut: "Grathütte",
    alt: 2912,
    date: "14.7.2026",
  },
  {
    quote: "My fourth hut trek and the first where I never once wondered where we would sleep or what we would eat.",
    name: "Daniel K.",
    from: "Munich",
    hut: "Rifugio Bocchetta",
    alt: 2340,
    date: "6.8.2026",
  },
  {
    quote: "We booked it for my father's seventieth. He walked every metre and has already asked about the ski version.",
    name: "Sofia R.",
    from: "Milan",
    hut: "Berghaus Sura",
    alt: 2180,
    date: "17.9.2026",
  },
]

const DEFAULT_GUIDES: KammGuide[] = [
  { name: "Anna Caduff", role: "IFMGA guide since 2011", text: "Grew up below the Rotgrat and leads most July groups. Speaks German, Italian and English." },
  { name: "Marco Bezzola", role: "Guide, former warden at Grathütte", text: "Knows every hut kitchen by name, and which one makes the best capuns." },
  { name: "Lea Tschudi", role: "Guide and ski instructor", text: "Takes the late season, when the larches turn and the huts are quiet." },
]

const DEFAULT_FAQ: KammFaq[] = [
  { q: "How fit do I need to be?", a: "You should be happy walking six hours with about 1,000 m of climbing, several days in a row. Day 3 crosses a 3,048 m pass with a short fixed rope. No climbing experience is needed, but you should not mind a steep drop beside the path." },
  { q: "What happens in bad weather?", a: "Your guide decides each morning. Every stage has a lower variant, and on day 3 a cable car route avoids the pass entirely, so the trek goes ahead in almost any summer weather." },
  { q: "Can I have a private room?", a: "Rifugio Ronc, Rifugio Bocchetta and Berghaus Sura have rooms for two. The other huts are dorms. The single-room supplement of CHF 260 covers the three nights where a room exists." },
  { q: "What do I carry?", a: "A day pack of about 6 kg: water, layers, lunch and a sleeping-bag liner. Your duffel goes ahead to the huts on nights 1, 4 and 5." },
  { q: "How do I get to Valpiana?", a: "By train to Chur, then the 09:12 post bus up the valley. We meet at the Valpiana bus stop at 10:40 on the first day." },
  { q: "What if I need to cancel?", a: "Up to 60 days before, we refund everything except the CHF 500 deposit. After that we refund half, or move you to another departure once, free." },
]

/** The light in the hero for each preset, by day and by night. */
const SCENES: { [k: string]: KmmScene } = {
  "summer-day": {
    skyTop: "#5f86b0", skyMid: "#a9bfd2", skyLow: "#f3cfa4", haze: "#e8cfb4", hazeKm: 22,
    sunAz: 258, sunEl: 13, sun: [1.45, 1.1, 0.75], ambient: [0.26, 0.33, 0.48],
    valley: "#4f6a3c", meadow: "#8c9a5a", rock: "#9a9085", snow: "#f4f6f8", snowLine: 2950,
    contour: "#5a3a22", contourAlpha: 0.3, glow: 0.7,
  },
  "summer-night": {
    skyTop: "#0d1729", skyMid: "#2f3557", skyLow: "#8f6a78", haze: "#4a4565", hazeKm: 13,
    sunAz: 272, sunEl: 5, sun: [1.45, 0.66, 0.62], ambient: [0.2, 0.23, 0.38],
    valley: "#5c6e45", meadow: "#93975f", rock: "#9a9085", snow: "#f4f6f8", snowLine: 2950,
    contour: "#1a1830", contourAlpha: 0.3, glow: 0.8,
  },
  "winter-day": {
    skyTop: "#3f74b3", skyMid: "#9dbcd9", skyLow: "#e6eef4", haze: "#d9e4ee", hazeKm: 26,
    sunAz: 200, sunEl: 21, sun: [1.25, 1.18, 1.08], ambient: [0.42, 0.5, 0.66],
    valley: "#e9eef2", meadow: "#eef2f5", rock: "#7d7a78", snow: "#f6f8fa", snowLine: 1250,
    contour: "#2c4a6e", contourAlpha: 0.1, glow: 0.35,
  },
  "winter-night": {
    skyTop: "#060b17", skyMid: "#1b2a48", skyLow: "#6f7fa6", haze: "#28365a", hazeKm: 15,
    sunAz: 120, sunEl: 24, sun: [0.55, 0.62, 0.85], ambient: [0.1, 0.13, 0.22],
    valley: "#e9eef2", meadow: "#eef2f5", rock: "#6d6a68", snow: "#f6f8fa", snowLine: 1250,
    contour: "#0c1424", contourAlpha: 0.25, glow: 0.45,
  },
}

/** How the flat map is printed for each preset, on paper and on a dark sheet. */
const PRINTS: { [k: string]: KmmPrint } = {
  "summer-day": {
    paper: "#f6f7f4", low: "#dfe6cf", high: "#f5f4ee", rock: "#d9d6cf", ice: "#f3f8fc",
    light: "#fbf1c8", shade: "#5f6f93", contour: "#9a6a3c", iceContour: "#3d7fb5", contourAlpha: 0.78, interval: 50, snow: 2950,
  },
  "summer-night": {
    paper: "#121b1e", low: "#1d2a26", high: "#2a3433", rock: "#30353a", ice: "#33465a",
    light: "#5d5a44", shade: "#05070d", contour: "#b98a5c", iceContour: "#7fb3df", contourAlpha: 0.6, interval: 50, snow: 2950,
  },
  "winter-day": {
    paper: "#f4f7fa", low: "#edf2f6", high: "#f7f9fb", rock: "#cfd3d8", ice: "#f1f6fb",
    light: "#fffaf0", shade: "#5a6f97", contour: "#4f7cae", iceContour: "#2f6fae", contourAlpha: 0.7, interval: 50, snow: 1250,
  },
  "winter-night": {
    paper: "#0e1520", low: "#1d2838", high: "#283548", rock: "#2b3038", ice: "#2d3f58",
    light: "#3d4a66", shade: "#04060c", contour: "#8fb3dd", iceContour: "#9cc6ef", contourAlpha: 0.55, interval: 50, snow: 1250,
  },
}
const DEFAULT_LABELS = {
  skip: "Skip to the route",
  menu: "Menu",
  close: "Close",
  distance: "Distance",
  ascent: "Ascent",
  highest: "Highest point",
  days: "Days",
  dayOf: "Day {n} of {total}",
  day: "Day",
  up: "Up",
  down: "Down",
  duffelWaiting: "Your duffel is waiting.",
  end: "End of the trek, {alt} m.",
  night: "Night",
  duffelHere: "Duffel here",
  mapNote: "on the map, 1:25 000.",
  hutCaption: "Night {n}, after {hours} of walking.",
  notIncluded: "Not included",
  allMonths: "All",
  withGuide: "{weekday}, with {guide}",
  placeLeft: "1 place left",
  placesLeft: "{n} places left",
  full: "Full, waitlist open",
  heldRow: "{n} held for you",
  holdTitle: "Hold places",
  waitTitle: "Join the waitlist",
  people: "Walkers",
  nameField: "Name for the hut bookings",
  emailField: "Email",
  holdOne: "Hold 1 place",
  holdMany: "Hold {n} places",
  waitButton: "Join the waitlist",
  sending: "Holding",
  errName: "Add the name the huts should book under.",
  errEmail: "Add an email address like ruth@example.com.",
  errSend: "That did not go through. Nothing was held; try again in a moment.",
  fine: "No payment now. We hold your places for 48 hours and email a deposit link.",
  heldTitle: "Held for 48 hours.",
  heldText: "{places} on {dates} with {guide} {are} yours. The deposit link is on its way to {email}.",
  waitDoneTitle: "You are on the waitlist.",
  waitText: "We will email {email} the moment {places} open up on {dates}.",
  holdAnother: "Hold another departure",
  askBefore: "Anything else? Write to",
  askAfter: "A guide answers, usually the same day.",
  nextGroup: "The next group leaves {start} on {date}.",
  noNext: "Next season's dates open in January.",
  disclaimer: "Relief and contours drawn for illustration. Not for navigation.",
}
// #endregion content

// #region logic
/** Kilometres across the map square (u, v in 0..1). */
const MAP_KM = 14
/** Vertical exaggeration of the relief model in the hero, like a museum relief. */
const EXAG = 1.45

function clamp(x: number, a: number, b: number) {
  return x < a ? a : x > b ? b : x
}
function smoothstep(a: number, b: number, x: number) {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}
function mix(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function hash2(x: number, y: number, s: number) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

const GRAD_X: number[] = []
const GRAD_Y: number[] = []
for (let i = 0; i < 16; i++) {
  GRAD_X.push(Math.cos((i / 16) * 6.283185307 + 0.2))
  GRAD_Y.push(Math.sin((i / 16) * 6.283185307 + 0.2))
}

/** 2D gradient noise, roughly -1..1, smooth and deterministic. */
function noise2(x: number, y: number, s: number) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const g = (ix: number, iy: number, dx: number, dy: number) => {
    const a = (hash2(ix, iy, s) * 16) | 0
    return GRAD_X[a] * dx + GRAD_Y[a] * dy
  }
  const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10)
  const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10)
  const n00 = g(xi, yi, xf, yf)
  const n10 = g(xi + 1, yi, xf - 1, yf)
  const n01 = g(xi, yi + 1, xf, yf - 1)
  const n11 = g(xi + 1, yi + 1, xf - 1, yf - 1)
  return (n00 + (n10 - n00) * u + (n01 - n00) * v + (n00 - n10 - n01 + n11) * u * v) * 1.41
}

/**
 * The mountains, in metres, at map position (u, v). One crest runs east to west
 * across the sheet with sharp ridged spurs falling to valleys on both sides;
 * `seed` moves everything. Defined everywhere, so the hero can look past the sheet.
 */
function terrain(u: number, v: number, seed: number, octaves = 6) {
  const x = u + noise2(u * 1.9, v * 1.9, seed + 11) * 0.08
  const y = v + noise2(u * 1.9 + 5.2, v * 1.9 + 1.3, seed + 12) * 0.08
  const crest = 0.38 + 0.07 * Math.sin(x * 2.3 + seed * 0.37) + 0.03 * Math.sin(x * 5.7 + 1.3 + seed)
  const d = (y - crest) / 0.3
  const massif = Math.exp(-d * d)
  let sum = 0
  let amp = 0.5
  let f = 2.4
  let w = 1
  let norm = 0
  for (let o = 0; o < octaves; o++) {
    let n = 1 - Math.abs(noise2(x * f, y * f, seed + o * 17))
    n = n * n * w
    w = clamp(n * 1.6, 0, 1)
    sum += n * amp
    norm += amp
    amp *= 0.48
    f *= 2.05
  }
  const r = sum / norm
  // the main valley climbs from the south edge to the foot of the crest
  const axis = 0.5 + 0.05 * Math.sin(y * 4.3 + seed) + 0.03 * Math.sin(y * 9.1)
  const vw = 0.075 + 0.07 * clamp(y - crest, 0, 1)
  const q = (x - axis) / vw
  const carve = Math.exp(-q * q) * smoothstep(crest - 0.02, crest + 0.3, y)
  const hgt = 1150 + 760 * massif + 1450 * massif * r + 330 * r + 110 * noise2(x * 1.2, y * 1.2, seed + 99)
  return mix(hgt, 1180 + 140 * r, carve * 0.92)
}

/** Distant ranges seen past the sheet: ridged, lower detail, no valley. */
function farTerrain(u: number, v: number, seed: number) {
  let sum = 0
  let amp = 0.5
  let f = 1.1
  let w = 1
  let norm = 0
  for (let o = 0; o < 4; o++) {
    let n = 1 - Math.abs(noise2(u * f, v * f, seed + 40 + o * 13))
    n = n * n * w
    w = clamp(n * 1.6, 0, 1)
    sum += n * amp
    norm += amp
    amp *= 0.5
    f *= 2.1
  }
  return 900 + 2900 * Math.pow(sum / norm, 1.5)
}

/** A height grid over [u0, u0 + span] x [v0, v0 + span]. */
type KmmGrid = { n: number; u0: number; v0: number; span: number; h: Float32Array }

function makeGrid(n: number, u0: number, v0: number, span: number, seed: number, octaves = 6, distant = false): KmmGrid {
  const g = { n, u0, v0, span, h: new Float32Array(n * n) }
  gridRows(g, 0, n, seed, octaves, distant)
  return g
}

/** Fills rows j0..j1 of a grid; the page calls it in small slices so the main thread stays free. */
function gridRows(g: KmmGrid, j0: number, j1: number, seed: number, octaves = 6, distant = false) {
  const { n, u0, v0, span, h } = g
  for (let j = j0; j < Math.min(n, j1); j++)
    for (let i = 0; i < n; i++) {
      const u = u0 + (i / (n - 1)) * span
      const v = v0 + (j / (n - 1)) * span
      h[j * n + i] = distant ? farTerrain(u, v, seed) : terrain(u, v, seed, octaves)
    }
}

/** Bilinear height at map position, clamped to the grid. */
function sampleH(g: KmmGrid, u: number, v: number) {
  const n = g.n
  const fx = clamp(((u - g.u0) / g.span) * (n - 1), 0, n - 1.001)
  const fy = clamp(((v - g.v0) / g.span) * (n - 1), 0, n - 1.001)
  const i = fx | 0
  const j = fy | 0
  const tx = fx - i
  const ty = fy - j
  const k = j * n + i
  const a = g.h[k]
  const b = g.h[k + 1]
  const c = g.h[k + n]
  const d = g.h[k + n + 1]
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty
}

/** Catmull-Rom height and slope (metres per metre) at a fractional grid position: smooth enough to shade per pixel. */
function cubicAt(g: KmmGrid, fx: number, fy: number, out: { h: number; dx: number; dy: number }) {
  const n = g.n
  fx = clamp(fx, 1, n - 2.001)
  fy = clamp(fy, 1, n - 2.001)
  const i = fx | 0
  const j = fy | 0
  const tx = fx - i
  const ty = fy - j
  const wx0 = ((-tx + 2) * tx - 1) * tx * 0.5
  const wx1 = ((3 * tx - 5) * tx * tx + 2) * 0.5
  const wx2 = ((-3 * tx + 4) * tx + 1) * tx * 0.5
  const wx3 = (tx - 1) * tx * tx * 0.5
  const dx0 = (-3 * tx * tx + 4 * tx - 1) * 0.5
  const dx1 = (9 * tx * tx - 10 * tx) * 0.5
  const dx2 = (-9 * tx * tx + 8 * tx + 1) * 0.5
  const dx3 = (3 * tx * tx - 2 * tx) * 0.5
  const wy0 = ((-ty + 2) * ty - 1) * ty * 0.5
  const wy1 = ((3 * ty - 5) * ty * ty + 2) * 0.5
  const wy2 = ((-3 * ty + 4) * ty + 1) * ty * 0.5
  const wy3 = (ty - 1) * ty * ty * 0.5
  const dy0 = (-3 * ty * ty + 4 * ty - 1) * 0.5
  const dy1 = (9 * ty * ty - 10 * ty) * 0.5
  const dy2 = (-9 * ty * ty + 8 * ty + 1) * 0.5
  const dy3 = (3 * ty * ty - 2 * ty) * 0.5
  let h = 0
  let gx = 0
  let gy = 0
  const H = g.h
  for (let r = 0; r < 4; r++) {
    const row = (j - 1 + r) * n + i - 1
    const a = H[row]
    const b = H[row + 1]
    const c = H[row + 2]
    const d = H[row + 3]
    const sx = a * wx0 + b * wx1 + c * wx2 + d * wx3
    const sdx = a * dx0 + b * dx1 + c * dx2 + d * dx3
    const wy = r === 0 ? wy0 : r === 1 ? wy1 : r === 2 ? wy2 : wy3
    const dy = r === 0 ? dy0 : r === 1 ? dy1 : r === 2 ? dy2 : dy3
    h += sx * wy
    gx += sdx * wy
    gy += sx * dy
  }
  const cell = (g.span * MAP_KM * 1000) / (n - 1)
  out.h = h
  out.dx = gx / cell
  out.dy = gy / cell
  return out
}

/** Unit vector toward a light at azimuth (deg, clockwise from north) and elevation (deg). x east, y south, z up. */
function lightVec(az: number, el: number) {
  const a = (az * Math.PI) / 180
  const e = (el * Math.PI) / 180
  return [Math.sin(a) * Math.cos(e), -Math.cos(a) * Math.cos(e), Math.sin(e)]
}

type KmmRGB = [number, number, number]

function hex(c: string): KmmRGB {
  const s = c.replace("#", "")
  const f = s.length === 3 ? s.split("").map((x) => x + x).join("") : s
  return [parseInt(f.slice(0, 2), 16), parseInt(f.slice(2, 4), 16), parseInt(f.slice(4, 6), 16)]
}

/** How a sheet is printed: paper, relief light and shadow, contour inks. */
type KmmPrint = {
  paper: string
  low: string
  high: string
  rock: string
  ice: string
  light: string
  shade: string
  contour: string
  iceContour: string
  contourAlpha: number
  /** Metres between contours; every fifth is an index contour. */
  interval: number
  /** Snow and glacier above this height. */
  snow: number
}

/**
 * Prints one map sheet in the Swiss manner: hypsometric tint, warm light from
 * the north-west and cool shadow, then anti-aliased contours that thin out where
 * the rock is too steep to carry them. Writes RGBA into `out`.
 */
function printSheet(
  out: Uint8ClampedArray,
  W: number,
  H: number,
  g: KmmGrid,
  view: { u0: number; v0: number; span: number },
  p: KmmPrint,
  scale = 1,
  y0 = 0,
  y1 = H,
) {
  const low = hex(p.low)
  const high = hex(p.high)
  const rock = hex(p.rock)
  const ice = hex(p.ice)
  const lit = hex(p.light)
  const shd = hex(p.shade)
  const con = hex(p.contour)
  const icon = hex(p.iceContour)
  const L = lightVec(315, 42)
  const flat = L[2]
  const s = { h: 0, dx: 0, dy: 0 }
  const metresPerPx = (view.span * MAP_KM * 1000) / W
  const k = (g.n - 1) / g.span
  const iv = p.interval
  for (let y = y0; y < Math.min(H, y1); y++) {
    for (let x = 0; x < W; x++) {
      const u = view.u0 + ((x + 0.5) / W) * view.span
      const v = view.v0 + ((y + 0.5) / W) * view.span
      cubicAt(g, (u - g.u0) * k, (v - g.v0) * k, s)
      const gx = s.dx
      const gy = s.dy
      const inv = 1 / Math.sqrt(gx * gx + gy * gy + 1)
      const nx = -gx * inv
      const ny = -gy * inv
      const nz = inv
      const slope = Math.sqrt(s.dx * s.dx + s.dy * s.dy)
      const lamb = nx * L[0] + ny * L[1] + nz * L[2]
      // hypsometric tint, rock on steep ground, ice above the snow line
      const t = smoothstep(1300, 3100, s.h)
      let r = mix(low[0], high[0], t)
      let gg = mix(low[1], high[1], t)
      let b = mix(low[2], high[2], t)
      const rk = smoothstep(0.75, 1.2, slope) * smoothstep(1700, 2300, s.h)
      r = mix(r, rock[0], rk)
      gg = mix(gg, rock[1], rk)
      b = mix(b, rock[2], rk)
      const ic = smoothstep(p.snow - 60, p.snow + 60, s.h) * (1 - smoothstep(0.7, 1.05, slope))
      r = mix(r, ice[0], ic)
      gg = mix(gg, ice[1], ic)
      b = mix(b, ice[2], ic)
      // Imhof light: warm where the slope faces the light, cool blue in shade, stronger higher up
      const contrast = 0.75 + 0.5 * t
      const dl = (lamb - flat) * contrast
      if (dl < 0) {
        const a = clamp(-dl * 0.9, 0, 0.6)
        r = r * mix(1, shd[0] / 255, a)
        gg = gg * mix(1, shd[1] / 255, a)
        b = b * mix(1, shd[2] / 255, a)
      } else {
        const a = clamp(dl * 0.9, 0, 0.5)
        r = mix(r, lit[0], a)
        gg = mix(gg, lit[1], a)
        b = mix(b, lit[2], a)
      }
      // contours: distance to the nearest contour in metres, over metres per pixel
      const grad = Math.max(slope * metresPerPx, 1e-4)
      const fr = s.h / iv
      const dist = Math.abs(fr - Math.round(fr)) * iv
      const index = Math.round(fr) % 5 === 0
      const width = (index ? 0.95 : 0.55) * scale
      const spacing = iv / grad
      let ca = (1 - smoothstep(width * 0.5, width * 0.5 + 0.9, dist / grad)) * p.contourAlpha * smoothstep(2.6, 5, spacing)
      if (index) ca = Math.min(1, ca * 1.35)
      const cc = ic > 0.5 ? icon : con
      r = mix(r, cc[0], ca)
      gg = mix(gg, cc[1], ca)
      b = mix(b, cc[2], ca)
      const o = (y * W + x) * 4
      out[o] = r
      out[o + 1] = gg
      out[o + 2] = b
      out[o + 3] = 255
    }
  }
  return out
}

/** The light in the hero: time of day and season. */
type KmmScene = {
  skyTop: string
  skyMid: string
  skyLow: string
  haze: string
  hazeKm: number
  sunAz: number
  sunEl: number
  sun: KmmRGB
  ambient: KmmRGB
  /** Albedo by ground: valley, meadow, rock, snow. */
  valley: string
  meadow: string
  rock: string
  snow: string
  snowLine: number
  contour: string
  contourAlpha: number
  glow: number
}

/** Shaded colours for every grid cell under the scene's light, with cast shadows (computed once). */
function shadeGrid(g: KmmGrid, sc: KmmScene, seed: number) {
  const out = new Float32Array(g.n * g.n * 3)
  shadeRows(g, sc, seed, out, 0, g.n)
  return out
}

/** Shades rows j0..j1 of a grid into `out` (three floats per cell). */
function shadeRows(g: KmmGrid, sc: KmmScene, seed: number, out: Float32Array, j0: number, j1: number) {
  const n = g.n
  const L = lightVec(sc.sunAz, sc.sunEl)
  const cell = (g.span * MAP_KM * 1000) / (n - 1)
  const val = hex(sc.valley)
  const mea = hex(sc.meadow)
  const rok = hex(sc.rock)
  const sno = hex(sc.snow)
  const tanEl = Math.tan((sc.sunEl * Math.PI) / 180)
  const hl = Math.hypot(L[0], L[1]) || 1
  const sx = L[0] / hl
  const sy = L[1] / hl
  for (let j = j0; j < Math.min(n, j1); j++) {
    for (let i = 0; i < n; i++) {
      const k = j * n + i
      const h = g.h[k]
      const hx = (g.h[j * n + Math.min(n - 1, i + 1)] - g.h[j * n + Math.max(0, i - 1)]) / (2 * cell)
      const hy = (g.h[Math.min(n - 1, j + 1) * n + i] - g.h[Math.max(0, j - 1) * n + i]) / (2 * cell)
      const gx = hx * EXAG
      const gy = hy * EXAG
      const inv = 1 / Math.sqrt(gx * gx + gy * gy + 1)
      const nx = -gx * inv
      const ny = -gy * inv
      const nz = inv
      const slope = Math.sqrt(hx * hx + hy * hy)
      // cast shadow: march toward the light across the grid
      let lit = 1
      if (sc.sunEl < 60) {
        let px = i
        let py = j
        let ray = h * EXAG
        const rise = tanEl * cell
        for (let st = 0; st < 140; st++) {
          px += sx
          py += sy
          ray += rise
          if (px < 0 || py < 0 || px > n - 1 || py > n - 1) break
          const th = g.h[(py | 0) * n + (px | 0)] * EXAG
          if (th > ray) {
            lit = Math.min(lit, clamp(1 - (th - ray) / 60, 0, 1))
            if (lit === 0) break
          }
        }
      }
      const u = g.u0 + (i / (n - 1)) * g.span
      const v = g.v0 + (j / (n - 1)) * g.span
      const nn = noise2(u * 40, v * 40, seed + 5) * 0.5 + 0.5
      const grain = 0.86 + 0.14 * (noise2(u * 260, v * 260, seed + 6) * 0.5 + 0.5) + 0.08 * noise2(u * 700, v * 700, seed + 8)
      // ground
      const tm = smoothstep(1350, 2050, h + nn * 220)
      let r = mix(val[0], mea[0], tm)
      let gg = mix(val[1], mea[1], tm)
      let b = mix(val[2], mea[2], tm)
      const rk = clamp(smoothstep(0.55, 1.0, slope + nn * 0.25) + smoothstep(2350, 2800, h) * 0.8, 0, 1)
      r = mix(r, rok[0], rk)
      gg = mix(gg, rok[1], rk)
      b = mix(b, rok[2], rk)
      const sn = smoothstep(sc.snowLine - 120, sc.snowLine + 80, h + nn * 260) * (1 - smoothstep(0.85, 1.25, slope))
      r = mix(r, sno[0], sn)
      gg = mix(gg, sno[1], sn)
      b = mix(b, sno[2], sn)
      const d = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]) * lit
      const sky = 0.55 + 0.45 * nz
      const o = k * 3
      out[o] = (r / 255) * grain * (sc.sun[0] * d + sc.ambient[0] * sky)
      out[o + 1] = (gg / 255) * grain * (sc.sun[1] * d + sc.ambient[1] * sky)
      out[o + 2] = (b / 255) * grain * (sc.sun[2] * d + sc.ambient[2] * sky)
    }
  }
  return out
}

type KmmCam = { u: number; v: number; alt: number; yaw: number; fov: number; horizon: number }

/**
 * Renders the relief model seen from the camera (front-to-back height-field
 * spans, one per column), with aerial haze, contour lines draped over the
 * ground, and the sky. Writes RGBA into `out` and the ground distance (metres)
 * of every pixel into `depth`, so overlays can test what is hidden.
 */
function renderVista(
  out: Uint8ClampedArray,
  depth: Float32Array,
  W: number,
  H: number,
  g: KmmGrid,
  shade: Float32Array,
  sc: KmmScene,
  cam: KmmCam,
  far?: KmmGrid,
) {
  const n = g.n
  const M = MAP_KM * 1000
  const focal = W / 2 / Math.tan(((cam.fov / 2) * Math.PI) / 180)
  const hy = H * cam.horizon
  const fx = Math.sin(cam.yaw)
  const fy = -Math.cos(cam.yaw)
  const rx = Math.cos(cam.yaw)
  const ry = Math.sin(cam.yaw)
  const top = hex(sc.skyTop)
  const mid = hex(sc.skyMid)
  const low = hex(sc.skyLow)
  const hz = hex(sc.haze)
  const cn = hex(sc.contour)
  const k = (n - 1) / g.span
  const farRock: KmmRGB = [hex(sc.rock)[0] * (sc.ambient[0] + sc.sun[0] * 0.25), hex(sc.rock)[1] * (sc.ambient[1] + sc.sun[1] * 0.25), hex(sc.rock)[2] * (sc.ambient[2] + sc.sun[2] * 0.25)]
  const farSnow: KmmRGB = [hex(sc.snow)[0] * (sc.ambient[0] + sc.sun[0] * 0.5), hex(sc.snow)[1] * (sc.ambient[1] + sc.sun[1] * 0.5), hex(sc.snow)[2] * (sc.ambient[2] + sc.sun[2] * 0.5)]
  const sunA = (sc.sunAz * Math.PI) / 180
  const ybuf = new Float32Array(W)
  depth.fill(1e9)
  for (let x = 0; x < W; x++) {
    const sxv = (x + 0.5 - W / 2) / focal
    const dx = fx + rx * sxv
    const dy = fy + ry * sxv
    let yb = H
    let z = 40
    let dz = 3
    let lastBand = -1
    let pr = -1
    let pg = 0
    let pb = 0
    while (z < 60000 && yb > 0) {
      const u = cam.u + (dx * z) / M
      const v = cam.v + (dy * z) / M
      const ox = (u - g.u0) * k
      const oy = (v - g.v0) * k
      if (far && (ox < 0 || oy < 0 || ox > n - 1.001 || oy > n - 1.001)) {
        // past the sheet: a coarse grid of distant ranges, flat-lit and lost in haze
        // rise out of the sheet's edge rather than starting as a wall
        const out_ = Math.max(-ox, -oy, ox - (n - 1), oy - (n - 1), 0) / k
        const hEdge = sampleH(g, u, v)
        const h = mix(hEdge, sampleH(far, u, v), smoothstep(0, 0.45, out_))
        const Y = hy + ((cam.alt - h * EXAG) / z) * focal
        if (Y < yb) {
          const fog = clamp(0.4 + (1 - Math.exp(-z / (sc.hazeKm * 1000))) * 0.55 - smoothstep(2600, 3700, h) * 0.22, 0, 0.96)
          const sn = smoothstep(sc.snowLine - 100, sc.snowLine + 300, h)
          const r = mix(mix(farRock[0], farSnow[0], sn), hz[0], fog)
          const gg = mix(mix(farRock[1], farSnow[1], sn), hz[1], fog)
          const b = mix(mix(farRock[2], farSnow[2], sn), hz[2], fog)
          const y0 = Math.max(0, Math.ceil(Y))
          const y1 = Math.min(H, Math.ceil(yb))
          for (let yy = y0; yy < y1; yy++) {
            const o = (yy * W + x) * 4
            out[o] = r
            out[o + 1] = gg
            out[o + 2] = b
            out[o + 3] = 255
            depth[yy * W + x] = z
          }
          yb = Y
        }
        z += dz
        dz = Math.max(3, z * 0.0055)
        continue
      }
      const gx = clamp(ox, 0, n - 1.001)
      const gy = clamp(oy, 0, n - 1.001)
      const i = gx | 0
      const j = gy | 0
      const tx = gx - i
      const ty = gy - j
      const c = j * n + i
      const w00 = (1 - tx) * (1 - ty)
      const w10 = tx * (1 - ty)
      const w01 = (1 - tx) * ty
      const w11 = tx * ty
      const h = g.h[c] * w00 + g.h[c + 1] * w10 + g.h[c + n] * w01 + g.h[c + n + 1] * w11
      const Y = hy + ((cam.alt - h * EXAG) / z) * focal
      const band = Math.floor(h / 100)
      if (Y < yb && yb - Y > 4 && dz > 0.7 && pr >= 0) {
        // a steep face ahead: step back and sample it finer, so it is drawn, not smeared
        dz *= 0.5
        z -= dz
        continue
      }
      if (Y < yb) {
        const c3 = c * 3
        const c3b = (c + 1) * 3
        const c3c = (c + n) * 3
        const c3d = (c + n + 1) * 3
        let r = shade[c3] * w00 + shade[c3b] * w10 + shade[c3c] * w01 + shade[c3d] * w11
        let gg = shade[c3 + 1] * w00 + shade[c3b + 1] * w10 + shade[c3c + 1] * w01 + shade[c3d + 1] * w11
        let b = shade[c3 + 2] * w00 + shade[c3b + 2] * w10 + shade[c3c + 2] * w01 + shade[c3d + 2] * w11
        // close ground gets fine grain (scree, pasture, scrub) that fades with distance
        const near = 1 - smoothstep(5000, 13000, z)
        const grain = near > 0 ? 1 + near * (0.11 * noise2(u * 650, v * 650, 3) + 0.07 * noise2(u * 1900, v * 1900, 4)) : 1
        r = Math.min(1, r * grain) * 255
        gg = Math.min(1, gg * grain) * 255
        b = Math.min(1, b * grain) * 255
        const fog = (1 - Math.exp(-z / (sc.hazeKm * 1000))) * (0.6 + 0.4 * smoothstep(3200, 1200, h))
        r = mix(r, hz[0], fog)
        gg = mix(gg, hz[1], fog)
        b = mix(b, hz[2], fog)
        const y0 = Math.max(0, Math.ceil(Y))
        const y1 = Math.min(H, Math.ceil(yb))
        const line = lastBand >= 0 && band !== lastBand && y1 - y0 < 6 ? sc.contourAlpha * (1 - fog) * (1 - smoothstep(3500, 11000, z)) : 0
        // shade the span from this sample (top) to the last one drawn (bottom), so steep faces do not band
        if (pr < 0) {
          pr = r
          pg = gg
          pb = b
        }
        const span = Math.max(1, y1 - y0)
        for (let yy = y0; yy < y1; yy++) {
          const o = (yy * W + x) * 4
          const a = yy === y0 ? line : 0
          const q = (yy - y0) / span
          out[o] = mix(mix(r, pr, q), cn[0], a)
          out[o + 1] = mix(mix(gg, pg, q), cn[1], a)
          out[o + 2] = mix(mix(b, pb, q), cn[2], a)
          out[o + 3] = 255
          depth[yy * W + x] = z
        }
        pr = r
        pg = gg
        pb = b
        // soften the silhouette's top pixel against what is behind it
        if (y0 > 0 && Y > 0) {
          const cov = y0 - Y
          const o = ((y0 - 1) * W + x) * 4
          out[o] = r
          out[o + 1] = gg
          out[o + 2] = b
          out[o + 3] = Math.round(255 * cov)
        }
        yb = Y
      }
      lastBand = band
      z += dz
      dz = Math.min(Math.max(2, z * 0.003), dz * 1.5)
    }
    ybuf[x] = yb
    // sky: three stops, warmer toward the sun
    const az = Math.atan2(dx, -dy)
    let da = Math.abs(az - sunA)
    if (da > Math.PI) da = 2 * Math.PI - da
    const glow = Math.exp(-da * da * 2.2) * sc.glow
    const yEnd = Math.min(H, Math.ceil(yb))
    for (let yy = 0; yy < yEnd; yy++) {
      const o = (yy * W + x) * 4
      const t = yy / Math.max(1, hy)
      let r: number
      let gg: number
      let b: number
      // one continuous sky: top to mid, mid to the warm band at the horizon, then haze below it
      const q1 = smoothstep(0, 0.82, t)
      const q2 = smoothstep(0.62, 1, t)
      const q3 = smoothstep(0.97, 1.2, t)
      r = mix(mix(mix(top[0], mid[0], q1), low[0], q2), hz[0], q3)
      gg = mix(mix(mix(top[1], mid[1], q1), low[1], q2), hz[1], q3)
      b = mix(mix(mix(top[2], mid[2], q1), low[2], q2), hz[2], q3)
      const gw = glow * smoothstep(0.4, 1, t) * (1 - smoothstep(0.98, 1.15, t)) * 0.6
      r = mix(r, low[0], gw)
      gg = mix(gg, low[1], gw)
      b = mix(b, low[2], gw)
      const a = out[o + 3]
      if (a > 0 && a < 255) {
        const f = a / 255
        out[o] = mix(r, out[o], f)
        out[o + 1] = mix(gg, out[o + 1], f)
        out[o + 2] = mix(b, out[o + 2], f)
      } else {
        out[o] = r
        out[o + 1] = gg
        out[o + 2] = b
      }
      out[o + 3] = 255
    }
  }
  return ybuf
}

/** Screen position and distance of a map point (u, v, metres) from the camera, or null behind it. */
function project(W: number, H: number, cam: KmmCam, u: number, v: number, h: number) {
  const M = MAP_KM * 1000
  const fx = Math.sin(cam.yaw)
  const fy = -Math.cos(cam.yaw)
  const rx = Math.cos(cam.yaw)
  const ry = Math.sin(cam.yaw)
  const px = (u - cam.u) * M
  const py = (v - cam.v) * M
  const z = px * fx + py * fy
  if (z < 50) return null
  const xr = px * rx + py * ry
  const focal = W / 2 / Math.tan(((cam.fov / 2) * Math.PI) / 180)
  return { x: W / 2 + (xr / z) * focal, y: H * cam.horizon + ((cam.alt - h * EXAG) / z) * focal, z }
}
/** A stage's altitudes with its ends pinned to where it starts and finishes. */
function stageProfile(fromAlt: number, st: KammStage) {
  const p = st.profile && st.profile.length >= 2 ? st.profile.slice() : [fromAlt, st.alt]
  p[0] = fromAlt
  p[p.length - 1] = st.alt
  return p
}

/** Ascent, descent, high and low point of one day, rounded to 10 m like a guidebook. */
function stageStats(fromAlt: number, st: KammStage) {
  const p = stageProfile(fromAlt, st)
  let up = 0
  let down = 0
  for (let i = 1; i < p.length; i++) {
    const d = p[i] - p[i - 1]
    if (d > 0) up += d
    else down -= d
  }
  return { up: Math.round(up / 10) * 10, down: Math.round(down / 10) * 10, high: Math.max(...p), low: Math.min(...p) }
}

/** Totals for the whole trek. */
function routeTotals(start: KammPlace, stages: KammStage[]) {
  let km = 0
  let up = 0
  let down = 0
  let high = start.alt
  let prev = start.alt
  for (const st of stages) {
    const s = stageStats(prev, st)
    km += st.km
    up += s.up
    down += s.down
    high = Math.max(high, s.high)
    prev = st.alt
  }
  return { km: Math.round(km * 10) / 10, up, down, high, days: stages.length }
}

/** Kilometre where each stage begins, plus the total at the end. */
function stageStarts(stages: KammStage[]) {
  const out = [0]
  for (const st of stages) out.push(out[out.length - 1] + st.km)
  return out
}

/** Which stage a kilometre falls in, and how far through it (0..1). */
function locate(stages: KammStage[], km: number) {
  const starts = stageStarts(stages)
  const total = starts[starts.length - 1]
  const k = clamp(km, 0, total)
  let i = 0
  while (i < stages.length - 1 && k >= starts[i + 1]) i++
  const len = stages[i].km || 1
  return { i, f: clamp((k - starts[i]) / len, 0, 1) }
}

/** Altitude a fraction of the way through a stage, eased between samples. */
function altAt(fromAlt: number, st: KammStage, f: number) {
  const p = stageProfile(fromAlt, st)
  const x = clamp(f, 0, 1) * (p.length - 1)
  const i = Math.min(p.length - 2, Math.floor(x))
  const t = x - i
  const e = (1 - Math.cos(t * Math.PI)) / 2
  return p[i] + (p[i + 1] - p[i]) * e
}

type KmmTrailPt = { u: number; v: number; stage: number; f: number }

/** The trail on the map: each stage meanders from stop to stop, ends fixed, so it reads as a path, not a ruler line. */
function trailPath(start: KammPlace, stages: KammStage[], seed: number, per = 36) {
  const pts: KmmTrailPt[] = [{ u: start.at[0], v: start.at[1], stage: 0, f: 0 }]
  let a = start.at
  stages.forEach((st, si) => {
    const b = st.at
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const len = Math.hypot(dx, dy) || 1
    const px = -dy / len
    const py = dx / len
    for (let i = 1; i <= per; i++) {
      const t = i / per
      const w = Math.sin(t * Math.PI)
      const off = (noise2(t * 3.1 + si * 7.3, si * 1.7, seed + 31) * 0.55 + noise2(t * 9.7, si * 3.1, seed + 37) * 0.18) * len * 0.22 * w
      pts.push({ u: a[0] + dx * t + px * off, v: a[1] + dy * t + py * off, stage: si, f: t })
    }
    a = b
  })
  return pts
}

/** Point on the trail a fraction of the way through a stage. */
function trailAt(path: KmmTrailPt[], stage: number, f: number) {
  const first = path.findIndex((p) => p.stage === stage)
  const run = [first > 0 ? path[first - 1] : path[0], ...path.filter((p) => p.stage === stage)]
  let total = 0
  const lens = [0]
  for (let i = 1; i < run.length; i++) {
    total += Math.hypot(run[i].u - run[i - 1].u, run[i].v - run[i - 1].v)
    lens.push(total)
  }
  const want = clamp(f, 0, 1) * total
  for (let i = 1; i < run.length; i++) {
    if (lens[i] >= want) {
      const t = (want - lens[i - 1]) / Math.max(1e-9, lens[i] - lens[i - 1])
      return { u: mix(run[i - 1].u, run[i].u, t), v: mix(run[i - 1].v, run[i].v, t) }
    }
  }
  const last = run[run.length - 1]
  return { u: last.u, v: last.v }
}

/** A square map window around the route with a margin, stretched to the frame's aspect (w / h). */
function mapView(points: [number, number][], aspect: number, margin = 0.1) {
  let u0 = 1
  let v0 = 1
  let u1 = 0
  let v1 = 0
  for (const [u, v] of points) {
    u0 = Math.min(u0, u)
    v0 = Math.min(v0, v)
    u1 = Math.max(u1, u)
    v1 = Math.max(v1, v)
  }
  let w = u1 - u0 + margin * 2
  let h = v1 - v0 + margin * 2
  if (w / h < aspect) w = h * aspect
  else h = w / aspect
  const cu = (u0 + u1) / 2
  const cv = (v0 + v1) / 2
  return { u0: cu - w / 2, v0: cv - h / 2, w, h }
}

/** The highest summits on a grid, at least `gap` apart, as map positions with heights. */
function findPeaks(g: KmmGrid, count: number, gap: number, box?: { u0: number; v0: number; w: number; h: number }) {
  const n = g.n
  const cand: { u: number; v: number; h: number }[] = []
  const r = 3
  for (let j = r; j < n - r; j++)
    for (let i = r; i < n - r; i++) {
      const h = g.h[j * n + i]
      let top = true
      for (let y = -r; y <= r && top; y++) for (let x = -r; x <= r; x++) if ((x || y) && g.h[(j + y) * n + i + x] > h) { top = false; break }
      if (!top) continue
      const u = g.u0 + (i / (n - 1)) * g.span
      const v = g.v0 + (j / (n - 1)) * g.span
      if (box && (u < box.u0 + box.w * 0.06 || u > box.u0 + box.w * 0.94 || v < box.v0 + box.h * 0.08 || v > box.v0 + box.h * 0.94)) continue
      cand.push({ u, v, h })
    }
  cand.sort((a, b) => b.h - a.h)
  const out: { u: number; v: number; h: number }[] = []
  for (const c of cand) {
    if (out.length >= count) break
    if (out.every((o) => Math.hypot(o.u - c.u, o.v - c.v) >= gap)) out.push(c)
  }
  return out
}

/**
 * Names the summits once per terrain, independent of the frame, so a name always
 * sits on the same summit with the same height at every screen width.
 */
function resolvePeaks(g: KmmGrid, peaks: (string | KammPeak)[], stops: [number, number][]) {
  const box = mapView(stops, 1, 0.12)
  const auto = findPeaks(g, 40, 0.13, { u0: box.u0, v0: box.v0, w: box.w, h: box.h }).filter((pk) => stops.every((a) => Math.hypot(a[0] - pk.u, a[1] - pk.v) > 0.075))
  const used = new Set()
  const out: { name: string; u: number; v: number; h: number }[] = []
  const n = g.n
  for (const raw of peaks) {
    const pk = typeof raw === "string" ? { name: raw } : raw
    if (pk.at) {
      const ci = Math.round(((pk.at[0] - g.u0) / g.span) * (n - 1))
      const cj = Math.round(((pk.at[1] - g.v0) / g.span) * (n - 1))
      const r = Math.max(2, Math.round((0.035 / g.span) * (n - 1)))
      let best = { i: clamp(ci, 0, n - 1), j: clamp(cj, 0, n - 1), h: -Infinity }
      for (let j = Math.max(0, cj - r); j <= Math.min(n - 1, cj + r); j++)
        for (let i = Math.max(0, ci - r); i <= Math.min(n - 1, ci + r); i++) if (g.h[j * n + i] > best.h) best = { i, j, h: g.h[j * n + i] }
      out.push({ name: pk.name, u: g.u0 + (best.i / (n - 1)) * g.span, v: g.v0 + (best.j / (n - 1)) * g.span, h: best.h })
    } else {
      const next = auto.find((a) => !used.has(a))
      if (!next) continue
      used.add(next)
      out.push({ name: pk.name, u: next.u, v: next.v, h: next.h })
    }
  }
  return out
}

/** "2,912" with the separator the page asks for. */
function fmtNum(n: number, sep = ",") {
  const s = String(Math.round(Math.abs(n)))
  return (n < 0 ? "-" : "") + s.replace(/\B(?=(\d{3})+(?!\d))/g, sep)
}

function fmtKm(km: number) {
  return (Math.round(km * 10) / 10).toFixed(1).replace(/\.0$/, "")
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function parseDay(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number)
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1))
}

/** "27 Jun to 2 Jul", across months and years when it has to. */
function dateRange(isoDate: string, days: number) {
  const a = parseDay(isoDate)
  const b = new Date(a.getTime() + (Math.max(1, days) - 1) * 86400000)
  const same = a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear()
  const left = a.getUTCDate() + (same ? "" : " " + MONTHS[a.getUTCMonth()]) + (a.getUTCFullYear() !== b.getUTCFullYear() ? " " + a.getUTCFullYear() : "")
  return left + " to " + b.getUTCDate() + " " + MONTHS[b.getUTCMonth()]
}

/** "27 Jun". */
function dayMonth(isoDate: string) {
  const a = parseDay(isoDate)
  return a.getUTCDate() + " " + MONTHS[a.getUTCMonth()]
}

function weekday(isoDate: string) {
  return DAYS[parseDay(isoDate).getUTCDay()]
}

function monthKey(isoDate: string) {
  return MONTHS[parseDay(isoDate).getUTCMonth()]
}

function spotsLeft(d: { capacity: number; booked: number }, held = 0) {
  return Math.max(0, d.capacity - d.booked - held)
}

function formatPrice(n: number, currency: string) {
  return currency + " " + fmtNum(n, ",")
}

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim())
}

/** Arrow-key movement through a row of tabs, wrapping. */
function nextIndex(i: number, key: string, n: number) {
  if (key === "ArrowRight" || key === "ArrowDown") return (i + 1) % n
  if (key === "ArrowLeft" || key === "ArrowUp") return (i - 1 + n) % n
  if (key === "Home") return 0
  if (key === "End") return n - 1
  return i
}

/** Canvas pixels per CSS pixel, held under a pixel budget so 4K screens and software GPUs stay fast. */
function canvasRatio(w: number, h: number, dpr: number, budget = 1.6e6) {
  const want = Math.min(dpr, 2)
  const max = Math.sqrt(budget / Math.max(1, w * h))
  return Math.max(0.5, Math.min(want, max))
}

/** The camera over the relief: further back and narrower on tall phone screens so the whole horseshoe fits. */
function heroCam(w: number, h: number): KmmCam {
  const aspect = w / Math.max(1, h)
  if (aspect >= 1) return { u: 0.5, v: 1.42, alt: 6300, yaw: 0, fov: 60, horizon: 0.2 }
  return { u: 0.5, v: 1.3, alt: 7600, yaw: 0, fov: 56 + (1 - aspect) * 8, horizon: 0.3 }
}

type KmmBox = { x0: number; y0: number; x1: number; y1: number }

function overlaps(a: KmmBox, b: KmmBox) {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1
}

/**
 * Greedy map lettering: each label takes the first side (in its own order of
 * preference) that stays inside the frame and clear of every box placed so far.
 * Returns the top-left corner chosen for each label, or null to leave it unlabelled.
 */
function placeLabels(labels: { x: number; y: number; w: number; h: number; gap: number; order: string }[], W: number, H: number, taken: KmmBox[] = []) {
  const boxes = taken.slice()
  return labels.map((l) => {
    for (const side of l.order) {
      const x0 = side === "r" ? l.x + l.gap : side === "l" ? l.x - l.gap - l.w : l.x - l.w / 2
      const y0 = side === "t" ? l.y - l.gap - l.h : side === "b" ? l.y + l.gap : l.y - l.h / 2
      const b = { x0, y0, x1: x0 + l.w, y1: y0 + l.h }
      if (b.x0 < 2 || b.y0 < 2 || b.x1 > W - 2 || b.y1 > H - 2) continue
      if (boxes.some((o) => overlaps(o, b))) continue
      boxes.push(b)
      return { side, x: x0, y: y0 }
    }
    return null
  })
}

/** Where a point given as fractions of a photo lands once the photo is drawn with object-fit: cover, centred. */
function coverPoint(fx: number, fy: number, W: number, H: number, iw: number, ih: number) {
  const s = Math.max(W / iw, H / ih)
  return { x: (W - iw * s) / 2 + fx * iw * s, y: (H - ih * s) / 2 + fy * ih * s }
}

/** Fills "{name}" tokens in interface copy. */
function fill(text: string, vars: { [k: string]: string | number }) {
  return text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m))
}

/** Initials for a guide without a photo. */
function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("")
}
// #endregion logic

/* ---------- grids are expensive, so every instance shares them ---------- */

const GRID_CACHE: { [k: string]: KmmGrid } = {}
const SHADE_CACHE: { [k: string]: Float32Array } = {}

const NEAR = { n: 640, u0: -0.22, v0: -0.38, span: 1.45 }

/** Runs `step(from, to)` over `total` rows in slices of about 12 ms, yielding to the page between slices. */
async function sliced(total: number, step: (a: number, b: number) => void, alive: () => boolean) {
  let j = 0
  while (j < total) {
    const t0 = typeof performance !== "undefined" ? performance.now() : Date.now()
    while (j < total && (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0 < 12) {
      step(j, j + 4)
      j += 4
    }
    if (!alive()) return false
    if (j < total) await new Promise((r) => setTimeout(r, 0))
  }
  return true
}

/** Prints a sheet in slices, then paints it; false if the component went away first. */
async function printSliced(cv: HTMLCanvasElement, W: number, H: number, g: KmmGrid, view: { u0: number; v0: number; span: number }, p: KmmPrint, scale: number, alive: () => boolean) {
  const out = new Uint8ClampedArray(W * H * 4)
  if (!(await sliced(H, (a, b) => printSheet(out, W, H, g, view, p, scale, a, b), alive))) return false
  paint(cv, W, H, out)
  return true
}

/** The hero's height grid and its shading, built in slices and cached per seed and light. */
async function heroData(seed: number, key: string, alive: () => boolean) {
  const gk = "near" + seed
  if (!GRID_CACHE[gk]) {
    const g = { ...NEAR, h: new Float32Array(NEAR.n * NEAR.n) }
    if (!(await sliced(g.n, (a, b) => gridRows(g, a, b, seed, 6), alive))) return null
    GRID_CACHE[gk] = g
  }
  const g = GRID_CACHE[gk]
  const sk = key + seed
  if (!SHADE_CACHE[sk]) {
    const out = new Float32Array(g.n * g.n * 3)
    if (!(await sliced(g.n, (a, b) => shadeRows(g, SCENES[key], seed, out, a, b), alive))) return null
    SHADE_CACHE[sk] = out
  }
  return { g, sh: SHADE_CACHE[sk], far: farGrid(seed) }
}
function farGrid(seed: number) {
  const k = "far" + seed
  return GRID_CACHE[k] || (GRID_CACHE[k] = makeGrid(180, -2.6, -3.6, 5.6, seed, 4, true))
}
/** The printed map's grid, built in slices and cached per seed. */
async function planGrid(seed: number, alive: () => boolean) {
  const k = "plan" + seed
  if (GRID_CACHE[k]) return GRID_CACHE[k]
  const g = { n: 460, u0: -0.25, v0: -0.25, span: 1.5, h: new Float32Array(460 * 460) }
  if (!(await sliced(g.n, (a, b) => gridRows(g, a, b, seed, 6), alive))) return null
  return (GRID_CACHE[k] = g)
}

/* ---------- hooks ---------- */

function useReduced() {
  const [reduced, setReduced] = React.useState(false)
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
  const [dark, setDark] = React.useState(pref === "dark")
  React.useEffect(() => {
    if (pref !== "system") {
      setDark(pref === "dark")
      return
    }
    const mq = typeof matchMedia === "function" ? matchMedia("(prefers-color-scheme: dark)") : null
    const read = () => {
      const el = document.documentElement
      if (el.classList.contains("dark")) return setDark(true)
      if (el.classList.contains("light")) return setDark(false)
      setDark(!!(mq && mq.matches))
    }
    read()
    const mo = new MutationObserver(read)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    if (mq) mq.addEventListener("change", read)
    return () => {
      mo.disconnect()
      if (mq) mq.removeEventListener("change", read)
    }
  }, [pref])
  return [dark, setDark] as const
}

function useSize(ref: { current: HTMLElement | null }) {
  const [size, setSize] = React.useState({ w: 0, h: 0 })
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const read = () => {
      const r = el.getBoundingClientRect()
      setSize((s) => (Math.abs(s.w - r.width) < 1 && Math.abs(s.h - r.height) < 1 ? s : { w: Math.round(r.width), h: Math.round(r.height) }))
    }
    read()
    if (typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return size
}

/** True once the element comes within `margin` of the viewport, and stays true. */
function useNear(ref: { current: HTMLElement | null }, margin = "600px") {
  const [near, setNear] = React.useState(false)
  React.useEffect(() => {
    const el = ref.current
    if (!el || near) return
    if (typeof IntersectionObserver === "undefined") return setNear(true)
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          setNear(true)
          io.disconnect()
        }
      },
      { rootMargin: margin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [ref, margin, near])
  return near
}

/** Section heads rise in as they arrive. Armed after mount, so nothing is hidden without JS or under reduced motion. */
function useReveal(root: { current: HTMLElement | null }, reduced: boolean) {
  React.useEffect(() => {
    const el = root.current
    if (!el || reduced || typeof IntersectionObserver === "undefined") return
    const items = Array.from(el.querySelectorAll(".kmm-rv"))
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es)
          if (e.isIntersecting) {
            e.target.classList.add("kmm-shown")
            io.unobserve(e.target)
          }
      },
      { rootMargin: "0px 0px -8% 0px" },
    )
    for (const it of items) {
      const r = it.getBoundingClientRect()
      if (r.top > innerHeight) {
        it.classList.add("kmm-armed")
        io.observe(it)
      }
    }
    return () => io.disconnect()
  }, [root, reduced])
}

/** Paints RGBA into a canvas at a pixel ratio, sizing its backing store. */
function paint(cv: HTMLCanvasElement, W: number, H: number, data: Uint8ClampedArray) {
  if (cv.width !== W) cv.width = W
  if (cv.height !== H) cv.height = H
  const ctx = cv.getContext("2d")
  if (!ctx) return
  const img = ctx.createImageData(W, H)
  img.data.set(data)
  ctx.putImageData(img, 0, 0)
}

/* ---------- small marks drawn in the map's own symbols ---------- */

function HutMark({ size = 12 }: { size?: number }) {
  return (
    <svg className="kmm-sym" width={size} height={size} viewBox="0 0 12 12" aria-hidden="true">
      <rect x="1.5" y="4.5" width="9" height="6.5" fill="currentColor" />
      <path d="M0.5 5.2 6 1 11.5 5.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

function Waymark() {
  return (
    <span className="kmm-waymark" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  )
}

function Arrow() {
  return (
    <svg className="kmm-arrow" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 8h11M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
    </svg>
  )
}

function LegendSymbol({ kind }: { kind: KammLegendItem["symbol"] }) {
  const s = { fill: "none", stroke: "currentColor", strokeWidth: 1.5 } as const
  return (
    <svg className="kmm-legsym" width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
      <rect x="0.75" y="0.75" width="42.5" height="42.5" rx="3" fill="none" stroke="currentColor" strokeOpacity="0.25" />
      {kind === "hut" && (
        <g>
          <rect x="14" y="20" width="16" height="11" fill="currentColor" />
          <path d="M11 21.5 22 13l11 8.5" {...s} strokeWidth={2} />
        </g>
      )}
      {kind === "guide" && (
        <g>
          <path d="M8 33 18 17l6 9 4-5 8 12z" {...s} />
          <path d="M18 17v-6l6 3-6 3" fill="currentColor" />
        </g>
      )}
      {kind === "bag" && (
        <g>
          <rect x="12" y="17" width="20" height="16" rx="3" {...s} />
          <path d="M18 17v-3h8v3M12 24h20" {...s} />
        </g>
      )}
      {kind === "meal" && (
        <g>
          <circle cx="22" cy="23" r="8.5" {...s} />
          <path d="M11 13v8M9 13v5c0 2 4 2 4 0v-5M33 13v18M33 13c-3 2-3 7 0 8" {...s} />
        </g>
      )}
      {kind === "cable" && (
        <g>
          <path d="M6 13 38 27" {...s} />
          <path d="M22 20v4" {...s} />
          <rect x="16" y="24" width="12" height="9" rx="1.5" fill="currentColor" />
        </g>
      )}
      {kind === "rope" && (
        <g>
          <path d="M10 33c6-2 4-8 10-10s6-8 12-10" {...s} strokeWidth={2} strokeDasharray="3 2" />
          <circle cx="10" cy="33" r="2" fill="currentColor" />
          <circle cx="32" cy="13" r="2" fill="currentColor" />
        </g>
      )}
      {kind === "bus" && (
        <g>
          <rect x="11" y="13" width="22" height="16" rx="3" {...s} />
          <path d="M11 22h22" {...s} />
          <circle cx="16" cy="31" r="2" fill="currentColor" />
          <circle cx="28" cy="31" r="2" fill="currentColor" />
        </g>
      )}
      {kind === "shield" && <path d="M22 10 32 14v8c0 6-4 10-10 12-6-2-10-6-10-12v-8z" {...s} />}
    </svg>
  )
}

/** A section's top rule, drawn like the edge of a map sheet: grid square, kilometre ticks, a note. */
function Collar({ grid, note }: { grid: string; note: string }) {
  return (
    <div className="kmm-collar-rule" aria-hidden="true">
      <b>{grid}</b>
      <i />
      <span>{note}</span>
    </div>
  )
}

/** The kamm mark: one ridge drawn as three contour lines. */
function Mark() {
  return (
    <svg className="kmm-mark" width="26" height="20" viewBox="0 0 26 20" aria-hidden="true">
      <path d="M1 18 9 6l4 5 4-7 8 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M6 18l3-4.6 4 5 4-7 5.4 6.6" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" opacity="0.6" />
    </svg>
  )
}

/* ---------- hero: the relief model ---------- */

type KmmPin = { i: number; x: number; y: number; name: string; alt: number; lx: number; ly: number; has: boolean }

function HeroScene({
  seed,
  sceneKey,
  stages,
  path,
  live,
  onPick,
  sep,
  image,
  imageAlt,
  photoTrail,
  dayWord,
}: {
  seed: number
  sceneKey: string
  stages: KammStage[]
  path: KmmTrailPt[]
  live: { stage: number; label: string } | null
  onPick: (i: number) => void
  sep: string
  image?: string
  imageAlt?: string
  photoTrail?: [number, number][]
  dayWord: string
}) {
  const wrap = React.useRef(null as HTMLDivElement | null)
  const cv = React.useRef(null as HTMLCanvasElement | null)
  const size = useSize(wrap)
  const [ready, setReady] = React.useState("")
  const [trail, setTrail] = React.useState([] as { d: string; hidden: boolean }[])
  const [holes, setHoles] = React.useState([] as KmmBox[])
  const [pins, setPins] = React.useState([] as KmmPin[])
  const [livePt, setLivePt] = React.useState(null as null | KmmPin)
  const mid = React.useId().replace(/:/g, "")
  const [natural, setNatural] = React.useState(null as null | { w: number; h: number })

  React.useEffect(() => {
    const el = cv.current
    if (size.w < 10 || size.h < 10 || (!image && !el)) return
    let dead = false
    const t = setTimeout(async () => {
      if (dead) return
      // where things are on screen: projected over the relief, or given as fractions over a photo
      let vis: (u: number, v: number, lift: number) => null | { x: number; y: number; seen: boolean }
      let stageAt: (i: number) => null | { x: number; y: number; seen: boolean }
      const runs: { d: string; hidden: boolean }[] = []
      if (image) {
        vis = () => null
        if (!natural) return
        const cp = (q: [number, number]) => coverPoint(q[0], q[1], size.w, size.h, natural.w, natural.h)
        stageAt = (i) => {
          const h = stages[i] && stages[i].heroAt
          return h ? { ...cp(h), seen: true } : null
        }
        if (photoTrail && photoTrail.length > 1) runs.push({ d: photoTrail.map((q, i) => (i ? "L" : "M") + cp(q).x.toFixed(1) + " " + cp(q).y.toFixed(1)).join(""), hidden: false })
      } else {
        const data = await heroData(seed, sceneKey, () => !dead)
        if (!data || dead || !el) return
        const { g, sh, far } = data
        const ratio = canvasRatio(size.w, size.h, typeof devicePixelRatio === "number" ? devicePixelRatio : 1, 1.4e6)
        const W = Math.max(1, Math.round(size.w * ratio))
        const H = Math.max(1, Math.round(size.h * ratio))
        const out = new Uint8ClampedArray(W * H * 4)
        const depth = new Float32Array(W * H)
        const cam = heroCam(W, H)
        renderVista(out, depth, W, H, g, sh, SCENES[sceneKey], cam, far)
        paint(el, W, H, out)
        vis = (u, v, lift) => {
          const p = project(W, H, cam, u, v, sampleH(g, u, v) + lift)
          if (!p) return null
          const x = Math.round(p.x)
          const y = Math.round(p.y)
          const seen = x >= 0 && y >= 0 && x < W && y < H && depth[y * W + x] >= p.z - 260
          return { x: p.x / ratio, y: p.y / ratio, seen }
        }
        stageAt = (i) => (stages[i] ? vis(stages[i].at[0], stages[i].at[1], 30) : null)
        // the trail: solid where you can see it, a faint dash where a ridge hides it
        let cur = ""
        let curHidden = false
        for (const p of path) {
          const q = vis(p.u, p.v, 12)
          if (!q || q.x < -60 || q.x > size.w + 60 || q.y < -60) {
            if (cur.indexOf("L") > 0) runs.push({ d: cur, hidden: curHidden })
            cur = ""
            continue
          }
          const pt = q.x.toFixed(1) + " " + q.y.toFixed(1)
          if (cur && !q.seen !== curHidden) {
            runs.push({ d: cur + "L" + pt, hidden: curHidden })
            cur = "M" + pt
          } else cur += (cur ? "L" : "M") + pt
          curHidden = !q.seen
        }
        if (cur.indexOf("L") > 0) runs.push({ d: cur, hidden: curHidden })
      }
      // keep pins and labels clear of the nav, the headline, the text and the buttons
      const hostR = wrap.current ? wrap.current.getBoundingClientRect() : null
      const keepOut: KmmBox[] = [{ x0: 0, y0: 0, x1: size.w, y1: 84 }]
      const copy: KmmBox[] = []
      const hero = wrap.current ? wrap.current.parentElement : null
      if (hero && hostR)
        for (const node of Array.from(hero.querySelectorAll(".kmm-hero-text h1, .kmm-hero-text p, .kmm-hero-actions"))) {
          const r = node.getBoundingClientRect()
          copy.push({ x0: r.left - hostR.left - 14, y0: r.top - hostR.top - 14, x1: r.right - hostR.left + 14, y1: r.bottom - hostR.top + 14 })
        }
      keepOut.push(...copy)
      const clear = (x: number, y: number) => x > 14 && x < size.w - 14 && keepOut.every((b) => x < b.x0 || x > b.x1 || y < b.y0 || y > b.y1)
      let lp = null as null | KmmPin
      if (live && stages[live.stage]) {
        const q = stageAt(live.stage)
        if (q && q.seen && clear(q.x, q.y)) lp = { i: live.stage, x: q.x, y: q.y, name: stages[live.stage].to, alt: stages[live.stage].alt, lx: 0, ly: 0, has: false }
      }
      const kept: KmmPin[] = []
      stages.forEach((st, i) => {
        if (live && live.stage === i) return
        const q = stageAt(i)
        if (!q || !q.seen || !clear(q.x, q.y)) return
        if ([lp, ...kept].every((k) => !k || Math.hypot(k.x - q.x, k.y - q.y) > 26)) kept.push({ i, x: q.x, y: q.y, name: st.to, alt: st.alt, lx: 0, ly: 0, has: false })
      })
      const all = (lp ? [lp] : []).concat(kept)
      const dots = all.map((k) => ({ x0: k.x - 12, y0: k.y - 12, x1: k.x + 12, y1: k.y + 12 }))
      // labels stay off the drawn trail too
      const trailBoxes: KmmBox[] = []
      for (const r of runs) {
        if (r.hidden) continue
        const nums = r.d.slice(1).split("L").map((pt) => pt.split(" ").map(Number))
        for (const [x, y] of nums) if (Number.isFinite(x) && Number.isFinite(y)) trailBoxes.push({ x0: x - 4, y0: y - 4, x1: x + 4, y1: y + 4 })
      }
      const spots = placeLabels(
        all.map((k, n) =>
          n === 0 && lp
            ? { x: k.x, y: k.y, w: Math.max(live ? live.label.length * 7.2 : 0, (k.name.length + 9) * 6.4) + 22, h: 46, gap: 14, order: "trlb" }
            : { x: k.x, y: k.y, w: Math.max(k.name.length * 7.6, 60) + 18, h: 38, gap: 13, order: "rltb" },
        ),
        size.w,
        size.h,
        [...keepOut, ...dots, ...trailBoxes],
      )
      // phones keep the live note and two hut names; the other pins stay as marks you can tap
      let budget = size.w < 640 ? 2 : 99
      all.forEach((k, n) => {
        const sp = spots[n]
        const isLive = n === 0 && !!lp
        if (sp && (isLive || budget > 0)) {
          if (!isLive) budget--
          k.lx = sp.x - k.x
          k.ly = sp.y - k.y
          k.has = true
        }
      })
      if (dead) return
      setTrail(runs)
      setHoles(copy.length ? [{ x0: Math.min(...copy.map((b) => b.x0)) - 24, y0: Math.min(...copy.map((b) => b.y0)) - 10, x1: Math.max(...copy.map((b) => b.x1)) + 24, y1: size.h + 40 }] : [])
      setPins(kept)
      setLivePt(lp)
      setReady(sceneKey + seed + size.w + "x" + size.h + (image || ""))
    }, 30)
    return () => {
      dead = true
      clearTimeout(t)
    }
  }, [seed, sceneKey, size.w, size.h, path, stages, live, image, photoTrail, natural])

  const liveStage = live ? stages[live.stage] : null
  return (
    <div ref={wrap} className="kmm-scene" data-ready={ready ? "1" : "0"}>
      {image ? (
        <img
          className="kmm-photo kmm-hero-photo"
          src={image}
          alt={imageAlt || ""}
          width={2400}
          height={1500}
          onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth || 2400, h: e.currentTarget.naturalHeight || 1500 })}
        />
      ) : (
        <canvas ref={cv} className="kmm-canvas" aria-hidden="true" style={{ width: size.w + "px", height: size.h + "px" }} />
      )}
      <svg className="kmm-trail" width={size.w} height={size.h} viewBox={"0 0 " + Math.max(1, size.w) + " " + Math.max(1, size.h)} aria-hidden="true">
        <defs>
          <filter id={mid + "f"} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
          <mask id={mid + "m"} maskUnits="userSpaceOnUse" x="0" y="0" width={Math.max(1, size.w)} height={Math.max(1, size.h)}>
            <rect x="0" y="0" width={Math.max(1, size.w)} height={Math.max(1, size.h)} fill="#fff" />
            <g filter={"url(#" + mid + "f)"}>
              {holes.map((b, i) => (
                <rect key={i} x={b.x0} y={b.y0} width={b.x1 - b.x0} height={b.y1 - b.y0} fill="#000" />
              ))}
            </g>
          </mask>
        </defs>
        <g mask={"url(#" + mid + "m)"}>
          {trail.map((r, i) =>
            r.hidden ? (
              <path key={i} d={r.d} className="kmm-trail-hidden" />
            ) : (
              <g key={i}>
                <path d={r.d} className="kmm-trail-case" pathLength={1} style={{ animationDelay: 700 + i * 60 + "ms" }} />
                <path d={r.d} className="kmm-trail-line" pathLength={1} style={{ animationDelay: 700 + i * 60 + "ms" }} />
              </g>
            ),
          )}
        </g>
      </svg>
      <div className="kmm-pins">
        {pins.map((p, n) => (
          <button
            key={p.i}
            type="button"
            className="kmm-pin"
            style={{ left: p.x + "px", top: p.y + "px", animationDelay: 1100 + n * 40 + "ms" }}
            onClick={() => onPick(p.i)}
            aria-label={dayWord + " " + (p.i + 1) + ": " + p.name + ", " + fmtNum(p.alt, sep) + " m. Show on the route map"}
          >
            <span className="kmm-pin-dot">
              <HutMark size={10} />
            </span>
            {p.has ? (
              <span className="kmm-pin-label" style={{ left: p.lx + 11 + "px", top: p.ly + 11 + "px" }}>
                <b>{p.name}</b>
                <span>{fmtNum(p.alt, sep)} m</span>
              </span>
            ) : null}
          </button>
        ))}
        {livePt && liveStage && live ? (
          <span className="kmm-live" style={{ left: livePt.x + "px", top: livePt.y + "px" }}>
            <span className="kmm-live-ring" aria-hidden="true" />
            <span className="kmm-live-dot" aria-hidden="true" />
            {livePt.has ? (
              <span className="kmm-live-label" style={{ left: livePt.lx + "px", top: livePt.ly + "px" }}>
                <b>{live.label}</b>
                <span>
                  {liveStage.to}, {fmtNum(liveStage.alt, sep)} m
                </span>
              </span>
            ) : null}
          </span>
        ) : null}
      </div>
    </div>
  )
}

/* ---------- the printed map and the profile that drives it ---------- */

function RouteMap({
  seed,
  printKey,
  interval,
  start,
  stages,
  path,
  peaks,
  pos,
  active,
  name,
  sep,
}: {
  seed: number
  printKey: string
  interval: number
  start: KammPlace
  stages: KammStage[]
  path: KmmTrailPt[]
  peaks: (string | KammPeak)[]
  pos: { u: number; v: number }
  active: number
  name: string
  sep: string
}) {
  const wrap = React.useRef(null as HTMLDivElement | null)
  const cv = React.useRef(null as HTMLCanvasElement | null)
  const size = useSize(wrap)
  const near = useNear(wrap)
  const [ready, setReady] = React.useState(false)
  const aspect = size.w > 0 && size.h > 0 ? size.w / size.h : 4 / 3
  const pts = React.useMemo(() => [start.at, ...stages.map((s) => s.at)] as [number, number][], [start, stages])
  const view = React.useMemo(() => mapView(pts, aspect, 0.09), [pts, aspect])
  const VW = 1000
  const VH = VW / aspect
  const X = (u: number) => ((u - view.u0) / view.w) * VW
  const Y = (v: number) => ((v - view.v0) / view.h) * VH
  const px = size.w > 0 ? VW / size.w : 1
  const [named, setNamed] = React.useState([] as { name: string; u: number; v: number; h: number }[])

  React.useEffect(() => {
    const el = cv.current
    if (!el || !near || size.w < 10) return
    let dead = false
    const t = setTimeout(async () => {
      if (dead) return
      const g = await planGrid(seed, () => !dead)
      if (!g || dead) return
      const ratio = canvasRatio(size.w, size.h, typeof devicePixelRatio === "number" ? devicePixelRatio : 1, 1.1e6)
      const W = Math.max(1, Math.round(size.w * ratio))
      const H = Math.max(1, Math.round(size.h * ratio))
      const p = { ...PRINTS[printKey], interval }
      if (!(await printSliced(el, W, H, g, { u0: view.u0, v0: view.v0, span: view.w }, p, Math.max(1, ratio * 0.9), () => !dead))) return
      setNamed(resolvePeaks(g, peaks, pts))
      setReady(true)
    }, 60)
    return () => {
      dead = true
      clearTimeout(t)
    }
  }, [near, seed, printKey, interval, size.w, size.h, view, peaks, pts])

  const d = (list: KmmTrailPt[]) => list.map((p, i) => (i ? "L" : "M") + X(p.u).toFixed(1) + " " + Y(p.v).toFixed(1)).join("")
  const all = d(path)
  const first = path.findIndex((p) => p.stage === active)
  const seg = d([path[Math.max(0, first - 1)], ...path.filter((p) => p.stage === active)])
  // a grid line every kilometre, numbered like a national grid
  const kmU = 1 / MAP_KM
  const gridX: number[] = []
  const gridY: number[] = []
  for (let u = Math.ceil(view.u0 / kmU) * kmU; u < view.u0 + view.w; u += kmU) gridX.push(u)
  for (let v = Math.ceil(view.v0 / kmU) * kmU; v < view.v0 + view.h; v += kmU) gridY.push(v)
  const scaleKm = view.w * MAP_KM > 10 ? 2 : 1
  const fs = 11.5 * px
  // lettering: stops first, then summits, never over a symbol, the scale bar or the north arrow
  const wd = (t: string, f: number) => t.length * f * 0.56 + 2 * px
  const stops = [{ key: "s", text: start.name, x: X(start.at[0]), y: Y(start.at[1]), cls: "kmm-lt-town" }, ...stages.map((st, i) => ({ key: "h" + i, text: st.to, x: X(st.at[0]), y: Y(st.at[1]), cls: i === active ? "kmm-lt-on" : "" }))]
  const symbolBoxes = stops.map((p) => ({ x0: p.x - 8 * px, y0: p.y - 8 * px, x1: p.x + 8 * px, y1: p.y + 8 * px }))
  const frame = [
    { x0: 0, y0: VH - 40 * px, x1: 130 * px, y1: VH },
    { x0: VW - 40 * px, y0: 0, x1: VW, y1: 56 * px },
  ]
  const fsS = fs * 1.05
  const inView = named.filter((pk) => pk.u > view.u0 + view.w * 0.04 && pk.u < view.u0 + view.w * 0.96 && pk.v > view.v0 + view.h * 0.06 && pk.v < view.v0 + view.h * 0.95)
  const peakList = inView.slice(0, size.w > 0 && size.w < 520 ? 4 : 6)
  const summits = peakList
  const placed = placeLabels(
    [
      ...stops.map((p) => ({ x: p.x, y: p.y, w: wd(p.text, fsS), h: fsS * 1.25, gap: 10 * px, order: "rltb" })),
      ...peakList.map((pk, i) => ({ x: X(pk.u), y: Y(pk.v), w: Math.max(wd(pk.name, fs), wd("0,000", fs * 0.85)), h: fs * 2.25, gap: 7 * px, order: "tbrl" })),
    ],
    VW,
    VH,
    [...symbolBoxes, ...frame, ...peakList.map((pk) => ({ x0: X(pk.u) - 5 * px, y0: Y(pk.v) - 5 * px, x1: X(pk.u) + 5 * px, y1: Y(pk.v) + 4 * px }))],
  )
  const letters = [
    ...stops.map((p, i) => ({ key: p.key, text: p.text, sub: "", fs: fsS, cls: p.cls, at: placed[i] })),
    ...peakList.map((pk, i) => ({ key: "pk" + i, text: pk.name, sub: fmtNum(pk.h, sep), fs, cls: "kmm-lt-peak", at: placed[stops.length + i] })),
  ]
  return (
    <div ref={wrap} className="kmm-map" data-ready={ready ? "1" : "0"}>
      <canvas ref={cv} className="kmm-canvas" aria-hidden="true" style={{ width: size.w + "px", height: size.h + "px" }} />
      <svg className="kmm-map-svg" viewBox={"0 0 " + VW + " " + VH.toFixed(1)} role="img" aria-label={name + ": map of the route from " + start.name + " to " + (stages[stages.length - 1] ? stages[stages.length - 1].to : "")}>
        <g className="kmm-grid">
          {gridX.map((u) => (
            <line key={"x" + u} x1={X(u)} x2={X(u)} y1={0} y2={VH} strokeWidth={px} />
          ))}
          {gridY.map((v) => (
            <line key={"y" + v} y1={Y(v)} y2={Y(v)} x1={0} x2={VW} strokeWidth={px} />
          ))}
          {gridX.filter((_, i) => i % 2 === 0).map((u) => (
            <text key={"tx" + u} x={X(u) + 3 * px} y={10 * px} fontSize={9 * px}>
              {fmtNum(2780 + Math.round(u * MAP_KM), " ")}
            </text>
          ))}
          {gridY.filter((_, i) => i % 2 === 0).map((v) => (
            <text key={"ty" + v} x={3 * px} y={Y(v) - 3 * px} fontSize={9 * px}>
              {fmtNum(1176 - Math.round(v * MAP_KM), " ")}
            </text>
          ))}
        </g>
        {summits.map((s, i) => (
          <path key={"pk" + i} className="kmm-peak" d={"M" + X(s.u).toFixed(1) + " " + (Y(s.v) - 4 * px).toFixed(1) + "l" + 4 * px + " " + 7 * px + "h" + -8 * px + "z"} />
        ))}
        <path d={all} className="kmm-route-case" strokeWidth={6 * px} />
        <path d={all} className="kmm-route" strokeWidth={2.2 * px} strokeDasharray={7 * px + " " + 4 * px} />
        <path d={seg} className="kmm-route-on" strokeWidth={4 * px} key={"seg" + active} />
        <g className="kmm-town" transform={"translate(" + X(start.at[0]) + " " + Y(start.at[1]) + ")"}>
          <circle r={5 * px} strokeWidth={2 * px} />
        </g>
        {stages.map((st, i) => {
          const town = !st.sleep
          return (
            <g key={"h" + i} className={"kmm-hut" + (i === active ? " kmm-hut-on" : "") + (town ? " kmm-hut-town" : "")} transform={"translate(" + X(st.at[0]).toFixed(1) + " " + Y(st.at[1]).toFixed(1) + ")"}>
              {town ? (
                <circle r={5 * px} strokeWidth={2 * px} />
              ) : (
                <g transform={"scale(" + px * 1.15 + ") translate(-6 -7)"}>
                  <rect x="0" y="0" width="12" height="12" rx="1" className="kmm-hut-bg" />
                  <rect x="2.5" y="5.5" width="7" height="5" />
                  <path d="M1.5 6 6 2.4 10.5 6" fill="none" strokeWidth="1.3" />
                </g>
              )}
            </g>
          )
        })}
        <g className="kmm-lettering" strokeWidth={3 * px}>
          {letters.map((l) =>
            l.at ? (
              <text key={l.key} x={l.at.x} y={l.at.y + l.fs * 0.92} fontSize={l.fs} className={l.cls}>
                {l.text}
                {l.sub ? (
                  <tspan x={l.at.x} dy={l.fs * 1.05} fontSize={l.fs * 0.85} className="kmm-peak-h">
                    {l.sub}
                  </tspan>
                ) : null}
              </text>
            ) : null,
          )}
        </g>
        <g className="kmm-walker" transform={"translate(" + X(pos.u).toFixed(1) + " " + Y(pos.v).toFixed(1) + ")"}>
          <circle r={11 * px} className="kmm-walker-halo" />
          <circle r={5.5 * px} strokeWidth={2.5 * px} />
        </g>
        <g className="kmm-collar" transform={"translate(" + 16 * px + " " + (VH - 18 * px).toFixed(1) + ")"}>
          <rect x={0} y={-5 * px} width={((scaleKm / (view.w * MAP_KM)) * VW) / 2} height={4 * px} />
          <rect x={((scaleKm / (view.w * MAP_KM)) * VW) / 2} y={-5 * px} width={((scaleKm / (view.w * MAP_KM)) * VW) / 2} height={4 * px} className="kmm-collar-w" strokeWidth={px} />
          <text x={0} y={-9 * px} fontSize={9.5 * px}>
            0
          </text>
          <text x={(scaleKm / (view.w * MAP_KM)) * VW} y={-9 * px} fontSize={9.5 * px} textAnchor="middle">
            {scaleKm} km
          </text>
        </g>
        <g className="kmm-north" transform={"translate(" + (VW - 22 * px) + " " + 30 * px + ")"}>
          <path d={"M0 " + -12 * px + "L" + 5 * px + " " + 6 * px + "L0 " + 2 * px + "L" + -5 * px + " " + 6 * px + "z"} />
          <text y={18 * px} fontSize={9.5 * px} textAnchor="middle">
            N
          </text>
        </g>
      </svg>
    </div>
  )
}

function Profile({
  start,
  stages,
  km,
  active,
  onScrub,
  sep,
  reduced,
  dayWord,
}: {
  start: KammPlace
  stages: KammStage[]
  km: number
  active: number
  onScrub: (km: number) => void
  sep: string
  reduced: boolean
  dayWord: string
}) {
  const wrap = React.useRef(null as HTMLDivElement | null)
  const size = useSize(wrap)
  const W = Math.max(280, size.w)
  const Hh = W < 640 ? 168 : 212
  const padL = W < 640 ? 42 : 48
  const padR = 10
  const padT = W < 640 ? 34 : 40
  const padB = 22
  const starts = stageStarts(stages)
  const total = starts[starts.length - 1] || 1
  let lo = start.alt
  let hi = start.alt
  let prev = start.alt
  for (const st of stages) {
    const s = stageStats(prev, st)
    lo = Math.min(lo, s.low)
    hi = Math.max(hi, s.high)
    prev = st.alt
  }
  const yLo = Math.floor((lo - 150) / 500) * 500
  const yHi = Math.ceil((hi + 120) / 500) * 500
  const X = (k: number) => padL + (k / total) * (W - padL - padR)
  const Y = (a: number) => padT + (1 - (a - yLo) / (yHi - yLo)) * (Hh - padT - padB)
  // the line: each stage sampled finely
  let line = ""
  prev = start.alt
  const tops: { x: number; y: number; i: number }[] = []
  stages.forEach((st, i) => {
    for (let s = i === 0 ? 0 : 1; s <= 28; s++) {
      const f = s / 28
      line += (line ? "L" : "M") + X(starts[i] + f * st.km).toFixed(1) + " " + Y(altAt(prev, st, f)).toFixed(1)
    }
    tops.push({ x: X(starts[i + 1]), y: Y(st.alt), i })
    prev = st.alt
  })
  const area = line + "L" + X(total).toFixed(1) + " " + (Hh - padB) + "L" + X(0).toFixed(1) + " " + (Hh - padB) + "z"
  const at = locate(stages, km)
  const fromAlt = at.i === 0 ? start.alt : stages[at.i - 1].alt
  const alt = altAt(fromAlt, stages[at.i], at.f)
  const cx = X(km)
  const cy = Y(alt)
  const contours: number[] = []
  for (let a = Math.ceil(yLo / 100) * 100; a <= yHi; a += 100) contours.push(a)
  const clip = React.useId().replace(/:/g, "")
  const dragging = React.useRef(false)
  const kmFrom = (clientX: number) => {
    const r = wrap.current ? wrap.current.getBoundingClientRect() : null
    if (!r) return km
    return clamp(((clientX - r.left - padL) / (r.width - padL - padR)) * total, 0, total)
  }
  const onKey = (e: React.KeyboardEvent) => {
    let k = km
    if (e.key === "ArrowRight" || e.key === "ArrowUp") k = km + 0.5
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") k = km - 0.5
    else if (e.key === "PageUp") k = starts[Math.min(stages.length, at.i + 1)] - 0.001
    else if (e.key === "PageDown") k = starts[Math.max(0, at.i - (at.f < 0.05 ? 1 : 0))]
    else if (e.key === "Home") k = 0
    else if (e.key === "End") k = total
    else return
    e.preventDefault()
    onScrub(clamp(k, 0, total))
  }
  const labelEvery = W < 640 ? 2 : 1
  return (
    <div
      ref={wrap}
      className="kmm-profile"
      role="slider"
      tabIndex={0}
      aria-label="Position along the route"
      aria-valuemin={0}
      aria-valuemax={Math.round(total * 10) / 10}
      aria-valuenow={Math.round(km * 10) / 10}
      aria-valuetext={dayWord + " " + (at.i + 1) + ", kilometre " + fmtKm(km) + ", " + fmtNum(alt, sep) + " metres"}
      onKeyDown={onKey}
      onPointerDown={(e) => {
        dragging.current = true
        try {
          ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        } catch {}
        onScrub(kmFrom(e.clientX))
      }}
      onPointerMove={(e) => {
        if (dragging.current || e.pointerType === "mouse") onScrub(kmFrom(e.clientX))
      }}
      onPointerUp={() => {
        dragging.current = false
      }}
      onPointerCancel={() => {
        dragging.current = false
      }}
      data-reduced={reduced ? "1" : "0"}
    >
      <svg width={W} height={Hh} viewBox={"0 0 " + W + " " + Hh} aria-hidden="true">
        <defs>
          <clipPath id={clip}>
            <path d={area} />
          </clipPath>
        </defs>
        {[yLo, (yLo + yHi) / 2, yHi].map((a) =>
          a % 500 === 0 ? (
            <g key={"ax" + a} className="kmm-axis">
              <line x1={padL} x2={W - padR} y1={Y(a)} y2={Y(a)} />
              <text x={padL - 6} y={Y(a) + 4} textAnchor="end">
                {fmtNum(a, sep)}
              </text>
            </g>
          ) : null,
        )}
        <rect x={X(starts[active])} y={padT - 26} width={X(starts[active + 1]) - X(starts[active])} height={Hh - padB - padT + 26} className="kmm-band" />
        <path d={area} className="kmm-area" />
        <g clipPath={"url(#" + clip + ")"} className="kmm-pcont">
          {contours.map((a) => (
            <line key={a} x1={padL} x2={W - padR} y1={Y(a)} y2={Y(a)} className={a % 500 === 0 ? "kmm-pcont-i" : ""} />
          ))}
        </g>
        <path d={line} className="kmm-pline" />
        {starts.slice(1, -1).map((k, i) => (
          <line key={"sep" + i} x1={X(k)} x2={X(k)} y1={padT - 6} y2={Hh - padB} className="kmm-sep" />
        ))}
        {stages.map((st, i) => (
          <text key={"d" + i} x={(X(starts[i]) + X(starts[i + 1])) / 2} y={Hh - 6} textAnchor="middle" className={"kmm-pday" + (i === active ? " kmm-pday-on" : "")}>
            {W < 520 ? dayWord.charAt(0) + (i + 1) : dayWord + " " + (i + 1)}
          </text>
        ))}
        {tops.map((t) =>
          t.i % labelEvery === labelEvery - 1 || t.i === active ? (
            <g key={"t" + t.i} className={"kmm-ptop" + (t.i === active ? " kmm-ptop-on" : "")} transform={"translate(" + t.x.toFixed(1) + " " + t.y.toFixed(1) + ")"}>
              <rect x={-3.5} y={-3.5} width={7} height={7} />
            </g>
          ) : null,
        )}
        <g className="kmm-cursor">
          <line x1={cx} x2={cx} y1={padT - 30} y2={Hh - padB} />
          <circle cx={cx} cy={cy} r={5} />
          <text x={clamp(cx, padL + 50, W - padR - 50)} y={padT - 16} textAnchor="middle">
            {"km " + fmtKm(km) + ", " + fmtNum(alt, sep) + " m"}
          </text>
        </g>
      </svg>
    </div>
  )
}

/* ---------- huts: each one on its own map excerpt ---------- */

const EXCERPT_CACHE: { [k: string]: KmmGrid } = {}

function Excerpt({ seed, printKey, stage, path, index, sep }: { seed: number; printKey: string; stage: KammStage; path: KmmTrailPt[]; index: number; sep: string }) {
  const wrap = React.useRef(null as HTMLDivElement | null)
  const cv = React.useRef(null as HTMLCanvasElement | null)
  const size = useSize(wrap)
  const near = useNear(wrap, "300px")
  const [ready, setReady] = React.useState("")
  const span = 0.13
  const aspect = size.w > 0 && size.h > 0 ? size.w / size.h : 4 / 3
  const vw = span
  const vh = span / aspect
  const u0 = stage.at[0] - vw / 2
  const v0 = stage.at[1] - vh / 2
  React.useEffect(() => {
    const el = cv.current
    if (!el || !near || size.w < 10 || stage.image) return
    let dead = false
    const t = setTimeout(async () => {
      if (dead) return
      const key = seed + ":" + stage.at[0].toFixed(4) + ":" + stage.at[1].toFixed(4)
      const g = EXCERPT_CACHE[key] || (EXCERPT_CACHE[key] = makeGrid(170, stage.at[0] - span * 0.6, stage.at[1] - span * 0.6, span * 1.2, seed, 7))
      const ratio = canvasRatio(size.w, size.h, typeof devicePixelRatio === "number" ? devicePixelRatio : 1, 0.7e6)
      const W = Math.max(1, Math.round(size.w * ratio))
      const H = Math.max(1, Math.round(size.h * ratio))
      if (!(await printSliced(el, W, H, g, { u0, v0, span: vw }, { ...PRINTS[printKey], interval: 20 }, Math.max(1, ratio * 0.9), () => !dead))) return
      setReady(key + printKey + size.w)
    }, 40 + index * 30)
    return () => {
      dead = true
      clearTimeout(t)
    }
  }, [near, seed, printKey, size.w, size.h, stage, u0, v0, vw, index])
  const X = (u: number) => ((u - u0) / vw) * 1000
  const VH = 1000 / aspect
  const Y = (v: number) => ((v - v0) / vh) * VH
  const px = size.w > 0 ? 1000 / size.w : 1
  const d = path.map((p, i) => (i ? "L" : "M") + X(p.u).toFixed(1) + " " + Y(p.v).toFixed(1)).join("")
  return (
    <div ref={wrap} className="kmm-excerpt" data-ready={ready || stage.image ? "1" : "0"}>
      {stage.image ? (
        <img className="kmm-photo" src={stage.image} alt={stage.imageAlt || stage.to} width={1200} height={900} loading="lazy" />
      ) : (
        <>
          <canvas ref={cv} className="kmm-canvas" aria-hidden="true" style={{ width: size.w + "px", height: size.h + "px" }} />
          <svg className="kmm-map-svg" viewBox={"0 0 1000 " + VH.toFixed(1)} aria-hidden="true">
            <path d={d} className="kmm-route-case" strokeWidth={7 * px} />
            <path d={d} className="kmm-route" strokeWidth={2.6 * px} strokeDasharray={8 * px + " " + 5 * px} />
            <g className="kmm-hut kmm-hut-on" transform={"translate(500 " + (VH / 2).toFixed(1) + ") scale(" + px * 1.6 + ") translate(-6 -7)"}>
              <rect x="0" y="0" width="12" height="12" rx="1" className="kmm-hut-bg" />
              <rect x="2.5" y="5.5" width="7" height="5" />
              <path d="M1.5 6 6 2.4 10.5 6" fill="none" strokeWidth="1.3" />
            </g>
          </svg>
          <span className="kmm-excerpt-tag">
            {stage.to} {fmtNum(stage.alt, sep)} m
          </span>
        </>
      )}
    </div>
  )
}

/* ---------- the footer: the last sheet of the walk, faded behind the closing line ---------- */

function FooterMap({ seed, printKey, interval, stages, path }: { seed: number; printKey: string; interval: number; stages: KammStage[]; path: KmmTrailPt[] }) {
  const wrap = React.useRef(null as HTMLDivElement | null)
  const cv = React.useRef(null as HTMLCanvasElement | null)
  const size = useSize(wrap)
  const near = useNear(wrap)
  const [ready, setReady] = React.useState(false)
  const end = stages[stages.length - 1]
  const aspect = size.w > 0 && size.h > 0 ? size.w / size.h : 3
  const vw = 0.62
  const vh = vw / aspect
  const u0 = (end ? end.at[0] : 0.5) - vw * 0.62
  const v0 = (end ? end.at[1] : 0.5) - vh * 0.5
  React.useEffect(() => {
    const el = cv.current
    if (!el || !near || size.w < 10) return
    let dead = false
    const t = setTimeout(async () => {
      if (dead) return
      const ratio = canvasRatio(size.w, size.h, typeof devicePixelRatio === "number" ? devicePixelRatio : 1, 0.8e6)
      const W = Math.max(1, Math.round(size.w * ratio))
      const H = Math.max(1, Math.round(size.h * ratio))
      const g = await planGrid(seed, () => !dead)
      if (!g || dead) return
      if (!(await printSliced(el, W, H, g, { u0, v0, span: vw }, { ...PRINTS[printKey], interval }, Math.max(1, ratio * 0.9), () => !dead))) return
      setReady(true)
    }, 80)
    return () => {
      dead = true
      clearTimeout(t)
    }
  }, [near, seed, printKey, interval, size.w, size.h, u0, v0, vw])
  const X = (u: number) => ((u - u0) / vw) * 1000
  const VH = 1000 / aspect
  const Y = (v: number) => ((v - v0) / vh) * VH
  const px = size.w > 0 ? 1000 / size.w : 1
  const d = path.map((p, i) => (i ? "L" : "M") + X(p.u).toFixed(1) + " " + Y(p.v).toFixed(1)).join("")
  return (
    <div ref={wrap} className="kmm-footmap" data-ready={ready ? "1" : "0"} aria-hidden="true">
      <canvas ref={cv} className="kmm-canvas" style={{ width: size.w + "px", height: size.h + "px" }} />
      <svg className="kmm-map-svg" viewBox={"0 0 1000 " + VH.toFixed(1)}>
        <path d={d} className="kmm-route-case" strokeWidth={6 * px} />
        <path d={d} className="kmm-route" strokeWidth={2.4 * px} strokeDasharray={7 * px + " " + 4 * px} />
        {end ? (
          <g className="kmm-town" transform={"translate(" + X(end.at[0]).toFixed(1) + " " + Y(end.at[1]).toFixed(1) + ")"}>
            <circle r={6 * px} strokeWidth={2.4 * px} />
          </g>
        ) : null}
      </svg>
    </div>
  )
}

/* ---------- departures and the hold form ---------- */

function SpotsMeter({ d, held }: { d: KammDeparture; held: number }) {
  const cells = [] as React.ReactNode[]
  for (let i = 0; i < d.capacity; i++) cells.push(<i key={i} className={i < d.booked ? "kmm-taken" : i < d.booked + held ? "kmm-mine" : ""} />)
  return (
    <span className="kmm-meter" aria-hidden="true">
      {cells}
    </span>
  )
}

function Stepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="kmm-stepper" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="One fewer">
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2 6h8" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </button>
      <output aria-live="polite">{value}</output>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="One more">
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2 6h8M6 2v8" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </button>
    </div>
  )
}

/** A hut stamp, the way huts ink their books: ring text around a small ridge. */
function Stamp({ hut, alt, date, sep }: { hut: string; alt?: number; date: string; sep: string }) {
  const id = React.useId().replace(/:/g, "")
  // the ring reads hut, height, then a dot that marks where it starts again
  const text = (hut + (alt ? "  \u00b7  " + fmtNum(alt, sep) + " m" : "") + "  \u00b7  ").toUpperCase()
  return (
    <svg className="kmm-stamp" width="104" height="104" viewBox="0 0 104 104" aria-hidden="true">
      <defs>
        <path id={id} d="M52 52m-38 0a38 38 0 1 1 76 0a38 38 0 1 1 -76 0" />
      </defs>
      <circle cx="52" cy="52" r="49" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="52" cy="52" r="29" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <text fontSize={Math.min(10, 330 / Math.max(10, text.length))} fill="currentColor">
        <textPath href={"#" + id} startOffset="0" textLength="236" lengthAdjust="spacing">
          {text}
        </textPath>
      </text>
      <path d="M36 56 45 43l4 5 4-8 12 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <text x="52" y="69" fontSize="7.6" textAnchor="middle" fill="currentColor">
        {date}
      </text>
    </svg>
  )
}

/** A guide's mark: a bezel of ticks like a map's compass ring, a summit, and their initials. */
function Avatar({ g }: { g: KammGuide }) {
  const ticks = [] as React.ReactNode[]
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2
    const r0 = i % 4 === 0 ? 34 : 37
    ticks.push(<line key={i} x1={44 + Math.cos(a) * r0} y1={44 + Math.sin(a) * r0} x2={44 + Math.cos(a) * 40} y2={44 + Math.sin(a) * 40} strokeWidth={i % 4 === 0 ? 1.4 : 0.8} />)
  }
  return (
    <span className="kmm-avatar">
      {g.image ? (
        <img src={g.image} alt={g.imageAlt || g.name} width={160} height={160} loading="lazy" />
      ) : (
        <>
          <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden="true">
            <circle cx="44" cy="44" r="42.5" className="kmm-av-ring" />
            <g className="kmm-av-ticks">{ticks}</g>
            <path d="M44 22 50 32H38z" className="kmm-av-peak" />
          </svg>
          <b aria-hidden="true">{initials(g.name)}</b>
        </>
      )}
    </span>
  )
}

/* ---------- the page ---------- */

const DEFAULT_NAV: KammLink[] = [
  { label: "Route", href: "#route" },
  { label: "Huts", href: "#huts" },
  { label: "Included", href: "#included" },
  { label: "Dates", href: "#departures" },
  { label: "Questions", href: "#faq" },
]

const SECTIONS = ["route", "huts", "included", "departures", "reviews", "faq"]

function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export default function KammTrekLanding({
  brand = "Kamm",
  tagline = "Guided hut treks",
  nav = DEFAULT_NAV,
  height = "100svh",
  preset = "summer",
  theme = "system",
  themeToggle = true,
  accent,
  seed = 7,
  contourInterval = 50,
  hero = {},
  route = {},
  huts = {},
  included = {},
  departures = {},
  reviews = {},
  guides = {},
  faq = {},
  footer = {},
  labels = {},
}: KammTrekLandingProps) {
  const t = { ...DEFAULT_LABELS, ...labels }
  const uid = React.useId().replace(/:/g, "")
  const root = React.useRef(null as HTMLDivElement | null)
  const heroRef = React.useRef(null as HTMLElement | null)
  const [dark, setDark] = useTheme(theme)
  const reduced = useReduced()
  useReveal(root, reduced)
  const sep = ","
  const sceneKey = preset + (dark ? "-night" : "-day")
  const start = route.start || DEFAULT_START
  const stages = route.stages && route.stages.length ? route.stages : DEFAULT_STAGES
  const peaks = route.peaks || DEFAULT_PEAKS
  const trekName = route.name || "Rotgrat Traverse"
  const path = React.useMemo(() => trailPath(start, stages, seed), [start, stages, seed])
  const totals = routeTotals(start, stages)
  const starts = stageStarts(stages)
  const live = hero.live === undefined ? { stage: 2, label: "Group 14 sleeps here tonight" } : hero.live
  const currency = departures.currency || "CHF"
  const deps = departures.items || DEFAULT_DEPARTURES
  const sid = (k: string) => "kmm-" + uid + "-" + k

  /* --- nav --- */
  const [solid, setSolid] = React.useState(false)
  const [menu, setMenu] = React.useState(false)
  const menuBtn = React.useRef(null as HTMLButtonElement | null)
  const sheet = React.useRef(null as HTMLDivElement | null)
  React.useEffect(() => {
    const el = heroRef.current
    if (!el || typeof IntersectionObserver === "undefined") return
    const io = new IntersectionObserver((es) => setSolid(!es[0].isIntersecting), { rootMargin: "-72px 0px 0px 0px", threshold: 0 })
    const s = el.querySelector(".kmm-sentinel")
    if (s) io.observe(s)
    return () => io.disconnect()
  }, [])
  React.useEffect(() => {
    if (!menu) return
    const html = document.documentElement
    const was = html.style.overflow
    html.style.overflow = "hidden"
    const first = sheet.current ? (sheet.current.querySelector("a,button") as HTMLElement | null) : null
    if (first) first.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(false)
        if (menuBtn.current) menuBtn.current.focus()
      }
      if (e.key === "Tab" && sheet.current) {
        const f = Array.from(sheet.current.querySelectorAll("a,button")) as HTMLElement[]
        if (!f.length) return
        const a = f[0]
        const b = f[f.length - 1]
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault()
          b.focus()
        } else if (!e.shiftKey && document.activeElement === b) {
          e.preventDefault()
          a.focus()
        }
      }
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("keydown", onKey)
      html.style.overflow = was
    }
  }, [menu])

  const go = (key: string) => {
    const el = document.getElementById(sid(key))
    if (el) el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" })
  }
  const linkProps = (l: KammLink) => {
    const k = l.href && l.href.charAt(0) === "#" ? l.href.slice(1) : ""
    if (k && SECTIONS.indexOf(k) > -1)
      return {
        href: "#" + sid(k),
        onClick: (e: React.MouseEvent) => {
          e.preventDefault()
          setMenu(false)
          go(k)
        },
      }
    return { href: l.href || "#" }
  }

  /* --- the route: one kilometre value drives the map, the profile and the day card --- */
  const [km, setKm] = React.useState(() => starts[Math.min(2, stages.length - 1)] + stages[Math.min(2, stages.length - 1)].km * 0.52)
  const kmRef = React.useRef(km)
  kmRef.current = km
  const anim = React.useRef(0)
  React.useEffect(() => {
    const total = starts[starts.length - 1]
    if (kmRef.current > total) setKm(total)
  }, [starts])
  const scrub = (k: number) => {
    cancelAnimationFrame(anim.current)
    setKm(k)
  }
  const glide = (to: number) => {
    cancelAnimationFrame(anim.current)
    if (reduced || typeof requestAnimationFrame === "undefined") return setKm(to)
    const from = kmRef.current
    const t0 = performance.now()
    const dur = Math.min(700, 320 + Math.abs(to - from) * 10)
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / dur)
      setKm(from + (to - from) * easeInOut(t))
      if (t < 1) anim.current = requestAnimationFrame(step)
    }
    anim.current = requestAnimationFrame(step)
  }
  React.useEffect(() => () => cancelAnimationFrame(anim.current), [])
  const at = locate(stages, km)
  const active = at.i
  const st = stages[active]
  const fromAlt = active === 0 ? start.alt : stages[active - 1].alt
  const stats = stageStats(fromAlt, st)
  const walker = trailAt(path, active, at.f)
  const pickDay = (i: number, instant = false) => (instant ? scrub : glide)(starts[i] + stages[i].km * 0.999)
  const tabs = React.useRef(null as HTMLDivElement | null)
  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    const n = nextIndex(i, e.key, stages.length)
    if (n === i) return
    e.preventDefault()
    pickDay(n, true)
    const b = tabs.current ? (tabs.current.querySelectorAll("button")[n] as HTMLElement | undefined) : undefined
    if (b) b.focus()
  }

  /* --- huts --- */
  const hutList = stages.map((s, i) => ({ s, i })).filter((h) => !!h.s.sleep)
  const [hutOn, setHutOn] = React.useState(Math.min(2, Math.max(0, hutList.length - 1)))
  const hut = hutList[Math.min(hutOn, hutList.length - 1)]

  /* --- departures --- */
  const months = Array.from(new Set(deps.map((d) => monthKey(d.start))))
  const [month, setMonth] = React.useState("")
  const [held, setHeld] = React.useState({} as { [id: string]: number })
  const [sel, setSel] = React.useState(() => {
    const open = deps.find((d) => spotsLeft(d) > 0)
    return open ? open.id : deps[0] ? deps[0].id : ""
  })
  const [people, setPeople] = React.useState(2)
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [errors, setErrors] = React.useState({} as { [k: string]: string })
  const [status, setStatus] = React.useState("idle" as "idle" | "sending" | "done" | "error")
  const [done, setDone] = React.useState(null as null | { d: KammDeparture; people: number; email: string; wait: boolean })
  const chosen = deps.find((d) => d.id === sel) || deps[0]
  const left = chosen ? spotsLeft(chosen, held[chosen.id] || 0) : 0
  const waitlist = left === 0
  const maxPeople = waitlist ? 4 : Math.min(4, left)
  React.useEffect(() => {
    if (people > maxPeople) setPeople(Math.max(1, maxPeople))
  }, [maxPeople, people])
  const shown = deps.filter((d) => !month || monthKey(d.start) === month)
  const formRef = React.useRef(null as HTMLFormElement | null)
  const choose = (d: KammDeparture) => {
    setSel(d.id)
    setStatus("idle")
    setDone(null)
    setErrors({})
    if (typeof matchMedia === "function" && matchMedia("(max-width: 1023px)").matches && formRef.current)
      formRef.current.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" })
  }
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chosen) return
    const err: { [k: string]: string } = {}
    if (!name.trim()) err.name = t.errName
    if (!isEmail(email)) err.email = t.errEmail
    setErrors(err)
    if (Object.keys(err).length) {
      const f = formRef.current ? (formRef.current.querySelector(err.name ? "input[name=name]" : "input[name=email]") as HTMLInputElement | null) : null
      if (f) f.focus()
      return
    }
    setStatus("sending")
    let ok = true
    try {
      const res = departures.onHold ? await departures.onHold({ departure: chosen, people, name: name.trim(), email: email.trim() }) : undefined
      if (res === false) ok = false
    } catch {
      ok = false
    }
    if (!ok) return setStatus("error")
    if (!waitlist) setHeld((h) => ({ ...h, [chosen.id]: (h[chosen.id] || 0) + people }))
    setDone({ d: chosen, people, email: email.trim(), wait: waitlist })
    setStatus("done")
  }

  /* --- faq --- */
  const [open, setOpen] = React.useState(0)

  const heroTitle = hero.title || "Six days on the ridge, hut to hut."
  const heroText = hero.text || "Walk 74 km of the Rotgrat with a mountain guide, sleep in five staffed huts, and send your duffel ahead by cable car."
  const cta = hero.cta || "Check dates"
  const accentStyle = accent ? { ["--kmm-accent" as string]: accent } : {}
  const legend = included.items || DEFAULT_LEGEND
  const excluded = included.excluded || DEFAULT_EXCLUDED
  const quotes = reviews.items || DEFAULT_REVIEWS
  const team = guides.items || DEFAULT_GUIDES
  const questions = faq.items || DEFAULT_FAQ
  const firstOpen = deps.find((d) => spotsLeft(d) > 0)
  const hutAlts = hutList.map((h) => h.s.alt)
  // the rule above each section: a map-sheet edge whose note is a real fact about that section
  const collar = {
    route: trekName + ", " + fmtKm(totals.km) + " km, 1:50\u00a0000",
    huts: hutList.length + " " + (hutList.length === 1 ? "hut" : "huts") + (hutAlts.length ? ", " + fmtNum(Math.min(...hutAlts), sep) + " to " + fmtNum(Math.max(...hutAlts), sep) + " m" : ""),
    included: stages.length + " " + t.days.toLowerCase() + ", one price",
    departures: deps.length + " departures" + (months.length ? ", " + months[0] + " to " + months[months.length - 1] : ""),
    reviews: quotes.length + " entries, " + new Set(quotes.map((q) => q.hut)).size + " huts",
    faq: questions.length + " questions",
  }
  const end = stages[stages.length - 1]

  return (
    <div
      ref={root}
      className="kmm-root"
      data-theme={dark ? "dark" : "light"}
      data-preset={preset}
      data-reduced={reduced ? "1" : "0"}
      style={{ ["--kmm-h" as string]: height, ...accentStyle }}
    >
      <style>{KMM_CSS}</style>
      <a className="kmm-skip" href={"#" + sid("main")}>
        {t.skip}
      </a>
      <header className={"kmm-nav" + (solid ? " kmm-nav-solid" : "")}>
        <a className="kmm-brand" href={"#" + sid("top")} onClick={(e) => { e.preventDefault(); if (root.current) root.current.scrollIntoView({ behavior: reduced ? "auto" : "smooth" }) }}>
          <Mark />
          <b>{brand}</b>
          <span>{tagline}</span>
        </a>
        <nav className="kmm-links" aria-label="Main">
          {nav.map((l) => (
            <a key={l.label} {...linkProps(l)}>
              <span data-text={l.label}>{l.label}</span>
            </a>
          ))}
        </nav>
        <div className="kmm-navend">
          {themeToggle ? (
            <button type="button" className="kmm-themebtn" onClick={() => setDark(!dark)} aria-label={dark ? "Switch to the day map" : "Switch to the night map"}>
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <circle cx="9" cy="9" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path d="M9 2.5a6.5 6.5 0 0 1 0 13z" fill="currentColor" />
              </svg>
            </button>
          ) : null}
          <a className="kmm-btn kmm-btn-solid kmm-navcta" {...linkProps({ label: cta, href: "#departures" })}>
            <Waymark />
            <span>{cta}</span>
          </a>
          <button ref={menuBtn} type="button" className="kmm-menubtn" aria-expanded={menu} aria-controls={sid("menu")} onClick={() => setMenu(true)}>
            {t.menu}
          </button>
        </div>
      </header>
      {menu ? (
        <div className="kmm-sheet" id={sid("menu")} role="dialog" aria-modal="true" aria-label="Menu" ref={sheet}>
          <div className="kmm-sheet-top">
            <span className="kmm-brand">
              <Mark />
              <b>{brand}</b>
            </span>
            <button type="button" className="kmm-menubtn kmm-menuclose" onClick={() => { setMenu(false); if (menuBtn.current) menuBtn.current.focus() }}>
              {t.close}
            </button>
          </div>
          <nav aria-label="Menu links">
            {nav.map((l, i) => (
              <a key={l.label} {...linkProps(l)} style={{ animationDelay: i * 45 + "ms" }}>
                {l.label}
              </a>
            ))}
          </nav>
          <a className="kmm-btn kmm-btn-solid" {...linkProps({ label: cta, href: "#departures" })}>
            <Waymark />
            <span>{cta}</span>
          </a>
        </div>
      ) : null}

      <section ref={heroRef} className="kmm-hero" id={sid("top")} aria-labelledby={sid("h1")}>
        <HeroScene seed={seed} sceneKey={sceneKey} stages={stages} path={path} live={live} sep={sep} image={hero.image} imageAlt={hero.imageAlt} photoTrail={hero.trail} dayWord={t.day} onPick={(i) => { pickDay(i); go("route") }} />
        <div className="kmm-scrim" aria-hidden="true" />
        <div className="kmm-hero-copy">
          <div className="kmm-hero-text">
            <h1 id={sid("h1")} className="kmm-in" style={{ animationDelay: "120ms" }}>
              {heroTitle}
            </h1>
            <p className="kmm-in" style={{ animationDelay: "220ms" }}>
              {heroText}
            </p>
          </div>
          <div className="kmm-hero-actions kmm-in" style={{ animationDelay: "320ms" }}>
            <a className="kmm-btn kmm-btn-solid kmm-btn-lg" {...linkProps({ label: cta, href: "#departures" })}>
              <Waymark />
              <span>{cta}</span>
              <Arrow />
            </a>
            <a className="kmm-btn kmm-btn-ghost kmm-btn-lg" {...linkProps({ label: "", href: "#route" })}>
              <span>{hero.secondary || "See the route"}</span>
            </a>
          </div>
        </div>
        <span className="kmm-sentinel" aria-hidden="true" />
      </section>

      <main id={sid("main")} tabIndex={-1} className="kmm-main">
        <section className="kmm-sec kmm-route-sec" id={sid("route")} aria-labelledby={sid("route-h")}>
          <Collar grid="A1" note={collar.route} />
          <div className="kmm-head kmm-rv">
            <h2 id={sid("route-h")}>{route.title || totals.km + " km, five huts, one ridge."}</h2>
            <p>{route.text || "Every day ends at a staffed hut with dinner on the table. Move along the profile, or pick a day, to see where you will be."}</p>
          </div>
          <dl className="kmm-totals kmm-rv">
            <div>
              <dt>{t.distance}</dt>
              <dd>
                {fmtKm(totals.km)}
                <small> km</small>
              </dd>
            </div>
            <div>
              <dt>{t.ascent}</dt>
              <dd>
                {fmtNum(totals.up, sep)}
                <small> m</small>
              </dd>
            </div>
            <div>
              <dt>{t.highest}</dt>
              <dd>
                {fmtNum(totals.high, sep)}
                <small> m</small>
              </dd>
            </div>
            <div>
              <dt>{t.days}</dt>
              <dd>{totals.days}</dd>
            </div>
          </dl>
          <div className="kmm-routegrid">
            <div className="kmm-mapframe">
              <RouteMap seed={seed} printKey={sceneKey} interval={contourInterval} start={start} stages={stages} path={path} peaks={peaks} pos={walker} active={active} name={trekName} sep={sep} />
              <span className="kmm-sheetname" aria-hidden="true">
                {trekName} <i>1:50 000</i>
              </span>
            </div>
            <article className="kmm-day" aria-live="polite" aria-atomic="true">
              <p className="kmm-dayno">
                {fill(t.dayOf, { n: active + 1, total: stages.length })}
              </p>
              <h3>{st.title}</h3>
              <div className="kmm-sign">
                <Waymark />
                <span className="kmm-sign-plate">
                  <b>{st.to}</b>
                  <span>{fmtNum(st.alt, sep)} m</span>
                </span>
                <span className="kmm-sign-time">{st.hours}</span>
              </div>
              <dl className="kmm-daystats">
                <div>
                  <dt>{t.distance}</dt>
                  <dd>{fmtKm(st.km)} km</dd>
                </div>
                <div>
                  <dt>{t.up}</dt>
                  <dd>{fmtNum(stats.up, sep)} m</dd>
                </div>
                <div>
                  <dt>{t.down}</dt>
                  <dd>{fmtNum(stats.down, sep)} m</dd>
                </div>
              </dl>
              <p className="kmm-daytext">{st.text}</p>
              {st.sleep ? (
                <p className="kmm-sleep">
                  <HutMark size={13} />
                  <span>
                    {st.sleep}
                    {". "}
                    {st.duffel ? t.duffelWaiting : ""}
                  </span>
                </p>
              ) : (
                <p className="kmm-sleep">
                  <span className="kmm-endmark" aria-hidden="true" />
                  <span>{fill(t.end, { alt: fmtNum(st.alt, sep) })}</span>
                </p>
              )}
            </article>
          </div>
          <div className="kmm-profilewrap">
            <div className="kmm-tabs" role="tablist" aria-label="Day" ref={tabs} style={{ ["--kmm-n" as string]: stages.length }}>
              {stages.map((s, i) => (
                <button key={i} type="button" role="tab" aria-selected={i === active} tabIndex={i === active ? 0 : -1} onClick={() => pickDay(i)} onKeyDown={(e) => onTabKey(e, i)}>
                  <b>
                    {t.day} {i + 1}
                  </b>
                  <span>{s.to}</span>
                </button>
              ))}
            </div>
            <Profile start={start} stages={stages} km={km} active={active} onScrub={scrub} sep={sep} reduced={reduced} dayWord={t.day} />
          </div>
        </section>

        {hut ? (
          <section className="kmm-sec kmm-huts" id={sid("huts")} aria-labelledby={sid("huts-h")}>
            <Collar grid="B2" note={collar.huts} />
            <div className="kmm-head kmm-rv">
              <h2 id={sid("huts-h")}>{huts.title || "Where you sleep."}</h2>
              <p>{huts.text || "Five staffed huts, all booked before you arrive. Dinner is at seven, lights out at ten, and breakfast is waiting at six."}</p>
            </div>
            <div className="kmm-hutgrid">
              <div className="kmm-hutview">
                <Excerpt key={hut.i + sceneKey} seed={seed} printKey={sceneKey} stage={hut.s} path={path} index={0} sep={sep} />
                <p className="kmm-hutcap">
                  <b>{hut.s.to}</b> {hut.s.image ? "" : t.mapNote + " "}
                  {fill(t.hutCaption, { n: hut.i + 1, hours: hut.s.hours })}
                </p>
              </div>
              <ol className="kmm-hutlist">
                {hutList.map((h, n) => (
                  <li key={h.i}>
                    <button type="button" aria-pressed={n === hutOn} onClick={() => setHutOn(n)} onMouseEnter={() => setHutOn(n)} onFocus={() => setHutOn(n)}>
                      <span className="kmm-hutnight">
                        {t.night} {h.i + 1}
                      </span>
                      <span className="kmm-hutname">{h.s.to}</span>
                      <span className="kmm-hutalt">{fmtNum(h.s.alt, sep)} m</span>
                      <span className="kmm-hutsleep">
                        {h.s.sleep}
                        {h.s.duffel ? <em>{t.duffelHere}</em> : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        ) : null}

        <section className="kmm-sec kmm-incl" id={sid("included")} aria-labelledby={sid("incl-h")}>
          <Collar grid="C3" note={collar.included} />
          <div className="kmm-incl-lead kmm-rv">
            <p className="kmm-figure" aria-hidden="true">
              {included.figure || "6 kg"}
            </p>
            <h2 id={sid("incl-h")}>{included.title || "is all you carry. The rest is arranged."}</h2>
            <p>{included.text || "One price covers the guide, the huts, the food and every lift on the route. This is the legend for the week."}</p>
          </div>
          <ul className="kmm-legend">
            {legend.map((it, i) => (
              <li key={it.title} className="kmm-rv" style={{ transitionDelay: (i % 2) * 60 + "ms" }}>
                <LegendSymbol kind={it.symbol} />
                <div>
                  <h3>{it.title}</h3>
                  <p>{it.text}</p>
                </div>
              </li>
            ))}
          </ul>
          {excluded.length ? (
            <div className="kmm-excl">
              <h3>{t.notIncluded}</h3>
              <ul>
                {excluded.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <section className="kmm-sec kmm-deps" id={sid("departures")} aria-labelledby={sid("deps-h")}>
          <Collar grid="D4" note={collar.departures} />
          <div className="kmm-head kmm-rv">
            <h2 id={sid("deps-h")}>{departures.title || "Summer 2027 departures."}</h2>
            <p>{departures.text || "Groups of up to 10 with one guide. " + currency + " 2,480 per person with half board and hut fees. A deposit of " + currency + " 500 confirms your place."}</p>
          </div>
          <div className="kmm-depgrid">
            <div className="kmm-deplist">
              <div className="kmm-filter" role="radiogroup" aria-label="Month">
                {["", ...months].map((m) => (
                  <button key={m || "all"} type="button" role="radio" aria-checked={month === m} onClick={() => setMonth(m)}>
                    {m || t.allMonths}
                  </button>
                ))}
              </div>
              <ul className="kmm-rows">
                {shown.map((d) => {
                  const l = spotsLeft(d, held[d.id] || 0)
                  const on = d.id === sel
                  return (
                    <li key={d.id} className={(on ? "kmm-row-on " : "") + (l === 0 && !held[d.id] ? "kmm-row-full" : "")}>
                      <button type="button" className="kmm-row" aria-pressed={on} onClick={() => choose(d)}>
                        <span className="kmm-row-date">
                          <b>{dateRange(d.start, stages.length)}</b>
                          <span>
                            {fill(t.withGuide, { weekday: weekday(d.start), guide: d.guide })}
                            {d.note ? <em>{d.note}</em> : null}
                          </span>
                        </span>
                        <span className="kmm-row-spots">
                          <SpotsMeter d={d} held={held[d.id] || 0} />
                          <span>{held[d.id] ? <b className="kmm-held">{fill(t.heldRow, { n: held[d.id] })}</b> : null}
                            {held[d.id] && l === 0 ? null : l === 0 ? t.full : l === 1 ? t.placeLeft : fill(t.placesLeft, { n: l })}</span>
                        </span>
                        <span className="kmm-row-price">{formatPrice(d.price, currency)}</span>
                        <span className="kmm-row-go" aria-hidden="true">
                          <Arrow />
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
            {chosen ? (
              <form className="kmm-form" ref={formRef} onSubmit={submit} noValidate aria-labelledby={sid("form-h")}>
                {status === "done" && done ? (
                  <div className="kmm-done" role="status">
                    <Stamp hut={done.wait ? "Waitlist " + trekName : trekName} date={dayMonth(done.d.start)} sep={sep} />
                    <h3 id={sid("form-h")}>{done.wait ? t.waitDoneTitle : t.heldTitle}</h3>
                    <p>
                      {done.wait
                        ? fill(t.waitText, { email: done.email, places: done.people === 1 ? "a place" : done.people + " places", dates: dateRange(done.d.start, stages.length) })
                        : fill(t.heldText, { places: done.people === 1 ? "One place" : done.people + " places", dates: dateRange(done.d.start, stages.length), guide: done.d.guide, are: done.people === 1 ? "is" : "are", email: done.email })}
                    </p>
                    <button type="button" className="kmm-btn kmm-btn-ghost" onClick={() => { setStatus("idle"); setDone(null) }}>
                      {t.holdAnother}
                    </button>
                  </div>
                ) : (
                  <>
                    <h3 id={sid("form-h")}>{waitlist ? t.waitTitle : t.holdTitle}</h3>
                    <p className="kmm-form-sum">
                      <b>{dateRange(chosen.start, stages.length)}</b>
                      <span>
                        {trekName}, {fill(t.withGuide, { weekday: weekday(chosen.start), guide: chosen.guide })}. {waitlist ? t.full + "." : left === 1 ? t.placeLeft + "." : fill(t.placesLeft, { n: left }) + "."}
                      </span>
                    </p>
                    <div className="kmm-field">
                      <span className="kmm-label" id={sid("ppl")}>
                        {t.people}
                      </span>
                      <Stepper value={people} min={1} max={maxPeople} onChange={setPeople} label={t.people} />
                    </div>
                    <label className="kmm-field">
                      <span className="kmm-label">{t.nameField}</span>
                      <input name="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" aria-invalid={!!errors.name} aria-describedby={errors.name ? sid("e-name") : undefined} />
                      {errors.name ? (
                        <span className="kmm-err" id={sid("e-name")}>
                          {errors.name}
                        </span>
                      ) : null}
                    </label>
                    <label className="kmm-field">
                      <span className="kmm-label">{t.emailField}</span>
                      <input name="email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? sid("e-email") : undefined} />
                      {errors.email ? (
                        <span className="kmm-err" id={sid("e-email")}>
                          {errors.email}
                        </span>
                      ) : null}
                    </label>
                    {!waitlist ? (
                      <p className="kmm-total">
                        <span>
                          {people} x {formatPrice(chosen.price, currency)}
                        </span>
                        <b>{formatPrice(chosen.price * people, currency)}</b>
                      </p>
                    ) : null}
                    <button type="submit" className="kmm-btn kmm-btn-solid kmm-btn-lg kmm-btn-block" disabled={status === "sending"}>
                      <Waymark />
                      <span>{status === "sending" ? t.sending : waitlist ? t.waitButton : people === 1 ? t.holdOne : fill(t.holdMany, { n: people })}</span>
                    </button>
                    {status === "error" ? (
                      <p className="kmm-err" role="alert">
                        {t.errSend}
                      </p>
                    ) : (
                      <p className="kmm-fine">{t.fine}</p>
                    )}
                  </>
                )}
              </form>
            ) : null}
          </div>
        </section>

        <section className="kmm-sec kmm-book" id={sid("reviews")} aria-labelledby={sid("book-h")}>
          <Collar grid="E5" note={collar.reviews} />
          <div className="kmm-head kmm-rv">
            <h2 id={sid("book-h")}>{reviews.title || "From the hut books."}</h2>
          </div>
          <ul className="kmm-entries">
            {quotes.map((q, i) => (
              <li key={q.name + i} className="kmm-entry kmm-rv">
                <Stamp hut={q.hut} alt={q.alt} date={q.date} sep={sep} />
                <blockquote>
                  <p>{q.quote}</p>
                </blockquote>
                <p className="kmm-who">
                  <b>{q.name}</b> {q.from}
                </p>
              </li>
            ))}
          </ul>
          {team.length ? (
            <div className="kmm-guides">
              <h3>{guides.title || "Your guides"}</h3>
              <ul>
                {team.map((g) => (
                  <li key={g.name}>
                    <Avatar g={g} />
                    <div>
                      <b>{g.name}</b>
                      <span className="kmm-role">{g.role}</span>
                      <p>{g.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <section className="kmm-sec kmm-faq" id={sid("faq")} aria-labelledby={sid("faq-h")}>
          <Collar grid="F6" note={collar.faq} />
          <div className="kmm-head kmm-rv">
            <h2 id={sid("faq-h")}>{faq.title || "Before you book."}</h2>
            <p>
              {t.askBefore}{" "}
              <a href={"mailto:" + (footer.email || "trek@kamm.example")}>{footer.email || "trek@kamm.example"}</a>. {t.askAfter}
            </p>
          </div>
          <div className="kmm-qs">
            {questions.map((q, i) => (
              <div key={q.q} className={"kmm-q" + (open === i ? " kmm-q-on" : "")}>
                <h3>
                  <button type="button" aria-expanded={open === i} aria-controls={sid("a" + i)} id={sid("q" + i)} onClick={() => setOpen(open === i ? -1 : i)}>
                    <span>{q.q}</span>
                    <i aria-hidden="true" />
                  </button>
                </h3>
                <div className="kmm-a" id={sid("a" + i)} role="region" aria-labelledby={sid("q" + i)} hidden={open !== i}>
                  <p>{q.a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="kmm-foot">
        <div className="kmm-foot-top">
        <FooterMap seed={seed} printKey={sceneKey} interval={contourInterval} stages={stages} path={path} />
        <div className="kmm-foot-cta">
          <p className="kmm-foot-title">{footer.title || (firstOpen ? fill(t.nextGroup, { start: start.name, date: dayMonth(firstOpen.start) }) : t.noNext)}</p>
          <a className="kmm-btn kmm-btn-solid kmm-btn-lg" {...linkProps({ label: cta, href: "#departures" })}>
            <Waymark />
            <span>{cta}</span>
            <Arrow />
          </a>
        </div>
        </div>
        <div className="kmm-collar">
          <div className="kmm-collar-brand">
            <span className="kmm-brand">
              <Mark />
              <b>{brand}</b>
            </span>
            <p>{footer.note || "Guided hut treks on the Rotgrat, from " + start.name + " to " + (end ? end.to : "") + ", every summer since 2014."}</p>
          </div>
          <nav className="kmm-collar-links" aria-label="Footer">
            {(footer.links || nav).map((l) => (
              <a key={l.label} {...linkProps(l)}>
                {l.label}
              </a>
            ))}
          </nav>
          <address className="kmm-collar-contact">
            {(footer.address || ["Kamm Bergführer GmbH", "Via Principala 12", "7550 Valpiana"]).map((a) => (
              <span key={a}>{a}</span>
            ))}
            <a href={"mailto:" + (footer.email || "trek@kamm.example")}>{footer.email || "trek@kamm.example"}</a>
            <a href={"tel:" + (footer.phone || "+41 81 555 01 40").replace(/\s/g, "")}>{footer.phone || "+41 81 555 01 40"}</a>
          </address>
        </div>
        <div className="kmm-margin" aria-hidden="true">
          <span className="kmm-scalebar">
            <i />
            <i />
            <i />
            <i />
            <em>0</em>
            <em>2 km</em>
          </span>
          <span>{trekName}, sheet 1 of 1</span>
          <span>{t.disclaimer}</span>
          <span>
            {brand} {new Date().getFullYear()}
          </span>
        </div>
      </footer>
    </div>
  )
}

/* ---------- styles: scoped to .kmm-root, map-sheet tokens, no globals ---------- */

const KMM_CSS = `
.kmm-root{--kmm-bg:#f6f7f4;--kmm-sheet:#ffffff;--kmm-ink:#14211f;--kmm-soft:#2b3936;--kmm-muted:#55625e;--kmm-rule:rgba(20,33,31,.14);--kmm-faint:rgba(20,33,31,.05);--kmm-accent:#cf2a2f;--kmm-accent-ink:#ffffff;--kmm-accent-text:#c0262b;--kmm-contour:#9a6a3c;--kmm-ice:#3d7fb5;--kmm-pad:clamp(72px,9vw,128px);--kmm-gut:clamp(16px,4vw,48px);--kmm-ease:cubic-bezier(.23,1,.32,1);--kmm-sans:"Frutiger","Frutiger LT Std","Avenir Next","Avenir","Helvetica Neue",Helvetica,Arial,sans-serif;position:relative;min-height:var(--kmm-h);background:var(--kmm-bg);color:var(--kmm-ink);font-family:var(--kmm-sans);font-size:17px;line-height:1.55;overflow-x:clip;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;color-scheme:light}
.kmm-root[data-theme="dark"]{--kmm-bg:#0d1517;--kmm-sheet:#131d20;--kmm-ink:#e8eeec;--kmm-soft:#c9d3d0;--kmm-muted:#9eada9;--kmm-rule:rgba(232,238,236,.15);--kmm-faint:rgba(232,238,236,.05);--kmm-accent:#d8343a;--kmm-accent-text:#ff7a7d;--kmm-contour:#c39a6b;--kmm-ice:#8cbfe8;color-scheme:dark}
.kmm-root[data-preset="winter"]{--kmm-bg:#f3f6f9;--kmm-contour:#4f7cae;--kmm-ink:#121c2a;--kmm-soft:#2a3646;--kmm-muted:#526073;--kmm-rule:rgba(18,28,42,.14);--kmm-faint:rgba(18,28,42,.05)}
.kmm-root[data-preset="winter"][data-theme="dark"]{--kmm-bg:#0b111b;--kmm-sheet:#111a27;--kmm-ink:#e6edf6;--kmm-soft:#c7d2e0;--kmm-muted:#98a7ba;--kmm-rule:rgba(230,237,246,.15);--kmm-faint:rgba(230,237,246,.05);--kmm-contour:#8fb3dd}
.kmm-root :where(h1,h2,h3,p,ul,ol,dl,dd,dt,blockquote,address){margin:0;padding:0;font:inherit}
.kmm-root :where(ul,ol){list-style:none}
.kmm-root :where(button,input,output){font:inherit;color:inherit;letter-spacing:inherit}
.kmm-root :where(button){background:none;border:0;padding:0;cursor:pointer;text-align:inherit}
.kmm-root :where(a){color:inherit;text-decoration:none}
.kmm-root :where(address){font-style:normal}
.kmm-root img,.kmm-root canvas,.kmm-root svg{max-width:none}
.kmm-root ::selection{background:var(--kmm-accent);color:var(--kmm-accent-ink)}
.kmm-root :focus-visible{outline:2px solid var(--kmm-accent);outline-offset:3px}
.kmm-skip{position:absolute;left:12px;top:-60px;z-index:80;background:var(--kmm-ink);color:var(--kmm-bg);padding:10px 14px;border-radius:4px;font-weight:600;transition:top .2s var(--kmm-ease)}
.kmm-skip:focus{top:12px}

.kmm-nav{position:sticky;top:0;z-index:30;height:68px;display:flex;align-items:center;gap:28px;padding:0 var(--kmm-gut);color:#fff;border-bottom:1px solid transparent;transition:background-color .28s ease,color .28s ease,border-color .28s ease}
.kmm-nav-solid{background:var(--kmm-bg);color:var(--kmm-ink);border-bottom-color:var(--kmm-rule)}
.kmm-nav :focus-visible{outline-color:currentColor}
.kmm-brand{display:inline-flex;align-items:center;gap:10px;white-space:nowrap}
.kmm-brand b{font-size:21px;font-weight:700;letter-spacing:-.02em}
.kmm-brand span{font-size:13px;opacity:.78;padding-left:10px;border-left:1px solid currentColor;line-height:1.1}
.kmm-mark{display:block}
.kmm-links{display:flex;gap:26px;margin-left:auto;font-size:15px}
.kmm-links a{position:relative;padding:6px 0}
.kmm-links a::after{content:"";position:absolute;left:0;right:0;bottom:2px;height:1.5px;background:currentColor;transform:scaleX(0);transform-origin:right;transition:transform .32s var(--kmm-ease)}
.kmm-links a:hover::after,.kmm-links a:focus-visible::after{transform:scaleX(1);transform-origin:left}
.kmm-navend{display:flex;align-items:center;gap:10px}
.kmm-themebtn{width:38px;height:38px;display:grid;place-items:center;border-radius:4px;border:1px solid currentColor;opacity:.85;transition:opacity .2s ease,transform .16s ease}
.kmm-themebtn:hover{opacity:1}
.kmm-themebtn:active{transform:scale(.95)}
.kmm-themebtn svg{transition:transform .5s var(--kmm-ease)}
.kmm-themebtn:hover svg{transform:rotate(180deg)}
.kmm-menubtn{display:none;height:38px;padding:0 14px;border:1px solid currentColor;border-radius:4px;font-size:15px;font-weight:600}
.kmm-navcta{height:38px;padding:0 14px;font-size:14.5px}

.kmm-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:10px;height:44px;padding:0 18px;border-radius:4px;border:1px solid transparent;font-weight:600;font-size:15.5px;line-height:1;white-space:nowrap;transition:background-color .2s ease,color .2s ease,border-color .2s ease,transform .16s var(--kmm-ease)}
.kmm-btn:active{transform:scale(.97)}
.kmm-btn-lg{height:54px;padding:0 22px;font-size:16.5px}
.kmm-btn-block{width:100%}
.kmm-btn-solid{background:var(--kmm-accent);color:var(--kmm-accent-ink)}
.kmm-btn-solid:hover{background:color-mix(in srgb,var(--kmm-accent) 84%,#000)}
.kmm-btn-solid[disabled]{opacity:.7;cursor:progress}
.kmm-btn-ghost{border-color:currentColor;color:inherit}
.kmm-btn-ghost:hover{background:color-mix(in srgb,currentColor 12%,transparent)}
.kmm-waymark{display:inline-grid;grid-template-rows:1fr 1fr 1fr;width:18px;height:16px;border-radius:2px;overflow:hidden;box-shadow:0 0 0 1px rgba(255,255,255,.9);transition:transform .3s var(--kmm-ease)}
.kmm-waymark i{display:block;background:#fff}
.kmm-waymark i:nth-child(2){background:var(--kmm-accent)}
.kmm-btn:hover .kmm-waymark{transform:translateY(-2px) rotate(-6deg)}
.kmm-arrow{transition:transform .28s var(--kmm-ease)}
.kmm-btn:hover .kmm-arrow,.kmm-row:hover .kmm-arrow{transform:translateX(4px)}

.kmm-hero{position:relative;height:var(--kmm-h);min-height:620px;margin-top:-68px;color:#fff;overflow:hidden;background:#1b2023}
.kmm-scene{position:absolute;inset:0;background:linear-gradient(180deg,#5f86b0 0%,#a9bfd2 13%,#f3cfa4 19%,#b9ae94 27%,#6f7656 40%,#3e4b30 100%)}
.kmm-root[data-theme="dark"] .kmm-scene{background:linear-gradient(180deg,#0d1729 0%,#36395c 13%,#d98d7c 19%,#4b4766 26%,#22233a 40%,#14151f 100%)}
.kmm-root[data-preset="winter"] .kmm-scene{background:linear-gradient(180deg,#3f74b3 0%,#9dbcd9 13%,#e6eef4 20%,#c9d4df 34%,#8d99a6 100%)}
.kmm-root[data-preset="winter"][data-theme="dark"] .kmm-scene{background:linear-gradient(180deg,#060b17 0%,#1b2a48 14%,#6f7fa6 20%,#28365a 30%,#141c2e 100%)}
.kmm-canvas{position:absolute;left:0;top:0;display:block;max-width:none;opacity:0;transition:opacity .8s ease}
[data-ready="1"]>.kmm-canvas{opacity:1}
.kmm-trail{position:absolute;left:0;top:0;z-index:2;overflow:visible;pointer-events:none}
.kmm-hero-photo{z-index:0}
.kmm-trail-case{fill:none;stroke:rgba(255,255,255,.75);stroke-width:5;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1;stroke-dashoffset:1;animation:kmm-draw 1.8s cubic-bezier(.65,0,.35,1) forwards}
.kmm-trail-line{fill:none;stroke:var(--kmm-accent);stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1;stroke-dashoffset:1;animation:kmm-draw 1.8s cubic-bezier(.65,0,.35,1) forwards}
.kmm-scene[data-ready="0"] .kmm-trail{display:none}
.kmm-scene .kmm-hero-photo{opacity:1}
.kmm-pins{position:absolute;inset:0;z-index:2;pointer-events:none}
.kmm-trail-hidden{fill:none;stroke:rgba(255,255,255,.55);stroke-width:1.4;stroke-dasharray:2 5;stroke-linecap:round;opacity:0;animation:kmm-fade .8s ease 1.4s forwards}
.kmm-pin{position:absolute;width:22px;height:22px;display:grid;place-items:center;pointer-events:auto;transform:translate(-50%,-50%);color:#fff;animation:kmm-pop .5s var(--kmm-ease) both}
.kmm-pin-dot{display:grid;place-items:center;width:18px;height:18px;background:#fff;color:#14211f;border-radius:3px;box-shadow:0 1px 6px rgba(0,0,0,.35);transition:transform .2s var(--kmm-ease),background-color .2s ease,color .2s ease}
.kmm-pin-label{position:absolute;display:flex;flex-direction:column;align-items:flex-start;line-height:1.15;white-space:nowrap;background:rgba(9,13,15,.68);padding:5px 9px 6px;border-radius:3px;text-align:left;transition:background-color .2s ease,transform .2s var(--kmm-ease)}
.kmm-pin-label b{font-size:13.5px;font-weight:700}
.kmm-pin-label span{font-size:12px;opacity:.88;font-variant-numeric:tabular-nums}
.kmm-pin:hover .kmm-pin-dot,.kmm-pin:focus-visible .kmm-pin-dot{background:var(--kmm-accent);color:#fff;transform:scale(1.15)}
.kmm-pin:hover .kmm-pin-label,.kmm-pin:focus-visible .kmm-pin-label{background:var(--kmm-accent);transform:translateY(-2px)}
.kmm-pin:focus-visible{outline:2px solid #fff;outline-offset:2px;border-radius:4px}
.kmm-live{position:absolute;width:0;height:0;animation:kmm-fade .6s ease 1.5s both}
.kmm-live-dot,.kmm-live-ring{position:absolute;left:-7px;top:-7px;width:14px;height:14px;border-radius:50%;background:var(--kmm-accent);box-shadow:0 0 0 2.5px #fff}
.kmm-live-ring{background:transparent;box-shadow:0 0 0 2px var(--kmm-accent);animation:kmm-pulse 2.4s cubic-bezier(.2,.6,.3,1) infinite}
.kmm-live-label{position:absolute;display:flex;flex-direction:column;white-space:nowrap;background:var(--kmm-accent);color:#fff;padding:7px 11px 8px;border-radius:4px;line-height:1.2;box-shadow:0 6px 20px rgba(0,0,0,.25)}
.kmm-live-label b{font-size:13px;font-weight:700}
.kmm-live-label span{font-size:12px;opacity:.92}
.kmm-scrim{position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(0deg,rgba(6,10,12,.82) 0%,rgba(6,10,12,.52) 24%,rgba(6,10,12,0) 50%),linear-gradient(180deg,rgba(6,10,12,.42) 0,rgba(6,10,12,0) 132px)}
.kmm-hero-copy{position:absolute;z-index:3;left:0;right:0;bottom:0;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:32px;padding:0 var(--kmm-gut) clamp(32px,5.5vh,64px)}
.kmm-hero-text{max-width:900px}
.kmm-hero h1{font-size:clamp(42px,6.1vw,96px);line-height:.96;letter-spacing:-.038em;font-weight:700;max-width:12.5ch;text-wrap:balance}
.kmm-hero-text p{margin-top:22px;font-size:clamp(17px,1.35vw,19.5px);line-height:1.5;color:rgba(255,255,255,.88);max-width:44ch}
.kmm-hero-actions{display:flex;gap:12px;flex-wrap:wrap;justify-content:flex-end}
.kmm-hero-actions .kmm-btn-ghost{color:#fff;border-color:rgba(255,255,255,.7)}
.kmm-hero :focus-visible{outline-color:#fff}
.kmm-sentinel{position:absolute;left:0;bottom:0;width:1px;height:1px}

.kmm-main{display:block}
.kmm-main:focus{outline:none}
.kmm-sec{padding:var(--kmm-pad) var(--kmm-gut) 0;max-width:1440px;margin:0 auto;scroll-margin-top:68px}
.kmm-collar-rule{grid-column:1/-1;display:flex;align-items:center;gap:12px;margin-bottom:clamp(28px,3.5vw,44px);font-size:12px;color:var(--kmm-muted);font-variant-numeric:tabular-nums;letter-spacing:.01em}
.kmm-collar-rule b{flex:none;min-width:30px;text-align:center;padding:2px 6px;border:1px solid var(--kmm-ink);color:var(--kmm-ink);font-weight:700;border-radius:2px}
.kmm-collar-rule i{flex:1;height:7px;border-top:1px solid color-mix(in srgb,var(--kmm-ink) 45%,transparent);background:repeating-linear-gradient(90deg,color-mix(in srgb,var(--kmm-ink) 30%,transparent) 0 1px,transparent 1px 56px)}
.kmm-collar-rule span{flex:0 1 auto;text-align:right;max-width:60%;line-height:1.3}
.kmm-head{display:grid;gap:14px;max-width:760px;margin-bottom:clamp(32px,4vw,52px)}
.kmm-head h2,.kmm-incl-lead h2{font-size:clamp(32px,3.7vw,56px);line-height:1.02;letter-spacing:-.03em;font-weight:700;text-wrap:balance}
.kmm-head p{color:var(--kmm-muted);max-width:56ch}
.kmm-head a{text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1px;color:var(--kmm-ink)}
.kmm-head a:hover{color:var(--kmm-accent-text)}
.kmm-rv.kmm-armed{transform:translateY(22px)}
.kmm-rv.kmm-armed.kmm-shown{transform:none;transition:transform .8s var(--kmm-ease)}

.kmm-totals{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-top:2px solid var(--kmm-ink);margin-bottom:28px}
.kmm-totals div{padding:14px 16px 0 0}
.kmm-totals dt{font-size:13.5px;color:var(--kmm-muted)}
.kmm-totals dd{font-size:clamp(28px,3vw,42px);font-weight:700;letter-spacing:-.03em;line-height:1.1;font-variant-numeric:tabular-nums}
.kmm-totals small{font-size:.5em;font-weight:600;letter-spacing:0;color:var(--kmm-muted)}
.kmm-routegrid{display:grid;grid-template-columns:minmax(0,8fr) minmax(0,4fr);gap:24px;align-items:start}
.kmm-mapframe{position:relative;border:1px solid var(--kmm-ink);padding:5px;background:var(--kmm-sheet)}
.kmm-map{position:relative;height:clamp(420px,42vw,620px);outline:2px solid var(--kmm-ink);outline-offset:-1px;background:var(--kmm-bg);overflow:hidden}
.kmm-map-svg{position:absolute;inset:0;width:100%;height:100%;display:block;overflow:visible}
.kmm-sheetname{position:absolute;right:5px;bottom:-24px;font-size:12px;color:var(--kmm-muted);letter-spacing:.02em}
.kmm-sheetname i{font-style:normal;margin-left:8px}
.kmm-grid line{stroke:var(--kmm-ink);stroke-opacity:.12}
.kmm-grid text{fill:var(--kmm-ink);fill-opacity:.55;font-variant-numeric:tabular-nums}
.kmm-peak{fill:var(--kmm-ink)}
.kmm-lettering text{fill:var(--kmm-ink);paint-order:stroke;stroke:var(--kmm-bg);stroke-linejoin:round;font-weight:600}
.kmm-lettering .kmm-lt-peak{font-weight:500}
.kmm-lettering .kmm-lt-on{fill:var(--kmm-accent-text);font-weight:700}
.kmm-peak-h{font-style:italic;font-weight:400}
.kmm-route-case{fill:none;stroke:var(--kmm-bg);stroke-opacity:.85;stroke-linecap:round;stroke-linejoin:round}
.kmm-route{fill:none;stroke:var(--kmm-accent);stroke-linecap:butt;stroke-linejoin:round}
.kmm-route-on{fill:none;stroke:var(--kmm-accent);stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1;stroke-dashoffset:0;animation:kmm-draw .7s cubic-bezier(.65,0,.35,1) both}
.kmm-hut{fill:var(--kmm-ink);stroke:var(--kmm-ink)}
.kmm-hut rect:not(.kmm-hut-bg){stroke:none}
.kmm-hut-bg{fill:var(--kmm-bg);stroke-width:.9}
.kmm-hut-on rect:not(.kmm-hut-bg){fill:var(--kmm-accent)}
.kmm-hut-on path{stroke:var(--kmm-accent)}
.kmm-hut-town circle,.kmm-town circle{fill:var(--kmm-bg);stroke:var(--kmm-ink)}
.kmm-walker{transition:transform .08s linear}
.kmm-walker circle{fill:var(--kmm-accent);stroke:#fff}
.kmm-walker-halo{fill:var(--kmm-accent);fill-opacity:.22;stroke:none !important;transform-box:fill-box;transform-origin:center;animation:kmm-breathe 2.6s ease-in-out infinite}
.kmm-collar rect{fill:var(--kmm-ink)}
.kmm-collar .kmm-collar-w{fill:var(--kmm-bg);stroke:var(--kmm-ink)}
.kmm-collar text,.kmm-north text{fill:var(--kmm-ink);font-weight:600}
.kmm-north path{fill:var(--kmm-ink)}

.kmm-day{position:relative;background:var(--kmm-sheet);border:1px solid var(--kmm-rule);border-radius:6px;padding:26px 24px 24px;display:grid;gap:18px}
.kmm-dayno{font-size:14px;font-weight:600;color:var(--kmm-accent-text);font-variant-numeric:tabular-nums}
.kmm-day h3{font-size:clamp(24px,2.2vw,30px);line-height:1.08;letter-spacing:-.025em;font-weight:700;margin-top:-8px}
.kmm-sign{position:relative;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:center;height:56px;padding:0 36px 0 14px;background:var(--kmm-ink);clip-path:polygon(0 0,calc(100% - 26px) 0,100% 50%,calc(100% - 26px) 100%,0 100%)}
.kmm-sign::before{content:"";position:absolute;inset:1.5px 2px 1.5px 1.5px;background:var(--kmm-bg);clip-path:polygon(0 0,calc(100% - 25px) 0,100% 50%,calc(100% - 25px) 100%,0 100%)}
.kmm-sign>*{position:relative}
.kmm-sign .kmm-waymark{box-shadow:0 0 0 1px var(--kmm-ink)}
.kmm-sign-plate{display:flex;flex-direction:column;line-height:1.15;min-width:0}
.kmm-sign-plate b{font-size:16.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kmm-sign-plate span{font-size:12.5px;color:var(--kmm-muted);font-variant-numeric:tabular-nums}
.kmm-sign-time{font-weight:700;font-size:15px;font-variant-numeric:tabular-nums;white-space:nowrap}
.kmm-daystats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-top:1px solid var(--kmm-rule);border-bottom:1px solid var(--kmm-rule);padding:12px 0}
.kmm-daystats dt{font-size:13px;color:var(--kmm-muted)}
.kmm-daystats dd{font-size:20px;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:-.01em}
.kmm-daytext{color:var(--kmm-soft);font-size:16px}
.kmm-sleep{display:flex;gap:10px;align-items:flex-start;font-size:15px;color:var(--kmm-soft)}
.kmm-sleep .kmm-sym{margin-top:5px;flex:none;color:var(--kmm-ink)}
.kmm-endmark{flex:none;width:12px;height:12px;margin-top:5px;border:2px solid var(--kmm-ink);border-radius:50%}

.kmm-profilewrap{margin-top:44px}
.kmm-tabs{display:grid;grid-template-columns:repeat(var(--kmm-n,6),minmax(0,1fr));border-top:1px solid var(--kmm-rule)}
.kmm-tabs button{display:flex;flex-direction:column;gap:2px;padding:12px 10px 10px 0;border-top:3px solid transparent;margin-top:-2px;min-width:0;transition:border-color .25s ease,color .2s ease}
.kmm-tabs button b{font-size:13.5px;font-weight:700}
.kmm-tabs button span{font-size:13px;color:var(--kmm-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kmm-tabs button:hover{border-top-color:var(--kmm-rule)}
.kmm-tabs button[aria-selected="true"]{border-top-color:var(--kmm-accent)}
.kmm-tabs button[aria-selected="true"] span{color:var(--kmm-ink)}
.kmm-tabs button:focus-visible{outline-offset:-2px}
.kmm-profile{position:relative;margin-top:8px;cursor:ew-resize;touch-action:pan-y;user-select:none;-webkit-user-select:none;border-radius:4px}
.kmm-profile svg{display:block}
.kmm-axis line{stroke:var(--kmm-rule)}
.kmm-axis text{font-size:11.5px;fill:var(--kmm-muted);font-variant-numeric:tabular-nums}
.kmm-band{fill:var(--kmm-accent);fill-opacity:.07;transition:x .3s var(--kmm-ease),width .3s var(--kmm-ease)}
.kmm-area{fill:var(--kmm-contour);fill-opacity:.1}
.kmm-pcont line{stroke:var(--kmm-contour);stroke-opacity:.42;stroke-width:.8}
.kmm-pcont .kmm-pcont-i{stroke-opacity:.75;stroke-width:1.3}
.kmm-pline{fill:none;stroke:var(--kmm-ink);stroke-width:1.8;stroke-linejoin:round}
.kmm-sep{stroke:var(--kmm-ink);stroke-opacity:.3;stroke-dasharray:3 3}
.kmm-pday{font-size:12px;fill:var(--kmm-muted)}
.kmm-pday-on{fill:var(--kmm-ink);font-weight:700}
.kmm-ptop rect{fill:var(--kmm-bg);stroke:var(--kmm-ink);stroke-width:1.4}
.kmm-ptop-on rect{fill:var(--kmm-accent);stroke:var(--kmm-accent)}
.kmm-cursor line{stroke:var(--kmm-accent);stroke-width:1.5}
.kmm-cursor circle{fill:var(--kmm-accent);stroke:var(--kmm-bg);stroke-width:2.5}
.kmm-cursor text{font-size:12.5px;font-weight:700;fill:var(--kmm-ink);paint-order:stroke;stroke:var(--kmm-bg);stroke-width:4px;stroke-linejoin:round;font-variant-numeric:tabular-nums}

.kmm-hutgrid{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:clamp(24px,4vw,64px);align-items:start}
.kmm-hutview{position:sticky;top:92px}
.kmm-excerpt{position:relative;aspect-ratio:4/3;border:1px solid var(--kmm-ink);outline:4px solid var(--kmm-sheet);outline-offset:-5px;background:var(--kmm-bg);overflow:hidden}
.kmm-excerpt .kmm-canvas{animation:none}
.kmm-photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;max-width:none}
.kmm-excerpt-tag{position:absolute;left:14px;bottom:14px;background:var(--kmm-sheet);color:var(--kmm-ink);font-size:13px;font-weight:700;padding:6px 10px;border-radius:3px;border:1px solid var(--kmm-rule)}
.kmm-hutcap{margin-top:12px;font-size:14.5px;color:var(--kmm-muted)}
.kmm-hutcap b{color:var(--kmm-ink)}
.kmm-hutlist{border-top:2px solid var(--kmm-ink)}
.kmm-hutlist li{border-bottom:1px solid var(--kmm-rule)}
.kmm-hutlist button{position:relative;width:100%;display:grid;grid-template-columns:76px minmax(0,1fr) auto;column-gap:14px;row-gap:4px;padding:18px 0 18px 0;align-items:baseline}
.kmm-hutlist button::before{content:"";position:absolute;left:-14px;top:18px;bottom:18px;width:3px;background:var(--kmm-accent);transform:scaleY(0);transition:transform .3s var(--kmm-ease)}
.kmm-hutlist button[aria-pressed="true"]::before{transform:scaleY(1)}
.kmm-hutnight{font-size:13.5px;color:var(--kmm-muted);font-variant-numeric:tabular-nums}
.kmm-hutname{font-size:clamp(20px,1.8vw,24px);font-weight:700;letter-spacing:-.02em;line-height:1.15;transition:color .2s ease}
.kmm-hutalt{font-size:15px;font-weight:600;font-variant-numeric:tabular-nums}
.kmm-hutsleep{grid-column:2/4;font-size:14.5px;color:var(--kmm-muted);display:flex;flex-wrap:wrap;gap:4px 10px}
.kmm-hutsleep em{font-style:normal;font-weight:600;color:var(--kmm-ink);font-size:13px;border:1px solid var(--kmm-rule);border-radius:3px;padding:0 6px}
.kmm-hutlist button:hover .kmm-hutname{color:var(--kmm-accent-text)}

.kmm-incl{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:clamp(32px,5vw,88px);align-items:start}
.kmm-incl-lead{position:sticky;top:96px;display:grid;gap:14px}
.kmm-figure{font-size:clamp(96px,13vw,200px);line-height:.86;letter-spacing:-.06em;font-weight:800;color:var(--kmm-ink);padding-bottom:.2em;font-variant-numeric:tabular-nums}
.kmm-incl-lead>p:last-child{color:var(--kmm-muted);max-width:44ch}
.kmm-legend{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));border-top:2px solid var(--kmm-ink)}
.kmm-legend li{display:grid;grid-template-columns:44px minmax(0,1fr);gap:16px;padding:22px 20px 22px 0;border-bottom:1px solid var(--kmm-rule)}
.kmm-legsym{color:var(--kmm-ink);display:block}
.kmm-legend h3{font-size:17px;font-weight:700;line-height:1.25;letter-spacing:-.01em}
.kmm-legend p{font-size:15px;color:var(--kmm-muted);margin-top:4px}
.kmm-excl{grid-column:2;display:grid;grid-template-columns:auto minmax(0,1fr);gap:16px;align-items:baseline;margin-top:-8px}
.kmm-excl h3{font-size:14px;font-weight:700}
.kmm-excl ul{display:flex;flex-wrap:wrap;gap:6px 18px;font-size:14px;color:var(--kmm-muted)}
.kmm-excl li{display:flex;align-items:center;gap:8px}
.kmm-excl li::before{content:"";width:7px;height:7px;border:1.5px solid currentColor;border-radius:50%}

.kmm-depgrid{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:clamp(24px,4vw,56px);align-items:start}
.kmm-filter{display:inline-flex;border:1px solid var(--kmm-rule);border-radius:4px;padding:3px;gap:2px;margin-bottom:18px;flex-wrap:wrap}
.kmm-filter button{height:34px;padding:0 14px;border-radius:3px;font-size:14px;font-weight:600;color:var(--kmm-muted);transition:background-color .2s ease,color .2s ease}
.kmm-filter button:hover{color:var(--kmm-ink)}
.kmm-filter button[aria-checked="true"]{background:var(--kmm-ink);color:var(--kmm-bg)}
.kmm-rows{border-top:2px solid var(--kmm-ink)}
.kmm-rows li{border-bottom:1px solid var(--kmm-rule)}
.kmm-row{position:relative;width:100%;display:grid;grid-template-columns:minmax(0,1fr) 168px 104px 22px;gap:16px;align-items:center;padding:16px 10px 16px 14px;transition:background-color .2s ease}
.kmm-row::before{content:"";position:absolute;left:0;top:10px;bottom:10px;width:3px;background:var(--kmm-accent);transform:scaleY(0);transition:transform .3s var(--kmm-ease)}
.kmm-row:hover{background:var(--kmm-faint)}
.kmm-row-on .kmm-row{background:var(--kmm-sheet)}
.kmm-row-on .kmm-row::before{transform:scaleY(1)}
.kmm-row-date{display:flex;flex-direction:column;min-width:0}
.kmm-row-date b{font-size:18px;font-weight:700;letter-spacing:-.01em;font-variant-numeric:tabular-nums}
.kmm-row-date span{font-size:14px;color:var(--kmm-muted);display:flex;flex-wrap:wrap;gap:2px 10px}
.kmm-row-date em{font-style:normal;color:var(--kmm-accent-text);font-weight:600}
.kmm-row-spots{display:flex;flex-direction:column;gap:6px;font-size:13.5px;color:var(--kmm-soft)}
.kmm-meter{display:flex;gap:3px}
.kmm-meter i{width:10px;height:10px;border:1px solid var(--kmm-ink);border-radius:1.5px;opacity:.45}
.kmm-meter i.kmm-taken{background:var(--kmm-ink);opacity:.8}
.kmm-meter i.kmm-mine{background:var(--kmm-accent);border-color:var(--kmm-accent);opacity:1}
.kmm-row-price{font-weight:700;font-size:16px;text-align:right;font-variant-numeric:tabular-nums}
.kmm-row-go{color:var(--kmm-muted)}
.kmm-held{color:var(--kmm-accent-text);font-weight:700;margin-right:6px}
.kmm-row-full .kmm-row-date b{color:var(--kmm-muted)}
.kmm-form{position:sticky;top:92px;background:var(--kmm-sheet);border:1px solid var(--kmm-rule);border-radius:6px;padding:28px 26px;display:grid;gap:18px;scroll-margin-top:84px}
.kmm-form h3{font-size:26px;font-weight:700;letter-spacing:-.025em;line-height:1.1}
.kmm-form-sum{display:grid;gap:2px;padding-bottom:16px;border-bottom:1px solid var(--kmm-rule)}
.kmm-form-sum b{font-size:18px}
.kmm-form-sum span{font-size:14.5px;color:var(--kmm-muted)}
.kmm-field{display:grid;gap:6px}
.kmm-label{font-size:14px;font-weight:600}
.kmm-field input{height:48px;padding:0 14px;border:1px solid color-mix(in srgb,var(--kmm-ink) 38%,transparent);border-radius:4px;background:var(--kmm-bg);font-size:16px;transition:border-color .2s ease,box-shadow .2s ease}
.kmm-field input:focus{outline:none;border-color:var(--kmm-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--kmm-accent) 22%,transparent)}
.kmm-field input[aria-invalid="true"]{border-color:var(--kmm-accent)}
.kmm-err{font-size:13.5px;color:var(--kmm-accent-text);font-weight:600}
.kmm-stepper{display:inline-grid;grid-template-columns:44px 52px 44px;align-items:center;height:46px;border:1px solid color-mix(in srgb,var(--kmm-ink) 38%,transparent);border-radius:4px;width:max-content}
.kmm-stepper button{align-self:stretch;display:grid;place-items:center;transition:background-color .2s ease}
.kmm-stepper button:hover:not(:disabled){background:var(--kmm-faint)}
.kmm-stepper button:disabled{opacity:.35;cursor:not-allowed}
.kmm-stepper output{text-align:center;font-weight:700;font-size:18px;font-variant-numeric:tabular-nums;border-left:1px solid var(--kmm-rule);border-right:1px solid var(--kmm-rule);line-height:44px}
.kmm-total{display:flex;justify-content:space-between;align-items:baseline;font-variant-numeric:tabular-nums;color:var(--kmm-muted);font-size:15px}
.kmm-total b{font-size:22px;color:var(--kmm-ink);letter-spacing:-.01em}
.kmm-fine{font-size:13.5px;color:var(--kmm-muted)}
.kmm-done{display:grid;gap:14px;justify-items:start}
.kmm-done .kmm-stamp{color:var(--kmm-accent);transform:rotate(-8deg);animation:kmm-stamp .5s var(--kmm-ease) both}
.kmm-done p{color:var(--kmm-soft)}

.kmm-entries{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(20px,3vw,40px);align-items:start;padding-top:40px}
.kmm-entry{position:relative;padding:62px 26px 24px;background:var(--kmm-sheet);border:1px solid var(--kmm-rule);border-radius:6px}
.kmm-entry:nth-child(2){margin-top:56px}
.kmm-entry:nth-child(3){margin-top:20px}
.kmm-entry .kmm-stamp{position:absolute;right:10px;top:-58px;color:var(--kmm-accent);opacity:.88;transform:rotate(-9deg);mix-blend-mode:multiply;transition:transform .4s var(--kmm-ease)}
.kmm-root[data-theme="dark"] .kmm-entry .kmm-stamp{mix-blend-mode:normal}
.kmm-entry:nth-child(2) .kmm-stamp{transform:rotate(7deg)}
.kmm-entry:nth-child(3) .kmm-stamp{transform:rotate(-3deg)}
.kmm-entry:hover .kmm-stamp{transform:rotate(0deg) scale(1.04)}
.kmm-entry blockquote p{font-size:19px;line-height:32px;letter-spacing:-.005em;background-image:repeating-linear-gradient(180deg,transparent 0,transparent 31px,color-mix(in srgb,var(--kmm-ink) 12%,transparent) 31px,color-mix(in srgb,var(--kmm-ink) 12%,transparent) 32px)}
.kmm-who{margin-top:18px;font-size:14.5px;color:var(--kmm-muted)}
.kmm-who b{color:var(--kmm-ink);margin-right:6px}
.kmm-guides{margin-top:clamp(56px,7vw,96px);border-top:2px solid var(--kmm-ink);padding-top:22px}
.kmm-guides h3{font-size:15px;font-weight:700;margin-bottom:18px}
.kmm-guides ul{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(20px,3vw,40px)}
.kmm-guides li{display:grid;grid-template-columns:88px minmax(0,1fr);gap:18px;align-items:start}
.kmm-guides b{display:block;font-size:18px;letter-spacing:-.01em}
.kmm-role{display:block;font-size:14px;color:var(--kmm-accent-text);font-weight:600;margin-top:2px}
.kmm-guides p{font-size:15px;color:var(--kmm-muted);margin-top:8px}
.kmm-avatar{position:relative;display:grid;place-items:center;width:88px;height:88px;border-radius:50%;overflow:hidden;background:var(--kmm-sheet)}
.kmm-avatar svg{position:absolute;inset:0}
.kmm-av-ring{fill:none;stroke:var(--kmm-ink);stroke-width:1.5}
.kmm-av-ticks line{stroke:var(--kmm-ink);stroke-opacity:.55}
.kmm-av-peak{fill:var(--kmm-accent)}
.kmm-avatar b{position:relative;margin-top:14px;font-size:21px !important;font-weight:700;color:var(--kmm-ink);letter-spacing:-.02em}
.kmm-avatar img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}

.kmm-faq{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:clamp(24px,5vw,88px);align-items:start;padding-bottom:var(--kmm-pad)}
.kmm-faq .kmm-head{position:sticky;top:96px}
.kmm-qs{border-top:2px solid var(--kmm-ink)}
.kmm-q{border-bottom:1px solid var(--kmm-rule)}
.kmm-q h3{font-size:inherit}
.kmm-q button{width:100%;display:flex;justify-content:space-between;align-items:center;gap:20px;padding:20px 0;font-size:clamp(17px,1.4vw,19px);font-weight:700;letter-spacing:-.01em;transition:color .2s ease}
.kmm-q button:hover{color:var(--kmm-accent-text)}
.kmm-q i{position:relative;flex:none;width:16px;height:16px}
.kmm-q i::before,.kmm-q i::after{content:"";position:absolute;left:0;right:0;top:7px;height:2px;background:currentColor;transition:transform .3s var(--kmm-ease)}
.kmm-q i::after{transform:rotate(90deg)}
.kmm-q-on i::after{transform:rotate(0deg)}
.kmm-a p{padding:0 0 22px;color:var(--kmm-soft);max-width:62ch;font-size:16px}
.kmm-q-on .kmm-a{animation:kmm-open .25s var(--kmm-ease) both}

.kmm-foot{border-top:2px solid var(--kmm-ink);background:var(--kmm-sheet)}
.kmm-foot-top{position:relative;overflow:hidden;border-bottom:1px solid var(--kmm-rule)}
.kmm-footmap{position:absolute;inset:0;opacity:.62;-webkit-mask-image:linear-gradient(90deg,transparent 0%,rgba(0,0,0,.25) 30%,#000 70%);mask-image:linear-gradient(90deg,transparent 0%,rgba(0,0,0,.25) 30%,#000 70%);pointer-events:none}
.kmm-foot-cta{position:relative;max-width:1440px;margin:0 auto;padding:clamp(72px,9vw,132px) var(--kmm-gut);display:flex;justify-content:space-between;align-items:flex-end;gap:32px;flex-wrap:wrap}
.kmm-foot-title{font-size:clamp(32px,4.4vw,68px);font-weight:700;letter-spacing:-.035em;line-height:1;max-width:16ch;text-wrap:balance}
.kmm-collar{max-width:1440px;margin:0 auto;padding:32px var(--kmm-gut);display:grid;grid-template-columns:minmax(0,5fr) minmax(0,3fr) minmax(0,4fr);gap:32px}
.kmm-collar-brand p{margin-top:12px;color:var(--kmm-muted);font-size:15px;max-width:40ch}
.kmm-collar-links{display:grid;gap:6px;align-content:start;font-size:15px}
.kmm-collar-links a,.kmm-collar-contact a{width:max-content;transition:color .2s ease}
.kmm-collar-links a:hover,.kmm-collar-contact a:hover{color:var(--kmm-accent-text)}
.kmm-collar-contact{display:grid;gap:2px;align-content:start;font-size:15px;color:var(--kmm-soft)}
.kmm-collar-contact a{margin-top:6px;color:var(--kmm-ink);font-weight:600}
.kmm-collar-contact a+a{margin-top:0}
.kmm-margin{max-width:1440px;margin:0 auto;padding:14px var(--kmm-gut) 22px;display:flex;flex-wrap:wrap;gap:8px 28px;align-items:center;font-size:12.5px;color:var(--kmm-muted);border-top:1px solid var(--kmm-rule)}
.kmm-margin span:last-child{margin-left:auto}
.kmm-scalebar{position:relative;display:inline-grid;grid-template-columns:repeat(4,22px);height:6px;border:1px solid var(--kmm-ink);margin-top:-12px}
.kmm-scalebar i:nth-child(odd){background:var(--kmm-ink)}
.kmm-scalebar em{position:absolute;top:8px;font-style:normal;font-size:11px;color:var(--kmm-muted)}
.kmm-scalebar em:first-of-type{left:-2px}
.kmm-scalebar em:last-of-type{right:-14px}

.kmm-sheet{position:fixed;inset:0;z-index:60;background:var(--kmm-bg);color:var(--kmm-ink);display:flex;flex-direction:column;padding:0 var(--kmm-gut) 28px;overflow-y:auto}
.kmm-sheet-top{height:68px;display:flex;align-items:center;justify-content:space-between}
.kmm-sheet .kmm-menuclose{display:inline-flex;align-items:center}
.kmm-sheet nav{display:grid;margin:24px 0 32px;border-top:1px solid var(--kmm-rule)}
.kmm-sheet nav a{font-size:34px;font-weight:700;letter-spacing:-.03em;padding:12px 0;border-bottom:1px solid var(--kmm-rule);animation:kmm-slide .45s var(--kmm-ease) both}
.kmm-sheet>.kmm-btn{align-self:stretch;height:54px}

.kmm-in{animation:kmm-rise .9s var(--kmm-ease) both}
@keyframes kmm-rise{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}
@keyframes kmm-fade{from{opacity:0}to{opacity:1}}
@keyframes kmm-draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
@keyframes kmm-pop{from{opacity:0;transform:translate(-50%,-50%) scale(.6)}to{opacity:1;transform:translate(-50%,-50%)}}
@keyframes kmm-pulse{0%{transform:scale(1);opacity:.9}80%,100%{transform:scale(3.2);opacity:0}}
@keyframes kmm-breathe{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.35);opacity:.55}}
@keyframes kmm-stamp{from{opacity:0;transform:rotate(-8deg) scale(1.5)}to{opacity:1;transform:rotate(-8deg) scale(1)}}
@keyframes kmm-open{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
@keyframes kmm-slide{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}

@media (max-width:1180px){
.kmm-links{gap:18px}
.kmm-brand span{display:none}
}
@media (max-width:1023px){
.kmm-routegrid,.kmm-hutgrid,.kmm-depgrid,.kmm-incl,.kmm-faq{grid-template-columns:minmax(0,1fr)}
.kmm-hutview,.kmm-incl-lead,.kmm-form,.kmm-faq .kmm-head{position:static}
.kmm-excl{grid-column:auto}
.kmm-entries{grid-template-columns:minmax(0,1fr)}
.kmm-entry:nth-child(n){margin-top:38px}
.kmm-entry:first-child{margin-top:24px}
.kmm-guides ul{grid-template-columns:minmax(0,1fr)}
.kmm-collar{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
.kmm-collar-brand{grid-column:1/-1}
}
@media (max-width:899px){
.kmm-links{display:none}
.kmm-menubtn{display:inline-flex;align-items:center}
.kmm-navend{margin-left:auto}
}
@media (max-width:759px){
.kmm-root{font-size:16px}
.kmm-nav{gap:12px}
.kmm-navcta{display:none}
.kmm-hero{min-height:600px}
.kmm-hero-copy{grid-template-columns:minmax(0,1fr);gap:22px}
.kmm-hero-actions{justify-content:flex-start}
.kmm-hero-actions .kmm-btn{flex:1 1 auto}
.kmm-totals{grid-template-columns:repeat(2,minmax(0,1fr))}
.kmm-totals div:nth-child(n+3){border-top:1px solid var(--kmm-rule);margin-top:12px}
.kmm-map{height:auto;aspect-ratio:1/1.08}
.kmm-tabs button{padding-right:4px}
.kmm-tabs button span{display:none}
.kmm-legend{grid-template-columns:minmax(0,1fr)}
.kmm-legend li{padding-right:0}
.kmm-excl{grid-template-columns:minmax(0,1fr)}
.kmm-row{grid-template-columns:minmax(0,1fr) auto;row-gap:10px;padding:14px 4px 14px 12px}
.kmm-row-spots{grid-column:1;grid-row:2;gap:5px}
.kmm-row-price{grid-column:2;grid-row:1}
.kmm-row-go{grid-column:2;grid-row:2;justify-self:end}
.kmm-form{padding:22px 18px}
.kmm-hutlist button{grid-template-columns:62px minmax(0,1fr) auto}
.kmm-hutlist button::before{left:-10px}
.kmm-collar{grid-template-columns:minmax(0,1fr)}
.kmm-margin span:last-child{margin-left:0}
.kmm-foot-cta .kmm-btn{width:100%}
}
@media (prefers-reduced-motion:reduce){
.kmm-root *,.kmm-root *::before,.kmm-root *::after{animation-duration:.001ms !important;animation-delay:0ms !important;animation-iteration-count:1 !important;transition-duration:.001ms !important}
.kmm-live-ring,.kmm-walker-halo{animation:none !important}
.kmm-rv.kmm-armed{transform:none}
}
`

export type KammHoldHandler = (req: KammHoldRequest) => boolean | void | Promise<boolean | void>
