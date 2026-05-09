-- 003_schema_fixes.sql
-- Fixes for issues in 001_initial_schema.sql that has already been applied to production.

-- ──────────────────────────────────────────────────────────────
-- 1. Drop redundant indexes (UNIQUE constraints already create indexes)
-- ──────────────────────────────────────────────────────────────

DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_customers_uid;
DROP INDEX IF EXISTS idx_system_config_key;

-- ──────────────────────────────────────────────────────────────
-- 2. Replace overly-permissive counters_all policy
--    Was: ALL for authenticated → now: SELECT-only for authenticated + ALL for service_role
-- ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "counters_all" ON counters;
DROP POLICY IF EXISTS "counters_select" ON counters;
DROP POLICY IF EXISTS "counters_service_write" ON counters;
CREATE POLICY "counters_select" ON counters FOR SELECT TO authenticated USING (true);
CREATE POLICY "counters_service_write" ON counters FOR ALL TO service_role USING (true);

-- ──────────────────────────────────────────────────────────────
-- 3. Replace overly-permissive login_attempts_all policy
--    Was: ALL for authenticated → now: SELECT for authenticated, INSERT/UPDATE for service_role
-- ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "login_attempts_all" ON login_attempts;
DROP POLICY IF EXISTS "login_attempts_select" ON login_attempts;
DROP POLICY IF EXISTS "login_attempts_insert_service" ON login_attempts;
DROP POLICY IF EXISTS "login_attempts_update_service" ON login_attempts;
CREATE POLICY "login_attempts_select" ON login_attempts FOR SELECT TO authenticated USING (true);
CREATE POLICY "login_attempts_insert_service" ON login_attempts FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "login_attempts_update_service" ON login_attempts FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────
-- 4. Update auto-checkout cron schedule from 06:00 UTC to 13:30 UTC (19:00 IST)
-- ──────────────────────────────────────────────────────────────

SELECT cron.unschedule('auto-mark-absent');
SELECT cron.schedule(
  'auto-mark-absent',
  '30 13 * * 1-6', -- Mon-Sat at 13:30 UTC (19:00 IST)
  'SELECT job_auto_mark_absent()'
);

-- ──────────────────────────────────────────────────────────────
-- 5. Add unique constraint on holidays.date (for seed idempotency)
-- ──────────────────────────────────────────────────────────────

ALTER TABLE holidays ADD CONSTRAINT uq_holidays_date UNIQUE (date);

-- ──────────────────────────────────────────────────────────────
-- 6. Add updated_at trigger for customer_portal_users (from 002)
-- ──────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_customer_portal_users_updated_at ON customer_portal_users;
CREATE TRIGGER trg_customer_portal_users_updated_at
  BEFORE UPDATE ON customer_portal_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ──────────────────────────────────────────────────────────────
-- 7. Add FK on customer_portal_users.auth_user_id → auth.users(id)
-- ──────────────────────────────────────────────────────────────

ALTER TABLE customer_portal_users
  DROP CONSTRAINT IF EXISTS fk_cpu_auth_user_id;
ALTER TABLE customer_portal_users
  ADD CONSTRAINT fk_cpu_auth_user_id FOREIGN KEY (auth_user_id) REFERENCES auth.users(id);

-- ──────────────────────────────────────────────────────────────
-- 8. Atomic policy counter increment function
--    Eliminates read-then-write race in nextPolicyNumber
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_policy_counter(
  counter_key TEXT,
  policy_type TEXT,
  policy_year INT
) RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  new_count INT;
BEGIN
  INSERT INTO system_config (key, value, updated_at)
  VALUES (
    counter_key,
    jsonb_build_object('count', 1, 'type', policy_type, 'year', policy_year),
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
