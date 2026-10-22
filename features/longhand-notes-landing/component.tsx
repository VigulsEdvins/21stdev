"use client"

// Longhand Notes Landing: a complete landing page for a handwritten-notes
// service, where robots write your cards with real pens. The page is drawn in
// one line-art language: ribbed tubes, coral motor housings, teal joints and
// coral dashed flight paths, on grey paper and white card.
//
// The robots really write. Every piece of handwriting on the page is set in a
// single-stroke plotter hand (three are built in) and drawn stroke by stroke by
// a two-link arm solved with inverse kinematics, so the pen tip follows the
// exact path a pen plotter would take, lifting between strokes:
//
// - Hero: the arm writes a welcome letter in an open envelope, waits, and
//   writes the next one. The "+" in the headline is drawn in coral.
// - Keys in, ink out: a working composer. Type into the phone and the arm
//   writes as you type, keeping what is already on the card and writing only
//   what changed. Pick the hand, the ink, the card and the pen pace; send it.
// - How it works, a card shop (covers open on hover; "Write on this card"
//   loads it into the composer), integration recipes with live merge fields,
//   a volume price estimator, handwritten customer notes, questions, and a
//   free-samples form.
//
// Everything is drawn here: the cards are SVG, the hands are embedded stroke
// data, the type is the system serif and sans. Nothing loads at runtime.
//
// Hands: EMS Allure, EMS Felix and EMS Elfin single-line fonts by Sheldon B.
// Michaels, SVG conversion by Windell H. Oskay (Evil Mad Scientist), SIL Open
// Font License 1.1. Re-encoded here as compact stroke data.
import * as React from "react"

export type LnhHandName = "script" | "casual" | "playful"
export type LnhInkName = "blue" | "black" | "plum"
export type LnhStock = "ivory" | "kraft" | "chalk"
export type LnhDesign = "hello" | "bloom" | "coast" | "kraft" | "congrats" | "birthday" | "sympathy" | "welcome"

export type LnhSubLink = { label: string; href?: string; note?: string }
export type LnhLink = { label: string; href?: string; items?: LnhSubLink[] }

export type LnhCard = {
  id: string
  name: string
  category: string
  /** One of the built-in cover designs. Ignored when `image` is set. */
  design?: LnhDesign
  /** Your own cover art (any URL). */
  image?: string
  stock: LnhStock
  /** Overrides the starting price shown under the card. */
  price?: number
  /** A few words for the inside of the card in the shop. */
  inside?: string
}

export type LnhRecipe = {
  id: string
  icon: "crm" | "store" | "star" | "sheet" | "api" | "heart"
  source: string
  trigger: string
  detail: string
  /** The note. Wrap merge fields in braces: {first_name}. */
  note: string
  /** Sample values that fill the merge fields in the preview. */
  sample: { [field: string]: string }
  sign: string
}

export type LnhProduct = { id: string; name: string; size: string; base: number }
export type LnhTier = { min: number; off: number }
export type LnhQuote = { quote: string; name: string; role: string }
export type LnhFaq = { q: string; a: string }
export type LnhStep = { title: string; text: string }

export type LnhNote = {
  greeting: string
  message: string
  signoff: string
  hand: LnhHandName
  ink: LnhInkName | "white"
  card: LnhCard
}

export type LnhPaletteName = "studio" | "postal" | "fountain"
export type LnhPalette = { accent: string; second: string; onAccent?: string }

export interface LonghandNotesLandingProps {
  brand?: string
  links?: LnhLink[]
  signIn?: { label: string; href?: string } | null
  signUp?: { label: string; href?: string }
  hero?: {
    /** "\n" breaks the line; " + " becomes the drawn coral plus. */
    title?: string
    cta?: string
    ctaHref?: string
    /** "{price}" is replaced with the lowest card price. */
    note?: string
    letterhead?: string
    /** Printed on the envelope after the letterhead. */
    address?: string
    /** Finished, addressed envelopes stacked beside the letter; "\n" breaks the address lines. */
    envelopes?: string[]
    /** The card propped in front: one of the built-in designs. */
    card?: LnhDesign
    /** The hand and the ink the hero arm writes in. */
    hand?: LnhHandName
    ink?: LnhInkName
    /** The notes the hero arm writes, one after another. */
    letters?: { greeting: string; body: string; sign: string }[]
  }
  composer?: {
    eyebrow?: string
    title?: string
    text?: string
    greeting?: string
    message?: string
    signoff?: string
    hand?: LnhHandName
    ink?: LnhInkName
    maxLength?: number
    send?: string
  } | null
  steps?: { title?: string; items?: LnhStep[] } | null
  cards?: { title?: string; text?: string; items?: LnhCard[] } | null
  integrations?: { title?: string; text?: string; items?: LnhRecipe[] } | null
  pricing?: {
    title?: string
    text?: string
    products?: LnhProduct[]
    tiers?: LnhTier[]
    postage?: number
  } | null
  quotes?: { title?: string; items?: LnhQuote[] } | null
  faq?: { title?: string; items?: LnhFaq[] } | null
  samples?: { title?: string; script?: string; text?: string; button?: string; done?: string } | null
  footer?: { columns?: { title: string; links: LnhSubLink[] }[]; note?: string } | null
  currency?: string
  palette?: LnhPaletteName | LnhPalette
  theme?: "system" | "light" | "dark"
  themeToggle?: boolean
  /** Return or resolve `false`, or throw, to show an error. Without it, sending is simulated. */
  onSend?: (note: LnhNote) => unknown
  /** Same contract. */
  onRequestSamples?: (email: string, company: string) => unknown
  onStart?: () => void
  /** A definite length for the hero floor, so it survives any host layout. */
  height?: string
  className?: string
}

// #region content
const PALETTES = {
  studio: { accent: "#ef5a3c", second: "#3ec0bb", onAccent: "#ffffff" },
  postal: { accent: "#d63a2f", second: "#f1b434", onAccent: "#ffffff" },
  fountain: { accent: "#2f5fe0", second: "#ff8f5a", onAccent: "#ffffff" },
}

const INKS = { blue: "#2340b0", black: "#1d1d1f", plum: "#5b2c83", white: "#f4f2ea" }

const DEFAULT_LINKS = [
  { label: "How it works", href: "#how" },
  { label: "Try it", href: "#write" },
  {
    label: "Integrations",
    href: "#integrations",
    items: [
      { label: "CRM", href: "#integrations", note: "Thank a customer when a deal closes" },
      { label: "Storefront", href: "#integrations", note: "A note in every first order" },
      { label: "Spreadsheet", href: "#integrations", note: "Upload a list, merge the names" },
      { label: "API", href: "#integrations", note: "One call per card" },
    ],
  },
  { label: "Card shop", href: "#cards" },
  { label: "Pricing", href: "#pricing" },
  {
    label: "Company",
    href: "#stories",
    items: [
      { label: "Customer notes", href: "#stories" },
      { label: "Questions", href: "#faq" },
      { label: "Free samples", href: "#samples" },
    ],
  },
]

const DEFAULT_HERO = {
  title: "Typed by you.\nPenned + posted.",
  cta: "Write a note",
  ctaHref: "#write",
  note: "Real pens, real card, real stamps.\nFrom {price} a note, in the mail tomorrow.",
  letterhead: "OAK & ORRIS",
  address: "9 MILL LANE",
  envelopes: ["Odile Laurent\n18 Rue des Lilas\nLyon", "Tomas Reyes\n402 Cedar Row\nPortland, OR", "The Abara family\n7 Quay Street\nGalway"],
  card: "kraft" as LnhDesign,
  hand: "casual" as LnhHandName,
  ink: "blue" as LnhInkName,
  letters: [
    {
      greeting: "Dear Odile,",
      body: "The linen arrived this morning and the whole workshop came over to touch it. Thank you for weaving it with such care. We will send photos of the first quilt.",
      sign: "Ravi, Oak & Orris",
    },
    {
      greeting: "Tomas!",
      body: "Five years of Saturday orders. That deserves more than an email, so here is a real card, and a little something in the next box.",
      sign: "Ravi",
    },
    {
      greeting: "Hello Abara family,",
      body: "Welcome to the neighbourhood. Our door is two streets over; come by for tea and a tour whenever the boxes are unpacked.",
      sign: "Ravi & the team",
    },
  ],
}

const DEFAULT_COMPOSER = {
  eyebrow: "Keys in,",
  title: "ink out.",
  text: "Type below and watch the arm write it as you go, with a real pen on real card. Change the hand, the ink or the card and it starts a fresh one.",
  greeting: "Dear Odile,",
  message: "The tulip bulbs came up all at once and the whole street is jealous. Thank you for thinking of us!",
  signoff: "With love, Ravi",
  hand: "script" as LnhHandName,
  ink: "blue" as LnhInkName,
  maxLength: 220,
  send: "Send this note",
}

const DEFAULT_STEPS = [
  { title: "You type it", text: "Write once in the app, upload a list, or let your CRM trigger it. Merge fields fill each name." },
  { title: "A robot writes it", text: "Real pens on real card stock, at a human pace, with the small variations a hand makes." },
  { title: "We stamp and mail it", text: "Addressed by hand, stamped first class and posted the next business day." },
]

const DEFAULT_CARDS = [
  { id: "hello", name: "Chalk Hello", category: "Business", design: "hello" as LnhDesign, stock: "chalk" as LnhStock, inside: "So good to meet you." },
  { id: "bloom", name: "Thank You Bloom", category: "Thank you", design: "bloom" as LnhDesign, stock: "ivory" as LnhStock, inside: "You made our week." },
  { id: "coast", name: "Coastline", category: "Business", design: "coast" as LnhDesign, stock: "ivory" as LnhStock, inside: "Thanks for the call." },
  { id: "kraft", name: "Kraft Postmark", category: "Thank you", design: "kraft" as LnhDesign, stock: "kraft" as LnhStock, inside: "A little note for you." },
  { id: "congrats", name: "Big Congrats", category: "Celebration", design: "congrats" as LnhDesign, stock: "ivory" as LnhStock, inside: "You did it!" },
  { id: "birthday", name: "Marigold Birthday", category: "Celebration", design: "birthday" as LnhDesign, stock: "ivory" as LnhStock, inside: "Another lap around the sun." },
  { id: "sympathy", name: "Quiet Stem", category: "Sympathy", design: "sympathy" as LnhDesign, stock: "ivory" as LnhStock, inside: "Thinking of you." },
  { id: "welcome", name: "Welcome Sun", category: "Business", design: "welcome" as LnhDesign, stock: "ivory" as LnhStock, inside: "Welcome aboard!" },
]

const DEFAULT_RECIPES = [
  {
    id: "crm",
    icon: "crm" as const,
    source: "Your CRM",
    trigger: "A deal closes",
    detail: "Written the same day, mailed within 24 hours.",
    note: "Hi {first_name}, thank you for trusting us with {company}. We are so glad to be working together.",
    sample: { first_name: "Jordan", company: "Harbor & Pine" },
    sign: "Maya",
  },
  {
    id: "store",
    icon: "store" as const,
    source: "Your storefront",
    trigger: "A first order ships",
    detail: "The card goes in the box, or by post the next day.",
    note: "Hi {first_name}! Thank you for your first order of {product}. We packed it by hand and hope you love it.",
    sample: { first_name: "Ava", product: "the linen apron" },
    sign: "The Fennel team",
  },
  {
    id: "star",
    icon: "star" as const,
    source: "Your reviews",
    trigger: "A five-star review lands",
    detail: "Thank the reviewer in their own words.",
    note: "Dear {first_name}, you said we {quote}. That made our week. Thank you for telling the world.",
    sample: { first_name: "Sam", quote: "fixed it in a day" },
    sign: "Rae, owner",
  },
  {
    id: "sheet",
    icon: "sheet" as const,
    source: "A spreadsheet",
    trigger: "You upload a list",
    detail: "Up to 10,000 rows. Preview every card first.",
    note: "Dear {first_name}, thank you for supporting {cause} this year. Your gift fed {count} families.",
    sample: { first_name: "Helen", cause: "Riverbend Food Bank", count: "40" },
    sign: "Priya",
  },
  {
    id: "api",
    icon: "api" as const,
    source: "The API",
    trigger: "You make one call",
    detail: "POST /v1/notes with a template, a hand and an address.",
    note: "Hi {first_name}, your {plan} plan renews next week. Thank you for a wonderful first year with us.",
    sample: { first_name: "Leo", plan: "Studio" },
    sign: "Ines",
  },
]

const DEFAULT_PRODUCTS = [
  { id: "flat", name: "Flat card", size: "5 x 7 in", base: 3.4 },
  { id: "folded", name: "Folded card", size: "5 x 7 in, folded", base: 4.1 },
  { id: "letter", name: "Letter", size: "8.5 x 11 in, in envelope", base: 4.9 },
]

const DEFAULT_TIERS = [
  { min: 1, off: 0 },
  { min: 50, off: 0.1 },
  { min: 250, off: 0.18 },
  { min: 1000, off: 0.25 },
]

const DEFAULT_QUOTES = [
  { quote: "Our reply rate tripled the month we switched to handwritten notes. People call just to say thanks for the card.", name: "Dana Whitfield", role: "Head of Sales, Brightline Realty" },
  { quote: "A note goes in every first order. Repeat purchases are up a third, and the cards end up on fridges, not in bins.", name: "Owen Park", role: "Founder, Field & Fennel" },
  { quote: "Four hundred donor thank-yous used to take us two weeks. Now it is an upload and a coffee.", name: "Priya Raman", role: "Development Director, Riverbend" },
  { quote: "Nobody believes a robot wrote it. Two of my clients have framed theirs.", name: "Marcus Bell", role: "Independent Financial Advisor" },
]

const DEFAULT_FAQ = [
  { q: "Is it really written with a pen?", a: "Yes. Every note is written by a robot holding a real ballpoint or gel pen, on real card stock. The ink presses into the paper, and it smudges if you lick your thumb." },
  { q: "Can the notes be in my own handwriting?", a: "On the Business plan we digitise your hand from a one-page sample sheet, so every card is written in your own letters, loops and all." },
  { q: "How fast do notes go out?", a: "Orders placed before 2 pm are written and posted the next business day, stamped first class. Most arrive in three to five days." },
  { q: "Can I send hundreds at once?", a: "Upload a spreadsheet of names and addresses, add merge fields like first name or company, and preview every single card before it is written." },
  { q: "What does it cost?", a: "From the lowest volume price per card, with postage on top. The estimator shows the exact price for your order, and there are no subscriptions required." },
  { q: "Do you connect to my CRM or store?", a: "Yes. Trigger a note when a deal closes, an order ships or a review lands, or call the API directly from your own product." },
]

const DEFAULT_SAMPLES = {
  title: "Hold one in your hand.",
  script: "Thank you",
  text: "We will post you three sample cards, written by the robots, so you can see the ink for yourself. Free, no card needed.",
  button: "Send my samples",
  done: "On their way. Check your mailbox in a few days.",
}

const DEFAULT_FOOTER = {
  columns: [
    { title: "Product", links: [{ label: "Features", href: "#write" }, { label: "Cards", href: "#cards" }, { label: "Integrations", href: "#integrations" }, { label: "Pricing", href: "#pricing" }] },
    { title: "Company", links: [{ label: "Customer notes", href: "#stories" }, { label: "Careers", href: "#" }, { label: "Press", href: "#" }] },
    { title: "Help", links: [{ label: "Questions", href: "#faq" }, { label: "Free samples", href: "#samples" }, { label: "Contact", href: "#" }] },
  ],
  note: "The robots hold the pens. You keep the credit.",
}
// #endregion content


