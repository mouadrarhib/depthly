import { useTimerStore } from '@/store/timerStore'
import { useSaveSession } from '@/hooks/useSaveSession'
import { cn } from '@/lib/utils'

const base =
  'inline-flex items-center justify-center font-medium cursor-pointer transition-all disabled:pointer-events-none disabled:opacity-50 select-none'

export function TimerControls() {
  const { isRunning, isPaused, sessionType, mode, elapsed, duration } = useTimerStore()

  const { start, pause, resume, saveAndStop, skipBreak, isSaving } = useSaveSession()
  const hasCompleted = mode !== 'free' && duration > 0 && elapsed >= duration

  const isIdle = !isRunning && !isPaused
  // An idle phase has no active server run yet; paused phases use resume.
  const isBreakIdle = isIdle && sessionType === 'break'

  if (isIdle) {
    return (
      <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:gap-3">
        <button
          onClick={start}
          disabled={isSaving || hasCompleted}
          className={cn(
            base,
            'h-[48px] w-full max-w-[220px] rounded-[14px] text-[14px] font-semibold tracking-wide sm:h-[52px] sm:text-[15px]'
          )}
          style={{
            background: 'rgba(75, 158, 255, 0.08)',
            border: '1px solid rgba(75, 158, 255, 0.22)',
            color: '#B8D4FF',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget
            el.style.background = 'rgba(75, 158, 255, 0.14)'
            el.style.borderColor = 'rgba(75, 158, 255, 0.38)'
            el.style.color = '#D0E4FF'
            el.style.boxShadow =
              'inset 0 1px 0 rgba(255,255,255,0.06), 0 0 22px rgba(75,158,255,0.12)'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget
            el.style.background = 'rgba(75, 158, 255, 0.08)'
            el.style.borderColor = 'rgba(75, 158, 255, 0.22)'
            el.style.color = '#B8D4FF'
            el.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.04)'
          }}
        >
          {isBreakIdle ? 'Start Break' : 'Start Focus Session'}
        </button>
        {isBreakIdle ? <SkipBreakButton onClick={skipBreak} disabled={isSaving} /> : null}
      </div>
    )
  }

  if (isPaused) {
    return (
      <>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {/* Resume — same crystal blue */}
          <button
            onClick={resume}
            disabled={isSaving || hasCompleted}
            className={cn(
              base,
              'h-[44px] min-w-[100px] rounded-[12px] px-4 text-[13px] font-semibold tracking-wide sm:h-[48px] sm:min-w-[120px] sm:px-6 sm:text-[14px]'
            )}
            style={{
              background: 'rgba(75, 158, 255, 0.08)',
              border: '1px solid rgba(75, 158, 255, 0.22)',
              color: '#B8D4FF',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget
              el.style.background = 'rgba(75, 158, 255, 0.14)'
              el.style.borderColor = 'rgba(75, 158, 255, 0.38)'
              el.style.color = '#D0E4FF'
              el.style.boxShadow =
                'inset 0 1px 0 rgba(255,255,255,0.06), 0 0 18px rgba(75,158,255,0.1)'
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget
              el.style.background = 'rgba(75, 158, 255, 0.08)'
              el.style.borderColor = 'rgba(75, 158, 255, 0.22)'
              el.style.color = '#B8D4FF'
              el.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.04)'
            }}
          >
            Resume
          </button>

          {/* Stop — faint red chip */}
          <button
            onClick={saveAndStop}
            disabled={isSaving || hasCompleted}
            className={cn(
              base,
              'h-[44px] min-w-[100px] rounded-[12px] px-4 text-[13px] sm:h-[48px] sm:min-w-[120px] sm:px-6 sm:text-[14px]'
            )}
            style={{
              background: 'rgba(242, 92, 92, 0.06)',
              border: '1px solid rgba(242, 92, 92, 0.18)',
              color: '#E07878',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget
              el.style.background = 'rgba(242, 92, 92, 0.11)'
              el.style.borderColor = 'rgba(242, 92, 92, 0.3)'
              el.style.color = '#F09090'
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget
              el.style.background = 'rgba(242, 92, 92, 0.06)'
              el.style.borderColor = 'rgba(242, 92, 92, 0.18)'
              el.style.color = '#E07878'
            }}
          >
            Stop
          </button>
          {sessionType === 'break' ? (
            <SkipBreakButton onClick={skipBreak} disabled={isSaving} />
          ) : null}
        </div>
      </>
    )
  }

  // Running
  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        {/* Pause — neutral surface chip */}
        <button
          onClick={pause}
          disabled={isSaving || hasCompleted}
          className={cn(
            base,
            'h-[44px] min-w-[100px] rounded-[12px] px-4 text-[13px] sm:h-[48px] sm:min-w-[120px] sm:px-6 sm:text-[14px]'
          )}
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.09)',
            color: '#7A7890',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget
            el.style.background = 'rgba(255, 255, 255, 0.07)'
            el.style.borderColor = 'rgba(255, 255, 255, 0.14)'
            el.style.color = '#B0AECB'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget
            el.style.background = 'rgba(255, 255, 255, 0.04)'
            el.style.borderColor = 'rgba(255, 255, 255, 0.09)'
            el.style.color = '#7A7890'
          }}
        >
          Pause
        </button>

        {/* Stop — faint red chip */}
        <button
          onClick={saveAndStop}
          disabled={isSaving || hasCompleted}
          className={cn(
            base,
            'h-[44px] min-w-[100px] rounded-[12px] px-4 text-[13px] sm:h-[48px] sm:min-w-[120px] sm:px-6 sm:text-[14px]'
          )}
          style={{
            background: 'rgba(242, 92, 92, 0.06)',
            border: '1px solid rgba(242, 92, 92, 0.18)',
            color: '#E07878',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget
            el.style.background = 'rgba(242, 92, 92, 0.11)'
            el.style.borderColor = 'rgba(242, 92, 92, 0.3)'
            el.style.color = '#F09090'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget
            el.style.background = 'rgba(242, 92, 92, 0.06)'
            el.style.borderColor = 'rgba(242, 92, 92, 0.18)'
            el.style.color = '#E07878'
          }}
        >
          Stop
        </button>

        {sessionType === 'break' ? (
          <SkipBreakButton onClick={skipBreak} disabled={isSaving} />
        ) : null}
      </div>
    </>
  )
}

function SkipBreakButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        base,
        'h-[44px] min-w-[100px] rounded-[12px] px-4 text-[13px] sm:h-[48px] sm:min-w-[120px] sm:px-6 sm:text-[14px]'
      )}
      style={{
        background: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.09)',
        color: '#7A7890',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget
        el.style.background = 'rgba(255, 255, 255, 0.07)'
        el.style.borderColor = 'rgba(255, 255, 255, 0.14)'
        el.style.color = '#B0AECB'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget
        el.style.background = 'rgba(255, 255, 255, 0.04)'
        el.style.borderColor = 'rgba(255, 255, 255, 0.09)'
        el.style.color = '#7A7890'
      }}
    >
      Skip Break
    </button>
  )
}
