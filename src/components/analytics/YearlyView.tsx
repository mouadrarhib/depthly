import { useRef, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { UpgradeModal } from '@/components/billing/UpgradeModal'
import { Button } from '@/components/ui/button'
import { useDailySummariesRange, useSessionsForYear } from '@/hooks/useAnalytics'
import { useAnalyticsWindow } from '@/hooks/usePlanLimits'
import { formatPeriodKey, formatMinutesToHours } from '@/lib/utils/analytics'
import { sessionsToDailyTotals, getLongestFocusStreak } from '@/lib/utils/analyticsSessions'
import type { AnalyticsProjectScope } from '@/types/app'

interface YearlyViewProps extends AnalyticsProjectScope {
  date: Date
  onSelectDay?: (date: Date) => void
}
export function YearlyView({ date, projectId, projectLabel, onSelectDay }: YearlyViewProps) {
  const year = date.getFullYear()
  const summaryQuery = useDailySummariesRange(`${year}-01-01`, `${year}-12-31`)
  const sessionQuery = useSessionsForYear(year, projectId)
  const { windowDays, isPro } = useAnalyticsWindow()
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const cells = useRef(new Map<string, HTMLButtonElement>())
  const todayKey = formatPeriodKey(new Date(), 'daily')
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - (windowDays - 1))
  const locked = !isPro && `${year}-01-01` < formatPeriodKey(cutoff, 'daily')
  const sessions = sessionQuery.data ?? []
  const totals =
    projectId !== undefined
      ? sessionsToDailyTotals(sessions)
      : new Map((summaryQuery.data ?? []).map((row) => [row.date, row]))
  const days: Date[] = []
  for (
    let day = new Date(year, 0, 1);
    day.getFullYear() === year;
    day = new Date(year, day.getMonth(), day.getDate() + 1)
  )
    days.push(day)
  const validDays = days.filter((day) => formatPeriodKey(day, 'daily') <= todayKey)
  const selected =
    validDays.find((day) => formatPeriodKey(day, 'daily') === selectedKey) ??
    validDays[validDays.length - 1]
  const selection = selected ? formatPeriodKey(selected, 'daily') : null
  const entries = [...totals.values()].filter((row) => row.date <= todayKey)
  const minutes = entries.reduce((sum, row) => sum + row.focus_minutes, 0)
  const count = entries.reduce((sum, row) => sum + row.session_count, 0)
  const focusDays = entries.filter((row) => row.focus_minutes > 0).length
  const months = Array.from({ length: 12 }, (_, month) => ({
    month,
    label: new Date(year, month, 1).toLocaleDateString(undefined, { month: 'short' }),
    minutes: 0,
  }))
  const weeks = new Map<string, number>()
  for (const row of entries) {
    const local = new Date(`${row.date}T12:00:00`)
    months[local.getMonth()].minutes += row.focus_minutes
    local.setDate(local.getDate() - ((local.getDay() + 6) % 7))
    const key = formatPeriodKey(local, 'daily')
    weeks.set(key, (weeks.get(key) ?? 0) + row.focus_minutes)
  }
  const bestMonth = [...months].sort((a, b) => b.minutes - a.minutes)[0]
  const bestDay = [...entries].sort((a, b) => b.focus_minutes - a.focus_minutes)[0]
  const bestWeek = [...weeks.entries()].sort((a, b) => b[1] - a[1])[0]
  const longest = getLongestFocusStreak(entries)
  const projectMap = new Map<string, { name: string; color: string; minutes: number }>()
  for (const session of sessions) {
    const id = session.project_id ?? '__none__'
    const current = projectMap.get(id)
    if (current) current.minutes += session.duration_mins
    else
      projectMap.set(id, {
        name: session.projects?.name ?? 'No project',
        color: session.projects?.color ?? '#9490aa',
        minutes: session.duration_mins,
      })
  }
  const projects = [...projectMap.entries()].sort((a, b) => b[1].minutes - a[1].minutes)
  const projectTotal = projects.reduce((sum, [, entry]) => sum + entry.minutes, 0)
  const selectedTotal = selection ? totals.get(selection) : undefined
  const leading = (days[0].getDay() + 6) % 7
  const columns = Math.ceil((leading + days.length) / 7)
  const panel = 'rounded-xl border border-depth-border bg-depth-surface'
  function moveFocus(key: string, event: React.KeyboardEvent<HTMLButtonElement>) {
    const index = validDays.findIndex((day) => formatPeriodKey(day, 'daily') === key)
    const direction: Record<string, number> = {
      ArrowLeft: -7,
      ArrowRight: 7,
      ArrowUp: -1,
      ArrowDown: 1,
    }
    let next = index
    if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = validDays.length - 1
    else if (event.key in direction)
      next = Math.max(0, Math.min(validDays.length - 1, index + direction[event.key]))
    else return
    event.preventDefault()
    const nextKey = formatPeriodKey(validDays[next], 'daily')
    setSelectedKey(nextKey)
    cells.current.get(nextKey)?.focus()
  }
  if (locked)
    return (
      <section className={`${panel} px-5 py-16 text-center`}>
        <h2 className="text-xl font-medium text-ink-primary">Explore your full focus history</h2>
        <p className="mt-2 text-sm text-ink-primary/75">
          Your Free plan includes the last {windowDays} days. Pro includes your yearly history.
        </p>
        <Button variant="primary" className="mt-5" onClick={() => setUpgradeOpen(true)}>
          Upgrade to Pro
        </Button>
        <UpgradeModal
          open={upgradeOpen}
          onClose={() => setUpgradeOpen(false)}
          trigger="analytics"
        />
      </section>
    )
  if (summaryQuery.isPending || sessionQuery.isPending)
    return (
      <div aria-label="Loading yearly analytics" className="space-y-6">
        <div className="h-36 animate-pulse rounded-xl bg-depth-raised" />
        <div className="h-56 animate-pulse rounded-xl bg-depth-raised" />
      </div>
    )
  if (summaryQuery.isError || sessionQuery.isError)
    return (
      <div role="alert" className={`${panel} p-8 text-center text-sm text-ink-primary`}>
        <p>We couldn’t load this year’s focus activity.</p>
        <Button
          variant="ghost"
          onClick={() => {
            void summaryQuery.refetch()
            void sessionQuery.refetch()
          }}
        >
          Try again
        </Button>
      </div>
    )
  const stats = [
    { label: 'Total focus', value: formatMinutesToHours(minutes), note: 'Recorded this year' },
    { label: 'Focus sessions', value: count, note: 'Completed focus sessions' },
    { label: 'Focus days', value: focusDays, note: 'Days with recorded focus' },
    {
      label: 'Average session',
      value: formatMinutesToHours(count ? Math.round(minutes / count) : 0),
      note: 'Across this year’s sessions',
    },
  ]
  const highlights = [
    {
      label: 'Most focused month',
      value: bestMonth.minutes
        ? new Date(year, bestMonth.month, 1).toLocaleDateString(undefined, { month: 'long' })
        : '—',
      note: bestMonth.minutes
        ? `${formatMinutesToHours(bestMonth.minutes)} recorded`
        : 'No recorded focus yet',
    },
    {
      label: 'Longest streak',
      value: `${longest} ${longest === 1 ? 'day' : 'days'}`,
      note: 'Consecutive focus days',
    },
    {
      label: 'Most focused day',
      value: bestDay?.focus_minutes
        ? new Date(`${bestDay.date}T12:00:00`).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })
        : '—',
      note: bestDay?.focus_minutes
        ? `${formatMinutesToHours(bestDay.focus_minutes)} recorded`
        : 'No recorded focus yet',
    },
    {
      label: 'Most focused week',
      value: bestWeek?.[1] ? formatMinutesToHours(bestWeek[1]) : '—',
      note: bestWeek?.[1]
        ? `Week of ${new Date(`${bestWeek[0]}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · within this year`
        : 'Monday-start calendar weeks',
    },
  ]
  return (
    <div className="space-y-6">
      <section
        aria-label="Yearly focus summary"
        className={`${panel} grid grid-cols-1 overflow-hidden sm:grid-cols-2 xl:grid-cols-4`}
      >
        {stats.map((item, index) => (
          <div
            key={item.label}
            className={`min-w-0 border-depth-border p-5 sm:p-6 ${index ? 'border-t' : ''} ${index % 2 ? 'sm:border-l' : ''} ${index === 1 ? 'sm:border-t-0' : ''} xl:border-t-0 ${index ? 'xl:border-l' : ''}`}
          >
            <h2 className="text-sm font-medium text-ink-primary/80">{item.label}</h2>
            <p className="font-data mt-4 break-words text-3xl text-ink-primary">{item.value}</p>
            <p className="mt-4 text-xs leading-5 text-ink-primary/70">{item.note}</p>
          </div>
        ))}
      </section>
      <section className={`${panel} min-w-0 p-5 sm:p-6`} aria-labelledby="year-activity">
        <div className="flex justify-between gap-3">
          <h2 id="year-activity" className="text-lg font-medium text-ink-primary">
            Your year, day by day
          </h2>
          <span className="font-data text-xs text-ink-primary/70">{year}</span>
        </div>
        <p className="mt-1 text-xs leading-5 text-ink-primary/75">
          Each square is a day. Brighter squares show more recorded focus time.
        </p>
        <p id="year-keyboard-help" className="sr-only">
          Use arrow keys to move between days, Home for the first day, and End for the latest day.
          Select a day, then use Open Daily view for details.
        </p>
        <div className="mt-5 max-w-full overflow-x-auto pb-2">
          <div className="relative" style={{ width: columns * 18 + 36 }}>
            <div className="relative ml-9 h-6">
              {months.map((month) => {
                const first = new Date(year, month.month, 1)
                const ordinal = Math.round(
                  (Date.UTC(year, month.month, 1) - Date.UTC(year, 0, 1)) / 86400000
                )
                const col = Math.floor((leading + ordinal) / 7)
                return (
                  <span
                    key={month.month}
                    className="absolute text-[10px] text-ink-primary/70"
                    style={{ left: col * 18 }}
                  >
                    {first.toLocaleDateString(undefined, { month: 'short' })}
                  </span>
                )
              })}
            </div>
            <div className="flex gap-2">
              <div className="relative w-7 shrink-0 text-[10px] text-ink-primary/65">
                {[
                  { name: 'Mon', row: 0 },
                  { name: 'Wed', row: 2 },
                  { name: 'Fri', row: 4 },
                ].map((item) => (
                  <span key={item.name} className="absolute" style={{ top: item.row * 18 }}>
                    {item.name}
                  </span>
                ))}
              </div>
              <div
                role="group"
                aria-label="Yearly focus activity"
                aria-describedby="year-keyboard-help"
                className="grid grid-flow-col grid-rows-7 gap-1"
                style={{ gridAutoColumns: 14 }}
              >
                {Array.from({ length: leading }, (_, i) => (
                  <span key={`blank-${i}`} aria-hidden="true" />
                ))}
                {days.map((day) => {
                  const key = formatPeriodKey(day, 'daily')
                  const future = key > todayKey
                  const value = totals.get(key)?.focus_minutes ?? 0
                  const intensity = Math.min(1, value / 180)
                  return (
                    <button
                      key={key}
                      ref={(node) => {
                        if (node) cells.current.set(key, node)
                        else cells.current.delete(key)
                      }}
                      type="button"
                      disabled={future}
                      tabIndex={key === selection ? 0 : -1}
                      aria-label={`${day.toLocaleDateString()}: ${future ? 'upcoming' : `${value} focus minutes`}`}
                      aria-pressed={key === selection}
                      onFocus={() => setSelectedKey(key)}
                      onClick={() => setSelectedKey(key)}
                      onKeyDown={(event) => moveFocus(key, event)}
                      className={`h-3.5 w-3.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${key === selection ? 'ring-1 ring-brand' : ''} ${future ? 'border border-depth-border bg-depth-bg' : 'bg-depth-raised'}`}
                      style={{
                        backgroundColor:
                          !future && value > 0
                            ? `rgba(75,158,255,${0.25 + intensity * 0.75})`
                            : undefined,
                      }}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-ink-primary/70">
            {selected
              ? `${selected.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${formatMinutesToHours(selectedTotal?.focus_minutes ?? 0)} · ${selectedTotal?.session_count ?? 0} sessions`
              : 'This year has not started yet.'}
          </p>
          {selected && (
            <label className="flex flex-wrap items-center gap-2 text-xs text-ink-primary/75">
              Inspect day
              <input
                type="date"
                min={`${year}-01-01`}
                max={
                  validDays.length
                    ? formatPeriodKey(validDays[validDays.length - 1], 'daily')
                    : undefined
                }
                value={selection ?? ''}
                onChange={(event) => {
                  if (validDays.some((day) => formatPeriodKey(day, 'daily') === event.target.value))
                    setSelectedKey(event.target.value)
                }}
                className="min-h-11 rounded-md border border-depth-border bg-depth-surface px-3 text-sm text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              />
            </label>
          )}
          {selected && onSelectDay && (
            <Button variant="ghost" onClick={() => onSelectDay(selected)}>
              Open Daily view →
            </Button>
          )}
          <div
            className="flex items-center gap-1.5 text-[10px] text-ink-primary/70"
            aria-label="Less to more recorded focus time"
          >
            <span>Less</span>
            {[0, 0.3, 0.5, 0.75, 1].map((value) => (
              <span
                key={value}
                className="h-3 w-3 rounded-sm bg-depth-raised"
                style={value ? { backgroundColor: `rgba(75,158,255,${value})` } : undefined}
                aria-hidden="true"
              />
            ))}
            <span>More</span>
          </div>
        </div>
      </section>
      <div className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
        <section className={`${panel} min-w-0 p-5 sm:p-6`} aria-labelledby="year-months">
          <h2 id="year-months" className="text-lg font-medium text-ink-primary">
            Focus by month
          </h2>
          <p className="mt-1 text-xs leading-5 text-ink-primary/75">
            Compare your recorded time across the year.
          </p>
          <div
            className="mt-5 h-56"
            role="img"
            aria-label={months
              .map(
                (item) =>
                  `${item.label}: ${year > new Date().getFullYear() || (year === new Date().getFullYear() && item.month > new Date().getMonth()) ? 'upcoming' : `${item.minutes} minutes`}`
              )
              .join('; ')}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={months.map((item) => ({
                  ...item,
                  minutes:
                    year > new Date().getFullYear() ||
                    (year === new Date().getFullYear() && item.month > new Date().getMonth())
                      ? null
                      : item.minutes,
                }))}
                margin={{ left: -20, right: 0, top: 8, bottom: 0 }}
              >
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#aaa7ba', fontSize: 10 }}
                  interval={0}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#aaa7ba', fontSize: 10 }}
                  allowDecimals={false}
                  tickFormatter={(value) => formatMinutesToHours(Number(value))}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: '#ffffff08' }}
                  formatter={(value) => [formatMinutesToHours(Number(value)), 'Focus time']}
                  contentStyle={{
                    backgroundColor: 'var(--color-surface-raised)',
                    borderColor: 'var(--color-border)',
                    borderRadius: 8,
                    color: 'var(--color-text)',
                  }}
                  itemStyle={{ color: 'var(--color-text)' }}
                />
                <Bar dataKey="minutes" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                  {months.map((item) => (
                    <Cell
                      key={item.month}
                      fill={
                        year === new Date().getFullYear() && item.month === new Date().getMonth()
                          ? '#4b9eff'
                          : '#345c89'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-4 text-xs leading-5 text-ink-primary/70">
            {year === new Date().getFullYear()
              ? 'The current month is in progress. Future months have no recorded totals.'
              : year > new Date().getFullYear()
                ? 'This year has not started yet.'
                : 'Monthly totals cover this calendar year.'}
          </p>
        </section>
        <section className={`${panel} min-w-0 p-5 sm:p-6`} aria-labelledby="year-projects">
          <h2 id="year-projects" className="text-lg font-medium text-ink-primary">
            Where your time went
          </h2>
          <p className="mt-1 text-xs leading-5 text-ink-primary/75">
            {projectId === undefined
              ? 'Projects ranked by focus time this year.'
              : `Focus time for ${projectLabel} this year.`}
          </p>
          <div
            className="mt-5 max-h-64 space-y-5 overflow-y-auto focus-visible:ring-2 focus-visible:ring-brand"
            role="region"
            aria-label="Yearly project focus"
            tabIndex={0}
          >
            {(expanded ? projects : projects.slice(0, 3)).map(([id, entry]) => (
              <div key={id}>
                <div className="flex items-start justify-between gap-3 text-sm">
                  <span className="min-w-0 break-words text-ink-primary">{entry.name}</span>
                  <span className="font-data shrink-0 text-xs text-ink-primary/80">
                    {formatMinutesToHours(entry.minutes)}
                  </span>
                </div>
                <div
                  className="mt-3 h-1.5 overflow-hidden rounded-full bg-depth-raised"
                  aria-hidden="true"
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${projectTotal ? (entry.minutes / projectTotal) * 100 : 0}%`,
                      backgroundColor: entry.color,
                    }}
                  />
                </div>
              </div>
            ))}
            {!projects.length && (
              <p className="py-5 text-sm text-ink-primary/70">
                No focus sessions recorded in this year.
              </p>
            )}
          </div>
          {projects.length > 3 && (
            <button
              className="mt-3 min-h-11 text-xs text-brand"
              aria-expanded={expanded}
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Show fewer projects' : `Show all ${projects.length} project groups`}
            </button>
          )}
          <p className="mt-4 text-xs leading-5 text-ink-primary/70">
            Shares use the selected year and project filter.
          </p>
        </section>
      </div>
      <section
        aria-label="Yearly highlights"
        className={`${panel} grid grid-cols-1 overflow-hidden sm:grid-cols-2 xl:grid-cols-4`}
      >
        {highlights.map((item, index) => (
          <div
            key={item.label}
            className={`min-w-0 border-depth-border p-5 sm:p-6 ${index ? 'border-t' : ''} ${index % 2 ? 'sm:border-l' : ''} ${index === 1 ? 'sm:border-t-0' : ''} xl:border-t-0 ${index ? 'xl:border-l' : ''}`}
          >
            <h2 className="text-xs text-ink-primary/75">{item.label}</h2>
            <p className="font-data mt-3 break-words text-xl text-ink-primary">{item.value}</p>
            <p className="mt-3 text-xs leading-5 text-ink-primary/70">{item.note}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
