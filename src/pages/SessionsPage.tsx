import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Clock, Download, Plus, Search, SlidersHorizontal, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ExportPanel } from '@/components/sessions/ExportPanel'
import { SessionModal } from '@/components/sessions/SessionModal'
import { SessionRow } from '@/components/sessions/SessionRow'
import { useSessionsPaginated, useDeleteSession } from '@/hooks/useSessions'
import { useProjects } from '@/hooks/useProjects'
import { usePlan } from '@/hooks/usePlan'
import { formatPeriodKey } from '@/lib/utils/analytics'
import { PATHS } from '@/routes/paths'
import type { SessionWithRelations } from '@/lib/supabase/queries/sessions'

const PAGE_SIZE = 20

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function formatGroupDate(dateKey: string): string {
  const parts = dateKey.split('-').map(Number)
  const y = parts[0] ?? 2000
  const m = parts[1] ?? 1
  const d = parts[2] ?? 1
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long',
    month:   'long',
    day:     'numeric',
  })
}

const DATE_INPUT_CLASS =
  'rounded-[8px] border border-depth-border bg-depth-raised px-[10px] py-[6px] ' +
  'text-[13px] text-ink-primary focus:border-brand focus:outline-none transition-colors ' +
  '[color-scheme:dark]'

// ── Skeletons ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex items-center gap-4 rounded-[10px] border border-depth-border bg-depth-surface px-[18px] py-[14px]">
      <div className="h-4 w-[72px] animate-pulse rounded bg-depth-raised" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-32 animate-pulse rounded bg-depth-raised" />
        <div className="h-2.5 w-20 animate-pulse rounded bg-depth-raised" />
      </div>
      <div className="h-4 w-12 animate-pulse rounded bg-depth-raised" />
    </div>
  )
}

