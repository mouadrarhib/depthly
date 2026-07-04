import { ProfileSection }       from '@/components/settings/ProfileSection'
import { GoalsSection }         from '@/components/settings/GoalsSection'
import { TimerSection }         from '@/components/settings/TimerSection'
import { NotificationsSection } from '@/components/settings/NotificationsSection'
import { AccountSection }       from '@/components/settings/AccountSection'
import { DangerZoneSection }    from '@/components/settings/DangerZoneSection'

export function SettingsPage() {
  return (
    <div style={{ padding: '24px 32px', maxWidth: 720, margin: '0 auto' }}>
      <p style={{ fontSize: 22, fontWeight: 500, color: 'var(--color-text)', marginBottom: 32 }}>
        Settings
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <ProfileSection />
        <GoalsSection />
        <TimerSection />
        <NotificationsSection />
        <AccountSection />
        <DangerZoneSection />
      </div>
    </div>
  )
}
