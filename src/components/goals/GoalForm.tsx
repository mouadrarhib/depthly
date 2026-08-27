import { useState, useEffect } from 'react'

import { Check, Clock, Calendar } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/Spinner'
import { useGoals, useUpdateGoals } from '@/hooks/useGoals'
import { formatMinutesToHours } from '@/lib/utils/analytics'

const DAILY_PRESETS  = [{ label: '1h', minutes: 60 }, { label: '2h', minutes: 120 }, { label: '4h', minutes: 240 }, { label: '6h', minutes: 360 }]
const WEEKLY_PRESETS = [{ label: '5h', minutes: 300 }, { label: '10h', minutes: 600 }, { label: '20h', minutes: 1200 }, { label: '30h', minutes: 1800 }]

function GoalRow({
  icon,
  accent,
  label,
  value,
  onChange,
  presets,
}: {
  icon:     React.ReactNode
  accent:   string
  label:    string
  value:    string
  onChange: (val: string) => void
  presets:  { label: string; minutes: number }[]
}) {
  const minutes = Number(value)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        {icon}
        <span
          style={{
            fontSize:      11,
            fontWeight:    600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color:         'var(--color-text-faint)',
          }}
        >
          {label}
        </span>
      </div>

      <div style={{ borderLeft: `2px solid ${accent}`, paddingLeft: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="number"
            min={1}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="e.g. 120"
            style={{
              width:           110,
              height:          38,
              padding:         '0 12px',
              fontSize:        14,
              fontWeight:      500,
              background:      'var(--color-surface-overlay)',
              border:          '1px solid var(--color-border)',
              borderRadius:    8,
              color:           'var(--color-text)',
              outline:         'none',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-brand)' }}
            onBlur={e  => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
          />
          <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>minutes</span>

          {value && minutes > 0 && (
            <span
              className="font-data"
              style={{ fontSize: 12, fontWeight: 600, color: accent, marginLeft: 'auto' }}
            >
              → {formatMinutesToHours(minutes)}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {presets.map(p => (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange(String(p.minutes))}
              className="transition-all"
              style={{
                padding:      '4px 12px',
                fontSize:     12,
                fontWeight:   500,
                borderRadius: 999,
                cursor:       'pointer',
                ...(value === String(p.minutes)
                  ? { background: 'var(--color-surface-overlay)', color: accent, border: `1px solid ${accent}66` }
                  : { background: 'transparent', color: 'var(--color-text-faint)', border: '1px solid var(--color-border)' }),
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

interface GoalFormProps {
  /** Called after a successful save. Settings page leaves this unset (form
   *  stays open with a "Saved" indicator); the quick-set dialog passes its
   *  own close handler so it dismisses immediately, matching how the other
   *  modals (ProjectModal, TaskModal) close on successful save. */
  onSaved?: () => void
}

export function GoalForm({ onSaved }: GoalFormProps) {
  const { data: goals, isLoading } = useGoals()
  const updateGoals = useUpdateGoals()

  const [daily,  setDaily]  = useState('')
  const [weekly, setWeekly] = useState('')
  const [saved,  setSaved]  = useState(false)

  useEffect(() => {
    if (!goals) return
    setDaily(goals.daily_goal_minutes  != null ? String(goals.daily_goal_minutes)  : '')
    setWeekly(goals.weekly_goal_minutes != null ? String(goals.weekly_goal_minutes) : '')
  }, [goals])

  function handleSave() {
    updateGoals.mutate(
      {
        daily_goal_minutes:  daily  ? Number(daily)  : null,
        weekly_goal_minutes: weekly ? Number(weekly) : null,
      },
      {
        onSuccess: () => {
          if (onSaved) {
            onSaved()
            return
          }
          setSaved(true)
          setTimeout(() => setSaved(false), 2000)
        },
      }
    )
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
        <Spinner />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <GoalRow
        icon={<Clock size={13} style={{ color: 'var(--color-brand)' }} />}
        accent="var(--color-brand)"
        label="Daily goal"
        value={daily}
        onChange={setDaily}
        presets={DAILY_PRESETS}
      />

      <div style={{ height: 1, background: 'var(--color-border)' }} />

      <GoalRow
        icon={<Calendar size={13} style={{ color: '#3DD68C' }} />}
        accent="#3DD68C"
        label="Weekly goal"
        value={weekly}
        onChange={setWeekly}
        presets={WEEKLY_PRESETS}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button
          variant="primary"
          size="sm"
          isLoading={updateGoals.isPending}
          onClick={handleSave}
        >
          Save
        </Button>

        {saved && (
          <span style={{ fontSize: 12, color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Check size={12} /> Saved
          </span>
        )}
      </div>
    </div>
  )
}
