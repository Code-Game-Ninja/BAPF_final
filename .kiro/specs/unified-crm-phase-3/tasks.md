# Tasks Document: Unified CRM Phase 3 - GMC & Fleet Integration

## Overview

**Status: CODE COMPLETE ✅**
All code implemented. Zero TypeScript errors. 38/38 property-based tests passing.
**Pending**: Run DB migration SQL in Supabase.

---

## Task 1: Database Schema Migration

- [x] 1.2–1.11 All tables, indexes, RLS policies defined in `supabase/migrations/20240102_unified_crm_phase3.sql`
- [ ] **1.1 Run migration in Supabase SQL editor** ← Only remaining action

> **Action Required**: Run `supabase/migrations/20240102_unified_crm_phase3.sql` in your Supabase SQL editor.

---

## Task 2: GMC Member API Layer ✅

- [x] 2.1 `GET /api/gmc/[customerId]/members` — search, filter, pagination
- [x] 2.2 `POST /api/gmc/[customerId]/members` — manual add with Employee ID uniqueness check
- [x] 2.3 `PUT /api/gmc/[customerId]/members/[id]` — update member details
- [x] 2.4 `DELETE /api/gmc/[customerId]/members/[id]` — soft delete, creates endorsement
- [x] 2.5 Employee ID uniqueness validation within Corporate_Customer
- [x] 2.6 Dependent linkage validation (parent must be active employee)
- [x] 2.7 Cascade: delete dependents when employee is deleted
- [x] 2.8 Audit log entries for all member operations
- [x] 2.9 Property-based tests ✅

---

## Task 3: GMC Bulk Upload ✅

- [x] 3.1 `POST /api/gmc/[customerId]/members/bulk` — multipart file upload
- [x] 3.2 Excel/CSV parser using `xlsx` library
- [x] 3.3 Row-by-row validation
- [x] 3.4 Employee ID uniqueness check during bulk processing
- [x] 3.5 Dependent row processing
- [x] 3.6 Error collection (row, field, message)
- [x] 3.7 `bulk_upload_jobs` record creation and status tracking
- [x] 3.8 Error report CSV generation
- [x] 3.9 Notification to uploader on completion
- [x] 3.10 `BulkUploadWizard` UI — 4-step wizard (Upload → Preview → Validate → Confirm)
- [x] 3.11 Template download link (sample Excel/CSV)

---

## Task 4: GMC E-Card Template Configuration ✅

- [x] 4.1 `GET /api/gmc/[customerId]/ecard-template` endpoint
- [x] 4.2 `PUT /api/gmc/[customerId]/ecard-template` endpoint (admin only)
- [x] 4.3 `ECardTemplateForm` UI — logo upload, company name, TPA details, emergency contact
- [x] 4.4 Logo image upload to Supabase Storage (PNG/JPG, max 2MB)
- [x] 4.5 `ECardPreview` component — inline preview of e-card design
- [x] 4.6 Required field validation before saving
- [x] 4.7 Template stored linked to Corporate_Customer (one per customer)

---

## Task 5: GMC E-Card Generation ✅

- [x] 5.1 `POST /api/gmc/[customerId]/members/[id]/ecard` endpoint
- [x] 5.2 PDF generation using `pdf-lib` (member + TPA + policy + logo)
- [x] 5.3 Upload generated PDF to Supabase Storage
- [x] 5.4 `gmc_ecard_generations` record inserted
- [x] 5.7 `ECardGenerateDialog` UI — generate, download, optional email

---

## Task 6: GMC Member Endorsement Workflow ✅

- [x] 6.1 Endorsement record created on member addition (type=Addition)
- [x] 6.2 Endorsement record created on member deletion (type=Deletion)
- [x] 6.3 Unique endorsement number in format END-GMC-XXXXX
- [x] 6.5 `GMCEndorsementHistory` component — table with endorsement number, type, date, member
- [x] 6.7 Audit log entries for endorsement creation

---

## Task 7: GMC Claims Workflow ✅

