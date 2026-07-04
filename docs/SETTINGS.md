# Settings — Implementation Reference

## Route

`/settings` → `src/pages/SettingsPage.tsx`

The page stacks six independent section components with no shared state between them.
Max width 720px, centered.

---

## Data layer

### `src/lib/supabase/queries/settings.ts`

| Function | Table | Notes |
|---|---|---|
| `fetchUserPreferences(userId)` | `user_preferences` | `.single()` — row guaranteed by DB trigger |
| `updateUserPreferences(userId, data)` | `user_preferences` | Partial update, returns updated row |
| `updateProfile(userId, data)` | `profiles` | Partial update, returns updated row |
| `checkSlugAvailable(slug, currentUserId)` | `profiles` | Returns `true` if no other user owns the slug |
| `updateEmail(newEmail)` | auth | `supabase.auth.updateUser({ email })` — sends confirmation email |
| `updatePassword(newPassword)` | auth | `supabase.auth.updateUser({ password })` |
| `deleteAccount(userId)` | `profiles` + auth | Deletes profile row (cascades) then signs out |

### `src/lib/supabase/storage.ts`

| Function | Bucket | Notes |
|---|---|---|
| `uploadAvatar(userId, file)` | `avatars` | Validates type (JPEG/PNG/WebP) and size (≤2MB). Path: `avatars/{userId}/avatar.{ext}`. Upserts. Returns public URL. |
| `deleteAvatar(userId)` | `avatars` | Removes all three possible extension paths in one call. Sets `profiles.avatar_url = null`. |

**Manual step required:** The `avatars` bucket must be created in Supabase Dashboard → Storage → New bucket. Name: `avatars`, toggle Public: on.

### `src/lib/queryKeys.ts`

```ts
settingsKeys.preferences(userId)  // ['settings', 'preferences', userId]
settingsKeys.profile(userId)      // ['settings', 'profile', userId]
```

---

## Hooks — `src/hooks/useSettings.ts`

| Hook | Type | Cache behaviour |
|---|---|---|
| `usePreferences()` | query | `settingsKeys.preferences` |
| `useUpdatePreferences()` | mutation | Invalidates `settingsKeys.preferences` + `analyticsKeys.profile` |
| `useUpdateProfile()` | mutation | `setQueryData` on `settingsKeys.profile`; invalidates `['leaderboard']` |
| `useCheckSlugAvailable()` | imperative fn | No cache — called directly on debounced input |
| `useUpdateEmail()` | mutation | Returns `{ ...mutation, successMessage }` |
| `useUpdatePassword()` | mutation | Returns `{ ...mutation, successMessage }` |
| `useUploadAvatar()` | mutation | Invalidates `settingsKeys.profile`; updates `authStore.user.user_metadata.avatar_url` |
| `useDeleteAccount()` | mutation | Clears query cache, sets `authStore.user = null`, navigates to `/login` |

---

## Sections

### ProfileSection — `src/components/settings/ProfileSection.tsx`

**Avatar upload**
- 56px circle with color-coded initial fallback (same algorithm as LeaderboardRow).
- "Upload photo" triggers a hidden `<input type="file">`.
- Validates MIME type and size client-side in `storage.ts` before sending.
- Preview updates immediately after upload via `localAvatarUrl` state (no wait for cache refetch).
- "Remove" button visible only when an avatar URL exists; clears `localAvatarUrl` to `null` immediately.

**Display name**
- Controlled input, max 50 chars.
- Saved only via "Save changes" button.

**Profile slug**
- Validated locally: min 3 chars, `[a-z0-9-]` only.
- Availability checked against DB with 600ms debounce after typing stops.
- Current user's own slug skips the check (always shows idle).
- Shows ✓ Available / ✗ Taken / spinner inline.
- Saved only via "Save changes" button.

**Toggles (auto-save)**
- `is_public` — calls `updateProfile` immediately on change.
- `show_heatmap_on_profile` — disabled with tooltip if `is_public = false`; auto-saves when enabled.

**Save button**
- Enabled only when `displayName` or `slug` has changed AND slug is valid/available.
- Shows "Saved ✓" for 2s after success.

---

### TimerSection — `src/components/settings/TimerSection.tsx`

All fields auto-save with **800ms debounce**. A "Saved" confirmation shows for 2s.

