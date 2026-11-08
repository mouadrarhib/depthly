export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = Exclude<ThemePreference, 'system'>

const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)'
let transitionCleanup: number | undefined
let activeTransition: { skipTransition: () => void; finished: Promise<void> } | undefined

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference !== 'system') return preference
  return window.matchMedia(SYSTEM_DARK_QUERY).matches ? 'dark' : 'light'
}

export function applyThemePreference(
  preference: ThemePreference,
  animate = false,
): ResolvedTheme {
  const root = document.documentElement
  const resolved = resolveTheme(preference)
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const changed = root.dataset.theme !== resolved

  if (transitionCleanup !== undefined) window.clearTimeout(transitionCleanup)
  activeTransition?.skipTransition()

  const updatePalette = () => {
    root.classList.toggle('dark', resolved === 'dark')
    root.classList.toggle('light', resolved === 'light')
    root.dataset.theme = resolved
    root.style.colorScheme = resolved

    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    themeColor?.setAttribute('content', resolved === 'dark' ? '#0D0D10' : '#F7F8FA')
  }

  if (changed && animate && !reduceMotion && document.startViewTransition) {
    root.classList.remove('theme-transition')
    root.classList.add('theme-crossfade')
    const transition = document.startViewTransition(updatePalette)
    activeTransition = transition
    void transition.finished.catch(() => {}).finally(() => {
      if (activeTransition !== transition) return
      activeTransition = undefined
      root.classList.remove('theme-crossfade')
    })
    return resolved
  }

  if (changed && animate && !reduceMotion) {
    root.classList.add('theme-transition')
    // Commit transition rules against the current palette before changing it.
    // Otherwise the browser can batch both mutations and skip interpolation.
    void window.getComputedStyle(root).backgroundColor
    transitionCleanup = window.setTimeout(() => {
      root.classList.remove('theme-transition')
      transitionCleanup = undefined
    }, 420)
  } else {
    root.classList.remove('theme-transition')
  }

  updatePalette()

  return resolved
}

export const systemThemeQuery = SYSTEM_DARK_QUERY
