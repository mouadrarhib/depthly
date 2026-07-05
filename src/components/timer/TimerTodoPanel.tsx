import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X, ChevronDown, Plus, FolderOpen } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { useUiStore } from '@/store'
import { useAuthStore } from '@/store/authStore'
import { useTimerStore } from '@/store/timerStore'
import { useCreateTask } from '@/hooks/useTasks'
import { fetchProjects } from '@/lib/supabase/queries/projects'
import { fetchTasksByProject } from '@/lib/supabase/queries/tasks'
import { projectKeys, taskKeys } from '@/lib/queryKeys'

// ── Backdrop (shared pattern) ─────────────────────────────────────────────────

const Backdrop = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>((props, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    {...props}
    className="fixed inset-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:duration-200 data-[state=closed]:duration-150"
    style={{ zIndex: 50, background: 'rgba(0,0,0,0.5)' }}
  />
))
Backdrop.displayName = 'Backdrop'

// ── Styled select ─────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 12, fontWeight: 500, color: '#E8E6F0', letterSpacing: '-0.01em' }}>
      {children}
    </span>
  )
}

function StyledSelect({
  value,
  onChange,
  disabled,
  children,
  placeholder,
}: {
  value:       string
  onChange:    (v: string) => void
  disabled?:   boolean
  children:    React.ReactNode
  placeholder: string
}) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{
          width: '100%', height: 40, boxSizing: 'border-box',
          background: '#1A1A20',
          border: `1px solid ${disabled ? '#222228' : '#2E2E38'}`,
          borderRadius: 8, padding: '0 36px 0 14px',
          fontSize: 13,
          color: value ? '#E8E6F0' : '#3D3B4E',
          appearance: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none', opacity: disabled ? 0.5 : 1,
          transition: 'border-color 0.15s',
        }}
        onFocus={(e) => { if (!disabled) e.currentTarget.style.borderColor = 'rgba(75,158,255,0.5)' }}
        onBlur={(e)  => { e.currentTarget.style.borderColor = disabled ? '#222228' : '#2E2E38' }}
      >
        <option value="">{placeholder}</option>
        {children}
      </select>
      <ChevronDown
        size={14}
        style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          color: disabled ? '#3D3B4E' : '#7A7890', pointerEvents: 'none', flexShrink: 0,
        }}
      />
    </div>
  )
}

// ── Todo panel ────────────────────────────────────────────────────────────────

