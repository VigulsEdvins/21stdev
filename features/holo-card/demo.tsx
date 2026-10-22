"use client"

import HoloCard from "@/components/ui/holo-card"

export default function Demo() {
  return (
    <div className="flex w-full items-center justify-center bg-[#0a0812] px-6 py-20">
      <HoloCard
        name="Aurora Drake"
        subtitle="Holofoil · Stage 2"
        number="No. 001"
        rarity="Legendary"
      />
    </div>
  )
}
