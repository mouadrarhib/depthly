/** Date-only helpers use the user's local calendar, never UTC timestamps. */
export function dateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function fromDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

export function startOfWeek(date: Date): Date {
  const day = (date.getDay() + 6) % 7
  return addDays(date, -day)
}

export function weekRange(date: Date): [string, string] {
  const start = startOfWeek(date)
  return [dateKey(start), dateKey(addDays(start, 6))]
}

export function monthRange(date: Date): [string, string] {
  return [
    dateKey(new Date(date.getFullYear(), date.getMonth(), 1)),
    dateKey(new Date(date.getFullYear(), date.getMonth() + 1, 0)),
  ]
}

export function monthGrid(date: Date): Date[] {
  const start = startOfWeek(new Date(date.getFullYear(), date.getMonth(), 1))
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  const end = addDays(startOfWeek(last), 6)
  const days: Date[] = []
  for (let day = start; day <= end; day = addDays(day, 1)) days.push(day)
  return days
}

export function shortDate(key: string): string {
  return fromDateKey(key).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
