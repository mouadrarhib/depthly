import { FolderKanban } from 'lucide-react'

import { Spinner } from '@/components/ui'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
} from '@/components/ui/select'
import type { Project } from '@/lib/supabase/queries/projects'

export const ALL_PROJECTS_VALUE = 'all'
export const UNASSIGNED_PROJECT_VALUE = 'unassigned'

interface AnalyticsProjectSelectProps {
  value: string
  label: string
  color: string
  activeProjects: Project[]
  archivedProjects: Project[]
  isLoading: boolean
  onValueChange: (value: string) => void
}

function ProjectOption({ project }: { project: Project }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
      <span className="truncate">{project.name}</span>
    </span>
  )
}

export function AnalyticsProjectSelect({
  value,
  label,
  color,
  activeProjects,
  archivedProjects,
  isLoading,
  onValueChange,
}: AnalyticsProjectSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={isLoading}>
      <SelectTrigger
        aria-label="Filter analytics by project"
        className="h-8 w-full min-w-0 gap-2 rounded-lg border-depth-border bg-depth-surface px-3 text-[13px] text-ink-primary shadow-none sm:w-[210px]"
      >
        {isLoading ? (
          <span className="flex items-center gap-2 text-ink-secondary">
            <Spinner size="sm" />
            Projects
          </span>
        ) : (
          <span className="flex min-w-0 items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            <span className="truncate">{label}</span>
          </span>
        )}
      </SelectTrigger>

      <SelectContent className="border-depth-border bg-depth-surface">
        <SelectItem value={ALL_PROJECTS_VALUE}>
          <span className="flex items-center gap-2">
            <FolderKanban className="h-3.5 w-3.5 text-brand" />
            All projects
          </span>
        </SelectItem>
        <SelectItem value={UNASSIGNED_PROJECT_VALUE}>
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-ink-secondary" />
            No project
          </span>
        </SelectItem>

        {activeProjects.length > 0 ? (
          <>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel className="pl-2 text-[11px] uppercase tracking-[0.08em] text-ink-muted">
                Active
              </SelectLabel>
              {activeProjects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  <ProjectOption project={project} />
                </SelectItem>
              ))}
            </SelectGroup>
          </>
        ) : null}

        {archivedProjects.length > 0 ? (
          <>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel className="pl-2 text-[11px] uppercase tracking-[0.08em] text-ink-muted">
                Archived
              </SelectLabel>
              {archivedProjects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  <ProjectOption project={project} />
                </SelectItem>
              ))}
            </SelectGroup>
          </>
        ) : null}
      </SelectContent>
    </Select>
  )
}
