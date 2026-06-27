import type { PostgrestError } from '@supabase/supabase-js'

import { supabase } from '@/lib/supabase/client'
import type { Tables } from '@/types/database'

export type Session = Tables<'sessions'>

export interface SaveSessionParams {
  p_user_id:     string
  p_project_id:  string | null
  p_task_id:     string | null
  p_type:        'focus' | 'break'
  p_duration_mins: number
  p_started_at:  string
  p_ended_at:    string
  p_timer_mode:  'pomodoro' | 'custom' | 'free'  // mapped to timer_mode_type in DB
  p_notes:       string | null
}

// save_session is a SECURITY DEFINER RPC that writes to sessions,
// daily_summaries, user_stats, and profiles atomically.
// It is not yet in the generated types — cast rpc to accept it explicitly.
type RpcFn = (
  fn: 'save_session',
  params: SaveSessionParams
) => Promise<{ data: Session | null; error: PostgrestError | null }>

export async function saveSession(params: SaveSessionParams): Promise<Session> {
  const { data, error } = await (supabase.rpc as unknown as RpcFn)(
    'save_session',
    params
  )

  if (error) throw error
  if (!data)  throw new Error('save_session returned no data')

  return data
}
