import {
  BriefcaseBusiness,
  BookOpen,
  Zap,
  Palette,
  Wrench,
  Rocket,
  Lightbulb,
  Target,
  NotebookPen,
  Trophy,
  Microscope,
  Laptop,
  Music,
  Sprout,
  ChartColumn,
  Star,
} from 'lucide-react'

/** Preserve stored emoji identifiers while presenting a consistent icon system. */
export const PROJECT_ICONS = [
  { value: '💼', label: 'Briefcase', component: BriefcaseBusiness },
  { value: '📚', label: 'Books', component: BookOpen },
  { value: '⚡', label: 'Energy', component: Zap },
  { value: '🎨', label: 'Art', component: Palette },
  { value: '🔧', label: 'Tools', component: Wrench },
  { value: '🚀', label: 'Rocket', component: Rocket },
  { value: '💡', label: 'Idea', component: Lightbulb },
  { value: '🎯', label: 'Target', component: Target },
  { value: '📝', label: 'Notes', component: NotebookPen },
  { value: '🏆', label: 'Trophy', component: Trophy },
  { value: '🔬', label: 'Science', component: Microscope },
  { value: '💻', label: 'Computer', component: Laptop },
  { value: '🎵', label: 'Music', component: Music },
  { value: '🌱', label: 'Growth', component: Sprout },
  { value: '📊', label: 'Chart', component: ChartColumn },
  { value: '⭐', label: 'Star', component: Star },
] as const

export function ProjectIcon({
  icon,
  size = 18,
  className = '',
}: {
  icon: string | null
  size?: number
  className?: string
}) {
  if (!icon) return null
  const option = PROJECT_ICONS.find((item) => item.value === icon)
  if (!option)
    return (
      <span aria-hidden="true" className={className}>
        {icon}
      </span>
    )
  const Icon = option.component
  return (
    <Icon size={size} strokeWidth={1.7} className={`shrink-0 ${className}`} aria-hidden="true" />
  )
}
