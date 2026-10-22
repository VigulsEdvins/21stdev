"use client"

// Sidebar Portfolio Template — a whole one-page portfolio in one file. A quiet
// paper page with a sticky profile sidebar (portrait, bio, a signature that
// writes itself, details, socials, a CV download) and a reading column: a
// line-drawn hero with little things orbiting the developer, About with key
// skills, an Experience timeline, Education, Skills and Contact.
//
// It is meant to be used, not just looked at. The nav follows the scroll and
// glides between sections. Click a key skill and the timeline lights up the
// roles that used it. Click the hero and it tells you what just shipped. The
// mail button copies your address, Download CV writes a CV from the same data
// when you have no PDF, Contact Me opens a small compose sheet, and the moon
// flips the page dark. Everything is drawn here: no fonts, images or packages.
import * as React from "react"

/* ---------- types ---------- */

export type SptDetailIcon = "pin" | "briefcase" | "globe" | "clock" | "mail" | "spark" | "cap"
export type SptSocialIcon = "linkedin" | "x" | "github" | "dribbble" | "instagram" | "globe" | "mail"
export type SptGlyph = "orbit" | "flower" | "hash" | "cap" | "book" | "spark" | "bolt" | "leaf" | "cube"

export type SptDetail = { icon: SptDetailIcon; label: string }
export type SptSocial = { label: string; href: string; icon: SptSocialIcon }
/** A company or school mark: a coloured tile with a drawn glyph, or its initial. */
export type SptLogo = { color: string; glyph?: SptGlyph; text?: string }
export type SptRole = {
  title: string
  /** "Full-Time", "Contract"… shown after the company name. */
  type?: string
  /** "Jan 2025", "2021" or "Present". */
  start: string
  end: string
  summary?: string
  highlights?: string[]
  /** Match `keySkills` labels so the About chips can light this role up. */
  skills?: string[]
}
export type SptCompany = { company: string; logo?: SptLogo; roles: SptRole[] }
export type SptSchool = {
  school: string
  degree: string
  start: string
  end: string
  summary?: string
  notes?: string[]
  logo?: SptLogo
}
export type SptSkill = { name: string; level: number; years?: number }
export type SptSkillGroup = { name: string; items: SptSkill[] }
export type SptLabels = {
  about: string
  experience: string
  education: string
  skills: string
  contact: string
  contactMe: string
  keySkills: string
  viewExperience: string
  downloadCv: string
  all: string
}

export interface SidebarPortfolioTemplateProps {
  name?: string
  role?: string
  bio?: string
  /** A photo URL. Without one, an illustrated portrait is drawn (see `avatar`). */
  avatarSrc?: string
  /** Colours of the drawn portrait. */
  avatar?: { skin?: string; hair?: string; shirt?: string; backdrop?: string }
  /** Show the signature under the bio. It is generated from `name`. */
  signature?: boolean
  details?: SptDetail[]
  socials?: SptSocial[]
  email?: string
  /** A real CV to download. Without one, Download CV writes a .txt from the page's data. */
  cvUrl?: string
  headline?: string
  tagline?: string
  /** What floats up when the hero drawing is clicked. */
  heroQuips?: string[]
  about?: string | string[]
  keySkills?: string[]
  experience?: SptCompany[]
  education?: SptSchool[]
  skills?: SptSkillGroup[]
  contactTitle?: string
  contactText?: string
  /** Shows the green "available" pulse in Contact. */
  available?: boolean
  /** IANA zone for the local-time line in Contact, e.g. "Europe/Berlin". */
  timeZone?: string
  city?: string
  labels?: Partial<SptLabels>
  accent?: string
  paper?: string
  ink?: string
  darkPaper?: string
  darkInk?: string
  /** "auto" follows a `.dark` ancestor, the shadcn convention. */
  theme?: "auto" | "light" | "dark"
  themeToggle?: boolean
  /** Root height. The page scrolls inside it. Always a definite length. */
  height?: string
  className?: string
}

/* ---------- defaults ---------- */

const DEFAULT_LABELS: SptLabels = {
  about: "About",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  contact: "Contact",
  contactMe: "Contact Me",
  keySkills: "Key skills:",
  viewExperience: "View Experience",
  downloadCv: "Download CV",
  all: "All",
}

const DEFAULT_DETAILS: SptDetail[] = [
  { icon: "pin", label: "Houston, Texas" },
  { icon: "briefcase", label: "5+ years experience" },
  { icon: "globe", label: "Open to remote work" },
]

const DEFAULT_SOCIALS: SptSocial[] = [
  { label: "LinkedIn", href: "https://linkedin.com", icon: "linkedin" },
  { label: "X", href: "https://x.com", icon: "x" },
  { label: "Dribbble", href: "https://dribbble.com", icon: "dribbble" },
]

const DEFAULT_ABOUT = [
  "I'm a full stack developer with experience building web applications focused on performance, scalability, and usability. I specialize in creating responsive frontend interfaces, developing reliable backend systems, and working across the full product development process using modern technologies and clean development practices.",
]

const DEFAULT_KEY_SKILLS = [
  "React & Next.js",
  "Node.js & APIs",
  "Responsive interfaces",
  "Backend architecture",
  "TypeScript",
  "Database management",
  "Performance optimization",
]

const DEFAULT_EXPERIENCE: SptCompany[] = [
  {
    company: "Northstack",
    logo: { color: "#3450f0", glyph: "orbit" },
    roles: [
      {
        title: "Senior Full Stack Developer",
        type: "Full-Time",
        start: "Jan 2025",
        end: "Present",
        summary: "Leading full-stack development for scalable web applications and reliable digital products across teams.",
        highlights: [
          "Improved platform performance and stability",
          "Built frontend and backend product features",
          "Collaborated with product and engineering teams",
        ],
        skills: ["React & Next.js", "Node.js & APIs", "Backend architecture", "TypeScript", "Performance optimization"],
      },
      {
        title: "Full Stack Developer",
        type: "Full-Time",
        start: "Jan 2023",
        end: "Dec 2024",
        summary: "Worked on responsive web applications, API integrations, and backend systems using modern frameworks.",
        skills: ["React & Next.js", "Node.js & APIs", "Database management", "TypeScript"],
      },
    ],
  },
  {
    company: "Pixelbase",
    logo: { color: "#ef4a26", glyph: "flower" },
    roles: [
      {
        title: "Frontend Developer",
        type: "Full-Time",
        start: "Apr 2021",
        end: "Dec 2022",
        summary:
          "Developed responsive user interfaces and interactive web experiences for client and internal digital products, focusing on usability, accessibility, and performance.",
        skills: ["React & Next.js", "Responsive interfaces", "Performance optimization"],
      },
    ],
  },
  {
    company: "CloudCore",
    logo: { color: "#7b2fe0", glyph: "hash" },
    roles: [
      {
        title: "Junior Web Developer",
        type: "Part-Time",
        start: "Aug 2020",
        end: "May 2021",
        summary:
          "Supported frontend and backend development tasks while contributing to modern web projects, maintaining internal systems, and improving workflow efficiency.",
        highlights: ["Assisted in developing responsive website interfaces", "Worked with REST APIs and backend integrations"],
        skills: ["Responsive interfaces", "Node.js & APIs", "Database management"],
      },
    ],
  },
]

const DEFAULT_EDUCATION: SptSchool[] = [
  {
    school: "Lakeshore State University",
    degree: "B.S. in Computer Science",
    start: "Aug 2016",
    end: "May 2020",
    summary: "Focused on distributed systems, databases, and human-computer interaction.",
    notes: ["Graduated with honors", "Teaching assistant for Intro to Web Development"],
    logo: { color: "#1f7a5a", glyph: "cap" },
  },
  {
    school: "Open Cloud Academy",
    degree: "Cloud Architecture Certificate",
    start: "Mar 2022",
    end: "Aug 2022",
    summary: "Designing, deploying and observing resilient services on managed cloud infrastructure.",
    logo: { color: "#d99a1e", glyph: "cube" },
  },
]

const DEFAULT_SKILLS: SptSkillGroup[] = [
  {
    name: "Frontend",
    items: [
      { name: "React & Next.js", level: 95, years: 5 },
      { name: "TypeScript", level: 90, years: 5 },
      { name: "Tailwind CSS", level: 88, years: 4 },
      { name: "Accessibility", level: 78, years: 3 },
    ],
  },
  {
    name: "Backend",
    items: [
      { name: "Node.js & APIs", level: 92, years: 5 },
      { name: "PostgreSQL", level: 84, years: 4 },
      { name: "GraphQL", level: 76, years: 3 },
      { name: "Redis", level: 68, years: 2 },
    ],
  },
  {
    name: "Tooling",
    items: [
      { name: "Docker", level: 82, years: 4 },
      { name: "AWS", level: 74, years: 3 },
      { name: "CI/CD", level: 80, years: 4 },
      { name: "Testing", level: 86, years: 5 },
    ],
  },
]

const DEFAULT_QUIPS = ["deployed ✓", "tests passing", "shipped!", "0 bugs (so far)", "p95 → 120ms", "merged to main"]

// #region dates
// "Jan 2025" / "January 2025" / "2021" / "Present" → months since year 0, and
// the span between two of them as "1 yr 9 mos". Both ends count, like a CV.
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]

function monthIndex(s: string, now: Date): number | null {
  const t = s.trim().toLowerCase()
  if (/^(present|now|current|today)$/.test(t)) return now.getFullYear() * 12 + now.getMonth()
  const m = t.match(/^([a-z]{3})[a-z]*\.?\s+(\d{4})$/)
  if (m) {
    const i = MONTHS.indexOf(m[1])
    return i > -1 ? Number(m[2]) * 12 + i : null
  }
  const y = t.match(/^(\d{4})$/)
  return y ? Number(y[1]) * 12 : null
}

function spanLabel(start: string, end: string, now: Date): string {
  const a = monthIndex(start, now)
  const b = monthIndex(end, now)
  if (a === null || b === null || b < a) return ""
  const n = b - a + 1
  const yrs = Math.floor(n / 12)
  const mos = n % 12
  const parts: string[] = []
  if (yrs) parts.push(yrs + (yrs === 1 ? " yr" : " yrs"))
  if (mos) parts.push(mos + (mos === 1 ? " mo" : " mos"))
  return parts.join(" ")
}
// #endregion dates

