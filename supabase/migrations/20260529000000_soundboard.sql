-- ============================================================================
-- Marner Finances — soundboard sandbox persistence
-- ----------------------------------------------------------------------------
-- Singleton JSONB row stores the user's what-if sandbox bill list so it
-- survives page refreshes and tab switches without touching the real bills.
-- ============================================================================

begin;

create table if not exists marner.soundboard (
  id         smallint    primary key default 1,
  bills      jsonb       not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint marner_soundboard_singleton check (id = 1)
);

insert into marner.soundboard (id) values (1)
  on conflict (id) do nothing;

drop trigger if exists soundboard_set_updated_at on marner.soundboard;
create trigger soundboard_set_updated_at
  before update on marner.soundboard
  for each row execute function marner.set_updated_at();

grant select, insert, update on marner.soundboard to anon, authenticated;

commit;
