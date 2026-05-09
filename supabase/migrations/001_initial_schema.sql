-- ============================================================
-- BP & AF Insurance Broker — Supabase PostgreSQL Migration
-- Replaces Firebase Firestore + Cloud Functions
-- Run in Supabase SQL Editor: Dashboard > SQL Editor > New Query
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 0. EXTENSIONS
-- ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ──────────────────────────────────────────────────────────────
-- 1. CUSTOM ENUM TYPES
-- ──────────────────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'employee');
CREATE TYPE user_status AS ENUM ('active', 'inactive');
CREATE TYPE policy_status AS ENUM ('active', 'expired', 'cancelled', 'archived');
CREATE TYPE policy_type_enum AS ENUM (
  'motor', 'health', 'life', 'fire', 'marine', 'burglary',
  'liability', 'workmen_compensation', 'car_ear', 'surety_bond',
  'travel', 'other'
);
CREATE TYPE payment_frequency AS ENUM ('annual', 'semi-annual', 'quarterly', 'monthly', 'single');
CREATE TYPE renewal_status AS ENUM ('due', 'contacted', 'renewed', 'lost');
CREATE TYPE premium_status AS ENUM ('pending', 'collected', 'overdue');
CREATE TYPE commission_status AS ENUM ('pending', 'approved', 'paid', 'rejected');
CREATE TYPE commission_type AS ENUM ('percentage', 'flat');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'half-day', 'late', 'leave');
CREATE TYPE early_checkout_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'completed');

-- ──────────────────────────────────────────────────────────────
-- 2. TABLES
-- ──────────────────────────────────────────────────────────────

-- 2.1 Branches
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  pincode TEXT NOT NULL DEFAULT '',
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.2 Users (profile table linked to auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'employee',
  status user_status NOT NULL DEFAULT 'active',
  phone TEXT,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  bio TEXT,
  avatar_url TEXT,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.3 Counters (atomic sequence for customer UIDs)
CREATE TABLE counters (
  id TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);
INSERT INTO counters (id, count) VALUES ('customers', 0);

-- 2.4 Customers
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uid TEXT NOT NULL UNIQUE, -- e.g. "C-0001"
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  status user_status NOT NULL DEFAULT 'active',
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.5 Campaigns
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  channel TEXT NOT NULL,
  budget NUMERIC(12,2) NOT NULL DEFAULT 0,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  status campaign_status NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  linked_policies_count INTEGER DEFAULT 0,
  total_premium_generated NUMERIC(12,2) DEFAULT 0,
  roi NUMERIC(8,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.6 Policies
CREATE TABLE policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_number TEXT NOT NULL UNIQUE,
  policy_type policy_type_enum NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  customer_name TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  premium_amount NUMERIC(12,2) NOT NULL,
  sum_insured NUMERIC(14,2),
  insurer_name TEXT,
  payment_frequency payment_frequency,
  status policy_status NOT NULL DEFAULT 'active',
  assigned_to UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_to_name TEXT,
  pdf_url TEXT,
  locked_for_employee BOOLEAN NOT NULL DEFAULT FALSE,
  verification_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  verification_confirmed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  verification_confirmed_at TIMESTAMPTZ,
  remark TEXT,
  remark_updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  remark_updated_at TIMESTAMPTZ,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  -- Motor-specific
  motor_category TEXT, -- 'retail' | 'fleet'
  vehicle_number TEXT,
  vehicle_type TEXT,
  -- Health-specific
  health_policy_type TEXT, -- 'single' | 'floater'
  plan_name TEXT,
  -- Life-specific
  life_plan_type TEXT, -- 'endowment' | 'term_plan' | 'ulip' | 'moneyback'
  -- Fire/Burglary
  risk_location TEXT,
  -- Marine
  marine_policy_type TEXT, -- 'single_transit' | 'open_import' | 'open_export' | 'stop'
  -- Liability
  liability_type TEXT, -- 'public' | 'product'
  -- WC/Surety Bond
  policy_tenure TEXT,
  project_name TEXT,
  project_location TEXT,
  principal TEXT,
  surety_bond_type TEXT, -- 'bid_bond' | 'performance_bond' | 'mobilisation_bond' | 'retention_bond'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.7 Commission Rules
CREATE TABLE commission_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_type policy_type_enum NOT NULL,
  commission_type commission_type NOT NULL DEFAULT 'percentage',
  value NUMERIC(10,2) NOT NULL,
  min_premium NUMERIC(12,2),
  max_premium NUMERIC(12,2),
  insurer_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.8 Renewals
CREATE TABLE renewals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  policy_number TEXT,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  customer_name TEXT,
  status renewal_status NOT NULL DEFAULT 'due',
  notes TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  renewed_date TIMESTAMPTZ,
  updated_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.9 Premiums
CREATE TABLE premiums (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  policy_number TEXT,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  period TEXT, -- e.g. "2026-02"
  due_date TIMESTAMPTZ,
  status premium_status NOT NULL DEFAULT 'pending',
  collected_date TIMESTAMPTZ,
  collected_at TIMESTAMPTZ,
  collected_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.10 Commissions
CREATE TABLE commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  policy_number TEXT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  user_name TEXT,
  amount NUMERIC(12,2) NOT NULL,
  status commission_status NOT NULL DEFAULT 'pending',
  paid_date TIMESTAMPTZ,
  rule_id UUID REFERENCES commission_rules(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.11 Attendance
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT,
  date DATE NOT NULL,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  status attendance_status NOT NULL DEFAULT 'present',
  worked_hours NUMERIC(4,2),
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  override_by UUID REFERENCES users(id) ON DELETE SET NULL,
  override_reason TEXT,
  source TEXT, -- 'self' | 'admin' | 'system'
  marked_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date) -- one record per user per day
);

-- 2.12 Early Checkout Requests
CREATE TABLE early_checkout_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  attendance_id UUID NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reason TEXT NOT NULL,
  status early_checkout_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.13 Holidays
CREATE TABLE holidays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.14 Documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id UUID REFERENCES policies(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.15 Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'policy_expiry' | 'renewal' | 'assignment' | 'attendance' | 'commission' | 'system'
  read BOOLEAN NOT NULL DEFAULT FALSE,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.16 Audit Logs (append-only)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  user_name TEXT,
  user_role TEXT,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  details TEXT,
  target_id TEXT,
  target_type TEXT,
  ip_address INET,
  metadata JSONB,
  pdf_uploaded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.17 System Config (key-value store)
CREATE TABLE system_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.18 Company Templates (PDF extraction)
CREATE TABLE company_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  extraction_patterns JSONB NOT NULL DEFAULT '[]',
  supported_policy_types TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.19 Daily Reminders
CREATE TABLE daily_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMPTZ NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date)
);

-- 2.20 Policy Verification Logs
CREATE TABLE policy_verification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  verified_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  checks JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.21 Login Attempts (rate limiting)
CREATE TABLE login_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  count INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_attempt TIMESTAMPTZ
);

