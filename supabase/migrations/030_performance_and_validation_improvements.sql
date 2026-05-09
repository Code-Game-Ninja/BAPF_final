-- ============================================================
-- Migration 030: Performance and Validation Improvements
-- Adds composite indexes, check constraints, and full-text search
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. Composite Indexes for Performance
-- ──────────────────────────────────────────────────────────────

-- Policies: Common query pattern for customer policies with status and expiry
CREATE INDEX IF NOT EXISTS idx_policies_customer_status_end_date 
  ON policies(customer_id, status, end_date);

-- Customers: Filter by type and status
CREATE INDEX IF NOT EXISTS idx_customers_type_status 
  ON customers(customer_type, status);

-- Sales Leads: Filter by status and follow-up date
CREATE INDEX IF NOT EXISTS idx_sales_leads_status_follow_up 
  ON sales_leads(status, follow_up_date);

-- Renewals: Filter by status and due date for dashboard
CREATE INDEX IF NOT EXISTS idx_renewals_status_due_date 
  ON renewals(status, due_date);

-- Premiums: Filter by status and due date for collection tracking
CREATE INDEX IF NOT EXISTS idx_premiums_status_due_date 
  ON premiums(status, due_date);

-- ──────────────────────────────────────────────────────────────
-- 2. Check Constraints for Business Logic
-- ──────────────────────────────────────────────────────────────

-- Policies: Ensure end_date is after start_date
DO $$ BEGIN
  ALTER TABLE policies ADD CONSTRAINT chk_end_date_after_start CHECK (end_date > start_date);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Premiums: Ensure amount is positive
DO $$ BEGIN
  ALTER TABLE premiums ADD CONSTRAINT chk_premium_amount_positive CHECK (amount > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Commissions: Ensure amount is positive
DO $$ BEGIN
  ALTER TABLE commissions ADD CONSTRAINT chk_commission_amount_positive CHECK (amount > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Invoices: Ensure total_amount is non-negative
DO $$ BEGIN
  ALTER TABLE invoices ADD CONSTRAINT chk_invoice_total_non_negative CHECK (total_amount >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Customers: Ensure email format is valid (basic check)
DO $$ BEGIN
  ALTER TABLE customers ADD CONSTRAINT chk_customer_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' OR email = 'N/A');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Customers: Ensure phone is valid (Indian mobile or N/A)
DO $$ BEGIN
  ALTER TABLE customers ADD CONSTRAINT chk_customer_phone_format CHECK (phone ~ '^[6-9]\d{9}$' OR phone = 'N/A');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ──────────────────────────────────────────────────────────────
-- 3. Full-Text Search Indexes
-- ──────────────────────────────────────────────────────────────

-- Enable pg_trgm extension for trigram matching (better partial matches)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Customers: Full-text search on name
CREATE INDEX IF NOT EXISTS idx_customers_name_fts 
  ON customers USING GIN (to_tsvector('english', COALESCE(name, '')));

-- Customers: Trigram index for partial name matching
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm 
  ON customers USING GIN (name gin_trgm_ops);

-- Policies: Full-text search on customer name
CREATE INDEX IF NOT EXISTS idx_policies_customer_name_fts 
  ON policies USING GIN (to_tsvector('english', COALESCE(customer_name, '')));

-- Policies: Trigram index for partial customer name matching
CREATE INDEX IF NOT EXISTS idx_policies_customer_name_trgm 
  ON policies USING GIN (customer_name gin_trgm_ops);

-- Sales Leads: Full-text search on customer name
CREATE INDEX IF NOT EXISTS idx_sales_leads_customer_name_fts 
  ON sales_leads USING GIN (to_tsvector('english', COALESCE(customer_name, '')));

-- Sales Leads: Trigram index for partial customer name matching
CREATE INDEX IF NOT EXISTS idx_sales_leads_customer_name_trgm 
  ON sales_leads USING GIN (customer_name gin_trgm_ops);
