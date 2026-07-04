import { useState } from 'react'

import { useUpdateEmail, useUpdatePassword } from '@/hooks/useSettings'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/Input'

// ── Sub-card wrapper ───────────────────────────────────────────────────────────

function SubCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background:    'var(--color-surface-raised)',
      border:        '1px solid var(--color-border)',
      borderRadius:  12,
      padding:       24,
      display:       'flex',
      flexDirection: 'column',
      gap:           16,
    }}>
      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
        {title}
      </p>
      <div style={{ borderTop: '1px solid var(--color-border)' }} />
      {children}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function AccountSection() {
  const currentEmail = useAuthStore(s => s.user?.email ?? '')

  // Email
  const updateEmail   = useUpdateEmail()
  const [newEmail, setNewEmail]       = useState('')
  const [emailError, setEmailError]   = useState<string | null>(null)

  function handleEmailUpdate() {
    if (!newEmail.trim()) {
      setEmailError('Enter a new email address')
      return
    }
    setEmailError(null)
    updateEmail.mutate(newEmail.trim(), {
      onSuccess: () => setNewEmail(''),
    })
  }

  // Password
  const updatePassword = useUpdatePassword()
  const [newPassword, setNewPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError]     = useState<string | null>(null)

  function handlePasswordUpdate() {
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }
    setPasswordError(null)
    updatePassword.mutate(newPassword, {
      onSuccess: () => {
        setNewPassword('')
        setConfirmPassword('')
      },
    })
  }

  return (
    <div>
      <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-text)', marginBottom: 12 }}>
        Account
      </p>
      <div style={{ borderTop: '1px solid var(--color-border)', marginBottom: 20 }} />

      {/* ── Change email ──────────────────────────────────────────────── */}
      <SubCard title="Change email">
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
          {currentEmail}
        </p>

        <Input
          label="New email"
          type="email"
          value={newEmail}
          onChange={e => { setNewEmail(e.target.value); setEmailError(null) }}
          error={emailError ?? (updateEmail.isError ? String(updateEmail.error) : undefined)}
          placeholder="you@example.com"
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button
            variant="ghost"
            size="sm"
            isLoading={updateEmail.isPending}
            onClick={handleEmailUpdate}
          >
            Update email
          </Button>
          {updateEmail.successMessage && (
            <span style={{ fontSize: 13, color: 'var(--color-brand)' }}>
              {updateEmail.successMessage}
            </span>
          )}
        </div>
      </SubCard>

      <div style={{ height: 16 }} />

      {/* ── Change password ───────────────────────────────────────────── */}
      <SubCard title="Change password">
        <Input
          label="New password"
          type="password"
          value={newPassword}
          onChange={e => { setNewPassword(e.target.value); setPasswordError(null) }}
          placeholder="Min. 8 characters"
        />

        <Input
          label="Confirm password"
          type="password"
          value={confirmPassword}
          onChange={e => { setConfirmPassword(e.target.value); setPasswordError(null) }}
          error={passwordError ?? (updatePassword.isError ? String(updatePassword.error) : undefined)}
          placeholder="Repeat new password"
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button
            variant="ghost"
            size="sm"
            isLoading={updatePassword.isPending}
            onClick={handlePasswordUpdate}
          >
            Update password
          </Button>
          {updatePassword.successMessage && (
            <span style={{ fontSize: 13, color: 'var(--color-success)' }}>
              {updatePassword.successMessage}
            </span>
          )}
        </div>
      </SubCard>
    </div>
  )
}
