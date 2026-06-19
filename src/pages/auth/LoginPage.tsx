import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { supabase } from '@/lib/supabase/client'
import { PATHS } from '@/routes/paths'
import { Button, Input } from '@/components/ui'

export function LoginPage() {
  const navigate = useNavigate()

  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const handleSubmit = async () => {
    setIsLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setIsLoading(false)
      return
    }

    navigate(PATHS.home, { replace: true })
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
    </div>
  )
}
