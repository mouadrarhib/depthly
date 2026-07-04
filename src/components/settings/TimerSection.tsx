import { useState, useEffect, useRef } from 'react'

import { usePreferences, useUpdatePreferences } from '@/hooks/useSettings'
import { Stepper } from '@/components/ui/Stepper'
import { Switch } from '@/components/ui/switch'
import { Spinner } from '@/components/ui/Spinner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ── Types ─────────────────────────────────────────────────────────────────────

type LocalPrefs = {
  timer_default_mode:  'pomodoro' | 'free'
  pomodoro_focus_mins: number
  pomodoro_break_mins: number
  auto_start_break:    boolean
  auto_start_focus:    boolean
  sound_enabled:       boolean
  sound_option:        string
}

const DEFAULTS: LocalPrefs = {
  timer_default_mode:  'pomodoro',
  pomodoro_focus_mins: 25,
  pomodoro_break_mins: 5,
  auto_start_break:    false,
  auto_start_focus:    false,
  sound_enabled:       true,
  sound_option:        'bell',
}

// ── Sub-components ────────────────────────────────────────────────────────────

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

function StepperRow({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label:    string
  value:    number
  min:      number
  max:      number
  step:     number
  suffix:   string
  onChange: (next: number) => void
}) {
  // Stepper always passes value ± 1; we recover direction and apply the real step
  function handleChange(val: number) {
    const direction = val > value ? 1 : -1
    onChange(Math.max(min, Math.min(max, value + direction * step)))
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <Stepper value={value} min={min} max={max} onChange={handleChange} />
        <span style={{ fontSize: 13, color: 'var(--color-text-muted)', minWidth: 52 }}>{suffix}</span>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function TimerSection() {
  const { data: prefs, isLoading } = usePreferences()
  const updatePreferences = useUpdatePreferences()

  const [local, setLocal] = useState<LocalPrefs>(DEFAULTS)
  const [saved, setSaved]  = useState(false)

  // Ref always holds the latest local state — avoids stale-closure in the debounce
  const localRef      = useRef<LocalPrefs>(DEFAULTS)
  const hasSynced     = useRef(false)
  const debounceRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup on unmount
  useEffect(() => () => {
    if (debounceRef.current)   clearTimeout(debounceRef.current)
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
  }, [])

  // Sync from server on first load only
  useEffect(() => {
    if (!prefs || hasSynced.current) return
    const initial: LocalPrefs = {
      timer_default_mode:  prefs.timer_default_mode,
      pomodoro_focus_mins: prefs.pomodoro_focus_mins,
      pomodoro_break_mins: prefs.pomodoro_break_mins,
      auto_start_break:    prefs.auto_start_break,
      auto_start_focus:    prefs.auto_start_focus,
      sound_enabled:       prefs.sound_enabled,
      sound_option:        prefs.sound_option,
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
      updatePreferences.mutate(localRef.current, {
        onSuccess: () => {
          setSaved(true)
          if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
          savedTimerRef.current = setTimeout(() => setSaved(false), 2000)
        },
      })
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
      {/* Section title */}
      <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-text)', marginBottom: 12 }}>
        Timer
      </p>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--color-border)', marginBottom: 20 }} />

      {/* Card */}
      <div style={{
        background:    'var(--color-surface-raised)',
        border:        '1px solid var(--color-border)',
        borderRadius:  12,
        padding:       24,
        display:       'flex',
        flexDirection: 'column',
        gap:           24,
      }}>

        {/* 1. Default timer mode */}
        <SettingRow label="Default timer mode">
          <Select
            value={local.timer_default_mode}
            onValueChange={val => update({ timer_default_mode: val as 'pomodoro' | 'free' })}
          >
            <SelectTrigger style={{ width: 200 }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pomodoro">Pomodoro</SelectItem>
              <SelectItem value="free">Free (stopwatch)</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>

        {/* 2. Focus duration */}
        <StepperRow
          label="Focus duration"
          value={local.pomodoro_focus_mins}
          min={5}
          max={180}
          step={5}
          suffix="minutes"
          onChange={val => update({ pomodoro_focus_mins: val })}
        />

        {/* 3. Break duration */}
        <StepperRow
          label="Break duration"
          value={local.pomodoro_break_mins}
          min={1}
          max={60}
          step={1}
          suffix="minutes"
          onChange={val => update({ pomodoro_break_mins: val })}
        />

        {/* 4. Auto-start break */}
        <SettingRow
          label="Auto-start break"
          description="Automatically start break when focus session ends"
        >
          <Switch
            checked={local.auto_start_break}
            onCheckedChange={checked => update({ auto_start_break: checked })}
          />
        </SettingRow>

        {/* 5. Auto-start focus */}
        <SettingRow
          label="Auto-start focus"
          description="Automatically start next focus session after break"
        >
          <Switch
            checked={local.auto_start_focus}
            onCheckedChange={checked => update({ auto_start_focus: checked })}
          />
        </SettingRow>

        {/* 6. Sound enabled */}
        <SettingRow
          label="Session end sound"
          description="Play a sound when a session completes"
        >
          <Switch
            checked={local.sound_enabled}
            onCheckedChange={checked => update({ sound_enabled: checked })}
          />
        </SettingRow>

        {/* 7. Sound option — only when sound is on */}
        {local.sound_enabled && (
          <SettingRow label="Sound">
            <Select
              value={local.sound_option}
              onValueChange={val => update({ sound_option: val })}
            >
              <SelectTrigger style={{ width: 200 }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bell">Bell</SelectItem>
                <SelectItem value="chime">Chime</SelectItem>
                <SelectItem value="ding">Ding</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
        )}

        {/* Auto-save confirmation */}
        {saved && (
          <span style={{ fontSize: 12, color: 'var(--color-success)' }}>Saved</span>
        )}
      </div>
    </div>
  )
}
