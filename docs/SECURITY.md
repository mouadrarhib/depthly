# Security — RLS / RPC Audit Reference

## Overview

Session-write hardening continues in `015_trusted_sessions.sql`: direct session mutations and the
arbitrary-value `save_session()` RPC are removed from authenticated clients in favor of the
server-timestamped lifecycle documented in `docs/TRUSTED_SESSIONS.md`.

Depthly has no backend of its own — Supabase (Postgres + PostgREST + Auth) is the entire
API surface, so Row Level Security policies and `SECURITY DEFINER` RPC functions *are* the
authorization layer. There is no application-layer permission check backing them up. This
doc records the full audit that ran on 2026-08-09, what it found, and the fix that shipped
in `supabase/migrations/012_security_hardening.sql`, so the reasoning survives past the
session that did it.

Anything not in this doc that touches RLS, a `SECURITY DEFINER` function, an Edge Function,
or a webhook handler should be reviewed against the same checklist (below) before it ships.

---

## What was audited

1. **RLS coverage** — for every table with RLS enabled, what does each policy actually let
   through, column-wise (RLS is row-level, not column-level — a policy that grants row
   access grants *every* column on that row).
2. **RLS gaps** — tables with RLS enabled but no policy (inaccessible, safe-but-broken) and
   tables with RLS not enabled at all (open, unsafe).
3. **`SECURITY DEFINER` functions** — do they verify the caller owns the data they're
   about to touch, and is `EXECUTE` scoped to the right Postgres role.
4. **Edge Functions** — service role key usage, whether the client bundle can ever see a
   secret, and whether webhook handlers verify a signature before trusting the payload.
5. **Write paths** — anything bypassing the `save_session()` RPC to write `daily_summaries`
   or `user_stats` directly.
6. **Secrets** — committed to the repo, or leaked into the client bundle (anything without
   the `VITE_` prefix must never reach `src/`).
7. **Client-supplied identity** — any code trusting a client-sent user id instead of
   `auth.uid()` / the server-verified JWT.

How it was actually checked, not just read from the migration files: live `curl` requests
against the anon-key REST endpoint (`$VITE_SUPABASE_URL/rest/v1/...`) for the tables and
RPCs in question, since migration files describe intent but the live database is the only
source of truth for what's actually enforced (see `supabase/migrations/*.sql` headers —
this repo has no CI migration runner, so drift between a migration file and the live
project is possible and has happened before, per migration 010's comment).

---

## Findings and fixes

### 1. CRITICAL — `save_session()` had no ownership check, and was callable unauthenticated

`save_session(p_user_id uuid, ...)` is `SECURITY DEFINER`, so it runs with the function
owner's privileges — full write access to `sessions`, `daily_summaries`, `user_stats`,
`profiles`, `tasks`. Every version of it (migrations 002/006/010) took `p_user_id` as a
plain argument and used it directly in every insert/update, never checking
`p_user_id = auth.uid()`.

On top of that, every migration only ever did `grant execute ... to authenticated` — never
`revoke execute ... from public`. Postgres grants `EXECUTE` on a new function to `PUBLIC` by
default, which includes the `anon` role. Net effect: a fully unauthenticated request could
call `save_session` with an arbitrary `p_user_id` and mutate any real user's session log,
streak, totals, and task pomodoro counts. Confirmed live:

```bash
curl -X POST "$VITE_SUPABASE_URL/rest/v1/rpc/save_session" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -d '{"p_user_id":"<any-uuid>", ...}'
# → executed; only failed on the sessions_user_id_fkey check for a nonexistent id
```

**Fix (migration 012):** `raise exception` at the top of the function body if
`p_user_id is distinct from auth.uid()` — this is the actual fix, and it holds regardless
of who can invoke the function, since an anon request has no `auth.uid()` to match. Verified
live post-migration: an anon-key call now gets rejected with
`"save_session: p_user_id must match the authenticated user"` (`P0001`, HTTP 400) instead of
executing.

