import { Badge } from '@/components/ui/Badge'
import { PRIORITY_CONFIG } from '@/lib/utils/tasks'

type Priority = 'low' | 'medium' | 'high' | 'urgent'

interface PriorityBadgeProps {
  priority: Priority
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
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
      }}
    >
      {label}
    </Badge>
  )
}
