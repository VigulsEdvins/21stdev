-- Stripe payment for a publishing place (plan 2026-10-31-stripe-publish-places.md).
-- The webhook writes a place into site_entitlements (granted_by = 'payment'). stripe_session_id is unique, so the same payment arriving twice
-- (Stripe retries, or the event is replayed) can only ever make one place. stripe_payment_intent lets a refund find the place again.
-- Nothing here is readable or writable from the browser beyond what site_entitlements already allowed: the browser reads its own rows, only the server writes.
alter table public.site_entitlements
  add column if not exists stripe_session_id text,
  add column if not exists stripe_payment_intent text;

create unique index if not exists site_entitlements_stripe_session on public.site_entitlements (stripe_session_id) where stripe_session_id is not null;
create index if not exists site_entitlements_stripe_intent on public.site_entitlements (stripe_payment_intent) where stripe_payment_intent is not null;

-- the browser may read its own row, but the Stripe ids are for the server only
revoke select on public.site_entitlements from authenticated;
grant select (id, user_id, site_id, status, paid_until, granted_by, created_at) on public.site_entitlements to authenticated;
