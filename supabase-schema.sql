-- Gym Tracker: schema and RLS migration.
-- Run this in Supabase SQL Editor with the authenticated project.

create table if not exists public.routines (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  exercises jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  routine_name text not null,
  exercises jsonb not null default '[]'::jsonb,
  notes text not null default '',
  rpe integer check (rpe between 1 and 10),
  created_at timestamptz not null default now()
);

create table if not exists public.preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  one_rm numeric not null default 120 check (one_rm > 0),
  updated_at timestamptz not null default now()
);

alter table public.sessions add column if not exists notes text not null default '';
alter table public.sessions add column if not exists rpe integer check (rpe between 1 and 10);
alter table public.preferences add column if not exists updated_at timestamptz not null default now();

-- Older installations used id alone as the routine primary key. Scope it by user.
do $$
declare
  primary_key_name text;
begin
  select constraint_name into primary_key_name
  from information_schema.table_constraints
  where table_schema = 'public' and table_name = 'routines' and constraint_type = 'PRIMARY KEY';
  if primary_key_name is not null then
    execute format('alter table public.routines drop constraint %I', primary_key_name);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.routines'::regclass and contype = 'p'
  ) then
    alter table public.routines add primary key (user_id, id);
  end if;
end $$;

create index if not exists routines_user_id_idx on public.routines(user_id);
create index if not exists sessions_user_date_idx on public.sessions(user_id, date);

alter table public.routines enable row level security;
alter table public.sessions enable row level security;
alter table public.preferences enable row level security;

drop policy if exists "Users can manage their routines" on public.routines;
drop policy if exists "Users can manage their sessions" on public.sessions;
drop policy if exists "Users can manage their preferences" on public.preferences;

create policy "Users can manage their routines"
  on public.routines for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their sessions"
  on public.sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their preferences"
  on public.preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