-- 2.22 Aggregations (weekly/monthly stats cache)
CREATE TABLE aggregations (
  id TEXT PRIMARY KEY, -- e.g. "branch1_weekly_2026-W03"
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  period TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.23 Reports (monthly generated reports)
CREATE TABLE reports (
  id TEXT PRIMARY KEY, -- e.g. "2026-01"
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.24 Archives (non-active policy snapshots)
CREATE TABLE archives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_policy_id UUID,
  data JSONB NOT NULL DEFAULT '{}',
  archived_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────
-- 3. INDEXES
-- ──────────────────────────────────────────────────────────────

-- Users
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_branch ON users(branch_id);
-- (idx_users_email removed — UNIQUE constraint already creates an index)

-- Customers
-- (idx_customers_uid removed — UNIQUE constraint already creates an index)
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_created_by ON customers(created_by);
CREATE INDEX idx_customers_name ON customers(name);

-- Policies
CREATE INDEX idx_policies_customer ON policies(customer_id);
CREATE INDEX idx_policies_assigned ON policies(assigned_to);
CREATE INDEX idx_policies_status ON policies(status);
CREATE INDEX idx_policies_type ON policies(policy_type);
CREATE INDEX idx_policies_end_date ON policies(end_date);
CREATE INDEX idx_policies_branch ON policies(branch_id);
CREATE INDEX idx_policies_campaign ON policies(campaign_id);
CREATE INDEX idx_policies_created_by ON policies(created_by);

-- Renewals
CREATE INDEX idx_renewals_policy ON renewals(policy_id);
CREATE INDEX idx_renewals_customer ON renewals(customer_id);
CREATE INDEX idx_renewals_status ON renewals(status);
CREATE INDEX idx_renewals_due_date ON renewals(due_date);

-- Premiums
CREATE INDEX idx_premiums_policy ON premiums(policy_id);
CREATE INDEX idx_premiums_status ON premiums(status);
CREATE INDEX idx_premiums_due_date ON premiums(due_date);
CREATE INDEX idx_premiums_created_by ON premiums(created_by);

-- Commissions
CREATE INDEX idx_commissions_policy ON commissions(policy_id);
CREATE INDEX idx_commissions_user ON commissions(user_id);
CREATE INDEX idx_commissions_status ON commissions(status);

-- Commission Rules
CREATE INDEX idx_commission_rules_type ON commission_rules(policy_type);
CREATE INDEX idx_commission_rules_active ON commission_rules(is_active);

-- Attendance
CREATE INDEX idx_attendance_user ON attendance(user_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_status ON attendance(status);

-- Early Checkout Requests
CREATE INDEX idx_early_checkout_user ON early_checkout_requests(user_id);
CREATE INDEX idx_early_checkout_status ON early_checkout_requests(status);

-- Documents
CREATE INDEX idx_documents_policy ON documents(policy_id);
CREATE INDEX idx_documents_customer ON documents(customer_id);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- Audit Logs
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_module ON audit_logs(module);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- Holidays
CREATE INDEX idx_holidays_date ON holidays(date);

-- System Config
-- (idx_system_config_key removed — UNIQUE constraint already creates an index)
CREATE INDEX idx_system_config_category ON system_config(category);

-- ──────────────────────────────────────────────────────────────
-- 4. UTILITY FUNCTIONS
-- ──────────────────────────────────────────────────────────────

-- 4.1 Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables with that column
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'updated_at'
      AND table_schema = 'public'
      AND table_name NOT IN ('aggregations', 'reports', 'archives')
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      tbl, tbl
    );
  END LOOP;
END;
$$;

-- 4.2 Atomic customer UID generation (replaces Firestore transaction)
CREATE OR REPLACE FUNCTION next_customer_uid()
RETURNS TEXT AS $$
DECLARE
  next_count INTEGER;
BEGIN
  UPDATE counters SET count = count + 1 WHERE id = 'customers' RETURNING count INTO next_count;
  RETURN 'C-' || LPAD(next_count::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- 4.3 Bulk customer UID generation
CREATE OR REPLACE FUNCTION bulk_next_customer_uids(n INTEGER)
RETURNS TEXT[] AS $$
DECLARE
  start_count INTEGER;
  result TEXT[];
BEGIN
  UPDATE counters SET count = count + n WHERE id = 'customers' RETURNING count - n + 1 INTO start_count;
  SELECT ARRAY(
    SELECT 'C-' || LPAD((start_count + i)::TEXT, 4, '0')
    FROM generate_series(0, n - 1) AS i
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 4.4 Increment counter helper
CREATE OR REPLACE FUNCTION increment_counter(counter_id TEXT, amount INTEGER DEFAULT 1)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE counters SET count = count + amount WHERE id = counter_id RETURNING count INTO new_count;
  IF NOT FOUND THEN
    INSERT INTO counters (id, count) VALUES (counter_id, amount) RETURNING count INTO new_count;
  END IF;
  RETURN new_count;
END;
$$ LANGUAGE plpgsql;

-- 4.5 Get user role from auth.users JWT
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'role'),
    (SELECT role::TEXT FROM users WHERE id = auth.uid())
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 4.6 Check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 4.7 Check if current user is admin or manager
CREATE OR REPLACE FUNCTION is_admin_or_manager()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth_user_role() IN ('admin', 'manager');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────
-- 5. ROW LEVEL SECURITY (RLS)
-- ──────────────────────────────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE renewals ENABLE ROW LEVEL SECURITY;
ALTER TABLE premiums ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE early_checkout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_verification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE archives ENABLE ROW LEVEL SECURITY;

-- ── Users ──
CREATE POLICY "users_select" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "users_insert_admin" ON users FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "users_update_admin" ON users FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "users_update_self" ON users FOR UPDATE TO authenticated
  USING (id = auth.uid());
CREATE POLICY "users_delete_admin" ON users FOR DELETE TO authenticated USING (is_admin());

-- ── Branches ──
CREATE POLICY "branches_select" ON branches FOR SELECT TO authenticated USING (true);
CREATE POLICY "branches_all_admin" ON branches FOR ALL TO authenticated USING (is_admin());

-- ── Customers ──
CREATE POLICY "customers_select" ON customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "customers_insert" ON customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "customers_update" ON customers FOR UPDATE TO authenticated USING (is_admin_or_manager());
CREATE POLICY "customers_delete" ON customers FOR DELETE TO authenticated USING (is_admin());

-- ── Policies ──
CREATE POLICY "policies_select" ON policies FOR SELECT TO authenticated USING (true);
CREATE POLICY "policies_insert" ON policies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "policies_update_admin_mgr" ON policies FOR UPDATE TO authenticated USING (is_admin_or_manager());
CREATE POLICY "policies_update_employee" ON policies FOR UPDATE TO authenticated
  USING (
    NOT is_admin_or_manager()
    AND locked_for_employee = false
    AND assigned_to = auth.uid()
  );
CREATE POLICY "policies_delete" ON policies FOR DELETE TO authenticated USING (is_admin());

-- ── Policy Verification Logs ──
CREATE POLICY "pvl_select" ON policy_verification_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "pvl_insert" ON policy_verification_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pvl_update_admin" ON policy_verification_logs FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "pvl_delete_admin" ON policy_verification_logs FOR DELETE TO authenticated USING (is_admin());

-- ── Renewals ──
CREATE POLICY "renewals_select" ON renewals FOR SELECT TO authenticated USING (true);
CREATE POLICY "renewals_insert" ON renewals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "renewals_update" ON renewals FOR UPDATE TO authenticated USING (true);
CREATE POLICY "renewals_delete" ON renewals FOR DELETE TO authenticated USING (is_admin_or_manager());

-- ── Premiums ──
CREATE POLICY "premiums_select" ON premiums FOR SELECT TO authenticated
  USING (is_admin_or_manager() OR created_by = auth.uid());
CREATE POLICY "premiums_insert" ON premiums FOR INSERT TO authenticated WITH CHECK (is_admin_or_manager());
CREATE POLICY "premiums_update" ON premiums FOR UPDATE TO authenticated USING (is_admin_or_manager());
CREATE POLICY "premiums_delete" ON premiums FOR DELETE TO authenticated USING (is_admin());

-- ── Commissions ──
CREATE POLICY "commissions_select" ON commissions FOR SELECT TO authenticated
  USING (is_admin_or_manager() OR user_id = auth.uid());
CREATE POLICY "commissions_insert" ON commissions FOR INSERT TO authenticated WITH CHECK (is_admin_or_manager());
CREATE POLICY "commissions_update" ON commissions FOR UPDATE TO authenticated USING (is_admin_or_manager());
CREATE POLICY "commissions_delete" ON commissions FOR DELETE TO authenticated USING (is_admin());

-- ── Commission Rules ──
CREATE POLICY "rules_select" ON commission_rules FOR SELECT TO authenticated USING (is_admin_or_manager());
CREATE POLICY "rules_all_admin" ON commission_rules FOR ALL TO authenticated USING (is_admin());

-- ── Attendance ──
CREATE POLICY "attendance_select" ON attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "attendance_insert_self" ON attendance FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR is_admin_or_manager());
CREATE POLICY "attendance_update" ON attendance FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR is_admin_or_manager());
CREATE POLICY "attendance_delete" ON attendance FOR DELETE TO authenticated USING (is_admin());

-- ── Early Checkout Requests ──
CREATE POLICY "eco_select" ON early_checkout_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "eco_insert_self" ON early_checkout_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "eco_update_mgr" ON early_checkout_requests FOR UPDATE TO authenticated USING (is_admin_or_manager());
CREATE POLICY "eco_delete_admin" ON early_checkout_requests FOR DELETE TO authenticated USING (is_admin());

-- ── Notifications ──
CREATE POLICY "notif_select" ON notifications FOR SELECT TO authenticated
  USING (is_admin_or_manager() OR user_id = auth.uid());
CREATE POLICY "notif_insert" ON notifications FOR INSERT TO authenticated WITH CHECK (is_admin_or_manager());
CREATE POLICY "notif_update_self" ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "notif_update_admin" ON notifications FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "notif_delete" ON notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR is_admin());

