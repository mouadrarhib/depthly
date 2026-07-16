import { create } from 'zustand'

import { saveSession } from '@/lib/supabase/queries/sessions'
import { useAuthStore } from '@/store/authStore'
import { formatPeriodKey } from '@/lib/utils/analytics'

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

// Natural break completion has no React/mutation context to hook into (it's
// triggered from useTimerEffects, not a component) — so it saves directly
// through the RPC wrapper rather than the useMutation-based flow in
// useSaveSession.ts. Break saves don't touch daily_summaries/user_stats (the
// RPC only aggregates focus sessions), so skipping query-cache invalidation
// here only means the recent-sessions list may lag until its next refetch.
async function saveBreakSession(args: {
  elapsed:            number
  selectedProjectId:  string | null
  selectedTaskId:     string | null
  mode:               TimerMode
}) {
  const user = useAuthStore.getState().user
  if (!user) return

  const now       = new Date()
  const startedAt = new Date(now.getTime() - args.elapsed * 1_000)

  try {
    await saveSession({
      p_user_id:       user.id,
      p_project_id:    args.selectedProjectId,
      p_task_id:       args.selectedTaskId,
      p_type:          'break',
      p_duration_mins: Math.round(args.elapsed / 60),
      p_started_at:    startedAt.toISOString(),
      p_ended_at:      now.toISOString(),
      p_timer_mode:    args.mode,
      p_notes:         null,
      p_local_date:    formatPeriodKey(now, 'daily'),
    })
    showSaveToast(`Break saved — ${Math.round(args.elapsed / 60)} minutes`)
  } catch {
    // Best-effort — a failed background break save isn't worth interrupting the user over.
  }
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
  sessionTitle:      string
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
  setSessionTitle:    (title: string) => void
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
  sessionTitle:      '',
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
    const { elapsed, selectedProjectId, selectedTaskId, mode, focusDuration, autoStartFocus } = get()

    if (elapsed >= MIN_SESSION_SECONDS) {
      void saveBreakSession({ elapsed, selectedProjectId, selectedTaskId, mode })
    }

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
}))
