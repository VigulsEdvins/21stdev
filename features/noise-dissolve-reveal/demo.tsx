"use client"

import NoiseDissolveReveal from "@/components/ui/noise-dissolve-reveal"

export default function Demo() {
  return (
    <NoiseDissolveReveal loop veilColor="#000000">
      <div className="flex h-full w-full flex-col justify-center bg-white px-[6vw] text-black">
        <h1 className="text-[clamp(3rem,13vw,11rem)] font-black uppercase leading-[0.82] tracking-[-0.03em]">
          Make
          <br />
          <span className="italic">Something</span>
        </h1>
        <p className="mt-8 max-w-md font-mono text-xs uppercase tracking-[0.2em] text-neutral-500">
          The veil dissolves along a noise threshold
        </p>
      </div>
    </NoiseDissolveReveal>
  )
}
