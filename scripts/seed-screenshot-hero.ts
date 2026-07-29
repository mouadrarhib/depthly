// Creates ONE dedicated, loggable-into demo account with continuous daily
// activity (no gaps, ever) for taking screenshots of a "very active" user —
// Home, Analytics, Leaderboard rank, and public profile all show a long,
// unbroken streak and a large total.
//
// Unlike scripts/seed-production-leaderboard.ts's 20 accounts (which use
// random, discarded passwords specifically so nobody can log into them), this
// one prints its login credentials to the console on purpose, because the
// whole point is that you log in as it.
//
// Run: SEED_CONFIRM=yes-seed-production npx tsx scripts/seed-screenshot-hero.ts
//
// Same production safety gate and env vars as seed-production-leaderboard.ts.
// Flagged is_seed_account = true, same as the other 20 — excluded from any
// future business-metrics query, deletable via the same cleanup query in
// docs/LEADERBOARD.md. Stays on the 'free' plan (no projects/tasks either) —
// this script only seeds what's needed for Home/Analytics/Leaderboard/public-
// profile screenshots. Ask for a follow-up if you also want Projects/Tasks
// page screenshots — that needs project + task rows, which this deliberately
// skips to stay minimal.
//
// Idempotent the same way as seed-production-leaderboard.ts: if the account
// already has session history, re-running skips seeding but still resets the
// password to a freshly generated one (printed again) in case you lost it.

import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import type { Database } from '../src/types/database'

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

function randomTimeOnDay(key: string, hour: number): Date {
  const [y, m, d] = key.split('-').map(Number)
  const base = new Date(Date.UTC(y, m - 1, d))
  base.setUTCHours(hour, randomInt(0, 59), 0, 0)
  return base
}

function addMinutes(date: Date, mins: number): Date {
  return new Date(date.getTime() + mins * 60_000)
}

function randomPassword(): string {
  // Shorter and more typeable than the 48-hex-char passwords used for the
  // other 20 accounts, since you're meant to actually type this one in.
  const words = ['ember', 'quartz', 'ridge', 'tidal', 'north', 'coral', 'birch', 'flint']
  return `${pick(words)}-${pick(words)}-${randomInt(1000, 9999)}!`
}

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
// Config — every single day for the last TOTAL_DAYS is active, so the streak
// equals the full history with zero gaps.
// ============================================================================

const DISPLAY_NAME = 'Jordan Ellis'
const SLUG = 'jordan-ellis'
const EMAIL = 'screenshot-hero@seed.depthly.internal'
const TOTAL_DAYS = 365

const FOCUS_DURATIONS = [25, 50, 90] as const
const BREAK_DURATIONS = [5, 10] as const
const SESSION_NOTES = [
  'Deep work block, felt good', 'Great focus today', 'Productive session',
  'Pushed through a tough problem', 'Solid morning block', null, null,
]

async function main() {
  console.log(`Seeding screenshot hero account against ${SUPABASE_URL}...`)

  const password = randomPassword()

  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password,
    email_confirm: true,
    user_metadata: { full_name: DISPLAY_NAME },
  })

  let userId: string
  let isNew = true
  if (!createErr) {
    userId = created.user.id
  } else if (createErr.message.toLowerCase().includes('already')) {
    const existingId = await resolveUserIdByEmail(EMAIL)
    if (!existingId) throw new Error(`User exists but could not resolve id for ${EMAIL}`)
    userId = existingId
    isNew = false
    // Reset password on every run so you always have a working credential,
    // even if you forgot the one from a previous run.
    const { error: pwErr } = await supabase.auth.admin.updateUserById(userId, { password })
    if (pwErr) throw new Error(`Failed to reset password: ${pwErr.message}`)
  } else {
    throw new Error(`Failed to create auth user: ${createErr.message}`)
  }

  console.log(`  auth user: ${userId} (${isNew ? 'newly created' : 'existing, password reset'})`)

  const memberSince = new Date()
  memberSince.setUTCDate(memberSince.getUTCDate() - TOTAL_DAYS)

  const { error: profileErr } = await supabase
    .from('profiles')
    .update({
      display_name: DISPLAY_NAME,
      profile_slug: SLUG,
      is_public: true,
      show_heatmap_on_profile: true,
      member_since: memberSince.toISOString(),
      is_seed_account: true,
    })
    .eq('id', userId)
  if (profileErr) throw new Error(`Failed to update profile: ${profileErr.message}`)

  const { data: existingProfile, error: fetchErr } = await supabase
    .from('profiles')
    .select('total_focus_minutes')
    .eq('id', userId)
    .maybeSingle()
  if (fetchErr) throw new Error(`Failed to read profile: ${fetchErr.message}`)

  if (existingProfile && existingProfile.total_focus_minutes > 0) {
    console.log('  already has session history — skipping session generation (idempotent re-run)')
  } else {
    console.log(`  seeding ${TOTAL_DAYS} consecutive active days...`)
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const hours = [8, 10, 13, 15, 18, 20]
    let processed = 0

    for (let i = TOTAL_DAYS - 1; i >= 0; i--) {
      const date = new Date(today)
      date.setUTCDate(date.getUTCDate() - i)
      const day = dateKey(date)
      const sessionsToday = randomInt(2, 5)

      for (let s = 0; s < sessionsToday; s++) {
        const duration = pick(FOCUS_DURATIONS)
        const startedAt = randomTimeOnDay(day, hours[s % hours.length])
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

        if (chance(0.4)) {
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

      if ((TOTAL_DAYS - i) % 50 === 0) {
        console.log(`    ...${TOTAL_DAYS - i}/${TOTAL_DAYS} days done (${processed} session rows so far)`)
      }
    }
    console.log(`  done — ${processed} total session rows inserted`)
  }

  console.log('\n=== Login credentials ===')
  console.log(`  Email:    ${EMAIL}`)
  console.log(`  Password: ${password}`)
  console.log(`  Profile:  /u/${SLUG} once logged in, or visit directly (public profile)`)
}

main().catch((err) => {
  console.error('\nSeeding failed:', err)
  process.exit(1)
})
