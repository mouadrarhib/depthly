// Cancels the authenticated user's active Lemon Squeezy subscription.
// Requires a valid Supabase auth JWT (default verify_jwt = true) — the user id is
// read from that token, never trusted from the request body, so a client can only
// ever cancel its own subscription.

import { createClient } from 'npm:@supabase/supabase-js@2.43.5'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return json({ error: 'Missing Authorization header' }, 401)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return json({ error: 'Not authenticated' }, 401)
  }

  // RLS on `subscriptions` is read-of-own-only, so this lookup can only ever
  // see this user's rows — no service role key needed for a read-only query.
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('stripe_subscription_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (subError) {
    console.error('Failed to look up subscription for cancellation:', subError)
    return json({ error: 'Could not look up your subscription' }, 500)
  }

  if (!subscription) {
    return json({ error: 'No active subscription found to cancel' }, 404)
  }

  const apiKey = Deno.env.get('LEMONSQUEEZY_API_KEY')
  if (!apiKey) {
    console.error('Missing LEMONSQUEEZY_API_KEY')
    return json({ error: 'Lemon Squeezy is not configured' }, 500)
  }

  const lsResponse = await fetch(
    `https://api.lemonsqueezy.com/v1/subscriptions/${subscription.stripe_subscription_id}`,
    {
      method:  'DELETE',
      headers: {
        Accept:        'application/vnd.api+json',
        Authorization: `Bearer ${apiKey}`,
      },
    },
  )

  if (!lsResponse.ok) {
    const errText = await lsResponse.text()
    console.error('Lemon Squeezy subscription cancellation failed:', lsResponse.status, errText)

    // Surface Lemon Squeezy's own JSON:API error detail (safe, human-readable —
    // never includes secrets), same approach as create-checkout.
    let detail = 'Failed to cancel subscription'
    try {
      const errBody = JSON.parse(errText)
      const firstError = errBody?.errors?.[0]
      if (typeof firstError?.detail === 'string') {
        detail = `Failed to cancel subscription: ${firstError.detail}`
      }
    } catch {
      // errText wasn't JSON — fall back to the generic message above
    }

    return json({ error: detail }, 502)
  }

  // Lemon Squeezy's DELETE here is a "soft" cancellation — it puts the
  // subscription into a grace period that runs until the current billing
  // period ends, rather than revoking access immediately. profiles.plan is
  // intentionally left untouched here: the existing lemonsqueezy-webhook
  // subscription_cancelled handler is what syncs profiles/subscriptions,
  // once Lemon Squeezy sends that event back.
  return json({
    success: true,
    message: 'Your subscription has been cancelled. You\'ll keep Pro access until the end of your current billing period.',
  }, 200)
})
