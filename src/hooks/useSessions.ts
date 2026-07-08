import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { useAuthStore } from '@/store/authStore'
import { sessionKeys } from '@/lib/queryKeys'
import {
  fetchSessionsByProject,
  fetchSessionsPaginated,
  fetchSessionsForExport,
  updateSession,
  deleteSession,
  createManualSession,
} from '@/lib/supabase/queries/sessions'
import type {
  UpdateSessionInput,
  CreateManualSessionInput,
  ExportFilters,
  SessionTypeFilter,
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

export function useSessionsPaginated(page: number, type: SessionTypeFilter = 'focus') {
  const userId = useAuthStore(s => s.user?.id ?? '')
  return useQuery({
    queryKey: sessionKeys.paginated(userId, page, type),
    queryFn:  () => fetchSessionsPaginated(userId, page, 20, type),
    enabled:  !!userId,
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
