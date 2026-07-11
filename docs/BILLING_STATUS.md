# Billing Status

Status snapshot of Depthly's billing/payments implementation. Not a tutorial — reflects the state as of 2026-07-10.

## Overview

Depthly uses **Lemon Squeezy** as the payment processor, not Stripe. Stripe does not support standalone merchant accounts in Morocco, so Lemon Squeezy (merchant-of-record model) was chosen instead.

`supabase/migrations/001_initial_schema.sql` and some older docs still use Stripe naming (`stripe_customer_id`, `stripe_subscription_id`, comments referencing "Stripe webhook"). This is expected and not a bug — the checkout/webhook Edge Functions built 2026-07-10 intentionally reuse these existing columns to store Lemon Squeezy IDs rather than renaming them; the rename is still deferred (see "Next steps" below).

## Current Status

- Lemon Squeezy merchant application submitted: **July 4, 2026**.
- Lemon Squeezy requested additional info (product demo + live app URL): request sent back **July 7, 2026**.
- Store approval: **still pending** as of today.
- **This approval is still the single blocker for real (live-mode) payments.** It is no longer a blocker for testing the flow — checkout and webhook handling are now built and run in Lemon Squeezy **test mode**, which works on a pending/unapproved store.
- Checkout + webhook Edge Functions built 2026-07-10: `create-checkout` and `lemonsqueezy-webhook` (see "What Exists Already in the Codebase"). `UpgradeModal`'s "Choose" buttons now call `create-checkout` and redirect to the real Lemon Squeezy checkout URL instead of showing a "coming soon" stub.
- Lemon Squeezy store/API credentials added to `.env.local` (2026-07-10): `LEMONSQUEEZY_STORE_ID`, `LEMONSQUEEZY_VARIANT_PRO_MONTHLY`, `LEMONSQUEEZY_VARIANT_PRO_YEARLY`, `LEMONSQUEEZY_VARIANT_LIFETIME`, `LEMONSQUEEZY_API_KEY`. No `VITE_` prefix — server-side only (Edge Functions), not client-bundled.
- **Both Edge Functions are deployed to the live `depthly-dev` Supabase project (2026-07-11)** — `create-checkout` (`verify_jwt: true`) and `lemonsqueezy-webhook` (`verify_jwt: false`), confirmed `ACTIVE` via `supabase functions list`.
- **All 6 Lemon Squeezy secrets are now set as Supabase Edge Function secrets** (2026-07-11, via `supabase secrets set`): `LEMONSQUEEZY_STORE_ID`, `LEMONSQUEEZY_VARIANT_PRO_MONTHLY`, `LEMONSQUEEZY_VARIANT_PRO_YEARLY`, `LEMONSQUEEZY_VARIANT_LIFETIME`, `LEMONSQUEEZY_API_KEY`, and — as of today — `LEMONSQUEEZY_WEBHOOK_SECRET`, confirmed via `supabase secrets list`.
- **The full flow is ready for end-to-end testing right now**: `UpgradeModal` → `create-checkout` → real Lemon Squeezy test-mode checkout URL → completed test purchase → Lemon Squeezy redirects back to `/billing?checkout=success` → `lemonsqueezy-webhook` signature verification passes → `profiles`/`subscriptions` sync. Nothing is blocking a manual test purchase today. The only thing still required for this to work is that a webhook endpoint pointing at the deployed `lemonsqueezy-webhook` function URL must be registered in the Lemon Squeezy dashboard using this same signing secret, so Lemon Squeezy actually sends events signed with it.
- `VITE_APP_URL` was added as a Supabase Edge Function secret (2026-07-11) so `create-checkout` can build the post-checkout `redirect_url` — currently set to `http://localhost:5173` (the same value used everywhere else in the app), since there's no deployed production domain yet. This means the Lemon Squeezy redirect only round-trips correctly when testing against a local dev server; it needs updating once a production URL exists (see "Next steps").

## Pricing Plan

| Tier | Price | Interval | Lemon Squeezy Variant ID |
|---|---|---|---|
| Pro | $5 | / month | `LEMONSQUEEZY_VARIANT_PRO_MONTHLY` (1893857) |
| Pro | $39 | / year | `LEMONSQUEEZY_VARIANT_PRO_YEARLY` (1893824) |
| Lifetime (Founding Member) | $79 | one-time | `LEMONSQUEEZY_VARIANT_LIFETIME` (1893860) |

Store ID: `LEMONSQUEEZY_STORE_ID` (423727).

> **Fixed 2026-07-11:** `LEMONSQUEEZY_VARIANT_LIFETIME` was originally set to `1211360`, which is the **product** ID for "Depthly Lifetime", not its variant ID — a different, distinct number in Lemon Squeezy's data model. That made the Lifetime checkout option fail with a Lemon Squeezy `404 The related resource does not exist` on `/data/relationships/variant` (Monthly/Yearly were unaffected since their variant IDs were correct). Verified directly against the Lemon Squeezy API — `GET /v1/variants?filter[product_id]=1211360` returns the real variant, id `1893860`. Corrected in `.env.local` and the deployed Supabase secret.

