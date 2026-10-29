# Launch scope: everything built and designed before anything is published

Written 2026-10-28 after the owner said nothing goes live until all functionality and the builder's new design are done. This orders the remaining work from `2026-10-27-edvlabs-storefront-plan.md`.
**Status updated 2026-10-28 (end of day).** Since the first version of this file the owner pushed to GitHub, Cloudflare deploys `main` to `edvlabs.com`, and the public pages, the lead receiver and the sign-in page are live. Payments, the builder's public entry and the account-owned parts are not.

**Status updated 2026-10-29.** The builder is staged under `/builder/` and runs under a strict policy; building on a phone is supported (owner decision) and the builder scores 85 to 88 on a throttled phone. Downloads now carry a 404 page, `security.txt`, `DEPLOY.md` and a printable `DEPLOY.html`; a public `/guide/` and a draft `/about/` exist; the paid-change rules (D7a), entitlement logic and a GitHub push are built and tested without real payment or a real GitHub; security regression tests, fuzzing and a nightly scan workflow (off until `STAGING_URL`) are in. Everything is pushed to `main`. Detail per task is in `docs/HANDOFF.md`.

## What "done" means

A stranger can: answer the questions, choose to build or to hand over, build a page in the new builder, pay, download the files, come back later and change it, and the owner sees every lead and order. All of it in the E look, tested, with legal texts reviewed.

## Where things stand

| # | Work | State |
|---|------|---|
| 1 | **Builder redesign** (approach A: guided layer over the same engine) | **Done, nine slices, then phone work (2026-10-29).** Edvlabs look (paper and night, light by default); five guided steps with an Advanced switch; plain block picker; Words, Look (8 colour sets, 7 font pairs, corners, contrast guard), Check (plain-words list with fixes), Get it (price meter from `site/js/prices.js`, editor choice, "Ask edvlabs"); help, Start over with one undo, start from the saved answers in one undo step. **Phone (owner decision 2026-10-29: build on a phone):** one column with a flip button between panel and a full-height real-size preview, bottom sheet for adding blocks, touch drag to reorder, Advanced mode and the Words step on a phone, header fixes, no desktop/tablet/mobile switch on a phone; every one of the twelve block kinds now has a component (new `find-us-hours`, `about-story`, `how-we-work-steps`). Tests: unit and browser (`block-picker`, `guided-*`, `builder-guided`). **Not yet connected to the public site or to accounts, and not on the live site** (the builder is not under `site/`). |
| 2 | Recommendation rules and Examples (E3.4, E2.4) | **Done.** Rules table (`site/js/recommend.js`). Home page shows nine examples that open in a new tab: six sample pages and three whole websites (yearbook, arena, roster) with their admin pages, built by `scripts/build-examples.js`. Real client work is still wanted if the owner has permission (E2.4). |
| 3 | Price table as data, quotes, editor packaging (E5.2 to E5.4, E11.2, E11.3) | **Partly.** One price table (`site/js/prices.js`) feeds the home page, the questions, the calculator and the builder's price meter. Prices are versioned (`VERSIONS`, `tableFor`, `upgrade`) so a customer keeps the table they paid at for 12 months (D7a). Quotes, the price editor and editor packaging are not built. |
| 4 | Accounts, projects, entitlements, dashboard, downloads (E4, E7, E10) | **Sign-in done and live; the rest not started.** Google, GitHub, email and password, emailed 8-digit code and link, forgot password, change password, sign out; repeat password, strength bar, show/hide, honeypot, optional Turnstile. Owner enabled the providers in Supabase and added the Cloudflare variables. **Built and applied to the real project:** the `projects` table with row level security, delete account, change email, My pages list, My answers, the menu link. The builder saves the page to the account (E7.1; its migration `20261028200000` is applied). **Logic built, nothing stored yet:** `functions/lib/entitlement.js` (allowance, free swaps, extra blocks only, 12-month lock, expiry, renewal) and a GitHub push with a fake GitHub (`functions/lib/github-push.js`, `github-app.js`, `send-to-github.js`; owner steps in `docs/deploy/github-app.md`). **Not built:** version history and moving old local projects into the account, orders, storing entitlements, the download endpoint, the GitHub button and install flow. |
| 5 | Checkout, webhooks, invoices, refunds (E8) | **Not started.** Needs the owner's Stripe account and the accountant's invoice rules; build against Stripe test mode and a local fake first. |
| 6 | Owner back office: lead list, orders, price editor (E9.3 to E9.5) | **Not started.** Leads currently arrive by email only. |
| 7 | Remaining security (E16.4 to E16.14) | **Mostly done.** Strict policy and headers, per-path rules with `!` detach, checked by `npm run check-headers` (account page and whole-website samples have their own); every HTML-string site reviewed (8 fixed); message handlers and saved state fixed; own-code safety scan with written waivers; secret scan clean; Worker answers carry their own headers. The hostile-input test file and the preview-frame decision are done (see HANDOFF). Static analysis is in (ESLint, baseline). **Added 2026-10-29:** regression tests R01 to R16 (`docs/security/regression-map.md`), seeded fuzzing in `npm test`, the builder page under a strict policy with the preview and admin panel in their own frame page (`docs/security/builder-csp.md`), a nightly ZAP workflow that waits for `STAGING_URL` (`docs/security/dynamic-testing.md`). **Open:** CodeQL, the live header check after the first deploy, an opaque-origin preview (needs the canvas rewritten as messages), the pre-launch review (E16.14). |
| 8 | Accessibility, performance, analytics (E13) | **Partly.** `npm run check-site-lighthouse`: every public page passes (performance 94 to 98, accessibility 100). The guided builder scores accessibility 100 and 85 to 88 for performance on a throttled phone (`npm run check-builder-speed`, files served compressed like Cloudflare; the catalogue file is already slim, so lazy loading was dropped on purpose). `/guide/` and `/about/` are in the page checks. Analytics not started. |
| 9 | Legal texts (E12) | **Not started.** Drafts can be written; a professional must review them. Google's brand check also needs the privacy page (backlog B1). |
| 10 | Usability test with five real people (E13.6) | **Needs people.** |
| 11 | Staging, soft launch, launch (E14) | **Partly.** Cloudflare deploys `main` as a Worker serving `site/` plus `/api/lead` and `/api/config` (`wrangler.jsonc`, `keep_vars`); the lead email path and the sign-in emails (custom SMTP through Resend) work; Lighthouse and header checks pass. No separate staging site; the live address is the only environment. **Go-live is the owner's decision.** |

