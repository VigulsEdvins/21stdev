"use client"

import IsometricLiftCarousel, { type IsometricLiftItem } from "@/components/ui/isometric-lift-carousel"

const u = (id: string) =>
  "https://images.unsplash.com/photo-" + id + "?q=80&w=600&auto=format&fit=crop&ixlib=rb-4.1.0"

// Same photos with the title shown, a shallower turn, rounded corners and a
// dark stage.
const photos: IsometricLiftItem[] = [
  { title: "Sidewalk", src: u("1779525822769-d1bbd2c0e4bd") },
  { title: "Red roof", src: u("1779525822818-07a55330f964") },
  { title: "Signs", src: u("1779525822831-a3f03711c7d7") },
  { title: "Speed limit", src: u("1779525822819-8ddef8f8ee18") },
  { title: "Lilac tree", src: u("1779525822839-26386802c4fd") },
  { title: "Light-colored house", src: u("1778494824647-af2adeacd8b8") },
  { title: "Street light pole", src: u("1779525822731-4bde2805c932") },
  { title: "Tree-lined street", src: u("1779618258222-556cd048c6d0") },
]

export default function DemoCustom() {
  // w-full is load-bearing: 21st centres every demo in a flex wrapper, and a
  // flex item left at width:auto shrinks to fit its contents.
  return (
    <div className="w-full">
      <IsometricLiftCarousel
        items={photos}
        defaultIndex={4}
        titles
        lift={120}
        radius={6}
        rotateY={40}
        cardWidth="clamp(70px, 9vw, 110px)"
        activeWidth="clamp(130px, 17vw, 200px)"
        background="#101012"
        color="#f4f4f5"
        ariaLabel="Street photos"
      />
    </div>
  )
}
