// DEV ONLY — DELETE BEFORE PRODUCTION
// Run: npx tsx scripts/seed-leaderboard-users.ts

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

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
  ...parseEnv(join(__dirname, '..', '.env')),
  ...parseEnv(join(__dirname, '..', '.env.local')),
}

const SUPABASE_URL = env['SUPABASE_URL'] ?? env['VITE_SUPABASE_URL']
const SERVICE_KEY = env['SUPABASE_SERVICE_ROLE_KEY']
const OWN_USER_ID = env['VITE_TEST_USER_ID']

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const TODAY = new Date().toISOString().split('T')[0]

const FAKE_USERS = [
  {
    email: 'alex@depthly.test',
    password: 'Test1234!',
    display_name: 'Alex Chen',
    total_focus_minutes: 4800,
    total_sessions: 96,
    current_streak: 14,
    longest_streak: 21,
  },
  {
    email: 'sara@depthly.test',
    password: 'Test1234!',
    display_name: 'Sara Kim',
    total_focus_minutes: 3600,
    total_sessions: 72,
    current_streak: 7,
    longest_streak: 14,
  },
  {
    email: 'mike@depthly.test',
    password: 'Test1234!',
    display_name: 'Mike Torres',
    total_focus_minutes: 2400,
    total_sessions: 48,
    current_streak: 3,
    longest_streak: 9,
  },
  {
    email: 'priya@depthly.test',
    password: 'Test1234!',
    display_name: 'Priya Patel',
    total_focus_minutes: 1800,
    total_sessions: 36,
    current_streak: 0,
    longest_streak: 5,
  },
  {
    email: 'james@depthly.test',
    password: 'Test1234!',
    display_name: 'James Wu',
    total_focus_minutes: 900,
    total_sessions: 18,
    current_streak: 2,
    longest_streak: 4,
  },
] as const

async function resolveUserId(email: string): Promise<string | null> {
  const { data, error } = await supabase.auth.admin.listUsers()
  if (error) return null
  return data.users.find((u) => u.email === email)?.id ?? null
}

async function seed() {
  console.log('Seeding leaderboard users...\n')

  for (const user of FAKE_USERS) {
    let userId: string | null = null

    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
    })

    if (createErr) {
      if (createErr.message.toLowerCase().includes('already')) {
        userId = await resolveUserId(user.email)
        if (!userId) {
          console.error(`  SKIP ${user.display_name}: exists but could not resolve id`)
          continue
        }
      } else {
        console.error(`  FAIL ${user.display_name}: ${createErr.message}`)
        continue
      }
    } else {
      userId = created.user.id
    }

    const { error: profileErr } = await supabase
      .from('profiles')
      .update({
        display_name: user.display_name,
        is_public: true,
        total_focus_minutes: user.total_focus_minutes,
        total_sessions: user.total_sessions,
        current_streak: user.current_streak,
        longest_streak: user.longest_streak,
        last_focus_date: TODAY,
      })
      .eq('id', userId)

    if (profileErr) {
      console.error(`  FAIL updating profile for ${user.display_name}: ${profileErr.message}`)
      continue
    }

    const { error: statsErr } = await supabase.from('user_stats').upsert(
      {
        user_id: userId,
        period_type: 'yearly',
        period_key: '2026',
        focus_minutes: user.total_focus_minutes,
        session_count: user.total_sessions,
      },
      { onConflict: 'user_id,period_type,period_key' },
    )

    if (statsErr) {
      console.error(`  FAIL inserting user_stats for ${user.display_name}: ${statsErr.message}`)
      continue
    }

    console.log(`Created user: ${user.display_name} ✓`)
  }

  if (OWN_USER_ID) {
    const { error } = await supabase
      .from('profiles')
      .update({ is_public: true })
      .eq('id', OWN_USER_ID)

    if (error) {
      console.error(`\nFAIL updating own profile: ${error.message}`)
    } else {
      console.log('\nUpdated own profile: is_public = true ✓')
    }
  } else {
    console.log('\nSkipped own profile update (VITE_TEST_USER_ID not set in .env.local)')
  }

  console.log('\nDone.')
}

seed().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
