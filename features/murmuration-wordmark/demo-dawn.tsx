"use client"

import MurmurationWordmark from "@/components/ui/murmuration-wordmark"

// A pale dawn sky, your own word, and a headline laid over the flock.
export default function DemoDawn() {
  return (
    <div className="w-full">
      <MurmurationWordmark preset="dawn" word="north" birds={5200}>
        <div style={{ position: "absolute", left: 32, top: 28, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11, letterSpacing: ".22em", textTransform: "uppercase", color: "#1f2329" }}>
          North Studio — Field notes
        </div>
      </MurmurationWordmark>
    </div>
  )
}
