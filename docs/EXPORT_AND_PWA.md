# Export & PWA — Implementation Reference

## 1. CSV Export Overview

Pro users can export all their focus sessions to a CSV file from the `/sessions` page. The export respects optional date range and project filters, then triggers a browser file download — no server involvement.

**Access:** Pro and Founding plan only. Free users see a locked panel with an upgrade prompt.  
**Location in UI:** `ExportPanel` renders above the sessions list on the `/sessions` page (`src/pages/SessionsPage.tsx`), inside the `totalCount > 0` guard (only shown when the user has at least one session).  
**Header shortcut:** Pro users also get a ghost "Export" button in the page header that smooth-scrolls to the panel.

---

## 2. Export Component

**File:** `src/components/sessions/ExportPanel.tsx`

### Props

| Prop | Type | Description |
|---|---|---|
| `projects` | `Project[]` | Full project list for the project filter dropdown. Sourced from `useProjects()` in the parent. |
| `totalCount` | `number` | Total session count from `useSessionsPaginated`, displayed as the approximate export count. |

### Layout Sections

**Header row** (flex, space-between):
- Left: brand-blue Download icon (18px) + "Export Sessions" title (15px/600) + blue-tinted "CSV" badge
- Right: "Export CSV" primary button with Download icon; shows loading spinner while `isExporting`

**Divider:** 1px `#2E2E38` line

**Filters row** (flex, gap 16px, align flex-end):
- **From** — native `<input type="date">`, width 148px
- **To** — same; `min` is set to the From value so the To date can't precede From
- **Project** — shadcn `Select` with "All projects" option plus one item per project, min-width 180px
- **Session count** (margin-left auto, right-aligned): tilde prefix (13px ink-muted) + JetBrains Mono number (28px/600). Shows `0` in ink-muted when `totalCount` is 0.

### Pro Gate Behavior

When `isPro` is `false` the component renders a compact locked banner instead of the full panel:
- Lock icon + "CSV export is a Pro feature" message
- "Upgrade to Pro" primary button → opens `UpgradeModal` with `trigger='export'`
- The full filter UI is never mounted for free users

---

## 3. Export Data Flow

```
User clicks "Export CSV"
  └─ handleExport() in ExportPanel
       └─ exportSessions({ startDate, endDate, projectId })
            └─ useExportSessions() (useMutation)
                 └─ fetchSessionsForExport(userId, filters)   [Supabase query]
                      └─ onSuccess: sessions[]
                           ├─ convertSessionsToCSV(sessions)  → CSV string
                           ├─ generateExportFilename(startDate, endDate) → filename
                           └─ downloadCSV(csv, filename)       → browser download
```

### Query Filters Applied (`fetchSessionsForExport`)

- Always filters: `user_id = userId`, `type = 'focus'` (breaks are excluded)
- Always orders: `started_at DESC` (newest first)
- No row limit — all matching sessions are fetched
- If `startDate` provided: `started_at >= startDate` (YYYY-MM-DD, interpreted as start of day UTC)
- If `endDate` provided: `started_at <= endDate + 'T23:59:59'` (covers the full end day)
- If `projectId` provided: `project_id = projectId`

The `totalCount` shown in the panel is an approximation from `useSessionsPaginated` — it reflects the total across all pages for the current user, not the post-filter count. Exact counts are not pre-calculated before export.

---

## 4. CSV Format

### Column Order

```
date, project, task, type, duration_mins, started_at, ended_at, notes
```

### Column Definitions

| Column | Type | Content |
|---|---|---|
| `date` | `YYYY-MM-DD` | Session start date in the **user's local timezone** (via `en-CA` locale) |
| `project` | string | Project name, or `No project` if unassigned |
| `task` | string | Task title, or `No task` if unassigned |
| `type` | string | Always `Focus` (breaks are excluded from export) |
| `duration_mins` | integer | Session duration in whole minutes |
| `started_at` | `YYYY-MM-DD HH:MM` | Start time converted to user's **local timezone** |
| `ended_at` | `YYYY-MM-DD HH:MM` | End time in local timezone; **empty string** if null |
| `notes` | string | Session notes; **empty string** if null or empty |

### Empty Value Handling

