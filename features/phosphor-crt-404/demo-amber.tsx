"use client"

import PhosphorCrt404 from "@/components/ui/phosphor-crt-404"

// The same set tuned to an amber tube, as a 500 page.
export default function DemoAmber() {
  return (
    <div className="w-full">
      <PhosphorCrt404
        code="500"
        eyebrow="SERVER ERROR"
        messages={["WE BLEW A FUSE", "ENGINEERS ON SITE", "PLEASE STAND BY", "BACK IN A MOMENT"]}
        homeLabel="BACK TO START"
        phosphor="#ffb04a"
        channel={50}
        brand="AMBERLINE"
        hint="Click the screen to retune"
      />
    </div>
  )
}
