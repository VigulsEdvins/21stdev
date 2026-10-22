"use client"

import * as React from "react"
import ScanlineBloom from "@/components/ui/scanline-bloom"

const INKS = [
  { name: "Crimson", ink: "#e3161f", highlight: "#ff6a4f", background: "#0b0909" },
  { name: "Cyanotype", ink: "#3d8bff", highlight: "#bfe0ff", background: "#050a14" },
  { name: "Bone", ink: "#d9cfbf", highlight: "#fff8ec", background: "#121110" },
  { name: "Acid", ink: "#b6f23a", highlight: "#f3ffd0", background: "#080a05" },
] as const

const MODES = ["mixed", "lines", "stipple"] as const

// Every knob that gives the print its character, driven from a caption bar.
export default function DemoCustom() {
  const [inkIndex, setInkIndex] = React.useState(0)
  const [mode, setMode] = React.useState<(typeof MODES)[number]>("mixed")
  const [seed, setSeed] = React.useState(7)
  const palette = INKS[inkIndex]

  const chip = "rounded-none border px-2 py-1 uppercase tracking-[0.2em] transition-colors"

  return (
    <div className="w-full">
      <ScanlineBloom
        ink={palette.ink}
        highlight={palette.highlight}
        background={palette.background}
        mode={mode}
        lineSpacing={mode === "lines" ? 6 : 5}
        onBloom={setSeed}
      >
        <div
          className="absolute left-8 top-8 px-2 py-1 font-mono text-[10px] uppercase leading-relaxed tracking-[0.3em] sm:left-12 sm:top-10"
          style={{ color: palette.ink, background: palette.background }}
        >
          <div>Flora Nocturna</div>
          <div className="opacity-60">Plate Nº {String(seed).padStart(6, "0")}</div>
        </div>

        <div
          className="absolute bottom-8 left-8 right-8 flex flex-wrap items-center gap-2 font-mono text-[10px] sm:bottom-10 sm:left-12 sm:right-12"
          style={{ color: palette.ink }}
        >
          {INKS.map((p, i) => (
            <button
              key={p.name}
              type="button"
              onClick={() => setInkIndex(i)}
              className={chip}
              style={{
                borderColor: palette.ink,
                background: i === inkIndex ? palette.ink : palette.background,
                color: i === inkIndex ? palette.background : palette.ink,
              }}
            >
              {p.name}
            </button>
          ))}
          <span className="mx-1" />
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={chip}
              style={{
                borderColor: palette.ink,
                background: m === mode ? palette.ink : palette.background,
                color: m === mode ? palette.background : palette.ink,
              }}
            >
              {m}
            </button>
          ))}
          <span
            className="ml-auto hidden px-2 py-1 uppercase tracking-[0.3em] sm:inline"
            style={{ background: palette.background }}
          >Click the plate to rebloom</span>
        </div>
      </ScanlineBloom>
    </div>
  )
}
