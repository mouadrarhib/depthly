import type { SessionWithRelations } from '@/lib/supabase/queries/sessions'
import { formatPeriodKey } from '@/lib/utils/analytics'

function escapeCSVValue(value: string): string {
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function formatLocalDateTime(iso: string): string {
  const d = new Date(iso)
  const date = formatPeriodKey(d, 'daily')
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${date} ${time}`
}

export function convertSessionsToCSV(sessions: SessionWithRelations[]): string {
  const header = 'date,project,task,type,duration_mins,started_at,ended_at,notes'

  const rows = sessions.map((s) => {
    const date      = new Date(s.started_at).toLocaleDateString('en-CA')
    const project   = escapeCSVValue(s.projects?.name ?? 'No project')
    const task      = escapeCSVValue(s.tasks?.title ?? 'No task')
    const type      = s.type === 'focus' ? 'Focus' : 'Break'
    const duration  = s.duration_mins
    const startedAt = formatLocalDateTime(s.started_at)
    const endedAt   = s.ended_at ? formatLocalDateTime(s.ended_at) : ''
    const notes     = s.notes === null || s.notes === '' ? '' : escapeCSVValue(s.notes)

    return [date, project, task, type, duration, startedAt, endedAt, notes].join(',')
  })

  return [header, ...rows].join('\n')
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function generateExportFilename(startDate?: string, endDate?: string): string {
  if (startDate && endDate) {
    return `depthly-sessions-${startDate}-to-${endDate}.csv`
  }
  if (startDate) {
    return `depthly-sessions-from-${startDate}.csv`
  }
  const today = new Date().toLocaleDateString('en-CA')
  return `depthly-sessions-${today}.csv`
}
