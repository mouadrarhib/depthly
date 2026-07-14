# Billing Status

Status snapshot of Depthly's billing/payments implementation. Not a tutorial — reflects the state as of 2026-07-14.

## Overview

Depthly uses **Lemon Squeezy** as the payment processor, not Stripe. Stripe does not support standalone merchant accounts in Morocco, so Lemon Squeezy (merchant-of-record model) was chosen instead.

`supabase/migrations/001_initial_schema.sql` and some older docs still use Stripe naming (`stripe_customer_id`, `stripe_subscription_id`, comments referencing "Stripe webhook"). This is expected and not a bug — the checkout/webhook Edge Functions built 2026-07-10 intentionally reuse these existing columns to store Lemon Squeezy IDs rather than renaming them; the rename is still deferred (see "Next steps" below).

## Current Status

- Lemon Squeezy merchant application submitted: **July 4, 2026**.
- Lemon Squeezy requested additional info (product demo + live app URL): request sent back **July 7, 2026**.
- **Store approved and activated: July 14, 2026.** This was the last blocker for real (live-mode) payments — it is now gone. Live mode is available whenever we choose to switch to it (see "Next Steps" for the switch-over checklist).
- **We are intentionally still running in Lemon Squeezy test mode** (`test_mode: true` hardcoded in `create-checkout/index.ts`) while the checkout/webhook flow finishes being tested end-to-end. Store approval does not force a switch to live mode — that's a deliberate step we take once testing is done.
- Checkout + webhook Edge Functions built 2026-07-10: `create-checkout` and `lemonsqueezy-webhook` (see "What Exists Already in the Codebase"). `UpgradeModal`'s "Choose" buttons now call `create-checkout` and redirect to the real Lemon Squeezy checkout URL instead of showing a "coming soon" stub.
- Lemon Squeezy store/API credentials added to `.env.local` (2026-07-10): `LEMONSQUEEZY_STORE_ID`, `LEMONSQUEEZY_VARIANT_PRO_MONTHLY`, `LEMONSQUEEZY_VARIANT_PRO_YEARLY`, `LEMONSQUEEZY_VARIANT_LIFETIME`, `LEMONSQUEEZY_API_KEY`. No `VITE_` prefix — server-side only (Edge Functions), not client-bundled.
- **Both Edge Functions are deployed to the live `depthly-dev` Supabase project (2026-07-11)** — `create-checkout` (`verify_jwt: true`) and `lemonsqueezy-webhook` (`verify_jwt: false`), confirmed `ACTIVE` via `supabase functions list`.
- **All 6 Lemon Squeezy secrets are now set as Supabase Edge Function secrets** (2026-07-11, via `supabase secrets set`): `LEMONSQUEEZY_STORE_ID`, `LEMONSQUEEZY_VARIANT_PRO_MONTHLY`, `LEMONSQUEEZY_VARIANT_PRO_YEARLY`, `LEMONSQUEEZY_VARIANT_LIFETIME`, `LEMONSQUEEZY_API_KEY`, and — as of today — `LEMONSQUEEZY_WEBHOOK_SECRET`, confirmed via `supabase secrets list`.
- **The full flow has been tested end-to-end and works**: `UpgradeModal` → `create-checkout` → real Lemon Squeezy test-mode checkout URL → completed test purchase → Lemon Squeezy redirects back to `/billing?checkout=success` → `lemonsqueezy-webhook` signature verification passes → `profiles`/`subscriptions` sync. The test-mode webhook is registered in the Lemon Squeezy dashboard using the `LEMONSQUEEZY_WEBHOOK_SECRET` Supabase secret (done 2026-07-11), and all three plans — Monthly, Yearly, and Lifetime (after the fix above) — have been verified working.
- `VITE_APP_URL` was added as a Supabase Edge Function secret (2026-07-11) so `create-checkout` can build the post-checkout `redirect_url` — currently set to `http://localhost:5173` (the same value used everywhere else in the app), since there's no deployed production domain yet. This means the Lemon Squeezy redirect only round-trips correctly when testing against a local dev server; it needs updating once a production URL exists (see "Next steps").
- **Lifetime checkout bug — fixed and confirmed working.** Clicking the Lifetime option in `UpgradeModal` went nowhere / surfaced "Could not start checkout", and separately, completed Lifetime purchases were showing up attributed as the Annual plan instead of Lifetime. Root cause: `LEMONSQUEEZY_VARIANT_LIFETIME` was set to `1211360`, which is the **product** ID for "Depthly Lifetime" in Lemon Squeezy, not its **variant** ID — a different, distinct number in Lemon Squeezy's data model (see the pricing table note below for the API detail). Both symptoms traced back to this one misconfigured value: `create-checkout` sent the wrong id to the Lemon Squeezy Checkouts API (404, no checkout URL), and the mismatch also meant a completed order wasn't reliably recognized as the Lifetime product downstream. Fixed by correcting the value in `.env.local` and the deployed Supabase secret to the real variant id (`1893860`); re-tested and confirmed working end-to-end.
- **`subscription_expired` handling added to `lemonsqueezy-webhook`.** The previously-documented gap — no handling for the event that fires when a cancelled subscription's grace period actually ends — is closed in code (see "What Exists Already in the Codebase"). Two things still need to happen before this actually works end-to-end, neither done yet: the new `expired` enum value's migration needs to be applied to the database, and the event needs to be manually enabled on the Lemon Squeezy dashboard webhook (see "Next Steps" — this did **not** ship automatically with the code change).
- **Bug found and fixed 2026-07-14: `subscription_created` and `subscription_updated` were returning HTTP 500.** Confirmed in the Lemon Squeezy dashboard's webhook delivery log, and traced directly against live DB data: a new test subscription's row landed correctly in `subscriptions` (the audit-trail upsert has no relevant constraint), but the matching `profiles` row never updated. Root cause was a Postgres unique-constraint violation (`23505`) on `profiles.stripe_customer_id` / `profiles.stripe_subscription_id` — both columns are `UNIQUE`, and Lemon Squeezy test mode can reuse the same underlying `customer_id` across checkouts started from different app accounts (same test buyer details), so one Lemon Squeezy customer ended up linked to two different Depthly profiles. The webhook's profile update tried to write that already-claimed `customer_id` onto a second profile, threw, and the whole request 500'd — even though the event itself was legitimate. Fixed in `upsertSubscription()`'s profile update: on a `23505` violation, it now retries the same update without `stripe_customer_id`/`stripe_subscription_id`. Those two columns are a denormalized display cache only — nothing in the frontend reads them (confirmed via a repo-wide search); `plan`, `plan_interval`, `subscription_status`, and `subscription_current_period_end` are what actually gate access (`profiles.plan` is the fast-read billing state per `CLAUDE.md`), and those still get written every time. Deployed 2026-07-14 (`lemonsqueezy-webhook` version 9).

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
- `subscription_status_type` enum: `'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid'`, plus `'expired'` added by `supabase/migrations/004_add_expired_subscription_status.sql` (**not yet applied to any live Supabase project — see "Next Steps"**).
- `profiles` billing columns: `plan`, `plan_interval`, `stripe_customer_id`, `stripe_subscription_id`, `subscription_status`, `subscription_current_period_end`, `is_founding_member`
- `subscriptions` table: full subscription lifecycle audit trail (`stripe_subscription_id`, `stripe_customer_id`, `plan`, `plan_interval`, `status`, `current_period_start/end`, `cancel_at_period_end`, `canceled_at`, `amount_cents`, `currency`). RLS policy is read-of-own only; all writes come from the `lemonsqueezy-webhook` Edge Function using the service role key.