export function TimerTodoPanel() {
  const isOpen     = useUiStore((s) => s.isTodoOpen)
  const closePanel = useUiStore((s) => s.toggleTodo)

  const userId            = useAuthStore((s) => s.user?.id ?? '')
  const selectedProjectId = useTimerStore((s) => s.selectedProjectId)
  const selectedTaskId    = useTimerStore((s) => s.selectedTaskId)
  const setProject        = useTimerStore((s) => s.setSelectedProject)
  const setTask           = useTimerStore((s) => s.setSelectedTask)

  const [newTaskTitle, setNewTaskTitle] = React.useState('')

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

  const { mutate: createTask, isPending: isCreating } = useCreateTask()

  function handleAddTask() {
    const title = newTaskTitle.trim()
    if (!title || !selectedProjectId) return
    const order = (tasks.length + 1) * 1000
    createTask({
      project_id:   selectedProjectId,
      user_id:      userId,
      title,
      list_order:   order,
      kanban_order: order,
      status:       'todo',
    }, {
      onSuccess: (newTask) => {
        setNewTaskTitle('')
        setTask(newTask.id)
      },
    })
  }

  function handleAddKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleAddTask()
  }

  const selectedProject = projects.find((p) => p.id === selectedProjectId)

  return (
    <DialogPrimitive.Root
      open={isOpen}
      onOpenChange={(open) => { if (!open) closePanel() }}
    >
      <DialogPrimitive.Portal>
        <Backdrop />

        <DialogPrimitive.Content
          className="fixed inset-y-0 right-0 flex flex-col data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:duration-200 data-[state=closed]:duration-150"
          style={{
            zIndex: 51,
            width: '100%',
            maxWidth: 460,
            background: '#141417',
            borderLeft: '1px solid #2E2E38',
            animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '28px 32px 24px',
            borderBottom: '1px solid #2E2E38',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <DialogPrimitive.Title style={{
                  margin: 0, fontSize: 20, fontWeight: 500,
                  color: '#E8E6F0', letterSpacing: '-0.02em', lineHeight: 1.2,
                }}>
                  Project &amp; task
                </DialogPrimitive.Title>
                <DialogPrimitive.Description style={{
                  margin: '6px 0 0', fontSize: 13, color: '#7A7890', lineHeight: 1.5,
                }}>
                  Link this session to a project and task
                </DialogPrimitive.Description>
              </div>
              <DialogPrimitive.Close
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 28, height: 28, borderRadius: 6, border: 'none',
                  background: 'none', cursor: 'pointer', color: '#7A7890', flexShrink: 0,
                }}
                aria-label="Close"
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.color = '#E8E6F0'
                  ;(e.currentTarget as HTMLButtonElement).style.background = '#222228'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.color = '#7A7890'
                  ;(e.currentTarget as HTMLButtonElement).style.background = 'none'
                }}
              >
                <X size={16} />
              </DialogPrimitive.Close>
            </div>
          </div>

          {/* Scrollable body */}
          <div style={{
            flex: 1, overflowY: 'auto',
            padding: '28px 32px',
            display: 'flex', flexDirection: 'column', gap: 20,
          }}>

            {/* Project selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <FieldLabel>Project</FieldLabel>
              <StyledSelect
                value={selectedProjectId ?? ''}
                onChange={(id) => setProject(id || null)}
                placeholder="No project"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </StyledSelect>
            </div>

            {/* Task selector — only when project is selected */}
            {selectedProjectId ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <FieldLabel>Task</FieldLabel>
                  <StyledSelect
                    value={selectedTaskId ?? ''}
                    onChange={(id) => setTask(id || null)}
                    placeholder="No task"
                  >
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </StyledSelect>
                </div>

                {/* Inline add-task row */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <FieldLabel>Add a task</FieldLabel>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={handleAddKeyDown}
                      placeholder="Add a new task..."
                      disabled={isCreating}
                      style={{
                        flex: 1, height: 40, boxSizing: 'border-box',
                        background: '#1A1A20', border: '1px solid #2E2E38',
                        borderRadius: 8, padding: '0 14px',
                        fontSize: 13, color: '#E8E6F0', outline: 'none',
                        transition: 'border-color 0.15s',
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(75,158,255,0.5)' }}
                      onBlur={(e)  => { e.currentTarget.style.borderColor = '#2E2E38' }}
                    />
                    <button
                      onClick={handleAddTask}
                      disabled={!newTaskTitle.trim() || isCreating}
                      style={{
                        width: 40, height: 40, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: 8, border: '1px solid #2E2E38',
                        background: newTaskTitle.trim() ? '#4B9EFF' : '#1A1A20',
                        color: newTaskTitle.trim() ? '#fff' : '#3D3B4E',
                        cursor: newTaskTitle.trim() ? 'pointer' : 'default',
                        transition: 'background 0.15s, color 0.15s, border-color 0.15s',
                      }}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {/* Selected summary */}
                {selectedProject && (
                  <div style={{
                    padding: '12px 16px', borderRadius: 8,
                    background: 'rgba(75,158,255,0.06)',
                    border: '1px solid rgba(75,158,255,0.15)',
                  }}>
                    <p style={{ margin: 0, fontSize: 12, color: '#7A7890' }}>
                      Session will be logged to
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#E8E6F0', fontWeight: 500 }}>
                      {selectedProject.name}
                      {selectedTaskId && tasks.find((t) => t.id === selectedTaskId)
                        ? ` · ${tasks.find((t) => t.id === selectedTaskId)!.title}`
                        : ''}
                    </p>
                  </div>
                )}
              </>
            ) : (
              /* Empty state — no project selected */
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                textAlign: 'center', padding: '48px 0', gap: 12,
              }}>
                <FolderOpen size={40} style={{ color: '#3D3B4E' }} />
                <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: '#7A7890' }}>
                  No project selected
                </p>
                <p style={{ margin: 0, fontSize: 13, color: '#3D3B4E', maxWidth: 220 }}>
                  Choose a project above to see and add tasks
                </p>
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
