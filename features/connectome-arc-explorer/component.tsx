"use client"

import * as React from "react"

/**
 * Connectome Arc Explorer — a mirrored radial wiring diagram for one cell type.
 *
 * A column of cell types sits in the middle. Pick one and two arcs light up
 * around it: on the left, every region where that type *receives* synapses
 * (orange), on the right every region where it *sends* them (blue). The arcs
 * are the same regions in the same order, mirrored, so a region reads straight
 * across. Tiles are grouped into neuropils (and those into super-regions such
 * as the mushroom body), each tile's tint is its share of the busiest region on
 * that side, and bundled curves run out to the classes of upstream and
 * downstream neurons, sized by how much they talk to the selected type.
 *
 * Changing the selection tweens every tint, curve and node to the new type
 * instead of swapping them. Hover a tile, band or node to trace it (a region
 * lights up on both arcs at once), click to pin, Esc to let go.
 *
 * SVG + DOM, React only. The sample data is a hand-tuned sketch of the
 * Drosophila mushroom body; pass `data` for your own.
 */

// #region connectome
// Pure: data shapes, the sample connectome, arc geometry, aggregation. Lifted out and run by the test.

export type Side = "in" | "out"
export type Region = { id: string; label: string; name?: string }
export type RegionGroup = { id: string; label: string; name?: string; within?: string; regions: Region[] }
export type RegionSuper = { id: string; label: string; name?: string }
export type NeuronClass = { id: string; label: string; name?: string }
export type CellType = { id: string; label: string; hint?: string; name?: string }
export type CellTypeGroup = CellType & { children?: CellType[] }

/** Synapse counts for one cell type. Every map is keyed by region id. */
export type CellTypeProfile = {
  /** Neurons of this type. */
  count?: number
  /** Synapses the type receives, per region. */
  inputs?: Record<string, number>
  /** Synapses the type makes, per region. */
  outputs?: Record<string, number>
  /** Input neuron class id → region id → synapses onto this type there. */
  inputLinks?: Record<string, Record<string, number>>
  /** Output neuron class id → region id → synapses from this type there. */
  outputLinks?: Record<string, Record<string, number>>
  /** How many of the type's neurons reach each region. */
  innervation?: Record<string, number>
}

export type ConnectomeData = {
  cellTypes: CellTypeGroup[]
  regionGroups: RegionGroup[]
  supers?: RegionSuper[]
  inputNeurons: NeuronClass[]
  outputNeurons: NeuronClass[]
  /** Keyed by cell type id. A group without its own profile is the sum of its children. */
  profiles: Record<string, CellTypeProfile>
}

// ---- the stage: a fixed design canvas that is scaled as a whole -------------------
export const STAGE = { W: 1200, H: 800, CX: 600, CY: 400 }
export const RING = { superIn: 232, superOut: 250, groupIn: 254, groupOut: 280, tileIn: 284, tileOut: 346 }
/** Each arc spans ±SPAN degrees around the horizontal. */
export const SPAN = 62
export const COLUMN = { x: 522, y: 70, w: 156, h: 580 }
export const NODE_X = { in: 112, out: 1088 }

export type ArcRegion = Region & { group: number; u0: number; u1: number }
export type ArcSpan = { id: string; label: string; name?: string; u0: number; u1: number; regions: number[] }
export type ArcLayout = { regions: ArcRegion[]; groups: ArcSpan[]; supers: ArcSpan[] }

/**
 * Lays regions along the arc as u ∈ [0, 1], top to bottom. Each region is one
 * unit; groups are split by a small gap and super-regions by a larger one.
 */
export function layoutArc(groups: RegionGroup[], supers: RegionSuper[] = []): ArcLayout {
  const GROUP_GAP = 0.55
  const SUPER_GAP = 1.1
  const at: { g: number; start: number; end: number }[] = []
  let units = 0
  groups.forEach((g, gi) => {
    if (gi > 0) units += g.within && g.within === groups[gi - 1].within ? GROUP_GAP : SUPER_GAP
    const start = units
    units += Math.max(1, g.regions.length)
    at.push({ g: gi, start, end: units })
  })
  const total = Math.max(1, units)
  const regions: ArcRegion[] = []
  const spans: ArcSpan[] = []
  groups.forEach((g, gi) => {
    const { start, end } = at[gi]
    const idx: number[] = []
    g.regions.forEach((r, ri) => {
      idx.push(regions.length)
      regions.push({ ...r, group: gi, u0: (start + ri) / total, u1: (start + ri + 1) / total })
    })
    spans.push({ id: g.id, label: g.label, name: g.name, u0: start / total, u1: end / total, regions: idx })
  })
  const superSpans: ArcSpan[] = []
  for (const s of supers) {
    const inside = spans.filter((_, gi) => groups[gi].within === s.id)
    if (!inside.length) continue
    superSpans.push({
      id: s.id,
      label: s.label,
      name: s.name,
      u0: Math.min(...inside.map((g) => g.u0)),
      u1: Math.max(...inside.map((g) => g.u1)),
      regions: inside.flatMap((g) => g.regions),
    })
  }
  return { regions, groups: spans, supers: superSpans }
}

/** u → angle in radians. The input arc opens to the right, the output arc mirrors it. */
export const angleAt = (u: number, side: Side) =>
  ((side === "in" ? 180 + SPAN - u * 2 * SPAN : -SPAN + u * 2 * SPAN) * Math.PI) / 180

export const polar = (r: number, a: number): [number, number] => [STAGE.CX + r * Math.cos(a), STAGE.CY + r * Math.sin(a)]

const f2 = (n: number) => Math.round(n * 100) / 100
const pt = (p: [number, number]) => f2(p[0]) + " " + f2(p[1])

/** An annular sector with a constant pixel gap at both radii. */
export function sectorPath(r0: number, r1: number, a0: number, a1: number, pad = 0): string {
  const lo = Math.min(a0, a1)
  const hi = Math.max(a0, a1)
  const trim = (r: number) => {
    const p = pad / 2 / r
    return hi - lo > 2 * p ? [lo + p, hi - p] : [(lo + hi) / 2, (lo + hi) / 2]
  }
  const [b0, b1] = trim(r1)
  const [c0, c1] = trim(r0)
  const large = b1 - b0 > Math.PI ? 1 : 0
  return (
    "M" + pt(polar(r1, b0)) +
    "A" + r1 + " " + r1 + " 0 " + large + " 1 " + pt(polar(r1, b1)) +
    "L" + pt(polar(r0, c1)) +
    "A" + r0 + " " + r0 + " 0 " + large + " 0 " + pt(polar(r0, c0)) + "Z"
  )
}

/** An open arc along one radius, for guides. */
export function arcPath(r: number, a0: number, a1: number): string {
  const lo = Math.min(a0, a1)
  const hi = Math.max(a0, a1)
  return "M" + pt(polar(r, lo)) + "A" + r + " " + r + " 0 " + (hi - lo > Math.PI ? 1 : 0) + " 1 " + pt(polar(r, hi))
}

/**
 * A bundled curve from a neuron node to the outer edge of a tile. Every curve
 * leaves its node horizontally (so a node's curves travel together) and lands
 * square to the arc.
 */
export function linkPath(nx: number, ny: number, a: number, r = RING.tileOut + 3, reach = 64): string {
  const [ex, ey] = polar(r, a)
  return (
    "M" + f2(nx) + " " + f2(ny) +
    "C" + f2(nx + (ex - nx) * 0.5) + " " + f2(ny) + " " +
    f2(ex + Math.cos(a) * reach) + " " + f2(ey + Math.sin(a) * reach) + " " +
    f2(ex) + " " + f2(ey)
  )
}

/** Rotation (deg) for a tile label that runs along the radius and still reads left to right. */
export const radialLabelRotation = (a: number, side: Side) => (a * 180) / Math.PI - (side === "in" ? 180 : 0)
/** Rotation (deg) for a band label that runs along the arc: bottom-up on the left, top-down on the right. */
export const tangentLabelRotation = (a: number, side: Side) => (a * 180) / Math.PI + (side === "in" ? -270 : 90)

/** Node centres for one side, centred on the arcs' axis. */
export function nodeYs(n: number): number[] {
  const step = Math.min(118, 470 / Math.max(1, n - 1))
  return Array.from({ length: n }, (_, i) => STAGE.CY + (i - (n - 1) / 2) * step)
}

// ---- profiles: resolve a selection to one flat array that can be tweened ---------------
export type Offsets = { R: number; NI: number; NO: number; inp: number; out: number; inLinks: number; outLinks: number; inn: number; length: number }

export function offsets(R: number, NI: number, NO: number): Offsets {
  const inp = 1
  const out = inp + R
  const inLinks = out + R
  const outLinks = inLinks + NI * R
  const inn = outLinks + NO * R
  return { R, NI, NO, inp, out, inLinks, outLinks, inn, length: inn + R }
}

export function findCellType(groups: CellTypeGroup[], id: string): { type: CellTypeGroup; parent: CellTypeGroup | null } | null {
  for (const g of groups) {
    if (g.id === id) return { type: g, parent: null }
    for (const c of g.children ?? []) if (c.id === id) return { type: c, parent: g }
  }
  return null
}

const addInto = (into: Record<string, number>, from: Record<string, number> | undefined) => {
  for (const k in from ?? {}) {
    const v = Number(from![k])
    if (Number.isFinite(v) && v > 0) into[k] = (into[k] ?? 0) + v
  }
}

/** Sums profiles. Innervation is a count of neurons, so it can never pass the summed count. */
export function sumProfiles(list: CellTypeProfile[]): CellTypeProfile {
  const out: Required<CellTypeProfile> = { count: 0, inputs: {}, outputs: {}, inputLinks: {}, outputLinks: {}, innervation: {} }
  for (const p of list) {
    out.count += Math.max(0, Number(p.count) || 0)
    addInto(out.inputs, p.inputs)
    addInto(out.outputs, p.outputs)
    addInto(out.innervation, p.innervation)
    for (const n in p.inputLinks ?? {}) addInto((out.inputLinks[n] ??= {}), p.inputLinks![n])
    for (const n in p.outputLinks ?? {}) addInto((out.outputLinks[n] ??= {}), p.outputLinks![n])
  }
  for (const k in out.innervation) out.innervation[k] = Math.min(out.innervation[k], out.count || out.innervation[k])
  return out
}