// #region glyphs
/** Single-stroke hands, ASCII 32 to 126. See the header for credits; decodeGlyph explains the encoding. */
const HANDS = {
  script: [
    "hf", "ha-9hv9imUMD9fHO9fb-X9faZY", "hM-29iJa9fc-9gm9gkZ9fb",
    "jo-9hn9i69fD9dQ-9iD9iu9fG9dR-9el9hs9i2f-9c19e69i5e",
    "iU-9hd9hlxtmvasTjHe9fhWLOWQdWfS9gm9fUlSXVQaEiYh-9hc9iFXX9fX9e89fU9ep",
    "iJ-9gv9iiNXRPeKnVtgqpmqftalXivY9gjgumOH9fO9e39fZ9e_-9g_9guSMdMoVpetpmpg1XlPfTW",
    "jP-9iX9ilWbXRaVeU-j3VpQlGbKXWJlKpLvM9fIYGLTGmJuQ4Z8h5l0qtwnwhucoZs-57eXWV9fhLFTITTMfVlT", "gr-29iKa9fa",
    "hw-9h99ir9fMC9fc9fgL9fgS9fYd9feiBmO", "ia-9hd9irs9fgd9fQN9fND9faDJFSHW",
    "i_-9g79iXgd9gn9er-s9hZ9e99eq-9hc9gq9eSb", "i3-39g99h6e-9fa9gv9fR9eY", "g1-4sjWG9fd", "hv-9go9g79g5g",
    "g4-9gkuaX", "iN-9h59ik9fG9e19fh9fVE9fY", "im-9h19iSVkIfRYENQQSLV9fhcFoFwSyY0i4s22s5m7e2YyRqRoQiMf",
    "hf-9gr9hx0wsuotle9fQ9eTVCbO-9feXtkuewfye", "iw-9gy9h7dgen1vzl3h3YqWlLWKLJEJJPHQIRSXZZSWemkmoivdvYpW4U5dtlpnil",
    "im-9g89h9ivuq0kwfyZpPfOZULO9fbWRabgclxd7YrZmTgJZOPONSLW9ffZMhTlXrgoij",
    "iM-9g9ck4r9gm39g2z9gr9ffD9ffE9feJNQUP1p9grdxaxeymnlll",
    "ih-9hQ9iYF9fbQGsm1mxfwauVkPeOYMNJLSGUHaLeOhSkXqbqjl-9hK9hz9hJiyc",
    "iX-9iK9h_fvWqMhBZAGMIQAX9fhgHrOxYyetlwsquk2awQoMgObTU", "h9-69h_nzto6f9gga9ggcoj9fT9fQ9fc9fTEAPDac",
    "iU-9hg9imBRMLgLkRuWvexYqMdJVRFNIRJcLgPlbypz4x9hS9gsspixYsQkDd",
    "iX-9hc9hSSVLcKkVre2p2vttm4iyXsMhLYBXJOFLMLPQXNaQeQpbnew", "g--9gx9g_bZ-T9fWbY", "g4-9gv9g_aZ-M9fVjZdZaXNH",
    "hx-9hi9iM9e39e559fcpM", "ii-9gv9hQ9hgg-9eV9fRpi9had", "h2-9g_9iLxBuO9ez9e2",
    "iN-9gj9iMhpjj9giw4dsUmHWJTOPSSXNQWTbW-L9fbZY",
    "jg-9iX9iBHn9ffRGMOMWOdQkWoati9gk9gi49gfjeSGZNcJlWwfyvw4n0g5V1FuAh9ffa9fcP9ffEKEQ9fZhCmL1L9ggV9gmf9goo9gk2wylsgrcv",
    "kJ-coiQtU0b8p9gh489gf9gi9gnw4x29gg9gjjgJ9feK9fIT9fYeHkLpa1qxxpr-9ceZf0nsylxf9gvU9hLV0elimi",
    "jX-29hSMoZrj11w9g129g3m9gldzWoSdNXURU9feT9fVY7I0LnIaISPMSHcOeQjXsaqBKbko9gf9gi9hBq4qqthne",
    "it-9hK9hb5g9gfv00pyZwLm9fRS9fgI9fe9fZM9fdX9fbqD9ggQ9goi9ggr8xwx",
    "kC-9ij9iLDSMEaNN9fbJ9fTURXgWveyh2iO9gkD9giT9g2m9gi065s9gmb9goN29fhr9fJl9fPV9faQENPIbLpOtX",
    "jV-9im9iRfLK9goIsFbLIfHnFyDtbflUiDd9fTX9fdETDqF9ggP9glf9gtl9gks6xqvgkdq",
    "ic-9iB9iQKYNMVGQIP9fhRGdRiYqgpt-9fP9hMSmWwr63u9gzo9gpa8a9godnjafMLZSeS-9eG9fOVZ9hep",
    "ju-9jO9igTsSkCe9fXT9fgNAHMGSJZIhIqO0R5b9glo5w80rrkltojjWcQHH9eyE9fWE9fcERHcTnexny349ghz6t9gfo7k",
    "jr-9hJ9iHhe2rz5UC-eeA9etC9fOF9fgERPeMldk-9kL9i8JVTLF9fGS9fhWEhNlWsevqwxor-9cnic1qt9gnj9gzX9gsV9gkawijh",
    "iJ-9h99itI9e6L9fRQGPLRYMcIfalmjpWqc9hTf-9fK9hoQwlywt8j9gzcuX",
    "is-9ih9izXXSF9fd9egF9fXNLBPHkYyr49gi9gh1t8r3l2j-9ennRnd1ru9ghp9ggg6aqZ",
    "i--9gh9iF9gfty59fT9eFTLMFOJFNIcTiVs-9kG9i99fQB9fS9fb9fc9fcHC-9gm9g4s9fKz9fb1SvhlqXp",
    "ia-9g69ggge9gux9gp9gh39gsi6-feVyNiEUICO9fO9ff9eiUPWUab-d9gyBXhl7U9gqB9ghL9glP9gqhvqjmeu",
    "lS-9g49iGynomnplpjg9fd9egJ9fWL9fgOPOZVpiu79gj9gm9gq9gy9gv9gfwxiwXnHa9fPZ9fgWCkfw89gs9hCx5vqrdjXhSUCK9fVYLeKoL2h41ns",
    "jp-9fHViQtWzi4w19gk09gp49hIm3g9etj9fdv9fatQuawn09ggs9gln9gxg7btYtxEsW-9dAP3qmnnu-9fW9fb3qmnnu",
    "jV-n9hSr9gp359gly5n5d3azNpFhMa9ffS9fhHAHKGT9fZcCrO9ggh9gqs4z39gmxoepd",
    "ig-9h-9iQOaRWUSaOYRPFSHXLbWdWiWmhop-9fc9hMPnavjy0v3q1l9ggi9grb7TuRgMVJQPKU9feT9fNVJh",
    "jI-9iv9izxVoMd9fcR9fUC9fXBIJUCZ9fhjFsP7e9guu9go34yr0q2k1axSnKf9fgZCNBIIMS9fXQTifjtd3S9g09fd9ghL9gpX-de9gjkpsfldv",
    "ig-9h99iPKcOOaPSEJ9feRBbSiWoilk-9fb9hRRrdxlu5x7n9ghk9gmd6b3OoKYICJAT9fhVGd9ffhdk6JvB89fe9ggG9giP8etnlofm",
    "ix-9it9iRloeqQo9fca9fWQJLdL3T9gmS3QpPcRVRHL9faP9fNTEiVocymxurwn4m",
    "iL-s9hfSpbxo1xs0l0i9gtd9grY9gqerhViKCcUcQiZ-9fK5LWPO9fa9e8P9feeTjYmkno",
    "io-g9h32purutimmeME9fZ9eraEjJwY2m8z9go9gm79gkz9ggo3ctUkSZRXSKVEW9fdV9fVZ9fdeEiJkUnalemh",
    "i4-r9hyRwkzqn7j7g0exX-9fewf9ffVEUMSAS9fhZIeIpX0e9gfv9gh9gf9gk9gv9gq9hArupmplie",
    "ku-v9hvWmXvow2q8i9ggdvblb-MsXBPHD9fb9fg9fMULbPgTiZmbrgzm2s9gq9gj1329gglwgtctVabOfHdBk9fhpJsR0Vugqju2p2k3gub9ggWzNqMjTdYZ",
    "jK-v9hyRnbujuyp1kwg6btcpb-OnY9fdi9fbj9fgs9fewGtVznwtoq-V9iGJC9fH9e2BBDDDKEM9ffTHhRjYodj",
    "id-l9h51oxtsukihfQCI9fYL9fXbLdKmPxewn41vx9gj9gxr2kxptrlpfLSRQE9ejM9fLSEPFRMOPJQKbVhXrfrluwy219ggv9g8zle",
    "id-9gk9iLcsprxl9gfg8c2a9gjTrinjhnWfTYUV9fhD9fd9fd9fa9fULLAJRXVcZkij9ggS3L9giJ9ghN9goexnmwbs-9d89hfdZ9hgj",
    "iE-9iP9ij9fge9fh9fS9fd9fGJ9fYXO9gie", "hf-p9ij49fN9go9eX", "iA-9hr9ik9ggcL9fVB9fOJ9fgH9fe9feg",
    "jG-9gv9im9gw34E", "ix-XV9iwe", "hm-w9iD9ghK", "iE-9h89guURSRLSPbXphyo9ghZWFFDIIVTqg0146wzkyehb",
    "ho-W9gu9gp9gk3yyvz5j1TpIUIBF9fNP9fZc9ffgZi1y37w0jlUfTUNUOFKRZ9fbX", "hX-9g99hNdpUhFVBAWVYPfTjT4c9ghoyvqt",
    "hf-9hS9hOYpThDWEMJIXNgQvVvq2z346z9gk89gi9gikxeoRhKVSRMDRFG9fMT9fbaClRpanh",
    "hX-v9gr9glxntbpPfBNSVRPWRdRjTzV9gjn41oq", "hU-D9elqpv9g429g_29g19gg9g-1yqksYaGF9fZB9fhAFQXHcfk9gtd3h",
    "h1-9hN9hYCe9fgO9fh9fhYRjQoV6q9gx9g0me9fZ9em9fg9fCQSRXTcRnj39gr9gltp9gs650ww",
    "iM-W9gu9gk9gh9g69gq48j3MiMQNLL9ffK9fbI9e79gt9g32uojkYbRSLWDkQvetpwups", "g--W9guvrk1G9fDiPwaytrtms-H9hJXV",
    "hB-W9gu34nkgb9fQ9eRH9fXMJPYPhYrlu549gu9gf9gf12xxx-Y9hLVUja",
    "hZ-W9guuvuz-Yj0e6w57tzhvTmIWMKA9fJD9fAU9fgpo0846xtqf-9fOFq9fNw9fg4Ouellfjdm",
    "hB-Y9gs709gl9gp9gn9g7apNhNTG9fcD9fQN9fdYBmPudxmxynr",
    "is-W9guywluC9e3wx9gh9glusqlkffXbVI9fW9gx9gm0mTPS9fehPta0q27", "iR-9gl9hSD9e09gk9gp01uopiiYOBUGeRnWtguptunr",
    "hi-9gx9hURlLSLJWMaJvN0mzwq2goenZe-R9fhiPmXofonuw", "hZ-k9haG9e0E9fCR9fZXZ9gp9hlqY9ggr9gfwr1gwUqIXNTG9fgNB",
    "iI-9hR9hUFk9feN9fhCYPgRjUvdzrvy9gg9gg59ghRcB9exB9e2b9fcmQ0emqh5b9gjW9gkwc1rusmq",
    "hc-W9guv489gsDMeXhc9gydB9feOBiL1f54or", "hM-W9guomlpmvqv9ghrpgrbgWcWaa-9e7IjT0SoSdSTRMTSZQdbhenjj",
    "hJ-W9guromntx49gsWf9fU9elaJlTxf2zvw-9fM9gp9g0g", "h8-q9hNNHWHdNqX0k9gl9gvu6mcD9fTbCrXui1yru",
    "hQ-W9gu01indkWjVe-oZb9fXXIeL9gg9gt262yzrpb", "iL-v9hXKATDcRhVqbtjuw79gtldPCcHlRsa6u59gfr5esYsRh",
    "h6-W9gu19gfvhiTiMp9fXvXvlsttz-Q9gpVd9feDBFB9fgLDaWZR",
    "h6-09hOJKVTaQdSiVqasi5449gfstmdH9fQH9fFL9ffKBQRDfWqp15z9gj39gjx9gk7qt",
    "iK-n9gzqwtswg9gqTukgjYiVZ9es9eyQaalmmqe9gmJ2dvqz0rv", "h6-9hs9in9ffYNFdFUPQaNduVlRWNSSUInLoaqc", "hK-9gh9ird9dO",
    "iM-9hd9ipxbnVbPUQO9fgrZucDURUZSbJVNGGUcHd", "h7-9go9h0nnre9giRon",
  ],
  casual: [
    "hf", "h5-9hm9i-Z9fUM9erWL-ZGWWlUmnXn", "h3-9gv9jET9fW-9gz9gsV9fS", "i2-9g_Xy9iR-9goeL9du-9go9gx9eYf-e9g49hte",
    "h0-9hN9hsghJei7aDMZUVbTnPpTrOnPeTYVTZVda9fei9giPeTj",
    "jd-9gki9gn9gu9gt9g79gy9hG-9eUbMVUObNkMrUthztkwduXpXkPf-9hd9ecLTTMdNjNuXzjstlxZwToOh",
    "jI-9hm5MNTXIkQxZ8i9gjt9gl033qqahSWQQSQU9feNym0h9gge8fsd9fafVAaJcHjKnRkawty149gg", "hV-9g19jHU9fS",
    "iH-9hn9i6DAQDT9fbc9fYjCnKyI", "h9-9gv9i5xGqBh9ffY9fZR9fdPKHH", "iT-9hD9hot9hF-9fW9fM9hE9gj-9fGk9gv9fU",
    "i0-9gh9hJ9hre-9fL9g1e9eU", "hk-9gwfSqmoqRXNSM", "iA-9gg9hJ9gjf5k", "hk-9gv2VVnUnmVp", "iK-9hr9i69fc9ea9fZ9eh",
    "ie-9hQ9hzCTOGWHhDoJ1Y6px1m7c7SuQiTe", "hu-89hc9gg2N9eP", "iJ-9gf9hlynzitWiMXHLIHIIMze9glgodkfpl",
    "iG-79hjzp1foVjOYORSPTvdqVjQcOWRQRKcKhOk", "iO-9hF9fh09iSLGM9ffGBOI9g8ezgvi", "iS-yK7U2fwrm2dyTqLjAVp9hDnm9gwd",
    "iX-9gx9hFumwhtXkSgLYNRNKYJjTqX1i5p6v20t0kxc", "iF-9gvDs9gxx9gr19gs9fcd9fdi",
    "iV-9hBjImXnbup29gs9gktyhwRpJbOVWPnJ9ggCtNhLULQVMc", "iX-7K5i2suxl4i0c1WuMpEZNPWJhKqQ0bqhnl",
    "hq-9gz9hvVTnUonUq-W9emUVoVmmWo", "hq-9gy9htVVnVmmWo-Y9eUSqonoTZQOJ", "jC-9iM9ho9fPK9fWF9g29fg9gqK",
    "iz-9gn9hP9hpe-9eN9fS9hre", "i1-9glm9gu09gw69fY39fOz", "iM-9gyyVVpTmmUq-Z2bxlwwxxvrwl0buTpLdPV",
    "jW-9i3tGLAT9fYi9feyM7g9gxr7139ggt9gsf5Qu9fhb9fdNDIRGct9hKSDQKIOTYe1l6uuxhvc",
    "jA-jgzeqkrq9hR9iS9fUeETONYNdL-9hg9hAb9eh9fNe9gzee9fZiLlUldum",
    "iv-y9hWj6p2xv2o3f0czUjMbRVOQVSbZexbvVmPcJVMNQKW9fNdXbqsox09iA", "iU-9iI9igHl9fcTGBQBXDfFrDrQ0bsmyw",
    "iu-59hYh7w82s2k8d3UvEg9fhX9fgQFLIKUMa9fafZconpy29iC",
    "ip-x9hlj9ghmrrpvl9hYe9fAeV9fca9ff9g3e9fIeZ9feZERDVXpk9hJdto", "ii-9ggg0frmnvp9hD9gze9fNeq9hH9g_e9e4eJbQWSTWMfH",
    "iX-9iP9im9fhjCXEJOFRCbDi9fgrKxWyjwtpq-J9g59gheYMV9fIYKUMVRVV9gye",
    "jH-o9hkdzmxqttmsh5ejgYYXEQ9ecWMUSSaOf-9h89ij9gjeXcW9fea9fd9ese9hTeW9fMaRbWXVUUjh9ghewq",
    "hy-l9hkeznysuvn9gmfZdX9fhV9fRY9fZaLXSPMmk9gnesp", "hx-VDvTzb0tp219iViqloab9fedITSNaReH",
    "jF-r9hle2t5yswf4eabT9fcX9fGW9fSWRVWRcPf-9iY9igPhPbHORGaLeM49fR9gq9fE", "iI-9h09igMnMaMPVMR9ecYTKMqjvc0P4M5Szdqp",
    "j3-x9hlg2p2uqvj1e6d-9eS9ddzexomo9g69iPkcd9dpw9gmy9gux9gkowwubLZ9fId9fXh9fRyr",
    "i2-u9hmh2n0tsxi9ghe-9e59dgxeplos29iLmes9fX9gl9ePaUnuk0u9hbhxluihUbDe",
    "iB-9g3kSiVmR2d9gfm9gfq1uwsrxmuVsFh9ffZDUGMHOSMX",
    "iJ-j9hci9ghuz4uzi1f2ZuSjJWJMNSbUe-Q9hOVEY9fVS9fAaSXTQVmi9glfsl",
    "iY-9go9g6SpW5m7qwwtzkugxSpKgIaBUJIFNQNUNaBejg9gia9gmKuZyhun",
    "ir-9hZtPVAgXZnoqwz9h2jv-9e39ezg1p4vuynzhwe3asVmMbNTPRVSbOe19fZ9gf9fS1B", "h--tqyV9gfgrpntixav9fY9g2Zujwsnujwcwa",
    "ia-n9hmeymzrstm9hne9fGeXDX9fHW9fUUKXWTXnh9gmfro",
    "jL-n9hkezmysvrl9gsfadT9ffT9egjHnXretov239gsu9hOiiaaL9elb9fegNmTwbno",
    "ix-i9hkh1o2wrxkubnOkEhAf9fFdE9gq9hO29gwp4akNe",
    "jz-n9hli1p20txhqYoMiGe9eodI9gk9hD9gg9hMpmVSbAf9fVm9e909gpv9gju9gjm2fsakPe",
    "jJ-nk1etlyw19gg9gj9g6x9gfopmhrepa-9dh9fNfvmypswiqfnTkS09epu9fXnUmaqjuq",
    "iv-o9hyi0nxppxeoUoCv9fBnD-9go9h8wehXWL9e49d9HBQURdEt",
    "ix-9gg9h6etmynoyi9gjVvbueqlPP9e99eqJG9fhFjfydwU9gxAzZrgsv", "iG-9hv9i79fceC9cy9glf", "iU-9gj9i39gl9eJ59e1",
    "iE-9gz9i79gieD9c09fdc", "jB-9gj9hN9g89hN9g19ez", "i3-9gjY9h0e", "iE-9gq9isuYpVtN",
    "hn-9hE9hqCgKVQFZ9fgeFgRtt08r0t9ggN9e3bDuo59giqu", "hf-9g_9i-JcKNVJN9d1hUug3vr6j3fzdvIJI9fgO9fe",
    "hN-9g89htUjNbMKR9fgdLfMkRpTwvyzy6", "hn-9h39i8LeNUUNYGY9fTB9fMPINPb7i9gjn0mpqkriqckYX9fAX9fcws9gm9gw",
    "hJ-f9g2vp0zlphqZjUeNTSMWDbJiNnRmW56vyqv", "g6-9fe9fVsctkstkxs9hxKe9g1g9ffdh1i2qzppshub",
    "hU-O9fW3euippn0s9hyDfRXRPYHY9ffeSgOsp9gh9gtu9gn", "hj-9g-9i-NePXNIW9fJV9e_Y9fdq7w9gfx4stkghQM9eycN1y15pv",
    "gx-V9hgrqkhT9e-ZHeLxvtu06-9ff9hfeRbb", "gg-9fE9fW0etqouk3k9gkm9hCRUYY-89hAcUaa",
    "ho-9hA9i9NeNVRQYIL9dys9g8v8rttloeiYeRTPUVNU19fF0zvytz", "gw-9g_9i8ShMXOLZGM9eOcExu38qv",
    "iQ-R9hjytO9eWu9gju8t0rskgiZYGP9ewl4s59gf9gwpnkbK9eidQ0xw0u0",
    "hw-d9hitqljaLa9ffZHZ9fefaduv1q2tz05iehNX9fhU9fXaHsqzz08", "hP-rfieslrtq0k1d0XqYpGTPKUIdKhKjVlU",
    "hJ-T9hjytJ9d6YKGN9gs2-c9hLgfl3v1ttnliIdHYFXJURRZUgYiXo",
    "hL-9hH9hxSMSCL9feSONQb9ggk9gjlyqs0ktflcP9erU9fIaUHP9gt0", "g6-R9hhtqljQ9evdDm4p2n3qykmniod",
    "hQ-9hB9htQlRcRUZSjPqQoQlQdRUSRWTbQl", "gu-l9h-dPMdwg9gif9feda9fVZBU9fZwt13u1",
    "hj-S9hjztX9fhZ9fQe9fgrrw239gvp3W9fgY9fgY9fSxu9gk9gu", "g_-H9hifeoppjh9ergJqsq1q5ith5",
    "hn-G9hjqpoihcc9e4h9fdtxp1o3joo9ggYYg9esgMsuq2p2jxgydj", "hr-t9hjrooj9gk9eQrlmn-9eoQqgkjnp79gvv9ggnmrg",
    "hH-R9hjhfxsX9fUZ9fYgGyzv4p0u9gjW9fbX9fLY9feXOUWQZEg", "hi-09hivpofycte9e19eWukzc8Zom",
    "h7-9hl9i8MWUMZAbEaQYbSanZpSeOV9febIiRrV", "hg-9gs9jKe9cM", "h4-9gz9i8uVhUdGaIeKgTlamaSaVWXPcFeHcNWUTVYe",
    "jO-9gl9g8xovixa9gkSvexm",
  ],
  playful: [
    "hf", "g7-9gw9iiiOc9ep-a9fScSoehqTe", "hM-9gg9imgYe9fd-9gg9gpeAaT",
    "id-9gv39gg9hyh0-9g1gXN9ff9eC-9g19gt9fYc9fUe9fYZ-j9g29gzi9gtc7h",
    "hn-9hBae9h_btaveu-9gf9fSdmHwTfTZVUcSjPyK1KqOePSQUZScSfRrYpfm",
    "iN-9gzt9gu9hvr49fMSQeYgUVaKfOnUnfpqexdpZm-9hJ9fJTYXOaQgPjVpbminuhwcsbkTj",
    "i2-9hh9iUYJiaWpUhVcWZcUgXkXrbXhKXOQZRbEoIvRwZzfwmrugqZrSv-9fXKhnnltizh9gpotomrbqZjVhTb", "gp-79ixe9fL",
    "hK-9hHGK5Q9ggY9ggc9ghi9ggq5tutn", "hH-6Ntzq4l2e9g4X4T0F9gh", "hr-9hC9hKg9hm-9fX9eo9hJ9hD-9e2e9g89fLpQ",
    "iI-9hRygeY9ht-9fM9fF7e9gnh9gnj", "g1-9gokUegqpdeITL", "hn-9gh9g53jtcui", "gz-9ggvcSpegpTf", "hN-7r69hep9gz",
    "hj-9g79g4qetnnzerRxNoNeTTZReNjOkVvX", "ha-9hGnh9iKgTCLQZPd", "hq-9gw9h9iVZTUaViasfytzwkuZoNgMbGU9ffQCL9fe9hCl",
    "hm-9g49goaoOdVYaPhRqTucyroyfzZ2VqSlTeZbZYut49gfvwBeFf", "hn-9hm9gh9evO9gj9hXu9g1-k9fXf9eOdE",
    "hh-9gy2bkXeVYePnRwdzsmwgvWuSvUgSZXYYWcVh9g_b81b5h", "hy-9g0jgzpvsitRiNXRUXMeOsR4c9ghm9ggw0vrsgsarV",
    "hn-9glV9gq9hyq2moki9e_ZLi-19fM9g2U", "hu-9g-i3mmmglljeojqX3SvVoHeXpeupsserXlTfQYXTaHeRVTMcMfLiOnRvX",
    "hu-63gejStXzmwwn8b9glO8WoUiPZVSZRiNmVrbrknnlw", "g--9gj9hlcSpegpTf-f9esdSpefqTe",
    "hA-9go9hhcToehpTe-h9elVegppeeHTM", "iI-9h5r9ei9gh9hi9g8", "iT-9gh9gj9hEc8g-b9gtCb9fAh",
    "iO-9gg9he9gvL9glSzV9fbN9fWNIW", "hh-9gs9g8i9g9gSmczsn8a4TuPlMVWXbXdPbVkWnkgo",
    "it-9iJn9faY9fhlC9ghZ9gtx9gp416k4XyOtJgLSGSQOXXjXqewgsZoVhUXTDeRfUjakh09gi",
    "iV-oIyfuaNi9gl9iWs9gkgk39e229e-iN9efe9hgfr9fXLa9gik", "h7-9gkW9gjs3vlrcsVqWmThEa4j5vszhzczWvMtKl9fEa7eq9c-",
    "iv-9iu9gkOLISIbEiEsNyR8d9ghr9gm053o4j2b4NhuaOgO", "ia-r9jC8f9gma8SzFoEiCWDKFHOHS9ffY1hQ9iy",
    "h_-9h9odHfo9ercRbuhd9g64f5djsbGcn9fehLdf9hCc9g5Qgwb9hQeeOg9gi",
    "h8-9grSxkkeUea9g29g0jgRcyeX9fMZU9h6eaCe9hogerf9fhfY",
    "iF-9h49i5cHflicViTmJgMWMLT9ffd9ffg9fetIxV4ltvm1g9gspd9fXf",
    "iX-9ggY0mUab9hDU9hsScqgnh-9he9dEYdIbqgt9ijl9ghpeHg-a9d79evf", "hJ-9gjc1lvfMeS9hPa9hPrgldWf9fdX",
    "hq-9gjkThRWZPpK1a3kxwn1e5W9guN9haKY9grp",
    "im-9gjK4lTba9haa8c9hFsg9fdZ-9iPaAhtbA9ffA9fbDFTbykxfrXy9ffyBtTthnpgkZqXkXZ",
    "hn-9hooZAgq9fgh9fgeNbwhe9hud9gmg9grTe1f", "jm-oh9gmiSdt9iEj9g_9gv9dp9gr9g609gi59g1fpa9fbw9dd7k9fPU",
    "iN-0V9gokMcc9hUb6e9g-9gl9e49gt9e6g9hVh9gql9givc9ffh", "ii-9hu9ipSj9fdTIFU9fcg9fcuE7P8g80pvm0d3V6UvSoQf",
    "h1-9ghc7iPbi9iIX9glVqIe9g5dzXtMmKeJYMKNIZPe",
    "im-9iArz5gmjogxX9ghYvNtUfPk9fZTIDWFc9fgmDsQxS3ctjrpK29g99e_vbnmgmbmYlWeda",
    "ie-9gkC9gglPac9hea9gsk9g89fcX9g2m9giduVpNgLbMQPLUNZAc9gqgqWpJp9fhn9fgsHtXuinmeqbnUnXbcY",
    "hq-9g29gfcqQkQYYOiQpPwX1ovxiwduO8E9gpVyezpvmjpgpYuPkpPB", "iM-9hHR9gliNdW9ir9g3ffWdmivaN9eMZgxdJbP",
    "iR-v9i99gijMbl9exl9fCpHxXwjups7j4d9heRf6g", "iM-09inwiUc29e919ejn5kss9g1m4o5s6Phsbxe",
    "jG-x9ikzgsjLZq9fIiCp9fTgKn9giozq9g0gskngpjDq9fP19etn9gwn9gpess9gfg3m7Pd9gkd",
    "iY-tX8gQd9hO9h8mx9gf9gtrd9fhh-9ePY9gplMbm9fdx9fU9go9etjQvNpZsgmlgrYmXd",
    "iU-z9i72jRb9gg9e3xDa9eYGc2gwd-P9hq9gj9gypzz9gkNi9gfWhc", "iB-w9iLh8eY9g0h9g4hYePLA9fFKjzZyeJe9fh9e3PE9hYpfsdE",
    "hP-9hQQAbe9gvU9g0b9gqe9g49gke", "hY-9hTvB9g-V9gfN9gm", "g_-2Duehhf9h5h9hMId", "hg-29g-9gh9hou9fTr9fM",
    "h7-2a9hgd", "g1-y9jH9giE", "hh-9gg9hYatlquoyapMhJf9fgaROTOVPcSldwkpwi0ekdoThUf9fZncoelh",
    "h2-p9jL9gmhMbn9cz0X2iyxlxbzXtPnHZRTVRZQh9fUSaZb", "hj-9hV9hOk9gkcRQoQhMUTGaGlLuNzbqljj",
    "hy-9h1dLdUaoie9g-b5XmPgLYQQVJcJjOqTqeuqoslyj4k9h-Bc", "hX-9hTpURNYMqW9gfg9gjq9gfnjqdmVpD9fNb",
    "hJ-69fL9gvnHbX9hac9g54flhQb9fedafzdg9gzi6mtvmvftTkWfX",
    "hq-9hF9g2rqmzhhxlJXSuPpUeKRWGkMpWpcwihCeGuPpRiHePLLBSChJsUzi7owpq1lrdtY",
    "hw-0R9gkoMYY9iEb9hUjgZbPe-y9eBtwxnsbmSjHgJe9fMPa9ghl", "hB-yr9gpiLdh9hdNe-j9hBeVocepUe",
    "hC-r9fJUfXUhPtUzjx0i2Y9hbg9g4NYLa-29hLXZoYqkPj",
    "hz-zX9gklNbZ9iJf9hZui9feY-9hj9ecGfnYMN9fUA3t39fQt9fgvDrarklpcrWjZdbZ", "g4-19fgge9ggqNXZ9iNh9hMriPYPe",
    "i5-9gfUtjxhKbd9hIZ9gtphAYyhl9fKs62wqgkVh9fgeEm9giv6vssgkNg9fed9fHMX9gnn",
    "iA-1R9ghjQdd9gxi9gog9gsXiKd-39fM26yosUnPgMf9fWUb2j", "ht-9hM9h2PhJXWOeHnPzU4mpyf2VqRe",
    "h9-9gh9ep5inhQba9g3T9hPd9gpt57t2VoFaDSLHXNiOsY2b9gle3oiDW", "h5-9hx9iQV9fLTMPTKaMpVvf3yuygxSoSfBd9fUU9edkxyxmu",
    "hn-9gfY9ggnLZa9gue9gpa9gmObugl9fWr4zvtimXjVcTZZXe", "hV-9ggYYmVeXUiMoTxcwnosg3R9gjM9gnZ8pzvjqakWmnNE",
    "hY-9hKynmnagTZQOWPhStZ9hrLb9grjGcd9gw", "h_-y9iA5eVcb9fMe9fhlQlVjey2hsw5nxhxf9e7h9fUTaqiwh",
    "h5-u9h9ylXa9gn9eN29gvo8t9gmQd9gfe", "ip-p9h_xhqjPY29ephBm5i2y9gwiJ29eyiVlgn9giw9g0j4TlqXtgkh",
    "h9-t9hxff2iUc9gt9et59fZrQqcmjirZoXb-9eMD9gfgQe9hX9iVRj4W",
    "hy-s9fPXmQeVScNqQxe5q09go09g1s9gtt9gi-9ff9eo9fN9hTngFa", "hq-39hae5fU9hJpL9ffL9fYMgwc1gHbA9fH9hHZiuZNgO",
    "hV-9hTIOaOkY0g9gxUyWmVhbbqewkozd9glk9gmkpqiod", "g5-9gone9hQb9g8dj",
    "hR-6Diephste6h9gljtpkmgLaUoash9gwZ5XrYiThWZ", "ia-69g5stslxYyV0Ytkro",
  ],
}
// #endregion glyphs

