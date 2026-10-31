# Buying flow in the builder: design (2026-10-31)

Status: **draft for the owner's approval; nothing built.** Size: a project (new payment, new table, new overlay, gating). Follows `docs/superpowers/plans/2026-10-31-stripe-publish-places.md` (hosting subscription, built and tested in Stripe test mode).

## Intent and why

Step 5 of the builder ("Get it") mixes a price meter, an address box, a free download and the "Put it online" box. A non-technical client cannot tell what he is buying or where the site will end up. The owner wants one clear path: press **Proceed**, an overlay opens over the builder, he picks where the site goes, adds extras, sees **one total**, pays once, and only then downloads or publishes.

## Goals

- One overlay with three short steps (owner picked layout B): **1 Where**, **2 Extras and billing**, **3 Check and pay**, with a running total.
- Four destinations (owner): edvlabs address, own domain, download, "do it for me".
- One Stripe payment for everything bought at once (build price, admin panel, deploy help, hosting with its free month).
- Nothing is published or downloaded before the build price is paid (owner).
- After paying once, the client may edit and download again without a time limit (owner, 2026-10-31; replaces the 12-month download expiry in `functions/lib/entitlement.js`). The 12-month **price lock** for extra blocks stays; he never sees it.
- Prices only from `site/js/prices.js`; the server recomputes every price (a browser never says what it costs).

## Non-goals and anti-goals

- No full builder rewrite, no new account system, no refunds or invoices here (plan E8.4, E8.5), no promo codes.
- Anti-goal: a screen that makes the client think he pays twice, or that hides the monthly fee. Hosting and its price are always visible before paying.

## What the client sees (owner decisions)

1. **Where should it live?** (a) edvlabs address: a name box that checks the name is free (existing `/api/site-name`); (b) own domain: chosen now, typed in after paying with the existing guide; (c) download: no hosting fee; (d) *do it for me*: see below.
2. **Extras and billing:** admin panel +39 EUR; hosting monthly 3 EUR or yearly 29 EUR, first month free (only for (a) and (b)); **"Put it online for me" +30 EUR one-time**, offered with (b) and (c), not with (a) because that publishes itself.
3. **Check and pay:** lines with prices, "Pay today X", the hosting line ("free for 30 days, then 3 EUR a month, cancel any time"), the withdrawal-waiver checkbox for digital content (wording from plan E0.2), and one **Pay with Stripe** button. After paying: the site goes online, the download starts, or the deploy-help form opens.

Build price (existing table, v1): 39 EUR for 3 blocks, 9 EUR per extra block, 39 EUR for the admin panel. "Do it for me" is a 30 EUR deploy-only service for a site the client already built, not the 150 EUR set-up fee (owner).

## Approaches considered (owner picked A)

- **A. Overlay inside the builder (chosen).** The built page stays in the browser, nothing is lost, existing publish code is reused. Smaller change.
- B. Separate `/checkout/` page. Shareable, but needs the builder state saved to the account first. More steps, more failure points. Better only if people are sent to pay from outside the builder.
- Within A, one Stripe session holds the one-time items and the subscription: `mode=subscription` with one-time line items (they are charged at once) and a 30-day trial when hosting is chosen; plain `mode=payment` for download-only.

## How it works (builder's calls unless marked)

- **Sign-in and saving [my call]:** Proceed needs a signed-in account and a project saved to the cloud (the builder already has cloud save). The server must know the block count from the saved project, not from the browser.
- **Server quote:** `POST /api/quote { projectId, destination, editor, hosting: 'monthly'|'yearly'|null, deployHelp }` returns lines and totals using `prices.js` and the project's stored blocks (`entitlement.countBlocks`). `POST /api/checkout` takes the same and builds the Stripe session from a fresh quote, never from client prices. One-time items use inline `price_data`, so no Stripe price per block count is needed. Hosting uses the two existing recurring prices.
- **Data [my call]:** new table `project_purchases` (project, user, allowance, editor, price_version, stripe_session_id unique, created_at) written only by the webhook, plus `deploy_requests` (purchase, domain, host notes, status) for the 30 EUR service. The existing hosting place (`site_entitlements`) is unchanged and is still created by the webhook.
- **Unlocking:** `/api/publish` refuses a project without a purchase once payment is switched on. Download is unlocked in the builder from `GET /api/my-purchases`. **Limit to accept:** the builder builds the ZIP in the browser, so a technically skilled person could bypass the download lock; publishing on edvlabs is enforced on the server. Fully server-side downloads would be a separate project.
- **Later changes:** adding blocks or the admin panel after buying opens the same overlay with only the difference (`entitlement.upgrade`), at the price table he bought at.
- **Owner's money rules still open:** VAT (prices shown with VAT included is the proposal; accountant decides, plan E8.1), invoices (E8.4), refund rule (E8.5), legal waiver wording (E0.2). Test mode shows a visible banner in the overlay.
- **Failure and waiting:** after Stripe the overlay shows "confirming payment" and polls like the current `?paid=1` handling; a lost webhook is repaired by the same retry Stripe already does; replays are harmless (unique session id).

## Left to the builder

Visual design inside the existing builder styling; exact wording of lines (plain words, no jargon); keyboard and screen-reader behaviour of the overlay (focus trap, Escape closes, back to builder keeps everything); mobile layout; tests (price lines against `prices.js`, quote and checkout refuse a forged price, replayed webhook makes one purchase, overlay browser test for all four destinations).

## Order of work

1. Server: `project_purchases` migration, quote, checkout, webhook, my-purchases, publish gate. 2. Overlay (three steps) replacing the price meter and publish box in step 5. 3. Deploy-help form and owner notice. 4. Test-mode run for all four destinations. 5. Docs in `docs/deploy/publish-sites.md`.
