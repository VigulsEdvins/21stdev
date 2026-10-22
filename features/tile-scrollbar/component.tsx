"use client"

import * as React from "react"

export type TileScrollbarProps = {
  /** Tiles across the tray on wide screens. */
  columns?: number
  /** Tile rows on wide screens. `columns * rows` is the number of slices the page is cut into. */
  rows?: number
  /**
   * Tiles across once the viewport is narrower than `compactBreakpoint`. The
   * slice count never changes — the tray just lies down into a bottom dock.
   */
  compactColumns?: number
  /** Viewport width, in px, below which the tray becomes a bottom dock. */
  compactBreakpoint?: number
  /**
   * Selector for the page's sections. Each match gets a dot on the tile it
   * starts in, names the caption while you are inside it, and becomes the jump
   * target for that tile. Pass `""` for a plain progress tray.
   */
  sections?: string
  /** Caption shown above the first section. */
  introLabel?: string
  /** Breathing room above a heading when jumping to it, in px. */
  offset?: number
  /** Milliseconds of no interaction before the tray blurs back into the page. */
  idleMs?: number
  /** Tile edge on wide screens, in px. The compact dock uses two thirds of it. */
  tileSize?: number
  /** Space between tiles on wide screens, in px. */
  gap?: number
  /** First-run note under the tray, dismissed on first use. `null` renders none. */
  hint?: React.ReactNode
  /**
   * Hide the host page's native scrollbar while this is mounted — the point of
   * the component, but a change to the host document, so it is a prop. The
   * attribute it sets on `<html>` is removed on unmount.
   */
  hideNativeScrollbar?: boolean
  /** Accessible name for the scrollbar. */
  label?: string
  /** `id` of the region being scrolled. `role="scrollbar"` wants one. */
  controls?: string
  className?: string
}

