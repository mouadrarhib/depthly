import { useState } from 'react'

import { Archive, ArrowLeft, CalendarClock, Plus, Users } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { CreateGroupLeaderboardDialog } from '@/components/leaderboard/CreateGroupLeaderboardDialog'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/Spinner'
import { useMyGroupLeaderboards } from '@/hooks/useGroupLeaderboards'
import { useGroupLeaderboardCreationLimit } from '@/hooks/usePlanLimits'
import { PATHS } from '@/routes/paths'

export function GroupLeaderboardsPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const groupsQuery = useMyGroupLeaderboards()
  const navigate = useNavigate()
  const groupLimit = useGroupLeaderboardCreationLimit()
  const groups = groupsQuery.data ?? []
  const atLimit = groupLimit.isAtLimit

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-7">
      <div className="mx-auto max-w-[900px]">
        <Link to={PATHS.leaderboard} className="mb-5 inline-flex items-center gap-2 text-sm text-ink-secondary hover:text-ink-primary"><ArrowLeft /> All leaderboards</Link>
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">Private focus circles</p>
            <h1 className="text-3xl font-semibold tracking-tight text-ink-primary">Your groups</h1>
            <p className="mt-2 max-w-xl text-sm text-ink-secondary">Invite people to focus alongside you. Only trusted timer sessions completed after joining count.</p>
          </div>
          <Button variant="primary" onClick={() => setCreateOpen(true)} disabled={atLimit}><Plus /> Create leaderboard</Button>
        </div>

        {atLimit ? <div className="mb-4 rounded-lg border border-depth-border bg-depth-raised px-4 py-3 text-sm text-ink-secondary">You’re using all {groupLimit.max} active leaderboard slot{groupLimit.max === 1 ? '' : 's'}. Close one to create another.</div> : null}

        {groupsQuery.isLoading ? <div className="flex justify-center py-20"><Spinner /></div> : groupsQuery.isError ? (
          <div className="rounded-xl border border-depth-border bg-depth-surface p-8 text-center"><p className="text-ink-secondary">Your groups couldn’t be loaded.</p><Button className="mt-4" variant="ghost" onClick={() => { void groupsQuery.refetch() }}>Try again</Button></div>
        ) : groups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-depth-border bg-depth-surface p-10 text-center">
            <Users className="mx-auto mb-4 h-10 w-10 text-ink-muted" />
            <h2 className="text-lg font-medium text-ink-primary">Focus is easier with a circle</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-secondary">Create a private leaderboard, share one invite, and start building momentum together.</p>
            <Button className="mt-5" variant="primary" onClick={() => setCreateOpen(true)}><Plus /> Create your first group</Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {groups.map((group) => (
              <Link key={group.id} to={PATHS.groupLeaderboard(group.id)} className="group rounded-xl border border-depth-border bg-depth-surface p-5 transition-colors hover:border-brand/30 hover:bg-depth-raised">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><h2 className="truncate text-base font-medium text-ink-primary">{group.name}</h2><p className="mt-1 text-xs capitalize text-ink-secondary">{group.period_type} · {group.role === 'creator' ? 'Created by you' : 'Member'}</p></div>
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] ${group.status === 'active' ? 'border-brand/25 bg-brand/10 text-brand' : 'border-depth-border bg-depth-raised text-ink-muted'}`}>{group.status === 'active' ? 'Active' : 'Archived'}</span>
                </div>
                <div className="mt-6 flex items-center justify-between border-t border-depth-border pt-4 text-xs text-ink-secondary">
                  <span className="flex items-center gap-2"><Users /> <span className="font-data">{group.member_count}</span> members</span>
                  <span className="flex items-center gap-2">{group.status === 'active' ? <CalendarClock /> : <Archive />}{group.status === 'active' ? group.current_period_key : group.closed_period_key}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <CreateGroupLeaderboardDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(id) => { setCreateOpen(false); navigate(PATHS.groupLeaderboard(id)) }} />
    </div>
  )
}
