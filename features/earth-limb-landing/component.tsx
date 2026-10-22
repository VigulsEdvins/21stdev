"use client"

// Earth Limb Landing: a complete home page for an Earth-imaging satellite
// company, shown the way its own fleet sees the planet.
//
// The hero is the limb of the Earth from low orbit: a WebGL ocean under fbm
// cloud decks, sun glint, a terminator and a thin physical atmosphere (a
// hairline of Rayleigh blue, white haze and an amber dawn line). Across it runs
// the ground track of one orbital plane, and the satellites on it move at
// their real speed from the clock: a small circular-orbit model places every
// satellite in the fleet, turns the Earth under them by sidereal time and
// keeps each plane sun-synchronous. The same model drives the page: the live
// strip counts down to the next pass over your city (picked from your time
// zone, never a location prompt), the fleet roster shows where every satellite
// is right now, and the tasking form names the earliest collection for the
// place you type in.
//
// Below the hero it is a working product page: use cases with a drag-to-
// compare between true colour and the sensor's other view (NDVI, radar,
// short-wave infrared, change), the spacecraft as a technical line drawing
// with its specs, an archive carousel, a validated tasking form and a deep
// navy sitemap footer. Every word, satellite, city, image, colour and the
// dawn or day view are props.
//
// Everything is drawn here: the limb is one fragment shader rendered on demand
// within a pixel budget (smaller on software renderers, so frame one is always
// finished), the imagery tiles are procedural canvas 2D, the spacecraft is
// projected SVG, the type is the system grotesk stack and nothing loads at
// runtime unless you pass your own images.
import * as React from "react"

export type ElxLink = { label: string; href?: string }

/** One orbital plane. Sun-synchronous planes keep the same local time over the ground. */
export type ElxPlane = {
  id: string
  name: string
  /**
   * Local solar time of the ascending node, in hours. 6 or 18 is a dawn-dusk plane; 22.5 crosses
   * the equator southbound at 10:30 in the morning; 13.5 crosses northbound at 13:30.
   */
  ltan: number
  sensor: "optical" | "radar"
  /** km above the ground */
  altitude: number
  /** degrees, defaults to 97.5 (sun-synchronous at these heights) */
  inclination?: number
}

/** One satellite: which plane it flies in and where along the orbit it is, in degrees. */
export type ElxSat = { id: string; plane: string; phase: number }

export type ElxCity = { name: string; lat: number; lon: number; tz?: string }

export type ElxTileKind = "fields" | "flood" | "forest" | "harbor" | "site" | "coast" | "dunes" | "ponds"

/** What the right-hand side of a compare shows. */
export type ElxMode = "ndvi" | "radar" | "swir" | "change"

export type ElxFact = { label: string; value: string }

export type ElxUse = {
  id: string
  /** Pillar and tab label, e.g. "Agriculture". */
  label: string
  /** One line for the hero pillar strip. */
  line: string
  title: string
  body: string
  facts: ElxFact[]
  /** Generated imagery for this use, unless `image` / `compareImage` are given. */
  kind: ElxTileKind
  mode: ElxMode
  /** Compare labels, left then right, e.g. "True colour" and "NDVI". */
  before: string
  after: string
  place: string
  date: string
  image?: string
  compareImage?: string
  alt?: string
  cta?: ElxLink
}

export type ElxStory = {
  category: string
  title: string
  date: string
  kind: ElxTileKind
  image?: string
  alt?: string
  href?: string
}

export type ElxProduct = { id: string; label: string; sensor: "optical" | "radar" }

export type ElxTaskRequest = {
  area: string
  lat: number
  lon: number
  from: string
  to: string
  product: string
  use: string
  email: string
}

export type ElxFooterColumn = { title: string; links: ElxLink[] }

/** A strip of imagery: generated `kind` unless `image` is given, with a small coordinate caption. */
export type ElxBand = { kind: ElxTileKind; image?: string; caption?: string }

export type EarthLimbLandingProps = {
  brand?: string
  tagline?: string
  /** Your mark, shown in the header, the footer and the success state. Defaults to a drawn orbit mark. */
  logo?: React.ReactNode
  /** "dawn": the dawn-dusk radar plane riding the terminator. "day": a morning optical plane over a sunlit ocean. */
  preset?: "dawn" | "day"
  /** The one accent colour (buttons, kicker, ground track). */
  accent?: string
  theme?: "system" | "light" | "dark"
  themeToggle?: boolean
  /** Hero height. A definite length, never a percentage. */
  height?: string
  className?: string
  utility?: ElxLink[]
  nav?: ElxLink[]
  cta?: ElxLink
  kicker?: string
  headline?: string
  lede?: string
  secondaryCta?: ElxLink
  planes?: ElxPlane[]
  fleet?: ElxSat[]
  /** Which plane's ground track the hero follows. Defaults by preset. */
  featuredPlane?: string
  cities?: ElxCity[]
  imagesPerDay?: number
  archiveStat?: { value: string; sub: string }
  labels?: {
    fleet?: string
    fleetSub?: string
    pass?: string
    passSub?: string
    imaged?: string
    imagedSub?: string
    archive?: string
  }
  statement?: string
  /** A short row of facts under the statement, e.g. the pass times. */
  rhythm?: ElxFact[]
  card?: { kicker: string; title: string; body: string; link: ElxLink; kind?: ElxTileKind; image?: string }
  usesTitle?: string
  uses?: ElxUse[]
  spacecraft?: {
    name: string
    title: string
    body: string
    specs: ElxFact[]
    parts: string[]
    primary: ElxLink
    secondary: ElxLink
  }
  rosterTitle?: string
  archiveTitle?: string
  archive?: ElxStory[]
  tasking?: {
    title: string
    body: string
    steps: { title: string; body: string }[]
    products: ElxProduct[]
    submit?: string
  }
  /** Return false (or throw, or reject) to show the error state. */
  onTask?: (req: ElxTaskRequest) => unknown
  /** A full-bleed strip of imagery between the use cases and the spacecraft. */
  swath?: ElxBand | null
  /** A photo of the Earth's limb to use instead of the rendered one. The satellites still fly over it. */
  photo?: string
  footer?: {
    /** The imagery band at the top of the footer. */
    band?: ElxBand | null
    columns: ElxFooterColumn[]
    newsletter?: { title: string; body: string }
    note: string
    legal: ElxLink[]
  }
  onSubscribe?: (email: string) => unknown
  /** Which sections to render below the hero, in this order of the page. Defaults to all of them. */
  sections?: ElxSection[]
  /** Seeds the clouds and every generated image. */
  seed?: number
}

export type ElxSection = "stats" | "intro" | "uses" | "fleet" | "archive" | "tasking" | "footer"

// #region content
const DEFAULT_PLANES: ElxPlane[] = [
  { id: "dawn", name: "Dawn-dusk", ltan: 6, sensor: "radar", altitude: 560 },
  { id: "am", name: "Morning", ltan: 22.5, sensor: "optical", altitude: 520 },
  { id: "pm", name: "Afternoon", ltan: 13.5, sensor: "optical", altitude: 520 },
]

const DEFAULT_FLEET: ElxSat[] = [
  ...[0, 1, 2, 3, 4, 5].map((i) => ({ id: "KR-0" + (i + 1), plane: "dawn", phase: i * 60 + 12 })),
  ...[0, 1, 2, 3, 4, 5].map((i) => ({ id: "KS-0" + (i + 1), plane: "am", phase: i * 60 })),
  ...[0, 1, 2, 3, 4, 5].map((i) => ({ id: "KS-" + (i + 7 < 10 ? "0" : "") + (i + 7), plane: "pm", phase: i * 60 + 30 })),
]

const DEFAULT_CITIES: ElxCity[] = [
  { name: "Fresno", lat: 36.74, lon: -119.79, tz: "America/Los_Angeles" },
  { name: "Des Moines", lat: 41.59, lon: -93.62, tz: "America/Chicago" },
  { name: "New York", lat: 40.71, lon: -74.01, tz: "America/New_York" },
  { name: "São Paulo", lat: -23.55, lon: -46.63, tz: "America/Sao_Paulo" },
  { name: "London", lat: 51.51, lon: -0.13, tz: "Europe/London" },
  { name: "Rotterdam", lat: 51.92, lon: 4.48, tz: "Europe/Amsterdam" },
  { name: "Lagos", lat: 6.45, lon: 3.39, tz: "Africa/Lagos" },
  { name: "Nairobi", lat: -1.29, lon: 36.82, tz: "Africa/Nairobi" },
  { name: "Dubai", lat: 25.2, lon: 55.27, tz: "Asia/Dubai" },
  { name: "Mumbai", lat: 19.08, lon: 72.88, tz: "Asia/Kolkata" },
  { name: "Jakarta", lat: -6.2, lon: 106.85, tz: "Asia/Jakarta" },
  { name: "Tokyo", lat: 35.68, lon: 139.69, tz: "Asia/Tokyo" },
  { name: "Melbourne", lat: -37.81, lon: 144.96, tz: "Australia/Melbourne" },
]

const DEFAULT_USES: ElxUse[] = [
  {
    id: "agriculture",
    label: "Agriculture",
    line: "Crop health for every field in a county",
    title: "Find the struggling corner of a field before it spreads.",
    body: "Near-infrared shows plant stress days before the leaves turn. Get an NDVI map of every field you farm, insure or finance after each clear pass.",
    facts: [
      { label: "Revisit", value: "Twice a day" },
      { label: "Resolution", value: "30 cm" },
      { label: "Indices", value: "NDVI, NDRE" },
    ],
    kind: "fields",
    mode: "ndvi",
    before: "True colour",
    after: "NDVI",
    place: "Central Valley, California",
    date: "14 Oct, 10:31 local",
    cta: { label: "Agriculture plans", href: "#tasking" },
  },
  {
    id: "insurance",
    label: "Insurance",
    line: "Flood extent within hours of the river cresting",
    title: "Know which streets are under water while they still are.",
    body: "Radar sees through the storm that grounded the planes. Flood maps reach your claims system within three hours of the pass, day or night.",
    facts: [
      { label: "Sensor", value: "C-band radar" },
      { label: "Delivery", value: "Under 3 hours" },
      { label: "Works", value: "Day, night, cloud" },
    ],
    kind: "flood",
    mode: "radar",
    before: "Optical",
    after: "Radar",
    place: "Lower river valley",
    date: "11 Oct, 06:04 local",
    cta: { label: "Catastrophe response", href: "#tasking" },
  },
  {
    id: "forests",
    label: "Forests and carbon",
    line: "Burn scars and clearing, measured every week",
    title: "Measure the burn, not the smoke.",
    body: "Short-wave infrared cuts through haze to show where the fire went and what is still alight. Weekly change reports for carbon registries and forest owners.",
    facts: [
      { label: "Bands", value: "SWIR, NIR, red" },
      { label: "Cadence", value: "Weekly report" },
      { label: "Smallest change", value: "0.1 ha" },
    ],
    kind: "forest",
    mode: "swir",
    before: "True colour",
    after: "Short-wave infrared",
    place: "Coastal range",
    date: "09 Oct, 13:28 local",
    cta: { label: "Forest monitoring", href: "#tasking" },
  },
  {
    id: "maritime",
    label: "Maritime",
    line: "Every hull in port, in any weather",
    title: "Count the ships in port on a night with no moon.",
    body: "Radar picks out steel on a dark sea. We match every hull to its AIS signal and flag the ones that went quiet.",
    facts: [
      { label: "Sensor", value: "C-band radar" },
      { label: "Smallest hull", value: "12 m" },
      { label: "Latency", value: "45 minutes" },
    ],
    kind: "harbor",
    mode: "radar",
    before: "Optical",
    after: "Radar",
    place: "Container port anchorage",
    date: "13 Oct, 18:02 local",
    cta: { label: "Maritime feeds", href: "#tasking" },
  },
  {
    id: "infrastructure",
    label: "Infrastructure",
    line: "Construction progress, site by site",
    title: "Watch the site, not the spreadsheet.",
    body: "Monthly images of every site in your portfolio, with new roofs, roads and earthworks outlined for you to sign off.",
    facts: [
      { label: "Cadence", value: "Monthly or on demand" },
      { label: "Change", value: "Outlined for you" },
      { label: "Export", value: "GeoTIFF, GeoJSON" },
    ],
    kind: "site",
    mode: "change",
    before: "June",
    after: "October",
    place: "Logistics park, phase two",
    date: "02 Jun and 06 Oct",
    cta: { label: "Site monitoring", href: "#tasking" },
  },
]

const DEFAULT_RHYTHM: ElxFact[] = [
  { label: "Morning pass", value: "10:30 local" },
  { label: "Afternoon pass", value: "13:30 local" },
  { label: "In your bucket", value: "Within 3 hours" },
]

const DEFAULT_ARCHIVE: ElxStory[] = [
  { category: "Agriculture", title: "Centre-pivot farms at the start of the growing season", date: "12 Oct 2026", kind: "fields" },
  { category: "Industry", title: "Evaporation ponds turn pink as the brine concentrates", date: "08 Oct 2026", kind: "ponds" },
  { category: "Climate", title: "A year of drift: barchan dunes crossing the old highway", date: "02 Oct 2026", kind: "dunes" },
  { category: "Maritime", title: "Anchorage queue outside the container terminal", date: "29 Sep 2026", kind: "harbor" },
  { category: "Forests", title: "Six weeks after the fire, regrowth on the north slopes", date: "21 Sep 2026", kind: "forest" },
  { category: "Insurance", title: "The morning after the levee gave way", date: "14 Sep 2026", kind: "flood" },
]

const DEFAULT_SPACECRAFT = {
  name: "Kestrel Block 2",
  title: "Built around one telescope",
  body: "A 112 kg satellite with a 50 cm telescope. In one pass it turns to its target, takes a 14 km strip, then points its antenna at the next ground station.",
  specs: [
    { label: "Ground resolution", value: "30 cm" },
    { label: "Swath", value: "14 km" },
    { label: "Orbit", value: "520 km, sun-synchronous" },
    { label: "Bands", value: "8, visible to red edge" },
    { label: "Downlink", value: "3.2 Gbit/s, X-band" },
    { label: "Design life", value: "6 years" },
  ],
  parts: ["Telescope, 50 cm aperture", "Star trackers", "Solar wings, 420 W", "X-band antenna", "Radiator"],
  primary: { label: "Fleet specifications", href: "#fleet" },
  secondary: { label: "Download datasheet", href: "#fleet" },
}

const DEFAULT_TASKING = {
  title: "Ask for a picture",
  body: "Tell us where and when. We put it on the next suitable pass and email you the moment the imagery lands.",
  steps: [
    { title: "Name the place", body: "A city or a pair of coordinates. Draw the exact polygon later in the console." },
    { title: "We schedule the pass", body: "Optical waits for daylight and clear sky. Radar takes the first pass." },
    { title: "It lands in your bucket", body: "GeoTIFF and a preview, usually within three hours of collection." },
  ],
  products: [
    { id: "opt30", label: "Optical, 30 cm", sensor: "optical" },
    { id: "opt50", label: "Optical, 50 cm wide area", sensor: "optical" },
    { id: "sar1", label: "Radar, 1 m", sensor: "radar" },
  ] as ElxProduct[],
  submit: "Request tasking",
}

const DEFAULT_FOOTER = {
  band: { kind: "dunes", caption: "24.81°N 54.62°E" } as ElxBand,
  columns: [
    { title: "Imagery", links: [{ label: "Archive" }, { label: "Tasking" }, { label: "Monitoring" }, { label: "Pricing" }] },
    { title: "Solutions", links: [{ label: "Agriculture" }, { label: "Insurance" }, { label: "Forests and carbon" }, { label: "Maritime" }, { label: "Infrastructure" }] },
    { title: "Developers", links: [{ label: "API reference" }, { label: "Python SDK" }, { label: "System status" }, { label: "Changelog" }] },
    { title: "Company", links: [{ label: "About" }, { label: "Careers" }, { label: "Press" }, { label: "Open data" }, { label: "Contact" }] },
  ],
  newsletter: { title: "Image of the month", body: "One picture from the archive and what it shows. Once a month, nothing else." },
  note: "Kestrel. Oakland and Rotterdam.",
  legal: [{ label: "Privacy" }, { label: "Terms" }, { label: "Imagery licence" }, { label: "Export compliance" }],
}

/**
 * Each preset picks the plane the hero rides with, where its lead satellite's ground point sits in the
 * frame (fractions of the hero) and which way the light should come from: behind the limb at dawn,
 * over the viewer's shoulder by day.
 */
const PRESETS = {
  dawn: { plane: "dawn", at: [0.6, 0.34], light: [0, 0.6, -0.8] },
  day: { plane: "am", at: [0.6, 0.34], light: [0.25, 0.45, 0.86] },
}
// #endregion content

// #region orbit
const RE = 6371
const MU = 398600.4418
const DEG = Math.PI / 180
const EPOCH = Date.UTC(2026, 0, 1)

type V3 = number[]

const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: V3, b: V3) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const norm = (a: V3) => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1
  return [a[0] / l, a[1] / l, a[2] / l]
}
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)

function period(altitude: number) {
  const a = RE + altitude
  return 2 * Math.PI * Math.sqrt((a * a * a) / MU)
}

const julianDays = (ms: number) => ms / 86400000 + 2440587.5 - 2451545.0

/** Greenwich sidereal angle, radians. */
function gmst(ms: number) {
  let t = (0.779057273264 + 1.00273781191135448 * julianDays(ms)) % 1
  if (t < 0) t += 1
  return t * 2 * Math.PI
}

/** Unit vector to the sun in the inertial frame (about 0.01 degree is plenty here). */
function sunEci(ms: number): V3 {
  const d = julianDays(ms)
  const L = (280.46 + 0.9856474 * d) * DEG
  const g = (357.528 + 0.9856003 * d) * DEG
  const lam = L + (1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * DEG
  const eps = (23.439 - 0.0000004 * d) * DEG
  return [Math.cos(lam), Math.cos(eps) * Math.sin(lam), Math.sin(eps) * Math.sin(lam)]
}

/** A sun-synchronous plane's node follows the sun: right ascension of the sun plus the local-time offset. */
function raan(ms: number, ltan: number) {
  const s = sunEci(ms)
  return Math.atan2(s[1], s[0]) + (ltan - 12) * 15 * DEG
}

function planeNormal(om: number, inc: number): V3 {
  return [Math.sin(om) * Math.sin(inc), -Math.cos(om) * Math.sin(inc), Math.cos(inc)]
}

/** Unit position of a satellite in the inertial frame. */
function satEci(sat: ElxSat, plane: ElxPlane, ms: number): V3 {
  const om = raan(ms, plane.ltan)
  const inc = (plane.inclination ?? 97.5) * DEG
  const u = sat.phase * DEG + (2 * Math.PI * ((ms - EPOCH) / 1000)) / period(plane.altitude)
  const cu = Math.cos(u)
  const su = Math.sin(u)
  const co = Math.cos(om)
  const so = Math.sin(om)
  const ci = Math.cos(inc)
  return [co * cu - so * su * ci, so * cu + co * su * ci, su * Math.sin(inc)]
}

/** Inertial to Earth-fixed: turn by the sidereal angle. */
function toEcef(v: V3, theta: number): V3 {
  const c = Math.cos(theta)
  const s = Math.sin(theta)
  return [c * v[0] + s * v[1], -s * v[0] + c * v[1], v[2]]
}

function latLon(v: V3) {
  return { lat: Math.asin(clamp(v[2], -1, 1)) / DEG, lon: Math.atan2(v[1], v[0]) / DEG }
}

function cityVec(c: { lat: number; lon: number }): V3 {
  const la = c.lat * DEG
  const lo = c.lon * DEG
  return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)]
}

/** Where a satellite is over the ground, and whether that ground is in daylight. */
function subPoint(sat: ElxSat, plane: ElxPlane, ms: number) {
  const th = gmst(ms)
  const e = toEcef(satEci(sat, plane, ms), th)
  const sun = toEcef(sunEci(ms), th)
  return { ...latLon(e), day: dot(e, sun) > 0 }
}

/** Reach of a pass: 45 degrees off nadir from about 520 km is roughly 500 km on the ground. */
const REACH = 4.5 * DEG
const MIN_SUN = 10 * DEG

/**
 * The first time any satellite in `fleet` can image `city`: its ground point within REACH, and for
 * optical planes the sun at least 10 degrees up there. Steps of 20 s over `hours`.
 */
function nextPass(fleet: ElxSat[], planes: ElxPlane[], city: { lat: number; lon: number }, from: number, hours = 36, sensor?: "optical" | "radar") {
  const cv = cityVec(city)
  const cosReach = Math.cos(REACH)
  const sinSun = Math.sin(MIN_SUN)
  const byId: { [k: string]: ElxPlane } = {}
  for (const p of planes) byId[p.id] = p
  const sats = fleet.filter((s) => byId[s.plane] && (!sensor || byId[s.plane].sensor === sensor))
  const end = from + hours * 3600000
  for (let t = from; t <= end; t += 20000) {
    const th = gmst(t)
    const lit = dot(cv, toEcef(sunEci(t), th)) > sinSun
    for (const s of sats) {
      const p = byId[s.plane]
      if (p.sensor === "optical" && !lit) continue
      if (dot(toEcef(satEci(s, p, t), th), cv) > cosReach) return { sat: s, plane: p, at: t }
    }
  }
  return null
}

function imagedToday(ms: number, perDay: number) {
  const day = ((ms % 86400000) + 86400000) % 86400000
  return Math.floor((day / 86400000) * perDay)
}

const pad = (n: number) => (n < 10 ? "0" : "") + n

function clock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds))
  return pad(Math.floor(s / 3600)) + ":" + pad(Math.floor((s % 3600) / 60)) + ":" + pad(s % 60)
}

function fmtLat(v: number) {
  return Math.abs(v).toFixed(1) + "°" + (v >= 0 ? "N" : "S")
}
function fmtLon(v: number) {
  return Math.abs(v).toFixed(1) + "°" + (v >= 0 ? "E" : "W")
}