| Field | Control | Range/Options |
|---|---|---|
| Default timer mode | Select | `pomodoro` / `free` |
| Focus duration | Stepper | 5–180 min, step 5 |
| Break duration | Stepper | 1–60 min, step 1 |
| Auto-start break | Switch | boolean |
| Auto-start focus | Switch | boolean |
| Session end sound | Switch | boolean |
| Sound option | Select (visible when sound on) | `bell` / `chime` / `ding` / `none` |

**Stepper note:** The existing `Stepper` component increments by 1. `TimerSection` detects direction from the incoming value and applies the configured step size, so focus steps by 5 and break steps by 1 without modifying the component.

**Stale-closure safety:** A `localRef` always holds the latest state so the debounce closure reads the final snapshot even after rapid changes.

---

### GoalsSection — `src/components/settings/GoalsSection.tsx`

Thin wrapper: section title + divider, then renders `<GoalSettings />` from Phase 6.

`GoalSettings` handles its own data fetching (`useGoals`, `useUpdateGoals`), preset buttons, and explicit save. No additional logic in this wrapper.

---

### NotificationsSection — `src/components/settings/NotificationsSection.tsx`

All fields auto-save with **800ms debounce**.

| Field | Maps to |
|---|---|
| Daily focus reminder toggle | `daily_reminder_enabled` |
| Reminder time (visible when enabled) | `daily_reminder_time` (`string \| null`) |
| Streak reminder toggle | `streak_reminder_enabled` |

`daily_reminder_time` defaults to `'09:00'` if the DB value is null. An empty string is written back to the DB as `null`.

**⚠ Known limitation:** These toggles persist to the database but no push notification service is wired up. Actual browser/mobile notifications are a post-launch feature (Phase 12).

---

### AccountSection — `src/components/settings/AccountSection.tsx`

Two independent sub-cards.

**Change email**
- Shows current email read-only (from `authStore.user.email`).
- Calls `supabase.auth.updateUser({ email })` via `useUpdateEmail`.
- On success: "Check your email to confirm the change" (brand colour).
- **⚠ Note:** Supabase requires the user to click a confirmation link before the new email takes effect. The old email remains active until then.

**Change password**
- Client-side validation: min 8 chars, passwords must match.
- Validation runs before the network call (local error messages, not server errors).
- On success: "Password updated successfully".

---

### DangerZoneSection — `src/components/settings/DangerZoneSection.tsx`

Red-tinted card (`rgba(242,92,92,0.04)` background, `rgba(242,92,92,0.3)` border).

Clicking "Delete account" opens an inline modal (not a separate file) built on shadcn `Dialog`.

**Confirm-delete modal**
- Describes what will be permanently deleted.
- Requires typing `DELETE` (case-sensitive, exact match) to enable the confirm button.
- On confirm: calls `useDeleteAccount` → deletes `profiles` row → signs out → navigates to `/login`.

**⚠ Known limitation (partial deletion):** Deleting the `profiles` row cascades via foreign keys to all user data (sessions, tasks, projects, goals, daily_summaries, user_stats, user_preferences, follows). However, the Supabase **auth user record** in `auth.users` is NOT deleted — that requires service-role access, which is only available in an Edge Function. The account is effectively unusable (no profile row, signed out) but the auth record persists. Full auth deletion is deferred to a `delete-account` Edge Function (post-launch).

---

## Theme toggle

**Not implemented.** The `theme` column in `user_preferences` (`'dark' | 'light'`) is defined in the schema and `UpdatePreferencesInput` accepts it, but no toggle UI exists in the settings page. Light/dark switching is not wired to the CSS layer. Deferred.

---

## Cache invalidation map

| Action | Invalidated keys |
|---|---|
| Update preferences | `settingsKeys.preferences`, `analyticsKeys.profile` |
| Update profile | `settingsKeys.profile` (set directly), `['leaderboard']` |
| Upload avatar | `settingsKeys.profile`, `analyticsKeys.profile`, `authStore.user.user_metadata` |
| Delete avatar | `settingsKeys.profile`, `analyticsKeys.profile`, `authStore.user.user_metadata` |
| Save profile name/slug | `settingsKeys.profile`, `analyticsKeys.profile`, `['leaderboard']` |
| Delete account | entire query cache cleared |
