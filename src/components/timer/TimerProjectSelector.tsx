import { useQuery } from '@tanstack/react-query'

import { fetchProjects } from '@/lib/supabase/queries/projects'
import { fetchTasksByProject } from '@/lib/supabase/queries/tasks'
import { projectKeys, taskKeys } from '@/lib/queryKeys'
import { useAuthStore } from '@/store/authStore'
import { useTimerStore } from '@/store/timerStore'

function Chevron() {
  return (
    <span
      aria-hidden="true"
      style={{
        position:      'absolute',
        right:         12,
        top:           '50%',
        transform:     'translateY(-50%)',
        pointerEvents: 'none',
        color:         'var(--color-text-faint)',
        fontSize:      11,
      }}
    >
      ▾
    </span>
  )
}

const selectStyle: React.CSSProperties = {
  width:        '100%',
  background:   'var(--color-surface-overlay)',
  border:       '1px solid var(--color-border)',
  borderRadius: 10,
  padding:      '10px 36px 10px 14px',
  fontSize:     13,
  color:        'var(--color-text-muted)',
  cursor:       'pointer',
  appearance:   'none',
}

export function TimerProjectSelector() {
  const userId = useAuthStore(s => s.user?.id ?? '')
  const { selectedProjectId, selectedTaskId, setSelectedProject, setSelectedTask } = useTimerStore()

  const { data: projects = [] } = useQuery({
    queryKey: projectKeys.active,
    queryFn:  () => fetchProjects(userId),
    enabled:  !!userId,
  })

  const { data: tasks = [] } = useQuery({
    queryKey: taskKeys.byProject(selectedProjectId ?? ''),
    queryFn:  () => fetchTasksByProject(selectedProjectId!),
    enabled:  !!selectedProjectId,
  })

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value || null
    setSelectedProject(id)
    setSelectedTask(null)
  }

  const handleTaskChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value || null
    setSelectedTask(id)
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="relative">
        <select
          value={selectedProjectId ?? ''}
          onChange={handleProjectChange}
          aria-label="Select project"
          style={selectStyle}
          className="focus:outline-none"
        >
          <option value="">No project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <Chevron />
      </div>

      <div
        className="relative"
        style={{
          opacity:       !selectedProjectId ? 0.45 : 1,
          pointerEvents: !selectedProjectId ? 'none' : 'auto',
          transition:    'opacity 0.2s',
        }}
      >
        <select
          value={selectedTaskId ?? ''}
          onChange={handleTaskChange}
          disabled={!selectedProjectId}
          aria-label="Select task"
          style={{ ...selectStyle, cursor: !selectedProjectId ? 'not-allowed' : 'pointer' }}
          className="focus:outline-none"
        >
          <option value="">No task</option>
          {tasks.map((t) => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>
        <Chevron />
      </div>
    </div>
  )
}