## What Exists Already in the Codebase

**Database (`supabase/migrations/001_initial_schema.sql`)** — modeled with Stripe naming:
- `plan_type` enum: `'free' | 'pro' | 'founding'`
- `plan_interval_type` enum: `'monthly' | 'annual' | 'lifetime'`
- `subscription_status_type` enum: `'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid'`
- `profiles` billing columns: `plan`, `plan_interval`, `stripe_customer_id`, `stripe_subscription_id`, `subscription_status`, `subscription_current_period_end`, `is_founding_member`
- `subscriptions` table: full subscription lifecycle audit trail (`stripe_subscription_id`, `stripe_customer_id`, `plan`, `plan_interval`, `status`, `current_period_start/end`, `cancel_at_period_end`, `canceled_at`, `amount_cents`, `currency`). RLS policy is read-of-own only; all writes come from the `lemonsqueezy-webhook` Edge Function using the service role key.

**Frontend hooks/components — already exist:**
- `src/hooks/usePlan.ts` — reads `profiles.plan`, exposes `isPro`, `checkLimit(type)`, and `FREE_LIMITS` (maxProjects: 3, maxSessionsPerMonth: 50, analyticsWindowDays: 7, csvExport: false, leaderboard: false).
- `src/hooks/usePlanLimits.ts` — thin wrapper hooks built on top of `usePlan.ts`: `useProjectLimit`, `useSessionMonthLimit`, `useAnalyticsWindow`, `useCanExportCSV`, `useCanAppearOnLeaderboard`. Each calls `usePlan()` internally instead of duplicating the plan fetch (fixed 2026-07-10).
- `src/components/billing/UpgradeModal.tsx` — pricing UI for all three tiers (Monthly $5, Yearly $39 "Best Value", Lifetime $79 "Founding member"). `handleChoose(planType)` now calls the `create-checkout` Edge Function via `supabase.functions.invoke` and redirects (`window.location.href`) to the returned Lemon Squeezy checkout URL. Shows an inline error banner if the call fails, with per-button loading state. The error banner now surfaces the actual message from `create-checkout`'s response body (added 2026-07-11, via a `FunctionsHttpError` → `error.context.json()` helper) instead of a hardcoded "Could not start checkout" string — supabase-js doesn't put the response body on `error.message` by default, so this had to be read explicitly.
- `src/pages/BillingPage.tsx` — shows current plan card (Free vs Pro), reads `subscriptions` table directly for billing date/interval, "Manage subscription" button is disabled with a tooltip ("Available once billing is live"), "Upgrade to Pro" opens `UpgradeModal`. Now detects `?checkout=success` in the URL (added 2026-07-11) and shows a temporary "Payment received — updating your plan…" banner for 6 seconds while the webhook catches up, then strips the query param. Still doesn't show real post-sync confirmation (e.g. polling until `profiles.plan` actually flips) or a live "Manage subscription" link.

