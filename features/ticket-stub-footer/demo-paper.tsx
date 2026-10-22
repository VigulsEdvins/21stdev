"use client"

import TicketStubFooter from "@/components/ui/ticket-stub-footer"

// Same component, re-inked: a paper page, a cobalt ticket and new copy.
export default function DemoPaper() {
  return (
    <div className="w-full bg-[#eee8da]">
      <TicketStubFooter
        brand="Pilot"
        company="Pilot Support Co."
        year={2026}
        eyebrow={["Now answering in 38 languages", "Median first reply: 9 seconds", "Escalates when it isn't sure"]}
        headline={["Answer faster.", "Escalate less."]}
        description="Pilot reads your docs, drafts the reply and hands the hard ones to a human, with the context already attached."
        cta={{ label: "Book a demo" }}
        sections={[
          { label: "Overview" },
          { label: "How it works" },
          { label: "Channels" },
          { label: "Security" },
          { label: "Pricing" },
          { label: "Changelog" },
        ]}
        linkGroups={[
          {
            title: "Product",
            links: [{ label: "Inbox" }, { label: "Autopilot" }, { label: "Analytics" }, { label: "API" }],
          },
          {
            title: "Company",
            links: [{ label: "About" }, { label: "Careers" }, { label: "Press" }, { label: "Contact" }],
          },
        ]}
        statusLabels={["Online", "On hold"]}
        statusCaption="Autopilot"
        count={3480221}
        countLabel="Replies sent"
        rate={0.9}
        blurb="Plug in Zendesk, Intercom or plain email. Pilot drafts every reply from your own docs, cites its sources, and never sends what it can't stand behind."
        background="#eee8da"
        ink="#1d1c1a"
        muted="#6e685d"
        accent="#3355e8"
        accentDeep="#2742c2"
        accentInk="#f3eee2"
      />
    </div>
  )
}
