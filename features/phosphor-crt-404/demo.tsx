"use client"

import PhosphorCrt404 from "@/components/ui/phosphor-crt-404"

// Hover the pyramid to light the way home. Click the screen to change
// the channel, and try the power button on the set.
export default function Demo() {
  return (
    // w-full: 21st centres demos in a flex wrapper that would shrink this to 0px.
    <div className="w-full">
      <PhosphorCrt404 />
    </div>
  )
}
