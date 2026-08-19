import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type TimerMode      = 'pomodoro' | 'custom' | 'free'
type SessionType    = 'focus' | 'break'
type PomodoroPreset = '25/5' | '50/10' | '90/20' | 'custom'

const PRESETS: Record<PomodoroPreset, { focus: number; break: number }> = {
  '25/5':   { focus: 25 * 60, break:  5 * 60 },
  '50/10':  { focus: 50 * 60, break: 10 * 60 },
  '90/20':  { focus: 90 * 60, break: 20 * 60 },
  'custom': { focus: 25 * 60, break:  5 * 60 },
}

// Sessions shorter than this are too short to be meaningful and are silently
// discarded. Shared by the manual-stop path (useSaveSession) and the
// natural break-completion path below.
export const MIN_SESSION_SECONDS = 60

// ── Save toast — tiny shared store so any surface (TimerControls,
// TimerWidget) can show the same save-confirmation message, regardless of
// which component's save actually fired. ─────────────────────────────────

interface SaveToastState {
  message: string | null
}

let toastClearTimer: ReturnType<typeof setTimeout> | undefined

export const useSaveToastStore = create<SaveToastState>()(() => ({
  message: null,
}))

export function showSaveToast(message: string) {
  clearTimeout(toastClearTimer)
  useSaveToastStore.setState({ message })
  toastClearTimer = setTimeout(() => {
    useSaveToastStore.setState({ message: null })
  }, 3000)
}

interface TimerState {
  activeRunId:       string | null
  isRunning:         boolean
  isPaused:          boolean
  mode:              TimerMode
  sessionType:       SessionType
  elapsed:           number
  duration:          number
  pomodoroPreset:    PomodoroPreset
  focusDuration:     number
  breakDuration:     number
  sessionCount:      number
  selectedProjectId: string | null
  selectedTaskId:    string | null
  sessionTitle:      string
  notes:             string
  autoStartBreak:    boolean
  autoStartFocus:    boolean

  start:              () => void
  pause:              () => void
  resume:             () => void
  stop:               () => void
  reset:              () => void
  startBreak:         (auto?: boolean) => void
  endBreak:           () => void
  skipBreak:          () => void
  tick:               () => void
  setMode:            (mode: TimerMode) => void
  setPreset:          (preset: PomodoroPreset) => void
  setSelectedProject: (id: string | null) => void
  setSelectedTask:    (id: string | null) => void
  setSessionTitle:    (title: string) => void
  setNotes:           (notes: string) => void
  setAutoStartBreak:  (val: boolean) => void
  setAutoStartFocus:  (val: boolean) => void
  restoreRun:         (run: { id: string; type: SessionType; timer_mode: 'pomodoro' | 'free'; target_seconds: number | null; status: string; accumulated_seconds: number; segment_started_at: string | null; project_id: string | null; task_id: string | null; title: string | null; notes: string | null }) => void
}

export const TIMER_SETTINGS_STORAGE_KEY = 'depthly-timer-settings'

