"use client"

import MorphGallery from "@/components/ui/morph-gallery"

const ITEMS = [
  {
    src: "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?auto=format&fit=crop&w=1200&h=800&q=80",
    thumb: "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?auto=format&fit=crop&w=200&h=120&q=60",
    alt: "Orange wildflower field",
  },
  {
    src: "https://images.unsplash.com/photo-1547234935-80c7145ec969?auto=format&fit=crop&w=1200&h=800&q=80",
    thumb: "https://images.unsplash.com/photo-1547234935-80c7145ec969?auto=format&fit=crop&w=200&h=120&q=60",
    alt: "Tropical beach with clear water",
  },
  {
    src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&h=800&q=80",
    thumb: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=200&h=120&q=60",
    alt: "Mountain reflected in a still lake",
  },
]

export default function Demo() {
  return (
    <div className="w-full bg-[--color-background] px-6 py-16">
      <div className="mx-auto max-w-2xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.34em] text-[--color-muted-foreground]">
          Morph Gallery
        </p>
        <h2 className="mt-3 text-3xl font-semibold text-[--color-foreground]">
          In a card
        </h2>
        <p className="mt-3 text-sm text-[--color-muted-foreground]">
          A definite height and a slower dissolve. Arrow keys work, and so does
          a swipe.
        </p>

        <div className="mt-8 overflow-hidden rounded-xl border border-[--color-border]">
          <MorphGallery
            items={ITEMS}
            height="380px"
            duration={2200}
            noiseScale={6}
            thumbnails={false}
          />
        </div>
      </div>
    </div>
  )
}
