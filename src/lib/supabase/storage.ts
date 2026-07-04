// MANUAL STEP: Create 'avatars' bucket in
// Supabase Dashboard → Storage → New bucket
// Name: avatars, Public: true

import { supabase } from '@/lib/supabase/client'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
const MAX_SIZE_BYTES = 2 * 1024 * 1024

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number])) {
    throw new Error('Avatar must be a JPEG, PNG, or WebP image.')
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('Avatar must be smaller than 2 MB.')
  }

  const path = `${userId}/avatar.${EXT[file.type]}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) {
    console.error('[storage] upload failed:', uploadError.message, uploadError)
    throw uploadError
  }

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(path)

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', userId)

  if (updateError) throw updateError

  return publicUrl
}

export async function deleteAvatar(userId: string): Promise<void> {
  // Try all possible extensions; only the one that exists will succeed
  const paths = ['jpg', 'png', 'webp'].map(ext => `${userId}/avatar.${ext}`)

  const { error: removeError } = await supabase.storage
    .from('avatars')
    .remove(paths)

  if (removeError) throw removeError

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: null })
    .eq('id', userId)

  if (updateError) throw updateError
}
