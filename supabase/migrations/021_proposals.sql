-- ============================================================
-- Migration 021: Proposals & Proposal Timeline
-- ============================================================

DO $$ BEGIN
  CREATE TYPE proposal_status AS ENUM ('draft', 'submitted', 'under_review', 'quote_received', 'approved', 'rejected', 'converted', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposal_number TEXT NOT NULL,
  customer_id UUID REFERENCES customers(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  policy_type TEXT NOT NULL,
  insurer_name TEXT,
  sum_insured NUMERIC(14,2),
  premium_quoted NUMERIC(12,2),
  premium_final NUMERIC(12,2),
  coverage_details TEXT,
  status proposal_status NOT NULL DEFAULT 'draft',
  assigned_to UUID NOT NULL REFERENCES users(id),
  assigned_to_name TEXT,
  notes TEXT,
  valid_until DATE,
  converted_policy_id UUID REFERENCES policies(id),
  converted_at TIMESTAMPTZ,
  rejection_reason TEXT,
  pdf_url TEXT,
  branch_id UUID REFERENCES branches(id),
  created_by UUID NOT NULL REFERENCES users(id),
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposals_customer ON proposals(customer_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_assigned ON proposals(assigned_to);
CREATE INDEX IF NOT EXISTS idx_proposals_policy_type ON proposals(policy_type);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON proposals(created_at DESC);

-- Counter
INSERT INTO counters (id, count) VALUES ('proposals', 0) ON CONFLICT (id) DO NOTHING;

-- Auto-generate proposal number
CREATE OR REPLACE FUNCTION generate_proposal_number()
RETURNS TRIGGER AS $$
DECLARE
  next_val INTEGER;
BEGIN
  UPDATE counters SET count = count + 1 WHERE id = 'proposals' RETURNING count INTO next_val;
  NEW.proposal_number := 'PROP-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(next_val::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_proposal_number ON proposals;
CREATE TRIGGER trg_proposal_number
  BEFORE INSERT ON proposals
  FOR EACH ROW
  WHEN (NEW.proposal_number IS NULL OR NEW.proposal_number = '')
  EXECUTE FUNCTION generate_proposal_number();

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_proposals_updated_at ON proposals;
CREATE TRIGGER trg_proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Proposal Timeline
CREATE TABLE IF NOT EXISTS proposal_timeline (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  description TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  performed_by UUID NOT NULL REFERENCES users(id),
  performed_by_name TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposal_timeline_proposal ON proposal_timeline(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_timeline_created ON proposal_timeline(created_at DESC);

-- RLS
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_timeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proposals_admin_all" ON proposals;
CREATE POLICY "proposals_admin_all" ON proposals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

DROP POLICY IF EXISTS "proposals_employee_select" ON proposals;
CREATE POLICY "proposals_employee_select" ON proposals
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'employee')
  );

DROP POLICY IF EXISTS "proposals_employee_insert" ON proposals;
CREATE POLICY "proposals_employee_insert" ON proposals
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'employee')
  );

DROP POLICY IF EXISTS "proposals_employee_update" ON proposals;
CREATE POLICY "proposals_employee_update" ON proposals
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'employee')
    AND assigned_to = auth.uid()
  );

DROP POLICY IF EXISTS "proposal_timeline_select" ON proposal_timeline;
CREATE POLICY "proposal_timeline_select" ON proposal_timeline
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "proposal_timeline_insert" ON proposal_timeline;
CREATE POLICY "proposal_timeline_insert" ON proposal_timeline
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE proposals;
ALTER PUBLICATION supabase_realtime ADD TABLE proposal_timeline;
