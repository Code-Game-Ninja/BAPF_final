# Design Document: Unified CRM Phase 3 - GMC & Fleet Integration

## Overview

This design document specifies the technical architecture, database schema, UI component structure, API endpoints, and data flow for Phase 3 of the Unified CRM. The implementation uses Next.js 16 (App Router), React 19, TypeScript, Supabase (PostgreSQL + Storage + Auth), Tailwind CSS 4, Radix UI, and Framer Motion.

Phase 3 delivers:
- GMC corporate customer onboarding and policy management
- GMC bulk employee/dependent enrollment from policy schedules
- GMC member management with endorsement workflow
- GMC e-card template configuration and generation
- GMC TPA claims workflow
- Fleet corporate customer onboarding and policy management
- Fleet bulk vehicle enrollment from policy schedules
- Fleet vehicle and driver management
- Fleet validity tracking dashboard (Permit, Fitness, PUC, RC, Tax)
- Fleet surveyor-based claims workflow

---

## Architecture

### Component Hierarchy

```
app/dashboard/gmc/
├── page.tsx                          # GMC Dashboard
├── [customerId]/
│   ├── page.tsx                      # GMC Customer Detail
│   ├── members/
│   │   ├── page.tsx                  # Member List
│   │   └── [memberId]/page.tsx       # Member Detail
│   ├── ecard/
│   │   ├── template/page.tsx         # E-Card Template Config
│   │   └── generate/page.tsx         # E-Card Generation
│   ├── endorsements/page.tsx         # Endorsement History
│   └── claims/page.tsx               # GMC Claims

app/dashboard/fleet/
├── page.tsx                          # Fleet Dashboard
├── [customerId]/
│   ├── page.tsx                      # Fleet Customer Detail
│   ├── vehicles/
│   │   ├── page.tsx                  # Vehicle List
│   │   └── [vehicleId]/page.tsx      # Vehicle Detail
│   ├── drivers/page.tsx              # Driver Management
│   ├── validity/page.tsx             # Validity Dashboard
│   ├── endorsements/page.tsx         # Endorsement History
│   └── claims/page.tsx               # Fleet Claims

components/gmc/
├── GMCDashboard.tsx
├── MemberListTable.tsx
├── MemberForm.tsx
├── BulkUploadWizard.tsx
├── ECardTemplateForm.tsx
├── ECardPreview.tsx
├── ECardGenerateDialog.tsx
├── MemberEndorsementForm.tsx
├── GMCClaimForm.tsx
└── GMCClaimDetail.tsx

components/fleet/
├── FleetDashboard.tsx
├── VehicleListTable.tsx
├── VehicleForm.tsx
├── DriverForm.tsx
├── ValidityDashboard.tsx
├── ValidityUpdateDialog.tsx
├── VehicleEndorsementForm.tsx
├── FleetClaimForm.tsx
└── FleetClaimDetail.tsx
```

---

## Database Schema

### Table: gmc_members

```sql
CREATE TABLE IF NOT EXISTS gmc_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE RESTRICT,
  employee_id TEXT NOT NULL,
  name TEXT NOT NULL,
  member_type TEXT NOT NULL DEFAULT 'employee' CHECK (member_type IN ('employee','dependent')),
  parent_member_id UUID REFERENCES gmc_members(id), -- for dependents
  dob DATE,
  gender TEXT CHECK (gender IN ('Male','Female','Other')),
  mobile TEXT,
  email TEXT,
  department TEXT,
  designation TEXT,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Inactive','Deleted')),
  deactivated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, employee_id)
);

CREATE INDEX idx_gmc_members_customer ON gmc_members(customer_id);
CREATE INDEX idx_gmc_members_policy ON gmc_members(policy_id);
CREATE INDEX idx_gmc_members_status ON gmc_members(status);
CREATE INDEX idx_gmc_members_employee_id ON gmc_members(customer_id, employee_id);
```

### Table: gmc_ecard_templates

```sql
CREATE TABLE IF NOT EXISTS gmc_ecard_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  tpa_name TEXT,
  tpa_contact TEXT,
  tpa_email TEXT,
  emergency_contact TEXT,
  logo_url TEXT,
  logo_path TEXT,
  additional_fields JSONB DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id)
);
```

### Table: gmc_ecard_generations

