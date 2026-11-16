---
name: client-preview
description: Build 2-3 personalised design previews for one CRM client (company name, contacts, services, own photos, Latvian text, booking form in the page's colours) from the vault's landing-page templates, publish them at https://<host>--pv.edvlabs.com/ and check them, ready to send in an outreach e-mail. Use when the owner says "preview for <client>", "personalised designs for <client>", "sagatavo dizainus <klientam>", or asks to rebuild the previews after a template change.
---

# Client preview

Goal: a client opens one link and sees *their* firm on finished-looking designs, with a booking form that fits the page. Cheapest path first; stop when the checklist is satisfied. Plans: `docs/superpowers/plans/2026-11-15-client-previews.md`, `2026-11-16-previews-subdomain-worker.md`.

## Inputs you must not guess
- `client.designPreviews` = `{token, host, slugs}` from the CRM (the owner presses "Izvēlēties 3 dizainus pēc nozares"; `find-clients` sets it for new leads). Empty: stop and ask the owner to press it. A set without `host` (made before 2026-11-16): ask for "Jauna izvēle", or build without `--host` and report the printed address. Never invent a token, never edit `crm.json` by hand (the CRM dev server API is the only way, and only when the owner asks).

## Steps
1. **Facts** (one call): `node scripts/preview/client-facts.js "<company part>" --out <scratchpad>/<token>`: CRM data (read only), the client's own site, the **zl.lv listing** (description, services, gallery as `zl-N.jpg`), public Facebook/Instagram if linked (a login wall: skip, never bypass). Then one or two web searches (company + city) for hours, services, own site.
2. **Photos: nothing stays a placeholder.** Look at every saved image once. Pool: client's own site, then zl.lv / social images, then stock `node scripts/preview/stock.js "<english query>" --n 8 --out <dir>` (Unsplash Access Key in `scripts/preview/stock-keys.json`, 50 requests/hour). Keep only sharp photos without text, logos, watermarks, letterbox bars or identifiable people (no patients' faces). Aim for 8. Logos go in `logo`.
3. **Brief** (`<scratchpad>/<token>/brief.json`): `{company, tagline, about, phone, email, address, city, hours, services[{name,text}], accent, logo, photos[], lang:"lv", replyTo}`
   - `company`: trade name without "SIA" ("Diadents"). `tagline` ~6 Latvian words; `about` 1-2 sentences from their pages; `hours` as published.
   - `services`: 5-6 real ones (`{name, text}`, never invented prices or claims): they fill the template's cards and become the choices in the booking form.
   - `replyTo`: the CRM seller e-mail (the "I choose this one" button mails it).
   - `accent`: only a real brand colour from their site; grey/white/missing: leave it out.
4. **Build**: `npm run preview:client -- --brief <brief.json> --token <token> --host <host> --templates <slug,slug,slug>`. It prints the address and notes ("accent kept" is fine; "no Latvian text yet": tell the owner). The brief, photos, logo and stock credits are saved by itself in `previews-src/<token>/` (git-ignored, not deployed): the scratchpad may be wiped, the client can always be rebuilt.
5. **Templates**: native `dental-*` / `clinic-*` first for medicina/zobarstnieciba (client-safe: Latvian, slots, no invented people/awards/prices; empty sections removed). Older `build-*`, `stay-*`, `spa-*` carry invented content: check `hide`/`blank` in `scripts/preview/templates.json` covers it; never leave a made-up doctor, award or price under a real name. A template that looks wrong: swap it, do not tune it.
6. **Visual check**: `npm run preview:shots -- <token> --out <scratchpad>/shots` (whole pages small, the form at desktop and phone width; no server needed; do not start a local web server for `previews/`). Look at: company name in the header, no old brand or English left, photos not stretched, and the page's colours as a whole (the form must look like part of the page, not a foreign block).
7. **Deploy (only with the owner's go-ahead, every time)**: `npx wrangler deploy -c wrangler.previews.jsonc` publishes the whole `previews/` folder (every client; never delete it, `previews/_hosts.json` holds the addresses).
8. **Verify after deploy**, then report:
   ```bash
   curl -sI https://<host>--pv.edvlabs.com/ | grep -iE '^HTTP|x-robots'           # 200, noindex
   curl -s -o /dev/null -w '%{http_code}\n' https://<host>--pv.edvlabs.com/<slug>/index.html
   curl -sI https://edvlabs.com/ | head -1; curl -sI https://<a customer site>.edvlabs.com/ | head -3   # unchanged
   ```
   Report the link, what was personalised, what was not verified. You never send mail.

## The booking form (automatic, never remove)
- Every page gets `#pieteikums` before the footer: a 3-step request (service from the brief, call time, name + phone + consent), then a thank-you screen. Draft: sends nothing and says so. The build fails if it cannot place it.
- Its colours are chosen in the page by `scripts/preview/form-palette.browser.js`, by colour-harmony rules: only the template's own colours or tones of them; it follows the page's tonal key (a pastel page gets a light panel, a dark one only where the page is largely dark); it never matches the band above/below (sections merge) and never sits next to a large band in a contrasting hue; heading font from the template; WCAG 7 / 3 / 4.5. The contact block the preview adds to older templates follows the same rules. Do not hand-tune colours per client.
- The owner rejected: a plain form, a fixed dark panel, a charcoal not in the template, a dark purple panel under a pastel page.

## After a template, form or colour-rule change
- `npm run preview:client -- --rebuild all` rebuilds every client from `previews-src/` (same addresses); `npm run preview:palettes` rewrites `docs/design/form-colour-combinations.html` (per template: the page as bands, every neighbouring pair judged, allowed colours per band, all form combinations). Then tests: `npm run test:preview && npm run test:previewform && npm run test:previewsworker`. Deploy only with the go-ahead.

## Rules
- Stock licences live in `credits.json` (CC BY / BY-SA need attribution before going live; Unsplash/Pexels do not). Client photos only in that client's folder under `previews/` and `previews-src/`, never in `features/` or `assets/`.
- No client name in committed file names or commit messages (the address label holds the name; that is intended and noindex).
- Drafts: no delivery dates or prices.
- Cost control: facts once, one build, one screenshot check.

## Checklist (done when all true)
- [ ] token, host and slugs came from the CRM
- [ ] photos reviewed by eye, nothing placeholder, no identifiable people
- [ ] tagline, about, 5-6 services real and in Latvian
- [ ] build printed no unexpected notes; `previews-src/<token>/brief.json` exists
- [ ] screenshots checked, the form fits the page's colours
- [ ] deployed with the owner's go-ahead and verified with curl, or the deploy command handed over
