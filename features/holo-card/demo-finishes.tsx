"use client"

import * as React from "react"
import HoloCard, { type Finish } from "@/components/ui/holo-card"

const FINISHES: { id: Finish; label: string }[] = [
  { id: "pearl", label: "Pearl" },
  { id: "silver", label: "Silver" },
  { id: "gold", label: "Gold foil" },
  { id: "original", label: "No foil" },
]

export default function Demo() {
  const [finish, setFinish] = React.useState<Finish>("pearl")

  return (
    <div className="flex w-full flex-col items-center gap-8 bg-[#0a0812] px-6 py-16">
      <div className="flex flex-wrap justify-center gap-2">
        {FINISHES.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFinish(f.id)}
            className={
              "rounded-full border px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] transition " +
              (finish === f.id
                ? "border-white bg-white text-black"
                : "border-white/25 text-white/70 hover:border-white/50 hover:text-white")
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      <HoloCard
        name="Aurora Drake"
        subtitle="Holofoil · Stage 2"
        number="No. 001"
        rarity="Legendary"
        finish={finish}
      />

      <p className="m-0 font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
        Move the pointer across it · click to flip
      </p>
    </div>
  )
}
