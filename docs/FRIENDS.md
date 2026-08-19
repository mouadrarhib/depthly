# Friends — Implementation Reference

## Overview

Depthly's friend system is a **mutual, request-based** connection between two users —
send a request, the other person accepts or declines, and only once accepted do both
users count as friends. It reuses the `follows` table from the original (pre-request)
instant one-directional follow feature rather than adding a new table, distinguishing
states via a `status` column.

Friends matter in two places elsewhere in the app:

- **Leaderboard Friends tab** (`docs/LEADERBOARD.md`) — ranks the current user plus their
  accepted friends only, instead of every public user.
- **Private profile visibility** — an accepted friend can see your `profiles`/`user_stats`
  data (and reach your `/u/:slug` page) even if your profile is private. A public profile
  is visible to everyone regardless of friend status, as before.

This doc covers the request flow, the database/RLS layer that makes it work, and every
UI surface involved. For the ranked-list mechanics themselves (period keys, rank bar,
streak mode, etc.), see `docs/LEADERBOARD.md`.

---

## Data model

**Table:** `follows (id, follower_id, following_id, created_at, status)`
— `supabase/migrations/007_follows_friend_requests.sql`, extending the original table
from `001_initial_schema.sql`.

```sql
follower_id   uuid not null references profiles(id) on delete cascade
following_id  uuid not null references profiles(id) on delete cascade
status        text not null default 'accepted'
              check (status in ('pending', 'accepted', 'declined'))
unique (follower_id, following_id)
check  (follower_id <> following_id)
```

