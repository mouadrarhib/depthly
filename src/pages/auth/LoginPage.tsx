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

  const handleSubmit = async () => {
    setIsLoading(true)
    setError(null)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
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
