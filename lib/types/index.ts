// ============================================================
// BP & AF Insurance Broker — Core TypeScript Types
// Mapped from ER Diagram (14 entities) + Existing Codebase
// ============================================================

// ---- Enums & Unions ----

export type UserRole = "admin" | "manager" | "employee";
export type UserStatus = "active" | "inactive";
export type UserDesignation = "employee" | "bqp" | "posp";

export type PolicyStatus = "active" | "expired" | "cancelled" | "archived";
export type PolicyType = "motor" | "health" | "life" | "fire" | "marine" | "burglary" | "liability" | "workmen_compensation" | "car_ear" | "surety_bond" | "travel" | "other";
export type PaymentFrequency = "annual" | "semi-annual" | "quarterly" | "monthly" | "single";
export type BusinessType = "fresh" | "renewal";
export type PaymentMethod = "cash" | "cheque" | "neft" | "rtgs" | "upi" | "card" | "online" | "other";

export type RenewalStatus = "due" | "contacted" | "renewed" | "lost";

export type PremiumStatus = "pending" | "collected" | "overdue";

export type CommissionStatus = "pending" | "approved" | "paid" | "rejected";
export type CommissionType = "percentage" | "flat";

export type AttendanceStatus = "present" | "absent" | "half-day" | "late" | "leave";

export type NotificationType = "policy_expiry" | "renewal" | "assignment" | "attendance" | "commission" | "system" | "lead_assignment" | "lead_follow_up" | "lead_status" | "claim_update" | "invoice";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "login"
  | "logout"
  | "pdf_upload"
  | "bulk_import"
  | "config_change"
  | "password_change"
  | "forbidden_access"
  | "ip_blocked"
  | "role_denied"
  | "rate_limited"
  | "deactivate";

// ---- Base Interface ----

export interface BaseDocument {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// ---- 1. USER ----

export interface User extends BaseDocument {
  uid: string; // Supabase Auth UID
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  phone?: string;
  branch_id?: string;
  bio?: string;
  avatarUrl?: string;
  lastLoginAt?: string;
  designation?: UserDesignation;
  mapped_manager_id?: string;
  mapped_bqp_id?: string;
}

// ---- 2. BRANCH ----

export interface Branch extends BaseDocument {
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone?: string;
  isActive: boolean;
}

// ---- 3. CUSTOMER ----

export type CustomerStatus = "active" | "inactive";

export interface Customer extends BaseDocument {
  uid: string; // 4-digit unique ID (e.g., "C-1234")
  name: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  status?: CustomerStatus; // Defaults to "active"; "inactive" = soft-deleted
  deletedAt?: string;
  deleted_by?: string;
  created_by: string; // FK → User.id
  
  // ── Unified Entity Depth ──
  type: ClientType;
  entity_meta?: CorporateEntityMetadata | IndividualEntityMetadata;
  family_id?: string;
  kyc_status?: KYCStatus;
}

export interface CorporateEntityMetadata {
  gst_number?: string;
  pan_number?: string;
  industry_type?: string;
  incorporation_date?: string;
  annual_revenue?: string; // Turnover
  poc_alt_phone?: string;
  employee_count?: number;
  city?: string;
  state?: string;
  address?: string;
  notes?: string;
  members?: CorporateMember[];
}

export interface CorporateMember {
  name: string;
  designation?: string;
  department?: string;
  email?: string;
  mobile?: string;
  role?: string;
  branch_location?: string;
  notes?: string;
}

export interface IndividualEntityMetadata {
  dob: string;
  gender: "male" | "female" | "other";
  occupation?: string;
  annual_income?: string;
  pan_number?: string;
  gst_number?: string;
  aadhaar_number?: string;
  marital_status?: string;
  anniversary_date?: string;
  birth_place?: string;
  height?: string;
  weight?: string;
  education?: string;
  business_job_type?: string; // e.g., Job, Business
  business_name?: string;
  occupation_nature?: string; // Type of Duty
  city?: string;
  state?: string;
  address?: string;
  notes?: string;
}

export interface CustomerFamilyMember extends BaseDocument {
  family_id: string;
  customer_id: string;
  relationship: string;
  dob?: string;
  gender?: string;
  mobile?: string;
  notes?: string;
}

// ---- 4. POLICY ----

export interface Policy extends BaseDocument {
  policy_number: string; // Auto: TYPE-YEAR-NNNN
  policy_type: PolicyType;
  customer_id: string; // FK → Customer.id
  customer_name: string; // Denormalized for list view
  start_date: string;
  end_date: string;
  premium_amount: number;
  sum_insured?: number;
  insurer_name?: string;
  payment_frequency?: PaymentFrequency;
  status: PolicyStatus;
  assigned_to: string; // FK → User.id (employee)
  assigned_to_name?: string; // Denormalized
  pdf_url?: string;
  lockedForEmployee: boolean;
  verification_confirmed: boolean;
  remark?: string;
  remark_updated_by?: string;
  remark_updated_at?: string;
  branch_id?: string;
  campaign_id?: string; // FK → Campaign.id (optional linking)
  created_by: string; // FK → User.id

