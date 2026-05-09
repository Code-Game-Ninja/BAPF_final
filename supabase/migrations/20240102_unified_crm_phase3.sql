-- ============================================================
-- Unified CRM Phase 3 Migration
-- GMC & Fleet Integration
-- Run this in your Supabase SQL editor AFTER Phase 1 migration
-- ============================================================

-- ── 1. GMC Members ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gmc_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE RESTRICT,
  employee_id TEXT NOT NULL,
  name TEXT NOT NULL,
  member_type TEXT NOT NULL DEFAULT 'employee' CHECK (member_type IN ('employee','dependent')),
  parent_member_id UUID REFERENCES gmc_members(id),
  dob DATE,
  gender TEXT CHECK (gender IN ('Male','Female','Other')),
  mobile TEXT,
  email TEXT,
  department TEXT,
  designation TEXT,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Inactive','Deleted')),
  deactivated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_gmc_members_customer ON gmc_members(customer_id);
CREATE INDEX IF NOT EXISTS idx_gmc_members_policy ON gmc_members(policy_id);
CREATE INDEX IF NOT EXISTS idx_gmc_members_status ON gmc_members(status);
CREATE INDEX IF NOT EXISTS idx_gmc_members_employee_id ON gmc_members(customer_id, employee_id);

-- ── 2. GMC E-Card Templates ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS gmc_ecard_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  tpa_name TEXT,
  tpa_contact TEXT,
  tpa_email TEXT,
  emergency_contact TEXT,
  logo_url TEXT,
  logo_path TEXT,
  additional_fields JSONB DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id)
);

-- ── 3. GMC E-Card Generations ────────────────────────────────────

CREATE TABLE IF NOT EXISTS gmc_ecard_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES gmc_members(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL REFERENCES policies(id),
  file_url TEXT NOT NULL,
  file_path TEXT NOT NULL,
  generated_by UUID NOT NULL REFERENCES users(id),
  generated_by_name TEXT,
  emailed_to TEXT,
  emailed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ecard_gen_member ON gmc_ecard_generations(member_id);

-- ── 4. GMC Member Endorsements ───────────────────────────────────

CREATE TABLE IF NOT EXISTS gmc_member_endorsements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endorsement_number TEXT NOT NULL UNIQUE,
  policy_id UUID NOT NULL REFERENCES policies(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  member_id UUID REFERENCES gmc_members(id),
  endorsement_type TEXT NOT NULL CHECK (endorsement_type IN ('Addition','Deletion')),
  endorsement_date DATE NOT NULL,
  member_details JSONB NOT NULL DEFAULT '{}',
  reason TEXT,
  pdf_url TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gmc_endorsements_policy ON gmc_member_endorsements(policy_id);

-- ── 5. Fleet Drivers ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fleet_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  name TEXT NOT NULL,
  license_number TEXT NOT NULL UNIQUE,
  license_expiry DATE NOT NULL,
  mobile TEXT,
  address TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fleet_drivers_customer ON fleet_drivers(customer_id);
CREATE INDEX IF NOT EXISTS idx_fleet_drivers_license ON fleet_drivers(license_number);
CREATE INDEX IF NOT EXISTS idx_fleet_drivers_expiry ON fleet_drivers(license_expiry);

-- ── 6. Fleet Vehicles ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fleet_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE RESTRICT,
  registration_number TEXT NOT NULL UNIQUE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  variant TEXT,
  fuel_type TEXT,
  chassis_number TEXT,
  engine_number TEXT,
  mfg_year INTEGER CHECK (mfg_year BETWEEN 1900 AND 2100),
  seating_capacity INTEGER,
  gvw NUMERIC,
  vehicle_category TEXT CHECK (vehicle_category IN ('Two-wheeler','Four-wheeler','Commercial')),
  idv NUMERIC,
  primary_driver_id UUID REFERENCES fleet_drivers(id),
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Inactive','Deleted')),
  deactivated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fleet_vehicles_customer ON fleet_vehicles(customer_id);
CREATE INDEX IF NOT EXISTS idx_fleet_vehicles_policy ON fleet_vehicles(policy_id);
CREATE INDEX IF NOT EXISTS idx_fleet_vehicles_status ON fleet_vehicles(status);
CREATE INDEX IF NOT EXISTS idx_fleet_vehicles_reg ON fleet_vehicles(registration_number);

-- ── 7. Fleet Validity Documents ──────────────────────────────────

CREATE TABLE IF NOT EXISTS fleet_validity_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES fleet_vehicles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'permit_state','permit_national','fitness','puc','rc','tax_state','tax_national'
  )),
  issue_date DATE,
  expiry_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid','expiring_soon','expired')),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vehicle_id, document_type)
);

