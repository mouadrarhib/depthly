import { useEffect } from 'react'

import { applyThemePreference, systemThemeQuery } from '@/lib/theme'
import { useUiStore } from '@/store'

export function ThemeSync() {
  const theme = useUiStore((state) => state.theme)

  useEffect(() => {
    applyThemePreference(theme, true)

    if (theme !== 'system') return

    const media = window.matchMedia(systemThemeQuery)
    const handleChange = () => applyThemePreference('system', true)
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [theme])

  return null
}
