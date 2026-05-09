# Tasks Document: Unified CRM Phase 4 - Advanced Features

## Overview

This document breaks down the implementation of Phase 4 into discrete, executable tasks. Each task maps to one or more requirements from the requirements document and references the design document for technical details.

**Estimated Total Effort**: 10–12 days
**Prerequisites**: Phase 1, Phase 2, and Phase 3 complete

---

## Task 1: Database Schema Migration

**Requirements**: R1–R28
**Priority**: Critical (blocks all other tasks)

### Subtasks

- [x] 1.1 Create `renewal_pipeline` table with all columns, constraints, and indexes
- [x] 1.2 Create `renewal_stage_history` table
- [x] 1.3 Create `follow_up_tasks` table with indexes
- [x] 1.4 Create `quote_requests` table
- [x] 1.5 Create `quotes` table with validity date index
- [x] 1.6 Create `commission_reconciliation_runs` table
- [x] 1.7 Create `commission_reconciliation_records` table with all indexes
- [x] 1.8 Create `compliance_items` table with all indexes
- [x] 1.9 Create `irda_reports` table
- [x] 1.10 Create `commission_rates` table with UNIQUE(insurer_name, policy_type, effective_from)
- [x] 1.11 Add RLS policies for all new tables
- [x] 1.12 Create pg_cron job for renewal pipeline entry (daily at midnight)
- [x] 1.13 Create pg_cron job for risk score recalculation (daily at 2 AM)
- [x] 1.14 Create pg_cron job for compliance overdue detection (daily at 8 AM)
- [x] 1.15 Create pg_cron job for quote expiry detection (daily at 9 AM)
- [x] 1.16 Create pg_cron job for follow-up task reminders (hourly)
- [x] 1.17 Verify all foreign key constraints and indexes

**Acceptance**: All tables created; pg_cron jobs scheduled; no migration errors.

---

## Task 2: Renewal Pipeline Engine

**Requirements**: R2, R3, R21
**Priority**: Critical

### Subtasks

- [x] 2.1 Implement pg_cron job: add qualifying policies to `renewal_pipeline` daily
- [x] 2.2 Implement renewal window configuration (per policy type)
- [x] 2.3 Implement risk score calculation algorithm:
  - Days until expiry scoring (40/25/10 points)
  - Overdue premium scoring (15 points per overdue, max 30)
  - Last contact date scoring (20 points if no contact in 30 days)
  - Previous lost renewal scoring (10 points)
- [x] 2.4 Implement pg_cron job: recalculate risk scores daily
- [x] 2.5 Implement automated renewal reminder sending (90/60/30/15/7 days)
- [x] 2.6 Implement renewal reminder template configuration per policy type
- [x] 2.7 Write property-based tests:
  - Risk score is between 0 and 100 for all renewals (range invariant)
  - Renewal stage cannot transition backward from renewed/lost (monotonicity)

**Acceptance**: Policies enter pipeline automatically; risk scores calculated correctly; automated reminders sent at correct intervals.

---

## Task 3: Renewal Cockpit API Layer

**Requirements**: R1, R4, R5, R6, R7
**Priority**: Critical

### Subtasks

- [x] 3.1 Implement `GET /api/renewals/pipeline` with filters, search, pagination
- [x] 3.2 Implement `PUT /api/renewals/[id]/stage` with transition validation
- [x] 3.3 Implement stage history recording on every stage change
- [x] 3.4 Implement lost reason requirement on stage=lost
- [x] 3.5 Implement `POST /api/renewals/[id]/follow-up` (create follow-up task)
- [x] 3.6 Implement `PUT /api/renewals/[id]/follow-up/[tid]` (update/complete task)
- [x] 3.7 Implement `GET /api/renewals/analytics` (conversion rates, breakdowns)
- [x] 3.8 Implement `POST /api/renewals/bulk` (bulk assign RM, bulk stage update, bulk export)
- [x] 3.9 Implement `GET /api/renewals/config` and `PUT /api/renewals/config` (admin only)
- [x] 3.10 Add audit log entries for all stage changes
- [x] 3.11 Write property-based tests:
  - Sum of stage counts = total pipeline count (conservation)
  - Analytics conversion rate is between 0% and 100% (range validity)

**Acceptance**: All endpoints work correctly; stage transitions validated; analytics conservation properties verified.

---

## Task 4: Renewal Cockpit UI

**Requirements**: R1, R4, R5, R6, R7
**Priority**: High

### Subtasks

