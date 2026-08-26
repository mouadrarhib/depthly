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
7. [Database — trusted timer RPCs](#7-database--trusted-timer-rpcs)
8. [shadcn/ui Integration](#8-shadcnui-integration)
9. [Design Tokens Used](#9-design-tokens-used)
10. [Known Limitations / Future Work](#10-known-limitations--future-work)

---

## 1. Architecture Overview

```
AppLayout
├── useTimerEffects()        — active-run restore, wall-clock tick, completion,
│                               recovery notice, sounds, and phase transitions.
│                               Mounted once here (not per timer page) — see §4.
└── TimerStatusToast         — global recovery, save, and timer-action feedback

TimerPage
├── useSaveSession()         — TanStack Query mutation → trusted start, pause,
│                               resume, finish, and cancel timer RPCs
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

| Field               | Type                                       | Default      | Description                                                      |
| ------------------- | ------------------------------------------ | ------------ | ---------------------------------------------------------------- |
| `isRunning`         | `boolean`                                  | `false`      | Tick interval is active                                          |
| `isPaused`          | `boolean`                                  | `false`      | Session exists but frozen                                        |
| `mode`              | `'pomodoro' \| 'custom' \| 'free'`         | `'pomodoro'` | Current timer mode                                               |
| `sessionType`       | `'focus' \| 'break'`                       | `'focus'`    | Whether counting focus or break                                  |
| `elapsed`           | `number`                                   | `0`          | Seconds elapsed in current phase                                 |
| `duration`          | `number`                                   | `1500`       | Target duration in seconds (0 in free mode)                      |
| `clockBaseElapsed`  | `number`                                   | `0`          | Server-confirmed accumulated seconds at the current clock anchor |
| `clockStartedAt`    | `number \| null`                           | `null`       | Millisecond wall-clock anchor for the running segment            |
| `pomodoroPreset`    | `'25/5' \| '50/10' \| '90/20' \| 'custom'` | `'25/5'`     | Active preset                                                    |
| `focusDuration`     | `number`                                   | `1500`       | Focus phase length in seconds                                    |
| `breakDuration`     | `number`                                   | `300`        | Break phase length in seconds                                    |
| `sessionCount`      | `number`                                   | `0`          | Focus sessions completed today (UI only, not persisted)          |
| `selectedProjectId` | `string \| null`                           | `null`       | Linked project UUID                                              |
| `selectedTaskId`    | `string \| null`                           | `null`       | Linked task UUID                                                 |
| `autoStartBreak`    | `boolean`                                  | `false`      | Currently unused — break always auto-starts                      |
| `autoStartFocus`    | `boolean`                                  | `false`      | If true, next focus starts automatically after break ends        |

### Presets

```ts
const PRESETS = {
  '25/5': { focus: 1500, break: 300 },
  '50/10': { focus: 3000, break: 600 },
  '90/20': { focus: 5400, break: 1200 },
  custom: { focus: 1500, break: 300 }, // user-editable via Stepper
}
```

### Actions

| Action                   | What it does                                                                                                                                                                                                           |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `start()`                | Sets `isRunning: true, elapsed: 0, sessionType: 'focus'`                                                                                                                                                               |
| `pause()`                | Sets `isRunning: false, isPaused: true`                                                                                                                                                                                |
| `resume()`               | Sets `isRunning: true, isPaused: false`                                                                                                                                                                                |
| `stop()`                 | Resets to idle in focus mode: `isRunning: false, isPaused: false, elapsed: 0, sessionType: 'focus', duration: focusDuration` (duration restore added — previously left over the break's duration if stopped mid-break) |
| `reset()`                | Same as stop but keeps `sessionType` and `duration` unchanged (used internally after save)                                                                                                                             |
| `startBreak()`           | Called by `useSaveSession.onSuccess` — sets `sessionType: 'break', elapsed: 0, duration: breakDuration, isRunning: true` (always auto-starts)                                                                          |
| `endBreak()`             | Called by `useTimerEffects` when break completes — sets `sessionType: 'focus', elapsed: 0, duration: focusDuration, isRunning: autoStartFocus`                                                                         |
| `skipBreak()`            | Immediately goes idle in focus mode — same as `stop()` but called from the Skip Break button                                                                                                                           |
| `tick()`                 | Recomputes `elapsed = clockBaseElapsed + (Date.now() - clockStartedAt)`; interval throttling cannot cause drift                                                                                                        |
| `setMode(mode)`          | Stops and resets; sets `duration: 0` for free mode                                                                                                                                                                     |
| `setPreset(preset)`      | Stops and resets; updates both durations from PRESETS                                                                                                                                                                  |
| `setSelectedProject(id)` | Sets project; clears task                                                                                                                                                                                              |
| `setSelectedTask(id)`    | Sets task                                                                                                                                                                                                              |
| `setAutoStartBreak(val)` | Toggles auto-start break preference                                                                                                                                                                                    |
| `setAutoStartFocus(val)` | Toggles auto-start focus preference                                                                                                                                                                                    |

### Duration stepper pattern

Focus/break duration steppers do NOT use store actions. They write directly:

```ts
useTimerStore.setState((s) => ({
  focusDuration: val * 60,
  // also update live duration if we're in the matching phase and not running
  ...(!s.isRunning && s.sessionType === 'focus' ? { duration: val * 60 } : {}),
}))
```

Mode, preset, and duration controls are disabled for both running and paused server runs. This prevents local targets from diverging from `active_timer_runs.target_seconds`. Cross-tab settings rehydration is also ignored while an active run exists.

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

Runs all timer side effects. Called **once, globally, from `AppLayout`** — not per timer page. It also owns the single initial `active_timer_runs` query, restores the server-authoritative run, and shows a recovery notice explaining that a running timer continued while the app was closed (or that a paused timer was restored).

| Effect             | Trigger                                             | What it does                                                                                                                                                                                   |
| ------------------ | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tab title          | `isRunning, elapsed, sessionType`                   | Shows `MM:SS — Focus \| Depthly` when running, `Depthly` when idle                                                                                                                             |
| Guard reset        | `elapsed === 0`                                     | Resets `focusDoneRef` and `breakDoneRef` so sounds/transitions fire again on the next session                                                                                                  |
| Focus completion   | `sessionType=focus, elapsed >= duration, isRunning` | Fires once per session: plays A5 beep (880 Hz, 0.6s), then calls `saveSession()`. The trusted finish RPC saves server-calculated time before the mutation transitions into break.              |
| Break completion   | `sessionType=break, elapsed >= duration, isRunning` | Fires once per break: plays softer E5 beep (660 Hz, 0.4s), then calls the same `saveSession()` finish path. The saved break is followed by the configured next-focus transition.               |
| Active-run restore | Authenticated app load                              | Fetches the user's `active_timer_runs` row once, restores it, and explains recovered elapsed/remaining time through the global `TimerStatusToast`                                              |
| Tick interval      | `isRunning && !isPaused`                            | Calls `tick()` every second; `tick()` derives elapsed time from the wall-clock anchor rather than incrementing by one, so background throttling and device sleep cannot make the display drift |

Sound is produced via the Web Audio API (no audio files):

```ts
function playBeep(freq = 880, duration = 0.6) {
  const ctx = new AudioContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.25, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  osc.start()
  osc.stop(ctx.currentTime + duration)
  osc.onended = () => ctx.close()
}
```

### useSaveSession

**File:** `src/hooks/useSaveSession.ts`

TanStack Query mutation wrapping the trusted timer lifecycle RPCs from migration 015:

```ts
const { start, pause, resume, saveSession, saveAndStop, skipBreak, isSaving } = useSaveSession()
```

- **Start** calls `start_timer_run()` with the selected phase, target, timezone, project, task, title, and notes. The returned row supplies the authoritative start timestamp.
- **Pause / Resume** call `pause_timer_run()` and `resume_timer_run()`. Each response replaces local elapsed/anchor state with the server values.
- **Natural completion / Stop** call `finish_timer_run()`. Postgres calculates the final duration from accumulated server segments, saves the session, updates aggregates, and deletes the active run atomically.
- **Cancel / short session** calls `cancel_timer_run()` and clears the active run without saving.
- **Skip break** cancels a running or paused break through `cancel_timer_run()`. If auto-start is disabled and the break is only waiting locally, it returns directly to the idle focus phase without making an unnecessary RPC.
- Errors are surfaced through the global timer status toast. Successful completion invalidates sessions, analytics, profiles, goals, projects, tasks, and leaderboard caches.
- The active-run query is intentionally not inside this hook. `useTimerEffects()` owns restoration once at the stable `AppLayout` boundary, preventing duplicate restore effects from TimerPage, TimerWidget, and fullscreen controls.
- `TimerPage` lets `TimerControls` own its own Stop mutation, so the same mutation that sends Stop also disables the button. Countdown controls are disabled once elapsed reaches the target while the natural finish RPC is pending.

---

## 5. Components

### ProgressRing

**File:** `src/components/ui/ProgressRing.tsx`

SVG stroke ring. Renders around the countdown timer.

| Prop          | Type        | Default              | Notes                         |
| ------------- | ----------- | -------------------- | ----------------------------- |
| `progress`    | `number`    | —                    | 0–1, clamped                  |
| `size`        | `number`    | `340`                | px, sets SVG width/height     |
| `strokeWidth` | `number`    | `6`                  | px                            |
| `color`       | `string`    | `var(--color-brand)` | Progress arc color            |
| `isRunning`   | `boolean`   | `false`              | Enables blue glow drop-shadow |
| `children`    | `ReactNode` | —                    | Centered inside the ring      |

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

| State                            | Buttons shown                                                                                                |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Idle (`!isRunning && !isPaused`) | **Start Focus Session** (220×52px, blue-glass), or **Start Break** + **Skip Break** while a break is waiting |
| Paused                           | **Resume** (blue-glass) + **Stop** (red-tint) + **Skip Break** (break only)                                  |
| Running                          | **Pause** (neutral chip) + **Stop** (red-tint) + **Skip Break** (neutral chip, break only)                   |

The same break-only skip action is rendered by the Dashboard `TimerWidget`; `TimerFullscreen` inherits it through `TimerControls`.

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

| Section         | Component            | Notes                                                                                |
| --------------- | -------------------- | ------------------------------------------------------------------------------------ |
| Timer Type      | TypePills (custom)   | Switches between Timer / Free modes                                                  |
| Focus Duration  | Stepper              | 1–240 min. Updates `focusDuration` and live `duration` if not running in focus phase |
| Break Duration  | Stepper              | 1–60 min. Hidden in free mode. Updates `breakDuration`                               |
| Auto-start      | Switch (shadcn)      | Auto-start Break / Auto-start Focus toggles                                          |
| Presets         | Pill buttons         | 25/5, 50/10, 90/20, Custom — Pomodoro mode only                                      |
| Session Preview | Custom bar           | Visual ratio of focus/break duration                                                 |
| Project & Task  | TimerProjectSelector | Native `<select>` elements                                                           |

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
  value: number
  min: number
  max: number
  onChange: (val: number) => void
}
```

Value displayed in `font-data` (JetBrains Mono), `min-width: 48px` centered.  
Buttons disabled at min/max boundaries.

---

## 6. Pages

### TimerPage

**File:** `src/pages/TimerPage.tsx`

Root of the timer feature. It composes the mode selector, phase selector, display, controls, settings, notes/todo panels, and fullscreen view. Natural completion and restore logic intentionally live in the single global `useTimerEffects()` instance rather than this route component.

`TimerControls` owns its Start/Pause/Resume/Stop mutation. The route does not create a second Stop mutation, ensuring that the button's pending state matches the request it triggered.

**SessionDots:** Two 8px circles, brand-colored when active, `surface-overlay` when inactive. Hidden in free mode.

**BottomActionRow:** Configure, Fullscreen, Log, and Todo.

---

## 7. Database — trusted timer RPCs

**File:** `supabase/migrations/015_trusted_sessions.sql`

`active_timer_runs` stores one authenticated run per user. PostgreSQL timestamps each running segment, so closing localhost, refreshing, backgrounding the browser, or switching devices does not lose or pause elapsed time.

The client uses these `SECURITY DEFINER` RPCs:

- `start_timer_run()` creates the running row with a server timestamp.
- `pause_timer_run()` adds `now() - segment_started_at` to `accumulated_seconds` and clears the segment timestamp.
- `resume_timer_run()` starts a new server-timestamped segment.
- `cancel_timer_run()` deletes the active row without saving a session.
- `finish_timer_run()` calculates the final duration, inserts the immutable session, updates focus aggregates atomically, and deletes the run.
- `update_session_metadata()` changes only title, notes, project, and task after saving.

Direct authenticated session inserts and the legacy `save_session()` path are revoked. Realtime publication from migration 016 synchronizes changes across open tabs/devices.

**To deploy:** Apply migrations through `020_count_all_sessions.sql` in order.

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

| Token                     | Value     | Used in                                        |
| ------------------------- | --------- | ---------------------------------------------- |
| `--color-brand`           | `#4B9EFF` | Ring progress arc, active states, brand accent |
| `--color-surface-base`    | `#0D0D10` | Fullscreen overlay background                  |
| `--color-surface-raised`  | `#141417` | Settings panel background                      |
| `--color-surface-overlay` | `#222228` | Mode selector background, stepper background   |
| `--color-border`          | `#2E2E38` | Settings panel border, stepper border          |
| `--color-text`            | `#E8E6F0` | Countdown display, headings                    |
| `--color-text-muted`      | `#7A7890` | Phase label, secondary text                    |
| `--color-text-faint`      | `#3D3B4E` | Session count, disabled states                 |

Timer-specific:

- Ring glow: `drop-shadow(0 0 20px #4B9EFF50)` when running
- Start/Resume button wash: `rgba(75, 158, 255, 0.08–0.14)` range
- Stop button wash: `rgba(242, 92, 92, 0.06–0.13)` range

Font rule: all countdown times and duration values use `.font-data` → JetBrains Mono.

---

## 10. Known Limitations / Future Work

`start_timer_run` is the authoritative Free-plan session gate. It counts focus
sessions in the run's IANA timezone and rejects the 51st completed focus
session in that local month. Breaks do not count. Once a run starts, it may
finish even if the account changes plan or crosses a calendar boundary.

| Item                         | Notes                                                                                                                                                                 |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `timer_mode_type` enum       | DB enum is `('pomodoro', 'free')` — `'custom'` mode is coerced to `'pomodoro'` at the RPC level                                                                       |
| Settings not persisted to DB | Timer preferences (focus/break duration, auto-start flags) live only in Zustand — they reset if the user clears localStorage. Should sync to `user_preferences` table |
| `sessionCount` is UI-only    | The "N sessions today" counter increments in memory and resets on page refresh. Should be seeded from the DB on load                                                  |
