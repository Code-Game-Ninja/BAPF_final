-- 017 — Lead Reminders: new table for scheduling reminders on sales leads
--
-- Reminder types: call, meeting, document, proposal, other
-- Status: pending → done | snoozed

-- 1. Create reminder_type enum
DO $$ BEGIN
  CREATE TYPE lead_reminder_type AS ENUM ('call', 'meeting', 'document', 'proposal', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create lead_reminder_status enum
DO $$ BEGIN
  CREATE TYPE lead_reminder_status AS ENUM ('pending', 'done', 'snoozed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Create lead_reminders table
CREATE TABLE IF NOT EXISTS lead_reminders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID NOT NULL REFERENCES sales_leads(id) ON DELETE CASCADE,
  reminder_type   lead_reminder_type NOT NULL DEFAULT 'call',
  reminder_date   DATE NOT NULL,
  note            TEXT,
  status          lead_reminder_status NOT NULL DEFAULT 'pending',
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  created_by_name TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_lead_reminders_lead_id  ON lead_reminders(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_reminders_date     ON lead_reminders(reminder_date);
CREATE INDEX IF NOT EXISTS idx_lead_reminders_status   ON lead_reminders(status);

-- 5. Enable RLS
ALTER TABLE lead_reminders ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
-- Admin/Manager: full access
DROP POLICY IF EXISTS "reminders_admin_all"  ON lead_reminders;
CREATE POLICY "reminders_admin_all" ON lead_reminders
  FOR ALL TO authenticated
  USING (is_admin_or_manager())
  WITH CHECK (is_admin_or_manager());

-- Employees: can manage reminders only for their assigned leads
DROP POLICY IF EXISTS "reminders_employee_select" ON lead_reminders;
CREATE POLICY "reminders_employee_select" ON lead_reminders
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sales_leads sl
      WHERE sl.id = lead_reminders.lead_id
        AND sl.assigned_to = auth.uid()
    )
  );

DROP POLICY IF EXISTS "reminders_employee_insert" ON lead_reminders;
CREATE POLICY "reminders_employee_insert" ON lead_reminders
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM sales_leads sl
      WHERE sl.id = lead_reminders.lead_id
        AND sl.assigned_to = auth.uid()
    )
  );

DROP POLICY IF EXISTS "reminders_employee_update" ON lead_reminders;
CREATE POLICY "reminders_employee_update" ON lead_reminders
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- 7. Updated_at trigger
CREATE OR REPLACE FUNCTION update_lead_reminders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lead_reminders_updated_at ON lead_reminders;
CREATE TRIGGER trg_lead_reminders_updated_at
  BEFORE UPDATE ON lead_reminders
  FOR EACH ROW EXECUTE FUNCTION update_lead_reminders_updated_at();
