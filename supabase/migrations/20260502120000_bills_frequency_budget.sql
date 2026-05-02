-- ============================================================================
-- Add payment frequency, direct-debit month, budget flag, and running spend
-- to the bills table.
-- ============================================================================

begin;

alter table marner.bills
  add column if not exists frequency  text           not null default 'monthly',
  add column if not exists dd_month   smallint       check (dd_month is null or (dd_month between 1 and 12)),
  add column if not exists is_budget  boolean        not null default false,
  add column if not exists spent      numeric(10,2)  not null default 0;

commit;
