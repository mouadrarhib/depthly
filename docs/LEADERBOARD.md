# Leaderboard — Implementation Reference

## Overview

The leaderboard ranks users by focus time or streak length across configurable time windows.
Visibility is opt-in: a profile with `is_public = true` appears to everyone. A private
profile appears only to itself and to its accepted friends — see `docs/FRIENDS.md` for the
full friend-request system and the RLS layer behind that. The feature is split into two
surfaces:

- `/leaderboard` — the main ranked list, protected, requires auth
- `/u/:slug` — a public profile page, no auth required

The `follows` table powers the Friends tab, which limits the ranked list to the current
user plus their accepted friends.

---

## Pages & Routes

### `LeaderboardPage` (`src/pages/LeaderboardPage.tsx`)

**Route:** `/leaderboard` — protected, rendered inside `AppLayout`

**Layout:** two-column flex.

- **Left panel** (160 px, `#0D0D10`) — two `NavSection` groups:
  - **Time:** Day / Week / Month / Year / All Time
  - **Streak:** Current Streak / Best Streak
- **Right content** (flex-1, scrollable, max-width 720 px) — title, optional
  `PeriodNavigator`, status bar, rank bar, **Incoming Requests** and **Friends search**
  (Friends tab only — see `docs/FRIENDS.md`), column headers, row list, `UserProfileModal`

**State:**

| State | Default | Purpose |
|---|---|---|
| `activeNav` | `'weekly'` | Selected nav item — drives data mode |
| `viewTab` | `'global'` | `'global'` or `'friends'` tab (time modes only) |
| `currentDate` | `new Date()` | Date used for period key; reset on nav change |
| `selectedUserId` | `null` | Opens `UserProfileModal` when set |
| `searchQuery` | `''` | Friends-tab search input (finding people to friend — see `docs/FRIENDS.md`); debounced 300 ms before querying |

**Data modes:**

- **Time mode** (`activeNav` is `daily | weekly | monthly | yearly | all_time`):
  calls `useGlobalLeaderboard` or `useFriendsLeaderboard` depending on `viewTab`.
  Shows `PeriodCountdown`, `PeriodNavigator` (not for `all_time`), and the rank bar.
- **Streak mode** (`activeNav` is `current_streak | best_streak`):
  calls an inline `fetchStreakLeaderboard` (split into `fetchCurrentStreakLeaderboard` /
  `fetchBestStreakLeaderboard`, defined in the page file, not the shared query file).
  Hides the rank bar, view tabs, friend search, and incoming requests.

**Period key calculation:** `formatPeriodKey(currentDate, periodType)` from
`@/lib/utils/analytics`. When the user navigates the `PeriodNavigator` the date
changes but the nav mode stays fixed. Switching nav items resets `currentDate` to today.

**Rank bar:** visible in time mode only. Shows the current user's rank (`#N of N users`),
their focus hours, and a `'Your position'` label with a brand-color left border and
`rgba(75,158,255,0.05)` background. When the user has no data for the period the bar
shows "Unranked" with a Clock icon. For `all_time` the rank is derived by searching
the fetched list for the current user's entry rather than calling a rank hook.

For time-mode periods, the rank source switches with `viewTab`: `useUserRank` (global rank)
on Everyone, `useFriendsRank` (rank within the friends group) on Friends. This matters —
`useUserRank` ranks against *all* public users regardless of tab, so using it unconditionally
while the "of N users" count came from the friends-scoped list produced impossible results
like "#4 of 3 users." Both the rank number and the `entries.length` total must be computed
against the same population, which is why they're switched together.

**Incoming Requests / Friends search:** rendered only on the Friends tab in time mode.
Full behavior, components (`SearchResultRow`, `PendingRequestRow`), and the friend-request
hooks/queries behind them are documented in `docs/FRIENDS.md` rather than here, since
they're about the friend system, not leaderboard ranking mechanics.

**Sub-components defined in file:**

- `NavSection` — labeled group of nav buttons with active styling
- `TabPill` — pill toggle used for Everyone / Friends
- `SearchResultRow` — one friends-search result row (see `docs/FRIENDS.md`)
- `PendingRequestRow` — one incoming-request row with Accept/Decline (see `docs/FRIENDS.md`)

---

### `PublicProfilePage` (`src/pages/PublicProfilePage.tsx`)

**Route:** `/u/:slug` — public, no `AppLayout`, no auth required

