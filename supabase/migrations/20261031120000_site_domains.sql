-- A customer's own domain for a published site (plan 2026-10-31-custom-domain.md).
-- One row per site that has a domain attached: the host name, Cloudflare's id for it (so the server can ask for its state and delete it), and the state.
-- Only the server (the Worker, with the service key) writes it. A signed-in person may read the non-secret columns of their own rows; anonymous visitors have no access.
--
-- When a site or an account is deleted the row is NOT deleted with it: site_id and user_id become empty and the row stays, so the hourly clean-up still knows which
-- host name to remove at Cloudflare (otherwise a deleted account would leave a paid custom hostname behind). The clean-up deletes the row afterwards.

create table public.site_domains (
  id               uuid primary key default gen_random_uuid(),
  site_id          uuid unique references public.published_sites (id) on delete set null,
  user_id          uuid references auth.users (id) on delete set null,
  hostname         text not null check (char_length(hostname) between 4 and 253 and hostname = lower(hostname) and hostname ~ '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9-]{2,63}$'),
  status           text not null default 'pending' check (status in ('pending', 'active', 'failed')),
  cf_hostname_id   text check (cf_hostname_id is null or char_length(cf_hostname_id) between 8 and 80),
  dns_help         jsonb not null default '{}'::jsonb,   -- the records the customer adds, as Cloudflare reports them; shown on the account page
  last_error       text check (last_error is null or char_length(last_error) <= 300),
  created_at       timestamptz not null default now(),
  activated_at     timestamptz,
  updated_at       timestamptz not null default now()
);
-- Two sites never hold the same host name: this index is the real guarantee, whatever the Worker checks first.
create unique index site_domains_hostname on public.site_domains (hostname);
create index site_domains_user on public.site_domains (user_id);
create index site_domains_orphans on public.site_domains (created_at) where site_id is null;

alter table public.site_domains enable row level security;
revoke all on public.site_domains from anon;
revoke all on public.site_domains from authenticated;
grant select (id, site_id, user_id, hostname, status, last_error, created_at, activated_at, updated_at) on public.site_domains to authenticated;
-- no insert, update or delete grant: only the server writes

create policy "site_domains: owner reads" on public.site_domains for select to authenticated using ((select auth.uid()) = user_id);
