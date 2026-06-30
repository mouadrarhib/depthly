import { useState, useEffect } from 'react'

import { useGoals, useUpdateGoals } from '@/hooks/useGoals'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/Spinner'

const DAILY_PRESETS  = [{ label: '1h', minutes: 60 }, { label: '2h', minutes: 120 }, { label: '4h', minutes: 240 }, { label: '6h', minutes: 360 }]
const WEEKLY_PRESETS = [{ label: '5h', minutes: 300 }, { label: '10h', minutes: 600 }, { label: '20h', minutes: 1200 }, { label: '30h', minutes: 1800 }]

function GoalRow({
  label,
  value,
  onChange,
  presets,
}: {
  label:    string
  value:    string
  onChange: (val: string) => void
  presets:  { label: string; minutes: number }[]
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{label}</span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="number"
          min={1}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="e.g. 120"
          style={{
            width:           96,
            height:          36,
            padding:         '0 10px',
            fontSize:        13,
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
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {presets.map(p => (
          <button
            key={p.label}
            onClick={() => onChange(String(p.minutes))}
            style={{
              padding:      '4px 12px',
              fontSize:     12,
              fontWeight:   500,
              borderRadius: 999,
              cursor:       'pointer',
              transition:   'all 0.15s',
              ...(value === String(p.minutes)
                ? { background: 'var(--color-surface-overlay)', color: 'var(--color-brand)', border: '1px solid rgba(75,158,255,0.4)' }
                : { background: 'transparent', color: 'var(--color-text-faint)', border: '1px solid var(--color-border)' }),
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function GoalSettings() {
  const { data: goals, isLoading } = useGoals()
  const updateGoals = useUpdateGoals()

  const [daily,   setDaily]   = useState('')
  const [weekly,  setWeekly]  = useState('')
  const [saved,   setSaved]   = useState(false)

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
          setSaved(true)
          setTimeout(() => setSaved(false), 2000)
        },
      }
    )
  }

  if (isLoading) {
    return (
      <div
        style={{
          background:   'var(--color-surface)',
          border:       '1px solid var(--color-border)',
          borderRadius: 14,
          padding:      24,
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          minHeight:    120,
        }}
      >
        <Spinner />
      </div>
    )
  }

  return (
    <div
      style={{
        background:   'var(--color-surface)',
        border:       '1px solid var(--color-border)',
        borderRadius: 14,
        padding:      24,
      }}
    >
      {/* Header */}
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>
        Focus Goals
      </span>

      <div
        style={{
          borderTop: '1px solid var(--color-border)',
          margin:    '16px 0',
        }}
      />

      {/* Goal rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <GoalRow
          label="Daily goal"
          value={daily}
          onChange={setDaily}
          presets={DAILY_PRESETS}
        />
        <GoalRow
          label="Weekly goal"
          value={weekly}
          onChange={setWeekly}
          presets={WEEKLY_PRESETS}
        />
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 24 }}>
        <Button
          variant="primary"
          size="sm"
          isLoading={updateGoals.isPending}
          onClick={handleSave}
        >
          Save
        </Button>

        {saved ? (
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Saved</span>
        ) : null}
      </div>
    </div>
  )
}
