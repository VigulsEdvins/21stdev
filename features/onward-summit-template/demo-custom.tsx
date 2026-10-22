"use client"

import OnwardSummitTemplate from "@/components/ui/onward-summit-template"

// Everything is a prop. A different event on the emerald palette, a field of
// plus signs, its own guest list, agenda, speakers and venue, and a real
// handler for the registration form.
export default function DemoCustom() {
  return (
    <OnwardSummitTemplate
      brand="tally"
      title="Upstream"
      tagline={"A day for the people who\nkeep the money moving"}
      date="March 4, 2027"
      city="Chicago"
      startsAt="2027-03-04T09:00:00-06:00"
      palette="emerald"
      glyph="plus"
      register={{ label: "Request an invite" }}
      expect={{
        title: "What's in store",
        intro: "A single day on payments, treasury and the plumbing in between, run by operators who have moved real money at scale.",
        features: [
          { icon: "plus", title: "Fewer surprises", text: "Cash forecasting that survives a bad week." },
          { icon: "ring", title: "Tighter loops", text: "Reconciliation that runs every hour, not every month." },
          { icon: "arrow", title: "Faster rails", text: "What real-time payments change for treasury teams." },
        ],
      }}
      guests={{
        title: "Who's coming",
        audiences: [
          { role: "Treasurers", pitch: "You decide where every dollar sleeps tonight. Compare notes on yield, risk and the banks worth keeping." },
          { role: "Payments leads", pitch: "You own the rails. See how teams cut failed payments in half and stopped paying for the privilege." },
          { role: "Founders", pitch: "You sign off on all of it. Learn which money decisions to make once and which to revisit every quarter." },
        ],
      }}
      agenda={{
        title: "The day",
        sessions: [
          { start: "09:00", duration: 40, title: "Opening: money at the speed of software", speakers: ["Ruth Adeyemi"], track: "Keynote" },
          { start: "10:00", duration: 60, title: "Workshop: a 13-week cash forecast", speakers: ["Tomás Ibarra"], track: "Workshop", description: "Build it from your bank exports, live." },
          { start: "11:15", duration: 45, title: "Real-time rails, real-world risks", speakers: ["Hana Kowalski", "Ruth Adeyemi"], track: "Panel" },
          { start: "12:15", duration: 60, title: "Lunch on the river", track: "Breaks" },
          { start: "13:30", duration: 50, title: "Treasury for teams of one", speakers: ["Owen Price"], track: "Workshop" },
          { start: "16:00", duration: 120, title: "Closing drinks", track: "Breaks" },
        ],
      }}
      speakers={{
        title: "Speakers",
        people: [
          { name: "Ruth Adeyemi", role: "Treasurer", company: "Parcel", bio: "Moves nine figures a day across four banks." },
          { name: "Tomás Ibarra", role: "Head of FP&A", company: "Orchard", bio: "Forecasts cash to within two percent, weekly." },
          { name: "Hana Kowalski", role: "Payments Lead", company: "Railway Pay", bio: "Shipped instant payouts to two million users." },
          { name: "Owen Price", role: "Founder", company: "Ledgerwise", bio: "Ran finance alone until year four, and says it twice." },
        ],
      }}
      venue={{
        title: "Where",
        name: "Riverside Hall",
        address: "300 North Wacker Drive",
        city: "Chicago, IL 60606",
        notes: ["Doors at 8:30 AM", "Coat check on level one"],
      }}
      faq={{
        title: "Questions",
        items: [
          { q: "Is it free?", a: "Yes, for every confirmed guest." },
          { q: "Can I attend remotely?", a: "Keynotes stream live to registered guests; workshops are in the room only." },
        ],
      }}
      cta={{ kicker: "Invites", title: "Get on the list", subtitle: "Two hundred seats. We confirm within a day.", seats: { total: 200, taken: 162 } }}
      footer={{ note: "© 2027 Tally Labs. Upstream is invite only." }}
      onRegister={async (data) => {
        console.log("registered", data)
        await new Promise((r) => setTimeout(r, 700))
      }}
    />
  )
}
