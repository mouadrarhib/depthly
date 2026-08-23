import { useRef } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { getPeriodLabel, navigatePeriod, isCurrentPeriod } from '@/lib/utils/analytics'

const RESET_LABELS: Record<'daily' | 'weekly' | 'monthly' | 'yearly', string> = {
  daily: 'Today',
  weekly: 'This week',
  monthly: 'This month',
  yearly: 'This year',
}

interface PeriodNavigatorProps {
  period: 'daily' | 'weekly' | 'monthly' | 'yearly'
  currentDate: Date
  onNavigate: (date: Date) => void
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function PeriodNavigator({ period, currentDate, onNavigate }: PeriodNavigatorProps) {
  const dateInputRef = useRef<HTMLInputElement>(null)
  const onCurrent = isCurrentPeriod(currentDate, period)

  function openDatePicker() {
    const input = dateInputRef.current
    if (!input) return

    try {
      input.showPicker()
    } catch {
      input.click()
    }
  }

  function handleDateChange(value: string) {
    const [year, month, day] = value.split('-').map(Number)
    if (!year || !month || !day) return
    onNavigate(new Date(year, month - 1, day))
  }

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

      <button
        type="button"
        onClick={openDatePicker}
        className="group inline-flex h-8 min-w-[160px] items-center justify-center gap-2 rounded-lg border border-transparent px-2 text-[14px] font-medium text-ink-primary transition-colors hover:border-depth-border hover:bg-depth-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        aria-label={`Choose a date for ${period} analytics`}
        title="Choose a date"
      >
        <CalendarDays
          size={15}
          className="shrink-0 text-ink-secondary transition-colors group-hover:text-brand"
        />
        {getPeriodLabel(currentDate, period)}
      </button>

      <input
        ref={dateInputRef}
        type="date"
        value={toDateInputValue(currentDate)}
        max={toDateInputValue(new Date())}
        onInput={(event) => handleDateChange(event.currentTarget.value)}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />

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
          style={{
            fontSize: 12,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {RESET_LABELS[period]}
        </button>
      )}
    </div>
  )
}