/** A cell type's own profile, else (for a group) the sum of its children's. */
export function resolveProfile(data: Pick<ConnectomeData, "cellTypes" | "profiles">, id: string): CellTypeProfile {
  const own = data.profiles[id]
  if (own) return own
  const hit = findCellType(data.cellTypes, id)
  const kids = hit?.type && "children" in hit.type ? (hit.type as CellTypeGroup).children ?? [] : []
  return sumProfiles(kids.map((k) => data.profiles[k.id]).filter(Boolean) as CellTypeProfile[])
}

export function packProfile(p: CellTypeProfile, regionIds: string[], inIds: string[], outIds: string[]): Float64Array {
  const o = offsets(regionIds.length, inIds.length, outIds.length)
  const a = new Float64Array(o.length)
  const num = (v: unknown) => {
    const n = Number(v)
    return Number.isFinite(n) && n > 0 ? n : 0
  }
  a[0] = num(p.count)
  regionIds.forEach((r, i) => {
    a[o.inp + i] = num(p.inputs?.[r])
    a[o.out + i] = num(p.outputs?.[r])
    a[o.inn + i] = num(p.innervation?.[r])
    inIds.forEach((n, j) => (a[o.inLinks + j * o.R + i] = num(p.inputLinks?.[n]?.[r])))
    outIds.forEach((n, j) => (a[o.outLinks + j * o.R + i] = num(p.outputLinks?.[n]?.[r])))
  })
  return a
}

/** Rows the column shows, in order — what the arrow keys walk. */
export function visibleRows(groups: CellTypeGroup[], expanded: ReadonlySet<string>): string[] {
  const rows: string[] = []
  for (const g of groups) {
    rows.push(g.id)
    if (expanded.has(g.id)) for (const c of g.children ?? []) rows.push(c.id)
  }
  return rows
}

/** Tile tint: 0 for nothing, then a floor so a single synapse still shows, eased toward the max. */
export const tint = (v: number, max: number) => (v > 0 && max > 0 ? 0.1 + 0.9 * Math.pow(Math.min(1, v / max), 0.62) : 0)
export const linkWidth = (v: number, max: number) => (max > 0 ? 0.5 + 8.5 * Math.sqrt(Math.min(1, v / max)) : 0)
export const nodeRadius = (v: number, max: number) => (v > 0 && max > 0 ? 6 + 24 * Math.sqrt(Math.min(1, v / max)) : 4)

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

export const lerpArrays = (a: Float64Array, b: Float64Array, t: number) => {
  const out = new Float64Array(b.length)
  for (let i = 0; i < b.length; i++) out[i] = (a[i] ?? 0) + (b[i] - (a[i] ?? 0)) * t
  return out
}

// ---- the sample: a sketch of the fly mushroom body ---------------------------------------
// Counts and compartments follow the published anatomy (Aso et al. 2014, the
// hemibrain); the synapse numbers are invented to have the right shape.

export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const lobe = (key: string, glyph: string, name: string, n: number): Region[] =>
  Array.from({ length: n }, (_, i) => ({ id: key + (i + 1), label: glyph + (i + 1), name: name + ", compartment " + (i + 1) }))

export const SAMPLE_REGION_GROUPS: RegionGroup[] = [
  {
    id: "CAL", label: "CA", name: "Calyx & pedunculus", within: "MB", regions: [
      { id: "CA", label: "CA", name: "Calyx" },
      { id: "dACA", label: "dACA", name: "Dorsal accessory calyx" },
      { id: "lACA", label: "lACA", name: "Lateral accessory calyx" },
      { id: "vACA", label: "vACA", name: "Ventral accessory calyx" },
      { id: "PED", label: "PED", name: "Pedunculus" },
    ],
  },
  { id: "aL", label: "αL", name: "α lobe", within: "MB", regions: lobe("a", "α", "α lobe", 3) },
  { id: "apL", label: "α′L", name: "α′ lobe", within: "MB", regions: lobe("ap", "α′", "α′ lobe", 3) },
  { id: "bpL", label: "β′L", name: "β′ lobe", within: "MB", regions: lobe("bp", "β′", "β′ lobe", 2) },
  { id: "bL", label: "βL", name: "β lobe", within: "MB", regions: lobe("b", "β", "β lobe", 2) },
  { id: "gL", label: "γL", name: "γ lobe", within: "MB", regions: lobe("g", "γ", "γ lobe", 5) },
  {
    id: "SNP", label: "SNP", name: "Superior neuropils", regions: [
      { id: "SLP", label: "SLP", name: "Superior lateral protocerebrum" },
      { id: "SIP", label: "SIP", name: "Superior intermediate protocerebrum" },
      { id: "SMP", label: "SMP", name: "Superior medial protocerebrum" },
    ],
  },
  {
    id: "INP", label: "INP", name: "Inferior neuropils", regions: [
      { id: "CRE", label: "CRE", name: "Crepine" },
      { id: "SCL", label: "SCL", name: "Superior clamp" },
      { id: "ICL", label: "ICL", name: "Inferior clamp" },
      { id: "IB", label: "IB", name: "Inferior bridge" },
    ],
  },
  {
    id: "LX", label: "LX", name: "Lateral complex", regions: [
      { id: "LAL", label: "LAL", name: "Lateral accessory lobe" },
      { id: "BU", label: "BU", name: "Bulb" },
    ],
  },
  { id: "LHG", label: "LH", name: "Lateral horn", regions: [{ id: "LH", label: "LH", name: "Lateral horn" }] },
  {
    id: "VLNP", label: "VLNP", name: "Ventrolateral neuropils", regions: [
      { id: "PLP", label: "PLP", name: "Posterior lateral protocerebrum" },
      { id: "AVLP", label: "AVLP", name: "Anterior ventrolateral protocerebrum" },
      { id: "PVLP", label: "PVLP", name: "Posterior ventrolateral protocerebrum" },
    ],
  },
  {
    id: "VMNP", label: "VMNP", name: "Ventromedial neuropils", regions: [
      { id: "VES", label: "VES", name: "Vest" },
      { id: "SPS", label: "SPS", name: "Superior posterior slope" },
      { id: "IPS", label: "IPS", name: "Inferior posterior slope" },
    ],
  },
  {
    id: "PENP", label: "PENP", name: "Periesophageal neuropils", regions: [
      { id: "SAD", label: "SAD", name: "Saddle" },
      { id: "CAN", label: "CAN", name: "Cantle" },
    ],
  },
]

export const SAMPLE_SUPERS: RegionSuper[] = [{ id: "MB", label: "MB", name: "Mushroom body" }]

export const SAMPLE_INPUT_NEURONS: NeuronClass[] = [
  { id: "olf", label: "Olfactory", name: "Olfactory projection neurons" },
  { id: "thermo", label: "Thermo/Hygro", name: "Thermo- and hygrosensory projection neurons" },
  { id: "vis", label: "Visual", name: "Visual projection neurons" },
  { id: "cx", label: "CX", name: "Central complex" },
  { id: "sez", label: "SEZ/VNC", name: "Subesophageal zone & ventral nerve cord ascending" },
]

export const SAMPLE_OUTPUT_NEURONS: NeuronClass[] = [
  { id: "cx", label: "CX", name: "Central complex" },
  { id: "lh", label: "LH", name: "Lateral horn neurons" },
  { id: "pre", label: "Premotor", name: "Descending & premotor neurons" },
  { id: "sez", label: "SEZ/VNC", name: "Subesophageal zone & ventral nerve cord" },
]

type Aff = Record<string, number>

// Which upstream classes feed each region, and which downstream classes each region feeds.
const EXT_IN: Record<string, Aff> = {
  CA: { olf: 0.85, thermo: 0.15 }, dACA: { thermo: 0.55, olf: 0.25, vis: 0.2 }, lACA: { thermo: 0.6, olf: 0.4 },
  vACA: { vis: 0.9, olf: 0.1 }, SLP: { olf: 0.55, thermo: 0.2, sez: 0.25 }, SIP: { olf: 0.3, sez: 0.45, cx: 0.25 },
  SMP: { sez: 0.55, cx: 0.25, olf: 0.2 }, CRE: { cx: 0.7, sez: 0.3 }, SCL: { vis: 0.35, sez: 0.3, cx: 0.35 },
  ICL: { vis: 0.6, sez: 0.4 }, IB: { vis: 0.4, sez: 0.6 }, LAL: { cx: 0.8, sez: 0.2 }, BU: { cx: 0.5, vis: 0.5 },
  LH: { olf: 0.7, thermo: 0.3 }, PLP: { vis: 1 }, AVLP: { vis: 0.45, sez: 0.25, thermo: 0.3 }, PVLP: { vis: 1 },
  VES: { sez: 0.8, vis: 0.2 }, SPS: { sez: 0.5, vis: 0.5 }, IPS: { sez: 0.6, vis: 0.4 }, SAD: { sez: 1 }, CAN: { sez: 1 },
}
const EXT_OUT: Record<string, Aff> = {
  CRE: { cx: 0.6, pre: 0.4 }, LAL: { cx: 0.4, pre: 0.6 }, BU: { cx: 1 }, SMP: { pre: 0.4, cx: 0.3, sez: 0.3 },
  SIP: { cx: 0.3, lh: 0.3, pre: 0.4 }, SLP: { lh: 0.8, pre: 0.2 }, LH: { lh: 1 }, SCL: { pre: 0.6, cx: 0.4 },
  ICL: { pre: 1 }, IB: { pre: 0.7, sez: 0.3 }, PLP: { pre: 0.6, lh: 0.4 }, AVLP: { pre: 0.5, lh: 0.5 }, PVLP: { pre: 1 },
  VES: { pre: 0.5, sez: 0.5 }, SPS: { pre: 1 }, IPS: { pre: 1 }, SAD: { sez: 1 }, CAN: { sez: 1 },
}

