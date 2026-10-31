-- Hosting as a subscription (plan 2026-10-31-stripe-publish-places.md, revised): a place now belongs to a Stripe subscription (monthly or yearly, first month free).
-- invoice.paid moves paid_until forward on every renewal; customer.subscription.deleted ends the place. One subscription is one place, so the id is unique.
-- The Stripe customer id lets the person open the billing portal (cancel, change plan, new card). Server only: the browser cannot read these columns.
alter table public.site_entitlements
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_customer_id text;

create unique index if not exists site_entitlements_stripe_subscription on public.site_entitlements (stripe_subscription_id) where stripe_subscription_id is not null;
-- the earlier migration already limits what the browser may read to the non-Stripe columns