// #region logic
const GA = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
const GQ = 4

export type LnhGlyph = { adv: number; strokes: number[][] }

/** One glyph: a 12-bit advance, then strokes of delta-coded points ("-" starts a stroke, "9" escapes a 12-bit delta). Font units, y up. */
function decodeGlyph(s: string) {
  let i = 0
  const v = (k: number) => GA.indexOf(s.charAt(k))
  const big = () => {
    const n = ((v(i) << 6) | v(i + 1)) - 2048
    i += 2
    return n
  }
  const adv = s ? big() * GQ : 0
  const strokes = [] as number[][]
  let cur = null as number[] | null
  let x = 0
  let y = 0
  const rd = () => {
    const c = v(i)
    i++
    if (c === 61) return big()
    return c - 30
  }
  while (i < s.length) {
    if (v(i) === 62) {
      cur = []
      strokes.push(cur)
      i++
      continue
    }
    x += rd()
    y += rd()
    if (cur) cur.push(x * GQ, y * GQ)
  }
  return { adv, strokes }
}

const glyphCache = {} as { [k: string]: LnhGlyph }
function glyph(hand: LnhHandName, code: number) {
  const k = hand + code
  let g = glyphCache[k]
  if (!g) {
    const list = HANDS[hand] || HANDS.script
    const c = code >= 32 && code <= 126 ? code : 63
    g = glyphCache[k] = decodeGlyph(list[c - 32])
  }
  return g
}

/** Typed text into what a pen plotter can write: straight quotes, plain dashes, no accents, printable ASCII. */
function cleanText(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‘’‚]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/[‒-―]/g, "-")
    .replace(/…/g, "...")
    .replace(/\r/g, "")
    .replace(/[^\x20-\x7e\n]/g, "")
}

function rand(i: number, c: number, k: number) {
  const s = Math.sin(i * 127.1 + c * 311.7 + k * 74.7) * 43758.5453
  return s - Math.floor(s)
}

export type LnhPara = { text: string; align?: "left" | "right" | "center" }
export type LnhStroke = { d: string; pts: number[]; cum: number[]; len: number; ci: number }
export type LnhLayout = { strokes: LnhStroke[]; width: number; height: number; size: number; chars: number }

function makeStroke(pts: number[], ci: number) {
  const cum = [0]
  let len = 0
  let d = "M" + pts[0].toFixed(1) + " " + pts[1].toFixed(1)
  for (let k = 2; k < pts.length; k += 2) {
    len += Math.hypot(pts[k] - pts[k - 2], pts[k + 1] - pts[k - 1])
    cum.push(len)
    d += "L" + pts[k].toFixed(1) + " " + pts[k + 1].toFixed(1)
  }
  if (pts.length === 2) {
    // a dot (the point of an "i", a full stop): give it a length so the pen visits it
    d += "l0.01 0"
    len = 0.01
    cum.push(len)
    pts = [pts[0], pts[1], pts[0] + 0.01, pts[1]]
  }
  return { d, pts, cum, len, ci }
}

/**
 * Sets paragraphs in a hand: word wrap to `width`, per-paragraph alignment, and the
 * small variations of a real hand (baseline and size), seeded by character index and
 * code so an unchanged prefix always lays out identically while you type after it.
 */
function layoutText(paras: LnhPara[], hand: LnhHandName, size: number, width: number, lead = 1.34) {
  const sc = size / 1000
  const strokes = [] as LnhStroke[]
  const lh = size * lead
  let y = size * 0.82
  let ci = 0
  let maxW = 0
  let lines = 0
  for (let p = 0; p < paras.length; p++) {
    const text = cleanText(paras[p].text)
    const align = paras[p].align || "left"
    const words = text.split(" ")
    type Item = { code: number; adv: number; ci: number }
    let line = [] as Item[]
    let lineW = 0
    const flush = () => {
      while (line.length && line[line.length - 1].code === 32) {
        lineW -= line[line.length - 1].adv
        line.pop()
      }
      let x = align === "right" ? width - lineW : align === "center" ? (width - lineW) / 2 : 0
      for (const it of line) {
        if (it.code !== 32) {
          const g = glyph(hand, it.code)
          const s = sc * (1 + (rand(it.ci, it.code, 1) - 0.5) * 0.05)
          const dy = (rand(it.ci, it.code, 2) - 0.5) * size * 0.04
          for (const st of g.strokes) {
            if (st.length < 2) continue
            const pts = [] as number[]
            for (let k = 0; k < st.length; k += 2) pts.push(x + st[k] * s, y + dy - st[k + 1] * s)
            strokes.push(makeStroke(pts, it.ci))
          }
        }
        x += it.adv
      }
      maxW = Math.max(maxW, lineW)
      lines++
      y += lh
      line = []
      lineW = 0
    }
    for (let w = 0; w < words.length; w++) {
      const word = words[w]
      const items = [] as Item[]
      let ww = 0
      for (let k = 0; k < word.length; k++) {
        const code = word.charCodeAt(k)
        const adv = glyph(hand, code).adv * sc
        items.push({ code, adv, ci: ci + k })
        ww += adv
      }
      ci += word.length
      if (line.length && lineW + ww > width) flush()
      if (ww > width) {
        // one word wider than the box: break it by characters
        for (const it of items) {
          if (line.length && lineW + it.adv > width) flush()
          line.push(it)
          lineW += it.adv
        }
      } else {
        for (const it of items) line.push(it)
        lineW += ww
      }
      if (w < words.length - 1) {
        const adv = glyph(hand, 32).adv * sc
        line.push({ code: 32, adv, ci })
        lineW += adv
      }
      ci++
    }
    flush()
  }
  return { strokes, width: maxW, height: lines ? (lines - 1) * lh + size * 1.12 : 0, size, chars: ci }
}

/** The largest size from `sizes` whose layout fits the box. */
function fitLayout(paras: LnhPara[], hand: LnhHandName, w: number, h: number, sizes: number[], lead?: number) {
  let out = layoutText(paras, hand, sizes[0], w, lead)
  for (let i = 1; i < sizes.length && out.height > h; i++) out = layoutText(paras, hand, sizes[i], w, lead)
  return out
}

/** All strokes as one path, for handwriting that is only shown, not written. */
function joinStrokes(strokes: LnhStroke[], from = 0, to = Infinity) {
  let d = ""
  for (const s of strokes) if (s.ci >= from && s.ci < to) d += s.d
  return d
}

/** The point `along` units into a stroke. */
function pointAt(s: LnhStroke, along: number, out: number[]) {
  const n = s.cum.length
  if (along <= 0) {
    out[0] = s.pts[0]
    out[1] = s.pts[1]
    return out
  }
  if (along >= s.len) {
    out[0] = s.pts[2 * n - 2]
    out[1] = s.pts[2 * n - 1]
    return out
  }
  let k = 1
  while (k < n - 1 && s.cum[k] < along) k++
  const a = s.cum[k - 1]
  const t = (along - a) / Math.max(1e-6, s.cum[k] - a)
  out[0] = s.pts[2 * k - 2] + (s.pts[2 * k] - s.pts[2 * k - 2]) * t
  out[1] = s.pts[2 * k - 1] + (s.pts[2 * k + 1] - s.pts[2 * k - 1]) * t
  return out
}

/** How many leading strokes two layouts share, so the arm only writes what changed. */
function sharedPrefix(a: LnhStroke[], b: LnhStroke[]) {
  let i = 0
  while (i < a.length && i < b.length && a[i].d === b[i].d) i++
  return i
}

/**
 * Two-link inverse kinematics. Returns the shoulder angle, the elbow and the forearm
 * angle (radians). `bend` picks which side the elbow folds to. Out-of-reach targets
 * clamp, with the forearm still pointing at the target.
 */
function solveArm(bx: number, by: number, l1: number, l2: number, tx: number, ty: number, bend: number) {
  const dx = tx - bx
  const dy = ty - by
  const raw = Math.hypot(dx, dy)
  const d = Math.min(Math.max(raw, Math.abs(l1 - l2) + 0.001), l1 + l2 - 0.001)
  const th = Math.atan2(dy, dx)
  const c = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)
  const A = Math.acos(Math.min(1, Math.max(-1, c)))
  const a1 = th + (bend < 0 ? -A : A)
  const ex = bx + l1 * Math.cos(a1)
  const ey = by + l1 * Math.sin(a1)
  const a2 = Math.atan2(ty - ey, tx - ex)
  return { a1, a2, ex, ey, reach: raw <= l1 + l2 }
}

/** Local point through an SVG matrix [a b c d e f]. */
function apply(m: number[], x: number, y: number, out: number[]) {
  out[0] = m[0] * x + m[2] * y + m[4]
  out[1] = m[1] * x + m[3] * y + m[5]
  return out
}

function placeMatrix(tx: number, ty: number, deg: number) {
  const r = (deg * Math.PI) / 180
  const c = Math.cos(r)
  const s = Math.sin(r)
  return [c, s, -s, c, tx, ty]
}

function tierFor(qty: number, tiers: LnhTier[]) {
  let t = tiers[0]
  for (const x of tiers) if (qty >= x.min) t = x
  return t
}

function nextTier(qty: number, tiers: LnhTier[]) {
  for (const x of tiers) if (x.min > qty) return x
  return null
}

function round2(n: number) {
  return Math.round(n * 100 + 1e-9) / 100
}

function unitPrice(base: number, qty: number, tiers: LnhTier[], postage: number) {
  return round2(base * (1 - tierFor(qty, tiers).off)) + postage
}

function lowestPrice(products: LnhProduct[], tiers: LnhTier[]) {
  let off = 0
  for (const t of tiers) off = Math.max(off, t.off)
  let lo = Infinity
  for (const p of products) lo = Math.min(lo, round2(p.base * (1 - off)))
  return lo
}

function money(n: number, sign: string) {
  const fixed = n.toFixed(2)
  const [a, b] = fixed.split(".")
  return sign + a.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + b
}

/** Slider position 0..1000 to a quantity 1..10,000 on a log scale, rounded to friendly steps. */
function qtyFromSlider(p: number) {
  const raw = Math.pow(10, (Math.min(1000, Math.max(0, p)) / 1000) * 4)
  const step = raw < 20 ? 1 : raw < 100 ? 5 : raw < 1000 ? 25 : raw < 5000 ? 100 : 250
  return Math.max(1, Math.min(10000, Math.round(raw / step) * step))
}

function sliderFromQty(q: number) {
  return Math.round((Math.log10(Math.min(10000, Math.max(1, q))) / 4) * 1000)
}

function fillMerge(note: string, sample: { [field: string]: string }) {
  const parts = [] as { text: string; hi: boolean }[]
  const re = /\{([a-z_]+)\}/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(note))) {
    if (m.index > last) parts.push({ text: note.slice(last, m.index), hi: false })
    parts.push({ text: sample[m[1]] != null ? sample[m[1]] : m[1], hi: true })
    last = m.index + m[0].length
  }
  if (last < note.length) parts.push({ text: note.slice(last), hi: false })
  return parts
}

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim())
}

function nextIndex(i: number, key: string, n: number) {
  if (key === "ArrowRight" || key === "ArrowDown") return (i + 1) % n
  if (key === "ArrowLeft" || key === "ArrowUp") return (i - 1 + n) % n
  if (key === "Home") return 0
  if (key === "End") return n - 1
  return -1
}

/** Pen pace in em per second: about the speed of a person writing neatly. */
const PACES = { pen: 7, brisk: 16, rush: 40 }

function writeSeconds(strokes: LnhStroke[], size: number, pace: number) {
  let len = 0
  for (const s of strokes) len += s.len
  return len / (size * pace)
}

function resolvePalette(p: LnhPaletteName | LnhPalette | undefined) {
  if (!p) return PALETTES.studio
  if (typeof p === "string") return PALETTES[p] || PALETTES.studio
  return { onAccent: "#ffffff", ...p }
}
// #endregion logic

function useReducedMotion() {
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

/** Reveal-on-scroll, armed only after mount, so nothing is hidden without JS or under reduced motion. */
function useReveal(root: { current: HTMLElement | null }, reduced: boolean) {
  React.useEffect(() => {
    const el = root.current
    if (!el || reduced || typeof IntersectionObserver === "undefined") return
    const items = Array.from(el.querySelectorAll(".lnh-rv"))
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) if (e.isIntersecting) {
          e.target.setAttribute("data-in", "")
          io.unobserve(e.target)
        }
      },
      { rootMargin: "0px 0px -10% 0px" }
    )
    for (const it of items) {
      it.setAttribute("data-armed", "")
      io.observe(it)
    }
    return () => io.disconnect()
  }, [root, reduced])
}

/** True once the element has been on screen, and whether it is on screen now. */
function useOnScreen(ref: { current: Element | null }, margin = "0px") {
  const [state, setState] = React.useState({ seen: false, now: false })
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === "undefined") {
      setState({ seen: true, now: true })
      return
    }
    const io = new IntersectionObserver(
      (es) => {
        const on = es[es.length - 1].isIntersecting
        setState((s) => (s.now === on && (s.seen || !on) ? s : { seen: s.seen || on, now: on }))
      },
      { rootMargin: margin }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [ref, margin])
  return state
}

/* ---------- the writing robot ---------- */

type PlotGeo = {
  /** shoulder */
  bx: number
  by: number
  l1: number
  l2: number
  bend: number
  /** paper (local) to stage matrix */
  m: number[]
  /** where the pen rests, in paper coords */
  park: number[]
  /** pen length and its fixed angle in degrees (the pen stays upright, like a plotter's) */
  pen: number
  penAngle: number
  tube: string
  housing: number
  /** line-art scale */
  k: number
  /** housing colour: the accent or the second colour */
  tone?: "accent" | "second"
}

type PlotterProps = {
  geo: PlotGeo
  strokes: LnhStroke[]
  ink: string
  width: number
  /** drawing speed in paper units per second */
  rate: number
  active: boolean
  reduced: boolean
  /** bump to rewrite from a clean sheet */
  epoch?: number
  fade?: boolean
  onDone?: () => void
  onTick?: (done: number) => void
  paper?: React.ReactNode
  over?: React.ReactNode
}

const RAD = 180 / Math.PI
const useIsoLayoutEffect = typeof window === "undefined" ? React.useEffect : React.useLayoutEffect

