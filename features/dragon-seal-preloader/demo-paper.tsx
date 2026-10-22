"use client"

import DragonSealPreloader from "@/components/ui/dragon-seal-preloader"

// Ink on parchment, for light pages: an exhibition opening instead of a film.
export default function DemoPaper() {
  return (
    <DragonSealPreloader
      tone="paper"
      brand="墨庐"
      brandLatin="Ink Hall"
      verse="一纸江山 · 万里云烟"
      nav={[{ label: "Exhibition" }, { label: "Artists" }, { label: "Visit" }]}
      credits={[
        { roles: "策展 | 空间设计", name: "白露", rolesLatin: "Curation | Exhibition Design", nameLatin: "Bai Lu" },
        { roles: "书法", name: "何砚", rolesLatin: "Calligraphy", nameLatin: "He Yan" },
        { roles: "版画 | 雕版", name: "江离", rolesLatin: "Printmaking | Woodblock", nameLatin: "Jiang Li" },
      ]}
      cta={{ label: "Plan a visit" }}
    />
  )
}
