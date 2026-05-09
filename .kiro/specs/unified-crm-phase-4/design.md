# Design Document: Unified CRM Phase 4 - Advanced Features

## Overview

This design document specifies the technical architecture, database schema, UI component structure, API endpoints, and data flow for Phase 4 of the Unified CRM. The implementation uses Next.js 16 (App Router), React 19, TypeScript, Supabase (PostgreSQL + Storage + Auth), Tailwind CSS 4, Radix UI, and Framer Motion.

Phase 4 delivers:
- Renewal Cockpit with risk scoring and follow-up task management
- Quote Comparison engine with multi-insurer matrix
- Commission Reconciliation with statement import and discrepancy resolution
- IRDA Compliance Dashboard with regulatory report generation

---

## Architecture

### Component Hierarchy

```
app/dashboard/renewals/
├── page.tsx                          # Renewal Cockpit Dashboard
├── loading.tsx
└── [id]/
    └── page.tsx                      # Renewal Detail

app/dashboard/quotes/
├── page.tsx                          # Quote Requests List
├── new/page.tsx                      # New Quote Request
└── [id]/
    └── page.tsx                      # Quote Comparison View

app/dashboard/commission-reconciliation/
├── page.tsx                          # Reconciliation Dashboard
├── new/page.tsx                      # Import Statement
└── [runId]/
    └── page.tsx                      # Reconciliation Run Detail

app/dashboard/compliance/
├── page.tsx                          # Compliance Dashboard
└── [id]/
    └── page.tsx                      # Compliance Item Detail

components/renewals/
├── RenewalCockpit.tsx
├── RenewalPipelineBoard.tsx          # Kanban-style stage view
├── RenewalListTable.tsx
├── RenewalMetricsBar.tsx
├── RenewalRiskBadge.tsx
├── RenewalStageSelector.tsx
├── FollowUpTaskForm.tsx
├── FollowUpTaskList.tsx
└── RenewalAnalyticsCharts.tsx

components/quotes/
├── QuoteRequestForm.tsx
├── QuoteEntryForm.tsx
├── QuoteComparisonMatrix.tsx
├── QuoteCard.tsx
└── QuoteExportButton.tsx

components/reconciliation/
├── StatementImportWizard.tsx
├── ReconciliationRunList.tsx
├── ReconciliationRunDetail.tsx
├── DiscrepancyTable.tsx
├── DiscrepancyResolutionDialog.tsx
└── ReconciliationReport.tsx

components/compliance/
├── ComplianceDashboard.tsx
├── ComplianceChecklist.tsx
├── RegulatoryCalendar.tsx
├── ComplianceItemForm.tsx
├── ComplianceItemDetail.tsx
└── IRDAReportGenerator.tsx
```

---

## Database Schema

### Table: renewal_pipeline

```sql
CREATE TABLE IF NOT EXISTS renewal_pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id),
  assigned_rm UUID REFERENCES users(id),
  stage TEXT NOT NULL DEFAULT 'due'
    CHECK (stage IN ('due','contacted','negotiating','renewed','lost')),
  risk_score INTEGER DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  risk_score_updated_at TIMESTAMPTZ,
  lost_reason TEXT,
  renewed_policy_id UUID REFERENCES policies(id),
  entered_pipeline_at TIMESTAMPTZ DEFAULT NOW(),
  stage_updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_contact_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(policy_id)
);

CREATE INDEX idx_renewal_pipeline_stage ON renewal_pipeline(stage);
CREATE INDEX idx_renewal_pipeline_rm ON renewal_pipeline(assigned_rm);
CREATE INDEX idx_renewal_pipeline_risk ON renewal_pipeline(risk_score DESC);
CREATE INDEX idx_renewal_pipeline_customer ON renewal_pipeline(customer_id);
```

### Table: renewal_stage_history

```sql
CREATE TABLE IF NOT EXISTS renewal_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  renewal_id UUID NOT NULL REFERENCES renewal_pipeline(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES users(id),
  changed_by_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_renewal_history_renewal ON renewal_stage_history(renewal_id);
```

### Table: follow_up_tasks

