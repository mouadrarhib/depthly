// Seeds ~20 synthetic public profiles with realistic session history so the
// leaderboard and public profile pages (/leaderboard, /u/:slug) aren't empty
// at launch. UNLIKE scripts/seed-leaderboard-users.ts and seed-demo-users.ts
// (both explicitly DEV ONLY), this script is meant to be run once against the
// real production Supabase project.
//
// Run: npx tsx scripts/seed-production-leaderboard.ts
//
// Requires SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY
// in .env or .env.local, pointed at whichever project you want seeded — the
// service role key is required because we write across multiple users' rows
// and bypass RLS. As a deliberate guard against running this by accident,
// you must also set SEED_CONFIRM=yes-seed-production in the environment.
//
// What this does, per synthetic user:
//   - creates a Supabase Auth user (random unguessable password, discarded —
//     nobody can log into these accounts)
//   - sets profiles.is_public = true, is_seed_account = true, a clean
//     display name / slug, and a staggered member_since date
//   - generates realistic session history through the save_session() RPC
//     (SECURITY DEFINER), per this repo's rule that daily_summaries /
//     user_stats / profiles stats are never written directly from client
//     code — this keeps streaks, heatmaps, and period totals internally
//     consistent, unlike scripts/seed-leaderboard-users.ts which pokes fake
//     numbers directly into profiles/user_stats
//
// What this deliberately skips (not needed just to populate the leaderboard):
//   - projects/tasks — sessions attach to project_id/task_id = null, same as
//     a real user who never organizes their work into projects
//   - billing/subscription rows — every seeded profile stays on the default
//     'free' plan, so seeded accounts can never pollute real revenue/plan
//     metrics or need LemonSqueezy-side bookkeeping
//
// is_seed_account (supabase/migrations/011_add_is_seed_account.sql) is NOT
// used to filter these rows out of the leaderboard/friends/search queries —
// the whole point is that they display identically to real users. It exists
// so a future admin/metrics view can exclude them, and so they can be
// bulk-deleted later once organic signups make seeding unnecessary:
//   delete from auth.users where id in
//     (select id from profiles where is_seed_account = true);
// (deleting the auth.users row cascades to profiles and everything below it)
//
// Idempotency: safe to re-run. Auth-user creation resolves an existing user
// by email and reuses it; if that profile already has total_focus_minutes >
// 0 (i.e. sessions were already seeded for it), session generation is
// skipped for that user on the re-run so you don't double its history.

import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import type { Database } from '../src/types/database'

// ============================================================================
// Env loading — mirrors scripts/seed-leaderboard-users.ts
// ============================================================================

const __dirname = dirname(fileURLToPath(import.meta.url))

function parseEnv(filePath: string): Record<string, string> {
  const env: Record<string, string> = {}
  try {
    const content = readFileSync(filePath, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      let val = trimmed.slice(eqIdx + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      env[key] = val
    }
  } catch {
    // file not found — caller handles missing keys
  }
  return env
}

const env = {
  ...process.env,
  ...parseEnv(join(__dirname, '..', '.env')),
  ...parseEnv(join(__dirname, '..', '.env.local')),
}

const SUPABASE_URL = env['SUPABASE_URL'] ?? env['VITE_SUPABASE_URL']
const SERVICE_KEY = env['SUPABASE_SERVICE_ROLE_KEY']

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error(
    'Missing required env vars. Set SUPABASE_URL (or VITE_SUPABASE_URL) and ' +
      'SUPABASE_SERVICE_ROLE_KEY in .env or .env.local before running this script.',
  )
}

if (env['SEED_CONFIRM'] !== 'yes-seed-production') {
  throw new Error(
    'Refusing to run without an explicit confirmation. This script writes real rows to ' +
      `whichever Supabase project SUPABASE_URL points at (currently ${SUPABASE_URL}). ` +
      'Re-run with SEED_CONFIRM=yes-seed-production set once you have confirmed that URL ' +
      'is the project you actually want seeded.',
  )
}