-- ── Documents ──
CREATE POLICY "docs_select" ON documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "docs_insert" ON documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "docs_update" ON documents FOR UPDATE TO authenticated
  USING (is_admin_or_manager() OR uploaded_by = auth.uid());
CREATE POLICY "docs_delete" ON documents FOR DELETE TO authenticated USING (is_admin_or_manager());

-- ── Campaigns ──
CREATE POLICY "campaigns_select" ON campaigns FOR SELECT TO authenticated USING (true);
CREATE POLICY "campaigns_all" ON campaigns FOR ALL TO authenticated USING (is_admin_or_manager());

-- ── Audit Logs (append-only for regular users, read for admin/manager) ──
CREATE POLICY "audit_select" ON audit_logs FOR SELECT TO authenticated USING (is_admin_or_manager());
CREATE POLICY "audit_insert" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);
-- No update/delete policies (immutable)

-- ── System Config ──
CREATE POLICY "config_select" ON system_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "config_all_admin" ON system_config FOR ALL TO authenticated USING (is_admin());

-- ── Company Templates ──
CREATE POLICY "templates_select" ON company_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "templates_all_admin" ON company_templates FOR ALL TO authenticated USING (is_admin());

-- ── Counters ──
CREATE POLICY "counters_select" ON counters FOR SELECT TO authenticated USING (true);
CREATE POLICY "counters_service_write" ON counters FOR ALL TO service_role USING (true);

