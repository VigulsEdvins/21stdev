"use client"

import TigerTearReveal from "@/components/ui/tiger-tear-reveal"

export default function DemoCustom() {
  return (
    <div className="w-full">
      <TigerTearReveal
        word="FEARLESS"
        tagline="STAY WILD"
        ink="#111111"
        paper="#f4efe4"
        eyeColor="#9fd14a"
        furColor="#c8752a"
      />
    </div>
  )
}