// #region signature
// An illegible, confident signature generated from a name: a looped capital,
// one hump per letter (tall ones reach up, deep ones dip), and a flourish that
// sweeps back under it all. Seeded by the name, so it is the same every time.
type Pt = [number, number]

function seedOf(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0 || 1
}

function rng(seed: number): () => number {
  let a = seed
  return () => {
    a ^= a << 13
    a ^= a >>> 17
    a ^= a << 5
    return ((a >>> 0) % 10007) / 10007
  }
}

function signaturePoints(name: string): Pt[] {
  const first = (name.trim().split(/\s+/)[0] || "").replace(/[^A-Za-z]/g, "")
  const r = rng(seedOf(name.trim().toLowerCase() || "a"))
  const pts: Pt[] = [[6, 44], [13, 22 + r() * 3], [17, 6], [32, 7], [33, 17], [15, 24], [24, 31]]
  let x = 27
  for (const ch of first.slice(1, 8).toLowerCase()) {
    const w = 6 + r() * 4
    const top = "bdfhklt".includes(ch) ? 11 + r() * 4 : 22 + r() * 5
    pts.push([x + w * 0.45, top])
    if ("gjpqyz".includes(ch)) pts.push([x + w * 0.75, 47 + r() * 2], [x + w * 0.35, 44])
    pts.push([x + w, 33 + r() * 3])
    x += w
  }
  pts.push([x + 9, 22 + r() * 4], [x + 13, 34], [x - 6, 41], [x * 0.4, 43 + r() * 2], [7, 41])
  return pts
}

function smoothPath(p: Pt[]): string {
  const f = (n: number) => String(Math.round(n * 10) / 10)
  let d = "M" + f(p[0][0]) + " " + f(p[0][1])
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i]
    const p1 = p[i]
    const p2 = p[i + 1]
    const p3 = p[i + 2] ?? p2
    d +=
      " C" + f(p1[0] + (p2[0] - p0[0]) / 6) + " " + f(p1[1] + (p2[1] - p0[1]) / 6) +
      " " + f(p2[0] - (p3[0] - p1[0]) / 6) + " " + f(p2[1] - (p3[1] - p1[1]) / 6) +
      " " + f(p2[0]) + " " + f(p2[1])
  }
  return d
}

function signatureOf(name: string): { d: string; width: number } {
  const pts = signaturePoints(name)
  const width = Math.ceil(Math.max(...pts.map((p) => p[0])) + 6)
  return { d: smoothPath(pts), width }
}
// #endregion signature

// #region cv
// The CV Download CV writes when there is no `cvUrl`: plain text, from the
// same data the page shows, so it can never disagree with it.
type CvInput = {
  name: string
  role: string
  bio: string
  email: string
  details: string[]
  about: string[]
  experience: SptCompany[]
  education: SptSchool[]
  skills: SptSkillGroup[]
}

function buildCv(c: CvInput): string {
  const out: string[] = []
  const head = (t: string) => out.push("", t.toUpperCase(), "-".repeat(t.length))
  out.push(c.name, c.role)
  const contact = [c.email, ...c.details].filter(Boolean).join("  ·  ")
  if (contact) out.push(contact)
  if (c.bio) out.push("", c.bio)
  if (c.about.length) {
    head("About")
    out.push(...c.about)
  }
  if (c.experience.length) {
    head("Experience")
    for (const co of c.experience) {
      for (const r of co.roles) {
        out.push("", r.title + " — " + co.company + (r.type ? " (" + r.type + ")" : ""), r.start + " – " + r.end)
        if (r.summary) out.push(r.summary)
        for (const h of r.highlights ?? []) out.push("  • " + h)
      }
    }
  }
  if (c.education.length) {
    head("Education")
    for (const s of c.education) {
      out.push("", s.degree + " — " + s.school, s.start + " – " + s.end)
      if (s.summary) out.push(s.summary)
      for (const n of s.notes ?? []) out.push("  • " + n)
    }
  }
  if (c.skills.length) {
    head("Skills")
    for (const g of c.skills) out.push(g.name + ": " + g.items.map((i) => i.name).join(", "))
  }
  return out.join("\n") + "\n"
}
// #endregion cv

const useIsoLayoutEffect = typeof window === "undefined" ? React.useEffect : React.useLayoutEffect
const levelName = (n: number) => (n >= 90 ? "Expert" : n >= 80 ? "Advanced" : n >= 65 ? "Proficient" : "Familiar")
const norm = (s: string) => s.trim().toLowerCase()

/* ---------- drawings ---------- */

function DetailIcon({ icon }: { icon: SptDetailIcon }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.2, strokeLinecap: "round", strokeLinejoin: "round" } as const
  return (
    <svg className="spt-ico" viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">
      {icon === "pin" && (
        <g {...p}>
          <path d="M7 12.6s4.4-3.8 4.4-7a4.4 4.4 0 0 0-8.8 0c0 3.2 4.4 7 4.4 7Z" />
          <circle cx="7" cy="5.6" r="1.5" />
        </g>
      )}
      {icon === "briefcase" && (
        <g {...p}>
          <rect x="1.8" y="4.3" width="10.4" height="7.6" rx="1.5" />
          <path d="M5 4.3V3a.8.8 0 0 1 .8-.8h2.4A.8.8 0 0 1 9 3v1.3M1.8 7.8h10.4" />
        </g>
      )}
      {icon === "globe" && (
        <g {...p}>
          <circle cx="7" cy="7" r="5.2" />
          <ellipse cx="7" cy="7" rx="2.2" ry="5.2" />
          <path d="M1.8 7h10.4" />
        </g>
      )}
      {icon === "clock" && (
        <g {...p}>
          <circle cx="7" cy="7" r="5.2" />
          <path d="M7 4.2V7l1.9 1.2" />
        </g>
      )}
      {icon === "mail" && (
        <g {...p}>
          <rect x="1.5" y="3" width="11" height="8" rx="1.5" />
          <path d="m2 4 5 3.8L12 4" />
        </g>
      )}
      {icon === "spark" && <path d="M7 1.5c.5 3 2 4.5 5.5 5.5C9 8 7.5 9.5 7 12.5 6.5 9.5 5 8 1.5 7 5 6 6.5 4.5 7 1.5Z" {...p} />}
      {icon === "cap" && (
        <g {...p}>
          <path d="M1.2 5.6 7 2.8l5.8 2.8L7 8.4Z" />
          <path d="M3.8 6.9v2.8c1.8 1.4 4.6 1.4 6.4 0V6.9M12.8 5.6v3.2" />
        </g>
      )}
    </svg>
  )
}

function SocialIcon({ icon }: { icon: SptSocialIcon }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.25, strokeLinecap: "round", strokeLinejoin: "round" } as const
  switch (icon) {
    case "linkedin":
      return (
        <g {...p}>
          <rect x="2" y="2" width="12" height="12" rx="2.4" />
          <path d="M5.2 7.2v3.8M7.8 11V7.2m0 1.6c0-1.4 3-2.2 3 .2V11" />
          <circle cx="5.2" cy="5.1" r=".5" fill="currentColor" />
        </g>
      )
    case "x":
      return (
        <g {...p}>
          <path d="M3 2.8h2.8l7.2 10.4h-2.8Z" />
          <path d="M12.8 2.8 8.9 7.2M7.1 8.9 3.2 13.2" />
        </g>
      )
    case "github":
      return (
        <g {...p}>
          <path d="M6 13.6c-3.2-.9-4-3.2-4-5.4C2 4.8 4.7 2.4 8 2.4s6 2.4 6 5.8c0 2.2-.8 4.5-4 5.4" />
          <path d="M6 13.6v-2c0-.8.3-1.3.8-1.6-2-.2-3-1-3-3 0-.6.2-1.1.6-1.6l-.1-1.5 1.4.6a5.6 5.6 0 0 1 2.6 0l1.4-.6-.1 1.5c.4.5.6 1 .6 1.6 0 2-1 2.8-3 3 .5.3.8.8.8 1.6v2" />
        </g>
      )
    case "dribbble":
      return (
        <g {...p}>
          <circle cx="8" cy="8" r="5.8" />
          <path d="M3.6 4.4c3.4 2.4 7 2.3 9-.3M2.3 9c3.6-1.2 7.6.1 9.6 3.8M5.9 2.6c2.3 2.7 3.8 6.6 4.2 11" />
        </g>
      )
    case "instagram":
      return (
        <g {...p}>
          <rect x="2.2" y="2.2" width="11.6" height="11.6" rx="3.4" />
          <circle cx="8" cy="8" r="2.7" />
          <circle cx="11.4" cy="4.6" r=".5" fill="currentColor" />
        </g>
      )
    case "mail":
      return (
        <g {...p}>
          <rect x="1.8" y="3.4" width="12.4" height="9.2" rx="1.6" />
          <path d="m2.4 4.4 5.6 4.2 5.6-4.2" />
        </g>
      )
    default:
      return (
        <g {...p}>
          <circle cx="8" cy="8" r="5.8" />
          <ellipse cx="8" cy="8" rx="2.5" ry="5.8" />
          <path d="M2.2 8h11.6" />
        </g>
      )
  }
}

