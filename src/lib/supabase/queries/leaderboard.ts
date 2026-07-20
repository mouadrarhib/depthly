import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type PeriodType = Database['public']['Enums']['period_type']

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
  periodType: PeriodType,
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

async function getFriendsGroupIds(userId: string): Promise<string[]> {
  const { data: followsData, error: followsError } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)
    .eq('status', 'accepted')

  if (followsError) throw followsError

  const followingIds = (followsData ?? []).map((f) => f.following_id)
  return [...new Set([...followingIds, userId])]
}

export async function fetchFriendsRank(
  userId: string,
  periodType: PeriodType,
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

  const userIds = await getFriendsGroupIds(userId)

  const { count, error: countError } = await supabase
    .from('user_stats')
    .select('*', { count: 'exact', head: true })
    .eq('period_type', periodType)
    .eq('period_key', periodKey)
    .in('user_id', userIds)
    .gt('focus_minutes', statsData.focus_minutes)

  if (countError) throw countError

  return {
    rank: (count ?? 0) + 1,
    focus_minutes: statsData.focus_minutes,
  }
}

// Fetched as two separate queries rather than an embedded profiles!inner(...)
// join — that embed drops the whole user_stats row if RLS can't resolve the
// joined profiles row, which silently removed private friends from their own
// Friends leaderboard (same failure mode fixed in fetchPendingFriendRequests).
// A friend's private profile IS readable under RLS (is_connected_via_follows
// covers accepted connections), but a plain .in('id', …) select doesn't
// depend on that working through an inner join to show up.
export async function fetchFriendsLeaderboard(
  userId: string,
  periodType: PeriodType,
  periodKey: string,
): Promise<LeaderboardEntry[]> {
  const userIds = await getFriendsGroupIds(userId)

  const { data: statsData, error: statsError } = await supabase
    .from('user_stats')
    .select('user_id, focus_minutes, session_count')
    .eq('period_type', periodType)
    .eq('period_key', periodKey)
    .in('user_id', userIds)
    .order('focus_minutes', { ascending: false })

  if (statsError) throw statsError
  if (!statsData || statsData.length === 0) return []

  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, profile_slug, current_streak, is_public')
    .in('id', statsData.map((s) => s.user_id))

  if (profilesError) throw profilesError

  const profileById = new Map((profilesData ?? []).map((p) => [p.id, p] as const))

  const entries: LeaderboardEntry[] = []
  for (const row of statsData) {
    const profile = profileById.get(row.user_id)
    if (!profile) continue
    entries.push({
      rank: entries.length + 1,
      user_id: row.user_id,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      profile_slug: profile.profile_slug,
      focus_minutes: row.focus_minutes,
      session_count: row.session_count,
      current_streak: profile.current_streak,
      is_public: profile.is_public,
    })
  }
  return entries
}

export type ProfileSearchResult = {
  id: string
  display_name: string
  avatar_url: string | null
  profile_slug: string
}

export async function searchPublicProfiles(
  query: string,
  excludeUserId: string,
  limit: number = 10,
): Promise<ProfileSearchResult[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const pattern = `%${trimmed}%`

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, profile_slug')
    .eq('is_public', true)
    .neq('id', excludeUserId)
    .or(`display_name.ilike.${pattern},profile_slug.ilike.${pattern}`)
    .order('display_name', { ascending: true })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

export async function unfollowUser(followerId: string, followingId: string): Promise<void> {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId)

  if (error) throw error
}

export type FriendshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'friends'

export async function sendFriendRequest(requesterId: string, targetId: string): Promise<void> {
  const { data: existing, error: existingError } = await supabase
    .from('follows')
    .select('id, follower_id, status')
    .or(
      `and(follower_id.eq.${requesterId},following_id.eq.${targetId}),and(follower_id.eq.${targetId},following_id.eq.${requesterId})`,
    )
    .maybeSingle()

  if (existingError) throw existingError

  if (existing) {
    if (existing.status === 'accepted') {
      throw new Error('You are already friends with this user.')
    }
    if (existing.status === 'pending') {
      throw new Error('A friend request is already pending with this user.')
    }

    // status === 'declined' — reuse the row if it runs the same direction
    // as this request, since the unique(follower_id, following_id)
    // constraint would otherwise reject a fresh insert.
    if (existing.follower_id === requesterId) {
      const { error } = await supabase
        .from('follows')
        .update({ status: 'pending' })
        .eq('id', existing.id)
      if (error) throw error
      return
    }
  }

  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: requesterId, following_id: targetId, status: 'pending' })

  if (error) throw error
}

