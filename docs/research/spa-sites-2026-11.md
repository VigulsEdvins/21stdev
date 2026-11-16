# Spa and massage sites: research and rebuild (2026-11-15)

Plan: [docs/superpowers/plans/2026-11-15-spa-site-replicas.md](../superpowers/plans/2026-11-15-spa-site-replicas.md).
Side-by-side sheets (left: original, right: replica, same scroll position at 1440×900): `spa-sites-2026-11/compare-*.jpg`.
Raw animation measurements (`document.getAnimations()` while loading, scrolling and hovering): `spa-sites-2026-11/measured-animations.txt`.

## How the data was taken

A headless Chromium visited each site at 1440×900, chose the most private cookie option (or hid the banner), and then:

1. took a screenshot every 900px of scroll;
2. recorded every running CSS animation and transition (name, target, duration, delay, easing, keyframes) at load, while scrolling and while hovering buttons, cards and images;
3. read `ScrollTrigger.getAll()` and the GSAP global timeline where GSAP was present;
4. measured every coloured, rounded, bordered, image or text box: position, size, padding, font family, size, line height, weight, letter spacing, case and colour.

## What each site does, and how the replica does it

| Original → replica | Stack found | Motion measured | Rebuilt as |
|---|---|---|---|
| othership.us → `spa-driftward-bathhouse` | Webflow + GSAP | marquee 40s linear; icons y ±10px, 2s sine yoyo; badge rotate 6s linear; Webflow slider translateX .5s ease; hover lift | CSS keyframes with the same timings, scroll-snap card rail, tab panel fade |
| aescape.com → `spa-kinetiq-robotic-massage` | Framer | button bg/colour .3s ease-out; links .4s cubic-bezier(.44,0,.56,1) | same transitions; fade-and-rise on scroll; partner marquee; chart bars grow |
| abathhouse.com → `spa-stillhouse-mono` | Next.js + Tailwind | booking bar fadeUp .8s ease-out from 20px; `revealUp` .7s cubic-bezier(.22,1,.36,1) from 30px + scale .98; image cross-fade .7s cubic-bezier(.4,0,.2,1) | same keyframes via IntersectionObserver; hover swaps to a second image; sun on the hours arc placed by local time |
| remedyplace.com → `spa-solace-social-club` | Next.js + Tailwind | image scale 1.05→1 1.1s cubic-bezier(.25,.46,.45,.94); press marquee 110s; concierge glow 2.8s + pulse 2s; text fade .35s | identical timings; carousel moves one card per click |
| shawellness.com → `spa-nao-longevity` | WordPress + GSAP ScrollTrigger + Lenis + Swiper + AOS | AOS fade-up 100px .8s ease-out; title line scaleX .6s + text .3s; header bg .3s ease-in-out; clip-path inset scrub; locations pinned for +=300% | IntersectionObserver for AOS/lines/counters; a scroll handler drives the clip-path wipe and the pinned cross-fade (no GSAP) |
| lanserhof.com → `spa-almenhof-medical` | Next.js | drifting light 38s / 47s; header pills colour .7s cubic-bezier(.45,0,.15,1); wheel of 13 focus areas sized 28/22/18/16px by distance | blurred radial lights with the same durations; picker wheel with wheel/click/auto-advance |
| loylyhelsinki.fi → `spa-kiulu-sauna` | Webflow | navbar 101px transparent → 77px #7d7d7d on scroll | same; full-screen menu; light parallax on the photo band |
| squeezemassage.com → `spa-kneaded-massage` | WordPress | almost none (static) | curved edges with clip-path ellipses; a bouncing smile on "Discover"; feature columns rise in |
| the-well.com → `spa-the-spring-club` | custom + tiny-slider | testimonial fade 1s ease; link hover opacity .75 in .15s | same; card sliders with arrows |
| hiatusspa.com → `spa-interlude-day-spa` | Webflow + GSAP | every section opacity 0→1 and translateY 32px→0, .6s ease-out | same via IntersectionObserver; slow drifting colour orbs on the hero |

## What is deliberately different

Brand names, logos, copy, photographs, video and the paid fonts are not copied (copyright and impersonation). Photos are atmospheric SVG placeholders in the originals' tones (`assets/library/spa-ph-*.svg`); fonts are the closest free Google fonts (table in the plan). Swap the placeholders for licensed photos in the builder's Content tab.

Checked but not used: tangan.fr and beaire.com (bot protection, not bypassed), bodyfreedom.com.au (TLS error), chillhouse.com (nail-polish shop), sixsenses.com/spas (plain list).
