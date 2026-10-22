"use client"

import * as React from "react"
import ZeroMeltPreloader from "@/components/ui/zero-melt-preloader"

/** Cold palette, fine brush, no reward — and strict enough to show the refreeze. */
export default function StrictDemo() {
  return (
    <div className="h-[100svh] min-h-[600px] w-full">
      <ZeroMeltPreloader
        prompt="Prove you mean it"
        hint="One clean, closed circle"
        retryHint="Rounder. Close the loop."
        tolerance={0.82}
        brush={0.045}
        loadMs={900}
        reward=""
        baseColor="#12304d"
        frostColor="#bcd8ea"
        meltColor="#2b8ccc"
        glowColor="#ffffff"
      >
        {/* Dark on purpose: the melt is a real hole, so pale content behind it
            makes the hole invisible and the stroke reads as paint. */}
        <div
          className="flex h-full w-full items-center justify-center"
          style={{
            background:
              "radial-gradient(120% 90% at 35% 20%, #17436b 0%, #0b2440 50%, #04101f 100%)",
          }}
        >
          <h2 className="text-4xl font-light tracking-tight text-sky-50">Nice circle.</h2>
        </div>
      </ZeroMeltPreloader>
    </div>
  )
}
