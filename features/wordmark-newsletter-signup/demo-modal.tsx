import * as React from "react"
import WordmarkNewsletterSignup from "@/components/ui/wordmark-newsletter-signup"

export default function WordmarkNewsletterSignupModalDemo() {
  const [open, setOpen] = React.useState(true)
  return (
    <div className="grid min-h-svh w-full place-items-center bg-background p-6 text-foreground">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border-2 border-foreground px-5 py-3 text-sm font-bold uppercase tracking-wider"
      >
        Open the signup
      </button>
      <WordmarkNewsletterSignup
        variant="modal"
        open={open}
        onOpenChange={setOpen}
        preset="pickle"
        brand="Brine House"
        successWord="In the brine"
        headline="Get first dibs on the monthly pickle drop"
        description="Twelve jars a month, gone by lunch. Subscribers hear about them a day early."
        buttonLabel="Count me in"
        consent="Send me the drop email and nothing else."
        successTitle="You're on the drop list"
        successCopy={(email) => (
          <>
            Next drop is the first Friday of the month. Watch <strong>{email}</strong> the day before.
          </>
        )}
        onSubscribe={async ({ email }) => {
          await new Promise((r) => setTimeout(r, 900))
          if (email.endsWith("@example.com")) throw new Error("That domain bounces our mail. Try a personal address.")
        }}
      />
    </div>
  )
}
