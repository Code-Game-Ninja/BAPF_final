-- 008_fix_jsonb_boolean_values.sql
-- Fix system_config.value entries that were stored as JSON booleans (true/false)
-- instead of JSON strings ("true"/"false"). The app code always expects strings.

UPDATE system_config
  SET value = to_jsonb(value #>> '{}')
  WHERE jsonb_typeof(value) = 'boolean';

-- Also fix any numeric values stored as JSON numbers instead of strings
UPDATE system_config
  SET value = to_jsonb(value #>> '{}')
  WHERE jsonb_typeof(value) = 'number';

-- ─────────────────────────────────────────────────────────────────
-- Fix database functions that cast system_config.value directly
-- (e.g. value::BOOLEAN). After migration 005 changed value from
-- TEXT to JSONB these casts break. Use (value#>>'{}')::TYPE instead,
-- which extracts the raw text from the JSONB scalar first.
-- ─────────────────────────────────────────────────────────────────

-- 1. trg_audit_log_notify — fires on EVERY audit_logs INSERT
CREATE OR REPLACE FUNCTION trg_audit_log_notify()
RETURNS TRIGGER AS $$
DECLARE
  admin_rec RECORD;
  notify_actions TEXT[] := ARRAY['policy.create', 'policy.delete', 'premium.paid', 'renewal.won', 'user.create'];
  config_enabled BOOLEAN;
BEGIN
  -- Check if notifications are enabled
  SELECT (value#>>'{}')::BOOLEAN INTO config_enabled
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

-- 2. job_generate_renewal_reminders — cron job
CREATE OR REPLACE FUNCTION job_generate_renewal_reminders()
RETURNS void AS $$
DECLARE
  reminder_days INTEGER;
  pol RECORD;
  existing_renewal UUID;
BEGIN
  -- Get configurable reminder days (default 30)
  SELECT COALESCE((value#>>'{}')::INTEGER, 30) INTO reminder_days
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

-- 3. job_auto_mark_absent — cron job
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
  SELECT COALESCE((value#>>'{}')::INTEGER, 90) INTO retention_days
  FROM system_config WHERE key = 'notification_retention_days';
  IF retention_days IS NULL THEN retention_days := 90; END IF;

  DELETE FROM notifications
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
