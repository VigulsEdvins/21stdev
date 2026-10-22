"use client"

import ExplodedAssemblyScroll from "@/components/ui/exploded-assembly-scroll"

// Same drawing, night shift: a graphite sheet, a signal-orange panel, and copy
// for a skid fabricator rather than a design consultancy.
export default function DemoGraphite() {
  return (
    <div className="w-full">
      <ExplodedAssemblyScroll
        brand="Ironline"
        nav={[{ label: "Work" }, { label: "Shop", active: true }, { label: "Contact" }]}
        breadcrumb={["Shop", "Modular skids"]}
        title="Packaged Pump Skids"
        intro="Designed, fabricated and hydro-tested under one roof. Every skid leaves the shop wired, piped and ready to bolt down."
        features={[
          { title: "3D Model First", body: "Every weld, bolt and nozzle is modelled before steel is cut, so the field never finds a clash." },
          { title: "Factory Acceptance", body: "Hydrotest, run test and loop check happen in our bay, witnessed, before anything is loaded." },
          { title: "One Lift, One Day", body: "Skids ship as a single lift with rigging drawings, so installation is measured in hours." },
        ]}
        steps={[
          { title: "Frame & Fabrication", caption: "Base frame", detail: "Rails and cross members jig-welded square to 2 mm." },
          { title: "Machinery Set", caption: "Pump train", detail: "Motor and pump laser-aligned on machined pedestals." },
          { title: "Vessel Install", caption: "Knock-out drum", detail: "Stamped vessel set on its base ring and plumbed true." },
          { title: "Pipe, Wire, Test", caption: "Piping & controls", detail: "Spools, valves and the local panel — then the hydrotest." },
        ]}
        tagline="Built in the bay. Proven before it ships."
        statement="Every skid is hydro-tested and FAT-witnessed before it leaves"
        company="Ironline Fabrication"
        year="2026"
        surface="#1b1816"
        ink="#efe4d6"
        accent="#f06a28"
        panelInk="#1a0e07"
      />
    </div>
  )
}
