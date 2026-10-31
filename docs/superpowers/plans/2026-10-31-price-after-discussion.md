# Price after discussion for "we build it"

Owner request (2026-10-31): the price for the owner's own work felt too high, so it should be set after a talk, not shown up front.
Owner choices: **only the done-for-you path** changes; the self-serve builder prices and checkout stay. The agreed price is set in an **admin field** and the checkout then charges that amount.

## What changes

1. **No public done-for-you price.** Home, pricing page, the question flow's price card, the builder's "Get it" panel and the Latvian copies stop showing "from €294 / €382" and the €150 + €35-per-block rule. They say instead: "Price agreed after we talk. No obligation." The self-serve numbers are untouched.
2. **Owner's lead email keeps an internal guide.** `functions/lib/lead.js` still lists the formula figure, relabelled "guide only, not shown to the visitor", so the owner has a starting point for the talk.
3. **Agreed price field.** New column `projects.agreed_price_cents` (integer, null = none). Written only by the owner with the service key; the `authenticated` role has no update grant on it, so a client cannot set their own price. Owner tool: `npm run owner-sites -- agree-price <email|user-id> <project-id> <euros>` (and `--clear`), plus `projects <email|user-id>` to list a person's pages with ids.
4. **Checkout honours it.** When a saved page has an agreed price, `quote.js` returns one line "Website built by edvlabs" for that amount instead of base/extra/editor lines; hosting, deploy help and the rest of the flow work as before. The browser still never sends a price. A page with an agreed price that is already paid says "nothing more to pay".

## What stays true

- Prices only from `site/js/prices.js` or the owner's stored agreed price; never from the browser.
- Self-serve price lock (D7a) and the `v1` table stay as they are.
- The payment webhook, Stripe Tax and the `BUYING_FLOW` switch are unchanged.
- Nothing is pushed; commit locally only.

## Owner steps

- Apply the migration on Supabase (`supabase db push` or the dashboard SQL editor) before using `agree-price`.
- Deploy; then after a talk: `owner-sites projects <email>`, `owner-sites agree-price <email> <project-id> 250`, tell the client to press Proceed in the builder.

## Tests

`tests/test-quote.js` (agreed price line, hosting still added, paid page), `tests/test-owner-sites.js` (new commands), a store test for the column, and the existing price-text tests updated for the new wording.
