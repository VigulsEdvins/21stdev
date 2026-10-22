"use client"

import TileScrollbar from "@/components/ui/tile-scrollbar"

const ARTICLE = [
  {
    section: "Before you go",
    heading: "Before you go",
    body: [
      "Everything here depends on the tide. Check the tide table for your stretch of coast and aim to arrive an hour or two before low water, then follow the sea out as it drops. The biggest tides of the month, the spring tides, fall around the new and full moon, and they uncover ground you won't otherwise see.",
      "Wear shoes with grip that you don't mind soaking. Wet weed is slicker than ice, and barnacles will cut bare feet. Keep an eye on the water behind you as well as the pool in front of you: once the tide turns it can fill channels quickly and cut you off from the beach.",
      "Bring a shallow white tray or a clear pot rather than a net. Nets tear delicate animals. A tray of seawater lets you look closely for a minute before putting everything back.",
    ],
  },
  {
    section: "Splash zone",
    heading: "The splash zone",
    body: [
      "The top of the shore is barely sea at all. Waves only reach it in storms and at the highest tides, so the rocks here spend most of their lives dry, baked in summer and frozen in winter.",
      "Look for lichens first. Bright orange-yellow patches sit highest, where only spray arrives. Below them the rock is often stained with a black crust that looks like spilled tar. It is also a lichen, and it marks roughly where the sea begins to reach regularly.",
      "Run your fingers along the cracks and you may find small periwinkles, no bigger than a lentil. They can last for weeks out of water, sealed inside their shells behind a little door, waiting for the next big wave.",
    ],
  },
  {
    section: "Upper shore",
    heading: "The upper shore",
    body: [
      "Barnacles cover the rocks here in rough grey crusts. It is hard to believe they are relatives of crabs and shrimps, but that is what they are: animals that glued themselves head-down to the rock as larvae and never moved again. When the tide covers them, the plates at the top open and feathery legs sweep the water for food.",
      "Limpets share the same rocks. Each one grinds a shallow scar into the stone that fits its shell exactly, grazes the surrounding rock while the tide is in, and returns to the same spot before the water drops. Clamped onto its own scar, a limpet is almost impossible to shift, so leave them be.",
      "The seaweed at this height is channel wrack, short and curled into little gutters that hold water. It can dry to a black crisp between tides and recover within minutes when the sea returns.",
    ],
  },
  {
    section: "Middle shore",
    heading: "The middle shore",
    body: [
      "The middle of the shore is where the pools get interesting. Bladderwrack hangs from the rocks here, easy to recognise by the paired air pockets along its fronds that lift it toward the light when the tide is in.",
      "Look in shaded pools and on damp rock for beadlet anemones. Out of water they pull in their tentacles and sit as glossy red blobs, like dropped jelly sweets. Underwater they open into a ring of tentacles, and around the top of the body you may spot a row of small blue beads. Those are for fighting: neighbouring anemones will push against each other over space.",
      "Sit still at the edge of a pool for a few minutes before touching anything. Shrimps that are see-through in the light, gobies that match the gravel, and prawns that were invisible a moment ago all start moving once they decide you're part of the scenery.",
    ],
  },
  {
    section: "Lower shore",
    heading: "The lower shore",
    body: [
      "The lowest band of the shore is only uncovered on the biggest tides, and it feels like a different place. Long brown kelp lies flat across the rocks, and underneath and around it the animals are larger and more varied.",
      "Shore crabs are the ones you'll meet most, usually green, sometimes patterned, always ready to raise their claws. Pick one up from behind, with a finger and thumb on either side of the back of the shell, and it can't reach you. Edible crabs are the heavier, brick-red ones with a shell edge that looks like a pie crust.",
      "Starfish tend to hide in damp gaps under weed. The common starfish is orange with five arms, though it is often missing one. Lost arms grow back over time.",
    ],
  },
  {
    section: "Turning stones",
    heading: "Turning stones",
    body: [
      "Some of the richest life on the shore is under loose stones: brittlestars, porcelain crabs, sea squirts, and small fish guarding eggs. Turning stones is worth doing, but it needs care.",
      "Lift each stone slowly and only as far as you need to see underneath. Look, then lower it back exactly as it was, the same way up, easing it down rather than dropping it so nothing gets crushed. A stone left upside down exposes the animals that need its dark, damp underside and smothers the ones living on top.",
      "Never pull at anything attached. If something is stuck to a rock, it is meant to be.",
    ],
  },
  {
    section: "Leaving",
    heading: "Leaving it as you found it",
    body: [
      "Before you go, put back everything you've collected. Return animals to the same pool, or the same patch of shore, that they came from. A tray left in the sun heats quickly, so keep visits short and the water fresh.",
      "Take photographs rather than shells with animals in them, and let the tide have the last word. By the time it comes back in, the pool should look as though you were never there.",
    ],
  },
]

export default function Demo() {
  return (
    <div className="bg-background text-foreground">
      <main
        id="rock-pool-guide"
        className="mx-auto max-w-[34rem] px-6 pt-[18vh] pb-[45vh] font-serif text-[1.1875rem] leading-[1.65] md:mr-[240px] md:ml-[max(1.5rem,5vw)] xl:mx-auto"
      >
        <header>
          <h1 className="mb-7 text-[clamp(2.75rem,8vw,5.25rem)] leading-[0.98] font-medium tracking-[-0.025em]">
            Reading a rock pool
          </h1>
          <p className="mb-[22vh] text-[1.375rem] leading-[1.45] text-muted-foreground">
            What lives between the tides, from the dry rocks at the top of the beach to the kelp
            that only shows itself on the lowest tides.
          </p>
        </header>

        {ARTICLE.map((s) => (
          <section key={s.section} data-section={s.section} className="mt-22 first:mt-0">
            <h2 className="mb-4 text-[1.875rem] leading-[1.15] font-medium tracking-[-0.01em]">
              {s.heading}
            </h2>
            {s.body.map((p, i) => (
              <p key={i} className="mb-[1.1rem]">
                {p}
              </p>
            ))}
          </section>
        ))}

        <p className="mt-20 text-muted-foreground italic">
          Low water comes round again tomorrow, roughly fifty minutes later than today.
        </p>
      </main>

      {/* The dock takes over at the same width the article stops leaving room for the rail. */}
      <TileScrollbar controls="rock-pool-guide" label="Guide position" compactBreakpoint={768} />
    </div>
  )
}
