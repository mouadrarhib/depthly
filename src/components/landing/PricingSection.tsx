import { useState } from 'react'

import { Check } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PATHS } from '@/routes/paths'

import { SectionHeader, sectionPad } from './primitives'

/** Billing interval for recurring plans — carried through to checkout. */
export type PlanInterval = 'monthly' | 'annual'

interface TierPrice {
  amount: string
  note: string
  /** Small muted line under the price (e.g. monthly equivalent). */
  sub?: string
  /** Small savings pill next to the price. */
  savings?: string
}

interface Tier {
  name: string
  features: string[]
  cta: string
  highlighted?: boolean
  founderBadge?: boolean
  /** Price display — only Pro varies with the billing interval. */
  price: (interval: PlanInterval) => TierPrice
  /** Signup link — carries plan + interval for checkout wiring later. */
  ctaTo: (interval: PlanInterval) => string
}

const TIERS: Tier[] = [
  {
    name: 'Free',
    features: [
      'Focus timer & stopwatch',
      'Up to 3 projects',
      '50 sessions per month',
      '7-day analytics window',
    ],
    cta: 'Get started',
    price: () => ({ amount: '$0', note: 'forever' }),
    ctaTo: () => PATHS.signup,
  },
  {
    name: 'Pro',
    features: [
      'Unlimited projects & sessions',
      'Full analytics history',
      'Kanban boards',
      'CSV export',
      'Leaderboard appearance',
    ],
    cta: 'Start free trial',
    highlighted: true,
    price: (interval) =>
      interval === 'monthly'
        ? { amount: '$5', note: 'per month' }
        : { amount: '$39', note: 'per year', sub: '$3.25/mo', savings: 'Save 35%' },
    ctaTo: (interval) => `${PATHS.signup}?plan=pro&interval=${interval}`,
  },
  {
    name: 'Lifetime',
    features: [
      'Everything in Pro, forever',
      'All future updates included',
      'Founding member badge on your profile',
    ],
    cta: 'Become a founder',
    founderBadge: true,
    price: () => ({ amount: '$79', note: 'one-time payment' }),
    ctaTo: () => `${PATHS.signup}?plan=lifetime`,
  },
]

const INTERVALS: { value: PlanInterval; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual', label: 'Yearly' },
]

export function PricingSection() {
  const [billingInterval, setBillingInterval] = useState<PlanInterval>('monthly')

  return (
    <section id="pricing" data-reveal-group className="px-5 md:px-8" style={sectionPad}>
      <div className="mx-auto" style={{ maxWidth: 1100 }}>
        <SectionHeader
          eyebrow="Pricing"
          title="Simple pricing, no surprises"
          subtext="Start free, upgrade when you need more. Cancel anytime."
        />

        {/* Monthly / Yearly toggle — same segmented style as the timer mode selector */}
        <div data-reveal className="flex justify-center" style={{ marginTop: 36 }}>
          <Tabs
            value={billingInterval}
            onValueChange={(v) => setBillingInterval(v as PlanInterval)}
          >
            <TabsList
              className="h-auto gap-0.5 rounded-full p-1"
              style={{ background: 'var(--color-surface-overlay)' }}
            >
              {INTERVALS.map(({ value, label }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className={[
                    'rounded-full text-[13px] font-medium px-[18px] py-[6px]',
                    'transition-all shadow-none',
                    'data-[state=inactive]:bg-transparent data-[state=inactive]:text-[var(--color-text-faint)]',
                    'data-[state=active]:bg-[var(--color-surface-raised)] data-[state=active]:text-[var(--color-brand)]',
                    'data-[state=active]:border data-[state=active]:border-[rgba(75,158,255,0.3)]',
                    'data-[state=active]:shadow-none',
                  ].join(' ')}
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div
          className="grid grid-cols-1 items-start gap-6 md:grid-cols-3"
          style={{ marginTop: 40, maxWidth: 980, marginLeft: 'auto', marginRight: 'auto' }}
        >
          {TIERS.map((tier) => {
            const { amount, note, sub, savings } = tier.price(billingInterval)
            return (
              <div
                key={tier.name}
                data-reveal
                className="relative flex flex-col"
                style={{
                  backgroundColor: '#141417',
                  border: tier.highlighted ? '2px solid #4B9EFF' : '1px solid #2E2E38',
                  borderRadius: 14,
                  padding: 28,
                }}
              >
                {tier.highlighted ? (
                  <span
                    className="absolute rounded-full"
                    style={{
                      top: -12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: 11,
                      fontWeight: 500,
                      padding: '3px 12px',
                      backgroundColor: '#4B9EFF',
                      color: '#FFFFFF',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Most popular
                  </span>
                ) : null}

                <div className="flex items-center gap-2.5">
                  <h3 style={{ fontSize: 16, fontWeight: 500, color: '#E8E6F0' }}>{tier.name}</h3>
                  {tier.founderBadge ? (
                    <span
                      className="rounded-full"
                      style={{
                        fontSize: 10,
                        fontWeight: 500,
                        padding: '2px 9px',
                        backgroundColor: 'rgba(200, 255, 100, 0.1)',
                        color: '#C8FF64',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Founding member
                    </span>
                  ) : null}
                </div>

                {/* Price block — fixed height so cards don't shift when Pro's sub-line appears */}
                <div style={{ marginTop: 16, minHeight: 58 }}>
                  <div className="flex flex-wrap items-baseline" style={{ gap: 8 }}>
                    <span
                      className="font-data"
                      style={{
                        fontSize: 36,
                        fontWeight: 600,
                        color: '#E8E6F0',
                        letterSpacing: '-0.02em',
                        lineHeight: 1,
                      }}
                    >
                      {amount}
                    </span>
                    <span style={{ fontSize: 13, color: '#7A7890' }}>{note}</span>
                    {savings ? (
                      <span
                        className="rounded-full"
                        style={{
                          fontSize: 10,
                          fontWeight: 500,
                          padding: '2px 8px',
                          backgroundColor: 'rgba(75, 158, 255, 0.12)',
                          color: '#4B9EFF',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {savings}
                      </span>
                    ) : null}
                  </div>
                  {sub ? (
                    <div className="font-data" style={{ fontSize: 12, color: '#7A7890', marginTop: 6 }}>
                      {sub}
                    </div>
                  ) : null}
                </div>

                <ul
                  className="flex flex-col gap-3"
                  style={{ marginTop: 18, marginBottom: 28, padding: 0, listStyle: 'none' }}
                >
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <Check
                        size={16}
                        strokeWidth={2}
                        style={{ color: '#4B9EFF', flexShrink: 0, marginTop: 2 }}
                      />
                      <span style={{ fontSize: 14, color: '#7A7890', lineHeight: 1.5 }}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  variant={tier.highlighted ? 'default' : 'outline'}
                  className="mt-auto w-full"
                  style={
                    tier.highlighted ? { backgroundColor: '#4B9EFF', color: '#FFFFFF' } : undefined
                  }
                >
                  <Link to={tier.ctaTo(billingInterval)}>{tier.cta}</Link>
                </Button>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
