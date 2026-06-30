import { supabase } from '@/lib/supabase/client'
import type { Tables } from '@/types/database'

export type Goal = Tables<'goals'>

export type UpdateGoalsInput = {
  daily_goal_minutes?: number | null
  weekly_goal_minutes?: number | null
}

export async function fetchGoals(userId: string): Promise<Goal> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) throw error
  return data
}

export async function updateGoals(userId: string, data: UpdateGoalsInput): Promise<Goal> {
  const { data: updated, error } = await supabase
    .from('goals')
    .update(data)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw error
  return updated
}
