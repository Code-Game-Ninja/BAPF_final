-- ============================================================
-- Migration 020: KYC Documents
-- ============================================================

DO $$ BEGIN
  CREATE TYPE kyc_document_type AS ENUM ('aadhaar', 'pan', 'gst', 'address_proof', 'passport', 'driving_license', 'voter_id', 'bank_statement', 'company_registration', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE kyc_status AS ENUM ('pending', 'verified', 'rejected', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS kyc_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  document_type kyc_document_type NOT NULL,
  document_number TEXT,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  status kyc_status NOT NULL DEFAULT 'pending',
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  expiry_date DATE,
  notes TEXT,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kyc_customer ON kyc_documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_kyc_type ON kyc_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_kyc_status ON kyc_documents(status);

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_kyc_documents_updated_at ON kyc_documents;
CREATE TRIGGER trg_kyc_documents_updated_at
  BEFORE UPDATE ON kyc_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Storage bucket for KYC documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('kyc-documents', 'kyc-documents', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE kyc_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kyc_admin_all" ON kyc_documents;
CREATE POLICY "kyc_admin_all" ON kyc_documents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

DROP POLICY IF EXISTS "kyc_employee_select" ON kyc_documents;
CREATE POLICY "kyc_employee_select" ON kyc_documents
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'employee')
  );

DROP POLICY IF EXISTS "kyc_employee_insert" ON kyc_documents;
CREATE POLICY "kyc_employee_insert" ON kyc_documents
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'employee')
  );

-- Storage policies for KYC bucket
DROP POLICY IF EXISTS "kyc_storage_insert" ON storage.objects;
CREATE POLICY "kyc_storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'kyc-documents' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "kyc_storage_select" ON storage.objects;
CREATE POLICY "kyc_storage_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'kyc-documents' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "kyc_storage_delete" ON storage.objects;
CREATE POLICY "kyc_storage_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'kyc-documents' AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE kyc_documents;
