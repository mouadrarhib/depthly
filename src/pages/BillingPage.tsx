import { useEffect, useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

import { usePlan, FREE_LIMITS } from '@/hooks/usePlan'
import { useProfile } from '@/hooks/useAnalytics'
import { UpgradeModal } from '@/components/billing/UpgradeModal'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const FEATURES = [
  'Unlimited projects',
  'Unlimited sessions',
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

export function BillingPage() {
  const { plan } = usePlan()
  // profiles.plan/plan_interval/subscription_current_period_end is the fast-read
  // billing state and the source of truth for display (see CLAUDE.md) — NOT the
  // subscriptions table, which can hold rows for older/unrelated subscriptions
  // (e.g. a Pro trial before upgrading to Lifetime) that would otherwise show
  // stale billing info here.
  const { data: profile } = useProfile()
  const [upgradeOpen, setUpgradeOpen] = useState(false)

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

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
                <span style={{ fontSize: 12, color: '#7A7890' }}>
                  Next billing date: {billingDate}
                </span>
                <span style={{ fontSize: 12, color: '#7A7890' }}>
                  Plan: {planInterval}
                </span>
              </div>

              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    {/* span wrapper so tooltip fires over a disabled button */}
                    <span className="block w-full">
                      <Button
                        variant="ghost"
                        className="w-full pointer-events-none"
                        disabled
                      >
                        Manage subscription
                        {/* TODO: replace with Lemon Squeezy customer portal URL once verified */}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <span style={{ fontSize: 12 }}>Available once billing is live</span>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
        </div>

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
    </div>
  )
}
