import { ChevronRight, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import type { SessionWithRelations } from '@/lib/supabase/queries/sessions'

interface SessionRowProps {
  session:      SessionWithRelations
  onOpenDetail: () => void
  onEdit:       () => void
  onDelete:     () => void
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour:   'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function SessionRow({ session, onOpenDetail, onEdit, onDelete }: SessionRowProps) {
  const isBreak = session.type === 'break'

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpenDetail}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpenDetail()
        }
      }}
      className={cn(
        'group flex cursor-pointer items-center gap-4 rounded-[10px] border',
        'border-depth-border',
        'transition-all duration-150',
        isBreak ? 'px-[18px] py-[10px]' : 'px-[18px] py-[14px]',
      )}
      style={{ backgroundColor: '#1A1A20' }}
      onMouseEnter={e => {
        const el = e.currentTarget
        el.style.backgroundColor = '#222228'
        el.style.borderColor = 'rgba(75,158,255,0.25)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget
        el.style.backgroundColor = '#1A1A20'
        el.style.borderColor = ''
      }}
    >
      {/* TIME — fixed 80px */}
      <div style={{ width: 80, flexShrink: 0 }}>
        <span
          className={cn(
            'font-data text-[14px] font-medium whitespace-nowrap',
            isBreak ? 'text-ink-muted' : 'text-ink-primary',
          )}
        >
          {formatTime(session.started_at)}
        </span>
      </div>

      {/* PROJECT + TASK, or a Break badge — flex-1 */}
      <div className="min-w-0 flex-1">
        {isBreak ? (
          <Badge
            variant="outline"
            className="gap-1 border-depth-border bg-depth-raised text-ink-muted font-medium"
          >
            ☕ Break
          </Badge>
        ) : session.projects ? (
          <div className="flex items-center gap-2">
            <span
              className="inline-block shrink-0 rounded-full"
              style={{ width: 10, height: 10, backgroundColor: session.projects.color }}
            />
            <span className="truncate text-[13px] font-medium text-ink-primary">
              {session.projects.name}
            </span>
          </div>
        ) : (
          <span className="text-[13px] text-ink-muted">—</span>
        )}
        {!isBreak && session.tasks && (
          <p className="truncate text-[12px] text-ink-muted" style={{ marginTop: 2 }}>
            {session.tasks.title}
          </p>
        )}
      </div>

      {/* DURATION — fixed 80px, right-aligned */}
      <div className="shrink-0 text-right" style={{ width: 80 }}>
        <span
          className={cn(
            'font-data text-[15px] font-semibold',
            isBreak ? 'text-ink-muted' : 'text-ink-primary',
          )}
        >
          {formatDuration(session.duration_mins)}
        </span>
      </div>

      {/* VIEW DETAILS affordance — fixed 16px, always visible */}
      <div className="flex shrink-0 items-center justify-center" style={{ width: 16 }}>
        <ChevronRight
          style={{ width: 15, height: 15 }}
          className="text-ink-muted transition-colors group-hover:text-ink-secondary"
        />
      </div>

      {/* THREE-DOT MENU — fixed 32px, always visible */}
      <div
        className="flex shrink-0 items-center justify-center"
        style={{ width: 32 }}
        onClick={e => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex h-7 w-7 items-center justify-center rounded
                         text-ink-muted transition-colors
                         hover:bg-depth-raised hover:text-ink-primary
                         focus:outline-none"
              aria-label="Session options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-feedback-error focus:text-feedback-error"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
