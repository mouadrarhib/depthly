import { useState } from 'react'
import { Link } from 'react-router-dom'

import { supabase } from '@/lib/supabase/client'
import { PATHS } from '@/routes/paths'
import { Button, Input } from '@/components/ui'

export function ForgotPasswordPage() {
  const [email,     setEmail]     = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [sent,      setSent]      = useState(false)

  const handleSubmit = async () => {
    setIsLoading(true)
    setError(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${PATHS.resetPassword}`,
    })

    if (error) {
      setError(error.message)
      setIsLoading(false)
      return
    }

    setSent(true)
    setIsLoading(false)
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-2xl text-text">Check your email</h1>
          <p className="text-sm text-text-muted">
            We sent a password reset link to <span className="text-text">{email}</span>.
            It expires in 1 hour.
          </p>
        </div>
        <p className="text-sm text-text-muted">
          Back to{' '}
          <Link to={PATHS.login} className="text-brand hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl text-text">Reset password</h1>
        <p className="text-sm text-text-muted">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      <div className="space-y-4">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
        />

        {error ? <p className="text-sm text-feedback-error">{error}</p> : null}

        <Button className="w-full" isLoading={isLoading} onClick={handleSubmit}>
          Send reset link
        </Button>
      </div>

      <p className="text-sm text-text-muted">
        Back to{' '}
        <Link to={PATHS.login} className="text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
