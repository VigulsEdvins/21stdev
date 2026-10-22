"use client"

import FlorilegiumTemplate, { FLORA } from "@/components/ui/florilegium-template"

// A second preset: a night florist, always dark, with its own species order and
// two forms recoloured by spreading a FLORA preset.
const MOONFLOWER = {
  ...FLORA.waterlily,
  colors: { ...FLORA.waterlily.colors, petal: ["#d9dde8", "#f2f3f7", "#ffffff"], inner: "#e9ecf3", blotch: "#c9e3c4" },
} as typeof FLORA.waterlily

const INK_TULIP = {
  ...FLORA.tulip,
  colors: { ...FLORA.tulip.colors, petal: ["#1c0b2a", "#3b1452", "#5b2470"], inner: "#2c0f3f", blotch: "#0b0612" },
} as typeof FLORA.tulip

export default function DemoNocturne() {
  return (
    <div className="w-full">
      <FlorilegiumTemplate
        brand="Noctiflora"
        theme="dark"
        hero={{
          species: { name: "Poppy", latin: "Papaver rhoeas", family: "Papaveraceae", origin: "Eurasia", form: "poppy", blurb: "Red as a warning, gone by evening." },
          category: "Field notes",
          title: "Flowers that open after dark",
          highlight: "Papaver rhoeas",
          season: "AW26",
          cta: { label: "Book a night walk" },
          date: "31 October",
          views: "9,064",
          thread: [
            { title: "The moonflower opens in under a minute", to: 3 },
            { title: "Why black tulips are really purple", to: 4 },
            { title: "Pressing the last poppy of the year", to: 0 },
          ],
        }}
        anthesis={{
          word: "NOCTURNE",
          species: { name: "Magnolia", latin: "Magnolia stellata", family: "Magnoliaceae", origin: "Japan", form: "magnolia", blurb: "Stars on a bare branch." },
          left: "Grown for the hour\nafter sunset",
          right: "Night-scented,\nmoon-pollinated",
          pixelSpecies: { name: "Sunflower", latin: "Helianthus annuus", family: "Asteraceae", origin: "North America", form: "sunflower", blurb: "Asleep, facing east." },
          pixelLeft: "A sunflower\nwaiting for morning",
          pixelRight: "Eight-bit, for the\nscreens left on all night",
          words: ["Dusk", "Bloom", "Moth", "Pixel", "Dawn"],
        }}
        specimens={[
          {
            name: "Moonflower", latin: "Ipomoea alba", family: "Convolvulaceae", origin: "Tropical Americas", form: MOONFLOWER,
            blurb: "It unfurls at dusk fast enough to watch, and is closed again before breakfast. Hawk moths do the rest.",
            note: { title: "Observe the bindweed family", text: "Sweet potato and morning glory are cousins — one feeds you, one climbs your fence.", credit: "Ines Duarte" },
            care: { light: "Full sun by day", water: "Generous in summer", season: "July — October", vase: "One night" },
          },
          {
            name: "Queen of Night", latin: "Tulipa 'Queen of Night'", family: "Liliaceae", origin: "Netherlands", form: INK_TULIP,
            blurb: "The darkest tulip in commerce since 1944. In full sun it gives itself away as a deep, glossy aubergine.",
            note: { title: "Observe the lily family", text: "Plant the bulbs after the first frost, pointed end up, three times their own depth.", credit: "Pieter Vos" },
            care: { light: "Full sun", water: "Only in spring", season: "April — May", vase: "5 to 7 days" },
          },
          {
            name: "Dahlia", latin: "Dahlia 'Café au Lait'", family: "Asteraceae", origin: "Mexico", form: "dahlia",
            blurb: "A dinner-plate dahlia bred to be blush in daylight and almost silver under a streetlamp.",
            care: { light: "Six hours of sun", water: "Deep, twice a week", season: "August — October", vase: "4 to 6 days" },
          },
          {
            name: "Anemone", latin: "Anemone coronaria 'Mr Fokker'", family: "Ranunculaceae", origin: "Mediterranean", form: "anemone",
            blurb: "The windflower closes at dusk — the only one on this page that sleeps when the others wake.",
            care: { light: "Cool sun", water: "Light, even", season: "February — April", vase: "7 to 10 days" },
          },
        ]}
        footer={{
          paragraphs: [
            "We keep a garden that only opens at night: moths, lamps, and the slow white flowers that wait for them.",
            "Walks run from the equinox to the first frost. Bring a torch with a red filter; the flowers do the rest.",
          ],
          signature: ["Dusk. Bloom. Dawn.", "night people"],
          copyright: "© 2026 Noctiflora",
        }}
        darkPalette={{ night: "#04050a", accent: "#c9d4ff" }}
        pixelBlock={7}
      />
    </div>
  )
}
