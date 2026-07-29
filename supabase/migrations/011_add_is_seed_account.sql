-- ============================================================================
-- 011: is_seed_account flag on profiles
-- ============================================================================
-- Marks synthetic/seeded profiles created to populate the leaderboard at
-- launch (scripts/seed-production-leaderboard.ts) so they can later be:
--   - excluded from any real growth/revenue metrics or admin dashboards
--   - bulk-identified and deleted once organic users make seeding unnecessary
-- Deliberately NOT referenced by any leaderboard/friends/search query — seeded
-- profiles are meant to appear identically to real ones everywhere in the UI.
-- Real users never set this; it is only ever written by the service-role
-- seed script, so no RLS policy or client-facing update path is needed.

alter table public.profiles
  add column is_seed_account boolean not null default false;

comment on column public.profiles.is_seed_account is
  'True for synthetic profiles created by scripts/seed-production-leaderboard.ts to avoid an empty leaderboard at launch. Never set by client code. Used only to filter these rows out of future business-metrics/admin queries and to identify them for bulk deletion later — never used to filter leaderboard, friends, or search queries, since seeded profiles are meant to display identically to real ones.';
