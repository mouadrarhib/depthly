import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { useAuthStore } from '@/store/authStore'
import { sessionKeys } from '@/lib/queryKeys'
import {
  fetchSessionsByProject,
  fetchSessionsPaginated,
  fetchSessionsForExport,
  updateSessionMetadata,
  setSessionExcluded,
} from '@/lib/supabase/queries/sessions'
import type {
  SessionMetadataInput,
  ExportFilters,
  SessionTypeFilter,
  SessionStatusFilter,
} from '@/lib/supabase/queries/sessions'
import {
  convertSessionsToCSV,
  downloadCSV,
  generateExportFilename,
} from '@/lib/utils/export'

export function useSessionsByProject(projectId: string) {
  return useQuery({
    queryKey: sessionKeys.byProject(projectId),
    queryFn:  () => fetchSessionsByProject(projectId),
    enabled:  !!projectId,
  })
}

export function useSessionsPaginated(page: number, type: SessionTypeFilter = 'focus', status: SessionStatusFilter = 'active') {
  const userId = useAuthStore(s => s.user?.id ?? '')
  return useQuery({
    queryKey: [...sessionKeys.paginated(userId, page, type), status],
    queryFn:  () => fetchSessionsPaginated(userId, page, 20, type, status),
    enabled:  !!userId,
  })
}

export function useUpdateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SessionMetadataInput }) =>
      updateSessionMetadata(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
    },
  })
}

export function useSetSessionExcluded() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, excluded }: { id: string; excluded: boolean }) => setSessionExcluded(id, excluded),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
      qc.invalidateQueries({ queryKey: ['profile'] })
      qc.invalidateQueries({ queryKey: ['goals'] })
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['leaderboard'] })
      qc.invalidateQueries({ queryKey: ['group-leaderboards'] })
    },
  })
}

export function useExportSessions() {
  const userId = useAuthStore(s => s.user?.id ?? '')
  const { mutate: exportSessions, isPending: isExporting } = useMutation({
    mutationFn: (filters: ExportFilters) => fetchSessionsForExport(userId, filters),
    onSuccess: (sessions, filters) => {
      const csv = convertSessionsToCSV(sessions)
      const filename = generateExportFilename(filters.startDate, filters.endDate)
      downloadCSV(csv, filename)
    },
  })
  return { exportSessions, isExporting }
}
