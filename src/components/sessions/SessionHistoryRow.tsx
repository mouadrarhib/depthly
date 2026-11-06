import { MoreHorizontal, Pencil, ShieldQuestion } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { SessionWithRelations } from '@/lib/supabase/queries/sessions'

export function SessionHistoryRow({
  session,
  onOpen,
  onEdit,
}: {
  session: SessionWithRelations
  onOpen: () => void
  onEdit: () => void
}) {
  const time = new Date(session.started_at).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
  const minutes = session.duration_mins
  const duration =
    minutes < 60
      ? `${minutes} min`
      : `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ''}`
  const isBreak = session.type === 'break'
  return (
    <article className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-b border-depth-border/60 px-4 py-4 focus-within:ring-2 focus-within:ring-inset focus-within:ring-brand hover:bg-depth-raised/40 md:grid-cols-[140px_minmax(0,1fr)_96px_100px_44px] md:px-5">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${isBreak ? 'break' : 'focus'} session from ${time}, ${duration}, ${session.projects?.name ?? 'No project'}`}
        className="absolute inset-0 focus:outline-none"
      />
      <span className="font-data pointer-events-none order-2 text-xs text-ink-primary/80 md:order-1">
        {time}
      </span>
      <div className="pointer-events-none order-1 col-span-2 min-w-0 pr-12 md:order-2 md:col-span-1 md:pr-0">
        <div className="flex items-start gap-2">
          <span
            className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: session.projects?.color ?? '#9490aa' }}
            aria-hidden="true"
          />
          <span className="min-w-0 break-words text-sm font-medium text-ink-primary">
            {session.projects?.name ?? 'No project'}
          </span>
        </div>
        <p className="mt-1 pl-4 text-xs leading-5 text-ink-primary/70">
          {session.tasks?.title ?? (isBreak ? 'Break session' : 'No task')}
        </p>
        {!isBreak && !session.is_trusted && (
          <span className="mt-1 inline-flex items-center gap-1 pl-4 text-[10px] text-ink-primary/65">
            <ShieldQuestion size={11} aria-hidden="true" />
            Legacy session
          </span>
        )}
      </div>
      <span
        className={`pointer-events-none order-3 w-fit rounded-md px-2.5 py-1 text-[11px] ${isBreak ? 'bg-depth-raised text-ink-primary/75' : 'bg-brand/10 text-brand'}`}
      >
        {isBreak ? 'Break' : 'Focus'}
      </span>
      <span className="font-data pointer-events-none order-4 col-start-2 row-start-2 text-right text-sm text-ink-primary md:col-auto md:row-auto">
        {duration}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Options for session at ${time}`}
          className="absolute right-3 top-3 z-[1] order-5 flex h-11 w-11 items-center justify-center rounded-md text-ink-primary/70 hover:bg-depth-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand md:static"
        >
          <MoreHorizontal size={18} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil size={14} />
            Edit session
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </article>
  )
}