  // ── Transactional Depth ──
  business_type?: BusinessType;
  login_date?: string;
  payment_method?: PaymentMethod;
  endorsement_details?: string;
  bqp_id?: string;
  posp_id?: string;
  
  // ── Unified Product Metadata (JSONB) ──
  motor_meta?: MotorPolicyMetadata;
  life_meta?: LifePolicyMetadata;
  health_meta?: Record<string, unknown>;
  commercial_meta?: Record<string, unknown>;
  finance_meta?: PolicyFinanceMetadata;

  // ── Legacy Compatibility ──
  motor_category?: "retail" | "fleet";
  vehicle_number?: string;
  vehicle_type?: string;
  health_policy_type?: "single" | "floater";
  plan_name?: string;
  life_plan_type?: "endowment" | "term_plan" | "ulip" | "moneyback";
  risk_location?: string;
  marine_policy_type?: "single_transit" | "open_import" | "open_export" | "stop";
  liability_type?: "public" | "product";
  policy_tenure?: string;
  project_name?: string;
  project_location?: string;
  principal?: string;
  surety_bond_type?: "bid_bond" | "performance_bond" | "mobilisation_bond" | "retention_bond";
}

export interface MotorPolicyMetadata {
  // Identification
  registration_number: string;
  registration_type?: "private" | "commercial" | "individual";
  rto_series?: string;
  make: string;
  model: string;
  variant: string;
  fuel_type: string;
  mfg_month_year: string;
  registration_date: string;
  chassis_number: string;
  engine_number: string;
  color?: string;
  financed_by?: string;
  
  // Capability
  seating_capacity: number;
  cubic_capacity?: number;
  gvw_kg?: number; // Gross Vehicle Weight
  body_type?: string;
  tyre_count?: number;
  
  // Financials
  idv_vehicle: number;
  idv_accessories?: number;
  idv_cng?: number;
  total_idv?: number;
  ncb_percent: number;
  loading_percent?: number;
  discount_percent?: number;
  net_premium: number;
  tp_premium: number;
  od_premium?: number; // Own Damage
  gst_amount: number;
  final_premium?: number;
  
  // Covers & Add-ons
  addons?: {
    zero_dep?: boolean;
    rti?: boolean; // Return to Invoice
    rsa?: boolean; // Roadside Assistance
    engine_protector?: boolean;
    key_replacement?: boolean;
    tyre_guard?: boolean;
    consumables?: boolean;
    personal_belongings?: boolean;
    towing_cover?: boolean;
    rim_safeguard?: boolean;
    battery_protection?: boolean;
  };
  paid_driver_cover?: boolean;
  employee_liability_count?: number;
  imt_selections?: string[];
  pa_owner_driver?: boolean;
  electrical_accessories_value?: number;
  non_electrical_accessories_value?: number;
  
