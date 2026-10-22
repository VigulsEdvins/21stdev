"use client"

import AgentConsoleTemplate from "@/components/ui/agent-console-template"

// A blank start on paper. Pick a suggestion or type a task: the built-in
// planner writes a machine for it, and it waits for your approval.
export default function AgentConsoleTemplateBlankDemo() {
  return (
    <AgentConsoleTemplate
      sessions={[]}
      theme="paper"
      brand="Thimble"
      project="side-quests"
      cwd="~/code/side-quests"
      storageKey="agent-console-template-blank"
    />
  )
}
