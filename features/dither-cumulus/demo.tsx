"use client"

import DitherCumulus from "@/components/ui/dither-cumulus"

export default function Demo() {
  return (
    // w-full matters: 21st centres demos in a flex wrapper, and a flex item
    // left at width:auto shrinks the sky to 0px wide.
    <div className="relative w-full">
      <DitherCumulus>
        <div className="flex h-full flex-col justify-between p-6 sm:p-10">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.32em] text-[#fbfaef] [&>span]:bg-[#0a1626]/85 [&>span]:px-2 [&>span]:py-1">
            <span>alt 2,400 m · cumulus humilis</span>
            <span className="hidden sm:inline">wind 12 kt · ene</span>
          </div>

          {/* A solid pixel panel: copy over white cumulus needs a floor to stand on. */}
          <div className="max-w-xl border-2 border-[#fbfaef] bg-[#0a1626]/85 p-6 shadow-[6px_6px_0_0_#0a1626] sm:p-8">
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.34em] text-[#fbfaef]/80">
              ☁ forecast: drifting
            </p>
            <h1 className="text-4xl font-semibold leading-[0.95] tracking-tight text-[#fbfaef] sm:text-6xl">
              Somewhere
              <br />
              above the weather.
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-[#fbfaef]/75">
              A sky printed one dithered pixel at a time. Move the moon to relight the clouds, drag to scrub
              the sky, click to blow a gust through it.
            </p>
            <button
              type="button"
              className="pointer-events-auto mt-8 border-2 border-[#fbfaef] bg-[#0a1626]/60 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.28em] text-[#fbfaef] transition-colors hover:bg-[#fbfaef] hover:text-[#0a1626] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fbfaef]"
            >
              Take off →
            </button>
          </div>
        </div>
      </DitherCumulus>
    </div>
  )
}