**Frontend hooks/components — already exist:**
- `src/hooks/usePlan.ts` — reads `profiles.plan`, exposes `isPro`, `checkLimit(type)`, and `FREE_LIMITS` (maxProjects: 3, maxSessionsPerMonth: 50, analyticsWindowDays: 7, csvExport: false, leaderboard: false).
- `src/hooks/usePlanLimits.ts` — thin wrapper hooks built on top of `usePlan.ts`: `useProjectLimit`, `useSessionMonthLimit`, `useAnalyticsWindow`, `useCanExportCSV`, `useCanAppearOnLeaderboard`. Each calls `usePlan()` internally instead of duplicating the plan fetch (fixed 2026-07-10).
- `src/components/billing/UpgradeModal.tsx` — pricing UI for all three tiers (Monthly $5, Yearly $39 "Best Value", Lifetime $79 "Founding member"). `handleChoose(planType)` now calls the `create-checkout` Edge Function via `supabase.functions.invoke` and redirects (`window.location.href`) to the returned Lemon Squeezy checkout URL. Shows an inline error banner if the call fails, with per-button loading state. The error banner now surfaces the actual message from `create-checkout`'s response body (added 2026-07-11, via a `FunctionsHttpError` → `error.context.json()` helper) instead of a hardcoded "Could not start checkout" string — supabase-js doesn't put the response body on `error.message` by default, so this had to be read explicitly.
- `src/pages/BillingPage.tsx` — shows current plan card (Free vs Pro), reads `subscriptions` table directly for billing date/interval, "Manage subscription" button is disabled with a tooltip ("Available once billing is live"), "Upgrade to Pro" opens `UpgradeModal`. Now detects `?checkout=success` in the URL (added 2026-07-11) and shows a temporary "Payment received — updating your plan…" banner for 6 seconds while the webhook catches up, then strips the query param. Still doesn't show real post-sync confirmation (e.g. polling until `profiles.plan` actually flips) or a live "Manage subscription" link.

