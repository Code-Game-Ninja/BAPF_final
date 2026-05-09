-- ============================================================
-- Migration 025: Customer KYC access and null constraints
-- ============================================================

-- 1. Allow 'uploaded_by' to be NULL so customers can upload
ALTER TABLE public.kyc_documents ALTER COLUMN uploaded_by DROP NOT NULL;

-- 2. Allow customers to SELECT their own KYC documents
DROP POLICY IF EXISTS "kyc_customer_select" ON public.kyc_documents;
CREATE POLICY "kyc_customer_select"
  ON public.kyc_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.customer_portal_users
      WHERE customer_portal_users.auth_user_id = auth.uid()
      AND customer_portal_users.customer_id = kyc_documents.customer_id
    )
  );

-- 3. Allow customers to INSERT their own KYC documents
DROP POLICY IF EXISTS "kyc_customer_insert" ON public.kyc_documents;
CREATE POLICY "kyc_customer_insert"
  ON public.kyc_documents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customer_portal_users
      WHERE customer_portal_users.auth_user_id = auth.uid()
      AND customer_portal_users.customer_id = kyc_documents.customer_id
    )
    -- Customers should not be allowed to forge 'uploaded_by' or 'verified_by'
    AND uploaded_by IS NULL
    AND verified_by IS NULL
    AND status = 'pending'
  );
