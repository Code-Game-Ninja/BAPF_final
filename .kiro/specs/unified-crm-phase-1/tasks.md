# Tasks Document: Unified CRM Phase 1 - Customer Master + Client 360

## Overview

This document breaks down the implementation of Phase 1 into discrete, executable tasks. Each task maps to one or more requirements from the requirements document and references the design document for technical details.

**Estimated Total Effort**: 8–10 days
**Prerequisites**: Supabase project configured, existing customer table in place

---

## Task 1: Database Schema Migration

**Requirements**: R1, R2, R3, R4, R5, R6, R21, R24
**Priority**: Critical (blocks all other tasks)

### Subtasks

- [ ] 1.1 Run `supabase/migrations/20240101_unified_crm_phase1.sql` in Supabase SQL editor
- [x] 1.2 `customer_family_members` table defined in migration SQL
- [x] 1.3 `customer_corporate_members` table defined in migration SQL
- [x] 1.4 Full-text search index on `customers.name` defined in migration SQL
- [x] 1.5 GIN index on `customers.entity_meta` JSONB defined in migration SQL
- [x] 1.6 Row-Level Security policies for admin, manager, employee defined in migration SQL
- [x] 1.7 Backfill script for `customer_type = 'individual'` included in migration SQL
- [ ] 1.8 Verify all indexes are created and RLS policies are active after running migration

**Acceptance**: Migration runs without errors; existing customer data is preserved; RLS policies block unauthorized access.

> **Action Required**: Run `supabase/migrations/20240101_unified_crm_phase1.sql` in your Supabase SQL editor.

---

## Task 2: Customer API Layer

**Requirements**: R1, R2, R3, R4, R20, R21, R23
**Priority**: Critical

### Subtasks

- [x] 2.1 `GET /api/customers` — paginated list with search, type filter, status filter, RM filter, metrics
- [x] 2.2 `POST /api/customers` — create with duplicate detection (returns 409 with matches on duplicate)
- [x] 2.3 `GET /api/customers/[id]` — full customer detail via `useCustomer` hook + Client 360 parallel fetch
- [x] 2.4 `PUT /api/customers/[id]/update` — update with email sync to portal
- [x] 2.5 `POST /api/customers/[id]/deactivate` — soft delete with portal account disable
- [x] 2.6 `GET|POST /api/customers/[id]/family-members` — list and add family members
- [x] 2.7 `GET|POST /api/customers/[id]/corporate-members` — list and add corporate members
- [x] 2.8 Zod validation on all endpoints
- [x] 2.9 Audit log entries for all create/update/delete operations
- [x] 2.10 Property-based tests for duplicate detection — `tests/phase1/customer-properties.test.ts`
- [x] 2.11 Property-based tests for soft delete cascade — `tests/phase1/customer-properties.test.ts`

**Acceptance**: All endpoints return correct data; duplicate detection works within 500ms; soft delete cascades correctly.

---

## Task 3: All Entities Page

**Requirements**: R1, R22
**Priority**: High

### Subtasks

- [x] 3.1 `app/dashboard/customers/page.tsx` — full client component with all filtering
- [x] 3.2 Metrics bar — Total, Active, Individual, Corporate, SME, Other counts
- [x] 3.3 Data table with UID, Name, Type badge, Phone, City, KYC badge, Status badge, Actions
- [x] 3.4 Search input (name, UID, phone, email, city)
- [x] 3.5 Type filter chips (All / Individual / Corporate / SME / Government / Contractor / Other)
- [x] 3.6 Show Inactive toggle
- [x] 3.7 Type dropdown filter (Select component)
- [ ] 3.8 Column customizer (show/hide columns) — optional enhancement
- [ ] 3.9 Saved views — optional enhancement
- [x] 3.10 Row quick actions: View 360, Edit, Create Policy, Deactivate
- [x] 3.11 Bulk CSV export
- [x] 3.12 Pagination (20 per page) with Previous/Next
- [x] 3.13 `app/dashboard/customers/loading.tsx` skeleton

**Acceptance**: Page loads within 2 seconds with 10,000 customers; search returns results within 1 second; filters update within 500ms.

---

## Task 4: Manual Add Customer Form

**Requirements**: R3, R4, R20, R24
**Priority**: High

### Subtasks

