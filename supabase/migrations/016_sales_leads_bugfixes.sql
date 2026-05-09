-- 016 — Sales Leads: expand client_type enum, fix timeline/document RLS,
--        add meeting_date and next_action columns.

-- 1. Add new client_type enum values from spec
ALTER TYPE client_type ADD VALUE IF NOT EXISTS 'contractor';
ALTER TYPE client_type ADD VALUE IF NOT EXISTS 'manufacturer';
ALTER TYPE client_type ADD VALUE IF NOT EXISTS 'transporter';
ALTER TYPE client_type ADD VALUE IF NOT EXISTS 'trader';

-- 2. Add meeting_date column to sales_leads
ALTER TABLE sales_leads ADD COLUMN IF NOT EXISTS meeting_date DATE;

-- 3. Add next_action column to lead_timeline
ALTER TABLE lead_timeline ADD COLUMN IF NOT EXISTS next_action TEXT;

-- 4. Fix lead_timeline RLS — employees can only read timelines for their assigned leads
DROP POLICY IF EXISTS "timeline_select" ON lead_timeline;
CREATE POLICY "timeline_select" ON lead_timeline
  FOR SELECT TO authenticated
  USING (
    is_admin_or_manager()
    OR EXISTS (
      SELECT 1 FROM sales_leads sl
      WHERE sl.id = lead_timeline.lead_id
        AND sl.assigned_to = auth.uid()
    )
  );

-- 5. Fix lead_documents RLS — employees can only read docs for their assigned leads
DROP POLICY IF EXISTS "lead_docs_select" ON lead_documents;
CREATE POLICY "lead_docs_select" ON lead_documents
  FOR SELECT TO authenticated
  USING (
    is_admin_or_manager()
    OR EXISTS (
      SELECT 1 FROM sales_leads sl
      WHERE sl.id = lead_documents.lead_id
        AND sl.assigned_to = auth.uid()
    )
  );