/** The city that best matches the visitor's time zone, by name and then by offset. */
function cityForZone(cities: ElxCity[], tz: string, offsetMinutes: number) {
  const exact = cities.findIndex((c) => c.tz === tz)
  if (exact > -1) return exact
  let best = 0
  let gap = Infinity
  cities.forEach((c, i) => {
    const g = Math.abs(c.lon / 15 + offsetMinutes / 60)
    if (g < gap) {
      gap = g
      best = i
    }
  })
  return best
}

/** Rotation from the inertial frame to the hero's view: plane normal and sun side land where the preset says. */
function viewMatrix(nEci: V3, sun: V3, nLoc: V3, sideLoc: V3) {
  let e1 = norm(nEci)
  if (dot(sun, e1) < 0) e1 = [-e1[0], -e1[1], -e1[2]]
  let s2 = [sun[0] - dot(sun, e1) * e1[0], sun[1] - dot(sun, e1) * e1[1], sun[2] - dot(sun, e1) * e1[2]]
  if (Math.hypot(s2[0], s2[1], s2[2]) < 1e-6) s2 = cross(e1, [0, 0, 1])
  const e2 = norm(s2)
  const e3 = cross(e1, e2)
  const f1 = norm(nLoc)
  const t = [sideLoc[0] - dot(sideLoc, f1) * f1[0], sideLoc[1] - dot(sideLoc, f1) * f1[1], sideLoc[2] - dot(sideLoc, f1) * f1[2]]
  const f2 = norm(t)
  const f3 = cross(f1, f2)
  const m: number[] = []
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) m.push(f1[r] * e1[c] + f2[r] * e2[c] + f3[r] * e3[c])
  return m
}

const mul = (m: number[], v: V3) => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
]

/** The planet's disk in CSS pixels: a horizon arcing across the top of the hero. */
function heroDisk(w: number, h: number) {
  const r = Math.max(w * 1.05, h * 1.3)
  return { cx: w * 0.66, cy: h * 0.14 + r, r }
}

/** Device pixel ratio that keeps the canvas inside a pixel budget (drops below 1 on huge screens). */
function canvasRatio(w: number, h: number, dpr: number, budget = 2.2e6) {
  return Math.min(dpr, Math.sqrt(budget / Math.max(1, w * h)))
}

function nextIndex(i: number, key: string, n: number) {
  if (key === "ArrowRight" || key === "ArrowDown") return (i + 1) % n
  if (key === "ArrowLeft" || key === "ArrowUp") return (i - 1 + n) % n
  if (key === "Home") return 0
  if (key === "End") return n - 1
  return i
}

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())
}

/** Errors by field for a tasking request; empty when it can be sent. */
function validateTask(f: { area: string; lat: string; lon: string; from: string; to: string; email: string }) {
  const e: { [k: string]: string } = {}
  if (f.area === "custom") {
    const la = Number(f.lat)
    const lo = Number(f.lon)
    if (f.lat.trim() === "" || !isFinite(la) || la < -90 || la > 90) e.lat = "Latitude is a number from -90 to 90."
    if (f.lon.trim() === "" || !isFinite(lo) || lo < -180 || lo > 180) e.lon = "Longitude is a number from -180 to 180."
  }
  if (!f.from) e.from = "Pick the first day you need it."
  if (!f.to) e.to = "Pick the last day that is still useful."
  if (f.from && f.to && f.to < f.from) e.to = "The window ends before it starts."
  if (!isEmail(f.email)) e.email = "Enter a full work email, like name@company.com."
  return e
}

/** Darken a hex colour toward black by `k` (0..1), for accent text on light paper. */
function shade(hex: string, k: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return hex
  const n = parseInt(m[1], 16)
  const ch = (s: number) => Math.round(((n >> s) & 255) * (1 - k))
  return "#" + [ch(16), ch(8), ch(0)].map((v) => (v < 16 ? "0" : "") + v.toString(16)).join("")
}

/**
 * Everything the hero needs for one instant. The view rides with `lead`: its ground point stays where
 * the preset puts it and its ground track runs along the limb, while the Earth turns underneath.
 * V maps inertial to view, M maps view to Earth-fixed (for the clouds), `track` is the plane's normal
 * in view space. `flip` mirrors the direction of travel; pass back the returned value so it never
 * changes mid-session.
 */
function heroGeometry(ms: number, w: number, h: number, preset: "dawn" | "day", plane: ElxPlane, lead: ElxSat, flip?: boolean) {
  const P = PRESETS[preset] || PRESETS.dawn
  const disk = heroDisk(w, h)
  const a1 = satEci(lead, plane, ms)
  const ah = satEci(lead, plane, ms + 1000)
  const a2 = norm([ah[0] - dot(ah, a1) * a1[0], ah[1] - dot(ah, a1) * a1[1], ah[2] - dot(ah, a1) * a1[2]])
  const a3 = cross(a1, a2)
  let lx = (P.at[0] * w - disk.cx) / disk.r
  let ly = (disk.cy - (w < 640 ? Math.min(P.at[1], 0.22) : P.at[1]) * h) / disk.r
  const l2 = lx * lx + ly * ly
  if (l2 > 0.98) {
    lx *= Math.sqrt(0.98 / l2)
    ly *= Math.sqrt(0.98 / l2)
  }
  const b1 = [lx, ly, Math.sqrt(Math.max(0, 1 - lx * lx - ly * ly))]
  const t0 = [ly, -lx, 0]
  const tt = norm([t0[0] - dot(t0, b1) * b1[0], t0[1] - dot(t0, b1) * b1[1], t0[2] - dot(t0, b1) * b1[2]])
  const sun = sunEci(ms)
  const build = (b2: V3) => {
    const b3 = cross(b1, b2)
    const V: number[] = []
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) V.push(b1[r] * a1[c] + b2[r] * a2[c] + b3[r] * a3[c])
    return { V, b3 }
  }
  let f = flip
  if (f === undefined) f = dot(mul(build(tt).V, sun), P.light) < 0
  const { V, b3 } = build(f ? [-tt[0], -tt[1], -tt[2]] : tt)
  const th = gmst(ms)
  const c = Math.cos(th)
  const s = Math.sin(th)
  const Rz = [c, s, 0, -s, c, 0, 0, 0, 1]
  const M: number[] = []
  for (let r = 0; r < 3; r++)
    for (let k = 0; k < 3; k++) M.push(Rz[r * 3] * V[k * 3] + Rz[r * 3 + 1] * V[k * 3 + 1] + Rz[r * 3 + 2] * V[k * 3 + 2])
  return { V, M, sun: mul(V, sun), disk, track: b3, flip: f }
}

/** The satellite the hero rides with: any in a dawn-dusk plane, otherwise the one over the most sunlit ground. */
function pickLead(sats: ElxSat[], plane: ElxPlane, ms: number) {
  const mine = sats.filter((x) => x.plane === plane.id)
  if (!mine.length) return null
  if (Math.abs((plane.ltan % 12) - 6) < 1.5) return mine[0]
  const sun = sunEci(ms)
  let best = mine[0]
  let bv = -2
  for (const x of mine) {
    const v = dot(satEci(x, plane, ms), sun)
    if (v > bv) {
      bv = v
      best = x
    }
  }
  return best
}

/** Where the sun is overhead, in degrees. */
function subSolar(ms: number) {
  return latLon(toEcef(sunEci(ms), gmst(ms)))
}

/** Latitude of the day-night line at a longitude, for a sun overhead at (sunLat, sunLon). */
function terminatorLat(lon: number, sunLat: number, sunLon: number) {
  const d = Math.abs(sunLat) < 0.05 ? (sunLat < 0 ? -0.05 : 0.05) : sunLat
  return Math.atan(-Math.cos((lon - sunLon) * DEG) / Math.tan(d * DEG)) / DEG
}

/** Equirectangular map position, 0..w by 0..h. */
const mapXY = (lat: number, lon: number, w: number, h: number) => ({ x: ((lon + 180) / 360) * w, y: ((90 - lat) / 180) * h })

/**
 * A satellite's ground track as SVG path data from `from` to `to` (ms), broken where it wraps
 * across the date line.
 */
function trackSvg(sat: ElxSat, plane: ElxPlane, from: number, to: number, w: number, h: number, step = 30000) {
  let d = ""
  let last: { lon: number } | null = null
  for (let t = from; t <= to; t += step) {
    const p = subPoint(sat, plane, t)
    const q = mapXY(p.lat, p.lon, w, h)
    d += (last && Math.abs(p.lon - last.lon) < 180 ? "L" : "M") + q.x.toFixed(1) + " " + q.y.toFixed(1)
    last = p
  }
  return d
}

/** Project a view-space point (planet radius 1) to hero pixels; `front` is false behind the planet. */
function project(p: V3, disk: { cx: number; cy: number; r: number }) {
  return { x: disk.cx + p[0] * disk.r, y: disk.cy - p[1] * disk.r, front: p[2] > 0 || p[0] * p[0] + p[1] * p[1] > 1 }
}

/** The ground track (a great circle around `normal`) as SVG path data, front side only. */
function trackPath(normal: V3, disk: { cx: number; cy: number; r: number }, w: number, h: number, avoid?: { l: number; t: number; r: number; b: number } | null) {
  const n = norm(normal)
  const a = norm(Math.abs(n[0]) < 0.9 ? cross(n, [1, 0, 0]) : cross(n, [0, 1, 0]))
  const b = cross(n, a)
  let d = ""
  let pen = false
  for (let i = 0; i <= 720; i++) {
    const u = (i / 720) * Math.PI * 2
    const p = [a[0] * Math.cos(u) + b[0] * Math.sin(u), a[1] * Math.cos(u) + b[1] * Math.sin(u), a[2] * Math.cos(u) + b[2] * Math.sin(u)]
    const x = disk.cx + p[0] * disk.r
    const y = disk.cy - p[1] * disk.r
    const hidden = !!avoid && x > avoid.l && x < avoid.r && y > avoid.t && y < avoid.b
    const ok = p[2] > 0 && x > -40 && x < w + 40 && y > -40 && y < h + 40 && !hidden
    if (ok) {
      d += (pen ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1)
      pen = true
    } else pen = false
  }
  return d
}
// #endregion orbit

// #region imagery
// Procedural satellite imagery. Every kind returns a true-colour pixel and the sensor's other view
// (NDVI, radar, short-wave infrared or the later date) for the same ground, so a compare lines up.

function hash2(x: number, y: number, s: number) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1442695041)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

function vnoise(x: number, y: number, s: number) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash2(xi, yi, s)
  const b = hash2(xi + 1, yi, s)
  const c = hash2(xi, yi + 1, s)
  const d = hash2(xi + 1, yi + 1, s)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

function fbm2(x: number, y: number, s: number, oct = 4) {
  let a = 0.5
  let t = 0
  let n = 0
  for (let i = 0; i < oct; i++) {
    t += a * vnoise(x, y, s + i * 17)
    n += a
    x = x * 2.03 + 5.3
    y = y * 2.03 + 1.7
    a *= 0.5
  }
  return t / n
}

const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

const mix3 = (o: Float32Array, at: number, c: number[], k: number) => {
  o[at] += (c[0] - o[at]) * k
  o[at + 1] += (c[1] - o[at + 1]) * k
  o[at + 2] += (c[2] - o[at + 2]) * k
}

const put = (o: Float32Array, at: number, r: number, g: number, b: number) => {
  o[at] = r
  o[at + 1] = g
  o[at + 2] = b
}

/** The classic red-yellow-green NDVI ramp. */
function ndviColor(v: number, o: Float32Array, at: number) {
  const stops = [
    [0, 0.55, 0.2, 0.13],
    [0.22, 0.85, 0.47, 0.22],
    [0.4, 0.96, 0.86, 0.47],
    [0.58, 0.62, 0.81, 0.36],
    [0.86, 0.09, 0.47, 0.22],
  ]
  const x = clamp(v, 0, 1)
  for (let i = 1; i < stops.length; i++) {
    if (x <= stops[i][0] || i === stops.length - 1) {
      const a = stops[i - 1]
      const b = stops[i]
      const k = clamp((x - a[0]) / (b[0] - a[0]), 0, 1)
      put(o, at, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k, a[3] + (b[3] - a[3]) * k)
      return
    }
  }
}

function hexRgb(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || "").trim())
  const n = m ? parseInt(m[1], 16) : 0xffa23a
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

const CROPS = [
  [0.16, 0.29, 0.12, 0.84],
  [0.3, 0.44, 0.17, 0.74],
  [0.66, 0.57, 0.36, 0.28],
  [0.43, 0.34, 0.25, 0.12],
  [0.56, 0.5, 0.39, 0.2],
  [0.38, 0.41, 0.22, 0.56],
]

/** Farmland: sections with centre pivots and strip fields, roads, farmsteads and patches of stress. Writes rgb + ndvi. */
function farm(X: number, Y: number, s: number, o: Float32Array) {
  const x = X * 0.994 - Y * 0.11 + 37
  const y = X * 0.11 + Y * 0.994 + 11
  const S = 150
  const gx = Math.floor(x / S)
  const gy = Math.floor(y / S)
  const fx = x / S - gx
  const fy = y / S - gy
  const tex = fbm2(X * 0.05, Y * 0.05, s + 3, 3)
  const edge = Math.min(fx, fy, 1 - fx, 1 - fy)
  if (edge < 0.013) {
    const t = 0.58 + tex * 0.08
    put(o, 0, t, t * 0.97, t * 0.9)
    o[3] = 0.06
    return
  }
  const h0 = hash2(gx, gy, s)
  let crop = 4
  let row = 0
  let line = 0
  if (h0 < 0.45) {
    const dx = fx - 0.5
    const dy = fy - 0.5
    const d = Math.hypot(dx, dy)
    if (d < 0.466) {
      const start = hash2(gx, gy, s + 1) * Math.PI * 2
      let a = Math.atan2(dy, dx) - start
      a = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
      const half = h0 < 0.22 ? 0 : a < Math.PI ? 0 : 1
      crop = Math.floor(hash2(gx * 7 + half, gy * 3, s + 2) * 6)
      row = d * S
      line = Math.abs(((d * S) % 26) - 13) < 0.7 && d > 0.05 ? 1 : 0
      if (d < 0.012) line = 2
    } else crop = h0 < 0.2 ? 4 : 3
  } else {
    const n = 2 + Math.floor(hash2(gx, gy, s + 3) * 3)
    const vert = hash2(gx, gy, s + 4) < 0.5
    const t = (vert ? fx : fy) * n
    const k = Math.floor(t)
    if (t - k < 0.025 * n || t - k > 1 - 0.025 * n) line = 3
    crop = Math.floor(hash2(gx * 13 + k, gy * 5 + k, s + 6) * 6)
    row = vert ? y : x
  }
  const c = CROPS[crop]
  const rowK = crop <= 1 || crop === 5 ? 1 + 0.07 * Math.sin(row * 0.95) : 1 + 0.03 * Math.sin(row * 0.6)
  const g = (0.88 + 0.24 * tex) * rowK
  put(o, 0, c[0] * g, c[1] * g, c[2] * g)
  let nd = c[3] + (tex - 0.5) * 0.08
  if (c[3] > 0.45) {
    const st = smooth(0.56, 0.72, fbm2(X * 0.006, Y * 0.006, s + 5, 3))
    nd -= st * 0.4
    mix3(o, 0, [0.52, 0.47, 0.27], st * 0.45)
  }
  if (line === 1) mix3(o, 0, [0.5, 0.45, 0.36], 0.35)
  if (line === 2) put(o, 0, 0.8, 0.8, 0.78)
  if (line === 3) mix3(o, 0, [0.5, 0.44, 0.34], 0.6)
  if (h0 >= 0.45 && hash2(gx, gy, s + 8) < 0.22 && fx < 0.14 && fy < 0.14) {
    const tr = vnoise(X * 0.22, Y * 0.22, s + 9)
    if (tr > 0.55) {
      put(o, 0, 0.1, 0.18, 0.09)
      nd = 0.8
    }
    const bx = Math.floor(fx * 60)
    const by = Math.floor(fy * 60)
    if (hash2(bx >> 1, by >> 1, s + 10) < 0.22 && fx > 0.03 && fy > 0.03) {
      const r = 0.55 + hash2(bx >> 1, by >> 1, s + 11) * 0.35
      put(o, 0, r, r, r * 0.97)
      nd = 0.02
    }
  }
  o[3] = nd
}

/** Radar brightness from backscatter: four-look speckle (mean 1), so texture reads as surface, not static. */
function sar(back: number, X: number, Y: number, s: number) {
  const a = Math.floor(X * 1.6)
  const b = Math.floor(Y * 1.6)
  let t = 0
  for (let k = 0; k < 4; k++) t += -Math.log(hash2(a, b, s + 9 + k * 31) + 1e-4)
  return clamp(Math.pow(back * (0.35 + 0.65 * (t / 4)), 0.85), 0, 1)
}

/** A suburban lot grid seen from above: varied roofs with ridges and shadows, yards, trees, pools. */
function suburb(X: number, Y: number, s: number, o: Float32Array) {
  const t = fbm2(X * 0.06, Y * 0.06, s + 1, 3)
  const bx = X % 96
  const by = Y % 64
  if (bx < 9 || by < 8) {
    const r = 0.4 + t * 0.05 + (Math.abs(bx - 4.5) < 0.4 || Math.abs(by - 4) < 0.4 ? 0.12 : 0)
    put(o, 0, r, r, r * 0.98)
    return 0.28
  }
  const lot = Math.min(2, Math.floor((bx - 9) / 29))
  const row = Math.min(1, Math.floor((by - 8) / 28))
  const lx = bx - 9 - lot * 29
  const ly = by - 8 - row * 28
  const id = [Math.floor(X / 96) * 3 + lot, Math.floor(Y / 64) * 2 + row]
  const h = (k: number) => hash2(id[0], id[1], s + k)
  const hw = 10 + h(1) * 7
  const hh = 8 + h(2) * 6
  const hx = 3 + h(3) * (26 - hw - 4)
  const hy = row === 0 ? 3 + h(4) * 4 : 26 - hh - 3 - h(4) * 4
  const inHouse = (x: number, y: number) => x > hx && x < hx + hw && y > hy && y < hy + hh
  const yard = 0.82 + 0.3 * t
  put(o, 0, 0.3 * yard, 0.35 * yard, 0.22 * yard)
  let back = 0.36
  const pool = h(5) < 0.32
  const px = hx + hw * 0.2
  const py = row === 0 ? hy + hh + 3 : hy - 7
  if (pool && lx > px && lx < px + 6 && ly > py && ly < py + 4) {
    put(o, 0, 0.36, 0.63, 0.7)
    back = 0.06
  }
  const dx = hx + hw * 0.65
  if (lx > dx && lx < dx + 4 && (row === 0 ? ly < hy : ly > hy + hh)) put(o, 0, 0.55, 0.54, 0.52)
  const tr = vnoise(X * 0.22, Y * 0.22, s + 2)
  if (tr > 0.66 && !inHouse(lx, ly)) {
    put(o, 0, 0.11 + tr * 0.05, 0.2 + tr * 0.05, 0.1)
    back = 0.45
  } else if (vnoise((X - 2.5) * 0.22, (Y - 2.5) * 0.22, s + 2) > 0.66) mix3(o, 0, [0, 0, 0], 0.4)
  if (inHouse(lx, ly)) {
    const R = [
      [0.47, 0.45, 0.43],
      [0.52, 0.42, 0.36],
      [0.6, 0.58, 0.55],
      [0.5, 0.38, 0.32],
      [0.36, 0.37, 0.39],
    ][Math.floor(h(6) * 5)]
    const vert = h(7) < 0.4
    const side = vert ? lx - (hx + hw / 2) : ly - (hy + hh / 2)
    const k = Math.abs(side) < 0.5 ? 0.8 : side < 0 ? 1.08 : 0.9
    put(o, 0, R[0] * k, R[1] * k, R[2] * k)
    back = 0.9
  } else if (inHouse(lx - 2.5, ly - 2.5)) {
    mix3(o, 0, [0, 0, 0], 0.45)
    back = 0.12
  }
  return back
}

type PixelFn = (X: number, Y: number, o: Float32Array) => void

