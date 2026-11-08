import { useEffect, useState } from 'react'

import { AlertTriangle, CheckCircle } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

import { SelectedPlanCheckout } from '@/components/billing/SelectedPlanCheckout'
import { UpgradeModal } from '@/components/billing/UpgradeModal'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { useProfile } from '@/hooks/useAnalytics'
import { useSubscriptions, useCancelSubscription } from '@/hooks/useBilling'
import { usePlan, FREE_LIMITS } from '@/hooks/usePlan'
import { parseCheckoutIntent } from '@/lib/checkoutIntent'

export function BillingPage() {
  const { plan, isLoading: isPlanLoading } = usePlan()
  // profiles.plan/plan_interval/subscription_current_period_end is the fast-read
  // billing state and the source of truth for display (see CLAUDE.md) — NOT the
  // subscriptions table, which can hold rows for older/unrelated subscriptions
  // (e.g. a Pro trial before upgrading to Lifetime) that would otherwise show
  // stale billing info here.
  const { data: profile, isError: profileError, refetch: retryProfile } = useProfile()
  const { data: subscriptions, isLoading: historyLoading, isError: historyError, refetch: retryHistory } = useSubscriptions()
  const cancelSubscription = useCancelSubscription()
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelResult, setCancelResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [searchParams, setSearchParams] = useSearchParams()
  const selectedPlan = parseCheckoutIntent(searchParams)
  const [showCheckoutSuccess, setShowCheckoutSuccess] = useState(searchParams.get('checkout') === 'success')

  useEffect(() => {
    if (!showCheckoutSuccess) return
    searchParams.delete('checkout')
    setSearchParams(searchParams, { replace: true })
    const timer = setTimeout(() => setShowCheckoutSuccess(false), 6000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const billingDate = profile?.subscription_current_period_end
    ? new Date(profile.subscription_current_period_end).toLocaleDateString('en-US', {
        year:  'numeric',
        month: 'long',
        day:   'numeric',
      })
    : '—'

  const planInterval =
    profile?.plan_interval === 'monthly' ? 'Monthly' :
    profile?.plan_interval === 'annual'  ? 'Annual'  : '—'

  // The most recently created row is the current Lemon Squeezy subscription —
  // cancellation updates this same row in place (see lemonsqueezy-webhook),
  // it doesn't insert a new one, so this stays correct through the cancel flow.
  const currentSub = subscriptions?.[0] ?? null
  const isInGracePeriod = !!currentSub?.cancel_at_period_end &&
    new Date(currentSub.current_period_end).getTime() > Date.now()
  const canCancel = !!currentSub && !currentSub.cancel_at_period_end

  const graceEndDate = currentSub
    ? new Date(currentSub.current_period_end).toLocaleDateString('en-US', {
        year:  'numeric',
        month: 'long',
        day:   'numeric',
      })
    : '—'

  async function handleConfirmCancel() {
    setCancelResult(null)
    try {
      const data = await cancelSubscription.mutateAsync()
      setCancelResult({ type: 'success', message: data.message })
      setCancelDialogOpen(false)
    } catch (err) {
      setCancelResult({
        type:    'error',
        message: err instanceof Error ? err.message : 'Could not cancel your subscription. Please try again.',
      })
      setCancelDialogOpen(false)
    }
  }

  function formatSubDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  function formatAmount(cents: number, currency: string) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100)
  }

  const PLAN_LABEL: Record<string, string> = { free: 'Free', pro: 'Pro', founding: 'Lifetime' }
  const INTERVAL_LABEL: Record<string, string> = { monthly: 'Monthly', annual: 'Annual', lifetime: 'Lifetime' }

  // Same tinted-pill recipe already used for the FOUNDING MEMBER / PRO badges
  // above — rgba() background/border derived from the same hex used elsewhere
  // in this file for that status color, not a new color introduced for this.
  const STATUS_STYLE: Record<string, { text: string; bg: string; border: string }> = {
    active:    { text: '#3DD68C', bg: 'rgba(61,214,140,0.12)',  border: 'rgba(61,214,140,0.3)'  },
    trialing:  { text: '#4B9EFF', bg: 'rgba(75,158,255,0.12)',  border: 'rgba(75,158,255,0.3)'  },
    past_due:  { text: '#F5A623', bg: 'rgba(245,166,35,0.12)',  border: 'rgba(245,166,35,0.3)'  },
    canceled:  { text: '#ABA8BB', bg: 'rgba(122,120,144,0.12)', border: 'rgba(122,120,144,0.3)' },
    expired:   { text: '#ABA8BB', bg: 'rgba(122,120,144,0.12)', border: 'rgba(122,120,144,0.3)' },
    unpaid:    { text: '#FF878B', bg: 'rgba(229,72,77,0.12)',   border: 'rgba(229,72,77,0.3)'   },
  }

  const paidFeatures = [
    { title: 'Organize & focus', detail: 'Unlimited projects and focus sessions · Kanban board' },
    { title: 'Review & share', detail: 'Full analytics history · Year heatmap · CSV export' },
    { title: 'Focus together', detail: '10 private groups · Invite-only rankings' },
  ]
  const freeFeatures = [
    { title: 'Organize your work', detail: `Up to ${FREE_LIMITS.maxProjects} active projects` },
    { title: 'Build your focus', detail: `${FREE_LIMITS.maxSessionsPerMonth} focus sessions per month` },
    { title: 'Review recent progress', detail: `${FREE_LIMITS.analyticsWindowDays} days of analytics history` },
  ]
  const panel = 'min-w-0 rounded-2xl border-border bg-surface-raised shadow-none'
  const details = plan === 'founding'
    ? [['Billing type', 'One-time purchase'], ['Next renewal', 'No renewal'], ['Access', 'Lifetime']]
    : plan === 'free'
      ? [['Billing type', 'Free'], ['Recurring charge', 'None'], ['Access', 'Free features']]
      : [['Billing cycle', planInterval], [isInGracePeriod ? 'Access ends' : 'Next billing date', isInGracePeriod ? graceEndDate : billingDate], ['Access', 'Pro features']]

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 px-1 py-3 sm:px-4 sm:py-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">Your plan & billing</h1>
        <p className="mt-2 text-sm leading-relaxed text-text/70">See what’s included in your plan and review your billing records.</p>
      </div>

      {selectedPlan && !showCheckoutSuccess && (
        <SelectedPlanCheckout key={selectedPlan.planType} intent={selectedPlan} disabled={isPlanLoading || profileError} onDismiss={() => {
          const params = new URLSearchParams(searchParams)
          params.delete('plan')
          params.delete('interval')
          setSearchParams(params, { replace: true })
        }} />
      )}
      {showCheckoutSuccess && <p role="status" className="rounded-xl border border-brand/30 bg-brand/10 p-4 text-sm text-text">Checkout completed. Your plan may take a moment to update.</p>}

      <div className="grid items-stretch gap-5 xl:grid-cols-[1.45fr_1fr]">
        <Card className={`${panel} p-5 sm:p-7`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-text">Your current plan</h2>
            {!isPlanLoading && !profileError && plan !== 'free' && <Badge variant="secondary" className="bg-brand/10 text-brand">{plan === 'founding' ? 'Founding member' : 'Pro'}</Badge>}
          </div>
          {profileError ? (
            <div role="alert" className="py-6"><p className="text-sm text-text/70">Could not load your current plan. Try again before making billing changes.</p><Button variant="ghost" className="mt-3" onClick={() => void retryProfile()}>Try again</Button></div>
          ) : isPlanLoading ? <div className="flex justify-center py-12"><Spinner /></div> : (
            <>
              <h3 className="mt-6 text-2xl font-semibold tracking-tight text-text sm:text-3xl">{plan === 'founding' ? 'Depthly Lifetime' : plan === 'pro' ? 'Depthly Pro' : 'Depthly Free'}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text/70">{plan === 'founding' ? 'Every Pro feature, with lifetime access.' : plan === 'pro' ? 'More room for your projects, focus sessions, and progress.' : 'Plan your work and build a steady focus habit.'}</p>
              <dl className="mt-6 grid gap-5 border-t border-border pt-6 sm:grid-cols-3">
                {details.map(([label, value]) => <div key={label}><dt className="text-xs text-text/70">{label}</dt><dd className={`mt-2 text-sm font-medium text-text ${label.includes('date') || label === 'Access ends' ? 'font-data' : ''}`}>{value}</dd></div>)}
              </dl>
              {plan === 'founding' && <p className="mt-6 text-xs leading-relaxed text-text/70">No recurring charge. Your Lifetime plan does not expire.</p>}
              {plan === 'free' && <Button variant="primary" className="mt-6 min-h-11" onClick={() => setUpgradeOpen(true)}>Explore paid plans</Button>}
              {plan === 'pro' && <div className="mt-6 space-y-4">
                {profile?.subscription_status === 'past_due' && <div role="alert" className="flex gap-3 rounded-lg border border-border p-4 text-sm text-text"><AlertTriangle size={18} className="mt-0.5 shrink-0" /><div><p className="font-semibold">Your last payment failed</p><p className="mt-1 leading-relaxed text-text/70">Check your Lemon Squeezy purchase email for a payment-update link, or reply to it for help.</p></div></div>}
                {historyError ? <p className="text-sm text-text/70">Subscription controls are unavailable while plan history cannot be loaded.</p> : isInGracePeriod ? <p role="status" className="text-sm leading-relaxed text-text/70">Your subscription is cancelled. You’ll keep Pro access until {graceEndDate}, with no further renewal.</p> : canCancel ? <Button variant="ghost" className="min-h-11" onClick={() => { setCancelResult(null); setCancelDialogOpen(true) }}>Cancel subscription</Button> : null}
                {cancelResult && <p role={cancelResult.type === 'error' ? 'alert' : 'status'} className="text-sm text-text">{cancelResult.message}</p>}
              </div>}
            </>
          )}
        </Card>
        <Card className={`${panel} p-5 sm:p-7`}>
          <h2 className="text-base font-semibold text-text">Included in your plan</h2>
          {isPlanLoading ? <div className="flex justify-center py-12"><Spinner /></div> : profileError ? <p className="mt-6 text-sm text-text/70">Your features will appear when your plan is available.</p> : <ul className="mt-6 space-y-6">{(plan === 'free' ? freeFeatures : paidFeatures).map(feature => <li key={feature.title} className="flex gap-3"><CheckCircle aria-hidden="true" size={17} className="mt-0.5 shrink-0 text-brand" /><div><h3 className="text-sm font-medium text-text">{feature.title}</h3><p className="mt-1 text-xs leading-relaxed text-text/70">{feature.detail}</p></div></li>)}</ul>}
        </Card>
      </div>

      <Card className={`${panel} overflow-hidden`}>
        <div className="p-5 sm:px-7 sm:py-6"><h2 className="text-lg font-semibold text-text">Plan history</h2><p className="mt-2 text-xs leading-relaxed text-text/70">Previous and current plan records. Statuses reflect each record, not your current plan.</p></div>
        {historyLoading ? <div className="flex justify-center p-10"><Spinner /></div> : historyError ? <div role="alert" className="px-5 pb-6 sm:px-7"><p className="text-sm text-text/70">Could not load your plan history.</p><Button variant="ghost" className="mt-3" onClick={() => void retryHistory()}>Try again</Button></div> : !subscriptions?.length ? <div className="px-5 pb-6 sm:px-7"><p className="text-sm text-text">No billing records yet</p><p className="mt-1 text-sm text-text/70">Paid plan records will appear here after a purchase.</p>{plan === 'free' && <Button variant="ghost" className="mt-3" onClick={() => setUpgradeOpen(true)}>Explore paid plans</Button>}</div> : (
          <div className="max-h-[440px] overflow-auto" tabIndex={0} role="region" aria-label="Plan history table" >
            <table className="w-full min-w-[680px] text-left text-sm">
              <caption className="sr-only">Plan records including access period, amount, and recorded status</caption>
              <thead className="sticky top-0 bg-surface-overlay text-xs text-text/70"><tr>{['Plan', 'Period / access', 'Amount', 'Recorded status'].map(label => <th key={label} scope="col" className="px-5 py-4 font-medium sm:px-7">{label}</th>)}</tr></thead>
              <tbody className="divide-y divide-border">{subscriptions.map(sub => {
                const isLifetime = sub.plan_interval === 'lifetime'
                const statusStyle = STATUS_STYLE[sub.status] ?? STATUS_STYLE.canceled
                return <tr key={sub.id}>
                  <th scope="row" className="px-5 py-4 font-medium text-text sm:px-7">{isLifetime ? PLAN_LABEL[sub.plan] ?? sub.plan : `${PLAN_LABEL[sub.plan] ?? sub.plan} · ${INTERVAL_LABEL[sub.plan_interval] ?? sub.plan_interval}`}<span className="mt-1 block text-xs font-normal text-text/70">{isLifetime ? 'One-time purchase' : 'Subscription'}</span></th>
                  <td className="px-5 py-4 text-xs text-text/70 sm:px-7">{isLifetime ? 'Lifetime access' : <span className="font-data">{formatSubDate(sub.current_period_start)} – {formatSubDate(sub.current_period_end)}</span>}</td>
                  <td className="whitespace-nowrap px-5 py-4 font-data text-text sm:px-7">{formatAmount(sub.amount_cents, sub.currency)}</td>
                  <td className="px-5 py-4 sm:px-7"><Badge variant="secondary" className="whitespace-nowrap capitalize" style={{ color: statusStyle.text, background: statusStyle.bg }}>{sub.status.replace(/_/g, ' ')}</Badge></td>
                </tr>
              })}</tbody>
            </table>
          </div>
        )}
      </Card>
      <div className="px-1"><h2 className="text-sm font-medium text-text">Looking for a receipt?</h2><p className="mt-2 text-xs leading-relaxed text-text/70">Check your Lemon Squeezy purchase email for payment details and receipts.</p></div>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
      <Dialog open={cancelDialogOpen} onOpenChange={open => { if (!cancelSubscription.isPending) setCancelDialogOpen(open) }}>
        <DialogContent className="max-w-md rounded-2xl border-border bg-surface-raised p-6" onEscapeKeyDown={e => { if (cancelSubscription.isPending) e.preventDefault() }} onPointerDownOutside={e => { if (cancelSubscription.isPending) e.preventDefault() }}>
          <DialogHeader><DialogTitle>Cancel your subscription?</DialogTitle><DialogDescription className="leading-relaxed text-text/70">You’ll keep Pro access until the end of your current billing period. Your subscription won’t renew after that.</DialogDescription></DialogHeader>
          <DialogFooter className="gap-2 pt-3"><Button variant="ghost" disabled={cancelSubscription.isPending} onClick={() => setCancelDialogOpen(false)}>Keep subscription</Button><Button variant="danger" isLoading={cancelSubscription.isPending} onClick={handleConfirmCancel}>Cancel subscription</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