CREATE INDEX IF NOT EXISTS idx_validity_vehicle ON fleet_validity_documents(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_validity_expiry ON fleet_validity_documents(expiry_date);
CREATE INDEX IF NOT EXISTS idx_validity_status ON fleet_validity_documents(status);

-- ── 8. Fleet Vehicle Endorsements ───────────────────────────────

CREATE TABLE IF NOT EXISTS fleet_vehicle_endorsements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endorsement_number TEXT NOT NULL UNIQUE,
  policy_id UUID NOT NULL REFERENCES policies(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  vehicle_id UUID REFERENCES fleet_vehicles(id),
  endorsement_type TEXT NOT NULL CHECK (endorsement_type IN ('Addition','Deletion')),
  endorsement_date DATE NOT NULL,
  vehicle_details JSONB NOT NULL DEFAULT '{}',
  reason TEXT,
  pdf_url TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fleet_endorsements_policy ON fleet_vehicle_endorsements(policy_id);

-- ── 9. Bulk Upload Jobs ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bulk_upload_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL CHECK (job_type IN ('gmc_members','fleet_vehicles')),
  customer_id UUID NOT NULL REFERENCES customers(id),
  policy_id UUID NOT NULL REFERENCES policies(id),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  total_rows INTEGER DEFAULT 0,
  successful_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  error_report_url TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 10. RLS Policies ─────────────────────────────────────────────

ALTER TABLE gmc_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE fleet_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fleet_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE fleet_validity_documents ENABLE ROW LEVEL SECURITY;

-- GMC members: accessible by admin/manager, or employee assigned to the customer
CREATE POLICY gmc_members_access ON gmc_members
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin','manager')
    )
    OR EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = gmc_members.customer_id
        AND (c.assigned_rm = auth.uid() OR c.created_by = auth.uid())
    )
  );

-- Fleet vehicles: same pattern
CREATE POLICY fleet_vehicles_access ON fleet_vehicles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin','manager')
    )
    OR EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = fleet_vehicles.customer_id
        AND (c.assigned_rm = auth.uid() OR c.created_by = auth.uid())
    )
  );

-- Fleet drivers: accessible by admin/manager
CREATE POLICY fleet_drivers_access ON fleet_drivers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin','manager')
    )
    OR EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = fleet_drivers.customer_id
        AND (c.assigned_rm = auth.uid() OR c.created_by = auth.uid())
    )
  );

-- Fleet validity documents: via vehicle access
CREATE POLICY fleet_validity_access ON fleet_validity_documents
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM fleet_vehicles fv
      JOIN customers c ON c.id = fv.customer_id
      WHERE fv.id = fleet_validity_documents.vehicle_id
        AND (
          EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin','manager'))
          OR c.assigned_rm = auth.uid()
          OR c.created_by = auth.uid()
        )
    )
  );

-- ── 11. pg_cron: Validity Alerts (run after enabling pg_cron) ────

-- Uncomment after enabling pg_cron extension:
-- SELECT cron.schedule('fleet-validity-alerts', '0 6 * * *', $$
--   UPDATE fleet_validity_documents
--   SET status = CASE
--     WHEN expiry_date < CURRENT_DATE THEN 'expired'
--     WHEN expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
--     ELSE 'valid'
--   END
--   WHERE status != CASE
--     WHEN expiry_date < CURRENT_DATE THEN 'expired'
--     WHEN expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
--     ELSE 'valid'
--   END;
-- $$);

-- ── 12. Verify migration ─────────────────────────────────────────

DO $$
BEGIN
  ASSERT (
    SELECT COUNT(*) FROM information_schema.tables
    WHERE table_name IN (
      'gmc_members','gmc_ecard_templates','gmc_ecard_generations',
      'gmc_member_endorsements','fleet_vehicles','fleet_drivers',
      'fleet_validity_documents','fleet_vehicle_endorsements','bulk_upload_jobs'
    )
  ) = 9, 'Phase 3 tables missing';

  RAISE NOTICE 'Phase 3 migration verified successfully';
END;
$$;
