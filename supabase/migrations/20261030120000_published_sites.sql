-- Publishing a page at <name>.edvlabs.com (plan 2026-10-30-publish-subdomain.md).
-- Three tables. A signed-in person may READ their own rows; nobody can write to them from the browser. Every change is made by the
-- server (the Worker, with the service key), because a name, a payment and a "live" state must not be something a visitor can set themselves.
-- Anonymous visitors have no access at all. The files themselves are in R2 and the lookup the visitors hit is in KV, not here.

-- One row per published site. id is stable, so renaming a site never moves its files (they are stored under the id).
create table public.published_sites (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null check (char_length(name) between 3 and 30 and name ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  project_id   uuid references public.projects (id) on delete set null,   -- the saved page it came from, if any
  version      integer not null default 0 check (version >= 0),            -- the folder in R2 that is live now; 0 until the first publish finishes
  last_version integer not null default 0 check (last_version >= version), -- the highest folder number handed out; two publishes at once never share a folder
  status       text not null default 'unpublished' check (status in ('live', 'unpublished', 'blocked')),
  renamed_at   timestamptz[] not null default '{}',                        -- when it was renamed; the Worker allows 2 renames per 30 days
  created_at   timestamptz not null default now(),
  published_at timestamptz,
  updated_at   timestamptz not null default now()
);
-- Two people can never hold the same name: this index is the real guarantee, whatever the Worker checks first.
create unique index published_sites_name on public.published_sites (name);
create index published_sites_user on public.published_sites (user_id, created_at desc);

-- A name that was just given up by a rename or an unpublish stays reserved for its owner for 90 days, so nobody else can take it and pose as that
-- business. While held, the old address redirects (301) to the new one if the site was renamed.
create table public.site_name_holds (
  name        text primary key check (char_length(name) between 3 and 30 and name ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  user_id     uuid not null references auth.users (id) on delete cascade,
  site_id     uuid references public.published_sites (id) on delete cascade,
  redirect_to text check (redirect_to is null or redirect_to ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  expires_at  timestamptz not null
);
create index site_name_holds_user on public.site_name_holds (user_id);
create index site_name_holds_expiry on public.site_name_holds (expires_at);

-- Publishing on an edvlabs address is a paid action. One row is one paid place for one site. site_id is empty until the person uses it for a site.
-- Until payment is built, the owner adds rows by hand (status 'active', granted_by 'owner'); the payment service will write the same rows later.
create table public.site_entitlements (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  site_id    uuid unique references public.published_sites (id) on delete set null,
  status     text not null default 'active' check (status in ('active', 'ended', 'refunded')),
  paid_until timestamptz not null,           -- after this date there are 14 days of grace, then the site goes offline; its files are kept 90 days
  granted_by text not null default 'owner' check (granted_by in ('owner', 'payment')),
  created_at timestamptz not null default now()
);
create index site_entitlements_user on public.site_entitlements (user_id);

alter table public.published_sites enable row level security;
alter table public.site_name_holds enable row level security;
alter table public.site_entitlements enable row level security;

revoke all on public.published_sites from anon;
revoke all on public.site_name_holds from anon;
revoke all on public.site_entitlements from anon;
revoke all on public.published_sites from authenticated;
revoke all on public.site_name_holds from authenticated;
revoke all on public.site_entitlements from authenticated;
grant select on public.published_sites to authenticated;
grant select on public.site_name_holds to authenticated;
grant select on public.site_entitlements to authenticated;
-- no insert, update or delete grant on any of them: only the server writes

create policy "published_sites: owner reads"   on public.published_sites   for select to authenticated using ((select auth.uid()) = user_id);
create policy "site_name_holds: owner reads"   on public.site_name_holds   for select to authenticated using ((select auth.uid()) = user_id);
create policy "site_entitlements: owner reads" on public.site_entitlements for select to authenticated using ((select auth.uid()) = user_id);

-- Safety cap: at most 10 sites per account (each is paid for separately, so this only stops a runaway). To allow more for one person, raise the number here.
create or replace function public.published_sites_limit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select count(*) from public.published_sites where user_id = new.user_id) >= 10 then
    raise exception 'too many sites' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger published_sites_limit before insert on public.published_sites for each row execute function public.published_sites_limit();
