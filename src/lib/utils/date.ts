/** Returns YYYY-MM-DD string */
export function toDateString(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

/** Check same calendar day */
export function isSameDay(a: Date, b: Date): boolean {
  return toDateString(a) === toDateString(b)
}

/** Midnight local time */
export function startOfDay(date: Date = new Date()): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Full days between two dates */
export function daysBetween(a: Date, b: Date): number {
  const diff = Math.abs(startOfDay(a).getTime() - startOfDay(b).getTime())
  return Math.round(diff / (1000 * 60 * 60 * 24))
}
