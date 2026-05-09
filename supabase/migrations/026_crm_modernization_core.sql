-- Migration 026: CRM Modernization Core (Customer Master, Business Cases, Service Desk)

-- 1. Create Enums
DO $$ BEGIN
  CREATE TYPE customer_type_enum AS ENUM ('individual', 'corporate', 'sme', 'group', 'fleet', 'family');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE case_type_enum AS ENUM ('lead', 'quote', 'proposal', 'policy', 'renewal', 'endorsement', 'claim', 'servicing');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE case_status_enum AS ENUM ('open', 'processing', 'pending_customer', 'pending_insurer', 'won', 'lost', 'done', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE service_category_enum AS ENUM ('ecard_request', 'member_endorsement', 'name_correction', 'address_correction', 'invoice_dispute', 'claim_assistance', 'general_query');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ticket_status_enum AS ENUM ('open', 'in_progress', 'pending', 'resolved', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Expand Customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_type customer_type_enum NOT NULL DEFAULT 'individual';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS pan TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gstin TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tax_id TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS industry_type TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS headcount INTEGER;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS turnover NUMERIC(15,2);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS parent_customer_id UUID REFERENCES customers(id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS rm_user_id UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_parent ON customers(parent_customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_rm ON customers(rm_user_id);

-- 3. Business Cases table
CREATE TABLE IF NOT EXISTS business_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  lob policy_type_enum NOT NULL,
  case_type case_type_enum NOT NULL,
  status case_status_enum NOT NULL DEFAULT 'open',
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  priority lead_priority NOT NULL DEFAULT 'medium',
  sla_deadline TIMESTAMPTZ,
  payload JSONB DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_cases_customer ON business_cases(customer_id);
CREATE INDEX IF NOT EXISTS idx_business_cases_status ON business_cases(status);
CREATE INDEX IF NOT EXISTS idx_business_cases_assigned ON business_cases(assigned_to);
CREATE INDEX IF NOT EXISTS idx_business_cases_deadline ON business_cases(sla_deadline);

-- 4. Service Tickets table
CREATE TABLE IF NOT EXISTS service_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES policies(id) ON DELETE SET NULL,
  category service_category_enum NOT NULL,
  priority lead_priority NOT NULL DEFAULT 'medium',
  status ticket_status_enum NOT NULL DEFAULT 'open',
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sla_deadline TIMESTAMPTZ,
  internal_notes TEXT,
  customer_notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_tickets_customer ON service_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_tickets_policy ON service_tickets(policy_id);
CREATE INDEX IF NOT EXISTS idx_service_tickets_status ON service_tickets(status);
CREATE INDEX IF NOT EXISTS idx_service_tickets_deadline ON service_tickets(sla_deadline);

-- 5. Atomic Counters for new tables
INSERT INTO counters (id, count) VALUES ('business_cases', 0), ('service_tickets', 0) ON CONFLICT (id) DO NOTHING;

-- 6. Helper functions for UIDs
CREATE OR REPLACE FUNCTION next_case_uid()
RETURNS TEXT AS $$
DECLARE
  next_val INTEGER;
BEGIN
  UPDATE counters SET count = count + 1 WHERE id = 'business_cases' RETURNING count INTO next_val;
  RETURN 'BCS-' || LPAD(next_val::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION next_ticket_uid()
RETURNS TEXT AS $$
DECLARE
  next_val INTEGER;
BEGIN
  UPDATE counters SET count = count + 1 WHERE id = 'service_tickets' RETURNING count INTO next_val;
  RETURN 'TKT-' || LPAD(next_val::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- 7. Triggers for UIDs
CREATE OR REPLACE FUNCTION trg_set_case_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.case_number IS NULL OR NEW.case_number = '' THEN
    NEW.case_number := next_case_uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_business_cases_number
  BEFORE INSERT ON business_cases
  FOR EACH ROW EXECUTE FUNCTION trg_set_case_number();

CREATE OR REPLACE FUNCTION trg_set_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := next_ticket_uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_service_tickets_number
  BEFORE INSERT ON service_tickets
  FOR EACH ROW EXECUTE FUNCTION trg_set_ticket_number();

-- 8. Triggers for updated_at
CREATE TRIGGER trg_business_cases_updated_at BEFORE UPDATE ON business_cases FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_service_tickets_updated_at BEFORE UPDATE ON service_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 9. RLS Policies
ALTER TABLE business_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_cases_select" ON business_cases FOR SELECT TO authenticated USING (true);
CREATE POLICY "business_cases_insert" ON business_cases FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "business_cases_update" ON business_cases FOR UPDATE TO authenticated USING (is_admin_or_manager() OR assigned_to = auth.uid());
CREATE POLICY "business_cases_delete" ON business_cases FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY "service_tickets_select" ON service_tickets FOR SELECT TO authenticated USING (true);
CREATE POLICY "service_tickets_insert" ON service_tickets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "service_tickets_update" ON service_tickets FOR UPDATE TO authenticated USING (is_admin_or_manager() OR owner_id = auth.uid());
CREATE POLICY "service_tickets_delete" ON service_tickets FOR DELETE TO authenticated USING (is_admin());

-- 10. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE business_cases;
ALTER PUBLICATION supabase_realtime ADD TABLE service_tickets;
