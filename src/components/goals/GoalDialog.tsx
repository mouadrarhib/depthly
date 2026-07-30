import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { GoalForm } from '@/components/goals/GoalForm'

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
          <DialogTitle className="text-ink-primary">Set a focus goal</DialogTitle>
        </DialogHeader>

        <div className="pt-1">
          <GoalForm onSaved={onClose} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
