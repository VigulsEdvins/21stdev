"use client"

import InkOrbitTestimonials from "@/components/ui/ink-orbit-testimonials"

// A support-desk product's customers, light theme, a slower marquee.
export default function DemoCustom() {
  return (
    <div className="w-full">
      <InkOrbitTestimonials
        theme="light"
        tag="Customers"
        title={"Support teams *sleep*\nbetter."}
        testimonials={[
          { quote: "First-response time dropped from four hours to nine minutes.", name: "Hana O.", role: "Support Lead" },
          { quote: "The weekly report writes itself. I just forward it.", name: "Tomás G.", role: "Head of CX" },
          { quote: "Routing finally understands what a ticket is about.", name: "Ife A.", role: "Ops Manager", rating: 4 },
          { quote: "We covered a launch week without hiring temps.", name: "Jun P.", role: "COO" },
        ]}
        logos={["Brightdesk", "Kinfolk", "Meridian", "Parcel", "Tandem"]}
        marqueeSpeed={48}
      />
    </div>
  )
}
