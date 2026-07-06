import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { supabase } from '@/lib/supabase/client'
import { PATHS } from '@/routes/paths'
import { useAuthStore } from '@/store'
import { Button, GoogleButton, Input } from '@/components/ui'

export function LoginPage() {
  const navigate = useNavigate()

  const [email,              setEmail]              = useState('')
  const [password,           setPassword]           = useState('')
  const [isLoading,          setIsLoading]          = useState(false)
  const [error,              setError]              = useState<string | null>(null)
  const [unconfirmed,        setUnconfirmed]        = useState(false)
  const [resendLoading,      setResendLoading]      = useState(false)
  const [resendSent,         setResendSent]         = useState(false)

  const handleSubmit = async () => {
    setIsLoading(true)
    setError(null)
    setUnconfirmed(false)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      if (error.message === 'Email not confirmed') {
        setUnconfirmed(true)
      } else {
        setError(error.message)
      }
      setIsLoading(false)
      return
    }

    // signInWithPassword already gives us the signed-in user — write it to the
    // store synchronously so ProtectedRoute sees it on the very next render,
    // instead of racing the async onAuthStateChange listener (which was
    // causing a bounce back to /login before the store had caught up).
    useAuthStore.getState().setUser(data.user)

    navigate(PATHS.dashboard, { replace: true, state: { fromAuth: true } })
  }

  const handleResend = async () => {
    setResendLoading(true)
    await supabase.auth.resend({ type: 'signup', email })
    setResendLoading(false)
    setResendSent(true)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl text-text">Sign in</h1>
        <p className="text-sm text-text-muted">
          Don&apos;t have an account?{' '}
          <Link to={PATHS.signup} className="text-brand hover:underline">
            Sign up
          </Link>
        </p>
        <Link
          to={PATHS.forgotPassword}
          className="text-sm text-text-muted hover:text-text"
        >
          Forgot password?
        </Link>
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
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
        />

        {unconfirmed ? (
          <div className="rounded-md border border-border bg-surface-raised p-3 space-y-2">
            <p className="text-sm text-text">
              Your email address hasn&apos;t been confirmed yet.
            </p>
            <p className="text-sm text-text-muted">
              Check your inbox for the confirmation link we sent when you signed up.
            </p>
            {resendSent ? (
              <p className="text-sm text-feedback-success">
                Confirmation email resent — check your inbox.
              </p>
            ) : (
              <button
                onClick={handleResend}
                disabled={resendLoading}
                className="text-sm text-brand hover:underline disabled:opacity-50"
              >
                {resendLoading ? 'Sending…' : 'Resend confirmation email'}
              </button>
            )}
          </div>
        ) : null}

        {error ? <p className="text-sm text-feedback-error">{error}</p> : null}

        <Button
          className="w-full"
          isLoading={isLoading}
          onClick={handleSubmit}
        >
          Sign in
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <hr className="flex-1 border-border" />
        <span className="text-xs text-text-muted">or</span>
        <hr className="flex-1 border-border" />
      </div>

      <GoogleButton label="Sign in with Google" />
    </div>
  )
}
