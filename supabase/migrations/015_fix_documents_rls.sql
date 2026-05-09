-- 015 — Fix documents RLS SELECT policy
-- Employees should only see documents they uploaded.
-- Admin and Manager can see all documents.

DROP POLICY IF EXISTS "docs_select" ON documents;
CREATE POLICY "docs_select" ON documents
  FOR SELECT TO authenticated
  USING (is_admin_or_manager() OR uploaded_by = auth.uid());
