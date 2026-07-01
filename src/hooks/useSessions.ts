import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { useAuthStore } from '@/store/authStore'
import { sessionKeys } from '@/lib/queryKeys'
import {
  fetchSessionsByProject,
  fetchSessionsPaginated,
  updateSession,
  deleteSession,
  createManualSession,
} from '@/lib/supabase/queries/sessions'
import type { UpdateSessionInput, CreateManualSessionInput } from '@/lib/supabase/queries/sessions'

export function useSessionsByProject(projectId: string) {
  return useQuery({
    queryKey: sessionKeys.byProject(projectId),
    queryFn:  () => fetchSessionsByProject(projectId),
    enabled:  !!projectId,
  })
}

export function useSessionsPaginated(page: number) {
  const userId = useAuthStore(s => s.user?.id ?? '')
  return useQuery({
    queryKey:         sessionKeys.paginated(userId, page),
    queryFn:          () => fetchSessionsPaginated(userId, page),
    enabled:          !!userId,
    keepPreviousData: true,
  })
}

export function useUpdateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSessionInput }) =>
      updateSession(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
    },
  })
}

export function useDeleteSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteSession(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
    },
  })
}

export function useCreateManualSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateManualSessionInput) => createManualSession(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
    },
  })
}
