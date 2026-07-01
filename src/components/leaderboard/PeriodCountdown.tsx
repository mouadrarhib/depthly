import { useEffect, useState } from 'react'

interface PeriodCountdownProps {
  periodType: string
  periodKey:  string
}

function getEndTime(periodType: string): Date {
  const now = new Date()
  const d   = new Date(now)

  if (periodType === 'daily') {
    d.setHours(23, 59, 59, 0)
    return d
  }
  if (periodType === 'weekly') {
    // ISO week ends Sunday 23:59
    const daysUntilSunday = (7 - now.getDay()) % 7
    d.setDate(now.getDate() + (daysUntilSunday === 0 ? 0 : daysUntilSunday))
    d.setHours(23, 59, 59, 0)
    return d
  }
  if (periodType === 'monthly') {
    // Last day of current month
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    lastDay.setHours(23, 59, 59, 0)
    return lastDay
  }
  if (periodType === 'yearly') {
    const dec31 = new Date(now.getFullYear(), 11, 31)
    dec31.setHours(23, 59, 59, 0)
    return dec31
  }
  // fallback
  return d
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0d 00:00:00'
  const totalSecs = Math.floor(ms / 1000)
  const days  = Math.floor(totalSecs / 86400)
  const hours = Math.floor((totalSecs % 86400) / 3600)
  const mins  = Math.floor((totalSecs % 3600) / 60)
  const secs  = totalSecs % 60
  const hh = String(hours).padStart(2, '0')
  const mm = String(mins).padStart(2, '0')
  const ss = String(secs).padStart(2, '0')
  return `${days}d ${hh}:${mm}:${ss}`
}

export function PeriodCountdown({ periodType }: PeriodCountdownProps) {
  const [display, setDisplay] = useState('')

  useEffect(() => {
    if (periodType === 'all_time') return

    function tick() {
      const ms = getEndTime(periodType).getTime() - Date.now()
      setDisplay(formatCountdown(ms))
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [periodType])

  if (periodType === 'all_time') return null

  return (
    <span className="font-data" style={{ fontSize: 12, color: '#7A7890' }}>
      Ends in {display}
    </span>
  )
}
