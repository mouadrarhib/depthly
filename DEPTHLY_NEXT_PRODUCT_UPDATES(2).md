# Depthly — Next Product Updates

## Purpose

This document defines the next two product updates for Depthly. The changes are intended to improve trust in analytics/leaderboards, make progress shareable, and integrate daily goals more directly into Analytics.

---

## Update 1 — Session Integrity + Shareable Analytics

### Goal

Focus time used by Analytics, Leaderboards, and future Challenges should represent real sessions tracked through the Depthly timer rather than manually entered focus time.

### Session changes

Remove the normal session CRUD workflow.

#### Remove
- Manual session creation.
- Editing a saved session's duration.
- Editing a saved session's start/end date or time.
- Any ability to manually increase focus time that affects Analytics, Leaderboards, or Challenges.

#### Saved sessions

A focus session should be created by the Depthly timer and treated as an immutable focus record after it is saved.

If useful, safe metadata may remain editable:
- Project
- Task
- Session title
- Notes

These fields must not change the session's verified focus duration or timestamp.

#### Deletion

Prefer not to hard-delete tracked sessions from the normal UI.

If users need to remove an accidental session, consider an `excluded`/`invalidated` state instead. An excluded session must not count toward:
- Analytics totals
- Streaks
- Goals
- Leaderboards
- Future Challenges

The exact exclusion implementation can be decided based on the existing database architecture.

### Server-side integrity

Do not rely only on hiding buttons in the frontend.

Competitive/tracked focus must be protected at the database/RPC layer so a client cannot fake a timer session by directly submitting arbitrary duration/date values.

Review the existing `save_session` RPC and session write paths before implementation.

### Share Progress

Add a **Share Progress** action to Analytics.

Supported periods:
- Daily
- Weekly
- Monthly
- Yearly

Generate a branded Depthly image/card using the selected period's real analytics.

Possible information:
- Depthly branding
- Period/date
- Total focus time
- Number of focus sessions
- Streak where relevant
- Goal progress where relevant
- Top project / project breakdown where useful
- `getdepthly.com`

The generated image should be suitable for sharing on social platforms and messaging apps.

The share card must use the same underlying analytics data as the Analytics UI rather than maintaining separate statistics.

---

## Update 2 — Daily Goal in Analytics

### Goal

Integrate the existing daily focus goal directly into the **Daily** Analytics view.

### Daily Analytics UI

Show the selected day's focus progress against the user's daily goal.

Example:

`2h 10m / 3h goal — 72%`

Include a clear visual indicator such as a progress bar or progress ring.

States:

**Goal in progress**
- Show current focus / target.
- Show completion percentage.

**Goal completed**
- Clearly indicate that the daily goal was reached.

**No goal configured**
- Show a `Set daily goal` action.

### Existing goal system

Reuse the existing Depthly goal data and hooks. Do not create a second goal system specifically for Analytics.

Daily Analytics should combine:
- The selected day's focus total.
- The user's configured daily goal.

### Past dates

When navigating to a past day, Analytics can display that day's focus relative to the configured goal.

Avoid presenting past-day Analytics as a way to retroactively modify historical focus data.

---

## Product Direction

These updates are foundations for future **Depthly Challenges**.

The intended trust model is:

`Depthly Timer → Trusted Session → Analytics/Goal Progress → Shareable Progress → Leaderboard/Challenges`

Future competitive features should only count focus time that satisfies the trusted-session rules.

## Implementation Priority

1. Audit current session create/edit/delete and aggregation paths.
2. Implement session-integrity rules at the server/database level.
3. Update Sessions UI to match the new restrictions.
4. Add Daily Goal to Daily Analytics.
5. Build reusable analytics share-card generation.
6. Verify Analytics, streaks, goals, leaderboards, exports, and future challenge calculations use the intended valid sessions.
7. Regression-test timer saving and analytics aggregation before release.

---

## Update 3 — Custom Group Leaderboards

### Goal

