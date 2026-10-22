"use client"

import ComebackPoster from "@/components/ui/comeback-poster"

// Your own poster: a new word, your own themes and dates, a marigold field
// under a navy masthead, and a different hill (seed).
export default function Demo() {
  return (
    <div className="w-full">
      <ComebackPoster
        title="Homecoming"
        keywords={["Studio", "Letters", "Prints", "Motion", "Type", "Colour", "Friends", "Garden", "Archive", "Night", "Bloom", "Again"]}
        from="01.10.26"
        to="31.10.26"
        edition="Vol. 02 / Autumn"
        topNote="A month of making things in the open again. New prints every Friday, the archive reopened, and the garden finally in flower."
        footNote="Homecoming is a season, not a day. Come for the prints, stay for the field."
        palette={{
          paper: "#efe7d8",
          ink: "#1f2a44",
          poppy: "#e89a1c",
          field: "#2f3a26",
          haze: "#c2b9a6",
          robe: "#ece6da",
        }}
        poppies={260}
        seed={21}
      />
    </div>
  )
}