- [x] 7.1 `GET /api/gmc/[customerId]/claims` endpoint
- [x] 7.2 `POST /api/gmc/[customerId]/claims` endpoint (validates active policy)
- [x] 7.3 `PUT /api/gmc/[customerId]/claims/[id]` endpoint (status updates)
- [x] 7.4 Unique claim number in format CLM-GMC-XXXXX
- [x] 7.5 Claim document upload support
- [x] 7.6 Claim status tracking (Registered → Submitted to TPA → Under Review → Approved → Settled → Rejected)
- [x] 7.7 Settlement amount and date recorded on status=Settled
- [x] 7.8 `GMCClaimForm` + `app/dashboard/gmc/[customerId]/claims/page.tsx`
- [x] 7.10 Notification to assigned RM on claim registration

---

## Task 8: GMC Dashboard and Member List UI ✅

- [x] 8.1 `app/dashboard/gmc/page.tsx` — GMC Dashboard
- [x] 8.2 `app/dashboard/gmc/[customerId]/members/page.tsx` — Member List
- [x] 8.3 Member list table with search, filter, pagination
- [x] 8.4 Search by Name, Employee ID, Mobile
- [x] 8.5 Filter by Member_Status, Department

---

## Task 9: Fleet Vehicle API Layer ✅

- [x] 9.1 `GET /api/fleet/[customerId]/vehicles` — search, filter, pagination
- [x] 9.2 `POST /api/fleet/[customerId]/vehicles` — manual add with Registration Number uniqueness check
- [x] 9.3 `PUT /api/fleet/[customerId]/vehicles/[id]` — update vehicle details
- [x] 9.4 `DELETE /api/fleet/[customerId]/vehicles/[id]` — soft delete, creates endorsement
- [x] 9.5 Registration Number uniqueness validation (global)
- [x] 9.6 Primary driver uniqueness validation (at most one per vehicle)
- [x] 9.7 Audit log entries for all vehicle operations
- [x] 9.8 Property-based tests ✅

---

## Task 10: Fleet Bulk Upload ✅

- [x] 10.1 `POST /api/fleet/[customerId]/vehicles/bulk` — multipart file upload
- [x] 10.2 Excel/CSV parser using `xlsx` library
- [x] 10.3 Row-by-row validation
- [x] 10.4 Registration Number uniqueness check during bulk processing
- [x] 10.5 MFG Year validation (1900 to current year)
- [x] 10.6 Error collection and error report CSV generation
- [x] 10.7 `bulk_upload_jobs` record creation and status tracking
- [x] 10.8 Notification to uploader on completion
- [x] 10.9 `BulkUploadWizard` UI component (reused from GMC)

---

## Task 11: Fleet Driver Management ✅

- [x] 11.1 `GET /api/fleet/[customerId]/drivers` endpoint
- [x] 11.2 `POST /api/fleet/[customerId]/drivers` endpoint
- [x] 11.3 `PUT /api/fleet/[customerId]/drivers/[id]` endpoint
- [x] 11.4 License Number uniqueness validation
- [x] 11.5 License Expiry future date validation
- [x] 11.6 Driver-to-vehicle assignment (at most one primary driver per vehicle)
- [x] 11.7 `DriverForm` UI component — create/edit dialog
- [x] 11.8 `app/dashboard/fleet/[customerId]/drivers/page.tsx` — driver list with expiry badges
- [x] 11.9 License expiry alert (30 days before expiry via notification)

---

## Task 12: Fleet Validity Tracking ✅

- [x] 12.1 `GET /api/fleet/[customerId]/validity` endpoint
- [x] 12.2 `PUT /api/fleet/[customerId]/vehicles/[id]/validity` endpoint
- [x] 12.3 Validity status calculation (valid/expiring_soon/expired)
- [x] 12.4 `app/dashboard/fleet/[customerId]/validity/page.tsx` — Validity Dashboard
- [x] 12.5 Color coding (expired=red, ≤7d=orange, ≤15d=yellow, ≤30d=light yellow)
- [x] 12.6 Filter by document type and vehicle category
- [x] 12.7 Sort by expiry date
- [x] 12.8 `ValidityUpdateDialog` UI — all 7 document types, issue/expiry dates, save-all

---

## Task 13: Fleet Vehicle Endorsement Workflow ✅