```sql
CREATE TABLE IF NOT EXISTS follow_up_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  renewal_id UUID NOT NULL REFERENCES renewal_pipeline(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL CHECK (task_type IN ('call','email','meeting','whatsapp')),
  due_date TIMESTAMPTZ NOT NULL,
  notes TEXT,
  assigned_to UUID NOT NULL REFERENCES users(id),
  assigned_to_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','snoozed')),
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_follow_up_renewal ON follow_up_tasks(renewal_id);
CREATE INDEX idx_follow_up_due ON follow_up_tasks(due_date);
CREATE INDEX idx_follow_up_assigned ON follow_up_tasks(assigned_to);
```

### Table: quote_requests

```sql
CREATE TABLE IF NOT EXISTS quote_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_number TEXT NOT NULL UNIQUE, -- QR-XXXXX
  customer_id UUID NOT NULL REFERENCES customers(id),
  policy_type TEXT NOT NULL,
  coverage_requirements TEXT,
  target_insurers TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','quotes_received','converted','expired','cancelled')),
  linked_renewal_id UUID REFERENCES renewal_pipeline(id),
  linked_lead_id UUID REFERENCES sales_leads(id),
  assigned_to UUID NOT NULL REFERENCES users(id),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quote_requests_customer ON quote_requests(customer_id);
CREATE INDEX idx_quote_requests_status ON quote_requests(status);
```

### Table: quotes

```sql
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id UUID NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
  insurer_name TEXT NOT NULL,
  premium_amount NUMERIC NOT NULL CHECK (premium_amount > 0),
  sum_insured NUMERIC NOT NULL CHECK (sum_insured > 0),
  coverage_details TEXT,
  terms TEXT,
  validity_date DATE NOT NULL,
  document_url TEXT,
  document_path TEXT,
  is_recommended BOOLEAN DEFAULT FALSE,
  is_accepted BOOLEAN DEFAULT FALSE,
  is_expired BOOLEAN DEFAULT FALSE,
  converted_policy_id UUID REFERENCES policies(id),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quotes_request ON quotes(quote_request_id);
CREATE INDEX idx_quotes_validity ON quotes(validity_date);
```

### Table: commission_reconciliation_runs

```sql
CREATE TABLE IF NOT EXISTS commission_reconciliation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insurer_name TEXT NOT NULL,
  statement_period_start DATE NOT NULL,
  statement_period_end DATE NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  total_records INTEGER DEFAULT 0,
  matched_count INTEGER DEFAULT 0,
  discrepancy_count INTEGER DEFAULT 0,
  total_statement_amount NUMERIC DEFAULT 0,
  total_crm_amount NUMERIC DEFAULT 0,
  total_discrepancy_amount NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','completed','failed')),
  error_message TEXT,
  report_url TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_recon_runs_insurer ON commission_reconciliation_runs(insurer_name);
CREATE INDEX idx_recon_runs_status ON commission_reconciliation_runs(status);
```

### Table: commission_reconciliation_records

```sql
CREATE TABLE IF NOT EXISTS commission_reconciliation_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES commission_reconciliation_runs(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES policies(id),
  policy_number TEXT,
  statement_premium NUMERIC,
  statement_commission NUMERIC,
  statement_commission_rate NUMERIC,
  crm_premium NUMERIC,
  crm_commission NUMERIC,
  crm_commission_rate NUMERIC,
  match_status TEXT NOT NULL CHECK (match_status IN ('matched','discrepancy')),
  discrepancy_type TEXT CHECK (discrepancy_type IN (
    'amount_mismatch','policy_not_found','duplicate','missing_in_statement'
  )),
  discrepancy_amount NUMERIC,
  resolution_status TEXT DEFAULT 'unresolved'
    CHECK (resolution_status IN ('unresolved','accept_statement','accept_crm','escalated')),
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  service_ticket_id UUID REFERENCES service_tickets(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recon_records_run ON commission_reconciliation_records(run_id);
CREATE INDEX idx_recon_records_policy ON commission_reconciliation_records(policy_id);
CREATE INDEX idx_recon_records_status ON commission_reconciliation_records(match_status);
```

### Table: compliance_items

