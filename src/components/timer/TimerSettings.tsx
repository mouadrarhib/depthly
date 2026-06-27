import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

import { useTimerStore } from '@/store/timerStore'
import { useUiStore } from '@/store'
import { Switch } from '@/components/ui/switch'
import { Sheet, SheetPortal } from '@/components/ui/sheet'
import { Stepper } from '@/components/ui/Stepper'
import { TimerProjectSelector } from './TimerProjectSelector'
import { cn } from '@/lib/utils'

type TimerMode      = 'pomodoro' | 'custom' | 'free'
type PomodoroPreset = '25/5' | '50/10' | '90/20' | 'custom'

const PRESET_OPTIONS: PomodoroPreset[] = ['25/5', '50/10', '90/20', 'custom']

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize:      11,
        fontWeight:    500,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color:         'var(--color-text-faint)',
        marginBottom:  10,
      }}
    >
      {children}
    </p>
  )
}

interface ToggleRowProps {
  id:       string
  checked:  boolean
  onChange: (val: boolean) => void
  label:    string
}

function ToggleRow({ id, checked, onChange, label }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between" style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
      <label htmlFor={id} className="cursor-pointer">{label}</label>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        className="h-[22px] w-[40px] data-[state=checked]:bg-[var(--color-brand)] data-[state=unchecked]:bg-[var(--color-surface-overlay)]"
      />
    </div>
  )
}

