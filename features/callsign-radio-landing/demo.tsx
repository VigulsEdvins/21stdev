"use client"

import CallsignRadioLanding from "@/components/ui/callsign-radio-landing"

// Kora is a night station, so the demo opens on carbon; the nav toggle still switches to day.
export default function Demo() {
  return <CallsignRadioLanding theme="dark" />
}