Migration 012 also did `revoke execute ... from public` before `grant ... to authenticated`,
on the assumption that a fresh function's only `EXECUTE` grant is the implicit one to
`PUBLIC`. **That assumption turned out to be wrong** — verified live, an anon-key call to
`is_connected_via_follows`/`are_friends_via_follows` still succeeded after 012. Supabase's
project bootstrapping grants `EXECUTE` on every function in the `public` schema directly to
`anon` and `authenticated`, independent of the `PUBLIC` pseudo-role (almost certainly an
`alter default privileges ... grant execute on functions to anon, authenticated` set up when
the project was created) — so revoking from `PUBLIC` left `anon`'s own direct grant
untouched. `save_session` was never actually at risk from this specific gap (its ownership
check covers it either way), but the two helper functions have no such check and are pure
`(viewer_id, target_id) → boolean` lookups, so an anon caller could still probe arbitrary
pairs to learn who's connected to or friends with whom — low severity, but real.

**Migration 013** (`013_revoke_anon_execute.sql`) added the missing `revoke execute ...
from anon` on all three functions to close that. **This caused a live regression**, caught
immediately by re-running the anon curl checklist: `public_profiles` (the view from 012)
calls `is_connected_via_follows(auth.uid(), id)` as one of its own `WHERE`-clause branches,
and the `"user_stats: read if friends via follows"` RLS policy (009) calls
`are_friends_via_follows(auth.uid(), user_id)` the same way. Postgres checks `EXECUTE`
privilege on a function referenced by a query at plan/rewrite time — not lazily per-row
after OR short-circuiting — so revoking `anon`'s execute on either function broke *every*
anonymous query against `public_profiles` or `user_stats`, including rows that never needed
the friends-connection branch at all. Since `public_profiles` backs the public leaderboard
and `PublicProfilePage` — an explicitly no-auth-required route — this meant logged-out
visitors lost the entire public leaderboard and every public profile page, confirmed live
(`"permission denied for function is_connected_via_follows"` / `"...are_friends_via_follows"`
on plain anon reads).

**Migration 014** (`014_restore_anon_execute_for_views.sql`) reverted the `anon` revoke on
both helper functions — `grant execute ... to anon` restored — because a view or RLS policy
has no mechanism to invoke a function on behalf of a role that function is denied to;
`EXECUTE` is checked against the actual querying role, not the view/policy owner. `anon`
needing to call these two functions is therefore structural, not a mistake to fix — the
minor probe-arbitrary-pairs info leak they carry is an accepted tradeoff of the public
leaderboard/profile feature existing at all. `save_session`'s `anon` revoke was unaffected
by this and stays in place: nothing else calls it from inside a view or policy, and its own
ownership check covers it regardless of who can invoke it.

**Checklist takeaway:** every `SECURITY DEFINER` function that writes or reads
identity-sensitive data must check the identity it's operating *as*, not just trust an
argument or assume a grant fence is enough — that's the fix that actually matters. On this
project specifically, `revoke ... from public` is **not sufficient** to lock a function away
from `anon` — Supabase grants `anon`/`authenticated` `EXECUTE` directly at the schema level,
so any lockdown needs an explicit `revoke execute ... from anon`. But before revoking a
function's `anon` access, check whether any view or RLS policy that itself needs to serve
anonymous requests calls that function internally — if so, the revoke will break every
anonymous query through that view/policy, not just direct calls to the function, and the
function's exposure to `anon` has to stay. Verify every grant/revoke change live with an
anon-key curl against the actual affected surfaces (the view/table, not just the RPC) —
this exact sequence (012 → 013 regression → 014 revert) is why.

### 2. CRITICAL — `profiles` RLS exposed billing columns to anonymous reads

`"profiles: read own or public"` was `using (id = auth.uid() or is_public = true)`. RLS
being row-level meant a public row's *entire* row — including `stripe_customer_id`,
`stripe_subscription_id`, `subscription_status`, `subscription_current_period_end` — was
readable by anyone. Confirmed live with a bare anon-key request against
`/rest/v1/profiles`, which returned those fields for public rows.

**Fix (migration 012):** the policy is now owner-only (`id = auth.uid()`), and a new
`public_profiles` view carries the public-facing subset — see below.

