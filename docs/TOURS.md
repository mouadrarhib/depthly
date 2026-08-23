# Product Tours — Implementation Reference

## 1. Overview

Depthly uses `driver.js` for lightweight, in-product guidance. Tours explain the
interface without blocking normal use and can be closed at any time.

There are currently two guides:

| User-facing name | Scope | Steps | Auto-start |
|---|---|---:|---|
| **Quick guide** | Authenticated app navigation and core features | 9 | Once per user after the post-login intro |
| **Projects guide** | `/projects` list-page workflow | 1 or 3 | Once per user after data loads and the Quick Guide has been seen |

User-facing copy says **guide**. Existing code identifiers retain `tour` and
`onboarding` terminology.

---

## 2. Shared Presentation

- Package: `driver.js`
- Base stylesheet: `driver.js/dist/driver.css`
- Depthly theme overrides: `src/lib/onboarding/onboarding.css`
- Popovers use the existing dark surfaces, borders, typography, and brand action color.
- Progress is always shown (`1 of 9`, `1 of 3`, and so on).
- Closing with the X, Escape, or the final Done button counts the guide as seen.
- Page guides must never target an element that is not currently rendered.

---

## 3. Global Quick Guide

### Steps

1. Home
2. Today's Stats
3. Your Focus Timer
4. Projects
5. Sessions
6. Analytics
7. Leaderboard
8. Billing
9. Settings

`getTourSteps(isMobile)` in `src/lib/onboarding/tourSteps.ts` owns the step
order, copy, selectors, and responsive placement.

### Auto-start and replay

`useOnboardingTour()` is mounted once in `AppLayout`. It waits for:

- an authenticated user ID;
- the post-login `LogoIntro` to finish;
- the user's seen flag to be absent.

The guide can be replayed from:

- **Topbar Help → Quick guide**;
- **Settings → Account → Show me the quick guide**.

Both replay entry points call `clearOnboardingTourSeen(userId)` followed by
`runOnboardingTour(userId)`.

### Mobile sidebar coordination

Most Quick Guide targets live inside the sidebar. On mobile, the drawer must be
open for sidebar steps and closed for Today's Stats. `runOnboardingTour()` owns
this coordination through driver.js's config-level `onNextClick` and
`onPrevClick` hooks.

The target drawer state is applied before advancing. When the drawer changes,
the guide waits 220ms for the sidebar's 200ms transition before driver.js
measures the next target. The original drawer state is restored when the guide
ends.

Do not move this logic into `onHighlightStarted`: driver.js has already measured
the target by that point, which causes stale highlights and overlapping popovers.

### Completion event

When the Quick Guide is destroyed, it:

1. stores its seen flag;
2. dispatches `depthly:onboarding-tour-finished`;
3. restores the mobile sidebar state when necessary.

Contextual guides can listen for the event when they must wait for global
onboarding to finish.

---

## 4. Contextual Projects Guide

### Steps with visible projects

1. **Create a project** — New Project button.
2. **Open the workspace** — first visible project card.
3. **Manage the project** — first visible card's actions menu.

The copy explains project identity, tasks and sessions, and the difference
between archiving and permanently deleting a project.

### Empty or filtered state

If no project card is currently rendered, the guide contains only **Create a
project**. This covers genuinely empty accounts and a search with no matches
without passing missing targets to driver.js.

### Auto-start and replay

`useProjectsTour(hasProjects, isLoading)` is mounted by `ProjectsPage`. It waits
for:

- an authenticated user ID;
- the post-login intro to finish;
- both project collections to finish loading;
- the global Quick Guide to be marked as seen;
- the Projects guide seen flag to be absent.

The start is delayed by 250ms so the page and targets settle. The timer is
cancelled if the page unmounts. If global onboarding is still running, the hook
listens for `depthly:onboarding-tour-finished` before scheduling the guide.

The Topbar Help menu shows **Projects guide** only on the exact `/projects`
route. Manual replay checks the rendered DOM for a project-card target; it does
not add project queries to the global Topbar.

### Responsive placement

