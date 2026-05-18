-- ============================================================
-- Migration 032: Customer Claims Access
-- ============================================================

-- 1. Make created_by optional since claims can now be created by customers via portal
ALTER TABLE claims ALTER COLUMN created_by DROP NOT NULL;

-- 2. Add source column to know where the claim came from
ALTER TABLE claims ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'backoffice';

-- 3. Add RLS policy for customers to SELECT their own claims
DROP POLICY IF EXISTS "claims_customer_select" ON claims;
CREATE POLICY "claims_customer_select" ON claims
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customer_portal_users 
      WHERE auth_user_id = auth.uid() 
      AND customer_id = claims.customer_id
    )
  );

-- 4. Add RLS policy for customers to INSERT their own claims
DROP POLICY IF EXISTS "claims_customer_insert" ON claims;
CREATE POLICY "claims_customer_insert" ON claims
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customer_portal_users 
      WHERE auth_user_id = auth.uid() 
      AND customer_id = claims.customer_id
    )
  );