Allow a Depthly user to create a private/group leaderboard, invite other people, and rank members using trusted focus time. This should create a social growth loop around studying and focused work without requiring every participant to become friends first.

### V1 Flow

1. User clicks **Create Leaderboard**.
2. Creator configures:
   - Leaderboard name
   - Period: Daily / Weekly / Monthly
   - Optional focus goal
   - Visibility: start with private / invite-only
3. Depthly generates a unique invite link or code, for example `depthly.com/join/ABC123`.
4. Creator shares the invite.
5. Recipient opens the link, sees basic leaderboard information, authenticates if necessary, and clicks **Join leaderboard**.
6. Joined members are ranked by eligible focus time for the configured period.

### Session Integrity

Only trusted sessions recorded through the Depthly timer should count toward custom leaderboard rankings.

Manual or manipulated focus time must not affect:
- Custom leaderboards
- Global leaderboards
- Future Challenges

This feature therefore depends on the session-integrity work defined in Update 1.

### Creator Controls — V1

Creator should be able to:
- Create the leaderboard.
- Copy/share the invite link.
- View members and rankings.
- Remove members.
- Close/delete the leaderboard.

Participants should be able to:
- Join through an invite.
- View the ranking.
- Leave the leaderboard.

Avoid chat, teams, prizes, moderators, custom scoring, badges, and other complex community features in V1.

### Free vs Pro

#### Free
- Create 1 active custom leaderboard.
- Join unlimited leaderboards.
- Invite approximately 10–20 members per leaderboard.
- Basic ranking and invite sharing.

#### Pro
- Create multiple/unlimited leaderboards.
- Higher member limits.
- More period/customization options.
- Advanced group analytics.
- Leaderboard history.
- Future advanced Challenge creation features.

Joining a leaderboard should remain free. The basic creation flow should not initially require a subscription because leaderboard creation itself is a user-acquisition mechanism.

### Leaderboards vs Challenges

Keep these concepts separate:

- **Leaderboard:** an ongoing group ranking.
- **Challenge:** a competition with a defined start/end date and potentially a target, e.g. `30 focused hours in 7 days`.

Do not build both systems initially. Build Custom Group Leaderboards first and design the data model so future Challenges can reuse the membership and trusted-ranking foundation.

### Product Growth Loop

The intended loop is:

`Create leaderboard → Share invite → Friends join Depthly → Focus together → Share progress → More groups are created`

Custom leaderboards, trusted timer sessions, and shareable analytics should work together as the social foundation of Depthly.

---

## Update 4 — Landing Page Positioning

### Product identity

Depthly must keep **individual focus and personal productivity as its core identity**. Social features should extend the product, not replace the individual experience.

### Core positioning

> **Focus deeply. Track your progress. Go further together.**

### Two product layers

**Personal core**
- Focus timer
- Daily goals
- Projects and tasks
- Analytics
- Streaks
- Personal progress

**Optional social layer**
- Share progress
- Friends
- Custom group leaderboards
- Future challenges

A user should receive strong value from Depthly even if they never use the social features.

### Landing page direction

Reposition the landing-page story around:

`Focus → Goals → Progress → Share → Compete together`

Recommended changes:
- Update the hero around deep focus and measurable personal progress, with social accountability as an extension.
- Highlight trusted timer-tracked focus.
- Showcase Daily Goals together with Analytics.
- Add Share Progress cards once implemented.
- Promote Custom Group Leaderboards as an optional social/accountability feature.
- Keep Projects & Tasks, but do not make them the main marketing differentiator.
- Update pricing messaging when custom leaderboards ship: Free can create 1 active leaderboard; Pro receives expanded capabilities.
- Remove/reduce the public landing-page intro delay so visitors see the value proposition immediately.
- Fix the existing small-mobile hero clipping/alignment issue.

### Positioning principle

Do **not** turn Depthly into a social app that happens to have a timer. It remains a personal deep-focus/productivity product first, with social features providing additional motivation, accountability, sharing, and organic growth.
