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
  founder?: boolean
  /** Price display — only Pro varies with the billing interval. */
  price: (interval: PlanInterval) => TierPrice
  /** Signup link carries the selected plan and interval into checkout. */
  ctaTo: (interval: PlanInterval) => string
}

const PRO_FEATURES = [
  'Unlimited projects & sessions',
  'Full Analytics history + CSV export',
  'Public profile and global leaderboard visibility',
  'Create up to 10 private groups',
  'Up to 100 members per group',
]

const TIERS: Tier[] = [
  {
    name: 'Free',
    features: [
      'Trusted timer & stopwatch',
      'Up to 3 projects and 50 sessions per month',
      '7-day Analytics + Share Progress',
      'Join unlimited private groups',
      'Create 1 group with up to 15 members',
    ],
    cta: 'Get started',
    price: () => ({ amount: '$0', note: 'forever' }),
    ctaTo: () => PATHS.signup,
  },
  {
    name: 'Pro',
    features: PRO_FEATURES,
    cta: 'Choose Pro',
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
      ...PRO_FEATURES.slice(0, 3),
      'All future updates included',
      'Founding member badge on your profile',
    ],
    cta: 'Become a founder',
    founder: true,
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
          title="Start free. Upgrade if you need to."
          subtext="Use the personal focus core for free. Upgrade for more history, scale, and public visibility."
        />

        <div data-reveal className="mt-9 flex flex-col items-center gap-2.5">
          <p className="text-xs text-ink-primary/75">Pro billing</p>
          <Tabs
            value={billingInterval}
            onValueChange={(v) => setBillingInterval(v as PlanInterval)}
          >
            <TabsList
              aria-label="Pro billing period"
              className="h-auto gap-1 rounded-full border border-depth-border bg-depth-surface p-1"
            >
              {INTERVALS.map(({ value, label }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="rounded-full px-5 py-2 text-[13px] text-ink-primary/75 shadow-none transition-colors hover:text-ink-primary focus-visible:ring-brand data-[state=active]:bg-depth-raised data-[state=active]:text-ink-primary data-[state=active]:shadow-none"
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div
          className="mx-auto mt-10 grid max-w-5xl grid-cols-1 items-stretch gap-5 lg:grid-cols-3"
        >
          {TIERS.map((tier) => {
            const { amount, note, sub, savings } = tier.price(billingInterval)
            return (
              <div
                key={tier.name}
                data-reveal
                className={`flex flex-col rounded-xl border p-7 md:p-8 ${
                  tier.highlighted || tier.founder
                    ? 'border-brand bg-depth-raised'
                    : 'border-depth-border bg-depth-surface'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className={`text-lg font-medium ${tier.highlighted || tier.founder ? 'text-brand' : 'text-ink-primary'}`}>
                    {tier.name}
                  </h3>
                  {tier.founder ? (
                    <span className="rounded-full border border-brand/40 bg-brand/10 px-2.5 py-1 text-[11px] font-medium text-brand">
                      Pro, forever
                    </span>
                  ) : null}
                </div>

                <div className="mt-6 min-h-[92px]">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="font-data text-[40px] font-semibold leading-none tracking-[-0.03em] text-ink-primary">
                      {amount}
                    </span>
                    <span className="text-[13px] text-ink-primary/75">{note}</span>
                    {savings ? (
                      <span className="font-data rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-medium text-brand">
                        {savings}
                      </span>
                    ) : null}
                  </div>
                  {sub ? (
                    <p className="font-data mt-2 text-xs text-ink-primary/75">{sub} equivalent</p>
                  ) : null}
                </div>

                <Button
                  asChild
                  variant={tier.highlighted || tier.founder ? 'primary' : 'outline'}
                  className={`w-full focus-visible:ring-brand ${
                    tier.highlighted || tier.founder
                      ? 'bg-brand text-depth-bg hover:bg-brand/90'
                      : 'border-depth-border bg-depth-bg text-ink-primary hover:bg-depth-raised hover:text-ink-primary'
                  }`}
                >
                  <Link to={tier.ctaTo(billingInterval)}>{tier.cta}</Link>
                </Button>

                <div className="my-7 h-px bg-depth-border" aria-hidden="true" />
                <ul className="flex flex-col gap-3.5">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <Check
                        size={16}
                        strokeWidth={1.75}
                        className="mt-0.5 shrink-0 text-brand"
                      />
                      <span className="text-sm leading-[1.55] text-ink-primary/80">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
