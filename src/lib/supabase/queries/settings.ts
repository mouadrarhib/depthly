import { FunctionsHttpError } from '@supabase/supabase-js'

import { supabase } from '@/lib/supabase/client'
import { toAppError } from '@/lib/supabase/errors'
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

  if (error) throw toAppError(error)
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

  if (error) throw toAppError(error)
  return updated
}

export async function updateProfile(
  _userId: string,
  data: UpdateProfileInput,
): Promise<ProfileRow> {
  const { data: updated, error } = await supabase.rpc('update_my_profile', {
    p_patch: data,
  })

  if (error) throw toAppError(error)
  if (!updated) throw new Error('Profile was not updated')
  return updated
}

export async function checkSlugAvailable(slug: string, currentUserId: string): Promise<boolean> {
  void currentUserId
  const { data, error } = await supabase.rpc('is_profile_slug_available', {
    p_slug: slug,
  })

  if (error) throw toAppError(error)
  return data
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

type DeleteAccountResponse = {
  success: boolean
}

async function extractFunctionErrorMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json()
      if (typeof body?.error === 'string') return body.error
    } catch {
      // The response was not JSON; use the generic fallback below.
    }
  }

  return error instanceof Error
    ? error.message
    : 'Your account could not be deleted. Please try again.'
}

// The Edge Function authenticates the caller, cancels renewable billing,
// removes avatar objects, and hard-deletes the Supabase Auth identity. The
// user id is intentionally not sent by the client.
export async function deleteAccount(confirmation: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke<DeleteAccountResponse>(
    'delete-account',
    { body: { confirmation } },
  )

  if (error || !data?.success) {
    throw new Error(await extractFunctionErrorMessage(
      error ?? new Error('Your account could not be deleted. Please try again.'),
    ))
  }
}