- **`follower_id`** — the requester (the one who sent the request, or the one "following").
- **`following_id`** — the recipient (the one who must accept).
- **A mutual friendship is two rows**, one per direction, both `status = 'accepted'`. There
  is no single "friendship" row — `acceptFriendRequest` explicitly inserts the reciprocal
  row (see [Flow](#flow) below).
- **`status` defaults to `'accepted'`** purely to grandfather every row created before this
  migration, back when a follow row's mere existence meant "following." No backfill was
  needed — old rows just kept working as already-mutual connections. Note this default
  means a pre-migration row is still only **one-directional** — see
  [Known Limitations](#known-limitations) #4.

---

## Flow

### Send — `sendFriendRequest(requesterId, targetId)`

Checks for an existing row between the pair first, either direction:

| Existing row | Result |
|---|---|
| `status: 'accepted'` | Throws — already friends |
| `status: 'pending'` | Throws — already pending |
| `status: 'declined'`, same direction as the new request | Reuses the row (`update status = 'pending'`) instead of inserting — `unique(follower_id, following_id)` would reject a duplicate insert in that exact direction |
| `status: 'declined'`, opposite direction, or no row at all | Inserts a fresh `status: 'pending'` row |

### Accept — `acceptFriendRequest(requestRowId, currentUserId, requesterId)`

1. Updates the original row to `status: 'accepted'`.
2. Inserts the reciprocal row (`currentUserId → requesterId`, `'accepted'`) so both
   directions exist.

The Supabase client can't wrap two `.from()` calls in one DB transaction — each is its own
PostgREST request — so a failed step 2 is rolled back by hand (step 1's update is reverted
to `'pending'`), **unless** the failure is a `23505` unique-violation, meaning the reciprocal
row already existed (e.g. a pre-migration instant-follow row in that direction) — in that
case it's already mutual and there's nothing to undo.

### Decline — `declineFriendRequest(requestRowId)`

Deletes the row outright rather than setting `status: 'declined'`. Simpler, and avoids a
lingering declined row permanently blocking a future re-request in that same direction
under the unique constraint.

### Unfriend — `useUnfriend()`

A mutual friendship is two rows; this calls the raw `unfollowUser(followerId, followingId)`
query function **twice**, once per direction, to remove both. There is no dedicated
"unfriend" query function — it composes the existing delete.

### Status check — `fetchFriendshipStatus(userId, otherUserId)`

Inspects both directions and returns one of:

- `'friends'` — any row between the pair is `'accepted'`
- `'pending_sent'` — a `'pending'` row where `userId` is the follower
- `'pending_received'` — a `'pending'` row where `userId` is the target
- `'none'` — no row at all (or only a stray `'declined'` one)

**Self-connection guard:** `useFriendshipStatus` is disabled when `otherUserId === userId`
(you can't friend yourself). Both friend-action button components return `null` /
aren't rendered for the viewer's own profile.

---

## Row-Level Security

### `follows` policies

| Policy | Command | Rule | Added in |
|---|---|---|---|
| `follows: insert own` | INSERT | `follower_id = auth.uid()` | 001 |
| `follows: delete own` | DELETE | `follower_id = auth.uid()` — cancel a sent request / regular unfollow | 001 |
| `follows: read own or public-target` | SELECT | `follower_id = auth.uid() OR` target profile `is_public = true` | 001 |
| `follows: read as recipient` | SELECT | `following_id = auth.uid()` — lets a recipient see incoming requests even from a private requester | 007 |
| `follows: update status as recipient` | UPDATE | `following_id = auth.uid()` — lets the recipient accept | 007 |
| `follows: delete as recipient` | DELETE | `following_id = auth.uid()` — decline a received request | 007 |

### `profiles` and `user_stats` — a second, separate gap

Fixing `follows` visibility alone wasn't enough: a private requester's/friend's **profile**
row and **user_stats** row are each gated by their own independent `is_public`-only policy
(`profiles: read own or public`, `user_stats: read own or public`), completely unrelated to
anything on `follows`. Two additive policies close that gap:

| Policy | Table | Rule | Scope | Added in |
|---|---|---|---|---|
| `profiles: read if connected via follows` | `profiles` | `is_connected_via_follows(auth.uid(), id)` | **any** status, either direction — deliberately includes `'pending'`, so a recipient can see who's requesting (name/avatar) before accepting | 008 |
| `user_stats: read if friends via follows` | `user_stats` | `are_friends_via_follows(auth.uid(), user_id)` | **`'accepted'` only**, either direction — a pending request must not unlock someone's actual tracked focus-time data, only a confirmed friendship should | 009 |

Both helper functions are `SECURITY DEFINER` SQL functions, not raw inline subqueries —
this is load-bearing, not a style choice. Read on.

### ⚠️ The recursion incident

The first version of the `profiles` policy (008) used a raw
`exists (select 1 from public.follows f where ...)` subquery directly in its `USING` clause.
`follows`' own `"read own or public-target"` policy queries `profiles` right back
(`exists (select 1 from profiles p where p.id = follows.following_id and p.is_public = true)`).

Postgres has to fully plan both RLS-protected subqueries before executing anything, so
`profiles → follows → profiles → follows → ...` forms a cycle the planner rejects outright
at **plan time** — `42P17: infinite recursion detected in policy for relation "profiles"` —
for **every** row, not just ones that would actually need the recursive branch.

This broke every authenticated read of `profiles` in production, including trivial own-row
lookups like `usePlan()`'s `select plan from profiles where id = auth.uid()`. Because
`usePlan()` defaults to `'free'` on any query error with no visible failure surfaced, every
user's subscription plan silently displayed as **Free** in the UI — a paying Pro/Lifetime
user would see themselves as Free, with nothing in the app indicating an error had occurred.
The bad policy was dropped directly in production once diagnosed via direct SQL simulation
of the failing query under the affected user's auth context.

**Fix:** route the lookup through a `SECURITY DEFINER` function instead of a raw subquery.
A `SECURITY DEFINER` function executes with the *owning role's* privileges (which bypass
RLS), so its internal `follows` query never triggers `follows`' own RLS policies — the
cycle never forms:

```sql
create or replace function public.is_connected_via_follows(viewer_id uuid, target_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.follows f
    where (f.follower_id = viewer_id and f.following_id = target_id)
       or (f.follower_id = target_id and f.following_id = viewer_id)
  );
$$;
```

`are_friends_via_follows` (009) is the same shape, scoped to `status = 'accepted'`.

**Takeaway for future RLS work on this table:** never write a policy on `profiles` or
`user_stats` that queries `follows` (or any table whose policies query back into
`profiles`/`user_stats`) via a raw subquery. Always go through a `SECURITY DEFINER` helper.
Full incident writeup lives in the migration file headers:
`supabase/migrations/008_profiles_follows_visibility.sql` and
`009_user_stats_friends_visibility.sql`.

### Embedded-join fragility — the other recurring failure mode

Separately from RLS policy correctness, two query functions avoid PostgREST's
embedded-resource join syntax (`profiles!inner(...)`, `profiles!follows_follower_id_fkey(...)`)
for pulling in profile data alongside `follows`/`user_stats` rows:

- `fetchPendingFriendRequests(userId)` (`follows` → `profiles`)
- `fetchFriendsLeaderboard(userId, ...)` (`follows` → `user_stats` → `profiles`)

PostgREST treats an embed on a non-nullable foreign key as an **inner join** — if RLS can't
resolve the joined `profiles` row for any reason, the **entire parent row** silently
vanishes from the result instead of coming back with a null profile. This caused two real
bugs before the RLS fixes above landed:

1. Pending requests from private users disappearing from the recipient's Incoming Requests
   list (the `follows` row existed and was readable, but the join to the requester's private
   `profiles` row failed, so PostgREST dropped the whole thing).
2. Private friends missing entirely from their own Friends leaderboard — while the
   friends-scoped *rank count* (`fetchFriendsRank`, which never touches `profiles`) stayed
   correct, reproducing the exact "#N of fewer-than-N users" mismatch the friends-scoped
   rank bar was originally built to prevent (see `docs/LEADERBOARD.md`).

Both functions now do a plain query for the base rows, a plain `.in('id', ids)` query for
the profiles, and merge the two in JS. A row's visibility is independent of any other row's
this way, so one inaccessible profile can't hide an otherwise-valid entry.
`fetchGlobalLeaderboard`'s embedded join is *not* similarly fragile — it only ever targets
rows that are already `is_public = true`, which are readable by anyone regardless of the
friends-connection policies, so there's nothing for RLS to silently drop.

---

## UI

### Friend action button

Two components, same four-state logic, different names (see
[Known Limitations](#known-limitations) #2):

- **`UserProfileModal.tsx`** — inner component `FollowActionButton` (name predates this
  system). Rendered in the modal's footer, opened by clicking a leaderboard row or a
  friends-search result.
- **`PublicProfilePage.tsx`** — `FriendActionButton`. Rendered in the header card of the
  `/u/:slug` page.

Both read `useFriendshipStatus(targetUserId)` and branch:

| Status | UI |
|---|---|
| `'none'` | "Add Friend" button → `useSendFriendRequest().mutate(targetUserId)` |
| `'pending_sent'` | Disabled "Requested" button |
| `'pending_received'` | "Accept" / "Decline" buttons. The `follows` row id needed by `acceptFriendRequest`/`declineFriendRequest` isn't part of `FriendshipStatus` — it's resolved by matching `targetUserId` against `usePendingFriendRequests()`'s own list, fetched again inside the button component |
| `'friends'` | "Friends" label → opens a shared `ConfirmDialog` ("Remove friend") → `useUnfriend().mutate(targetUserId)` on confirm |

Both components return `null` (or simply aren't rendered by their parent) when the profile
is the viewer's own, or when the viewer isn't logged in.

### `PublicProfilePage` private-profile visibility

A profile is viewable when it's public, it's the viewer's own, **or** the viewer is an
accepted friend (`useFriendshipStatus(profile.id).data === 'friends'`) — a merely *pending*
connection in either direction does **not** unlock the page. While that friendship check is
still in flight (only relevant for a private, not-own profile), the page shows a loading
spinner rather than the lock screen, so a private-but-friended profile doesn't flash
"private" before the real state resolves. The heatmap follows the identical rule
(`show_heatmap_on_profile` AND viewable), though see
[Known Limitations](#known-limitations) #1 — it still won't actually render data for anyone
but the owner today, friend or not.

### `LeaderboardPage` — Friends tab additions

Both sections below render only when `isTimeMode && viewTab === 'friends'`.

**Incoming Requests** — above the search box, only when `usePendingFriendRequests()` returns
at least one row. Each row (`PendingRequestRow`, defined inline in `LeaderboardPage.tsx`)
shows the requester's avatar/initial, display name, `@slug`, and inline Accept/Decline
buttons. Each row owns its own `useAcceptFriendRequest()`/`useDeclineFriendRequest()`
mutation instance, so one row's pending/loading state can't bleed into another's.

**Friends search** — a debounced (300 ms, `useDebounce`) text input
(`id="friends-search-input"`, targetable by the onboarding tour) calling
`useSearchProfiles`, enabled only at 2+ trimmed characters. Results (`SearchResultRow`,
also inline in `LeaderboardPage.tsx`) show avatar/initial, name, `@slug`; clicking one opens
`UserProfileModal` via `setSelectedUserId` — the same interaction as clicking a leaderboard
row, so the friend-request flow is reachable identically from either entry point.
`searchPublicProfiles` filters to `is_public = true` **in the query itself**, not via RLS —
a private user can't be found by search, though they remain reachable via a direct
`/u/:slug` link or by an existing connection.

The "No friends yet" empty state only renders when the friends list is empty **and** the
search box is empty; while actively searching, the list body renders nothing (the search
results panel above already carries the feedback) rather than showing both messages at once.

### Sidebar pending-request badge (`src/components/layout/Sidebar.tsx`)

The Leaderboard nav item's icon gets a small `#F25C5C` circular badge (top-right, ~16 px,
"9+" cap at 10+) when `usePendingFriendRequestsCount() > 0`. Works in both the expanded and
collapsed (60 px rail) sidebar states — the badge is positioned relative to a wrapper sized
to the icon itself, not the row, so it isn't clipped by the rail's `overflow: hidden`. No
other nav item has a badge.

Polling-based (`refetchInterval: 60000` — no realtime subscription), so a brand-new incoming
request can take up to a minute to make the badge appear. Accepting/declining from any of
the three surfaces above invalidates the count query immediately, so only the *initial*
appearance of a new request lags, not its disappearance.

---

## Hooks & query functions

### `src/hooks/useLeaderboard.ts`

| Hook | Query key | Returns |
|---|---|---|
| `useFriendshipStatus(otherUserId)` | `leaderboardKeys.friendshipStatus(userId, otherUserId)` | `FriendshipStatus`. Disabled when `otherUserId === userId` |
| `usePendingFriendRequests()` | `leaderboardKeys.pendingRequests(userId)` | `PendingFriendRequest[]` |
| `usePendingFriendRequestsCount()` | `leaderboardKeys.pendingRequestsCount(userId)` | `number`. `refetchInterval: 60000` |
| `useSendFriendRequest()` | mutation | invalidates `friendshipStatus` + `['leaderboard','friends']` |
| `useAcceptFriendRequest()` | mutation, takes `{ requestRowId, requesterId }` | invalidates `friendshipStatus`, `pendingRequests`, `pendingRequestsCount`, `['leaderboard','friends']` |
| `useDeclineFriendRequest()` | mutation, takes `{ requestRowId, requesterId }` | invalidates `friendshipStatus`, `pendingRequests`, `pendingRequestsCount` |
| `useUnfriend()` | mutation, takes `otherUserId` | deletes both directions; invalidates `friendshipStatus` + `['leaderboard','friends']` |
| `useSearchProfiles(query)` | `leaderboardKeys.search(trimmedQuery)` | `ProfileSearchResult[]`. Disabled below 2 trimmed characters |

There is **no** `useFollowUser`/`useUnfollowUser`/`useFollowStatus` — the old instant-follow
hooks were removed once `PublicProfilePage` (their last consumer) moved onto this system.
The raw `unfollowUser` query function still exists and is used internally by `useUnfriend`.

`useFriendsLeaderboard`/`useFriendsRank` (the ranked-list side of "friends") are documented
in `docs/LEADERBOARD.md`, since they're primarily about the leaderboard, not the request flow.

### `src/lib/supabase/queries/leaderboard.ts`

```ts
type FriendshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'friends'

type PendingFriendRequest = {
  id, requester_id, display_name, avatar_url, profile_slug, created_at
}

type ProfileSearchResult = {
  id, display_name, avatar_url, profile_slug
}
```

| Function | Table(s) | Notes |
|---|---|---|
| `sendFriendRequest(requesterId, targetId)` | `follows` | see [Flow](#flow) |
| `acceptFriendRequest(requestRowId, currentUserId, requesterId)` | `follows` | update + insert reciprocal row; see [Flow](#flow) |
| `declineFriendRequest(requestRowId)` | `follows` | delete by id |
| `fetchPendingFriendRequests(userId)` | `follows` + `profiles` | two plain queries + in-memory merge, not an embedded join — see [Embedded-join fragility](#embedded-join-fragility--the-other-recurring-failure-mode) |
| `fetchPendingFriendRequestsCount(userId)` | `follows` | `{ count: 'exact', head: true }` — no row data fetched |
| `fetchFriendshipStatus(userId, otherUserId)` | `follows` | checks both directions |
| `searchPublicProfiles(query, excludeUserId, limit=10)` | `profiles` | `is_public = true`, `id != excludeUserId`, `ilike` on `display_name` OR `profile_slug`. Empty/whitespace query short-circuits to `[]` before hitting the DB |
| `unfollowUser(followerId, followingId)` | `follows` | delete by both IDs. Used directly by `useUnfriend` (called twice, once per direction) |

---

## Known Limitations

1. **`daily_summaries` has no public *or* friends RLS exception — only `user_id = auth.uid()`.**
   Unlike `profiles`/`user_stats`, there's no carve-out here at all. `fetchPublicHeatmap`
   silently returns `[]` for any profile that isn't the viewer's own. `PublicProfilePage`'s
   heatmap therefore effectively never renders for anyone but the owner, even an accepted
   friend. The same `SECURITY DEFINER` pattern used for `profiles`/`user_stats` would fix it
   if wanted — deliberately left out when `user_stats` was fixed, since it wasn't the bug
   being chased at the time.

2. **`FollowActionButton` (in `UserProfileModal.tsx`) is named after the instant-follow
   system it replaced.** `PublicProfilePage.tsx`'s equivalent — same four-state logic, same
   hooks — is named `FriendActionButton`. Cosmetic only, but a `grep FollowActionButton`
   won't find the second one.

3. **Avatar color palette is duplicated across files.** `LeaderboardRow.tsx`'s
   `getAvatarColor` (8 colors), `LeaderboardPage.tsx`'s own copy of the same function (used
   by `SearchResultRow`/`PendingRequestRow`), `UserProfileModal.tsx`'s `avatarColor` (6
   colors), and `PublicProfilePage.tsx`'s `avatarColor` (6 colors) are four independent
   implementations. The same name can render a different color depending on which surface
   is showing it.

4. **One-directional pre-migration `'accepted'` rows create an asymmetric friendship.**
   `getFriendsGroupIds(userId)` (used by `fetchFriendsLeaderboard`/`fetchFriendsRank`) only
   checks the `follower_id = userId` direction. A genuine mutual friendship (created via
   `acceptFriendRequest`) always has both directions as `'accepted'`, so this is correct
   going forward — but a `follows` row that predates the friend-request system (created by
   the old instant `followUser()`, which only ever wrote one row) shows up as a friend from
   the follower's side and *not* the followed side, until the followed side also gets an
   explicit accepted row (e.g. by unfriending and re-requesting through the new flow).

5. **Sidebar badge lags up to 60 seconds on a brand-new incoming request** (polling, not
   realtime) — see [Sidebar pending-request badge](#sidebar-pending-request-badge-srccomponentslayoutsidebartsx).

6. **`searchPublicProfiles` only matches public profiles.** A private user can't be found by
   name/slug search at all, even by someone who already has a pending request out to them —
   they're only reachable via a direct `/u/:slug` link or an existing connection. This is
   deliberate (search is a discovery mechanism; privacy opt-out should mean "not
   discoverable"), documented here since it's easy to mistake for a bug.
