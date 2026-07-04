import { GoalSettings } from '@/components/goals/GoalSettings'

export function GoalsSection() {
  return (
    <div>
      <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-text)', marginBottom: 12 }}>
        Focus Goals
      </p>
      <div style={{ borderTop: '1px solid var(--color-border)', marginBottom: 20 }} />
      <GoalSettings />
    </div>
  )
}
