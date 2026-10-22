"use client"

import HoloChromeFlow from "@/components/ui/holo-chrome-flow"

/**
 * The metal as a hero background. Content sits on top through `children`;
 * pointer events still reach the shader, so the foil tilts under the copy too.
 */
export default function HeroDemo() {
  return (
    <HoloChromeFlow>
      <div className="flex h-full w-full flex-col items-center justify-center px-6 text-center">
        <div className="rounded-[28px] border border-white/25 bg-black/35 px-8 py-10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)] backdrop-blur-md sm:px-14 sm:py-14">
          <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.34em] text-white/70">
            Collection 07 · Liquid Light
          </p>
          <h1 className="max-w-2xl text-5xl font-semibold leading-[0.95] tracking-tight text-white sm:text-7xl">
            Poured from
            <br />
            <span className="bg-gradient-to-r from-[#ff9be3] via-[#9ef3ff] to-[#ffe39a] bg-clip-text text-transparent">
              chrome &amp; light
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-white/75">
            Tilt it with your cursor. Click to drop a bead of mercury.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              className="rounded-full bg-white px-6 py-2.5 text-sm font-medium text-black transition-transform hover:scale-[1.03] motion-reduce:transition-none motion-reduce:hover:scale-100"
            >
              Explore the drop
            </button>
            <button
              type="button"
              className="rounded-full border border-white/35 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              Lookbook
            </button>
          </div>
        </div>
      </div>
    </HoloChromeFlow>
  )
}
