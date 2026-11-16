# Playbook: rebuild a set of real sites as vault landing pages

Worked example: the ten spa sites (`features/spa-*`, `docs/research/spa-sites-2026-11.md`). Follow this so a new batch (builders, dentists, ...) does not rediscover the same things.

## Steps

1. **Pick sites.** If the owner gave URLs, skip searching. Otherwise one or two web searches (Awwwards "<industry>", "best <industry> websites"), then pick 10 that load and differ from each other.
2. **Measure**, all at once: `node scripts/replica/research.js <url> <url> ...` → `reports/replica/<host>/summary.md` + `sheet.jpg`. Read only these two per site. A `SKIP ... blocked` site is replaced, never bypassed.
3. **Plan** (owner rule: describe before coding): one short file `docs/superpowers/plans/<date>-<industry>-replicas.md` with the site → slug → brand table and the font stand-ins. Do not repeat this playbook in it.
4. **Scaffold**: `npm run new-feature -- <slug> --category "Landing Pages" --title "<Title>"` (one per site).
5. **Build** each `features/<slug>/index.html`, `style.css`, `script.js` from `summary.md` + `sheet.jpg`.
6. **Compare**: `node scripts/replica/compare.js <slug>=<host> ...` → `reports/replica/compare-<slug>.jpg` and the page height vs the original. Fix, re-run once. One comparison pass per site is usually enough.
7. **Meta + checks**: fill `meta.json` (below), then `npm run sync && npm run verify`, `npm run check-features -- --slug <slug>` for each, `npm run thumbs -- --slug <slug>`, `npm run sync`, `npm test`.
8. **Record**: one paragraph in `docs/HANDOFF.md`, research note in `docs/research/`.

## Rules learned the hard way

- **Not copied:** brand names, logos, copy, photos, video, paid fonts (copyright and impersonation). Copied: layout, spacing, type scale, colours, motion timings. Say so to the owner up front.
- **Photos:** use the tone placeholders `/assets/library/spa-ph-{ember,plum,water,stone,night,red,sand,forest,sky,blush,skin,lilac}.svg` or add new ones the same way (gradient + blurred blobs + grain, ~1 KB SVG). Every image is a real `<img>` with `alt`, so the builder can swap it.
- **Fonts:** closest free Google font, one `@import` at the top of `style.css`. Owner runs `npm run localize-remote` before export.
- **CSS scoping:** every class gets a 2-letter site prefix (`.dw-`, `.kq-` ...). Resets MUST be zero-specificity: `:where(.xx) h1, :where(.xx) p { margin: 0 }`, `:where(.xx) a { color: inherit }`. A plain `.xx p { margin: 0 }` beats `.xx-class { margin: auto }` and `.xx a` beats button colours; this broke four sites.
- **Headings:** keep a clean h1 → h2 → h3 outline even when the original skips levels; style by class, not by tag.
- **Text sizes:** nothing functional under 11px.
- **Motion:** CSS keyframes/transitions with the measured duration and easing; scroll reveals with `IntersectionObserver`; scrubbed or pinned effects with one passive scroll handler setting a CSS variable. No GSAP or other libraries. Always add `@media (prefers-reduced-motion: reduce)`.
- **meta.json:** `category "Landing Pages"` and `type "component"` (tests reserve Full Websites/template for multi-page sites with a CMS). `mood` only from dark, light, playful, editorial, luxury, futuristic, retro, minimal; `industry` only from general, portfolio, agency, saas, ecommerce, hospitality, fintech, education, media. Add `"ownPalette": true, "palette": "designed", "paletteNote": "Layout and motion study of <host> ..."`, `status "draft"`, `origin {source: edvlabs, license: own}`.
- **Design hook (impeccable):** contrast flags for light text on photos/dark sections are false positives (it reads the page background). Patterns copied from the original (marquee, all caps, full-bleed sections) get a narrow `impeccable hooks ignore-value <rule> "*" --file <file> --reason "..."`. Real low contrast on small grey text: fix it.
- **Commit:** only when the owner asks.

## Saving tokens

- Read `summary.md` and `sheet.jpg`, never the raw PNGs or page HTML.
- Write each site's three files in one go; do not re-read files you just wrote.
- Build several sites before running `compare.js` on all of them in one call.
- Long runs (`npm test`, research on 10 URLs) in one command each.