**Behaviour:**
- Reads `slug` from `useParams`, calls `usePublicProfile(slug)`.
- The profile is viewable if it's public, it's the viewer's own, or the viewer is an
  accepted friend of the owner — see `docs/FRIENDS.md` for the exact rule (a pending
  connection does **not** unlock it) and the loading-state handling that avoids a
  private-but-friended profile flashing the lock screen. Otherwise renders a centered
  lock-icon card ("This profile is private").
- If viewable: renders header card (avatar + name + member-since + friend-action button) +
  three stat cards (total focus, current streak, longest streak) + optional heatmap.

**Heatmap:** shown when `profile.show_heatmap_on_profile = true` and the profile is
viewable (same public/own/friend rule as above). Renders the full current calendar year as
a week-grid using `daily_summaries` data fetched via `usePublicHeatmap`. Mirrors the
YearlyView heatmap in Analytics: 13 px circle cells, 5-level brand-color scale, month
labels, day-of-week labels, tooltips via shadcn `TooltipProvider`.

**Friend action button:** rendered only when `currentUserId` is set and the profile isn't
the viewer's own. Behavior, the four states, and the underlying hooks are documented in
`docs/FRIENDS.md`.

**Streak color:** `current_streak > 0` → value rendered in `#C8FF64` via inline style;
`= 0` → `#E8E6F0`. `current_streak` here is the stored column value already passed through
`getEffectiveStreak(current_streak, last_focus_date)` — see `src/lib/utils/streak.ts`.

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

Opened from `LeaderboardPage` when a row is clicked (leaderboard entry or friends-search
result). Uses shadcn `<Dialog>`.

**Data:** fetches `profiles` directly via inline `useQuery` with key
`['profile', 'by-id', userId]`. Columns fetched:
`id, display_name, avatar_url, profile_slug, current_streak, longest_streak,
total_focus_minutes, total_sessions, last_focus_date` — `current_streak` is passed through
`getEffectiveStreak` before being returned. No `is_public` check happens here; visibility is
enforced entirely by RLS — a friend's private profile just comes back with data, a
stranger's comes back `null`. See `docs/FRIENDS.md` for the RLS rules behind that.

**Layout:**
- Header (28/24 px padding, bottom border): 56 px avatar + name + `@slug` + stats pills
- Stats grid (2 × 2): Total Focus, Total Sessions, Current Streak, Best Streak
- Actions footer: `FollowActionButton` + Close button

**Stats pills:** streak pill in `#C8FF64` with `rgba(200,255,100,0.08)` background
(only when `current_streak > 0`); focus-time pill in brand color.

**`FollowActionButton` inner component** *(name predates the friend-request system it now
implements — see `docs/FRIENDS.md` Known Limitations)*: the same four-state friend-request
button documented in `docs/FRIENDS.md`. Returns `null` when the profile is the current
user's own or when the user is not logged in.

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

Friend-request hooks/functions (`useFriendshipStatus`, `usePendingFriendRequests`,
`usePendingFriendRequestsCount`, `useSendFriendRequest`, `useAcceptFriendRequest`,
`useDeclineFriendRequest`, `useUnfriend`, `useSearchProfiles`, and their underlying query
functions) are documented in `docs/FRIENDS.md`, not repeated here.

### `src/hooks/useLeaderboard.ts`

| Hook | Query key | Data returned |
|---|---|---|
| `useGlobalLeaderboard(periodType, periodKey)` | `leaderboardKeys.allTime()` or `leaderboardKeys.global(...)` | `LeaderboardEntry[]` |
| `useFriendsLeaderboard(periodType, periodKey)` | `leaderboardKeys.friends(userId, ...)` | `LeaderboardEntry[]` |
| `useUserRank(periodType, periodKey)` | `leaderboardKeys.userRank(userId, ...)` | `{ rank, focus_minutes } \| null` |
| `useFriendsRank(periodType, periodKey)` | `leaderboardKeys.friendsRank(userId, ...)` | `{ rank, focus_minutes } \| null` — rank within the friends group, not global |
| `usePublicProfile(slug)` | `['profile', 'public', slug]` | `PublicProfile \| null` |
| `usePublicHeatmap(userId, startDate, endDate)` | `['heatmap', 'public', userId, startDate, endDate]` | `Array<{ date, focus_minutes }>` |

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

