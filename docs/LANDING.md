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
`recharts` (already an app dependency) is reused by `AnalyticsMockup`'s
donut, same as the real `ProjectBreakdownCard`.

---

## Routing (changed in this phase)

| Route | Before | After |
|-------|--------|-------|
| `/` | Protected Home page | **Public `LandingPage`** |
| `/dashboard` | Redirect to `/` | **Protected Home page** (real route — renders `HomePage`; the URL itself was kept as `/dashboard` when the nav item/page were later renamed "Dashboard" → "Home", to avoid colliding with `PATHS.home` above) |

Knock-on updates (all via `PATHS`, no hardcoded strings):

- `PATHS.home` = `/` now means the landing; `PATHS.dashboard` = `/dashboard`
- Sidebar Home nav item + its `end` prop → `PATHS.dashboard`
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
                                     Home/Settings/Sign out)
  HeroSection.tsx                    H1 + subtext + primary CTA, with a
                                     static ambient dot-grid background
  OverviewSection.tsx                "How it works" 2×2 grid (#features)
  FeatureSection.tsx                 Generic alternating mockup/text layout
                                     (two header modes; see below)
  TimerMockup.tsx                    Static timer (reuses ProgressRing)
  TaskKanbanMockup.tsx               Static 3-column kanban board
  AnalyticsMockup.tsx                Stat cards + mini calendar heatmap +
                                     per-project donut
  LeaderboardMockup.tsx              4 fake rows (reuses StreakBadge) +
                                     static Everyone/Friends toggle pill
  PricingSection.tsx                 Free / Pro / Lifetime cards (#pricing)
  ClosingCtaSection.tsx              Full-width lifted banner
  LandingFooter.tsx                  Lockup + 3 link columns + copyright
  primitives.tsx                     Eyebrow, SectionHeader, FeatureBlock,
                                     sectionPad
  useLandingAnimations.ts            All GSAP/ScrollTrigger logic
```

Reused from the app: `Logo`, `Button` (asChild + Link), `ProgressRing`,
`StreakBadge`, the `DropdownMenu` primitives (`@/components/ui/dropdown-menu`),
`Tabs`/`TabsList`/`TabsTrigger`, `PRIORITY_CONFIG` (`@/lib/utils/tasks`),
`formatMinutesToHours` (`@/lib/utils/analytics`), `recharts`'
`PieChart`/`Pie`/`Cell`, `useProfile()` and `usePlan()` (both from the
app's analytics/billing hooks), lucide icons.

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
       divider, "Home" (→ `/dashboard`) and "Settings"
       (→ `/settings`) items, divider, "Sign out" (`#E07878`, calls
       `supabase.auth.signOut()`). Fully keyboard-operable (Enter/Space on
       the trigger opens it with the first item auto-highlighted, arrow
       keys move the highlight, Enter selects, Escape closes) and
       focus-trapped for free via Radix; the portal-rendered content is
       `z-50` so it always sits above page content.

   Sticky header itself, `rgba(13,13,16,0.88)` + blur, 0.5px bottom border.
2. **Hero** — "Work at depth." + subtext ("A focus session tracker for
   students, freelancers, and remote developers. Run your sessions, see
   where the hours actually went, and build a streak you don't want to
   break."), "Get started free" → `/signup` + "Free forever • No credit
   card required". A static ambient dot-grid sits behind the text — see
   **Hero background** below; there is no other decorative background
   element on this page (an earlier concentric-ring motif was tried and
   scrapped, see Changelog).
3. **Overview grid** (`#features`) — "Four things, nothing else" / "No
   teams, no chat, no notification spam. Just a timer, your projects, and
   a record of where the time went." 4 items (Focus timer, Projects &
   tasks, Analytics, Leaderboard), each a single-line blurb now (shortened
   from the original 2-line copy). Lucide outline icons in `#222228`
   rounded squares.
4. **Feature sections** (alternating, all via `<FeatureSection>`; mockup
   side now alternates left/right/left/right across all four):
   - **A — Focus sessions** (mockup left, centered `eyebrow`/`title`/
     `subtext` header — the one instance still using that mode): TimerMockup
     + 3 blocks (Timer or stopwatch, Fully customizable, Session tracking
     with streaks)
   - **B — Projects & Tasks** (mockup right, `heading`/`body` mode, *no*
     eyebrow): TaskKanbanMockup + 3 blocks (List or kanban, Priority and
     due dates, Tied to your sessions)
   - **C — Analytics** (mockup left, `heading`/`body` mode): AnalyticsMockup
     + 2 blocks (Daily focus tracking, Visualize your progress)
   - **D — Leaderboard** (mockup right, `heading`/`body` mode):
     LeaderboardMockup + 2 blocks (Global rankings, Friends, not
     followers) — the earlier third "Streak momentum" block (streak-green
     icon exception) was removed
5. **Pricing** (`#pricing`, `PricingSection.tsx`) — "Start free. Upgrade if
   you need to." / "Free covers most people. Pro is for when you outgrow
   it." Monthly/Yearly segmented toggle (same Radix Tabs styling as
   `TimerModeSelector`, local `useState<PlanInterval>` where
   `PlanInterval = 'monthly' | 'annual'`, exported from the file for reuse
   when checkout is wired up) above three cards, each with a
   `price(interval) => { amount, note, sub?, savings? }` function so only
   Pro's row actually varies:

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
   `<Logo>`, no wordmark) → "Start your first session" → "Free forever, no
   credit card, no team invites you didn't ask for." → primary "Get
   started free" + ghost "View pricing" (anchor-scrolls to `#pricing`) →
   the hero's trust line ("Free forever • No credit card required").
