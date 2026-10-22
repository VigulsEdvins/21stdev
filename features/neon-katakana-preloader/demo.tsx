"use client"

import NeonKatakanaPreloader from "@/components/ui/neon-katakana-preloader"

// Same engine, another sign: ネオン ("neon") in hot magenta over a violet haze.
export default function Demo() {
  return (
    <NeonKatakanaPreloader
      loop
      word="ネオン"
      label="neon"
      caption="online"
      kicker="ネオン / sector 7"
      density={1.4}
      palette={{ glow: "#ff3df2", core: "#ffe1fb", accent: "#3dffb0", haze: "#2a0a5c", background: "#06030a" }}
    />
  )
}
