"use client"

import MorphGallery from "@/components/ui/morph-gallery"

const ITEMS = [
  {
    src: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&h=900&q=80",
    thumb: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=200&h=120&q=60",
    alt: "Sun rays through a forest",
  },
  {
    src: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&h=900&q=80",
    thumb: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=200&h=120&q=60",
    alt: "Snow-capped mountain peak at night",
  },
  {
    src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1600&h=900&q=80",
    thumb: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=200&h=120&q=60",
    alt: "Mountain reflected in a still lake",
  },
  {
    src: "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=1600&h=900&q=80",
    thumb: "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=200&h=120&q=60",
    alt: "Aerial view of green hills",
  },
  {
    src: "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?auto=format&fit=crop&w=1600&h=900&q=80",
    thumb: "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?auto=format&fit=crop&w=200&h=120&q=60",
    alt: "Orange wildflower field",
  },
  {
    src: "https://images.unsplash.com/photo-1547234935-80c7145ec969?auto=format&fit=crop&w=1600&h=900&q=80",
    thumb: "https://images.unsplash.com/photo-1547234935-80c7145ec969?auto=format&fit=crop&w=200&h=120&q=60",
    alt: "Tropical beach with clear water",
  },
]

export default function Demo() {
  // w-full is load-bearing: 21st centres every demo inside a
  // `flex justify-center items-center` wrapper, and a flex item left at
  // width:auto shrinks to fit its contents — which, with a child asking for
  // 100%, resolves to 0px wide.
  return (
    <div className="relative w-full">
      <MorphGallery items={ITEMS} autoplay={4500} />
    </div>
  )
}
