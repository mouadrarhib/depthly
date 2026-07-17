import type { DriveStep } from 'driver.js'

/**
 * Sidebar nav items without a `[data-tour]` target (Tasks, Goals) live inside
 * a project rather than the sidebar, so they have no step here.
 *
 * Each step's `data.location` ('sidebar' | 'topbar') tells
 * useOnboardingTour.ts's runOnboardingTour() whether the mobile sidebar
 * drawer needs to be open or closed before that step is shown.
 *
 * `isMobile` controls placement for most sidebar nav-item steps: the open
 * mobile drawer is a fixed 240px wide, which leaves under ~190px of
 * viewport to its right on most phones — less than driver.js's own
 * popover (250-300px wide). 'right' has no room to render in there, so
 * driver.js falls back to an unpredictable/overlapping position instead.
 * 'bottom' always has room below each row, on both desktop and mobile, so
 * it's used wherever 'right' would actually be cramped — Dashboard and
 * Timer are cramped even on desktop (they're the two rows right below the
 * branding header) and always use 'bottom', regardless of `isMobile`.
 */
export function getTourSteps(isMobile: boolean): DriveStep[] {
  const navSide  = isMobile ? 'bottom' : 'right'
  const navAlign = isMobile ? 'center' : 'start'

  return [
    {
      element: '[data-tour="dashboard"]',
      popover: {
        title: 'Dashboard',
        description:
          "Your home base after login — today's focus time, streak, and recent sessions at a glance, plus the timer right there so you can jump straight into a session.",
        // Dashboard is the very first sidebar row, right below the branding
        // header — 'right' is cramped there even on desktop, so this one
        // always uses 'bottom'/'center' regardless of viewport (arrow lands
        // on the "Dashboard" label instead of the icon at the row's left edge).
        side: 'bottom',
        align: 'center',
      },
      data: { location: 'sidebar' },
    },
    {
      element: '[data-tour="today-stats"]',
      popover: {
        title: "Today's Stats",
        description:
          "Your streak, focus time, and session count for today — always visible up here, no matter which page you're on.",
        side: 'bottom',
        align: 'end',
      },
      data: { location: 'topbar' },
    },
    {
      element: '[data-tour="timer"]',
      popover: {
        title: 'Your Focus Timer',
        description:
          'Start a Pomodoro or free-form session here — everything else in Depthly builds off the time you track.',
        // Timer sits right below Dashboard, close to the branding header —
        // same cramped-on-the-right situation, so it gets the same
        // unconditional 'bottom'/'center' treatment regardless of viewport.
        side: 'bottom',
        align: 'center',
      },
      data: { location: 'sidebar' },
    },
    {
      element: '[data-tour="projects"]',
      popover: {
        title: 'Projects',
        description:
          "Projects group related work — like 'Client X' or 'Side Project'. Every session and task you create can be linked to one, so your stats stay organized by what you're actually working on.",
        side: navSide,
        align: navAlign,
      },
      data: { location: 'sidebar' },
    },
    {
      element: '[data-tour="sessions"]',
      popover: {
        title: 'Sessions',
        description:
          'Every completed focus session lands here — see what you worked on and when, edit the details afterward, or add one manually if you forgot to start the timer.',
        side: navSide,
        align: navAlign,
      },
      data: { location: 'sidebar' },
    },
    {
      element: '[data-tour="analytics"]',
      popover: {
        title: 'Analytics',
        description:
          "See your focus time broken down by day, week, month, and year, plus how it's split across projects.",
        side: navSide,
        align: navAlign,
      },
      data: { location: 'sidebar' },
    },
    {
      element: '[data-tour="leaderboard"]',
      popover: {
        title: 'Leaderboard',
        description:
          'Compare focus hours with others (or just friends) and keep your streak alive.',
        side: navSide,
        align: navAlign,
      },
      data: { location: 'sidebar' },
    },
    {
      element: '[data-tour="billing"]',
      popover: {
        title: 'Billing',
        description:
          'See your current plan, upgrade to Pro or Lifetime, and check your billing history — all in one place.',
        side: navSide,
        align: navAlign,
      },
      data: { location: 'sidebar' },
    },
    {
      element: '[data-tour="settings"]',
      popover: {
        title: 'Settings',
        description:
          'Customize your timer defaults, notifications, and profile here — any time.',
        side: navSide,
        align: navAlign,
      },
      data: { location: 'sidebar' },
    },
  ]
}
