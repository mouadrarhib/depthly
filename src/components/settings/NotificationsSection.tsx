// Actual push notifications not yet
// implemented — toggles persist to DB
// but no notification service is wired up yet.
// This is a Phase 12 / post-launch feature.

import { useState, useEffect, useRef } from 'react'

import { usePreferences, useUpdatePreferences } from '@/hooks/useSettings'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'

type LocalPrefs = {
  daily_reminder_enabled:  boolean
  daily_reminder_time:     string
  streak_reminder_enabled: boolean
}

const DEFAULTS: LocalPrefs = {
  daily_reminder_enabled:  false,
  daily_reminder_time:     '09:00',
  streak_reminder_enabled: false,
}

function SettingRow({
  label,
  description,
  children,
}: {
  label:        string
  description?: string
  children:     React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
      <div>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)', marginBottom: description ? 4 : 0 }}>
          {label}
        </p>
        {description && (
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', maxWidth: 320 }}>
            {description}
          </p>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>
        {children}
      </div>
    </div>
  )
}

export function NotificationsSection() {
  const { data: prefs, isLoading } = usePreferences()
  const updatePreferences = useUpdatePreferences()

  const [local, setLocal] = useState<LocalPrefs>(DEFAULTS)
  const [saved, setSaved]  = useState(false)

  const localRef      = useRef<LocalPrefs>(DEFAULTS)
  const hasSynced     = useRef(false)
  const debounceRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (debounceRef.current)   clearTimeout(debounceRef.current)
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
  }, [])

  useEffect(() => {
    if (!prefs || hasSynced.current) return
    const initial: LocalPrefs = {
      daily_reminder_enabled:  prefs.daily_reminder_enabled,
      daily_reminder_time:     prefs.daily_reminder_time ?? '09:00',
      streak_reminder_enabled: prefs.streak_reminder_enabled,
    }
    localRef.current = initial
    setLocal(initial)
    hasSynced.current = true
  }, [prefs])

  function update(changes: Partial<LocalPrefs>) {
    const next = { ...localRef.current, ...changes }
    localRef.current = next
    setLocal(next)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updatePreferences.mutate(
        {
          ...localRef.current,
          daily_reminder_time: localRef.current.daily_reminder_time || null,
        },
        {
          onSuccess: () => {
            setSaved(true)
            if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
            savedTimerRef.current = setTimeout(() => setSaved(false), 2000)
          },
        },
      )
      debounceRef.current = null
    }, 800)
  }

  if (isLoading) {
    return (
      <div style={{
        background:     'var(--color-surface-raised)',
        border:         '1px solid var(--color-border)',
        borderRadius:   12,
        padding:        24,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        minHeight:      120,
      }}>
        <Spinner />
      </div>
    )
  }

  return (
    <div>
      <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-text)', marginBottom: 12 }}>
        Notifications
      </p>
      <div style={{ borderTop: '1px solid var(--color-border)', marginBottom: 20 }} />

      <div style={{
        background:    'var(--color-surface-raised)',
        border:        '1px solid var(--color-border)',
        borderRadius:  12,
        padding:       24,
        display:       'flex',
        flexDirection: 'column',
        gap:           24,
      }}>

        {/* 1. Daily reminder toggle */}
        <SettingRow
          label="Daily focus reminder"
          description="Get a reminder to start your focus session"
        >
          <Switch
            checked={local.daily_reminder_enabled}
            onCheckedChange={checked => update({ daily_reminder_enabled: checked })}
          />
        </SettingRow>

        {/* 2. Reminder time — visible only when enabled */}
        {local.daily_reminder_enabled && (
          <Input
            label="Reminder time"
            type="time"
            value={local.daily_reminder_time}
            onChange={e => update({ daily_reminder_time: e.target.value })}
          />
        )}

        {/* 3. Streak reminder toggle */}
        <SettingRow
          label="Streak reminder"
          description="Get notified when your streak is at risk"
        >
          <Switch
            checked={local.streak_reminder_enabled}
            onCheckedChange={checked => update({ streak_reminder_enabled: checked })}
          />
        </SettingRow>

        {saved && (
          <span style={{ fontSize: 12, color: 'var(--color-success)' }}>Saved</span>
        )}
      </div>
    </div>
  )
}
