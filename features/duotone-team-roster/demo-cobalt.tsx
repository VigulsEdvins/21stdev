import DuotoneTeamRoster, { type TeamMember } from "@/components/ui/duotone-team-roster"

const U = "https://images.unsplash.com/"
const Q = "?auto=format&fit=crop&w=720&h=960&q=80"

const team: TeamMember[] = [
  { name: "Daniel Osei", role: "Co-founder, engineering", craft: "Founder", bio: "Wrote the first ledger engine on a train and still reviews every migration.", photo: U + "photo-1507003211169-0a1dd7228f2d" + Q, href: "https://example.com/daniel" },
  { name: "Priya Nair", role: "Co-founder, product", craft: "Founder", bio: "Talks to three customers a week and turns the notes into the roadmap.", photo: U + "photo-1494790108377-be9c29b29330" + Q, href: "https://example.com/priya" },
  { name: "Marcus Bell", role: "Payments engineer", craft: "Engineering", bio: "Owns retries, idempotency and the 3 a.m. pager for card settlement.", photo: U + "photo-1500648767791-00dcc994a43e" + Q },
  { name: "Hannah Cole", role: "Design engineer", craft: "Design", bio: "Ships the dashboard and the docs site, and keeps both under 100 kB.", photo: U + "photo-1544005313-94ddf0286df2" + Q },
  { name: "Mira Kowalczyk", role: "Developer advocate", craft: "DevRel", bio: "Writes the quickstarts and answers the forum before you finish typing.", photo: U + "photo-1517841905240-472988babdf9" + Q },
  { name: "Graham Whitlock", role: "Head of compliance", craft: "Risk", bio: "Spent twelve years at a clearing bank. Makes audits boring, on purpose.", photo: U + "photo-1472099645785-5658abf4ff4e" + Q },
  { name: "Ellie Marsh", role: "Support lead", craft: "Support", bio: "Median first reply under four minutes, in English, Spanish or Polish.", photo: U + "photo-1438761681033-6461ffad8d80" + Q },
]

export default function DuotoneTeamRosterCobaltDemo() {
  return (
    <div className="w-full">
      <DuotoneTeamRoster
        preset="cobalt"
        eyebrow="Built by"
        title={"Seven\npeople"}
        intro="Ledgerline is a payments API run by a small team in Lisbon and Accra. These are the people who answer your tickets."
        cta={{ label: "Read the docs", href: "#docs" }}
        secondaryCta={{ label: "See open roles", href: "#careers" }}
        members={team}
        openRoles={[
          { title: "Senior backend engineer", note: "Go and Postgres, remote in Europe or Africa", href: "#careers/backend", craft: "Hiring" },
          { title: "Solutions engineer", note: "Help fintechs go live, based in Lisbon", href: "#careers/solutions", craft: "Hiring" },
        ]}
        columns={3}
        drift={false}
        stretch={1.08}
      />
    </div>
  )
}
