"use client"

import AlterEgoMaskReveal from "@/components/ui/alter-ego-mask-reveal"

// Hover the face to pull the mask through; click (or Enter) to suit up fully.
export default function Demo() {
  return (
    // w-full: 21st centres demos in a flex wrapper that would shrink this to 0px.
    <div className="w-full">
      <AlterEgoMaskReveal />
    </div>
  )
}
