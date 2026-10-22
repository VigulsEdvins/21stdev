"use client"

import StaircaseCarousel, { type StaircaseItem } from "@/components/ui/staircase-carousel"

const u = (id: string) =>
  "https://images.unsplash.com/photo-" + id + "?q=80&w=600&auto=format&fit=crop&ixlib=rb-4.1.0"

// Same photos on a gentler staircase: half-storey steps, smaller side photos,
// rounded corners, a bigger title and a dark stage.
const photos: StaircaseItem[] = [
  { title: "cable car station", src: u("1774565784366-72db806a40f9") },
  { title: "light-colored house", src: u("1776031312164-f22c0edbdfb9") },
  { title: "cherry blossoms", src: u("1777763517503-05d74f2e0008") },
  { title: "bottles of drinks", src: u("1774651458632-17df84bad45e") },
  { title: "tree-lined road", src: u("1778360508753-dcb2afbeadc2") },
  { title: "train window view", src: u("1777221895589-2f81579e0dca") },
  { title: "sunlight streams", src: u("1777763517666-b9fd2c9b6a0c") },
  { title: "seagulls", src: u("1777221895551-844a3c1243b3") },
  { title: "pink flowers", src: u("1777221895297-9878eb5e53f5") },
  { title: "paddleboarding", src: u("1777908724790-2ec0d06d8ff7") },
]

export default function DemoCustom() {
  // w-full is load-bearing: 21st centres every demo in a flex wrapper, and a
  // flex item left at width:auto shrinks to fit its contents.
  return (
    <div className="w-full">
      <StaircaseCarousel
        items={photos}
        defaultIndex={4}
        step={0.55}
        inactiveScale={0.7}
        radius={14}
        titleSize="clamp(20px, 2.4vw, 32px)"
        slideWidth="clamp(140px, 22vw, 280px)"
        background="#101012"
        color="#f4f4f5"
        ariaLabel="Travel photos"
      />
    </div>
  )
}