const each = (ids: string[], w: number): Aff => Object.fromEntries(ids.map((id) => [id, w]))
const merge = (...parts: Aff[]): Aff => {
  const out: Aff = {}
  for (const p of parts) for (const k in p) out[k] = (out[k] ?? 0) + p[k]
  return out
}
const G = ["g1", "g2", "g3", "g4", "g5"]
const AP = ["ap1", "ap2", "ap3"]
const BP = ["bp1", "bp2"]
const A = ["a1", "a2", "a3"]
const B = ["b1", "b2"]
const LOBES = [...G, ...AP, ...BP, ...A, ...B]

type Spec = [id: string, label: string, hint: string, count: number, perIn: number, perOut: number, inAff: Aff, outAff: Aff]

const pam = (id: string, hint: string, count: number, comp: Aff, extra: Aff = {}): Spec => [
  id, id, hint, count, 1400, 2600,
  merge({ SMP: 0.45, CRE: 0.22, SIP: 0.16, SLP: 0.06, LAL: 0.03 }, extra, each(Object.keys(comp), 0.05)),
  merge(comp, { SMP: 0.09, CRE: 0.05 }),
]
const ppl = (id: string, hint: string, count: number, comp: Aff): Spec => [
  id, id, hint, count, 4200, 9000,
  merge({ SMP: 0.3, SIP: 0.25, SLP: 0.25, CRE: 0.1, LH: 0.05 }, each(Object.keys(comp), 0.04)),
  merge(comp, { SMP: 0.05, SIP: 0.04 }),
]
const mbon = (id: string, hint: string, count: number, inAff: Aff, outAff: Aff): Spec => [
  id, id, hint, count, 16000, 4200, merge(inAff, { SMP: 0.04, CRE: 0.02 }), outAff,
]

const SAMPLE_SPECS: Record<string, Spec[]> = {
  PAM: [
    pam("PAM01", "γ5", 22, { g5: 1 }, { CRE: 0.12, LAL: 0.08 }),
    pam("PAM02", "β′2a", 9, { bp2: 1 }),
    pam("PAM03", "β2β′2a", 9, { b2: 0.6, bp2: 0.4 }),
    pam("PAM04", "β2", 18, { b2: 1 }, { SIP: 0.1 }),
    pam("PAM05", "β′2p", 10, { bp2: 1 }, { SLP: 0.08 }),
    pam("PAM06", "β′2m", 13, { bp2: 1 }),
    pam("PAM07", "γ4<γ1γ2", 7, { g4: 1, g1: 0.3, g2: 0.3 }),
    pam("PAM08", "γ4", 26, { g4: 1 }, { CRE: 0.18 }),
    pam("PAM09", "β1ped", 8, { b1: 0.75, PED: 0.25 }),
    pam("PAM10", "β1", 11, { b1: 1 }),
    pam("PAM11", "α1", 9, { a1: 1 }, { SLP: 0.12, SIP: 0.1 }),
    pam("PAM12", "γ3", 21, { g3: 1 }, { SMP: 0.12 }),
    pam("PAM13", "β′1ap", 12, { bp1: 1 }),
    pam("PAM14", "β′1m", 15, { bp1: 1 }, { CRE: 0.06 }),
  ],
  PPL1: [
    ppl("PPL101", "γ1pedc", 2, { g1: 0.7, PED: 0.3 }),
    ppl("PPL102", "γ1", 1, { g1: 1 }),
    ppl("PPL103", "γ2α′1", 1, { g2: 0.55, ap1: 0.45 }),
    ppl("PPL104", "α′3", 1, { ap3: 1 }),
    ppl("PPL105", "α′2α2", 1, { ap2: 0.5, a2: 0.5 }),
    ppl("PPL106", "α3", 1, { a3: 1 }),
  ],
  KC: [
    ["KCab", "KCαβ", "main", 1014, 140, 260, merge({ CA: 0.8 }, each([...A, ...B], 0.04)), merge(each([...A, ...B], 0.19), { PED: 0.05 })],
    ["KCab-p", "KCαβ-p", "posterior", 60, 140, 240, merge({ dACA: 0.6, CA: 0.2 }, each([...A, ...B], 0.04)), merge(each([...A, ...B], 0.18), { PED: 0.1 })],
    ["KCapbp", "KCα′β′", "main", 223, 150, 270, merge({ CA: 0.75 }, each([...AP, ...BP], 0.05)), merge(each([...AP, ...BP], 0.19), { PED: 0.05 })],
    ["KCapbp-ap", "KCα′β′-ap", "ant.–post.", 112, 150, 250, merge({ lACA: 0.45, CA: 0.35 }, each([...AP, ...BP], 0.04)), merge(each([...AP, ...BP], 0.19), { PED: 0.05 })],
    ["KCg", "KCγ", "main", 590, 160, 300, merge({ CA: 0.7 }, each(G, 0.06)), each(G, 0.2)],
    ["KCg-d", "KCγ-d", "dorsal", 99, 160, 280, merge({ vACA: 0.7, CA: 0.1 }, each(G, 0.04)), each(G, 0.2)],
  ],
  MBON: [
    mbon("MBON01", "γ5β′2a", 1, { g5: 0.6, bp2: 0.4 }, { SMP: 0.4, CRE: 0.3, SIP: 0.15, LAL: 0.15 }),
    mbon("MBON02", "β2β′2a", 1, { b2: 0.55, bp2: 0.45 }, { SMP: 0.35, CRE: 0.35, LAL: 0.2, SIP: 0.1 }),
    mbon("MBON04", "β′2mp", 1, { bp2: 1 }, { SMP: 0.5, CRE: 0.3, SIP: 0.2 }),
    mbon("MBON05", "γ4>γ1γ2", 1, { g4: 1 }, { g1: 0.45, g2: 0.45, CRE: 0.1 }),
    mbon("MBON06", "β1>α", 1, { b1: 1 }, { a1: 0.4, a2: 0.3, a3: 0.3 }),
    mbon("MBON07", "α1", 2, { a1: 1 }, { SLP: 0.5, SMP: 0.3, SIP: 0.2 }),
    mbon("MBON11", "γ1pedc>α/β", 1, { g1: 0.7, PED: 0.3 }, merge(each([...A, ...B], 0.12), { CRE: 0.2, SMP: 0.2 })),
    mbon("MBON14", "α3", 2, { a3: 1 }, { SMP: 0.4, SIP: 0.35, SLP: 0.25 }),
  ],
  OTHER: [
    ["APL", "APL", "inhibitory", 1, 92000, 64000, merge({ CA: 2, PED: 1 }, each(LOBES, 1)), merge({ CA: 1.6, PED: 0.6 }, each(LOBES, 1))],
    ["DPM", "DPM", "serotonergic", 1, 38000, 52000, merge({ PED: 0.4 }, each(LOBES, 1)), merge({ PED: 0.3 }, each(LOBES, 1))],
  ],
}

export const SAMPLE_CELL_TYPES: CellTypeGroup[] = [
  { id: "PAM", label: "PAM", name: "PAM dopaminergic neurons", children: [] },
  { id: "PPL1", label: "PPL1", name: "PPL1 dopaminergic neurons", children: [] },
  { id: "KC", label: "KC", name: "Kenyon cells", children: [] },
  { id: "MBON", label: "MBON", name: "Mushroom body output neurons", children: [] },
  { id: "OTHER", label: "APL · DPM", name: "Mushroom body modulatory neurons", children: [] },
].map((g) => ({ ...g, children: SAMPLE_SPECS[g.id].map(([id, label, hint]) => ({ id, label, hint })) }))

/** The sample connectome. Same seed, same numbers. */
export function sampleConnectome(seed = 7): ConnectomeData {
  const rnd = mulberry32(seed)
  const regionsByGroup = new Map<string, string[]>()
  const groupOf = new Map<string, string>()
  for (const g of SAMPLE_REGION_GROUPS) {
    regionsByGroup.set(g.id, g.regions.map((r) => r.id))
    for (const r of g.regions) groupOf.set(r.id, g.id)
  }
  // Weights → integer synapses, with noise and a little spill into neighbouring compartments.
  const spread = (aff: Aff, total: number): Record<string, number> => {
    const w: Aff = {}
    for (const k in aff) {
      w[k] = (w[k] ?? 0) + aff[k] * (0.7 + 0.6 * rnd())
      const sibs = regionsByGroup.get(groupOf.get(k) ?? "") ?? []
      if (sibs.length > 1 && rnd() < 0.45) {
        const s = sibs[Math.floor(rnd() * sibs.length)]
        if (s !== k) w[s] = (w[s] ?? 0) + aff[k] * 0.07 * rnd()
      }
    }
    const sum = Object.values(w).reduce((a, b) => a + b, 0) || 1
    const out: Record<string, number> = {}
    for (const k in w) {
      const v = Math.round((w[k] / sum) * total)
      if (v > 0) out[k] = v
    }
    return out
  }
  const links = (counts: Record<string, number>, table: Record<string, Aff>, share: number) => {
    const out: Record<string, Record<string, number>> = {}
    for (const r in counts) {
      const t = table[r]
      if (!t) continue
      for (const n in t) {
        const v = Math.round(counts[r] * share * t[n] * (0.75 + 0.5 * rnd()))
        if (v > 0) (out[n] ??= {})[r] = v
      }
    }
    return out
  }
  const profiles: Record<string, CellTypeProfile> = {}
  for (const g of SAMPLE_CELL_TYPES) {
    for (const [id, , , count, perIn, perOut, inAff, outAff] of SAMPLE_SPECS[g.id]) {
      const inputs = spread(inAff, count * perIn * (0.85 + 0.3 * rnd()))
      const outputs = spread(outAff, count * perOut * (0.85 + 0.3 * rnd()))
      const tIn = Object.values(inputs).reduce((a, b) => a + b, 0) || 1
      const tOut = Object.values(outputs).reduce((a, b) => a + b, 0) || 1
      const innervation: Record<string, number> = {}
      for (const r of new Set([...Object.keys(inputs), ...Object.keys(outputs)])) {
        const share = ((inputs[r] ?? 0) / tIn + (outputs[r] ?? 0) / tOut) / 2
        innervation[r] = Math.max(1, Math.min(count, Math.round(count * Math.min(1, 0.12 + share * 2.2))))
      }
      profiles[id] = {
        count,
        inputs,
        outputs,
        inputLinks: links(inputs, EXT_IN, 0.55),
        outputLinks: links(outputs, EXT_OUT, 0.5),
        innervation,
      }
    }
  }
  return {
    cellTypes: SAMPLE_CELL_TYPES,
    regionGroups: SAMPLE_REGION_GROUPS,
    supers: SAMPLE_SUPERS,
    inputNeurons: SAMPLE_INPUT_NEURONS,
    outputNeurons: SAMPLE_OUTPUT_NEURONS,
    profiles,
  }
}

