-- ============================================================================
-- MIGRATION 008 — profiles: visible to follows connections (non-recursive)
-- ============================================================================
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
--
-- Bug: fetchPendingFriendRequests (src/lib/supabase/queries/leaderboard.ts)
-- needs to show the requester's name/avatar to the recipient of a pending
-- request. "profiles: read own or public" (001_initial_schema.sql) only
-- allows reading a row where id = auth.uid() or is_public = true — a
-- requester with a private profile satisfies neither.
--
-- First attempt at this migration added a SELECT policy on profiles with a
-- raw correlated subquery against follows:
--
--   create policy "profiles: read if connected via follows"
--     on public.profiles for select
--     using (
--       exists (select 1 from public.follows f where ...)
--     );
--
-- That was applied to production and caused a full outage of every
-- authenticated profiles read (Postgres error 42P17: infinite recursion
-- detected in policy for relation "profiles") — including trivial own-row
-- lookups like usePlan()'s `select plan from profiles where id = auth.uid()`.
-- Root cause: "follows: read own or public-target" (001/007) itself queries
-- profiles (`exists (select 1 from profiles p where p.id = follows.following_id
-- and p.is_public = true)`). Postgres has to fully plan both RLS-protected
-- subqueries before executing anything, so profiles -> follows -> profiles
-- -> follows forms a cycle the planner detects and rejects outright — this
-- happens at plan time, not row-evaluation time, so it fails unconditionally
-- for every row, not just rows that would actually need the recursive branch.
-- The bad policy was dropped directly in production once this was diagnosed;
-- this file now contains the fix that replaces it.
--
-- Fix: route the follows lookup through a SECURITY DEFINER function instead
-- of a raw subquery. A SECURITY DEFINER function executes with the
-- privileges of its owner (the migration role, which bypasses RLS), so its
-- internal `select … from follows` never triggers follows' own RLS
-- policies — breaking the cycle entirely while keeping the same visibility
-- rule (connected via any-status follows row, either direction; 'pending'
-- must count too, since the whole point is letting the recipient see who
-- sent them a request before they've accepted it).
--
-- Verified directly against the linked project after applying:
--   1. Own-row reads (previously 42P17) succeed again.
--   2. A recipient can read a connected private requester's profile.
--   3. An unconnected user still cannot read that same private profile.
-- ============================================================================

create or replace function public.is_connected_via_follows(viewer_id uuid, target_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.follows f
    where (f.follower_id = viewer_id and f.following_id = target_id)
       or (f.follower_id = target_id and f.following_id = viewer_id)
  );
$$;

grant execute on function public.is_connected_via_follows(uuid, uuid) to authenticated;

create policy "profiles: read if connected via follows"
  on public.profiles for select
  using ( public.is_connected_via_follows(auth.uid(), profiles.id) );