**Edge Functions (`supabase/functions/`, added 2026-07-10):**
- `create-checkout/index.ts` — accepts `{ planType: 'pro_monthly' | 'pro_yearly' | 'lifetime' }`, derives the user id from the caller's Supabase auth JWT (never trusts a client-supplied id), calls the Lemon Squeezy Checkouts API with `test_mode: true` and the matching variant ID, passes the user id as `checkout_data.custom.user_id`, and returns `{ url }`. Also sets `product_options.redirect_url` to `${VITE_APP_URL}/billing?checkout=success` (added 2026-07-11) so Lemon Squeezy sends the user back into the app after a successful purchase instead of its own generic receipt page; skipped gracefully (with a warning log) if `VITE_APP_URL` isn't set. When the Lemon Squeezy API call itself fails (non-2xx), the function now parses the JSON:API error body and returns Lemon Squeezy's own `detail` string in the response (added 2026-07-11) instead of a flat "Failed to create checkout" — this is what let `UpgradeModal` surface the real Lifetime-checkout 404 instead of a generic message. Requires a valid Supabase JWT (default `verify_jwt = true`).
- `lemonsqueezy-webhook/index.ts` — verifies the `X-Signature` header (HMAC-SHA256 hex digest of the raw body, `LEMONSQUEEZY_WEBHOOK_SECRET`) before parsing anything. Handles `order_created` (Lifetime purchase → `profiles.plan = 'founding'`, `is_founding_member = true`), `subscription_created`, `subscription_updated`, `subscription_cancelled` (upserts `subscriptions` by `stripe_subscription_id`, updates `profiles.plan` / `plan_interval` / `subscription_status`), `subscription_payment_failed` (marks both rows `past_due`; note this event's `data.type` is `subscription-invoices`, so the subscription is identified via `data.attributes.subscription_id`, not `data.id`), and — **added 2026-07-14** — `subscription_expired` (fires once a cancelled subscription's grace period actually ends; sets the matching `subscriptions` row's `status` to `'expired'` via the same `payload.data.id` matching as the other `subscription_*` events, then resets `profiles.plan` to `'free'` and `plan_interval` to `null`, skipping Founding/Lifetime members via the same `isFoundingMember` guard used elsewhere). Uses the service role key. **Must be deployed with JWT verification disabled** (`supabase/config.toml` now sets `[functions.lemonsqueezy-webhook] verify_jwt = false`) since Lemon Squeezy never sends a Supabase auth token.
- `supabase/config.toml` was added (didn't exist before) — currently only sets the webhook's `verify_jwt = false`.

**Known limitations in the webhook implementation:**
- `subscriptions.current_period_start` is set from Lemon Squeezy's `created_at` (original subscription creation time), not a true rolling period start — Lemon Squeezy webhook payloads don't expose the current period's start date the way the schema's Stripe-shaped column name implies.
- `subscriptions.amount_cents` is derived from a hardcoded price map (monthly=$5, yearly=$39) matched by variant ID, since Lemon Squeezy subscription webhooks don't include a price/total field — it is not read from Lemon Squeezy at all.
- Existing `stripe_customer_id` / `stripe_subscription_id` columns are reused as-is to store Lemon Squeezy customer/subscription IDs (no schema rename performed — out of scope for this task, still tracked in "Next steps").
- **As of 2026-07-14:** on the `profiles` row specifically (not `subscriptions`), `stripe_customer_id`/`stripe_subscription_id` may silently be left at their previous value instead of the latest Lemon Squeezy IDs, if writing the new values would collide with another profile's existing unique value (see the 2026-07-14 bug fix above). This only affects those two display-only columns — `plan`/`plan_interval`/`subscription_status`/`subscription_current_period_end` are unaffected and always reflect the latest event.

## Free Plan Limit Enforcement (as of 2026-07-10)

All five limits are now gated in the UI, each showing `UpgradeModal` with the matching `trigger` when the limit is hit:
- **Projects** (`ProjectsPage.tsx`) — blocks creating a 4th project via `useProjectLimit`.
- **Sessions** (`TimerPage.tsx`, `TimerWidget.tsx`) — pauses the timer and blocks saving past 50 sessions/month via `useSessionMonthLimit`.
- **Analytics** (`DailyView.tsx`, `WeeklyView.tsx`, `MonthlyView.tsx`, `YearlyView.tsx`) — all four period views now blur data older than 7 days via `useAnalyticsWindow` (Daily view was missing this until 2026-07-10; it's aligned with the other three now).
- **CSV export** (`ExportPanel.tsx`) — blocks the export action with a locked banner (uses `usePlan().isPro` directly rather than `useCanExportCSV`, functionally equivalent).
- **Leaderboard** (`ProfileSection.tsx`) — the "Public profile" toggle (which controls leaderboard appearance) is gated via `useCanAppearOnLeaderboard`; viewing the leaderboard itself remains ungated by design (any signed-in user can view `is_public` profiles).

## What Is Not Built Yet

**Biggest known gap — next thing to build:** `BillingPage.tsx` currently only renders a single "current plan" card (Free / Pro / Founding) plus the static features list. Two things a paying user would expect are both completely missing:
- **No billing/subscription history view.** There's no UI anywhere that shows past invoices, payment history, or subscription change events — `subscriptions` (the audit-trail table the webhook already upserts into) is not read or displayed anywhere in the app.
- **No way to cancel a subscription from inside the app, at all.** `BillingPage.tsx`'s "Manage subscription" button is hardcoded `disabled` with a tooltip ("Available once billing is live") — it doesn't link anywhere. There is no in-app cancel flow, and no Lemon Squeezy customer portal link wired up either (the portal URL is available per-subscription in the webhook payload's `urls.customer_portal`, but nothing persists or exposes it). A user who wants to cancel today would have to be told to do it manually via Lemon Squeezy directly (e.g. their order receipt email), which isn't documented anywhere in-app.

Everything else not yet built:
- The post-checkout success banner is in place, but there's no polling/confirmation that the plan actually changed by the time the banner disappears.
- No automated test coverage for the webhook signature verification or event handling — verified manually against documented Lemon Squeezy payload shapes only.
- No handling for `subscription_paused`/`unpaused`, `subscription_resumed`, or `order_refunded` — only the 6 event types explicitly in scope (the original 5, plus `subscription_expired` as of 2026-07-14) are handled; unhandled events are acknowledged (200) and ignored.

## Next Steps

**Done — testing setup:**
1. ~~Register a webhook in the Lemon Squeezy dashboard (test mode) pointing at the deployed `lemonsqueezy-webhook` function URL, subscribed to `order_created`, `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_payment_failed`, and set its signing secret as `LEMONSQUEEZY_WEBHOOK_SECRET`.~~ **Done 2026-07-11.**
2. ~~Run checkout end-to-end (all three plans, including Lifetime) with Lemon Squeezy's test card and confirm `profiles`/`subscriptions` update.~~ **Done — Lifetime bug fixed and confirmed working (2026-07-14, see "Current Status").**

**To finish wiring up `subscription_expired` (code is done, but two manual steps outside the codebase remain — nothing else is blocked on these, do them whenever):**
3. Apply `supabase/migrations/004_add_expired_subscription_status.sql` (`ALTER TYPE subscription_status_type ADD VALUE 'expired'`) to the Supabase project — via the Dashboard SQL Editor or `supabase db push`. Until this runs, `lemonsqueezy-webhook` will throw a Postgres invalid-enum-value error the first time it tries to write `status = 'expired'`, and that event's processing will fail (Lemon Squeezy will see a 500 and retry).
4. **The Lemon Squeezy dashboard webhook only sends the event types selected when it was registered/last edited — `subscription_expired` was not one of the original 5 selected on 2026-07-11, so it will not arrive until someone manually opens the existing test-mode webhook in the Lemon Squeezy dashboard and checks the `subscription_expired` event type.** This is a dashboard setting, not something the Edge Function code controls — deploying the updated `lemonsqueezy-webhook` code alone does not make Lemon Squeezy start sending this event.

**Still to do before flipping to live mode (test mode remains in use until these are done):**
5. Update the `VITE_APP_URL` Supabase Edge Function secret from `http://localhost:5173` to the real production URL, once a production domain is deployed (Phase 12 checklist item, not done yet), so `create-checkout`'s `redirect_url` sends users back to the live app instead of localhost.

**Store approval is done — the switch to live mode itself is just this checklist, whenever we're ready:**
6. Create live-mode products/variants in the Lemon Squeezy dashboard (the store is now approved and active) and get their live variant IDs — these are different IDs from the current test-mode ones.
7. Switch `LEMONSQUEEZY_STORE_ID` and the three `LEMONSQUEEZY_VARIANT_*` Supabase secrets from test-mode to live-mode values.
8. Remove the hardcoded `test_mode: true` in `create-checkout/index.ts` (or make it conditional on environment).
9. Register a second, live-mode webhook in the Lemon Squeezy dashboard pointing at the same deployed `lemonsqueezy-webhook` function URL, subscribed to all 6 event types — the original 5 **plus `subscription_expired`** this time — and update `LEMONSQUEEZY_WEBHOOK_SECRET` to the live webhook's signing secret.
10. Run one real (small-dollar or comped) live purchase end-to-end to confirm the whole path before announcing billing is live.

**Not blocking, can happen anytime:**
11. Consider a schema rename pass: `stripe_customer_id` → a Lemon Squeezy–named column, `stripe_subscription_id` → same, plus any remaining "Stripe" references in comments/docs. Deferred so far because it requires a migration and touches existing data, not because it's blocked on anything.
