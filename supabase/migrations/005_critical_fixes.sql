-- 005_critical_fixes.sql
-- Fixes critical bugs discovered during migration audit.

-- ──────────────────────────────────────────────────────────────
-- 1. Change system_config.value from TEXT to JSONB
--    The increment_policy_counter() function uses JSONB operations
--    on this column; it must be JSONB not TEXT.
-- ──────────────────────────────────────────────────────────────

-- Only convert if column is still TEXT (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'system_config' AND column_name = 'value'
      AND data_type <> 'jsonb'
  ) THEN
    ALTER TABLE system_config ALTER COLUMN value DROP NOT NULL;
    ALTER TABLE system_config
      ALTER COLUMN value TYPE JSONB
      USING CASE
        WHEN value IS NULL THEN NULL
        WHEN value::text ~~ '{%' OR value::text ~~ '[%' OR value::text ~~ '"' THEN value::text::JSONB
        ELSE to_jsonb(value::text)
      END;
    ALTER TABLE system_config ALTER COLUMN value SET NOT NULL;
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────
-- 2. Fix increment_policy_counter() for JSONB column
--    (replace the broken version from 003)
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_policy_counter(
  counter_key TEXT,
  policy_type TEXT,
  policy_year INT
) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  new_count INT;
BEGIN
  INSERT INTO system_config (key, value, category, updated_at)
  VALUES (
    counter_key,
    jsonb_build_object('count', 1, 'type', policy_type, 'year', policy_year),
    'counters',
    now()
  )
  ON CONFLICT (key) DO UPDATE
    SET value = jsonb_set(
      system_config.value,
      '{count}',
      to_jsonb(COALESCE((system_config.value->>'count')::int, 0) + 1)
    ),
    updated_at = now()
  RETURNING (value->>'count')::int INTO new_count;

  RETURN new_count;
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- 3. Fix bulk_next_customer_uids() parameter name
--    Service calls rpc("bulk_next_customer_uids", { count })
--    but function declared param as "n". Supabase RPC matches by name.
-- ──────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS bulk_next_customer_uids(INTEGER);

CREATE OR REPLACE FUNCTION bulk_next_customer_uids(count INTEGER)
RETURNS TEXT[] AS $$
DECLARE
  start_count INTEGER;
  result TEXT[];
