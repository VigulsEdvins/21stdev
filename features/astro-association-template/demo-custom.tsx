"use client"

import AstroAssociationTemplate from "@/components/ui/astro-association-template"

// Someone else's club on the same template: a city observatory society with its
// own palette, wordmark, projects, nights and tiers, and handlers wired up.
export default function DemoCustom() {
  return (
    <AstroAssociationTemplate
      brand="NOVA."
      seed={4242}
      palette={{
        name: "Glacier",
        accent: "#0057d9",
        frame: "#9cc8ff",
        colors: ["#2d8cff", "#0057d9", "#46a6ff", "#7cc4ff", "#b9e0ff", "#e6f4ff", "#00c2d1", "#5ee0e8", "#1b3fa8", "#9fb7ff", "#ffffff"],
      }}
      hero={{
        wordmark: "Nova",
        issue: "#027",
        title: "NOVA.\nSOCiETY",
        blurb: "A city observatory society with two domes, forty telescopes to lend and a rooftop that opens every clear Friday.",
        credit: "Nova Society · Rooftop observatory since 1961",
        primaryCta: "Become a member",
        secondaryCta: "See the calendar",
        hint: "Pop a star or two.",
      }}
      mission={{
        bandTitle: "NOVA.\nSOCiETY",
        kicker: "NOVA. SOCIETY OBSERVATORY",
        meta: ["Nova. Society", "#027 rooftop season", "Run by volunteers"],
        title: "Two domes, one rooftop, everybody welcome.",
        body: "We keep the city's oldest public telescope running and teach anyone who climbs the stairs how to use it.",
        stats: [
          { value: "640", label: "Members" },
          { value: "1961", label: "Founded" },
          { value: "40", label: "Telescopes to lend" },
          { value: "52", label: "Open Fridays a year" },
        ],
      }}
      projectsCopy={{ title: "NOVA\nSOCiETY", issue: "027", ribbonText: "nova. society", heading: "What the domes are busy with." }}
      projects={[
        { code: "#025", title: "Variable Star Log", summary: "Timing the dimming of eclipsing binaries.", detail: "Observations go straight to the international variable star database.", status: "ongoing", progress: 0.58, goal: "1,160 of 2,000 estimates", cta: "Join a shift" },
        { code: "#026", title: "Rooftop Restoration", summary: "Re-silvering the 1961 refractor's sister mirror.", detail: "Funded by members; finished last spring.", status: "archived", progress: 1, goal: "Funded and finished", cta: "Read the log" },
        { code: "#027", title: "Pavement Astronomy", summary: "Telescopes on street corners, free for passers-by.", detail: "Bring a scope or borrow one, we bring the chairs and the cocoa.", status: "open", progress: 0.2, goal: "Volunteers wanted", cta: "Volunteer" },
      ]}
      nightsTitle="Fridays on the roof."
      nights={[
        { date: "2026-11-06", time: "20:00", title: "Open roof: Jupiter", place: "North dome", kind: "Open night", target: "Jupiter's moons", seats: 30, going: 22 },
        { date: "2026-11-13", time: "19:00", title: "Collimation clinic", place: "Workshop", kind: "Workshop", target: "Your own telescope", seats: 12, going: 12 },
        { date: "2026-11-20", time: "20:00", title: "Open roof: the Pleiades", place: "Both domes", kind: "Open night", target: "M45", seats: 30, going: 8 },
      ]}
      tiers={[
        { name: "Friend", price: "£0", blurb: "Newsletter and open nights.", perks: ["Open Fridays", "Newsletter"] },
        { name: "Member", price: "£4", period: "/mo", blurb: "Borrow the telescopes.", perks: ["Telescope library", "Dome training", "Workshops"], featured: true },
        { name: "Keyholder", price: "£12", period: "/mo", blurb: "Your own key to the roof.", perks: ["24/7 roof access", "Guest passes", "Name on the dome"] },
      ]}
      join={{ title: "Your key to the roof.", button: "Issue my card", success: "See you on the roof, {name}." }}
      footer={{ bandTitle: "NOVA.\nSOCiETY", tagline: "LOOK UP.  THEN LOOK AGAIN.", credit: "NOVA. SOCIETY · ROOFTOP OBSERVATORY" }}
      onPop={(n) => n % 10 === 0 && console.log("popped", n)}
      onContribute={(p) => console.log("contribute", p.code)}
      onRsvp={(n, going) => console.log("rsvp", n.title, going)}
      onJoin={(m) => new Promise((r) => setTimeout(() => r(console.log("join", m)), 700))}
    />
  )
}
