import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { taskKeys } from '@/lib/queryKeys'
import { fetchTaskOccurrences, setTaskOccurrence } from '@/lib/supabase/queries/taskOccurrences'
import type { OccurrenceState, TaskOccurrence } from '@/lib/supabase/queries/taskOccurrences'
import { useAuthStore } from '@/store/authStore'

export function useTaskOccurrences(start: string, end: string) {
  const userId = useAuthStore((state) => state.user?.id ?? '')
  return useQuery({
    queryKey: taskKeys.occurrences(userId, start, end),
    queryFn: () => fetchTaskOccurrences(userId, start, end),
    enabled: !!userId,
  })
}

export function useSetTaskOccurrence() {
  const userId = useAuthStore((state) => state.user?.id ?? '')
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { taskId: string; date: string; state: OccurrenceState | 'open' }) =>
      setTaskOccurrence({ ...input, userId }),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: ['task-occurrences', userId] })
      const previous = qc.getQueriesData<TaskOccurrence[]>({
        queryKey: ['task-occurrences', userId],
      })
      for (const [key, rows] of previous) {
        if (!rows) continue
        const [, , start, end] = key
        if (
          typeof start !== 'string' ||
          typeof end !== 'string' ||
          input.date < start ||
          input.date > end
        )
          continue
        const remaining = rows.filter(
          (row) => row.task_id !== input.taskId || row.occurrence_date !== input.date
        )
        if (input.state === 'open') {
          qc.setQueryData(key, remaining)
        } else {
          const old = rows.find(
            (row) => row.task_id === input.taskId && row.occurrence_date === input.date
          )
          const now = new Date().toISOString()
          qc.setQueryData<TaskOccurrence[]>(key, [
            ...remaining,
            {
              id: old?.id ?? `pending:${input.taskId}:${input.date}`,
              task_id: input.taskId,
              user_id: userId,
              occurrence_date: input.date,
              state: input.state,
              completed_at: input.state === 'done' ? now : null,
              created_at: old?.created_at ?? now,
            },
          ])
        }
      }
      return { previous }
    },
    onError: (_error, _input, context) => {
      context?.previous.forEach(([key, rows]) => qc.setQueryData(key, rows))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['task-occurrences', userId] }),
  })
}