type Section = { label: string; top: number; target: number }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export default function TileScrollbar({
  columns = 3,
  rows = 8,
  compactColumns = 8,
  compactBreakpoint = 720,
  sections = "[data-section]",
  introLabel = "Introduction",
  offset = 28,
  idleMs = 1500,
  tileSize = 30,
  gap = 5,
  hint = "Each tile is a slice of the page. Pick one to jump there, or drag across them to scrub.",
  hideNativeScrollbar = true,
  label = "Page position",
  controls,
  className = "",
}: TileScrollbarProps) {
  const count = Math.max(1, Math.round(columns) * Math.round(rows))

  const rootRef = React.useRef<HTMLElement | null>(null)
  const stageRef = React.useRef<HTMLDivElement | null>(null)
  const trayRef = React.useRef<HTMLDivElement | null>(null)
  const tipRef = React.useRef<HTMLDivElement | null>(null)
  const tipNameRef = React.useRef<HTMLSpanElement | null>(null)
  const tipPctRef = React.useRef<HTMLSpanElement | null>(null)
  const labelRef = React.useRef<HTMLSpanElement | null>(null)
  const pctRef = React.useRef<HTMLSpanElement | null>(null)
  const hintRef = React.useRef<HTMLParagraphElement | null>(null)
  const tileRefs = React.useRef<(HTMLDivElement | null)[]>([])
  tileRefs.current.length = count

  // The host page's scrollbar is hidden by attribute rather than by a bare
  // `html { }` rule, so nothing leaks into a page that does not mount this.
  React.useEffect(() => {
    if (!hideNativeScrollbar) return
    const html = document.documentElement
    html.setAttribute("data-tsb-hide-scrollbar", "")
    return () => html.removeAttribute("data-tsb-hide-scrollbar")
  }, [hideNativeScrollbar])

  React.useEffect(() => {
    const root = rootRef.current
    const stage = stageRef.current
    const tray = trayRef.current
    const tip = tipRef.current
    if (!root || !stage || !tray || !tip) return

    const doc = (document.scrollingElement || document.documentElement) as HTMLElement
    const reduce = matchMedia("(prefers-reduced-motion: reduce)")
    const compactMq = matchMedia("(max-width: " + compactBreakpoint + "px)")

    let secs: Section[] = []
    let meta: { section: number; starts: number }[] = []
    let viewH = 0
    let max = 0
    let compact = false
    let cols = columns
    let current = -1
    let hot = -1
    let hovering = false
    let drag: { x: number; y: number; moved: boolean; tile: number } | null = null
    let kbIndex: number | null = null
    let kbTime = 0
    let idleTimer = 0

    /* ---- Idle: the tray softens back into the page when you are not using it ---- */

    const wake = () => {
      root.dataset.awake = "true"
      clearTimeout(idleTimer)
      idleTimer = window.setTimeout(() => {
        if (hovering || drag || document.activeElement === tray) return
        root.dataset.awake = "false"
      }, idleMs)
    }

    /* ---- Geometry ---- */

    const sectionAt = (scrollTop: number) => {
      const line = scrollTop + viewH * 0.35
      let active = -1
      secs.forEach((s, i) => {
        if (s.top <= line) active = i
      })
      return active
    }

    const layout = () => {
      viewH = doc.clientHeight
      max = Math.max(0, doc.scrollHeight - viewH)
      root.hidden = max < 2
      if (root.hidden) return

      compact = compactMq.matches
      cols = Math.max(1, Math.round(compact ? compactColumns : columns))
      const tile = compact ? Math.max(8, Math.round(tileSize * 0.66)) : tileSize
      const g = compact ? Math.max(2, Math.round(gap * 0.8)) : gap
      const pad = compact ? 6 : 10

      root.dataset.compact = String(compact)
      tray.style.setProperty("--tsb-cols", String(cols))
      tray.style.setProperty("--tsb-tile", tile + "px")
      tray.style.setProperty("--tsb-gap", g + "px")
      tray.style.setProperty("--tsb-pad", pad + "px")

      // The tray is tilted, so its footprint on the page is wider and shorter
      // than its own box. Start from the projected bounding box; `fit` below
      // corrects whatever this misses.
      const rowsNow = Math.ceil(count / cols)
      const trayW = cols * tile + (cols - 1) * g + pad * 2
      const trayH = rowsNow * tile + (rowsNow - 1) * g + pad * 2
      const rx = ((compact ? 48 : 46) * Math.PI) / 180
      const rz = ((compact ? 6 : 12) * Math.PI) / 180
      const estW = Math.ceil(trayW * Math.cos(rz) + trayH * Math.cos(rx) * Math.sin(rz) + 12)
      const estH = Math.ceil(trayH * Math.cos(rx) * Math.cos(rz) + trayW * Math.sin(rz) + 12)
      stage.style.width = estW + "px"
      stage.style.height = estH + "px"

      const scrollTop = doc.scrollTop
      const nodes = sections ? Array.from(document.querySelectorAll<HTMLElement>(sections)) : []
      secs = nodes.map((node, i) => {
        const top = node.getBoundingClientRect().top + scrollTop
        const heading = node.querySelector("h1, h2, h3, h4")
        const name =
          node.dataset.section || heading?.textContent?.trim() || "Section " + (i + 1)
        return { label: name, top, target: clamp(top - offset, 0, max) }
      })

      meta = tileRefs.current.map((el, index) => {
        const lo = (index / count) * max
        const hi = ((index + 1) / count) * max
        const last = index === count - 1
        const starts = secs.findIndex(
          (s) => s.target >= lo && (s.target < hi || (last && s.target <= hi)),
        )
        const section = starts >= 0 ? starts : sectionAt((lo + hi) / 2)
        if (el) {
          el.dataset.alt = String(section % 2 !== 0)
          el.dataset.start = String(starts >= 0)
        }
        return { section, starts }
      })

      current = -1
      update()
      fit(estW, estH)
    }

    // The tilt, the lift on the raised tile and the rise are all applied by CSS,
    // so the only footprint worth trusting is the one the browser reports. The
    // stage does not clip, but the caption sits under it in flow — an estimate
    // that runs short puts the tray on top of its own label, which is exactly
    // what a tall narrow tray does.
    const fit = (estW: number, estH: number) => {
      const t = tray.getBoundingClientRect()
      const s = stage.getBoundingClientRect()
      const dx = Math.max(0, s.left - t.left, t.right - s.right)
      const dy = Math.max(0, s.top - t.top, t.bottom - s.bottom)
      if (dx > 0.5) stage.style.width = Math.ceil(estW + dx * 2) + "px"
      if (dy > 0.5) stage.style.height = Math.ceil(estH + dy * 2) + "px"
    }

    /* ---- Render scroll position ---- */

    const update = () => {
      if (root.hidden) return
      const st = doc.scrollTop
      const p = max ? clamp(st / max, 0, 1) : 0
      const cur = Math.min(count - 1, Math.floor(p * count))
      const fill = (p * count - cur) * 100

      if (cur !== current) {
        tileRefs.current.forEach((el, i) => {
          if (el) el.dataset.state = i < cur ? "done" : i === cur ? "now" : "todo"
        })
        current = cur
      }
      tileRefs.current[cur]?.style.setProperty("--tsb-fill", fill.toFixed(1) + "%")

      let sec = sectionAt(st)
      if (p > 0.999 && secs.length) sec = secs.length - 1
      const name = sec >= 0 ? secs[sec].label : introLabel
      const pct = Math.round(p * 100)

      if (labelRef.current) labelRef.current.textContent = name
      if (pctRef.current) pctRef.current.textContent = pct + "%"
      tray.setAttribute("aria-valuenow", String(pct))
      tray.setAttribute("aria-valuetext", pct + "%, " + name)

      if (hot >= 0) placeTip(hot)
      wake()
    }

    /* ---- Scrolling ---- */

    const scrollToTop = (top: number, smooth: boolean) => {
      window.scrollTo({
        top: clamp(top, 0, max),
        behavior: smooth && !reduce.matches ? "smooth" : "auto",
      })
    }
    const scrollToProgress = (p: number, smooth: boolean) => scrollToTop(p * max, smooth)
    const goToTile = (index: number, smooth: boolean) => {
      const m = meta[index]
      if (m && m.starts >= 0) scrollToTop(secs[m.starts].target, smooth)
      else scrollToProgress(index / count, smooth)
    }

    /* ---- Tooltip ---- */

    const placeTip = (index: number) => {
      const el = tileRefs.current[index]
      if (!el) return
      const r = el.getBoundingClientRect()
      const t = tray.getBoundingClientRect()
      if (compact) {
        tip.style.left = r.left + r.width / 2 + "px"
        tip.style.top = t.top - 14 + "px"
        tip.style.transform = "translate(-50%, -100%)"
      } else {
        tip.style.left = t.left - 14 + "px"
        tip.style.top = r.top + r.height / 2 + "px"
        tip.style.transform = "translate(-100%, -50%)"
      }
    }

    const setHot = (index: number) => {
      if (index !== hot) {
        tileRefs.current[hot]?.removeAttribute("data-hot")
        if (index >= 0) tileRefs.current[index]?.setAttribute("data-hot", "true")
        hot = index
      }
      if (index < 0) {
        tip.dataset.on = "false"
        return
      }
      const s = secs[meta[index]?.section ?? -1]
      if (tipNameRef.current) tipNameRef.current.textContent = s ? s.label : introLabel
      if (tipPctRef.current) {
        tipPctRef.current.textContent = Math.round((index / count) * 100) + "%"
      }
      placeTip(index)
      tip.dataset.on = "true"
    }

    /* ---- Pointer ---- */

    const tileAt = (x: number, y: number) => {
      const el = document.elementFromPoint(x, y)
      const tileEl = el instanceof Element ? el.closest<HTMLElement>(".tsb-tile") : null
      return tileEl && tray.contains(tileEl) ? Number(tileEl.dataset.index) : -1
    }

    const leave = () => {
      hovering = false
      setHot(-1)
      wake()
    }

    const onEnter = () => {
      hovering = true
      wake()
    }
    const onLeave = () => {
      if (!drag) leave()
    }

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      tray.setPointerCapture(e.pointerId)
      const tile = tileAt(e.clientX, e.clientY)
      drag = { x: e.clientX, y: e.clientY, moved: false, tile }
      hovering = true
      setHot(tile)
      wake()
    }

    const onMove = (e: PointerEvent) => {
      // pointerenter does not re-fire when the tray moves under a stationary
      // cursor, so enter alone is not enough to keep the tray awake.
      hovering = true
      wake()
      const tile = tileAt(e.clientX, e.clientY)
      if (drag) {
        if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 4) {
          drag.moved = true
          root.dataset.dragging = "true"
        }
        if (drag.moved && tile >= 0) {
          // Scrub continuously: where you are across the tile refines the jump.
          const r = tileRefs.current[tile]!.getBoundingClientRect()
          const frac = clamp((e.clientX - r.left) / r.width, 0, 0.999)
          scrollToProgress((tile + frac) / count, false)
        }
      }
      if (tile >= 0 || !drag) setHot(tile)
    }

    const endDrag = (e: PointerEvent) => {
      drag = null
      root.dataset.dragging = "false"
      if (tray.hasPointerCapture(e.pointerId)) tray.releasePointerCapture(e.pointerId)
      const over = document.elementFromPoint(e.clientX, e.clientY)
      const stillOver = e.pointerType === "mouse" && over instanceof Node && tray.contains(over)
      if (stillOver) wake()
      else leave()
    }

    const onUp = (e: PointerEvent) => {
      const d = drag
      if (!d) return
      if (!d.moved) {
        const tile = tileAt(e.clientX, e.clientY)
        const target = tile >= 0 ? tile : d.tile
        if (target >= 0) goToTile(target, true)
      }
      endDrag(e)
    }

    /* ---- Keyboard ---- */

    const onKey = (e: KeyboardEvent) => {
      const step = ({ ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols } as Record<string, number>)[e.key]
      const st = doc.scrollTop

      if (step !== undefined) {
        // Chain quick presses even while a smooth scroll is still travelling.
        const recent = performance.now() - kbTime < 700
        const base = recent && kbIndex !== null ? kbIndex : current
        const next = clamp(base + step, 0, count - 1)
        kbIndex = next
        kbTime = performance.now()
        scrollToProgress(next / count, true)
      } else if (e.key === "PageDown") scrollToTop(st + viewH * 0.9, true)
      else if (e.key === "PageUp") scrollToTop(st - viewH * 0.9, true)
      else if (e.key === "Home") scrollToTop(0, true)
      else if (e.key === "End") scrollToTop(max, true)
      else return
      e.preventDefault()
    }

    /* ---- Wiring ---- */

    let scrollFrame = 0
    const onScroll = () => {
      if (!scrollFrame) {
        scrollFrame = requestAnimationFrame(() => {
          scrollFrame = 0
          update()
        })
      }
    }

    let layoutFrame = 0
    const relayout = () => {
      cancelAnimationFrame(layoutFrame)
      layoutFrame = requestAnimationFrame(layout)
    }

    const dismissHint = () => {
      if (hintRef.current) hintRef.current.dataset.gone = "true"
    }
    const onScrollHint = () => {
      if (scrollY > innerHeight * 0.6) dismissHint()
    }

    addEventListener("scroll", onScroll, { passive: true })
    addEventListener("scroll", onScrollHint, { passive: true })
    addEventListener("resize", relayout)
    const ro = new ResizeObserver(relayout)
    ro.observe(document.body)
    compactMq.addEventListener("change", relayout)
    if (document.fonts) document.fonts.ready.then(relayout).catch(() => {})

    tray.addEventListener("pointerenter", onEnter)
    tray.addEventListener("pointerleave", onLeave)
    tray.addEventListener("pointermove", onMove)
    tray.addEventListener("pointerdown", onDown)
    tray.addEventListener("pointerup", onUp)
    tray.addEventListener("pointercancel", endDrag)
    tray.addEventListener("keydown", onKey)
    tray.addEventListener("focus", wake)
    tray.addEventListener("blur", wake)

    const hintEvents = ["pointerenter", "pointerdown", "focusin"] as const
    hintEvents.forEach((type) => root.addEventListener(type, dismissHint, { once: true }))

    layout()

    return () => {
      cancelAnimationFrame(scrollFrame)
      cancelAnimationFrame(layoutFrame)
      clearTimeout(idleTimer)
      removeEventListener("scroll", onScroll)
      removeEventListener("scroll", onScrollHint)
      removeEventListener("resize", relayout)
      ro.disconnect()
      compactMq.removeEventListener("change", relayout)
      tray.removeEventListener("pointerenter", onEnter)
      tray.removeEventListener("pointerleave", onLeave)
      tray.removeEventListener("pointermove", onMove)
      tray.removeEventListener("pointerdown", onDown)
      tray.removeEventListener("pointerup", onUp)
      tray.removeEventListener("pointercancel", endDrag)
      tray.removeEventListener("keydown", onKey)
      tray.removeEventListener("focus", wake)
      tray.removeEventListener("blur", wake)
      hintEvents.forEach((type) => root.removeEventListener(type, dismissHint))
    }
  }, [
    count,
    columns,
    compactColumns,
    compactBreakpoint,
    sections,
    introLabel,
    offset,
    idleMs,
    tileSize,
    gap,
    hint,
  ])

  return (
    <>
      <nav
        ref={rootRef}
        className={"tsb-root " + className}
        aria-label={label}
        data-awake="false"
        data-compact="false"
        data-dragging="false"
      >
        <div ref={stageRef} className="tsb-stage">
          <div
            ref={trayRef}
            className="tsb-tray"
            role="scrollbar"
            tabIndex={0}
            aria-label={label}
            aria-controls={controls}
            aria-orientation="vertical"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={0}
          >
            {Array.from({ length: count }, (_, i) => (
              <div
                key={i}
                ref={(el) => {
                  tileRefs.current[i] = el
                }}
                className="tsb-tile"
                data-index={i}
                data-state="todo"
              />
            ))}
          </div>
        </div>
        <p className="tsb-caption" aria-hidden="true">
          <span ref={labelRef} className="tsb-caption-name">
            {introLabel}
          </span>
          <span ref={pctRef} className="tsb-caption-pct">
            0%
          </span>
        </p>
        {hint ? (
          <p ref={hintRef} className="tsb-hint" data-gone="false">
            {hint}
          </p>
        ) : null}
      </nav>
      <div ref={tipRef} className="tsb-tip" data-on="false" aria-hidden="true">
        <span ref={tipNameRef} />
        <span ref={tipPctRef} className="tsb-tip-pct" />
      </div>
      <style>{styles}</style>
    </>
  )
}