```sql
CREATE TABLE IF NOT EXISTS gmc_ecard_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES gmc_members(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL REFERENCES policies(id),
  file_url TEXT NOT NULL,
  file_path TEXT NOT NULL,
  generated_by UUID NOT NULL REFERENCES users(id),
  generated_by_name TEXT,
  emailed_to TEXT,
  emailed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ecard_gen_member ON gmc_ecard_generations(member_id);
```

### Table: gmc_member_endorsements

```sql
CREATE TABLE IF NOT EXISTS gmc_member_endorsements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endorsement_number TEXT NOT NULL UNIQUE, -- END-GMC-XXXXX
  policy_id UUID NOT NULL REFERENCES policies(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  member_id UUID REFERENCES gmc_members(id),
  endorsement_type TEXT NOT NULL CHECK (endorsement_type IN ('Addition','Deletion')),
  endorsement_date DATE NOT NULL,
  member_details JSONB NOT NULL DEFAULT '{}',
  reason TEXT,
  pdf_url TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gmc_endorsements_policy ON gmc_member_endorsements(policy_id);
```

### Table: fleet_vehicles

```sql
CREATE TABLE IF NOT EXISTS fleet_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE RESTRICT,
  registration_number TEXT NOT NULL UNIQUE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  variant TEXT,
  fuel_type TEXT,
  chassis_number TEXT,
  engine_number TEXT,
  mfg_year INTEGER CHECK (mfg_year BETWEEN 1900 AND 2100),
  seating_capacity INTEGER,
  gvw NUMERIC,
  vehicle_category TEXT CHECK (vehicle_category IN ('Two-wheeler','Four-wheeler','Commercial')),
  idv NUMERIC,
  primary_driver_id UUID REFERENCES fleet_drivers(id),
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Inactive','Deleted')),
  deactivated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fleet_vehicles_customer ON fleet_vehicles(customer_id);
CREATE INDEX idx_fleet_vehicles_policy ON fleet_vehicles(policy_id);
CREATE INDEX idx_fleet_vehicles_status ON fleet_vehicles(status);
CREATE INDEX idx_fleet_vehicles_reg ON fleet_vehicles(registration_number);
```

### Table: fleet_drivers

```sql
CREATE TABLE IF NOT EXISTS fleet_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  name TEXT NOT NULL,
  license_number TEXT NOT NULL UNIQUE,
  license_expiry DATE NOT NULL,
  mobile TEXT,
  address TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fleet_drivers_customer ON fleet_drivers(customer_id);
CREATE INDEX idx_fleet_drivers_license ON fleet_drivers(license_number);
CREATE INDEX idx_fleet_drivers_expiry ON fleet_drivers(license_expiry);
```

### Table: fleet_validity_documents

```sql
CREATE TABLE IF NOT EXISTS fleet_validity_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES fleet_vehicles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'permit_state','permit_national','fitness','puc','rc','tax_state','tax_national'
  )),
  issue_date DATE,
  expiry_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid','expiring_soon','expired')),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vehicle_id, document_type)
);

CREATE INDEX idx_validity_vehicle ON fleet_validity_documents(vehicle_id);
CREATE INDEX idx_validity_expiry ON fleet_validity_documents(expiry_date);
CREATE INDEX idx_validity_status ON fleet_validity_documents(status);
```

### Table: fleet_vehicle_endorsements

```sql
CREATE TABLE IF NOT EXISTS fleet_vehicle_endorsements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endorsement_number TEXT NOT NULL UNIQUE, -- END-FLT-XXXXX
  policy_id UUID NOT NULL REFERENCES policies(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  vehicle_id UUID REFERENCES fleet_vehicles(id),
  endorsement_type TEXT NOT NULL CHECK (endorsement_type IN ('Addition','Deletion')),
  endorsement_date DATE NOT NULL,
  vehicle_details JSONB NOT NULL DEFAULT '{}',
  reason TEXT,
  pdf_url TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fleet_endorsements_policy ON fleet_vehicle_endorsements(policy_id);
```

### Table: bulk_upload_jobs

