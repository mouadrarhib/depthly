# Analytics — Implementation Reference

## 1. Overview

The Analytics page (`/analytics`) gives users a retrospective view of their focus sessions across four time granularities: **daily**, **weekly**, **monthly**, and **yearly**.

### Data sources

All aggregated stats come from two tables:

- **`daily_summaries`** — one row per user per calendar day; fields: `date`, `focus_minutes`, `session_count`, `pomodoro_count`. Written atomically by the `save_session` RPC (SECURITY DEFINER). Never written from client code directly.
- **`profiles`** — all-time cumulative stats: `total_focus_minutes`, `total_sessions`, `current_streak`, `longest_streak`, `member_since`. Updated by the same RPC.
- **`sessions`** (raw) — queried only by DailyView to get per-project and per-hour breakdown. Includes a `projects` join to get name and color.
- **`user_stats`** — a `period_type` / `period_key` keyed table. Hooks and query functions exist for it, but **no current view renders data from it** (see §8).

### Timezone handling

`formatPeriodKey()` uses JavaScript local-date methods (`getFullYear()`, `getMonth()`, `getDate()`) rather than `toISOString()`. This ensures the period key reflects the user's local calendar day, not UTC.

`fetchSessionsForDay()` constructs local-midnight boundaries using `new Date(y, m-1, d)` (which respects the runtime's local timezone) and converts them to ISO strings for the Supabase query. A naïve UTC-midnight query would shift by the user's UTC offset and miss or misattribute sessions near midnight.

**Known remaining issue:** the `save_session` RPC stores `daily_summaries.date` as `(p_started_at at time zone 'UTC')::date`, so sessions logged after ~11 PM local time in UTC+ timezones may land on the wrong date row in `daily_summaries`. This affects WeeklyView/MonthlyView/YearlyView (which read from `daily_summaries`), but not DailyView's session-level query (which queries `sessions` with local-midnight boundaries). Fixing this requires changing the RPC and has not been done yet.

---

## 2. Pages & Routes

**Route:** `/analytics` → `src/pages/AnalyticsPage.tsx`

### Tab structure

Four tabs: `daily | weekly | monthly | yearly`. Implemented with shadcn `<Tabs>` / `<TabsList>` / `<TabsTrigger>`.

### Date state design

Each tab has **independent date state**:

```ts
const [dailyDate,   setDailyDate]   = useState(() => new Date())
const [weeklyDate,  setWeeklyDate]  = useState(() => new Date())
const [monthlyDate, setMonthlyDate] = useState(() => new Date())
const [yearlyDate,  setYearlyDate]  = useState(() => new Date())
```

This means navigating backward in the Weekly view does not reset the Daily view back to today when the user switches tabs. Each tab remembers where the user left it for the duration of the session.

`handleNavigate(d)` dispatches to the correct setter based on `activeTab`.

### Layout

```
<h1>Analytics</h1>
<AllTimeStatsBar />          ← always visible, above tabs
<Tabs />                     ← tab selector (centered)
<PeriodNavigator />          ← prev/next/jump-to-current (centered)
{activeTab === 'daily'   && <DailyView   date={dailyDate}   />}
{activeTab === 'weekly'  && <WeeklyView  date={weeklyDate}  />}
{activeTab === 'monthly' && <MonthlyView date={monthlyDate} />}
{activeTab === 'yearly'  && <YearlyView  date={yearlyDate}  />}
```

Max content width is `1100px`, centered with `margin: '0 auto'`.

---

## 3. Components

### `AllTimeStatsBar`
`src/components/analytics/AllTimeStatsBar.tsx`

| Prop | — |
|------|---|
| none | Reads data internally via `useProfile()` |

Renders a horizontal strip of 6 stat cells, separated by `1px solid #2E2E38` dividers. Each cell has an icon (lucide-react), a large `font-data` value, and an uppercase label.

| Cell | Icon | Value source |
|------|------|-------------|
| Total Focus | `Clock` | `profile.total_focus_minutes` via `formatMinutesToHours` |
| Sessions | `CheckCircle` | `profile.total_sessions` |
| Current Streak | `Flame` | `profile.current_streak` days — colored `#C8FF64` when > 0 |
| Longest Streak | `Trophy` | `profile.longest_streak` days |
| Avg per Day | `TrendingUp` | `total_focus_minutes / days_since_signup` via `computeAvgPerDay` |
| Member Since | `Calendar` | `profile.member_since` formatted as `"Jun 2025"` |

Shows animated skeleton cells (`bg-depth-raised animate-pulse`) while loading. The streak color `#C8FF64` is used here (only in the value span, not the icon background) — this is one of the two places that color appears; the other is `StreakBadge.tsx`.

---

### `PeriodNavigator`
`src/components/analytics/PeriodNavigator.tsx`

```ts
interface PeriodNavigatorProps {
  period:      'daily' | 'weekly' | 'monthly' | 'yearly'
  currentDate: Date
  onNavigate:  (date: Date) => void
}
```

Renders: `‹ [period label] ›` with an optional "Today / This week / This month / This year" jump link when not on the current period.

- Uses `getPeriodLabel(currentDate, period)` for the center label
- Uses `navigatePeriod(currentDate, period, 'prev' | 'next')` for arrow navigation
- Uses `isCurrentPeriod(currentDate, period)` to disable the "next" button and show/hide the jump link
- Jump link calls `onNavigate(new Date())`

---

### `DailyView`
`src/components/analytics/DailyView.tsx`

```ts
interface DailyViewProps {
  date: Date
}
```

**Layout:** two-column grid (`1fr 2fr`) on top, full-width timeline below.

**Left column** — two stacked stat cards:
- Focus Time: `summary.focus_minutes` formatted as hours
- Focus Sessions: `summary.session_count`

**Right column** — "Focus Time by Project" card:
- `PieChart` donut (180×180, innerRadius 55, outerRadius 80). Each slice = one project, colored by `entry.color` via `<Cell fill={entry.color}>`.
- Center label shows total focus time.
- Legend beside the donut: project name, formatted minutes, percentage.
- Empty state: `Tag` icon + "No focus sessions for this day." + link to timer.

**Timeline card** (full width):
- 24-slot `BarChart` (one bar per hour of day, 0–23). Bar color = the color of the project with the most focus time in that hour. Gray (`#222228`) if no sessions.
- Custom `TimelineTooltip`: shows hour (e.g. `"3p"`), project name, duration.
- Project color legend below the chart.

**Data building** (done in component, not in hook/query):
```ts
// From sessions array:
const h = new Date(s.started_at).getHours()   // local hour
hourSlots[h].minutes += s.duration_mins
// First project encountered in a slot wins the color:
if (hourSlots[h].color === '#222228' && s.projects) {
  hourSlots[h].color       = s.projects.color
  hourSlots[h].projectName = s.projects.name
}
```

---

### `WeeklyView`
`src/components/analytics/WeeklyView.tsx`

```ts
interface WeeklyViewProps {
  date: Date
}
```

**Layout:** two-column grid (`1fr 2fr`) on top, full-width bar chart below.

**Left column** — "Weekly Summary" card:
- Focus Time (large `font-data` number) + comparison line: "Previous week: Xh Ym" colored blue (↑) / red (↓) / gray (same).
- Sessions count.

**Right column** — "Focus by Project" card:
- Single-slice `PieChart` donut (160×160, innerRadius 50, outerRadius 75) in brand color (`#4B9EFF`) when data exists. Gray ring when no data for the week.
- **No per-project breakdown** — `useDailySummariesRange` does not return project-level data. Shows "Project breakdown available in the daily view." note.

**Bar chart** (full width):
- 7 bars, one per day (Mon–Sun).
- `maxBarSize={48}`, `radius={[6,6,0,0]}`.
- `LabelList` above each bar: formatted hours if > 0, empty string otherwise.
- Custom X-axis tick: two `<tspan>` lines — day name (e.g. "Mon") in blue for today, gray otherwise; date string (e.g. "Jun 29") below.
- Per-bar color via `<Cell>`: `#4B9EFF` for days with data; `#222228` for zero/future days. Today with data gets `filter: 'drop-shadow(0 0 6px rgba(75,158,255,0.6))'`.

**Data building:**
- Fetches current week and previous week via two `useDailySummariesRange` calls.
- Week start is always Monday (`getMonday(date)`).
- `chartData` entries have `isFuture` flag (key > todayKey); future days force `focus_minutes: 0`.

---

### `MonthlyView`
`src/components/analytics/MonthlyView.tsx`

```ts
interface MonthlyViewProps {
  date: Date
}
```

**Layout:** horizontal stats row, then full-width calendar heatmap card.

**Stats row** — two cards side by side:
- Card 1: total focus this month. Comparison line if previous month has data: `↑ Xh vs last month` (green) / `↓ Xh` (red) / `— Xh vs last month`.
- Card 2: session count this month.

**Calendar heatmap:**
- 7-column `repeat(7, 1fr)` CSS grid, Monday-first.
- Day-of-week header row: Mon Tue Wed Thu Fri Sat Sun.
- Leading blank cells calculated from `mondayCol(days[0].getDay())`.
- Each day = a `width: '100%', maxWidth: 64, aspectRatio: '1/1'` circle (border-radius 50%).
- Color via `getCellColor(minutes)` (see §5).
- Today gets a double ring: `boxShadow: '0 0 0 2px #4B9EFF, 0 0 0 4px #141417'`.
- Future days: `opacity: 0.35`.
- Number text: `#E8E6F0` for ≥60 min, `#7A7890` otherwise.
- Hover tooltip (shadcn `TooltipProvider`): "Jun 29 — 1h 45m" or "Jun 29 — No sessions".
- 5-dot intensity legend below grid.

---

### `YearlyView`
`src/components/analytics/YearlyView.tsx`

```ts
interface YearlyViewProps {
  date: Date
}
```

**Layout:** 3-stat row, then GitHub-style heatmap card.

**Stats row** — three cards:
- Total focus this year.
- Most productive month (computed from monthly aggregation): e.g. `"March — 14h 30m"` or `"—"`.
- Longest streak this year (computed from daily data).

**Heatmap:**
- Fixed-size cells: `CELL = 13px`, `GAP = 3px`, `STEP = 16px`.
- Weeks column (`getWeeksInYear(year)`) + overflow week if needed so Dec 31 is included.
- Layout: `display: 'grid', gridTemplateRows: 'repeat(7, 13px)', gridAutoFlow: 'column'`.
- Left column: day labels `['Mon', '', 'Wed', '', 'Fri', '', '']` (alternate rows only).
- Month labels above with sub-label showing total hours for that month.
- Cell color via `cellColor(minutes)` (see §5 — different thresholds than monthly).
- Today: `outline: '2px solid rgba(75,158,255,0.5)'`.
- Future cells: `opacity: 0.3`.
- Cells outside the selected year: `backgroundColor: 'transparent'`.
- Horizontal scroll: `overflowX: 'auto'` on the container.
- Tooltip (shadcn): "Jun 29 — 1h 45m" or "Jun 29 — No sessions".
- Legend: 5 dots (Less → More), right-aligned below grid.
- Footer line: "Xh logged in 2026" or "No sessions logged in 2026".

**In-component stats computed from raw summaries:**
- `computeLongestStreak` — filters days with `focus_minutes > 0`, sorts, counts max consecutive-day run.
- `getMostProductiveMonth` — sums minutes per month index, returns name + hours of the max.

---

## 4. Data Flow

### DailyView

```
date (Date)
  → formatPeriodKey(date, 'daily')       → "2026-06-29"
  → useDailySummary("2026-06-29")        → daily_summaries row (focus_minutes, session_count)
  → useSessionsForDay("2026-06-29")      → sessions[] with projects join

sessions[] is iterated in component:
  - projectMap: Map<project_id, { name, color, minutes }>  → pieData (sorted desc)
  - hourSlots[0..23]: { hour, minutes, color, projectName } → bar chart data
```

### WeeklyView

```
date (Date)
  → getMonday(date)                      → Monday of that week
  → getDaysInWeek(monday)                → [Mon, Tue, ..., Sun] (7 Date objects)
  → formatPeriodKey(days[0], 'daily')    → mondayKey ("2026-06-23")
  → formatPeriodKey(days[6], 'daily')    → sundayKey ("2026-06-29")
  → useDailySummariesRange(mon, sun)     → daily_summaries[] for the week
  + same for previous week               → for comparison

chartData[7]: built by mapping days array against summaryMap lookup.
thisWeekMinutes: reduce over days with summaryMap fallback to 0.
```

### MonthlyView

```
date (Date)
  → getDaysInMonth(year, month)          → [Date, Date, ...] (28–31 entries)
  → first/lastKey                        → "2026-06-01" / "2026-06-30"
  → useDailySummariesRange(first, last)  → daily_summaries[] for the month
  + same for previous month              → for comparison

Calendar renders days array, looking up each key in summaryMap.
leadingBlanks = mondayCol(days[0].getDay()) → 0 (Mon) to 6 (Sun)
```

### YearlyView

```
date (Date)
  → year = date.getFullYear()
  → jan1 = "2026-01-01", dec31 = "2026-12-31"
  → useDailySummariesRange(jan1, dec31)  → all daily_summaries for the year

focusMap: Map<date-string, focus_minutes>
weeks = getWeeksInYear(year)  → 52 Monday Date objects
  + optional 53rd if last Sunday < Dec 31

Grid: flatMap(weeks) × 7 rows, keyed by date string.
```

---

## 5. Charts

### Donut — project breakdown (DailyView)

- **Components:** `PieChart`, `Pie`, `Cell` from Recharts
- **Data shape:**
  ```ts
  interface ProjectEntry { name: string; color: string; minutes: number }
  // pieData: ProjectEntry[] sorted by minutes desc
  ```
- **Color logic:** each project's own color from `projects.color` column. Applied via `<Cell fill={entry.color} />` — never via dynamic Tailwind classes.
- **Config:** 180×180, `innerRadius={55}`, `outerRadius={80}`, `startAngle={90}`, `endAngle={-270}`, `strokeWidth={2}` (stroke `#141417` to create gaps).
- Center label: absolute-positioned div over the chart showing total focus time.

### Donut — weekly summary (WeeklyView)

- **Data shape:** single-element array — brand color if data exists, gray if no data.
  ```ts
  const donutData = thisWeekMinutes > 0
    ? [{ name: 'Focus', minutes: thisWeekMinutes, color: '#4B9EFF' }]
    : [{ name: 'Empty', minutes: 1,               color: '#222228' }]
  ```
- **Config:** 160×160, `innerRadius={50}`, `outerRadius={75}`, `paddingAngle={2}`, no stroke.
- No project-level breakdown; note displayed in legend area.

### Bar chart — daily timeline (DailyView)

- **Components:** `BarChart`, `Bar`, `Cell`, `XAxis`, `YAxis` (hidden), `Tooltip`, `ResponsiveContainer`
- **Data shape:** `HourSlot[]` — 24 entries, one per hour:
  ```ts
  interface HourSlot { hour: number; minutes: number; color: string; projectName: string }
  ```
- **Color logic:** bar color = project color of the first (chronologically earliest) session in that hour, or `#222228` if no sessions.
- **Config:** height 120, `barCategoryGap="20%"`, X-axis ticks formatted by `formatHour()`.

### Bar chart — weekly (WeeklyView)

- **Components:** `BarChart`, `Bar`, `Cell`, `LabelList`, `XAxis`, `YAxis` (hidden), `CartesianGrid`, `Tooltip`, `ResponsiveContainer`
- **Data shape:** `DayEntry[]` — 7 entries:
  ```ts
  interface DayEntry {
    day: string; date: string; dateObj: Date;
    focus_minutes: number; session_count: number;
    isToday: boolean; isFuture: boolean;
  }
  ```
- **Color logic:**
  - `focus_minutes > 0 && !isFuture` → `#4B9EFF`
  - Today with data → same fill + `filter: 'drop-shadow(0 0 6px rgba(75,158,255,0.6))'`
  - Zero or future → `#222228`
- **Config:** height 220, `maxBarSize={48}`, `radius={[6,6,0,0]}`. Custom X tick renders two `<tspan>` elements. `LabelList` above bars.

### Circular heatmap — monthly (MonthlyView)

- **Approach:** pure CSS Grid — no Recharts. Circles via `borderRadius: '50%'`.
- **Color scale (`getCellColor`):**
  ```ts
  function getCellColor(minutes: number): string {
    if (minutes === 0)  return '#1A1A1F'
    if (minutes < 30)   return 'rgba(75,158,255,0.18)'
    if (minutes < 60)   return 'rgba(75,158,255,0.35)'
    if (minutes < 120)  return 'rgba(75,158,255,0.55)'
    if (minutes < 180)  return 'rgba(75,158,255,0.75)'
    return '#4B9EFF'
  }
  ```
  Thresholds: 0 / <30m / <1h / <2h / <3h / ≥3h.

### GitHub-style heatmap — yearly (YearlyView)

- **Approach:** CSS Grid with `gridAutoFlow: 'column'` so weeks flow left-to-right and days flow top-to-bottom. No Recharts.
- **Color scale (`cellColor`):**
  ```ts
  function cellColor(minutes: number): string {
    if (minutes <= 0)   return '#222228'
    if (minutes < 60)   return 'rgba(75,158,255,0.20)'
    if (minutes < 120)  return 'rgba(75,158,255,0.45)'
    if (minutes < 240)  return 'rgba(75,158,255,0.70)'
    return '#4B9EFF'
  }
  ```
  Thresholds: 0 / <1h / <2h / <4h / ≥4h. (Wider ranges than monthly, 5-level scale.)
- Cell size: 13×13px circles.

---

## 6. Hooks & Query Functions

### Hooks — `src/hooks/useAnalytics.ts`

All hooks read `userId` from `useAuthStore` internally. No userId prop needed at call site.

#### `useProfile()`
```ts
function useProfile(): UseQueryResult<Profile | null>
```
Query key: `analyticsKeys.profile(userId)` → `['analytics', 'profile', userId]`  
Fetches the user's `profiles` row. Used by `AllTimeStatsBar` for all-time totals and streak data.

#### `useDailySummary(date: string)`
```ts
function useDailySummary(date: string): UseQueryResult<DailySummary | null>
```
Query key: `analyticsKeys.daily(userId, date)` → `['analytics', 'daily', userId, date]`  
Fetches a single `daily_summaries` row for the given date key (`"YYYY-MM-DD"`). Used by `DailyView` for `focus_minutes` and `session_count`.

#### `useDailySummariesRange(start: string, end: string)`
```ts
function useDailySummariesRange(start: string, end: string): UseQueryResult<DailySummary[]>
```
Query key: `analyticsKeys.dailyRange(userId, start, end)` → `['analytics', 'daily-range', userId, start, end]`  
Fetches all `daily_summaries` rows where `date` is between `start` and `end` (inclusive, `gte`/`lte`). Used by WeeklyView, MonthlyView, YearlyView. Disabled if `userId`, `start`, or `end` is falsy.

#### `useSessionsForDay(date: string)`
```ts
function useSessionsForDay(date: string): UseQueryResult<SessionWithProject[]>
```
Query key: `analyticsKeys.sessionsForDay(userId, date)` → `['analytics', 'sessions-day', userId, date]`  
Fetches raw `sessions` for the given local calendar day, joined with `projects(name, color)`. Only `type = 'focus'` sessions. Uses local-midnight boundaries (see §1 timezone section). Used only by `DailyView`.

#### `useUserStats(periodType, periodKey)`
```ts
function useUserStats(
  periodType: string,
  periodKey:  string
): UseQueryResult<UserStats | null>
```
Query key: `analyticsKeys.userStats(userId, type, key)` → `['analytics', 'stats', userId, type, key]`  
**Currently unused.** No view calls this hook.

#### `useUserStatsRange(periodType, periodKeys[])`
```ts
function useUserStatsRange(
  periodType: string,
  periodKeys: string[]
): UseQueryResult<UserStats[]>
```
Query key: `analyticsKeys.userStatsRange(userId, type, keys)` → `['analytics', 'stats-range', userId, type, ...keys]`  
Disabled if `periodKeys` is empty. **Currently unused.**

---

### Query functions — `src/lib/supabase/queries/analytics.ts`

#### `fetchDailySummary(userId, date)`
```ts
async function fetchDailySummary(userId: string, date: string): Promise<DailySummary | null>
```
`.maybeSingle()` — returns `null` if no row for that date. Date must be `"YYYY-MM-DD"`.

#### `fetchDailySummariesRange(userId, startDate, endDate)`
```ts
async function fetchDailySummariesRange(
  userId:    string,
  startDate: string,
  endDate:   string
): Promise<DailySummary[]>
```
Returns all rows ordered by `date ASC`. Returns `[]` if no data.

#### `fetchSessionsForDay(userId, date)`
```ts
async function fetchSessionsForDay(userId: string, date: string): Promise<SessionWithProject[]>
```
```ts
type SessionWithProject = Session & {
  projects: { name: string; color: string } | null
}
```
Constructs local-midnight UTC boundaries from the `"YYYY-MM-DD"` string. Filters `type = 'focus'`. Orders by `started_at ASC`.

#### `fetchUserStats(userId, periodType, periodKey)`
```ts
async function fetchUserStats(
  userId:     string,
  periodType: 'daily' | 'weekly' | 'monthly' | 'yearly',
  periodKey:  string
): Promise<UserStats | null>
```
`.maybeSingle()`. Period key format depends on `periodType` (see §7 `formatPeriodKey`).

#### `fetchUserStatsRange(userId, periodType, periodKeys[])`
```ts
async function fetchUserStatsRange(
  userId:     string,
  periodType: 'daily' | 'weekly' | 'monthly' | 'yearly',
  periodKeys: string[]
): Promise<UserStats[]>
```
Uses Supabase `.in('period_key', periodKeys)`. No ordering applied.

#### `fetchProfile(userId)`
```ts
async function fetchProfile(userId: string): Promise<Profile | null>
```
`.maybeSingle()` on `profiles` table.

---

## 7. Utility Functions

All in `src/lib/utils/analytics.ts`.

### `formatPeriodKey(date, period)`
```ts
function formatPeriodKey(
  date:   Date,
  period: 'daily' | 'weekly' | 'monthly' | 'yearly'
): string
```

Uses **local date methods** (`getFullYear()`, `getMonth()`, `getDate()`) — not `toISOString()` — so the key reflects the user's local calendar day regardless of timezone.

| Period | Format | Example |
|--------|--------|---------|
| `daily` | `YYYY-MM-DD` | `"2026-06-29"` |
| `weekly` | `YYYY-Www` | `"2026-W26"` |
| `monthly` | `YYYY-MM` | `"2026-06"` |
| `yearly` | `YYYY` | `"2026"` |

Weekly uses ISO week number via internal `getISOWeek()` (Thursday rule: week belongs to the year containing its Thursday).

**Why the local-date approach matters:** `new Date().toISOString()` returns UTC time. At UTC+2 on 2026-06-29 at 11 PM, `toISOString()` would return `"2026-06-29T21:00:00Z"` — correct. But at UTC-5, the same wall-clock time midnight transitions to a new UTC date 5 hours before the local date changes. Using local getters avoids this entirely.

### `getDaysInWeek(weekStart)`
```ts
function getDaysInWeek(weekStart: Date): Date[]
```
Returns 7 `Date` objects for Mon–Sun of the week containing `weekStart`. Internally normalizes to Monday via `getMonday()`.

Example: `getDaysInWeek(new Date('2026-06-29'))` → `[Mon Jun 22, Tue Jun 23, ..., Sun Jun 28]`

### `getDaysInMonth(year, month)`
```ts
function getDaysInMonth(year: number, month: number): Date[]
// month is 1-indexed (1 = January)
```
Returns all `Date` objects for the given month. Length varies 28–31.

Example: `getDaysInMonth(2026, 6)` → `[Date(Jun 1), ..., Date(Jun 30)]` (30 entries)

### `getWeeksInYear(year)`
```ts
function getWeeksInYear(year: number): Date[]
```
Returns exactly 52 Monday `Date` objects representing the ISO weeks of the year. Uses ISO week 1 definition (week containing Jan 4). `YearlyView` adds an optional 53rd week if the last Sunday before week 52 ends before Dec 31.

### `navigatePeriod(current, period, direction)`
```ts
function navigatePeriod(
  current:   Date,
  period:    'daily' | 'weekly' | 'monthly' | 'yearly',
  direction: 'prev' | 'next'
): Date
```
Returns a new `Date` shifted by one period unit. Uses `setDate`, `setMonth`, `setFullYear` — no timezone issues since these operate in local time.

### `getPeriodLabel(date, period)`
```ts
function getPeriodLabel(date: Date, period: 'daily' | 'weekly' | 'monthly' | 'yearly'): string
```

| Period | Output example |
|--------|---------------|
| `daily` | `"Mon, Jun 29"` |
| `weekly` | `"Jun 23 – Jun 29"` |
| `monthly` | `"June 2026"` |
| `yearly` | `"2026"` |

Used by `PeriodNavigator` for the center label.

### `isCurrentPeriod(date, period)`
```ts
function isCurrentPeriod(date: Date, period: 'daily' | 'weekly' | 'monthly' | 'yearly'): boolean
```
Compares `formatPeriodKey(date, period)` against `formatPeriodKey(new Date(), period)`. Used by `PeriodNavigator` to disable the "next" arrow and show/hide the jump-to-current link.

### `formatMinutesToHours(minutes)`
```ts
function formatMinutesToHours(minutes: number): string
```
| Input | Output |
|-------|--------|
| `0` | `"0h"` |
| `45` | `"45m"` |
| `60` | `"1h"` |
| `90` | `"1h 30m"` |

Used everywhere numbers are displayed. All call sites use the `font-data` (JetBrains Mono) class on the containing element.

### `getComparisonLabel(current, previous)`
```ts
function getComparisonLabel(current: number, previous: number): string
// returns e.g. "↑ 1h 30m vs last period" or "— same as last period"
```
**Defined but not used.** No component imports this. Monthly and weekly views implement inline comparison logic instead.

### `getBestHourOfDay(sessions)`
```ts
function getBestHourOfDay(
  sessions: Array<{ started_at: string; duration_mins: number }>
): string
// returns e.g. "9 AM", "2 PM", or "—" if empty
```
Aggregates `duration_mins` by local hour of `started_at`, returns the hour with the most focus time. **Defined but not used** — no view displays a "best hour" stat.

### `getBestDayOfWeek(summaries)`
```ts
function getBestDayOfWeek(
  summaries: Array<{ date: string; focus_minutes: number }>
): string
// returns e.g. "Tuesday" or "—" if empty
```
Aggregates `focus_minutes` by day-of-week across the summaries array, returns the day name with the highest total. **Defined but not used** — no view displays a "best day" stat.

---

## 8. Known Limitations

### Goal ring on DailyView — not implemented
DailyView has no goal progress ring. The `goals` table (Phase 6) stores per-period minute targets. Once goals are wired up, the daily stat card could show a ring or progress bar comparing `focus_minutes` against the day's goal.

### `getBestHourOfDay` / `getBestDayOfWeek` — implemented, not displayed
Both functions exist in `src/lib/utils/analytics.ts` with correct implementations. No view renders their output. Likely intended for a "Insights" section that was not yet built.

### `getComparisonLabel` — unused
Implemented in utils, not used anywhere. Weekly and monthly views do their own inline comparison logic instead.

### `useUserStats` / `useUserStatsRange` — hooks exist, not wired to any view
The hooks and their underlying query functions are fully implemented. No view component currently calls them. The `user_stats` table is populated by the `save_session` RPC.

### Weekly donut has no project breakdown
`useDailySummariesRange` returns `daily_summaries` rows which do not include per-project data. The weekly donut can only show total focus time as a single brand-color slice. Per-project breakdown is available only in DailyView (which queries raw `sessions`).

### RPC timezone mismatch for daily_summaries
`save_session` stores `daily_summaries.date` as `(p_started_at at time zone 'UTC')::date`. For users in UTC+ timezones, sessions logged before midnight UTC (but after midnight local time on the next day) are stored under yesterday's date in `daily_summaries`. This affects WeeklyView, MonthlyView, and YearlyView — they all read from `daily_summaries`. DailyView's session-level query is not affected (it uses local-midnight boundaries). Fixing this requires changing the RPC to accept a timezone offset parameter or store UTC-based dates explicitly as a known convention.

### YearlyView always fetches exactly 52 ISO weeks plus one optional overflow
`getWeeksInYear` always returns 52 Mondays. Some years have 53 ISO weeks; those are not handled — the 53rd week would be missing from the heatmap.
