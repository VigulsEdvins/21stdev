import WireboundInquiry from "@/components/ui/wirebound-inquiry"

export default function WireboundInquiryInkDemo() {
  return (
    <WireboundInquiry
      preset="ink"
      studio="Oddfellow Audio"
      coverTitle={["ODDFELLOW", "AUDIO"]}
      kicker="Sound for film and games"
      headline="Tell us what it should sound like."
      intro="Three questions and your details. Ruth or Sam listens to every reference you send and replies with a plan, a schedule and a quote."
      email="studio@oddfellow.audio"
      socials={[
        { label: "SoundCloud", href: "https://soundcloud.com" },
        { label: "Instagram", href: "https://instagram.com" },
      ]}
      availability="Two mix stages free from March"
      notes={[
        {
          quote: "We sent a rough cut and three reference tracks. The plan that came back already knew which scenes needed silence.",
          name: "Mateo Ilunga",
          role: "Director, Low Tide (2026)",
        },
      ]}
      reader="Ruth Okafor"
      replyTime="one working day"
      questions={[
        {
          id: "work",
          tab: "Work",
          title: "What needs sound?",
          hint: "Circle all that apply.",
          options: ["Feature film", "Series", "Game", "Commercial", "Podcast", "Installation"],
          multiple: true,
        },
        {
          id: "scope",
          tab: "Scope",
          title: "Which parts?",
          hint: "Circle all that apply.",
          options: ["Sound design", "Original score", "Dialogue edit", "Final mix", "Foley"],
          multiple: true,
        },
        {
          id: "length",
          tab: "Length",
          title: "How long is the finished piece?",
          options: ["Under a minute", "Up to 30 min", "Feature length", "Ongoing"],
        },
      ]}
      detailsTitle="Who should we call back?"
      messagePlaceholder="A link to the cut, a temp track, a reference"
      submitLabel="Send it over"
      onSubmit={async (brief) => {
        await new Promise((r) => setTimeout(r, 1100))
        if (brief.email.endsWith("@example.com")) throw new Error("That address bounces. Try another one.")
        return "OA-" + String(Date.now()).slice(-4)
      }}
    />
  )
}
