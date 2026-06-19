import { useEffect, useState } from 'react'

/**
 * Delays updating a value until the user has stopped changing it.
 * Essential for search inputs — avoids firing a query on every keystroke.
 *
 * Usage:
 *   const debouncedSearch = useDebounce(searchQuery, 400)
 *   useEffect(() => { fetchResults(debouncedSearch) }, [debouncedSearch])
 */
export function useDebounce<T>(value: T, delayMs: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debouncedValue
}