function Glyph({ glyph }: { glyph: SptGlyph }) {
  const s = { fill: "none", stroke: "#fff", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" } as const
  switch (glyph) {
    case "orbit":
      return (
        <g {...s}>
          <circle cx="10" cy="10" r="1.8" fill="#fff" />
          <ellipse cx="10" cy="10" rx="7" ry="2.8" transform="rotate(-35 10 10)" />
          <ellipse cx="10" cy="10" rx="7" ry="2.8" transform="rotate(35 10 10)" />
        </g>
      )
    case "flower":
      return (
        <g fill="#fff">
          <circle cx="10" cy="5.8" r="3.2" />
          <circle cx="14.2" cy="10" r="3.2" />
          <circle cx="10" cy="14.2" r="3.2" />
          <circle cx="5.8" cy="10" r="3.2" />
          <circle cx="10" cy="10" r="1.6" fill="currentColor" />
        </g>
      )
    case "hash":
      return <path d="M8 3.5 6.8 16.5M13.2 3.5 12 16.5M4 7.6h12.2M3.6 12.4h12.2" {...s} />
    case "cap":
      return (
        <g {...s}>
          <path d="M1.8 8 10 4l8.2 4L10 12Z" fill="#fff" />
          <path d="M5.4 9.9v3.6c2.6 2 6.6 2 9.2 0V9.9M18.2 8v4.4" />
        </g>
      )
    case "book":
      return <path d="M3 5c3-1 5-.6 7 1 2-1.6 4-2 7-1v10c-3-1-5-.6-7 1-2-1.6-4-2-7-1ZM10 6v10" {...s} />
    case "spark":
      return <path d="M10 2.4c.8 4.8 2.8 6.8 7.6 7.6-4.8.8-6.8 2.8-7.6 7.6-.8-4.8-2.8-6.8-7.6-7.6 4.8-.8 6.8-2.8 7.6-7.6Z" fill="#fff" />
    case "bolt":
      return <path d="M11.2 2.4 4.4 11h5.2l-1 6.6L15.6 9h-5.2Z" fill="#fff" />
    case "leaf":
      return <path d="M4 16c0-7.4 4.6-12 12-12 0 7.4-4.6 12-12 12Zm0 0 7.6-7.6" {...s} />
    default:
      return <path d="M10 3 16.5 6.6v6.8L10 17l-6.5-3.6V6.6ZM3.5 6.6 10 10.2l6.5-3.6M10 10.2V17" {...s} />
  }
}

function LogoTile({ logo, name, size = 22, round = false }: { logo?: SptLogo; name: string; size?: number; round?: boolean }) {
  const color = logo?.color ?? "#6b6b6b"
  const text = logo?.text ?? (logo?.glyph ? "" : name.trim().charAt(0).toUpperCase())
  return (
    <span className={"spt-logo" + (round ? " is-round" : "")} style={{ width: size, height: size, background: color, color }} aria-hidden="true">
      {text ? (
        <b>{text}</b>
      ) : (
        <svg viewBox="0 0 20 20" width={size * 0.66} height={size * 0.66}>
          <Glyph glyph={logo?.glyph ?? "cube"} />
        </svg>
      )}
    </span>
  )
}

// The portrait drawn when there is no photo: shoulders, a face that blinks, curls.
function Portrait({ uid, skin, hair, shirt, backdrop }: { uid: string; skin: string; hair: string; shirt: string; backdrop: string }) {
  const g = uid + "-bd"
  return (
    <svg className="spt-portrait" viewBox="0 0 88 88" width="88" height="88" aria-hidden="true">
      <defs>
        <radialGradient id={g} cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="88" height="88" fill={backdrop} />
      <rect width="88" height="88" fill={"url(#" + g + ")"} />
      <path d="M6 88c2-17 17-26 38-26s36 9 38 26Z" fill={shirt} />
      <path d="M35 50v12c4 5 14 5 18 0V50Z" fill={skin} />
      <path d="M35 57c4 3 14 3 18 0v5c-4 5-14 5-18 0Z" fill="#000" opacity="0.14" />
      <path d="M33 62.5 44 73l11-10.5" fill="none" stroke="#000" strokeOpacity="0.12" strokeWidth="1.4" />
      <ellipse cx="29.5" cy="41" rx="3" ry="4.6" fill={skin} />
      <ellipse cx="58.5" cy="41" rx="3" ry="4.6" fill={skin} />
      <ellipse cx="44" cy="39" rx="14.6" ry="17.6" fill={skin} />
      <path d="M31 44c1 9 6 13.6 13 13.6S56 53 57 44c-2 5-6 7.6-13 7.6S33 49 31 44Z" fill="#000" opacity="0.1" />
      <g fill={hair}>
        <path d="M28.4 38c-2.4-14 5.4-21 15.6-21s18 7 15.6 21c-1.2-5.6-3.4-8.6-6.6-9.6-5 2-12.4 2-18 0-3.4 1.2-5.4 4.2-6.6 9.6Z" />
        <circle cx="33" cy="23.6" r="4.6" />
        <circle cx="39.6" cy="19.8" r="5" />
        <circle cx="47" cy="19" r="5" />
        <circle cx="53.8" cy="22.4" r="4.6" />
        <circle cx="57.4" cy="28.2" r="3.6" />
        <circle cx="30" cy="29.4" r="3.4" />
      </g>
      <g fill="none" stroke={hair} strokeWidth="1.5" strokeLinecap="round">
        <path d="M34.6 35.4c1.8-1 3.8-1 5.4-.2M48 35.2c1.6-.8 3.6-.8 5.4.2" />
      </g>
      <g className="spt-blink">
        <ellipse cx="37.6" cy="40.4" rx="1.5" ry="1.7" fill="#1e1510" />
        <ellipse cx="50.4" cy="40.4" rx="1.5" ry="1.7" fill="#1e1510" />
      </g>
      <path d="M44.4 41.4c-.8 3.2-1.8 5-.2 6" fill="none" stroke="#000" strokeOpacity="0.28" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M39.4 51c3 2.2 7 2.2 9.8 0" fill="none" stroke="#7a3a2c" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

// The hero drawing: a developer on the floor with a laptop, two orbits and
// the little things that float around a working day. The orbiting dots are
// moved by the component's animation frame; the icons bob in CSS.
const ORBITS = [
  { rx: 96, ry: 30, rot: -16 },
  { rx: 74, ry: 40, rot: 24 },
]
const CX = 120
const CY = 84

function orbitPoint(o: { rx: number; ry: number; rot: number }, t: number): Pt {
  const a = (o.rot * Math.PI) / 180
  const x = o.rx * Math.cos(t)
  const y = o.ry * Math.sin(t)
  return [CX + x * Math.cos(a) - y * Math.sin(a), CY + x * Math.sin(a) + y * Math.cos(a)]
}

function HeroArt({ dotRefs }: { dotRefs: React.MutableRefObject<(SVGCircleElement | null)[]> }) {
  const line = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const
  const body = { style: { fill: "var(--spt-paper)" }, stroke: "currentColor", strokeWidth: 1.6, strokeLinejoin: "round" } as const
  const icon = (x: number, y: number, depth: number, delay: number, children: React.ReactNode) => (
    <g style={{ transform: "translate(calc(var(--spt-px) * " + depth + "px), calc(var(--spt-py) * " + depth + "px))" }}>
      <g className="spt-bob" style={{ animationDelay: delay + "s" }}>
        <g transform={"translate(" + x + " " + y + ")"}>{children}</g>
      </g>
    </g>
  )
  const start = ORBITS.map((o, i) => orbitPoint(o, i * 2.4 + 0.6))
  return (
    <svg className="spt-art" viewBox="0 0 240 160" width="240" height="160" aria-hidden="true">
      {ORBITS.map((o, i) => (
        <ellipse key={i} cx={CX} cy={CY} rx={o.rx} ry={o.ry} transform={"rotate(" + o.rot + " " + CX + " " + CY + ")"} {...line} strokeWidth={1.1} opacity={0.75} />
      ))}

      {/* the developer */}
      <g className="spt-dev">
        <path d="M86 118c2-11 21-14 34-9 13-5 32-2 34 9-3 9-22 10-34 3-12 7-31 6-34-3Z" {...body} />
        <path d="M101 88c0-14 7-20 19-20s19 6 19 20v16h-38Z" {...body} />
        <path d="M117 60v8h6v-8" {...line} />
        <g className="spt-head">
          <circle cx="120" cy="48" r="13" {...body} />
          <path d="M107.4 46c-1.4-11 6-16 12.6-16 8 0 14 5.6 12.4 16-2-5-5.6-7.6-12.2-7.6-6 0-10.6 2.4-12.8 7.6Z" fill="currentColor" />
          <path d="M115 52.2h.01M125 52.2h.01" {...line} strokeWidth={2.4} />
          <path d="M116.6 56.4c2 1.4 4.8 1.4 6.8 0" {...line} strokeWidth={1.3} />
        </g>
        <path d="M103 76c-7 7-7 17 0 26M137 76c7 7 7 17 0 26" {...line} />
        <rect x="99" y="82" width="42" height="26" rx="2.5" fill="currentColor" />
        <circle cx="120" cy="95" r="3" style={{ fill: "var(--spt-paper)" }} className="spt-led" />
        <path d="M92 108h56l4 4H88Z" fill="currentColor" />
      </g>

      {/* what floats around: mail, chat, code, heart, star */}
      {icon(44, 34, 6, 0, (
        <g>
          <rect x="0" y="0" width="20" height="14" rx="2.4" {...body} />
          <path d="m1.2 1.8 8.8 6.4 8.8-6.4" {...line} strokeWidth={1.3} />
        </g>
      ))}
      {icon(176, 26, 9, 0.8, (
        <g>
          <path d="M3 0h16a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H9l-5 4v-4H3a3 3 0 0 1-3-3V3a3 3 0 0 1 3-3Z" {...body} />
          <path d="M6.6 7h.01M11 7h.01M15.4 7h.01" {...line} strokeWidth={2.2} />
        </g>
      ))}
      {icon(186, 104, 5, 1.6, (
        <g>
          <rect x="0" y="0" width="24" height="17" rx="3" {...body} />
          <path d="m9 5.4-3.2 3.1L9 11.6M15 5.4l3.2 3.1-3.2 3.1M13 4.6l-2 7.8" {...line} strokeWidth={1.3} />
        </g>
      ))}
      {icon(30, 98, 8, 2.3, <path d="M9 15.4C3.4 11.6 0 8.6 0 5a4.6 4.6 0 0 1 9-1.4A4.6 4.6 0 0 1 18 5c0 3.6-3.4 6.6-9 10.4Z" fill="currentColor" />)}
      {icon(150, 8, 4, 1.2, <path d="M6 0c.5 3.2 2.2 5 6 6-3.8 1-5.5 2.8-6 6-.5-3.2-2.2-5-6-6 3.8-1 5.5-2.8 6-6Z" fill="currentColor" />)}
      {icon(70, 132, 7, 3, <path d="M5 0c.4 2.6 1.8 4 5 5-3.2 1-4.6 2.4-5 5-.4-2.6-1.8-4-5-5 3.2-1 4.6-2.4 5-5Z" fill="currentColor" opacity={0.7} />)}

      {/* orbiting dots, placed by the animation frame */}
      {start.map((p, i) => (
        <circle
          key={i}
          ref={(el) => {
            dotRefs.current[i] = el
          }}
          cx={p[0]}
          cy={p[1]}
          r={i ? 2.6 : 3.4}
          fill="currentColor"
        />
      ))}
    </svg>
  )
}

/* ---------- styles ---------- */

const SPT_CSS = `
.spt-root{--spt-paper:var(--spt-paper-l);--spt-ink:var(--spt-ink-l);position:relative;overflow:hidden;container:spt/inline-size;color:var(--spt-ink);background:var(--spt-paper);font-family:var(--spt-sans);font-size:14px;line-height:1.55;-webkit-font-smoothing:antialiased;color-scheme:light}
.spt-root[data-theme="dark"],:where(.dark) .spt-root[data-theme="auto"]{--spt-paper:var(--spt-paper-d);--spt-ink:var(--spt-ink-d);color-scheme:dark}
.spt-root{--spt-muted:color-mix(in oklab,var(--spt-ink) 60%,var(--spt-paper));--spt-faint:color-mix(in oklab,var(--spt-ink) 42%,var(--spt-paper));--spt-line:color-mix(in oklab,var(--spt-ink) 11%,var(--spt-paper));--spt-soft:color-mix(in oklab,var(--spt-ink) 5.5%,var(--spt-paper));--spt-soft2:color-mix(in oklab,var(--spt-ink) 9%,var(--spt-paper))}
:where(.spt-root) *,:where(.spt-root) *::before,:where(.spt-root) *::after{box-sizing:border-box}
.spt-root svg{max-width:none;display:block}
:where(.spt-root) button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer}
:where(.spt-root) a{color:inherit;text-decoration:none}
.spt-root :focus-visible{outline:2px solid var(--spt-accent);outline-offset:2px;border-radius:4px}
.spt-scroll{position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;scroll-behavior:auto;overscroll-behavior:contain}
.spt-grid{display:grid;grid-template-columns:minmax(0,1fr)}
.spt-serif{font-family:var(--spt-serif);font-weight:400;letter-spacing:-.01em}
.spt-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}

/* sidebar */
.spt-side{display:flex;flex-direction:column;gap:18px;padding:24px 20px 22px;border-bottom:1px solid var(--spt-line)}
.spt-side-top{display:grid;grid-template-columns:auto 1fr;gap:6px 16px;align-items:center}
.spt-avatar{width:76px;height:76px;border-radius:3px;overflow:hidden;background:var(--spt-soft2);grid-row:span 2}
.spt-avatar img,.spt-avatar .spt-portrait{width:100%;height:100%;max-width:none;object-fit:cover;display:block}
.spt-name{font-size:24px;line-height:1.1;margin:0}
.spt-role{margin:3px 0 0;font-size:12.5px;color:var(--spt-muted)}
.spt-bio{margin:0;font-size:13px;color:var(--spt-muted);max-width:34ch;line-height:1.6}
.spt-sig{display:block;width:max-content;color:var(--spt-ink);margin:-4px 0 -6px -4px;padding:4px;border-radius:6px}
.spt-sig path{stroke-dasharray:1;stroke-dashoffset:0}
.spt-sig:hover{background:var(--spt-soft)}
.spt-rule{height:1px;background:var(--spt-line);border:0;margin:0}
.spt-details{list-style:none;margin:0;padding:0;display:grid;gap:7px;font-size:12.5px}
.spt-details li{display:flex;align-items:center;gap:9px}
.spt-ico{color:var(--spt-muted);flex:none}
.spt-side-foot{display:grid;gap:14px;margin-top:4px}
.spt-socials{display:flex;gap:6px;margin:0 0 0 -6px;padding:0;list-style:none}
.spt-socials a{display:grid;place-items:center;width:30px;height:30px;border-radius:6px;color:var(--spt-muted);transition:color .2s,background .2s,transform .2s}
.spt-socials a:hover{color:var(--spt-ink);background:var(--spt-soft2);transform:translateY(-2px)}
.spt-actions{display:grid;grid-template-columns:1fr 44px;gap:6px}
.spt-btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;height:42px;padding:0 16px;border-radius:3px;font-size:12.5px;font-weight:500;transition:background .2s,transform .15s,color .2s}
.spt-btn:active{transform:translateY(1px)}
.spt-btn-dark{background:var(--spt-ink);color:var(--spt-paper)}
.spt-btn-dark:hover{background:color-mix(in oklab,var(--spt-ink) 86%,var(--spt-accent))}
.spt-btn-soft{background:var(--spt-soft2);color:var(--spt-ink)}
.spt-btn-soft:hover{background:color-mix(in oklab,var(--spt-ink) 14%,var(--spt-paper))}
.spt-btn .spt-dl{transition:transform .25s}
.spt-btn:hover .spt-dl{transform:translateY(2px)}

/* main */
.spt-main{min-width:0;position:relative}
.spt-nav{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:12px;height:58px;padding:0 20px;background:color-mix(in oklab,var(--spt-paper) 88%,transparent);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-bottom:1px solid transparent;transition:border-color .3s}
.spt-nav[data-stuck]{border-bottom-color:var(--spt-line)}
.spt-mark{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;color:var(--spt-accent);flex:none;transition:transform .4s}
.spt-mark:hover{transform:rotate(-12deg) scale(1.06)}
.spt-links{position:relative;display:flex;gap:2px;overflow-x:auto;scrollbar-width:none;min-width:0;flex:1;margin:0;padding:0;list-style:none}
.spt-links::-webkit-scrollbar{display:none}
.spt-links a{position:relative;z-index:1;display:block;padding:5px 8px;font-size:12.5px;color:var(--spt-muted);white-space:nowrap;border-radius:999px;transition:color .2s}
.spt-links a:hover,.spt-links a[aria-current="true"]{color:var(--spt-ink)}
.spt-pill{position:absolute;top:0;left:0;height:100%;border-radius:999px;background:var(--spt-soft2);transition:transform .45s cubic-bezier(.3,1.3,.5,1),width .45s cubic-bezier(.3,1.3,.5,1),opacity .3s;pointer-events:none}
.spt-nav-end{display:flex;align-items:center;gap:6px;flex:none}
.spt-theme{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;color:var(--spt-muted);transition:color .2s,background .2s}
.spt-theme:hover{color:var(--spt-ink);background:var(--spt-soft2)}
.spt-theme .spt-sun{display:none}
.spt-root[data-theme="dark"] .spt-theme .spt-sun,:where(.dark) .spt-root[data-theme="auto"] .spt-theme .spt-sun{display:block}
.spt-root[data-theme="dark"] .spt-theme .spt-moon,:where(.dark) .spt-root[data-theme="auto"] .spt-theme .spt-moon{display:none}
.spt-contact-btn{height:34px;padding:0 13px;font-size:12px;gap:7px}
.spt-contact-btn .spt-cm-label{display:none}
.spt-col{max-width:600px;margin:0 auto;padding:0 20px}
.spt-sec{padding:48px 0 44px;border-top:1px solid var(--spt-line)}
.spt-h2{font-size:28px;line-height:1.15;margin:0 0 16px}
.spt-p{margin:0 0 12px;color:var(--spt-muted);font-size:13.5px;line-height:1.7;max-width:60ch}

/* hero */
.spt-hero{padding:34px 0 52px;text-align:center;display:grid;justify-items:center}
.spt-art-wrap{position:relative;width:276px;height:184px;color:var(--spt-accent);cursor:pointer;border-radius:12px;--spt-px:0;--spt-py:0}
.spt-art{width:276px;height:184px}
.spt-art g{transition:transform .5s cubic-bezier(.2,.8,.2,1)}
.spt-art .spt-bob{transition:none}
.spt-head{transform-box:fill-box;transform-origin:50% 90%}
.spt-quip{position:absolute;left:50%;top:44%;padding:3px 9px;border-radius:999px;background:var(--spt-ink);color:var(--spt-paper);font-size:11px;font-weight:500;white-space:nowrap;pointer-events:none;transform:translate(-50%,0);opacity:0}
.spt-h1{font-size:40px;line-height:1.05;margin:18px 0 12px}
.spt-tagline{margin:0 auto 22px;max-width:44ch;color:var(--spt-muted);font-size:14px;line-height:1.6}
.spt-cta{display:inline-flex;align-items:center;gap:12px;height:40px;padding:0 12px 0 8px;min-width:200px;border-radius:3px;background:var(--spt-soft2);font-size:12.5px;font-weight:500;transition:background .2s}
.spt-cta:hover{background:color-mix(in oklab,var(--spt-ink) 14%,var(--spt-paper))}
.spt-stack{display:flex}
.spt-stack .spt-logo{box-shadow:0 0 0 2px var(--spt-soft2);transition:margin .35s cubic-bezier(.3,1.4,.5,1)}
.spt-stack .spt-logo+.spt-logo{margin-left:-7px}
.spt-cta:hover .spt-stack .spt-logo+.spt-logo{margin-left:2px}
.spt-cta-arrow{margin-left:auto;transition:transform .3s}
.spt-cta:hover .spt-cta-arrow{transform:translateX(3px)}

/* chips */
.spt-chips{display:flex;flex-wrap:wrap;gap:6px;margin:0;padding:0;list-style:none}
.spt-chip{display:inline-flex;align-items:center;gap:6px;height:27px;padding:0 9px;border-radius:3px;background:var(--spt-soft2);font-size:12px;color:var(--spt-ink);transition:background .2s,color .2s,transform .15s}
.spt-chip:hover{background:color-mix(in oklab,var(--spt-ink) 14%,var(--spt-paper))}
.spt-chip[aria-pressed="true"]{background:var(--spt-accent);color:#fff}
.spt-chip:active{transform:scale(.97)}
.spt-chip i{font-style:normal;font-size:10.5px;opacity:.6}
.spt-label{margin:20px 0 9px;font-size:12.5px;font-weight:500}

/* timeline */
.spt-filter{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:-4px 0 18px;padding:8px 10px;border-radius:4px;background:color-mix(in oklab,var(--spt-accent) 9%,var(--spt-paper));font-size:12.5px}
.spt-filter b{font-weight:600;color:var(--spt-accent)}
.spt-filter button{margin-left:auto;font-size:12px;text-decoration:underline;text-underline-offset:3px;color:var(--spt-muted)}
.spt-filter button:hover{color:var(--spt-ink)}
.spt-tl{list-style:none;margin:0;padding:0;display:grid;gap:26px}
.spt-co{display:grid;grid-template-columns:22px minmax(0,1fr);gap:0 14px;position:relative}
.spt-co[data-multi]::before{content:"";position:absolute;left:10.5px;top:30px;bottom:6px;width:1px;background:var(--spt-line)}
.spt-roles{display:grid;gap:22px}
.spt-role{position:relative;transition:opacity .35s}
.spt-role+.spt-role::before{content:"";position:absolute;left:-28.5px;top:6px;width:7px;height:7px;border-radius:50%;background:var(--spt-paper);box-shadow:inset 0 0 0 1.5px var(--spt-line);transition:box-shadow .25s,background .25s}
.spt-role:hover::before,.spt-role[data-hit]::before{background:var(--spt-accent);box-shadow:inset 0 0 0 1.5px var(--spt-accent)}
.spt-role[data-dim]{opacity:.32}
.spt-role-head{display:flex;justify-content:space-between;gap:12px;align-items:baseline}
.spt-role h3,.spt-edu h3{font-size:17px;line-height:1.25;margin:0}
.spt-meta{margin:2px 0 0;font-size:12px;color:var(--spt-muted)}
.spt-meta span{margin:0 5px;opacity:.7}
.spt-date{margin:0;font-size:11.5px;color:var(--spt-muted);text-align:right;white-space:nowrap;flex:none}
.spt-date small{display:block;font-size:10.5px;color:var(--spt-faint);height:15px}
.spt-role .spt-p,.spt-edu .spt-p{margin:10px 0 0;font-size:12.5px;line-height:1.65}
.spt-bul{list-style:disc;margin:8px 0 0;padding:0 0 0 16px;font-size:12.5px;color:var(--spt-muted);line-height:1.8}
.spt-bul li::marker{color:var(--spt-faint)}
.spt-tags{display:flex;flex-wrap:wrap;gap:4px;margin:10px 0 0;padding:0;list-style:none}
.spt-tags button{height:21px;padding:0 7px;border-radius:3px;font-size:11px;color:var(--spt-muted);box-shadow:inset 0 0 0 1px var(--spt-line);transition:color .2s,box-shadow .2s,background .2s}
.spt-tags button:hover{color:var(--spt-ink);box-shadow:inset 0 0 0 1px var(--spt-faint)}
.spt-tags button[aria-pressed="true"]{color:#fff;background:var(--spt-accent);box-shadow:none}
.spt-logo{display:grid;place-items:center;border-radius:4px;flex:none;overflow:hidden}
.spt-logo.is-round{border-radius:50%}
.spt-logo b{color:#fff;font-size:11px;font-weight:600;line-height:1}

/* education */
.spt-edus{list-style:none;margin:0;padding:0;display:grid;gap:12px}
.spt-edu{display:grid;grid-template-columns:22px minmax(0,1fr);gap:0 14px;padding:14px;margin:0 -14px;border-radius:6px;transition:background .25s}
.spt-edu:hover{background:var(--spt-soft)}
.spt-more{margin-top:8px;font-size:12px;color:var(--spt-muted);display:inline-flex;gap:5px;align-items:center}
.spt-more:hover{color:var(--spt-ink)}
.spt-more svg{transition:transform .3s}
.spt-more[aria-expanded="true"] svg{transform:rotate(180deg)}
.spt-fold{display:grid;grid-template-rows:0fr;transition:grid-template-rows .4s cubic-bezier(.2,.8,.2,1)}
.spt-fold[data-open]{grid-template-rows:1fr}
.spt-fold>div{overflow:hidden}

/* skills */
.spt-tabs{position:relative;display:inline-flex;gap:2px;padding:3px;border-radius:6px;background:var(--spt-soft);margin:0 0 18px;max-width:100%;overflow-x:auto;scrollbar-width:none}
.spt-tabs button{position:relative;z-index:1;height:28px;padding:0 12px;font-size:12px;color:var(--spt-muted);border-radius:4px;transition:color .2s;white-space:nowrap}
.spt-tabs button[aria-selected="true"]{color:var(--spt-ink)}
.spt-tab-pill{position:absolute;top:3px;left:0;height:28px;border-radius:4px;background:var(--spt-paper);box-shadow:0 1px 2px rgba(0,0,0,.08),0 0 0 1px var(--spt-line);transition:transform .4s cubic-bezier(.3,1.3,.5,1),width .4s cubic-bezier(.3,1.3,.5,1)}
.spt-skills{list-style:none;margin:0;padding:0;display:grid;gap:4px}
.spt-skill{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 12px;align-items:center;padding:9px 0;border-bottom:1px dashed var(--spt-line)}
.spt-skill-name{font-size:13px}
.spt-skill-name small{margin-left:8px;font-size:11px;color:var(--spt-faint)}
.spt-skill-lvl{font-size:11px;color:var(--spt-muted);text-align:right}
.spt-meter{grid-column:1/-1;display:grid;grid-template-columns:repeat(20,1fr);gap:2px;height:6px}
.spt-meter i{border-radius:1px;background:var(--spt-soft2);transition:background .3s;transition-delay:calc(var(--i) * 22ms)}
.spt-meter i[data-on]{background:var(--spt-ink)}
.spt-skill:hover .spt-meter i[data-on]{background:var(--spt-accent)}

/* contact */
.spt-contact{padding-bottom:30px}
.spt-status{display:inline-flex;align-items:center;gap:8px;margin:0 0 14px;padding:4px 10px 4px 8px;border-radius:999px;background:var(--spt-soft);font-size:11.5px;color:var(--spt-muted)}
.spt-dot{position:relative;width:7px;height:7px;border-radius:50%;background:#22a860}
.spt-dot::after{content:"";position:absolute;inset:0;border-radius:50%;background:#22a860;animation:spt-ping 2s cubic-bezier(0,0,.2,1) infinite}
.spt-mailrow{display:flex;flex-wrap:wrap;gap:8px;margin:18px 0 26px}
.spt-email{display:inline-flex;align-items:center;gap:10px;height:42px;padding:0 14px;border-radius:3px;box-shadow:inset 0 0 0 1px var(--spt-line);font-size:13px;transition:box-shadow .2s}
.spt-email:hover{box-shadow:inset 0 0 0 1px var(--spt-faint)}
.spt-email .spt-copy{font-size:11px;color:var(--spt-muted)}
.spt-foot{display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;padding-top:18px;border-top:1px solid var(--spt-line);font-size:11.5px;color:var(--spt-faint)}

/* reveal */
.spt-root[data-motion="on"] .spt-reveal{transition:opacity .7s cubic-bezier(.2,.8,.2,1),transform .7s cubic-bezier(.2,.8,.2,1)}
.spt-root[data-motion="on"] .spt-reveal:not([data-in]){opacity:0;transform:translateY(16px)}

/* dialog + toast */
.spt-overlay{position:absolute;inset:0;z-index:20;display:grid;place-items:center;padding:16px;background:rgba(12,8,6,.38);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);animation:spt-fade .25s ease both}
.spt-dialog{width:min(420px,100%);max-height:100%;overflow:auto;padding:22px;border-radius:8px;background:var(--spt-paper);box-shadow:0 24px 60px -20px rgba(0,0,0,.4),0 0 0 1px var(--spt-line);animation:spt-pop .35s cubic-bezier(.2,1.2,.4,1) both}
.spt-dialog-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:6px}
.spt-dialog h2{font-size:24px;margin:0}
.spt-x{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;color:var(--spt-muted)}
.spt-x:hover{background:var(--spt-soft2);color:var(--spt-ink)}
.spt-field{display:grid;gap:5px;margin-top:12px;font-size:12px;color:var(--spt-muted)}
.spt-field input,.spt-field textarea{font:inherit;font-size:13px;color:var(--spt-ink);background:var(--spt-soft);border:1px solid var(--spt-line);border-radius:4px;padding:9px 10px;outline:none;resize:vertical;transition:border-color .2s,background .2s}
.spt-field input:focus-visible,.spt-field textarea:focus-visible{outline:none}
.spt-field input:focus,.spt-field textarea:focus{border-color:var(--spt-accent);background:var(--spt-paper)}
.spt-dialog-actions{display:flex;gap:8px;margin-top:16px}
.spt-dialog-actions .spt-btn{flex:1}
.spt-toast{position:absolute;left:50%;bottom:18px;z-index:30;display:flex;align-items:center;gap:8px;padding:9px 14px;border-radius:999px;background:var(--spt-ink);color:var(--spt-paper);font-size:12.5px;box-shadow:0 10px 30px -10px rgba(0,0,0,.4);transform:translateX(-50%);animation:spt-toast .35s cubic-bezier(.2,1.2,.4,1) both;pointer-events:none}

/* motion */
.spt-root[data-motion="on"] .spt-sig path{animation:spt-write 2.4s cubic-bezier(.5,0,.3,1) .3s both}
.spt-root[data-motion="on"] .spt-bob{animation:spt-bob 4.6s ease-in-out infinite}
.spt-root[data-motion="on"] .spt-blink{transform-box:fill-box;transform-origin:center;animation:spt-blink 5.2s infinite}
.spt-root[data-motion="on"] .spt-led{animation:spt-led 2.8s ease-in-out infinite}
.spt-root[data-motion="on"] .spt-quip{animation:spt-quip 1.7s cubic-bezier(.2,.8,.2,1) both}
.spt-root[data-motion="off"] .spt-quip{opacity:1;transform:translate(-50%,-70px)}
.spt-root[data-motion="on"] .spt-art-wrap:active .spt-dev{transform:translateY(1px)}
@keyframes spt-write{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
@keyframes spt-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@keyframes spt-blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
@keyframes spt-led{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes spt-quip{0%{opacity:0;transform:translate(-50%,6px) scale(.8)}18%{opacity:1;transform:translate(-50%,-30px) scale(1)}75%{opacity:1}100%{opacity:0;transform:translate(-50%,-78px) scale(.96)}}
@keyframes spt-ping{0%{transform:scale(1);opacity:.7}80%,100%{transform:scale(2.8);opacity:0}}
@keyframes spt-fade{from{opacity:0}}
@keyframes spt-pop{from{opacity:0;transform:translateY(12px) scale(.97)}}
@keyframes spt-toast{from{opacity:0;transform:translate(-50%,12px)}}
@media (prefers-reduced-motion:reduce){.spt-root *,.spt-root *::before,.spt-root *::after{animation:none!important;transition:none!important}}

/* wide: the sidebar sticks beside the reading column */
@container spt (min-width:560px){
.spt-side{padding:28px 32px}
.spt-nav{padding:0 32px}
.spt-col{padding:0 32px}
.spt-contact-btn .spt-cm-label{display:inline}
.spt-h1{font-size:44px}
.spt-links{gap:4px}
}
@container spt (min-width:880px){
.spt-grid{grid-template-columns:minmax(260px,300px) minmax(0,1fr)}
.spt-side{position:sticky;top:0;align-self:start;height:var(--spt-h);overflow-y:auto;scrollbar-width:none;border-bottom:0;border-right:1px solid var(--spt-line);padding:26px 26px 26px 28px}
.spt-side::-webkit-scrollbar{display:none}
.spt-side-top{grid-template-columns:1fr;gap:0}
.spt-avatar{grid-row:auto;margin-bottom:18px}
.spt-side-foot{margin-top:auto}
.spt-nav{padding:0 44px;height:62px}
.spt-col{padding:0 44px}
.spt-links{justify-content:center}
.spt-hero{padding-top:44px}
}
`

/* ---------- component ---------- */

type Toast = { id: number; text: string }
type Quip = { id: number; text: string }
type Key = "about" | "experience" | "education" | "skills" | "contact"

export default function SidebarPortfolioTemplate({
  name = "Oliver Rowland",
  role = "Full Stack Developer",
  bio = "Focused on high-performance web development, clean interfaces, and reliable backend systems.",
  avatarSrc,
  avatar,
  signature = true,
  details = DEFAULT_DETAILS,
  socials = DEFAULT_SOCIALS,
  email = "hello@oliverrowland.dev",
  cvUrl,
  headline = "Full Stack Developer",
  tagline = "Building scalable web applications with clean architecture, modern tools, and thoughtful user experience.",
  heroQuips = DEFAULT_QUIPS,
  about = DEFAULT_ABOUT,
  keySkills = DEFAULT_KEY_SKILLS,
  experience = DEFAULT_EXPERIENCE,
  education = DEFAULT_EDUCATION,
  skills = DEFAULT_SKILLS,
  contactTitle = "Let's build something good",
  contactText = "Have a product in mind, a team that needs another pair of hands, or just want to talk shop? My inbox is open, and I usually reply within a day.",
  available = true,
  timeZone = "America/Chicago",
  city = "Houston",
  labels: labelsIn,
  accent = "#e5553b",
  paper = "#faf6f0",
  ink = "#1f1512",
  darkPaper = "#15110e",
  darkInk = "#f1ebe3",
  theme = "auto",
  themeToggle = true,
  height = "100svh",
  className = "",
}: SidebarPortfolioTemplateProps) {
  const L = { ...DEFAULT_LABELS, ...labelsIn }
  const uid = React.useId().replace(/:/g, "")
  const rootRef = React.useRef(null as HTMLDivElement | null)
  const scrollRef = React.useRef(null as HTMLDivElement | null)
  const linksRef = React.useRef(null as HTMLUListElement | null)
  const tabsRef = React.useRef(null as HTMLDivElement | null)
  const artRef = React.useRef(null as HTMLDivElement | null)
  const dotRefs = React.useRef<(SVGCircleElement | null)[]>([])
  const openerRef = React.useRef(null as HTMLElement | null)
  const firstFieldRef = React.useRef(null as HTMLInputElement | null)
  const boost = React.useRef(0)
  const seq = React.useRef(0)
  const timers = React.useRef([] as number[])

  const [mode, setMode] = React.useState(theme)
  const [reduced, setReduced] = React.useState(null as boolean | null)
  const [now, setNow] = React.useState(null as Date | null)
  const [active, setActive] = React.useState(null as Key | null)
  const [stuck, setStuck] = React.useState(false)
  const [pill, setPill] = React.useState(null as { x: number; w: number } | null)
  const [focusSkill, setFocusSkill] = React.useState(null as string | null)
  const [tab, setTab] = React.useState(0)
  const [tabPill, setTabPill] = React.useState(null as { x: number; w: number } | null)
  const [openEdu, setOpenEdu] = React.useState(null as number | null)
  const [dialog, setDialog] = React.useState(false)
  const [draft, setDraft] = React.useState({ from: "", message: "" })
  const [toast, setToast] = React.useState(null as Toast | null)
  const [quips, setQuips] = React.useState([] as Quip[])
  const [sigRun, setSigRun] = React.useState(0)
  const [seen, setSeen] = React.useState({} as { [k: string]: boolean })
  const [lit, setLit] = React.useState(false)

  React.useEffect(() => setMode(theme), [theme])

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }

  const aboutParas = (Array.isArray(about) ? about : [about]).filter(Boolean)
  const sig = React.useMemo(() => signatureOf(name), [name])
  const sections = (
    [
      ["about", L.about, aboutParas.length > 0 || keySkills.length > 0],
      ["experience", L.experience, experience.length > 0],
      ["education", L.education, education.length > 0],
      ["skills", L.skills, skills.length > 0],
    ] as [Key, string, boolean][]
  ).filter((s) => s[2])
  const sid = (k: Key) => uid + "-" + k
  const group = skills[Math.min(tab, skills.length)] as SptSkillGroup | undefined
  const shownSkills = tab >= skills.length ? skills.flatMap((g) => g.items) : group?.items ?? []

  /* reduced motion, clock, cleanup */
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    setNow(new Date())
    const tick = window.setInterval(() => setNow(new Date()), 30000)
    return () => {
      mq.removeEventListener("change", sync)
      clearInterval(tick)
      timers.current.forEach(clearTimeout)
    }
  }, [])

  /* scroll spy: the last section whose top has passed under the nav */
  const spy = React.useCallback(() => {
    const sc = scrollRef.current
    if (!sc) return
    setStuck(sc.scrollTop > 8)
    const top = sc.getBoundingClientRect().top
    let cur: Key | null = null
    for (const [k] of sections) {
      const el = document.getElementById(sid(k))
      if (el && el.getBoundingClientRect().top - top <= 140) cur = k
    }
    if (sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 4 && sections.length) cur = sections[sections.length - 1][0]
    setActive(cur)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections.map((s) => s[0]).join(), uid])

  React.useEffect(() => {
    const sc = scrollRef.current
    if (!sc) return
    let raf = 0
    const on = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(spy)
    }
    spy()
    sc.addEventListener("scroll", on, { passive: true })
    window.addEventListener("resize", on)
    return () => {
      cancelAnimationFrame(raf)
      sc.removeEventListener("scroll", on)
      window.removeEventListener("resize", on)
    }
  }, [spy])

  /* the pill under the active nav link, and the one under the skills tab */
  useIsoLayoutEffect(() => {
    const measure = () => {
      const a = linksRef.current?.querySelector<HTMLElement>('a[aria-current="true"]')
      setPill(a ? { x: a.offsetLeft, w: a.offsetWidth } : null)
      const t = tabsRef.current?.querySelector<HTMLElement>('button[aria-selected="true"]')
      setTabPill(t ? { x: t.offsetLeft, w: t.offsetWidth } : null)
    }
    measure()
    const el = rootRef.current
    if (!el || typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [active, tab, skills.length])

  /* sections fade up as they scroll in */
  React.useEffect(() => {
    const sc = scrollRef.current
    if (!sc || reduced !== false || typeof IntersectionObserver === "undefined") return
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).map((e) => (e.target as HTMLElement).dataset.reveal as string)
        if (hit.length) setSeen((s) => ({ ...s, ...Object.fromEntries(hit.map((h) => [h, true])) }))
      },
      { root: sc, threshold: 0.08, rootMargin: "0px 0px -6% 0px" },
    )
    sc.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [reduced, sections.length])

  /* the skill meters fill once they are seen, and again on every tab */
  React.useEffect(() => {
    if (reduced !== false) return setLit(true)
    setLit(false)
    if (!seen.skills) return
    let b = 0
    const a = requestAnimationFrame(() => (b = requestAnimationFrame(() => setLit(true))))
    return () => {
      cancelAnimationFrame(a)
      cancelAnimationFrame(b)
    }
  }, [tab, seen.skills, reduced])

  /* orbiting dots */
  React.useEffect(() => {
    if (reduced !== false) return
    let raf = 0
    let last = performance.now()
    const t = ORBITS.map((_, i) => i * 2.4 + 0.6)
    const loop = (ts: number) => {
      const dt = Math.min(64, ts - last) / 1000
      last = ts
      boost.current *= 0.96
      ORBITS.forEach((o, i) => {
        t[i] += dt * (i ? -0.5 : 0.36) * (1 + boost.current)
        const [x, y] = orbitPoint(o, t[i])
        const dot = dotRefs.current[i]
        if (dot) {
          dot.setAttribute("cx", x.toFixed(2))
          dot.setAttribute("cy", y.toFixed(2))
          // behind the developer on the far side of the orbit
          dot.style.opacity = Math.sin(t[i]) < -0.2 && Math.abs(x - CX) < 30 ? "0" : "1"
        }
      })
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [reduced])

  /* dialog: focus in, Escape out, focus back */
  React.useEffect(() => {
    if (!dialog) return
    firstFieldRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDialog()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialog])

  const say = (text: string) => {
    const id = ++seq.current
    setToast({ id, text })
    later(() => setToast((t) => (t && t.id === id ? null : t)), 2400)
  }

  const go = (k: Key) => {
    const sc = scrollRef.current
    const el = document.getElementById(sid(k))
    if (!sc || !el) return
    const y = el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - 56
    sc.scrollTo({ top: Math.max(0, y), behavior: reduced ? "auto" : "smooth" })
  }

  const copyEmail = () => {
    const done = () => say("Copied " + email)
    const fail = () => say(email)
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(email).then(done, fail)
      else fail()
    } catch {
      fail()
    }
  }

  const downloadCv = () => {
    if (cvUrl) return
    const text = buildCv({
      name,
      role,
      bio,
      email,
      details: details.map((d) => d.label),
      about: aboutParas,
      experience,
      education,
      skills,
    })
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }))
    const a = document.createElement("a")
    a.href = url
    a.download = (name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "cv") + "-cv.txt"
    document.body.appendChild(a)
    a.click()
    a.remove()
    later(() => URL.revokeObjectURL(url), 1000)
    say("CV downloaded")
  }

  const flipTheme = () => {
    const dark = mode === "auto" ? !!rootRef.current?.parentElement?.closest(".dark") : mode === "dark"
    setMode(dark ? "light" : "dark")
  }

  const openDialog = (e: React.MouseEvent<HTMLElement>) => {
    openerRef.current = e.currentTarget
    setDialog(true)
  }
  function closeDialog() {
    setDialog(false)
    openerRef.current?.focus()
  }

  const pickSkill = (s: string, jump: boolean) => {
    const next = focusSkill && norm(focusSkill) === norm(s) ? null : s
    setFocusSkill(next)
    if (next && jump) later(() => go("experience"), 60)
  }
  const roleHas = (r: SptRole, s: string) => (r.skills ?? []).some((x) => norm(x) === norm(s))
  const skillCount = (s: string) => experience.reduce((n, co) => n + co.roles.filter((r) => roleHas(r, s)).length, 0)

  const poke = () => {
    boost.current = 5
    if (!heroQuips.length) return
    const id = ++seq.current
    setQuips((q) => [...q.slice(-2), { id, text: heroQuips[id % heroQuips.length] }])
    later(() => setQuips((q) => q.filter((x) => x.id !== id)), 1800)
  }

  const onArtMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = artRef.current
    if (!el || reduced) return
    const r = el.getBoundingClientRect()
    el.style.setProperty("--spt-px", ((e.clientX - r.left) / r.width - 0.5).toFixed(3))
    el.style.setProperty("--spt-py", ((e.clientY - r.top) / r.height - 0.5).toFixed(3))
  }
  const onArtLeave = () => {
    artRef.current?.style.setProperty("--spt-px", "0")
    artRef.current?.style.setProperty("--spt-py", "0")
  }

  let clock = ""
  if (now) {
    try {
      clock = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", timeZone }).format(now)
    } catch {
      clock = ""
    }
  }

  const mailto =
    "mailto:" + email +
    "?subject=" + encodeURIComponent("Hello from " + (draft.from.trim() || "your portfolio")) +
    "&body=" + encodeURIComponent(draft.message)
  const reveal = (key: string) => ({ "data-reveal": key, "data-in": seen[key] ? "" : undefined, className: "spt-reveal" })
  const firstLogos = experience.slice(0, 3)

  return (
    <div
      ref={rootRef}
      className={"spt-root " + className}
      data-theme={mode}
      data-motion={reduced === false ? "on" : "off"}
      style={
        {
          height,
          "--spt-h": height,
          "--spt-accent": accent,
          "--spt-paper-l": paper,
          "--spt-ink-l": ink,
          "--spt-paper-d": darkPaper,
          "--spt-ink-d": darkInk,
          "--spt-serif": '"Iowan Old Style","Palatino Linotype","URW Palladio L",P052,Palatino,"Book Antiqua",Georgia,serif',
          "--spt-sans": 'ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif',
        } as React.CSSProperties
      }
    >
      <style>{SPT_CSS}</style>

      <div className="spt-scroll" ref={scrollRef} aria-hidden={dialog || undefined}>
        <div className="spt-grid">
          {/* ---------- sidebar ---------- */}
          <aside className="spt-side" aria-label="Profile">
            <div className="spt-side-top">
              <div className="spt-avatar">
                {avatarSrc ? (
                  <img src={avatarSrc} alt={name} width={76} height={76} style={{ maxWidth: "none" }} />
                ) : (
                  <Portrait
                    uid={uid}
                    skin={avatar?.skin ?? "#c68e6e"}
                    hair={avatar?.hair ?? "#231812"}
                    shirt={avatar?.shirt ?? "#ebe6dc"}
                    backdrop={avatar?.backdrop ?? "#cfc0a6"}
                  />
                )}
              </div>
              <div>
                <h2 className="spt-name spt-serif">{name}</h2>
                <p className="spt-role">{role}</p>
              </div>
            </div>
            {bio && <p className="spt-bio">{bio}</p>}
            {signature && (
              <button
                type="button"
                className="spt-sig"
                onClick={() => setSigRun((n) => n + 1)}
                aria-label={"Signature of " + name + ". Click to sign again."}
                title="Sign again"
              >
                <svg key={sigRun} viewBox={"0 0 " + sig.width + " 52"} width={sig.width * 1.25} height={65} aria-hidden="true">
                  <path d={sig.d} pathLength={1} fill="none" stroke="currentColor" strokeWidth={1.35} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            <hr className="spt-rule" />
            {details.length > 0 && (
              <ul className="spt-details">
                {details.map((d, i) => (
                  <li key={i}>
                    <DetailIcon icon={d.icon} />
                    {d.label}
                  </li>
                ))}
              </ul>
            )}
            <div className="spt-side-foot">
              {socials.length > 0 && (
                <ul className="spt-socials">
                  {socials.map((s, i) => (
                    <li key={i}>
                      <a href={s.href} target="_blank" rel="noreferrer" aria-label={s.label} title={s.label}>
                        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                          <SocialIcon icon={s.icon} />
                        </svg>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              <div className="spt-actions">
                {cvUrl ? (
                  <a className="spt-btn spt-btn-dark" href={cvUrl} download target="_blank" rel="noreferrer">
                    <DownloadIcon />
                    {L.downloadCv}
                  </a>
                ) : (
                  <button type="button" className="spt-btn spt-btn-dark" onClick={downloadCv}>
                    <DownloadIcon />
                    {L.downloadCv}
                  </button>
                )}
                <button type="button" className="spt-btn spt-btn-soft" onClick={copyEmail} aria-label={"Copy " + email} title={"Copy " + email}>
                  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                    <SocialIcon icon="mail" />
                  </svg>
                </button>
              </div>
            </div>
          </aside>

          {/* ---------- reading column ---------- */}
          <div className="spt-main">
            <nav className="spt-nav" data-stuck={stuck ? "" : undefined} aria-label="Sections">
              <button
                type="button"
                className="spt-mark"
                aria-label="Back to top"
                onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" })}
              >
                <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.6}>
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="9.6" r="3.4" />
                  <path d="M5.6 18.8c1.4-2.8 3.8-4.2 6.4-4.2s5 1.4 6.4 4.2" strokeLinecap="round" />
                </svg>
              </button>
              <ul className="spt-links" ref={linksRef}>
                <li className="spt-pill" aria-hidden="true" style={{ width: pill?.w ?? 0, transform: "translateX(" + (pill?.x ?? 0) + "px)", opacity: pill ? 1 : 0 }} />
                {sections.map(([k, label]) => (
                  <li key={k}>
                    <a
                      href={"#" + sid(k)}
                      aria-current={active === k ? "true" : undefined}
                      onClick={(e) => {
                        e.preventDefault()
                        go(k)
                      }}
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
              <div className="spt-nav-end">
                {themeToggle && (
                  <button type="button" className="spt-theme" onClick={flipTheme} aria-label="Toggle dark mode" title="Toggle dark mode">
                    <svg className="spt-moon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinejoin="round">
                      <path d="M13.4 9.8A5.6 5.6 0 0 1 6.2 2.6a5.6 5.6 0 1 0 7.2 7.2Z" />
                    </svg>
                    <svg className="spt-sun" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round">
                      <circle cx="8" cy="8" r="3" />
                      <path d="M8 1.4v1.4M8 13.2v1.4M1.4 8h1.4M13.2 8h1.4M3.3 3.3l1 1M11.7 11.7l1 1M3.3 12.7l1-1M11.7 4.3l1-1" />
                    </svg>
                  </button>
                )}
                <button type="button" className="spt-btn spt-btn-dark spt-contact-btn" onClick={openDialog} aria-label={L.contactMe}>
                  <svg viewBox="0 0 14 14" width="13" height="13" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinejoin="round">
                    <path d="M7 1.6c3 0 5.4 2 5.4 4.6S10 10.8 7 10.8c-.6 0-1.2-.1-1.8-.2L2.4 12l.7-2.4C2.1 8.7 1.6 7.5 1.6 6.2 1.6 3.6 4 1.6 7 1.6Z" />
                  </svg>
                  <span className="spt-cm-label">{L.contactMe}</span>
                </button>
              </div>
            </nav>

            <div className="spt-col">
              {/* hero */}
              <header className="spt-hero">
                <div
                  ref={artRef}
                  className="spt-art-wrap"
                  role="button"
                  tabIndex={0}
                  aria-label="Say hi to the illustration"
                  onClick={poke}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      poke()
                    }
                  }}
                  onPointerMove={onArtMove}
                  onPointerLeave={onArtLeave}
                >
                  <HeroArt dotRefs={dotRefs} />
                  {quips.map((q) => (
                    <span key={q.id} className="spt-quip" aria-hidden="true">
                      {q.text}
                    </span>
                  ))}
                </div>
                <h1 className="spt-h1 spt-serif">{headline}</h1>
                {tagline && <p className="spt-tagline">{tagline}</p>}
                {experience.length > 0 && (
                  <button type="button" className="spt-cta" onClick={() => go("experience")}>
                    <span className="spt-stack">
                      {firstLogos.map((co, i) => (
                        <LogoTile key={i} logo={co.logo} name={co.company} size={20} round />
                      ))}
                    </span>
                    {L.viewExperience}
                    <svg className="spt-cta-arrow" viewBox="0 0 14 14" width="13" height="13" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2.5 7h9M8 3.5 11.5 7 8 10.5" />
                    </svg>
                  </button>
                )}
              </header>

              {/* about */}
              {sections.some((s) => s[0] === "about") && (
                <section id={sid("about")} aria-labelledby={sid("about") + "-h"} className="spt-sec">
                  <div {...reveal("about")}>
                    <h2 id={sid("about") + "-h"} className="spt-h2 spt-serif">
                      {L.about}
                    </h2>
                    {aboutParas.map((p, i) => (
                      <p key={i} className="spt-p">
                        {p}
                      </p>
                    ))}
                    {keySkills.length > 0 && (
                      <>
                        <p className="spt-label">{L.keySkills}</p>
                        <ul className="spt-chips">
                          {keySkills.map((s) => {
                            const n = skillCount(s)
                            const on = !!focusSkill && norm(focusSkill) === norm(s)
                            return (
                              <li key={s}>
                                <button
                                  type="button"
                                  className="spt-chip"
                                  aria-pressed={on}
                                  onClick={() => pickSkill(s, n > 0)}
                                  title={n ? "Show the " + n + (n === 1 ? " role" : " roles") + " that used this" : undefined}
                                >
                                  {s}
                                  {on && n > 0 && <i>{n}</i>}
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      </>
                    )}
                  </div>
                </section>
              )}

              {/* experience */}
              {experience.length > 0 && (
                <section id={sid("experience")} aria-labelledby={sid("experience") + "-h"} className="spt-sec">
                  <div {...reveal("experience")}>
                    <h2 id={sid("experience") + "-h"} className="spt-h2 spt-serif">
                      {L.experience}
                    </h2>
                    {focusSkill && (
                      <p className="spt-filter" role="status">
                        <span>
                          Highlighting roles with <b>{focusSkill}</b>
                        </span>
                        <button type="button" onClick={() => setFocusSkill(null)}>
                          Clear
                        </button>
                      </p>
                    )}
                    <ol className="spt-tl">
                      {experience.map((co, ci) => (
                        <li key={ci} className="spt-co" data-multi={co.roles.length > 1 ? "" : undefined}>
                          <LogoTile logo={co.logo} name={co.company} />
                          <div className="spt-roles">
                            {co.roles.map((r, ri) => {
                              const hit = focusSkill ? roleHas(r, focusSkill) : false
                              return (
                                <article key={ri} className="spt-role" data-hit={hit ? "" : undefined} data-dim={focusSkill && !hit ? "" : undefined}>
                                  <div className="spt-role-head">
                                    <div>
                                      <h3 className="spt-serif">{r.title}</h3>
                                      <p className="spt-meta">
                                        {co.company}
                                        {r.type && (
                                          <>
                                            <span aria-hidden="true">•</span>
                                            {r.type}
                                          </>
                                        )}
                                      </p>
                                    </div>
                                    <p className="spt-date">
                                      {r.start} – {r.end}
                                      <small>{now ? spanLabel(r.start, r.end, now) : ""}</small>
                                    </p>
                                  </div>
                                  {r.summary && <p className="spt-p">{r.summary}</p>}
                                  {r.highlights && r.highlights.length > 0 && (
                                    <ul className="spt-bul">
                                      {r.highlights.map((h, hi) => (
                                        <li key={hi}>{h}</li>
                                      ))}
                                    </ul>
                                  )}
                                  {r.skills && r.skills.length > 0 && (
                                    <ul className="spt-tags" aria-label="Skills used">
                                      {r.skills.map((s) => (
                                        <li key={s}>
                                          <button type="button" aria-pressed={!!focusSkill && norm(focusSkill) === norm(s)} onClick={() => pickSkill(s, false)}>
                                            {s}
                                          </button>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </article>
                              )
                            })}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                </section>
              )}

              {/* education */}
              {education.length > 0 && (
                <section id={sid("education")} aria-labelledby={sid("education") + "-h"} className="spt-sec">
                  <div {...reveal("education")}>
                    <h2 id={sid("education") + "-h"} className="spt-h2 spt-serif">
                      {L.education}
                    </h2>
                    <ul className="spt-edus">
                      {education.map((s, i) => {
                        const open = openEdu === i
                        const fold = uid + "-edu-" + i
                        return (
                          <li key={i} className="spt-edu">
                            <LogoTile logo={s.logo} name={s.school} />
                            <div>
                              <div className="spt-role-head">
                                <div>
                                  <h3 className="spt-serif">{s.degree}</h3>
                                  <p className="spt-meta">{s.school}</p>
                                </div>
                                <p className="spt-date">
                                  {s.start} – {s.end}
                                  <small>{now ? spanLabel(s.start, s.end, now) : ""}</small>
                                </p>
                              </div>
                              {s.summary && <p className="spt-p">{s.summary}</p>}
                              {s.notes && s.notes.length > 0 && (
                                <>
                                  <div className="spt-fold" id={fold} data-open={open ? "" : undefined}>
                                    <div>
                                      <ul className="spt-bul">
                                        {s.notes.map((n, ni) => (
                                          <li key={ni}>{n}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  </div>
                                  <button type="button" className="spt-more" aria-expanded={open} aria-controls={fold} onClick={() => setOpenEdu(open ? null : i)}>
                                    {open ? "Less" : "Highlights"}
                                    <svg viewBox="0 0 10 10" width="9" height="9" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
                                      <path d="m2 3.5 3 3 3-3" />
                                    </svg>
                                  </button>
                                </>
                              )}
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                </section>
              )}

              {/* skills */}
              {skills.length > 0 && (
                <section id={sid("skills")} aria-labelledby={sid("skills") + "-h"} className="spt-sec">
                  <div {...reveal("skills")}>
                    <h2 id={sid("skills") + "-h"} className="spt-h2 spt-serif">
                      {L.skills}
                    </h2>
                    {skills.length > 1 && (
                      <div className="spt-tabs" role="tablist" aria-label={L.skills} ref={tabsRef}>
                        <span className="spt-tab-pill" aria-hidden="true" style={{ width: tabPill?.w ?? 0, transform: "translateX(" + (tabPill?.x ?? 0) + "px)", opacity: tabPill ? 1 : 0 }} />
                        {[...skills.map((g) => g.name), L.all].map((label, i) => (
                          <button
                            key={label + i}
                            type="button"
                            role="tab"
                            aria-selected={tab === i}
                            aria-controls={uid + "-skills-panel"}
                            onClick={() => setTab(i)}
                            onKeyDown={(e) => {
                              const n = skills.length + 1
                              const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0
                              if (!d) return
                              e.preventDefault()
                              const next = (i + d + n) % n
                              setTab(next)
                              ;(e.currentTarget.parentElement?.querySelectorAll("button")[next] as HTMLButtonElement | undefined)?.focus()
                            }}
                            tabIndex={tab === i ? 0 : -1}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                    <ul className="spt-skills" id={uid + "-skills-panel"} role={skills.length > 1 ? "tabpanel" : undefined}>
                      {shownSkills.map((s, i) => {
                        const cells = Math.round((Math.max(0, Math.min(100, s.level)) / 100) * 20)
                        return (
                          <li key={tab + "-" + s.name + i} className="spt-skill">
                            <span className="spt-skill-name">
                              {s.name}
                              {s.years ? <small>{s.years + (s.years === 1 ? " yr" : " yrs")}</small> : null}
                            </span>
                            <span className="spt-skill-lvl">{levelName(s.level)}</span>
                            <span className="spt-meter" role="img" aria-label={s.level + " out of 100"}>
                              {Array.from({ length: 20 }, (_, c) => (
                                <SkillCell key={c} i={c} on={c < cells} lit={lit} />
                              ))}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                </section>
              )}

              {/* contact */}
              <section id={sid("contact")} aria-labelledby={sid("contact") + "-h"} className="spt-sec spt-contact">
                <div {...reveal("contact")}>
                  {available && (
                    <p className="spt-status">
                      <span className="spt-dot" aria-hidden="true" />
                      Available for new projects
                    </p>
                  )}
                  <h2 id={sid("contact") + "-h"} className="spt-h2 spt-serif">
                    {contactTitle}
                  </h2>
                  {contactText && <p className="spt-p">{contactText}</p>}
                  <div className="spt-mailrow">
                    <button type="button" className="spt-email" onClick={copyEmail}>
                      <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
                        <SocialIcon icon="mail" />
                      </svg>
                      {email}
                      <span className="spt-copy">Copy</span>
                    </button>
                    <button type="button" className="spt-btn spt-btn-dark" onClick={openDialog}>
                      {L.contactMe}
                    </button>
                  </div>
                  <footer className="spt-foot">
                    <span>
                      © {now ? now.getFullYear() : ""} {name}
                    </span>
                    {clock && (
                      <span>
                        {city ? city + " · " : ""}
                        {clock} local time
                      </span>
                    )}
                  </footer>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      {dialog && (
        <div
          className="spt-overlay"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) closeDialog()
          }}
        >
          <div className="spt-dialog" role="dialog" aria-modal="true" aria-labelledby={uid + "-dlg"}>
            <div className="spt-dialog-head">
              <div>
                <h2 id={uid + "-dlg"} className="spt-serif">
                  Say hello
                </h2>
                <p className="spt-p" style={{ margin: "4px 0 0" }}>
                  This opens a draft to {email} in your mail app.
                </p>
              </div>
              <button type="button" className="spt-x" onClick={closeDialog} aria-label="Close">
                <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round">
                  <path d="m2.5 2.5 7 7M9.5 2.5l-7 7" />
                </svg>
              </button>
            </div>
            <label className="spt-field">
              Your name
              <input ref={firstFieldRef} value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} placeholder="Jane from Acme" />
            </label>
            <label className="spt-field">
              Message
              <textarea
                rows={4}
                value={draft.message}
                onChange={(e) => setDraft({ ...draft, message: e.target.value })}
                placeholder="Hi! We're building…"
              />
            </label>
            <div className="spt-dialog-actions">
              <button type="button" className="spt-btn spt-btn-soft" onClick={copyEmail}>
                Copy email
              </button>
              <a className="spt-btn spt-btn-dark" href={mailto} onClick={() => later(closeDialog, 150)}>
                Open draft
              </a>
            </div>
          </div>
        </div>
      )}

      <div aria-live="polite" className="spt-sr">
        {toast?.text}
      </div>
      {toast && (
        <div key={toast.id} className="spt-toast" aria-hidden="true">
          <svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 7.4 2.6 2.6L11 4.4" />
          </svg>
          {toast.text}
        </div>
      )}
    </div>
  )
}

function SkillCell({ i, on, lit }: { i: number; on: boolean; lit: boolean }) {
  return <i style={{ "--i": i } as React.CSSProperties} data-on={on && lit ? "" : undefined} />
}

function DownloadIcon() {
  return (
    <svg className="spt-dl" viewBox="0 0 14 14" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 2v7M4 6.4 7 9.4l3-3M2.4 11.8h9.2" />
    </svg>
  )
}
