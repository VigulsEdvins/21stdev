# Buying flow in the builder: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A "Proceed" overlay in builder step 5 where a signed-in client picks where the site goes, adds extras, sees one total and pays once with Stripe; download and publishing unlock only after that payment.

**Architecture:** The server recomputes every price from the saved project and `site/js/prices.js` (`quote.js`, pure), builds one Stripe Checkout Session from it (`mode=subscription` with a 30-day trial when hosting is chosen, otherwise `mode=payment`; one-time items as inline `price_data`), and the webhook writes `project_purchases` (idempotent on the session id) and, for hosting, the existing `site_entitlements` place. The browser overlay (`scripts/builder/guided-buy.js`) only displays the server's quote and redirects to Stripe.

**Tech Stack:** Cloudflare Worker (CommonJS in `functions/lib`), Supabase REST via `sites-store.js`, Stripe over `fetch`, plain-JS builder scripts, Node assert tests, Playwright e2e.

**Spec:** `docs/superpowers/specs/2026-10-31-buying-flow-design.md` (builds on `docs/superpowers/plans/2026-10-31-stripe-publish-places.md`, already live in test mode).

## Global Constraints

- Prices only from `site/js/prices.js` (table v1: base 39, included 3, extra 9, editor 39, hostingMonth 3, hostingYear 29). New: `deployHelp: 30` added to the v1 table. Nothing else may hard-code a price.
- The browser never supplies a price or a block count; both come from the saved project on the server.
- Hosting: monthly 3 EUR or yearly 29 EUR, **first month free** (`STRIPE_TRIAL_DAYS`, default 30); only with destinations `edvlabs` and `domain`.
- "Put it online for me" +30 EUR one-time: only with destinations `domain` and `download`, never `edvlabs`.
- After paying once there is no time limit on editing or re-downloading; the 12-month **price lock** for later extra blocks stays (`entitlement.upgrade`).
- Stripe test mode only until the owner says otherwise; a visible "test mode" note in the overlay while the key is a test key.
- Copy in plain words for non-technical clients; no jargon.
- Secrets never in git; test files must not contain strings that match `scripts/check-secrets.js` patterns (build fakes in pieces).
- Work is committed locally; **never push without asking** (owner rule).

## Review Focus

- A forged request (changed `editor`, `hosting`, destination, another person's `projectId`) must change nothing about the price or ownership: the quote and checkout use the stored project of the signed-in user only.
- A project with zero blocks, or only the language switcher, cannot be bought (nothing to pay for).
- The same webhook event delivered ten times, or two at once, makes one purchase and one place.
- Two browser tabs paying for the same project: the second sees "already bought" and is not charged twice for the same blocks.
- Destination `edvlabs` with deploy help, or `download` with hosting, is refused (combination not offered).
- A client who closes the Stripe page and returns (`?paid=0`) keeps his whole builder state and sees nothing charged.

---

### Task 1: Prices and the pure quote

**Files:**
- Modify: `site/js/prices.js` (add `deployHelp: 30` to v1)
- Create: `functions/lib/quote.js`
- Test: `tests/test-quote.js` (add `test:quote` to `package.json` and into `npm test`)

**Interfaces:**
- Produces: `quote({ blocks: number, editor: boolean, destination: 'edvlabs'|'domain'|'download', hosting: 'monthly'|'yearly'|null, deployHelp: boolean, paid?: { allowance: number, editor: boolean, version: string } }) -> { ok: true, lines: [{ key: 'base'|'extra'|'editor'|'hosting'|'deployHelp', label: string, amount: number, qty?: number }], payToday: number, hosting: null | { plan: 'monthly'|'yearly', amount: number, trialDays: number }, priceVersion: string, newAllowance: number } | { ok: false, reason: 'no-blocks'|'bad-combination'|'nothing-to-pay' }`
- Consumes: `EdvPrices` (`table`, `version`, `tableFor`, `upgrade`, `self`).

- [ ] **Step 1: Write the failing tests** in `tests/test-quote.js` using the spec's numbers: 5 blocks + editor + `edvlabs` + monthly → lines base 39, extra 2×9=18, editor 39, `payToday` 96, `hosting.amount` 3, `trialDays` 30; 3 blocks download → `payToday` 39 and `hosting` null; `domain` + `deployHelp` → adds 30; `edvlabs` + `deployHelp` → `{ ok:false, reason:'bad-combination' }`; `download` + hosting → `bad-combination`; `blocks: 0` → `no-blocks`; with `paid: { allowance: 5, editor: false, version: 'v1' }` and 6 blocks + editor → lines only 1 extra block (9) and editor (39), no base; with `paid` covering everything and no hosting → `nothing-to-pay`.
- [ ] **Step 2: Run** `node tests/test-quote.js`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** `quote.js` as above (pure; uses `Prices.upgrade` when `paid` is given, `Prices.self` pieces otherwise). Hosting amount comes from `table.hostingMonth/hostingYear`.
- [ ] **Step 4: Run** the test and `npm run -s test:entitlement`. Expected: both pass.
- [ ] **Step 5: Commit** `git commit -m "Quote: one pure price calculation for the buying flow"`.

### Task 2: Purchases table and store methods

**Files:**
- Create: `supabase/migrations/20261031160000_project_purchases.sql`
- Modify: `functions/lib/sites-store.js`, `tests/lib/fake-sites.js` (only if the fake needs the methods), `tests/test-sites-store.js`

**Interfaces:**
- Produces (store `db`): `projectForUser(projectId, userId) -> { id, name, state, status } | null`; `purchaseForProject(projectId) -> row | null`; `purchasesByUser(userId) -> row[]`; `insertPurchase(row) -> row` (throws code `'duplicate'` on a repeated `stripe_session_id`); `insertDeployRequest(row)`; `deployRequestsOpen() -> row[]`; `markProjectPaid(projectId)` (sets `projects.status='paid'`).
- Table `project_purchases`: `id uuid pk, project_id uuid references projects, user_id uuid references auth.users, allowance int, editor boolean, price_version text, destination text, stripe_session_id text unique, created_at`; extra purchases for the same project are added rows, never updates. Table `deploy_requests`: `id, purchase_id, user_id, domain text, notes text (≤2000), status 'open'|'done', created_at`. Row level security on, browser may only `select` its own rows, no insert/update grants (server writes).

- [ ] **Step 1: Write failing tests** in `tests/test-sites-store.js` for each method against the file's existing `fetch` fake: URL, filter by `user_id` on `projectForUser` (another user's project returns `null`), `insertPurchase` maps `23505` to code `duplicate`.
- [ ] **Step 2: Run** `npm run -s test:sitesstore`. Expected: FAIL.
- [ ] **Step 3: Write the migration and the store methods** following the style of `20261031140000_stripe_payments.sql` and the existing `first`/`all`/`rest` helpers.
- [ ] **Step 4: Run** the store test. Expected: PASS.
- [ ] **Step 5: Commit** (migration not applied; the owner applies it).

