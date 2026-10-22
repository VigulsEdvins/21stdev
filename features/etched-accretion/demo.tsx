"use client"

import EtchedAccretion from "@/components/ui/etched-accretion"

export default function Demo() {
  return (
    // w-full matters: 21st centres demos in a flex wrapper, and a flex item at
    // width:auto shrinks to its contents — which for a canvas is 0px.
    <div className="relative w-full">
      <EtchedAccretion>
        <div className="pointer-events-none flex h-full flex-col justify-end p-6 text-white sm:p-10">
          <div className="max-w-xl">
            <h1 className="text-4xl font-light leading-[1.05] tracking-tight sm:text-6xl">
              Nothing <span className="italic text-[#ff3b47]">escapes</span>
              <br />
              the horizon.
            </h1>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.3em] text-white/45">
              move to drift · hold to feed it
            </p>
          </div>
        </div>
      </EtchedAccretion>
    </div>
  )
}
