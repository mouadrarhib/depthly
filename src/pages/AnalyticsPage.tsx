import { useState } from 'react'

import { AllTimeStatsBar } from '@/components/analytics/AllTimeStatsBar'
import { PeriodNavigator } from '@/components/analytics/PeriodNavigator'
import { DailyView }       from '@/components/analytics/DailyView'
import { WeeklyView }      from '@/components/analytics/WeeklyView'
import { MonthlyView }     from '@/components/analytics/MonthlyView'
import { YearlyView }      from '@/components/analytics/YearlyView'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly'

const TABS: { value: Period; label: string }[] = [
  { value: 'daily',   label: 'Daily'   },
  { value: 'weekly',  label: 'Weekly'  },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly',  label: 'Yearly'  },
]

export function AnalyticsPage() {
  const [activeTab,   setActiveTab]   = useState<Period>('daily')
  const [dailyDate,   setDailyDate]   = useState(() => new Date())
  const [weeklyDate,  setWeeklyDate]  = useState(() => new Date())
  const [monthlyDate, setMonthlyDate] = useState(() => new Date())
  const [yearlyDate,  setYearlyDate]  = useState(() => new Date())

  const currentDate = {
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

  return (
    <div style={{ padding: '24px 32px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <h1 className="text-ink-primary" style={{ fontSize: 22, fontWeight: 500, marginBottom: 20 }}>
          Analytics
        </h1>

        {/* All-time stats */}
        <AllTimeStatsBar />

        {/* Tab selector */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
          <Tabs value={activeTab} onValueChange={v => setActiveTab(v as Period)}>
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
                  style={{ padding: '8px 20px' }}
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Period navigator */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16, marginBottom: 24 }}>
          <PeriodNavigator
            period={activeTab}
            currentDate={currentDate}
            onNavigate={handleNavigate}
          />
        </div>

        {/* Tab content */}
        {activeTab === 'daily'   && <DailyView   date={dailyDate}   />}
        {activeTab === 'weekly'  && <WeeklyView  date={weeklyDate}  />}
        {activeTab === 'monthly' && <MonthlyView date={monthlyDate} />}
        {activeTab === 'yearly'  && <YearlyView  date={yearlyDate}  />}

      </div>
    </div>
  )
}
