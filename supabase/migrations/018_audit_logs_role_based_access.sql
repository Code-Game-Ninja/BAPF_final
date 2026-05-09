-- ================================================================
-- Migration: Role-Based Access for Audit Logs
--
-- Purpose: Allow all users to see activity logs based on their role:
--   - Employee: Only their own activities
--   - Manager: Their own activities + all employee activities
--   - Admin: Their own activities + all manager/employee activities
--           (NOT other admins' activities)
-- ================================================================

-- Drop existing audit_logs select policy
DROP POLICY IF EXISTS "audit_select" ON audit_logs;

-- Create new role-based select policy for audit_logs
-- Uses a function to get the current user's role from the users table
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM users WHERE id = auth.uid();
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create the new policy with role-based filtering
CREATE POLICY "audit_select_role_based" ON audit_logs
FOR SELECT TO authenticated
USING (
  CASE get_current_user_role()
    -- Admin: Can see their own + all manager + all employee activities (NOT other admins)
    WHEN 'admin' THEN
      user_id = auth.uid() OR user_role IN ('employee', 'manager')
    -- Manager: Can see their own + all employee activities
    WHEN 'manager' THEN
      user_id = auth.uid() OR user_role = 'employee'
    -- Employee: Can only see their own activities
    WHEN 'employee' THEN
      user_id = auth.uid()
    -- Default: No access
    ELSE false
  END
);

-- Add comment for documentation
COMMENT ON POLICY "audit_select_role_based" ON audit_logs IS
  'Role-based access: Admin sees own+managers+employees, Manager sees own+employees, Employee sees only own activities';