-- ── Holidays ──
CREATE POLICY "holidays_select" ON holidays FOR SELECT TO authenticated USING (true);
CREATE POLICY "holidays_all" ON holidays FOR ALL TO authenticated USING (is_admin_or_manager());

-- ── Daily Reminders (own records only) ──
CREATE POLICY "reminders_self" ON daily_reminders FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- ── Login Attempts ──
CREATE POLICY "login_attempts_select" ON login_attempts FOR SELECT TO authenticated USING (true);
CREATE POLICY "login_attempts_insert_service" ON login_attempts FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "login_attempts_update_service" ON login_attempts FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- ── Aggregations ──
CREATE POLICY "agg_select" ON aggregations FOR SELECT TO authenticated USING (true);
CREATE POLICY "agg_all_admin" ON aggregations FOR ALL TO authenticated USING (is_admin());

-- ── Reports ──
CREATE POLICY "reports_select" ON reports FOR SELECT TO authenticated USING (is_admin_or_manager());
CREATE POLICY "reports_all_admin" ON reports FOR ALL TO authenticated USING (is_admin());

-- ── Archives ──
CREATE POLICY "archives_select" ON archives FOR SELECT TO authenticated USING (true);
CREATE POLICY "archives_all_admin" ON archives FOR ALL TO authenticated USING (is_admin());

