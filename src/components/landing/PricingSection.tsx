import { useState } from 'react'

import { Check, ChevronDown } from 'lucide-react'
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
      'Everything in Pro',
      'Create up to 10 private groups',
      'Up to 100 members per group',
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

const QUESTIONS = [
  {
    question: 'What happens when I reach a Free limit?',
    answer:
      'You can keep using your account. Free allows 3 active projects, 50 completed focus sessions per month, and the latest 7 days of Analytics. Upgrade to raise those limits and unlock full history.',
  },
  {
    question: 'Who can see my progress?',
    answer:
      'Your private group rankings are visible to group members. Joining a group does not make your profile public. Your group membership stays private.',
  },
  {
    question: 'Can I cancel Pro?',
    answer:
      'Yes. Cancel from Billing in your account. Pro access continues until the end of the current paid term. Lifetime is a one-time purchase, not a recurring subscription.',
  },
  {
    question: 'What happens after I choose a paid plan?',
    answer:
      'Create an account or sign in, review your selected plan on Billing, then continue to secure checkout with Lemon Squeezy. Payment details are entered there.',
  },
]

function PricingPath({ interval }: { interval: PlanInterval }) {
  return (
    <>
      <svg
        data-pricing-graphic
        viewBox="0 0 560 132"
        role="img"
        aria-label="Three plan choices: Free, Pro, and Lifetime"
        className="mx-auto mb-7 hidden h-auto w-full max-w-[560px] overflow-visible sm:block"
      >
        <path d="M96 70H464" stroke="var(--color-border)" strokeWidth="2" />
        <path
          data-pricing-line
          d="M96 70H464"
          stroke="#4B9EFF"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {[
          { x: 96, label: 'FREE', amount: '$0', active: false },
          {
            x: 280,
            label: 'PRO',
            amount: interval === 'monthly' ? '$5 / mo' : '$39 / yr',
            active: true,
          },
          { x: 464, label: 'LIFETIME', amount: '$79 once', active: false },
        ].map(({ x, label, amount, active }) => (
          <g data-pricing-node key={label}>
            <circle
              cx={x}
              cy="70"
              r={active ? 16 : 12}
              fill="var(--color-surface-raised)"
              stroke={active ? '#4B9EFF' : '#5C5B69'}
              strokeWidth="2"
            />
            <circle cx={x} cy="70" r={active ? 6 : 4} fill={active ? '#4B9EFF' : 'var(--color-text)'} />
            <text
              x={x}
              y="26"
              fill={active ? '#4B9EFF' : 'var(--color-text)'}
              textAnchor="middle"
              fontSize="12"
              fontWeight="600"
              letterSpacing="1.4"
            >
              {label}
            </text>
            <text
              x={x}
              y="115"
              fill="#A8A6B5"
              textAnchor="middle"
              fontSize="13"
              fontFamily="var(--font-data, Inter, sans-serif)"
            >
              {amount}
            </text>
          </g>
        ))}
      </svg>
      <svg
        data-pricing-graphic
        viewBox="0 0 320 104"
        role="img"
        aria-label="Three plan choices: Free, Pro, and Lifetime"
        className="mx-auto mb-7 block h-auto w-full max-w-[320px] sm:hidden"
      >
        <path d="M44 52H276" stroke="var(--color-border)" strokeWidth="2" />
        <path
          data-pricing-line
          d="M44 52H276"
          stroke="#4B9EFF"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {[
          { x: 44, label: 'FREE', active: false },
          { x: 160, label: 'PRO', active: true },
          { x: 276, label: 'LIFETIME', active: false },
        ].map(({ x, label, active }) => (
          <g data-pricing-node key={label}>
            <circle
              cx={x}
              cy="52"
              r={active ? 13 : 10}
              fill="var(--color-surface-raised)"
              stroke={active ? '#4B9EFF' : '#5C5B69'}
              strokeWidth="2"
            />
            <circle cx={x} cy="52" r="4" fill={active ? '#4B9EFF' : 'var(--color-text)'} />
            <text
              x={x}
              y="19"
              fill={active ? '#4B9EFF' : 'var(--color-text)'}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              letterSpacing="1"
            >
              {label}
            </text>
          </g>
        ))}
      </svg>
    </>
  )
}

function AnswersGraphic() {
  return (
    <svg
      data-answers-graphic
      viewBox="0 0 72 72"
      aria-hidden="true"
      className="h-[72px] w-[72px] shrink-0"
    >
      <rect x="1" y="1" width="70" height="70" rx="15" fill="var(--color-surface-raised)" stroke="var(--color-border)" />
      <path
        data-answers-line
        d="M20 25h31M20 36h24M20 47h17"
        stroke="#4B9EFF"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="51" cy="47" r="4" fill="#4B9EFF" />
    </svg>
  )
}

export function PricingSection() {
  const [billingInterval, setBillingInterval] = useState<PlanInterval>('monthly')

  return (
    <section id="pricing" data-reveal-group className="scroll-mt-16 px-5 md:px-8" style={sectionPad}>
      <div className="mx-auto" style={{ maxWidth: 1100 }}>
        <PricingPath interval={billingInterval} />
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

        <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 items-stretch gap-5 lg:grid-cols-3">
          {TIERS.map((tier) => {
            const { amount, note, sub, savings } = tier.price(billingInterval)
            return (
              <div
                key={tier.name}
                data-reveal
                className={`flex flex-col rounded-xl border p-7 md:p-8 ${
                  tier.highlighted
                    ? 'border-brand bg-depth-raised'
                    : 'border-depth-border bg-depth-surface'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3
                    className={`text-lg font-medium ${tier.highlighted ? 'text-brand' : 'text-ink-primary'}`}
                  >
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
                  variant={tier.highlighted ? 'primary' : 'outline'}
                  className={`w-full focus-visible:ring-brand ${
                    tier.highlighted
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
                      <Check size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-brand" />
                      <span className="text-sm leading-[1.55] text-ink-primary/80">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        <div data-reveal className="mx-auto mt-20 max-w-3xl border-t border-depth-border pt-10">
          <div className="flex items-center gap-5">
            <AnswersGraphic />
            <div>
              <h3 className="text-xl font-medium tracking-[-0.02em] text-ink-primary sm:text-2xl">
                Good to know before you choose
              </h3>
              <p className="mt-1 text-sm text-ink-primary/75">
                Quick answers to the questions that matter before signup.
              </p>
            </div>
          </div>
          <div className="mt-7 divide-y divide-depth-border border-y border-depth-border">
            {QUESTIONS.map(({ question, answer }) => (
              <details key={question} className="group">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-5 py-4 font-medium text-ink-primary marker:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand [&::-webkit-details-marker]:hidden">
                  <span>{question}</span>
                  <ChevronDown
                    size={18}
                    aria-hidden="true"
                    className="shrink-0 text-brand transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
                  />
                </summary>
                <p className="max-w-[65ch] pb-5 pr-8 text-sm leading-6 text-ink-primary/80">
                  {answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
