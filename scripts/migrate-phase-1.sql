-- ============================================================
-- PHASE 1: Customer Master + Client 360
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ── 1. Extend customers table ────────────────────────────────
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS customer_type TEXT NOT NULL DEFAULT 'individual'
    CHECK (customer_type IN ('individual','corporate','sme','government','contractor',
                    'manufacturer','transporter','trader','other')),
  ADD COLUMN IF NOT EXISTS entity_meta JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'pending'
    CHECK (kyc_status IN ('pending','verified','rejected','expired')),
  ADD COLUMN IF NOT EXISTS assigned_rm UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id);

-- Backfill existing rows
UPDATE customers SET customer_type = 'individual' WHERE customer_type IS NULL;

-- ── 2. Indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_customers_type     ON customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_status   ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_rm       ON customers(assigned_rm);
CREATE INDEX IF NOT EXISTS idx_customers_meta     ON customers USING GIN(entity_meta);
CREATE INDEX IF NOT EXISTS idx_customers_name_fts ON customers USING GIN(to_tsvector('english', name));

-- ── 3. customer_family_members ───────────────────────────────
CREATE TABLE IF NOT EXISTS customer_family_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  relationship  TEXT NOT NULL,
  dob           DATE,
  gender        TEXT CHECK (gender IN ('male','female','other')),
  mobile        TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_family_members_customer ON customer_family_members(customer_id);

-- ── 4. customer_corporate_members ───────────────────────────
CREATE TABLE IF NOT EXISTS customer_corporate_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  designation     TEXT,
  department      TEXT,
  email           TEXT,
  mobile          TEXT,
  role            TEXT,
  branch_location TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_corporate_members_customer ON customer_corporate_members(customer_id);

-- ── 5. Row-Level Security ────────────────────────────────────
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customers_admin_all    ON customers;
DROP POLICY IF EXISTS customers_manager_all  ON customers;
DROP POLICY IF EXISTS customers_employee_own ON customers;

CREATE POLICY customers_admin_all ON customers
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY customers_manager_all ON customers
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'manager'));

CREATE POLICY customers_employee_own ON customers
  FOR SELECT TO authenticated
  USING (assigned_rm = auth.uid() OR created_by = auth.uid());

SELECT 'Phase 1 migration complete' AS status;
