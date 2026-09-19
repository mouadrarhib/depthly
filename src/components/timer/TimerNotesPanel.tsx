import * as React from 'react'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X, Bold, Italic, List, ListOrdered } from 'lucide-react'

import { useUiStore } from '@/store'
import { useTimerStore } from '@/store/timerStore'

// ── Formatting helpers ────────────────────────────────────────────────────────

function applyWrap(
  ref: React.RefObject<HTMLTextAreaElement>,
  before: string,
  after: string,
  onUpdate: (v: string) => void,
) {
  const el = ref.current
  if (!el) return
  const { selectionStart: s, selectionEnd: e, value } = el
  const sel    = value.slice(s, e)
  const next   = value.slice(0, s) + before + sel + after + value.slice(e)
  onUpdate(next)
  requestAnimationFrame(() => {
    el.focus()
    el.setSelectionRange(s + before.length, s + before.length + sel.length)
  })
}

function applyLinePrefix(
  ref: React.RefObject<HTMLTextAreaElement>,
  prefix: string,
  onUpdate: (v: string) => void,
) {
  const el = ref.current
  if (!el) return
  const { selectionStart: s, value } = el
  const lineStart = value.lastIndexOf('\n', s - 1) + 1
  const next = value.slice(0, lineStart) + prefix + value.slice(lineStart)
  onUpdate(next)
  requestAnimationFrame(() => {
    el.focus()
    el.setSelectionRange(s + prefix.length, s + prefix.length)
  })
}

// ── Formatting toolbar ────────────────────────────────────────────────────────

function FormatToolbar({
  taRef,
  onUpdate,
}: {
  taRef:    React.RefObject<HTMLTextAreaElement>
  onUpdate: (v: string) => void
}) {
  const btnBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, borderRadius: 6, border: 'none',
    background: 'none', cursor: 'pointer', color: '#7A7890', flexShrink: 0,
  }

  const actions = [
    { icon: <Bold size={14} />,        title: 'Bold',           act: () => applyWrap(taRef, '**', '**', onUpdate) },
    { icon: <Italic size={14} />,      title: 'Italic',         act: () => applyWrap(taRef, '_', '_', onUpdate) },
    { icon: <List size={14} />,        title: 'Bullet list',    act: () => applyLinePrefix(taRef, '- ', onUpdate) },
    { icon: <ListOrdered size={14} />, title: 'Numbered list',  act: () => applyLinePrefix(taRef, '1. ', onUpdate) },
  ]

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 2, padding: '6px 8px',
      borderBottom: '1px solid #2E2E38', background: '#1A1A20',
    }}>
      {actions.map(({ icon, title, act }, i) => (
        <button
          key={i}
          type="button"
          title={title}
          style={btnBase}
          onClick={act}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.color = '#E8E6F0'
            ;(e.currentTarget as HTMLButtonElement).style.background = '#222228'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.color = '#7A7890'
            ;(e.currentTarget as HTMLButtonElement).style.background = 'none'
          }}
        >
          {icon}
        </button>
      ))}
    </div>
  )
}

// ── Shared close button ───────────────────────────────────────────────────────

function CloseBtn({ onClose }: { onClose?: () => void }) {
  return (
    <DialogPrimitive.Close
      onClick={onClose}
      className="flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-secondary transition-colors duration-200 hover:bg-depth-raised hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      aria-label="Close"
    >
      <X size={16} />
    </DialogPrimitive.Close>
  )
}

// ── Log panel ─────────────────────────────────────────────────────────────────