function TypePills({
  value,
  onChange,
}: {
  value:    'timer' | 'free'
  onChange: (v: 'timer' | 'free') => void
}) {
  const pills: { v: 'timer' | 'free'; label: string }[] = [
    { v: 'timer', label: 'Timer' },
    { v: 'free',  label: 'Free'  },
  ]
  return (
    <div
      className="inline-flex"
      style={{ background: 'var(--color-surface-overlay)', borderRadius: 999, padding: 3, gap: 3 }}
    >
      {pills.map(({ v, label }) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className="transition-all"
          style={{
            padding:    '5px 14px',
            fontSize:   13,
            fontWeight: 500,
            borderRadius: 999,
            ...(value === v
              ? { background: 'var(--color-surface-raised)', color: 'var(--color-text)', border: '1px solid rgba(75,158,255,0.3)' }
              : { background: 'transparent', color: 'var(--color-text-faint)', border: '1px solid transparent' }),
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

// ── Panel content (no overlay, positioned below topbar) ────────────────────

const SettingsPanelContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <SheetPortal>
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed right-0 bottom-0 z-30 w-[300px] outline-none',
        'flex flex-col overflow-y-auto',
        'transition ease-in-out',
        'data-[state=open]:duration-300 data-[state=closed]:duration-300',
        'data-[state=open]:animate-in data-[state=open]:slide-in-from-right',
        'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right',
        className,
      )}
      style={{ top: 56 }}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </SheetPortal>
))
SettingsPanelContent.displayName = 'SettingsPanelContent'

// ── Main settings component ────────────────────────────────────────────────

export function TimerSettings() {
  const isOpen     = useUiStore((s) => s.isSettingsOpen)
  const closePanel = useUiStore((s) => s.toggleSettings)

  const {
    mode,
    pomodoroPreset,
    focusDuration,
    breakDuration,
    autoStartBreak,
    autoStartFocus,
    setMode,
    setPreset,
    setAutoStartBreak,
    setAutoStartFocus,
  } = useTimerStore()

  const focusMins = Math.floor(focusDuration / 60)
  const breakMins = Math.floor(breakDuration / 60)

  const handleFocusChange = (val: number) => {
    useTimerStore.setState((s) => ({
      focusDuration: val * 60,
      ...(!s.isRunning && s.sessionType === 'focus' ? { duration: val * 60 } : {}),
    }))
  }

  const handleBreakChange = (val: number) => {
    useTimerStore.setState((s) => ({
      breakDuration: val * 60,
      ...(!s.isRunning && s.sessionType === 'break' ? { duration: val * 60 } : {}),
    }))
  }

  const timerType: 'timer' | 'free' = mode === 'free' ? 'free' : 'timer'

  const handleTypeChange = (v: 'timer' | 'free') => {
    const next: TimerMode = v === 'free' ? 'free' : (mode === 'free' ? 'pomodoro' : mode)
    setMode(next)
  }

  const totalMins  = focusMins + breakMins || 1
  const focusWidth = Math.round((focusMins / totalMins) * 100)
  const breakWidth = 100 - focusWidth

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) closePanel() }}>
      <SettingsPanelContent
        style={{ top: 56, background: 'var(--color-surface-raised)', borderLeft: '1px solid var(--color-border)' }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '18px 24px', borderBottom: '1px solid var(--color-border)', flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>
            Focus Settings
          </span>
          <DialogPrimitive.Close
            onClick={closePanel}
            style={{
              fontSize: 16, color: 'var(--color-text-faint)', background: 'none',
              border: 'none', cursor: 'pointer', lineHeight: 1, padding: 4,
              display: 'flex', alignItems: 'center',
            }}
            aria-label="Close settings"
          >
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
        </div>

        {/* Sections */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 28, flex: 1 }}>
          {/* Timer Type */}
          <div>
            <SectionLabel>Timer Type</SectionLabel>
            <TypePills value={timerType} onChange={handleTypeChange} />
          </div>

          {/* Focus Duration */}
          <div>
            <SectionLabel>Focus Duration</SectionLabel>
            <div style={{ borderLeft: '2px solid #3DD68C', paddingLeft: 12 }}>
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                  {focusMins} minutes
                </span>
                <Stepper value={focusMins} min={1} max={240} onChange={handleFocusChange} />
              </div>
            </div>
          </div>

          {/* Break Duration */}
          {mode !== 'free' ? (
            <div>
              <SectionLabel>Break Duration</SectionLabel>
              <div style={{ borderLeft: '2px solid var(--color-brand)', paddingLeft: 12 }}>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                    {breakMins} minutes
                  </span>
                  <Stepper value={breakMins} min={1} max={60} onChange={handleBreakChange} />
                </div>
              </div>
            </div>
          ) : null}

          {/* Auto-start */}
          <div>
            <SectionLabel>Auto-start</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <ToggleRow
                id="panel-auto-break"
                checked={autoStartBreak}
                onChange={setAutoStartBreak}
                label="Auto-start break"
              />
              <ToggleRow
                id="panel-auto-focus"
                checked={autoStartFocus}
                onChange={setAutoStartFocus}
                label="Auto-start focus"
              />
            </div>
          </div>

          {/* Preset pills — pomodoro only */}
          {mode === 'pomodoro' ? (
            <div>
              <SectionLabel>Presets</SectionLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {PRESET_OPTIONS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setPreset(preset)}
                    className="transition-all"
                    style={{
                      padding: '4px 12px', fontSize: 12, fontWeight: 500, borderRadius: 999,
                      ...(pomodoroPreset === preset
                        ? { background: 'var(--color-surface-overlay)', color: 'var(--color-brand)', border: '1px solid rgba(75,158,255,0.4)' }
                        : { background: 'transparent', color: 'var(--color-text-faint)', border: '1px solid var(--color-border)' }),
                    }}
                  >
                    {preset === 'custom' ? 'Custom' : preset}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Session Preview */}
          {mode !== 'free' ? (
            <div>
              <SectionLabel>Session Preview</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      height: 6, borderRadius: 3, background: 'var(--color-brand)',
                      width: `${focusWidth}%`, minWidth: 4, transition: 'width 0.3s',
                    }}
                  />
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                    Focus {focusMins}m
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      height: 6, borderRadius: 3, background: 'var(--color-surface-overlay)',
                      border: '1px solid var(--color-border)', width: `${breakWidth}%`, minWidth: 4, transition: 'width 0.3s',
                    }}
                  />
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                    Break {breakMins}m
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {/* Project & Task */}
          <div>
            <SectionLabel>Project &amp; Task</SectionLabel>
            <TimerProjectSelector />
          </div>
        </div>
      </SettingsPanelContent>
    </Sheet>
  )
}
