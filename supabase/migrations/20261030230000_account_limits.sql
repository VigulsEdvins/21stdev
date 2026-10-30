-- Limits for everyone, more for those who pay (plan 2026-10-30-account-limits.md).
-- One row per person who has an upgrade; every column left empty means "the default for everyone" (the defaults are Worker settings, not stored here).
-- Only the server writes it (the owner by hand today, the payment service later); a person may read their own row. Anonymous visitors have no access.

create table public.account_limits (
  user_id             uuid primary key references auth.users (id) on delete cascade,
  publishes_per_hour  integer check (publishes_per_hour between 1 and 200),
  renames_per_30_days integer check (renames_per_30_days between 0 and 100),
  max_site_mb         integer check (max_site_mb between 1 and 20),
  note                text check (note is null or char_length(note) <= 300),
  updated_at          timestamptz not null default now()
);

alter table public.account_limits enable row level security;
revoke all on public.account_limits from anon;
revoke all on public.account_limits from authenticated;
grant select on public.account_limits to authenticated;
create policy "account_limits: owner reads" on public.account_limits for select to authenticated using ((select auth.uid()) = user_id);

-- rename_site now takes the number of renames allowed in 30 days (it was fixed at 2). The old four-argument version is replaced, so a call can never be ambiguous.
drop function if exists public.rename_site(uuid, uuid, text, integer);

create or replace function public.rename_site(p_site uuid, p_user uuid, p_new text, p_hold_days integer default 90, p_max_renames integer default 2)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  s public.published_sites;
  old_name text;
  recent integer;
  held text[];
begin
  select * into s from public.published_sites where id = p_site and user_id = p_user for update;
  if not found then raise exception 'rename:not-found' using errcode = 'P0001'; end if;
  if s.status = 'blocked' then raise exception 'rename:blocked' using errcode = 'P0001'; end if;
  if s.name = p_new then raise exception 'rename:same' using errcode = 'P0001'; end if;
  old_name := s.name;

  select count(*) into recent from unnest(s.renamed_at) as r(ts) where r.ts > now() - interval '30 days';
  if recent >= p_max_renames then raise exception 'rename:too-many' using errcode = 'P0001'; end if;

  if exists (select 1 from public.site_name_holds h where h.name = p_new and h.user_id <> p_user and h.expires_at > now()) then
    raise exception 'rename:taken' using errcode = 'P0001';
  end if;
  delete from public.site_name_holds where name = p_new;

  begin
    update public.published_sites
       set name = p_new,
           renamed_at = (array_append(s.renamed_at, now()))[greatest(1, cardinality(s.renamed_at) - 2):],
           updated_at = now()
     where id = p_site;
  exception when unique_violation then
    raise exception 'rename:taken' using errcode = 'P0001';
  end;

  insert into public.site_name_holds (name, user_id, site_id, redirect_to, expires_at)
  values (old_name, p_user, p_site, p_new, now() + make_interval(days => p_hold_days))
  on conflict (name) do update
    set user_id = excluded.user_id, site_id = excluded.site_id, redirect_to = excluded.redirect_to, expires_at = excluded.expires_at;

  update public.site_name_holds set redirect_to = p_new where site_id = p_site and name <> old_name;
  select array_agg(h.name) into held from public.site_name_holds h where h.site_id = p_site and h.expires_at > now();

  return jsonb_build_object('old', old_name, 'new', p_new, 'version', s.version, 'status', s.status, 'held', coalesce(to_jsonb(held), '[]'::jsonb));
end;
$$;

revoke all on function public.rename_site(uuid, uuid, text, integer, integer) from public, anon, authenticated;
