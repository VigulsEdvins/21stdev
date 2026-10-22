import PostmarkCta from "@/components/ui/postmark-cta"

export default function PostmarkCtaDemo() {
  return (
    <PostmarkCta
      preset="voyage"
      onCtaClick={() => console.log("open the trip planner")}
      onSecondaryClick={() => console.log("browse places")}
    />
  )
}
