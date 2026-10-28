-- One saved set of answers (the "brief" from the questions on /start/) per signed-in person, so the builder can offer it on any device.
-- Nobody but the owner can read or change a row: row level security below, and anonymous visitors have no access at all.
-- The page (site/js/brief-sync.js) talks to this table over Supabase's REST address with the visitor's own token.

create table public.briefs (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  brief      jsonb not null check (jsonb_typeof(brief) = 'object' and octet_length(brief::text) <= 20000),
  updated_at timestamptz not null default now()
);

alter table public.briefs enable row level security;

revoke all on public.briefs from anon;
grant select, insert, update, delete on public.briefs to authenticated;

create policy "briefs: owner reads"   on public.briefs for select to authenticated using ((select auth.uid()) = user_id);
create policy "briefs: owner inserts" on public.briefs for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "briefs: owner updates" on public.briefs for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "briefs: owner deletes" on public.briefs for delete to authenticated using ((select auth.uid()) = user_id);