7. **Footer** — Product (`#features`, `#pricing`), Company (Contact
   mailto), Legal (Terms/Privacy — real routes), copyright line. See
   `docs/LEGAL_PAGES.md` for the full implementation (Changelog/About were
   removed rather than left as placeholders).

---

## `FeatureSection` — two header modes, one mockup-alignment mechanism

`FeatureSection` renders a ~55/45 mockup/text row and supports **either**
of two header styles, chosen by which props are passed (never both at
once in practice):

- **Centered header** — pass `eyebrow` + `title` + `subtext` together
  (`hasCenteredHeader` in the component). Renders `SectionHeader` (from
  `primitives.tsx`) full-width above the row, with `marginTop: 56` pushing
  the row down. Only **Focus sessions** uses this mode.
- **Inline heading/body** — pass `heading` + `body` instead. Renders an
  `h2` + `p`, left-aligned, as the *first* item inside the text column
  (above the `FeatureBlock` children), no separate header block above the
  row (`marginTop: 0`). **Projects & Tasks, Analytics, and Leaderboard**
  all use this mode.

**Mockup slot (`md:self-stretch` + inner `flex items-center
justify-center`):** the mockup wrapper always stretches to the row's full
(content-driven) cross-axis height at `md:` and up, and centers whatever
mockup is inside it. This means the *shorter* side of the row — whichever
one that is for a given section — always centers against the *taller*
one's real content height, the same way for every instance, with no
per-instance override needed if a mockup's content changes size later
(this replaced an earlier one-off `stretchMockup` prop that only existed
for one section — see Changelog).

**Animation:** each `FeatureSection` is exactly one `data-reveal-group`
(the `<section>` itself) with `data-reveal` on the mockup wrapper, the
inline heading/body block (when present), and each `FeatureBlock`. Nothing
inside a mockup component should carry its own nested `data-reveal-group`
— an earlier version of `TaskKanbanMockup` did this to stagger its cards
individually, which caused two independent GSAP tweens to target the same
DOM nodes (see Changelog); its cards now use plain `data-reveal` and are
picked up by the section's one group like everything else.

Section-to-section spacing is `sectionPad` (fixed `5.5rem` top/bottom,
identical on every section) plus this row's content-driven height — there
is no explicit or min-height anywhere in the chain, so the gap before the
next section is always `sectionPad.bottom + sectionPad.top` regardless of
how tall any one mockup gets.

---

## Hero background

`HeroSection.tsx` renders a single static `<div>` behind the text
(`position: absolute; inset: 0`, `pointer-events: none`, `zIndex: -1`
relative to the `relative`, higher-`zIndex` text wrapper):

```css
background-image: radial-gradient(circle, #7A7890 1px, transparent 1px);
background-size: 24px 24px;
opacity: 0.15;
```

A repeating 24px dot grid (GitHub-contributions-style texture), 1px dots
in the app's `ink-secondary` token, no JS, no animation, contained by the
hero `<section>`'s own `overflow-hidden`. The `radial-gradient` here is a
dot-drawing technique (two color stops at the same offset, hard edge), not
a decorative gradient fill — the "no gradients" design constraint below is
about visual gradient fills, not this.