## What exists now, by area

- **Public site (`site/`):** home (with examples and the 200+ blocks line), how it works, pricing with calculator, questions (15), contact, account, 404, sitemap and robots. Question flow with ten questions, `brief_v1`, honest wording while nothing is sent, per-field errors.
- **Server pieces (`src/worker.js`, `functions/`):** lead receiver (validation, honeypot, size limit, repeat marking, owner email with the price recomputed on the server, optional Turnstile and KV), `/api/config` for the sign-in settings. Missing settings are named by the API, never their values.
- **Tooling:** `npm run dev:site` (local site with the real headers and API, private `.dev.vars`), `check-headers`, `check-site-lighthouse`, `check-examples`, a pretend Supabase for tests (`tests/lib/fake-supabase.js`), unit tests wired into `npm test`, 59 browser test files in `npm run test:e2e`.
- **Knowledge graph (`graphify-out/`, git-ignored):** refreshed 2026-10-29 with a code-only update (about 11,100 nodes, 15,900 edges, 708 communities). Documents and images are not in it; semantic extraction for them was not run.

## Cannot be finished by Claude alone

Done by the owner already: Cloudflare, Supabase (Google and GitHub providers, custom SMTP, templates), Resend (domain verified), the Cloudflare variables.
Still the owner's: the Stripe account and the choice of payment set-up (E8.1), the accountant's invoice rules, the legal review, usability testing with real people, the Google brand check and Search Console step (backlog B1), the Supabase password rules and plain subject lines for the three email templates, a Turnstile widget if wanted, real client work for the examples, the About note and company details, and the final go-live decision.

## Next up, in order (needs no new owner accounts unless stated)

1. **After the first deploy:** run the live header checks and open `/builder/` once (reminder in `docs/HANDOFF.md`); set `STAGING_URL` so the nightly scan starts. Fix the CI-only failures seen on `main` (feature checks, secret scan over history flags a test fixture).
2. **Store what was built:** orders and entitlements tables with row level security, then the download endpoint that calls `entitlement.js` (E7.2, E7.3), the dashboard (E10).
3. **Checkout against Stripe test mode and a fake** (E8), then the owner back office (E9.3 to E9.5). Needs the owner's Stripe account for real use.
4. **Send to GitHub:** the route, the Get-it button and the install flow once the owner has registered the GitHub App (`docs/deploy/github-app.md`; decide how a new repository is created).
5. Legal drafts (E12), analytics (E13), the owner's About text, the guide's screenshots and two timed outside tests (E7.8), a pass with five real people on real phones (E15).

## Known gaps

No real payment and no stored entitlements; the About page is a draft; the preview frame is same-origin with the builder; the guide has no screenshots yet; Advanced mode on a phone is usable but tall; the account page is not linked from the menu; the questions do not link to the builder yet; emails from Supabase use the default subjects until the owner edits them.

## Decisions still open (defaults in the design doc apply if unanswered)

Revision rounds and timing for "we build it"; the VAT rule; the refund rule; whether the editor should be live for everyone (it saves in the editor's own browser and is published as a file; a live editor needs a small server per site); whether the public questions should link to the builder yet; mobile building (**decided 2026-10-29: build on a phone**); D2, D4, D5, D6.

## Backlog: parked on purpose, not started

Items the owner has seen and decided to leave for later. Do not start one without being asked.

- **B1. Google's sign-in screen shows the long Supabase address (parked 2026-10-28).** Google's account chooser says "continue to idvirglyjvqneaudnsuu.supabase.co" instead of "edvlabs". Supabase's documentation names two fixes:
  1. **Verify the brand with Google (free, recommended; takes a few business days).** In Google Auth Platform → Branding set app name `edvlabs`, a square 120×120 logo, home page `https://edvlabs.com`, privacy policy and terms links, authorized domains (`edvlabs.com` and the full Supabase project domain `<ref>.supabase.co`, not the bare `supabase.co`), developer contact email; prove ownership of `edvlabs.com` in Google Search Console (one TXT record in Cloudflare DNS); keep the app "In production"; then press "Verify branding" in the Verification Center. Needs from Claude when it is taken up: a **Privacy policy page** and a **Terms page** on the site, clearly marked as drafts for a professional to review (these are E12.1 and E12.2 in the storefront plan; Google needs the privacy page before it will verify), footer links to both, and a **120×120 logo** made from the sun-and-circle mark. Needs from the owner: the Search Console verification, the Branding form, and the review wait.
  2. **A custom domain for Supabase (paid).** A Supabase Pro plan add-on (about $10 a month) lets the project answer on a domain such as `auth.edvlabs.com`; Google then shows that instead. The callback address in the Google and GitHub apps and in `docs/deploy/accounts.md` would change. Worth doing later if everything should sit under the owner's own domain.
  Until then the sign-in works as it is; the long address is only cosmetic.
