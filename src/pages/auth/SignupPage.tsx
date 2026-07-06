import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { supabase } from '@/lib/supabase/client'
import { PATHS } from '@/routes/paths'
import { Button, GoogleButton, Input } from '@/components/ui'

export function SignupPage() {
  const navigate = useNavigate()

  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const handleSubmit = async () => {
    setIsLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/email-confirmed`,
      },
    })

    if (error) {
      setError(error.message)
      setIsLoading(false)
      return
    }

    navigate(PATHS.dashboard, { replace: true, state: { fromAuth: true } })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl text-text">Create account</h1>
        <p className="text-sm text-text-muted">
          Already have an account?{' '}
          <Link to={PATHS.login} className="text-brand hover:underline">
            Sign in
          </Link>
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
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min. 8 characters"
          autoComplete="new-password"
        />

        {error ? <p className="text-sm text-feedback-error">{error}</p> : null}

        <Button
          className="w-full"
          isLoading={isLoading}
          onClick={handleSubmit}
        >
          Create account
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <hr className="flex-1 border-border" />
        <span className="text-xs text-text-muted">or</span>
        <hr className="flex-1 border-border" />
      </div>

      <GoogleButton label="Sign up with Google" />
    </div>
  )
}
