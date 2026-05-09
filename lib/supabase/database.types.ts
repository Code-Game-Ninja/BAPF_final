/**
 * Supabase Database Types
 *
 * These types map to the PostgreSQL schema. This file is intentionally
 * permissive while the migration work is in progress so Supabase table and
 * RPC names remain type-safe without blocking on a full regenerated schema.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type AnyRow = {
  [key: string]: any;
};

type AnyTable = {
  Row: AnyRow;
  Insert: AnyRow;
  Update: AnyRow;
  Relationships: [];
};

type AnyFunction = {
  Args: Record<string, any>;
  Returns: any;
};

export type Database = {
  public: {
    Tables: {
      users: AnyTable;
      branches: AnyTable;
      counters: AnyTable;
      customers: AnyTable;
      campaigns: AnyTable;
      policies: AnyTable;
      commission_rules: AnyTable;
      renewals: AnyTable;
      premiums: AnyTable;
      commissions: AnyTable;
      attendance: AnyTable;
      early_checkout_requests: AnyTable;
      holidays: AnyTable;
      documents: AnyTable;
      notifications: AnyTable;
      audit_logs: AnyTable;
      system_config: AnyTable;
      company_templates: AnyTable;
      daily_reminders: AnyTable;
      policy_verification_logs: AnyTable;
      login_attempts: AnyTable;
      aggregations: AnyTable;
      reports: AnyTable;
      archives: AnyTable;
      customer_portal_users: AnyTable;
      sales_leads: AnyTable;
      lead_timeline: AnyTable;
      lead_documents: AnyTable;
      business_cases: AnyTable;
      service_tickets: AnyTable;
      ticket_notes: AnyTable;
      ticket_activity_log: AnyTable;
      ticket_documents: AnyTable;
      ticket_templates: AnyTable;
      sla_config: AnyTable;
      business_hours_config: AnyTable;
      validity_registry: AnyTable;
      
      // CRM Extension Tables
      claims: AnyTable;
      claim_documents: AnyTable;
      claim_timeline: AnyTable;
      proposals: AnyTable;
      proposal_timeline: AnyTable;
      invoices: AnyTable;
      invoice_items: AnyTable;
      endorsements: AnyTable;
      kyc_documents: AnyTable;
      sops: AnyTable;
      communication_logs: AnyTable;
      communication_templates: AnyTable;
      customer_family_members: AnyTable;
      ledger_entries: AnyTable;
      inquiry: AnyTable;
      
      // Additional CRM Tables
      commission_rates: AnyTable;
      commission_reconciliation_records: AnyTable;
      commission_reconciliation_runs: AnyTable;
      compliance_items: AnyTable;
      error_logs: AnyTable;
      fleet_drivers: AnyTable;
      fleet_validity_documents: AnyTable;
      fleet_vehicle_endorsements: AnyTable;
      fleet_vehicles: AnyTable;
      follow_up_tasks: AnyTable;
      gmc_ecard_generations: AnyTable;
      gmc_ecard_templates: AnyTable;
      gmc_member_endorsements: AnyTable;
      gmc_members: AnyTable;
      irda_reports: AnyTable;
      performance_logs: AnyTable;
      quote_requests: AnyTable;
      renewal_pipeline: AnyTable;
      renewal_stage_history: AnyTable;
      todos: AnyTable;
    };
    Views: {
      [key: string]: never;
    };
    Functions: {
      update_updated_at: AnyFunction;
      next_customer_uid: AnyFunction;
      bulk_next_customer_uids: AnyFunction;
      increment_counter: AnyFunction;
      increment_policy_counter: AnyFunction;
      auth_user_role: AnyFunction;
      is_admin: AnyFunction;
      is_admin_or_manager: AnyFunction;
      trg_policy_created_commission: AnyFunction;
      trg_policy_cancelled_commissions: AnyFunction;
      trg_audit_log_notify: AnyFunction;
      job_mark_overdue_premiums: AnyFunction;
      job_mark_expired_policies: AnyFunction;
      job_generate_renewal_reminders: AnyFunction;
      job_auto_mark_absent: AnyFunction;
      job_weekly_aggregation: AnyFunction;
      job_monthly_report: AnyFunction;
      track_login_attempt: AnyFunction;
      clear_login_attempts: AnyFunction;
      next_lead_uid: AnyFunction;
      bulk_next_lead_uids: AnyFunction;
      trg_lead_status_change: AnyFunction;
      get_error_summary: AnyFunction;
      get_performance_summary: AnyFunction;
    };
    Enums: {
      user_role: "admin" | "manager" | "employee";
      user_status: "active" | "inactive";
      policy_status: "active" | "expired" | "cancelled" | "archived";
      policy_type_enum:
        | "motor"
        | "health"
        | "life"
        | "fire"
        | "marine"
        | "burglary"
        | "liability"
        | "workmen_compensation"
        | "car_ear"
        | "surety_bond"
        | "travel"
        | "other";
      payment_frequency: "annual" | "semi-annual" | "quarterly" | "monthly" | "single";
      renewal_status: "due" | "contacted" | "renewed" | "lost";
      premium_status: "pending" | "collected" | "overdue" | "cancelled";
      commission_status: "pending" | "approved" | "paid" | "rejected";
      commission_type: "percentage" | "flat";
      attendance_status: "present" | "absent" | "half-day" | "late" | "leave";
      early_checkout_status: "pending" | "approved" | "rejected";
      campaign_status: "draft" | "active" | "completed";
      lead_status: "new" | "contacted" | "follow_up" | "interested" | "not_interested" | "converted" | "lost";
      lead_source: "referral" | "walk_in" | "online" | "telecall" | "social_media" | "agent" | "other";
      lead_priority: "low" | "medium" | "high" | "urgent";
    };
    CompositeTypes: {
      [key: string]: never;
    };
  };
};
