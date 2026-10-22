"use client"

import MagicHour from "@/components/ui/magic-hour"

/** No readouts, no hint, a shorter scroll — the frame inside an ordinary page section. */
export default function BareDemo() {
  return (
    <div className="mx-auto w-full max-w-3xl p-6">
      <p className="pb-4 text-xs uppercase tracking-[0.28em] text-foreground/40">
        Study 04 — a night in three screens
      </p>
      <MagicHour readouts={false} hint="" pages={3} height="36rem" />
    </div>
  )
}
