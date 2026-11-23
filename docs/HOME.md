# Home

The Home page (`/dashboard` — see the "Routes" note below on why the URL
wasn't renamed to match) is the first screen users see after login.
(The root `/` serves the public marketing landing page — see LANDING.md.)
It combines the focus timer with today's Planner tasks, progress, recent activity, and quick navigation.

---

## Layout

Two-column responsive grid (`lg:grid-cols-[1.7fr_0.87fr]`).
Single column below large screens. Cards form three aligned desktop rows: timer / today's plan, recent sessions / daily goal, and Keep moving / weekly focus.

### Dashboard sections

| Section | Component(s) | Data source |
|---------|-------------|-------------|
| Timer workspace | `<TimerWidget />` offers the next open task from today's plan, with a manual selector and existing timer controls | `timerStore`, `useSaveSession`, Planner task queries |
| Today's plan | `<TodayPlanCard />` shows three dated tasks, completion controls, the latest missed task, and a small coming-up area when today has one task | `usePlannerTasks`, `useTaskOccurrences`, task mutations |
| Recent sessions list | `<SessionRow />` × 3 | `useSessionsPaginated(0)` |

**Header activity summary**

- **Focus today** — `focus_minutes` from `daily_summaries`
- **Sessions today** — `session_count` from `daily_summaries`

### Progress and destinations

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
| `usePlannerTasks()` / `useTaskOccurrences()` | Today's one-off and repeated tasks, plus their per-day states |

---

Today's plan can select a task for the timer. The timer does not replace the task of a running or paused session. With no manual selection, starting focus from the timer uses the first open task in today's plan. A task can be marked complete in the dashboard; repeat completion affects only today. A failed plan query leaves the rest of Home usable.

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

### Today's plan — no tasks yet

The card links to Planner and explains that the user can add a task or choose one from a project.

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
- `src/components/home/TodayPlanCard.tsx` — today's task preview and completion controls
- `src/components/ui/Skeleton.tsx` — loading skeleton primitives used here
- `src/components/ui/ProgressRing.tsx` — goal progress ring
- `src/components/sessions/SessionRow.tsx` — individual session rows


### App navigation refresh

The shared sidebar groups Home, Timer, Projects and Planner under Workspace, with Sessions, Analytics and Leaderboard under Review & connect. Billing and Settings stay in the footer. The account dropdown is anchored to the sidebar profile row and contains Settings and Sign out; the duplicate topbar avatar has been removed. Desktop collapse retains labeled tooltips, while mobile keeps full labels in its drawer. Navigation scrolls independently on short screens.

The shared 72px header displays the current page, today’s focus statistics and guide replay menu. Small screens retain the page title, focus time and help; wider screens show streak and session counts. Sidebar and content-offset transitions respect reduced-motion preference.
