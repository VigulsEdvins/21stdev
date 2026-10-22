"use client"

import LoylySaunaLanding from "@/components/ui/loyly-sauna-landing"

const SLOTS = [
  { time: "06:30", name: "Sunrise raft", note: "Coffee on board, mist on the water", capacity: 8, price: 26 },
  { time: "10:00", name: "Morning raft", note: "Swim to the buoy and back", capacity: 8, price: 24 },
  { time: "15:00", name: "Afternoon raft", note: "Sunny side of the deck", capacity: 8, price: 24 },
  { time: "19:30", name: "Dusk raft", note: "Lanterns on, last boat 21:00", capacity: 8, price: 26 },
]
const FULL = [
  [6, 3, 5, 8],
  [5, 2, 4, 7],
  [7, 4, 3, 8],
  [4, 3, 6, 6],
  [8, 5, 7, 8],
  [8, 8, 8, 7],
  [7, 6, 5, 3],
]
const DAYS = ["Mon 13", "Tue 14", "Wed 15", "Thu 16", "Fri 17", "Sat 18", "Sun 19"].map((label, d) => ({
  label,
  sessions: SLOTS.map((s, i) => ({ ...s, id: "raft" + d + i, minutes: 75, booked: FULL[d][i] })),
}))

// The same page reprinted in Klein blue for a floating sauna on a lake:
// new brand, copy, rooms, plans and hours, all through props.
export default function DemoKlein() {
  return (
    <LoylySaunaLanding
      brand="Saltbath"
      tagline="Floating sauna on the lake"
      ink="klein"
      hero={{
        title: "Heat on the water.",
        text: "A cedar sauna on a raft, ten strokes from the shore. Climb down the ladder into the lake between rounds.",
        cta: "Book a session",
        secondary: "See passes",
      }}
      heat={{ label: "Felt heat, upper bench", base: 82, rise: 11, button: "Ladle water on the stones", hint: "Or press anywhere in the heat." }}
      sessions={{
        days: DAYS,
        title: "This week on the lake.",
        text: "Sessions are 75 minutes on the raft, boat transfer included. Robes and towels are on board; bring a swimsuit and a hat in winter.",
      }}
      ritual={{
        title: "Heat, lake, sky. Three times.",
        text: "Sweat on the upper bench, climb down the ladder into the lake, then sit out on the deck until you hear the water again.",
        steps: [
          { kind: "heat", name: "Heat", minutes: 12, text: "Upper bench, window side, until your shoulders are heavy." },
          { kind: "cold", name: "Lake", minutes: 2, text: "Down the ladder, hold the rope, count your breaths." },
          { kind: "rest", name: "Deck", minutes: 8, text: "Sheepskin, windbreak, tea. Watch the shore." },
        ],
        extra: { name: "Boat to the jetty", minutes: 9 },
      }}
      rooms={{
        title: "Hot cedar, cold lake, a deck in between.",
        items: [
          { name: "Cedar sauna", kind: "heat", temp: 85, text: "Eight seats around a wood stove, with a window at bench height facing the open water.", stay: "10 to 15 min" },
          { name: "The lake", kind: "cold", temp: 9, text: "Straight off the back ladder. A rope runs to a buoy for anyone who wants to swim a lap.", stay: "As long as you like" },
          { name: "Deck", kind: "rest", temp: 16, text: "Sheepskins and a windbreak on the sunny side of the raft. Tea from the thermos is free.", stay: "10 min or more" },
        ],
      }}
      plans={{
        title: "Pay per raft trip, or sign up for the season.",
        items: [
          { name: "Single", price: 24, unit: "per session", text: "Any session, boat transfer included.", features: ["75 minutes on the raft", "Towel and robe", "Tea on deck"], cta: "Book a session" },
          { name: "Five trips", price: 105, unit: "for 5 visits", text: "€21 a trip, valid all season.", features: ["Share with anyone", "Book a week ahead"], cta: "Buy five trips" },
          { name: "Season", price: 59, yearly: 540, unit: "a month", text: "April to November, as often as you like.", features: ["Unlimited trips", "Sunrise sessions", "One guest a week"], cta: "Get a season pass", featured: true },
        ],
      }}
      visit={{
        title: "Jetty 2, north beach.",
        address: ["Saltbath Floating Sauna", "Jetty 2, North Beach", "Look for the blue flag"],
        hours: [
          { days: "April to November", time: "06:30 to 21:30" },
          { days: "Winter weekends", time: "09:00 to 17:00" },
        ],
        email: "raft@saltbath.example",
      }}
      quotes={[
        { quote: "Climbing down the ladder into the lake at seven in the morning has replaced my coffee. Almost.", name: "Jonas Ekberg", role: "Season pass" },
        { quote: "Eight people, one stove, no phones and the whole lake around you. It is the quietest place in the city.", name: "Priya Raman", role: "Five-trip card" },
      ]}
      faq={{
        title: "Before you board.",
        items: [
          { q: "How do I get to the raft?", a: "Our boat leaves Jetty 2 ten minutes before each session and brings you back after. The trip takes four minutes." },
          { q: "Do I have to swim?", a: "No. The ladder has a rail and a wide bottom step, so you can stay at chest height and hold on." },
          { q: "What if the weather turns?", a: "We sail in rain and snow. In thunder or strong wind we move you to another session or refund you." },
          { q: "What should I bring?", a: "A swimsuit and a hat for the cold months. Robes, towels and tea are on board." },
        ],
      }}
      newsletter={{ title: "The raft schedule, every Friday.", text: "Sunrise slots, water temperature and the odd full-moon session." }}
      footer={{ note: "Saltbath. A raft, a stove and a lake." }}
    />
  )
}
