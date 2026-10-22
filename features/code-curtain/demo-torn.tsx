"use client"

import CodeCurtain from "@/components/ui/code-curtain"

const MANIFESTO =
  "SHIP IT ROUGH · FIX IT LIVE · EVERY BUG IS A THREAD · PULL ONE AND SEE WHAT UNRAVELS · " +
  "WRITE CODE LIKE CLOTH · LOOSE ENOUGH TO MOVE · STRONG ENOUGH TO HANG · "

export default function DemoTorn() {
  return (
    // w-full: 21st centres demos in a flex wrapper that would shrink this to 0px.
    <div className="relative w-full bg-[var(--color-background)]">
      <CodeCurtain
        text={MANIFESTO}
        hang="loops"
        tearable
        tearAt={3.5}
        columns={44}
        rows={34}
        curtainWidth={520}
        curtainHeight={400}
        accentColor="#2f6bff"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontWeight={800}
        hint="pull hard — it tears · double-click to pin · R to rehang"
      />
    </div>
  )
}
