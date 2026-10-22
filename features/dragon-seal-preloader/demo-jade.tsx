"use client"

import * as React from "react"
import DragonSealPreloader from "@/components/ui/dragon-seal-preloader"

// Driven by real progress: a stand-in asset queue that surges and stalls.
const STEPS = [6, 4, 11, 2, 0, 0, 9, 14, 3, 0, 7, 12, 5, 0, 0, 8, 10, 9]

export default function DemoJade() {
  const [loaded, setLoaded] = React.useState(0)

  React.useEffect(() => {
    let i = 0
    let v = 0
    const t = setInterval(() => {
      v = Math.min(100, v + (STEPS[i++ % STEPS.length] ?? 5))
      setLoaded(v)
      if (v >= 100) clearInterval(t)
    }, 240)
    return () => clearInterval(t)
  }, [])

  return (
    <DragonSealPreloader
      tone="jade"
      progress={loaded}
      brand="青龙"
      brandLatin="Azure Dragon"
      verse="东方七宿 · 角亢氐房"
      nav={[{ label: "Synopsis" }, { label: "Trailer" }, { label: "Press" }]}
      credits={[
        { roles: "视觉概念 | 动态设计", name: "顾青", rolesLatin: "Visual Concept | Motion Design", nameLatin: "Gu Qing" },
        { roles: "剪辑", name: "叶舟", rolesLatin: "Edited by", nameLatin: "Ye Zhou" },
        { roles: "制片人", name: "许棠", rolesLatin: "Produced by", nameLatin: "Xu Tang" },
      ]}
      cta={{ label: "Book a seat" }}
    />
  )
}
