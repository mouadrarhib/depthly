interface StepperProps {
  value:    number
  min:      number
  max:      number
  onChange: (val: number) => void
}

export function Stepper({ value, min, max, onChange }: StepperProps) {
  return (
    <div className="flex items-center rounded-lg border border-border bg-surface-overlay">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="px-3 py-2 text-text-muted transition-colors hover:text-text
                   disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Decrease"
      >
        −
      </button>

      <span
        className="font-data text-base font-medium text-text"
        style={{ minWidth: 48, textAlign: 'center' }}
      >
        {value}
      </span>

      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="px-3 py-2 text-text-muted transition-colors hover:text-text
                   disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Increase"
      >
        +
      </button>
    </div>
  )
}
