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

## Next steps (in order)

1. **Owner review of the wording** of the ten questions (E3.1) and the home page text; then examples strip with real screenshots, owner note, company details in the footer.
2. Set up Cloudflare Pages with the owner (E0.8, E0.5): staging at staging.edvlabs.com, a lead test reaching the owner's email. The owner runs the account steps; Claude cannot log in.
3. Lead intake and the owner's lead list (E3.6, E9).
4. Remaining security tasks in E16 (static analysis, the 58 `innerHTML` sites, preview-frame isolation, headers/CSP).

## Rules to keep

- **Commit locally only. Never push, and never rename the GitHub remote (`VigulsEdvins/21stdev`), without asking.**
- No secrets, no email address, no phone number in git. `npm run check-secrets` must stay clean.
- No real company names, real-site links or third-party code in components or assets (six files in `assets/library/` still have real names, see plan E12.6).
- `template-mom`, `template-cvmaker` and the components derived from them are the owner's own work: leave them alone. The full-site templates live in sibling folders outside the repo (plan E0.6).
- Plain words on the public site: "block of your page", not "section"; "the editor", not "CMS"; "get your site", not "export". Avoid the AI-look list (plan E1.4).
- Every change: run `npm run verify`, `npm test`, and the browser tests that touch it. Report what was and was not run.

## Open questions for the owner

- Wording of the ten questions (plan E3.1) and what "done for you" includes (revision rounds, timing, what is not included).
- Prices after three real local quotes; the refund rule; the invoice set-up with the accountant.
- Decisions D2, D4, D5, D6 in the design doc (defaults are written there).
- Legal texts (terms, privacy) need a professional's review before launch.
