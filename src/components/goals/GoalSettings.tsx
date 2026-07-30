import { GoalForm } from '@/components/goals/GoalForm'

export function GoalSettings() {
  return (
    <div
      style={{
        background:   'var(--color-surface)',
        border:       '1px solid var(--color-border)',
        borderRadius: 14,
        padding:      24,
      }}
    >
      {/* Header */}
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>
        Focus Goals
      </span>

      <div
        style={{
          borderTop: '1px solid var(--color-border)',
          margin:    '16px 0',
        }}
      />

      <GoalForm />
    </div>
  )
}
