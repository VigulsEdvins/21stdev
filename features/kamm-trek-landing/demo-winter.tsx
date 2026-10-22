"use client"

import KammTrekLanding from "@/components/ui/kamm-trek-landing"

const STAGES = [
  {
    to: "Chamanna Sur Crap",
    alt: 2290,
    at: [0.32, 0.56] as [number, number],
    km: 9.4,
    hours: "4 h 30 min",
    profile: [1340, 1520, 1780, 2010, 2190, 2290],
    title: "Skins on at the station",
    text: "From the last post bus stop straight onto the snow. A gentle first climb to check bindings, layers and the avalanche kit together.",
    sleep: "Rooms of 4, drying room, hot shower",
    duffel: true,
  },
  {
    to: "Chamanna Lej Alv",
    alt: 2475,
    at: [0.2, 0.5] as [number, number],
    km: 11.8,
    hours: "5 h 10 min",
    profile: [2290, 2520, 2760, 2610, 2830, 2590, 2475],
    title: "Two cols before lunch",
    text: "Kick turns up the first col, a short boot pack to the second, and long open powder slopes down to the frozen lake.",
    sleep: "Dorm of 10, winter room, wood stove",
  },
  {
    to: "Grathütte",
    alt: 2912,
    at: [0.4, 0.41] as [number, number],
    km: 8.6,
    hours: "5 h",
    profile: [2475, 2690, 2880, 3048, 2950, 2912],
    title: "The summit day",
    text: "Skis on the pack for the last 80 m to the summit cross, then the best descent of the week on the north face.",
    sleep: "Dorm of 12, the warden bakes bread",
  },
  {
    to: "Berghaus Sura",
    alt: 2180,
    at: [0.77, 0.43] as [number, number],
    km: 13.2,
    hours: "5 h 30 min",
    profile: [2912, 3010, 2700, 2480, 2620, 2350, 2180],
    title: "Along the glacier",
    text: "Roped up across the glacier in the morning, then a long run of spring snow to a hut with a sauna.",
    sleep: "Rooms of 2, wood-fired sauna",
    duffel: true,
  },
  {
    to: "Sankt Alder",
    alt: 1310,
    at: [0.78, 0.54] as [number, number],
    km: 10.1,
    hours: "3 h",
    profile: [2180, 2290, 1980, 1640, 1310],
    title: "Down to the village",
    text: "One last climb for the sunrise, then 900 m of descent through larch glades to the village square and lunch.",
  },
]

const D = (id: string, start: string, guide: string, booked: number, price: number, note?: string) => ({ id, start, guide, capacity: 8, booked, price, note })