- [x] 4.1 `app/dashboard/customers/new/page.tsx` renders `ManualCustomerForm`
- [x] 4.2 `ManualCustomerForm` — Individual / Corporate branching with Entity Health card
- [x] 4.3 `BasicInfo` — type selector, name, phone, email, RM dropdown, OCR auto-fill
- [x] 4.4 `IndividualDetails` — DOB, gender, marital status, height, weight, education, occupation, income, PAN, GST, address, state
- [x] 4.5 `CorporateDetails` — turnover, PAN, GST, address, state
- [x] 4.6 DOB field present; age auto-calculation via date-fns
- [x] 4.7 `FamilyDetails` — dynamic rows (name, relationship, DOB, gender, mobile, notes, create profile toggle)
- [x] 4.8 `CorporateMembers` — dynamic rows (name, designation, dept, email, mobile, role, branch, notes)
- [x] 4.9 `DocumentUpload` — dynamic rows (document type + file upload)
- [x] 4.10 Entity Health card shows type, duplicate check status, assignment status
- [x] 4.11 Zod validation via `manualCustomerValidationSchema`
- [x] 4.12 Phone (10-digit), email, PAN, GST format validation
- [x] 4.13 `DuplicateWarningDialog` — shows matching customers with field labels and view links
- [x] 4.14 Form submits to `POST /api/customers` for duplicate check, then `createManualCustomer`
- [x] 4.15 409 response → `DuplicateWarningDialog` → Proceed Anyway / Cancel

**Acceptance**: Form validates all fields correctly; duplicate detection triggers on save; successful save navigates to Client 360.

---

## Task 5: Family Member Management

**Requirements**: R5, R24
**Priority**: Medium

### Subtasks

- [x] 5.1 `ContactsTab` — inline add dialog for family members
- [x] 5.2 Add family member — stores in `entity_meta.family_members` JSONB array
- [ ] 5.3 Edit family member — PUT endpoint and edit dialog (enhancement)
- [ ] 5.4 Remove family member with policy-link check (enhancement)
- [ ] 5.5 Blocking error dialog when member linked to policy (enhancement)
- [x] 5.6 Validation: name and relationship required

**Acceptance**: Add operation works correctly; members display in Contacts tab.

---

## Task 6: Corporate Member Management

**Requirements**: R6, R24
**Priority**: Medium

### Subtasks

- [x] 6.1 `ContactsTab` — inline add dialog for corporate contacts
- [x] 6.2 Add corporate member — stores in `entity_meta.members` JSONB array
- [ ] 6.3 Edit corporate member — PUT endpoint and edit dialog (enhancement)
- [ ] 6.4 Remove corporate member with policy-link check (enhancement)
- [ ] 6.5 Blocking error dialog when member linked to policy (enhancement)
- [x] 6.6 Validation: name required

**Acceptance**: Add operation works correctly; members display in Contacts tab.

---

## Task 7: Client 360 View Shell

**Requirements**: R7, R19, R22
**Priority**: High

### Subtasks

- [x] 7.1 `app/dashboard/customers/[id]/page.tsx` renders `Client360View`
- [x] 7.2 `Client360View` — 12-tab navigation (Overview, Contacts, Policies, Cases, Claims, Documents, Communications, Financial, Renewal Risk, Service Issues, Insurers, Quick Actions)
- [x] 7.3 Profile header — avatar, name, UID copy, type badge, status badge, KYC badge, contact info, quick stats (policies, KYC docs, KYC pending, type)
- [x] 7.4 Parallel data fetching via SWR hooks per tab (lazy on activation)
- [x] 7.5 Tabs lazy-load on first activation via conditional rendering
- [x] 7.6 Quick actions: Create Policy, Create Ticket, Upload Doc, Edit, New Customer
- [x] 7.7 Quick actions navigate to correct pages with customer ID pre-filled

**Acceptance**: Client 360 loads within 3 seconds; all 12 tabs render correctly; quick actions navigate correctly.

---

## Task 8: Client 360 Tabs Implementation

**Requirements**: R8–R18
**Priority**: High

### Subtasks

- [x] 8.1 `ContactsTab` — family members (individual) or corporate contacts (corporate) with add dialog
- [x] 8.2 `PoliciesTab` — policy list with status/premium, link to policy detail, New Policy button
- [x] 8.3 `CasesTab` — business cases with status/priority badges, link to case detail
- [x] 8.4 `ClaimsTab` — claims with status/amount badges, link to claim detail
- [x] 8.5 `ServiceIssuesTab` — tickets with SLA overdue detection, open/overdue/total summary
- [x] 8.6 `DocumentsTab` — KYC documents with verify/reject/delete, upload button, pending count badge
- [x] 8.7 `CommunicationTab` — communication logs with channel icons, status badges, body preview
- [x] 8.8 `FinancialTab` — premium paid, outstanding, commission, active sum insured, annual premium cards + policy breakdown
- [x] 8.9 `RenewalRiskTab` — upcoming renewals with risk level (Critical/High/Medium/Low/Safe), days remaining, summary counts
- [x] 8.10 `ServiceIssuesTab` — open/overdue/total counts + full ticket list with priority/status badges
- [x] 8.11 `InsurerRelationsTab` — grouped by insurer with policy counts, active/expired breakdown, total premium
- [x] 8.12 `QuickActionsTab` — all quick actions grouped by category (Policy, Service, Document, Customer)

**Acceptance**: All tabs display correct data; quick actions navigate correctly.

---

## Task 9: Duplicate Detection

**Requirements**: R20
**Priority**: High

### Subtasks

