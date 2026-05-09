# Design Document: Unified CRM Phase 1 - Customer Master + Client 360

## Overview

This design document specifies the technical architecture, database schema, UI component structure, API endpoints, and data flow for Phase 1 of the Unified CRM. The implementation uses Next.js 16 (App Router), React 19, TypeScript, Supabase (PostgreSQL + Storage + Auth), Tailwind CSS 4, Radix UI, and Framer Motion.

Phase 1 delivers:
- All Entities Page (unified customer registry)
- Manual Add Customer (Individual + Corporate with full depth)
- Client 360 View (12-tab comprehensive customer dashboard)
- Family/Corporate member management
- Duplicate detection
- Soft delete and cascade

---

## Architecture

### Component Hierarchy

```
app/dashboard/customers/
├── page.tsx                          # All Entities Page (server component)
├── loading.tsx                       # Skeleton loader
├── new/
│   └── page.tsx                      # Manual Add Customer (server component)
├── [id]/
│   ├── page.tsx                      # Client 360 View (server component)
│   └── edit/
│       └── page.tsx                  # Edit Customer
└── bulk/
    └── page.tsx                      # Bulk Import

components/customers/
├── AllEntitiesTable.tsx              # Main data table with filters/search
├── CustomerTypeFilter.tsx            # Type filter chips
├── CustomerMetricsBar.tsx            # Summary metrics row
├── AddCustomerForm.tsx               # Multi-step add form (Individual/Corporate)
├── IndividualFields.tsx              # Individual-specific fields
├── CorporateFields.tsx               # Corporate-specific fields
├── FamilyMembersSection.tsx          # Family member CRUD rows
├── CorporateMembersSection.tsx       # Corporate member CRUD rows
├── DuplicateWarningDialog.tsx        # Duplicate detection modal
├── Client360Layout.tsx               # 360 view shell with tab nav
├── Client360Header.tsx               # Profile summary header
└── tabs/
    ├── ContactsTab.tsx
    ├── PoliciesTab.tsx
    ├── CasesTab.tsx
    ├── ClaimsTab.tsx
    ├── ServiceTicketsTab.tsx
    ├── DocumentsTab.tsx
    ├── CommunicationTab.tsx
    ├── FinancialTab.tsx
    ├── RenewalRiskTab.tsx
    ├── ServiceIssuesTab.tsx
    ├── InsurerRelationsTab.tsx
    └── QuickActionsTab.tsx
```

---

## Database Schema

### Table: customers (extended)

```sql
-- Extends existing customers table
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'individual'
    CHECK (type IN ('individual','corporate','sme','government','contractor',
                    'manufacturer','transporter','trader','other')),
  ADD COLUMN IF NOT EXISTS entity_meta JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'pending'
    CHECK (kyc_status IN ('pending','verified','rejected','expired')),
  ADD COLUMN IF NOT EXISTS assigned_rm TEXT REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by TEXT REFERENCES users(id);

-- Indexes for search performance
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(type);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_assigned_rm ON customers(assigned_rm);
CREATE INDEX IF NOT EXISTS idx_customers_entity_meta ON customers USING GIN(entity_meta);
CREATE INDEX IF NOT EXISTS idx_customers_name_search ON customers USING GIN(to_tsvector('english', name));
```

### Table: customer_family_members

```sql
CREATE TABLE IF NOT EXISTS customer_family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  dob DATE,
  gender TEXT CHECK (gender IN ('male','female','other')),
  mobile TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_family_members_customer ON customer_family_members(customer_id);
```

### Table: customer_corporate_members

```sql
CREATE TABLE IF NOT EXISTS customer_corporate_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  designation TEXT,
  department TEXT,
  email TEXT,
  mobile TEXT,
  role TEXT,
  branch_location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_corporate_members_customer ON customer_corporate_members(customer_id);
```

### Row-Level Security Policies

```sql
-- Customers: employees see only their assigned customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY customers_admin_all ON customers
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY customers_manager_all ON customers
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'manager')
  );

CREATE POLICY customers_employee_own ON customers
  FOR SELECT TO authenticated
  USING (
    assigned_rm = auth.uid() OR created_by = auth.uid()
  );
```

---

## API Endpoints

### GET /api/customers
Query params: `type`, `status`, `assigned_rm`, `city`, `state`, `search`, `page`, `limit`, `sort`, `order`

