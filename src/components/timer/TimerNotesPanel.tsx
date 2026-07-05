import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

import { useTimerStore } from '@/store/timerStore'
import { useUiStore } from '@/store'
import { Sheet, SheetPortal } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

const SlidePanelContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <SheetPortal>
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed right-0 bottom-0 z-30 w-full sm:w-[300px] outline-none',
        'flex flex-col overflow-y-auto',
        'transition ease-in-out',
        'data-[state=open]:duration-300 data-[state=closed]:duration-300',
        'data-[state=open]:animate-in data-[state=open]:slide-in-from-right',
        'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right',
        className,
      )}
      style={{ top: 56 }}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </SheetPortal>
))
SlidePanelContent.displayName = 'SlidePanelContent'

export function TimerNotesPanel() {
  const isOpen     = useUiStore((s) => s.isLogOpen)
  const closePanel = useUiStore((s) => s.toggleLog)
  const notes      = useTimerStore((s) => s.notes)
  const setNotes   = useTimerStore((s) => s.setNotes)

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) closePanel() }}>
      <SlidePanelContent
        style={{ background: 'var(--color-surface-raised)', borderLeft: '1px solid var(--color-border)' }}
      >
        {/* Header */}
        <div
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            padding:        '18px 24px',
            borderBottom:   '1px solid var(--color-border)',
            flexShrink:     0,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>
            Session Notes
          </span>
          <DialogPrimitive.Close
            style={{
              fontSize: 16, color: 'var(--color-text-faint)', background: 'none',
              border: 'none', cursor: 'pointer', lineHeight: 1, padding: 4,
              display: 'flex', alignItems: 'center',
            }}
            aria-label="Close notes"
          >
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
        </div>

        {/* Body */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
          <p style={{
            fontSize: 11, fontWeight: 500, textTransform: 'uppercase',
            letterSpacing: '0.1em', color: 'var(--color-text-faint)', margin: 0,
          }}>
            Notes
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What are you working on?"
            rows={6}
            style={{
              width:        '100%',
              background:   'var(--color-surface-overlay)',
              border:       '1px solid var(--color-border)',
              borderRadius: 10,
              padding:      '12px 14px',
              fontSize:     13,
              color:        'var(--color-text-muted)',
              resize:       'vertical',
              outline:      'none',
              fontFamily:   'inherit',
              lineHeight:   1.6,
              boxSizing:    'border-box',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(75,158,255,0.5)' }}
            onBlur={(e)  => { e.currentTarget.style.borderColor = 'var(--color-border)'   }}
          />
          <p style={{ fontSize: 11, color: 'var(--color-text-faint)', margin: 0 }}>
            Saved automatically when the session ends.
          </p>
        </div>
      </SlidePanelContent>
    </Sheet>
  )
}
