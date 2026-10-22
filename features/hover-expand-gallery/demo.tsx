"use client"

import HoverExpandGallery from "@/components/ui/hover-expand-gallery"

const settings = {
  railWidth: 64,
  maxOpenWidth: 520,
  duration: 620,
}

export default function Demo(props: Partial<typeof settings>) {
  const s = { ...settings, ...props }
  return (
    <HoverExpandGallery
      railWidth={s.railWidth}
      maxOpenWidth={s.maxOpenWidth}
      duration={s.duration}
    />
  )
}
