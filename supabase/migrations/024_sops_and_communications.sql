-- ============================================================
-- Migration 024: SOPs & Communications
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- SOPs (Standard Operating Procedures)
-- ──────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE sop_status AS ENUM ('draft', 'active', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS sops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  content TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1,
  status sop_status NOT NULL DEFAULT 'draft',
  tags TEXT[] DEFAULT '{}',
  attachment_url TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_by_name TEXT,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sops_category ON sops(category);
CREATE INDEX IF NOT EXISTS idx_sops_status ON sops(status);

DROP TRIGGER IF EXISTS trg_sops_updated_at ON sops;
CREATE TRIGGER trg_sops_updated_at
  BEFORE UPDATE ON sops
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE sops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sops_admin_all" ON sops;
CREATE POLICY "sops_admin_all" ON sops
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

DROP POLICY IF EXISTS "sops_employee_select" ON sops;
CREATE POLICY "sops_employee_select" ON sops
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'employee')
    AND status = 'active'
  );

-- ──────────────────────────────────────────────────────────────
-- Communication Templates & Logs
-- ──────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE comm_channel AS ENUM ('email', 'whatsapp', 'sms');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE comm_trigger AS ENUM ('renewal_reminder', 'policy_expiry', 'premium_due', 'birthday', 'campaign', 'follow_up', 'claim_update', 'welcome', 'custom');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE comm_status AS ENUM ('pending', 'sent', 'delivered', 'failed', 'bounced');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS communication_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  channel comm_channel NOT NULL DEFAULT 'email',
  trigger_type comm_trigger NOT NULL DEFAULT 'custom',
  subject TEXT,
  body_template TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comm_templates_channel ON communication_templates(channel);
CREATE INDEX IF NOT EXISTS idx_comm_templates_trigger ON communication_templates(trigger_type);

DROP TRIGGER IF EXISTS trg_comm_templates_updated_at ON communication_templates;
CREATE TRIGGER trg_comm_templates_updated_at
  BEFORE UPDATE ON communication_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS communication_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES communication_templates(id),
  customer_id UUID REFERENCES customers(id),
  customer_name TEXT,
  policy_id UUID REFERENCES policies(id),
  channel comm_channel NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  status comm_status NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comm_logs_customer ON communication_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_comm_logs_status ON communication_logs(status);
CREATE INDEX IF NOT EXISTS idx_comm_logs_channel ON communication_logs(channel);
CREATE INDEX IF NOT EXISTS idx_comm_logs_created ON communication_logs(created_at DESC);

-- RLS
ALTER TABLE communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comm_templates_admin_all" ON communication_templates;
CREATE POLICY "comm_templates_admin_all" ON communication_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

DROP POLICY IF EXISTS "comm_templates_employee_select" ON communication_templates;
CREATE POLICY "comm_templates_employee_select" ON communication_templates
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'employee')
    AND is_active = true
  );

DROP POLICY IF EXISTS "comm_logs_admin_all" ON communication_logs;
CREATE POLICY "comm_logs_admin_all" ON communication_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

DROP POLICY IF EXISTS "comm_logs_employee_own" ON communication_logs;
CREATE POLICY "comm_logs_employee_own" ON communication_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'employee')
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "comm_logs_employee_insert" ON communication_logs;
CREATE POLICY "comm_logs_employee_insert" ON communication_logs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'employee')
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE sops;
ALTER PUBLICATION supabase_realtime ADD TABLE communication_templates;
ALTER PUBLICATION supabase_realtime ADD TABLE communication_logs;

-- ──────────────────────────────────────────────────────────────
-- Seed default communication templates
-- ──────────────────────────────────────────────────────────────

INSERT INTO communication_templates (name, channel, trigger_type, subject, body_template, variables, is_active, created_by)
SELECT * FROM (VALUES
  (
    'Renewal Reminder - 30 Days',
    'email'::comm_channel,
    'renewal_reminder'::comm_trigger,
    'Policy Renewal Reminder - {{policy_number}}',
    E'Dear {{customer_name}},\n\nThis is a reminder that your policy {{policy_number}} ({{policy_type}}) is due for renewal on {{renewal_date}}.\n\nPlease contact us at your earliest convenience to renew your policy and ensure uninterrupted coverage.\n\nBest regards,\nBP & AF Insurance Broker',
    ARRAY['customer_name', 'policy_number', 'policy_type', 'renewal_date'],
    true,
    '00000000-0000-0000-0000-000000000001'::UUID
  ),
  (
    'Premium Due Reminder',
    'email'::comm_channel,
    'premium_due'::comm_trigger,
    'Premium Payment Reminder - {{policy_number}}',
    E'Dear {{customer_name}},\n\nThis is a reminder that your premium of ₹{{amount}} for policy {{policy_number}} is due on {{due_date}}.\n\nPlease arrange for timely payment to avoid policy lapse.\n\nBest regards,\nBP & AF Insurance Broker',
    ARRAY['customer_name', 'policy_number', 'amount', 'due_date'],
    true,
    '00000000-0000-0000-0000-000000000001'::UUID
  ),
  (
    'Welcome New Customer',
    'email'::comm_channel,
    'welcome'::comm_trigger,
    'Welcome to BP & AF Insurance Broker',
    E'Dear {{customer_name}},\n\nWelcome to BP & AF Insurance Broker! We are delighted to have you as our valued customer.\n\nYour customer ID is {{customer_uid}}. Please keep this for your records.\n\nFor any questions, feel free to reach out to us.\n\nBest regards,\nBP & AF Insurance Broker',
    ARRAY['customer_name', 'customer_uid'],
    true,
    '00000000-0000-0000-0000-000000000001'::UUID
  )
) AS v(name, channel, trigger_type, subject, body_template, variables, is_active, created_by)
WHERE NOT EXISTS (SELECT 1 FROM communication_templates LIMIT 1);
