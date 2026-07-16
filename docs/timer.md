# Timer — Complete Implementation Reference

Everything built for the Depthly focus timer, in one place.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [State — timerStore](#2-state--timerstore)
3. [State — uiStore additions](#3-state--uistore-additions)
4. [Hooks](#4-hooks)
5. [Components](#5-components)
6. [Pages](#6-pages)
7. [Database — save_session RPC](#7-database--save_session-rpc)
8. [shadcn/ui Integration](#8-shadcnui-integration)
9. [Design Tokens Used](#9-design-tokens-used)
10. [Known Limitations / Future Work](#10-known-limitations--future-work)

---

## 1. Architecture Overview

```
TimerPage
├── useTimerEffects()        — side effects: tab title, beep sounds, tick interval
├── useSaveSession()         — TanStack Query mutation → Supabase save_session RPC
│
├── TimerModeSelector        — shadcn Tabs: Pomodoro / Custom / Free
├── SessionDots              — 2 dots showing focus ● / break ○ position
├── TimerDisplay             — ProgressRing + countdown + label
│   └── ProgressRing         — SVG stroke ring (340px, 6px stroke)
├── TimerControls            — Start / Pause / Resume / Stop / Skip Break buttons
├── BottomActionRow          — Configure / Fullscreen / Log (soon) / Todo (soon)
│
├── TimerSettings            — shadcn Sheet (slides in from right, no overlay)
│   ├── TypePills            — Timer / Free switcher
│   ├── Stepper              — [ − ] N [ + ] for focus/break duration
│   ├── Switch (shadcn)      — Auto-start toggles
│   ├── Preset pills         — 25/5, 50/10, 90/20, Custom (Pomodoro mode only)
│   ├── Session Preview bar  — visual focus/break ratio
│   └── TimerProjectSelector — native <select> for project + task
│
└── TimerFullscreen          — native OS fullscreen overlay (z-50)
    ├── TimerDisplay
    └── TimerControls
```

**State flow:** `timerStore` (Zustand) holds all timer state. Components dispatch actions; they never hold logic themselves. Server data (projects, tasks) comes from TanStack Query. UI-only state (settings panel open, fullscreen) lives in `uiStore`.

---

## 2. State — timerStore

**File:** `src/store/timerStore.ts`

### State shape

| Field | Type | Default | Description |
|---|---|---|---|
| `isRunning` | `boolean` | `false` | Tick interval is active |
| `isPaused` | `boolean` | `false` | Session exists but frozen |
| `mode` | `'pomodoro' \| 'custom' \| 'free'` | `'pomodoro'` | Current timer mode |
| `sessionType` | `'focus' \| 'break'` | `'focus'` | Whether counting focus or break |
| `elapsed` | `number` | `0` | Seconds elapsed in current phase |
| `duration` | `number` | `1500` | Target duration in seconds (0 in free mode) |
| `pomodoroPreset` | `'25/5' \| '50/10' \| '90/20' \| 'custom'` | `'25/5'` | Active preset |
| `focusDuration` | `number` | `1500` | Focus phase length in seconds |
| `breakDuration` | `number` | `300` | Break phase length in seconds |
| `sessionCount` | `number` | `0` | Focus sessions completed today (UI only, not persisted) |
| `selectedProjectId` | `string \| null` | `null` | Linked project UUID |
| `selectedTaskId` | `string \| null` | `null` | Linked task UUID |
| `autoStartBreak` | `boolean` | `false` | Currently unused — break always auto-starts |
| `autoStartFocus` | `boolean` | `false` | If true, next focus starts automatically after break ends |

### Presets

```ts
const PRESETS = {
  '25/5':   { focus: 1500,  break: 300  },
  '50/10':  { focus: 3000,  break: 600  },
  '90/20':  { focus: 5400,  break: 1200 },
  'custom': { focus: 1500,  break: 300  }, // user-editable via Stepper
}
```

### Actions

| Action | What it does |
|---|---|
| `start()` | Sets `isRunning: true, elapsed: 0, sessionType: 'focus'` |
| `pause()` | Sets `isRunning: false, isPaused: true` |
| `resume()` | Sets `isRunning: true, isPaused: false` |
| `stop()` | Resets to idle in focus mode: `isRunning: false, isPaused: false, elapsed: 0, sessionType: 'focus'` |
| `reset()` | Same as stop but keeps `sessionType` and `duration` unchanged (used internally after save) |
| `startBreak()` | Called by `useSaveSession.onSuccess` — sets `sessionType: 'break', elapsed: 0, duration: breakDuration, isRunning: true` (always auto-starts) |
| `endBreak()` | Called by `useTimerEffects` when break completes — sets `sessionType: 'focus', elapsed: 0, duration: focusDuration, isRunning: autoStartFocus` |
| `skipBreak()` | Immediately goes idle in focus mode — same as `stop()` but called from the Skip Break button |
| `tick()` | Increments `elapsed` by 1. Called every second by `useTimerEffects` |
| `setMode(mode)` | Stops and resets; sets `duration: 0` for free mode |
| `setPreset(preset)` | Stops and resets; updates both durations from PRESETS |
| `setSelectedProject(id)` | Sets project; clears task |
| `setSelectedTask(id)` | Sets task |
| `setAutoStartBreak(val)` | Toggles auto-start break preference |
| `setAutoStartFocus(val)` | Toggles auto-start focus preference |

### Duration stepper pattern

Focus/break duration steppers do NOT use store actions. They write directly:

```ts
useTimerStore.setState((s) => ({
  focusDuration: val * 60,
  // also update live duration if we're in the matching phase and not running
  ...(!s.isRunning && s.sessionType === 'focus' ? { duration: val * 60 } : {}),
}))
```

---

## 3. State — uiStore additions

**File:** `src/store/uiStore.ts`

Two fields were added for the timer:

```ts
isFullscreen:     boolean        // native OS fullscreen active
toggleFullscreen: () => void

isSettingsOpen:   boolean        // settings panel visible
toggleSettings:   () => void
```

Both are persisted to localStorage via `persist` middleware under the key `'ui-preferences'`.

---

## 4. Hooks

### useTimerEffects

**File:** `src/hooks/useTimerEffects.ts`

Runs all timer side effects. Called once at the top of `TimerPage`.

| Effect | Trigger | What it does |
|---|---|---|
| Tab title | `isRunning, elapsed, sessionType` | Shows `MM:SS — Focus \| Depthly` when running, `Depthly` when idle |
| Guard reset | `elapsed === 0` | Resets `focusDoneRef` and `breakDoneRef` so sounds/transitions fire again on the next session |
| Focus completion | `sessionType=focus, elapsed >= duration, isRunning` | Fires once per session: plays A5 beep (880 Hz, 0.6s). Actual save + break transition handled in `TimerPage` + `useSaveSession` |
| Break completion | `sessionType=break, elapsed >= duration, isRunning` | Fires once per break: plays softer E5 beep (660 Hz, 0.4s), then calls `useTimerStore.getState().endBreak()` |
| Tick interval | `isRunning && !isPaused` | `setInterval(tick, 1000)` — cleared on pause/stop |

Sound is produced via the Web Audio API (no audio files):

```ts
function playBeep(freq = 880, duration = 0.6) {
  const ctx  = new AudioContext()
  const osc  = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.25, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  osc.start(); osc.stop(ctx.currentTime + duration)
  osc.onended = () => ctx.close()
}
```

### useSaveSession

**File:** `src/hooks/useSaveSession.ts`

TanStack Query mutation wrapping the `save_session` Supabase RPC.

```ts
const { saveSession, isSaving } = useSaveSession()
```

**On success:**
1. Invalidates `['sessions']`, `['daily-summaries']`, `['user-stats']`, `['profile']` query keys
2. Calls `useTimerStore.getState().startBreak()` — triggers break phase
3. Increments `sessionCount` in the store (UI-only counter for "N sessions today")

**Payload sent to RPC:**

| Field | Source |
|---|---|
| `p_user_id` | `authStore.user.id` |
| `p_project_id` | `timerStore.selectedProjectId` |
| `p_task_id` | `timerStore.selectedTaskId` |
| `p_type` | `timerStore.sessionType` (always `'focus'` at save time) |
| `p_duration_mins` | `Math.round(elapsed / 60)` |
| `p_started_at` | `new Date(now - elapsed * 1000).toISOString()` |
| `p_ended_at` | `new Date().toISOString()` |
| `p_timer_mode` | `timerStore.mode` |
| `p_notes` | `null` |
| `p_local_date` | `formatPeriodKey(now, 'daily')` — client's local `YYYY-MM-DD`, used by the RPC for `daily_summaries`/streak bookkeeping instead of deriving the date from `p_started_at` in UTC |

State is read from `useTimerStore.getState()` at call time (not from stale render values).

---

## 5. Components

### ProgressRing

**File:** `src/components/ui/ProgressRing.tsx`

SVG stroke ring. Renders around the countdown timer.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `progress` | `number` | — | 0–1, clamped |
| `size` | `number` | `340` | px, sets SVG width/height |
| `strokeWidth` | `number` | `6` | px |
| `color` | `string` | `var(--color-brand)` | Progress arc color |
| `isRunning` | `boolean` | `false` | Enables blue glow drop-shadow |
| `children` | `ReactNode` | — | Centered inside the ring |

Ring geometry: `center = size / 2`, `radius = center - strokeWidth / 2`.  
Track color: `var(--color-surface-overlay)`.  
Progress arc: `stroke-dashoffset` animated with `1s linear` transition.  
Glow: `drop-shadow(0 0 20px #4B9EFF50)` when `isRunning`.

---

### TimerDisplay

**File:** `src/components/timer/TimerDisplay.tsx`

Renders inside `ProgressRing`. Shows countdown, phase label, session count.

- **Countdown font:** `font-data` (JetBrains Mono), `72px` weight 600, `48px` in free mode
- **Phase label:** `FOCUS` or `BREAK`, 11px uppercase, `0.15em` letter spacing, `ink-secondary`
- **Session count:** `N sessions today`, 12px, `ink-faint`
- **Progress:** `elapsed / duration` (0 for free mode)
- **Remaining time:** `duration - elapsed` for countdown modes, `elapsed` for free (counts up)

---

### TimerControls

**File:** `src/components/timer/TimerControls.tsx`

Renders different button sets based on state. Uses plain `<button>` elements with inline styles — no shadcn Button wrapper (to avoid Radix Slot issues with the spinner child).

| State | Buttons shown |
|---|---|
| Idle (`!isRunning && !isPaused`) | **Start Focus Session** (220×52px, blue-glass) |
| Paused | **Resume** (blue-glass) + **Stop** (red-tint) |
| Running | **Pause** (neutral chip) + **Stop** (red-tint) + **Skip Break** (neutral chip, break only) |

**Button visual styles (not using Tailwind variants — inline styles for color precision):**

- **Primary / blue-glass** (Start, Resume): `background: rgba(75,158,255,0.08)`, `border: rgba(75,158,255,0.22)`, `color: #B8D4FF`. Hover: deeper wash + soft outer glow.
- **Neutral chip** (Pause, Skip Break): `background: rgba(255,255,255,0.04)`, `border: rgba(255,255,255,0.09)`, `color: #7A7890`.
- **Red-tint** (Stop): `background: rgba(242,92,92,0.06)`, `border: rgba(242,92,92,0.18)`, `color: #E07878`.

All buttons: `h-48px`, `rounded-[12px]`, `min-w-[120px]`. Start button: `w-[220px] h-[52px] rounded-[14px]`.

---

### TimerModeSelector

**File:** `src/components/timer/TimerModeSelector.tsx`

Tabs component (shadcn `Tabs / TabsList / TabsTrigger`) styled as pills.

- Three modes: **Pomodoro**, **Custom**, **Free**
- Disabled while `isRunning` (changing mode stops the current session)
- `TabsList`: `background: var(--color-surface-overlay)`, `rounded-full`, `p-1`
- Active `TabsTrigger`: `bg: var(--color-surface-raised)`, `color: var(--color-brand)`, `border: rgba(75,158,255,0.3)`
- Inactive: transparent, `color: var(--color-text-faint)`

On mode change: calls `stop()` then `setMode(newMode)`.

---

### TimerSettings

**File:** `src/components/timer/TimerSettings.tsx`

Sliding panel from the right, controlled by `uiStore.isSettingsOpen`.

**Implementation:** Uses `Sheet` (shadcn, which is Radix Dialog.Root) + a custom `SettingsPanelContent` component built from `SheetPortal + @radix-ui/react-dialog Content` directly — no `SheetOverlay` so the timer remains visible behind the panel.

Positioned at `top: 56px` (below the 14px/56px topbar), `right: 0`, `bottom: 0`, `width: 300px`.  
Animation: `slide-in-from-right / slide-out-to-right`, `duration-300` (via tailwindcss-animate).

**Sections:**

| Section | Component | Notes |
|---|---|---|
| Timer Type | TypePills (custom) | Switches between Timer / Free modes |
| Focus Duration | Stepper | 1–240 min. Updates `focusDuration` and live `duration` if not running in focus phase |
| Break Duration | Stepper | 1–60 min. Hidden in free mode. Updates `breakDuration` |
| Auto-start | Switch (shadcn) | Auto-start Break / Auto-start Focus toggles |
| Presets | Pill buttons | 25/5, 50/10, 90/20, Custom — Pomodoro mode only |
| Session Preview | Custom bar | Visual ratio of focus/break duration |
| Project & Task | TimerProjectSelector | Native `<select>` elements |

---

### TimerProjectSelector

**File:** `src/components/timer/TimerProjectSelector.tsx`

Two stacked native `<select>` elements for project and task.

- Projects fetched via `useQuery(projectKeys.active, fetchActiveProjects)` — same cache key as fullscreen overlay (no duplicate network calls)
- Tasks fetched via `useQuery(taskKeys.byProject(selectedProjectId), ...)` — only enabled when a project is selected
- Task selector: `opacity: 0.45, pointerEvents: none` when no project selected
- Selecting a project clears the task (`setSelectedTask(null)`)
- Custom chevron `▾` positioned absolutely, `pointerEvents: none`

---

### TimerFullscreen

**File:** `src/components/timer/TimerFullscreen.tsx`

Native OS fullscreen overlay.

**How it works:**
- Clicking **Fullscreen** in `BottomActionRow` calls `document.documentElement.requestFullscreen()` AND sets `uiStore.isFullscreen: true`
- The overlay (`fixed inset-0 z-50`) renders `TimerDisplay + TimerControls` centered on the deep-bg
- `fullscreenchange` event listener syncs the store when the user presses **Escape** or uses browser controls — prevents the store from being out of sync with native fullscreen state
- **Exit fullscreen** button calls `document.exitFullscreen()` which fires `fullscreenchange`, which toggles the store
- Shows project/task name above the ring if one is selected

---

### Stepper

**File:** `src/components/ui/Stepper.tsx`

`[ − ] value [ + ]` number stepper for duration inputs.

```ts
interface StepperProps {
  value:    number
  min:      number
  max:      number
  onChange: (val: number) => void
}
```

Value displayed in `font-data` (JetBrains Mono), `min-width: 48px` centered.  
Buttons disabled at min/max boundaries.

---

## 6. Pages

### TimerPage

**File:** `src/pages/TimerPage.tsx`

Root of the timer feature. Wires all components and handles the session-save trigger.

**Session save guard:**

```ts
useEffect(() => {
  if (elapsed === 0) { savedRef.current = false; return }

  if (
    mode !== 'free'       &&
    sessionType === 'focus' &&   // only focus sessions are saved
    duration > 0          &&
    isRunning             &&
    elapsed >= duration   &&
    !savedRef.current
  ) {
    savedRef.current = true
    saveSession()
  }
}, [elapsed, duration, mode, sessionType, isRunning, saveSession])
```

`savedRef` prevents double-saves when `elapsed` continues ticking past `duration` while the async save is in flight.

**SessionDots:** Two 8px circles, brand-colored when active, `surface-overlay` when inactive. Hidden in free mode.

**BottomActionRow:** Configure, Fullscreen, Log (disabled), Todo (disabled).

---

## 7. Database — save_session RPC

**File:** `supabase/migrations/002_save_session_rpc.sql`, superseded by `supabase/migrations/006_save_session_local_date.sql`

`SECURITY DEFINER` function — runs with owner privileges so it can write to `daily_summaries` and `user_stats` (which have no client INSERT policies).

**Signature:**

```sql
create or replace function public.save_session(
  p_user_id       uuid,
  p_project_id    uuid,
  p_task_id       uuid,
  p_type          session_type,       -- 'focus' | 'break'
  p_duration_mins integer,
  p_started_at    timestamptz,
  p_ended_at      timestamptz,
  p_timer_mode    text,               -- accepts 'pomodoro' | 'custom' | 'free'
  p_notes         text,
  p_local_date    date                -- client's local YYYY-MM-DD (migration 006)
) returns public.sessions
```

`p_local_date` is supplied by the client instead of being derived from `p_started_at`. The original version computed the session's date as `(p_started_at at time zone 'UTC')::date`, which desynced from the client's "today" for any non-UTC timezone (evening sessions west of UTC could land on tomorrow's UTC date, silently vanishing from "today" stats until the next day).

**What it does atomically (focus sessions only — break sessions are stored but skipped for aggregates):**

1. Inserts row into `sessions` (`'custom'` mode is coerced to `'pomodoro'` for the enum column)
2. Upserts `daily_summaries` — adds `duration_mins` + increments `session_count`
3. Marks `daily_summaries.daily_goal_met = true` if `focus_minutes >= goals.daily_goal_minutes`
4. Upserts `user_stats` for all four periods:
   - `daily` → `YYYY-MM-DD`
   - `weekly` → `IYYY-WIW` (ISO week)
   - `monthly` → `YYYY-MM`
   - `yearly` → `YYYY`
5. Updates `profiles`:
   - `total_focus_minutes += p_duration_mins`
   - `total_sessions += 1`
   - `current_streak`: same day → no change; consecutive day → +1; gap → reset to 1
   - `longest_streak = max(longest_streak, current_streak)`
   - `last_focus_date = today`
6. Increments `tasks.actual_pomodoros` if `p_task_id` is not null

Returns the inserted `sessions` row.

**To deploy:** Run `002_save_session_rpc.sql` then `006_save_session_local_date.sql` in Supabase Dashboard → SQL Editor (both are `create or replace`, safe to run in order on a fresh DB; existing DBs only need 006).

---

## 8. shadcn/ui Integration

Installed in this session. Components live in `src/components/ui/` (lowercase filenames from shadcn, coexisting with uppercase Depthly components on case-insensitive Windows FS — they are the same physical files).

**Installed components:** `button`, `card`, `badge`, `dialog`, `dropdown-menu`, `select`, `separator`, `sheet`, `switch`, `tabs`, `tooltip`

**Additional packages added:** `tailwindcss-animate`, `class-variance-authority`, `lucide-react`

**`src/lib/utils.ts`** — shadcn's `cn()` helper (clsx + tailwind-merge). Our existing `src/lib/utils/cn.ts` is kept for legacy components.

**Button customizations** (on top of shadcn defaults):
- Added `isLoading?: boolean` prop — shows spinner, sets `disabled`
- Added `primary` variant alias → same as `default` (brand blue)
- Added `danger` variant alias → red-tint destructive
- Added `md` size alias → same as `default`

**`components.json`** — required for shadcn CLI. `aliases.utils` points to `@/lib/utils` (the new file). `tailwind.config` points to `tailwind.config.ts`.

**Key fix:** Root `tsconfig.json` must have `compilerOptions.paths: { "@/*": ["./src/*"] }` for shadcn CLI to resolve the alias — without this, shadcn creates a literal `@/` directory at project root.

---

## 9. Design Tokens Used

The timer uses CSS variables exclusively for colors (not Tailwind utility classes) to ensure consistency and avoid PostCSS `@apply` resolution issues.

| Token | Value | Used in |
|---|---|---|
| `--color-brand` | `#4B9EFF` | Ring progress arc, active states, brand accent |
| `--color-surface-base` | `#0D0D10` | Fullscreen overlay background |
| `--color-surface-raised` | `#141417` | Settings panel background |
| `--color-surface-overlay` | `#222228` | Mode selector background, stepper background |
| `--color-border` | `#2E2E38` | Settings panel border, stepper border |
| `--color-text` | `#E8E6F0` | Countdown display, headings |
| `--color-text-muted` | `#7A7890` | Phase label, secondary text |
| `--color-text-faint` | `#3D3B4E` | Session count, disabled states |

Timer-specific:
- Ring glow: `drop-shadow(0 0 20px #4B9EFF50)` when running
- Start/Resume button wash: `rgba(75, 158, 255, 0.08–0.14)` range
- Stop button wash: `rgba(242, 92, 92, 0.06–0.13)` range

Font rule: all countdown times and duration values use `.font-data` → JetBrains Mono.

---

## 10. Known Limitations / Future Work

| Item | Notes |
|---|---|
| `autoStartBreak` setting | Stored in `timerStore` and exposed in settings UI, but currently ignored — break always auto-starts after focus |
| Break sessions not saved | `save_session` is only called for focus sessions. Break rows are never inserted. This is intentional for now but analytics will miss break time |
| `timer_mode_type` enum | DB enum is `('pomodoro', 'free')` — `'custom'` mode is coerced to `'pomodoro'` at the RPC level |
| No error UI for failed saves | If `save_session` throws (network error, auth lapse), the error is silently swallowed. Should show a toast |
| Log / Todo buttons | In `BottomActionRow` — wired up as `disabled` placeholders for future manual session logging and task quick-add |
| Settings not persisted to DB | Timer preferences (focus/break duration, auto-start flags) live only in Zustand — they reset if the user clears localStorage. Should sync to `user_preferences` table |
| `sessionCount` is UI-only | The "N sessions today" counter increments in memory and resets on page refresh. Should be seeded from the DB on load |