```sql
CREATE TABLE IF NOT EXISTS compliance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'license_renewal','regulatory_filing','audit_submission',
    'training_certification','policy_review','other'
  )),
  description TEXT,
  due_date DATE NOT NULL,
  assigned_to UUID REFERENCES users(id),
  assigned_to_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','completed','overdue')),
  recurrence TEXT NOT NULL DEFAULT 'one_time'
    CHECK (recurrence IN ('one_time','monthly','quarterly','half_yearly','annual')),
  completion_document_url TEXT,
  completion_notes TEXT,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id),
  parent_item_id UUID REFERENCES compliance_items(id), -- for recurring
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_compliance_status ON compliance_items(status);
CREATE INDEX idx_compliance_due ON compliance_items(due_date);
CREATE INDEX idx_compliance_assigned ON compliance_items(assigned_to);
```

### Table: irda_reports

```sql
CREATE TABLE IF NOT EXISTS irda_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL CHECK (report_type IN (
    'business_summary','premium_register','commission_register','claims_register'
  )),
  period_type TEXT NOT NULL CHECK (period_type IN ('monthly','quarterly','annual')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  file_url TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_format TEXT NOT NULL CHECK (file_format IN ('excel','pdf')),
  generated_by UUID NOT NULL REFERENCES users(id),
  generated_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_irda_reports_type ON irda_reports(report_type);
CREATE INDEX idx_irda_reports_period ON irda_reports(period_start, period_end);
```

### Table: commission_rates

```sql
CREATE TABLE IF NOT EXISTS commission_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insurer_name TEXT NOT NULL,
  policy_type TEXT NOT NULL,
  rate_type TEXT NOT NULL CHECK (rate_type IN ('percentage','flat')),
  rate_value NUMERIC NOT NULL CHECK (rate_value >= 0),
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(insurer_name, policy_type, effective_from)
);

CREATE INDEX idx_commission_rates_insurer ON commission_rates(insurer_name);
CREATE INDEX idx_commission_rates_type ON commission_rates(policy_type);
```

---

## API Endpoints

### Renewal Cockpit

```
GET    /api/renewals/pipeline              # Get pipeline with filters
PUT    /api/renewals/[id]/stage            # Update renewal stage
POST   /api/renewals/[id]/follow-up        # Create follow-up task
PUT    /api/renewals/[id]/follow-up/[tid]  # Update follow-up task
GET    /api/renewals/analytics             # Renewal analytics
POST   /api/renewals/bulk                  # Bulk operations
GET    /api/renewals/config                # Get renewal window config
PUT    /api/renewals/config                # Update renewal window config (admin)
```

### Quote Comparison

```
GET    /api/quotes                         # List quote requests
POST   /api/quotes                         # Create quote request
GET    /api/quotes/[id]                    # Get quote request with quotes
POST   /api/quotes/[id]/quotes             # Add quote to request
PUT    /api/quotes/[id]/quotes/[qid]       # Update quote
POST   /api/quotes/[id]/quotes/[qid]/accept  # Accept quote → create policy
GET    /api/quotes/[id]/export             # Export comparison as PDF
```

### Commission Reconciliation

```
GET    /api/reconciliation                 # List reconciliation runs
POST   /api/reconciliation                 # Import statement (multipart)
GET    /api/reconciliation/[runId]         # Get run with records
PUT    /api/reconciliation/[runId]/records/[rid]/resolve  # Resolve discrepancy
POST   /api/reconciliation/[runId]/bulk-resolve  # Bulk resolve
GET    /api/reconciliation/[runId]/report  # Download report
GET    /api/commission-rates               # Get commission rates
POST   /api/commission-rates               # Create rate (admin)
PUT    /api/commission-rates/[id]          # Update rate (admin)
```

### Compliance

```
GET    /api/compliance                     # List compliance items
POST   /api/compliance                     # Create compliance item
GET    /api/compliance/[id]               # Get compliance item
PUT    /api/compliance/[id]               # Update compliance item
POST   /api/compliance/[id]/complete      # Mark as completed (with doc upload)
GET    /api/compliance/calendar           # Regulatory calendar
POST   /api/irda-reports                  # Generate IRDA report
GET    /api/irda-reports                  # List generated reports
GET    /api/irda-reports/[id]/download    # Download report
```

