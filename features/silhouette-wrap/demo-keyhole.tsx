"use client"

import SilhouetteWrap from "@/components/ui/silhouette-wrap"

/**
 * The fall. Scroll and the keyhole drops through the column while the passage
 * re-typesets around its outline — wide at the bow, pinched at the waist,
 * flaring again at the base.
 */
export default function KeyholeDemo() {
  return (
    <div className="w-full bg-background text-foreground">
      <section className="flex h-[52svh] flex-col items-center justify-end px-6 pb-14 text-center">
        <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.42em] text-muted-foreground">
          Chapter I
        </p>
        <h1 className="max-w-4xl text-balance font-serif text-5xl leading-[1.02] tracking-tight sm:text-[4.5rem]">
          Down the Rabbit-Hole
        </h1>
      </section>

      <div className="mx-auto w-full max-w-3xl px-6 font-serif text-[19px] leading-[1.9]">
        <SilhouetteWrap size={180} tolerance={0.95} />
      </div>

      {/* The trailing space is what the fall travels through, so it carries the
          colophon at its end rather than leaving the page to trail off. */}
      <section className="mx-auto w-full max-w-3xl px-6 pb-24 pt-[62svh]">
        <hr className="border-border" />
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
          Lewis Carroll, 1865 · public domain
        </p>
      </section>
    </div>
  )
}
