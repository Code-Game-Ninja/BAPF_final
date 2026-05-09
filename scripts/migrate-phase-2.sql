-- ============================================================
-- PHASE 2: Service Desk with SLA Engine
-- Run this in your Supabase SQL Editor AFTER Phase 1
-- ============================================================

-- ── 1. Extend service_tickets ────────────────────────────────
ALTER TABLE service_tickets
  ADD COLUMN IF NOT EXISTS escalation_level       INTEGER DEFAULT 0 CHECK (escalation_level IN (0,1,2)),
  ADD COLUMN IF NOT EXISTS escalated_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalation_reason      TEXT,
  ADD COLUMN IF NOT EXISTS is_breached            BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS breached_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_at              TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolution_time_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS resolved_on_time       BOOLEAN,
  ADD COLUMN IF NOT EXISTS sla_paused_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_total_pause_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS archived_at            TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_tickets_status      ON service_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_owner       ON service_tickets(owner_id);
CREATE INDEX IF NOT EXISTS idx_tickets_customer    ON service_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_sla         ON service_tickets(sla_deadline);
CREATE INDEX IF NOT EXISTS idx_tickets_breached    ON service_tickets(is_breached);
CREATE INDEX IF NOT EXISTS idx_tickets_escalation  ON service_tickets(escalation_level);

-- ── 2. ticket_templates ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_templates (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                     TEXT NOT NULL,
  category                 TEXT NOT NULL,
  priority                 TEXT NOT NULL DEFAULT 'medium',
  description_template     TEXT,
  internal_notes_template  TEXT,
  created_by               UUID NOT NULL REFERENCES users(id),
  is_active                BOOLEAN DEFAULT TRUE,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

-- Add template_id FK now that table exists
ALTER TABLE service_tickets
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES ticket_templates(id);

-- ── 3. ticket_notes ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID NOT NULL REFERENCES service_tickets(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  visibility  TEXT NOT NULL DEFAULT 'internal' CHECK (visibility IN ('internal','customer')),
  author_id   UUID NOT NULL REFERENCES users(id),
  author_name TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_ticket_notes_ticket     ON ticket_notes(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_notes_visibility ON ticket_notes(visibility);

-- ── 4. ticket_activity_log ───────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_activity_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id        UUID NOT NULL REFERENCES service_tickets(id) ON DELETE CASCADE,
  entry_type       TEXT NOT NULL CHECK (entry_type IN (
    'created','status_changed','assigned','reassigned','note_added',
    'document_uploaded','document_deleted','escalated','sla_breached',
    'sla_paused','sla_resumed','archived'
  )),
  description      TEXT NOT NULL,
  old_value        TEXT,
  new_value        TEXT,
  performed_by     UUID REFERENCES users(id),
  performed_by_name TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activity_log_ticket  ON ticket_activity_log(ticket_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON ticket_activity_log(created_at DESC);

-- ── 5. ticket_documents ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_documents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id        UUID NOT NULL REFERENCES service_tickets(id) ON DELETE CASCADE,
  file_name        TEXT NOT NULL,
  file_path        TEXT NOT NULL,
  file_url         TEXT NOT NULL,
  file_size        INTEGER,
  uploaded_by      UUID NOT NULL REFERENCES users(id),
  uploaded_by_name TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_ticket_docs_ticket ON ticket_documents(ticket_id);

-- ── 6. sla_config ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sla_config (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category   TEXT NOT NULL,
  priority   TEXT NOT NULL,
  sla_hours  NUMERIC NOT NULL CHECK (sla_hours > 0),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category, priority)
);

INSERT INTO sla_config (category, priority, sla_hours) VALUES
  ('ecard_request',     'urgent', 4),
  ('ecard_request',     'high',   8),
  ('ecard_request',     'medium', 24),
  ('ecard_request',     'low',    48),
  ('member_endorsement','urgent', 8),
  ('member_endorsement','high',   24),
  ('member_endorsement','medium', 48),
  ('member_endorsement','low',    72),
  ('name_correction',   'urgent', 4),
  ('name_correction',   'high',   8),
  ('name_correction',   'medium', 24),
  ('name_correction',   'low',    48),
  ('address_correction','urgent', 4),
  ('address_correction','high',   8),
  ('address_correction','medium', 24),
  ('address_correction','low',    48),
  ('invoice_dispute',   'urgent', 8),
  ('invoice_dispute',   'high',   24),
  ('invoice_dispute',   'medium', 48),
  ('invoice_dispute',   'low',    72),
  ('claim_assistance',  'urgent', 4),
  ('claim_assistance',  'high',   8),
  ('claim_assistance',  'medium', 24),
  ('claim_assistance',  'low',    48),
  ('general_query',     'urgent', 4),
  ('general_query',     'high',   8),
  ('general_query',     'medium', 16),
  ('general_query',     'low',    24)
ON CONFLICT (category, priority) DO NOTHING;

-- ── 7. business_hours_config ─────────────────────────────────
CREATE TABLE IF NOT EXISTS business_hours_config (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week    INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time     TIME NOT NULL DEFAULT '09:00',
  end_time       TIME NOT NULL DEFAULT '18:00',
  is_working_day BOOLEAN DEFAULT TRUE,
  updated_by     UUID REFERENCES users(id),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(day_of_week)
);

INSERT INTO business_hours_config (day_of_week, start_time, end_time, is_working_day) VALUES
  (0, '09:00', '18:00', FALSE),
  (1, '09:00', '18:00', TRUE),
  (2, '09:00', '18:00', TRUE),
  (3, '09:00', '18:00', TRUE),
  (4, '09:00', '18:00', TRUE),
  (5, '09:00', '18:00', TRUE),
  (6, '09:00', '18:00', FALSE)
ON CONFLICT (day_of_week) DO NOTHING;

-- ── 8. holidays extension ────────────────────────────────────
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS year INTEGER;
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);

-- ── 9. pg_cron jobs (requires pg_cron extension enabled) ─────
-- Enable extension first: CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'sla-breach-check',
  '*/5 * * * *',
  $$
    UPDATE service_tickets
    SET is_breached = TRUE, breached_at = NOW()
    WHERE sla_deadline < NOW()
      AND status NOT IN ('resolved','closed')
      AND is_breached = FALSE;
  $$
);

SELECT cron.schedule(
  'escalation-check',
  '*/15 * * * *',
  $$
    UPDATE service_tickets
    SET escalation_level = 1, escalated_at = NOW()
    WHERE sla_deadline + INTERVAL '2 hours' < NOW()
      AND status NOT IN ('resolved','closed')
      AND escalation_level = 0;

    UPDATE service_tickets
    SET escalation_level = 2, escalated_at = NOW()
    WHERE sla_deadline + INTERVAL '4 hours' < NOW()
      AND status NOT IN ('resolved','closed')
      AND escalation_level = 1;
  $$
);

SELECT cron.schedule(
  'ticket-archival',
  '0 2 * * *',
  $$
    UPDATE service_tickets
    SET archived_at = NOW()
    WHERE status = 'closed'
      AND closed_at < NOW() - INTERVAL '90 days'
      AND archived_at IS NULL;
  $$
);

SELECT 'Phase 2 migration complete' AS status;
