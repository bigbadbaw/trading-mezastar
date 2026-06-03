-- M4a: per-user collection, RLS-isolated.
-- Applied to the Supabase project via the MCP `execute_sql`; kept here for
-- version control. One row per (user, tag); access is restricted to the owner
-- by Row-Level Security (auth.uid() = user_id).

create table public.collection_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tag_id text not null,
  status text not null check (status in ('owned','wanted','most_wanted')),
  quantity int not null default 1 check (quantity >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, tag_id)
);

comment on table public.collection_items is
  'Per-user Mezastar collection. One row per (user, tag). RLS-isolated to auth.uid() = user_id.';
comment on column public.collection_items.tag_id is
  'Stable app tagId (${pack}-${num}); tags are static app data, intentionally NOT a DB FK.';

create index collection_items_user_id_idx on public.collection_items (user_id);

-- updated_at maintenance. search_path is pinned to '' per the Supabase security
-- linter (0011_function_search_path_mutable); now() resolves from pg_catalog.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger collection_items_set_updated_at
  before update on public.collection_items
  for each row execute function public.set_updated_at();

-- Row-Level Security: enabling RLS with only `authenticated` policies means anon
-- (and any non-owner) is default-denied. UPDATE carries both USING and WITH CHECK
-- so a row can be neither read-for-update nor rewritten to another user_id.
alter table public.collection_items enable row level security;

create policy "ci_select_own" on public.collection_items
  for select to authenticated using (auth.uid() = user_id);
create policy "ci_insert_own" on public.collection_items
  for insert to authenticated with check (auth.uid() = user_id);
create policy "ci_update_own" on public.collection_items
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ci_delete_own" on public.collection_items
  for delete to authenticated using (auth.uid() = user_id);
