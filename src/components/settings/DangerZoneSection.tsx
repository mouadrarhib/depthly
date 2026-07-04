import { useState } from 'react'

import { useDeleteAccount } from '@/hooks/useSettings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/Input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

// ── Confirm delete modal ───────────────────────────────────────────────────────

function ConfirmDeleteModal({
  open,
  onClose,
}: {
  open:    boolean
  onClose: () => void
}) {
  const deleteAccount = useDeleteAccount()
  const [typed, setTyped] = useState('')

  const confirmed = typed === 'DELETE'

  function handleConfirm() {
    if (!confirmed) return
    deleteAccount.mutate()
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen && !deleteAccount.isPending) {
      setTyped('')
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-depth-surface border-depth-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-ink-primary">
            Delete your account?
          </DialogTitle>
          <DialogDescription className="text-ink-secondary">
            This will permanently delete your account, all sessions, projects,
            tasks, and analytics data. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <Input
          value={typed}
          onChange={e => setTyped(e.target.value)}
          placeholder='Type DELETE to confirm'
          autoComplete="off"
          spellCheck={false}
        />

        {deleteAccount.isError && (
          <p style={{ fontSize: 12, color: 'var(--color-error)', margin: 0 }}>
            {deleteAccount.error instanceof Error
              ? deleteAccount.error.message
              : 'Something went wrong. Please try again.'}
          </p>
        )}

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={deleteAccount.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!confirmed || deleteAccount.isPending}
            isLoading={deleteAccount.isPending}
            onClick={handleConfirm}
          >
            Delete my account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function DangerZoneSection() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <div style={{
        border:       '1px solid rgba(242, 92, 92, 0.3)',
        background:   'rgba(242, 92, 92, 0.04)',
        borderRadius: 12,
        padding:      24,
      }}>
        <p style={{ fontSize: 15, fontWeight: 500, color: '#F25C5C', marginBottom: 20 }}>
          Danger Zone
        </p>

        {/* Delete account row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <p style={{ fontSize: 14, color: 'var(--color-text)', margin: 0 }}>
              Delete account
            </p>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
              Permanently delete your account and all data. This cannot be undone.
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setModalOpen(true)}
          >
            Delete account
          </Button>
        </div>
      </div>

      <ConfirmDeleteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  )
}
