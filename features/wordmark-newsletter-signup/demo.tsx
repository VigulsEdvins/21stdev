import WordmarkNewsletterSignup from "@/components/ui/wordmark-newsletter-signup"

export default function WordmarkNewsletterSignupDemo() {
  return (
    <WordmarkNewsletterSignup
      brand="Big Sunday Sauce Co."
      successWord="See you Sunday"
      headline="One recipe every Sunday, straight to your inbox"
      description="Sauces, sides and the odd kitchen disaster. Free, weekly, and one click to leave."
      topics={["Recipes", "New sauces", "Pop-ups"]}
      defaultTopics={["Recipes"]}
      proof="Read by 18,240 home cooks"
      successAction={{ label: "Read last week's recipe", href: "#latest" }}
    />
  )
}
