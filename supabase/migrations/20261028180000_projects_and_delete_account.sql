-- Saved pages ("My pages" on the account page) and "Delete my account".
-- Nobody but the owner can read or change a project: row level security below, and anonymous visitors have no access at all.
-- The status column (draft or paid) can only be set by the server with the service key, never by the browser, so nobody can mark their own page as paid.

create table public.projects (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 120),
  status     text not null default 'draft' check (status in ('draft', 'paid')),
  state      jsonb not null check (jsonb_typeof(state) = 'object' and octet_length(state::text) <= 1500000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz                      -- a deleted page stays for 30 days so it can be brought back; a later job removes it for good
);

create index projects_user_updated on public.projects (user_id, updated_at desc);

alter table public.projects enable row level security;

revoke all on public.projects from anon;
revoke all on public.projects from authenticated;
grant select on public.projects to authenticated;
grant insert (user_id, name, state) on public.projects to authenticated;
grant update (name, state, deleted_at, updated_at) on public.projects to authenticated;
-- no delete grant: removing for good is done by the server job after 30 days, or by deleting the account

create policy "projects: owner reads"   on public.projects for select to authenticated using ((select auth.uid()) = user_id);
create policy "projects: owner inserts" on public.projects for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "projects: owner updates" on public.projects for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- "Delete my account": removes the signed-in person and, through "on delete cascade", their answers and every saved page.
-- It runs with the rights of its owner so it can reach auth.users, but it only ever touches the caller's own row.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
