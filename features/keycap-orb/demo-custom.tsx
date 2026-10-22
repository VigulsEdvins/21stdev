"use client"

import KeycapOrb, { type Keycap } from "@/components/ui/keycap-orb"

// A warmer set: ember floor, cream and terracotta caps, design-tool legends.
const keys: Keycap[] = [
  { label: "Aa", finish: "lime", hotkey: "a" },
  { icon: "pen", finish: "ash" },
  { icon: "frame", finish: "ink" },
  { icon: "layers", finish: "ash" },
  { icon: "cursor", finish: "glass" },
  { icon: "star", finish: "cobalt" },
  { label: "Fx", finish: "ink", hotkey: "f" },
  { icon: "heart", finish: "glass" },
  { label: "⌘", finish: "ash" },
  { icon: "search", finish: "ink" },
  { label: "UI", finish: "cobalt", hotkey: "u" },
  { icon: "check", finish: "ash" },
  { icon: "none", finish: "ink" },
  { icon: "arrow", finish: "ash" },
  { icon: "cube", finish: "glass" },
  { label: "Px", finish: "ink", hotkey: "p" },
]

export default function DemoCustom() {
  return (
    <KeycapOrb
      keys={keys}
      rings={11}
      background="#070302"
      glow="#ff5a1f"
      speed={-0.7}
      palette={{
        ink: { cap: "#201a17", legend: "#f1e4d3" },
        ash: { cap: "#e7dccb", legend: "#5a2a14" },
        cobalt: { cap: "#c4552b", legend: "#6e2208" },
        lime: { cap: "#f2b33d", legend: "#3b2205" },
        glass: { cap: "#ffd0b0", legend: "#ff6a2a" },
      }}
    />
  )
}
