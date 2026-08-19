import { supabase } from '@/lib/supabase/client'

export type GroupLeaderboardPeriod = 'daily' | 'weekly' | 'monthly'
export type GroupLeaderboardStatus = 'active' | 'closed'
export type GroupMemberRole = 'creator' | 'member'

export interface CreateGroupLeaderboardInput {
  name: string
  period: GroupLeaderboardPeriod
  goalMinutes: number | null
  timezone: string
}

export interface GroupLeaderboardSummary {
  id: string
  name: string
  period_type: GroupLeaderboardPeriod
  goal_minutes: number | null
  timezone: string
  invite_code: string
  status: GroupLeaderboardStatus
  owner_id: string
  role: GroupMemberRole
  member_count: number
  closed_period_key: string | null
  closed_at: string | null
  created_at: string
  current_period_key: string
  period_ends_at: string | null
}

export interface GroupInvitePreview {
  leaderboard_id: string
  name: string
  creator_name: string
  period_type: GroupLeaderboardPeriod
  goal_minutes: number | null
  status: GroupLeaderboardStatus
  member_count: number
  member_limit: number
}

export interface GroupLeaderboardRankingEntry {
  rank: number
  user_id: string
  display_name: string
  avatar_url: string | null
  role: GroupMemberRole
  focus_minutes: number
  session_count: number
  joined_at: string
}

function throwError(error: { message: string } | null): void {
  if (error) throw new Error(error.message)
}

export async function createGroupLeaderboard(input: CreateGroupLeaderboardInput): Promise<string> {
  const { data, error } = await supabase.rpc('create_group_leaderboard', {
    p_name: input.name,
    p_period_type: input.period,
    p_goal_minutes: input.goalMinutes,
    p_timezone: input.timezone,
  })
  throwError(error)
  if (!data) throw new Error('Leaderboard was not created')
  return data
}

export async function fetchMyGroupLeaderboards(): Promise<GroupLeaderboardSummary[]> {
  const { data, error } = await supabase.rpc('list_my_group_leaderboards')
  throwError(error)
  return (data ?? []) as GroupLeaderboardSummary[]
}

export async function fetchGroupLeaderboard(id: string): Promise<GroupLeaderboardSummary | null> {
  const { data, error } = await supabase.rpc('get_group_leaderboard', { p_leaderboard_id: id })
  throwError(error)
  return ((data ?? [])[0] ?? null) as GroupLeaderboardSummary | null
}

export async function fetchGroupLeaderboardRanking(id: string): Promise<GroupLeaderboardRankingEntry[]> {
  const { data, error } = await supabase.rpc('get_group_leaderboard_ranking', { p_leaderboard_id: id })
  throwError(error)
  return (data ?? []) as GroupLeaderboardRankingEntry[]
}

export async function fetchGroupInvitePreview(code: string): Promise<GroupInvitePreview | null> {
  const { data, error } = await supabase.rpc('preview_group_leaderboard_invite', { p_invite_code: code })
  throwError(error)
  return ((data ?? [])[0] ?? null) as GroupInvitePreview | null
}

export async function joinGroupLeaderboard(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_group_leaderboard', { p_invite_code: code })
  throwError(error)
  if (!data) throw new Error('Leaderboard was not joined')
  return data
}

export async function leaveGroupLeaderboard(id: string): Promise<void> {
  const { error } = await supabase.rpc('leave_group_leaderboard', { p_leaderboard_id: id })
  throwError(error)
}

export async function removeGroupLeaderboardMember(id: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_group_leaderboard_member', {
    p_leaderboard_id: id,
    p_user_id: userId,
  })
  throwError(error)
}

export async function closeGroupLeaderboard(id: string): Promise<void> {
  const { error } = await supabase.rpc('close_group_leaderboard', { p_leaderboard_id: id })
  throwError(error)
}