// #endregion

// ---- presentation --------------------------------------------------------------------------

const BG = "var(--color-background, #ffffff)"
const FG = "var(--color-foreground, #0a0a0a)"
const MUTED = "var(--color-muted-foreground, #737373)"
const BORDER = "var(--color-border, #e5e5e5)"
const mix = (pct: number) => "color-mix(in oklab, " + FG + " " + pct + "%, " + BG + ")"
const TILE = mix(6)
const BAND = mix(10.5)
const SUPER_BAND = mix(4)

export type ConnectomeColors = { input?: string; output?: string; accent?: string }
export type ConnectomeLabels = { cellTypes: string; input: string; output: string; regions: string; neurons: string }

export interface ConnectomeArcExplorerProps {
  /** Your connectome. Anything left out falls back to the sample. */
  data?: Partial<ConnectomeData>
  /** Controlled selection: a cell type or group id. */
  selected?: string
  defaultSelected?: string
  onSelectedChange?: (id: string) => void
  /** Groups open at first render. Defaults to the group holding the selection. */
  defaultExpanded?: string[]
  colors?: ConnectomeColors
  labels?: Partial<ConnectomeLabels>
  /** What a connection is called in the tooltips. */
  unit?: string
  unitPlural?: string
  locale?: string
  /** Selection morph length in ms. */
  duration?: number
  /** Seed for the sample data. */
  seed?: number
  onRegionClick?: (info: { region: string; side: Side; cellType: string }) => void
  className?: string
}

type Focus =
  | { kind: "region"; id: string; side: Side }
  | { kind: "group"; id: string; side: Side }
  | { kind: "super"; id: string; side: Side }
  | { kind: "neuron"; id: string; side: Side }

const sameFocus = (a: Focus | null, b: Focus | null) => !!a && !!b && a.kind === b.kind && a.id === b.id && a.side === b.side

const useIsoLayoutEffect = typeof window === "undefined" ? React.useEffect : React.useLayoutEffect

function useReducedMotion() {
  const [reduced, setReduced] = React.useState(false)
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const on = () => setReduced(mq.matches)
    on()
    mq.addEventListener("change", on)
    return () => mq.removeEventListener("change", on)
  }, [])
  return reduced
}

