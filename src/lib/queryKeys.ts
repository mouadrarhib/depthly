export const projectKeys = {
  all:      ['projects'] as const,
  active:   ['projects', 'active'] as const,
  archived: ['projects', 'archived'] as const,
  detail:   (id: string) => ['projects', id] as const,
  stats:    (id: string) => ['projects', id, 'stats'] as const,
}

export const sessionKeys = {
  byProject: (id: string) => ['sessions', 'project', id] as const,
}

export const taskKeys = {
  all:       ['tasks'] as const,
  byProject: (projectId: string) => ['tasks', 'project', projectId] as const,
  detail:    (id: string) => ['tasks', id] as const,
}
