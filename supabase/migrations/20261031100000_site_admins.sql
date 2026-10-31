-- The admin panel of a published site (plan 2026-10-31-site-admin-panel.md).
-- One row per site that has an admin panel: the username, the hash of the password (never the password), and the ten digits of the secret address /admin<digits>.
-- Only the server (the Worker, with the service key) writes it. A signed-in person may read the non-secret columns of their own rows; the hash, the salt and the
-- number of rounds are not readable from the browser at all (column-level grant), and anonymous visitors have no access.

create table public.site_admins (
  site_id            uuid primary key references public.published_sites (id) on delete cascade,
  user_id            uuid not null references auth.users (id) on delete cascade,  -- the site's owner, kept here so the read policy needs no join
  path_digits        text not null check (path_digits ~ '^[0-9]{10}$'),
  username           text not null check (username ~ '^[a-z0-9][a-z0-9._-]{2,30}[a-z0-9]$'),
  password_hash      text not null check (char_length(password_hash) between 20 and 100),
  salt               text not null check (char_length(salt) between 16 and 60),
  rounds             integer not null check (rounds between 1000 and 1000000),
  credential_version integer not null default 1 check (credential_version >= 1),  -- raised on every change of username, password or address; ends open sessions
  last_login_at      timestamptz,
  created_at         timestamptz not null default now(),
  changed_at         timestamptz not null default now()
);
-- Two sites never share a secret address; the server draws again when this refuses one.
create unique index site_admins_path_digits on public.site_admins (path_digits);
create index site_admins_user on public.site_admins (user_id);

alter table public.site_admins enable row level security;
revoke all on public.site_admins from anon;
revoke all on public.site_admins from authenticated;
grant select (site_id, user_id, path_digits, username, last_login_at, created_at, changed_at) on public.site_admins to authenticated;
-- no insert, update or delete grant: only the server writes

create policy "site_admins: owner reads" on public.site_admins for select to authenticated using ((select auth.uid()) = user_id);
