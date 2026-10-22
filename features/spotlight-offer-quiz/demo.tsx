import * as React from "react"
import SpotlightOfferQuiz from "@/components/ui/spotlight-offer-quiz"

export default function SpotlightOfferQuizDemo() {
  const [open, setOpen] = React.useState(true)
  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center gap-4 bg-background p-6 text-center text-foreground">
      <p className="text-sm text-muted-foreground">Halden &amp; Co.</p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-transform active:scale-[0.97]"
      >
        Show the gift-finder offer
      </button>
      <SpotlightOfferQuiz
        open={open}
        onOpenChange={setOpen}
        onClaim={async ({ email, option }) => {
          await new Promise((r) => setTimeout(r, 900))
          console.log("claimed", email, option.pick)
        }}
      />
    </div>
  )
}
