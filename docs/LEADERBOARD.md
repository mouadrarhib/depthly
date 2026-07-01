# Leaderboard — Implementation Reference

## Overview

The leaderboard ranks users by focus time or streak length across configurable time windows.
Visibility is opt-in: only users with `profiles.is_public = true` appear.
The feature is split into two surfaces:

- `/leaderboard` — the main ranked list, protected, requires auth
- `/u/:slug` — a public profile page, no auth required

The follow system (`follows` table) powers the Friends tab, which limits the ranked list
to the current user plus the people they follow.

---

## Pages & Routes

### `LeaderboardPage` (`src/pages/LeaderboardPage.tsx`)

**Route:** `/leaderboard` — protected, rendered inside `AppLayout`

**Layout:** two-column flex.

- **Left panel** (160 px, `#0D0D10`) — two `NavSection` groups:
  - **Time:** Day / Week / Month / Year / All Time
  - **Streak:** Current Streak / Best Streak
- **Right content** (flex-1, scrollable, max-width 720 px) — title, optional
  `PeriodNavigator`, status bar, rank bar, column headers, row list, `UserProfileModal`

**State:**

| State | Default | Purpose |
|---|---|---|
| `activeNav` | `'weekly'` | Selected nav item — drives data mode |
| `viewTab` | `'global'` | `'global'` or `'friends'` tab (time modes only) |
| `currentDate` | `new Date()` | Date used for period key; reset on nav change |
| `selectedUserId` | `null` | Opens `UserProfileModal` when set |

**Data modes:**

- **Time mode** (`activeNav` is `daily | weekly | monthly | yearly | all_time`):
  calls `useGlobalLeaderboard` or `useFriendsLeaderboard` depending on `viewTab`.
  Shows `PeriodCountdown`, `PeriodNavigator` (not for `all_time`), and the rank bar.
- **Streak mode** (`activeNav` is `current_streak | best_streak`):
  calls an inline `fetchStreakLeaderboard` query (defined in the page file, not in the
  shared query file). Hides the rank bar and view tabs.

**Period key calculation:** `formatPeriodKey(currentDate, periodType)` from
`@/lib/utils/analytics`. When the user navigates the `PeriodNavigator` the date
changes but the nav mode stays fixed. Switching nav items resets `currentDate` to today.

**Rank bar:** visible in time mode only. Shows the current user's rank (`#N of N users`),
their focus hours, and a `'Your position'` label with a brand-color left border and
`rgba(75,158,255,0.05)` background. When the user has no data for the period the bar
shows "Unranked" with a Clock icon. For `all_time` the rank is derived by searching
the fetched list for the current user's entry rather than calling `useUserRank`.

**Sub-components defined in file:**

- `NavSection` — labeled group of nav buttons with active styling
- `TabPill` — pill toggle used for Everyone / Friends

---

### `PublicProfilePage` (`src/pages/PublicProfilePage.tsx`)

**Route:** `/u/:slug` — public, no `AppLayout`, no auth required

**Behaviour:**
- Reads `slug` from `useParams`, calls `usePublicProfile(slug)`.
- If profile not found or `is_public = false`: renders a centered lock-icon card.
- If public: renders header card (avatar + name + member-since) + three stat cards
  (total focus, current streak, longest streak) + optional heatmap.

**Heatmap:** shown when `profile.show_heatmap_on_profile = true`. Renders the full
current calendar year as a week-grid using `daily_summaries` data fetched via
`usePublicHeatmap`. Mirrors the YearlyView heatmap in Analytics: 13 px circle cells,
5-level brand-color scale, month labels, day-of-week labels, tooltips via shadcn
`TooltipProvider`.

**Follow button:** rendered only when `currentUserId` is set (logged in) and the
profile is not the current user's own profile. Uses `useFollowStatus`, `useFollowUser`,
`useUnfollowUser` hooks.

**Streak color:** `current_streak > 0` → value rendered in `#C8FF64` via inline style;
`= 0` → `#E8E6F0`.

---

## Components

### `LeaderboardRow` (`src/components/leaderboard/LeaderboardRow.tsx`)

**Props:**

```ts
interface LeaderboardRowProps {
  entry:         LeaderboardRowEntry   // { user_id, display_name, avatar_url, current_streak }
  rank:          number
  isCurrentUser: boolean
  valueDisplay:  string                // pre-formatted string, e.g. "2h 30m" or "14 days"
  onClick:       () => void
}
```

**Rank decoration:**

