/**
 * Re-export all domain types from one entry point.
 * Consumers can do: import type { User, Project } from '@/types'
 */

// Auth
export interface User {
  id:         string
  email:      string
  created_at: string
  avatar_url?: string
  full_name?:  string
}

// Shared utility types
export type ID = string

/** Makes every key of T optional except the keys in K */
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>

/** Strips null from a type */
export type NonNullable<T> = T extends null | undefined ? never : T

/** API response wrapper */
export interface ApiResponse<T> {
  data:  T | null
  error: string | null
}