This replaced an earlier, more elaborate attempt: three concentric rings
(the `Logo` mark's construction, scaled up ~15–40x) with a GSAP
`ring-breathe` pulse. That version went through four broken iterations —
wrong containing block, `ring-breathe`'s keyframe `transform` silently
overriding the inline `translate(-50%, -50%)` used for centering (CSS
animations outrank inline styles), etc. — before being scrapped entirely
in favor of this simpler, fully static approach per explicit instruction.
`tailwind.config.ts`'s `ring-breathe` keyframe/animation definitions are
still there, intentionally unused — nothing currently references them.

---

## Mockup fidelity notes

- **TimerMockup** — `ProgressRing` at 240px, brand-blue ring, `font-data`
  25:00, mode pills, static Start/Reset buttons. Ring "draws" to 30% when
  scrolled into view (a local ScrollTrigger flips the `progress` prop;
  ProgressRing's own CSS transition animates the dashoffset).
- **TaskKanbanMockup** — three columns (To Do / In Progress / Done) using
  the real `KanbanColumn`'s tint+accent construction (`rgba(122,120,144,
  0.06)` / `#7A7890`, `rgba(75,158,255,0.06)` / `#4B9EFF`,
  `rgba(61,214,140,0.06)` / `#3DD68C` — duplicated locally as
  `STATUS_CONFIG` since the real `KanbanColumn.tsx`'s `COLUMN_CONFIG` isn't
  exported), 2 fake cards per column, priority chips built from the real,
  imported `PRIORITY_CONFIG` (`@/lib/utils/tasks`), one due-date chip
  total on the whole board (normal + overdue-red variants both exist in
  the codebase, only the overdue one is used here to stay uncluttered).
  Columns are `flex-1` (no fixed px width) inside a `maxWidth: 440`
  card so 3 columns always fit with zero horizontal overflow at any
  viewport, including the narrowest mobile widths. Column headers use
  `items-start` + a wrapping label (`flex-1 break-words`, no `truncate`)
  so "In Progress" stays fully readable instead of truncating at ~375px —
  it naturally stays on one line at desktop widths where it already fits.
  No `dnd-kit`, no drag-and-drop — purely decorative.
- **AnalyticsMockup** — Today's focus (2h 30m) + Sessions (4, count-up)
  cards, a 28-day heatmap using the app's **real blue intensity scale**
  (copied from `MonthlyView.getCellColor` — the app's heatmap is blue, not
  green), and a third card, "By project": a 100px `recharts`
  `PieChart`/`Pie`/`Cell` donut (same construction as the real
  `ProjectBreakdownCard`, just smaller and without the hover tooltip) with
  a name/`font-data` time legend, 4 fake projects colored from the real
  project-color picker's `PRESET_COLORS` (`ProjectModal.tsx`) —
  deliberately skipping `#C8FF64` even though it's a valid pickable
  project color in the real app, since that hex is reserved for
  `StreakBadge` elsewhere on this page.
- **LeaderboardMockup** — a static, non-functional "Everyone" / "Friends"
  segmented pill (same visual construction as `PricingSection`'s
  Monthly/Yearly toggle: `#222228` track, active pill `#141417` bg +
  `#4B9EFF` text + `rgba(75,158,255,0.3)` border, "Everyone" always shown
  active) sits above the ranked list purely to hint both views exist — no
  `onClick`, no state. Below it: rank medals (`Trophy` in gold/silver/
  bronze), avatar initials, "You" pill on row 2, `font-data` hours,
  `StreakBadge` per row (hidden < sm to fit 320–375px).

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

Exactly one `data-reveal-group` per top-level section (see the
`FeatureSection` note above for why nesting a second group inside one
broke things) — this is the invariant to preserve when adding new
sections or mockups.

The load sequence waits for the `LogoIntro` splash (~3.7s overlay in
App.tsx) to unmount (via MutationObserver on `.logo-intro`) — otherwise
the entrance would play hidden underneath it. Load-sequence elements are
`gsap.set` to hidden before first paint, so nothing flashes while waiting.

Everything is wrapped in
`gsap.matchMedia('(prefers-reduced-motion: no-preference)')` — reduced-motion
users get a fully visible, motionless page. The hero dot-grid background
is plain CSS with no animation at all, so it's identical for both
motion-preference states.

---

## Design constraints honored

- Tokens only: `#0D0D10` bg, `#141417` surfaces, `#2E2E38` borders,
  `#4B9EFF` brand, `#7A7890` / `#3D3B4E` muted inks