BEGIN
  UPDATE counters SET count = counters.count + bulk_next_customer_uids.count
    WHERE id = 'customers'
    RETURNING counters.count - bulk_next_customer_uids.count + 1 INTO start_count;
  SELECT ARRAY(
    SELECT 'C-' || LPAD((start_count + i)::TEXT, 4, '0')
    FROM generate_series(0, bulk_next_customer_uids.count - 1) AS i
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────
-- 4. Make counter functions SECURITY DEFINER
--    RLS on counters only allows service_role writes;
--    these functions must bypass RLS to work from client calls.
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION next_customer_uid()
RETURNS TEXT AS $$
DECLARE
  next_count INTEGER;
BEGIN
  UPDATE counters SET count = count + 1 WHERE id = 'customers' RETURNING count INTO next_count;
  RETURN 'C-' || LPAD(next_count::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────
-- 5. Fix migration 003 duplicate conflicts
--    Drop policies/triggers that 003 tries to create but 001 already defines.
--    This makes re-running idempotent on a fresh DB.
-- ──────────────────────────────────────────────────────────────

-- Drop the duplicate trigger from 002 that 003 also creates
DROP TRIGGER IF EXISTS trg_customer_portal_users_updated_at ON customer_portal_users;
CREATE TRIGGER trg_customer_portal_users_updated_at
  BEFORE UPDATE ON customer_portal_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Drop + re-create duplicate FK from 002/003
ALTER TABLE customer_portal_users
  DROP CONSTRAINT IF EXISTS fk_cpu_auth_user_id;
-- (The inline FK from 002's CREATE TABLE already covers this)

-- ──────────────────────────────────────────────────────────────
-- 6. Fix customer_portal_users RLS (was fully open)
-- ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "cpu_select" ON customer_portal_users;
DROP POLICY IF EXISTS "cpu_insert" ON customer_portal_users;
DROP POLICY IF EXISTS "cpu_update" ON customer_portal_users;
DROP POLICY IF EXISTS "cpu_delete" ON customer_portal_users;

CREATE POLICY "cpu_select" ON customer_portal_users
  FOR SELECT TO authenticated
  USING (is_admin_or_manager() OR auth_user_id = auth.uid());

CREATE POLICY "cpu_insert" ON customer_portal_users
  FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_manager());

CREATE POLICY "cpu_update" ON customer_portal_users
  FOR UPDATE TO authenticated
  USING (is_admin_or_manager())
  WITH CHECK (is_admin_or_manager());

CREATE POLICY "cpu_delete" ON customer_portal_users
  FOR DELETE TO authenticated
  USING (is_admin_or_manager());

-- ──────────────────────────────────────────────────────────────
-- 7. Fix login_attempts: add timestamps + allow anon/authenticated writes
--    Auth flow upserts from client-side (not service_role).
-- ──────────────────────────────────────────────────────────────

ALTER TABLE login_attempts
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create a SECURITY DEFINER function so the client can safely track attempts
CREATE OR REPLACE FUNCTION track_login_attempt(attempt_email TEXT)
RETURNS TABLE(attempt_count INTEGER, is_locked BOOLEAN) AS $$
DECLARE
  max_attempts INTEGER;
BEGIN
  -- Read lockout config
  SELECT COALESCE((value->>'max_login_attempts')::int, 5) INTO max_attempts
  FROM system_config WHERE key = 'max_login_attempts';
  IF max_attempts IS NULL THEN max_attempts := 5; END IF;

  INSERT INTO login_attempts (email, count, last_attempt, created_at, updated_at)
  VALUES (attempt_email, 1, now(), now(), now())
  ON CONFLICT (email) DO UPDATE
    SET count = CASE
        WHEN login_attempts.locked_until IS NOT NULL AND login_attempts.locked_until > now()
          THEN login_attempts.count
        WHEN login_attempts.locked_until IS NOT NULL AND login_attempts.locked_until <= now()
          THEN 1  -- lock expired, reset
        ELSE login_attempts.count + 1
      END,
      locked_until = CASE
        WHEN login_attempts.count + 1 >= max_attempts
          THEN now() + interval '15 minutes'
        ELSE login_attempts.locked_until
      END,
      last_attempt = now(),
      updated_at = now();

  RETURN QUERY
    SELECT la.count, (la.locked_until IS NOT NULL AND la.locked_until > now())
    FROM login_attempts la WHERE la.email = attempt_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow clearing on successful login
CREATE OR REPLACE FUNCTION clear_login_attempts(attempt_email TEXT)
RETURNS void AS $$
BEGIN
  UPDATE login_attempts
  SET count = 0, locked_until = NULL, updated_at = now()
  WHERE email = attempt_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────
-- 8. Deny UPDATE/DELETE on audit_logs explicitly
-- ──────────────────────────────────────────────────────────────

-- These policies explicitly deny mutation. Even service_role should not modify.
DROP POLICY IF EXISTS "audit_deny_update" ON audit_logs;
CREATE POLICY "audit_deny_update" ON audit_logs
  FOR UPDATE TO authenticated USING (false);
DROP POLICY IF EXISTS "audit_deny_delete" ON audit_logs;
CREATE POLICY "audit_deny_delete" ON audit_logs
  FOR DELETE TO authenticated USING (false);

-- ──────────────────────────────────────────────────────────────
-- 9. Add missing composite indexes for query performance
-- ──────────────────────────────────────────────────────────────

-- Policies
CREATE INDEX IF NOT EXISTS idx_policies_assigned_status ON policies(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_policies_customer_status ON policies(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_policies_branch_status ON policies(branch_id, status);
CREATE INDEX IF NOT EXISTS idx_policies_type_status ON policies(policy_type, status);
CREATE INDEX IF NOT EXISTS idx_policies_status_end_date ON policies(status, end_date);
CREATE INDEX IF NOT EXISTS idx_policies_created_by_created_at ON policies(created_by, created_at DESC);

-- Renewals
CREATE INDEX IF NOT EXISTS idx_renewals_status_due_date ON renewals(status, due_date);
CREATE INDEX IF NOT EXISTS idx_renewals_updated_by_status ON renewals(updated_by, status);
CREATE INDEX IF NOT EXISTS idx_renewals_customer_status ON renewals(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_renewals_policy_status ON renewals(policy_id, status);

-- Premiums
CREATE INDEX IF NOT EXISTS idx_premiums_policy_status ON premiums(policy_id, status);
CREATE INDEX IF NOT EXISTS idx_premiums_customer_status ON premiums(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_premiums_status_due_date ON premiums(status, due_date);

-- Commissions
CREATE INDEX IF NOT EXISTS idx_commissions_user_status ON commissions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_commissions_user_created ON commissions(user_id, created_at DESC);

-- Audit Logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module_created ON audit_logs(module, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module_action ON audit_logs(module, action);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_type ON notifications(user_id, type);

-- Attendance
CREATE INDEX IF NOT EXISTS idx_attendance_date_status ON attendance(date, status);

-- Add customer_portal_users.created_by FK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_cpu_created_by' AND table_name = 'customer_portal_users'
  ) THEN
    ALTER TABLE customer_portal_users
      ADD CONSTRAINT fk_cpu_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;
