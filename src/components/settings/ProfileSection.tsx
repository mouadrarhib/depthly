import { useState, useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, X } from 'lucide-react'

import { useProfile } from '@/hooks/useAnalytics'
import {
  useUpdateProfile,
  useUploadAvatar,
  useCheckSlugAvailable,
} from '@/hooks/useSettings'
import { useCanAppearOnLeaderboard } from '@/hooks/usePlanLimits'
import { useAuthStore } from '@/store/authStore'
import { analyticsKeys, settingsKeys } from '@/lib/queryKeys'
import { deleteAvatar } from '@/lib/supabase/storage'
import { UpgradeModal } from '@/components/billing/UpgradeModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/switch'
import { Spinner } from '@/components/ui/Spinner'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

function getAvatarColor(name: string): string {
  const colors = ['#4B9EFF', '#3DD68C', '#F5A623', '#F25C5C', '#A78BFA', '#F472B6', '#FB923C', '#34D399']
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken'

export function ProfileSection() {
  const qc            = useQueryClient()
  const { data: profile, isLoading } = useProfile()
  const updateProfile = useUpdateProfile()
  const uploadAvatar  = useUploadAvatar()
  const checkSlug     = useCheckSlugAvailable()
  const userId        = useAuthStore(s => s.user?.id ?? '')
  const user          = useAuthStore(s => s.user)
  const setUser       = useAuthStore(s => s.setUser)
  const { canAppear }  = useCanAppearOnLeaderboard()
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  // Stable ref so the debounce closure always calls the latest version
  const checkSlugRef = useRef(checkSlug)
  useEffect(() => { checkSlugRef.current = checkSlug })

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [imgError, setImgError]                       = useState(false)
  const [displayName, setDisplayName]                 = useState('')
  const [slug, setSlug]                               = useState('')
  const [slugStatus, setSlugStatus]                   = useState<SlugStatus>('idle')
  const [slugValidationError, setSlugValidationError] = useState<string | null>(null)
  const [uploadError, setUploadError]                 = useState<string | null>(null)
  const [saved, setSaved]                             = useState(false)
  const [photoSaved, setPhotoSaved]                   = useState(false)
  // undefined = defer to profile cache; null = just deleted; string = just uploaded
  const [localAvatarUrl, setLocalAvatarUrl]           = useState<string | null | undefined>(undefined)

  // Sync local fields from profile on first load only (ref prevents reset on refetch)
  const hasSynced = useRef(false)
  useEffect(() => {
    if (!profile || hasSynced.current) return
    setDisplayName(profile.display_name)
    setSlug(profile.profile_slug)
    hasSynced.current = true
  }, [profile])

  // Debounced slug availability check
  useEffect(() => {
    if (!profile) return

    if (slug === profile.profile_slug) {
      setSlugStatus('idle')
      setSlugValidationError(null)
      return
    }
    if (slug.length > 0 && slug.length < 3) {
      setSlugStatus('idle')
      setSlugValidationError('Must be at least 3 characters')
      return
    }
    if (slug.length >= 3 && !/^[a-z0-9-]+$/.test(slug)) {
      setSlugStatus('idle')
      setSlugValidationError('Only lowercase letters, numbers, and hyphens')
      return
    }
    if (slug.length < 3) {
      setSlugStatus('idle')
      setSlugValidationError(null)
      return
    }

    setSlugValidationError(null)
    setSlugStatus('checking')
    const timer = setTimeout(async () => {
      try {
        const available = await checkSlugRef.current(slug)
        setSlugStatus(available ? 'available' : 'taken')
      } catch {
        setSlugStatus('idle')
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [slug, profile?.profile_slug]) // eslint-disable-line react-hooks/exhaustive-deps

  // Inline mutation — no separate useDeleteAvatar hook exists yet
  const deleteAvatarMutation = useMutation({
    mutationFn: () => deleteAvatar(userId),
    onSuccess: () => {
      setLocalAvatarUrl(null)
      setImgError(false)
      qc.invalidateQueries({ queryKey: analyticsKeys.profile(userId) })
      qc.invalidateQueries({ queryKey: settingsKeys.profile(userId) })
      if (user) setUser({ ...user, user_metadata: { ...user.user_metadata, avatar_url: null } })
    },
  })

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    uploadAvatar.mutate(file, {
      onSuccess: (publicUrl) => {
        setLocalAvatarUrl(publicUrl)
        setImgError(false)
        setPhotoSaved(true)
        setTimeout(() => setPhotoSaved(false), 2000)
        qc.invalidateQueries({ queryKey: analyticsKeys.profile(userId) })
      },
      onError: (err) => setUploadError(err instanceof Error ? err.message : 'Upload failed'),
    })
    e.target.value = ''
  }

  const isDirty =
    displayName !== (profile?.display_name ?? '') ||
    slug !== (profile?.profile_slug ?? '')

  const canSave =
    isDirty &&
    slugStatus !== 'checking' &&
    slugStatus !== 'taken' &&
    !slugValidationError &&
    displayName.trim().length > 0

  function handleSave() {
    const changes: { display_name?: string; profile_slug?: string } = {}
    if (displayName.trim() !== profile?.display_name) changes.display_name = displayName.trim()
    if (slug !== profile?.profile_slug)               changes.profile_slug = slug
    updateProfile.mutate(changes, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: analyticsKeys.profile(userId) })
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      },
    })
  }

  // Prefer local state for immediate feedback; fall back to server value
  const avatarUrl = localAvatarUrl !== undefined ? localAvatarUrl : profile?.avatar_url

  if (isLoading) {
    return (
      <div style={{
        background:    'var(--color-surface-raised)',
        border:        '1px solid var(--color-border)',
        borderRadius:  12,
        padding:       24,
        display:       'flex',
        alignItems:    'center',
        justifyContent:'center',
        minHeight:     120,
      }}>
        <Spinner />
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div>
        {/* Section title */}
        <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-text)', marginBottom: 12 }}>
          Profile
        </p>

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--color-border)', marginBottom: 20 }} />

        {/* Card */}
        <div style={{
          background:    'var(--color-surface-raised)',
          border:        '1px solid var(--color-border)',
          borderRadius:  12,
          padding:       24,
          display:       'flex',
          flexDirection: 'column',
          gap:           24,
        }}>

          {/* ── Avatar row ───────────────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {avatarUrl && !imgError ? (
              <img
                src={avatarUrl}
                alt={profile?.display_name}
                onError={() => setImgError(true)}
                style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
              />
            ) : (
              <div style={{
                width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
                backgroundColor: getAvatarColor(profile?.display_name ?? ''),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 600, color: '#fff',
              }}>
                {profile?.display_name?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Button
                  variant="ghost"
                  size="sm"
                  isLoading={uploadAvatar.isPending}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload photo
                </Button>
                {photoSaved && (
                  <span style={{ fontSize: 12, color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Check size={12} /> Photo saved
                  </span>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                {avatarUrl && (
                  <button
                    onClick={() => deleteAvatarMutation.mutate()}
                    disabled={deleteAvatarMutation.isPending}
                    style={{
                      background: 'none',
                      border:     'none',
                      padding:    '4px 8px',
                      borderRadius: 6,
                      fontSize:   13,
                      fontWeight: 500,
                      color:      'var(--color-error)',
                      cursor:     'pointer',
                      opacity:    deleteAvatarMutation.isPending ? 0.5 : 1,
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
              <span style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>
                Max 2MB · JPG, PNG or WebP
              </span>
              {uploadError && (
                <span style={{ fontSize: 11, color: 'var(--color-error)' }}>{uploadError}</span>
              )}
            </div>
          </div>

          {/* ── Display name ─────────────────────────────────────────────── */}
          <Input
            label="Display name"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            maxLength={50}
          />

          {/* ── Profile URL slug ─────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-muted)' }}>
              Profile URL
            </label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span
                className="font-data"
                style={{
                  fontSize:    13,
                  color:       'var(--color-text-faint)',
                  background:  'var(--color-surface-overlay)',
                  border:      '1px solid var(--color-border)',
                  borderRight: 'none',
                  borderRadius:'6px 0 0 6px',
                  padding:     '0 10px',
                  height:      40,
                  display:     'flex',
                  alignItems:  'center',
                  whiteSpace:  'nowrap',
                  flexShrink:  0,
                }}
              >
                depthly.app/u/
              </span>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  value={slug}
                  onChange={e => setSlug(e.target.value)}
                  style={{
                    width:        '100%',
                    height:       40,
                    padding:      '0 36px 0 10px',
                    fontSize:     13,
                    background:   'var(--color-surface-overlay)',
                    border:       '1px solid var(--color-border)',
                    borderRadius: '0 6px 6px 0',
                    color:        'var(--color-text)',
                    outline:      'none',
                    boxSizing:    'border-box',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-brand)' }}
                  onBlur={e  => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
                />
                <div style={{
                  position:  'absolute',
                  right:     10,
                  top:       '50%',
                  transform: 'translateY(-50%)',
                  display:   'flex',
                  alignItems:'center',
                }}>
                  {slugStatus === 'checking'  && <Spinner size="sm" />}
                  {slugStatus === 'available' && <Check size={14} color="var(--color-success)" />}
                  {slugStatus === 'taken'     && <X     size={14} color="var(--color-error)"   />}
                </div>
              </div>
            </div>
            {slugValidationError ? (
              <span style={{ fontSize: 11, color: 'var(--color-error)' }}>{slugValidationError}</span>
            ) : slugStatus === 'available' ? (
              <span style={{ fontSize: 11, color: 'var(--color-success)' }}>Available</span>
            ) : slugStatus === 'taken' ? (
              <span style={{ fontSize: 11, color: 'var(--color-error)' }}>Taken</span>
            ) : null}
          </div>

          {/* ── Public profile toggle ─────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)', marginBottom: 4 }}>
                Public profile
              </p>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', maxWidth: 320 }}>
                Appear on the global leaderboard and allow others to view your profile
              </p>
            </div>
            <Switch
              checked={profile?.is_public ?? false}
              onCheckedChange={checked => {
                if (checked && !canAppear) {
                  setUpgradeOpen(true)
                  return
                }
                updateProfile.mutate({ is_public: checked })
              }}
              disabled={updateProfile.isPending}
            />
          </div>

          {/* ── Show heatmap toggle ───────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)', marginBottom: 4 }}>
                Show yearly heatmap
              </p>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', maxWidth: 320 }}>
                Display your focus activity heatmap on your public profile
              </p>
            </div>
            {profile?.is_public ? (
              <Switch
                checked={profile.show_heatmap_on_profile}
                onCheckedChange={checked => updateProfile.mutate({ show_heatmap_on_profile: checked })}
                disabled={updateProfile.isPending}
              />
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  {/* span intercepts mouse events so tooltip fires on disabled switch */}
                  <span style={{ display: 'inline-flex' }}>
                    <Switch checked={profile?.show_heatmap_on_profile ?? false} disabled />
                  </span>
                </TooltipTrigger>
                <TooltipContent>Enable public profile first</TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* ── Save button ───────────────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 4 }}>
            <Button
              variant="primary"
              size="sm"
              isLoading={updateProfile.isPending}
              disabled={!canSave || updateProfile.isPending}
              onClick={handleSave}
            >
              Save changes
            </Button>
            {saved && (
              <span style={{
                fontSize:   12,
                color:      'var(--color-success)',
                display:    'flex',
                alignItems: 'center',
                gap:        4,
              }}>
                <Check size={12} /> Saved
              </span>
            )}
          </div>
        </div>
      </div>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} trigger="leaderboard" />
    </TooltipProvider>
  )
}
