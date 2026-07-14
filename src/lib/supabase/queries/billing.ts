import { supabase } from '@/lib/supabase/client'
import type { Tables } from '@/types/database'

type Subscription = Tables<'subscriptions'>

export async function fetchSubscriptions(userId: string): Promise<Subscription[]> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}
