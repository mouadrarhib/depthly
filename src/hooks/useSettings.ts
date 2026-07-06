import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { useAuthStore } from '@/store/authStore'
import { settingsKeys, analyticsKeys } from '@/lib/queryKeys'
import {
  fetchUserPreferences,
  updateUserPreferences,
  updateProfile,
  checkSlugAvailable,
  updateEmail,
  updatePassword,
  deleteAccount,
} from '@/lib/supabase/queries/settings'
import type { UpdatePreferencesInput, UpdateProfileInput } from '@/lib/supabase/queries/settings'
import { uploadAvatar } from '@/lib/supabase/storage'

export function usePreferences() {
  const userId = useAuthStore(s => s.user?.id ?? '')
  return useQuery({
    queryKey: settingsKeys.preferences(userId),
    queryFn:  () => fetchUserPreferences(userId),
    enabled:  !!userId,
  })
}

export function useUpdatePreferences() {
  const qc     = useQueryClient()
  const userId = useAuthStore(s => s.user?.id ?? '')
  return useMutation({
    mutationFn: (data: UpdatePreferencesInput) => updateUserPreferences(userId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.preferences(userId) })
      qc.invalidateQueries({ queryKey: analyticsKeys.profile(userId) })
    },
  })
}

export function useUpdateProfile() {
  const qc     = useQueryClient()
  const userId = useAuthStore(s => s.user?.id ?? '')
  return useMutation({
    mutationFn: (data: UpdateProfileInput) => updateProfile(userId, data),
    onSuccess: (updatedProfile) => {
      qc.setQueryData(settingsKeys.profile(userId), updatedProfile)
      qc.invalidateQueries({ queryKey: analyticsKeys.profile(userId) })
      qc.invalidateQueries({ queryKey: ['leaderboard'] })
    },
  })
}

export function useCheckSlugAvailable() {
  const userId = useAuthStore(s => s.user?.id ?? '')
  return (slug: string) => checkSlugAvailable(slug, userId)
}

export function useUpdateEmail() {
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const mutation = useMutation({
    mutationFn: (newEmail: string) => updateEmail(newEmail),
    onSuccess:  () => setSuccessMessage('Email updated successfully'),
  })
  return { ...mutation, successMessage }
}

export function useUpdatePassword() {
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const mutation = useMutation({
    mutationFn: (newPassword: string) => updatePassword(newPassword),
    onSuccess:  () => setSuccessMessage('Password updated'),
  })
  return { ...mutation, successMessage }
}

export function useUploadAvatar() {
  const qc      = useQueryClient()
  const userId  = useAuthStore(s => s.user?.id ?? '')
  const user    = useAuthStore(s => s.user)
  const setUser = useAuthStore(s => s.setUser)
  return useMutation({
    mutationFn: (file: File) => uploadAvatar(userId, file),
    onSuccess: (publicUrl) => {
      qc.invalidateQueries({ queryKey: settingsKeys.profile(userId) })
      if (user) {
        setUser({
          ...user,
          user_metadata: { ...user.user_metadata, avatar_url: publicUrl },
        })
      }
    },
  })
}

export function useDeleteAccount() {
  const qc      = useQueryClient()
  const userId  = useAuthStore(s => s.user?.id ?? '')
  const setUser = useAuthStore(s => s.setUser)
  const navigate = useNavigate()
  return useMutation({
    mutationFn: () => deleteAccount(userId),
    onSuccess: () => {
      qc.clear()
      setUser(null)
      navigate('/login')
    },
  })
}
