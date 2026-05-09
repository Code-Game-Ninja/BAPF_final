-- ============================================================
-- Migration 022: Claims & Claim Timeline
-- ============================================================

DO $$ BEGIN
  CREATE TYPE claim_status AS ENUM ('registered', 'documents_pending', 'under_review', 'surveyor_appointed', 'assessment_done', 'approved', 'settled', 'rejected', 'withdrawn', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE claim_type AS ENUM ('own_damage', 'third_party', 'death', 'health', 'fire', 'theft', 'natural_disaster', 'accident', 'liability', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_number TEXT NOT NULL,
  policy_id UUID NOT NULL REFERENCES policies(id),
  policy_number TEXT,
  customer_id UUID NOT NULL REFERENCES customers(id),
  customer_name TEXT NOT NULL,
  claim_type claim_type NOT NULL DEFAULT 'other',
  claim_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  settled_amount NUMERIC(14,2),
  status claim_status NOT NULL DEFAULT 'registered',
  claim_date DATE NOT NULL DEFAULT CURRENT_DATE,
  incident_date DATE,
  incident_description TEXT,
  incident_location TEXT,
  surveyor_name TEXT,
  surveyor_phone TEXT,
  surveyor_report_url TEXT,
  settlement_date DATE,
  rejection_reason TEXT,
  insurer_name TEXT,
  insurer_claim_ref TEXT,
  hospital_name TEXT,
  department TEXT,
  documents JSONB DEFAULT '[]',
  remarks TEXT,
  assigned_to UUID REFERENCES users(id),
  assigned_to_name TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claims_policy ON claims(policy_id);
CREATE INDEX IF NOT EXISTS idx_claims_customer ON claims(customer_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_type ON claims(claim_type);
CREATE INDEX IF NOT EXISTS idx_claims_insurer ON claims(insurer_name);
CREATE INDEX IF NOT EXISTS idx_claims_date ON claims(claim_date DESC);
CREATE INDEX IF NOT EXISTS idx_claims_department ON claims(department);

-- Counter
INSERT INTO counters (id, count) VALUES ('claims', 0) ON CONFLICT (id) DO NOTHING;

-- Auto-generate claim number
CREATE OR REPLACE FUNCTION generate_claim_number()
RETURNS TRIGGER AS $$
DECLARE
  next_val INTEGER;
BEGIN
  UPDATE counters SET count = count + 1 WHERE id = 'claims' RETURNING count INTO next_val;
  NEW.claim_number := 'CLM-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(next_val::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_claim_number ON claims;
CREATE TRIGGER trg_claim_number
  BEFORE INSERT ON claims
  FOR EACH ROW
  WHEN (NEW.claim_number IS NULL OR NEW.claim_number = '')
  EXECUTE FUNCTION generate_claim_number();

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_claims_updated_at ON claims;
CREATE TRIGGER trg_claims_updated_at
  BEFORE UPDATE ON claims
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Claim Timeline
CREATE TABLE IF NOT EXISTS claim_timeline (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  performed_by UUID NOT NULL REFERENCES users(id),
  performed_by_name TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claim_timeline_claim ON claim_timeline(claim_id);

-- Claim Documents
CREATE TABLE IF NOT EXISTS claim_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  document_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claim_docs_claim ON claim_documents(claim_id);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('claim-documents', 'claim-documents', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "claims_admin_all" ON claims;
CREATE POLICY "claims_admin_all" ON claims
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

DROP POLICY IF EXISTS "claims_employee_select" ON claims;
CREATE POLICY "claims_employee_select" ON claims
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'employee')
  );

DROP POLICY IF EXISTS "claims_employee_insert" ON claims;
CREATE POLICY "claims_employee_insert" ON claims
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'employee')
  );

DROP POLICY IF EXISTS "claims_employee_update" ON claims;
CREATE POLICY "claims_employee_update" ON claims
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'employee')
    AND (assigned_to = auth.uid() OR created_by = auth.uid())
  );

DROP POLICY IF EXISTS "claim_timeline_authenticated" ON claim_timeline;
CREATE POLICY "claim_timeline_authenticated" ON claim_timeline
  FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "claim_documents_authenticated" ON claim_documents;
CREATE POLICY "claim_documents_authenticated" ON claim_documents
  FOR ALL USING (auth.role() = 'authenticated');

-- Storage policies
DROP POLICY IF EXISTS "claim_storage_insert" ON storage.objects;
CREATE POLICY "claim_storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'claim-documents' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "claim_storage_select" ON storage.objects;
CREATE POLICY "claim_storage_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'claim-documents' AND auth.role() = 'authenticated');

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE claims;
ALTER PUBLICATION supabase_realtime ADD TABLE claim_timeline;
