"use client"

import RangoliPreloader from "@/components/ui/rangoli-preloader"

// A kolam on dark stone for Pongal: twelve folds, a Tamil welcome.
export default function DemoSlate() {
  return (
    <RangoliPreloader
      loop
      preset="slate"
      folds={12}
      seed={21}
      meta="Pongal · 2027"
      blessing="நல்வரவு"
      message="Welcome in."
    />
  )
}
