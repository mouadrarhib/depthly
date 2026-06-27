import { supabase } from '@/lib/supabase/client'
import type { Tables } from '@/types/database'

export type Project = Tables<'projects'>

export const projectKeys = {
  all:    ['projects']                    as const,
  active: ['projects', 'active']         as const,
}

export async function fetchActiveProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('is_archived', false)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data
}
