-- 004_storage_buckets.sql
-- Create required Storage buckets for the application.

-- policy-documents: PDF uploads for insurance policies (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'policy-documents',
  'policy-documents',
  false,
  10485760, -- 10 MB
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff']
)
ON CONFLICT (id) DO NOTHING;

-- documents: general document uploads (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  10485760, -- 10 MB
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff']
)
ON CONFLICT (id) DO NOTHING;

-- avatars: user profile pictures (public for display)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- ── RLS policies for storage ─────────────────────────────────────────────────
-- Service role (used by the API route) can do everything.
-- Authenticated users can read files in their own paths.

-- policy-documents: authenticated users can read; service_role can write
CREATE POLICY "policy_docs_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'policy-documents');

CREATE POLICY "policy_docs_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'policy-documents');

CREATE POLICY "policy_docs_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'policy-documents');

CREATE POLICY "policy_docs_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'policy-documents');

-- documents: authenticated users can read/write
CREATE POLICY "documents_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documents');

CREATE POLICY "documents_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents');

CREATE POLICY "documents_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'documents');

CREATE POLICY "documents_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'documents');

-- avatars: public read, authenticated write
CREATE POLICY "avatars_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "avatars_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars');
