import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { supabase } from '@/lib/supabase/client'
import { PATHS } from '@/routes/paths'
import { Button, Input } from '@/components/ui'

export function ResetPasswordPage() {
  const navigate = useNavigate()

  const [password,    setPassword]    = useState('')
  const [isLoading,   setIsLoading]   = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [isReady,     setIsReady]     = useState(false)

  // Supabase fires PASSWORD_RECOVERY once it has exchanged the token from the URL.
  // We wait for this before letting the user submit, so updateUser() has a valid session.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setIsReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async () => {
    setIsLoading(true)
    setError(null)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setIsLoading(false)
      return
    }

    navigate(PATHS.login, { replace: true })
  }

  if (!isReady) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl text-text">Verifying link…</h1>
        <p className="text-sm text-text-muted">Hang on while we validate your reset link.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl text-text">Set new password</h1>
        <p className="text-sm text-text-muted">Choose a strong password for your account.</p>
      </div>

      <div className="space-y-4">
        <Input
          label="New password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min. 8 characters"
          autoComplete="new-password"
        />

        {error ? <p className="text-sm text-feedback-error">{error}</p> : null}

        <Button className="w-full" isLoading={isLoading} onClick={handleSubmit}>
          Update password
        </Button>
      </div>
    </div>
  )
}
