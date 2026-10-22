"use client"

// The testimonials section from ink-orbit-saas-template, standalone: a hatched
// page, a bracketed frame holding a snap-scrolling row of quote cards (stars,
// drawn quote marks, greyscale portraits), an arrows-and-dots pager, and a
// marquee of customer names with generic drawn marks underneath.
//
// No dependencies, no images unless you pass an avatar URL.

import React from "react"

export type InkTestimonial = {
  quote: string
  name: string
  role: string
  /** 1–5 */
  rating?: number
  /** Image URL. Without one, a drawn portrait is used. */
  avatar?: string
}

export type InkOrbitTestimonialsProps = {
  /** `auto` follows prefers-color-scheme. */
  theme?: "light" | "dark" | "auto"
  tag?: string
  /** `*word*` is muted, `\n` breaks the line. */
  title?: string
  testimonials?: InkTestimonial[]
  /** Names for the marquee. Each gets a drawn mark. Empty hides the marquee. */
  logos?: string[]
  /** Seconds per marquee loop. */
  marqueeSpeed?: number
  className?: string
  style?: React.CSSProperties
}

/* ------------------------------------------------------------------ logic */

// #region logic
function clamp(v: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, v))
}

// "Trusted by *Teams*\nWorldwide." → lines of { text, muted } runs. A literal
// backslash-n counts too, since that's what "\n" becomes in a JSX attribute.
function parseTitle(s: string): { text: string; muted: boolean }[][] {
  return s.split(/\n|\\n/).map((line) => {
    const out: { text: string; muted: boolean }[] = []
    line.split("*").forEach((text, i) => {
      if (text) out.push({ text, muted: i % 2 === 1 })
    })
    return out
  })
}

// how many pages a snap track has, and which one is showing
function pageOf(scrollLeft: number, clientWidth: number, cardWidth: number, count: number): { i: number; n: number } {
  const per = Math.max(1, Math.round(clientWidth / Math.max(1, cardWidth)))
  const n = Math.max(1, Math.ceil(count / per))
  return { i: clamp(Math.round(scrollLeft / Math.max(1, clientWidth - 1)), 0, n - 1), n }
}
// #endregion logic

/* --------------------------------------------------------------- defaults */

const D_TESTIMONIALS: InkTestimonial[] = [
  { quote: "Incredible workflow boost. We saved 20+ hours each week.", name: "Daniel M.", role: "Product Manager", rating: 5 },
  { quote: "The AI insights feature changed how we operate. A total game-changer.", name: "Liyana R.", role: "Operations Lead", rating: 5 },
  { quote: "Simple, powerful, and fast. NeuraForge AI fits perfectly into our stack.", name: "Aaron K.", role: "Developer", rating: 5 },
  { quote: "Reports that used to take a day now land in my inbox before standup.", name: "Priya S.", role: "Head of Data", rating: 5 },
  { quote: "We retired four internal tools in a month. The integrations just work.", name: "Marcus T.", role: "CTO", rating: 5 },
  { quote: "It feels less like software and more like a teammate who never sleeps.", name: "Elena V.", role: "Founder", rating: 4 },
]
const D_LOGOS = ["logoipsum", "Lumen", "Orbital", "Quanta", "Vertex", "Halcyon", "Northwind"]

/* -------------------------------------------------------------- component */