// The same page for a ski-touring week: winter light, snow to the valley floor,
// another seed, five stages, groups of eight and February to April dates.
export default function DemoWinter() {
  return (
    <KammTrekLanding
      brand="Kamm"
      tagline="Ski tours"
      preset="winter"
      seed={19}
      hero={{
        title: "Five days on skins, hut to hut.",
        text: "A guided ski tour across the Rotgrat for confident off-piste skiers. Huts booked, avalanche kit included, groups of eight.",
        cta: "Check dates",
        secondary: "See the tour",
        live: { stage: 2, label: "Group 6 is on the summit day" },
      }}
      route={{
        name: "Rotgrat Ski Tour",
        title: "53 km on skis, four huts, one summit.",
        text: "Every day ends at a hut with a drying room and a hot dinner. Move along the profile to see each climb and descent.",
        start: { name: "Valpiana", alt: 1340, at: [0.5, 0.93] },
        stages: STAGES,
      }}
      huts={{ title: "Where you sleep.", text: "Four winter huts, opened for our groups. Boots dry overnight and breakfast is at half past six." }}
      included={{
        figure: "8 kg",
        title: "on your back. The heavy kit is ours.",
        text: "One price covers the guide, the huts, the food and the avalanche equipment.",
        items: [
          { symbol: "guide", title: "An IFMGA guide", text: "One guide for every eight skiers, two on the glacier day." },
          { symbol: "shield", title: "Avalanche kit", text: "Transceiver, shovel and probe, checked with you on the first morning." },
          { symbol: "hut", title: "Four nights in huts", text: "Half board and a packed lunch every day." },
          { symbol: "rope", title: "Glacier kit", text: "Harness, crampons and ski crampons for day 4." },
          { symbol: "bag", title: "Your duffel, sent ahead", text: "It meets you on nights 1 and 4 by snowcat." },
          { symbol: "bus", title: "Transfers", text: "The post bus from Sankt Alder back to Valpiana." },
        ],
        excluded: ["Touring skis and skins (rental from CHF 190)", "Drinks at the huts", "Travel insurance with mountain rescue"],
      }}
      departures={{
        title: "Winter 2027 departures.",
        text: "Groups of up to 8 with one guide. CHF 2,180 per person with half board, hut fees and avalanche kit.",
        items: [
          D("st-1", "2027-02-07", "Lea Tschudi", 3, 2180),
          D("st-2", "2027-02-21", "Marco Bezzola", 8, 2180),
          D("st-3", "2027-03-07", "Lea Tschudi", 5, 2180),
          D("st-4", "2027-03-21", "Anna Caduff", 6, 2280, "Full moon"),
          D("st-5", "2027-04-04", "Marco Bezzola", 2, 2080, "Spring snow"),
          D("st-6", "2027-04-18", "Lea Tschudi", 1, 2080, "Spring snow"),
        ],
      }}
      reviews={{
        title: "From the hut books.",
        items: [
          { quote: "The north face on day three was the best run of my life, and Lea had checked it twice before she let us drop in.", name: "Tom H.", from: "Leeds", hut: "Grathütte", alt: 2912, date: "9.3.2026" },
          { quote: "I came to learn kick turns properly. By the second col I had stopped thinking about them.", name: "Ines W.", from: "Basel", hut: "Chamanna Lej Alv", alt: 2475, date: "23.2.2026" },
          { quote: "Warm huts, dry boots every morning and a guide who explained every decision. That is what you pay for.", name: "Pierre L.", from: "Lyon", hut: "Berghaus Sura", alt: 2180, date: "6.4.2026" },
        ],
      }}
      guides={{
        title: "Your guides",
        items: [
          { name: "Lea Tschudi", role: "IFMGA guide and ski instructor", text: "Leads most February weeks and teaches the avalanche refresher on the first morning." },
          { name: "Marco Bezzola", role: "Guide, former warden at Grathütte", text: "Knows which slopes the wind loads and which hut keeps the warmest winter room." },
          { name: "Anna Caduff", role: "IFMGA guide since 2011", text: "Takes the spring weeks, when the snow softens by eleven and the descents go on for ever." },
        ],
      }}
      faq={{
        title: "Before you book.",
        items: [
          { q: "How good a skier do I need to be?", a: "You should ski any red piste in control and enjoy off-piste in mixed snow. Uphill fitness matters more than style: about 1,000 m of climbing a day." },
          { q: "What if the avalanche danger is high?", a: "Your guide picks the line each morning from the bulletin. Every stage has a safer variant, and we would rather wait a day at a hut than take a slope we are unsure of." },
          { q: "Can I rent touring skis?", a: "Yes. The shop in Valpiana fits skis, skins and boots the evening before, from CHF 190 for the week." },
          { q: "What if I need to cancel?", a: "Up to 45 days before, we refund everything except the CHF 400 deposit. After that we refund half, or move you to another week once, free." },
        ],
      }}
      footer={{ title: "Skins on in February.", note: "Guided ski tours on the Rotgrat from February to April." }}
      labels={{
        people: "Skiers",
        hutCaption: "Night {n}, after {hours} on skis.",
        errName: "Add the name the huts should book under.",
        fine: "No payment now. We hold your places for 48 hours, then ask for the deposit and your avalanche course details.",
      }}
    />
  )
}
