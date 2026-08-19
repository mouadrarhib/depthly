-- ============================================================================
-- MIGRATION 013 — actually revoke EXECUTE from anon
-- ============================================================================
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
--
-- 012_security_hardening.sql did `revoke execute ... from public` on
-- save_session / is_connected_via_follows / are_friends_via_follows, on the
-- assumption that a fresh function's only EXECUTE grant is the implicit one
-- to PUBLIC. Verified live after applying 012 that this assumption was
-- wrong: Supabase's project bootstrapping grants EXECUTE on every function
-- in the public schema directly to `anon` and `authenticated` (independent
-- of PUBLIC, most likely via `alter default privileges ... grant execute on
-- functions to anon, authenticated` set up when the project was created) —
-- so revoking from PUBLIC left anon's own direct grant untouched.
--
-- Confirmed live: after 012, an anon-key call to is_connected_via_follows /
-- are_friends_via_follows still succeeded (200, returned a boolean) instead
-- of being rejected.
--
-- save_session itself is NOT actually at risk here — its ownership check
-- (p_user_id must equal auth.uid(), added in 012) rejects every anon call
-- regardless of whether anon can invoke the function, since an anon request
-- has no auth.uid(). This migration is about the two helper functions, which
-- have no such check and are pure lookups: an anon caller could otherwise
-- probe arbitrary (viewer_id, target_id) pairs to learn who's connected to
-- or friends with whom, unauthenticated. Low severity (boolean-only, no row
-- data), but there's no reason to leave it open.
--
-- Fix: revoke EXECUTE from anon explicitly, in addition to (not instead of)
-- the existing `revoke ... from public`. Re-run on save_session too, purely
-- as defense in depth — its own check already covers it.
-- ============================================================================

revoke execute on function public.save_session(
  uuid, uuid, uuid, session_type, integer, timestamptz, timestamptz, text, text, date
) from anon;

revoke execute on function public.is_connected_via_follows(uuid, uuid) from anon;

revoke execute on function public.are_friends_via_follows(uuid, uuid) from anon;

-- ============================================================================
-- END OF MIGRATION 013
-- ============================================================================