### Task 3: Quote and checkout endpoints

**Files:**
- Modify: `functions/lib/payment.js`, `functions/lib/payment-http.js`
- Test: `tests/test-payment.js`

**Interfaces:**
- Consumes: Task 1 `quote`, Task 2 `db.projectForUser`, `db.purchaseForProject` / `purchasesByUser`.
- Produces: `POST /api/quote` and `POST /api/checkout`, both with body `{ projectId, destination, editor, hosting, deployHelp, siteName? }`. `/api/quote` answers `{ ok, lines, payToday, hosting, testMode }`. `/api/checkout` answers `{ ok, url, testMode }`. `Payment.createOrderCheckout({ env, db, user, origin, order, fetchImpl })` replaces `createCheckout` (the hosting-only `{ plan }` body is dropped; update its tests). Stripe metadata on the session: `user_id`, `project_id`, `destination`, `editor` (`'1'|'0'`), `blocks`, `price_version`, `deploy_help` (`'1'|'0'`), `site_name`.
- `countProjectBlocks(state) -> number` in `functions/lib/quote.js`: counts visible blocks of `state.stack`, and across `state.pages[i]` when present (read `scripts/builder/account-save.js` lines 39-60 for the saved shape), using `Entitlement.countBlocks`.

- [ ] **Step 1: Write failing tests**: (a) `/api/quote` with a stored 5-block project returns `payToday 96` for editor+edvlabs+monthly even if the body also sends `blocks: 1` or `price: 1` (ignored); (b) `projectId` of another user → 404; (c) bad combinations → 400 with plain message; (d) `/api/checkout` posts to Stripe `mode=subscription` with `subscription_data[trial_period_days]=30` for hosting, and `mode=payment` (no trial fields) for download; one-time lines use `price_data` with `unit_amount` in cents and `currency=eur`; (e) if `purchaseForProject` already covers everything and no hosting → 409 "already bought"; (f) 0 blocks → 400; (g) test-mode flag.
- [ ] **Step 2: Run** `npm run -s test:payment`. Expected: FAIL.
- [ ] **Step 3: Implement** `createOrderCheckout`, `/api/quote`, the reworked `/api/checkout`; remove the old plan-only path. Quote for an already-bought project uses `paid` from the sum of its purchases (allowance = max, editor = any).
- [ ] **Step 4: Run** `npm run -s test:payment`. Expected: PASS.
- [ ] **Step 5: Commit.**

### Task 4: Webhook records the purchase and deploy help

**Files:** Modify `functions/lib/payment.js` (`subscribed` → `completed`), Test `tests/test-payment.js`

**Interfaces:**
- Consumes: Task 2 store methods, Task 3 metadata.
- Produces: on `checkout.session.completed` (both modes, `payment_status` paid or trial): `db.insertPurchase` (idempotent), `db.markProjectPaid`, the hosting place only when `session.mode==='subscription'` (existing behaviour), `db.insertDeployRequest({ purchase_id, user_id, status:'open' })` when `deploy_help==='1'`.