function SkeletonGroup() {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="h-2.5 w-36 animate-pulse rounded bg-depth-raised" />
        <div className="h-2.5 w-10 animate-pulse rounded bg-depth-raised" />
      </div>
      <div className="flex flex-col gap-2">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

type DurationFilter = 'all' | 'short' | 'medium' | 'long'

export function SessionsPage() {
  const [currentPage,     setCurrentPage]    = useState(0)
  const [isModalOpen,     setIsModalOpen]    = useState(false)
  const [editingSession,  setEditingSession] = useState<SessionWithRelations | null>(null)
  const [deletingSession, setDeletingSession] = useState<SessionWithRelations | null>(null)

  // Filter state
  const [searchTerm,     setSearchTerm]     = useState('')
  const [fromDate,       setFromDate]       = useState('')
  const [toDate,         setToDate]         = useState('')
  const [projectFilter,  setProjectFilter]  = useState('all')
  const [durationFilter, setDurationFilter] = useState<DurationFilter>('all')

  const query      = useSessionsPaginated(currentPage)
  const sessions   = query.data?.sessions   ?? []
  const totalCount = query.data?.totalCount ?? 0
  const isPending  = query.isPending

  const { data: projects } = useProjects()
  const { isPro }          = usePlan()
  const exportPanelRef     = useRef<HTMLDivElement>(null)

  const deleteSession = useDeleteSession()

  const fromEntry  = currentPage * PAGE_SIZE + 1
  const toEntry    = Math.min((currentPage + 1) * PAGE_SIZE, totalCount)
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const hasPrev    = currentPage > 0
  const hasNext    = toEntry < totalCount

  // Derive unique projects from the current page's sessions (no extra fetch)
  const uniqueProjects = useMemo(() => {
    const seen = new Set<string>()
    const result: Array<{ id: string; name: string; color: string }> = []
    for (const s of sessions) {
      if (s.project_id && s.projects && !seen.has(s.project_id)) {
        seen.add(s.project_id)
        result.push({ id: s.project_id, name: s.projects.name, color: s.projects.color })
      }
    }
    return result
  }, [sessions])

  const hasActiveFilters =
    searchTerm !== '' ||
    fromDate   !== '' ||
    toDate     !== '' ||
    projectFilter  !== 'all' ||
    durationFilter !== 'all'

  // Client-side filtering applied to the fetched sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        const matchesProject = session.projects?.name?.toLowerCase().includes(term)
        const matchesNotes   = session.notes?.toLowerCase().includes(term)
        if (!matchesProject && !matchesNotes) return false
      }
      if (fromDate) {
        const sessionDate = formatPeriodKey(new Date(session.started_at), 'daily')
        if (sessionDate < fromDate) return false
      }
      if (toDate) {
        const sessionDate = formatPeriodKey(new Date(session.started_at), 'daily')
        if (sessionDate > toDate) return false
      }
      if (projectFilter !== 'all') {
        if (session.project_id !== projectFilter) return false
      }
      if (durationFilter === 'short'  && session.duration_mins >= 30) return false
      if (durationFilter === 'medium' && (session.duration_mins < 30 || session.duration_mins > 60)) return false
      if (durationFilter === 'long'   && session.duration_mins <= 60) return false
      return true
    })
  }, [sessions, searchTerm, fromDate, toDate, projectFilter, durationFilter])

  // Group filtered sessions by local date key ("YYYY-MM-DD")
  const grouped = filteredSessions.reduce<Record<string, SessionWithRelations[]>>(
    (acc, session) => {
      const key = formatPeriodKey(new Date(session.started_at), 'daily')
      const existing = acc[key]
      if (existing) {
        existing.push(session)
      } else {
        acc[key] = [session]
      }
      return acc
    },
    {},
  )
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  function clearFilters() {
    setSearchTerm('')
    setFromDate('')
    setToDate('')
    setProjectFilter('all')
    setDurationFilter('all')
  }

  function openCreate() {
    setEditingSession(null)
    setIsModalOpen(true)
  }

  function openEdit(session: SessionWithRelations) {
    setEditingSession(session)
    setIsModalOpen(true)
  }

  function handleModalClose() {
    setIsModalOpen(false)
    setEditingSession(null)
  }

  function handleDeleteConfirm() {
    if (!deletingSession) return
    deleteSession.mutate(deletingSession.id, {
      onSuccess: () => setDeletingSession(null),
    })
  }

  return (
    <div className="px-8 py-6">

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-medium text-ink-primary">Sessions</h1>
          {!isPending && (
            <span
              className="rounded-full border border-depth-border bg-depth-raised
                         px-3 py-1 text-[13px] text-ink-secondary"
            >
              {totalCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isPro && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => exportPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add session
          </Button>
        </div>
      </div>

      {/* Loading */}
      {isPending && (
        <div className="flex flex-col gap-5">
          <SkeletonGroup />
          <SkeletonGroup />
          <SkeletonGroup />
        </div>
      )}

      {/* True empty state — no sessions exist at all */}
      {!isPending && totalCount === 0 && (
        <div className="flex flex-col items-center py-16 text-center">
          <Clock
            className="text-ink-muted"
            style={{ width: 40, height: 40, marginBottom: 16 }}
          />
          <p className="text-[16px] font-medium text-ink-primary">No sessions yet</p>
          <p className="text-[13px] text-ink-muted" style={{ marginTop: 6 }}>
            Start the timer to record your first focus session
          </p>
          <div className="flex gap-3" style={{ marginTop: 20 }}>
            <Button variant="ghost" size="sm" asChild>
              <Link to={PATHS.home}>Start Timer</Link>
            </Button>
            <Button variant="primary" size="sm" onClick={openCreate}>
              Add Session
            </Button>
          </div>
        </div>
      )}

      {/* Sessions exist — show filter bar + content */}
      {!isPending && totalCount > 0 && (
        <>
          {/* ── Export panel ── */}
          <div ref={exportPanelRef}>
            <ExportPanel projects={projects ?? []} totalCount={totalCount} />
          </div>

          {/* ── Filter bar ── */}
          <div style={{ marginBottom: 20 }}>

            {/* Row 1 — Search */}
            <div className="relative mb-3">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
                style={{ width: 15, height: 15 }}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search by project or notes..."
                className="h-9 w-full rounded-lg border border-depth-border bg-depth-raised
                           pl-9 pr-8 text-[13px] text-ink-primary
                           placeholder:text-ink-muted
                           focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand
                           transition-colors"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted
                             transition-colors hover:text-ink-primary"
                  aria-label="Clear search"
                >
                  <X style={{ width: 13, height: 13 }} />
                </button>
              )}
            </div>

            {/* Row 2 — Filter pills */}
            <div className="flex flex-wrap items-end gap-3">

              {/* Date range */}
              <div className="flex items-end gap-2">
                <div>
                  <p className="mb-1 text-[11px] text-ink-muted">From</p>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={e => setFromDate(e.target.value)}
                    max={toDate || undefined}
                    className={DATE_INPUT_CLASS}
                  />
                </div>
                <div>
                  <p className="mb-1 text-[11px] text-ink-muted">To</p>
                  <input
                    type="date"
                    value={toDate}
                    onChange={e => setToDate(e.target.value)}
                    min={fromDate || undefined}
                    className={DATE_INPUT_CLASS}
                  />
                </div>
              </div>

              {/* Project filter */}
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger style={{ width: 160 }} className="h-9 text-[13px]">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <SlidersHorizontal style={{ width: 13, height: 13, flexShrink: 0 }} className="text-ink-muted" />
                    <SelectValue placeholder="All projects" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All projects</SelectItem>
                  {uniqueProjects.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block shrink-0 rounded-full"
                          style={{ width: 8, height: 8, backgroundColor: p.color }}
                        />
                        {p.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Duration filter */}
              <Select
                value={durationFilter}
                onValueChange={v => setDurationFilter(v as DurationFilter)}
              >
                <SelectTrigger style={{ width: 160 }} className="h-9 text-[13px]">
                  <SelectValue placeholder="Any duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any duration</SelectItem>
                  <SelectItem value="short">Short (&lt; 30m)</SelectItem>
                  <SelectItem value="medium">Medium (30–60m)</SelectItem>
                  <SelectItem value="long">Long (&gt; 1h)</SelectItem>
                </SelectContent>
              </Select>

              {/* Clear all — only when a filter is active */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-[13px] text-ink-secondary"
                >
                  Clear filters
                </Button>
              )}
            </div>
          </div>

          {/* Active filter indicator */}
          {hasActiveFilters && filteredSessions.length > 0 && (
            <p className="mb-4 text-[12px] text-ink-muted">
              Showing {filteredSessions.length} of {totalCount} sessions
            </p>
          )}

          {/* Filtered empty state — sessions exist but none match filters */}
          {filteredSessions.length === 0 && (
            <div className="flex flex-col items-center py-16 text-center">
              <Search
                className="text-ink-muted"
                style={{ width: 36, height: 36, marginBottom: 14 }}
              />
              <p className="text-[16px] font-medium text-ink-primary">
                No sessions match your filters
              </p>
              <p className="text-[13px] text-ink-muted" style={{ marginTop: 6 }}>
                Try adjusting or clearing the filters
              </p>
              <div style={{ marginTop: 20 }}>
                <Button variant="primary" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              </div>
            </div>
          )}

          {/* Grouped session list */}
          {filteredSessions.length > 0 && (
            <>
              <div className="flex flex-col gap-8">
                {sortedDates.map((dateKey) => {
                  const daySessions = grouped[dateKey] ?? []
                  const dayMins = daySessions.reduce((sum, s) => sum + s.duration_mins, 0)

                  return (
                    <div key={dateKey}>
                      {/* Date group header */}
                      <div
                        className="flex items-center justify-between"
                        style={{
                          paddingBottom: 10,
                          borderBottom:  '1px solid #2E2E38',
                          marginBottom:  10,
                        }}
                      >
                        <span className="text-[13px] font-semibold text-ink-primary">
                          {formatGroupDate(dateKey)}
                        </span>
                        <span className="font-data text-[13px] text-ink-secondary">
                          {formatDuration(dayMins)}
                        </span>
                      </div>

                      {/* Session cards for this day */}
                      <div className="flex flex-col gap-2">
                        {daySessions.map(session => (
                          <SessionRow
                            key={session.id}
                            session={session}
                            onEdit={() => openEdit(session)}
                            onDelete={() => setDeletingSession(session)}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Pagination */}
              <div style={{ marginTop: 16 }} className="text-center">
                {!hasActiveFilters && (
                  <p className="text-[12px] text-ink-muted">
                    Showing {fromEntry}–{toEntry} of {totalCount} sessions
                  </p>
                )}
                <div
                  className="flex items-center justify-center gap-3"
                  style={{ marginTop: 12 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(p => p - 1)}
                    disabled={!hasPrev}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-[12px] text-ink-muted">
                    Page {currentPage + 1} of {totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(p => p + 1)}
                    disabled={!hasNext}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Edit / create modal */}
      <SessionModal
        open={isModalOpen || !!editingSession}
        onClose={handleModalClose}
        session={editingSession ?? undefined}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deletingSession}
        onClose={() => setDeletingSession(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete session?"
        description="This session will be permanently deleted. Session stats won't be recalculated automatically."
        confirmLabel="Delete"
        isLoading={deleteSession.isPending}
        variant="danger"
      />

    </div>
  )
}
