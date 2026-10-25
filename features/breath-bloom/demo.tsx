"use client"

import * as React from "react"
import BreathBloom from "@/components/ui/breath-bloom"

// Light pages get the light "solstice" bloom, dark pages the dark "abyss" one; re-checked when the theme changes.
function useLightPage(ref: React.RefObject<HTMLElement>) {
  const [light, setLight] = React.useState(false)
  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const read = () => {
      const probe = document.createElement("span")
      probe.style.cssText = "position:absolute;visibility:hidden;color:var(--bg, #0d0f1e)"
      el.appendChild(probe)
      const m = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(getComputedStyle(probe).color)
      probe.remove()
      setLight(!!m && 0.2126 * +m[1] + 0.7152 * +m[2] + 0.0722 * +m[3] > 140)
    }
    read()
    const mo = new MutationObserver(read)
    ;[document.documentElement, document.body, el.closest(".page-section")].forEach((n) => n && mo.observe(n, { attributes: true, attributeFilter: ["style", "class", "data-theme"] }))
    return () => mo.disconnect()
  }, [ref])
  return light
}

export default function Demo() {
  const ref = React.useRef<HTMLDivElement>(null)
  const light = useLightPage(ref)
  const ink = light ? "#4a2814" : "#e2e8ff"
  return (
    // w-full matters: 21st centres demos in a flex wrapper, and a flex item
    // left at width:auto shrinks the bloom to 0px wide.
    <div ref={ref} className="relative w-full">
      <BreathBloom preset={light ? "solstice" : "abyss"}>
        <div className="flex h-full flex-col justify-between p-6 sm:p-10" style={{ color: ink }}>
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.32em] opacity-60">
            <span>breath bloom / no. 06</span>
            <span className="hidden sm:inline">4s in · 4s hold · 4s out</span>
          </div>
          <div className="max-w-xs pb-10">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight  sm:text-4xl">
              Slow down
              <br />
              for one breath.
            </h1>
            <p className="mt-3 text-sm leading-relaxed opacity-60">
              Follow the petals. Or take over — sideways spreads them, down grows them.
            </p>
          </div>
        </div>
      </BreathBloom>
    </div>
  )
}
