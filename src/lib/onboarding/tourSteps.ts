import type { DriveStep } from 'driver.js'

/**
 * Sidebar nav items without a `[data-tour]` target (Tasks, Goals) live inside
 * a project rather than the sidebar, so they have no step here.
 */
export function getTourSteps(): DriveStep[] {
  return [
    {
      element: '[data-tour="dashboard"]',
      popover: {
        title: 'Dashboard',
        description:
          "Your home base after login — today's focus time, streak, and recent sessions at a glance, plus the timer right there so you can jump straight into a session.",
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-tour="timer"]',
      popover: {
        title: 'Your Focus Timer',
        description:
          'Start a Pomodoro or free-form session here — everything else in Depthly builds off the time you track.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-tour="projects"]',
      popover: {
        title: 'Projects',
        description:
          "Projects group related work — like 'Client X' or 'Side Project'. Every session and task you create can be linked to one, so your stats stay organized by what you're actually working on.",
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-tour="sessions"]',
      popover: {
        title: 'Sessions',
        description:
          'Every completed focus session lands here — see what you worked on and when, edit the details afterward, or add one manually if you forgot to start the timer.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-tour="analytics"]',
      popover: {
        title: 'Analytics',
        description:
          "See your focus time broken down by day, week, month, and year, plus how it's split across projects.",
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-tour="leaderboard"]',
      popover: {
        title: 'Leaderboard',
        description:
          'Compare focus hours with others (or just friends) and keep your streak alive.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-tour="billing"]',
      popover: {
        title: 'Billing',
        description:
          'See your current plan, upgrade to Pro or Lifetime, and check your billing history — all in one place.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-tour="settings"]',
      popover: {
        title: 'Settings',
        description:
          'Customize your timer defaults, notifications, and profile here — any time.',
        side: 'right',
        align: 'start',
      },
    },
  ]
}