function makeKind(kind: ElxTileKind, s: number, accent: string): PixelFn {
  const acc = hexRgb(accent)
  if (kind === "fields")
    return (X, Y, o) => {
      farm(X, Y, s, o)
      ndviColor(o[3], o, 3)
    }

  if (kind === "flood")
    return (X, Y, o) => {
      farm(X * 1.25 + 300, Y * 1.25, s + 40, o)
      const nd = o[3]
      let back = 0.22 + nd * 0.32 + vnoise(X * 0.6, Y * 0.6, s + 7) * 0.06
      const ry = 300 + 95 * Math.sin(X * 0.0065 + 1.2) + 70 * (fbm2(X * 0.004, 3.1, s + 1, 3) - 0.5)
      const d = Math.abs(Y - ry)
      const elev = fbm2(X * 0.006, Y * 0.006, s + 2, 4) * 80 + d * 0.2
      const town = X > 540 && X < 840 && Y > 40 && Y < 250
      let urban = false
      if (town) {
        const bx = (X - 540) % 34
        const by = (Y - 40) % 26
        const road = bx < 5 || by < 4
        if (road) {
          put(o, 0, 0.44, 0.43, 0.41)
          back = 0.5
        } else {
          const hb = hash2(Math.floor((X - 540) / 34), Math.floor((Y - 40) / 26), s + 3)
          const inner = bx > 9 && bx < 29 && by > 7 && by < 21
          if (inner) {
            const roof = hb < 0.5 ? [0.58, 0.55, 0.52] : hb < 0.8 ? [0.55, 0.33, 0.26] : [0.35, 0.35, 0.37]
            put(o, 0, roof[0], roof[1], roof[2])
            urban = true
            back = 0.92
          } else {
            put(o, 0, 0.2, 0.3, 0.14)
            back = 0.42
          }
        }
      }
      const river = d < 8 + 3 * vnoise(X * 0.05, 1, s)
      const flood = elev < 36 && !urban
      if (river) {
        put(o, 0, 0.23, 0.25, 0.19)
        back = 0.03
      } else if (flood) {
        const m = 0.9 + 0.2 * fbm2(X * 0.02, Y * 0.02, s + 4, 3)
        put(o, 0, 0.47 * m, 0.4 * m, 0.29 * m)
        back = 0.045
      } else if (elev < 41) {
        mix3(o, 0, [0.3, 0.27, 0.2], 0.55)
        back *= 0.75
      }
      const v = sar(back, X, Y, s)
      put(o, 3, v * 0.95, v * 0.97, v)
    }

  if (kind === "forest")
    return (X, Y, o) => {
      const e = fbm2(X * 0.004, Y * 0.004, s, 5)
      const ex = fbm2((X + 4) * 0.004, Y * 0.004, s, 5)
      const ey = fbm2(X * 0.004, (Y + 4) * 0.004, s, 5)
      const hill = clamp(0.95 + (ex - e) * 34 - (ey - e) * 22, 0.55, 1.35)
      const crown = vnoise(X * 0.42, Y * 0.42, s + 1)
      const crown2 = vnoise(X * 0.9, Y * 0.9, s + 6)
      const cg = (0.72 + 0.4 * crown + 0.12 * crown2) * hill
      put(o, 0, 0.09 * cg, 0.17 * cg, 0.08 * cg)
      put(o, 3, 0.13 * cg, 0.46 * cg, 0.15 * cg)
      const dxs = (X - 520) / 300
      const dys = (Y - 290) / 210
      const b = fbm2(X * 0.0035 + 4, Y * 0.0035, s + 2, 4) * 0.9 + 0.55 * Math.exp(-(dxs * dxs + dys * dys))
      const road = Math.abs(Y - (140 + 70 * Math.sin(X * 0.008 + s))) < 1.6
      const water = Math.abs(Y - (470 + 35 * Math.sin(X * 0.011 + 2))) < 6
      const cut = false
      if (water) {
        put(o, 0, 0.05, 0.08, 0.09)
        put(o, 3, 0.02, 0.03, 0.07)
      } else if (b > 0.885) {
        const ash = fbm2(X * 0.09, Y * 0.09, s + 4, 3) > 0.6
        const isl = fbm2(X * 0.05, Y * 0.05, s + 5, 3) > 0.69
        const char = 0.8 + 0.4 * fbm2(X * 0.02, Y * 0.02, s + 8, 3)
        if (isl) {
          put(o, 0, 0.2 * hill, 0.19 * hill, 0.1 * hill)
          put(o, 3, 0.3 * hill, 0.38 * hill, 0.14 * hill)
        } else if (ash) {
          put(o, 0, 0.34 * hill, 0.32 * hill, 0.3 * hill)
          put(o, 3, 0.62, 0.32, 0.29)
        } else {
          put(o, 0, 0.12 * hill * char, 0.1 * hill * char, 0.09 * hill * char)
          put(o, 3, 0.47 * hill * char, 0.11 * hill * char, 0.1 * hill * char)
        }
      } else if (b > 0.86) {
        put(o, 0, 0.32 * hill, 0.22 * hill, 0.12 * hill)
        put(o, 3, 0.7 * hill, 0.3 * hill, 0.18 * hill)
        if (X > 610 && hash2(Math.floor(X / 3), Math.floor(Y / 3), s + 6) < 0.5) {
          mix3(o, 0, [0.42, 0.36, 0.33], 0.5)
          put(o, 3, 1, 0.83, 0.27)
        }
      } else if (cut) {
        const t = (0.86 + 0.28 * fbm2(X * 0.12, Y * 0.12, s + 7, 3)) * hill
        put(o, 0, 0.42 * t, 0.43 * t, 0.29 * t)
        put(o, 3, 0.78 * t, 0.56 * t, 0.55 * t)
      }
      if (road && !water) {
        put(o, 0, 0.6, 0.53, 0.41)
        put(o, 3, 0.86, 0.72, 0.72)
      }
    }

  if (kind === "harbor") {
    const ships: number[][] = []
    for (let i = 0; ships.length < 16 && i < 600; i++) {
      const x = 270 + hash2(i, 1, s) * 300
      const y = 20 + hash2(i, 2, s) * 860
      if (fbm2(x * 0.004, y * 0.004, s, 4) * 0.5 + (x / 900) * 0.75 > 0.62) continue
      if (ships.some((p) => Math.hypot(p[0] - x, p[1] - y) < 64)) continue
      const len = 12 + Math.pow(hash2(i, 3, s), 1.6) * 30
      ships.push([x, y, len, len * (0.14 + hash2(i, 5, s) * 0.06), 0.35 + hash2(i, 4, s) * 0.4, Math.floor(hash2(i, 6, s) * 3), hash2(i, 7, s) < 0.6 ? 1 : 0])
    }
    for (let k = 0; k < 8; k++) ships.push([560, 92 + k * 104 + 22, 26 + (k % 3) * 6, 5.5, 0, k % 3, 0])
    const PAL = [
      [0.62, 0.22, 0.18],
      [0.18, 0.3, 0.5],
      [0.84, 0.84, 0.81],
      [0.74, 0.42, 0.2],
      [0.24, 0.42, 0.3],
    ]
    const HULL = [
      [0.42, 0.14, 0.12],
      [0.1, 0.12, 0.15],
      [0.16, 0.25, 0.4],
    ]
    // drawn with the coast along the bottom: the old x axis runs down the tile
    return (Xt, Yt, o) => {
      const X = Yt * 0.95 + 262
      const Y = Xt
      const lv = fbm2(X * 0.004, Y * 0.004, s, 4) * 0.5 + (X / 900) * 0.75
      const pierBand = (Y - 70) % 104
      const pier = X > 520 && X < 700 && pierBand > 0 && pierBand < 26
      const land = lv > 0.72 || pier || X >= 760
      const wn = vnoise(X * 0.6, Y * 0.12, s + 2)
      if (!land) {
        const shallow = smooth(0.5, 0.72, lv)
        put(o, 0, 0.03 + 0.07 * shallow + wn * 0.012, 0.1 + 0.17 * shallow + wn * 0.015, 0.16 + 0.13 * shallow + wn * 0.015)
        let back = 0.035 + 0.03 * vnoise(X * 0.01, Y * 0.04, s + 3)
        let pt = false
        for (const p of ships) {
          const dx = X - p[0]
          const dy = Y - p[1]
          if (dx * dx + dy * dy > 6400) continue
          const c = Math.cos(p[4])
          const sn = Math.sin(p[4])
          const u = dx * c + dy * sn
          const v = -dx * sn + dy * c
          const halfL = p[2] / 2
          const w = (p[3] / 2) * (u > halfL * 0.62 ? Math.max(0, 1 - (u - halfL * 0.62) / (halfL * 0.38)) : 1)
          if (Math.abs(u) < halfL && Math.abs(v) < w) {
            const hull = HULL[p[5]]
            if (u < -halfL * 0.62) put(o, 0, 0.88, 0.88, 0.86)
            else if (Math.abs(v) > w - 0.9) put(o, 0, hull[0], hull[1], hull[2])
            else if (p[5] === 1 && Math.abs(v) < w - 1) {
              const c2 = PAL[Math.floor(hash2(Math.floor(u / 2.6), Math.floor(v / 1.6), s + 8) * 5)]
              put(o, 0, c2[0] * 0.9, c2[1] * 0.9, c2[2] * 0.9)
            } else put(o, 0, hull[0] * 1.3 + 0.05, hull[1] * 1.3 + 0.05, hull[2] * 1.3 + 0.05)
            back = 1
            pt = true
          } else if (p[6] && u < -halfL && u > -halfL - 80) {
            const d = -u - halfL
            const fade = 1 - d / 80
            if (Math.abs(Math.abs(v) - d * 0.35) < 0.7) mix3(o, 0, [0.55, 0.62, 0.64], 0.32 * fade)
            if (Math.abs(v) < 1.1 && d < 34) mix3(o, 0, [0.62, 0.7, 0.72], 0.5 * (1 - d / 34))
          } else if ((Math.abs(u) < 0.6 && Math.abs(v) < 14) || (Math.abs(v) < 0.6 && Math.abs(u) < halfL + 10)) {
            back = Math.max(back, 0.5)
          }
        }
        const su = (Y - 300) * 0.92 + (X - 420) * 0.39
        const sv = -(Y - 300) * 0.39 + (X - 420) * 0.92
        const slick = (su / 150) * (su / 150) + (sv / 34) * (sv / 34) + (fbm2(X * 0.02, Y * 0.02, s + 11, 3) - 0.5) * 1.6
        if (slick < 1 && !pt) {
          back *= 0.22
          mix3(o, 0, [0.07, 0.11, 0.14], 0.35)
        }
        const val = pt ? 1 : sar(back, X, Y, s)
        put(o, 3, val * 0.95, val * 0.97, val)
        return
      }
      const t = fbm2(X * 0.05, Y * 0.05, s + 4, 3)
      let back = 0.3
      const edge = (pier && (pierBand < 2.2 || pierBand > 23.8)) || (lv > 0.72 && lv < 0.727 && !pier)
      if (pier || X > 640) {
        put(o, 0, 0.56 + t * 0.06, 0.56 + t * 0.06, 0.54 + t * 0.06)
        back = 0.45
        const yx = (X - 652) % 48
        const yy = (Y + 6) % 26
        if (X > 652 && !pier && yx < 40 && yy < 19) {
          const bay = Math.floor(yx / 3.3)
          const tier = Math.floor(yy / 6.4)
          const filled = hash2(Math.floor((X - 652) / 48) * 13 + bay, Math.floor((Y + 6) / 26) * 3 + tier, s + 5)
          if (filled < 0.82 && yx % 3.3 < 2.9 && yy % 6.4 < 5.8) {
            const c = PAL[Math.floor(filled * 6.1) % 5]
            const k = 0.78 + 0.18 * hash2(Math.floor(X / 3.3), Math.floor(Y / 6.4), s + 6)
            put(o, 0, c[0] * k, c[1] * k, c[2] * k)
            back = 0.95
          }
        }
      } else back = suburb(X + 13, Y + 7, s + 20, o)
      if (edge) back = 1
      const val = sar(back, X, Y, s)
      put(o, 3, val * 0.95, val * 0.97, val)
    }
  }

  if (kind === "coast") {
    const tmp = new Float32Array(6)
    return (X, Y, o) => {
      const shore = 200 + 34 * Math.sin(X * 0.004 + s) + 22 * (fbm2(X * 0.006, 2, s + 1, 3) - 0.5)
      const loss = 34 * Math.exp(-Math.pow((X - 470) / 170, 2))
      const draw = (sh: number, at: number, later: boolean) => {
        const d = Y - sh
        if (d < 0) {
          const deep = smooth(-160, -10, d)
          const wv = vnoise(X * 0.5, Y * 0.12, s + 2)
          put(o, at, 0.04 + 0.12 * deep + wv * 0.015, 0.14 + 0.22 * deep + wv * 0.015, 0.2 + 0.16 * deep + wv * 0.01)
          const surf = d > -28 && Math.sin(d * 0.55 + X * 0.012 + fbm2(X * 0.02, Y * 0.02, s + 3, 2) * 6) > 0.72
          if (surf) {
            const k = 0.5 * (1 + d / 28)
            o[at] += (0.86 - o[at]) * k
            o[at + 1] += (0.9 - o[at + 1]) * k
            o[at + 2] += (0.9 - o[at + 2]) * k
          }
          return
        }
        const g = 0.92 + 0.12 * fbm2(X * 0.08, Y * 0.08, s + 4, 2)
        if (d < 44) {
          const wet = 1 - smooth(0, 9, d) * 0.22
          put(o, at, 0.84 * g * (1 - wet * 0.2), 0.77 * g * (1 - wet * 0.18), 0.62 * g * (1 - wet * 0.12))
          return
        }
        if (d < 84) {
          const grass = vnoise(X * 0.15, Y * 0.15, s + 5) > 0.45 + (84 - d) / 110
          if (grass) put(o, at, 0.36 * g, 0.42 * g, 0.26 * g)
          else put(o, at, 0.8 * g, 0.73 * g, 0.58 * g)
          if (later && loss > 18 && vnoise(X * 0.04, Y * 0.3, s + 6) > 0.4) put(o, at, 0.82 * g, 0.75 * g, 0.6 * g)
          return
        }
        if (d < 96) {
          const r = 0.4 + (Math.abs(d - 90) < 0.4 ? 0.14 : 0)
          put(o, at, r, r, r * 0.98)
          if (later && loss > 22 && vnoise(X * 0.05, Y * 0.5, s + 7) > 0.35) put(o, at, 0.78 * g, 0.71 * g, 0.57 * g)
          return
        }
        suburb(X + 5, Y - sh - 96, s + 30, tmp)
        put(o, at, tmp[0], tmp[1], tmp[2])
      }
      draw(shore, 0, false)
      draw(shore + loss, 3, true)
      if (Math.abs(Y - shore) < 1.3 && loss > 4) put(o, 3, acc[0], acc[1], acc[2])
    }
  }

  if (kind === "site")
    return (X, Y, o) => {
      const t = fbm2(X * 0.06, Y * 0.06, s + 1, 3)
      suburb(X, Y, s, o)
      o[3] = o[0]
      o[4] = o[1]
      o[5] = o[2]
      const inZone = X > 360 && X < 820 && Y > 110 && Y < 470
      if (!inZone) return
      const soil = 0.92 + 0.16 * fbm2(X * 0.03, Y * 0.03, s + 3, 3)
      const track = Math.abs(((X * 0.7 + Y * 0.3) % 22) - 11) < 0.8 ? 0.9 : 1
      put(o, 0, 0.64 * soil * track, 0.52 * soil * track, 0.4 * soil * track)
      const pad1 = X > 400 && X < 600 && Y > 150 && Y < 300
      const pad2 = X > 630 && X < 790 && Y > 150 && Y < 430
      if (pad1 || pad2) mix3(o, 0, [0.76, 0.68, 0.56], 0.6)
      if (hash2(Math.floor(X / 6), Math.floor(Y / 6), s + 4) < 0.004) put(o, 0, 0.9, 0.72, 0.1)
      const lotA = X > 380 && X < 610 && Y > 320 && Y < 450
      put(o, 3, 0.66 * soil, 0.56 * soil, 0.44 * soil)
      if (pad1 || pad2) {
        const ridge = pad1 ? Math.abs(Y - 225) < 1 : Math.abs(X - 710) < 1
        const vent = hash2(Math.floor(X / 14), Math.floor(Y / 14), s + 5) < 0.12 && X % 14 < 4 && Y % 14 < 4
        const v = ridge ? 0.7 : vent ? 0.58 : 0.82 + 0.04 * t
        put(o, 3, v, v * 1.01, v * 1.02)
        const edge = pad1 ? Math.min(X - 400, 600 - X, Y - 150, 300 - Y) : Math.min(X - 630, 790 - X, Y - 150, 430 - Y)
        if (edge < 3) put(o, 3, acc[0], acc[1], acc[2])
      } else if (lotA) {
        const stripe = (X - 380) % 12 < 1 && Y > 335 && Y < 435 ? 0.85 : 0.22
        put(o, 3, stripe, stripe, stripe * 1.02)
        const edge = Math.min(X - 380, 610 - X, Y - 320, 450 - Y)
        if (edge < 3) put(o, 3, acc[0], acc[1], acc[2])
      } else if (Math.abs(Y - 305) < 8 && X > 360) {
        put(o, 3, 0.36, 0.36, 0.37)
      }
    }

  if (kind === "dunes")
    return (X, Y, o) => {
      const p = X * 0.88 + Y * 0.47
      const q = -X * 0.47 + Y * 0.88
      const w = fbm2(X * 0.004, Y * 0.004, s, 3)
      const ph = (p + w * 140) / 62 + 0.4 * Math.sin(q * 0.018 + w * 4)
      const f = ph - Math.floor(ph)
      const lit = f < 0.8 ? 0.8 + 0.3 * (f / 0.8) : 0.58 + 0.12 * ((f - 0.8) / 0.2)
      const rip = 1 + 0.035 * Math.sin(p * 0.95 + q * 0.12)
      const flat = smooth(0.58, 0.7, fbm2(X * 0.003 + 9, Y * 0.003, s + 1, 3))
      const l = (lit * (1 - flat) + 0.98 * flat) * rip
      const grain = 0.96 + 0.08 * vnoise(X * 0.7, Y * 0.7, s + 2)
      put(o, 0, 0.8 * l * grain, 0.62 * l * grain, 0.42 * l * grain)
      if (Math.abs(Y - 470 - 0.12 * X) < 2.2) put(o, 0, 0.36, 0.34, 0.33)
      o[3] = o[0]
      o[4] = o[1]
      o[5] = o[2]
    }

  // ponds: rectangular salt ponds behind levees, coloured by how concentrated the brine is
  const PONDS = [
    [0.35, 0.52, 0.48],
    [0.27, 0.44, 0.44],
    [0.4, 0.5, 0.38],
    [0.55, 0.5, 0.36],
    [0.72, 0.42, 0.42],
    [0.84, 0.8, 0.72],
    [0.6, 0.3, 0.33],
  ]
  return (X, Y, o) => {
    const x = X * 0.97 - Y * 0.24
    const y = X * 0.24 + Y * 0.97
    const gx = Math.floor(x / 150)
    const gy = Math.floor(y / 104)
    const fx = x / 150 - gx
    const fy = y / 104 - gy
    const vert = hash2(gx, gy, s + 4) < 0.5
    const cut = 0.3 + hash2(gx, gy, s + 5) * 0.4
    const side = (vert ? fx : fy) < cut ? 0 : 1
    const levee = Math.min(fx * 150, (1 - fx) * 150, fy * 104, (1 - fy) * 104) < 3.2 || Math.abs((vert ? fx * 150 : fy * 104) - cut * (vert ? 150 : 104)) < 2.2
    const t = fbm2(X * 0.015, Y * 0.015, s + 3, 4)
    const bay = Y < 90 + 40 * Math.sin(X * 0.006 + s) + 30 * fbm2(X * 0.01, 1, s + 6, 3)
    const marsh = !bay && Y < 118 + 40 * Math.sin(X * 0.006 + s) + 30 * fbm2(X * 0.01, 1, s + 6, 3)
    if (bay) put(o, 0, 0.12 + t * 0.04, 0.24 + t * 0.04, 0.29 + t * 0.03)
    else if (marsh) {
      const m = 0.85 + 0.3 * vnoise(X * 0.2, Y * 0.2, s + 7)
      put(o, 0, 0.26 * m, 0.32 * m, 0.2 * m)
    } else if (levee) {
      const l = 0.6 + t * 0.1
      put(o, 0, l, l * 0.93, l * 0.8)
    } else {
      const c = PONDS[Math.floor(hash2(gx * 2 + side, gy, s + 2) * PONDS.length)]
      const g = 0.84 + 0.3 * t + 0.05 * Math.sin((vert ? fy : fx) * 6)
      put(o, 0, c[0] * g, c[1] * g, c[2] * g)
    }
    o[3] = o[0]
    o[4] = o[1]
    o[5] = o[2]
  }
}

/** Fill rows y0..y1 of a tile. `a` is true colour, `b` the other view. */
function fillRows(fn: PixelFn, a: Uint8ClampedArray, b: Uint8ClampedArray, w: number, y0: number, y1: number, k: number, seed: number, cloudy: boolean) {
  const o = new Float32Array(6)
  for (let y = y0; y < y1; y++)
    for (let x = 0; x < w; x++) {
      o[3] = o[4] = o[5] = 0
      const X = x * k
      const Y = y * k
      fn(X, Y, o)
      if (cloudy) {
        // a broken cloud deck over the optical view only: the reason radar exists
        const cover = smooth(0.5, 0.6, fbm2(X * 0.005 + 3, Y * 0.005, seed + 77, 5))
        const shadowed = smooth(0.5, 0.6, fbm2((X - 12) * 0.005 + 3, (Y - 16) * 0.005, seed + 77, 5))
        const sh = 1 - 0.5 * shadowed * (1 - cover)
        const lit = 0.8 + 0.18 * fbm2(X * 0.03, Y * 0.03, seed + 78, 3)
        o[0] = o[0] * sh + (lit - o[0] * sh) * cover
        o[1] = o[1] * sh + (lit - o[1] * sh) * cover
        o[2] = o[2] * sh + (lit * 1.02 - o[2] * sh) * cover
      }
      const i = (y * w + x) * 4
      a[i] = o[0] * 255
      a[i + 1] = o[1] * 255
      a[i + 2] = o[2] * 255
      a[i + 3] = 255
      b[i] = o[3] * 255
      b[i + 1] = o[4] * 255
      b[i + 2] = o[5] * 255
      b[i + 3] = 255
    }
}

/** Render a whole tile at once. `span` is the ground width in tile units. */
function renderTile(kind: ElxTileKind, w: number, h: number, seed: number, accent: string, span = 900, cloudy = false) {
  const a = new Uint8ClampedArray(w * h * 4)
  const b = new Uint8ClampedArray(w * h * 4)
  fillRows(makeKind(kind, seed, accent), a, b, w, 0, h, span / w, seed, cloudy)
  return { a, b }
}
// #endregion imagery

