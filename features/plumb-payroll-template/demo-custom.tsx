"use client"

import PlumbPayrollTemplate from "@/components/ui/plumb-payroll-template"

// Everything is a prop. The same page for a different payroll company on the
// harbor palette: its own tour order and copy, its own payrun, customers and
// questions, and real handlers for approving payroll and booking a demo.
export default function DemoCustom() {
  return (
    <PlumbPayrollTemplate
      brand="Keelson"
      palette="harbor"
      autoplay={9000}
      hero={{
        title: "Payroll for crews\nthat never stand still.",
        text: "Keelson pays field crews across every job, union and state line, files the certified reports for you, and books every dollar to the job it was earned on.",
        link: { label: "Take the tour", href: "#showcase" },
      }}
      tabs={[
        { kind: "costs", label: "Job costing", title: "Every hour, costed\nto the job.", text: "Wages, taxes, fringes and comp are on the job the moment you approve, so the margin you see is the margin you have." },
        { kind: "run", label: "Payroll", title: "Approve in one pass.", text: "Keelson flags the duplicates and the odd deductions before you approve, and shows exactly what each fix changes." },
        { kind: "compliance", label: "Reporting", title: "Reports that file\nthemselves.", text: "Certified payroll, state portals and quarterly returns go out in the format each agency expects." },
      ]}
      payrun={{
        period: "Jun 2 - Jun 8",
        meta: [
          { label: "Pay schedule", value: "Weekly" },
          { label: "Deadline", value: "3pm ET" },
          { label: "Bank account", value: "#2291" },
          { label: "Payday", value: "Jun 13" },
        ],
        alerts: [
          { id: "ot", title: "Overtime missing on 3 timesheets.", text: "Check hours over 40.", fixed: "Overtime added for 3 employees.", delta: { "Gross pay": 846.75, "Net pay": 652.0, "Employee gross earnings": 846.75, "Direct deposits": 652.0 } },
        ],
        stats: [
          { label: "Gross pay", value: 96412.5 },
          { label: "Net pay", value: 74108.92 },
          { label: "Debit date", value: "Jun 11" },
          { label: "Paper checks", value: 0 },
        ],
        left: [
          { label: "Employee gross earnings", value: 88940.1 },
          { label: "Per diem", value: 7472.4 },
          { label: "Contractor gross earnings", value: 0 },
        ],
        right: [
          { label: "Direct deposits", value: 74108.92 },
          { label: "Employee taxes", value: 14321.58 },
          { label: "Company taxes", value: 6977.12 },
        ],
      }}
      customers={{
        title: "Paying crews for 300+ marine and civil contractors",
        names: [
          { name: "Tidewater Civil", trade: "Heavy civil" },
          { name: "BRACKET MARINE", trade: "Marine construction" },
          { name: "Pier & Pile", trade: "Foundations" },
          { name: "Lantern Electric", trade: "Electrical" },
          { name: "Gullwing Paving", trade: "Paving" },
          { name: "Shoal Mechanical", trade: "Mechanical" },
        ],
      }}
      stats={[
        { value: 312, label: "Contractors on Keelson" },
        { value: 11, suffix: " min", label: "Average weekly payrun" },
        { value: 0, label: "Late certified reports this year" },
        { value: 4.9, suffix: "/5", decimals: 1, label: "Average support rating" },
      ]}
      faq={{
        title: "Good questions.",
        items: [
          { q: "Do you support per diem?", a: "Yes. Per diem is paid tax-free up to the federal rate for the job's location and taxed above it, automatically." },
          { q: "Can foremen approve time?", a: "Foremen approve their crew's hours from the app; you see who approved what, and when." },
        ],
      }}
      cta={{ title: "See Keelson on your\nown payroll.", text: "Bring last week's timesheets. We'll run them live.", button: "Book a walkthrough" }}
      footer={{ note: "© 2026 Keelson Payroll Co." }}
      onApprove={async (run) => {
        console.log("approved", run)
        await new Promise((r) => setTimeout(r, 800))
      }}
      onBookDemo={async (data) => {
        console.log("demo", data)
        await new Promise((r) => setTimeout(r, 700))
      }}
    />
  )
}
