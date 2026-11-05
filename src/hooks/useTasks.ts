import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { taskKeys, projectKeys } from '@/lib/queryKeys'
import {
  fetchTasksByProject,
  fetchPlannerTasks,
  fetchSessionMinsByTask,
  createTask,
  updateTask,
  deleteTask,
  duplicateTask,
} from '@/lib/supabase/queries/tasks'
import type { Task, CreateTaskInput, UpdateTaskInput } from '@/lib/supabase/queries/tasks'
import { useAuthStore } from '@/store/authStore'

export function useTasks(projectId: string) {
  return useQuery({
    queryKey: taskKeys.byProject(projectId),
    queryFn: () => fetchTasksByProject(projectId),
    enabled: !!projectId,
  })
}

export function usePlannerTasks() {
  const userId = useAuthStore((s) => s.user?.id ?? '')
  return useQuery({
    queryKey: taskKeys.planner(userId),
    queryFn: () => fetchPlannerTasks(userId),
    enabled: !!userId,
  })
}

export function useTaskSessionMins(projectId: string) {
  return useQuery({
    queryKey: taskKeys.sessionMins(projectId),
    queryFn: () => fetchSessionMinsByTask(projectId),
    enabled: !!projectId,
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTaskInput) => createTask(data),
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: taskKeys.byProject(variables.project_id) })
      qc.invalidateQueries({ queryKey: taskKeys.all })
      qc.invalidateQueries({ queryKey: projectKeys.stats(variables.project_id) })
    },
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; projectId: string; data: UpdateTaskInput }) =>
      updateTask(id, data),
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: taskKeys.all })
      const previous = qc.getQueriesData<Task[]>({
        queryKey: taskKeys.all,
        predicate: (query) => query.queryKey[1] === 'planner' || query.queryKey[1] === 'project',
      })
      for (const [key, tasks] of previous) {
        if (!tasks) continue
        qc.setQueryData<Task[]>(
          key,
          tasks.map((task) => (task.id === id ? { ...task, ...data } : task))
        )
      }
      return { previous }
    },
    onError: (_error, _variables, context) => {
      context?.previous.forEach(([key, tasks]) => qc.setQueryData(key, tasks))
    },
    onSuccess: (_result, { projectId }) => {
      qc.invalidateQueries({ queryKey: taskKeys.byProject(projectId) })
      qc.invalidateQueries({ queryKey: taskKeys.all })
    },
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; projectId: string }) => deleteTask(id),
    onSuccess: (_result, { projectId }) => {
      qc.invalidateQueries({ queryKey: taskKeys.byProject(projectId) })
      qc.invalidateQueries({ queryKey: taskKeys.all })
      qc.invalidateQueries({ queryKey: projectKeys.stats(projectId) })
    },
  })
}

export function useDuplicateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => duplicateTask(id),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: taskKeys.byProject(result.project_id) })
      qc.invalidateQueries({ queryKey: taskKeys.all })
    },
  })
}

type KanbanReorderItem = { id: string; kanban_order: number; status?: string }

export function useReorderKanban(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (updates: KanbanReorderItem[]) =>
      Promise.all(
        updates.map(({ id, kanban_order, status }) =>
          updateTask(id, {
            kanban_order,
            ...(status !== undefined && {
              status: status as UpdateTaskInput['status'],
            }),
          })
        )
      ),
    onMutate: async (updates) => {
      await qc.cancelQueries({ queryKey: taskKeys.byProject(projectId) })
      const previous = qc.getQueryData<Task[]>(taskKeys.byProject(projectId))
      qc.setQueryData<Task[]>(taskKeys.byProject(projectId), (old = []) =>
        old.map((task) => {
          const hit = updates.find((u) => u.id === task.id)
          if (!hit) return task
          return {
            ...task,
            kanban_order: hit.kanban_order,
            ...(hit.status !== undefined && {
              status: hit.status as 'todo' | 'in_progress' | 'done',
            }),
          }
        })
      )
      return { previous }
    },
    onError: (_err, _updates, context) => {
      if (context?.previous) {
        qc.setQueryData(taskKeys.byProject(projectId), context.previous)
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: taskKeys.byProject(projectId) })
    },
  })
}
