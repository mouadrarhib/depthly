import { useLayoutEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

type AnalyticsTab = 'overview' | 'daily' | 'weekly' | 'monthly' | 'yearly'
const OPTIONS: { value: AnalyticsTab; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]

export function AnalyticsTabs({
  value,
  onChange,
}: {
  value: AnalyticsTab
  onChange: (value: AnalyticsTab) => void
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLSpanElement>(null)
  const initialized = useRef(false)
  useLayoutEffect(() => {
    const list = listRef.current
    const indicator = indicatorRef.current
    const active = list?.querySelector<HTMLElement>('[role="tab"][data-state="active"]')
    if (!list || !indicator || !active) return
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const place = (animate: boolean) => {
      const target = {
        x: active.offsetLeft,
        y: active.offsetTop,
        width: active.offsetWidth,
        height: active.offsetHeight,
      }
      if (animate && initialized.current && !preference.matches) {
        gsap.to(indicator, { ...target, duration: 0.3, ease: 'power3.out', overwrite: true })
      } else {
        gsap.killTweensOf(indicator)
        gsap.set(indicator, target)
      }
      gsap.set(indicator, { visibility: 'visible' })
      initialized.current = true
    }
    place(true)
    // Ignore the observer's initial notification so it cannot cancel the
    // selection tween. Snap only when the measured layout actually changes.
    const geometry = () =>
      [
        list.offsetWidth,
        list.offsetHeight,
        active.offsetLeft,
        active.offsetTop,
        active.offsetWidth,
        active.offsetHeight,
      ].join(':')
    let lastGeometry = geometry()
    const resize = new ResizeObserver(() => {
      const nextGeometry = geometry()
      if (nextGeometry === lastGeometry) return
      lastGeometry = nextGeometry
      place(false)
    })
    resize.observe(list)
    resize.observe(active)
    const updatePreference = () => place(false)
    preference.addEventListener('change', updatePreference)
    return () => {
      resize.disconnect()
      preference.removeEventListener('change', updatePreference)
      gsap.killTweensOf(indicator)
    }
  }, [value])
  return (
    <Tabs
      value={value}
      onValueChange={(next) => onChange(next as AnalyticsTab)}
      className="w-full sm:w-auto"
    >
      <TabsList
        ref={listRef}
        aria-label="Analytics period"
        className="relative isolate h-auto max-w-full flex-wrap justify-start gap-0.5 rounded-lg border border-depth-border bg-depth-surface p-1"
      >
        <span
          ref={indicatorRef}
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 rounded-md border border-brand/30 bg-depth-bg"
          style={{ visibility: 'hidden' }}
        />
        {OPTIONS.map((option) => (
          <TabsTrigger
            key={option.value}
            value={option.value}
            className="relative z-[1] min-h-11 rounded-md border border-transparent bg-transparent px-3.5 py-1.5 text-[13px] font-medium text-ink-primary/70 shadow-none transition-colors duration-200 hover:text-ink-primary focus-visible:ring-2 focus-visible:ring-brand data-[state=active]:bg-transparent data-[state=active]:text-brand data-[state=active]:shadow-none motion-reduce:transition-none"
          >
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