function Plotter({ geo, strokes, ink, width, rate, active, reduced, epoch = 0, fade, onDone, onTick, paper, over }: PlotterProps) {
  const paths = React.useRef([] as (SVGPathElement | null)[])
  const upper = React.useRef(null as SVGGElement | null)
  const fore = React.useRef(null as SVGGElement | null)
  const elbow = React.useRef(null as SVGGElement | null)
  const clamp = React.useRef(null as SVGGElement | null)
  const pen = React.useRef(null as SVGGElement | null)
  const dot = React.useRef(null as SVGCircleElement | null)
  const st = React.useRef({
    i: 0,
    phase: 3,
    along: 0,
    px: geo.park[0],
    py: geo.park[1],
    lift: 1,
    drawn: 0,
    prev: [] as LnhStroke[],
    epoch: -1,
    doneLen: 0,
    total: 0,
    raf: 0,
    last: 0,
  })
  const live = React.useRef({ strokes, geo, rate, active, onDone, onTick })
  live.current = { strokes, geo, rate, active, onDone, onTick }

  const pose = React.useCallback((x: number, y: number, lift: number) => {
    const g = live.current.geo
    const P = apply(g.m, x, y, [0, 0])
    const tx = P[0] - lift * 1.6 * g.k
    const ty = P[1] - lift * 4 * g.k
    const pa = g.penAngle / RAD
    const cx = tx + g.pen * Math.cos(pa)
    const cy = ty + g.pen * Math.sin(pa)
    const s = solveArm(g.bx, g.by, g.l1, g.l2, cx, cy, g.bend)
    const ex = s.ex.toFixed(2) + " " + s.ey.toFixed(2)
    if (upper.current) upper.current.setAttribute("transform", "translate(" + g.bx + " " + g.by + ") rotate(" + (s.a1 * RAD).toFixed(2) + ")")
    if (elbow.current) elbow.current.setAttribute("transform", "translate(" + ex + ")")
    if (fore.current) fore.current.setAttribute("transform", "translate(" + ex + ") rotate(" + (s.a2 * RAD).toFixed(2) + ")")
    const ax = s.ex + g.l2 * Math.cos(s.a2)
    const ay = s.ey + g.l2 * Math.sin(s.a2)
    if (clamp.current) clamp.current.setAttribute("transform", "translate(" + ax.toFixed(2) + " " + ay.toFixed(2) + ")")
    // the pen hangs from the clamp; when a target is out of reach it follows the arm, never detaches
    const px = ax - g.pen * Math.cos(pa)
    const py = ay - g.pen * Math.sin(pa)
    if (pen.current) pen.current.setAttribute("transform", "translate(" + px.toFixed(2) + " " + py.toFixed(2) + ") rotate(" + g.penAngle + ")")
    if (dot.current) {
      dot.current.setAttribute("cx", P[0].toFixed(2))
      dot.current.setAttribute("cy", P[1].toFixed(2))
      dot.current.style.opacity = String(Math.max(0, 1 - lift * 3))
    }
  }, [])

  const show = (k: number, f: number) => {
    const el = paths.current[k]
    if (!el) return
    if (f <= 0) {
      el.style.visibility = "hidden"
      return
    }
    el.style.visibility = "visible"
    el.style.strokeDashoffset = f >= 1 ? "0" : String(1 - f)
  }

  const tick = React.useCallback((now: number) => {
    const s = st.current
    const L = live.current
    s.raf = 0
    if (!L.active) {
      s.last = 0
      return
    }
    const dt = s.last ? Math.min(0.05, (now - s.last) / 1000) : 1 / 60
    s.last = now
    const list = L.strokes
    let budget = dt
    let guard = 0
    while (budget > 1e-6 && guard++ < 400) {
      if (s.phase === 0 || s.phase === 2) {
        const tgx = s.phase === 0 ? list[s.i].pts[0] : L.geo.park[0]
        const tgy = s.phase === 0 ? list[s.i].pts[1] : L.geo.park[1]
        const v = L.rate * (s.phase === 0 ? 2.6 : 1.4)
        const dist = Math.hypot(tgx - s.px, tgy - s.py)
        if (v * budget >= dist) {
          budget -= dist / v
          s.px = tgx
          s.py = tgy
          if (s.phase === 0) {
            s.phase = 1
            s.along = 0
          } else {
            s.phase = 3
            budget = 0
            if (L.onDone) L.onDone()
          }
        } else {
          s.px += ((tgx - s.px) / dist) * v * budget
          s.py += ((tgy - s.py) / dist) * v * budget
          budget = 0
        }
      } else if (s.phase === 1) {
        const cur = list[s.i]
        const remain = cur.len - s.along
        if (L.rate * budget >= remain) {
          budget -= remain / L.rate
          show(s.i, 1)
          s.doneLen += cur.len
          s.i++
          s.drawn = s.i
          const end = cur.pts.length
          s.px = cur.pts[end - 2]
          s.py = cur.pts[end - 1]
          s.phase = s.i >= list.length ? 2 : 0
        } else {
          s.along += L.rate * budget
          budget = 0
          show(s.i, s.along / cur.len)
          const P = pointAt(cur, s.along, [0, 0])
          s.px = P[0]
          s.py = P[1]
        }
      } else break
    }
    const want = s.phase === 1 ? 0 : 1
    s.lift += (want - s.lift) * Math.min(1, dt * 16)
    pose(s.px, s.py, s.lift)
    if (L.onTick) L.onTick(s.total ? Math.min(1, (s.doneLen + (s.phase === 1 ? s.along : 0)) / s.total) : 1)
    if (s.phase !== 3 || Math.abs(want - s.lift) > 0.01) s.raf = requestAnimationFrame(tick)
  }, [pose])

  useIsoLayoutEffect(() => {
    const s = st.current
    const fresh = s.epoch !== epoch
    s.epoch = epoch
    const keep = fresh ? 0 : Math.min(sharedPrefix(s.prev, strokes), s.drawn)
    s.prev = strokes
    s.total = 0
    s.doneLen = 0
    for (let k = 0; k < strokes.length; k++) {
      s.total += strokes[k].len
      if (k < keep) s.doneLen += strokes[k].len
    }
    if (reduced) {
      for (let k = 0; k < strokes.length; k++) show(k, 1)
      s.i = s.drawn = strokes.length
      s.phase = 3
      s.px = geo.park[0]
      s.py = geo.park[1]
      s.lift = 1
      pose(s.px, s.py, 1)
      if (onTick) onTick(1)
      return
    }
    for (let k = 0; k < strokes.length; k++) show(k, k < keep ? 1 : 0)
    s.i = s.drawn = keep
    s.along = 0
    s.phase = strokes.length > keep ? 0 : 2
    pose(s.px, s.py, s.lift)
    if (!s.raf && active) {
      s.last = 0
      s.raf = requestAnimationFrame(tick)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokes, epoch, reduced])

  React.useEffect(() => {
    const s = st.current
    if (active && !s.raf && s.phase !== 3 && !reduced) {
      s.last = 0
      s.raf = requestAnimationFrame(tick)
    }
  }, [active, reduced, tick])

  React.useEffect(
    () => () => {
      const s = st.current
      if (s.raf) cancelAnimationFrame(s.raf)
      s.raf = 0
    },
    []
  )

  const g = geo
  const k = g.k
  const m = "matrix(" + g.m.join(" ") + ")"
  const tone = g.tone === "second" ? "lnh-a-sec" : "lnh-a-acc"
  const toneB = g.tone === "second" ? "lnh-a-acc" : "lnh-a-sec"
  return (
    <>
      <g transform={m}>
        {paper}
        <g className={"lnh-written" + (fade ? " lnh-fade" : "")} stroke={ink} strokeWidth={width}>
          {strokes.map((s, i) => (
            <path key={i} ref={(el) => { paths.current[i] = el }} d={s.d} pathLength={1} className="lnh-stroke" />
          ))}
        </g>
        {over}
      </g>
      <g className="lnh-arm" strokeWidth={2.1 * k} aria-hidden="true">
        <path className="lnh-tube-o" d={g.tube} strokeWidth={25 * k} />
        <path className="lnh-tube-f" d={g.tube} strokeWidth={20 * k} />
        <path className="lnh-tube-r" d={g.tube} strokeWidth={20 * k} strokeDasharray={1.6 * k + " " + 6.5 * k} />
        <g transform={"translate(" + g.bx + " " + g.by + ") rotate(" + g.housing + ")"}>
          <rect x={-32 * k} y={-20 * k} width={64 * k} height={40 * k} rx={20 * k} className={tone} />
          <rect x={-32 * k} y={-20 * k} width={64 * k} height={40 * k} rx={20 * k} className="lnh-a-line" />
          {[-1, 0, 1].map((d) => (
            <circle key={d} cx={-17 * k + d * 6 * k} cy={8 * k} r={1.9 * k} className="lnh-a-ink" />
          ))}
          <path d={"M" + 6 * k + " " + -9 * k + "h" + 16 * k} className="lnh-a-line" />
        </g>
        <circle ref={dot} r={width * 0.9} fill={ink} opacity={0} />
        <g ref={pen}>
          <path d={"M0 0L" + 9 * k + " " + -3.4 * k + "V" + 3.4 * k + "Z"} className="lnh-a-ink" />
          <rect x={9 * k} y={-4.4 * k} width={g.pen - 9 * k} height={8.8 * k} rx={2 * k} className="lnh-a-body" />
          <rect x={g.pen * 0.42} y={-4.4 * k} width={g.pen * 0.18} height={8.8 * k} className={toneB} />
        </g>
        <g ref={upper}>
          <rect x={-15 * k} y={-14 * k} width={g.l1 + 30 * k} height={28 * k} rx={14 * k} className="lnh-a-body" />
          <path d={"M" + 24 * k + " 0H" + (g.l1 - 22 * k)} className="lnh-a-line lnh-a-thin" />
          {[0, 1, 2].map((d) => (
            <path key={d} d={"M" + (g.l1 * 0.5 + (d - 1) * 7 * k) + " " + -14 * k + "v" + 28 * k} className="lnh-a-line lnh-a-thin" />
          ))}
        </g>
        <g ref={fore}>
          <rect x={-11 * k} y={-10 * k} width={g.l2 + 22 * k} height={20 * k} rx={10 * k} className="lnh-a-body" />
          <path d={"M" + 18 * k + " " + -3 * k + "H" + (g.l2 - 16 * k)} className="lnh-a-line lnh-a-thin" />
        </g>
        <g ref={elbow}>
          <circle r={13 * k} className={toneB} />
          <circle r={13 * k} className="lnh-a-line" />
          <circle r={4 * k} className="lnh-a-ink" />
        </g>
        <g ref={clamp}>
          <circle r={9 * k} className={tone} />
          <circle r={9 * k} className="lnh-a-line" />
          <circle r={2.6 * k} className="lnh-a-ink" />
        </g>
        <g transform={"translate(" + g.bx + " " + g.by + ")"}>
          <circle r={17 * k} className="lnh-a-body" />
          <circle r={7 * k} className={toneB} />
          <circle r={7 * k} className="lnh-a-line" />
        </g>
      </g>
    </>
  )
}

/* ---------- static handwriting ---------- */

const inkCache = {} as { [k: string]: LnhLayout }
function cachedLayout(key: string, make: () => LnhLayout) {
  return inkCache[key] || (inkCache[key] = make())
}

/** A line of handwriting, laid out once and drawn as one path; `draw` writes it on when its section scrolls in. */
function Script({ text, hand, size, x = 0, y = 0, width = 2000, align = "left", color, sw, draw, pace = 30 }: {
  text: string
  hand: LnhHandName
  size: number
  x?: number
  y?: number
  width?: number
  align?: "left" | "right" | "center"
  color: string
  sw: number
  draw?: boolean
  pace?: number
}) {
  const lay = cachedLayout(hand + "|" + size + "|" + width + "|" + align + "|" + text, () => layoutText([{ text, align }], hand, size, width))
  if (!draw) {
    return <path d={joinStrokes(lay.strokes)} transform={"translate(" + x + " " + y + ")"} className="lnh-stroke" stroke={color} strokeWidth={sw} />
  }
  let t = 0
  const rate = size * pace
  return (
    <g transform={"translate(" + x + " " + y + ")"} className="lnh-wr" stroke={color} strokeWidth={sw}>
      {lay.strokes.map((s, i) => {
        const dur = Math.max(0.04, s.len / rate)
        const style = { animationDelay: t.toFixed(3) + "s", animationDuration: dur.toFixed(3) + "s" }
        t += dur + 0.04
        return <path key={i} d={s.d} pathLength={1} className="lnh-stroke" style={style} />
      })}
    </g>
  )
}

/* ---------- card covers ---------- */

const STOCKS = { ivory: "#fbf8f1", kraft: "#c9a679", chalk: "#2d3236" }

function CardArt({ card }: { card: LnhCard }) {
  if (card.image) {
    return <image href={card.image} x={0} y={0} width={350} height={250} preserveAspectRatio="xMidYMid slice" />
  }
  const d = card.design || "hello"
  if (d === "hello") {
    return (
      <g>
        <rect width={350} height={250} fill="#2d3236" />
        <ellipse cx={120} cy={90} rx={150} ry={70} fill="#ffffff" opacity={0.035} />
        <ellipse cx={260} cy={190} rx={130} ry={60} fill="#ffffff" opacity={0.03} />
        <rect x={12} y={12} width={326} height={226} fill="none" stroke="#f4f2ea" strokeOpacity={0.3} strokeWidth={1.2} />
        <Script text="hello" hand="script" size={150} x={0} y={42} width={350} align="center" color="#f4f2ea" sw={11} />
      </g>
    )
  }
  if (d === "bloom") {
    const sprig = (x: number, y: number, r: number) => (
      <g transform={"translate(" + x + " " + y + ") rotate(" + r + ")"} fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round">
        <path d="M0 0C10 -30 12 -60 6 -92" />
        {[18, 38, 58, 76].map((t, i) => (
          <path key={i} d={"M" + (8 + i * 0.6) + " " + -t + "c" + (i % 2 ? 16 : -16) + " -6 " + (i % 2 ? 20 : -20) + " -18 " + (i % 2 ? 18 : -18) + " -24c" + (i % 2 ? -12 : 12) + " 2 " + (i % 2 ? -18 : 18) + " 12 " + (i % 2 ? -18 : 18) + " 24"} />
        ))}
      </g>
    )
    return (
      <g>
        <rect width={350} height={250} className="lnh-f-acc" />
        {sprig(36, 236, -18)}
        {sprig(318, 240, 22)}
        <Script text="thank you" hand="script" size={78} x={0} y={78} width={350} align="center" color="#ffffff" sw={3.6} />
      </g>
    )
  }
  if (d === "coast") {
    const lines = []
    for (let i = 0; i < 9; i++) {
      let p = "M-10 " + (150 + i * 11)
      for (let x = -10; x <= 360; x += 10) p += "L" + x + " " + (150 + i * 11 + Math.sin(x / (38 + i * 3) + i * 0.7) * (5 + i * 0.8)).toFixed(1)
      lines.push(<path key={i} d={p} fill="none" className="lnh-s-sec" strokeWidth={1.3} />)
    }
    return (
      <g>
        <rect width={350} height={250} fill="#fbf8f1" />
        {lines}
        <circle cx={286} cy={78} r={22} fill="none" className="lnh-s-acc" strokeWidth={1.6} />
        <text x={30} y={56} className="lnh-cover-caps">WITH GRATITUDE</text>
        <Script text="from the coast" hand="script" size={42} x={30} y={70} color="#1d1d1f" sw={1.8} />
      </g>
    )
  }
  if (d === "kraft") {
    const specks = []
    for (let i = 0; i < 60; i++) specks.push(<circle key={i} cx={rand(i, 3, 1) * 350} cy={rand(i, 5, 2) * 250} r={0.6 + rand(i, 7, 3) * 0.9} fill="#5a4026" opacity={0.25} />)
    const perf = []
    for (let i = 0; i < 8; i++) perf.push(<circle key={"t" + i} cx={258 + i * 8} cy={24} r={2.4} fill="#c9a679" />, <circle key={"b" + i} cx={258 + i * 8} cy={104} r={2.4} fill="#c9a679" />)
    for (let i = 0; i < 11; i++) perf.push(<circle key={"l" + i} cx={254} cy={28 + i * 7.4} r={2.4} fill="#c9a679" />, <circle key={"r" + i} cx={318} cy={28 + i * 7.4} r={2.4} fill="#c9a679" />)
    return (
      <g>
        <rect width={350} height={250} fill="#c9a679" />
        {specks}
        <rect x={14} y={14} width={322} height={222} fill="none" stroke="#2b2118" strokeWidth={1.3} strokeDasharray="6 5" />
        <rect x={254} y={24} width={64} height={80} fill="#fbf8f1" />
        {perf}
        <rect x={262} y={32} width={48} height={64} className="lnh-f-acc" />
        <circle cx={286} cy={66} r={11} fill="none" stroke="#fff" strokeWidth={1.6} />
        <path d="M286 47v6M286 79v6M267 66h6M299 66h6" stroke="#fff" strokeWidth={1.6} strokeLinecap="round" />
        <path d="M206 70c10-8 20 8 30 0s20 8 30 0s20 8 30 0M206 82c10-8 20 8 30 0s20 8 30 0s20 8 30 0" fill="none" stroke="#2b2118" strokeWidth={1.2} opacity={0.55} />
        <Script text="a little note" hand="casual" size={50} x={30} y={140} color="#2b2118" sw={2.2} />
      </g>
    )
  }
  if (d === "congrats") {
    const rays = []
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2
      const r0 = 88 + (i % 2) * 10
      rays.push(<path key={i} d={"M" + (175 + Math.cos(a) * r0).toFixed(1) + " " + (125 + Math.sin(a) * r0 * 0.78).toFixed(1) + "L" + (175 + Math.cos(a) * (r0 + 22)).toFixed(1) + " " + (125 + Math.sin(a) * (r0 + 22) * 0.78).toFixed(1)} className="lnh-s-acc" strokeWidth={3} strokeLinecap="round" />)
    }
    return (
      <g>
        <rect width={350} height={250} className="lnh-f-sec" />
        {rays}
        <Script text="congrats!" hand="playful" size={70} x={0} y={90} width={350} align="center" color="#ffffff" sw={3.4} />
      </g>
    )
  }
  if (d === "birthday") {
    let sq = "M-10 40"
    for (let x = -10; x < 370; x += 24) sq += "c8 -18 16 18 24 0"
    return (
      <g>
        <rect width={350} height={250} fill="#f2b233" />
        <path d={sq} fill="none" className="lnh-s-acc" strokeWidth={2.4} strokeLinecap="round" />
        <path d={sq} fill="none" stroke="#1d1d1f" strokeWidth={1.2} transform="translate(0 196)" strokeLinecap="round" opacity={0.7} />
        <Script text="happy" hand="script" size={70} x={0} y={56} width={350} align="center" color="#1d1d1f" sw={2.8} />
        <Script text="birthday" hand="script" size={70} x={0} y={124} width={350} align="center" color="#1d1d1f" sw={2.8} />
      </g>
    )
  }
  if (d === "sympathy") {
    return (
      <g>
        <rect width={350} height={250} fill="#1f2b45" />
        <g fill="none" stroke="#f4f2ea" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <path d="M262 236C258 190 262 150 270 104" />
          <path d="M264 186c-22-6-36-22-40-44c20 4 34 18 40 44" />
          <path d="M268 150c18-8 30-24 30-44c-18 6-28 22-30 44" />
          <path d="M270 104c-16-4-24-20-20-38c8 10 14 14 20 14c6 0 12-6 18-16c6 18-2 36-18 40Z" />
          <path d="M270 80c-2-12 0-22 6-30" />
        </g>
        <Script text="thinking" hand="script" size={48} x={30} y={70} color="#f4f2ea" sw={2} />
        <Script text="of you" hand="script" size={48} x={60} y={124} color="#f4f2ea" sw={2} />
      </g>
    )
  }
  // welcome
  const arcs = []
  for (let i = 0; i < 6; i++) arcs.push(<path key={i} d={"M" + (175 - 40 - i * 18) + " 250A" + (40 + i * 18) + " " + (40 + i * 18) + " 0 0 1 " + (175 + 40 + i * 18) + " 250"} fill="none" className="lnh-s-acc" strokeWidth={i === 0 ? 3 : 1.6} strokeDasharray={i % 2 ? "5 6" : undefined} />)
  return (
    <g>
      <rect width={350} height={250} fill="#fbf8f1" />
      {arcs}
      <circle cx={175} cy={250} r={26} className="lnh-f-acc" />
      <Script text="welcome aboard" hand="script" size={52} x={0} y={34} width={350} align="center" color="#1d1d1f" sw={2.2} />
    </g>
  )
}

/* ---------- line icons ---------- */

