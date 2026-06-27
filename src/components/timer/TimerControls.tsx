import { useTimerStore } from '@/store/timerStore'
import { cn } from '@/lib/utils'

const base = 'inline-flex items-center justify-center font-medium cursor-pointer transition-all disabled:pointer-events-none disabled:opacity-50 select-none'

export function TimerControls() {
  const { isRunning, isPaused, sessionType, start, pause, resume, stop, skipBreak } =
    useTimerStore()

  const isIdle = !isRunning && !isPaused

  if (isIdle) {
    return (
      <button
        onClick={start}
        className={cn(base, 'w-full max-w-[220px] h-[48px] sm:h-[52px] rounded-[14px] text-[14px] sm:text-[15px] font-semibold tracking-wide')}
        style={{
          background:  'rgba(75, 158, 255, 0.08)',
          border:      '1px solid rgba(75, 158, 255, 0.22)',
          color:       '#B8D4FF',
          boxShadow:   'inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget
          el.style.background = 'rgba(75, 158, 255, 0.14)'
          el.style.borderColor = 'rgba(75, 158, 255, 0.38)'
          el.style.color       = '#D0E4FF'
          el.style.boxShadow   = 'inset 0 1px 0 rgba(255,255,255,0.06), 0 0 22px rgba(75,158,255,0.12)'
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget
          el.style.background  = 'rgba(75, 158, 255, 0.08)'
          el.style.borderColor = 'rgba(75, 158, 255, 0.22)'
          el.style.color       = '#B8D4FF'
          el.style.boxShadow   = 'inset 0 1px 0 rgba(255,255,255,0.04)'
        }}
      >
        Start Focus Session
      </button>
    )
  }

  if (isPaused) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        {/* Resume — same crystal blue */}
        <button
          onClick={resume}
          className={cn(base, 'h-[44px] sm:h-[48px] min-w-[100px] sm:min-w-[120px] px-4 sm:px-6 rounded-[12px] text-[13px] sm:text-[14px] font-semibold tracking-wide')}
          style={{
            background: 'rgba(75, 158, 255, 0.08)',
            border:     '1px solid rgba(75, 158, 255, 0.22)',
            color:      '#B8D4FF',
            boxShadow:  'inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget
            el.style.background  = 'rgba(75, 158, 255, 0.14)'
            el.style.borderColor = 'rgba(75, 158, 255, 0.38)'
            el.style.color       = '#D0E4FF'
            el.style.boxShadow   = 'inset 0 1px 0 rgba(255,255,255,0.06), 0 0 18px rgba(75,158,255,0.1)'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget
            el.style.background  = 'rgba(75, 158, 255, 0.08)'
            el.style.borderColor = 'rgba(75, 158, 255, 0.22)'
            el.style.color       = '#B8D4FF'
            el.style.boxShadow   = 'inset 0 1px 0 rgba(255,255,255,0.04)'
          }}
        >
          Resume
        </button>

        {/* Stop — faint red chip */}
        <button
          onClick={stop}
          className={cn(base, 'h-[44px] sm:h-[48px] min-w-[100px] sm:min-w-[120px] px-4 sm:px-6 rounded-[12px] text-[13px] sm:text-[14px]')}
          style={{
            background: 'rgba(242, 92, 92, 0.06)',
            border:     '1px solid rgba(242, 92, 92, 0.18)',
            color:      '#E07878',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget
            el.style.background  = 'rgba(242, 92, 92, 0.11)'
            el.style.borderColor = 'rgba(242, 92, 92, 0.3)'
            el.style.color       = '#F09090'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget
            el.style.background  = 'rgba(242, 92, 92, 0.06)'
            el.style.borderColor = 'rgba(242, 92, 92, 0.18)'
            el.style.color       = '#E07878'
          }}
        >
          Stop
        </button>
      </div>
    )
  }

  // Running
  return (
    <div className="flex items-center gap-3">
      {/* Pause — neutral surface chip */}
      <button
        onClick={pause}
        className={cn(base, 'h-[44px] sm:h-[48px] min-w-[100px] sm:min-w-[120px] px-4 sm:px-6 rounded-[12px] text-[13px] sm:text-[14px]')}
        style={{
          background: 'rgba(255, 255, 255, 0.04)',
          border:     '1px solid rgba(255, 255, 255, 0.09)',
          color:      '#7A7890',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget
          el.style.background  = 'rgba(255, 255, 255, 0.07)'
          el.style.borderColor = 'rgba(255, 255, 255, 0.14)'
          el.style.color       = '#B0AECB'
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget
          el.style.background  = 'rgba(255, 255, 255, 0.04)'
          el.style.borderColor = 'rgba(255, 255, 255, 0.09)'
          el.style.color       = '#7A7890'
        }}
      >
        Pause
      </button>

      {/* Stop — faint red chip */}
      <button
        onClick={stop}
        className={cn(base, 'h-[44px] sm:h-[48px] min-w-[100px] sm:min-w-[120px] px-4 sm:px-6 rounded-[12px] text-[13px] sm:text-[14px]')}
        style={{
          background: 'rgba(242, 92, 92, 0.06)',
          border:     '1px solid rgba(242, 92, 92, 0.18)',
          color:      '#E07878',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget
          el.style.background  = 'rgba(242, 92, 92, 0.11)'
          el.style.borderColor = 'rgba(242, 92, 92, 0.3)'
          el.style.color       = '#F09090'
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget
          el.style.background  = 'rgba(242, 92, 92, 0.06)'
          el.style.borderColor = 'rgba(242, 92, 92, 0.18)'
          el.style.color       = '#E07878'
        }}
      >
        Stop
      </button>

      {sessionType === 'break' ? (
        <button
          onClick={skipBreak}
          className={cn(base, 'h-[44px] sm:h-[48px] min-w-[100px] sm:min-w-[120px] px-4 sm:px-6 rounded-[12px] text-[13px] sm:text-[14px]')}
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border:     '1px solid rgba(255, 255, 255, 0.09)',
            color:      '#7A7890',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget
            el.style.background  = 'rgba(255, 255, 255, 0.07)'
            el.style.borderColor = 'rgba(255, 255, 255, 0.14)'
            el.style.color       = '#B0AECB'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget
            el.style.background  = 'rgba(255, 255, 255, 0.04)'
            el.style.borderColor = 'rgba(255, 255, 255, 0.09)'
            el.style.color       = '#7A7890'
          }}
        >
          Skip Break
        </button>
      ) : null}
    </div>
  )
}