| Rank | Trophy color | Row bg | Left border |
|---|---|---|---|
| 1 | `#F5A623` (gold) | `rgba(245,166,35,0.10)` | `#F5A623` |
| 2 | `#C0C0C0` (silver) | `rgba(192,192,192,0.10)` | `#C0C0C0` |
| 3 | `#CD7F32` (bronze) | `rgba(205,127,50,0.10)` | `#CD7F32` |
| 4+ | rank number | transparent | none |

Top-3 rows render a `<Trophy>` icon; rank 4+ renders the numeric rank. Current user's
rank number and name render in brand color (`#4B9EFF`) with a "You" pill.

**Avatar:** `<img>` with `onError` fallback. `imgError` state (via `useState`) triggers
the colored-initial fallback when the image URL is broken or absent. Fallback is a 36 px
circle whose color is derived by `getAvatarColor(name)` — 8-color deterministic hash
(`['#4B9EFF','#3DD68C','#F5A623','#F25C5C','#A78BFA','#F472B6','#FB923C','#34D399']`).

**Streak line:** rendered only when `current_streak > 0`. Shows a `<Flame size={12}>`
icon and `"{n}d streak"` text, both in `#C8FF64` via inline style. Hidden (no element)
when streak is 0.

---

### `UserProfileModal` (`src/components/leaderboard/UserProfileModal.tsx`)

**Props:** `{ userId: string; onClose: () => void }`

Opened from `LeaderboardPage` when a row is clicked. Uses shadcn `<Dialog>`.

**Data:** fetches `profiles` directly via inline `useQuery` with key
`['profile', 'by-id', userId]`. Columns fetched:
`id, display_name, avatar_url, profile_slug, current_streak, longest_streak,
total_focus_minutes, total_sessions`.

**Layout:**
- Header (28/24 px padding, bottom border): 56 px avatar + name + `@slug` + stats pills
- Stats grid (2 × 2): Total Focus, Total Sessions, Current Streak, Best Streak
- Actions footer: `FollowActionButton` + Close button

**Stats pills:** streak pill in `#C8FF64` with `rgba(200,255,100,0.08)` background
(only when `current_streak > 0`); focus-time pill in brand color.

**`FollowActionButton` inner component:** reads `useFollowStatus`, `useFollowUser`,
`useUnfollowUser`. Returns `null` when the profile is the current user's own profile
or when the user is not logged in.

**Avatar:** falls back to `avatarColor(name)` colored-initial circle (56 px) using a
6-color palette. No `onError` handler — broken URLs show the browser's broken-image
placeholder.

---

### `PeriodCountdown` (`src/components/leaderboard/PeriodCountdown.tsx`)

**Props:** `{ periodType: string; periodKey: string }`

Displays a live countdown to the end of the current period. Renders `null` for
`all_time`. Updates every second via `setInterval` in a `useEffect` (cleanup on
unmount / periodType change).

**End-time calculation** (from wall clock, not `periodKey`):

| Period | End |
|---|---|
| `daily` | Today at 23:59:59 |
| `weekly` | Coming Sunday (or today if Sunday) at 23:59:59 |
| `monthly` | Last day of current month at 23:59:59 |
| `yearly` | Dec 31 of current year at 23:59:59 |

**Format:** `"Ends in Xd HH:MM:SS"` in `font-data` 12 px `ink-secondary`.

---

## Hooks & Query Functions

### `src/hooks/useLeaderboard.ts`

| Hook | Query key | Data returned |
|---|---|---|
| `useGlobalLeaderboard(periodType, periodKey)` | `leaderboardKeys.allTime()` or `leaderboardKeys.global(...)` | `LeaderboardEntry[]` |
| `useFriendsLeaderboard(periodType, periodKey)` | `leaderboardKeys.friends(userId, ...)` | `LeaderboardEntry[]` |
| `useUserRank(periodType, periodKey)` | `leaderboardKeys.userRank(userId, ...)` | `{ rank, focus_minutes } \| null` |
| `useFollowStatus(followingId)` | `leaderboardKeys.followStatus(userId, followingId)` | `boolean` |
| `usePublicProfile(slug)` | `['profile', 'public', slug]` | `PublicProfile \| null` |
| `usePublicHeatmap(userId, startDate, endDate)` | `['heatmap', 'public', userId, startDate, endDate]` | `Array<{ date, focus_minutes }>` |
| `useFollowUser()` | mutation | invalidates `followStatus` + `['leaderboard','friends']` |
| `useUnfollowUser()` | mutation | invalidates `followStatus` + `['leaderboard','friends']` |

