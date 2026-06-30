import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { getPeriodLabel, navigatePeriod, isCurrentPeriod } from '@/lib/utils/analytics'

const RESET_LABELS: Record<'daily' | 'weekly' | 'monthly' | 'yearly', string> = {
  daily:   'Today',
  weekly:  'This week',
  monthly: 'This month',
  yearly:  'This year',
}

interface PeriodNavigatorProps {
  period:      'daily' | 'weekly' | 'monthly' | 'yearly'
  currentDate: Date
  onNavigate:  (date: Date) => void
}

export function PeriodNavigator({ period, currentDate, onNavigate }: PeriodNavigatorProps) {
  const onCurrent = isCurrentPeriod(currentDate, period)

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="ghost"
        style={{ width: 32, height: 32, padding: 0 }}
        onClick={() => onNavigate(navigatePeriod(currentDate, period, 'prev'))}
        aria-label="Previous period"
      >
        <ChevronLeft size={16} />
      </Button>

      <span
        className="text-ink-primary"
        style={{
          fontSize:   14,
          fontWeight: 500,
          minWidth:   160,
          textAlign:  'center',
          display:    'inline-block',
        }}
      >
        {getPeriodLabel(currentDate, period)}
      </span>

      <Button
        variant="ghost"
        style={{ width: 32, height: 32, padding: 0 }}
        onClick={() => onNavigate(navigatePeriod(currentDate, period, 'next'))}
        disabled={onCurrent}
        aria-label="Next period"
      >
        <ChevronRight size={16} />
      </Button>

      {!onCurrent && (
        <button
          onClick={() => onNavigate(new Date())}
          className="text-brand hover:underline"
          style={{ fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          {RESET_LABELS[period]}
        </button>
      )}
    </div>
  )
}
