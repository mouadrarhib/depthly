import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, Search, SlidersHorizontal, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ExportPanel } from '@/components/sessions/ExportPanel'
import { SessionDetailModal } from '@/components/sessions/SessionDetailModal'
import { SessionModal } from '@/components/sessions/SessionModal'
import { SessionHistoryRow } from '@/components/sessions/SessionHistoryRow'
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
import { useArchivedProjects, useProjects } from '@/hooks/useProjects'
import { useSessionCount, useSessionsPaginated } from '@/hooks/useSessions'
import type { SessionWithRelations, SessionTypeFilter } from '@/lib/supabase/queries/sessions'
import { formatPeriodKey } from '@/lib/utils/analytics'
import { PATHS } from '@/routes/paths'

const PAGE_SIZE = 20
function formatDuration(minutes: number) {
  return minutes < 60
    ? `${minutes} min`
    : `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ''}`
}
function formatGroupDate(key: string) {
  return new Date(`${key}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}
const field =
  'h-11 w-full min-w-0 rounded-lg border border-depth-border bg-depth-bg px-3 text-sm text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand [color-scheme:dark]'
type DurationFilter = 'all' | 'short' | 'medium' | 'long'
const TYPE_OPTIONS: { value: SessionTypeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'focus', label: 'Focus' },
  { value: 'break', label: 'Breaks' },
]
export function SessionsPage() {
  const [currentPage, setCurrentPage] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<SessionWithRelations | null>(null)
  const [viewingSession, setViewingSession] = useState<SessionWithRelations | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [projectFilter, setProjectFilter] = useState('all')
  const [durationFilter, setDurationFilter] = useState<DurationFilter>('all')
  const [typeFilter, setTypeFilter] = useState<SessionTypeFilter>('all')

  const debouncedSearch = useDebounce(searchTerm, 300)
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', [])
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
    [debouncedSearch, durationBounds, fromDate, projectFilter, timezone, toDate, typeFilter]
  )

  const query = useSessionsPaginated(currentPage, sessionFilters)
  const sessionCountQuery = useSessionCount()
  const sessions = query.data?.sessions ?? []
  const totalCount = query.data?.totalCount ?? 0
  const isPending = query.isPending || sessionCountQuery.isPending
  const hasAnySessions = (sessionCountQuery.data ?? 0) > 0

  const { data: activeProjects = [] } = useProjects()
  const { data: archivedProjects = [] } = useArchivedProjects()
  const projects = [...activeProjects, ...archivedProjects]
  const scrollRef = useRef<HTMLDivElement>(null)
  const updating = query.isPlaceholderData || searchTerm.trim() !== debouncedSearch.trim()
  const invalidRange = !!fromDate && !!toDate && fromDate > toDate
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [currentPage, debouncedSearch, fromDate, toDate, projectFilter, durationFilter, typeFilter])

  useEffect(() => {
    if (
      query.isSuccess &&
      !query.isPlaceholderData &&
      !query.isFetching &&
      sessions.length === 0 &&
      currentPage > 0
    ) {
      setCurrentPage((page) => Math.max(0, page - 1))
    }
  }, [currentPage, query.isFetching, query.isSuccess, query.isPlaceholderData, sessions.length])

  const fromEntry = totalCount === 0 ? 0 : currentPage * PAGE_SIZE + 1
  const toEntry = Math.min((currentPage + 1) * PAGE_SIZE, totalCount)
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const hasPrev = currentPage > 0
  const hasNext = toEntry < totalCount

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    fromDate !== '' ||
    toDate !== '' ||
    projectFilter !== 'all' ||
    durationFilter !== 'all' ||
    typeFilter !== 'all'

  // The "secondary" filters (date range, project, duration) collapse behind
  // a toggle on mobile — Type and Search stay visible since those are the
  // ones people reach for first. This count badges that toggle so a filter
  // set from a previous visit isn't invisible just because the row is closed.
  const secondaryFilterCount =
    (fromDate !== '' ? 1 : 0) +
    (toDate !== '' ? 1 : 0) +
    (projectFilter !== 'all' ? 1 : 0) +
    (durationFilter !== 'all' ? 1 : 0)

  // The RPC applies every filter before returning a stable 20-row page.
  const grouped = sessions.reduce<Record<string, SessionWithRelations[]>>((acc, session) => {
    const key = formatPeriodKey(new Date(session.started_at), 'daily')
    const existing = acc[key]
    if (existing) {
      existing.push(session)
    } else {
      acc[key] = [session]
    }
    return acc
  }, {})
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
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 px-4 py-5 sm:px-8 lg:h-full lg:min-h-0 lg:overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-ink-primary">
            Your session history
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-primary/75">
            Find past focus sessions and breaks. Open a session to review its details.
          </p>
        </div>
        <Button variant="outline" onClick={() => setExportOpen(true)}>
          <Download size={16} />
          Export CSV
        </Button>
      </header>
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <Tabs
          value={typeFilter}
          onValueChange={(value) => handleTypeFilterChange(value as SessionTypeFilter)}
        >
          <TabsList
            aria-label="Session type"
            className="h-auto gap-1 rounded-lg border border-depth-border bg-depth-surface p-1"
          >
            {TYPE_OPTIONS.map((option) => (
              <TabsTrigger
                key={option.value}
                value={option.value}
                className="min-h-11 rounded-md px-4 text-sm text-ink-primary/70 data-[state=active]:bg-depth-raised data-[state=active]:text-brand"
              >
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative min-w-0 flex-1 basis-56">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-3.5 text-ink-primary/60"
            aria-hidden="true"
          />
          <input
            aria-label="Search sessions by project or notes"
            placeholder="Search by project or notes"
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value)
              setCurrentPage(0)
            }}
            className={`${field} bg-depth-surface pl-9 pr-11`}
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('')
                setCurrentPage(0)
              }}
              aria-label="Clear session search"
              className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-ink-primary/70"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          aria-expanded={filtersOpen}
          aria-controls="session-list-filters"
          onClick={() => setFiltersOpen(!filtersOpen)}
        >
          <SlidersHorizontal size={16} />
          Filters
          {secondaryFilterCount > 0 && (
            <span className="font-data text-brand">{secondaryFilterCount}</span>
          )}
        </Button>
      </div>
      {filtersOpen && (
        <div
          id="session-list-filters"
          className="grid shrink-0 gap-4 rounded-xl border border-depth-border bg-depth-surface p-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <label className="min-w-0 space-y-2 text-xs text-ink-primary/75">
            <span className="block">From</span>
            <input
              type="date"
              className={field}
              max={toDate || undefined}
              value={fromDate}
              onChange={(event) => {
                setFromDate(event.target.value)
                setCurrentPage(0)
              }}
            />
          </label>
          <label className="min-w-0 space-y-2 text-xs text-ink-primary/75">
            <span className="block">To</span>
            <input
              type="date"
              className={field}
              min={fromDate || undefined}
              value={toDate}
              onChange={(event) => {
                setToDate(event.target.value)
                setCurrentPage(0)
              }}
            />
          </label>
          <div>
            <label
              htmlFor="session-project-filter"
              className="mb-2 block text-xs text-ink-primary/75"
            >
              Project
            </label>
            <Select
              value={projectFilter}
              onValueChange={(value) => {
                setProjectFilter(value)
                setCurrentPage(0)
              }}
            >
              <SelectTrigger id="session-project-filter" className={field}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                    {project.is_archived ? ' (archived)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label
              htmlFor="session-duration-filter"
              className="mb-2 block text-xs text-ink-primary/75"
            >
              Duration
            </label>
            <Select
              value={durationFilter}
              onValueChange={(value) => {
                setDurationFilter(value as DurationFilter)
                setCurrentPage(0)
              }}
            >
              <SelectTrigger id="session-duration-filter" className={field}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any duration</SelectItem>
                <SelectItem value="short">Under 30 minutes</SelectItem>
                <SelectItem value="medium">30–60 minutes</SelectItem>
                <SelectItem value="long">Over 60 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
      {hasActiveFilters && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 text-xs text-ink-primary/75">
          <p>
            {typeFilter === 'all'
              ? 'All session types'
              : typeFilter === 'focus'
                ? 'Focus sessions'
                : 'Breaks'}
            {fromDate ? ` · From ${fromDate}` : ''}
            {toDate ? ` · To ${toDate}` : ''}
            {projectFilter !== 'all'
              ? ` · ${projects.find((project) => project.id === projectFilter)?.name ?? 'Selected project'}`
              : ''}
            {durationFilter !== 'all'
              ? ` · ${durationFilter === 'short' ? 'Under 30 min' : durationFilter === 'medium' ? '30–60 min' : 'Over 60 min'}`
              : ''}
            {searchTerm.trim() ? ` · Search: ${searchTerm.trim()}` : ''}
          </p>
          <button
            onClick={clearFilters}
            className="min-h-11 text-brand underline underline-offset-4"
          >
            Clear filters
          </button>
        </div>
      )}
      <div
        ref={scrollRef}
        role="region"
        aria-label="Session history"
        tabIndex={0}
        aria-busy={query.isFetching || updating}
        className="min-h-0 flex-1 overflow-visible rounded-xl border border-depth-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand lg:overflow-y-auto lg:overscroll-contain"
      >
        <div className="sticky top-0 z-10 hidden grid-cols-[140px_minmax(0,1fr)_96px_100px_44px] items-center gap-4 rounded-t-xl border-b border-depth-border bg-depth-surface px-5 py-4 text-xs text-ink-primary/70 md:grid">
          <span>Start time</span>
          <span>Project / task</span>
          <span>Type</span>
          <span className="text-right">Duration</span>
          <span className="sr-only">Options</span>
        </div>
        {invalidRange ? (
          <p role="alert" className="p-8 text-center text-sm text-feedback-error">
            The end date must be on or after the start date.
          </p>
        ) : query.isError || sessionCountQuery.isError ? (
          <div role="alert" className="p-8 text-center text-sm text-ink-primary">
            <p>We couldn’t load your session history.</p>
            <Button
              variant="ghost"
              onClick={() => {
                void query.refetch()
                void sessionCountQuery.refetch()
              }}
            >
              Try again
            </Button>
          </div>
        ) : isPending || updating ? (
          <div aria-label="Loading sessions" className="space-y-4 p-5">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-lg bg-depth-raised" />
            ))}
          </div>
        ) : !sessions.length ? (
          <div className="flex flex-col items-center gap-3 px-5 py-14 text-center">
            <h2 className="text-base font-medium text-ink-primary">
              {hasAnySessions ? 'No sessions match your filters' : 'No sessions yet'}
            </h2>
            <p className="text-sm text-ink-primary/70">
              {hasAnySessions
                ? 'Try another project, date range, or search.'
                : 'Start the timer to record your first focus session.'}
            </p>
            {hasAnySessions ? (
              <Button variant="ghost" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : (
              <Button variant="primary" asChild>
                <Link to={PATHS.timer}>Open timer</Link>
              </Button>
            )}
          </div>
        ) : (
          sortedDates.map((dateKey) => {
            const daySessions = grouped[dateKey] ?? []
            return (
              <section key={dateKey} aria-label={formatGroupDate(dateKey)}>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-depth-border bg-depth-surface/60 px-4 py-3 md:px-5">
                  <h2 className="text-xs font-medium text-ink-primary/80">
                    {formatGroupDate(dateKey)}
                  </h2>
                  <p className="font-data text-[11px] text-ink-primary/65">
                    Shown on this page:{' '}
                    {formatDuration(
                      daySessions.reduce((sum, session) => sum + session.duration_mins, 0)
                    )}
                  </p>
                </div>
                {daySessions.map((session) => (
                  <SessionHistoryRow
                    key={session.id}
                    session={session}
                    onOpen={() => setViewingSession(session)}
                    onEdit={() => openEdit(session)}
                  />
                ))}
              </section>
            )
          })
        )}
      </div>
      <footer
        className="flex shrink-0 flex-wrap items-center justify-between gap-3"
        aria-label="Session pagination"
      >
        <p className="text-xs text-ink-primary/70" aria-live="polite">
          {query.isError || sessionCountQuery.isError
            ? 'Session count unavailable'
            : isPending || updating
              ? 'Updating sessions…'
              : `Showing ${fromEntry}–${toEntry} of ${totalCount} ${hasActiveFilters ? 'matching ' : ''}sessions`}
        </p>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            aria-label="Previous session page"
            onClick={() => setCurrentPage((page) => Math.max(0, page - 1))}
            disabled={!hasPrev || query.isFetching || updating || query.isError || invalidRange}
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">Previous</span>
          </Button>
          <span className="font-data whitespace-nowrap text-xs text-ink-primary/70">
            Page {Math.min(currentPage + 1, totalPages)} of {totalPages}
          </span>
          <Button
            variant="outline"
            aria-label="Next session page"
            onClick={() => setCurrentPage((page) => page + 1)}
            disabled={!hasNext || query.isFetching || updating || query.isError || invalidRange}
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight size={16} />
          </Button>
        </div>
      </footer>
      <ExportPanel open={exportOpen} onClose={() => setExportOpen(false)} projects={projects} />
      <SessionDetailModal
        open={!!viewingSession}
        onClose={() => setViewingSession(null)}
        session={viewingSession}
        onEdit={handleEditFromDetail}
      />
      <SessionModal
        open={isModalOpen || !!editingSession}
        onClose={handleModalClose}
        session={editingSession ?? undefined}
      />
    </div>
  )
}
