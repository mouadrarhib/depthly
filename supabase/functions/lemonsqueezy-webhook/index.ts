// Receives Lemon Squeezy webhook events and syncs profiles/subscriptions.
//
// IMPORTANT DEPLOYMENT NOTE: this function must have JWT verification disabled
// (Supabase Dashboard → Edge Functions → lemonsqueezy-webhook → turn off
// "Enforce JWT Verification", or `verify_jwt = false` in supabase/config.toml
// for CLI deploys). Lemon Squeezy calls this endpoint directly and does not
// send a Supabase auth token — only the X-Signature header below.
//
// Uses the service role key because profiles/subscriptions have no client-side
// write policies (see supabase/migrations/001_initial_schema.sql).

import { createClient } from 'npm:@supabase/supabase-js@2.43.5'

type PlanType             = 'free' | 'pro' | 'founding'
type PlanIntervalType     = 'monthly' | 'annual' | 'lifetime'
type SubscriptionStatusType = 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid'

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

// Best-effort mapping from Lemon Squeezy subscription status to our enum.
// "paused" has no direct equivalent — treated as past_due since payment
// collection has stopped but the row isn't cancelled.
function mapSubscriptionStatus(lsStatus: string): SubscriptionStatusType {
  switch (lsStatus) {
    case 'on_trial':  return 'trialing'
    case 'active':    return 'active'
    case 'past_due':  return 'past_due'
    case 'unpaid':    return 'unpaid'
    case 'paused':    return 'past_due'
    case 'cancelled': return 'canceled'
    case 'expired':   return 'canceled'
    default:          return 'active'
  }
}

interface VariantMapping {
  planInterval: PlanIntervalType
  amountCents:  number
}

function mapVariantToPlan(variantId: number | string): VariantMapping | null {
  const id = String(variantId)
  if (id === Deno.env.get('LEMONSQUEEZY_VARIANT_PRO_MONTHLY')) {
    return { planInterval: 'monthly', amountCents: 500 }
  }
  if (id === Deno.env.get('LEMONSQUEEZY_VARIANT_PRO_YEARLY')) {
    return { planInterval: 'annual', amountCents: 3900 }
  }
  return null
}

async function verifySignature(rawBody: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sigBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody))
  const digestHex = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  if (digestHex.length !== signature.length) return false
  let mismatch = 0
  for (let i = 0; i < digestHex.length; i++) {
    mismatch |= digestHex.charCodeAt(i) ^ signature.charCodeAt(i)
  }
  return mismatch === 0
}

interface SubscriptionAttributes {
  customer_id:   number
  variant_id:    number
  status:        string
  renews_at:     string | null
  ends_at:       string | null
  trial_ends_at: string | null
  cancelled:     boolean
  created_at:    string
  updated_at:    string
}

async function isFoundingMember(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('plan')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Failed to read profile plan before subscription sync:', error)
    return false
  }
  return data?.plan === 'founding'
}