All hooks that need the current user's ID read from `useAuthStore(s => s.user?.id ?? '')`.
`useFollowStatus` is disabled when `followingId === userId` (can't follow yourself).

### `src/lib/supabase/queries/leaderboard.ts`

**Types:**

```ts
type PublicProfile = {
  id, display_name, avatar_url, profile_slug, is_public, member_since,
  current_streak, longest_streak, total_focus_minutes, total_sessions,
  show_heatmap_on_profile
}

type LeaderboardEntry = {
  rank, user_id, display_name, avatar_url, profile_slug,
  focus_minutes, session_count, current_streak, is_public
}
```

**Functions:**

| Function | Table(s) | Filter |
|---|---|---|
| `fetchProfileBySlug(slug)` | `profiles` | `profile_slug = slug` |
| `fetchPublicHeatmap(userId, start, end)` | `daily_summaries` | `user_id`, date range |
| `fetchGlobalLeaderboard(periodType, periodKey, limit=50)` | `user_stats` ⋈ `profiles` | `is_public = true`, period |
| `fetchAllTimeLeaderboard(limit=50)` | `profiles` | `is_public = true`, order by `total_focus_minutes` |
| `fetchUserRank(userId, periodType, periodKey)` | `user_stats` (×2) | two queries: own row + count with higher score |
| `fetchFriendsLeaderboard(userId, periodType, periodKey)` | `follows` + `user_stats` ⋈ `profiles` | `user_id IN (followingIds + self)` |
| `fetchFollowStatus(followerId, followingId)` | `follows` | exact row lookup |
| `followUser(followerId, followingId)` | `follows` | insert; ignores error code `23505` (already following) |
| `unfollowUser(followerId, followingId)` | `follows` | delete by both IDs |

`fetchUserRank` uses two sequential Supabase calls: first to get the user's own
`focus_minutes`, then to count how many public users have a higher value. Rank = count + 1.

---

## Follow System

**DB table:** `follows (id, follower_id, following_id, created_at)`

**Flow:**

1. User clicks Follow on a row → `useFollowUser().mutate(targetUserId)`
2. `followUser(currentUserId, targetUserId)` inserts into `follows`
3. On success, TanStack Query invalidates:
   - `leaderboardKeys.followStatus(userId, targetUserId)` — updates button state
   - `['leaderboard', 'friends']` — refreshes Friends tab list
4. Unfollow mirrors this with a delete.

**Self-follow guard:** `useFollowStatus` is disabled when `followingId === userId`.
`FollowActionButton` (in `UserProfileModal`) returns `null` for own profile.

**Friends leaderboard always includes the current user's own row** — `fetchFriendsLeaderboard`
merges the current user's ID into the `userIds` array before querying `user_stats`.

---

## Known Limitations

1. **`useUserRank` does not support `all_time`.**
   `LeaderboardPage` works around this by searching the fetched list for the current
   user's entry (`entries.find(e => e.user_id === currentUserId)`). This means the
   all-time rank bar only works if the user appears within the top 50 results.

2. **Friends tab falls back to `yearly` when `all_time` is selected.**
   `user_stats` requires a `period_type` and `period_key`; there is no all-time friends
   ranking. The Friends tab is hidden in streak mode too.

3. **`PeriodCountdown` ignores `periodKey`.**
   End time is always calculated from the current wall clock, not from the navigated
   period. If the user browses a past week, the countdown still shows time remaining
   in the current week.

4. **Streak leaderboard is not in the shared query file.**
   `fetchStreakLeaderboard` is defined inline in `LeaderboardPage.tsx`. It queries
   `profiles` directly (not `user_stats`) and is not accessible to other consumers.

5. **`UserProfileModal` avatar has no broken-image fallback.**
   `LeaderboardRow` handles broken URLs via `onError` + `imgError` state, but
   `UserProfileModal` does not — a broken `avatar_url` will show the browser default.

6. **`fetchPublicHeatmap` may return an empty array for other users.**
   If Supabase RLS on `daily_summaries` blocks cross-user reads, the heatmap renders
   silently empty rather than erroring.

7. **Avatar color palettes are duplicated across three files.**
   `LeaderboardRow` (8 colors via `getAvatarColor`), `UserProfileModal` (6 colors via
   `avatarColor`), and `PublicProfilePage` (6 colors via `avatarColor`) each define
   their own helper independently. The same name can render with different colors
   depending on which surface is displaying it.

8. **No pagination.**
   All leaderboard queries hard-cap at 50 results (`limit = 50`). There is no
   load-more or infinite-scroll.