// The limb. One fragment shader: ocean, cloud decks, glint, terminator and a thin atmosphere.
const LIMB_VS = "attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}"
const LIMB_FS = [
  "precision highp float;",
  "uniform vec2 uRes;uniform vec3 uDisk;uniform mat3 uToEarth;uniform vec3 uSun;uniform float uSeed;",
  "float h13(vec3 p){p=fract(p*0.1031);p+=dot(p,p.zyx+31.32);return fract((p.x+p.y)*p.z);}",
  "float n3(vec3 x){vec3 i=floor(x);vec3 f=fract(x);f=f*f*(3.0-2.0*f);",
  "return mix(mix(mix(h13(i),h13(i+vec3(1,0,0)),f.x),mix(h13(i+vec3(0,1,0)),h13(i+vec3(1,1,0)),f.x),f.y),",
  "mix(mix(h13(i+vec3(0,0,1)),h13(i+vec3(1,0,1)),f.x),mix(h13(i+vec3(0,1,1)),h13(i+vec3(1,1,1)),f.x),f.y),f.z);}",
  "float fbm6(vec3 p){float s=0.0;float a=0.5;for(int k=0;k<6;k++){s+=a*n3(p);p=p*2.03+vec3(3.1,1.7,5.3);a*=0.5;}return s/0.984;}",
  "float fbm4(vec3 p){float s=0.0;float a=0.5;for(int k=0;k<4;k++){s+=a*n3(p);p=p*2.03+vec3(1.3,7.1,2.9);a*=0.5;}return s/0.9375;}",
  "void main(){",
  "vec2 px=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);",
  "float lx=(px.x-uDisk.x)/uDisk.z;float ly=(uDisk.y-px.y)/uDisk.z;",
  "float r=sqrt(lx*lx+ly*ly);vec3 S=normalize(uSun);",
  "vec3 blue=vec3(0.26,0.5,1.0);vec3 amber=vec3(1.0,0.46,0.16);",
  "vec3 m=vec3(vec2(lx,ly)/max(r,1e-5),0.0);float sl=dot(m,S);",
  "float dayRim=smoothstep(-0.25,0.4,sl);float tw=exp(-sl*sl/0.035);float fwd=1.0+1.6*max(-S.z,0.0)*max(sl,0.0);",
  "float aa=1.6/uDisk.z;vec3 outC=vec3(0.0);vec3 inC=vec3(0.0);",
  "if(r>1.0-aa){float d=max(r-1.0,0.0);",
  "float layer=exp(-d/0.0075);float halo=exp(-d/0.028);",
  "outC=blue*(layer*1.2+halo*0.1)*dayRim*fwd+vec3(0.85,0.92,1.0)*layer*layer*dayRim*0.45*fwd+amber*tw*exp(-d/0.0042)*1.5*(0.7+0.6*max(-S.z,0.0));}",
  "if(r<1.0+aa){float rr=min(r,0.99999);float z=sqrt(1.0-rr*rr);vec3 n=vec3(lx,ly,0.0);n=normalize(vec3(n.xy,z));",
  "vec3 w=uToEarth*n;float ndl=dot(n,S);",
  "vec3 q=w*2.3+vec3(uSeed*1.7,uSeed*0.3,uSeed*2.9);",
  "vec3 wq=vec3(fbm4(q),fbm4(q+vec3(5.2,1.3,2.8)),fbm4(q+vec3(2.1,7.7,4.4)));",
  "float big=fbm6(q+1.7*wq);float cell=fbm4(q*4.6+wq*1.3);float det=fbm4(q*15.0+wq*3.0);",
  "float c=big*0.62+cell*0.46+(det-0.5)*0.3-0.04;",
  "float cv=smoothstep(0.5,0.58,c);float thick=smoothstep(0.53,0.74,c);",
  "vec3 sE=uToEarth*S;float cs=big*0.62+fbm4((q-sE*0.012)*4.6+wq*1.3)*0.46-0.04;",
  "float shadeO=1.0-0.55*smoothstep(0.48,0.56,cs)*(1.0-cv);",
  "vec3 ocean=mix(vec3(0.008,0.04,0.1),vec3(0.018,0.07,0.15),fbm4(w*11.0+3.0));",
  "float lamb=max(ndl,0.0);vec3 col=ocean*(0.18+1.15*lamb)*shadeO;",
  "float day=smoothstep(-0.06,0.14,ndl);float fres=pow(1.0-z,4.0);",
  "col+=vec3(0.18,0.32,0.6)*fres*day*0.75;",
  "vec3 H=normalize(S+vec3(0.0,0.0,1.0));float nh=max(dot(n,H),0.0);",
  "float rough=0.6+0.8*fbm4(w*90.0);float glint=pow(nh,4000.0)*0.9*rough;col+=mix(vec3(0.55,0.72,0.9),vec3(1.0,0.94,0.84),pow(nh,2600.0))*glint*day*(1.0-cv);",
  "float cl=max(ndl+0.14,0.0)/1.14;vec3 sunC=mix(amber*1.45+vec3(0.08,0.02,0.04),vec3(1.0,0.98,0.95),smoothstep(0.02,0.34,ndl));",
  "vec3 cloud=sunC*(0.52+0.48*thick)*(0.74+0.36*det)*(0.05+1.05*cl);",
  "col=mix(col,cloud,cv);",
  "col+=amber*exp(-pow((ndl-0.01)/0.07,2.0))*0.08*(0.3+cv);",
  "float haze=pow(1.0-z,2.3);vec3 hz=mix(amber,blue*0.85,smoothstep(-0.02,0.25,ndl))*smoothstep(-0.12,0.1,ndl);",
  "col=mix(col,hz*0.8,clamp(haze*0.75,0.0,0.7));",
  "vec3 night=vec3(0.004,0.008,0.018)+cv*thick*vec3(0.03,0.036,0.05)*(0.75+0.5*det);",
  "inC=mix(night,col,smoothstep(-0.16+0.06*cv,0.04,ndl));}",
  "vec3 col=mix(inC,outC,smoothstep(1.0-aa,1.0+aa,r));",
  "if(r<1.0){float d=1.0-r;col+=blue*exp(-d/0.004)*dayRim*0.35*fwd;}",
  "col=1.0-exp(-col*1.4);col=pow(col,vec3(0.4545));",
  "col+=(h13(vec3(gl_FragCoord.xy,uSeed))-0.5)/255.0;",
  "gl_FragColor=vec4(col,1.0);}",
].join("\n")

type LimbGl = {
  g: WebGLRenderingContext
  loc: { [k: string]: WebGLUniformLocation | null }
  soft: boolean
}

function initLimb(c: HTMLCanvasElement): LimbGl | null {
  let g: WebGLRenderingContext | null = null
  try {
    g = c.getContext("webgl", { antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: "low-power" }) as WebGLRenderingContext | null
  } catch {
    g = null
  }
  if (!g) return null
  const sh = (type: number, src: string) => {
    const s = g!.createShader(type)!
    g!.shaderSource(s, src)
    g!.compileShader(s)
    return g!.getShaderParameter(s, g!.COMPILE_STATUS) ? s : null
  }
  const vs = sh(g.VERTEX_SHADER, LIMB_VS)
  const fs = sh(g.FRAGMENT_SHADER, LIMB_FS)
  if (!vs || !fs) return null
  const pr = g.createProgram()!
  g.attachShader(pr, vs)
  g.attachShader(pr, fs)
  g.linkProgram(pr)
  if (!g.getProgramParameter(pr, g.LINK_STATUS)) return null
  g.useProgram(pr)
  const buf = g.createBuffer()
  g.bindBuffer(g.ARRAY_BUFFER, buf)
  g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), g.STATIC_DRAW)
  const ap = g.getAttribLocation(pr, "p")
  g.enableVertexAttribArray(ap)
  g.vertexAttribPointer(ap, 2, g.FLOAT, false, 0, 0)
  const loc: { [k: string]: WebGLUniformLocation | null } = {}
  for (const k of ["uRes", "uDisk", "uToEarth", "uSun", "uSeed"]) loc[k] = g.getUniformLocation(pr, k)
  let soft = false
  const dbg = g.getExtension("WEBGL_debug_renderer_info")
  if (dbg) soft = /swiftshader|llvmpipe|software/i.test(String(g.getParameter(dbg.UNMASKED_RENDERER_WEBGL)))
  return { g, loc, soft }
}

function usePrefersReduced() {
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

/** A clock that ticks once a second while the tab is visible. */
function useNow() {
  const [now, setNow] = React.useState(() => Date.now())
  React.useEffect(() => {
    const id = setInterval(() => {
      if (typeof document === "undefined" || !document.hidden) setNow(Date.now())
    }, 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

function useInView(ref: { current: Element | null }, margin = "300px") {
  const [seen, setSeen] = React.useState(false)
  React.useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    if (typeof IntersectionObserver === "undefined") return setSeen(true)
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) {
        setSeen(true)
        io.disconnect()
      }
    }, { rootMargin: margin })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, margin, seen])
  return seen
}

/** The same tile in slices of rows that yield to the browser every ~8 ms, so a tab switch never freezes the page. */
function renderTileAsync(kind: ElxTileKind, w: number, h: number, seed: number, accent: string, span: number, cloudy: boolean) {
  return new Promise((done: (v: { a: Uint8ClampedArray; b: Uint8ClampedArray }) => void) => {
    const fn = makeKind(kind, seed, accent)
    const a = new Uint8ClampedArray(w * h * 4)
    const b = new Uint8ClampedArray(w * h * 4)
    let y = 0
    const step = () => {
      const t0 = performance.now()
      while (y < h && performance.now() - t0 < 8) {
        fillRows(fn, a, b, w, y, Math.min(h, y + 4), span / w, seed, cloudy)
        y += 4
      }
      if (y < h) setTimeout(step, 0)
      else done({ a, b })
    }
    step()
  })
}

// Tiles are generated one at a time off the critical path and cached by kind, size, seed and accent.
const TILE_CACHE = new Map()
let tileQueue = Promise.resolve()
function tileFor(kind: ElxTileKind, w: number, h: number, seed: number, accent: string, span: number, cloudy: boolean) {
  const key = [kind, w, h, seed, accent, span, cloudy].join("|")
  const hit = TILE_CACHE.get(key)
  if (hit) return Promise.resolve(hit as { a: Uint8ClampedArray; b: Uint8ClampedArray })
  const job = tileQueue.then(
    () =>
      new Promise((done: (v: { a: Uint8ClampedArray; b: Uint8ClampedArray }) => void) => {
        setTimeout(() => {
          const hit2 = TILE_CACHE.get(key)
          if (hit2) return done(hit2)
          renderTileAsync(kind, w, h, seed, accent, span, cloudy).then((t) => {
            TILE_CACHE.set(key, t)
            // keep the eight most recent tiles: a few MB, not dozens
            while (TILE_CACHE.size > 8) TILE_CACHE.delete(TILE_CACHE.keys().next().value)
            done(t)
          })
        }, 0)
      }),
  )
  tileQueue = job.then(() => undefined)
  return job
}

function Tile(props: { kind: ElxTileKind; which: "a" | "b"; seed: number; accent: string; w: number; h: number; span?: number; label?: string; cloudy?: boolean }) {
  const { kind, which, seed, accent, w, h, span = 900, label, cloudy = false } = props
  const ref = React.useRef(null as HTMLCanvasElement | null)
  const seen = useInView(ref, "600px")
  const [ready, setReady] = React.useState(false)
  React.useEffect(() => {
    if (!seen) return
    let live = true
    tileFor(kind, w, h, seed, accent, span, cloudy).then((t) => {
      const c = ref.current
      if (!live || !c) return
      const ctx = c.getContext("2d")
      if (!ctx) return
      const img = ctx.createImageData(w, h)
      img.data.set(which === "a" ? t.a : t.b)
      ctx.putImageData(img, 0, 0)
      setReady(true)
    })
    return () => {
      live = false
    }
  }, [seen, kind, which, seed, accent, w, h, span, cloudy])
  return (
    <canvas
      ref={ref}
      className="elx-tile"
      data-ready={ready ? "" : undefined}
      width={w}
      height={h}
      style={{ aspectRatio: w + " / " + h }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  )
}

/** A picture: the installer's image when given, the generated tile otherwise. */
function Picture(props: { image?: string; alt?: string; kind: ElxTileKind; which: "a" | "b"; seed: number; accent: string; w: number; h: number; span?: number; cloudy?: boolean }) {
  if (props.image)
    return <img className="elx-tile" src={props.image} alt={props.alt || ""} width={props.w} height={props.h} loading="lazy" decoding="async" style={{ aspectRatio: props.w + " / " + props.h }} />
  return <Tile kind={props.kind} which={props.which} seed={props.seed} accent={props.accent} w={props.w} h={props.h} span={props.span} label={props.alt} cloudy={props.cloudy} />
}

function Mark(props: { size?: number }) {
  const s = props.size || 28
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" aria-hidden="true" className="elx-mark">
      <circle cx="16" cy="16" r="9.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2.5 21.5 C 9 11, 21 6.5, 29.5 9.5" fill="none" stroke="var(--elx-accent)" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="25.4" cy="8.4" r="2.3" fill="var(--elx-accent)" />
    </svg>
  )
}