```sql
CREATE TABLE IF NOT EXISTS bulk_upload_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL CHECK (job_type IN ('gmc_members','fleet_vehicles')),
  customer_id UUID NOT NULL REFERENCES customers(id),
  policy_id UUID NOT NULL REFERENCES policies(id),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  total_rows INTEGER DEFAULT 0,
  successful_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  error_report_url TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## API Endpoints

### GMC Endpoints

```
GET    /api/gmc/[customerId]/members          # List members
POST   /api/gmc/[customerId]/members          # Add member manually
PUT    /api/gmc/[customerId]/members/[id]     # Update member
DELETE /api/gmc/[customerId]/members/[id]     # Delete member (creates endorsement)
POST   /api/gmc/[customerId]/members/bulk     # Bulk upload from file
GET    /api/gmc/[customerId]/ecard-template   # Get e-card template
PUT    /api/gmc/[customerId]/ecard-template   # Save e-card template
POST   /api/gmc/[customerId]/members/[id]/ecard  # Generate e-card for member
POST   /api/gmc/[customerId]/ecard/bulk       # Bulk generate e-cards
GET    /api/gmc/[customerId]/endorsements     # List endorsements
GET    /api/gmc/[customerId]/claims           # List GMC claims
POST   /api/gmc/[customerId]/claims           # Register GMC claim
PUT    /api/gmc/[customerId]/claims/[id]      # Update claim status
```

### Fleet Endpoints

```
GET    /api/fleet/[customerId]/vehicles          # List vehicles
POST   /api/fleet/[customerId]/vehicles          # Add vehicle manually
PUT    /api/fleet/[customerId]/vehicles/[id]     # Update vehicle
DELETE /api/fleet/[customerId]/vehicles/[id]     # Delete vehicle (creates endorsement)
POST   /api/fleet/[customerId]/vehicles/bulk     # Bulk upload from file
GET    /api/fleet/[customerId]/drivers           # List drivers
POST   /api/fleet/[customerId]/drivers           # Add driver
PUT    /api/fleet/[customerId]/drivers/[id]      # Update driver
GET    /api/fleet/[customerId]/validity          # Validity dashboard data
PUT    /api/fleet/[customerId]/vehicles/[id]/validity  # Update validity dates
GET    /api/fleet/[customerId]/endorsements      # List endorsements
GET    /api/fleet/[customerId]/claims            # List Fleet claims
POST   /api/fleet/[customerId]/claims            # Register Fleet claim
PUT    /api/fleet/[customerId]/claims/[id]       # Update claim status
```

---

## UI Component Design

### GMC Member List

**Toolbar**: Search (Name/Employee ID/Mobile) | Filter (Status/Dept/Designation) | + Add Member | Bulk Upload | Bulk E-Card

**Table Columns**:
| Column | Sortable |
|--------|----------|
| Employee ID | Yes |
| Name | Yes |
| Member Type | No |
| Department | No |
| Status | No |
| Mobile | No |
| E-Card | No |
| Actions | No |

### Bulk Upload Wizard (GMC & Fleet)

**Step 1**: Upload file (drag & drop or browse). Show template download link.
**Step 2**: Column mapping preview. Show first 5 rows.
**Step 3**: Validation results. Show error count. Allow download error report.
**Step 4**: Confirmation. Show success/fail summary.

### E-Card Template Configuration

**Form Fields**:
- Company Logo (image upload with preview)
- Company Name
- TPA Name, TPA Contact, TPA Email
- Emergency Contact
- Additional custom fields (key-value pairs)
- Preview button (renders sample e-card)

### Fleet Validity Dashboard

**Layout**: Summary cards (Expired / Expiring 7d / Expiring 15d / Expiring 30d) + Filterable table

**Table Columns**:
| Column | Sortable |
|--------|----------|
| Registration # | Yes |
| Make/Model | No |
| Document Type | No |
| Expiry Date | Yes |
| Days Remaining | Yes |
| Status | No |
| Actions | No |

**Color coding**:
- Expired: Red row
- ≤ 7 days: Orange row
- ≤ 15 days: Yellow row
- ≤ 30 days: Light yellow row

---

## Data Flow

### Bulk Upload Flow (GMC Members)

```
User uploads Excel/CSV file
  → POST /api/gmc/[customerId]/members/bulk (multipart)
    → Server: validate file format and size
    → Server: parse file rows
    → Server: create bulk_upload_job record (status=processing)
    → Server: for each row:
        → validate required fields
        → check Employee ID uniqueness
        → if valid: insert gmc_member record
        → if invalid: record error (row, field, message)
    → Server: update bulk_upload_job (status=completed, counts)
    → Server: generate error report CSV if errors exist
    → Server: send notification to uploader
    → Return job summary
  → Client: show summary dialog with download error report link
