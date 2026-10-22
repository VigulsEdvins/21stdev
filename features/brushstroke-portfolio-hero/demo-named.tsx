"use client"

import BrushstrokePortfolioHero from "@/components/ui/brushstroke-portfolio-hero"

/** Every string on the sheet is a prop. The last word of the name is the bold
 *  one, the first word of the role is. */
export default function DemoNamed() {
  return (
    <BrushstrokePortfolioHero
      role="3D Artist"
      period="2022-2023"
      periodNote="Selected works"
      name="Kedhareswer Naidu"
      email="hello@yourstudio.com"
      phone="0925 028 531"
    />
  )
}
