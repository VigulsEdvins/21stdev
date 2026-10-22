"use client"

import * as React from "react"
import PaperCurlCarousel, { type PaperCurlItem } from "@/components/ui/paper-curl-carousel"

// Five harbour screenprints, designed in Paper and painted here at runtime, so
// the demo ships no image files and makes no network requests.
const W = 1440
const H = 836
// Painted onto a 4:3 sheet with the sky and sea carried past the design. A
// wide 1440x836 print cover-cropped into a 4:3 stage lost ~9% off each side,
// which cut the plate numeral in half; with the slack above and below, a 4:3
// stage shows the whole design and a wide one only trims the extra sky and sea.
const SHEET_H = 1080
const INSET = (SHEET_H - H) / 2
const NAVY = "#13203A"
const FOG = "#D8DCDB"
const SLATE = "#5B6878"
const LAMP = "#F5EFD8"
const SIGNAL = "#E4572E"
const STOCK = "#EDEEE9"

type Ctx = CanvasRenderingContext2D

const rect = (c: Ctx, x: number, y: number, w: number, h: number, fill: string, alpha = 1) => {
  c.globalAlpha = alpha
  c.fillStyle = fill
  c.fillRect(x, y, w, h)
  c.globalAlpha = 1
}
const shape = (c: Ctx, d: string, fill: string, alpha = 1) => {
  c.globalAlpha = alpha
  c.fillStyle = fill
  c.fill(new Path2D(d))
  c.globalAlpha = 1
}
const disc = (c: Ctx, x: number, y: number, r: number, fill: string) => {
  c.fillStyle = fill
  c.beginPath()
  c.arc(x, y, r, 0, Math.PI * 2)
  c.fill()
}

// The plate mark every print shares: a heavy numeral over a light italic label.
function plate(c: Ctx, numeral: string, ink: string) {
  const spaced = c as Ctx & { letterSpacing?: string }
  c.fillStyle = ink
  // Baselines, not "middle": CSS centres a font's content area in its line
  // box while canvas centres the em box, and for Arial Black the two differ by
  // ~27px. These are the baselines of the Paper layout.
  c.textBaseline = "alphabetic"
  c.font = '900 168px "Arial Black", "Helvetica Neue", Arial, sans-serif'
  spaced.letterSpacing = "-6.72px"
  c.fillText(numeral, 72, 197)
  spaced.letterSpacing = "0px"
  c.font = 'italic 400 20px Georgia, "Times New Roman", serif'
  c.fillText("Harbour Series", 80, 233)
}

