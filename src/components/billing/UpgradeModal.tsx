import { useState } from 'react'
import { CheckCircle, Crown } from 'lucide-react'
import { FunctionsHttpError } from '@supabase/supabase-js'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'

type Trigger =
  | 'projects'
  | 'sessions'
  | 'analytics'
  | 'export'
  | 'leaderboard'
  | 'kanban'

type PlanCheckoutType = 'pro_monthly' | 'pro_yearly' | 'lifetime'

interface UpgradeModalProps {
  open:      boolean
  onClose:   () => void
  trigger?:  Trigger
}

const TRIGGER_DESC: Record<Trigger, string> = {
  projects:    "You've reached the project limit",
  sessions:    "You've reached your monthly limit",
  analytics:   'Unlock your full history',
  export:      'CSV export is a Pro feature',
  leaderboard: 'Join the leaderboard with Pro',
  kanban:      'Unlock the Kanban Board',
}

const FEATURES: Array<{ title: string; desc: string }> = [
  { title: 'Unlimited Projects & Sessions',  desc: 'No caps, no limits — track everything' },
  { title: 'Kanban Board',                   desc: 'Visual workflow management for your tasks' },
  { title: 'Full Analytics History',         desc: 'Deep dive into all your past focus sessions' },
  { title: '52-Week Heatmap',                desc: 'See your full year of focus activity at a glance' },
  { title: 'Global Leaderboard',             desc: 'Compete and rank with the Depthly community' },
  { title: 'CSV Export',                     desc: 'Download your data anytime for invoicing or analysis' },
  { title: 'Early Supporter Benefits',       desc: 'Help shape Depthly as one of our first Pro members' },
  { title: 'All Future Pro Features',        desc: 'Instant access to everything we ship next' },
]

// create-checkout returns { error: string } in its response body on failure.
// supabase-js only exposes that body via error.context (the raw Response),
// not error.message — so it has to be read and parsed explicitly here.
async function extractErrorMessage(err: unknown): Promise<string> {
  if (err instanceof FunctionsHttpError) {
    try {
      const body = await err.context.json()
      if (typeof body?.error === 'string') return body.error
    } catch {
      // context wasn't JSON — fall through to the generic message below
    }
  }
  return err instanceof Error ? err.message : 'Could not start checkout. Please try again.'
}