---

## UI Component Design

### Renewal Cockpit

**View Toggle**: List View | Kanban Board

**Kanban Board** (5 columns): Due | Contacted | Negotiating | Renewed | Lost

**List View Columns**:
| Column | Sortable |
|--------|----------|
| Customer | Yes |
| Policy # | No |
| Policy Type | No |
| Expiry Date | Yes |
| Premium | Yes |
| Risk Score | Yes |
| Stage | No |
| Assigned RM | No |
| Last Contact | Yes |
| Actions | No |

**Risk Score Badge**: 0–33 green | 34–66 yellow | 67–100 red

### Quote Comparison Matrix

**Layout**: Header (Quote Request info) + Comparison table

**Matrix Columns** (one per insurer):
- Insurer Name (header)
- Premium Amount (highlighted if lowest)
- Sum Insured (highlighted if highest)
- Coverage Highlights
- Validity Date
- Terms
- Recommended badge
- Accept button

**Export**: "Export as PDF" button → generates customer-ready comparison document

### Commission Reconciliation Dashboard

**Summary Cards**: Total Runs | Pending | Completed | Total Discrepancies | Unresolved

**Run List Table**:
| Column | Sortable |
|--------|----------|
| Run Date | Yes |
| Insurer | Yes |
| Period | No |
| Total Records | No |
| Matched | No |
| Discrepancies | No |
| Status | No |
| Actions | No |

**Discrepancy Table** (in Run Detail):
| Column | Filter |
|--------|--------|
| Policy # | No |
| Discrepancy Type | Yes |
| CRM Amount | No |
| Statement Amount | No |
| Difference | No |
| Resolution | Yes |
| Actions | No |

### Compliance Dashboard

**Layout**: Summary metrics + Regulatory Calendar + Checklist

**Regulatory Calendar**: Month view with compliance deadlines marked. Color: green (>30d), yellow (≤30d), orange (≤7d), red (overdue).

**Checklist**: Grouped by category. Each item shows title, due date, status badge, assigned to, and actions.

---

## Data Flow

### Renewal Pipeline Entry Flow

```
pg_cron (daily at midnight)
  → Query policies where end_date <= NOW() + renewal_window_days
    AND status = 'active'
    AND id NOT IN (SELECT policy_id FROM renewal_pipeline)
  → For each qualifying policy:
    → INSERT renewal_pipeline record (stage=due)
    → Calculate initial risk_score
    → Send renewal reminder to customer (if automated reminders enabled)
```

### Risk Score Calculation Flow

```
pg_cron (daily at 2 AM)
  → For each renewal in pipeline with stage NOT IN (renewed, lost):
    → score = 0
    → days_until_expiry = policy.end_date - TODAY
    → if days_until_expiry <= 7: score += 40
    → elif days_until_expiry <= 30: score += 25
    → elif days_until_expiry <= 60: score += 10
    → overdue_premiums = count(premiums where status=overdue AND policy_id=...)
    → score += min(overdue_premiums * 15, 30)
    → if last_contact_date IS NULL OR last_contact_date < TODAY - 30: score += 20
    → if previous renewal was lost: score += 10
    → UPDATE renewal_pipeline SET risk_score = min(score, 100)
```

### Commission Reconciliation Flow

```
User uploads Commission_Statement file
  → POST /api/reconciliation (multipart)
    → Server: validate file format and size
    → Server: parse file rows
    → Server: create reconciliation_run (status=processing)
    → Server: for each row:
        → match by policy_number to policies table
        → if not found: create record (discrepancy, policy_not_found)
        → if found: compare commission amounts (1% tolerance)
        → if match: create record (matched)
        → if mismatch: create record (discrepancy, amount_mismatch)
    → Server: check for CRM records missing from statement
    → Server: update run totals and status=completed
    → Server: generate PDF report
    → Return run summary
  → Client: navigate to run detail page
```

### IRDA Report Generation Flow

