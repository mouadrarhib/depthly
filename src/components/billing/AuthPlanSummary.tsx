import { Card } from '@/components/ui/Card'
import { checkoutIntentFromDestination } from '@/lib/checkoutIntent'

export function AuthPlanSummary({ destination }: { destination: string }) {
  const intent = checkoutIntentFromDestination(destination)
  if (!intent) return null

  return (
    <Card className="mt-6 border-depth-border bg-depth-surface p-4 shadow-none">
      <p className="text-base font-medium text-ink-primary">{intent.name} selected</p>
      <p className="font-data mt-1 text-sm text-ink-primary">{intent.price}</p>
      <p className="mt-2 text-sm leading-6 text-ink-primary/80">
        After signing in, review your plan and continue to secure checkout. Payment is collected there.
      </p>
    </Card>
  )
}
