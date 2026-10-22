"use client"

import SidebarPortfolioTemplate from "@/components/ui/sidebar-portfolio-template"

// The same template for someone else: a product designer in Berlin, green
// accent, dark page, their own history. Every word and colour is a prop.
export default function DemoCustom() {
  return (
    <SidebarPortfolioTemplate
      name="Maya Lindqvist"
      role="Product Designer"
      bio="Designing calm, useful software for teams who ship fast and care about the details."
      avatar={{ skin: "#e3b89a", hair: "#b0532c", shirt: "#2c3a33", backdrop: "#9fb8a4" }}
      details={[
        { icon: "pin", label: "Berlin, Germany" },
        { icon: "briefcase", label: "7 years designing products" },
        { icon: "clock", label: "Booking from November" },
      ]}
      socials={[
        { label: "Dribbble", href: "https://dribbble.com", icon: "dribbble" },
        { label: "Instagram", href: "https://instagram.com", icon: "instagram" },
        { label: "GitHub", href: "https://github.com", icon: "github" },
        { label: "Website", href: "https://example.com", icon: "globe" },
      ]}
      email="maya@lindqvist.studio"
      headline="Product Designer"
      tagline="Turning messy workflows into interfaces people enjoy using, from first sketch to shipped pixels."
      heroQuips={["prototype ready", "user test booked", "handoff done ✓", "pixel perfect"]}
      about="I lead design from research to release, pairing closely with engineers so the details survive the build. Lately: design systems, onboarding, and the small interactions that make a tool feel trustworthy."
      keySkills={["Design systems", "Prototyping", "User research", "Figma", "Interaction design"]}
      experience={[
        {
          company: "Fjord Health",
          logo: { color: "#0f8a6a", glyph: "leaf" },
          roles: [
            {
              title: "Lead Product Designer",
              type: "Full-Time",
              start: "Mar 2023",
              end: "Present",
              summary: "Leading a team of four across the patient app and the clinician dashboard.",
              highlights: ["Shipped a design system used by 30 engineers", "Cut onboarding drop-off by 38%"],
              skills: ["Design systems", "User research", "Figma"],
            },
            {
              title: "Senior Product Designer",
              type: "Full-Time",
              start: "Jun 2021",
              end: "Feb 2023",
              summary: "Owned scheduling and messaging end to end.",
              skills: ["Prototyping", "Interaction design", "Figma"],
            },
          ],
        },
        {
          company: "Loop Studio",
          logo: { color: "#e2a012", glyph: "spark" },
          roles: [
            {
              title: "Product Designer",
              type: "Contract",
              start: "Jan 2019",
              end: "May 2021",
              summary: "Designed web and mobile products for early-stage startups.",
              skills: ["Prototyping", "User research", "Interaction design"],
            },
          ],
        },
      ]}
      education={[
        {
          school: "Umeå Institute of Design",
          degree: "M.F.A. Interaction Design",
          start: "2016",
          end: "2018",
          summary: "Thesis on trust signals in health software.",
          notes: ["Exchange semester in Tokyo", "Student design award, shortlist"],
          logo: { color: "#3a3f8f", glyph: "book" },
        },
      ]}
      skills={[
        {
          name: "Design",
          items: [
            { name: "Interaction design", level: 95, years: 7 },
            { name: "Design systems", level: 92, years: 5 },
            { name: "Visual design", level: 85, years: 7 },
          ],
        },
        {
          name: "Process",
          items: [
            { name: "User research", level: 84, years: 6 },
            { name: "Prototyping", level: 90, years: 7 },
            { name: "Workshops", level: 72, years: 4 },
          ],
        },
      ]}
      contactTitle="Got a product that needs care?"
      contactText="I take on two projects a quarter. Tell me what you're building and where it hurts."
      timeZone="Europe/Berlin"
      city="Berlin"
      accent="#0f8a6a"
      theme="dark"
    />
  )
}
