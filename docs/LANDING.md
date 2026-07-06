# Landing Page

The public marketing landing page, served at `/` (Phase 12 launch work).
Logged-out visitors see it as the site's front door; logged-in users can
still visit it, but the nav CTA swaps to "Go to app". The authenticated
app starts at `/dashboard`.

Built as static content — no data fetching, except in the nav: auth
state (`authStore.user`) swaps the CTA, and — for the logged-in account
dropdown — `useProfile()` sources the real display name/avatar/plan the
same way the app's `Topbar` does. All mockups are hardcoded illustrative
UI (fake numbers), rendered as real React components — not screenshots.

**Dependency:** `gsap` `^3.15.0` (added for this page; used only by
`useLandingAnimations.ts` — no other part of the app depends on it).

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
  LandingNav.tsx                     Sticky nav, auth-aware CTA swap,
                                     Features/Pricing anchor links, and the
                                     logged-in account dropdown (avatar
                                     photo via useProfile, plan badge,
                                     Dashboard/Settings/Sign out)
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
`StreakBadge`, the `DropdownMenu` primitives (`@/components/ui/dropdown-menu`),
`Tabs`/`TabsList`/`TabsTrigger`, `useProfile()` and `usePlan()` (both from
the app's analytics/billing hooks), lucide icons.

---

## Section order

1. **Nav** (`LandingNav.tsx`) — logo lockup + "Stay focused, work deeper"
   tagline (hidden < md), then "Features" / "Pricing" anchor links
   (`#features` / `#pricing`, smooth-scroll via global CSS, muted
   `#7A7890` → `#E8E6F0` on hover, no underline, also hidden < md to keep
   the mobile CTA layout tight).

   - **Logged out:** "Log in" text link + "Get started" (brand fill,
     → `/signup`).
   - **Logged in:** "Go to app" button (→ `/dashboard`), a 0.5px divider
     (same style as the logo/tagline divider), then an avatar trigger with
     a hover brightness(1.15)+scale(1.06) affordance and `aria-label="User
     menu"`.
     - **Avatar image:** sourced from `useProfile()` (`profiles.avatar_url`
       — the same hook the app's `Topbar` uses via `useTodayStats()`), not
       from the Supabase auth session's `user_metadata`. Renders the real
       profile photo (`<img>`, `objectFit: cover`, circle-clipped) when
       set; falls back to a colored initial (deterministic hash of
       `displayName` → one of 8 accent colors) otherwise.
       `displayName` itself prefers `profile.display_name`, then auth
       `user_metadata.display_name` / `full_name`, then the email.
     - **Dropdown** (Radix `DropdownMenu` — same primitives the app's
       `Topbar` uses, no separate shared component to import since Topbar
       also builds its dropdown inline): email (muted, non-interactive
       label), plan badge pill (Free/Pro/Founding, from `usePlan()`),
       divider, "Dashboard" (→ `/dashboard`) and "Settings"
       (→ `/settings`) items, divider, "Sign out" (`#E07878`, calls
       `supabase.auth.signOut()`). Fully keyboard-operable (Enter/Space on
       the trigger opens it with the first item auto-highlighted, arrow
       keys move the highlight, Enter selects, Escape closes) and
       focus-trapped for free via Radix; the portal-rendered content is
       `z-50` so it always sits above page content.

   Sticky header itself, `rgba(13,13,16,0.88)` + blur, 0.5px bottom border.
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
5. **Pricing** (`#pricing`, `PricingSection.tsx`) — Monthly/Yearly
   segmented toggle (same Radix Tabs styling as `TimerModeSelector`, local
   `useState<PlanInterval>` where `PlanInterval = 'monthly' | 'annual'`,
   exported from the file for reuse when checkout is wired up) above three
   cards, each with a `price(interval) => { amount, note, sub?, savings? }`
   function so only Pro's row actually varies:

   | Tier | Monthly | Yearly | Badge | CTA | Link |
   |------|---------|--------|-------|-----|------|
   | Free | $0 forever | *(unchanged)* | — | "Get started" | `/signup` |
   | Pro | $5 per month | $39 per year, `$3.25/mo` subtext, "Save 35%" pill | 2px brand border + "Most popular" | "Start free trial" | `/signup?plan=pro&interval=monthly` or `&interval=annual` |
   | Lifetime | $79 one-time payment | *(unchanged — not a recurring plan)* | "Founding member" (streak green) | "Become a founder" | `/signup?plan=lifetime` |

   Free's 4 bullets: timer & stopwatch, up to 3 projects, 50 sessions/mo,
   7-day analytics. Pro's 5 bullets: unlimited projects & sessions, full
   analytics history, Kanban boards, CSV export, leaderboard appearance.
   Lifetime's 3 bullets: everything in Pro forever, all future updates,
   founding member badge on profile. The price block has a fixed
   `minHeight` so cards don't jump when Pro's yearly sub-line appears.
6. **Closing CTA** — `#141417` band bounded by top/bottom 0.5px borders,
   6rem vertical padding (matches the hero). Muted ring-mark icon (bare
   `<Logo>`, no wordmark) → "Ready to work at depth?" → one-line subtext →
   primary "Get started free" + ghost "View pricing" (anchor-scrolls to
   `#pricing`) → the hero's trust line ("Free forever • No credit card
   required").
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

## Changelog

| Commit | What it did |
|--------|-------------|
| `05acef3` | Initial build: routing (`/` → landing, `/dashboard` → app), all 7 sections, GSAP reveal system. Alongside it, `c5fa3b3` fixed a pre-existing `Button asChild` crash (Radix `Slot` got a null child when `isLoading` was falsy) surfaced while wiring the mockups' CTAs. |
| `aaf2f02` | This doc, first version. |
| `f3f387b` | Fixed above-the-fold `data-reveal-group`s firing their ScrollTrigger invisibly on mount (no visible transition) by routing them through a load-sequence timeline instead; added the Pricing Monthly/Yearly toggle. |
| `ff44d2b` | Closing CTA polish: 6rem padding, ring-mark icon, subtext, ghost "View pricing" link, trust line, top+bottom borders. |
| `55f5f04` | Wired the nav avatar into a working account dropdown (Radix `DropdownMenu`, keyboard-operable) and added the Features/Pricing anchor links + hover affordance. |
| *(uncommitted at time of writing)* | Fixed the nav avatar to render the user's real `profiles.avatar_url` via `useProfile()` — previously it only read auth `user_metadata` and always showed the colored-initial fallback, even for users with a profile photo. **Not yet verified or committed** — see below. |

## Verification

**2026-07-06** (commit `05acef3` + `c5fa3b3`): Playwright at 375 / 768 /
1280 / 1920 px — all sections render, zero horizontal overflow, zero
console errors; CTA hrefs verified by clicking through to `/login` and
`/signup`; scroll reveals fire and persist (also after an instant End-key
jump); `/dashboard` logged out redirects to `/login`.

**Same day** (commits `f3f387b`, `ff44d2b`): re-verified the load-sequence
vs. scroll-trigger split at both a tall viewport (1920×1300, overview grid
inside the initial viewport) and a short one (1280×900, overview below the
fold) — both paths reveal visibly rather than instantly; confirmed the
Monthly/Yearly toggle updates only the Pro card (Free/Lifetime byte-identical
across states) and its CTA href switches between `interval=monthly` /
`interval=annual`; re-screenshotted the closing CTA at all four widths
(zero overflow, `box-shadow: none`, `background-image: none` — no
gradients/glow) and confirmed "View pricing" smooth-scrolls to `#pricing`.

**Same day** (commit `55f5f04`): logged-in nav state was driven headlessly
by injecting a well-formed (unsigned) Supabase v2 session into
`localStorage` under the app's real storage key — confirmed the dropdown
opens with email/plan badge/Dashboard/Settings/Sign out, Dashboard and
keyboard-driven Settings both navigate correctly, Sign out reverts the nav
to its logged-out state, and Features/Pricing anchor links scroll to the
right sections at 1280px and remain hidden with no CTA-layout breakage at
375px. One flake was traced to firing `ArrowDown, ArrowDown, Enter` with
zero delay in headless CDP (faster than any real keystroke) occasionally
landing Enter on the wrong item — reproduced only under that unrealistic
timing; with any human-plausible delay (150ms+) it consistently selects
the correct item. This is Radix's own keyboard handling (identical to
`Topbar.tsx`'s), not custom code added here.

**Avatar-photo fix (`useProfile()` wiring): not yet verified.** Implemented
per explicit instruction to skip verification/commit/push for that change
— re-run the same fake-session Playwright approach with a session whose
`profiles.avatar_url` resolves to a real image URL before relying on this.

## Known limitations

- The ~3.7s `LogoIntro` splash (App.tsx) also plays before the landing —
  consider skipping it for `/` so visitors see the hero immediately.
- Footer Changelog / About / Terms / Privacy are `#` placeholders.
- Pricing CTAs encode `plan`/`interval` as query params (e.g.
  `/signup?plan=pro&interval=annual`) but nothing on `/signup` reads them
  yet — wire this up once Lemon Squeezy checkout exists.
- The avatar-photo fix (see Changelog) has not been verified end-to-end
  with a real Supabase profile that has an `avatar_url` set.
