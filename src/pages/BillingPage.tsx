import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

import { usePlan, FREE_LIMITS } from '@/hooks/usePlan'
import { useProfile } from '@/hooks/useAnalytics'
import { useSubscriptions, useCancelSubscription } from '@/hooks/useBilling'
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

const FEATURES = [
  'Unlimited projects',
  'Unlimited sessions',
  'Kanban board view',
  'Full analytics history',
  '52-week heatmap',
  'Global leaderboard',
  'CSV export',
  'Priority new features',
]

const cardStyle: React.CSSProperties = {
  backgroundColor: '#141417',
  border:          '1px solid #2E2E38',
  borderRadius:    14,
  padding:         28,
}

// Section-label recipe already used for UpgradeModal's "Pro Features" eyebrow —
// reused here rather than introducing a new label style.
const eyebrowStyle: React.CSSProperties = {
  fontSize:      11,
  fontWeight:    600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color:         '#7A7890',
  marginBottom:  12,
}

export function BillingPage() {
  const { plan } = usePlan()
  // profiles.plan/plan_interval/subscription_current_period_end is the fast-read
  // billing state and the source of truth for display (see CLAUDE.md) — NOT the
  // subscriptions table, which can hold rows for older/unrelated subscriptions
  // (e.g. a Pro trial before upgrading to Lifetime) that would otherwise show
  // stale billing info here.
  const { data: profile } = useProfile()
  const { data: subscriptions } = useSubscriptions()
  const cancelSubscription = useCancelSubscription()
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelResult, setCancelResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [searchParams, setSearchParams] = useSearchParams()
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
    canceled:  { text: '#7A7890', bg: 'rgba(122,120,144,0.12)', border: 'rgba(122,120,144,0.3)' },
    expired:   { text: '#7A7890', bg: 'rgba(122,120,144,0.12)', border: 'rgba(122,120,144,0.3)' },
    unpaid:    { text: '#E5484D', bg: 'rgba(229,72,77,0.12)',   border: 'rgba(229,72,77,0.3)'   },
  }

  return (
    <div className="px-4 py-4 sm:px-8 sm:py-6">
      <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Title */}
        <h1
          className="text-ink-primary"
          style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.03em', margin: 0 }}
        >
          Billing
        </h1>

        {/* Post-checkout notice — webhook may take a second or two to sync */}
        {showCheckoutSuccess && (
          <div
            style={{
              backgroundColor: 'rgba(61,214,140,0.1)',
              border:          '1px solid rgba(61,214,140,0.3)',
              borderRadius:    10,
              padding:         '10px 14px',
              fontSize:        13,
              color:           '#3DD68C',
            }}
          >
            Payment received — updating your plan…
          </div>
        )}

        {/* Current Plan Card */}
        <div style={cardStyle}>
          <div style={eyebrowStyle}>Current plan</div>
          {plan === 'free' ? (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: '#E8E6F0', margin: 0 }}>
                Free Plan
              </h2>
              <p style={{ fontSize: 13, color: '#3D3B4E', marginTop: 6, marginBottom: 16, lineHeight: 1.5 }}>
                You're on the free plan. Upgrade to unlock unlimited access.
              </p>

              <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 0, listStyle: 'none', margin: '0 0 20px 0' }}>
                {[
                  `${FREE_LIMITS.maxProjects} projects max`,
                  `${FREE_LIMITS.maxSessionsPerMonth} sessions/month`,
                  `${FREE_LIMITS.analyticsWindowDays} days analytics history`,
                ].map(item => (
                  <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#2E2E38', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: '#7A7890' }}>{item}</span>
                  </li>
                ))}
              </ul>

              <Button variant="primary" className="w-full" onClick={() => setUpgradeOpen(true)}>
                Upgrade to Pro
              </Button>
            </>
          ) : plan === 'founding' ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: '#E8E6F0', margin: 0 }}>
                  Depthly Lifetime
                </h2>
                <span style={{
                  fontSize:      11,
                  fontWeight:    600,
                  color:         '#F5A623',
                  background:    'rgba(245,166,35,0.15)',
                  border:        '1px solid rgba(245,166,35,0.3)',
                  borderRadius:  999,
                  padding:       '2px 8px',
                  letterSpacing: '0.05em',
                }}>
                  FOUNDING MEMBER
                </span>
              </div>

              <p style={{ fontSize: 12, color: '#7A7890', marginBottom: 20, lineHeight: 1.5 }}>
                One-time purchase — lifetime access to every Pro feature, forever. No renewal, no billing date.
              </p>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: '#E8E6F0', margin: 0 }}>
                  Depthly Pro
                </h2>
                <span style={{
                  fontSize:      11,
                  fontWeight:    600,
                  color:         '#4B9EFF',
                  background:    'rgba(75,158,255,0.15)',
                  border:        '1px solid rgba(75,158,255,0.3)',
                  borderRadius:  999,
                  padding:       '2px 8px',
                  letterSpacing: '0.05em',
                }}>
                  PRO
                </span>
              </div>

              <div
                style={{
                  display:             'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap:                 16,
                  padding:             '14px 16px',
                  marginBottom:        20,
                  backgroundColor:     '#0D0D10',
                  border:              '1px solid #2E2E38',
                  borderRadius:        10,
                }}
              >
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#7A7890' }}>
                    Next billing date
                  </div>
                  <div className="font-data" style={{ fontSize: 13, color: '#E8E6F0', marginTop: 4 }}>
                    {billingDate}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#7A7890' }}>
                    Plan
                  </div>
                  <div style={{ fontSize: 13, color: '#E8E6F0', marginTop: 4 }}>
                    {planInterval}
                  </div>
                </div>
              </div>

              {isInGracePeriod ? (
                <div
                  style={{
                    backgroundColor: 'rgba(245,166,35,0.1)',
                    border:          '1px solid rgba(245,166,35,0.3)',
                    borderRadius:    10,
                    padding:         '10px 14px',
                    fontSize:        13,
                    color:           '#F5A623',
                    lineHeight:      1.5,
                  }}
                >
                  Your subscription is cancelled and will end on {graceEndDate}. You'll keep Pro access until then.
                </div>
              ) : canCancel ? (
                <Button
                  variant="danger"
                  className="w-full"
                  onClick={() => { setCancelResult(null); setCancelDialogOpen(true) }}
                >
                  Cancel subscription
                </Button>
              ) : null}

              {cancelResult && (
                <p
                  style={{
                    fontSize:  12,
                    marginTop: 10,
                    color:     cancelResult.type === 'success' ? '#3DD68C' : '#E5484D',
                  }}
                >
                  {cancelResult.message}
                </p>
              )}
            </>
          )}
        </div>

        {/* Billing History */}
        {subscriptions && subscriptions.length > 0 && (
          <div style={cardStyle}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#E8E6F0', margin: '0 0 16px 0' }}>
              Billing history
            </h3>

            {/* Horizontally scrollable on narrow viewports rather than
                cramming 4 columns — minWidth keeps every column readable. */}
            <div style={{ overflowX: 'auto' }}>
              <div style={{ minWidth: 460 }}>
                <div
                  style={{
                    display:             'grid',
                    gridTemplateColumns: '1.2fr 1.6fr 0.8fr 0.9fr',
                    gap:                 12,
                    padding:             '0 4px 10px',
                    borderBottom:        '1px solid #2E2E38',
                  }}
                >
                  {['Plan', 'Period', 'Amount', 'Status'].map((label, i) => (
                    <span
                      key={label}
                      style={{
                        fontSize:      10,
                        fontWeight:    600,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color:         '#7A7890',
                        textAlign:     i >= 2 ? 'right' : 'left',
                      }}
                    >
                      {label}
                    </span>
                  ))}
                </div>

                {subscriptions.map((sub, i) => {
                  const statusStyle = STATUS_STYLE[sub.status] ?? STATUS_STYLE.canceled
                  return (
                    <div
                      key={sub.id}
                      style={{
                        display:             'grid',
                        gridTemplateColumns: '1.2fr 1.6fr 0.8fr 0.9fr',
                        gap:                 12,
                        alignItems:          'center',
                        padding:             '12px 4px',
                        borderBottom:        i < subscriptions.length - 1 ? '1px solid #2E2E38' : 'none',
                      }}
                    >
                      <span style={{ fontSize: 13, color: '#E8E6F0', fontWeight: 500 }}>
                        {PLAN_LABEL[sub.plan] ?? sub.plan} · {INTERVAL_LABEL[sub.plan_interval] ?? sub.plan_interval}
                      </span>
                      <span className="font-data" style={{ fontSize: 12, color: '#7A7890' }}>
                        {formatSubDate(sub.current_period_start)} – {formatSubDate(sub.current_period_end)}
                      </span>
                      <span className="font-data" style={{ fontSize: 12, color: '#E8E6F0', textAlign: 'right' }}>
                        {formatAmount(sub.amount_cents, sub.currency)}
                      </span>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <span
                          style={{
                            fontSize:      10,
                            fontWeight:    600,
                            letterSpacing: '0.04em',
                            textTransform: 'capitalize',
                            color:         statusStyle.text,
                            background:    statusStyle.bg,
                            border:        `1px solid ${statusStyle.border}`,
                            borderRadius:  999,
                            padding:       '2px 8px',
                            whiteSpace:    'nowrap',
                          }}
                        >
                          {sub.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* What's included */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#E8E6F0', margin: '0 0 16px 0' }}>
            What's included with Pro
          </h3>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 0, listStyle: 'none', margin: 0 }}>
            {FEATURES.map(feature => (
              <li key={feature} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle style={{ width: 14, height: 14, color: '#3DD68C', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#E8E6F0' }}>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

      </div>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />

      <Dialog open={cancelDialogOpen} onOpenChange={v => { if (!v) setCancelDialogOpen(false) }}>
        <DialogContent
          className="max-w-sm"
          style={{
            backgroundColor: '#141417',
            border:          '0.5px solid #2E2E38',
            padding:         28,
          }}
        >
          <DialogHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div
                style={{
                  display:         'flex',
                  alignItems:      'center',
                  justifyContent:  'center',
                  width:           32,
                  height:          32,
                  borderRadius:    999,
                  backgroundColor: 'rgba(245,166,35,0.12)',
                  border:          '1px solid rgba(245,166,35,0.3)',
                  flexShrink:      0,
                }}
              >
                <AlertTriangle size={16} style={{ color: '#F5A623' }} />
              </div>
              <DialogTitle className="text-ink-primary">Cancel your subscription?</DialogTitle>
            </div>
            <DialogDescription className="text-ink-secondary">
              Cancellation takes effect at the end of your current billing period, not immediately — you'll keep full Pro access until then, and won't be charged again after that.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              style={{ border: '1px solid #2E2E38' }}
              onClick={() => setCancelDialogOpen(false)}
              disabled={cancelSubscription.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              isLoading={cancelSubscription.isPending}
              onClick={handleConfirmCancel}
            >
              Cancel subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
