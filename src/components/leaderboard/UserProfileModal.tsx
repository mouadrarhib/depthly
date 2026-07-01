import { useQuery } from '@tanstack/react-query'

import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/Spinner'
import { useFollowStatus, useFollowUser, useUnfollowUser } from '@/hooks/useLeaderboard'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase/client'
import { formatMinutesToHours } from '@/lib/utils/analytics'

const AVATAR_COLORS = ['#4B9EFF', '#7C3AED', '#059669', '#DC2626', '#D97706', '#DB2777']

function avatarColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function StatCell({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ background: '#1C1C23', borderRadius: 10, padding: '12px 16px' }}>
      <p className="font-data" style={{ fontSize: 20, fontWeight: 600, color: '#E8E6F0', margin: 0 }}>
        {value}
      </p>
      <p style={{ fontSize: 12, color: '#7A7890', margin: '4px 0 0' }}>{label}</p>
    </div>
  )
}

function FollowActionButton({ targetUserId }: { targetUserId: string }) {
  const currentUserId = useAuthStore(s => s.user?.id ?? '')
  const { data: isFollowing, isLoading } = useFollowStatus(targetUserId)
  const follow   = useFollowUser()
  const unfollow = useUnfollowUser()
  const pending  = follow.isPending || unfollow.isPending

  if (!currentUserId || currentUserId === targetUserId) return null
  if (isLoading) return <div style={{ width: 80, height: 36 }} />

  return isFollowing ? (
    <Button variant="ghost" size="sm" isLoading={pending} onClick={() => unfollow.mutate(targetUserId)}
      style={{ color: '#7A7890' }}>
      Following
    </Button>
  ) : (
    <Button variant="default" size="sm" isLoading={pending} onClick={() => follow.mutate(targetUserId)}>
      Follow
    </Button>
  )
}

interface UserProfileModalProps {
  userId:  string
  onClose: () => void
}

export function UserProfileModal({ userId, onClose }: UserProfileModalProps) {
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', 'by-id', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'id, display_name, avatar_url, profile_slug, current_streak, longest_streak, total_focus_minutes, total_sessions',
        )
        .eq('id', userId)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!userId,
  })

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent
        className="p-0 gap-0 overflow-hidden"
        style={{ maxWidth: 420, background: '#141417', border: '1px solid #2E2E38' }}
      >
        {isLoading || !profile ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <Spinner />
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid #2E2E38' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.display_name}
                    style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                  />
                ) : (
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
                    background: avatarColor(profile.display_name),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, fontWeight: 600, color: '#fff',
                  }}>
                    {profile.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 20, fontWeight: 500, color: '#E8E6F0', margin: 0 }}>
                    {profile.display_name}
                  </p>
                  <p style={{ fontSize: 13, color: '#7A7890', margin: '3px 0 0' }}>
                    @{profile.profile_slug}
                  </p>
                </div>
              </div>

              {/* Stats pills */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {profile.current_streak > 0 && (
                  <span style={{
                    padding: '3px 10px', borderRadius: 9999, fontSize: 12,
                    background: 'rgba(200,255,100,0.08)', color: '#C8FF64',
                    border: '1px solid rgba(200,255,100,0.2)',
                  }}>
                    🔥 {profile.current_streak} day streak
                  </span>
                )}
                <span style={{
                  padding: '3px 10px', borderRadius: 9999, fontSize: 12,
                  background: 'rgba(75,158,255,0.1)', color: '#4B9EFF',
                  border: '1px solid rgba(75,158,255,0.2)',
                }}>
                  ⏱ {formatMinutesToHours(profile.total_focus_minutes)}
                </span>
              </div>
            </div>

            {/* Stats grid */}
            <div style={{
              padding: '20px 24px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
            }}>
              <StatCell value={formatMinutesToHours(profile.total_focus_minutes)} label="Total Focus" />
              <StatCell value={String(profile.total_sessions)}                    label="Total Sessions" />
              <StatCell value={`${profile.current_streak}d`}                      label="Current Streak" />
              <StatCell value={`${profile.longest_streak}d`}                      label="Best Streak" />
            </div>

            {/* Actions */}
            <div style={{
              padding: '0 24px 24px',
              display: 'flex',
              gap: 8,
              justifyContent: 'flex-end',
            }}>
              <FollowActionButton targetUserId={profile.id} />
              <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