/** Eases from wherever the values are now to `target`. Retargeting mid-flight turns around smoothly. */
function useTween(target: Float64Array, duration: number) {
  const [value, setValue] = React.useState(target)
  const current = React.useRef(target)
  React.useEffect(() => {
    const from = current.current
    if (duration <= 0 || from.length !== target.length) {
      current.current = target
      setValue(target)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / duration)
      const next = k >= 1 ? target : lerpArrays(from, target, easeInOutCubic(k))
      current.current = next
      setValue(next)
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return value
}

const CSS =
  ".cae-root .cae-rise{animation:cae-rise 760ms cubic-bezier(.2,.75,.2,1) both;transform-box:view-box;transform-origin:600px 400px}" +
  "@keyframes cae-rise{from{opacity:0;transform:rotate(var(--cae-spin,0deg)) scale(.92)}to{opacity:1;transform:none}}" +
  ".cae-root .cae-draw{stroke-dasharray:1 1;animation:cae-draw 1200ms cubic-bezier(.55,0,.2,1) both}" +
  "@keyframes cae-draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}" +
  ".cae-root .cae-pop{animation:cae-pop 640ms cubic-bezier(.3,1.5,.5,1) both;transform-box:fill-box;transform-origin:center}" +
  "@keyframes cae-pop{from{opacity:0;transform:scale(.2)}to{opacity:1;transform:none}}" +
  ".cae-root .cae-fade{animation:cae-fade 520ms cubic-bezier(.2,.7,.2,1) both}" +
  "@keyframes cae-fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}" +
  ".cae-root .cae-flow-in{animation:cae-flow-in 1.1s linear infinite}" +
  ".cae-root .cae-flow-out{animation:cae-flow-out 1.1s linear infinite}" +
  "@keyframes cae-flow-in{to{stroke-dashoffset:-22}}" +
  "@keyframes cae-flow-out{to{stroke-dashoffset:22}}" +
  ".cae-root .cae-col{scrollbar-width:none}.cae-root .cae-col::-webkit-scrollbar{display:none}" +
  ".cae-root .cae-hit:focus{outline:none}" +
  ".cae-root .cae-hit:focus-visible .cae-ring{stroke-opacity:1}" +
  "@media (prefers-reduced-motion: reduce){.cae-root .cae-rise,.cae-root .cae-draw,.cae-root .cae-pop,.cae-root .cae-fade,.cae-root .cae-flow-in,.cae-root .cae-flow-out{animation:none!important}}"

export default function ConnectomeArcExplorer({
  data,
  selected,
  defaultSelected,
  onSelectedChange,
  defaultExpanded,
  colors,
  labels,
  unit = "synapse",
  unitPlural,
  locale = "en-US",
  duration = 720,
  seed = 7,
  onRegionClick,
  className = "",
}: ConnectomeArcExplorerProps) {
  const cIn = colors?.input ?? "#ea8a2e"
  const cOut = colors?.output ?? "#3b88e6"
  const cAccent = colors?.accent ?? "#4f9f5b"
  const L: ConnectomeLabels = {
    cellTypes: "cell types",
    input: "input",
    output: "output",
    regions: "regions of interest",
    neurons: "neurons of interest",
    ...labels,
  }
  const units = unitPlural ?? unit + "s"
  const colorOf = (s: Side) => (s === "in" ? cIn : cOut)

  // ---- data ----
  const sample = React.useMemo(() => sampleConnectome(seed), [seed])
  const d: ConnectomeData = React.useMemo(
    () => ({
      cellTypes: data?.cellTypes ?? sample.cellTypes,
      regionGroups: data?.regionGroups ?? sample.regionGroups,
      supers: data?.supers ?? (data?.regionGroups ? [] : sample.supers),
      inputNeurons: data?.inputNeurons ?? sample.inputNeurons,
      outputNeurons: data?.outputNeurons ?? sample.outputNeurons,
      profiles: data?.profiles ?? sample.profiles,
    }),
    [data, sample],
  )
  const layout = React.useMemo(() => layoutArc(d.regionGroups, d.supers), [d.regionGroups, d.supers])
  const regionIds = React.useMemo(() => layout.regions.map((r) => r.id), [layout])
  const inIds = React.useMemo(() => d.inputNeurons.map((n) => n.id), [d.inputNeurons])
  const outIds = React.useMemo(() => d.outputNeurons.map((n) => n.id), [d.outputNeurons])
  const o = React.useMemo(() => offsets(regionIds.length, inIds.length, outIds.length), [regionIds, inIds, outIds])

  // ---- selection ----
  const firstId = d.cellTypes[0]?.id ?? ""
  const [innerSel, setInnerSel] = React.useState(defaultSelected ?? firstId)
  const sel = selected ?? innerSel
  const selHit = findCellType(d.cellTypes, sel)
  const [expanded, setExpanded] = React.useState<Set<string>>(() => {
    if (defaultExpanded) return new Set(defaultExpanded)
    const hit = findCellType(d.cellTypes, defaultSelected ?? selected ?? firstId)
    return new Set(hit ? [(hit.parent ?? hit.type).id] : [])
  })
  // A selection made from outside opens its group so it can be seen.
  const parentId = selHit?.parent?.id
  React.useEffect(() => {
    if (parentId) setExpanded((s) => (s.has(parentId) ? s : new Set(s).add(parentId)))
  }, [parentId])

  const select = (id: string) => {
    if (selected === undefined) setInnerSel(id)
    onSelectedChange?.(id)
  }
  const toggle = (id: string) =>
    setExpanded((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const reduced = useReducedMotion()
  const target = React.useMemo(() => packProfile(resolveProfile(d, sel), regionIds, inIds, outIds), [d, sel, regionIds, inIds, outIds])
  const v = useTween(target, reduced ? 0 : duration)

  // ---- derived numbers for this frame ----
  const R = o.R
  const regionIn = (r: number) => v[o.inp + r] ?? 0
  const regionOut = (r: number) => v[o.out + r] ?? 0
  const link = (side: Side, n: number, r: number) => v[(side === "in" ? o.inLinks : o.outLinks) + n * R + r] ?? 0
  const regionVal = (side: Side, r: number) => (side === "in" ? regionIn(r) : regionOut(r))
  let maxIn = 0, maxOut = 0, totIn = 0, totOut = 0, maxLink = 0
  for (let r = 0; r < R; r++) {
    maxIn = Math.max(maxIn, regionIn(r))
    maxOut = Math.max(maxOut, regionOut(r))
    totIn += regionIn(r)
    totOut += regionOut(r)
  }
  const nodeTotals = { in: inIds.map(() => 0), out: outIds.map(() => 0) }
  for (const side of ["in", "out"] as Side[]) {
    const ids = side === "in" ? inIds : outIds
    for (let n = 0; n < ids.length; n++)
      for (let r = 0; r < R; r++) {
        const w = link(side, n, r)
        nodeTotals[side][n] += w
        if (w > maxLink) maxLink = w
      }
  }
  const maxNode = Math.max(0, ...nodeTotals.in, ...nodeTotals.out)
  const count = v[0] ?? 0

  // ---- size: one fixed stage, scaled to the card ----
  const wrapRef = React.useRef<HTMLDivElement>(null)
  const stageRef = React.useRef<HTMLDivElement>(null)
  const [width, setWidth] = React.useState(STAGE.W)
  useIsoLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => setWidth(el.clientWidth || STAGE.W)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const compact = width < 720
  const [compactSide, setCompactSide] = React.useState<Side>("in")
  const view = compact ? { x0: compactSide === "in" ? 20 : 500, w: 680 } : { x0: 0, w: STAGE.W }
  const scale = Math.max(width / view.w, compact ? 0.5 : 0)
  // On a very narrow card the stage scrolls sideways; keep the column in view.
  useIsoLayoutEffect(() => {
    const el = wrapRef.current
    if (el && compact) el.scrollLeft = compactSide === "in" ? el.scrollWidth : 0
  }, [compact, compactSide])

  // ---- reveal on first sight ----
  const [revealed, setRevealed] = React.useState(false)
  const [introDone, setIntroDone] = React.useState(false)
  React.useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    if (reduced || typeof IntersectionObserver === "undefined") {
      setRevealed(true)
      setIntroDone(true)
      return
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setRevealed(true)
          io.disconnect()
        }
      },
      { threshold: 0.2 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [reduced])
  React.useEffect(() => {
    if (!revealed || introDone) return
    const t = window.setTimeout(() => setIntroDone(true), 2400)
    return () => window.clearTimeout(t)
  }, [revealed, introDone])
  const intro = (cls: string, delay: number, extra?: React.CSSProperties): { className?: string; style: React.CSSProperties } =>
    introDone ? { style: { ...extra } } : revealed ? { className: cls, style: { ...extra, animationDelay: delay + "ms" } } : { style: { ...extra, opacity: 0 } }

  // ---- hover, pin, tooltip ----
  const [hover, setHover] = React.useState<Focus | null>(null)
  const [pinned, setPinned] = React.useState<Focus | null>(null)
  const [pointer, setPointer] = React.useState<[number, number] | null>(null)
  const [roving, setRoving] = React.useState<{ side: Side; i: number }>({ side: "in", i: 0 })
  const clearTimer = React.useRef(0)
  const enter = (f: Focus, e?: React.PointerEvent | null) => {
    window.clearTimeout(clearTimer.current)
    setHover((h) => (sameFocus(h, f) ? h : f))
    if (e) movePointer(e)
  }
  const leave = () => {
    window.clearTimeout(clearTimer.current)
    clearTimer.current = window.setTimeout(() => {
      setHover(null)
      setPointer(null)
    }, 70)
  }
  React.useEffect(() => () => window.clearTimeout(clearTimer.current), [])
  const movePointer = (e: React.PointerEvent) => {
    const box = stageRef.current?.getBoundingClientRect()
    if (box) setPointer([e.clientX - box.left, e.clientY - box.top])
  }
  const pin = (f: Focus) => setPinned((p) => (sameFocus(p, f) ? null : f))
  const focus = hover ?? pinned

  // What the focus lights up, per side.
  const active = React.useMemo(() => {
    if (!focus) return null
    const sets = { in: { regions: new Set<number>(), neurons: new Set<number>() }, out: { regions: new Set<number>(), neurons: new Set<number>() } }
    const regionsOf = (f: Focus): number[] => {
      if (f.kind === "region") return [regionIds.indexOf(f.id)].filter((i) => i >= 0)
      if (f.kind === "group") return layout.groups.find((g) => g.id === f.id)?.regions ?? []
      if (f.kind === "super") return layout.supers.find((g) => g.id === f.id)?.regions ?? []
      return []
    }
    if (focus.kind === "neuron") {
      const ids = focus.side === "in" ? inIds : outIds
      const n = ids.indexOf(focus.id)
      if (n >= 0) {
        sets[focus.side].neurons.add(n)
        for (let r = 0; r < R; r++) if (link(focus.side, n, r) > 0.5) sets[focus.side].regions.add(r)
      }
    } else {
      const rs = regionsOf(focus)
      for (const side of ["in", "out"] as Side[]) {
        const ids = side === "in" ? inIds : outIds
        for (const r of rs) {
          sets[side].regions.add(r)
          for (let n = 0; n < ids.length; n++) if (link(side, n, r) > 0.5) sets[side].neurons.add(n)
        }
      }
    }
    return sets
    // v changes every frame of a morph; the sets only need the target.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, target, layout, regionIds, inIds, outIds])

  React.useEffect(() => {
    if (!pinned) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPinned(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [pinned])

  // ---- format ----
  const nf = React.useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }), [locale])
  const compactNf = React.useMemo(() => new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }), [locale])
  const cf = { format: (n: number) => compactNf.format(Math.round(n)) }
  const pf = React.useMemo(() => new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }), [locale])
  const fmt = (n: number) => nf.format(Math.round(n))
  const selType = selHit?.type
  const selLabel = selType?.label ?? sel

  // ---- column ----
  const colRef = React.useRef<HTMLDivElement>(null)
  const [fade, setFade] = React.useState({ top: false, bottom: false })
  const syncFade = React.useCallback(() => {
    const c = colRef.current
    if (!c) return
    setFade({ top: c.scrollTop > 2, bottom: c.scrollTop + c.clientHeight < c.scrollHeight - 2 })
  }, [])
  React.useEffect(() => {
    syncFade()
    const t = window.setTimeout(syncFade, 380)
    return () => window.clearTimeout(t)
  }, [expanded, syncFade])
  React.useEffect(() => {
    const c = colRef.current
    const row = c?.querySelector<HTMLElement>('[data-row="' + CSS_ESCAPE(sel) + '"]')
    if (!c || !row) return
    const t = window.setTimeout(() => {
      const top = row.offsetTop - c.clientHeight / 2 + row.offsetHeight / 2
      c.scrollTo({ top: Math.max(0, top), behavior: reduced ? "auto" : "smooth" })
    }, 60)
    return () => window.clearTimeout(t)
  }, [sel, reduced])

  const onColumnKey = (e: React.KeyboardEvent) => {
    const rows = visibleRows(d.cellTypes, expanded)
    const id = (document.activeElement as HTMLElement | null)?.dataset?.row
    if (!id) return
    const i = rows.indexOf(id)
    const focusRow = (rid: string | undefined) => {
      if (!rid) return
      e.preventDefault()
      colRef.current?.querySelector<HTMLElement>('[data-row="' + CSS_ESCAPE(rid) + '"]')?.focus()
    }
    const g = d.cellTypes.find((x) => x.id === id)
    if (e.key === "ArrowDown") focusRow(rows[Math.min(rows.length - 1, i + 1)])
    else if (e.key === "ArrowUp") focusRow(rows[Math.max(0, i - 1)])
    else if (e.key === "Home") focusRow(rows[0])
    else if (e.key === "End") focusRow(rows[rows.length - 1])
    else if (e.key === "ArrowRight" && g?.children?.length) {
      e.preventDefault()
      if (!expanded.has(g.id)) toggle(g.id)
      else focusRow(g.children[0].id)
    } else if (e.key === "ArrowLeft") {
      e.preventDefault()
      if (g && expanded.has(g.id)) toggle(g.id)
      else {
        const parent = findCellType(d.cellTypes, id)?.parent
        if (parent) focusRow(parent.id)
      }
    }
  }

  // ---- tiles: keyboard ----
  const onTileKey = (e: React.KeyboardEvent, side: Side, i: number) => {
    const move = (ns: Side, ni: number) => {
      e.preventDefault()
      const k = Math.max(0, Math.min(R - 1, ni))
      setRoving({ side: ns, i: k })
      stageRef.current?.querySelector<SVGElement>('[data-tile="' + ns + ":" + k + '"]')?.focus()
    }
    if (e.key === "ArrowDown") move(side, i + 1)
    else if (e.key === "ArrowUp") move(side, i - 1)
    else if (e.key === "ArrowLeft") move("in", i)
    else if (e.key === "ArrowRight") move("out", i)
    else if (e.key === "Home") move(side, 0)
    else if (e.key === "End") move(side, R - 1)
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      const f: Focus = { kind: "region", id: regionIds[i], side }
      pin(f)
      onRegionClick?.({ region: regionIds[i], side, cellType: sel })
    } else if (e.key === "Escape") {
      setPinned(null)
      setHover(null)
    }
  }

  // ---- stats for the tooltip ----
  const statsFor = (rs: number[]) => {
    let inS = 0, outS = 0, inn = 0
    const topIn = inIds.map(() => 0)
    const topOut = outIds.map(() => 0)
    for (const r of rs) {
      inS += regionIn(r)
      outS += regionOut(r)
      inn = Math.max(inn, v[o.inn + r] ?? 0)
      inIds.forEach((_, n) => (topIn[n] += link("in", n, r)))
      outIds.forEach((_, n) => (topOut[n] += link("out", n, r)))
    }
    const best = (arr: number[], list: NeuronClass[]) => {
      let k = -1
      arr.forEach((x, i) => {
        if (x > 0.5 && (k < 0 || x > arr[k])) k = i
      })
      return k < 0 ? null : { label: list[k].label, value: arr[k] }
    }
    return { inS, outS, inn, topIn: best(topIn, d.inputNeurons), topOut: best(topOut, d.outputNeurons) }
  }

  const anchorOf = (f: Focus): [number, number] => {
    if (f.kind === "neuron") {
      const ids = f.side === "in" ? inIds : outIds
      const n = ids.indexOf(f.id)
      return [NODE_X[f.side], nodeYs(ids.length)[n] ?? STAGE.CY]
    }
    const span =
      f.kind === "region"
        ? layout.regions.find((r) => r.id === f.id)
        : (f.kind === "group" ? layout.groups : layout.supers).find((g) => g.id === f.id)
    const u = span ? (span.u0 + span.u1) / 2 : 0.5
    return polar(RING.tileOut, angleAt(u, f.side))
  }

  const bar = (value: number, total: number, color: string) => (
    <span className="relative mt-1 block h-[3px] w-full overflow-hidden rounded-full" style={{ background: mix(9) }}>
      <span
        className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 motion-reduce:transition-none"
        style={{ width: (total > 0 ? Math.min(100, (value / total) * 100) : 0) + "%", background: color }}
      />
    </span>
  )

  const stat = (label: string, value: number, total: number, color: string) => (
    <div className="mt-2">
      <div className="flex items-baseline justify-between gap-3">
        <span style={{ color }}>{label}</span>
        <span className="tabular-nums" style={{ color: FG }}>
          <b className="font-semibold">{fmt(value)}</b>
          <span style={{ color: MUTED }}> of {cf.format(total)}</span>
        </span>
      </div>
      {bar(value, total, color)}
    </div>
  )

  const tooltip = (f: Focus) => {
    if (f.kind === "neuron") {
      const list = f.side === "in" ? d.inputNeurons : d.outputNeurons
      const n = list.findIndex((x) => x.id === f.id)
      if (n < 0) return null
      const rows = layout.regions
        .map((r, i) => ({ label: r.label, value: link(f.side, n, i) }))
        .filter((x) => x.value > 0.5)
        .sort((a, b) => b.value - a.value)
      const total = nodeTotals[f.side][n]
      const top = rows[0]?.value ?? 0
      return (
        <>
          <div className="text-[10.5px] font-medium uppercase tracking-[0.12em]" style={{ color: colorOf(f.side) }}>
            {(f.side === "in" ? L.input : L.output) + " neurons"}
          </div>
          <div className="mt-0.5 text-[15px] font-semibold leading-tight" style={{ color: FG }}>{list[n].label}</div>
          {list[n].name ? <div className="text-[11px] leading-snug" style={{ color: MUTED }}>{list[n].name}</div> : null}
          <div className="mt-2 tabular-nums" style={{ color: FG }}>
            <b className="font-semibold">{fmt(total)}</b> {total === 1 ? unit : units}{" "}
            <span style={{ color: MUTED }}>{f.side === "in" ? "onto" : "from"} {selLabel}</span>
          </div>
          {rows.length ? (
            <div className="mt-2 grid gap-1.5">
              {rows.slice(0, 4).map((r) => (
                <div key={r.label}>
                  <div className="flex justify-between tabular-nums">
                    <span style={{ color: FG }}>{r.label}</span>
                    <span style={{ color: MUTED }}>{fmt(r.value)}</span>
                  </div>
                  {bar(r.value, top, colorOf(f.side))}
                </div>
              ))}
              {rows.length > 4 ? <div style={{ color: MUTED }}>+{rows.length - 4} more regions</div> : null}
            </div>
          ) : (
            <div className="mt-1" style={{ color: MUTED }}>No direct connections.</div>
          )}
        </>
      )
    }
    let title = "", name: string | undefined, kicker = ""
    let rs: number[] = []
    if (f.kind === "region") {
      const i = regionIds.indexOf(f.id)
      if (i < 0) return null
      const r = layout.regions[i]
      const g = d.regionGroups[r.group]
      title = r.label
      name = r.name
      kicker = g.label + (g.within ? " · " + (d.supers?.find((s) => s.id === g.within)?.label ?? g.within) : "")
      rs = [i]
    } else {
      const span = (f.kind === "group" ? layout.groups : layout.supers).find((g) => g.id === f.id)
      if (!span) return null
      title = span.label
      name = span.name
      kicker = span.regions.length + " regions"
      rs = span.regions
    }
    const s = statsFor(rs)
    const neuronLabel = rs.length > 1 ? "Neurons, busiest region" : "Neurons"
    return (
      <>
        <div className="text-[10.5px] font-medium tracking-[0.08em]" style={{ color: MUTED }}>{kicker}</div>
        <div className="mt-0.5 flex items-baseline gap-2">
          <span className="text-[17px] font-semibold leading-tight" style={{ color: colorOf(f.side) }}>{title}</span>
          <span className="truncate text-[11px]" style={{ color: MUTED }}>{name}</span>
        </div>
        {stat("Input " + units, s.inS, totIn, cIn)}
        {stat("Output " + units, s.outS, totOut, cOut)}
        <div className="mt-2.5 grid gap-1 border-t pt-2 tabular-nums" style={{ borderColor: BORDER }}>
          <div className="flex justify-between gap-3">
            <span style={{ color: MUTED }}>{neuronLabel}</span>
            <span style={{ color: FG }}>
              <b className="font-semibold">{fmt(s.inn)}</b> <span style={{ color: MUTED }}>of {fmt(count)}</span>
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span style={{ color: MUTED }}>Share of {selLabel}</span>
            <span style={{ color: FG }}>{pf.format(totIn + totOut > 0 ? (s.inS + s.outS) / (totIn + totOut) : 0)}</span>
          </div>
          {s.topIn ? (
            <div className="flex justify-between gap-3">
              <span style={{ color: MUTED }}>Top upstream</span>
              <span style={{ color: FG }}>{s.topIn.label} <span style={{ color: MUTED }}>{cf.format(s.topIn.value)}</span></span>
            </div>
          ) : null}
          {s.topOut ? (
            <div className="flex justify-between gap-3">
              <span style={{ color: MUTED }}>Top downstream</span>
              <span style={{ color: FG }}>{s.topOut.label} <span style={{ color: MUTED }}>{cf.format(s.topOut.value)}</span></span>
            </div>
          ) : null}
        </div>
      </>
    )
  }

  // Keep the last tooltip around while it fades out.
  const shown = React.useRef<{ f: Focus; at: [number, number] } | null>(null)
  if (focus) {
    const a = anchorOf(focus)
    const at: [number, number] = hover && pointer && sameFocus(hover, focus) ? pointer : [(a[0] - view.x0) * scale, a[1] * scale]
    shown.current = { f: focus, at }
  }
  const tip = shown.current
  const TIP_W = 262
  const stageW = view.w * scale
  const stageH = STAGE.H * scale
  let tipX = 0, tipY = 0
  if (tip) {
    const [px, py] = tip.at
    tipX = px + 18 + TIP_W > stageW - 8 ? px - 18 - TIP_W : px + 18
    tipX = Math.max(8, Math.min(stageW - TIP_W - 8, tipX))
    tipY = Math.max(8, Math.min(stageH - 230, py + 14))
  }

  // ---- svg pieces ----
  const sides: Side[] = ["in", "out"]
  const dimmed = (side: Side, r: number) => !!active && !active[side].regions.has(r)

  const linksFor = (side: Side) => {
    const ids = side === "in" ? inIds : outIds
    const ys = nodeYs(ids.length)
    const out: React.ReactNode[] = []
    const flows: React.ReactNode[] = []
    for (let n = 0; n < ids.length; n++) {
      for (let r = 0; r < R; r++) {
        const w = link(side, n, r)
        if (w <= maxLink * 0.002 || w <= 0.01) continue
        const reg = layout.regions[r]
        const a = angleAt((reg.u0 + reg.u1) / 2, side)
        const dPath = linkPath(NODE_X[side], ys[n], a)
        const on = !!active && active[side].regions.has(r) && active[side].neurons.has(n)
        const off = !!active && !on
        const width = linkWidth(w, maxLink)
        const io = intro("cae-draw", 650 + r * 14 + n * 40, {
          stroke: on ? colorOf(side) : mix(off ? 10 : 24),
          strokeOpacity: on ? 0.85 : off ? 0.5 : 0.75,
          transition: "stroke 260ms, stroke-opacity 260ms",
        })
        out.push(
          <path key={side + n + ":" + r} d={dPath} fill="none" strokeWidth={width} strokeLinecap="round" pathLength={1} className={io.className} style={io.style} />,
        )
        if (on && !reduced)
          flows.push(
            <path
              key={"f" + side + n + ":" + r}
              d={dPath}
              fill="none"
              strokeWidth={Math.max(1.2, width * 0.45)}
              strokeLinecap="round"
              strokeDasharray="0.5 10.5"
              className={side === "in" ? "cae-flow-in" : "cae-flow-out"}
              style={{ stroke: BG, strokeOpacity: 0.6 }}
            />,
          )
      }
    }
    return [...out, ...flows]
  }

  const arcSide = (side: Side) => {
    const max = side === "in" ? maxIn : maxOut
    const color = colorOf(side)
    const spin = side === "in" ? "-10deg" : "10deg"
    return (
      <g key={"arc" + side}>
        {/* faint guides */}
        <path d={arcPath(RING.tileOut + 16, angleAt(-0.02, side), angleAt(1.02, side))} fill="none" style={{ stroke: mix(14) }} strokeDasharray="1 5" strokeLinecap="round" />
        <path d={arcPath(RING.superIn - 12, angleAt(-0.01, side), angleAt(1.01, side))} fill="none" style={{ stroke: mix(10) }} strokeDasharray="1 5" strokeLinecap="round" />

        {layout.supers.map((s) => {
          const a0 = angleAt(s.u0, side)
          const a1 = angleAt(s.u1, side)
          const am = angleAt((s.u0 + s.u1) / 2, side)
          const [lx, ly] = polar((RING.superIn + RING.superOut) / 2, am)
          const f: Focus = { kind: "super", id: s.id, side }
          const on = !active || s.regions.some((r) => active[side].regions.has(r))
          const io = intro("cae-rise", 60, { ["--cae-spin" as string]: spin, opacity: on ? 1 : 0.4, transition: "opacity 240ms" })
          return (
            <g
              key={s.id}
              className={io.className}
              style={{ ...io.style, cursor: "pointer" }}
              onPointerEnter={(e) => enter(f, e)}
              onPointerMove={movePointer}
              onPointerLeave={leave}
              onClick={(e) => {
                e.stopPropagation()
                pin(f)
              }}
            >
              <path d={sectorPath(RING.superIn, RING.superOut, a0, a1, 2)} style={{ fill: SUPER_BAND }} />
              <text
                x={lx}
                y={ly}
                transform={"rotate(" + f2(tangentLabelRotation(am, side)) + " " + f2(lx) + " " + f2(ly) + ")"}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={10}
                fontWeight={700}
                letterSpacing="0.14em"
                style={{ fill: MUTED, pointerEvents: "none" }}
              >
                {(s.name ?? s.label).toUpperCase()}
              </text>
            </g>
          )
        })}

        {layout.groups.map((g, gi) => {
          const a0 = angleAt(g.u0, side)
          const a1 = angleAt(g.u1, side)
          const am = angleAt((g.u0 + g.u1) / 2, side)
          const rm = (RING.groupIn + RING.groupOut) / 2
          const [lx, ly] = polar(rm, am)
          const fits = g.label.length * 6.4 + 6 < rm * Math.abs(a1 - a0)
          const f: Focus = { kind: "group", id: g.id, side }
          const lit = !!active && g.regions.some((r) => active[side].regions.has(r))
          const io = intro("cae-rise", 100 + gi * 26, {
            ["--cae-spin" as string]: spin,
            opacity: !active || lit ? 1 : 0.4,
            transition: "opacity 240ms",
          })
          return (
            <g
              key={g.id}
              className={io.className}
              style={{ ...io.style, cursor: "pointer" }}
              onPointerEnter={(e) => enter(f, e)}
              onPointerMove={movePointer}
              onPointerLeave={leave}
              onClick={(e) => {
                e.stopPropagation()
                pin(f)
              }}
            >
              <path d={sectorPath(RING.groupIn, RING.groupOut, a0, a1, 2.5)} style={{ fill: lit ? "color-mix(in oklab, " + color + " 22%, " + BAND + ")" : BAND, transition: "fill 240ms" }} />
              {fits ? (
                <text
                  x={lx}
                  y={ly}
                  transform={"rotate(" + f2(tangentLabelRotation(am, side)) + " " + f2(lx) + " " + f2(ly) + ")"}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={10.5}
                  fontWeight={700}
                  style={{ fill: FG, pointerEvents: "none" }}
                >
                  {g.label}
                </text>
              ) : null}
            </g>
          )
        })}

        {layout.regions.map((reg, i) => {
          const a0 = angleAt(reg.u0, side)
          const a1 = angleAt(reg.u1, side)
          const am = angleAt((reg.u0 + reg.u1) / 2, side)
          const rm = (RING.tileIn + RING.tileOut) / 2
          const [lx, ly] = polar(rm, am)
          const val = regionVal(side, i)
          const k = tint(val, max)
          const f: Focus = { kind: "region", id: reg.id, side }
          const lit = !!active && active[side].regions.has(i)
          const isPinned = pinned?.kind === "region" && pinned.id === reg.id
          const sector = sectorPath(RING.tileIn, RING.tileOut, a0, a1, 2)
          const io = intro("cae-rise", 160 + ((reg.u0 + reg.u1) / 2) * 620, {
            ["--cae-spin" as string]: spin,
            opacity: dimmed(side, i) ? 0.3 : 1,
            transition: "opacity 240ms",
          })
          const label = reg.label + ", " + fmt(regionIn(i)) + " input and " + fmt(regionOut(i)) + " output " + units
          return (
            <g
              key={reg.id}
              data-tile={side + ":" + i}
              className={"cae-hit " + (io.className ?? "")}
              style={{ ...io.style, cursor: "pointer" }}
              tabIndex={roving.side === side && roving.i === i ? 0 : -1}
              role="button"
              aria-label={label}
              aria-pressed={isPinned}
              onPointerEnter={(e) => enter(f, e)}
              onPointerMove={movePointer}
              onPointerLeave={leave}
              onFocus={() => {
                setRoving({ side, i })
                enter(f)
                setPointer(null)
              }}
              onBlur={leave}
              onKeyDown={(e) => onTileKey(e, side, i)}
              onClick={(e) => {
                e.stopPropagation()
                pin(f)
                onRegionClick?.({ region: reg.id, side, cellType: sel })
              }}
            >
              <path d={sector} style={{ fill: TILE }} />
              <path d={sector} style={{ fill: color, fillOpacity: k }} />
              <path
                className="cae-ring"
                d={sector}
                fill="none"
                strokeWidth={lit || isPinned ? 1.6 : 1.4}
                style={{ stroke: lit || isPinned ? color : FG, strokeOpacity: lit || isPinned ? 1 : 0, transition: "stroke-opacity 200ms" }}
              />
              <text
                x={lx}
                y={ly}
                transform={"rotate(" + f2(radialLabelRotation(am, side)) + " " + f2(lx) + " " + f2(ly) + ")"}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={10}
                fontWeight={k > 0.6 ? 600 : 500}
                style={{ fill: k > 0.6 ? "#fff" : FG, fillOpacity: k > 0.6 ? 1 : 0.78, pointerEvents: "none", transition: "fill 200ms" }}
              >
                {reg.label}
              </text>
            </g>
          )
        })}
      </g>
    )
  }

  const nodesFor = (side: Side) => {
    const list = side === "in" ? d.inputNeurons : d.outputNeurons
    const ys = nodeYs(list.length)
    const color = colorOf(side)
    return list.map((nc, n) => {
      const total = nodeTotals[side][n]
      const r = nodeRadius(total, maxNode)
      const y = ys[n]
      const x = NODE_X[side]
      const f: Focus = { kind: "neuron", id: nc.id, side }
      const lit = !!active && active[side].neurons.has(n)
      const off = !!active && !lit
      const empty = total < 0.5
      const io = intro("cae-pop", 900 + n * 70, { opacity: off ? 0.35 : 1, transition: "opacity 240ms" })
      return (
        <g
          key={nc.id}
          className={io.className}
          style={{ ...io.style, cursor: "pointer" }}
          onPointerEnter={(e) => enter(f, e)}
          onPointerMove={movePointer}
          onPointerLeave={leave}
          onClick={(e) => {
            e.stopPropagation()
            pin(f)
          }}
        >
          <circle cx={x} cy={y} r={Math.max(r + 8, 16)} fill="transparent" />
          <circle cx={x} cy={y} r={r} style={{ fill: BG }} />
          <circle
            cx={x}
            cy={y}
            r={r}
            strokeWidth={empty ? 1.5 : lit ? 2.5 : 2}
            style={{ fill: color, fillOpacity: empty ? 0 : lit ? 0.22 : 0.1, stroke: empty ? MUTED : color, strokeOpacity: empty ? 0.6 : 1, transition: "fill-opacity 240ms" }}
          />
          <text x={x} y={y - r - 9} textAnchor="middle" fontSize={11.5} fontWeight={600} style={{ fill: empty ? MUTED : FG }}>
            {nc.label}
          </text>
          <text x={x} y={y + r + 15} textAnchor="middle" fontSize={10} style={{ fill: MUTED, fontVariantNumeric: "tabular-nums" }}>
            {empty ? "—" : cf.format(total)}
          </text>
        </g>
      )
    })
  }

  const legend = (side: Side) => {
    const max = side === "in" ? maxIn : maxOut
    const x = side === "in" ? 40 : STAGE.W - 40 - 150
    const y = 762
    const gid = "cae-grad-" + side
    return (
      <g key={"legend" + side} {...intro("cae-fade", 1200, {})}>
        <defs>
          <linearGradient id={gid} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor={colorOf(side)} stopOpacity={0.1} />
            <stop offset="1" stopColor={colorOf(side)} stopOpacity={1} />
          </linearGradient>
        </defs>
        <text x={x} y={y - 10} fontSize={10} style={{ fill: MUTED }}>
          {(side === "in" ? L.input : L.output) + " " + units + " per region"}
        </text>
        <rect x={x} y={y - 3} width={150} height={6} rx={3} style={{ fill: TILE }} />
        <rect x={x} y={y - 3} width={150} height={6} rx={3} fill={"url(#" + gid + ")"} />
        <text x={x} y={y + 16} fontSize={10} style={{ fill: MUTED, fontVariantNumeric: "tabular-nums" }}>0</text>
        <text x={x + 150} y={y + 16} textAnchor="end" fontSize={10} style={{ fill: MUTED, fontVariantNumeric: "tabular-nums" }}>
          {cf.format(max)}
        </text>
      </g>
    )
  }

  const announce = focus ? describe(focus) : selLabel + " selected"
  function describe(f: Focus) {
    if (f.kind === "neuron") {
      const list = f.side === "in" ? d.inputNeurons : d.outputNeurons
      const n = list.findIndex((x) => x.id === f.id)
      return n < 0 ? "" : list[n].label + ": " + fmt(nodeTotals[f.side][n]) + " " + units
    }
    const rs = f.kind === "region" ? [regionIds.indexOf(f.id)] : ((f.kind === "group" ? layout.groups : layout.supers).find((g) => g.id === f.id)?.regions ?? [])
    const s = statsFor(rs.filter((i) => i >= 0))
    return f.id + ": " + fmt(s.inS) + " input, " + fmt(s.outS) + " output " + units
  }

  // ---- render ----
  const inner: React.CSSProperties = {
    position: "absolute",
    left: 0,
    top: 0,
    width: STAGE.W,
    height: STAGE.H,
    transformOrigin: "0 0",
    transform: "translateX(" + f2(-view.x0 * scale) + "px) scale(" + scale + ")",
  }
  const titleAt = (side: Side) =>
    side === "in"
      ? { x: COLUMN.x - 26, anchor: "end" as const }
      : { x: COLUMN.x + COLUMN.w + 26, anchor: "start" as const }

  const rowBase =
    "flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-[6px] px-2.5 text-left outline-none transition-[background-color,color,box-shadow] duration-200 motion-reduce:transition-none focus-visible:ring-2"

  return (
    <div
      className={"cae-root relative w-full overflow-hidden rounded-2xl border " + className}
      style={{ background: BG, color: FG, borderColor: BORDER }}
    >
      <style>{CSS}</style>
      {compact ? (
        <div className="flex justify-center px-4 pt-4">
          <div className="inline-flex rounded-full border p-0.5 text-[12px]" style={{ borderColor: BORDER }} role="group" aria-label="Arc">
            {(["in", "out"] as Side[]).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={compactSide === s}
                onClick={() => setCompactSide(s)}
                className="cursor-pointer rounded-full px-3.5 py-1 font-medium transition-colors duration-200 motion-reduce:transition-none"
                style={compactSide === s ? { background: colorOf(s), color: "#fff" } : { color: MUTED }}
              >
                {(s === "in" ? L.input : L.output) + "s"}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div ref={wrapRef} className="w-full overflow-x-auto overflow-y-hidden" style={{ scrollbarWidth: "thin" }}>
        <div
          ref={stageRef}
          className="relative mx-auto"
          style={{ width: stageW, height: stageH }}
          onPointerLeave={leave}
        >
          <div style={inner}>
            <svg
              width={STAGE.W}
              height={STAGE.H}
              viewBox={"0 0 " + STAGE.W + " " + STAGE.H}
              role="group"
              aria-label={"Connections of " + selLabel + ": " + fmt(totIn) + " input and " + fmt(totOut) + " output " + units}
              style={{ display: "block", maxWidth: "none", overflow: "visible", userSelect: "none" }}
              onClick={() => setPinned(null)}
            >
              {sides.map((s) => (
                <g key={"links" + s}>{linksFor(s)}</g>
              ))}
              {sides.map(arcSide)}
              {sides.map((s) => (
                <g key={"nodes" + s}>{nodesFor(s)}</g>
              ))}

              {sides.map((s) => {
                const t = titleAt(s)
                return (
                  <text key={"t" + s} x={t.x} y={52} textAnchor={t.anchor} fontSize={13} {...intro("cae-fade", 80, { fill: colorOf(s) })}>
                    <tspan fontSize={11}>{s === "in" ? L.input : L.output} </tspan>
                    <tspan fontWeight={700}>{L.regions}</tspan>
                  </text>
                )
              })}
              {sides.map((s) => {
                const x = s === "in" ? 34 : STAGE.W - 34
                return (
                  <text
                    key={"v" + s}
                    x={x}
                    y={STAGE.CY}
                    transform={"rotate(" + (s === "in" ? -90 : 90) + " " + x + " " + STAGE.CY + ")"}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={13}
                    {...intro("cae-fade", 900, { fill: colorOf(s) })}
                  >
                    <tspan fontSize={11}>{s === "in" ? L.input : L.output} </tspan>
                    <tspan fontWeight={700}>{L.neurons}</tspan>
                  </text>
                )
              })}
              {sides.map(legend)}
            </svg>

            {/* the column of cell types */}
            <div
              className={"absolute text-center text-[14px] font-bold " + (intro("cae-fade", 0).className ?? "")}
              style={intro("cae-fade", 0, { left: COLUMN.x, top: 34, width: COLUMN.w, color: cAccent }).style}
            >
              {L.cellTypes}
            </div>
            <div
              ref={colRef}
              className="cae-col absolute overflow-y-auto overscroll-contain"
              onScroll={syncFade}
              onKeyDown={onColumnKey}
              role="tree"
              aria-label={L.cellTypes}
              style={{
                left: COLUMN.x - 4,
                top: COLUMN.y,
                width: COLUMN.w + 8,
                height: COLUMN.h,
                padding: "2px 4px",
                WebkitMaskImage: fadeMask(fade.top, fade.bottom),
                maskImage: fadeMask(fade.top, fade.bottom),
              }}
            >
              {d.cellTypes.map((g, gi) => {
                const open = expanded.has(g.id)
                const isSel = sel === g.id
                const holdsSel = selHit?.parent?.id === g.id
                const kids = g.children ?? []
                const io = intro("cae-fade", 120 + gi * 60, {})
                return (
                  <div key={g.id} className={"mb-[3px] " + (io.className ?? "")} style={io.style} role="none">
                    <div className="flex items-stretch gap-[3px]" role="none">
                      <button
                        type="button"
                        data-row={g.id}
                        role="treeitem"
                        aria-selected={isSel}
                        aria-expanded={kids.length ? open : undefined}
                        tabIndex={isSel || (!selHit && gi === 0) || (holdsSel && !open) ? 0 : -1}
                        onClick={() => select(g.id)}
                        className={rowBase + " h-[24px] justify-center text-[12px] font-bold tracking-[0.02em]"}
                        style={{
                          background: isSel ? cAccent : mix(11),
                          color: isSel ? "#fff" : FG,
                          boxShadow: isSel ? "0 6px 16px -8px " + cAccent : holdsSel ? "inset 3px 0 0 " + cAccent : "none",
                          ["--tw-ring-color" as string]: cAccent,
                        }}
                      >
                        <span className="truncate">{g.label}</span>
                      </button>
                      {kids.length ? (
                        <button
                          type="button"
                          tabIndex={-1}
                          aria-label={(open ? "Collapse " : "Expand ") + g.label}
                          onClick={() => toggle(g.id)}
                          className="relative flex w-[24px] shrink-0 cursor-pointer items-center justify-center rounded-[6px] outline-none transition-colors duration-200 motion-reduce:transition-none"
                          style={{ background: mix(open ? 7 : 11), color: FG }}
                        >
                          <span className="absolute h-[1.6px] w-[9px] rounded-full" style={{ background: "currentColor" }} />
                          <span
                            className="absolute h-[9px] w-[1.6px] rounded-full transition-transform duration-300 motion-reduce:transition-none"
                            style={{ background: "currentColor", transform: open ? "scaleY(0) rotate(90deg)" : "none" }}
                          />
                        </button>
                      ) : null}
                    </div>
                    {kids.length ? (
                      <div
                        className="grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none"
                        style={{ gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0 }}
                        role="group"
                      >
                        <div className="min-h-0 overflow-hidden" role="none">
                          <div className="grid gap-[2px] pt-[3px]" role="none">
                            {kids.map((c) => {
                              const on = sel === c.id
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  data-row={c.id}
                                  role="treeitem"
                                  aria-selected={on}
                                  tabIndex={on ? 0 : -1}
                                  disabled={!open}
                                  onClick={() => select(c.id)}
                                  className={rowBase + " h-[22px] justify-between text-[11.5px] hover:brightness-[0.97]"}
                                  style={{
                                    background: on ? cAccent : mix(4.5),
                                    color: on ? "#fff" : FG,
                                    boxShadow: on ? "0 6px 16px -8px " + cAccent : "none",
                                    ["--tw-ring-color" as string]: cAccent,
                                  }}
                                >
                                  <span className="truncate font-medium">{c.label}</span>
                                  {c.hint ? (
                                    <span className="shrink-0 truncate text-[10px]" style={{ color: on ? "rgba(255,255,255,.78)" : MUTED }}>
                                      {c.hint}
                                    </span>
                                  ) : null}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>

            {/* what is selected */}
            <div
              className={"absolute text-center " + (intro("cae-fade", 700).className ?? "")}
              style={intro("cae-fade", 700, { left: STAGE.CX - 112, top: COLUMN.y + COLUMN.h + 14, width: 224 }).style}
            >
              <div className="flex items-baseline justify-center gap-1.5">
                <span className="text-[17px] font-semibold tracking-tight" style={{ color: FG }}>{selLabel}</span>
                {selType?.hint ? <span className="text-[11px]" style={{ color: MUTED }}>{selType.hint}</span> : null}
              </div>
              <div className="mt-0.5 text-[11px] tabular-nums" style={{ color: MUTED }}>
                {fmt(count)} {count === 1 ? "neuron" : "neurons"}
                <span className="mx-1.5">·</span>
                <span style={{ color: cIn }}>{cf.format(totIn)} in</span>
                <span className="mx-1.5">·</span>
                <span style={{ color: cOut }}>{cf.format(totOut)} out</span>
              </div>
              <div className="mx-auto mt-2 flex h-[4px] w-[180px] overflow-hidden rounded-full" style={{ background: TILE }}>
                <span style={{ width: (totIn + totOut > 0 ? (totIn / (totIn + totOut)) * 100 : 50) + "%", background: cIn }} />
                <span className="flex-1" style={{ background: cOut }} />
              </div>
            </div>
          </div>

          {/* tooltip, in real pixels so it stays legible at any scale */}
          <div
            className="pointer-events-none absolute z-10 rounded-xl border p-3 text-[11.5px] leading-snug shadow-[0_18px_40px_-16px_rgba(0,0,0,.35)] transition-[opacity,transform] duration-200 motion-reduce:transition-none"
            style={{
              left: tipX,
              top: tipY,
              width: TIP_W,
              background: "color-mix(in oklab, " + BG + " 94%, transparent)",
              borderColor: BORDER,
              backdropFilter: "blur(8px)",
              opacity: focus ? 1 : 0,
              transform: focus ? "none" : "translateY(4px)",
            }}
            aria-hidden="true"
          >
            {tip ? tooltip(tip.f) : null}
            {pinned && tip && sameFocus(pinned, tip.f) ? (
              <div className="mt-2.5 flex items-center gap-1.5 text-[10.5px]" style={{ color: MUTED }}>
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: colorOf(tip.f.side) }} />
                Pinned · click again or press Esc to release
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="sr-only" aria-live="polite">
        {announce}
      </div>
    </div>
  )
}

function fadeMask(top: boolean, bottom: boolean) {
  return (
    "linear-gradient(to bottom, " +
    (top ? "transparent 0, #000 22px" : "#000 0") +
    ", " +
    (bottom ? "#000 calc(100% - 22px), transparent 100%" : "#000 100%") +
    ")"
  )
}

function CSS_ESCAPE(s: string) {
  return typeof window !== "undefined" && window.CSS?.escape ? window.CSS.escape(s) : s.replace(/["\\]/g, "\\$&")
}
