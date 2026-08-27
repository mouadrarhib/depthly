import { Target } from 'lucide-react'

import { GoalForm } from '@/components/goals/GoalForm'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface GoalDialogProps {
  open:    boolean
  onClose: () => void
}

/** Quick-set shortcut for daily/weekly focus goals — same fields as the
 *  Settings page's Focus Goals card, just without leaving the current page. */
export function GoalDialog({ open, onClose }: GoalDialogProps) {
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="bg-depth-surface border-depth-border max-w-md">
        <DialogHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Target size={16} style={{ color: 'var(--color-brand)', flexShrink: 0 }} />
            <DialogTitle className="text-ink-primary">Set a focus goal</DialogTitle>
          </div>
          <DialogDescription style={{ fontSize: 12, marginTop: 2 }}>
            Track how much focus time you're aiming for each day and week.
          </DialogDescription>
        </DialogHeader>

        <div className="pt-2">
          <GoalForm onSaved={onClose} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
