import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { useAuthStore } from '@/store/authStore'
import { leaderboardKeys } from '@/lib/queryKeys'
import {
  fetchGlobalLeaderboard,
  fetchAllTimeLeaderboard,
  fetchFriendsLeaderboard,
  fetchUserRank,
  fetchFriendsRank,
  unfollowUser,
  fetchProfileBySlug,
  fetchPublicHeatmap,
  searchPublicProfiles,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  fetchPendingFriendRequests,
  fetchPendingFriendRequestsCount,
  fetchFriendshipStatus,
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

export function useFriendsRank(periodType: string, periodKey: string) {
  const userId = useAuthStore(s => s.user?.id ?? '')
  return useQuery({
    queryKey: leaderboardKeys.friendsRank(userId, periodType, periodKey),
    queryFn:  () => fetchFriendsRank(userId, periodType as 'daily' | 'weekly' | 'monthly' | 'yearly', periodKey),
    enabled:  !!userId,
  })
}

export function useSearchProfiles(query: string) {
  const currentUserId = useAuthStore(s => s.user?.id ?? '')
  const trimmed = query.trim()
  return useQuery({
    queryKey: leaderboardKeys.search(trimmed),
    queryFn:  () => searchPublicProfiles(trimmed, currentUserId),
    enabled:  trimmed.length >= 2 && !!currentUserId,
  })
}

export function useFriendshipStatus(otherUserId: string) {
  const userId = useAuthStore(s => s.user?.id ?? '')
  return useQuery({
    queryKey: leaderboardKeys.friendshipStatus(userId, otherUserId),
    queryFn:  () => fetchFriendshipStatus(userId, otherUserId),
    enabled:  !!userId && !!otherUserId && otherUserId !== userId,
  })
}

export function usePendingFriendRequests() {
  const userId = useAuthStore(s => s.user?.id ?? '')
  return useQuery({
    queryKey: leaderboardKeys.pendingRequests(userId),
    queryFn:  () => fetchPendingFriendRequests(userId),
    enabled:  !!userId,
  })
}

export function usePendingFriendRequestsCount() {
  const userId = useAuthStore(s => s.user?.id ?? '')
  return useQuery({
    queryKey:        leaderboardKeys.pendingRequestsCount(userId),
    queryFn:         () => fetchPendingFriendRequestsCount(userId),
    enabled:         !!userId,
    refetchInterval: 60000,
  })
}

export function useSendFriendRequest() {
  const qc = useQueryClient()
  const userId = useAuthStore(s => s.user?.id ?? '')
  return useMutation({
    mutationFn: (targetId: string) => sendFriendRequest(userId, targetId),
    onSuccess: (_data, targetId) => {
      qc.invalidateQueries({ queryKey: leaderboardKeys.friendshipStatus(userId, targetId) })
      qc.invalidateQueries({ queryKey: ['leaderboard', 'friends'] })
    },
  })
}

export function useAcceptFriendRequest() {
  const qc = useQueryClient()
  const userId = useAuthStore(s => s.user?.id ?? '')
  return useMutation({
    mutationFn: ({ requestRowId, requesterId }: { requestRowId: string; requesterId: string }) =>
      acceptFriendRequest(requestRowId, userId, requesterId),
    onSuccess: (_data, { requesterId }) => {
      qc.invalidateQueries({ queryKey: leaderboardKeys.friendshipStatus(userId, requesterId) })
      qc.invalidateQueries({ queryKey: leaderboardKeys.pendingRequests(userId) })
      qc.invalidateQueries({ queryKey: leaderboardKeys.pendingRequestsCount(userId) })
      qc.invalidateQueries({ queryKey: ['leaderboard', 'friends'] })
    },
  })
}

export function useDeclineFriendRequest() {
  const qc = useQueryClient()
  const userId = useAuthStore(s => s.user?.id ?? '')
  return useMutation({
    mutationFn: ({ requestRowId }: { requestRowId: string; requesterId: string }) =>
      declineFriendRequest(requestRowId),
    onSuccess: (_data, { requesterId }) => {
      qc.invalidateQueries({ queryKey: leaderboardKeys.friendshipStatus(userId, requesterId) })
      qc.invalidateQueries({ queryKey: leaderboardKeys.pendingRequests(userId) })
      qc.invalidateQueries({ queryKey: leaderboardKeys.pendingRequestsCount(userId) })
    },
  })
}

export function useUnfriend() {
  const qc = useQueryClient()
  const userId = useAuthStore(s => s.user?.id ?? '')
  return useMutation({
    mutationFn: async (otherUserId: string) => {
      // A mutual friendship is two rows, one per direction — both must go.
      // "delete own" (follower_id = auth.uid()) covers the first; "delete as
      // recipient" (following_id = auth.uid()), added alongside the
      // friend-request migration, covers the second.
      await unfollowUser(userId, otherUserId)
      await unfollowUser(otherUserId, userId)
    },
    onSuccess: (_data, otherUserId) => {
      qc.invalidateQueries({ queryKey: leaderboardKeys.friendshipStatus(userId, otherUserId) })
      qc.invalidateQueries({ queryKey: ['leaderboard', 'friends'] })
    },
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