- Streak green `#C8FF64` appears **only** for explicit streak/founder
  references (StreakBadge rows, "Founding member" badge) — the one former
  exception on this page, the Leaderboard's "Streak momentum" block, was
  removed along with its icon
- `font-data` (JetBrains Mono) on every number: timer, hours, prices,
  stats, and now the Analytics donut legend's per-project times
- Sentence case; small uppercase eyebrows only (only used by Focus
  sessions, Overview, and Pricing now — the other three `FeatureSection`
  instances use the inline `heading`/`body` mode instead, no eyebrow)
- No gradients / shadows / glows as decorative fills; dynamic colors via
  inline `style` (the hero dot-grid's `radial-gradient` is a dot-drawing
  technique, not a decorative fill — see Hero background above)
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
| `829b615` | Full copy rewrite (Hero, Overview blurbs, Focus sessions, Pricing, Closing CTA); added the **Projects & Tasks** `FeatureSection` + `TaskKanbanMockup`, reordering the four feature sections to Focus → Projects & Tasks → Analytics → Leaderboard with a consistent left/right alternation; added the Analytics "By project" donut; introduced `FeatureSection`'s `heading`/`body` inline-header mode and the always-on mockup stretch+center mechanism (superseding an interim `stretchMockup` opt-in prop that only existed for one section, since removed); removed Leaderboard's third "Streak momentum" block. |
| `2dd2d7f` | Replaced a scrapped concentric-ring hero background (four broken iterations — see Hero background above) with the static dot-grid; added Leaderboard's static Everyone/Friends toggle pill; updated Leaderboard's "Global rankings" and "Follow friends" → "Friends, not followers" copy. |
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

**2026-08-09** (commit `2dd2d7f`, hero dot-grid + Leaderboard toggle): a
Chrome-in-browser extension wasn't available this session, so verification
used the system's installed Edge browser directly in headless mode
(`msedge --headless --disable-gpu --screenshot=... http://localhost:5173`)
against the running dev server, plus `--dump-dom` to read the actual
rendered `style` attribute rather than trust source. Confirmed at
1280×900, 1280×1400 (taller than the hero, to check for bleed into
"How it works" below), and 375×812: the dot grid renders with computed
`background-image: radial-gradient(circle, rgb(122, 120, 144) 1px,
transparent 1px); background-size: 24px 24px; opacity: 0.15` (matching
source exactly, `rgb(122, 120, 144)` being the browser-normalized form of
`#7A7890`), stays fully inside the hero section's `overflow-hidden`
bounds with no bleed, and introduces no new horizontal scroll at any
tested width. Fixing the dot-grid centering context along the way (a
`mx-auto` experiment briefly replaced the section's proven
`flex items-center` centering and was reverted after a mobile screenshot
showed the headline shifted right) surfaced a **pre-existing, unrelated**
bug: at 375px the hero headline/subtext are shifted right with subtext
clipped past the viewport edge. Isolated via `git stash` back to the
immediately prior commit (`829b615`, before any hero-background work) —
the same shift reproduces there with zero relevant code present, so it
predates this work and was left unfixed (out of scope) — see Known
limitations.

**Avatar-photo fix (`useProfile()` wiring): not yet verified.** Implemented
per explicit instruction to skip verification/commit/push for that change
— re-run the same fake-session Playwright approach with a session whose
`profiles.avatar_url` resolves to a real image URL before relying on this.

## Known limitations

- The ~3.7s `LogoIntro` splash (App.tsx) also plays before the landing —
  consider skipping it for `/` so visitors see the hero immediately.
- ~~Footer Changelog / About / Terms / Privacy are `#` placeholders.~~
  Resolved — see `docs/LEGAL_PAGES.md`.
- Pricing CTAs encode `plan`/`interval` as query params (e.g.
  `/signup?plan=pro&interval=annual`) but nothing on `/signup` reads them
  yet — wire this up once Lemon Squeezy checkout exists.
- The avatar-photo fix (see Changelog) has not been verified end-to-end
  with a real Supabase profile that has an `avatar_url` set.
- **Pre-existing, unverified-until-now:** at ≤375px viewport widths, the
  hero headline and subtext are shifted right of true center, with the
  subtext clipping past the viewport edge instead of wrapping within it.
  Confirmed present as far back as commit `829b615` (predates the hero
  dot-grid/ring work); not yet root-caused or fixed.
