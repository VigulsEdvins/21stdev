import React from "react"
import FrostedGlassMenu from "@/components/ui/frosted-glass-menu"

/** Smoked glass at night: recoloured, two columns, no footer, closed on load. */
export default function FrostedGlassMenuStrictDemo() {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100svh",
        minHeight: 640,
        overflow: "hidden",
        background:
          "radial-gradient(60% 50% at 30% 70%, #3b2a6b 0%, transparent 70%), radial-gradient(50% 45% at 75% 35%, #0f5b5b 0%, transparent 70%), #0b0b10",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "50%",
          top: "58%",
          width: 280,
          height: 280,
          marginLeft: -140,
          marginTop: -140,
          borderRadius: "50%",
          background: "conic-gradient(from 210deg, #f7c56b, #f06a8a, #7c6cf0, #f7c56b)",
        }}
      />
      <div style={{ position: "relative", paddingTop: 8 }}>
        <FrostedGlassMenu
          ink="#f3f1ec"
          glass="rgba(24, 24, 30, 0.55)"
          muted="rgba(243, 241, 236, 0.5)"
          rule="rgba(243, 241, 236, 0.16)"
          blur={36}
          maxWidth={760}
          footer={null}
          cta={{ label: "Book a table", href: "#book" }}
          columns={[
            {
              title: "Night",
              links: [
                { label: "Tonight", href: "#tonight" },
                { label: "Menu", href: "#menu" },
                { label: "Cellar", href: "#cellar" },
              ],
            },
            {
              title: "Find us",
              links: [
                { label: "Map", href: "#map" },
                { label: "Instagram", href: "#instagram" },
              ],
            },
          ]}
        />
      </div>
    </div>
  )
}
