import { Check } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui'
import { PATHS } from '@/routes/paths'

import { SectionHeader, sectionPad } from './primitives'

interface Tier {
  name: string
  price: string
  priceNote: string
  features: string[]
  cta: string
  highlighted?: boolean
  founderBadge?: boolean
}

const TIERS: Tier[] = [
  {
    name: 'Free',
    price: '$0',
    priceNote: 'forever',
    features: [
      'Focus timer & stopwatch',
      'Up to 3 projects',
      '50 sessions per month',
      '7-day analytics window',
    ],
    cta: 'Get started',
  },
  {
    name: 'Pro',
    price: '$5',
    priceNote: 'per month, or $39/yr',
    features: [
      'Unlimited projects & sessions',
      'Full analytics history',
      'Kanban boards',
      'CSV export',
      'Leaderboard appearance',
    ],
    cta: 'Start free trial',
    highlighted: true,
  },
  {
    name: 'Lifetime',
    price: '$79',
    priceNote: 'one-time payment',
    features: [
      'Everything in Pro, forever',
      'All future updates included',
      'Founding member badge on your profile',
    ],
    cta: 'Become a founder',
    founderBadge: true,
  },
]

export function PricingSection() {
  return (
    <section id="pricing" data-reveal-group className="px-5 md:px-8" style={sectionPad}>
      <div className="mx-auto" style={{ maxWidth: 1100 }}>
        <SectionHeader
          eyebrow="Pricing"
          title="Simple pricing, no surprises"
          subtext="Start free, upgrade when you need more. Cancel anytime."
        />

        <div
          className="grid grid-cols-1 items-start gap-6 md:grid-cols-3"
          style={{ marginTop: 56, maxWidth: 980, marginLeft: 'auto', marginRight: 'auto' }}
        >
          {TIERS.map(({ name, price, priceNote, features, cta, highlighted, founderBadge }) => (
            <div
              key={name}
              data-reveal
              className="relative flex flex-col"
              style={{
                backgroundColor: '#141417',
                border: highlighted ? '2px solid #4B9EFF' : '1px solid #2E2E38',
                borderRadius: 14,
                padding: 28,
              }}
            >
              {highlighted ? (
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
                <h3 style={{ fontSize: 16, fontWeight: 500, color: '#E8E6F0' }}>{name}</h3>
                {founderBadge ? (
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

              <div className="flex items-baseline gap-2" style={{ marginTop: 16 }}>
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
                  {price}
                </span>
                <span style={{ fontSize: 13, color: '#7A7890' }}>{priceNote}</span>
              </div>

              <ul className="flex flex-col gap-3" style={{ marginTop: 24, marginBottom: 28, padding: 0, listStyle: 'none' }}>
                {features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check
                      size={16}
                      strokeWidth={2}
                      style={{ color: '#4B9EFF', flexShrink: 0, marginTop: 2 }}
                    />
                    <span style={{ fontSize: 14, color: '#7A7890', lineHeight: 1.5 }}>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                variant={highlighted ? 'default' : 'outline'}
                className="mt-auto w-full"
                style={highlighted ? { backgroundColor: '#4B9EFF', color: '#FFFFFF' } : undefined}
              >
                <Link to={PATHS.signup}>{cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