### 3. MODERATE — the friends-visibility policy had the same column-exposure problem

`"profiles: read if connected via follows"` (migration 008) granted the same full-row read
to any accepted-or-pending follows connection, so becoming someone's friend (or just sending
them a request) was enough to read their billing columns via a direct REST call, even though
no app code ever selected those columns.

**Fix (migration 012):** dropped this policy along with the `is_public` one; folded into
`public_profiles` (below), which never exposes billing columns to anyone but the row's own
owner reading the base `profiles` table directly.

### 4. MODERATE — `follows` leaked the social graph to anonymous requests

`"follows: read own or public-target"` let anyone — including unauthenticated requests —
read every `follows` row where the *target* was a public profile, regardless of who the
follower was or whether the follower's own profile was private. That exposes a private
user's `follower_id` (and the fact that they follow a specific public user) to the entire
internet. Confirmed live via anon curl. Grepping the app code found no feature reading that
branch — friendship-status checks are always scoped to `auth.uid()` — so it was pure,
unused exposure left over from the table's original one-directional-follow design.

**Fix (migration 012):** policy narrowed to `follower_id = auth.uid() or following_id =
auth.uid()` — only your own relationships, either direction.

### 5. LOW (not fixed — negligible) — webhook signature comparison

`lemonsqueezy-webhook/index.ts`'s `verifySignature()` short-circuits on
`digestHex.length !== signature.length` before the constant-time XOR loop. Since a
HMAC-SHA256 hex digest is always exactly 64 characters, this leaks at most "your string was
or wasn't 64 chars" — not a practically exploitable timing channel. Left as-is.

### Checked clean, no changes needed

- No table has RLS enabled with zero policies, and no table has RLS disabled.
- `storage.objects` avatar policies correctly scope upload/update/delete to
  `split_part(name, '/', 1) = auth.uid()::text`; public read is intentional (avatars are
  meant to be publicly loadable images).
- No client code writes to `daily_summaries` or `user_stats` directly — every reference in
  `src/` is a `.select()`; the only writers are `save_session()` and the (service-role,
  server-side) webhook handler.
- The service role key (`SUPABASE_SERVICE_ROLE_KEY`, `.env.local`, gitignored) is used only
  in `lemonsqueezy-webhook` and local seed scripts — never in anything Vite bundles
  (`VITE_`-prefixed vars are the only ones the client ever sees).
- `create-checkout` and `cancel-subscription` read the user id from the Supabase-verified
  JWT (`supabase.auth.getUser()` inside the Edge Function, not the request body), so a
  client can only ever act on its own account.
- `lemonsqueezy-webhook` verifies `X-Signature` (HMAC-SHA256 of the raw body) before parsing
  anything; `verify_jwt = false` is required and expected for this function since Lemon
  Squeezy can't send a Supabase JWT — the signature check is what stands in for it.
- No component calls `supabase.auth.getUser()` directly — auth state always comes from
  `authStore`, per `CLAUDE.md`; nothing trusts a client-supplied id in place of it.
- `.gitignore` correctly excludes `.env`, `.env.local`, `.env.*.local`; no secret key is
  hardcoded anywhere in `src/`.

---

## The fix: `public_profiles` view

Rather than loosening RLS row-by-row for each thing that needs to read *someone else's*
profile (leaderboard, public profile pages, friend cards, search, pending requests), those
all now read from one view:

```sql
create or replace view public.public_profiles as
select
  id, display_name, avatar_url, profile_slug, is_public,
  current_streak, longest_streak, total_focus_minutes, total_sessions,
  member_since, last_focus_date, show_heatmap_on_profile
from public.profiles
where
  is_public = true
  or id = auth.uid()
  or public.is_connected_via_follows(auth.uid(), id);
```

Because the view is owned by the migration role (which — like any table owner — bypasses
RLS on the underlying table), the view's own `where` clause is the *entire* access rule.
It never selects billing columns, so there's no column for a bad `where` clause to leak —
unlike a row-level policy on the base table, which grants the row and therefore every
column on it. This is the general pattern to reach for whenever "some other users should
see some fields of this row" comes up again: a narrow view with its own filter, not a
broader RLS policy on the table that holds sensitive columns.

