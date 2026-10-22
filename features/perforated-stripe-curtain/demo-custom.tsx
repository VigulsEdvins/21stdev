"use client"

import PerforatedStripeCurtain from "@/components/ui/perforated-stripe-curtain"

// A gig-night teaser: thirty sodium-yellow strips in front of a lit stage
// (Unsplash), a cobalt wash, a faster groove and the night's own words.
export default function DemoCustom() {
  return (
    <div className="relative w-full">
      <PerforatedStripeCurtain
        image="https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=2000&auto=format&fit=crop"
        strips={30}
        stripColor="#ffd23f"
        idleColor="#3b4a6b"
        background="#0a1022"
        lightColor="#2f6bff"
        captions={["TONIGHT", "ROOM 27"]}
        title="Kedhar · Live at Room 27"
        credit="Doors 9 pm — press play"
        bpm={132}
        volume={0.6}
      />
    </div>
  )
}
