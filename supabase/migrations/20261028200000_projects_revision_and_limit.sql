-- Saving the builder's page into the account (plan E7.1).
-- revision: a counter the builder sends with every save ("change revision 4 into 5"). If another device saved in between, the revision no
-- longer matches, the save changes nothing, and the builder asks the person which version to keep instead of overwriting.
-- The limit keeps an account from filling the database with pages: at most 25 pages that are not deleted.

alter table public.projects add column revision integer not null default 1 check (revision >= 1);
grant update (revision) on public.projects to authenticated;

create or replace function public.projects_limit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select count(*) from public.projects where user_id = new.user_id and deleted_at is null) >= 25 then
    raise exception 'too many saved pages' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger projects_limit before insert on public.projects for each row execute function public.projects_limit();
