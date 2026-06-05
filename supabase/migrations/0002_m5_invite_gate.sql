-- M5: invite / approval gate. Adds the approval concept on top of the existing
-- magic-link auth so the site is genuinely invite-gated (ADR-0003), which M7
-- (official tag images) depends on.
--
-- Applied to the Supabase project via the MCP `execute_sql` / SQL editor; kept
-- here for version control (same as 0001).
--
-- SECURITY MODEL — self-approval is impossible BY CONSTRUCTION:
--   * `profiles` has ONLY a SELECT-own policy. With RLS enabled and no
--     INSERT/UPDATE/DELETE policy, those writes are default-denied for every
--     non-service-role caller, so a user can read but never set their own
--     `approved`. The row is created by a SECURITY DEFINER trigger, and only the
--     service_role (which bypasses RLS) can flip `approved` — i.e. an admin via
--     the SQL editor.
--   * `invites` has RLS enabled and ZERO policies → anon/authenticated are fully
--     denied; only service_role can read/write it. That is "admin-only".
--
-- HOW AN ADMIN APPROVES A USER (v1 — no admin UI). Run in the Supabase SQL
-- editor (service_role context, bypasses RLS):
--   -- find the user id:
--   select u.id, u.email, p.approved, p.created_at
--     from auth.users u join public.profiles p on p.id = u.id
--     order by p.created_at desc;
--   -- approve:
--   update public.profiles set approved = true where id = '<uuid>';
-- `invites` is an optional allowlist/record of who was invited; approval itself
-- is the manual update above.

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user; `approved` is the invite gate.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per auth user. `approved` is the invite gate (default false). Users may SELECT only their own row; only service_role (admin) may set `approved`.';
comment on column public.profiles.approved is
  'Invite gate. False until an admin approves the user via service_role SQL. Users cannot change this (no UPDATE policy).';

-- Read-own only. No insert/update/delete policy ⇒ default-denied for users, so
-- self-approval is impossible. service_role bypasses RLS for admin approval.
alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated using (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- invites: admin-managed allowlist/record. RLS on + no policies = admin-only.
-- ---------------------------------------------------------------------------
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  email text,
  code text,
  used boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.invites is
  'Admin-managed invite allowlist/record. RLS enabled with NO policies ⇒ only service_role can read/write.';

-- Enabling RLS with zero policies denies anon and authenticated entirely.
alter table public.invites enable row level security;

-- ---------------------------------------------------------------------------
-- Auto-create a profile (approved=false) whenever an auth user is created.
-- SECURITY DEFINER so it can insert into public.profiles regardless of RLS;
-- search_path pinned to '' per the Supabase security linter (matches 0001).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
