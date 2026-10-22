"use client"

import CodeCurtain from "@/components/ui/code-curtain"

export default function Demo() {
  return (
    // w-full: 21st centres demos in a flex wrapper that would shrink this to 0px.
    <div className="relative w-full bg-[var(--color-background)]">
      <CodeCurtain />
    </div>
  )
}