async function upsertSubscription(
  userId:  string,
  subId:   string,
  attrs:   SubscriptionAttributes,
) {
  const mapping = mapVariantToPlan(attrs.variant_id)
  const status  = mapSubscriptionStatus(attrs.status)
  const periodEnd = attrs.renews_at ?? attrs.ends_at ?? new Date().toISOString()

  // Always keep the audit-trail row up to date regardless of current plan.
  const { error: subError } = await supabaseAdmin
    .from('subscriptions')
    .upsert({
      user_id:                userId,
      stripe_subscription_id: subId,
      stripe_customer_id:     String(attrs.customer_id),
      plan:                   'pro' as PlanType,
      plan_interval:          mapping?.planInterval ?? 'monthly',
      status,
      current_period_start:   attrs.created_at,
      current_period_end:     periodEnd,
      cancel_at_period_end:   attrs.cancelled,
      canceled_at:            attrs.cancelled ? (attrs.ends_at ?? attrs.updated_at) : null,
      amount_cents:           mapping?.amountCents ?? 0,
      currency:               'usd',
    }, { onConflict: 'stripe_subscription_id' })

  if (subError) {
    console.error('Failed to upsert subscription:', subError)
    throw subError
  }

  // Founding/Lifetime members are permanent and not tied to any subscription
  // lifecycle. A subscription event for an older or unrelated Pro subscription
  // (e.g. one the user had before buying Lifetime) must never downgrade them
  // back to 'pro' — only the profiles row's own billing fields would be wrong,
  // the subscriptions row above is still recorded correctly either way.
  if (await isFoundingMember(userId)) {
    console.warn('Skipping profile update for founding member on subscription event:', subId)
    return
  }

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({
      plan:                             'pro' as PlanType,
      plan_interval:                    mapping?.planInterval ?? 'monthly',
      stripe_customer_id:               String(attrs.customer_id),
      stripe_subscription_id:           subId,
      subscription_status:              status,
      subscription_current_period_end: periodEnd,
    })
    .eq('id', userId)

  if (profileError) {
    console.error('Failed to update profile for subscription event:', profileError)
    throw profileError
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const signature = req.headers.get('X-Signature')
  const secret    = Deno.env.get('LEMONSQUEEZY_WEBHOOK_SECRET')

  if (!signature || !secret) {
    return new Response('Missing signature', { status: 401 })
  }

  const rawBody = await req.text()
  const isValid = await verifySignature(rawBody, signature, secret)
  if (!isValid) {
    console.error('Lemon Squeezy webhook signature verification failed')
    return new Response('Invalid signature', { status: 401 })
  }

  let payload: {
    meta: { event_name: string; custom_data?: { user_id?: string } }
    data: { type: string; id: string; attributes: Record<string, unknown> }
  }
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return new Response('Invalid JSON payload', { status: 400 })
  }

  const eventName = payload.meta?.event_name
  const userId    = payload.meta?.custom_data?.user_id

  if (!userId) {
    console.error('Lemon Squeezy webhook missing custom_data.user_id for event:', eventName)
    return new Response('OK', { status: 200 })
  }

  try {
    switch (eventName) {
      case 'order_created': {
        const attrs = payload.data.attributes as {
          first_order_item?: { variant_id: number }
        }
        const variantId = attrs.first_order_item?.variant_id
        const lifetimeVariantId = Deno.env.get('LEMONSQUEEZY_VARIANT_LIFETIME')

        if (String(variantId) !== lifetimeVariantId) {
          // Not the Lifetime one-time product — nothing to do for this order.
          break
        }

        const orderAttrs = payload.data.attributes as { customer_id: number }

        const { error } = await supabaseAdmin
          .from('profiles')
          .update({
            plan:                             'founding' as PlanType,
            plan_interval:                    'lifetime' as PlanIntervalType,
            is_founding_member:               true,
            stripe_customer_id:               String(orderAttrs.customer_id),
            // Lifetime is a one-time order, not a subscription — clear any
            // stale subscription fields left over from an earlier Pro plan so
            // the billing page doesn't show a leftover renewal date/interval.
            stripe_subscription_id:           null,
            subscription_status:              null,
            subscription_current_period_end: null,
          })
          .eq('id', userId)

        if (error) {
          console.error('Failed to update profile for order_created:', error)
          throw error
        }
        break
      }

      case 'subscription_created':
      case 'subscription_updated':
      case 'subscription_cancelled': {
        const attrs = payload.data.attributes as unknown as SubscriptionAttributes
        await upsertSubscription(userId, payload.data.id, attrs)
        break
      }

      case 'subscription_payment_failed': {
        // data.type is "subscription-invoices" here; the subscription itself
        // is referenced by attributes.subscription_id, not data.id.
        const attrs = payload.data.attributes as { subscription_id: number }
        const subId = String(attrs.subscription_id)

        const { error: subError } = await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'past_due' as SubscriptionStatusType })
          .eq('stripe_subscription_id', subId)

        if (subError) {
          console.error('Failed to update subscription for payment_failed:', subError)
          throw subError
        }

        // Same founding-member guard as upsertSubscription — a failed payment
        // on an older/unrelated Pro subscription must not touch a Lifetime member.
        if (await isFoundingMember(userId)) {
          console.warn('Skipping profile update for founding member on payment_failed:', subId)
          break
        }

        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({ subscription_status: 'past_due' as SubscriptionStatusType })
          .eq('id', userId)

        if (profileError) {
          console.error('Failed to update profile for payment_failed:', profileError)
          throw profileError
        }
        break
      }

      default:
        // Unhandled event type — acknowledge so Lemon Squeezy doesn't retry.
        break
    }
  } catch (err) {
    console.error('Lemon Squeezy webhook processing error:', err)
    return new Response('Internal error', { status: 500 })
  }

  return new Response('OK', { status: 200 })
})
