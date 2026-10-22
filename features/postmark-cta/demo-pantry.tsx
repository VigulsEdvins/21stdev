import PostmarkCta from "@/components/ui/postmark-cta"

export default function PostmarkCtaPantryDemo() {
  return (
    <div className="w-full">
      <PostmarkCta
        preset="pantry"
        postmark={{ top: "GREENLANE BOX", bottom: "PACKED TODAY" }}
        onCtaClick={() => console.log("start checkout")}
        onSecondaryClick={() => console.log("open the menu")}
      />
    </div>
  )
}
