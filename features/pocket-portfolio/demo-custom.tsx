"use client"

import PocketPortfolio from "@/components/ui/pocket-portfolio"

// Your own details, a different accent, forced dark, and English / French.
export default function DemoCustom() {
  return (
    <PocketPortfolio
      name="Maya Laurent"
      handle="@maya.makes"
      email="bonjour@mayalaurent.fr"
      location="Lyon, FR"
      timeZone="Europe/Paris"
      accent="#c6ff3d"
      theme="dark"
      defaultOpen={["info", "work"]}
      availability="Booking projects for Q1 2027"
      languages={[
        {
          code: "EN",
          bio: "Independent product designer in Lyon. I design calm interfaces for loud problems, from fintech dashboards to the apps you open every morning.",
        },
        {
          code: "FR",
          lang: "fr",
          bio: "Designer produit indépendante à Lyon. Je dessine des interfaces calmes pour des problèmes bruyants, des tableaux de bord fintech aux applis que vous ouvrez chaque matin.",
          labels: { info: "Profil", work: "Projets", contact: "Contact", services: "Services", experience: "Parcours", showAll: "Tous les projets", showLess: "Moins", copy: "Copier l’e-mail", copied: "Copié", hello: "Écrire", viewCase: "Voir le projet", year: "Année", role: "Rôle" },
        },
      ]}
      projects={[
        { title: "Ledger", art: "cards", year: "2026", role: "Product design", tags: ["Fintech", "Web app"], href: "#", description: { EN: "A money dashboard for freelancers that turns invoices, taxes and runway into one honest number.", FR: "Un tableau de bord pour freelances qui réduit factures, impôts et trésorerie à un seul chiffre honnête." } },
        { title: "Morning", art: "phone", year: "2025", role: "iOS app", tags: ["Mobile", "Habits"], href: "#", description: { EN: "A ten-second daily check-in. Mood, sleep and one sentence, then out of your way.", FR: "Un rituel quotidien de dix secondes. Humeur, sommeil et une phrase, puis c’est tout." } },
        { title: "Quai 9", art: "poster", year: "2024", role: "Event identity", tags: ["Identity", "Poster"], description: { EN: "Identity for a riverside summer cinema, built around a single rising moon.", FR: "Identité d’un cinéma d’été au bord du Rhône, autour d’une seule lune montante." } },
      ]}
      clients={[
        { name: "Paylane", mark: "stack" },
        { name: "lumen", mark: "spark" },
        { name: "Rivière", mark: "wave" },
        { name: "grid.io", mark: "hash" },
      ]}
      services={["Product design", "Design systems", "Prototyping", "Workshops"]}
      experience={[
        { years: "2022 — Now", role: "Independent", org: "Studio Laurent" },
        { years: "2019 — 22", role: "Lead Designer", org: "Paylane" },
      ]}
      socials={[
        { label: "Twitter / X", href: "#", handle: "@maya.makes" },
        { label: "Dribbble", href: "#", handle: "mayalaurent" },
      ]}
    />
  )
}
