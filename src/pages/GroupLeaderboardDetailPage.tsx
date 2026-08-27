import { useEffect, useState } from 'react'

import { Archive, ArrowLeft, Clock, Copy, LogOut, Share2, Target, UserMinus, Users } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Spinner } from '@/components/ui/Spinner'
import {
  useCloseGroupLeaderboard,
  useGroupLeaderboard,
  useGroupLeaderboardRanking,
  useLeaveGroupLeaderboard,
  useRemoveGroupLeaderboardMember,
} from '@/hooks/useGroupLeaderboards'
import { formatMinutesToHours } from '@/lib/utils/analytics'
import { PATHS } from '@/routes/paths'
import { useAuthStore } from '@/store/authStore'

function GroupCountdown({ endsAt }: { endsAt: string }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [endsAt])
  const seconds = Math.max(0, Math.floor((new Date(endsAt).getTime() - now) / 1000))
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return <>{days > 0 ? `${days}d ` : ''}{String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(secs).padStart(2, '0')}</>
}

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
}

export function GroupLeaderboardDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const detailQuery = useGroupLeaderboard(id)
  const rankingQuery = useGroupLeaderboardRanking(id)
  const leaveGroup = useLeaveGroupLeaderboard()
  const removeMember = useRemoveGroupLeaderboardMember()
  const closeGroup = useCloseGroupLeaderboard()
  const currentUserId = useAuthStore((state) => state.user?.id ?? '')
  const navigate = useNavigate()
  const [confirmAction, setConfirmAction] = useState<{ type: 'leave' | 'close' | 'remove'; userId?: string; name?: string } | null>(null)
  const [shareMessage, setShareMessage] = useState<string | null>(null)
  const group = detailQuery.data
  const ranking = rankingQuery.data ?? []
  const currentEntry = ranking.find((entry) => entry.user_id === currentUserId)

  if (detailQuery.isLoading || rankingQuery.isLoading) return <div className="flex h-full items-center justify-center"><Spinner /></div>
  if (detailQuery.isError || rankingQuery.isError || !group) return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center"><Users className="h-10 w-10 text-ink-muted" /><h1 className="text-xl text-ink-primary">Leaderboard unavailable</h1><p className="text-sm text-ink-secondary">It may have been closed to you or you may no longer be a member.</p><Button variant="ghost" onClick={() => navigate(PATHS.groupLeaderboards)}>Back to groups</Button></div>
  )

  const isCreator = group.role === 'creator'
  const inviteUrl = `${window.location.origin}${PATHS.joinGroup(group.invite_code)}`
  const shareInvite = async () => {
    try {
      if (navigator.share) await navigator.share({ title: group.name, text: `Join my Depthly focus leaderboard: ${group.name}`, url: inviteUrl })
      else { await navigator.clipboard.writeText(inviteUrl); setShareMessage('Invite copied') }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      try { await navigator.clipboard.writeText(inviteUrl); setShareMessage('Invite copied') }
      catch { setShareMessage('Could not share invite') }
    }
  }
  const copyInvite = async () => {
    try { await navigator.clipboard.writeText(inviteUrl); setShareMessage('Invite copied') }
    catch { setShareMessage('Could not copy invite') }
  }

  const confirm = () => {
    if (!confirmAction) return
    if (confirmAction.type === 'leave') leaveGroup.mutate(id, { onSuccess: () => navigate(PATHS.groupLeaderboards) })
    if (confirmAction.type === 'close') closeGroup.mutate(id, { onSuccess: () => setConfirmAction(null) })
    if (confirmAction.type === 'remove' && confirmAction.userId) removeMember.mutate({ id, userId: confirmAction.userId }, { onSuccess: () => setConfirmAction(null) })
  }
  const actionPending = leaveGroup.isPending || closeGroup.isPending || removeMember.isPending
  const actionError = leaveGroup.error ?? closeGroup.error ?? removeMember.error
  const periodNoun = group.period_type === 'daily' ? 'day' : group.period_type === 'weekly' ? 'week' : 'month'

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-7">
      <div className="mx-auto max-w-[900px]">
        <Link to={PATHS.groupLeaderboards} className="mb-5 inline-flex items-center gap-2 text-sm text-ink-secondary hover:text-ink-primary"><ArrowLeft /> Your groups</Link>

        <section className="overflow-hidden rounded-2xl border border-depth-border bg-depth-surface">
          <div className="border-b border-depth-border p-5 sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="mb-3 flex items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-xs ${group.status === 'active' ? 'border-brand/25 bg-brand/10 text-brand' : 'border-depth-border bg-depth-raised text-ink-muted'}`}>{group.status === 'active' ? 'Active' : 'Archived'}</span><span className="text-xs capitalize text-ink-secondary">{group.period_type} leaderboard</span></div>
                <h1 className="text-3xl font-semibold tracking-tight text-ink-primary">{group.name}</h1>
                <p className="mt-2 text-sm text-ink-secondary">Reset boundary: {group.timezone}</p>
              </div>
              {group.status === 'active' && isCreator ? <div className="flex flex-wrap gap-2"><Button variant="ghost" onClick={copyInvite}><Copy /> Copy invite</Button><Button variant="primary" onClick={shareInvite}><Share2 /> Share invite</Button></div> : null}
            </div>
            {shareMessage ? <p className="mt-3 text-right text-xs text-ink-secondary">{shareMessage}</p> : null}
          </div>

          <div className="grid grid-cols-2 divide-x divide-depth-border sm:grid-cols-4">
            <div className="p-4 sm:p-5"><p className="text-[10px] uppercase tracking-wider text-ink-muted">Members</p><p className="mt-2 font-data text-xl text-ink-primary">{group.member_count}</p></div>
            <div className="p-4 sm:p-5"><p className="text-[10px] uppercase tracking-wider text-ink-muted">Your rank</p><p className="mt-2 font-data text-xl text-brand">{currentEntry ? `#${currentEntry.rank}` : '—'}</p></div>
            <div className="border-t border-depth-border p-4 sm:border-t-0 sm:p-5"><p className="text-[10px] uppercase tracking-wider text-ink-muted">{group.status === 'active' ? 'Period' : 'Final period'}</p><p className="mt-2 font-data text-sm text-ink-primary">{group.current_period_key}</p></div>
            <div className="border-t border-depth-border p-4 sm:border-t-0 sm:p-5"><p className="text-[10px] uppercase tracking-wider text-ink-muted">{group.status === 'active' ? 'Resets in' : 'Closed'}</p><p className="mt-2 font-data text-sm text-ink-primary">{group.status === 'active' && group.period_ends_at ? <GroupCountdown endsAt={group.period_ends_at} /> : group.closed_at ? new Date(group.closed_at).toLocaleDateString() : '—'}</p></div>
          </div>
        </section>

        {group.goal_minutes ? <div className="my-4 flex items-center gap-3 rounded-xl border border-depth-border bg-depth-raised px-4 py-3"><Target className="text-brand" /><p className="text-sm text-ink-secondary">Shared target: <span className="font-data text-ink-primary">{formatMinutesToHours(group.goal_minutes)}</span> per member this {periodNoun}</p></div> : null}

        <section className="mt-4 overflow-hidden rounded-2xl border border-depth-border bg-depth-surface">
          <div className="grid grid-cols-[48px_1fr_auto] items-center border-b border-depth-border px-4 py-3 text-[10px] uppercase tracking-wider text-ink-muted sm:grid-cols-[56px_1fr_160px_120px] sm:px-5"><span>Rank</span><span>Member</span><span className="hidden sm:block">Goal progress</span><span className="text-right">Focus</span></div>
          {ranking.map((entry) => {
            const pct = group.goal_minutes ? Math.min(100, Math.round((entry.focus_minutes / group.goal_minutes) * 100)) : null
            return <div key={entry.user_id} className="grid grid-cols-[48px_1fr_auto] items-center border-b border-depth-border px-4 py-4 last:border-0 sm:grid-cols-[56px_1fr_160px_120px] sm:px-5">
              <span className={`font-data text-base ${entry.user_id === currentUserId ? 'text-brand' : 'text-ink-secondary'}`}>#{entry.rank}</span>
              <div className="flex min-w-0 items-center gap-3">{entry.avatar_url ? <img src={entry.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" /> : <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-depth-raised font-data text-xs text-ink-secondary">{initials(entry.display_name)}</div>}<div className="min-w-0"><p className="truncate text-sm font-medium text-ink-primary">{entry.display_name}{entry.user_id === currentUserId ? ' (You)' : ''}</p><p className="text-xs text-ink-muted">{entry.role === 'creator' ? 'Creator' : `${entry.session_count} session${entry.session_count === 1 ? '' : 's'}`}</p></div></div>
              <div className="hidden pr-6 sm:block">{pct !== null ? <><div className="h-1.5 overflow-hidden rounded-full bg-depth-raised"><div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} /></div><p className="mt-1 font-data text-[10px] text-ink-muted">{pct}%</p></> : <span className="text-xs text-ink-muted">No target</span>}</div>
              <div className="flex items-center justify-end gap-2"><div className="text-right"><p className="font-data text-sm text-ink-primary">{formatMinutesToHours(entry.focus_minutes)}</p>{pct !== null ? <p className="font-data text-[10px] text-ink-muted sm:hidden">{pct}% goal</p> : null}</div>{isCreator && group.status === 'active' && entry.role !== 'creator' ? <button aria-label={`Remove ${entry.display_name}`} onClick={() => setConfirmAction({ type: 'remove', userId: entry.user_id, name: entry.display_name })} className="ml-2 rounded p-1.5 text-ink-muted hover:bg-depth-raised hover:text-feedback-error"><UserMinus /></button> : null}</div>
            </div>
          })}
        </section>

        <div className="mt-5 flex items-center justify-end gap-3">{group.status === 'active' ? isCreator ? <Button variant="danger" onClick={() => setConfirmAction({ type: 'close' })}><Archive /> Close leaderboard</Button> : <Button variant="ghost" onClick={() => setConfirmAction({ type: 'leave' })}><LogOut /> Leave leaderboard</Button> : <><span className="flex items-center gap-2 text-sm text-ink-muted"><Clock /> Final ranking is frozen</span>{!isCreator ? <Button variant="ghost" onClick={() => setConfirmAction({ type: 'leave' })}><LogOut /> Leave</Button> : null}</>}</div>
        {actionError ? <p className="mt-3 text-right text-sm text-feedback-error">{actionError.message}</p> : null}
      </div>

      <ConfirmDialog open={!!confirmAction} onClose={() => setConfirmAction(null)} onConfirm={confirm} isLoading={actionPending} title={confirmAction?.type === 'close' ? 'Close this leaderboard?' : confirmAction?.type === 'remove' ? `Remove ${confirmAction.name ?? 'member'}?` : 'Leave this leaderboard?'} description={confirmAction?.type === 'close' ? 'The current ranking will be frozen permanently. Members can still view it, but nobody can join and it cannot be reopened.' : confirmAction?.type === 'remove' ? 'Their current membership will end and this invite will not let them rejoin.' : 'Your ranking access will end. You can rejoin later if you still have an active invite.'} confirmLabel={confirmAction?.type === 'close' ? 'Close leaderboard' : confirmAction?.type === 'remove' ? 'Remove member' : 'Leave leaderboard'} />
    </div>
  )
}