/*
 * Everything below is scoped to .tsb-* and .tsb-root, and every colour is mixed
 * from the two tokens a 21st component is allowed to assume. That means no
 * light/dark branch: the tray follows whatever palette the host page sets, and
 * still reads on a page that defines neither.
 */
const styles = `
.tsb-root {
  --tsb-bg: var(--color-background, #ececec);
  --tsb-fg: var(--color-foreground, #1a1a1a);
  --tsb-tray: color-mix(in oklab, var(--tsb-fg) 9%, var(--tsb-bg));
  --tsb-edge: color-mix(in oklab, var(--tsb-fg) 24%, var(--tsb-bg));
  --tsb-tilt-x: 46deg;
  --tsb-tilt-z: -12deg;
  --tsb-rise: -22px;
  position: fixed;
  top: 50%;
  right: 36px;
  transform: translateY(-50%);
  z-index: 40;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  user-select: none;
  -webkit-user-select: none;
}
.tsb-root[hidden] { display: none; }

.tsb-stage {
  display: grid;
  place-items: center;
  perspective: 1200px;
  filter: blur(1.4px);
  opacity: 0.72;
  transition: filter 0.4s ease, opacity 0.4s ease;
}
.tsb-root[data-awake="true"] .tsb-stage { filter: none; opacity: 1; }

.tsb-tray {
  display: grid;
  grid-template-columns: repeat(var(--tsb-cols, 3), var(--tsb-tile, 30px));
  grid-auto-rows: var(--tsb-tile, 30px);
  gap: var(--tsb-gap, 5px);
  padding: var(--tsb-pad, 10px);
  background: var(--tsb-tray);
  border-radius: 10px;
  transform: translateY(var(--tsb-rise)) rotateX(var(--tsb-tilt-x)) rotateZ(var(--tsb-tilt-z));
  transform-style: preserve-3d;
  box-shadow: 0 9px 0 var(--tsb-edge), 0 22px 30px rgba(0, 0, 0, 0.16);
  cursor: pointer;
  touch-action: none;
  outline: none;
}
.tsb-tray:focus-visible {
  box-shadow:
    0 9px 0 var(--tsb-edge),
    0 0 0 3px var(--tsb-bg),
    0 0 0 5px var(--tsb-fg);
}
.tsb-root[data-dragging="true"] .tsb-tray { cursor: grabbing; }

.tsb-tile {
  --tsb-z: 7px;
  --tsb-h: 4px;
  --tsb-lift: 0px;
  --tsb-t: color-mix(in oklab, var(--tsb-fg) 18%, var(--tsb-bg));
  --tsb-s: color-mix(in oklab, var(--tsb-fg) 38%, var(--tsb-bg));
  position: relative;
  border-radius: 6px;
  background: var(--tsb-t);
  transform: translateZ(calc(var(--tsb-z) + var(--tsb-lift)));
  box-shadow:
    0 var(--tsb-h) 0 var(--tsb-s),
    0 calc(var(--tsb-h) * 2 + 2px) 6px rgba(0, 0, 0, 0.2);
  transition:
    transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1),
    box-shadow 0.25s cubic-bezier(0.2, 0.8, 0.2, 1),
    background-color 0.3s ease;
}
.tsb-tile[data-alt="true"] {
  --tsb-t: color-mix(in oklab, var(--tsb-fg) 27%, var(--tsb-bg));
  --tsb-s: color-mix(in oklab, var(--tsb-fg) 46%, var(--tsb-bg));
}
.tsb-tile[data-state="done"] {
  --tsb-z: 2px;
  --tsb-h: 1px;
  --tsb-t: color-mix(in oklab, var(--tsb-fg) 68%, var(--tsb-bg));
  --tsb-s: color-mix(in oklab, var(--tsb-fg) 82%, var(--tsb-bg));
}
.tsb-tile[data-state="done"][data-alt="true"] {
  --tsb-t: color-mix(in oklab, var(--tsb-fg) 56%, var(--tsb-bg));
  --tsb-s: color-mix(in oklab, var(--tsb-fg) 72%, var(--tsb-bg));
}
.tsb-tile[data-state="now"] {
  --tsb-z: 16px;
  --tsb-h: 8px;
  --tsb-s: var(--tsb-fg);
  background: linear-gradient(
    90deg,
    var(--tsb-fg) var(--tsb-fill, 0%),
    color-mix(in oklab, var(--tsb-fg) 78%, var(--tsb-bg)) var(--tsb-fill, 0%)
  );
}
.tsb-tile[data-hot="true"] { --tsb-lift: 10px; }

.tsb-tile[data-start="true"]::after {
  content: "";
  position: absolute;
  top: 6px;
  left: 6px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: color-mix(in oklab, var(--tsb-fg) 52%, var(--tsb-bg));
}
.tsb-tile[data-state="done"][data-start="true"]::after {
  background: color-mix(in oklab, var(--tsb-bg) 66%, var(--tsb-fg));
}
.tsb-tile[data-state="now"][data-start="true"]::after { background: var(--tsb-bg); }

.tsb-caption {
  position: relative;
  z-index: 1;
  margin: 6px 0 0;
  display: flex;
  gap: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.3;
  color: color-mix(in oklab, var(--tsb-fg) 58%, var(--tsb-bg));
  opacity: 0.7;
  transition: opacity 0.4s ease;
}
.tsb-root[data-awake="true"] .tsb-caption { opacity: 1; }
.tsb-caption-name { color: var(--tsb-fg); }
.tsb-caption-pct { font-variant-numeric: tabular-nums; }

.tsb-hint {
  /* Absolute, not in flow: in flow it pushes the tray off the centre line, and
     it only fades out, so the tray would sit high for the life of the page. */
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  width: max-content;
  max-width: 15rem;
  margin: 0;
  padding: 0.65rem 0.8rem;
  border-radius: 8px;
  background: color-mix(in oklab, var(--tsb-fg) 7%, var(--tsb-bg));
  color: var(--tsb-fg);
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.4;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1), 0 0 0 1px var(--tsb-edge);
  transition: opacity 0.4s ease;
}
.tsb-hint[data-gone="true"] { opacity: 0; pointer-events: none; }

.tsb-tip {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 41;
  display: flex;
  gap: 0.5rem;
  padding: 6px 9px;
  border-radius: 6px;
  background: var(--color-foreground, #1a1a1a);
  color: var(--color-background, #ececec);
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;
}
.tsb-tip[data-on="true"] { opacity: 1; }
.tsb-tip-pct {
  color: color-mix(in oklab, var(--color-background, #ececec) 62%, var(--color-foreground, #1a1a1a));
  font-variant-numeric: tabular-nums;
}

.tsb-root[data-compact="true"] {
  --tsb-tilt-x: 48deg;
  --tsb-tilt-z: -6deg;
  --tsb-rise: -4px;
  top: auto;
  right: auto;
  left: 50%;
  bottom: 12px;
  transform: translateX(-50%);
  max-width: calc(100vw - 24px);
  padding: 10px 14px 8px;
  border-radius: 16px;
  background: color-mix(in oklab, var(--tsb-bg) 94%, transparent);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
}
.tsb-root[data-compact="true"] .tsb-tray {
  border-radius: 8px;
  box-shadow: 0 5px 0 var(--tsb-edge), 0 12px 18px rgba(0, 0, 0, 0.14);
}
.tsb-root[data-compact="true"] .tsb-tile { border-radius: 4px; }
.tsb-root[data-compact="true"] .tsb-tile[data-start="true"]::after {
  top: 3px;
  left: 3px;
  width: 4px;
  height: 4px;
}
.tsb-root[data-compact="true"] .tsb-hint {
  top: auto;
  right: auto;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  max-width: min(20rem, 70vw);
  text-align: center;
}

[data-tsb-hide-scrollbar] {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
[data-tsb-hide-scrollbar]::-webkit-scrollbar { display: none; }

@media (prefers-reduced-motion: reduce) {
  .tsb-stage,
  .tsb-tile,
  .tsb-caption,
  .tsb-tip,
  .tsb-hint {
    transition: none;
  }
}
`
