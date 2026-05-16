-- ============================================================
-- BP & AF Insurance Broker — Comprehensive Seed Data
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- STEP 1 — Auth Users (Supabase auth.users)
-- ──────────────────────────────────────────────────────────────
DO $$
DECLARE
  admin_id    UUID := '00000000-0000-0000-0000-000000000001';
  manager_id  UUID := '00000000-0000-0000-0000-000000000002';
  employee_id UUID := '00000000-0000-0000-0000-000000000003';
BEGIN
  -- Admin
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role, raw_app_meta_data, raw_user_meta_data)
  VALUES (admin_id, '00000000-0000-0000-0000-000000000000', 'admin@bpaf.com', crypt('Admin@123456', gen_salt('bf')), NOW(), NOW(), NOW(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb, '{"name":"Admin User","role":"admin"}'::jsonb)
  ON CONFLICT (id) DO NOTHING;

  -- Manager
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role, raw_app_meta_data, raw_user_meta_data)
  VALUES (manager_id, '00000000-0000-0000-0000-000000000000', 'manager@bpaf.com', crypt('Manager@123456', gen_salt('bf')), NOW(), NOW(), NOW(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"],"role":"manager"}'::jsonb, '{"name":"Priya Sharma","role":"manager"}'::jsonb)
  ON CONFLICT (id) DO NOTHING;

  -- Employee
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role, raw_app_meta_data, raw_user_meta_data)
  VALUES (employee_id, '00000000-0000-0000-0000-000000000000', 'employee@bpaf.com', crypt('Employee@123456', gen_salt('bf')), NOW(), NOW(), NOW(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"],"role":"employee"}'::jsonb, '{"name":"Rahul Verma","role":"employee"}'::jsonb)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- ──────────────────────────────────────────────────────────────
-- STEP 1b — Auth Identities (required for email/password login)
-- ──────────────────────────────────────────────────────────────
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'admin@bpaf.com',
    '{"sub":"00000000-0000-0000-0000-000000000001","email":"admin@bpaf.com","email_verified":true}'::jsonb,
    'email', NOW(), NOW(), NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    'manager@bpaf.com',
    '{"sub":"00000000-0000-0000-0000-000000000002","email":"manager@bpaf.com","email_verified":true}'::jsonb,
    'email', NOW(), NOW(), NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000003',
    'employee@bpaf.com',
    '{"sub":"00000000-0000-0000-0000-000000000003","email":"employee@bpaf.com","email_verified":true}'::jsonb,
    'email', NOW(), NOW(), NOW()
  )
ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────────────────────────
-- STEP 2 — Branches & User Profiles
-- ──────────────────────────────────────────────────────────────
INSERT INTO branches (id, name, address, city, state, pincode, phone, is_active)
VALUES ('10000000-0000-0000-0000-000000000001', 'BP & AF Main Branch', '42 Insurance Tower, MG Road', 'Mumbai', 'Maharashtra', '400001', '+91 22 1234 5678', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, name, email, role, status, phone, branch_id, bio)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Admin User', 'admin@bpaf.com', 'admin', 'active', '+91 98765 00001', '10000000-0000-0000-0000-000000000001', 'System Administrator'),
  ('00000000-0000-0000-0000-000000000002', 'Priya Sharma', 'manager@bpaf.com', 'manager', 'active', '+91 98765 00002', '10000000-0000-0000-0000-000000000001', 'Branch Manager'),
  ('00000000-0000-0000-0000-000000000003', 'Rahul Verma', 'employee@bpaf.com', 'employee', 'active', '+91 98765 00003', '10000000-0000-0000-0000-000000000001', 'Insurance Advisor')
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────────────────────────
-- STEP 3 — Customers
-- ──────────────────────────────────────────────────────────────
INSERT INTO customers (id, uid, name, email, phone, city, status, customer_type, created_by)
VALUES
  ('c0000001-0000-0000-0000-000000000001', 'CUST-1001', 'Amit Malhotra', 'amit.m@example.com', '9810012345', 'Delhi', 'active', 'individual', '00000000-0000-0000-0000-000000000001'),
  ('c0000002-0000-0000-0000-000000000002', 'CUST-1002', 'Sunita Rao', 'sunita.rao@example.com', '9820054321', 'Mumbai', 'active', 'individual', '00000000-0000-0000-0000-000000000001'),
  ('c0000003-0000-0000-0000-000000000003', 'CUST-1003', 'Vikram Singh', 'v.singh@example.com', '9830098765', 'Bangalore', 'active', 'individual', '00000000-0000-0000-0000-000000000001'),
  ('c0000004-0000-0000-0000-000000000004', 'CUST-1004', 'Deepak Jain', 'deepak.jain@example.com', '9840011223', 'Pune', 'active', 'individual', '00000000-0000-0000-0000-000000000001'),
  ('c0000005-0000-0000-0000-000000000005', 'CUST-1005', 'Anjali Gupta', 'anjali.g@example.com', '9850044556', 'Chennai', 'active', 'individual', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────────────────────────
-- STEP 4 — Policies
-- ──────────────────────────────────────────────────────────────
INSERT INTO policies (id, policy_number, policy_type, customer_id, customer_name, insurer_name, premium_amount, sum_insured, status, start_date, end_date, created_by, assigned_to, branch_id)
VALUES
  ('a0000001-0000-0000-0000-000000000001', 'POL-MOT-12345', 'motor', 'c0000001-0000-0000-0000-000000000001', 'Amit Malhotra', 'HDFC ERGO', 15000, 500000, 'active', NOW() - INTERVAL '3 months', NOW() + INTERVAL '9 months', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001'),
  ('a0000002-0000-0000-0000-000000000002', 'POL-HEA-67890', 'health', 'c0000002-0000-0000-0000-000000000002', 'Sunita Rao', 'Star Health', 25000, 1000000, 'active', NOW() - INTERVAL '6 months', NOW() + INTERVAL '6 months', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001'),
  ('a0000003-0000-0000-0000-000000000003', 'POL-LIF-11223', 'life', 'c0000003-0000-0000-0000-000000000003', 'Vikram Singh', 'LIC', 45000, 5000000, 'active', NOW() - INTERVAL '1 month', NOW() + INTERVAL '11 months', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────────────────────────
-- STEP 5 — Sales Leads
-- ──────────────────────────────────────────────────────────────
INSERT INTO sales_leads (lead_number, customer_name, email, mobile, status, source, assigned_to, created_by)
VALUES
  (next_lead_uid(), 'Rohan Kapoor', 'rohan.k@example.com', '9900011111', 'new', 'online', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001'),
  (next_lead_uid(), 'Suresh Iyer', 'suresh.i@example.com', '9900022222', 'contacted', 'referral', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001'),
  (next_lead_uid(), 'Pooja Bhatt', 'pooja.b@example.com', '9900033333', 'proposal_sent', 'telecall', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────────────────────────
-- STEP 6 — Attendance
-- ──────────────────────────────────────────────────────────────
INSERT INTO attendance (user_id, date, check_in, check_out, status, branch_id)
VALUES
  ('00000000-0000-0000-0000-000000000003', CURRENT_DATE, CURRENT_DATE + '09:00:00'::time, CURRENT_DATE + '18:00:00'::time, 'present', '10000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002', CURRENT_DATE, CURRENT_DATE + '09:15:00'::time, CURRENT_DATE + '18:30:00'::time, 'present', '10000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────────────────────────
-- STEP 7 — Commission Rules
-- ──────────────────────────────────────────────────────────────
DELETE FROM commission_rules WHERE is_active = true;
INSERT INTO commission_rules (policy_type, commission_type, value, insurer_name, is_active)
VALUES
  ('motor',  'percentage', 15.00, 'HDFC ERGO', true),
  ('health', 'percentage', 20.00, 'Star Health', true),
  ('life',   'percentage', 25.00, 'LIC', true),
  ('other',  'percentage', 10.00, NULL, true)
ON CONFLICT DO NOTHING;