- [x] 4.1 Create `app/dashboard/renewals/page.tsx` as server component
- [x] 4.2 Build `RenewalMetricsBar` (total due, contacted, negotiating, renewed, lost, conversion rate, premium at risk)
- [x] 4.3 Build `RenewalListTable` with sortable columns and risk score badge
- [x] 4.4 Build `RenewalPipelineBoard` (Kanban view with 5 stage columns)
- [x] 4.5 Implement view toggle (List / Kanban)
- [x] 4.6 Implement search (customer name, policy number, insurer)
- [x] 4.7 Implement filters (RM, policy type, insurer, customer type)
- [x] 4.8 Build `RenewalRiskBadge` (green/yellow/red with score)
- [x] 4.9 Build `RenewalStageSelector` (dropdown with transition validation)
- [x] 4.10 Build `FollowUpTaskForm` (task type, due date, notes, assigned to)
- [x] 4.11 Build `FollowUpTaskList` (chronological, with complete/snooze actions)
- [x] 4.12 Build `RenewalAnalyticsCharts` (conversion trends, breakdowns)
- [x] 4.13 Implement bulk selection and bulk actions
- [x] 4.14 Create `app/dashboard/renewals/[id]/page.tsx` (renewal detail)
- [x] 4.15 Write performance test: Renewal Cockpit loads within 2 seconds with 5,000 renewals

**Acceptance**: Cockpit loads within 2 seconds; Kanban and list views work; risk scores display correctly.

---

## Task 5: Quote Request API Layer

**Requirements**: R8, R9, R11, R22
**Priority**: High

### Subtasks

- [x] 5.1 Implement `GET /api/quotes` (list quote requests with filters)
- [x] 5.2 Implement `POST /api/quotes` (create quote request, generate QR-XXXXX number)
- [x] 5.3 Implement `GET /api/quotes/[id]` (quote request with all quotes)
- [x] 5.4 Implement `POST /api/quotes/[id]/quotes` (add quote to request)
- [x] 5.5 Implement `PUT /api/quotes/[id]/quotes/[qid]` (update quote)
- [x] 5.6 Implement `POST /api/quotes/[id]/quotes/[qid]/accept` (accept quote → create policy)
- [x] 5.7 Implement policy creation from accepted quote (pre-filled with quote data)
- [x] 5.8 Implement renewal stage update to renewed when quote linked to renewal
- [x] 5.9 Implement `GET /api/quotes/[id]/export` (generate comparison PDF)
- [x] 5.10 Add audit log entries for all quote operations
- [x] 5.11 Implement quote expiry detection pg_cron job

**Acceptance**: Quote CRUD works correctly; policy creation from accepted quote works; PDF export generates correctly.

---

## Task 6: Quote Comparison UI

**Requirements**: R8, R9, R10, R11, R22
**Priority**: High

### Subtasks

- [x] 6.1 Create `app/dashboard/quotes/page.tsx` (quote requests list)
- [x] 6.2 Create `app/dashboard/quotes/new/page.tsx` (new quote request form)
- [x] 6.3 Create `app/dashboard/quotes/[id]/page.tsx` (quote comparison view)
- [x] 6.4 Build `QuoteRequestForm` (customer, policy type, coverage requirements, target insurers)
- [x] 6.5 Build `QuoteEntryForm` (insurer, premium, sum insured, coverage, validity, document upload)
- [x] 6.6 Build `QuoteComparisonMatrix` (side-by-side table with highlights)
- [x] 6.7 Implement lowest premium highlight (green background)
- [x] 6.8 Implement highest sum insured highlight (blue background)
- [x] 6.9 Implement recommended badge toggle
- [x] 6.10 Implement Accept Quote button → confirm dialog → create policy
- [x] 6.11 Build `QuoteExportButton` (generates customer-ready PDF comparison)
- [x] 6.12 Implement expired quote badge display
- [x] 6.13 Write performance test: Quote Comparison view loads within 1 second

**Acceptance**: Comparison matrix displays all quotes side-by-side; highlights work correctly; PDF export generates within 5 seconds.

---

## Task 7: Commission Statement Import

**Requirements**: R12, R13, R26
**Priority**: High

### Subtasks

- [x] 7.1 Implement `POST /api/reconciliation` (multipart file upload, creates run)
- [x] 7.2 Implement Excel/CSV parser for commission statements
- [x] 7.3 Implement policy matching by policy number
- [x] 7.4 Implement commission amount comparison (1% tolerance for matched)
- [x] 7.5 Implement discrepancy type detection (amount_mismatch, policy_not_found, duplicate, missing_in_statement)
- [x] 7.6 Implement missing_in_statement detection (CRM records not in statement)
- [x] 7.7 Implement reconciliation run status tracking (pending → processing → completed/failed)
- [x] 7.8 Calculate run totals (total_records, matched_count, discrepancy_count, amounts)
- [x] 7.9 Build `StatementImportWizard` (upload → preview → processing → results)
- [x] 7.10 Write performance test: 1000 records processed within 60 seconds
- [x] 7.11 Write property-based tests:
  - matched_count + discrepancy_count = total_records (conservation invariant)
  - Same statement imported twice produces identical results (determinism)

