# Depthly — Claude Code Project Context

## What this is
Depthly is a focus session tracker and time-tracking SaaS. Target users: students,
freelancers, remote developers building deep work habits. Solo founder, 8-week sprint.

---

## Stack (never deviate from this)
- **Frontend:** React 18 + Vite + TypeScript (strict mode)
- **Styling:** Tailwind CSS with custom config — use only tokens defined in tailwind.config.js
- **State:** Zustand for client state (authStore, timerStore, uiStore)
- **Server state:** TanStack Query (useQuery, useMutation) — never fetch in useEffect
- **Backend:** Supabase only — no separate server, no Express, no tRPC
- **DB writes that touch multiple tables:** always go through Supabase RPC functions, never direct client writes
- **Auth:** Supabase Auth (email + password + Google OAuth)
- **Payments:** Lemon Squeezy (merchant-of-record) via Supabase Edge Functions
- **Deploy:** Vercel

---

## Folder structure
```
src/
  components/       # Reusable UI: Button, Input, Card, Badge, Spinner, Logo, StreakBadge
  pages/            # Route-level components: Dashboard, Timer, Projects, Tasks, Analytics...
  hooks/            # useAuth, useTimer, usePlan, useProjects, useSessions...
  store/            # authStore.ts, timerStore.ts, uiStore.ts (Zustand)
  lib/
    supabase/       # client.ts (typed Supabase client)
  types/            # database.ts (generated from Supabase), app.ts (custom types)
  routes/           # ProtectedRoute.tsx, router.tsx
```

---

## Path aliases
Always use `@/` for imports from `src/`. Never use relative `../../` paths.
- `@/components/Button` not `../../components/Button`

---

## Supabase client
Import from `@/lib/supabase/client`. The client is typed — always use the typed version.
The env variable is `VITE_SUPABASE_ANON_KEY` — do not rename it.

---

## Database — key rules
- Every session-save must go through the `save_session()` RPC function (SECURITY DEFINER)
- Never write directly to `daily_summaries` or `user_stats` from client code
- `profiles.plan` is the fast-read billing state — always check this, not the subscriptions table
- Tasks have TWO ordering columns: `list_order` (float) for list view, `kanban_order` (float) for kanban — they are independent, never use one for both views
- `goals` stores minutes as integers, not hours
- `period_key` format: daily `2025-01-15`, weekly `2025-W03`, monthly `2025-01`, yearly `2025`

---

## Design system — non-negotiable
**Dark mode first.** Light mode is secondary.

### CSS variable names (from tailwind.config.js)
```
depth-bg        #0D0D10   App background
depth-surface   #141417   Cards, panels, modals
depth-raised    #222228   Hover states, nested panels
depth-border    #2E2E38   Dividers, input borders
brand           #4B9EFF   CTAs, active states, links (dark mode)
brand-strong    #2563EB   Hover, light mode
streak          #C8FF64   ONLY for streak display — never decorative
ink-primary     #E8E6F0   Headlines, body
ink-secondary   #7A7890   Captions, timestamps
ink-muted       #3D3B4E   Placeholders, disabled
```

