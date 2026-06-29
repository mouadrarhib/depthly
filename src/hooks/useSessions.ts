import { useQuery } from '@tanstack/react-query'

import { sessionKeys } from '@/lib/queryKeys'
import { fetchSessionsByProject } from '@/lib/supabase/queries/sessions'

export function useSessionsByProject(projectId: string) {
  return useQuery({
    queryKey: sessionKeys.byProject(projectId),
    queryFn:  () => fetchSessionsByProject(projectId),
    enabled:  !!projectId,
  })
}
