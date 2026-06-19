import { type ButtonHTMLAttributes, forwardRef } from 'react'

import { cn } from '@/lib/utils/cn'

const variants = {
  primary:   'bg-brand text-white hover:bg-brand-hover shadow-sm',
  secondary: 'bg-surface-overlay border border-border text-text hover:bg-surface-raised',
  ghost:     'text-text-muted hover:text-text hover:bg-surface-overlay',
  danger:    'bg-feedback-error/10 text-feedback-error hover:bg-feedback-error/20 border border-feedback-error/20',
} as const

const sizes = {
  sm: 'h-8  px-3 text-sm  gap-1.5',
  md: 'h-10 px-4 text-sm  gap-2',
  lg: 'h-12 px-6 text-base gap-2',
} as const

type Variant = keyof typeof variants
type Size    = keyof typeof sizes

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:   Variant
  size?:      Size
  isLoading?: boolean
}

/**
 * The foundational button. All other buttons in the app should use this.
 *
 * Usage:
 *   <Button>Save</Button>
 *   <Button variant="danger" size="sm">Delete</Button>
 *   <Button isLoading={mutation.isPending}>Submit</Button>
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base',
          'disabled:pointer-events-none disabled:opacity-50',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