- [ ] **Step 1: Failing tests**: session with all metadata makes one purchase, one place, one deploy request; replay ×10 and two at once change nothing; `mode=payment` makes a purchase but no place; metadata with a non-UUID `project_id` → 400 and nothing written; refund event still ends the hosting place.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS. **Step 5: Commit.**

### Task 5: Unlocking: my-purchases, publish gate, deploy-help details

**Files:** Modify `functions/lib/publish-http.js`, `functions/lib/publish.js`, `functions/lib/payment-http.js`, tests `tests/test-publish.js`, `tests/test-publish-http.js`, `tests/test-payment.js`; modify `tests/lib/fake-sites.js`

**Interfaces:**
- Produces: `GET /api/my-purchases -> { ok, purchases: [{ projectId, allowance, editor, destination, createdAt }], paymentOn: boolean }`; `POST /api/deploy-request { purchaseId, domain, notes }` (owner only, once per purchase, `notes` ≤ 2000, `domain` validated as a host name) → `{ ok }`. `publish()` takes `projectId` and, **when payment is switched on** (`paymentOn` = Stripe settings present), refuses with status 402 and `reason:'payment-needed'` unless that user has a purchase for that project; a missing `projectId` is also refused in that case. With payment off, behaviour is unchanged (existing tests stay green).

- [ ] **Step 1: Failing tests**: publish without purchase → 402 when payment on, 200 when off; with purchase for another project → 402; purchases list shows only the caller's; deploy-request refuses another person's purchase and a second submission.
- [ ] **Step 2: Run** `npm run -s test:publish && npm run -s test:publishhttp && npm run -s test:payment` → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS. **Step 5: Commit.**

### Task 6: Owner command for deploy requests

**Files:** Modify `scripts/owner-sites.js`, Test `tests/test-owner-sites.js`

**Interfaces:** `npm run owner-sites -- deploy-requests [--done <id>]` lists open requests (email, domain, notes, paid date) and marks one done.

- [ ] Steps: failing test with the existing fake; implement; run `npm run -s test:ownersites`; commit.

### Task 7: The overlay

**Files:**
- Create: `scripts/builder/guided-buy.js`, `builder-buy.css`
- Modify: `scripts/builder/guided-get.js` (add the **Proceed** button; hide the old download and publish boxes until the project is bought), `scripts/builder/publish-client.js` (`quote(order)`, `checkout(order)`, `myPurchases()`, `deployRequest(...)`), `scripts/builder/guided-publish.js` (reuse `publish()` after payment), `builder.html` (load script and css), `scripts/build-site.js` if it lists builder scripts
- Test: `tests/test-publish-client.js`, new `tests/e2e/guided-buy.e2e.js`

**Interfaces:**
- Consumes: Tasks 3 and 5 endpoints; `BuilderPublishClient`, `EdvAuth`, `EdvSiteNames`, the builder's cloud save (save before Proceed so `projectId` exists).
- Produces: `BuilderGuidedBuy.open(win, { projectId })`; overlay `role="dialog" aria-modal="true"` with three steps (Where, Extras and billing, Check and pay), a running total, and the four destination cards; "Do it for me" is the extra **Put it online for me +€30** (offered only for domain and download); hosting choice monthly/yearly with "first month free"; withdrawal-waiver checkbox before the Pay button; Escape and "Back to builder" close it without losing state; focus trap.

- [ ] **Step 1: Failing e2e** (`npm run test:e2e`-style file like `guided-publish.e2e.js`, fake server): signed-out client sees sign-in prompt; step 1 `edvlabs` shows the name check; selecting `download` hides hosting and hides deploy help only for `edvlabs`; total on step 3 equals the server quote (not recomputed in the browser); Pay stays disabled until the checkbox is ticked; Escape returns to the builder with the stack intact; `?paid=0` shows "nothing was charged".
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** the overlay with plain DOM like `guided-publish.js` (no framework). **Step 4: Run** the e2e and `npm run -s test:publishclient`. **Step 5: Commit.**

### Task 8: After payment, lock check, docs, test-mode run

**Files:** Modify `scripts/builder/guided-get.js` (unlock download from `myPurchases`; after `?paid=1` poll until the purchase appears, then continue to publish or download, or open the deploy-help form), `docs/deploy/publish-sites.md`, `docs/HANDOFF.md`

- [ ] **Step 1:** Extend the e2e: after a fake purchase appears, download unlocks, "Put it online" runs with the chosen name; deploy-help form submits to `/api/deploy-request`.
- [ ] **Step 2:** Run the full `npm test`, `npx eslint functions scripts tests site/js`, `node scripts/check-secrets.js` (only the two older known hits allowed). Expected: green.
- [ ] **Step 3:** Document: apply migration `20261031160000_project_purchases.sql`, no new settings; test-mode run for all four destinations with card `4242 4242 4242 4242`.
- [ ] **Step 4: Commit locally. Ask the owner before any push.**
