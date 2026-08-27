// Follow-up to scripts/seed-screenshot-hero.ts: adds projects + tasks to the
// existing "Jordan Ellis" screenshot account, and retroactively attaches most
// of its already-seeded focus sessions to those projects (a plain
// `update sessions set project_id = …` — safe because per-project stats are
// computed live by summing sessions.duration_mins at read time, per
// docs/PROJECTS.md, not from a pre-aggregated column, so backfilling
// project_id after the fact doesn't touch profiles/daily_summaries/user_stats
// at all).
//
// Run: SEED_CONFIRM=yes-seed-production npx tsx scripts/seed-screenshot-hero-projects.ts
//
// Same production safety gate/env vars as the other seed scripts. Idempotent:
// if the account already has projects, this exits without creating more.

import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import { createClient } from '@supabase/supabase-js'

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

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

const EMAIL = 'screenshot-hero@seed.depthly.internal'

// Reused from seed-demo-users.ts's PROJECT_LIBRARY / TASK_TITLES_BY_PROJECT —
// kept in sync with src/components/projects/ProjectModal.tsx PRESET_COLORS.
const PROJECT_LIBRARY = [
  { name: 'Client Work', icon: '💼', color: '#4B9EFF' },
  { name: 'Side Project', icon: '🚀', color: '#3DD68C' },
  { name: 'Learning', icon: '📚', color: '#F5A623' },
  { name: 'Deep Work Sprint', icon: '🎯', color: '#F25C5C' },
  { name: 'Open Source', icon: '🔧', color: '#F472B6' },
  { name: 'Writing', icon: '📝', color: '#FB923C' },
] as const

const TASK_TITLES_BY_PROJECT: Record<string, string[]> = {
  'Client Work': ['Draft proposal for Q3 retainer', 'Fix invoice PDF export bug', 'Client onboarding call notes', 'Review contract redlines', 'Ship staging build for review'],
  'Side Project': ['Wire up auth flow', 'Design empty states', 'Migrate to new API', 'Write landing page copy', 'Set up CI pipeline'],
  Learning: ['Finish TypeScript generics course module', 'Read chapter on system design', 'Practice SQL window functions', 'Rebuild a mini project from tutorial', 'Take notes on Rust ownership'],
  'Deep Work Sprint': ['No-distraction refactor block', 'Plan next sprint scope', 'Clear inbox backlog', 'Deep dive on perf bottleneck', 'Write postmortem doc'],
  'Open Source': ['Triage open issues', 'Review incoming PR', 'Write CONTRIBUTING guide', 'Fix flaky test', 'Cut new release'],
  Writing: ['Outline next blog post', 'Edit draft for clarity', 'Research sources', 'Publish and share post', 'Respond to reader comments'],
}

const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const
type Priority = (typeof PRIORITIES)[number]
type TaskStatus = 'todo' | 'in_progress' | 'done'

