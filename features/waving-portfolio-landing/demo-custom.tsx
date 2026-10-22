"use client"

import WavingPortfolioLanding from "@/components/ui/waving-portfolio-landing"

export default function DemoCustom() {
  return (
    <WavingPortfolioLanding
      name="Kedha"
      year="2027"
      roles={["Motion Designer", "Animator"]}
      lettersLeft={["HEL", "WOR"]}
      giantLetter="L"
      lettersRight={["O", "D"]}
      title="Hello World"
      signature="KE/DHA"
      greeting="Hello!"
      accent="#2346ff"
      paper="#f3f1ea"
    />
  )
}
