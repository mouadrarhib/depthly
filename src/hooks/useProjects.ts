import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { projectKeys } from '@/lib/queryKeys'
import {
  fetchProjects,
  fetchArchivedProjects,
  fetchProjectById,
  getProjectStats,
  createProject,
  updateProject,
  setProjectArchived,
  deleteProject,
} from '@/lib/supabase/queries/projects'
import type {
  CreateProjectInput,
  Project,
  UpdateProjectInput,
} from '@/lib/supabase/queries/projects'
import { useAuthStore } from '@/store/authStore'

export function useProjects() {
  const userId = useAuthStore((s) => s.user?.id ?? '')
  return useQuery({
    queryKey: projectKeys.active,
    queryFn: () => fetchProjects(userId),
    enabled: !!userId,
  })
}

export function useArchivedProjects() {
  const userId = useAuthStore((s) => s.user?.id ?? '')
  return useQuery({
    queryKey: projectKeys.archived,
    queryFn: () => fetchArchivedProjects(userId),
    enabled: !!userId,
  })
}

export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => fetchProjectById(id),
    enabled: !!id,
  })
}

export function useProjectStats(id: string) {
  return useQuery({
    queryKey: projectKeys.stats(id),
    queryFn: () => getProjectStats(id),
    enabled: !!id,
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
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectInput }) => updateProject(id, data),
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
      qc.invalidateQueries({ queryKey: projectKeys.archived })
    },
  })
}

export function useArchiveProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => setProjectArchived(id, true),
    onMutate: async (id) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: projectKeys.active }),
        qc.cancelQueries({ queryKey: projectKeys.archived }),
      ])
      const active = qc.getQueryData<Project[]>(projectKeys.active)
      const archived = qc.getQueryData<Project[]>(projectKeys.archived)
      const project = active?.find((item) => item.id === id)

      if (project) {
        qc.setQueryData<Project[]>(projectKeys.active, (current = []) =>
          current.filter((item) => item.id !== id)
        )
        qc.setQueryData<Project[]>(projectKeys.archived, (current = []) => [
          { ...project, is_archived: true },
          ...current,
        ])
      }

      return { active, archived }
    },
    onError: (_error, _id, context) => {
      if (context?.active) qc.setQueryData(projectKeys.active, context.active)
      if (context?.archived) qc.setQueryData(projectKeys.archived, context.archived)
    },
    onSettled: (_result, _error, id) => {
      qc.invalidateQueries({ queryKey: projectKeys.active })
      qc.invalidateQueries({ queryKey: projectKeys.archived })
      qc.invalidateQueries({ queryKey: projectKeys.detail(id) })
    },
  })
}

export function useUnarchiveProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => setProjectArchived(id, false),
    onMutate: async (id) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: projectKeys.active }),
        qc.cancelQueries({ queryKey: projectKeys.archived }),
      ])
      const active = qc.getQueryData<Project[]>(projectKeys.active)
      const archived = qc.getQueryData<Project[]>(projectKeys.archived)
      const project = archived?.find((item) => item.id === id)

      if (project) {
        qc.setQueryData<Project[]>(projectKeys.archived, (current = []) =>
          current.filter((item) => item.id !== id)
        )
        qc.setQueryData<Project[]>(projectKeys.active, (current = []) => [
          { ...project, is_archived: false },
          ...current,
        ])
      }

      return { active, archived }
    },
    onError: (_error, _id, context) => {
      if (context?.active) qc.setQueryData(projectKeys.active, context.active)
      if (context?.archived) qc.setQueryData(projectKeys.archived, context.archived)
    },
    onSettled: (_result, _error, id) => {
      qc.invalidateQueries({ queryKey: projectKeys.active })
      qc.invalidateQueries({ queryKey: projectKeys.archived })
      qc.invalidateQueries({ queryKey: projectKeys.detail(id) })
    },
  })
}
