"use client"

import CallsignRadioLanding from "@/components/ui/callsign-radio-landing"

// The same page as a small-town community station on signal yellow: a new
// call sign, a talk-heavy running order, chunkier meter segments, and its own
// shows, archive, support tiers and footer, all through props.
const SHOWS = [
  { id: "night", title: "Night Desk", host: "Automated", genres: ["News"], blurb: "Music through the night with the regional news on the hour.", ink: ["#0078bf", "#00a95c"] as [string, string], art: "dots" as const, hidden: true },
  { id: "breakfast", title: "Market Day Breakfast", host: "Wim and Esra Kalkman", genres: ["Talk", "News"], blurb: "The papers, the weather for the river and who is selling what on the Brink this morning.", ink: ["#ff6c2f", "#00a95c"] as [string, string], art: "stripes" as const, kind: "talk" as const, slot: "Weekdays 07:00" },
  { id: "council", title: "Town Hall Hour", host: "Annelies Brouwer", genres: ["Talk", "Local"], blurb: "This week's council decisions read out plainly, and the alderman on the phone to answer for them.", ink: ["#3255a4", "#ff665e"] as [string, string], art: "blocks" as const, kind: "talk" as const, slot: "Weekdays 10:00" },
  { id: "folk", title: "Folk at Noon", host: "Joris Hulst", genres: ["Folk", "Live"], blurb: "Fiddles, accordions and whoever turned up at the studio door with a guitar this week.", ink: ["#00a95c", "#ff48b0"] as [string, string], art: "rings" as const, slot: "Daily 12:00" },
  { id: "stories", title: "Story Time", host: "The library volunteers", genres: ["Kids", "Talk"], blurb: "A chapter a day from the children's shelf at the library, read by the people who run it.", ink: ["#ffe800", "#3255a4"] as [string, string], art: "dots" as const, kind: "talk" as const, slot: "Weekdays 15:30" },
  { id: "sport", title: "Touchline", host: "Rik Wessels", genres: ["Sport", "Talk"], blurb: "Every amateur club in the district, the scores phoned in from the side of the pitch.", ink: ["#ff665e", "#0078bf"] as [string, string], art: "bars" as const, kind: "talk" as const, slot: "Saturdays 16:00" },
  { id: "evening", title: "Back Porch", host: "Ilse Mulder", genres: ["Country", "Blues"], blurb: "Slow songs for the drive home, and requests read out from the paper postcards on the studio wall.", ink: ["#ff48b0", "#ffe800"] as [string, string], art: "stripes" as const, slot: "Weekdays 18:00" },
]

const SCHEDULE = [
  { start: "00:00", show: "night" },
  { start: "07:00", show: "breakfast" },
  { start: "10:00", show: "council" },
  { start: "12:00", show: "folk" },
  { start: "14:00", show: "stories" },
  { start: "16:00", show: "sport" },
  { start: "18:00", show: "evening" },
  { start: "21:00", show: "night" },
]

const EPISODES = [
  { id: "th-41", show: "council", title: "The bridge budget, line by line", date: "Tue 7 Oct", minutes: 58 },
  { id: "fn-90", show: "folk", title: "Three fiddlers from the Achterhoek", date: "Mon 6 Oct", minutes: 60 },
  { id: "mb-212", show: "breakfast", title: "The cheese market's last Saturday", date: "Sat 4 Oct", minutes: 175 },
  { id: "bp-33", show: "evening", title: "Postcards from the autumn fair", date: "Fri 3 Oct", minutes: 120 },
  { id: "st-12", show: "stories", title: "The lighthouse keeper's cat, chapter four", date: "Thu 2 Oct", minutes: 30 },
]

export default function DemoDaytime() {
  return (
    <CallsignRadioLanding
      preset="daytime"
      station={{
        name: "Veld FM",
        callsign: "VELD",
        frequency: "107.2",
        city: "Deventer",
        tagline: "Community radio for Deventer and the villages along the IJssel. Run by 60 volunteers from the old post office.",
        timeZone: "Europe/Amsterdam",
      }}
      memberCta="Join the station"
      shows={SHOWS}
      schedule={SCHEDULE}
      episodes={EPISODES}
      listen={{
        ways: [
          { value: "107.2", unit: "FM", text: "Deventer and the IJssel villages, on the kitchen radio." },
          { value: "8B", unit: "DAB+", text: "Across Overijssel, with the regional multiplex." },
          { value: "128", unit: "kbps stream", text: "Online, for anyone who moved away and still listens." },
          { value: "612 0107", unit: "Studio line", text: "Call in during Town Hall Hour with your question." },
        ],
      }}
      residents={{ title: "Our presenters", text: "Shopkeepers, teachers, a retired ferry captain and the library team. All volunteers, all local." }}
      archive={{ title: "Missed it?", text: "Last week's shows, ready when you are." }}
      support={{
        title: "Keep Veld local",
        text: "We have no advertisers. Members pay for the mast on the water tower and the studio's heating.",
        currency: "€",
        min: 2,
        max: 20,
        start: 5,
        tiers: [
          { name: "Neighbour", amount: 2, perks: ["Your name read out on Market Day Breakfast"] },
          { name: "Member", amount: 5, perks: ["A vote at the yearly members' meeting", "The printed programme guide"] },
          { name: "Friend", amount: 10, perks: ["A Veld FM mug", "A seat at the summer studio party"] },
          { name: "Benefactor", amount: 18, perks: ["Present one hour of your own"] },
        ],
      }}
      footer={{
        columns: [
          { title: "Listen", links: [{ label: "Live stream", href: "#listen" }, { label: "Programme guide", href: "#schedule" }, { label: "Missed it?", href: "#archive" }] },
          { title: "Station", links: [{ label: "Volunteer with us" }, { label: "Advertise a local event" }, { label: "Members' meeting" }] },
        ],
        address: ["Stichting Veld FM", "The old post office, Brink 12", "Deventer"],
        email: "studio@veld.example",
        newsletterTitle: "The weekly guide",
        newsletterText: "What's on next week, and who is coming into the studio.",
        legal: "Stichting Veld FM. Volunteer-run since 1987.",
      }}
    />
  )
}
