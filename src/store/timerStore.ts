import { create } from 'zustand'

type TimerMode      = 'pomodoro' | 'custom' | 'free'
type SessionType    = 'focus' | 'break'
type PomodoroPreset = '25/5' | '50/10' | '90/20' | 'custom'

const PRESETS: Record<PomodoroPreset, { focus: number; break: number }> = {
  '25/5':   { focus: 25 * 60, break:  5 * 60 },
  '50/10':  { focus: 50 * 60, break: 10 * 60 },
  '90/20':  { focus: 90 * 60, break: 20 * 60 },
  'custom': { focus: 25 * 60, break:  5 * 60 },
}

interface TimerState {
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
  notes:             string
  autoStartBreak:    boolean
  autoStartFocus:    boolean

  start:              () => void
  pause:              () => void
  resume:             () => void
  stop:               () => void
  reset:              () => void
  startBreak:         () => void
  endBreak:           () => void
  skipBreak:          () => void
  tick:               () => void
  setMode:            (mode: TimerMode) => void
  setPreset:          (preset: PomodoroPreset) => void
  setSelectedProject: (id: string | null) => void
  setSelectedTask:    (id: string | null) => void
  setNotes:           (notes: string) => void
  setAutoStartBreak:  (val: boolean) => void
  setAutoStartFocus:  (val: boolean) => void
}

export const useTimerStore = create<TimerState>()((set, get) => ({
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
  notes:             '',
  autoStartBreak:    false,
  autoStartFocus:    false,

  start: () => set({ isRunning: true, isPaused: false, elapsed: 0, sessionType: 'focus' }),

  pause: () => set({ isRunning: false, isPaused: true }),

  resume: () => set({ isRunning: true, isPaused: false }),

  stop: () => set({ isRunning: false, isPaused: false, elapsed: 0, sessionType: 'focus' }),

  reset: () => set({ isRunning: false, isPaused: false, elapsed: 0 }),

  // Called after a focus session is saved — always auto-starts the break.
  startBreak: () => {
    const { breakDuration } = get()
    set({
      sessionType: 'break',
      elapsed:     0,
      duration:    breakDuration,
      isRunning:   true,
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

  setNotes: (notes) => set({ notes }),

  setAutoStartBreak: (val) => set({ autoStartBreak: val }),

  setAutoStartFocus: (val) => set({ autoStartFocus: val }),
}))
