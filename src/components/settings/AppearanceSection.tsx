import { Check, Monitor, Moon, Sun } from 'lucide-react'

import type { ThemePreference } from '@/lib/theme'
import { cn } from '@/lib/utils/cn'
import { useUiStore } from '@/store'

const OPTIONS: Array<{
  value: ThemePreference
  label: string
  description: string
  Icon: typeof Monitor
}> = [
  {
    value: 'system',
    label: 'System',
    description: 'Match this device',
    Icon: Monitor,
  },
  {
    value: 'light',
    label: 'Light',
    description: 'Bright workspace',
    Icon: Sun,
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Low-light workspace',
    Icon: Moon,
  },
]

export function AppearanceSection() {
  const theme = useUiStore((state) => state.theme)
  const setTheme = useUiStore((state) => state.setTheme)

  return (
    <section aria-labelledby="appearance-heading">
      <h2 id="appearance-heading" className="mb-3 text-base font-medium text-text">
        Appearance
      </h2>
      <div className="mb-5 border-t border-border" />

      <div className="rounded-xl border border-border bg-surface-raised p-4 sm:p-6">
        <div>
          <h3 className="text-sm font-medium text-text">Theme</h3>
          <p className="mt-1 text-xs leading-relaxed text-text-muted">
            Choose how Depthly looks on this device.
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Theme">
          {OPTIONS.map(({ value, label, description, Icon }) => {
            const selected = theme === value
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setTheme(value)}
                className={cn(
                  'relative flex min-h-24 items-start gap-3 rounded-xl border p-4 text-left transition-[background-color,border-color,color,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60',
                  'active:scale-[0.985] motion-reduce:transform-none motion-reduce:transition-none',
                  selected
                    ? 'border-brand/60 bg-brand/10 text-text'
                    : 'border-border bg-surface-base text-text-muted hover:border-brand/35 hover:bg-surface-overlay hover:text-text'
                )}
              >
                <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', selected ? 'bg-brand/15 text-brand' : 'bg-surface-overlay')}>
                  <Icon size={18} aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className="mt-1 block text-xs text-text-muted">{description}</span>
                </span>
                {selected ? <Check className="absolute right-3 top-3 text-brand" size={16} aria-hidden="true" /> : null}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
