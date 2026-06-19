import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind classes without conflicts.
 * clsx handles conditionals; twMerge resolves Tailwind class collisions.
 *
 * Usage: cn('px-4 py-2', isActive && 'bg-brand', className)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
