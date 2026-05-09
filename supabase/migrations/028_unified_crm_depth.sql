-- Migration 028: Unified CRM Depth (Metadata Extensions & Validity Registry)

-- 1. Expand Customers Table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS family_id UUID;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS entity_meta JSONB DEFAULT '{}';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS kyc_status kyc_status DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_customers_family ON customers(family_id);
CREATE INDEX IF NOT EXISTS idx_customers_entity_meta ON customers USING GIN (entity_meta);

-- 2. Expand Policies Table
ALTER TABLE policies ADD COLUMN IF NOT EXISTS motor_meta JSONB DEFAULT '{}';
ALTER TABLE policies ADD COLUMN IF NOT EXISTS life_meta JSONB DEFAULT '{}';
ALTER TABLE policies ADD COLUMN IF NOT EXISTS health_meta JSONB DEFAULT '{}';
ALTER TABLE policies ADD COLUMN IF NOT EXISTS commercial_meta JSONB DEFAULT '{}';
ALTER TABLE policies ADD COLUMN IF NOT EXISTS finance_meta JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_policies_motor_meta ON policies USING GIN (motor_meta);
CREATE INDEX IF NOT EXISTS idx_policies_life_meta ON policies USING GIN (life_meta);
CREATE INDEX IF NOT EXISTS idx_policies_finance_meta ON policies USING GIN (finance_meta);

-- 3. Validity Registry Table
DO $$ BEGIN
  CREATE TYPE validity_doc_type AS ENUM ('permit_state', 'permit_national', 'fitness', 'puc', 'rc', 'tax_state', 'tax_national');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE validity_status AS ENUM ('valid', 'expiring_soon', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS validity_registry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id UUID REFERENCES policies(id) ON DELETE CASCADE,
  vehicle_number TEXT NOT NULL,
  document_type validity_doc_type NOT NULL,
  expiry_date DATE NOT NULL,
  status validity_status NOT NULL DEFAULT 'valid',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_validity_policy ON validity_registry(policy_id);
CREATE INDEX IF NOT EXISTS idx_validity_vehicle ON validity_registry(vehicle_number);
CREATE INDEX IF NOT EXISTS idx_validity_expiry ON validity_registry(expiry_date);

-- Register for Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE validity_registry;

-- 4. Customer Family Mapping Table (Optional but helps for complex trees)
CREATE TABLE IF NOT EXISTS customer_family_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  relationship TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fam_members_family ON customer_family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_fam_members_customer ON customer_family_members(customer_id);

-- RLS for Validity Registry
ALTER TABLE validity_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "validity_registry_select" ON validity_registry FOR SELECT TO authenticated USING (true);
CREATE POLICY "validity_registry_insert" ON validity_registry FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "validity_registry_update" ON validity_registry FOR UPDATE TO authenticated USING (is_admin_or_manager());

-- RLS for Family Members
ALTER TABLE customer_family_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fam_members_select" ON customer_family_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "fam_members_insert" ON customer_family_members FOR INSERT TO authenticated WITH CHECK (true);
