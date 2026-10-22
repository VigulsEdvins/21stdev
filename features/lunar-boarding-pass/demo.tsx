"use client"

import LunarBoardingPass from "@/components/ui/lunar-boarding-pass"

// The same ticket, re-issued: a second stop on the Ocean of Storms, in navy
// and cream. The landing marker on the Moon moves with lat / lon.
export default function Demo() {
  return (
    <div className="flex min-h-[560px] w-full items-center justify-center bg-[#dcd6c8] px-4 py-16 sm:px-10 dark:bg-[#0c111a]">
      <LunarBoardingPass
        defaultSide="back"
        title="One more giant leap"
        tier="First"
        date="19 Nov '69"
        welcome={"Second\nstop"}
        eyebrow={"The 2nd station of\nthe space tour"}
        words={["Blue", "Note"]}
        notes={["蓝调爵士・宇宙巡演", "第二站—风暴洋基地"]}
        passenger="Alan Bean"
        craft="1969-099A"
        dateCode="19NOV69"
        gate="A7"
        group="B"
        seat="12C"
        boardingTime="UTC0654"
        site="Ocean of Storms"
        lat={-3.01239}
        lon={-23.42157}
        seq="SEQ 012 INTRPD  691119A12"
        featuring="Featuring the Intrepid quartet"
        headline="Blue Note"
        stamp="Landed"
        night="#0e1a2c"
        starInk="#f3e8cf"
        paper="#e6dcc4"
        paperInk="#1c2738"
        stampColor="#2b5ea6"
      />
    </div>
  )
}
