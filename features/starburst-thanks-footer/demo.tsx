"use client"

import StarburstThanksFooter from "@/components/ui/starburst-thanks-footer"

export default function Demo() {
  return (
    <div className="w-full bg-[#111418]">
      <StarburstThanksFooter
        name="Noor Haddad"
        thanks={["Shukran", "Thank you", "Merci", "Teşekkürler"]}
        tagline="for stopping by"
        signoff="now go make something weird."
        links={[
          { caption: "More of my shots", label: "dribbble.com/noorhaddad", href: "#" },
          { caption: "More of my code", label: "github.com/noorhaddad", href: "#" },
        ]}
        email="noor@haddad.design"
        phone=""
        background="#111418"
        ink="#ece8df"
        accent="#c6ff3d"
        height="680px"
        starPoints={12}
      />
    </div>
  )
}
