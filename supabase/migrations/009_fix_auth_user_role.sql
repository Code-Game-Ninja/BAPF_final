-- 009_fix_auth_user_role.sql
-- Fix auth_user_role() to read the app-level role correctly.
--
-- The original function reads `request.jwt.claims->>'role'` which returns
-- the Supabase *internal* role ("authenticated") — NOT the app-level role
-- ("admin"/"manager"/"employee"). Since COALESCE short-circuits on non-null,
-- the users-table fallback never fires, so is_admin_or_manager() always
-- returns false and every RLS policy on restricted tables blocks access.
--
-- Fix: read from `app_metadata.app_role` in the JWT first (for future
-- custom-claim support), then always fall back to the users table.

CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS TEXT AS $$
DECLARE
  jwt_role TEXT;
BEGIN
  -- 1. Try app_metadata.app_role (custom claim, if set via Supabase hook/trigger)
  BEGIN
    jwt_role := (
      current_setting('request.jwt.claims', true)::json
      ->'app_metadata'->>'app_role'
    );
  EXCEPTION WHEN OTHERS THEN
    jwt_role := NULL;
  END;

  IF jwt_role IS NOT NULL AND jwt_role IN ('admin', 'manager', 'employee') THEN
    RETURN jwt_role;
  END IF;

  -- 2. Fall back to users table lookup (always works)
  RETURN (SELECT role::TEXT FROM users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
