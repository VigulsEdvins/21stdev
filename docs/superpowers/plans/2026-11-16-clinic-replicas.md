# Ten clinic landing pages (5 dental, 5 medical), client-safe by design

Owner request (2026-11-16): build the native template set for medicina and zobarstnieciba, so spa templates are no longer borrowed for clinics. Follow `docs/replica-playbook.md` (two searches, measure in one pass, build, one compare each). Sites and brands are mine to choose.

## What is different from the earlier batches
The earlier templates carry invented people, awards, prices, branches and statistics, which had to be hidden one by one for real clients. These are written **client-safe from the start**:
- Written in Latvian (`"lang": "lv"` in `scripts/preview/templates.json`, no `lv/*.txt`).
- Content comes from the client through `data-slot` marks, not string indexes: `data-slot="tagline|about|phone|email|address|city|hours"` fills the element's text; `data-card="service:N"` on a card wrapper removes the whole card when the brief has no N-th service; inside it `data-slot="service:N"` / `data-slot="serviceText:N"`. A slot with no value is removed with its element (no empty boxes, no leftover template text).
- Only sections a real small clinic always has: hero, about, services, why-us as plain statements without numbers, opening hours, contacts/map block, footer. No team, awards, press, testimonials, prices, other branches, statistics.
- Every picture is an `<img>` placeholder replaced from the photo pool (min 8 photos); layouts use at most ~8 pictures so a 12-photo pool does not repeat.
- Meta `mood`/`industry` as in the playbook; the registry entry in `references/index.json` marks them `native` for `medicina` / `zobarstnieciba`.

## Order
1. Searches + `research.js` on 10 sites (5 dental, 5 medical) -> table below.
2. `make-preview.js`: `data-slot` / `data-card` support + `lang: "lv"` templates + test.
3. Build the 10 pages, one `compare.js` pass each.
4. `templates.json`, `refs.js add` (native), `refs.js index`, thumbnails, `npm run sync && verify`, check-features, `npm test`.
5. Rebuild the Diadents and Paegle previews on the new set.

## The ten sites (measured 2026-11-16)
Dropped: tend.com (is a farm-software site now), aspendental.com and sesamecare.com (did not render headless), carbonhealth.com (bot protection, not bypassed), bowlesdental.com and lavenirdental.com (no DNS).

| # | Original | Slug | Brand | Prefix | Look |
|---|----------|------|-------|--------|------|
| 1 | dentologie.com | `dental-mintline` | Mintline | `ml` | warm greige, mint + peach blocks, Playfair + Inter, blurred sticky header |
| 2 | austindentalworks.com | `dental-tealwork` | Tealwork | `tw` | white + teal, light Montserrat, Cormorant caps names |
| 3 | seattledentalco.com | `dental-quiet-co` | Quiet & Co | `qc` | airy white, wide-tracked Lato caps, Quicksand |
| 4 | wrightdentalcenter.com | `dental-hearthstone` | Hearthstone | `hs` | dark brown, full-bleed hero, serif display, services grid |
| 5 | coxbonddental.com | `dental-slatebond` | Slatebond | `sb` | slate blue + tan, Cormorant + Montserrat, full-screen hero |
| 6 | onemedical.com | `clinic-greenroom` | Greenroom | `gr` | cream + mint, deep green, huge serif headings |
| 7 | parsleyhealth.com | `clinic-rootline` | Rootline | `rl` | sand + teal, serif headline, big rounded sections |
| 8 | asktia.com | `clinic-bloomwell` | Bloomwell | `bw` | cream + tan, serif italics, burgundy footer |
| 9 | mavenclinic.com | `clinic-evergreen` | Evergreen | `eg` | deep green, mint accent, light 60px display |
| 10 | kindbody.com | `clinic-sunrise` | Sunrise | `sf` | yellow header block, navy sections, serif display |

## Slot syntax (implemented in `make-preview.js`)
- `data-slot="tagline|about|phone|email|address|city|hours"` on a leaf element: its text becomes the brief value; with no value the element is removed, or filled with the company name when it also has `data-fallback="name"`. On an `<a>`, `data-href="tel:|mailto:"` sets the link.
- `data-card="service:N"` on an `<article>` or `<li>` (N from 1): removed when the brief has fewer services. Inside: `data-slot="service:N"`, `data-slot="serviceText:N"`.
- `data-need="hours|about|email|phone|address|services"` on a `<section>`: the section is removed when the brief lacks that.
- `templates.json` per native template: `"lang": "lv"`, `"contact": false` (no injected contact block), `"accent"`, `"names"`.