**Edge Functions (`supabase/functions/`, added 2026-07-10):**
- `create-checkout/index.ts` — accepts `{ planType: 'pro_monthly' | 'pro_yearly' | 'lifetime' }`, derives the user id from the caller's Supabase auth JWT (never trusts a client-supplied id), calls the Lemon Squeezy Checkouts API with `test_mode: true` and the matching variant ID, passes the user id as `checkout_data.custom.user_id`, and returns `{ url }`. Also sets `product_options.redirect_url` to `${VITE_APP_URL}/billing?checkout=success` (added 2026-07-11) so Lemon Squeezy sends the user back into the app after a successful purchase instead of its own generic receipt page; skipped gracefully (with a warning log) if `VITE_APP_URL` isn't set. When the Lemon Squeezy API call itself fails (non-2xx), the function now parses the JSON:API error body and returns Lemon Squeezy's own `detail` string in the response (added 2026-07-11) instead of a flat "Failed to create checkout" — this is what let `UpgradeModal` surface the real Lifetime-checkout 404 instead of a generic message. Requires a valid Supabase JWT (default `verify_jwt = true`).
- `lemonsqueezy-webhook/index.ts` — verifies the `X-Signature` header (HMAC-SHA256 hex digest of the raw body, `LEMONSQUEEZY_WEBHOOK_SECRET`) before parsing anything. Handles `order_created` (Lifetime purchase → `profiles.plan = 'founding'`, `is_founding_member = true`), `subscription_created`, `subscription_updated`, `subscription_cancelled` (upserts `subscriptions` by `stripe_subscription_id`, updates `profiles.plan` / `plan_interval` / `subscription_status`), and `subscription_payment_failed` (marks both rows `past_due`; note this event's `data.type` is `subscription-invoices`, so the subscription is identified via `data.attributes.subscription_id`, not `data.id`). Uses the service role key. **Must be deployed with JWT verification disabled** (`supabase/config.toml` now sets `[functions.lemonsqueezy-webhook] verify_jwt = false`) since Lemon Squeezy never sends a Supabase auth token.
- `supabase/config.toml` was added (didn't exist before) — currently only sets the webhook's `verify_jwt = false`.

**Known limitations in the webhook implementation:**
- `subscriptions.current_period_start` is set from Lemon Squeezy's `created_at` (original subscription creation time), not a true rolling period start — Lemon Squeezy webhook payloads don't expose the current period's start date the way the schema's Stripe-shaped column name implies.
- `subscriptions.amount_cents` is derived from a hardcoded price map (monthly=$5, yearly=$39) matched by variant ID, since Lemon Squeezy subscription webhooks don't include a price/total field — it is not read from Lemon Squeezy at all.
- Existing `stripe_customer_id` / `stripe_subscription_id` columns are reused as-is to store Lemon Squeezy customer/subscription IDs (no schema rename performed — out of scope for this task, still tracked in "Next steps").

## Free Plan Limit Enforcement (as of 2026-07-10)

All five limits are now gated in the UI, each showing `UpgradeModal` with the matching `trigger` when the limit is hit:
- **Projects** (`ProjectsPage.tsx`) — blocks creating a 4th project via `useProjectLimit`.
- **Sessions** (`TimerPage.tsx`, `TimerWidget.tsx`) — pauses the timer and blocks saving past 50 sessions/month via `useSessionMonthLimit`.
- **Analytics** (`DailyView.tsx`, `WeeklyView.tsx`, `MonthlyView.tsx`, `YearlyView.tsx`) — all four period views now blur data older than 7 days via `useAnalyticsWindow` (Daily view was missing this until 2026-07-10; it's aligned with the other three now).
- **CSV export** (`ExportPanel.tsx`) — blocks the export action with a locked banner (uses `usePlan().isPro` directly rather than `useCanExportCSV`, functionally equivalent).
- **Leaderboard** (`ProfileSection.tsx`) — the "Public profile" toggle (which controls leaderboard appearance) is gated via `useCanAppearOnLeaderboard`; viewing the leaderboard itself remains ungated by design (any signed-in user can view `is_public` profiles).

## What Is Not Built Yet

- `BillingPage.tsx`'s "Manage subscription" is still hardcoded disabled instead of linking to Lemon Squeezy's customer portal URL (available per-subscription in the webhook payload's `urls.customer_portal`, not yet persisted anywhere). The post-checkout success banner is now in place, but there's no polling/confirmation that the plan actually changed by the time the banner disappears.
- Lemon Squeezy customer portal integration (persisting/exposing the portal URL to the client).
- No automated test coverage for the webhook signature verification or event handling — verified manually against documented Lemon Squeezy payload shapes only.
- No handling for `subscription_expired`, `subscription_paused`/`unpaused`, `subscription_resumed`, or `order_refunded` — only the 5 event types explicitly in scope are handled; unhandled events are acknowledged (200) and ignored.

## Next Steps

**To finish testing today (doesn't require Lemon Squeezy approval):**
1. ~~Register a webhook in the Lemon Squeezy dashboard (test mode) pointing at the deployed `lemonsqueezy-webhook` function URL, subscribed to `order_created`, `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_payment_failed`, and set its signing secret as `LEMONSQUEEZY_WEBHOOK_SECRET`.~~ **Done 2026-07-11** — secret is set as a Supabase Edge Function secret; confirm the Lemon Squeezy dashboard's webhook is using this same value.
2. Run an UpgradeModal checkout end-to-end with Lemon Squeezy's test card and confirm `profiles`/`subscriptions` update — this is the one remaining verification step, nothing else is blocking it.

**Once there's a deployed production domain (Phase 12 checklist item, not done yet):**
3. Update the `VITE_APP_URL` Supabase Edge Function secret from `http://localhost:5173` to the real production URL, so `create-checkout`'s `redirect_url` sends users back to the live app instead of localhost.

**Once Lemon Squeezy approves the store (live mode):**
4. Switch `LEMONSQUEEZY_STORE_ID` and the three `LEMONSQUEEZY_VARIANT_*` secrets from test-mode to live-mode values, remove the hardcoded `test_mode: true` in `create-checkout/index.ts`, and register a second (live) webhook + `LEMONSQUEEZY_WEBHOOK_SECRET`.
5. Wire up `BillingPage.tsx`'s "Manage subscription" button to a persisted Lemon Squeezy customer portal URL.
6. Consider a schema rename pass: `stripe_customer_id` → a Lemon Squeezy–named column, `stripe_subscription_id` → same, plus any remaining "Stripe" references in comments/docs. Deferred so far because it requires a migration and touches existing data, not because it's blocked on anything.