export async function acceptFriendRequest(
  requestRowId: string,
  currentUserId: string,
  requesterId: string,
): Promise<void> {
  const { error: updateError } = await supabase
    .from('follows')
    .update({ status: 'accepted' })
    .eq('id', requestRowId)
    .eq('following_id', currentUserId)

  if (updateError) throw updateError

  const { error: insertError } = await supabase
    .from('follows')
    .insert({ follower_id: currentUserId, following_id: requesterId, status: 'accepted' })

  if (insertError) {
    // 23505 = unique_violation — the reciprocal row already exists (e.g. an
    // instant-follow row that predates this migration), so it's already
    // mutual and there's nothing to roll back.
    if (insertError.code === '23505') return

    // The Supabase client can't wrap these two calls in one DB transaction
    // (each `.from()` call is its own PostgREST request), so undo the first
    // update by hand rather than leaving a one-directional 'accepted' row
    // with no reciprocal.
    await supabase
      .from('follows')
      .update({ status: 'pending' })
      .eq('id', requestRowId)
      .eq('following_id', currentUserId)

    throw insertError
  }
}

export async function declineFriendRequest(requestRowId: string): Promise<void> {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('id', requestRowId)

  if (error) throw error
}

export type PendingFriendRequest = {
  id: string
  requester_id: string
  display_name: string
  avatar_url: string | null
  profile_slug: string
  created_at: string
}

// Fetched as two separate queries rather than an embedded
// profiles!follows_follower_id_fkey(...) join — PostgREST treats that embed
// as an inner join (follower_id is not null), so if RLS blocked the
// requester's profiles row the *entire* follows row silently vanished from
// the result instead of coming back with a null profile. A plain .in('id', …)
// select against profiles doesn't have that failure mode: each row's
// visibility is independent, so one inaccessible profile can't hide an
// otherwise-valid pending request.
export async function fetchPendingFriendRequests(userId: string): Promise<PendingFriendRequest[]> {
  const { data: followsData, error: followsError } = await supabase
    .from('follows')
    .select('id, follower_id, created_at')
    .eq('following_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (followsError) throw followsError
  if (!followsData || followsData.length === 0) return []

  const requesterIds = [...new Set(followsData.map((f) => f.follower_id))]

  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, profile_slug')
    .in('id', requesterIds)

  if (profilesError) throw profilesError

  const profileById = new Map((profilesData ?? []).map((p) => [p.id, p]))

  return followsData
    .map((row): PendingFriendRequest | null => {
      const profile = profileById.get(row.follower_id)
      if (!profile) return null
      return {
        id: row.id,
        requester_id: row.follower_id,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        profile_slug: profile.profile_slug,
        created_at: row.created_at,
      }
    })
    .filter((r): r is PendingFriendRequest => r !== null)
}

export async function fetchPendingFriendRequestsCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', userId)
    .eq('status', 'pending')

  if (error) throw error
  return count ?? 0
}

export async function fetchFriendshipStatus(
  userId: string,
  otherUserId: string,
): Promise<FriendshipStatus> {
  const { data, error } = await supabase
    .from('follows')
    .select('follower_id, following_id, status')
    .or(
      `and(follower_id.eq.${userId},following_id.eq.${otherUserId}),and(follower_id.eq.${otherUserId},following_id.eq.${userId})`,
    )

  if (error) throw error
  const rows = data ?? []

  if (rows.some((r) => r.status === 'accepted')) return 'friends'
  if (rows.some((r) => r.follower_id === userId && r.status === 'pending')) return 'pending_sent'
  if (rows.some((r) => r.follower_id === otherUserId && r.status === 'pending')) return 'pending_received'
  return 'none'
}
