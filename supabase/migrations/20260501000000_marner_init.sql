-- ============================================================================
-- Marner Finances — schema (single-user mode)
-- ----------------------------------------------------------------------------
-- Safe to re-run. All objects live in the `marner` schema so they cannot
-- collide with other apps in the same Supabase project.
--
-- Single-user mode: no auth, no RLS, no per-user scoping. The whole DB is
-- protected by the Supabase anon key, which lives in Vercel env vars and
-- is never exposed to the public.
--
-- After running:
--   1. Supabase → Settings → API → Exposed schemas → add `marner`
-- ============================================================================

begin;

create schema if not exists marner;

grant usage on schema marner to anon, authenticated;

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

-- One-row config table. Fixed primary key so we always upsert the same row.
create table if not exists marner.config (
  id          smallint primary key default 1,
  balance     numeric(12,2) not null default 0,
  pay_config  jsonb         not null default '{}'::jsonb,
  updated_at  timestamptz   not null default now(),
  constraint  marner_config_singleton check (id = 1)
);

-- Seed the singleton row if missing.
insert into marner.config (id) values (1)
  on conflict (id) do nothing;

create table if not exists marner.bills (
  id           uuid primary key default gen_random_uuid(),
  description  text not null,
  amount       numeric(10,2) not null check (amount >= 0),
  category     text not null default 'Uncategorised',
  paid         boolean not null default false,
  due_day      smallint check (due_day is null or (due_day between 1 and 31)),
  position     integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists bills_position_idx on marner.bills (position);

-- ----------------------------------------------------------------------------
-- Triggers — keep updated_at fresh
-- ----------------------------------------------------------------------------
create or replace function marner.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

drop trigger if exists config_set_updated_at on marner.config;
create trigger config_set_updated_at
  before update on marner.config
  for each row execute function marner.set_updated_at();

drop trigger if exists bills_set_updated_at on marner.bills;
create trigger bills_set_updated_at
  before update on marner.bills
  for each row execute function marner.set_updated_at();

-- ----------------------------------------------------------------------------
-- Permissions for the JS client (using the anon key)
-- ----------------------------------------------------------------------------
-- RLS deliberately NOT enabled — single-user app, no per-row scoping needed.
-- The anon key is the gate, kept in Vercel env vars.

grant select, insert, update          on marner.config to anon, authenticated;
grant select, insert, update, delete  on marner.bills  to anon, authenticated;

commit;

-- ============================================================================
-- Rollback (run manually only if you want to wipe Marner Finances entirely)
-- ----------------------------------------------------------------------------
-- begin;
--   drop schema if exists marner cascade;
-- commit;
-- ============================================================================
