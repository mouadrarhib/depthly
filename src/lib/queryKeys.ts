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
