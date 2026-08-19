import { useEffect, useState } from 'react'
import { Target, Users } from 'lucide-react'

import { useCreateGroupLeaderboard } from '@/hooks/useGroupLeaderboards'
import { usePlan } from '@/hooks/usePlan'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/Input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { GroupLeaderboardPeriod } from '@/lib/supabase/queries/groupLeaderboards'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (id: string) => void
}

export function CreateGroupLeaderboardDialog({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState('')
  const [period, setPeriod] = useState<GroupLeaderboardPeriod>('weekly')
  const [goal, setGoal] = useState('')
  const createGroup = useCreateGroupLeaderboard()
  const { groupLeaderboardLimits } = usePlan()

  useEffect(() => {
    if (!open) return
    setName('')
    setPeriod('weekly')
    setGoal('')
    createGroup.reset()
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const trimmedName = name.trim()
  const goalMinutes = goal === '' ? null : Number(goal)
  const canCreate = trimmedName.length >= 3 && trimmedName.length <= 60
    && (goalMinutes === null || (Number.isInteger(goalMinutes) && goalMinutes > 0))

  const submit = () => {
    if (!canCreate) return
    createGroup.mutate({
      name: trimmedName,
      period,
      goalMinutes,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }, { onSuccess: onCreated })
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) onClose() }}>
      <DialogContent className="border-depth-border bg-depth-surface sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Users className="text-brand" />
            <DialogTitle className="text-ink-primary">Create a focus group</DialogTitle>
          </div>
          <DialogDescription className="text-ink-secondary">
            Everyone competes in the same period using trusted timer sessions completed after they join.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Input label="Leaderboard name" value={name} maxLength={60} onChange={(event) => setName(event.target.value)} placeholder="Evening study circle" />
          <div className="space-y-1.5">
            <label htmlFor="group-period" className="text-sm font-medium text-ink-secondary">Reset period</label>
            <select id="group-period" value={period} onChange={(event) => setPeriod(event.target.value as GroupLeaderboardPeriod)} className="h-10 w-full rounded border border-depth-border bg-depth-raised px-3 text-sm text-ink-primary focus:border-brand focus:outline-none">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <Input label="Focus goal (optional minutes per member)" type="number" min={1} value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="600" hint="The goal tracks progress; it never changes rank order." />
          <div className="flex gap-3 rounded-lg border border-depth-border bg-depth-raised p-3">
            <Target className="mt-0.5 shrink-0 text-brand" />
            <p className="text-xs leading-5 text-ink-secondary">
              Your plan supports {groupLeaderboardLimits.maxActive} active group{groupLeaderboardLimits.maxActive === 1 ? '' : 's'} and {groupLeaderboardLimits.maxMembers} members per group, including you. Reset times use your current timezone.
            </p>
          </div>
          {createGroup.error ? <p className="text-sm text-feedback-error">{createGroup.error.message}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!canCreate} isLoading={createGroup.isPending} onClick={submit}>Create leaderboard</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
