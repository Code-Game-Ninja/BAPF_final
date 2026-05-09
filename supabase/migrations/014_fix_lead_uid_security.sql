-- 014 — Fix next_lead_uid / bulk_next_lead_uids SECURITY DEFINER
-- The counters table RLS only allows service_role writes.
-- These functions must use SECURITY DEFINER to bypass RLS,
-- matching the fix applied to next_customer_uid in 005_critical_fixes.

CREATE OR REPLACE FUNCTION next_lead_uid()
RETURNS TEXT AS $$
DECLARE
  next_count INTEGER;
BEGIN
  UPDATE counters SET count = count + 1
    WHERE id = 'sales_leads'
    RETURNING count INTO next_count;
  RETURN 'LID-' || LPAD(next_count::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION bulk_next_lead_uids(n INTEGER)
RETURNS TEXT[] AS $$
DECLARE
  start_count INTEGER;
  result TEXT[];
BEGIN
  UPDATE counters SET count = count + n
    WHERE id = 'sales_leads'
    RETURNING count - n + 1 INTO start_count;
  SELECT ARRAY(
    SELECT 'LID-' || LPAD((start_count + i)::TEXT, 3, '0')
    FROM generate_series(0, n - 1) AS i
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
