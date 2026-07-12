import { Badge } from '@/components/ui/Badge'
import { PRIORITY_CONFIG } from '@/lib/utils/tasks'

type Priority = 'low' | 'medium' | 'high' | 'urgent'

interface PriorityBadgeProps {
  priority: Priority
  /** Dims the badge (e.g. when the parent task is completed) to de-emphasize it
   *  relative to active tasks, matching the strikethrough treatment on the title. */
  dimmed?:  boolean
}

export function PriorityBadge({ priority, dimmed }: PriorityBadgeProps) {
  const { label, color } = PRIORITY_CONFIG[priority]

  return (
    <Badge
      variant="outline"
      style={{
        backgroundColor: `${color}26`,
        color,
        borderColor: `${color}66`,
        fontSize: '11px',
        fontWeight: 500,
        opacity: dimmed ? 0.5 : 1,
      }}
    >
      {label}
    </Badge>
  )
}
