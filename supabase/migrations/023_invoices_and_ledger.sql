-- ============================================================
-- Migration 023: Invoices & Ledger Entries
-- ============================================================

DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ledger_type AS ENUM ('debit', 'credit');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT NOT NULL,
  customer_id UUID REFERENCES customers(id),
  customer_name TEXT NOT NULL,
  policy_id UUID REFERENCES policies(id),
  policy_number TEXT,

  -- Amounts
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) DEFAULT 18.00,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  discount NUMERIC(12,2) DEFAULT 0,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(14,2) DEFAULT 0,
  balance_due NUMERIC(14,2) DEFAULT 0,

  -- Dates
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  paid_date DATE,

  -- Payment
  payment_method payment_method_type,
  payment_reference TEXT,

  -- Status & Meta
  status invoice_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  terms TEXT,
  pdf_url TEXT,
  insurer_name TEXT,
  branch_id UUID REFERENCES branches(id),

  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_policy ON invoices(policy_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

-- Counter
INSERT INTO counters (id, count) VALUES ('invoices', 0) ON CONFLICT (id) DO NOTHING;

-- Auto-generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  next_val INTEGER;
BEGIN
  UPDATE counters SET count = count + 1 WHERE id = 'invoices' RETURNING count INTO next_val;
  NEW.invoice_number := 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(next_val::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_invoice_number ON invoices;
CREATE TRIGGER trg_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL OR NEW.invoice_number = '')
  EXECUTE FUNCTION generate_invoice_number();

-- Auto-calculate balance
CREATE OR REPLACE FUNCTION calculate_invoice_balance()
RETURNS TRIGGER AS $$
BEGIN
  NEW.tax_amount := ROUND(NEW.subtotal * COALESCE(NEW.tax_rate, 18) / 100, 2);
  NEW.total_amount := NEW.subtotal + NEW.tax_amount - COALESCE(NEW.discount, 0);
  NEW.balance_due := NEW.total_amount - COALESCE(NEW.paid_amount, 0);
  IF NEW.balance_due <= 0 AND NEW.status != 'cancelled' AND NEW.status != 'refunded' THEN
    NEW.status := 'paid';
    NEW.paid_date := COALESCE(NEW.paid_date, CURRENT_DATE);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_invoice_balance ON invoices;
CREATE TRIGGER trg_invoice_balance
  BEFORE INSERT OR UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION calculate_invoice_balance();

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_invoices_updated_at ON invoices;
CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ──────────────────────────────────────────────────────────────
-- Ledger Entries (Rough Ledger)
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id),
  customer_name TEXT,
  entry_type ledger_type NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  description TEXT NOT NULL,
  reference_number TEXT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT DEFAULT 'general',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_invoice ON ledger_entries(invoice_id);
CREATE INDEX IF NOT EXISTS idx_ledger_customer ON ledger_entries(customer_id);
CREATE INDEX IF NOT EXISTS idx_ledger_date ON ledger_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_type ON ledger_entries(entry_type);

DROP TRIGGER IF EXISTS trg_ledger_updated_at ON ledger_entries;
CREATE TRIGGER trg_ledger_updated_at
  BEFORE UPDATE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ──────────────────────────────────────────────────────────────
-- Invoice Line Items
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

-- RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoices_admin_all" ON invoices;
CREATE POLICY "invoices_admin_all" ON invoices
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

DROP POLICY IF EXISTS "invoices_employee_select" ON invoices;
CREATE POLICY "invoices_employee_select" ON invoices
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'employee')
  );

DROP POLICY IF EXISTS "ledger_admin_all" ON ledger_entries;
CREATE POLICY "ledger_admin_all" ON ledger_entries
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

DROP POLICY IF EXISTS "ledger_employee_select" ON ledger_entries;
CREATE POLICY "ledger_employee_select" ON ledger_entries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'employee')
  );

DROP POLICY IF EXISTS "invoice_items_all" ON invoice_items;
CREATE POLICY "invoice_items_all" ON invoice_items
  FOR ALL USING (auth.role() = 'authenticated');

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE ledger_entries;
