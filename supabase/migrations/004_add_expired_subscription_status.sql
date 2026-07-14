-- ============================================================================
-- MIGRATION 004 — add 'expired' to subscription_status_type
-- ============================================================================
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
--
-- Needed so the lemonsqueezy-webhook function can record a subscription's
-- status as 'expired' once its post-cancellation grace period actually ends
-- (the subscription_expired Lemon Squeezy event). The enum previously only
-- had 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' — see the
-- original comment in 001_initial_schema.sql for how to extend it.
--
-- NOTE: ADD VALUE cannot be used in the same transaction as a statement that
-- reads the new value, so this migration only adds it — nothing in this file
-- queries 'expired'.
-- ============================================================================

ALTER TYPE subscription_status_type ADD VALUE IF NOT EXISTS 'expired';
