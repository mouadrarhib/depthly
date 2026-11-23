/** Add historical planner fixtures to Emma's existing demo, without changing current tasks. */
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
const userId = '0f98c11b-d2bb-4b72-87f6-7ddac1d11e83'
const marker = 'Student demo: November planner history.'
const days = [2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 16, 17, 18, 19]
const modules = [
  { name: 'Biology', titles: ['Read cell structure', 'Sketch a cell', 'Compare mitosis stages', 'Review enzymes', 'Study food chains', 'Quiz on genetics', 'Check lab notes'] },
  { name: 'Chemistry', titles: ['Review the periodic table', 'Learn ion charges', 'Practice bond diagrams', 'Read acid-base notes', 'Calculate molar mass', 'Quiz on reactions', 'Review lab safety'] },
  { name: 'Mathematics', titles: ['Solve linear equations', 'Sketch function graphs', 'Practice fractions', 'Review quadratics', 'Solve geometry problems', 'Practice integration', 'Check algebra answers'] },
  { name: 'History', titles: ['Read chapter one', 'Map key events', 'Compare primary sources', 'Review treaty notes', 'Draft an essay plan', 'Quiz on key dates', 'Review revision notes'] },
] as const

async function main() {
  const profile = await admin.from('profiles').select('is_seed_account,is_public').eq('id', userId).single()
  if (profile.error) throw profile.error
  if (!profile.data.is_seed_account || profile.data.is_public) throw new Error('Expected private demo account')
  const projects = await admin.from('projects').select('id,name').eq('user_id', userId)
  if (projects.error) throw projects.error
  const existing = await admin.from('tasks').select('title,project_id,scheduled_date').eq('user_id', userId).eq('description', marker)
  if (existing.error) throw existing.error
  const rows: Database['public']['Tables']['tasks']['Insert'][] = []
  days.forEach((day, dayIndex) => {
    for (let slot = 0; slot < 2; slot++) {
      const module = modules[(dayIndex * 2 + slot) % 4]
      const project = projects.data.find((item) => item.name === module.name)
      if (!project) throw new Error(`Missing module: ${module.name}`)
      const title = module.titles[Math.floor(dayIndex / 2)]
      const date = `2026-11-${String(day).padStart(2, '0')}`
      if (existing.data.some((task) => task.project_id === project.id && task.title === title && task.scheduled_date === date)) continue
      rows.push({ user_id: userId, project_id: project.id, title, description: marker,
        scheduled_date: date, due_date: date, status: 'done',
        completed_at: `${date}T${slot ? '15' : '10'}:00:00Z`,
        created_at: `${date}T07:00:00Z`,
        priority: slot ? 'medium' : 'low', estimated_pomodoros: slot ? 2 : 1,
        list_order: 20 + dayIndex * 2 + slot, kanban_order: 20 + dayIndex * 2 + slot,
      })
    }
  })
  if (rows.length) {
    const result = await admin.from('tasks').insert(rows)
    if (result.error) throw result.error
  }
  const verified = await admin.from('tasks').select('scheduled_date', { count: 'exact' }).eq('user_id', userId).eq('description', marker)
  if (verified.error) throw verified.error
  console.log(JSON.stringify({ added: rows.length, totalHistoricalTasks: verified.count, populatedDays: [...new Set(verified.data.map((task) => task.scheduled_date))].sort() }, null, 2))
}
main().catch((error: Error) => { console.error(error.message); process.exitCode = 1 })
