import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'

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
  total_tasks:         number
  completed_tasks:     number
}

interface ProjectCardProps {
  project:   Project
  stats:     ProjectStats
  onEdit:    () => void
  onArchive: () => void
  onDelete:  () => void
  onClick:   () => void
}

function formatHours(minutes: number): string {
  if (minutes === 0) return '0h'
  if (minutes < 60)  return `${minutes}m`
  return `${parseFloat((minutes / 60).toFixed(1))}h`
}

export function ProjectCard({
  project,
  stats,
  onEdit,
  onArchive,
  onDelete,
  onClick,
}: ProjectCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const hasTasks = stats.total_tasks > 0
  const pct      = hasTasks
    ? Math.round((stats.completed_tasks / stats.total_tasks) * 100)
    : 0

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: '#141417',
        borderTop:       `3px solid ${project.color}`,
        borderRight:     `1px solid ${isHovered ? 'rgba(255,255,255,0.1)' : '#2E2E38'}`,
        borderBottom:    `1px solid ${isHovered ? 'rgba(255,255,255,0.1)' : '#2E2E38'}`,
        borderLeft:      `1px solid ${isHovered ? 'rgba(255,255,255,0.1)' : '#2E2E38'}`,
        borderRadius:    12,
        transform:       isHovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow:       isHovered ? '0 8px 24px rgba(0,0,0,0.4)' : 'none',
        transition:      'all 150ms ease',
        cursor:          'pointer',
        overflow:        'hidden',
      }}
    >
      <div className="flex flex-col gap-4 p-4">

        {/* Top row */}
        <div className="flex items-center justify-between gap-2">
          <div
            className="flex min-w-0 flex-1 items-center gap-2"
            onClick={onClick}
          >
            <span
              className="shrink-0 rounded-full"
              style={{ width: 12, height: 12, backgroundColor: project.color }}
            />
            {project.icon && (
              <span style={{ fontSize: 18, lineHeight: 1 }}>{project.icon}</span>
            )}
            <span className="truncate text-sm font-medium text-ink-primary">
              {project.name}
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md
                         text-ink-secondary transition-colors
                         hover:bg-depth-raised hover:text-ink-primary"
              onClick={e => e.stopPropagation()}
            >
              <MoreHorizontal size={16} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem onSelect={onEdit}>Edit</DropdownMenuItem>
              <DropdownMenuItem onSelect={onArchive}>Archive</DropdownMenuItem>
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

        {/* Focus stat */}
        <div className="flex flex-col gap-0.5" onClick={onClick}>
          <span className="font-data text-ink-primary" style={{ fontSize: 28 }}>
            {formatHours(stats.total_focus_minutes)}
          </span>
          <span className="text-ink-muted" style={{ fontSize: 12 }}>
            total focus
          </span>
        </div>

        {/* Task progress */}
        <div className="flex flex-col gap-1.5" onClick={onClick}>
          <div className="flex items-center gap-1.5">
            <span className="text-ink-secondary" style={{ fontSize: 12 }}>
              {hasTasks
                ? `${stats.completed_tasks} / ${stats.total_tasks} tasks`
                : 'No tasks yet'}
            </span>
            {hasTasks && (
              <span style={{ fontSize: 11, color: '#7A7890' }}>({pct}%)</span>
            )}
          </div>

          {/* Progress track — always visible */}
          <div style={{ height: 4, borderRadius: 999, backgroundColor: '#222228' }}>
            <div
              style={{
                height:          4,
                borderRadius:    999,
                backgroundColor: project.color,
                width:           pct > 0 ? `${pct}%` : 4,
                transition:      'width 300ms ease',
              }}
            />
          </div>
        </div>

      </div>
    </div>
  )
}