Response:
```typescript
{
  data: Customer[];
  total: number;
  page: number;
  limit: number;
  metrics: {
    total: number;
    active: number;
    byType: Record<ClientType, number>;
  };
}
```

### POST /api/customers
Creates a new customer with duplicate detection.

Request body:
```typescript
{
  type: ClientType;
  name: string;
  phone: string;
  email?: string;
  assigned_rm?: string;
  entity_meta: IndividualEntityMetadata | CorporateEntityMetadata;
  family_members?: Omit<CustomerFamilyMember, 'id' | 'customer_id' | 'createdAt' | 'updatedAt'>[];
  corporate_members?: Omit<CorporateMember, never>[];
  documents?: { document_type: string; file: File }[];
  force_create?: boolean; // bypass duplicate warning
}
```

### GET /api/customers/[id]
Returns full customer record with all related data for Client 360.

Response:
```typescript
{
  customer: Customer;
  family_members: CustomerFamilyMember[];
  corporate_members: CorporateMember[];
  policies: Policy[];
  cases: BusinessCase[];
  claims: Claim[];
  service_tickets: ServiceTicket[];
  documents: Document[];
  communications: CommunicationLog[];
  financial_summary: {
    total_premium: number;
    outstanding_premium: number;
    total_commission: number;
  };
  renewal_risk: {
    upcoming_renewals: Renewal[];
    conversion_rate: number;
    lost_renewals: number;
  };
}
```

### PUT /api/customers/[id]
Updates customer record.

### DELETE /api/customers/[id]
Soft deletes customer (sets status=inactive, deleted_at, deleted_by).

### POST /api/customers/[id]/family-members
Adds a family member.

### PUT /api/customers/[id]/family-members/[memberId]
Updates a family member.

### DELETE /api/customers/[id]/family-members/[memberId]
Removes a family member (blocked if linked to policy).

### POST /api/customers/[id]/corporate-members
Adds a corporate member.

### PUT /api/customers/[id]/corporate-members/[memberId]
Updates a corporate member.

### DELETE /api/customers/[id]/corporate-members/[memberId]
Removes a corporate member (blocked if linked to policy).

---

## UI Component Design

### All Entities Page

**Layout**: Full-width data table with sticky header metrics bar.

**Metrics Bar** (top):
- Total Customers | Active | Individual | Corporate | SME | Other

**Toolbar**:
- Search input (debounced 300ms)
- Type filter chips (All / Individual / Corporate / SME / Government / Other)
- Status filter (Active / Inactive)
- RM filter (dropdown)
- City/State filter
- Column customizer
- Export button
- + Add Customer button

**Table Columns** (default):
| Column | Sortable | Width |
|--------|----------|-------|
| Customer UID | No | 80px |
| Name | Yes | 200px |
| Type | No | 100px |
| Phone | No | 120px |
| City | Yes | 100px |
| KYC Status | No | 100px |
| Assigned RM | No | 140px |
| Created | Yes | 120px |
| Actions | No | 120px |

**Row Actions**: View (→ Client 360) | Edit | Deactivate | Create Policy | Create Case

### Manual Add Customer Form

**Step 1 - Basic Info**:
- Customer Type selector (Individual / Corporate / SME / Government / Contractor / Other)
- Name*, Phone*, Email, Profile Image upload, Assigned RM

**Step 2 - Advanced Details** (Individual):
- State, City, Address, Birth Place, Birth Date (→ auto-calculates Age), Gender, Height, Weight
- Education, Marital Status, Business/Job type, Business Name, Occupation Nature
- Annual Income, PAN, GST, Aadhaar, Additional Notes

**Step 2 - Advanced Details** (Corporate):
- State, City, Address, Annual Turnover, PAN, GST
- Industry Type, Incorporation Date, Employee Count, POC Alt Phone, Additional Notes

**Step 3 - Members**:
- Individual: Family Members table (Name, Relationship, DOB, Gender, Mobile, Notes) + Add Row
- Corporate: Corporate Members table (Name, Designation, Dept, Email, Mobile, Role, Branch, Notes) + Add Row

**Step 4 - Documents**:
- Document upload rows (Document Type dropdown + File upload) + Add Row

**Step 5 - Review & Save**:
- Summary of all entered data
- Duplicate check runs on Save
- If duplicate found → DuplicateWarningDialog

### Client 360 View