export function TimerNotesPanel() {
  const isOpen     = useUiStore((s) => s.isLogOpen)
  const closePanel = useUiStore((s) => s.toggleLog)

  const storedTitle = useTimerStore((s) => s.sessionTitle)
  const storedNotes = useTimerStore((s) => s.notes)
  const setTitle    = useTimerStore((s) => s.setSessionTitle)
  const setNotes    = useTimerStore((s) => s.setNotes)

  const [draftTitle, setDraftTitle] = React.useState(storedTitle)
  const [draftNotes, setDraftNotes] = React.useState(storedNotes)
  const [savedFlash, setSavedFlash] = React.useState(false)
  const taRef = React.useRef<HTMLTextAreaElement>(null)

  // Sync draft when panel opens; auto-commit draft when it closes
  React.useEffect(() => {
    if (isOpen) {
      setDraftTitle(storedTitle)
      setDraftNotes(storedNotes)
      setSavedFlash(false)
    } else {
      // persist any unsaved draft so session save picks it up
      setTitle(draftTitle)
      setNotes(draftNotes)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const isDirty = draftTitle !== storedTitle || draftNotes !== storedNotes

  function handleUpdate() {
    setTitle(draftTitle)
    setNotes(draftNotes)
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 2000)
  }

  const footerLabel = savedFlash
    ? 'Saved'
    : isDirty
    ? 'Unsaved changes'
    : 'No pending changes'

  return (
    <DialogPrimitive.Root
      modal={false}
      open={isOpen}
      onOpenChange={(open) => { if (!open) closePanel() }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          className="fixed bottom-0 right-0 top-14 z-30 flex w-full flex-col border-l border-depth-border bg-depth-surface outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:duration-200 data-[state=closed]:duration-150 sm:w-[400px]"
          style={{
            animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Header */}
          <div className="shrink-0 border-b border-depth-border px-6 py-5">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <DialogPrimitive.Title style={{
                  margin: 0, fontSize: 16, fontWeight: 600,
                  color: '#E8E6F0', letterSpacing: '-0.02em', lineHeight: 1.2,
                }}>
                  Log your session
                </DialogPrimitive.Title>
                <DialogPrimitive.Description style={{
                  margin: '4px 0 0', fontSize: 12, color: '#7A7890', lineHeight: 1.6,
                }}>
                  Add context that will stay with this session.
                </DialogPrimitive.Description>
              </div>
              <CloseBtn />
            </div>
          </div>

          {/* Scrollable body */}
          <div style={{
            flex: 1, overflowY: 'auto',
            padding: 24,
            display: 'flex', flexDirection: 'column', gap: 24,
          }}>

            {/* Session title input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#E8E6F0', letterSpacing: '-0.01em' }}>
                Session title
              </label>
              <input
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="e.g. Deep work on feature X"
                style={{
                  width: '100%', height: 40, boxSizing: 'border-box',
                  background: '#1A1A20', border: '1px solid #2E2E38',
                  borderRadius: 8, padding: '0 14px',
                  fontSize: 13, color: '#E8E6F0', outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(75,158,255,0.5)' }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = '#2E2E38' }}
              />
            </div>

            {/* Notes textarea with format toolbar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#E8E6F0', letterSpacing: '-0.01em' }}>
                Notes
              </label>
              <div
                style={{ border: '1px solid #2E2E38', borderRadius: 8, overflow: 'hidden', background: '#1A1A20' }}
                onFocusCapture={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(75,158,255,0.5)' }}
                onBlurCapture={(e)  => { (e.currentTarget as HTMLDivElement).style.borderColor = '#2E2E38' }}
              >
                <FormatToolbar taRef={taRef} onUpdate={setDraftNotes} />
                <textarea
                  ref={taRef}
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                  placeholder="What are you working on?"
                  style={{
                    display: 'block', width: '100%', minHeight: 160, boxSizing: 'border-box',
                    background: 'transparent', border: 'none', outline: 'none',
                    padding: '12px 14px', fontSize: 13, color: '#E8E6F0',
                    resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6,
                  }}
                />
              </div>
              <p style={{ margin: 0, fontSize: 12, color: '#3D3B4E' }}>
                Saved to the session record when the timer ends.
              </p>
            </div>
          </div>

          {/* Pinned footer */}
          <div style={{
            padding: '14px 24px',
            borderTop: '1px solid #2E2E38',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 12, color: savedFlash ? '#3DD68C' : '#3D3B4E' }}>
              {footerLabel}
            </span>
            <button
              onClick={handleUpdate}
              disabled={!isDirty}
              style={{
                height: 34, padding: '0 20px', borderRadius: 8, border: 'none',
                background: isDirty ? '#4B9EFF' : '#1A1A20',
                color: isDirty ? '#fff' : '#3D3B4E',
                fontSize: 13, fontWeight: 500,
                cursor: isDirty ? 'pointer' : 'default',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              Update
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