**Acceptance**: Import processes 1000 records within 60 seconds; conservation property verified; determinism verified.

---

## Task 8: Commission Reconciliation UI

**Requirements**: R13, R14, R15, R16
**Priority**: High

### Subtasks

- [x] 8.1 Create `app/dashboard/commission-reconciliation/page.tsx` (runs list)
- [x] 8.2 Create `app/dashboard/commission-reconciliation/[runId]/page.tsx` (run detail)
- [x] 8.3 Build `ReconciliationRunList` with summary cards and table
- [x] 8.4 Build `ReconciliationRunDetail` with matched/discrepancy breakdown
- [x] 8.5 Build `DiscrepancyTable` with filter by type and resolution status
- [x] 8.6 Build `DiscrepancyResolutionDialog` (accept_statement / accept_crm / escalate)
- [x] 8.7 Implement accept_statement: update CRM commission to statement amount
- [x] 8.8 Implement accept_crm: mark resolved with CRM value retained
- [x] 8.9 Implement escalate: create Service_Ticket and notify manager
- [x] 8.10 Implement bulk resolution for same-type discrepancies
- [x] 8.11 Build `ReconciliationReport` with export (PDF/Excel)
- [x] 8.12 Implement `GET /api/reconciliation/[runId]` endpoint
- [x] 8.13 Implement `PUT /api/reconciliation/[runId]/records/[rid]/resolve` endpoint
- [x] 8.14 Implement `POST /api/reconciliation/[runId]/bulk-resolve` endpoint
- [x] 8.15 Implement `GET /api/reconciliation/[runId]/report` endpoint

**Acceptance**: Discrepancy resolution works for all three actions; bulk resolution works; report exports correctly.

---

## Task 9: Commission Analytics

**Requirements**: R16, R23
**Priority**: Medium

### Subtasks

- [x] 9.1 Implement `GET /api/commission-rates` endpoint
- [x] 9.2 Implement `POST /api/commission-rates` endpoint (admin only)
- [x] 9.3 Implement `PUT /api/commission-rates/[id]` endpoint (admin only)
- [x] 9.4 Build commission rate configuration UI (table by insurer × policy type)
- [x] 9.5 Implement commission analytics dashboard (total earned, by insurer, by type, by RM)
- [x] 9.6 Implement reconciliation accuracy rate metric
- [x] 9.7 Implement outstanding commission amount metric
- [x] 9.8 Implement date range filter for analytics
- [x] 9.9 Implement export as CSV/PDF
- [x] 9.10 Verify rate changes apply only to new policies (not retroactive)
- [x] 9.11 Log all rate configuration changes to audit log

**Acceptance**: Commission rates configurable by admin; analytics display correctly; rate changes not retroactive.

---

## Task 10: IRDA Compliance Dashboard

**Requirements**: R17, R18, R20
**Priority**: High

### Subtasks

- [x] 10.1 Create `app/dashboard/compliance/page.tsx` (compliance dashboard)
- [x] 10.2 Build `ComplianceDashboard` with summary metrics and calendar
- [x] 10.3 Build `ComplianceChecklist` grouped by category
- [x] 10.4 Build `RegulatoryCalendar` (month view with deadline markers)
- [x] 10.5 Implement color coding (green >30d, yellow ≤30d, orange ≤7d, red overdue)
- [x] 10.6 Implement filter by status, category, due date range
- [x] 10.7 Implement `GET /api/compliance` endpoint
- [x] 10.8 Implement `POST /api/compliance` endpoint (create compliance item)
- [x] 10.9 Implement `PUT /api/compliance/[id]` endpoint (update item)
- [x] 10.10 Implement `GET /api/compliance/calendar` endpoint
- [x] 10.11 Implement pg_cron job for overdue detection (daily at 8 AM)
- [x] 10.12 Write performance test: compliance dashboard loads within 2 seconds

**Acceptance**: Dashboard loads within 2 seconds; calendar shows correct deadlines; color coding works.

---

## Task 11: Compliance Item Management

**Requirements**: R18, R20
**Priority**: High

### Subtasks

