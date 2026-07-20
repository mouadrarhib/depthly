-- ============================================================================
-- MIGRATION 007 — follows: mutual friend-request flow
-- ============================================================================
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
--
-- Converts `follows` from an instant one-directional follow into a mutual
-- friend-request flow, reusing the existing table rather than adding a new
-- one:
--   1. Requester inserts a row with status 'pending'.
--   2. Recipient accepts (status -> 'accepted' + a reciprocal row inserted
--      the other direction, also 'accepted') or declines (row deleted).
--
-- Existing rows predate this flow and were created under the old
-- instant-follow behavior, where a row's mere existence meant "following" —
-- so they default to 'accepted' here. Nothing that already followed someone
-- should stop counting as a friend/follow because of this migration.
-- ============================================================================

alter table public.follows
  add column status text not null default 'accepted';

alter table public.follows
  add constraint follows_status_check
  check (status in ('pending', 'accepted', 'declined'));

comment on column public.follows.status is
  'pending: request sent, awaiting recipient response. accepted: mutual friendship (reciprocal row exists in the other direction). declined: recipient rejected the request. Defaults to accepted so pre-existing rows (created under instant-follow semantics) keep working unchanged.';


-- ---- RLS: recipient visibility ----
-- "follows: read own or public-target" (001_initial_schema.sql) only lets a
-- user see rows where they're the follower, or where the target profile is
-- public. A recipient of a pending request has no way to see it under that
-- policy unless the requester happens to be public. This adds visibility for
-- any row where the current user is the recipient — covers incoming pending
-- requests regardless of the requester's is_public setting.
create policy "follows: read as recipient"
  on public.follows for select
  using ( following_id = auth.uid() );


-- ---- RLS: recipient can respond to a request ----
-- No update policy exists yet. The recipient needs to be able to flip
-- status to 'accepted' on the row addressed to them.
create policy "follows: update status as recipient"
  on public.follows for update
  using ( following_id = auth.uid() )
  with check ( following_id = auth.uid() );


-- ---- RLS: recipient can decline (delete) a request ----
-- "follows: delete own" (001_initial_schema.sql) only covers
-- follower_id = auth.uid() (unfollow / cancel a request you sent). Declining
-- a request you *received* means deleting a row you don't own under that
-- policy, so add the mirror for following_id.
create policy "follows: delete as recipient"
  on public.follows for delete
  using ( following_id = auth.uid() );