  // References
  agency_code?: string;
  broker_code?: string;
  reference_name?: string;
  previous_policy_number?: string;
  previous_policy_available?: boolean;
}

export interface LifePolicyMetadata {
  plan_name: string;
  sum_assured: number;
  policy_term: number;
  premium_payment_term: number;
  risk_start_date: string;
  issue_date?: string;
  booking_date?: string;
  next_premium_due_date?: string;
  autopay_installment_date?: string;
  nominees: NomineeDetail[];
  riders: LifeRiderDetail[];
  
  // Banking & Financials
  bank_details?: {
    bank_name?: string;
    account_number?: string;
    account_type?: string;
    ifsc_code?: string;
    account_holder_name?: string;
  };
  bonus_accumulated?: number;
  fund_value?: number;
  
  // References
  agency_code?: string;
  broker_code?: string;
  reference_name?: string;
}

export interface LifeRiderDetail {
  rider_name: string;
  sum_assured: number;
  premium_amount: number;
}

export interface NomineeDetail {
  name: string;
  relationship: string;
  dob?: string;
  share_percent: number;
}

export interface PolicyFinanceMetadata {
  commission_receivable_percent?: number;
  commission_receivable_final?: number;
  commission_payable_percent?: number;
  commission_payable_final?: number;
  payout_status?: CommissionStatus;
  tds_amount?: number;
}

export interface ValidityRegistry extends BaseDocument {
  policy_id: string;
  vehicle_number: string;
  document_type: "permit_state" | "permit_national" | "fitness" | "puc" | "rc" | "tax_state" | "tax_national";
  expiry_date: string;
  status: "valid" | "expiring_soon" | "expired";
}

// ---- 5. RENEWAL ----

export interface Renewal extends BaseDocument {
  policy_id: string;
  policy_number?: string;
  customer_id: string;
  customer_name?: string;
  status: RenewalStatus;
  notes?: string;
  due_date: string;
  renewed_date?: string;
  updated_by: string;
}

// ---- 6. PREMIUM ----

export interface Premium extends BaseDocument {
  policy_id: string;
  policy_number?: string;
  customer_id?: string;
  customer_name?: string;
  user_id?: string;
  amount: number;
  period?: string;
  due_date?: string;
  status: PremiumStatus;
  collected_date?: string;
  collected_at?: string;
  collected_by?: string;
  created_by?: string;
  notes?: string;
}

// ---- 7. COMMISSION ----

export interface Commission extends BaseDocument {
  policy_id: string;
  policy_number?: string;
  user_id: string;
  user_name?: string;
  amount: number;
  status: CommissionStatus;
  paid_date?: string;
  rule_id?: string;
}

// ---- 8. COMMISSION RULE ----

export interface CommissionRule extends BaseDocument {
  policy_type: PolicyType;
  commission_type: CommissionType;
  value: number;
  min_premium?: number;
  max_premium?: number;
  insurer_name?: string;
  isActive: boolean;
}

// ---- 9. ATTENDANCE ----

export type EarlyCheckoutStatus = "pending" | "approved" | "rejected";

export interface Attendance extends BaseDocument {
  user_id: string;
  user_name?: string;
  date: string;
  check_in?: string;
  check_out?: string;
  status: AttendanceStatus;
  worked_hours?: number;
  branch_id?: string;
  override_by?: string;
  override_reason?: string;
}

export interface EarlyCheckoutRequest extends BaseDocument {
  user_id: string;
  user_name: string;
  attendance_id: string;
  date: string;
  reason: string;
  status: EarlyCheckoutStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  review_note?: string;
}

// ---- 10. NOTIFICATION ----

export interface Notification extends BaseDocument {
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  link?: string;
}

// ---- 11. DOCUMENT ----

export interface Document extends BaseDocument {
  policy_id?: string;
  customer_id?: string;
  uploaded_by: string;
  file_path: string;
  file_url: string;
  document_type: string;
  file_name: string;
  file_size?: number;
}

// ---- 12. CAMPAIGN ----

export interface Campaign extends BaseDocument {
  name: string;
  channel: string;
  budget: number;
  start_date?: string;
  end_date?: string;
  status?: "draft" | "active" | "completed";
  created_by: string;
  linked_policies_count?: number;
  total_premium_generated?: number;
  roi?: number;
}

// ---- 13. AUDIT LOG ----

export interface AuditLog extends BaseDocument {
  user_id: string;
  user_name?: string;
  action: AuditAction;
  module: string;
  details: string;
  ip_address?: string;
  pdfUploaded?: boolean;
}

// ---- 14. COMPANY TEMPLATE ----

export interface ExtractionPattern {
  field: string;
  label: string;
  regex: string;
  group?: number;
}

export interface CompanyTemplate extends BaseDocument {
  name: string;
  code: string;
  logo_url?: string;
  is_active: boolean;
  extraction_patterns: ExtractionPattern[];
  supported_policy_types: string[];
}

// ---- CONFIG / SETTINGS ----

export interface SystemConfig extends BaseDocument {
  key: string;
  value: unknown;
  category: string;
  description?: string;
}

// ---- HOLIDAY ----

export interface Holiday extends BaseDocument {
  name: string;
  date: string;
  isRecurring: boolean;
}

// ---- REMINDER ----

export interface DailyReminder extends BaseDocument {
  user_id: string;
  dismissed_at: string;
  date: string;
}

// ---- POLICY VERIFICATION LOG ----

export interface PolicyVerificationLog extends BaseDocument {
  policy_id: string;
  verified_by: string;
  checks: {
    policyNumberCorrect: boolean;
    datesCorrect: boolean;
    premiumCorrect: boolean;
    customerCorrect: boolean;
  };
}

// ---- HELPER TYPES ----

export type WithoutId<T> = Omit<T, "id" | "createdAt" | "updatedAt">;

export type CreateInput<T> = Omit<T, "id" | "createdAt" | "updatedAt">;

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  hasMore: boolean;
  lastDoc?: unknown;
}

