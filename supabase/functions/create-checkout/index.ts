// Creates a Lemon Squeezy checkout for the authenticated user and returns its URL.
// Requires a valid Supabase auth JWT (default verify_jwt = true) — the user id is
// read from that token, never trusted from the request body, so a client can only
// ever start a checkout for itself.

import { createClient } from 'npm:@supabase/supabase-js@2.43.5'

type PlanType = 'pro_monthly' | 'pro_yearly' | 'lifetime'

const PLAN_VARIANT_ENV: Record<PlanType, string> = {
  pro_monthly: 'LEMONSQUEEZY_VARIANT_PRO_MONTHLY',
  pro_yearly:  'LEMONSQUEEZY_VARIANT_PRO_YEARLY',
  lifetime:    'LEMONSQUEEZY_VARIANT_LIFETIME',
}

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

  let planType: unknown
  try {
    const body = await req.json()
    planType = body?.planType
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  if (typeof planType !== 'string' || !(planType in PLAN_VARIANT_ENV)) {
    return json({ error: 'planType must be one of: pro_monthly, pro_yearly, lifetime' }, 400)
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

  const apiKey    = Deno.env.get('LEMONSQUEEZY_API_KEY')
  const storeId   = Deno.env.get('LEMONSQUEEZY_STORE_ID')
  const variantId = Deno.env.get(PLAN_VARIANT_ENV[planType as PlanType])

  if (!apiKey || !storeId || !variantId) {
    console.error('Missing Lemon Squeezy env vars for planType:', planType)
    return json({ error: 'Lemon Squeezy is not configured' }, 500)
  }

  // Same app URL the client build uses (see .env.example) — read here rather
  // than hardcoded so it tracks whatever environment this function is deployed
  // against, without needing a second, function-specific URL variable.
  const appUrl = Deno.env.get('VITE_APP_URL')
  if (!appUrl) {
    console.warn('VITE_APP_URL is not set — checkout will use the Lemon Squeezy default redirect')
  }

  const lsResponse = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
    method:  'POST',
    headers: {
      Accept:          'application/vnd.api+json',
      'Content-Type':  'application/vnd.api+json',
      Authorization:   `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          // Store approval is still pending — force test mode so this is safe to
          // wire up and exercise end-to-end before the store goes live.
          test_mode:     true,
          checkout_data: {
            custom: { user_id: user.id },
          },
          ...(appUrl && {
            product_options: {
              redirect_url: `${appUrl}/billing?checkout=success`,
            },
          }),
        },
        relationships: {
          store: {
            data: { type: 'stores', id: storeId },
          },
          variant: {
            data: { type: 'variants', id: variantId },
          },
        },
      },
    }),
  })

  if (!lsResponse.ok) {
    const errText = await lsResponse.text()
    console.error('Lemon Squeezy checkout creation failed:', lsResponse.status, errText)

    // Surface Lemon Squeezy's own JSON:API error detail (safe, human-readable —
    // never includes secrets) so failures are diagnosable from the client
    // without digging through Edge Function logs.
    let detail = 'Failed to create checkout'
    try {
      const errBody = JSON.parse(errText)
      const firstError = errBody?.errors?.[0]
      if (typeof firstError?.detail === 'string') {
        detail = `Failed to create checkout: ${firstError.detail}`
      }
    } catch {
      // errText wasn't JSON — fall back to the generic message above
    }

    return json({ error: detail }, 502)
  }

  const lsBody = await lsResponse.json()
  const url = lsBody?.data?.attributes?.url

  if (typeof url !== 'string') {
    console.error('Lemon Squeezy response missing checkout URL:', JSON.stringify(lsBody))
    return json({ error: 'Checkout URL missing from Lemon Squeezy response' }, 502)
  }

  return json({ url }, 200)
})