-- ──────────────────────────────────────────────────────────────
-- 6. DATABASE TRIGGERS (replace Cloud Functions triggers)
-- ──────────────────────────────────────────────────────────────

-- 6.1 Auto-create commission when a policy is created
CREATE OR REPLACE FUNCTION trg_policy_created_commission()
RETURNS TRIGGER AS $$
DECLARE
  rule RECORD;
  commission_amount NUMERIC(12,2);
BEGIN
  -- Find matching commission rule
  SELECT * INTO rule
  FROM commission_rules
  WHERE policy_type = NEW.policy_type
    AND is_active = true
    AND (insurer_name IS NULL OR insurer_name = NEW.insurer_name)
    AND (min_premium IS NULL OR NEW.premium_amount >= min_premium)
    AND (max_premium IS NULL OR NEW.premium_amount <= max_premium)
  ORDER BY
    CASE WHEN insurer_name IS NOT NULL THEN 0 ELSE 1 END, -- prefer insurer-specific
    value DESC
  LIMIT 1;

  IF rule IS NOT NULL THEN
    IF rule.commission_type = 'percentage' THEN
      commission_amount := NEW.premium_amount * rule.value / 100;
    ELSE
      commission_amount := rule.value;
    END IF;

    INSERT INTO commissions (policy_id, policy_number, user_id, user_name, amount, status, rule_id)
    VALUES (NEW.id, NEW.policy_number, NEW.assigned_to, NEW.assigned_to_name, commission_amount, 'pending', rule.id);

    -- Notify the assigned agent
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      NEW.assigned_to,
      'New Commission',
      format('Commission of ₹%s created for policy %s', commission_amount, NEW.policy_number),
      'commission',
      '/dashboard/commissions'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_policy_after_insert
  AFTER INSERT ON policies
  FOR EACH ROW EXECUTE FUNCTION trg_policy_created_commission();

