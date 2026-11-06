import { useEffect, useRef, useState } from 'react'

import { BarChart2 } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import {
  ALL_PROJECTS_VALUE,
  AnalyticsProjectSelect,
  UNASSIGNED_PROJECT_VALUE,
} from '@/components/analytics/AnalyticsProjectSelect'
import { DailyView } from '@/components/analytics/DailyView'
import { MonthlyView } from '@/components/analytics/MonthlyView'
import { OverviewView } from '@/components/analytics/OverviewView'
import { PeriodNavigator } from '@/components/analytics/PeriodNavigator'
import { ShareProgressButton } from '@/components/analytics/ShareProgressButton'
import { WeeklyView } from '@/components/analytics/WeeklyView'
import { YearlyView } from '@/components/analytics/YearlyView'
import { Button } from '@/components/ui/button'
import { AnalyticsTabs } from '@/components/analytics/AnalyticsTabs'
import { useProfile } from '@/hooks/useAnalytics'
import { useArchivedProjects, useProjects } from '@/hooks/useProjects'
import { PATHS } from '@/routes/paths'
import type { AnalyticsProjectScope } from '@/types/app'

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly'
type TabValue = 'overview' | Period

export function AnalyticsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: profile } = useProfile()
  const { data: activeProjects = [], isLoading: loadingActiveProjects } = useProjects()
  const { data: archivedProjects = [], isLoading: loadingArchivedProjects } = useArchivedProjects()
  const analyticsCaptureRef = useRef<HTMLDivElement>(null)

  const [activeTab, setActiveTab] = useState<TabValue>('overview')
  const [dailyDate, setDailyDate] = useState(() => new Date())
  const [weeklyDate, setWeeklyDate] = useState(() => new Date())
  const [monthlyDate, setMonthlyDate] = useState(() => new Date())
  const [yearlyDate, setYearlyDate] = useState(() => new Date())

  const projectParam = searchParams.get('project')
  const allProjects = [...activeProjects, ...archivedProjects]
  const selectedProject = allProjects.find((project) => project.id === projectParam)
  const projectsLoading = loadingActiveProjects || loadingArchivedProjects
  const projectValue = projectParam ?? ALL_PROJECTS_VALUE
  const projectScope: AnalyticsProjectScope =
    projectParam === null
      ? {
          projectId: undefined,
          projectLabel: 'All projects',
          projectColor: 'var(--color-brand)',
        }
      : projectParam === UNASSIGNED_PROJECT_VALUE
        ? {
            projectId: null,
            projectLabel: 'No project',
            projectColor: 'var(--color-text-secondary)',
          }
        : {
            projectId: projectParam,
            projectLabel: selectedProject?.name ?? 'Selected project',
            projectColor: selectedProject?.color ?? 'var(--color-brand)',
          }

  useEffect(() => {
    const hasInvalidProject =
      !projectsLoading &&
      projectParam !== null &&
      projectParam !== UNASSIGNED_PROJECT_VALUE &&
      !selectedProject

    if (!hasInvalidProject) return

    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('project')
    setSearchParams(nextParams, { replace: true })
  }, [projectParam, projectsLoading, searchParams, selectedProject, setSearchParams])

  function handleProjectChange(value: string) {
    const nextParams = new URLSearchParams(searchParams)
    if (value === ALL_PROJECTS_VALUE) nextParams.delete('project')
    else nextParams.set('project', value)
    setSearchParams(nextParams, { replace: true })
  }

  const currentDate =
    activeTab === 'overview'
      ? null
      : {
          daily: dailyDate,
          weekly: weeklyDate,
          monthly: monthlyDate,
          yearly: yearlyDate,
        }[activeTab]

  function handleNavigate(d: Date) {
    if (activeTab === 'daily') setDailyDate(d)
    if (activeTab === 'weekly') setWeeklyDate(d)
    if (activeTab === 'monthly') setMonthlyDate(d)
    if (activeTab === 'yearly') setYearlyDate(d)
  }

  const isNewUser = profile?.total_sessions === 0

  return (
    <div className="px-4 py-5 sm:px-8 sm:py-6">
      <div
        style={{
          maxWidth: 1440,
          margin: '0 auto',
        }}
      >
        {isNewUser ? (
          /* ── Full-page empty state for brand new users ── */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              padding: '96px 0',
            }}
          >
            <BarChart2 size={48} style={{ color: '#3D3B4E' }} />
            <p style={{ fontSize: 20, fontWeight: 500, color: '#E8E6F0', marginTop: 16 }}>
              No data yet
            </p>
            <p style={{ fontSize: 13, color: '#7A7890', marginTop: 8 }}>
              Complete your first focus session to start seeing your analytics
            </p>
            <Button variant="primary" onClick={() => navigate(PATHS.timer)} className="mt-5">
              Start the Timer
            </Button>
          </div>
        ) : (
          <>
            <header className="mb-6">
              <h1 className="text-2xl font-medium tracking-tight text-ink-primary sm:text-[28px]">
                {activeTab === 'yearly'
                  ? 'See the bigger picture of your focus.'
                  : activeTab === 'monthly'
                    ? 'See your focus across the month.'
                    : activeTab === 'weekly'
                      ? 'See how your week adds up.'
                      : activeTab === 'daily'
                        ? 'Your focus, one day at a time.'
                        : 'See where your focus time goes.'}
              </h1>
              <p className="mt-2 text-sm leading-6 text-ink-primary/75">
                {activeTab === 'yearly'
                  ? 'Explore your focus patterns across the year, one day and month at a time.'
                  : activeTab === 'monthly'
                    ? 'Explore your daily focus time and see the work behind each day.'
                    : activeTab === 'weekly'
                      ? 'Review your daily focus time and progress toward your weekly goal.'
                      : activeTab === 'daily'
                        ? 'Review your sessions and see how they add up to your daily goal.'
                        : 'Review your focus sessions and see how your time adds up across projects.'}
              </p>
            </header>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              {/* Tab selector */}
              <div className="w-full min-w-0 sm:w-auto">
                <AnalyticsTabs value={activeTab} onChange={setActiveTab} />
              </div>

              {/* Period navigator — not shown for Overview, which is lifetime
                data with no date to page through */}
              <div
                className="flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:flex-wrap sm:items-center"
                style={{ marginTop: 8, marginBottom: 6 }}
              >
                {activeTab !== 'overview' && currentDate ? (
                  <PeriodNavigator
                    period={activeTab}
                    currentDate={currentDate}
                    onNavigate={handleNavigate}
                  />
                ) : null}
                <AnalyticsProjectSelect
                  value={projectValue}
                  label={projectScope.projectLabel}
                  color={projectScope.projectColor}
                  activeProjects={activeProjects}
                  archivedProjects={archivedProjects}
                  isLoading={projectsLoading}
                  onValueChange={handleProjectChange}
                />
                {activeTab !== 'overview' && currentDate ? (
                  <ShareProgressButton
                    period={activeTab}
                    date={currentDate}
                    targetRef={analyticsCaptureRef}
                    projectLabel={
                      projectScope.projectId !== undefined ? projectScope.projectLabel : undefined
                    }
                  />
                ) : null}
              </div>
            </div>
            {/* Tab content */}
            <div ref={analyticsCaptureRef}>
              {projectScope.projectId !== undefined && activeTab !== 'overview' ? (
                <div className="mb-3 flex items-center justify-center gap-2 text-[12px] text-ink-secondary">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: projectScope.projectColor }}
                  />
                  Showing analytics for{' '}
                  <span className="font-medium text-ink-primary">{projectScope.projectLabel}</span>
                </div>
              ) : null}
              {activeTab === 'overview' && <OverviewView {...projectScope} />}
              {activeTab === 'daily' && <DailyView date={dailyDate} {...projectScope} />}
              {activeTab === 'weekly' && (
                <WeeklyView
                  date={weeklyDate}
                  {...projectScope}
                  onSelectDay={(day) => {
                    setDailyDate(day)
                    setActiveTab('daily')
                  }}
                />
              )}
              {activeTab === 'monthly' && (
                <MonthlyView
                  date={monthlyDate}
                  {...projectScope}
                  onSelectDay={(day) => {
                    setDailyDate(day)
                    setActiveTab('daily')
                  }}
                />
              )}
              {activeTab === 'yearly' && (
                <YearlyView
                  date={yearlyDate}
                  {...projectScope}
                  onSelectDay={(day) => {
                    setDailyDate(day)
                    setActiveTab('daily')
                  }}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
