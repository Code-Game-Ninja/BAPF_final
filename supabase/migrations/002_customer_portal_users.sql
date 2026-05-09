-- Create the customer_portal_users table used by the credentials page
-- and portal-account API routes.

CREATE TABLE IF NOT EXISTS public.customer_portal_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  portal_password TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  first_login BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by customer
CREATE INDEX IF NOT EXISTS idx_cpu_customer_id ON public.customer_portal_users(customer_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cpu_auth_user_id ON public.customer_portal_users(auth_user_id);

-- RLS
ALTER TABLE public.customer_portal_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cpu_select" ON public.customer_portal_users
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "cpu_insert" ON public.customer_portal_users
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "cpu_update" ON public.customer_portal_users
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "cpu_delete" ON public.customer_portal_users
  FOR DELETE TO authenticated USING (true);

-- Auto-update updated_at on row changes
CREATE TRIGGER trg_customer_portal_users_updated_at
  BEFORE UPDATE ON public.customer_portal_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
