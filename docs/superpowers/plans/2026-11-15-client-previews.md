# Personalised design previews for CRM outreach

Owner idea (2026-11-15): when offering a client a website in the CRM (`/home/edvins/system-for-clients`, local only, Latvian small businesses), send 2-3 designs that already carry the client's company name. Templates stay here, the CRM stays a pure CRM.

## Split
- **web-for-options (this repo):** `scripts/preview/make-preview.js --company "<name>" --token <token> --templates a,b,c` copies each template into `previews/<token>/<slug>/` (+ its thumbnail), replaces the template's brand (`meta.json` `title`) with the company name, adds `noindex`, and shares used `/assets/library` files once in `previews/assets/`. `previews/` is git-ignored (it names clients). Hosting: its own small Cloudflare Pages project, `wrangler pages deploy previews --project-name edv-previews`, run by the owner; the main site deploy is not touched.
- **system-for-clients:** the CRM owns the industry -> template map (`ClientIndustryId` -> slugs), makes the random token, stores `{token, slugs}` on the client, shows the command to run, builds the links (`<previewBase>/<token>/<slug>/`) and a review-before-send email with thumbnails. It reads nothing from this repo at run time.

## Decisions
- Token = 16 random hex chars from the CRM; the company name never appears in the URL.
- Brand swap is plain text replace of `meta.title` (case-insensitive, also `&amp;` form); no new `meta.json` field (the schema check stays untouched). Derived names such as "Sunnycamp Alquezar" become "<company> Alquezar": accepted for a sample.
- Phone, city, e-mail are not injected in this round.

## Known gaps
- Templates are English, clients are Latvian; a Latvian pass over the chosen templates is the next step if replies show it matters.
- Industries with no replica yet (autoserviss, zobarstnieciba, tirdznieciba, konsultacijas) fall back to a mix of the existing ones.
- Placeholders photos (`spa-ph-*`) say "draft"; the email text must say so.

## Order
1. `make-preview.js` + a self-check (this repo).
2. CRM: map, token, command, links, email template, tests (other repo).
Not committed in either repo.

## Round 2 (owner: all stages + a skill)
Personalisation beyond the name, driven by one **brief** per client (`--brief file.json`, or flags):
`{company, phone, email, address, city, services[], accent, logo, photos[], lang}`.
- **Contacts + services:** the script injects one neutral section (client name, phone, e-mail, address, services list, accent colour) before the footer of every template. No template edits.
- **Accent colour:** `scripts/preview/templates.json` lists each template's accent hexes (scanned from its CSS, checked by eye); the script swaps them for `brief.accent` in the copied `style.css`.
- **Latvian:** `scripts/preview/extract-strings.js <slug>` lists the page's visible strings; I translate once into `scripts/preview/lv/<slug>.json` (english -> latvian); `lang: "lv"` applies it and sets `<html lang="lv">`. Only the templates the CRM map uses.
- **Photos / logo:** `photos[]` replace the first placeholder `<img>` sources in page order (files copied into the token folder); `logo` is shown in the injected contact section. Only the client's own material, only in that client's tokenised, noindex folder, never in the shared vault.
- **Client facts:** `scripts/preview/client-facts.js "<company>"` reads the client from the CRM's `data/crm.json` (read only) and fetches the client's public page for title, theme colour, logo and og:image.
- **Skill:** `.claude/skills/client-preview/SKILL.md` (+ checklist) so a request like "preview for <client>" runs: facts -> brief -> make-preview -> links, using the token the CRM panel already created. The skill never writes `crm.json`.
- CRM "copy command" also passes phone, e-mail, address.

## Round 3: client content inside the template sections (owner chose item 1, 2026-11-15)
Problem: previews keep the template's invented content (projects, cities, programmes) with the client's facts only in a block above the footer.
- **Slots by string index, no template edits.** `scripts/preview/templates.json` gets per template `strings` (how many visible strings `extract-strings.js` finds) and `slots`: `{tagline, about, service, serviceText, city, address, email, hours: [string indexes]}`. The index is the same one the Latvian files use, so one numbering covers both.
- `make-preview.js` builds one dictionary (Latvian line or the English string itself), then overwrites slot entries with the brief: `service[i]` / `serviceText[i]` take the i-th service; single values (tagline, about, city, address, email, hours) fill every index of their slot. Unfilled indexes keep the template's text.
- Brief: `services` may be strings or `{name, text}`; new optional `tagline`, `about`, `hours`.
- If the page changed (`strings` count differs), slots are skipped with a note, like the Latvian text.
- The contact block stays; its services list is dropped when the template already shows the services in its own cards.
- 18 templates (those with Latvian text). Konsultacijas/zobarstnieciba native sets are not part of this round.

## Round 4: real information and real photos (owner, 2026-11-15)
Owner: collect everything findable about the client (web, zl.lv description + pictures, Facebook/Instagram latest posts); use the client's real photos; where there are none use thematic photos from the internet (never people with a name); never leave blurred "empty" placeholders.
- `client-facts.js` also returns the zl.lv listing (description, services, keywords, hours, picture URLs) and, when a Facebook/Instagram link exists, what the public page shows without logging in (og image, post images/text). A login wall means: skip, never bypass.
- Photo pool in `make-preview.js`: `photos[]` (client's own first, then stock). **Every** placeholder `<img>` is replaced; the build says how many placeholders remain (target 0) and sets each `alt` to the company name. Each photo is copied into the token folder.
- `scripts/preview/stock.js "<query>" --n 6 --out dir`: keyless Wikimedia Commons search (free licences only, size filter, licence/author recorded in `credits.json`); Unsplash instead when `UNSPLASH_ACCESS_KEY` is set. Candidates are looked at once on a contact sheet and kept only if they show no identifiable person.
- Invented people, awards and places in templates: `blank` index lists in `templates.json` (same numbering as slots) replace them with nothing/neutral text; first for the medical/spa templates used by medicina/zobarstnieciba/skaistumkopsana.
- Photos of the client and stock stay in the client's tokenised, noindex folder; licence data stays in `credits.json` there.

## Round 5: one link, three variants (owner idea, 2026-11-16)
The client gets one link `<base>/<token>/` instead of three. `make-preview.js` writes `previews/<token>/index.html`, a small shell:
- top bar: company name, tabs "Variants 1/2/3" (keys 1-3, `#2` in the URL, last choice remembered), a Desktop/Phone switch (the iframe narrows to 390 px, so the template's own media queries answer), "Open full screen", and "I choose this one" (a `mailto:` to the owner with the variant in the subject; shown only when `replyTo` is set).
- one `iframe` per variant (the other two load lazily). Iframes keep the three templates' CSS apart, which a single merged file could not; the shell itself has no external files, `noindex`, Latvian/English labels by `lang`.
- A truly single attachable file (all pages inlined with base64 photos) is not built: 3 pages with 20 photos each would be tens of MB.
- CRM: the "insert links" paragraph now carries the single link; the panel passes the seller's e-mail as `--reply-to`.
