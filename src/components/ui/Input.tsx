import { type InputHTMLAttributes, forwardRef } from 'react'

import { cn } from '@/lib/utils/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?:  string
}

/**
 * Text input with optional label, error, and hint.
 *
 * Usage:
 *   <Input label="Email" type="email" placeholder="you@example.com" />
 *   <Input label="Name" error="Name is required" />
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <label htmlFor={inputId} className="text-sm font-medium text-text-muted">
            {label}
          </label>
        ) : null}

        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-10 w-full rounded border bg-surface-overlay px-3 text-sm text-text',
            'placeholder:text-text-faint',
            'border-border focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand',
            'transition-colors',
            error && 'border-feedback-error focus:border-feedback-error focus:ring-feedback-error',
            className
          )}
          {...props}
        />

        {error ? (
          <p className="text-xs text-feedback-error">{error}</p>
        ) : hint ? (
          <p className="text-xs text-text-faint">{hint}</p>
        ) : null}
      </div>
    )
  }
)

Input.displayName = 'Input'