```

### E-Card Generation Flow

```
User clicks Generate E-Card for member
  → POST /api/gmc/[customerId]/members/[id]/ecard
    → Server: fetch member details
    → Server: fetch policy details
    → Server: fetch e-card template
    → Server: render PDF using template + data (using pdf-lib or puppeteer)
    → Server: upload PDF to Supabase Storage
    → Server: insert gmc_ecard_generations record
    → If email requested: send email with PDF attachment
    → Return PDF URL
  → Client: show download link and email confirmation
```

### Fleet Validity Alert Flow

```
pg_cron (every 24 hours)
  → Query fleet_validity_documents where expiry_date <= NOW() + 30 days
  → For each expiring document:
    → UPDATE status based on days remaining
    → If 30/15/7 days: INSERT notification for assigned RM
  → Query fleet_drivers where license_expiry <= NOW() + 30 days
  → For each expiring license:
    → INSERT notification for assigned RM
```

---

## TypeScript Types (New)

```typescript
export interface GMCMember {
  id: string;
  customer_id: string;
  policy_id: string;
  employee_id: string;
  name: string;
  member_type: 'employee' | 'dependent';
  parent_member_id?: string;
  dob?: string;
  gender?: 'Male' | 'Female' | 'Other';
  mobile?: string;
  email?: string;
  department?: string;
  designation?: string;
  address?: string;
  status: 'Active' | 'Inactive' | 'Deleted';
  created_at: string;
  updated_at: string;
}

export interface ECardTemplate {
  id: string;
  customer_id: string;
  company_name: string;
  tpa_name?: string;
  tpa_contact?: string;
  tpa_email?: string;
  emergency_contact?: string;
  logo_url?: string;
  additional_fields: Record<string, string>;
}

export interface FleetVehicle {
  id: string;
  customer_id: string;
  policy_id: string;
  registration_number: string;
  make: string;
  model: string;
  variant?: string;
  fuel_type?: string;
  chassis_number?: string;
  engine_number?: string;
  mfg_year?: number;
  seating_capacity?: number;
  gvw?: number;
  vehicle_category?: 'Two-wheeler' | 'Four-wheeler' | 'Commercial';
  idv?: number;
  primary_driver_id?: string;
  status: 'Active' | 'Inactive' | 'Deleted';
  validity_documents?: FleetValidityDocument[];
  created_at: string;
  updated_at: string;
}

export interface FleetDriver {
  id: string;
  customer_id: string;
  name: string;
  license_number: string;
  license_expiry: string;
  mobile?: string;
  address?: string;
  created_at: string;
}

export interface FleetValidityDocument {
  id: string;
  vehicle_id: string;
  document_type: 'permit_state' | 'permit_national' | 'fitness' | 'puc' | 'rc' | 'tax_state' | 'tax_national';
  issue_date?: string;
  expiry_date: string;
  status: 'valid' | 'expiring_soon' | 'expired';
  updated_at: string;
}

export interface BulkUploadJob {
  id: string;
  job_type: 'gmc_members' | 'fleet_vehicles';
  customer_id: string;
  policy_id: string;
  file_name: string;
  total_rows: number;
  successful_rows: number;
  failed_rows: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_report_url?: string;
  created_at: string;
  completed_at?: string;
}
```

---

## Performance Considerations

1. **Member List**: Server-side pagination (50 per page). Indexed queries on customer_id, status.
2. **Bulk Upload**: Process in batches of 100 rows. Use database transactions per batch for atomicity.
3. **E-Card Generation**: Generate PDF server-side using pdf-lib. Cache template config in memory.
4. **Bulk E-Card**: Queue generation jobs. Process 10 concurrently. Stream progress via SSE.
5. **Validity Dashboard**: Materialized view for expiry buckets, refreshed every hour.
6. **Validity Alerts**: pg_cron job runs at 6 AM daily. Deduplicates notifications within 24h window.

---

## Error Handling

- **Duplicate Employee ID**: Return 409 with existing member details.
- **Duplicate Registration Number**: Return 409 with existing vehicle details.
- **Bulk upload validation errors**: Continue processing, collect all errors, return summary.
- **E-card template not configured**: Return 422 with setup instructions.
- **Member linked to active policy**: Block deletion, return 409 with policy details.
- **Driver license expired**: Allow creation but show warning badge.
