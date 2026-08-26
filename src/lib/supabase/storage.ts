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

  // getPublicUrl is deterministic from the bucket+path alone, so re-uploading
  // a new photo with the same file extension as before (the common case —
  // most people re-upload the same format) produces the exact same URL as
  // last time. Browsers (and any CDN in front of Storage) then keep serving
  // the old cached bytes for that URL even though upsert:true really did
  // overwrite the object — the new photo silently never appears. A
  // cache-busting query param makes each upload a distinct URL so it's
  // always treated as a fresh resource.
  const versionedUrl = `${publicUrl}?v=${Date.now()}`

  const { error: updateError } = await supabase.rpc('update_my_profile', {
    p_patch: { avatar_url: versionedUrl },
  })

  if (updateError) throw updateError

  return versionedUrl
}

export async function deleteAvatar(userId: string): Promise<void> {
  // Try all possible extensions; only the one that exists will succeed
  const paths = ['jpg', 'png', 'webp'].map(ext => `${userId}/avatar.${ext}`)

  const { error: removeError } = await supabase.storage
    .from('avatars')
    .remove(paths)

  if (removeError) throw removeError

  const { error: updateError } = await supabase.rpc('update_my_profile', {
    p_patch: { avatar_url: null },
  })

  if (updateError) throw updateError
}
