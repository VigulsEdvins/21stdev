import SlitTypeFaq from "@/components/ui/slit-type-faq"

export default function SlitTypeFaqCobaltDemo() {
  return (
    <div className="w-full">
      <SlitTypeFaq
        preset="cobalt"
        headline={"Asked in\nweek one"}
        intro="Rostra plans shifts for restaurants and bars across every site you run. Here is what owners ask before they move their team over."
        ticker={["One rota for every site", "Shift swaps without group chats", "Hours exported to payroll", "Free for one location"]}
        categories={["Pricing", "Setup", "Payroll"]}
        defaultOpen="can-i-import-last-month-s-rota-from-a-spreadsheet"
        syncHash
        contact={{ prompt: "Want a walkthrough?", label: "Book a 20-minute call", href: "#book" }}
        items={[
          {
            category: "Pricing",
            question: "What does Rostra cost?",
            answer: "Free for one location with up to 15 staff. After that it is £3 per person on the rota per month, billed monthly, with no setup fee.",
          },
          {
            category: "Setup",
            question: "Can I import last month's rota from a spreadsheet?",
            answer: (
              <>
                <p>Yes. Drop in an .xlsx or .csv export and Rostra matches names to staff and times to shifts. Anything it cannot read is listed for you to fix by hand.</p>
                <p>
                  Most kitchens are live the same afternoon. The <a href="#import-guide">import guide</a> shows the column layout it expects.
                </p>
              </>
            ),
          },
          {
            category: "Setup",
            question: "Do my staff need to download an app?",
            answer: "No. Staff get their shifts by text message and can open the rota in any phone browser. The app is there for people who want notifications.",
          },
          {
            category: "Setup",
            question: "How do shift swaps work?",
            answer: "A server offers a shift, a colleague with the right role accepts, and the manager on duty approves with one tap. The rota and both people's hours update together.",
          },
          {
            category: "Payroll",
            question: "Which payroll tools does it export to?",
            answer: "Approved hours export as a CSV laid out for the common UK payroll tools, or as a plain timesheet per person. Tips and breaks are separate columns.",
          },
          {
            category: "Payroll",
            question: "Does it track breaks and overtime?",
            answer: "Breaks follow the rules you set per site, and any shift that pushes someone over their contracted hours is flagged before you publish the rota.",
          },
          {
            category: "Pricing",
            question: "Can I cancel at any time?",
            answer: "Yes, from the billing page. Your rotas and timesheets stay downloadable for twelve months after you leave.",
          },
        ]}
      />
    </div>
  )
}
