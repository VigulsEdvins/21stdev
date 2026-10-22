"use client"

import SingularityHorizon, {
  DEFAULT_SINGULARITY_STATES,
} from "@/components/ui/singularity-horizon"

/**
 * Boxed instead of full-bleed: one held state, no HUD, fewer streaks. This is
 * the shape you want inside a card, a modal backdrop or a section header.
 */
export default function BoxedDemo() {
  return (
    <div className="flex min-h-[560px] w-full items-center justify-center bg-background p-8">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-border">
        <SingularityHorizon
          height="420px"
          hud={false}
          particles={2600}
          states={[
            {
              ...DEFAULT_SINGULARITY_STATES[0],
              spin: 0.14,
              camDistance: 58,
              camHeight: 17,
            },
          ]}
        />
      </div>
    </div>
  )
}
