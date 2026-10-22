"use client"

import ClothPeelReveal from "@/components/ui/cloth-peel-reveal"

export default function Demo() {
  return (
    <ClothPeelReveal loop sheetText={"Make\nSomething"} sheetColor="#f4f2ee" textColor="#111111">
      <div className="flex h-full w-full flex-col justify-between bg-[#0b0b0c] px-[5vw] py-[5vh] text-white">
        <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-neutral-500">
          Works 01 / 30
        </div>
        <div>
          <h2 className="text-[clamp(2.5rem,8vw,7rem)] font-black uppercase leading-[0.88] tracking-tight">
            Signal
            <br />
            Garden
          </h2>
          <p className="mt-6 max-w-sm font-mono text-xs uppercase leading-relaxed tracking-[0.15em] text-neutral-400">
            Interactive installation — the sheet is a mesh, the folds are lit per vertex
          </p>
        </div>
        <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-neutral-600">
          Scroll
        </div>
      </div>
    </ClothPeelReveal>
  )
}
