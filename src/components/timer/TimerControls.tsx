import { useTimerStore } from '@/store/timerStore'
import { Button } from '@/components/ui'

const primaryStyle: React.CSSProperties = {
  width:        200,
  height:       52,
  borderRadius: 14,
  fontSize:     16,
  fontWeight:   600,
}

const actionStyle: React.CSSProperties = {
  height:       52,
  borderRadius: 14,
  fontSize:     15,
  fontWeight:   500,
  minWidth:     120,
}

export function TimerControls() {
  const { isRunning, isPaused, sessionType, start, pause, resume, stop, skipBreak } =
    useTimerStore()

  const isIdle = !isRunning && !isPaused

  if (isIdle) {
    return (
      <Button
        variant="primary"
        size="lg"
        onClick={start}
        style={primaryStyle}
        className="hover:brightness-110 transition-all"
      >
        Start Focus Session
      </Button>
    )
  }

  if (isPaused) {
    return (
      <div className="flex items-center gap-3">
        <Button variant="primary" size="lg" onClick={resume} style={actionStyle}>
          Resume
        </Button>
        <Button variant="secondary" size="lg" onClick={stop} style={actionStyle}>
          Stop
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="lg" onClick={pause} style={actionStyle}>
        Pause
      </Button>
      <Button variant="secondary" size="lg" onClick={stop} style={actionStyle}>
        Stop
      </Button>
      {sessionType === 'break' ? (
        <Button variant="ghost" size="lg" onClick={skipBreak} style={actionStyle}>
          Skip Break
        </Button>
      ) : null}
    </div>
  )
}