const supabase = createClient<Database>(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ============================================================================
// Small helpers — same shape as seed-demo-users.ts
// ============================================================================

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick<T>(arr: readonly T[]): T {
  return arr[randomInt(0, arr.length - 1)]
}

function chance(p: number): boolean {
  return Math.random() < p
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function dateFromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function isWeekend(date: Date): boolean {
  const day = date.getUTCDay()
  return day === 0 || day === 6
}

function randomTimeOnDay(key: string, hour: number): Date {
  const base = dateFromKey(key)
  base.setUTCHours(hour, randomInt(0, 59), 0, 0)
  return base
}

function addMinutes(date: Date, mins: number): Date {
  return new Date(date.getTime() + mins * 60_000)
}

function randomPassword(): string {
  return randomBytes(24).toString('hex')
}

// ============================================================================
// Auth user creation
// ============================================================================

async function resolveUserIdByEmail(email: string): Promise<string | null> {
  let page = 1
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error || !data) return null
    const hit = data.users.find((u) => u.email === email)
    if (hit) return hit.id
    if (data.users.length < 200) return null
    page += 1
  }
}

async function ensureAuthUser(email: string, displayName: string): Promise<string> {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: randomPassword(),
    email_confirm: true,
    user_metadata: { full_name: displayName },
  })

  if (!error) return data.user.id

  if (error.message.toLowerCase().includes('already')) {
    const existingId = await resolveUserIdByEmail(email)
    if (existingId) return existingId
  }
  throw new Error(`Failed to create/resolve auth user ${email}: ${error.message}`)
}

// ============================================================================
// save_session RPC wrapper
// ============================================================================
// NOTE: src/types/database.ts's generated `Functions` type predates
// supabase/migrations/002_save_session_rpc.sql, so save_session isn't in the
// generated types yet — same gap noted in seed-demo-users.ts. The cast below
// is scoped to this one call for that reason.
//
// p_local_date was added by migration 006 (re-asserted by 010) and is
// REQUIRED — PostgREST resolves RPC calls by exact named-parameter signature,
// so a call missing it 404s with "Could not find the function" rather than
// falling back to an older overload. Verified directly against the live
// project before writing this: calling save_session with only the original
// 9 params fails; the function's real signature takes 10. Pass the same
// calendar-day key used to generate the session as p_local_date (the function
// uses it as "today" for streak/period-key math, mirroring what a client
// would send for the user's local date).

interface SaveSessionArgs {
  p_user_id: string
  p_project_id: string | null
  p_task_id: string | null
  p_type: 'focus' | 'break'
  p_duration_mins: number
  p_started_at: string
  p_ended_at: string
  p_timer_mode: string
  p_notes: string | null
  p_local_date: string
}

type SaveSessionRpc = (
  fn: 'save_session',
  args: SaveSessionArgs,
) => PromiseLike<{ error: { message: string } | null }>

async function saveSession(args: SaveSessionArgs) {
  const { error } = await (supabase.rpc as unknown as SaveSessionRpc)('save_session', args)
  if (error) throw new Error(`save_session failed: ${error.message}`)
}

// ============================================================================
// Calendar / streak builder — same approach as seed-demo-users.ts
// ============================================================================

interface StreakBlock {
  len: number
  endDaysAgo: number
}

interface CalendarConfig {
  totalDays: number
  tailStreakLen: number
  historicStreak?: StreakBlock
  weekdayActiveChance: number
  weekendActiveChance: number
  sessionsForDay: (isStreakDay: boolean, weekend: boolean) => number
}

function buildCalendar(config: CalendarConfig): Map<string, number> {
  const { totalDays, tailStreakLen, historicStreak, weekdayActiveChance, weekendActiveChance, sessionsForDay } = config
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  const forcedInactive = new Set<number>([tailStreakLen, tailStreakLen + 1])
  if (historicStreak) {
    forcedInactive.add(historicStreak.endDaysAgo - 1)
    forcedInactive.add(historicStreak.endDaysAgo + historicStreak.len)
  }

  const activeDays = new Map<string, number>()

  for (let i = 0; i < totalDays; i++) {
    const date = new Date(today)
    date.setUTCDate(date.getUTCDate() - i)
    const key = dateKey(date)
    const weekend = isWeekend(date)

    const inTailStreak = i < tailStreakLen
    const inHistoricStreak = historicStreak
      ? i >= historicStreak.endDaysAgo && i < historicStreak.endDaysAgo + historicStreak.len
      : false

    if (inTailStreak || inHistoricStreak) {
      activeDays.set(key, sessionsForDay(true, weekend))
      continue
    }

    if (forcedInactive.has(i)) continue

    const activeChance = weekend ? weekendActiveChance : weekdayActiveChance
    if (chance(activeChance)) {
      activeDays.set(key, sessionsForDay(false, weekend))
    }
  }

  return activeDays
}

// ============================================================================
// Session generation for a user (no projects/tasks — see header note)
// ============================================================================