```
User selects report type and period
  → POST /api/irda-reports
    → Server: validate user role (admin only)
    → Server: query relevant data for period
    → Server: format data per IRDA template
    → Server: generate Excel/PDF file
    → Server: upload to Supabase Storage
    → Server: insert irda_reports record
    → Server: create audit log entry
    → Return file URL
  → Client: trigger download
```

---

## TypeScript Types (New)

```typescript
export interface RenewalPipelineEntry {
  id: string;
  policy_id: string;
  customer_id: string;
  assigned_rm?: string;
  stage: 'due' | 'contacted' | 'negotiating' | 'renewed' | 'lost';
  risk_score: number;
  lost_reason?: string;
  renewed_policy_id?: string;
  entered_pipeline_at: string;
  last_contact_date?: string;
  // Joined
  policy?: Policy;
  customer?: Customer;
  follow_up_tasks?: FollowUpTask[];
}

export interface FollowUpTask {
  id: string;
  renewal_id: string;
  task_type: 'call' | 'email' | 'meeting' | 'whatsapp';
  due_date: string;
  notes?: string;
  assigned_to: string;
  assigned_to_name: string;
  status: 'pending' | 'completed' | 'snoozed';
  completed_at?: string;
  completion_notes?: string;
}

export interface QuoteRequest {
  id: string;
  quote_request_number: string;
  customer_id: string;
  policy_type: string;
  coverage_requirements?: string;
  target_insurers: string[];
  status: 'open' | 'quotes_received' | 'converted' | 'expired' | 'cancelled';
  linked_renewal_id?: string;
  assigned_to: string;
  quotes?: Quote[];
}

export interface Quote {
  id: string;
  quote_request_id: string;
  insurer_name: string;
  premium_amount: number;
  sum_insured: number;
  coverage_details?: string;
  terms?: string;
  validity_date: string;
  document_url?: string;
  is_recommended: boolean;
  is_accepted: boolean;
  is_expired: boolean;
}

export interface ReconciliationRun {
  id: string;
  insurer_name: string;
  statement_period_start: string;
  statement_period_end: string;
  total_records: number;
  matched_count: number;
  discrepancy_count: number;
  total_discrepancy_amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  report_url?: string;
  created_at: string;
}

export interface ReconciliationRecord {
  id: string;
  run_id: string;
  policy_number?: string;
  statement_commission?: number;
  crm_commission?: number;
  discrepancy_amount?: number;
  match_status: 'matched' | 'discrepancy';
  discrepancy_type?: 'amount_mismatch' | 'policy_not_found' | 'duplicate' | 'missing_in_statement';
  resolution_status: 'unresolved' | 'accept_statement' | 'accept_crm' | 'escalated';
}

export interface ComplianceItem {
  id: string;
  title: string;
  category: 'license_renewal' | 'regulatory_filing' | 'audit_submission' | 'training_certification' | 'policy_review' | 'other';
  description?: string;
  due_date: string;
  assigned_to?: string;
  assigned_to_name?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  recurrence: 'one_time' | 'monthly' | 'quarterly' | 'half_yearly' | 'annual';
  completion_document_url?: string;
  completed_at?: string;
}
```

---

## Performance Considerations

1. **Renewal Pipeline**: Indexed on stage, risk_score, assigned_rm. Paginated (50 per page). Risk scores recalculated nightly via pg_cron.
2. **Quote Comparison**: All quotes loaded in single query with quote_request. No pagination needed (max ~10 quotes per request).
3. **Reconciliation**: Process in batches of 100 rows. Use database transactions per batch. Generate report asynchronously.
4. **Compliance Dashboard**: Calendar view pre-computed for 90-day window. Cached with 1-hour revalidation.
5. **IRDA Reports**: Generated asynchronously. User notified via notification when ready. Stored in Supabase Storage.

---

## Error Handling

- **Reconciliation file parse error**: Return 422 with row-level error details.
- **Quote validity expired**: Show expired badge, allow requesting extension.
- **IRDA report data incomplete**: Return 422 listing missing data fields.
- **Compliance item overdue**: Auto-update status via pg_cron, send notification.
- **Commission rate not found**: Fall back to 0% rate, flag for admin review.
