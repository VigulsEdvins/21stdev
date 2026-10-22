"use client"

import HoverExpandGallery from "@/components/ui/hover-expand-gallery"

const photo = (id: string) =>
  `https://images.unsplash.com/${id}?w=700&q=75&auto=format&fit=crop`

// The shape a real portfolio passes in: one image per panel, `accent` kept as
// the colour that shows while the image decodes.
const items = [
  { title: "Velvet Dreams Studio", meta: "2024", accent: "#2f4f43", src: photo("photo-1506794778202-cad84cf45f1d") },
  { title: "Neon Pulse ® Agency", meta: "2024", accent: "#c8371f", src: photo("photo-1502823403499-6ccfcf4fb453") },
  { title: "Midnight Canvas", meta: "2023", accent: "#26304d", src: photo("photo-1517841905240-472988babdf9") },
  { title: "Echo Digital Lab", meta: "2023", accent: "#b4642c", src: photo("photo-1500648767791-00dcc994a43e") },
  { title: "Cosmic Brew Studios", meta: "2023", accent: "#6b4a8f", src: photo("photo-1524504388940-b1c1722653e1") },
  { title: "Horizon Typography", meta: "2022", accent: "#d6c9a8", src: photo("photo-1544005313-94ddf0286df2") },
  { title: "Waves & ® Motion", meta: "2022", accent: "#1f6f7a", src: photo("photo-1506794778202-cad84cf45f1d") },
  { title: "Stellar Workshop", meta: "2022", accent: "#8f8f8f", src: photo("photo-1502823403499-6ccfcf4fb453") },
  { title: "Prism ® Media House", meta: "2021", accent: "#a8326a", src: photo("photo-1517841905240-472988babdf9") },
  { title: "Aurora Design Co ™", meta: "2021", accent: "#3f7d4f", src: photo("photo-1500648767791-00dcc994a43e") },
  { title: "Flux Interactive", meta: "2021", accent: "#c9a227", src: photo("photo-1524504388940-b1c1722653e1") },
  { title: "Zenith Brand Studio", meta: "2020", accent: "#4a4f8f", src: photo("photo-1544005313-94ddf0286df2") },
]

export default function PhotosDemo() {
  return <HoverExpandGallery items={items} defaultIndex={1} />
}
