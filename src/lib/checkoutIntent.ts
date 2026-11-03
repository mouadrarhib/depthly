import { PATHS } from '@/routes/paths'

export type CheckoutPlanType = 'pro_monthly' | 'pro_yearly' | 'lifetime'

export interface CheckoutIntent {
  planType: CheckoutPlanType
  name: string
  price: string
}

/** Only supported plans and billing periods can become checkout requests. */
export function parseCheckoutIntent(params: URLSearchParams): CheckoutIntent | null {
  const plan = params.get('plan')
  if (plan === 'lifetime') {
    return { planType: 'lifetime', name: 'Lifetime', price: '$79 one-time payment' }
  }
  if (plan !== 'pro') return null
  const interval = params.get('interval')
  if (interval === 'annual') {
    return { planType: 'pro_yearly', name: 'Pro', price: '$39 per year' }
  }
  if (interval === null || interval === 'monthly') {
    return { planType: 'pro_monthly', name: 'Pro', price: '$5 per month' }
  }
  return null
}

export function checkoutDestination(intent: CheckoutIntent): string {
  const params = new URLSearchParams({ plan: intent.planType === 'lifetime' ? 'lifetime' : 'pro' })
  if (intent.planType !== 'lifetime') {
    params.set('interval', intent.planType === 'pro_yearly' ? 'annual' : 'monthly')
  }
  return `${PATHS.billing}?${params}`
}

export function checkoutIntentFromDestination(destination: string): CheckoutIntent | null {
  const url = new URL(destination, 'https://depthly.invalid')
  return url.pathname === PATHS.billing ? parseCheckoutIntent(url.searchParams) : null
}