**Header**: Avatar | Name | UID | Type badge | Status badge | KYC badge | Assigned RM | Quick Actions toolbar

**Tab Navigation** (12 tabs):
1. Contacts (Family/Corporate members)
2. Policies
3. Cases
4. Claims
5. Service Tickets
6. Documents
7. Communication History
8. Financial Summary
9. Renewal Risk
10. Service Issues
11. Insurer Relations
12. Quick Actions

---

## Data Flow

### Customer Creation Flow

```
User fills form
  → Client-side validation (zod schema)
  → POST /api/customers
    → Server: check duplicates (phone/email/PAN/GST)
    → If duplicate found: return 409 with existing customer data
    → Client: show DuplicateWarningDialog
    → User: proceed / merge / cancel
    → If proceed: POST with force_create=true
    → Server: insert customer record
    → Server: insert family/corporate members
    → Server: upload documents to Supabase Storage
    → Server: insert document records
    → Server: create audit log entry
    → Return created customer
  → Client: navigate to Client 360 view
```

### Client 360 Load Flow

```
Navigate to /dashboard/customers/[id]
  → Server component: parallel fetch
    → GET customer record
    → GET family/corporate members
    → GET policies (last 10)
    → GET cases (last 10)
    → GET claims (last 10)
    → GET service tickets (last 10)
    → GET documents
    → GET communication logs (last 20)
    → GET financial summary (aggregated)
    → GET renewal risk data
  → Render Client360Layout with all data
  → Each tab lazy-loads additional data on activation
```

### Soft Delete Cascade Flow

```
User clicks Deactivate
  → Confirmation dialog
  → DELETE /api/customers/[id]
    → Server: set customer status=inactive, deleted_at, deleted_by
    → Server: cancel all active policies (status=cancelled)
    → Server: cancel pending premiums (status=cancelled)
    → Server: reject pending commissions (status=rejected)
    → Server: mark due renewals as lost
    → Server: create audit log entry
  → Client: navigate to All Entities page
```

---

## TypeScript Types (New/Extended)

```typescript
// Extended Customer type
export interface CustomerExtended extends Customer {
  assigned_rm?: string;
  assigned_rm_name?: string;
  family_members?: CustomerFamilyMember[];
  corporate_members?: CorporateMember[];
}

// Client 360 aggregate response
export interface Client360Data {
  customer: CustomerExtended;
  family_members: CustomerFamilyMember[];
  corporate_members: CorporateMember[];
  policies: Policy[];
  cases: BusinessCase[];
  claims: Claim[];
  service_tickets: ServiceTicket[];
  documents: Document[];
  communications: CommunicationLog[];
  financial_summary: FinancialSummary;
  renewal_risk: RenewalRiskSummary;
  insurer_relations: InsurerRelation[];
}

export interface FinancialSummary {
  total_premium_paid: number;
  outstanding_premium: number;
  total_commission: number;
}

export interface RenewalRiskSummary {
  upcoming_renewals: Renewal[];
  conversion_rate: number;
  lost_renewals_count: number;
  high_risk_count: number;
}

export interface InsurerRelation {
  insurer_name: string;
  policy_count: number;
  claim_count: number;
  tpa_name?: string;
}

// Duplicate detection result
export interface DuplicateCheckResult {
  found: boolean;
  matches: {
    field: 'phone' | 'email' | 'pan' | 'gst';
    customer: Customer;
  }[];
}
```

---

## Performance Considerations

1. **All Entities Page**: Use server-side pagination (20 per page). Use Supabase full-text search index on `name`. Cache metrics bar with 60s revalidation.
2. **Client 360**: Parallel data fetching with `Promise.all`. Lazy-load tab content on first activation. Use React Suspense boundaries per tab.
3. **Duplicate Detection**: Debounce check to 500ms. Run on phone/email/PAN/GST fields independently.
4. **Family/Corporate Members**: Optimistic UI updates for add/edit/delete rows.
5. **Document Upload**: Chunked upload for files > 5MB. Show upload progress.

---

## Error Handling

- **Duplicate detected**: Show non-blocking warning dialog with existing customer preview. Allow proceed/merge/cancel.
- **Validation errors**: Inline field-level errors using react-hook-form + zod.
- **Network errors**: Toast notification with retry option.
- **Unauthorized access**: Redirect to login with return URL.
- **Member linked to policy**: Show blocking error dialog explaining the constraint.
