import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { useAuthStore } from '@/store/authStore'
import { projectKeys } from '@/lib/queryKeys'
import {
  fetchProjects,
  fetchArchivedProjects,
  fetchProjectById,
  getProjectStats,
  createProject,
  updateProject,
  deleteProject,
} from '@/lib/supabase/queries/projects'
import type { CreateProjectInput, UpdateProjectInput } from '@/lib/supabase/queries/projects'

export function useProjects() {
  const userId = useAuthStore(s => s.user?.id ?? '')
  return useQuery({
    queryKey: projectKeys.active,
    queryFn:  () => fetchProjects(userId),
    enabled:  !!userId,
  })
}

export function useArchivedProjects() {
  const userId = useAuthStore(s => s.user?.id ?? '')
  return useQuery({
    queryKey: projectKeys.archived,
    queryFn:  () => fetchArchivedProjects(userId),
    enabled:  !!userId,
  })
}

export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn:  () => fetchProjectById(id),
    enabled:  !!id,
  })
}

export function useProjectStats(id: string) {
  return useQuery({
    queryKey: projectKeys.stats(id),
    queryFn:  () => getProjectStats(id),
    enabled:  !!id,
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateProjectInput) => createProject(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.active })
    },
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectInput }) =>
      updateProject(id, data),
    onSuccess: (_result, { id }) => {
      qc.invalidateQueries({ queryKey: projectKeys.active })
      qc.invalidateQueries({ queryKey: projectKeys.detail(id) })
    },
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.active })
    },
  })
}

export function useArchiveProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => updateProject(id, { is_archived: true }),
    onSuccess: (_result, _id) => {
      qc.invalidateQueries({ queryKey: projectKeys.active })
      qc.invalidateQueries({ queryKey: projectKeys.archived })
    },
  })
}
