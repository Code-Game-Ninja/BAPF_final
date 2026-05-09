-- ============================================================
-- 012 — Sales Leads Module
-- Creates tables, enums, RPC functions, indexes, RLS, triggers,
-- and realtime publication for the Sales Lead Management system.
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. ENUM TYPES
-- ──────────────────────────────────────────────────────────────

CREATE TYPE lead_status AS ENUM (
  'new', 'contacted', 'follow_up', 'interested',
  'not_interested', 'converted', 'lost'
);

CREATE TYPE lead_source AS ENUM (
  'referral', 'walk_in', 'online', 'telecall',
  'social_media', 'agent', 'other'
);

CREATE TYPE lead_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- ──────────────────────────────────────────────────────────────
-- 2. TABLES
-- ──────────────────────────────────────────────────────────────

-- 2.1 Sales Leads (main table)
CREATE TABLE sales_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_number TEXT NOT NULL UNIQUE,
  lead_date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  alt_mobile TEXT,
  email TEXT,
  source lead_source NOT NULL DEFAULT 'other',
  assigned_to UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_to_name TEXT,
  priority lead_priority NOT NULL DEFAULT 'medium',
  status lead_status NOT NULL DEFAULT 'new',
  notes TEXT,
  follow_up_date DATE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  -- Conversion tracking
  converted_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ,
  -- Lead scoring (optional, future)
  lead_score INTEGER DEFAULT 0,
  -- Audit & ownership
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_by_name TEXT,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.2 Lead Timeline / Activity Log
CREATE TABLE lead_timeline (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES sales_leads(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  performed_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  performed_by_name TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.3 Lead Documents
CREATE TABLE lead_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES sales_leads(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  document_type TEXT DEFAULT 'general',
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────
-- 3. COUNTER for lead_number auto-increment
-- ──────────────────────────────────────────────────────────────

INSERT INTO counters (id, count) VALUES ('sales_leads', 0)
  ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────────────────────────
-- 4. RPC FUNCTIONS
-- ──────────────────────────────────────────────────────────────

-- 4.1 Atomic lead UID generation
CREATE OR REPLACE FUNCTION next_lead_uid()
RETURNS TEXT AS $$
DECLARE
  next_count INTEGER;
BEGIN
  UPDATE counters SET count = count + 1
    WHERE id = 'sales_leads'
    RETURNING count INTO next_count;
  RETURN 'LID-' || LPAD(next_count::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- 4.2 Bulk lead UID generation (for CSV import)
CREATE OR REPLACE FUNCTION bulk_next_lead_uids(n INTEGER)
RETURNS TEXT[] AS $$
DECLARE
  start_count INTEGER;
  result TEXT[];
BEGIN
  UPDATE counters SET count = count + n
    WHERE id = 'sales_leads'
    RETURNING count - n + 1 INTO start_count;
  SELECT ARRAY(
    SELECT 'LID-' || LPAD((start_count + i)::TEXT, 3, '0')
    FROM generate_series(0, n - 1) AS i
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ──────────────────────────────────────────────────────────────
-- 5. INDEXES
-- ──────────────────────────────────────────────────────────────

CREATE INDEX idx_sales_leads_status ON sales_leads(status);
CREATE INDEX idx_sales_leads_source ON sales_leads(source);
CREATE INDEX idx_sales_leads_priority ON sales_leads(priority);
CREATE INDEX idx_sales_leads_assigned ON sales_leads(assigned_to);
CREATE INDEX idx_sales_leads_branch ON sales_leads(branch_id);
CREATE INDEX idx_sales_leads_follow_up ON sales_leads(follow_up_date);
CREATE INDEX idx_sales_leads_created_by ON sales_leads(created_by);
CREATE INDEX idx_sales_leads_customer ON sales_leads(converted_customer_id);
CREATE INDEX idx_sales_leads_lead_date ON sales_leads(lead_date);
CREATE INDEX idx_sales_leads_mobile ON sales_leads(mobile);
CREATE INDEX idx_lead_timeline_lead ON lead_timeline(lead_id);
CREATE INDEX idx_lead_timeline_created ON lead_timeline(created_at DESC);
CREATE INDEX idx_lead_documents_lead ON lead_documents(lead_id);

-- ──────────────────────────────────────────────────────────────
-- 6. ROW LEVEL SECURITY
-- ──────────────────────────────────────────────────────────────

ALTER TABLE sales_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_documents ENABLE ROW LEVEL SECURITY;

-- ── Sales Leads ──
-- Admin/Manager see all leads
CREATE POLICY "leads_select_admin_mgr" ON sales_leads
  FOR SELECT TO authenticated
  USING (is_admin_or_manager());

-- Employee sees only their assigned leads
CREATE POLICY "leads_select_employee" ON sales_leads
  FOR SELECT TO authenticated
  USING (
    NOT is_admin_or_manager()
    AND assigned_to = auth.uid()
  );

-- All authenticated can create leads
CREATE POLICY "leads_insert" ON sales_leads
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Admin/Manager can update any lead
CREATE POLICY "leads_update_admin_mgr" ON sales_leads
  FOR UPDATE TO authenticated
  USING (is_admin_or_manager());

-- Employee can update only their assigned leads
CREATE POLICY "leads_update_employee" ON sales_leads
  FOR UPDATE TO authenticated
  USING (
    NOT is_admin_or_manager()
    AND assigned_to = auth.uid()
  );

-- Only admin can delete leads
CREATE POLICY "leads_delete" ON sales_leads
  FOR DELETE TO authenticated
  USING (is_admin());

-- ── Lead Timeline ──
CREATE POLICY "timeline_select" ON lead_timeline
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "timeline_insert" ON lead_timeline
  FOR INSERT TO authenticated WITH CHECK (true);

-- ── Lead Documents ──
CREATE POLICY "lead_docs_select" ON lead_documents
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "lead_docs_insert" ON lead_documents
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "lead_docs_delete" ON lead_documents
  FOR DELETE TO authenticated USING (is_admin_or_manager());

-- ──────────────────────────────────────────────────────────────
-- 7. TRIGGERS
-- ──────────────────────────────────────────────────────────────

-- 7.1 Auto-update updated_at columns
CREATE TRIGGER trg_sales_leads_updated_at
  BEFORE UPDATE ON sales_leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_lead_timeline_updated_at
  BEFORE UPDATE ON lead_timeline
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_lead_documents_updated_at
  BEFORE UPDATE ON lead_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 7.2 Auto-track status changes and reassignments in timeline
CREATE OR REPLACE FUNCTION trg_lead_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Track status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO lead_timeline (lead_id, action, description, old_value, new_value, performed_by, performed_by_name)
    VALUES (
      NEW.id,
      'status_change',
      format('Status changed from %s to %s', OLD.status, NEW.status),
      OLD.status::TEXT,
      NEW.status::TEXT,
      COALESCE(auth.uid(), NEW.created_by),
      ''
    );
  END IF;

  -- Track reassignments
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO lead_timeline (lead_id, action, description, old_value, new_value, performed_by, performed_by_name)
    VALUES (
      NEW.id,
      'reassigned',
      format('Lead reassigned from %s to %s', COALESCE(OLD.assigned_to_name, 'Unknown'), COALESCE(NEW.assigned_to_name, 'Unknown')),
      OLD.assigned_to::TEXT,
      NEW.assigned_to::TEXT,
      COALESCE(auth.uid(), NEW.created_by),
      ''
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_sales_lead_after_update
  AFTER UPDATE ON sales_leads
  FOR EACH ROW EXECUTE FUNCTION trg_lead_status_change();

-- ──────────────────────────────────────────────────────────────
-- 8. REALTIME PUBLICATION
-- ──────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE sales_leads;
ALTER PUBLICATION supabase_realtime ADD TABLE lead_timeline;
ALTER PUBLICATION supabase_realtime ADD TABLE lead_documents;
