import { useId, useState } from 'react'
import { Download } from 'lucide-react'
import { UpgradeModal } from '@/components/billing/UpgradeModal'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { usePlan } from '@/hooks/usePlan'
import { useExportSessions } from '@/hooks/useSessions'
import type { Project } from '@/lib/supabase/queries/projects'

interface ExportPanelProps {
  projects: Project[]
  open: boolean
  onClose: () => void
}
export function ExportPanel({ projects, open, onClose }: ExportPanelProps) {
  const { isPro } = usePlan()
  const { exportSessions, isExporting, exportError } = useExportSessions()
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [projectId, setProjectId] = useState('all')
  const [includeBreaks, setIncludeBreaks] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const id = useId()
  const invalidRange = !!fromDate && !!toDate && fromDate > toDate
  const field =
    'h-11 w-full min-w-0 rounded-lg border border-depth-border bg-depth-bg px-3 text-sm text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand [color-scheme:dark]'
  function handleExport(event: React.FormEvent) {
    event.preventDefault()
    if (!isPro || isExporting || invalidRange) return
    exportSessions({
      startDate: fromDate || undefined,
      endDate: toDate || undefined,
      projectId: projectId === 'all' ? undefined : projectId,
      includeBreaks,
    })
  }
  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(value) => {
          if (!value && !isExporting) onClose()
        }}
      >
        <SheetContent className="flex w-full flex-col gap-0 border-depth-border bg-depth-surface p-0 motion-reduce:animate-none motion-reduce:transition-none sm:max-w-[476px] [&>button]:flex [&>button]:h-11 [&>button]:w-11 [&>button]:items-center [&>button]:justify-center">
          <SheetHeader className="shrink-0 border-b border-depth-border px-6 pb-6 pt-8 text-left">
            <SheetTitle className="pr-12 text-2xl font-medium tracking-tight text-ink-primary">
              Export sessions
            </SheetTitle>
            <SheetDescription className="text-sm leading-6 text-ink-primary/75">
              Download your session history as a CSV file.
            </SheetDescription>
          </SheetHeader>
          {!isPro ? (
            <div className="p-6">
              <p className="text-sm leading-6 text-ink-primary/75">
                CSV export is included with Pro and Lifetime.
              </p>
              <Button variant="primary" className="mt-4" onClick={() => setUpgradeOpen(true)}>
                View upgrade options
              </Button>
            </div>
          ) : (
            <form
              onSubmit={handleExport}
              className="flex min-h-0 flex-1 flex-col"
              aria-busy={isExporting}
            >
              <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
                <div>
                  <h3 className="text-sm font-medium text-ink-primary">Export range</h3>
                  <p className="mt-1 text-xs leading-5 text-ink-primary/70">
                    These choices apply to the download only.
                  </p>
                </div>
                <fieldset disabled={isExporting} className="space-y-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="min-w-0 space-y-2 text-xs text-ink-primary/75">
                      <span className="block">From</span>
                      <input
                        type="date"
                        value={fromDate}
                        max={toDate || undefined}
                        onChange={(event) => setFromDate(event.target.value)}
                        className={field}
                      />
                    </label>
                    <label className="min-w-0 space-y-2 text-xs text-ink-primary/75">
                      <span className="block">To</span>
                      <input
                        type="date"
                        value={toDate}
                        min={fromDate || undefined}
                        onChange={(event) => setToDate(event.target.value)}
                        className={field}
                      />
                    </label>
                  </div>
                  {invalidRange && (
                    <p role="alert" className="text-sm text-feedback-error">
                      The end date must be on or after the start date.
                    </p>
                  )}
                  <div>
                    <label
                      htmlFor={`${id}-project`}
                      className="mb-2 block text-xs text-ink-primary/75"
                    >
                      Project
                    </label>
                    <Select value={projectId} onValueChange={setProjectId} disabled={isExporting}>
                      <SelectTrigger id={`${id}-project`} className={field}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All projects</SelectItem>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                            {project.is_archived ? ' (archived)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <label
                        htmlFor={`${id}-breaks`}
                        className="text-sm font-medium text-ink-primary"
                      >
                        Include breaks
                      </label>
                      <p className="mt-1 text-xs text-ink-primary/70">
                        Off exports focus sessions only.
                      </p>
                    </div>
                    <Switch
                      id={`${id}-breaks`}
                      checked={includeBreaks}
                      onCheckedChange={setIncludeBreaks}
                      disabled={isExporting}
                    />
                  </div>
                </fieldset>
                <div className="border-t border-depth-border pt-5">
                  <h3 className="text-sm font-medium text-ink-primary">Your download includes</h3>
                  <ul className="mt-3 space-y-3 text-xs leading-5 text-ink-primary/75">
                    <li>
                      {includeBreaks ? 'Focus sessions and breaks' : 'Focus sessions only'} ·{' '}
                      {fromDate || 'any start date'} to {toDate || 'any end date'}
                    </li>
                    <li>
                      {projectId === 'all'
                        ? 'All projects'
                        : (projects.find((project) => project.id === projectId)?.name ??
                          'Selected project')}
                    </li>
                    <li>Matching sessions across every page</li>
                    <li>A CSV file you can open in a spreadsheet</li>
                  </ul>
                </div>
                {exportError && (
                  <p role="alert" className="text-sm text-feedback-error">
                    {exportError instanceof Error
                      ? exportError.message
                      : 'Export failed. Please try again.'}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-depth-border p-6">
                <Button type="button" variant="ghost" disabled={isExporting} onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isExporting}
                  disabled={invalidRange}
                >
                  <Download size={16} />
                  Download CSV
                </Button>
              </div>
            </form>
          )}
        </SheetContent>
      </Sheet>
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} trigger="export" />
    </>
  )
}
