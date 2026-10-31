-- Price after discussion (plan 2026-10-31-price-after-discussion.md): the owner can set one agreed price, in cents, on a client's saved page.
-- The checkout then charges that amount for the build instead of the block price list. null means no agreed price (the normal price list applies).
-- Only the owner writes it, with the service key, through `npm run owner-sites -- agree-price`. The `authenticated` role keeps its column-level
-- update grant (name, state, deleted_at, updated_at, revision) and is NOT granted this column, so a client cannot set their own price.
alter table public.projects add column agreed_price_cents integer check (agreed_price_cents is null or agreed_price_cents between 100 and 10000000);
