-- ============================================================
-- BP & AF Insurance Broker — Clear All Data Script
-- Run BEFORE seeding fresh data
-- Truncates all tables while preserving schema
-- ============================================================

-- Disable foreign key checks temporarily
SET session_replication_role = 'replica';

-- Truncate all tables in dependency order (children first, parents last)
TRUNCATE TABLE 
  -- Monitoring & Logs (no dependencies)
  api_metrics,
  error_logs,
  performance_logs,
  system_health,
  login_attempts,
  audit_logs,
  
  -- Documents & Attachments
  claim_documents,
  lead_documents,
  kyc_documents,
  documents,
  
  -- Timeline & Activity
  claim_timeline,
  lead_timeline,
  proposal_timeline,
  
  -- Transactions
  invoice_items,
  invoices,
  ledger_entries,
  commissions,
  premiums,
  endorsements,
  
  -- Core Business Objects
  validity_registry,
  archives,
  policy_verification_logs,
  claims,
  proposals,
  sales_leads,
  business_cases,
  renewals,
  policies,
  
  -- Customer & Portal
  customer_family_members,
  public.customer_portal_users,
  customers,
  
  -- System & Config
  communication_logs,
  communication_templates,
  company_templates,
  sops,
  reports,
  system_config,
  service_tickets,
  daily_reminders,
  lead_reminders,
  notifications,
  counters,
  
  -- Attendance & HR
  early_checkout_requests,
  attendance,
  holidays,
  
  -- Campaigns
  campaigns,
  
  -- Commission Rules (no dependencies)
  commission_rules,
  
  -- Users & Branches (parents, truncate last)
  users,
  branches,
  
  -- Aggregations
  aggregations
CASCADE;

-- Re-enable foreign key checks
SET session_replication_role = 'origin';

-- Reset the customer counter
UPDATE counters SET count = 0 WHERE id = 'customers';

-- Clear auth users (optional - keep if you want to preserve auth users)
-- DELETE FROM auth.users WHERE email NOT LIKE '%@bpaf.com';

-- Verify cleanup
SELECT 'Data cleared successfully' as status;
