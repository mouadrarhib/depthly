# Landing Page

The public marketing landing page, served at `/` (Phase 12 launch work).
Logged-out visitors see it as the site's front door; logged-in users can
still visit it, but the nav CTA swaps to "Go to app". The authenticated
app starts at `/dashboard`.

Built as static content — no data fetching. The only dynamic input is
auth state (`authStore.user`), read solely to swap the nav CTA. All
mockups are hardcoded illustrative UI (fake numbers), rendered as real
React components — not screenshots.

---

## Routing (changed in this phase)

| Route | Before | After |
|-------|--------|-------|
| `/` | Protected Dashboard | **Public `LandingPage`** |
| `/dashboard` | Redirect to `/` | **Protected Dashboard** (real route) |

Knock-on updates (all via `PATHS`, no hardcoded strings):

- `PATHS.home` = `/` now means the landing; `PATHS.dashboard` = `/dashboard`
- Sidebar Dashboard nav item + its `end` prop → `PATHS.dashboard`
- Login / Signup / EmailConfirmed post-auth redirects → `PATHS.dashboard`
- "Start the timer" empty-state links (DailyView, WeeklyView, SessionsPage,
  AnalyticsPage) → `PATHS.timer`
- NotFoundPage → `PATHS.home` ("Back to home")
- `/dashboard` while logged out still bounces to `/login` via `ProtectedRoute`

---

## File map

```
src/pages/LandingPage.tsx            Page — composes all sections, owns the
                                     GSAP root ref, calls useAuth() to sync
                                     the Supabase session into authStore
                                     (it renders outside AppLayout)
src/components/landing/
  LandingNav.tsx                     Sticky nav, auth-aware CTA swap
  HeroSection.tsx                    H1 + subtext + primary CTA
  OverviewSection.tsx                "How it works" 2×2 grid (#features)
  FeatureSection.tsx                 Generic alternating mockup/text layout
  TimerMockup.tsx                    Static timer (reuses ProgressRing)
  AnalyticsMockup.tsx                Stat cards + mini calendar heatmap
  LeaderboardMockup.tsx              4 fake rows (reuses StreakBadge)
  PricingSection.tsx                 Free / Pro / Lifetime cards (#pricing)
  ClosingCtaSection.tsx              Full-width lifted banner
  LandingFooter.tsx                  Lockup + 3 link columns + copyright
  primitives.tsx                     Eyebrow, SectionHeader, FeatureBlock,
                                     sectionPad
  useLandingAnimations.ts            All GSAP/ScrollTrigger logic
```

Reused from the app: `Logo`, `Button` (asChild + Link), `ProgressRing`,
`StreakBadge`, lucide icons.

---

## Section order

1. **Nav** — logo lockup + "Stay focused, work deeper" tagline (hidden < md).
   Logged out: "Log in" text link + "Get started" (brand fill). Logged in:
   "Go to app" + initial avatar. Sticky, `rgba(13,13,16,0.88)` + blur,
   0.5px bottom border.
