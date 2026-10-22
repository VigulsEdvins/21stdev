"use client"

import StencilLabsTemplate from "@/components/ui/stencil-labs-template"

// Someone else's site: a small hardware studio, cobalt instead of orange,
// warmer paper, three people, a shorter FAQ and a wordmark of their own.
export default function DemoStudio() {
  return (
    <StencilLabsTemplate
      brand={{ name: "Halden", word: "Works" }}
      wordmark="WORKS"
      accent="#2f5bff"
      paper="#e7e4dc"
      defaultTheme="light"
      navCta={{ label: "Book a call", href: "#subscribe" }}
      hero={{
        lines: ["Hardware,", "made small"],
        eyebrow: "Industrial design · Prototyping · Oslo",
        description: "We take connected products from napkin sketch to the first thousand units — enclosures, electronics and the boring paperwork in between.",
        cta: { label: "Start a project", href: "#subscribe" },
        secondary: { label: "How we work", href: "#faq" },
        stats: [
          { value: 38, label: "Products shipped" },
          { value: 9, suffix: "wk", label: "Avg. to prototype" },
          { value: 3, label: "Partners" },
        ],
        shape: "stack",
      }}
      teamTitle="Studio"
      teamIntro="Three partners, one workshop, a laser cutter that never sleeps."
      team={[
        { name: "Sigrid Halden", role: "Founder · Industrial design", bio: "Fifteen years of consumer hardware, from kitchen scales to e-bike displays." },
        { name: "Aksel Moen", role: "Electronics", bio: "Board design, firmware bring-up and certification. Owns the oscilloscope." },
        { name: "Noor Rahimi", role: "Production", bio: "Finds the factory, then lives on its floor until the first batch is right." },
      ]}
      faqTitle="Q&A"
      faqIntro={{ title: "Before you write", subtitle: "Answers to what most clients ask on the first call" }}
      faqShape="bot"
      faqDefaultOpen={0}
      faqMultiple
      faq={[
        { question: "How much does a prototype cost?", answer: "Most first prototypes land between 15k and 40k EUR, depending on how much electronics is custom." },
        { question: "Do you handle certification?", answer: "Yes — CE, FCC and UKCA, with the labs we already work with." },
        { question: "Can you work with our in-house team?", answer: "Happily. We often take the enclosure and production while your engineers own the firmware." },
      ]}
      newsTitle="Journal"
      blog={{ label: "All entries", href: "#" }}
      newsAutoplay
      news={[
        { title: "Why we prototype in cardboard first", author: "Sigrid Halden", category: "Process", date: "October 1, 2026", cover: "stack", kicker: "Process" },
        { title: "A field guide to tooling costs", author: "Noor Rahimi", category: "Production", date: "September 14, 2026", cover: "jack", kicker: "Tooling" },
        { title: "The little robot that tested our hinges", author: "Aksel Moen", category: "Lab", date: "August 2, 2026", cover: "bot", kicker: "Lab notes" },
      ]}
      subscribe={{ title: "One letter a month from the workshop*", placeholder: "you@company.com", note: "*No spam, ever", cta: "Join" }}
      onSubscribe={(email) => console.log("subscribe", email)}
      columns={[
        { title: "Studio", links: [{ label: "Work", href: "#" }, { label: "Process", href: "#" }] },
        { title: "Visit", links: [{ label: "Grünerløkka, Oslo", href: "#" }, { label: "Mon–Fri 9–17", href: "#" }] },
        { title: "Legal", links: [{ label: "Privacy", href: "#" }, { label: "Imprint", href: "#" }] },
      ]}
      socials={[
        { label: "Instagram", href: "#" },
        { label: "LinkedIn", href: "#" },
      ]}
    />
  )
}