export interface ExpiryBucket {
  label: string;
  count: number;
  policies: Policy[];
}

// ---- 15. SALES LEAD ----

export type LeadStatus = "new" | "contacted" | "follow_up" | "interested" | "meeting_done" | "proposal_sent" | "negotiation" | "not_interested" | "converted" | "lost";
export type LeadSource = "referral" | "walk_in" | "online" | "telecall" | "social_media" | "agent" | "other";
export type LeadPriority = "low" | "medium" | "high" | "urgent";
export type ClientType = "individual" | "corporate" | "sme" | "government" | "contractor" | "manufacturer" | "transporter" | "trader" | "other";

export interface SalesLead extends BaseDocument {
  lead_number: string;
  lead_date: string;
  customer_name: string;
  mobile: string;
  alt_mobile?: string;
  email?: string;
  source: LeadSource;
  assigned_to: string;
  assigned_to_name?: string;
  priority: LeadPriority;
  status: LeadStatus;
  notes?: string;
  follow_up_date?: string;
  meeting_date?: string;
  poc_name?: string;
  location?: string;
  client_type?: ClientType;
  estimated_value?: number;
  branch_id?: string;
  converted_customer_id?: string;
  converted_at?: string;
  lead_score?: number;
  created_by: string;
  created_by_name?: string;
  deleted_at?: string;
  deleted_by?: string;
}

export interface LeadTimeline extends BaseDocument {
  lead_id: string;
  action: string;
  description: string;
  old_value?: string;
  new_value?: string;
  next_action?: string;
  performed_by: string;
  performed_by_name?: string;
  metadata?: Record<string, unknown>;
}

export interface LeadDocument extends BaseDocument {
  lead_id: string;
  file_name: string;
  file_path: string;
  file_url: string;
  file_size?: number;
  document_type?: string;
  uploaded_by: string;
}

export interface LeadReminder extends BaseDocument {
  lead_id: string;
  reminder_type: "call" | "meeting" | "document" | "proposal" | "other";
  reminder_date: string;
  note?: string;
  status: "pending" | "done" | "snoozed";
  created_by: string;
  created_by_name?: string;
}

// ---- 16. ENDORSEMENT ----

export type EndorsementStatus = "pending" | "approved" | "rejected" | "processed";
export type EndorsementType = "name_change" | "address_change" | "sum_insured_change" | "premium_change" | "vehicle_change" | "nominee_change" | "coverage_extension" | "cancellation" | "reinstatement" | "other";

