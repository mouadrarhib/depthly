import { type HTMLAttributes } from 'react'

import { cn } from '@/lib/utils/cn'

const variants = {
  default: 'bg-surface-overlay text-text-muted border-border',
  brand:   'bg-brand/10 text-brand border-brand/20',
  success: 'bg-feedback-success/10 text-feedback-success border-feedback-success/20',
  warning: 'bg-feedback-warning/10 text-feedback-warning border-feedback-warning/20',
  error:   'bg-feedback-error/10 text-feedback-error border-feedback-error/20',
} as const

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants
}

export function Badge({ variant = 'default', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
      {...props}
    />
  )
}
