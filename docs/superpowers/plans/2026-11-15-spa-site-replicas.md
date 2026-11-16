# Ten spa and massage site replicas

Owner request (2026-11-15): find the 10 most striking spa / massage websites in the world, study how they work and move, screenshot them, plan a reverse-engineered rebuild, build all 10 "exactly", then compare the design. Owner was away and said not to ask anything.

## The 10 sites (chosen from 14 checked)

| # | Original | Why it was picked | Replica slug | Replica brand |
|---|----------|-------------------|--------------|---------------|
| 1 | othership.us (Toronto/NYC sauna + ice bath) | pill navigation, condensed serif over video, lime/plum palette, marquee, floating badges | `spa-driftward-bathhouse` | Driftward |
| 2 | aescape.com (robotic massage, NYC) | floating dark capsule nav, lilac accents, dark/sand section rhythm, numbered how-it-works | `spa-kinetiq-robotic-massage` | kinetiq |
| 3 | abathhouse.com (Brooklyn bathhouse) | all-black, all-monospace, location card grid, "opens/closes" sun-arc hours graphic | `spa-stillhouse-mono` | STILLHOUSE |
| 4 | remedyplace.com (social wellness club) | red-light hero, booking bar, dark mosaic of treatments, glowing concierge pill | `spa-solace-social-club` | SOLACE |
| 5 | shawellness.com (Spain, medical wellness) | upright + italic mixed caps headlines, stats, coloured programme cards, line-grow titles | `spa-nao-longevity` | NAO |
| 6 | lanserhof.com (Austria/Germany) | stacked three-line logo, italic serif + caps pairs, split image/text panels, drifting light | `spa-almenhof-medical` | ALM/EN/HOF |
| 7 | loylyhelsinki.fi (Helsinki sauna) | thin geometric caps, grey-olive page, header that shrinks and fills on scroll | `spa-kiulu-sauna` | KIULU |
| 8 | squeezemassage.com (US massage chain) | aqua, wide-tracked caps, curved section edges, smile mark, script accent | `spa-kneaded-massage` | Kneaded |
| 9 | the-well.com (NYC wellness club) | warm blush, thin display serif, brown ink, fading testimonial carousel | `spa-the-spring-club` | THE SPRING |
| 10 | hiatusspa.com (Texas day spa) | "(word)" logo, periwinkle blocks, light serif, staggered section rise | `spa-interlude-day-spa` | (interlude) |

Dropped: tangan.fr and beaire.com (bot protection, not bypassed), bodyfreedom.com.au (TLS error), chillhouse.com (nail-polish shop, not a spa site), sixsenses.com/spas (plain list page).

## What "exactly" means here, and what is deliberately not copied

Copied 1:1 (measured from the live pages with a headless browser): section order and layout, grid and spacing, type scale, weights, letter-spacing and case, colours, header behaviour, every animation found with `document.getAnimations()` (name, duration, delay, easing, keyframes), hover states and marquee speeds.

Not copied, on purpose: brand names, logos, text, photographs, video and the paid fonts. Shipping another company's name, logo, copy and photos would be copyright infringement and would impersonate a real business, which edvlabs cannot sell. So each replica gets an invented brand, original copy, atmospheric SVG placeholders in the same tones (`assets/library/spa-ph-*.svg`, swappable in the builder) and the closest free Google font:

| Original font | Free stand-in |
|---|---|
| Lido Condensed / Founders Grotesk | Instrument Serif / Archivo |
| ABC Repro | Inter Tight |
| Roboto Mono | Roboto Mono (same) |
| Beausite Slick / Classic | Jost |
| Graphik | Inter |
| Neue Frutiger / Frutiger Serif | Hind / Spectral |
| Stem | Jost |
| Mr Eaves / Learning Curve | Josefin Sans / Caveat |
| Chronicle Display / Styrene B | Cormorant Garamond / DM Sans |
| Romie / Ft Regola Neue | Fraunces / Manrope |

## How each replica is built

- One vault feature per site in `features/<slug>/` (`index.html`, `style.css`, `script.js`, `meta.json`), category **Landing Pages** (one-page homepages; the vault keeps Full Websites for multi-page sites with a CMS), status `draft`, origin `edvlabs / own` with a `paletteNote` naming the layout study.
- Plain HTML/CSS/JS, no libraries. GSAP ScrollTrigger effects (SHA clip-path reveal, pinned locations) are redone with `IntersectionObserver` and a scroll handler; Swiper and Webflow sliders with small hand-written sliders. `prefers-reduced-motion` turns motion off.
- Classes are prefixed per site so ten sites can sit in one builder page.
- Fonts load with one Google Fonts `@import`; run `npm run localize-remote` before export so ZIPs self-host them.

## Checking

1. `npm run sync`, `npm run verify`, `npm run check-features -- --slug <slug>` for each.
2. Side-by-side: the original and the replica are screenshotted at 1440×900 at the same scroll positions and put in one sheet per site (`reports/spa-replicas/`), then layout differences are fixed and re-shot.

## Owner steps

- Swap the placeholder pictures for real, licensed photos in the builder (Content tab).
- Run `npm run localize-remote` (downloads the Google fonts into `assets/library/`), then `npm run thumbs` and promote with `npm run check-features -- --promote` after a look.
- Research material (screenshots, measured animation data) is in the session scratchpad, summarised in `docs/research/spa-sites-2026-11.md`.
