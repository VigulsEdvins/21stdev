"use client"

import OpenSlotBooking from "@/components/ui/open-slot-booking"

// Stand-in for an OAuth round trip to the visitor's calendar.
const myWeek = [
  { weekday: 2, from: "11:00", to: "12:20", title: "Board prep" },
  { weekday: 4, from: "08:40", to: "10:00", title: "Hiring loop" },
]
const connectCalendar = async () => {
  await new Promise((resolve) => setTimeout(resolve, 900))
  return myWeek
}

// A founder's weekly office hours: a different preset, host, clock and week, and a
// calendar the visitor connects on demand.
export default function DemoLagoon() {
  return (
    <div className="w-full">
      <OpenSlotBooking
        preset="lagoon"
        headline="Founder office hours."
        headlineAccent="Twenty minutes, no slides."
        description="Stuck on onboarding, pricing or your first hire? Grab a slot. I keep Tuesdays and Thursdays open for exactly this."
        altContact={{ label: "Or reply to any of our emails", href: "mailto:dev@harbor.build" }}
        host={{ name: "Dev Okonkwo", role: "Co-founder, Harbor", initials: "DO", city: "Brooklyn", stamp: "Office hours · Harbor · " }}
        meetingTitle="Office hours"
        agenda="Bring the thing you keep putting off. We'll get it to a decision before the call ends."
        location="Zoom, link in the invite"
        responseNote="Answers the same day"
        bookingUrl="harbor.build/office-hours"
        durations={[20, 40]}
        defaultDuration={20}
        step={20}
        hostTimeZone="America/New_York"
        timeZones={["America/New_York", "America/Chicago", "America/Los_Angeles", "Europe/London", "Asia/Kolkata"]}
        hours={{ days: [2, 4], from: "10:00", to: "16:00" }}
        weekStartsOn={0}
        clock="12h"
        hostBusy={[
          { weekday: 2, from: "12:00", to: "13:00", title: "Lunch" },
          { weekday: 4, from: "13:20", to: "14:00" },
        ]}
        loadVisitorEvents={connectCalendar}
      />
    </div>
  )
}
