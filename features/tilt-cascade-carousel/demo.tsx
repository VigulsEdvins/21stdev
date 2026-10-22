"use client"

import TiltCascadeCarousel, { type TiltCascadeItem } from "@/components/ui/tilt-cascade-carousel"

const u = (id: string) =>
  "https://images.unsplash.com/photo-" + id + "?q=80&w=600&auto=format&fit=crop&ixlib=rb-4.1.0"

const photos: TiltCascadeItem[] = [
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

export default function Demo() {
  // w-full is load-bearing: 21st centres every demo in a flex wrapper, and a
  // flex item left at width:auto shrinks to fit its contents.
  return (
    <div className="w-full">
      <TiltCascadeCarousel items={photos} />
    </div>
  )
}
