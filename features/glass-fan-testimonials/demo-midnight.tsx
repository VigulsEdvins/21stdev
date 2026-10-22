import GlassFanTestimonials from "@/components/ui/glass-fan-testimonials"

const U = "https://images.unsplash.com/"
const Q = "?auto=format&fit=crop&crop=faces&w=160&h=160&q=80"

export default function GlassFanTestimonialsMidnightDemo() {
  return (
    <div className="w-full">
      <GlassFanTestimonials
        theme="dark"
        backdrop="grid"
        visible={4}
        tilt={14}
        cardSize={310}
        eyebrow="Wall of love"
        heading="Teams that deploy on Fridays"
        summary={{ rating: 4.8, label: "average on G2, 340 reviews" }}
        palette={{ accent: "#a3e635" }}
        testimonials={[
          {
            quote:
              "We moved forty services onto it over a long weekend. Preview environments alone killed half our Slack threads about staging.",
            name: "Aiko Tanaka",
            role: "Platform Lead, Mosaic",
            photo: U + "photo-1534528741775-53994a69daeb" + Q,
            rating: 5,
          },
          {
            quote:
              "Rollbacks used to be a war room. Now it is one click and a coffee. Our change-failure rate is the lowest it has been in three years.",
            name: "Ben Carver",
            role: "SRE Manager, Quillstack",
            photo: U + "photo-1506794778202-cad84cf45f1d" + Q,
            rating: 5,
          },
          {
            quote: "The docs read like someone actually ran the commands. Onboarding a new engineer takes an afternoon.",
            name: "Lena Vogel",
            role: "Staff Engineer, Parcelry",
            photo: U + "photo-1517841905240-472988babdf9" + Q,
            rating: 4.5,
          },
          {
            quote:
              "Build times dropped from eleven minutes to under two. I did not believe the graph until I watched the pipeline myself.",
            name: "Jonah Reyes",
            role: "CTO, Brightloop",
            photo: U + "photo-1539571696357-5a69c17a67c6" + Q,
            rating: 5,
          },
          {
            quote: "Support answered a 2 a.m. incident in four minutes, with a fix, not a ticket number.",
            name: "Sofia Marín",
            role: "Head of Infrastructure, Kitebase",
            photo: U + "photo-1580489944761-15a19d654956" + Q,
            rating: 5,
          },
          {
            quote: "Our infra bill went down 31% the first month, mostly from idle previews it shuts off on its own.",
            name: "Oskar Lund",
            role: "Engineering Manager, Fjord Labs",
            rating: 4.5,
          },
        ]}
      />
    </div>
  )
}
