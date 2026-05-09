-- ============================================================
-- Unified CRM Phase 4 - Advanced Features
-- Migration: 20240103_unified_crm_phase4.sql
-- ============================================================

-- ── 1. renewal_pipeline ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS renewal_pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id),
  assigned_rm UUID REFERENCES users(id),
  stage TEXT NOT NULL DEFAULT 'due'
    CHECK (stage IN ('due','contacted','negotiating','renewed','lost')),
  risk_score INTEGER DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  risk_score_updated_at TIMESTAMPTZ,
  lost_reason TEXT,
  renewed_policy_id UUID REFERENCES policies(id),
  entered_pipeline_at TIMESTAMPTZ DEFAULT NOW(),
  stage_updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_contact_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(policy_id)
);

CREATE INDEX IF NOT EXISTS idx_renewal_pipeline_stage ON renewal_pipeline(stage);
CREATE INDEX IF NOT EXISTS idx_renewal_pipeline_rm ON renewal_pipeline(assigned_rm);
CREATE INDEX IF NOT EXISTS idx_renewal_pipeline_risk ON renewal_pipeline(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_renewal_pipeline_customer ON renewal_pipeline(customer_id);

-- ── 2. renewal_stage_history ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS renewal_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  renewal_id UUID NOT NULL REFERENCES renewal_pipeline(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES users(id),
  changed_by_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_renewal_history_renewal ON renewal_stage_history(renewal_id);

-- ── 3. follow_up_tasks ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS follow_up_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  renewal_id UUID NOT NULL REFERENCES renewal_pipeline(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL CHECK (task_type IN ('call','email','meeting','whatsapp')),
  due_date TIMESTAMPTZ NOT NULL,
  notes TEXT,
  assigned_to UUID NOT NULL REFERENCES users(id),
  assigned_to_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','snoozed')),
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_follow_up_renewal ON follow_up_tasks(renewal_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_due ON follow_up_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_follow_up_assigned ON follow_up_tasks(assigned_to);

-- ── 4. quote_requests ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS quote_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES customers(id),
  policy_type TEXT NOT NULL,
  coverage_requirements TEXT,
  target_insurers TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','quotes_received','converted','expired','cancelled')),
  linked_renewal_id UUID REFERENCES renewal_pipeline(id),
  linked_lead_id UUID REFERENCES sales_leads(id),
  assigned_to UUID NOT NULL REFERENCES users(id),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_requests_customer ON quote_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_status ON quote_requests(status);

-- ── 5. quotes ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id UUID NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
  insurer_name TEXT NOT NULL,
  premium_amount NUMERIC NOT NULL CHECK (premium_amount > 0),
  sum_insured NUMERIC NOT NULL CHECK (sum_insured > 0),
  coverage_details TEXT,
  terms TEXT,
  validity_date DATE NOT NULL,
  document_url TEXT,
  document_path TEXT,
  is_recommended BOOLEAN DEFAULT FALSE,
  is_accepted BOOLEAN DEFAULT FALSE,
  is_expired BOOLEAN DEFAULT FALSE,
  converted_policy_id UUID REFERENCES policies(id),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotes_request ON quotes(quote_request_id);
CREATE INDEX IF NOT EXISTS idx_quotes_validity ON quotes(validity_date);

-- ── 6. commission_reconciliation_runs ────────────────────────────

CREATE TABLE IF NOT EXISTS commission_reconciliation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insurer_name TEXT NOT NULL,
  statement_period_start DATE NOT NULL,
  statement_period_end DATE NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL DEFAULT '',
  total_records INTEGER DEFAULT 0,
  matched_count INTEGER DEFAULT 0,
  discrepancy_count INTEGER DEFAULT 0,
  total_statement_amount NUMERIC DEFAULT 0,
  total_crm_amount NUMERIC DEFAULT 0,
  total_discrepancy_amount NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','completed','failed')),
  error_message TEXT,
  report_url TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_recon_runs_insurer ON commission_reconciliation_runs(insurer_name);
CREATE INDEX IF NOT EXISTS idx_recon_runs_status ON commission_reconciliation_runs(status);

-- ── 7. commission_reconciliation_records ─────────────────────────

CREATE TABLE IF NOT EXISTS commission_reconciliation_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES commission_reconciliation_runs(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES policies(id),
  policy_number TEXT,
  statement_premium NUMERIC,
  statement_commission NUMERIC,
  statement_commission_rate NUMERIC,
  crm_premium NUMERIC,
  crm_commission NUMERIC,
  crm_commission_rate NUMERIC,
  match_status TEXT NOT NULL CHECK (match_status IN ('matched','discrepancy')),
  discrepancy_type TEXT CHECK (discrepancy_type IN (
    'amount_mismatch','policy_not_found','duplicate','missing_in_statement'
  )),
  discrepancy_amount NUMERIC,
  resolution_status TEXT DEFAULT 'unresolved'
    CHECK (resolution_status IN ('unresolved','accept_statement','accept_crm','escalated')),
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  service_ticket_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recon_records_run ON commission_reconciliation_records(run_id);
CREATE INDEX IF NOT EXISTS idx_recon_records_policy ON commission_reconciliation_records(policy_id);
CREATE INDEX IF NOT EXISTS idx_recon_records_status ON commission_reconciliation_records(match_status);

-- ── 8. compliance_items ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS compliance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'license_renewal','regulatory_filing','audit_submission',
    'training_certification','policy_review','other'
  )),
  description TEXT,
  due_date DATE NOT NULL,
  assigned_to UUID REFERENCES users(id),
  assigned_to_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','completed','overdue')),
  recurrence TEXT NOT NULL DEFAULT 'one_time'
    CHECK (recurrence IN ('one_time','monthly','quarterly','half_yearly','annual')),
  completion_document_url TEXT,
  completion_notes TEXT,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id),
  parent_item_id UUID REFERENCES compliance_items(id),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_status ON compliance_items(status);
CREATE INDEX IF NOT EXISTS idx_compliance_due ON compliance_items(due_date);
CREATE INDEX IF NOT EXISTS idx_compliance_assigned ON compliance_items(assigned_to);

-- ── 9. irda_reports ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS irda_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL CHECK (report_type IN (
    'business_summary','premium_register','commission_register','claims_register'
  )),
  period_type TEXT NOT NULL CHECK (period_type IN ('monthly','quarterly','annual')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  file_url TEXT NOT NULL DEFAULT '',
  file_path TEXT NOT NULL DEFAULT '',
  file_format TEXT NOT NULL CHECK (file_format IN ('excel','pdf')),
  generated_by UUID NOT NULL REFERENCES users(id),
  generated_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_irda_reports_type ON irda_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_irda_reports_period ON irda_reports(period_start, period_end);

-- ── 10. commission_rates ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS commission_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insurer_name TEXT NOT NULL,
  policy_type TEXT NOT NULL,
  rate_type TEXT NOT NULL CHECK (rate_type IN ('percentage','flat')),
  rate_value NUMERIC NOT NULL CHECK (rate_value >= 0),
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(insurer_name, policy_type, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_commission_rates_insurer ON commission_rates(insurer_name);
CREATE INDEX IF NOT EXISTS idx_commission_rates_type ON commission_rates(policy_type);

-- ── RLS Policies ─────────────────────────────────────────────────

ALTER TABLE renewal_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE renewal_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_reconciliation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_reconciliation_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE irda_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_rates ENABLE ROW LEVEL SECURITY;

-- Service role bypass (used by API routes via supabaseAdmin)
CREATE POLICY "service_role_all_renewal_pipeline" ON renewal_pipeline
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_renewal_stage_history" ON renewal_stage_history
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_follow_up_tasks" ON follow_up_tasks
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_quote_requests" ON quote_requests
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_quotes" ON quotes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_recon_runs" ON commission_reconciliation_runs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_recon_records" ON commission_reconciliation_records
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_compliance_items" ON compliance_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_irda_reports" ON irda_reports
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_commission_rates" ON commission_rates
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated read policies
CREATE POLICY "authenticated_read_renewal_pipeline" ON renewal_pipeline
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_renewal_stage_history" ON renewal_stage_history
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_follow_up_tasks" ON follow_up_tasks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_quote_requests" ON quote_requests
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_quotes" ON quotes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_recon_runs" ON commission_reconciliation_runs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_recon_records" ON commission_reconciliation_records
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_compliance_items" ON compliance_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_irda_reports" ON irda_reports
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_commission_rates" ON commission_rates
  FOR SELECT TO authenticated USING (true);

-- ── Verification ─────────────────────────────────────────────────

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'renewal_pipeline',
    'renewal_stage_history',
    'follow_up_tasks',
    'quote_requests',
    'quotes',
    'commission_reconciliation_runs',
    'commission_reconciliation_records',
    'compliance_items',
    'irda_reports',
    'commission_rates'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      RAISE EXCEPTION 'Table % does not exist', tbl;
    END IF;
  END LOOP;
  RAISE NOTICE 'Phase 4 migration verified: all 10 tables exist';
END $$;
