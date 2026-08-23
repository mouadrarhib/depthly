import { Clock3, MoreHorizontal } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Project, ProjectStats } from '@/lib/supabase/queries/projects'

interface ProjectCardProps {
  project: Project
  stats: ProjectStats
  isStatsLoading: boolean
  onEdit: () => void
  onArchive: () => void
  onRestore: () => void
  onDelete: () => void
  onClick: () => void
}

function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0h'
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours === 0) return `${remainingMinutes}m`
  if (remainingMinutes === 0) return `${hours}h`
  return `${hours}h ${remainingMinutes}m`
}

function formatLastFocused(value: string | null): string {
  if (!value) return 'No focus sessions'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const focusedDate = new Date(value)
  focusedDate.setHours(0, 0, 0, 0)
  const daysAgo = Math.max(0, Math.round((today.getTime() - focusedDate.getTime()) / 86_400_000))

  if (daysAgo === 0) return 'Focused today'
  if (daysAgo === 1) return 'Focused yesterday'
  if (daysAgo < 7) return `Focused ${daysAgo} days ago`

  return `Focused ${focusedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: focusedDate.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  })}`
}

export function ProjectCard({
  project,
  stats,
  isStatsLoading,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
  onClick,
}: ProjectCardProps) {
  const hasTasks = stats.total_tasks > 0
  const pct = hasTasks ? Math.round((stats.completed_tasks / stats.total_tasks) * 100) : 0

  return (
    <article
      data-project-tour="project-card"
      className="group relative overflow-hidden rounded-xl border border-depth-border bg-depth-surface transition-[transform,box-shadow,border-color] duration-150 focus-within:ring-2 focus-within:ring-brand focus-within:ring-offset-2 focus-within:ring-offset-depth-bg hover:-translate-y-0.5 hover:border-depth-raised hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
      style={{ borderTopWidth: 3, borderTopColor: project.color }}
    >
      <button
        type="button"
        className="absolute inset-0 z-0 cursor-pointer rounded-xl focus:outline-none"
        onClick={onClick}
        aria-label={`Open ${project.name}`}
      />

      <div className="pointer-events-none relative z-[1] flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: project.color }}
            />
            {project.icon ? <span className="text-lg leading-none">{project.icon}</span> : null}
            <span className="truncate text-sm font-medium text-ink-primary">{project.name}</span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              data-project-tour="project-actions"
              className="pointer-events-auto relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-secondary transition-colors hover:bg-depth-raised hover:text-ink-primary"
              aria-label={`Project actions for ${project.name}`}
            >
              <MoreHorizontal size={16} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem onSelect={onEdit}>Edit</DropdownMenuItem>
              <DropdownMenuItem onSelect={project.is_archived ? onRestore : onArchive}>
                {project.is_archived ? 'Restore' : 'Archive'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={onDelete}
                className="text-destructive focus:text-destructive"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="font-data text-[28px] text-ink-primary">
            {isStatsLoading ? '—' : formatDuration(stats.total_focus_minutes)}
          </span>
          <span className="text-xs text-ink-secondary">total focus</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <span
              className={hasTasks || project.is_archived ? 'text-ink-secondary' : 'text-brand'}
              style={{ fontSize: 12 }}
            >
              {isStatsLoading
                ? 'Loading activity'
                : hasTasks
                  ? `${stats.completed_tasks} / ${stats.total_tasks} tasks`
                  : project.is_archived
                    ? 'No tasks'
                    : 'Add first task →'}
            </span>
            {!isStatsLoading && hasTasks ? (
              <span className="text-[11px] text-ink-secondary">({pct}%)</span>
            ) : null}
          </div>

          <div className="h-1 rounded-full bg-depth-raised">
            <div
              className="h-1 rounded-full transition-[width] duration-300"
              style={{ backgroundColor: project.color, width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-depth-border pt-3 text-[11px] text-ink-secondary">
          <span className="flex min-w-0 items-center gap-1.5 truncate">
            <Clock3 size={12} className="shrink-0" />
            {isStatsLoading ? 'Loading recency' : formatLastFocused(stats.last_focused_at)}
          </span>
          {!isStatsLoading ? (
            <span className="font-data shrink-0">
              {stats.session_count} {stats.session_count === 1 ? 'session' : 'sessions'}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  )
}
