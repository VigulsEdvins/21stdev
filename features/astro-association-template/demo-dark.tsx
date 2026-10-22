"use client"

import AstroAssociationTemplate from "@/components/ui/astro-association-template"

// Pinned to dark, in the nebula palette: the bubbles glow on deep navy.
export default function DemoDark() {
  return <AstroAssociationTemplate defaultTheme="dark" palette="nebula" seed={2077} />
}