function Arrow() {
  return (
    <svg className="elx-arrow" width="18" height="12" viewBox="0 0 18 12" aria-hidden="true">
      <path d="M0 6h15M10.5 1.2 15.5 6l-5 4.8" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

type SatView = { sat: ElxSat; plane: ElxPlane; featured: boolean }

/** The hero: the limb as seen riding along with one satellite, its plane's ground track, and every satellite in frame. */
function OrbitHero(props: {
  preset: "dawn" | "day"
  plane: ElxPlane
  sats: SatView[]
  planes: ElxPlane[]
  seed: number
  reduced: boolean
  now: number
  city: ElxCity
  /** The hero copy: satellites passing behind it fade and drop their labels. */
  quiet: { current: HTMLElement | null }
  uid: string
  photo?: string
}) {
  const { preset, plane, sats, planes, seed, reduced, now, city, quiet, uid, photo } = props
  const wrap = React.useRef(null as HTMLDivElement | null)
  const canvas = React.useRef(null as HTMLCanvasElement | null)
  const glRef = React.useRef(null as LimbGl | null)
  const satEls = React.useRef({} as { [k: string]: HTMLDivElement | null })
  const nadirEls = React.useRef({} as { [k: string]: SVGLineElement | null })
  const posEl = React.useRef(null as HTMLElement | null)
  const flip = React.useRef(undefined as boolean | undefined)
  const [size, setSize] = React.useState({ w: 0, h: 0 })
  const [noGl, setNoGl] = React.useState(false)
  const [painted, setPainted] = React.useState(false)
  const [open, setOpen] = React.useState(null as string | null)
  const [track, setTrack] = React.useState("")
  const lead = React.useMemo(() => pickLead(sats.map((v) => v.sat), plane, Date.now()), [sats, plane])

  React.useEffect(() => {
    flip.current = undefined
  }, [lead, preset])

  React.useEffect(() => {
    const el = wrap.current
    if (!el) return
    const read = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    read()
    if (typeof ResizeObserver === "undefined") return
    let t = 0
    const ro = new ResizeObserver(() => {
      clearTimeout(t)
      t = window.setTimeout(read, 120)
    })
    ro.observe(el)
    return () => {
      ro.disconnect()
      clearTimeout(t)
    }
  }, [])

  // One clock for the hero. With a real GPU the Earth turns under the view about 2 px a second, so the
  // limb repaints ten times a second; a software renderer or reduced motion paints once and holds.
  React.useEffect(() => {
    const c = canvas.current
    if ((!c && !photo) || !size.w || !size.h || !lead) return
    if (!glRef.current && !noGl && !photo) {
      glRef.current = c ? initLimb(c) : null
      if (!glRef.current) setNoGl(true)
    }
    const L = glRef.current
    const geoAt = (ms: number) => {
      const g = heroGeometry(ms, size.w, size.h, preset, plane, lead, flip.current)
      flip.current = g.flip
      return g
    }

    const paint = (geo: ReturnType<typeof heroGeometry>) => {
      if (!L || !c || photo) return
      const { g, loc, soft } = L
      const ratio = canvasRatio(size.w, size.h, window.devicePixelRatio || 1, soft ? 0.9e6 : reduced ? 2.2e6 : 1.6e6)
      const cw = Math.max(1, Math.round(size.w * ratio))
      const ch = Math.max(1, Math.round(size.h * ratio))
      if (c.width !== cw || c.height !== ch) {
        c.width = cw
        c.height = ch
      }
      c.style.width = size.w + "px"
      c.style.height = size.h + "px"
      const M = geo.M
      g.viewport(0, 0, cw, ch)
      g.uniform2f(loc.uRes, cw, ch)
      g.uniform3f(loc.uDisk, geo.disk.cx * (cw / size.w), geo.disk.cy * (ch / size.h), geo.disk.r * (cw / size.w))
      g.uniformMatrix3fv(loc.uToEarth, false, new Float32Array([M[0], M[3], M[6], M[1], M[4], M[7], M[2], M[5], M[8]]))
      g.uniform3f(loc.uSun, geo.sun[0], geo.sun[1], geo.sun[2])
      g.uniform1f(loc.uSeed, (seed % 97) * 0.37)
      g.drawArrays(g.TRIANGLES, 0, 3)
      setPainted(true)
    }

    const zone = () => {
      const q = quiet.current
      const w = wrap.current
      if (!q || !w) return null
      const b = w.getBoundingClientRect()
      let l = Infinity
      let t = Infinity
      let r = -Infinity
      let bt = -Infinity
      for (const ch of Array.from(q.children)) {
        const a = ch.getBoundingClientRect()
        l = Math.min(l, a.left)
        t = Math.min(t, a.top)
        r = Math.max(r, a.right)
        bt = Math.max(bt, a.bottom)
      }
      return { l: l - b.left - 28, t: t - b.top - 36, r: r - b.left + 28, b: bt - b.top + 20 }
    }
    let qz = zone()
    let qAt = performance.now()
    setTrack(trackPath(geoAt(Date.now()).track, heroDisk(size.w, size.h), size.w, size.h, qz))

    const place = (ms: number, geo: ReturnType<typeof heroGeometry>) => {
      if (performance.now() - qAt > 2000) {
        qz = zone()
        qAt = performance.now()
      }
      for (const v of sats) {
        const el = satEls.current[v.sat.id]
        if (!el) continue
        const e = satEci(v.sat, v.plane, ms)
        const gv = mul(geo.V, e)
        const k = 1 + v.plane.altitude / RE
        const at = project([gv[0] * k, gv[1] * k, gv[2] * k], geo.disk)
        const ground = project(gv, geo.disk)
        const inFrame = at.front && (v.featured || gv[2] > 0) && at.x > -20 && at.x < size.w + 20 && at.y > -20 && at.y < size.h + 20
        el.style.transform = "translate(" + at.x.toFixed(1) + "px," + at.y.toFixed(1) + "px)"
        el.style.visibility = inFrame ? "visible" : "hidden"
        const hush = (!!qz && at.x > qz.l && at.x < qz.r && at.y > qz.t && at.y < qz.b) || at.y < 104
        if (hush) el.setAttribute("data-quiet", "")
        else el.removeAttribute("data-quiet")
        if (at.x > size.w - 240) el.setAttribute("data-flip", "")
        else el.removeAttribute("data-flip")
        const ln = nadirEls.current[v.sat.id]
        if (ln) {
          ln.setAttribute("x1", at.x.toFixed(1))
          ln.setAttribute("y1", at.y.toFixed(1))
          ln.setAttribute("x2", ground.x.toFixed(1))
          ln.setAttribute("y2", ground.y.toFixed(1))
          ln.style.visibility = inFrame && gv[2] > 0 ? "visible" : "hidden"
          ln.style.opacity = hush ? "0.25" : ""
        }
      }
      if (posEl.current) {
        const sp = subPoint(lead, plane, ms)
        const txt = fmtLat(sp.lat) + " " + fmtLon(sp.lon)
        if (posEl.current.textContent !== txt) posEl.current.textContent = txt
      }
    }

    const frame = () => {
      const ms = Date.now()
      const geo = geoAt(ms)
      place(ms, geo)
      return geo
    }
    paint(frame())
    const live = !!L && !L.soft && !reduced
    let visible = true
    const io =
      typeof IntersectionObserver !== "undefined" && wrap.current
        ? new IntersectionObserver((es) => {
            visible = es.some((x) => x.isIntersecting)
          })
        : null
    if (io && wrap.current) io.observe(wrap.current)
    let raf = 0
    let last = 0
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick)
      if (!visible || document.hidden || t - last < (reduced ? 10000 : 100)) return
      last = t
      const geo = frame()
      if (live) paint(geo)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      if (io) io.disconnect()
    }
  }, [size.w, size.h, preset, plane, sats, lead, seed, reduced, noGl, quiet, photo])

  const openView = sats.find((v) => v.sat.id === open)
  const minute = Math.floor(now / 60000)
  const openPass = React.useMemo(() => {
    if (!openView) return null
    return nextPass([openView.sat], planes, city, minute * 60000, 48)
  }, [openView, planes, city, minute])

  return (
    <div ref={wrap} className="elx-sky" data-painted={painted || photo ? "" : undefined} data-nogl={noGl && !photo ? "" : undefined}>
      {photo ? (
        <img className="elx-photo" src={photo} alt="" width={size.w || 1440} height={size.h || 900} style={{ width: (size.w || 1440) + "px", height: (size.h || 900) + "px" }} />
      ) : (
        <canvas ref={canvas} className="elx-canvas" aria-hidden="true" />
      )}
      <svg className="elx-orbit" width={size.w} height={size.h} viewBox={"0 0 " + (size.w || 1) + " " + (size.h || 1)} aria-hidden="true">
        <path className="elx-track" d={track} />
        {sats.map((v) => (
          <line
            key={v.sat.id}
            ref={(el) => {
              nadirEls.current[v.sat.id] = el
            }}
            className={"elx-nadir" + (v.featured ? " elx-on" : "")}
          />
        ))}
      </svg>
      <div className="elx-sats">
        {sats.map((v) => {
          const sp = v.sat.id === open ? subPoint(v.sat, v.plane, now) : null
          const isLead = !!lead && v.sat.id === lead.id
          return (
            <div
              key={v.sat.id}
              ref={(el) => {
                satEls.current[v.sat.id] = el
              }}
              className={"elx-sat" + (v.featured ? " elx-on" : "") + (isLead ? " elx-lead" : "")}
              style={{ visibility: "hidden" }}
              onMouseEnter={() => setOpen(v.sat.id)}
              onMouseLeave={() => setOpen((o) => (o === v.sat.id ? null : o))}
            >
              <button
                type="button"
                className="elx-satbtn"
                aria-label={v.sat.id + ", " + v.plane.name.toLowerCase() + " " + v.plane.sensor + " plane"}
                aria-expanded={open === v.sat.id}
                aria-describedby={open === v.sat.id ? uid + "-satcard-" + v.sat.id : undefined}
                onFocus={() => setOpen(v.sat.id)}
                onBlur={() => setOpen((o) => (o === v.sat.id ? null : o))}
                onClick={() => setOpen((o) => (o === v.sat.id ? null : v.sat.id))}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setOpen(null)
                }}
              >
                <span className="elx-satdot" />
              </button>
              {v.featured ? (
                <span className="elx-satname" aria-hidden="true">
                  {v.sat.id}
                  {isLead ? (
                    <em
                      ref={(el) => {
                        posEl.current = el
                      }}
                    />
                  ) : null}
                </span>
              ) : null}
              {open === v.sat.id && sp ? (
                <div className="elx-satcard" role="tooltip" id={uid + "-satcard-" + v.sat.id}>
                  <b>{v.sat.id}</b>
                  <span>
                    {v.plane.name} plane, {v.plane.sensor}, {v.plane.altitude} km
                  </span>
                  <span className="elx-mono">
                    Over {fmtLat(sp.lat)} {fmtLon(sp.lon)}, {sp.day ? "daylight" : "eclipse"}
                  </span>
                  <span>
                    {openPass
                      ? "Next over " + city.name + " in " + clock((openPass.at - now) / 1000)
                      : "No pass over " + city.name + " in 48 h"}
                  </span>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Drag (or arrow keys) between true colour and the sensor's other view of the same ground. */
function Compare(props: { use: ElxUse; seed: number; accent: string; reduced: boolean }) {
  const { use, seed, accent, reduced } = props
  const box = React.useRef(null as HTMLDivElement | null)
  const [pos, setPos] = React.useState(0.5)
  const drag = React.useRef(false)
  const anim = React.useRef(0)

  // a short wipe when the use changes shows what the handle does
  React.useEffect(() => {
    cancelAnimationFrame(anim.current)
    if (reduced) {
      setPos(0.5)
      return
    }
    const t0 = performance.now()
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 900)
      const e = 1 - Math.pow(1 - k, 3)
      setPos(0.88 - 0.38 * e)
      if (k < 1) anim.current = requestAnimationFrame(step)
    }
    anim.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(anim.current)
  }, [use.id, reduced])

  const fromPointer = (x: number) => {
    const el = box.current
    if (!el) return
    const r = el.getBoundingClientRect()
    cancelAnimationFrame(anim.current)
    setPos(clamp((x - r.left) / r.width, 0, 1))
  }
  const pct = Math.round(pos * 100)
  return (
    <figure className="elx-compare">
      <div
        ref={box}
        className="elx-cbox"
        onPointerDown={(e) => {
          drag.current = true
          ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
          fromPointer(e.clientX)
        }}
        onPointerMove={(e) => {
          if (drag.current) fromPointer(e.clientX)
        }}
        onPointerUp={() => {
          drag.current = false
        }}
        onPointerCancel={() => {
          drag.current = false
        }}
      >
        <Picture image={use.compareImage} alt={use.after + ", " + use.place} kind={use.kind} which="b" seed={seed} accent={accent} w={880} h={560} cloudy={use.mode === "radar"} />
        <div className="elx-cleft" style={{ clipPath: "inset(0 " + (100 - pos * 100).toFixed(2) + "% 0 0)" }}>
          <Picture image={use.image} alt={use.alt || use.before + ", " + use.place} kind={use.kind} which="a" seed={seed} accent={accent} w={880} h={560} cloudy={use.mode === "radar"} />
        </div>
        <div className="elx-cline" style={{ left: pos * 100 + "%" }} aria-hidden="true" />
        <div
          className="elx-handle"
          role="slider"
          tabIndex={0}
          aria-label={"Compare " + use.before + " and " + use.after}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-valuetext={pct + "% " + use.before + ", " + (100 - pct) + "% " + use.after}
          style={{ left: pos * 100 + "%" }}
          onKeyDown={(e) => {
            const k = e.key
            let v = pos
            if (k === "ArrowLeft" || k === "ArrowDown") v -= 0.05
            else if (k === "ArrowRight" || k === "ArrowUp") v += 0.05
            else if (k === "Home") v = 0
            else if (k === "End") v = 1
            else return
            e.preventDefault()
            cancelAnimationFrame(anim.current)
            setPos(clamp(v, 0, 1))
          }}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
            <path d="M8 6 3 11l5 5M14 6l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </div>
        <span className="elx-brk elx-brk-tl" aria-hidden="true" />
        <span className="elx-brk elx-brk-br" aria-hidden="true" />
      </div>
      <figcaption className="elx-ccap">
        <span className="elx-cl">
          <i aria-hidden="true">&#9666;</i> {use.before}
        </span>
        <span className="elx-mono elx-cplace">
          {use.place}, {use.date}
        </span>
        <span className="elx-cr">
          {use.after} <i aria-hidden="true">&#9656;</i>
        </span>
      </figcaption>
    </figure>
  )
}

/** The spacecraft as an isometric technical drawing, projected from its real proportions. */
function Spacecraft(props: { parts: string[] }) {
  const S = 76
  const ox = 262
  const oy = 212
  const iso = (x: number, y: number, z: number) => [ox + (x - y) * 0.866 * S, oy + (x + y) * 0.5 * S - z * S]
  const pts = (a: number[][]) => a.map((p) => iso(p[0], p[1], p[2]).map((v) => v.toFixed(1)).join(",")).join(" ")
  const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, key: string, top = "elx-f1") => (
    <g key={key}>
      <polygon className="elx-f2" points={pts([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]])} />
      <polygon className="elx-f3" points={pts([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]])} />
      <polygon className={top} points={pts([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]])} />
    </g>
  )
  const ell = (cx: number, cy: number, z: number, r: number, from = 0, to = Math.PI * 2, n = 48) => {
    const a: number[][] = []
    for (let i = 0; i <= n; i++) {
      const t = from + ((to - from) * i) / n
      a.push([cx + r * Math.cos(t), cy + r * Math.sin(t), z])
    }
    return a
  }
  const wing = (y0: number, y1: number, key: string) => {
    const lines = []
    for (let i = 1; i < 3; i++) {
      const x = -0.42 + (0.84 * i) / 3
      lines.push(<polyline key={"x" + i} className="elx-wl" points={pts([[x, y0, 0.96], [x, y1, 0.96]])} />)
    }
    for (let i = 1; i < 6; i++) {
      const y = y0 + ((y1 - y0) * i) / 6
      lines.push(<polyline key={"y" + i} className="elx-wl" points={pts([[-0.42, y, 0.96], [0.42, y, 0.96]])} />)
    }
    return (
      <g key={key}>
        {box(-0.42, 0.42, y0, y1, 0.92, 0.96, key + "b", "elx-f4")}
        {lines}
      </g>
    )
  }
  const barrelSide = [...ell(0, 0, 1.25, 0.36, -Math.PI / 4, (Math.PI * 3) / 4), ...ell(0, 0, 1.68, 0.36, (Math.PI * 3) / 4, -Math.PI / 4)]
  const callouts = [
    { at: iso(0, 0, 1.68), n: 1 },
    { at: iso(0.33, -0.33, 1.52), n: 2 },
    { at: iso(0, 1.9, 0.96), n: 3 },
    { at: iso(0.5, 0, 0.42), n: 4 },
    { at: iso(0.2, 0.5, 0.26), n: 5 },
  ]
  const tags = [
    [ox - 96, 40],
    [ox + 118, 30],
    [ox - 214, 318],
    [ox + 168, 262],
    [ox - 26, 352],
  ]
  return (
    <svg className="elx-craft" viewBox="0 0 520 400" role="img" aria-label={"Line drawing of the spacecraft with " + props.parts.length + " labelled parts"}>
      <polyline className="elx-hair elx-dim" points={pts([[-0.42, -0.62, 0.94], [0, -0.5, 0.94]])} />
      {wing(-2.55, -0.62, "w1")}
      {box(-0.5, 0.5, -0.5, 0.5, 0, 1.25, "bus")}
      {[0.18, 0.34, 0.5, 0.66, 0.82].map((z) => (
        <polyline key={z} className="elx-hair" points={pts([[-0.42, 0.5, z], [0.42, 0.5, z]])} />
      ))}
      <polygon className="elx-f2" points={pts([[0.5, -0.2, 0.24], [0.5, 0.2, 0.24], [0.5, 0.2, 0.6], [0.5, -0.2, 0.6]])} />
      <polygon className="elx-f1" points={pts([[0.5, -0.12, 0.31], [0.5, 0.12, 0.31], [0.5, 0.12, 0.53], [0.5, -0.12, 0.53]])} />
      {box(0.22, 0.44, -0.44, -0.22, 1.25, 1.4, "st1")}
      <polygon className="elx-f1" points={pts(ell(0.33, -0.33, 1.52, 0.07))} />
      <polygon className="elx-f2" points={pts(barrelSide)} />
      <polygon className="elx-f1" points={pts(ell(0, 0, 1.68, 0.36))} />
      <polygon className="elx-f5" points={pts(ell(0, 0, 1.68, 0.29))} />
      <polygon className="elx-f1" points={pts(ell(0, 0, 1.68, 0.08))} />
      {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((t) => (
        <polyline key={t} className="elx-hair" points={pts([[0.08 * Math.cos(t), 0.08 * Math.sin(t), 1.68], [0.29 * Math.cos(t), 0.29 * Math.sin(t), 1.68]])} />
      ))}
      <polyline className="elx-hair elx-dim" points={pts([[0, 0.5, 0.94], [-0.42, 0.62, 0.94]])} />
      {wing(0.62, 2.55, "w2")}
      {callouts.map((c, i) => (
        <g key={c.n} className="elx-callout">
          <polyline points={[c.at[0], c.at[1], tags[i][0], tags[i][1]].map((v) => v.toFixed(1)).join(" ")} />
          <circle cx={c.at[0]} cy={c.at[1]} r="2.4" />
          <circle className="elx-tagc" cx={tags[i][0]} cy={tags[i][1]} r="11" />
          <text x={tags[i][0]} y={tags[i][1] + 4} textAnchor="middle">
            {c.n}
          </text>
        </g>
      ))}
    </svg>
  )
}

/** The fleet on a flat map: graticule, night side, every satellite's ground track and the cities, live. */
function TrackMap(props: { sats: SatView[]; now: number; city: ElxCity; cities: ElxCity[]; uid: string; label: string }) {
  const { sats, now, city, cities, uid, label } = props
  const W = 1000
  const H = 500
  const [open, setOpen] = React.useState(null as string | null)
  const half = Math.floor(now / 30000) * 30000
  const tracks = React.useMemo(
    () =>
      sats.map((v) => ({
        id: v.sat.id,
        featured: v.featured,
        past: trackSvg(v.sat, v.plane, half - 15 * 60000, half, W, H),
        next: trackSvg(v.sat, v.plane, half, half + 30 * 60000, W, H),
      })),
    [sats, half],
  )
  const minute = Math.floor(now / 60000) * 60000
  const sun = React.useMemo(() => subSolar(minute), [minute])
  const night = React.useMemo(() => {
    let d = ""
    for (let lon = -180; lon <= 180; lon += 3) {
      const q = mapXY(terminatorLat(lon, sun.lat, sun.lon), lon, W, H)
      d += (d ? "L" : "M") + q.x.toFixed(1) + " " + q.y.toFixed(1)
    }
    return d + (sun.lat > 0 ? "L1000 500L0 500Z" : "L1000 0L0 0Z")
  }, [sun.lat, sun.lon])
  const sunAt = mapXY(sun.lat, sun.lon, W, H)
  // city labels: the chosen city first, then each one right or left of its dot, dropped if it would collide
  const labels = React.useMemo(() => {
    const boxes: number[][] = [[sunAt.x - 16, sunAt.y - 16, sunAt.x + 16, sunAt.y + 16]]
    const order = cities.slice().sort((a, b) => (a.name === city.name ? -1 : b.name === city.name ? 1 : 0))
    return order.map((c) => {
      const q = mapXY(c.lat, c.lon, W, H)
      const here = c.name === city.name
      const wd = c.name.length * 7 + (c.name === city.name ? 9 : 4)
      let side = 0
      for (const sd of q.x > W - wd - 20 ? [-1, 1] : [1, -1]) {
        const b = sd > 0 ? [q.x + 6, q.y - 8, q.x + 8 + wd, q.y + 8] : [q.x - 8 - wd, q.y - 8, q.x - 6, q.y + 8]
        if (b[0] < 0 || b[2] > W) continue
        if (!boxes.some((o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1])) {
          boxes.push(b)
          side = sd
          break
        }
      }
      return { c, q, here, side }
    })
  }, [cities, city.name, sunAt.x, sunAt.y])
  const grat = []
  for (let lon = -150; lon <= 150; lon += 30) grat.push(<line key={"o" + lon} className="elx-grat" x1={((lon + 180) / 360) * W} x2={((lon + 180) / 360) * W} y1={0} y2={H} />)
  for (let lat = -60; lat <= 60; lat += 30)
    grat.push(<line key={"a" + lat} className={"elx-grat" + (lat === 0 ? " elx-eq" : "")} x1={0} x2={W} y1={((90 - lat) / 180) * H} y2={((90 - lat) / 180) * H} />)
  return (
    <figure className="elx-map">
      <svg className="elx-mapsvg" viewBox={"0 0 " + W + " " + H} role="img" aria-label={label}>
        <rect className="elx-mapbg" width={W} height={H} />
        <path className="elx-night" d={night} />
        {grat}
        {tracks.map((t) => (
          <g key={t.id}>
            <path className="elx-tk-past" d={t.past} />
            <path className={"elx-tk-next" + (t.featured ? " elx-on" : "")} d={t.next} />
          </g>
        ))}
        {labels.map(({ c, q, here, side }) => (
          <g key={c.name} className={"elx-city" + (here ? " elx-here" : "")}>
            {here ? <circle className="elx-ring" cx={q.x} cy={q.y} r={7} /> : null}
            <circle cx={q.x} cy={q.y} r={here ? 3 : 2.2} />
            {side ? (
              <text x={q.x + (side > 0 ? 1 : -1) * (here ? 13 : 8)} y={q.y + 4} textAnchor={side > 0 ? "start" : "end"}>
                {c.name}
              </text>
            ) : null}
          </g>
        ))}
        <g className="elx-sunmark">
          <circle cx={sunAt.x} cy={sunAt.y} r={6} />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <line key={i} x1={sunAt.x + Math.cos((i * Math.PI) / 4) * 9} y1={sunAt.y + Math.sin((i * Math.PI) / 4) * 9} x2={sunAt.x + Math.cos((i * Math.PI) / 4) * 13} y2={sunAt.y + Math.sin((i * Math.PI) / 4) * 13} />
          ))}
        </g>
      </svg>
      <div className="elx-mapsats">
        {sats.map((v) => {
          const sp = subPoint(v.sat, v.plane, now)
          const q = mapXY(sp.lat, sp.lon, W, H)
          const tip = uid + "-mtip-" + v.sat.id
          return (
            <div
              key={v.sat.id}
              className={"elx-msat" + (v.featured ? " elx-on" : "") + (q.x > W * 0.78 ? " elx-left" : "")}
              style={{ left: (q.x / W) * 100 + "%", top: (q.y / H) * 100 + "%" }}
              onMouseEnter={() => setOpen(v.sat.id)}
              onMouseLeave={() => setOpen((o) => (o === v.sat.id ? null : o))}
            >
              <button
                type="button"
                aria-label={v.sat.id + ", " + v.plane.sensor + ", over " + fmtLat(sp.lat) + " " + fmtLon(sp.lon)}
                aria-describedby={open === v.sat.id ? tip : undefined}
                onFocus={() => setOpen(v.sat.id)}
                onBlur={() => setOpen((o) => (o === v.sat.id ? null : o))}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setOpen(null)
                }}
              >
                <i />
              </button>
              {open === v.sat.id ? (
                <span className="elx-mtip" role="tooltip" id={tip}>
                  <b>{v.sat.id}</b> {v.plane.name}, {v.plane.sensor}
                  <span className="elx-mono">
                    {fmtLat(sp.lat)} {fmtLon(sp.lon)}, {sp.day ? "daylight" : "eclipse"}
                  </span>
                </span>
              ) : null}
            </div>
          )
        })}
      </div>
    </figure>
  )
}

const asHash = (href?: string) => (href && href.charAt(0) === "#" ? href.slice(1) : null)

