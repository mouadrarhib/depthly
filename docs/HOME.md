# Home

The Home page (`/dashboard` — see the "Routes" note below on why the URL
wasn't renamed to match) is the first screen users see after login.
(The root `/` serves the public marketing landing page — see LANDING.md.)
It combines the focus timer with an at-a-glance view of today's
stats, recent activity, and quick navigation.

---

## Layout

Two-column responsive grid (`lg:grid-cols-[3fr_2fr]`).
Single column on mobile.

### Left column — 60 %

| Section | Component(s) | Data source |
|---------|-------------|-------------|
| Timer widget | `<TimerWidget />` (`src/components/home/TimerWidget.tsx`) in a `depth-surface` card | `timerStore`, `useSaveSession` |
| Today's stats row | 3 inline stat cards | `useDailySummary(today)`, `useGoals()` |
| Recent sessions list | `<SessionRow />` × 5 | `useSessionsPaginated(0)` |

**Today's stats cards**

- **Focus Today** — `formatMinutesToHours(focus_minutes)` from `daily_summaries`
- **Sessions Today** — `session_count` from `daily_summaries`
- **Daily Goal** — `<ProgressRing>` (goal %) or "—  Set goal →" link when no goal set

### Right column — 40 %

| Section | Data source |
|---------|-------------|
| Greeting card | `profile.display_name` from `useProfile()` |
| Streak card | `profile.current_streak`, `profile.longest_streak` |
| This Week mini chart | `useDailySummariesRange(weekStart, weekEnd)` — 7-bar Recharts `BarChart`, today highlighted brand-blue |
| Quick links grid | Static links: Analytics, Leaderboard, Projects, Sessions |

---

## Data hooks

| Hook | Purpose |
|------|---------|
| `useProfile()` | display_name, streak, total_sessions for welcome/empty-state logic |
| `useDailySummary(today)` | focus_minutes, session_count for today's stat cards |
| `useGoals()` | daily_goal_minutes for the goal progress ring |
| `useSessionsPaginated(0)` | First page of sessions; sliced to 5 for the recent list |
| `useDailySummariesRange(weekStart, weekEnd)` | 7-day focus minutes for the mini bar chart |

---

## Loading states

While `useProfile()` is loading (`profileLoading === true`):

- **Greeting card** — `<Skeleton width={200} height={28} />`
- **Streak card** — `<Skeleton width={60} height={60} borderRadius="50%" />` + two line skeletons
- **Stats cards row** — 3 skeleton cards (icon + value + label placeholders)

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