const FOCUS_DURATIONS = [25, 50, 90] as const
const BREAK_DURATIONS = [5, 10] as const
const SESSION_NOTES = [
  'Deep work block, felt good', 'Distracted a bit but pushed through', 'Great focus today',
  'Short session before a meeting', 'Late night session', null, null, null,
]

async function seedSessions(userId: string, calendar: Map<string, number>) {
  const days = Array.from(calendar.keys()).sort() // chronological ascending — required for streak math
  const hours = [9, 11, 13, 15, 17, 20]
  let processed = 0

  for (const day of days) {
    const count = calendar.get(day)!

    for (let s = 0; s < count; s++) {
      const duration = pick(FOCUS_DURATIONS)
      const startHour = hours[s % hours.length]
      const startedAt = randomTimeOnDay(day, startHour)
      const endedAt = addMinutes(startedAt, duration)

      await saveSession({
        p_user_id: userId,
        p_project_id: null,
        p_task_id: null,
        p_type: 'focus',
        p_duration_mins: duration,
        p_started_at: startedAt.toISOString(),
        p_ended_at: endedAt.toISOString(),
        p_timer_mode: chance(0.85) ? 'pomodoro' : 'free',
        p_notes: pick(SESSION_NOTES),
        p_local_date: day,
      })
      processed += 1

      if (chance(0.35)) {
        const breakDuration = pick(BREAK_DURATIONS)
        const breakStart = endedAt
        const breakEnd = addMinutes(breakStart, breakDuration)
        await saveSession({
          p_user_id: userId,
          p_project_id: null,
          p_task_id: null,
          p_type: 'break',
          p_duration_mins: breakDuration,
          p_started_at: breakStart.toISOString(),
          p_ended_at: breakEnd.toISOString(),
          p_timer_mode: 'pomodoro',
          p_notes: null,
          p_local_date: day,
        })
        processed += 1
      }
    }
  }

  console.log(`    ${processed} session rows inserted`)
}

// ============================================================================
// User roster — 20 profiles across 4 activity tiers so the leaderboard has a
// believable spread (a few standouts, a mid pack, some casual/new accounts)
// rather than 20 near-identical rows.
// ============================================================================

interface UserSpec {
  displayName: string
  slug: string
  emailLocal: string
  memberSinceDaysAgo: number
  calendar: CalendarConfig
}

interface TierPreset {
  totalDaysRange: [number, number]
  tailStreakRange: [number, number]
  memberSinceRange: [number, number]
  weekdayActiveChance: number
  weekendActiveChance: number
  sessionsForDay: (isStreakDay: boolean, weekend: boolean) => number
}

const TIERS: Record<'grinder' | 'consistent' | 'casual' | 'newcomer', TierPreset> = {
  grinder: {
    totalDaysRange: [280, 400],
    tailStreakRange: [30, 70],
    memberSinceRange: [250, 400],
    weekdayActiveChance: 0.6,
    weekendActiveChance: 0.35,
    sessionsForDay: (streakDay, weekend) =>
      streakDay ? randomInt(2, weekend ? 3 : 5) : chance(0.2) ? randomInt(3, 5) : randomInt(1, 3),
  },
  consistent: {
    totalDaysRange: [90, 200],
    tailStreakRange: [10, 30],
    memberSinceRange: [60, 200],
    weekdayActiveChance: 0.5,
    weekendActiveChance: 0.25,
    sessionsForDay: (streakDay, weekend) =>
      streakDay ? randomInt(1, weekend ? 2 : 4) : chance(0.25) ? randomInt(2, 4) : randomInt(1, 2),
  },
  casual: {
    totalDaysRange: [30, 90],
    tailStreakRange: [3, 15],
    memberSinceRange: [20, 90],
    weekdayActiveChance: 0.4,
    weekendActiveChance: 0.2,
    sessionsForDay: (streakDay, weekend) =>
      streakDay ? randomInt(1, weekend ? 1 : 2) : chance(0.7) ? 1 : randomInt(2, 3),
  },
  newcomer: {
    totalDaysRange: [10, 25],
    tailStreakRange: [1, 8],
    memberSinceRange: [5, 25],
    weekdayActiveChance: 0.45,
    weekendActiveChance: 0.2,
    sessionsForDay: (streakDay) => (streakDay ? randomInt(1, 2) : 1),
  },
}

