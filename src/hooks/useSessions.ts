import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { useAuthStore } from '@/store/authStore'
import { sessionKeys } from '@/lib/queryKeys'
import {
  fetchSessionsByProject,
  fetchSessionCount,
  fetchSessionsPaginated,
  fetchSessionsForExport,
  updateSessionMetadata,
} from '@/lib/supabase/queries/sessions'
import type {
  SessionMetadataInput,
  ExportFilters,
  SessionPageFilters,
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

export function useSessionCount() {
  const userId = useAuthStore(s => s.user?.id ?? '')
  return useQuery({
    queryKey: sessionKeys.count(userId),
    queryFn: () => fetchSessionCount(userId),
    enabled: !!userId,
  })
}

const DEFAULT_SESSION_PAGE_FILTERS: SessionPageFilters = {
  type: 'focus',
  search: '',
  timezone: 'UTC',
  fromDate: null,
  toDate: null,
  projectId: null,
  minDuration: null,
  maxDuration: null,
}

export function useSessionsPaginated(
  page: number,
  filters: SessionPageFilters = DEFAULT_SESSION_PAGE_FILTERS,
) {
  const userId = useAuthStore(s => s.user?.id ?? '')
  return useQuery({
    queryKey: sessionKeys.paginated(userId, page, filters),
    queryFn:  () => fetchSessionsPaginated(page, filters),
    enabled:  !!userId,
    placeholderData: keepPreviousData,
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
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useExportSessions() {
  const userId = useAuthStore(s => s.user?.id ?? '')
  const { mutate: exportSessions, isPending: isExporting, error } = useMutation({
    mutationFn: (filters: ExportFilters) => fetchSessionsForExport(userId, filters),
    onSuccess: (sessions, filters) => {
      const csv = convertSessionsToCSV(sessions)
      const filename = generateExportFilename(filters.startDate, filters.endDate)
      downloadCSV(csv, filename)
    },
  })
  return { exportSessions, isExporting, exportError: error }
}
