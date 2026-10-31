# Stripe payment for a publishing place (plan, 2026-10-31)

Status: **owner decisions 2026-10-31 (below); being built in Stripe TEST mode only.** Follows `2026-10-30-publish-subdomain.md` and `2026-10-30-account-limits.md`; it is the first slice of plan E8.

## Decisions (owner)

1. The first thing Stripe sells is **one paid place for publishing** at `<name>.edvlabs.com` (the row in `site_entitlements` that `npm run owner-sites -- grant` writes by hand today). The ZIP download and limit upgrades come later.
2. **One payment per year**, not a subscription. Paying gives one place valid for 12 months; renewing is another payment (renewal button: later). The existing rules stay: 14 days of grace after `paid_until`, then the site goes offline, files kept 90 days.
3. Start with **test keys** (`sk_test_…`). Production keys are swapped in only after a full test run, with the go-live checklist at the end of this file.

## Why this shape

- The place model already exists and is enforced in `publish.js`; payment only has to **create the same row** (`granted_by = 'payment'`). Nothing in publishing changes.
- The browser never decides what was paid for. The server creates the Checkout Session; the **webhook** (signature-checked) is the only thing that creates the place. The success page just re-reads `my-sites`.
- No Stripe SDK: the Worker calls `api.stripe.com` with `fetch` and checks the webhook signature with Web Crypto. Fewer dependencies, runs in Workers and Node.

## How

- **Settings (Worker, never in git):** `STRIPE_SECRET_KEY` (secret), `STRIPE_WEBHOOK_SECRET` (secret), `STRIPE_PRICE_ID` (plain variable, the one-off price of a place; created in the Stripe dashboard, so the price is not in our code). Without them the two endpoints answer 503 naming what is missing and the builder keeps the "ask edvlabs" line.
- **`POST /api/checkout`** (signed in): creates a Checkout Session, `mode=payment`, one line item of `STRIPE_PRICE_ID`, quantity 1, `client_reference_id` = user id, `customer_email` = the account email, `metadata.user_id`, `success_url` = `/builder/?paid=1`, `cancel_url` = `/builder/?paid=0`. Answers `{ ok, url, testMode }`; the builder goes to `url`. Stripe Tax and address collection stay off until the accountant has decided (E8.1).
- **`POST /api/stripe-webhook`** (no sign-in, Stripe only): reads the raw body, verifies `Stripe-Signature` (HMAC-SHA256 of `t.body`, constant-time compare, 5 minute tolerance), then handles:
  - `checkout.session.completed` and `checkout.session.async_payment_succeeded` with `payment_status = paid`: insert a place for `metadata.user_id`, `paid_until` = now + 12 months, `stripe_session_id` set. A **unique index on `stripe_session_id`** makes replays do nothing (the same event ten times leaves one place).
  - `charge.refunded` (fully refunded): the place for that payment intent becomes `refunded` (an unused place is simply gone; a used place's site follows the existing "ended" path).
  - everything else: answered 200 and ignored. A bad signature is 400; a failure while writing is 500 so Stripe retries.
- **Database:** migration adds `stripe_session_id text unique` and `stripe_payment_intent text` to `site_entitlements`. No new table.
- **Builder:** the "Ask edvlabs" link is replaced by a "Buy a place" button when checkout is available; back from Stripe with `?paid=1` the box re-reads `my-sites` a few times (the webhook can arrive a second after the redirect) and says so plainly. A "test mode" note shows while the key is a test key.
- **Owner command:** `grant` stays for manual cases.

## Order

1. Migration file (not applied until the owner says so). 2. `functions/lib/payment.js` (signature check, Checkout call, event handling) with an in-memory fake. 3. `payment-http.js` routed from `lead-http.js`, store methods in `sites-store.js`. 4. Tests (`tests/test-payment.js`, in `npm test`). 5. Builder button. 6. Owner steps in `docs/deploy/publish-sites.md`. 7. Real test-mode run with the Stripe CLI / test card `4242 4242 4242 4242`.

## Go-live checklist (later, owner)

Create the live product/price; set live `STRIPE_SECRET_KEY` and `STRIPE_PRICE_ID`; add a live webhook endpoint in Stripe for `https://edvlabs.com/api/stripe-webhook` and put its `whsec_…` in `STRIPE_WEBHOOK_SECRET`; one real small payment, then refund it and check the place is gone; accountant's VAT/invoice decision (E8.1, E8.4) done before the first customer.