-- 6.2 Cancel pending commissions when a policy is cancelled
CREATE OR REPLACE FUNCTION trg_policy_cancelled_commissions()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    UPDATE commissions
    SET status = 'rejected', updated_at = NOW()
    WHERE policy_id = NEW.id AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_policy_after_cancel
  AFTER UPDATE ON policies
  FOR EACH ROW
  WHEN (NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled')
  EXECUTE FUNCTION trg_policy_cancelled_commissions();

-- 6.3 Send notifications on key audit log events
CREATE OR REPLACE FUNCTION trg_audit_log_notify()
RETURNS TRIGGER AS $$
DECLARE
  admin_rec RECORD;
  notify_actions TEXT[] := ARRAY['policy.create', 'policy.delete', 'premium.paid', 'renewal.won', 'user.create'];
  config_enabled BOOLEAN;
BEGIN
  -- Check if notifications are enabled
  SELECT value::BOOLEAN INTO config_enabled
  FROM system_config WHERE key = 'push_notifications_enabled';
  
  IF config_enabled IS NULL OR config_enabled = false THEN
    RETURN NEW;
  END IF;

  IF NEW.action = ANY(notify_actions) THEN
    -- Notify all admins and managers
    FOR admin_rec IN
      SELECT id FROM users WHERE role IN ('admin', 'manager') AND status = 'active' AND id != NEW.user_id
    LOOP
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        admin_rec.id,
        initcap(replace(NEW.action, '.', ' ')),
        COALESCE(NEW.details, NEW.action || ' performed by ' || COALESCE(NEW.user_name, 'Unknown')),
        'system',
        CASE
          WHEN NEW.module = 'policy' THEN '/dashboard/policies'
          WHEN NEW.module = 'premium' THEN '/dashboard/premiums'
          WHEN NEW.module = 'renewal' THEN '/dashboard/renewals'
          WHEN NEW.module = 'user' THEN '/dashboard/users'
          ELSE '/dashboard'
        END
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_audit_log_after_insert
  AFTER INSERT ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION trg_audit_log_notify();

-- ──────────────────────────────────────────────────────────────
-- 7. SCHEDULED JOBS (replace Cloud Functions scheduled functions)
-- Using pg_cron — must be enabled in Supabase Dashboard > Extensions
-- ──────────────────────────────────────────────────────────────

-- 7.1 Mark overdue premiums (daily at midnight IST = 18:30 UTC)
CREATE OR REPLACE FUNCTION job_mark_overdue_premiums()
RETURNS void AS $$
BEGIN
  UPDATE premiums
  SET status = 'overdue', updated_at = NOW()
  WHERE status = 'pending'
    AND due_date < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT cron.schedule(
  'mark-overdue-premiums',
  '30 18 * * *', -- 18:30 UTC = midnight IST
  'SELECT job_mark_overdue_premiums()'
);

-- 7.2 Mark expired policies (daily at 18:35 UTC = 00:05 IST)
CREATE OR REPLACE FUNCTION job_mark_expired_policies()
RETURNS void AS $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT id, policy_number, assigned_to
    FROM policies
    WHERE status = 'active' AND end_date < NOW()
  LOOP
    UPDATE policies SET status = 'expired', updated_at = NOW() WHERE id = pol.id;
    
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      pol.assigned_to,
      'Policy Expired',
      format('Policy %s has expired', pol.policy_number),
      'policy_expiry',
      '/dashboard/policies'
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT cron.schedule(
  'mark-expired-policies',
  '35 18 * * *',
  'SELECT job_mark_expired_policies()'
);

-- 7.3 Generate renewal reminders (daily at 02:30 UTC = 08:00 IST)
CREATE OR REPLACE FUNCTION job_generate_renewal_reminders()
RETURNS void AS $$
DECLARE
  reminder_days INTEGER;
  pol RECORD;
  existing_renewal UUID;
BEGIN
  -- Get configurable reminder days (default 30)
  SELECT COALESCE(value::INTEGER, 30) INTO reminder_days
  FROM system_config WHERE key = 'renewal_reminder_days';
  IF reminder_days IS NULL THEN reminder_days := 30; END IF;

  -- Auto-create renewal records for policies expiring within N days
  FOR pol IN
    SELECT p.id, p.policy_number, p.customer_id, p.customer_name, p.end_date, p.assigned_to
    FROM policies p
    WHERE p.status = 'active'
      AND p.end_date BETWEEN NOW() AND NOW() + (reminder_days || ' days')::INTERVAL
  LOOP
    -- Check if renewal already exists for this policy
    SELECT id INTO existing_renewal FROM renewals WHERE policy_id = pol.id LIMIT 1;
    
    IF existing_renewal IS NULL THEN
      INSERT INTO renewals (policy_id, policy_number, customer_id, customer_name, status, due_date, updated_by)
      VALUES (pol.id, pol.policy_number, pol.customer_id, pol.customer_name, 'due', pol.end_date, pol.assigned_to);
    END IF;
  END LOOP;

  -- Send reminder notifications for renewals due in 30/15/7 days
  INSERT INTO notifications (user_id, title, message, type, link)
  SELECT
    p.assigned_to,
    'Renewal Reminder',
    format('Policy %s for %s is due for renewal on %s',
      r.policy_number, r.customer_name, TO_CHAR(r.due_date, 'DD Mon YYYY')),
    'renewal',
    '/dashboard/renewals'
  FROM renewals r
  JOIN policies p ON p.id = r.policy_id
  WHERE r.status = 'due'
    AND r.due_date::DATE IN (
      CURRENT_DATE + 30,
      CURRENT_DATE + 15,
      CURRENT_DATE + 7
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT cron.schedule(
  'generate-renewal-reminders',
  '30 2 * * *',
  'SELECT job_generate_renewal_reminders()'
);

-- 7.4 Auto mark absent + auto checkout (daily at 06:00 UTC = 11:30 IST, Mon-Sat)
CREATE OR REPLACE FUNCTION job_auto_mark_absent()
RETURNS void AS $$
DECLARE
  usr RECORD;
  is_holiday BOOLEAN;
  retention_days INTEGER;
BEGIN
  -- Check if today is a holiday
  SELECT EXISTS(
    SELECT 1 FROM holidays
    WHERE date = CURRENT_DATE
      OR (is_recurring AND EXTRACT(MONTH FROM date) = EXTRACT(MONTH FROM CURRENT_DATE)
          AND EXTRACT(DAY FROM date) = EXTRACT(DAY FROM CURRENT_DATE))
  ) INTO is_holiday;

  -- Auto-checkout users still checked in
  UPDATE attendance
  SET check_out = NOW(), updated_at = NOW()
  WHERE date = CURRENT_DATE
    AND check_in IS NOT NULL
    AND check_out IS NULL;

  -- Mark absent for users with no attendance record today
  FOR usr IN
    SELECT id, name FROM users WHERE status = 'active'
  LOOP
    IF NOT EXISTS(SELECT 1 FROM attendance WHERE user_id = usr.id AND date = CURRENT_DATE) THEN
      INSERT INTO attendance (user_id, user_name, date, status, source)
      VALUES (
        usr.id, usr.name, CURRENT_DATE,
        CASE WHEN is_holiday THEN 'leave' ELSE 'absent' END,
        'system'
      );
    END IF;
  END LOOP;

  -- Clean old notifications
  SELECT COALESCE(value::INTEGER, 90) INTO retention_days
  FROM system_config WHERE key = 'notification_retention_days';
  IF retention_days IS NULL THEN retention_days := 90; END IF;
  
  DELETE FROM notifications
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT cron.schedule(
  'auto-mark-absent',
  '30 13 * * 1-6', -- Mon-Sat at 13:30 UTC (19:00 IST)
  'SELECT job_auto_mark_absent()'
);

-- 7.5 Weekly aggregation (Sunday at 18:00 UTC = 23:30 IST)
CREATE OR REPLACE FUNCTION job_weekly_aggregation()
RETURNS void AS $$
DECLARE
  br RECORD;
  week_start DATE;
  week_end DATE;
  week_label TEXT;
  agg_data JSONB;
BEGIN
  week_end := CURRENT_DATE;
  week_start := week_end - 7;
  week_label := TO_CHAR(week_start, 'IYYY') || '-W' || TO_CHAR(week_start, 'IW');

  FOR br IN SELECT id, name FROM branches WHERE is_active = true
  LOOP
    SELECT jsonb_build_object(
      'branch_name', br.name,
      'period_start', week_start,
      'period_end', week_end,
      'new_policies', (SELECT COUNT(*) FROM policies WHERE branch_id = br.id AND created_at >= week_start AND created_at < week_end),
      'total_premium', (SELECT COALESCE(SUM(premium_amount), 0) FROM policies WHERE branch_id = br.id AND created_at >= week_start AND created_at < week_end),
      'premiums_collected', (SELECT COALESCE(SUM(amount), 0) FROM premiums WHERE status = 'collected' AND collected_at >= week_start AND collected_at < week_end),
      'commissions_paid', (SELECT COALESCE(SUM(amount), 0) FROM commissions c JOIN policies p ON p.id = c.policy_id WHERE p.branch_id = br.id AND c.status = 'paid' AND c.updated_at >= week_start AND c.updated_at < week_end),
      'new_customers', (SELECT COUNT(*) FROM customers WHERE created_at >= week_start AND created_at < week_end),
      'attendance_rate', (SELECT ROUND(COUNT(*) FILTER (WHERE status IN ('present', 'late')) * 100.0 / NULLIF(COUNT(*), 0), 1) FROM attendance a JOIN users u ON u.id = a.user_id WHERE u.branch_id = br.id AND a.date >= week_start AND a.date < week_end)
    ) INTO agg_data;

    INSERT INTO aggregations (id, branch_id, period, data)
    VALUES (br.id || '_weekly_' || week_label, br.id, week_label, agg_data)
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, created_at = NOW();
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT cron.schedule(
  'weekly-aggregation',
  '0 18 * * 0',
  'SELECT job_weekly_aggregation()'
);

-- 7.6 Monthly report (last day of month at 19:30 UTC = 01:00 IST next day)
CREATE OR REPLACE FUNCTION job_monthly_report()
RETURNS void AS $$
DECLARE
  month_start DATE;
  month_end DATE;
  month_label TEXT;
  report_data JSONB;
BEGIN
  month_start := DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 day')::DATE;
  month_end := (month_start + INTERVAL '1 month')::DATE;
  month_label := TO_CHAR(month_start, 'YYYY-MM');

  SELECT jsonb_build_object(
    'period', month_label,
    'generated_at', NOW(),
    'policies', jsonb_build_object(
      'total_active', (SELECT COUNT(*) FROM policies WHERE status = 'active'),
      'new_this_month', (SELECT COUNT(*) FROM policies WHERE created_at >= month_start AND created_at < month_end),
      'expired', (SELECT COUNT(*) FROM policies WHERE status = 'expired' AND updated_at >= month_start AND updated_at < month_end),
      'by_type', (SELECT jsonb_object_agg(policy_type, cnt) FROM (SELECT policy_type, COUNT(*) AS cnt FROM policies WHERE created_at >= month_start AND created_at < month_end GROUP BY policy_type) sub)
    ),
    'premiums', jsonb_build_object(
      'collected', (SELECT COALESCE(SUM(amount), 0) FROM premiums WHERE status = 'collected' AND collected_at >= month_start AND collected_at < month_end),
      'pending', (SELECT COALESCE(SUM(amount), 0) FROM premiums WHERE status = 'pending'),
      'overdue', (SELECT COALESCE(SUM(amount), 0) FROM premiums WHERE status = 'overdue')
    ),
    'commissions', jsonb_build_object(
      'total_paid', (SELECT COALESCE(SUM(amount), 0) FROM commissions WHERE status = 'paid' AND paid_date >= month_start AND paid_date < month_end),
      'total_pending', (SELECT COALESCE(SUM(amount), 0) FROM commissions WHERE status = 'pending')
    ),
    'renewals', jsonb_build_object(
      'total_due', (SELECT COUNT(*) FROM renewals WHERE status = 'due'),
      'renewed', (SELECT COUNT(*) FROM renewals WHERE status = 'renewed' AND renewed_date >= month_start AND renewed_date < month_end),
      'lost', (SELECT COUNT(*) FROM renewals WHERE status = 'lost' AND updated_at >= month_start AND updated_at < month_end)
    ),
    'customers', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM customers WHERE status = 'active'),
      'new_this_month', (SELECT COUNT(*) FROM customers WHERE created_at >= month_start AND created_at < month_end)
    )
  ) INTO report_data;

  INSERT INTO reports (id, data)
  VALUES (month_label, report_data)
  ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, created_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT cron.schedule(
  'monthly-report',
  '30 19 28-31 * *',
  'SELECT job_monthly_report()'
);

