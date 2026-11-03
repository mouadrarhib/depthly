import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/Card'
import { useCreateCheckout } from '@/hooks/useBilling'
import type { CheckoutIntent } from '@/lib/checkoutIntent'

interface SelectedPlanCheckoutProps {
  intent: CheckoutIntent
  onDismiss: () => void
  disabled: boolean
}

export function SelectedPlanCheckout({ intent, onDismiss, disabled }: SelectedPlanCheckoutProps) {
  const checkout = useCreateCheckout()

  return (
    <Card className="border-depth-border bg-depth-surface p-5 shadow-none sm:p-6">
      <h2 className="text-lg font-medium text-ink-primary">Continue with {intent.name}</h2>
      <p className="font-data mt-2 text-base text-ink-primary">{intent.price}</p>
      <p className="mt-3 text-sm leading-6 text-ink-primary/80">
        Your selection is saved. Review the final total and enter payment details on Lemon Squeezy.
      </p>
      {checkout.error && (
        <p role="alert" className="mt-3 text-sm leading-6 text-ink-primary">
          {checkout.error.message} Your selection is still saved. Please try again.
        </p>
      )}
      <div className="mt-5 flex flex-col gap-3 sm:items-start">
        <Button
          className="w-full sm:w-auto"
          isLoading={checkout.isPending}
          disabled={disabled || checkout.isPending || checkout.isSuccess}
          onClick={() => checkout.mutate(intent.planType)}
        >
          Continue to secure checkout
        </Button>
        <Button variant="ghost" disabled={checkout.isPending || checkout.isSuccess} onClick={onDismiss}>
          Keep my current plan
        </Button>
      </div>
    </Card>
  )
}
