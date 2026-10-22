"use client"

import AgentConsoleTemplate, {
  planMachine,
  simulateState,
  wait,
  type Machine,
  type Planner,
  type StateContext,
  type StateExecutor,
} from "@/components/ui/agent-console-template"

// A live agent, wired the way a real one would be: an async planner that
// takes a moment to think, and an executor that does real work in each state.
// Here the work is an accessibility audit of the page this demo is running
// on: it counts real elements, checks real labels and reads the real heading
// outline. Anything that is not an audit falls back to the scripted simulation.

const AUDIT: Machine = {
  name: "AuditThisPage",
  maxVisits: 2,
  store: [
    { key: "scope", kind: "set", value: "the whole page" },
    { key: "inventory" },
    { key: "unlabeled" },
    { key: "labelsOk", kind: "observed" },
    { key: "outline" },
    { key: "report" },
  ],
  states: [
    {
      id: "ScanDocument",
      prompt: "Count what the page is made of: buttons, links, form fields, headings and landmarks. Record the counts in inventory.",
      writes: ["inventory"],
      next: "CheckLabels",
    },
    {
      id: "CheckLabels",
      prompt: "Find every visible control with no accessible name. Record the count in unlabeled, and set labelsOk only if it is zero.",
      writes: ["unlabeled", "labelsOk"],
      when: [{ key: "labelsOk", to: "CheckHeadings" }],
      next: "ListOffenders",
    },
    {
      id: "ListOffenders",
      prompt: "List each unlabeled control with enough context to find it in the code.",
      next: "CheckHeadings",
    },
    {
      id: "CheckHeadings",
      prompt: "Read the heading outline in document order and flag any skipped levels. Record a summary in outline.",
      writes: ["outline"],
      next: "WriteReport",
    },
    {
      id: "WriteReport",
      prompt: "Summarise what was found in report: what is fine, what needs fixing, and where.",
      writes: ["report"],
      next: "Done",
    },
    { id: "Done", final: true },
    { id: "Abandoned", final: true, outcome: "failure" },
  ],
}

const visible = (list: NodeListOf<Element>) =>
  Array.from(list).filter((el) => el.getClientRects().length > 0 && !el.closest("[aria-hidden='true'], [hidden]"))

function accessibleName(el: Element): string {
  const label = el.getAttribute("aria-label")
  if (label && label.trim()) return label.trim()
  const by = el.getAttribute("aria-labelledby")
  if (by) {
    const text = by
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent ?? "")
      .join(" ")
      .trim()
    if (text) return text
  }
  if ((el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) && el.labels) {
    const text = Array.from(el.labels)
      .map((l) => l.textContent ?? "")
      .join(" ")
      .trim()
    if (text) return text
  }
  const text = (el.textContent ?? "").trim()
  if (text) return text
  return el.getAttribute("title") ?? el.querySelector("img[alt]")?.getAttribute("alt") ?? ""
}

const describe = (el: Element) =>
  el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (el.classList[0] ? "." + el.classList[0] : "")

let unlabeled: Element[] = []

const AUDITORS: Record<string, (ctx: StateContext) => Promise<void>> = {
  async ScanDocument(ctx) {
    const parts: [string, string][] = [
      ["buttons", "button, [role='button']"],
      ["links", "a[href]"],
      ["form fields", "input:not([type='hidden']), textarea, select"],
      ["headings", "h1, h2, h3, h4, h5, h6"],
      ["landmarks", "main, nav, aside, header, footer, [role='region'], section[aria-label]"],
    ]
    const found: string[] = []
    for (const [name, selector] of parts) {
      await wait(380, ctx.signal)
      const n = visible(document.querySelectorAll(selector)).length
      ctx.log("count " + name + ": " + n)
      found.push(n + " " + name)
    }
    ctx.write("inventory", found.join(", "))
  },
  async CheckLabels(ctx) {
    await wait(420, ctx.signal)
    const controls = visible(document.querySelectorAll("button, [role='button'], a[href], input:not([type='hidden']), textarea, select"))
    ctx.log("check " + controls.length + " controls for an accessible name")
    unlabeled = controls.filter((el) => !accessibleName(el))
    await wait(600, ctx.signal)
    ctx.log(unlabeled.length ? unlabeled.length + " of " + controls.length + " controls have no name" : "every control has a name: passed")
    ctx.write("unlabeled", unlabeled.length)
    await wait(300, ctx.signal)
    ctx.write("labelsOk", unlabeled.length === 0)
  },
  async ListOffenders(ctx) {
    for (const el of unlabeled.slice(0, 8)) {
      await wait(260, ctx.signal)
      ctx.log("find " + describe(el))
    }
    if (unlabeled.length > 8) ctx.log("and " + (unlabeled.length - 8) + " more")
  },
  async CheckHeadings(ctx) {
    const headings = visible(document.querySelectorAll("h1, h2, h3, h4, h5, h6"))
    let previous = 0
    let skipped = 0
    for (const [i, h] of headings.entries()) {
      const level = Number(h.tagName.charAt(1))
      if (previous && level > previous + 1) skipped++
      previous = level
      if (i < 10) {
        await wait(200, ctx.signal)
        ctx.log("h" + level + "  " + (h.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 64))
      }
    }
    const noH1 = !headings.some((h) => h.tagName === "H1")
    ctx.write("outline", headings.length + " headings, " + skipped + " skipped levels" + (noH1 ? ", no h1" : ""))
  },
  async WriteReport(ctx) {
    await wait(500, ctx.signal)
    ctx.log("write the report from inventory, unlabeled and outline")
    const s = ctx.store
    ctx.write(
      "report",
      "Scanned " + s.inventory + ". " + (s.labelsOk ? "Every control has a name." : s.unlabeled + " controls need a name.") + " Outline: " + s.outline + ".",
    )
  },
}

const planner: Planner = async (prompt, { signal }) => {
  await wait(1200, signal)
  return /audit|accessib|a11y|label|heading/i.test(prompt) ? AUDIT : planMachine(prompt)
}

const executor: StateExecutor = (ctx) => {
  const real = ctx.machine.name === AUDIT.name ? AUDITORS[ctx.state.id] : undefined
  return real ? real(ctx) : simulateState(ctx, 1.5)
}

export default function AgentConsoleTemplateLiveDemo() {
  return (
    <AgentConsoleTemplate
      brand="Lumen"
      project="this-page"
      cwd="window.document"
      theme="lilac"
      planner={planner}
      executor={executor}
      storageKey="agent-console-template-live"
      sessions={[{ id: "audit", prompt: "Audit this page for accessibility: unlabeled controls, the heading outline, and a short report." }]}
      suggestions={[
        "Audit this page for accessibility again, and list anything unlabeled.",
        "Build a CLI that renames photos by the date they were taken.",
        "Research three ways to cache our API and recommend one.",
      ]}
    />
  )
}
