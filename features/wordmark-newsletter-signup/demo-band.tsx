import WordmarkNewsletterSignup from "@/components/ui/wordmark-newsletter-signup"

export default function WordmarkNewsletterSignupBandDemo() {
  return (
    <div className="w-full">
      <WordmarkNewsletterSignup
        variant="band"
        preset="mustard"
        brand="Mustard Club"
        successWord="Thank you"
        headline="The jar list, once a month"
        buttonLabel="Subscribe"
        consent="Monthly email about new jars. Unsubscribe in one click."
        requireConsent={false}
        proof="4,312 members"
        successTitle="You're a member"
        successCopy="The next jar list goes out on the 1st."
        successAction={{ label: "See this month's jars", href: "#jars" }}
      />
    </div>
  )
}
