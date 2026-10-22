import CheckerQuiltTestimonials from "@/components/ui/checker-quilt-testimonials"

const U = "https://images.unsplash.com/"
const Q = "?auto=format&fit=crop&w=1200&q=80"

export default function CheckerQuiltWineBarDemo() {
  return (
    <div className="w-full">
      <CheckerQuiltTestimonials
        preset="oxblood"
        heading="Regulars, unprompted."
        cta={{ label: "Book a table", href: "#book" }}
        autoplay={7000}
        testimonials={[
          {
            quote: "We came for one glass and stayed for the whole tasting flight. Ask for the orange wine, then ask the staff why it tastes like apricots.",
            name: "Priya Nair",
            context: "Thursday regular since 2023",
            photo: U + "photo-1494790108377-be9c29b29330" + Q,
            focus: "50% 28%",
          },
          {
            quote: "The only bar on the street where the music is low enough to hear a proposal. She said yes.",
            name: "Daniel Osei",
            context: "Booked the corner table",
            photo: U + "photo-1507003211169-0a1dd7228f2d" + Q,
          },
          {
            quote: "Small plates that are actually filling, and a list that changes every fortnight. I have not drunk the same bottle twice.",
            name: "Ellie Marsh",
            context: "Member of the wine club",
            photo: U + "photo-1438761681033-6461ffad8d80" + Q,
          },
          {
            quote: "Forty years of drinking claret and they still found me something new. Patient, funny, never snobbish.",
            name: "Graham Whitlock",
            context: "Retired, comes in on Sundays",
            photo: U + "photo-1472099645785-5658abf4ff4e" + Q,
          },
        ]}
      />
    </div>
  )
}
