import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { groupLeaderboardKeys } from '@/lib/queryKeys'
import {
  closeGroupLeaderboard,
  createGroupLeaderboard,
  fetchGroupInvitePreview,
  fetchGroupLeaderboard,
  fetchGroupLeaderboardRanking,
  fetchMyGroupLeaderboards,
  joinGroupLeaderboard,
  leaveGroupLeaderboard,
  removeGroupLeaderboardMember,
  type CreateGroupLeaderboardInput,
} from '@/lib/supabase/queries/groupLeaderboards'

function useInvalidateGroups() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: groupLeaderboardKeys.all })
}

export function useMyGroupLeaderboards() {
  return useQuery({ queryKey: groupLeaderboardKeys.list(), queryFn: fetchMyGroupLeaderboards })
}

export function useGroupLeaderboard(id: string) {
  return useQuery({
    queryKey: groupLeaderboardKeys.detail(id),
    queryFn: () => fetchGroupLeaderboard(id),
    enabled: !!id,
  })
}

export function useGroupLeaderboardRanking(id: string) {
  return useQuery({
    queryKey: groupLeaderboardKeys.ranking(id),
    queryFn: () => fetchGroupLeaderboardRanking(id),
    enabled: !!id,
    refetchInterval: 60_000,
  })
}

export function useGroupInvitePreview(code: string) {
  return useQuery({
    queryKey: groupLeaderboardKeys.invite(code),
    queryFn: () => fetchGroupInvitePreview(code),
    enabled: !!code,
  })
}

export function useCreateGroupLeaderboard() {
  const invalidate = useInvalidateGroups()
  return useMutation({
    mutationFn: (input: CreateGroupLeaderboardInput) => createGroupLeaderboard(input),
    onSuccess: invalidate,
  })
}

export function useJoinGroupLeaderboard() {
  const invalidate = useInvalidateGroups()
  return useMutation({ mutationFn: joinGroupLeaderboard, onSuccess: invalidate })
}

export function useLeaveGroupLeaderboard() {
  const invalidate = useInvalidateGroups()
  return useMutation({ mutationFn: leaveGroupLeaderboard, onSuccess: invalidate })
}

export function useRemoveGroupLeaderboardMember() {
  const invalidate = useInvalidateGroups()
  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) => removeGroupLeaderboardMember(id, userId),
    onSuccess: invalidate,
  })
}

export function useCloseGroupLeaderboard() {
  const invalidate = useInvalidateGroups()
  return useMutation({ mutationFn: closeGroupLeaderboard, onSuccess: invalidate })
}