- [x] 11.1 Create `app/dashboard/compliance/[id]/page.tsx` (compliance item detail)
- [x] 11.2 Build `ComplianceItemForm` (title, category, description, due date, assigned to, recurrence)
- [x] 11.3 Implement recurrence options (one_time, monthly, quarterly, half_yearly, annual)
- [x] 11.4 Implement auto-create next occurrence on completion of recurring item
- [x] 11.5 Implement completion workflow (upload completion document, add notes)
- [x] 11.6 Implement `POST /api/compliance/[id]/complete` endpoint
- [x] 11.7 Implement compliance notification system (30d, 7d, overdue alerts)
- [x] 11.8 Implement email notifications for items due within 7 days
- [x] 11.9 Write property-based test: next occurrence due date > current occurrence due date (temporal invariant)

**Acceptance**: Recurring items auto-create next occurrence; completion requires document upload; notifications sent at correct thresholds.

---

## Task 12: IRDA Report Generation

**Requirements**: R19, R25, R27
**Priority**: High

### Subtasks

- [x] 12.1 Implement `POST /api/irda-reports` endpoint (admin only)
- [x] 12.2 Implement `GET /api/irda-reports` endpoint (list reports)
- [x] 12.3 Implement `GET /api/irda-reports/[id]/download` endpoint
- [x] 12.4 Implement business_summary report (policy count, premium, by type)
- [x] 12.5 Implement premium_register report (all policies with premium details)
- [x] 12.6 Implement commission_register report (all commissions with details)
- [x] 12.7 Implement claims_register report (all claims with status and settlement)
- [x] 12.8 Build `IRDAReportGenerator` UI (report type, period, format selection)
- [x] 12.9 Implement Excel generation using exceljs or xlsx library
- [x] 12.10 Implement PDF generation for reports
- [x] 12.11 Upload generated reports to Supabase Storage
- [x] 12.12 Add audit log entries for all report generation
- [x] 12.13 Write performance test: report generation completes within 30 seconds

**Acceptance**: All 4 report types generate correctly; generation within 30 seconds; reports stored for 7 years.

---

## Task 13: Integration with Previous Phases

**Requirements**: R28
**Priority**: High

### Subtasks

- [x] 13.1 Verify Renewal_Cockpit sources data from Phase 1 Policy records
- [x] 13.2 Verify Renewal_Cockpit displays Phase 1 Customer_Master data
- [x] 13.3 Verify Quote conversion creates policy linked to Phase 1 Customer_Master
- [x] 13.4 Verify Commission reconciliation matches against Phase 1 Policy records
- [x] 13.5 Verify discrepancy escalation creates Phase 2 Service_Ticket
- [x] 13.6 Verify Compliance_Checklist includes GMC/Fleet items from Phase 3
- [x] 13.7 Verify IRDA_Report includes GMC and Fleet policy data from Phase 3
- [x] 13.8 Write integration tests for all cross-phase data flows

**Acceptance**: All cross-phase integrations work correctly; data flows verified end-to-end.

---

## Task 14: Property-Based Tests

**Requirements**: R3, R7, R13, R16, R23
**Priority**: Medium

### Subtasks

- [x] 14.1 Test: Renewal_Risk_Score is between 0 and 100 for all renewals (range invariant)
- [x] 14.2 Test: Renewal stage cannot go backward from renewed/lost (monotonicity)
- [x] 14.3 Test: matched_count + discrepancy_count = total_records (conservation)
- [x] 14.4 Test: Same statement imported twice produces identical results (determinism)
- [x] 14.5 Test: Commission rate percentage is between 0 and 100 (range invariant)
- [x] 14.6 Test: Next compliance occurrence due date > current due date (temporal invariant)
- [x] 14.7 Test: Sum of renewal stage counts = total pipeline count (conservation)
- [x] 14.8 Test: Analytics conversion rate is between 0% and 100% (range validity)
- [x] 14.9 Test: Audit log entries have timestamp >= event timestamp (temporal correctness)

**Acceptance**: All property-based tests pass with 500+ generated inputs.

---

## Completion Checklist

- [x] All database migrations applied and verified
- [x] pg_cron jobs scheduled and running
- [x] Renewal pipeline auto-populates from policies
- [x] Risk scores calculated correctly
- [x] Renewal Cockpit loads within 2 seconds
- [x] Quote Comparison matrix displays correctly
- [x] Quote to policy conversion works
- [x] Commission statement import processes 1000 records within 60 seconds
- [x] Discrepancy resolution works for all three actions
- [x] Compliance dashboard loads within 2 seconds
- [x] Recurring compliance items auto-create next occurrence
- [x] IRDA reports generate within 30 seconds
- [x] All cross-phase integrations verified
- [x] All property-based tests pass
- [x] No TypeScript errors (`tsc --noEmit` passes)
- [x] No ESLint errors