### Typography rules
- UI text: Inter, weight 500, tracking negative
- **All data/numbers/times:** use the `font-data` class (JetBrains Mono) — timer displays, durations, session counts, stats
- Never use the streak color (#C8FF64) outside of `StreakBadge.tsx`

### Component conventions
- `<Button>` has variants: `primary`, `ghost`, `danger` — use these, don't write custom button styles
- `<Card>` wraps all panel content
- `<Badge>` for status pills (priority, plan tier, session type)
- Loading states: always use `<Spinner>` — never show raw "Loading..."
- Empty states: always explain what the page does AND give an action button

---

## State management rules
- **Auth state:** read from `authStore` (user, session, isLoading) — never call `supabase.auth.getUser()` in components
- **Timer state:** all in `timerStore` — components only dispatch actions, never hold timer logic
- **Server data:** TanStack Query with typed query keys in `src/lib/queryKeys.ts`
- **Optimistic updates:** always implement for mutations that affect visible UI (task reorder, project edit)

---

## Free plan limits (enforced at API layer, not DB)
- Max 3 projects
- Max 50 sessions/month
- Analytics: 7-day window (older data fetched but blurred in UI)
- CSV export: blocked
- Leaderboard appearance: blocked

Check limits via `usePlan().checkLimit(type)` — never inline the limit logic.

---

## Lemon Squeezy
- Stripe does not support standalone merchant accounts in Morocco, so Lemon Squeezy was chosen instead
- Edge function names: `create-checkout`, `lemonsqueezy-webhook`
- Webhook verifies the `X-Signature` header (HMAC-SHA256 of the raw body) before parsing, then updates `profiles.plan` + `subscriptions` table
- Never hardcode variant IDs — read from Edge Function secrets `LEMONSQUEEZY_VARIANT_PRO_MONTHLY`, `LEMONSQUEEZY_VARIANT_PRO_YEARLY`, `LEMONSQUEEZY_VARIANT_LIFETIME` (no `VITE_` prefix — server-side only, never bundled into client code)
- `profiles.stripe_customer_id` / `stripe_subscription_id` columns are reused as-is to store Lemon Squeezy customer/subscription IDs — a schema rename is deferred, not a bug
- See `docs/BILLING_STATUS.md` for current integration status

---

## What NOT to do
- Do NOT install additional backend libraries (no Express, Prisma, next-auth)
- Do NOT use `useEffect` to fetch data — use TanStack Query
- Do NOT write to `daily_summaries` or `user_stats` directly from client
- Do NOT use the streak color (#C8FF64) outside StreakBadge.tsx
- Do NOT use relative imports — always use `@/`
- Do NOT use `any` types — if a type is unknown, create a proper type in `src/types/app.ts`
- Do NOT create new Tailwind classes — extend the config if something's missing
- Do NOT implement free plan limit logic inline — always route through `usePlan()`

---

## Current phase
**Phase 11 — complete.** Moving to Phase 12 Launch.

### What Phase 11 delivered
- Dashboard with live TimerWidget, streak/focus/session stats, project quick-start
- Sidebar redesign: collapse/expand, branding, user section
- Topbar redesign: today's streak + focus + sessions stat row, avatar dropdown (plan badge, Settings link, Sign out)
- `useTodayStats` hook: composes `useProfile()` + `useDailySummary(today)`
- Empty states on all pages (explain page purpose + action button)
- Session time displayed per task
- ErrorBoundary at app root
- Two session-save bug fixes: early stop (< 1 min) no longer drops data; break restart race condition after Stop eliminated
- Full mobile responsive pass: all authenticated pages (Dashboard, Projects, ProjectDetail, Billing, Settings, Sessions, Leaderboard, Analytics)
- Analytics mobile: DailyView/WeeklyView top grid stacks to 1-col on mobile; donut+legend flex-col on mobile; YearlyView/MonthlyView stats rows use responsive CSS grid; AllTimeStatsBar 6-cell responsive grid (2→3→6 cols); tab padding tightened for 320 px screens
- Leaderboard mobile: status badge/countdown stacking fix (flex-col on mobile); rank bar flex-wrap

### Phase 12 checklist
- [ ] Lemon Squeezy checkout end-to-end smoke test (create-checkout edge function, lemonsqueezy-webhook, profiles.plan update)
- [ ] Seed data cleanup (manual DB step via DBeaver)
- [ ] Dark/light theme toggle (deferred from Phase 8)
- [x] Landing page / marketing copy — public landing at `/` (src/pages/LandingPage.tsx + src/components/landing/), authenticated app moved to /dashboard, GSAP scroll animations
- [ ] Custom domain + Vercel production deployment
- [ ] Error monitoring (Sentry or equivalent)

---

## Testing approach
- After each feature: manually test the happy path + one error case
- For session saves: verify all 5 tables updated (sessions, profiles, daily_summaries, user_stats, tasks)
- For auth: verify `profiles` row created via `handle_new_user()` trigger
- No test framework set up yet — manual verification via DBeaver + browser

---

## Git conventions
- Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`
- One commit per logical unit (one component, one hook, one page)
- Never commit `.env` files
- Branch: `main` (trunk-based — direct commits, no long-lived branches)

---

## Feature Documentation

Detailed implementation references live in docs/.
Read the relevant doc before touching a feature:

- Dashboard: docs/DASHBOARD.md
- Timer:     docs/timer.md
- Projects:  docs/PROJECTS.md
- Tasks:     docs/TASKS.md
- Landing:   docs/LANDING.md

These docs reflect what is actually built.
They are the source of truth for implementation
details, component props, hook behavior, and
known limitations.