export interface Endorsement extends BaseDocument {
  endorsement_number: string;
  policy_id: string;
  policy_number?: string;
  customer_id?: string;
  customer_name?: string;
  endorsement_type: EndorsementType;
  description: string;
  old_value?: string;
  new_value?: string;
  effective_date: string;
  premium_difference?: number;
  status: EndorsementStatus;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  pdf_url?: string;
  insurer_name?: string;
  created_by: string;
}

// ---- 17. KYC DOCUMENT ----

export type KYCDocumentType = "aadhaar" | "pan" | "gst" | "address_proof" | "passport" | "driving_license" | "voter_id" | "bank_statement" | "company_registration" | "other";
export type KYCStatus = "pending" | "verified" | "rejected" | "expired";

export interface KYCDocument extends BaseDocument {
  customer_id: string;
  document_type: KYCDocumentType;
  document_number?: string;
  file_path: string;
  file_url: string;
  file_name: string;
  file_size?: number;
  status: KYCStatus;
  verified_by?: string;
  verified_at?: string;
  rejection_reason?: string;
  expiry_date?: string;
  notes?: string;
  uploaded_by: string;
}

// ---- 18. PROPOSAL ----

export type ProposalStatus = "draft" | "submitted" | "under_review" | "quote_received" | "approved" | "rejected" | "converted" | "expired";

export interface Proposal extends BaseDocument {
  proposal_number: string;
  customer_id?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  policy_type: string;
  insurer_name?: string;
  sum_insured?: number;
  premium_quoted?: number;
  premium_final?: number;
  coverage_details?: string;
  status: ProposalStatus;
  assigned_to: string;
  assigned_to_name?: string;
  notes?: string;
  valid_until?: string;
  converted_policy_id?: string;
  converted_at?: string;
  rejection_reason?: string;
  pdf_url?: string;
  branch_id?: string;
  created_by: string;
  created_by_name?: string;
}

export interface ProposalTimeline extends BaseDocument {
  proposal_id: string;
  stage: string;
  description: string;
  old_value?: string;
  new_value?: string;
  performed_by: string;
  performed_by_name?: string;
  metadata?: Record<string, unknown>;
}

// ---- 19. CLAIM ----

export type ClaimStatus = "registered" | "documents_pending" | "under_review" | "surveyor_appointed" | "assessment_done" | "approved" | "settled" | "rejected" | "withdrawn" | "closed";
export type ClaimType = "own_damage" | "third_party" | "death" | "health" | "fire" | "theft" | "natural_disaster" | "accident" | "liability" | "other";

export interface Claim extends BaseDocument {
  claim_number: string;
  policy_id: string;
  policy_number?: string;
  customer_id: string;
  customer_name: string;
  claim_type: ClaimType;
  claim_amount: number;
  settled_amount?: number;
  status: ClaimStatus;
  claim_date: string;
  incident_date?: string;
  incident_description?: string;
  incident_location?: string;
  surveyor_name?: string;
  surveyor_phone?: string;
  surveyor_report_url?: string;
  settlement_date?: string;
  rejection_reason?: string;
  insurer_name?: string;
  insurer_claim_ref?: string;
  hospital_name?: string;
  department?: string;
  documents?: unknown[];
  remarks?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  created_by?: string;
  source?: string;
}

export interface ClaimTimeline extends BaseDocument {
  claim_id: string;
  action: string;
  description: string;
  old_value?: string;
  new_value?: string;
  performed_by: string;
  performed_by_name?: string;
  metadata?: Record<string, unknown>;
}

export interface ClaimDocument extends BaseDocument {
  claim_id: string;
  file_name: string;
  file_path: string;
  file_url: string;
  file_size?: number;
  document_type?: string;
  uploaded_by: string;
}

// ---- 20. INVOICE ----

export type InvoiceStatus = "draft" | "sent" | "paid" | "partially_paid" | "overdue" | "cancelled" | "refunded";
export type LedgerEntryType = "debit" | "credit";

