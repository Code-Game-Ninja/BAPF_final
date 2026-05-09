-- 007_production_fixes.sql
-- Fix all schema mismatches found during production readiness audit.

-- ──────────────────────────────────────────────────────────────
-- 1. Add missing columns to customer_portal_users
-- ──────────────────────────────────────────────────────────────

ALTER TABLE customer_portal_users
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deactivated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reactivated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reactivated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS password_changed_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- ──────────────────────────────────────────────────────────────
-- 2. Add 'cancelled' to premium_status enum
--    Customer cascade-delete sets pending premiums to 'cancelled'.
-- ──────────────────────────────────────────────────────────────

ALTER TYPE premium_status ADD VALUE IF NOT EXISTS 'cancelled';

-- ──────────────────────────────────────────────────────────────
-- 3. Add 'cancelled' to policy_status enum
--    Customer cascade-delete sets policies to 'cancelled'.
-- ──────────────────────────────────────────────────────────────

-- (policy_status already has 'cancelled' — this is a no-op safety check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum WHERE enumlabel = 'cancelled'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'policy_status')
  ) THEN
    ALTER TYPE policy_status ADD VALUE 'cancelled';
  END IF;
END $$;