`last_focus_date` and `show_heatmap_on_profile` are in the view despite not being in the
original minimal column list, because existing features need them non-negotiably
(`getEffectiveStreak`'s staleness check, and the "should this profile render its heatmap"
gate on `PublicProfilePage`) — both are non-sensitive.

**Client code reading from `public_profiles` instead of `profiles`:**
`fetchProfileBySlug`, `fetchProfileById`, `fetchGlobalLeaderboard`, `fetchAllTimeLeaderboard`,
`fetchUserRank`, `fetchFriendsLeaderboard`, `fetchPendingFriendRequests`,
`searchPublicProfiles` (all in `src/lib/supabase/queries/leaderboard.ts`), plus
`LeaderboardPage.tsx`'s inline `fetchBestStreakLeaderboard`/`fetchCurrentStreakLeaderboard`
and `UserProfileModal.tsx`.

**Still reads the base `profiles` table directly** (unaffected — always scoped to the
caller's own `id = auth.uid()` row): `usePlan.ts`, `settings.ts` (`updateProfile`,
`checkSlugAvailable`, `deleteAccount`), `storage.ts` (avatar upload/delete),
`analytics.ts`'s `fetchProfile`. These need the full row (billing columns included, for
Settings/Billing) and are only ever queried for the signed-in user's own id, so the
owner-only policy covers them correctly.

**PostgREST embedding caveat:** `profiles!inner(...)` embeds (used by the old
`fetchGlobalLeaderboard`/`fetchUserRank`) rely on PostgREST auto-detecting a foreign key —
which it can't do through a view. Anything that used to embed `profiles` via a real table FK
had to be rewritten as two separate queries (fetch the ids, then fetch `public_profiles` by
those ids and join client-side) — the same pattern `fetchFriendsLeaderboard` already used
for an unrelated reason (an inner-join embed silently drops the whole parent row if RLS
can't resolve the joined row).

---

## Checklist for future RLS / RPC changes

Run through this before merging anything that touches a policy, a `SECURITY DEFINER`
function, an Edge Function, or a webhook handler:

1. **Row vs. column.** Does this policy grant a row that has sensitive columns mixed in
   with public-facing ones (billing fields on `profiles` is the canonical example)? If so,
   don't broaden the table's RLS policy — add a narrow view instead.
2. **`SECURITY DEFINER` ownership check.** Does the function verify the identity it's
   about to write/read *as* matches `auth.uid()`, rather than trusting a caller-supplied
   argument?
3. **`EXECUTE` grants.** `grant ... to authenticated` alone does not restrict anything — it's
   additive, not exclusive. On this project, `revoke execute ... from public` is **not
   enough** to keep a function away from `anon` either (learned the hard way on migration
   012/013): Supabase grants `anon`/`authenticated` `EXECUTE` on every `public`-schema
   function directly, not just via `PUBLIC`. If a function shouldn't be callable by `anon`,
   `revoke execute ... from anon` explicitly — but first check whether any view or RLS
   policy that must itself serve anonymous requests calls that function internally
   (`grep` the migrations for the function name). If one does, revoking `anon`'s `EXECUTE`
   breaks *every* anonymous query through that view/policy, not just direct RPC calls to the
   function — `EXECUTE` is checked against the actual querying role at plan time, regardless
   of who owns the view/policy calling it (found the hard way on migration 013, reverted in
   014). Confirm with an anon-key curl against the view/table the function backs, not just
   the RPC endpoint — don't assume the revoke worked from the SQL alone.
4. **Verify live, not just the migration file.** This repo has no CI migration runner —
   migrations are pasted into the Supabase Dashboard by hand (see any migration file's
   header). A migration file describing a fix doesn't mean it's live. Confirm with a curl
   against the actual REST endpoint (anon key for anonymous-access checks, a real user JWT
   for ownership checks) before calling something fixed.
5. **Grep the client for the old access pattern.** Before dropping or narrowing a policy,
   search `src/` for every query that might depend on the branch being removed — this is
   how the friends/pending-request visibility requirements were found before they could
   silently break.
