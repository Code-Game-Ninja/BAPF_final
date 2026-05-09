-- ============================================================
-- Migration 019: Expanded User Fields, Policy Fields & Endorsements
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. User Designation & Hierarchical Mapping
-- ──────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE user_designation AS ENUM ('employee', 'bqp', 'posp');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE users ADD COLUMN IF NOT EXISTS designation user_designation DEFAULT 'employee';
ALTER TABLE users ADD COLUMN IF NOT EXISTS mapped_manager_id UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS mapped_bqp_id UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_users_designation ON users(designation);
CREATE INDEX IF NOT EXISTS idx_users_mapped_manager ON users(mapped_manager_id);

-- ──────────────────────────────────────────────────────────────
-- 2. Additional Policy Fields
-- ──────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE business_type AS ENUM ('fresh', 'renewal');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_method_type AS ENUM ('cash', 'cheque', 'neft', 'rtgs', 'upi', 'card', 'online', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE policies ADD COLUMN IF NOT EXISTS business_type business_type DEFAULT 'fresh';
ALTER TABLE policies ADD COLUMN IF NOT EXISTS login_date DATE;
ALTER TABLE policies ADD COLUMN IF NOT EXISTS payment_method payment_method_type;
ALTER TABLE policies ADD COLUMN IF NOT EXISTS endorsement_details TEXT;
ALTER TABLE policies ADD COLUMN IF NOT EXISTS bqp_id UUID REFERENCES users(id);
ALTER TABLE policies ADD COLUMN IF NOT EXISTS posp_id UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_policies_business_type ON policies(business_type);
CREATE INDEX IF NOT EXISTS idx_policies_login_date ON policies(login_date);
CREATE INDEX IF NOT EXISTS idx_policies_bqp ON policies(bqp_id);
CREATE INDEX IF NOT EXISTS idx_policies_posp ON policies(posp_id);

-- ──────────────────────────────────────────────────────────────
-- 3. Endorsements Table
-- ──────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE endorsement_status AS ENUM ('pending', 'approved', 'rejected', 'processed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE endorsement_type AS ENUM ('name_change', 'address_change', 'sum_insured_change', 'premium_change', 'vehicle_change', 'nominee_change', 'coverage_extension', 'cancellation', 'reinstatement', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS endorsements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endorsement_number TEXT NOT NULL,
  policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  policy_number TEXT,
  customer_id UUID REFERENCES customers(id),
  customer_name TEXT,
  endorsement_type endorsement_type NOT NULL DEFAULT 'other',
  description TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  premium_difference NUMERIC(12,2) DEFAULT 0,
  status endorsement_status NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  pdf_url TEXT,
  insurer_name TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_endorsements_policy ON endorsements(policy_id);
CREATE INDEX IF NOT EXISTS idx_endorsements_customer ON endorsements(customer_id);
CREATE INDEX IF NOT EXISTS idx_endorsements_status ON endorsements(status);
CREATE INDEX IF NOT EXISTS idx_endorsements_type ON endorsements(endorsement_type);

-- Endorsement counter
INSERT INTO counters (id, count) VALUES ('endorsements', 0) ON CONFLICT (id) DO NOTHING;

-- Auto-generate endorsement number
CREATE OR REPLACE FUNCTION generate_endorsement_number()
RETURNS TRIGGER AS $$
DECLARE
  next_val INTEGER;
BEGIN
  UPDATE counters SET count = count + 1 WHERE id = 'endorsements' RETURNING count INTO next_val;
  NEW.endorsement_number := 'END-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(next_val::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_endorsement_number ON endorsements;
CREATE TRIGGER trg_endorsement_number
  BEFORE INSERT ON endorsements
  FOR EACH ROW
  WHEN (NEW.endorsement_number IS NULL OR NEW.endorsement_number = '')
  EXECUTE FUNCTION generate_endorsement_number();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_endorsements_updated_at ON endorsements;
CREATE TRIGGER trg_endorsements_updated_at
  BEFORE UPDATE ON endorsements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE endorsements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "endorsements_admin_all" ON endorsements;
CREATE POLICY "endorsements_admin_all" ON endorsements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

DROP POLICY IF EXISTS "endorsements_employee_select" ON endorsements;
CREATE POLICY "endorsements_employee_select" ON endorsements
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'employee')
  );

DROP POLICY IF EXISTS "endorsements_employee_insert" ON endorsements;
CREATE POLICY "endorsements_employee_insert" ON endorsements
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'employee')
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE endorsements;