- [x] 13.1 Endorsement record created on vehicle addition (type=Addition)
- [x] 13.2 Endorsement record created on vehicle deletion (type=Deletion)
- [x] 13.3 Unique endorsement number in format END-FLT-XXXXX
- [x] 13.5 `FleetEndorsementHistory` component — table with endorsement number, type, date, vehicle
- [x] 13.7 Audit log entries for endorsement creation

---

## Task 14: Fleet Claims Workflow ✅

- [x] 14.1 `GET /api/fleet/[customerId]/claims` endpoint
- [x] 14.2 `POST /api/fleet/[customerId]/claims` endpoint (validates active policy)
- [x] 14.3 `PUT /api/fleet/[customerId]/claims/[id]` endpoint (status updates)
- [x] 14.4 Unique claim number in format CLM-FLT-XXXXX
- [x] 14.5 Surveyor appointment (name, contact, appointment date)
- [x] 14.6 Claim document upload support
- [x] 14.7 Claim status tracking (Registered → Surveyor Appointed → Assessment Done → Approved → Settled → Rejected)
- [x] 14.8 Settlement amount and date recorded on status=Settled
- [x] 14.9 `FleetClaimForm` + `app/dashboard/fleet/[customerId]/claims/page.tsx`
- [x] 14.11 Notification to assigned RM on claim registration

---

## Task 15: Fleet Dashboard and Vehicle List UI ✅

- [x] 15.1 `app/dashboard/fleet/page.tsx` — Fleet Dashboard
- [x] 15.2 `app/dashboard/fleet/[customerId]/vehicles/page.tsx` — Vehicle List
- [x] 15.3 Vehicle list table with search, filter, pagination
- [x] 15.4 Search by Registration Number, Make, Model
- [x] 15.5 Filter by Vehicle_Status, Vehicle_Category, Fuel Type

---

## Task 16: Data Integrity and Cascade ✅

- [x] 16.1 Cascade: deactivate GMC members when Corporate_Customer is deactivated
- [x] 16.2 Cascade: deactivate Fleet vehicles when Corporate_Customer is deactivated
- [x] 16.3–16.6 Policy-level cascades defined in DB migration SQL (ON DELETE RESTRICT)

---

## Task 17: Property-Based Tests ✅

**File**: `tests/phase3/gmc-fleet-properties.test.ts` — **38/38 tests passing** ✅

- [x] 17.1 Employee ID uniqueness within Corporate_Customer (5 tests)
- [x] 17.2 Registration Number uniqueness globally (5 tests)
- [x] 17.3 Dependent always linked to active Employee (5 tests)
- [x] 17.4 Vehicle has at most one primary driver (5 tests)
- [x] 17.5 Validity expiry date > issue date (6 tests)
- [x] 17.6 Bulk upload conservation: error + success = total rows (6 tests)
- [x] 17.7 Endorsement number uniqueness (6 tests)

---

## Final Completion Checklist

### ✅ All Code Complete
- [x] All GMC API routes (members CRUD, bulk, ecard, claims, ecard-template, endorsements)
- [x] All Fleet API routes (vehicles CRUD, bulk, drivers CRUD, validity, claims, endorsements)
- [x] `BulkUploadWizard` — 4-step wizard (GMC + Fleet)
- [x] `ECardTemplateForm` + `ECardPreview`
- [x] `ECardGenerateDialog`
- [x] `DriverForm` + `app/dashboard/fleet/[customerId]/drivers/page.tsx`
- [x] `GMCClaimForm` + `app/dashboard/gmc/[customerId]/claims/page.tsx`
- [x] `FleetClaimForm` + `app/dashboard/fleet/[customerId]/claims/page.tsx`
- [x] `GMCEndorsementHistory` + `FleetEndorsementHistory`
- [x] `ValidityUpdateDialog`
- [x] Data integrity cascades (customer deactivation → GMC members + Fleet vehicles)
- [x] **38/38 property-based tests passing** ✅
- [x] **Zero TypeScript errors** (`tsc --noEmit` exits 0) ✅

### ⏳ One Remaining Action
- [ ] **Run DB migration**: `supabase/migrations/20240102_unified_crm_phase3.sql` in Supabase SQL editor