-- ──────────────────────────────────────────────────────────────
-- 8. STORAGE BUCKETS
-- ──────────────────────────────────────────────────────────────
-- Create via Supabase Dashboard or API:
-- 1. "policy-documents" — PDF uploads for policies
-- 2. "avatars" — User profile pictures
-- 3. "documents" — General customer/policy documents
-- 4. "company-logos" — Company template logos

-- ──────────────────────────────────────────────────────────────
-- 9. SEED DEFAULT SYSTEM CONFIG
-- ──────────────────────────────────────────────────────────────

INSERT INTO system_config (key, value, category, description) VALUES
  ('company_name', to_jsonb('BP & AF Insurance Broker'::text), 'general', 'Company display name'),
  ('session_timeout_minutes', to_jsonb('30'::text), 'security', 'Auto-logout after N minutes of inactivity'),
  ('max_login_attempts', to_jsonb('5'::text), 'security', 'Lock account after N failed login attempts'),
  ('lockout_duration_minutes', to_jsonb('30'::text), 'security', 'Duration of account lockout in minutes'),
  ('password_min_length', to_jsonb('6'::text), 'security', 'Minimum password length for new users'),
  ('renewal_reminder_days', to_jsonb('30'::text), 'policy', 'Days before expiry to create renewal reminder'),
  ('policy_number_prefix', to_jsonb('POL'::text), 'policy', 'Prefix for auto-generated policy numbers'),
  ('auto_generate_policy_number', to_jsonb('true'::text), 'policy', 'Automatically generate policy numbers'),
  ('policy_expiry_warning_days', to_jsonb('60'::text), 'policy', 'Days before expiry to show warnings'),
  ('pdf_extraction_enabled', to_jsonb('true'::text), 'policy', 'Enable automatic PDF data extraction'),
  ('office_start_time', to_jsonb('09:00'::text), 'attendance', 'Office start time for late detection'),
  ('office_end_time', to_jsonb('18:00'::text), 'attendance', 'Office closing time (HH:mm)'),
  ('late_threshold_minutes', to_jsonb('15'::text), 'attendance', 'Minutes after start time before marking late'),
  ('full_day_hours', to_jsonb('8'::text), 'attendance', 'Expected hours for a full day'),
  ('half_day_hours', to_jsonb('4'::text), 'attendance', 'Minimum hours for a half day'),
  ('early_checkout_enabled', to_jsonb('true'::text), 'attendance', 'Allow employees to request early checkout'),
  ('auto_checkout_time', to_jsonb('20:00'::text), 'attendance', 'Auto-checkout employees still checked in at this time'),
  ('working_days', to_jsonb('Mon,Tue,Wed,Thu,Fri,Sat'::text), 'attendance', 'Working days of the week'),
  ('default_commission_rate', to_jsonb('10'::text), 'commission', 'Default commission percentage if no rule matches'),
  ('commission_calculation_mode', to_jsonb('premium_based'::text), 'commission', 'Commission calculation mode'),
  ('commission_payout_day', to_jsonb('1'::text), 'commission', 'Day of month for commission payouts'),
  ('default_branch', to_jsonb('10000000-0000-0000-0000-000000000001'::text), 'branches', 'Default branch UUID for new users'),
  ('multi_branch_enabled', to_jsonb('true'::text), 'branches', 'Enable multi-branch operations'),
  ('notification_retention_days', to_jsonb('90'::text), 'system', 'Days to keep old notifications'),
  ('push_notifications_enabled', to_jsonb('true'::text), 'system', 'Enable in-app push notifications'),
  ('email_notifications_enabled', to_jsonb('true'::text), 'system', 'Enable email notifications'),
  ('bulk_import_max_rows', to_jsonb('500'::text), 'system', 'Maximum rows allowed in bulk import')
ON CONFLICT (key) DO NOTHING;
