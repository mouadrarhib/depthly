import { formatPeriodKey, getWeekGoalHistory } from '@/lib/utils/analytics'

interface DaySummary {
  date:           string
  focus_minutes:  number
  daily_goal_met: boolean
}

interface GoalHistoryRowProps {
  weekDays:  Date[]
  summaries: DaySummary[]
}

export function GoalHistoryRow({ weekDays, summaries }: GoalHistoryRowProps) {
  const todayKey = formatPeriodKey(new Date(), 'daily')
  const history  = getWeekGoalHistory(summaries, weekDays)

  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
      {history.map(({ date, dayLabel, met }) => {
        const key     = formatPeriodKey(date, 'daily')
        const isToday = key === todayKey

        const bg        = met === true  ? '#3DD68C'   : met === false ? '#222228'   : 'transparent'
        const textColor = met === true  ? '#ffffff'   : '#3D3B4E'
        const border    = met === true  ? 'none'
                        : met === false ? '1px solid #2E2E38'
                        :                '1px dashed #2E2E38'

        return (
          <div
            key={key}
            style={{
              width:           28,
              height:          28,
              borderRadius:    '50%',
              backgroundColor: bg,
              border,
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              fontSize:        11,
              fontWeight:      600,
              color:           textColor,
              flexShrink:      0,
              ...(isToday ? {
                boxShadow: '0 0 0 1px #0D0D10, 0 0 0 3px rgba(75,158,255,0.4)',
              } : {}),
            }}
          >
            {dayLabel}
          </div>
        )
      })}
    </div>
  )
}