- New Project: below the button on desktop and mobile.
- Project card: right on desktop, above on mobile.
- Project actions: left on desktop, below on mobile.

The mobile breakpoint matches the app sidebar: `(max-width: 767px)`.

---

## 5. Targets

| Selector | Owner | Purpose |
|---|---|---|
| `[data-tour="home"]` | `Sidebar.tsx` | Quick Guide Home step |
| `[data-tour="today-stats"]` | `Topbar.tsx` | Quick Guide daily stats step |
| `[data-tour="timer"]` | `Sidebar.tsx` | Quick Guide Timer step |
| `[data-tour="projects"]` | `Sidebar.tsx` | Quick Guide Projects step |
| `[data-tour="sessions"]` | `Sidebar.tsx` | Quick Guide Sessions step |
| `[data-tour="analytics"]` | `Sidebar.tsx` | Quick Guide Analytics step |
| `[data-tour="leaderboard"]` | `Sidebar.tsx` | Quick Guide Leaderboard step |
| `[data-tour="billing"]` | `Sidebar.tsx` | Quick Guide Billing step |
| `[data-tour="settings"]` | `Sidebar.tsx` | Quick Guide Settings step |
| `[data-project-tour="new-project"]` | `ProjectsPage.tsx` | Projects creation step |
| `[data-project-tour="project-card"]` | `ProjectCard.tsx` | Projects workspace step |
| `[data-project-tour="project-actions"]` | `ProjectCard.tsx` | Projects management step |

Selectors are implementation contracts. Rename them only when updating the
corresponding step builder and browser verification together.

---

## 6. Persistence

Seen state is local to the current browser and user:

```text
depthly_onboarding_seen_{userId}
depthly_projects_tour_seen_{userId}
```

No Supabase table or migration is required. A different browser or cleared site
storage starts the guides again.

---

## 7. File Map

| File | Responsibility |
|---|---|
| `src/hooks/useOnboardingTour.ts` | Global guide runner, persistence, intro gating, and mobile sidebar sequencing |
| `src/lib/onboarding/tourSteps.ts` | Global Quick Guide steps and placement |
| `src/hooks/useProjectsTour.ts` | Projects guide runner, persistence, auto-start coordination, and cleanup |
| `src/lib/onboarding/projectTourSteps.ts` | Projects guide step builder and responsive placement |
| `src/lib/onboarding/onboarding.css` | Shared Depthly driver.js theme |
| `src/components/layout/AppLayout.tsx` | Mounts global onboarding once |
| `src/components/layout/Topbar.tsx` | Help replay menu and Today's Stats target |
| `src/components/layout/Sidebar.tsx` | Global navigation targets |
| `src/pages/ProjectsPage.tsx` | Mounts Projects guide and exposes creation target |
| `src/components/projects/ProjectCard.tsx` | Exposes card and actions targets |
| `src/components/settings/AccountSection.tsx` | Settings replay entry for the Quick Guide |

---

## 8. Adding Another Contextual Guide

1. Create a page-specific step builder under `src/lib/onboarding/`.
2. Add stable `data-*-tour` attributes to visible, accessible targets.
3. Create a hook that owns its per-user seen key and cleanup.
4. Wait for required server data and the global Quick Guide before auto-starting.
5. Build shorter steps when optional targets are absent.
6. Add a route-specific replay entry in Help only where every target is valid.
7. Reuse `onboarding.css`; do not create a competing popover design.
8. Document the guide here and link it from the feature document.

---

## 9. Verification Checklist

- Auto-start occurs once for the correct user and does not overlap LogoIntro.
- Global and contextual guides never overlap each other.
- Next, Previous, Done, X, Escape, and arrow-key navigation behave correctly.
- Replay is available only on routes with valid targets.
- Empty/loading/filtered states never produce missing-target steps.
- Desktop popovers do not obscure the highlighted action.
- Mobile placement works at 320px without horizontal overflow.
- The mobile sidebar is restored to its original state after the Quick Guide.
- TypeScript typecheck and production build pass.
