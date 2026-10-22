"use client"

import AgentConsoleTemplate, { type Machine } from "@/components/ui/agent-console-template"

// Your own brand, theme and machine: a release pipeline, waiting on approval,
// played back at double speed.
const SHIP_RELEASE: Machine = {
  name: "ShipRelease",
  maxVisits: 2,
  store: [
    { key: "releaseTag", kind: "set", value: "v4.12.0" },
    { key: "testsGreen", kind: "observed" },
    { key: "failingSuite" },
    { key: "rolloutPercent" },
    { key: "crashFree", kind: "observed" },
  ],
  states: [
    {
      id: "CutReleaseBranch",
      prompt: "Cut a release branch for releaseTag from main, bump the version and write the changelog from merged pull requests.",
      next: "RunTestMatrix",
      steps: ["$ git switch -c release/v4.12.0", "write CHANGELOG.md: 14 changes, 2 breaking", "$ git push -u origin release/v4.12.0"],
    },
    {
      id: "RunTestMatrix",
      prompt: "Run the full matrix: unit, integration and the device farm. Set testsGreen only if all three pass.",
      writes: ["testsGreen"],
      when: [{ key: "testsGreen", to: "StageRollout" }],
      next: "TriageFailures",
      steps: [
        ["$ ci run matrix --ref release/v4.12.0", "unit 812 passed", "devices: 3 of 40 failed on Android 12", "matrix failed"],
        ["$ ci run matrix --ref release/v4.12.0", "unit 812 passed", "devices: 40 of 40 passed", "matrix passed"],
      ],
      values: { testsGreen: [false, true] },
    },
    {
      id: "TriageFailures",
      prompt: "Find the failing suite, record it in failingSuite, fix it on the release branch and go back to the matrix.",
      writes: ["failingSuite"],
      next: "RunTestMatrix",
      steps: ["read devices/android-12.log", "camera permission prompt changed copy", "patch the selector in onboarding.spec.ts"],
      values: { failingSuite: "onboarding.spec.ts on Android 12: the permission prompt copy changed." },
    },
    {
      id: "StageRollout",
      prompt: "Release to 5% of users and record the share in rolloutPercent.",
      writes: ["rolloutPercent"],
      next: "WatchMetrics",
      steps: ["$ store rollout --percent 5", "rollout live in 4 regions"],
      values: { rolloutPercent: 5 },
    },
    {
      id: "WatchMetrics",
      prompt: "Watch crash-free sessions for an hour. Set crashFree only if it stays above 99.5%.",
      writes: ["crashFree"],
      when: [{ key: "crashFree", to: "PromoteToAll" }],
      next: "RolledBack",
      steps: ["watch crash-free sessions: 99.82%", "no new top crashes"],
      values: { crashFree: true },
    },
    {
      id: "PromoteToAll",
      prompt: "Promote the release to everyone and post the changelog in #releases.",
      next: "Shipped",
      steps: ["$ store rollout --percent 100", "post the changelog to #releases"],
    },
    { id: "Shipped", final: true },
    { id: "RolledBack", final: true, outcome: "failure" },
  ],
}

export default function AgentConsoleTemplateNightDemo() {
  return (
    <AgentConsoleTemplate
      brand="Lantern"
      project="mobile-app"
      cwd="~/work/mobile-app"
      theme="night"
      speed={2}
      storageKey="agent-console-template-night"
      sessions={[
        { id: "release", prompt: "Ship v4.12.0 to the app stores: test it, roll it out slowly, and back out if crashes climb.", machine: SHIP_RELEASE, status: "awaiting" },
        { id: "flaky", prompt: "Fix the flaky checkout test and prove it passes ten times in a row.", status: "done" },
      ]}
    />
  )
}
