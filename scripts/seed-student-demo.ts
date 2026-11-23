/** Creates one private student demo. Run: SEED_STUDENT=yes npx tsx scripts/seed-student-demo.ts */
import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/types/database'

const env = { ...process.env }
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const match = line.match(/^([A-Z_]+)=(.*)$/)
  if (match) env[match[1]] ??= match[2].trim().replace(/^(['"])(.*)\1$/, '$2')
}
if (env.SEED_STUDENT !== 'yes') throw new Error('Run with SEED_STUDENT=yes')
if (!env.VITE_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing Supabase configuration')
const admin = createClient<Database>(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const suffix = randomBytes(4).toString('hex')
const email = `student-${suffix}@seed.depthly.internal`
const password = `Study-${randomBytes(12).toString('base64url')}!`
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Casablanca' })
function day(offset: number) {
  const date = new Date(`${today}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}
function check(error: { message: string } | null) { if (error) throw new Error(error.message) }

const modules = [
  { name: 'Biology', icon: '🔬', color: '#3DD68C', tasks: ['Review cell division', 'Label a plant cell', 'Practice genetics', 'Revise key terms'] },
  { name: 'Chemistry', icon: '📚', color: '#4B9EFF', tasks: ['Balance equations', 'Review atomic bonds', 'Solve mole problems', 'Make flashcards'] },
  { name: 'Mathematics', icon: '🎯', color: '#A78BFA', tasks: ['Practice derivatives', 'Review functions', 'Solve past papers', 'Check formula sheet'] },
  { name: 'History', icon: '📝', color: '#F5A623', tasks: ['Outline essay', 'Review World War I', 'Build a timeline', 'Summarize sources'] },
] as const

async function main() {
  const result = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: 'Emma Wilson' } })
  check(result.error)
  const userId = result.data.user!.id
  // Print credentials immediately so a failed later operation never hides account access.
  console.log(JSON.stringify({ email, password, userId }, null, 2))
  check((await admin.from('profiles').update({ display_name: 'Emma Wilson', profile_slug: `student-demo-${suffix}`, is_seed_account: true, is_public: false, plan: 'pro' }).eq('id', userId)).error)
  check((await admin.from('goals').update({ daily_goal_minutes: 120, weekly_goal_minutes: 600 }).eq('user_id', userId)).error)
  const projects = await admin.from('projects').insert(modules.map((module, index) => ({ user_id: userId, name: module.name, icon: module.icon, color: module.color, sort_order: index, is_archived: false }))).select()
  check(projects.error)
  const tasks: Database['public']['Tables']['tasks']['Insert'][] = projects.data!.flatMap((project) => {
    const module = modules.find((item) => item.name === project.name)!
    return module.tasks.map((title, index) => ({
      user_id: userId, project_id: project.id, title,
      status: index === 0 ? 'in_progress' : index === 3 ? 'done' : 'todo',
      priority: index === 0 ? 'high' : index === 3 ? 'low' : 'medium',
      estimated_pomodoros: index === 0 ? 2 : 1,
      list_order: index, kanban_order: index,
      scheduled_date: day(index === 3 ? -1 : index === 0 ? 0 : index),
      due_date: day(index === 3 ? 0 : index + 3),
      completed_at: index === 3 ? `${day(-1)}T16:00:00Z` : null,
      planned_start_date: day(0), planned_end_date: day(7),
    }))
  })
  tasks.push({ user_id: userId, project_id: projects.data!.find((project) => project.name === 'Biology')!.id, title: 'Daily flashcards', status: 'todo', priority: 'low', repeat_days: [1, 2, 3, 4, 5], repeat_start_date: day(0), estimated_pomodoros: 1, list_order: 4, kanban_order: 4 })
  check((await admin.from('tasks').insert(tasks)).error)
  const counts = await Promise.all(['projects', 'tasks'].map(async (table) => {
    const response = await admin.from(table as 'projects' | 'tasks').select('id', { count: 'exact', head: true }).eq('user_id', userId)
    check(response.error)
    return { table, count: response.count }
  }))
  const login = createClient<Database>(env.VITE_SUPABASE_URL!, env.VITE_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
  const signedIn = await login.auth.signInWithPassword({ email, password })
  check(signedIn.error)
  const visibleTasks = await login.from('tasks').select('id', { count: 'exact', head: true }).eq('user_id', userId)
  check(visibleTasks.error)
  await login.auth.signOut()
  console.log(JSON.stringify({ seeded: counts, authenticatedTaskCount: visibleTasks.count, visibility: 'private', plan: 'pro (demo access, no billing record)', sessions: 0 }, null, 2))
}
main().catch((error: Error) => { console.error(`Student seed failed: ${error.message}`); process.exitCode = 1 })
