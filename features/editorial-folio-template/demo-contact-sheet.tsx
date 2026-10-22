"use client"

import EditorialFolioTemplate from "@/components/ui/editorial-folio-template"

// Opens on the contact sheet: every sheet at once, the way a folio is pinned
// up for review. Pick one to open it.
export default function DemoContactSheet() {
  return <EditorialFolioTemplate startInOverview />
}