export const useTimerStore = create<TimerState>()(persist((set, get) => ({
  activeRunId:       null,
  isRunning:         false,
  isPaused:          false,
  mode:              'pomodoro',
  sessionType:       'focus',
  elapsed:           0,
  duration:          PRESETS['25/5'].focus,
  pomodoroPreset:    '25/5',
  focusDuration:     PRESETS['25/5'].focus,
  breakDuration:     PRESETS['25/5'].break,
  sessionCount:      0,
  selectedProjectId: null,
  selectedTaskId:    null,
  sessionTitle:      '',
  notes:             '',
  autoStartBreak:    false,
  autoStartFocus:    false,

  start: () => set({ isRunning: true, isPaused: false, elapsed: 0, sessionType: 'focus' }),

  pause: () => set({ isRunning: false, isPaused: true }),

  resume: () => set({ isRunning: true, isPaused: false }),

  stop: () => set((s) => ({ isRunning: false, isPaused: false, elapsed: 0, sessionType: 'focus', duration: s.focusDuration })),

  reset: () => set({ isRunning: false, isPaused: false, elapsed: 0 }),

  // Transitions into the break phase. `auto` distinguishes why this was
  // called: true means it's the automatic transition right after a focus
  // session completes, which should honor the autoStartBreak setting (sit
  // idle in the break phase if the user turned auto-start off, instead of
  // running unasked-for). false (the default) means an explicit user action
  // — clicking the Break dot to switch phases manually — which should always
  // start running immediately, same as the Start Focus Session button does.
  startBreak: (auto = false) => {
    const { breakDuration, autoStartBreak } = get()
    set({
      sessionType: 'break',
      elapsed:     0,
      duration:    breakDuration,
      isRunning:   auto ? autoStartBreak : true,
      isPaused:    false,
    })
  },

  // Called when break finishes — returns to focus phase.
  endBreak: () => {
    const { focusDuration, autoStartFocus } = get()

    set({
      sessionType: 'focus',
      elapsed:     0,
      duration:    focusDuration,
      isRunning:   autoStartFocus,
      isPaused:    false,
    })
  },

  skipBreak: () => {
    const { focusDuration } = get()
    set({ isRunning: false, isPaused: false, elapsed: 0, sessionType: 'focus', duration: focusDuration })
  },

  tick: () => set((s) => ({ elapsed: s.elapsed + 1 })),

  setMode: (mode) => {
    const { focusDuration } = get()
    set({
      mode,
      elapsed:     0,
      isRunning:   false,
      isPaused:    false,
      sessionType: 'focus',
      duration:    mode === 'free' ? 0 : focusDuration,
    })
  },

  setPreset: (preset) => {
    const { focus, break: brk } = PRESETS[preset]
    set({
      pomodoroPreset: preset,
      focusDuration:  focus,
      breakDuration:  brk,
      duration:       focus,
      elapsed:        0,
      isRunning:      false,
      isPaused:       false,
      sessionType:    'focus',
    })
  },

  setSelectedProject: (id) => set({ selectedProjectId: id, selectedTaskId: null }),

  setSelectedTask: (id) => set({ selectedTaskId: id }),

  setSessionTitle: (sessionTitle) => set({ sessionTitle }),

  setNotes: (notes) => set({ notes }),

  setAutoStartBreak: (val) => set({ autoStartBreak: val }),

  setAutoStartFocus: (val) => set({ autoStartFocus: val }),

  restoreRun: (run) => {
    const elapsed = run.accumulated_seconds + (run.status === 'running' && run.segment_started_at
      ? Math.max(0, Math.floor((Date.now() - new Date(run.segment_started_at).getTime()) / 1000)) : 0)
    const restoredDuration = run.target_seconds ?? 0
    set({ activeRunId: run.id, sessionType: run.type, mode: run.timer_mode,
      duration: restoredDuration, elapsed, isRunning: run.status === 'running',
      isPaused: run.status === 'paused', selectedProjectId: run.project_id,
      selectedTaskId: run.task_id, sessionTitle: run.title ?? '', notes: run.notes ?? '',
      ...(run.timer_mode !== 'free' && run.type === 'focus' ? { focusDuration: restoredDuration } : {}),
      ...(run.timer_mode !== 'free' && run.type === 'break' ? { breakDuration: restoredDuration } : {}),
    })
  },
}), {
  name: TIMER_SETTINGS_STORAGE_KEY,
  partialize: (state) => ({
    mode: state.mode,
    pomodoroPreset: state.pomodoroPreset,
    focusDuration: state.focusDuration,
    breakDuration: state.breakDuration,
    duration: state.mode === 'free' ? 0 : state.focusDuration,
    autoStartBreak: state.autoStartBreak,
    autoStartFocus: state.autoStartFocus,
  }),
}))
