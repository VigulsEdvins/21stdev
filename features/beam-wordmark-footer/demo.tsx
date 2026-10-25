"use client"

import BeamWordmarkFooter from "@/components/ui/beam-wordmark-footer"

export default function Demo() {
  // w-full is load-bearing: 21st centres every demo in a flex wrapper, and a
  // flex item left at width:auto shrinks to its contents.
  // themed: colours follow the page's tokens, so the footer matches light and dark pages.
  return (
    <div className="w-full">
      <BeamWordmarkFooter themed />
    </div>
  )
}