export default function InkOrbitTestimonials({
  theme = "auto",
  tag = "Testimonial",
  title = "Trusted by *Teams*\nWorldwide.",
  testimonials = D_TESTIMONIALS,
  logos = D_LOGOS,
  marqueeSpeed = 34,
  className = "",
  style,
}: InkOrbitTestimonialsProps) {
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "")
  const [dark, setDark] = React.useState(theme === "dark")
  React.useEffect(() => {
    if (theme !== "auto" || typeof window === "undefined" || !window.matchMedia) {
      setDark(theme === "dark")
      return
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const on = () => setDark(mq.matches)
    on()
    mq.addEventListener?.("change", on)
    return () => mq.removeEventListener?.("change", on)
  }, [theme])

  /* reveal once on screen */
  const revealRef = React.useRef(null as HTMLDivElement | null)
  const [inView, setInView] = React.useState(false)
  React.useEffect(() => {
    const el = revealRef.current
    if (!el || inView) return
    if (typeof IntersectionObserver !== "function") {
      setInView(true)
      return
    }
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          setInView(true)
          io.disconnect()
        }
      },
      { threshold: 0.15 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [inView])

  /* pager */
  const trackRef = React.useRef(null as HTMLDivElement | null)
  const [page, setPage] = React.useState({ i: 0, n: 1 })
  React.useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const read = () => {
      const card = el.firstElementChild as HTMLElement | null
      setPage(pageOf(el.scrollLeft, el.clientWidth, card ? card.offsetWidth : el.clientWidth, testimonials.length))
    }
    read()
    el.addEventListener("scroll", read, { passive: true })
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(read) : null
    ro?.observe(el)
    return () => {
      el.removeEventListener("scroll", read)
      ro?.disconnect()
    }
  }, [testimonials.length])
  const turn = (dir: number) => {
    const el = trackRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    if (dir > 0 && el.scrollLeft >= max - 4) el.scrollTo({ left: 0 })
    else if (dir < 0 && el.scrollLeft <= 4) el.scrollTo({ left: max })
    else el.scrollBy({ left: dir * el.clientWidth })
  }
  const toPage = (i: number) => trackRef.current?.scrollTo({ left: i * (trackRef.current?.clientWidth ?? 0) })
  const onTrackKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault()
      turn(e.key === "ArrowRight" ? 1 : -1)
    }
  }

  return (
    <div
      className={"it-root " + className}
      data-theme={dark ? "dark" : "light"}
      style={{ ...style, ["--it-marq" as string]: Math.max(4, marqueeSpeed) + "s" }}
    >
      <style>{IT_CSS}</style>
      <div className="it-shell">
        <section className="it-sec" aria-labelledby={uid + "test"}>
          <div className="it-reveal" ref={revealRef} data-in={inView}>
            <div className="it-head" id={uid + "test"}>
              {tag && <span className="it-tag">{tag}</span>}
              <h2 className="it-h2">
                {parseTitle(title).map((line, i) => (
                  <span key={i}>
                    {line.map((run, j) =>
                      run.muted ? (
                        <span key={j} className="it-muted" style={{ display: "inline" }}>
                          {run.text}
                        </span>
                      ) : (
                        <React.Fragment key={j}>{run.text}</React.Fragment>
                      ),
                    )}
                  </span>
                ))}
              </h2>
            </div>
            <div className="it-frame">
              <span className="it-c it-c-tl" aria-hidden="true" />
              <span className="it-c it-c-tr" aria-hidden="true" />
              <span className="it-c it-c-bl" aria-hidden="true" />
              <span className="it-c it-c-br" aria-hidden="true" />
              <div className="it-tframe">
                <div className="it-track" ref={trackRef} tabIndex={0} aria-label="Testimonials" onKeyDown={onTrackKey}>
                  {testimonials.map((t, i) => {
                    const r = clamp(Math.round(t.rating ?? 5), 0, 5)
                    return (
                      <figure key={i} className="it-quote">
                        <div className="it-stars" role="img" aria-label={r + " out of 5"}>
                          {[0, 1, 2, 3, 4].map((s) => (
                            <Star key={s} off={s >= r} />
                          ))}
                        </div>
                        <blockquote>
                          <span className="it-qm" style={{ left: 0, top: -2 }}>
                            <QuoteMark />
                          </span>
                          {t.quote}
                          <span className="it-qm" style={{ right: 2, bottom: -2 }}>
                            <QuoteMark flip />
                          </span>
                        </blockquote>
                        <figcaption className="it-who">
                          <span>
                            {t.avatar ? (
                              <img src={t.avatar} alt="" width={38} height={38} loading="lazy" style={{ width: 38, height: 38, objectFit: "cover", filter: "grayscale(1)", maxWidth: "none" }} />
                            ) : (
                              <Portrait index={i} size={38} uid={uid + "t"} />
                            )}
                          </span>
                          <span>
                            {t.name}, {t.role}
                          </span>
                        </figcaption>
                      </figure>
                    )
                  })}
                </div>
                {page.n > 1 && (
                  <div className="it-tnav">
                    <button type="button" className="it-icon-btn" onClick={() => turn(-1)} aria-label="Previous testimonials">
                      <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" style={{ transform: "rotate(180deg)" }}>
                        <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <div className="it-dots">
                      {Array.from({ length: page.n }, (_, i) => (
                        <button key={i} type="button" className="it-dot" aria-label={"Page " + (i + 1)} aria-current={page.i === i ? "true" : undefined} onClick={() => toPage(i)} />
                      ))}
                    </div>
                    <button type="button" className="it-icon-btn" onClick={() => turn(1)} aria-label="Next testimonials">
                      <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
                        <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
            {logos.length > 0 && (
              <div className="it-marquee" role="group" aria-label={"Customers: " + logos.join(", ")}>
                <div className="it-marquee-row motion-reduce:animate-none">
                  {[...logos, ...logos].map((name, i) => (
                    <span key={i} className="it-logo" aria-hidden="true">
                      <LogoGlyph index={i % logos.length} />
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ marks */

function Star({ off }: { off?: boolean }) {
  return (
    <svg className={off ? "it-off" : undefined} width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M6 .8 7.6 4.2l3.6.4-2.7 2.5.8 3.6L6 8.9 2.7 10.7l.8-3.6L.8 4.6l3.6-.4z" fill="currentColor" />
    </svg>
  )
}

function QuoteMark({ flip }: { flip?: boolean }) {
  return (
    <svg width="14" height="12" viewBox="0 0 14 12" aria-hidden="true" style={flip ? { transform: "rotate(180deg)" } : undefined}>
      <path d="M1 11V6.5C1 3.4 2.6 1.4 5.3 1l.4 1.3C4.2 2.8 3.4 3.9 3.3 5.5H5.6V11H1Zm7.3 0V6.5c0-3.1 1.6-5.1 4.3-5.5l.4 1.3c-1.5.5-2.3 1.6-2.4 3.2h2.3V11H8.3Z" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

/* drawn portraits — greyscale, so they sit in the palette */
const PORTRAITS = [
  { hair: "short", beard: true, glasses: false, skin: "#b9b4ae", hairC: "#2b2a29", shirt: "#3a3a3a", bg: "#d9d6d2" },
  { hair: "long", beard: false, glasses: false, skin: "#d6d0c9", hairC: "#8d7f6c", shirt: "#7b7b7b", bg: "#e6e3df" },
  { hair: "buzz", beard: false, glasses: true, skin: "#a7a19a", hairC: "#3d3c3a", shirt: "#1f1f1f", bg: "#cfcfcf" },
  { hair: "bun", beard: false, glasses: true, skin: "#9a8f84", hairC: "#1e1d1c", shirt: "#5a5a5a", bg: "#dedbd6" },
  { hair: "curly", beard: false, glasses: false, skin: "#7f746a", hairC: "#1a1918", shirt: "#8a8a8a", bg: "#d3d0cb" },
  { hair: "side", beard: true, glasses: true, skin: "#c7c0b8", hairC: "#5b5650", shirt: "#2c2c2c", bg: "#e1ded9" },
]

function Portrait({ index, size = 38, uid }: { index: number; size?: number; uid: string }) {
  const p = PORTRAITS[((index % PORTRAITS.length) + PORTRAITS.length) % PORTRAITS.length]
  const id = uid + "pt" + index
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={p.bg} />
          <stop offset="1" stopColor="#9d9a96" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" fill={"url(#" + id + ")"} />
      {p.hair === "long" && <path d="M18 30c0-12 6-19 14-19s14 7 14 19v20H18z" fill={p.hairC} />}
      {p.hair === "curly" &&
        [[22, 20], [28, 15], [36, 15], [42, 20], [45, 28], [19, 28]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="7" fill={p.hairC} />)}
      <path d="M8 64c2-12 12-18 24-18s22 6 24 18z" fill={p.shirt} />
      <rect x="27.5" y="36" width="9" height="11" rx="3" fill={p.skin} />
      <path d="M27.5 44c3 2.5 6 2.5 9 0v3h-9z" fill="#000" opacity=".12" />
      <ellipse cx="32" cy="28" rx="11" ry="13" fill={p.skin} />
      {p.hair === "short" && <path d="M21 25c0-9 5-13 11-13s11 4 11 13c-2-4-6-6-11-6s-9 2-11 6z" fill={p.hairC} />}
      {p.hair === "buzz" && <path d="M21.5 24c.5-8 5-11.5 10.5-11.5S42 16 42.5 24c-3-3-6.5-4-10.5-4s-7.5 1-10.5 4z" fill={p.hairC} opacity=".85" />}
      {p.hair === "bun" && (
        <>
          <circle cx="32" cy="11" r="6" fill={p.hairC} />
          <path d="M21 26c0-10 5-14 11-14s11 4 11 14c-2-5-6-7.5-11-7.5S23 21 21 26z" fill={p.hairC} />
        </>
      )}
      {p.hair === "long" && <path d="M21 27c0-10 5-15 11-15s11 5 11 15c-3-6-8-8-14-7-3 .5-6 3-8 7z" fill={p.hairC} />}
      {p.hair === "side" && <path d="M21 26c-1-9 5-14 12-14 6 0 11 4 10 12-4-5-10-6-17-3-2 1-4 3-5 5z" fill={p.hairC} />}
      {p.beard && <path d="M21.5 30c1 9 5 12 10.5 12s9.5-3 10.5-12c-2 4-5 5-10.5 5s-8.5-1-10.5-5z" fill={p.hairC} opacity=".9" />}
      <circle cx="27.5" cy="28" r="1.2" fill="#1a1a1a" />
      <circle cx="36.5" cy="28" r="1.2" fill="#1a1a1a" />
      {p.glasses && (
        <g fill="none" stroke="#1a1a1a" strokeWidth="1.1">
          <circle cx="27.5" cy="28" r="3.6" />
          <circle cx="36.5" cy="28" r="3.6" />
          <path d="M31.1 28h1.8" />
        </g>
      )}
      <path d="M29 34.5c1.8 1.2 4.2 1.2 6 0" fill="none" stroke="#1a1a1a" strokeWidth="1" strokeLinecap="round" opacity=".7" />
    </svg>
  )
}

/* generic wordmark glyphs for the marquee — never anyone's real logo */
function LogoGlyph({ index }: { index: number }) {
  const k = index % 6
  return (
    <svg width="26" height="22" viewBox="0 0 26 22" aria-hidden="true" fill="currentColor">
      {k === 0 && <path d="M3 3h8v4H7v4h4v8H3zM15 3h8v8h-4V7h-4zM15 11h4v4h4v4h-8z" />}
      {k === 1 && (
        <g fill="none" stroke="currentColor" strokeWidth="2.6">
          <circle cx="8" cy="11" r="5.5" />
          <circle cx="18" cy="11" r="5.5" />
        </g>
      )}
      {k === 2 && (
        <g>
          <ellipse cx="13" cy="11" rx="11" ry="8" />
          <ellipse cx="13" cy="11" rx="6" ry="4" fill="var(--it-paper)" />
          <ellipse cx="13" cy="11" rx="2.4" ry="1.6" />
        </g>
      )}
      {k === 3 && <path d="M2 18 9 4h4L6 18zm8 0 7-14h4l-7 14z" />}
      {k === 4 && (
        <g>
          <path d="M13 1.5 22 6.5v9L13 20.5 4 15.5v-9z" />
          <circle cx="13" cy="11" r="3.4" fill="var(--it-paper)" />
        </g>
      )}
      {k === 5 && (
        <g>
          <rect x="2" y="3" width="5" height="16" rx="2.5" />
          <rect x="10.5" y="7" width="5" height="12" rx="2.5" />
          <rect x="19" y="11" width="5" height="8" rx="2.5" />
        </g>
      )}
    </svg>
  )
}

const IT_CSS = `
.it-root{--it-page:#efefef;--it-hatch:rgba(0,0,0,.06);--it-paper:#fbfbfb;--it-card:#f4f4f4;--it-raise:#ffffff;--it-ink:#151515;--it-soft:#3d3d3d;--it-muted:#7b7b7b;--it-faint:#a8a8a8;--it-line:#e2e2e2;--it-line-strong:#cfcfcf;--it-bracket:#c9c9c9;--it-shadow:0 1px 2px rgba(0,0,0,.05),0 8px 24px -12px rgba(0,0,0,.12);--it-sans:"Manrope","Inter",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;position:relative;width:100%;box-sizing:border-box;background-color:var(--it-page);background-image:repeating-linear-gradient(135deg,var(--it-hatch) 0 1px,transparent 1px 10px);color:var(--it-ink);font-family:var(--it-sans);font-size:15px;line-height:1.5;-webkit-font-smoothing:antialiased;padding:28px clamp(10px,2.4vw,28px);transition:background-color .45s ease,color .45s ease}
.it-root[data-theme="dark"]{--it-page:#0b0b0b;--it-hatch:rgba(255,255,255,.05);--it-paper:#121212;--it-card:#181818;--it-raise:#1e1e1e;--it-ink:#eeeeee;--it-soft:#c9c9c9;--it-muted:#8d8d8d;--it-faint:#5d5d5d;--it-line:#262626;--it-line-strong:#363636;--it-bracket:#444444;--it-shadow:0 1px 2px rgba(0,0,0,.4),0 10px 30px -14px rgba(0,0,0,.7)}
.it-root :where(*){box-sizing:border-box}
.it-root :focus-visible{outline:2px solid var(--it-ink);outline-offset:2px}
.it-root :where(button){font:inherit;color:inherit;background:none;border:0;padding:0;margin:0;cursor:pointer}
.it-root :where(svg){display:block;max-width:none;flex:none}
.it-root :where(img){display:block;max-width:none}
.it-root :where(h2,figure,blockquote){margin:0;padding:0;font-size:inherit;font-weight:inherit}
.it-shell{width:100%;max-width:1180px;margin:0 auto;container-type:inline-size}
.it-sec{position:relative;background:var(--it-paper);border:1px solid var(--it-line);padding:clamp(36px,6cqw,72px) clamp(16px,4cqw,48px);transition:background-color .45s,border-color .45s}
.it-reveal{opacity:0;transform:translateY(18px);transition:opacity .8s cubic-bezier(.2,.7,.2,1),transform .8s cubic-bezier(.2,.7,.2,1)}
.it-reveal[data-in="true"]{opacity:1;transform:none}
.it-head{display:flex;flex-direction:column;align-items:center;text-align:center;gap:14px;margin-bottom:clamp(28px,4.5cqw,52px)}
.it-tag{display:inline-block;padding:4px 10px;font-size:11.5px;letter-spacing:.02em;color:var(--it-soft);background:var(--it-card);border:1px solid var(--it-line)}
.it-h2{font-size:clamp(28px,4.4cqw,44px);line-height:1.08;letter-spacing:-.025em;font-weight:500}
.it-h2>span{display:block}
.it-muted{color:var(--it-faint)}
.it-frame{position:relative}
.it-c{position:absolute;width:12px;height:12px;border-color:var(--it-bracket);border-style:solid;border-width:0;pointer-events:none}
.it-c-tl{top:-6px;left:-6px;border-top-width:1.5px;border-left-width:1.5px}
.it-c-tr{top:-6px;right:-6px;border-top-width:1.5px;border-right-width:1.5px}
.it-c-bl{bottom:-6px;left:-6px;border-bottom-width:1.5px;border-left-width:1.5px}
.it-c-br{bottom:-6px;right:-6px;border-bottom-width:1.5px;border-right-width:1.5px}
.it-tframe{padding:clamp(18px,3cqw,34px) clamp(8px,2cqw,26px);border:1px solid var(--it-line)}
.it-track{display:grid;grid-auto-flow:column;grid-auto-columns:100%;gap:clamp(12px,2cqw,22px);overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;padding:8px 6px 10px;scroll-behavior:smooth}
.it-track::-webkit-scrollbar{display:none}
@container (min-width:560px){.it-track{grid-auto-columns:calc((100% - clamp(12px,2cqw,22px)) / 2)}}
@container (min-width:900px){.it-track{grid-auto-columns:calc((100% - 2 * clamp(12px,2cqw,22px)) / 3)}}
.it-quote{scroll-snap-align:start;display:flex;flex-direction:column;gap:18px;min-height:268px;padding:22px 20px 18px;background:var(--it-card);border:1px solid var(--it-line-strong);transition:transform .45s cubic-bezier(.2,.8,.2,1),box-shadow .45s,background-color .45s}
.it-quote:hover{transform:translateY(-4px);box-shadow:var(--it-shadow);background:var(--it-raise)}
.it-stars{display:flex;gap:3px;color:var(--it-ink)}
.it-stars .it-off{color:var(--it-line-strong)}
.it-quote blockquote{position:relative;font-size:clamp(15px,1.6cqw,17px);line-height:1.45;letter-spacing:-.01em;padding:0 22px 0 18px;color:var(--it-ink)}
.it-qm{position:absolute;color:var(--it-ink)}
.it-who{display:flex;align-items:center;gap:11px;margin-top:auto;font-size:12.5px;color:var(--it-soft)}
.it-who>span:first-child{width:38px;height:38px;flex:none;overflow:hidden;border:1px solid var(--it-line-strong)}
.it-tnav{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:16px}
.it-icon-btn{display:inline-grid;place-items:center;width:34px;height:34px;color:var(--it-muted);border:1px solid transparent;transition:color .2s,border-color .2s}
.it-icon-btn:hover{color:var(--it-ink);border-color:var(--it-line)}
.it-dots{display:flex;gap:6px}
.it-dot{width:6px;height:6px;border-radius:99px;background:var(--it-line-strong);transition:width .35s cubic-bezier(.2,.8,.2,1),background-color .3s}
.it-dot[aria-current="true"]{width:20px;background:var(--it-ink)}
.it-marquee{position:relative;overflow:hidden;margin-top:clamp(24px,3.5cqw,40px);-webkit-mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent);mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)}
.it-marquee-row{display:flex;width:max-content;gap:clamp(36px,5cqw,64px);animation:it-marq var(--it-marq,34s) linear infinite;padding:6px 0}
.it-marquee:hover .it-marquee-row{animation-play-state:paused}
.it-logo{display:inline-flex;align-items:center;gap:8px;font-weight:700;font-size:19px;letter-spacing:-.04em;color:var(--it-soft);opacity:.8;white-space:nowrap;transition:opacity .25s,color .25s}
.it-logo:hover{opacity:1;color:var(--it-ink)}
@keyframes it-marq{to{transform:translateX(-50%)}}
@media (prefers-reduced-motion:reduce){
.it-reveal{opacity:1;transform:none;transition:none}
.it-marquee-row{animation:none}
.it-track{scroll-behavior:auto}
.it-quote,.it-dot{transition:none}
}
`
