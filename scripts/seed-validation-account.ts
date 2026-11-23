/** Dedicated private QA fixture. Run: SEED_VALIDATION=yes npx tsx scripts/seed-validation-account.ts */
import { randomBytes } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/types/database'

const env = { ...process.env }
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const match = line.match(/^([A-Z_]+)=(.*)$/)
  if (match) env[match[1]] ??= match[2].trim().replace(/^(['"])(.*)\1$/, '$2')
}
if (env.SEED_VALIDATION !== 'yes') throw new Error('Run with SEED_VALIDATION=yes')
const url = env.VITE_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Missing Supabase configuration')
const admin = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
const suffix = randomBytes(4).toString('hex')
let email = `qa-${suffix}@seed.depthly.internal`
const password = `Depthly-${randomBytes(12).toString('base64url')}!`
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Casablanca' })
function day(offset: number) {
  const date = new Date(`${today}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}
function check(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

async function main() {
  const created = env.SEED_RESUME_USER
    ? await admin.auth.admin.updateUserById(env.SEED_RESUME_USER, { password })
    : await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: 'Alex · Test workspace' } })
  check(created.error)
  const id = created.data.user!.id
  email = created.data.user!.email!
  console.log(`Created dedicated QA account: ${id}`)
  check((await admin.from('profiles').update({ display_name: 'Alex Morgan (Test)', profile_slug: `qa-${suffix}`, is_seed_account: true, is_public: false, plan: 'pro', member_since: `${day(-180)}T12:00:00Z` }).eq('id', id)).error)
  check((await admin.from('goals').update({ daily_goal_minutes: 120, weekly_goal_minutes: 600 }).eq('user_id', id)).error)
  const existingProjects = await admin.from('projects').select().eq('user_id', id)
  check(existingProjects.error)
  const projectResult = existingProjects.data?.length ? existingProjects : await admin.from('projects').insert([
    { user_id: id, name: 'Client website', color: '#4B9EFF', icon: '💼', sort_order: 0, is_archived: false },
    { user_id: id, name: 'Biology exam', color: '#3DD68C', icon: '📚', sort_order: 1, is_archived: false },
    { user_id: id, name: 'Personal learning', color: '#A78BFA', icon: '💡', sort_order: 2, is_archived: false },
    { user_id: id, name: 'Completed portfolio', color: '#F5A623', icon: '🎨', sort_order: 3, is_archived: true },
  ]).select()
  check(projectResult.error)
  const projects = projectResult.data!
  const titles = ['Draft homepage copy', 'Review cell division', 'Practice TypeScript', 'Publish portfolio']
  const taskRows: Database['public']['Tables']['tasks']['Insert'][] = projects.flatMap((project, index) => [
    { user_id: id, project_id: project.id, title: titles[index], description: 'Sample task for checking task details, planner selection, and session links.', status: 'in_progress', priority: 'high', scheduled_date: today, due_date: day(3), estimated_pomodoros: 4, list_order: 0, kanban_order: 0 },
    { user_id: id, project_id: project.id, title: `Review ${project.name.toLowerCase()}`, status: 'todo', priority: 'medium', scheduled_date: day(1), planned_start_date: day(0), planned_end_date: day(7), list_order: 1, kanban_order: 1 },
    { user_id: id, project_id: project.id, title: `Finish ${project.name.toLowerCase()} checklist`, status: 'done', priority: 'low', completed_at: `${day(-1)}T15:00:00Z`, list_order: 2, kanban_order: 2 },
    { user_id: id, project_id: project.id, title: `Plan next steps for ${project.name.toLowerCase()}`, status: 'todo', priority: 'urgent', scheduled_date: day(-2), due_date: day(-1), list_order: 3, kanban_order: 3 },
    { user_id: id, project_id: project.id, title: 'Daily review and planning', status: 'todo', priority: 'medium', repeat_days: [1, 2, 3, 4, 5, 6, 7], repeat_start_date: day(-7), list_order: 4, kanban_order: 4 },
    { user_id: id, project_id: project.id, title: 'Unscheduled idea to explore later', status: 'todo', priority: 'low', list_order: 5, kanban_order: 5 },
  ])
  const existingTasks = await admin.from('tasks').select().eq('user_id', id)
  check(existingTasks.error)
  const taskResult = existingTasks.data?.length ? existingTasks : await admin.from('tasks').insert(taskRows).select()
  check(taskResult.error)
  const tasks = taskResult.data!
  const recurring = tasks.find((task) => task.repeat_days?.length)!
  check((await admin.from('task_occurrences').upsert([
    { user_id: id, task_id: recurring.id, occurrence_date: day(-1), state: 'done', completed_at: `${day(-1)}T14:00:00Z` },
    { user_id: id, task_id: recurring.id, occurrence_date: day(-3), state: 'skipped' },
  ], { onConflict: 'task_id,occurrence_date' })).error)
  // The service-role-only legacy RPC inserts each synthetic session and updates
  // its derived tables transactionally. Never fabricate trusted timer activity.
  const sql = [
    '-- Run once in Supabase SQL Editor. Only this dedicated QA account is affected.',
    'begin;',
    `select set_config('request.jwt.claim.sub', '${id}', true);`,
    `select set_config('request.jwt.claims', '{"sub":"${id}","role":"authenticated"}', true);`,
    `do $$ begin if exists (select 1 from public.sessions where user_id = '${id}') then raise exception 'QA history already exists; refusing duplicate seed'; end if; end $$;`,
  ]
  const quote = (value: string) => `'${value.replace(/'/g, "''")}'`
  let sessionCount = 0
  for (let offset = -180; offset <= 0; offset += 1) {
    if (offset < -6 && Math.abs(offset) % 4 !== 0) continue
    for (let block = 0; block < 2; block++) {
      const project = projects[(Math.abs(offset) + block) % 3]
      const task = tasks.find((item) => item.project_id === project.id && item.status === 'in_progress')!
      const minutes = [25, 45, 50][(Math.abs(offset) + block) % 3]
      const start = new Date(`${day(offset)}T${block === 0 ? '07' : '08'}:00:00Z`)
      // Today's fixture must never claim time that has not happened yet.
      if (start.getTime() + minutes * 60000 > Date.now()) continue
      sql.push(`select public.save_session('${id}'::uuid, '${project.id}'::uuid, '${task.id}'::uuid, 'focus'::public.session_type, ${minutes}, '${start.toISOString()}'::timestamptz, '${new Date(start.getTime() + minutes * 60000).toISOString()}'::timestamptz, '${block ? 'free' : 'pomodoro'}'::text, ${quote(`QA sample: ${task.title}`)}::text, '${day(offset)}'::date);`)
      sessionCount++
    }
  }
  sql.push('commit;')
  const sqlPath = `/tmp/depthly-validation-${id}.sql`
  writeFileSync(sqlPath, sql.join('\n') + '\n', { mode: 0o600 })
  const profile = await admin.from('profiles').select('total_sessions,total_focus_minutes,is_public,is_seed_account').eq('id', id).single()
  check(profile.error)
  console.log(JSON.stringify({ email, password, projects: projects.length, tasks: tasks.length, sessionsPrepared: sessionCount, sqlPath, profile: profile.data }, null, 2))
}
main().catch((error: Error) => { console.error(`Seed failed: ${error.message}`); process.exitCode = 1 })
