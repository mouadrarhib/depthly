export interface AnalyticsProjectScope {
  /** `undefined` means all projects; `null` means sessions without a project. */
  projectId: string | null | undefined
  projectLabel: string
  projectColor: string
}
