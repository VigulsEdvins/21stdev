"use client"

import SteppedMorphSlider from "@/components/ui/stepped-morph-slider"

// Real landscape photography (Unsplash) on a warm page with a thin outline —
// a travel journal's cover carousel.
const U = (id: string) => "https://images.unsplash.com/photo-" + id + "?q=80&w=1800&auto=format&fit=crop"

export default function DemoPhotos() {
  return (
    <div className="w-full">
      <SteppedMorphSlider
        autoplay={4800}
        outline="#1b1a17"
        background="#efe9df"
        ink="#1b1a17"
        muted="#8b8172"
        accent="#c2410c"
        slides={[
          { image: U("1506905925346-21bda4d32df4"), title: "Above the Clouds", caption: "Valais, Switzerland — sunrise at 3,100 m.", seed: 5 },
          { image: U("1501785888041-af3ef285b470"), title: "Glass Lake", caption: "Lago di Braies, a rowboat at noon.", seed: 9 },
          { image: U("1469474968028-56623f02e42e"), title: "Gold Valley", caption: "Late light pouring over the ridge.", seed: 21 },
          { image: U("1464822759023-fed622ff2c3b"), title: "Snow Line", caption: "Pines, river flats and the high range.", seed: 33 },
          { image: U("1500534314209-a25ddb2bd429"), title: "Blue Ridges", caption: "Seven layers of haze before dusk.", seed: 48 },
          { image: U("1433086966358-54859d0ed716"), title: "Falls Bridge", caption: "Multnomah Falls after the rain.", seed: 57 },
        ]}
      />
    </div>
  )
}
