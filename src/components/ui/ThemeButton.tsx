import { Monitor, Moon, Sun } from 'lucide-react'

import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { ThemePreference } from '@/lib/theme'
import { useUiStore } from '@/store'

const OPTIONS = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
] as const

export function ThemeButton() {
  const theme = useUiStore((state) => state.theme)
  const setTheme = useUiStore((state) => state.setTheme)
  const current = OPTIONS.find((option) => option.value === theme) ?? OPTIONS[2]
  const Icon = current.Icon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label={`Change theme, current: ${current.label}`} title={`Theme: ${current.label}`} className="flex size-11 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-overlay hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60">
          <Icon size={18} aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as ThemePreference)} aria-label="Theme">
          {OPTIONS.map(({ value, label, Icon: OptionIcon }) => (
            <DropdownMenuRadioItem key={value} value={value} className="min-h-11 gap-2.5">
              <OptionIcon size={16} aria-hidden="true" />{label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