export function UpgradeModal({ open, onClose, trigger }: UpgradeModalProps) {
  const [loadingPlan, setLoadingPlan] = useState<PlanCheckoutType | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleChoose(planType: PlanCheckoutType) {
    setError(null)
    setLoadingPlan(planType)
    try {
      const { data, error: invokeError } = await supabase.functions.invoke<{ url: string }>(
        'create-checkout',
        { body: { planType } },
      )
      if (invokeError || !data?.url) throw invokeError ?? new Error('No checkout URL returned')
      window.location.href = data.url
    } catch (err) {
      console.error('Failed to start Lemon Squeezy checkout:', err)
      setError(await extractErrorMessage(err))
      setLoadingPlan(null)
    }
  }

  function handleClose() {
    setError(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent
        className="border-depth-border bg-depth-surface p-0 gap-0"
        style={{
          maxWidth:      460,
          overflow:      'hidden',
          display:       'flex',
          flexDirection: 'column',
          maxHeight:     '90vh',
        }}
      >

        {/* Fixed header */}
        <DialogHeader className="text-left space-y-1" style={{ padding: '24px 24px 16px', flexShrink: 0 }}>
          <DialogTitle className="flex items-center gap-2 text-[15px] font-semibold text-ink-primary leading-snug">
            <Crown size={20} style={{ color: '#F5A623', flexShrink: 0 }} />
            Upgrade to Depthly Pro
          </DialogTitle>
          <DialogDescription className="text-[13px] text-ink-muted">
            {trigger ? TRIGGER_DESC[trigger] : 'Get unlimited access to everything'}
          </DialogDescription>
        </DialogHeader>

        {/* PRO FEATURES label */}
        <div style={{
          padding:       '0 24px 8px',
          fontSize:      11,
          fontWeight:    600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color:         '#7A7890',
          flexShrink:    0,
        }}>
          Pro Features
        </div>

        {/* Scrollable features list */}
        <div style={{
          overflowY: 'auto',
          padding:   '0 24px',
          flex:       1,
          minHeight:  0,
          maxHeight:  220,
        }}>
          {FEATURES.map(({ title, desc }) => (
            <div key={title} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <CheckCircle size={16} style={{ color: '#3DD68C', flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#E8E6F0' }}>{title}</div>
                <div style={{ fontSize: 11, color: '#7A7890', marginTop: 2 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Fixed bottom — pricing cards + footer */}
        <div style={{
          padding:    '20px 24px 24px',
          borderTop:  '1px solid #2E2E38',
          marginTop:  8,
          flexShrink: 0,
        }}>

          {/* Pricing cards — 3 columns */}
          <div className="grid grid-cols-3 gap-3" style={{ paddingTop: 12 }}>

            {/* Monthly */}
            <div
              className="bg-depth-raised border border-depth-border"
              style={{ borderRadius: 12 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 160, padding: 14 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', color: '#7A7890', textTransform: 'uppercase', marginBottom: 8 }}>
                    Monthly
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span className="font-data" style={{ fontSize: 28, fontWeight: 700, color: '#E8E6F0', lineHeight: 1 }}>$5</span>
                    <span style={{ fontSize: 12, color: '#7A7890', fontWeight: 400 }}>/mo</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#7A7890', marginTop: 6 }}>Billed monthly</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-[12px]"
                  style={{ border: '1px solid #2E2E38' }}
                  isLoading={loadingPlan === 'pro_monthly'}
                  disabled={loadingPlan !== null}
                  onClick={() => handleChoose('pro_monthly')}
                >
                  Choose
                </Button>
              </div>
            </div>

            {/* Yearly (recommended) */}
            <div style={{ position: 'relative' }}>
              <div style={{
                position:        'absolute',
                top:             -12,
                left:            '50%',
                transform:       'translateX(-50%)',
                background:      '#4B9EFF',
                color:           'white',
                fontSize:        10,
                fontWeight:      700,
                letterSpacing:   '0.08em',
                padding:         '3px 10px',
                borderRadius:    999,
                whiteSpace:      'nowrap',
                zIndex:          1,
              }}>
                BEST VALUE
              </div>
              <div
                style={{
                  borderRadius: 12,
                  border:       '1px solid rgba(75,158,255,0.4)',
                  background:   'rgba(75,158,255,0.06)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 160, padding: 14 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', color: '#7A7890', textTransform: 'uppercase', marginBottom: 8 }}>
                      Yearly
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span className="font-data" style={{ fontSize: 28, fontWeight: 700, color: '#E8E6F0', lineHeight: 1 }}>$39</span>
                      <span style={{ fontSize: 12, color: '#7A7890', fontWeight: 400 }}>/year</span>
                    </div>
                    <span
                      style={{
                        display:      'inline-block',
                        fontSize:     11,
                        fontWeight:   500,
                        padding:      '2px 6px',
                        marginTop:    6,
                        color:        '#3DD68C',
                        background:   'rgba(61,214,140,0.12)',
                        borderRadius: 6,
                        lineHeight:   '16px',
                      }}
                    >
                      Save 35%
                    </span>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full text-[12px]"
                    isLoading={loadingPlan === 'pro_yearly'}
                    disabled={loadingPlan !== null}
                    onClick={() => handleChoose('pro_yearly')}
                  >
                    Choose
                  </Button>
                </div>
              </div>
            </div>

            {/* Lifetime */}
            <div
              className="bg-depth-raised border border-depth-border"
              style={{ borderRadius: 12 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 160, padding: 14 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', color: '#7A7890', textTransform: 'uppercase', marginBottom: 8 }}>
                    Lifetime
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span className="font-data" style={{ fontSize: 28, fontWeight: 700, color: '#E8E6F0', lineHeight: 1 }}>$79</span>
                    <span style={{ fontSize: 12, color: '#7A7890', fontWeight: 400 }}>once</span>
                  </div>
                  <div style={{
                    display:      'inline-block',
                    background:   'rgba(200,255,100,0.12)',
                    color:        '#C8FF64',
                    border:       '1px solid rgba(200,255,100,0.3)',
                    borderRadius: 6,
                    padding:      '3px 8px',
                    fontSize:     11,
                    fontWeight:   600,
                    marginTop:    6,
                  }}>
                    Founding member
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-[12px]"
                  style={{ border: '1px solid #2E2E38' }}
                  isLoading={loadingPlan === 'lifetime'}
                  disabled={loadingPlan !== null}
                  onClick={() => handleChoose('lifetime')}
                >
                  Choose
                </Button>
              </div>
            </div>
          </div>

          {/* Checkout error notice */}
          {error && (
            <p className="text-[12px] text-ink-secondary text-center rounded-md bg-depth-raised px-3 py-2 mt-4">
              {error}
            </p>
          )}

          {/* Footer */}
          <div className="flex flex-col items-center text-center mt-4 gap-0">
            <span className="text-[11px] text-ink-muted">
              Cancel anytime · Secure payment by Lemon Squeezy
            </span>
            <button
              onClick={handleClose}
              className="text-[13px] text-ink-muted hover:underline cursor-pointer"
              style={{ background: 'none', border: 'none', marginTop: 8 }}
            >
              Continue with Free Plan
            </button>
          </div>

        </div>

      </DialogContent>
    </Dialog>
  )
}
