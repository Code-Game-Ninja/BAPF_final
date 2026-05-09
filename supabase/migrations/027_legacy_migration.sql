-- Migration 027: Legacy Data Migration (Leads & Proposals to Business Cases)

-- 1. Migrate Sales Leads
INSERT INTO business_cases (
  case_number,
  customer_id,
  lob,
  case_type,
  status,
  assigned_to,
  priority,
  payload,
  created_by,
  created_at,
  updated_at
)
SELECT 
  lead_number,
  converted_customer_id, -- Note: Only leads that have a customer_id can be fully mapped, but business_cases requires customer_id. 
  'other'::policy_type_enum, -- Default LOB
  'lead'::case_type_enum,
  CASE 
    WHEN status IN ('new', 'contacted', 'follow_up') THEN 'open'::case_status_enum
    WHEN status = 'interested' THEN 'processing'::case_status_enum
    WHEN status = 'converted' THEN 'won'::case_status_enum
    ELSE 'lost'::case_status_enum
  END,
  assigned_to,
  priority,
  json_build_object(
    'customer_name', customer_name,
    'mobile', mobile,
    'email', email,
    'source', source,
    'notes', notes
  ),
  created_by,
  created_at,
  updated_at
FROM sales_leads
WHERE converted_customer_id IS NOT NULL;

-- 2. Migrate Proposals
INSERT INTO business_cases (
  case_number,
  customer_id,
  lob,
  case_type,
  status,
  assigned_to,
  payload,
  created_by,
  created_at,
  updated_at
)
SELECT 
  proposal_number,
  customer_id,
  COALESCE(policy_type, 'other')::policy_type_enum,
  'proposal'::case_type_enum,
  CASE 
    WHEN status IN ('draft', 'submitted', 'under_review') THEN 'open'::case_status_enum
    WHEN status IN ('quote_received', 'approved') THEN 'processing'::case_status_enum
    WHEN status = 'converted' THEN 'won'::case_status_enum
    ELSE 'lost'::case_status_enum
  END,
  assigned_to,
  json_build_object(
    'insurer_name', insurer_name,
    'sum_insured', sum_insured,
    'premium_quoted', premium_quoted,
    'premium_final', premium_final,
    'notes', notes
  ),
  created_by,
  created_at,
  updated_at
FROM proposals
WHERE customer_id IS NOT NULL;
