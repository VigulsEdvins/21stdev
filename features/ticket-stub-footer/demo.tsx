"use client"

import TicketStubFooter from "@/components/ui/ticket-stub-footer"

export default function Demo() {
  // w-full is load-bearing: 21st centres every demo in a flex wrapper, and a
  // flex item left at width:auto shrinks to its contents.
  // Colours come from the page's tokens so the footer follows the theme.
  return (
    <div className="w-full">
      <TicketStubFooter
        background="var(--bg, #1b1a19)"
        ink="var(--text, #e6dcc6)"
        muted="color-mix(in srgb, var(--text, #e6dcc6) 55%, transparent)"
        accent="var(--accent, #ff6d36)"
        accentDeep="color-mix(in srgb, var(--accent, #ff6d36) 82%, black)"
        accentInk="var(--bg, #1b1a19)"
      />
    </div>
  )
}
