"use client"

import AgentConsoleTemplate from "@/components/ui/agent-console-template"

// The whole app, full page. Mid-run on the first visit: BuildTodoCli has just
// been approved, a second session waits for approval and a third is done.
// Everything you do after that is saved in this browser.
export default function AgentConsoleTemplateDemo() {
  return <AgentConsoleTemplate />
}
