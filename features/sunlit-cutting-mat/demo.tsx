"use client"

import SunlitCuttingMat from "@/components/ui/sunlit-cutting-mat"

export default function Demo() {
  return (
    // w-full: 21st centres demos in a flex wrapper that would shrink this to 0px.
    <div className="relative w-full">
      <SunlitCuttingMat />
    </div>
  )
}
