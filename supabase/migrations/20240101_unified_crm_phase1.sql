-- ============================================================
-- Unified CRM Phase 1 Migration
-- Customer Master + Client 360
-- Run this in your Supabase SQL editor
-- ============================================================

-- ── 1. Extend customers table ────────────────────────────────────

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS customer_type TEXT NOT NULL DEFAULT 'individual'
    CHECK (customer_type IN (
      'individual','corporate','sme','government','contractor',
      'manufacturer','transporter','trader','other'
    )),
  ADD COLUMN IF NOT EXISTS entity_meta JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'pending'
    CHECK (kyc_status IN ('pending','verified','rejected','expired')),
  ADD COLUMN IF NOT EXISTS assigned_rm UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- ── 2. Indexes for performance ───────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_customers_type
  ON customers(customer_type);

CREATE INDEX IF NOT EXISTS idx_customers_status
  ON customers(status);

CREATE INDEX IF NOT EXISTS idx_customers_assigned_rm
  ON customers(assigned_rm);

CREATE INDEX IF NOT EXISTS idx_customers_entity_meta
  ON customers USING GIN(entity_meta);

CREATE INDEX IF NOT EXISTS idx_customers_name_search
  ON customers USING GIN(to_tsvector('english', name));

CREATE INDEX IF NOT EXISTS idx_customers_phone
  ON customers(phone);

CREATE INDEX IF NOT EXISTS idx_customers_email
  ON customers(email);

-- ── 3. Backfill existing customers ───────────────────────────────

UPDATE customers
SET customer_type = 'individual'
WHERE customer_type IS NULL OR customer_type = '';

-- ── 4. customer_family_members table ─────────────────────────────

CREATE TABLE IF NOT EXISTS customer_family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  dob DATE,
  gender TEXT CHECK (gender IN ('male','female','other')),
  mobile TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_family_members_customer
  ON customer_family_members(customer_id);

-- ── 5. customer_corporate_members table ──────────────────────────

CREATE TABLE IF NOT EXISTS customer_corporate_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  designation TEXT,
  department TEXT,
  email TEXT,
  mobile TEXT,
  role TEXT,
  branch_location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_corporate_members_customer
  ON customer_corporate_members(customer_id);

-- ── 6. Row-Level Security ─────────────────────────────────────────

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS customers_admin_all ON customers;
DROP POLICY IF EXISTS customers_manager_all ON customers;
DROP POLICY IF EXISTS customers_employee_own ON customers;

-- Admin: full access
CREATE POLICY customers_admin_all ON customers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

-- Manager: full access
CREATE POLICY customers_manager_all ON customers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'manager'
    )
  );

-- Employee: only assigned or created customers
CREATE POLICY customers_employee_own ON customers
  FOR SELECT TO authenticated
  USING (
    assigned_rm = auth.uid()
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin','manager')
    )
  );

-- RLS for family members
ALTER TABLE customer_family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY family_members_via_customer ON customer_family_members
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = customer_family_members.customer_id
        AND (
          c.assigned_rm = auth.uid()
          OR c.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
              AND u.role IN ('admin','manager')
          )
        )
    )
  );

-- RLS for corporate members
ALTER TABLE customer_corporate_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY corporate_members_via_customer ON customer_corporate_members
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = customer_corporate_members.customer_id
        AND (
          c.assigned_rm = auth.uid()
          OR c.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
              AND u.role IN ('admin','manager')
          )
        )
    )
  );

-- ── 7. Helper: next_customer_uid RPC (if not exists) ─────────────

CREATE OR REPLACE FUNCTION next_customer_uid()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_val INTEGER;
  uid TEXT;
BEGIN
  -- Atomic increment using system_config table
  INSERT INTO system_config (key, value, category)
  VALUES ('customer_uid_counter', '{"count": 1}'::jsonb, 'counters')
  ON CONFLICT (key) DO UPDATE
    SET value = jsonb_set(
      system_config.value,
      '{count}',
      to_jsonb((system_config.value->>'count')::integer + 1)
    )
  RETURNING (value->>'count')::integer INTO next_val;

  uid := 'C-' || LPAD(next_val::text, 4, '0');
  RETURN uid;
END;
$$;

-- ── 8. Verify migration ───────────────────────────────────────────

DO $$
BEGIN
  ASSERT (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_name = 'customers'
      AND column_name IN ('customer_type','entity_meta','kyc_status','assigned_rm','deleted_at','deleted_by')
  ) = 6, 'customers table columns missing';

  ASSERT (
    SELECT COUNT(*) FROM information_schema.tables
    WHERE table_name IN ('customer_family_members','customer_corporate_members')
  ) = 2, 'member tables missing';

  RAISE NOTICE 'Phase 1 migration verified successfully';
END;
$$;
