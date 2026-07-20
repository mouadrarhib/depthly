-- ============================================================================
-- MIGRATION 009 — user_stats: visible to accepted friends
-- ============================================================================
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
--
-- Bug: after 008 fixed profiles visibility for follows connections, a private
-- friend still didn't show up on the Friends leaderboard. Root cause: a
-- *separate* policy, "user_stats: read own or public" (001_initial_schema.sql),
-- gates the actual focus-time rows independently of profiles:
--
--   user_id = auth.uid() OR exists (select 1 from profiles p
--     where p.id = user_stats.user_id and p.is_public = true)
--
-- fetchFriendsLeaderboard's user_stats query was silently returning zero rows
-- for a private friend even though their profiles row was readable — the
-- data itself was still gated on is_public, with no exception for an
-- accepted friend.
--
-- Fix: same SECURITY DEFINER pattern as 008 (to avoid the profiles<->follows
-- recursion — see that file's comment for the full explanation), but scoped
-- to status = 'accepted' only. Unlike profiles' pending-request name/avatar
-- exception, there's no reason a *pending* (not yet accepted) connection
-- should unlock someone's actual tracked focus-time data — only a confirmed
-- mutual friendship should.
--
-- Verified directly against the linked project after applying:
--   1. A public friend can now read a private friend's user_stats row for a
--      period the private friend actually has data for (previously 0 rows).
--   2. Own-row reads still succeed (no recursion).
--   3. An unconnected user still cannot read a private user's user_stats.
--
-- Known related gap, NOT fixed here (pre-existing, documented in
-- docs/LEADERBOARD.md "Known Limitations" #6): daily_summaries has only
-- `user_id = auth.uid()` — no public or friends exception at all — so a
-- friend's heatmap on PublicProfilePage will still render empty for a
-- private friend. Same SECURITY DEFINER pattern would apply if that's
-- wanted; left out here since it wasn't part of what broke.
-- ============================================================================

create or replace function public.are_friends_via_follows(viewer_id uuid, target_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.follows f
    where f.status = 'accepted'
      and (
        (f.follower_id = viewer_id and f.following_id = target_id)
        or (f.follower_id = target_id and f.following_id = viewer_id)
      )
  );
$$;

grant execute on function public.are_friends_via_follows(uuid, uuid) to authenticated;

create policy "user_stats: read if friends via follows"
  on public.user_stats for select
  using ( public.are_friends_via_follows(auth.uid(), user_id) );
