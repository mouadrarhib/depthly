import { type HTMLAttributes } from 'react'

import { cn } from '@/lib/utils/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  as?: 'div' | 'section' | 'article'
}

export function Card({ className, as: Tag = 'div', ...props }: CardProps) {
  return (
    <Tag
      className={cn(
        'rounded-lg border border-border bg-surface-raised shadow-card',
        className
      )}
      {...props}
    />
  )
}
