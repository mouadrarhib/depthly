-- ============================================================================
-- MIGRATION 004 — avatars Storage policies (v2, replaces 003)
-- ============================================================================
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
--
-- Uses split_part() instead of storage.foldername() which is not available
-- in all Supabase versions.
--
-- Object path inside the bucket: {userId}/avatar.{ext}
-- split_part(name, '/', 1) extracts the first segment = userId
-- ============================================================================

-- Drop previous policies if they exist (safe to re-run)
DROP POLICY IF EXISTS "avatar_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatar_update" ON storage.objects;
DROP POLICY IF EXISTS "avatar_delete" ON storage.objects;
DROP POLICY IF EXISTS "avatar_select" ON storage.objects;

-- Authenticated users can upload to their own folder only
CREATE POLICY "avatar_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND split_part(name, '/', 1) = auth.uid()::text
);

-- Required for upsert: true — lets the same path be overwritten
CREATE POLICY "avatar_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND split_part(name, '/', 1) = auth.uid()::text
);

-- Authenticated users can delete from their own folder only
CREATE POLICY "avatar_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND split_part(name, '/', 1) = auth.uid()::text
);

-- Public reads (anyone can view avatars)
CREATE POLICY "avatar_select"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');
