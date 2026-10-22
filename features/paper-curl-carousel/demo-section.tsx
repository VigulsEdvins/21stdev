"use client"

import PaperCurlCarousel, { type PaperCurlItem } from "@/components/ui/paper-curl-carousel"

const photos: PaperCurlItem[] = [
  {
    src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1600&h=900&q=80",
    title: "Above the Clouds",
    caption: "The valley filled in overnight",
    alt: "Snowy peaks rising above a sea of cloud at dusk",
  },
  {
    src: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&h=900&q=80",
    title: "Ridgelines",
    caption: "Haze over the valley, early evening",
    alt: "Layered mountain ridges fading into haze",
  },
  {
    src: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&h=900&q=80",
    title: "High Camp",
    caption: "The ridge under the Milky Way",
    alt: "Snow-capped peaks under the Milky Way",
  },
  {
    src: "https://images.unsplash.com/photo-1547234935-80c7145ec969?auto=format&fit=crop&w=1600&h=900&q=80",
    title: "Red Desert",
    caption: "Sandstone towers after the dust storm",
    alt: "Sandstone mountains rising from a red desert",
  },
]

export default function DemoSection() {
  return (
    <section style={{ padding: "96px 24px", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 1080, display: "flex", flexDirection: "column", gap: 32 }}>
        <header style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 560 }}>
          <p style={{ margin: 0, fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-muted-foreground)" }}>
            Field notes
          </p>
          <h2 style={{ margin: 0, fontSize: 40, lineHeight: "44px", letterSpacing: "-0.02em", fontWeight: 700 }}>
            Four places we went back to
          </h2>
        </header>
        <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid var(--color-border)" }}>
          <PaperCurlCarousel items={photos} height="560px" />
        </div>
      </div>
    </section>
  )
}
