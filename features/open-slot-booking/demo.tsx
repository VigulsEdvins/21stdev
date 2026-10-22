"use client"

import OpenSlotBooking from "@/components/ui/open-slot-booking"

// Sample data. On a real page the host's week comes from your calendar API
// (or loadHostBusy) and the visitor's from their connected calendar.
const hostWeek = [
  { weekday: 1, from: "09:00", to: "10:30", title: "Team sync" },
  { weekday: 1, from: "14:00", to: "15:00" },
  { weekday: 2, from: "11:30", to: "13:00" },
  { weekday: 2, from: "16:00", to: "17:00" },
  { weekday: 3, from: "13:00", to: "15:30" },
  { weekday: 4, from: "09:00", to: "09:30" },
  { weekday: 4, from: "12:00", to: "13:30" },
  { weekday: 5, from: "14:30", to: "17:00" },
]

const myWeek = [
  { weekday: 1, from: "11:00", to: "12:00", title: "Standup + review" },
  { weekday: 2, from: "09:00", to: "10:00", title: "Gym" },
  { weekday: 3, from: "10:00", to: "11:30", title: "Design crit" },
  { weekday: 4, from: "14:00", to: "15:00", title: "1:1 with Sam" },
  { weekday: 5, from: "10:30", to: "12:00", title: "Sprint demo" },
]

export default function Demo() {
  return (
    <div className="w-full">
      <OpenSlotBooking hostBusy={hostWeek} visitorEvents={myWeek} />
    </div>
  )
}
