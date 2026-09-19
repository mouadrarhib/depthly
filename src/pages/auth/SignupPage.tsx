import { type FormEvent, useState } from 'react'

import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { Button, GoogleButton, Input } from '@/components/ui'
import { authPath, safeAuthNext } from '@/lib/authRedirect'
import { supabase } from '@/lib/supabase/client'
import { PATHS } from '@/routes/paths'

export function SignupPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const next = safeAuthNext(searchParams.get('next'))

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    // Email confirmation is disabled in Supabase, so signUp() returns a
    // session immediately — no "check your email" step needed.
    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setError(error.message)
      setIsLoading(false)
      return
    }

    navigate(next, { replace: true, state: { fromAuth: next === PATHS.dashboard } })
  }

  return (
    <div>
      <div>
        <h1 className="text-[32px] font-medium leading-tight tracking-[-0.035em] text-ink-primary sm:text-[36px]">
          Start focusing
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink-secondary">
          Already have an account?{' '}
          <Link
            to={authPath(PATHS.login, next)}
            className="font-medium text-brand underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-8">
        <GoogleButton label="Continue with Google" redirectPath={next} />
      </div>

      <div className="my-7 flex items-center gap-4" aria-hidden="true">
        <span className="h-px flex-1 bg-depth-border" />
        <span className="text-[11px] uppercase tracking-[0.12em] text-ink-muted">or use email</span>
        <span className="h-px flex-1 bg-depth-border" />
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
          className="h-11 rounded-lg border-depth-border bg-depth-surface px-3.5 text-ink-primary placeholder:text-ink-muted"
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min. 8 characters"
          autoComplete="new-password"
          minLength={8}
          required
          hint="Use at least 8 characters."
          className="h-11 rounded-lg border-depth-border bg-depth-surface px-3.5 text-ink-primary placeholder:text-ink-muted"
        />

        {error ? (
          <p
            role="alert"
            className="border-feedback-error/25 bg-feedback-error/10 rounded-lg border px-3.5 py-3 text-sm leading-5 text-feedback-error"
          >
            {error}
          </p>
        ) : null}

        <Button type="submit" className="w-full" isLoading={isLoading}>
          Create account
        </Button>
      </form>
    </div>
  )
}