- [x] 9.1 Server-side duplicate check in `POST /api/customers` — phone, email, PAN
- [x] 9.2 Returns 409 with `{ duplicate: true, matches: [...] }` when duplicates found
- [x] 9.3 `DuplicateWarningDialog` — shows all matching customers with field match labels and view links
- [x] 9.4 "Proceed Anyway" re-submits `createManualCustomer` directly (bypasses API check)
- [x] 9.5 "Cancel" closes dialog and returns to form
- [x] 9.6 Property-based test: duplicate check on 10,000 customers completes in < 500ms ✅

**Acceptance**: Duplicate detection triggers for phone/email/PAN matches; dialog shows existing customer details; user can proceed or cancel.

---

## Task 10: Soft Delete and Cascade

**Requirements**: R21
**Priority**: High

### Subtasks

- [x] 10.1 Soft delete in `customerService.deleteWithCascade` — sets status=inactive, deleted_at, deleted_by
- [x] 10.2 Cascade: cancel all active policies
- [x] 10.3 Cascade: cancel pending premiums
- [x] 10.4 Cascade: reject pending commissions
- [x] 10.5 Cascade: mark due/contacted renewals as lost
- [x] 10.6 "Show Inactive" toggle on All Entities Page
- [x] 10.7 Inactive customers hidden by default
- [x] 10.8 Property-based test: cascade idempotency verified ✅

**Acceptance**: Soft delete sets correct fields; all cascades execute atomically; inactive customers hidden by default.

---

## Task 11: Security and Access Control

**Requirements**: R23
**Priority**: High

### Subtasks

- [x] 11.1 RLS policies defined in `supabase/migrations/20240101_unified_crm_phase1.sql`
- [x] 11.2 `GET /api/customers` filters by `assigned_rm` or `created_by` for employee role
- [x] 11.3 Document access via KYC service signed URLs
- [ ] 11.4 Apply RLS migration in Supabase and verify employee access restriction
- [ ] 11.5 Verify manager sees all customers
- [ ] 11.6 Verify admin can perform all operations

**Acceptance**: RLS policies block unauthorized access; forbidden access attempts are logged.

> **Action Required**: Run migration SQL and test with different user roles.

---

## Task 12: Performance Validation

**Requirements**: R22
**Priority**: Medium

### Subtasks

- [ ] 12.1 Load test All Entities Page with 10,000 customers (target: < 2 seconds)
- [ ] 12.2 Load test Client 360 View (target: < 3 seconds)
- [ ] 12.3 Load test search with 10,000 customers (target: < 1 second)
- [ ] 12.4 Load test filter application (target: < 500ms)
- [ ] 12.5 Load test customer save operation (target: < 2 seconds)
- [ ] 12.6 Add database query explain plans for slow queries
- [ ] 12.7 Add missing indexes if performance targets not met

**Acceptance**: All performance targets met under load.

> **Note**: Run after applying database migration and seeding test data.

---

## Task 13: Property-Based Tests

**Requirements**: R20, R21, R24
**Priority**: Medium

### Subtasks

- [x] 13.1 UID uniqueness — 1000 UIDs generated, all unique ✅
- [x] 13.2 Temporal invariant — `deleted_at >= created_at` for 100 generated customers ✅
- [x] 13.3 Duplicate detection determinism — same input returns same result ✅
- [x] 13.4 Soft delete cascade idempotency — running twice produces same result ✅
- [x] 13.5 PAN validation — accepts valid, rejects invalid formats ✅
- [x] 13.6 GST validation — accepts valid, rejects invalid formats ✅

**Test file**: `tests/phase1/customer-properties.test.ts` — **25/25 tests passing** ✅

---

## Completion Checklist

- [ ] **Run migration**: `supabase/migrations/20240101_unified_crm_phase1.sql` in Supabase SQL editor
- [x] `GET /api/customers` — paginated list with search, filters, metrics
- [x] `POST /api/customers` — create with duplicate detection (409 on match)
- [x] `PUT /api/customers/[id]/update` — update with email sync
- [x] `POST /api/customers/[id]/deactivate` — soft delete with portal disable
- [x] `GET|POST /api/customers/[id]/family-members` — family member management
- [x] `GET|POST /api/customers/[id]/corporate-members` — corporate member management
- [x] All Entities Page — metrics bar, type filters, search, pagination, export
- [x] Manual Add Customer — Individual + Corporate with duplicate detection
- [x] `DuplicateWarningDialog` — shows matches, proceed/cancel actions
- [x] Client 360 View — 12-tab comprehensive customer dashboard
- [x] All 12 tabs implemented and rendering correctly
- [x] Soft delete cascade — policies, premiums, commissions, renewals
- [x] Role-based API filtering (employee sees only assigned customers)
- [x] **25/25 property-based tests passing** ✅
- [ ] RLS policies applied in Supabase (run migration SQL)
- [ ] Performance targets validated with real data
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] No ESLint errors (`npx eslint .`)
