import { useSaveToastStore } from '@/store/timerStore'

export function TimerStatusToast() {
  const message = useSaveToastStore((state) => state.message)
  if (!message) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-8 left-1/2 z-[200] max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-[10px] border border-depth-border bg-depth-surface px-[18px] py-[10px] text-center text-[13px] font-medium text-ink-primary shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
    >
      {message}
    </div>
  )
}