export interface Invoice extends BaseDocument {
  invoice_number: string;
  customer_id?: string;
  customer_name: string;
  policy_id?: string;
  policy_number?: string;
  subtotal: number;
  tax_rate?: number;
  tax_amount?: number;
  discount?: number;
  total_amount: number;
  paid_amount?: number;
  balance_due?: number;
  invoice_date: string;
  due_date?: string;
  paid_date?: string;
  payment_method?: PaymentMethod;
  payment_reference?: string;
  status: InvoiceStatus;
  notes?: string;
  terms?: string;
  pdf_url?: string;
  insurer_name?: string;
  branch_id?: string;
  created_by: string;
}

export interface InvoiceItem extends BaseDocument {
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface LedgerEntry extends BaseDocument {
  invoice_id?: string;
  customer_id?: string;
  customer_name?: string;
  entry_type: LedgerEntryType;
  amount: number;
  description: string;
  reference_number?: string;
  entry_date: string;
  category?: string;
  created_by: string;
}

// ---- 21. SOP ----

export type SOPStatus = "draft" | "active" | "archived";

export interface SOP extends BaseDocument {
  title: string;
  category: string;
  content: string;
  version: number;
  status: SOPStatus;
  tags?: string[];
  attachment_url?: string;
  created_by: string;
  created_by_name?: string;
  approved_by?: string;
  approved_at?: string;
}

// ---- 22. COMMUNICATION ----

export type CommChannel = "email" | "whatsapp" | "sms";
export type CommTrigger = "renewal_reminder" | "policy_expiry" | "premium_due" | "birthday" | "campaign" | "follow_up" | "claim_update" | "welcome" | "custom";
export type CommStatus = "pending" | "sent" | "delivered" | "failed" | "bounced";

export interface CommunicationTemplate extends BaseDocument {
  name: string;
  channel: CommChannel;
  trigger_type: CommTrigger;
  subject?: string;
  body_template: string;
  variables?: string[];
  is_active: boolean;
  created_by: string;
}

export interface CommunicationLog extends BaseDocument {
  template_id?: string;
  customer_id?: string;
  customer_name?: string;
  policy_id?: string;
  channel: CommChannel;
  recipient: string;
  subject?: string;
  body?: string;
  status: CommStatus;
  sent_at?: string;
  delivered_at?: string;
  error_message?: string;
  metadata?: Record<string, unknown>;
  created_by?: string;
}

// ---- 23. BUSINESS CASE ----

export type CaseType = 'lead' | 'quote' | 'proposal' | 'policy' | 'renewal' | 'endorsement' | 'claim' | 'servicing';
export type CaseStatus = 'open' | 'processing' | 'pending_customer' | 'pending_insurer' | 'won' | 'lost' | 'done' | 'rejected';

export interface BusinessCase extends BaseDocument {
  case_number: string; // BCS-XXXXX
  customer_id: string;
  lob: PolicyType;
  case_type: CaseType;
  status: CaseStatus;
  assigned_to?: string;
  priority: LeadPriority;
  sla_deadline?: string;
  payload: Record<string, unknown>;
  created_by: string;
  customers?: Customer;
}

// ---- 24. SERVICE TICKET ----

export type ServiceCategory = 'ecard_request' | 'member_endorsement' | 'name_correction' | 'address_correction' | 'invoice_dispute' | 'claim_assistance' | 'general_query';
export type TicketStatus = 'open' | 'in_progress' | 'pending' | 'pending_customer' | 'resolved' | 'closed';
export type TicketPriority = LeadPriority;

export interface ServiceTicket extends BaseDocument {
  ticket_number: string; // TKT-XXXXX
  customer_id: string;
  policy_id?: string;
  category: ServiceCategory;
  priority: LeadPriority;
  status: TicketStatus;
  owner_id?: string;
  assigned_to_name?: string;
  customers?: Customer;
  description?: string;
  sla_deadline?: string;
  internal_notes?: string;
  customer_notes?: string;
  metadata: Record<string, unknown>;
  created_by: string;
}
