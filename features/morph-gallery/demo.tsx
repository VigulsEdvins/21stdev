"use client"

import MorphGallery from "@/components/ui/morph-gallery"

const ITEMS = [
  {
    src: "/assets/library/photo-1500534314209-a25ddb2bd429-a8d2beeb.jpg",
    thumb: "/assets/library/photo-1500534314209-a25ddb2bd429-a45a66a7.jpg",
    alt: "Sun rays through a forest",
  },
  {
    src: "/assets/library/photo-1519681393784-d120267933ba-26f90798.jpg",
    thumb: "/assets/library/photo-1519681393784-d120267933ba-79192a80.jpg",
    alt: "Snow-capped mountain peak at night",
  },
  {
    src: "/assets/library/photo-1506905925346-21bda4d32df4-64f509f8.jpg",
    thumb: "/assets/library/photo-1506905925346-21bda4d32df4-d0f82e12.jpg",
    alt: "Mountain reflected in a still lake",
  },
  {
    src: "/assets/library/photo-1501854140801-50d01698950b-f3d97b75.jpg",
    thumb: "/assets/library/photo-1501854140801-50d01698950b-882b7b66.jpg",
    alt: "Aerial view of green hills",
  },
  {
    src: "/assets/library/photo-1465146344425-f00d5f5c8f07-47c773ca.jpg",
    thumb: "/assets/library/photo-1465146344425-f00d5f5c8f07-a03add26.jpg",
    alt: "Orange wildflower field",
  },
  {
    src: "/assets/library/photo-1547234935-80c7145ec969-d6e2e0ba.jpg",
    thumb: "/assets/library/photo-1547234935-80c7145ec969-1dc7c37a.jpg",
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
