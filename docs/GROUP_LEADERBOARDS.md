# Group Leaderboards

## Overview

Group leaderboards are private, invite-only focus circles. They are separate from
Challenges: a group has a recurring Daily, Weekly, or Monthly reset and no custom
start/end date. Rankings use trusted, non-excluded focus sessions only.

## Data and deployment

Apply `supabase/migrations/017_group_leaderboards.sql` after migration 016, then deploy
the generated client types and UI. The migration creates `group_leaderboards` and
`group_leaderboard_members`. Direct table access is revoked; all reads and writes use
scoped RPCs.

Free creators may own 1 active group with 15 total active members. Pro and Founding
creators may own 10 active groups with 100 members each. Limits include the creator,
are locked during mutations, and are enforced inside creation/join RPCs. Joining is
free and does not require public-profile or global-leaderboard eligibility.

## Trusted scoring

The creator's IANA timezone is captured at creation and defines shared period bounds.
An active member's score is the sum of sessions that are focus sessions, trusted,
not excluded, completed inside the current group period, and completed after that
membership's `joined_at`. Ties share the same rank; deterministic join/user ordering
stabilizes their display order. The optional goal is per member and never changes rank.

Closing is permanent. `close_group_leaderboard()` snapshots every active member's
current score and session count in the same transaction, disables the invite, and
releases the creator's active slot. Members retain read-only access to the frozen result.

## Membership and privacy

Invite preview is the only anonymous RPC and exposes only the group name, creator name,
period, goal, status, and capacity. Rankings and group details require active membership.
Group membership exposes another member's display name/avatar within that group only;
it does not unlock their private profile elsewhere.

Creators cannot leave or remove themselves. A participant who leaves may rejoin through
an active invite and starts scoring from the new join time. A creator-removed member is
blocked from rejoining in V1.

## Routes

- `/leaderboard/groups` — authenticated group list and creation
- `/leaderboard/groups/:id` — authenticated member ranking and controls
- `/join/:code` — public invite preview and explicit join action

Password and Google authentication preserve a sanitized internal `next` path so invite
visitors return to the preview. External or malformed redirect targets fall back to
`/dashboard`.

## Refresh behavior

Rankings refetch every 60 seconds and on window focus. Timer completion and session
exclusion/restoration invalidate group leaderboard queries immediately for the current
client. Membership and closure mutations invalidate the complete group query family.

## Deferred

Chat, teams, prizes, moderators, badges, invite approval/rotation, reopening, hard
deletion, historical period browsing, advanced analytics, and Challenges are not V1.
