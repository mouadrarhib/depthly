# Landing Page

The public landing page is served at `/`. Authenticated users are redirected to
`/dashboard`; logged-out visitors see the marketing page immediately, without
the authenticated app's logo intro.

The page is static apart from the auth-aware navigation. Product mockups use
local illustrative data and never fetch a visitor's sessions, Analytics, or
leaderboard information.

## Positioning

Depthly is presented as a personal deep-focus product first and optional social
accountability second:

`Focus → Goals → Progress → Share → Compete together`

Students remain the primary acquisition audience, while the public product
positioning explicitly serves students, freelancers, and independent learners.
The hero headline is:

> Focus on the work. We'll track the time.

The page must not invent testimonials, user totals, or performance claims. It
must not describe Depthly as a team or social-first product. The closing idea is
to start alone and invite others only when useful.

## Page order

1. Sticky navigation with login, signup, Features, and Pricing destinations.
2. Hero with the two-line headline, copy covering study, client work,
   and independent learning, a free-signup CTA, and a jump to the product flow.
3. Five-stage overview: Focus, Set goals, See progress, Share, Focus together.
4. Trusted focus timer: timer-tracked sessions become trusted progress.
5. Daily goals and Analytics: explicit goal progress, history, heatmaps, trends,
   and project breakdowns.
6. Share Progress: an authentic Analytics capture and preview with charts and
   Depthly branding, not a generic stat card.
7. Private group leaderboards: neutral “focus circle” language covering study
   partners, freelancer peers, and accountability friends, plus shared goals,
   reset periods, and group-scoped visibility. Friends and public/global
   rankings are optional secondary paths.
8. Compact Projects & Tasks support block using the kanban mockup.
9. Free, Pro, and Lifetime pricing.
10. Closing CTA and footer.

## Pricing claims

- Free: trusted timer, three projects, 50 sessions per month, seven-day
  Analytics, Share Progress within that window, unlimited group joining, and
  one active private group with up to 15 members including its creator.
- Pro: unlimited core usage, full Analytics history and CSV export, optional
  public-profile/global-leaderboard visibility, and up to 10 active private
  groups with up to 100 members each.
- Lifetime/Founding inherits Pro capabilities.

Private group participation is independent of `profiles.is_public`. Free users
can join and rank, and membership grants only group-scoped display name, avatar,
trusted focus time, session count, and goal progress visibility.

## Rendering, motion, and responsive behavior

Hero copy and CTAs render visibly on the first paint. `useLandingAnimations`
never waits for `.logo-intro` and never hides hero content. GSAP coordinates a
subtle navigation entrance, opaque hero glide, ambient grid drift, depth-based
scroll reveals for every feature section, heatmap/count-up micro-motion, and the
footer reveal.

The focus path overview intentionally does not use the generic
`data-reveal-group` animation. It has a dedicated GSAP timeline identified by
`data-focus-path`: the heading enters first, followed by five numbered steps
in product order: Focus, Set goals, See progress, Share, Focus together. The
ordered rail uses simple separators instead of repeated cards and icons. Each
step enters with a short, staggered rise when the section reaches 78% of the
viewport. The sequence runs once and stays readable without animation.

The Trusted focus section keeps its static timer preview and explains the
session-to-progress link with two concise details: active-timer recovery and
finished sessions feeding Analytics and private group rankings. The illustrative
preview has one accessible image label rather than exposing its nonfunctional
controls as separate content.

The Share Progress section shows an example exported image, with the same
branded frame, Analytics capture, and footer used by the real sharing flow.
Its seven-day chart renders visible bars; share controls are described beside
the image rather than drawn as nonfunctional buttons inside it. The example
is labeled as illustrative and has an accessible image description.

The private focus-circle section mirrors the real group detail page at preview
scale: active status, member and rank summary, shared-target banner, and a
ranking table with session counts, focus time, and goal progress. The copy
explains daily, creation-anchored seven-day, and monthly rounds, optional
goals, member-only visibility, and Free participation without a public profile.
The static preview does not present an unusable invite button.

The Projects and Tasks support section is a short, unboxed transition before
pricing. Its example kanban board contains tasks from one research project and
shows focus time on individual tasks and the project. The example is labeled
and has an accessible image description; it does not imply tasks from separate
projects share one board. Its tinted status columns, status dots and counts,
priority badges, and task-card treatment follow the real Kanban components.

All animation is disabled by `prefers-reduced-motion`, leaving every element in
its normal visible layout.

The 320–375px layout uses reduced navigation and hero padding, mobile-safe line
wrapping, full-width hero CTAs, and a shortened navigation CTA. Mockups must use
bounded widths and `min-w-0`/overflow containment so they cannot widen the page.

### Analytics viewport fit

The Daily goals and Analytics section opts into `FeatureSection`'s
`viewportFit` mode. At the desktop breakpoint it uses
`min-height: calc(100dvh - 4rem)` to fill the viewport below the 64px landing
nav, applies height-aware clamped vertical padding, and vertically centers the
copy and mockup columns.

`AnalyticsMockup` presents Today's focus, Sessions, Daily goal, the monthly
heatmap, and By project as one connected report instead of a stack of separate
cards. Its desktop width is capped at 460px and responds to viewport height.
The calendar grid and project donut compact at desktop sizes while retaining
the illustrative data, brand colors, data-font metrics, and GSAP animation
hooks. Below the desktop breakpoint, the section keeps its 5.5rem vertical
padding, stacked layout, and normal document scrolling.

Global horizontal overflow uses `overflow-x: clip`, not `hidden`. Using `hidden`
causes the other axis to compute as `auto`, which can turn `body` into a second
vertical scroll container while GSAP-translated sections extend beyond their
layout boxes. The landing page must retain one document scrollbar only.

Preserve semantic heading order, keyboard-operable controls, visible focus
states, the existing dark-first design tokens, and `font-data` on metrics.

## File map

```text
src/pages/LandingPage.tsx
src/components/landing/
  LandingNav.tsx
  HeroSection.tsx
  OverviewSection.tsx
  FeatureSection.tsx
  TimerMockup.tsx
  AnalyticsMockup.tsx
  ShareProgressMockup.tsx
  LeaderboardMockup.tsx
  ProjectsSupportSection.tsx
  TaskKanbanMockup.tsx
  PricingSection.tsx
  ClosingCtaSection.tsx
  LandingFooter.tsx
  primitives.tsx
  useLandingAnimations.ts
```

## Verification checklist

- Every anchor and auth/pricing route reaches its intended destination.
- Signup plan and interval query parameters are preserved.
- Claims match the API-enforced project, session, Analytics, group, and public
  leaderboard rules.
- The page has no horizontal overflow at 320, 375, 768, 1024, or desktop widths.
- The document has one vertical scroll owner and no nested page-level scrollbar
  while animations are waiting or running.
- Hero content remains readable with normal and reduced motion.
- The focus-path heading and all five steps animate in order when scrolled into
  view and remain static and visible with reduced motion enabled.
- The complete Analytics composition is visible at once with both columns
  vertically centered at 1920×1080 and 1536×864; it also remains within the
  viewport below the nav at common 768px, 800px, 900px, and 1080px desktop
  heights.
- The Analytics section returns to the stacked, content-driven layout below the
  desktop breakpoint without horizontal overflow or excessive shrinking.
- Typecheck, production build, React quality review, and mobile/desktop visual
  checks pass.
