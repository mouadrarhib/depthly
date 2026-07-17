import { useEffect, useState } from 'react'

interface StepperProps {
  value:    number
  min:      number
  max:      number
  step?:    number
  onChange: (val: number) => void
}

export function Stepper({ value, min, max, step = 1, onChange }: StepperProps) {
  // Local text buffer so the field can hold in-progress input (e.g. an
  // empty string while the user is clearing it to retype) without forcing
  // it back to a clamped number on every keystroke. Only reconciled with
  // `value` on blur/Enter, or when `value` changes from outside (the +/-
  // buttons, or a parent resetting it).
  const [text, setText] = useState(String(value))

  useEffect(() => {
    setText(String(value))
  }, [value])

  function commit() {
    const parsed = Math.round(Number(text))
    if (text.trim() === '' || Number.isNaN(parsed)) {
      setText(String(value))
      return
    }
    const clamped = Math.max(min, Math.min(max, parsed))
    setText(String(clamped))
    if (clamped !== value) onChange(clamped)
  }

  return (
    <div className="flex items-center rounded-lg border border-border bg-surface-overlay">
      <button
        onClick={() => onChange(Math.max(min, value - step))}
        disabled={value <= min}
        className="px-3 py-2 text-text-muted transition-colors hover:text-text
                   disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Decrease"
      >
        −
      </button>

      <input
        type="text"
        inputMode="numeric"
        value={text}
        onChange={e => setText(e.target.value.replace(/[^0-9]/g, ''))}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
        aria-label="Value"
        className="font-data border-0 bg-transparent p-0 text-center text-base font-medium
                   text-text outline-none"
        style={{ width: 48 }}
      />

      <button
        onClick={() => onChange(Math.min(max, value + step))}
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