const ROSTER: Array<{ name: string; slug: string; tier: keyof typeof TIERS }> = [
  { name: 'Ava Chen', slug: 'ava-chen', tier: 'grinder' },
  { name: "Ryan O'Connor", slug: 'ryan-oconnor', tier: 'grinder' },
  { name: 'Fatima Al-Sayed', slug: 'fatima-al-sayed', tier: 'grinder' },
  { name: 'Liam Novak', slug: 'liam-novak', tier: 'consistent' },
  { name: 'Priya Sharma', slug: 'priya-sharma', tier: 'consistent' },
  { name: 'Noah Kim', slug: 'noah-kim', tier: 'consistent' },
  { name: 'Mia Andersson', slug: 'mia-andersson', tier: 'consistent' },
  { name: 'Omar Haddad', slug: 'omar-haddad', tier: 'consistent' },
  { name: 'Isabella Rossi', slug: 'isabella-rossi', tier: 'consistent' },
  { name: 'Marcus Johnson', slug: 'marcus-johnson', tier: 'consistent' },
  { name: 'Lucas Ferreira', slug: 'lucas-ferreira', tier: 'casual' },
  { name: 'Sara Ibrahim', slug: 'sara-ibrahim', tier: 'casual' },
  { name: 'Chloe Nakamura', slug: 'chloe-nakamura', tier: 'casual' },
  { name: 'Daniel Popescu', slug: 'daniel-popescu', tier: 'casual' },
  { name: 'Yuki Tanaka', slug: 'yuki-tanaka', tier: 'casual' },
  { name: 'Elena Petrova', slug: 'elena-petrova', tier: 'casual' },
  { name: 'Nadia Rahman', slug: 'nadia-rahman', tier: 'casual' },
  { name: 'Ethan Osei', slug: 'ethan-osei', tier: 'newcomer' },
  { name: 'Tom Becker', slug: 'tom-becker', tier: 'newcomer' },
  { name: 'Zara Ahmed', slug: 'zara-ahmed', tier: 'newcomer' },
]

const USERS: UserSpec[] = ROSTER.map(({ name, slug, tier }) => {
  const preset = TIERS[tier]
  return {
    displayName: name,
    slug,
    emailLocal: `seed+${slug}`,
    memberSinceDaysAgo: randomInt(...preset.memberSinceRange),
    calendar: {
      totalDays: randomInt(...preset.totalDaysRange),
      tailStreakLen: randomInt(...preset.tailStreakRange),
      weekdayActiveChance: preset.weekdayActiveChance,
      weekendActiveChance: preset.weekendActiveChance,
      sessionsForDay: preset.sessionsForDay,
    },
  }
})

const EMAIL_DOMAIN = 'seed.depthly.internal'

// ============================================================================
// Per-user seeding
// ============================================================================

async function seedUser(spec: UserSpec) {
  const email = `${spec.emailLocal}@${EMAIL_DOMAIN}`
  console.log(`\n=== ${spec.displayName} (${email}) ===`)

  const userId = await ensureAuthUser(email, spec.displayName)
  console.log(`  auth user: ${userId}`)

  const memberSince = new Date()
  memberSince.setUTCDate(memberSince.getUTCDate() - spec.memberSinceDaysAgo)

  const { data: existingProfile, error: fetchErr } = await supabase
    .from('profiles')
    .select('total_focus_minutes')
    .eq('id', userId)
    .maybeSingle()
  if (fetchErr) throw new Error(`Failed to read existing profile for ${email}: ${fetchErr.message}`)

  const profilePatch: Database['public']['Tables']['profiles']['Update'] = {
    display_name: spec.displayName,
    profile_slug: spec.slug,
    is_public: true,
    show_heatmap_on_profile: true,
    member_since: memberSince.toISOString(),
    is_seed_account: true,
  }

  const { error: profileErr } = await supabase.from('profiles').update(profilePatch).eq('id', userId)
  if (profileErr) throw new Error(`Failed to update profile for ${email}: ${profileErr.message}`)

  if (existingProfile && existingProfile.total_focus_minutes > 0) {
    console.log('  already has session history — skipping (idempotent re-run)')
    return
  }

  const calendar = buildCalendar(spec.calendar)
  console.log(`  seeding sessions across ${calendar.size} active days...`)
  await seedSessions(userId, calendar)
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log(`Seeding ${USERS.length} synthetic leaderboard profiles against ${SUPABASE_URL}...`)

  for (const spec of USERS) {
    await seedUser(spec)
  }

  console.log('\nDone.')
}

main().catch((err) => {
  console.error('\nSeeding failed:', err)
  process.exit(1)
})
