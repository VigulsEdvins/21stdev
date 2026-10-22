"use client"

import SilhouetteWrap from "@/components/ui/silhouette-wrap"

/**
 * The same engine with the page held still: a fixed bottle, no drop cap, and
 * the label painted inside the outline instead of the default fill — the
 * silhouette as a piece of art direction rather than a moving part.
 */
export default function BottleDemo() {
  return (
    <div className="min-h-screen w-full bg-background px-6 py-20 text-foreground">
      <div className="mx-auto w-full max-w-xl font-serif text-[17px] leading-[1.9]">
        <SilhouetteWrap
          silhouette="bottle"
          follow="fixed"
          size={150}
          origin={{ x: 0.62, y: 0.46 }}
          gutter={22}
          dropCap={0}
          justify={false}
          text="There was nothing so very remarkable in that, nor did Alice think it so very much out of the way to find a little bottle on it — which certainly was not here before — and round the neck of the bottle a paper label with the words DRINK ME beautifully printed on it in large letters. It was all very well to say drink me, but the wise little Alice was not going to do that in a hurry."
        >
          <svg viewBox="0 0 100 150" width="100%" height="100%" className="block">
            <path
              d="M42 4 h16 v24 q0 7 6 13 q14 14 14 35 v56 q0 14 -14 14 h-28 q-14 0 -14 -14 v-56 q0 -21 14 -35 q6 -6 6 -13 z"
              className="fill-muted stroke-foreground"
              strokeWidth={2.5}
            />
            <rect x="19" y="84" width="62" height="28" rx="2" className="fill-background stroke-foreground" strokeWidth={1.5} />
            <text
              x="50"
              y="102"
              textAnchor="middle"
              className="fill-foreground"
              style={{ font: "600 9px ui-monospace, SFMono-Regular, Menlo, monospace", letterSpacing: "0.12em" }}
            >
              DRINK ME
            </text>
          </svg>
        </SilhouetteWrap>
      </div>
    </div>
  )
}
