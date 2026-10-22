import OdometerStageStats from "@/components/ui/odometer-stage-stats"

export default function OdometerStageStatsDemo() {
  return (
    <div className="w-full">
      <OdometerStageStats cta={{ label: "Start a project", href: "#contact" }} />
    </div>
  )
}