export default function EarthLimbLanding({
  brand = "Kestrel",
  tagline = "Earth imaging",
  logo,
  preset = "day",
  accent = "#ffa23a",
  theme = "dark",
  themeToggle = false,
  height = "100svh",
  className = "",
  utility = [{ label: "Developers" }, { label: "System status" }, { label: "Careers" }, { label: "Sign in" }],
  nav = [
    { label: "Solutions", href: "#solutions" },
    { label: "Fleet", href: "#fleet" },
    { label: "Archive", href: "#archive" },
    { label: "Pricing" },
    { label: "Company" },
  ],
  cta = { label: "Request tasking", href: "#tasking" },
  kicker = "Earth imaging, twice a day",
  headline = "Every place on Earth, photographed twice a day.",
  lede = "Eighteen satellites in sun-synchronous orbit. 30 cm imagery of any field, port or coastline, in your bucket within three hours of the pass.",
  secondaryCta = { label: "Browse the archive", href: "#archive" },
  planes = DEFAULT_PLANES,
  fleet = DEFAULT_FLEET,
  featuredPlane,
  cities = DEFAULT_CITIES,
  imagesPerDay = 9400,
  archiveStat = { value: "2.3B km²", sub: "Imaged since launch in 2021" },
  labels = {},
  statement = "We photograph the planet at the same local time every day, so the only thing that changes between two pictures is the ground. That makes change easy to see, and easy to measure.",
  card = {
    kicker: "Open data",
    title: "Disaster response",
    body: "When a flood, fire or earthquake hits, we task the fleet at no cost and publish the imagery for responders within the day.",
    link: { label: "Read the open data policy" },
    kind: "flood",
  },
  usesTitle = "Watch what changes",
  uses = DEFAULT_USES,
  spacecraft: spacecraftProp,
  rosterTitle = "Where the fleet is now",
  archiveTitle = "From the archive",
  archive = DEFAULT_ARCHIVE,
  tasking = DEFAULT_TASKING,
  onTask,
  footer: footerProp,
  swath = { kind: "fields", caption: "Central Valley, 36.7°N 119.8°W, 30 cm" },
  photo,
  sections,
  rhythm = DEFAULT_RHYTHM,
  onSubscribe,
  seed = 7,
}: EarthLimbLandingProps) {
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "")
  const has = (k: ElxSection) => !sections || sections.indexOf(k) > -1
  const spacecraft = spacecraftProp || { ...DEFAULT_SPACECRAFT, name: brand + " Block 2" }
  const footer: NonNullable<EarthLimbLandingProps["footer"]> = footerProp || {
    ...DEFAULT_FOOTER,
    columns: DEFAULT_FOOTER.columns.map((c) => (c.title === "Solutions" ? { ...c, links: uses.map((u) => ({ label: u.label, href: "#solutions" })) } : c)),
    note: brand + ".",
  }
  const root = React.useRef(null as HTMLDivElement | null)
  const copyRef = React.useRef(null as HTMLDivElement | null)
  const reduced = usePrefersReduced()
  const [dark, setDark] = useTheme(theme)
  const now = useNow()
  const [solid, setSolid] = React.useState(false)
  const [menu, setMenu] = React.useState(false)
  const [cityIx, setCityIx] = React.useState(0)
  const [useIx, setUseIx] = React.useState(0)
  const L = { fleet: "Fleet", fleetSub: "Satellites in orbit", pass: "Next pass", passSub: "Over", imaged: "Imaged today", imagedSub: "Scenes since 00:00 UTC", archive: "Archive", ...labels }

  const planeById = React.useMemo(() => {
    const m: { [k: string]: ElxPlane } = {}
    for (const p of planes) m[p.id] = p
    return m
  }, [planes])
  const featured = planeById[featuredPlane || (PRESETS[preset] || PRESETS.dawn).plane] || planes[0]
  const satViews = React.useMemo(
    () => fleet.filter((s) => planeById[s.plane]).map((s) => ({ sat: s, plane: planeById[s.plane], featured: s.plane === featured.id })),
    [fleet, planeById, featured],
  )
  const city = cities[Math.min(cityIx, cities.length - 1)] || DEFAULT_CITIES[0]

  React.useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""
      setCityIx(cityForZone(cities, tz, new Date().getTimezoneOffset()))
    } catch {
      setCityIx(0)
    }
  }, [cities])

  // next pass over the chosen city, recomputed when the city changes or the pass is over
  const [pass, setPass] = React.useState(null as null | { sat: ElxSat; plane: ElxPlane; at: number; city: string })
  React.useEffect(() => {
    if (pass && pass.city === city.name && now < pass.at + 90000) return
    const from = pass && pass.city === city.name ? now + 90000 : now
    const p = nextPass(fleet, planes, city, from, 48)
    setPass(p ? { ...p, city: city.name } : { sat: fleet[0], plane: planes[0], at: Infinity, city: city.name })
  }, [city, now, fleet, planes, pass])

  React.useEffect(() => {
    const on = () => setSolid(window.scrollY > 24)
    on()
    window.addEventListener("scroll", on, { passive: true })
    return () => window.removeEventListener("scroll", on)
  }, [])

  // the phone menu is a modal: focus moves in, Tab stays inside, Escape closes, focus returns to the button
  React.useEffect(() => {
    if (!menu) return
    const r = root.current
    const items = () => (r ? (Array.from(r.querySelectorAll(".elx-menubtn, .elx-sheetnav a")) as HTMLElement[]) : [])
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(false)
        return
      }
      if (e.key !== "Tab") return
      const list = items()
      if (!list.length) return
      const i = list.indexOf(document.activeElement as HTMLElement)
      if (e.shiftKey && i <= 0) {
        e.preventDefault()
        list[list.length - 1].focus()
      } else if (!e.shiftKey && i === list.length - 1) {
        e.preventDefault()
        list[0].focus()
      }
    }
    document.addEventListener("keydown", onKey)
    const first = r && (r.querySelector(".elx-sheetnav a") as HTMLElement | null)
    if (first) first.focus()
    return () => {
      document.removeEventListener("keydown", onKey)
      const btn = r && (r.querySelector(".elx-menubtn") as HTMLElement | null)
      const at = document.activeElement as HTMLElement | null
      if (btn && (!at || at === document.body || !!at.closest(".elx-sheet"))) btn.focus({ preventScroll: true })
    }
  }, [menu])

  const go = (href?: string) => (e: React.MouseEvent) => {
    const id = asHash(href)
    if (!id) return
    const el = root.current && (root.current.querySelector('[data-sec="' + id + '"]') as HTMLElement | null)
    if (!el) return
    e.preventDefault()
    setMenu(false)
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" })
  }

  const pickUse = (i: number, scroll: boolean) => {
    setUseIx(i)
    if (!scroll) return
    const el = root.current && (root.current.querySelector('[data-sec="solutions"]') as HTMLElement | null)
    if (el) el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" })
  }

  const passIn = pass && isFinite(pass.at) ? (pass.at - now) / 1000 : null
  const use = uses[Math.min(useIx, uses.length - 1)]
  const accentInk = dark ? accent : shade(accent, 0.5)

  // fleet roster, live
  const roster = satViews.map((v) => ({ v, sp: subPoint(v.sat, v.plane, now) }))
  const [rosterAll, setRosterAll] = React.useState(false)

  // archive carousel
  const rail = React.useRef(null as HTMLDivElement | null)
  const [railEnds, setRailEnds] = React.useState({ start: true, end: false })
  const readRail = () => {
    const el = rail.current
    if (!el) return
    setRailEnds({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 })
  }
  const nudge = (dir: number) => {
    const el = rail.current
    if (!el) return
    const card = el.querySelector(".elx-story") as HTMLElement | null
    el.scrollBy({ left: dir * ((card ? card.offsetWidth : 320) + 20), behavior: reduced ? "auto" : "smooth" })
  }

  // tasking form
  const T = tasking
  const today = new Date(now).toISOString().slice(0, 10)
  const [form, setForm] = React.useState({ area: "", lat: "", lon: "", from: "", to: "", product: "", use: "", email: "" })
  const untilDefault = new Date(Date.parse((form.from || today) + "T00:00:00Z") + 14 * 86400000).toISOString().slice(0, 10)
  const [errors, setErrors] = React.useState({} as { [k: string]: string })
  const [sent, setSent] = React.useState("idle" as "idle" | "sending" | "done" | "error")
  const area = form.area === "custom" ? null : cities.find((c) => c.name === form.area) || city
  const product = T.products.find((p) => p.id === form.product) || T.products[0]
  const target =
    form.area === "custom"
      ? isFinite(parseFloat(form.lat)) && isFinite(parseFloat(form.lon))
        ? { lat: clamp(parseFloat(form.lat), -90, 90), lon: clamp(parseFloat(form.lon), -180, 180) }
        : null
      : area
  const minute = Math.floor(now / 60000)
  const earliest = React.useMemo(() => {
    if (!target) return null
    const start = form.from && form.from > today ? Date.parse(form.from + "T00:00:00Z") : minute * 60000
    return nextPass(fleet, planes, target, start, 72, product ? product.sensor : undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target && target.lat, target && target.lon, form.from, product && product.sensor, minute, fleet, planes])
  const set = (k: string) => (e: React.ChangeEvent) => {
    const v = (e.target as HTMLInputElement).value
    setForm((f) => ({ ...f, [k]: v }))
    if (errors[k]) setErrors((x) => ({ ...x, [k]: "" }))
  }
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const f = { ...form, area: form.area || city.name, from: form.from || today, to: form.to || untilDefault }
    const errs = validateTask(f)
    setErrors(errs)
    if (Object.keys(errs).length) {
      const first = root.current && (root.current.querySelector('[aria-invalid="true"]') as HTMLElement | null)
      if (first) first.focus()
      return
    }
    setSent("sending")
    let ok = true
    try {
      const req: ElxTaskRequest = {
        area: f.area === "custom" ? "Custom" : f.area,
        lat: target ? target.lat : 0,
        lon: target ? target.lon : 0,
        from: f.from,
        to: f.to,
        product: product ? product.id : "",
        use: f.use || (uses[0] ? uses[0].id : ""),
        email: f.email.trim(),
      }
      const res = onTask ? await onTask(req) : undefined
      if (res === false) ok = false
    } catch {
      ok = false
    }
    setSent(ok ? "done" : "error")
  }
  const fieldErr = (k: string) =>
    errors[k] ? (
      <p className="elx-err" id={uid + "-" + k + "-err"}>
        {errors[k]}
      </p>
    ) : null
  const errProps = (k: string) => ({ "aria-invalid": errors[k] ? true : undefined, "aria-describedby": errors[k] ? uid + "-" + k + "-err" : undefined })

  // newsletter
  const [mail, setMail] = React.useState("")
  const [mailState, setMailState] = React.useState("idle" as "idle" | "bad" | "done" | "error")
  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEmail(mail)) return setMailState("bad")
    let ok = true
    try {
      const res = onSubscribe ? await onSubscribe(mail.trim()) : undefined
      if (res === false) ok = false
    } catch {
      ok = false
    }
    setMailState(ok ? "done" : "error")
  }

  const tabKey = (e: React.KeyboardEvent) => {
    const n = nextIndex(useIx, e.key, uses.length)
    if (n === useIx && e.key !== "Home" && e.key !== "End") return
    e.preventDefault()
    setUseIx(n)
    const el = root.current && (root.current.querySelector("#" + uid + "-tab-" + n) as HTMLElement | null)
    if (el) el.focus()
  }

  const style = {
    "--elx-h": height,
    "--elx-accent": accent,
    "--elx-accent-ink": accentInk,
  } as React.CSSProperties

  return (
    <div ref={root} className={"elx-root " + className} data-theme={dark ? "dark" : "light"} data-preset={preset} style={style}>
      <style>{ELX_CSS}</style>
      <a className="elx-skip" href={"#" + uid + "-main"}>
        Skip to content
      </a>
      <header className="elx-head" data-solid={solid || menu ? "" : undefined}>
        <div className="elx-util elx-wrap">
          <nav aria-label="Utility">
            {utility.map((l) => (
              <a key={l.label} href={l.href || "#"} onClick={go(l.href)}>
                {l.label}
              </a>
            ))}
          </nav>
          {themeToggle ? (
            <button type="button" className="elx-themebtn" onClick={() => setDark(!dark)} aria-pressed={dark}>
              Dark pages
            </button>
          ) : null}
        </div>
        <div className="elx-bar elx-wrap">
          <a className="elx-brand" href="#" onClick={(e) => {
            e.preventDefault()
            window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" })
          }}>
            {logo || <Mark size={30} />}
            <span>
              <b>{brand}</b>
              <small>{tagline}</small>
            </span>
          </a>
          <nav aria-label="Main" className="elx-mainnav">
            {nav.map((l) => (
              <a key={l.label} href={l.href || "#"} onClick={go(l.href)}>
                <span>{l.label}</span>
              </a>
            ))}
          </nav>
          <a className="elx-btn elx-solid elx-headcta" href={cta.href || "#"} onClick={go(cta.href)}>
            <span>{cta.label}</span>
          </a>
          <button type="button" className="elx-menubtn" aria-expanded={menu} aria-controls={uid + "-menu"} onClick={() => setMenu(!menu)}>
            <span aria-hidden="true" className="elx-burger" data-open={menu ? "" : undefined} />
            <span className="elx-sr">{menu ? "Close menu" : "Menu"}</span>
          </button>
        </div>
      </header>
      {menu ? (
        <div className="elx-sheet" id={uid + "-menu"} role="dialog" aria-modal="true" aria-label="Menu">
          <nav className="elx-sheetnav elx-wrap" aria-label="Menu">
            {nav.map((l) => (
              <a key={l.label} href={l.href || "#"} onClick={go(l.href)}>
                {l.label}
              </a>
            ))}
            <a className="elx-btn elx-solid" href={cta.href || "#"} onClick={go(cta.href)}>
              <span>{cta.label}</span>
            </a>
            <div className="elx-sheetutil">
              {utility.map((l) => (
                <a key={l.label} href={l.href || "#"} onClick={go(l.href)}>
                  {l.label}
                </a>
              ))}
            </div>
          </nav>
        </div>
      ) : null}

      <main id={uid + "-main"} tabIndex={-1}>
        <section className="elx-hero" aria-labelledby={uid + "-h1"}>
          <OrbitHero preset={preset} plane={featured} sats={satViews} planes={planes} seed={seed} reduced={reduced} now={now} city={city} quiet={copyRef} uid={uid} photo={photo} />
          <div className="elx-scrim" aria-hidden="true" />
          <div className="elx-herocopy elx-wrap" ref={copyRef}>
            <p className="elx-kicker">{kicker}</p>
            <h1 id={uid + "-h1"}>{headline}</h1>
            <p className="elx-lede">{lede}</p>
            <div className="elx-ctas">
              <a className="elx-btn elx-solid" href={cta.href || "#"} onClick={go(cta.href)}>
                <span>{cta.label}</span>
                <Arrow />
              </a>
              <a className="elx-btn elx-ghost" href={secondaryCta.href || "#"} onClick={go(secondaryCta.href)}>
                <span>{secondaryCta.label}</span>
              </a>
            </div>
          </div>
          <ul className="elx-pillars" aria-label="Solutions" style={{ gridTemplateColumns: "repeat(" + Math.max(1, uses.length) + ",minmax(0,1fr))" }}>
            {uses.map((u, i) => (
              <li key={u.id}>
                <button type="button" onClick={() => pickUse(i, true)}>
                  <b>{u.label}</b>
                  <span>{u.line}</span>
                  <Arrow />
                </button>
              </li>
            ))}
          </ul>
        </section>

        {has("stats") ? (
<section className="elx-live" aria-label="Fleet status">
          <div className="elx-wrap elx-livegrid">
            <div className="elx-cell">
              <h2 className="elx-label">{L.fleet}</h2>
              <p className="elx-sub">{L.fleetSub}</p>
              <p className="elx-big">{fleet.length}</p>
              <p className="elx-meta">
                {planes.map((p) => p.name).join(", ")} planes
              </p>
            </div>
            <div className="elx-cell elx-passcell">
              <h2 className="elx-label">{L.pass}</h2>
              <p className="elx-sub">
                <label htmlFor={uid + "-city"}>{L.passSub}</label>{" "}
                <span className="elx-select">
                  <select id={uid + "-city"} value={city.name} onChange={(e) => setCityIx(Math.max(0, cities.findIndex((c) => c.name === e.target.value)))}>
                    {cities.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </span>
              </p>
              <p className="elx-big" aria-live="off">
                {passIn === null ? "--:--:--" : passIn <= 0 ? "Overhead" : clock(passIn)}
              </p>
              <p className="elx-meta">
                {pass && isFinite(pass.at) ? pass.sat.id + ", " + pass.plane.sensor + ", " + pass.plane.name.toLowerCase() + " plane" : "No pass in the next 48 hours"}
              </p>
            </div>
            <div className="elx-cell">
              <h2 className="elx-label">{L.imaged}</h2>
              <p className="elx-sub">{L.imagedSub}</p>
              <p className="elx-big">{imagedToday(now, imagesPerDay).toLocaleString("en-US")}</p>
              <p className="elx-meta">About {Math.round(imagesPerDay / 24).toLocaleString("en-US")} an hour</p>
            </div>
            <div className="elx-cell">
              <h2 className="elx-label">{L.archive}</h2>
              <p className="elx-sub">{archiveStat.sub}</p>
              <p className="elx-big">{archiveStat.value}</p>
              <p className="elx-meta">Searchable by place and date</p>
            </div>
          </div>
        </section>
        ) : null}

        {has("intro") ? (
<section className="elx-intro" aria-label="About">
          <div className="elx-wrap elx-introgrid">
            <div className="elx-statewrap">
              <p className="elx-statement">{statement}</p>
              {rhythm.length ? (
                <dl className="elx-rhythm">
                  {rhythm.map((f) => (
                    <div key={f.label}>
                      <dt>{f.label}</dt>
                      <dd>{f.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>
            {card ? (
              <aside className="elx-card">
                <div className="elx-cardimg">
                  <Picture image={card.image} alt="" kind={card.kind || "flood"} which="b" seed={seed + 3} accent={accent} w={420} h={260} />
                </div>
                <p className="elx-label">{card.kicker}</p>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
                <a className="elx-link" href={card.link.href || "#"} onClick={go(card.link.href)}>
                  <span>{card.link.label}</span>
                  <Arrow />
                </a>
              </aside>
            ) : null}
          </div>
        </section>
        ) : null}

        {has("uses") ? (
<section className="elx-uses" data-sec="solutions" aria-labelledby={uid + "-uses"}>
          <div className="elx-wrap">
            <div className="elx-useshead">
              <h2 id={uid + "-uses"} className="elx-h2">
                {usesTitle}
              </h2>
              <div className="elx-tabs" role="tablist" aria-label="Solutions">
                {uses.map((u, i) => (
                  <button
                    key={u.id}
                    id={uid + "-tab-" + i}
                    type="button"
                    role="tab"
                    aria-selected={i === useIx}
                    aria-controls={uid + "-panel"}
                    tabIndex={i === useIx ? 0 : -1}
                    onClick={() => pickUse(i, false)}
                    onKeyDown={tabKey}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            </div>
            {use ? (
              <div className="elx-usegrid" role="tabpanel" id={uid + "-panel"} aria-labelledby={uid + "-tab-" + useIx}>
                <Compare use={use} seed={seed + useIx * 11} accent={accent} reduced={reduced} />
                <div className="elx-usecopy" key={use.id}>
                  <h3>{use.title}</h3>
                  <p>{use.body}</p>
                  <dl className="elx-facts">
                    {use.facts.map((f) => (
                      <div key={f.label}>
                        <dt>{f.label}</dt>
                        <dd>{f.value}</dd>
                      </div>
                    ))}
                  </dl>
                  {use.cta ? (
                    <a className="elx-btn elx-line" href={use.cta.href || "#"} onClick={go(use.cta.href)}>
                      <span>{use.cta.label}</span>
                      <Arrow />
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </section>
        ) : null}

        {swath && has("uses") && has("fleet") ? (
          <div className="elx-band elx-swath" aria-hidden="true">
            <Picture image={swath.image} kind={swath.kind} which="a" seed={seed + 60} accent={accent} w={1600} h={200} span={2600} />
            {swath.caption ? <span className="elx-bandtag elx-mono">{swath.caption}</span> : null}
          </div>
        ) : null}
        {has("fleet") ? (
<section className="elx-fleet" data-sec="fleet" aria-labelledby={uid + "-craft"}>
          <div className="elx-wrap elx-fleetgrid">
            <div className="elx-plate">
              <Spacecraft parts={spacecraft.parts} />
              <ol className="elx-parts">
                {spacecraft.parts.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ol>
              <span className="elx-brk elx-brk-tl" aria-hidden="true" />
              <span className="elx-brk elx-brk-br" aria-hidden="true" />
            </div>
            <div className="elx-craftcopy">
              <p className="elx-label">{spacecraft.name}</p>
              <h2 id={uid + "-craft"} className="elx-h2">
                {spacecraft.title}
              </h2>
              <p className="elx-body">{spacecraft.body}</p>
              <dl className="elx-specs">
                {spacecraft.specs.map((s) => (
                  <div key={s.label}>
                    <dt>{s.label}</dt>
                    <dd>{s.value}</dd>
                  </div>
                ))}
              </dl>
              <div className="elx-ctas">
                <a className="elx-btn elx-solid" href={spacecraft.primary.href || "#"} onClick={go(spacecraft.primary.href)}>
                  <span>{spacecraft.primary.label}</span>
                </a>
                <a className="elx-btn elx-line" href={spacecraft.secondary.href || "#"} onClick={go(spacecraft.secondary.href)}>
                  <span>{spacecraft.secondary.label}</span>
                </a>
              </div>
            </div>
          </div>
          <div className="elx-wrap">
            <div className="elx-maphead">
              <h3 className="elx-rostertitle">{rosterTitle}</h3>
              <ul className="elx-legend">
                {planes.map((p) => (
                  <li key={p.id} data-on={p.id === featured.id ? "" : undefined}>
                    <i aria-hidden="true" />
                    {p.name}, {p.sensor}
                  </li>
                ))}
                <li className="elx-legend-sun">
                  <i aria-hidden="true" />
                  Sun overhead, night shaded
                </li>
              </ul>
            </div>
            <TrackMap sats={satViews} now={now} city={city} cities={cities} uid={uid} label={"Map of the fleet's ground tracks for the next 30 minutes, with " + city.name + " marked"} />
            <button type="button" className="elx-more" aria-expanded={rosterAll} aria-controls={uid + "-roster"} onClick={() => setRosterAll(!rosterAll)}>
              {rosterAll ? "Hide the list" : "All " + roster.length + " positions as a list"}
            </button>
            <ul className="elx-roster" data-all={rosterAll ? "" : undefined} id={uid + "-roster"}>
              {roster.map(({ v, sp }) => (
                <li key={v.sat.id} data-day={sp.day ? "" : undefined}>
                  <b>{v.sat.id}</b>
                  <span className="elx-mono">
                    {fmtLat(sp.lat)} {fmtLon(sp.lon)}
                  </span>
                  <span className="elx-state">
                    <i aria-hidden="true" />
                    {v.plane.sensor === "radar" ? "Radar" : "Optical"}, {sp.day ? "daylight" : "eclipse"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
        ) : null}

        {has("archive") ? (
<section className="elx-archive" data-sec="archive" aria-labelledby={uid + "-arch"}>
          <div className="elx-wrap">
            <div className="elx-archhead">
              <h2 id={uid + "-arch"} className="elx-h2">
                {archiveTitle}
              </h2>
              <div className="elx-railbtns">
                <button type="button" onClick={() => nudge(-1)} disabled={railEnds.start} aria-label="Previous images">
                  <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true">
                    <path d="M18 6H3M7.5 1.2 2.5 6l5 4.8" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                </button>
                <button type="button" onClick={() => nudge(1)} disabled={railEnds.end} aria-label="Next images">
                  <Arrow />
                </button>
              </div>
            </div>
          </div>
          <div className="elx-rail" ref={rail} onScroll={readRail} tabIndex={0} role="region" aria-label={archiveTitle}>
            {archive.map((s, i) => (
              <a key={s.title} className="elx-story" href={s.href || "#"} onClick={go(s.href)}>
                <div className="elx-storyimg">
                  <Picture image={s.image} alt={s.alt || s.title} kind={s.kind} which="a" seed={seed + 50 + i * 7} accent={accent} w={560} h={400} />
                </div>
                <p className="elx-label">{s.category}</p>
                <h3>{s.title}</h3>
                <p className="elx-meta">{s.date}</p>
              </a>
            ))}
          </div>
        </section>
        ) : null}

        {has("tasking") ? (
<section className="elx-task" data-sec="tasking" aria-labelledby={uid + "-task"}>
          <div className="elx-wrap elx-taskgrid">
            <div className="elx-taskcopy">
              <h2 id={uid + "-task"} className="elx-h2">
                {T.title}
              </h2>
              <p className="elx-body">{T.body}</p>
              <ol className="elx-steps">
                {T.steps.map((s) => (
                  <li key={s.title}>
                    <b>{s.title}</b>
                    <span>{s.body}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="elx-formwrap">
              {sent === "done" ? (
                <div className="elx-done" role="status">
                  {logo || <Mark size={36} />}
                  <h3>Request received</h3>
                  <p>
                    We will put it on {earliest ? earliest.sat.id + "'s pass" : "the next suitable pass"} and email <b className="elx-nowrap">{form.email.trim()}</b> when the imagery lands.
                  </p>
                  <dl className="elx-summary">
                    <div>
                      <dt>Area</dt>
                      <dd>{form.area === "custom" ? fmtLat(target ? target.lat : 0) + " " + fmtLon(target ? target.lon : 0) : form.area || city.name}</dd>
                    </div>
                    <div>
                      <dt>Window</dt>
                      <dd>
                        {form.from || today} to {form.to || untilDefault}
                      </dd>
                    </div>
                    <div>
                      <dt>Product</dt>
                      <dd>{product ? product.label : ""}</dd>
                    </div>
                    <div>
                      <dt>Earliest collection</dt>
                      <dd className="elx-mono">{earliest ? earliest.sat.id + " in " + clock((earliest.at - now) / 1000) : "Next suitable pass"}</dd>
                    </div>
                  </dl>
                  <button
                    type="button"
                    className="elx-btn elx-line"
                    onClick={() => {
                      setSent("idle")
                      setForm((f) => ({ ...f, email: f.email }))
                    }}
                  >
                    <span>Request another</span>
                  </button>
                </div>
              ) : (
                <form className="elx-form" onSubmit={submit} noValidate>
                  <div className="elx-field elx-span2">
                    <label htmlFor={uid + "-area"}>Area</label>
                    <span className="elx-select">
                      <select id={uid + "-area"} value={form.area || city.name} onChange={set("area")}>
                        {cities.map((c) => (
                          <option key={c.name} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                        <option value="custom">Coordinates</option>
                      </select>
                    </span>
                  </div>
                  {form.area === "custom" ? (
                    <>
                      <div className="elx-field">
                        <label htmlFor={uid + "-lat"}>Latitude</label>
                        <input id={uid + "-lat"} inputMode="decimal" value={form.lat} onChange={set("lat")} placeholder="36.74" {...errProps("lat")} />
                        {fieldErr("lat")}
                      </div>
                      <div className="elx-field">
                        <label htmlFor={uid + "-lon"}>Longitude</label>
                        <input id={uid + "-lon"} inputMode="decimal" value={form.lon} onChange={set("lon")} placeholder="-119.79" {...errProps("lon")} />
                        {fieldErr("lon")}
                      </div>
                    </>
                  ) : null}
                  <div className="elx-field">
                    <label htmlFor={uid + "-from"}>From</label>
                    <input id={uid + "-from"} type="date" min={today} value={form.from || today} onChange={set("from")} {...errProps("from")} />
                    {fieldErr("from")}
                  </div>
                  <div className="elx-field">
                    <label htmlFor={uid + "-to"}>Until</label>
                    <input id={uid + "-to"} type="date" min={form.from || today} value={form.to || untilDefault} onChange={set("to")} {...errProps("to")} />
                    {fieldErr("to")}
                  </div>
                  <div className="elx-field">
                    <label htmlFor={uid + "-product"}>Product</label>
                    <span className="elx-select">
                      <select id={uid + "-product"} value={form.product || (T.products[0] ? T.products[0].id : "")} onChange={set("product")}>
                        {T.products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </span>
                  </div>
                  <div className="elx-field">
                    <label htmlFor={uid + "-use"}>Use</label>
                    <span className="elx-select">
                      <select id={uid + "-use"} value={form.use || (uses[0] ? uses[0].id : "")} onChange={set("use")}>
                        {uses.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.label}
                          </option>
                        ))}
                      </select>
                    </span>
                  </div>
                  <div className="elx-field elx-span2">
                    <label htmlFor={uid + "-email"}>Work email</label>
                    <input id={uid + "-email"} type="email" autoComplete="email" value={form.email} onChange={set("email")} placeholder="you@company.com" {...errProps("email")} />
                    {fieldErr("email")}
                  </div>
                  <p className="elx-earliest elx-span2" aria-live="polite">
                    <span className="elx-label">Earliest collection</span>
                    <span>
                      {earliest
                        ? earliest.sat.id + ", " + new Date(earliest.at).toUTCString().slice(0, 22) + " UTC"
                        : target
                          ? "No suitable pass in the next three days"
                          : "Enter coordinates to see the next pass"}
                    </span>
                  </p>
                  <div className="elx-span2 elx-formfoot">
                    <button type="submit" className="elx-btn elx-solid" disabled={sent === "sending"}>
                      <span>{sent === "sending" ? "Sending" : T.submit || "Request tasking"}</span>
                      <Arrow />
                    </button>
                    {sent === "error" ? (
                      <p className="elx-err" role="alert">
                        That did not go through. Check your connection and send it again.
                      </p>
                    ) : null}
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>
        ) : null}
      </main>

      {has("footer") ? (
      <footer className="elx-foot">
        {footer.band !== null ? (
          <div className="elx-band" aria-hidden="true">
            <Picture image={(footer.band || DEFAULT_FOOTER.band).image} kind={(footer.band || DEFAULT_FOOTER.band).kind} which="a" seed={seed + 90} accent={accent} w={1600} h={220} span={2400} />
            {(footer.band || DEFAULT_FOOTER.band).caption ? <span className="elx-bandtag elx-mono">{(footer.band || DEFAULT_FOOTER.band).caption}</span> : null}
          </div>
        ) : null}
        <div className="elx-wrap elx-footgrid">
          <div className="elx-footbrand">
            <a className="elx-brand" href="#" onClick={(e) => {
              e.preventDefault()
              window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" })
            }}>
              {logo || <Mark size={30} />}
              <span>
                <b>{brand}</b>
                <small>{tagline}</small>
              </span>
            </a>
            {footer.newsletter ? (
              <form className="elx-news" onSubmit={subscribe} noValidate>
                <label htmlFor={uid + "-news"}>
                  <b>{footer.newsletter.title}</b>
                  <span>{footer.newsletter.body}</span>
                </label>
                {mailState === "done" ? (
                  <p role="status" className="elx-newsok">
                    Subscribed. The next one arrives on the first of the month.
                  </p>
                ) : (
                  <div className="elx-newsrow">
                    <input
                      id={uid + "-news"}
                      type="email"
                      autoComplete="email"
                      placeholder="you@company.com"
                      value={mail}
                      onChange={(e) => {
                        setMail(e.target.value)
                        if (mailState !== "idle") setMailState("idle")
                      }}
                      aria-invalid={mailState === "bad" ? true : undefined}
                      aria-describedby={mailState === "bad" || mailState === "error" ? uid + "-news-err" : undefined}
                    />
                    <button type="submit" className="elx-btn elx-solid">
                      <span>Subscribe</span>
                    </button>
                  </div>
                )}
                {mailState === "bad" || mailState === "error" ? (
                  <p className="elx-err" id={uid + "-news-err"}>
                    {mailState === "bad" ? "That address looks incomplete." : "That did not go through. Try again in a minute."}
                  </p>
                ) : null}
              </form>
            ) : null}
          </div>
          {footer.columns.map((c) => (
            <nav key={c.title} className="elx-footcol" aria-label={c.title}>
              <h2>{c.title}</h2>
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
        </div>
        <div className="elx-wrap elx-legal">
          <span>
            © {new Date(now).getUTCFullYear()} {footer.note}
          </span>
          <nav aria-label="Legal">
            {footer.legal.map((l) => (
              <a key={l.label} href={l.href || "#"} onClick={go(l.href)}>
                {l.label}
              </a>
            ))}
          </nav>
        </div>
      </footer>
      ) : null}
    </div>
  )
}

const ELX_CSS = `
.elx-root{--elx-space:#04060a;--elx-navy:#061429;--elx-gut:clamp(16px,4vw,48px);--elx-headh:98px;--elx-sans:"Helvetica Neue","Inter Display",Inter,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;--elx-monof:ui-monospace,"SF Mono","JetBrains Mono",Menlo,Consolas,"Liberation Mono",monospace;--elx-ease:cubic-bezier(.23,1,.32,1);--elx-bg:#f1f3f6;--elx-sheet:#ffffff;--elx-ink:#0a101b;--elx-soft:#273142;--elx-muted:#4b5566;--elx-rule:rgba(10,16,27,.13);--elx-rule2:rgba(10,16,27,.28);--elx-faint:rgba(10,16,27,.045);--elx-face2:#e4e8ee;--elx-face3:#d3d9e2;--elx-panel:#1f2f4d;--elx-err:#b4332a;--elx-mapbg:#e7ebf0;--elx-nightfill:rgba(10,16,27,.05);position:relative;min-height:var(--elx-h);overflow-x:clip;background:var(--elx-bg);color:var(--elx-ink);font-family:var(--elx-sans);font-size:16px;line-height:1.5;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
.elx-root[data-theme="dark"]{--elx-bg:#05070b;--elx-sheet:#0b1017;--elx-ink:#e8edf4;--elx-soft:#c4ccd8;--elx-muted:#97a2b2;--elx-rule:rgba(232,237,244,.12);--elx-rule2:rgba(232,237,244,.3);--elx-faint:rgba(232,237,244,.045);--elx-face2:#131a24;--elx-face3:#192230;--elx-panel:#1b2944;--elx-err:#ff8f80;--elx-mapbg:#08101b;--elx-nightfill:rgba(0,0,0,.45);color-scheme:dark}
.elx-root :where(*,*::before,*::after){box-sizing:border-box}
.elx-root :where(h1,h2,h3,p,ul,ol,dl,dd,figure){margin:0;padding:0}
.elx-root :where(ul,ol){list-style:none}
.elx-root :where(button,input,select){font:inherit;color:inherit;letter-spacing:inherit}
.elx-root :where(button){background:none;border:0;padding:0;cursor:pointer}
.elx-root :where(a){color:inherit;text-decoration:none}
.elx-root ::selection{background:var(--elx-accent);color:#120c03}
.elx-root :where(a,button,input,select,[tabindex]):focus-visible{outline:2px solid var(--elx-accent);outline-offset:3px}
.elx-wrap{width:100%;max-width:1400px;margin:0 auto;padding-left:var(--elx-gut);padding-right:var(--elx-gut)}
.elx-mono{font-family:var(--elx-monof);font-variant-numeric:tabular-nums;letter-spacing:0}
.elx-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.elx-skip{position:absolute;left:12px;top:-60px;z-index:60;background:var(--elx-accent);color:#120c03;padding:10px 14px;font-weight:600}
.elx-skip:focus{top:12px}
.elx-root main:focus{outline:none}
.elx-label{font-size:12px;line-height:1.2;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:var(--elx-accent-ink)}
.elx-meta{font-size:13.5px;color:var(--elx-muted);margin-top:6px}
.elx-h2{font-size:clamp(2rem,1.25rem + 2.4vw,3.5rem);line-height:1.02;letter-spacing:-.035em;font-weight:620;text-wrap:balance}
.elx-body{font-size:17px;line-height:1.55;color:var(--elx-soft);max-width:52ch}

.elx-head{position:sticky;top:0;z-index:40;color:#e9eef5;transition:background-color .3s var(--elx-ease),border-color .3s;border-bottom:1px solid transparent}
.elx-head[data-solid]{background:rgba(4,6,10,.88);border-bottom-color:rgba(255,255,255,.08);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}
.elx-util{height:34px;display:flex;align-items:center;justify-content:space-between;font-size:12.5px;border-bottom:1px solid rgba(255,255,255,.08)}
.elx-util nav{display:flex;gap:22px}
.elx-util a,.elx-themebtn{color:rgba(233,238,245,.7);transition:color .2s}
.elx-util a:hover,.elx-themebtn:hover{color:#fff}
.elx-themebtn{font-size:12.5px;display:inline-flex;align-items:center;gap:8px}
.elx-themebtn::before{content:"";width:9px;height:9px;border-radius:50%;border:1.5px solid currentColor;background:linear-gradient(90deg,currentColor 50%,transparent 50%)}
.elx-bar{height:64px;display:flex;align-items:center;gap:28px}
.elx-brand{display:inline-flex;align-items:center;gap:11px;margin-right:auto}
.elx-brand b{display:block;font-size:19px;font-weight:700;letter-spacing:-.02em;line-height:1}
.elx-brand small{display:block;font-size:12px;color:rgba(233,238,245,.62);margin-top:3px;line-height:1}
.elx-mark{color:#e9eef5;flex:none}
.elx-mainnav{display:flex;gap:30px;font-size:15px}
.elx-mainnav a{position:relative;padding:8px 0;color:rgba(233,238,245,.86);transition:color .2s}
.elx-mainnav a span{background:linear-gradient(var(--elx-accent),var(--elx-accent)) 0 100%/0 1.5px no-repeat;padding-bottom:4px;transition:background-size .3s var(--elx-ease)}
.elx-mainnav a:hover{color:#fff}
.elx-mainnav a:hover span{background-size:100% 1.5px}
.elx-menubtn{display:none;width:44px;height:44px;align-items:center;justify-content:center;color:#fff}
.elx-burger{position:relative;width:20px;height:1.6px;background:currentColor;transition:background .2s}
.elx-burger::before,.elx-burger::after{content:"";position:absolute;left:0;width:20px;height:1.6px;background:currentColor;transition:transform .25s var(--elx-ease)}
.elx-burger::before{transform:translateY(-6px)}
.elx-burger::after{transform:translateY(6px)}
.elx-burger[data-open]{background:transparent}
.elx-burger[data-open]::before{transform:rotate(45deg)}
.elx-burger[data-open]::after{transform:rotate(-45deg)}
.elx-sheet{position:fixed;left:0;right:0;top:var(--elx-headh);bottom:0;z-index:39;color:#eef2f7;background:#04060a;overflow-y:auto;animation:elx-in .28s var(--elx-ease)}
.elx-sheetnav{display:flex;flex-direction:column;align-items:flex-start;gap:6px;padding-top:28px;padding-bottom:40px}
.elx-sheetnav>a:not(.elx-btn){font-size:30px;letter-spacing:-.03em;font-weight:600;padding:6px 0;color:#eef2f7}
.elx-sheetnav>.elx-btn{margin-top:18px}
.elx-sheetutil{display:flex;flex-wrap:wrap;gap:12px 22px;margin-top:34px;font-size:15px;color:rgba(233,238,245,.7)}
.elx-sheetutil a{padding:6px 0}

.elx-btn{display:inline-flex;align-items:center;justify-content:center;gap:12px;height:50px;padding:0 24px;border-radius:2px;font-size:15px;font-weight:650;letter-spacing:-.005em;white-space:nowrap;transition:transform .16s var(--elx-ease),background-color .2s,color .2s,border-color .2s;position:relative}
.elx-btn:active,.elx-tabs button:active,.elx-railbtns button:active,.elx-more:active,.elx-pillars button:active{transform:scale(.97)}
.elx-btn:disabled{opacity:.6;cursor:progress}
.elx-btn .elx-arrow{transition:transform .3s var(--elx-ease)}
.elx-btn:hover .elx-arrow{transform:translateX(5px)}
.elx-solid{background:var(--elx-accent);color:#120c03}
.elx-solid:hover{background:#fff}
.elx-ghost{color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.45)}
.elx-ghost:hover{background:#fff;color:#05070b;box-shadow:inset 0 0 0 1px #fff}
.elx-line{color:var(--elx-ink);box-shadow:inset 0 0 0 1px var(--elx-ink)}
.elx-line:hover{background:var(--elx-ink);color:var(--elx-sheet)}
.elx-headcta{height:40px;padding:0 18px;font-size:14px}
.elx-link{display:inline-flex;align-items:center;gap:10px;font-weight:650;color:var(--elx-ink);margin-top:18px}
.elx-link span{background:linear-gradient(currentColor,currentColor) 0 100%/100% 1px no-repeat;padding-bottom:3px}
.elx-link .elx-arrow{transition:transform .3s var(--elx-ease)}
.elx-link:hover .elx-arrow{transform:translateX(5px)}
.elx-link:hover{color:var(--elx-accent-ink)}

.elx-hero{position:relative;margin-top:calc(-1 * var(--elx-headh));min-height:clamp(640px,var(--elx-h),1100px);background:var(--elx-space);color:#eef2f7;display:flex;flex-direction:column;justify-content:flex-end;isolation:isolate;overflow:hidden}
.elx-sky{position:absolute;inset:0;z-index:0}
.elx-sky[data-nogl]{background:radial-gradient(circle at 66% 175%,#0f2c50 0,#0b2342 61%,#5d97f4 61.4%,rgba(93,151,244,.22) 62.2%,transparent 64%)}
.elx-canvas{position:absolute;left:0;top:0;display:block;max-width:none;opacity:0;transition:opacity 1.2s ease}
.elx-sky[data-painted] .elx-canvas{opacity:1}
.elx-photo{position:absolute;left:0;top:0;display:block;max-width:none;object-fit:cover}
.elx-orbit{position:absolute;left:0;top:0;z-index:1;overflow:visible;pointer-events:none;max-width:none}
.elx-track{fill:none;stroke:var(--elx-accent);stroke-width:1.2;stroke-dasharray:2 7;stroke-linecap:round;opacity:.9}
.elx-nadir{stroke:rgba(255,255,255,.3);stroke-width:1}
.elx-nadir.elx-on{stroke:var(--elx-accent);opacity:.7}
.elx-sats{position:absolute;left:0;top:0;z-index:2}
.elx-sat{position:absolute;left:0;top:0;will-change:transform}
.elx-satbtn{position:absolute;left:-16px;top:-16px;width:32px;height:32px;display:grid;place-items:center;border-radius:50%}
.elx-satdot{width:6px;height:6px;background:rgba(255,255,255,.85);transform:rotate(45deg);transition:transform .2s var(--elx-ease)}
.elx-sat.elx-on .elx-satdot{width:9px;height:9px;background:var(--elx-accent);box-shadow:0 0 0 4px rgba(4,6,10,.45)}
.elx-sat.elx-on .elx-satbtn::after{content:"";position:absolute;inset:6px;border-radius:50%;border:1px solid var(--elx-accent);animation:elx-ping 2.8s var(--elx-ease) infinite}
.elx-satbtn:hover .elx-satdot,.elx-satbtn[aria-expanded="true"] .elx-satdot{transform:rotate(45deg) scale(1.5)}
.elx-sat[data-quiet]{opacity:.35}
.elx-sat[data-quiet] .elx-satname{display:none}
.elx-satname{position:absolute;left:14px;top:-26px;font:500 11px/1 var(--elx-monof);letter-spacing:.04em;color:#fff;background:rgba(4,6,10,.62);padding:4px 6px;white-space:nowrap;pointer-events:none}
.elx-satname em{font-style:normal;color:rgba(255,255,255,.7);margin-left:8px}
.elx-sat.elx-lead .elx-satname{top:-30px;padding:6px 8px}
.elx-sat[data-flip] .elx-satname{left:auto;right:14px}
.elx-sat[data-flip] .elx-satcard{left:auto;right:18px}
.elx-satcard{position:absolute;left:18px;top:16px;width:260px;display:grid;gap:4px;padding:12px 14px;font-size:13px;line-height:1.4;color:#d9e1eb;background:rgba(5,8,13,.94);box-shadow:inset 0 0 0 1px rgba(255,255,255,.14);animation:elx-in .18s var(--elx-ease)}
.elx-satcard b{color:#fff;font-size:14px}
.elx-scrim{position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(180deg,rgba(4,6,10,0) 38%,rgba(4,6,10,.5) 70%,rgba(4,6,10,.82) 100%),linear-gradient(90deg,rgba(4,6,10,.55),rgba(4,6,10,0) 60%)}
.elx-herocopy{position:relative;z-index:3;padding-top:calc(var(--elx-headh) + 20vh);padding-bottom:clamp(30px,5.5vh,64px);pointer-events:none}
.elx-herocopy>*{pointer-events:auto}
.elx-kicker{color:var(--elx-accent);font-size:13px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;margin-bottom:18px}
.elx-hero h1{font-size:clamp(2.5rem,1.1rem + 3.7vw,4.9rem);line-height:.98;letter-spacing:-.042em;font-weight:640;max-width:18ch;text-wrap:balance;margin-left:-.04em}
.elx-lede{font-size:clamp(1.02rem,.94rem + .32vw,1.22rem);line-height:1.5;color:rgba(233,238,245,.8);max-width:44ch;margin-top:22px}
.elx-ctas{display:flex;flex-wrap:wrap;gap:12px;margin-top:30px}
.elx-herocopy>*{animation:elx-rise .9s var(--elx-ease) both}
.elx-herocopy>:nth-child(2){animation-delay:.06s}
.elx-herocopy>:nth-child(3){animation-delay:.12s}
.elx-herocopy>:nth-child(4){animation-delay:.18s}
.elx-pillars{position:relative;z-index:3;display:grid;border-top:1px solid rgba(255,255,255,.12);background:rgba(8,12,18,.5);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
.elx-pillars li+li button{box-shadow:inset 1px 0 0 rgba(255,255,255,.1)}
.elx-pillars button{position:relative;display:grid;align-content:start;gap:6px;width:100%;min-height:108px;padding:20px clamp(16px,2vw,28px) 22px;text-align:left;color:#eef2f7;transition:background-color .25s}
.elx-pillars b{font-size:12px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:var(--elx-accent)}
.elx-pillars span{font-size:15.5px;line-height:1.35;color:rgba(238,242,247,.86);max-width:24ch}
.elx-pillars .elx-arrow{position:absolute;right:18px;top:20px;opacity:0;transform:translateX(-6px);transition:opacity .25s,transform .3s var(--elx-ease)}
.elx-pillars button:hover{background:rgba(255,255,255,.06)}
.elx-pillars button:hover .elx-arrow,.elx-pillars button:focus-visible .elx-arrow{opacity:1;transform:none}

.elx-live{background:var(--elx-sheet);border-bottom:1px solid var(--elx-rule)}
.elx-livegrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr))}
.elx-cell{padding:36px 28px 40px;box-shadow:inset 1px 0 0 var(--elx-rule)}
.elx-cell:first-child{box-shadow:none;padding-left:0}
.elx-sub{font-size:15px;color:var(--elx-muted);margin-top:10px}
.elx-big{font-size:clamp(2.1rem,1.3rem + 2vw,3.4rem);font-weight:600;letter-spacing:-.035em;line-height:1;margin-top:14px;font-variant-numeric:tabular-nums;white-space:nowrap}

.elx-select{position:relative;display:inline-block}
.elx-select::after{content:"";position:absolute;right:4px;top:50%;width:7px;height:7px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:translateY(-70%) rotate(45deg);pointer-events:none}
.elx-select select{appearance:none;-webkit-appearance:none;background:transparent;border:0;border-bottom:1px solid var(--elx-rule2);padding:0 24px 2px 0;font-weight:650;color:var(--elx-ink);cursor:pointer;border-radius:0}
.elx-select select:hover{border-bottom-color:var(--elx-ink)}
.elx-select option{color:#0a101b;background:#fff}

.elx-intro{padding:clamp(72px,10vw,150px) 0}
.elx-introgrid{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(0,1fr);gap:clamp(32px,6vw,110px);align-items:start}
.elx-statement{font-size:clamp(1.55rem,1.05rem + 1.6vw,2.6rem);line-height:1.2;letter-spacing:-.028em;font-weight:520;text-wrap:pretty;max-width:30ch}
.elx-statewrap{display:grid;gap:clamp(36px,5vw,72px)}
.elx-rhythm{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;max-width:720px}
@media (max-width:640px){.elx-rhythm{grid-template-columns:minmax(0,1fr)}}
.elx-rhythm>div{box-shadow:inset 0 1px 0 var(--elx-rule2);padding-top:14px}
.elx-rhythm dt{font-size:13px;color:var(--elx-muted)}
.elx-rhythm dd{font-size:clamp(1.15rem,.95rem + .6vw,1.5rem);font-weight:620;letter-spacing:-.02em;margin-top:4px}
.elx-card{background:var(--elx-sheet);box-shadow:inset 0 0 0 1px var(--elx-rule);padding:0 0 26px}
.elx-cardimg{overflow:hidden;margin-bottom:22px}
.elx-card>*:not(.elx-cardimg){margin-left:24px;margin-right:24px}
.elx-card h3{font-size:22px;letter-spacing:-.02em;font-weight:620;margin-top:8px}
.elx-card p:not(.elx-label){font-size:15px;color:var(--elx-soft);margin-top:8px}
.elx-tile{display:block;width:100%;max-width:none;height:auto;object-fit:cover;background:#1a1f26}

.elx-uses{padding:0 0 clamp(80px,10vw,140px)}
.elx-useshead{display:flex;flex-direction:column;gap:26px;margin-bottom:34px}
.elx-tabs{display:flex;gap:4px 16px;margin-left:-8px;box-shadow:inset 0 -1px 0 var(--elx-rule);overflow-x:auto;scrollbar-width:none}
.elx-tabs::-webkit-scrollbar{display:none}
.elx-tabs button{position:relative;flex:none;white-space:nowrap;padding:12px 8px 14px;font-size:15.5px;font-weight:600;color:var(--elx-muted);transition:color .2s}
.elx-tabs button::after{content:"";position:absolute;left:8px;right:8px;bottom:0;height:2px;background:var(--elx-accent);transform:scaleX(0);transform-origin:left;transition:transform .25s var(--elx-ease)}
.elx-tabs button:hover{color:var(--elx-ink)}
.elx-tabs button:focus-visible{outline-offset:-2px}
.elx-tabs button[aria-selected="true"]{color:var(--elx-ink)}
.elx-tabs button[aria-selected="true"]::after{transform:none}
.elx-usegrid{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(0,1fr);gap:clamp(28px,4.5vw,72px);align-items:center}
.elx-compare{min-width:0}
.elx-cbox{position:relative;overflow:hidden;background:#11161d;touch-action:pan-y;cursor:ew-resize;user-select:none;-webkit-user-select:none}
.elx-cleft{position:absolute;left:0;top:0;right:0;bottom:0}
.elx-cline{position:absolute;top:0;bottom:0;width:1.5px;margin-left:-.75px;background:#fff;pointer-events:none}
.elx-handle{position:absolute;top:50%;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;background:var(--elx-accent);color:#120c03;display:grid;place-items:center;cursor:grab;box-shadow:0 8px 22px rgba(0,0,0,.28);transition:transform .16s var(--elx-ease)}
.elx-handle:active{cursor:grabbing;transform:scale(.94)}
.elx-brk{position:absolute;width:20px;height:20px;pointer-events:none;border:0 solid rgba(255,255,255,.9)}
.elx-brk-tl{left:12px;top:12px;border-top-width:1.5px;border-left-width:1.5px}
.elx-brk-br{right:12px;bottom:12px;border-bottom-width:1.5px;border-right-width:1.5px}
.elx-ccap{display:grid;grid-template-columns:auto 1fr auto;gap:16px;align-items:center;padding-top:14px;font-size:13.5px;font-weight:600}
.elx-ccap i{font-style:normal;color:var(--elx-accent-ink);font-size:11px}
.elx-cplace{text-align:center;font-size:12px;font-weight:400;color:var(--elx-muted)}
.elx-usecopy{animation:elx-rise .5s var(--elx-ease) both}
.elx-usecopy h3{font-size:clamp(1.6rem,1.05rem + 1.4vw,2.45rem);line-height:1.06;letter-spacing:-.03em;font-weight:620;text-wrap:balance}
.elx-usecopy p{font-size:17px;line-height:1.55;color:var(--elx-soft);margin-top:18px;max-width:46ch}
.elx-facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin:28px 0 30px;box-shadow:inset 0 1px 0 var(--elx-rule);padding-top:18px}
.elx-facts dt,.elx-specs dt{font-size:12.5px;color:var(--elx-muted)}
.elx-facts dd{font-size:16px;font-weight:650;margin-top:4px;letter-spacing:-.01em}

.elx-fleet{background:var(--elx-sheet);box-shadow:inset 0 1px 0 var(--elx-rule),inset 0 -1px 0 var(--elx-rule);padding:clamp(72px,9vw,130px) 0 clamp(56px,7vw,96px)}
.elx-fleetgrid{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:clamp(32px,5vw,88px);align-items:center}
.elx-plate{position:relative;background:var(--elx-bg);box-shadow:inset 0 0 0 1px var(--elx-rule);padding:clamp(16px,3vw,36px) clamp(16px,3vw,36px) 26px}
.elx-plate .elx-brk{border-color:var(--elx-rule2)}
.elx-craft{display:block;width:100%;height:auto;max-width:none;overflow:visible}
.elx-f1{fill:var(--elx-sheet);stroke:var(--elx-ink);stroke-width:1.05;stroke-linejoin:round}
.elx-f2{fill:var(--elx-face2);stroke:var(--elx-ink);stroke-width:1.05;stroke-linejoin:round}
.elx-f3{fill:var(--elx-face3);stroke:var(--elx-ink);stroke-width:1.05;stroke-linejoin:round}
.elx-f4{fill:var(--elx-panel);stroke:var(--elx-ink);stroke-width:1.05;stroke-linejoin:round}
.elx-f5{fill:var(--elx-ink);opacity:.88}
.elx-hair{fill:none;stroke:var(--elx-ink);stroke-width:.75;opacity:.55}
.elx-wl{fill:none;stroke:#9fb6dd;stroke-width:.7;opacity:.55}
.elx-dim{stroke-dasharray:2 3}
.elx-dimension polyline{fill:none;stroke:var(--elx-muted);stroke-width:.8}
.elx-callout polyline{fill:none;stroke:var(--elx-accent-ink);stroke-width:.9}
.elx-callout circle{fill:var(--elx-accent-ink)}
.elx-callout .elx-tagc{fill:var(--elx-bg);stroke:var(--elx-accent-ink);stroke-width:1}
.elx-callout text{font:600 11px var(--elx-monof);fill:var(--elx-ink)}
.elx-parts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 22px;margin-top:14px;counter-reset:elxp;font-size:14px;color:var(--elx-soft)}
.elx-parts li{counter-increment:elxp;display:flex;gap:10px;align-items:baseline}
.elx-parts li::before{content:counter(elxp);font:600 11px var(--elx-monof);color:var(--elx-accent-ink);min-width:14px}
.elx-craftcopy .elx-h2{margin-top:14px}
.elx-craftcopy .elx-body{margin-top:18px}
.elx-specs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 28px;margin:30px 0 32px}
.elx-specs>div{box-shadow:inset 0 1px 0 var(--elx-rule);padding:13px 0 14px}
.elx-specs dd{font-size:17px;font-weight:650;letter-spacing:-.01em;margin-top:3px}
.elx-rostertitle{font-size:18px;font-weight:650;letter-spacing:-.01em}
.elx-roster{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:0 22px;margin-top:18px}
.elx-roster:not([data-all]){display:none}
.elx-maphead{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:10px 28px;margin:clamp(56px,7vw,96px) 0 16px}
.elx-maphead .elx-rostertitle{margin:0}
.elx-legend{display:flex;flex-wrap:wrap;gap:6px 20px;font-size:13px;color:var(--elx-muted)}
.elx-legend li{display:flex;align-items:center;gap:8px}
.elx-legend i{width:18px;height:0;border-top:1.5px dashed var(--elx-soft)}
.elx-legend li[data-on] i{border-top-color:var(--elx-accent)}
.elx-legend .elx-legend-sun i{width:10px;height:10px;border:1.4px solid var(--elx-accent-ink);border-radius:50%}
.elx-map{position:relative;margin:0;box-shadow:inset 0 0 0 1px var(--elx-rule)}
.elx-mapsvg{display:block;width:100%;height:auto;max-width:none}
.elx-mapbg{fill:var(--elx-mapbg)}
.elx-night{fill:var(--elx-nightfill)}
.elx-grat{stroke:var(--elx-rule);stroke-width:1;vector-effect:non-scaling-stroke}
.elx-grat.elx-eq{stroke:var(--elx-rule2)}
.elx-tk-past{fill:none;stroke:var(--elx-muted);stroke-width:1;opacity:.4;vector-effect:non-scaling-stroke}
.elx-tk-next{fill:none;stroke:var(--elx-soft);stroke-width:1;stroke-dasharray:3 4;opacity:.75;vector-effect:non-scaling-stroke}
.elx-tk-next.elx-on{stroke:var(--elx-accent);stroke-width:1.5;opacity:1}
.elx-city circle{fill:var(--elx-soft)}
.elx-city text{font:500 11px var(--elx-monof);fill:var(--elx-muted);paint-order:stroke;stroke:var(--elx-mapbg);stroke-width:3px;stroke-linejoin:round}
.elx-city.elx-here circle{fill:var(--elx-accent-ink)}
.elx-city.elx-here .elx-ring{fill:none;stroke:var(--elx-accent-ink);stroke-width:1.2;vector-effect:non-scaling-stroke}
.elx-city.elx-here text{fill:var(--elx-ink);font-weight:700}
.elx-sunmark circle,.elx-sunmark line{fill:none;stroke:var(--elx-accent-ink);stroke-width:1.4;vector-effect:non-scaling-stroke}
.elx-mapsats{position:absolute;left:0;top:0;right:0;bottom:0}
.elx-msat{position:absolute;width:0;height:0}
.elx-msat button{position:absolute;left:-13px;top:-13px;width:26px;height:26px;display:grid;place-items:center;border-radius:50%}
.elx-msat i{width:6px;height:6px;background:var(--elx-ink);transform:rotate(45deg);transition:transform .16s var(--elx-ease)}
.elx-msat.elx-on i{width:9px;height:9px;background:var(--elx-accent);box-shadow:0 0 0 3px var(--elx-bg)}
.elx-msat button:hover i,.elx-msat button:focus-visible i{transform:rotate(45deg) scale(1.5)}
.elx-mtip{position:absolute;left:14px;top:10px;z-index:2;display:grid;gap:2px;padding:9px 12px;font-size:12.5px;white-space:nowrap;background:var(--elx-sheet);color:var(--elx-ink);box-shadow:inset 0 0 0 1px var(--elx-rule2),0 10px 24px rgba(0,0,0,.18);animation:elx-in .16s var(--elx-ease)}
.elx-msat.elx-left .elx-mtip{left:auto;right:14px}
.elx-mtip .elx-mono{color:var(--elx-muted)}
.elx-roster li{display:grid;gap:3px;padding:13px 0 15px;box-shadow:inset 0 1px 0 var(--elx-rule);font-size:12.5px}
.elx-roster b{font:600 13px var(--elx-monof)}
.elx-more{display:inline-flex;align-items:center;margin-top:16px;height:44px;padding:0 18px;font-size:14px;font-weight:650;box-shadow:inset 0 0 0 1px var(--elx-rule2)}
.elx-more:hover{background:var(--elx-ink);color:var(--elx-bg)}
.elx-roster .elx-mono{color:var(--elx-soft)}
.elx-state{display:flex;align-items:center;gap:7px;color:var(--elx-muted)}
.elx-state i{width:7px;height:7px;border-radius:50%;box-shadow:inset 0 0 0 1.2px var(--elx-muted)}
.elx-roster li[data-day] .elx-state i{background:var(--elx-accent);box-shadow:none}

.elx-archive{padding:clamp(80px,10vw,140px) 0 clamp(64px,8vw,110px)}
.elx-archhead{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:30px}
.elx-railbtns{display:flex;gap:8px}
.elx-railbtns button{width:46px;height:46px;display:grid;place-items:center;box-shadow:inset 0 0 0 1px var(--elx-rule2);color:var(--elx-ink);transition:background-color .2s,color .2s,opacity .2s}
.elx-railbtns button:hover:not(:disabled){background:var(--elx-ink);color:var(--elx-bg)}
.elx-railbtns button:disabled{opacity:.3;cursor:default}
.elx-rail{display:grid;grid-auto-flow:column;grid-auto-columns:clamp(260px,29vw,400px);gap:22px;overflow-x:auto;scroll-snap-type:x mandatory;padding:0 max(var(--elx-gut),calc(50% - 700px + var(--elx-gut))) 18px;scroll-padding:0 max(var(--elx-gut),calc(50% - 700px + var(--elx-gut)));scrollbar-width:thin}
.elx-story{scroll-snap-align:start;display:block;min-width:0}
.elx-storyimg{overflow:hidden;margin-bottom:16px}
.elx-storyimg .elx-tile{transition:transform .7s var(--elx-ease)}
.elx-story:hover .elx-storyimg .elx-tile{transform:scale(1.045)}
.elx-story h3{font-size:19px;line-height:1.28;letter-spacing:-.015em;font-weight:620;margin-top:8px;text-wrap:pretty}
.elx-story h3{background:linear-gradient(currentColor,currentColor) 0 100%/0 1px no-repeat;transition:background-size .35s var(--elx-ease);display:inline}
.elx-story:hover h3{background-size:100% 1px}

.elx-task{background:var(--elx-sheet);box-shadow:inset 0 1px 0 var(--elx-rule);padding:clamp(72px,9vw,130px) 0}
.elx-taskgrid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr);gap:clamp(32px,6vw,100px);align-items:start}
.elx-taskcopy .elx-body{margin-top:18px}
.elx-steps{margin-top:34px;counter-reset:elxs;display:grid;gap:0}
.elx-steps li{counter-increment:elxs;display:grid;grid-template-columns:40px 1fr;gap:2px 0;padding:16px 0;box-shadow:inset 0 1px 0 var(--elx-rule)}
.elx-steps li::before{content:counter(elxs);grid-row:span 2;font:600 13px var(--elx-monof);color:var(--elx-accent-ink);padding-top:2px}
.elx-steps b{font-size:16px;font-weight:650}
.elx-steps span{font-size:15px;color:var(--elx-muted)}
.elx-formwrap{background:var(--elx-bg);box-shadow:inset 0 0 0 1px var(--elx-rule);padding:clamp(20px,3vw,36px)}
.elx-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px 18px}
.elx-span2{grid-column:1 / -1}
.elx-field{display:grid;gap:7px;align-content:start}
.elx-field label{font-size:13.5px;font-weight:650}
.elx-field input,.elx-field select{width:100%;height:48px;padding:0 14px;background:var(--elx-sheet);border:1px solid var(--elx-rule2);border-radius:2px;color:var(--elx-ink);transition:border-color .2s,box-shadow .2s}
.elx-field input::placeholder{color:var(--elx-muted);opacity:1}
.elx-field input:hover,.elx-field select:hover{border-color:var(--elx-ink)}
.elx-field input:focus,.elx-field select:focus{outline:none;border-color:var(--elx-accent-ink);box-shadow:0 0 0 3px color-mix(in srgb,var(--elx-accent) 35%,transparent)}
.elx-field input[aria-invalid="true"]{border-color:var(--elx-err)}
.elx-field .elx-select{display:block}
.elx-field .elx-select::after{right:16px}
.elx-field .elx-select select{padding-right:40px;font-weight:500}
.elx-err{font-size:13px;color:var(--elx-err);font-weight:500}
.elx-earliest{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:6px 16px;padding:14px 0 2px;box-shadow:inset 0 1px 0 var(--elx-rule);font-family:var(--elx-monof);font-size:13.5px}
.elx-earliest .elx-label{font-family:var(--elx-sans)}
.elx-formfoot{display:flex;flex-wrap:wrap;align-items:center;gap:14px 20px;margin-top:4px}
.elx-done{display:grid;justify-items:start;align-content:center;gap:12px;min-height:440px;padding:20px 0;animation:elx-rise .5s var(--elx-ease) both}
.elx-done h3{font-size:26px;letter-spacing:-.025em;font-weight:620}
.elx-done p{color:var(--elx-soft);max-width:46ch}
.elx-done .elx-btn{margin-top:14px}
.elx-nowrap{white-space:nowrap}
.elx-summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 24px;width:100%;margin-top:8px}
.elx-summary>div{box-shadow:inset 0 1px 0 var(--elx-rule);padding:12px 0}
.elx-summary dt{font-size:12.5px;color:var(--elx-muted)}
.elx-summary dd{font-size:15.5px;font-weight:650;margin-top:3px}
.elx-done .elx-mark{color:var(--elx-ink)}

.elx-foot{background:var(--elx-navy);color:#c3cede}
.elx-band{position:relative;overflow:hidden}
.elx-band .elx-tile{width:max(100%,1000px);background:#8a6a48}
.elx-band::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,var(--elx-sheet) 0,rgba(6,20,41,0) 22%,rgba(6,20,41,0) 30%,var(--elx-navy) 100%)}
.elx-swath::after{background:linear-gradient(180deg,var(--elx-bg) 0,rgba(0,0,0,0) 28%,rgba(0,0,0,0) 72%,var(--elx-sheet) 100%)}
.elx-swath .elx-bandtag{top:auto;bottom:16px}
.elx-bandtag{position:absolute;left:var(--elx-gut);top:14px;z-index:1;font-size:11px;color:#fff;background:rgba(6,20,41,.6);padding:4px 7px}
.elx-footgrid{display:grid;grid-template-columns:minmax(0,1.6fr) repeat(4,minmax(0,1fr));gap:40px clamp(24px,3vw,48px);padding-top:44px;padding-bottom:56px}
.elx-footbrand .elx-brand{margin-bottom:30px}
.elx-news{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;max-width:min(400px,100%)}
.elx-footbrand,.elx-footcol{min-width:0}
.elx-news label{display:grid;gap:4px}
.elx-news label b{color:#fff;font-size:17px;font-weight:650}
.elx-news label span{font-size:14px;color:#a9b6c9}
.elx-newsrow{display:flex;gap:8px}
.elx-newsrow input{flex:1 1 0;width:100%;min-width:0;height:48px;padding:0 14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.22);border-radius:2px;color:#fff}
.elx-newsrow input::placeholder{color:#93a2b8}
.elx-newsrow input:focus{outline:none;border-color:var(--elx-accent)}
.elx-newsrow .elx-btn{height:48px}
.elx-newsok{color:#fff;font-size:14.5px}
.elx-foot .elx-err{color:#ff9c8e}
.elx-footcol h2{font-size:12px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:#fff;margin-bottom:16px}
.elx-footcol ul{display:grid;gap:10px}
.elx-footcol a{font-size:15px;color:#b6c3d5;transition:color .2s}
.elx-footcol a:hover{color:#fff;text-decoration:underline;text-underline-offset:4px}
.elx-legal{display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px 24px;padding-top:22px;padding-bottom:30px;box-shadow:inset 0 1px 0 rgba(255,255,255,.1);font-size:13px;color:#9aa8bc}
.elx-legal nav{display:flex;flex-wrap:wrap;gap:8px 22px}
.elx-legal a:hover{color:#fff}

@keyframes elx-rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
@keyframes elx-in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
@keyframes elx-ping{0%{transform:scale(.6);opacity:.9}70%{transform:scale(2.1);opacity:0}100%{transform:scale(2.1);opacity:0}}

@media (max-width:1100px){
.elx-mainnav,.elx-headcta{display:none}
.elx-menubtn{display:inline-flex}
.elx-usegrid,.elx-fleetgrid{grid-template-columns:minmax(0,1fr)}
.elx-roster{grid-template-columns:repeat(3,minmax(0,1fr))}
.elx-footgrid{grid-template-columns:repeat(4,minmax(0,1fr))}
.elx-footbrand{grid-column:1 / -1;display:grid;grid-template-columns:auto 1fr;gap:20px 60px;align-items:start}
}
@media (max-width:900px){
.elx-livegrid{grid-template-columns:repeat(2,minmax(0,1fr))}
.elx-cell{padding:26px 18px 28px}
.elx-cell:nth-child(odd){box-shadow:none;padding-left:0}
.elx-cell:nth-child(n+3){border-top:1px solid var(--elx-rule)}
.elx-introgrid,.elx-taskgrid{grid-template-columns:minmax(0,1fr)}
.elx-card{max-width:520px}
.elx-pillars{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none}
.elx-pillars::-webkit-scrollbar{display:none}
.elx-pillars li{flex:0 0 min(70vw,300px);scroll-snap-align:start}
.elx-pillars .elx-arrow{opacity:.7;transform:none}
}
@media (max-width:640px){
.elx-root{--elx-headh:64px}
.elx-util{display:none}
.elx-hero{min-height:clamp(600px,var(--elx-h),900px)}
.elx-herocopy{padding-top:calc(var(--elx-headh) + 30vh)}
.elx-hero h1{font-size:clamp(2.35rem,8.4vw + .4rem,3.2rem);max-width:12ch}
.elx-ctas .elx-btn{flex:1 1 auto}
.elx-big{font-size:clamp(1.7rem,7vw,2.2rem)}

.elx-sub{font-size:14px}
.elx-facts{grid-template-columns:repeat(2,minmax(0,1fr))}
.elx-ccap{grid-template-columns:1fr auto}
.elx-cplace{grid-column:1 / -1;grid-row:2;text-align:left}
.elx-specs{grid-template-columns:minmax(0,1fr)}
.elx-roster{grid-template-columns:repeat(2,minmax(0,1fr))}
.elx-city:not(.elx-here) text{display:none}
.elx-city text{font-size:30px}
.elx-legend{font-size:12px}
.elx-parts{grid-template-columns:minmax(0,1fr)}
.elx-form{grid-template-columns:minmax(0,1fr)}
.elx-rail{grid-auto-columns:78vw}
.elx-footgrid{grid-template-columns:repeat(2,minmax(0,1fr))}
.elx-footbrand{display:block}
.elx-newsrow{flex-direction:column}
.elx-newsrow input{flex:none;height:48px}
.elx-satcard{width:220px}
}
@media (prefers-reduced-motion:reduce){
.elx-root *,.elx-root *::before,.elx-root *::after{animation:none !important;transition:none !important}
}
`
