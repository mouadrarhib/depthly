import type { DriveStep } from 'driver.js'

export function getProjectTourSteps(hasProjects: boolean, isMobile: boolean): DriveStep[] {
  const steps: DriveStep[] = [
    {
      element: '[data-project-tour="new-project"]',
      popover: {
        title: 'Create a project',
        description:
          'Start by grouping related work in a project. Give it a name, color, and icon so it is easy to recognize.',
        side: 'bottom',
        align: 'end',
      },
    },
  ]

  if (!hasProjects) return steps

  steps.push(
    {
      element: '[data-project-tour="project-card"]',
      popover: {
        title: 'Open the workspace',
        description:
          'Open a project to add tasks, review its sessions, and start organizing the focus time connected to it.',
        side: isMobile ? 'top' : 'right',
        align: isMobile ? 'center' : 'start',
      },
    },
    {
      element: '[data-project-tour="project-actions"]',
      popover: {
        title: 'Manage the project',
        description:
          'Use this menu to edit, archive, restore, or permanently delete a project. Archiving keeps its tasks and focus history.',
        side: isMobile ? 'bottom' : 'left',
        align: isMobile ? 'end' : 'start',
      },
    },
  )

  return steps
}
