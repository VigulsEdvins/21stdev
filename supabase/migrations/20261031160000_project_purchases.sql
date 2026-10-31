-- The buying flow (plan 2026-10-31-buying-flow.md): what a client bought for one saved page, and the 30 EUR "put it online for me" requests.
-- Only the server (the Worker, with the service key, from the Stripe webhook) writes these tables. A signed-in person may read their own rows. Anonymous visitors have no access.
-- A purchase is never edited: buying more blocks later adds another row (allowance and editor are then the highest of the rows). The unique Stripe session id means the same payment
-- arriving twice (Stripe retries) can only ever make one row.
create table public.project_purchases (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references public.projects (id) on delete cascade,
  user_id           uuid not null references auth.users (id) on delete cascade,
  allowance         integer not null check (allowance between 1 and 500),
  editor            boolean not null default false,
  price_version     text not null check (char_length(price_version) between 1 and 20),
  destination       text not null check (destination in ('edvlabs', 'domain', 'download')),
  stripe_session_id text not null unique,
  created_at        timestamptz not null default now()
);
create index project_purchases_user on public.project_purchases (user_id, created_at desc);
create index project_purchases_project on public.project_purchases (project_id, created_at desc);

create table public.deploy_requests (
  id          uuid primary key default gen_random_uuid(),
  purchase_id uuid not null unique references public.project_purchases (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  domain      text check (domain is null or char_length(domain) <= 253),
  notes       text check (notes is null or char_length(notes) <= 2000),
  status      text not null default 'open' check (status in ('open', 'done')),
  created_at  timestamptz not null default now()
);
create index deploy_requests_open on public.deploy_requests (status, created_at);

alter table public.project_purchases enable row level security;
alter table public.deploy_requests enable row level security;

revoke all on public.project_purchases from anon, authenticated;
revoke all on public.deploy_requests from anon, authenticated;
grant select on public.project_purchases to authenticated;
grant select on public.deploy_requests to authenticated;
-- no insert, update or delete grant: only the server writes

create policy "project_purchases: owner reads" on public.project_purchases for select to authenticated using ((select auth.uid()) = user_id);
create policy "deploy_requests: owner reads"   on public.deploy_requests   for select to authenticated using ((select auth.uid()) = user_id);