| Function | Table(s) | Notes |
|---|---|---|
| `fetchProfileBySlug(slug)` | `profiles` | `profile_slug = slug`; RLS-gated, not an explicit `is_public` filter |
| `fetchPublicHeatmap(userId, start, end)` | `daily_summaries` | `user_id`, date range |
| `fetchGlobalLeaderboard(periodType, periodKey, limit=50)` | `user_stats` ⋈ `profiles` | `is_public = true`, period. Uses an embedded `profiles!inner(...)` join — safe here because it only ever targets rows that are already public |
| `fetchAllTimeLeaderboard(limit=50)` | `profiles` | `is_public = true`, order by `total_focus_minutes` |
| `fetchUserRank(userId, periodType, periodKey)` | `user_stats` (×2) | two queries: own row + count of public users with a higher score |
| `fetchFriendsRank(userId, periodType, periodKey)` | `user_stats` (×2) + `follows` | own row + count within the friends group (not global) with a higher score |
| `fetchFriendsLeaderboard(userId, periodType, periodKey)` | `follows` + `user_stats` + `profiles` | **Two plain queries + in-memory merge**, not an embedded join — a private friend's `user_stats` row would otherwise silently vanish from the result; full explanation in `docs/FRIENDS.md` |

`fetchUserRank`/`fetchFriendsRank` each use two sequential Supabase calls: first to get the
user's own `focus_minutes`, then to count how many people (public users, or friends
respectively) have a higher value. Rank = count + 1.

`getFriendsGroupIds(userId)` (private helper, shared by `fetchFriendsRank` and
`fetchFriendsLeaderboard`) returns the current user's id plus every `following_id` where
`follower_id = userId AND status = 'accepted'` — see `docs/FRIENDS.md` Known Limitations for
a one-directional-row asymmetry this implies for pre-friend-request-system data.

---

## Seed Accounts (launch cold-start)

To avoid an empty leaderboard/public-profile experience at launch, `scripts/seed-production-leaderboard.ts`
creates ~20 synthetic public profiles with realistic session history generated through the real
`save_session()` RPC (so streaks, `daily_summaries`, and heatmaps are all internally consistent —
unlike the older dev-only `scripts/seed-leaderboard-users.ts`, which pokes fake numbers directly
into `profiles`/`user_stats`).

Seeded profiles are flagged via `profiles.is_seed_account` (added in
`supabase/migrations/011_add_is_seed_account.sql`). That flag is **not** used to filter them out of
the leaderboard, friends search, or anything else — they're meant to render identically to real
users. It exists only so a future admin/metrics view can exclude them from real growth numbers,
and so they can be bulk-deleted later:

```sql
delete from auth.users where id in (select id from profiles where is_seed_account = true);
```

Seeded profiles all stay on the default `free` plan (no subscriptions/billing rows), so they can
never pollute revenue metrics. See the script's header comment for full details, including the
`SEED_CONFIRM=yes-seed-production` safety gate required to run it.

---

## Known Limitations

1. **`useUserRank` does not support `all_time`.**
   `LeaderboardPage` works around this by searching the fetched list for the current
   user's entry (`entries.find(e => e.user_id === currentUserId)`). This means the
   all-time rank bar only works if the user appears within the top 50 results.
   `useFriendsRank` has the same gap and the same `all_time → yearly` fallback (#2).

2. **Friends tab falls back to `yearly` when `all_time` is selected.**
   `user_stats` requires a `period_type` and `period_key`; there is no all-time friends
   ranking. The Friends tab (and friend search / incoming requests) is hidden in streak
   mode too.

3. **`PeriodCountdown` ignores `periodKey`.**
   End time is always calculated from the current wall clock, not from the navigated
   period. If the user browses a past week, the countdown still shows time remaining
   in the current week.

4. **Streak leaderboard is not in the shared query file.**
   `fetchCurrentStreakLeaderboard`/`fetchBestStreakLeaderboard` are defined inline in
   `LeaderboardPage.tsx`. They query `profiles` directly (not `user_stats`) and are not
   accessible to other consumers.

5. **`UserProfileModal` avatar has no broken-image fallback.**
   `LeaderboardRow` handles broken URLs via `onError` + `imgError` state, but
   `UserProfileModal`'s header avatar does not — a broken `avatar_url` will show the
   browser default.

6. **`fetchPublicHeatmap` may return an empty array for other users.**
   If Supabase RLS on `daily_summaries` blocks cross-user reads, the heatmap renders
   silently empty rather than erroring. See `docs/FRIENDS.md` Known Limitations for why
   this affects friends too, not just strangers.

7. **Avatar color palettes are duplicated across three files.**
   `LeaderboardRow` (8 colors via `getAvatarColor`), `UserProfileModal` (6 colors via
   `avatarColor`), and `PublicProfilePage` (6 colors via `avatarColor`) each define
   their own helper independently. The same name can render with different colors
   depending on which surface is displaying it.

8. **No pagination.**
   All leaderboard queries hard-cap at 50 results (`limit = 50`). There is no
   load-more or infinite-scroll.