interface ProjectSeed {
  id: string
  name: string
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

async function createProjects(userId: string): Promise<ProjectSeed[]> {
  const rows = PROJECT_LIBRARY.map((p, i) => ({
    user_id: userId,
    name: p.name,
    color: p.color,
    icon: p.icon,
    is_archived: false,
    sort_order: i,
    last_used_at: new Date().toISOString(),
  }))

  const { data, error } = await supabase.from('projects').insert(rows).select('id, name')
  if (error) throw new Error(`Failed to create projects: ${error.message}`)
  return data
}

async function createTasksForProjects(userId: string, projects: ProjectSeed[]): Promise<Map<string, string[]>> {
  const taskIdsByProject = new Map<string, string[]>()

  for (const project of projects) {
    const titles = TASK_TITLES_BY_PROJECT[project.name] ?? TASK_TITLES_BY_PROJECT['Deep Work Sprint']
    const statuses: TaskStatus[] = ['todo', 'todo', 'in_progress', 'in_progress', 'done']

    const rows = titles.map((title, i) => {
      const status = statuses[i % statuses.length]
      const priority: Priority = pick(PRIORITIES)

      let due_date: string | null = null
      if (status !== 'done' && chance(0.6)) {
        const offsetDays = chance(0.4) ? -randomInt(1, 10) : randomInt(1, 21)
        const d = new Date()
        d.setUTCDate(d.getUTCDate() + offsetDays)
        due_date = dateKey(d)
      }

      const completed_at = status === 'done'
        ? new Date(Date.now() - randomInt(60, 60 * 24 * 20) * 60_000).toISOString()
        : null

      return {
        project_id: project.id,
        user_id: userId,
        title,
        status,
        priority,
        due_date,
        completed_at,
        estimated_pomodoros: randomInt(2, 6),
        actual_pomodoros: status === 'done' ? randomInt(2, 6) : randomInt(0, 4),
        list_order: (i + 1) * 1000,
        kanban_order: (i + 1) * 1000,
      }
    })

    const { data, error } = await supabase.from('tasks').insert(rows).select('id')
    if (error) throw new Error(`Failed to create tasks for project ${project.name}: ${error.message}`)
    taskIdsByProject.set(project.id, data.map((t) => t.id))
  }

  return taskIdsByProject
}

async function backfillSessionProjects(
  userId: string,
  projects: ProjectSeed[],
  taskIdsByProject: Map<string, string[]>,
) {
  const { data: sessions, error } = await supabase
    .from('sessions')
    .select('id')
    .eq('user_id', userId)
    .eq('type', 'focus')
    .is('project_id', null)

  if (error) throw new Error(`Failed to read sessions: ${error.message}`)
  if (!sessions || sessions.length === 0) {
    console.log('  no unattached focus sessions found to backfill')
    return
  }

  // Bucket session ids by (project, task-or-none) so each bucket can be
  // written with one bulk update instead of one request per session.
  const buckets = new Map<string, { project_id: string | null; task_id: string | null; ids: string[] }>()

  for (const s of sessions) {
    const project = chance(0.9) ? pick(projects) : null
    const taskIds = project ? taskIdsByProject.get(project.id) ?? [] : []
    const task = taskIds.length > 0 && chance(0.6) ? pick(taskIds) : null
    const key = `${project?.id ?? 'none'}:${task ?? 'none'}`

    const bucket = buckets.get(key)
    if (bucket) {
      bucket.ids.push(s.id)
    } else {
      buckets.set(key, { project_id: project?.id ?? null, task_id: task, ids: [s.id] })
    }
  }

  let updated = 0
  for (const { project_id, task_id, ids } of buckets.values()) {
    if (project_id === null) continue // leave the ~10% unattached as-is
    for (const idBatch of chunk(ids, 100)) {
      const { error: updateErr } = await supabase
        .from('sessions')
        .update({ project_id, task_id })
        .in('id', idBatch)
      if (updateErr) throw new Error(`Failed to backfill sessions: ${updateErr.message}`)
      updated += idBatch.length
    }
  }

  console.log(`  backfilled project_id on ${updated}/${sessions.length} existing focus sessions`)
}

async function main() {
  console.log(`Adding projects/tasks to screenshot hero account on ${SUPABASE_URL}...`)

  const userId = await resolveUserIdByEmail(EMAIL)
  if (!userId) throw new Error(`Could not find user ${EMAIL} — run seed-screenshot-hero.ts first.`)
  console.log(`  auth user: ${userId}`)

  const { count, error: countErr } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (countErr) throw new Error(`Failed to check existing projects: ${countErr.message}`)

  if (count && count > 0) {
    console.log(`  already has ${count} project(s) — skipping (idempotent re-run)`)
    return
  }

  const projects = await createProjects(userId)
  console.log(`  created ${projects.length} projects`)

  const taskIdsByProject = await createTasksForProjects(userId, projects)
  console.log(`  created tasks for ${taskIdsByProject.size} projects`)

  await backfillSessionProjects(userId, projects, taskIdsByProject)

  console.log('\nDone.')
}

main().catch((err) => {
  console.error('\nSeeding failed:', err)
  process.exit(1)
})
