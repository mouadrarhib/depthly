// Permanently deletes the authenticated user's Depthly account.
//
// The caller's identity is derived from their verified Supabase JWT. The
// service-role client exists only inside this function and is used to cancel
// billing, remove owned Storage objects, and hard-delete the Auth user.

import { createClient } from 'npm:@supabase/supabase-js@2.43.5'

type DeletionErrorCode =
  | 'INVALID_CONFIRMATION'
  | 'UNAUTHENTICATED'
  | 'METHOD_NOT_ALLOWED'
  | 'BILLING_CANCELLATION_FAILED'
  | 'STORAGE_CLEANUP_FAILED'
  | 'ACCOUNT_DELETION_FAILED'

type SubscriptionRow = {
  stripe_subscription_id: string
  status: string
  plan_interval: string | null
}

type ProfileBillingRow = {
  plan: string
  plan_interval: string | null
  stripe_subscription_id: string | null
}

type LemonSubscriptionResponse = {
  data?: {
    attributes?: {
      cancelled?: boolean
      status?: string
    }
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const renewableStatuses = ['active', 'trialing', 'past_due', 'unpaid']
const renewableIntervals = ['monthly', 'annual']

class AccountDeletionError extends Error {
  constructor(
    readonly code: DeletionErrorCode,
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function billingFailure(message: string): AccountDeletionError {
  return new AccountDeletionError('BILLING_CANCELLATION_FAILED', 502, message)
}

async function ensureSubscriptionCancelled(
  subscriptionId: string,
  apiKey: string,
): Promise<void> {
  const url = `https://api.lemonsqueezy.com/v1/subscriptions/${subscriptionId}`
  const headers = {
    Accept:          'application/vnd.api+json',
    'Content-Type':  'application/vnd.api+json',
    Authorization:   `Bearer ${apiKey}`,
  }

  // Read before deleting so a retry can recognize a subscription that was
  // cancelled by a previous attempt whose later account-cleanup step failed.
  const lookupResponse = await fetch(url, { headers })
  if (lookupResponse.status === 404) return
  if (!lookupResponse.ok) {
    console.error('Lemon Squeezy subscription lookup failed:', subscriptionId, lookupResponse.status)
    throw billingFailure('We could not verify that your subscription was cancelled. Your account was not deleted.')
  }

  let isAlreadyCancelled = false
  try {
    const lookupBody = await lookupResponse.json() as LemonSubscriptionResponse
    const attributes = lookupBody?.data?.attributes
    isAlreadyCancelled = attributes?.cancelled === true
      || attributes?.status === 'cancelled'
      || attributes?.status === 'expired'
  } catch {
    console.error('Lemon Squeezy subscription lookup returned invalid JSON:', subscriptionId)
    throw billingFailure('We could not verify that your subscription was cancelled. Your account was not deleted.')
  }

  if (isAlreadyCancelled) return

  const cancelResponse = await fetch(url, { method: 'DELETE', headers })
  if (cancelResponse.status === 404) return
  if (!cancelResponse.ok) {
    console.error('Lemon Squeezy subscription cancellation failed:', subscriptionId, cancelResponse.status)
    throw billingFailure('We could not cancel your subscription. Your account was not deleted.')
  }
}

async function cancelRenewableSubscriptions(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
): Promise<void> {
  const [{ data: subscriptions, error: subscriptionsError }, { data: profile, error: profileError }] =
    await Promise.all([
      supabaseAdmin
        .from('subscriptions')
        .select('stripe_subscription_id,status,plan_interval')
        .eq('user_id', userId)
        .in('status', renewableStatuses)
        .in('plan_interval', renewableIntervals),
      supabaseAdmin
        .from('profiles')
        .select('plan,plan_interval,stripe_subscription_id')
        .eq('id', userId)
        .maybeSingle(),
    ])

  if (subscriptionsError || profileError) {
    console.error('Failed to read billing state before account deletion:', subscriptionsError ?? profileError)
    throw billingFailure('We could not verify your billing status. Your account was not deleted.')
  }

  const rows = (subscriptions ?? []) as SubscriptionRow[]
  const billingProfile = profile as ProfileBillingRow | null
  const subscriptionIds = new Set(rows.map(row => row.stripe_subscription_id))

  // profiles stores the fast-read subscription id. Include it as a fallback
  // for older accounts whose subscriptions audit row is missing.
  if (
    billingProfile?.plan === 'pro'
    && billingProfile.stripe_subscription_id
    && renewableIntervals.includes(billingProfile.plan_interval ?? '')
    && !billingProfile.stripe_subscription_id.startsWith('lifetime_order_')
  ) {
    subscriptionIds.add(billingProfile.stripe_subscription_id)
  }

  if (subscriptionIds.size === 0) return

  const apiKey = Deno.env.get('LEMONSQUEEZY_API_KEY')
  if (!apiKey) {
    console.error('Missing LEMONSQUEEZY_API_KEY during account deletion')
    throw billingFailure('Billing is temporarily unavailable. Your account was not deleted.')
  }

  for (const subscriptionId of subscriptionIds) {
    await ensureSubscriptionCancelled(subscriptionId, apiKey)

    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        status:               'canceled',
        cancel_at_period_end: true,
        canceled_at:          new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('stripe_subscription_id', subscriptionId)

    if (updateError) {
      console.error('Failed to record subscription cancellation before account deletion:', updateError)
      throw billingFailure('Your subscription was cancelled, but account deletion could not finish. Please try again.')
    }
  }
}

async function deleteAvatarObjects(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
): Promise<void> {
  const { error: bucketError } = await supabaseAdmin.storage.getBucket('avatars')
  if (bucketError) {
    // A project that has never enabled avatar uploads cannot contain avatar
    // objects, so a missing bucket is already a clean state.
    if (bucketError.message.toLowerCase().includes('not found')) return

    console.error('Failed to inspect avatars bucket during account deletion:', bucketError)
    throw new AccountDeletionError(
      'STORAGE_CLEANUP_FAILED',
      500,
      'We could not verify your uploaded files. Your account was not deleted.',
    )
  }

  const paths: string[] = []
  let offset = 0

  while (true) {
    const { data: objects, error: listError } = await supabaseAdmin.storage
      .from('avatars')
      .list(userId, { limit: 100, offset })

    if (listError) {
      console.error('Failed to list avatar objects during account deletion:', listError)
      throw new AccountDeletionError(
        'STORAGE_CLEANUP_FAILED',
        500,
        'We could not remove your uploaded files. Your account was not deleted.',
      )
    }

    if (!objects || objects.length === 0) break
    paths.push(...objects.map(object => `${userId}/${object.name}`))
    if (objects.length < 100) break
    offset += objects.length
  }

  if (paths.length === 0) return

  const { error: removeError } = await supabaseAdmin.storage
    .from('avatars')
    .remove(paths)

  if (removeError) {
    console.error('Failed to remove avatar objects during account deletion:', removeError)
    throw new AccountDeletionError(
      'STORAGE_CLEANUP_FAILED',
      500,
      'We could not remove your uploaded files. Your account was not deleted.',
    )
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ code: 'METHOD_NOT_ALLOWED', error: 'Method not allowed' }, 405)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return json({ code: 'UNAUTHENTICATED', error: 'Missing Authorization header' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('Missing required Supabase environment variables')
    return json({ code: 'ACCOUNT_DELETION_FAILED', error: 'Account deletion is unavailable' }, 500)
  }

  const supabaseUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
  if (authError || !user) {
    return json({ code: 'UNAUTHENTICATED', error: 'Not authenticated' }, 401)
  }

  let confirmation: unknown
  try {
    const body = await req.json() as unknown
    confirmation = typeof body === 'object' && body !== null && 'confirmation' in body
      ? body.confirmation
      : undefined
  } catch {
    return json({ code: 'INVALID_CONFIRMATION', error: 'Invalid JSON body' }, 400)
  }

  if (confirmation !== 'DELETE') {
    return json({ code: 'INVALID_CONFIRMATION', error: 'Type DELETE exactly to confirm account deletion' }, 400)
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    await cancelRenewableSubscriptions(supabaseAdmin, user.id)
    await deleteAvatarObjects(supabaseAdmin, user.id)

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id, false)
    if (deleteError) {
      console.error('Failed to hard-delete Supabase Auth user:', user.id, deleteError)
      throw new AccountDeletionError(
        'ACCOUNT_DELETION_FAILED',
        500,
        'Your account could not be deleted. Please try again.',
      )
    }

    return json({ success: true }, 200)
  } catch (error) {
    if (error instanceof AccountDeletionError) {
      return json({ code: error.code, error: error.message }, error.status)
    }

    console.error('Unexpected account deletion failure:', error)
    return json(
      { code: 'ACCOUNT_DELETION_FAILED', error: 'Your account could not be deleted. Please try again.' },
      500,
    )
  }
})
