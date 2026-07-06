import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type UserPreferencesRow = Database['public']['Tables']['user_preferences']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']

export type UpdatePreferencesInput = {
  timer_default_mode?: 'pomodoro' | 'free'
  pomodoro_focus_mins?: number
  pomodoro_break_mins?: number
  auto_start_break?: boolean
  auto_start_focus?: boolean
  sound_enabled?: boolean
  sound_option?: string
  daily_reminder_enabled?: boolean
  daily_reminder_time?: string | null
  streak_reminder_enabled?: boolean
  theme?: 'dark' | 'light'
}

export type UpdateProfileInput = {
  display_name?: string
  profile_slug?: string
  is_public?: boolean
  show_heatmap_on_profile?: boolean
}

export async function fetchUserPreferences(userId: string): Promise<UserPreferencesRow> {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) throw error
  return data
}

export async function updateUserPreferences(
  userId: string,
  data: UpdatePreferencesInput,
): Promise<UserPreferencesRow> {
  const { data: updated, error } = await supabase
    .from('user_preferences')
    .update(data)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw error
  return updated
}

export async function updateProfile(
  userId: string,
  data: UpdateProfileInput,
): Promise<ProfileRow> {
  const { data: updated, error } = await supabase
    .from('profiles')
    .update(data)
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return updated
}

export async function checkSlugAvailable(slug: string, currentUserId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('profile_slug', slug)
    .neq('id', currentUserId)
    .maybeSingle()

  if (error) throw error
  return data === null
}

// NOTE: email change confirmation is
// disabled until custom SMTP is configured
// Users should be warned change takes
// effect immediately without confirmation
export async function updateEmail(newEmail: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ email: newEmail })
  if (error) throw error
}

export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

// Full deletion requires a Supabase Edge Function with service role key.
// This deletes the profile row (cascades to all user data via FK) and signs out.
export async function deleteAccount(userId: string): Promise<void> {
  const { error: deleteError } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId)

  if (deleteError) throw deleteError

  const { error: signOutError } = await supabase.auth.signOut()
  if (signOutError) throw signOutError
}
