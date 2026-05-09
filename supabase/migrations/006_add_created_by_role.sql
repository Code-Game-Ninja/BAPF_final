-- 006_add_created_by_role.sql
-- Add created_by_role column to policies table.
-- The API route stamps this from the JWT so we know which role created each policy.

ALTER TABLE policies
  ADD COLUMN IF NOT EXISTS created_by_role TEXT;

-- Backfill existing rows from the users table
UPDATE policies p
  SET created_by_role = u.role::TEXT
  FROM users u
  WHERE p.created_by = u.id
    AND p.created_by_role IS NULL;
