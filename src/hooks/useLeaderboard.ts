import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { useAuthStore } from '@/store/authStore'
import { leaderboardKeys } from '@/lib/queryKeys'
import {
  fetchGlobalLeaderboard,
  fetchAllTimeLeaderboard,
  fetchFriendsLeaderboard,
  fetchUserRank,
  fetchFollowStatus,
  followUser,
  unfollowUser,
  fetchProfileBySlug,
  fetchPublicHeatmap,
} from '@/lib/supabase/queries/leaderboard'

export function useGlobalLeaderboard(periodType: string, periodKey: string) {
  const isAllTime = periodType === 'all_time'
  return useQuery({
    queryKey: isAllTime
      ? leaderboardKeys.allTime()
      : leaderboardKeys.global(periodType, periodKey),
    queryFn: isAllTime
      ? () => fetchAllTimeLeaderboard()
      : () => fetchGlobalLeaderboard(
          periodType as 'yearly' | 'monthly' | 'weekly' | 'daily',
          periodKey,
        ),
  })
}

export function useFriendsLeaderboard(periodType: string, periodKey: string) {
  const userId = useAuthStore(s => s.user?.id ?? '')
  return useQuery({
    queryKey: leaderboardKeys.friends(userId, periodType, periodKey),
    queryFn:  () => fetchFriendsLeaderboard(userId, periodType as 'daily' | 'weekly' | 'monthly' | 'yearly', periodKey),
    enabled:  !!userId,
  })
}

export function useUserRank(periodType: string, periodKey: string) {
  const userId = useAuthStore(s => s.user?.id ?? '')
  return useQuery({
    queryKey: leaderboardKeys.userRank(userId, periodType, periodKey),
    queryFn:  () => fetchUserRank(userId, periodType as 'daily' | 'weekly' | 'monthly' | 'yearly', periodKey),
    enabled:  !!userId,
  })
}

export function useFollowStatus(followingId: string) {
  const userId = useAuthStore(s => s.user?.id ?? '')
  return useQuery({
    queryKey: leaderboardKeys.followStatus(userId, followingId),
    queryFn:  () => fetchFollowStatus(userId, followingId),
    enabled:  !!userId && followingId !== userId,
  })
}

export function usePublicProfile(slug: string) {
  return useQuery({
    queryKey: ['profile', 'public', slug],
    queryFn:  () => fetchProfileBySlug(slug),
    enabled:  !!slug,
  })
}

export function usePublicHeatmap(userId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['heatmap', 'public', userId, startDate, endDate],
    queryFn:  () => fetchPublicHeatmap(userId, startDate, endDate),
    enabled:  !!userId,
  })
}

export function useFollowUser() {
  const qc = useQueryClient()
  const userId = useAuthStore(s => s.user?.id ?? '')
  return useMutation({
    mutationFn: (followingId: string) => followUser(userId, followingId),
    onSuccess: (_data, followingId) => {
      qc.invalidateQueries({ queryKey: leaderboardKeys.followStatus(userId, followingId) })
      qc.invalidateQueries({ queryKey: ['leaderboard', 'friends'] })
    },
  })
}

export function useUnfollowUser() {
  const qc = useQueryClient()
  const userId = useAuthStore(s => s.user?.id ?? '')
  return useMutation({
    mutationFn: (followingId: string) => unfollowUser(userId, followingId),
    onSuccess: (_data, followingId) => {
      qc.invalidateQueries({ queryKey: leaderboardKeys.followStatus(userId, followingId) })
      qc.invalidateQueries({ queryKey: ['leaderboard', 'friends'] })
    },
  })
}
