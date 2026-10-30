-- Renaming a published site (plan 2026-10-30-publish-subdomain.md, "Renaming"). One database action, so two people can never end up with the same name
-- and a rename never half-happens. Called only by the server (the Worker, with the service key), never by the browser.
-- It checks that the site belongs to the person and is not blocked, that the new name is a different one and is free (or held by the same person),
-- that the site was not already renamed twice in the last 30 days, then: gives the site the new name, keeps the old name reserved for the owner for
-- p_hold_days days (the old address redirects to the new one meanwhile), and points every older held name of the site at the new name too, so
-- redirects never chain. Errors carry a short code after "rename:" which the server turns into plain words.

create or replace function public.rename_site(p_site uuid, p_user uuid, p_new text, p_hold_days integer default 90)
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
  if recent >= 2 then raise exception 'rename:too-many' using errcode = 'P0001'; end if;

  -- a name held by someone else (and not yet expired) is theirs; the person's own hold, or one that ran out, is simply taken over
  if exists (select 1 from public.site_name_holds h where h.name = p_new and h.user_id <> p_user and h.expires_at > now()) then
    raise exception 'rename:taken' using errcode = 'P0001';
  end if;
  delete from public.site_name_holds where name = p_new;

  begin
    update public.published_sites
       set name = p_new,
           renamed_at = (array_append(s.renamed_at, now()))[greatest(1, cardinality(s.renamed_at) - 2):],  -- keeps the last four dates only
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

revoke all on function public.rename_site(uuid, uuid, text, integer) from public, anon, authenticated;