2. **Hero** — "Work at depth." (alternates considered: "Deep work, made
   measurable." / "Focus deeper. Ship more."), one subtext line, "Get
   started free" → `/signup` + "Free forever • No credit card required".
3. **Overview grid** (`#features`) — 4 items: Focus timer, Projects & tasks,
   Analytics, Leaderboard. Lucide outline icons in `#222228` rounded squares.
4. **Feature sections** (alternating, all via `<FeatureSection>`):
   - **A — Focus sessions** (mockup left): TimerMockup + 3 blocks
   - **B — Analytics** (mockup right): AnalyticsMockup + 2 blocks
   - **C — Leaderboard** (mockup left): LeaderboardMockup + 3 blocks;
     "Streak momentum" block uses the streak green icon (explicit streak
     reference — the allowed exception)
5. **Pricing** (`#pricing`) — Monthly/Yearly segmented toggle (same Radix
   Tabs styling as `TimerModeSelector`, local `useState<PlanInterval>`)
   above three cards: Free $0 / Pro (2px brand border + "Most popular"
   badge; $5/mo, or $39/yr with "$3.25/mo" subtext + "Save 35%" pill when
   Yearly is selected) / Lifetime $79 ("Founding member" badge in streak
   green — unaffected by the toggle). Pro's CTA carries the interval for
   checkout wiring: `/signup?plan=pro&interval=monthly|annual`; Lifetime
   links to `/signup?plan=lifetime`.
6. **Closing CTA** — `#141417` band, "Ready to work at depth?" + one button.
7. **Footer** — Product (`#features`, `#pricing`, Changelog `#`), Company
   (About `#`, Contact mailto), Legal (Terms/Privacy `#`), copyright line.
   Placeholder `#` links need real pages before launch.

---

## Mockup fidelity notes

- **TimerMockup** — `ProgressRing` at 240px, brand-blue ring, `font-data`
  25:00, mode pills, static Start/Reset buttons. Ring "draws" to 30% when
  scrolled into view (a local ScrollTrigger flips the `progress` prop;
  ProgressRing's own CSS transition animates the dashoffset).
- **AnalyticsMockup** — Today's focus (2h 30m) + Sessions (4, count-up)
  cards above a 28-day heatmap. Uses the app's **real blue intensity
  scale** (copied from `MonthlyView.getCellColor`) — the app's heatmap is
  blue, not green.
- **LeaderboardMockup** — rank medals (`Trophy` in gold/silver/bronze),
  avatar initials, "You" pill on row 2, `font-data` hours, `StreakBadge`
  per row (hidden < sm to fit 320–375px).

---

## Animation system (GSAP 3.15 + ScrollTrigger)

`useLandingAnimations(rootRef)` — one hook, data-attribute driven so
section components stay animation-free:

| Attribute | Effect |
|-----------|--------|
| `data-hero` | Load-sequence entrance: fade-up, 0.12s stagger |
| `data-reveal-group` | Container for `data-reveal` children (see below) |
| `data-reveal` | Child of a group: y+30 fade-up, 0.1s stagger |
| `data-heatmap` / `data-heat-cell` | Cells pop in (`back.out`, 0.018s stagger) |
| `data-countup` (+ `data-suffix`) | Number counts up from 0 on scroll |

Reveal groups are partitioned at mount:

- **Visible in the initial viewport** (group top < `window.innerHeight`) —
  joins the *load sequence*: a timeline chained after the hero entrance
  (group *i* starts at 0.55s + i×0.2s). A scroll trigger here would either
  fire on mount with no visible transition or sit unfired until a tiny
  scroll.
- **Below the fold** — ScrollTrigger at `top 80%`, `once: true`.

The load sequence waits for the `LogoIntro` splash (~3.7s overlay in
App.tsx) to unmount (via MutationObserver on `.logo-intro`) — otherwise
the entrance would play hidden underneath it. Load-sequence elements are
`gsap.set` to hidden before first paint, so nothing flashes while waiting.

Everything is wrapped in
`gsap.matchMedia('(prefers-reduced-motion: no-preference)')` — reduced-motion
users get a fully visible, motionless page.

---

## Design constraints honored

- Tokens only: `#0D0D10` bg, `#141417` surfaces, `#2E2E38` borders,
  `#4B9EFF` brand, `#7A7890` / `#3D3B4E` muted inks
- Streak green `#C8FF64` appears **only** for explicit streak/founder
  references (StreakBadge rows, "Streak momentum" icon, "Founding member"
  badge)
- `font-data` (JetBrains Mono) on every number: timer, hours, prices, stats
- Sentence case; small uppercase eyebrows only
- No gradients / shadows / glows; dynamic colors via inline `style`
- Responsive: two-column sections collapse below `md` (768px) with the
  mockup **always above** its text (mockup is first in DOM; desktop side
  is `md:flex-row` vs `md:flex-row-reverse`)

---

## Verification (2026-07-06)

Playwright at 375 / 768 / 1280 / 1920 px: all sections render, zero
horizontal overflow, zero console errors; CTA hrefs verified by clicking
through to `/login` and `/signup`; scroll reveals fire and persist (also
after an instant End-key jump); `/dashboard` logged out redirects to
`/login`.

## Known limitations

- The ~3.7s `LogoIntro` splash (App.tsx) also plays before the landing —
  consider skipping it for `/` so visitors see the hero immediately.
- Footer Changelog / About / Terms / Privacy are `#` placeholders.
- Logged-in nav state ("Go to app" + avatar) is implemented but was not
  driven in headless verification (no test credentials).
- Fixed alongside: `Button asChild` crashed (Radix Slot got a null child
  when `isLoading` was falsy) — commit `c5fa3b3`.
