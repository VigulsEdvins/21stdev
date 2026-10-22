"use client"

import TicketStubFooter from "@/components/ui/ticket-stub-footer"

export default function Demo() {
  // w-full is load-bearing: 21st centres every demo in a flex wrapper, and a
  // flex item left at width:auto shrinks to its contents.
  return (
    <div className="w-full bg-[#1b1a19]">
      <TicketStubFooter />
    </div>
  )
}
