import { MoreHorizontal } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/Card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Tables } from '@/types/database'

type Project = Tables<'projects'>

interface ProjectStats {
  total_focus_minutes: number
  total_tasks: number
  completed_tasks: number
}

interface ProjectCardProps {
  project:   Project
  stats:     ProjectStats
  onEdit:    () => void
  onArchive: () => void
  onDelete:  () => void
  onClick:   () => void
}

export function ProjectCard({
  project,
  stats,
  onEdit,
  onArchive,
  onDelete,
  onClick,
}: ProjectCardProps) {
  const focusHours = (stats.total_focus_minutes / 60).toFixed(1)
  const hasTasks   = stats.total_tasks > 0
  const pct        = hasTasks
    ? Math.round((stats.completed_tasks / stats.total_tasks) * 100)
    : 0

  return (
    <Card className="bg-depth-surface border-depth-border transition-colors hover:bg-depth-raised cursor-pointer">
      <CardContent className="p-4 flex flex-col gap-4">

        {/* Top row */}
        <div className="flex items-center justify-between gap-2">
          <div
            className="flex items-center gap-2 min-w-0 flex-1"
            onClick={onClick}
          >
            <span
              className="shrink-0 rounded-full"
              style={{ width: 10, height: 10, backgroundColor: project.color }}
            />
            {project.icon && (
              <span style={{ fontSize: 18, lineHeight: 1 }}>{project.icon}</span>
            )}
            <span className="text-ink-primary text-sm font-medium truncate">
              {project.name}
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              className="shrink-0 flex items-center justify-center w-7 h-7 rounded-md text-ink-secondary hover:text-ink-primary hover:bg-depth-raised transition-colors"
              onClick={e => e.stopPropagation()}
            >
              <MoreHorizontal size={16} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem onSelect={onEdit}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onArchive}>
                Archive
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

        {/* Middle — focus stat */}
        <div className="flex flex-col gap-0.5" onClick={onClick}>
          <span className="font-data text-ink-primary" style={{ fontSize: 24 }}>
            {focusHours}h
          </span>
          <span className="text-ink-muted" style={{ fontSize: 12 }}>
            total focus
          </span>
        </div>

        {/* Bottom — task progress */}
        <div className="flex flex-col gap-1.5" onClick={onClick}>
          {hasTasks ? (
            <>
              <span className="text-ink-secondary" style={{ fontSize: 12 }}>
                {stats.completed_tasks} / {stats.total_tasks} tasks
              </span>
              <div className="h-1.5 rounded-full bg-depth-raised overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </>
          ) : (
            <span className="text-ink-muted" style={{ fontSize: 12 }}>
              No tasks yet
            </span>
          )}
        </div>

      </CardContent>
    </Card>
  )
}
