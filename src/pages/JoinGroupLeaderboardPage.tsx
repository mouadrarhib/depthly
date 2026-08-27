import { CalendarClock, Lock, Target, Users } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/Logo'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/hooks/shared/useAuth'
import { useGroupInvitePreview, useJoinGroupLeaderboard } from '@/hooks/useGroupLeaderboards'
import { authPath } from '@/lib/authRedirect'
import { formatMinutesToHours } from '@/lib/utils/analytics'
import { PATHS } from '@/routes/paths'
import { useAuthStore } from '@/store/authStore'

export function JoinGroupLeaderboardPage() {
  const { code = '' } = useParams<{ code: string }>()
  const previewQuery = useGroupInvitePreview(code)
  const joinGroup = useJoinGroupLeaderboard()
  const { isLoading: authLoading } = useAuth()
  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()
  const preview = previewQuery.data
  const currentPath = PATHS.joinGroup(code)

  if (previewQuery.isLoading || authLoading) return <div className="flex min-h-dvh items-center justify-center bg-depth-bg"><Spinner /></div>

  return (
    <main className="flex min-h-dvh items-center justify-center bg-depth-bg p-4">
      <div className="w-full max-w-md">
        <Link to={PATHS.home} className="mb-8 flex justify-center"><Logo size={32} withWordmark /></Link>
        {previewQuery.isError || !preview ? (
          <div className="rounded-2xl border border-depth-border bg-depth-surface p-8 text-center"><Lock className="mx-auto mb-4 h-9 w-9 text-ink-muted" /><h1 className="text-xl font-semibold text-ink-primary">Invite not found</h1><p className="mt-2 text-sm text-ink-secondary">This link is invalid or no longer available.</p><Button className="mt-5" variant="ghost" onClick={() => { void previewQuery.refetch() }}>Try again</Button></div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-depth-border bg-depth-surface">
            <div className="border-b border-depth-border p-7 text-center"><p className="text-[11px] font-medium uppercase tracking-[0.14em] text-brand">You’re invited</p><h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink-primary">{preview.name}</h1><p className="mt-2 text-sm text-ink-secondary">Created by {preview.creator_name}</p></div>
            <div className="grid grid-cols-2 divide-x divide-depth-border border-b border-depth-border"><div className="p-4 text-center"><CalendarClock className="mx-auto mb-2 text-ink-muted" /><p className="text-xs capitalize text-ink-secondary">{preview.period_type} reset</p></div><div className="p-4 text-center"><Users className="mx-auto mb-2 text-ink-muted" /><p className="font-data text-xs text-ink-secondary">{preview.member_count} / {preview.member_limit} members</p></div></div>
            {preview.goal_minutes ? <div className="flex items-center justify-center gap-2 border-b border-depth-border px-5 py-3 text-sm text-ink-secondary"><Target className="text-brand" /> {formatMinutesToHours(preview.goal_minutes)} target per member</div> : null}
            <div className="p-6">
              {preview.status === 'closed' ? <div className="rounded-lg bg-depth-raised p-3 text-center text-sm text-ink-secondary">This leaderboard is closed and no longer accepts members.</div> : user ? <Button className="w-full" variant="primary" isLoading={joinGroup.isPending} onClick={() => joinGroup.mutate(code, { onSuccess: (id) => navigate(PATHS.groupLeaderboard(id)) })}>Join leaderboard</Button> : <div className="space-y-3"><Button asChild className="w-full" variant="primary"><Link to={authPath(PATHS.signup, currentPath)}>Create account to join</Link></Button><Link to={authPath(PATHS.login, currentPath)} className="block text-center text-sm text-ink-secondary hover:text-ink-primary">Already use Depthly? Sign in</Link></div>}
              {joinGroup.error ? <p className="mt-3 text-center text-sm text-feedback-error">{joinGroup.error.message}</p> : null}
              <p className="mt-4 text-center text-xs leading-5 text-ink-muted">Only trusted focus completed after you join contributes to this private leaderboard.</p>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
