"use client"

import ViewfinderFlipCarousel, { type ViewfinderFlipItem } from "@/components/ui/viewfinder-flip-carousel"

const u = (id: string) =>
  "https://images.unsplash.com/photo-" + id + "?q=80&w=500&auto=format&fit=crop&ixlib=rb-4.1.0"

// Bigger photos, a tighter stack, rounder corners, captions and a dark stage.
const photos: ViewfinderFlipItem[] = [
  { title: "A blurry photo of a car's tail light", src: u("1644186171024-1bacda31db33") },
  { title: "Shallow focus photo of person holding video camera", src: u("1573750328968-179cc634660a") },
  { title: "Silhouette of man sitting on chair", src: u("1611518757417-b5fa0838b12e") },
  { title: "Black and gray camera tripod", src: u("1625690303837-654c9666d2d0") },
  { title: "A blurry photo of a tree with a blue sky in the background", src: u("1541869440787-abe7669a951a") },
  { title: "Woman in black and white floral shirt", src: u("1611518050831-f945a6f6a1b3") },
  { title: "Person holding silver round ornament", src: u("1602043469092-aa55df5a8aae") },
  { title: "Person holding clear glass ball", src: u("1603993138561-9151852b44e1") },
  { title: "Woman in red and black dress", src: u("1611518016416-b544a3ee13ce") },
  { title: "Man in black jacket holding camera", src: u("1603993097397-89c963e325c7") },
]

export default function DemoCustom() {
  // w-full is load-bearing: 21st centres every demo in a flex wrapper, and a
  // flex item left at width:auto shrinks to fit its contents.
  return (
    <div className="w-full">
      <ViewfinderFlipCarousel
        items={photos}
        size={260}
        openWidth={380}
        foldedWidth={56}
        radius={14}
        titles
        background="#101012"
        color="#f4f4f5"
        ariaLabel="Camera roll"
      />
    </div>
  )
}
