export const projectKeys = {
  all:      ['projects'] as const,
  active:   ['projects', 'active'] as const,
  archived: ['projects', 'archived'] as const,
  detail:   (id: string) => ['projects', id] as const,
  stats:    (id: string) => ['projects', id, 'stats'] as const,
}

export const sessionKeys = {
  paginated: (userId: string, page: number) =>
             ['sessions', 'paginated', userId, page] as const,
  byProject: (id: string) => ['sessions', 'project', id] as const,
}

export const taskKeys = {
  all:       ['tasks'] as const,
  byProject: (projectId: string) => ['tasks', 'project', projectId] as const,
  detail:    (id: string) => ['tasks', id] as const,
}

export const goalKeys = {
  detail: (userId: string) => ['goals', userId] as const,
}

export const leaderboardKeys = {
  global:       (period: string, key: string) =>
                ['leaderboard', 'global', period, key] as const,
  allTime:      () =>
                ['leaderboard', 'all-time'] as const,
  friends:      (userId: string, period: string, key: string) =>
                ['leaderboard', 'friends', userId, period, key] as const,
  userRank:     (userId: string, period: string, key: string) =>
                ['leaderboard', 'rank', userId, period, key] as const,
  followStatus: (followerId: string, followingId: string) =>
                ['leaderboard', 'follow', followerId, followingId] as const,
}

export const analyticsKeys = {
  profile:        (userId: string) =>
                  ['analytics', 'profile', userId] as const,
  daily:          (userId: string, date: string) =>
                  ['analytics', 'daily', userId, date] as const,
  dailyRange:     (userId: string, start: string, end: string) =>
                  ['analytics', 'daily-range', userId, start, end] as const,
  sessionsForDay: (userId: string, date: string) =>
                  ['analytics', 'sessions-day', userId, date] as const,
  userStats:      (userId: string, type: string, key: string) =>
                  ['analytics', 'stats', userId, type, key] as const,
  userStatsRange: (userId: string, type: string, keys: string[]) =>
                  ['analytics', 'stats-range', userId, type, ...keys] as const,
}
