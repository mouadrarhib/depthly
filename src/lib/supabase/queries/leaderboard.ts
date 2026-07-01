import { supabase } from '@/lib/supabase/client'

export type PublicProfile = {
  id: string
  display_name: string
  avatar_url: string | null
  profile_slug: string
  is_public: boolean
  member_since: string
  current_streak: number
  longest_streak: number
  total_focus_minutes: number
  total_sessions: number
  show_heatmap_on_profile: boolean
}

export async function fetchProfileBySlug(slug: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, display_name, avatar_url, profile_slug, is_public, member_since, current_streak, longest_streak, total_focus_minutes, total_sessions, show_heatmap_on_profile',
    )
    .eq('profile_slug', slug)
    .maybeSingle()

  if (error) throw error
  return data as PublicProfile | null
}

export async function fetchPublicHeatmap(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<Array<{ date: string; focus_minutes: number }>> {
  const { data, error } = await supabase
    .from('daily_summaries')
    .select('date, focus_minutes')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  if (error) throw error
  return data ?? []
}

export type LeaderboardEntry = {
  rank: number
  user_id: string
  display_name: string
  avatar_url: string | null
  profile_slug: string
  focus_minutes: number
  session_count: number
  current_streak: number
  is_public: boolean
}

type RawPeriodRow = {
  user_id: string
  focus_minutes: number
  session_count: number
  profiles: {
    display_name: string
    avatar_url: string | null
    profile_slug: string
    current_streak: number
    is_public: boolean
  }
}

function toEntry(row: RawPeriodRow, rank: number): LeaderboardEntry {
  return {
    rank,
    user_id: row.user_id,
    display_name: row.profiles.display_name,
    avatar_url: row.profiles.avatar_url,
    profile_slug: row.profiles.profile_slug,
    focus_minutes: row.focus_minutes,
    session_count: row.session_count,
    current_streak: row.profiles.current_streak,
    is_public: row.profiles.is_public,
  }
}

export async function fetchGlobalLeaderboard(
  periodType: 'yearly' | 'monthly' | 'weekly' | 'daily',
  periodKey: string,
  limit: number = 50,
): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('user_stats')
    .select(
      'user_id, focus_minutes, session_count, profiles!inner(display_name, avatar_url, profile_slug, current_streak, is_public)',
    )
    .eq('period_type', periodType)
    .eq('period_key', periodKey)
    .eq('profiles.is_public', true)
    .order('focus_minutes', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data as unknown as RawPeriodRow[]).map((row, i) => toEntry(row, i + 1))
}

export async function fetchAllTimeLeaderboard(limit: number = 50): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, display_name, avatar_url, profile_slug, total_focus_minutes, total_sessions, current_streak, is_public',
    )
    .eq('is_public', true)
    .order('total_focus_minutes', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []).map((row, i) => ({
    rank: i + 1,
    user_id: row.id,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    profile_slug: row.profile_slug,
    focus_minutes: row.total_focus_minutes,
    session_count: row.total_sessions,
    current_streak: row.current_streak,
    is_public: row.is_public,
  }))
}

export async function fetchUserRank(
  userId: string,
  periodType: string,
  periodKey: string,
): Promise<{ rank: number; focus_minutes: number } | null> {
  const { data: statsData, error: statsError } = await supabase
    .from('user_stats')
    .select('focus_minutes')
    .eq('user_id', userId)
    .eq('period_type', periodType)
    .eq('period_key', periodKey)
    .maybeSingle()

  if (statsError) throw statsError
  if (!statsData) return null

  const { count, error: countError } = await supabase
    .from('user_stats')
    .select('*, profiles!inner(is_public)', { count: 'exact', head: true })
    .eq('period_type', periodType)
    .eq('period_key', periodKey)
    .eq('profiles.is_public', true)
    .gt('focus_minutes', statsData.focus_minutes)

  if (countError) throw countError

  return {
    rank: (count ?? 0) + 1,
    focus_minutes: statsData.focus_minutes,
  }
}

export async function fetchFriendsLeaderboard(
  userId: string,
  periodType: string,
  periodKey: string,
): Promise<LeaderboardEntry[]> {
  const { data: followsData, error: followsError } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)

  if (followsError) throw followsError

  const followingIds = (followsData ?? []).map((f) => f.following_id)
  const userIds = [...new Set([...followingIds, userId])]

  const { data, error } = await supabase
    .from('user_stats')
    .select(
      'user_id, focus_minutes, session_count, profiles!inner(display_name, avatar_url, profile_slug, current_streak, is_public)',
    )
    .eq('period_type', periodType)
    .eq('period_key', periodKey)
    .in('user_id', userIds)
    .order('focus_minutes', { ascending: false })

  if (error) throw error
  return (data as unknown as RawPeriodRow[]).map((row, i) => toEntry(row, i + 1))
}

export async function fetchFollowStatus(
  followerId: string,
  followingId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle()

  if (error) throw error
  return data !== null
}

export async function followUser(followerId: string, followingId: string): Promise<void> {
  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: followerId, following_id: followingId })

  // 23505 = unique_violation — already following, safe to ignore
  if (error && error.code !== '23505') throw error
}

export async function unfollowUser(followerId: string, followingId: string): Promise<void> {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId)

  if (error) throw error
}
