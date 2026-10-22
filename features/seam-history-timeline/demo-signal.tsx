import SeamHistoryTimeline from "@/components/ui/seam-history-timeline"

const photo = (id: string) => "https://images.unsplash.com/" + id + "?auto=format&fit=crop&w=1400&q=75"

const milestones = [
  {
    years: 2018,
    title: "A spreadsheet that got out of hand",
    body: "Maya Okafor builds a booking sheet for her sister's physio clinic. Three neighbouring clinics ask for a copy within a month.",
    image: photo("photo-1519389950473-47ba0277781c"),
    alt: "A small team working around a table with laptops",
  },
  {
    years: [2019, 2020],
    title: "Forty clinics, one inbox",
    body: "The sheet becomes Brightwork: online booking, reminders by text, and a waiting list that fills cancelled slots on its own.",
    image: photo("photo-1556761175-5973dc0f32e7"),
    alt: "Colleagues talking through a plan in a meeting room",
  },
  {
    years: 2021,
    title: "A seed round and a real office",
    body: "Twelve people, one floor, and a support line answered by the people who write the code.",
    image: photo("photo-1497366811353-6870744d04b2"),
    alt: "An open office with desks and large windows",
    href: "#",
    linkLabel: "Read the announcement",
  },
  {
    years: 2023,
    title: "Booking from the waiting room",
    body: "Patients book, move and pay for appointments on their phones. Missed appointments fall by more than a third at our pilot clinics.",
    image: photo("photo-1551434678-e076c223a692"),
    alt: "People working at computers in a bright office",
  },
  {
    years: [2025, 2026],
    title: "Two thousand clinics",
    body: "Physio, dental and vet practices in four countries, and a team of sixty that still answers the support line.",
    image: photo("photo-1522071820081-009f0129c71c"),
    alt: "A team gathered around a laptop on a wooden table",
    href: "#",
    linkLabel: "Join the team",
  },
]

export default function SeamHistoryTimelineSignalDemo() {
  return (
    <div className="w-full">
      <SeamHistoryTimeline
        preset="signal"
        eyebrow="Company"
        heading="From one clinic's spreadsheet to two thousand"
        intro="Brightwork started as a favour to a physiotherapist. This is how it grew, one waiting room at a time."
        milestones={milestones}
        seamAngle={9}
        startIndex={1}
      />
    </div>
  )
}