function Icon({ name }: { name: string }) {
  const p = { fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
  if (name === "crm")
    return (
      <g {...p}>
        <rect x={6} y={10} width={36} height={28} rx={3} />
        <circle cx={18} cy={21} r={5} />
        <path d="M10 33c2-5 14-5 16 0M29 19h8M29 25h8M29 31h5" />
      </g>
    )
  if (name === "store")
    return (
      <g {...p}>
        <path d="M9 18h30l-3 22H12Z" />
        <path d="M17 18c0-6 3-10 7-10s7 4 7 10" />
      </g>
    )
  if (name === "star") return <path {...p} d="M24 7l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1Z" />
  if (name === "sheet")
    return (
      <g {...p}>
        <rect x={8} y={8} width={32} height={32} rx={2} />
        <path d="M8 18h32M8 28h32M20 8v32" />
      </g>
    )
  if (name === "api") return <path {...p} d="M18 10c-5 0-6 3-6 7s-1 6-5 7c4 1 5 3 5 7s1 7 6 7M30 10c5 0 6 3 6 7s1 6 5 7c-4 1-5 3-5 7s-1 7-6 7" />
  return <path {...p} d="M24 39S8 29 8 18c0-6 4-10 9-10c3 0 6 2 7 5c1-3 4-5 7-5c5 0 9 4 9 10c0 11-16 21-16 21Z" />
}

/* ---------- how-it-works drawings ---------- */

function StepArt({ i }: { i: number }) {
  if (i === 0)
    return (
      <g className="lnh-line-art">
        <rect x={52} y={22} width={136} height={92} rx={6} className="lnh-f-card" />
        <path d="M30 128h180l-14-14H44Z" className="lnh-f-card" />
        <path d="M70 46h70M70 60h90M70 74h52" className="lnh-thin" />
        <path d="M128 74v-2" className="lnh-thin" />
        <rect x={125} y={66} width={2.4} height={14} className="lnh-caret lnh-f-acc" stroke="none" />
        <rect x={142} y={90} width={34} height={12} rx={2} className="lnh-f-acc" />
      </g>
    )
  if (i === 1)
    return (
      <g className="lnh-line-art">
        <rect x={34} y={70} width={150} height={74} rx={2} transform="rotate(-4 109 107)" className="lnh-f-card" />
        <path d="M54 104c8-12 12 10 20 0s12-10 18 2 10-12 18-4 8 8 14 0" className="lnh-ink-blue lnh-scribble" pathLength={1} />
        <path d="M206 -6C206 20 200 30 196 40" className="lnh-tube-o" strokeWidth={16} />
        <path d="M206 -6C206 20 200 30 196 40" className="lnh-tube-f" strokeWidth={12} />
        <g className="lnh-bob">
          <rect x={150} y={36} width={60} height={18} rx={9} transform="rotate(28 196 40)" className="lnh-f-card" />
          <circle cx={196} cy={40} r={11} className="lnh-f-acc" />
          <circle cx={150} cy={66} r={8} className="lnh-f-sec" />
          <path d="M150 66l-18 26" strokeWidth={6} className="lnh-a-pen" />
          <path d="M132 92l-4 7" strokeWidth={2.2} />
        </g>
      </g>
    )
  return (
    <g className="lnh-line-art">
      <rect x={40} y={36} width={150} height={98} rx={3} className="lnh-f-card" />
      <path d="M40 40l75 52 75-52" />
      <rect x={150} y={46} width={28} height={32} className="lnh-f-acc" />
      <path d="M118 54c6-5 12 5 18 0s12 5 18 0M118 64c6-5 12 5 18 0s12 5 18 0" className="lnh-thin" />
      <path d="M58 104h40M58 114h56" className="lnh-ink-blue" />
      <path d="M200 70h22M206 84h22M196 98h14" className="lnh-s-sec" strokeWidth={2.4} />
    </g>
  )
}

const LNH_CSS = `
.lnh-root{--lnh-paper:#f2f1ec;--lnh-white:#ffffff;--lnh-card:#ffffff;--lnh-line:#1c1c1e;--lnh-text:#1c1c1e;--lnh-muted:#5b5954;--lnh-rule:rgba(28,28,30,.12);--lnh-soft:rgba(28,28,30,.05);--lnh-shadow:0 1px 1px rgba(20,20,20,.06),0 10px 30px -12px rgba(20,20,20,.22);--lnh-ease:cubic-bezier(.22,1,.36,1);--lnh-serif:"Iowan Old Style","Charter","Bitstream Charter","Palatino Linotype",Palatino,Georgia,serif;--lnh-sans:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Inter,"Helvetica Neue",Arial,sans-serif;--lnh-pad:clamp(16px,4vw,56px);--lnh-nav:72px;position:relative;min-height:var(--lnh-h);background:var(--lnh-white);color:var(--lnh-text);font-family:var(--lnh-sans);font-size:16px;line-height:1.55;-webkit-font-smoothing:antialiased;overflow-x:clip;color-scheme:light}
.lnh-root[data-theme="dark"]{--lnh-paper:#131417;--lnh-white:#1a1b1f;--lnh-card:#24262b;--lnh-line:#e9e6df;--lnh-text:#f1efe9;--lnh-muted:#aaa7a0;--lnh-rule:rgba(241,239,233,.13);--lnh-soft:rgba(241,239,233,.05);--lnh-shadow:0 1px 1px rgba(0,0,0,.3),0 14px 34px -12px rgba(0,0,0,.7);color-scheme:dark}
.lnh-root :where(*){box-sizing:border-box;margin:0;padding:0}
.lnh-root :where(button,input,textarea,select){font:inherit;color:inherit;background:none;border:0}
.lnh-root :where(a){color:inherit;text-decoration:none}
.lnh-root :where(svg){display:block;max-width:none}
.lnh-root :where(ul,ol){list-style:none}
.lnh-root :where(a,button,input,textarea,[tabindex]):focus-visible{outline:2px solid var(--lnh-accent);outline-offset:3px}
.lnh-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.lnh-skip{position:absolute;left:12px;top:-60px;z-index:60;background:var(--lnh-accent);color:var(--lnh-on);padding:10px 14px;font-weight:700;font-size:14px}
.lnh-skip:focus{top:12px}
.lnh-wrap{width:100%;max-width:1280px;margin:0 auto;padding:0 var(--lnh-pad)}

.lnh-stroke{fill:none;stroke-linecap:round;stroke-linejoin:round}
.lnh-written .lnh-stroke{stroke-dasharray:1 1;visibility:hidden}
.lnh-written{transition:opacity .45s ease}
.lnh-written.lnh-fade{opacity:0}
.lnh-arm{stroke-linecap:round;stroke-linejoin:round}
.lnh-arm .lnh-a-body{fill:var(--lnh-card);stroke:var(--lnh-line)}
.lnh-a-acc{fill:var(--lnh-accent)}
.lnh-a-sec{fill:var(--lnh-second)}
.lnh-a-line{fill:none;stroke:var(--lnh-line)}
.lnh-a-ink{fill:var(--lnh-line)}
.lnh-a-thin{stroke-width:1.2px;opacity:.55}
.lnh-tube-o{fill:none;stroke:var(--lnh-line);stroke-linecap:butt}
.lnh-tube-f{fill:none;stroke:var(--lnh-card);stroke-linecap:butt}
.lnh-tube-r{fill:none;stroke:var(--lnh-line);stroke-linecap:butt;opacity:.8}
.lnh-f-acc{fill:var(--lnh-accent)}
.lnh-f-sec{fill:var(--lnh-second)}
.lnh-f-card{fill:var(--lnh-card)}
.lnh-s-acc{stroke:var(--lnh-accent)}
.lnh-s-sec{stroke:var(--lnh-second)}
.lnh-cover-caps{font-family:var(--lnh-serif);font-size:11px;letter-spacing:.32em;fill:#2a8e89}
.lnh-line-art{fill:none;stroke:var(--lnh-line);stroke-width:2.2px;stroke-linecap:round;stroke-linejoin:round}
.lnh-line-art .lnh-thin{stroke-width:1.4px;opacity:.6}
.lnh-line-art .lnh-ink-blue{stroke:#2340b0;stroke-width:2px}
.lnh-root[data-theme="dark"] .lnh-line-art .lnh-ink-blue{stroke:#8ea4ff}
.lnh-a-pen{stroke:var(--lnh-line)}
.lnh-dash{fill:none;stroke:var(--lnh-accent);stroke-width:2px;stroke-dasharray:7 9;stroke-linecap:round}

.lnh-wr .lnh-stroke{stroke-dasharray:1 1}
.lnh-rv[data-armed] .lnh-wr .lnh-stroke{opacity:0}
.lnh-rv[data-in] .lnh-wr .lnh-stroke{animation-name:lnh-draw;animation-timing-function:linear;animation-fill-mode:both}
@keyframes lnh-draw{0%{stroke-dashoffset:1;opacity:0}.01%{opacity:1}100%{stroke-dashoffset:0;opacity:1}}
.lnh-rv[data-armed] .lnh-up{opacity:0;transform:translateY(18px)}
.lnh-rv[data-in] .lnh-up{opacity:1;transform:none;transition:opacity .7s var(--lnh-ease),transform .7s var(--lnh-ease)}
.lnh-rv[data-in] .lnh-up:nth-child(2){transition-delay:.08s}
.lnh-rv[data-in] .lnh-up:nth-child(3){transition-delay:.16s}
.lnh-rv[data-in] .lnh-up:nth-child(4){transition-delay:.24s}

.lnh-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;height:48px;padding:0 26px;background:var(--lnh-accent);color:var(--lnh-on);font-size:12.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;border-radius:2px;cursor:pointer;transition:transform .2s var(--lnh-ease),box-shadow .2s var(--lnh-ease),filter .2s;box-shadow:0 1px 0 rgba(0,0,0,.08)}
.lnh-btn:hover{transform:translateY(-2px);box-shadow:0 10px 22px -10px var(--lnh-accent);filter:saturate(1.08)}
.lnh-btn:active{transform:translateY(0) scale(.98);transition-duration:.08s}
.lnh-btn[disabled]{opacity:.6;cursor:default;transform:none}
.lnh-btn-ghost{background:transparent;color:var(--lnh-text);box-shadow:inset 0 0 0 1.5px var(--lnh-line)}
.lnh-btn-ghost:hover{box-shadow:inset 0 0 0 1.5px var(--lnh-line);background:var(--lnh-soft)}
.lnh-eyebrow{font-family:var(--lnh-serif);font-size:20px;line-height:1.2}
.lnh-h2{font-family:var(--lnh-serif);font-weight:400;font-size:clamp(34px,4.4vw,60px);line-height:1.04;letter-spacing:-.02em}
.lnh-lede{color:var(--lnh-muted);font-size:17px;max-width:46ch}
.lnh-sec{position:relative;padding:clamp(72px,10vw,140px) 0}
.lnh-sec-head{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,.8fr);gap:24px 64px;align-items:end;margin-bottom:clamp(36px,5vw,64px)}

/* nav */
.lnh-nav{position:sticky;top:0;z-index:40;height:var(--lnh-nav);background:color-mix(in srgb,var(--lnh-paper) 88%,transparent);backdrop-filter:saturate(1.4) blur(10px);-webkit-backdrop-filter:saturate(1.4) blur(10px);transition:box-shadow .3s}
.lnh-nav[data-stuck]{box-shadow:0 1px 0 var(--lnh-rule)}
.lnh-nav-in{height:var(--lnh-nav);display:flex;align-items:center;gap:28px}
.lnh-logo{display:flex;align-items:center;height:44px;flex:none}
.lnh-logo svg{height:44px;width:auto;overflow:visible}
.lnh-links{display:flex;align-items:center;gap:4px;margin:0 auto}
.lnh-link{position:relative;display:inline-flex;align-items:center;gap:6px;height:40px;padding:0 13px;font-size:14px;cursor:pointer;border-radius:2px;transition:color .2s}
.lnh-link::after{content:"";position:absolute;left:13px;right:13px;bottom:7px;height:1.5px;background:var(--lnh-accent);transform:scaleX(0);transform-origin:left;transition:transform .3s var(--lnh-ease)}
.lnh-link:hover::after,.lnh-link[aria-expanded="true"]::after{transform:scaleX(1)}
.lnh-link svg{width:10px;height:10px;transition:transform .25s var(--lnh-ease)}
.lnh-link[aria-expanded="true"] svg{transform:rotate(180deg)}
.lnh-drop{position:relative}
.lnh-menu{position:absolute;top:calc(100% + 10px);left:-8px;min-width:300px;background:var(--lnh-white);border:1px solid var(--lnh-rule);box-shadow:var(--lnh-shadow);padding:8px;border-radius:3px;opacity:0;transform:translateY(-6px);visibility:hidden;transition:opacity .18s,transform .22s var(--lnh-ease),visibility 0s .22s}
.lnh-menu[data-open]{opacity:1;transform:none;visibility:visible;transition:opacity .18s,transform .22s var(--lnh-ease)}
.lnh-menu a{display:block;padding:10px 12px;border-radius:2px;transition:background .15s}
.lnh-menu a:hover{background:var(--lnh-soft)}
.lnh-menu b{display:block;font-size:14px;font-weight:600}
.lnh-menu span{display:block;font-size:13px;color:var(--lnh-muted)}
.lnh-nav-end{display:flex;align-items:center;gap:10px;flex:none}
.lnh-signin{font-size:14px;padding:0 10px;height:40px;display:inline-flex;align-items:center}
.lnh-nav .lnh-btn{height:40px;padding:0 20px;font-size:12px}
.lnh-icon-btn{width:40px;height:40px;display:inline-grid;place-items:center;border-radius:50%;cursor:pointer;transition:background .2s}
.lnh-icon-btn:hover{background:var(--lnh-soft)}
.lnh-icon-btn svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.lnh-burger{display:none}
.lnh-sheet{position:fixed;inset:0;z-index:70;background:var(--lnh-paper);padding:20px var(--lnh-pad) 32px;display:flex;flex-direction:column;overflow-y:auto}
.lnh-sheet-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:28px}
.lnh-sheet a.lnh-sheet-link{display:block;font-family:var(--lnh-serif);font-size:30px;line-height:1.2;padding:10px 0;border-bottom:1px solid var(--lnh-rule)}
.lnh-sheet a.lnh-sheet-sub{display:block;font-size:15px;color:var(--lnh-muted);padding:8px 0 8px 14px}
.lnh-sheet .lnh-btn{margin-top:28px}

/* hero */
.lnh-hero{position:relative;background:var(--lnh-paper);min-height:clamp(640px,calc(var(--lnh-h) - var(--lnh-nav)),920px);overflow:clip;display:flex;align-items:center}
.lnh-hero-bg{position:absolute;left:0;top:0;width:100%;height:clamp(640px,calc(var(--lnh-h) - var(--lnh-nav)),920px);pointer-events:none}
.lnh-march{animation:lnh-march 40s linear infinite}
@keyframes lnh-march{to{stroke-dashoffset:-320}}
.lnh-hero-in{position:relative;width:100%;display:grid;grid-template-columns:minmax(0,.86fr) minmax(0,1.14fr);align-items:center;gap:0 24px}
.lnh-hero-copy{position:relative;z-index:2;padding:48px 0 96px}
.lnh-h1{font-family:var(--lnh-serif);font-weight:400;font-size:clamp(44px,5.7vw,86px);line-height:1.02;letter-spacing:-.025em}
.lnh-h1>span{display:block;white-space:nowrap}
.lnh-plus{display:inline-block;width:.62em;height:.62em;vertical-align:-.02em;margin:0 .06em}
.lnh-plus svg{width:100%;height:auto;overflow:visible}
.lnh-plus path{fill:none;stroke:var(--lnh-accent);stroke-width:7;stroke-linecap:round;stroke-dasharray:1 1;stroke-dashoffset:1;animation:lnh-plus .5s var(--lnh-ease) forwards}
.lnh-plus path+path{animation-delay:.55s}
.lnh-plus path:first-child{animation-delay:.3s}
@keyframes lnh-plus{to{stroke-dashoffset:0}}
.lnh-hero-cta{margin-top:clamp(28px,3.4vw,44px);display:flex;align-items:center;gap:18px}
.lnh-hero-note{margin-top:22px;font-size:16px;line-height:1.75;white-space:pre-line}
.lnh-hero-stage{position:relative;z-index:1;margin-right:calc(var(--lnh-pad) * -1 - 4vw)}
.lnh-hero-stage>svg{width:100%;height:auto;overflow:visible}
.lnh-letterhead{font-family:var(--lnh-serif);font-size:13px;letter-spacing:.22em;fill:#1f2b5c}
.lnh-smallcaps{font-family:var(--lnh-serif);font-size:8px;letter-spacing:.16em;fill:#1f2b5c;opacity:.75}

/* write */
.lnh-write{background:var(--lnh-white);padding:clamp(64px,8vw,110px) 0 clamp(80px,10vw,140px)}
.lnh-write-head{display:flex;flex-direction:column;align-items:center;text-align:center}
.lnh-wewrite{width:min(600px,100%);height:auto;overflow:visible;margin:-64px auto 4px;position:relative;z-index:0}
.lnh-write-head .lnh-eyebrow{position:relative;z-index:1}
.lnh-write-head .lnh-lede{margin:0 auto;text-align:center}
.lnh-composer{display:grid;grid-template-columns:330px minmax(0,1fr);gap:clamp(24px,4vw,64px);align-items:start;margin-top:clamp(40px,6vw,72px)}
.lnh-phone{position:relative;border:2px solid var(--lnh-line);border-radius:40px;padding:12px;background:var(--lnh-card)}
.lnh-phone::before{content:"";position:absolute;right:-6px;top:120px;width:4px;height:56px;border-radius:0 3px 3px 0;background:var(--lnh-line)}
.lnh-phone-in{border:1.5px solid var(--lnh-rule);border-radius:30px;padding:16px 16px 18px;background:var(--lnh-paper)}
.lnh-notch{width:92px;height:22px;border-radius:12px;background:var(--lnh-line);margin:0 auto 14px}
.lnh-app-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.lnh-app-top b{font-family:var(--lnh-serif);font-weight:400;font-size:22px}
.lnh-mono{width:30px;height:30px;border-radius:7px;background:var(--lnh-accent);display:grid;place-items:center}
.lnh-mono svg{width:20px;height:20px}
.lnh-field{display:block;margin-bottom:12px}
.lnh-field>span,.lnh-legend{display:flex;justify-content:space-between;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--lnh-muted);margin-bottom:6px}
.lnh-input{width:100%;background:var(--lnh-white);border:1.5px solid var(--lnh-rule);border-radius:10px;padding:10px 12px;font-size:15px;line-height:1.45;transition:border-color .2s,box-shadow .2s}
.lnh-input:focus{outline:none;border-color:var(--lnh-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--lnh-accent) 18%,transparent)}
.lnh-input:is(textarea){resize:none;min-height:116px;display:block}
.lnh-count{font-variant-numeric:tabular-nums;letter-spacing:.04em}
.lnh-count[data-near]{color:var(--lnh-accent)}
.lnh-opts{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
.lnh-chip{flex:1;min-width:0;display:grid;place-items:center;gap:2px;padding:6px 4px 5px;border-radius:10px;border:1.5px solid var(--lnh-rule);background:var(--lnh-white);cursor:pointer;font-size:11px;color:var(--lnh-muted);transition:border-color .2s,transform .2s var(--lnh-ease)}
.lnh-chip svg{width:58px;height:26px}
.lnh-chip:hover{transform:translateY(-1px)}
.lnh-chip[aria-checked="true"]{border-color:var(--lnh-accent);color:var(--lnh-text)}
.lnh-swatch{width:30px;height:30px;border-radius:50%;cursor:pointer;display:grid;place-items:center;border:1.5px solid var(--lnh-rule);background:#fbf8f1;transition:transform .2s var(--lnh-ease)}
.lnh-swatch i{width:18px;height:18px;border-radius:50%;display:block}
.lnh-swatch[aria-checked="true"]{border-color:var(--lnh-accent);transform:scale(1.08)}
.lnh-swatch[aria-disabled="true"]{opacity:.35;cursor:not-allowed}
.lnh-ink-row{display:flex;align-items:center;gap:8px;margin-bottom:12px}
.lnh-ink-row small{font-size:12px;color:var(--lnh-muted);margin-left:4px;line-height:1.3}
.lnh-thumbs{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:6px}
.lnh-thumb{aspect-ratio:7/5;border-radius:4px;overflow:hidden;cursor:pointer;outline:1.5px solid transparent;outline-offset:2px;transition:outline-color .2s,transform .2s var(--lnh-ease)}
.lnh-thumb svg{width:100%;height:auto}
.lnh-thumb:hover{transform:translateY(-1px)}
.lnh-thumb[aria-checked="true"]{outline-color:var(--lnh-accent)}
.lnh-desk{position:relative;min-width:0}
.lnh-stage{width:100%;height:auto;overflow:visible}
.lnh-stage-wrap{position:relative;background:var(--lnh-paper);border-radius:4px;overflow:clip;padding:0 2% 2%}
.lnh-status{display:flex;align-items:center;flex-wrap:wrap;gap:14px 20px;margin-top:18px}
.lnh-meter{flex:1;min-width:180px}
.lnh-meter-top{display:flex;justify-content:space-between;font-size:13px;color:var(--lnh-muted);margin-bottom:8px;font-variant-numeric:tabular-nums}
.lnh-meter-top b{color:var(--lnh-text);font-weight:600}
.lnh-bar{height:3px;background:var(--lnh-rule);border-radius:2px;overflow:hidden}
.lnh-bar i{display:block;height:3px;width:100%;background:var(--lnh-accent);transform-origin:left;transform:scaleX(0)}
.lnh-seg{display:inline-flex;border:1.5px solid var(--lnh-rule);border-radius:999px;padding:3px}
.lnh-seg button{height:30px;padding:0 13px;border-radius:999px;font-size:13px;cursor:pointer;color:var(--lnh-muted);transition:background .2s,color .2s}
.lnh-seg button[aria-checked="true"]{background:var(--lnh-text);color:var(--lnh-white)}
.lnh-actions{display:flex;gap:10px;align-items:center}
.lnh-sent{font-size:14px;color:var(--lnh-muted);min-height:22px;margin-top:10px}
.lnh-sent[data-tone="ok"]{color:var(--lnh-text)}
.lnh-sent[data-tone="err"]{color:var(--lnh-accent)}

/* how */
.lnh-how{background:var(--lnh-paper)}
.lnh-steps{position:relative;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(20px,4vw,56px)}
.lnh-path{position:absolute;left:0;top:0;width:100%;height:220px;overflow:visible;pointer-events:none}
.lnh-step{position:relative;z-index:1}
.lnh-step-art{width:100%;max-width:300px;height:auto;aspect-ratio:240/170;overflow:visible;margin-bottom:18px}
.lnh-step-n{font-family:var(--lnh-serif);font-size:15px;color:var(--lnh-accent);margin-bottom:6px;font-variant-numeric:oldstyle-nums}
.lnh-step h3{font-family:var(--lnh-serif);font-weight:400;font-size:28px;line-height:1.15;margin-bottom:10px}
.lnh-step p{color:var(--lnh-muted);max-width:34ch}
.lnh-caret{animation:lnh-blink 1s steps(1) infinite}
@keyframes lnh-blink{50%{opacity:0}}
.lnh-bob{animation:lnh-bob 1.6s ease-in-out infinite;transform-box:fill-box;transform-origin:100% 0}
@keyframes lnh-bob{0%,100%{transform:rotate(0)}50%{transform:rotate(-7deg)}}
.lnh-scribble{stroke-dasharray:1 1;animation:lnh-scribble 3.2s linear infinite}
@keyframes lnh-scribble{0%{stroke-dashoffset:1}60%,100%{stroke-dashoffset:0}}

/* cards */
.lnh-cards{background:var(--lnh-white)}
.lnh-tabs{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:36px}
.lnh-tab{height:38px;padding:0 16px;border-radius:999px;border:1.5px solid var(--lnh-rule);font-size:14px;cursor:pointer;transition:background .2s,color .2s,border-color .2s}
.lnh-tab:hover{border-color:var(--lnh-line)}
.lnh-tab[aria-selected="true"]{background:var(--lnh-text);color:var(--lnh-white);border-color:var(--lnh-text)}
.lnh-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:clamp(18px,2.4vw,32px) clamp(14px,2vw,28px)}
.lnh-cardbox{display:flex;flex-direction:column;gap:12px;animation:lnh-in .5s var(--lnh-ease) both}
@keyframes lnh-in{from{opacity:0;transform:translateY(10px)}}
.lnh-fold{position:relative;aspect-ratio:7/5;perspective:1200px;cursor:pointer}
.lnh-cover{position:absolute;left:0;top:0;width:100%;aspect-ratio:7/5;border-radius:2px}
.lnh-face,.lnh-back{box-shadow:var(--lnh-shadow)}
.lnh-cover svg{width:100%;height:auto}
.lnh-fold{display:block;width:100%;padding:0;text-align:left}
.lnh-cover{transform-origin:50% 50%;transform-style:preserve-3d;transition:transform .8s var(--lnh-ease)}
.lnh-face,.lnh-back{position:absolute;left:0;top:0;width:100%;aspect-ratio:7/5;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:2px;overflow:hidden}
.lnh-back{transform:rotateY(180deg)}
.lnh-back svg{width:100%;height:auto}
.lnh-fold:hover .lnh-cover,.lnh-fold[aria-pressed="true"] .lnh-cover{transform:rotateY(180deg)}
.lnh-card-meta{display:flex;justify-content:space-between;align-items:baseline;gap:10px}
.lnh-card-meta b{font-weight:600;font-size:15px}
.lnh-card-meta span{font-size:13px;color:var(--lnh-muted);white-space:nowrap}
.lnh-use{align-self:flex-start;font-size:13px;font-weight:600;display:inline-flex;align-items:center;gap:6px;padding:4px 0;cursor:pointer;border-bottom:1.5px solid var(--lnh-accent)}
.lnh-use svg{width:14px;height:10px;transition:transform .25s var(--lnh-ease)}
.lnh-use:hover svg{transform:translateX(3px)}

/* integrations */
.lnh-int{background:var(--lnh-paper)}
.lnh-int-grid{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:clamp(28px,5vw,80px);align-items:center}
.lnh-recipes{display:flex;flex-direction:column;border-top:1px solid var(--lnh-rule)}
.lnh-recipe{display:grid;grid-template-columns:44px 1fr auto;align-items:center;gap:14px;text-align:left;padding:16px 4px;border-bottom:1px solid var(--lnh-rule);cursor:pointer;transition:background .2s}
.lnh-recipe svg{width:40px;height:40px;stroke:var(--lnh-line);stroke-width:2}
.lnh-recipe b{display:block;font-weight:600;font-size:15px}
.lnh-recipe span{display:block;font-size:14px;color:var(--lnh-muted)}
.lnh-recipe i{width:10px;height:10px;border-radius:50%;border:1.5px solid var(--lnh-rule);transition:background .2s,border-color .2s}
.lnh-recipe:hover{background:var(--lnh-soft)}
.lnh-recipe[aria-selected="true"] i{background:var(--lnh-accent);border-color:var(--lnh-accent)}
.lnh-recipe[aria-selected="true"] svg{stroke:var(--lnh-accent)}
.lnh-flow{width:100%;height:auto;overflow:visible}
.lnh-flow-dash{fill:none;stroke:var(--lnh-accent);stroke-width:2.2;stroke-dasharray:6 8;stroke-linecap:round;animation:lnh-flow 1.4s linear infinite}
@keyframes lnh-flow{to{stroke-dashoffset:-28}}
.lnh-node{fill:var(--lnh-card);stroke:var(--lnh-line);stroke-width:2}
.lnh-node-icon{fill:none;stroke:var(--lnh-line);stroke-width:2}
.lnh-flow-label{font-size:12px;fill:var(--lnh-muted);font-family:var(--lnh-sans);letter-spacing:.08em;text-transform:uppercase}
.lnh-flow-detail{margin-top:14px;font-size:14px;color:var(--lnh-muted);text-align:center}
.lnh-flow-detail b{color:var(--lnh-text);font-weight:600}
.lnh-legend-hi{display:inline-block;width:18px;height:3px;background:var(--lnh-accent);vertical-align:middle;margin:0 6px 2px 0}

/* pricing */
.lnh-price{background:var(--lnh-white)}
.lnh-price-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,.86fr);gap:clamp(28px,5vw,80px);align-items:start}
.lnh-products{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:34px}
.lnh-product{text-align:left;padding:16px 16px 14px;border:1.5px solid var(--lnh-rule);border-radius:4px;cursor:pointer;transition:border-color .2s,transform .2s var(--lnh-ease)}
.lnh-product:hover{transform:translateY(-2px)}
.lnh-product[aria-checked="true"]{border-color:var(--lnh-accent);box-shadow:inset 0 0 0 1px var(--lnh-accent)}
.lnh-product b{display:block;font-weight:600}
.lnh-product span{display:block;font-size:13px;color:var(--lnh-muted)}
.lnh-product em{display:block;font-style:normal;font-family:var(--lnh-serif);font-size:20px;margin-top:10px}
.lnh-qty{display:flex;align-items:baseline;justify-content:space-between;gap:16px;margin-bottom:14px}
.lnh-qty label{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--lnh-muted)}
.lnh-qty input{width:120px;text-align:right;font-family:var(--lnh-serif);font-size:34px;border-bottom:1.5px solid var(--lnh-rule);padding:2px 0;font-variant-numeric:tabular-nums}
.lnh-qty input:focus{outline:none;border-color:var(--lnh-accent)}
.lnh-range{width:100%;-webkit-appearance:none;appearance:none;height:28px;background:transparent;cursor:pointer}
.lnh-range::-webkit-slider-runnable-track{height:3px;border-radius:2px;background:linear-gradient(90deg,var(--lnh-accent) var(--lnh-fill),var(--lnh-rule) var(--lnh-fill))}
.lnh-range::-moz-range-track{height:3px;border-radius:2px;background:var(--lnh-rule)}
.lnh-range::-moz-range-progress{height:3px;background:var(--lnh-accent)}
.lnh-range::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;margin-top:-9.5px;border-radius:50%;background:var(--lnh-white);border:2px solid var(--lnh-line);box-shadow:0 2px 6px rgba(0,0,0,.15)}
.lnh-range::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:var(--lnh-white);border:2px solid var(--lnh-line)}
.lnh-ticks{display:grid;grid-template-columns:repeat(4,1fr);margin-top:18px;border-top:1px solid var(--lnh-rule)}
.lnh-tick{padding:12px 4px 0;font-size:13px;color:var(--lnh-muted);transition:color .2s}
.lnh-tick b{display:block;font-family:var(--lnh-serif);font-weight:400;font-size:20px;color:var(--lnh-text);opacity:.45;transition:opacity .2s}
.lnh-tick[data-on]{color:var(--lnh-text)}
.lnh-tick[data-on] b{opacity:1;color:var(--lnh-accent)}
.lnh-toggle{display:flex;align-items:center;gap:12px;margin-top:26px;cursor:pointer;font-size:15px}
.lnh-toggle input{position:absolute;opacity:0;width:1px;height:1px}
.lnh-switch{width:42px;height:24px;border-radius:999px;background:var(--lnh-rule);position:relative;flex:none;transition:background .2s}
.lnh-switch::after{content:"";position:absolute;left:3px;top:3px;width:18px;height:18px;border-radius:50%;background:var(--lnh-white);box-shadow:0 1px 3px rgba(0,0,0,.2);transition:transform .25s var(--lnh-ease)}
.lnh-toggle input:checked+.lnh-switch{background:var(--lnh-accent)}
.lnh-toggle input:checked+.lnh-switch::after{transform:translateX(18px)}
.lnh-toggle input:focus-visible+.lnh-switch{outline:2px solid var(--lnh-accent);outline-offset:3px}
.lnh-toggle small{display:block;color:var(--lnh-muted);font-size:13px}
.lnh-receipt{position:relative;background:#fdfcf8;color:#1c1c1e;padding:30px 30px 34px;box-shadow:var(--lnh-shadow);transform:rotate(1deg)}
.lnh-receipt::after{content:"";position:absolute;left:0;right:0;bottom:-8px;height:8px;background:radial-gradient(circle at 6px 0,#fdfcf8 6px,transparent 6.5px) 0 0/12px 8px repeat-x}
.lnh-receipt-top{display:flex;justify-content:space-between;align-items:center;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#6b6862;padding-bottom:18px;border-bottom:1.5px dashed rgba(0,0,0,.18)}
.lnh-big{font-family:var(--lnh-serif);font-size:clamp(56px,6vw,84px);line-height:1;letter-spacing:-.03em;margin:22px 0 6px;font-variant-numeric:lining-nums tabular-nums}
.lnh-big small{font-size:.3em;letter-spacing:0;color:#6b6862;margin-left:8px}
.lnh-rows{margin:20px 0 22px;border-top:1.5px dashed rgba(0,0,0,.18)}
.lnh-rows div{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(0,0,0,.08);font-size:14.5px;font-variant-numeric:tabular-nums}
.lnh-rows div span{color:#6b6862}
.lnh-rows .lnh-total{font-weight:700;font-size:17px;border-bottom:0}
.lnh-save{font-size:13.5px;color:#6b6862;min-height:20px;margin-bottom:20px}
.lnh-save b{color:#1c1c1e}
.lnh-receipt .lnh-btn{width:100%}
.lnh-scrawl{position:absolute;right:20px;top:64px;width:150px;height:auto;transform:rotate(-5deg)}

/* quotes */
.lnh-quotes{background:var(--lnh-paper);overflow:clip}
.lnh-track{display:flex;gap:clamp(18px,2.6vw,36px);overflow-x:auto;scroll-snap-type:x mandatory;padding:28px var(--lnh-pad) 44px;margin:0 calc(var(--lnh-pad) * -1);scrollbar-width:none}
.lnh-track::-webkit-scrollbar{display:none}
.lnh-note{flex:0 0 min(420px,82vw);scroll-snap-align:center;display:flex;flex-direction:column;gap:16px}
.lnh-note-card{position:relative;background:#fffdf8;box-shadow:var(--lnh-shadow);aspect-ratio:7/5;transition:transform .5s var(--lnh-ease)}
.lnh-note:nth-child(odd) .lnh-note-card{transform:rotate(-1.6deg)}
.lnh-note:nth-child(even) .lnh-note-card{transform:rotate(1.4deg)}
.lnh-note:hover .lnh-note-card{transform:rotate(0) translateY(-4px)}
.lnh-note-card svg{width:100%;height:auto}
.lnh-note-card::before{content:"";position:absolute;left:50%;top:-11px;width:84px;height:22px;transform:translateX(-50%) rotate(-2deg);background:color-mix(in srgb,var(--lnh-second) 55%,transparent);opacity:.85}
.lnh-note b{display:block;font-weight:600}
.lnh-note span{font-size:14px;color:var(--lnh-muted)}
.lnh-quotes-nav{display:flex;gap:10px}
.lnh-round{width:46px;height:46px;border-radius:50%;border:1.5px solid var(--lnh-line);display:grid;place-items:center;cursor:pointer;transition:background .2s,color .2s,transform .2s var(--lnh-ease)}
.lnh-round:hover{background:var(--lnh-text);color:var(--lnh-white)}
.lnh-round:active{transform:scale(.94)}
.lnh-round svg{width:18px;height:14px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}

/* faq */
.lnh-faq{background:var(--lnh-white)}
.lnh-faq-grid{display:grid;grid-template-columns:minmax(0,.7fr) minmax(0,1.3fr);gap:clamp(28px,5vw,80px)}
.lnh-postit{display:block;width:240px;margin-top:40px;background:#fffdf4;box-shadow:var(--lnh-shadow);transform:rotate(-2.5deg);transition:transform .4s var(--lnh-ease)}
.lnh-postit:hover{transform:rotate(0) translateY(-3px)}
.lnh-postit svg{width:100%;height:auto}
.lnh-qa{border-top:1px solid var(--lnh-rule)}
.lnh-qa:last-child{border-bottom:1px solid var(--lnh-rule)}
.lnh-q{width:100%;display:flex;justify-content:space-between;align-items:center;gap:20px;text-align:left;padding:22px 0;cursor:pointer;font-family:var(--lnh-serif);font-size:clamp(19px,1.8vw,23px);line-height:1.3}
.lnh-q svg{width:22px;height:22px;flex:none;fill:none;stroke:var(--lnh-accent);stroke-width:2.4;stroke-linecap:round;transition:transform .35s var(--lnh-ease)}
.lnh-q[aria-expanded="true"] svg{transform:rotate(45deg)}
.lnh-a{display:grid;grid-template-rows:0fr;transition:grid-template-rows .4s var(--lnh-ease)}
.lnh-a[data-open]{grid-template-rows:1fr}
.lnh-a>div{overflow:hidden}
.lnh-a p{padding:0 0 24px;color:var(--lnh-muted);max-width:62ch}

/* samples + footer */
.lnh-samples{background:#23272b;color:#f4f2ea;overflow:clip}
.lnh-root[data-theme="dark"] .lnh-samples{background:#0d0e10}
.lnh-samples-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:clamp(28px,5vw,80px);align-items:center}
.lnh-samples .lnh-h2{color:#f4f2ea}
.lnh-samples p{color:rgba(244,242,234,.72);max-width:44ch;margin-top:18px}
.lnh-thanks{width:100%;max-width:560px;height:auto;overflow:visible;margin-bottom:8px}
.lnh-form{display:flex;flex-direction:column;gap:12px}
.lnh-fan{width:100%;max-width:520px;height:auto;overflow:visible;margin:0 auto 28px}
.lnh-fan-card{transform:translate(var(--x),40px) rotate(var(--r));transform-box:fill-box;transform-origin:50% 50%;transition:transform .6s var(--lnh-ease)}
.lnh-fan:hover .lnh-fan-card{transform:translate(calc(var(--x) * 1.08 - 10px),26px) rotate(calc(var(--r) * 1.5))}
.lnh-form .lnh-input{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.18);color:#f4f2ea;height:52px;border-radius:3px}
.lnh-form .lnh-input::placeholder{color:rgba(244,242,234,.5)}
.lnh-form-msg{font-size:14px;min-height:22px;color:rgba(244,242,234,.8)}
.lnh-form-msg[data-tone="err"]{color:#ff9c86}
.lnh-foot{background:var(--lnh-paper);padding:64px 0 32px}
.lnh-foot-grid{display:grid;grid-template-columns:minmax(0,1.3fr) repeat(3,minmax(0,.6fr));gap:32px}
.lnh-foot h4{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--lnh-muted);margin-bottom:14px}
.lnh-foot li a{display:inline-block;padding:4px 0;font-size:15px;transition:color .2s}
.lnh-foot li a:hover{color:var(--lnh-accent)}
.lnh-foot-note{font-family:var(--lnh-serif);font-size:20px;margin-top:14px;max-width:22ch}
.lnh-foot-base{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-top:56px;padding-top:22px;border-top:1px solid var(--lnh-rule);font-size:13px;color:var(--lnh-muted)}

@media (max-width:1080px){
.lnh-links,.lnh-signin{display:none}
.lnh-burger{display:inline-grid}
.lnh-nav-end{margin-left:auto}
.lnh-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
.lnh-composer{grid-template-columns:300px minmax(0,1fr)}
}
@media (max-width:820px){
.lnh-root{--lnh-nav:64px}
.lnh-hero{display:block}
.lnh-hero-in{grid-template-columns:1fr}
.lnh-hero-copy{padding:44px 0 8px}
.lnh-hero-stage{margin:0 -14% 0 -6%}
.lnh-sec-head,.lnh-int-grid,.lnh-price-grid,.lnh-faq-grid,.lnh-samples-grid{grid-template-columns:1fr}
.lnh-composer{grid-template-columns:1fr}
.lnh-phone{max-width:360px;width:100%;margin:0 auto}
.lnh-wewrite{margin-top:18px}
.lnh-hero-aside{display:none}
.lnh-hero-stage>svg{overflow:hidden}
.lnh-steps{grid-template-columns:1fr;gap:40px}
.lnh-path{display:none}
.lnh-step{display:grid;grid-template-columns:120px 1fr;gap:18px;align-items:start}
.lnh-step-art{margin:0}
.lnh-foot-grid{grid-template-columns:1fr 1fr}
.lnh-foot-grid>div:first-child{grid-column:1/-1}
.lnh-nav .lnh-btn{display:none}
}
@media (max-width:520px){
.lnh-products{grid-template-columns:1fr}
.lnh-grid{gap:22px 12px}
.lnh-card-meta{flex-direction:column;gap:2px}
.lnh-receipt{transform:none}
}
@media (prefers-reduced-motion:reduce){
.lnh-root *{animation:none!important;transition:none!important}
.lnh-plus path{stroke-dashoffset:0}
.lnh-scribble{stroke-dashoffset:0}
}
`

/* ---------- stage geometry ---------- */

function shift(m: number[], x: number, y: number) {
  return [m[0], m[1], m[2], m[3], m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]
}

// The hero letter's writing box sits at (46, -118) inside an envelope placed at (150, 230), tipped -6 degrees.
const HERO_GEO = {
  bx: 430,
  by: -230,
  l1: 240,
  l2: 260,
  bend: -1,
  m: shift(placeMatrix(150, 230, -6), 46, -118),
  park: [262, -34],
  pen: 44,
  penAngle: -62,
  tube: "M430 -230C430 -270 450 -290 470 -320",
  housing: -90,
  k: 0.82,
}
const HERO_BOX = { w: 268, h: 168 }

const WE_GEO = {
  bx: 580,
  by: 130,
  l1: 250,
  l2: 230,
  bend: 1,
  m: [1, 0, 0, 1, 0, 64],
  park: [520, 10],
  pen: 50,
  penAngle: -58,
  tube: "M580 130C630 122 652 84 720 62",
  housing: -12,
  k: 0.86,
  tone: "second" as const,
}

// The composer card's writing box: 484 x 314 at (118, 178) on a 720 x 600 desk.
const DESK_GEO = {
  bx: 368,
  by: 64,
  l1: 252,
  l2: 232,
  bend: -1,
  m: [1, 0, 0, 1, 118, 178],
  park: [446, -66],
  pen: 58,
  penAngle: -58,
  tube: "M368 64C368 6 430 -26 540 -44",
  housing: -90,
  k: 1,
}
const DESK_BOX = { w: 484, h: 314 }
const DESK_SIZES = [30, 27, 24, 21, 19, 17, 15]

function swash(x0: number, x1: number, y: number) {
  const pts = [] as number[]
  for (let x = x0; x <= x1; x += 6) {
    const t = (x - x0) / (x1 - x0)
    pts.push(x, y + Math.sin(t * Math.PI * 1.6 + 0.4) * 5 - t * 6)
  }
  return makeStroke(pts, 9999)
}

const Chevron = () => (
  <svg viewBox="0 0 10 10" aria-hidden="true">
    <path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const Arrow = ({ flip }: { flip?: boolean }) => (
  <svg viewBox="0 0 18 14" aria-hidden="true" style={flip ? { transform: "scaleX(-1)" } : undefined}>
    <path d="M1 7h15M11 2l5 5-5 5" />
  </svg>
)

export default function LonghandNotesLanding({
  brand = "longhand",
  links = DEFAULT_LINKS,
  signIn = { label: "Sign in", href: "#" },
  signUp = { label: "Sign up", href: "#samples" },
  hero,
  composer,
  steps,
  cards,
  integrations,
  pricing,
  quotes,
  faq,
  samples,
  footer,
  currency = "$",
  palette = "studio",
  theme = "system",
  themeToggle = true,
  onSend,
  onRequestSamples,
  onStart,
  height = "100svh",
  className,
}: LonghandNotesLandingProps) {
  const rootRef = React.useRef(null as HTMLDivElement | null)
  const reduced = useReducedMotion()
  const [dark, setDark] = useTheme(theme)
  const pal = resolvePalette(palette)
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "")

  const H = { ...DEFAULT_HERO, ...(hero || {}) }
  const C = composer === null ? null : { ...DEFAULT_COMPOSER, ...(composer || {}) }
  const ST = steps === null ? null : { title: "From keyboard to mailbox.", items: DEFAULT_STEPS, ...(steps || {}) }
  const CD = cards === null ? null : { title: "Cards worth keeping.", text: "Printed on heavy, uncoated stock that takes ink the way a pen expects. Hover or tap a card to turn it over.", items: DEFAULT_CARDS, ...(cards || {}) }
  const IN = integrations === null ? null : { title: "Send from the tools you already use.", text: "Pick a trigger and a template once. Every time it fires, a robot picks up a pen.", items: DEFAULT_RECIPES, ...(integrations || {}) }
  const PR = pricing === null ? null : { title: "Price it out.", text: "Pay per card, with no subscription. The more you send, the less each one costs.", products: DEFAULT_PRODUCTS, tiers: DEFAULT_TIERS, postage: 0.73, ...(pricing || {}) }
  const QT = quotes === null ? null : { title: "Notes from our customers.", items: DEFAULT_QUOTES, ...(quotes || {}) }
  const FQ = faq === null ? null : { title: "Questions, answered by hand.", items: DEFAULT_FAQ, ...(faq || {}) }
  const SM = samples === null ? null : { ...DEFAULT_SAMPLES, ...(samples || {}) }
  const FT = footer === null ? null : { ...DEFAULT_FOOTER, ...(footer || {}) }
  const cardItems = (CD && CD.items.length ? CD.items : DEFAULT_CARDS) as LnhCard[]
  const products = PR ? PR.products : DEFAULT_PRODUCTS
  const tiers = PR ? PR.tiers : DEFAULT_TIERS
  const lowest = lowestPrice(products, tiers)

  useReveal(rootRef, reduced)

  const alive = React.useRef(true)
  React.useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const recipes = (IN && IN.items.length ? IN.items : DEFAULT_RECIPES) as LnhRecipe[]
  const [ri, setRi] = React.useState(0)

  /* ---------- nav ---------- */
  const [menu, setMenu] = React.useState(false)
  const [drop, setDrop] = React.useState("")
  const [stuck, setStuck] = React.useState(false)
  const menuBtn = React.useRef(null as HTMLButtonElement | null)
  const sheetRef = React.useRef(null as HTMLDivElement | null)
  const navRef = React.useRef(null as HTMLElement | null)

  const go = (href?: string, label?: string) => (e: React.MouseEvent) => {
    setDrop("")
    if (label && href === "#integrations") {
      // "CRM", "Storefront"... in the menu open that recipe
      const i = recipes.findIndex((r) => (r.source + " " + r.id).toLowerCase().indexOf(label.toLowerCase()) > -1)
      if (i > -1) setRi(i)
    }
    if (!href || href.charAt(0) !== "#" || href.length < 2) return
    const el = rootRef.current && rootRef.current.querySelector('[data-sec="' + href.slice(1) + '"]')
    if (!el) return
    e.preventDefault()
    setMenu(false)
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" })
  }

  React.useEffect(() => {
    // capture, so it also follows a scrolling container (app shells, previews)
    const on = () => {
      const r = rootRef.current
      setStuck(!!r && r.getBoundingClientRect().top < -8)
    }
    on()
    document.addEventListener("scroll", on, { passive: true, capture: true })
    return () => document.removeEventListener("scroll", on, { capture: true })
  }, [])

  React.useEffect(() => {
    if (!drop) return
    const out = (e: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setDrop("")
    }
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrop("")
    }
    document.addEventListener("pointerdown", out)
    document.addEventListener("keydown", key)
    return () => {
      document.removeEventListener("pointerdown", out)
      document.removeEventListener("keydown", key)
    }
  }, [drop])

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

  const logo = cachedLayout("logo|" + brand, () => layoutText([{ text: brand }], "script", 44, 4000))
  const Logo = (
    <svg viewBox={"-4 -2 " + (logo.width + 10) + " 58"} aria-hidden="true">
      <path d={joinStrokes(logo.strokes)} className="lnh-stroke" stroke="currentColor" strokeWidth={2.1} />
    </svg>
  )

  /* ---------- hero ---------- */
  const stageRef = React.useRef(null as SVGSVGElement | null)
  const heroSeen = useOnScreen(stageRef)
  const letters = H.letters && H.letters.length ? H.letters : DEFAULT_HERO.letters
  const [li, setLi] = React.useState(0)
  const [heroFade, setHeroFade] = React.useState(false)
  const heroTimers = React.useRef([] as number[])
  const letter = letters[li % letters.length]
  const envelopes = (H.envelopes || DEFAULT_HERO.envelopes).slice(0, 3)
  const heroHand = H.hand || "casual"
  const heroInk = INKS[H.ink || "blue"] || INKS.blue
  const heroLayout = React.useMemo(
    () => fitLayout([{ text: letter.greeting }, { text: letter.body }, { text: letter.sign, align: "right" }], heroHand, HERO_BOX.w, HERO_BOX.h, [22, 21, 20, 19, 18, 17, 16, 15, 14], 1.28),
    [letter.greeting, letter.body, letter.sign, heroHand]
  )
  const heroOn = React.useRef(false)
  heroOn.current = heroSeen.now
  const heroDone = React.useCallback(() => {
    if (reduced || letters.length < 2) return
    heroTimers.current.forEach((t) => clearTimeout(t))
    const later = (f: () => void, ms: number) => heroTimers.current.push(window.setTimeout(f, ms))
    heroTimers.current = []
    later(() => {
      // off screen: leave the finished letter and pick the cycle up when it is seen again
      if (!heroOn.current) return
      setHeroFade(true)
      later(() => {
        setLi((i) => i + 1)
        setHeroFade(false)
      }, 480)
    }, 3400)
  }, [reduced, letters.length])
  React.useEffect(() => () => heroTimers.current.forEach((t) => clearTimeout(t)), [])

  const titleLines = H.title.split("\n")
  const note = H.note.replace("{price}", money(lowest, currency))

  /* ---------- write ---------- */
  const weRef = React.useRef(null as SVGSVGElement | null)
  const weSeen = useOnScreen(weRef, "0px 0px -15% 0px")
  const weStrokes = React.useMemo(() => {
    if (!C || !weSeen.seen) return [] as LnhStroke[]
    const l = layoutText([{ text: C.title, align: "center" }], "script", 104, 600)
    return l.strokes.concat([swash(150, 470, 152)])
  }, [C && C.title, weSeen.seen])

  const [greet, setGreet] = React.useState(C ? C.greeting : "")
  const [msg, setMsg] = React.useState(C ? C.message : "")
  const [sign, setSign] = React.useState(C ? C.signoff : "")
  const [hand, setHand] = React.useState((C ? C.hand : "script") as LnhHandName)
  const [inkName, setInkName] = React.useState((C ? C.ink : "blue") as LnhInkName)
  const [cardId, setCardId] = React.useState(cardItems[1] ? cardItems[1].id : cardItems[0].id)
  const [pace, setPace] = React.useState("pen" as keyof typeof PACES)
  const [epoch, setEpoch] = React.useState(0)
  const [draft, setDraft] = React.useState({ greet, msg, sign })
  React.useEffect(() => {
    const t = window.setTimeout(() => setDraft({ greet, msg, sign }), 380)
    return () => clearTimeout(t)
  }, [greet, msg, sign])
  const card = cardItems.find((c) => c.id === cardId) || cardItems[0]
  const chalk = card.stock === "chalk"
  const inkColor = chalk ? INKS.white : INKS[inkName]
  const deskRef = React.useRef(null as SVGSVGElement | null)
  const deskSeen = useOnScreen(deskRef)
  const deskLayout = React.useMemo(() => {
    const paras = [] as LnhPara[]
    if (draft.greet.trim()) paras.push({ text: draft.greet.trim() })
    if (draft.msg.trim()) paras.push({ text: draft.msg.trim() })
    if (draft.sign.trim()) paras.push({ text: draft.sign.trim(), align: "right" })
    return fitLayout(paras, hand, DESK_BOX.w, DESK_BOX.h, DESK_SIZES)
  }, [draft, hand])
  const deskStrokes = deskSeen.seen ? deskLayout.strokes : ([] as LnhStroke[])
  const secs = Math.round(writeSeconds(deskLayout.strokes, deskLayout.size, PACES.pen))
  const barRef = React.useRef(null as HTMLElement | null)
  const pctRef = React.useRef(null as HTMLElement | null)
  const onDeskTick = React.useCallback((f: number) => {
    if (barRef.current) barRef.current.style.transform = "scaleX(" + f.toFixed(4) + ")"
    if (pctRef.current) pctRef.current.textContent = f >= 1 ? "Written" : "Writing " + Math.round(f * 100) + "%"
  }, [])
  const [sendState, setSendState] = React.useState("idle" as "idle" | "busy" | "done" | "error")
  React.useEffect(() => setSendState("idle"), [greet, msg, sign, hand, inkName, cardId])
  const doSend = async () => {
    if (sendState === "busy" || !C) return
    setSendState("busy")
    let ok = true
    try {
      if (onSend) {
        const res = await onSend({ greeting: greet, message: msg, signoff: sign, hand, ink: chalk ? "white" : inkName, card })
        if (res === false) ok = false
      } else await new Promise((r) => setTimeout(r, 700))
    } catch {
      ok = false
    }
    if (alive.current) setSendState(ok ? "done" : "error")
  }
  const writeOn = (id: string) => (e: React.MouseEvent) => {
    setCardId(id)
    go("#write")(e)
  }
  const handPreview = (h: LnhHandName) => cachedLayout("aa|" + h, () => layoutText([{ text: "Aa" }], h, 26, 400))

  /* ---------- how ---------- */
  const howRef = React.useRef(null as HTMLDivElement | null)
  const howPath = React.useRef(null as SVGPathElement | null)
  const howEnv = React.useRef(null as SVGGElement | null)
  const howMask = React.useRef(null as SVGPathElement | null)
  React.useEffect(() => {
    const box = howRef.current
    if (!box || !ST) return
    let raf = 0
    const run = () => {
      raf = 0
      const p = howPath.current
      if (!p) return
      const r = box.getBoundingClientRect()
      const vh = window.innerHeight || 800
      const f = reduced ? 1 : Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (vh * 0.75)))
      const L = p.getTotalLength()
      if (howMask.current) howMask.current.style.strokeDashoffset = String(1 - f)
      const pt = p.getPointAtLength(L * f)
      const pt2 = p.getPointAtLength(Math.min(L, L * f + 2))
      const a = (Math.atan2(pt2.y - pt.y, pt2.x - pt.x) * RAD).toFixed(1)
      if (howEnv.current) {
        howEnv.current.setAttribute("transform", "translate(" + pt.x.toFixed(1) + " " + pt.y.toFixed(1) + ") rotate(" + a + ")")
        howEnv.current.style.opacity = f > 0.01 && f < 0.99 ? "1" : "0"
      }
    }
    const on = () => {
      if (!raf) raf = requestAnimationFrame(run)
    }
    run()
    window.addEventListener("scroll", on, { passive: true })
    window.addEventListener("resize", on)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener("scroll", on)
      window.removeEventListener("resize", on)
    }
  }, [reduced, !!ST])

  /* ---------- cards ---------- */
  const cats = ["All"].concat(Array.from(new Set(cardItems.map((c) => c.category))))
  const [cat, setCat] = React.useState("All")
  const [flipped, setFlipped] = React.useState("")
  const tabRefs = React.useRef([] as (HTMLButtonElement | null)[])
  const shown = cat === "All" ? cardItems : cardItems.filter((c) => c.category === cat)
  const cardPrice = (c: LnhCard) => (c.price != null ? c.price : lowest)

  /* ---------- integrations ---------- */
  const recipe = recipes[Math.min(ri, recipes.length - 1)]
  const recipeRefs = React.useRef([] as (HTMLButtonElement | null)[])
  const merged = React.useMemo(() => {
    const parts = fillMerge(recipe.note, recipe.sample)
    let text = ""
    const ranges = [] as number[][]
    for (const p of parts) {
      if (p.hi) ranges.push([text.length, text.length + p.text.length])
      text += p.text
    }
    const lay = fitLayout([{ text }, { text: recipe.sign, align: "right" }], "casual", 300, 150, [21, 19, 17, 15], 1.32)
    let base = ""
    let hi = ""
    for (const s of lay.strokes) {
      if (ranges.some((r) => s.ci >= r[0] && s.ci < r[1])) hi += s.d
      else base += s.d
    }
    return { base, hi }
  }, [recipe])

  /* ---------- pricing ---------- */
  const [pid, setPid] = React.useState(products[0] ? products[0].id : "")
  const [qty, setQty] = React.useState(250)
  const [qtyText, setQtyText] = React.useState("250")
  const [postage, setPostage] = React.useState(true)
  const product = products.find((p) => p.id === pid) || products[0]
  const post = PR && postage ? PR.postage : 0
  const each = unitPrice(product.base, qty, tiers, post)
  const tier = tierFor(qty, tiers)
  const nxt = nextTier(qty, tiers)
  const cardOnly = round2(product.base * (1 - tier.off))
  const setQ = (q: number) => {
    const v = Math.max(1, Math.min(10000, Math.round(q) || 1))
    setQty(v)
    setQtyText(String(v))
  }

  /* ---------- quotes ---------- */
  const trackRef = React.useRef(null as HTMLDivElement | null)
  const slide = (d: number) => {
    const t = trackRef.current
    if (!t) return
    const first = t.firstElementChild as HTMLElement | null
    const w = first ? first.getBoundingClientRect().width + 28 : 400
    t.scrollBy({ left: d * w, behavior: reduced ? "auto" : "smooth" })
  }

  /* ---------- faq ---------- */
  const [open, setOpen] = React.useState(0)

  /* ---------- samples ---------- */
  const [email, setEmail] = React.useState("")
  const [company, setCompany] = React.useState("")
  const [fState, setFState] = React.useState("idle" as "idle" | "busy" | "done" | "error" | "invalid")
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (fState === "busy") return
    if (!isEmail(email)) {
      setFState("invalid")
      return
    }
    setFState("busy")
    let ok = true
    try {
      if (onRequestSamples) {
        const res = await onRequestSamples(email.trim(), company.trim())
        if (res === false) ok = false
      } else await new Promise((r) => setTimeout(r, 700))
    } catch {
      ok = false
    }
    if (alive.current) setFState(ok ? "done" : "error")
  }

  const rootStyle = {
    "--lnh-h": height,
    "--lnh-accent": pal.accent,
    "--lnh-second": pal.second,
    "--lnh-on": pal.onAccent,
  } as React.CSSProperties

  const sh = uid + "sh"

  return (
    <div ref={rootRef} className={"lnh-root" + (className ? " " + className : "")} data-theme={dark ? "dark" : "light"} style={rootStyle}>
      <style>{LNH_CSS}</style>
      <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <filter id={sh} x="-20%" y="-20%" width="140%" height="150%">
            <feDropShadow dx={0} dy={10} stdDeviation={11} floodColor="#14130f" floodOpacity={dark ? 0.5 : 0.16} />
          </filter>
        </defs>
      </svg>
      <a className="lnh-skip" href={"#" + uid + "main"}>
        Skip to content
      </a>

      {/* ---------- nav ---------- */}
      <nav ref={navRef} className="lnh-nav" data-stuck={stuck ? "" : undefined} aria-label="Main">
        <div className="lnh-wrap lnh-nav-in">
          <a className="lnh-logo" href="#" onClick={(e) => { e.preventDefault(); if (rootRef.current) rootRef.current.scrollIntoView({ behavior: reduced ? "auto" : "smooth" }) }} aria-label={brand + ", home"}>
            {Logo}
          </a>
          <ul className="lnh-links">
            {links.map((l) =>
              l.items && l.items.length ? (
                <li key={l.label} className="lnh-drop">
                  <button type="button" className="lnh-link" aria-expanded={drop === l.label} aria-controls={uid + "m" + l.label.replace(/\W/g, "")} onClick={() => setDrop(drop === l.label ? "" : l.label)}>
                    {l.label}
                    <Chevron />
                  </button>
                  <div id={uid + "m" + l.label.replace(/\W/g, "")} className="lnh-menu" data-open={drop === l.label ? "" : undefined}>
                    {l.items.map((s) => (
                      <a key={s.label} href={s.href || "#"} onClick={go(s.href, s.label)} tabIndex={drop === l.label ? 0 : -1}>
                        <b>{s.label}</b>
                        {s.note && <span>{s.note}</span>}
                      </a>
                    ))}
                  </div>
                </li>
              ) : (
                <li key={l.label}>
                  <a className="lnh-link" href={l.href || "#"} onClick={go(l.href)}>
                    {l.label}
                  </a>
                </li>
              )
            )}
          </ul>
          <div className="lnh-nav-end">
            {themeToggle && (
              <button type="button" className="lnh-icon-btn" onClick={() => setDark(!dark)} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  {dark ? (
                    <g>
                      <circle cx={12} cy={12} r={4.2} />
                      <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
                    </g>
                  ) : (
                    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
                  )}
                </svg>
              </button>
            )}
            {signIn && (
              <a className="lnh-signin" href={signIn.href || "#"} onClick={go(signIn.href)}>
                {signIn.label}
              </a>
            )}
            <a className="lnh-btn" href={signUp.href || "#"} onClick={go(signUp.href)}>
              {signUp.label}
            </a>
            <button ref={menuBtn} type="button" className="lnh-icon-btn lnh-burger" aria-label="Open menu" aria-expanded={menu} onClick={() => setMenu(true)}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 8h16M4 16h16" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {menu && (
        <div ref={sheetRef} className="lnh-sheet" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="lnh-sheet-top">
            <span className="lnh-logo">{Logo}</span>
            <button type="button" className="lnh-icon-btn" aria-label="Close menu" onClick={() => { setMenu(false); if (menuBtn.current) menuBtn.current.focus() }}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          {links.map((l) => (
            <div key={l.label}>
              <a className="lnh-sheet-link" href={l.href || "#"} onClick={go(l.href)}>
                {l.label}
              </a>
              {l.items && l.items.map((s) => (
                <a key={s.label} className="lnh-sheet-sub" href={s.href || "#"} onClick={go(s.href, s.label)}>
                  {s.label}
                </a>
              ))}
            </div>
          ))}
          {signIn && (
            <a className="lnh-sheet-link" href={signIn.href || "#"} onClick={go(signIn.href)}>
              {signIn.label}
            </a>
          )}
          <a className="lnh-btn" href={signUp.href || "#"} onClick={go(signUp.href)}>
            {signUp.label}
          </a>
        </div>
      )}

      <main id={uid + "main"}>
        {/* ---------- hero ---------- */}
        <header className="lnh-hero" data-sec="top">
          <svg className="lnh-hero-bg" viewBox="0 0 1440 860" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <path className="lnh-dash lnh-march" d="M236 728C420 668 610 628 770 540S1080 340 1480 300" />
            <path className="lnh-dash lnh-march" d="M520 900C560 760 640 650 760 560" />
            <g className="lnh-line-art">
              <path d="M-30 772H72" className="lnh-tube-o" strokeWidth={22} />
              <path d="M-30 772H72" className="lnh-tube-f" strokeWidth={17} />
              <path d="M-30 772H72" className="lnh-tube-r" strokeWidth={17} strokeDasharray="1.4 6" />
              <rect x={66} y={756} width={56} height={32} rx={16} className="lnh-f-card" />
              <circle cx={82} cy={772} r={1.8} className="lnh-a-ink" />
              <circle cx={89} cy={772} r={1.8} className="lnh-a-ink" />
              <circle cx={96} cy={772} r={1.8} className="lnh-a-ink" />
              <path d="M122 772C150 772 160 760 166 740" strokeWidth={16} className="lnh-tube-o" />
              <path d="M122 772C150 772 160 760 166 740" strokeWidth={12} className="lnh-tube-f" />
              <g transform="translate(166 736) rotate(-28)">
                <rect x={-10} y={-8} width={20} height={16} rx={4} className="lnh-f-acc" />
                <path d="M10 0H62" strokeWidth={9} />
                <path d="M10 0H62" strokeWidth={5.5} stroke="var(--lnh-card)" />
                <path d="M62 -3.4L72 0L62 3.4Z" className="lnh-a-ink" />
              </g>
            </g>
            <g className="lnh-line-art" transform="translate(300 720)">
              <path d="M-40 70V18C-40 6 -30 0 -18 0H18C30 0 40 6 40 18V70Z" className="lnh-f-card" />
              <path d="M-38 70V34C-20 40 -2 28 20 34C30 37 36 36 38 35V70Z" className="lnh-f-sec" stroke="none" />
              <path d="M-40 70V18C-40 6 -30 0 -18 0H18C30 0 40 6 40 18V70" />
              <rect x={-16} y={-14} width={32} height={14} rx={2} className="lnh-f-acc" />
              <rect x={-26} y={42} width={52} height={20} rx={2} className="lnh-f-card" />
              <path d="M-18 52H18" className="lnh-thin" />
            </g>
            <path d="M300 706C300 676 220 690 172 738" className="lnh-tube-o" strokeWidth={14} fill="none" />
            <path d="M300 706C300 676 220 690 172 738" className="lnh-tube-f" strokeWidth={10} fill="none" />
          </svg>
          <div className="lnh-wrap lnh-hero-in">
            <div className="lnh-hero-copy">
              <h1 className="lnh-h1">
                {titleLines.map((line, i) => {
                  const parts = line.split(" + ")
                  return (
                    <span key={i}>
                      {parts.map((p, j) => (
                        <React.Fragment key={j}>
                          {j > 0 && (
                            <span className="lnh-plus">
                              <svg viewBox="0 0 40 40" aria-hidden="true">
                                <path d="M6 21C14 19.6 26 19 35 18.4" pathLength={1} />
                                <path d="M21 5C20 15 19.8 26 21.4 36" pathLength={1} />
                              </svg>
                              <span className="lnh-sr"> + </span>
                            </span>
                          )}
                          {(j > 0 ? " " : "") + p + (j < parts.length - 1 ? " " : "")}
                        </React.Fragment>
                      ))}
                    </span>
                  )
                })}
              </h1>
              <div className="lnh-hero-cta">
                <a className="lnh-btn" href={H.ctaHref} onClick={(e) => { if (onStart) onStart(); go(H.ctaHref)(e) }}>
                  {H.cta}
                </a>
                <svg width={58} height={34} viewBox="0 0 58 34" aria-hidden="true" className="lnh-line-art lnh-nudge">
                  <path d="M54 28C42 30 22 26 12 12" />
                  <path d="M8 20L11 10L20 13" />
                </svg>
              </div>
              <p className="lnh-hero-note">{note}</p>
            </div>
            <div className="lnh-hero-stage">
              <svg ref={stageRef} viewBox="0 -120 760 760" role="img" aria-label={"A robot arm writing a note: " + letter.greeting + " " + letter.body + " " + letter.sign}>
                <g className="lnh-hero-aside">
                  {envelopes.map((addr, i) => {
                    const lay = cachedLayout("env|" + addr, () => layoutText(addr.split("\n").map((t) => ({ text: t })), "casual", 17, 190, 1.3))
                    return (
                      <g key={i} transform={"translate(" + (566 - i * 18) + " " + (20 + i * 72) + ") rotate(" + (9 - i * 6) + ")"} filter={"url(#" + sh + ")"}>
                        <rect width={250} height={162} fill="#fbf8f1" stroke="rgba(0,0,0,.08)" />
                        <rect x={196} y={14} width={38} height={46} fill="#ffffff" stroke="rgba(0,0,0,.1)" strokeDasharray="2 2" />
                        <rect x={201} y={19} width={28} height={36} className={i % 2 ? "lnh-f-sec" : "lnh-f-acc"} />
                        <path d="M150 34c8-6 16 6 24 0s16 6 24 0M150 46c8-6 16 6 24 0s16 6 24 0" fill="none" stroke="#1d1d1f" strokeOpacity={0.45} strokeWidth={1.2} />
                        <path d={joinStrokes(lay.strokes)} transform="translate(46 74)" className="lnh-stroke" stroke={heroInk} strokeWidth={1.3} />
                      </g>
                    )
                  })}
                </g>
                <Plotter
                  geo={HERO_GEO}
                  strokes={heroSeen.seen ? heroLayout.strokes : ([] as LnhStroke[])}
                  ink={heroInk}
                  width={1.4}
                  rate={heroLayout.size * PACES.brisk}
                  active={heroSeen.now}
                  reduced={reduced}
                  epoch={li}
                  fade={heroFade}
                  onDone={heroDone}
                  paper={
                    <g transform="translate(-46 118)">
                      <g filter={"url(#" + sh + ")"}>
                        <path d="M0 0L180 -116L360 0Z" fill="#f4f2ec" stroke="rgba(0,0,0,.16)" strokeWidth={1} />
                        <rect width={360} height={240} fill="#ecebe5" />
                      </g>
                      <rect x={24} y={-172} width={312} height={292} fill="#ffffff" stroke="rgba(0,0,0,.08)" />
                      <rect x={33} y={-163} width={294} height={274} fill="none" stroke="#1f2b5c" strokeWidth={2.4} />
                      <text x={180} y={-136} textAnchor="middle" className="lnh-letterhead">
                        {H.letterhead}
                      </text>
                    </g>
                  }
                  over={
                    <g transform="translate(-46 118)">
                      <path d="M0 70L180 156L360 70V240H0Z" fill="#ffffff" stroke="rgba(0,0,0,.12)" strokeWidth={1} />
                      <path d="M0 240L150 138M360 240L210 138" fill="none" stroke="rgba(0,0,0,.08)" strokeWidth={1.2} />
                      <text x={180} y={212} textAnchor="middle" className="lnh-smallcaps">
                        {H.letterhead + (H.address ? "  |  " + H.address : "")}
                      </text>
                    </g>
                  }
                />
                <g transform="translate(402 384) rotate(8)" filter={"url(#" + sh + ")"}>
                  <g transform="scale(0.84)">
                    <CardArt card={{ id: "hero", name: "", category: "", design: H.card || "kraft", stock: "ivory" }} />
                  </g>
                </g>
              </svg>
            </div>
          </div>
        </header>

        {/* ---------- you type, we write ---------- */}
        {C && (
          <section className="lnh-write" data-sec="write" aria-labelledby={uid + "we"}>
            <div className="lnh-wrap">
              <div className="lnh-write-head">
                <p className="lnh-eyebrow">{C.eyebrow}</p>
                <h2 id={uid + "we"} className="lnh-sr">
                  {C.title}
                </h2>
                <svg ref={weRef} className="lnh-wewrite" viewBox="0 -90 600 340" aria-hidden="true">
                  <Plotter geo={WE_GEO} strokes={weStrokes} ink="currentColor" width={2.6} rate={104 * 9} active={weSeen.now} reduced={reduced} />
                </svg>
                <p className="lnh-lede">{C.text}</p>
              </div>

              <div className="lnh-composer">
                <div className="lnh-phone">
                  <div className="lnh-phone-in">
                    <div className="lnh-notch" aria-hidden="true" />
                    <div className="lnh-app-top">
                      <b>New note</b>
                      <span className="lnh-mono" aria-hidden="true">
                        <svg viewBox="0 0 20 20">
                          <path d="M6 15C9 10 11 5 10 3.5C9 2.5 7 6 7 10C7 13 8 15 9.5 15C11 15 12 12 13.5 11C14.5 10.5 15 12 14 13.5" fill="none" stroke={pal.onAccent} strokeWidth={1.7} strokeLinecap="round" />
                        </svg>
                      </span>
                    </div>
                    <label className="lnh-field">
                      <span>Greeting</span>
                      <input className="lnh-input" value={greet} maxLength={40} onChange={(e) => setGreet(e.target.value)} />
                    </label>
                    <label className="lnh-field">
                      <span>
                        Message
                        <i className="lnh-count" data-near={msg.length > C.maxLength * 0.9 ? "" : undefined} style={{ fontStyle: "normal" }}>
                          {msg.length}/{C.maxLength}
                        </i>
                      </span>
                      <textarea className="lnh-input" value={msg} maxLength={C.maxLength} rows={5} onChange={(e) => setMsg(e.target.value)} />
                    </label>
                    <label className="lnh-field">
                      <span>Sign-off</span>
                      <input className="lnh-input" value={sign} maxLength={40} onChange={(e) => setSign(e.target.value)} />
                    </label>
                    <div className="lnh-legend" id={uid + "hand"}>
                      Handwriting
                    </div>
                    <div className="lnh-opts" role="radiogroup" aria-labelledby={uid + "hand"}>
                      {(["script", "casual", "playful"] as LnhHandName[]).map((h) => {
                        const pv = handPreview(h)
                        return (
                          <button key={h} type="button" role="radio" aria-checked={hand === h} className="lnh-chip" onClick={() => setHand(h)}>
                            <svg viewBox={"-2 -4 " + (pv.width + 6) + " 40"} aria-hidden="true">
                              <path d={joinStrokes(pv.strokes)} className="lnh-stroke" stroke="currentColor" strokeWidth={1.6} />
                            </svg>
                            {h.charAt(0).toUpperCase() + h.slice(1)}
                          </button>
                        )
                      })}
                    </div>
                    <div className="lnh-legend" id={uid + "ink"}>
                      Ink
                    </div>
                    <div className="lnh-ink-row" role="radiogroup" aria-labelledby={uid + "ink"}>
                      {(["blue", "black", "plum"] as LnhInkName[]).map((n) => (
                        <button key={n} type="button" role="radio" aria-checked={!chalk && inkName === n} aria-disabled={chalk} aria-label={n + " ink"} className="lnh-swatch" onClick={() => !chalk && setInkName(n)}>
                          <i style={{ background: INKS[n] }} />
                        </button>
                      ))}
                      {chalk && <small>Chalk cards are written in white gel pen.</small>}
                    </div>
                    <div className="lnh-legend" id={uid + "card"}>
                      <span>Card</span>
                      <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 500 }}>{card.name}</span>
                    </div>
                    <div className="lnh-thumbs" role="radiogroup" aria-labelledby={uid + "card"}>
                      {cardItems.slice(0, 8).map((c) => (
                        <button key={c.id} type="button" role="radio" aria-checked={c.id === card.id} aria-label={c.name} className="lnh-thumb" onClick={() => setCardId(c.id)}>
                          <svg viewBox="0 0 350 250" aria-hidden="true">
                            <CardArt card={c} />
                          </svg>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="lnh-desk">
                  <div className="lnh-stage-wrap">
                    <svg ref={deskRef} className="lnh-stage" viewBox="0 0 720 600" role="img" aria-label={"Your note on the " + card.name + " card: " + [greet, msg, sign].join(" ")}>
                      <g transform="translate(26 70) rotate(-9) scale(0.6)" filter={"url(#" + sh + ")"}>
                        <CardArt card={card} />
                      </g>
                      <Plotter
                        geo={DESK_GEO}
                        strokes={deskStrokes}
                        ink={inkColor}
                        width={Math.max(1.3, Math.min(2.4, deskLayout.size * 0.075))}
                        rate={deskLayout.size * PACES[pace]}
                        active={deskSeen.now}
                        reduced={reduced}
                        epoch={epoch}
                        onTick={onDeskTick}
                        paper={
                          <g transform="translate(-118 -178)">
                            <g filter={"url(#" + sh + ")"}>
                              <rect x={70} y={130} width={580} height={410} rx={2} fill={STOCKS[card.stock]} />
                            </g>
                            {card.stock === "kraft" && <rect x={84} y={144} width={552} height={382} fill="none" stroke="#2b2118" strokeOpacity={0.35} strokeDasharray="6 5" />}
                            {card.stock === "chalk" && <rect x={82} y={142} width={556} height={386} fill="none" stroke="#f4f2ea" strokeOpacity={0.25} />}
                          </g>
                        }
                      />
                    </svg>
                  </div>
                  <div className="lnh-status">
                    <div className="lnh-meter" aria-live="off">
                      <div className="lnh-meter-top">
                        <b ref={(el) => { pctRef.current = el }}>Writing</b>
                        <span>{"about " + (secs >= 60 ? Math.floor(secs / 60) + " min " + (secs % 60) + " s" : secs + " s") + " by hand"}</span>
                      </div>
                      <div className="lnh-bar">
                        <i ref={(el) => { barRef.current = el }} />
                      </div>
                    </div>
                    <div className="lnh-seg" role="radiogroup" aria-label="Pen pace">
                      {(["pen", "brisk", "rush"] as (keyof typeof PACES)[]).map((p) => (
                        <button key={p} type="button" role="radio" aria-checked={pace === p} onClick={() => setPace(p)}>
                          {p === "pen" ? "Pen pace" : p === "brisk" ? "Brisk" : "Rush"}
                        </button>
                      ))}
                    </div>
                    <div className="lnh-actions">
                      <button type="button" className="lnh-btn lnh-btn-ghost" onClick={() => setEpoch((n) => n + 1)}>
                        Rewrite
                      </button>
                      <button type="button" className="lnh-btn" onClick={doSend} disabled={sendState === "busy" || !msg.trim()}>
                        {sendState === "busy" ? "Sending" : C.send}
                      </button>
                    </div>
                  </div>
                  <p className="lnh-sent" aria-live="polite" data-tone={sendState === "done" ? "ok" : sendState === "error" ? "err" : undefined}>
                    {sendState === "done"
                      ? "Queued for the robots. Written and stamped tomorrow, " + money(unitPrice(products[0].base, 1, tiers, PR ? PR.postage : 0), currency) + " with postage."
                      : sendState === "error"
                        ? "That note did not go through. Try again in a moment."
                        : ""}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ---------- how it works ---------- */}
        {ST && (
          <section className="lnh-sec lnh-how" data-sec="how" aria-labelledby={uid + "how"}>
            <div className="lnh-wrap">
              <div className="lnh-sec-head lnh-rv">
                <h2 id={uid + "how"} className="lnh-h2 lnh-up">
                  {ST.title}
                </h2>
                <p className="lnh-lede lnh-up">Handwritten outreach that scales like email, and lands like a letter from a friend.</p>
              </div>
              <div ref={howRef} className="lnh-steps">
                <svg className="lnh-path" viewBox="0 0 1200 220" preserveAspectRatio="none" aria-hidden="true">
                  <defs>
                    <mask id={uid + "pm"} maskUnits="userSpaceOnUse" x={-50} y={-100} width={1300} height={400}>
                      <path ref={howMask} d="M150 92C260 20 330 20 400 74S560 150 620 92S760 0 810 70S960 140 1080 60" fill="none" stroke="#fff" strokeWidth={12} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1} />
                    </mask>
                  </defs>
                  <path ref={howPath} d="M150 92C260 20 330 20 400 74S560 150 620 92S760 0 810 70S960 140 1080 60" className="lnh-dash" mask={"url(#" + uid + "pm)"} vectorEffect="non-scaling-stroke" />
                  <g ref={howEnv} style={{ opacity: 0 }}>
                    <g transform="translate(-14 -10)" className="lnh-line-art" strokeWidth={1.6}>
                      <rect width={28} height={20} rx={1.5} className="lnh-f-card" />
                      <path d="M0 1l14 10 14-10" />
                    </g>
                  </g>
                </svg>
                {ST.items.map((s, i) => (
                  <div key={i} className="lnh-step lnh-rv">
                    <svg className="lnh-step-art lnh-up" viewBox="0 0 240 170" aria-hidden="true">
                      <StepArt i={i % 3} />
                    </svg>
                    <div className="lnh-up">
                      <p className="lnh-step-n">{"0" + (i + 1)}</p>
                      <h3>{s.title}</h3>
                      <p>{s.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ---------- cards ---------- */}
        {CD && (
          <section className="lnh-sec lnh-cards" data-sec="cards" aria-labelledby={uid + "cards"}>
            <div className="lnh-wrap">
              <div className="lnh-sec-head lnh-rv">
                <h2 id={uid + "cards"} className="lnh-h2 lnh-up">
                  {CD.title}
                </h2>
                <p className="lnh-lede lnh-up">{CD.text}</p>
              </div>
              <div className="lnh-tabs" role="tablist" aria-label="Card category">
                {cats.map((c, i) => (
                  <button
                    key={c}
                    ref={(el) => { tabRefs.current[i] = el }}
                    type="button"
                    role="tab"
                    className="lnh-tab"
                    aria-selected={cat === c}
                    aria-controls={uid + "grid"}
                    tabIndex={cat === c ? 0 : -1}
                    onClick={() => setCat(c)}
                    onKeyDown={(e) => {
                      const n = nextIndex(i, e.key, cats.length)
                      if (n < 0) return
                      e.preventDefault()
                      setCat(cats[n])
                      const b = tabRefs.current[n]
                      if (b) b.focus()
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div id={uid + "grid"} className="lnh-grid" role="tabpanel">
                {shown.map((c) => {
                  const inside = cachedLayout("in|" + c.id + "|" + (c.inside || ""), () => fitLayout([{ text: c.inside || "Thank you!" }, { text: "xo", align: "right" }], "casual", 230, 130, [30, 26, 22], 1.3))
                  return (
                    <div key={cat + c.id} className="lnh-cardbox">
                      <button
                        type="button"
                        className="lnh-fold"
                        aria-pressed={flipped === c.id}
                        aria-label={c.name + ". Turn it over to read the inside: " + (c.inside || "Thank you!")}
                        onClick={() => setFlipped(flipped === c.id ? "" : c.id)}
                      >
                        <div className="lnh-cover">
                          <div className="lnh-face">
                            <svg viewBox="0 0 350 250" aria-hidden="true">
                              <CardArt card={c} />
                            </svg>
                          </div>
                          <div className="lnh-back">
                            <svg viewBox="0 0 350 250" aria-hidden="true">
                              <rect width={350} height={250} fill={STOCKS[c.stock]} />
                              <path d={joinStrokes(inside.strokes)} transform="translate(60 64)" className="lnh-stroke" stroke={c.stock === "chalk" ? INKS.white : INKS.blue} strokeWidth={1.6} />
                            </svg>
                          </div>
                        </div>
                      </button>
                      <div className="lnh-card-meta">
                        <b>{c.name}</b>
                        <span>{"from " + money(cardPrice(c), currency)}</span>
                      </div>
                      {C && (
                        <a className="lnh-use" href="#write" onClick={writeOn(c.id)}>
                          Write on this card
                          <svg viewBox="0 0 14 10" aria-hidden="true">
                            <path d="M1 5h11M8.5 1.5L12 5 8.5 8.5" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* ---------- integrations ---------- */}
        {IN && (
          <section className="lnh-sec lnh-int" data-sec="integrations" aria-labelledby={uid + "int"}>
            <div className="lnh-wrap">
              <div className="lnh-int-grid">
                <div className="lnh-rv">
                  <h2 id={uid + "int"} className="lnh-h2 lnh-up">
                    {IN.title}
                  </h2>
                  <p className="lnh-lede lnh-up" style={{ margin: "18px 0 32px" }}>
                    {IN.text}
                  </p>
                  <div className="lnh-recipes lnh-up" role="tablist" aria-label="Triggers" aria-orientation="vertical">
                    {recipes.map((r, i) => (
                      <button
                        key={r.id}
                        ref={(el) => { recipeRefs.current[i] = el }}
                        type="button"
                        role="tab"
                        className="lnh-recipe"
                        aria-selected={i === ri}
                        aria-controls={uid + "flow"}
                        tabIndex={i === ri ? 0 : -1}
                        onClick={() => setRi(i)}
                        onKeyDown={(e) => {
                          const n = nextIndex(i, e.key, recipes.length)
                          if (n < 0) return
                          e.preventDefault()
                          setRi(n)
                          const b = recipeRefs.current[n]
                          if (b) b.focus()
                        }}
                      >
                        <svg viewBox="0 0 48 48" aria-hidden="true">
                          <Icon name={r.icon} />
                        </svg>
                        <div>
                          <b>{r.trigger}</b>
                          <span>{r.source}</span>
                        </div>
                        <i aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                </div>
                <div id={uid + "flow"} role="tabpanel" aria-label={recipe.trigger}>
                  <svg className="lnh-flow" viewBox="0 0 560 470" aria-hidden="true">
                    <path className="lnh-flow-dash" d="M92 92C200 92 220 150 250 190" />
                    <path className="lnh-flow-dash" d="M328 190C388 172 384 92 410 72" />
                    <g transform="translate(40 40)">
                      <rect width={104} height={104} rx={12} className="lnh-node" />
                      <g transform="translate(22 22) scale(1.25)" className="lnh-node-icon">
                        <Icon name={recipe.icon} />
                      </g>
                    </g>
                    <text x={92} y={170} textAnchor="middle" className="lnh-flow-label">
                      {recipe.source}
                    </text>
                    <g transform="translate(284 206)">
                      <circle r={46} className="lnh-node" />
                      <circle r={46} fill="none" className="lnh-s-acc" strokeWidth={3} strokeDasharray="4 6" />
                      <path d="M-14 16L4 -18L16 -8L-4 24Z" className="lnh-f-acc" stroke="var(--lnh-line)" strokeWidth={2} strokeLinejoin="round" />
                      <path d="M-14 16L-18 28L-4 24" fill="none" stroke="var(--lnh-line)" strokeWidth={2} strokeLinejoin="round" />
                    </g>
                    <text x={284} y={282} textAnchor="middle" className="lnh-flow-label">
                      {brand}
                    </text>
                    <g transform="translate(416 34)">
                      <rect width={104} height={72} rx={3} className="lnh-node" />
                      <path d="M0 2L52 40L104 2" fill="none" stroke="var(--lnh-line)" strokeWidth={2} />
                      <rect x={78} y={10} width={18} height={22} className="lnh-f-acc" />
                    </g>
                    <text x={468} y={130} textAnchor="middle" className="lnh-flow-label">
                      Mailbox
                    </text>
                    <g transform="translate(96 300) rotate(-1.5)" filter={"url(#" + sh + ")"}>
                      <rect width={380} height={160} fill="#fffdf8" />
                      <g key={recipe.id} transform="translate(40 18)">
                        <path d={merged.base} className="lnh-stroke" stroke={INKS.blue} strokeWidth={1.5} />
                        <path d={merged.hi} className="lnh-stroke" stroke={pal.accent} strokeWidth={1.8} />
                      </g>
                    </g>
                  </svg>
                  <p className="lnh-flow-detail">
                    <span className="lnh-legend-hi" aria-hidden="true" />
                    Merge fields fill in for every recipient. <b>{recipe.detail}</b>
                  </p>
                  <p className="lnh-sr">{fillMerge(recipe.note, recipe.sample).map((p) => p.text).join("") + " " + recipe.sign}</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ---------- pricing ---------- */}
        {PR && product && (
          <section className="lnh-sec lnh-price" data-sec="pricing" aria-labelledby={uid + "price"}>
            <div className="lnh-wrap">
              <div className="lnh-sec-head lnh-rv">
                <h2 id={uid + "price"} className="lnh-h2 lnh-up">
                  {PR.title}
                </h2>
                <p className="lnh-lede lnh-up">{PR.text}</p>
              </div>
              <div className="lnh-price-grid">
                <div>
                  <div className="lnh-products" role="radiogroup" aria-label="Card type">
                    {products.map((p) => (
                      <button key={p.id} type="button" role="radio" aria-checked={p.id === product.id} className="lnh-product" onClick={() => setPid(p.id)}>
                        <b>{p.name}</b>
                        <span>{p.size}</span>
                        <em>{money(p.base, currency)}</em>
                      </button>
                    ))}
                  </div>
                  <div className="lnh-qty">
                    <label htmlFor={uid + "qty"}>How many cards</label>
                    <input
                      id={uid + "qty"}
                      inputMode="numeric"
                      value={qtyText}
                      onChange={(e) => {
                        const t = e.target.value.replace(/[^\d]/g, "").slice(0, 5)
                        setQtyText(t)
                        if (t) setQty(Math.max(1, Math.min(10000, +t)))
                      }}
                      onBlur={() => setQ(qty)}
                    />
                  </div>
                  <input
                    type="range"
                    className="lnh-range"
                    min={0}
                    max={1000}
                    value={sliderFromQty(qty)}
                    aria-label="Number of cards"
                    aria-valuetext={qty + " cards"}
                    style={{ "--lnh-fill": sliderFromQty(qty) / 10 + "%" } as React.CSSProperties}
                    onChange={(e) => setQ(qtyFromSlider(+e.target.value))}
                  />
                  <div className="lnh-ticks">
                    {tiers.map((t) => (
                      <div key={t.min} className="lnh-tick" data-on={t === tier ? "" : undefined}>
                        <b>{t.off ? "-" + Math.round(t.off * 100) + "%" : "List"}</b>
                        {t.min.toLocaleString("en-US") + "+ cards"}
                      </div>
                    ))}
                  </div>
                  <label className="lnh-toggle">
                    <input type="checkbox" checked={postage} onChange={(e) => setPostage(e.target.checked)} />
                    <span className="lnh-switch" aria-hidden="true" />
                    <span>
                      Stamp and mail them for me
                      <small>{"First-class postage, " + money(PR.postage, currency) + " a card"}</small>
                    </span>
                  </label>
                </div>
                <div className="lnh-receipt" aria-live="polite">
                  <div className="lnh-receipt-top">
                    <span>Estimate</span>
                    <span>{product.name}</span>
                  </div>
                  <p className="lnh-big">
                    {money(each, currency)}
                    <small>per card</small>
                  </p>
                  {tier.off > 0 && (
                    <svg className="lnh-scrawl" viewBox="0 0 220 50" aria-hidden="true">
                      <Script text={"you save " + Math.round(tier.off * 100) + "%!"} hand="casual" size={24} x={22} y={14} color={pal.accent} sw={1.6} />
                      <path d="M16 12C6 18 4 30 10 44M10 44L3 38M10 44L14 36" fill="none" stroke={pal.accent} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  <div className="lnh-rows">
                    <div>
                      <span>{qty.toLocaleString("en-US") + " x " + product.name.toLowerCase()}</span>
                      <b>{money(cardOnly * qty, currency)}</b>
                    </div>
                    <div>
                      <span>Volume discount</span>
                      <b>{tier.off ? "-" + Math.round(tier.off * 100) + "%" : "None yet"}</b>
                    </div>
                    <div>
                      <span>Postage</span>
                      <b>{post ? money(post * qty, currency) : "Not included"}</b>
                    </div>
                    <div className="lnh-total">
                      <span style={{ color: "inherit" }}>Total</span>
                      <b>{money(each * qty, currency)}</b>
                    </div>
                  </div>
                  <p className="lnh-save">
                    {nxt ? (
                      <>
                        Send <b>{(nxt.min - qty).toLocaleString("en-US")} more</b> and every card drops to {money(round2(product.base * (1 - nxt.off)) + post, currency)}.
                      </>
                    ) : (
                      <>You are at our best price.</>
                    )}
                  </p>
                  <a className="lnh-btn" href={H.ctaHref} onClick={(e) => { if (onStart) onStart(); go(H.ctaHref)(e) }}>
                    {H.cta}
                  </a>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ---------- quotes ---------- */}
        {QT && QT.items.length > 0 && (
          <section className="lnh-sec lnh-quotes" data-sec="stories" aria-labelledby={uid + "q"}>
            <div className="lnh-wrap">
              <div className="lnh-sec-head lnh-rv" style={{ marginBottom: 12 }}>
                <h2 id={uid + "q"} className="lnh-h2 lnh-up">
                  {QT.title}
                </h2>
                <div className="lnh-quotes-nav lnh-up" style={{ justifySelf: "end" }}>
                  <button type="button" className="lnh-round" aria-label="Previous note" onClick={() => slide(-1)}>
                    <Arrow flip />
                  </button>
                  <button type="button" className="lnh-round" aria-label="Next note" onClick={() => slide(1)}>
                    <Arrow />
                  </button>
                </div>
              </div>
              <div ref={trackRef} className="lnh-track" tabIndex={0} aria-label="Customer notes">
                {QT.items.map((q, i) => {
                  const lay = cachedLayout("q|" + q.quote, () => fitLayout([{ text: q.quote }], "casual", 300, 196, [26, 24, 22, 20, 18], 1.3))
                  let t = 0
                  return (
                    <figure key={i} className="lnh-note lnh-rv">
                      <div className="lnh-note-card">
                        <svg viewBox="0 0 350 250" aria-hidden="true">
                          <g transform={"translate(25 " + Math.max(26, (250 - lay.height) / 2) + ")"} className="lnh-wr" stroke={INKS.blue} strokeWidth={1.5}>
                            {lay.strokes.map((s, k) => {
                              const dur = Math.max(0.025, s.len / (lay.size * 38))
                              const style = { animationDelay: (0.2 + t).toFixed(3) + "s", animationDuration: dur.toFixed(3) + "s" }
                              t += dur + 0.012
                              return <path key={k} d={s.d} pathLength={1} className="lnh-stroke" style={style} />
                            })}
                          </g>
                        </svg>
                      </div>
                      <blockquote className="lnh-sr">{q.quote}</blockquote>
                      <figcaption>
                        <b>{q.name}</b>
                        <span>{q.role}</span>
                      </figcaption>
                    </figure>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* ---------- faq ---------- */}
        {FQ && (
          <section className="lnh-sec lnh-faq" data-sec="faq" aria-labelledby={uid + "faq"}>
            <div className="lnh-wrap lnh-faq-grid">
              <div className="lnh-rv">
                <h2 id={uid + "faq"} className="lnh-h2 lnh-up">
                  {FQ.title}
                </h2>
                {SM && (
                  <a className="lnh-postit lnh-up" href="#samples" onClick={go("#samples")}>
                    <svg viewBox="0 0 240 150" aria-hidden="true">
                      <Script text={"Still not sure? Ask us for three free samples and judge the ink yourself."} hand="casual" size={21} x={22} y={22} width={196} color={INKS.blue} sw={1.5} draw={!reduced} />
                    </svg>
                    <span className="lnh-sr">Still not sure? Ask us for three free samples.</span>
                  </a>
                )}
              </div>
              <div>
                {FQ.items.map((f, i) => {
                  const on = open === i
                  return (
                    <div key={i} className="lnh-qa">
                      <h3>
                        <button type="button" className="lnh-q" aria-expanded={on} aria-controls={uid + "a" + i} id={uid + "q" + i} onClick={() => setOpen(on ? -1 : i)}>
                          {f.q}
                          <svg viewBox="0 0 22 22" aria-hidden="true">
                            <path d="M11 3.5v15M3.5 11h15" />
                          </svg>
                        </button>
                      </h3>
                      <div id={uid + "a" + i} className="lnh-a" data-open={on ? "" : undefined} role="region" aria-labelledby={uid + "q" + i}>
                        <div>
                          <p>{f.a}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* ---------- samples ---------- */}
        {SM && (
          <section className="lnh-sec lnh-samples" data-sec="samples" aria-labelledby={uid + "sm"}>
            <div className="lnh-wrap lnh-samples-grid">
              <div className="lnh-rv">
                <svg className="lnh-thanks" viewBox="0 0 560 150" aria-hidden="true">
                  <Script text={SM.script} hand="script" size={120} x={0} y={4} color="#f4f2ea" sw={8.5} draw={!reduced} pace={9} />
                </svg>
                <h2 id={uid + "sm"} className="lnh-h2 lnh-up">
                  {SM.title}
                </h2>
                <p className="lnh-up">{SM.text}</p>
              </div>
              <div>
              <svg className="lnh-fan" viewBox="0 0 520 250" aria-hidden="true">
                {[2, 1, 0].map((n) => (
                  <g key={n} className="lnh-fan-card" style={{ ["--r" as string]: [-7, 2, 10][n] + "deg", ["--x" as string]: [0, 120, 236][n] + "px" } as React.CSSProperties}>
                    <g filter={"url(#" + sh + ")"}>
                      <g transform="scale(0.8)">
                        <CardArt card={cardItems[[0, 1, 3][n]] || cardItems[0]} />
                      </g>
                    </g>
                  </g>
                ))}
              </svg>
              <form className="lnh-form" onSubmit={submit} noValidate>
                <label className="lnh-sr" htmlFor={uid + "em"}>
                  Work email
                </label>
                <input
                  id={uid + "em"}
                  className="lnh-input"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  aria-invalid={fState === "invalid"}
                  aria-describedby={uid + "fm"}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (fState !== "busy") setFState("idle")
                  }}
                />
                <label className="lnh-sr" htmlFor={uid + "co"}>
                  Company (optional)
                </label>
                <input id={uid + "co"} className="lnh-input" autoComplete="organization" placeholder="Company (optional)" value={company} onChange={(e) => setCompany(e.target.value)} />
                <button type="submit" className="lnh-btn" disabled={fState === "busy" || fState === "done"}>
                  {fState === "busy" ? "Sending" : fState === "done" ? "Requested" : SM.button}
                </button>
                <p id={uid + "fm"} className="lnh-form-msg" aria-live="polite" data-tone={fState === "invalid" || fState === "error" ? "err" : undefined}>
                  {fState === "invalid" ? "That email does not look right. Check it and try again." : fState === "error" ? "Something went wrong. Please try again." : fState === "done" ? SM.done : ""}
                </p>
              </form>
              </div>
            </div>
          </section>
        )}
      </main>

      {FT && (
        <footer className="lnh-foot">
          <div className="lnh-wrap">
            <div className="lnh-foot-grid">
              <div>
                <span className="lnh-logo">{Logo}</span>
                <p className="lnh-foot-note">{FT.note}</p>
              </div>
              {FT.columns.map((c) => (
                <div key={c.title}>
                  <h4>{c.title}</h4>
                  <ul>
                    {c.links.map((l) => (
                      <li key={l.label}>
                        <a href={l.href || "#"} onClick={go(l.href)}>
                          {l.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="lnh-foot-base">
              <span>{"© " + new Date().getFullYear() + " " + brand.charAt(0).toUpperCase() + brand.slice(1)}</span>
              <span>Every note on this page was written stroke by stroke.</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  )
}
