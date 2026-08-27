import { useEffect, useMemo, useRef, useState } from 'react'

import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock, Download, Search, SlidersHorizontal, X } from 'lucide-react'
import { Link } from 'react-router-dom'


import { ExportPanel } from '@/components/sessions/ExportPanel'
import { SessionDetailModal } from '@/components/sessions/SessionDetailModal'
import { SessionModal } from '@/components/sessions/SessionModal'
import { SessionRow } from '@/components/sessions/SessionRow'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDebounce } from '@/hooks/shared/useDebounce'
import { usePlan } from '@/hooks/usePlan'
import { useProjects } from '@/hooks/useProjects'
import { useSessionCount, useSessionsPaginated } from '@/hooks/useSessions'
import type { SessionWithRelations, SessionTypeFilter } from '@/lib/supabase/queries/sessions'
import { cn } from '@/lib/utils'
import { formatPeriodKey } from '@/lib/utils/analytics'
import { PATHS } from '@/routes/paths'

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

const TYPE_OPTIONS: { value: SessionTypeFilter; label: string }[] = [
  { value: 'all',   label: 'All'    },
  { value: 'focus', label: 'Focus'  },
  { value: 'break', label: 'Breaks' },
]

export function SessionsPage() {
  const [currentPage,     setCurrentPage]    = useState(0)
  const [isModalOpen,     setIsModalOpen]    = useState(false)
  const [editingSession,  setEditingSession] = useState<SessionWithRelations | null>(null)
  const [viewingSession,  setViewingSession] = useState<SessionWithRelations | null>(null)
  const [exportOpen,      setExportOpen]     = useState(false)
  const [filtersOpen,     setFiltersOpen]    = useState(false)

  // Filter state
  const [searchTerm,     setSearchTerm]     = useState('')
  const [fromDate,       setFromDate]       = useState('')
  const [toDate,         setToDate]         = useState('')
  const [projectFilter,  setProjectFilter]  = useState('all')
  const [durationFilter, setDurationFilter] = useState<DurationFilter>('all')
  const [typeFilter,     setTypeFilter]     = useState<SessionTypeFilter>('all')

  const debouncedSearch = useDebounce(searchTerm, 300)
  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    [],
  )
  const durationBounds = useMemo(() => {
    if (durationFilter === 'short') return { minDuration: null, maxDuration: 29 }
    if (durationFilter === 'medium') return { minDuration: 30, maxDuration: 60 }
    if (durationFilter === 'long') return { minDuration: 61, maxDuration: null }
    return { minDuration: null, maxDuration: null }
  }, [durationFilter])
  const sessionFilters = useMemo(
    () => ({
      type: typeFilter,
      search: debouncedSearch,
      timezone,
      fromDate: fromDate || null,
      toDate: toDate || null,
      projectId: projectFilter === 'all' ? null : projectFilter,
      ...durationBounds,
    }),
    [debouncedSearch, durationBounds, fromDate, projectFilter, timezone, toDate, typeFilter],
  )

  const query      = useSessionsPaginated(currentPage, sessionFilters)
  const sessionCountQuery = useSessionCount()
  const sessions   = query.data?.sessions   ?? []
  const totalCount = query.data?.totalCount ?? 0
  const isPending  = query.isPending || sessionCountQuery.isPending
  const hasAnySessions = (sessionCountQuery.data ?? 0) > 0

  const { data: projects } = useProjects()
  const { isPro }          = usePlan()
  const exportPanelRef     = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (exportOpen) exportPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [exportOpen])

  useEffect(() => {
    if (!query.isFetching && sessions.length === 0 && currentPage > 0) {
      setCurrentPage(page => Math.max(0, page - 1))
    }
  }, [currentPage, query.isFetching, sessions.length])

  const fromEntry  = totalCount === 0 ? 0 : currentPage * PAGE_SIZE + 1
  const toEntry    = Math.min((currentPage + 1) * PAGE_SIZE, totalCount)
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const hasPrev    = currentPage > 0
  const hasNext    = toEntry < totalCount

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    fromDate   !== '' ||
    toDate     !== '' ||
    projectFilter  !== 'all' ||
    durationFilter !== 'all' ||
    typeFilter     !== 'all'

  // The "secondary" filters (date range, project, duration) collapse behind
  // a toggle on mobile — Type and Search stay visible since those are the
  // ones people reach for first. This count badges that toggle so a filter
  // set from a previous visit isn't invisible just because the row is closed.
  const secondaryFilterCount =
    (fromDate !== '' ? 1 : 0) +
    (toDate   !== '' ? 1 : 0) +
    (projectFilter  !== 'all' ? 1 : 0) +
    (durationFilter !== 'all' ? 1 : 0)

  // The RPC applies every filter before returning a stable 20-row page.
  const grouped = sessions.reduce<Record<string, SessionWithRelations[]>>(
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
    setTypeFilter('all')
    setCurrentPage(0)
  }

  function handleTypeFilterChange(next: SessionTypeFilter) {
    setTypeFilter(next)
    setCurrentPage(0)
  }

  function openEdit(session: SessionWithRelations) {
    setEditingSession(session)
    setIsModalOpen(true)
  }

  function handleModalClose() {
    setIsModalOpen(false)
    setEditingSession(null)
  }

  function handleEditFromDetail() {
    if (!viewingSession) return
    openEdit(viewingSession)
    setViewingSession(null)
  }

  return (
    <div className="px-4 py-4 sm:px-8 sm:py-6">

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
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
              onClick={() => setExportOpen(o => !o)}
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
              {exportOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
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
      {!isPending && !hasAnySessions && (
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
            <Button variant="primary" size="sm" asChild>
              <Link to={PATHS.timer}>Start Timer</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Sessions exist — show filter bar + content */}
      {!isPending && hasAnySessions && (
        <>
          {/* ── Export panel — collapsed by default for Pro users, toggled by the header Export button ── */}
          <div ref={exportPanelRef}>
            {(!isPro || exportOpen) && (
              <ExportPanel projects={projects ?? []} totalCount={sessionCountQuery.data ?? 0} />
            )}
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
                onChange={e => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(0)
                }}
                placeholder="Search by project or notes..."
                className="h-9 w-full rounded-lg border border-depth-border bg-depth-raised
                           pl-9 pr-8 text-[13px] text-ink-primary
                           placeholder:text-ink-muted
                           focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand
                           transition-colors"
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setCurrentPage(0)
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted
                             transition-colors hover:text-ink-primary"
                  aria-label="Clear search"
                >
                  <X style={{ width: 13, height: 13 }} />
                </button>
              )}
            </div>

            {/* Row 2 — Type (always visible) + mobile Filters toggle */}
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div>
                <p className="mb-1 text-[11px] text-ink-muted">Type</p>
                <Tabs
                  value={typeFilter}
                  onValueChange={v => handleTypeFilterChange(v as SessionTypeFilter)}
                >
                  <TabsList
                    className="h-9 rounded-full p-1 gap-0.5"
                    style={{ background: 'var(--color-surface-overlay)' }}
                  >
                    {TYPE_OPTIONS.map(({ value, label }) => (
                      <TabsTrigger
                        key={value}
                        value={value}
                        className={[
                          'rounded-full text-[13px] font-medium px-[14px] py-[4px]',
                          'transition-all shadow-none',
                          'data-[state=inactive]:bg-transparent data-[state=inactive]:text-[var(--color-text-faint)]',
                          'data-[state=active]:bg-[var(--color-surface-raised)] data-[state=active]:text-[var(--color-brand)]',
                          'data-[state=active]:border data-[state=active]:border-[rgba(75,158,255,0.3)]',
                          'data-[state=active]:shadow-none',
                        ].join(' ')}
                      >
                        {label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
                </div>
              </div>

              {/* Date range / project / duration collapse behind this on
                  mobile — surfacing all four at once above the session list
                  ate too much of the screen before showing any content. */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFiltersOpen(o => !o)}
                className="h-9 gap-1.5 text-[13px] sm:hidden"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filters
                {secondaryFilterCount > 0 && (
                  <span
                    className="inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold"
                    style={{ background: 'rgba(75,158,255,0.18)', color: '#4B9EFF' }}
                  >
                    {secondaryFilterCount}
                  </span>
                )}
                {filtersOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </Button>
            </div>

            {/* Row 3 — Date range, project, duration. Always visible at
                sm+; on mobile only when the Filters toggle above is open. */}
            <div
              className={cn(
                'mt-3 flex-col gap-3 sm:mt-3 sm:flex sm:flex-row sm:flex-wrap sm:items-end sm:gap-3',
                filtersOpen ? 'flex' : 'hidden',
              )}
            >
              {/* Date range */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div>
                  <p className="mb-1 text-[11px] text-ink-muted">From</p>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={e => {
                      setFromDate(e.target.value)
                      setCurrentPage(0)
                    }}
                    max={toDate || undefined}
                    className={DATE_INPUT_CLASS + ' w-full sm:w-auto'}
                  />
                </div>
                <div>
                  <p className="mb-1 text-[11px] text-ink-muted">To</p>
                  <input
                    type="date"
                    value={toDate}
                    onChange={e => {
                      setToDate(e.target.value)
                      setCurrentPage(0)
                    }}
                    min={fromDate || undefined}
                    className={DATE_INPUT_CLASS + ' w-full sm:w-auto'}
                  />
                </div>
              </div>

              {/* Project filter */}
              <Select
                value={projectFilter}
                onValueChange={value => {
                  setProjectFilter(value)
                  setCurrentPage(0)
                }}
              >
                <SelectTrigger className="h-9 w-full text-[13px] sm:w-[160px]">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <SlidersHorizontal style={{ width: 13, height: 13, flexShrink: 0 }} className="text-ink-muted" />
                    <SelectValue placeholder="All projects" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All projects</SelectItem>
                  {(projects ?? []).map(p => (
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
                onValueChange={v => {
                  setDurationFilter(v as DurationFilter)
                  setCurrentPage(0)
                }}
              >
                <SelectTrigger className="h-9 w-full text-[13px] sm:w-[160px]">
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
                  className="w-full text-[13px] text-ink-secondary sm:w-auto"
                >
                  Clear filters
                </Button>
              )}
            </div>
          </div>

          {/* Active filter indicator */}
          {hasActiveFilters && sessions.length > 0 && (
            <p className="mb-4 text-[12px] text-ink-muted">
              Showing {fromEntry}–{toEntry} of {totalCount} matching sessions
            </p>
          )}

          {/* Filtered empty state — sessions exist but none match filters */}
          {sessions.length === 0 && (
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
          {sessions.length > 0 && (
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
                            onOpenDetail={() => setViewingSession(session)}
                            onEdit={() => openEdit(session)}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Pagination */}
              <div style={{ marginTop: 16 }} className="text-center">
                <p className="text-[12px] text-ink-muted">
                  Showing {fromEntry}–{toEntry} of {totalCount} sessions
                </p>
                <div
                  className="flex items-center justify-center gap-3"
                  style={{ marginTop: 12 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(p => p - 1)}
                    disabled={!hasPrev || query.isFetching}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Previous</span>
                  </Button>
                  <span className="text-[12px] text-ink-muted whitespace-nowrap">
                    Page {currentPage + 1} of {totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(p => p + 1)}
                    disabled={!hasNext || query.isFetching}
                    aria-label="Next page"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Session detail modal */}
      <SessionDetailModal
        open={!!viewingSession}
        onClose={() => setViewingSession(null)}
        session={viewingSession}
        onEdit={handleEditFromDetail}
      />

      {/* Edit / create modal */}
      <SessionModal
        open={isModalOpen || !!editingSession}
        onClose={handleModalClose}
        session={editingSession ?? undefined}
      />

    </div>
  )
}
