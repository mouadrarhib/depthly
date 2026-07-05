import { useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { usePlan, FREE_LIMITS } from '@/hooks/usePlan'
import { UpgradeModal } from '@/components/billing/UpgradeModal'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase/client'
import type { Tables } from '@/types/database'

type Subscription = Tables<'subscriptions'>

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
  const { plan, isPro } = usePlan()
  const userId = useAuthStore(s => s.user?.id ?? '')
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  const { data: subscription } = useQuery<Subscription | null>({
    queryKey: ['subscription', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!userId && isPro,
  })

  const billingDate = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('en-US', {
        year:  'numeric',
        month: 'long',
        day:   'numeric',
      })
    : '—'

  const planInterval =
    subscription?.plan_interval === 'monthly' ? 'Monthly' :
    subscription?.plan_interval === 'annual'  ? 'Annual'  :
    subscription?.plan_interval === 'lifetime' ? 'Lifetime' : '—'

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
