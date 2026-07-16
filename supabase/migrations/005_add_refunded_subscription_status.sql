-- ============================================================================
-- MIGRATION 005 — add 'refunded' to subscription_status_type
-- ============================================================================
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
--
-- Needed so the lemonsqueezy-webhook function can record a subscriptions row
-- as 'refunded' when Lemon Squeezy sends order_refunded (a payment refunded,
-- whether initiated by us in the Lemon Squeezy dashboard or by Lemon Squeezy's
-- own refund process). The enum previously only had 'active' | 'trialing' |
-- 'past_due' | 'canceled' | 'unpaid' | 'expired' — see 004's comment and the
-- original comment in 001_initial_schema.sql for how to extend it.
--
-- NOTE: ADD VALUE cannot be used in the same transaction as a statement that
-- reads the new value, so this migration only adds it — nothing in this file
-- queries 'refunded'.
-- ============================================================================

ALTER TYPE subscription_status_type ADD VALUE IF NOT EXISTS 'refunded';