const PRINTS: { item: Omit<PaperCurlItem, "src">; sky: string; sea: string; paint: (c: Ctx) => void }[] = [
  {
    item: { title: "Low Tide", caption: "Harbour Series, screenprint on cool stock", alt: "An orange sun setting into a navy sea" },
    sky: FOG,
    sea: NAVY,
    paint: (c) => {
      rect(c, 0, 0, W, H, FOG)
      disc(c, 980, 518, 150, SIGNAL)
      rect(c, 0, 518, W, 318, NAVY)
      const tide: [number, number, number][] = [[14, 1, 0.55], [34, 1, 0.6], [62, 2, 0.65], [102, 2, 0.7], [160, 3, 0.75], [240, 4, 0.8]]
      for (const [y, h, a] of tide) rect(c, 0, 518 + y, W, h, FOG, a)
      const glint: [number, number, number, number][] = [[850, 20, 260, 8], [878, 44, 204, 9], [912, 76, 136, 11], [940, 120, 80, 13], [962, 184, 36, 15]]
      for (const [x, y, w, h] of glint) rect(c, x, 518 + y, w, h, SIGNAL)
      plate(c, "01", NAVY)
    },
  },
  {
    item: { title: "Harbour Light", caption: "The last lamp before the breakwater", alt: "A lighthouse throwing a pale beam across a dusk sky" },
    sky: SLATE,
    sea: NAVY,
    paint: (c) => {
      rect(c, 0, 0, W, H, SLATE)
      shape(c, "M404 318 L1440 150 L1440 470 Z", LAMP, 0.9)
      rect(c, 0, 600, W, 236, NAVY)
      shape(c, "M0 600 C 150 548, 420 540, 620 600 Z", NAVY)
      shape(c, "M372 560 L388 330 L420 330 L436 560 Z", NAVY)
      rect(c, 384, 300, 40, 30, LAMP)
      shape(c, "M376 300 L404 272 L432 300 Z", NAVY)
      rect(c, 386, 404, 36, 22, SIGNAL)
      const beam: [number, number, number, number, number][] = [[760, 22, 680, 3, 0.7], [900, 50, 540, 4, 0.55], [1060, 92, 380, 5, 0.4], [1220, 152, 220, 6, 0.28]]
      for (const [x, y, w, h, a] of beam) rect(c, x, 600 + y, w, h, LAMP, a)
      plate(c, "02", LAMP)
    },
  },
  {
    item: { title: "Fog Bank", caption: "North cardinal, bearing 040°", alt: "A lone orange buoy on a flat, fog-grey sea" },
    sky: "#E6E8E6",
    sea: "#B6BEC1",
    paint: (c) => {
      rect(c, 0, 0, W, H, FOG)
      rect(c, 0, 0, W, 170, "#E6E8E6")
      rect(c, 0, 170, W, 150, "#E0E3E2")
      rect(c, 0, 560, W, 276, "#C3CACC")
      rect(c, 0, 640, W, 196, "#B6BEC1")
      rect(c, 0, 558, W, 2, NAVY)
      rect(c, 1031, 478, 2, 44, NAVY)
      shape(c, "M1032 440 L1046 462 L1018 462 Z", NAVY)
      shape(c, "M1032 462 L1046 484 L1018 484 Z", NAVY)
      shape(c, "M1014 522 L1050 522 L1058 562 L1006 562 Z", SIGNAL)
      rect(c, 1008, 540, 48, 6, NAVY)
      rect(c, 996, 570, 72, 3, NAVY, 0.3)
      plate(c, "03", NAVY)
    },
  },
  {
    item: { title: "Night Crossing", caption: "The 23:10 to the islands", alt: "A ferry with lit windows crossing under a full moon" },
    sky: NAVY,
    sea: "#0B1426",
    paint: (c) => {
      rect(c, 0, 0, W, H, NAVY)
      disc(c, 1090, 200, 72, LAMP)
      rect(c, 0, 540, W, 296, "#0B1426")
      const moon: [number, number, number, number, number][] = [[1030, 562, 120, 4, 0.7], [1050, 590, 80, 5, 0.5], [1068, 630, 44, 6, 0.35], [1082, 690, 16, 7, 0.22]]
      for (const [x, y, w, h, a] of moon) rect(c, x, y, w, h, LAMP, a)
      shape(c, "M300 500 L900 500 L862 542 L322 542 Z", "#050A14")
      rect(c, 430, 460, 330, 40, "#050A14")
      rect(c, 640, 410, 34, 50, "#050A14")
      rect(c, 640, 420, 34, 12, SIGNAL)
      for (let i = 0; i < 14; i++) rect(c, 452 + i * 22, 476, 10, 8, LAMP)
      plate(c, "04", LAMP)
    },
  },
  {
    item: { title: "Signal Flags", caption: "Dressed overall for the regatta", alt: "A line of signal flags strung diagonally above the sea" },
    sky: STOCK,
    sea: NAVY,
    paint: (c) => {
      rect(c, 0, 0, W, H, STOCK)
      rect(c, 0, 690, W, 146, NAVY)
      c.strokeStyle = NAVY
      c.lineWidth = 2
      c.beginPath()
      c.moveTo(380, 150)
      c.lineTo(1440, 520)
      c.stroke()
      // Each flag hangs with its hoist along the halyard, so it is drawn in the
      // line's own frame.
      const flag = (x: number, y: number, draw: () => void) => {
        c.save()
        c.translate(x, y)
        c.rotate((19.24 * Math.PI) / 180)
        draw()
        c.restore()
      }
      flag(486, 187, () => {
        rect(c, 0, 0, 64, 64, NAVY)
        rect(c, 20, 20, 24, 24, STOCK)
      })
      flag(677, 254, () => {
        rect(c, 0, 0, 32, 64, SLATE)
        rect(c, 32, 0, 32, 64, NAVY)
      })
      flag(868, 320, () => {
        rect(c, 0, 0, 64, 64, SIGNAL)
        rect(c, 24, 0, 16, 64, STOCK)
      })
      flag(1058, 387, () => {
        rect(c, 0, 0, 64, 64, STOCK)
        rect(c, 0, 0, 32, 32, SLATE)
        rect(c, 32, 32, 32, 32, SLATE)
        c.strokeStyle = SLATE
        c.strokeRect(1, 1, 62, 62)
      })
      flag(1249, 453, () => shape(c, "M0 0 L64 0 L32 76 Z", NAVY))
      plate(c, "05", NAVY)
    },
  },
]

function paintPrints(): PaperCurlItem[] {
  const canvas = document.createElement("canvas")
  // Painted at 2x so the prints stay crisp on a high-density screen.
  canvas.width = W * 2
  canvas.height = SHEET_H * 2
  const c = canvas.getContext("2d")
  if (!c) return []
  return PRINTS.map(({ item, sky, sea, paint }) => {
    c.setTransform(2, 0, 0, 2, 0, 0)
    rect(c, 0, 0, W, INSET + 1, sky)
    rect(c, 0, INSET + H - 1, W, INSET + 1, sea)
    c.translate(0, INSET)
    paint(c)
    return { ...item, src: canvas.toDataURL("image/png") }
  })
}

export default function Demo() {
  const [items, setItems] = React.useState<PaperCurlItem[]>([])
  React.useEffect(() => setItems(paintPrints()), [])
  return <PaperCurlCarousel items={items} autoplay={3000} />
}
