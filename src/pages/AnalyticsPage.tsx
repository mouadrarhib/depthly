import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart2 } from 'lucide-react'

import { OverviewView } from '@/components/analytics/OverviewView'
import { PeriodNavigator } from '@/components/analytics/PeriodNavigator'
import { DailyView }       from '@/components/analytics/DailyView'
import { WeeklyView }      from '@/components/analytics/WeeklyView'
import { MonthlyView }     from '@/components/analytics/MonthlyView'
import { YearlyView }      from '@/components/analytics/YearlyView'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { useProfile } from '@/hooks/useAnalytics'
import { PATHS } from '@/routes/paths'

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly'
type TabValue = 'overview' | Period

const TABS: { value: TabValue; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'daily',    label: 'Daily'   },
  { value: 'weekly',   label: 'Weekly'  },
  { value: 'monthly',  label: 'Monthly' },
  { value: 'yearly',   label: 'Yearly'  },
]

export function AnalyticsPage() {
  const navigate = useNavigate()
  const { data: profile } = useProfile()

  const [activeTab,   setActiveTab]   = useState<TabValue>('overview')
  const [dailyDate,   setDailyDate]   = useState(() => new Date())
  const [weeklyDate,  setWeeklyDate]  = useState(() => new Date())
  const [monthlyDate, setMonthlyDate] = useState(() => new Date())
  const [yearlyDate,  setYearlyDate]  = useState(() => new Date())

  const currentDate = activeTab === 'overview' ? null : {
    daily:   dailyDate,
    weekly:  weeklyDate,
    monthly: monthlyDate,
    yearly:  yearlyDate,
  }[activeTab]

  function handleNavigate(d: Date) {
    if (activeTab === 'daily')   setDailyDate(d)
    if (activeTab === 'weekly')  setWeeklyDate(d)
    if (activeTab === 'monthly') setMonthlyDate(d)
    if (activeTab === 'yearly')  setYearlyDate(d)
  }

  const isNewUser = profile?.total_sessions === 0

  return (
    <div className="px-4 py-4 sm:px-8 sm:py-6">
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {isNewUser ? (
          /* ── Full-page empty state for brand new users ── */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '96px 0' }}>
            <BarChart2 size={48} style={{ color: '#3D3B4E' }} />
            <p style={{ fontSize: 20, fontWeight: 500, color: '#E8E6F0', marginTop: 16 }}>
              No data yet
            </p>
            <p style={{ fontSize: 13, color: '#7A7890', marginTop: 8 }}>
              Complete your first focus session to start seeing your analytics
            </p>
            <Button
              variant="primary"
              onClick={() => navigate(PATHS.timer)}
              className="mt-5"
            >
              Start the Timer
            </Button>
          </div>
        ) : (
          <>
            {/* Tab selector */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Tabs value={activeTab} onValueChange={v => setActiveTab(v as TabValue)}>
                <TabsList
                  className="rounded-full p-1 gap-0.5 h-auto"
                  style={{ background: 'var(--color-surface-overlay)' }}
                >
                  {TABS.map(({ value, label }) => (
                    <TabsTrigger
                      key={value}
                      value={value}
                      className={[
                        'rounded-full text-[13px] font-medium transition-all shadow-none',
                        'data-[state=inactive]:bg-transparent data-[state=inactive]:text-[var(--color-text-faint)]',
                        'data-[state=active]:bg-[var(--color-surface-raised)] data-[state=active]:text-[var(--color-brand)]',
                        'data-[state=active]:border data-[state=active]:border-[rgba(75,158,255,0.3)]',
                        'data-[state=active]:shadow-none',
                      ].join(' ')}
                      style={{ padding: '6px 14px' }}
                    >
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            {/* Period navigator — not shown for Overview, which is lifetime
                data with no date to page through */}
            {activeTab !== 'overview' && currentDate && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8, marginBottom: 20 }}>
                <PeriodNavigator
                  period={activeTab}
                  currentDate={currentDate}
                  onNavigate={handleNavigate}
                />
              </div>
            )}

            {/* Tab content */}
            <div style={activeTab === 'overview' ? { marginTop: 20 } : undefined}>
              {activeTab === 'overview' && <OverviewView />}
              {activeTab === 'daily'    && <DailyView   date={dailyDate}   />}
              {activeTab === 'weekly'   && <WeeklyView  date={weeklyDate}  />}
              {activeTab === 'monthly'  && <MonthlyView date={monthlyDate} />}
              {activeTab === 'yearly'   && <YearlyView  date={yearlyDate}  />}
            </div>
          </>
        )}

      </div>
    </div>
  )
}
