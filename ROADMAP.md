# Depthly — Product Roadmap

---

## Current Version: V1 (In Progress)

**Status:** Deployed at https://getdepthly.com
**Blocking:** Lemon Squeezy verification pending

### V1 Remaining Tasks
- [ ] Lemon Squeezy checkout wired
- [ ] Custom domain configured
- [ ] Public launch (Reddit, X/Twitter)

---

## V1.5 — First Post-Launch Release
**Target:** 2-4 weeks after V1 launch
**Theme:** Daily life management

---

### Feature 1: Daily Tasks (Recurring Routines)

**What it is:**
A separate task list for recurring daily activities
that reset every midnight. Separate from project
tasks — designed for life management and habits.

**Why it matters:**
Many users have daily routines (exercise, reading,
journaling) that don't belong to any project but
still need tracking. Current task system requires
manually recreating these every day.

**User story:**
"As a user, I want a daily checklist that
automatically resets each morning so I can
track my daily routines without managing
them as project tasks."

---

#### Data Model

```sql
-- Recurring task definitions (the template)
CREATE TABLE daily_task_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) 
                  ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  order_index     FLOAT NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  color           TEXT DEFAULT '#4B9EFF',
  icon            TEXT DEFAULT '✓',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Daily completion records (one per task per day)
CREATE TABLE daily_task_completions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id     UUID NOT NULL 
                  REFERENCES daily_task_templates(id)
                  ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id)
                  ON DELETE CASCADE,
  completed_date  DATE NOT NULL,
  completed_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(template_id, completed_date)
);

-- RLS
ALTER TABLE daily_task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_task_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_templates" ON daily_task_templates
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_completions" ON daily_task_completions
  FOR ALL USING (auth.uid() = user_id);
```

---

#### Pages & Routes

**New route:** `/daily`
**Sidebar:** "Daily" nav item with CalendarCheck icon

---

#### UI Sections

**1. Today's Daily Tasks (main view)**

```
Daily Tasks                    Tuesday, Jul 8
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Progress: 2 / 5 completed  [████░░░░░░] 40%

☐  Morning workout
☐  Read 30 minutes
☑  Review emails              ← completed today
☑  Drink 8 glasses of water   ← completed today
☐  Evening journal

+ Add daily task
```

Each task row:
- Circle checkbox (brand color when checked)
- Task title (strikethrough when done)
- Drag handle for reordering
- Three-dot menu: Edit, Delete

**2. Weekly History Grid (below task list)**

Shows completion history for the last 7 days:

```
              Mon  Tue  Wed  Thu  Fri  Sat  Sun
Morning workout ✓    ✓    ✗    ✓    ✓    ✗    ✓
Read 30min      ✓    ✓    ✓    ✓    ✗    ✗    ✓
Review emails   ✓    ✓    ✓    ✓    ✓    ✓    ✓
```

✓ = completed (brand color)
✗ = not completed (depth-raised, muted)
Today's column: highlighted with brand border

**3. Monthly Calendar View (toggle)**

Similar to analytics monthly heatmap but
shows completion rate per day (0-100%):
- 100%: full brand color
- 50-99%: partial opacity
- 0%: depth-raised (empty)

---

#### Components Needed

```
src/
  pages/
    DailyTasksPage.tsx
  components/
    daily/
      DailyTaskList.tsx       (today's checklist)
      DailyTaskRow.tsx        (single task row)
      DailyTaskModal.tsx      (create/edit)
      DailyWeeklyGrid.tsx     (7-day history grid)
      DailyMonthCalendar.tsx  (monthly view)
      DailyProgressBar.tsx    (X/Y completed today)
  lib/
    supabase/
      queries/
        dailyTasks.ts         (CRUD + completions)
  hooks/
    useDailyTasks.ts          (queries + mutations)
```

---

#### Key Behaviors

1. **Auto-reset:** Tasks are never "permanently done"
   — completions are date-specific. Each new day
   all tasks appear unchecked automatically.

2. **Completion toggle:** Checking a task inserts
   a row in daily_task_completions for today's date.
   Unchecking deletes that row.

3. **History preserved:** Past completions are never
   deleted — only today's state is interactive.

4. **Order persists:** Tasks maintain user-defined
   order via order_index (float, same as project tasks).

5. **No project link:** Daily tasks are completely
   separate from projects and sessions. They are
   life management, not work tracking.

6. **Timer link (optional, V2):** In a future version,
   starting a focus session could optionally be linked
   to a daily task to track time per habit.

---

#### Free vs Pro Limits

- Free: up to 5 daily task templates
- Pro: unlimited daily task templates
- History: free sees last 7 days, Pro sees all-time

---

#### Analytics Integration

Add to Analytics page — Daily view:
- "Daily Tasks" section below sessions timeline
- Shows today's completion rate
- Small grid showing this week's daily task performance

---

#### Completion Streak (V2 upgrade)

After V1.5 ships and users are using daily tasks,
add per-task streaks:
- Each template tracks its own streak
- "Morning workout — 🔥 14 day streak"
- Displayed on the task row
- Shown on the weekly grid header

---

### Feature 2: Import Tasks with AI

**What it is:**
User copies a pre-written prompt, pastes it into
any AI tool (ChatGPT, Claude, etc.), pastes the
returned JSON back into Depthly for bulk task import.

**Why it matters:**
Users can describe a project in natural language
and get a structured task list instantly. No AI
API cost on Depthly's side.

**Flow:**
1. User clicks "Import with AI" in a project
2. Depthly shows a pre-written prompt to copy
3. User pastes prompt into their AI tool of choice
4. AI returns structured JSON
5. User pastes JSON back into Depthly
6. Depthly validates and imports tasks in bulk

**JSON Schema:**
```json
[
  {
    "title": "Set up project repository",
    "description": "Initialize git repo and configure CI",
    "priority": "high",
    "due_date": "2026-07-15",
    "estimated_pomodoros": 2
  }
]
```

**Status:** Designed, not yet built. Defer to V2.

---

## V2 — Growth Release
**Target:** 2-3 months after V1 launch
**Theme:** Social + Advanced analytics

- [ ] Habit streaks per daily task
- [ ] Import Tasks with AI
- [ ] Monthly PDF reports
- [ ] Total time per task (sessions by task_id)
- [ ] Challenges system (like Kairu)
- [ ] Public sharing of yearly heatmap
- [ ] Streak sharing card (shareable image)
- [ ] Friends system improvements
- [ ] Notification service (email reminders)
- [ ] Account deletion Edge Function

---

## V3 — Scale Release
**Target:** 6+ months after launch
**Theme:** Platform

- [ ] Native mobile app (iOS + Android)
- [ ] Team workspaces
- [ ] Integrations (Notion, Linear, GitHub)
- [ ] API for developers
- [ ] White-label option

---

## Deferred / Parking Lot

Features discussed but explicitly not scheduled:

- Dark/light theme toggle (CSS vars issue, revisit)
- Country leaderboard filter (like Kairu)
- Challenges system (needs more design thought)
- Browser extension (too complex for now)
- Desktop app (Electron/Tauri — post V3)

---

## Decision Log

| Decision | Reason |
|---|---|
| Lemon Squeezy over Stripe | Stripe not available for direct merchant accounts in Morocco |
| No native app in V1 | PWA is sufficient, doubles surface area |
| No team features in V1 | Solo founder focus, kills complexity |
| Daily tasks as V1.5 not V1 | Don't delay launch for new features |
| Import with AI deferred | Nice to have, not blocking revenue |

