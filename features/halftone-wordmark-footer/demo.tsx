"use client"

import * as React from "react"
import HalftoneWordmarkFooter from "@/components/ui/halftone-wordmark-footer"

// Reads one page token (--bg, --text, --accent) as a #rrggbb string.
function readToken(el: HTMLElement, name: string, fallback: string): string {
  const probe = document.createElement("span")
  probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;color:var(" + name + ", " + fallback + ")"
  el.appendChild(probe)
  const m = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(getComputedStyle(probe).color)
  probe.remove()
  if (!m) return fallback
  return "#" + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("")
}

export default function Demo() {
  // w-full matters: 21st centres demos in a flex wrapper, and a flex item
  // left at width:auto shrinks the canvas to 0px wide.
  // The colours follow the page theme and are re-read when the theme changes.
  const ref = React.useRef<HTMLDivElement>(null)
  const [palette, setPalette] = React.useState<{ background: string; ink: string; warm: string } | undefined>()
  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const read = () => {
      const next = { background: readToken(el, "--bg", "#0c0c0b"), ink: readToken(el, "--text", "#e9e4da"), warm: readToken(el, "--accent", "#e9762b") }
      setPalette((p) => (p && p.background === next.background && p.ink === next.ink && p.warm === next.warm ? p : next))
    }
    read()
    const mo = new MutationObserver(read)
    ;[document.documentElement, document.body, el.closest(".page-section")].forEach((n) => n && mo.observe(n, { attributes: true, attributeFilter: ["style", "class", "data-theme"] }))
    return () => mo.disconnect()
  }, [])
  return (
    <div ref={ref} className="w-full">
      <HalftoneWordmarkFooter palette={palette} />
    </div>
  )
}
