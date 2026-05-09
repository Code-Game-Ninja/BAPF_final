-- ============================================================
-- 013: Sales Leads Enhancements — new columns + enum values
-- ============================================================

-- 1. Add new enum values for lead_status
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'meeting_done' AFTER 'interested';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'proposal_sent' AFTER 'meeting_done';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'negotiation' AFTER 'proposal_sent';

-- 2. Create client_type enum
DO $$ BEGIN
  CREATE TYPE client_type AS ENUM ('individual', 'corporate', 'sme', 'government', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Add new columns to sales_leads
ALTER TABLE sales_leads
  ADD COLUMN IF NOT EXISTS poc_name        TEXT,
  ADD COLUMN IF NOT EXISTS location        TEXT,
  ADD COLUMN IF NOT EXISTS client_type     client_type DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS estimated_value NUMERIC(14,2) DEFAULT 0;

-- 4. Indexes for new filterable columns
CREATE INDEX IF NOT EXISTS idx_sales_leads_client_type     ON sales_leads(client_type);
CREATE INDEX IF NOT EXISTS idx_sales_leads_location        ON sales_leads(location);
CREATE INDEX IF NOT EXISTS idx_sales_leads_estimated_value ON sales_leads(estimated_value);

-- 5. Comment for documentation
COMMENT ON COLUMN sales_leads.poc_name        IS 'Point of contact name (if different from customer_name)';
COMMENT ON COLUMN sales_leads.location        IS 'City or area of the lead';
COMMENT ON COLUMN sales_leads.client_type     IS 'Type of client: individual, corporate, sme, government, other';
COMMENT ON COLUMN sales_leads.estimated_value IS 'Estimated premium or deal value in base currency';
