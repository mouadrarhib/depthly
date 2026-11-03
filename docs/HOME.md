# Home

The Home page (`/dashboard` — see the "Routes" note below on why the URL
wasn't renamed to match) is the first screen users see after login.
(The root `/` serves the public marketing landing page — see LANDING.md.)
It combines the focus timer with an at-a-glance view of today's
stats, recent activity, and quick navigation.

---

## Layout

Two-column responsive grid (`lg:grid-cols-[1.7fr_0.87fr]`).
Single column on mobile; the daily goal and week chart share a row on medium screens.

### Left column — focus and recent work

| Section | Component(s) | Data source |
|---------|-------------|-------------|
| Timer workspace | `<TimerWidget />` with live project/task selectors, timer ring, controls, and notes/todo panels | `timerStore`, `useSaveSession`, project/task queries |
| Recent sessions list | `<SessionRow />` × 3 | `useSessionsPaginated(0)` |

**Header activity summary**

- **Focus today** — `focus_minutes` from `daily_summaries`
- **Sessions today** — `session_count` from `daily_summaries`

### Right column — progress and destinations

| Section | Data source |
|---------|-------------|
| Daily goal | `useGoals()` and today's focus minutes; progress bar or set-goal action |
| This Week mini chart | `useDailySummariesRange(weekStart, weekEnd)` — 7-bar Recharts `BarChart`, today highlighted brand-blue |
| Keep moving links | Static links: Projects, Analytics, Sessions |

The greeting uses `profile.display_name`. Streak remains visible in the global top bar.

---

## Data hooks

| Hook | Purpose |
|------|---------|
| `useProfile()` | display_name and total_sessions for greeting/empty-state logic |
| `useDailySummary(today)` | focus_minutes and session_count for the header and daily goal |
| `useGoals()` | daily_goal_minutes for the progress bar |
| `useSessionsPaginated(0)` | First page of sessions; sliced to 3 for the recent list |
| `useDailySummariesRange(weekStart, weekEnd)` | 7-day focus minutes for the mini bar chart |

---

## Loading states

While `useProfile()` is loading (`profileLoading === true`):

- **Greeting** — heading and supporting-line skeletons

---

## Empty states

### Brand-new user (`profile.total_sessions === 0`)

A full-width banner is shown above the two-column grid:

```
🎯  Welcome to Depthly
    Start your first focus session to begin tracking your productivity
```

The timer widget is still rendered so the user can start immediately.

### Recent sessions — no sessions yet

```
No sessions yet — start the timer to record your first session
```

---

## Session details and editing

`SessionRow` opens the shared `<SessionDetailModal>` when selected. Its Edit action opens
`<SessionModal>`, which can update project, task, title, and notes through the trusted
metadata RPC. Session timing is immutable, and the Home page does not offer deletion.

---

## Routes

| Path | Behaviour |
|------|-----------|
| `/` | Public `LandingPage` (marketing site, logged-out front door) |
| `/dashboard` | Renders `HomePage`, wrapped in `<ErrorBoundary>` (protected — see `ProtectedRoute`) |
| `/timer` | Renders `TimerPage` directly — full timer controls, separate from the `TimerWidget` embedded here |

**Why `/dashboard` and not `/home`:** the sidebar nav item and page component were renamed from "Dashboard"/`DashboardPage` to "Home"/`HomePage`, but `PATHS.home` already means `/` (the public landing page — see above), so a `/home` URL for this page would collide with that existing concept. The URL was deliberately left as `/dashboard`; only the display label, component name, and file name changed.

---

## Files

- `src/pages/HomePage.tsx` — page component
- `src/components/home/TimerWidget.tsx` — the embedded timer widget
- `src/components/ui/Skeleton.tsx` — loading skeleton primitives used here
- `src/components/ui/ProgressRing.tsx` — goal progress ring
- `src/components/sessions/SessionRow.tsx` — individual session rows