- `ended_at` null → empty field (no trailing comma artifacts; the join always produces exactly 8 fields)
- `notes` null or `''` → empty field
- Missing project → literal string `No project`
- Missing task → literal string `No task`

### Special Character Escaping

Any value containing a comma, newline, or double quote is wrapped in double quotes. Internal double quotes are doubled (`""`). This is standard RFC 4180 CSV escaping.

### Timestamp Format

Timestamps are converted from UTC ISO strings to the user's local time:

```
Raw (DB):  2026-06-29T15:29:00+00:00
CSV:       2026-06-29 17:29            (if user is UTC+2)
```

Format: `YYYY-MM-DD HH:MM` (24-hour, no seconds).

### Filename Format

| Filters | Filename |
|---|---|
| No filters | `depthly-sessions-2026-07-05.csv` (today's date) |
| Start date only | `depthly-sessions-from-2026-06-01.csv` |
| Both dates | `depthly-sessions-2026-06-01-to-2026-06-30.csv` |
| Project filter only | `depthly-sessions-2026-07-05.csv` (date only; project not in filename) |

---

## 5. Export Utility Functions

**File:** `src/lib/utils/export.ts`

### `convertSessionsToCSV(sessions: SessionWithRelations[]): string`

Converts a sessions array to a complete CSV string including the header row.

```
Input:  SessionWithRelations[]
Output: "date,project,task,type,duration_mins,started_at,ended_at,notes\n
         2026-06-29,My Project,Write report,Focus,45,2026-06-29 17:29,2026-06-29 18:14,\n
         ..."
```

Internally uses `escapeCSVValue` (private) for string fields and `formatLocalDateTime` (private) for timestamps.

### `downloadCSV(content: string, filename: string): void`

Triggers a browser file download without any server round-trip.

1. Creates a `Blob` with `type: 'text/csv'`
2. Creates an object URL via `URL.createObjectURL`
3. Appends a temporary `<a>` element, sets `href` and `download`, clicks it
4. Immediately revokes the object URL to free memory

### `generateExportFilename(startDate?: string, endDate?: string): string`

Produces a descriptive filename based on which date filters are active.

```
generateExportFilename()                         → "depthly-sessions-2026-07-05.csv"
generateExportFilename("2026-06-01")             → "depthly-sessions-from-2026-06-01.csv"
generateExportFilename("2026-06-01","2026-06-30")→ "depthly-sessions-2026-06-01-to-2026-06-30.csv"
```

---

## 6. PWA Configuration

**Plugin:** `vite-plugin-pwa` v1.x (`VitePWA` from `vite-plugin-pwa`)  
**Config file:** `vite.config.ts`

### Web App Manifest

| Field | Value |
|---|---|
| `name` | Depthly |
| `short_name` | Depthly |
| `description` | Focus session tracker for students, freelancers, and developers |
| `theme_color` | `#0D0D10` (app background — matches the dark chrome UI) |
| `background_color` | `#0D0D10` (splash screen background) |
| `display` | `standalone` (no browser chrome when installed) |
| `orientation` | `portrait` |
| `scope` | `/` |
| `start_url` | `/` |

The manifest is generated at build time as `dist/manifest.webmanifest`. A static fallback copy also lives at `public/manifest.json`.

### Icons Declared in Manifest

| File | Size | Purpose |
|---|---|---|
| `public/icons/icon-192.png` | 192×192 | Standard PWA icon |
| `public/icons/icon-512.png` | 512×512 | Large icon + maskable |

The 512px icon has `"purpose": "any maskable"` — it is used both as the standard high-res icon and as the maskable icon (safe-zone assumed to be the full image; a real maskable icon should have padding).

### Service Worker

- **Mode:** `generateSW` (Workbox generates the SW automatically; no custom SW file needed)
- **Registration:** `autoUpdate` — the SW updates silently in the background without prompting the user
- **App shell precache:** all `*.{js,css,html,ico,png,svg}` files from the build output (~10 entries, ~1.3 MB at time of writing)

### Runtime Caching

| Pattern | Strategy | Cache name | Max entries | TTL |
|---|---|---|---|---|
| `https://*.supabase.co/*` | NetworkFirst | `supabase-cache` | 50 | 24 hours |

`NetworkFirst` means the SW always tries the network first. If the network fails (offline), it falls back to the cached response. Stale entries are evicted after 24 hours or when the cache exceeds 50 entries.

### `index.html` PWA Meta Tags

```html
<meta name="theme-color" content="#0D0D10" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-title" content="Depthly" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
```

These cover Safari/iOS "Add to Home Screen" behaviour. `apple-mobile-web-app-capable` enables standalone mode on iOS (Safari does not read the manifest `display` field).

### Icons Required Before Production Launch

The current icons in `public/icons/` are generated placeholders (dark square with a blue "D", created by `scripts/generate-icons.ts` using `sharp`). Replace them with real branded assets before shipping:

| File to replace | Required size | Notes |
|---|---|---|
| `public/icons/icon-192.png` | 192×192 px | Standard PWA / Android home screen |
| `public/icons/icon-512.png` | 512×512 px | High-res + Google Play PWA store listing |
| `public/apple-touch-icon.png` | 180×180 px | iOS "Add to Home Screen" (referenced in `includeAssets`) |
| `public/favicon.ico` | 32×32 (multi-size `.ico`) | Browser tab fallback (referenced in `includeAssets`) |

For the 512px maskable icon, content should stay within the central 80% of the canvas (the "safe zone") so the OS can crop it into any shape (circle, squircle, etc.) without clipping the logo.

---

## 7. PWA Testing

### Local test procedure

```bash
npm run build       # must build first — the SW is not active in dev mode
npm run preview     # serves dist/ on http://localhost:4173
```

Open `http://localhost:4173` in Chrome.

### Manifest

Chrome DevTools → **Application** tab → **Manifest** section:
- Verify name, short name, theme color, background color display correctly
- Verify both icons render in the icon preview
- No manifest parse errors shown

### Service Worker

Chrome DevTools → **Application** tab → **Service Workers**:
- Scope should be `http://localhost:4173/`
- Status should show **activated and running**
- Check **Update on reload** during development to force SW refresh

### Install prompt

Chrome address bar shows an install icon (⊕) when the PWA criteria are met. Click it to test the install flow. On mobile, use "Add to Home Screen" from the browser menu.

### Offline behaviour

With the SW registered:
1. DevTools → Network tab → set throttling to **Offline**
2. Reload the page — the app shell should still load from the precache
3. Supabase API calls will fall back to the `supabase-cache` (responses cached from the last online session, up to 24 h old)

---

## 8. Known Limitations

**Export**

- **Session count is approximate.** The `~N sessions` shown in the panel comes from `useSessionsPaginated`'s `totalCount`, which counts all user focus sessions regardless of the active export filters. After applying date/project filters the actual row count in the downloaded CSV may be lower.
- **Breaks are always excluded.** `fetchSessionsForExport` hard-filters `type = 'focus'`. There is no option to export break sessions.
- **Stats not recalculated on export.** If sessions were manually edited (duration, timestamps) via the Sessions page, the exported `duration_mins` reflects the edited values, but `daily_summaries` and `user_stats` aggregates may still show the original values (known limitation of the manual edit flow — see `sessions.ts` `updateSession` comment).
- **Project filter in filename not reflected.** When a project filter is active but no date range is set, the filename is `depthly-sessions-YYYY-MM-DD.csv` and does not include the project name.
- **No error UI on export failure.** If `fetchSessionsForExport` throws (network error, Supabase error), the mutation fails silently — `isExporting` returns to false and nothing happens. A toast notification on error would improve UX.

**PWA**

- **Icons are placeholders.** The current `icon-192.png` and `icon-512.png` are auto-generated dark squares with a blue "D". They must be replaced with real branded icons before production launch.
- **Single purpose flag on 512px icon.** The manifest declares `"purpose": "any maskable"` on the 512px icon. This is acceptable but ideally separate `any` and `maskable` entries should be provided with a properly padded maskable variant.
- **No push notifications.** The SW is configured for caching only. PWA push notifications (e.g. focus reminders, streak alerts) are not implemented.
- **PWA not active in dev mode.** `vite-plugin-pwa` only registers the service worker in the production build (`npm run build` + `npm run preview`). Running `npm run dev` will not activate the SW.
- **iOS standalone limitations.** `apple-mobile-web-app-capable` enables standalone mode on iOS, but iOS Safari does not support the full PWA install flow (no beforeinstallprompt event). Users must manually "Add to Home Screen".
