# Handoff: where the edvlabs storefront project stands

Updated 2026-10-28. Read this first in a new session, then the two documents it points to. Everything is committed locally; nothing has been pushed or deployed.

## What this is

edvlabs sells landing pages and small websites at **edvlabs.com** (domain owned, DNS in the owner's Cloudflare account; owner is VAT-registered in Latvia). A visitor answers about ten short questions (every one has "I don't know"), then chooses:

1. **Build it myself (no code):** register, use the builder, pay, download the files. Price from the number of blocks plus an optional editor.
2. **edvlabs builds it:** leave an email or phone number; the whole brief goes to the owner. Price = the self-serve price plus the owner's work.

## Read these

- Design and decisions: `docs/superpowers/specs/2026-10-27-edvlabs-storefront-design.md` (decisions D1–D8, §7a owner answers, §8 chosen look, §11 market prices and draft price table)
- Plan with epics E0–E16, tasks, subtasks and "Done when": `docs/superpowers/plans/2026-10-27-edvlabs-storefront-plan.md`
- Brand tokens and usage: `docs/brand/tokens.md`
- Security commands: `docs/security/README.md`
- Older roadmap of the vault itself (mostly done): `docs/ROADMAP.md`, `AGENT_GUIDE.md`

## Decided

- **Order of work:** done-for-you path first (needs only email), then self-serve with accounts and payments.
- **Look:** direction **E, mid-century poster** (teal, mustard, rust on cream; circles and arches; Gloock and Work Sans). Mock-ups of six directions are in `docs/design/mockups/` (open `index.html`); the chosen one is `e/`.
- **Hosting:** Cloudflare Pages for the static site and builder, Supabase (Pro plan once data is stored) for accounts, database and functions, Stripe for payment, an email service (Resend or Postmark). **No dedicated VM.**
- **Prices (draft, accepted as a starting point):** €39 base including 3 blocks, €9 per extra block, €39 editor add-on; done-for-you adds €150 set-up plus €35 per block. To be tested against three real local quotes (E5.1a).
- **Lead notifications:** email first, WhatsApp later. The owner gave the email address and the WhatsApp number in chat on 2026-10-27; **they are deliberately not stored in the repository.** They belong in environment settings. Ask the owner for them when configuring.
- **AI assist (I3) is dropped.** The optional backend (I1) is now part of E4.

## Built so far

- Security baseline: `npm run security` (secret scan, dependency audit, code safety), pre-commit hook (`npm run setup-hooks`), lock file committed, CI uses `npm ci` and has a `security` job.
- Vault improvements from earlier rounds: GPU frame measuring (`GPU=1 npm run measure-frames`), React export wraps every feature, per-page language and translation links (hreflang, language switcher), design token import, single-file export of all pages, `defer` on exported scripts.
- Design system: `site/styles/tokens.css`, `site/styles/components.css`, self-hosted fonts in `site/fonts/`, living style page `site/style/index.html`, contrast check `npm run check-brand`.
- Tests: `npm test`, `npm run test:e2e` (44+ files), `npm run check-exports`; all passing at the last run.

- **Public home page and question flow (2026-10-28):** `site/index.html` (home), `site/start/index.html` (ten questions, summary, fork, contact step), `site/site.css`, `site/js/prices.js` (the one price table), `site/js/questions.js` (DRAFT wording), `site/js/start.js`. Tested by `tests/e2e/storefront.e2e.js`. No innerHTML.
  - Sending a lead is not connected: the form posts to the URL in `<meta name="lead-endpoint">` once one is added to `site/start/index.html`; until then it says nothing left the browser. Payload shape is in `lead()` in `start.js`.
  - "Self-build" ends on a "tell me when it opens" screen because accounts and the builder do not exist yet.
  - Home page has no example screenshots, owner note, company details, or real FAQ review yet (E2.2 remainder, E2.4, E2.6). "Prices include VAT" is copied from the mock-up: confirm with the owner.

- **Added later on 2026-10-28:**
  - Pages: `site/how-it-works/`, `pricing/` (calculator, three worked examples), `faq/` (15 questions plus schema.org markup), `contact/`, `404.html`, `sitemap.xml`, `robots.txt`. `site/js/price-fill.js` fills every price from `site/js/prices.js`; `tests/e2e/public-pages.e2e.js` fails if a page disagrees with the table.
  - Data and leads: `site/js/brief.js` (the `brief_v1` checker, same code in browser and server), `docs/schema/brief_v1.schema.json`, sample briefs in `tests/data/briefs/`, `functions/lib/lead.js` and `functions/api/lead.js` (Cloudflare Pages Function `POST /api/lead`: validation, honeypot, 5 per hour per address, repeat detection, owner email with the price recomputed on the server, optional acknowledgement). Tests: `npm run test:brief`, `npm run test:lead`. Owner set-up steps: `docs/deploy/lead-intake.md`.
  - Security: `site/_headers` (strict CSP without inline scripts or styles, HSTS, nosniff, referrer, permissions, opener), `npm run check-headers` (file, or live with a URL), `tests/e2e/csp.e2e.js`; `npm run check-innerhtml` and `docs/security/innerhtml-verdicts.json` (all 64 HTML-string sites reviewed, 8 fixed). Both are part of `npm run security`.
  - Wording decisions: "Prices include VAT" was replaced by "Prices are in euros" until the owner confirms the VAT rule. The ten questions and the home page text were read through with the owner and accepted as written.

- **Builder redesign, option A (2026-10-28, all committed locally):** the existing builder was restyled in place with a guided layer; nothing in the engine or the ids the tests use was replaced. Plan: `docs/superpowers/plans/2026-10-28-launch-scope.md`.
  - Look: `builder-e.css` (edvlabs paper and night themes, light by default) and `builder-guided.css`. Advanced switch in the header brings back the classic tabs and tools (`?advanced=1` / `?guided=1` override, remembered in `web_builder_mode`). The shared test browser (`scripts/lib/browser.js`) starts in Advanced so older tests see the classic layout.
  - Guided path, five steps, one file each in `scripts/builder/`: `guided.js` (step bar, help text, phone flip button), `block-kinds.js` + `block-picker.js` (step 1: twelve everyday block names mapped to real components, add, move, another look, remove, Start over), `guided-words.js` (step 2), `look-sets.js` + `guided-look.js` (step 3: 8 colour sets, 7 font pairs, corners, contrast guard), `guided-check.js` (step 4: plain-words list with fixes), `guided-get.js` (step 5: price meter from `site/js/prices.js`, editor choice, download, "Ask edvlabs to do it" link in the bar), `guided-brief.js` (start from the saved answers in one undo step, using `site/js/recommend.js`).
  - Tests: unit `test:blockkinds`, `test:looksets`, `test:guidedcheck`, `test:guidedget`, `test:guidedbrief`, `test:recommend`; browser `block-picker`, `guided-words`, `guided-look`, `guided-check`, `guided-get`, `guided-brief`, `guided-phone`, `builder-guided`.
  - Known gaps: no map block exists in the library (kind shown as "not ready yet"); "About you" and "How you work" borrow timeline components; payment is not connected (the Get it panel says so); the builder still loads jszip from cdnjs and has inline styles, so it needs its own CSP plan (E16.7); the public question flow does not link to the builder yet (launch decision); the builder reads `site/js/*.js` and links to `site/contact/` by relative path, so the deployed layout must keep them reachable; answers are read from browser storage, so the site and the builder must share an address.

- **Speed and accessibility check (2026-10-28):** `npm run check-site-lighthouse` (mobile preset, writes `reports/lighthouse-site.json`, budget perf 0.9 / a11y, best practices, SEO 0.95) on home, start, how-it-works, pricing, faq, contact: all pass (performance 96-98, others 100 after fixing one low-contrast label on the home page). The guided builder (`/builder.html`, throttled phone) scores accessibility 100 (a step-bar bug was fixed), best practices 100, performance about 55: 1.4 MB of scripts (registry.js 267 KB, assembler.js 153 KB, jszip from cdnjs 95 KB) and 57 scripts. Adding `defer` to all scripts made first paint faster (4.3 s to 2.7 s) but layout shift rose to 0.235 and the score fell, so it was reverted; a real fix needs the registry loaded on demand and the guided bar's space reserved before it is built (E6.12).

- **Home page examples (2026-10-28):** a "Our work" section (six sample pages from our own library, thumbnails copied to `site/img/examples/`, made-up names, no links) and the line "more than 200 blocks" in the band and the blocks section. `tests/e2e/public-pages.e2e.js` checks the registry really has more than 200 entries and that each example is an edvlabs-origin page with a description. Each card opens (in a new tab) the full sample page under `site/examples/<slug>/` (a copy of the page in `features/`, made by `node scripts/build-examples.js`, checked by `npm run check-examples`; it adds a noindex tag and a small bar with "Back to edvlabs" and "Start your page"; the pages run under the same strict policy with no violations, and `X-Robots-Tag: noindex` is set in `site/_headers`). Three whole websites (`yearbook`, `arena`, `roster`) are also published, as copies of the folders `edv-yearbook`, `edv-arena`, `edv-roster` next to this repo (same build script; the build fixes only what it knows: Google Font links removed, one `onsubmit` replaced by `fixes.js`, three inline styles replaced, a frame-buster script dropped, and it stops on anything else inline). They need a looser policy than the rest (inline styles, audio, own-origin frames for the admin preview, scripts still strict), set per folder in `site/_headers` with a `!` line that first removes the strict policy; this also fixed `/style/*`, whose relaxed policy had been added on top of the strict one and so never applied. The sites' admin panels keep content in the visitor's own browser (localStorage), so an edit shows only in that browser; the build gives each sample its own storage and channel names (arena and roster both used `edv_site_data_v1`, which would have crossed over), tested by `tests/e2e/examples-admin.e2e.js`. Third-party files and licences: `docs/dependencies.md`. To change which six are shown, edit `SLUGS` in that script and the cards in `site/index.html`, copy the thumbnails from `thumbs/`, and run the build. Still wanted from the owner (E2.4): which real client work, if any, to show, with permission; until then only sample pages are shown.

- **Lead receiver on Cloudflare (2026-10-28):** `wrangler.jsonc` publishes `site/` as static assets plus a small Worker, `src/worker.js`, which only gets `/api/*` first (`run_worker_first`); it uses `functions/lib/lead-http.js` (same code as the Pages Function in `functions/api/lead.js`; API answers carry their own security headers because `_headers` covers static files only). The start and contact pages carry `<meta name="lead-endpoint" content="/api/lead">`. The owner added the three settings (`LEAD_TO_EMAIL`, `LEAD_FROM_EMAIL`, `RESEND_API_KEY`) in Cloudflare and verified the sending domain in Resend. Tests: `npm run test:leadhttp` (includes bundling the Worker and running it), the browser tests remove the meta to check the "sending is off" wording. Not done: the KV binding `LEADS` (without it the 5-an-hour limit and the "Again" marking do not apply) and the Turnstile spam check widget. First real test: submit the contact form on the live address with your own phone number and check the email arrives.

- **Accounts: sign-in page (2026-10-28):** `site/account/` (sign in, create account, Continue with Google and GitHub, emailed link, forgot password, change password, sign out), `site/js/auth.js` (Supabase Auth over fetch with PKCE, no library), the Worker's `/api/config` handing out the public Supabase address and anon key from the Cloudflare variables `SUPABASE_URL` and `SUPABASE_ANON_KEY`, and an `/account/*` rule in `site/_headers`. The owner enabled Google and GitHub in Supabase (secrets only there). Tested against a pretend Supabase (`tests/lib/fake-supabase.js`): `npm run test:auth`, `tests/e2e/account.e2e.js`, the policy test. Not yet tried against the real project: needs the two Cloudflare variables, the Supabase Site URL and redirect URLs, and the Google app published. Details and what is not built: `docs/deploy/accounts.md`. A `[hidden] { display: none !important; }` rule was added to `site/site.css` after a button ignored the hidden attribute.

## Next steps (in order)

1. **Owner steps (Claude cannot do these):** Cloudflare Pages with staging at staging.edvlabs.com (E0.8, E0.5), then the lead-intake settings in `docs/deploy/lead-intake.md` and the `lead-endpoint` meta tag; run `npm run check-headers -- https://staging.edvlabs.com` against staging. Answer the open questions below.
2. Builder: speed check of the guided path (E6.12), a pass with five real people (E15), then the remaining storefront work below. Examples page with real screenshots of the owner's own templates (E2.4), the owner's note and About page (E2.7), company details in the footer, Open Graph images (E2.8), Lighthouse budget run on the new pages (E2.9).
3. Remaining security in E16: `postMessage` handlers, `localStorage` uses, the preview-frame decision, a hostile-input test file (the rest of E16.5), static analysis (E16.4), the builder's CSP (E16.7).
4. Then self-serve: accounts, price table as data, quotes, checkout (E4, E5, E8).

## Rules to keep

- **Commit locally only. Never push, and never rename the GitHub remote (`VigulsEdvins/21stdev`), without asking.**
- No secrets, no email address, no phone number in git. `npm run check-secrets` must stay clean.
- No real company names, real-site links or third-party code in components or assets (six files in `assets/library/` still have real names, see plan E12.6).
- `template-mom`, `template-cvmaker` and the components derived from them are the owner's own work: leave them alone. The full-site templates live in sibling folders outside the repo (plan E0.6).
- Plain words on the public site: "block of your page", not "section"; "the editor", not "CMS"; "get your site", not "export". Avoid the AI-look list (plan E1.4).
- Every change: run `npm run verify`, `npm test`, and the browser tests that touch it. Report what was and was not run.

## Open questions for the owner

- Sign-in: email and password, an emailed link, Google and GitHub are decided (plan E4.2). Owner to create a Google OAuth app (needs the privacy page and a verified domain) and a GitHub OAuth app, then put the keys in the auth service settings.
- Wording of the ten questions (plan E3.1) and what "done for you" includes (revision rounds, timing, what is not included).
- Prices after three real local quotes; the refund rule; the invoice set-up with the accountant.
- Decisions D2, D4, D5, D6 in the design doc (defaults are written there).
- Legal texts (terms, privacy) need a professional's review before launch.
